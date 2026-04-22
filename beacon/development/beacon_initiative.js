on('ready', function() {
	log('askthedm - beacon_initiative.js - Loaded (version 3.0)');
});

const READ_TIMEOUT_MS = 400;        // for fast custom attribute reads (user.askthedm_init_style)

// Beacon-ready initiative automation script based on legacy initiative.js
// Command: !combat
// Command: !initstyle [normal|advantage|disadvantage|toggle]
//
// Rolls initiative for all selected tokens and updates the turn tracker.
// Tokens already in the turn tracker have their pr (initiative value) updated.
// Tokens not yet in the turn tracker are not added — add them via ctrl+u first.
//
// Attribute notes:
//   user.askthedm_init_dex   — custom DEX score set via !initstats
//   user.askthedm_init_bonus — custom initiative bonus set via !initstats
//   user.askthedm_init_style — custom initiative mode set via !initstyle.
//                              Valid values: normal, advantage, disadvantage.
//                              If missing or invalid, !combat defaults to normal.

on('chat:message', async function(msg) {
	if (msg.type !== 'api' || !/^!initstats(\s|$)/i.test(msg.content)) return;

	try {
		const parts = msg.content.trim().split(/\s+/);
		const dexArg = parts[1];
		const bonusArg = parts[2];
		let targetSelections = (msg.selected && msg.selected.length > 0)
			? msg.selected.slice()
			: [];

		if (!dexArg) {
			sendChat('Initiative Script', '/w gm Use macro: !initstats ?{DEX Score|10} ?{Initiative Bonus|0}');
			return;
		}

		if (!targetSelections || targetSelections.length === 0) {
			sendChat('Initiative Script', '/w gm Select one or more tokens, then run !initstats <dex> [bonus].');
			return;
		}

		const dexVal = parseInt(dexArg, 10);
		if (isNaN(dexVal)) {
			sendChat('Initiative Script', '/w gm Usage: !initstats <dex> [bonus]. Example: !initstats 13 1');
			return;
		}

		const autoBonus = Math.floor((dexVal - 10) / 2);
		const bonusVal = (bonusArg !== undefined && bonusArg !== null && bonusArg !== '')
			? (parseInt(bonusArg, 10))
			: autoBonus;

		if (isNaN(bonusVal)) {
			sendChat('Initiative Script', '/w gm Bonus must be a number. Example: !initstats 13 1');
			return;
		}

		const processedCharacters = {};
		const updates = [];

		for (const sel of targetSelections) {
			const token = getObj('graphic', sel._id);
			if (!token) continue;

			const charId = token.get('represents');
			if (!charId || processedCharacters[charId]) continue;

			const character = getObj('character', charId);
			const name = (character && character.get('name')) || token.get('name') || 'Unknown';

			await setAttributeValue(charId, 'askthedm_init_dex', dexVal, { userDefined: true });
			await setAttributeValue(charId, 'askthedm_init_bonus', bonusVal, { userDefined: true });
			processedCharacters[charId] = true;
			updates.push(name + ': dex=' + dexVal + ', bonus=' + bonusVal);
		}

		if (updates.length === 0) {
			sendChat('Initiative Script', '/w gm No represented characters found on selected tokens.');
			return;
		}

		sendChat('Initiative Script', '/w gm Set custom initiative stats for ' + updates.length + ' character(s):\n' + updates.join('\n'));
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('Initiative Script', '/w gm Init stats update error: ' + errorText);
	}
});

