## MonsterAttack Macro Usage


### Monster Attack Macro (for Attacks)

Use this macro to trigger a monster attack (not a spell):

```
!monsterattack --type Attack --rolltype ?{Attack Roll Type|Normal|Advantage|Disadvantage} --attacks ?{Number of Actions Used|1|2|3|4} --primary ?{Primary Damage Type|piercing|slashing|bludgeoning|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none}
```

**Instructions:**
- Select one monster token (with a valid `npc_challenge` attribute) and one or more player tokens (with a valid level attribute).
- Run the macro above. You will be prompted for:
  - **Attack Roll Type:** Normal, Advantage, or Disadvantage
  - **Number of Actions Used:** How many of the monster's actions this attack uses (usually 1, but can be more for multi-action abilities)
  - **Primary Damage Type:** The main damage type for the attack (choose from the list)

**Example:**
- For a monster using a single action to attack with piercing damage at advantage:
  - Attack Roll Type: Advantage
  - Number of Actions Used: 1
  - Primary Damage Type: piercing

---

### Monster Spell Macro (for Spells)

Use this macro to trigger a monster spell (not a weapon attack):

```
!monsterattack --type Spell --resist ?{Resist Type|None|Half} --attacks ?{Number of Actions Used|1|2|3|4} --primary ?{Primary Damage Type|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none}
```

**Instructions:**
- Select one monster token (with a valid `npc_challenge` attribute) and one or more player tokens (with a valid level attribute).
- Run the macro above. You will be prompted for:
  - **Resist Type:** Whether the spell allows half damage on a save ('Half') or not ('None')
  - **Number of Actions Used:** How many of the monster's actions this spell uses (usually 1)
  - **Primary Damage Type:** The main damage type for the spell (choose from the list)

**Example:**
- For a spell that deals fire damage and allows half damage on a save:
  - Resist Type: Half
  - Number of Actions Used: 1
  - Primary Damage Type: fire

---

These macros ensure the MonsterAttack.js script receives all required arguments for correct damage calculation and output. After submitting, the API script will automatically roll attacks or saving throws, post results to chat, and apply damage to targets (including resistance/immunity checks).
