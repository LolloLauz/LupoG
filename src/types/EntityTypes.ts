import type { FacingDirection, Rectangle, Vector2 } from "./GameTypes";

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

/**
 * Modificatori del movimento del giocatore dati dall'ambiente (acqua, ghiaccio). Vedi HazardSystem.
 * Nell'ambiente normale tutti i moltiplicatori valgono 1 e l'aderenza è piena (null).
 */
export interface PlayerEnvironment {
  speedMultiplier: number;
  gravityMultiplier: number;
  maxFallSpeedMultiplier: number;
  jumpMultiplier: number;
  /** Aderenza (1/s) con cui la velocità orizzontale raggiunge quella voluta; null = istantanea. */
  traction: number | null;
  /** Vero in acqua: si può saltare (nuotare) anche senza toccare terra. */
  canSwim: boolean;
}

/** Stati possibili dei nemici. */
export type EnemyState =
  | "idle"
  | "patrol"
  | "chase"
  | "attack"
  | "hurt"
  | "dead";

/**
 * Comportamenti AI disponibili per i nemici.
 * "ranged" tira proiettili da lontano (serve "ranged"); "flyer" vola e attacca in picchiata (serve "flight").
 */
export type EnemyBehavior = "patrol" | "chase" | "guard" | "ranged" | "flyer";

/** Identificatori dei tipi di nemico normale. */
export type EnemyTypeId = "skeleton" | "goblin" | "soldier" | "skeletonArcher" | "bat";

/** Identificatori dei tipi di proiettile (vedi projectileConfig.ts). */
export type ProjectileTypeId = "arrow" | "magicBolt" | "fireball";

/** Attacco a distanza di un nemico: alla fine della preparazione lancia un proiettile invece di colpire davanti a sé. */
export interface RangedAttackDefinition {
  projectileId: ProjectileTypeId;
  /** Altezza (px) da cui parte il proiettile, misurata dalla cima dell'hitbox. */
  launchOffsetY: number;
  /** Se il giocatore è più vicino di così (px tra le hitbox) il nemico indietreggia. */
  retreatDistance: number;
}

/** Volo di un nemico: niente gravità, volteggia e attacca in picchiata. */
export interface FlightDefinition {
  /** Quota (px) a cui si tiene sopra la testa del giocatore mentre lo segue. */
  hoverHeight: number;
  /** Velocità (px/s) della picchiata (la fase attiva dell'attacco). */
  diveSpeed: number;
  /** Ampiezza (px) e periodo (ms) dell'oscillazione verticale in volo. */
  bobAmplitude: number;
  bobPeriodMs: number;
}

/** Configurazione di un tipo di proiettile. Il danno lo decide chi lo lancia. */
export interface ProjectileDefinition {
  id: ProjectileTypeId;
  name: string;
  /** Velocità (px/s). */
  speed: number;
  /** Frazione della gravità applicata (0 = traiettoria dritta). */
  gravityScale: number;
  /** Durata massima in volo (ms). */
  lifetimeMs: number;
  hitbox: { width: number; height: number };
  /** Vero se la spada del giocatore può distruggerlo in volo. */
  isDeflectable: boolean;
  /** Frame dell'animazione (id degli sprite) e durata di ciascuno. */
  frameIds: string[];
  frameDurationMs: number;
}

/** Richiesta di lancio di un proiettile (da un nemico o da un boss al motore). */
export interface ProjectileLaunch {
  projectileId: ProjectileTypeId;
  /** Centro del proiettile alla partenza (coordinate del mondo). */
  origin: Vector2;
  /** Direzione (vettore di lunghezza 1). */
  direction: Vector2;
  damage: number;
}

