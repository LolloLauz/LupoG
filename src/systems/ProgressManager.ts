import { CHARACTER_CONFIG, DEFAULT_CHARACTER_ID, isCharacterId } from "../config/characterConfig";
import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, type DifficultyId } from "../config/gameConfig";
import type { CharacterId } from "../types/EntityTypes";
import type { StorageLike } from "./HighScoreManager";

const STORAGE_KEY = "ironAndShadow.progress";

/**
 * Versione del formato di salvataggio. I salvataggi della 2.0 non hanno il campo "version" e contenevano anche
 * armi, armature, zaino, gemme, potenziamenti e armi trovate: nella migrazione si scartano.
 */
export const SAVE_VERSION = 2;

/**
 * Dati salvati: ciò che passa da una partita all'altra. Il livello più avanzato raggiunto (da cui dipendono anche
 * le classi sbloccate), la difficoltà e il personaggio scelti. Il record è in HighScoreManager.
 */
interface StoredProgress {
  version: typeof SAVE_VERSION;
  unlockedLevelId: number;
  difficulty: DifficultyId;
  /** Personaggio scelto (Fase 4). */
  characterId: CharacterId;
}

/**
 * Progressi e impostazioni salvati nel browser (localStorage), come il record.
 * Armi, armature, zaino, pozioni, monete e gemme valgono solo per la partita in corso e non si salvano.
 * Se l'archivio non c'è, è bloccato o contiene dati non validi, si riparte dal livello 1 a
 * difficoltà normale, con il cavaliere: il gioco funziona comunque.
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

  public setCharacter(characterId: CharacterId): void {
    if (characterId !== this.progress.characterId) {
      this.progress = { ...this.progress, characterId };
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

  /** Cancella tutti i progressi: livello 1, difficoltà normale, cavaliere (tasto "Cancella dati"). */
  public reset(): void {
    this.progress = ProgressManager.createDefaultProgress();
    this.save();
  }

  private static createDefaultProgress(): StoredProgress {
    return { version: SAVE_VERSION, unlockedLevelId: 1, difficulty: DEFAULT_DIFFICULTY, characterId: DEFAULT_CHARACTER_ID };
  }

  /**
   * Legge il salvataggio, campo per campo (un valore mancante o non valido torna a quello iniziale).
   * Un salvataggio di un formato precedente si riscrive subito, così i dati scartati non restano nell'archivio.
   */
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
      // un personaggio sconosciuto (o un salvataggio di prima della Fase 4) torna al cavaliere
      const characterId = isCharacterId(record.characterId) ? record.characterId : DEFAULT_CHARACTER_ID;
      const progress: StoredProgress = { version: SAVE_VERSION, unlockedLevelId: levelId, difficulty, characterId };
      if (record.version !== SAVE_VERSION) {
        this.write(progress);
      }
      return progress;
    } catch {
      return fallback;
    }
  }

  private save(): void {
    this.write(this.progress);
  }

  private write(progress: StoredProgress): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
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
