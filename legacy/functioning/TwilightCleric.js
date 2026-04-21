on('ready', function() {
    log('askthedm - TwilightCleric.js - Loaded (version 2.0)');
});
// (Token marker and all references to flying-flag removed by user request. The aura is now the only visual indicator for Twilight Sanctuary range.)
// Helper: get distance between two tokens (in feet, using page scale)
function getDistanceBetweenTokens(tokenA, tokenB) {
    if (tokenA.get('pageid') !== tokenB.get('pageid')) return Infinity;
    var x1 = tokenA.get('left'), y1 = tokenA.get('top');
    var x2 = tokenB.get('left'), y2 = tokenB.get('top');
    var page = getObj('page', tokenA.get('pageid'));
    var scale = page ? (page.get('scale_number') || 5) : 5;
    var pixelsPerUnit = 70; // Roll20 default
    var dist = Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2)) / pixelsPerUnit * scale;
    return dist;
}
// --- Twilight Sanctuary End-of-Turn Automation ---
// Listen for turn order changes to trigger temp HP logic
on('change:campaign:turnorder', function(campaign, prev) {
    // Apply temp HP at the END of a token's turn (when the turn passes to the next token)
    if (!prev || !prev.turnorder) return;
    var prevOrder;
    try { prevOrder = JSON.parse(prev.turnorder); } catch (e) { return; }
    if (!Array.isArray(prevOrder) || prevOrder.length === 0) return;
    var prevTokenId = prevOrder[0] && prevOrder[0].id;
    if (!prevTokenId) return;
    var token = getObj('graphic', prevTokenId);
    if (!token) return;
    var charId = token.get('represents');
    if (!charId) return;
    // Only proceed if this token is a sanctuary target
    var tgtAttr = findObjs({type:'attribute', characterid:charId, name:'twilight_sanctuary_target'})[0];
    if (!tgtAttr || String(tgtAttr.get('current')).toLowerCase() !== 'true') return;
    // Find all clerics with sanctuary active on the same page
    var allTokens = findObjs({type:'graphic', subtype:'token', pageid: token.get('pageid')});
    var clerics = allTokens.filter(t => {
        var cid = t.get('represents');
        if (!cid) return false;
        var tsAttr = findObjs({type:'attribute', characterid:cid, name:'twilight_sanctuary'})[0];
        return tsAttr && String(tsAttr.get('current')).toLowerCase() === 'true';
    });
    // Find the closest cleric within 30ft
    var inRangeClerics = clerics.filter(cleric => getDistanceBetweenTokens(token, cleric) <= 30);
    if (inRangeClerics.length === 0) {
        // Out of range, do not grant or update temp HP
        return;
    }
    // Use the closest cleric for temp HP calculation
    var cleric = inRangeClerics.sort((a,b) => getDistanceBetweenTokens(token,a)-getDistanceBetweenTokens(token,b))[0];
    var clericCharId = cleric.get('represents');
    // Get cleric level (try 'level' or 'class_level' attribute)
    var levelAttr = findObjs({type:'attribute', characterid:clericCharId, name:'level'})[0] ||
                   findObjs({type:'attribute', characterid:clericCharId, name:'class_level'})[0];
    var clericLevel = levelAttr ? parseInt(levelAttr.get('current'),10) || 1 : 1;
    // Roll 1d6 + cleric level
    var tempHp = randomInteger(6) + clericLevel;
    // Get current hp_temp
    var hpTempAttr = findObjs({type:'attribute', characterid:charId, name:'hp_temp'})[0];
    var currentHpTemp = hpTempAttr ? parseInt(hpTempAttr.get('current'),10) || 0 : 0;
    if (tempHp > currentHpTemp) {
        if (!hpTempAttr) {
            hpTempAttr = createObj('attribute', {name:'hp_temp', current: tempHp, characterid: charId});
        } else {
            hpTempAttr.set('current', tempHp);
        }
        sendChat('TwilightCleric', `/w gm ${token.get('name')||''} gains ${tempHp} temp HP from Twilight Sanctuary (previous: ${currentHpTemp}).`);
    } else {
        sendChat('TwilightCleric', `/w gm ${token.get('name')||''} keeps ${currentHpTemp} temp HP from Twilight Sanctuary (rolled: ${tempHp}).`);
    }
});
// filename: TwilightCleric.js
// Roll20 API Script for automating Twilight Cleric features
// Features to automate:
// - Eyes of Night (toggle vision for selected tokens)
// - Vigilant Blessing (mark a token for advantage on initiative)
// - Twilight Sanctuary (aura, temp HP, and marker automation)
//
// Usage: Macros will call API commands like !twilight eyes, !twilight vigilant, !twilight sanctuary, etc.
// See TwilightCleric_macro.md for macro examples and usage.

