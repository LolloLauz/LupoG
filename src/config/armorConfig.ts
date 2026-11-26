import type { AffixRoll, ArmorId, ArmorMaterialId, ArmorSlot } from "../types/ItemTypes";
import { PALETTE } from "./gameConfig";

/**
 * Armature (fase E2): tre posti (elmo, corazza, stivali) e quattro materiali. Le statistiche base di un pezzo
 * crescono con la rarità (RARITY_CONFIG.armorStatMultiplier); i modificatori si aggiungono sopra.
 * Aspetto: nessuno sprite nuovo. Il pezzo ricolora la sua parte del personaggio con i quattro toni del materiale
 * (dal più scuro al più chiaro) e, dalla rarità Non comune in su, il tono più chiaro diventa il colore della rarità.
 * Vedi equipmentVisuals.ts.
 */
export const ARMOR_SLOTS: readonly ArmorSlot[] = ["helmet", "chest", "boots"];

export const ARMOR_SLOT_NAMES: Record<ArmorSlot, string> = { helmet: "ELMO", chest: "CORAZZA", boots: "STIVALI" };

/** Statistiche base di un pezzo (stessa unità dei modificatori: percentuali e punti). */
export interface ArmorStats {
  /** Riduzione del danno subito (%). */
  defense: number;
  maxHealth: number;
  maxStamina: number;
  /** Velocità di movimento (%): negativa per le armature pesanti. */
  moveSpeed: number;
}

export interface ArmorMaterialDefinition {
  id: ArmorMaterialId;
  name: string;
  /** Quattro toni dal più scuro al più chiaro (una rampa della palette). */
  tones: readonly [string, string, string, string];
}

export const ARMOR_MATERIALS: Record<ArmorMaterialId, ArmorMaterialDefinition> = {
  cloth: { id: "cloth", name: "STOFFA", tones: [PALETTE.bog, PALETTE.moss, PALETTE.olive, PALETTE.reed] },
  leather: { id: "leather", name: "CUOIO", tones: [PALETTE.earth, PALETTE.wood, PALETTE.woodLight, PALETTE.sand] },
  iron: { id: "iron", name: "FERRO", tones: [PALETTE.stoneShadow, PALETTE.stone, PALETTE.stoneLight, PALETTE.stonePale] },
  steel: { id: "steel", name: "ACCIAIO", tones: [PALETTE.slate, PALETTE.gray, PALETTE.lightGray, PALETTE.white] },
};

export const ARMOR_MATERIAL_ORDER: readonly ArmorMaterialId[] = ["cloth", "leather", "iron", "steel"];

/**
 * Peso delle armature (Classi Fase 3, stesse unità del peso delle armi): dal materiale, la corazza vale il doppio.
 * Per ora è solo un dato mostrato nella schermata dell'equipaggiamento; dalla Fase 4 richiede Forza.
 */
export const ARMOR_WEIGHT_BY_MATERIAL: Record<ArmorMaterialId, number> = { cloth: 1, leather: 2, iron: 3, steel: 4 };
export const ARMOR_WEIGHT_SLOT_FACTOR: Record<ArmorSlot, number> = { helmet: 1, chest: 2, boots: 1 };

export interface ArmorDefinition {
  id: ArmorId;
  name: string;
  slot: ArmorSlot;
  material: ArmorMaterialId;
  /** Peso del pezzo (vedi ARMOR_WEIGHT_BY_MATERIAL). */
  weight: number;
  /** Statistiche base (rarità Comune). */
  stats: ArmorStats;
  /** Icona 16x16 (a terra, nell'HUD e nella schermata dell'equipaggiamento), ricolorata con il materiale. */
  iconSpriteId: string;
}

const ICON_BY_SLOT: Record<ArmorSlot, string> = { helmet: "armorIconHelmet", chest: "armorIconChest", boots: "armorIconBoots" };

