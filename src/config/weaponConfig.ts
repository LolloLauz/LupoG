import type { AttackDefinition, AttackInputAction, ComboDefinition, WeaponDefinition, WeaponId } from "../types/EntityTypes";
import { ATTACK_DEFINITIONS, COMBO_DEFINITIONS, DEFAULT_ATTACK_BY_INPUT } from "./playerConfig";

/**
 * Armi del giocatore. La spada riusa gli attacchi e le combo della 2.0 (ATTACK_DEFINITIONS,
 * COMBO_DEFINITIONS, DEFAULT_ATTACK_BY_INPUT), che restano dove sono: valori e manuali non cambiano.
 * Le altre armi (Fase 1 del piano espansioni) hanno qui i propri attacchi; l'id di ogni attacco è
 * anche il nome della sua animazione in PLAYER_ANIMATIONS.
 * Un'arma nuova: un id in WeaponId, una voce qui, le animazioni dei suoi attacchi e il suo aspetto
 * in WEAPON_VISUALS (knightSprites.ts).
 * Classi Fase 0: ogni arma ha una categoria (tabella di compatibilità con le classi, WEAPON_AFFINITY_CONFIG),
 * un peso e l'attributo che ne farà crescere il danno; per ora nessuno dei tre cambia il gioco.
 */

/** Colpo in picchiata (Fase 3): velocità di discesa e del rimbalzo, uguali per tutte le armi. */
const PLUNGE = { fallSpeed: 360, bounceSpeed: 250 } as const;
/** Area del colpo in picchiata: la metà bassa del corpo e 6 px sotto i piedi. */
const PLUNGE_HITBOX = { x: 0, y: 14, width: 12, height: 16 } as const;
/** Durata massima della picchiata (finisce prima toccando terra o colpendo) e recupero all'atterraggio. */
const PLUNGE_TIMING = { durationMs: 1000, hitStartMs: 80, hitEndMs: 1000, cooldownMs: 250 } as const;

/** Spada: oltre agli attacchi della 2.0, il fendente montante (combo J, K) e il colpo in picchiata. */
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
 * Spadone a due mani (E3): lento, danno alto, portata lunga; ogni colpo rompe la guardia. Si cammina più piano.
 * Il turbine finale colpisce anche dietro (area da -16 a +44 px).
 */
const GREATSWORD_ATTACKS: Record<string, AttackDefinition> = {
  greatswordSlash1: { id: "greatswordSlash1", damage: 30, durationMs: 520, hitStartMs: 220, hitEndMs: 340, cooldownMs: 260, hitbox: { x: 6, y: -2, width: 32, height: 26 }, animation: "greatswordSlash1", breaksGuard: true },
  greatswordSlash2: { id: "greatswordSlash2", damage: 34, durationMs: 540, hitStartMs: 230, hitEndMs: 350, cooldownMs: 280, hitbox: { x: 6, y: 0, width: 32, height: 26 }, animation: "greatswordSlash2", breaksGuard: true },
  greatswordHeavy: { id: "greatswordHeavy", damage: 58, durationMs: 820, hitStartMs: 420, hitEndMs: 560, cooldownMs: 700, hitbox: { x: 4, y: -4, width: 36, height: 30 }, animation: "greatswordHeavy", breaksGuard: true },
  greatswordWhirl: { id: "greatswordWhirl", damage: 48, durationMs: 700, hitStartMs: 300, hitEndMs: 480, cooldownMs: 650, hitbox: { x: -16, y: 0, width: 60, height: 24 }, animation: "greatswordWhirl", breaksGuard: true },
  greatswordPlunge: { id: "greatswordPlunge", damage: 38, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "greatswordPlunge", plunge: PLUNGE, breaksGuard: true },
};

/**
 * Bastone (Classi Fase 2): l'arma del Mago. Colpi deboli e lenti, ma ogni bersaglio colpito ridà mana; in mano al
 * Mago rende gli incantesimi più forti e meno costosi (spellFocus). Non ha munizioni e non costa mana: il Mago ha
 * sempre un modo di attaccare.
 */
