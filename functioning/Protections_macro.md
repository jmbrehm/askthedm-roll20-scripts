# Protections Macro

```
!protections --action ?{Add or Remove|Add|Remove} --type ?{Resistance or Immunity|Resistance|Immunity} --damage ?{Damage Type|acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder|criticals}
```

---

## How to Use

1. Select one or more tokens whose protections you want to update.
2. Run the macro above. You will be prompted to:
   - Add or Remove a protection
   - Choose Resistance or Immunity
   - Select a damage type (from the list, including "criticals")
3. The script will update the appropriate attribute on each selected token's character sheet:
   - If the character has an `npc_challenge` value, it updates `npc_resistances` or `npc_immunities`.
   - Otherwise, it updates `pc_resistances` or `pc_immunities`.
   - The script will add or remove the selected damage type as appropriate.

This allows you to quickly grant or remove resistances and immunities (including to critical hits) for any group of tokens, whether they are NPCs or PCs.
