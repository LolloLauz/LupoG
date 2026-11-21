import type { ProjectileDefinition, ProjectileTypeId } from "../types/EntityTypes";

/**
 * Catalogo dei proiettili. Il danno lo decide chi lancia (nemico o boss); qui ci sono
 * velocità, traiettoria, durata, dimensioni e aspetto. Gli sprite sono in projectileSprites.ts.
 * Per aggiungerne uno: nuovo id in ProjectileTypeId (EntityTypes.ts), voce qui e sprite.
 */
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
    name: "Palla di fuoco",
    speed: 130,
    gravityScale: 0,
    lifetimeMs: 3000,
    hitbox: { width: 8, height: 8 },
    isDeflectable: false,
    frameIds: ["projectileFire1", "projectileFire2"],
    frameDurationMs: 80,
  },
};
