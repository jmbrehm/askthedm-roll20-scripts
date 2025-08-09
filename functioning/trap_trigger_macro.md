# Trap Trigger Macro
```
!trap trigger --type ?{Trap Type|nuisance|deadly} --method ?{Trap Method|save|attack} --damage ?{Damage Type|bludgeoning|thunder|force|slashing|fire|lightning|acid|radiant|piercing|cold|poison|necrotic|psychic}
```

## How to Use

1. Select one or more tokens (the trap's targets).
2. Run the macro above.
3. Choose trap type (nuisance or deadly), method (attack or save), and damage type.
4. The script determines stats and rolls for each token, scaling with their level/CR.

**Trap Types:**
- Nuisance: Lower damage, easier saves, minor threat
- Deadly: Higher damage, harder saves, major threat

**Methods:**
- Attack: Trap rolls to hit vs AC; on hit, full damage is rolled and applied
- Save: Target rolls a saving throw; on success, half damage (minimum 1) is applied

**Damage Types (and default save type):**
- Strength: bludgeoning, thunder, force
- Dexterity: slashing, fire, lightning, acid, radiant
- Constitution: piercing, cold, poison, necrotic
- Wisdom: psychic

**Output:**
- For attack traps: shows attack roll, result (hit/crit/miss), dice used, damage rolled, and damage applied (with resistance/immunity notes)
- For save traps: shows save roll, result (success/failure), dice used, damage rolled, and damage applied (with resistance/immunity notes)

---

This macro triggers a level-appropriate trap on all selected tokens. The system automatically scales with each character's level or CR using balanced tables. Damage is applied to temp HP first (for PCs), then regular HP. Immunities and resistances are detected and shown in the output.
