import type { FacingDirection, Rectangle } from "./GameTypes";

/** Stati possibili del protagonista (corrispondono alle animazioni). */
export type PlayerState =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "fall"
  | "attack"
  | "hurt"
  | "dodge"
  | "dead";

/** Stati possibili dei nemici. */
export type EnemyState =
  | "idle"
  | "patrol"
  | "chase"
  | "attack"
  | "hurt"
  | "dead";

/** Comportamenti AI disponibili per i nemici. */
export type EnemyBehavior = "patrol" | "chase" | "guard";

/** Identificatori dei tipi di nemico normale. */
export type EnemyTypeId = "skeleton" | "goblin" | "soldier";

/** Configurazione di un tipo di nemico (vedi enemyConfig.ts). */
export interface EnemyDefinition {
  id: EnemyTypeId;
  name: string;
  maxHealth: number;
  attackDamage: number;
  movementSpeed: number;
  detectionRange: number;
  attackRange: number;
  /** Pausa tra la fine di un attacco e l'inizio del successivo (ms). */
  attackCooldownMs: number;
  /** Fasi dell'attacco (ms): preparazione (windup), colpo attivo, recupero. */
  attackWindupMs: number;
  attackActiveMs: number;
  attackRecoveryMs: number;
  hurtDurationMs: number;
  knockbackSpeed: number;
  /**
   * Un colpo subito interrompe l'attacco del nemico solo nei primi ms della preparazione.
   * Dopo il nemico completa l'attacco (subisce il danno ma non vacilla). 0 = mai interrompibile.
   */
  attackInterruptWindowMs: number;
  /** Distanza (px) dal punto di partenza entro cui pattuglia (usata dal comportamento "patrol"). */
  patrolDistance: number;
  behavior: EnemyBehavior;
  scoreReward: number;
  hitbox: Rectangle;
}

/** Definizione di un attacco (spada, combo...). */
export interface AttackDefinition {
  id: string;
  damage: number;
  /** Durata totale dell'attacco (windup + colpo + chiusura). */
  durationMs: number;
  /** Il colpo è attivo (può ferire) tra hitStartMs e hitEndMs dall'inizio dell'attacco. */
  hitStartMs: number;
  hitEndMs: number;
  /** Pausa dopo la fine dell'attacco prima di poterne iniziare un altro. */
  cooldownMs: number;
  /** Area colpita, relativa al personaggio che guarda a destra. */
  hitbox: Rectangle;
  animation: string;
}

/** Sequenza statica di attacchi concatenati. */
export interface ComboDefinition {
  id: string;
  /** Azioni da premere in sequenza, es. ["attack","attack","attack"]. */
  inputSequence: string[];
  /** Id degli attacchi eseguiti, nello stesso ordine. */
  attackIds: string[];
  /** Tempo massimo (ms) tra un colpo e il successivo. */
  comboWindowMs: number;
}

/** Qualsiasi cosa possa essere colpita dagli attacchi (nemici, boss, bersagli di prova). */
export interface Damageable {
  readonly isAlive: boolean;
  getBounds(): Rectangle;
  /** Chiamata dal CombatSystem quando l'attacco va a segno. */
  receiveHit(damage: number, hitDirection: FacingDirection): void;
}

/** Fase di un combattimento contro il boss: si attiva quando la salute scende sotto la soglia. */
export interface BossPhaseDefinition {
  /** La fase è attiva quando la salute (in %) è minore o uguale a questo valore. */
  healthPercentThreshold: number;
  speedMultiplier: number;
  /** Moltiplicatore della pausa tra un attacco e l'altro (< 1 = più aggressivo). */
  cooldownMultiplier: number;
  /** Probabilità (0-1) che il prossimo attacco sia la carica invece del fendente. */
  chargeChance: number;
}

/** Configurazione di un boss. */
export interface BossDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movementSpeed: number;
  /** Distanza orizzontale (px) entro cui il boss si risveglia. */
  activationRange: number;
  slashDamage: number;
  slashRange: number;
  slashWindupMs: number;
  slashActiveMs: number;
  slashRecoveryMs: number;
  chargeDamage: number;
  chargeSpeed: number;
  chargeMinDistance: number;
  chargeWindupMs: number;
  chargeDurationMs: number;
  chargeRecoveryMs: number;
  attackCooldownMs: number;
  hitFlashMs: number;
  deathDurationMs: number;
  scoreReward: number;
  hitbox: Rectangle;
  /** Fasi in ordine di soglia decrescente (la prima ha soglia 100). */
  phases: BossPhaseDefinition[];
}
