# Rebalance Macro (Rebalance.md)

```
!rebalance --cr ?{Desired CR}
```

---

This macro runs the Rebalance script on all selected monster tokens, allowing the GM to quickly update their Challenge Rating (CR) and automatically adjust their hit points (HP) and armor class (AC) to match the new CR.

**How it works:**
1. Select one or more monster tokens on the map.
2. Run the macro above in chat and enter the desired Challenge Rating (CR) for the monsters.
3. The script will:
   - Update the selected monsters' CR attribute to the new value.
   - Set their HP and AC to the recommended values for the chosen CR, based on the reference tables.

**Customization:**
You can modify the script to use custom stat tables or to adjust additional attributes. See Rebalance.js for details and advanced options.
