// filename: spellcasting.js
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!cast')) return;

    // Check if token is selected
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Spellcasting', `/w "${msg.who}" Please select your character token.`);
        return;
    }

    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Spellcasting', `/w "${msg.who}" Invalid token selected.`);
        return;
    }

    let character = getObj('character', token.get('represents'));
    if (!character) {
        sendChat('Spellcasting', `/w "${msg.who}" Selected token must represent a character.`);
        return;
    }

    // Parse arguments - looking for spell name and level
    let args = msg.content.split(' --');
    let spellName = '';
    let spellLevel = 1;
    
    args.forEach(arg => {
        let [key, value] = arg.trim().split(' ', 2);
        if (key === 'spell') spellName = value;
        if (key === 'level') spellLevel = parseInt(value, 10) || 1;
    });

    if (!spellName) {
        // If no spell specified, show available spells
        sendChat('Spellcasting', `/w "${msg.who}" Debug: Looking for spells for character ${character.get('name')}`);
        showAvailableSpells(character, msg.who);
        return;
    }

    // Process the spell casting
    castSpell(character, spellName, spellLevel, msg.who);
});

function showAvailableSpells(character, playerName) {
    let spells = getCharacterSpells(character);
    
    sendChat('Spellcasting', `/w "${playerName}" Debug: Found ${spells.length} spells total`);
    
    if (spells.length === 0) {
        // Let's also check what attributes exist for debugging
        let allAttrs = findObjs({type:'attribute', characterid:character.id});
        let spellAttrs = allAttrs.filter(attr => attr.get('name').includes('spell'));
        sendChat('Spellcasting', `/w "${playerName}" Debug: Found ${spellAttrs.length} spell-related attributes. First few: ${spellAttrs.slice(0,5).map(a => a.get('name')).join(', ')}`);
        
        // Show ALL attributes to help identify the pattern
        let allAttrNames = allAttrs.map(a => a.get('name')).sort();
        let attrChunks = [];
        for (let i = 0; i < allAttrNames.length; i += 10) {
            attrChunks.push(allAttrNames.slice(i, i + 10).join(', '));
        }
        
        for (let i = 0; i < Math.min(attrChunks.length, 5); i++) {
            sendChat('Spellcasting', `/w "${playerName}" Debug attrs ${i + 1}: ${attrChunks[i]}`);
        }
        
        sendChat('Spellcasting', `/w "${playerName}" No prepared spells or cantrips found. Check character sheet spell setup.`);
        return;
    }

    let spellList = spells.map(spell => `${spell.name} (Level ${spell.level})`).join('|');
    let macro = `!cast --spell ?{Choose Spell|${spellList}} --level ?{Spell Level|1|2|3|4|5|6|7|8|9}`;
    
    sendChat('Spellcasting', `/w "${playerName}" Available spells: ${spells.map(s => s.name).join(', ')}`);
    sendChat('Spellcasting', `/w "${playerName}" Use this command: ${macro}`);
}

