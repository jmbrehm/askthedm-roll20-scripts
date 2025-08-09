# Initiative Automation Script for Roll20

**Macro Command:**
```
!combat
```

## What this script does
- Rolls initiative for all selected tokens that are already in the Turn Order tracker.
- Does not add tokens to the tracker or open the Turn Tracker automatically. The GM must open the tracker and add tokens (e.g., with Ctrl+U) before running the script.
- Initiative is calculated as:
  - 1d20 + initiative_bonus + .dexterity (as a decimal tiebreaker)
  - If the character has an attribute `initiative_style` set to `@{d20},@{d20}}kh1`, rolls with advantage (2d20, take highest). Otherwise, rolls normally.
- Updates the initiative value for each selected token in the turn order.
- Sorts the turn order in descending order (highest initiative first).
- Posts the initiative results to chat with token images and roll details.
- If the Turn Tracker is not open, the script whispers the GM to open it and add tokens first, then exits.

## How to use
1. Make sure the script is installed in your Roll20 API scripts.
2. On your Roll20 tabletop, open the Turn Tracker and add all tokens you want included (select tokens and press Ctrl+U).
3. Select the tokens you want to roll initiative for.
4. Press the macro button or type `!combat` in chat.
5. The script will roll initiative for the selected tokens, update their values in the tracker, sort the order, and post results to chat.

## Attribute Details
- `initiative_bonus`: The bonus added to the initiative roll (should be a number).
- `dexterity`: Used as a decimal tiebreaker (e.g., 14.15 beats 14.12).
- `initiative_style`: If set to `@{d20},@{d20}}kh1`, the character rolls initiative with advantage (2d20, take highest). Otherwise, rolls normally.

## Example
If a character has:
- initiative_bonus = 3
- dexterity = 15
- initiative_style = `@{d20},@{d20}}kh1`

Their initiative will be the higher of 1d20 or 1d20, plus 3, plus .15 (e.g., 17.15).

---

**Notes:**
- The script only updates initiative for tokens already in the Turn Order tracker.
- Tokens not in the tracker are ignored.
- The GM must open the Turn Tracker and add tokens before running the script (this can be done with ctrl+u hotkey with currently selected tokens).
- The script works for both player and NPC tokens as long as they have the required attributes.
