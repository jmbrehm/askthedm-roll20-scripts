// filename: spell_database.js
// Comprehensive spell database and management system

// Global spell database
var SpellDatabase = SpellDatabase || {
    spells: {},
    
    // Add a spell to the database
    addSpell: function(spellData) {
        let key = spellData.name.toLowerCase().replace(/\s+/g, '_');
        this.spells[key] = spellData;
        return key;
    },
    
    // Get a spell by name
    getSpell: function(name) {
        let key = name.toLowerCase().replace(/\s+/g, '_');
        return this.spells[key] || null;
    },
    
    // List all spells
    getAllSpells: function() {
        return Object.values(this.spells);
    },
    
    // Search spells by level
    getSpellsByLevel: function(level) {
        return Object.values(this.spells).filter(spell => spell.level === level);
    },
    
    // Search spells by school
    getSpellsBySchool: function(school) {
        return Object.values(this.spells).filter(spell => 
            spell.school.toLowerCase() === school.toLowerCase());
    }
};

// API command handler
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!spell')) return;

    let args = msg.content.split(' ');
    let command = args[1] || '';

    switch(command.toLowerCase()) {
        case 'add':
            handleAddSpell(msg);
            break;
        case 'edit':
            handleEditSpell(msg);
            break;
        case 'info':
            handleSpellInfo(args.slice(2).join(' '), msg.who);
            break;
        case 'list':
            handleListSpells(args.slice(2), msg.who);
            break;
        case 'search':
            handleSearchSpells(args.slice(2).join(' '), msg.who);
            break;
        case 'delete':
            handleDeleteSpell(args.slice(2).join(' '), msg.who);
            break;
        case 'export':
            handleExportSpells(msg.who);
            break;
        case 'import':
            handleImportSpells(msg);
            break;
        case 'help':
            showSpellHelp(msg.who);
            break;
        default:
            showSpellHelp(msg.who);
    }
});

function handleAddSpell(msg) {
    // Interactive spell creation
    sendChat('Spell Database', `/w "${msg.who}" **Add New Spell**
    
Use this format:
\`!spell add --name "Spell Name" --level 1 --school "Evocation" --time "1 action" --range "120 feet" --components "V,S" --duration "Instantaneous" --damage "3d6" --damagetype "fire" --save "Dexterity" --savesuccess "half" --description "Spell description here" --upcast "1d6 per level" --aoe "20-foot radius" --fx "fire-explosion" --audio "fireball-boom"\`

**Required:** name, level, school, time, range, components, duration, description
**Optional:** damage, damagetype, save, savesuccess, upcast, aoe, fx, audio, concentration, ritual

Example:
\`!spell add --name "Magic Missile" --level 1 --school "Evocation" --time "1 action" --range "120 feet" --components "V,S" --duration "Instantaneous" --damage "1d4+1" --damagetype "force" --description "Three darts of magical force hit targets for 1d4+1 force damage each" --upcast "1 additional dart per level"\`
    `);
}

function handleEditSpell(msg) {
    let spellName = extractSpellName(msg.content);
    if (!spellName) {
        sendChat('Spell Database', `/w "${msg.who}" Please specify a spell name to edit.`);
        return;
    }
    
    let spell = SpellDatabase.getSpell(spellName);
    if (!spell) {
        sendChat('Spell Database', `/w "${msg.who}" Spell "${spellName}" not found.`);
        return;
    }
    
    // Parse and update spell data
    parseAndSaveSpell(msg.content, msg.who, true);
}

function parseAndSaveSpell(content, playerName, isEdit = false) {
    let spellData = parseSpellFromCommand(content);
    
    if (!spellData.name) {
        sendChat('Spell Database', `/w "${playerName}" Spell name is required.`);
        return;
    }
    
    if (!isEdit && SpellDatabase.getSpell(spellData.name)) {
        sendChat('Spell Database', `/w "${playerName}" Spell "${spellData.name}" already exists. Use \`!spell edit\` to modify it.`);
        return;
    }
    
    // Validate required fields
    let requiredFields = ['level', 'school', 'time', 'range', 'components', 'duration', 'description'];
    let missing = requiredFields.filter(field => !spellData[field]);
    
    if (missing.length > 0) {
        sendChat('Spell Database', `/w "${playerName}" Missing required fields: ${missing.join(', ')}`);
        return;
    }
    
    let key = SpellDatabase.addSpell(spellData);
    let action = isEdit ? 'updated' : 'added';
    sendChat('Spell Database', `/w "${playerName}" Spell "${spellData.name}" ${action} successfully!`);
    
    // Show the spell info
    displaySpellInfo(spellData, playerName);
}

