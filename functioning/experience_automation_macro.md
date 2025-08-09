# Experience Automation Macro

```
!xp award
```

---

## How to Use

1. Select all tokens involved in the battle (both player characters and defeated enemies).
2. Run the macro above (or click your XP Award macro button).
3. The script will automatically:
   - Detect which tokens are PCs (have a level attribute) and which are enemies (have an npc_challenge attribute).
   - Calculate total XP from all defeated enemies based on their CR, referencing the XP values in askthedm_CR_attribute_reference.js.
   - Divide XP evenly among all PCs (rounded down).
   - Add the XP to each PC's experience attribute (creates it if missing; supports 'experience', 'exp', 'xp', or 'experience_points').
   - Post a summary to the GM (with before/after XP for each PC and a breakdown of XP sources) and a public message to the party.

---

## Features

- Smart token detection: automatically categorizes PCs vs enemies based on attributes
- Fractional CR support: handles 1/8, 1/4, 1/2 CR values correctly
- XP attribute management: creates experience attributes if they don't exist
- Multiple XP attribute names: looks for 'experience', 'exp', 'xp', or 'experience_points'
- Even distribution: divides XP evenly with rounding down
- Detailed reports: shows before/after XP totals and battle summary
- Error handling: warns if no PCs or enemies are found, or if CR values are invalid

---

## Dependencies

- experience_automation.js (this script)
- askthedm_CR_attribute_reference.js (for CR-to-XP values)

---

## Example Output

**Chat Message to GM:**
```
Experience Award Summary

Defeated Enemies:
• Goblin (CR 1/4): 50 XP
• Orc (CR 1/2): 100 XP  
• Hobgoblin Captain (CR 3): 700 XP

Total XP Earned: 850
Players in Battle: 4
XP per Player: 212

Experience Awarded:
• Gandalf: 15,750 → 15,962 (+212 XP)
• Legolas: 12,300 → 12,512 (+212 XP)
• Gimli: 14,100 → 14,312 (+212 XP)
• Aragorn: 16,200 → 16,412 (+212 XP)
```

**Public Chat Message:**
```
Battle Complete! 850 total XP divided among 4 players. Each player gains 212 XP!
```
