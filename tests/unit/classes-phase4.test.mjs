// Classi Fase 4: attributi con effetti (base neutra, punti spesi sopra la base), scaling delle armi, requisiti di Forza
// morbidi e carico, gradi delle mosse con requisito di Intelligenza, power-up sugli attributi, punti della partita,
// pentagono, altare della bottega e HUD.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Classi Fase 4: attributi, scaling delle armi, requisiti di Forza e carico, gradi delle mosse, punti, pentagono";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { ABILITY_CONFIG } = await load("config/abilityConfig");
  const { AFFIX_CONFIG } = await load("config/affixConfig");
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const { POWER_UP_CONFIG } = await load("config/powerUpConfig");
  const { PALETTE } = await load("config/gameConfig");
  const config = await load("config/attributeConfig");
  const { ATTRIBUTE_CONFIG, ATTRIBUTE_ORDER, ATTRIBUTE_MAX_VALUE, ATTRIBUTE_POINTS_CONFIG, ZERO_ATTRIBUTES, SPELL_GRADE_INT_REQUIREMENT } = config;
  const stats = await load("systems/AttributeStats");
  const { AttributePoints } = await load("systems/AttributePoints");
  const { createArmorItem, createWeaponItem } = await load("systems/ItemFactory");
  const { getWeaponAffinity } = await load("config/weaponAffinityConfig");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { getPolygonSpans, getPentagonVertices, getLinePixels } = await load("ui/PentagonChart");
  const { ScreenManager } = await load("ui/ScreenManager");
  const { HUDManager } = await load("ui/HUDManager");
  const { SHOP_ROOM_CONFIG } = await load("config/shopRoomConfig");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (pressed = []) => ({ isHeld: (a) => pressed.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const step = (p, pressed = [], frames = 1) => {
    for (let i = 0; i < frames; i++) p.update(1 / 60, input(i === 0 ? pressed : []), collision, ground, 3000);
  };
  const grounded = (characterId, weaponId = CHARACTER_CONFIG[characterId].startingWeaponId) => {
    const p = new Player(300, 176, CHARACTER_CONFIG[characterId]);
    p.equipWeapon(WEAPON_CONFIG[weaponId]);
    step(p, [], 5);
    return p;
  };
  const spent = (partial) => ({ ...ZERO_ATTRIBUTES, ...partial });
  const weaponAttack = (weaponId) => WEAPON_CONFIG[weaponId].attacks[WEAPON_CONFIG[weaponId].defaultAttackByInput.attack];

  // --- dati ---
  const EXPECTED_BASES = {
    knight: [6, 5, 2, 6, 6],
    ranger: [3, 9, 3, 4, 6],
    berserker: [9, 4, 1, 8, 3],
    paladin: [6, 2, 4, 7, 6],
    mage: [2, 4, 10, 4, 5],
  };
  for (const id of CHARACTER_ORDER) {
    const base = CHARACTER_CONFIG[id].baseAttributes;
    t(`${id}: basi decise (FOR DES INT VIT TEM), somma 25, entro il massimo`, JSON.stringify(ATTRIBUTE_ORDER.map((a) => base[a])) === JSON.stringify(EXPECTED_BASES[id]) && ATTRIBUTE_ORDER.reduce((sum, a) => sum + base[a], 0) === 25 && ATTRIBUTE_ORDER.every((a) => base[a] >= 0 && base[a] <= ATTRIBUTE_MAX_VALUE));
  }
  t("massimo 20; punti: 3 a livello e 2 per boss; gradi: INT 12 e 16", ATTRIBUTE_MAX_VALUE === 20 && ATTRIBUTE_POINTS_CONFIG.perLevelCompleted === 3 && ATTRIBUTE_POINTS_CONFIG.perBossDefeated === 2 && SPELL_GRADE_INT_REQUIREMENT[1] === 0 && SPELL_GRADE_INT_REQUIREMENT[2] === 12 && SPELL_GRADE_INT_REQUIREMENT[3] === 16);
  t("ogni effetto per punto ha un'etichetta e una statistica", ATTRIBUTE_ORDER.every((a) => ATTRIBUTE_CONFIG[a].effectsPerPoint.every((e) => e.label.length > 0 && typeof e.valuePerPoint === "number")));
  t("tutte le mosse hanno un grado; quelle di oggi sono di grado 1", Object.values(ABILITY_CONFIG).every((ability) => ability.grade === 1));
  {
    const spendable = LEVEL_CONFIG.filter((level) => LEVEL_CONFIG.some((other) => other.id === level.id + 1)).reduce((sum, level) => sum + AttributePoints.pointsForLevel(level.hasBoss), 0);
    t("punti spendibili prima dell'ultimo livello: 26 (6 livelli, boss nei livelli 3-6)", spendable === 26, String(spendable));
  }

  // --- base neutra: senza punti spesi tutto come nella 2.3 ---
  for (const id of CHARACTER_ORDER) {
    const p = grounded(id);
    const attack = weaponAttack(CHARACTER_CONFIG[id].startingWeaponId);
    const s = p.strengthStatus;
    t(`${id}: senza punti spesi nessun effetto, nessun malus con l'arma iniziale`, p.modifiers.getSourceEffects("attributes").length === 0 && p.maxHealth === CHARACTER_CONFIG[id].maxHealth && p.maxStamina === CHARACTER_CONFIG[id].maxStamina && p.maxMana === CHARACTER_CONFIG[id].maxMana && p.getDamageMultiplierFor(attack) === p.getDamageMultiplier() * getWeaponAffinity(id, CHARACTER_CONFIG[id].startingWeaponId).damageMultiplier && s.weaponDamageMultiplier === 1 && s.weaponRecoveryMultiplier === 1 && s.movementSpeedMultiplier === 1 && p.dodgeStaminaCost === CHARACTER_CONFIG[id].dodgeStaminaCost && p.getDefenseMultiplier() === 1 && p.getRecoveryMultiplier() === 1 && p.getResistanceFraction("fire") === 0);
  }

  // --- calcoli puri ---
  {
    const effective = stats.computeEffectiveAttributes(CHARACTER_CONFIG.mage.baseAttributes, spent({ intelligence: 8 }), { intelligence: 5, strength: -10 });
    t("valore effettivo: base + spesi + power-up, tra 0 e 20", effective.intelligence === 20 && effective.strength === 0 && effective.vitality === 4);
    const above = stats.getPointsAboveBase(effective, CHARACTER_CONFIG.mage.baseAttributes);
    t("punti sopra la base: mai negativi", above.intelligence === 10 && above.strength === 0);
    const effects = stats.computeAttributeEffects(spent({ intelligence: 5, vitality: 2 }), false);
    t("senza mana: l'INT dà solo la potenza delle mosse", effects.some((e) => e.stat === "abilityPowerPercent" && e.value === 10) && !effects.some((e) => e.stat === "maxManaBonus" || e.stat === "manaRegenPercent" || e.stat === "spellCostReductionPercent"));
    const manaEffects = stats.computeAttributeEffects(spent({ intelligence: 5 }), true);
    t("con il mana: mana +4, rigenerazione +3% e costo -1% per punto", manaEffects.some((e) => e.stat === "maxManaBonus" && e.value === 20) && manaEffects.some((e) => e.stat === "manaRegenPercent" && e.value === 15) && manaEffects.some((e) => e.stat === "spellCostReductionPercent" && e.value === 5));
    t("righe degli effetti già scritte", JSON.stringify(stats.describeAttributeEffects("vitality", 4, false)) === JSON.stringify(["SALUTE +16", "DIFESA +2%"]) && stats.describeAttributeEffects("dexterity", 3, false).includes("COSTO SCHIVATA -4,5%"));
    t("tetto condiviso: senza punti torna l'equipaggiamento, con i punti al massimo il tetto", stats.combineCappedFraction(0.2, 0, 25) === 0.2 && near(stats.combineCappedFraction(0.2, 10, 25), 0.25) && near(stats.combineCappedFraction(0.1, 5, 25), 0.15));
  }

  // --- scaling delle armi: principale 3%, secondario 1% ---
  {
    const scaling = (weaponId, partial) => stats.getWeaponScalingMultiplier(WEAPON_CONFIG[weaponId], spent(partial));
    t("spada: FOR 3% per punto (principale e secondario coincidono: conta una volta)", near(scaling("sword", { strength: 5 }), 1.15) && scaling("sword", { dexterity: 5 }) === 1);
    t("pugnale: DES 3% e FOR 1% per punto", near(scaling("dagger", { dexterity: 4 }), 1.12) && near(scaling("dagger", { strength: 10 }), 1.1) && near(scaling("dagger", { strength: 10, dexterity: 4 }), 1.22));
    t("bastone: INT 3% e FOR 1%", near(scaling("staff", { intelligence: 10, strength: 2 }), 1.32));
    t("arco: solo DES (la FOR non conta a distanza)", near(scaling("bow", { dexterity: 5 }), 1.15) && scaling("bow", { strength: 10 }) === 1);
    t("giavellotto: secondario DES come il principale", near(scaling("javelin", { dexterity: 2, strength: 5 }), 1.06));
    const knight = grounded("knight");
    knight.setSpentAttributes(spent({ strength: 5 }));
    t("giocatore: la Forza spesa aumenta il danno degli attacchi della spada", near(knight.getDamageMultiplierFor(weaponAttack("sword")), knight.getDamageMultiplier() * 1.15));
    t("...ma non quello delle mosse", knight.getDamageMultiplierFor(ABILITY_CONFIG.shockwave.attack) === knight.getDamageMultiplier());
  }

  // --- requisiti di Forza (morbidi) e carico ---
  {
    const requirement = (id) => stats.getWeaponStrengthRequirement(WEAPON_CONFIG[id]);
    t("requisiti delle armi: lancia 3, ascia e mazza 6, spadone 9", requirement("spear") === 3 && requirement("axe") === 6 && requirement("mace") === 6 && requirement("greatsword") === 9);
    t("nessun requisito per spada, pugnale, bastone, archi e armi da lancio", ["sword", "dagger", "staff", "bow", "crossbow", "throwingKnives", "javelin"].every((id) => requirement(id) === 0));
    t("requisito delle armature = peso del pezzo", stats.getItemStrengthRequirement(createArmorItem("steelChest")) === 8 && stats.getItemStrengthRequirement(createArmorItem("ironChest")) === 6 && stats.getItemStrengthRequirement(createWeaponItem("greatsword")) === 9);
    const knight = grounded("knight", "greatsword");
    t("Cavaliere (FOR 6) con lo spadone: -12% danno, +12% recupero", knight.strengthStatus.weaponMissingStrength === 3 && near(knight.strengthStatus.weaponDamageMultiplier, 0.88) && near(knight.strengthStatus.weaponRecoveryMultiplier, 1.12));
    t("...che annulla circa il ★ (×1,15)", near(knight.getDamageMultiplierFor(weaponAttack("greatsword")) / knight.getDamageMultiplier(), 1.15 * 0.88));
    knight.setSpentAttributes(spent({ strength: 3 }));
    t("con 3 punti in Forza il malus sparisce (resta lo scaling)", knight.strengthStatus.weaponMissingStrength === 0 && near(knight.getDamageMultiplierFor(weaponAttack("greatsword")) / knight.getDamageMultiplier(), 1.15 * 1.09));
    t("Berserker (FOR 9) e Paladino (FOR 6) con la mazza: nessun malus", grounded("berserker", "greatsword").strengthStatus.weaponMissingStrength === 0 && grounded("paladin", "mace").strengthStatus.weaponMissingStrength === 0);
    const capped = stats.computeStrengthPenalties(0, { ...WEAPON_CONFIG.greatsword, weight: 20 }, []);
    t("malus dei requisiti entro il 40%", near(capped.weaponDamageMultiplier, 0.6) && near(capped.weaponRecoveryMultiplier, 1.4));

    const armored = grounded("knight");
    armored.setArmor({ helmet: createArmorItem("ironHelmet"), chest: createArmorItem("ironChest"), boots: createArmorItem("ironBoots") });
    t("Cavaliere in ferro completo: carico 14/14, nessun malus", armored.strengthStatus.load === 14 && armored.strengthStatus.carryCapacity === 14 && armored.strengthStatus.movementSpeedMultiplier === 1);
    armored.setArmor({ helmet: createArmorItem("steelHelmet"), chest: createArmorItem("steelChest"), boots: createArmorItem("steelBoots") });
    t("in acciaio: pettorale -2 FOR (-6%) e 4 di carico in più (-12%)", armored.strengthStatus.armorMissingStrength === 2 && armored.strengthStatus.load === 18 && near(armored.strengthStatus.movementSpeedMultiplier, 0.94 * 0.88));
    const x0 = armored.positionX;
    const plain = grounded("knight");
    const xPlain = plain.positionX;
    for (let i = 0; i < 60; i++) {
      armored.update(1 / 60, input(["moveRight"]), collision, ground, 3000);
      plain.update(1 / 60, input(["moveRight"]), collision, ground, 3000);
    }
    const ratio = (armored.positionX - x0) / (plain.positionX - xPlain);
    t("il malus rallenta davvero la camminata", ratio < 0.85, ratio.toFixed(3));
    armored.setSpentAttributes(spent({ strength: 4 }));
    t("con 4 punti in Forza: carico 18/18 e nessun malus", armored.strengthStatus.carryCapacity === 18 && armored.strengthStatus.movementSpeedMultiplier === 1);
    const carryCapped = stats.computeStrengthPenalties(0, WEAPON_CONFIG.sword, [30]);
    t("malus del carico entro il 30% (con quello dei requisiti al 40%)", near(carryCapped.movementSpeedMultiplier, 0.6 * 0.7));
  }

  // --- effetti dei punti spesi sul giocatore ---
  {
    const p = grounded("knight");
    p.setSpentAttributes(spent({ vitality: 5, endurance: 5, dexterity: 10 }));
    t("VIT: salute +4 per punto, difesa +0,5% per punto", p.maxHealth === CHARACTER_CONFIG.knight.maxHealth + 20 && near(p.getDefenseMultiplier(), 0.975));
    t("TEM: stamina +4 per punto, resistenze +1% per punto (solo ai colpi con elemento)", p.maxStamina === CHARACTER_CONFIG.knight.maxStamina + 20 && near(p.getResistanceFraction("frost"), 0.05) && p.getResistanceFraction(undefined) === 0);
    t("DES: recupero -1% per punto, schivata -1,5% per punto", near(p.getRecoveryMultiplier(), 0.9) && near(p.dodgeStaminaCost, CHARACTER_CONFIG.knight.dodgeStaminaCost * 0.85));
    p.setArmor({ helmet: createArmorItem("steelHelmet", "epic", [{ id: "defense", value: 8 }]), chest: createArmorItem("steelChest", "epic", [{ id: "defense", value: 8 }]), boots: createArmorItem("steelBoots", "epic", [{ id: "defense", value: 8 }]) });
    t("difesa delle armature e della VIT sotto lo stesso tetto (25%)", near(p.getDefenseMultiplier(), 1 - AFFIX_CONFIG.defense.cap / 100));
    const health = p.currentHealth;
    p.takeDamage(40, 0);
    t("il danno subito usa la difesa combinata", health - p.currentHealth === Math.round(40 * 0.75), `${health - p.currentHealth}`);
  }
  {
    const p = grounded("knight");
    const before = p.getDamageMultiplierFor(ABILITY_CONFIG.shockwave.attack);
    p.setSpentAttributes(spent({ intelligence: 5 }));
    t("INT per tutte le classi: potenza delle mosse +2% per punto", near(p.getDamageMultiplierFor(ABILITY_CONFIG.shockwave.attack), before * 1.1) && p.maxMana === 0);
    const mage = grounded("mage");
    const fireball = ABILITY_CONFIG[CHARACTER_CONFIG.mage.abilityIds[0]];
    const costBefore = mage.getAbilityCost(fireball).mana;
    mage.setSpentAttributes(spent({ intelligence: 10 }));
    t("Mago: mana +40 con 10 punti, costo degli incantesimi -10% (con il bastone)", mage.maxMana === CHARACTER_CONFIG.mage.maxMana + 40 && mage.getAbilityCost(fireball).mana === Math.round((fireball.cost.mana ?? 0) * WEAPON_CONFIG.staff.spellFocus.manaCostMultiplier * 0.9) && mage.getAbilityCost(fireball).mana <= costBefore);
  }

  // --- gradi delle mosse: requisito rigido di INT ---
  {
    // solo per la prova: le mosse di oggi sono tutte di grado 1. Si cambia la copia letta dal giocatore
    const p = grounded("knight");
    const shockwave = p.abilities[0];
    shockwave.grade = 2;
    try {
      const status = p.abilitySlots[0];
      t("grado 2 con INT 2: lo slot non è pronto e lo dice", status.meetsRequirement === false && status.isReady === false && !p.isAbilityReady);
      const stamina = p.stamina;
      step(p, ["ability1"], 2);
      t("premendo il tasto la mossa non parte e compare INTELLIGENZA INSUFFICIENTE (niente stamina spesa)", p.activeAttack === null && p.stamina === stamina && p.drainLowIntelligence() && !p.drainLowIntelligence());
      p.setSpentAttributes(spent({ intelligence: 10 }));
      t("con INT 12 il grado 2 si usa", p.abilitySlots[0].meetsRequirement && p.isAbilityReady);
      step(p, ["ability1"], 2);
      t("...e la mossa parte", p.activeAttack === shockwave.attack);
      t("grado 3: serve INT 16", !stats.meetsGradeRequirement(3, 15) && stats.meetsGradeRequirement(3, 16));
    } finally {
      shockwave.grade = 1;
    }
  }

  // --- power-up sugli attributi ---
  {
    const p = grounded("knight");
    const giant = { ...POWER_UP_CONFIG.berserk, id: "berserk", effects: [], attributeBonuses: { vitality: 5, strength: 30 }, durationMs: 200 };
    p.applyPowerUp(giant);
    t("un power-up sugli attributi passa per gli stessi effetti (VIT +5 = salute +20)", p.maxHealth === CHARACTER_CONFIG.knight.maxHealth + 20 && p.getAttributePowerUpBonus("vitality") === 5);
    t("...senza toccare base e punti spesi, e restando entro 20", p.spentAttributes.vitality === 0 && p.baseAttributes.vitality === 6 && p.attributes.strength === 20);
    p.heal(1000);
    step(p, [], 20);
    t("allo scadere tutto torna come prima (salute entro il nuovo massimo)", p.maxHealth === CHARACTER_CONFIG.knight.maxHealth && p.currentHealth <= p.maxHealth && p.attributes.strength === 6);
  }

  // --- punti della partita ---
  {
    const points = new AttributePoints();
    t("si parte senza punti", points.unspent === 0 && points.spend("strength", 6) === "noPoints");
    points.award(AttributePoints.pointsForLevel(false));
    points.award(AttributePoints.pointsForLevel(true));
    t("3 a fine livello, 5 con il boss", points.unspent === 8);
    const saved = points.snapshot();
    t("si spende un punto alla volta", points.spend("strength", 6) === "spent" && points.unspent === 7 && points.spent.strength === 1);
    t("non oltre il massimo (base + spesi = 20)", points.spend("intelligence", 20) === "atMax" && points.unspent === 7);
    points.restore(saved);
    t("lo snapshot di inizio livello rimette i punti com'erano", points.unspent === 8 && points.spent.strength === 0);
    points.reset();
    t("nuova partita: nessun punto", points.unspent === 0 && ATTRIBUTE_ORDER.every((a) => points.spent[a] === 0));
  }

  // --- pentagono ---
  {
    const square = getPolygonSpans([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }]);
    t("riempimento a righe: un quadrato 4x3 dà 3 righe da 4 pixel", square.length === 3 && square.every((span) => span.x1 === 0 && span.x2 === 3));
    const vertices = getPentagonVertices(100, 100, 50, [20, 20, 20, 20, 20], 20);
    t("pentagono: cinque vertici, il primo in alto sul raggio pieno", vertices.length === 5 && near(vertices[0].x, 100) && near(vertices[0].y, 50));
    t("valori a zero: tutti al centro", getPentagonVertices(100, 100, 50, [0, 0, 0, 0, 0], 20).every((v) => near(v.x, 100) && near(v.y, 100)));
    const line = getLinePixels({ x: 0, y: 0 }, { x: 5, y: 2 });
    t("segmento: estremi compresi, pixel contigui", line[0].x === 0 && line.at(-1).x === 5 && line.at(-1).y === 2 && line.every((pixel, index) => index === 0 || Math.max(Math.abs(pixel.x - line[index - 1].x), Math.abs(pixel.y - line[index - 1].y)) === 1));
  }

  // --- schermata degli attributi ---
  {
    const screens = new ScreenManager(new FakeSpriteManager());
    const rows = ATTRIBUTE_ORDER.map((id) => ({ id, name: ATTRIBUTE_CONFIG[id].name, shortName: ATTRIBUTE_CONFIG[id].shortName, base: 5, spent: 0, bonus: 0, effective: 5, effectLines: [] }));
    const make = (mode) => ({ levels: [], unlockedCharacterIds: ["knight"], shopOffers: [], characterId: "knight", attributes: { mode, unspentPoints: 3, maxValue: 20, rows, statusLines: [] } });
    const press = (stateName, action, data) => screens.update(stateName, { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
    press("attributes", "menuDown", make("spend"));
    t("frecce: si sceglie l'attributo", screens.selectedAttributeId === "dexterity");
    t("all'altare J e Invio assegnano un punto", press("attributes", "assignPoint", make("spend")) === "assignAttributePoint" && press("attributes", "confirm", make("spend")) === "assignAttributePoint");
    t("dall'equipaggiamento solo lettura: J non fa niente", press("attributes", "assignPoint", make("view")) === null);
    t("Esc, P e I chiudono", ["pause", "openAttributes", "openEquipment"].every((action) => press("attributes", action, make("view")) === "closeAttributes"));
    t("dall'equipaggiamento P apre il pentagono", press("equipment", "openAttributes", { ...make("view"), equipment: { armor: {}, bag: [], backpack: [], backpackCapacity: 12, activeSets: [], bonuses: {} } }) === "showAttributes");
  }

  // --- HUD ---
  {
    const texts = [];
    const fills = [];
    const renderer = { width: 320, height: 240, fillRect: (x, y, w, h, color) => fills.push(color), drawText: (text) => texts.push(text), fillVerticalGradient() {}, fillDithered() {}, fillGlow() {}, strokeRect() {}, fillDitheredOverlay() {} };
    const abilities = [{ cooldownFraction: 0, isReady: false, isAffordable: true, isSelected: true, isActive: false, meetsRequirement: false, isKnown: true }];
    new HUDManager().render(renderer, { drawSprite() {}, drawSpriteSilhouette() {} }, { health: 100, maxHealth: 100, stamina: 100, maxStamina: 100, mana: 0, maxMana: 0, abilities, lives: 3, score: 0, coins: 0, levelNumber: 2, bag: [], powerUps: [], boss: null, unspentAttributePoints: 3 }, 0);
    t("HUD: con punti da spendere compare +N PUNTI", texts.includes("+3 PUNTI"));
    t("HUD: una mossa oltre il grado ha il riquadro grigio scuro", fills.includes(PALETTE.stoneDark));
  }

  // --- motore ---
  t("motore: punti a fine livello (anche per il boss) solo se c'è un livello dopo", /if \(this\.levelManager\.hasLevel\(nextLevelId\)\) \{[\s\S]{0,300}AttributePoints\.pointsForLevel\(this\.levelManager\.level\.hasBoss\)[\s\S]{0,80}this\.attributePoints\.award/.test(engineSource));
  t("motore: snapshot dei punti a inizio livello e ripristino ricominciando", /this\.levelStartAttributePoints = this\.attributePoints\.snapshot\(\)/.test(engineSource) && /this\.attributePoints\.restore\(this\.levelStartAttributePoints\);\s*this\.player\.setSpentAttributes\(this\.attributePoints\.spent\)/.test(engineSource));
  t("motore: nuova partita senza punti", /private startNewGame[\s\S]{0,700}this\.attributePoints\.reset\(\)/.test(engineSource));
  t("motore: E vicino all'altare apre il pentagono in modalità spesa", /isNearShopAltar\(\)\) \{\s*this\.attributesScreenMode = "spend";\s*this\.gameState\.change\("attributes"\)/.test(engineSource));
  t("motore: i punti si spendono solo all'altare", /private assignAttributePoint[\s\S]{0,200}if \(this\.attributesScreenMode !== "spend"\) \{\s*return;/.test(engineSource));
  t("altare tra l'ultimo piedistallo e la porta", SHOP_ROOM_CONFIG.altar.centerX - SHOP_ROOM_CONFIG.altar.reachDistance > Math.max(...SHOP_ROOM_CONFIG.pedestalCenters) + SHOP_ROOM_CONFIG.reachDistance);
}
