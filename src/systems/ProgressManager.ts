import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, type DifficultyId } from "../config/gameConfig";
import type { StorageLike } from "./HighScoreManager";

const STORAGE_KEY = "ironAndShadow.progress";

/** Dati salvati: livello più avanzato raggiunto e difficoltà scelta. */
interface StoredProgress {
  unlockedLevelId: number;
  difficulty: DifficultyId;
}

/**
 * Progressi e impostazioni salvati nel browser (localStorage), come il record:
 * il livello più avanzato raggiunto (per la selezione dei livelli) e la difficoltà scelta.
 * Se l'archivio non c'è, è bloccato o contiene dati non validi, si riparte dal livello 1 a
 * difficoltà normale: il gioco funziona comunque.
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
    const fallback: StoredProgress = { unlockedLevelId: 1, difficulty: DEFAULT_DIFFICULTY };
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
      return { unlockedLevelId: levelId, difficulty };
    } catch {
      return fallback;
    }
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
