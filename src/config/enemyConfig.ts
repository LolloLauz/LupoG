import type { BossDefinition, EnemyDefinition, EnemyTypeId } from "../types/EntityTypes";

/** Parametri comuni dell'intelligenza artificiale dei nemici. */
export const ENEMY_AI_CONFIG = {
  /** Il giocatore è "visibile" solo se la differenza di altezza è entro questo valore (px). */
  verticalDetectionTolerance: 40,
  /** Chi insegue smette quando il giocatore supera detectionRange x questo valore. */
  loseInterestMultiplier: 1.5,
  /** Chi pattuglia cammina a movementSpeed x questo valore. */
  patrolSpeedMultiplier: 0.6,
  /** Tempo (ms) tra la morte e la scomparsa del nemico. */
  deathDurationMs: 700,
  /** Stordimento (ms) di un nemico corazzato colpito dalla mazza (anche se di norma non si stordisce). */
  armorCrushStunMs: 600,
  /** Nemici d'élite: moltiplicatori di salute, danno e punti rispetto al nemico normale. */
  eliteHealthMultiplier: 2,
  eliteDamageMultiplier: 1.3,
  eliteScoreMultiplier: 3,
} as const;

/**
 * Catalogo dei nemici normali. Per aggiungerne uno: nuova voce qui,
 * sprite in rendering/sprites/enemySprites.ts e animazioni in animationConfig.ts.
 * Comportamenti: "patrol" pattuglia una zona, "chase" insegue il giocatore,
 * "guard" resta fermo e attacca chi entra nel raggio.
 */
/*
 * Resistenze agli elementi (Fase 7, elementModifiers): 0 = immune, < 1 resiste, > 1 debole. Le ossa non si avvelenano e
 * bruciano bene; le melme non hanno sangue ma gelano; il metallo dei soldati conduce il fulmine; il golem di ghiaccio teme il fuoco.
 */
