// Piano dell'equipaggiamento, fasi E3-E6: spadone, schermata dell'equipaggiamento, fonti e bottino, negozio camminabile
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Equipaggiamento (E3-E6): spadone, schermata e zaino, fonti degli oggetti e Mitici, prezzi crescenti, stanza del negozio";

export default async function (t, load) {
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { PLAYER_ANIMATIONS } = await load("config/animationConfig");
  const { registerKnightSprites, KNIGHT_CROUCH_SUFFIX } = await load("rendering/sprites/knightSprites");
  const { LEVEL_CONFIG, THEME_STYLES } = await load("config/levelConfig");
  const { LOOT_SOURCES } = await load("config/lootConfig");
  const L = await load("systems/LootSystem");
  const F = await load("systems/ItemFactory");
  const { MYTHIC_ITEMS, LEGENDARY_ITEMS } = await load("config/uniqueItemConfig");
  const { Shop } = await load("systems/Shop");
  const { Inventory } = await load("systems/Inventory");
  const { Player } = await load("entities/Player");
  const { ScoreManager } = await load("systems/ScoreManager");
  const { SHOP_PRICE_INCREASE_PER_PURCHASE } = await load("config/progressionConfig");
  const { SHOP_ROOM_CONFIG, SHOP_ROOM_LEVEL } = await load("config/shopRoomConfig");
  const { GameState } = await load("core/GameState");
  const { ScreenManager, CONTROLS_ROWS, CONTROLS_TABLE, CONTROLS_NOTES_Y } = await load("ui/ScreenManager");
  const { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } = await load("config/controlsConfig");
  const { PALETTE } = await load("config/gameConfig");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");
  const paletteColors = new Set(Object.values(PALETTE));

  // --- E3: spadone ---
  const greatsword = WEAPON_CONFIG.greatsword;
  t("spadone: lento, colpi forti e lunghi che rompono la guardia", greatsword !== undefined && greatsword.movementSpeedMultiplier < 1 && Object.values(greatsword.attacks).every((a) => a.breaksGuard === true) && greatsword.attacks.greatswordHeavy.damage > WEAPON_CONFIG.sword.attacks.swordHeavy.damage && greatsword.attacks.greatswordSlash1.hitbox.width > WEAPON_CONFIG.sword.attacks.swordLight1.hitbox.width);
  t("spadone: ogni attacco ha la sua animazione, con la durata dell'attacco", Object.values(greatsword.attacks).every((a) => PLAYER_ANIMATIONS[a.animation] !== undefined && Math.abs(PLAYER_ANIMATIONS[a.animation].frameDurationMs * PLAYER_ANIMATIONS[a.animation].frameIds.length - a.durationMs) < 1e-6));
  t("spadone: combo eseguibili (recupero più breve della finestra), anche in aria", [...greatsword.combos, ...greatsword.air.combos].every((combo) => combo.attackIds.slice(0, -1).every((id) => greatsword.attacks[id].cooldownMs < combo.comboWindowMs)));
  {
    const sm = new FakeSpriteManager();
    registerKnightSprites(sm, "knight");
    const frames = [...new Set(Object.values(greatsword.attacks).flatMap((a) => PLAYER_ANIMATIONS[a.animation].frameIds))];
    const missing = frames.filter((f) => !sm.has(`${f}Greatsword`) || !sm.has(`${f}${KNIGHT_CROUCH_SUFFIX}Greatsword`));
    t("spadone: un frame per ogni posa (anche accovacciata), frame più larghi della spada", missing.length === 0 && sm.sprites.get("knightHeavyCGreatsword").width > sm.sprites.get("knightHeavyC").width, missing.join());
    t("spadone: icona 16x16 e frame d'attesa con lo spadone", sm.sprites.get("weaponIconGreatsword")?.width === 16 && sm.has("knightIdle1Greatsword"));
  }
  t("spadone: si trova nei livelli (nemico d'élite) e ha un Leggendario", LEVEL_CONFIG.some((l) => l.enemies.some((e) => e.weaponDrop === "greatsword")) && Object.values(LEGENDARY_ITEMS).some((u) => u.baseId === "greatsword"));

  // --- E5: fonti ---
  t("ogni fonte ha pesi validi; i Mitici solo dal boss finale", Object.values(LOOT_SOURCES).every((s) => Object.values(s.rarityWeights).some((w) => w > 0) && s.armorChance >= 0 && s.armorChance <= 1) && Object.values(LOOT_SOURCES).every((s) => (s.rarityWeights.mythic ?? 0) === 0 || s.id === "finalBoss"));
  t("boss più generosi delle élite, élite più dei nemici normali (niente Comuni dai boss)", (LOOT_SOURCES.boss.rarityWeights.common ?? 0) === 0 && (LOOT_SOURCES.elite.rarityWeights.epic ?? 0) > (LOOT_SOURCES.enemy.rarityWeights.epic ?? 0));
  {
    const early = L.getLootRarityWeights({ source: "chest", levelId: 1, difficulty: "normal" });
    const late = L.getLootRarityWeights({ source: "chest", levelId: 7, difficulty: "normal" });
    const hard = L.getLootRarityWeights({ source: "chest", levelId: 1, difficulty: "hard" });
    const share = (w, rarity) => w[rarity] / Object.values(w).reduce((a, b) => a + b, 0);
    t("avanzando nei livelli (e a difficile) le rarità alte pesano di più", share(late, "epic") > share(early, "epic") && share(hard, "rare") > share(early, "rare") && early.mythic === undefined);
    const random = F.createSeededRandom(11);
    let mythicFromChests = 0;
    for (let i = 0; i < 3000; i++) if (L.rollLootWeapon("sword", { source: "chest", levelId: 7, difficulty: "hard" }, random).rarity === "mythic") mythicFromChests++;
    t("nessun Mitico dai forzieri, nemmeno alla fine e a difficile", mythicFromChests === 0);
    const rewards = Array.from({ length: 200 }, () => L.rollFinalBossReward({ source: "finalBoss", levelId: 7, difficulty: "normal" }, random));
    t("boss finale: sempre un oggetto fisso, a volte Mitico", rewards.every((r) => r.uniqueId !== undefined && (r.rarity === "legendary" || r.rarity === "mythic")) && rewards.some((r) => r.rarity === "mythic") && rewards.every((r) => r.rarity !== "mythic" || MYTHIC_ITEMS[r.uniqueId] !== undefined));
    const materials = (level) => L.getArmorMaterialWeights(level);
    t("armature: all'inizio stoffa e cuoio, alla fine ferro e acciaio", materials(1).steel === 0 && materials(1).cloth > 0 && materials(7).steel > 0 && materials(7).cloth === 0);
    const pieces = Array.from({ length: 200 }, () => L.rollLootArmor({ source: "elite", levelId: 4, difficulty: "normal" }, random));
    t("pezzi d'armatura estratti: tutti e tre i posti", new Set(pieces.map((p) => p.baseId.replace(/^(cloth|leather|iron|steel)/, ""))).size === 3);
  }
  t("motore: forzieri, élite e boss danno oggetti con rarità; il boss finale dà il trofeo Mitico", /private openChest[\s\S]{0,600}rollLootWeapon\(weaponId, context, this\.lootRandom\)[\s\S]{0,200}rollArmorDrop\("chest"/.test(engineSource) && /awardFinalBossReward\(\);/.test(engineSource) && /this\.finalBossRewardName = getItemName\(rollFinalBossReward\(/.test(engineSource));
  t("motore: il furto di vita conta i colpi andati a segno", /this\.player\.registerDamageDealt\(damage\)/.test(engineSource));

  // --- bottega: rarità, prezzi crescenti, offerta ripetibile ---
  const customer = (coins) => {
    const inventory = new Inventory();
    const player = new Player(100, 176);
    const scoreManager = new ScoreManager();
    scoreManager.addCoins(coins);
    return { inventory, player, scoreManager };
  };
  {
    const a = Shop.open(["sword", "axe", "bow"], new Inventory(), F.createSeededRandom(5), { levelId: 4, difficulty: "normal" });
    const b = Shop.open(["sword", "axe", "bow"], new Inventory(), F.createSeededRandom(5), { levelId: 4, difficulty: "normal" });
    t("offerta ripetibile con lo stesso seme", a.offers.every((offer, i) => offer.id === b.offers[i].id && offer.price === b.offers[i].price && (offer.item === null || F.areItemsEqual(offer.item, b.offers[i].item))));
    t("arma e armatura in vendita con rarità e prezzo secondo la rarità", a.offers.filter((o) => o.item !== null).every((o) => o.price === F.getItemPrice(o.item)) && a.offers.some((o) => o.id === "armor" && o.item.kind === "armor"));
    const c = customer(2000);
    const weaponIndex = a.offers.findIndex((o) => o.id === "weapon");
    const armorIndex = a.offers.findIndex((o) => o.id === "armor");
    const armorPriceBefore = a.getPrice(a.offers[armorIndex]);
    const coinsBefore = c.scoreManager.coins;
    t("comprata l'arma, il prezzo dell'armatura sale (+25%)", a.buy(weaponIndex, c) === "bought" && a.getPrice(a.offers[armorIndex]) === Math.round((a.offers[armorIndex].price * (1 + SHOP_PRICE_INCREASE_PER_PURCHASE)) / 5) * 5 && a.getPrice(a.offers[armorIndex]) > armorPriceBefore);
    const potionPrice = a.getPrice(a.offers[0]);
    t("pozioni, cure e munizioni non rincarano", potionPrice === a.offers[0].price);
    t("armatura comprata: indossata (posto libero)", a.buy(armorIndex, c) === "bought" && Object.values(c.inventory.equippedArmor).some((piece) => piece !== null) && c.scoreManager.coins < coinsBefore);
    t("niente rivendita: la bottega non compra", typeof a.sell === "undefined");
  }

  // --- E4: schermata dell'equipaggiamento ---
  {
    const state = new GameState();
    state.change("playing");
    t("gioco -> equipaggiamento -> gioco; pausa -> equipaggiamento -> pausa", state.change("equipment") && state.change("playing") && state.change("paused") && state.change("equipment") && state.change("paused"));
    t("tasto I: apre (in gioco) e chiude (nei menu); Q lascia anche dalla schermata", CONTROLS_CONFIG.openEquipment.includes("KeyI") && INPUT_CONTEXT_ACTIONS.gameplay.includes("openEquipment") && INPUT_CONTEXT_ACTIONS.menu.includes("openEquipment") && INPUT_CONTEXT_ACTIONS.menu.includes("dropItem"));
    t("la schermata dei controlli mostra I e la tabella non tocca le scritte sotto", CONTROLS_ROWS.some((r) => r.keyGroups.flat().includes("I")) && CONTROLS_TABLE.firstRowY + (CONTROLS_ROWS.length - 1) * CONTROLS_TABLE.rowStep + 14 < CONTROLS_NOTES_Y[0]);
    const screens = new ScreenManager(new FakeSpriteManager());
    const equipment = { armor: { helmet: null, chest: null, boots: null }, bag: [null, null, null, null], backpack: [], backpackCapacity: 12, activeSets: [], bonuses: {} };
    const data = { levels: [], unlockedCharacterIds: ["knight"], shopOffers: [], equipment, characterId: "knight" };
    const press = (stateName, action) => screens.update(stateName, { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
    t("cursore: parte dall'elmo", JSON.stringify(screens.selectedEquipmentCell) === JSON.stringify({ section: "armor", slot: "helmet" }));
    press("equipment", "menuRight"); press("equipment", "menuRight"); press("equipment", "menuRight");
    t("a destra delle armature c'è la borsa", JSON.stringify(screens.selectedEquipmentCell) === JSON.stringify({ section: "bag", index: 0 }));
    press("equipment", "menuDown");
    t("sotto: lo zaino (colonna mantenuta)", JSON.stringify(screens.selectedEquipmentCell) === JSON.stringify({ section: "backpack", index: 3 }));
    press("equipment", "menuDown");
    t("seconda riga dello zaino", JSON.stringify(screens.selectedEquipmentCell) === JSON.stringify({ section: "backpack", index: 9 }));
    t("Invio usa, Q lascia, I ed Esc chiudono", press("equipment", "confirm") === "equipmentUse" && press("equipment", "dropItem") === "equipmentDrop" && press("equipment", "openEquipment") === "closeEquipment" && press("equipment", "pause") === "closeEquipment");
    screens.resetSelection();
    press("paused", "menuUp");
    t("la pausa ha la voce EQUIPAGGIAMENTO (l'ultima: ESCI AL TITOLO resta la seconda)", press("paused", "confirm") === "showEquipment");
  }
  t("motore: I apre la schermata solo giocando; chiudendo si torna da dove si era", /wasPressed\("openEquipment"\) && this\.levelPhase === "playing"[\s\S]{0,80}this\.gameState\.change\("equipment"\)/.test(engineSource) && /case "closeEquipment":[\s\S]{0,120}this\.gameState\.previous === "paused" \? "paused" : "playing"/.test(engineSource));
  t("motore: nella schermata si usa e si lascia a terra (solo stando a terra)", /private useEquipmentCell[\s\S]{0,900}equipFromBackpack/.test(engineSource) && /private dropEquipmentCell[\s\S]{0,200}!this\.player\.isOnGround[\s\S]{0,100}SOLO A TERRA/.test(engineSource));
  t("motore: il mondo resta disegnato dietro la schermata dell'equipaggiamento", /state === "playing" \|\| state === "paused" \|\| state === "equipment"/.test(engineSource));

  // --- E6: stanza del negozio ---
  t("stanza del negozio attiva (la bottega a menu resta come ripiego)", SHOP_ROOM_CONFIG.isEnabled === true && /SHOP_ROOM_CONFIG\.isEnabled[\s\S]{0,80}this\.enterShopRoom\(\)[\s\S]{0,60}else[\s\S]{0,60}this\.gameState\.change\("shop"\)/.test(engineSource));
  t("stanza: niente nemici né boss, pavimento continuo, uscita a destra dentro la mappa", SHOP_ROOM_LEVEL.enemies.length === 0 && !SHOP_ROOM_LEVEL.hasBoss && SHOP_ROOM_LEVEL.platforms.some((p) => p.x <= 0 && p.x + p.width >= SHOP_ROOM_LEVEL.width && p.y === SHOP_ROOM_LEVEL.playerStart.y + 24) && SHOP_ROOM_LEVEL.completion.kind === "reachExit" && SHOP_ROOM_LEVEL.completion.exitX < SHOP_ROOM_LEVEL.width);
  t("stanza: un piedistallo per ogni voce, tra la partenza e l'uscita, distanti tra loro", SHOP_ROOM_CONFIG.pedestalCenters.length >= 5 && SHOP_ROOM_CONFIG.pedestalCenters.every((x, i, all) => x > SHOP_ROOM_LEVEL.playerStart.x + 24 && x < SHOP_ROOM_LEVEL.completion.exitX - 20 && (i === 0 || x - all[i - 1] > SHOP_ROOM_CONFIG.reachDistance * 2)));
  t("ambientazione della bottega: stile del terreno e colori della mercante della palette", THEME_STYLES.shop !== undefined && Object.values(SHOP_ROOM_CONFIG.merchantColors).every((c) => paletteColors.has(c)));
  t("motore: E vicino a un piedistallo compra; la porta porta al livello successivo", /private pickUpWithE[\s\S]{0,200}this\.isInShopRoom[\s\S]{0,120}this\.buyFromShopRoom\(offerIndex\)/.test(engineSource) && /isCompleted && this\.isInShopRoom\)[\s\S]{0,80}this\.leaveShop\(\)/.test(engineSource) && /private leaveShop[\s\S]{0,200}this\.startLevel\(this\.currentLevelId \+ 1\)/.test(engineSource));
}
