import { ATTRIBUTE_CONFIG, ATTRIBUTE_ORDER } from "../config/attributeConfig";
import type { AttributeDefinition, AttributeId, Attributes, StatModifierEffect } from "../types/EntityTypes";

/**
 * Attributi -> modificatori del giocatore (Classi Fase 0). Ogni punto di un attributo somma i suoi effectsPerPoint
 * (ATTRIBUTE_CONFIG); il risultato entra in PlayerModifiers come fonte "attributes", accanto ai power-up.
 * Gli effetti nulli si scartano: con gli attributi a zero (o senza effetti) l'elenco è vuoto e non cambia niente.
 * definitions si sostituisce solo nei test.
 */
export function computeAttributeEffects(
  attributes: Readonly<Attributes>,
  definitions: Readonly<Record<AttributeId, AttributeDefinition>> = ATTRIBUTE_CONFIG
): StatModifierEffect[] {
  const effects: StatModifierEffect[] = [];
  for (const attributeId of ATTRIBUTE_ORDER) {
    const points = attributes[attributeId];
    for (const effect of definitions[attributeId].effectsPerPoint) {
      const value = effect.valuePerPoint * points;
      if (value !== 0) {
        effects.push({ stat: effect.stat, operation: "add", value });
      }
    }
  }
  return effects;
}
