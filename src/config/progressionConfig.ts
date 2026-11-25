import type { WeaponId } from "../types/EntityTypes";

/**
 * Progressione (Fase 6): monete e bottega durante la partita.
 *
 * Le **monete** si guadagnano nella partita (monete e gemme dei livelli, nemici, boss) e si spendono nella bottega
 * che compare tra un livello e l'altro. Ogni nuova partita parte da zero; ricominciando un livello tornano quelle
 * di inizio livello.
 */
export const ECONOMY_CONFIG = {
  /** Monete per ogni nemico sconfitto (le élite ne danno eliteCoinMultiplier volte tanto). */
  coinsPerEnemy: 2,
  eliteCoinMultiplier: 3,
  /** Monete per un boss sconfitto. */
  coinsPerBoss: 50,
} as const;

/** Voci della bottega (Fase 6; l'armatura dal piano dell'equipaggiamento, E5). */
export type ShopOfferId = "potion" | "manaPotion" | "heal" | "ammo" | "weapon" | "armor";

export interface ShopOfferDefinition {
  id: ShopOfferId;
  name: string;
  description: string;
  price: number;
}

export const SHOP_OFFERS: Record<ShopOfferId, ShopOfferDefinition> = {
  potion: { id: "potion", name: "POZIONE", description: "Una pozione nella borsa", price: 40 },
  // Classi Fase 2: solo per chi ha mana, al posto della faretra (il bastone non ha munizioni)
  manaPotion: { id: "manaPotion", name: "POZIONE DI MANA", description: "Una pozione di mana nella borsa", price: 35 },
  heal: { id: "heal", name: "CURA", description: "+40 HP subito", price: 25 },
  ammo: { id: "ammo", name: "FARETRA", description: "Munizioni piene", price: 20 },
  // l'arma in vendita cambia a ogni bottega: una di quelle già trovate (sbloccate) che non è nella borsa
  weapon: { id: "weapon", name: "ARMA", description: "Un'arma già trovata", price: 60 },
  // E5: un pezzo d'armatura a caso; arma e armatura hanno una rarità e costano secondo la rarità (getItemPrice)
  armor: { id: "armor", name: "ARMATURA", description: "Un pezzo d'armatura", price: 45 },
};

/**
 * Voci fisse della bottega (oltre ad arma e armatura), Classi Fase 2: chi ha mana (il Mago) trova la pozione di mana al
 * posto della faretra, perché le sue armi non hanno munizioni.
 */
export const SHOP_BASIC_OFFERS: { readonly default: readonly ShopOfferId[]; readonly withMana: readonly ShopOfferId[] } = {
  default: ["potion", "heal", "ammo"],
  withMana: ["potion", "manaPotion", "heal"],
};

/**
 * Aumento del prezzo di armi e armature a ogni acquisto di equipaggiamento nella stessa visita (come in Dead Cells):
 * +25% per ogni oggetto già comprato. Niente rivendita.
 */
export const SHOP_PRICE_INCREASE_PER_PURCHASE = 0.25;

/** Salute recuperata con la voce "CURA". */
export const SHOP_HEAL_AMOUNT = 40;

/** Arma sempre in vendita nella bottega (oltre a quelle trovate nella partita), se non è nella borsa. */
export const ALWAYS_DISCOVERED_WEAPONS: readonly WeaponId[] = ["sword"];
