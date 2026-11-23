import type { AbilityDefinition, AbilityId, AttackDefinition } from "../types/EntityTypes";

/**
 * Abilità speciali dei personaggi (Fase 5, tasto L). Ognuna costa stamina e ha un tempo di ricarica.
 * Le abilità d'attacco sono attacchi come quelli delle armi (area d'urto, durata, animazione con lo stesso id),
 * più eventuali scatti (dash) e proiettili; l'arma in mano cambia solo l'aspetto.
 */
const NO_HITBOX = { x: 0, y: 0, width: 0, height: 0 };

/** Cavaliere: colpo a terra che investe chi sta intorno, davanti e dietro. */
const SHOCKWAVE_ATTACK: AttackDefinition = {
  id: "abilityShockwave",
  damage: 25,
  durationMs: 450,
  hitStartMs: 200,
  hitEndMs: 280,
  cooldownMs: 150,
  // area centrata sul cavaliere (largo 12): da 40 px dietro a 40 px davanti
  hitbox: { x: -40, y: 4, width: 92, height: 20 },
  animation: "abilityShockwave",
  breaksGuard: true,
};

/** Ranger: balzo all'indietro (invulnerabile) e una freccia in avanti che non consuma munizioni. */
const BACKSTEP_SHOT_ATTACK: AttackDefinition = {
  id: "abilityBackstepShot",
  damage: 20,
  durationMs: 420,
  hitStartMs: 0,
  hitEndMs: 0,
  cooldownMs: 150,
  hitbox: NO_HITBOX,
  animation: "abilityBackstepShot",
  dash: { speed: -220, startMs: 0, endMs: 250, invulnerable: true },
  projectile: { projectileId: "playerArrow", launchAtMs: 280, originX: 20, originY: 9, aimY: 0, usesAmmo: false },
};

/** Berserker: carica in avanti che travolge i nemici sulla sua strada (rompe la guardia). */
const FURIOUS_CHARGE_ATTACK: AttackDefinition = {
  id: "abilityFuriousCharge",
  damage: 35,
  durationMs: 500,
  hitStartMs: 100,
  hitEndMs: 400,
  cooldownMs: 200,
  hitbox: { x: 6, y: 2, width: 20, height: 22 },
  animation: "abilityFuriousCharge",
  breaksGuard: true,
  dash: { speed: 230, startMs: 100, endMs: 400 },
};

export const ABILITY_CONFIG: Record<AbilityId, AbilityDefinition> = {
  shockwave: {
    id: "shockwave",
    kind: "attack",
    name: "ONDA D'URTO",
    description: "Colpisce tutti intorno",
    staminaCost: 40,
    cooldownMs: 6000,
    attack: SHOCKWAVE_ATTACK,
    impactEffect: "shockwave",
  },
  backstepShot: {
    id: "backstepShot",
    kind: "attack",
    name: "TIRO IN RITIRATA",
    description: "Balzo indietro e freccia",
    staminaCost: 30,
    cooldownMs: 4000,
    attack: BACKSTEP_SHOT_ATTACK,
  },
  furiousCharge: {
    id: "furiousCharge",
    kind: "attack",
    name: "CARICA FURIOSA",
    description: "Travolge chi incontra",
    staminaCost: 40,
    cooldownMs: 5000,
    attack: FURIOUS_CHARGE_ATTACK,
  },
  shieldGuard: {
    id: "shieldGuard",
    kind: "guard",
    name: "SCUDO",
    description: "Tieni L: para davanti",
    staminaCost: 10,
    cooldownMs: 300,
    drainPerSecond: 12,
    perfectWindowMs: 250,
    staminaPerBlockedDamage: 1.5,
    parryStunMs: 1000,
  },
};

/** Gli attacchi delle abilità, per id (servono alle animazioni). */
export function getAbilityAttacks(): Record<string, AttackDefinition> {
  const attacks: Record<string, AttackDefinition> = {};
  for (const ability of Object.values(ABILITY_CONFIG)) {
    if (ability.kind === "attack") {
      attacks[ability.attack.id] = ability.attack;
    }
  }
  return attacks;
}
