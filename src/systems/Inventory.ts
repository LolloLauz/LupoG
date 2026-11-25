import { ARMOR_CONFIG, ARMOR_SLOTS } from "../config/armorConfig";
import { INVENTORY_CONFIG } from "../config/inventoryConfig";
import { DEFAULT_WEAPON_ID, WEAPON_CONFIG } from "../config/weaponConfig";
import type { WeaponId } from "../types/EntityTypes";
import type { ArmorItem, ArmorSlot, EquippedArmor, ItemInstance, WeaponItem } from "../types/ItemTypes";
import { EMPTY_ARMOR } from "./EquipmentStats";
import { areItemsEqual, cloneItem, toWeaponItem } from "./ItemFactory";

/**
 * Contenuto di un posto della borsa. Per le armi: l'oggetto (rarità e modificatori, E1) e, per comodità,
 * il suo tipo (weaponId, sempre uguale a item.baseId).
 */
export type BagSlot = { kind: "weapon"; weaponId: WeaponId; item: WeaponItem; ammo?: number } | { kind: "potion"; count: number };

/** Copia della borsa, dello zaino e delle armature (per ripristinarli quando si ricomincia un livello). */
export interface InventorySnapshot {
  slots: Array<BagSlot | null>;
  equippedSlotIndex: number;
  armor: EquippedArmor;
  backpack: ItemInstance[];
}

/** Esito dell'aggiunta di un'arma. */
export interface WeaponAddResult {
  /**
   * added = in un posto libero; swapped = al posto dell'arma in mano (borsa piena); replaced = al posto di un'arma
   * dello stesso tipo ma diversa (rarità o modificatori); duplicate = c'è già identica;
   * refilled = c'era già identica con munizioni, ora di nuovo piene.
   */
  outcome: "added" | "swapped" | "replaced" | "duplicate" | "refilled";
  /** Arma tolta dalla borsa (da mettere nello zaino o a terra) e le sue munizioni. */
  droppedWeaponId: WeaponId | null;
  droppedItem?: WeaponItem;
  droppedAmmo?: number;
}

/**
 * Esito di "lascia a terra" (tasto Q): un'arma (con le sue munizioni) o una pozione da mettere a terra;
 * lastWeapon = è l'unica arma, non si lascia; empty = posto vuoto.
 */
export type SlotDrop =
  | { kind: "weapon"; weaponId: WeaponId; item: WeaponItem; ammo: number | null }
  | { kind: "potion" }
  | { kind: "lastWeapon" }
  | { kind: "empty" };

/** Cosa comporta la scelta di un posto con il tasto numerico. */
export type SlotSelection = { kind: "equip"; weaponId: WeaponId } | { kind: "potion" } | { kind: "empty" };

/** Esito di un'armatura raccolta: indossata (posto libero), nello zaino, oppure zaino pieno. */
export type ArmorPickupOutcome = "equipped" | "stored" | "full";

/** Esito di un'azione della schermata dell'equipaggiamento (E4). */
export type EquipmentActionOutcome = "equipped" | "unequipped" | "backpackFull" | "lastWeapon" | "empty";

/**
 * La borsa: un numero fisso di posti, ognuno con un'arma o con un gruppo di pozioni.
 * C'è sempre almeno un'arma, quella in mano (equippedSlotIndex). In più (E2, E4) le armature indossate e lo zaino,
 * con gli oggetti di riserva (armi e armature). Solo logica: niente disegno, niente giocatore (il motore applica
 * gli effetti: impugnare l'arma, bere la pozione, indossare le armature).
 */
export class Inventory {
  private slots: Array<BagSlot | null>;
  private equippedIndex = 0;
  private armorSet: EquippedArmor = { ...EMPTY_ARMOR };
  private backpack: ItemInstance[] = [];

  constructor(
    private readonly slotCount: number = INVENTORY_CONFIG.slotCount,
    private readonly backpackSize: number = INVENTORY_CONFIG.backpackSize
  ) {
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
    return this.equippedWeaponItem.baseId;
  }