/** Richiesta di evocazione di un nemico (da un boss al motore). */
export interface SummonRequest {
  enemyType: EnemyTypeId;
  /** Angolo in alto a sinistra dell'hitbox del nemico evocato. */
  position: Vector2;
}

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
  /** Solo per il comportamento "ranged". */
  ranged?: RangedAttackDefinition;
  /** Solo per il comportamento "flyer". */
  flight?: FlightDefinition;
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

/** Tipi di attacco di un boss. */
export type BossAttackKind = "melee" | "charge" | "projectile" | "summon";

/**
 * Parte comune di ogni attacco di un boss: tre fasi (preparazione ben visibile, fase attiva,
 * recupero). Le animazioni dipendono dal tipo (BOSS_ATTACK_ANIMATIONS in animationConfig.ts).
 */
interface BossAttackBase {
  /** Identificatore, usato nei pesi delle fasi (attackWeights). */
  id: string;
  kind: BossAttackKind;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
}

/** Colpo d'arma davanti a sé, a portata "range" (px dal bordo dell'hitbox). */
export interface BossMeleeAttackDefinition extends BossAttackBase {
  kind: "melee";
  damage: number;
  range: number;
}

/** Scatto in avanti per activeMs: tutto il corpo ferisce; si ferma contro i muri. Solo da almeno minDistance. */
export interface BossChargeAttackDefinition extends BossAttackBase {
  kind: "charge";
  damage: number;
  speed: number;
  minDistance: number;
}

/** Ventaglio di proiettili mirati al giocatore, lanciati all'inizio della fase attiva. Solo da almeno minDistance. */
export interface BossProjectileAttackDefinition extends BossAttackBase {
  kind: "projectile";
  damage: number;
  projectileId: ProjectileTypeId;
  /** Numero di proiettili e apertura totale del ventaglio (gradi). */
  count: number;
  spreadDegrees: number;
  /** Punto di lancio rispetto al boss rivolto a destra (dall'angolo in alto a sinistra dell'hitbox). */
  launchOffset: Vector2;
  minDistance: number;
}

/** Evoca nemici accanto a sé, senza superare maxAlive evocati vivi contemporaneamente. */
export interface BossSummonAttackDefinition extends BossAttackBase {
  kind: "summon";
  enemyType: EnemyTypeId;
  count: number;
  maxAlive: number;
  /** Distanza orizzontale (px) dal boss a cui compaiono gli evocati. */
  spawnDistance: number;
}

export type BossAttackDefinition =
  | BossMeleeAttackDefinition
  | BossChargeAttackDefinition
  | BossProjectileAttackDefinition
  | BossSummonAttackDefinition;

/** Fase di un combattimento contro il boss: si attiva quando la salute scende sotto la soglia. */
export interface BossPhaseDefinition {
  /** La fase è attiva quando la salute (in %) è minore o uguale a questo valore. */
  healthPercentThreshold: number;
  speedMultiplier: number;
  /** Moltiplicatore della pausa tra un attacco e l'altro (< 1 = più aggressivo). */
  cooldownMultiplier: number;
  /**
   * Peso di ogni attacco (id -> peso) nel sorteggio del prossimo attacco: la probabilità è
   * peso / somma dei pesi. Un attacco assente o con peso 0 non viene scelto in questa fase.
   */
  attackWeights: Record<string, number>;
}

/** Configurazione di un boss. */
export interface BossDefinition {
  id: string;
  name: string;
  maxHealth: number;
  movementSpeed: number;
  /** Distanza orizzontale (px) entro cui il boss si risveglia. */
  activationRange: number;
  /**
   * Attacchi disponibili, al massimo uno per tipo. L'ordine conta nel sorteggio: i pesi si
   * sommano nell'ordine di questo elenco.
   */
  attacks: BossAttackDefinition[];
  attackCooldownMs: number;
  hitFlashMs: number;
  deathDurationMs: number;
  scoreReward: number;
  hitbox: Rectangle;
  /** Fasi in ordine di soglia decrescente (la prima ha soglia 100). */
  phases: BossPhaseDefinition[];
}
