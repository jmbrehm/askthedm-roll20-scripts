on('ready', function() {
	log('askthedm - beacon_monsterattack.js - Loaded (version 3.0)');
});

// Beacon-ready monster attack/spell script based on legacy MonsterAttack.js
// Commands:
//   !toggleattacker         — toggle the 'attacker' flag and 'fist' marker on selected token(s)
//   !monsterattack --type Attack --rolltype <Normal|Advantage|Disadvantage>
//                  --attacks <1-4> --primary <damage type>
//   !monsterattack --type Spell --resist <None|Half>
//                  --attacks <1-4> --primary <damage type>
//
// Attacker detection:
//   The 'attacker' attribute is a user-defined custom attribute stored as user.attacker on Beacon.
//   Tokens with the 'fist' status marker are treated as the attack source.
//   The turn tracker listener automatically manages 'fist' and user.attacker on each turn change.
//
// PC vs NPC target detection:
//   Targets with a non-empty npc_challenge attribute are treated as NPCs.
//   HP for NPCs is read/written via token bar properties (bar1, bar3).
//   HP for PCs is read/written via 'hp' and 'hp_temp' character attributes.
//
// Resistance/immunity attributes:
//   Reads npc_resistances and npc_immunities for both PCs and NPCs.
//   On the 2024 Beacon sheets these are built-in attributes (not user.* custom fields).
//
// Dependencies: beacon/dependencies/askthedm_script_dependencies.js
//   Requires: askTheDMGetAttribute, askTheDMSetAttribute,
//             CR_ATTRIBUTE_REFERENCE, DamageToSave, DamageToVEffect

// --- Turn Tracker Listener: Manage 'fist' marker and user.attacker on each turn ---
on('change:campaign:turnorder', function(obj) {
	let turnorder;
	try {
		turnorder = JSON.parse(obj.get('turnorder') || '[]');
	} catch (e) {
		turnorder = [];
	}
	if (!Array.isArray(turnorder) || turnorder.length === 0) return;

	const currentId = turnorder[0] && turnorder[0].id;
	if (!currentId) return;

	const currentToken = getObj('graphic', currentId);
	const currentPageId = currentToken ? currentToken.get('pageid') : null;
	if (!currentPageId) return;

	const allTokens = findObjs({ type: 'graphic', subtype: 'token', pageid: currentPageId });
	for (const token of allTokens) {
		const isCurrent = (token.id === currentId);
		const charId = token.get('represents');

		// Manage fist marker
		let markers = (token.get('statusmarkers') || '').split(',').filter(Boolean);
		const hasFist = markers.includes('fist');
		if (isCurrent && !hasFist) {
			markers.push('fist');
			token.set('statusmarkers', markers.join(','));
		} else if (!isCurrent && hasFist) {
			markers = markers.filter(m => m !== 'fist');
			token.set('statusmarkers', markers.join(','));
		}

		// Update user.attacker attribute (fire-and-forget write, no await needed)
		if (charId && typeof askTheDMSetAttribute === 'function') {
			askTheDMSetAttribute(charId, 'attacker', isCurrent ? 'true' : 'false', undefined, { userDefined: true });
		}
	}
});

// Helper: double the dice count in a damage expression (e.g. 2d8+4 -> 4d8+4)
function doubleDiceExpression(expr) {
	return expr.replace(/(\d+)d(\d+)/g, function(match, dice, sides) {
		return (parseInt(dice, 10) * 2) + 'd' + sides;
	});
}

function parseCR(crVal) {
	if (typeof crVal === 'number') return crVal;
	if (typeof crVal === 'string') {
		crVal = crVal.trim();
		if (crVal.includes('/')) {
			const parts = crVal.split('/');
			const num = parseFloat(parts[0]);
			const denom = parseFloat(parts[1]);
			if (!isNaN(num) && !isNaN(denom) && denom !== 0) return num / denom;
		}
		const num = parseFloat(crVal);
		if (!isNaN(num)) return num;
	}
	return null;
}

