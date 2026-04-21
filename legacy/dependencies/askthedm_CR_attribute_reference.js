// filename: askthedm_CR_attribute_reference.js
// Reference table for CR expected stats and XP values (for use by other scripts)

const CR_ATTRIBUTE_REFERENCE = {
  '0':    { ac: 13, hp: [1, 6], attack: 3, damage: [1, 3], save: 13, xp: 10 },
  '1/8':  { ac: 13, hp: [7, 35], attack: 3, damage: [2, 3], save: 13, xp: 25 },
  '1/4':  { ac: 13, hp: [36, 49], attack: 3, damage: [4, 5], save: 13, xp: 50 },
  '1/2':  { ac: 13, hp: [50, 70], attack: 3, damage: [6, 8], save: 13, xp: 100 },
  '1':    { ac: 13, hp: [71, 85], attack: 3, damage: [9, 14], save: 13, xp: 200 },
  '2':    { ac: 13, hp: [86, 100], attack: 3, damage: [15, 20], save: 13, xp: 450 },
  '3':    { ac: 13, hp: [101, 115], attack: 4, damage: [21, 26], save: 13, xp: 700 },
  '4':    { ac: 14, hp: [116, 130], attack: 5, damage: [27, 32], save: 14, xp: 1100 },
  '5':    { ac: 15, hp: [131, 145], attack: 6, damage: [33, 38], save: 15, xp: 1800 },
  '6':    { ac: 15, hp: [146, 160], attack: 6, damage: [39, 44], save: 15, xp: 2300 },
  '7':    { ac: 15, hp: [161, 175], attack: 6, damage: [45, 50], save: 15, xp: 2900 },
  '8':    { ac: 16, hp: [176, 190], attack: 7, damage: [51, 56], save: 16, xp: 3900 },
  '9':    { ac: 16, hp: [191, 205], attack: 7, damage: [57, 62], save: 16, xp: 5000 },
  '10':   { ac: 17, hp: [206, 220], attack: 7, damage: [63, 68], save: 16, xp: 5900 },
  '11':   { ac: 17, hp: [221, 235], attack: 8, damage: [69, 74], save: 17, xp: 7200 },
  '12':   { ac: 17, hp: [236, 250], attack: 8, damage: [75, 80], save: 17, xp: 8400 },
  '13':   { ac: 18, hp: [251, 265], attack: 8, damage: [81, 86], save: 18, xp: 10000 },
  '14':   { ac: 18, hp: [266, 280], attack: 8, damage: [87, 92], save: 18, xp: 11500 },
  '15':   { ac: 18, hp: [281, 295], attack: 8, damage: [93, 98], save: 18, xp: 13000 },
  '16':   { ac: 18, hp: [296, 310], attack: 9, damage: [99, 104], save: 18, xp: 15000 },
  '17':   { ac: 19, hp: [311, 325], attack: 10, damage: [105, 110], save: 19, xp: 18000 },
  '18':   { ac: 19, hp: [326, 340], attack: 10, damage: [111, 116], save: 19, xp: 20000 },
  '19':   { ac: 19, hp: [341, 355], attack: 10, damage: [117, 122], save: 19, xp: 22000 },
  '20':   { ac: 19, hp: [356, 400], attack: 10, damage: [123, 140], save: 19, xp: 25000 },
  '21':   { ac: 19, hp: [401, 445], attack: 11, damage: [141, 158], save: 20, xp: 33000 },
  '22':   { ac: 19, hp: [446, 490], attack: 11, damage: [159, 176], save: 20, xp: 41000 },
  '23':   { ac: 19, hp: [491, 535], attack: 11, damage: [177, 194], save: 20, xp: 50000 },
  '24':   { ac: 19, hp: [536, 580], attack: 12, damage: [195, 212], save: 21, xp: 62000 },
  '25':   { ac: 19, hp: [581, 625], attack: 12, damage: [213, 230], save: 21, xp: 75000 },
  '26':   { ac: 19, hp: [626, 670], attack: 12, damage: [231, 248], save: 21, xp: 90000 },
  '27':   { ac: 19, hp: [671, 715], attack: 13, damage: [249, 266], save: 22, xp: 105000 },
  '28':   { ac: 19, hp: [716, 760], attack: 13, damage: [267, 284], save: 22, xp: 120000 },
  '29':   { ac: 19, hp: [761, 805], attack: 13, damage: [285, 302], save: 22, xp: 135000 },
  '30':   { ac: 19, hp: [806, 850], attack: 14, damage: [303, 320], save: 23, xp: 155000 }
};

globalThis.CR_ATTRIBUTE_REFERENCE = CR_ATTRIBUTE_REFERENCE;
