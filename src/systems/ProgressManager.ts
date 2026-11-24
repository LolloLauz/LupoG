import { CHARACTER_CONFIG, DEFAULT_CHARACTER_ID, isCharacterId } from "../config/characterConfig";
import { ALWAYS_DISCOVERED_WEAPONS, NO_UPGRADES, UPGRADE_CONFIG, isUpgradeId, type UpgradeId } from "../config/progressionConfig";
import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, type DifficultyId } from "../config/gameConfig";
import { INVENTORY_CONFIG } from "../config/inventoryConfig";
import { DEFAULT_WEAPON_ID, isWeaponId } from "../config/weaponConfig";
import type { CharacterId, WeaponId } from "../types/EntityTypes";
import type { EquippedArmor, ItemInstance, WeaponItem } from "../types/ItemTypes";
import { ARMOR_CONFIG, ARMOR_SLOTS } from "../config/armorConfig";
import { EMPTY_ARMOR } from "./EquipmentStats";
import type { StorageLike } from "./HighScoreManager";
import { cloneItem, parseStoredItem, toWeaponItem } from "./ItemFactory";

const STORAGE_KEY = "ironAndShadow.progress";

/** Dati salvati: livello più avanzato raggiunto, difficoltà e personaggio scelti, armi nella borsa e arma in mano. */
interface StoredProgress {
  unlockedLevelId: number;
  difficulty: DifficultyId;
  /** Personaggio scelto (Fase 4). */
  characterId: CharacterId;
  equippedWeaponId: WeaponId;
  /** Armi nella borsa (senza doppioni, l'arma in mano compresa). Le pozioni non si salvano. */
  bagWeaponIds: WeaponId[];
  /**
   * Equipaggiamento (E1-E4): gli oggetti delle armi nella borsa (stesso ordine di bagWeaponIds, con rarità e
   * modificatori), le armature indossate e lo zaino. Un salvataggio di prima ha solo bagWeaponIds: le armi
   * diventano Comuni, nessuna armatura, zaino vuoto.
   */
  bagItems: WeaponItem[];
  armor: EquippedArmor;
  backpack: ItemInstance[];
  /** Fase 6: gemme messe da parte (da spendere nei potenziamenti), livelli dei potenziamenti, armi trovate almeno una volta. */
  gems: number;
  upgradeLevels: Record<UpgradeId, number>;
  discoveredWeaponIds: WeaponId[];
}

/**
 * Progressi e impostazioni salvati nel browser (localStorage), come il record:
 * il livello più avanzato raggiunto (per la selezione dei livelli), la difficoltà e il personaggio scelti,
 * le armi nella borsa e quella in mano.
 * Se l'archivio non c'è, è bloccato o contiene dati non validi, si riparte dal livello 1 a
 * difficoltà normale, con il cavaliere e la spada: il gioco funziona comunque.
 */
export class ProgressManager {
  private progress: StoredProgress;

  constructor(private readonly storage: StorageLike | null = ProgressManager.findBrowserStorage()) {
    this.progress = this.load();
  }

  /** Il livello più avanzato raggiunto (almeno 1). */
  public get unlockedLevelId(): number {
    return this.progress.unlockedLevelId;
  }

  public get difficulty(): DifficultyId {
    return this.progress.difficulty;
  }

  /** Personaggio scelto; se non è (più) sbloccato, il cavaliere. */
  public get characterId(): CharacterId {
    return this.isCharacterUnlocked(this.progress.characterId) ? this.progress.characterId : DEFAULT_CHARACTER_ID;
  }

  /** Un personaggio si sceglie dopo aver raggiunto il suo livello di sblocco (Fase 6). */
  public isCharacterUnlocked(characterId: CharacterId): boolean {
    return this.progress.unlockedLevelId >= CHARACTER_CONFIG[characterId].unlockLevel;
  }

  /** Gemme da spendere nei potenziamenti. */
  public get gems(): number {
    return this.progress.gems;
  }

  /** Mette da parte le gemme raccolte (a fine livello). */
  public addGems(amount: number): void {
    if (amount > 0) {
      this.progress = { ...this.progress, gems: this.progress.gems + amount };
      this.save();
    }
  }

  /** Livelli comprati di ogni potenziamento. */
  public get upgradeLevels(): Record<UpgradeId, number> {
    return { ...this.progress.upgradeLevels };
  }

  /** Costo in gemme del prossimo livello di un potenziamento (null = già al massimo). */
  public getNextUpgradeCost(upgradeId: UpgradeId): number | null {
    return UPGRADE_CONFIG[upgradeId].costs[this.progress.upgradeLevels[upgradeId]] ?? null;
  }

  /** Compra il prossimo livello di un potenziamento con le gemme. false se è al massimo o le gemme non bastano. */
  public buyUpgrade(upgradeId: UpgradeId): boolean {
    const cost = this.getNextUpgradeCost(upgradeId);
    if (cost === null || cost > this.progress.gems) {
      return false;
    }
    const upgradeLevels = { ...this.progress.upgradeLevels, [upgradeId]: this.progress.upgradeLevels[upgradeId] + 1 };
    this.progress = { ...this.progress, gems: this.progress.gems - cost, upgradeLevels };
    this.save();
    return true;
  }

