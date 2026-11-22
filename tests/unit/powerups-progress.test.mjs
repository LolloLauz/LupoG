// Fase 5: power-up (modificatori senza toccare le statistiche base), difficoltà, progressi salvati, selezione dei livelli

export const description = "Power-up e modificatori, difficoltà, progressi salvati, selezione dei livelli";

export default async function (t, load) {
  const { PlayerModifiers } = await load("combat/PlayerModifiers");
  const { POWER_UP_CONFIG } = await load("config/powerUpConfig");
  const { PLAYER_CONFIG } = await load("config/playerConfig");
  const { Player } = await load("entities/Player");
  const { Enemy } = await load("entities/Enemy");
  const { Boss } = await load("entities/Boss");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { CombatSystem } = await load("combat/CombatSystem");
  const { ItemManager } = await load("systems/ItemManager");
  const { ScoreManager } = await load("systems/ScoreManager");
  const { LivesManager } = await load("systems/LivesManager");
  const { ProgressManager } = await load("systems/ProgressManager");
  const { GameState } = await load("core/GameState");
  const { ScreenManager } = await load("ui/ScreenManager");
  const { ENEMY_CONFIG, BOSS_CONFIG } = await load("config/enemyConfig");
  const { DIFFICULTY_CONFIG, DIFFICULTY_ORDER } = await load("config/gameConfig");
  const { ITEM_CONFIG } = await load("config/itemConfig");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 2000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const groundedPlayer = (x = 100) => {
    const player = new Player(x, 176);
    for (let i = 0; i < 5; i++) player.update(frame, input(), collision, ground, 2000);
    return player;
  };

  // ---------- modificatori ----------
  const modifiers = new PlayerModifiers();
  t("senza power-up: moltiplicatori 1, bonus 0", modifiers.getValue("damageMultiplier") === 1 && modifiers.getValue("bonusDamage") === 0);
  modifiers.add(POWER_UP_CONFIG.berserk);
  modifiers.add(POWER_UP_CONFIG.speed);
  t("furia e velocità insieme: danno x1,5 e movimento x1,4", modifiers.getValue("damageMultiplier") === 1.5 && modifiers.getValue("movementSpeedMultiplier") === 1.4);
  modifiers.update(5000);
  modifiers.add(POWER_UP_CONFIG.berserk);
  t("lo stesso power-up non si somma: ne riparte la durata", modifiers.getValue("damageMultiplier") === 1.5 && modifiers.activePowerUps.find((p) => p.definition.id === "berserk").remainingMs === POWER_UP_CONFIG.berserk.durationMs);
  modifiers.update(POWER_UP_CONFIG.speed.durationMs - 5000);
  t("alla scadenza della velocità il suo effetto sparisce e la furia resta intatta", modifiers.getValue("movementSpeedMultiplier") === 1 && modifiers.getValue("damageMultiplier") === 1.5 && !modifiers.has("speed"));
  modifiers.add({ ...POWER_UP_CONFIG.shield, id: "shield", type: "permanent" });
  modifiers.update(1e9);
  t("un power-up permanente non scade (punto di estensione)", modifiers.has("shield") && !modifiers.has("berserk"));
  modifiers.clear();
  t("clear toglie tutto", modifiers.activePowerUps.length === 0);

  // ---------- effetti sul giocatore ----------
  const combat = new CombatSystem();
  const damageWith = (powerUpIds) => {
    const player = groundedPlayer(100);
    powerUpIds.forEach((id) => player.applyPowerUp(POWER_UP_CONFIG[id]));
    const dummy = new Enemy(ENEMY_CONFIG.soldier, 116, 176);
    player.update(frame, input([], ["attack"]), collision, ground, 2000);
    let dealt = 0;
    for (let i = 0; i < 30 && dealt === 0; i++) {
      player.update(frame, input(), collision, ground, 2000);
      dealt = combat.processPlayerAttack(player, [dummy]).reduce((sum, hit) => sum + hit.damage, 0);
    }
    return dealt;
  };
  t("furia: l'attacco leggero passa da 15 a 23 (x1,5)", damageWith([]) === 15 && damageWith(["berserk"]) === 23, `${damageWith([])} / ${damageWith(["berserk"])}`);
  t("fuoco: +8 danni (23); furia e fuoco insieme: (15 + 8) x 1,5 = 35", damageWith(["fire"]) === 23 && damageWith(["fire", "berserk"]) === 35);
  const shielded = groundedPlayer();
  shielded.applyPowerUp(POWER_UP_CONFIG.shield);
  shielded.takeDamage(20, 0);
  const tiny = groundedPlayer();
  tiny.applyPowerUp(POWER_UP_CONFIG.shield);
  tiny.takeDamage(1, 0);
  t("scudo: danni dimezzati (20 -> 10), ma almeno 1", shielded.currentHealth === 90 && tiny.currentHealth === 99);
  const runner = groundedPlayer();
  runner.applyPowerUp(POWER_UP_CONFIG.speed);
  const startX = runner.positionX;
  for (let i = 0; i < 60; i++) runner.update(frame, input(["moveRight"]), collision, ground, 2000);
  t("velocità: in 1 s si percorrono 112 px invece di 80", Math.abs(runner.positionX - startX - PLAYER_CONFIG.movementSpeed * 1.4) < 1, (runner.positionX - startX).toFixed(1));
  const healer = groundedPlayer();
  healer.takeDamage(70, 0);
  healer.applyPowerUp(POWER_UP_CONFIG.regeneration);
  for (let i = 0; i < 60 * 12; i++) healer.update(frame, input(), collision, ground, 2000);
  t("rigenerazione: +4 HP al secondo per 10 s (30 -> 70), poi si ferma", healer.currentHealth === 70, String(healer.currentHealth));
  healer.applyPowerUp(POWER_UP_CONFIG.berserk);
  healer.revive();
  t("alla morte (revive) i power-up si perdono", healer.modifiers.activePowerUps.length === 0);

  // ---------- raccolta ----------
  const items = new ItemManager();
  const score = new ScoreManager();
  const collector = groundedPlayer(100);
  items.loadItems([{ type: "powerFire", position: { x: 102, y: 190 } }]);
  items.collectItems(collector, score);
  t("raccogliere la Fiamma Eterna attiva il power-up del fuoco (e dà 25 punti)", collector.modifiers.has("fire") && score.currentScore === 25);
  t("ogni oggetto power-up punta a un power-up esistente", Object.values(ITEM_CONFIG).filter((item) => item.powerUpId !== undefined).length === 5 && Object.values(ITEM_CONFIG).every((item) => item.powerUpId === undefined || POWER_UP_CONFIG[item.powerUpId] !== undefined));
  t("i power-up hanno durata positiva, effetti e colore", Object.values(POWER_UP_CONFIG).every((p) => p.durationMs > 0 && p.effects.length > 0 && /^#[0-9a-f]{6}$/i.test(p.auraColor)));

  // ---------- difficoltà ----------
  t("le difficoltà sono in ordine facile, normale, difficile con vite 5 / 3 / 2", DIFFICULTY_ORDER.join(",") === "easy,normal,hard" && DIFFICULTY_ORDER.map((id) => DIFFICULTY_CONFIG[id].startingLives).join(",") === "5,3,2");
  const hardSkeleton = new Enemy(ENEMY_CONFIG.skeleton, 0, 176, "hard");
  const easySkeleton = new Enemy(ENEMY_CONFIG.skeleton, 0, 176, "easy");
  t("difficile: nemici con salute x1,5; facile: x0,75", hardSkeleton.maxHealth === 60 && easySkeleton.maxHealth === 30);
  const hardBoss = new Boss(BOSS_CONFIG, 1000, 160, () => 0.9, "hard");
  t("la difficoltà vale anche per il boss (salute x1,5)", hardBoss.maxHealth === Math.round(BOSS_CONFIG.maxHealth * 1.5));
  const victim = groundedPlayer(970);
  let bossDamage = 0;
  for (let i = 0; i < 240 && bossDamage === 0; i++) {
    victim.update(frame, input(), collision, ground, 2000);
    hardBoss.update(frame, victim, collision, ground, 2000);
    if (combat.processBossAttack(hardBoss, victim)) bossDamage = 100 - victim.currentHealth;
  }
  t("difficile: il fendente del boss fa 25 invece di 20 (x1,25)", bossDamage === 25, String(bossDamage));
  const lives = new LivesManager();
  lives.reset(5);
  t("le vite iniziali seguono la difficoltà", lives.remainingLives === 5);

  // ---------- progressi salvati ----------
  const memory = () => { const data = new Map(); return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
  const store = memory();
  const fresh = new ProgressManager(store);
  t("senza dati: solo il livello 1 è sbloccato, difficoltà normale", fresh.unlockedLevelId === 1 && fresh.difficulty === "normal" && fresh.isLevelUnlocked(1) && !fresh.isLevelUnlocked(2));
  fresh.unlockLevel(4);
  fresh.unlockLevel(2);
  fresh.setDifficulty("hard");
  const reloaded = new ProgressManager(store);
  t("livello raggiunto e difficoltà restano dopo il ricaricamento; i progressi non tornano indietro", reloaded.unlockedLevelId === 4 && reloaded.difficulty === "hard" && reloaded.isLevelUnlocked(3));
  const corrupt = memory();
  corrupt.setItem("ironAndShadow.progress", "{non è json");
  const invalid = memory();
  invalid.setItem("ironAndShadow.progress", JSON.stringify({ unlockedLevelId: -3, difficulty: "impossibile" }));
  t("dati corrotti o non validi: si riparte dal livello 1, normale", new ProgressManager(corrupt).unlockedLevelId === 1 && new ProgressManager(invalid).unlockedLevelId === 1 && new ProgressManager(invalid).difficulty === "normal");
  const broken = { getItem() { throw new Error("bloccato"); }, setItem() { throw new Error("bloccato"); } };
  const offline = new ProgressManager(broken);
  offline.unlockLevel(3);
  t("archivio bloccato: il gioco funziona, i progressi restano in memoria", offline.unlockedLevelId === 3 && new ProgressManager(null).unlockedLevelId === 1);

  // ---------- selezione dei livelli ----------
  const state = new GameState();
  t("titolo -> selezione -> titolo, selezione -> gioco; dalla selezione non si va al Game Over", state.change("levelSelect") && state.change("title") && state.change("levelSelect") && !state.change("gameOver") && state.change("playing"));
  const screens = new ScreenManager({ drawSprite() {}, getSpriteSize: () => ({ width: 8, height: 8 }) });
  const levels = [1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `L${id}`, theme: "forest", isUnlocked: id <= 3, bossName: null }));
  const data = { score: 0, bestScore: 0, collectibles: 0, isNewRecord: false, difficultyName: "NORMALE", levels };
  const press = (action) => screens.update("levelSelect", { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
  press("menuDown");
  press("menuDown");
  const afterTwo = screens.selectedLevelId;
  press("menuDown");
  t("il cursore scorre solo sui livelli sbloccati e ricomincia dal primo", afterTwo === 3 && screens.selectedLevelId === 1);
  press("menuUp");
  t("Invio sceglie il livello evidenziato; Esc torna al titolo", press("confirm") === "startSelectedLevel" && screens.selectedLevelId === 3 && press("pause") === "backToTitle");
  t("il menu del titolo mostra la difficoltà scelta", (() => {
    screens.update("title", { wasPressed: () => false, isHeld: () => false, wasReleased: () => false }, { ...data, difficultyName: "DIFFICILE" });
    // lettura diretta della voce (in JavaScript i campi privati sono accessibili: solo per il test)
    const difficultyItem = screens.menus.title.items.find((item) => item.command === "cycleDifficulty");
    return typeof difficultyItem.label === "function" && difficultyItem.label() === "DIFFICOLTÀ: DIFFICILE";
  })());
}
