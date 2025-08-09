// Roll20 API Script: Initiative Automation (Selected Tokens Only)
// Usage: !combat
// 1. Checks the campaign initiativepage property. If false, sets it to true to open the turn tracker.
// 2. Rolls initiative for all selected tokens and adds them to the turn order.

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !/^!combat(\s|$)/i.test(msg.content)) return;

    // 1. If the turn tracker is not open, whisper the GM and exit
    if (!Campaign().get('initiativepage')) {
        sendChat('Initiative Script', '/w gm Open the Turn Tracker and add selected tokens first with ctrl+u');
        return;
    }

    // 2. Ensure tokens are selected
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('Initiative Script', '/w gm No tokens selected. Please select all tokens to include in initiative before running !combat.');
        return;
    }

    // 3. Get current turn order (if any)
    let currentTurnorder = Campaign().get('turnorder');
    let turnorder = [];
    if (currentTurnorder && currentTurnorder !== '') {
        try {
            turnorder = JSON.parse(currentTurnorder);
        } catch (e) {
            turnorder = [];
        }
    }

    // 4. Roll initiative and update pr for each selected token (only if already in turn order)
    let chatResults = [];
    msg.selected.forEach(sel => {
        let token = getObj('graphic', sel._id);
        if (!token) return;

        let charId = token.get('represents');
        let character = charId ? getObj('character', charId) : null;
        // Use token thumbnail for display
        let thumbUrl = token.get('imgsrc');
        if (thumbUrl) {
            thumbUrl = thumbUrl.replace(/(med|original)\.png$/, 'thumb.png');
        }
        let displayName = token.get('name') || (character ? character.get('name') : 'Unknown');

        // Get initiative_bonus
        let initBonusAttr = character ? findObjs({ type: 'attribute', characterid: charId, name: 'initiative_bonus' })[0] : null;
        let initBonus = initBonusAttr ? parseInt(initBonusAttr.get('current'), 10) || 0 : 0;

        // Get dexterity
        let dexAttr = character ? findObjs({ type: 'attribute', characterid: charId, name: 'dexterity' })[0] : null;
        let dex = dexAttr ? parseInt(dexAttr.get('current'), 10) || 0 : 0;

        // Check for initiative_style
        let styleAttr = character ? findObjs({ type: 'attribute', characterid: charId, name: 'initiative_style' })[0] : null;
        let styleVal = styleAttr ? String(styleAttr.get('current')).replace(/\s/g, '') : '';
        let hasAdv = (styleVal === '{@{d20},@{d20}}kh1');

        // Roll dice
        let roll1 = randomInteger(20);
        let roll2 = hasAdv ? randomInteger(20) : null;
        let d20 = hasAdv ? Math.max(roll1, roll2) : roll1;
        let initiative = d20 + initBonus + (dex * 0.01);

        // Build chat display
        let imgTag = thumbUrl ? `<img src=\"${thumbUrl}\" width=\"30\" height=\"30\" style=\"vertical-align:middle;border:1px solid #888;border-radius:4px;margin-right:4px;\" title=\"${displayName}\"/>` : '';
        // Style for the number/roll box
        let boxStyle = 'display:inline-block;padding:2px 6px;margin-left:2px;margin-right:2px;border:1px solid #888;border-radius:4px;background:#f8f8f8;font-size:14px;vertical-align:middle;';
        let rollDisplay = hasAdv
            ? `<span style=\"${boxStyle}\"><b>${initiative.toFixed(2)}</b> (${roll1}, ${roll2}) (advantage)</span>`
            : `<span style=\"${boxStyle}\"><b>${initiative.toFixed(2)}</b> (${roll1})</span>`;
        chatResults.push(`${imgTag} ${rollDisplay}`);

        // Update pr for matching token id (only if already in turn order)
        let entry = turnorder.find(entry => entry.id === token.id);
        if (entry) {
            entry.pr = initiative;
        }
    });

    // 5. Sort the turn order descending by pr (initiative)
    turnorder.sort((a, b) => (b.pr || 0) - (a.pr || 0));

    // 6. Set the updated turn order
    Campaign().set('turnorder', JSON.stringify(turnorder));

    // 7. Output chat results
    if (chatResults.length > 0) {
        sendChat('COMBAT!', '<br>' + chatResults.join('<br>'));
    }
});

