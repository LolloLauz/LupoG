/** Punteggio, gemme e monete della partita. Il record è gestito da HighScoreManager. */
export class ScoreManager {
  private score = 0;
  private collectibles = 0;
  /** Monete (Fase 6): si spendono nella bottega tra un livello e l'altro. */
  private coinCount = 0;

  public get coins(): number {
    return this.coinCount;
  }

  public addCoins(amount: number): void {
    this.coinCount += Math.max(0, amount);
  }

  /** Spende monete; false (e nessuna spesa) se non bastano. */
  public spendCoins(amount: number): boolean {
    if (amount > this.coinCount) {
      return false;
    }
    this.coinCount -= amount;
    return true;
  }

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

  /** Ripristina i valori salvati (usato quando si ricomincia un livello dopo la morte). Senza coins le monete restano. */
  public restore(score: number, collectibles: number, coins: number = this.coinCount): void {
    this.score = score;
    this.collectibles = collectibles;
    this.coinCount = coins;
  }

  public reset(): void {
    this.restore(0, 0, 0);
  }
}
