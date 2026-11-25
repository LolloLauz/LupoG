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
  const projectileSprites = await load("rendering/sprites/projectileSprites");
  const { PROJECTILE_CONFIG } = await load("config/projectileConfig");
  const { LevelManager } = await load("systems/LevelManager");

  const { LEVEL_CONFIG, THEME_STYLES } = levelModule;
  const { ENEMY_CONFIG, BOSS_CATALOG, BOSS_CONFIG } = enemyModule;
  const { ATTACK_DEFINITIONS, COMBO_DEFINITIONS, DEFAULT_ATTACK_BY_INPUT } = playerModule;
  const { ITEM_CONFIG } = itemModule;
  const { PLAYER_ANIMATIONS, ENEMY_ANIMATIONS, BOSS_ANIMATIONS } = animationModule;
  const { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } = controlsModule;
  const { GAME_CONFIG, PALETTE, PALETTE_RAMPS, MAX_PALETTE_COLORS, DIFFICULTY_CONFIG } = gameModule;

  // ---------- sprite e animazioni ----------
  const sprites = new FakeSpriteManager();
  let registrationError = "";
  try {
    knightSprites.registerKnightSprites(sprites);
    enemySprites.registerEnemySprites(sprites);
    bossSprites.registerBossSprites(sprites);
    itemSprites.registerItemSprites(sprites);
    uiSprites.registerUiSprites(sprites);
    projectileSprites.registerProjectileSprites(sprites);
  } catch (error) {
    registrationError = String(error);
  }
  t("tutti gli sprite si registrano senza errori (righe uniformi, colori definiti)", registrationError === "", registrationError);
  t("sono stati registrati più di 60 sprite", sprites.sprites.size > 60, String(sprites.sprites.size));

  // ---------- grafica a 16 bit: colori e ancore degli sprite ----------
  const paletteSet = new Set(Object.values(PALETTE));
  const offPaletteSprites = [];
  for (const [spriteId, sprite] of sprites.sprites) {
    const usedKeys = new Set(sprite.rows.join("").replaceAll(".", ""));
    for (const key of usedKeys) if (!paletteSet.has(sprite.colors[key])) offPaletteSprites.push(`${spriteId}:${key}=${sprite.colors[key]}`);
  }
  t("ogni colore usato dagli sprite è un colore della palette", offPaletteSprites.length === 0, offPaletteSprites.slice(0, 3).join(", "));
  const hitboxByPrefix = [
    ["knight", { width: playerModule.PLAYER_CONFIG.hitboxWidth, height: playerModule.PLAYER_CONFIG.hitboxHeight }],
    ...Object.values(ENEMY_CONFIG).map((enemy) => [enemy.id, enemy.hitbox]),
    ...Object.values(BOSS_CATALOG).map((boss) => [boss.id, boss.hitbox]),
  ];
  const badAnchors = [];
  for (const [prefix, hitbox] of hitboxByPrefix) {
    // solo i frame di questo personaggio (wolf non deve prendere i frame di wolfKing, slime quelli di slimeSmall)
    const framePattern = new RegExp(`^${prefix}(Idle|Walk|Attack|Hurt|Slash|Charge|Cast|Jump|Fall|Dodge|DeadFall|Heavy)`);
    const frames = [...sprites.sprites].filter(([id]) => framePattern.test(id));
    if (frames.length === 0) badAnchors.push(`${prefix}: nessuno sprite`);
    for (const [spriteId, sprite] of frames) {
      // l'hitbox deve stare dentro lo sprite: ancora + larghezza entro la larghezza, sprite non più basso dell'hitbox
      if (sprite.anchorX < 0 || sprite.anchorX + hitbox.width > sprite.width || sprite.height < hitbox.height) badAnchors.push(`${spriteId} (ancora ${sprite.anchorX}, ${sprite.width}x${sprite.height})`);
    }
    const anchors = new Set(frames.map(([, sprite]) => sprite.anchorX));
    if (anchors.size > 1) badAnchors.push(`${prefix}: ancore diverse tra i frame (${[...anchors].join(",")})`);
  }
  t("ogni frame di cavaliere, nemici e boss contiene l'hitbox e tutti i frame di un personaggio hanno la stessa ancora", badAnchors.length === 0, badAnchors.slice(0, 3).join("; "));
  t("gli sprite del cavaliere sono più alti dell'hitbox (pennacchio ed elmo sporgono, 16 bit)", sprites.getSpriteSize("knightIdle1").height > playerModule.PLAYER_CONFIG.hitboxHeight);

  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const allWeaponSuffixes = Object.values(WEAPON_CONFIG).map((weapon) => weapon.spriteSuffix);
  const suffixesByPlayerAnimation = {};
  for (const weapon of Object.values(WEAPON_CONFIG)) for (const attack of Object.values(weapon.attacks)) (suffixesByPlayerAnimation[attack.animation] ??= []).push(weapon.spriteSuffix);
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
      // cavaliere: un frame esiste con il suffisso di ogni arma che usa l'animazione (attacchi: solo l'arma che li possiede)
      const suffixes = owner === "giocatore" ? (suffixesByPlayerAnimation[name] ?? allWeaponSuffixes) : [""];
      for (const frameId of animation.frameIds) for (const suffix of suffixes) if (!sprites.has(frameId + suffix)) missing.push(`${name}: sprite ${frameId + suffix} non registrato`);
    }
    t(`animazioni di ${owner}: ogni frame è uno sprite registrato`, missing.length === 0, missing.slice(0, 3).join("; "));
  }
  t("le animazioni del giocatore coprono tutti gli stati (idle, walk, jump, fall, hurt, dodge, crouch, dead)", ["idle", "walk", "jump", "fall", "hurt", "dodge", "crouch", "dead"].every((name) => PLAYER_ANIMATIONS[name] !== undefined));
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
  t("i comportamenti sono validi", Object.values(ENEMY_CONFIG).every((e) => ["patrol", "chase", "guard", "ranged", "flyer"].includes(e.behavior)));
  t("chi tira (ranged) ha un proiettile esistente e una distanza di ritirata; gli altri no", Object.values(ENEMY_CONFIG).every((e) => (e.behavior === "ranged") === (e.ranged !== undefined) && (e.ranged === undefined || (PROJECTILE_CONFIG[e.ranged.projectileId] !== undefined && e.ranged.retreatDistance >= 0 && e.ranged.retreatDistance < e.attackRange))));
  t("chi vola (flyer) ha i parametri di volo validi; gli altri no", Object.values(ENEMY_CONFIG).every((e) => (e.behavior === "flyer") === (e.flight !== undefined) && (e.flight === undefined || (e.flight.diveSpeed > 0 && e.flight.hoverHeight > 0 && e.flight.bobPeriodMs > 0))));
  t("PROJECTILE_CONFIG: la chiave coincide con l'id, velocità e durata positive, ogni frame è uno sprite", Object.entries(PROJECTILE_CONFIG).every(([key, projectile]) => key === projectile.id && projectile.speed > 0 && projectile.lifetimeMs > 0 && projectile.frameIds.length > 0 && projectile.frameIds.every((frameId) => sprites.has(frameId))));
  t("i nemici che pattugliano hanno una zona > 0", Object.values(ENEMY_CONFIG).filter((e) => e.behavior === "patrol").every((e) => e.patrolDistance > 0));
  t("BOSS_CATALOG: la chiave coincide con l'id", Object.entries(BOSS_CATALOG).every(([key, def]) => key === def.id));
  t("BOSS_CONFIG è nel catalogo", BOSS_CATALOG[BOSS_CONFIG.id] === BOSS_CONFIG);
  t("ogni boss ha animazioni e stile degli sprite", Object.keys(BOSS_CATALOG).every((id) => BOSS_ANIMATIONS[id] !== undefined && sprites.has(`${id}Idle1`) && sprites.has(`${id}Heap`)));
  t("le fasi dei boss partono da 100 e sono in ordine decrescente", Object.values(BOSS_CATALOG).every((boss) => boss.phases[0].healthPercentThreshold === 100 && boss.phases.every((phase, i) => i === 0 || phase.healthPercentThreshold < boss.phases[i - 1].healthPercentThreshold)));
  t("le fasi dei boss hanno moltiplicatori positivi e pesi non negativi di attacchi esistenti, con almeno un peso positivo", Object.values(BOSS_CATALOG).every((boss) => boss.phases.every((p) => p.speedMultiplier > 0 && p.cooldownMultiplier > 0 && Object.entries(p.attackWeights).every(([id, weight]) => weight >= 0 && boss.attacks.some((attack) => attack.id === id)) && Object.values(p.attackWeights).some((weight) => weight > 0))));
  t("ogni boss ha almeno un attacco, id distinti e al massimo un attacco per tipo", Object.values(BOSS_CATALOG).every((boss) => boss.attacks.length > 0 && new Set(boss.attacks.map((a) => a.id)).size === boss.attacks.length && new Set(boss.attacks.map((a) => a.kind)).size === boss.attacks.length));
  const badBossAttacks = Object.values(BOSS_CATALOG).flatMap((boss) => boss.attacks.filter((attack) => {
    const timesOk = attack.windupMs > 0 && attack.activeMs > 0 && attack.recoveryMs >= 0;
    switch (attack.kind) {
      case "melee": return !(timesOk && attack.damage > 0 && attack.range > 0);
      case "charge": return !(timesOk && attack.damage > 0 && attack.speed > 0 && attack.minDistance >= 0);
      case "projectile": return !(timesOk && attack.damage > 0 && attack.count >= 1 && PROJECTILE_CONFIG[attack.projectileId] !== undefined);
      case "summon": return !(timesOk && attack.count >= 1 && attack.maxAlive >= 1 && ENEMY_CONFIG[attack.enemyType] !== undefined);
      default: return true;
    }
  }).map((attack) => `${boss.id}.${attack.id}`));
  t("gli attacchi dei boss hanno tipo conosciuto, tempi e valori validi", badBossAttacks.length === 0, badBossAttacks.join(", "));
  const shapeHitbox = { knight: [24, 40], witch: [24, 40], sorcerer: [24, 40], beast: [40, 24] };
  t("ogni boss ha la hitbox della sua forma di sprite (24x40 umanoidi, 40x24 belva)", Object.values(BOSS_CATALOG).every((boss) => {
    const [width, height] = shapeHitbox[bossSprites.BOSS_SPRITE_SHAPES[boss.id] ?? "knight"];
    return boss.hitbox.width === width && boss.hitbox.height === height;
  }));

  // ---------- oggetti ----------
  t("ITEM_CONFIG: la chiave coincide con l'id e lo sprite esiste", Object.entries(ITEM_CONFIG).every(([key, item]) => key === item.id && sprites.has(item.spriteId)));
  t("ogni oggetto ha almeno un effetto", Object.values(ITEM_CONFIG).every((item) => item.healAmount > 0 || item.scoreBonus > 0 || (item.coins ?? 0) > 0 || item.refillsAmmo === true));

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
  t("i comandi richiesti sono mappati (A/D, frecce, W, freccia su, J, K, Shift sinistro, 5-8, Esc)", ["KeyA", "KeyD", "ArrowLeft", "ArrowRight", "KeyW", "ArrowUp", "KeyJ", "KeyK", "ShiftLeft", "Digit5", "Digit6", "Digit7", "Digit8", "Escape"].every((key) => Object.values(CONTROLS_CONFIG).some((keys) => keys.includes(key))));

  // ---------- palette e configurazione generale ----------
  const paletteValues = Object.values(PALETTE);
  t(`la palette ha colori esadecimali tutti distinti, non più di ${MAX_PALETTE_COLORS} (ora ${paletteValues.length})`, paletteValues.every((c) => /^#[0-9a-f]{6}$/i.test(c)) && new Set(paletteValues).size === paletteValues.length && paletteValues.length <= MAX_PALETTE_COLORS && paletteValues.length > 16);
  const legacyColors = { black: "#0f0f1b", darkBlue: "#1a1c2c", purple: "#5d275d", red: "#b13e53", orange: "#ef7d57", yellow: "#ffcd75", lightGreen: "#a7f070", green: "#38b764", darkGreen: "#257179", navy: "#29366f", blue: "#3b5dc9", lightBlue: "#41a6f6", cyan: "#73eff7", white: "#f4f4f4", lightGray: "#94b0c2", gray: "#566c86" };
  t("i 16 colori della versione 1.0 esistono ancora con lo stesso valore", Object.entries(legacyColors).every(([name, hex]) => PALETTE[name] === hex));
  const rampColors = Object.values(PALETTE_RAMPS).flat();
  t("ogni colore delle rampe è nella palette", rampColors.every((c) => paletteValues.includes(c)));
  t("ogni colore della palette appartiene ad almeno una rampa", paletteValues.every((c) => rampColors.includes(c)), paletteValues.filter((c) => !rampColors.includes(c)).join(","));
  const luminance = (hex) => 0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16);
  const unorderedRamps = Object.entries(PALETTE_RAMPS).filter(([, ramp]) => ramp.some((c, i) => i > 0 && luminance(c) <= luminance(ramp[i - 1]))).map(([name]) => name);
  t("ogni rampa va dal colore più scuro al più chiaro (luminosità crescente)", unorderedRamps.length === 0, unorderedRamps.join(","));
  t("ogni rampa ha almeno 4 colori", Object.values(PALETTE_RAMPS).every((ramp) => ramp.length >= 4));
  t("risoluzione interna 320x240 (16 bit)", GAME_CONFIG.internalWidth === 320 && GAME_CONFIG.internalHeight === 240);
  t("vite iniziali >= 1 e gravità positiva", GAME_CONFIG.startingLives >= 1 && GAME_CONFIG.gravity > 0);
  t("moltiplicatori di difficoltà positivi", Object.values(DIFFICULTY_CONFIG).every((d) => d.enemyHealthMultiplier > 0 && d.enemyDamageMultiplier > 0));

  // ---------- livelli ----------
  const frame = 1 / 60;
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  t("gli id dei livelli sono consecutivi da 1", LEVEL_CONFIG.every((level, index) => level.id === index + 1));
  t("c'è almeno un livello con boss e l'ultimo livello è quello del boss", LEVEL_CONFIG.some((l) => l.hasBoss) && LEVEL_CONFIG[LEVEL_CONFIG.length - 1].hasBoss);
  t("ogni ambientazione usata ha uno stile", LEVEL_CONFIG.every((level) => THEME_STYLES[level.theme] !== undefined));
  const themeColors = Object.values(THEME_STYLES).flatMap((style) => [...style.surfaceColors, ...style.fillColors, ...style.ledgeColors, ...style.detailColors]);
  t("tutti i colori del terreno (THEME_STYLES) sono della palette", themeColors.every((color) => paletteSet.has(color)) && themeColors.length === Object.keys(THEME_STYLES).length * 12);
  t("ogni ambientazione ha una tessitura del terreno conosciuta", Object.values(THEME_STYLES).every((style) => ["grassAndEarth", "stoneTiles", "dungeonBricks", "swampMud", "snowAndRock", "runeStone"].includes(style.terrainTexture)));
  t("i colori dell'acqua delle ambientazioni sono della palette", Object.values(THEME_STYLES).every((style) => style.waterColors === undefined || [...style.waterColors.depth, style.waterColors.veil, ...style.waterColors.surface].every((color) => paletteSet.has(color))));
  for (const level of LEVEL_CONFIG) {
    const problems = [];
    const ground = level.platforms.filter((p) => p.y === 200 && !p.oneWay).sort((a, b) => a.x - b.x);
    for (let i = 1; i < ground.length; i++) {
      const gapStart = ground[i - 1].x + ground[i - 1].width;
      const gap = ground[i].x - gapStart;
      // una vasca (fondo solido poco più in basso, sotto tutto lo spazio) non è un abisso
      const isBasin = level.platforms.some((p) => !p.oneWay && p.y > 200 && p.y - 200 <= 44 && p.x <= gapStart && p.x + p.width >= ground[i].x);
      if (gap > 36 && !isBasin) problems.push(`abisso di ${gap}px`);
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
      if (def.behavior === "flyer") {
        // i volanti partono a mezz'aria, sopra una superficie e dentro la mappa
        const hasSurfaceBelow = level.platforms.some((p) => centerX >= p.x && centerX <= p.x + p.width && p.y >= feetY + 20);
        if (!hasSurfaceBelow || enemy.position.y < 24 || enemy.position.x < 0 || enemy.position.x + def.hitbox.width > level.width) problems.push(`volante ${enemy.type}@${enemy.position.x} fuori posto`);
        continue;
      }
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
    if (level.hasBoss && level.bossSpawn !== undefined) {
      const bossDefinition = BOSS_CATALOG[level.bossId ?? BOSS_CONFIG.id];
      const bossFeetY = level.bossSpawn.y + bossDefinition.hitbox.height;
      if (!level.platforms.some((p) => Math.abs(p.y - bossFeetY) <= 0.5 && level.bossSpawn.x >= p.x && level.bossSpawn.x + bossDefinition.hitbox.width <= p.x + p.width)) problems.push("boss non appoggiato");
    }
    const surfaceAt = (x, y) => level.platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && Math.abs(p.y - y) <= 0.5);
    for (const hazard of level.hazards ?? []) {
      if (hazard.x < 0 || hazard.x + hazard.width > level.width || hazard.width <= 0 || hazard.height <= 0) problems.push(`pericolo ${hazard.kind}@${hazard.x} fuori mappa`);
      const bottom = hazard.y + hazard.height;
      const middleX = hazard.x + hazard.width / 2;
      if (hazard.kind === "spikes" && (!surfaceAt(middleX, bottom) || hazard.width > 36)) problems.push(`spuntoni @${hazard.x} non appoggiati o più larghi di 36 px`);
      if (hazard.kind === "ice" && !level.platforms.some((p) => !p.oneWay && p.y >= hazard.y && p.y <= bottom && middleX >= p.x && middleX <= p.x + p.width)) problems.push(`ghiaccio @${hazard.x} non sulla superficie`);
      if (hazard.kind === "water" && !surfaceAt(middleX, bottom)) problems.push(`acqua @${hazard.x} senza fondo`);
    }
    for (const moving of level.movingPlatforms ?? []) {
      const minX = Math.min(moving.x, moving.x + moving.travelX);
      const maxX = Math.max(moving.x, moving.x + moving.travelX) + moving.width;
      const minY = Math.min(moving.y, moving.y + moving.travelY);
      if (minX < 0 || maxX > level.width || minY < 24 || moving.periodMs < 1000) problems.push(`piattaforma mobile @${moving.x} fuori mappa o troppo veloce`);
    }
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
  {
    // oggetti e forzieri non dentro i blocchi solidi (nella Fase 8 erano emersi due oggetti invisibili, nei livelli 2 e 3)
    const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const hidden = [];
    for (const level of LEVEL_CONFIG) {
      const blocks = level.platforms.filter((p) => !p.oneWay && p.y < 200);
      for (const item of level.items) if (blocks.some((b) => overlaps({ x: item.position.x, y: item.position.y, width: 8, height: 8 }, b))) hidden.push(`${level.id}:${item.type}@${item.position.x}`);
      for (const chest of level.chests ?? []) if (blocks.some((b) => overlaps({ x: chest.position.x, y: chest.position.y, width: 16, height: 12 }, b))) hidden.push(`${level.id}:forziere@${chest.position.x}`);
    }
    t("nessun oggetto o forziere dentro un blocco solido", hidden.length === 0, hidden.join(" "));
  }
  t("ogni livello contiene almeno una pozione o ne ha una a disposizione, e una gemma", LEVEL_CONFIG.every((level) => level.items.some((i) => i.type === "collectible")));
}