on('chat:message', async function(msg) {
	if (msg.type !== 'api' || !/^!initstyle(\s|$)/i.test(msg.content)) return;

	try {
		const modeMatch = msg.content.match(/^!initstyle(?:\s+--mode\s+)?\s*([^\s]+)?/i);
		const requestedMode = (modeMatch && modeMatch[1] ? modeMatch[1] : '').trim().toLowerCase();
		const validModes = ['normal', 'advantage', 'disadvantage', 'toggle'];
		const idsMatch = msg.content.match(/--ids\s+([^\s]+)/i);
		const tokenIds = idsMatch && idsMatch[1]
			? idsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
			: [];

		let targetSelections = (msg.selected && msg.selected.length > 0)
			? msg.selected.slice()
			: tokenIds.map(id => ({ _id: id }));

		if (!requestedMode) {
			if (!targetSelections || targetSelections.length === 0) {
				sendChat('Initiative Script', '/w gm Select one or more tokens, then run !initstyle to choose a mode.');
				return;
			}
			const safeIds = targetSelections.map(s => s._id).filter(Boolean).join(',');
			const suffix = safeIds ? ' --ids ' + safeIds : '';
			sendChat(
				'Initiative Script',
				'/w gm Choose initiative mode for selected tokens: '
				+ '[Normal](!initstyle normal' + suffix + ') '
				+ '[Advantage](!initstyle advantage' + suffix + ') '
				+ '[Disadvantage](!initstyle disadvantage' + suffix + ') '
				+ '[Toggle](!initstyle toggle' + suffix + ')'
			);
			return;
		}

		if (validModes.indexOf(requestedMode) === -1) {
			sendChat('Initiative Script', '/w gm Usage: !initstyle <normal|advantage|disadvantage|toggle>');
			return;
		}

		if (!targetSelections || targetSelections.length === 0) {
			sendChat('Initiative Script', '/w gm No tokens selected. Select tokens, then run !initstyle.');
			return;
		}

		const processedCharacters = {};
		const updates = [];

		for (const sel of targetSelections) {
			const token = getObj('graphic', sel._id);
			if (!token) continue;

			const charId = token.get('represents');
			if (!charId || processedCharacters[charId]) continue;

			const character = getObj('character', charId);
			const name = (character && character.get('name')) || token.get('name') || 'Unknown';

			let targetMode = requestedMode;
			if (requestedMode === 'toggle') {
				let currentMode = 'normal';
				try {
					const timeoutMarker = '__ASKTHEDM_TIMEOUT__';
					const currentRaw = await withTimeout(
						getAttributeValue(charId, 'askthedm_init_style', { userDefined: true }),
						READ_TIMEOUT_MS,
						timeoutMarker
					);
					if (currentRaw !== timeoutMarker) {
						currentMode = parseInitiativeMode(currentRaw) || 'normal';
					}
				} catch (e) {
					currentMode = 'normal';
				}
				targetMode = currentMode === 'normal'
					? 'advantage'
					: (currentMode === 'advantage' ? 'disadvantage' : 'normal');
			}

			await setAttributeValue(charId, 'askthedm_init_style', targetMode, { userDefined: true });
			processedCharacters[charId] = true;
			updates.push(name + ': ' + targetMode);
		}

		if (updates.length === 0) {
			sendChat('Initiative Script', '/w gm No represented characters found on selected tokens.');
			return;
		}

		sendChat('Initiative Script', '/w gm Set user.askthedm_init_style for ' + updates.length + ' character(s):\n' + updates.join('\n'));
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('Initiative Script', '/w gm Initiative style update error: ' + errorText);
	}
});

