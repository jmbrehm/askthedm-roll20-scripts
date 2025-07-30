// filename: trap_reference.js
// Level-based trap system with Nuisance and Deadly categories

// Trap reference tables
const TrapTables = {
    nuisance: {
        "1-4": { attackBonus: 4, saveDC: [10, 11, 12], damage: "1d10" },
        "5-10": { attackBonus: 4, saveDC: [12, 13, 14], damage: "2d10" },
        "11-16": { attackBonus: 4, saveDC: [14, 15, 16], damage: "4d10" },
        "17-20": { attackBonus: 4, saveDC: [16, 17, 18], damage: "10d10" }
    },
    deadly: {
        "1-4": { attackBonus: 8, saveDC: [13, 14, 15], damage: "2d10" },
        "5-10": { attackBonus: 8, saveDC: [15, 16, 17], damage: "4d10" },
        "11-16": { attackBonus: 8, saveDC: [17, 18, 19], damage: "10d10" },
        "17-20": { attackBonus: 8, saveDC: [19, 20, 21], damage: "18d10" }
    }
};



on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!trap')) return;

    // Parse command
    let args = msg.content.split(' ').slice(1);
    let command = args[0] || '';

    switch(command.toLowerCase()) {
        case 'trigger':
            handleTrapTrigger(msg);
            break;
        case 'reference':
            // Reference command removed
            break;
        case 'help':
            // Help command removed
            break;
        default:
            // Default help removed
    }
});

function handleTrapTrigger(msg) {
    // Check if tokens are selected
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Trap System', `/w "${msg.who}" Please select one or more tokens to trigger the trap.`);
        return;
    }

    // Parse trap parameters
    let params = parseTrapCommand(msg.content);
    
    if (!params.type) {
        // Trap prompt removed
        return;
    }

    // Apply trap to each selected token
    msg.selected.forEach((selected, index) => {
        let token = getObj('graphic', selected._id);
        if (!token) return;

        let character = getObj('character', token.get('represents'));
        if (!character) return;

        // Get character level from attributes
        let level = getCharacterLevel(character);
        if (!level) {
            sendChat('Trap System', `/w "${msg.who}" Could not determine level for ${token.get('name') || character.get('name')}. Skipping.`);
            return;
        }

        // Get trap stats from tables using character's level
        let trapStats = getTrapStats(level, params.type);
        if (!trapStats) {
            sendChat('Trap System', `/w "${msg.who}" Invalid level (${level}) or trap type for ${token.get('name') || character.get('name')}.`);
            return;
        }

        processTrapForToken(token, character, trapStats, params, msg.who, level);
    });
}

function getCharacterLevel(character) {
    // Try common level attribute names first
    let levelAttrNames = ['level', 'character_level', 'total_level', 'base_level'];
    
    for (let attrName of levelAttrNames) {
        let levelAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
        if (levelAttr) {
            let level = parseInt(levelAttr.get('current'), 10);
            if (level && level > 0 && level <= 20) {
                return level;
            }
        }
    }
    
    // If no level found, try NPC challenge rating
    let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
    if (crAttr) {
        let challengeRating = parseFloat(crAttr.get('current'));
        if (!isNaN(challengeRating)) {
            // Treat any CR less than 1 as level 1, otherwise use CR * 4 as effective level (capped at 20)
            let level = challengeRating < 1 ? 1 : Math.min(Math.floor(challengeRating * 4), 20);
            return level;
        }
    }
    
    return null; // Level not found
}

function parseTrapCommand(content) {
    let params = {
        type: null,
        method: null,
        damageType: null
    };

    // Parse parameters from command (level is now auto-detected)
    let typeMatch = content.match(/--type\s+(\w+)/);
    let methodMatch = content.match(/--method\s+(\w+)/);
    let damageMatch = content.match(/--damage\s+(\w+)/);

    if (typeMatch) params.type = typeMatch[1].toLowerCase();
    if (methodMatch) params.method = methodMatch[1].toLowerCase();
    if (damageMatch) params.damageType = damageMatch[1].toLowerCase();

    return params;
}

function getTrapStats(level, type) {
    let levelRange = getLevelRange(level);
    if (!levelRange || !TrapTables[type] || !TrapTables[type][levelRange]) {
        return null;
    }

    let stats = TrapTables[type][levelRange];
    
    // Pick random DC from range
    let randomDC = stats.saveDC[Math.floor(Math.random() * stats.saveDC.length)];
    
    return {
        attackBonus: stats.attackBonus,
        saveDC: randomDC,
        damage: stats.damage,
        levelRange: levelRange,
        type: type
    };
}

