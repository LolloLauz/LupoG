import { AFFIX_CONFIG, ELEMENT_SHORT_NAMES } from "../config/affixConfig";
import { ARMOR_CONFIG, ARMOR_SETS, ARMOR_SLOTS } from "../config/armorConfig";
import { ELEMENT_ORDER } from "../config/elementConfig";
import { RARITY_CONFIG } from "../config/rarityConfig";
import type { ElementId } from "../types/EntityTypes";
import type { AffixRoll, ArmorItem, ArmorMaterialId, EquipmentBonuses, EquippedArmor, ItemInstance, WeaponItem } from "../types/ItemTypes";

/** Nessun pezzo indossato. */
export const EMPTY_ARMOR: Readonly<EquippedArmor> = { helmet: null, chest: null, boots: null };

/** Bonus nulli: nessun effetto (arma Comune senza modificatori, nessuna armatura). */
export const NO_EQUIPMENT_BONUSES: Readonly<EquipmentBonuses> = {
  damageMultiplier: 1,
  recoveryMultiplier: 1,
  movementSpeedMultiplier: 1,
  maxHealth: 0,
  maxStamina: 0,
  damageTakenMultiplier: 1,
  lifeStealFraction: 0,
  elements: [],
  breaksGuard: false,
  resistances: {},
};

/**
 * Totali di un insieme di oggetti, nella stessa unità dei modificatori (percentuali e punti), prima dei tetti.
 * Le chiavi resist* sono le resistenze per elemento.
 */
export interface StatTotals {
  damage: number;
  recovery: number;
  moveSpeed: number;
  lifeSteal: number;
  maxHealth: number;
  maxStamina: number;
  defense: number;
  resistances: Record<ElementId, number>;
  elements: ElementId[];
  breaksGuard: boolean;
}

function createEmptyTotals(): StatTotals {
  return {
    damage: 0,
    recovery: 0,
    moveSpeed: 0,
    lifeSteal: 0,
    maxHealth: 0,
    maxStamina: 0,
    defense: 0,
    resistances: { fire: 0, poison: 0, frost: 0, shock: 0 },
    elements: [],
    breaksGuard: false,
  };
}

function addAffix(totals: StatTotals, affix: AffixRoll): void {
  switch (affix.id) {
    case "element":
      if (affix.element !== undefined && !totals.elements.includes(affix.element)) {
        totals.elements.push(affix.element);
      }
      break;
    case "resistance":
      if (affix.element !== undefined) {
        totals.resistances[affix.element] += affix.value;
      }
      break;
    case "breaksGuard":
      totals.breaksGuard = true;
      break;
    default:
      totals[affix.id] += affix.value;
  }
}

/** Statistiche base di un pezzo d'armatura con la sua rarità (arrotondate). */
export function getArmorBaseStats(item: ArmorItem): AffixRoll[] {
  const stats = ARMOR_CONFIG[item.baseId].stats;
  const multiplier = RARITY_CONFIG[item.rarity].armorStatMultiplier;
  const scaled: AffixRoll[] = [];
  if (stats.defense !== 0) scaled.push({ id: "defense", value: Math.round(stats.defense * multiplier) });
  if (stats.maxHealth !== 0) scaled.push({ id: "maxHealth", value: Math.round(stats.maxHealth * multiplier) });
  if (stats.maxStamina !== 0) scaled.push({ id: "maxStamina", value: Math.round(stats.maxStamina * multiplier) });
  // la lentezza delle armature pesanti non cresce con la rarità
  if (stats.moveSpeed !== 0) scaled.push({ id: "moveSpeed", value: stats.moveSpeed });
  return scaled;
}

/** Totali di un solo oggetto (statistiche base dell'armatura più i modificatori). Per la scheda e il confronto. */
export function getItemTotals(item: ItemInstance): StatTotals {
  const totals = createEmptyTotals();
  if (item.kind === "armor") {
    getArmorBaseStats(item).forEach((stat) => addAffix(totals, stat));
  }
  item.affixes.forEach((affix) => addAffix(totals, affix));
  return totals;
}

