import type { AbilityDefinition, AbilityId, AttackDefinition, ElementId, ProjectileTypeId, ResourceCost } from "../types/EntityTypes";

/**
 * Abilità speciali dei personaggi (Fase 5, tasti 7-0; quattro per classe dalla Classi Fase 5, valori da bilanciare). Ognuna ha un costo (stamina, mana o salute: Classi Fase 0)
 * e un tempo di ricarica.
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

/**
 * Mago (Classi Fase 2): gli incantesimi costano mana e riusano i tipi delle altre abilità.
 * Dardo di fuoco: un proiettile che brucia (come il tiro del Ranger, senza munizioni).
 */
const FIREBOLT_ATTACK: AttackDefinition = {
  id: "abilityFirebolt",
  damage: 22,
  durationMs: 360,
  hitStartMs: 0,
  hitEndMs: 0,
  cooldownMs: 120,
  hitbox: NO_HITBOX,
  animation: "abilityFirebolt",
  projectile: { projectileId: "arcaneFireball", launchAtMs: 180, originX: 18, originY: 9, aimY: 0, usesAmmo: false },
  elements: ["fire"],
};

/** Nova di gelo: colpo ad area intorno al Mago, come l'onda d'urto, che rallenta chi colpisce. */
const FROST_NOVA_ATTACK: AttackDefinition = {
  id: "abilityFrostNova",
  damage: 18,
  durationMs: 450,
  hitStartMs: 200,
  hitEndMs: 280,
  cooldownMs: 150,
  hitbox: { x: -40, y: 0, width: 92, height: 24 },
  animation: "abilityFrostNova",
  elements: ["frost"],
};

/** Balzo arcano: uno scatto all'indietro, invulnerabile, per allontanarsi (come il tiro in ritirata, senza freccia). */
const ARCANE_LEAP_ATTACK: AttackDefinition = {
  id: "abilityArcaneLeap",
  damage: 0,
  durationMs: 320,
  hitStartMs: 0,
  hitEndMs: 0,
  cooldownMs: 100,
  hitbox: NO_HITBOX,
  animation: "abilityArcaneLeap",
  dash: { speed: -300, startMs: 0, endMs: 240, invulnerable: true },
};

/** Classi Fase 5: colpo ravvicinato (stesse fasi per tutti), con area, elementi e scatto indicati. */
function strike(id: string, damage: number, hitbox: AttackDefinition["hitbox"], extra: Partial<AttackDefinition> = {}): AttackDefinition {
  return { id, damage, durationMs: 460, hitStartMs: 200, hitEndMs: 300, cooldownMs: 150, hitbox, animation: id, ...extra };
}

/** Classi Fase 5: area intorno al personaggio, davanti e dietro (come l'onda d'urto). */
const AROUND_HITBOX = { x: -40, y: 0, width: 92, height: 24 };

/** Classi Fase 5: freccia speciale del Ranger, con un elemento e senza consumare munizioni (sprite proprio dalla Fase 6A). */
function elementArrow(id: string, damage: number, element: ElementId, projectileId: ProjectileTypeId): AttackDefinition {
  return {
    id,
    damage,
    durationMs: 360,
    hitStartMs: 0,
    hitEndMs: 0,
    cooldownMs: 150,
    hitbox: NO_HITBOX,
    animation: id,
    projectile: { projectileId, launchAtMs: 180, originX: 20, originY: 9, aimY: 0, usesAmmo: false },
    elements: [element],
  };
}

/** Classi Fase 5: una mossa d'attacco delle classi, di grado 1 e senza modificatori. */
function attackAbility(
  id: AbilityId,
  name: string,
  description: string,
  cost: ResourceCost,
  cooldownMs: number,
  attack: AttackDefinition,
  impactEffect?: "shockwave"
): AbilityDefinition {
  return { id, kind: "attack", name, description, cost, cooldownMs, modifiers: [], grade: 1, attack, ...(impactEffect === undefined ? {} : { impactEffect }) };
}

