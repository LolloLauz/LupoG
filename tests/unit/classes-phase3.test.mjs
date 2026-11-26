// Classi Fase 3: tabella di compatibilità classe x arma (preferite, malus, divieti), filtro del bottino con i sostituti,
// divieto in equipWeapon e nello zaino, munizioni secondo la classe, munizioni conservate nello zaino, peso delle armature.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "../helpers.mjs";

export const description = "Classi Fase 3: compatibilità armi e classi, sostituti nel bottino, divieti, munizioni nello zaino, peso";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { ABILITY_CONFIG } = await load("config/abilityConfig");
  const { ARMOR_CONFIG } = await load("config/armorConfig");
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const { BOSS_CATALOG } = await load("config/enemyConfig");
  const { WEAPON_AFFINITY_CONFIG, NEUTRAL_WEAPON_AFFINITY, PREFERRED_WEAPON_AFFINITY, PENALIZED_WEAPON_AFFINITY, getWeaponAffinity } = await load("config/weaponAffinityConfig");
  const { resolveLootWeaponId } = await load("systems/LootSystem");
  const { canWieldWeapon, describeWeaponAffinity, getWeaponMaxAmmo, FORBIDDEN_WEAPON_MESSAGE } = await load("systems/WeaponAffinity");
  const { Inventory } = await load("systems/Inventory");
  const { createArmorItem, createWeaponItem, getItemWeight } = await load("systems/ItemFactory");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const weaponIds = Object.keys(WEAPON_CONFIG);
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = () => ({ isHeld: () => false, wasPressed: () => false, wasReleased: () => false });
  const grounded = (characterId, weaponId = CHARACTER_CONFIG[characterId].startingWeaponId) => {
    const p = new Player(300, 176, CHARACTER_CONFIG[characterId]);
    p.equipWeapon(WEAPON_CONFIG[weaponId]);
    for (let i = 0; i < 5; i++) p.update(1 / 60, input(), collision, ground, 3000);
    return p;
  };

  // --- la tabella, cella per cella (I = arma iniziale, ×1; ★ preferita; ✓ neutra; ▼ malus; ✗ vietata) ---
  const EXPECTED = {
    knight: { sword: "I", dagger: "✓", spear: "★", axe: "✓", mace: "✓", greatsword: "★", bow: "▼", crossbow: "▼", throwingKnives: "▼", javelin: "✓", staff: "✗" },
    ranger: { sword: "✓", dagger: "✓", spear: "▼", axe: "▼", mace: "▼", greatsword: "✗", bow: "I", crossbow: "★", throwingKnives: "★", javelin: "★", staff: "✗" },
    berserker: { sword: "✓", dagger: "▼", spear: "✓", axe: "I", mace: "✓", greatsword: "★", bow: "▼", crossbow: "▼", throwingKnives: "▼", javelin: "✓", staff: "✗" },
    paladin: { sword: "★", dagger: "▼", spear: "✓", axe: "★", mace: "I", greatsword: "▼", bow: "▼", crossbow: "▼", throwingKnives: "▼", javelin: "▼", staff: "✗" },
    mage: { sword: "✓", dagger: "✓", spear: "✗", axe: "✗", mace: "✗", greatsword: "✗", bow: "✗", crossbow: "✗", throwingKnives: "✗", javelin: "✗", staff: "I" },
  };
  const SYMBOL_VALUES = { I: NEUTRAL_WEAPON_AFFINITY, "✓": NEUTRAL_WEAPON_AFFINITY, "★": PREFERRED_WEAPON_AFFINITY, "▼": PENALIZED_WEAPON_AFFINITY };
  t("valori per simbolo: ★ danno ×1,15 e munizioni ×1,5; ▼ danno ×0,85 e recupero ×1,15; ✓ tutto ×1",
    PREFERRED_WEAPON_AFFINITY.damageMultiplier === 1.15 && PREFERRED_WEAPON_AFFINITY.ammoMultiplier === 1.5 && PREFERRED_WEAPON_AFFINITY.recoveryMultiplier === 1 &&
      PENALIZED_WEAPON_AFFINITY.damageMultiplier === 0.85 && PENALIZED_WEAPON_AFFINITY.recoveryMultiplier === 1.15 && PENALIZED_WEAPON_AFFINITY.ammoMultiplier === 1 &&
      NEUTRAL_WEAPON_AFFINITY.damageMultiplier === 1 && NEUTRAL_WEAPON_AFFINITY.recoveryMultiplier === 1 && NEUTRAL_WEAPON_AFFINITY.ammoMultiplier === 1);
  for (const characterId of CHARACTER_ORDER) {
    for (const weaponId of weaponIds) {
      const symbol = EXPECTED[characterId][weaponId];
      const cell = getWeaponAffinity(characterId, weaponId);
      const isRight = symbol === "✗" ? !cell.isAllowed && cell.lootSubstituteId !== undefined : cell === SYMBOL_VALUES[symbol] && cell.isAllowed;
      t(`tabella: ${characterId} con ${weaponId} = ${symbol}`, isRight, JSON.stringify(cell));
    }
  }
  t("la ★ dell'arma iniziale vale ×1 per ogni classe", CHARACTER_ORDER.every((id) => getWeaponAffinity(id, CHARACTER_CONFIG[id].startingWeaponId) === NEUTRAL_WEAPON_AFFINITY));
  t("al massimo un divieto per le classi senza magia, oltre al bastone",
    CHARACTER_ORDER.filter((id) => id !== "mage").every((id) => weaponIds.filter((weaponId) => weaponId !== "staff" && !WEAPON_AFFINITY_CONFIG[id][weaponId].isAllowed).length <= 1));

  // --- sostituti nel bottino ---
  t("sostituti: spadone del Ranger → balestra; Mago: spadone → spada, le altre vietate → bastone; bastone delle altre classi → arma iniziale",
    resolveLootWeaponId("ranger", "greatsword") === "crossbow" && resolveLootWeaponId("mage", "greatsword") === "sword" &&
      ["spear", "axe", "mace", "bow", "crossbow", "throwingKnives", "javelin"].every((id) => resolveLootWeaponId("mage", id) === "staff") &&
      ["knight", "ranger", "berserker", "paladin"].every((id) => resolveLootWeaponId(id, "staff") === CHARACTER_CONFIG[id].startingWeaponId));
  t("ogni sostituto è un'arma permessa alla sua classe", CHARACTER_ORDER.every((id) => weaponIds.every((weaponId) => canWieldWeapon(id, resolveLootWeaponId(id, weaponId)))));
  t("le armi permesse non cambiano nel bottino", CHARACTER_ORDER.every((id) => weaponIds.filter((weaponId) => canWieldWeapon(id, weaponId)).every((weaponId) => resolveLootWeaponId(id, weaponId) === weaponId)));
  {
    // tutte le armi dei livelli (forzieri, élite, trofei dei boss) diventano armi impugnabili per ogni classe
    const levelWeapons = LEVEL_CONFIG.flatMap((level) => [
      ...(level.chests ?? []).map((chest) => chest.weaponId),
      ...level.enemies.flatMap((enemy) => (enemy.weaponDrop === undefined ? [] : [enemy.weaponDrop])),
    ]).concat(Object.values(BOSS_CATALOG).flatMap((boss) => (boss.weaponReward === undefined ? [] : [boss.weaponReward])));
    t("nessun drop dei livelli è inutilizzabile, per nessuna classe", levelWeapons.length > 0 && CHARACTER_ORDER.every((id) => levelWeapons.every((weaponId) => canWieldWeapon(id, resolveLootWeaponId(id, weaponId)))));
  }

  // --- mai senza un'arma ---
  t("l'arma iniziale di ogni classe è permessa e non sparisce a munizioni finite",
    CHARACTER_ORDER.every((id) => { const weapon = WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId]; return canWieldWeapon(id, weapon.id) && weapon.ammo?.isLostWhenEmpty !== true; }));
  t("l'arma di riserva della borsa (giavellotti finiti senza altre armi) è permessa a tutte le classi", CHARACTER_ORDER.every((id) => canWieldWeapon(id, "sword")));
  {
    const bag = new Inventory();
    bag.setCharacter("ranger");
    bag.reset(["bow"], "bow");
    t("l'ultima arma non va nello zaino", bag.moveWeaponToBackpack(0) === "lastWeapon" && bag.weaponIds.join() === "bow");
  }

  // --- divieto in equipWeapon ---
  {
    const ranger = grounded("ranger");
    const refused = ranger.equipWeapon(WEAPON_CONFIG.greatsword);
    t("equipWeapon rifiuta un'arma vietata (Ranger con lo spadone): false e l'arma non cambia", refused === false && ranger.equippedWeapon.id === "bow" && JSON.stringify(ranger.weaponAffinity) === JSON.stringify(NEUTRAL_WEAPON_AFFINITY));
    t("equipWeapon accetta le armi permesse", grounded("mage").equipWeapon(WEAPON_CONFIG.dagger) === true);
    t("messaggio del divieto", FORBIDDEN_WEAPON_MESSAGE === "NON PUOI USARLA");
  }

  // --- bonus e malus applicati ---
  {
    const paladin = grounded("paladin", "sword");
    const swordAttack = WEAPON_CONFIG.sword.attacks[WEAPON_CONFIG.sword.defaultAttackByInput.attack];
    t("★: il Paladino con la spada fa il 15% di danno in più con gli attacchi della spada", Math.abs(paladin.getDamageMultiplierFor(swordAttack) / paladin.getDamageMultiplier() - 1.15) < 1e-9);
    const knightBow = grounded("knight", "bow");
    const bowAttack = WEAPON_CONFIG.bow.attacks[WEAPON_CONFIG.bow.defaultAttackByInput.attack];
    t("▼: il Cavaliere con l'arco fa il 15% di danno in meno con le frecce", Math.abs(knightBow.getDamageMultiplierFor(bowAttack) / knightBow.getDamageMultiplier() - 0.85) < 1e-9);
    t("▼: recupero più lento del 15%", knightBow.weaponAffinity.recoveryMultiplier === 1.15);
    const shockwave = ABILITY_CONFIG.shockwave.attack;
    t("la tabella non tocca le abilità: l'onda d'urto del Cavaliere con l'arco ha il danno pieno", knightBow.getDamageMultiplierFor(shockwave) === knightBow.getDamageMultiplier() && knightBow.getDamageMultiplier() === grounded("knight").getDamageMultiplier());
    const ranger = grounded("ranger", "crossbow");
    t("né gli incantesimi o le mosse delle altre classi", ranger.getDamageMultiplierFor(ABILITY_CONFIG.backstepShot.attack) === ranger.getDamageMultiplier());
    t("motore: il recupero sente la tabella solo per gli attacchi dell'arma", /private getAttackCooldownMs[\s\S]{0,200}this\.isWeaponAttack\(attack\) \? this\.weaponAffinity\.recoveryMultiplier \* this\.strengthPenalties\.weaponRecoveryMultiplier : 1/.test(readFileSync(join(projectRoot, "src/entities/Player.ts"), "utf8")));
  }

  // --- munizioni secondo la classe ---
  t("munizioni ★ del Ranger: coltelli 9, balestra 9, giavellotti 4 (per difetto); arco 12 (iniziale)",
    getWeaponMaxAmmo("ranger", "throwingKnives") === 9 && getWeaponMaxAmmo("ranger", "crossbow") === 9 && getWeaponMaxAmmo("ranger", "javelin") === 4 && getWeaponMaxAmmo("ranger", "bow") === 12);
  t("munizioni delle altre classi: quelle dell'arma; armi senza munizioni: infinite",
    getWeaponMaxAmmo("knight", "throwingKnives") === 6 && getWeaponMaxAmmo(null, "javelin") === 3 && getWeaponMaxAmmo("ranger", "sword") === undefined);
  {
    const ranger = grounded("ranger", "throwingKnives");
    t("il Ranger impugna i coltelli con 9 munizioni", ranger.currentAmmo === 9 && ranger.maxAmmo === 9);
    ranger.setAmmo(20);
    t("setAmmo non supera il massimo della classe", ranger.currentAmmo === 9);
    const bag = new Inventory();
    bag.setCharacter("ranger");
    bag.reset(["bow"], "bow");
    bag.addWeapon("throwingKnives");
    t("borsa del Ranger: i coltelli entrano con 9 munizioni", bag.equippedAmmo === 9);
    bag.setEquippedAmmo(3);
    t("le munizioni recuperate arrivano fino a 9", bag.addAmmo("throwingKnives", 10) && bag.equippedAmmo === 9);
    bag.setEquippedAmmo(1);
    t("la faretra riempie fino al massimo della classe", bag.refillAllAmmo() && bag.equippedAmmo === 9);
    bag.setEquippedAmmo(2);
    t("raccogliendo gli stessi coltelli tornano a 9", bag.addWeapon("throwingKnives").outcome === "refilled" && bag.equippedAmmo === 9);
  }

  // --- munizioni conservate nello zaino ---
  {
    const bag = new Inventory();
    bag.reset(["sword", "throwingKnives"], "throwingKnives");
    bag.setEquippedAmmo(2);
    t("arma nello zaino con le sue munizioni", bag.moveWeaponToBackpack(1) === "unequipped" && bag.getBackpackAmmo(0) === 2);
    const snapshot = bag.snapshot();
    t("ripresa dallo zaino: stesse munizioni (non piene)", bag.equipFromBackpack(0) === "equipped" && bag.equippedWeaponId === "throwingKnives" && bag.equippedAmmo === 2);
    bag.restore(snapshot);
    t("lo snapshot di inizio livello conserva le munizioni dello zaino", bag.getBackpackAmmo(0) === 2 && bag.equipFromBackpack(0) === "equipped" && bag.equippedAmmo === 2);
    bag.setEquippedAmmo(1);
    bag.addToBackpack(createWeaponItem("javelin"));
    // l'arma dello zaino prende il posto di quella in mano (borsa con un posto libero: va lì), poi torna indietro con le munizioni
    const full = new Inventory(2);
    full.reset(["sword", "throwingKnives"], "throwingKnives");
    full.setEquippedAmmo(4);
    full.addToBackpack(createWeaponItem("axe"));
    t("scambio con lo zaino: l'arma che esce conserva le munizioni", full.equipFromBackpack(0) === "equipped" && full.equippedWeaponId === "axe" && full.getBackpackAmmo(0) === 4);
    const entry = full.removeFromBackpack(0);
    t("lasciata a terra dallo zaino, l'arma porta con sé le munizioni", entry?.item.baseId === "throwingKnives" && entry?.ammo === 4);
    const swap = new Inventory(2);
    swap.reset(["sword", "throwingKnives"], "throwingKnives");
    swap.setEquippedAmmo(5);
    const result = swap.addWeapon("axe");
    t("borsa piena: l'arma scambiata va nello zaino con le sue munizioni", result.outcome === "swapped" && result.droppedAmmo === 5 && swap.addToBackpack(result.droppedItem, result.droppedAmmo) && swap.getBackpackAmmo(0) === 5);
    t("un oggetto messo nello zaino senza munizioni indicate è pieno", bag.getBackpackAmmo(bag.backpackItems.length - 1) === 3);
  }

  // --- divieto nello zaino ---
  {
    const bag = new Inventory();
    bag.setCharacter("mage");
    bag.reset(["staff"], "staff");
    bag.addToBackpack(createWeaponItem("axe"));
    t("un'arma vietata nello zaino resta lì e non si impugna", bag.equipFromBackpack(0) === "forbidden" && bag.backpackItems[0].baseId === "axe" && bag.equippedWeaponId === "staff");
  }

  // --- riga di classe (equipaggiamento e bottega) ---
  t("riga di classe: ★ in verde con danno e munizioni (solo armi con munizioni)",
    describeWeaponAffinity(PREFERRED_WEAPON_AFFINITY, "throwingKnives")?.text === "CLASSE: DANNO +15% MUNIZIONI +50%" && describeWeaponAffinity(PREFERRED_WEAPON_AFFINITY, "spear")?.text === "CLASSE: DANNO +15%" &&
      describeWeaponAffinity(PREFERRED_WEAPON_AFFINITY, "spear")?.tone === "bonus");
  t("riga di classe: ▼ in rosso, vietata = NON PUOI USARLA, neutra = nessuna riga",
    describeWeaponAffinity(PENALIZED_WEAPON_AFFINITY, "bow")?.text === "CLASSE: DANNO -15% RECUPERO +15%" && describeWeaponAffinity(PENALIZED_WEAPON_AFFINITY, "bow")?.tone === "malus" &&
      describeWeaponAffinity(getWeaponAffinity("mage", "axe"), "axe")?.text === FORBIDDEN_WEAPON_MESSAGE && describeWeaponAffinity(NEUTRAL_WEAPON_AFFINITY, "sword") === null);

  // --- peso delle armature (solo dato) ---
  t("peso delle armature: stoffa 1, cuoio 2, ferro 3, acciaio 4; la corazza vale il doppio",
    ARMOR_CONFIG.clothHelmet.weight === 1 && ARMOR_CONFIG.leatherBoots.weight === 2 && ARMOR_CONFIG.ironChest.weight === 6 && ARMOR_CONFIG.steelChest.weight === 8 && ARMOR_CONFIG.steelHelmet.weight === 4);
  t("ogni pezzo d'armatura ha un peso intero positivo", Object.values(ARMOR_CONFIG).every((piece) => Number.isInteger(piece.weight) && piece.weight > 0));
  t("peso di un oggetto: quello del suo tipo", getItemWeight(createWeaponItem("greatsword")) === WEAPON_CONFIG.greatsword.weight && getItemWeight(createArmorItem("steelChest")) === 8);

  // --- motore ---
  t("motore: a ogni nuova partita l'inventario riceve la classe", /private resetRunEquipment[\s\S]{0,120}this\.inventory\.setCharacter\(this\.progressManager\.characterId\)/.test(engineSource));
  t("motore: un'arma vietata a terra non si raccoglie (NON PUOI USARLA)", /private pickUpEquipment[\s\S]{0,1200}!canWieldWeapon\(this\.player\.characterDefinition\.id, item\.baseId\)[\s\S]{0,120}FORBIDDEN_WEAPON_MESSAGE/.test(engineSource));
  t("motore: dallo zaino a terra con le munizioni", /removeFromBackpack\(cell\.index\)[\s\S]{0,200}droppedAmmo = entry\?\.ammo \?\? null[\s\S]{0,200}weaponPickups\.spawn\(dropped, centerX, feetY, false, droppedAmmo\)/.test(engineSource));
  t("motore: l'arma che esce dalla borsa piena va nello zaino con le munizioni", /addToBackpack\(result\.droppedItem, result\.droppedAmmo \?\? null\)/.test(engineSource));
}
