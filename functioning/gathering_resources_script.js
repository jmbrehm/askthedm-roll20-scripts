// filename: resourceGathering.js
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!gather')) return;

    if (!msg.selected || msg.selected.length === 0) {
        sendChat('System', '/w "'+msg.who+'" Please select a token.');
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    let character = getObj('character', token.get('represents'));
    let name = token.get('name') || character.get('name');

    // Get survival bonus
    let attr = findObjs({type:'attribute', characterid:character.id, name:'survival_bonus'})[0];
    let survivalBonus = attr ? parseInt(attr.get('current'),10) : 0;

    // Parse flags
    let adv = msg.content.includes('--adv');
    let dis = msg.content.includes('--dis');
    let guide = msg.content.includes('--guide');

    // Build roll expression
    let rollExpr = '1d20';
    let advText = 'Normal';
    if (adv && dis) {
        // Both present, cancel out
        advText = 'Normal';
    } else if (adv) {
        rollExpr = '2d20kh1';
        advText = 'Advantage';
    } else if (dis) {
        rollExpr = '2d20kl1';
        advText = 'Disadvantage';
    }
    rollExpr += ' + ' + survivalBonus;
    let guidanceText = '';
    if (guide) {
        rollExpr += ' + 1d4';
        guidanceText = 'Guidance';
    }
    let conditionText = [advText, guidanceText].filter(Boolean).join(' — ');

    sendChat('Gathering Check', `/w gm [[${rollExpr}]]`, function(ops) {
        let roll = ops[0].inlinerolls[0].results.total;
        let rarity, quality;
        if (roll >= 30) { rarity = 'Legendary'; quality = randomInteger(20)+80; }
        else if (roll >= 25) { rarity = 'Very Rare'; quality = randomInteger(20)+60; }
        else if (roll >= 20) { rarity = 'Rare'; quality = randomInteger(20)+40; }
        else if (roll >= 15) { rarity = 'Uncommon'; quality = randomInteger(20)+20; }
        else if (roll >= 10) { rarity = 'Common'; quality = randomInteger(20); }
        else { rarity = 'None'; quality = 0; }

        sendChat('Gathering Check',
            `&{template:npcaction}{{rname=Resource Gathering}}{{name=${name}}}{{description=Survival Check: **${roll}**<br>${conditionText}<br>Rarity: **${rarity}**<br>Quality: **${quality}**}}`
        );
    });
});
