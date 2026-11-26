import type { CharacterDefinition, CharacterId } from "../types/EntityTypes";
import { PLAYER_CONFIG } from "./playerConfig";

/**
 * Personaggi giocabili (Fase 4), scelti dal menu del titolo e salvati nei progressi.
 * Il cavaliere legge i propri valori da PLAYER_CONFIG (equilibrato): cambiando PLAYER_CONFIG cambia lui.
 * Gli altri personaggi hanno valori propri. Salto, hitbox e tempi sono comuni (PLAYER_CONFIG).
 * Fase 5: stamina (massimo, recupero, costo della schivata) e abilità speciale (ABILITY_CONFIG).
 * Fase 6: i personaggi si sbloccano raggiungendo un livello (unlockLevel); il cavaliere è sempre disponibile.
 * Classi Fase 0: mana (0 per le classi senza incantesimi), attributi di partenza (a zero) e abilità come elenco.
 * Classi Fase 2: il Mago, con mana, bastone e quattro incantesimi (tasti 7-0).
 * Classi Fase 5: quattro mosse per classe (le prime due note da subito) e un passivo per ciascuna.
 * Classi Fase 4: attributi di partenza (somma 25, massimo ATTRIBUTE_MAX_VALUE): pentagono e requisiti, gli effetti
 * contano solo i punti spesi sopra questi valori.
 */
export const CHARACTER_CONFIG: Record<CharacterId, CharacterDefinition> = {
  knight: {
    id: "knight",
    name: "CAVALIERE",
    description: "Equilibrato: spada e scudo.",
    trait: "PASSIVA: I COLPI RIDANNO STAMINA",
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
    maxMana: 0,
    manaRegenPerSecond: 0,
    baseAttributes: { strength: 6, dexterity: 5, intelligence: 2, vitality: 6, endurance: 6 },
    abilityIds: ["shockwave", "lunge", "shieldBash", "flameBlade"],
    staminaPerWeaponHit: 4,
    unlockLevel: 1,
    unlockText: "SEMPRE DISPONIBILE",
  },
  ranger: {
    id: "ranger",
    name: "RANGER",
    description: "Veloce, colpisce da lontano.",
    trait: "PASSIVA: LE FRECCE SI RICARICANO",
    spriteSuffix: "Ranger",
    startingWeaponId: "bow",
    // passiva: una freccia ogni 3 secondi (valore da bilanciare nella Fase 6)
    ammoRegeneration: { weaponId: "bow", intervalMs: 3000 },
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
    maxMana: 0,
    manaRegenPerSecond: 0,
    baseAttributes: { strength: 3, dexterity: 9, intelligence: 3, vitality: 4, endurance: 6 },
    abilityIds: ["backstepShot", "poisonArrow", "frostArrow", "fireArrow"],
    unlockLevel: 3,
    unlockText: "COMPLETA IL LIVELLO 2",
  },
  berserker: {
    id: "berserker",
    name: "BERSERKER",
    description: "Colpi pesanti, pelle dura.",
    trait: "PASSIVA: PIÙ FORTE SOTTO IL 40% HP",
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
    maxMana: 0,
    manaRegenPerSecond: 0,
    baseAttributes: { strength: 9, dexterity: 4, intelligence: 1, vitality: 8, endurance: 3 },
    abilityIds: ["furiousCharge", "hotAxe", "earthquake", "bloodStrike"],
    lowHealthPower: { healthFraction: 0.4, damageMultiplier: 1.25 },
    unlockLevel: 4,
    unlockText: "SCONFIGGI IL CAVALIERE NERO",
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
    maxMana: 0,
    manaRegenPerSecond: 0,
    baseAttributes: { strength: 6, dexterity: 2, intelligence: 4, vitality: 7, endurance: 6 },
    abilityIds: ["shieldGuard", "holyHammer", "consecration", "frozenJudgement"],
    unlockLevel: 6,
    unlockText: "SCONFIGGI IL RE DEI LUPI",
  },
  mage: {
    id: "mage",
    name: "MAGO",
    description: "Fragile, colpisce con la magia.",
    trait: "PASSIVA: MANA DAI NEMICI VINTI",
    spriteSuffix: "Mage",
    startingWeaponId: "staff",
    maxHealth: 70,
    movementSpeed: 84,
    damageMultiplier: 1,
    damageTakenMultiplier: 1,
    dodgeDurationMs: PLAYER_CONFIG.dodgeDurationMs,
    dodgeCooldownMs: PLAYER_CONFIG.dodgeCooldownMs,
    dodgeSpeed: PLAYER_CONFIG.dodgeSpeed,
    maxStamina: 80,
    staminaRegenPerSecond: 30,
    dodgeStaminaCost: 25,
    // mana: recupero lento (valori da bilanciare nella Fase 6); il bastone ne ridà un po' a ogni colpo
    maxMana: 100,
    manaRegenPerSecond: 6,
    usesSpellFocus: true,
    baseAttributes: { strength: 2, dexterity: 4, intelligence: 10, vitality: 4, endurance: 5 },
    abilityIds: ["firebolt", "frostNova", "arcaneLeap", "arcaneBarrier"],
    manaPerKill: 10,
    unlockLevel: 5,
    unlockText: "SCONFIGGI LA STREGA DELLA PALUDE",
  },
};

/** Ordine nella schermata di scelta (quello in cui si sbloccano). */
export const CHARACTER_ORDER: readonly CharacterId[] = ["knight", "ranger", "berserker", "mage", "paladin"];

export const DEFAULT_CHARACTER_ID: CharacterId = "knight";

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(CHARACTER_CONFIG, value);
}
