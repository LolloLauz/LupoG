import type { AttackDefinition, ComboDefinition } from "../types/EntityTypes";

/**
 * Sceglie quale attacco eseguire in base alla sequenza di input premuti.
 * Le combo sono statiche (vedi COMBO_DEFINITIONS): ogni input fa avanzare
 * la combo corrente se continua una sequenza valida, altrimenti la sequenza
 * riparte da questo input. Gli input senza combo usano l'attacco predefinito.
 */
export class ComboManager {
  private inputHistory: string[] = [];
  private activeCombo: ComboDefinition | null = null;
  /** Tempo rimasto (ms) per continuare la combo; null = nessun conto alla rovescia. */
  private windowRemainingMs: number | null = null;

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

  /** Da chiamare quando l'attacco finisce: parte la finestra per il colpo successivo. */
  public onAttackFinished(): void {
    const combo = this.activeCombo;
    if (combo !== null && this.inputHistory.length < combo.inputSequence.length) {
      this.windowRemainingMs = combo.comboWindowMs;
    } else {
      this.reset();
    }
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
    this.inputHistory = [];
    this.activeCombo = null;
    this.windowRemainingMs = null;
  }

  private tryMatch(candidateHistory: string[]): AttackDefinition | null {
    const matchingCombo = this.combos.find(
      (combo) =>
        candidateHistory.length <= combo.inputSequence.length &&
        candidateHistory.every((input, index) => combo.inputSequence[index] === input)
    );
    if (matchingCombo === undefined) {
      return null;
    }
    this.inputHistory = candidateHistory;
    this.activeCombo = matchingCombo;
    return this.getAttackById(matchingCombo.attackIds[candidateHistory.length - 1]);
  }

  private getAttackById(attackId: string | undefined): AttackDefinition {
    const attack = attackId === undefined ? undefined : this.attacks[attackId];
    if (attack === undefined) {
      throw new Error(`Attacco non definito: ${String(attackId)}`);
    }
    return attack;
  }
}
