import type { RarityId } from "../types/ItemTypes";
import type { DifficultyId } from "./gameConfig";

/**
 * Fonti di oggetti (fase E5): forzieri, nemici, nemici d'élite, boss, boss finale e bottega.
 * Ogni fonte ha i suoi pesi di rarità; avanzando nei livelli (e a difficoltà difficile) le rarità alte pesano di più.
 * I Mitici escono solo dal boss finale: nessun'altra fonte ha peso per "mythic".
 */
export type LootSourceId = "chest" | "enemy" | "elite" | "boss" | "finalBoss" | "shop";

export interface LootSourceDefinition {
  id: LootSourceId;
  /** Pesi di rarità al livello 1 (rarità senza peso = non escono da qui). */
  rarityWeights: Partial<Record<RarityId, number>>;
  /** Probabilità (0-1) di un pezzo d'armatura (in più dell'arma per forzieri, élite e boss; da solo per i nemici). */
  armorChance: number;
}

export const LOOT_SOURCES: Record<LootSourceId, LootSourceDefinition> = {
  chest: { id: "chest", rarityWeights: { common: 55, uncommon: 30, rare: 12, epic: 3, legendary: 0.4 }, armorChance: 0.35 },
  enemy: { id: "enemy", rarityWeights: { common: 70, uncommon: 25, rare: 5 }, armorChance: 0.04 },
  elite: { id: "elite", rarityWeights: { common: 35, uncommon: 35, rare: 20, epic: 8, legendary: 1 }, armorChance: 0.5 },
  boss: { id: "boss", rarityWeights: { rare: 50, epic: 38, legendary: 12 }, armorChance: 1 },
  finalBoss: { id: "finalBoss", rarityWeights: { legendary: 70, mythic: 30 }, armorChance: 0 },
  shop: { id: "shop", rarityWeights: { common: 45, uncommon: 35, rare: 15, epic: 5 }, armorChance: 0.5 },
};

/**
 * Crescita delle rarità con il livello: il peso di una rarità di grado r (Non comune = 1, Raro = 2, ...) si moltiplica
 * per 1 + LOOT_LEVEL_SCALE x (livello - 1) x r. Al livello 7 un Raro pesa circa il doppio che al livello 1.
 */
export const LOOT_LEVEL_SCALE = 0.08;

/** Livelli in più (o in meno) per la difficoltà: a difficile gli oggetti sono un po' migliori. */
export const LOOT_DIFFICULTY_LEVEL_BONUS: Record<DifficultyId, number> = { easy: 0, normal: 0, hard: 2 };
