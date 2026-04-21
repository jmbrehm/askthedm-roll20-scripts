
# Detection Macro (askthedm)

```
!detect "?{What are they detecting? (optional, leave blank for generic)}" --difficulty ?{Difficulty|easy|moderate|hard|deadly}
```

---

## How to Use

1. Select all player tokens that should make the detection check.
2. Run the macro above.
3. Enter a description of what is being detected (or leave blank for a generic check).
4. Choose the difficulty level from the dropdown.

The script will automatically:

- Prompt for an optional description (blank defaults to a generic description) and a difficulty (easy/moderate/hard/deadly).
- For each selected token that represents a character it will:
	- Read the character's `perception_bonus` attribute and any `global_skill_mod` dice/flat modifiers (dice like `1d6[Label]` or flat `+2` are supported and rolled).
	- Determine rolling mode from the `advantagetoggle` attribute by matching explicit template tokens (case-insensitive): `{{normal=1}}`, `{{advantage=1}}`, or `{{disadvantage=1}}`.
	- Roll two d20s and apply advantage/disadvantage if indicated (the script shows `a/b` in the whisper when two d20s were rolled).
	- Compare the active roll+mods to the passive value (10 + perception bonus) and use the higher of the two as the character's final result.
	- Whisper the player privately if they pass. Pass whispers show the roll type, the final numeric result and (when applicable) the detailed breakdown of the roll and modifiers.
	- Whisper the player on a failure only if the character currently has the `inspiration` attribute set (the attribute is named `inspiration` and is considered available when `on` or `1`). Failure whispers in that case omit the difficulty label, include the roll type and final result, and read: "You may have missed something; but could use inspiration to look again". Inspiration is not spent automatically by this script.

- The script always whispers the GM a compact summary (npcaction template) titled `Perception for [Description] [DC: X]` containing a line per character in the format `Name: PASS/FAIL (result)`.
 

---

This macro streamlines perception and detection checks for any number of selected tokens, provides private results to each player, and gives the DM a summary of who passed or failed.
