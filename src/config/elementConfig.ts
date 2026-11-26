import type { ElementId, SynergyDefinition } from "../types/EntityTypes";
import { PALETTE } from "./gameConfig";

/** Un effetto di stato: quanto dura e cosa fa (Fase 7). */
export interface ElementDefinition {
  id: ElementId;
  /** Nome mostrato al giocatore. */
  name: string;
  /** Colore dell'alone sul nemico e dei numeri del danno nel tempo. */
  color: string;
  /** Durata dell'effetto (ms). */
  durationMs: number;
  /** Danno nel tempo: tickDamage ogni tickMs (0 = nessun danno). Non uccide mai: lascia almeno 1 HP. */
  tickMs: number;
  tickDamage: number;
  /** Moltiplicatore della velocità finché dura (gelo); 1 = nessun rallentamento. */
  speedMultiplier: number;
  /** Stordimento all'applicazione (shock) e tempo dopo il quale si può stordire di nuovo. */
  stunMs: number;
  stunImmunityMs: number;
  /** Danno immediato ai boss (che non si stordiscono): lo shock li ferisce subito. */
  bossInstantDamage: number;
}

export const ELEMENT_CONFIG: Record<ElementId, ElementDefinition> = {
  fire: { id: "fire", name: "BRUCIATURA", color: PALETTE.orange, durationMs: 2000, tickMs: 500, tickDamage: 2, speedMultiplier: 1, stunMs: 0, stunImmunityMs: 0, bossInstantDamage: 0 },
  poison: { id: "poison", name: "VELENO", color: PALETTE.lightGreen, durationMs: 4000, tickMs: 1000, tickDamage: 3, speedMultiplier: 1, stunMs: 0, stunImmunityMs: 0, bossInstantDamage: 0 },
  frost: { id: "frost", name: "GELO", color: PALETTE.iceWhite, durationMs: 3000, tickMs: 0, tickDamage: 0, speedMultiplier: 0.5, stunMs: 0, stunImmunityMs: 0, bossInstantDamage: 0 },
  shock: { id: "shock", name: "SHOCK", color: PALETTE.yellow, durationMs: 500, tickMs: 0, tickDamage: 0, speedMultiplier: 1, stunMs: 500, stunImmunityMs: 2000, bossInstantDamage: 6 },
};

export const ELEMENT_ORDER: readonly ElementId[] = ["fire", "poison", "frost", "shock"];

/**
 * Sinergie elementali (Classi Fase 5). Per ogni colpo ne scatta al massimo una: la prima di questo elenco che vale.
 * Valori da bilanciare nella Fase 6.
 */
export const ELEMENT_SYNERGIES: readonly SynergyDefinition[] = [
  { id: "shatter", name: "FRANTUMATO!", status: "frost", triggersOnHeavyImpact: true, damageMultiplier: 1.5, color: PALETTE.iceWhite },
  { id: "thermalShock", name: "SHOCK TERMICO!", status: "frost", triggerElement: "fire", damageMultiplier: 1.5, color: PALETTE.orange },
  { id: "overload", name: "SOVRACCARICO!", status: "fire", triggerElement: "shock", damageMultiplier: 1.5, color: PALETTE.yellow },
  { id: "detonation", name: "DETONAZIONE!", status: "poison", triggerElement: "fire", damageMultiplier: 1.5, color: PALETTE.lightGreen },
];
