# beacon_auto_xp.js — Automatic XP Award System (Beacon)

## Overview

Automatically calculates and distributes experience points after combat. Select all tokens involved in a battle — both player characters and defeated enemies — then run `!xp award`. The script reads each enemy's CR, totals the XP, divides it evenly among the PCs, and writes the updated XP directly to each PC's sheet.

---

## Dependencies

Load **before** this script in the sandbox:

- `beacon/dependencies/askthedm_script_dependencies.js`

---

## Commands

### `!xp award`

**Setup:** Select all tokens from the battle — PCs and defeated enemies together.

**How it works:**
1. Each selected token is checked for an `npc_challenge` attribute.
   - Token **has** `npc_challenge` → treated as a defeated enemy.
   - Token **does not have** `npc_challenge` (or it is empty) → treated as a player character.
2. Enemy CR values are looked up in `CR_ATTRIBUTE_REFERENCE` to get their XP values.
3. Total XP is summed and divided evenly among all PCs (rounded down).
4. Each PC's `experience` attribute is updated on their sheet.
5. A GM-only summary whisper is sent, plus a public announcement.

**Attributes read:**
| Attribute | Sheet type | Purpose |
|---|---|---|
| `npc_challenge` | NPC | CR value — also used to identify monsters |
| `experience` | PC | Current XP total — read and written |

**Output:**
- `/w gm` whisper with full breakdown: enemies defeated, XP per enemy, XP per player, old → new XP per PC
- Public chat message announcing total XP and per-player amount

---

## XP Values by CR

Sourced from `CR_ATTRIBUTE_REFERENCE` in the shared dependency file.

| CR | XP |
|---|---|
| 0 | 10 |
| 1/8 | 25 |
| 1/4 | 50 |
| 1/2 | 100 |
| 1 | 200 |
| 2 | 450 |
| 3 | 700 |
| 4 | 1,100 |
| 5 | 1,800 |
| 6 | 2,300 |
| 7 | 2,900 |
| 8 | 3,900 |
| 9 | 5,000 |
| 10 | 5,900 |
| 11 | 7,200 |
| 12 | 8,400 |
| 13 | 10,000 |
| 14 | 11,500 |
| 15 | 13,000 |
| 16 | 15,000 |
| 17 | 18,000 |
| 18 | 20,000 |
| 19 | 22,000 |
| 20 | 25,000 |
| 21 | 33,000 |
| 22 | 41,000 |
| 23 | 50,000 |
| 24 | 62,000 |
| 25 | 75,000 |

---

## Macro

```
!xp award
```

Suggested button label: **Award XP**

Select all battle tokens, then click the button.

---

## Beacon Notes

- **PC vs Monster detection** uses `npc_challenge` as the sole discriminator — no level attribute check is performed. This replaces the legacy multi-attribute level scan (`level`, `character_level`, etc.) which was unreliable on Beacon sheets.
- **Fractional CR XP lookup** uses the raw string from `npc_challenge` (e.g. `'1/4'`) directly as the table key. The legacy script had a bug where fractional CRs were converted to floats first (`0.25`), which never matched the table keys and silently returned 0 XP.
- **XP write** uses `askTheDMSetAttribute` → `setSheetItem`. If the `experience` field does not yet exist on the sheet, the Beacon API creates it.
- **No roll templates** — all output uses plain `sendChat`. Templates are in flux in Beacon.
- Script throws explicit errors with GM whispers if Beacon API helpers are unavailable.
