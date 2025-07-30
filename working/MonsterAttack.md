
# Monster Attack Macro

```
!monsterattack --type Attack --rolltype ?{Attack Roll Type|Normal|Advantage|Disadvantage} --attacks ?{Number of Actions Used|1|2|3|4} --primary ?{Primary Damage Type|piercing|slashing|bludgeoning|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none}
```

# Monster Spell Macro

```
!monsterattack --type Spell --resist ?{Resist Type|None|Half} --attacks ?{Number of Actions Used|1|2|3|4} --primary ?{Primary Damage Type|fire|cold|acid|poison|lightning|thunder|necrotic|radiant|psychic|force|none}
```

---

## How to Use

1. Select one monster token (with a valid `npc_challenge` attribute) and one or more player tokens (with a valid level attribute).
2. Run the appropriate macro above in chat.
3. Fill out the prompts for attack/spell type, roll type or resist type, number of actions, and primary damage type.

---

## How the Script Works

### For Attacks
- The script uses the monster's CR to determine attack bonus and damage based on balanced tables.
- It rolls to hit each selected player token, using the chosen roll type (normal, advantage, or disadvantage).
- On a hit, it rolls and applies damage, checking for resistances and immunities on the target.
- On a natural 20 (attackResult - attack bonus === 20), it doubles the damage dice and marks the result as a critical hit.
- The output displays the attack roll, result (hit/crit/miss), dice used, damage rolled, and damage applied (with resistance/immunity notes)(it looks for pc_resistances and pc_immunities attributes; you may need to add these to your player character sheets).

### For Spells
- The script uses the monster's CR to determine save DC and damage based on balanced tables.
- Each player target rolls a saving throw against the spell's DC, using the appropriate save type for the damage type.
- If the spell allows half damage on a save, the macro prompt should be set to 'Half'.
- On a failed save, full damage is applied; on a successful save, half damage (minimum 1) is applied.
- The script checks for resistances and immunities and adjusts the applied damage accordingly.
- The output displays the save roll, result (success/failure), dice used, damage rolled, and damage applied (with resistance/immunity notes)(it looks for pc_resistances and pc_immunities attributes; you may need to add these to your player character sheets).

### For Number of Actions
The damage balancing is based on the values from the DMG on "Damage per Round" for a custom monster at a given CR. Because of the nature of using "attacks" in the script, an adjustment was required to quantify the damage values. As we know, in 5E D&D, creatures get 1 action, 1 bonus action, 1 reaction in a round. And, monsters that can attack more than once, are often given a multi-attack feature. Rather than incorporating multi-attack, as a concept, into this script, we have simplified it into a "number of actions concept"
- Creatures with CR = < 1 will deal their "damage per round" using 1 "action"
- Creatures with CR >= 1 will deal their "damage per round" using 2+(rounddown(CR/5)) "actions"

Effectively, if your creature is using one of several melee attacks in a round, and you're using this macro, you should say the attack is a 1 action attack. But if they're doing a single, big attack, or spell, or Using a Breath weapon, that would mean they don't also attack more that round, you would want to say the attack/spell uses all of their "Actions." I recognize the fundamental confusion this may cause for d&d players, due to semantics, but it was a necessary evil in getting the script to work well.

---

These macros ensure the MonsterAttack.js script receives all required arguments for correct damage calculation and output. After submitting, the API script will automatically roll attacks or saving throws, post results to chat, and apply damage to targets (including resistance/immunity checks).
