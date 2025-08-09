
# Roll20 API Scripts & Macros

**AI Copilot Notice:**
These scripts were developed with the assistance of GitHub Copilot (AI Copilot), an AI programming assistant, to help automate, debug, and enhance Roll20 gameplay automation.

This repository contains custom API scripts and macros designed to enhance and automate various aspects of gameplay on Roll20. These tools are tailored for my own campaigns but may be useful to others looking to streamline their Roll20 experience.

**Note:** A Roll20 Pro subscription is required to use API Script features. Always review and test scripts in a safe environment before using them in live games.

---




## Functioning Scripts (Table of Contents)

Scripts in the `functioning` folder are stable and ready for use. Scripts in the `in progress` folder may or may not be functional and are under active development. Click a script name below to view its macro and documentation:

- [Detection Script](working/detection_macro.md)
- [Experience Automation](working/experience_automation_macro.md)
- [Gathering Resources](working/gathering_resources_macro.md)
- [Initiative Script](in%20progress/Initiative.md)
- [Loot Generator](working/loot_generator_macro.md)
- [Monster Attack](working/MonsterAttack.md)
- [Protections](in%20progress/Protections_macro.md)
- [Rebalance](working/Rebalance.md)
- [Trap Triggered](working/trap_trigger_macro.md)
- [Twilight Cleric](in%20progress/TwilightCleric_macro.md)

---

## Dependency Scripts

Scripts in the `dependencies` folder provide data or reference tables used by the main automation scripts:

- **askthedm_CR_attribute_reference.js**: Provides the mapping of Challenge Rating (CR) to XP values and other monster stat references.
- **askthedm_DamageToEffect_reference.js**: Maps damage types to their default saving throw abilities and visual effect components for use in trap and spell automation.
- **askthedm_item_reference.js**: Contains tables of magic items by category, rarity, and theme for loot generation scripts.
- **askthedm_DarkvisionBySpecies_reference.js**: Provides a lookup table for default darkvision and vision settings by species/race, used for robust vision automation (e.g., Eyes of Night, restoring default vision). Integrates with scripts like TwilightCleric.js for accurate vision restoration.

---

---

## In Progress

Scripts in the `in progress` folder are unfinished, experimental, under development:

- **crafting_script.js**: Will automate crafting checks and progress tracking for player characters.
- **fireball.js**: Automates fireball spell effects, including save rolls and area damage.
- **spell_database.js**: reference script used as dependency for other scripts
- **spell_preparation.js**: Will help manage spell preparation and tracking for spellcasters.
- **spellcasting.js**: Automates spellcasting actions, including resource tracking and spell slot management.

---

Feel free to use, modify, or contribute to these scripts. Always back up your game and test scripts before use!