function piece(id: ArmorId, name: string, slot: ArmorSlot, material: ArmorMaterialId, stats: Partial<ArmorStats>): ArmorDefinition {
  const weight = ARMOR_WEIGHT_BY_MATERIAL[material] * ARMOR_WEIGHT_SLOT_FACTOR[slot];
  return { id, name, slot, material, weight, stats: { defense: 0, maxHealth: 0, maxStamina: 0, moveSpeed: 0, ...stats }, iconSpriteId: ICON_BY_SLOT[slot] };
}

/**
 * I dodici pezzi. Stoffa: leggera, dà stamina. Cuoio: un po' di difesa e velocità. Ferro: difesa e salute,
 * un po' più lenti. Acciaio: la difesa più alta, i più lenti. La corazza conta più di elmo e stivali.
 */
export const ARMOR_CONFIG: Record<ArmorId, ArmorDefinition> = {
  clothHelmet: piece("clothHelmet", "CAPPUCCIO", "helmet", "cloth", { maxStamina: 5 }),
  clothChest: piece("clothChest", "TUNICA", "chest", "cloth", { defense: 1, maxStamina: 10 }),
  clothBoots: piece("clothBoots", "CALZARI", "boots", "cloth", { maxStamina: 5, moveSpeed: 2 }),
  leatherHelmet: piece("leatherHelmet", "CUFFIA DI CUOIO", "helmet", "leather", { defense: 1 }),
  leatherChest: piece("leatherChest", "GIUBBA DI CUOIO", "chest", "leather", { defense: 2, maxHealth: 5 }),
  leatherBoots: piece("leatherBoots", "STIVALI DI CUOIO", "boots", "leather", { defense: 1, moveSpeed: 3 }),
  ironHelmet: piece("ironHelmet", "ELMO DI FERRO", "helmet", "iron", { defense: 2, maxHealth: 4 }),
  ironChest: piece("ironChest", "CORAZZA DI FERRO", "chest", "iron", { defense: 4, maxHealth: 8, moveSpeed: -2 }),
  ironBoots: piece("ironBoots", "SCHINIERI DI FERRO", "boots", "iron", { defense: 2, moveSpeed: -1 }),
  steelHelmet: piece("steelHelmet", "ELMO D'ACCIAIO", "helmet", "steel", { defense: 3, maxHealth: 4 }),
  steelChest: piece("steelChest", "CORAZZA D'ACCIAIO", "chest", "steel", { defense: 5, maxHealth: 10, moveSpeed: -4 }),
  steelBoots: piece("steelBoots", "SCHINIERI D'ACCIAIO", "boots", "steel", { defense: 3, moveSpeed: -2 }),
};

/** Set: due o tre pezzi dello stesso materiale danno un bonus (stesse regole e tetti dei modificatori). */
export interface ArmorSetDefinition {
  material: ArmorMaterialId;
  name: string;
  /** Bonus con due pezzi e, in aggiunta, con tutti e tre. */
  twoPieces: AffixRoll[];
  threePieces: AffixRoll[];
}

export const ARMOR_SETS: Record<ArmorMaterialId, ArmorSetDefinition> = {
  cloth: { material: "cloth", name: "SET DEL VIANDANTE", twoPieces: [{ id: "maxStamina", value: 10 }], threePieces: [{ id: "moveSpeed", value: 5 }] },
  leather: { material: "leather", name: "SET DEL PREDONE", twoPieces: [{ id: "moveSpeed", value: 4 }], threePieces: [{ id: "damage", value: 8 }] },
  iron: { material: "iron", name: "SET DEL SOLDATO", twoPieces: [{ id: "maxHealth", value: 8 }], threePieces: [{ id: "defense", value: 3 }] },
  steel: { material: "steel", name: "SET DEL GUARDIANO", twoPieces: [{ id: "defense", value: 3 }], threePieces: [{ id: "maxHealth", value: 12 }] },
};

export function isArmorId(value: unknown): value is ArmorId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ARMOR_CONFIG, value);
}

export function isArmorSlot(value: unknown): value is ArmorSlot {
  return typeof value === "string" && (ARMOR_SLOTS as readonly string[]).includes(value);
}
