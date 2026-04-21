# Tears of the Mountain (TotM) - Roll20 API Script

This script provides token action macros for the magic item "Tears of the Mountain" (TotM). Players can use the following macros:

## Macros

### 1. Check Charges
- **Command:** `!totm-charges`
- **Description:** Displays the current and maximum charges. Maximum is always set to the character's proficiency bonus.

#### Macro Example
```
!totm-charges
```


### 2. Fire Bolt
- **Description:** Cast Fire Bolt. Prompts for normal/advantage/disadvantage.

#### Macro Example
```
!totm-firebolt-attack --?{Attack Type|Normal,normal|Advantage,advantage|Disadvantage,disadvantage}
```

### 3. Scorching Ray
- **Description:** Cast Scorching Ray.

#### Macro Example
```
!totm-scorchingray
```

### 4. Fire Cone
- **Description:** Use Fire Cone.

#### Macro Example
```
!totm-firecone
```

### 5. Fireball
- **Description:** Cast Fireball.

#### Macro Example
```
!totm-fireball
```

### 6. Long Rest
- **Description:** Restore TotM charges to maximum (proficiency bonus).

#### Macro Example
```
!totm-longrest
```

---

**All damage rolls use Fire Affinity: any 1s rolled are treated as 2s.**

See the script for implementation details.