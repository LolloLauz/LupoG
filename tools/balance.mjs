/**
 * Simulatore di bilanciamento (solo per sviluppatori, non fa parte del gioco).
 *
 * Usa le classi reali del gioco (Player, Enemy, Boss, CollisionSystem, CombatSystem...)
 * in un mondo senza grafica e le fa giocare a un "bot", per misurare quanto sono
 * difficili nemici, livelli e boss dopo aver modificato i valori in src/config/.
 *
 * Uso:   npm run balance            (report completo, circa 5 minuti: le sezioni girano in parallelo)
 *        npm run balance -- --quick (meno ripetizioni, più veloce e meno preciso)
 *        npm run balance -- --core        (duelli, boss, livelli e partite del Cavaliere con la sola spada)
 *        npm run balance -- --equipment   (solo le partite complete con e senza equipaggiamento, piano E1-E6)
 *        npm run balance -- --classes     (solo le cinque classi, Classi Fase 6B)
 *        npm run balance -- --class=mage  (una sola classe: knight, ranger, berserker, mage, paladin)
 *        Con --class o --classes si può chiedere una sola parte: --part=boss|moves|runs|builds (anche più d'una, con le virgole).
 *
 * IMPORTANTE: il bot è un giocatore semplice. "rusher" attacca sempre senza mai schivare;
 * "medio" prova a schivare in modo imperfetto. Non sostituisce una prova con persone reali:
 * serve a vedere la DIREZIONE di una modifica (più facile / più difficile), non il valore esatto.
 */
import { buildSync } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = mkdtempSync(join(tmpdir(), "iron-balance-"));
const isQuick = process.argv.includes("--quick");
const argumentValue = (name) => process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split("=")[1];
const isCoreOnly = process.argv.includes("--core");
const isEquipmentOnly = process.argv.includes("--equipment");
const isClassesOnly = process.argv.includes("--classes");
const onlyClassId = argumentValue("class");
const classParts = argumentValue("part")?.split(",") ?? ["boss", "moves", "runs", "builds"];
// opzioni sconosciute o scritte male: errore, invece di un report completo o vuoto
const CLASS_IDS = ["knight", "ranger", "berserker", "mage", "paladin"];
const CLASS_PARTS = ["boss", "moves", "runs", "builds"];
const isKnownOption = (argument) => ["--quick", "--core", "--equipment", "--classes"].includes(argument) || /^--(class|part)=/.test(argument);
const badOptions = [
  ...process.argv.slice(2).filter((argument) => !isKnownOption(argument)),
  ...(onlyClassId === undefined || CLASS_IDS.includes(onlyClassId) ? [] : [`--class=${onlyClassId}`]),
  ...classParts.filter((part) => !CLASS_PARTS.includes(part)).map((part) => `--part=${part}`),
];
if (badOptions.length > 0) {
  console.error(`Opzioni non valide: ${badOptions.join(" ")}. Valide: --quick --core --equipment --classes --class=<${CLASS_IDS.join("|")}> --part=<${CLASS_PARTS.join(",")}>`);
  process.exit(1);
}
const repetitions = isQuick ? 15 : 40;
const runRepetitions = isQuick ? 20 : 60;

/**
 * Senza una sezione il report si divide in processi paralleli (uno per parte), stampati nell'ordine di sempre.
 * Ogni partita ha il suo seme, quindi il risultato non dipende dall'ordine di esecuzione.
 */
if (!isCoreOnly && !isEquipmentOnly && onlyClassId === undefined) {
  const sections = [...(isClassesOnly ? [] : [["--core"], ["--equipment"]]), ...CLASS_IDS.map((id) => [`--class=${id}`])];
  const passed = process.argv.slice(2).filter((argument) => argument !== "--classes");
  const outputs = await Promise.all(
    sections.map(
      (section) =>
        new Promise((done, fail) => {
          const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...section, ...passed], { stdio: ["ignore", "pipe", "inherit"] });
          let text = "";
          child.stdout.setEncoding("utf8").on("data", (chunk) => (text += chunk));
          child.on("close", (code) => (code === 0 ? done(text) : fail(new Error(`Sezione ${section.join(" ")} fallita (codice ${code})`))));
        })
    )
  );
  const report = `${outputs.join("\n")}\n(rusher = attacca sempre; il risultato indica la direzione, non il valore esatto per una persona.)\n`;
  // si esce solo dopo aver scritto tutto: su una pipe, uscire subito può troncare il report
  await new Promise((done) => process.stdout.write(report, done));
  process.exit(0);
}

/** Compila un modulo TypeScript del gioco e lo importa (esbuild è incluso con Vite). */
async function loadModule(relativePath) {
  const outputFile = join(outputDirectory, relativePath.replace(/\W/g, "_") + ".mjs");
  buildSync({
    entryPoints: [join(projectRoot, "src", relativePath + ".ts")],
    bundle: true,
    format: "esm",
    outfile: outputFile,
    logLevel: "error",
  });
  return import(pathToFileURL(outputFile).href);
}

