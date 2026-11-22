import { INVENTORY_CONFIG } from "../config/inventoryConfig";
import { DEFAULT_WEAPON_ID } from "../config/weaponConfig";
import type { WeaponId } from "../types/EntityTypes";

/** Contenuto di un posto della borsa. */
export type BagSlot = { kind: "weapon"; weaponId: WeaponId } | { kind: "potion"; count: number };

/** Copia della borsa (per ripristinarla quando si ricomincia un livello). */
export interface InventorySnapshot {
  slots: Array<BagSlot | null>;
  equippedSlotIndex: number;
}

/** Esito dell'aggiunta di un'arma. */
export interface WeaponAddResult {
  /** added = in un posto libero; swapped = al posto dell'arma in mano; duplicate = c'è già. */
  outcome: "added" | "swapped" | "duplicate";
  /** Arma tolta dalla borsa (da lasciare a terra) quando la borsa era piena. */
  droppedWeaponId: WeaponId | null;
}

/** Cosa comporta la scelta di un posto con il tasto numerico. */
export type SlotSelection = { kind: "equip"; weaponId: WeaponId } | { kind: "potion" } | { kind: "empty" };

/**
 * La borsa: un numero fisso di posti, ognuno con un'arma o con un gruppo di pozioni.
 * C'è sempre almeno un'arma, quella in mano (equippedSlotIndex). Solo logica: niente disegno,
 * niente giocatore (il motore applica gli effetti: impugnare l'arma, bere la pozione).
 */
export class Inventory {
  private slots: Array<BagSlot | null>;
  private equippedIndex = 0;

  constructor(private readonly slotCount: number = INVENTORY_CONFIG.slotCount) {
    this.slots = Inventory.createSlots(slotCount, [DEFAULT_WEAPON_ID]);
  }

  /** Posti della borsa (null = vuoto), in ordine. */
  public get bagSlots(): ReadonlyArray<BagSlot | null> {
    return this.slots;
  }

  public get equippedSlotIndex(): number {
    return this.equippedIndex;
  }

  public get equippedWeaponId(): WeaponId {
    const slot = this.slots[this.equippedIndex];
    return slot?.kind === "weapon" ? slot.weaponId : DEFAULT_WEAPON_ID;
  }

  /** Armi nella borsa, nell'ordine dei posti. */
  public get weaponIds(): WeaponId[] {
    return this.slots.flatMap((slot) => (slot?.kind === "weapon" ? [slot.weaponId] : []));
  }

  public get potionCount(): number {
    return this.slots.reduce((total, slot) => total + (slot?.kind === "potion" ? slot.count : 0), 0);
  }

  public hasWeapon(weaponId: WeaponId): boolean {
    return this.weaponIds.includes(weaponId);
  }

  /** Borsa nuova: le armi indicate (al massimo una per posto, senza doppioni), nessuna pozione. */
  public reset(weaponIds: readonly WeaponId[], equippedWeaponId: WeaponId): void {
    const uniqueWeapons = [...new Set(weaponIds.length > 0 ? weaponIds : [DEFAULT_WEAPON_ID])];
    this.slots = Inventory.createSlots(this.slotCount, uniqueWeapons);
    const equippedIndex = this.slots.findIndex((slot) => slot?.kind === "weapon" && slot.weaponId === equippedWeaponId);
    this.equippedIndex = equippedIndex >= 0 ? equippedIndex : 0;
  }

  /**
   * Mette un'arma nella borsa e la impugna: in un posto libero se c'è, altrimenti al posto
   * dell'arma in mano (che va lasciata a terra). Un'arma già presente non viene presa.
   */
  public addWeapon(weaponId: WeaponId): WeaponAddResult {
    if (this.hasWeapon(weaponId)) {
      return { outcome: "duplicate", droppedWeaponId: null };
    }
    const freeIndex = this.slots.indexOf(null);
    if (freeIndex >= 0) {
      this.slots[freeIndex] = { kind: "weapon", weaponId };
      this.equippedIndex = freeIndex;
      return { outcome: "added", droppedWeaponId: null };
    }
    const droppedWeaponId = this.equippedWeaponId;
    this.slots[this.equippedIndex] = { kind: "weapon", weaponId };
    return { outcome: "swapped", droppedWeaponId };
  }

  /** Aggiunge una pozione: nel gruppo di pozioni non pieno, altrimenti in un posto libero. false se non c'è spazio. */
  public addPotion(): boolean {
    const stack = this.slots.find((slot) => slot?.kind === "potion" && slot.count < INVENTORY_CONFIG.maxPotionsPerSlot);
    if (stack !== undefined && stack !== null && stack.kind === "potion") {
      stack.count += 1;
      return true;
    }
    const freeIndex = this.slots.indexOf(null);
    if (freeIndex < 0 || this.potionSlotCount >= INVENTORY_CONFIG.maxPotionSlots) {
      return false;
    }
    this.slots[freeIndex] = { kind: "potion", count: 1 };
    return true;
  }

  /** Vero se una pozione entrerebbe nella borsa. */
  public canAddPotion(): boolean {
    const hasRoomInStack = this.slots.some((slot) => slot?.kind === "potion" && slot.count < INVENTORY_CONFIG.maxPotionsPerSlot);
    return hasRoomInStack || (this.slots.includes(null) && this.potionSlotCount < INVENTORY_CONFIG.maxPotionSlots);
  }

  private get potionSlotCount(): number {
    return this.slots.filter((slot) => slot?.kind === "potion").length;
  }

  /** Scelta di un posto (0 = tasto 1). Un'arma diventa quella in mano; per le pozioni decide il motore (consumePotion). */
  public selectSlot(slotIndex: number): SlotSelection {
    const slot = this.slots[slotIndex];
    if (slot === undefined || slot === null) {
      return { kind: "empty" };
    }
    if (slot.kind === "weapon") {
      this.equippedIndex = slotIndex;
      return { kind: "equip", weaponId: slot.weaponId };
    }
    return { kind: "potion" };
  }

  /** Toglie una pozione dal posto indicato (il posto si libera quando finiscono). false se lì non ci sono pozioni. */
  public consumePotion(slotIndex: number): boolean {
    const slot = this.slots[slotIndex];
    if (slot === undefined || slot === null || slot.kind !== "potion") {
      return false;
    }
    slot.count -= 1;
    if (slot.count <= 0) {
      this.slots[slotIndex] = null;
    }
    return true;
  }

  public snapshot(): InventorySnapshot {
    return { slots: this.slots.map((slot) => (slot === null ? null : { ...slot })), equippedSlotIndex: this.equippedIndex };
  }

  public restore(snapshot: InventorySnapshot): void {
    this.slots = snapshot.slots.map((slot) => (slot === null ? null : { ...slot }));
    this.equippedIndex = snapshot.equippedSlotIndex;
  }

  private static createSlots(slotCount: number, weaponIds: readonly WeaponId[]): Array<BagSlot | null> {
    const slots: Array<BagSlot | null> = Array.from({ length: slotCount }, () => null);
    weaponIds.slice(0, slotCount).forEach((weaponId, index) => {
      slots[index] = { kind: "weapon", weaponId };
    });
    return slots;
  }
}
