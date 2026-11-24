import type { ElementId, WeaponId } from "./EntityTypes";

/**
 * Equipaggiamento (piano dell'equipaggiamento, fasi E1-E6): un oggetto è un tipo di base (arma o pezzo d'armatura)
 * con una rarità e dei modificatori (affissi). Solo dati: le regole sono in systems/ItemFactory.ts e
 * systems/EquipmentStats.ts, i valori in config/rarityConfig.ts, affixConfig.ts, armorConfig.ts e uniqueItemConfig.ts.
 */

/** Rarità, dalla più comune alla più rara (vedi RARITY_CONFIG). */
export type RarityId = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

/** Rarità che si estraggono a caso (le altre sono oggetti fissi, disegnati a mano). */
export type RolledRarityId = "uncommon" | "rare" | "epic";

/** Posti dell'armatura (E2). */
export type ArmorSlot = "helmet" | "chest" | "boots";

/** Materiali (famiglie) delle armature: decidono statistiche, colori e set. */
export type ArmorMaterialId = "cloth" | "leather" | "iron" | "steel";

/** Pezzo d'armatura: materiale + posto (es. "ironHelmet"). */
export type ArmorId = `${ArmorMaterialId}${Capitalize<ArmorSlot>}`;

/**
 * Modificatori. I valori sono interi: percentuali per danno, recupero, velocità, difesa, furto di vita e resistenza,
 * punti per salute e stamina; element e breaksGuard sono "di stile" (cambiano il modo di giocare, valore 0).
 */
export type AffixId =
  | "damage"
  | "recovery"
  | "moveSpeed"
  | "lifeSteal"
  | "maxHealth"
  | "maxStamina"
  | "defense"
  | "resistance"
  | "element"
  | "breaksGuard";

/** Un modificatore estratto: per element e resistance anche l'elemento. */
export interface AffixRoll {
  id: AffixId;
  value: number;
  element?: ElementId;
}

interface ItemBase {
  rarity: RarityId;
  affixes: AffixRoll[];
  /** Oggetti fissi (Leggendari e Mitici): id in LEGENDARY_ITEMS o MYTHIC_ITEMS. */
  uniqueId?: string;
}

export interface WeaponItem extends ItemBase {
  kind: "weapon";
  baseId: WeaponId;
}

export interface ArmorItem extends ItemBase {
  kind: "armor";
  baseId: ArmorId;
}

export type ItemInstance = WeaponItem | ArmorItem;

/** Pezzi d'armatura indossati (null = posto vuoto). */
export type EquippedArmor = Record<ArmorSlot, ArmorItem | null>;

/**
 * Bonus totali dell'equipaggiamento (arma in mano e armature indossate), già con i tetti:
 * li applica Player in un punto solo (setEquipment).
 */
export interface EquipmentBonuses {
  /** Moltiplicatore del danno inflitto (rarità dell'arma, modificatori, set). */
  damageMultiplier: number;
  /** Moltiplicatore del recupero tra un attacco e l'altro (meno di 1 = più rapido). */
  recoveryMultiplier: number;
  movementSpeedMultiplier: number;
  maxHealth: number;
  maxStamina: number;
  /** Moltiplicatore del danno subito (meno di 1 = difesa). */
  damageTakenMultiplier: number;
  /** Frazione del danno inflitto che torna in salute. */
  lifeStealFraction: number;
  /** Elementi dati ai colpi. */
  elements: ElementId[];
  breaksGuard: boolean;
  /** Riduzione (0-1) del danno dei colpi di quell'elemento. */
  resistances: Partial<Record<ElementId, number>>;
}
