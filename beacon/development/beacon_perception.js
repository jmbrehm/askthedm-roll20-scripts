on('ready', function() {
	log('askthedm - beacon_perception.js - Loaded (version 3.0)');
});

// Beacon-ready perception/detection script based on legacy detection_script.js
// Command: !detect "description" --difficulty easy|moderate|hard|deadly
//
// PC vs NPC handling: all selected tokens are treated as characters making perception checks.
// There is no monster/player distinction in this script.
//
// Attribute notes:
//   perception_bonus     — sheet passive/active perception modifier
//   advantagetoggle      — legacy 2014 sheet stores {{advantage=1}} / {{disadvantage=1}} template tokens.
//                          On the 2024 sheet this attribute may not exist or use a different format.
//                          If absent or unrecognized, defaults to 'normal'.
//   global_skill_mod     — optional global skill modifier string (e.g. '1d4[Bless]+2[Other]').
//                          On the 2024 sheet this attribute may not exist; defaults to 0 if missing.
//   inspiration          — 'on' or '1' means available. Not spent automatically by this script.
//
// Dependencies: beacon/dependencies/askthedm_script_dependencies.js
//   Requires: askTheDMGetAttribute

const DETECTION_DIFFICULTIES = {
	'easy':    { dc: 10 },
	'moderate':{ dc: 15 },
	'hard':    { dc: 20 },
	'deadly':  { dc: 25 }
};

function getPlayerForCharacter(charId) {
	const controllers = (getObj('character', charId).get('controlledby') || '').split(',');
	for (const c of controllers) {
		if (c && c !== 'all') {
			const player = getObj('player', c);
			if (player) return player.get('displayname');
		}
	}
	return null;
}

