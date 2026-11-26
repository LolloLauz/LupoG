import type { AnimationDefinition } from "../rendering/AnimationManager";
import type { BossAttackKind, BossDefinition, EnemyTypeId } from "../types/EntityTypes";
import { BOSS_CATALOG, ENEMY_CONFIG } from "./enemyConfig";
import { getAbilityAttacks } from "./abilityConfig";
import { getAllWeaponAttacks } from "./weaponConfig";

/** Animazione di attacco (anche delle abilità): la durata dei frame segue la durata dell'attacco. */
function createAttackAnimation(attackId: string, frameIds: string[]): AnimationDefinition {
  const attack = getAllWeaponAttacks()[attackId] ?? getAbilityAttacks()[attackId];
  if (attack === undefined) {
    throw new Error(`Attacco non definito: ${attackId}`);
  }
  return { frameIds, frameDurationMs: attack.durationMs / frameIds.length, loop: false };
}

/** Pose d'attacco della spada riusate dalle altre armi. */
const SLASH_DOWN_FRAMES = ["knightAttack1A", "knightAttack1B", "knightAttack1C"];
const SLASH_UP_FRAMES = ["knightAttack2A", "knightAttack2B", "knightAttack2C"];
const FINISHER_FRAMES = ["knightAttack3A", "knightAttack3B", "knightAttack3C", "knightAttack3D"];
const HEAVY_FRAMES = ["knightHeavyA", "knightHeavyB", "knightHeavyC", "knightHeavyD"];
/** Armi a distanza: mira e rinculo (arco, balestra), braccio indietro e avanti (lanci). */
const AIM_FRAMES = ["knightAimA", "knightAimB"];
const THROW_FRAMES = ["knightThrowA", "knightThrowB"];

/**
 * Colpo in picchiata: l'arma si alza per un attimo (1 frame su 15, circa 67 ms), poi punta in basso
 * per tutta la discesa (la durata dell'attacco è quella massima: di solito si tocca terra prima).
 */
const PLUNGE_FRAMES = ["knightPlungeA", ...Array<string>(14).fill("knightPlungeB")];

/** Un'animazione per ogni attacco indicato, con lo stesso nome dell'attacco. */
function weaponAttackAnimations(framesByAttackId: Record<string, string[]>): Record<string, AnimationDefinition> {
  const animations: Record<string, AnimationDefinition> = {};
  for (const [attackId, frameIds] of Object.entries(framesByAttackId)) {
    animations[attackId] = createAttackAnimation(attackId, frameIds);
  }
  return animations;
}

