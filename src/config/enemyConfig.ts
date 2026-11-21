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
} as const;

/**
 * Catalogo dei nemici normali. Per aggiungerne uno: nuova voce qui,
 * sprite in rendering/sprites/enemySprites.ts e animazioni in animationConfig.ts.
 * Comportamenti: "patrol" pattuglia una zona, "chase" insegue il giocatore,
 * "guard" resta fermo e attacca chi entra nel raggio.
 */
export const ENEMY_CONFIG: Record<EnemyTypeId, EnemyDefinition> = {
  skeleton: {
    id: "skeleton",
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
 * Per aggiungerne uno: nuova definizione qui, colori in BOSS_SPRITE_STYLES (bossSprites.ts).
 * Gli sprite dei boss hanno tutti la stessa forma (hitbox 24x40): cambiano colori e statistiche.
 */
export const BOSS_CATALOG: Record<string, BossDefinition> = {
  [BOSS_CONFIG.id]: BOSS_CONFIG,
};