const { Player } = await loadModule("entities/Player");
const { Enemy } = await loadModule("entities/Enemy");
const { Boss } = await loadModule("entities/Boss");
const { CollisionSystem } = await loadModule("systems/CollisionSystem");
const { CombatSystem } = await loadModule("combat/CombatSystem");
const { EnemyAISystem } = await loadModule("systems/EnemyAISystem");
const { ItemManager } = await loadModule("systems/ItemManager");
const { ScoreManager } = await loadModule("systems/ScoreManager");
const { LevelManager, ARENA_GATE_WIDTH } = await loadModule("systems/LevelManager");
const { ProjectileSystem } = await loadModule("systems/ProjectileSystem");
const { HazardSystem } = await loadModule("systems/HazardSystem");
const { LEVEL_CONFIG } = await loadModule("config/levelConfig");
const { ENEMY_CONFIG, BOSS_CONFIG, BOSS_CATALOG } = await loadModule("config/enemyConfig");
const { GAME_CONFIG, DIFFICULTY_CONFIG, DIFFICULTY_ORDER } = await loadModule("config/gameConfig");
const { Inventory } = await loadModule("systems/Inventory");
const { ITEM_CONFIG } = await loadModule("config/itemConfig");
const { CHARACTER_CONFIG, CHARACTER_ORDER } = await loadModule("config/characterConfig");
const { WEAPON_CONFIG } = await loadModule("config/weaponConfig");
const { rollLootArmor, rollLootWeapon } = await loadModule("systems/LootSystem");
const { getItemTotals, EMPTY_ARMOR } = await loadModule("systems/EquipmentStats");
const { createArmorItem, createWeaponItem } = await loadModule("systems/ItemFactory");
const { ARMOR_CONFIG } = await loadModule("config/armorConfig");
const { RARITY_ORDER } = await loadModule("config/rarityConfig");
const { AmmoRegeneration } = await loadModule("systems/AmmoRegeneration");
const { ATTRIBUTE_CONFIG, ATTRIBUTE_ORDER } = await loadModule("config/attributeConfig");
const { AttributePoints } = await loadModule("systems/AttributePoints");
const { getItemStrengthRequirement } = await loadModule("systems/AttributeStats");
const { ELEMENT_SYNERGIES } = await loadModule("config/elementConfig");
const { ABILITY_UNLOCK_CONFIG, ABILITY_CONFIG } = await loadModule("config/abilityConfig");

const collisionSystem = new CollisionSystem();
const combatSystem = new CombatSystem();
const enemyAISystem = new EnemyAISystem();
const hazardSystem = new HazardSystem();
const FRAME = 1 / 60;
/** Il giocatore colpisce al massimo a questa distanza (px) dal bordo del nemico. */
const PLAYER_REACH = 16;
/** Antiblocco del bot di classe: dopo quanti secondi senza progressi ignora i nemici, e per quanto. */
const STALL_SECONDS = 6;
const SKIP_SECONDS = 2.5;

/** Generatore pseudo-casuale con seme (risultati ripetibili). */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fa giocare il bot in un livello.
 * dodgeSkill: probabilità (0-1) che il bot decida di schivare un attacco.
 * enemyOverride: sostituisce i nemici del livello (per i duelli).
 * stopWhenClear: termina quando tutti i nemici (e il boss) sono sconfitti.
 */
