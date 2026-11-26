import {
  ATTRIBUTE_CONFIG,
  ATTRIBUTE_MAX_VALUE,
  ATTRIBUTE_ORDER,
  CARRY_CONFIG,
  SPELL_GRADE_INT_REQUIREMENT,
  STRENGTH_REQUIREMENT_CONFIG,
  WEAPON_SCALING_CONFIG,
} from "../config/attributeConfig";
import { ARMOR_CONFIG } from "../config/armorConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import type { AbilityGrade, AttributeDefinition, AttributeId, Attributes, StatModifierEffect, WeaponDefinition } from "../types/EntityTypes";
import type { ItemInstance } from "../types/ItemTypes";

/**
 * Attributi -> effetti sul giocatore (Classi Fase 0, formule dalla Fase 4). Solo calcoli, nessuno stato: Player li
 * chiama ogni volta che cambiano attributi, arma o armature.
 * - Gli effetti per punto (ATTRIBUTE_CONFIG) contano i punti SOPRA la base della classe (getPointsAboveBase): senza
 *   punti spesi l'elenco è vuoto e il gioco non cambia.
 * - Requisiti e carico leggono invece il valore effettivo (base + spesi + power-up, entro ATTRIBUTE_MAX_VALUE).
 */

/** Effetti per punto sopra la base; quelli solo per chi ha mana si saltano se la classe non ne ha. */
export function computeAttributeEffects(
  pointsAboveBase: Readonly<Attributes>,
  hasMana: boolean = false,
  definitions: Readonly<Record<AttributeId, AttributeDefinition>> = ATTRIBUTE_CONFIG
): StatModifierEffect[] {
  const effects: StatModifierEffect[] = [];
  for (const attributeId of ATTRIBUTE_ORDER) {
    const points = pointsAboveBase[attributeId];
    for (const effect of definitions[attributeId].effectsPerPoint) {
      if (effect.onlyWithMana === true && !hasMana) {
        continue;
      }
      const value = effect.valuePerPoint * points;
      if (value !== 0) {
        effects.push({ stat: effect.stat, operation: "add", value });
      }
    }
  }
  return effects;
}

/** Valore effettivo di ogni attributo: base + punti spesi + bonus dei power-up, tra 0 e ATTRIBUTE_MAX_VALUE. */
export function computeEffectiveAttributes(base: Readonly<Attributes>, spent: Readonly<Attributes>, bonus: Readonly<Partial<Attributes>> = {}): Attributes {
  const result = { ...base };
  for (const attributeId of ATTRIBUTE_ORDER) {
    const total = base[attributeId] + spent[attributeId] + (bonus[attributeId] ?? 0);
    result[attributeId] = Math.max(0, Math.min(ATTRIBUTE_MAX_VALUE, total));
  }
  return result;
}

/** Punti sopra la base (mai negativi): sono quelli che danno gli effetti. */
export function getPointsAboveBase(effective: Readonly<Attributes>, base: Readonly<Attributes>): Attributes {
  const result = { ...effective };
  for (const attributeId of ATTRIBUTE_ORDER) {
    result[attributeId] = Math.max(0, effective[attributeId] - base[attributeId]);
  }
  return result;
}

/** Attributo secondario di un'arma (Forza per il corpo a corpo, Destrezza a distanza e da lancio). */
export function getWeaponSecondaryAttribute(weapon: Readonly<WeaponDefinition>): AttributeId {
  return WEAPON_SCALING_CONFIG.secondaryAttributeByCategory[weapon.category];
}

/**
 * Percentuale di danno dell'arma data da un attributo: principale o secondario (se diverso dal principale); null se
 * l'arma non scala con quell'attributo.
 */
export function getWeaponScalingPercentFor(weapon: Readonly<WeaponDefinition>, attributeId: AttributeId, pointsAboveBase: number): number | null {
  if (weapon.scalingAttribute === attributeId) {
    return pointsAboveBase * WEAPON_SCALING_CONFIG.primaryPercentPerPoint;
  }
  if (getWeaponSecondaryAttribute(weapon) === attributeId) {
    return pointsAboveBase * WEAPON_SCALING_CONFIG.secondaryPercentPerPoint;
  }
  return null;
}

