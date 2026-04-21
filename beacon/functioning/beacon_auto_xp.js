on('ready', function() {
	log('askthedm - beacon_auto_xp.js - Loaded (version 3.0)');
});

// Beacon-ready XP automation script based on legacy experience_automation.js
// Command: !xp award
//
// PC vs Monster detection:
//   - Tokens with a non-empty npc_challenge attribute are treated as defeated enemies.
//   - Tokens without npc_challenge (or where it is null/empty) are treated as player characters.
//   No level attribute check is performed — npc_challenge is the sole discriminator.
//
// Dependencies: beacon/dependencies/askthedm_script_dependencies.js
//   Requires: askTheDMGetAttribute, askTheDMSetAttribute, CR_ATTRIBUTE_REFERENCE

on('chat:message', async function(msg) {
	if (msg.type !== 'api') return;
	if (!msg.content.startsWith('!xp')) return;

	try {
		const args = msg.content.split(' ').slice(1);
		const command = (args[0] || '').toLowerCase();

		if (command === 'award') {
			await handleXPAward(msg);
		}
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('XP System', '/w gm Beacon auto XP error: ' + errorText);
	}
});

async function handleXPAward(msg) {
	if (!msg.selected || msg.selected.length === 0) {
		sendChat('XP System', '/w gm Please select tokens (both PCs and defeated enemies) to award XP.');
		return;
	}

	const playerCharacters = [];
	const enemies = [];
	let totalXP = 0;

	for (const selected of msg.selected) {
		const token = getObj('graphic', selected._id);
		if (!token) continue;

		const character = getObj('character', token.get('represents'));
		if (!character) continue;

		const tokenName = token.get('name') || character.get('name') || 'Unknown';
		const crRaw = await getCharacterCRRaw(character.id);

		if (crRaw === null) {
			// No npc_challenge value — treat as player character
			playerCharacters.push({ character: character, name: tokenName });
		} else {
			const xpValue = getXPFromCRRaw(crRaw);
			enemies.push({ name: tokenName, cr: crRaw, xp: xpValue });
			totalXP += xpValue;
		}
	}

	if (playerCharacters.length === 0) {
		sendChat('XP System', '/w gm No player characters found in selection. Tokens without npc_challenge are treated as PCs.');
		return;
	}

	if (enemies.length === 0) {
		sendChat('XP System', '/w gm No enemies found in selection. Tokens with npc_challenge are treated as enemies. Check that enemy tokens are linked to NPC characters with npc_challenge set.');
		return;
	}

	const xpPerPlayer = Math.floor(totalXP / playerCharacters.length);
	const awardResults = [];

	for (const pc of playerCharacters) {
		const result = await awardXP(pc.character, pc.name, xpPerPlayer);
		awardResults.push(result);
	}

	const enemyLines = enemies.map(e => '• ' + e.name + ' (CR ' + e.cr + '): ' + e.xp + ' XP').join('<br>');
	const playerLines = awardResults.map(r => '• ' + r.name + ': ' + r.oldXP + ' → ' + r.newXP + ' (+' + r.awarded + ' XP)').join('<br>');

	const gmOutput =
		'**Experience Award Summary**<br>' +
		'**Defeated Enemies:**<br>' + enemyLines + '<br>' +
		'**Total XP Earned:** ' + totalXP + '<br>' +
		'**Players in Battle:** ' + playerCharacters.length + '<br>' +
		'**XP per Player:** ' + xpPerPlayer + '<br>' +
		'**Experience Awarded:**<br>' + playerLines;

	sendChat('XP System', '/w gm ' + gmOutput);
	sendChat('XP System', '**Battle Complete!** ' + totalXP + ' total XP divided among ' + playerCharacters.length + ' players. Each player gains ' + xpPerPlayer + ' XP!');
}

// Returns the raw npc_challenge string (e.g. '1/4', '5', '1/2') or null if not an NPC.
async function getCharacterCRRaw(characterId) {
	const raw = await getAttributeValue(characterId, 'npc_challenge');
	if (raw === null || raw === undefined) return null;
	const value = String(raw).trim();
	return value || null;
}

// Looks up XP using the raw CR string as the key in CR_ATTRIBUTE_REFERENCE.
// Preserves fractional CR keys ('1/8', '1/4', '1/2') so the lookup matches correctly.
function getXPFromCRRaw(crRaw) {
	if (typeof globalThis.CR_ATTRIBUTE_REFERENCE === 'undefined') return 0;
	const entry = globalThis.CR_ATTRIBUTE_REFERENCE[crRaw];
	return (entry && entry.xp) ? entry.xp : 0;
}

async function awardXP(character, characterName, xpAmount) {
	const oldXPRaw = await getAttributeValue(character.id, 'experience');
	const oldXP = parseInt(oldXPRaw, 10) || 0;
	const newXP = oldXP + xpAmount;

	await setAttributeValue(character.id, 'experience', newXP);

	return { name: characterName, oldXP: oldXP, newXP: newXP, awarded: xpAmount };
}

async function getAttributeValue(characterId, attributeName) {
	if (!characterId || !attributeName) return null;

	if (typeof askTheDMGetAttribute !== 'function') {
		throw new Error('askTheDMGetAttribute is unavailable. Load beacon/dependencies/askthedm_script_dependencies.js in the sandbox first.');
	}

	return askTheDMGetAttribute(characterId, attributeName);
}

async function setAttributeValue(characterId, attributeName, value) {
	if (!characterId || !attributeName) return;

	if (typeof askTheDMSetAttribute !== 'function') {
		throw new Error('askTheDMSetAttribute is unavailable. Load beacon/dependencies/askthedm_script_dependencies.js in the sandbox first.');
	}

	return askTheDMSetAttribute(characterId, attributeName, value);
}
