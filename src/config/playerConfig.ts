import type { AttackDefinition, AttackInputAction, ComboDefinition } from "../types/EntityTypes";

/** Statistiche base del cavaliere. Modificare qui per cambiare il bilanciamento. */
export const PLAYER_CONFIG = {
  maxHealth: 100,
  /** Velocità orizzontale in pixel/secondo. */
  movementSpeed: 80,
  /** Velocità iniziale del salto (pixel/secondo verso l'alto). */
  jumpForce: 310,
  lightAttackDamage: 15,
  heavyAttackDamage: 30,
  /** Invulnerabilità dopo un colpo subito (ms). */
  invulnerabilityDurationMs: 1000,
  dodgeDurationMs: 300,
  dodgeCooldownMs: 700,
  dodgeSpeed: 160,
  /** Dimensioni dell'hitbox del corpo (pixel). */
  hitboxWidth: 12,
  hitboxHeight: 24,
  /** Altezza dell'hitbox quando il cavaliere è accovacciato (i piedi restano a terra). */
  crouchHitboxHeight: 16,
  /**
   * Dimensioni dello sprite a riposo (16 bit): più largo e più alto dell'hitbox per pennacchio,
   * scudo e spada. Solo informative: l'allineamento usa l'ancora registrata con ogni sprite.
   */
  spriteWidth: 24,
  spriteHeight: 30,
  /** Rilasciando il salto in salita la velocità verso l'alto viene moltiplicata per questo valore (salto variabile). */
  jumpCutMultiplier: 0.5,
  /** Si può ancora saltare per questo tempo (ms) dopo essere usciti da una piattaforma. */
  coyoteTimeMs: 80,
  /** Un salto premuto poco prima di toccare terra viene eseguito all'atterraggio (ms). */
  jumpBufferMs: 100,
  /** Durata dello stordimento dopo un colpo subito (ms) e rinculo. */
  hurtDurationMs: 350,
  knockbackSpeedX: 90,
  knockbackSpeedY: 120,
  /** Il rinculo si ferma se oltre il bordo non c'è terreno entro questa profondità (px): non si viene spinti negli abissi. */
  knockbackLedgeCheckDepth: 48,
  /**
   * Un attacco premuto negli ultimi attackBufferMs prima di poter partire viene memorizzato (ms).
   * Premuto prima, viene ignorato; memorizzato, scade comunque dopo questo tempo.
   */
  attackBufferMs: 200,
  /** Tempo (ms) tra la morte e la perdita della vita (ricomincia il livello o Game Over). */
  deathDurationMs: 1500,
  /** Stamina (Fase 5) consumata da ogni attacco pesante (K), anche dal tiro caricato e dalla picchiata. */
  heavyAttackStaminaCost: 15,
  /** Dopo aver consumato stamina, il recupero riparte dopo questo tempo (ms). */
  staminaRegenDelayMs: 600,
  /** Mana (Classi Fase 0): dopo averlo consumato, il recupero riparte dopo questo tempo (ms). Da bilanciare con il Mago. */
  manaRegenDelayMs: 600,
} as const;

/** Definizione degli attacchi della spada (usata dal sistema di combattimento). */
export const ATTACK_DEFINITIONS: Record<string, AttackDefinition> = {
  swordLight1: {
    id: "swordLight1",
    damage: PLAYER_CONFIG.lightAttackDamage,
    durationMs: 250,
    hitStartMs: 80,
    hitEndMs: 170,
    cooldownMs: 100,
    hitbox: { x: 8, y: 6, width: 20, height: 12 },
    animation: "attack1",
  },
  swordLight2: {
    id: "swordLight2",
    damage: PLAYER_CONFIG.lightAttackDamage,
    durationMs: 250,
    hitStartMs: 80,
    hitEndMs: 170,
    cooldownMs: 100,
    hitbox: { x: 8, y: 8, width: 20, height: 12 },
    animation: "attack2",
  },
  swordLight3: {
    id: "swordLight3",
    damage: PLAYER_CONFIG.lightAttackDamage * 2,
    durationMs: 350,
    hitStartMs: 120,
    hitEndMs: 250,
    cooldownMs: 400,
    hitbox: { x: 8, y: 2, width: 22, height: 20 },
    animation: "attack3",
  },
  swordHeavy: {
    id: "swordHeavy",
    damage: PLAYER_CONFIG.heavyAttackDamage,
    durationMs: 500,
    hitStartMs: 220,
    hitEndMs: 360,
    cooldownMs: 500,
    hitbox: { x: 6, y: 0, width: 24, height: 24 },
    animation: "attackHeavy",
  },
};

/** Attacco usato quando un input non corrisponde a nessuna combo. */
export const DEFAULT_ATTACK_BY_INPUT: Record<AttackInputAction, string> = {
  attack: "swordLight1",
  heavyAttack: "swordHeavy",
};

/** Combo statiche predefinite. */
export const COMBO_DEFINITIONS: ComboDefinition[] = [
  {
    id: "tripleSlash",
    name: "TRIPLO FENDENTE",
    inputSequence: ["attack", "attack", "attack"],
    attackIds: ["swordLight1", "swordLight2", "swordLight3"],
    comboWindowMs: 400,
  },
];
