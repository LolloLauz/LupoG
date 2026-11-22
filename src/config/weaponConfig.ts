import type { AttackDefinition, AttackInputAction, ComboDefinition, WeaponDefinition, WeaponId } from "../types/EntityTypes";
import { ATTACK_DEFINITIONS, COMBO_DEFINITIONS, DEFAULT_ATTACK_BY_INPUT } from "./playerConfig";

/**
 * Armi del giocatore. La spada riusa gli attacchi e le combo della 2.0 (ATTACK_DEFINITIONS,
 * COMBO_DEFINITIONS, DEFAULT_ATTACK_BY_INPUT), che restano dove sono: valori e manuali non cambiano.
 * Le altre armi (Fase 1 del piano espansioni) hanno qui i propri attacchi; l'id di ogni attacco è
 * anche il nome della sua animazione in PLAYER_ANIMATIONS.
 * Un'arma nuova: un id in WeaponId, una voce qui, le animazioni dei suoi attacchi e il suo aspetto
 * in WEAPON_VISUALS (knightSprites.ts).
 */

/** Colpo in picchiata (Fase 3): velocità di discesa e del rimbalzo, uguali per tutte le armi. */
const PLUNGE = { fallSpeed: 360, bounceSpeed: 250 } as const;
/** Area del colpo in picchiata: la metà bassa del corpo e 6 px sotto i piedi. */
const PLUNGE_HITBOX = { x: 0, y: 14, width: 12, height: 16 } as const;
/** Durata massima della picchiata (finisce prima toccando terra o colpendo) e recupero all'atterraggio. */
const PLUNGE_TIMING = { durationMs: 1000, hitStartMs: 80, hitEndMs: 1000, cooldownMs: 250 } as const;

/** Spada: oltre agli attacchi della 2.0, il fendente montante (combo Spazio, J) e il colpo in picchiata. */
const SWORD_EXTRA_ATTACKS: Record<string, AttackDefinition> = {
  swordRising: { id: "swordRising", damage: 28, durationMs: 380, hitStartMs: 140, hitEndMs: 260, cooldownMs: 400, hitbox: { x: 6, y: -6, width: 22, height: 26 }, animation: "swordRising" },
  swordPlunge: { id: "swordPlunge", damage: 24, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "swordPlunge", plunge: PLUNGE },
};

/** Combo miste della spada (le combo della 2.0 restano in COMBO_DEFINITIONS). */
const SWORD_EXTRA_COMBOS: ComboDefinition[] = [
  { id: "risingSlash", name: "FENDENTE MONTANTE", inputSequence: ["attack", "heavyAttack"], attackIds: ["swordLight1", "swordRising"], comboWindowMs: 400 },
];

/** Pugnale: colpi rapidi e deboli, combo di quattro colpi. */
const DAGGER_ATTACKS: Record<string, AttackDefinition> = {
  daggerStab1: { id: "daggerStab1", damage: 9, durationMs: 160, hitStartMs: 50, hitEndMs: 110, cooldownMs: 60, hitbox: { x: 6, y: 8, width: 14, height: 10 }, animation: "daggerStab1" },
  daggerStab2: { id: "daggerStab2", damage: 9, durationMs: 160, hitStartMs: 50, hitEndMs: 110, cooldownMs: 60, hitbox: { x: 6, y: 10, width: 14, height: 10 }, animation: "daggerStab2" },
  daggerFinisher: { id: "daggerFinisher", damage: 18, durationMs: 260, hitStartMs: 90, hitEndMs: 180, cooldownMs: 300, hitbox: { x: 6, y: 4, width: 16, height: 16 }, animation: "daggerFinisher" },
  daggerLunge: { id: "daggerLunge", damage: 22, durationMs: 360, hitStartMs: 140, hitEndMs: 240, cooldownMs: 350, hitbox: { x: 6, y: 6, width: 20, height: 12 }, animation: "daggerLunge" },
  daggerPiercer: { id: "daggerPiercer", damage: 30, durationMs: 300, hitStartMs: 100, hitEndMs: 200, cooldownMs: 350, hitbox: { x: 6, y: 8, width: 24, height: 8 }, animation: "daggerPiercer" },
  daggerPlunge: { id: "daggerPlunge", damage: 16, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "daggerPlunge", plunge: PLUNGE },
};

/** Lancia: affondi lunghi e stretti, il terzo colpo è un fendente ampio. */
const SPEAR_ATTACKS: Record<string, AttackDefinition> = {
  spearThrust1: { id: "spearThrust1", damage: 13, durationMs: 300, hitStartMs: 110, hitEndMs: 210, cooldownMs: 140, hitbox: { x: 8, y: 9, width: 32, height: 6 }, animation: "spearThrust1" },
  spearThrust2: { id: "spearThrust2", damage: 13, durationMs: 300, hitStartMs: 110, hitEndMs: 210, cooldownMs: 140, hitbox: { x: 8, y: 7, width: 32, height: 6 }, animation: "spearThrust2" },
  spearSweep: { id: "spearSweep", damage: 20, durationMs: 400, hitStartMs: 150, hitEndMs: 280, cooldownMs: 400, hitbox: { x: 4, y: 2, width: 30, height: 20 }, animation: "spearSweep" },
  spearHeavy: { id: "spearHeavy", damage: 32, durationMs: 560, hitStartMs: 280, hitEndMs: 400, cooldownMs: 500, hitbox: { x: 8, y: 7, width: 40, height: 8 }, animation: "spearHeavy" },
  spearDragon: { id: "spearDragon", damage: 34, durationMs: 520, hitStartMs: 240, hitEndMs: 380, cooldownMs: 500, hitbox: { x: 8, y: 5, width: 44, height: 10 }, animation: "spearDragon" },
  spearPlunge: { id: "spearPlunge", damage: 26, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "spearPlunge", plunge: PLUNGE },
};