function playLevel(levelId, options = {}) {
  // useClassBot (Classi Fase 6B): bot della classe, con la sua arma iniziale e tutte le mosse note; senza, il bot
  // "spada" delle sezioni di controllo (attacca e schiva, nessuna mossa)
  // allowedSlots: slot delle mosse che il bot di classe può usare (null = tutti; serve a misurare una mossa alla volta)
  // armor, weaponItem: equipaggiamento (piano E1-E6): armature indossate e l'arma con la sua rarità
  // spentAttributes (Classi Fase 4): punti attributo spesi sopra la base della classe (null = nessuno)
  const { character = CHARACTER_CONFIG.knight, useClassBot = false, allowedSlots = null, dodgeSkill = 0, seed = 1, startHealth = character.maxHealth, startPotions = 0, knownAbilities = 4, maxSeconds = 240, enemyOverride = null, stopWhenClear = false, armor = EMPTY_ARMOR, weaponItem = null, spentAttributes = null, difficulty = "normal" } = options;
  const level = LEVEL_CONFIG.find((candidate) => candidate.id === levelId);
  const random = createRandom(seed);
  // come nel gioco: piattaforme (anche mobili e cancello dell'arena), pericoli, proiettili
  const levelManager = new LevelManager();
  levelManager.loadLevel(levelId);
  const hazards = level.hazards ?? [];
  const projectileSystem = new ProjectileSystem();
  let platforms = levelManager.platforms;
  const player = new Player(level.playerStart.x, level.playerStart.y, character);
  player.setKnownAbilityCount(knownAbilities);
  player.setArmor(armor);
  if (spentAttributes !== null) player.setSpentAttributes(spentAttributes);
  if (weaponItem !== null) player.equipWeapon(WEAPON_CONFIG[weaponItem.baseId], null, weaponItem);
  else if (useClassBot) player.equipWeapon(WEAPON_CONFIG[character.startingWeaponId]);
  // ricarica passiva delle frecce (Ranger), come nel gioco: qui l'arma è solo quella in mano, senza borsa
  const ammoRegeneration = new AmmoRegeneration();
  const heldAmmo = {
    isMissingAmmo: (weaponId) => player.equippedWeapon.id === weaponId && player.currentAmmo < player.maxAmmo,
    addAmmo: () => {
      player.setAmmo(player.currentAmmo + 1);
      return true;
    },
  };
  player.currentHealth = Math.min(player.maxHealth, startHealth);
  // come nel gioco: nemici d'élite compresi
  const enemies = (enemyOverride ?? level.enemies).map(
    (spawn) => new Enemy(ENEMY_CONFIG[spawn.type], spawn.position.x, spawn.position.y, difficulty, { elite: spawn.elite, weaponDrop: spawn.weaponDrop })
  );
  // la borsa: le pozioni si raccolgono (E) e si bevono quando la salute scende (il bot usa solo la spada)
  const inventory = new Inventory();
  for (let index = 0; index < startPotions; index++) inventory.addPotion();
  const potionHeal = ITEM_CONFIG.healthPotion.healAmount;
  const bossDefinition = level.hasBoss ? BOSS_CATALOG[level.bossId ?? BOSS_CONFIG.id] : null;
  const boss = bossDefinition !== null ? new Boss(bossDefinition, level.bossSpawn.x, level.bossSpawn.y, createRandom(seed + 999), difficulty) : null;
  // come LevelManager.createBoss: il boss non esce dalla sua arena
  if (boss !== null && level.bossArenaStartX !== undefined) boss.arenaMinX = level.bossArenaStartX + ARENA_GATE_WIDTH;
  const itemManager = new ItemManager();
  itemManager.loadItems(level.items);
  const scoreManager = new ScoreManager();
  const goalX = level.completion.kind === "reachExit" ? level.completion.exitX : null;
  const attackStartTimes = new Map();
  const dodgeDecisions = new Map();
  let isArenaLocked = false;
  let healthLost = 0;
  // bot di classe: quanti frame di fila ha camminato senza spostarsi
  let stuckFrames = 0;
  // bot di classe, antiblocco: quando ha fatto l'ultimo progresso (più avanti di prima o un danno inflitto)
  let furthestX = player.positionX;
  let enemyHealth = Infinity;
  let lastProgressTime = 0;
  let skipTargetsUntil = 0;

  const isSolidWallAhead = (aheadX) =>
    platforms.some((p) => !p.oneWay && aheadX >= p.x && aheadX <= p.x + p.width && p.y < player.positionY + 20 && p.y + p.height > player.positionY + 2);
  // spuntoni e abissi: il bot li salta
  const isGroundAt = (x) =>
    platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && p.y >= player.positionY + 20) &&
    !hazards.some((h) => h.kind === "spikes" && x >= h.x - 4 && x <= h.x + h.width);

  for (let frame = 0; frame < 60 * maxSeconds; frame++) {
    const time = frame * FRAME;
    const pressed = [];
    const held = [];
    const playerCenterX = player.positionX + player.width / 2;

    // bersaglio più vicino alla stessa altezza
    const targets = [...enemies.filter((e) => e.isAlive), ...(boss !== null && boss.isAlive && boss.isActive ? [boss] : [])];
    let nearest = null;
    let nearestDistance = Infinity;
    for (const target of targets) {
      const dx = target.positionX + target.width / 2 - playerCenterX;
      const dy = Math.abs(target.positionY + target.height / 2 - (player.positionY + player.height / 2));
      const maxDistance = target === boss ? 160 : 90;
      if (dy < 16 && Math.abs(dx) < maxDistance && Math.abs(dx) < nearestDistance) {
        nearest = target;
        nearestDistance = Math.abs(dx);
      }
    }
    if (boss !== null && !boss.isActive && isArenaLocked) {
      nearest = boss;
    }
    if (useClassBot) {
      const totalHealth = targets.reduce((sum, target) => sum + target.currentHealth, 0);
      if (player.positionX > furthestX + 8 || totalHealth < enemyHealth) {
        furthestX = Math.max(furthestX, player.positionX);
        lastProgressTime = time;
      }
      enemyHealth = totalHealth;
      // fermo da troppo (nemico irraggiungibile, giri a vuoto su un ostacolo): per un po' tira dritto, tranne col boss
      if (time - lastProgressTime > STALL_SECONDS) {
        skipTargetsUntil = time + SKIP_SECONDS;
        lastProgressTime = time;
      }
      if (time < skipTargetsUntil && nearest !== boss) nearest = null;
    }

    if (nearest !== null && !player.isDead) {
      const targetCenterX = nearest.positionX + nearest.width / 2;
      const direction = targetCenterX < playerCenterX ? -1 : 1;
      const gap = Math.abs(targetCenterX - playerCenterX) - (nearest.width + player.width) / 2;
      held.push(direction > 0 ? "moveRight" : "moveLeft");
      const isTargetAttacking = nearest === boss ? !["idle", "walk", "dormant", "dead"].includes(boss.currentState) : nearest.isAttacking;
      if (isTargetAttacking) {
        if (!attackStartTimes.has(nearest)) {
          attackStartTimes.set(nearest, time);
          dodgeDecisions.set(nearest, random() < dodgeSkill);
        }
      } else {
        attackStartTimes.delete(nearest);
        dodgeDecisions.delete(nearest);
      }
      const windupMs = nearest === boss
        ? (nearest.currentAttackWindupMs ?? (bossDefinition.attacks.find((attack) => attack.kind === "melee") ?? bossDefinition.attacks[0]).windupMs)
        : nearest.definition.attackWindupMs;
      const attackElapsedMs = (time - (attackStartTimes.get(nearest) ?? time)) * 1000;
      const wantsToDodge = isTargetAttacking && dodgeDecisions.get(nearest) && gap < (nearest === boss ? 90 : 40);
      if (useClassBot) {
        playClassTurn({ player, platforms, nearest, boss, direction, gap, isTargetAttacking, wantsToDodge, attackElapsedMs, windupMs, held, pressed, dodgeDecisions, isSolidWallAhead, isGroundAt, allowedSlots });
      } else {
      // schiva poco prima del colpo; smette di attaccare in tempo per essere libero
      if (wantsToDodge && attackElapsedMs >= windupMs - 100 && attackElapsedMs <= windupMs - 30 && player.isOnGround && !player.activeAttack) {
        pressed.push("dodge");
        dodgeDecisions.set(nearest, false);
      }
      const holdAttack = wantsToDodge && attackElapsedMs >= windupMs - 520;
      if (gap <= PLAYER_REACH) {
        // a portata: si ferma, ma prima si gira verso il bersaglio (dopo una carica può trovarselo alle spalle)
        const isFacingTarget = (direction > 0) === (player.facingDirection === "right");
        if (isFacingTarget) held.length = 0;
        if (!holdAttack) pressed.push("attack");
      } else {
        if (gap < PLAYER_REACH + 6 && !holdAttack) pressed.push("attack");
        const aheadX = direction > 0 ? player.positionX + player.width + 10 : player.positionX - 10;
        const edgeX = direction > 0 ? player.positionX + player.width + 6 : player.positionX - 6;
        if (player.isOnGround && (isSolidWallAhead(aheadX) || !isGroundAt(edgeX)) && !player.activeAttack) pressed.push("jump");
      }
      }
    } else if (!player.isDead) {
      held.push("moveRight");
      const aheadX = player.positionX + player.width + 10;
      if (player.isOnGround && (isSolidWallAhead(aheadX) || !isGroundAt(player.positionX + player.width + 6))) pressed.push("jump");
    }

    // bloccato contro un corpo o un gradino che non ha come bersaglio (es. un nemico in una vasca): lo salta
    if (useClassBot && stuckFrames > 30 && player.isOnGround && !player.activeAttack) {
      pressed.push("jump");
      stuckFrames = 0;
    }
    const startX = player.positionX;
    const input = { isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false };
    const healthBefore = player.currentHealth;
    levelManager.updateMovingPlatforms(time * 1000, [player, ...enemies.filter((enemy) => !enemy.isFlying)]);
    player.environment = hazardSystem.computePlayerEnvironment(player, hazards);
    player.update(FRAME, input, collisionSystem, platforms, level.width);
    if (useClassBot) ammoRegeneration.update(FRAME * 1000, character.ammoRegeneration, heldAmmo);
    player.drainProjectileLaunches().forEach((launch) => projectileSystem.spawn(launch));
    hazardSystem.applyContactDamage(player, hazards);
    if (level.bossArenaStartX !== undefined && !isArenaLocked && player.positionX > level.bossArenaStartX + 24) {
      isArenaLocked = true;
      levelManager.lockArena();
      platforms = levelManager.platforms;
    }
    combatSystem.processPlayerAttack(player, boss === null ? enemies : [...enemies, boss]);
    enemyAISystem.update(enemies, player, platforms, hazards, time * 1000);
    const children = [];
    for (const enemy of enemies) {
      const wasAlive = enemy.isAlive;
      enemy.update(FRAME, collisionSystem, platforms, level.width);
      if (wasAlive && !enemy.isAlive) player.registerKill();
      enemy.drainProjectileLaunches().forEach((launch) => projectileSystem.spawn(launch));
      for (const split of enemy.drainSplitRequests()) children.push(new Enemy(ENEMY_CONFIG[split.enemyType], split.position.x, split.position.y, difficulty));
    }
    enemies.push(...children);
    // corpi solidi, come GameEngine.separatePlayerFromBodies
    const separateBodies = () => {
      if (player.isDead || player.isDodging) return;
      for (const body of [...enemies.filter((enemy) => enemy.isAlive && !enemy.isFlying), ...(boss !== null && boss.isAlive ? [boss] : [])]) {
        collisionSystem.separateHorizontally(player, body, platforms, level.width);
      }
    };
    separateBodies();
    const isWalking = (held.includes("moveLeft") || held.includes("moveRight")) && !held.includes("crouch") && player.activeAttack === null;
    stuckFrames = isWalking && Math.abs(player.positionX - startX) < 0.1 ? stuckFrames + 1 : 0;
    combatSystem.processEnemyAttacks(enemies, player);
    if (boss !== null) {
      const minions = enemies.filter((enemy) => enemy.isSummoned && enemy.isAlive).length;
      const wasBossAlive = boss.isAlive;
      boss.update(FRAME, player, collisionSystem, platforms, level.width, minions);
      if (wasBossAlive && !boss.isAlive) player.registerKill();
      separateBodies();
      combatSystem.processBossAttack(boss, player);
      boss.drainProjectileLaunches().forEach((launch) => projectileSystem.spawn(launch));
      for (const summon of boss.drainSummonRequests()) {
        const minion = new Enemy(ENEMY_CONFIG[summon.enemyType], summon.position.x, summon.position.y, difficulty);
        minion.isSummoned = true;
        enemies.push(minion);
      }
    }
    projectileSystem.update(FRAME, player, platforms, level.width, level.height, [...enemies, ...(boss !== null ? [boss] : [])]);
    itemManager.update(FRAME);
    itemManager.collectItems(player, scoreManager);
    const quiver = player.currentAmmo !== null && player.currentAmmo < player.maxAmmo ? itemManager.findTouchedAmmoRefill(player) : null;
    if (quiver !== null) {
      player.setAmmo(player.maxAmmo);
      itemManager.removeItem(quiver);
    }
    const potion = itemManager.findReachableBagItem(player);
    if (potion !== null && inventory.addPotion()) itemManager.removeItem(potion);
    if (!player.isDead && player.currentHealth <= player.maxHealth - potionHeal) {
      const potionSlot = inventory.bagSlots.findIndex((slot) => slot !== null && slot.kind === "potion");
      if (potionSlot >= 0 && inventory.consumePotion(potionSlot)) player.heal(potionHeal);
    }
    for (let index = enemies.length - 1; index >= 0; index--) {
      if (enemies[index].isRemovable) enemies.splice(index, 1);
    }
    if (player.currentHealth < healthBefore) healthLost += healthBefore - player.currentHealth;
    if (player.positionY > 300) {
      player.takeEnvironmentalDamage(GAME_CONFIG.fallDamage);
      healthLost += GAME_CONFIG.fallDamage;
      player.respawnAt({ x: Math.max(24, player.positionX - 60), y: 150 });
    }
    const result = (outcome) => ({ outcome, time, healthLost, health: player.currentHealth, maxHealth: player.maxHealth, potions: inventory.potionCount });
    if (player.isReadyToRespawn) return result("dead");
    if (stopWhenClear && enemies.every((e) => !e.isAlive) && (boss === null || !boss.isAlive)) return result("win");
    if (!stopWhenClear && goalX !== null && player.positionX + player.width / 2 >= goalX) return result("win");
    if (boss !== null && boss.isDefeated) return result("win");
  }
  return { outcome: "timeout", time: maxSeconds, healthLost, health: player.currentHealth, maxHealth: player.maxHealth, potions: inventory.potionCount };
}

