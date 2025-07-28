on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!rebalance')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Rebalance', `/w gm Please select one or more monster tokens.`);
        return;
    }
    // Prompt for desired CR removed as macro now handles input
    // If macro args are present, process rebalance
    if (msg.content.includes('--cr')) {
        let args = {};
        msg.content.split('--').slice(1).forEach(arg => {
            let [key, ...rest] = arg.trim().split(' ');
            args[key] = rest.join(' ');
        });
        let newCR = args.cr.trim();
        // Reference table (copy from MonsterAttack.js)
        const CR_EXPECTED_STATS = {
          '0': { ac: 13, hp: [1, 6] },
          '1/8': { ac: 13, hp: [7, 35] },
          '1/4': { ac: 13, hp: [36, 49] },
          '1/2': { ac: 13, hp: [50, 70] },
          '1': { ac: 13, hp: [71, 85] },
          '2': { ac: 13, hp: [86, 100] },
          '3': { ac: 13, hp: [101, 115] },
          '4': { ac: 14, hp: [116, 130] },
          '5': { ac: 15, hp: [131, 145] },
          '6': { ac: 15, hp: [146, 160] },
          '7': { ac: 15, hp: [161, 175] },
          '8': { ac: 16, hp: [176, 190] },
          '9': { ac: 16, hp: [191, 205] },
          '10': { ac: 17, hp: [206, 220] },
          '11': { ac: 17, hp: [221, 235] },
          '12': { ac: 17, hp: [236, 250] },
          '13': { ac: 18, hp: [251, 265] },
          '14': { ac: 18, hp: [266, 280] },
          '15': { ac: 18, hp: [281, 295] },
          '16': { ac: 18, hp: [296, 310] },
          '17': { ac: 19, hp: [311, 325] },
          '18': { ac: 19, hp: [326, 340] },
          '19': { ac: 19, hp: [341, 355] },
          '20': { ac: 19, hp: [356, 400] },
          '21': { ac: 19, hp: [401, 445] },
          '22': { ac: 19, hp: [446, 490] },
          '23': { ac: 19, hp: [491, 535] },
          '24': { ac: 19, hp: [536, 580] },
          '25': { ac: 19, hp: [581, 625] },
          '26': { ac: 19, hp: [626, 670] },
          '27': { ac: 19, hp: [671, 715] },
          '28': { ac: 19, hp: [716, 760] },
          '29': { ac: 19, hp: [761, 805] },
          '30': { ac: 19, hp: [806, 850] }
        };
        if (!CR_EXPECTED_STATS.hasOwnProperty(newCR)) {
            sendChat('Rebalance', `/w gm Invalid CR: ${newCR}`);
            return;
        }
        let newStats = CR_EXPECTED_STATS[newCR];
        msg.selected.forEach(sel => {
            let token = getObj('graphic', sel._id);
            if (!token) return;
            let character = getObj('character', token.get('represents'));
            if (!character) return;
            // Only edit if npc_challenge attribute exists
            let crAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_challenge'})[0];
            if (!crAttr) return; // skip player tokens or non-NPCs
            crAttr.set('current', newCR);
            // Set npc_ac
            let acAttr = findObjs({type:'attribute', characterid:character.id, name:'npc_ac'})[0];
            if (acAttr) acAttr.set('current', newStats.ac);
            else createObj('attribute', {name:'npc_ac', characterid:character.id, current:newStats.ac});
            // Set Bar 1 value and max to new max HP
            let maxHP = newStats.hp[1];
            token.set('bar1_value', maxHP);
            token.set('bar1_max', maxHP);
        });
    }
});
