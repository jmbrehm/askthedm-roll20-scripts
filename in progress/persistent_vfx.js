// filename: persistent_vfx.js
// Roll20 API Script: Persistent VFX on Token
// Usage:
//   !vfx persist <fx_type>   (with token(s) selected)
//   !vfx stop                (with token(s) selected)
//
// Example: !vfx persist burn-holy
//
// This script will spawn a VFX at the selected token's position every 400ms until stopped.

var PersistentVFX = PersistentVFX || {
    intervals: {},
    
    start: function(token, fxType) {
        var id = token.id;
        this.stop(token); // Stop any existing effect first
        this.intervals[id] = setInterval(function() {
            spawnFx(token.get('left'), token.get('top'), fxType, token.get('pageid'));
        }, 400);
    },
    stop: function(token) {
        var id = token.id;
        if (this.intervals[id]) {
            clearInterval(this.intervals[id]);
            delete this.intervals[id];
        }
    }
};

on('chat:message', function(msg) {
    if (msg.type !== 'api' || !msg.selected) return;
    var args = msg.content.split(' ');
    if (args[0] !== '!vfx') return;
    var command = args[1];
    var fxType = args[2];
    msg.selected.forEach(function(sel) {
        var token = getObj('graphic', sel._id);
        if (!token) return;
        if (command === 'persist' && fxType) {
            PersistentVFX.start(token, fxType);
        } else if (command === 'stop') {
            PersistentVFX.stop(token);
        }
    });
});
