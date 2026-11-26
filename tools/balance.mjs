/**
 * Simulatore di bilanciamento (solo per sviluppatori, non fa parte del gioco).
 *
 * Usa le classi reali del gioco (Player, Enemy, Boss, CollisionSystem, CombatSystem...)
 * in un mondo senza grafica e le fa giocare a un "bot", per misurare quanto sono
 * difficili nemici, livelli e boss dopo aver modificato i valori in src/config/.
 *
 * Uso:   npm run balance            (report completo, circa 1 minuto)
 *        npm run balance -- --quick (meno ripetizioni, più veloce e meno preciso)
 *        npm run balance -- --characters (solo le partite complete di ogni personaggio, Fase 4)
 *        npm run balance -- --equipment  (solo le partite complete con e senza equipaggiamento, piano E1-E6)
 *        npm run balance -- --mage       (solo il Mago, Classi Fase 2)
 *        npm run balance -- --build      (solo le build di attributi del Cavaliere, Classi Fase 4)
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

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = mkdtempSync(join(tmpdir(), "iron-balance-"));
const isQuick = process.argv.includes("--quick");
const isCharactersOnly = process.argv.includes("--characters");
const isEquipmentOnly = process.argv.includes("--equipment");
const isMageOnly = process.argv.includes("--mage");
const isBuildOnly = process.argv.includes("--build");
const repetitions = isQuick ? 15 : 40;
const runRepetitions = isQuick ? 20 : 60;

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
const { LevelManager } = await loadModule("systems/LevelManager");
const { ProjectileSystem } = await loadModule("systems/ProjectileSystem");
const { HazardSystem } = await loadModule("systems/HazardSystem");
const { LEVEL_CONFIG } = await loadModule("config/levelConfig");
const { ENEMY_CONFIG, BOSS_CONFIG, BOSS_CATALOG } = await loadModule("config/enemyConfig");
const { GAME_CONFIG } = await loadModule("config/gameConfig");
const { Inventory } = await loadModule("systems/Inventory");
const { ITEM_CONFIG } = await loadModule("config/itemConfig");
const { CHARACTER_CONFIG, CHARACTER_ORDER } = await loadModule("config/characterConfig");
const { WEAPON_CONFIG } = await loadModule("config/weaponConfig");
const { rollLootArmor, rollLootWeapon } = await loadModule("systems/LootSystem");
const { getItemTotals, EMPTY_ARMOR } = await loadModule("systems/EquipmentStats");
const { createArmorItem, createWeaponItem } = await loadModule("systems/ItemFactory");
const { ARMOR_CONFIG } = await loadModule("config/armorConfig");
const { RARITY_ORDER } = await loadModule("config/rarityConfig");
const { AttributePoints } = await loadModule("systems/AttributePoints");

const collisionSystem = new CollisionSystem();
const combatSystem = new CombatSystem();
const enemyAISystem = new EnemyAISystem();
const hazardSystem = new HazardSystem();
const FRAME = 1 / 60;
/** Il giocatore colpisce al massimo a questa distanza (px) dal bordo del nemico. */
const PLAYER_REACH = 16;

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
  // character: le statistiche del personaggio (il bot usa sempre la spada, quindi misura solo quelle)
  // useAbility: il bot usa anche l'abilità del personaggio (tasto L; lo scudo al posto della schivata)
  // armor, weaponItem: equipaggiamento (piano E1-E6): armature indossate e l'arma con la sua rarità
  // il Mago (Classi Fase 2) ha un bot suo: bastone e incantesimi (7 dardo, 8 nova, 9 balzo, 0 barriera)
  // spentAttributes (Classi Fase 4): punti attributo spesi sopra la base della classe (null = nessuno)
  const { character = CHARACTER_CONFIG.knight, useAbility = false, dodgeSkill = 0, seed = 1, startHealth = character.maxHealth, startPotions = 0, maxSeconds = 240, enemyOverride = null, stopWhenClear = false, armor = EMPTY_ARMOR, weaponItem = null, spentAttributes = null } = options;
  const level = LEVEL_CONFIG.find((candidate) => candidate.id === levelId);
  const random = createRandom(seed);
  // come nel gioco: piattaforme (anche mobili e cancello dell'arena), pericoli, proiettili
  const levelManager = new LevelManager();
  levelManager.loadLevel(levelId);
  const hazards = level.hazards ?? [];
  const projectileSystem = new ProjectileSystem();
  let platforms = levelManager.platforms;
  const player = new Player(level.playerStart.x, level.playerStart.y, character);
  player.setArmor(armor);
  if (spentAttributes !== null) player.setSpentAttributes(spentAttributes);
  const isMage = character.id === "mage";
  if (weaponItem !== null) player.equipWeapon(WEAPON_CONFIG[weaponItem.baseId], null, weaponItem);
  else if (isMage) player.equipWeapon(WEAPON_CONFIG.staff);
  player.currentHealth = Math.min(player.maxHealth, startHealth);
  // come nel gioco: nemici d'élite compresi
  const enemies = (enemyOverride ?? level.enemies).map(
    (spawn) => new Enemy(ENEMY_CONFIG[spawn.type], spawn.position.x, spawn.position.y, undefined, { elite: spawn.elite, weaponDrop: spawn.weaponDrop })
  );
  // la borsa: le pozioni si raccolgono (E) e si bevono quando la salute scende (il bot usa solo la spada)
  const inventory = new Inventory();
  for (let index = 0; index < startPotions; index++) inventory.addPotion();
  const potionHeal = ITEM_CONFIG.healthPotion.healAmount;
  const bossDefinition = level.hasBoss ? BOSS_CATALOG[level.bossId ?? BOSS_CONFIG.id] : null;
  const boss = bossDefinition !== null ? new Boss(bossDefinition, level.bossSpawn.x, level.bossSpawn.y, createRandom(seed + 999)) : null;
  const itemManager = new ItemManager();
  itemManager.loadItems(level.items);
  const scoreManager = new ScoreManager();
  const goalX = level.completion.kind === "reachExit" ? level.completion.exitX : null;
  const attackStartTimes = new Map();
  const dodgeDecisions = new Map();
  let isArenaLocked = false;
  let healthLost = 0;

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
      if (isMage) {
        playMageTurn({ player, nearest, boss, direction, gap, wantsToDodge, attackElapsedMs, windupMs, held, pressed, dodgeDecisions, isSolidWallAhead, isGroundAt });
      } else {
      const ability = player.ability;
      const isAbilityReady = player.isAbilityReady;
      // scudo (paladino): al posto della schivata lo alza poco prima del colpo e lo tiene finché l'attacco dura
      const wantsToGuard = useAbility && ability.kind === "guard" && wantsToDodge && attackElapsedMs >= windupMs - 150;
      if (wantsToGuard && (player.isGuarding || isAbilityReady)) {
        held.length = 0;
        held.push("ability1");
        if (!player.isGuarding) pressed.push("ability1");
      }
      // abilità d'attacco: appena il bersaglio è a portata e l'abilità è pronta
      if (useAbility && ability.kind === "attack" && isAbilityReady && gap <= PLAYER_REACH && player.isOnGround && !player.activeAttack) {
        pressed.push("ability1");
      }
      // schiva poco prima del colpo; smette di attaccare in tempo per essere libero
      if (!wantsToGuard && wantsToDodge && attackElapsedMs >= windupMs - 100 && attackElapsedMs <= windupMs - 30 && player.isOnGround && !player.activeAttack) {
        pressed.push("dodge");
        dodgeDecisions.set(nearest, false);
      }
      const holdAttack = wantsToDodge && attackElapsedMs >= windupMs - 520;
      if (wantsToGuard) {
        // con lo scudo alzato non attacca
      } else if (gap <= PLAYER_REACH) {
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

    const input = { isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false };
    const healthBefore = player.currentHealth;
    levelManager.updateMovingPlatforms(time * 1000, [player, ...enemies.filter((enemy) => !enemy.isFlying)]);
    player.environment = hazardSystem.computePlayerEnvironment(player, hazards);
    player.update(FRAME, input, collisionSystem, platforms, level.width);
    // i proiettili del giocatore entrano in gioco solo per il Mago (gli altri bot usano la spada; così i loro numeri non cambiano)
    if (isMage) player.drainProjectileLaunches().forEach((launch) => projectileSystem.spawn(launch));
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
      enemy.update(FRAME, collisionSystem, platforms, level.width);
      enemy.drainProjectileLaunches().forEach((launch) => projectileSystem.spawn(launch));
      for (const split of enemy.drainSplitRequests()) children.push(new Enemy(ENEMY_CONFIG[split.enemyType], split.position.x, split.position.y));
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
    combatSystem.processEnemyAttacks(enemies, player);
    if (boss !== null) {
      const minions = enemies.filter((enemy) => enemy.isSummoned && enemy.isAlive).length;
      boss.update(FRAME, player, collisionSystem, platforms, level.width, minions);
      separateBodies();
      combatSystem.processBossAttack(boss, player);
      boss.drainProjectileLaunches().forEach((launch) => projectileSystem.spawn(launch));
      for (const summon of boss.drainSummonRequests()) {
        const minion = new Enemy(ENEMY_CONFIG[summon.enemyType], summon.position.x, summon.position.y);
        minion.isSummoned = true;
        enemies.push(minion);
      }
    }
    projectileSystem.update(FRAME, player, platforms, level.width, level.height, isMage ? [...enemies, ...(boss !== null ? [boss] : [])] : []);
    itemManager.update(FRAME);
    itemManager.collectItems(player, scoreManager);
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
  return { outcome: "timeout", time: maxSeconds, healthLost, health: player.currentHealth, potions: inventory.potionCount };
}

/**
 * Bot del Mago (Classi Fase 2): barriera (0) contro i colpi dei boss, balzo arcano (9) o schivata al momento del colpo,
 * nova di gelo (8) quando il bersaglio è vicino, dardo di fuoco (7) appena è a tiro; per il resto colpisce con il
 * bastone (che ridà mana). Come gli altri bot non bada al mana: un incantesimo senza mana semplicemente non parte.
 */
function playMageTurn({ player, nearest, boss, direction, gap, wantsToDodge, attackElapsedMs, windupMs, held, pressed, dodgeDecisions, isSolidWallAhead, isGroundAt }) {
  const slots = player.abilitySlots;
  const isFree = player.isOnGround && !player.activeAttack && !player.isGuarding;
  const isFacingTarget = (direction > 0) === (player.facingDirection === "right");
  const wantsBarrier = nearest === boss && wantsToDodge && attackElapsedMs >= windupMs - 150;
  if (wantsBarrier && (player.isGuarding || slots[3].isReady)) {
    held.length = 0;
    held.push("ability4");
    if (!player.isGuarding) pressed.push("ability4");
    return;
  }
  const isDodgeMoment = wantsToDodge && attackElapsedMs >= windupMs - 100 && attackElapsedMs <= windupMs - 30 && isFree;
  if (isDodgeMoment) {
    pressed.push(slots[2].isReady && isFacingTarget ? "ability3" : "dodge");
    dodgeDecisions.set(nearest, false);
  } else if (isFree && isFacingTarget && gap <= 30 && slots[1].isReady) {
    pressed.push("ability2");
  } else if (isFree && isFacingTarget && gap > PLAYER_REACH && slots[0].isReady) {
    pressed.push("ability1");
  }
  const holdAttack = wantsToDodge && attackElapsedMs >= windupMs - 520;
  if (gap <= PLAYER_REACH) {
    if (isFacingTarget) held.length = 0;
    if (!holdAttack) pressed.push("attack");
  } else {
    if (gap < PLAYER_REACH + 6 && !holdAttack) pressed.push("attack");
    const aheadX = direction > 0 ? player.positionX + player.width + 10 : player.positionX - 10;
    const edgeX = direction > 0 ? player.positionX + player.width + 6 : player.positionX - 6;
    if (player.isOnGround && (isSolidWallAhead(aheadX) || !isGroundAt(edgeX)) && !player.activeAttack) pressed.push("jump");
  }
}

/** Punteggio semplice di un pezzo d'armatura per il bot: difesa, salute e stamina (la velocità conta poco). */
const armorScore = (item) => {
  const totals = getItemTotals(item);
  return totals.defense * 3 + totals.maxHealth + totals.maxStamina * 0.3 + totals.moveSpeed;
};

/**
 * Bottino di fine livello (E5) per il bot: forziere ed élite (se il livello ne ha), boss; ogni pezzo d'armatura
 * migliore di quello indossato si indossa, la spada si cambia se esce di rarità più alta.
 */
function collectLoot(level, gear, random, weaponId = "sword") {
  const context = (source) => ({ source, levelId: level.id, difficulty: "normal" });
  const sources = [...((level.chests ?? []).length > 0 ? ["chest"] : []), ...(level.enemies.some((enemy) => enemy.elite) ? ["elite"] : []), ...(level.hasBoss ? ["boss"] : [])];
  for (const source of sources) {
    const armorPiece = rollLootArmor(context(source), random);
    const slot = ARMOR_CONFIG[armorPiece.baseId].slot;
    if (gear.armor[slot] === null || armorScore(armorPiece) > armorScore(gear.armor[slot])) gear.armor = { ...gear.armor, [slot]: armorPiece };
    const weapon = rollLootWeapon(weaponId, context(source), random);
    if (RARITY_ORDER.indexOf(weapon.rarity) > RARITY_ORDER.indexOf(gear.weaponItem.rarity)) gear.weaponItem = weapon;
  }
}

/**
 * Partita completa: tutti i livelli di fila, salute che si porta dietro, vite limitate.
 * gearMode: "none" (senza equipaggiamento), "loot" (raccoglie il bottino a fine livello), "max" (tre pezzi d'acciaio
 * Epici e una spada Leggendaria fin dall'inizio: il tetto).
 */
function playFullRun(dodgeSkill, seed, character = CHARACTER_CONFIG.knight, useAbility = false, gearMode = "none", build = null) {
  let lives = GAME_CONFIG.startingLives;
  let health = character.maxHealth;
  const lootRandom = createRandom(seed * 7919);
  // tutti con la spada, tranne il Mago (bastone)
  const botWeaponId = character.id === "mage" ? "staff" : "sword";
  const gear = { armor: { ...EMPTY_ARMOR }, weaponItem: createWeaponItem(botWeaponId) };
  if (gearMode === "max") {
    gear.armor = { helmet: createArmorItem("steelHelmet", "epic", [{ id: "defense", value: 8 }]), chest: createArmorItem("steelChest", "epic", [{ id: "defense", value: 8 }]), boots: createArmorItem("steelBoots", "epic", [{ id: "defense", value: 8 }]) };
    gear.weaponItem = createWeaponItem("sword", "legendary", [{ id: "damage", value: 16 }, { id: "lifeSteal", value: 3 }]);
  }
  // pozioni nella borsa: passano da un livello all'altro; ricominciando un livello tornano a quelle di inizio livello
  let potions = 0;
  const deathsPerLevel = LEVEL_CONFIG.map(() => 0);
  // build (Classi Fase 4): a fine livello i punti attributo vanno tutti nell'attributo indicato (fino al massimo)
  const attributePoints = new AttributePoints();
  let totalTime = 0;
  let totalHealthLost = 0;
  for (const level of LEVEL_CONFIG) {
    for (;;) {
      const result = playLevel(level.id, { character, useAbility, dodgeSkill, seed: seed * 10 + level.id + deathsPerLevel[level.id - 1] * 100, startHealth: health, startPotions: potions, armor: gear.armor, weaponItem: gear.weaponItem, spentAttributes: build === null ? null : attributePoints.spent });
      totalTime += result.time;
      totalHealthLost += result.healthLost;
      if (result.outcome === "win") {
        potions = result.potions;
        const hasNextLevel = LEVEL_CONFIG.some((other) => other.id === level.id + 1);
        if (gearMode === "loot") collectLoot(level, gear, lootRandom, botWeaponId);
        if (build !== null && hasNextLevel) {
          attributePoints.award(AttributePoints.pointsForLevel(level.hasBoss));
          while (attributePoints.spend(build, character.baseAttributes[build]) === "spent");
        }
        health = Math.min(result.maxHealth, result.health + (hasNextLevel ? GAME_CONFIG.levelCompleteHeal : 0));
        break;
      }
      deathsPerLevel[level.id - 1]++;
      lives--;
      health = Infinity; // salute piena (il massimo con l'equipaggiamento)
      if (lives <= 0) return { won: false, livesLeft: 0, deathsPerLevel, totalTime, totalHealthLost };
    }
  }
  return { won: true, livesLeft: lives, deathsPerLevel, totalTime, totalHealthLost };
}

const average = (values) => (values.length === 0 ? NaN : values.reduce((a, b) => a + b, 0) / values.length);
const skills = [["rusher (non schiva)", 0], ["medio (schiva a volte)", 0.5]];
const pad = (text, width) => String(text).padEnd(width);

if (!isCharactersOnly && !isEquipmentOnly && !isMageOnly && !isBuildOnly) {
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

if (!isMageOnly && !isBuildOnly) {
console.log(`\n=== EQUIPAGGIAMENTO (E5): PARTITE COMPLETE DEL CAVALIERE, SENZA, CON IL BOTTINO DI FINE LIVELLO, AL MASSIMO ===`);
for (const [label, skill] of skills) for (const gearMode of ["none", "loot", "max"]) {
  const runs = Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1, CHARACTER_CONFIG.knight, false, gearMode));
  const won = runs.filter((r) => r.won);
  const totalDeaths = average(runs.map((r) => r.deathsPerLevel.reduce((a, b) => a + b, 0)));
  console.log(`${pad(label, 24)} ${pad({ none: "senza", loot: "bottino", max: "massimo" }[gearMode], 8)} partite vinte ${((won.length / runRepetitions) * 100).toFixed(0).padStart(3)}%   vite rimaste (se vinta) ${average(won.map((r) => r.livesLeft)).toFixed(2)}   morti medie ${totalDeaths.toFixed(2)}`);
}

}