/** Distanza massima (px, dal bordo) a cui il bot di classe tira con un proiettile. */
const SHOT_RANGE = 140;
/** Il colpo di sangue (costa salute) si usa solo sopra questa frazione di salute. */
const HEALTH_COST_FLOOR = 0.5;

/** Mossa che serve a togliersi dai guai: scatto invulnerabile (balzo arcano, tiro in ritirata). */
const isEvasive = (ability) => ability.kind === "attack" && ability.attack.dash?.invulnerable === true;

/** Distanza (px, dal bordo) a cui il colpo base dell'arma arriva: la mazza (14) è più corta della spada (16). */
function getWeaponReach(player) {
  const weapon = player.equippedWeapon;
  const hitbox = weapon.attacks[weapon.defaultAttackByInput.attack].hitbox;
  return hitbox.x + hitbox.width - player.width - 1;
}

/** Vero se tra il personaggio e il bersaglio, all'altezza del tiro, c'è un ostacolo solido (il tiro si pianta lì). */
function isShotBlocked(player, target, platforms) {
  const from = Math.min(player.positionX + player.width, target.positionX + target.width);
  const to = Math.max(player.positionX, target.positionX);
  const shotY = player.positionY + 9;
  return platforms.some((p) => !p.oneWay && p.x < to && p.x + p.width > from && p.y < shotY + 5 && p.y + p.height > shotY);
}

