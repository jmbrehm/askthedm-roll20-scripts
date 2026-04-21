// Utility: Parse and roll global damage modifiers
function rollGlobalDamageMods(charId, isCrit) {
    let modRollAttr = findObjs({type:'attribute', characterid:charId, name:'global_damage_mod_roll'})[0];
    let modCritAttr = findObjs({type:'attribute', characterid:charId, name:'global_damage_mod_crit'})[0];
    let modRollStr = modRollAttr ? modRollAttr.get('current') : '';
    let modCritStr = (isCrit && modCritAttr) ? modCritAttr.get('current') : '';
    let allMods = [];
    if (modRollStr) allMods.push(modRollStr);
    if (modCritStr) allMods.push(modCritStr);
    if (allMods.length === 0) return null;
    let modExpr = allMods.join('+');
    // Parse and roll the expression, and try to preserve labels in brackets
    let total = 0;
    let exprs = modExpr.split('+').map(s => s.trim()).filter(Boolean);
    let exprWithLabels = [];
    for (let expr of exprs) {
        // Try to preserve labels in brackets, e.g. 1d6[Hex]
        let diceMatch = expr.match(/(\d+d\d+(?:\[[^\]]+\])?)/);
        if (diceMatch) {
            let diceExpr = diceMatch[1];
            let diceParts = diceExpr.match(/(\d+)d(\d+)/);
            let num = parseInt(diceParts[1], 10);
            let sides = parseInt(diceParts[2], 10);
            for (let i = 0; i < num; i++) {
                total += randomInteger(sides);
            }
            exprWithLabels.push(diceExpr);
        } else {
            // Flat bonus, e.g. '3'
            let flat = parseInt(expr, 10);
            if (!isNaN(flat)) {
                total += flat;
                exprWithLabels.push(flat);
            }
        }
    }
    return {
        total,
        expr: exprWithLabels.join('+')
    };
}
// TotM.js - a Roll20 API Script for handling a unique magic item called "Tears of the Mountain"

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!totm-charges')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Please select your token to check charges.`);
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Invalid token selected.`);
        return;
    }
    let charId = token.get('represents');
    if (!charId) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Token does not represent a character.`);
        return;
    }
    // Get TotM attribute
    let totmAttr = findObjs({type:'attribute', characterid:charId, name:'TotM'})[0];
    if (!totmAttr) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" No TotM attribute found on your character.`);
        return;
    }
    let current = parseInt(totmAttr.get('current'), 10) || 0;
    let max = parseInt(totmAttr.get('max'), 10) || 0;
    // Get proficiency bonus
    let profAttr = findObjs({type:'attribute', characterid:charId, name:'pb'})[0];
    let proficiency = profAttr ? parseInt(profAttr.get('current'), 10) || 0 : 0;
    if (max !== proficiency) {
        totmAttr.set('max', proficiency);
        max = proficiency;
    }
    sendChat('Tears of the Mountain', `/w "${msg.who}" ${current} of ${max} charges remain.`);
});

// Utility: Fire Affinity - treat all 1s as 2s in a dice roll array
function applyFireAffinity(rolls) {
    return rolls.map(r => r === 1 ? 2 : r);
}

// Utility: Roll dice and apply Fire Affinity
function rollDice(num, sides) {
    let rolls = [];
    for (let i = 0; i < num; i++) {
        rolls.push(randomInteger(sides));
    }
    return applyFireAffinity(rolls);
}

// Utility: Format dice roll for chat (MonsterAttack style)
function formatAttackResult({name, attackRoll, attackType, hit, crit, ac, damageRoll, damageTotal, damageExpr, resistText, appliedText}) {
    let resultText = hit ? (crit ? '**CRITICAL HIT**' : '**HIT**') : '**MISS**';
    let diceLine = `**Dice:** ${damageExpr}${crit ? ' (critical)' : ''}`;
    let damageLine = hit ? `**Damage:** ${damageTotal} (fire)` : '';
    let appliedLine = hit ? `**Applied:** ${damageTotal} (fire)${resistText ? ' ' + resistText : ''}` : '';
    return `&{template:npcaction}{{rname=${name}}}{{name=${attackType}}}{{description=**Attack Roll:** ${attackRoll} vs. AC ${ac}<br>**Result:** ${resultText}<br>${diceLine}<br>${damageLine}<br>${appliedLine}}}`;
}