export const ENEMY_CONFIG: Record<EnemyTypeId, EnemyDefinition> = {
  skeleton: {
    id: "skeleton",
    elementModifiers: { poison: 0, fire: 1.5 },
    name: "Scheletro Guerriero",
    maxHealth: 40,
    attackDamage: 10,
    movementSpeed: 30,
    detectionRange: 80,
    attackRange: 20,
    attackCooldownMs: 1200,
    attackWindupMs: 400,
    attackActiveMs: 150,
    attackRecoveryMs: 300,
    hurtDurationMs: 300,
    knockbackSpeed: 60,
    attackInterruptWindowMs: 150,
    patrolDistance: 60,
    behavior: "patrol",
    scoreReward: 100,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
  },
  goblin: {
    id: "goblin",
    elementModifiers: { poison: 1.5 },
    name: "Goblin",
    maxHealth: 25,
    attackDamage: 8,
    movementSpeed: 55,
    detectionRange: 110,
    attackRange: 18,
    attackCooldownMs: 900,
    attackWindupMs: 200,
    attackActiveMs: 120,
    attackRecoveryMs: 200,
    hurtDurationMs: 250,
    knockbackSpeed: 80,
    attackInterruptWindowMs: 0,
    patrolDistance: 0,
    behavior: "chase",
    scoreReward: 75,
    hitbox: { x: 0, y: 0, width: 12, height: 16 },
  },
  soldier: {
    id: "soldier",
    elementModifiers: { shock: 1.5, poison: 0.5 },
    name: "Soldato Nemico",
    maxHealth: 60,
    attackDamage: 15,
    movementSpeed: 25,
    detectionRange: 70,
    attackRange: 24,
    attackCooldownMs: 1500,
    attackWindupMs: 600,
    attackActiveMs: 200,
    attackRecoveryMs: 400,
    hurtDurationMs: 200,
    knockbackSpeed: 40,
    attackInterruptWindowMs: 0,
    patrolDistance: 0,
    behavior: "guard",
    scoreReward: 150,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
  },
  skeletonArcher: {
    id: "skeletonArcher",
    elementModifiers: { poison: 0, fire: 1.5 },
    name: "Arciere Scheletro",
    maxHealth: 30,
    attackDamage: 10,
    movementSpeed: 30,
    detectionRange: 150,
    attackRange: 130,
    attackCooldownMs: 1800,
    // la preparazione (arco teso) è lunga e ben visibile; colpirlo in quel momento annulla il tiro
    attackWindupMs: 600,
    attackActiveMs: 100,
    attackRecoveryMs: 400,
    hurtDurationMs: 300,
    knockbackSpeed: 60,
    attackInterruptWindowMs: 600,
    patrolDistance: 0,
    behavior: "ranged",
    scoreReward: 125,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
    ranged: { projectileId: "arrow", launchOffsetY: 11, retreatDistance: 36 },
  },
  bat: {
    id: "bat",
    elementModifiers: { shock: 1.5, frost: 1.5 },
    name: "Pipistrello",
    maxHealth: 15,
    attackDamage: 8,
    movementSpeed: 50,
    detectionRange: 120,
    // a questa distanza (tra i centri) si prepara alla picchiata
    attackRange: 70,
    attackCooldownMs: 1400,
    attackWindupMs: 350,
    attackActiveMs: 500,
    attackRecoveryMs: 500,
    hurtDurationMs: 250,
    knockbackSpeed: 90,
    attackInterruptWindowMs: 350,
    patrolDistance: 30,
    behavior: "flyer",
    scoreReward: 80,
    hitbox: { x: 0, y: 0, width: 12, height: 10 },
    flight: { hoverHeight: 26, diveSpeed: 150, bobAmplitude: 4, bobPeriodMs: 900 },
  },
  wolf: {
    id: "wolf",
    elementModifiers: { fire: 1.5, frost: 0.5 },
    name: "Lupo",
    maxHealth: 30,
    attackDamage: 9,
    movementSpeed: 70,
    detectionRange: 130,
    // a questa distanza si acquatta e balza in avanti
    attackRange: 34,
    attackCooldownMs: 1300,
    attackWindupMs: 350,
    attackActiveMs: 250,
    attackRecoveryMs: 350,
    hurtDurationMs: 250,
    knockbackSpeed: 90,
    attackInterruptWindowMs: 350,
    patrolDistance: 0,
    behavior: "chase",
    scoreReward: 100,
    hitbox: { x: 0, y: 0, width: 18, height: 12 },
    lunge: { speed: 150 },
  },
  slime: {
    id: "slime",
    elementModifiers: { poison: 0, frost: 1.5 },
    name: "Melma della Palude",
    attackElement: "poison",
    maxHealth: 36,
    attackDamage: 8,
    movementSpeed: 18,
    detectionRange: 90,
    attackRange: 12,
    attackCooldownMs: 1400,
    attackWindupMs: 500,
    attackActiveMs: 200,
    attackRecoveryMs: 300,
    hurtDurationMs: 250,
    knockbackSpeed: 50,
    attackInterruptWindowMs: 500,
    patrolDistance: 30,
    behavior: "patrol",
    scoreReward: 60,
    hitbox: { x: 0, y: 0, width: 14, height: 10 },
    splitInto: { enemyType: "slimeSmall", count: 2 },
  },
  slimeSmall: {
    id: "slimeSmall",
    elementModifiers: { poison: 0, frost: 1.5 },
    name: "Melmina",
    attackElement: "poison",
    maxHealth: 10,
    attackDamage: 5,
    movementSpeed: 40,
    detectionRange: 100,
    attackRange: 10,
    attackCooldownMs: 1100,
    attackWindupMs: 350,
    attackActiveMs: 150,
    attackRecoveryMs: 250,
    hurtDurationMs: 200,
    knockbackSpeed: 70,
    attackInterruptWindowMs: 350,
    patrolDistance: 0,
    behavior: "chase",
    scoreReward: 25,
    hitbox: { x: 0, y: 0, width: 10, height: 7 },
  },
  // --- Fase 8: Lande Desolate ---
  raider: {
    id: "raider",
    elementModifiers: { poison: 1.5, fire: 0.5 },
    name: "Predone",
    maxHealth: 30,
    attackDamage: 9,
    movementSpeed: 45,
    detectionRange: 150,
    attackRange: 110,
    attackCooldownMs: 2100,
    // carica il lancio dietro la spalla: colpirlo in quel momento annulla il tiro
    attackWindupMs: 500,
    attackActiveMs: 100,
    attackRecoveryMs: 400,
    hurtDurationMs: 300,
    knockbackSpeed: 70,
    attackInterruptWindowMs: 500,
    patrolDistance: 0,
    behavior: "ranged",
    scoreReward: 130,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
    // lancia accette rotanti; se ti avvicini troppo indietreggia
    ranged: { projectileId: "hatchet", launchOffsetY: 9, retreatDistance: 30 },
  },
  scorpion: {
    id: "scorpion",
    elementModifiers: { poison: 0, frost: 1.5 },
    name: "Scorpione Gigante",
    attackElement: "poison",
    maxHealth: 45,
    attackDamage: 10,
    movementSpeed: 40,
    detectionRange: 120,
    // a questa distanza alza la coda e scatta in avanti con il pungiglione
    attackRange: 30,
    attackCooldownMs: 1500,
    attackWindupMs: 450,
    attackActiveMs: 250,
    attackRecoveryMs: 450,
    hurtDurationMs: 250,
    knockbackSpeed: 50,
    attackInterruptWindowMs: 200,
    patrolDistance: 0,
    behavior: "chase",
    scoreReward: 140,
    hitbox: { x: 0, y: 0, width: 20, height: 12 },
    lunge: { speed: 120 },
    // corazza (carapace): gli attacchi deboli fanno metà danno, la mazza la spezza
    armor: { damageMultiplier: 0.5, breakDamage: 25 },
  },
  vulture: {
    id: "vulture",
    elementModifiers: { fire: 1.5, shock: 1.5 },
    name: "Avvoltoio",
    maxHealth: 24,
    attackDamage: 8,
    movementSpeed: 55,
    detectionRange: 140,
    attackRange: 80,
    attackCooldownMs: 2000,
    attackWindupMs: 450,
    attackActiveMs: 550,
    attackRecoveryMs: 500,
    hurtDurationMs: 250,
    knockbackSpeed: 80,
    attackInterruptWindowMs: 450,
    patrolDistance: 40,
    behavior: "flyer",
    scoreReward: 120,
    hitbox: { x: 0, y: 0, width: 14, height: 12 },
    // vola più alto del pipistrello e si getta in picchiata più veloce
    flight: { hoverHeight: 34, diveSpeed: 160, bobAmplitude: 3, bobPeriodMs: 1300 },
  },
  iceGolem: {
    id: "iceGolem",
    elementModifiers: { frost: 0, poison: 0, fire: 2, shock: 0.5 },
    name: "Golem di Ghiaccio",
    attackElement: "frost",
    maxHealth: 70,
    attackDamage: 15,
    movementSpeed: 16,
    detectionRange: 80,
    attackRange: 26,
    attackCooldownMs: 1800,
    // preparazione lunghissima e ben visibile: è il momento di colpirlo con l'attacco pesante o di allontanarsi
    attackWindupMs: 800,
    attackActiveMs: 200,
    attackRecoveryMs: 600,
    hurtDurationMs: 0,
    knockbackSpeed: 0,
    attackInterruptWindowMs: 0,
    patrolDistance: 40,
    behavior: "patrol",
    scoreReward: 250,
    hitbox: { x: 0, y: 0, width: 16, height: 28 },
    armor: { damageMultiplier: 0.5, breakDamage: 30 },
  },
};