// --- Script skeleton, to be expanded ---


// Use global DarkvisionBySpecies reference
var DarkvisionBySpecies = globalThis.DarkvisionBySpecies || {};

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.content.startsWith('!twilight')) return;
    var args = msg.content.split(' ');
    var command = args[1] || '';
    switch(command) {
        case 'eyes':
            handleEyesOfNight(msg);
            break;
        case 'vigilant':
            handleVigilantBlessing(msg);
            break;
// Toggle Vigilant Blessing for selected tokens
function handleVigilantBlessing(msg) {
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('TwilightCleric', '/w gm No token selected.');
        return;
    }
    msg.selected.forEach(function(sel) {
        var token = getObj('graphic', sel._id);
        if (!token) return;
        var charId = token.get('represents');
        if (!charId) {
            sendChat('TwilightCleric', `/w gm Token ${token.get('name')||''} does not represent a character.`);
            return;
        }
        // Get or create vigilant_blessing attribute
        var vbAttr = findObjs({type:'attribute', characterid:charId, name:'vigilant_blessing'})[0];
        if (!vbAttr) {
            vbAttr = createObj('attribute', {name:'vigilant_blessing', current:'false', characterid:charId});
        }
        var vbVal = String(vbAttr.get('current')).toLowerCase();
        // Get or create initiative_style attribute
        var styleAttr = findObjs({type:'attribute', characterid:charId, name:'initiative_style'})[0];
        if (!styleAttr) {
            styleAttr = createObj('attribute', {name:'initiative_style', current:'@{d20}', characterid:charId});
        }
        if (vbVal === 'true') {
            // Deactivate Vigilant Blessing
            vbAttr.set('current','false');
            styleAttr.set('current','@{d20}');
            sendChat('TwilightCleric', `/w gm Vigilant Blessing deactivated for ${token.get('name')||''}. Initiative rolls are normal.`);
        } else {
            // Activate Vigilant Blessing
            vbAttr.set('current','true');
            styleAttr.set('current','{@{d20},@{d20}}kh1');
            sendChat('TwilightCleric', `/w gm Vigilant Blessing activated for ${token.get('name')||''}. Initiative will be rolled with advantage.`);
        }
    });
}
        case 'sanctuary':
            handleTwilightSanctuary(msg);
            break;
        case 'sanctuary_target':
            handleTwilightSanctuaryTarget(msg);
            break;