/**
 * Moltiplicatore del danno dell'arma dato dagli attributi: +primaryPercentPerPoint % per punto sopra la base
 * nell'attributo principale, +secondaryPercentPerPoint % nel secondario (se diverso). 1 senza punti spesi.
 */
export function getWeaponScalingMultiplier(weapon: Readonly<WeaponDefinition>, pointsAboveBase: Readonly<Attributes>): number {
  let percent = 0;
  for (const attributeId of ATTRIBUTE_ORDER) {
    percent += getWeaponScalingPercentFor(weapon, attributeId, pointsAboveBase[attributeId]) ?? 0;
  }
  return percent === 0 ? 1 : 1 + percent / 100;
}

/** Forza richiesta da un'arma (0 = nessun requisito: solo le armi da Forza abbastanza pesanti ne hanno uno). */
export function getWeaponStrengthRequirement(weapon: Readonly<WeaponDefinition>): number {
  const rules = STRENGTH_REQUIREMENT_CONFIG;
  if (weapon.scalingAttribute !== "strength" || weapon.weight < rules.weaponMinWeight) {
    return 0;
  }
  return (weapon.weight - rules.weaponWeightOffset) * rules.weaponStrengthPerWeight;
}

/** Forza richiesta da un pezzo d'armatura del peso indicato. */
export function getArmorStrengthRequirement(weight: number): number {
  return weight * STRENGTH_REQUIREMENT_CONFIG.armorStrengthPerWeight;
}

/** Forza richiesta da un oggetto (arma o pezzo d'armatura); 0 = nessun requisito. */
export function getItemStrengthRequirement(item: ItemInstance): number {
  return item.kind === "weapon" ? getWeaponStrengthRequirement(WEAPON_CONFIG[item.baseId]) : getArmorStrengthRequirement(ARMOR_CONFIG[item.baseId].weight);
}

/** Carico massimo senza malus con la Forza indicata. */
export function getCarryCapacity(strength: number): number {
  return CARRY_CONFIG.baseCapacity + strength * CARRY_CONFIG.capacityPerStrength;
}

/** Effetti della Forza sull'equipaggiamento in uso: requisiti dell'arma e delle armature, carico. */
export interface StrengthPenalties {
  /** Punti di Forza che mancano all'arma in mano (0 = requisito soddisfatto o assente). */
  weaponMissingStrength: number;
  /** Moltiplicatori sugli attacchi dell'arma (1 senza malus). */
  weaponDamageMultiplier: number;
  weaponRecoveryMultiplier: number;
  /** Punti di Forza mancanti, sommati su tutti i pezzi d'armatura indossati. */
  armorMissingStrength: number;
  /** Peso portato (arma + armature) e carico massimo. */
  load: number;
  carryCapacity: number;
  /** Moltiplicatore della velocità di movimento (requisiti delle armature e carico; 1 senza malus). */
  movementSpeedMultiplier: number;
}

/** Nessun malus (Forza sufficiente). */
export const NO_STRENGTH_PENALTIES: Readonly<StrengthPenalties> = {
  weaponMissingStrength: 0,
  weaponDamageMultiplier: 1,
  weaponRecoveryMultiplier: 1,
  armorMissingStrength: 0,
  load: 0,
  carryCapacity: getCarryCapacity(0),
  movementSpeedMultiplier: 1,
};

/** Percentuale di malus per i punti mancanti, entro il tetto. */
function penaltyPercent(missingPoints: number, percentPerPoint: number, maxPercent: number): number {
  return Math.min(maxPercent, Math.max(0, missingPoints) * percentPerPoint);
}

/**
 * Malus dovuti alla Forza (requisiti morbidi e carico) per l'arma in mano e i pesi delle armature indossate.
 * I moltiplicatori valgono esattamente 1 quando non manca niente (il gioco resta identico).
 */
