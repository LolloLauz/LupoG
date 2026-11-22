import type { PowerUpId } from "../types/EntityTypes";
import type { ItemTypeId } from "../types/LevelTypes";

/** Definizione di un oggetto raccoglibile. Per aggiungerne uno: voce qui + sprite in itemSprites.ts. */
export interface ItemDefinition {
  id: ItemTypeId;
  name: string;
  spriteId: string;
  /** Salute recuperata. */
  healAmount: number;
  /** Punti bonus. */
  scoreBonus: number;
  /** Se vero viene contato tra gli oggetti collezionabili del livello. */
  isCollectible: boolean;
  /** Power-up attivato raccogliendo l'oggetto (vedi powerUpConfig.ts). */
  powerUpId?: PowerUpId;
  /**
   * Oggetto da borsa (la pozione): non si usa toccandolo, si raccoglie con E e si usa dopo
   * con il tasto numerico del suo posto (vedi Inventory). healAmount vale quando lo si beve.
   */
  storedInBag?: boolean;
}

export const ITEM_SIZE = 8;

export const ITEM_CONFIG: Record<ItemTypeId, ItemDefinition> = {
  healthPotion: {
    id: "healthPotion",
    name: "Pozione",
    spriteId: "itemPotion",
    healAmount: 30,
    scoreBonus: 0,
    isCollectible: false,
    storedInBag: true,
  },
  scoreCoin: {
    id: "scoreCoin",
    name: "Moneta",
    spriteId: "itemCoin",
    healAmount: 0,
    scoreBonus: 50,
    isCollectible: false,
  },
  collectible: {
    id: "collectible",
    name: "Gemma",
    spriteId: "itemGem",
    healAmount: 0,
    scoreBonus: 200,
    isCollectible: true,
  },
  powerBerserk: {
    id: "powerBerserk",
    name: "Runa della Furia",
    spriteId: "itemBerserk",
    healAmount: 0,
    scoreBonus: 25,
    isCollectible: false,
    powerUpId: "berserk",
  },
  powerSpeed: {
    id: "powerSpeed",
    name: "Stivali Alati",
    spriteId: "itemSpeed",
    healAmount: 0,
    scoreBonus: 25,
    isCollectible: false,
    powerUpId: "speed",
  },
  powerShield: {
    id: "powerShield",
    name: "Scudo Benedetto",
    spriteId: "itemShield",
    healAmount: 0,
    scoreBonus: 25,
    isCollectible: false,
    powerUpId: "shield",
  },
  powerFire: {
    id: "powerFire",
    name: "Fiamma Eterna",
    spriteId: "itemFire",
    healAmount: 0,
    scoreBonus: 25,
    isCollectible: false,
    powerUpId: "fire",
  },
  powerRegeneration: {
    id: "powerRegeneration",
    name: "Erba della Vita",
    spriteId: "itemRegeneration",
    healAmount: 0,
    scoreBonus: 25,
    isCollectible: false,
    powerUpId: "regeneration",
  },
};
