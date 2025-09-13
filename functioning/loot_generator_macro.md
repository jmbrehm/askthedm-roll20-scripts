# Treasure Hoard Macro

```
!hoard
```

---

## How to Use the Hoard Macro

1. Select any number of tokens (monsters and/or player characters).
2. Run the macro above (or click your Hoard macro button).
3. The script will:
   - Find the highest CR among all selected tokens.
   - Generate a treasure hoard based on the highest CR, using the table below for gold and number of magic items.
   - For each magic item, determine its rarity and theme individually, and generate the item name.
   - Count the number of player tokens selected (those without a CR attribute) to split the gold evenly.
   - Post a summary in chat showing total gold, per-person split, and all magic items found.

---

## Treasure Hoard Generation Rules

| CR Range | Gold                 | Magic Items |
|----------|----------------------|-------------|
| 0–4      | 2d4 × 100 gp         | 1d4 − 1     |
| 5–10     | 8d10 × 100 gp        | 1d3         |
| 11–16    | 8d8 × 10,000 gp      | 1d4         |
| 17+      | 6d10 × 10,000 gp     | 1d6         |

Each magic item is rolled for rarity and theme individually.

---

## Example Output

```
&{template:npcaction}{{rname=Treasure Hoard}}{{name=Hoard Summary}}
{{description=**Total Gold:** 4,200 gp (1,050 gp per person)

**Magic Items:**
• Rare Arcana Item
• Uncommon Armament Item
• Common Relic Item}}
```

---

## Notes
- The hoard macro always generates at least gold, and a number of magic items based on the table above (no random chance for magic items).
- Magic item names are generated from your item tables, with rarity and theme determined for each item.
- Party size is auto-counted from selected player tokens (those without a CR attribute).
- No automatic distribution or inventory changes; the script only posts a summary for the party in chat.
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
