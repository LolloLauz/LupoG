import type { RarityId } from "../types/ItemTypes";
import { PALETTE } from "./gameConfig";

/**
 * Rarità degli oggetti (fase E1 del piano dell'equipaggiamento). La rarità decide soprattutto quanti modificatori
 * ha un oggetto (affixCount); Leggendari e Mitici sono oggetti fissi, decisi a mano (uniqueItemConfig.ts).
 * I colori sono quelli consueti: grigio, verde, blu, viola, arancione, rosso. Con il colore si disegnano il nome,
 * il bagliore a terra, il metallo delle armi e il riflesso delle armature (nessuno sprite nuovo: solo ricolorazioni).
 */
export interface RarityDefinition {
  id: RarityId;
  name: string;
  /** Colore del nome e del bagliore a terra. */
  color: string;
  /** Metallo delle armi di questa rarità: tono pieno e riflesso. */
  weaponColors: { metal: string; shine: string };
  /** Peso nei drop di base (vedi lootConfig.ts per le fonti). 0 = non esce mai a caso. */
  dropWeight: number;
  /** Moltiplicatore del prezzo nella bottega. */
  priceMultiplier: number;
  /** Modificatori estratti a caso (0 per Comune, Leggendario e Mitico). */
  affixCount: number;
  /** Vero per gli oggetti fissi (Leggendario, Mitico). */
  isFixed: boolean;
  /** Danno base dell'arma (moltiplicatore) e statistiche base delle armature (moltiplicatore). */
  weaponDamageMultiplier: number;
  armorStatMultiplier: number;
}

export const RARITY_CONFIG: Record<RarityId, RarityDefinition> = {
  common: {
    id: "common",
    name: "COMUNE",
    color: PALETTE.lightGray,
    weaponColors: { metal: PALETTE.lightGray, shine: PALETTE.white },
    dropWeight: 60,
    priceMultiplier: 1,
    affixCount: 0,
    isFixed: false,
    weaponDamageMultiplier: 1,
    armorStatMultiplier: 1,
  },
  uncommon: {
    id: "uncommon",
    name: "NON COMUNE",
    color: PALETTE.lightGreen,
    weaponColors: { metal: PALETTE.green, shine: PALETTE.lightGreen },
    dropWeight: 26,
    priceMultiplier: 1.5,
    affixCount: 1,
    isFixed: false,
    weaponDamageMultiplier: 1.04,
    armorStatMultiplier: 1.15,
  },
  rare: {
    id: "rare",
    name: "RARO",
    color: PALETTE.lightBlue,
    weaponColors: { metal: PALETTE.lightBlue, shine: PALETTE.cyan },
    dropWeight: 10,
    priceMultiplier: 2.2,
    affixCount: 2,
    isFixed: false,
    weaponDamageMultiplier: 1.08,
    armorStatMultiplier: 1.3,
  },
  epic: {
    id: "epic",
    name: "EPICO",
    color: PALETTE.lilac,
    weaponColors: { metal: PALETTE.lilac, shine: PALETTE.lavender },
    dropWeight: 3.5,
    priceMultiplier: 3.2,
    affixCount: 3,
    isFixed: false,
    weaponDamageMultiplier: 1.12,
    armorStatMultiplier: 1.45,
  },
  legendary: {
    id: "legendary",
    name: "LEGGENDARIO",
    color: PALETTE.orange,
    weaponColors: { metal: PALETTE.goldLight, shine: PALETTE.cream },
    dropWeight: 0.5,
    priceMultiplier: 5,
    affixCount: 0,
    isFixed: true,
    weaponDamageMultiplier: 1.16,
    armorStatMultiplier: 1.6,
  },
  mythic: {
    id: "mythic",
    name: "MITICO",
    color: PALETTE.red,
    weaponColors: { metal: PALETTE.flame, shine: PALETTE.orange },
    dropWeight: 0,
    priceMultiplier: 8,
    affixCount: 0,
    isFixed: true,
    weaponDamageMultiplier: 1.2,
    armorStatMultiplier: 1.8,
  },
};

/** Dalla più comune alla più rara. */
export const RARITY_ORDER: readonly RarityId[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export function isRarityId(value: unknown): value is RarityId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RARITY_CONFIG, value);
}

/** Posizione della rarità in RARITY_ORDER (0 = Comune): serve a confrontarle. */
export function getRarityRank(rarity: RarityId): number {
  return RARITY_ORDER.indexOf(rarity);
}