function parseSpellFromCommand(content) {
    let spellData = {
        name: '',
        level: 0,
        school: '',
        castingTime: '',
        range: '',
        components: '',
        duration: '',
        description: '',
        damage: '',
        damageType: '',
        save: '',
        saveSuccess: '',
        upcast: '',
        aoe: '',
        concentration: false,
        ritual: false,
        fx: '',
        audio: ''
    };
    
    // Parse parameters
    let params = content.match(/--(\w+)\s+"([^"]*?)"/g) || [];
    params.forEach(param => {
        let match = param.match(/--(\w+)\s+"([^"]*?)"/);
        if (match) {
            let key = match[1];
            let value = match[2];
            
            switch(key) {
                case 'name':
                    spellData.name = value;
                    break;
                case 'level':
                    spellData.level = parseInt(value, 10) || 0;
                    break;
                case 'school':
                    spellData.school = value;
                    break;
                case 'time':
                    spellData.castingTime = value;
                    break;
                case 'range':
                    spellData.range = value;
                    break;
                case 'components':
                    spellData.components = value;
                    break;
                case 'duration':
                    spellData.duration = value;
                    break;
                case 'description':
                    spellData.description = value;
                    break;
                case 'damage':
                    spellData.damage = value;
                    break;
                case 'damagetype':
                    spellData.damageType = value;
                    break;
                case 'save':
                    spellData.save = value;
                    break;
                case 'savesuccess':
                    spellData.saveSuccess = value;
                    break;
                case 'upcast':
                    spellData.upcast = value;
                    break;
                case 'aoe':
                    spellData.aoe = value;
                    break;
                case 'fx':
                    spellData.fx = value;
                    break;
                case 'audio':
                    spellData.audio = value;
                    break;
                case 'concentration':
                    spellData.concentration = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
                    break;
                case 'ritual':
                    spellData.ritual = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
                    break;
            }
        }
    });
    
    return spellData;
}

function handleSpellInfo(spellName, playerName) {
    if (!spellName) {
        sendChat('Spell Database', `/w "${playerName}" Please specify a spell name.`);
        return;
    }
    
    let spell = SpellDatabase.getSpell(spellName);
    if (!spell) {
        sendChat('Spell Database', `/w "${playerName}" Spell "${spellName}" not found.`);
        return;
    }
    
    displaySpellInfo(spell, playerName);
}

function displaySpellInfo(spell, playerName) {
    let levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
    let tags = [];
    if (spell.concentration) tags.push('Concentration');
    if (spell.ritual) tags.push('Ritual');
    let tagText = tags.length > 0 ? ` (${tags.join(', ')})` : '';
    
    let mechanics = '';
    if (spell.damage) {
        mechanics += `**Damage:** ${spell.damage}`;
        if (spell.damageType) mechanics += ` ${spell.damageType}`;
        mechanics += '\n';
    }
    if (spell.save) {
        mechanics += `**Save:** ${spell.save}`;
        if (spell.saveSuccess) mechanics += ` (${spell.saveSuccess})`;
        mechanics += '\n';
    }
    if (spell.aoe) {
        mechanics += `**Area:** ${spell.aoe}\n`;
    }
    if (spell.upcast) {
        mechanics += `**Higher Levels:** ${spell.upcast}\n`;
    }
    
    let effects = '';
    if (spell.fx) effects += `**Visual FX:** ${spell.fx}\n`;
    if (spell.audio) effects += `**Audio FX:** ${spell.audio}\n`;
    
    sendChat('Spell Database',
        `&{template:npcaction}{{rname=${spell.name}}}{{name=Spell Database}}{{description=**${levelText} ${spell.school}${tagText}**

**Casting Time:** ${spell.castingTime}
**Range:** ${spell.range}
**Components:** ${spell.components}
**Duration:** ${spell.duration}

${mechanics}${effects}**Description:** ${spell.description}
}}`
    );
}

