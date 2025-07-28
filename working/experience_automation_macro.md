# Experience Automation Macro

## Macro Button Setup

Create this macro in Roll20:

### XP Award
```
!xp award
```
**Instructions:** Select all tokens from the battle (both PC and enemy tokens), then click this macro.

### XP Help
```
!xp help
```
**Instructions:** Shows detailed help and usage information.

## Usage Instructions

1. **Select All Battle Participants:** 
   - Click and drag to select all tokens involved in the battle
   - Include both player character tokens AND defeated enemy tokens
   - The script will automatically sort them into PCs vs enemies

2. **Run the Macro:** Click the "XP Award" macro button

3. **Automatic Processing:**
   - Script identifies PCs (tokens with "level" attribute)
   - Script identifies enemies (tokens with "npc_challenge" attribute)  
   - Calculates total XP from all enemies based on their CR
   - Divides XP evenly among all PCs (rounded down)
   - Automatically adds XP to each PC's experience attribute

## CR to XP Reference

| CR | XP | CR | XP | CR | XP |
|---|---|---|---|---|---|
| 0 | 10 | 10 | 5,900 | 20 | 25,000 |
| 1/8 | 25 | 11 | 7,200 | 21 | 33,000 |
| 1/4 | 50 | 12 | 8,400 | 22 | 41,000 |
| 1/2 | 100 | 13 | 10,000 | 23 | 50,000 |
| 1 | 200 | 14 | 11,500 | 24 | 62,000 |
| 2 | 450 | 15 | 13,000 | 25 | 75,000 |
| 3 | 700 | 16 | 15,000 | 26 | 90,000 |
| 4 | 1,100 | 17 | 18,000 | 27 | 105,000 |
| 5 | 1,800 | 18 | 20,000 | 28 | 120,000 |
| 6 | 2,300 | 19 | 22,000 | 29 | 135,000 |
| 7 | 2,900 | | | 30 | 155,000 |
| 8 | 3,900 | | | | |
| 9 | 5,000 | | | | |

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

## Technical Features

- **Smart Token Detection:** Automatically categorizes PCs vs enemies based on attributes
- **Fractional CR Support:** Handles 1/8, 1/4, 1/2 CR values correctly
- **XP Attribute Management:** Creates experience attributes if they don't exist
- **Multiple XP Attribute Names:** Looks for 'experience', 'exp', 'xp', or 'experience_points'
- **Even Distribution:** Divides XP evenly with rounding down
- **Detailed Reports:** Shows before/after XP totals and battle summary

## Error Handling

- **No PCs Selected:** Script warns if no tokens with 'level' attribute found
- **No Enemies Selected:** Script warns if no tokens with 'npc_challenge' attribute found
- **Invalid CR Values:** Unknown CR values default to 0 XP
- **Missing Attributes:** Automatically creates experience attribute with starting value

## Integration Notes

This system works alongside your existing trap system and uses the same character detection logic for identifying player characters vs NPCs.