/**
 * Animazioni del cavaliere: nome -> elenco di sprite e durata di ogni frame.
 * Gli id degli sprite sono registrati in rendering/sprites/knightSprites.ts.
 * Le animazioni di attacco usano il nome indicato negli attacchi delle armi (WEAPON_CONFIG).
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
  crouch: { frameIds: ["knightCrouch"], frameDurationMs: 100, loop: true },
  // scudo alzato (abilità del Paladino): il cavaliere si raccoglie dietro lo scudo, come nella schivata
  guard: { frameIds: ["knightDodge1"], frameDurationMs: 100, loop: true },
  // Mosse delle classi (Fase 5, Classi Fase 2 e 5; pose dedicate dalla Classi Fase 6A): pose comuni a tutte le armi.
  // Gli effetti di ogni mossa (anelli, lampi, sagome) sono in abilityVisualConfig.ts.
  ...weaponAttackAnimations({
    // Cavaliere
    abilityShockwave: ["knightAbilityRaise", "knightAbilityRaise", "knightAbilityKneel", "knightAbilityKneel", "knightAbilityKneel"],
    abilityLunge: ["knightAbilityDraw", "knightAbilityThrust", "knightAbilityThrust", "knightAbilityThrust"],
    abilityShieldBash: ["knightDodge1", "knightAbilityBash", "knightAbilityBash"],
    abilityFlameBlade: ["knightAbilityWindup", "knightAbilityWindup", "knightAbilitySlam", "knightAbilitySlam"],
    // Ranger
    abilityBackstepShot: ["knightDodge1", "knightDodge2", "knightAbilityDraw"],
    abilityPoisonArrow: ["knightAbilityDraw", "knightAbilityDraw", "knightAbilityThrust"],
    abilityFrostArrow: ["knightAbilityDraw", "knightAbilityDraw", "knightAbilityThrust"],
    abilityFireArrow: ["knightAbilityDraw", "knightAbilityDraw", "knightAbilityThrust"],
    // Berserker
    abilityFuriousCharge: ["knightAbilityWindup", "knightAbilityBash", "knightAbilityBash", "knightAbilityBash", "knightAbilitySlam"],
    abilityHotAxe: ["knightAbilityWindup", "knightAbilityWindup", "knightAbilitySlam", "knightAbilitySlam"],
    abilityEarthquake: ["knightAbilityRaise", "knightAbilityRaise", "knightAbilityKneel", "knightAbilityKneel", "knightAbilityKneel"],
    abilityBloodStrike: ["knightAbilityWindup", "knightAbilityWindup", "knightAbilityWindup", "knightAbilitySlam", "knightAbilitySlam"],
    // Paladino
    abilityHolyHammer: ["knightAbilityRaise", "knightAbilityRaise", "knightAbilitySlam", "knightAbilitySlam"],
    abilityConsecration: ["knightAbilityRaise", "knightAbilityRaise", "knightAbilityKneel", "knightAbilityKneel", "knightAbilityKneel"],
    abilityFrozenJudgement: ["knightAbilityRaise", "knightAbilityRaise", "knightAbilityKneel", "knightAbilityKneel", "knightAbilityKneel"],
    // Mago: il bastone si alza, poi si tende verso il bersaglio; la nova pianta il bastone a terra
    abilityFirebolt: ["knightAbilityRaise", "knightAbilityCast", "knightAbilityCast"],
    abilityFrostNova: ["knightAbilityRaise", "knightAbilityRaise", "knightAbilityKneel", "knightAbilityKneel", "knightAbilityKneel"],
    abilityArcaneLeap: ["knightDodge1", "knightDodge2", "knightDodge2"],
  }),
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
  // --- armi della Fase 1: l'id dell'attacco è anche il nome dell'animazione ---
  // Pugnale, ascia e mazza riusano le pose della spada (disegnate con la propria arma, vedi
  // WEAPON_VISUALS in knightSprites.ts); la lancia ha pose proprie (affondi).
  ...weaponAttackAnimations({
    daggerStab1: SLASH_DOWN_FRAMES,
    daggerStab2: SLASH_UP_FRAMES,
    daggerFinisher: FINISHER_FRAMES,
    daggerLunge: HEAVY_FRAMES,
    spearThrust1: ["knightSpearThrustA", "knightSpearThrustB", "knightSpearThrustC"],
    spearThrust2: ["knightSpearThrustA", "knightSpearThrustB", "knightSpearThrustC"],
    spearSweep: ["knightSpearSweepA", "knightSpearSweepB", "knightSpearSweepC", "knightSpearSweepD"],
    spearHeavy: ["knightSpearChargeA", "knightSpearChargeB", "knightSpearLunge", "knightSpearThrustC"],
    axeChop1: SLASH_DOWN_FRAMES,
    axeChop2: SLASH_UP_FRAMES,
    axeHeavy: HEAVY_FRAMES,
    maceSwing1: SLASH_DOWN_FRAMES,
    maceSwing2: SLASH_UP_FRAMES,
    maceSmash: FINISHER_FRAMES,
    maceHeavy: HEAVY_FRAMES,
    // Fase 3: finali delle combo miste e colpi in picchiata
    swordRising: SLASH_UP_FRAMES,
    daggerPiercer: HEAVY_FRAMES,
    spearDragon: ["knightSpearChargeA", "knightSpearChargeB", "knightSpearLunge", "knightSpearThrustC"],
    axeSkullSplitter: HEAVY_FRAMES,
    maceQuake: HEAVY_FRAMES,
    swordPlunge: PLUNGE_FRAMES,
    daggerPlunge: PLUNGE_FRAMES,
    spearPlunge: PLUNGE_FRAMES,
    // spadone (E3): le pose della spada, disegnate con la lama lunga in frame più larghi
    greatswordSlash1: SLASH_DOWN_FRAMES,
    greatswordSlash2: SLASH_UP_FRAMES,
    greatswordHeavy: HEAVY_FRAMES,
    greatswordWhirl: FINISHER_FRAMES,
    greatswordPlunge: PLUNGE_FRAMES,
    axePlunge: PLUNGE_FRAMES,
    macePlunge: PLUNGE_FRAMES,
    // bastone (Classi Fase 2): pose della spada
    staffStrike1: SLASH_DOWN_FRAMES,
    staffStrike2: SLASH_UP_FRAMES,
    staffSpin: FINISHER_FRAMES,
    staffHeavy: HEAVY_FRAMES,
    staffSweep: HEAVY_FRAMES,
    staffPlunge: PLUNGE_FRAMES,
    // Fase 2: armi a distanza (mira e rinculo, lancio da dietro la testa)
    bowShot: AIM_FRAMES,
    bowCharge: ["knightAimA"],
    bowChargedShot: ["knightAimB"],
    crossbowShot: AIM_FRAMES,
    knifeThrow: THROW_FRAMES,
    knifeThrowLow: THROW_FRAMES,
    javelinThrow: THROW_FRAMES,
  }),
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
  skeletonArcher: createEnemyAnimations("skeletonArcher"),
  bat: createEnemyAnimations("bat"),
  wolf: createEnemyAnimations("wolf"),
  slime: createEnemyAnimations("slime"),
  slimeSmall: createEnemyAnimations("slimeSmall"),
  iceGolem: createEnemyAnimations("iceGolem"),
  raider: createEnemyAnimations("raider"),
  scorpion: createEnemyAnimations("scorpion"),
  vulture: createEnemyAnimations("vulture"),
};

/**
 * Nomi delle animazioni (e degli stati del boss) per ogni tipo di attacco, nelle tre fasi.
 * Il fendente usa una sola animazione a tre frame, uno per fase.
 */
