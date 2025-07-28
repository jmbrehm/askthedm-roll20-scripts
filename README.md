
# Roll20 API Scripts & Macros

**AI Copilot Notice:**
These scripts were developed with the assistance of GitHub Copilot (AI Copilot), an AI programming assistant, to help automate, debug, and enhance Roll20 gameplay automation.

This repository contains custom API scripts and macros designed to enhance and automate various aspects of gameplay on Roll20. These tools are tailored for my own campaigns but may be useful to others looking to streamline their Roll20 experience.

**Note:** A Roll20 Pro subscription is required to use API Script features. Always review and test scripts in a safe environment before using them in live games.

---

## Working Scripts

Scripts in the `working` folder are stable and ready for use:

- **detection_script.js**: Automates group perception checks for selected tokens, with difficulty prompts and results output to chat.
- **experience_automation.js**: Calculates and distributes experience points to player characters based on encounters or events.
- **gathering_resources_script.js**: Handles resource gathering checks and outputs results for selected tokens.
- **items.js**: This is a catelog of magical items by category; It is required for the loot_generator script to work; can be revised to suit your own campaign
- **loot_generator.js**: Generates random loot based on monsters in an encounter and outputs loot results to chat.
- **MonsterAttack.js**: Generates automated Custom monster attacks based on their CR, will attack and automatically apply damage to players (accounts for resistances and successfull saving throws) - targets temporary hp first then hp
- **Rebalance.js**: Updates Monster CR, HP, and AC for selected monster(s) - very good for working with MonsterAttack.js
- **trap_reference.js**: Trap Automation for targeting players and allowing you to roll attacks, or automate saving throws and damage application when traps are triggered

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
