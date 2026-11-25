// Fase 6 e Classi Fase 1: monete e bottega, gemme in monete, partite scollegate, salvataggio, sblocchi
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Monete e bottega, gemme in monete, partite scollegate, salvataggio e migrazione, sblocchi";

export default async function (t, load) {
  const P = await load("config/progressionConfig");
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { ITEM_CONFIG } = await load("config/itemConfig");
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const { ScoreManager } = await load("systems/ScoreManager");
  const { ItemManager } = await load("systems/ItemManager");
  const { Inventory } = await load("systems/Inventory");
  const { Shop } = await load("systems/Shop");
  const { ProgressManager, SAVE_VERSION } = await load("systems/ProgressManager");
  const { InputManager } = await load("core/InputManager");
  const { CONTROLS_CONFIG } = await load("config/controlsConfig");
  const { Player } = await load("entities/Player");
  const { GameState } = await load("core/GameState");
  const { ScreenManager } = await load("ui/ScreenManager");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");
  const memory = () => { const data = new Map(); return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };

  // --- configurazione ---
  t("economia: monete per nemico, élite e boss", P.ECONOMY_CONFIG.coinsPerEnemy > 0 && P.ECONOMY_CONFIG.eliteCoinMultiplier > 1 && P.ECONOMY_CONFIG.coinsPerBoss > P.ECONOMY_CONFIG.coinsPerEnemy);
  t("la moneta dei livelli dà monete oltre ai punti", ITEM_CONFIG.scoreCoin.coins === 10 && ITEM_CONFIG.scoreCoin.scoreBonus === 50);
  t("bottega: sei voci con prezzo positivo (E5: anche l'armatura; Classi Fase 2: la pozione di mana)", Object.values(P.SHOP_OFFERS).length === 6 && Object.values(P.SHOP_OFFERS).every((o) => o.price > 0 && o.name.length > 0));
  t("sblocchi: il cavaliere subito, gli altri a livelli crescenti che esistono", CHARACTER_CONFIG.knight.unlockLevel === 1 && CHARACTER_ORDER.slice(1).every((id, i, rest) => CHARACTER_CONFIG[id].unlockLevel > 1 && LEVEL_CONFIG.some((l) => l.id === CHARACTER_CONFIG[id].unlockLevel) && (i === 0 || CHARACTER_CONFIG[id].unlockLevel >= CHARACTER_CONFIG[rest[i - 1]].unlockLevel) && CHARACTER_CONFIG[id].unlockText.length > 0));

  // --- monete ---
  {
    const score = new ScoreManager();
    score.addCoins(30);
    t("monete: si sommano e si spendono solo se bastano", score.coins === 30 && !score.spendCoins(40) && score.coins === 30 && score.spendCoins(25) && score.coins === 5);
    score.restore(100);
    t("ripristino senza monete: restano quelle attuali (compatibile con i vecchi usi)", score.coins === 5 && score.currentScore === 100);
    score.restore(0, 12);
    t("ripristino con monete (ricominciando un livello) e azzeramento a ogni partita", score.coins === 12 && (score.reset(), score.coins === 0));
    const items = new ItemManager();
    items.loadItems([{ type: "scoreCoin", position: { x: 100, y: 192 } }]);
    const player = new Player(96, 176);
    const fresh = new ScoreManager();
    items.collectItems(player, fresh);
    t("raccogliendo una moneta: +10 monete e +50 punti", fresh.coins === 10 && fresh.currentScore === 50);
  }

  // --- bottega ---
  const customer = (coins = 500, health = 50) => {
    const inventory = new Inventory();
    const player = new Player(100, 176);
    player.currentHealth = health;
    const scoreManager = new ScoreManager();
    scoreManager.addCoins(coins);
    return { inventory, player, scoreManager };
  };
  {
    const c = customer();
    const noWeapons = Shop.open(["sword"], c.inventory, () => 0);
    t("bottega senza armi trovate da vendere: pozione, cura, faretra e un'armatura", noWeapons.offers.map((o) => o.id).join() === "potion,heal,ammo,armor");
    c.inventory.addWeapon("axe");
    const shop = Shop.open(["sword", "axe", "bow", "mace"], c.inventory, () => 0.99);
    const weaponOffer = shop.offers.find((o) => o.id === "weapon");
    t("l'arma in vendita è una di quelle trovate che non sono nella borsa", weaponOffer !== undefined && ["bow", "mace"].includes(weaponOffer.weaponId) && weaponOffer.name.startsWith(WEAPON_CONFIG[weaponOffer.weaponId].name.toUpperCase()) && weaponOffer.item.baseId === weaponOffer.weaponId);
    const index = (id) => shop.offers.findIndex((o) => o.id === id);
    t("cura: +40 HP per 25 monete", shop.buy(index("heal"), c) === "bought" && c.player.currentHealth === 90 && c.scoreManager.coins === 475);
    c.player.currentHealth = c.player.maxHealth;
    t("cura a salute piena: non serve, niente spesa", shop.buy(index("heal"), c) === "notNeeded" && c.scoreManager.coins === 475);
    t("pozione: va nella borsa (40 monete); oltre il limite la borsa è piena", shop.buy(index("potion"), c) === "bought" && shop.buy(index("potion"), c) === "bought" && c.inventory.potionCount === 2 && shop.buy(index("potion"), c) === "bagFull" && c.scoreManager.coins === 395);
    t("faretra senza armi da tiro: non serve", shop.buy(index("ammo"), c) === "notNeeded");
    const weaponId = weaponOffer.weaponId;
    t("arma: entra nella borsa e si impugna; poi è esaurita", shop.buy(index("weapon"), c) === "bought" && c.inventory.hasWeapon(weaponId) && c.inventory.equippedWeaponId === weaponId && weaponOffer.isSoldOut && shop.buy(index("weapon"), c) === "soldOut");
    const poor = customer(10);
    const poorShop = Shop.open(["sword"], poor.inventory);
    t("monete insufficienti: niente acquisto e niente spesa", poorShop.buy(1, poor) === "notEnoughCoins" && poor.scoreManager.coins === 10 && poor.player.currentHealth === 50);
    const archer = customer();
    archer.inventory.reset(["sword", "bow"], "bow");
    archer.inventory.setEquippedAmmo(2);
    const archerShop = Shop.open(["sword", "bow"], archer.inventory);
    t("faretra con le frecce quasi finite: munizioni piene", archerShop.buy(2, archer) === "bought" && archer.inventory.equippedAmmo === 12);
    const full = customer();
    full.inventory.reset(["sword", "axe", "mace", "spear"], "sword");
    const fullShop = Shop.open(["sword", "axe", "mace", "spear", "bow"], full.inventory);
    t("borsa senza posti liberi: l'arma comprata va nello zaino", fullShop.buy(3, full) === "bought" && !full.inventory.hasWeapon("bow") && full.inventory.backpackItems.some((item) => item.baseId === "bow"));
    while (full.inventory.addToBackpack({ kind: "armor", baseId: "clothHelmet", rarity: "common", affixes: [] }));
    const fullShop2 = Shop.open(["sword", "axe", "mace", "spear", "dagger"], full.inventory);
    t("borsa e zaino pieni: l'arma non si compra", fullShop2.buy(3, full) === "bagFull" && !full.inventory.hasWeapon("dagger"));
  }

  // --- gemme in monete ---
  {
    const items = new ItemManager();
    items.loadItems([{ type: "collectible", position: { x: 100, y: 192 } }]);
    const score = new ScoreManager();
    items.collectItems(new Player(96, 176), score);
    t("raccogliendo una gemma: +30 monete e +200 punti", ITEM_CONFIG.collectible.coins === 30 && score.coins === 30 && score.currentScore === 200);
  }

  // --- salvataggio: solo livelli, classi, difficoltà; migrazione dal formato 2.0 ---
  {
    const KEY = "ironAndShadow.progress";
    const keys = (store) => Object.keys(JSON.parse(store.data.get(KEY))).sort().join();
    const store = memory();
    const progress = new ProgressManager(store);
    t("senza salvataggio non si scrive niente", store.data.size === 0);
    progress.unlockLevel(3);
    t("si salvano solo versione, livello raggiunto, difficoltà e personaggio", keys(store) === "characterId,difficulty,unlockedLevelId,version" && JSON.parse(store.data.get(KEY)).version === SAVE_VERSION);
    t("personaggi: sbloccati dal livello raggiunto (al 3 il ranger, non ancora il berserker)", progress.isCharacterUnlocked("ranger") && !progress.isCharacterUnlocked("berserker"));
    progress.setCharacter("paladin");
    t("un personaggio bloccato salvato si gioca come cavaliere", progress.characterId === "knight");
    progress.unlockLevel(6);
    t("raggiunto il livello 6 tutti sbloccati, e il paladino salvato torna valido", CHARACTER_ORDER.every((id) => progress.isCharacterUnlocked(id)) && progress.characterId === "paladin");

    const old = memory();
    old.setItem(KEY, JSON.stringify({ unlockedLevelId: 4, difficulty: "hard", characterId: "berserker", equippedWeaponId: "axe", bagWeaponIds: ["sword", "axe"], bagItems: [], armor: {}, backpack: [], gems: 12, upgradeLevels: { vitality: 2 }, discoveredWeaponIds: ["axe"] }));
    const migrated = new ProgressManager(old);
    t("migrazione 2.0: restano livello, difficoltà e personaggio", migrated.unlockedLevelId === 4 && migrated.difficulty === "hard" && migrated.characterId === "berserker");
    t("migrazione 2.0: armi, armature, zaino, gemme e potenziamenti si tolgono subito dall'archivio", keys(old) === "characterId,difficulty,unlockedLevelId,version");
    let writes = 0;
    new ProgressManager({ getItem: old.getItem, setItem: () => writes++ });
    t("un salvataggio già migrato non si riscrive", writes === 0);
    const readOnly = { getItem: () => JSON.stringify({ unlockedLevelId: 5 }), setItem() { throw new Error("pieno"); } };
    t("migrazione con l'archivio non scrivibile: i progressi si leggono comunque", new ProgressManager(readOnly).unlockedLevelId === 5);
    migrated.reset();
    t("cancella dati: livello 1, normale, cavaliere", migrated.unlockedLevelId === 1 && migrated.difficulty === "normal" && migrated.characterId === "knight");
  }

  // --- classe fissata per la partita, giocatore senza bonus permanenti ---
  {
    const p = new Player(0, 0, CHARACTER_CONFIG.knight);
    t("il giocatore parte con i soli valori della classe (nessun potenziamento permanente)", p.maxHealth === CHARACTER_CONFIG.knight.maxHealth && p.maxStamina === CHARACTER_CONFIG.knight.maxStamina && p.getDamageMultiplier() === CHARACTER_CONFIG.knight.damageMultiplier && !("setUpgrades" in p) && P.UPGRADE_CONFIG === undefined);
    t("motore: scegliere il personaggio non cambia il giocatore in corso né l'equipaggiamento", /private chooseCharacter[\s\S]*?\n  }/.exec(engineSource)[0].includes("setCharacter(characterId)") && !/private chooseCharacter[\s\S]*?\n  }/.exec(engineSource)[0].match(/this\.(player|inventory)\./));
  }

  // --- comandi ---
  {
    const listeners = {};
    globalThis.window = { addEventListener: (type, handler) => (listeners[type] = handler), removeEventListener() {} };
    const manager = new InputManager();
    manager.attach();
    delete globalThis.window;
    manager.setContext("gameplay");
    const actionsOf = (code) => {
      manager.endFrame();
      listeners.keydown({ code, preventDefault() {}, repeat: false });
      const pressed = Object.keys(CONTROLS_CONFIG).filter((action) => manager.wasPressed(action));
      listeners.keyup({ code, preventDefault() {} });
      return pressed.join();
    };
    t("comandi: J attacco, K attacco pesante, Shift sinistro schivata", actionsOf("KeyJ") === "attack" && actionsOf("KeyK") === "heavyAttack" && actionsOf("ShiftLeft") === "dodge");
    t("comandi: 7, 8, 9, 0 le quattro mosse, L vale come il 7, 5, 6 e Spazio non fanno niente", ["Digit7", "Digit8", "Digit9", "Digit0"].map(actionsOf).join() === "ability1,ability2,ability3,ability4" && actionsOf("KeyL") === "ability1" && actionsOf("Digit5") === "" && actionsOf("Digit6") === "" && actionsOf("Space") === "");
  }

  // --- schermate e stati ---
  {
    const state = new GameState();
    t("lo stato dei potenziamenti non esiste più", !state.change("upgrades"));
    state.change("playing");
    t("gioco -> bottega -> gioco; dalla bottega non si torna al titolo", state.change("shop") && !state.change("title") && !state.change("paused") && state.change("playing"));
    const screens = new ScreenManager(new FakeSpriteManager());
    const data = {
      score: 0, bestScore: 0, isNewRecord: false, difficultyName: "NORMALE", characterId: "knight", levels: [],
      unlockedCharacterIds: ["knight"], coins: 50,
      shopOffers: [{ name: "POZIONE", description: "", price: 40, isSoldOut: false, iconSpriteId: "itemPotion", iconSize: 8 }, { name: "CURA", description: "", price: 25, isSoldOut: false, iconSpriteId: "hudHeart", iconSize: 8 }],
    };
    const press = (stateName, action) => screens.update(stateName, { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
    t("bottega: Invio sulla prima voce compra", press("shop", "confirm") === "buyShopOffer" && screens.selectedShopIndex === 0);
    press("shop", "menuUp");
    t("bottega: W dalla prima voce porta a PROSEGUI, che esce", screens.selectedShopIndex === 2 && press("shop", "confirm") === "leaveShop");
    t("bottega: Esc non fa uscire (si esce solo con PROSEGUI)", press("shop", "pause") === null);
    screens.resetSelection();
    for (let i = 0; i < 3; i++) press("title", "menuDown");
    t("la quarta voce del titolo è la difficoltà (niente più potenziamenti)", press("title", "confirm") === "cycleDifficulty");
    screens.resetSelection();
    press("characterSelect", "menuRight");
    t("un personaggio bloccato non si conferma", screens.selectedCharacterId === "ranger" && press("characterSelect", "confirm") === null);
  }

  // --- motore ---
  t("motore: monete da nemici (élite x3) e boss; ricominciando un livello tornano quelle di inizio livello", /addCoins\(ECONOMY_CONFIG\.coinsPerBoss\)/.test(engineSource) && /addCoins\(ECONOMY_CONFIG\.coinsPerEnemy \* \(enemy\.isElite \? ECONOMY_CONFIG\.eliteCoinMultiplier : 1\)\)/.test(engineSource) && engineSource.includes("this.scoreManager.restore(this.levelStartScore, this.levelStartCoins);"));
  t("motore: a fine livello si sblocca il livello successivo (e i personaggi)", /const lockedBefore[\s\S]{0,200}this\.progressManager\.unlockLevel\(nextLevelId\)/.test(engineSource));
  t("motore: dopo il riquadro di fine livello la bottega (o la vittoria); PROSEGUI avvia il livello successivo", /private advanceToNextLevel[\s\S]{0,300}Shop\.open\(\[\.\.\.this\.discoveredWeaponIds\], this\.inventory, this\.lootRandom, \{[\s\S]{0,200}\}\);[\s\S]{0,300}this\.gameState\.change\("shop"\)/.test(engineSource) && /private leaveShop[\s\S]{0,120}this\.startLevel\(this\.currentLevelId \+ 1\);\s*this\.gameState\.change\("playing"\)/.test(engineSource));
  t("motore: ogni partita azzera monete, equipaggiamento e armi trovate; le armi raccolte si aggiungono a quelle trovate", /private startNewGame[\s\S]{0,200}this\.scoreManager\.reset\(\)[\s\S]{0,600}this\.resetRunEquipment\(\)/.test(engineSource) && /private resetRunEquipment[\s\S]{0,500}this\.discoveredWeaponIds\.clear\(\);\s*for \(const weaponId of \[\.\.\.ALWAYS_DISCOVERED_WEAPONS, startingWeaponId\]\)/.test(engineSource) && /this\.weaponPickups\.take\(pickup\);\s*this\.discoveredWeaponIds\.add\(item\.baseId\)/.test(engineSource));
  t("motore: niente più salvataggio di armi, armature o gemme", !/saveBagWeapons|addGems|setUpgrades|discoverWeapon|setBagWeapons/.test(engineSource));
}
