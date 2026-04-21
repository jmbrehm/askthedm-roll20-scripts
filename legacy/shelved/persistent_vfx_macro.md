# Persistent VFX Macro for Roll20

Use these macros to apply or stop a persistent visual effect (VFX) on selected tokens. The effect will follow the token as it moves and persist until stopped.

---

## Macros

**Start a Persistent VFX (prompts for effect and color):**
```
!vfx persist ?{effect|burn|glow|sparkle|shield|bubbling|pooling}-?{color|fire|charm|acid|death|holy|blood|frost|slime|smoke|water|magic}
```

**Stop all persistent effects on selected tokens:**
```
!vfx stop
```

---

## How to Use

1. **Install the persistent_vfx.js script** in your Roll20 API scripts.
2. **Select one or more tokens** on your tabletop.
3. **Run the Start macro above**. You will be prompted to choose:
	- **effect**: burn, glow, sparkle, shield, bubbling, pooling
	- **color**: fire, charm, acid, death, holy, blood, frost, slime, smoke, water, magic
   
	For example, choosing `burn` and `holy` will send:
	```
	!vfx persist burn-holy
	```
4. **To stop the effect** on selected tokens, use the Stop macro above.

---

## Notes
- The VFX will follow the token as it moves, as long as the script is running.
- Only one persistent effect per token is supported at a time.
- You can apply effects to multiple tokens by selecting them all before running the macro.
- To see available VFX types, check the Roll20 API documentation or experiment with names like `burn-holy`, `burn-fire`, `magic-missile`, etc.