// Utility: Format save result for chat (MonsterAttack style)
function formatSaveResult({name, saveDC, stat, damageExpr, damageTotal, halfDamage, area, extra}) {
    let desc = `Enemies in a ${area} must make a ${stat} save (DC ${saveDC}).`;
    desc += `<br>**Dice:** ${damageExpr}`;
    desc += `<br>**Damage:** ${damageTotal} (fire)`;
    if (halfDamage) desc += `<br>On success, take half damage.`;
    if (extra) desc += `<br>${extra}`;
    return `&{template:npcaction}{{rname=${name}}}{{name=${stat} Save}}` + `{{description=${desc}}}`;
}

// Utility: Format dice roll for chat (TotM custom style)
function formatAttackResultTotM({name, attackType, tokenName, attackRoll, attackRollDetail, attackTypeLabel, damageExpr, damageTotal, damageDetail, costLine}) {
    return `&{template:npcaction}{{rname=${name}}}{{name=${attackType}}}{{description=Token: ${tokenName}<br>Attack Roll: ${attackRoll} (${attackRollDetail})[${attackTypeLabel}]<br>Dice: ${damageExpr}<br>Damage: ${damageTotal} (${damageDetail}) (fire)<br>${costLine}}}`;
}

// Utility: Format save result for chat (TotM custom style)
function formatSaveResultTotM({name, abilityName, saveDC, area, damageExpr, damageTotal, extra, costLine}) {
    let desc = `${area} must make a Dexterity save (DC ${saveDC})`;
    desc += `<br>Dice: ${damageExpr}`;
    desc += `<br>Damage: ${damageTotal} (fire)`;
    if (extra) desc += `<br>${extra}`;
    desc += `<br>${costLine}`;
    return `&{template:npcaction}{{rname=${name}}}{{name=${abilityName}}}{{description=${desc}}}`;
}

// --- Long Rest: Restore charges ---
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!totm-longrest')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Please select your token to long rest.`);
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Invalid token selected.`);
        return;
    }
    let charId = token.get('represents');
    if (!charId) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Token does not represent a character.`);
        return;
    }
    let totmAttr = findObjs({type:'attribute', characterid:charId, name:'TotM'})[0];
    let profAttr = findObjs({type:'attribute', characterid:charId, name:'pb'})[0];
    let proficiency = profAttr ? parseInt(profAttr.get('current'), 10) || 0 : 0;
    if (totmAttr) {
        totmAttr.set('current', proficiency);
        totmAttr.set('max', proficiency);
        sendChat('Tears of the Mountain', `/w "${msg.who}" TotM charges restored to ${proficiency}.`);
    } else {
        sendChat('Tears of the Mountain', `/w "${msg.who}" No TotM attribute found on your character.`);
    }
});