  /** L'oggetto dell'arma in mano (rarità e modificatori). */
  public get equippedWeaponItem(): WeaponItem {
    const slot = this.slots[this.equippedIndex];
    return slot?.kind === "weapon" ? slot.item : toWeaponItem(DEFAULT_WEAPON_ID);
  }

  /** Armi nella borsa, nell'ordine dei posti. */
  public get weaponIds(): WeaponId[] {
    return this.weaponItems.map((item) => item.baseId);
  }

  /** Oggetti delle armi nella borsa, nell'ordine dei posti. */
  public get weaponItems(): WeaponItem[] {
    return this.slots.flatMap((slot) => (slot?.kind === "weapon" ? [slot.item] : []));
  }

  public get potionCount(): number {
    return this.slots.reduce((total, slot) => total + (slot?.kind === "potion" ? slot.count : 0), 0);
  }

  // --- armature e zaino (E2, E4) ---

  /** Armature indossate. */
  public get equippedArmor(): Readonly<EquippedArmor> {
    return this.armorSet;
  }

  /** Oggetti nello zaino, in ordine. */
  public get backpackItems(): readonly ItemInstance[] {
    return this.backpack;
  }

  public get backpackCapacity(): number {
    return this.backpackSize;
  }

  public get hasBackpackRoom(): boolean {
    return this.backpack.length < this.backpackSize;
  }

  /** Mette un oggetto nello zaino. false se è pieno. */
  public addToBackpack(item: ItemInstance): boolean {
    if (!this.hasBackpackRoom) {
      return false;
    }
    this.backpack.push(cloneItem(item));
    return true;
  }

  /** Toglie un oggetto dallo zaino (per lasciarlo a terra). null se il posto è vuoto. */
  public removeFromBackpack(index: number): ItemInstance | null {
    const item = this.backpack[index];
    if (item === undefined) {
      return null;
    }
    this.backpack.splice(index, 1);
    return item;
  }

  /** Indossa un pezzo d'armatura e restituisce quello che c'era nel suo posto (o null). */
  public equipArmor(item: ArmorItem): ArmorItem | null {
    const slot = ARMOR_CONFIG[item.baseId].slot;
    const previous = this.armorSet[slot];
    this.armorSet = { ...this.armorSet, [slot]: cloneItem(item) };
    return previous;
  }

  /** Armatura raccolta (E2): si indossa se il posto è libero, altrimenti va nello zaino. */
  public pickUpArmor(item: ArmorItem): ArmorPickupOutcome {
    if (this.armorSet[ARMOR_CONFIG[item.baseId].slot] === null) {
      this.equipArmor(item);
      return "equipped";
    }
    return this.addToBackpack(item) ? "stored" : "full";
  }

  /** Toglie il pezzo di un posto e lo mette nello zaino (se c'è spazio). */
  public unequipArmor(slot: ArmorSlot): EquipmentActionOutcome {
    const item = this.armorSet[slot];
    if (item === null) {
      return "empty";
    }
    if (!this.addToBackpack(item)) {
      return "backpackFull";
    }
    this.armorSet = { ...this.armorSet, [slot]: null };
    return "unequipped";
  }

  /** Toglie il pezzo di un posto per lasciarlo a terra (Q). null se il posto è vuoto. */
  public takeArmor(slot: ArmorSlot): ArmorItem | null {
    const item = this.armorSet[slot];
    this.armorSet = { ...this.armorSet, [slot]: null };
    return item;
  }

