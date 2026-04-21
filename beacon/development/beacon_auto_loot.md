# Beacon Auto Loot Commands

This file documents the commands used by beacon/development/beacon_auto_loot.js.

---

## Treasure Hoard Command

```text
!hoard
```

### How to Use

1. Select any number of tokens (monsters and/or player characters).
2. Run `!hoard`.
3. The script will:
	- Find the highest CR among selected monster tokens.
	- Generate hoard gold and magic item count from the hoard table.
	- Generate each magic item by rarity and theme.
	- Count selected player tokens (tokens without `npc_challenge`) for per-person split.
	- Post a hoard summary in chat.

### Hoard Rules

| CR Range | Gold | Magic Items |
|----------|------|-------------|
| 0-4 | 2d4 x 100 gp | 1d4 - 1 |
| 5-10 | 8d10 x 100 gp | 1d3 |
| 11-16 | 8d8 x 10,000 gp | 1d4 |
| 17+ | 6d10 x 10,000 gp | 1d6 |

---

## Loot Command

```text
!loot
```

### How to Use

1. Select defeated monster tokens and participating player tokens.
2. Run `!loot`.
3. The script will:
	- Identify monsters using `npc_challenge`.
	- Treat tokens without `npc_challenge` as players for split calculations.
	- Generate coin loot per monster by CR range.
	- Roll magic item chance per monster.
	- Post total money, per-person split, loot details, and magic items.

### Loot Rules

| CR Range | Coins | Magic Item Chance |
|----------|-------|-------------------|
| 0-4 | 3d6 gp | 5% |
| 5-10 | 2d8 x 10 gp | 10% |
| 11-16 | 2d10 x 10 pp | 15% |
| 17+ | 2d8 x 100 pp | 20% |

### Magic Item Rarity by CR

| CR Range | Common | Uncommon | Rare | Very Rare | Legendary |
|----------|--------|----------|------|-----------|-----------|
| 0-4 | 97% | 3% | 0% | 0% | 0% |
| 5-10 | 87% | 10% | 3% | 0% | 0% |
| 11-16 | 62% | 25% | 10% | 3% | 0% |
| 17+ | 0% | 55% | 25% | 15% | 5% |

Magic item themes:
- Arcana
- Armament
- Implement
- Relic

---

## Notes

- This Beacon refactor uses async attribute access and supports Beacon sheet item access through dependency helpers.
- For Beacon computed fields, use the Experimental API server as described in beacon/Howto_Beacon_update.md.
- The script only posts results to chat; it does not auto-distribute currency or alter inventories.
