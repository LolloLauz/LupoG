// Classi Fase 2: il Mago (mana, bastone, incantesimi sui tasti 7-0, pozione di mana, bottino filtrato)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Mago (Classi Fase 2): mana, bastone, incantesimi 7-0, barriera, pozione di mana, bottino e bottega, HUD";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { ABILITY_CONFIG } = await load("config/abilityConfig");
  const { PLAYER_CONFIG } = await load("config/playerConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { WEAPON_AFFINITY_CONFIG, getWeaponAffinity } = await load("config/weaponAffinityConfig");
  const { ITEM_CONFIG } = await load("config/itemConfig");
  const { INVENTORY_CONFIG } = await load("config/inventoryConfig");
  const { LOOT_SOURCES } = await load("config/lootConfig");
  const { PLAYER_ANIMATIONS } = await load("config/animationConfig");
  const { PALETTE } = await load("config/gameConfig");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { CombatSystem } = await load("combat/CombatSystem");
  const { Inventory } = await load("systems/Inventory");
  const { Shop } = await load("systems/Shop");
  const { ScoreManager } = await load("systems/ScoreManager");
  const { resolveLootWeaponId, rollManaPotionDrop, rollFinalBossReward } = await load("systems/LootSystem");
  const { LEGENDARY_ITEMS } = await load("config/uniqueItemConfig");
  const { SHOP_BASIC_OFFERS } = await load("config/progressionConfig");
  const { HUDManager, MANA_BAR_GEOMETRY, STAMINA_BAR_WITH_MANA_GEOMETRY, ABILITY_BOX_GEOMETRY, HEALTH_SEGMENT_GEOMETRY } = await load("ui/HUDManager");
  const { registerKnightSprites, registerCharacterPreviews, getCharacterPreviewFrameId } = await load("rendering/sprites/knightSprites");
  const { registerItemSprites } = await load("rendering/sprites/itemSprites");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const mage = CHARACTER_CONFIG.mage;
  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const step = (p, held = [], pressed = [], frames = 1) => { for (let i = 0; i < frames; i++) p.update(frame, input(held, i === 0 ? pressed : []), collision, ground, 3000); };
  const grounded = (id = "mage", weaponId = CHARACTER_CONFIG[id].startingWeaponId) => {
    const p = new Player(300, 176, CHARACTER_CONFIG[id]);
    p.equipWeapon(WEAPON_CONFIG[weaponId]);
    step(p, [], [], 5);
    return p;
  };
  const target = (x) => ({
    isAlive: true,
    hits: [],
    getBounds: () => ({ x, y: 176, width: 12, height: 24 }),
    receiveHit(damage, direction, hit) { this.hits.push({ damage, hit }); },
  });

  // --- dati ---
  const spellIds = ["firebolt", "frostNova", "arcaneLeap", "arcaneBarrier"];
  t("il Mago: poca salute, mana, bastone, quattro incantesimi sui tasti 7-0",
    mage.maxHealth < CHARACTER_CONFIG.knight.maxHealth && mage.maxMana > 0 && mage.manaRegenPerSecond > 0 && mage.startingWeaponId === "staff" && mage.abilityIds.join() === spellIds.join() && mage.usesSpellFocus === true);
  t("si sblocca dopo la strega (livello 4): al livello 5, tra il berserker e il paladino",
    mage.unlockLevel === 5 && mage.unlockLevel > CHARACTER_CONFIG.berserker.unlockLevel && mage.unlockLevel < CHARACTER_CONFIG.paladin.unlockLevel && CHARACTER_ORDER.indexOf("mage") === 3);
  t("ogni incantesimo costa solo mana (meno del massimo) e ha un nome", spellIds.every((id) => { const a = ABILITY_CONFIG[id]; return a.cost.mana > 0 && a.cost.mana < mage.maxMana && a.cost.stamina === undefined && a.cost.health === undefined && a.name.length > 0; }));
  t("dardo = proiettile senza munizioni con bruciatura; nova = area con gelo; balzo = scatto indietro invulnerabile; barriera = guardia a mana",
    ABILITY_CONFIG.firebolt.attack.projectile?.usesAmmo === false && ABILITY_CONFIG.firebolt.attack.elements?.includes("fire") &&
      ABILITY_CONFIG.frostNova.attack.hitbox.x < 0 && ABILITY_CONFIG.frostNova.attack.elements?.includes("frost") && ABILITY_CONFIG.frostNova.impactEffect === "shockwave" &&
      ABILITY_CONFIG.arcaneLeap.attack.dash?.speed < 0 && ABILITY_CONFIG.arcaneLeap.attack.dash?.invulnerable === true &&
      ABILITY_CONFIG.arcaneBarrier.kind === "guard" && ABILITY_CONFIG.arcaneBarrier.resource === "mana" && ABILITY_CONFIG.shieldGuard.resource === "stamina");
  t("ogni incantesimo ha la sua animazione (pose comuni a tutte le armi)", spellIds.every((id) => { const a = ABILITY_CONFIG[id]; return a.kind === "guard" || PLAYER_ANIMATIONS[a.attack.animation] !== undefined; }));
  t("bastone: categoria propria, nessuna munizione, colpi leggeri deboli, catalizzatore",
    WEAPON_CONFIG.staff.category === "staff" && WEAPON_CONFIG.staff.ammo === undefined && WEAPON_CONFIG.staff.attacks.staffStrike1.damage < WEAPON_CONFIG.sword.attacks[WEAPON_CONFIG.sword.defaultAttackByInput.attack].damage &&
      WEAPON_CONFIG.staff.spellFocus.powerMultiplier > 1 && WEAPON_CONFIG.staff.spellFocus.manaCostMultiplier < 1 && WEAPON_CONFIG.staff.spellFocus.manaPerHit > 0);
  // Classi Fase 3: il Mago impugna anche spada e pugnale (senza catalizzatore)
  t("al Mago sono permessi solo bastone, spada e pugnale; il bastone solo al Mago",
    Object.keys(WEAPON_CONFIG).every((id) => getWeaponAffinity("mage", id).isAllowed === ["staff", "sword", "dagger"].includes(id)) && CHARACTER_ORDER.every((id) => WEAPON_AFFINITY_CONFIG[id].staff.isAllowed === (id === "mage")));
  t("solo il Mago sfrutta il catalizzatore", CHARACTER_ORDER.filter((id) => CHARACTER_CONFIG[id].usesSpellFocus === true).join() === "mage");

  // --- mana: pagamento, rifiuto, recupero ---
  {
    const p = grounded();
    t("il Mago parte con il mana pieno", p.mana === mage.maxMana && p.maxMana === mage.maxMana);
    const costWithStaff = p.getAbilityCost(ABILITY_CONFIG.firebolt).mana;
    t("con il bastone il dardo costa meno (arrotondato)", costWithStaff === Math.round(ABILITY_CONFIG.firebolt.cost.mana * WEAPON_CONFIG.staff.spellFocus.manaCostMultiplier) && costWithStaff < ABILITY_CONFIG.firebolt.cost.mana);
    step(p, [], ["ability1"]);
    t("7: il dardo paga il mana e parte la sua ricarica", p.mana === mage.maxMana - costWithStaff && p.abilityCooldownFraction === 1 && p.activeAbilitySlotIndex === 0);
    const manaAfterCast = p.mana;
    step(p, [], [], 20);
    const launches = p.drainProjectileLaunches();
    const fireLaunch = launches[0];
    t("il dardo parte come proiettile del giocatore, con la bruciatura", launches.length === 1 && fireLaunch.projectileId === "arcaneFireball" && fireLaunch.owner === "player" && fireLaunch.hit.elements?.includes("fire"));
    t("con il bastone il dardo fa più danno (potenza del catalizzatore)", fireLaunch.damage === Math.round(ABILITY_CONFIG.firebolt.attack.damage * WEAPON_CONFIG.staff.spellFocus.powerMultiplier));
    t("il dardo non consuma munizioni (il bastone non ne ha)", p.currentAmmo === null);
    // 20 frame già passati dal lancio: si arriva a poco prima della fine dell'attesa
    step(p, [], [], Math.floor(PLAYER_CONFIG.manaRegenDelayMs / (1000 / 60)) - 22);
    t("dopo un incantesimo il mana non recupera subito", p.mana === manaAfterCast);
    step(p, [], [], 60);
    t("poi recupera piano (circa manaRegenPerSecond al secondo)", p.mana > manaAfterCast && p.mana <= manaAfterCast + mage.manaRegenPerSecond * 1.1);
  }
  {
    // svuota il mana con i dardi, uno appena finisce la ricarica, finché non basta più
    const drained = grounded();
    let casts = 0;
    for (let i = 0; i < 30; i++) {
      if (!drained.canAfford(drained.getAbilityCost(ABILITY_CONFIG.firebolt))) break;
      step(drained, [], ["ability1"]);
      casts++;
      step(drained, [], [], Math.ceil(ABILITY_CONFIG.firebolt.cooldownMs / (1000 / 60)) + 1);
    }
    drained.restoreMana(-1000);
    t("restoreMana non toglie mana e non supera il massimo", drained.mana >= 0 && (() => { const full = grounded(); full.restoreMana(1000); return full.mana === full.maxMana; })());
    const manaLeft = drained.mana;
    drained.drainNoMana();
    step(drained, [], ["ability1"]);
    t("senza mana l'incantesimo non parte: niente costo, niente ricarica, avviso SENZA MANA", casts >= 1 && drained.activeAttack === null && drained.mana >= manaLeft && drained.abilityCooldownFraction === 0 && drained.drainNoMana());
    t("senza mana il bastone attacca comunque (mai senza modo di attaccare)", (() => { step(drained, [], ["attack"]); return drained.activeAttack?.id === "staffStrike1"; })());
  }

  // --- catalizzatore solo con il bastone e solo per il Mago ---
  {
    const knightWithStaff = grounded("knight", "staff");
    t("il cavaliere con un bastone non ha i bonus del catalizzatore", knightWithStaff.activeSpellFocus === null && knightWithStaff.getDamageMultiplierFor(ABILITY_CONFIG.shockwave.attack) === knightWithStaff.getDamageMultiplier());
    const mageWithSword = grounded("mage", "sword");
    t("il Mago senza bastone paga il prezzo pieno e fa il danno normale", mageWithSword.activeSpellFocus === null && mageWithSword.getAbilityCost(ABILITY_CONFIG.firebolt).mana === ABILITY_CONFIG.firebolt.cost.mana && mageWithSword.getDamageMultiplierFor(ABILITY_CONFIG.firebolt.attack) === 1);
    const p = grounded();
    t("la potenza vale solo per gli incantesimi, non per i colpi del bastone", p.getDamageMultiplierFor(WEAPON_CONFIG.staff.attacks.staffStrike1) === 1 && p.getDamageMultiplierFor(ABILITY_CONFIG.frostNova.attack) === WEAPON_CONFIG.staff.spellFocus.powerMultiplier);
  }

  // --- mana dai colpi del bastone, non dagli incantesimi ---
  {
    const combat = new CombatSystem();
    const p = grounded();
    p.selectAbilitySlot(1);
    step(p, [], ["ability2"]);
    const manaAfterNova = p.mana;
    const enemies = [target(320), target(270)];
    let novaHits = [];
    for (let i = 0; i < 30; i++) {
      step(p);
      novaHits = novaHits.concat(combat.processPlayerAttack(p, enemies));
    }
    t("la nova colpisce davanti e dietro, con il gelo", novaHits.length === 2 && enemies.every((enemy) => enemy.hits[0]?.hit.elements?.includes("frost")));
    t("la nova fa il danno potenziato dal bastone", novaHits.every((hit) => hit.damage === Math.round(ABILITY_CONFIG.frostNova.attack.damage * WEAPON_CONFIG.staff.spellFocus.powerMultiplier)));
    t("gli incantesimi non ridanno mana", p.mana <= manaAfterNova + 0.001);
    step(p, [], [], 30);
    const manaBeforeStrike = p.mana;
    const dummy = target(318);
    step(p, [], ["attack"]);
    for (let i = 0; i < 20; i++) {
      step(p);
      combat.processPlayerAttack(p, [dummy]);
    }
    // oltre al colpo continua il recupero lento (20 frame)
    const regenDuringStrike = (mage.manaRegenPerSecond * 21) / 60;
    t("ogni bersaglio colpito con il bastone ridà manaPerHit mana", dummy.hits.length === 1 && p.mana >= manaBeforeStrike + WEAPON_CONFIG.staff.spellFocus.manaPerHit - 0.01 && p.mana <= manaBeforeStrike + WEAPON_CONFIG.staff.spellFocus.manaPerHit + regenDuringStrike + 0.01);
    const knight = grounded("knight");
    const knightDummy = target(318);
    step(knight, [], ["attack"]);
    for (let i = 0; i < 20; i++) {
      step(knight);
      combat.processPlayerAttack(knight, [knightDummy]);
    }
    t("le altre classi non guadagnano mana colpendo", knightDummy.hits.length === 1 && knight.mana === 0);
    step(p, [], [], 40);
    const chest = { ...target(318), isScenery: true };
    const manaBeforeChest = p.mana;
    step(p, [], ["attack"]);
    for (let i = 0; i < 20; i++) {
      step(p);
      combat.processPlayerAttack(p, [chest]);
    }
    t("colpire un forziere (scena) con il bastone non ridà mana", chest.hits.length === 1 && p.mana <= manaBeforeChest + regenDuringStrike + 0.01);
  }

  // --- slot 7-0 indipendenti ---
  {
    const p = grounded();
    step(p, [], ["ability1"]);
    step(p, [], [], 30);
    t("dopo il dardo (7) lo slot 7 è in ricarica, gli altri pronti", (() => { const slots = p.abilitySlots; return slots.length === 4 && slots[0].cooldownFraction > 0 && slots.slice(1).every((slot) => slot.cooldownFraction === 0 && slot.isReady); })());
    step(p, [], ["ability3"]);
    t("9: il balzo parte subito, con lo scatto all'indietro invulnerabile", p.activeAttack?.id === "abilityArcaneLeap" && p.activeAbilitySlotIndex === 2);
    // un nemico sovrapposto al Mago (es. volante) non viene colpito dal balzo, nemmeno nel primo frame
    const overlapping = target(p.positionX);
    t("il balzo non colpisce niente (area vuota: nessuna area d'urto)", p.getActiveAttackHitbox() === null && new CombatSystem().processPlayerAttack(p, [overlapping]).length === 0 && overlapping.hits.length === 0);
    step(p, [], [], 2);
    t("durante il balzo il Mago è invulnerabile e si allontana", p.isInvulnerable && p.velocityX < 0);
    step(p, [], [], 40);
    t("ricariche separate per slot", p.abilitySlots[2].cooldownFraction > 0 && p.abilitySlots[0].cooldownFraction < p.abilitySlots[2].cooldownFraction);
  }

  // --- barriera a mana ---
  {
    const p = grounded();
    const cost = p.getAbilityCost(ABILITY_CONFIG.arcaneBarrier).mana;
    step(p, ["ability4"], ["ability4"]);
    t("0 tenuto: la barriera si alza pagando mana, non stamina", p.isGuarding && p.mana === mage.maxMana - cost && p.stamina === p.maxStamina && p.abilitySlots[3].isActive);
    step(p, ["ability4"], [], 60);
    const drainExpected = ABILITY_CONFIG.arcaneBarrier.drainPerSecond;
    t("con la barriera alzata il mana scende di drainPerSecond al secondo, la stamina recupera", Math.abs(mage.maxMana - cost - p.mana - drainExpected) < 0.5);
    const manaBeforeBlock = p.mana;
    const blocked = !p.takeDamage(10, p.positionX + 40);
    t("un colpo da davanti è parato pagando mana (costPerBlockedDamage per punto)", blocked && p.currentHealth === p.maxHealth && Math.abs(manaBeforeBlock - p.mana - 10 * ABILITY_CONFIG.arcaneBarrier.costPerBlockedDamage) < 0.01);
    let frames = 0;
    while (p.isGuarding && frames < 60 * 15) {
      step(p, ["ability4"]);
      frames++;
    }
    t("finito il mana la barriera si abbassa (e parte la sua ricarica)", !p.isGuarding && p.mana < 0.5 && p.abilitySlots[3].cooldownFraction > 0);
  }

  // --- pozione di mana e borsa ---
  t("pozione di mana: oggetto da borsa che ridà mana, sprite proprio", ITEM_CONFIG.manaPotion.storedInBag === true && ITEM_CONFIG.manaPotion.manaAmount > 0 && ITEM_CONFIG.manaPotion.spriteId === "itemManaPotion");
  {
    const bag = new Inventory();
    bag.reset(["staff"], "staff");
    t("salute e mana hanno posti separati", bag.addPotion("healthPotion") && bag.addPotion("manaPotion") && bag.bagSlots.filter((slot) => slot?.kind === "potion").length === 2);
    let extra = 0;
    while (bag.addPotion("manaPotion")) extra++;
    t("al massimo maxPotionsPerSlot pozioni di mana, anche con posti liberi", bag.getPotionCount("manaPotion") === INVENTORY_CONFIG.maxPotionsPerSlot * INVENTORY_CONFIG.maxPotionSlots && extra === INVENTORY_CONFIG.maxPotionsPerSlot - 1 && bag.bagSlots.includes(null) && !bag.canAddPotion("manaPotion") && bag.canAddPotion("healthPotion"));
    const manaSlot = bag.bagSlots.findIndex((slot) => slot?.kind === "potion" && slot.potionId === "manaPotion");
    const selection = bag.selectSlot(manaSlot);
    t("scegliendo il posto si sa che è una pozione di mana", selection.kind === "potion" && selection.potionId === "manaPotion");
    const drop = bag.dropSlot(manaSlot);
    t("lasciata a terra resta una pozione di mana", drop.kind === "potion" && drop.potionId === "manaPotion" && bag.getPotionCount("manaPotion") === INVENTORY_CONFIG.maxPotionsPerSlot - 1);
    const snapshot = bag.snapshot();
    bag.consumePotion(manaSlot);
    bag.restore(snapshot);
    t("il ripristino del livello conserva il tipo di pozione", bag.getPotionCount("manaPotion") === INVENTORY_CONFIG.maxPotionsPerSlot - 1 && bag.getPotionCount("healthPotion") === 1);
    const p = grounded();
    step(p, [], ["ability2"]);
    const before = p.mana;
    p.restoreMana(ITEM_CONFIG.manaPotion.manaAmount);
    t("bere la pozione ridà mana fino al massimo", p.mana === Math.min(p.maxMana, before + ITEM_CONFIG.manaPotion.manaAmount));
  }
  t("motore: la pozione di mana si beve con 1-4 (non a mana pieno), si raccoglie con E e cade dal bottino del Mago",
    /selection\.potionId === "manaPotion"[\s\S]{0,200}MANA PIENO[\s\S]{0,300}restoreMana\(manaAmount\)/.test(engineSource) && /addPotion\(GameEngine\.toPotionId\(item\.definition\.id\)\)/.test(engineSource) && /rollManaPotionDrop\(source, this\.player\.characterDefinition\.id, this\.lootRandom\)/.test(engineSource));

  // --- bottino e bottega ---
  t("bottino del Mago: spada e pugnale restano, lo spadone diventa una spada, le altre armi un bastone",
    Object.keys(WEAPON_CONFIG).every((id) => resolveLootWeaponId("mage", id) === (["staff", "sword", "dagger"].includes(id) ? id : id === "greatsword" ? "sword" : "staff")));
  t("motore: forzieri, élite e trofei dei boss passano dal filtro", (engineSource.match(/rollLootWeapon\(this\.resolveLootWeapon\(/g) ?? []).length === 3);
  {
    let calls = 0;
    const counting = () => { calls++; return 0; };
    const knightDrops = ["chest", "elite", "boss"].some((source) => rollManaPotionDrop(source, "knight", counting));
    t("pozioni di mana nel bottino solo per chi ha mana; per gli altri il generatore non si tocca", !knightDrops && calls === 0 && rollManaPotionDrop("chest", "mage", () => 0.5) && !rollManaPotionDrop("enemy", "mage", () => 0) && LOOT_SOURCES.finalBoss.manaPotionChance === 0);
  }
  {
    const bag = new Inventory();
    bag.reset(["staff"], "staff");
    // generatore alto: il bastone in vendita è raro, diverso da quello Comune in borsa
    // la spada è sempre tra le armi scoperte (e dalla Classi Fase 3 il Mago può usarla): il bastone resta tra i candidati
    const shop = Shop.open(["sword", "staff", "bow"], bag, () => 0.95, { levelId: 5, difficulty: "normal", characterId: "mage" });
    const ids = shop.offers.map((offer) => offer.id);
    t("bottega del Mago: pozione di mana al posto della faretra, e un bastone in vendita anche se ne ha già uno", ids.join() === "potion,manaPotion,heal,weapon,armor" && shop.offers[3].weaponId === "staff");
    const score = new ScoreManager();
    score.addCoins(1000);
    const customer = { inventory: bag, player: grounded(), scoreManager: score };
    t("si compra la pozione di mana (poi la borsa è piena di pozioni di mana)", shop.buy(1, customer) === "bought" && shop.buy(1, customer) === "bought" && shop.buy(1, customer) === "bagFull" && bag.getPotionCount("manaPotion") === 2);
    const oldStaff = bag.equippedWeaponItem;
    t("il bastone comprato prende il posto di quello in mano, che va nello zaino", shop.buy(3, customer) === "bought" && bag.weaponIds.join() === "staff" && bag.equippedWeaponItem.rarity === "epic" && bag.backpackItems.some((item) => item.baseId === "staff" && item.rarity === oldStaff.rarity));
    const sameBag = new Inventory();
    sameBag.reset(["staff"], "staff");
    const sameShop = Shop.open(["staff", "axe"], sameBag, () => 0.01, { levelId: 1, difficulty: "normal", characterId: "mage" });
    t("un bastone identico a quello in borsa non va in vendita (niente voce inutile)", sameShop.offers.every((offer) => offer.id !== "weapon"));
    const knightBag = new Inventory();
    knightBag.reset(["sword"], "sword");
    const knightShop = Shop.open(["sword", "bow"], knightBag, () => 0.1, { levelId: 5, difficulty: "normal", characterId: "knight" });
    t("le voci fisse della bottega sono dati (SHOP_BASIC_OFFERS)", SHOP_BASIC_OFFERS.withMana.join() === "potion,manaPotion,heal" && SHOP_BASIC_OFFERS.default.join() === "potion,heal,ammo");
    t("bottega delle altre classi invariata (faretra, nessuna pozione di mana)", knightShop.offers.map((offer) => offer.id).join() === "potion,heal,ammo,weapon,armor" && knightShop.offers[3].weaponId === "bow");
  }

  {
    // trofeo del boss finale: solo oggetti che la classe può usare
    const draws = [];
    for (let i = 0; i < 200; i++) {
      let seed = i * 7919 + 1;
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      draws.push(rollFinalBossReward({ source: "finalBoss", levelId: 7, difficulty: "normal", characterId: "knight" }, random));
      draws.push(rollFinalBossReward({ source: "finalBoss", levelId: 7, difficulty: "normal", characterId: "mage" }, random));
    }
    const knightDraws = draws.filter((_, index) => index % 2 === 0);
    const mageDraws = draws.filter((_, index) => index % 2 === 1);
    t("trofeo finale: il cavaliere non riceve mai il bastone, il Mago solo armi permesse (bastone, spada, pugnale) o armature",
      knightDraws.every((item) => item.baseId !== "staff") && mageDraws.every((item) => item.kind === "armor" || ["staff", "sword", "dagger"].includes(item.baseId)) && mageDraws.some((item) => item.baseId === "staff") && Object.values(LEGENDARY_ITEMS).some((item) => item.baseId === "staff"));
  }

  // --- HUD ---
  {
    const fills = [];
    const texts = [];
    const renderer = {
      width: 320, height: 240,
      fillRect: (x, y, w, h, c) => fills.push({ x, y, w, h, c }), strokeRect() {}, drawText: (text, x, y, c) => texts.push({ text, x, y, c }),
      fillVerticalGradient() {}, fillDitheredOverlay() {}, fillGlow() {},
    };
    const abilities = [0, 1, 2, 3].map((index) => ({ cooldownFraction: index === 1 ? 0.5 : 0, isReady: index !== 1 && index !== 2, isAffordable: index !== 2, isSelected: index === 0, isActive: false, meetsRequirement: true }));
    new HUDManager().render(renderer, { drawSprite() {} }, { health: 65, maxHealth: 65, stamina: 80, maxStamina: 80, mana: 50, maxMana: 100, abilities, lives: 3, score: 0, coins: 0, levelNumber: 5, bag: [], powerUps: [], boss: null, unspentAttributePoints: 0 }, 0);
    const manaFill = fills.find((f) => f.x === MANA_BAR_GEOMETRY.x && f.y === MANA_BAR_GEOMETRY.y && f.c === PALETTE.blue);
    t("HUD: barra del mana (blu) piena a metà, sotto la stamina", manaFill !== undefined && manaFill.w === MANA_BAR_GEOMETRY.width / 2 && MANA_BAR_GEOMETRY.y > STAMINA_BAR_WITH_MANA_GEOMETRY.y + STAMINA_BAR_WITH_MANA_GEOMETRY.height);
    t("HUD: le due barre stanno sotto la salute e dentro il pannello", STAMINA_BAR_WITH_MANA_GEOMETRY.y > HEALTH_SEGMENT_GEOMETRY.y + HEALTH_SEGMENT_GEOMETRY.height && MANA_BAR_GEOMETRY.y + MANA_BAR_GEOMETRY.height <= 22);
    t("HUD: quattro riquadri con i tasti 7, 8, 9, 0 in fila", ["7", "8", "9", "0"].every((label, index) => texts.some((x) => x.text === label && x.x > ABILITY_BOX_GEOMETRY.x + index * ABILITY_BOX_GEOMETRY.step && x.x < ABILITY_BOX_GEOMETRY.x + index * ABILITY_BOX_GEOMETRY.step + ABILITY_BOX_GEOMETRY.size)));
    t("HUD: numero rosso quando il mana non basta, bordo dorato sullo slot attivo", texts.find((x) => x.text === "9")?.c === PALETTE.red && fills.some((f) => f.x === ABILITY_BOX_GEOMETRY.x && f.y === ABILITY_BOX_GEOMETRY.y && f.c === PALETTE.goldLight));
    t("HUD: i riquadri non toccano la scritta del livello", ABILITY_BOX_GEOMETRY.x + 3 * ABILITY_BOX_GEOMETRY.step + ABILITY_BOX_GEOMETRY.size < 130);
    t("HUD: tutti i colori dalla palette", fills.every((f) => Object.values(PALETTE).includes(f.c)));
  }

  // --- sprite ---
  {
    const sm = new FakeSpriteManager();
    registerKnightSprites(sm, "mage");
    const knightSm = new FakeSpriteManager();
    registerKnightSprites(knightSm);
    t("il Mago ha un aspetto proprio con il bastone in mano", sm.sprites.has("knightIdle1StaffMage") && JSON.stringify(sm.sprites.get("knightIdle1StaffMage").rows) !== JSON.stringify(knightSm.sprites.get("knightIdle1Staff").rows));
    t("icona del bastone registrata", sm.sprites.has(WEAPON_CONFIG.staff.iconSpriteId));
    const previews = new FakeSpriteManager();
    registerCharacterPreviews(previews);
    t("anteprima del Mago con il bastone", getCharacterPreviewFrameId("mage", 1) === "knightIdle1StaffMage" && previews.sprites.has("knightIdle1StaffMage"));
    const items = new FakeSpriteManager();
    registerItemSprites(items);
    t("sprite della pozione di mana: la stessa ampolla, liquido blu", items.sprites.has("itemManaPotion") && JSON.stringify(items.sprites.get("itemManaPotion").rows) === JSON.stringify(items.sprites.get("itemPotion").rows));
  }
}
