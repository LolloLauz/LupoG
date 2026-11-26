import { ATTRIBUTE_MAX_VALUE, ATTRIBUTE_ORDER, ATTRIBUTE_POINTS_CONFIG, ZERO_ATTRIBUTES } from "../config/attributeConfig";
import type { AttributeId, Attributes } from "../types/EntityTypes";

/** Esito di un punto speso: speso, nessun punto da spendere, attributo già al massimo. */
export type SpendPointOutcome = "spent" | "noPoints" | "atMax";

/** Stato dei punti salvato a inizio livello (ricominciando il livello torna così). */
export interface AttributePointsSnapshot {
  unspent: number;
  spent: Attributes;
}

/**
 * Punti attributo della partita (Classi Fase 4): si guadagnano a fine livello (e in più per il boss), si spendono uno
 * alla volta all'altare della bottega e non si ridistribuiscono. Valgono solo per la partita (reset a nuova partita) e
 * stanno nello snapshot di inizio livello, come la borsa.
 */
export class AttributePoints {
  private unspentPoints = 0;
  private spentPoints: Attributes = { ...ZERO_ATTRIBUTES };

  /** Punti non ancora spesi. */
  public get unspent(): number {
    return this.unspentPoints;
  }

  /** Punti spesi in ogni attributo (sopra la base della classe). */
  public get spent(): Readonly<Attributes> {
    return this.spentPoints;
  }

  /** Punti guadagnati completando un livello (con il bonus se il livello aveva un boss). */
  public static pointsForLevel(hadBoss: boolean): number {
    return ATTRIBUTE_POINTS_CONFIG.perLevelCompleted + (hadBoss ? ATTRIBUTE_POINTS_CONFIG.perBossDefeated : 0);
  }

  public award(points: number): void {
    this.unspentPoints += Math.max(0, Math.floor(points));
  }

  /**
   * Spende un punto nell'attributo indicato. baseValue = valore base della classe: base + spesi non supera
   * ATTRIBUTE_MAX_VALUE (un punto oltre il massimo andrebbe perso).
   */
  public spend(attributeId: AttributeId, baseValue: number): SpendPointOutcome {
    if (this.unspentPoints <= 0) {
      return "noPoints";
    }
    if (baseValue + this.spentPoints[attributeId] >= ATTRIBUTE_MAX_VALUE) {
      return "atMax";
    }
    this.unspentPoints--;
    this.spentPoints = { ...this.spentPoints, [attributeId]: this.spentPoints[attributeId] + 1 };
    return "spent";
  }

  /** Nuova partita: nessun punto. */
  public reset(): void {
    this.unspentPoints = 0;
    this.spentPoints = { ...ZERO_ATTRIBUTES };
  }

  public snapshot(): AttributePointsSnapshot {
    return { unspent: this.unspentPoints, spent: { ...this.spentPoints } };
  }

  public restore(snapshot: Readonly<AttributePointsSnapshot>): void {
    this.unspentPoints = snapshot.unspent;
    this.spentPoints = { ...ZERO_ATTRIBUTES };
    for (const attributeId of ATTRIBUTE_ORDER) {
      this.spentPoints[attributeId] = snapshot.spent[attributeId];
    }
  }
}