on('chat:message', async function(msg) {
	if (msg.type !== 'api' || !/^!combat(\s|$)/i.test(msg.content)) return;

	try {
		if (!Campaign().get('initiativepage')) {
			sendChat('Initiative Script', '/w gm Open the Turn Tracker and add selected tokens first with ctrl+u');
			return;
		}

		if (!msg.selected || msg.selected.length === 0) {
			sendChat('Initiative Script', '/w gm No tokens selected. Please select all tokens to include in initiative before running !combat.');
			return;
		}

		let currentTurnorder = Campaign().get('turnorder');
		let turnorder = [];
		if (currentTurnorder && currentTurnorder !== '') {
			try {
				turnorder = JSON.parse(currentTurnorder);
			} catch (e) {
				turnorder = [];
			}
		}

		const tokenResults = [];
		for (const sel of msg.selected) {
			const token = getObj('graphic', sel._id);
			if (!token) continue;

			const charId = token.get('represents');
			const character = charId ? getObj('character', charId) : null;

			const displayName = token.get('name') || (character ? character.get('name') : 'Unknown');

			let mode = 'normal';
			let initBonus = 0;
			let tieBreaker = 0;
			if (character && charId) {
				// Use custom user.* attributes to avoid Beacon sheet integration failures.
				const dexRead = await safeGetNumericAttribute(charId, 'askthedm_init_dex', 10, READ_TIMEOUT_MS, { userDefined: true });
				const bonusRead = await safeGetNumericAttribute(charId, 'askthedm_init_bonus', null, READ_TIMEOUT_MS, { userDefined: true });
				const rollModeInfo = await getInitiativeRollModeInfo(charId);

				const dexScore = dexRead.value;
				const dexMod = Math.floor((dexScore - 10) / 2);
				initBonus = (bonusRead.value !== null) ? bonusRead.value : dexMod;
				tieBreaker = dexScore * 0.01;
				mode = rollModeInfo.mode;
				log('askthedm-initiative: dex=' + dexScore + ', customBonus=' + bonusRead.value + ', dexMod=' + dexMod + ', initBonus=' + initBonus + ', tie=' + tieBreaker.toFixed(2));
			}

			const roll1 = randomInteger(20);
			const isAdv = mode === 'advantage';
			const isDis = mode === 'disadvantage';
			const roll2 = (isAdv || isDis) ? randomInteger(20) : null;
			const d20 = isAdv ? Math.max(roll1, roll2) : (isDis ? Math.min(roll1, roll2) : roll1);
			const initiative = d20 + initBonus + tieBreaker;
			const calcDebug = ' [calc d20=' + d20 + ', init_bonus=' + initBonus + ', dex_tie=' + tieBreaker.toFixed(2) + ']';

			let rollDisplay = displayName + ': ' + initiative.toFixed(2) + ' (' + roll1 + ')' + calcDebug;
			if (isAdv) {
				rollDisplay = displayName + ': ' + initiative.toFixed(2) + ' (' + roll1 + ', ' + roll2 + ') advantage' + calcDebug;
			} else if (isDis) {
				rollDisplay = displayName + ': ' + initiative.toFixed(2) + ' (' + roll1 + ', ' + roll2 + ') disadvantage' + calcDebug;
			}
			tokenResults.push({
				tokenId: token.id,
				initiative: initiative,
				rollDisplay: rollDisplay
			});
		}

		const chatResults = tokenResults.filter(Boolean);
		for (const result of chatResults) {
			const entry = turnorder.find(e => e.id === result.tokenId);
			if (entry) {
				entry.pr = result.initiative;
			}
		}

		turnorder.sort((a, b) => (b.pr || 0) - (a.pr || 0));
		Campaign().set('turnorder', JSON.stringify(turnorder));

		if (chatResults.length > 0) {
			sendChat('COMBAT!', 'Initiative Results:');
			for (const result of chatResults) {
				sendChat('COMBAT!', result.rollDisplay);
			}
		}
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('Initiative Script', '/w gm Beacon initiative error: ' + errorText);
	}
});

async function getAttributeValue(characterId, attributeName, opts) {
	if (!characterId || !attributeName) return null;
	if (typeof getSheetItem !== 'function') {
		throw new Error('Beacon-only mode: getSheetItem is unavailable. Use the Experimental API server.');
	}
	const key = (opts && opts.userDefined === true && attributeName.indexOf('user.') !== 0)
		? 'user.' + attributeName
		: attributeName;
	const result = await getSheetItem(characterId, key);
	return result === undefined ? null : result;
}

function withTimeout(promise, ms, fallbackValue) {
	return Promise.race([
		promise,
		new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
	]);
}

async function setAttributeValue(characterId, attributeName, value, opts) {
	if (!characterId || !attributeName) return;
	if (typeof setSheetItem !== 'function') {
		throw new Error('Beacon-only mode: setSheetItem is unavailable. Use the Experimental API server.');
	}
	const key = (opts && opts.userDefined === true && attributeName.indexOf('user.') !== 0)
		? 'user.' + attributeName
		: attributeName;
	return setSheetItem(characterId, key, value);
}