export const BOSS_ATTACK_ANIMATIONS: Record<BossAttackKind, { windup: string; active: string; recovery: string }> = {
  melee: { windup: "slash", active: "slash", recovery: "slash" },
  charge: { windup: "chargeWindup", active: "charging", recovery: "recovery" },
  projectile: { windup: "castWindup", active: "casting", recovery: "castRecovery" },
  summon: { windup: "summonWindup", active: "summoning", recovery: "summonRecovery" },
};

/** Frame (suffissi degli sprite del boss) usati da ogni animazione d'attacco. */
const BOSS_ATTACK_FRAMES: Record<BossAttackKind, { windup: string; active: string; recovery: string }> = {
  melee: { windup: "SlashA", active: "SlashB", recovery: "SlashC" },
  charge: { windup: "ChargeWindup", active: "ChargeDash", recovery: "Hurt" },
  projectile: { windup: "CastA", active: "CastB", recovery: "CastA" },
  summon: { windup: "CastA", active: "CastB", recovery: "CastA" },
};

/**
 * Animazioni di un boss. I frame hanno il nome "<idBoss>Idle1", "<idBoss>SlashA" ecc.
 * Per ogni attacco della definizione si creano le animazioni del suo tipo; le durate seguono
 * quelle dell'attacco.
 */
export function createBossAnimations(definition: BossDefinition): Record<string, AnimationDefinition> {
  const id = definition.id;
  const animations: Record<string, AnimationDefinition> = {
    idle: { frameIds: [`${id}Idle1`, `${id}Idle2`], frameDurationMs: 600, loop: true },
    walk: { frameIds: [`${id}Walk1`, `${id}Walk2`, `${id}Walk3`, `${id}Walk2`], frameDurationMs: 200, loop: true },
    dead: { frameIds: [`${id}Hurt`, `${id}Heap`], frameDurationMs: 400, loop: false },
  };
  for (const attack of definition.attacks) {
    const names = BOSS_ATTACK_ANIMATIONS[attack.kind];
    const frames = BOSS_ATTACK_FRAMES[attack.kind];
    if (attack.kind === "melee") {
      animations[names.windup] = {
        frameIds: [`${id}${frames.windup}`, `${id}${frames.active}`, `${id}${frames.recovery}`],
        frameDurationMs: 100,
        frameDurationsMs: [attack.windupMs, attack.activeMs, attack.recoveryMs],
        loop: false,
      };
      continue;
    }
    animations[names.windup] = { frameIds: [`${id}${frames.windup}`], frameDurationMs: 100, loop: true };
    animations[names.active] = { frameIds: [`${id}${frames.active}`], frameDurationMs: 100, loop: true };
    animations[names.recovery] = { frameIds: [`${id}${frames.recovery}`], frameDurationMs: 100, loop: true };
  }
  return animations;
}

/** Animazioni di tutti i boss del catalogo, indicizzate per id del boss. */
export const BOSS_ANIMATIONS: Record<string, Record<string, AnimationDefinition>> = Object.fromEntries(
  Object.values(BOSS_CATALOG).map((definition) => [definition.id, createBossAnimations(definition)])
);