export const ABILITY_CONFIG: Record<AbilityId, AbilityDefinition> = {
  shockwave: {
    id: "shockwave",
    kind: "attack",
    name: "ONDA D'URTO",
    description: "Colpisce tutti intorno",
    cost: { stamina: 40 },
    cooldownMs: 6000,
    modifiers: [],
    grade: 1,
    attack: SHOCKWAVE_ATTACK,
    impactEffect: "shockwave",
  },
  backstepShot: {
    id: "backstepShot",
    kind: "attack",
    name: "TIRO IN RITIRATA",
    description: "Balzo indietro e freccia",
    cost: { stamina: 30 },
    cooldownMs: 4000,
    modifiers: [],
    grade: 1,
    attack: BACKSTEP_SHOT_ATTACK,
  },
  furiousCharge: {
    id: "furiousCharge",
    kind: "attack",
    name: "CARICA FURIOSA",
    description: "Travolge chi incontra",
    cost: { stamina: 40 },
    cooldownMs: 5000,
    modifiers: [],
    grade: 1,
    attack: FURIOUS_CHARGE_ATTACK,
  },
  shieldGuard: {
    id: "shieldGuard",
    kind: "guard",
    name: "SCUDO",
    description: "Tieni 7: para davanti",
    cost: { stamina: 10 },
    cooldownMs: 300,
    modifiers: [],
    grade: 1,
    resource: "stamina",
    drainPerSecond: 12,
    perfectWindowMs: 250,
    costPerBlockedDamage: 1.5,
    parryStunMs: 1000,
  },
  firebolt: {
    id: "firebolt",
    kind: "attack",
    name: "DARDO DI FUOCO",
    description: "Proiettile che brucia",
    cost: { mana: 15 },
    cooldownMs: 900,
    modifiers: [],
    grade: 1,
    attack: FIREBOLT_ATTACK,
  },
  frostNova: {
    id: "frostNova",
    kind: "attack",
    name: "NOVA DI GELO",
    description: "Gela tutti intorno",
    cost: { mana: 30 },
    cooldownMs: 5000,
    modifiers: [],
    grade: 1,
    attack: FROST_NOVA_ATTACK,
    impactEffect: "shockwave",
  },
  arcaneLeap: {
    id: "arcaneLeap",
    kind: "attack",
    name: "BALZO ARCANO",
    description: "Balzo indietro",
    cost: { mana: 20 },
    cooldownMs: 3000,
    modifiers: [],
    grade: 1,
    attack: ARCANE_LEAP_ATTACK,
  },
  arcaneBarrier: {
    id: "arcaneBarrier",
    kind: "guard",
    name: "BARRIERA",
    description: "Tieni 0: para davanti",
    cost: { mana: 10 },
    cooldownMs: 300,
    modifiers: [],
    grade: 1,
    resource: "mana",
    drainPerSecond: 10,
    perfectWindowMs: 250,
    costPerBlockedDamage: 1,
    parryStunMs: 1000,
  },

  // --- Classi Fase 5: Cavaliere ---
  lunge: attackAbility("lunge", "AFFONDO", "Scatto e stoccata", { stamina: 25 }, 3500,
    strike("abilityLunge", 22, { x: 6, y: 6, width: 30, height: 12 }, { durationMs: 400, hitStartMs: 100, hitEndMs: 280, dash: { speed: 200, startMs: 80, endMs: 260 } })),
  shieldBash: attackAbility("shieldBash", "COLPO DI SCUDO", "Colpo che stordisce", { stamina: 25 }, 6000,
    strike("abilityShieldBash", 14, { x: 6, y: 2, width: 18, height: 20 }, { durationMs: 380, hitStartMs: 140, hitEndMs: 240, elements: ["shock"] })),
  flameBlade: attackAbility("flameBlade", "LAMA ARDENTE", "Fendente di fuoco", { stamina: 35 }, 6000,
    strike("abilityFlameBlade", 28, { x: 6, y: 2, width: 30, height: 22 }, { elements: ["fire"] })),

  // --- Classi Fase 5: Ranger ---
  poisonArrow: attackAbility("poisonArrow", "FRECCIA VELENOSA", "Freccia che avvelena", { stamina: 25 }, 4000,
    elementArrow("abilityPoisonArrow", 14, "poison", "poisonArrow")),
  frostArrow: attackAbility("frostArrow", "FRECCIA GELIDA", "Freccia che gela", { stamina: 25 }, 5000,
    elementArrow("abilityFrostArrow", 14, "frost", "frostArrow")),
  fireArrow: attackAbility("fireArrow", "FRECCIA DI FUOCO", "Freccia che brucia", { stamina: 30 }, 5000,
    elementArrow("abilityFireArrow", 18, "fire", "fireArrow")),

  // --- Classi Fase 5: Berserker ---
  hotAxe: attackAbility("hotAxe", "ASCIA ROVENTE", "Fendente di fuoco", { stamina: 30 }, 4500,
    strike("abilityHotAxe", 30, { x: 6, y: 2, width: 26, height: 22 }, { elements: ["fire"] })),
  earthquake: attackAbility("earthquake", "TERREMOTO", "Scuote tutti intorno", { stamina: 40 }, 7000,
    strike("abilityEarthquake", 20, AROUND_HITBOX, { elements: ["shock"] }), "shockwave"),
  bloodStrike: attackAbility("bloodStrike", "COLPO DI SANGUE", "Paghi con la salute", { health: 8 }, 6000,
    strike("abilityBloodStrike", 55, { x: 4, y: 0, width: 30, height: 24 }, { durationMs: 620, hitStartMs: 300, hitEndMs: 440, breaksGuard: true })),

  // --- Classi Fase 5: Paladino ---
  holyHammer: attackAbility("holyHammer", "MARTELLO SACRO", "Colpo che stordisce", { stamina: 30 }, 5000,
    strike("abilityHolyHammer", 24, { x: 6, y: 2, width: 24, height: 22 }, { elements: ["shock"], breaksGuard: true })),
  consecration: attackAbility("consecration", "CONSACRAZIONE", "Fuoco tutto intorno", { stamina: 40 }, 7000,
    strike("abilityConsecration", 18, AROUND_HITBOX, { elements: ["fire"] }), "shockwave"),
  frozenJudgement: attackAbility("frozenJudgement", "GIUDIZIO GELIDO", "Gela tutti intorno", { stamina: 40 }, 7000,
    strike("abilityFrozenJudgement", 18, AROUND_HITBOX, { elements: ["frost"] }), "shockwave"),
};

/** Mosse imparate durante la partita (Classi Fase 5): quante se ne conoscono all'inizio e la probabilità dal forziere. */
export const ABILITY_UNLOCK_CONFIG = {
  startingCount: 2,
  chestChance: 0.25,
} as const;

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