// Activate or deactivate Twilight Sanctuary for the cleric
function handleTwilightSanctuary(msg) {
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('TwilightCleric', '/w gm No token selected.');
        return;
    }
    var clericToken = getObj('graphic', msg.selected[0]._id);
    if (!clericToken) return;
    var charId = clericToken.get('represents');
    if (!charId) {
        sendChat('TwilightCleric', `/w gm Token ${clericToken.get('name')||''} does not represent a character.`);
        return;
    }
    // Get or create twilight_sanctuary attribute
    var tsAttr = findObjs({type:'attribute', characterid:charId, name:'twilight_sanctuary'})[0];
    if (!tsAttr) {
        tsAttr = createObj('attribute', {name:'twilight_sanctuary', current:'false', characterid:charId});
    }
    var tsVal = String(tsAttr.get('current')).toLowerCase();
    if (tsVal === 'true') {
        // Deactivate
        tsAttr.set('current','false');
        clericToken.set({
            statusmarkers: clericToken.get('statusmarkers').replace(/sparkle-charm/g, ''),
            aura1_radius: '',
            aura1_color: '',
            aura1_square: false
        });
        sendChat('TwilightCleric', `/w gm Twilight Sanctuary deactivated for ${clericToken.get('name')||''}.`);
    } else {
        // Activate
        tsAttr.set('current','true');
        var markers = clericToken.get('statusmarkers') || '';
        if (!markers.includes('sparkle-charm')) {
            markers = markers ? markers + ',sparkle-charm' : 'sparkle-charm';
            clericToken.set({statusmarkers: markers});
        }
        clericToken.set({
            aura1_radius: '30',
            aura1_color: '#674ea7',
            aura1_square: false
        });
        var tgtAttr = findObjs({type:'attribute', characterid:charId, name:'twilight_sanctuary_target'})[0];
        if (!tgtAttr) {
            tgtAttr = createObj('attribute', {name:'twilight_sanctuary_target', current:'true', characterid:charId});
        } else {
            tgtAttr.set('current','true');
        }
        sendChat('TwilightCleric', `/w gm Twilight Sanctuary activated for ${clericToken.get('name')||''}.`);
    }
    // No marker update needed; marker logic removed.

// (Persistent VFX for Twilight Sanctuary removed by user request)
}

// Toggle twilight_sanctuary_target for selected tokens
function handleTwilightSanctuaryTarget(msg) {
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('TwilightCleric', '/w gm No token selected.');
        return;
    }
    msg.selected.forEach(function(sel) {
        var token = getObj('graphic', sel._id);
        if (!token) return;
        var charId = token.get('represents');
        if (!charId) return;
        var tgtAttr = findObjs({type:'attribute', characterid:charId, name:'twilight_sanctuary_target'})[0];
        if (!tgtAttr) {
            tgtAttr = createObj('attribute', {name:'twilight_sanctuary_target', current:'true', characterid:charId});
            sendChat('TwilightCleric', `/w gm Twilight Sanctuary target set for ${token.get('name')||''}.`);
        } else {
            var val = String(tgtAttr.get('current')).toLowerCase();
            if (val === 'true') {
                tgtAttr.set('current','false');
                sendChat('TwilightCleric', `/w gm Twilight Sanctuary target removed from ${token.get('name')||''}.`);
            } else {
                tgtAttr.set('current','true');
                sendChat('TwilightCleric', `/w gm Twilight Sanctuary target set for ${token.get('name')||''}.`);
            }
        }
    });
    // No marker update needed; marker logic removed.
}

// (All token marker logic fully removed. No marker adjustment is performed by this script.)

// Helper: get distance between two tokens (in feet, using page scale)
function getDistanceBetweenTokens(tokenA, tokenB) {
    if (tokenA.get('pageid') !== tokenB.get('pageid')) return Infinity;
    var x1 = tokenA.get('left'), y1 = tokenA.get('top');
    var x2 = tokenB.get('left'), y2 = tokenB.get('top');
    var page = getObj('page', tokenA.get('pageid'));
    var scale = page ? (page.get('scale_number') || 5) : 5;
    var pixelsPerUnit = 70; // Roll20 default
    var dist = Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2)) / pixelsPerUnit * scale;
    return dist;
}
        case 'eyes_activate':
            // Internal API button: activate Eyes of Night
            handleEyesOfNightActivate(msg);
            break;
        default:
            sendChat('TwilightCleric', '/w gm Usage: !twilight [eyes|vigilant|sanctuary]');
    }
});

