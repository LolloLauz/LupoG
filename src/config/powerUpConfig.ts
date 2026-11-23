import type { PowerUpDefinition, PowerUpId } from "../types/EntityTypes";
import { PALETTE } from "./gameConfig";

/**
 * Power-up raccoglibili (si ottengono con gli oggetti "power..." di itemConfig.ts).
 * Ogni power-up modifica una o più statistiche del giocatore per durationMs: i valori base
 * di PLAYER_CONFIG non cambiano mai, i valori effettivi si ricalcolano dai power-up attivi
 * (PlayerModifiers). Raccogliere di nuovo lo stesso power-up ne fa ripartire la durata.
 */
export const POWER_UP_CONFIG: Record<PowerUpId, PowerUpDefinition> = {
  berserk: {
    id: "berserk",
    name: "FURIA",
    description: "Danno degli attacchi x1,5",
    type: "temporary",
    effects: [{ stat: "damageMultiplier", operation: "multiply", value: 1.5 }],
    durationMs: 12000,
    iconSpriteId: "itemBerserk",
    auraColor: PALETTE.red,
  },
  speed: {
    id: "speed",
    name: "VELOCITÀ",
    description: "Movimento x1,4",
    type: "temporary",
    effects: [{ stat: "movementSpeedMultiplier", operation: "multiply", value: 1.4 }],
    durationMs: 12000,
    iconSpriteId: "itemSpeed",
    auraColor: PALETTE.yellow,
  },
  shield: {
    id: "shield",
    name: "SCUDO",
    description: "Danni subiti dimezzati",
    type: "temporary",
    effects: [{ stat: "damageTakenMultiplier", operation: "multiply", value: 0.5 }],
    durationMs: 15000,
    iconSpriteId: "itemShield",
    auraColor: PALETTE.cyan,
  },
  fire: {
    id: "fire",
    name: "FUOCO",
    description: "+8 danni di fuoco a ogni colpo",
    type: "temporary",
    effects: [{ stat: "bonusDamage", operation: "add", value: 8 }],
    durationMs: 12000,
    iconSpriteId: "itemFire",
    auraColor: PALETTE.orange,
    // Fase 7: i colpi lasciano anche una bruciatura
    element: "fire",
  },
  regeneration: {
    id: "regeneration",
    name: "RIGENERAZIONE",
    description: "Recupera 4 HP al secondo",
    type: "temporary",
    effects: [{ stat: "healthRegenPerSecond", operation: "add", value: 4 }],
    durationMs: 10000,
    iconSpriteId: "itemRegeneration",
    auraColor: PALETTE.lightGreen,
  },
  // Fase 7: power-up degli elementi (i colpi, anche dei proiettili e delle abilità, lasciano l'effetto di stato)
  poison: {
    id: "poison",
    name: "VELENO",
    description: "I colpi avvelenano",
    type: "temporary",
    effects: [],
    durationMs: 15000,
    iconSpriteId: "itemPoison",
    auraColor: PALETTE.green,
    element: "poison",
  },
  frost: {
    id: "frost",
    name: "GELO",
    description: "I colpi rallentano",
    type: "temporary",
    effects: [],
    durationMs: 15000,
    iconSpriteId: "itemFrost",
    auraColor: PALETTE.iceWhite,
    element: "frost",
  },
  shock: {
    id: "shock",
    name: "FULMINE",
    description: "I colpi stordiscono",
    type: "temporary",
    effects: [],
    durationMs: 15000,
    iconSpriteId: "itemShock",
    auraColor: PALETTE.yellow,
    element: "shock",
  },
};
