// Coerenza delle configurazioni: ogni riferimento punta a qualcosa che esiste, tutti i livelli sono validi e percorribili
import { FakeSpriteManager } from "../helpers.mjs";

export const description = "Coerenza delle configurazioni, degli sprite, delle animazioni e di tutti i livelli";

export default async function (t, load) {
  const levelModule = await load("config/levelConfig");
  const enemyModule = await load("config/enemyConfig");
  const playerModule = await load("config/playerConfig");
  const itemModule = await load("config/itemConfig");
  const animationModule = await load("config/animationConfig");
  const controlsModule = await load("config/controlsConfig");
  const gameModule = await load("config/gameConfig");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const knightSprites = await load("rendering/sprites/knightSprites");
  const enemySprites = await load("rendering/sprites/enemySprites");
  const bossSprites = await load("rendering/sprites/bossSprites");
  const itemSprites = await load("rendering/sprites/itemSprites");
  const uiSprites = await load("rendering/sprites/uiSprites");
  const { LevelManager } = await load("systems/LevelManager");

  const { LEVEL_CONFIG, THEME_STYLES } = levelModule;
  const { ENEMY_CONFIG, BOSS_CATALOG, BOSS_CONFIG } = enemyModule;
  const { ATTACK_DEFINITIONS, COMBO_DEFINITIONS, DEFAULT_ATTACK_BY_INPUT } = playerModule;
  const { ITEM_CONFIG } = itemModule;
  const { PLAYER_ANIMATIONS, ENEMY_ANIMATIONS, BOSS_ANIMATIONS } = animationModule;
  const { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } = controlsModule;
  const { GAME_CONFIG, PALETTE, DIFFICULTY_CONFIG } = gameModule;

  // ---------- sprite e animazioni ----------
  const sprites = new FakeSpriteManager();
  let registrationError = "";
  try {
    knightSprites.registerKnightSprites(sprites);
    enemySprites.registerEnemySprites(sprites);
    bossSprites.registerBossSprites(sprites);
    itemSprites.registerItemSprites(sprites);
    uiSprites.registerUiSprites(sprites);
  } catch (error) {
    registrationError = String(error);
  }
  t("tutti gli sprite si registrano senza errori (righe uniformi, colori definiti)", registrationError === "", registrationError);
  t("sono stati registrati più di 60 sprite", sprites.sprites.size > 60, String(sprites.sprites.size));

  const allAnimationSets = [
    ["giocatore", PLAYER_ANIMATIONS],
    ...Object.entries(ENEMY_ANIMATIONS).map(([id, set]) => [`nemico ${id}`, set]),
    ...Object.entries(BOSS_ANIMATIONS).map(([id, set]) => [`boss ${id}`, set]),
  ];
  for (const [owner, set] of allAnimationSets) {
    const missing = [];
    for (const [name, animation] of Object.entries(set)) {
      if (animation.frameIds.length === 0) missing.push(`${name}: nessun frame`);
      if (animation.frameDurationsMs !== undefined && animation.frameDurationsMs.length !== animation.frameIds.length) missing.push(`${name}: durate diverse dai frame`);
      for (const frameId of animation.frameIds) if (!sprites.has(frameId)) missing.push(`${name}: sprite ${frameId} non registrato`);
    }
    t(`animazioni di ${owner}: ogni frame è uno sprite registrato`, missing.length === 0, missing.slice(0, 3).join("; "));
  }
  t("le animazioni del giocatore coprono tutti gli stati (idle, walk, jump, fall, hurt, dodge, dead)", ["idle", "walk", "jump", "fall", "hurt", "dodge", "dead"].every((name) => PLAYER_ANIMATIONS[name] !== undefined));
  t("ogni attacco ha la sua animazione", Object.values(ATTACK_DEFINITIONS).every((attack) => PLAYER_ANIMATIONS[attack.animation] !== undefined));
  t("la durata dei frame di ogni attacco coincide con la durata dell'attacco", Object.values(ATTACK_DEFINITIONS).every((attack) => {
    const animation = PLAYER_ANIMATIONS[attack.animation];
    return Math.abs(animation.frameDurationMs * animation.frameIds.length - attack.durationMs) < 0.01;
  }));

  // ---------- attacchi e combo ----------
  t("ogni attacco ha finestra attiva dentro la durata e valori positivi", Object.values(ATTACK_DEFINITIONS).every((a) => a.damage > 0 && a.durationMs > 0 && a.hitStartMs >= 0 && a.hitStartMs < a.hitEndMs && a.hitEndMs <= a.durationMs && a.cooldownMs >= 0));
  t("le combo usano attacchi esistenti, con lunghezze coerenti", COMBO_DEFINITIONS.every((combo) => combo.inputSequence.length === combo.attackIds.length && combo.attackIds.every((id) => ATTACK_DEFINITIONS[id] !== undefined) && combo.comboWindowMs > 0));
  t("gli attacchi predefiniti esistono", Object.values(DEFAULT_ATTACK_BY_INPUT).every((id) => ATTACK_DEFINITIONS[id] !== undefined));
  t("gli id delle combo sono unici", new Set(COMBO_DEFINITIONS.map((c) => c.id)).size === COMBO_DEFINITIONS.length);

  // ---------- nemici e boss ----------
  t("ENEMY_CONFIG: la chiave coincide con l'id", Object.entries(ENEMY_CONFIG).every(([key, def]) => key === def.id));
  t("ogni nemico ha tutte le animazioni (idle, walk, attack, hurt, dead)", Object.keys(ENEMY_CONFIG).every((id) => ["idle", "walk", "attack", "hurt", "dead"].every((n) => ENEMY_ANIMATIONS[id]?.[n] !== undefined)));
  t("valori dei nemici positivi e coerenti (portata <= vista)", Object.values(ENEMY_CONFIG).every((e) => e.maxHealth > 0 && e.attackDamage > 0 && e.movementSpeed > 0 && e.attackRange > 0 && e.detectionRange >= e.attackRange && e.attackWindupMs > 0 && e.attackActiveMs > 0 && e.attackRecoveryMs >= 0 && e.scoreReward > 0 && e.attackInterruptWindowMs >= 0));
  t("i comportamenti sono validi", Object.values(ENEMY_CONFIG).every((e) => ["patrol", "chase", "guard"].includes(e.behavior)));
  t("i nemici che pattugliano hanno una zona > 0", Object.values(ENEMY_CONFIG).filter((e) => e.behavior === "patrol").every((e) => e.patrolDistance > 0));
  t("BOSS_CATALOG: la chiave coincide con l'id", Object.entries(BOSS_CATALOG).every(([key, def]) => key === def.id));
  t("BOSS_CONFIG è nel catalogo", BOSS_CATALOG[BOSS_CONFIG.id] === BOSS_CONFIG);
  t("ogni boss ha animazioni e stile degli sprite", Object.keys(BOSS_CATALOG).every((id) => BOSS_ANIMATIONS[id] !== undefined && sprites.has(`${id}Idle1`) && sprites.has(`${id}Heap`)));
  t("le fasi dei boss partono da 100 e sono in ordine decrescente", Object.values(BOSS_CATALOG).every((boss) => boss.phases[0].healthPercentThreshold === 100 && boss.phases.every((phase, i) => i === 0 || phase.healthPercentThreshold < boss.phases[i - 1].healthPercentThreshold)));
  t("le probabilità di carica sono tra 0 e 1", Object.values(BOSS_CATALOG).every((boss) => boss.phases.every((p) => p.chargeChance >= 0 && p.chargeChance <= 1 && p.speedMultiplier > 0 && p.cooldownMultiplier > 0)));
  t("i boss hanno hitbox 24x40 (forma dello sprite)", Object.values(BOSS_CATALOG).every((boss) => boss.hitbox.width === 24 && boss.hitbox.height === 40));

  // ---------- oggetti ----------
  t("ITEM_CONFIG: la chiave coincide con l'id e lo sprite esiste", Object.entries(ITEM_CONFIG).every(([key, item]) => key === item.id && sprites.has(item.spriteId)));
  t("ogni oggetto ha almeno un effetto", Object.values(ITEM_CONFIG).every((item) => item.healAmount > 0 || item.scoreBonus > 0 || item.isCollectible));

  // ---------- controlli ----------
  t("ogni azione ha almeno un tasto", Object.values(CONTROLS_CONFIG).every((keys) => keys.length > 0));
  t("i contesti d'input usano solo azioni esistenti", Object.values(INPUT_CONTEXT_ACTIONS).every((actions) => actions.every((a) => CONTROLS_CONFIG[a] !== undefined)));
  for (const [context, actions] of Object.entries(INPUT_CONTEXT_ACTIONS)) {
    const keyOwners = new Map();
    let conflicts = "";
    for (const action of actions) for (const key of CONTROLS_CONFIG[action]) {
      if (keyOwners.has(key) && keyOwners.get(key) !== action) conflicts += `${key}: ${keyOwners.get(key)}/${action} `;
      keyOwners.set(key, action);
    }
    t(`nel contesto "${context}" nessun tasto è assegnato a due azioni`, conflicts === "", conflicts);
  }
  t("i comandi richiesti sono mappati (A/D, frecce, W, freccia su, Spazio, J, K, Esc)", ["KeyA", "KeyD", "ArrowLeft", "ArrowRight", "KeyW", "ArrowUp", "Space", "KeyJ", "KeyK", "Escape"].every((key) => Object.values(CONTROLS_CONFIG).some((keys) => keys.includes(key))));

  // ---------- palette e configurazione generale ----------
  t("la palette ha 16 colori esadecimali distinti", Object.keys(PALETTE).length === 16 && Object.values(PALETTE).every((c) => /^#[0-9a-f]{6}$/i.test(c)) && new Set(Object.values(PALETTE)).size === 16);
  t("risoluzione interna 256x240", GAME_CONFIG.internalWidth === 256 && GAME_CONFIG.internalHeight === 240);
  t("vite iniziali >= 1 e gravità positiva", GAME_CONFIG.startingLives >= 1 && GAME_CONFIG.gravity > 0);
  t("moltiplicatori di difficoltà positivi", Object.values(DIFFICULTY_CONFIG).every((d) => d.enemyHealthMultiplier > 0 && d.enemyDamageMultiplier > 0));

  // ---------- livelli ----------
  const frame = 1 / 60;
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  t("gli id dei livelli sono consecutivi da 1", LEVEL_CONFIG.every((level, index) => level.id === index + 1));
  t("c'è almeno un livello con boss e l'ultimo livello è quello del boss", LEVEL_CONFIG.some((l) => l.hasBoss) && LEVEL_CONFIG[LEVEL_CONFIG.length - 1].hasBoss);
  t("ogni ambientazione usata ha uno stile", LEVEL_CONFIG.every((level) => THEME_STYLES[level.theme] !== undefined));
  for (const level of LEVEL_CONFIG) {
    const problems = [];
    const ground = level.platforms.filter((p) => p.y === 200 && !p.oneWay).sort((a, b) => a.x - b.x);
    for (let i = 1; i < ground.length; i++) {
      const gap = ground[i].x - (ground[i - 1].x + ground[i - 1].width);
      if (gap > 36) problems.push(`abisso di ${gap}px`);
    }
    if (ground[ground.length - 1].x + ground[ground.length - 1].width < level.width) problems.push("terreno non arriva al bordo");
    if (level.platforms.some((p) => p.x < 0 || p.x + p.width > level.width)) problems.push("piattaforma fuori mappa");
    const surfaces = level.platforms.map((p) => ({ x: p.x, w: p.width, top: p.y }));
    for (const p of level.platforms.filter((q) => q.y < 200)) {
      if (!surfaces.some((s) => s.top > p.y && s.x < p.x + p.width + 30 && s.x + s.w > p.x - 30 && s.top - p.y <= 44)) problems.push(`piattaforma irraggiungibile ${p.x},${p.y}`);
    }
    for (const enemy of level.enemies) {
      const def = ENEMY_CONFIG[enemy.type];
      if (def === undefined) { problems.push(`tipo nemico sconosciuto ${enemy.type}`); continue; }
      const feetY = enemy.position.y + def.hitbox.height;
      const centerX = enemy.position.x + def.hitbox.width / 2;
      if (!level.platforms.some((p) => centerX >= p.x && centerX <= p.x + p.width && Math.abs(p.y - feetY) <= 0.5)) problems.push(`nemico ${enemy.type}@${enemy.position.x} non appoggiato`);
    }
    for (const item of level.items) {
      if (ITEM_CONFIG[item.type] === undefined) { problems.push(`oggetto sconosciuto ${item.type}`); continue; }
      const centerX = item.position.x + 4, feetY = item.position.y + 8;
      if (!level.platforms.some((p) => centerX >= p.x && centerX <= p.x + p.width && p.y >= feetY - 1 && p.y - feetY <= 2)) problems.push(`oggetto ${item.type}@${item.position.x} non appoggiato`);
    }
    if (!ground.some((g) => level.playerStart.x >= g.x && level.playerStart.x < g.x + g.width) || level.playerStart.y + 24 !== 200) problems.push("partenza non su terreno");
    if (level.completion.kind === "reachExit") {
      if (!ground.some((g) => level.completion.exitX >= g.x && level.completion.exitX + 24 <= g.x + g.width)) problems.push("uscita non su terreno");
    } else if (!(level.hasBoss && level.bossSpawn !== undefined && level.bossArenaStartX !== undefined && level.bossArenaStartX < level.bossSpawn.x)) {
      problems.push("livello con boss senza arena o posizione del boss");
    }
    if (level.hasBoss && level.bossId !== undefined && BOSS_CATALOG[level.bossId] === undefined) problems.push(`bossId ${level.bossId} non nel catalogo`);
    t(`livello ${level.id} (${level.name}): regole geometriche e riferimenti`, problems.length === 0, problems.join("; "));

    // percorribilità: un bot cammina verso destra saltando ostacoli e abissi, senza nemici
    const goal = level.completion.kind === "reachExit" ? level.completion.exitX : level.bossArenaStartX + 40;
    const player = new Player(level.playerStart.x, level.playerStart.y);
    const collision = new CollisionSystem();
    const isGroundAt = (x) => level.platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && p.y >= player.positionY + 20);
    let reached = false;
    for (let i = 0; i < 60 * 120 && !reached; i++) {
      const aheadX = player.positionX + player.width + 10;
      const wall = level.platforms.some((p) => !p.oneWay && aheadX >= p.x && aheadX <= p.x + p.width && p.y < player.positionY + 20 && p.y + p.height > player.positionY + 2);
      const edge = player.isOnGround && !isGroundAt(player.positionX + player.width + 6);
      player.update(frame, input(["moveRight"], player.isOnGround && (wall || edge) ? ["jump"] : []), collision, level.platforms, level.width);
      if (player.positionY > 300) break;
      if (player.positionX + player.width / 2 >= goal) reached = true;
    }
    t(`livello ${level.id}: un bot raggiunge ${level.completion.kind === "reachExit" ? "l'uscita" : "l'arena del boss"} senza cadere`, reached);
  }
  const levelManager = new LevelManager();
  t("LevelManager crea nemici e boss di ogni livello senza errori", LEVEL_CONFIG.every((level) => {
    levelManager.loadLevel(level.id);
    return levelManager.createEnemies().length === level.enemies.length && (levelManager.createBoss() !== null) === level.hasBoss;
  }));
  t("ogni livello contiene almeno una pozione o ne ha una a disposizione, e una gemma", LEVEL_CONFIG.every((level) => level.items.some((i) => i.type === "collectible")));
}