/** Ascia: lenta e forte; ogni colpo rompe la guardia (interrompe gli attacchi nemici già avviati). */
const AXE_ATTACKS: Record<string, AttackDefinition> = {
  axeChop1: { id: "axeChop1", damage: 22, durationMs: 400, hitStartMs: 160, hitEndMs: 260, cooldownMs: 200, hitbox: { x: 6, y: 2, width: 24, height: 20 }, animation: "axeChop1", breaksGuard: true },
  axeChop2: { id: "axeChop2", damage: 26, durationMs: 440, hitStartMs: 170, hitEndMs: 280, cooldownMs: 250, hitbox: { x: 6, y: 4, width: 24, height: 20 }, animation: "axeChop2", breaksGuard: true },
  axeHeavy: { id: "axeHeavy", damage: 46, durationMs: 700, hitStartMs: 340, hitEndMs: 480, cooldownMs: 650, hitbox: { x: 4, y: 0, width: 28, height: 24 }, animation: "axeHeavy", breaksGuard: true },
  axeSkullSplitter: { id: "axeSkullSplitter", damage: 52, durationMs: 640, hitStartMs: 300, hitEndMs: 440, cooldownMs: 650, hitbox: { x: 4, y: 0, width: 28, height: 24 }, animation: "axeSkullSplitter", breaksGuard: true },
  axePlunge: { id: "axePlunge", damage: 34, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "axePlunge", plunge: PLUNGE, breaksGuard: true },
};

/** Mazza: ogni colpo schiaccia le corazze (danno pieno e stordimento sui nemici corazzati). */
const MACE_ATTACKS: Record<string, AttackDefinition> = {
  maceSwing1: { id: "maceSwing1", damage: 17, durationMs: 340, hitStartMs: 130, hitEndMs: 230, cooldownMs: 160, hitbox: { x: 6, y: 4, width: 20, height: 16 }, animation: "maceSwing1", crushesArmor: true },
  maceSwing2: { id: "maceSwing2", damage: 17, durationMs: 340, hitStartMs: 130, hitEndMs: 230, cooldownMs: 160, hitbox: { x: 6, y: 6, width: 20, height: 16 }, animation: "maceSwing2", crushesArmor: true },
  maceSmash: { id: "maceSmash", damage: 28, durationMs: 420, hitStartMs: 160, hitEndMs: 290, cooldownMs: 400, hitbox: { x: 6, y: 2, width: 22, height: 20 }, animation: "maceSmash", crushesArmor: true },
  maceHeavy: { id: "maceHeavy", damage: 36, durationMs: 620, hitStartMs: 300, hitEndMs: 430, cooldownMs: 550, hitbox: { x: 6, y: 0, width: 24, height: 24 }, animation: "maceHeavy", crushesArmor: true },
  // terremoto: colpo a terra che raggiunge anche chi sta dietro (area bassa da -12 a +32 px)
  maceQuake: { id: "maceQuake", damage: 32, durationMs: 560, hitStartMs: 260, hitEndMs: 400, cooldownMs: 550, hitbox: { x: -12, y: 14, width: 44, height: 10 }, animation: "maceQuake", crushesArmor: true },
  macePlunge: { id: "macePlunge", damage: 30, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "macePlunge", plunge: PLUNGE, crushesArmor: true },
};

/**
 * Attacchi in aria (Fase 3): Spazio fa una combo di due colpi (i primi due leggeri dell'arma),
 * J il colpo in picchiata.
 */
function airSet(
  weaponName: string,
  firstAttackId: string,
  secondAttackId: string,
  plungeAttackId: string
): { combos: ComboDefinition[]; defaultAttackByInput: Record<AttackInputAction, string> } {
  return {
    combos: [{ id: `${firstAttackId}Air`, name: `${weaponName} IN VOLO`, inputSequence: ["attack", "attack"], attackIds: [firstAttackId, secondAttackId], comboWindowMs: 300 }],
    defaultAttackByInput: { attack: firstAttackId, heavyAttack: plungeAttackId },
  };
}

