import type { ProjectileDefinition, ProjectileTypeId } from "../types/EntityTypes";

/**
 * Catalogo dei proiettili. Il danno lo decide chi lancia (nemico, boss o giocatore); qui ci sono
 * velocità, traiettoria, durata, dimensioni e aspetto. Gli sprite sono in projectileSprites.ts.
 * Per aggiungerne uno: nuovo id in ProjectileTypeId (EntityTypes.ts), voce qui e sprite.
 */
/**
 * Classi Fase 6A: freccia di una mossa del Ranger, con i valori della freccia del giocatore e uno sprite proprio
 * ("projectileArrow" + elemento, a due frame per la scia).
 */
function elementArrow(id: ProjectileTypeId, name: string, spriteElement: string): ProjectileDefinition {
  return {
    id,
    name,
    speed: 220,
    gravityScale: 0.12,
    lifetimeMs: 1600,
    hitbox: { width: 10, height: 3 },
    isDeflectable: false,
    frameIds: [`projectileArrow${spriteElement}1`, `projectileArrow${spriteElement}2`],
    frameDurationMs: 80,
  };
}

export const PROJECTILE_CONFIG: Record<ProjectileTypeId, ProjectileDefinition> = {
  arrow: {
    id: "arrow",
    name: "Freccia",
    speed: 170,
    gravityScale: 0,
    lifetimeMs: 2000,
    hitbox: { width: 10, height: 3 },
    isDeflectable: true,
    frameIds: ["projectileArrow"],
    frameDurationMs: 100,
  },
  magicBolt: {
    id: "magicBolt",
    element: "shock",
    name: "Dardo magico",
    speed: 110,
    gravityScale: 0,
    lifetimeMs: 3000,
    hitbox: { width: 7, height: 7 },
    isDeflectable: true,
    frameIds: ["projectileBolt1", "projectileBolt2"],
    frameDurationMs: 90,
  },
  fireball: {
    id: "fireball",
    element: "fire",
    name: "Palla di fuoco",
    speed: 130,
    gravityScale: 0,
    lifetimeMs: 3000,
    hitbox: { width: 8, height: 8 },
    isDeflectable: false,
    frameIds: ["projectileFire1", "projectileFire2"],
    frameDurationMs: 80,
  },
  // --- proiettili del giocatore (Fase 2: armi a distanza) ---
  playerArrow: {
    id: "playerArrow",
    name: "Freccia",
    speed: 220,
    gravityScale: 0.12,
    lifetimeMs: 1600,
    hitbox: { width: 10, height: 3 },
    isDeflectable: false,
    frameIds: ["projectilePlayerArrow"],
    frameDurationMs: 100,
  },
  crossbowBolt: {
    id: "crossbowBolt",
    name: "Dardo di balestra",
    speed: 300,
    gravityScale: 0,
    lifetimeMs: 1200,
    hitbox: { width: 10, height: 4 },
    isDeflectable: false,
    frameIds: ["projectileCrossbowBolt"],
    frameDurationMs: 100,
  },
  // Fase 8: accetta lanciata dai predoni e dal Signore delle Lande; la spada può respingerla
  hatchet: {
    id: "hatchet",
    name: "Accetta",
    speed: 150,
    gravityScale: 0,
    lifetimeMs: 1800,
    hitbox: { width: 8, height: 6 },
    isDeflectable: true,
    frameIds: ["projectileHatchet1", "projectileHatchet2", "projectileHatchet3", "projectileHatchet4"],
    frameDurationMs: 70,
  },
  throwingKnife: {
    id: "throwingKnife",
    name: "Coltello",
    speed: 230,
    gravityScale: 0.25,
    lifetimeMs: 1400,
    hitbox: { width: 6, height: 6 },
    isDeflectable: false,
    frameIds: ["projectileKnife1", "projectileKnife2", "projectileKnife3", "projectileKnife4"],
    frameDurationMs: 50,
    recoveredAsAmmoOf: "throwingKnives",
  },
  // Classi Fase 2: dardo di fuoco del Mago (la bruciatura la dà l'incantesimo); sprite propri dalla Classi Fase 6A
  arcaneFireball: {
    id: "arcaneFireball",
    name: "Dardo di fuoco",
    speed: 200,
    gravityScale: 0,
    lifetimeMs: 1500,
    hitbox: { width: 8, height: 8 },
    isDeflectable: false,
    frameIds: ["projectileFirebolt1", "projectileFirebolt2", "projectileFirebolt3"],
    frameDurationMs: 70,
  },
  // Classi Fase 6A: frecce delle mosse del Ranger, come la freccia del giocatore con la punta dell'elemento
  fireArrow: elementArrow("fireArrow", "Freccia di fuoco", "Fire"),
  frostArrow: elementArrow("frostArrow", "Freccia gelida", "Frost"),
  poisonArrow: elementArrow("poisonArrow", "Freccia velenosa", "Poison"),
  javelin: {
    id: "javelin",
    name: "Giavellotto",
    speed: 210,
    gravityScale: 0.35,
    lifetimeMs: 2000,
    hitbox: { width: 16, height: 4 },
    isDeflectable: false,
    frameIds: ["projectileJavelin"],
    frameDurationMs: 100,
    isPiercing: true,
  },
};
