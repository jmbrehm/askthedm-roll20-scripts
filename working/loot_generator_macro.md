# Loot Generator Macro

## Macro Button Setup

Create this macro in Roll20:

### Loot Generation
```
!loot
```
**Instructions:** Select all defeated monster tokens AND all player character tokens, then click this macro.

### Loot Generation with Party Split (manual override, not needed if you select PCs)
```
!loot --party 4
```
**Instructions:** Select all defeated monster tokens AND all player character tokens, then click this macro. Replace `4` with your party size to override auto-count.

## Usage Instructions

1. **Select Monsters and Players:** Drag to select all defeated monster tokens AND all player character tokens on the battlefield.
2. **Run Macro:** Click the "Loot" macro button.
3. **Result:** The script posts a summary in chat showing:
   - Total money (with per-person split, auto-counted from selected PCs)
   - Loot details for each monster
   - List of any magic items generated (name, rarity, theme)

## Treasure Generation Rules

| CR Range | Coins | Magic Item Chance |
|----------|-------|------------------|
| 0-4      | 3d6 gp | 5% |
| 5-10     | 2d8×10 gp | 10% |
| 11-16    | 2d10×10 pp | 15% |
| 17+      | 2d8×100 pp | 20% |

## Magic Item Rarity Table

| CR Range | Common | Uncommon | Rare | Very Rare | Legendary |
|----------|--------|----------|------|-----------|-----------|
| 0-4      | 97%    | 3%       | 0%   | 0%        | 0%        |
| 5-10     | 87%    | 10%      | 3%   | 0%        | 0%        |
| 11-16    | 62%    | 25%      | 10%  | 3%        | 0%        |
| 17+      | 0%     | 55%      | 25%  | 15%       | 5%        |

## Magic Item Themes
- Arcana
- Armament
- Implement
- Relic

## Example Output
```
&{template:npcaction}{{rname=Treasure Generated}}{{name=Loot Summary}}
{{description=**Total Money:** 320 gp (80 gp per person)

**Loot Details:**
• Goblin (CR 1): 12 gp
• Ogre (CR 2): 15 gp
• Lich (CR 21): 2000 pp

**Magic Items:**
• Uncommon Relic Item
• Rare Arcana Item}}
```

## Notes
- Magic item names are now generated from your item tables.
- Party size is auto-counted from selected player tokens (no CR attribute).
- No automatic distribution or inventory changes; just a summary post for the party.
