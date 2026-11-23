import { INVENTORY_CONFIG } from "../config/inventoryConfig";
import { DEFAULT_WEAPON_ID, WEAPON_CONFIG } from "../config/weaponConfig";
import type { WeaponId } from "../types/EntityTypes";

/** Contenuto di un posto della borsa. */
export type BagSlot = { kind: "weapon"; weaponId: WeaponId; ammo?: number } | { kind: "potion"; count: number };

/** Copia della borsa (per ripristinarla quando si ricomincia un livello). */
export interface InventorySnapshot {
  slots: Array<BagSlot | null>;
  equippedSlotIndex: number;
}

/** Esito dell'aggiunta di un'arma. */
export interface WeaponAddResult {
  /**
   * added = in un posto libero; swapped = al posto dell'arma in mano; duplicate = c'è già;
   * refilled = c'era già un'arma con munizioni, ora di nuovo piene.
   */
  outcome: "added" | "swapped" | "duplicate" | "refilled";
  /** Arma tolta dalla borsa (da lasciare a terra) quando la borsa era piena, e le sue munizioni. */
  droppedWeaponId: WeaponId | null;
  droppedAmmo?: number;
}

/**
 * Esito di "lascia a terra" (tasto Q): un'arma (con le sue munizioni) o una pozione da mettere a terra;
 * lastWeapon = è l'unica arma, non si lascia; empty = posto vuoto.
 */
export type SlotDrop =
  | { kind: "weapon"; weaponId: WeaponId; ammo: number | null }
  | { kind: "potion" }
  | { kind: "lastWeapon" }
  | { kind: "empty" };

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

  /** Munizioni dell'arma in mano (null = infinite). */
  public get equippedAmmo(): number | null {
    const slot = this.slots[this.equippedIndex];
    return slot?.kind === "weapon" && slot.ammo !== undefined ? slot.ammo : null;
  }

  /** Aggiorna le munizioni dell'arma in mano (le armi senza munizioni le ignorano). */
  public setEquippedAmmo(ammo: number): void {
    const slot = this.slots[this.equippedIndex];
    if (slot?.kind === "weapon" && slot.ammo !== undefined) {
      slot.ammo = ammo;
    }
  }

  /** Aggiunge munizioni a un'arma della borsa (es. coltello recuperato). false se l'arma non c'è o è già piena. */
  public addAmmo(weaponId: WeaponId, amount: number): boolean {
    const slot = this.slots.find((candidate) => candidate?.kind === "weapon" && candidate.weaponId === weaponId);
    const max = WEAPON_CONFIG[weaponId].ammo?.max;
    if (slot === undefined || slot === null || slot.kind !== "weapon" || slot.ammo === undefined || max === undefined || slot.ammo >= max) {
      return false;
    }
    slot.ammo = Math.min(max, slot.ammo + amount);
    return true;
  }

  /**
   * Toglie un'arma dalla borsa (giavellotti finiti). Se era quella in mano si impugna la prima arma
   * rimasta; senza armi, al suo posto torna la spada. Restituisce l'arma in mano dopo la rimozione.
   */
  public removeWeapon(weaponId: WeaponId): WeaponId {
    const index = this.slots.findIndex((slot) => slot?.kind === "weapon" && slot.weaponId === weaponId);
    if (index >= 0) {
      this.slots[index] = null;
      if (this.weaponIds.length === 0) {
        this.slots[index] = Inventory.createWeaponSlot(DEFAULT_WEAPON_ID);
      }
      if (index === this.equippedIndex || this.slots[this.equippedIndex]?.kind !== "weapon") {
        this.equippedIndex = this.slots.findIndex((slot) => slot?.kind === "weapon");
      }
    }
    return this.equippedWeaponId;
  }

  /** Vero se almeno un'arma della borsa non ha le munizioni piene. */
  public get needsAmmo(): boolean {
    return this.slots.some((slot) => {
      const max = slot?.kind === "weapon" ? WEAPON_CONFIG[slot.weaponId].ammo?.max : undefined;
      return slot?.kind === "weapon" && slot.ammo !== undefined && max !== undefined && slot.ammo < max;
    });
  }

  /** Vero se c'è un posto vuoto. */
  public get hasFreeSlot(): boolean {
    return this.slots.includes(null);
  }

  /** Faretra: munizioni piene per tutte le armi della borsa che ne hanno. false se erano già tutte piene. */
  public refillAllAmmo(): boolean {
    let hasRefilled = false;
    for (const slot of this.slots) {
      const max = slot?.kind === "weapon" ? WEAPON_CONFIG[slot.weaponId].ammo?.max : undefined;
      if (slot?.kind === "weapon" && slot.ammo !== undefined && max !== undefined && slot.ammo < max) {
        slot.ammo = max;
        hasRefilled = true;
      }
    }
    return hasRefilled;
  }

  /**
   * Toglie il contenuto di un posto per lasciarlo a terra: l'arma intera (con le munizioni) o una sola pozione.
   * L'ultima arma non si lascia (in mano ce n'è sempre una). Se si lascia l'arma in mano si impugna la prima rimasta.
   */
  public dropSlot(slotIndex: number): SlotDrop {
    const slot = this.slots[slotIndex];
    if (slot === undefined || slot === null) {
      return { kind: "empty" };
    }
    if (slot.kind === "potion") {
      this.consumePotion(slotIndex);
      return { kind: "potion" };
    }
    if (this.weaponIds.length <= 1) {
      return { kind: "lastWeapon" };
    }
    this.slots[slotIndex] = null;
    if (slotIndex === this.equippedIndex) {
      this.equippedIndex = this.slots.findIndex((candidate) => candidate?.kind === "weapon");
    }
    return { kind: "weapon", weaponId: slot.weaponId, ammo: slot.ammo ?? null };
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
  public addWeapon(weaponId: WeaponId, ammo: number | null = null): WeaponAddResult {
    const existing = this.slots.find((slot) => slot?.kind === "weapon" && slot.weaponId === weaponId);
    if (existing !== undefined && existing !== null && existing.kind === "weapon") {
      // un'arma con munizioni già nella borsa: le munizioni tornano piene
      const max = WEAPON_CONFIG[weaponId].ammo?.max;
      if (max !== undefined && existing.ammo !== undefined && existing.ammo < max) {
        existing.ammo = max;
        return { outcome: "refilled", droppedWeaponId: null };
      }
      return { outcome: "duplicate", droppedWeaponId: null };
    }
    const newSlot = Inventory.createWeaponSlot(weaponId, ammo);
    const freeIndex = this.slots.indexOf(null);
    if (freeIndex >= 0) {
      this.slots[freeIndex] = newSlot;
      this.equippedIndex = freeIndex;
      return { outcome: "added", droppedWeaponId: null };
    }
    const droppedWeaponId = this.equippedWeaponId;
    const droppedAmmo = this.equippedAmmo ?? undefined;
    this.slots[this.equippedIndex] = newSlot;
    return { outcome: "swapped", droppedWeaponId, droppedAmmo };
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
      slots[index] = Inventory.createWeaponSlot(weaponId);
    });
    return slots;
  }

  /** Posto per un'arma; le armi con munizioni partono con quelle indicate (o piene). */
  private static createWeaponSlot(weaponId: WeaponId, ammo: number | null = null): BagSlot {
    const max = WEAPON_CONFIG[weaponId].ammo?.max;
    return max === undefined ? { kind: "weapon", weaponId } : { kind: "weapon", weaponId, ammo: Math.min(max, ammo ?? max) };
  }
}
