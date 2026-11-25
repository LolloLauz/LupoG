/**
 * Una risorsa che si consuma e si recupera nel tempo (Classi Fase 0): stamina e mana del giocatore.
 * Massimo e recupero al secondo si leggono a ogni uso (cambiano con classe, equipaggiamento e modificatori).
 * Dopo ogni consumo il recupero si ferma per regenDelayMs; nel frame in cui l'attesa finisce non si recupera ancora.
 */
export class ResourcePool {
  private currentValue: number;
  private regenDelayRemainingMs = 0;

  constructor(
    private readonly getMax: () => number,
    private readonly getRegenPerSecond: () => number,
    private readonly regenDelayMs: number
  ) {
    this.currentValue = getMax();
  }

  public get value(): number {
    return this.currentValue;
  }

  public get max(): number {
    return this.getMax();
  }

  /** Vero se la risorsa basta per pagare amount. */
  public canSpend(amount: number): boolean {
    return this.currentValue >= amount;
  }

  /** Paga amount e ferma il recupero; se non basta non consuma niente e restituisce false. */
  public trySpend(amount: number): boolean {
    if (this.currentValue < amount) {
      return false;
    }
    this.currentValue -= amount;
    this.regenDelayRemainingMs = this.regenDelayMs;
    return true;
  }

  /** Consumo continuo (es. scudo alzato): scende fino a 0 al massimo e ferma il recupero. */
  public drain(amount: number): void {
    this.currentValue = Math.max(0, this.currentValue - amount);
    this.regenDelayRemainingMs = this.regenDelayMs;
  }

  /** Recupera amount (pozione, colpo del bastone) senza superare il massimo e senza fermare il recupero. */
  public restore(amount: number): void {
    this.currentValue = Math.min(this.getMax(), this.currentValue + Math.max(0, amount));
  }

  /** Azzera la risorsa (es. guardia rotta), senza toccare l'attesa del recupero. */
  public empty(): void {
    this.currentValue = 0;
  }

  /** Risorsa piena e recupero libero (nuova partita, nuova vita). */
  public refill(): void {
    this.currentValue = this.getMax();
    this.regenDelayRemainingMs = 0;
  }

  /** Riporta il valore entro il massimo (dopo che il massimo è sceso). */
  public clampToMax(): void {
    this.currentValue = Math.min(this.currentValue, this.getMax());
  }

  /** Fa scorrere il tempo: prima l'attesa dopo l'ultimo consumo, poi il recupero fino al massimo. */
  public update(deltaTimeMs: number): void {
    if (this.regenDelayRemainingMs > 0) {
      this.regenDelayRemainingMs = Math.max(0, this.regenDelayRemainingMs - deltaTimeMs);
      return;
    }
    this.currentValue = Math.min(this.getMax(), this.currentValue + (this.getRegenPerSecond() * deltaTimeMs) / 1000);
  }
}
