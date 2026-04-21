on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!craft')) return;

    // Example usage:
    // !craft --item "Wand of Wonder" --rarity rare --qualities 45,55 --adv --bonus 2

    // Parse arguments
    let args = msg.content.split('--').slice(1).map(s => s.trim());
    let params = {};
    args.forEach(arg => {
        let [key, ...rest] = arg.split(' ');
        params[key] = rest.join(' ').replace(/^"|"$/g, ''); // Remove quotes
    });

    let item = params.item || "Unknown Item";
    let rarity = (params.rarity || "common").toLowerCase();
    let qualities = (params.qualities || "").split(',').map(q => parseInt(q, 10)).filter(q => !isNaN(q));
    let adv = 'adv' in params;
    let dis = 'dis' in params;
    let bonus = parseInt(params.bonus, 10) || 0;

    // Rarity requirements
    const rarityData = {
        "common":    { req: 1, range: [1, 20], dc: 10, lower: "none" },
        "uncommon":  { req: 2, range: [21, 40], dc: 15, lower: "common" },
        "rare":      { req: 2, range: [41, 60], dc: 20, lower: "uncommon" },
        "very rare": { req: 3, range: [61, 80], dc: 25, lower: "rare" },
        "legendary": { req: 3, range: [81, 100], dc: 30, lower: "very rare" }
    };

    if (!rarityData[rarity]) {
        sendChat('Crafting', `/w "${msg.who}" Invalid rarity specified.`);
        return;
    }

    // Check resource count
    if (qualities.length < rarityData[rarity].req) {
        sendChat('Crafting', `/w "${msg.who}" Not enough resources provided for ${rarity} item.`);
        return;
    }

    // Check average quality
    let avgQuality = Math.round(qualities.reduce((a, b) => a + b, 0) / qualities.length);
    let [minQ, maxQ] = rarityData[rarity].range;
    if (avgQuality < minQ) {
        sendChat('',
            `&{template:npcaction}{{rname=Crafting Attempt}}{{name=${msg.who}}}{{description=Check Results:
Unfortunately, your resources are not high enough quality to craft that item. (Average quality: ${avgQuality}, required: ${minQ}+ )}}`
        );
        return;
    }

    // Get highest attribute mod and proficiency bonus
    let token = msg.selected && msg.selected.length > 0 ? getObj('graphic', msg.selected[0]._id) : null;
    let character = token ? getObj('character', token.get('represents')) : null;
    let attrMods = ['strength_mod', 'dexterity_mod', 'constitution_mod', 'intelligence_mod', 'wisdom_mod', 'charisma_mod']
        .map(attr => {
            let obj = character ? findObjs({type:'attribute', characterid:character.id, name:attr})[0] : null;
            return obj ? parseInt(obj.get('current'), 10) : -99;
        });
    let highestMod = Math.max(...attrMods);
    let profObj = character ? findObjs({type:'attribute', characterid:character.id, name:'pb'})[0] : null;
    let prof = profObj ? parseInt(profObj.get('current'), 10) : 0;

    // Build roll expression
    let rollExpr = adv && dis ? '1d20' : adv ? '2d20kh1' : dis ? '2d20kl1' : '1d20';
    rollExpr += ` + ${highestMod} + ${prof}`;
    if (bonus) rollExpr += ` + ${bonus}`;

    sendChat('', `/w gm [[${rollExpr}]]`, function(ops) {
        let rollData = ops[0].inlinerolls[0];
        let total = rollData.results.total;
        let nat1 = rollData.results.rolls[0].results[0].v === 1;
        let dc = rarityData[rarity].dc;
        let lowerRarity = rarityData[rarity].lower;

        let resultMsg = `Check Results: **${total}**\n`;
        if (nat1) {
            resultMsg += "Unfortunately, this attempt has been an utter failure, and the resources used have been lost. Better luck next time.";
        } else if (total >= dc) {
            resultMsg += `Congratulations! You have successfully used your resources to craft **${item}** (${rarity}).`;
        } else if (total >= dc - 5) {
            resultMsg += `You have successfully crafted something, but not quite what you were going for (**${lowerRarity}**).`;
        } else if (total >= dc - 10) {
            let cursed = randomInteger(2) === 1 ? " ...you're unable to relinquish this item, seems like it may be cursed." : "";
            resultMsg += `You have successfully crafted something, but not quite what you were going for (**${lowerRarity}**).${cursed}`;
        } else {
            resultMsg += `You have successfully crafted something, but not quite what you were going for (**${lowerRarity}**). ...you're unable to relinquish this item, seems like it may be cursed.`;
        }

        sendChat('',
            `&{template:npcaction}{{rname=Crafting Attempt}}{{name=${msg.who}}}{{description=${resultMsg}}}`
        );
    });
});