function getLevelRange(level) {
    if (level >= 1 && level <= 4) return "1-4";
    if (level >= 5 && level <= 10) return "5-10";
    if (level >= 11 && level <= 16) return "11-16";
    if (level >= 17 && level <= 20) return "17-20";
    return null;
}

function processTrapForToken(token, character, trapStats, params, playerName, level) {
    let tokenName = token.get('name') || character.get('name') || 'Unknown';
    
    if (params.method === 'attack') {
        processAttackTrap(token, character, trapStats, params, tokenName, level);
    } else if (params.method === 'save') {
        processSaveTrap(token, character, trapStats, params, tokenName, level);
    } else {
        sendChat('Trap System', `/w "${playerName}" Invalid method. Use 'attack' or 'save'.`);
    }
}

function processAttackTrap(token, character, trapStats, params, tokenName, level) {
    // Get AC from character sheet
    let acAttr = findObjs({type:'attribute', characterid:character.id, name:'ac'})[0];
    let ac = acAttr ? parseInt(acAttr.get('current'), 10) : 10;

    // Make attack roll
    let attackRoll = `1d20+${trapStats.attackBonus}`;

    sendChat('', `/w gm [[${attackRoll}]]`, function(ops) {
        let rollData = ops[0].inlinerolls[0];
        let attackResult = rollData.results.total;
        // New crit logic: if attackResult - trapStats.attackBonus === 20, it's a crit
        let isCrit = (attackResult - trapStats.attackBonus === 20);
        let hit = attackResult >= ac;

        let result = '';
        if (hit) {
            result = isCrit ? `**CRITICAL HIT!** (${attackResult} vs AC ${ac})` : `**HIT!** (${attackResult} vs AC ${ac})`;
            let damageFormula = trapStats.damage;
            if (isCrit) {
                damageFormula = doubleDice(trapStats.damage);
            }
            sendChat('', `/w gm [[${damageFormula}]]`, function(damageOps) {
                let damageAmount = damageOps[0].inlinerolls[0].results.total;
                let isPlayerCharacter = hasLevelAttribute(character);

                // Determine resistances/immunities and applied damage
                let resistAttrName = isPlayerCharacter ? 'pc_resistances' : 'npc_resistances';
                let immuneAttrName = isPlayerCharacter ? 'pc_immunities' : 'npc_immunities';
                let resistAttr = findObjs({type:'attribute', characterid:character.id, name:resistAttrName})[0];
                let immuneAttr = findObjs({type:'attribute', characterid:character.id, name:immuneAttrName})[0];
                let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
                let damageType = params.damageType || '';
                let appliedDamage = damageAmount;
                let appliedNote = '';
                if (damageType) {
                    if (immunities.includes(damageType)) {
                        appliedDamage = 0;
                        appliedNote = ' (immunity)';
                    } else if (resistances.includes(damageType)) {
                        appliedDamage = Math.max(1, Math.floor(damageAmount / 2));
                        appliedNote = ' (resistance)';
                    }
                }

                // Actually apply the damage
                applyDamage(token, character, appliedDamage, tokenName, isPlayerCharacter);

                // --- Visual Effect Trigger ---
                // Use built-in 'burn-x' effect, where x is the color from DamageToVEffect for the damage type
                if (typeof spawnFx === 'function' && typeof globalThis.DamageToVEffect !== 'undefined') {
                    let vfxColor = globalThis.DamageToVEffect[damageType] || 'blood';
                    let vfxName = `burn-${vfxColor}`;
                    let vfxX = token.get('left');
                    let vfxY = token.get('top');
                    let vfxPage = token.get('pageid');
                    // (Debug whisper removed)
                    spawnFx(vfxX, vfxY, vfxName, vfxPage);
                }
                // --- End Visual Effect Trigger ---

                sendChat('Trap System',
                    `&{template:npcaction}{{rname=Trap Triggered!}}{{name=${tokenName}}}{{description=**${trapStats.type.toUpperCase()} Trap (Level ${level})**
**Attack Roll:** ${attackResult} vs AC ${ac}
**Result:** ${result}
**Dice:** ${damageFormula}
**Damage:** ${damageAmount} ${damageType}
**Applied:** ${appliedDamage}${appliedNote}
}}`
                );
            });
        } else {
            result = `**MISS** (${attackResult} vs AC ${ac})`;
            sendChat('Trap System',
                `&{template:npcaction}{{rname=Trap Triggered!}}{{name=${tokenName}}}{{description=**${trapStats.type.toUpperCase()} Trap (Level ${level})**
**Attack Roll:** ${attackResult} vs AC ${ac}
**Result:** ${result}
}}`
            );
        }
    });
}