/**
 * Boss principale: il Cavaliere Nero.
 * Attacchi: fendente (vicino) e carica (da lontano, con preparazione ben visibile).
 * Fasi: sotto il 50% di salute diventa più veloce e carica più spesso.
 * Gli attacchi sono dati (vedi BossAttackDefinition): per aggiungere un attacco a un boss basta
 * una voce in "attacks" e il suo peso nelle fasi. La carica è elencata per prima: nel sorteggio i
 * pesi si sommano nell'ordine dell'elenco.
 */
export const BOSS_CONFIG: BossDefinition = {
  id: "blackKnight",
  name: "CAVALIERE NERO",
  elementModifiers: { shock: 1.5, poison: 0.5 },
  weaponReward: "mace",
  maxHealth: 290,
  movementSpeed: 40,
  activationRange: 220,
  attacks: [
    { id: "charge", kind: "charge", damage: 16, speed: 170, minDistance: 70, windupMs: 700, activeMs: 600, recoveryMs: 700 },
    { id: "slash", kind: "melee", damage: 20, range: 34, windupMs: 600, activeMs: 200, recoveryMs: 400 },
  ],
  attackCooldownMs: 1500,
  hitFlashMs: 100,
  deathDurationMs: 1500,
  scoreReward: 1000,
  hitbox: { x: 0, y: 0, width: 24, height: 40 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { charge: 0.3, slash: 0.7 } },
    { healthPercentThreshold: 50, speedMultiplier: 1.3, cooldownMultiplier: 0.75, attackWeights: { charge: 0.6, slash: 0.4 } },
  ],
};

