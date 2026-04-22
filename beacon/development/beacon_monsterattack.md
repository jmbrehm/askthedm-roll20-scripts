# beacon_monsterattack.js — Monster Attacks & Spells (Beacon)

## Overview

Automates monster attacks and spell effects against selected player tokens. The GM selects the attacker and all targets, flags the attacker with `!toggleattacker`, then runs the attack or spell macro. The script rolls to hit (or saves), calculates and applies damage (including resistances and immunities), and triggers a visual effect on each target.

The Turn Tracker listener automatically advances the `fist` marker and `user.attacker` attribute as turns change.

---

## Dependencies

Load **before** this script in the sandbox:

- `beacon/dependencies/askthedm_script_dependencies.js`

---

## Commands

### `!toggleattacker`

Marks one token as the attack source. Run with the attacker token selected.

- Sets `user.attacker` to `true` and adds the `fist` status marker.
- Running again on the same token sets it back to `false` and removes the marker.
- Only one token in the selection should be active at a time.

```
!toggleattacker
```

---

### `!monsterattack` — Attack

Rolls a melee/ranged attack against each selected non-attacker token.

```
!monsterattack --type Attack --rolltype ?{Attack Roll Type|Normal|Advantage|Disadvantage} --attacks ?{Number of Actions Used|1|2|3|4} --primary ?{Primary Damage Type|piercing|slashing|bludgeoning|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none}
```

**How it works:**
1. The token with the `fist` marker is the attacker; all other selected tokens are targets.
2. Attack bonus and damage range are read from `CR_ATTRIBUTE_REFERENCE` using the attacker's `npc_challenge`.
3. For each target, rolls `1d20 + attack_bonus` (adjusted for advantage/disadvantage).
4. On a hit, rolls damage and checks for resistances/immunities (`npc_resistances`, `npc_immunities`).
5. On a natural 20 (roll − bonus = 20), damage dice are doubled unless the target has `criticals` in their immunity list.
6. Damage is applied to the target's HP. NPCs use token bar1 (HP) and bar3 (temp HP). PCs use the `hp` and `hp_temp` character attributes.
7. A visual effect fires on the target (`burn-<color>` based on damage type).

---

### `!monsterattack` — Spell

Rolls a saving throw for each selected non-attacker token against a spell effect.

```
!monsterattack --type Spell --resist ?{Resist Type|None|Half} --attacks ?{Number of Actions Used|1|2|3|4} --primary ?{Primary Damage Type|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none}
```

**How it works:**
1. Damage is rolled once for all targets.
2. Save DC comes from `CR_ATTRIBUTE_REFERENCE` using the attacker's `npc_challenge`.
3. The saving throw stat is determined by damage type via the `DamageToSave` table (e.g., fire → Dexterity).
4. Each target rolls `1d20 + <stat>_save_bonus` against the DC.
5. On a failed save: full damage applied. On a success: no damage (or half damage if `--resist Half`).
6. Resistances and immunities are checked and applied.
7. Visual effect fires on the target (`glow-<color>` on save success, `burn-<color>` on failure).

---

## Number of Actions Explained

Damage is based on the DMG "Damage per Round" values for the attacker's CR. Creatures with CR ≥ 1 have 2 + floor(CR / 5) total "actions" of damage per round.

| Use `--attacks` | When |
|---|---|
| 1 | One attack in a multi-attack sequence |
| All available | A single big attack, breath weapon, or full-round spell |

---

## Attribute Reference

| Attribute | Sheet | Notes |
|---|---|---|
| `npc_challenge` | NPC | CR value; used to look up attack bonus, save DC, and damage range |
| `ac` | PC & NPC | Armor class; target for attack rolls |
| `hp` | PC | Current HP; written on damage |
| `hp_temp` | PC | Temporary HP; consumed before `hp` |
| `npc_resistances` | PC & NPC | Comma-separated damage types (e.g. `fire,cold`) |
| `npc_immunities` | PC & NPC | Includes `criticals` to block critical hit bonus damage |
| `<stat>_save_bonus` | PC/NPC | e.g. `constitution_save_bonus`; used for spell save rolls |
| `user.attacker` | NPC | Custom attribute tracking which token is the current attacker |

---

## Beacon Notes

- **`user.attacker` is a custom attribute.** The Beacon API requires user-defined attributes to be prefixed with `user.`. The legacy script stored this as a plain attribute; on Beacon it is written as `user.attacker` via `{ userDefined: true }`.
- **`npc_resistances` and `npc_immunities` are treated as built-in 2024 sheet fields for both PCs and NPCs.** They are read directly (no `user.` prefix, no `{ userDefined: true }`).
- **Inline roll callbacks** (`sendChat('', '/w gm [[...]]', callback)`) are a Roll20 API feature that works in Beacon independent of sheet type.
- **All target attributes are pre-fetched** before entering roll callbacks. This ensures async Beacon reads complete before the synchronous callback structure begins.
- **NPC HP** is applied via token bar properties (synchronous). **PC HP** is applied via fire-and-forget `setSheetItem` writes inside the callback.
- **No roll templates** — all output uses plain `sendChat`.
- The Turn Tracker listener (`on('change:campaign:turnorder', ...)`) is a Roll20 Campaign API event that works in Beacon.
