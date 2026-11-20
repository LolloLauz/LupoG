import type { AnimationDefinition } from "../rendering/AnimationManager";
import type { BossDefinition, EnemyTypeId } from "../types/EntityTypes";
import { BOSS_CATALOG, ENEMY_CONFIG } from "./enemyConfig";
import { ATTACK_DEFINITIONS } from "./playerConfig";

/** Animazione di attacco: la durata dei frame segue la durata dell'attacco. */
function createAttackAnimation(attackId: string, frameIds: string[]): AnimationDefinition {
  const attack = ATTACK_DEFINITIONS[attackId];
  if (attack === undefined) {
    throw new Error(`Attacco non definito: ${attackId}`);
  }
  return { frameIds, frameDurationMs: attack.durationMs / frameIds.length, loop: false };
}

/**
 * Animazioni del cavaliere: nome -> elenco di sprite e durata di ogni frame.
 * Gli id degli sprite sono registrati in rendering/sprites/knightSprites.ts.
 * Le animazioni di attacco usano il nome indicato in ATTACK_DEFINITIONS.
 */
export const PLAYER_ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: { frameIds: ["knightIdle1", "knightIdle2"], frameDurationMs: 500, loop: true },
  walk: {
    frameIds: ["knightWalk1", "knightWalk2", "knightWalk3", "knightWalk2"],
    frameDurationMs: 120,
    loop: true,
  },
  jump: { frameIds: ["knightJump"], frameDurationMs: 100, loop: true },
  fall: { frameIds: ["knightFall"], frameDurationMs: 100, loop: true },
  hurt: { frameIds: ["knightHurt"], frameDurationMs: 100, loop: true },
  dodge: { frameIds: ["knightDodge1", "knightDodge2"], frameDurationMs: 100, loop: true },
  dead: { frameIds: ["knightDeadFall", "knightDeadLie"], frameDurationMs: 300, loop: false },
  attack1: createAttackAnimation("swordLight1", ["knightAttack1A", "knightAttack1B", "knightAttack1C"]),
  attack2: createAttackAnimation("swordLight2", ["knightAttack2A", "knightAttack2B", "knightAttack2C"]),
  attack3: createAttackAnimation("swordLight3", [
    "knightAttack3A",
    "knightAttack3B",
    "knightAttack3C",
    "knightAttack3D",
  ]),
  attackHeavy: createAttackAnimation("swordHeavy", [
    "knightHeavyA",
    "knightHeavyB",
    "knightHeavyC",
    "knightHeavyD",
  ]),
};

/**
 * Animazioni dei nemici (stessi nomi per tutti: idle, walk, attack, hurt, dead).
 * L'attacco dura windupMs + activeMs + recoveryMs: un frame per fase.
 */
function createEnemyAnimations(enemyId: EnemyTypeId): Record<string, AnimationDefinition> {
  const definition = ENEMY_CONFIG[enemyId];
  return {
    idle: { frameIds: [`${enemyId}Idle1`, `${enemyId}Idle2`], frameDurationMs: 600, loop: true },
    walk: {
      frameIds: [`${enemyId}Walk1`, `${enemyId}Walk2`, `${enemyId}Walk3`, `${enemyId}Walk2`],
      frameDurationMs: 180,
      loop: true,
    },
    attack: {
      frameIds: [`${enemyId}AttackA`, `${enemyId}AttackB`, `${enemyId}AttackC`],
      frameDurationMs: 100,
      frameDurationsMs: [definition.attackWindupMs, definition.attackActiveMs, definition.attackRecoveryMs],
      loop: false,
    },
    hurt: { frameIds: [`${enemyId}Hurt`], frameDurationMs: 100, loop: true },
    dead: { frameIds: [`${enemyId}Hurt`, `${enemyId}Heap`], frameDurationMs: 250, loop: false },
  };
}

export const ENEMY_ANIMATIONS: Record<EnemyTypeId, Record<string, AnimationDefinition>> = {
  skeleton: createEnemyAnimations("skeleton"),
  goblin: createEnemyAnimations("goblin"),
  soldier: createEnemyAnimations("soldier"),
};

/**
 * Animazioni di un boss. I frame hanno il nome "<idBoss>Idle1", "<idBoss>Slash..." ecc.
 * Le durate di fendente e carica seguono la definizione del boss.
 */
function createBossAnimations(definition: BossDefinition): Record<string, AnimationDefinition> {
  const id = definition.id;
  return {
    idle: { frameIds: [`${id}Idle1`, `${id}Idle2`], frameDurationMs: 600, loop: true },
    walk: { frameIds: [`${id}Walk1`, `${id}Walk2`, `${id}Walk3`, `${id}Walk2`], frameDurationMs: 200, loop: true },
    slash: {
      frameIds: [`${id}SlashA`, `${id}SlashB`, `${id}SlashC`],
      frameDurationMs: 100,
      frameDurationsMs: [definition.slashWindupMs, definition.slashActiveMs, definition.slashRecoveryMs],
      loop: false,
    },
    chargeWindup: { frameIds: [`${id}ChargeWindup`], frameDurationMs: 100, loop: true },
    charging: { frameIds: [`${id}ChargeDash`], frameDurationMs: 100, loop: true },
    recovery: { frameIds: [`${id}Hurt`], frameDurationMs: 100, loop: true },
    dead: { frameIds: [`${id}Hurt`, `${id}Heap`], frameDurationMs: 400, loop: false },
  };
}

/** Animazioni di tutti i boss del catalogo, indicizzate per id del boss. */
export const BOSS_ANIMATIONS: Record<string, Record<string, AnimationDefinition>> = Object.fromEntries(
  Object.values(BOSS_CATALOG).map((definition) => [definition.id, createBossAnimations(definition)])
);
