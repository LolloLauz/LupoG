import type { GameAction } from "../types/GameTypes";

/** Pozioni che vanno nella borsa (Classi Fase 2: salute e mana), ognuna con i propri posti. */
export type PotionId = "healthPotion" | "manaPotion";

/** Tutti i tipi di pozione (ognuno è anche un oggetto di ITEM_CONFIG). */
export const POTION_IDS: readonly PotionId[] = ["healthPotion", "manaPotion"];

/** La borsa del giocatore: pozioni e armi, scelte con i tasti numerici (vedi Inventory). */
export const INVENTORY_CONFIG = {
  /** Posti nella borsa (uno per tasto numerico). */
  slotCount: 4,
  /** Pozioni che stanno in un solo posto. */
  maxPotionsPerSlot: 2,
  /**
   * Posti che possono contenere pozioni, per ogni tipo di pozione. Con 1 posto da 2 si portano al massimo 2 pozioni di
   * salute: conservarle per i boss aiuta molto (vedi BALANCE.md), quindi la scorta resta piccola. Le pozioni di mana
   * (Classi Fase 2) hanno un posto proprio, con lo stesso limite.
   */
  maxPotionSlots: 1,
  /** Posti dello zaino (equipaggiamento, E4): armi e armature di riserva, nella schermata dell'equipaggiamento. */
  backpackSize: 12,
} as const;

/** Tasto numerico di ogni posto della borsa, nell'ordine (posto 1 = tasto 1). */
export const BAG_SLOT_ACTIONS: readonly GameAction[] = ["bagSlot1", "bagSlot2", "bagSlot3", "bagSlot4"];
