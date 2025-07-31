# Persistent VFX Macro for Roll20

This macro and script allow you to apply a persistent visual effect (VFX) to a token, which will follow the token as it moves and persist until you stop it with a separate macro.

---

## How to Use

1. **Install the persistent_vfx.js script** in your Roll20 API scripts.
2. **Select one or more tokens** on your tabletop.
3. **Run the macro below** to start a persistent VFX:

```
!vfx persist <fx_type>
```

Replace `<fx_type>` with a valid Roll20 VFX name (e.g., `burn-holy`, `burn-fire`, `magic-missile`, `explosion-fire`, etc.).

**Example:**
```
!vfx persist shield-holy
```

4. **To stop the effect** on selected tokens, use:
```
!vfx stop
```

---

## Notes
- The VFX will follow the token as it moves, as long as the script is running.
- Only one persistent effect per token is supported at a time.
- You can apply effects to multiple tokens by selecting them all before running the macro.
- To see available VFX types, check the Roll20 API documentation or experiment with names like `burn-holy`, `burn-fire`, `magic-missile`, etc.

---

## Example Macros

**Start a persistent holy fire effect:**
```
!vfx persist burn-holy
```

**Stop all persistent effects on selected tokens:**
```
!vfx stop
```
