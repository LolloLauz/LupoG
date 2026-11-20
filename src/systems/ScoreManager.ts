/** Punteggio e gemme della partita. Il record è gestito da HighScoreManager. */
export class ScoreManager {
  private score = 0;
  private collectibles = 0;

  public get currentScore(): number {
    return this.score;
  }

  /** Oggetti collezionabili (gemme) raccolti nella partita. */
  public get collectiblesFound(): number {
    return this.collectibles;
  }

  public addScore(points: number): void {
    this.score += points;
  }

  public registerCollectible(): void {
    this.collectibles++;
  }

  /** Ripristina i valori salvati (usato quando si ricomincia un livello dopo la morte). */
  public restore(score: number, collectibles: number): void {
    this.score = score;
    this.collectibles = collectibles;
  }

  public reset(): void {
    this.restore(0, 0);
  }
}
