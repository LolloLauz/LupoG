/**
 * Verifica degli esempi di documentation/CODE_MANUAL.md (solo per sviluppatori).
 *
 * Per ogni "### Esempio N" del manuale:
 *   1. controlla che ogni "Codice originale" compaia UNA SOLA volta nel file indicato;
 *   2. applica le modifiche a una COPIA temporanea del progetto (il tuo codice non cambia);
 *   3. esegue il controllo dei tipi (tsc --noEmit);
 *   4. esegue un controllo del comportamento: deve PASSARE sul codice modificato e
 *      FALLIRE sul codice originale (così sappiamo che misura davvero l'effetto della modifica).
 *
 * Uso:  npm run verify-docs                      (tutti gli esempi)
 *       npm run verify-docs -- 6 9               (solo gli esempi indicati)
 *       npm run verify-docs -- --export 6 cartella  (scrive in "cartella" una copia del progetto
 *                                                  con l'esempio 6 già applicato, per provarlo)
 */
import { buildSync } from "esbuild";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manualPath = join(projectRoot, "documentation", "CODE_MANUAL.md");
const exportIndex = process.argv.indexOf("--export");
const requestedExamples = process.argv.slice(2).filter((_, index, all) => exportIndex === -1 || index < exportIndex - 2).map(Number).filter(Number.isFinite);

// ---------------------------------------------------------------------------
// 1. Lettura del manuale
// ---------------------------------------------------------------------------

