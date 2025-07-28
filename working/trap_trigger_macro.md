!trap trigger --type ?{Trap Type|nuisance|deadly} --method ?{Trap Method|save|attack} --damage ?{Damage Type|fire|bludgeoning|piercing|slashing|cold|lightning|acid|thunder|poison|force|radiant|necrotic}

<!-- Trap Trigger Macro
     This macro triggers level-appropriate traps on selected tokens.
     Character levels are automatically detected from character sheets.
     
     Usage:
     1. Select one or more tokens (the victims of the trap)
     2. Run this macro
     3. Choose trap type, method, and damage type
     4. Script automatically determines stats based on character levels and rolls for each token
     
     Trap Types:
     • Nuisance - Lower damage, easier saves, minor threat
     • Deadly - High damage, harder saves, major threat
     
     Methods:
     • Attack - Rolls attack vs AC, full damage on hit
     • Save - Makes saving throw, half damage on success
     
     Automatic Save Types:
     • Strength saves: bludgeoning, thunder
     • Dexterity saves: slashing, fire, lightning, acid
     • Constitution saves: piercing, cold, poison
     
     The system automatically scales with each character's individual level using balanced tables.
-->
