# Loot Generator Macro

```
!loot
```

---

## How to Use

1. Select all defeated monster tokens and all player character tokens on the battlefield.
2. Run the macro above (or click your Loot macro button).
3. The script will automatically:
   - Detect which tokens are monsters (have a CR attribute) and which are player characters (have a level attribute).
   - Calculate total treasure based on the CR of each monster, using balanced tables for coins and magic item chances.
   - Count the number of player characters selected to split the loot evenly (or use `!loot --party X` to override party size).
   - Generate magic items (with name, rarity, and theme) using your item tables and the monster CR.
   - Post a summary in chat showing total money, per-person split, loot details for each monster, and any magic items found.

---

## Treasure Generation Rules

| CR Range | Coins         | Magic Item Chance |
|----------|--------------|------------------|
| 0-4      | 3d6 gp       | 5%               |
| 5-10     | 2d8×10 gp    | 10%              |
| 11-16    | 2d10×10 pp   | 15%              |
| 17+      | 2d8×100 pp   | 20%              |

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

---

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

---

## Notes
- Magic item names are generated from your item tables.
- Party size is auto-counted from selected player tokens (those without a CR attribute).
- No automatic distribution or inventory changes; the script only posts a summary for the party in chat.
