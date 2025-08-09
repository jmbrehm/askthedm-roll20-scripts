// filename: Protections.js
// Roll20 API script for adding/removing resistances and immunities to selected tokens
// Usage: Select one or more tokens, then run the macro (see Protections_macro.md)

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!protections')) return;
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Protections', '/w gm Please select one or more tokens to update protections.');
        return;
    }
    // Parse arguments
    let args = {};
    msg.content.split('--').slice(1).forEach(arg => {
        let [key, ...rest] = arg.trim().split(' ');
        args[key] = rest.join(' ');
    });
    let action = (args.action || '').toLowerCase(); // add or remove
    let type = (args.type || '').toLowerCase(); // resistance or immunity
    let dmg = (args.damage || '').toLowerCase(); // damage type
    if (!['add','remove'].includes(action) || !['resistance','immunity'].includes(type) || !dmg) {
        sendChat('Protections', '/w gm Invalid arguments.');
        return;
    }
    msg.selected.forEach(sel => {
        let token = getObj('graphic', sel._id);
        if (!token) return;
        let charId = token.get('represents');
        if (!charId) return;
        let isNPC = !!getAttrByName(charId, 'npc_challenge');
        let attrName = (type === 'resistance')
            ? (isNPC ? 'npc_resistances' : 'pc_resistances')
            : (isNPC ? 'npc_immunities' : 'pc_immunities');
        let attr = findObjs({type:'attribute', characterid:charId, name:attrName})[0];
        let current = attr ? (attr.get('current') || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
        if (action === 'add') {
            if (!current.includes(dmg)) current.push(dmg);
        } else {
            current = current.filter(x => x !== dmg);
        }
        if (attr) {
            attr.set('current', current.join(','));
        } else if (current.length > 0) {
            createObj('attribute', {
                characterid: charId,
                name: attrName,
                current: current.join(',')
            });
        }
    });
    sendChat('Protections', `/w gm Protections updated for selected tokens.`);
});