/**
 * Catalogo di tutti i boss, indicizzato per id. Un livello sceglie il boss con "bossId".
 * Per aggiungerne uno: nuova definizione qui, colori in BOSS_SPRITE_STYLES e forma in BOSS_SPRITE_SHAPES
 * (bossSprites.ts). La forma decide la hitbox: "knight", "witch" e "sorcerer" 24x40, "beast" 40x24.
 */
/**
 * Strega della Palude (livello 4): tiene le distanze con ventagli di dardi magici, evoca melme
 * e, se ti avvicini, colpisce con il bastone. Nella seconda fase lancia più spesso.
 */
export const SWAMP_WITCH_CONFIG: BossDefinition = {
  id: "swampWitch",
  name: "STREGA DELLA PALUDE",
  elementModifiers: { poison: 0, fire: 1.5 },
  weaponReward: "axe",
  maxHealth: 300,
  movementSpeed: 30,
  activationRange: 220,
  attacks: [
    { id: "hex", kind: "projectile", damage: 10, projectileId: "magicBolt", count: 3, spreadDegrees: 36, launchOffset: { x: 30, y: 6 }, minDistance: 40, windupMs: 700, activeMs: 200, recoveryMs: 500 },
    { id: "brood", kind: "summon", enemyType: "slimeSmall", count: 2, maxAlive: 2, spawnDistance: 28, windupMs: 800, activeMs: 200, recoveryMs: 500 },
    { id: "staff", kind: "melee", damage: 14, range: 26, windupMs: 550, activeMs: 200, recoveryMs: 450 },
  ],
  attackCooldownMs: 1400,
  hitFlashMs: 100,
  deathDurationMs: 1500,
  scoreReward: 1200,
  hitbox: { x: 0, y: 0, width: 24, height: 40 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { hex: 0.45, brood: 0.2, staff: 0.35 } },
    { healthPercentThreshold: 50, speedMultiplier: 1.2, cooldownMultiplier: 0.8, attackWeights: { hex: 0.55, brood: 0.2, staff: 0.25 } },
  ],
};

/**
 * Re dei Lupi (livello 5): una belva enorme che balza da lontano, morde da vicino e chiama il branco.
 * Hitbox larga e bassa (forma "beast" degli sprite).
 */
export const WOLF_KING_CONFIG: BossDefinition = {
  id: "wolfKing",
  name: "RE DEI LUPI",
  elementModifiers: { fire: 1.5, frost: 0.5 },
  weaponReward: "spear",
  maxHealth: 300,
  movementSpeed: 55,
  activationRange: 220,
  attacks: [
    { id: "pounce", kind: "charge", damage: 18, speed: 210, minDistance: 60, windupMs: 650, activeMs: 450, recoveryMs: 700 },
    { id: "pack", kind: "summon", enemyType: "wolf", count: 2, maxAlive: 2, spawnDistance: 40, windupMs: 900, activeMs: 200, recoveryMs: 500 },
    { id: "bite", kind: "melee", damage: 16, range: 22, windupMs: 450, activeMs: 150, recoveryMs: 400 },
  ],
  attackCooldownMs: 1300,
  hitFlashMs: 100,
  deathDurationMs: 1500,
  scoreReward: 1400,
  hitbox: { x: 0, y: 0, width: 40, height: 24 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { pounce: 0.4, pack: 0.1, bite: 0.5 } },
    { healthPercentThreshold: 50, speedMultiplier: 1.25, cooldownMultiplier: 0.8, attackWeights: { pounce: 0.5, pack: 0.2, bite: 0.3 } },
  ],
};

/**
 * Signore dell'Ombra (livello 7, boss finale): tre fasi. Spada d'ombra, scatto, ventaglio di palle di
 * fuoco (non si deviano: vanno schivate) e, dalla seconda fase, pipistrelli evocati.
 */
