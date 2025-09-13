// --- Treasure Hoard Generation ---
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!hoard')) return;

    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Loot Generator', `/w gm Please select one or more tokens to generate a treasure hoard.`);
        return;
    }

    // Find highest CR among selected tokens
    let highestCR = 0;
    let playerCount = 0;
    msg.selected.forEach(selected => {
        let token = getObj('graphic', selected._id);
        if (!token) return;
        let character = getObj('character', token.get('represents'));
        if (!character) return;
        let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
        if (!crAttr) {
            playerCount++;
            return;
        }
        let cr = parseFloat(crAttr.get('current'));
        if (!isNaN(cr) && cr > highestCR) highestCR = cr;
    });

    // Determine hoard table row
    let hoardRow = null;
    let hoardTable = [
        { crMin: 0, crMax: 4, gold: () => randomInt(1,4,2)*100, items: () => Math.max(0, randomInt(1,4,1)-1) },
        { crMin: 5, crMax: 10, gold: () => randomInt(1,10,8)*100, items: () => randomInt(1,3,1) },
        { crMin: 11, crMax: 16, gold: () => randomInt(1,8,8)*10000, items: () => randomInt(1,4,1) },
        { crMin: 17, crMax: 100, gold: () => randomInt(1,10,6)*10000, items: () => randomInt(1,6,1) }
    ];
    hoardRow = hoardTable.find(row => highestCR >= row.crMin && highestCR <= row.crMax);
    if (!hoardRow) hoardRow = hoardTable[0];

    // Generate gold and magic items
    let totalGold = hoardRow.gold();
    let numItems = hoardRow.items();
    let magicItems = [];
    for (let i = 0; i < numItems; i++) {
        // Determine rarity for each item
        let rarityRow = MAGIC_RARITY_TABLE.find(row => highestCR >= row.crMin && highestCR <= row.crMax);
        let rarityRoll = Math.random()*100;
        let rarityIdx = 0;
        let raritySum = 0;
        for (let j=0; j<MAGIC_RARITIES.length; j++) {
            raritySum += rarityRow.rarity[j];
            if (rarityRoll < raritySum) { rarityIdx = j; break; }
        }
        let rarity = MAGIC_RARITIES[rarityIdx];
        // Determine theme
        let themeIdx = Math.floor(Math.random()*MAGIC_THEMES.length);
        let theme = MAGIC_THEMES[themeIdx];
        // Use items.js reference to get actual item
        let itemName = null;
        if (typeof getRandomItem === 'function') {
            itemName = getRandomItem(theme, rarity);
        }
        if (!itemName) {
            itemName = `${rarity} ${theme} Item`;
        }
        magicItems.push(itemName);
    }

    // Calculate per-person split
    let partySize = playerCount;
    let goldSplit = partySize > 0 ? Math.ceil(totalGold/partySize) : 0;
    let goldSummary = `${totalGold.toLocaleString()} gp`;
    if (partySize > 0) {
        goldSummary += ` (${goldSplit.toLocaleString()} gp per person)`;
    }

    // Build magic item list
    let magicList = magicItems.length > 0 ? magicItems.map(item => `• ${item}`).join('<br>') : 'None';

    // Build chat output
    let output = `&{template:npcaction}{{rname=Treasure Hoard}}{{name=Hoard Summary}}` +
        `{{description=**Total Gold:** ${goldSummary}<br>` +
        `**Magic Items:**<br>${magicList}}}`;

    sendChat('Loot Generator', output);
});
// filename: loot_generator.js
// Roll20 API script for generating treasure from selected monsters
// requires items.js for magic item generation

const LOOT_TABLE = [
    { crMin: 0, crMax: 4, coins: () => randomInt(3,6,3) + ' gp', magicChance: 0.05 },
    { crMin: 5, crMax: 10, coins: () => (randomInt(2,8,2)*10) + ' gp', magicChance: 0.10 },
    { crMin: 11, crMax: 16, coins: () => (randomInt(2,10,2)*10) + ' pp', magicChance: 0.15 },
    { crMin: 17, crMax: 100, coins: () => (randomInt(2,8,2)*100) + ' pp', magicChance: 0.20 }
];

const MAGIC_RARITY_TABLE = [
    // [common, uncommon, rare, very rare, legendary]
    { crMin: 0, crMax: 4, rarity: [97, 3, 0, 0, 0] },
    { crMin: 5, crMax: 10, rarity: [87, 10, 3, 0, 0] },
    { crMin: 11, crMax: 16, rarity: [62, 25, 10, 3, 0] },
    { crMin: 17, crMax: 100, rarity: [0, 55, 25, 15, 5] }
];