function generateDiceExpression(targetDamage, isAttack) {
	if (targetDamage <= 1) return '1';
	if (!isAttack) {
		const spellDiceOptions = [
			{ die: 10, max: 8, avg: 5.5 },
			{ die: 8, max: 8, avg: 4.5 },
			{ die: 6, max: 20, avg: 3.5 },
			{ die: 4, max: 20, avg: 2.5 }
		];
		let best = null;
		let minDiff = Number.POSITIVE_INFINITY;
		for (const option of spellDiceOptions) {
			for (let numDice = 1; numDice <= option.max; numDice++) {
				const diceTotal = numDice * option.avg;
				const diff = targetDamage - diceTotal;
				if (diff < 0) continue;
				if (best === null || diff < minDiff || (diff === minDiff && numDice > best.num)) {
					best = { num: numDice, die: option.die };
					minDiff = diff;
				}
			}
		}
		return best ? (best.num + 'd' + best.die) : '1d4';
	}
	const allowedDice = [
		{ num: 1, die: 12, avg: 6.5 }, { num: 1, die: 10, avg: 5.5 },
		{ num: 2, die: 8, avg: 9 },    { num: 1, die: 8, avg: 4.5 },
		{ num: 2, die: 6, avg: 7 },    { num: 1, die: 6, avg: 3.5 },
		{ num: 3, die: 4, avg: 7.5 },  { num: 2, die: 4, avg: 5 },
		{ num: 1, die: 4, avg: 2.5 }
	];
	let best = null;
	let minDiff = Number.POSITIVE_INFINITY;
	const minMod = Math.ceil(targetDamage * 0.25);
	for (const dice of allowedDice) {
		const neededMod = Math.max(minMod, Math.floor(targetDamage - dice.avg));
		const finalTotal = dice.avg + neededMod;
		const diff = targetDamage - finalTotal;
		if (diff < 0) continue;
		if (best === null || diff < minDiff || (diff === minDiff && neededMod < best.mod)) {
			best = { num: dice.num, die: dice.die, mod: neededMod };
			minDiff = diff;
		}
	}
	if (!best) {
		let maxTotal = -1;
		for (const dice of allowedDice) {
			const baseMod = Math.ceil(targetDamage * 0.25);
			const total = dice.avg + baseMod;
			if (total > maxTotal && total < targetDamage) {
				best = { num: dice.num, die: dice.die, mod: baseMod };
				maxTotal = total;
			}
		}
	}
	if (best) {
		return best.mod > 0 ? (best.num + 'd' + best.die + '+' + best.mod) : (best.num + 'd' + best.die);
	}
	return '1d4';
}

function parseResistanceList(val) {
	if (!val) return [];
	return String(val).toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
}