const STAFF_ATTACKS: Record<string, AttackDefinition> = {
  staffStrike1: { id: "staffStrike1", damage: 8, durationMs: 320, hitStartMs: 120, hitEndMs: 220, cooldownMs: 160, hitbox: { x: 6, y: 4, width: 22, height: 16 }, animation: "staffStrike1" },
  staffStrike2: { id: "staffStrike2", damage: 8, durationMs: 320, hitStartMs: 120, hitEndMs: 220, cooldownMs: 160, hitbox: { x: 6, y: 6, width: 22, height: 16 }, animation: "staffStrike2" },
  staffSpin: { id: "staffSpin", damage: 14, durationMs: 420, hitStartMs: 160, hitEndMs: 290, cooldownMs: 400, hitbox: { x: 4, y: 2, width: 24, height: 20 }, animation: "staffSpin" },
  // spazzata: colpo basso che raggiunge anche chi sta dietro (finale della combo mista)
  staffSweep: { id: "staffSweep", damage: 16, durationMs: 480, hitStartMs: 200, hitEndMs: 330, cooldownMs: 450, hitbox: { x: -10, y: 12, width: 40, height: 12 }, animation: "staffSweep" },
  staffHeavy: { id: "staffHeavy", damage: 18, durationMs: 560, hitStartMs: 260, hitEndMs: 380, cooldownMs: 450, hitbox: { x: 6, y: 0, width: 24, height: 24 }, animation: "staffHeavy" },
  staffPlunge: { id: "staffPlunge", damage: 14, ...PLUNGE_TIMING, hitbox: PLUNGE_HITBOX, animation: "staffPlunge", plunge: PLUNGE },
};

// --- armi a distanza (Fase 2): gli attacchi lanciano un proiettile e non hanno area d'urto ---
/** Area d'urto nulla: le armi a distanza feriscono solo con i proiettili. */
const NO_HITBOX = { x: 0, y: 0, width: 0, height: 0 } as const;

/** Arco: J = tiro rapido; K tenuto premuto = tiro caricato (danno e velocità secondo la carica). */
const BOW_ATTACKS: Record<string, AttackDefinition> = {
  bowShot: { id: "bowShot", damage: 8, durationMs: 300, hitStartMs: 0, hitEndMs: 0, cooldownMs: 150, hitbox: NO_HITBOX, animation: "bowShot", projectile: { projectileId: "playerArrow", launchAtMs: 150, originX: 20, originY: 9, aimY: 0 } },
  bowCharge: {
    id: "bowCharge",
    damage: 10,
    durationMs: 2500,
    hitStartMs: 0,
    hitEndMs: 0,
    cooldownMs: 0,
    hitbox: NO_HITBOX,
    animation: "bowCharge",
    charge: { maxChargeMs: 900, releaseAttackId: "bowChargedShot", minDamage: 10, maxDamage: 34, minSpeedMultiplier: 1, maxSpeedMultiplier: 1.6 },
  },
  bowChargedShot: { id: "bowChargedShot", damage: 10, durationMs: 260, hitStartMs: 0, hitEndMs: 0, cooldownMs: 250, hitbox: NO_HITBOX, animation: "bowChargedShot", projectile: { projectileId: "playerArrow", launchAtMs: 0, originX: 20, originY: 9, aimY: 0 } },
};

/** Balestra: un dardo pesante e veloce, poi una ricarica lunga (il tempo di recupero). */
const CROSSBOW_ATTACKS: Record<string, AttackDefinition> = {
  crossbowShot: { id: "crossbowShot", damage: 40, durationMs: 320, hitStartMs: 0, hitEndMs: 0, cooldownMs: 900, hitbox: NO_HITBOX, animation: "crossbowShot", projectile: { projectileId: "crossbowBolt", launchAtMs: 80, originX: 22, originY: 10, aimY: 0 } },
};

/** Coltelli da lancio: tiri rapidi ad arco; J li lancia più in basso. Si recuperano da terra. */
const KNIFE_ATTACKS: Record<string, AttackDefinition> = {
  knifeThrow: { id: "knifeThrow", damage: 12, durationMs: 220, hitStartMs: 0, hitEndMs: 0, cooldownMs: 80, hitbox: NO_HITBOX, animation: "knifeThrow", projectile: { projectileId: "throwingKnife", launchAtMs: 110, originX: 16, originY: 6, aimY: -0.12 } },
  knifeThrowLow: { id: "knifeThrowLow", damage: 12, durationMs: 220, hitStartMs: 0, hitEndMs: 0, cooldownMs: 80, hitbox: NO_HITBOX, animation: "knifeThrowLow", projectile: { projectileId: "throwingKnife", launchAtMs: 110, originX: 16, originY: 12, aimY: 0.12 } },
};

/** Giavellotto: un lancio potente ad arco che trafigge più nemici; ogni giavellotto lanciato si perde. */
const JAVELIN_ATTACKS: Record<string, AttackDefinition> = {
  javelinThrow: { id: "javelinThrow", damage: 50, durationMs: 450, hitStartMs: 0, hitEndMs: 0, cooldownMs: 400, hitbox: NO_HITBOX, animation: "javelinThrow", projectile: { projectileId: "javelin", launchAtMs: 220, originX: 18, originY: 4, aimY: -0.2 } },
};