  /**
   * Usa un oggetto dello zaino (E4): un'armatura si indossa (quella di prima prende il suo posto nello zaino);
   * un'arma entra nella borsa in un posto libero o al posto di quella in mano (che torna nello zaino) e si impugna.
   */
  public equipFromBackpack(index: number): EquipmentActionOutcome {
    const item = this.backpack[index];
    if (item === undefined) {
      return "empty";
    }
    if (item.kind === "armor") {
      const previous = this.equipArmor(item);
      this.backpack.splice(index, 1, ...(previous === null ? [] : [previous]));
      return "equipped";
    }
    const sameTypeIndex = this.slots.findIndex((slot) => slot?.kind === "weapon" && slot.weaponId === item.baseId);
    const freeIndex = this.slots.indexOf(null);
    const targetIndex = sameTypeIndex >= 0 ? sameTypeIndex : freeIndex >= 0 ? freeIndex : this.equippedIndex;
    const previous = this.slots[targetIndex];
    this.slots[targetIndex] = Inventory.createWeaponSlot(item);
    this.equippedIndex = targetIndex;
    this.backpack.splice(index, 1, ...(previous?.kind === "weapon" ? [previous.item] : []));
    return "equipped";
  }

  /** Sposta l'arma di un posto della borsa nello zaino (l'ultima arma resta: in mano ce n'è sempre una). */
  public moveWeaponToBackpack(slotIndex: number): EquipmentActionOutcome {
    const slot = this.slots[slotIndex];
    if (slot === undefined || slot === null || slot.kind !== "weapon") {
      return "empty";
    }
    if (this.weaponIds.length <= 1) {
      return "lastWeapon";
    }
    if (!this.addToBackpack(slot.item)) {
      return "backpackFull";
    }
    this.slots[slotIndex] = null;
    if (slotIndex === this.equippedIndex) {
      this.equippedIndex = this.slots.findIndex((candidate) => candidate?.kind === "weapon");
    }
    return "unequipped";
  }

  /** Armature e zaino salvati (inizio partita): gli oggetti in più dello zaino si perdono. */
  public setArmorAndBackpack(armor: Readonly<EquippedArmor>, backpack: readonly ItemInstance[]): void {
    this.armorSet = { ...EMPTY_ARMOR };
    for (const slot of ARMOR_SLOTS) {
      const item = armor[slot];
      if (item !== null && ARMOR_CONFIG[item.baseId].slot === slot) {
        this.armorSet[slot] = cloneItem(item);
      }
    }
    this.backpack = backpack.slice(0, this.backpackSize).map((item) => cloneItem(item));
  }

