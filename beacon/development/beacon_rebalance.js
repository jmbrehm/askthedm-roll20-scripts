on('ready', function() {
	log('askthedm - beacon_rebalance.js - Loaded (version 3.0)');
});

// Beacon-ready monster rebalancing script based on legacy Rebalance.js
// Command: !rebalance --cr <value>
//
// Reads npc_challenge to identify NPC tokens, then sets npc_challenge and npc_ac
// to the values from CR_ATTRIBUTE_REFERENCE and rolls HP within the CR's expected range.
// Token bar1 (HP) is set directly as a token property.
// Only tokens linked to characters with a non-empty npc_challenge attribute are rebalanced.
//
// Dependencies: beacon/dependencies/askthedm_script_dependencies.js
//   Requires: askTheDMGetAttribute, askTheDMSetAttribute, CR_ATTRIBUTE_REFERENCE

on('chat:message', async function(msg) {
	if (msg.type !== 'api' || !msg.content.startsWith('!rebalance')) return;

	try {
		if (!msg.selected || msg.selected.length === 0) {
			sendChat('Rebalance', '/w gm Please select one or more monster tokens.');
			return;
		}

		if (!msg.content.includes('--cr')) {
			sendChat('Rebalance', '/w gm Missing --cr argument. Usage: !rebalance --cr <value>');
			return;
		}

		const args = {};
		msg.content.split('--').slice(1).forEach(arg => {
			const [key, ...rest] = arg.trim().split(' ');
			args[key] = rest.join(' ');
		});

		const newCR = args.cr ? args.cr.trim() : '';
		if (!newCR) {
			sendChat('Rebalance', '/w gm No CR value provided. Usage: !rebalance --cr <value>');
			return;
		}

		if (typeof globalThis.CR_ATTRIBUTE_REFERENCE === 'undefined' || !Object.prototype.hasOwnProperty.call(globalThis.CR_ATTRIBUTE_REFERENCE, newCR)) {
			sendChat('Rebalance', '/w gm Invalid CR: ' + newCR + '. Valid values: 0, 1/8, 1/4, 1/2, 1–30.');
			return;
		}

		const newStats = globalThis.CR_ATTRIBUTE_REFERENCE[newCR];
		const rebalanced = [];

		for (const sel of msg.selected) {
			const token = getObj('graphic', sel._id);
			if (!token) continue;
			const character = getObj('character', token.get('represents'));
			if (!character) continue;

			// Only process NPC tokens (must have a non-empty npc_challenge attribute)
			const existingCR = await getAttributeValue(character.id, 'npc_challenge');
			if (existingCR === null || existingCR === undefined || String(existingCR).trim() === '') continue;

			await setAttributeValue(character.id, 'npc_challenge', newCR);
			await setAttributeValue(character.id, 'npc_ac', newStats.ac);

			const minHP = newStats.hp[0];
			const maxHP = newStats.hp[1];
			const rolledHP = Math.floor(Math.random() * (maxHP - minHP + 1)) + minHP;
			token.set('bar1_value', rolledHP);
			token.set('bar1_max', rolledHP);

			const tokenName = token.get('name') || character.get('name') || 'Unknown';
			rebalanced.push(tokenName + ': CR ' + newCR + ', AC ' + newStats.ac + ', HP ' + rolledHP);
		}

		if (rebalanced.length === 0) {
			sendChat('Rebalance', '/w gm No NPC tokens found in selection. Only tokens linked to characters with npc_challenge set are rebalanced.');
			return;
		}

		const output =
			'**Rebalance Complete (Target CR: ' + newCR + ')**<br>' +
			rebalanced.join('<br>');
		sendChat('Rebalance', '/w gm ' + output);
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('Rebalance', '/w gm Beacon rebalance error: ' + errorText);
	}
});

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
