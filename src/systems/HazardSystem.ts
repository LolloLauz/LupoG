import { HAZARD_CONFIG } from "../config/hazardConfig";
import { NORMAL_PLAYER_ENVIRONMENT, type Player } from "../entities/Player";
import type { PlayerEnvironment } from "../types/EntityTypes";
import type { HazardDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/** Ambiente in acqua (moltiplicatori da HAZARD_CONFIG.water). */
const WATER_ENVIRONMENT: PlayerEnvironment = {
  speedMultiplier: HAZARD_CONFIG.water.speedMultiplier,
  gravityMultiplier: HAZARD_CONFIG.water.gravityMultiplier,
  maxFallSpeedMultiplier: HAZARD_CONFIG.water.maxFallSpeedMultiplier,
  jumpMultiplier: HAZARD_CONFIG.water.jumpMultiplier,
  traction: null,
  canSwim: true,
};

/** Ambiente sul ghiaccio: come quello normale ma con poca aderenza. */
const ICE_ENVIRONMENT: PlayerEnvironment = {
  ...NORMAL_PLAYER_ENVIRONMENT,
  traction: HAZARD_CONFIG.ice.traction,
};

/**
 * Pericoli e zone speciali dei livelli:
 * - acqua: il giocatore è "in acqua" quando il centro del corpo è nella zona;
 * - ghiaccio: vale quando il giocatore è a terra e i piedi toccano la zona (che deve stare a cavallo
 *   della superficie, es. da y - 2 a y + 2);
 * - spuntoni: al contatto feriscono e respingono (la fonte del colpo è il centro degli spuntoni).
 */
export class HazardSystem {
  /** Ambiente in cui si trova il giocatore adesso (l'acqua ha la precedenza sul ghiaccio). */
  public computePlayerEnvironment(player: Player, hazards: readonly HazardDefinition[]): PlayerEnvironment {
    const bounds = player.getBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const isInWater = hazards.some(
      (hazard) =>
        hazard.kind === "water" &&
        centerX >= hazard.x &&
        centerX <= hazard.x + hazard.width &&
        centerY >= hazard.y &&
        centerY <= hazard.y + hazard.height
    );
    if (isInWater) {
      return WATER_ENVIRONMENT;
    }
    // gli scatti delle abilità si fermano prima degli spuntoni (come sul bordo di un abisso)
    const spikes = hazards.filter((hazard) => hazard.kind === "spikes");
    const withDashStops = (environment: PlayerEnvironment): PlayerEnvironment =>
      spikes.length === 0 ? environment : { ...environment, dashStopZones: spikes };
    if (player.isOnGround) {
      const feetProbe = { x: bounds.x, y: bounds.y + bounds.height - 1, width: bounds.width, height: 3 };
      if (hazards.some((hazard) => hazard.kind === "ice" && CollisionSystem.intersects(feetProbe, hazard))) {
        return withDashStops(ICE_ENVIRONMENT);
      }
    }
    return withDashStops(NORMAL_PLAYER_ENVIRONMENT);
  }

  /** Spuntoni: se il giocatore li tocca subisce danno e rinculo. Restituisce vero se il colpo è andato a segno. */
  public applyContactDamage(player: Player, hazards: readonly HazardDefinition[]): boolean {
    const bounds = player.getBounds();
    for (const hazard of hazards) {
      if (hazard.kind === "spikes" && CollisionSystem.intersects(bounds, hazard)) {
        return player.takeDamage(HAZARD_CONFIG.spikes.damage, hazard.x + hazard.width / 2);
      }
    }
    return false;
  }
}
