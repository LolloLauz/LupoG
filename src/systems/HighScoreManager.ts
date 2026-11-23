/** Interfaccia minima di un archivio chiave/valore (es. window.localStorage). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "ironAndShadow.bestScore";

/**
 * Record locale del punteggio migliore, salvato nel browser (localStorage).
 * Se l'archivio non è disponibile (navigazione privata, dati bloccati) il record
 * vale solo fino alla chiusura della pagina: il gioco funziona comunque.
 * Pensato per essere esteso in futuro con una classifica di più punteggi.
 */
export class HighScoreManager {
  private bestScoreValue = 0;

  constructor(private readonly storage: StorageLike | null = HighScoreManager.findBrowserStorage()) {
    this.bestScoreValue = this.loadStoredScore();
  }

  public get bestScore(): number {
    return this.bestScoreValue;
  }

  /** Registra un punteggio finale. Restituisce true se è un nuovo record. */
  public submitScore(finalScore: number): boolean {
    if (finalScore <= this.bestScoreValue) {
      return false;
    }
    this.bestScoreValue = finalScore;
    try {
      this.storage?.setItem(STORAGE_KEY, String(finalScore));
    } catch {
      // archivio non scrivibile: il record resta in memoria
    }
    return true;
  }

  /** Cancella il record (tasto "Cancella dati" del titolo). */
  public reset(): void {
    this.bestScoreValue = 0;
    try {
      this.storage?.setItem(STORAGE_KEY, "0");
    } catch {
      // archivio non scrivibile: il record è comunque azzerato in memoria
    }
  }

  private loadStoredScore(): number {
    try {
      const storedValue = this.storage?.getItem(STORAGE_KEY) ?? null;
      const parsedValue = storedValue === null ? 0 : Number.parseInt(storedValue, 10);
      return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
    } catch {
      return 0;
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