/** Vero se la mossa, dalla distanza gap, può raggiungere il bersaglio. */
function isAbilityInRange(player, ability, gap, weaponReach) {
  const attack = ability.attack;
  if (isEvasive(ability)) return attack.projectile !== undefined && gap <= 40;
  if (attack.projectile !== undefined) return gap > 6 && gap <= SHOT_RANGE;
  if (attack.damage <= 0) return false;
  const dash = attack.dash;
  const dashReach = dash === undefined ? 0 : (Math.max(0, dash.speed) * (dash.endMs - dash.startMs)) / 2000;
  return gap <= Math.max(weaponReach, attack.hitbox.x + attack.hitbox.width - player.width - 4 + dashReach);
}

/** Vero se la mossa fa scattare una sinergia sull'effetto che il bersaglio ha adesso. */
function triggersSynergy(ability, target) {
  const attack = ability.attack;
  return ELEMENT_SYNERGIES.some(
    (synergy) =>
      target.statusEffects.has(synergy.status) &&
      ((synergy.triggerElement !== undefined && (attack.elements ?? []).includes(synergy.triggerElement)) ||
        (synergy.triggersOnHeavyImpact === true && (attack.breaksGuard === true || attack.crushesArmor === true)))
  );
}

/**
 * Bot di classe (Classi Fase 6B). Con la guardia (scudo, barriera) la alza al posto della schivata; al momento del
 * colpo usa lo scatto invulnerabile se ne ha uno pronto, altrimenti schiva. Appena può usa la mossa a portata: prima
 * quella che fa scattare una sinergia, poi la più forte. Per il resto attacca con l'arma: con le armi a distanza
 * sta fermo a tirare (tiro caricato se il bersaglio è lontano e non sta attaccando) e senza frecce aspetta.
 * Non bada a stamina e mana: una mossa che non si può pagare non è "pronta".
 */
function playClassTurn({ player, platforms, nearest, boss, direction, gap, isTargetAttacking, wantsToDodge, attackElapsedMs, windupMs, held, pressed, dodgeDecisions, isSolidWallAhead, isGroundAt, allowedSlots }) {
  const slots = player.abilitySlots
    .map((slot, index) => ({ ...slot, action: `ability${index + 1}`, isAllowed: allowedSlots === null || allowedSlots.includes(index) }))
    .filter((slot) => slot.isAllowed && slot.isKnown);
  const isRanged = player.maxAmmo !== null;
  const weaponReach = getWeaponReach(player);
  const isBlocked = isRanged && isShotBlocked(player, nearest, platforms);
  // bersagli bassi (melme, lupi, scorpioni: il bordo alto sta sotto la freccia tirata in piedi): le armi a distanza li
  // colpiscono solo da accovacciati, le mosse a proiettile li scavalcano
  const lowTargetDepth = nearest.positionY - (player.positionY + player.height);
  const isLowTarget = lowTargetDepth >= -13 && lowTargetDepth < 0;
  const isFree = player.isOnGround && !player.activeAttack && !player.isGuarding;
  const isFacingTarget = (direction > 0) === (player.facingDirection === "right");

  const guard = slots.find((slot) => slot.ability.kind === "guard");
  if (guard !== undefined && wantsToDodge && attackElapsedMs >= windupMs - 150 && (player.isGuarding || guard.isReady)) {
    // con la guardia alzata ci si gira ma non ci si muove
    held.push(guard.action);
    if (!player.isGuarding) pressed.push(guard.action);
    return;
  }

  if (wantsToDodge && attackElapsedMs >= windupMs - 100 && attackElapsedMs <= windupMs - 30 && isFree) {
    const escape = slots.find((slot) => isEvasive(slot.ability) && slot.isReady && isFacingTarget);
    pressed.push(escape?.action ?? "dodge");
    dodgeDecisions.set(nearest, false);
  } else if (isFree && isFacingTarget) {
    const best = slots
      .filter((slot) => slot.ability.kind === "attack" && slot.isReady && isAbilityInRange(player, slot.ability, gap, weaponReach) && !((isBlocked || isLowTarget) && slot.ability.attack.projectile !== undefined))
      .filter((slot) => slot.ability.cost.health === undefined || player.currentHealth > player.maxHealth * HEALTH_COST_FLOOR)
      .map((slot) => ({ slot, value: slot.ability.attack.damage + (triggersSynergy(slot.ability, nearest) ? 1000 : 0) }))
      .sort((first, second) => second.value - first.value)[0];
    if (best !== undefined) pressed.push(best.slot.action);
  }

  const holdAttack = wantsToDodge && attackElapsedMs >= windupMs - 520;
  const walk = () => {
    const aheadX = direction > 0 ? player.positionX + player.width + 10 : player.positionX - 10;
    const edgeX = direction > 0 ? player.positionX + player.width + 6 : player.positionX - 6;
    if (player.isOnGround && (isSolidWallAhead(aheadX) || !isGroundAt(edgeX)) && !player.activeAttack) pressed.push("jump");
  };
  if (isRanged) {
    // anche per girarsi cammina "guardando dove mette i piedi": spuntoni e abissi si saltano
    if (gap > SHOT_RANGE || (isBlocked && gap > 8) || (!isFacingTarget && player.chargeFraction === null)) return walk();
    // senza frecce indietreggia finché la ricarica non ne ridà una (se dietro c'è terreno)
    const isCharging = player.chargeFraction !== null;
    if (player.currentAmmo === 0 && !isCharging) {
      const backX = direction > 0 ? player.positionX - 8 : player.positionX + player.width + 8;
      held.length = 0;
      if (gap < 60 && isGroundAt(backX)) held.push(direction > 0 ? "moveLeft" : "moveRight");
      return;
    }
    if (isFacingTarget) held.length = 0;
    if (isLowTarget && isFacingTarget) held.push("crouch");
    // tiro caricato (fino a 34 danni con una freccia): si tiene K finché la carica è piena, poi si rilascia. Lo
    // preferisce con il bersaglio lontano o con poche frecce
    if (isCharging) {
      if (player.chargeFraction < 1 && !holdAttack && gap > 20) held.push("heavyAttack");
    } else if (!holdAttack && isFacingTarget) {
      const isSavingArrows = player.currentAmmo <= player.maxAmmo / 2;
      if (!isTargetAttacking && gap > (isSavingArrows ? 24 : 60) && player.stamina >= 15) {
        pressed.push("heavyAttack");
        held.push("heavyAttack");
      } else pressed.push("attack");
    }
    return;
  }
  if (gap <= weaponReach) {
    if (isFacingTarget) held.length = 0;
    if (!holdAttack) pressed.push("attack");
  } else {
    if (gap < weaponReach + 6 && !holdAttack) pressed.push("attack");
    walk();
  }
}