// Helper to double the dice in a damage formula string (e.g., 2d10 -> 4d10)
function doubleDice(formula) {
    // Match patterns like XdY (e.g., 2d10, 10d6)
    return formula.replace(/(\d+)d(\d+)/g, function(match, dice, sides) {
        return (parseInt(dice, 10) * 2) + 'd' + sides;
    });
}

function processSaveTrap(token, character, trapStats, params, tokenName, level) {
    // Determine save type based on damage type using global reference
    let saveType = (typeof globalThis.DamageToSave !== 'undefined') ? globalThis.DamageToSave[params.damageType] : undefined;
    if (!saveType) {
        sendChat('Trap System', `/w gm Invalid damage type for save determination.`);
        return;
    }
    // Get save bonus from character sheet
    let saveAttrName = `${saveType.toLowerCase()}_save_bonus`;
    let saveAttr = findObjs({type:'attribute', characterid:character.id, name:saveAttrName})[0];
    let saveBonus = saveAttr ? parseInt(saveAttr.get('current'), 10) : 0;
    // Make saving throw
    let saveRoll = `1d20+${saveBonus}`;
    sendChat('', `/w gm [[${saveRoll}]]`, function(ops) {
        let saveResult = ops[0].inlinerolls[0].results.total;
        let success = saveResult >= trapStats.saveDC;
        let result = '';
        let damageFormula = '';
        let diceDisplay = trapStats.damage;
        if (success) {
            result = `**SUCCESS** (${saveResult} vs DC ${trapStats.saveDC})`;
            // Half damage on successful save, minimum 1
            damageFormula = `floor((${trapStats.damage})/2)`;
        } else {
            result = `**FAILURE** (${saveResult} vs DC ${trapStats.saveDC})`;
            damageFormula = trapStats.damage;
        }
        // Calculate damage with a single roll for both display and application
        sendChat('', `/w gm [[${damageFormula}]]`, function(damageOps) {
            let damageAmount = damageOps[0].inlinerolls[0].results.total;
            if (success && damageAmount < 1) {
                damageAmount = 1;
            }
            let isPlayerCharacter = hasLevelAttribute(character);

            // Determine resistances/immunities and applied damage
            let resistAttrName = isPlayerCharacter ? 'pc_resistances' : 'npc_resistances';
            let immuneAttrName = isPlayerCharacter ? 'pc_immunities' : 'npc_immunities';
            let resistAttr = findObjs({type:'attribute', characterid:character.id, name:resistAttrName})[0];
            let immuneAttr = findObjs({type:'attribute', characterid:character.id, name:immuneAttrName})[0];
            let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
            let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
            let damageType = params.damageType || '';
            let appliedDamage = damageAmount;
            let appliedNote = '';
            if (damageType) {
                if (immunities.includes(damageType)) {
                    appliedDamage = 0;
                    appliedNote = ' (immunity)';
                } else if (resistances.includes(damageType)) {
                    appliedDamage = Math.max(1, Math.floor(damageAmount / 2));
                    appliedNote = ' (resistance)';
                }
            }


            // --- Visual Effect Trigger for Save Traps ---
            // Use 'glow-x' for success, 'burn-x' for failure, x from DamageToVEffect
            if (typeof spawnFx === 'function' && typeof globalThis.DamageToVEffect !== 'undefined') {
                let vfxColor = globalThis.DamageToVEffect[params.damageType] || 'blood';
                let vfxName = success ? `glow-${vfxColor}` : `burn-${vfxColor}`;
                let vfxX = token.get('left');
                let vfxY = token.get('top');
                let vfxPage = token.get('pageid');
                spawnFx(vfxX, vfxY, vfxName, vfxPage);
            }
            // --- End Visual Effect Trigger ---

            applyDamage(token, character, appliedDamage, tokenName, isPlayerCharacter);

            sendChat('Trap System',
                `&{template:npcaction}{{rname=Trap Triggered!}}{{name=${tokenName}}}{{description=**${trapStats.type.toUpperCase()} Trap (Level ${level})**
**${saveType} Save:** ${saveResult} vs DC ${trapStats.saveDC}
**Result:** ${result}
**Dice:** ${diceDisplay}
**Damage:** ${damageAmount} ${params.damageType} ${success ? '(half damage)' : ''}
**Applied:** ${appliedDamage}${appliedNote}
}}`
            );
        });
    });
}


