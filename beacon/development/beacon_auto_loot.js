on('ready', function() {
	log('askthedm - beacon_auto_loot.js - Loaded (version 3.0)');
});

// Beacon-ready loot generation script based on legacy loot_generator.js.
// Commands: !hoard and !loot

const LOOT_TABLE = [
	{ crMin: 0, crMax: 4, coins: () => randomInt(3, 6, 3) + ' gp', magicChance: 0.05 },
	{ crMin: 5, crMax: 10, coins: () => (randomInt(2, 8, 2) * 10) + ' gp', magicChance: 0.10 },
	{ crMin: 11, crMax: 16, coins: () => (randomInt(2, 10, 2) * 10) + ' pp', magicChance: 0.15 },
	{ crMin: 17, crMax: 100, coins: () => (randomInt(2, 8, 2) * 100) + ' pp', magicChance: 0.20 }
];

const MAGIC_RARITY_TABLE = [
	{ crMin: 0, crMax: 4, rarity: [97, 3, 0, 0, 0] },
	{ crMin: 5, crMax: 10, rarity: [87, 10, 3, 0, 0] },
	{ crMin: 11, crMax: 16, rarity: [62, 25, 10, 3, 0] },
	{ crMin: 17, crMax: 100, rarity: [0, 55, 25, 15, 5] }
];

const MAGIC_THEMES = ['Arcana', 'Armament', 'Implement', 'Relic'];
const MAGIC_RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];

const HOARD_TABLE = [
	{ crMin: 0, crMax: 4, gold: () => randomInt(1, 4, 2) * 100, items: () => Math.max(0, randomInt(1, 4, 1) - 1) },
	{ crMin: 5, crMax: 10, gold: () => randomInt(1, 10, 8) * 100, items: () => randomInt(1, 3, 1) },
	{ crMin: 11, crMax: 16, gold: () => randomInt(1, 8, 8) * 10000, items: () => randomInt(1, 4, 1) },
	{ crMin: 17, crMax: 100, gold: () => randomInt(1, 10, 6) * 10000, items: () => randomInt(1, 6, 1) }
];

on('chat:message', async function(msg) {
	if (msg.type !== 'api') return;

	try {
		if (msg.content.startsWith('!hoard')) {
			await handleHoard(msg);
			return;
		}

		if (msg.content.startsWith('!loot')) {
			await handleLoot(msg);
		}
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('Loot Generator', '/w gm Beacon auto loot error: ' + errorText);
	}
});

async function handleHoard(msg) {
	if (!msg.selected || msg.selected.length === 0) {
		sendChat('Loot Generator', '/w gm Please select one or more tokens to generate a treasure hoard.');
		return;
	}

	let highestCR = 0;
	let playerCount = 0;

	for (const selected of msg.selected) {
		const token = getObj('graphic', selected._id);
		if (!token) continue;

		const character = getObj('character', token.get('represents'));
		if (!character) continue;

		const cr = await getCharacterCR(character.id);
		if (cr === null) {
			playerCount++;
			continue;
		}

		if (cr > highestCR) highestCR = cr;
	}

	let hoardRow = HOARD_TABLE.find(row => highestCR >= row.crMin && highestCR <= row.crMax);
	if (!hoardRow) hoardRow = HOARD_TABLE[0];

	const totalGold = hoardRow.gold();
	const numItems = hoardRow.items();
	const magicItems = [];

	for (let i = 0; i < numItems; i++) {
		magicItems.push(generateMagicItem(highestCR));
	}

	const partySize = playerCount;
	const goldSplit = partySize > 0 ? Math.ceil(totalGold / partySize) : 0;
	let goldSummary = totalGold.toLocaleString() + ' gp';
	if (partySize > 0) {
		goldSummary += ' (' + goldSplit.toLocaleString() + ' gp per person)';
	}

	const magicList = magicItems.length > 0 ? magicItems.map(item => '• ' + item).join('<br>') : 'None';

	const output =
		'**Treasure Hoard**<br>' +
		'**Hoard Summary**<br>' +
		'**Total Gold:** ' + goldSummary + '<br>' +
		'**Magic Items:**<br>' + magicList;

	sendChat('Loot Generator', output);
}