function handleEyesOfNight(msg) {
    if (!msg.selected || msg.selected.length === 0) {
        sendChat('TwilightCleric', '/w gm No token selected.');
        return;
    }
    msg.selected.forEach(function(sel) {
        var token = getObj('graphic', sel._id);
        if (!token) return;
        var charId = token.get('represents');
        if (!charId) {
            sendChat('TwilightCleric', `/w gm Token ${token.get('name')||''} does not represent a character.`);
            return;
        }
        var attr = findObjs({type:'attribute', characterid:charId, name:'eyes_of_night'})[0];
        if (!attr) {
            attr = createObj('attribute', {name:'eyes_of_night', current:'false', characterid:charId});
        }
        var val = String(attr.get('current')).toLowerCase();
        if (val === 'true') {
            // Deactivate Eyes of Night
            attr.set('current','false');
            restoreDefaultVision(token, charId);
            sendChat('TwilightCleric', `/w gm Eyes of Night deactivated for ${token.get('name')||''}. Vision restored to default for race.`);
        } else {
            // Activate Eyes of Night
            attr.set('current','true');
            token.set({
                night_vision: true,
                night_vision_distance: 300,
                night_vision_tint: '', // transparent
                night_vision_effect: 'dimming',
                night_vision_effect_range: 5
            });
            sendChat('TwilightCleric', `/w gm Eyes of Night activated for ${token.get('name')||''}. Night vision set to 300ft.`);
        }
    });
}

function handleEyesOfNightActivate(msg) {
    // args: [!twilight, eyes_activate, <tokenid>]
    var args = msg.content.split(' ');
    // Find the selected token (since we removed tokenId from the macro)
    var token = null;
    if (msg.selected && msg.selected.length > 0) {
        token = getObj('graphic', msg.selected[0]._id);
    }
    if (!token) return;
    var charId = token.get('represents');
    if (!charId) return;
    var attr = findObjs({type:'attribute', characterid:charId, name:'eyes_of_night'})[0];
    if (!attr) {
        attr = createObj('attribute', {name:'eyes_of_night', current:'false', characterid:charId});
    }
    attr.set('current','true');
    // Set token vision: 300ft night vision, transparent tint, dimming, dim start 5ft
    token.set({
        night_vision: true,
        night_vision_distance: 300,
        night_vision_tint: '', // transparent
        night_vision_effect: 'dimming',
        night_vision_effect_range: 5
    });
    sendChat('TwilightCleric', `/w gm Eyes of Night activated for ${token.get('name')||''}. Night vision set to 300ft.`);
}

function restoreDefaultVision(token, charId) {
    // Try to get race attribute
    var raceAttr = findObjs({type:'attribute', characterid:charId, name:'race'})[0];
    var race = raceAttr ? String(raceAttr.get('current')).toLowerCase() : '';
    // Look up the species in the reference table, with fallback to base race
    var key = race;
    var visionSettings = DarkvisionBySpecies[key];
    if (!visionSettings) {
        // Try fallback: use last word as base race (e.g., 'rock gnome' -> 'gnome')
        var words = key.split(/\s+/);
        if (words.length > 1) {
            var baseRace = words[words.length - 1];
            visionSettings = DarkvisionBySpecies[baseRace];
        }
    }
    if (!visionSettings) {
        // If still not found, set to default (no darkvision)
        visionSettings = {night_vision: true, night_vision_distance: 5, night_vision_tint: 'transparent', night_vision_effect: 'dimming', night_vision_effect_range: 5};
    }
    if (visionSettings) {
        token.set({
            night_vision: visionSettings.night_vision,
            night_vision_distance: visionSettings.night_vision_distance,
            night_vision_tint: visionSettings.night_vision_tint === 'transparent' ? '' : visionSettings.night_vision_tint,
            night_vision_effect: visionSettings.night_vision_effect,
            night_vision_effect_range: visionSettings.night_vision_effect_range
        });
    } else {
        token.set({
            night_vision: false,
            night_vision_distance: 0,
            night_vision_tint: '',
            night_vision_effect: 'none',
            night_vision_effect_range: 0
        });
    }
}

// Add feature implementations below as needed.