function handleListSpells(args, playerName) {
    let filter = args[0] || '';
    let spells;
    
    if (filter) {
        if (filter.startsWith('level')) {
            let level = parseInt(filter.replace('level', ''), 10);
            spells = SpellDatabase.getSpellsByLevel(level);
        } else {
            spells = SpellDatabase.getSpellsBySchool(filter);
        }
    } else {
        spells = SpellDatabase.getAllSpells();
    }
    
    if (spells.length === 0) {
        sendChat('Spell Database', `/w "${playerName}" No spells found.`);
        return;
    }
    
    // Group by level
    let byLevel = {};
    spells.forEach(spell => {
        if (!byLevel[spell.level]) byLevel[spell.level] = [];
        byLevel[spell.level].push(spell.name);
    });
    
    let output = '**Spell List:**\n';
    Object.keys(byLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
        let levelText = level == 0 ? 'Cantrips' : `Level ${level}`;
        output += `**${levelText}:** ${byLevel[level].join(', ')}\n`;
    });
    
    sendChat('Spell Database', `/w "${playerName}" ${output}`);
}

function handleSearchSpells(query, playerName) {
    if (!query) {
        sendChat('Spell Database', `/w "${playerName}" Please specify search terms.`);
        return;
    }
    
    let results = SpellDatabase.getAllSpells().filter(spell =>
        spell.name.toLowerCase().includes(query.toLowerCase()) ||
        spell.description.toLowerCase().includes(query.toLowerCase()) ||
        spell.school.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length === 0) {
        sendChat('Spell Database', `/w "${playerName}" No spells found matching "${query}".`);
        return;
    }
    
    let output = `**Search Results for "${query}":**\n`;
    results.forEach(spell => {
        let levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
        output += `• **${spell.name}** (${levelText} ${spell.school})\n`;
    });
    
    sendChat('Spell Database', `/w "${playerName}" ${output}`);
}

function handleDeleteSpell(spellName, playerName) {
    if (!spellName) {
        sendChat('Spell Database', `/w "${playerName}" Please specify a spell name to delete.`);
        return;
    }
    
    let key = spellName.toLowerCase().replace(/\s+/g, '_');
    if (!SpellDatabase.spells[key]) {
        sendChat('Spell Database', `/w "${playerName}" Spell "${spellName}" not found.`);
        return;
    }
    
    delete SpellDatabase.spells[key];
    sendChat('Spell Database', `/w "${playerName}" Spell "${spellName}" deleted successfully.`);
}

function extractSpellName(content) {
    let match = content.match(/--name\s+"([^"]*?)"/);
    return match ? match[1] : '';
}

function showSpellHelp(playerName) {
    sendChat('Spell Database', `/w "${playerName}" **Spell Database Commands:**

• \`!spell add\` - Add a new spell (shows format)
• \`!spell edit --name "Spell Name" [parameters]\` - Edit existing spell
• \`!spell info "Spell Name"\` - Show spell details
• \`!spell list [level#/school]\` - List spells (optional filter)
• \`!spell search "keyword"\` - Search spells
• \`!spell delete "Spell Name"\` - Delete a spell
• \`!spell help\` - Show this help

**Examples:**
• \`!spell info "Magic Missile"\`
• \`!spell list level1\`
• \`!spell search fire\`
    `);
}

// Initialize with some basic spells
on('ready', function() {
    // Add some common spells to get started
    SpellDatabase.addSpell({
        name: "Magic Missile",
        level: 1,
        school: "Evocation",
        castingTime: "1 action",
        range: "120 feet",
        components: "V, S",
        duration: "Instantaneous",
        description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.",
        damage: "1d4+1",
        damageType: "force",
        upcast: "one additional dart per spell level above 1st",
        fx: "magic-missile",
        audio: "magic-whoosh"
    });
    
    SpellDatabase.addSpell({
        name: "Fireball",
        level: 3,
        school: "Evocation",
        castingTime: "1 action",
        range: "150 feet",
        components: "V, S, M (a tiny ball of bat guano and sulfur)",
        duration: "Instantaneous",
        description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.",
        damage: "8d6",
        damageType: "fire",
        save: "Dexterity",
        saveSuccess: "half damage",
        aoe: "20-foot radius sphere",
        upcast: "1d6 additional damage per spell level above 3rd",
        fx: "fire-explosion",
        audio: "fireball-boom"
    });
    
    SpellDatabase.addSpell({
        name: "Prestidigitation",
        level: 0,
        school: "Transmutation",
        castingTime: "1 action",
        range: "10 feet",
        components: "V, S",
        duration: "Up to 1 hour",
        description: "This spell is a minor magical trick that novice spellcasters use for practice. You create one of several magical effects within range.",
        fx: "sparkles",
        audio: "magic-chime"
    });
});

// Export functions for use by other scripts
function getSpellFromDatabase(spellName) {
    return SpellDatabase.getSpell(spellName);
}
