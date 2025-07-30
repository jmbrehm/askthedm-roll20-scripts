# Rebalance Macro (Rebalance.md)

```
!rebalance --cr ?{Desired CR}
```

---

This macro runs the Rebalance script on all selected monster tokens, helping the GM quickly adjust monsters for encounter balance.

**How it works:**
1. Select one or more monster tokens on the map.
2. Run the macro above in chat and enter the desired Challenge Rating (CR) for the monsters.
3. The script automatically:
   - Detects the current stats (HP, AC, attack bonus, save DC, and damage) for each selected monster.
   - Compares these stats to recommended values for the chosen CR, using balanced reference tables.
   - Suggests adjustments for each stat to bring the monster in line with the target CR.
   - Whispers the GM a summary for each monster, including current stats, recommended stats, and suggested changes.

**Customization:**
You can modify the script to suggest changes based on party level, desired difficulty, or custom stat tables. See Rebalance.js for advanced options and details.