// --- Fire Bolt Attack Macro ---
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!totm-firebolt-attack')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Please select your token to cast Fire Bolt.`);
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Invalid token selected.`);
        return;
    }
    let tokenName = token.get('name') || 'Unknown';
    let charId = token.get('represents');
    if (!charId) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Token does not represent a character.`);
        return;
    }
    let totmAttr = findObjs({type:'attribute', characterid:charId, name:'TotM'})[0];
    let current = totmAttr ? parseInt(totmAttr.get('current'), 10) || 0 : 0;
    let max = totmAttr ? parseInt(totmAttr.get('max'), 10) || 0 : 0;
    let levelAttr = findObjs({type:'attribute', characterid:charId, name:'level'})[0];
    let level = levelAttr ? parseInt(levelAttr.get('current'), 10) || 1 : 1;
    let spellModAttr = findObjs({type:'attribute', characterid:charId, name:'spell_attack_bonus'})[0];
    let spellMod = spellModAttr ? parseInt(spellModAttr.get('current'), 10) || 0 : 0;
    // Determine dice for level
    let dice = 1;
    if (level >= 17) dice = 4;
    else if (level >= 11) dice = 3;
    else if (level >= 5) dice = 2;
    let attackType = (msg.content.match(/--(normal|advantage|disadvantage)/) || [])[1] || 'normal';
    let attackTypeLabel = attackType.charAt(0).toUpperCase() + attackType.slice(1);
    let rollExpr = '1d20';
    if (attackType === 'advantage') rollExpr = '2d20kh1';
    else if (attackType === 'disadvantage') rollExpr = '2d20kl1';
    rollExpr += `+${spellMod}`;
    sendChat('', `[[${rollExpr}]]`, function(ops) {
        let attackRoll = ops[0].inlinerolls[0].results.total;
        // Get the actual d20 roll and bonus for detail
        let rollDetail = '';
        let rollObj = ops[0].inlinerolls[0].results.rolls[0];
        if (rollObj.type === 'R') {
            let rolls = rollObj.results.map(r => r.v);
            let rollStr = rolls.join(rolls.length > 1 ? ' or ' : '');
            rollDetail = `${rollStr}+${spellMod}`;
        } else {
            rollDetail = `?+${spellMod}`;
        }
        let nat20 = (rollObj.results || []).some(r => r.v === 20);
        let crit = nat20;
        let damageDice = crit ? dice * 2 : dice;
        let rolls = rollDice(damageDice, 10);
        let damageTotal = rolls.reduce((a, b) => a + b, 0);
        let damageExpr = `${damageDice}d10`;
        let damageDetail = rolls.join('+');
        // Roll global damage mods
        let modResult = rollGlobalDamageMods(charId, crit);
        let modLine = '';
        let totalLine = '';
        let totalWithMods = damageTotal;
        if (modResult) {
            modLine = `<br>Damage Modifiers: +${modResult.total} (${modResult.expr})`;
            totalWithMods += modResult.total;
            totalLine = `<br><b>Total Damage: ${totalWithMods}</b>`;
        }
        let costLine = `Cost: 0 charges (${current} of ${max} charges remaining)`;
        let output = formatAttackResultTotM({
            name: 'Tears of the Mountain',
            attackType: 'Fire Bolt',
            tokenName,
            attackRoll,
            attackRollDetail: rollDetail,
            attackTypeLabel,
            damageExpr,
            damageTotal,
            damageDetail,
            costLine
        });
        // Insert modLine and totalLine after Damage line
        if (modLine) {
            output = output.replace('(fire)<br>', `(fire)<br>${modLine}${totalLine}<br>`);
        }
        sendChat('Tears of the Mountain', `${output}`);
    });
});

