# beacon_rebalance.js — Monster CR Rebalancing (Beacon)

## Overview

Quickly adjusts one or more selected monster tokens to a new Challenge Rating. Sets the monster's CR, AC, and HP to the balanced values from the CR reference table. HP is randomly rolled within the expected range for the new CR.

---

## Dependencies

Load **before** this script in the sandbox:

- `beacon/dependencies/askthedm_script_dependencies.js`

---

## Commands

### `!rebalance --cr <value>`

**Setup:** Select one or more monster tokens, then run the macro and enter the desired CR.

**Valid CR values:** `0`, `1/8`, `1/4`, `1/2`, `1` through `30`

**How it works:**
1. Checks that the selected token is linked to a character with a non-empty `npc_challenge` attribute. Tokens without `npc_challenge` (i.e., player characters) are skipped silently.
2. Sets the character's `npc_challenge` attribute to the new CR.
3. Sets the character's `npc_ac` attribute to the AC from the CR reference table.
4. Rolls HP randomly within the expected HP range for the new CR and sets both `bar1_value` and `bar1_max` on the token.
5. Whispers the GM a confirmation listing each rebalanced token with its new CR, AC, and HP.

---

## Macro

```
!rebalance --cr ?{Desired CR|0|1/8|1/4|1/2|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30}
```

Suggested button label: **Rebalance Monster**

---

## CR Reference (AC and HP Range)

| CR | AC | HP Range |
|---|---|---|
| 0 | 13 | 1–6 |
| 1/8 | 13 | 7–35 |
| 1/4 | 13 | 36–49 |
| 1/2 | 13 | 50–70 |
| 1 | 13 | 71–85 |
| 2 | 13 | 86–100 |
| 3 | 13 | 101–115 |
| 4 | 14 | 116–130 |
| 5 | 15 | 131–145 |
| 10 | 17 | 206–220 |
| 15 | 18 | 281–295 |
| 20 | 19 | 356–400 |

Full table defined in `beacon/dependencies/askthedm_script_dependencies.js` under `CR_ATTRIBUTE_REFERENCE`.

---

## Beacon Notes

- **Attributes written via Beacon:** `npc_challenge` and `npc_ac` are set using `askTheDMSetAttribute` → `setSheetItem`.
- **Token bars written directly:** `bar1_value` and `bar1_max` (HP) are set as token properties via `token.set(...)`. This is a Roll20 token API call that works in Beacon.
- The legacy version used `findObjs` to check if `npc_challenge` existed and `createObj` if `npc_ac` was missing. The Beacon version uses `askTheDMGetAttribute` to check existence and `askTheDMSetAttribute` for all writes — Beacon creates the attribute if it doesn't exist.
- The legacy version silently did nothing on success. The Beacon version whispers the GM a confirmation summary.
