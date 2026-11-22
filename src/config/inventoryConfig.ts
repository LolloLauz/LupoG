import type { GameAction } from "../types/GameTypes";

/** La borsa del giocatore: pozioni e armi, scelte con i tasti numerici (vedi Inventory). */
export const INVENTORY_CONFIG = {
  /** Posti nella borsa (uno per tasto numerico). */
  slotCount: 4,
  /** Pozioni che stanno in un solo posto. */
  maxPotionsPerSlot: 2,
  /**
   * Posti che possono contenere pozioni. Con 1 posto da 2 si portano al massimo 2 pozioni: conservarle per i boss
   * aiuta molto (vedi BALANCE.md), quindi la scorta resta piccola.
   */
  maxPotionSlots: 1,
} as const;

/** Tasto numerico di ogni posto della borsa, nell'ordine (posto 1 = tasto 1). */
export const BAG_SLOT_ACTIONS: readonly GameAction[] = ["bagSlot1", "bagSlot2", "bagSlot3", "bagSlot4"];