/** Punteggio semplice di un pezzo d'armatura per il bot: difesa, salute e stamina (la velocità conta poco). */
const armorScore = (item) => {
  const totals = getItemTotals(item);
  return totals.defense * 3 + totals.maxHealth + totals.maxStamina * 0.3 + totals.moveSpeed;
};

/**
 * Bottino di fine livello (E5) per il bot: forziere ed élite (se il livello ne ha), boss; ogni pezzo d'armatura
 * migliore di quello indossato si indossa (il bot di classe scarta quelli di cui non ha la Forza richiesta), l'arma
 * si cambia se esce di rarità più alta.
 */
function collectLoot(level, gear, random, weaponId, difficulty, strength = Infinity) {
  const context = (source) => ({ source, levelId: level.id, difficulty });
  const sources = [...((level.chests ?? []).length > 0 ? ["chest"] : []), ...(level.enemies.some((enemy) => enemy.elite) ? ["elite"] : []), ...(level.hasBoss ? ["boss"] : [])];
  for (const source of sources) {
    const armorPiece = rollLootArmor(context(source), random);
    const slot = ARMOR_CONFIG[armorPiece.baseId].slot;
    if (getItemStrengthRequirement(armorPiece) <= strength && (gear.armor[slot] === null || armorScore(armorPiece) > armorScore(gear.armor[slot]))) gear.armor = { ...gear.armor, [slot]: armorPiece };
    const weapon = rollLootWeapon(weaponId, context(source), random);
    if (RARITY_ORDER.indexOf(weapon.rarity) > RARITY_ORDER.indexOf(gear.weaponItem.rarity)) gear.weaponItem = weapon;
  }
}

/**
 * Spende tutti i punti disponibili negli attributi di build, a turno; quando sono al massimo, il resto va in Vitalità e
 * poi negli altri attributi, così nessun punto resta da spendere.
 */
function spendPoints(attributePoints, character, build) {
  const spend = (attributeId) => attributePoints.spend(attributeId, character.baseAttributes[attributeId]) === "spent";
  let hasSpent = true;
  while (hasSpent) hasSpent = build.map(spend).includes(true);
  for (const attributeId of ["vitality", ...ATTRIBUTE_ORDER]) while (spend(attributeId));
}

/**
 * Partita completa: tutti i livelli di fila, salute che si porta dietro, vite limitate.
 * gearMode: "none" (senza equipaggiamento), "loot" (raccoglie il bottino a fine livello), "max" (tre pezzi d'acciaio
 * Epici e una spada Leggendaria fin dall'inizio: il tetto).
 * build (Classi Fase 4 e 6B): gli attributi in cui spendere i punti di fine livello, a turno un punto ciascuno; quando
 * sono tutti al massimo, il resto va in Vitalità e poi negli altri. null = nessun punto speso.
 */
function playFullRun(dodgeSkill, seed, { character = CHARACTER_CONFIG.knight, useClassBot = false, gearMode = "none", build = null, difficulty = "normal" } = {}) {
  let lives = DIFFICULTY_CONFIG[difficulty].startingLives;
  let health = character.maxHealth;
  const lootRandom = createRandom(seed * 7919);
  const botWeaponId = useClassBot ? character.startingWeaponId : "sword";
  const gear = { armor: { ...EMPTY_ARMOR }, weaponItem: createWeaponItem(botWeaponId) };
  if (gearMode === "max") {
    gear.armor = { helmet: createArmorItem("steelHelmet", "epic", [{ id: "defense", value: 8 }]), chest: createArmorItem("steelChest", "epic", [{ id: "defense", value: 8 }]), boots: createArmorItem("steelBoots", "epic", [{ id: "defense", value: 8 }]) };
    gear.weaponItem = createWeaponItem("sword", "legendary", [{ id: "damage", value: 16 }, { id: "lifeSteal", value: 3 }]);
  }
  // pozioni nella borsa: passano da un livello all'altro; ricominciando un livello tornano a quelle di inizio livello
  let potions = 0;
  const deathsPerLevel = LEVEL_CONFIG.map(() => 0);
  // tentativi persi per tempo scaduto (valgono come una morte): di solito è il bot che si è incastrato
  let timeouts = 0;
  // build (Classi Fase 4): a fine livello i punti attributo vanno tutti nell'attributo indicato (fino al massimo)
  const attributePoints = new AttributePoints();
  // mosse (Classi Fase 5): si parte con quelle iniziali e ogni boss insegna la successiva (i forzieri non si contano)
  let knownAbilities = ABILITY_UNLOCK_CONFIG.startingCount;
  let totalTime = 0;
  let totalHealthLost = 0;
  for (const level of LEVEL_CONFIG) {
    for (;;) {
      const result = playLevel(level.id, { character, useClassBot, difficulty, dodgeSkill, seed: seed * 10 + level.id + deathsPerLevel[level.id - 1] * 100, startHealth: health, startPotions: potions, knownAbilities, armor: gear.armor, weaponItem: gear.weaponItem, spentAttributes: build === null ? null : attributePoints.spent });
      totalTime += result.time;
      totalHealthLost += result.healthLost;
      if (result.outcome === "win") {
        potions = result.potions;
        if (level.hasBoss) knownAbilities++;
        const hasNextLevel = LEVEL_CONFIG.some((other) => other.id === level.id + 1);
        if (gearMode === "loot") collectLoot(level, gear, lootRandom, botWeaponId, difficulty, useClassBot ? character.baseAttributes.strength + attributePoints.spent.strength : Infinity);
        if (build !== null && hasNextLevel) {
          attributePoints.award(AttributePoints.pointsForLevel(level.hasBoss));
          spendPoints(attributePoints, character, build);
        }
        health = Math.min(result.maxHealth, result.health + (hasNextLevel ? GAME_CONFIG.levelCompleteHeal : 0));
        break;
      }
      deathsPerLevel[level.id - 1]++;
      if (result.outcome === "timeout") timeouts++;
      lives--;
      health = Infinity; // salute piena (il massimo con l'equipaggiamento)
      if (lives <= 0) return { won: false, livesLeft: 0, deathsPerLevel, timeouts, totalTime, totalHealthLost };
    }
  }
  return { won: true, livesLeft: lives, deathsPerLevel, timeouts, totalTime, totalHealthLost };
}