function applyDamage(token, character, damageAmount, tokenName, isPlayerCharacter) {
    // Determine which attributes to check for resistances/immunities
    let resistAttrName = isPlayerCharacter ? 'pc_resistances' : 'npc_resistances';
    let immuneAttrName = isPlayerCharacter ? 'pc_immunities' : 'npc_immunities';
    let resistAttr = findObjs({type:'attribute', characterid:character.id, name:resistAttrName})[0];
    let immuneAttr = findObjs({type:'attribute', characterid:character.id, name:immuneAttrName})[0];
    let resistances = resistAttr ? (resistAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
    let immunities = immuneAttr ? (immuneAttr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];

    // Get last damage type used (from global context, or pass as param if refactoring)
    // For now, try to get from last chat message or pass as param if possible
    // We'll use a workaround: look for a global variable if set by processTrapForToken
    let damageType = (typeof window !== 'undefined' && window._trap_last_damage_type) ? window._trap_last_damage_type : null;
    if (!damageType && typeof _trap_last_damage_type !== 'undefined') damageType = _trap_last_damage_type;
    // If not available, skip resistance/immunity check

    // If damageType is present, check for resistance/immunity
    if (damageType) {
        if (immunities.includes(damageType)) {
            damageAmount = 0;
        } else if (resistances.includes(damageType)) {
            damageAmount = Math.max(1, Math.floor(damageAmount / 2));
        }
    }

    if (isPlayerCharacter) {
        // Player character - apply damage to temp HP first, then regular HP
        let tempHpAttr = findObjs({type:'attribute', characterid:character.id, name:'hp_temp'})[0];
        let tempHP = tempHpAttr ? parseInt(tempHpAttr.get('current'), 10) || 0 : 0;

        let remainingDamage = damageAmount;

        // First, apply damage to temporary HP
        if (tempHP > 0) {
            let tempDamage = Math.min(tempHP, remainingDamage);
            let newTempHP = tempHP - tempDamage;
            tempHpAttr.set('current', newTempHP);
            remainingDamage -= tempDamage;
        }

        // Then apply any remaining damage to regular HP
        if (remainingDamage > 0) {
            let hpAttrNames = ['hp', 'hit_points', 'current_hp', 'hitpoints'];
            let hpAttr = null;

            for (let attrName of hpAttrNames) {
                hpAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
                if (hpAttr) break;
            }

            if (hpAttr) {
                let currentHP = parseInt(hpAttr.get('current'), 10) || 0;
                let newHP = Math.max(0, currentHP - remainingDamage); // Don't go below 0
                hpAttr.set('current', newHP);
                return;
            }

            // Fallback: if PC doesn't have character sheet HP, try token Bar 1
            let tokenBar1 = token.get('bar1_value');
            if (tokenBar1 !== '' && tokenBar1 !== null && !isNaN(tokenBar1)) {
                let currentHP = parseInt(tokenBar1, 10) || 0;
                let newHP = Math.max(0, currentHP - remainingDamage); // Don't go below 0
                token.set('bar1_value', newHP);
                return;
            }
        }

        return; // All damage was absorbed by temp HP or applied successfully

    } else {
        // NPC - apply damage to token Bar 1 (no temp HP for NPCs)
        let tokenBar1 = token.get('bar1_value');
        if (tokenBar1 !== '' && tokenBar1 !== null && !isNaN(tokenBar1)) {
            let currentHP = parseInt(tokenBar1, 10) || 0;
            let newHP = Math.max(0, currentHP - damageAmount); // Don't go below 0
            token.set('bar1_value', newHP);
            return;
        }

        // Fallback: if NPC doesn't have Bar 1, try character sheet HP
        let hpAttrNames = ['hp', 'hit_points', 'current_hp', 'hitpoints'];
        let hpAttr = null;

        for (let attrName of hpAttrNames) {
            hpAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
            if (hpAttr) break;
        }

        if (hpAttr) {
            let currentHP = parseInt(hpAttr.get('current'), 10) || 0;
            let newHP = Math.max(0, currentHP - damageAmount); // Don't go below 0
            hpAttr.set('current', newHP);
            return;
        }
    }

    // If neither worked, send error message
    let characterType = isPlayerCharacter ? "PC" : "NPC";
    sendChat('Trap System', `/w gm Could not find HP for ${characterType} ${tokenName}. Damage not applied automatically.`);
}

function hasLevelAttribute(character) {
    // Check if character has any of the PC level attributes
    let levelAttrNames = ['level', 'character_level', 'total_level', 'base_level'];
    
    for (let attrName of levelAttrNames) {
        let levelAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
        if (levelAttr) {
            let level = parseInt(levelAttr.get('current'), 10);
            if (level && level > 0 && level <= 20) {
                return true; // This is a player character with a level attribute
            }
        }
    }
    
    return false; // No valid level attribute found, likely an NPC
}