on('chat:message', async function(msg) {
	if (msg.type !== 'api') return;

	// --- Toggle Attacker Command ---
	if (msg.content.startsWith('!toggleattacker')) {
		if (!msg.selected || msg.selected.length === 0) {
			sendChat('MonsterAttack', '/w gm Please select a token to toggle the attacker attribute.');
			return;
		}
		try {
			for (const sel of msg.selected) {
				const token = getObj('graphic', sel._id);
				if (!token) continue;
				const charId = token.get('represents');
				if (!charId) continue;

				// user.attacker is a user-defined custom attribute
				const currentVal = await getAttributeValue(charId, 'attacker', { userDefined: true });
				const isActive = (String(currentVal || '').toLowerCase() === 'true');
				const newVal = isActive ? 'false' : 'true';
				await setAttributeValue(charId, 'attacker', newVal, { userDefined: true });

				let markers = (token.get('statusmarkers') || '').split(',').filter(Boolean);
				if (newVal === 'true' && !markers.includes('fist')) {
					markers.push('fist');
				} else if (newVal === 'false') {
					markers = markers.filter(m => m !== 'fist');
				}
				token.set('statusmarkers', markers.join(','));
				sendChat('MonsterAttack', '/w gm Set attacker to ' + newVal + ' for ' + token.get('name'));
			}
		} catch (err) {
			const errorText = (err && err.message) ? err.message : String(err);
			sendChat('MonsterAttack', '/w gm Beacon toggleattacker error: ' + errorText);
		}
		return;
	}

	// --- Monster Attack / Spell Command ---
	if (!msg.content.startsWith('!monsterattack')) return;
	if (!msg.selected || msg.selected.length === 0) {
		sendChat('MonsterAttack', '/w gm Please select one or more target tokens before running the macro.');
		return;
	}

	try {
		// Parse args
		const args = {};
		if (msg.content.includes('--')) {
			msg.content.split('--').slice(1).forEach(arg => {
				const [key, ...rest] = arg.trim().split(' ');
				args[key] = rest.join(' ');
			});
		}

		// Build token list
		const selectedTokens = msg.selected.map(sel => {
			const token = getObj('graphic', sel._id);
			const character = token ? getObj('character', token.get('represents')) : null;
			return (token && character) ? { token, character } : null;
		}).filter(Boolean);

		if (selectedTokens.length === 0) {
			sendChat('MonsterAttack', '/w gm No valid tokens selected.');
			return;
		}

		// Find attacker by fist marker
		const attackers = selectedTokens.filter(({ token }) => {
			const markers = (token.get('statusmarkers') || '').split(',');
			return markers.includes('fist');
		});
		if (attackers.length > 1) {
			sendChat('MonsterAttack', '/w gm Too many attackers. Only one token should have the fist marker.');
			return;
		}
		if (attackers.length === 0) {
			sendChat('MonsterAttack', '/w gm No attacker found. Use !toggleattacker on one token to set the fist marker.');
			return;
		}

		const sourceToken = attackers[0].token;
		const sourceChar = attackers[0].character;
		const targetTokens = selectedTokens.filter(({ token }) => token.id !== sourceToken.id);

		if (targetTokens.length === 0) {
			sendChat('MonsterAttack', '/w gm No valid targets. Select at least one target in addition to the attacker.');
			return;
		}

		// Get attacker CR and stats
		const crRaw = await getAttributeValue(sourceChar.id, 'npc_challenge');
		const crKey = (crRaw && String(crRaw).trim()) ? String(crRaw).trim() : '1';
		const stats = (globalThis.CR_ATTRIBUTE_REFERENCE && globalThis.CR_ATTRIBUTE_REFERENCE[crKey]) || globalThis.CR_ATTRIBUTE_REFERENCE['1'];
		const attackBonus = stats.attack;
		const saveDC = stats.save;
		const minDmg = stats.damage[0];
		const maxDmg = stats.damage[1];
		const totalTurnDamage = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
		const crNum = parseCR(crKey);
		const totalActions = (crNum !== null && crNum < 1) ? 1 : (2 + Math.floor((crNum || 1) / 5));
		const damagePerAction = Math.max(1, Math.floor(totalTurnDamage / totalActions));
		const actionsUsed = parseInt(args.attacks) || 1;
		const attackDamage = damagePerAction * actionsUsed;
		const isAttackType = (args.type === 'Attack');
		const damageExpr = generateDiceExpression(attackDamage, isAttackType);
		const damageType = (args.primary || '').toLowerCase();

		// Pre-fetch all target data before entering sendChat callbacks
		const targetDataList = await Promise.all(targetTokens.map(async ({ token: playerToken, character: playerChar }) => {
			const crCheck = await getAttributeValue(playerChar.id, 'npc_challenge');
			const isNPC = (crCheck !== null && crCheck !== undefined && String(crCheck).trim() !== '');

			const acRaw = await getAttributeValue(playerChar.id, 'ac');
			const ac = parseInt(acRaw, 10) || 10;

			// On Beacon 2024 sheets, both PCs and NPCs use built-in npc_resistances/npc_immunities.
			const [npcRes, npcImm] = await Promise.all([
				getAttributeValue(playerChar.id, 'npc_resistances'),
				getAttributeValue(playerChar.id, 'npc_immunities')
			]);
			const resistances = parseResistanceList(npcRes);
			const immunities  = parseResistanceList(npcImm);

			// Pre-fetch PC HP (NPC HP comes from token bars, read synchronously below)
			let currentHP = 0;
			let tempHP = 0;
			if (!isNPC) {
				const [hpRaw, tempHPRaw] = await Promise.all([
					getAttributeValue(playerChar.id, 'hp'),
					getAttributeValue(playerChar.id, 'hp_temp')
				]);
				currentHP = parseInt(hpRaw, 10) || 0;
				tempHP    = parseInt(tempHPRaw, 10) || 0;
			}

			// Pre-fetch save bonus for spell attacks
			let saveMod = 0;
			if (!isAttackType) {
				const stat = (typeof globalThis.DamageToSave !== 'undefined' && globalThis.DamageToSave[damageType])
					? globalThis.DamageToSave[damageType].toLowerCase()
					: 'constitution';
				const saveBonusRaw = await getAttributeValue(playerChar.id, stat + '_save_bonus');
				saveMod = parseInt(saveBonusRaw, 10) || 0;
			}

			return { playerToken, playerChar, ac, isNPC, resistances, immunities, currentHP, tempHP, saveMod };
		}));

		// Helper: apply resistances and immunities to a damage amount
		function applyResistances(damageAmount, type, resistances, immunities) {
			if (immunities.includes(type)) return 0;
			if (resistances.includes(type)) return Math.max(1, Math.floor(damageAmount / 2));
			return damageAmount;
		}

		// Helper: apply damage to a target using pre-fetched data
		function applyDamageToTarget(targetData, appliedDamage) {
			const { playerToken, playerChar, isNPC, currentHP, tempHP } = targetData;
			if (isNPC) {
				// NPCs: use token bars directly (synchronous)
				let bar3 = parseInt(playerToken.get('bar3_value')) || 0;
				let remaining = appliedDamage;
				if (bar3 > 0) {
					const tempDmg = Math.min(bar3, remaining);
					playerToken.set('bar3_value', bar3 - tempDmg);
					remaining -= tempDmg;
				}
				if (remaining > 0) {
					const bar1 = parseInt(playerToken.get('bar1_value')) || 0;
					playerToken.set('bar1_value', Math.max(0, bar1 - remaining));
				}
			} else {
				// PCs: fire-and-forget Beacon writes
				let remaining = appliedDamage;
				if (tempHP > 0) {
					const tempDmg = Math.min(tempHP, remaining);
					if (typeof askTheDMSetAttribute === 'function') {
						askTheDMSetAttribute(playerChar.id, 'hp_temp', tempHP - tempDmg);
					}
					remaining -= tempDmg;
				}
				if (remaining > 0) {
					if (typeof askTheDMSetAttribute === 'function') {
						askTheDMSetAttribute(playerChar.id, 'hp', Math.max(0, currentHP - remaining));
					}
				}
			}
		}

		// Helper: trigger visual effect on target
		function triggerVFX(playerToken, vfxType) {
			if (typeof spawnFx === 'function' && typeof globalThis.DamageToVEffect !== 'undefined') {
				const vfxColor = globalThis.DamageToVEffect[damageType] || 'blood';
				spawnFx(playerToken.get('left'), playerToken.get('top'), vfxType + '-' + vfxColor, playerToken.get('pageid'));
			}
		}

		// Resistance/immunity label for output
		function resistLabel(damageType, resistances, immunities) {
			if (immunities.includes(damageType)) return ' [immunity]';
			if (resistances.includes(damageType)) return ' [resistance]';
			return '';
		}

		if (isAttackType) {
			// --- Attack ---
			const rollTypeArg = (args.rolltype || 'Normal').toLowerCase();
			let attackRollExpr;
			if (rollTypeArg === 'advantage') {
				attackRollExpr = '2d20kh1+' + attackBonus;
			} else if (rollTypeArg === 'disadvantage') {
				attackRollExpr = '2d20kl1+' + attackBonus;
			} else {
				attackRollExpr = '1d20+' + attackBonus;
			}

			for (const targetData of targetDataList) {
				const { playerToken, ac, resistances, immunities } = targetData;
				const targetName = playerToken.get('name');

				sendChat('', '/w gm [[' + attackRollExpr + ']]', function(ops) {
					const attackRoll = ops[0].inlinerolls[0].results.total;
					const hit = attackRoll >= ac;
					const isCritImmune = immunities.includes('criticals');
					const isCritical = ((attackRoll - attackBonus) === 20) && !isCritImmune;
					const resultText = hit ? (isCritical ? '**CRITICAL HIT**' : '**HIT**') : '**MISS**';

					if (hit) {
						const critExpr = isCritical ? doubleDiceExpression(damageExpr) : damageExpr;
						const diceLine = '**Dice:** ' + critExpr + (isCritical ? ' (critical)' : '');

						sendChat('', '/w gm [[' + critExpr + ']]', function(dmgOps) {
							const rolledDamage = dmgOps[0].inlinerolls[0].results.total;
							const appliedDamage = applyResistances(rolledDamage, damageType, resistances, immunities);

							applyDamageToTarget(targetData, appliedDamage);
							triggerVFX(playerToken, 'burn');

							const output =
								'**Monster Attack — ' + targetName + '**<br>' +
								'**Attack Roll:** ' + attackRoll + ' vs. AC ' + ac + '<br>' +
								'**Result:** ' + resultText + '<br>' +
								diceLine + '<br>' +
								'**Damage:** ' + rolledDamage + ' (' + (args.primary || 'unknown') + ')<br>' +
								'**Applied:** ' + appliedDamage + ' (' + (args.primary || 'unknown') + ')' + resistLabel(damageType, resistances, immunities);
							sendChat('MonsterAttack', output);
						});
					} else {
						const output =
							'**Monster Attack — ' + targetName + '**<br>' +
							'**Attack Roll:** ' + attackRoll + ' vs. AC ' + ac + '<br>' +
							'**Result:** ' + resultText;
						sendChat('MonsterAttack', output);
					}
				});
			}
		} else {
			// --- Spell: roll damage once, then each target saves ---
			const stat = (typeof globalThis.DamageToSave !== 'undefined' && globalThis.DamageToSave[damageType])
				? globalThis.DamageToSave[damageType].toLowerCase()
				: 'constitution';
			const diceLine = '**Dice:** ' + damageExpr;

			sendChat('', '/w gm [[' + damageExpr + ']]', function(dmgOps) {
				let baseDamage = dmgOps[0].inlinerolls[0].results.total;
				if (baseDamage < 1) baseDamage = 1;

				for (const targetData of targetDataList) {
					const { playerToken, resistances, immunities, saveMod } = targetData;
					const targetName = playerToken.get('name');
					const saveRollExpr = '1d20+' + saveMod;

					sendChat('', '/w gm [[' + saveRollExpr + ']]', function(ops) {
						const saveRoll = ops[0].inlinerolls[0].results.total;
						const success = saveRoll >= saveDC;
						const resultText = success ? '**SUCCESS**' : '**FAILURE**';

						let rolledDamage = baseDamage;
						let damageText;
						if (success) {
							if (args.resist === 'Half') {
								rolledDamage = Math.max(1, Math.floor(baseDamage / 2));
								damageText = '**Damage:** ' + rolledDamage + ' (' + (args.primary || 'unknown') + ') (half damage)';
							} else {
								rolledDamage = 0;
								damageText = '**Damage:** 0 (' + (args.primary || 'unknown') + ') (no damage)';
							}
						} else {
							damageText = '**Damage:** ' + rolledDamage + ' (' + (args.primary || 'unknown') + ')';
						}

						const appliedDamage = applyResistances(rolledDamage, damageType, resistances, immunities);

						if (appliedDamage > 0) {
							applyDamageToTarget(targetData, appliedDamage);
						}
						triggerVFX(playerToken, success ? 'glow' : 'burn');

						const statCap = stat.charAt(0).toUpperCase() + stat.slice(1);
						const output =
							'**Monster Spell — ' + targetName + '**<br>' +
							'**' + statCap + ' Save:** ' + saveRoll + ' vs. DC ' + saveDC + '<br>' +
							'**Result:** ' + resultText + '<br>' +
							diceLine + '<br>' +
							damageText + '<br>' +
							'**Applied:** ' + appliedDamage + ' (' + (args.primary || 'unknown') + ')' + resistLabel(damageType, resistances, immunities);
						sendChat('MonsterAttack', output);
					});
				}
			});
		}
	} catch (err) {
		const errorText = (err && err.message) ? err.message : String(err);
		sendChat('MonsterAttack', '/w gm Beacon monsterattack error: ' + errorText);
	}
});

async function getAttributeValue(characterId, attributeName, opts) {
	if (!characterId || !attributeName) return null;
	if (typeof askTheDMGetAttribute !== 'function') {
		throw new Error('askTheDMGetAttribute is unavailable. Load beacon/dependencies/askthedm_script_dependencies.js in the sandbox first.');
	}
	return askTheDMGetAttribute(characterId, attributeName, undefined, opts);
}

async function setAttributeValue(characterId, attributeName, value, opts) {
	if (!characterId || !attributeName) return;
	if (typeof askTheDMSetAttribute !== 'function') {
		throw new Error('askTheDMSetAttribute is unavailable. Load beacon/dependencies/askthedm_script_dependencies.js in the sandbox first.');
	}
	return askTheDMSetAttribute(characterId, attributeName, value, undefined, opts);
}