/** Set attivi: materiale e numero di pezzi indossati (solo con almeno due pezzi). */
export function getActiveSets(armor: Readonly<EquippedArmor>): Array<{ material: ArmorMaterialId; pieces: number }> {
  const counts = new Map<ArmorMaterialId, number>();
  for (const slot of ARMOR_SLOTS) {
    const item = armor[slot];
    if (item !== null) {
      const material = ARMOR_CONFIG[item.baseId].material;
      counts.set(material, (counts.get(material) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, pieces]) => pieces >= 2).map(([material, pieces]) => ({ material, pieces }));
}

/** Totali di tutto l'equipaggiamento, prima dei tetti: arma, armature e bonus dei set. */
export function computeEquipmentTotals(weapon: WeaponItem | null, armor: Readonly<EquippedArmor>): StatTotals {
  const totals = createEmptyTotals();
  const items: ItemInstance[] = [...(weapon === null ? [] : [weapon]), ...ARMOR_SLOTS.flatMap((slot) => (armor[slot] === null ? [] : [armor[slot]!]))];
  for (const item of items) {
    const itemTotals = getItemTotals(item);
    for (const key of ["damage", "recovery", "moveSpeed", "lifeSteal", "maxHealth", "maxStamina", "defense"] as const) {
      totals[key] += itemTotals[key];
    }
    for (const element of ELEMENT_ORDER) {
      totals.resistances[element] += itemTotals.resistances[element];
    }
    itemTotals.elements.forEach((element) => addAffix(totals, { id: "element", value: 0, element }));
    totals.breaksGuard = totals.breaksGuard || itemTotals.breaksGuard;
  }
  for (const set of getActiveSets(armor)) {
    const definition = ARMOR_SETS[set.material];
    definition.twoPieces.forEach((bonus) => addAffix(totals, bonus));
    if (set.pieces >= 3) {
      definition.threePieces.forEach((bonus) => addAffix(totals, bonus));
    }
  }
  return totals;
}

const clampToCap = (value: number, cap: number): number => Math.min(cap, value);

/**
 * Bonus dell'equipaggiamento già con i tetti (AFFIX_CONFIG[...].cap), pronti per Player.setEquipment.
 * La rarità dell'arma aggiunge un moltiplicatore al danno (RARITY_CONFIG.weaponDamageMultiplier).
 * La velocità può anche scendere (armature pesanti), ma non sotto -20%.
 */
export function computeEquipmentBonuses(weapon: WeaponItem | null, armor: Readonly<EquippedArmor>): EquipmentBonuses {
  const totals = computeEquipmentTotals(weapon, armor);
  const rarityDamage = weapon === null ? 1 : RARITY_CONFIG[weapon.rarity].weaponDamageMultiplier;
  const resistances: Partial<Record<ElementId, number>> = {};
  for (const element of ELEMENT_ORDER) {
    if (totals.resistances[element] > 0) {
      resistances[element] = clampToCap(totals.resistances[element], AFFIX_CONFIG.resistance.cap) / 100;
    }
  }
  const moveSpeed = Math.max(-AFFIX_CONFIG.moveSpeed.cap, clampToCap(totals.moveSpeed, AFFIX_CONFIG.moveSpeed.cap));
  return {
    damageMultiplier: rarityDamage * (1 + clampToCap(totals.damage, AFFIX_CONFIG.damage.cap) / 100),
    recoveryMultiplier: 1 - clampToCap(totals.recovery, AFFIX_CONFIG.recovery.cap) / 100,
    movementSpeedMultiplier: 1 + moveSpeed / 100,
    maxHealth: clampToCap(totals.maxHealth, AFFIX_CONFIG.maxHealth.cap),
    maxStamina: clampToCap(totals.maxStamina, AFFIX_CONFIG.maxStamina.cap),
    damageTakenMultiplier: 1 - clampToCap(totals.defense, AFFIX_CONFIG.defense.cap) / 100,
    lifeStealFraction: clampToCap(totals.lifeSteal, AFFIX_CONFIG.lifeSteal.cap) / 100,
    elements: [...totals.elements],
    breaksGuard: totals.breaksGuard,
    resistances,
  };
}

/** Una riga della scheda di un oggetto: etichetta, valore numerico (per il confronto) e testo. */
export interface ItemStatLine {
  key: string;
  label: string;
  value: number;
  text: string;
}

/**
 * Righe della scheda di un oggetto (statistiche base e modificatori sommati), nell'ordine dei modificatori.
 * Le chiavi servono al confronto con l'oggetto indossato (compareItemStats).
 */
export function describeItemStats(item: ItemInstance): ItemStatLine[] {
  const totals = getItemTotals(item);
  const lines: ItemStatLine[] = [];
  const signed = (value: number, suffix: string): string => `${value >= 0 ? "+" : ""}${value}${suffix}`;
  if (item.kind === "weapon") {
    // la rarità dell'arma alza il danno base
    const power = Math.round((RARITY_CONFIG[item.rarity].weaponDamageMultiplier - 1) * 100);
    if (power > 0) {
      lines.push({ key: "power", label: "POTENZA", value: power, text: `+${power}%` });
    }
  }
  for (const key of ["damage", "recovery", "moveSpeed", "lifeSteal", "defense", "maxHealth", "maxStamina"] as const) {
    const value = totals[key];
    if (value === 0) {
      continue;
    }
    const definition = AFFIX_CONFIG[key];
    const unit = definition.format === "percent" ? "%" : "";
    const text = definition.isReduction === true ? `-${value}%` : signed(value, unit);
    lines.push({ key, label: definition.label, value, text });
  }
  for (const element of ELEMENT_ORDER) {
    const value = totals.resistances[element];
    if (value > 0) {
      lines.push({ key: `resist-${element}`, label: `RESIST. ${ELEMENT_SHORT_NAMES[element]}`, value, text: `+${value}%` });
    }
  }
  for (const element of totals.elements) {
    lines.push({ key: `element-${element}`, label: `COLPI DI ${ELEMENT_SHORT_NAMES[element]}`, value: 1, text: "" });
  }
  if (totals.breaksGuard) {
    lines.push({ key: "breaksGuard", label: AFFIX_CONFIG.breaksGuard.label, value: 1, text: "" });
  }
  return lines;
}

/** Differenza tra un oggetto e quello indossato, per chiave (positiva = il nuovo è meglio). */
export function compareItemStats(candidate: ItemInstance, equipped: ItemInstance | null): Map<string, number> {
  const differences = new Map<string, number>();
  const candidateLines = describeItemStats(candidate);
  const equippedLines = equipped === null ? [] : describeItemStats(equipped);
  for (const line of candidateLines) {
    differences.set(line.key, line.value - (equippedLines.find((other) => other.key === line.key)?.value ?? 0));
  }
  for (const line of equippedLines) {
    if (!differences.has(line.key)) {
      differences.set(line.key, -line.value);
    }
  }
  return differences;
}
