on('ready', function() {
    log('askthedm - detection_script.js - Loaded (version 2.0)');
});
// filename: detection_script.js
on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!detect')) return;

    // Parse arguments
    let args = msg.content.split(' ').slice(1);
    let difficulty = args[0] ? args[0].toLowerCase() : '';

    // Define difficulty settings
    const difficulties = {
        'easy': {
            dc: 10,
            title: 'What was that?!?'
        },
        'moderate': {
            dc: 15,
            title: 'Did you see that?!?'
        },
        'hard': {
            dc: 20,
            title: "I've got a bad feeling about this..."
        },
        'deadly': {
            dc: 25,
            title: 'Something seems off here...'
        }
    };

    // Validate difficulty
    if (!difficulties[difficulty]) {
        sendChat('Detection', `/w "${msg.who}" Invalid difficulty. Use: easy, moderate, hard, or deadly`);
        return;
    }

    // Check if tokens are selected
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Detection', `/w "${msg.who}" Please select one or more tokens to make the detection check.`);
        return;
    }

    let difficultyData = difficulties[difficulty];

    // Process each selected token
    msg.selected.forEach((selected, index) => {
        let token = getObj('graphic', selected._id);
        if (!token) {
            sendChat('Detection', `/w "${msg.who}" Invalid token selected (skipping).`);
            return;
        }

        let character = getObj('character', token.get('represents'));
        if (!character) {
            sendChat('Detection', `/w "${msg.who}" Token "${token.get('name')}" must represent a character (skipping).`);
            return;
        }

        let tokenName = token.get('name') || character.get('name') || 'Unknown';

        // Get perception bonus
        let perceptionAttr = findObjs({
            type: 'attribute',
            characterid: character.id,
            name: 'perception_bonus'
        })[0];
        
        let perceptionBonus = perceptionAttr ? parseInt(perceptionAttr.get('current'), 10) : 0;

        // Send the detection check message for this token
        sendChat('Detection Check', 
            `&{template:npcaction}{{rname=${difficultyData.title}}}{{name=${tokenName}}}{{description=Perception Check **DC ${difficultyData.dc}**

Passive: [[10+${perceptionBonus}]]

Check Result: [[1d20+${perceptionBonus}]] [inspo?](~selected|perception)
}}`
        );
    });
});