async function safeGetNumericAttribute(characterId, attributeName, fallback, timeoutMs, opts) {
	const timeout = timeoutMs || READ_TIMEOUT_MS;
	try {
		const timeoutMarker = '__ASKTHEDM_TIMEOUT__';
		const raw = await withTimeout(getAttributeValue(characterId, attributeName, opts), timeout, timeoutMarker);
		if (raw === timeoutMarker) {
			return { value: fallback, error: 'timeout reading ' + attributeName };
		}
		const parsed = parseInt(raw, 10);
		if (isNaN(parsed)) return { value: fallback, error: null };
		return { value: parsed, error: null };
	} catch (e) {
		const errorText = (e && e.message) ? e.message : String(e);
		return { value: fallback, error: errorText };
	}
}

function parseInitiativeMode(rawValue) {
	if (rawValue === null || rawValue === undefined) return null;

	if (typeof rawValue === 'number') {
		if (rawValue === 1) return 'advantage';
		if (rawValue === -1) return 'disadvantage';
		if (rawValue === 0) return 'normal';
	}

	if (typeof rawValue === 'boolean') {
		return rawValue ? 'advantage' : null;
	}

	if (typeof rawValue === 'object') {
		if (rawValue.disadvantage === true) return 'disadvantage';
		if (rawValue.advantage === true) return 'advantage';
		if (rawValue.hasDisadvantage === true) return 'disadvantage';
		if (rawValue.hasAdvantage === true) return 'advantage';
		if (rawValue.value === 1) return 'advantage';
		if (rawValue.value === -1) return 'disadvantage';
		if (rawValue.value === 0) return 'normal';
		if (typeof rawValue.mode === 'string') return parseInitiativeMode(rawValue.mode);
		if (typeof rawValue.rollType === 'string') return parseInitiativeMode(rawValue.rollType);
		if (typeof rawValue.value === 'string') return parseInitiativeMode(rawValue.value);
		if (typeof rawValue.toggle === 'string') return parseInitiativeMode(rawValue.toggle);
		if (typeof rawValue.state === 'string') return parseInitiativeMode(rawValue.state);
	}

	const value = String(rawValue).trim().toLowerCase();
	if (!value) return null;
	if (value === '1' || value === 'true' || value === 'adv' || value === 'advantage') return 'advantage';
	if (value === '-1' || value === 'dis' || value === 'disadvantage') return 'disadvantage';
	if (value === '0' || value === 'false' || value === 'normal') return 'normal';

	if (value.indexOf('disadvantage') !== -1 || value.indexOf('kl1') !== -1 || /\{\{\s*disadvantage\s*=\s*1\s*\}\}/i.test(value)) {
		return 'disadvantage';
	}
	if (value.indexOf('advantage') !== -1 || value.indexOf('kh1') !== -1 || /\{\{\s*advantage\s*=\s*1\s*\}\}/i.test(value)) {
		return 'advantage';
	}
	if (value.indexOf('normal') !== -1 || /\{\{\s*normal\s*=\s*1\s*\}\}/i.test(value)) {
		return 'normal';
	}

	return null;
}

async function getInitiativeRollModeInfo(characterId) {
	if (!characterId) return { mode: 'normal', source: 'default' };

	try {
		const timeoutMarker = '__ASKTHEDM_TIMEOUT__';
		const customRaw = await withTimeout(
			getAttributeValue(characterId, 'askthedm_init_style', { userDefined: true }),
			READ_TIMEOUT_MS,
			timeoutMarker
		);
		if (customRaw === timeoutMarker) {
			return { mode: 'normal', source: 'default-timeout' };
		}
		const stored = parseInitiativeMode(customRaw);
		if (stored === 'advantage' || stored === 'disadvantage' || stored === 'normal') {
			return { mode: stored, source: 'custom-attribute' };
		}
	} catch (e) {
		// Missing attribute or sheet read failure both default to normal.
	}

	return { mode: 'normal', source: 'default' };
}
