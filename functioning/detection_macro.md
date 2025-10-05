
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
- For each selected token, check both passive and rolled perception, using the higher value.
- Whisper each player their result, including the DC and whether they passed or failed.
- Whisper the GM a summary card showing all results and pass/fail status.

---

This macro streamlines perception and detection checks for any number of selected tokens, provides private results to each player, and gives the DM a summary of who passed or failed.
