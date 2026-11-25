// Classi Fase 0: risorse (stamina e mana), costi delle abilità, abilità come elenco, tag delle armi,
// tabella di compatibilità classe x categoria, attributi come fonte dei modificatori. Tutto neutro: il gioco non cambia.
export const description = "Classi Fase 0: ResourcePool, costi, slot delle abilità, tag delle armi, compatibilità, attributi (tutto neutro)";

export default async function (t, load) {
  const { ResourcePool } = await load("combat/ResourcePool");
  const { PlayerModifiers } = await load("combat/PlayerModifiers");
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { ABILITY_CONFIG } = await load("config/abilityConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { POWER_UP_CONFIG } = await load("config/powerUpConfig");
  const { WEAPON_AFFINITY_CONFIG, NEUTRAL_WEAPON_AFFINITY, getWeaponAffinity } = await load("config/weaponAffinityConfig");
  const { ATTRIBUTE_CONFIG, ATTRIBUTE_ORDER, ZERO_ATTRIBUTES } = await load("config/attributeConfig");
  const { computeAttributeEffects } = await load("systems/AttributeStats");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const step = (p, held = [], pressed = [], frames = 1) => { for (let i = 0; i < frames; i++) p.update(frame, input(held, i === 0 ? pressed : []), collision, ground, 3000); };
  const grounded = (id = "knight") => {
    const p = new Player(300, 176, CHARACTER_CONFIG[id]);
    p.equipWeapon(WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId]);
    step(p, [], [], 5);
    return p;
  };
  const weaponIds = Object.keys(WEAPON_CONFIG);
  const categoryIds = Object.keys(WEAPON_AFFINITY_CONFIG.knight);

  // --- ResourcePool ---
  {
    let max = 100;
    const pool = new ResourcePool(() => max, () => 50, 600);
    t("pool: parte pieno", pool.value === 100 && pool.max === 100);
    t("pool: trySpend paga se basta", pool.trySpend(30) && pool.value === 70);
    t("pool: trySpend rifiuta senza consumare se non basta", !pool.trySpend(80) && pool.value === 70 && pool.canSpend(70) && !pool.canSpend(70.5));
    pool.update(500);
    t("pool: durante l'attesa dopo un consumo non recupera", pool.value === 70);
    pool.update(100);
    t("pool: nel frame in cui l'attesa finisce non recupera ancora", pool.value === 70);
    pool.update(200);
    t("pool: poi recupera regen al secondo", pool.value === 80, String(pool.value));
    pool.update(10000);
    t("pool: il recupero si ferma al massimo", pool.value === 100);
    pool.drain(150);
    t("pool: drain scende al massimo fino a 0 e ferma il recupero", pool.value === 0 && (pool.update(100), pool.value === 0));
    pool.refill();
    t("pool: refill riempie e libera il recupero", pool.value === 100);
    max = 40;
    pool.clampToMax();
    t("pool: clampToMax riporta entro il nuovo massimo", pool.value === 40);
    pool.empty();
    t("pool: empty azzera", pool.value === 0);
  }

  // --- costi e modificatori delle abilità ---
  const abilities = Object.values(ABILITY_CONFIG);
  t("ogni abilità ha un costo come oggetto e nessun vecchio staminaCost", abilities.every((a) => typeof a.cost === "object" && a.staminaCost === undefined));
  t("i costi di oggi sono tutti in stamina (40, 30, 40, 10), senza mana né salute",
    ["shockwave", "backstepShot", "furiousCharge", "shieldGuard"].map((id) => ABILITY_CONFIG[id].cost.stamina).join() === "40,30,40,10" &&
      abilities.every((a) => a.cost.mana === undefined && a.cost.health === undefined));
  t("campo modifiers presente e vuoto in ogni abilità", abilities.every((a) => Array.isArray(a.modifiers) && a.modifiers.length === 0));

  // --- mana ---
  t("nessuna classe ha mana (0 massimo, 0 recupero)", CHARACTER_ORDER.every((id) => CHARACTER_CONFIG[id].maxMana === 0 && CHARACTER_CONFIG[id].manaRegenPerSecond === 0));
  {
    const p = grounded("paladin");
    step(p, [], [], 120);
    t("giocatore: mana 0 su 0 e resta 0", p.mana === 0 && p.maxMana === 0);
    t("canAfford: costo vuoto sempre pagabile", p.canAfford({}));
    t("canAfford: senza mana un costo in mana non si paga", !p.canAfford({ mana: 1 }));
    t("canAfford: la salute deve restare almeno a 1", !p.canAfford({ health: p.currentHealth }) && p.canAfford({ health: p.currentHealth - 1 }));
    p.currentHealth = 1.4;
    t("canAfford: con salute frazionaria deve restare almeno 1 punto", !p.canAfford({ health: 1 }) && p.canAfford({ health: 0.3 }));
    p.currentHealth = p.maxHealth;
    t("canAfford: stamina come prima", p.canAfford({ stamina: p.stamina }) && !p.canAfford({ stamina: p.stamina + 1 }));
    t("isAbilityReady: pronta a riposo", p.isAbilityReady);
  }

  // --- abilità come elenco ---
  t("ogni classe ha un elenco di abilità (oggi una) e nessun vecchio abilityId",
    CHARACTER_ORDER.every((id) => Array.isArray(CHARACTER_CONFIG[id].abilityIds) && CHARACTER_CONFIG[id].abilityIds.length === 1 && CHARACTER_CONFIG[id].abilityId === undefined));
  {
    const p = grounded("knight");
    t("slot: abilities e slot attivo 0", p.abilities.length === 1 && p.abilities[0].id === "shockwave" && p.activeAbilitySlotIndex === 0 && p.ability.id === "shockwave");
    t("slot: uno slot inesistente è rifiutato", !p.selectAbilitySlot(1) && !p.selectAbilitySlot(-1) && !p.selectAbilitySlot(0.5) && p.activeAbilitySlotIndex === 0);
    t("slot: lo slot esistente si sceglie", p.selectAbilitySlot(0));
    step(p, [], ["ability1"]);
    t("slot: l'abilità dello slot attivo paga il costo e parte la ricarica", p.stamina === 60 && p.abilityCooldownFraction === 1 && !p.isAbilityReady);
    p.setCharacter(CHARACTER_CONFIG.ranger);
    t("slot: cambiando classe la ricarica riparte da zero", p.abilityCooldownFraction === 0 && p.ability.id === "backstepShot");
  }

  // --- tag delle armi ---
  t("ogni arma ha una categoria della tabella", weaponIds.every((id) => categoryIds.includes(WEAPON_CONFIG[id].category)));
  t("ogni categoria ha almeno un'arma", categoryIds.every((category) => weaponIds.some((id) => WEAPON_CONFIG[id].category === category)));
  t("ogni arma ha un peso intero positivo", weaponIds.every((id) => Number.isInteger(WEAPON_CONFIG[id].weight) && WEAPON_CONFIG[id].weight > 0));
  t("ogni arma scala con un attributo esistente", weaponIds.every((id) => ATTRIBUTE_ORDER.includes(WEAPON_CONFIG[id].scalingAttribute)));
  t("pugnale più leggero della spada, spadone il più pesante",
    WEAPON_CONFIG.dagger.weight < WEAPON_CONFIG.sword.weight && weaponIds.every((id) => WEAPON_CONFIG[id].weight <= WEAPON_CONFIG.greatsword.weight));

  // --- compatibilità classe x categoria ---
  t("la tabella ha una riga per ogni classe e le stesse categorie", CHARACTER_ORDER.every((id) => Object.keys(WEAPON_AFFINITY_CONFIG[id] ?? {}).sort().join() === [...categoryIds].sort().join()));
  t("Fase 0: tutte le celle neutre (×1, nessun divieto)",
    CHARACTER_ORDER.every((id) => categoryIds.every((category) => {
      const cell = WEAPON_AFFINITY_CONFIG[id][category];
      return cell.isAllowed === true && cell.damageMultiplier === 1 && cell.recoveryMultiplier === 1;
    })));
  t("getWeaponAffinity passa dalla categoria dell'arma", getWeaponAffinity("berserker", "axe") === WEAPON_AFFINITY_CONFIG.berserker.heavy && getWeaponAffinity("ranger", "bow") === NEUTRAL_WEAPON_AFFINITY);
  {
    const p = grounded("ranger");
    p.equipWeapon(WEAPON_CONFIG.greatsword);
    t("giocatore: compatibilità neutra con l'arma in mano", JSON.stringify(p.weaponAffinity) === JSON.stringify(NEUTRAL_WEAPON_AFFINITY));
  }

  // --- attributi nella pipeline dei modificatori ---
  t("cinque attributi, nell'ordine del pentagono", ATTRIBUTE_ORDER.join() === "strength,dexterity,intelligence,vitality,endurance" && ATTRIBUTE_ORDER.every((id) => ATTRIBUTE_CONFIG[id].id === id && ATTRIBUTE_CONFIG[id].name.length > 0));
  t("Fase 0: nessun attributo ha effetti", ATTRIBUTE_ORDER.every((id) => ATTRIBUTE_CONFIG[id].effectsPerPoint.length === 0));
  t("tutte le classi partono con gli attributi a zero", CHARACTER_ORDER.every((id) => ATTRIBUTE_ORDER.every((a) => CHARACTER_CONFIG[id].baseAttributes[a] === 0)));
  t("attributi a zero: nessun effetto", computeAttributeEffects(ZERO_ATTRIBUTES).length === 0);
  {
    const fake = { strength: 3, dexterity: 0, intelligence: 0, vitality: 0, endurance: 0 };
    const definitions = { ...ATTRIBUTE_CONFIG, strength: { ...ATTRIBUTE_CONFIG.strength, effectsPerPoint: [{ stat: "damageMultiplier", valuePerPoint: 0.05 }] } };
    const effects = computeAttributeEffects(fake, definitions);
    t("un effetto per punto si moltiplica per i punti (operazione add)", effects.length === 1 && effects[0].stat === "damageMultiplier" && effects[0].operation === "add" && Math.abs(effects[0].value - 0.15) < 1e-9);
  }
  {
    const modifiers = new PlayerModifiers();
    modifiers.setSourceEffects("attributes", [{ stat: "maxHealthBonus", operation: "add", value: 10 }, { stat: "damageMultiplier", operation: "add", value: 0.2 }]);
    modifiers.add(POWER_UP_CONFIG.berserk);
    t("fonte permanente e power-up nella stessa formula", modifiers.getValue("maxHealthBonus") === 10 && Math.abs(modifiers.getValue("damageMultiplier") - 1.2 * 1.5) < 1e-9);
    modifiers.clear();
    t("clear toglie i power-up ma non la fonte permanente", modifiers.activePowerUps.length === 0 && modifiers.getValue("maxHealthBonus") === 10);
    modifiers.setSourceEffects("attributes", []);
    t("un elenco vuoto annulla la fonte", modifiers.getValue("maxHealthBonus") === 0 && modifiers.getSourceEffects("attributes").length === 0);
  }
  {
    const p = grounded("knight");
    const before = { health: p.maxHealth, stamina: p.maxStamina, damage: p.getDamageMultiplier() };
    p.setAttributes({ strength: 9, dexterity: 9, intelligence: 9, vitality: 9, endurance: 9 });
    t("Fase 0: alzare gli attributi non cambia niente", p.maxHealth === before.health && p.maxStamina === before.stamina && p.getDamageMultiplier() === before.damage && p.attributes.strength === 9);
    p.modifiers.setSourceEffects("attributes", [{ stat: "maxHealthBonus", operation: "add", value: 20 }, { stat: "maxStaminaBonus", operation: "add", value: 5 }]);
    t("i bonus della pipeline entrano nei massimi di salute e stamina", p.maxHealth === before.health + 20 && p.maxStamina === before.stamina + 5);
    p.modifiers.add({ ...POWER_UP_CONFIG.speed, id: "speed", effects: [{ stat: "maxHealthBonus", operation: "add", value: 30 }], durationMs: 100 });
    p.heal(1000);
    const boosted = p.currentHealth;
    step(p, [], [], 10);
    t("allo scadere di un power-up che alza il massimo la salute scende al nuovo massimo", boosted === before.health + 50 && p.currentHealth === before.health + 20, `${boosted} -> ${p.currentHealth}`);
    p.revive();
    t("la morte non toglie le fonti permanenti", p.maxHealth === before.health + 20);
    p.setCharacter(CHARACTER_CONFIG.knight);
    t("cambiando classe gli attributi tornano a quelli di partenza", p.maxHealth === before.health && p.attributes.strength === 0);
  }
}
