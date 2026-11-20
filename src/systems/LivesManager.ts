import { GAME_CONFIG } from "../config/gameConfig";

/** Vite del giocatore. Quando finiscono la partita termina (Game Over). */
export class LivesManager {
  private lives: number = GAME_CONFIG.startingLives;

  public get remainingLives(): number {
    return this.lives;
  }

  public get hasLivesLeft(): boolean {
    return this.lives > 0;
  }

  /** Toglie una vita (mai sotto zero) e restituisce quelle rimaste. */
  public loseLife(): number {
    this.lives = Math.max(0, this.lives - 1);
    return this.lives;
  }

  /** Punto di estensione per le vite extra (es. bonus a punteggio). */
  public addLife(): void {
    this.lives++;
  }

  public reset(): void {
    this.lives = GAME_CONFIG.startingLives;
  }
}