export function computeStrengthPenalties(strength: number, weapon: Readonly<WeaponDefinition>, armorWeights: readonly number[]): StrengthPenalties {
  const rules = STRENGTH_REQUIREMENT_CONFIG;
  const weaponMissingStrength = Math.max(0, getWeaponStrengthRequirement(weapon) - strength);
  const armorMissingStrength = armorWeights.reduce((sum, weight) => sum + Math.max(0, getArmorStrengthRequirement(weight) - strength), 0);
  const weaponDamagePercent = penaltyPercent(weaponMissingStrength, rules.weaponDamagePenaltyPercentPerPoint, rules.maxPenaltyPercent);
  const weaponRecoveryPercent = penaltyPercent(weaponMissingStrength, rules.weaponRecoveryPenaltyPercentPerPoint, rules.maxPenaltyPercent);
  const armorSpeedPercent = penaltyPercent(armorMissingStrength, rules.armorSpeedPenaltyPercentPerPoint, rules.maxPenaltyPercent);
  const load = weapon.weight + armorWeights.reduce((sum, weight) => sum + weight, 0);
  const carryCapacity = getCarryCapacity(strength);
  const carrySpeedPercent = penaltyPercent(load - carryCapacity, CARRY_CONFIG.speedPenaltyPercentPerPoint, CARRY_CONFIG.maxPenaltyPercent);
  const speedMultiplier = (armorSpeedPercent === 0 ? 1 : 1 - armorSpeedPercent / 100) * (carrySpeedPercent === 0 ? 1 : 1 - carrySpeedPercent / 100);
  return {
    weaponMissingStrength,
    weaponDamageMultiplier: weaponDamagePercent === 0 ? 1 : 1 - weaponDamagePercent / 100,
    weaponRecoveryMultiplier: weaponRecoveryPercent === 0 ? 1 : 1 + weaponRecoveryPercent / 100,
    armorMissingStrength,
    load,
    carryCapacity,
    movementSpeedMultiplier: speedMultiplier,
  };
}

/** Intelligenza richiesta da un grado di mossa. */
export function getGradeIntelligenceRequirement(grade: AbilityGrade): number {
  return SPELL_GRADE_INT_REQUIREMENT[grade];
}

/** Vero se con questa Intelligenza la mossa del grado indicato si può usare (requisito rigido). */
export function meetsGradeRequirement(grade: AbilityGrade, intelligence: number): boolean {
  return intelligence >= getGradeIntelligenceRequirement(grade);
}

/**
 * Somma una percentuale degli attributi a quella dell'equipaggiamento sotto lo stesso tetto (difesa, resistenze,
 * recupero). equipmentFraction è la frazione già con il tetto (0,1 = 10%). Senza punti negli attributi torna
 * esattamente equipmentFraction, così il gioco resta identico.
 */
export function combineCappedFraction(equipmentFraction: number, attributePercent: number, capPercent: number): number {
  if (attributePercent <= 0) {
    return equipmentFraction;
  }
  return Math.min(capPercent, equipmentFraction * 100 + attributePercent) / 100;
}

/** Una riga degli effetti di un attributo, già scritta (es. "SALUTE +16", "RECUPERO -3%"). */
export function describeAttributeEffects(
  attributeId: AttributeId,
  pointsAboveBase: number,
  hasMana: boolean,
  definitions: Readonly<Record<AttributeId, AttributeDefinition>> = ATTRIBUTE_CONFIG
): string[] {
  const lines: string[] = [];
  for (const effect of definitions[attributeId].effectsPerPoint) {
    if (effect.onlyWithMana === true && !hasMana) {
      continue;
    }
    const value = Math.round(effect.valuePerPoint * pointsAboveBase * 10) / 10;
    const sign = effect.isReduction === true ? "-" : "+";
    const text = String(value).replace(".", ",");
    lines.push(`${effect.label} ${sign}${text}${effect.percent ? "%" : ""}`);
  }
  return lines;
}
