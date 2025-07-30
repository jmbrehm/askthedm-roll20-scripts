// filename: askthedm_DamageToSave_reference.js
// Reference table for damage type to saving throw mapping (for use by other scripts)
// These will be used as default assumptions in other scripts -- over-ride when needed.

const DamageToSave = {
    "bludgeoning": "Strength",
    "thunder": "Strength",
    "force": "Strength",
    "slashing": "Dexterity",
    "fire": "Dexterity",
    "lightning": "Dexterity",
    "acid": "Dexterity",
    "radiant": "Dexterity",
    "piercing": "Constitution",
    "cold": "Constitution",
    "poison": "Constitution",
    "necrotic": "Constitution",
    "psychic": "Wisdom"
};

globalThis.DamageToSave = DamageToSave;
