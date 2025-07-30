// filename: experience_automation.js
// Automatic experience point calculation and distribution system

// Reference XP values from CR_ATTRIBUTE_REFERENCE in askthedm_CR_attribute_reference.js

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!xp')) return;

    // Parse command
    let args = msg.content.split(' ').slice(1);
    let command = args[0] || '';

    switch(command.toLowerCase()) {
        case 'award':
            handleXPAward(msg);
            break;
        case 'help':
            showXPHelp(msg.who);
            break;
        default:
            showXPHelp(msg.who);
    }
});

function handleXPAward(msg) {
    // Check if tokens are selected
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('XP System', `/w gm Please select tokens from the battlefield (both PCs and defeated enemies).`);
        sendChat('XP System', `**XP Award Failed:** No tokens selected.`);
        return;
    }

    let playerCharacters = [];
    let enemies = [];
    let totalXP = 0;

    // Process each selected token
    msg.selected.forEach(selected => {
        let token = getObj('graphic', selected._id);
        if (!token) return;

        let character = getObj('character', token.get('represents'));
        if (!character) return;

        // Check if this is a player character (has level attribute)
        if (isPlayerCharacter(character)) {
            playerCharacters.push({
                token: token,
                character: character,
                name: token.get('name') || character.get('name') || 'Unknown PC'
            });
        } 
        // Check if this is an enemy (has npc_challenge attribute)
        else if (isEnemy(character)) {
            let cr = getEnemyCR(character);
            let xpValue = getXPFromCR(cr);
            
            enemies.push({
                token: token,
                character: character,
                name: token.get('name') || character.get('name') || 'Unknown Enemy',
                cr: cr,
                xp: xpValue
            });
            
            totalXP += xpValue;
        }
    });

    // Validate we have both PCs and enemies
    if (playerCharacters.length === 0) {
        sendChat('XP System', `/w gm No player characters found in selection. Make sure PC tokens have a 'level' attribute.`);
        sendChat('XP System', `**XP Award Failed:** No player characters found in selection.`);
        return;
    }

    if (enemies.length === 0) {
        sendChat('XP System', `/w gm No enemies found in selection. Make sure enemy tokens have an 'npc_challenge' attribute.`);
        sendChat('XP System', `**XP Award Failed:** No enemies found in selection.`);
        return;
    }

    // Calculate XP per player (rounded down)
    let xpPerPlayer = Math.floor(totalXP / playerCharacters.length);

    // Award XP to each player character
    let awardResults = [];
    playerCharacters.forEach(pc => {
        let result = awardExperienceToCharacter(pc.character, xpPerPlayer, pc.name);
        awardResults.push(result);
    });

    // Generate summary report
    generateXPReport(enemies, playerCharacters, totalXP, xpPerPlayer, awardResults, msg.who);
}

function isPlayerCharacter(character) {
    // Check if character has any of the PC level attributes
    let levelAttrNames = ['level', 'character_level', 'total_level', 'base_level'];
    
    for (let attrName of levelAttrNames) {
        let levelAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
        if (levelAttr) {
            let level = parseInt(levelAttr.get('current'), 10);
            if (level && level > 0 && level <= 20) {
                return true;
            }
        }
    }
    
    return false;
}

function isEnemy(character) {
    // Check if character has npc_challenge attribute (same as loot_generator.js)
    let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
    if (!crAttr) return false;
    let crVal = crAttr.get('current');
    // If attribute exists and is not empty, treat as enemy
    return crVal !== undefined && crVal !== null && crVal !== '';
}

function getEnemyCR(character) {
    // Use same CR reading logic as loot_generator.js
    let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
    if (!crAttr) return 0;
    let crValue = crAttr.get('current');
    if (crValue === '1/8') return 0.125;
    if (crValue === '1/4') return 0.25;
    if (crValue === '1/2') return 0.5;
    let cr = parseFloat(crValue);
    if (isNaN(cr)) cr = 0;
    return cr;
}

function getXPFromCR(cr) {
    // Look up XP value from CR_ATTRIBUTE_REFERENCE
    if (typeof globalThis.CR_ATTRIBUTE_REFERENCE !== 'undefined') {
        // Try string and numeric keys for CR
        let crKey = cr.toString();
        if (globalThis.CR_ATTRIBUTE_REFERENCE[crKey] && globalThis.CR_ATTRIBUTE_REFERENCE[crKey].xp) {
            return globalThis.CR_ATTRIBUTE_REFERENCE[crKey].xp;
        }
    }
    return 0;
}

function awardExperienceToCharacter(character, xpAmount, characterName) {
    // Look for existing experience attribute
    let xpAttrNames = ['experience', 'exp', 'xp', 'experience_points'];
    let xpAttr = null;
    
    for (let attrName of xpAttrNames) {
        xpAttr = findObjs({type:'attribute', characterid:character.id, name:attrName})[0];
        if (xpAttr) break;
    }
    
    let oldXP = 0;
    let newXP = xpAmount;
    
    if (xpAttr) {
        // Existing experience attribute found
        oldXP = parseInt(xpAttr.get('current'), 10) || 0;
        newXP = oldXP + xpAmount;
        xpAttr.set('current', newXP);
    } else {
        // No experience attribute found, create one
        createObj('attribute', {
            characterid: character.id,
            name: 'experience',
            current: xpAmount,
            max: ''
        });
        oldXP = 0;
        newXP = xpAmount;
    }
    
    return {
        name: characterName,
        oldXP: oldXP,
        newXP: newXP,
        awarded: xpAmount
    };
}

function generateXPReport(enemies, playerCharacters, totalXP, xpPerPlayer, awardResults, playerName) {
    let enemyList = enemies.map(enemy => 
        `• ${enemy.name} (CR ${enemy.cr}): ${enemy.xp} XP`
    ).join('\n');
    
    let playerList = awardResults.map(result => 
        `• ${result.name}: ${result.oldXP} → ${result.newXP} (+${result.awarded} XP)`
    ).join('\n');
    
    let report = `**Experience Award Summary**

**Defeated Enemies:**
${enemyList}

**Total XP Earned:** ${totalXP}
**Players in Battle:** ${playerCharacters.length}
**XP per Player:** ${xpPerPlayer}

**Experience Awarded:**
${playerList}`;

    sendChat('XP System', `/w "${playerName}" ${report}`);
    
    // Also send a simplified version to all players
    sendChat('XP System', 
        `**Battle Complete!** ${totalXP} total XP divided among ${playerCharacters.length} players. Each player gains ${xpPerPlayer} XP!`
    );
}

function showXPHelp(playerName) {
    sendChat('XP System', `/w "${playerName}" **Experience Point System Commands:**

• \`!xp award\` - Calculate and award XP from selected tokens
• \`!xp help\` - Show this help

**Usage:**
1. Select all tokens from the battle (both PCs and defeated enemies)
2. Use: \`!xp award\`
3. Script automatically calculates total XP and distributes it evenly

**Token Requirements:**
• **Player Characters:** Must have a 'level' attribute
• **Enemies:** Must have an 'npc_challenge' attribute (CR value)

**Features:**
• Automatic PC/Enemy detection based on attributes
• XP calculation based on official D&D 5e CR-to-XP table
• Even distribution among all participating PCs
• Automatic experience attribute creation if needed
• Detailed battle summary with before/after XP totals

**Experience Attribute:**
The script will look for existing XP attributes in this order:
1. 'experience'
2. 'exp' 
3. 'xp'
4. 'experience_points'

If none exist, it creates a new 'experience' attribute.`);
}
