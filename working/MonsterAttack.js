// filename: MonsterAttack.js
// Roll20 API script for automating monster attacks and spell effects (legacy sheets only)
// Usage: Select a monster token and one or more player tokens, then run !monsterattack

// CR lookup tables (copy your full tables here)
// Damage type to saving throw mapping (copied from trap_reference.js)
// ...existing code...
const CR_EXPECTED_STATS = {
  '0': { ac: 13, hp: [1, 6], attack: 3, damage: [1, 3], save: 13 },
  '1/8': { ac: 13, hp: [7, 35], attack: 3, damage: [2, 3], save: 13 },
  '1/4': { ac: 13, hp: [36, 49], attack: 3, damage: [4, 5], save: 13 },
  '1/2': { ac: 13, hp: [50, 70], attack: 3, damage: [6, 8], save: 13 },
  '1': { ac: 13, hp: [71, 85], attack: 3, damage: [9, 14], save: 13 },
  '2': { ac: 13, hp: [86, 100], attack: 3, damage: [15, 20], save: 13 },
  '3': { ac: 13, hp: [101, 115], attack: 4, damage: [21, 26], save: 13 },
  '4': { ac: 14, hp: [116, 130], attack: 5, damage: [27, 32], save: 14 },
  '5': { ac: 15, hp: [131, 145], attack: 6, damage: [33, 38], save: 15 },
  '6': { ac: 15, hp: [146, 160], attack: 6, damage: [39, 44], save: 15 },
  '7': { ac: 15, hp: [161, 175], attack: 6, damage: [45, 50], save: 15 },
  '8': { ac: 16, hp: [176, 190], attack: 7, damage: [51, 56], save: 16 },
  '9': { ac: 16, hp: [191, 205], attack: 7, damage: [57, 62], save: 16 },
  '10': { ac: 17, hp: [206, 220], attack: 7, damage: [63, 68], save: 16 },
  '11': { ac: 17, hp: [221, 235], attack: 8, damage: [69, 74], save: 17 },
  '12': { ac: 17, hp: [236, 250], attack: 8, damage: [75, 80], save: 17 },
  '13': { ac: 18, hp: [251, 265], attack: 8, damage: [81, 86], save: 18 },
  '14': { ac: 18, hp: [266, 280], attack: 8, damage: [87, 92], save: 18 },
  '15': { ac: 18, hp: [281, 295], attack: 8, damage: [93, 98], save: 18 },
  '16': { ac: 18, hp: [296, 310], attack: 9, damage: [99, 104], save: 18 },
  '17': { ac: 19, hp: [311, 325], attack: 10, damage: [105, 110], save: 19 },
  '18': { ac: 19, hp: [326, 340], attack: 10, damage: [111, 116], save: 19 },
  '19': { ac: 19, hp: [341, 355], attack: 10, damage: [117, 122], save: 19 },
  '20': { ac: 19, hp: [356, 400], attack: 10, damage: [123, 140], save: 19 },
  '21': { ac: 19, hp: [401, 445], attack: 11, damage: [141, 158], save: 20 },
  '22': { ac: 19, hp: [446, 490], attack: 11, damage: [159, 176], save: 20 },
  '23': { ac: 19, hp: [491, 535], attack: 11, damage: [177, 194], save: 20 },
  '24': { ac: 19, hp: [536, 580], attack: 12, damage: [195, 212], save: 21 },
  '25': { ac: 19, hp: [581, 625], attack: 12, damage: [213, 230], save: 21 },
  '26': { ac: 19, hp: [626, 670], attack: 12, damage: [231, 248], save: 21 },
  '27': { ac: 19, hp: [671, 715], attack: 13, damage: [249, 266], save: 22 },
  '28': { ac: 19, hp: [716, 760], attack: 13, damage: [267, 284], save: 22 },
  '29': { ac: 19, hp: [761, 805], attack: 13, damage: [285, 302], save: 22 },
  '30': { ac: 19, hp: [806, 850], attack: 14, damage: [303, 320], save: 23 }
};

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