const MAGIC_THEMES = ['Arcana', 'Armament', 'Implement', 'Relic'];
const MAGIC_RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'];

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!loot')) return;

    // Count player tokens (no CR attribute) and monster tokens (with CR)
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Loot Generator', `/w gm Please select one or more tokens to generate loot.`);
        return;
    }

    let totalCoins = 0;
    let coinType = '';
    let magicItems = [];
    let lootDetails = [];
    let playerCount = 0;

    // Track coin totals by type
    let coinTotals = { gp: 0, pp: 0 };

    msg.selected.forEach(selected => {
        let token = getObj('graphic', selected._id);
        if (!token) return;
        let character = getObj('character', token.get('represents'));
        if (!character) return;

        // Get CR
        let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
        if (!crAttr) {
            // No CR attribute, treat as player
            playerCount++;
            return;
        }
        let cr = parseFloat(crAttr.get('current'));
        if (isNaN(cr)) cr = 0;

        // Find loot table row
        let lootRow = LOOT_TABLE.find(row => cr >= row.crMin && cr <= row.crMax);
        if (!lootRow) lootRow = LOOT_TABLE[0];
        let coinsStr = lootRow.coins();
        let coinsVal = parseInt(coinsStr);
        coinType = coinsStr.replace(/[0-9 ]/g, '');
        if (coinType === 'gp') {
            coinTotals.gp += coinsVal;
        } else if (coinType === 'pp') {
            coinTotals.pp += coinsVal;
        }
        totalCoins += coinsVal;

        // Magic item roll
        if (Math.random() < lootRow.magicChance) {
            // Determine rarity
            let rarityRow = MAGIC_RARITY_TABLE.find(row => cr >= row.crMin && cr <= row.crMax);
            let rarityRoll = Math.random()*100;
            let rarityIdx = 0;
            let raritySum = 0;
            for (let i=0; i<MAGIC_RARITIES.length; i++) {
                raritySum += rarityRow.rarity[i];
                if (rarityRoll < raritySum) { rarityIdx = i; break; }
            }
            let rarity = MAGIC_RARITIES[rarityIdx];
            // Determine theme
            let themeIdx = Math.floor(Math.random()*MAGIC_THEMES.length);
            let theme = MAGIC_THEMES[themeIdx];
            // Use items.js reference to get actual item
            let itemName = null;
            if (typeof getRandomItem === 'function') {
                itemName = getRandomItem(theme, rarity);
            }
            // Fallback if no item found
            if (!itemName) {
                itemName = `${rarity} ${theme} Item`;
            }
            magicItems.push(itemName);
        }

        lootDetails.push(`• ${token.get('name') || character.get('name') || 'Monster'} (CR ${cr}): ${coinsStr}`);
    });

    // Calculate per-person split for each coin type
    let partySize = playerCount;
    let gpSplit = partySize > 0 ? Math.ceil(coinTotals.gp/partySize) : 0;
    let ppSplit = partySize > 0 ? Math.ceil(coinTotals.pp/partySize) : 0;
    let coinSummary = '';
    if (coinTotals.gp > 0) coinSummary += `${coinTotals.gp} gp`;
    if (coinTotals.pp > 0) coinSummary += (coinSummary ? ', ' : '') + `${coinTotals.pp} pp`;
    if (partySize > 0) {
        let splitSummary = [];
        if (coinTotals.gp > 0) splitSummary.push(`${gpSplit} gp per person`);
        if (coinTotals.pp > 0) splitSummary.push(`${ppSplit} pp per person`);
        coinSummary += ` (${splitSummary.join(', ')})`;
    }

    // Build magic item list
    let magicList = magicItems.length > 0 ? magicItems.map(item => `• ${item}`).join('<br>') : 'None';

    // Build chat output
    let output = `&{template:npcaction}{{rname=Treasure Generated}}{{name=Loot Summary}}` +
        `{{description=**Total Money:** ${coinSummary}<br>` +
        `**Magic Items:**<br>${magicList}<br>` +
        `**Loot Details:**<br>${lootDetails.join('<br>')}}}`;

    sendChat('Loot Generator', output);
});

function randomInt(min, max, count=1) {
    let total = 0;
    for (let i=0; i<count; i++) {
        total += Math.floor(Math.random()*(max-min+1))+min;
    }
    return total;
}
