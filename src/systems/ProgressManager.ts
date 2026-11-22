import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, type DifficultyId } from "../config/gameConfig";
import { INVENTORY_CONFIG } from "../config/inventoryConfig";
import { DEFAULT_WEAPON_ID, isWeaponId } from "../config/weaponConfig";
import type { WeaponId } from "../types/EntityTypes";
import type { StorageLike } from "./HighScoreManager";

const STORAGE_KEY = "ironAndShadow.progress";

/** Dati salvati: livello più avanzato raggiunto, difficoltà scelta, armi nella borsa e arma in mano. */
interface StoredProgress {
  unlockedLevelId: number;
  difficulty: DifficultyId;
  equippedWeaponId: WeaponId;
  /** Armi nella borsa (senza doppioni, l'arma in mano compresa). Le pozioni non si salvano. */
  bagWeaponIds: WeaponId[];
}

/**
 * Progressi e impostazioni salvati nel browser (localStorage), come il record:
 * il livello più avanzato raggiunto (per la selezione dei livelli), la difficoltà scelta, le armi nella borsa e
 * quella in mano.
 * Se l'archivio non c'è, è bloccato o contiene dati non validi, si riparte dal livello 1 a
 * difficoltà normale con la spada: il gioco funziona comunque.
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

  public get equippedWeaponId(): WeaponId {
    return this.progress.equippedWeaponId;
  }

  /** Armi nella borsa (l'arma in mano compresa). */
  public get bagWeaponIds(): WeaponId[] {
    return [...this.progress.bagWeaponIds];
  }

  public setEquippedWeapon(weaponId: WeaponId): void {
    if (weaponId !== this.progress.equippedWeaponId) {
      const bagWeaponIds = this.progress.bagWeaponIds.includes(weaponId) ? this.progress.bagWeaponIds : [...this.progress.bagWeaponIds, weaponId];
      this.progress = { ...this.progress, equippedWeaponId: weaponId, bagWeaponIds };
      this.save();
    }
  }

  /** Salva le armi della borsa e quella in mano (scrive solo se qualcosa cambia). */
  public setBagWeapons(weaponIds: readonly WeaponId[], equippedWeaponId: WeaponId): void {
    const bagWeaponIds = ProgressManager.normalizeBag(weaponIds, equippedWeaponId);
    const isSame =
      equippedWeaponId === this.progress.equippedWeaponId &&
      bagWeaponIds.length === this.progress.bagWeaponIds.length &&
      bagWeaponIds.every((weaponId, index) => this.progress.bagWeaponIds[index] === weaponId);
    if (!isSame) {
      this.progress = { ...this.progress, equippedWeaponId, bagWeaponIds };
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

  private load(): StoredProgress {
    const fallback: StoredProgress = { unlockedLevelId: 1, difficulty: DEFAULT_DIFFICULTY, equippedWeaponId: DEFAULT_WEAPON_ID, bagWeaponIds: [DEFAULT_WEAPON_ID] };
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
      return { unlockedLevelId: levelId, difficulty, equippedWeaponId, bagWeaponIds: ProgressManager.normalizeBag(storedBag, equippedWeaponId) };
    } catch {
      return fallback;
    }
  }

  /** Armi senza doppioni, l'arma in mano sempre presente, al massimo una per posto della borsa. */
  private static normalizeBag(weaponIds: readonly WeaponId[], equippedWeaponId: WeaponId): WeaponId[] {
    const unique = [...new Set(weaponIds)];
    if (!unique.includes(equippedWeaponId)) {
      unique.unshift(equippedWeaponId);
    }
    const limited = unique.slice(0, INVENTORY_CONFIG.slotCount);
    return limited.includes(equippedWeaponId) ? limited : [equippedWeaponId, ...limited.slice(0, INVENTORY_CONFIG.slotCount - 1)];
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