function parseExamples(markdown) {
  const examples = [];
  const exampleHeaders = [...markdown.matchAll(/^### Esempio (\d+) – (.+)$/gm)];
  exampleHeaders.forEach((header, index) => {
    const start = header.index + header[0].length;
    const end = index + 1 < exampleHeaders.length ? exampleHeaders[index + 1].index : markdown.length;
    const body = markdown.slice(start, end).split(/^## /m)[0];
    const steps = [...body.matchAll(/^#### Passo (\d+) – `([^`]+)`[^\n]*\n[\s\S]*?Codice originale:\s*```\w*\n([\s\S]*?)```\s*Codice aggiornato:\s*```\w*\n([\s\S]*?)```/gm)].map((step) => ({
      number: Number(step[1]),
      file: step[2],
      original: step[3].replace(/\n$/, ""),
      updated: step[4].replace(/\n$/, ""),
    }));
    examples.push({ number: Number(header[1]), title: header[2], steps });
  });
  return examples;
}

// ---------------------------------------------------------------------------
// 2. Copie del progetto
// ---------------------------------------------------------------------------

function createProjectCopy(label) {
  const directory = mkdtempSync(join(tmpdir(), `iron-doc-${label}-`));
  cpSync(join(projectRoot, "src"), join(directory, "src"), { recursive: true });
  for (const file of ["package.json", "tsconfig.json", "vite.config.ts", "index.html"]) {
    cpSync(join(projectRoot, file), join(directory, file));
  }
  symlinkSync(join(projectRoot, "node_modules"), join(directory, "node_modules"), "dir");
  return directory;
}

function applySteps(directory, steps) {
  for (const step of steps) {
    const filePath = join(directory, step.file);
    const content = readFileSync(filePath, "utf8");
    const occurrences = content.split(step.original).length - 1;
    if (occurrences !== 1) {
      throw new Error(`Passo ${step.number} (${step.file}): il codice originale compare ${occurrences} volte (deve essere 1). Aggiornare il manuale.`);
    }
    writeFileSync(filePath, content.replace(step.original, () => step.updated));
  }
}

function runTypecheck(directory) {
  const typescriptCompiler = join(projectRoot, "node_modules", "typescript", "bin", "tsc");
  const result = spawnSync(process.execPath, [typescriptCompiler, "--noEmit", "-p", join(directory, "tsconfig.json")], { cwd: directory, encoding: "utf8" });
  return { ok: result.status === 0, output: (result.stdout + result.stderr).trim() };
}

// ---------------------------------------------------------------------------
// 3. Strumenti per i controlli di comportamento
// ---------------------------------------------------------------------------

/** Compila un modulo TypeScript della copia indicata e lo importa. */
function createLoader(directory) {
  return async (relativePath) => {
    const outputFile = join(directory, "out", relativePath.replace(/\W/g, "_") + ".mjs");
    buildSync({ entryPoints: [join(directory, "src", relativePath + ".ts")], bundle: true, format: "esm", outfile: outputFile, logLevel: "error" });
    return import(pathToFileURL(outputFile).href + "?v=" + Math.random());
  };
}

/** Finto SpriteManager: controlla le stesse regole di quello vero (righe uguali, colori definiti). */
class FakeSpriteManager {
  sprites = new Map();
  registerSprite(spriteId, pixelRows, colorByKey) {
    const width = pixelRows[0]?.length ?? 0;
    if (width === 0 || pixelRows.some((row) => row.length !== width)) throw new Error(`Sprite "${spriteId}": righe di lunghezza diversa`);
    for (const row of pixelRows) for (const key of row) if (key !== "." && colorByKey[key] === undefined) throw new Error(`Sprite "${spriteId}": colore '${key}' non definito`);
    this.sprites.set(spriteId, { width, height: pixelRows.length, rows: pixelRows });
  }
  has(spriteId) { return this.sprites.has(spriteId); }
  drawSprite() {}
}

const flatGround = [{ x: 0, y: 200, width: 3000, height: 40 }];
const frame = 1 / 60;
const inputOf = (held = [], pressed = [], released = []) => ({
  isHeld: (action) => held.includes(action),
  wasPressed: (action) => pressed.includes(action),
  wasReleased: (action) => released.includes(action),
});

/** Crea un giocatore e lo fa appoggiare a terra. */
function createGroundedPlayer(modules, x = 100) {
  const player = new modules.Player.Player(x, 176);
  const collision = new modules.CollisionSystem.CollisionSystem();
  for (let i = 0; i < 5; i++) player.update(frame, inputOf(), collision, flatGround, 3000);
  return { player, collision };
}

async function loadCommonModules(load) {
  const entries = {
    Player: "entities/Player", Enemy: "entities/Enemy", Boss: "entities/Boss", CollisionSystem: "systems/CollisionSystem",
    CombatSystem: "combat/CombatSystem", EnemyAISystem: "systems/EnemyAISystem", ItemManager: "systems/ItemManager",
    ScoreManager: "systems/ScoreManager", LevelManager: "systems/LevelManager", LevelConfig: "config/levelConfig",
    EnemyConfig: "config/enemyConfig", PlayerConfig: "config/playerConfig", ItemConfig: "config/itemConfig",
    AnimationConfig: "config/animationConfig", GameConfig: "config/gameConfig", HUDManager: "ui/HUDManager",
    EnemySprites: "rendering/sprites/enemySprites", ItemSprites: "rendering/sprites/itemSprites",
    BossSprites: "rendering/sprites/bossSprites", KnightSprites: "rendering/sprites/knightSprites",
    AnimationManager: "rendering/AnimationManager",
  };
  const modules = {};
  for (const [name, path] of Object.entries(entries)) modules[name] = await load(path);
  return modules;
}

/** Regole geometriche di un livello (le stesse usate per progettare i livelli). */
function validateLevelGeometry(level, modules) {
  const problems = [];
  const ground = level.platforms.filter((p) => p.y === 200 && !p.oneWay).sort((a, b) => a.x - b.x);
  for (let i = 1; i < ground.length; i++) {
    const gap = ground[i].x - (ground[i - 1].x + ground[i - 1].width);
    if (gap > 36) problems.push(`abisso di ${gap}px`);
  }
  const lastGround = ground[ground.length - 1];
  if (lastGround.x + lastGround.width < level.width) problems.push("il terreno non arriva al bordo della mappa");
  const surfaces = level.platforms.map((p) => ({ x: p.x, w: p.width, top: p.y }));
  for (const p of level.platforms.filter((q) => q.y < 200)) {
    const reachable = surfaces.some((s) => s.top > p.y && s.x < p.x + p.width + 30 && s.x + s.w > p.x - 30 && s.top - p.y <= 44);
    if (!reachable) problems.push(`piattaforma irraggiungibile in ${p.x},${p.y}`);
  }
  for (const enemy of level.enemies) {
    const definition = modules.EnemyConfig.ENEMY_CONFIG[enemy.type];
    const feetY = enemy.position.y + definition.hitbox.height;
    const centerX = enemy.position.x + definition.hitbox.width / 2;
    if (!level.platforms.some((p) => centerX >= p.x && centerX <= p.x + p.width && Math.abs(p.y - feetY) <= 0.5)) problems.push(`nemico ${enemy.type} non appoggiato in ${enemy.position.x}`);
  }
  for (const item of level.items) {
    const centerX = item.position.x + 4;
    const feetY = item.position.y + 8;
    if (!level.platforms.some((p) => centerX >= p.x && centerX <= p.x + p.width && p.y >= feetY - 1 && p.y - feetY <= 2)) problems.push(`oggetto ${item.type} non appoggiato in ${item.position.x}`);
  }
  if (level.completion.kind === "reachExit") {
    const exitX = level.completion.exitX;
    if (!ground.some((g) => exitX >= g.x && exitX + 24 <= g.x + g.width)) problems.push("uscita non su terreno");
  }
  return problems;
}

/** Bot che cammina verso destra saltando muri e abissi (senza nemici): serve a controllare che il livello sia percorribile. */
function botReachesGoal(level, modules, goalX) {
  const player = new modules.Player.Player(level.playerStart.x, level.playerStart.y);
  const collision = new modules.CollisionSystem.CollisionSystem();
  const platforms = level.platforms;
  const isGroundAt = (x) => platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && p.y >= player.positionY + 20);
  for (let i = 0; i < 60 * 120; i++) {
    const aheadX = player.positionX + player.width + 10;
    const wall = platforms.some((p) => !p.oneWay && aheadX >= p.x && aheadX <= p.x + p.width && p.y < player.positionY + 20 && p.y + p.height > player.positionY + 2);
    const edge = player.isOnGround && !isGroundAt(player.positionX + player.width + 6);
    player.update(frame, inputOf(["moveRight"], player.isOnGround && (wall || edge) ? ["jump"] : []), collision, platforms, level.width);
    if (player.positionY > 300) return false;
    if (player.positionX + player.width / 2 >= goalX) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 4. Controlli di comportamento (uno per esempio): restituiscono [descrizione, vero/falso]
// ---------------------------------------------------------------------------

const behaviorChecks = {
  async 1(m) {
    const { player } = createGroundedPlayer(m);
    const healthAfterDamage = (player.takeDamage(30, 0), player.currentHealth);
    player.heal(500);
    const fillCalls = [];
    const renderer = {
      width: 320,
      height: 240,
      fillRect: (x, y, w, h, color) => fillCalls.push({ x, y, w, h, color }),
      strokeRect() {},
      drawText() {},
      fillVerticalGradient() {},
      fillDithered() {},
      fillDitheredOverlay() {},
    };
    const hud = new m.HUDManager.HUDManager();
    // un segmento della barra = il rettangolo principale con la geometria dichiarata dall'HUD
    const geometry = m.HUDManager.HEALTH_SEGMENT_GEOMETRY;
    const isSegment = (c) => c.w === geometry.width && c.h === geometry.height && c.y === geometry.y;
    const hudData = (health) => ({ health, maxHealth: 150, lives: 3, score: 0, collectibles: 0, levelNumber: 1, boss: null });
    hud.render(renderer, new FakeSpriteManager(), hudData(150), 0);
    const segments = fillCalls.filter(isSegment);
    const full = segments.filter((c) => c.color === m.GameConfig.PALETTE.red).length;
    fillCalls.length = 0;
    hud.render(renderer, new FakeSpriteManager(), hudData(75), 1);
    const half = fillCalls.filter((c) => isSegment(c) && c.color === m.GameConfig.PALETTE.red).length;
    return [
      ["la salute massima del giocatore è 150", player.maxHealth === 150],
      ["dopo 30 di danno restano 120 HP", healthAfterDamage === 120],
      ["la cura non supera 150", player.currentHealth === 150],
      ["la barra dell'HUD ha sempre 10 segmenti (tutti pieni a 150/150)", segments.length === 10 && full === 10],
      ["a 75/150 HP sono pieni 5 segmenti", half === 5],
    ];
  },
  async 2(m) {
    const { player, collision } = createGroundedPlayer(m, 100);
    const startX = player.positionX;
    for (let i = 0; i < 60; i++) player.update(frame, inputOf(["moveRight"]), collision, flatGround, 3000);
    const distance = player.positionX - startX;
    return [["in 1 secondo il cavaliere percorre circa 100 px", Math.abs(distance - 100) < 3 ? true : false], ["la velocità resta indipendente dagli FPS (30 fps ≈ 120 fps)", (() => {
      const slow = createGroundedPlayer(m, 100); const fast = createGroundedPlayer(m, 100);
      for (let i = 0; i < 30; i++) slow.player.update(1 / 30, inputOf(["moveRight"]), slow.collision, flatGround, 3000);
      for (let i = 0; i < 120; i++) fast.player.update(1 / 120, inputOf(["moveRight"]), fast.collision, flatGround, 3000);
      return Math.abs(slow.player.positionX - fast.player.positionX) < 1;
    })()]];
  },
  async 3(m) {
    const { player, collision } = createGroundedPlayer(m);
    const groundY = player.positionY;
    let apex = 0;
    player.update(frame, inputOf([], ["jump"], []), collision, flatGround, 3000);
    for (let i = 0; i < 90; i++) {
      player.update(frame, inputOf(), collision, flatGround, 3000);
      apex = Math.max(apex, groundY - player.positionY);
    }
    return [["l'altezza massima del salto è circa 64 px", Math.abs(apex - 64) < 4]];
  },
  async 4(m) {
    const attacks = m.PlayerConfig.ATTACK_DEFINITIONS;
    // l'attacco colpisce davvero un bersaglio con il danno nuovo
    const { player, collision } = createGroundedPlayer(m);
    const target = { isAlive: true, hp: 100, hits: [], getBounds: () => ({ x: player.positionX + 14, y: 176, width: 12, height: 24 }), receiveHit(damage) { this.hits.push(damage); } };
    const combat = new m.CombatSystem.CombatSystem();
    const pressedOn = new Set([0, 24, 48]);
    for (let i = 0; i < 80; i++) {
      player.update(frame, inputOf([], pressedOn.has(i) ? ["attack"] : []), collision, flatGround, 3000);
      combat.processPlayerAttack(player, [target]);
    }
    return [
      ["swordLight1 e swordLight2 fanno 20", attacks.swordLight1.damage === 20 && attacks.swordLight2.damage === 20],
      ["swordLight3 (finale della combo) fa 40 e swordHeavy 40", attacks.swordLight3.damage === 40 && attacks.swordHeavy.damage === 40],
      ["la combo tripleSlash infligge 20 + 20 + 40", target.hits.join(",") === "20,20,40"],
    ];
  },
  async 5(m) {
    const runSequence = (inputs) => {
      const { player, collision } = createGroundedPlayer(m);
      const names = [];
      for (const input of inputs) {
        player.update(frame, inputOf([], [input]), collision, flatGround, 3000);
        names.push(player.currentAnimationName);
        for (let i = 0; i < 23; i++) player.update(frame, inputOf(), collision, flatGround, 3000);
      }
      return names.join(",");
    };
    return [
      ["Spazio, Spazio, J esegue attack1, attack2, attackHeavy", runSequence(["attack", "attack", "heavyAttack"]) === "attack1,attack2,attackHeavy"],
      ["Spazio ×3 funziona ancora come prima (attack1, attack2, attack3)", runSequence(["attack", "attack", "attack"]) === "attack1,attack2,attack3"],
      ["la combo nuova è definita in COMBO_DEFINITIONS", m.PlayerConfig.COMBO_DEFINITIONS.some((c) => c.id === "heavyFinisher")],
    ];
  },
  async 6(m) {
    const config = m.EnemyConfig.ENEMY_CONFIG.brute;
    const animations = m.AnimationConfig.ENEMY_ANIMATIONS.brute;
    const fakeSprites = new FakeSpriteManager();
    let spriteError = "";
    try { m.EnemySprites.registerEnemySprites(fakeSprites); } catch (error) { spriteError = String(error); }
    const levelManager = new m.LevelManager.LevelManager();
    levelManager.loadLevel(2);
    const spawned = levelManager.createEnemies().filter((e) => e.definition.id === "brute");
    // duello: il bruto attacca un giocatore fermo accanto a lui
    const { player, collision } = createGroundedPlayer(m, 86);
    const brute = new m.Enemy.Enemy(config ?? m.EnemyConfig.ENEMY_CONFIG.soldier, 100, 176);
    const ai = new m.EnemyAISystem.EnemyAISystem();
    const combat = new m.CombatSystem.CombatSystem();
    for (let i = 0; i < 120; i++) {
      player.update(frame, inputOf(), collision, flatGround, 3000);
      ai.update([brute], player, flatGround);
      brute.update(frame, collision, flatGround, 3000);
      combat.processEnemyAttacks([brute], player);
    }
    return [
      ["ENEMY_CONFIG.brute esiste (90 HP, 20 di danno)", config !== undefined && config.maxHealth === 90 && config.attackDamage === 20],
      ["esistono le animazioni idle, walk, attack, hurt, dead", animations !== undefined && ["idle", "walk", "attack", "hurt", "dead"].every((name) => animations[name] !== undefined)],
      ["gli sprite del bruto si registrano senza errori", spriteError === "" && fakeSprites.has("bruteIdle1") && fakeSprites.has("bruteAttackB") && fakeSprites.has("bruteHeap")],
      ["il livello 2 genera un Bruto", spawned.length === 1],
      ["il Bruto infligge 20 di danno a un giocatore fermo", player.currentHealth === 80],
    ];
  },
  async 7(m) {
    const skeletonConfig = m.EnemyConfig.ENEMY_CONFIG.skeleton;
    const { player, collision } = createGroundedPlayer(m, 490);
    const skeleton = new m.Enemy.Enemy(skeletonConfig, 600, 176);
    const ai = new m.EnemyAISystem.EnemyAISystem();
    for (let i = 0; i < 10; i++) skeleton.update(frame, collision, flatGround, 3000);
    for (let i = 0; i < 240; i++) {
      player.update(frame, inputOf(), collision, flatGround, 3000);
      ai.update([skeleton], player, flatGround);
      skeleton.update(frame, collision, flatGround, 3000);
    }
    return [
      ["lo scheletro ha comportamento chase e raggio 120", skeletonConfig.behavior === "chase" && skeletonConfig.detectionRange === 120],
      ["insegue il giocatore a 110 px e lascia la vecchia zona di pattuglia (x < 540)", skeleton.positionX < 540 && skeleton.isChasing],
    ];
  },
  async 8(m) {
    const itemConfig = m.ItemConfig.ITEM_CONFIG.elixir;
    const fakeSprites = new FakeSpriteManager();
    let spriteError = "";
    try { m.ItemSprites.registerItemSprites(fakeSprites); } catch (error) { spriteError = String(error); }
    const { player } = createGroundedPlayer(m, 100);
    player.currentHealth = 20;
    const itemManager = new m.ItemManager.ItemManager();
    const score = new m.ScoreManager.ScoreManager();
    itemManager.loadItems([{ type: "elixir", position: { x: 102, y: 192 } }]);
    const collected = itemManager.collectItems(player, score);
    const level1 = m.LevelConfig.LEVEL_CONFIG.find((level) => level.id === 1);
    return [
      ["ITEM_CONFIG.elixir cura 60 e dà 100 punti", itemConfig !== undefined && itemConfig.healAmount === 60 && itemConfig.scoreBonus === 100],
      ["lo sprite itemElixir si registra senza errori", spriteError === "" && fakeSprites.has("itemElixir")],
      ["raccogliendolo si recuperano 60 HP (20 → 80) e 100 punti", collected.length === 1 && player.currentHealth === 80 && score.currentScore === 100],
      ["il livello 1 contiene un elisir su una superficie", level1.items.some((item) => item.type === "elixir") && validateLevelGeometry(level1, m).length === 0],
    ];
  },
  async 9(m) {
    const levels = m.LevelConfig.LEVEL_CONFIG;
    const newLevel = levels.find((level) => level.id === 3);
    const lastLevel = levels.find((level) => level.id === 4);
    const levelManager = new m.LevelManager.LevelManager();
    return [
      ["i livelli sono 4, con id consecutivi 1-4", levels.length === 4 && levels.every((level, index) => level.id === index + 1)],
      ["il livello 3 è 'Rovine Antiche' e il boss è passato al livello 4", newLevel?.name === "Rovine Antiche" && lastLevel?.hasBoss === true && lastLevel?.name === "Dungeon Sotterraneo"],
      ["il livello 3 rispetta le regole geometriche (abissi, piattaforme, nemici, oggetti, uscita)", newLevel !== undefined && validateLevelGeometry(newLevel, m).length === 0],
      ["un bot raggiunge l'uscita del livello 3 senza cadere", newLevel !== undefined && newLevel.completion.kind === "reachExit" && botReachesGoal(newLevel, m, newLevel.completion.exitX)],
      ["LevelManager conosce il livello 4 e non il 5", levelManager.hasLevel(4) && !levelManager.hasLevel(5)],
      ["il livello 3 crea i suoi 5 nemici e nessun boss", (() => { levelManager.loadLevel(3); return levelManager.createEnemies().length === 5 && levelManager.createBoss() === null; })()],
    ];
  },
  async 10(m) {
    const catalog = m.EnemyConfig.BOSS_CATALOG;
    const king = catalog.skeletonKing;
    const fakeSprites = new FakeSpriteManager();
    let spriteError = "";
    try { m.BossSprites.registerBossSprites(fakeSprites); } catch (error) { spriteError = String(error); }
    const levelManager = new m.LevelManager.LevelManager();
    levelManager.loadLevel(3);
    const boss = levelManager.createBoss();
    levelManager.loadLevel(1);
    const phaseAtHealth = (percent) => { const b = new m.Boss.Boss(king, 0, 160, () => 0.9); b.currentHealth = Math.round((king.maxHealth * percent) / 100); return b.phaseIndex; };
    // combattimento: il re colpisce un giocatore vicino con il suo fendente (22)
    const { player, collision } = createGroundedPlayer(m, 1000 - 30);
    const fight = new m.Boss.Boss(king, 1000, 160, () => 0.9);
    const combat = new m.CombatSystem.CombatSystem();
    for (let i = 0; i < 200; i++) {
      player.update(frame, inputOf(), collision, flatGround, 3000);
      fight.update(frame, player, collision, flatGround, 3000);
      combat.processBossAttack(fight, player);
    }
    return [
      ["il catalogo contiene il Re Scheletro con 3 fasi", king !== undefined && king.phases.length === 3],
      ["esistono le animazioni del Re Scheletro", m.AnimationConfig.BOSS_ANIMATIONS.skeletonKing?.slash !== undefined],
      ["gli sprite di entrambi i boss si registrano senza errori", spriteError === "" && fakeSprites.has("skeletonKingIdle1") && fakeSprites.has("blackKnightIdle1")],
      ["il livello del dungeon crea il Re Scheletro", boss !== null && boss.definition.id === "skeletonKing"],
      ["il livello 1 non ha boss", levelManager.createBoss() === null],
      ["le fasi cambiano a 66% e 33% (fase 0 a 80%, 1 a 50%, 2 a 20%)", phaseAtHealth(80) === 0 && phaseAtHealth(50) === 1 && phaseAtHealth(20) === 2],
      ["il fendente del Re Scheletro infligge 22", player.currentHealth === 100 - 22],
    ];
  },
  async 11(m) {
    const fakeSprites = new FakeSpriteManager();
    let spriteError = "";
    try { m.KnightSprites.registerKnightSprites(fakeSprites); } catch (error) { spriteError = String(error); }
    const { player, collision } = createGroundedPlayer(m, 100);
    const startX = player.positionX;
    player.celebrate();
    // anche premendo comandi il cavaliere non si muove né attacca
    player.update(frame, inputOf(["moveRight"], ["attack", "jump"]), collision, flatGround, 3000);
    const state = player.currentState;
    const animation = player.currentAnimationName;
    const firstFrame = player.animationPlayer.currentFrameId;
    for (let i = 0; i < 16; i++) player.update(frame, inputOf(["moveRight"]), collision, flatGround, 3000);
    const laterFrame = player.animationPlayer.currentFrameId;
    const moved = Math.abs(player.positionX - startX);
    player.respawnAt({ x: 100, y: 176 });
    player.update(frame, inputOf(), collision, flatGround, 3000);
    return [
      ["gli sprite dell'esultanza si registrano senza errori", spriteError === "" && fakeSprites.has("knightCheer1") && fakeSprites.has("knightCheer2")],
      ["dopo celebrate() lo stato è 'cheer' con l'animazione 'cheer'", state === "cheer" && animation === "cheer"],
      ["durante l'esultanza non si muove e non attacca", moved < 0.01 && player.activeAttack === null],
      ["l'animazione alterna i due frame", firstFrame === "knightCheer1" && laterFrame === "knightCheer2"],
      ["respawnAt() termina l'esultanza", player.currentState === "idle"],
    ];
  },
};

// ---------------------------------------------------------------------------
// 5. Esecuzione
// ---------------------------------------------------------------------------

async function runChecks(directory, exampleNumber) {
  const load = createLoader(directory);
  try {
    const modules = await loadCommonModules(load);
    return { results: await behaviorChecks[exampleNumber](modules) };
  } catch (error) {
    return { error: String(error).split("\n")[0] };
  }
}

const examples = parseExamples(readFileSync(manualPath, "utf8")).filter((example) => requestedExamples.length === 0 || requestedExamples.includes(example.number));
if (examples.length === 0) {
  console.error("Nessun esempio trovato in CODE_MANUAL.md.");
  process.exit(2);
}

if (exportIndex !== -1) {
  const exportNumber = Number(process.argv[exportIndex + 1]);
  const targetDirectory = resolve(process.argv[exportIndex + 2] ?? "");
  const example = parseExamples(readFileSync(manualPath, "utf8")).find((candidate) => candidate.number === exportNumber);
  if (example === undefined || process.argv[exportIndex + 2] === undefined) {
    console.error("Uso: npm run verify-docs -- --export <numero esempio> <cartella>");
    process.exit(2);
  }
  mkdirSync(targetDirectory, { recursive: true });
  const copyDirectory = createProjectCopy("export");
  applySteps(copyDirectory, example.steps);
  cpSync(join(copyDirectory, "src"), join(targetDirectory, "src"), { recursive: true });
  for (const file of ["package.json", "tsconfig.json", "vite.config.ts", "index.html"]) cpSync(join(copyDirectory, file), join(targetDirectory, file));
  rmSync(copyDirectory, { recursive: true, force: true });
  console.log(`Esempio ${exportNumber} applicato in ${targetDirectory}. Per provarlo: npm install, poi npm run dev (in quella cartella).`);
  process.exit(0);
}

const baselineDirectory = createProjectCopy("base");
const temporaryDirectories = [baselineDirectory];
let failures = 0;

for (const example of examples) {
  console.log(`\n=== Esempio ${example.number} – ${example.title} (${example.steps.length} passi) ===`);
  const modifiedDirectory = createProjectCopy("ex" + example.number);
  temporaryDirectories.push(modifiedDirectory);
  try {
    applySteps(modifiedDirectory, example.steps);
    console.log("  ✔ il codice originale compare una sola volta in ogni passo");
  } catch (error) {
    console.log("  ✘ " + error.message);
    failures++;
    continue;
  }
  const typecheck = runTypecheck(modifiedDirectory);
  if (typecheck.ok) {
    console.log("  ✔ il codice modificato compila (tsc --noEmit)");
  } else {
    console.log("  ✘ errori di tipo dopo la modifica:\n" + typecheck.output.split("\n").slice(0, 6).map((line) => "      " + line).join("\n"));
    failures++;
    continue;
  }
  const after = await runChecks(modifiedDirectory, example.number);
  if (after.error !== undefined) {
    console.log("  ✘ il controllo del comportamento ha generato un errore: " + after.error);
    failures++;
    continue;
  }
  let allPassed = true;
  for (const [description, passed] of after.results) {
    console.log(`  ${passed ? "✔" : "✘"} ${description}`);
    if (!passed) allPassed = false;
  }
  if (!allPassed) failures++;
  // controllo negativo: sul codice originale il controllo deve fallire
  const before = await runChecks(baselineDirectory, example.number);
  const baselineFails = before.error !== undefined || before.results.some(([, passed]) => !passed);
  console.log(baselineFails ? "  ✔ sul codice originale il controllo fallisce (misura davvero la modifica)" : "  ✘ sul codice originale il controllo passa già: l'esempio non cambia nulla di misurabile");
  if (!baselineFails) failures++;
}

for (const directory of temporaryDirectories) {
  if (existsSync(directory)) rmSync(directory, { recursive: true, force: true });
}
console.log(failures === 0 ? `\nTutti i ${examples.length} esempi verificati.` : `\n${failures} esempi con problemi.`);
process.exit(failures === 0 ? 0 : 1);