function getCharacterSpells(character) {
    // Use the prepared spells from our spell preparation system
    let preparedSpells = [];
    let spellAttrs = findObjs({type:'attribute', characterid:character.id})
        .filter(attr => attr.get('name').startsWith('prepared_spell_'));
    
    spellAttrs.forEach(attr => {
        try {
            let spellData = JSON.parse(attr.get('current'));
            preparedSpells.push({
                name: spellData.name,
                level: spellData.level,
                attrName: attr.get('name')
            });
        } catch (e) {
            // Skip invalid JSON
        }
    });
    
    return preparedSpells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function generateRowID() {
    // Generate a fake row ID for repeating section testing
    return "test";
}

function castSpell(character, spellName, castLevel, playerName) {
    // Find the spell in character's spell list
    let spell = findSpellByName(character, spellName);
    
    if (!spell) {
        sendChat('Spellcasting', `/w "${playerName}" Spell "${spellName}" not found in prepared spells.`);
        return;
    }

    // Check if player has spell slots for the cast level
    if (castLevel > 0 && !hasSpellSlot(character, castLevel)) {
        sendChat('Spellcasting', `/w "${playerName}" No spell slots remaining for level ${castLevel}.`);
        return;
    }

    // Get spell details
    let spellData = getSpellData(character, spell, castLevel);
    
    // Consume spell slot if not a cantrip
    if (castLevel > 0) {
        consumeSpellSlot(character, castLevel);
    }

    // Display spell casting result
    displaySpellCast(character, spellData, castLevel, playerName);
}

function findSpellByName(character, spellName) {
    let spells = getCharacterSpells(character);
    return spells.find(spell => spell.name.toLowerCase() === spellName.toLowerCase());
}

function hasSpellSlot(character, level) {
    // Use our custom spell slot system
    let usedAttr = findObjs({type:'attribute', characterid:character.id, name:`custom_spell_slots_${level}_used`})[0];
    let totalAttr = findObjs({type:'attribute', characterid:character.id, name:`custom_spell_slots_${level}_total`})[0];
    
    // If no custom attributes exist, create them with default values
    if (!usedAttr) {
        usedAttr = createObj('attribute', {
            characterid: character.id,
            name: `custom_spell_slots_${level}_used`,
            current: 0
        });
    }
    
    if (!totalAttr) {
        // Default spell slots by level (you can adjust these)
        let defaultSlots = {1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1};
        totalAttr = createObj('attribute', {
            characterid: character.id,
            name: `custom_spell_slots_${level}_total`,
            current: defaultSlots[level] || 0
        });
    }
    
    let used = parseInt(usedAttr.get('current'), 10) || 0;
    let total = parseInt(totalAttr.get('current'), 10) || 0;
    
    return used < total;
}

function consumeSpellSlot(character, level) {
    let usedAttr = findObjs({type:'attribute', characterid:character.id, name:`custom_spell_slots_${level}_used`})[0];
    if (!usedAttr) {
        usedAttr = createObj('attribute', {
            characterid: character.id,
            name: `custom_spell_slots_${level}_used`,
            current: 0
        });
    }
    
    let current = parseInt(usedAttr.get('current'), 10) || 0;
    usedAttr.set('current', current + 1);
}

function getSpellData(character, spell, castLevel) {
    // Get spell data from the spell database first
    let dbSpell = null;
    if (typeof getSpellFromDatabase === 'function') {
        dbSpell = getSpellFromDatabase(spell.name);
    }
    
    // Get spell attack bonus and save DC from character sheet
    let spellAttackAttr = findObjs({type:'attribute', characterid:character.id, name:'spell_attack_bonus'})[0];
    let spellDCAttr = findObjs({type:'attribute', characterid:character.id, name:'spell_save_dc'})[0];
    
    // Try alternative attribute names if the above don't exist
    if (!spellAttackAttr) {
        spellAttackAttr = findObjs({type:'attribute', characterid:character.id, name:'spellattackbonus'})[0];
    }
    if (!spellDCAttr) {
        spellDCAttr = findObjs({type:'attribute', characterid:character.id, name:'spell_dc'})[0];
    }
    
    // Use database data if available, otherwise use empty defaults
    return {
        name: spell.name,
        level: spell.level,
        castLevel: castLevel,
        damage: dbSpell ? dbSpell.damage : '',
        damageType: dbSpell ? dbSpell.damageType : '',
        save: dbSpell ? dbSpell.save : '',
        saveSuccess: dbSpell ? dbSpell.saveSuccess : '',
        upcast: dbSpell ? dbSpell.upcast : '',
        description: dbSpell ? dbSpell.description : '',
        aoe: dbSpell ? dbSpell.aoe : '',
        fx: dbSpell ? dbSpell.fx : '',
        audio: dbSpell ? dbSpell.audio : '',
        concentration: dbSpell ? dbSpell.concentration : false,
        spellAttack: spellAttackAttr ? parseInt(spellAttackAttr.get('current'), 10) : 0,
        spellDC: spellDCAttr ? parseInt(spellDCAttr.get('current'), 10) : 0
    };
}

function displaySpellCast(character, spellData, castLevel, playerName) {
    let characterName = character.get('name');
    let damage = calculateDamage(spellData, castLevel);
    
    let attackInfo = '';
    if (spellData.spellAttack && spellData.damage) {
        attackInfo = `**Spell Attack:** [[1d20+${spellData.spellAttack}]]`;
    }
    
    let saveInfo = '';
    if (spellData.save && spellData.spellDC) {
        saveInfo = `**${spellData.save} Save DC ${spellData.spellDC}**`;
        if (spellData.saveSuccess) {
            saveInfo += ` - Success: ${spellData.saveSuccess}`;
        }
    }
    
    let damageInfo = '';
    if (damage) {
        damageInfo = `**Damage:** ${damage}`;
        if (spellData.damageType) {
            damageInfo += ` ${spellData.damageType}`;
        }
    }
    
    let aoeInfo = '';
    if (spellData.aoe) {
        aoeInfo = `**Area:** ${spellData.aoe}`;
    }
    
    let effectsInfo = '';
    if (spellData.fx || spellData.audio) {
        let effects = [];
        if (spellData.fx) effects.push(`FX: ${spellData.fx}`);
        if (spellData.audio) effects.push(`Audio: ${spellData.audio}`);
        effectsInfo = `**Effects:** ${effects.join(', ')}`;
    }
    
    let concentrationInfo = '';
    if (spellData.concentration) {
        concentrationInfo = '**⚠️ Concentration Required**';
    }
    
    let levelInfo = spellData.level === 0 ? 'Cantrip' : 
                   castLevel > spellData.level ? `Level ${spellData.level} (cast at ${castLevel})` : 
                   `Level ${castLevel}`;
    
    // Build description parts, filtering out empty ones
    let descriptionParts = [
        levelInfo,
        attackInfo,
        saveInfo,
        damageInfo,
        aoeInfo,
        concentrationInfo,
        effectsInfo
    ].filter(part => part !== '');
    
    sendChat('Spellcasting',
        `&{template:npcaction}{{rname=${spellData.name}}}{{name=${characterName}}}{{description=${descriptionParts.join('\n\n')}
        
**Spell Slots Remaining:** Level ${castLevel}: ${getRemainingSlots(character, castLevel)}
}}`
    );
}

function getRemainingSlots(character, level) {
    let usedAttr = findObjs({type:'attribute', characterid:character.id, name:`custom_spell_slots_${level}_used`})[0];
    let totalAttr = findObjs({type:'attribute', characterid:character.id, name:`custom_spell_slots_${level}_total`})[0];
    
    let used = usedAttr ? parseInt(usedAttr.get('current'), 10) || 0 : 0;
    let total = totalAttr ? parseInt(totalAttr.get('current'), 10) || 0 : 0;
    
    return Math.max(0, total - used);
}

function calculateDamage(spellData, castLevel) {
    if (!spellData.damage) return '';
    
    let baseDamage = spellData.damage;
    
    // Handle upcasting using database upcast information
    if (castLevel > spellData.level && spellData.upcast) {
        let levelDiff = castLevel - spellData.level;
        
        // Try to parse upcast information
        if (spellData.upcast.includes('d')) {
            // Pattern like "1d6 per level" or "1d6 additional damage per spell level"
            let upcastMatch = spellData.upcast.match(/(\d+)d(\d+)/);
            if (upcastMatch) {
                let diceCount = parseInt(upcastMatch[1], 10) * levelDiff;
                let diceSize = upcastMatch[2];
                baseDamage += `+${diceCount}d${diceSize}`;
            }
        } else if (spellData.upcast.includes('dart') || spellData.upcast.includes('missile')) {
            // Special case for Magic Missile and similar spells
            // This would need custom handling per spell
        }
    }
    
    return `[[${baseDamage}]]`;
}