const average = (values) => (values.length === 0 ? NaN : values.reduce((a, b) => a + b, 0) / values.length);
const skills = [["rusher (non schiva)", 0], ["medio (schiva a volte)", 0.5]];
const pad = (text, width) => String(text).padEnd(width);

if (isCoreOnly) {
console.log("=== DUELLI (un gruppo di nemici su terreno piano, giocatore a 100 HP) ===");
const duels = {
  "scheletro": [{ type: "skeleton", position: { x: 150, y: 176 } }],
  "goblin": [{ type: "goblin", position: { x: 150, y: 184 } }],
  "soldato": [{ type: "soldier", position: { x: 150, y: 176 } }],
  "2 goblin": [{ type: "goblin", position: { x: 130, y: 184 } }, { type: "goblin", position: { x: 170, y: 184 } }],
  "scheletro+goblin": [{ type: "skeleton", position: { x: 130, y: 176 } }, { type: "goblin", position: { x: 190, y: 184 } }],
  "lupo": [{ type: "wolf", position: { x: 150, y: 188 } }],
  "melma": [{ type: "slime", position: { x: 150, y: 190 } }],
  "arciere": [{ type: "skeletonArcher", position: { x: 200, y: 176 } }],
  "pipistrello": [{ type: "bat", position: { x: 150, y: 120 } }],
  "golem": [{ type: "iceGolem", position: { x: 150, y: 172 } }],
  "predone": [{ type: "raider", position: { x: 200, y: 176 } }],
  "scorpione": [{ type: "scorpion", position: { x: 150, y: 188 } }],
  "avvoltoio": [{ type: "vulture", position: { x: 150, y: 110 } }],
};
for (const [name, enemyOverride] of Object.entries(duels)) {
  const [label, skill] = skills[0];
  const results = Array.from({ length: repetitions }, (_, i) => playLevel(1, { dodgeSkill: skill, seed: i + 1, enemyOverride, stopWhenClear: true, maxSeconds: 40 }));
  console.log(`${pad(name, 17)} ${pad(label, 24)} HP persi ${average(results.map((r) => r.healthLost)).toFixed(1).padStart(5)}   tempo ${average(results.map((r) => r.time)).toFixed(1)}s`);
}

console.log("\n=== BOSS DA SOLO (giocatore a 100 HP, nessun altro nemico, nel livello del boss) ===");
for (const bossLevel of LEVEL_CONFIG.filter((l) => l.hasBoss)) {
  const bossName = BOSS_CATALOG[bossLevel.bossId ?? BOSS_CONFIG.id].name;
  for (const [label, skill] of skills) {
    const results = Array.from({ length: repetitions }, (_, i) => playLevel(bossLevel.id, { dodgeSkill: skill, seed: i + 1, enemyOverride: [], stopWhenClear: true, maxSeconds: 180 }));
    const wins = results.filter((r) => r.outcome === "win").length;
    console.log(`${pad(bossName, 20)} ${pad(label, 24)} vittorie ${((wins / repetitions) * 100).toFixed(0).padStart(3)}%   HP persi ${average(results.map((r) => r.healthLost)).toFixed(0)}   tempo ${average(results.map((r) => r.time)).toFixed(0)}s`);
  }
}

console.log("\n=== LIVELLI (singoli, giocatore a 100 HP) ===");
for (const level of LEVEL_CONFIG) {
  for (const [label, skill] of skills) {
    const results = Array.from({ length: repetitions }, (_, i) => playLevel(level.id, { dodgeSkill: skill, seed: i + 1 }));
    const wins = results.filter((r) => r.outcome === "win");
    console.log(`Livello ${level.id} ${pad(label, 24)} vittorie ${((wins.length / repetitions) * 100).toFixed(0).padStart(3)}%   HP persi ${average(results.map((r) => r.healthLost)).toFixed(0).padStart(3)}   tempo ${average(results.map((r) => r.time)).toFixed(0)}s`);
  }
}

console.log(`\n=== PARTITE COMPLETE (${GAME_CONFIG.startingLives} vite, salute portata da un livello all'altro, +${GAME_CONFIG.levelCompleteHeal} HP a fine livello) ===`);
for (const [label, skill] of skills) {
  const runs = Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1));
  const won = runs.filter((r) => r.won);
  const deaths = LEVEL_CONFIG.map((_, index) => average(runs.map((r) => r.deathsPerLevel[index])).toFixed(2));
  console.log(`${pad(label, 24)} partite vinte ${((won.length / runRepetitions) * 100).toFixed(0).padStart(3)}%   vite rimaste (se vinta) ${average(won.map((r) => r.livesLeft)).toFixed(2)}   morti medie per livello ${deaths.join(" / ")}`);
}
}