if (!isEquipmentOnly && !isMageOnly && !isBuildOnly) {
console.log(`\n=== PERSONAGGI: PARTITE COMPLETE (tutti con la spada: si misurano salute, velocità, danno, difesa, schivata, stamina, cura; con e senza l'abilità L) ===`);
// il Mago ha la sua sezione (bastone e incantesimi)
for (const characterId of CHARACTER_ORDER.filter((id) => id !== "mage")) {
  const character = CHARACTER_CONFIG[characterId];
  for (const [label, skill] of skills) for (const useAbility of [false, true]) {
    const runs = Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1, character, useAbility));
    const won = runs.filter((r) => r.won);
    const totalDeaths = average(runs.map((r) => r.deathsPerLevel.reduce((a, b) => a + b, 0)));
    console.log(`${pad(character.name, 10)} ${pad(label, 24)} ${useAbility ? "con abilità  " : "senza abilità"} partite vinte ${((won.length / runRepetitions) * 100).toFixed(0).padStart(3)}%   vite rimaste (se vinta) ${average(won.map((r) => r.livesLeft)).toFixed(2)}   morti medie ${totalDeaths.toFixed(2)}`);
  }
}
}
if (!isEquipmentOnly && !isBuildOnly) {
const mage = CHARACTER_CONFIG.mage;
console.log(`\n=== MAGO (Classi Fase 2): BASTONE E INCANTESIMI (7 dardo, 8 nova, 9 balzo, 0 barriera contro i boss) ===`);
for (const bossLevel of LEVEL_CONFIG.filter((l) => l.hasBoss)) {
  const bossName = BOSS_CATALOG[bossLevel.bossId ?? BOSS_CONFIG.id].name;
  for (const [label, skill] of skills) {
    const results = Array.from({ length: repetitions }, (_, i) => playLevel(bossLevel.id, { character: mage, dodgeSkill: skill, seed: i + 1, enemyOverride: [], stopWhenClear: true, maxSeconds: 180 }));
    const wins = results.filter((r) => r.outcome === "win").length;
    console.log(`MAGO contro ${pad(bossName, 20)} ${pad(label, 24)} vittorie ${((wins / repetitions) * 100).toFixed(0).padStart(3)}%   HP persi ${average(results.map((r) => r.healthLost)).toFixed(0)}   tempo ${average(results.map((r) => r.time)).toFixed(0)}s`);
  }
}
for (const [label, skill] of skills) for (const gearMode of ["none", "loot"]) {
  const runs = Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1, mage, true, gearMode));
  const won = runs.filter((r) => r.won);
  const totalDeaths = average(runs.map((r) => r.deathsPerLevel.reduce((a, b) => a + b, 0)));
  const deaths = LEVEL_CONFIG.map((_, index) => average(runs.map((r) => r.deathsPerLevel[index])).toFixed(2));
  console.log(`MAGO ${pad(label, 24)} ${pad({ none: "senza", loot: "bottino" }[gearMode], 8)} partite vinte ${((won.length / runRepetitions) * 100).toFixed(0).padStart(3)}%   vite rimaste (se vinta) ${average(won.map((r) => r.livesLeft)).toFixed(2)}   morti medie ${totalDeaths.toFixed(2)} (${deaths.join(" / ")})`);
}
}
if (!isCharactersOnly && !isEquipmentOnly && !isMageOnly) {
console.log(`\n=== BUILD (Classi Fase 4): PARTITE COMPLETE DEL CAVALIERE CON L'ONDA D'URTO, TUTTI I PUNTI IN UN ATTRIBUTO ===`);
for (const [label, skill] of skills) for (const build of [null, "strength", "intelligence", "vitality"]) {
  const runs = Array.from({ length: runRepetitions }, (_, i) => playFullRun(skill, i + 1, CHARACTER_CONFIG.knight, true, "none", build));
  const won = runs.filter((r) => r.won);
  const totalDeaths = average(runs.map((r) => r.deathsPerLevel.reduce((a, b) => a + b, 0)));
  const buildName = { strength: "forza", intelligence: "intelligenza", vitality: "vitalità" }[build] ?? "nessuna";
  console.log(`${pad(label, 24)} ${pad(buildName, 13)} partite vinte ${((won.length / runRepetitions) * 100).toFixed(0).padStart(3)}%   vite rimaste (se vinta) ${average(won.map((r) => r.livesLeft)).toFixed(2)}   morti medie ${totalDeaths.toFixed(2)}   tempo ${average(runs.map((r) => r.totalTime)).toFixed(0)}s   HP persi ${average(runs.map((r) => r.totalHealthLost)).toFixed(0)}`);
}
}
console.log("\n(rusher = attacca sempre; il risultato indica la direzione, non il valore esatto per una persona.)");
