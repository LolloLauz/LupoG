import { SHOP_HEAL_AMOUNT, SHOP_OFFERS, type ShopOfferId } from "../config/progressionConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import type { Player } from "../entities/Player";
import type { WeaponId } from "../types/EntityTypes";
import type { Inventory } from "./Inventory";
import type { ScoreManager } from "./ScoreManager";

/** Una voce della bottega: per l'arma, quale arma è in vendita. */
export interface ShopOffer {
  id: ShopOfferId;
  name: string;
  description: string;
  price: number;
  weaponId: WeaponId | null;
  isSoldOut: boolean;
}

/** Esito di un acquisto. */
export type PurchaseOutcome = "bought" | "notEnoughCoins" | "notNeeded" | "bagFull" | "soldOut";

/** Chi compra: la borsa, il giocatore (salute, munizioni in mano) e le monete. */
export interface ShopCustomer {
  inventory: Inventory;
  player: Player;
  scoreManager: ScoreManager;
}

/**
 * Bottega tra un livello e l'altro (Fase 6): pozione, cura, munizioni e, se c'è, un'arma già trovata che non è nella
 * borsa (scelta a caso a ogni apertura, si compra una volta sola). Solo logica: il disegno è in ScreenManager, il motore
 * aggiorna l'arma in mano dopo un acquisto.
 */
export class Shop {
  private constructor(public readonly offers: ShopOffer[]) {}

  /** Apre la bottega: l'arma in vendita viene dalle armi trovate che mancano nella borsa. */
  public static open(discoveredWeaponIds: readonly WeaponId[], inventory: Inventory, randomNumber: () => number = Math.random): Shop {
    const fixedOffers = (["potion", "heal", "ammo"] as const).map((id) => Shop.createOffer(id, null));
    const candidates = discoveredWeaponIds.filter((weaponId) => !inventory.hasWeapon(weaponId));
    if (candidates.length === 0) {
      return new Shop(fixedOffers);
    }
    const weaponId = candidates[Math.min(candidates.length - 1, Math.floor(randomNumber() * candidates.length))]!;
    return new Shop([...fixedOffers, Shop.createOffer("weapon", weaponId)]);
  }

  /** Compra la voce indicata, se le monete bastano e serve davvero (niente acquisti sprecati). */
  public buy(offerIndex: number, customer: ShopCustomer): PurchaseOutcome {
    const offer = this.offers[offerIndex];
    if (offer === undefined || offer.isSoldOut) {
      return "soldOut";
    }
    const { inventory, player, scoreManager } = customer;
    const refusal = Shop.findRefusal(offer, customer);
    if (refusal !== null) {
      return refusal;
    }
    if (!scoreManager.spendCoins(offer.price)) {
      return "notEnoughCoins";
    }
    switch (offer.id) {
      case "potion":
        inventory.addPotion();
        break;
      case "heal":
        player.heal(SHOP_HEAL_AMOUNT);
        break;
      case "ammo":
        inventory.refillAllAmmo();
        break;
      case "weapon":
        if (offer.weaponId !== null) {
          inventory.addWeapon(offer.weaponId);
        }
        offer.isSoldOut = true;
        break;
    }
    return "bought";
  }

  /** Perché un acquisto non si può fare (prima di spendere), oppure null. */
  private static findRefusal(offer: ShopOffer, customer: ShopCustomer): PurchaseOutcome | null {
    const { inventory, player, scoreManager } = customer;
    if (offer.price > scoreManager.coins) {
      return "notEnoughCoins";
    }
    if (offer.id === "potion" && !inventory.canAddPotion()) {
      return "bagFull";
    }
    if (offer.id === "heal" && player.currentHealth >= player.maxHealth) {
      return "notNeeded";
    }
    if (offer.id === "ammo" && !inventory.needsAmmo) {
      return "notNeeded";
    }
    if (offer.id === "weapon" && !inventory.hasFreeSlot) {
      return "bagFull";
    }
    return null;
  }

  private static createOffer(id: ShopOfferId, weaponId: WeaponId | null): ShopOffer {
    const definition = SHOP_OFFERS[id];
    const name = weaponId === null ? definition.name : WEAPON_CONFIG[weaponId].name.toUpperCase();
    return { id, name, description: definition.description, price: definition.price, weaponId, isSoldOut: false };
  }
}
