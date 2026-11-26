import type { AbilityGrade, AttributeDefinition, AttributeId, Attributes, WeaponCategoryId } from "../types/EntityTypes";

/**
 * Attributi del personaggio (Classi Fase 0, effetti dalla Fase 4). Ogni punto speso SOPRA la base della classe dà gli
 * effetti di effectsPerPoint, che entrano nei modificatori del giocatore come fonte "attributes" (vedi
 * systems/AttributeStats.ts e PlayerModifiers): un personaggio senza punti spesi gioca come nella 2.3.
 * Forza e Destrezza agiscono anche sul danno delle armi (WEAPON_SCALING_CONFIG), la Forza sui requisiti e sul carico.
 * Tutti i numeri sono provvisori: la messa a punto è della Fase 6B.
 */
export const ATTRIBUTE_CONFIG: Record<AttributeId, AttributeDefinition> = {
  strength: {
    id: "strength",
    name: "FORZA",
    shortName: "FOR",
    // danno delle armi (WEAPON_SCALING_CONFIG), requisiti e carico (valore intero, non per punto speso)
    effectsPerPoint: [],
  },
  dexterity: {
    id: "dexterity",
    name: "DESTREZZA",
    shortName: "DES",
    effectsPerPoint: [
      { stat: "attackRecoveryPercent", valuePerPoint: 1, label: "RECUPERO", percent: true, isReduction: true },
      { stat: "dodgeCostReductionPercent", valuePerPoint: 1.5, label: "COSTO SCHIVATA", percent: true, isReduction: true },
    ],
  },
  intelligence: {
    id: "intelligence",
    name: "INTELLIGENZA",
    shortName: "INT",
    effectsPerPoint: [
      { stat: "abilityPowerPercent", valuePerPoint: 2, label: "POTENZA MOSSE", percent: true },
      { stat: "maxManaBonus", valuePerPoint: 4, onlyWithMana: true, label: "MANA", percent: false },
      { stat: "manaRegenPercent", valuePerPoint: 3, onlyWithMana: true, label: "RIGEN. MANA", percent: true },
      { stat: "spellCostReductionPercent", valuePerPoint: 1, onlyWithMana: true, label: "COSTO INCANT.", percent: true, isReduction: true },
    ],
  },
  vitality: {
    id: "vitality",
    name: "VITALITA'",
    shortName: "VIT",
    effectsPerPoint: [
      { stat: "maxHealthBonus", valuePerPoint: 4, label: "SALUTE", percent: false },
      { stat: "defensePercent", valuePerPoint: 0.5, label: "DIFESA", percent: true },
    ],
  },
  endurance: {
    id: "endurance",
    name: "TEMPRA",
    shortName: "TEM",
    effectsPerPoint: [
      { stat: "maxStaminaBonus", valuePerPoint: 4, label: "STAMINA", percent: false },
      { stat: "staminaRegenPercent", valuePerPoint: 3, label: "RIGEN. STAMINA", percent: true },
      { stat: "resistancePercent", valuePerPoint: 1, label: "RESISTENZE", percent: true },
    ],
  },
};

/** Ordine degli attributi (vertici del pentagono, dall'alto in senso orario). */
export const ATTRIBUTE_ORDER: readonly AttributeId[] = ["strength", "dexterity", "intelligence", "vitality", "endurance"];

/** Tutti gli attributi a zero. */
export const ZERO_ATTRIBUTES: Readonly<Attributes> = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0, endurance: 0 };

/** Valore massimo di un attributo (base + punti spesi + power-up): è anche il raggio pieno del pentagono. */
export const ATTRIBUTE_MAX_VALUE = 20;

/** Punti attributo della partita (Classi Fase 4): a fine livello e in più nei livelli con il boss; uguali a ogni difficoltà. */
export const ATTRIBUTE_POINTS_CONFIG = {
  perLevelCompleted: 3,
  perBossDefeated: 2,
} as const;

/**
 * Danno delle armi (Classi Fase 4): ogni punto speso sopra la base nell'attributo principale dell'arma
 * (WeaponDefinition.scalingAttribute) dà primaryPercentPerPoint % di danno; ogni punto nell'attributo secondario della
 * categoria (Forza per il corpo a corpo, Destrezza per le armi a distanza e da lancio) ne dà secondaryPercentPerPoint.
 * Se i due attributi coincidono vale solo il principale.
 */
export const WEAPON_SCALING_CONFIG: {
  primaryPercentPerPoint: number;
  secondaryPercentPerPoint: number;
  secondaryAttributeByCategory: Readonly<Record<WeaponCategoryId, AttributeId>>;
} = {
  primaryPercentPerPoint: 3,
  secondaryPercentPerPoint: 1,
  secondaryAttributeByCategory: {
    blade: "strength",
    heavy: "strength",
    polearm: "strength",
    staff: "strength",
    ranged: "dexterity",
    thrown: "dexterity",
  },
};

/**
 * Requisiti di Forza (Classi Fase 4), morbidi: l'oggetto si usa sempre, ma ogni punto di Forza che manca dà un malus,
 * fino a maxPenaltyPercent.
 * - Armi: solo quelle che scalano con la Forza e pesano almeno weaponMinWeight; Forza richiesta
 *   = (peso - weaponWeightOffset) x weaponStrengthPerWeight (lancia 3, ascia e mazza 6, spadone 9).
 *   Malus: danno -weaponDamagePenaltyPercentPerPoint %, recupero +weaponRecoveryPenaltyPercentPerPoint % per punto.
 * - Armature: Forza richiesta = peso del pezzo x armorStrengthPerWeight; malus di velocità per punto mancante, sommato
 *   su tutti i pezzi indossati.
 */
export const STRENGTH_REQUIREMENT_CONFIG = {
  weaponMinWeight: 3,
  weaponWeightOffset: 2,
  weaponStrengthPerWeight: 3,
  armorStrengthPerWeight: 1,
  weaponDamagePenaltyPercentPerPoint: 4,
  weaponRecoveryPenaltyPercentPerPoint: 4,
  armorSpeedPenaltyPercentPerPoint: 3,
  maxPenaltyPercent: 40,
} as const;

/**
 * Carico (Classi Fase 4): si porta senza malus fino a baseCapacity + Forza x capacityPerStrength, contando il peso
 * dell'arma in mano e delle armature indossate (lo zaino non conta). Ogni punto in più toglie
 * speedPenaltyPercentPerPoint % di velocità di movimento, fino a maxPenaltyPercent.
 */
export const CARRY_CONFIG = {
  baseCapacity: 8,
  capacityPerStrength: 1,
  speedPenaltyPercentPerPoint: 3,
  maxPenaltyPercent: 30,
} as const;

/** Intelligenza richiesta da ogni grado di mossa (Classi Fase 4): requisito rigido, sotto la soglia non si lancia. */
export const SPELL_GRADE_INT_REQUIREMENT: Readonly<Record<AbilityGrade, number>> = { 1: 0, 2: 12, 3: 16 };
