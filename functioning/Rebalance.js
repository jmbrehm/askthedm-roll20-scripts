on('ready', function() {
            log('askthedm - Rebalance.js - Loaded (version 2.0)');
        });

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
        // Reference CR stats from globalThis.CR_ATTRIBUTE_REFERENCE
        if (typeof globalThis.CR_ATTRIBUTE_REFERENCE === 'undefined' || !globalThis.CR_ATTRIBUTE_REFERENCE.hasOwnProperty(newCR)) {
            sendChat('Rebalance', `/w gm Invalid CR: ${newCR}`);
            return;
        }
        let newStats = globalThis.CR_ATTRIBUTE_REFERENCE[newCR];
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
            // Set Bar 1 value and max to a random HP within the CR's range
            let minHP = newStats.hp[0];
            let maxHP = newStats.hp[1];
            let rolledHP = Math.floor(Math.random() * (maxHP - minHP + 1)) + minHP;
            token.set('bar1_value', rolledHP);
            token.set('bar1_max', rolledHP);
        });
    }
});