export const WEAPON_CONFIG: Record<WeaponId, WeaponDefinition> = {
  sword: {
    id: "sword",
    name: "Spada",
    spriteSuffix: "",
    iconSpriteId: "weaponIconSword",
    attacks: { ...ATTACK_DEFINITIONS, ...SWORD_EXTRA_ATTACKS },
    combos: [...COMBO_DEFINITIONS, ...SWORD_EXTRA_COMBOS],
    defaultAttackByInput: DEFAULT_ATTACK_BY_INPUT,
    air: airSet("SPADA", "swordLight1", "swordLight2", "swordPlunge"),
    movementSpeedMultiplier: 1,
  },
  dagger: {
    id: "dagger",
    name: "Pugnale",
    spriteSuffix: "Dagger",
    iconSpriteId: "weaponIconDagger",
    attacks: DAGGER_ATTACKS,
    combos: [
      {
        id: "daggerFlurry",
        name: "RAFFICA",
        inputSequence: ["attack", "attack", "attack", "attack"],
        attackIds: ["daggerStab1", "daggerStab2", "daggerStab1", "daggerFinisher"],
        comboWindowMs: 350,
      },
      {
        id: "serpentBite",
        name: "MORSO DEL SERPENTE",
        inputSequence: ["attack", "attack", "attack", "heavyAttack"],
        attackIds: ["daggerStab1", "daggerStab2", "daggerStab1", "daggerPiercer"],
        comboWindowMs: 350,
      },
    ],
    defaultAttackByInput: { attack: "daggerStab1", heavyAttack: "daggerLunge" },
    air: airSet("PUGNALE", "daggerStab1", "daggerStab2", "daggerPlunge"),
    movementSpeedMultiplier: 1.15,
  },
  spear: {
    id: "spear",
    name: "Lancia",
    spriteSuffix: "Spear",
    iconSpriteId: "weaponIconSpear",
    attacks: SPEAR_ATTACKS,
    combos: [
      {
        id: "spearDance",
        name: "DANZA DELLA LANCIA",
        inputSequence: ["attack", "attack", "attack"],
        attackIds: ["spearThrust1", "spearThrust2", "spearSweep"],
        comboWindowMs: 400,
      },
      {
        id: "dragonCharge",
        name: "CARICA DEL DRAGO",
        inputSequence: ["attack", "heavyAttack"],
        attackIds: ["spearThrust1", "spearDragon"],
        comboWindowMs: 400,
      },
    ],
    defaultAttackByInput: { attack: "spearThrust1", heavyAttack: "spearHeavy" },
    air: airSet("LANCIA", "spearThrust1", "spearThrust2", "spearPlunge"),
    movementSpeedMultiplier: 0.95,
  },
  axe: {
    id: "axe",
    name: "Ascia",
    spriteSuffix: "Axe",
    iconSpriteId: "weaponIconAxe",
    attacks: AXE_ATTACKS,
    combos: [
      {
        id: "axeCleave",
        name: "DOPPIO TAGLIO",
        inputSequence: ["attack", "attack"],
        attackIds: ["axeChop1", "axeChop2"],
        comboWindowMs: 400,
      },
      {
        id: "skullSplitter",
        name: "SPACCAOSSA",
        inputSequence: ["attack", "attack", "heavyAttack"],
        attackIds: ["axeChop1", "axeChop2", "axeSkullSplitter"],
        comboWindowMs: 400,
      },
    ],
    defaultAttackByInput: { attack: "axeChop1", heavyAttack: "axeHeavy" },
    air: airSet("ASCIA", "axeChop1", "axeChop2", "axePlunge"),
    movementSpeedMultiplier: 0.85,
  },
  mace: {
    id: "mace",
    name: "Mazza",
    spriteSuffix: "Mace",
    iconSpriteId: "weaponIconMace",
    attacks: MACE_ATTACKS,
    combos: [
      {
        id: "maceBarrage",
        name: "TEMPESTA DI COLPI",
        inputSequence: ["attack", "attack", "attack"],
        attackIds: ["maceSwing1", "maceSwing2", "maceSmash"],
        comboWindowMs: 400,
      },
      {
        id: "earthquake",
        name: "TERREMOTO",
        inputSequence: ["attack", "heavyAttack"],
        attackIds: ["maceSwing1", "maceQuake"],
        comboWindowMs: 400,
      },
    ],
    defaultAttackByInput: { attack: "maceSwing1", heavyAttack: "maceHeavy" },
    air: airSet("MAZZA", "maceSwing1", "maceSwing2", "macePlunge"),
    movementSpeedMultiplier: 0.9,
  },
};

/** Lato (px) delle icone delle armi: oggetto a terra e HUD. */
export const WEAPON_ICON_SIZE = 16;

/** Arma di partenza (e di ripiego se i progressi salvati ne indicano una che non esiste). */
export const DEFAULT_WEAPON_ID: WeaponId = "sword";

/** Tutti gli attacchi di tutte le armi, per id (servono alle animazioni). */
export function getAllWeaponAttacks(): Record<string, AttackDefinition> {
  const allAttacks: Record<string, AttackDefinition> = {};
  for (const weapon of Object.values(WEAPON_CONFIG)) {
    Object.assign(allAttacks, weapon.attacks);
  }
  return allAttacks;
}

/** Vero se il testo è l'id di un'arma esistente (per validare i progressi salvati). */
export function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(WEAPON_CONFIG, value);
}
