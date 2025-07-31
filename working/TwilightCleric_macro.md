# TwilightCleric Macros for Roll20

This file contains example macros for automating Twilight Cleric features using the TwilightCleric.js API script.

---


## Eyes of Night
Toggle Eyes of Night vision for selected tokens:
```
!twilight eyes
```
Toggles 300ft night vision for the selected token(s). If already active, restores default vision for the token's race. Only works if a character is linked to the token.

---


## Vigilant Blessing
Toggle Vigilant Blessing for selected token(s):
```
!twilight vigilant
```
Sets or removes the Vigilant Blessing attribute for the selected token(s). When active, initiative rolls are made with advantage. When deactivated, initiative returns to normal.

---


## Twilight Sanctuary
Start or stop the Twilight Sanctuary aura and automation (select the cleric's token):
```
!twilight sanctuary
```
Toggles Twilight Sanctuary for the selected cleric token. When active, applies a sparkle-charm marker to the cleric and sets them as a sanctuary target. All tokens with `twilight_sanctuary_target: true` within 30ft of the cleric gain the flying-flag marker and are eligible for temp HP at the end of their turn.
## Twilight Sanctuary Target
Toggle Twilight Sanctuary target status for selected token(s):
```
!twilight sanctuary_target
```
Sets or removes the `twilight_sanctuary_target` attribute for the selected token(s). Sanctuary targets within 30ft of the cleric with sanctuary active gain the flying-flag marker and are eligible for temp HP at the end of their turn.

---


---

## How It Works

- **Eyes of Night:** Select one or more tokens and run `!twilight eyes` to toggle 300ft night vision. If toggled off, restores the token's default vision based on race.
- **Vigilant Blessing:** Select a token and run `!twilight vigilant` to toggle Vigilant Blessing. When active, initiative rolls are made with advantage for that character.
- **Twilight Sanctuary:** Select the cleric's token and run `!twilight sanctuary` to toggle the aura. When active, the cleric gets a sparkle-charm marker and is set as a sanctuary target. All tokens with `twilight_sanctuary_target: true` within 30ft of the cleric get the flying-flag marker and are eligible for temp HP at the end of their turn.
- **Twilight Sanctuary Target:** Select any token and run `!twilight sanctuary_target` to toggle their sanctuary target status. Sanctuary targets within 30ft of the cleric with sanctuary active get the flying-flag marker and are eligible for temp HP at the end of their turn.
- **Temp HP Automation:** At the end of each turn, if a sanctuary target is within 30ft of the cleric with sanctuary active, the script rolls 1d6 + cleric level. If the result is higher than the target's current temp HP, it is updated; otherwise, the higher value is kept. The GM is whispered the result.

---

**Note:** These macros require the TwilightCleric.js script to be installed in your Roll20 API scripts. Select the relevant token(s) before running each macro.
