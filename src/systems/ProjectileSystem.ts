import { PROJECTILE_CONFIG } from "../config/projectileConfig";
import { Projectile } from "../entities/Projectile";
import type { Player } from "../entities/Player";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { ProjectileLaunch } from "../types/EntityTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/** Che cosa è successo a un proiettile in questo frame (il motore lo usa per gli effetti). */
export interface ProjectileEvent {
  kind: "hitPlayer" | "deflected" | "impact";
  x: number;
  y: number;
}

/** Margine (px) oltre i bordi della mappa entro cui un proiettile resta in gioco. */
const OUT_OF_MAP_MARGIN = 32;

/**
 * Gestisce i proiettili nemici. Regole:
 * - colpisce il giocatore una volta e sparisce; se il giocatore è invulnerabile (schivata, appena
 *   colpito) gli passa attraverso e prosegue;
 * - la spada del giocatore distrugge i proiettili "deviabili" (isDeflectable) che tocca;
 * - sparisce contro le piattaforme solide (non quelle attraversabili), fuori dalla mappa o a fine durata.
 */
export class ProjectileSystem {
  private projectiles: Projectile[] = [];

  public get activeProjectiles(): readonly Projectile[] {
    return this.projectiles;
  }

  public spawn(launch: ProjectileLaunch): void {
    this.projectiles.push(new Projectile(PROJECTILE_CONFIG[launch.projectileId], launch));
  }

  public clear(): void {
    this.projectiles = [];
  }

  public update(
    deltaTimeSeconds: number,
    player: Player,
    platforms: PlatformDefinition[],
    mapWidth: number,
    mapHeight: number
  ): ProjectileEvent[] {
    const events: ProjectileEvent[] = [];
    const swordHitbox = player.getActiveAttackHitbox();
    for (const projectile of this.projectiles) {
      projectile.update(deltaTimeSeconds);
      const bounds = projectile.getBounds();
      if (projectile.definition.isDeflectable && swordHitbox !== null && CollisionSystem.intersects(swordHitbox, bounds)) {
        projectile.destroy();
        events.push({ kind: "deflected", x: projectile.centerX, y: projectile.centerY });
        continue;
      }
      if (CollisionSystem.intersects(bounds, player.getBounds())) {
        // la fonte del colpo è dietro il proiettile: il rinculo spinge nel verso in cui viaggiava
        const sourceCenterX = projectile.centerX - Math.sign(projectile.velocityX) * 8;
        if (player.takeDamage(projectile.damage, sourceCenterX)) {
          projectile.destroy();
          events.push({ kind: "hitPlayer", x: projectile.centerX, y: projectile.centerY });
          continue;
        }
      }
      const hitsWall = platforms.some((platform) => platform.oneWay !== true && CollisionSystem.intersects(bounds, platform));
      if (hitsWall) {
        projectile.destroy();
        events.push({ kind: "impact", x: projectile.centerX, y: projectile.centerY });
        continue;
      }
      const isOutOfMap =
        bounds.x + bounds.width < -OUT_OF_MAP_MARGIN ||
        bounds.x > mapWidth + OUT_OF_MAP_MARGIN ||
        bounds.y > mapHeight + OUT_OF_MAP_MARGIN ||
        bounds.y + bounds.height < -OUT_OF_MAP_MARGIN;
      if (isOutOfMap) {
        projectile.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.isExpired);
    return events;
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    for (const projectile of this.projectiles) {
      const screenX = projectile.positionX - cameraX;
      if (screenX < -16 || screenX > renderer.width + 16) {
        continue;
      }
      const frameId = projectile.currentFrameId;
      const spriteSize = spriteManager.getSpriteSize(frameId);
      // lo sprite è centrato sull'hitbox
      spriteManager.drawSprite(
        renderer,
        frameId,
        projectile.centerX - spriteSize.width / 2 - cameraX,
        projectile.centerY - spriteSize.height / 2 - cameraY,
        projectile.facingDirection === "left"
      );
    }
  }
}
