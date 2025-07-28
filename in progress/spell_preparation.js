// filename: spell_preparation.js
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!prepare')) return;

    // Check if token is selected
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Spell Preparation', `/w "${msg.who}" Please select your character token.`);
        return;
    }

    let token = getObj('graphic', msg.selected[0]._id);
    if (!token) {
        sendChat('Spell Preparation', `/w "${msg.who}" Invalid token selected.`);
        return;
    }

    let character = getObj('character', token.get('represents'));
    if (!character) {
        sendChat('Spell Preparation', `/w "${msg.who}" Selected token must represent a character.`);
        return;
    }

    // Parse the command
    let args = msg.content.split(' ').slice(1);
    let command = args[0] || '';

    switch(command.toLowerCase()) {
        case 'menu':
            showPreparationMenu(character, msg.who);
            break;
        case 'add':
            addPreparedSpell(character, args.slice(1).join(' '), msg.who);
            break;
        case 'remove':
            removePreparedSpell(character, args.slice(1).join(' '), msg.who);
            break;
        case 'list':
            listPreparedSpells(character, msg.who);
            break;
        case 'clear':
            clearAllPreparedSpells(character, msg.who);
            break;
        case 'reset':
            resetSpellSlots(character, msg.who);
            break;
        default:
            showPreparationMenu(character, msg.who);
    }
});

function showPreparationMenu(character, playerName) {
    let menu = `**Spell Preparation Menu for ${character.get('name')}**

Commands:
• \`!prepare add [spell name] [level]\` - Add a spell to prepared list
• \`!prepare remove [spell name]\` - Remove a spell from prepared list
• \`!prepare list\` - Show all prepared spells
• \`!prepare clear\` - Clear all prepared spells
• \`!prepare reset\` - Reset all spell slots to full

**Quick Add Examples:**
• \`!prepare add "Magic Missile" 1\`
• \`!prepare add "Fireball" 3\`
• \`!prepare add "Prestidigitation" 0\` (cantrip)

**Current Prepared Spells:**`;

    sendChat('Spell Preparation', `/w "${playerName}" ${menu}`);
    listPreparedSpells(character, playerName);
}

function addPreparedSpell(character, spellInfo, playerName) {
    // Parse spell name and level from the input
    let parts = spellInfo.trim().split(' ');
    let level = parseInt(parts[parts.length - 1], 10);
    let spellName = '';
    
    if (!isNaN(level)) {
        // Last part is a number, so it's the level
        spellName = parts.slice(0, -1).join(' ').replace(/"/g, '');
    } else {
        // No level specified, assume cantrip
        level = 0;
        spellName = spellInfo.replace(/"/g, '');
    }

    if (!spellName) {
        sendChat('Spell Preparation', `/w "${playerName}" Please specify a spell name. Example: !prepare add "Magic Missile" 1`);
        return;
    }

    // Store the prepared spell as a custom attribute
    let spellKey = `prepared_spell_${spellName.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Check if spell is already prepared
    let existingSpell = findObjs({type:'attribute', characterid:character.id, name:spellKey})[0];
    if (existingSpell) {
        sendChat('Spell Preparation', `/w "${playerName}" "${spellName}" is already prepared.`);
        return;
    }

    // Create the attribute
    createObj('attribute', {
        characterid: character.id,
        name: spellKey,
        current: JSON.stringify({
            name: spellName,
            level: level,
            prepared: true
        })
    });

    sendChat('Spell Preparation', `/w "${playerName}" Added "${spellName}" (Level ${level === 0 ? 'Cantrip' : level}) to prepared spells.`);
}

function removePreparedSpell(character, spellName, playerName) {
    if (!spellName) {
        sendChat('Spell Preparation', `/w "${playerName}" Please specify a spell name to remove.`);
        return;
    }

    let spellKey = `prepared_spell_${spellName.toLowerCase().replace(/\s+/g, '_').replace(/"/g, '')}`;
    let spellAttr = findObjs({type:'attribute', characterid:character.id, name:spellKey})[0];
    
    if (!spellAttr) {
        sendChat('Spell Preparation', `/w "${playerName}" "${spellName}" is not in your prepared spells.`);
        return;
    }

    spellAttr.remove();
    sendChat('Spell Preparation', `/w "${playerName}" Removed "${spellName}" from prepared spells.`);
}

function listPreparedSpells(character, playerName) {
    let preparedSpells = getPreparedSpells(character);
    
    if (preparedSpells.length === 0) {
        sendChat('Spell Preparation', `/w "${playerName}" No spells currently prepared.`);
        return;
    }

    // Group by level
    let spellsByLevel = {};
    preparedSpells.forEach(spell => {
        if (!spellsByLevel[spell.level]) {
            spellsByLevel[spell.level] = [];
        }
        spellsByLevel[spell.level].push(spell.name);
    });

    let output = '**Prepared Spells:**\n';
    
    // Show cantrips first
    if (spellsByLevel[0]) {
        output += `**Cantrips:** ${spellsByLevel[0].join(', ')}\n`;
    }
    
    // Show leveled spells
    for (let level = 1; level <= 9; level++) {
        if (spellsByLevel[level]) {
            output += `**Level ${level}:** ${spellsByLevel[level].join(', ')}\n`;
        }
    }

    sendChat('Spell Preparation', `/w "${playerName}" ${output}`);
}

function clearAllPreparedSpells(character, playerName) {
    let preparedSpells = findObjs({type:'attribute', characterid:character.id})
        .filter(attr => attr.get('name').startsWith('prepared_spell_'));
    
    preparedSpells.forEach(spell => spell.remove());
    
    sendChat('Spell Preparation', `/w "${playerName}" Cleared all prepared spells for ${character.get('name')}.`);
}

function resetSpellSlots(character, playerName) {
    // Reset spell slots for levels 1-9
    for (let level = 1; level <= 9; level++) {
        let slotAttr = findObjs({type:'attribute', characterid:character.id, name:`custom_spell_slots_${level}_used`})[0];
        if (slotAttr) {
            slotAttr.set('current', 0);
        }
    }
    
    sendChat('Spell Preparation', `/w "${playerName}" Reset all spell slots for ${character.get('name')}.`);
}

function getPreparedSpells(character) {
    let preparedSpells = [];
    let spellAttrs = findObjs({type:'attribute', characterid:character.id})
        .filter(attr => attr.get('name').startsWith('prepared_spell_'));
    
    spellAttrs.forEach(attr => {
        try {
            let spellData = JSON.parse(attr.get('current'));
            preparedSpells.push(spellData);
        } catch (e) {
            // Skip invalid JSON
        }
    });
    
    return preparedSpells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

// Export function for use by spellcasting script
function getCharacterPreparedSpells(character) {
    return getPreparedSpells(character);
}
