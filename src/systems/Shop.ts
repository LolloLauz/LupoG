import { ARMOR_CONFIG } from "../config/armorConfig";
import { SHOP_BASIC_OFFERS, SHOP_HEAL_AMOUNT, SHOP_OFFERS, SHOP_PRICE_INCREASE_PER_PURCHASE, type ShopOfferId } from "../config/progressionConfig";
import type { DifficultyId } from "../config/gameConfig";
import type { Player } from "../entities/Player";
import { CHARACTER_CONFIG, DEFAULT_CHARACTER_ID } from "../config/characterConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import type { CharacterId, WeaponId } from "../types/EntityTypes";
import type { ItemInstance } from "../types/ItemTypes";
import type { Inventory } from "./Inventory";
import { areItemsEqual, getItemName, getItemPrice, pickRandom, type RandomSource } from "./ItemFactory";
import { resolveLootWeaponId, rollLootArmor, rollLootWeapon } from "./LootSystem";
import type { ScoreManager } from "./ScoreManager";

/** Una voce della bottega: per arma e armatura, l'oggetto in vendita (con la sua rarità). */
export interface ShopOffer {
  id: ShopOfferId;
  name: string;
  description: string;
  price: number;
  /** Oggetto in vendita (arma o armatura), null per le altre voci. */
  item: ItemInstance | null;
  /** Tipo dell'arma in vendita (null per le altre voci). */
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
 * Livello raggiunto e difficoltà: decidono le rarità in vendita (più alte avanzando). characterId (Classi Fase 2):
 * la classe che compra, per il filtro delle armi e la pozione di mana (se omessa: il cavaliere).
 */
export interface ShopContext {
  levelId: number;
  difficulty: DifficultyId;
  characterId?: CharacterId;
}

/**
 * Bottega tra un livello e l'altro (Fase 6, E5-E6): pozione, cura, munizioni, un'arma già trovata che non è nella borsa
 * (scelta a caso a ogni apertura) e un pezzo d'armatura, entrambi con una rarità estratta (fonte "shop") e prezzo
 * secondo la rarità. Ogni acquisto di equipaggiamento alza il prezzo di quelli successivi nella stessa visita.
 * Solo logica: il disegno è in ScreenManager (o nella stanza del negozio), il motore aggiorna l'arma in mano.
 */
export class Shop {
  /** Oggetti d'equipaggiamento già comprati in questa visita (alzano i prezzi). */
  private equipmentPurchases = 0;

  private constructor(public readonly offers: ShopOffer[]) {}

  /**
   * Apre la bottega: l'arma in vendita viene dalle armi trovate che mancano nella borsa. Con lo stesso generatore
   * (seme) l'offerta è sempre la stessa.
   */
  public static open(
    discoveredWeaponIds: readonly WeaponId[],
    inventory: Inventory,
    randomNumber: RandomSource = Math.random,
    context: ShopContext = { levelId: 1, difficulty: "normal" }
  ): Shop {
    const characterId = context.characterId ?? DEFAULT_CHARACTER_ID;
    const basicOffers = CHARACTER_CONFIG[characterId].maxMana > 0 ? SHOP_BASIC_OFFERS.withMana : SHOP_BASIC_OFFERS.default;
    const offers = basicOffers.map((id) => Shop.createOffer(id, null));
    const lootContext = { source: "shop" as const, levelId: context.levelId, difficulty: context.difficulty };
    // armi vietate alla classe diventano armi permesse; se la classe ha armi vietate e ha già tutte quelle permesse,
    // in vendita c'è comunque una di quelle (un'arma di un'altra rarità prende il posto della sua).
    // Le classi con catalizzatore (il Mago) trovano sempre anche i catalizzatori tra i candidati (Classi Fase 3: la spada,
    // sempre scoperta e ora permessa al Mago, non deve togliere dalla bottega il bastone di un'altra rarità)
    const resolvedIds = [...new Set(discoveredWeaponIds.map((weaponId) => resolveLootWeaponId(characterId, weaponId)))];
    const hasForbiddenWeapons = discoveredWeaponIds.some((weaponId) => resolveLootWeaponId(characterId, weaponId) !== weaponId);
    const missingIds = resolvedIds.filter((weaponId) => !inventory.hasWeapon(weaponId));
    const focusIds = CHARACTER_CONFIG[characterId].usesSpellFocus === true ? resolvedIds.filter((weaponId) => WEAPON_CONFIG[weaponId].spellFocus !== undefined) : [];
    const withFocusIds = [...new Set([...missingIds, ...focusIds])];
    const candidates = withFocusIds.length === 0 && hasForbiddenWeapons ? resolvedIds : withFocusIds;
    if (candidates.length > 0) {
      const weaponId = pickRandom(candidates, randomNumber);
      const weapon = rollLootWeapon(weaponId, lootContext, randomNumber);
      // un'arma identica a una della borsa (il bastone Comune del Mago) non si mette in vendita
      if (!inventory.weaponItems.some((item) => areItemsEqual(item, weapon))) {
        offers.push(Shop.createOffer("weapon", weapon));
      }
    }
    offers.push(Shop.createOffer("armor", rollLootArmor(lootContext, randomNumber)));
    return new Shop(offers);
  }

