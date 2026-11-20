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
};
