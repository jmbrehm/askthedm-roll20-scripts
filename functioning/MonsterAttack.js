// --- Turn Tracker Listener: Assign/Remove Attacker Marker and Attribute ---
on('change:campaign:turnorder', function(obj, prev) {
    let turnorder;
    try {
        turnorder = JSON.parse(obj.get('turnorder') || '[]');
    } catch (e) {
        turnorder = [];
    }
    if (!Array.isArray(turnorder) || turnorder.length === 0) return;
    // Get the current turn's token id
    let currentId = turnorder[0] && turnorder[0].id;
    if (!currentId) return;
    // Remove 'fist' marker and attacker=true from all tokens on the current page(s)
    let allTokens = findObjs({type:'graphic', subtype:'token'});
    allTokens.forEach(token => {
        let markers = (token.get('statusmarkers') || '').split(',').filter(Boolean);
        let hadFist = markers.includes('fist');
        if (hadFist && token.id !== currentId) {
            markers = markers.filter(m => m !== 'fist');
            token.set('statusmarkers', markers.join(','));
        }
        // Remove attacker attribute from all tokens except current
        let charId = token.get('represents');
        if (charId) {
            let attr = findObjs({type:'attribute', characterid:charId, name:'attacker'})[0];
            if (attr && token.id !== currentId) {
                attr.set('current', 'false');
            }
        }
    });
    // Assign 'fist' marker and attacker=true to the current token
    let currentToken = getObj('graphic', currentId);
    if (currentToken) {
        let markers = (currentToken.get('statusmarkers') || '').split(',').filter(Boolean);
        if (!markers.includes('fist')) {
            markers.push('fist');
            currentToken.set('statusmarkers', markers.join(','));
        }
        let charId = currentToken.get('represents');
        if (charId) {
            let attr = findObjs({type:'attribute', characterid:charId, name:'attacker'})[0];
            if (!attr) {
                createObj('attribute', {
                    characterid: charId,
                    name: 'attacker',
                    current: 'true'
                });
            } else {
                attr.set('current', 'true');
            }
        }
    }
});
// filename: MonsterAttack.js
// Roll20 API script for automating monster attacks and spell effects (legacy sheets only)
// Usage: Select a monster token and one or more player tokens, then run !monsterattack

// Reference tables are now loaded from dependencies
// Helper to double the dice in a damage formula string (e.g., 2d10+3 -> 4d10+3)
function doubleDiceExpression(expr) {
    // Only double the dice portion, not the modifier
    // Handles expressions like '2d8+4', '1d6', '3d10+2', etc.
    return expr.replace(/(\d+)d(\d+)/g, function(match, dice, sides) {
        return (parseInt(dice, 10) * 2) + 'd' + sides;
    });
}
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
            continue;
        }
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
    return "1d4";
}

