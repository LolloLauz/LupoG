// Segnalazioni dopo la Fase 4: boss chiuso fuori dall'arena, munizioni di arco e balestra (faretra),
// tasto Q per lasciare a terra, cancellazione di tutti i dati
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Boss sempre nell'arena, munizioni di arco e balestra con la faretra, tasto Q, cancella dati";

export default async function (t, load) {
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const { LevelManager, ARENA_GATE_WIDTH } = await load("systems/LevelManager");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { ITEM_CONFIG } = await load("config/itemConfig");
  const { ItemManager } = await load("systems/ItemManager");
  const { ScoreManager } = await load("systems/ScoreManager");
  const { Inventory } = await load("systems/Inventory");
  const { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } = await load("config/controlsConfig");
  const { ProgressManager } = await load("systems/ProgressManager");
  const { HighScoreManager } = await load("systems/HighScoreManager");
  const { GameState } = await load("core/GameState");
  const { ScreenManager, CONTROLS_ROWS } = await load("ui/ScreenManager");
  const { registerItemSprites } = await load("rendering/sprites/itemSprites");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });

  // --- 1. il boss non esce dall'arena ---
  const arenaLevels = LEVEL_CONFIG.filter((level) => level.bossArenaStartX !== undefined);
  t("ogni livello con un'arena ha il boss oltre il cancello", arenaLevels.length >= 4 && arenaLevels.every((level) => level.bossSpawn.x >= level.bossArenaStartX + ARENA_GATE_WIDTH));
  const escapes = [];
  const withoutLimit = [];
  for (const level of arenaLevels) {
    for (const limited of [true, false]) {
      const levelManager = new LevelManager();
      levelManager.loadLevel(level.id);
      const boss = levelManager.createBoss();
      if (limited && boss.arenaMinX !== level.bossArenaStartX + ARENA_GATE_WIDTH) escapes.push(`${level.id}: limite ${boss.arenaMinX}`);
      if (!limited) boss.arenaMinX = null;
      // il giocatore resta fermo prima del cancello, abbastanza vicino da svegliare il boss
      const player = new Player(level.bossArenaStartX - 50, 176);
      for (let i = 0; i < 5; i++) player.update(frame, input(), collision, levelManager.platforms, level.width);
      let minX = Infinity;
      for (let i = 0; i < 60 * 15; i++) {
        boss.update(frame, player, collision, levelManager.platforms, level.width, 0);
        minX = Math.min(minX, boss.positionX);
      }
      if (limited && minX < level.bossArenaStartX + ARENA_GATE_WIDTH) escapes.push(`${level.id}: x=${minX.toFixed(0)}`);
      if (!limited) withoutLimit.push(boss.isActive && minX < level.bossArenaStartX);
    }
  }
  t("senza il limite il boss si sveglia e insegue il giocatore fuori dall'arena (il difetto segnalato)", withoutLimit.some(Boolean), JSON.stringify(withoutLimit));
  t("con il limite nessun boss va oltre il cancello, nemmeno caricando, anche se il giocatore aspetta fuori per 15 s", escapes.length === 0, escapes.join("; "));
  {
    const levelManager = new LevelManager();
    const level = arenaLevels[0];
    levelManager.loadLevel(level.id);
    const boss = levelManager.createBoss();
    const player = new Player(level.bossArenaStartX - 50, 176);
    for (let i = 0; i < 60 * 5; i++) boss.update(frame, player, collision, levelManager.platforms, level.width, 0);
    levelManager.lockArena();
    t("chiudendo il cancello il boss è dentro l'arena", boss.positionX >= level.bossArenaStartX + ARENA_GATE_WIDTH);
  }

  // --- 2. munizioni di arco e balestra, faretra ---
  const groundPlatforms = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const grounded = (weaponId, ammo = null) => {
    const p = new Player(100, 176);
    p.equipWeapon(WEAPON_CONFIG[weaponId], ammo);
    for (let i = 0; i < 5; i++) p.update(frame, input(), collision, groundPlatforms, 3000);
    return p;
  };
  {
    const p = grounded("bow");
    let shots = 0;
    for (let i = 0; i < 14; i++) {
      p.update(frame, input(["attack"], ["attack"]), collision, groundPlatforms, 3000);
      for (let k = 0; k < 40; k++) p.update(frame, input(), collision, groundPlatforms, 3000);
      shots += p.drainProjectileLaunches().length;
    }
    t("arco: 12 frecce, poi non tira più e avvisa", shots === 12 && p.currentAmmo === 0 && p.drainOutOfAmmo(), `${shots} tiri, ${p.currentAmmo} rimaste`);
    p.update(frame, input(["heavyAttack"], ["heavyAttack"]), collision, groundPlatforms, 3000);
    for (let k = 0; k < 60; k++) p.update(frame, input(["heavyAttack"]), collision, groundPlatforms, 3000);
    for (let k = 0; k < 40; k++) p.update(frame, input(), collision, groundPlatforms, 3000);
    t("arco senza frecce: il tiro caricato non comincia e non parte nessuna freccia gratis", p.drainProjectileLaunches().length === 0 && p.currentAmmo === 0 && p.chargeFraction === null);
    const c = grounded("crossbow");
    c.update(frame, input(["attack"], ["attack"]), collision, groundPlatforms, 3000);
    for (let k = 0; k < 40; k++) c.update(frame, input(), collision, groundPlatforms, 3000);
    t("balestra: 6 dardi, ogni tiro ne consuma uno", c.drainProjectileLaunches().length === 1 && c.currentAmmo === 5);
    const charged = grounded("bow");
    charged.update(frame, input(["heavyAttack"], ["heavyAttack"]), collision, groundPlatforms, 3000);
    for (let k = 0; k < 30; k++) charged.update(frame, input(["heavyAttack"]), collision, groundPlatforms, 3000);
    for (let k = 0; k < 40; k++) charged.update(frame, input(), collision, groundPlatforms, 3000);
    t("il tiro caricato consuma una freccia", charged.drainProjectileLaunches().length === 1 && charged.currentAmmo === 11);
  }
  {
    const bag = new Inventory();
    bag.reset(["sword", "bow", "crossbow"], "bow");
    bag.setEquippedAmmo(0);
    t("una borsa nuova ha arco e balestra pieni", bag.snapshot().slots[2].ammo === 6);
    t("faretra: munizioni piene per tutte le armi che ne hanno", bag.refillAllAmmo() && bag.equippedAmmo === 12 && !bag.refillAllAmmo());
    const noAmmoBag = new Inventory();
    t("faretra inutile senza armi da tiro (resta a terra)", !noAmmoBag.refillAllAmmo());
  }
  t("faretra: oggetto con sprite 8x8 e nessun effetto al tocco", ITEM_CONFIG.quiver?.refillsAmmo === true && (() => { const sm = new FakeSpriteManager(); registerItemSprites(sm); const s = sm.sprites.get(ITEM_CONFIG.quiver.spriteId); return s?.width === 8 && s.height === 8; })());
  t("una faretra in ogni livello, appoggiata a terra e non dentro un'arena", LEVEL_CONFIG.every((level) => {
    const quivers = level.items.filter((item) => item.type === "quiver");
    return quivers.length === 1 && quivers.every((q) => q.position.y === 192 && level.platforms.some((p) => p.y === 200 && q.position.x >= p.x && q.position.x + 8 <= p.x + p.width) && (level.bossArenaStartX === undefined || q.position.x < level.bossArenaStartX));
  }));
  {
    const items = new ItemManager();
    items.loadItems([{ type: "quiver", position: { x: 100, y: 192 } }]);
    const p = grounded("sword");
    const taken = items.collectItems(p, new ScoreManager());
    t("toccare la faretra non la raccoglie da sola: la raccoglie il motore se ricarica qualcosa", taken.length === 0 && items.remainingItemCount === 1 && items.findTouchedAmmoRefill(p) !== null);
    t("il motore raccoglie la faretra solo se ha ricaricato qualcosa e aggiorna l'arma in mano", /private refillAmmoFromQuiver[\s\S]{0,200}quiver === null \|\| !this\.inventory\.refillAllAmmo\(\)[\s\S]{0,120}this\.itemManager\.removeItem\(quiver\)[\s\S]{0,200}this\.player\.setAmmo/.test(engineSource));
  }

  // --- 3. tasto Q ---
  t("Q lascia a terra, solo in gioco", CONTROLS_CONFIG.dropItem?.includes("KeyQ") && INPUT_CONTEXT_ACTIONS.gameplay.includes("dropItem") && !INPUT_CONTEXT_ACTIONS.menu.includes("dropItem") && CONTROLS_ROWS.some((r) => r.keyGroups.flat().includes("Q")));
  {
    const bag = new Inventory();
    bag.reset(["sword", "throwingKnives"], "throwingKnives");
    bag.setEquippedAmmo(4);
    bag.addPotion();
    bag.addPotion();
    const knives = bag.dropSlot(1);
    t("lasciando l'arma in mano escono arma e munizioni, e si impugna la prima arma rimasta", knives.kind === "weapon" && knives.weaponId === "throwingKnives" && knives.ammo === 4 && bag.equippedWeaponId === "sword" && !bag.hasWeapon("throwingKnives"));
    t("l'ultima arma non si lascia", bag.dropSlot(0).kind === "lastWeapon" && bag.hasWeapon("sword"));
    const potionSlot = bag.bagSlots.findIndex((s) => s?.kind === "potion");
    t("una pozione alla volta (il posto si libera con l'ultima)", bag.dropSlot(potionSlot).kind === "potion" && bag.potionCount === 1 && bag.dropSlot(potionSlot).kind === "potion" && bag.potionCount === 0 && bag.bagSlots[potionSlot] === null);
    t("un posto vuoto non lascia niente", bag.dropSlot(3).kind === "empty");
    const other = new Inventory();
    other.reset(["sword", "axe", "bow"], "sword");
    t("lasciando un'arma che non è in mano, quella in mano resta", other.dropSlot(2).kind === "weapon" && other.equippedWeaponId === "sword");
  }
  t("motore: Q tenuto + 1-4 lascia quel posto, Q da solo (al rilascio) l'arma in mano; 1-4 senza Q usa il posto", /if \(isDropHeld\) \{[\s\S]{0,80}this\.dropFromBag\(slotIndex\);[\s\S]{0,40}\} else \{[\s\S]{0,20}this\.useBagSlot\(slotIndex\)/.test(engineSource) && /wasReleased\("dropItem"\) && !this\.hasDroppedWithSlotKey\)[\s\S]{0,40}this\.dropFromBag\(this\.inventory\.equippedSlotIndex\)/.test(engineSource));
  t("motore: si lascia solo stando a terra; l'arma diventa un'arma a terra con le munizioni, la pozione un oggetto", /private dropFromBag[\s\S]{0,300}!this\.player\.isOnGround[\s\S]{0,300}this\.weaponPickups\.spawn\(drop\.weaponId, centerX, feetY, false, drop\.ammo\)[\s\S]{0,600}this\.itemManager\.addItem\("healthPotion"/.test(engineSource));
  {
    const items = new ItemManager();
    items.loadItems([]);
    const potion = items.addItem("healthPotion", 100, 192);
    const p = grounded("sword");
    t("una pozione lasciata a terra si riprende con E", items.findReachableBagItem(p) === potion);
  }

  // --- 4. cancella dati ---
  {
    const memory = () => { const data = new Map(); return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
    const store = memory();
    const progress = new ProgressManager(store);
    progress.unlockLevel(5);
    progress.setDifficulty("hard");
    progress.setCharacter("ranger");
    progress.setBagWeapons(["bow", "axe"], "bow");
    progress.reset();
    const reloaded = new ProgressManager(store);
    t("cancella dati: livello 1, normale, cavaliere, sola spada (anche dopo aver ricaricato)", [progress, reloaded].every((pm) => pm.unlockedLevelId === 1 && pm.difficulty === "normal" && pm.characterId === "knight" && pm.equippedWeaponId === "sword" && pm.bagWeaponIds.join() === "sword"));
    const scores = memory();
    const high = new HighScoreManager(scores);
    high.submitScore(5000);
    high.reset();
    t("cancella dati: record a zero (anche dopo aver ricaricato)", high.bestScore === 0 && new HighScoreManager(scores).bestScore === 0 && high.submitScore(10));
    const broken = { getItem() { throw new Error("bloccato"); }, setItem() { throw new Error("bloccato"); } };
    const offline = new HighScoreManager(broken);
    offline.reset();
    const offlineProgress = new ProgressManager(broken);
    offlineProgress.reset();
    t("cancella dati con l'archivio bloccato: nessun errore", offline.bestScore === 0 && offlineProgress.unlockedLevelId === 1);
  }
  {
    const state = new GameState();
    t("titolo -> conferma -> titolo; dalla conferma non si va in gioco", state.change("confirmReset") && !state.change("playing") && state.change("title"));
    const screens = new ScreenManager(new FakeSpriteManager());
    const data = { score: 0, bestScore: 0, collectibles: 0, isNewRecord: false, difficultyName: "NORMALE", characterId: "knight", levels: [], unlockedCharacterIds: ["knight", "ranger", "berserker", "paladin"], gems: 0, coins: 0, shopOffers: [], upgrades: [] };
    const press = (stateName, action) => screens.update(stateName, { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
    press("title", "menuUp");
    t("l'ultima voce del titolo è CANCELLA DATI e apre la conferma", press("title", "confirm") === "showResetConfirm");
    screens.resetSelection();
    t("conferma: la voce predefinita è NO (Invio torna al titolo senza cancellare)", press("confirmReset", "confirm") === "backToTitle");
    press("confirmReset", "menuDown");
    t("conferma: scendendo su SÌ si cancella; ESC torna indietro", press("confirmReset", "confirm") === "resetAllData" && press("confirmReset", "pause") === "backToTitle");
    t("motore: cancella progressi e record e rimette cavaliere, borsa con la spada e avviso", /case "resetAllData":[\s\S]{0,60}this\.resetAllData\(\);[\s\S]{0,120}showNotice/.test(engineSource) && /private resetAllData\(\): void \{[\s\S]{0,80}this\.progressManager\.reset\(\);[\s\S]{0,20}this\.highScoreManager\.reset\(\);[\s\S]{0,400}setCharacter[\s\S]{0,200}equipWeapon/.test(engineSource));
  }
}