/**
 * Attacchi in aria (Fase 3): J fa una combo di due colpi (i primi due leggeri dell'arma),
 * K il colpo in picchiata.
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
    category: "blade",
    weight: 2,
    scalingAttribute: "strength",
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
    category: "blade",
    weight: 1,
    scalingAttribute: "dexterity",
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
    category: "polearm",
    weight: 3,
    scalingAttribute: "strength",
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
    category: "heavy",
    weight: 4,
    scalingAttribute: "strength",
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
    category: "heavy",
    weight: 4,
    scalingAttribute: "strength",
  },
  staff: {
    id: "staff",
    name: "Bastone",
    spriteSuffix: "Staff",
    iconSpriteId: "weaponIconStaff",
    attacks: STAFF_ATTACKS,
    combos: [
      {
        id: "staffFlurry",
        name: "MULINELLO",
        inputSequence: ["attack", "attack", "attack"],
        attackIds: ["staffStrike1", "staffStrike2", "staffSpin"],
        comboWindowMs: 400,
      },
      {
        id: "arcaneSweep",
        name: "SPAZZATA ARCANA",
        inputSequence: ["attack", "heavyAttack"],
        attackIds: ["staffStrike1", "staffSweep"],
        comboWindowMs: 400,
      },
    ],
    defaultAttackByInput: { attack: "staffStrike1", heavyAttack: "staffHeavy" },
    air: airSet("BASTONE", "staffStrike1", "staffStrike2", "staffPlunge"),
    movementSpeedMultiplier: 1,
    category: "staff",
    weight: 2,
    scalingAttribute: "intelligence",
    // valori da bilanciare nella Fase 6
    spellFocus: { powerMultiplier: 1.2, manaCostMultiplier: 0.85, manaPerHit: 5 },
  },
  greatsword: {
    id: "greatsword",
    name: "Spadone",
    spriteSuffix: "Greatsword",
    iconSpriteId: "weaponIconGreatsword",
    attacks: GREATSWORD_ATTACKS,
    combos: [
      {
        id: "giantBlade",
        name: "LAMA DEL GIGANTE",
        inputSequence: ["attack", "attack"],
        attackIds: ["greatswordSlash1", "greatswordSlash2"],
        comboWindowMs: 450,
      },
      {
        id: "whirlwind",
        name: "TURBINE",
        inputSequence: ["attack", "attack", "heavyAttack"],
        attackIds: ["greatswordSlash1", "greatswordSlash2", "greatswordWhirl"],
        comboWindowMs: 450,
      },
    ],
    defaultAttackByInput: { attack: "greatswordSlash1", heavyAttack: "greatswordHeavy" },
    air: airSet("SPADONE", "greatswordSlash1", "greatswordSlash2", "greatswordPlunge"),
    movementSpeedMultiplier: 0.85,
    category: "heavy",
    weight: 5,
    scalingAttribute: "strength",
  },
  // armi a distanza (Fase 2): niente combo, in aria si tira come a terra
  bow: {
    id: "bow",
    name: "Arco",
    spriteSuffix: "Bow",
    iconSpriteId: "weaponIconBow",
    attacks: BOW_ATTACKS,
    combos: [],
    defaultAttackByInput: { attack: "bowShot", heavyAttack: "bowCharge" },
    movementSpeedMultiplier: 1,
    category: "ranged",
    weight: 2,
    scalingAttribute: "dexterity",
    // frecce e dardi non si recuperano: si ricaricano con la faretra (oggetto dei livelli) o riprendendo l'arma
    ammo: { max: 12, isLostWhenEmpty: false },
  },
  crossbow: {
    id: "crossbow",
    name: "Balestra",
    spriteSuffix: "Crossbow",
    iconSpriteId: "weaponIconCrossbow",
    attacks: CROSSBOW_ATTACKS,
    combos: [],
    defaultAttackByInput: { attack: "crossbowShot", heavyAttack: "crossbowShot" },
    movementSpeedMultiplier: 0.9,
    category: "ranged",
    weight: 3,
    scalingAttribute: "dexterity",
    ammo: { max: 6, isLostWhenEmpty: false },
  },
  throwingKnives: {
    id: "throwingKnives",
    name: "Coltelli",
    spriteSuffix: "Knives",
    iconSpriteId: "weaponIconKnives",
    attacks: KNIFE_ATTACKS,
    combos: [],
    defaultAttackByInput: { attack: "knifeThrow", heavyAttack: "knifeThrowLow" },
    movementSpeedMultiplier: 1.1,
    category: "thrown",
    weight: 1,
    scalingAttribute: "dexterity",
    ammo: { max: 6, isLostWhenEmpty: false },
  },
  javelin: {
    id: "javelin",
    name: "Giavellotto",
    spriteSuffix: "Javelin",
    iconSpriteId: "weaponIconJavelin",
    attacks: JAVELIN_ATTACKS,
    combos: [],
    defaultAttackByInput: { attack: "javelinThrow", heavyAttack: "javelinThrow" },
    movementSpeedMultiplier: 0.95,
    category: "thrown",
    weight: 2,
    scalingAttribute: "dexterity",
    ammo: { max: 3, isLostWhenEmpty: true },
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
