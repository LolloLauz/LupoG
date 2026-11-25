import { ARMOR_CONFIG, ARMOR_MATERIAL_ORDER, ARMOR_SLOTS } from "../config/armorConfig";
import type { DifficultyId } from "../config/gameConfig";
import { CHARACTER_CONFIG } from "../config/characterConfig";
import { getWeaponAffinity } from "../config/weaponAffinityConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import { LOOT_DIFFICULTY_LEVEL_BONUS, LOOT_LEVEL_SCALE, LOOT_SOURCES, type LootSourceId } from "../config/lootConfig";
import { RARITY_ORDER, getRarityRank } from "../config/rarityConfig";
import { LEGENDARY_ITEMS, MYTHIC_ITEMS, type UniqueItemDefinition } from "../config/uniqueItemConfig";
import type { CharacterId, WeaponId } from "../types/EntityTypes";
import type { ArmorId, ArmorItem, ArmorMaterialId, ItemInstance, RarityId, WeaponItem } from "../types/ItemTypes";
import { createUniqueItem, pickRandom, rollArmorItem, rollRarity, rollWeaponItem, type RandomSource } from "./ItemFactory";

/** Dove e quando cade un oggetto: la fonte, il livello e la difficoltà. */
export interface LootContext {
  source: LootSourceId;
  levelId: number;
  difficulty: DifficultyId;
  /** Classe che riceve il bottino (Classi Fase 2): filtra il trofeo del boss finale. Se omessa: nessun filtro. */
  characterId?: CharacterId;
}

/** Pesi di rarità di una fonte al livello indicato (le rarità alte crescono con il livello e la difficoltà). */
export function getLootRarityWeights(context: LootContext): Partial<Record<RarityId, number>> {
  const baseWeights = LOOT_SOURCES[context.source].rarityWeights;
  const effectiveLevel = Math.max(1, context.levelId + LOOT_DIFFICULTY_LEVEL_BONUS[context.difficulty]);
  const weights: Partial<Record<RarityId, number>> = {};
  for (const rarity of RARITY_ORDER) {
    const weight = baseWeights[rarity];
    if (weight !== undefined && weight > 0) {
      weights[rarity] = weight * (1 + LOOT_LEVEL_SCALE * (effectiveLevel - 1) * getRarityRank(rarity));
    }
  }
  return weights;
}

/** Rarità estratta per una fonte. */
export function rollLootRarity(context: LootContext, random: RandomSource): RarityId {
  return rollRarity(getLootRarityWeights(context), random);
}

/** Un'arma del tipo indicato con la rarità della fonte (forzieri, élite, trofei dei boss). */
export function rollLootWeapon(baseId: WeaponId, context: LootContext, random: RandomSource): WeaponItem {
  return rollWeaponItem(baseId, rollLootRarity(context, random), random);
}

/**
 * Materiale di un'armatura secondo il livello: all'inizio stoffa e cuoio, poi ferro e acciaio.
 * Pesi: stoffa 5 - livello, cuoio 3, ferro livello - 1, acciaio livello - 3 (mai negativi).
 */
export function getArmorMaterialWeights(levelId: number): Record<ArmorMaterialId, number> {
  return {
    cloth: Math.max(0, 5 - levelId),
    leather: 3,
    iron: Math.max(0, levelId - 1),
    steel: Math.max(0, levelId - 3),
  };
}

/** Un pezzo d'armatura a caso (posto e materiale secondo il livello) con la rarità della fonte. */
export function rollLootArmor(context: LootContext, random: RandomSource): ArmorItem {
  const weights = getArmorMaterialWeights(context.levelId);
  const total = ARMOR_MATERIAL_ORDER.reduce((sum, material) => sum + weights[material], 0);
  let remaining = random() * total;
  let material: ArmorMaterialId = "leather";
  for (const candidate of ARMOR_MATERIAL_ORDER) {
    if (weights[candidate] > 0 && remaining < weights[candidate]) {
      material = candidate;
      break;
    }
    remaining -= weights[candidate];
  }
  const slot = pickRandom(ARMOR_SLOTS, random);
  const baseId = (Object.keys(ARMOR_CONFIG) as ArmorId[]).find((id) => ARMOR_CONFIG[id].material === material && ARMOR_CONFIG[id].slot === slot)!;
  return rollArmorItem(baseId, rollLootRarity(context, random), random);
}

/**
 * Filtro del bottino (Classi Fase 2, anticipo della Fase 3): un'arma vietata alla classe dalla tabella di compatibilità
 * diventa un'arma permessa. Prima l'arma iniziale della classe, se permessa; altrimenti la prima permessa di
 * WEAPON_CONFIG. Per il Mago ogni arma diventa un bastone; le altre classi oggi non hanno armi vietate a terra.
 */
export function resolveLootWeaponId(characterId: CharacterId, weaponId: WeaponId): WeaponId {
  if (getWeaponAffinity(characterId, weaponId).isAllowed) {
    return weaponId;
  }
  const startingWeaponId = CHARACTER_CONFIG[characterId].startingWeaponId;
  if (getWeaponAffinity(characterId, startingWeaponId).isAllowed) {
    return startingWeaponId;
  }
  return (Object.keys(WEAPON_CONFIG) as WeaponId[]).find((candidate) => getWeaponAffinity(characterId, candidate).isAllowed) ?? weaponId;
}

/**
 * Pozione di mana nel bottino (Classi Fase 2): solo per le classi con mana. Per le altre non si estrae niente, così il
 * generatore casuale del bottino resta quello di prima.
 */
export function rollManaPotionDrop(source: LootSourceId, characterId: CharacterId, random: RandomSource): boolean {
  const chance = LOOT_SOURCES[source].manaPotionChance;
  if (CHARACTER_CONFIG[characterId].maxMana <= 0 || chance <= 0) {
    return false;
  }
  return random() < chance;
}

/** Vero se la fonte lascia anche (o, per i nemici normali, solo) un pezzo d'armatura. */
export function rollArmorDrop(source: LootSourceId, random: RandomSource): boolean {
  return random() < LOOT_SOURCES[source].armorChance;
}

/**
 * Ricompensa del boss finale: un oggetto fisso, Mitico o Leggendario secondo i pesi della fonte "finalBoss".
 * È l'unica fonte dei Mitici.
 */
export function rollFinalBossReward(context: LootContext, random: RandomSource): ItemInstance {
  const rarity = rollLootRarity({ ...context, source: "finalBoss" }, random);
  // solo oggetti che la classe può usare (armature sempre; armi permesse dalla tabella di compatibilità)
  const usableIds = (catalog: Record<string, UniqueItemDefinition>): string[] =>
    Object.keys(catalog).filter((id) => {
      const item = catalog[id]!;
      return item.kind === "armor" || context.characterId === undefined || getWeaponAffinity(context.characterId, item.baseId).isAllowed;
    });
  const mythicIds = usableIds(MYTHIC_ITEMS);
  const ids = rarity === "mythic" && mythicIds.length > 0 ? mythicIds : usableIds(LEGENDARY_ITEMS);
  return createUniqueItem(pickRandom(ids, random))!;
}
