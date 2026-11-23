// Fase 6: monete e bottega, gemme e potenziamenti permanenti, sblocchi di personaggi e armi
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Monete e bottega, gemme e potenziamenti permanenti, personaggi e armi da sbloccare";

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
  const { ProgressManager } = await load("systems/ProgressManager");
  const { Player } = await load("entities/Player");
  const { GameState } = await load("core/GameState");
  const { ScreenManager } = await load("ui/ScreenManager");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");
  const memory = () => { const data = new Map(); return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };

  // --- configurazione ---
  t("economia: monete per nemico, élite e boss", P.ECONOMY_CONFIG.coinsPerEnemy > 0 && P.ECONOMY_CONFIG.eliteCoinMultiplier > 1 && P.ECONOMY_CONFIG.coinsPerBoss > P.ECONOMY_CONFIG.coinsPerEnemy);
  t("la moneta dei livelli dà monete oltre ai punti", ITEM_CONFIG.scoreCoin.coins === 10 && ITEM_CONFIG.scoreCoin.scoreBonus === 50);
  t("bottega: quattro voci con prezzo positivo", Object.values(P.SHOP_OFFERS).length === 4 && Object.values(P.SHOP_OFFERS).every((o) => o.price > 0 && o.name.length > 0));
  t("potenziamenti: quattro, ognuno con costi crescenti", P.UPGRADE_ORDER.length === 4 && P.UPGRADE_ORDER.every((id) => { const c = P.UPGRADE_CONFIG[id].costs; return c.length > 0 && c.every((cost, i) => cost > 0 && (i === 0 || cost >= c[i - 1])); }));
  {
    const bonus = P.computeUpgradeBonuses({ vitality: 2, endurance: 1, strength: 3, supplies: 1 });
    const none = P.computeUpgradeBonuses(P.NO_UPGRADES);
    t("bonus dei potenziamenti: +20 salute, +15 stamina, danno x1,15, 1 pozione; senza: nessun bonus", bonus.maxHealth === 20 && bonus.maxStamina === 15 && Math.abs(bonus.damageMultiplier - 1.15) < 1e-9 && bonus.startingPotions === 1 && none.maxHealth === 0 && none.damageMultiplier === 1 && none.startingPotions === 0);
  }
  t("sblocchi: il cavaliere subito, gli altri a livelli crescenti che esistono", CHARACTER_CONFIG.knight.unlockLevel === 1 && CHARACTER_ORDER.slice(1).every((id, i, rest) => CHARACTER_CONFIG[id].unlockLevel > 1 && LEVEL_CONFIG.some((l) => l.id === CHARACTER_CONFIG[id].unlockLevel) && (i === 0 || CHARACTER_CONFIG[id].unlockLevel >= CHARACTER_CONFIG[rest[i - 1]].unlockLevel) && CHARACTER_CONFIG[id].unlockText.length > 0));

  // --- monete ---
  {
    const score = new ScoreManager();
    score.addCoins(30);
    t("monete: si sommano e si spendono solo se bastano", score.coins === 30 && !score.spendCoins(40) && score.coins === 30 && score.spendCoins(25) && score.coins === 5);
    score.restore(100, 2);
    t("ripristino senza monete: restano quelle attuali (compatibile con i vecchi usi)", score.coins === 5 && score.currentScore === 100);
    score.restore(0, 0, 12);
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
    t("bottega senza armi trovate da vendere: pozione, cura, faretra", noWeapons.offers.map((o) => o.id).join() === "potion,heal,ammo");
    c.inventory.addWeapon("axe");
    const shop = Shop.open(["sword", "axe", "bow", "mace"], c.inventory, () => 0.99);
    const weaponOffer = shop.offers.find((o) => o.id === "weapon");
    t("l'arma in vendita è una di quelle trovate che non sono nella borsa", weaponOffer !== undefined && ["bow", "mace"].includes(weaponOffer.weaponId) && weaponOffer.name === WEAPON_CONFIG[weaponOffer.weaponId].name.toUpperCase());
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
    t("borsa senza posti liberi: l'arma non si compra", fullShop.buy(3, full) === "bagFull" && !full.inventory.hasWeapon("bow"));
  }

  // --- progressi: gemme, potenziamenti, armi trovate, sblocchi ---
  {
    const store = memory();
    const progress = new ProgressManager(store);
    t("progressi nuovi: nessuna gemma, nessun potenziamento, trovata solo la spada", progress.gems === 0 && P.UPGRADE_ORDER.every((id) => progress.upgradeLevels[id] === 0) && progress.discoveredWeaponIds.join() === "sword");
    progress.addGems(5);
    t("le gemme si mettono da parte e si salvano", new ProgressManager(store).gems === 5);
    t("comprare un potenziamento costa gemme e sale di livello", progress.buyUpgrade("vitality") && progress.gems === 3 && progress.upgradeLevels.vitality === 1 && progress.getNextUpgradeCost("vitality") === 3);
    progress.buyUpgrade("endurance"); // 2 gemme: ne resta 1
    t("gemme insufficienti: niente acquisto", progress.gems === 1 && !progress.buyUpgrade("strength") && progress.gems === 1 && progress.upgradeLevels.strength === 0);
    progress.addGems(100);
    progress.buyUpgrade("supplies");
    progress.buyUpgrade("supplies");
    t("al livello massimo non si compra più", progress.getNextUpgradeCost("supplies") === null && !progress.buyUpgrade("supplies") && progress.upgradeLevels.supplies === 2);
    t("potenziamenti salvati", new ProgressManager(store).upgradeLevels.supplies === 2 && new ProgressManager(store).upgradeLevels.vitality === 1);
    progress.discoverWeapon("bow");
    progress.discoverWeapon("bow");
    t("un'arma trovata resta sbloccata (senza doppioni)", new ProgressManager(store).discoveredWeaponIds.join() === "sword,bow");
    t("personaggi: all'inizio solo il cavaliere", CHARACTER_ORDER.filter((id) => progress.isCharacterUnlocked(id)).join() === "knight");
    progress.setCharacter("paladin");
    t("un personaggio bloccato salvato si gioca come cavaliere", progress.characterId === "knight");
    progress.unlockLevel(3);
    t("raggiunto il livello 3 si sblocca il ranger", progress.isCharacterUnlocked("ranger") && !progress.isCharacterUnlocked("berserker"));
    progress.unlockLevel(6);
    t("raggiunto il livello 6 tutti sbloccati, e il paladino salvato torna valido", CHARACTER_ORDER.every((id) => progress.isCharacterUnlocked(id)) && progress.characterId === "paladin");
    progress.reset();
    t("cancella dati: gemme, potenziamenti e armi trovate azzerati", progress.gems === 0 && progress.upgradeLevels.supplies === 0 && progress.discoveredWeaponIds.join() === "sword");
    const odd = memory();
    odd.setItem("ironAndShadow.progress", JSON.stringify({ unlockedLevelId: 2, gems: -4, upgradeLevels: { vitality: 99, strength: "x", magic: 2 }, discoveredWeaponIds: ["axe", "bazooka"], bagWeaponIds: ["mace"], equippedWeaponId: "mace" }));
    const loaded = new ProgressManager(odd);
    t("dati strani: gemme negative a 0, livelli entro il massimo, armi sconosciute ignorate, armi della borsa trovate", loaded.gems === 0 && loaded.upgradeLevels.vitality === 3 && loaded.upgradeLevels.strength === 0 && !("magic" in loaded.upgradeLevels) && loaded.discoveredWeaponIds.join() === "sword,axe,mace");
    const old = memory();
    old.setItem("ironAndShadow.progress", JSON.stringify({ unlockedLevelId: 4, difficulty: "normal", characterId: "berserker" }));
    t("salvataggio di prima della Fase 6: nessuna gemma, personaggio valido se il livello lo sblocca", new ProgressManager(old).gems === 0 && new ProgressManager(old).characterId === "berserker");
  }

  // --- giocatore con i potenziamenti ---
  {
    const p = new Player(0, 0, CHARACTER_CONFIG.knight);
    p.setUpgrades(P.computeUpgradeBonuses({ vitality: 3, endurance: 2, strength: 2, supplies: 0 }));
    t("potenziamenti sul giocatore: salute 130, stamina 130, danno x1,1 (piene)", p.maxHealth === 130 && p.currentHealth === 130 && p.maxStamina === 130 && p.stamina === 130 && Math.abs(p.getDamageMultiplier() - 1.1) < 1e-9);
    p.setCharacter(CHARACTER_CONFIG.ranger);
    t("cambiando personaggio i potenziamenti restano", p.maxHealth === 105 && p.currentHealth === 105);
    p.takeDamage(30, 100);
    p.revive();
    t("dopo la morte salute e stamina tornano al massimo potenziato", p.currentHealth === 105 && p.stamina === 130);
  }

  // --- schermate e stati ---
  {
    const state = new GameState();
    t("titolo -> potenziamenti -> titolo", state.change("upgrades") && !state.change("playing") && state.change("title"));
    state.change("playing");
    t("gioco -> bottega -> gioco; dalla bottega non si torna al titolo", state.change("shop") && !state.change("title") && !state.change("paused") && state.change("playing"));
    const screens = new ScreenManager(new FakeSpriteManager());
    const data = {
      score: 0, bestScore: 0, collectibles: 0, isNewRecord: false, difficultyName: "NORMALE", characterId: "knight", levels: [],
      unlockedCharacterIds: ["knight"], gems: 3, coins: 50,
      shopOffers: [{ name: "POZIONE", description: "", price: 40, isSoldOut: false, iconSpriteId: "itemPotion", iconSize: 8 }, { name: "CURA", description: "", price: 25, isSoldOut: false, iconSpriteId: "hudHeart", iconSize: 8 }],
      upgrades: [{ name: "VITALITÀ", description: "", level: 0, maxLevel: 3, nextCost: 2 }],
    };
    const press = (stateName, action) => screens.update(stateName, { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
    t("bottega: Invio sulla prima voce compra", press("shop", "confirm") === "buyShopOffer" && screens.selectedShopIndex === 0);
    press("shop", "menuUp");
    t("bottega: W dalla prima voce porta a PROSEGUI, che esce", screens.selectedShopIndex === 2 && press("shop", "confirm") === "leaveShop");
    t("bottega: Esc non fa uscire (si esce solo con PROSEGUI)", press("shop", "pause") === null);
    t("potenziamenti: Invio compra, INDIETRO ed Esc tornano al titolo", press("upgrades", "confirm") === "buyUpgrade" && (press("upgrades", "menuDown"), press("upgrades", "confirm")) === "backToTitle" && press("upgrades", "pause") === "backToTitle");
    screens.resetSelection();
    for (let i = 0; i < 3; i++) press("title", "menuDown");
    t("la quarta voce del titolo apre i potenziamenti", press("title", "confirm") === "showUpgrades");
    screens.resetSelection();
    press("characterSelect", "menuRight");
    t("un personaggio bloccato non si conferma", screens.selectedCharacterId === "ranger" && press("characterSelect", "confirm") === null);
  }

  // --- motore ---
  t("motore: monete da nemici (élite x3) e boss; ricominciando un livello tornano quelle di inizio livello", /addCoins\(ECONOMY_CONFIG\.coinsPerBoss\)/.test(engineSource) && /addCoins\(ECONOMY_CONFIG\.coinsPerEnemy \* \(enemy\.isElite \? ECONOMY_CONFIG\.eliteCoinMultiplier : 1\)\)/.test(engineSource) && engineSource.includes("this.scoreManager.restore(this.levelStartScore, this.levelStartCollectibles, this.levelStartCoins);"));
  t("motore: a fine livello si mettono da parte le gemme e si sblocca il livello successivo (e i personaggi)", /this\.gemsBankedThisLevel = this\.scoreManager\.collectiblesFound - this\.levelStartCollectibles;\s*this\.progressManager\.addGems\(this\.gemsBankedThisLevel\);[\s\S]{0,300}this\.progressManager\.unlockLevel\(nextLevelId\)/.test(engineSource));
  t("motore: dopo il riquadro di fine livello la bottega (o la vittoria); PROSEGUI avvia il livello successivo", /private advanceToNextLevel[\s\S]{0,300}Shop\.open\(this\.progressManager\.discoveredWeaponIds, this\.inventory\);\s*this\.gameState\.change\("shop"\)/.test(engineSource) && /private leaveShop[\s\S]{0,120}this\.startLevel\(this\.currentLevelId \+ 1\);\s*this\.gameState\.change\("playing"\)/.test(engineSource));
  t("motore: a ogni partita potenziamenti e pozioni della Scorta; le armi raccolte diventano trovate", /private startNewGame[\s\S]{0,400}computeUpgradeBonuses\(this\.progressManager\.upgradeLevels\)[\s\S]{0,80}this\.player\.setUpgrades\(upgrades\)[\s\S]{0,600}upgrades\.startingPotions/.test(engineSource) && /this\.weaponPickups\.take\(pickup\);\s*this\.progressManager\.discoverWeapon\(pickup\.weaponId\)/.test(engineSource));
}