if (isEquipmentOnly) {
console.log(`\n=== EQUIPAGGIAMENTO (E5): PARTITE COMPLETE DEL CAVALIERE, SENZA, CON IL BOTTINO DI FINE LIVELLO, AL MASSIMO ===`);
for (const [label, skill] of skills) for (const gearMode of ["none", "loot", "max"]) {
  const runs = Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1, { gearMode }));
  const won = runs.filter((r) => r.won);
  const totalDeaths = average(runs.map((r) => r.deathsPerLevel.reduce((a, b) => a + b, 0)));
  console.log(`${pad(label, 24)} ${pad({ none: "senza", loot: "bottino", max: "massimo" }[gearMode], 8)} partite vinte ${((won.length / runRepetitions) * 100).toFixed(0).padStart(3)}%   vite rimaste (se vinta) ${average(won.map((r) => r.livesLeft)).toFixed(2)}   morti medie ${totalDeaths.toFixed(2)}`);
}

}

if (onlyClassId !== undefined) {
  reportClass(CHARACTER_CONFIG[onlyClassId]);
}

/** Percentuale intera, allineata. */
function percent(value) {
  return `${(value * 100).toFixed(0).padStart(3)}%`;
}

/** Sezione di una classe (Classi Fase 6B): boss, resa di ogni mossa, partite alle tre difficoltà e build. */
function reportClass(character) {
  const bossLevels = LEVEL_CONFIG.filter((l) => l.hasBoss);
  const fightBoss = (levelId, skill, allowedSlots = null) =>
    Array.from({ length: repetitions }, (_, i) => playLevel(levelId, { character, useClassBot: true, allowedSlots, dodgeSkill: skill, seed: i + 1, enemyOverride: [], stopWhenClear: true, maxSeconds: 180 }));
  const winRate = (results) => results.filter((r) => r.outcome === "win").length / results.length;
  // la salute persa si confronta tra classi come frazione della salute massima
  const healthShare = (results) => average(results.map((r) => r.healthLost / r.maxHealth));
  const bossSummary = (results) => `vittorie ${percent(winRate(results))}   salute persa ${percent(healthShare(results))}   tempo ${average(results.map((r) => r.time)).toFixed(0).padStart(3)}s`;
  console.log(`=== CLASSE: ${character.name} (Classi Fase 6B: bot di classe con l'arma iniziale e le sue mosse) ===`);

  if (classParts.includes("boss")) {
    console.log("--- boss da soli, difficoltà normale, tutte le mosse ---");
    for (const bossLevel of bossLevels) {
      const bossName = BOSS_CATALOG[bossLevel.bossId ?? BOSS_CONFIG.id].name;
      for (const [label, skill] of skills) console.log(`${pad(bossName, 20)} ${pad(label, 24)} ${bossSummary(fightBoss(bossLevel.id, skill))}`);
    }
  }

  if (classParts.includes("moves")) {
    console.log("--- una mossa alla volta contro i cinque boss (media, bot medio) ---");
    const lineFor = (name, allowedSlots) => console.log(`${pad(name, 24)} ${bossSummary(bossLevels.flatMap((l) => fightBoss(l.id, skills[1][1], allowedSlots)))}`);
    lineFor("nessuna mossa", []);
    character.abilityIds.forEach((abilityId, index) => lineFor(`solo ${ABILITY_CONFIG[abilityId].name}`, [index]));
    lineFor("tutte", null);
  }

  // l'attributo di classe è quello con la base più alta, Vitalità esclusa perché è già l'altra metà della build
  // standard (per il Berserker la Forza, per il Mago l'Intelligenza...); a parità vince il primo (Cavaliere e Paladino: Forza)
  const mainAttribute = ATTRIBUTE_ORDER.filter((id) => id !== "vitality").reduce((best, id) => (character.baseAttributes[id] > character.baseAttributes[best] ? id : best));
  // build tipica di una persona: un punto all'attributo di classe e uno in Vitalità, a turno
  const standardBuild = [mainAttribute, "vitality"];
  const playRuns = (skill, options) => Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1, { character, useClassBot: true, ...options }));
  const runSummary = (runs) => {
    const won = runs.filter((r) => r.won);
    const totalDeaths = average(runs.map((r) => r.deathsPerLevel.reduce((a, b) => a + b, 0)));
    const deaths = LEVEL_CONFIG.map((_, index) => average(runs.map((r) => r.deathsPerLevel[index])).toFixed(1));
    return `vinte ${percent(won.length / runs.length)}   morti medie ${totalDeaths.toFixed(2)} (${deaths.join(" ")})   blocchi ${average(runs.map((r) => r.timeouts)).toFixed(2)}   tempo ${average(runs.map((r) => r.totalTime)).toFixed(0)}s`;
  };

  if (classParts.includes("runs")) {
    console.log("--- partite complete (vite della difficoltà; punti a turno tra attributo di classe e Vitalità) ---");
    for (const difficulty of DIFFICULTY_ORDER) {
      for (const [label, skill] of skills) for (const gearMode of ["none", "loot"]) {
        console.log(`${pad(DIFFICULTY_CONFIG[difficulty].name, 10)} ${pad(label, 24)} ${pad({ none: "senza", loot: "bottino" }[gearMode], 8)} ${runSummary(playRuns(skill, { difficulty, gearMode, build: standardBuild }))}`);
      }
    }
  }

  if (classParts.includes("builds")) {
    const buildAttributes = [null, ...new Set([mainAttribute, "strength", "vitality"])];
    console.log("--- build: tutti i punti in un attributo (l'eccedenza in Vitalità, poi negli altri), difficoltà difficile, bot medio, senza equipaggiamento ---");
    for (const build of buildAttributes) {
      console.log(`${pad(build === null ? "nessun punto speso" : ATTRIBUTE_CONFIG[build].name, 20)} ${runSummary(playRuns(skills[1][1], { difficulty: "hard", build: build === null ? null : [build] }))}`);
    }
  }
}
