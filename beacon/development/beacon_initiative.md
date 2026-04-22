# beacon_initiative.js — Initiative Automation (Beacon)

## Overview

Rolls initiative for all selected tokens and updates their initiative values in the Roll20 Turn Tracker. Tokens are sorted descending by initiative after each roll. Dexterity is used as a fractional tiebreaker.

---

## Dependencies

Load **before** this script in the sandbox:

- `beacon/dependencies/askthedm_script_dependencies.js`

---

## Commands

### `!combat`

**Setup:**
1. Open the Turn Tracker (click the compass icon, or use the keyboard shortcut).
2. Add all tokens that should participate in initiative to the Turn Tracker using **ctrl+u** (with them selected).
3. Select all tokens you want to roll initiative for.
4. Run `!combat`.

**How it works:**
1. Verifies the Turn Tracker is open (`Campaign().get('initiativepage')`).
2. For each selected token, reads `initiative_bonus` and `dexterity`, then checks custom attribute `user.askthedm_init_style`.
3. Rolls initiative as normal/advantage/disadvantage based on `user.askthedm_init_style`.
4. Final initiative value = d20 result + `initiative_bonus` + (`dexterity` × 0.01) as tiebreaker.
5. Updates the `pr` (priority) of matching tokens already in the Turn Tracker.
6. Sorts the Turn Tracker descending by initiative.
7. Posts a chat message with token thumbnails and roll results.

If `user.askthedm_init_style` is missing or invalid, `!combat` defaults to a normal roll.

### `!initstyle`

Use this command to set a custom initiative roll mode for selected tokens.

- Running `!initstyle` with no mode shows clickable options in chat for:
	- Normal
	- Advantage
	- Disadvantage
	- Toggle
- Running `!initstyle normal`, `!initstyle advantage`, or `!initstyle disadvantage` sets that value on each selected represented character.
- Running `!initstyle toggle` cycles each character independently:
	- `normal -> advantage -> disadvantage -> normal`

The command writes Beacon custom attribute `user.askthedm_init_style`.

**Note:** Only tokens already added to the Turn Tracker have their initiative updated. Run ctrl+u first to add tokens.

---

## Macro

```
!combat
```

Suggested button label: **Roll Initiative**

Select all tokens (PCs and NPCs) that are in the battle, then click the button.

Suggested style macro:

```
!initstyle
```

Select tokens first, run `!initstyle`, then click the mode button in chat.

---

## Attribute Reference

| Attribute | Purpose | Notes |
|---|---|---|
| `initiative_bonus` | Flat initiative modifier | Added to the d20 roll |
| `dexterity` | Raw dexterity score | Used as 0.01 × dex fractional tiebreaker |
| `user.askthedm_init_style` | Custom initiative roll mode override | Set by `!initstyle`. Valid values: `normal`, `advantage`, `disadvantage`. Missing/invalid values default to normal. |

---

## Beacon Notes

- **No roll templates** — roll results are output as plain HTML in `sendChat` (token thumbnail + initiative value). This was already plain HTML in the legacy version and requires no change.
- `Campaign().get/set('turnorder')` is a Roll20 Campaign API call that works in Beacon.
- `randomInteger(20)` is a Roll20 API built-in that works in Beacon.
- Initiative mode is controlled by custom attribute `user.askthedm_init_style` when present.