async function runDetection({ msg, description, difficulty, selected }) {
	if (!description) description = 'something';

	if (!DETECTION_DIFFICULTIES[difficulty]) {
		sendChat('Perception', '/w "' + msg.who + '" Invalid or missing difficulty. Use: easy, moderate, hard, or deadly');
		return;
	}
	if (!selected || selected.length === 0) {
		sendChat('Perception', '/w "' + msg.who + '" Please select one or more tokens to make the detection check.');
		return;
	}

	const dc = DETECTION_DIFFICULTIES[difficulty].dc;
	const dmSummary = [];

	for (const sel of selected) {
		const token = getObj('graphic', sel._id);
		if (!token) continue;
		const charId = token.get('represents');
		if (!charId) continue;
		const character = getObj('character', charId);
		if (!character) continue;
		const tokenName = token.get('name') || character.get('name') || 'Unknown';

		// Read perception modifier
		const perceptionRaw = await getAttributeValue(charId, 'perception_bonus');
		const perceptionBonus = parseInt(perceptionRaw, 10) || 0;

		// Read advantage state from advantagetoggle attribute
		// Legacy format stores template tokens like {{advantage=1}}; may not exist on 2024 sheets
		const advStateRaw = String((await getAttributeValue(charId, 'advantagetoggle')) || '');
		let rollType = 'normal';
		if (/\{\{\s*advantage\s*=\s*1\s*\}\}/i.test(advStateRaw)) rollType = 'advantage';
		else if (/\{\{\s*disadvantage\s*=\s*1\s*\}\}/i.test(advStateRaw)) rollType = 'disadvantage';

		// Parse global_skill_mod string for dice and flat bonuses (e.g. '1d4[Bless]+2[Label]')
		const globalSkillStr = String((await getAttributeValue(charId, 'global_skill_mod')) || '');
		let modTotal = 0;
		const modParts = [];
		if (globalSkillStr) {
			const gmodRegex = /([+-]?\d+d\d+|[+-]?\d+)(?=\[)/g;
			let match;
			while ((match = gmodRegex.exec(globalSkillStr)) !== null) {
				const expr = match[1];
				if (/d/.test(expr)) {
					const diceMatch = expr.match(/([+-]?)(\d+)d(\d+)/);
					const sign = diceMatch[1] === '-' ? -1 : 1;
					const num = parseInt(diceMatch[2], 10);
					const sides = parseInt(diceMatch[3], 10);
					const rolls = [];
					for (let i = 0; i < num; i++) {
						const val = randomInteger(sides) * sign;
						rolls.push(val);
						modTotal += val;
					}
					modParts.push(rolls.join('+'));
				} else {
					const flat = parseInt(expr, 10);
					if (!isNaN(flat)) {
						modTotal += flat;
						modParts.push(flat);
					}
				}
			}
		}

		// Roll d20(s)
		const d20a = randomInteger(20);
		const d20b = randomInteger(20);
		let d20Result, d20Detail;
		if (rollType === 'advantage') {
			d20Result = Math.max(d20a, d20b);
			d20Detail = d20a + '/' + d20b;
		} else if (rollType === 'disadvantage') {
			d20Result = Math.min(d20a, d20b);
			d20Detail = d20a + '/' + d20b;
		} else {
			d20Result = d20a;
			d20Detail = String(d20a);
		}

		const modString = '+' + perceptionBonus + (modParts.length > 0 ? '+' + modParts.join('+') : '');
		const total = d20Result + perceptionBonus + modTotal;
		const passive = 10 + perceptionBonus;
		const result = Math.max(passive, total);
		const passed = result >= dc;

		// Read inspiration state
		const inspRaw = await getAttributeValue(charId, 'inspiration');
		const hasInspiration = (inspRaw === 'on' || inspRaw === '1' || inspRaw === 1);

		// Build per-player whisper lines
		let perceptionLinePass, perceptionLineFailInspo;
		if (result === passive) {
			perceptionLinePass     = '(' + rollType + ' - perception: ' + result + ' (passive high))';
			perceptionLineFailInspo = '(' + rollType + ' - perception: ' + result + ' (passive high))';
		} else {
			perceptionLinePass     = '(' + rollType + ' - perception: ' + result + ' (' + d20Detail + ' ' + modString + '))';
			perceptionLineFailInspo = '(' + rollType + ' - perception: ' + result + ')';
		}

		const whisperTo = getPlayerForCharacter(charId);
		if (passed) {
			const message = perceptionLinePass + ' You\'ve noticed "' + description + '" and you\'re not certain whether the others have seen it.';
			if (whisperTo) sendChat('Perception', '/w "' + whisperTo + '" ' + message);
		} else {
			if (hasInspiration && whisperTo) {
				const message = perceptionLineFailInspo + ' You may have missed something; but could use inspiration to look again';
				sendChat('Perception', '/w "' + whisperTo + '" ' + message);
			}
		}

		const status = passed ? 'PASS' : 'FAIL';
		dmSummary.push(tokenName + ': ' + status + ' (' + result + ')');
	}

	// GM summary — plain text (no roll template)
	const gmOutput =
		'**Perception Check: ' + description + ' [DC: ' + dc + ' / ' + difficulty + ']**<br>' +
		dmSummary.join('<br>');
	sendChat('Perception', '/w gm ' + gmOutput);
}

on('chat:message', async function(msg) {
	if (msg.type !== 'api') return;
	if (!msg.content.startsWith('!detect')) return;

	try {
		const input = msg.content.replace('!detect', '').trim();
		const descMatch = input.match(/^"([^"]+)"/);
		const description = descMatch ? descMatch[1] : '';
		const diffMatch = input.match(/--difficulty\s+(easy|moderate|hard|deadly)/i);
		const difficulty = diffMatch ? diffMatch[1].toLowerCase() : '';
		await runDetection({ msg, description, difficulty, selected: msg.selected });
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('Perception', '/w gm Beacon perception error: ' + errorText);
	}
});

async function getAttributeValue(characterId, attributeName) {
	if (!characterId || !attributeName) return null;
	if (typeof askTheDMGetAttribute !== 'function') {
		throw new Error('askTheDMGetAttribute is unavailable. Load beacon/dependencies/askthedm_script_dependencies.js in the sandbox first.');
	}
	return askTheDMGetAttribute(characterId, attributeName);
}
