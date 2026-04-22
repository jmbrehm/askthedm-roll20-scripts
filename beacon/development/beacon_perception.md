# beacon_perception.js — Detection & Perception Checks (Beacon)

## Overview

Runs passive/active perception checks for all selected tokens against a GM-chosen difficulty and description. Each player receives a private whisper with their result; the GM receives a compact summary of all pass/fail outcomes.

---

## Dependencies

Load **before** this script in the sandbox:

- `beacon/dependencies/askthedm_script_dependencies.js`

---

## Commands

### `!detect "description" --difficulty <level>`

**Setup:** Select all player tokens that should make the check, then run the macro.

**Parameters:**
| Parameter | Values | Required |
|---|---|---|
| `"description"` | Free text in quotes describing what is being detected | No (defaults to "something") |
| `--difficulty` | `easy`, `moderate`, `hard`, or `deadly` | Yes |

**DC Reference:**
| Difficulty | DC |
|---|---|
| easy | 10 |
| moderate | 15 |
| hard | 20 |
| deadly | 25 |

**How it works:**
1. For each selected token, the script reads `perception_bonus`, `advantagetoggle`, `global_skill_mod`, and `inspiration` from the character sheet.
2. It rolls one or two d20s depending on advantage state, adds `perception_bonus` plus any `global_skill_mod` modifiers, and uses the higher of the roll result or passive perception (10 + `perception_bonus`).
3. Each player is privately whispered:
   - **Pass:** roll details and the description of what they noticed.
   - **Fail:** only whispered if the character has `inspiration` set to `on` or `1`. Tells them they may have missed something and could use inspiration to reroll. Inspiration is **not** spent by this script.
4. The GM receives a plain text summary listing every character's PASS/FAIL result and final score.

---

## Macro

```
!detect "?{What are they detecting? (leave blank for generic)}" --difficulty ?{Difficulty|easy|moderate|hard|deadly}
```

---

## Attribute Reference

| Attribute | Purpose | Notes |
|---|---|---|
| `perception_bonus` | Active/passive perception modifier | |
| `advantagetoggle` | Advantage state | Legacy 2014 sheet stores `{{advantage=1}}` / `{{disadvantage=1}}`. May not exist on 2024 sheets — defaults to normal if absent or unrecognized. |
| `global_skill_mod` | Global skill modifier string (e.g. `1d4[Bless]`) | Optional; parses dice expressions and flat bonuses. Defaults to 0 if absent. |
| `inspiration` | Inspiration availability | `on` or `1` = available. Failure whisper is sent only if this is set. |

---

## Beacon Notes

- **No roll templates** — all output uses plain `sendChat`. The GM summary previously used `&{template:npcaction}`; this has been replaced with a plain text whisper.
- `randomInteger(20)` is a Roll20 API built-in that works in Beacon.
- `advantagetoggle` and `global_skill_mod` are 2014 sheet attributes. If the 2024 sheet stores advantage differently, this script will default to a normal roll. Verify attribute names after testing.
- `character.get('controlledby')` and `getObj('player', ...)` are Roll20 object API calls that work in Beacon.
