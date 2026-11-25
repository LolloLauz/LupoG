import type { ActivePowerUp, ModifierSourceId, PlayerStatName, PowerUpDefinition, StatModifierEffect } from "../types/EntityTypes";

/** Valore di partenza di ogni statistica: 1 per i moltiplicatori, 0 per i bonus. */
const STAT_BASE_VALUES: Record<PlayerStatName, number> = {
  damageMultiplier: 1,
  movementSpeedMultiplier: 1,
  damageTakenMultiplier: 1,
  bonusDamage: 0,
  healthRegenPerSecond: 0,
  maxHealthBonus: 0,
  maxStaminaBonus: 0,
  maxManaBonus: 0,
};

/**
 * Modificatori temporanei del giocatore (power-up). Le statistiche base non vengono mai
 * modificate: il valore effettivo si ricalcola ogni volta dall'elenco dei power-up attivi,
 *   valore = (base + somma dei bonus "add") x prodotto dei fattori "multiply",
 * quindi la scadenza di un power-up non può alterare gli altri.
 * Lo stesso power-up raccolto di nuovo non si somma: ne riparte la durata.
 * Classi Fase 0: oltre ai power-up ci sono fonti permanenti (gli attributi, vedi setSourceEffects), che
 * entrano nella stessa formula ma non scadono e non si tolgono con clear().
 */
export class PlayerModifiers {
  private active: ActivePowerUp[] = [];
  private readonly sourceEffects = new Map<ModifierSourceId, readonly StatModifierEffect[]>();

  /** Power-up attivi (per l'HUD e gli effetti grafici). */
  public get activePowerUps(): readonly ActivePowerUp[] {
    return this.active;
  }

  public has(powerUpId: string): boolean {
    return this.active.some((powerUp) => powerUp.definition.id === powerUpId);
  }

  /** Attiva un power-up (o ne fa ripartire la durata se è già attivo). */
  public add(definition: PowerUpDefinition): void {
    const existing = this.active.find((powerUp) => powerUp.definition.id === definition.id);
    if (existing !== undefined) {
      existing.remainingMs = definition.durationMs;
      return;
    }
    this.active.push({ definition, remainingMs: definition.durationMs });
  }

  /** Fa scorrere il tempo e toglie i power-up temporanei scaduti. */
  public update(deltaTimeMs: number): void {
    for (const powerUp of this.active) {
      if (powerUp.definition.type === "temporary") {
        powerUp.remainingMs -= deltaTimeMs;
      }
    }
    this.active = this.active.filter((powerUp) => powerUp.definition.type !== "temporary" || powerUp.remainingMs > 0);
  }

  /** Toglie tutti i power-up (morte, nuova partita, nuovo livello). Le fonti permanenti restano. */
  public clear(): void {
    this.active = [];
  }

  /** Sostituisce gli effetti di una fonte permanente (es. gli attributi); un elenco vuoto la annulla. */
  public setSourceEffects(source: ModifierSourceId, effects: readonly StatModifierEffect[]): void {
    this.sourceEffects.set(source, [...effects]);
  }

  /** Effetti attuali di una fonte permanente (vuoto se non impostata). */
  public getSourceEffects(source: ModifierSourceId): readonly StatModifierEffect[] {
    return this.sourceEffects.get(source) ?? [];
  }

  /** Valore effettivo di una statistica con i power-up attivi e le fonti permanenti. */
  public getValue(stat: PlayerStatName): number {
    let additive = 0;
    let multiplier = 1;
    for (const powerUp of this.active) {
      for (const effect of powerUp.definition.effects) {
        if (effect.stat === stat) {
          if (effect.operation === "add") additive += effect.value;
          else multiplier *= effect.value;
        }
      }
    }
    for (const effects of this.sourceEffects.values()) {
      for (const effect of effects) {
        if (effect.stat === stat) {
          if (effect.operation === "add") additive += effect.value;
          else multiplier *= effect.value;
        }
      }
    }
    return (STAT_BASE_VALUES[stat] + additive) * multiplier;
  }
}