function generateDiceExpression(targetDamage) {
    if (targetDamage <= 1) return "1";
    // Always use a modifier equal to 25% of the target (rounded)
    const modifier = Math.round(targetDamage * 0.25);
    const diceTarget = targetDamage - modifier;
    const diceOptions = [
        { die: 12, avg: 6.5 },
        { die: 10, avg: 5.5 },
        { die: 8, avg: 4.5 },
        { die: 6, avg: 3.5 },
        { die: 4, avg: 2.5 }
    ];
    for (const option of diceOptions) {
        // Find the smallest number of dice (with this die size) whose average plus modifier is >= targetDamage
        for (let numDice = 1; numDice <= 20; numDice++) {
            const diceTotal = numDice * option.avg;
            if (diceTotal + modifier >= targetDamage) {
                return modifier > 0 ? `${numDice}d${option.die}+${modifier}` : `${numDice}d${option.die}`;
            }
        }
    }
    // Fallback to d6s
    for (let numD6 = 1; numD6 <= 20; numD6++) {
        const diceTotal = numD6 * 3.5;
        if (diceTotal + modifier >= targetDamage) {
            return modifier > 0 ? `${numD6}d6+${modifier}` : `${numD6}d6`;
        }
    }
    // If all else fails, just return 1d6
    return "1d6";
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
    // Macro usage prompt removed as requested
    // If macro args are present, process attack
    if (msg.content.includes('--type')) {
        let args = {};
        msg.content.split('--').slice(1).forEach(arg => {
            let [key, ...rest] = arg.trim().split(' ');
            args[key] = rest.join(' ');
        });
        let crVal = getAttrByName(monsterChar.id, 'npc_challenge');
        let crKey = crVal && crVal.trim() ? crVal.trim() : '1';
        let stats = CR_EXPECTED_STATS[crKey] || CR_EXPECTED_STATS['1'];
        let attackBonus = stats.attack;
        let saveDC = stats.save;
        // Revised logic: Damage range is for the monster's whole turn (all actions)
        let minDmg = stats.damage[0];
        let maxDmg = stats.damage[1];
        let totalTurnDamage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
        let crNum = parseCR(crKey);
        let totalActions = (crNum < 1) ? 1 : (2 + Math.floor(crNum / 5));
        // Damage per action (rounded down, at least 1)
        let damagePerAction = Math.max(1, Math.floor(totalTurnDamage / totalActions));
        // Number of actions being used for this attack (from user, or default 1)
        let actionsUsed = parseInt(args.attacks) || 1;
        // Total damage for this attack
        let attackDamage = damagePerAction * actionsUsed;
        let damageExpr = generateDiceExpression(attackDamage);
        let results = [];
        playerTokens.forEach(({ token: playerToken, character: playerChar }) => {
            if (args.type === 'Attack') {
                let ac = parseInt(getAttrByName(playerChar.id, 'ac'));
                let attackRollExpr = `1d20+${attackBonus}`;
                // Resistance/immunity logic for attack damage
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
                    let resultText = hit ? (nat20 ? '**CRITICAL HIT**' : '**HIT**') : '**MISS**';
                    let damageText = '';
                    let damageAmount = 0;
                    // Determine damage expression for crits
                    let critDamageExpr = damageExpr;
                    if (hit) {
                        if (nat20) {
                            // Double the number of dice for crits
                            critDamageExpr = doubleDiceExpression(damageExpr);
                        }
                        sendChat('', `/w gm [[${critDamageExpr}]]`, function(dmgOps) {
                            let rolledDamage = dmgOps[0].inlinerolls[0].results.total;
                            let appliedDamage = applyResistImmunity(rolledDamage);
                            // Apply damage to temp HP first, then regular HP (for PCs)
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
                            let resistText = '';
                            if (immunities.includes(damageType)) {
                                resistText = '[immunity]';
                            } else if (resistances.includes(damageType)) {
                                resistText = '[resistance]';
                            }
                            let damageText = `**Damage:** ${rolledDamage} (${args.primary || 'unknown'})` + (nat20 ? ' (critical)' : '');
                            let appliedText = `**Applied:** ${appliedDamage} (${args.primary || 'unknown'}) ${resistText}`;
                            let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**Attack Roll:** ${attackRoll} vs AC ${ac}<br>**Result:** ${resultText}<br>${damageText}<br>${appliedText}}}`;
                            sendChat('MonsterAttack', output);
                        });
                    } else {
                        let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**Attack Roll:** ${attackRoll} vs AC ${ac}<br>**Result:** ${resultText}}}`;
                        sendChat('MonsterAttack', output);
                    }
                });
            // ...existing code...
// Helper function to double the number of dice in a dice expression (for crits)
function doubleDiceExpression(expr) {
    // Matches dice expressions like 2d6+3, 1d8, etc.
    let diceRegex = /(\d+)d(\d+)([+-]\d+)?/i;
    let match = expr.match(diceRegex);
    if (!match) return expr;
    let numDice = parseInt(match[1], 10);
    let dieType = match[2];
    let modifier = match[3] || '';
    return `${numDice * 2}d${dieType}${modifier}`;
}
            } else if (args.type === 'Spell') {
                // Determine save stat from damage type
                let damageType = (args.primary || '').toLowerCase();
                let stat = DamageToSave[damageType] ? DamageToSave[damageType].toLowerCase() : 'constitution';
                let saveAttrName = `${stat}_save_bonus`;
                let saveAttr = findObjs({type:'attribute', characterid:playerChar.id, name: saveAttrName})[0];
                let saveMod = saveAttr ? parseInt(saveAttr.get('current')) : 0;
                let saveRollExpr = `1d20+${saveMod}`;
                sendChat('', `/w gm [[${saveRollExpr}]]`, function(ops) {
                    let saveRoll = ops[0].inlinerolls[0].results.total;
                    let success = saveRoll >= saveDC;
                    let resultText = success ? '**SUCCESS**' : '**FAILURE**';
                    let damageAmount = 0;
                    let damageText = '';
                    let applyResistImmunity = function(damageAmount) {
                        // Resistance/immunity logic (copied from trap_reference.js)
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
                    if (success) {
                        if (args.resist === 'Half') {
                            sendChat('', `/w gm [[floor((${damageExpr})/2)]]`, function(dmgOps) {
                                let rolledDamage = dmgOps[0].inlinerolls[0].results.total;
                                if (rolledDamage < 1) rolledDamage = 1;
                                let appliedDamage = applyResistImmunity(rolledDamage);
                                // Apply damage to temp HP first, then regular HP (for PCs)
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
                                let resistText = '';
                                if (immunities.includes(damageType)) {
                                    resistText = '[immunity]';
                                } else if (resistances.includes(damageType)) {
                                    resistText = '[resistance]';
                                }
                                let damageText = `**Damage:** ${rolledDamage} (${args.primary || 'unknown'}) (half damage)`;
                                let appliedText = `**Applied:** ${appliedDamage} (${args.primary || 'unknown'}) ${resistText}`;
                                let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**${stat.charAt(0).toUpperCase()+stat.slice(1)} Save:** ${saveRoll} vs DC ${saveDC}<br>**Result:** ${resultText}<br>${damageText}<br>${appliedText}}}`;
                                sendChat('MonsterAttack', output);
                            });
                        } else {
                            let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**${stat.charAt(0).toUpperCase()+stat.slice(1)} Save:** ${saveRoll} vs DC ${saveDC}<br>**Result:** ${resultText}}}`;
                            sendChat('MonsterAttack', output);
                        }
                    } else {
                        sendChat('', `/w gm [[${damageExpr}]]`, function(dmgOps) {
                            let rolledDamage = dmgOps[0].inlinerolls[0].results.total;
                            let appliedDamage = applyResistImmunity(rolledDamage);
                            // Apply damage to temp HP first, then regular HP (for PCs)
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
                            let resistText = '';
                            if (immunities.includes(damageType)) {
                                resistText = '[immunity]';
                            } else if (resistances.includes(damageType)) {
                                resistText = '[resistance]';
                            }
                            let damageText = `**Damage:** ${rolledDamage} (${args.primary || 'unknown'})`;
                            let appliedText = `**Applied:** ${appliedDamage} (${args.primary || 'unknown'}) ${resistText}`;
                            let output = `&{template:npcaction}{{rname=Monster Attack}}{{name=${playerToken.get('name')}}}{{description=**${stat.charAt(0).toUpperCase()+stat.slice(1)} Save:** ${saveRoll} vs DC ${saveDC}<br>**Result:** ${resultText}<br>${damageText}<br>${appliedText}}}`;
                            sendChat('MonsterAttack', output);
                        });
                    }
                });
            }
        });
        // Results are now sent per player for clarity and formatting
    }
});
