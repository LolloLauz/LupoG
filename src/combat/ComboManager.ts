import type { AttackDefinition, ComboDefinition } from "../types/EntityTypes";

/**
 * Sceglie quale attacco eseguire in base alla sequenza di input premuti.
 * Le combo sono statiche (vedi COMBO_DEFINITIONS e WEAPON_CONFIG): ogni input fa avanzare
 * la combo corrente se continua una sequenza valida, altrimenti la sequenza
 * riparte da questo input. Gli input senza combo usano l'attacco predefinito.
 * Le sequenze possono mescolare attacco leggero e pesante e ramificarsi: dopo "J, J"
 * il terzo tasto sceglie la combo. Combo con lo stesso inizio devono usare gli stessi attacchi
 * per quell'inizio (lo verificano i test). Quando l'ultimo colpo di una combo parte, la combo
 * risulta completata (drainCompletedCombo), anche se una combo più lunga può ancora continuarla.
 */
export class ComboManager {
  private inputHistory: string[] = [];
  private activeCombo: ComboDefinition | null = null;
  /** Tempo rimasto (ms) per continuare la combo; null = nessun conto alla rovescia. */
  private windowRemainingMs: number | null = null;
  /** Combo appena completata (da mostrare), finché qualcuno non la preleva. */
  private completedCombo: ComboDefinition | null = null;

  constructor(
    private readonly combos: ComboDefinition[],
    private readonly attacks: Record<string, AttackDefinition>,
    private readonly defaultAttackByInput: Record<string, string>
  ) {}

  /** Indice (0-based) del prossimo colpo atteso, per debug/HUD. */
  public get comboStep(): number {
    return this.activeCombo === null ? 0 : this.inputHistory.length;
  }

  /** Registra l'input e restituisce l'attacco da eseguire. */
  public getNextAttack(inputAction: string): AttackDefinition {
    this.windowRemainingMs = null;
    const continued = this.tryMatch([...this.inputHistory, inputAction]);
    if (continued !== null) {
      return continued;
    }
    const restarted = this.tryMatch([inputAction]);
    if (restarted !== null) {
      return restarted;
    }
    this.reset();
    return this.getAttackById(this.defaultAttackByInput[inputAction]);
  }

  /** Da chiamare quando l'attacco finisce: se una combo può continuare, parte la finestra per il colpo successivo. */
  public onAttackFinished(): void {
    const continuation = this.findContinuation(this.inputHistory);
    if (this.activeCombo !== null && continuation !== null) {
      this.windowRemainingMs = continuation.comboWindowMs;
    } else {
      this.reset();
    }
  }

  /** La combo completata dall'ultimo colpo partito (una volta sola), oppure null. */
  public drainCompletedCombo(): ComboDefinition | null {
    const combo = this.completedCombo;
    this.completedCombo = null;
    return combo;
  }

  public update(deltaTimeMs: number): void {
    if (this.windowRemainingMs === null) {
      return;
    }
    this.windowRemainingMs -= deltaTimeMs;
    if (this.windowRemainingMs <= 0) {
      this.reset();
    }
  }

  public reset(): void {
    this.completedCombo = null;
    this.inputHistory = [];
    this.activeCombo = null;
    this.windowRemainingMs = null;
  }

  private tryMatch(candidateHistory: string[]): AttackDefinition | null {
    const matchingCombos = this.combos.filter((combo) => ComboManager.startsWith(combo.inputSequence, candidateHistory));
    if (matchingCombos.length === 0) {
      return null;
    }
    // a parità di inizio si preferisce la combo che finisce qui (per sapere che è completata)
    const finishedCombo = matchingCombos.find((combo) => combo.inputSequence.length === candidateHistory.length) ?? null;
    const matchingCombo = finishedCombo ?? matchingCombos[0]!;
    this.inputHistory = candidateHistory;
    this.activeCombo = matchingCombo;
    if (finishedCombo !== null && candidateHistory.length > 1) {
      this.completedCombo = finishedCombo;
    }
    return this.getAttackById(matchingCombo.attackIds[candidateHistory.length - 1]);
  }

  /** Una combo più lunga della sequenza che la continua, oppure null. */
  private findContinuation(history: string[]): ComboDefinition | null {
    return this.combos.find((combo) => combo.inputSequence.length > history.length && ComboManager.startsWith(combo.inputSequence, history)) ?? null;
  }

  private static startsWith(sequence: readonly string[], prefix: readonly string[]): boolean {
    return prefix.length <= sequence.length && prefix.every((input, index) => sequence[index] === input);
  }

  private getAttackById(attackId: string | undefined): AttackDefinition {
    const attack = attackId === undefined ? undefined : this.attacks[attackId];
    if (attack === undefined) {
      throw new Error(`Attacco non definito: ${String(attackId)}`);
    }
    return attack;
  }
}
