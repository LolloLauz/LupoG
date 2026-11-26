import { ELEMENT_CONFIG, ELEMENT_ORDER, ELEMENT_SYNERGIES } from "../config/elementConfig";
import type { ElementId, ElementModifiers, HitProperties, SynergyDefinition } from "../types/EntityTypes";

/** Un colpo del danno nel tempo (per i numeri sullo schermo). */
export interface StatusTick {
  element: ElementId;
  damage: number;
}

/** Esito dell'applicazione di un elemento. */
export interface StatusApplication {
  /** false se il bersaglio è immune (moltiplicatore 0). */
  isApplied: boolean;
  /** Stordimento da applicare subito (shock), in ms; 0 = nessuno. */
  stunMs: number;
}

interface ActiveStatus {
  remainingMs: number;
  tickElapsedMs: number;
  multiplier: number;
}

/**
 * Effetti di stato di un nemico o di un boss (Fase 7): bruciatura e veleno (danno nel tempo), gelo (rallenta), shock
 * (stordisce, poi per un po' non si può stordire di nuovo). Le resistenze del bersaglio (ElementModifiers) scalano danno e
 * durata; 0 = immune. Riapplicare un effetto ne fa ripartire la durata. Solo logica: il proprietario applica il danno
 * (che può uccidere), lo stordimento e il rallentamento.
 */
export class StatusEffects {
  private readonly active = new Map<ElementId, ActiveStatus>();
  private stunImmunityRemainingMs = 0;
  private elapsedMs = 0;

  constructor(private readonly modifiers: ElementModifiers = {}) {}

  /** Moltiplicatore del bersaglio per un elemento (1 = normale, 0 = immune). */
  public getMultiplier(element: ElementId): number {
    return this.modifiers[element] ?? 1;
  }

  public apply(element: ElementId): StatusApplication {
    const multiplier = this.getMultiplier(element);
    if (multiplier <= 0) {
      return { isApplied: false, stunMs: 0 };
    }
    const definition = ELEMENT_CONFIG[element];
    const isFrost = definition.speedMultiplier < 1;
    // gelo e stordimento: la debolezza (o la resistenza) cambia la durata; danno nel tempo: cambia il danno
    const durationMs = isFrost || definition.stunMs > 0 ? definition.durationMs * multiplier : definition.durationMs;
    const existing = this.active.get(element);
    this.active.set(element, { remainingMs: Math.max(existing?.remainingMs ?? 0, durationMs), tickElapsedMs: existing?.tickElapsedMs ?? 0, multiplier });
    let stunMs = 0;
    if (definition.stunMs > 0 && this.stunImmunityRemainingMs <= 0) {
      stunMs = Math.round(definition.stunMs * multiplier);
      this.stunImmunityRemainingMs = definition.stunImmunityMs;
    }
    return { isApplied: true, stunMs };
  }

  /**
   * Sinergia innescata da un colpo (Classi Fase 5): la prima di ELEMENT_SYNERGIES il cui effetto è attivo e che il colpo
   * innesca. L'effetto viene consumato. Va chiamata prima di applicare gli elementi del colpo. null = nessuna.
   */
  public consumeSynergy(hit: HitProperties): SynergyDefinition | null {
    const elements = hit.elements ?? [];
    const isHeavyImpact = hit.breaksGuard === true || hit.crushesArmor === true;
    const synergy = ELEMENT_SYNERGIES.find((candidate) => {
      if (!this.active.has(candidate.status) || elements.includes(candidate.status)) {
        return false;
      }
      const hasElement =
        candidate.triggerElement !== undefined && elements.includes(candidate.triggerElement) && this.getMultiplier(candidate.triggerElement) > 0;
      return hasElement || (candidate.triggersOnHeavyImpact === true && isHeavyImpact);
    });
    if (synergy === undefined) {
      return null;
    }
    this.active.delete(synergy.status);
    return synergy;
  }

  /** Avanza il tempo: restituisce i colpi del danno nel tempo avvenuti in questo intervallo. */
  public update(deltaTimeMs: number): StatusTick[] {
    this.elapsedMs += deltaTimeMs;
    this.stunImmunityRemainingMs = Math.max(0, this.stunImmunityRemainingMs - deltaTimeMs);
    const ticks: StatusTick[] = [];
    for (const element of ELEMENT_ORDER) {
      const status = this.active.get(element);
      if (status === undefined) {
        continue;
      }
      const definition = ELEMENT_CONFIG[element];
      const usableMs = Math.min(deltaTimeMs, status.remainingMs);
      status.remainingMs -= deltaTimeMs;
      if (definition.tickDamage > 0 && definition.tickMs > 0) {
        status.tickElapsedMs += usableMs;
        while (status.tickElapsedMs >= definition.tickMs - 1e-6) {
          status.tickElapsedMs -= definition.tickMs;
          ticks.push({ element, damage: Math.max(1, Math.round(definition.tickDamage * status.multiplier)) });
        }
      }
      if (status.remainingMs <= 0) {
        this.active.delete(element);
      }
    }
    return ticks;
  }

  /** Moltiplicatore della velocità (gelo): 1 senza effetti. */
  public get speedMultiplier(): number {
    return this.active.has("frost") ? ELEMENT_CONFIG.frost.speedMultiplier : 1;
  }

  public has(element: ElementId): boolean {
    return this.active.has(element);
  }

  /** Effetti attivi, nell'ordine di ELEMENT_ORDER (per disegnarli). */
  public get activeElements(): ElementId[] {
    return ELEMENT_ORDER.filter((element) => this.active.has(element));
  }

  /** Tempo trascorso (ms), per far pulsare gli aloni. */
  public get animationMs(): number {
    return this.elapsedMs;
  }

  public clear(): void {
    this.active.clear();
    this.stunImmunityRemainingMs = 0;
  }
}