async function handleLoot(msg) {
	if (!msg.selected || msg.selected.length === 0) {
		sendChat('Loot Generator', '/w gm Please select one or more tokens to generate loot.');
		return;
	}

	const coinTotals = { gp: 0, pp: 0 };
	const magicItems = [];
	const lootDetails = [];
	let playerCount = 0;
	let monsterCount = 0;

	for (const selected of msg.selected) {
		const token = getObj('graphic', selected._id);
		if (!token) continue;

		const character = getObj('character', token.get('represents'));
		if (!character) continue;

		const cr = await getCharacterCR(character.id);
		if (cr === null) {
			playerCount++;
			continue;
		}
		monsterCount++;

		let lootRow = LOOT_TABLE.find(row => cr >= row.crMin && cr <= row.crMax);
		if (!lootRow) lootRow = LOOT_TABLE[0];

		const coinsStr = lootRow.coins();
		const coinsVal = parseInt(coinsStr, 10) || 0;
		const coinType = coinsStr.replace(/[0-9 ]/g, '');

		if (coinType === 'gp') coinTotals.gp += coinsVal;
		if (coinType === 'pp') coinTotals.pp += coinsVal;

		if (Math.random() < lootRow.magicChance) {
			magicItems.push(generateMagicItem(cr));
		}

		const tokenName = token.get('name') || character.get('name') || 'Monster';
		lootDetails.push('• ' + tokenName + ' (CR ' + cr + '): ' + coinsStr);
	}

	if (monsterCount === 0) {
		sendChat('Loot Generator', '/w gm No monsters were detected from the selected tokens. This script expects the monster CR field to be npc_challenge.');
		return;
	}

	const partySize = playerCount;
	const gpSplit = partySize > 0 ? Math.ceil(coinTotals.gp / partySize) : 0;
	const ppSplit = partySize > 0 ? Math.ceil(coinTotals.pp / partySize) : 0;

	let coinSummary = '';
	if (coinTotals.gp > 0) coinSummary += coinTotals.gp + ' gp';
	if (coinTotals.pp > 0) coinSummary += (coinSummary ? ', ' : '') + coinTotals.pp + ' pp';

	if (partySize > 0) {
		const splitSummary = [];
		if (coinTotals.gp > 0) splitSummary.push(gpSplit + ' gp per person');
		if (coinTotals.pp > 0) splitSummary.push(ppSplit + ' pp per person');
		coinSummary += ' (' + splitSummary.join(', ') + ')';
	}

	if (!coinSummary) coinSummary = '0 gp';

	const magicList = magicItems.length > 0 ? magicItems.map(item => '• ' + item).join('<br>') : 'None';

	const output =
		'**Treasure Generated**<br>' +
		'**Loot Summary**<br>' +
		'**Total Money:** ' + coinSummary + '<br>' +
		'**Magic Items:**<br>' + magicList + '<br>' +
		'**Loot Details:**<br>' + lootDetails.join('<br>');

	sendChat('Loot Generator', output);
}

function generateMagicItem(cr) {
	let rarityRow = MAGIC_RARITY_TABLE.find(row => cr >= row.crMin && cr <= row.crMax);
	if (!rarityRow) rarityRow = MAGIC_RARITY_TABLE[0];

	const rarityRoll = Math.random() * 100;
	let rarityIdx = 0;
	let raritySum = 0;

	for (let i = 0; i < MAGIC_RARITIES.length; i++) {
		raritySum += rarityRow.rarity[i];
		if (rarityRoll < raritySum) {
			rarityIdx = i;
			break;
		}
	}

	const rarity = MAGIC_RARITIES[rarityIdx];
	const theme = MAGIC_THEMES[Math.floor(Math.random() * MAGIC_THEMES.length)];

	let itemName = null;
	if (typeof getRandomItem === 'function') {
		itemName = getRandomItem(theme, rarity);
	}

	return itemName || (rarity + ' ' + theme + ' Item');
}

async function getCharacterCR(characterId) {
	const raw = await getAttributeValue(characterId, 'npc_challenge');
	return parseCRValue(raw);
}

async function getAttributeValue(characterId, attributeName, property) {
	if (!characterId || !attributeName) return null;

	if (typeof askTheDMGetAttribute !== 'function') {
		throw new Error('askTheDMGetAttribute is unavailable. Load beacon/dependencies/askthedm_script_dependencies.js in the sandbox first.');
	}

	return askTheDMGetAttribute(characterId, attributeName, property);
}

function parseCRValue(raw) {
	if (raw === undefined || raw === null) return null;

	const value = String(raw).trim();
	if (!value) return null;

	if (value.indexOf('/') !== -1) {
		const parts = value.split('/');
		if (parts.length === 2) {
			const numerator = parseFloat(parts[0]);
			const denominator = parseFloat(parts[1]);
			if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
				return numerator / denominator;
			}
		}
	}

	const numeric = parseFloat(value);
	if (isNaN(numeric)) return 0;
	return numeric;
}

function randomInt(min, max, count) {
	let rolls = count || 1;
	let total = 0;
	for (let i = 0; i < rolls; i++) {
		total += Math.floor(Math.random() * (max - min + 1)) + min;
	}
	return total;
}
