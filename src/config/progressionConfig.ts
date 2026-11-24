import type { WeaponId } from "../types/EntityTypes";

/**
 * Progressione (Fase 6): monete e bottega durante la partita, gemme e potenziamenti permanenti tra una partita e l'altra.
 *
 * - Le **monete** si guadagnano nella partita (monete dei livelli, nemici, boss) e si spendono nella bottega che compare
 *   tra un livello e l'altro. Ogni nuova partita parte da zero; ricominciando un livello tornano quelle di inizio livello.
 * - Le **gemme** raccolte vengono messe da parte (salvate) quando si completa il livello e si spendono nei potenziamenti
 *   permanenti, dal menu del titolo.
 */
export const ECONOMY_CONFIG = {
  /** Monete per ogni nemico sconfitto (le élite ne danno eliteCoinMultiplier volte tanto). */
  coinsPerEnemy: 2,
  eliteCoinMultiplier: 3,
  /** Monete per un boss sconfitto. */
  coinsPerBoss: 50,
} as const;

/** Voci della bottega (Fase 6; l'armatura dal piano dell'equipaggiamento, E5). */
export type ShopOfferId = "potion" | "heal" | "ammo" | "weapon" | "armor";

export interface ShopOfferDefinition {
  id: ShopOfferId;
  name: string;
  description: string;
  price: number;
}

export const SHOP_OFFERS: Record<ShopOfferId, ShopOfferDefinition> = {
  potion: { id: "potion", name: "POZIONE", description: "Una pozione nella borsa", price: 40 },
  heal: { id: "heal", name: "CURA", description: "+40 HP subito", price: 25 },
  ammo: { id: "ammo", name: "FARETRA", description: "Munizioni piene", price: 20 },
  // l'arma in vendita cambia a ogni bottega: una di quelle già trovate (sbloccate) che non è nella borsa
  weapon: { id: "weapon", name: "ARMA", description: "Un'arma già trovata", price: 60 },
  // E5: un pezzo d'armatura a caso; arma e armatura hanno una rarità e costano secondo la rarità (getItemPrice)
  armor: { id: "armor", name: "ARMATURA", description: "Un pezzo d'armatura", price: 45 },
};

/**
 * Aumento del prezzo di armi e armature a ogni acquisto di equipaggiamento nella stessa visita (come in Dead Cells):
 * +25% per ogni oggetto già comprato. Niente rivendita.
 */
export const SHOP_PRICE_INCREASE_PER_PURCHASE = 0.25;

/** Salute recuperata con la voce "CURA". */
export const SHOP_HEAL_AMOUNT = 40;

/** Potenziamenti permanenti (Fase 6), comprati con le gemme dal menu del titolo. */
export type UpgradeId = "vitality" | "endurance" | "strength" | "supplies";

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  /** Descrizione di un livello del potenziamento. */
  description: string;
  /** Costo in gemme di ogni livello (la lunghezza è il livello massimo). */
  costs: number[];
}

export const UPGRADE_CONFIG: Record<UpgradeId, UpgradeDefinition> = {
  vitality: { id: "vitality", name: "VITALITÀ", description: "+10 salute massima", costs: [2, 3, 4] },
  endurance: { id: "endurance", name: "RESISTENZA", description: "+15 stamina massima", costs: [2, 3, 4] },
  strength: { id: "strength", name: "FORZA", description: "+5% danno", costs: [3, 4, 5] },
  supplies: { id: "supplies", name: "SCORTA", description: "+1 pozione a inizio partita", costs: [3, 5] },
};

export const UPGRADE_ORDER: readonly UpgradeId[] = ["vitality", "endurance", "strength", "supplies"];

/** Effetto di un livello di ogni potenziamento. */
export const UPGRADE_EFFECT_PER_LEVEL = {
  maxHealth: 10,
  maxStamina: 15,
  damageMultiplier: 0.05,
  startingPotions: 1,
} as const;

/** Bonus dei potenziamenti per i livelli comprati (li applica il motore al giocatore e alla borsa). */
export interface UpgradeBonuses {
  maxHealth: number;
  maxStamina: number;
  damageMultiplier: number;
  startingPotions: number;
}

export function computeUpgradeBonuses(levels: Readonly<Record<UpgradeId, number>>): UpgradeBonuses {
  return {
    maxHealth: levels.vitality * UPGRADE_EFFECT_PER_LEVEL.maxHealth,
    maxStamina: levels.endurance * UPGRADE_EFFECT_PER_LEVEL.maxStamina,
    damageMultiplier: 1 + levels.strength * UPGRADE_EFFECT_PER_LEVEL.damageMultiplier,
    startingPotions: levels.supplies * UPGRADE_EFFECT_PER_LEVEL.startingPotions,
  };
}

export const NO_UPGRADES: Readonly<Record<UpgradeId, number>> = { vitality: 0, endurance: 0, strength: 0, supplies: 0 };

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(UPGRADE_CONFIG, value);
}

/** Arma iniziale sempre "trovata" (sbloccata). */
export const ALWAYS_DISCOVERED_WEAPONS: readonly WeaponId[] = ["sword"];
