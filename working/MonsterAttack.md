# MonsterAttack Macro for Roll20 (with Poison Damage)

Use this macro to prompt for attack details and run the MonsterAttack.js API script.

Paste this into a Roll20 macro:

```
!monsterattack --type ?{Attack Type|Attack,Attack|Spell,Spell} --resist ?{Resist|None,None|Half,Half} --primary ?{Primary Damage|bludgeoning|piercing|slashing|fire|cold|lightning|acid|thunder|force|poison|radiant|necrotic} --secondary ?{Secondary Damage|none|bludgeoning|piercing|slashing|fire|cold|lightning|acid|thunder|force|poison|radiant|necrotic} --attacks ?{Number of Attacks|1|2|3|4|5|6|7}
```

## MonsterAttack Macro Usage

Use this macro to trigger a monster attack using the MonsterAttack.js API script. This macro will prompt you for all required information:

```
!monsterattack --type ?{Type|Attack,Attack|Spell,Spell} --primary ?{Primary Damage Type|piercing|slashing|bludgeoning|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none} --resist ?{Resist Type|None|Half} --attacks ?{Number of Actions Used|1|2|3|4}
```

**Instructions:**
- Select one monster token (with a valid `npc_challenge` attribute) and one or more player tokens (with a valid level attribute).
- Run the macro above. You will be prompted for:
  - **Type:** Attack or Spell
  - **Primary Damage Type:** The main damage type for the attack (choose from the list)
  - **Resist Type:** Whether the spell/attack allows half damage on a save (for spells, choose 'Half' if applicable, otherwise 'None')
  - **Number of Actions Used:** How many of the monster's actions this attack uses (usually 1, but can be more for multi-action abilities)

**Example:**
- For a monster using a single action to attack with piercing damage:
  - Type: Attack
  - Primary Damage Type: piercing
  - Secondary Damage Type: none
  - Resist Type: None
  - Number of Actions Used: 1

- For a spell that deals fire damage and allows half damage on a save:
  - Type: Spell
  - Primary Damage Type: fire
  - Secondary Damage Type: none
  - Resist Type: Half
  - Number of Actions Used: 1

This macro ensures the MonsterAttack.js script receives all required arguments for correct damage calculation and output.
**Instructions:**
- Select one monster token (with `npc_challenge` attribute) and one or more player tokens (with `level` attribute).
- Click the macro button. You will be prompted for attack type, resist, damage types, and number of attacks.
- After submitting, the API script will automatically roll attacks or saving throws, post results to chat, and apply damage to targets (including resistance/immunity checks).

**Prompts:**
- **Attack Type:** Attack (roll vs AC) or Spell (saving throw determined by damage type)
- **Resist:** None or Half (for successful saves)
- **Primary Damage:** Choose the main damage type (includes all supported types)
- **Secondary Damage:** Choose a secondary damage type or none
- **Number of Attacks:** Choose how many attacks to roll (up to 7)