  /** Prezzo attuale di una voce (arma e armatura salgono dopo ogni acquisto di equipaggiamento). */
  public getPrice(offer: ShopOffer): number {
    if (offer.item === null) {
      return offer.price;
    }
    return Math.round((offer.price * (1 + SHOP_PRICE_INCREASE_PER_PURCHASE * this.equipmentPurchases)) / 5) * 5;
  }

  /** Compra la voce indicata, se le monete bastano e serve davvero (niente acquisti sprecati). */
  public buy(offerIndex: number, customer: ShopCustomer): PurchaseOutcome {
    const offer = this.offers[offerIndex];
    if (offer === undefined || offer.isSoldOut) {
      return "soldOut";
    }
    const { inventory, player, scoreManager } = customer;
    const price = this.getPrice(offer);
    const refusal = Shop.findRefusal(offer, price, customer);
    if (refusal !== null) {
      return refusal;
    }
    if (!scoreManager.spendCoins(price)) {
      return "notEnoughCoins";
    }
    switch (offer.id) {
      case "potion":
        inventory.addPotion();
        break;
      case "manaPotion":
        inventory.addPotion("manaPotion");
        break;
      case "heal":
        player.heal(SHOP_HEAL_AMOUNT);
        break;
      case "ammo":
        inventory.refillAllAmmo();
        break;
      case "weapon":
      case "armor":
        Shop.deliver(offer.item, inventory);
        offer.isSoldOut = true;
        this.equipmentPurchases += 1;
        break;
    }
    return "bought";
  }

  /** L'oggetto comprato: un'arma entra nella borsa (o, se è piena, nello zaino); un'armatura si indossa o va nello zaino. */
  private static deliver(item: ItemInstance | null, inventory: Inventory): void {
    if (item === null) {
      return;
    }
    if (item.kind === "armor") {
      inventory.pickUpArmor(item);
    } else if (inventory.hasFreeSlot || inventory.hasWeapon(item.baseId)) {
      // un'arma dello stesso tipo prende il posto della vecchia, che va nello zaino (bastone del Mago)
      const result = inventory.addWeapon(item);
      if (result.droppedItem !== undefined) {
        inventory.addToBackpack(result.droppedItem, result.droppedAmmo ?? null);
      }
    } else {
      inventory.addToBackpack(item);
    }
  }

  /** Perché un acquisto non si può fare (prima di spendere), oppure null. */
  private static findRefusal(offer: ShopOffer, price: number, customer: ShopCustomer): PurchaseOutcome | null {
    const { inventory, player, scoreManager } = customer;
    if (price > scoreManager.coins) {
      return "notEnoughCoins";
    }
    if (offer.id === "potion" && !inventory.canAddPotion()) {
      return "bagFull";
    }
    if (offer.id === "manaPotion" && !inventory.canAddPotion("manaPotion")) {
      return "bagFull";
    }
    if (offer.id === "heal" && player.currentHealth >= player.maxHealth) {
      return "notNeeded";
    }
    if (offer.id === "ammo" && !inventory.needsAmmo) {
      return "notNeeded";
    }
    // un'arma identica a una della borsa (il bastone del Mago, stessa rarità e stessi modificatori) non serve
    if (offer.id === "weapon" && offer.item?.kind === "weapon" && inventory.weaponItems.some((item) => areItemsEqual(item, offer.item!))) {
      return "notNeeded";
    }
    if (offer.id === "weapon" && !inventory.hasBackpackRoom && (!inventory.hasFreeSlot || (offer.weaponId !== null && inventory.hasWeapon(offer.weaponId)))) {
      return "bagFull";
    }
    if (offer.id === "armor" && offer.item?.kind === "armor") {
      const isSlotFree = inventory.equippedArmor[ARMOR_CONFIG[offer.item.baseId].slot] === null;
      if (!isSlotFree && !inventory.hasBackpackRoom) {
        return "bagFull";
      }
    }
    return null;
  }

  private static createOffer(id: ShopOfferId, item: ItemInstance | null): ShopOffer {
    const definition = SHOP_OFFERS[id];
    return {
      id,
      name: item === null ? definition.name : getItemName(item),
      description: definition.description,
      price: item === null ? definition.price : getItemPrice(item),
      item,
      weaponId: item?.kind === "weapon" ? item.baseId : null,
      isSoldOut: false,
    };
  }
}
