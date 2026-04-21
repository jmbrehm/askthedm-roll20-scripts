!spell help

<!-- Spell Database Macro
     This macro provides access to the comprehensive spell database system.
     
     Main Commands:
     • !spell add - Add a new spell with full details
     • !spell info "Spell Name" - View complete spell information
     • !spell list - List all spells (or filter by level/school)
     • !spell search "keyword" - Search for spells
     • !spell edit - Modify existing spells
     • !spell delete "Spell Name" - Remove spells
     
     The database stores:
     - Basic info (name, level, school, casting time, range, components, duration)
     - Combat mechanics (damage, damage type, saves, area of effect)
     - Upcast effects and descriptions
     - Visual effects (fx) and audio effects for VTT integration
     - Concentration and ritual tags
     
     Example spell creation:
     !spell add --name "Lightning Bolt" --level 3 --school "Evocation" --time "1 action" --range "Self (100-foot line)" --components "V,S,M" --duration "Instantaneous" --damage "8d6" --damagetype "lightning" --save "Dexterity" --savesuccess "half" --description "Lightning bolt in 100-foot line" --upcast "1d6 per level" --aoe "100-foot line, 5 feet wide" --fx "lightning-bolt" --audio "thunder-crack"
-->
