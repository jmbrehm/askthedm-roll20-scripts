// filename: MonsterAttack.js
// Roll20 API script for automating monster attacks and spell effects (legacy sheets only)
// Usage: Select a monster token and one or more player tokens, then run !monsterattack

// Reference tables are now loaded from dependencies
// Use globalThis.DamageToSave and globalThis.CR_ATTRIBUTE_REFERENCE

function parseCR(crVal) {
    if (typeof crVal === 'number') return crVal;
    if (typeof crVal === 'string') {
        crVal = crVal.trim();
        if (crVal.includes('/')) {
            let parts = crVal.split('/');
            let num = parseFloat(parts[0]);
            let denom = parseFloat(parts[1]);
            if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
                return num / denom;
            }
        }
        let num = parseFloat(crVal);
        if (!isNaN(num)) return num;
    }
    return null;
}

function generateDiceExpression(targetDamage, isAttack = false) {
    if (targetDamage <= 1) return "1";
    if (!isAttack) {
        // New logic for spells: only dice, no modifiers, up to max dice for each type
        const spellDiceOptions = [
            { die: 10, max: 8, avg: 5.5 },
            { die: 8, max: 8, avg: 4.5 },
            { die: 6, max: 20, avg: 3.5 },
            { die: 4, max: 20, avg: 2.5 }
        ];
        let best = null;
        let minDiff = Number.POSITIVE_INFINITY;
        for (const option of spellDiceOptions) {
            for (let numDice = 1; numDice <= option.max; numDice++) {
                const diceTotal = numDice * option.avg;
                let diff = targetDamage - diceTotal;
                if (diff < 0) continue;
                if (best === null || diff < minDiff || (diff === minDiff && numDice > best.num)) {
                    best = { num: numDice, die: option.die, total: diceTotal };
                    minDiff = diff;
                }
            }
        }
        if (best) {
            return `${best.num}d${best.die}`;
        }
        // Fallback
        return "1d4";
    }
    // New logic for attacks: only allow specific dice formulas
    const allowedDice = [
        { num: 1, die: 12, avg: 6.5 },
        { num: 1, die: 10, avg: 5.5 },
        { num: 2, die: 8, avg: 9 },
        { num: 1, die: 8, avg: 4.5 },
        { num: 2, die: 6, avg: 7 },
        { num: 1, die: 6, avg: 3.5 },
        { num: 3, die: 4, avg: 7.5 },
        { num: 2, die: 4, avg: 5 },
        { num: 1, die: 4, avg: 2.5 }
    ];
    let best = null;
    let minDiff = Number.POSITIVE_INFINITY;
    const minMod = Math.ceil(targetDamage * 0.25);
    for (const dice of allowedDice) {
        let baseMod = minMod;
        let diceVal = dice.avg;
        let total = diceVal + baseMod;
        if (total > targetDamage) {
            // If even the minimum mod puts us over, skip
            continue;
        }
        // Increase modifier to get as close as possible without going over
        let neededMod = Math.floor(targetDamage - diceVal);
        if (neededMod < baseMod) neededMod = baseMod;
        let finalTotal = diceVal + neededMod;
        let diff = targetDamage - finalTotal;
        if (diff < 0) continue;
        if (best === null || diff < minDiff || (diff === minDiff && neededMod < best.mod)) {
            best = { num: dice.num, die: dice.die, mod: neededMod };
            minDiff = diff;
        }
    }
    // If nothing fit, pick the one with the highest total under target
    if (!best) {
        let maxTotal = -1;
        for (const dice of allowedDice) {
            let baseMod = minMod;
            let diceVal = dice.avg;
            let total = diceVal + baseMod;
            if (total > maxTotal && total < targetDamage) {
                best = { num: dice.num, die: dice.die, mod: baseMod };
                maxTotal = total;
            }
        }
    }
    if (best) {
        if (best.mod > 0) {
            return `${best.num}d${best.die}+${best.mod}`;
        } else {
            return `${best.num}d${best.die}`;
        }
    }
    // Fallback
    return "1d4";
}

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!monsterattack')) return;
    if (!msg.selected || msg.selected.length < 2) {
        sendChat('MonsterAttack', `/w gm Please select a monster token and one or more player tokens.`);
        return;
    }
    // Identify monster and player tokens by attributes
    let monsterToken = null;
    let monsterChar = null;
    let playerTokens = [];
    msg.selected.forEach(sel => {
        let token = getObj('graphic', sel._id);
        if (!token) return;
        let character = getObj('character', token.get('represents'));
        if (!character) return;
        // Monster detection: has npc_challenge attribute
        let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
        if (crAttr) {
            let challengeRating = crAttr.get('current');
            if (challengeRating && challengeRating !== '' && !isNaN(parseFloat(challengeRating))) {
                monsterToken = token;
                monsterChar = character;
                return;
            }
        }
        // Player detection: has any valid level attribute
        let levelAttrNames = ['level', 'character_level', 'total_level', 'base_level'];
        for (let attrName of levelAttrNames) {
            let levelAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
            if (levelAttr) {
                let level = parseInt(levelAttr.get('current'), 10);
                if (level && level > 0 && level <= 20) {
                    playerTokens.push({ token, character });
                    break;
                }
            }
        }
    });
    if (!monsterToken || !monsterChar || playerTokens.length === 0) {
        sendChat('MonsterAttack', `/w gm Please select one monster (with npc_challenge) and one or more players (with level).`);
        return;
    }
    if (msg.content.includes('--type')) {
        let args = {};
        msg.content.split('--').slice(1).forEach(arg => {
            let [key, ...rest] = arg.trim().split(' ');
            args[key] = rest.join(' ');
        });
        let crVal = getAttrByName(monsterChar.id, 'npc_challenge');
        let crKey = crVal && crVal.trim() ? crVal.trim() : '1';
        let stats = (globalThis.CR_ATTRIBUTE_REFERENCE && globalThis.CR_ATTRIBUTE_REFERENCE[crKey]) || globalThis.CR_ATTRIBUTE_REFERENCE['1'];
        let attackBonus = stats.attack;
        let saveDC = stats.save;
        let minDmg = stats.damage[0];
        let maxDmg = stats.damage[1];
        let totalTurnDamage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
        let crNum = parseCR(crKey);
        let totalActions = (crNum < 1) ? 1 : (2 + Math.floor(crNum / 5));
        let damagePerAction = Math.max(1, Math.floor(totalTurnDamage / totalActions));
        let actionsUsed = parseInt(args.attacks) || 1;
        let attackDamage = damagePerAction * actionsUsed;
        let damageExpr = generateDiceExpression(attackDamage, args.type === 'Attack');
        if (args.type === 'Attack') {
            playerTokens.forEach(({ token: playerToken, character: playerChar }) => {
                let ac = parseInt(getAttrByName(playerChar.id, 'ac'));
                let rollType = (args.rolltype || 'Normal').toLowerCase();
                let attackRollExpr;
                if (rollType === 'advantage') {
                    attackRollExpr = `2d20kh1+${attackBonus}`;
                } else if (rollType === 'disadvantage') {
                    attackRollExpr = `2d20kl1+${attackBonus}`;
                } else {
                    attackRollExpr = `1d20+${attackBonus}`;
                }
                let damageType = (args.primary || '').toLowerCase();
                let applyResistImmunity = function(damageAmount) {
                    let resistAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0];
                    let immuneAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0];
                    let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                    let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                    if (immunities.includes(damageType)) {
                        return 0;
                    } else if (resistances.includes(damageType)) {
                        return Math.max(1, Math.floor(damageAmount / 2));
                    }
                    return damageAmount;
                };
                sendChat('', `/w gm [[${attackRollExpr}]]`, function(ops) {
                    let attackRoll = ops[0].inlinerolls[0].results.total;
                    let nat20 = ops[0].inlinerolls[0].results.rolls[0].results[0].v === 20;
                    let hit = attackRoll >= ac;
                    let immuneAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0];
                    let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                    let isCritImmune = immunities.includes('criticals');
                    let isCritical = nat20 && !isCritImmune;
                    let resultText = hit ? (nat20 ? (isCritImmune ? '**HIT**' : '**CRITICAL HIT**') : '**HIT**') : '**MISS**';
                    let critDamageExpr = damageExpr;
                    let critFormula = damageExpr;
                    let diceLine = `**Dice:** ${critFormula}`;
                    if (hit) {
                        if (isCritical) {
                            critDamageExpr = doubleDiceExpression(damageExpr);
                            critFormula = critDamageExpr;
                            diceLine = `**Dice:** ${critFormula} (critical)`;
                        }
                        sendChat('', `/w gm [[${critDamageExpr}]]`, function(dmgOps) {
                            let rolledDamage = dmgOps[0].inlinerolls[0].results.total;
                            let appliedDamage = applyResistImmunity(rolledDamage);
                            let tempHpAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'hp_temp'})[0];
                            let tempHP = tempHpAttr ? parseInt(tempHpAttr.get('current'), 10) || 0 : 0;
                            let remainingDamage = appliedDamage;
                            if (tempHP > 0) {
                                let tempDamage = Math.min(tempHP, remainingDamage);
                                let newTempHP = tempHP - tempDamage;
                                tempHpAttr.set('current', newTempHP);
                                remainingDamage -= tempDamage;
                            }
                            if (remainingDamage > 0) {
                                let hpAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'hp'})[0];
                                if (hpAttr) {
                                    let currentHP = parseInt(hpAttr.get('current'));
                                    hpAttr.set('current', Math.max(0, currentHP - remainingDamage));
                                }
                            }
                            let resistAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0];
                            let immuneAttr2 = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0];
                            let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                            let immunities2 = immuneAttr2 ? (immuneAttr2.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                            let resistText = '';
                            if (immunities2.includes(damageType)) {
                                resistText = '[immunity]';
                            } else if (resistances.includes(damageType)) {
                                resistText = '[resistance]';
                            }
                            let damageText = `**Damage:** ${rolledDamage} (${args.primary || 'unknown'})`;
                            let appliedText = `**Applied:** ${appliedDamage} (${args.primary || 'unknown'}) ${resistText}`;
                            let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**Attack Roll:** ${attackRoll} vs. AC ${ac}<br>**Result:** ${resultText}<br>${diceLine}<br>${damageText}<br>${appliedText}}}`;
                            sendChat('MonsterAttack', output);
                        });
                    } else {
                        let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**Attack Roll:** ${attackRoll} vs. AC ${ac}<br>**Result:** ${resultText}}}`;
                        sendChat('MonsterAttack', output);
                    }
                });
            });
        } else if (args.type === 'Spell') {
            // Roll spell damage ONCE for all players
            let damageType = (args.primary || '').toLowerCase();
            let stat = typeof globalThis.DamageToSave !== 'undefined' && globalThis.DamageToSave[damageType] ? globalThis.DamageToSave[damageType].toLowerCase() : 'constitution';
            let diceLine = `**Dice:** ${damageExpr}`;
            sendChat('', `/w gm [[${damageExpr}]]`, function(dmgOps) {
                let baseDamage = dmgOps[0].inlinerolls[0].results.total;
                if (baseDamage < 1) baseDamage = 1;
                playerTokens.forEach(({ token: playerToken, character: playerChar }) => {
                    let saveAttrName = `${stat}_save_bonus`;
                    let saveAttr = findObjs({type:'attribute', characterid:playerChar.id, name: saveAttrName})[0];
                    let saveMod = saveAttr ? parseInt(saveAttr.get('current')) : 0;
                    let saveRollExpr = `1d20+${saveMod}`;
                    sendChat('', `/w gm [[${saveRollExpr}]]`, function(ops) {
                        let saveRoll = ops[0].inlinerolls[0].results.total;
                        let success = saveRoll >= saveDC;
                        let resultText = success ? '**SUCCESS**' : '**FAILURE**';
                        let applyResistImmunity = function(damageAmount) {
                            let resistAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0];
                            let immuneAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0];
                            let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                            let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                            if (immunities.includes(damageType)) {
                                return 0;
                            } else if (resistances.includes(damageType)) {
                                return Math.max(1, Math.floor(damageAmount / 2));
                            }
                            return damageAmount;
                        };
                        let rolledDamage = baseDamage;
                        let damageText = '';
                        let appliedDamage = 0;
                        let resistText = '';
                        if (success) {
                            if (args.resist === 'Half') {
                                rolledDamage = Math.floor(baseDamage / 2);
                                if (rolledDamage < 1) rolledDamage = 1;
                                damageText = `**Damage:** ${rolledDamage} (${args.primary || 'unknown'}) (half damage)`;
                            } else {
                                damageText = `**Damage:** 0 (${args.primary || 'unknown'}) (no damage)`;
                                rolledDamage = 0;
                            }
                        } else {
                            damageText = `**Damage:** ${rolledDamage} (${args.primary || 'unknown'})`;
                        }
                        appliedDamage = applyResistImmunity(rolledDamage);
                        let tempHpAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'hp_temp'})[0];
                        let tempHP = tempHpAttr ? parseInt(tempHpAttr.get('current'), 10) || 0 : 0;
                        let remainingDamage = appliedDamage;
                        if (tempHP > 0) {
                            let tempDamage = Math.min(tempHP, remainingDamage);
                            let newTempHP = tempHP - tempDamage;
                            tempHpAttr.set('current', newTempHP);
                            remainingDamage -= tempDamage;
                        }
                        if (remainingDamage > 0) {
                            let hpAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'hp'})[0];
                            if (hpAttr) {
                                let currentHP = parseInt(hpAttr.get('current'));
                                hpAttr.set('current', Math.max(0, currentHP - remainingDamage));
                            }
                        }
                        let resistAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0];
                        let immuneAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0];
                        let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                        let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (immunities.includes(damageType)) {
                            resistText = '[immunity]';
                        } else if (resistances.includes(damageType)) {
                            resistText = '[resistance]';
                        }
                        let appliedText = `**Applied:** ${appliedDamage} (${args.primary || 'unknown'}) ${resistText}`;
                        let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**${stat.charAt(0).toUpperCase()+stat.slice(1)} Save:** ${saveRoll} vs. DC ${saveDC}<br>**Result:** ${resultText}<br>${diceLine}<br>${damageText}<br>${appliedText}}}`;
                        sendChat('MonsterAttack', output);
                    });
                });
            });
        }
    }
});