  // --- borsa ---

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
        this.slots[index] = Inventory.createWeaponSlot(toWeaponItem(DEFAULT_WEAPON_ID));
      }
      if (index === this.equippedIndex || this.slots[this.equippedIndex]?.kind !== "weapon") {
        this.equippedIndex = this.slots.findIndex((slot) => slot?.kind === "weapon");
      }
    }
    return this.equippedWeaponId;
  }

  /** Vero se quest'arma è nella borsa e le manca almeno una munizione. */
  public isMissingAmmo(weaponId: WeaponId): boolean {
    const max = WEAPON_CONFIG[weaponId].ammo?.max;
    return max !== undefined && this.slots.some((slot) => slot?.kind === "weapon" && slot.weaponId === weaponId && slot.ammo !== undefined && slot.ammo < max);
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
    return { kind: "weapon", weaponId: slot.weaponId, item: slot.item, ammo: slot.ammo ?? null };
  }

  public hasWeapon(weaponId: WeaponId): boolean {
    return this.weaponIds.includes(weaponId);
  }

  /**
   * Borsa nuova: le armi indicate (id o oggetti; al massimo una per tipo e per posto), nessuna pozione.
   * L'arma in mano è la prima del tipo indicato.
   */
  public reset(weapons: ReadonlyArray<WeaponId | WeaponItem>, equippedWeaponId: WeaponId): void {
    const items: WeaponItem[] = [];
    for (const weapon of weapons.length > 0 ? weapons : [DEFAULT_WEAPON_ID]) {
      const item = toWeaponItem(weapon);
      if (!items.some((existing) => existing.baseId === item.baseId)) {
        items.push(item);
      }
    }
    this.slots = Inventory.createSlots(this.slotCount, items);
    const equippedIndex = this.slots.findIndex((slot) => slot?.kind === "weapon" && slot.weaponId === equippedWeaponId);
    this.equippedIndex = equippedIndex >= 0 ? equippedIndex : 0;
  }

  /**
   * Mette un'arma nella borsa e la impugna: in un posto libero se c'è, altrimenti al posto dell'arma in mano
   * (che va messa nello zaino o lasciata a terra). La borsa tiene un'arma per tipo: un'arma identica non viene presa
   * (al più ricarica le munizioni), una dello stesso tipo ma diversa prende il posto di quella vecchia.
   */
  public addWeapon(weapon: WeaponId | WeaponItem, ammo: number | null = null): WeaponAddResult {
    const item = toWeaponItem(weapon);
    const existingIndex = this.slots.findIndex((slot) => slot?.kind === "weapon" && slot.weaponId === item.baseId);
    const existing = this.slots[existingIndex];
    if (existing !== undefined && existing !== null && existing.kind === "weapon") {
      if (areItemsEqual(existing.item, item)) {
        // un'arma con munizioni già nella borsa: le munizioni tornano piene
        const max = WEAPON_CONFIG[item.baseId].ammo?.max;
        if (max !== undefined && existing.ammo !== undefined && existing.ammo < max) {
          existing.ammo = max;
          return { outcome: "refilled", droppedWeaponId: null };
        }
        return { outcome: "duplicate", droppedWeaponId: null };
      }
      this.slots[existingIndex] = Inventory.createWeaponSlot(item, ammo);
      this.equippedIndex = existingIndex;
      return { outcome: "replaced", droppedWeaponId: existing.weaponId, droppedItem: existing.item, droppedAmmo: existing.ammo };
    }
    const newSlot = Inventory.createWeaponSlot(item, ammo);
    const freeIndex = this.slots.indexOf(null);
    if (freeIndex >= 0) {
      this.slots[freeIndex] = newSlot;
      this.equippedIndex = freeIndex;
      return { outcome: "added", droppedWeaponId: null };
    }
    const droppedItem = this.equippedWeaponItem;
    const droppedAmmo = this.equippedAmmo ?? undefined;
    this.slots[this.equippedIndex] = newSlot;
    return { outcome: "swapped", droppedWeaponId: droppedItem.baseId, droppedItem, droppedAmmo };
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
    return {
      slots: this.slots.map((slot) => Inventory.copySlot(slot)),
      equippedSlotIndex: this.equippedIndex,
      armor: { ...this.armorSet },
      backpack: this.backpack.map((item) => cloneItem(item)),
    };
  }

  public restore(snapshot: InventorySnapshot): void {
    this.slots = snapshot.slots.map((slot) => Inventory.copySlot(slot));
    this.equippedIndex = snapshot.equippedSlotIndex;
    this.armorSet = { ...snapshot.armor };
    this.backpack = snapshot.backpack.map((item) => cloneItem(item));
  }

  private static copySlot(slot: BagSlot | null): BagSlot | null {
    if (slot === null) {
      return null;
    }
    return slot.kind === "weapon" ? { ...slot, item: cloneItem(slot.item) } : { ...slot };
  }

  private static createSlots(slotCount: number, weapons: ReadonlyArray<WeaponId | WeaponItem>): Array<BagSlot | null> {
    const slots: Array<BagSlot | null> = Array.from({ length: slotCount }, () => null);
    weapons.slice(0, slotCount).forEach((weapon, index) => {
      slots[index] = Inventory.createWeaponSlot(toWeaponItem(weapon));
    });
    return slots;
  }

  /** Posto per un'arma; le armi con munizioni partono con quelle indicate (o piene). */
  private static createWeaponSlot(item: WeaponItem, ammo: number | null = null): BagSlot {
    const max = WEAPON_CONFIG[item.baseId].ammo?.max;
    const copy = cloneItem(item);
    return max === undefined ? { kind: "weapon", weaponId: item.baseId, item: copy } : { kind: "weapon", weaponId: item.baseId, item: copy, ammo: Math.min(max, ammo ?? max) };
  }
}
