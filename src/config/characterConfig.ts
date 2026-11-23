import type { CharacterDefinition, CharacterId } from "../types/EntityTypes";
import { PLAYER_CONFIG } from "./playerConfig";

/**
 * Personaggi giocabili (Fase 4), scelti dal menu del titolo e salvati nei progressi.
 * Il cavaliere legge i propri valori da PLAYER_CONFIG (equilibrato): cambiando PLAYER_CONFIG cambia lui.
 * Gli altri personaggi hanno valori propri. Salto, hitbox e tempi sono comuni (PLAYER_CONFIG).
 * Fase 5: stamina (massimo, recupero, costo della schivata) e abilità speciale (ABILITY_CONFIG).
 */
export const CHARACTER_CONFIG: Record<CharacterId, CharacterDefinition> = {
  knight: {
    id: "knight",
    name: "CAVALIERE",
    description: "Equilibrato: spada e scudo.",
    trait: "NESSUN PUNTO DEBOLE",
    spriteSuffix: "",
    startingWeaponId: "sword",
    maxHealth: PLAYER_CONFIG.maxHealth,
    movementSpeed: PLAYER_CONFIG.movementSpeed,
    damageMultiplier: 1,
    damageTakenMultiplier: 1,
    dodgeDurationMs: PLAYER_CONFIG.dodgeDurationMs,
    dodgeCooldownMs: PLAYER_CONFIG.dodgeCooldownMs,
    dodgeSpeed: PLAYER_CONFIG.dodgeSpeed,
    maxStamina: 100,
    staminaRegenPerSecond: 30,
    dodgeStaminaCost: 25,
    abilityId: "shockwave",
  },
  ranger: {
    id: "ranger",
    name: "RANGER",
    description: "Veloce, colpisce da lontano.",
    trait: "SCHIVATA LUNGA E LEGGERA",
    spriteSuffix: "Ranger",
    startingWeaponId: "bow",
    maxHealth: 75,
    movementSpeed: 96,
    damageMultiplier: 1,
    damageTakenMultiplier: 1,
    dodgeDurationMs: 300,
    dodgeCooldownMs: 450,
    dodgeSpeed: 190,
    maxStamina: 100,
    staminaRegenPerSecond: 40,
    dodgeStaminaCost: 20,
    abilityId: "backstepShot",
  },
  berserker: {
    id: "berserker",
    name: "BERSERKER",
    description: "Colpi pesanti, pelle dura.",
    trait: "SCHIVATA CORTA E FATICOSA",
    spriteSuffix: "Berserker",
    startingWeaponId: "axe",
    maxHealth: 130,
    movementSpeed: 80,
    damageMultiplier: 1.3,
    damageTakenMultiplier: 1,
    dodgeDurationMs: 250,
    dodgeCooldownMs: 1000,
    dodgeSpeed: 130,
    maxStamina: 100,
    staminaRegenPerSecond: 25,
    dodgeStaminaCost: 40,
    abilityId: "furiousCharge",
  },
  paladin: {
    id: "paladin",
    name: "PALADINO",
    description: "Lento, protetto dallo scudo.",
    trait: "SI CURA PIANO FUORI DAI COLPI",
    spriteSuffix: "Paladin",
    startingWeaponId: "mace",
    maxHealth: 110,
    movementSpeed: 72,
    damageMultiplier: 1,
    damageTakenMultiplier: 0.75,
    dodgeDurationMs: PLAYER_CONFIG.dodgeDurationMs,
    dodgeCooldownMs: 800,
    dodgeSpeed: 150,
    regeneration: { healthPerSecond: 1, delayAfterHitMs: 4000 },
    maxStamina: 120,
    staminaRegenPerSecond: 25,
    dodgeStaminaCost: 30,
    abilityId: "shieldGuard",
  },
};

/** Ordine nella schermata di scelta. */
export const CHARACTER_ORDER: readonly CharacterId[] = ["knight", "ranger", "berserker", "paladin"];

export const DEFAULT_CHARACTER_ID: CharacterId = "knight";

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CHARACTER_CONFIG, value);
}