// Main handler: process !monsterattack command
// --- Toggle 'attacker' attribute for selected token's character ---
on('chat:message', function(msg) {
    if (msg.type !== 'api') return;

    // --- Toggle Attacker Command ---
    if (msg.content.startsWith('!toggleattacker')) {
        if (!msg.selected || msg.selected.length === 0) {
            sendChat('MonsterAttack', '/w gm Please select a token to toggle the attacker attribute.');
            return;
        }
        msg.selected.forEach(sel => {
            let token = getObj('graphic', sel._id);
            if (!token) return;
            let charId = token.get('represents');
            if (!charId) return;
            let attr = findObjs({type:'attribute', characterid:charId, name:'attacker'})[0];
            if (!attr) {
                createObj('attribute', {
                    characterid: charId,
                    name: 'attacker',
                    current: 'true'
                });
                // Add 'fist' marker
                let markers = token.get('statusmarkers') || '';
                let markerArr = markers ? markers.split(',') : [];
                if (!markerArr.includes('fist')) {
                    markerArr.push('fist');
                    token.set('statusmarkers', markerArr.filter(Boolean).join(','));
                }
                sendChat('MonsterAttack', `/w gm Set 'attacker' to true for ${token.get('name')}`);
            } else {
                let val = (attr.get('current') || '').toLowerCase();
                if (val === 'true') {
                    attr.set('current', 'false');
                    // Remove 'fist' marker
                    let markers = token.get('statusmarkers') || '';
                    let markerArr = markers ? markers.split(',') : [];
                    markerArr = markerArr.filter(m => m !== 'fist');
                    token.set('statusmarkers', markerArr.join(','));
                    sendChat('MonsterAttack', `/w gm Set 'attacker' to false for ${token.get('name')}`);
                } else {
                    attr.set('current', 'true');
                    // Add 'fist' marker
                    let markers = token.get('statusmarkers') || '';
                    let markerArr = markers ? markers.split(',') : [];
                    if (!markerArr.includes('fist')) {
                        markerArr.push('fist');
                        token.set('statusmarkers', markerArr.filter(Boolean).join(','));
                    }
                    sendChat('MonsterAttack', `/w gm Set 'attacker' to true for ${token.get('name')}`);
                }
            }
        });
        return;
    }

    // --- MonsterAttack Command ---
    if (!msg.content.startsWith('!monsterattack')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('MonsterAttack', `/w gm Please select one or more target tokens before running the macro.`);
        return;
    }
    // Parse arguments
    let args = {};
    if (msg.content.includes('--')) {
        msg.content.split('--').slice(1).forEach(arg => {
            let [key, ...rest] = arg.trim().split(' ');
            args[key] = rest.join(' ');
        });
    }
    // Find attacker and targets from selection
    let selectedTokens = msg.selected.map(sel => {
        let token = getObj('graphic', sel._id);
        let character = token ? getObj('character', token.get('represents')) : null;
        return token && character ? { token, character } : null;
    }).filter(Boolean);
    if (selectedTokens.length === 0) {
        sendChat('MonsterAttack', `/w gm No valid tokens selected.`);
        return;
    }
    // Find attacker by 'fist' status marker
    let attackers = selectedTokens.filter(({token}) => {
        let markers = (token.get('statusmarkers') || '').split(',');
        return markers.includes('fist');
    });
    if (attackers.length > 1) {
        sendChat('MonsterAttack', `/w gm Too many attackers in the group. Only one token should have the 'fist' marker.`);
        return;
    }
    if (attackers.length === 0) {
        sendChat('MonsterAttack', `/w gm No attacker found. Please set one selected token's 'fist' marker.`);
        return;
    }
    let sourceToken = attackers[0].token;
    let sourceChar = attackers[0].character;
    // All other selected tokens are targets
    let targetTokens = selectedTokens.filter(({token}) => token.id !== sourceToken.id);
    if (targetTokens.length === 0) {
        sendChat('MonsterAttack', `/w gm No valid target tokens selected (must select at least one target in addition to the attacker).`);
        return;
    }
    // Get CR and stats from source
    let crVal = getAttrByName(sourceChar.id, 'npc_challenge');
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
        targetTokens.forEach(({ token: playerToken, character: playerChar }) => {
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
            // Check both pc_ and npc_ attributes for resistances and immunities
            let resistAttrs = [
                findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0],
                findObjs({type:'attribute', characterid:playerChar.id, name:'npc_resistances'})[0]
            ];
            let immuneAttrs = [
                findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0],
                findObjs({type:'attribute', characterid:playerChar.id, name:'npc_immunities'})[0]
            ];
            let resistances = resistAttrs
                .map(attr => attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [])
                .flat();
            let immunities = immuneAttrs
                .map(attr => attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [])
                .flat();
            if (immunities.includes(damageType)) {
                return 0;
            } else if (resistances.includes(damageType)) {
                return Math.max(1, Math.floor(damageAmount / 2));
            }
            return damageAmount;
            };
            sendChat('', `/w gm [[${attackRollExpr}]]`, function(ops) {
                let attackRoll = ops[0].inlinerolls[0].results.total;
                let hit = attackRoll >= ac;
                let immuneAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0];
                let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                let isCritImmune = immunities.includes('criticals');
                // Improved crit detection: if (attackRoll - attackBonus) === 20, it's a crit
                let isCritical = ((attackRoll - attackBonus) === 20) && !isCritImmune;
                let resultText = hit ? (isCritical ? '**CRITICAL HIT**' : '**HIT**') : '**MISS**';
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
                        // --- Damage Application: PC vs NPC ---
                        let isNPC = !!getAttrByName(playerChar.id, 'npc_challenge');
                        let remainingDamage = appliedDamage;
                        if (isNPC) {
                            // Bar 3 = temp HP, Bar 1 = HP
                            let bar3 = parseInt(playerToken.get('bar3_value')) || 0;
                            if (bar3 > 0) {
                                let tempDamage = Math.min(bar3, remainingDamage);
                                let newBar3 = bar3 - tempDamage;
                                playerToken.set('bar3_value', newBar3);
                                remainingDamage -= tempDamage;
                            }
                            if (remainingDamage > 0) {
                                let bar1 = parseInt(playerToken.get('bar1_value')) || 0;
                                let newBar1 = Math.max(0, bar1 - remainingDamage);
                                playerToken.set('bar1_value', newBar1);
                            }
                        } else {
                            let tempHpAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'hp_temp'})[0];
                            let tempHP = tempHpAttr ? parseInt(tempHpAttr.get('current'), 10) || 0 : 0;
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
                        }
                        // --- Visual Effect Trigger for Monster Attack ---
                        // Use built-in 'burn-x' effect, where x is the color from DamageToVEffect for the damage type
                        if (typeof spawnFx === 'function' && typeof globalThis.DamageToVEffect !== 'undefined') {
                            let vfxColor = globalThis.DamageToVEffect[damageType] || 'blood';
                            let vfxName = `burn-${vfxColor}`;
                            let vfxX = playerToken.get('left');
                            let vfxY = playerToken.get('top');
                            let vfxPage = playerToken.get('pageid');
                            spawnFx(vfxX, vfxY, vfxName, vfxPage);
                        }
                        // --- End Visual Effect Trigger ---
                        // Check both pc_ and npc_ attributes for resistances and immunities for output
                        let resistAttrs = [
                            findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0],
                            findObjs({type:'attribute', characterid:playerChar.id, name:'npc_resistances'})[0]
                        ];
                        let immuneAttrs = [
                            findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0],
                            findObjs({type:'attribute', characterid:playerChar.id, name:'npc_immunities'})[0]
                        ];
                        let resistances = resistAttrs
                            .map(attr => attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [])
                            .flat();
                        let immunities = immuneAttrs
                            .map(attr => attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [])
                            .flat();
                        let resistText = '';
                        if (immunities.includes(damageType)) {
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
            targetTokens.forEach(({ token: playerToken, character: playerChar }) => {
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
                    // --- Damage Application: PC vs NPC ---
                    let isNPC = !!getAttrByName(playerChar.id, 'npc_challenge');
                    let remainingDamage = appliedDamage;
                    if (isNPC) {
                        // Bar 3 = temp HP, Bar 1 = HP
                        let bar3 = parseInt(playerToken.get('bar3_value')) || 0;
                        if (bar3 > 0) {
                            let tempDamage = Math.min(bar3, remainingDamage);
                            let newBar3 = bar3 - tempDamage;
                            playerToken.set('bar3_value', newBar3);
                            remainingDamage -= tempDamage;
                        }
                        if (remainingDamage > 0) {
                            let bar1 = parseInt(playerToken.get('bar1_value')) || 0;
                            let newBar1 = Math.max(0, bar1 - remainingDamage);
                            playerToken.set('bar1_value', newBar1);
                        }
                    } else {
                        let tempHpAttr = findObjs({type:'attribute', characterid:playerChar.id, name:'hp_temp'})[0];
                        let tempHP = tempHpAttr ? parseInt(tempHpAttr.get('current'), 10) || 0 : 0;
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
                    }
                    // Check both pc_ and npc_ attributes for resistances and immunities for output
                    let resistAttrs = [
                        findObjs({type:'attribute', characterid:playerChar.id, name:'pc_resistances'})[0],
                        findObjs({type:'attribute', characterid:playerChar.id, name:'npc_resistances'})[0]
                    ];
                    let immuneAttrs = [
                        findObjs({type:'attribute', characterid:playerChar.id, name:'pc_immunities'})[0],
                        findObjs({type:'attribute', characterid:playerChar.id, name:'npc_immunities'})[0]
                    ];
                    let resistances = resistAttrs
                        .map(attr => attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [])
                        .flat();
                    let immunities = immuneAttrs
                        .map(attr => attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [])
                        .flat();
                    // --- Visual Effect Trigger for Monster Spell ---
                    // Use 'glow-x' for success, 'burn-x' for failure, x from DamageToVEffect
                    if (typeof spawnFx === 'function' && typeof globalThis.DamageToVEffect !== 'undefined') {
                        let vfxColor = globalThis.DamageToVEffect[damageType] || 'blood';
                        let vfxName = success ? `glow-${vfxColor}` : `burn-${vfxColor}`;
                        let vfxX = playerToken.get('left');
                        let vfxY = playerToken.get('top');
                        let vfxPage = playerToken.get('pageid');
                        spawnFx(vfxX, vfxY, vfxName, vfxPage);
                    }
                    // --- End Visual Effect Trigger ---
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
});
