import type { AttributeDefinition, AttributeId, Attributes } from "../types/EntityTypes";

/**
 * Attributi del personaggio (Classi Fase 0). Ogni punto dà gli effetti di effectsPerPoint, che entrano nei
 * modificatori del giocatore come fonte "attributes" (vedi systems/AttributeStats.ts e PlayerModifiers).
 * Fase 0: nessun effetto e tutti i personaggi a zero, quindi il gioco non cambia. Formule e tetti arrivano con la Fase 4.
 */
export const ATTRIBUTE_CONFIG: Record<AttributeId, AttributeDefinition> = {
  strength: { id: "strength", name: "FORZA", shortName: "FOR", effectsPerPoint: [] },
  dexterity: { id: "dexterity", name: "DESTREZZA", shortName: "DES", effectsPerPoint: [] },
  intelligence: { id: "intelligence", name: "INTELLIGENZA", shortName: "INT", effectsPerPoint: [] },
  vitality: { id: "vitality", name: "VITALITA'", shortName: "VIT", effectsPerPoint: [] },
  endurance: { id: "endurance", name: "TEMPRA", shortName: "TEM", effectsPerPoint: [] },
};

/** Ordine degli attributi (vertici del pentagono, dalla Fase 4). */
export const ATTRIBUTE_ORDER: readonly AttributeId[] = ["strength", "dexterity", "intelligence", "vitality", "endurance"];

/** Tutti gli attributi a zero. */
export const ZERO_ATTRIBUTES: Readonly<Attributes> = { strength: 0, dexterity: 0, intelligence: 0, vitality: 0, endurance: 0 };
