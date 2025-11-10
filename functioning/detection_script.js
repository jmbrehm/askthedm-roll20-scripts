
// askTheDM - detection_script.js - Overhauled version
on('ready', function() {
    log('askthedm - detection_script.js - loaded (v3.1)');
});

// Overhauled detection script with blank description support, difficulty in whisper, and inspo reroll handling
const DETECTION_DIFFICULTIES = {
    'easy':    { dc: 10, title: 'What was that?!?' },
    'moderate':{ dc: 15, title: 'Did you see that?!?' },
    'hard':    { dc: 20, title: "I've got a bad feeling about this..." },
    'deadly':  { dc: 25, title: 'Something seems off here...' }
};

function getPlayerForCharacter(charId) {
    let controllers = (getObj('character', charId).get('controlledby') || '').split(',');
    for (let c of controllers) {
        if (c && c !== 'all') {
            let player = getObj('player', c);
            if (player) return player.get('displayname');
        }
    }
    return null;
}

function runDetection({msg, description, difficulty, selected}) {
    // Default description if blank
    if (!description) description = 'something';
    if (!DETECTION_DIFFICULTIES[difficulty]) {
        sendChat('Detection', `/w "${msg.who}" Invalid or missing difficulty. Use: easy, moderate, hard, or deadly`);
        return;
    }
    if (!selected || selected.length === 0) {
        sendChat('Detection', `/w "${msg.who}" Please select one or more tokens to make the detection check.`);
        return;
    }
    let difficultyData = DETECTION_DIFFICULTIES[difficulty];
    let dc = difficultyData.dc;
    let dmSummary = [];


    selected.forEach(sel => {
        let token = getObj('graphic', sel._id);
        if (!token) return;
        let charId = token.get('represents');
        if (!charId) return;
        let character = getObj('character', charId);
        if (!character) return;
        let tokenName = token.get('name') || character.get('name') || 'Unknown';

        // Get perception bonus
        let perceptionAttr = findObjs({type:'attribute', characterid:charId, name:'perception_bonus'})[0];
        let perceptionBonus = perceptionAttr ? parseInt(perceptionAttr.get('current'), 10) : 0;

    // Get advantage toggle and match specific template tokens for normal/advantage/disadvantage
    let advAttr = findObjs({type:'attribute', characterid:charId, name:'advantagetoggle'})[0];
    let advStateRaw = advAttr ? (advAttr.get('current') || '') : '';
    let advState = advStateRaw.toLowerCase();
    let rollType = 'normal';
    // Match explicit template tokens like {{advantage=1}}, {{disadvantage=1}}, {{normal=1}}
    // Use the raw string for regex matching to preserve braces and spacing.
    if (/\{\{\s*advantage\s*=\s*1\s*\}\}/i.test(advStateRaw)) rollType = 'advantage';
    else if (/\{\{\s*disadvantage\s*=\s*1\s*\}\}/i.test(advStateRaw)) rollType = 'disadvantage';
    else if (/\{\{\s*normal\s*=\s*1\s*\}\}/i.test(advStateRaw)) rollType = 'normal';

        // Get global_skill_mod and parse dice/numeric modifiers using improved regex
        let globalSkillAttr = findObjs({type:'attribute', characterid:charId, name:'global_skill_mod'})[0];
        let globalSkillStr = globalSkillAttr ? globalSkillAttr.get('current') : '';
        let modTotal = 0;
        let modParts = [];
        if (globalSkillStr) {
            // Extract all dice expressions and flat bonuses before a label [NAME]
            let gmodRegex = /([+-]?\d+d\d+|[+-]?\d+)(?=\[)/g;
            let match;
            while ((match = gmodRegex.exec(globalSkillStr)) !== null) {
                let expr = match[1];
                if (/d/.test(expr)) {
                    // Dice expression
                    let diceMatch = expr.match(/([+-]?)(\d+)d(\d+)/);
                    let sign = diceMatch[1] === '-' ? -1 : 1;
                    let num = parseInt(diceMatch[2], 10);
                    let sides = parseInt(diceMatch[3], 10);
                    let rolls = [];
                    for (let i = 0; i < num; i++) {
                        let val = randomInteger(sides) * sign;
                        rolls.push(val);
                        modTotal += val;
                    }
                    modParts.push(rolls.join('+'));
                } else {
                    // Flat number
                    let flat = parseInt(expr, 10);
                    if (!isNaN(flat)) {
                        modTotal += flat;
                        modParts.push(flat);
                    }
                }
            }
        }

        // Roll d20s
        let d20a = randomInteger(20);
        let d20b = randomInteger(20);
        let d20Result = d20a;
        let d20Detail = '';
        if (rollType === 'normal') {
            d20Result = d20a;
            d20Detail = `${d20a}`;
        } else if (rollType === 'advantage') {
            d20Result = Math.max(d20a, d20b);
            d20Detail = `${d20a}/${d20b}`;
        } else if (rollType === 'disadvantage') {
            d20Result = Math.min(d20a, d20b);
            d20Detail = `${d20a}/${d20b}`;
        }

        // Build modifier string: +perception_bonus+modParts
        let modString = `+${perceptionBonus}`;
        if (modParts.length > 0) {
            modString += '+' + modParts.join('+');
        }

        // Final total
        let total = d20Result + perceptionBonus + modTotal;
        let passive = 10 + perceptionBonus;
        let result = Math.max(passive, total);
        let passed = result >= dc;

    // Check for inspiration (on = available, 0 = none)
    let inspAttr = findObjs({type:'attribute', characterid:charId, name:'inspiration'})[0];
    let hasInspiration = inspAttr && (inspAttr.get('current') === 'on' || inspAttr.get('current') === '1' || inspAttr.get('current') === 1);

        
        // Build output strings (we create separate, shorter lines for pass vs fail per user request)
        let rollLabel = rollType;
        let diffLabel = difficulty; // still available for DM summary but removed from player whispers

        // For pass whispers: remove the difficulty label but keep roll type and perception info
        let perceptionLineForPass = '';
        if (result === passive) {
            perceptionLineForPass = `(${rollLabel} - perception: ${result} (passive high))`;
        } else {
            let rollBreakdown = `${d20Detail} ${modString}`;
            perceptionLineForPass = `(${rollLabel} - perception: ${result} (${rollBreakdown}))`;
        }

        // For failure whispers when the character has inspiration: remove difficulty, keep roll type and result
        let perceptionLineForFailInspo = '';
        if (result === passive) {
            perceptionLineForFailInspo = `(${rollLabel} - perception: ${result} (passive high))`;
        } else {
            // keep only roll type and final result (no detailed breakdown)
            perceptionLineForFailInspo = `(${rollLabel} - perception: ${result})`;
        }

        // Build whisper message
        let whisperTo = getPlayerForCharacter(charId);
        let message = '';
        if (passed) {
            // Pass: send the shorter message without difficulty
            message = `${perceptionLineForPass} You've noticed "${description}" and you're not certain whether the others have seen it.`;
            if (whisperTo) {
                sendChat('Perception', `/w "${whisperTo}" ${message}`);
            }
        } else {
            // Fail: only whisper if they have inspiration; message removes difficulty, keeps roll type/result
            if (hasInspiration && whisperTo) {
                message = `${perceptionLineForFailInspo} You may have missed something; but could use inspiration to look again`;
                sendChat('Perception', `/w "${whisperTo}" ${message}`);
            }
        }

    // Add to DM summary (just PASS/FAIL and roll total)
    let status = passed ? 'PASS' : 'FAIL';
    dmSummary.push(`${tokenName}: ${status} (${result})`);
    });

    // DM summary output
    let summary = `&{template:npcaction}{{rname=Perception for ${description} [DC: ${dc}]}}{{description=${dmSummary.join('<br>')}}}`;
    sendChat('Perception', `/w gm ${summary}`);
}

on('chat:message', function(msg) {
    if (msg.type !== 'api') return;

    // Standard detection: !detect "desc" --difficulty hard
    if (msg.content.startsWith('!detect')) {
        let input = msg.content.replace('!detect', '').trim();
        let descMatch = input.match(/^"([^"]+)"/);
        let description = descMatch ? descMatch[1] : '';
        let diffMatch = input.match(/--difficulty\s+(easy|moderate|hard|deadly)/i);
        let difficulty = diffMatch ? diffMatch[1].toLowerCase() : '';
        runDetection({msg, description, difficulty, selected: msg.selected, isInspoReroll: false});
    }

});