  /** Armi trovate almeno una volta: restano sbloccate e si possono comprare nella bottega. */
  public get discoveredWeaponIds(): WeaponId[] {
    return [...this.progress.discoveredWeaponIds];
  }

  public discoverWeapon(weaponId: WeaponId): void {
    if (!this.progress.discoveredWeaponIds.includes(weaponId)) {
      this.progress = { ...this.progress, discoveredWeaponIds: [...this.progress.discoveredWeaponIds, weaponId] };
      this.save();
    }
  }

  public setCharacter(characterId: CharacterId): void {
    if (characterId !== this.progress.characterId) {
      this.progress = { ...this.progress, characterId };
      this.save();
    }
  }

  public get equippedWeaponId(): WeaponId {
    return this.progress.equippedWeaponId;
  }

  /** Armi nella borsa (l'arma in mano compresa). */
  public get bagWeaponIds(): WeaponId[] {
    return [...this.progress.bagWeaponIds];
  }

  /** Oggetti delle armi nella borsa (rarità e modificatori), nello stesso ordine di bagWeaponIds. */
  public get bagWeaponItems(): WeaponItem[] {
    return this.progress.bagItems.map((item) => cloneItem(item));
  }

  /** Armature indossate salvate. */
  public get savedArmor(): EquippedArmor {
    return { ...this.progress.armor };
  }

  /** Oggetti dello zaino salvati. */
  public get savedBackpack(): ItemInstance[] {
    return this.progress.backpack.map((item) => cloneItem(item));
  }

  public setEquippedWeapon(weaponId: WeaponId): void {
    if (weaponId !== this.progress.equippedWeaponId) {
      const items = this.progress.bagItems.some((item) => item.baseId === weaponId) ? this.progress.bagItems : [...this.progress.bagItems, toWeaponItem(weaponId)];
      this.setBagWeapons(items, weaponId);
    }
  }

  /** Salva le armi della borsa (id o oggetti) e quella in mano (scrive solo se qualcosa cambia). */
  public setBagWeapons(weapons: ReadonlyArray<WeaponId | WeaponItem>, equippedWeaponId: WeaponId): void {
    const bagItems = ProgressManager.normalizeBag(weapons.map((weapon) => toWeaponItem(weapon)), equippedWeaponId);
    const bagWeaponIds = bagItems.map((item) => item.baseId);
    const isSame = equippedWeaponId === this.progress.equippedWeaponId && JSON.stringify(bagItems) === JSON.stringify(this.progress.bagItems);
    if (!isSame) {
      this.progress = { ...this.progress, equippedWeaponId, bagWeaponIds, bagItems };
      this.save();
    }
  }

  /** Salva armature indossate e zaino (scrive solo se qualcosa cambia). */
  public setEquipment(armor: Readonly<EquippedArmor>, backpack: readonly ItemInstance[]): void {
    const nextArmor = { ...armor };
    const nextBackpack = backpack.slice(0, INVENTORY_CONFIG.backpackSize).map((item) => cloneItem(item));
    if (JSON.stringify(nextArmor) !== JSON.stringify(this.progress.armor) || JSON.stringify(nextBackpack) !== JSON.stringify(this.progress.backpack)) {
      this.progress = { ...this.progress, armor: nextArmor, backpack: nextBackpack };
      this.save();
    }
  }

  public isLevelUnlocked(levelId: number): boolean {
    return levelId >= 1 && levelId <= this.progress.unlockedLevelId;
  }

  /** Registra che il giocatore ha raggiunto un livello (non torna mai indietro). */
  public unlockLevel(levelId: number): void {
    if (levelId > this.progress.unlockedLevelId) {
      this.progress = { ...this.progress, unlockedLevelId: levelId };
      this.save();
    }
  }

  public setDifficulty(difficulty: DifficultyId): void {
    this.progress = { ...this.progress, difficulty };
    this.save();
  }

  /** Cancella tutti i progressi: livello 1, difficoltà normale, cavaliere, la sola spada (tasto "Cancella dati"). */
  public reset(): void {
    this.progress = ProgressManager.createDefaultProgress();
    this.save();
  }

  private static createDefaultProgress(): StoredProgress {
    return {
      unlockedLevelId: 1,
      difficulty: DEFAULT_DIFFICULTY,
      characterId: DEFAULT_CHARACTER_ID,
      equippedWeaponId: DEFAULT_WEAPON_ID,
      bagWeaponIds: [DEFAULT_WEAPON_ID],
      bagItems: [toWeaponItem(DEFAULT_WEAPON_ID)],
      armor: { ...EMPTY_ARMOR },
      backpack: [],
      gems: 0,
      upgradeLevels: { ...NO_UPGRADES },
      discoveredWeaponIds: [...ALWAYS_DISCOVERED_WEAPONS],
    };
  }