// --- Scorching Ray ---
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!totm-scorchingray')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Please select your token to cast Scorching Ray.`);
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Invalid token selected.`);
        return;
    }
    let tokenName = token.get('name') || 'Unknown';
    let charId = token.get('represents');
    if (!charId) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Token does not represent a character.`);
        return;
    }
    let totmAttr = findObjs({type:'attribute', characterid:charId, name:'TotM'})[0];
    let current = totmAttr ? parseInt(totmAttr.get('current'), 10) || 0 : 0;
    let max = totmAttr ? parseInt(totmAttr.get('max'), 10) || 0 : 0;
    let spellModAttr = findObjs({type:'attribute', characterid:charId, name:'spell_attack_bonus'})[0];
    let spellMod = spellModAttr ? parseInt(spellModAttr.get('current'), 10) || 0 : 0;
    let cost = 1;
    if (current < cost) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Not enough charges to cast Scorching Ray. (${current} of ${max} charges remaining)`);
        return;
    }
    let attackType = (msg.content.match(/--(normal|advantage|disadvantage)/) || [])[1] || 'normal';
    let attackTypeLabel = attackType.charAt(0).toUpperCase() + attackType.slice(1);
    let rollExpr = '1d20';
    if (attackType === 'advantage') rollExpr = '2d20kh1';
    else if (attackType === 'disadvantage') rollExpr = '2d20kl1';
    rollExpr += `+${spellMod}`;
    let rays = 3;
    let rayResults = [];
    let completed = 0;
    for (let i = 0; i < rays; i++) {
        sendChat('', `[[${rollExpr}]]`, function(ops) {
            let attackRoll = ops[0].inlinerolls[0].results.total;
            let rollObj = ops[0].inlinerolls[0].results.rolls[0];
            let rollDetail = '';
            if (rollObj.type === 'R') {
                let rolls = rollObj.results.map(r => r.v);
                let rollStr = rolls.join(rolls.length > 1 ? ' or ' : '');
                rollDetail = `${rollStr}+${spellMod}`;
            } else {
                rollDetail = `?+${spellMod}`;
            }
            let nat20 = (rollObj.results || []).some(r => r.v === 20);
            let crit = nat20;
            let damageDice = crit ? 4 : 2;
            let rolls = rollDice(damageDice, 6);
            let damageTotal = rolls.reduce((a, b) => a + b, 0);
            let damageExpr = `${damageDice}d6`;
            let damageDetail = rolls.join('+');
            // Roll global damage mods for this ray
            let modResult = rollGlobalDamageMods(charId, crit);
            let modLine = '';
            let totalLine = '';
            let totalWithMods = damageTotal;
            if (modResult) {
                modLine = `<br>Damage Modifiers: +${modResult.total} (${modResult.expr})`;
                totalWithMods += modResult.total;
                totalLine = `<br><b>Total Damage: ${totalWithMods}</b>`;
            }
            rayResults[i] = {
                attackRoll,
                rollDetail,
                crit,
                damageExpr,
                damageTotal,
                damageDetail,
                modLine,
                totalLine
            };
            completed++;
            if (completed === rays) {
                let costLine = `Cost: 1 charge (${current - cost} of ${max} charges remaining)`;
                let output = `&{template:npcaction}{{rname=Tears of the Mountain}}{{name=Scorching Ray}}`;
                output += `{{description=Token: ${tokenName}<br>`;
                for (let j = 0; j < rays; j++) {
                    let ray = rayResults[j];
                    output += `<b>${['First','Second','Third'][j]} Attack:</b> ${ray.attackRoll} (${ray.rollDetail})`;
                    if (ray.crit) output += ' <b>CRIT!</b>';
                    // Format: Damage: <b>8</b> (2d6 = 3+5)
                    output += `<br>Damage: <b>${ray.damageTotal}</b> (${ray.damageExpr} = ${ray.damageDetail})`;
                    if (ray.modLine) output += ray.modLine;
                    if (ray.totalLine) output += ray.totalLine;
                    output += `<br><br>`;
                }
                output += `${costLine}}}`;
                sendChat('Tears of the Mountain', output);
                totmAttr.set('current', current - cost);
            }
        });
    }
});

// --- Fire Cone ---
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!totm-firecone')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Please select your token to cast Fire Cone.`);
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Invalid token selected.`);
        return;
    }
    let tokenName = token.get('name') || 'Unknown';
    let charId = token.get('represents');
    if (!charId) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Token does not represent a character.`);
        return;
    }
    let totmAttr = findObjs({type:'attribute', characterid:charId, name:'TotM'})[0];
    let current = totmAttr ? parseInt(totmAttr.get('current'), 10) || 0 : 0;
    let max = totmAttr ? parseInt(totmAttr.get('max'), 10) || 0 : 0;
    let cost = 1;
    if (current < cost) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Not enough charges to use Fire Cone. (${current} of ${max} charges remaining)`);
        return;
    }
    let saveDCAttr = findObjs({type:'attribute', characterid:charId, name:'spell_save_dc'})[0];
    let saveDC = saveDCAttr ? parseInt(saveDCAttr.get('current'), 10) || 0 : 0;
    let damageDice = 5;
    let rolls = rollDice(damageDice, 8);
    let damageTotal = rolls.reduce((a, b) => a + b, 0);
    let damageExpr = `${damageDice}d8`;
    let damageDetail = rolls.join('+');
    // Roll global damage mods
    let modResult = rollGlobalDamageMods(charId, false);
    let modLine = '';
    let totalLine = '';
    let totalWithMods = damageTotal;
    if (modResult) {
        modLine = `<br>Damage Modifiers: +${modResult.total} (${modResult.expr})`;
        totalWithMods += modResult.total;
        totalLine = `<br><b>Total Damage: ${totalWithMods}</b>`;
    }
    let costLine = `Cost: 1 charge (${current - cost} of ${max} charges remaining)`;
    let output = `&{template:npcaction}{{rname=Tears of the Mountain}}{{name=Fire Cone}}`;
    output += `{{description=Token: ${tokenName}<br>Enemies in a 30ft. cone must make a Dexterity save (DC ${saveDC})<br>Damage (${damageExpr}): ${damageTotal} (${damageDetail}) Fire`;
    if (modLine) output += modLine;
    if (totalLine) output += totalLine;
    output += `<br>${costLine}}}`;
    sendChat('Tears of the Mountain', `${output}`);
    totmAttr.set('current', current - cost);
});

// --- Fire Ball ---
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!totm-fireball')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Please select your token to use Fireball.`);
        return;
    }
    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Invalid token selected.`);
        return;
    }
    let tokenName = token.get('name') || 'Unknown';
    let charId = token.get('represents');
    if (!charId) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Token does not represent a character.`);
        return;
    }
    let totmAttr = findObjs({type:'attribute', characterid:charId, name:'TotM'})[0];
    let current = totmAttr ? parseInt(totmAttr.get('current'), 10) || 0 : 0;
    let max = totmAttr ? parseInt(totmAttr.get('max'), 10) || 0 : 0;
    let cost = 2;
    if (current < cost) {
        sendChat('Tears of the Mountain', `/w "${msg.who}" Not enough charges to use Fireball. (${current} of ${max} charges remaining)`);
        return;
    }
    let saveDCAttr = findObjs({type:'attribute', characterid:charId, name:'spell_save_dc'})[0];
    let saveDC = saveDCAttr ? parseInt(saveDCAttr.get('current'), 10) || 0 : 0;
    let damageDice = 8;
    let rolls = rollDice(damageDice, 6);
    let damageTotal = rolls.reduce((a, b) => a + b, 0);
    let damageExpr = `${damageDice}d6`;
    let damageDetail = rolls.join('+');
    // Roll global damage mods
    let modResult = rollGlobalDamageMods(charId, false);
    let modLine = '';
    let totalLine = '';
    let totalWithMods = damageTotal;
    if (modResult) {
        modLine = `<br>Damage Modifiers: +${modResult.total} (${modResult.expr})`;
        totalWithMods += modResult.total;
        totalLine = `<br><b>Total Damage: ${totalWithMods}</b>`;
    }
    let costLine = `Cost: 2 charges (${current - cost} of ${max} charges remaining)`;
    let output = `&{template:npcaction}{{rname=Tears of the Mountain}}{{name=Fireball}}`;
    output += `{{description=Token: ${tokenName}<br>Enemies in a 20ft. radius sphere must make a Dexterity save (DC ${saveDC})<br>Damage (${damageExpr}): ${damageTotal} (fire)<br>Damage rolled: ${damageDetail}`;
    if (modLine) output += modLine;
    if (totalLine) output += totalLine;
    output += `<br>${costLine}}}`;
    sendChat('Tears of the Mountain', `${output}`);
    totmAttr.set('current', current - cost);
});