export const SHADOW_LORD_CONFIG: BossDefinition = {
  id: "shadowLord",
  name: "SIGNORE DELL'OMBRA",
  elementModifiers: { fire: 0.5, poison: 0.5, frost: 0.5, shock: 0.5 },
  maxHealth: 340,
  movementSpeed: 42,
  activationRange: 230,
  attacks: [
    { id: "shadowDash", kind: "charge", damage: 16, speed: 200, minDistance: 70, windupMs: 700, activeMs: 550, recoveryMs: 700 },
    { id: "hellfire", kind: "projectile", damage: 10, projectileId: "fireball", count: 3, spreadDegrees: 30, launchOffset: { x: 30, y: 6 }, minDistance: 50, windupMs: 750, activeMs: 200, recoveryMs: 500 },
    { id: "nightwings", kind: "summon", enemyType: "bat", count: 2, maxAlive: 2, spawnDistance: 36, windupMs: 900, activeMs: 200, recoveryMs: 500 },
    { id: "shadowBlade", kind: "melee", damage: 20, range: 36, windupMs: 600, activeMs: 200, recoveryMs: 400 },
  ],
  attackCooldownMs: 1400,
  hitFlashMs: 100,
  deathDurationMs: 2000,
  scoreReward: 2500,
  hitbox: { x: 0, y: 0, width: 24, height: 40 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { shadowDash: 0.2, hellfire: 0.3, shadowBlade: 0.5 } },
    { healthPercentThreshold: 66, speedMultiplier: 1.15, cooldownMultiplier: 0.85, attackWeights: { shadowDash: 0.2, hellfire: 0.3, nightwings: 0.15, shadowBlade: 0.35 } },
    { healthPercentThreshold: 33, speedMultiplier: 1.35, cooldownMultiplier: 0.7, attackWeights: { shadowDash: 0.25, hellfire: 0.3, nightwings: 0.15, shadowBlade: 0.3 } },
  ],
};

/**
 * Signore delle Lande (livello 6, Fase 8): capo dei predoni. Lancia accette a ventaglio, carica, chiama i predoni
 * e colpisce con lo spadone; nella seconda fase è più rapido e lancia più spesso.
 */
export const LANDS_LORD_CONFIG: BossDefinition = {
  id: "landsLord",
  name: "SIGNORE DELLE LANDE",
  elementModifiers: { frost: 1.5, fire: 0.5 },
  weaponReward: "crossbow",
  maxHealth: 320,
  movementSpeed: 45,
  activationRange: 220,
  attacks: [
    { id: "axes", kind: "projectile", damage: 11, projectileId: "hatchet", count: 3, spreadDegrees: 30, launchOffset: { x: 28, y: 8 }, minDistance: 50, windupMs: 650, activeMs: 200, recoveryMs: 500 },
    { id: "charge", kind: "charge", damage: 18, speed: 200, minDistance: 70, windupMs: 650, activeMs: 550, recoveryMs: 650 },
    { id: "raiders", kind: "summon", enemyType: "raider", count: 1, maxAlive: 2, spawnDistance: 36, windupMs: 900, activeMs: 200, recoveryMs: 500 },
    { id: "cleave", kind: "melee", damage: 20, range: 32, windupMs: 550, activeMs: 200, recoveryMs: 450 },
  ],
  attackCooldownMs: 1400,
  hitFlashMs: 100,
  deathDurationMs: 1500,
  scoreReward: 1800,
  hitbox: { x: 0, y: 0, width: 24, height: 40 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { axes: 0.3, charge: 0.25, raiders: 0.1, cleave: 0.35 } },
    { healthPercentThreshold: 50, speedMultiplier: 1.25, cooldownMultiplier: 0.8, attackWeights: { axes: 0.4, charge: 0.25, raiders: 0.1, cleave: 0.25 } },
  ],
};

export const BOSS_CATALOG: Record<string, BossDefinition> = {
  [BOSS_CONFIG.id]: BOSS_CONFIG,
  [SWAMP_WITCH_CONFIG.id]: SWAMP_WITCH_CONFIG,
  [WOLF_KING_CONFIG.id]: WOLF_KING_CONFIG,
  [LANDS_LORD_CONFIG.id]: LANDS_LORD_CONFIG,
  [SHADOW_LORD_CONFIG.id]: SHADOW_LORD_CONFIG,
};