  private load(): StoredProgress {
    const fallback = ProgressManager.createDefaultProgress();
    try {
      const storedText = this.storage?.getItem(STORAGE_KEY) ?? null;
      if (storedText === null) {
        return fallback;
      }
      const parsed: unknown = JSON.parse(storedText);
      if (typeof parsed !== "object" || parsed === null) {
        return fallback;
      }
      const record = parsed as Record<string, unknown>;
      const levelId = typeof record.unlockedLevelId === "number" && Number.isInteger(record.unlockedLevelId) && record.unlockedLevelId >= 1 ? record.unlockedLevelId : 1;
      const difficulty =
        typeof record.difficulty === "string" && record.difficulty in DIFFICULTY_CONFIG ? (record.difficulty as DifficultyId) : DEFAULT_DIFFICULTY;
      // un'arma sconosciuta (o un salvataggio della 2.0.0, che non la conteneva) torna alla spada
      const equippedWeaponId = isWeaponId(record.equippedWeaponId) ? record.equippedWeaponId : DEFAULT_WEAPON_ID;
      // armi della borsa: solo id validi; un salvataggio senza borsa (2.0.0, Fase 1) ha solo l'arma in mano
      const storedBag = Array.isArray(record.bagWeaponIds) ? record.bagWeaponIds.filter(isWeaponId) : [];
      // un personaggio sconosciuto (o un salvataggio di prima della Fase 4) torna al cavaliere
      const characterId = isCharacterId(record.characterId) ? record.characterId : DEFAULT_CHARACTER_ID;
      // Fase 6: gemme (intero non negativo), livelli dei potenziamenti (entro il massimo), armi trovate (almeno quelle della borsa)
      const gems = typeof record.gems === "number" && Number.isInteger(record.gems) && record.gems >= 0 ? record.gems : 0;
      const upgradeLevels = { ...NO_UPGRADES };
      if (typeof record.upgradeLevels === "object" && record.upgradeLevels !== null) {
        for (const [upgradeId, level] of Object.entries(record.upgradeLevels as Record<string, unknown>)) {
          if (isUpgradeId(upgradeId) && typeof level === "number" && Number.isInteger(level)) {
            upgradeLevels[upgradeId] = Math.max(0, Math.min(UPGRADE_CONFIG[upgradeId].costs.length, level));
          }
        }
      }
      const storedDiscovered = Array.isArray(record.discoveredWeaponIds) ? record.discoveredWeaponIds.filter(isWeaponId) : [];
      const discoveredWeaponIds = [...new Set([...ALWAYS_DISCOVERED_WEAPONS, ...storedDiscovered, ...storedBag, equippedWeaponId])];
      // equipaggiamento (E1-E4): oggetti delle armi (o, nei salvataggi di prima, armi Comuni dagli id), armature, zaino
      const storedItems = Array.isArray(record.bagItems)
        ? record.bagItems.map((entry) => parseStoredItem(entry)).filter((item): item is WeaponItem => item !== null && item.kind === "weapon")
        : [];
      const bagItems = ProgressManager.normalizeBag(storedItems.length > 0 ? storedItems : storedBag.map((weaponId) => toWeaponItem(weaponId)), equippedWeaponId);
      const armor: EquippedArmor = { ...EMPTY_ARMOR };
      if (typeof record.armor === "object" && record.armor !== null) {
        const storedArmor = record.armor as Record<string, unknown>;
        for (const slot of ARMOR_SLOTS) {
          const item = parseStoredItem(storedArmor[slot]);
          if (item !== null && item.kind === "armor" && ARMOR_CONFIG[item.baseId].slot === slot) {
            armor[slot] = item;
          }
        }
      }
      const backpack = Array.isArray(record.backpack)
        ? record.backpack.map((entry) => parseStoredItem(entry)).filter((item): item is ItemInstance => item !== null).slice(0, INVENTORY_CONFIG.backpackSize)
        : [];
      return {
        gems,
        upgradeLevels,
        discoveredWeaponIds,
        unlockedLevelId: levelId,
        difficulty,
        characterId,
        equippedWeaponId,
        bagWeaponIds: bagItems.map((item) => item.baseId),
        bagItems,
        armor,
        backpack,
      };
    } catch {
      return fallback;
    }
  }

  /** Armi senza doppioni (una per tipo), l'arma in mano sempre presente, al massimo una per posto della borsa. */
  private static normalizeBag(items: readonly WeaponItem[], equippedWeaponId: WeaponId): WeaponItem[] {
    const unique: WeaponItem[] = [];
    for (const item of items) {
      if (!unique.some((existing) => existing.baseId === item.baseId)) {
        unique.push(cloneItem(item));
      }
    }
    if (!unique.some((item) => item.baseId === equippedWeaponId)) {
      unique.unshift(toWeaponItem(equippedWeaponId));
    }
    const limited = unique.slice(0, INVENTORY_CONFIG.slotCount);
    if (limited.some((item) => item.baseId === equippedWeaponId)) {
      return limited;
    }
    const equipped = unique.find((item) => item.baseId === equippedWeaponId)!;
    return [equipped, ...limited.filter((item) => item !== equipped).slice(0, INVENTORY_CONFIG.slotCount - 1)];
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {
      // archivio non scrivibile: i progressi restano in memoria
    }
  }

  private static findBrowserStorage(): StorageLike | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
}
