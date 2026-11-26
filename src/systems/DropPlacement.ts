import type { HazardDefinition, PlatformDefinition } from "../types/LevelTypes";

/** Dove posare un oggetto a terra: il centro e il fondo (che poggia sul terreno). */
export interface DropPoint {
  centerX: number;
  bottomY: number;
}

/** Tolleranza (px): un punto di poco sotto la superficie conta ancora come appoggiato lì. */
const SURFACE_TOLERANCE = 4;

/**
 * Terreno su cui un oggetto può restare in quel punto: fermo (le piattaforme mobili se ne andrebbero senza di lui) e
 * senza spuntoni.
 */
function isRestingSurface(platform: PlatformDefinition, centerX: number, hazards: readonly HazardDefinition[]): boolean {
  if (platform.isMoving === true || centerX < platform.x || centerX > platform.x + platform.width) {
    return false;
  }
  return !hazards.some(
    (hazard) =>
      hazard.kind === "spikes" &&
      centerX >= hazard.x &&
      centerX <= hazard.x + hazard.width &&
      Math.abs(hazard.y + hazard.height - platform.y) <= SURFACE_TOLERANCE
  );
}

/**
 * Posa del bottino: gli oggetti non cadono da soli, quindi si portano subito sul primo terreno sotto il punto in cui
 * escono (un nemico ucciso in volo, un oggetto scambiato in salto). Se sotto non c'è dove posarli (abisso), vanno sul
 * ripiego, un punto di terreno già raggiunto dal giocatore.
 */
export function findDropPoint(
  centerX: number,
  bottomY: number,
  platforms: readonly PlatformDefinition[],
  hazards: readonly HazardDefinition[],
  fallback: DropPoint
): DropPoint {
  let surfaceY: number | null = null;
  for (const platform of platforms) {
    if (platform.y >= bottomY - SURFACE_TOLERANCE && (surfaceY === null || platform.y < surfaceY) && isRestingSurface(platform, centerX, hazards)) {
      surfaceY = platform.y;
    }
  }
  return surfaceY === null ? { ...fallback } : { centerX, bottomY: surfaceY };
}
