import { PROJECTILE_CONFIG } from "../config/projectileConfig";
import { Projectile } from "../entities/Projectile";
import type { Player } from "../entities/Player";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { Damageable, ProjectileLaunch, WeaponId } from "../types/EntityTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/**
 * Che cosa è successo a un proiettile in questo frame (il motore lo usa per gli effetti):
 * hitTarget = un proiettile del giocatore ha colpito target con damage; dropAmmo = un coltello
 * è caduto e si può recuperare (munizione di weaponId).
 */
export type ProjectileEvent =
  | { kind: "hitPlayer" | "deflected" | "impact"; x: number; y: number }
  | { kind: "hitTarget"; x: number; y: number; target: Damageable; damage: number; directionX: 1 | -1 }
  | { kind: "dropAmmo"; x: number; y: number; weaponId: WeaponId; spriteId: string };

/** Margine (px) oltre i bordi della mappa entro cui un proiettile resta in gioco. */
const OUT_OF_MAP_MARGIN = 32;

/**
 * Gestisce i proiettili. Regole dei proiettili nemici:
 * - colpisce il giocatore una volta e sparisce; se il giocatore è invulnerabile (schivata, appena
 *   colpito) gli passa attraverso e prosegue;
 * - la spada del giocatore distrugge i proiettili "deviabili" (isDeflectable) che tocca.
 * Proiettili del giocatore (Fase 2): colpiscono i bersagli (nemici, boss, forzieri) e non il giocatore;
 * si fermano al primo, tranne quelli che trafiggono (isPiercing), che colpiscono ognuno una volta.
 * Un proiettile recuperabile (recoveredAsAmmoOf: il coltello) a fine corsa diventa una munizione a terra.
 * Tutti spariscono contro le piattaforme solide (non quelle attraversabili), fuori dalla mappa o a fine durata.
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
    mapHeight: number,
    targets: Damageable[] = []
  ): ProjectileEvent[] {
    const events: ProjectileEvent[] = [];
    const swordHitbox = player.getActiveAttackHitbox();
    for (const projectile of this.projectiles) {
      projectile.update(deltaTimeSeconds);
      const bounds = projectile.getBounds();
      if (projectile.owner === "player") {
        this.updatePlayerProjectile(projectile, targets, platforms, mapWidth, mapHeight, events);
        continue;
      }
      if (projectile.definition.isDeflectable && swordHitbox !== null && CollisionSystem.intersects(swordHitbox, bounds)) {
        projectile.destroy();
        events.push({ kind: "deflected", x: projectile.centerX, y: projectile.centerY });
        continue;
      }
      if (CollisionSystem.intersects(bounds, player.getBounds())) {
        // la fonte del colpo è dietro il proiettile: il rinculo spinge nel verso in cui viaggiava
        const sourceCenterX = projectile.centerX - Math.sign(projectile.velocityX) * 8;
        if (player.takeDamage(projectile.damage, sourceCenterX, projectile.definition.element)) {
          projectile.destroy();
          events.push({ kind: "hitPlayer", x: projectile.centerX, y: projectile.centerY });
          continue;
        }
        if (player.lastGuardOutcome === "perfect" || player.lastGuardOutcome === "blocked") {
          // parato con lo scudo: il proiettile si ferma contro lo scudo
          projectile.destroy();
          events.push({ kind: "deflected", x: projectile.centerX, y: projectile.centerY });
          continue;
        }
      }
      const hitsWall = platforms.some((platform) => platform.oneWay !== true && CollisionSystem.intersects(bounds, platform));
      if (hitsWall) {
        projectile.destroy();
        events.push({ kind: "impact", x: projectile.centerX, y: projectile.centerY });
        continue;
      }
      if (ProjectileSystem.isOutOfMap(projectile, mapWidth, mapHeight)) {
        projectile.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.isExpired);
    return events;
  }

  /** Proiettile del giocatore: bersagli, muri, fine corsa (e recupero del coltello). */
  private updatePlayerProjectile(
    projectile: Projectile,
    targets: Damageable[],
    platforms: PlatformDefinition[],
    mapWidth: number,
    mapHeight: number,
    events: ProjectileEvent[]
  ): void {
    const bounds = projectile.getBounds();
    const directionX = projectile.velocityX < 0 ? -1 : 1;
    for (const target of targets) {
      if (!target.isAlive || projectile.targetsHit.has(target) || !CollisionSystem.intersects(bounds, target.getBounds())) {
        continue;
      }
      projectile.targetsHit.add(target);
      target.receiveHit(projectile.damage, directionX < 0 ? "left" : "right", projectile.hit);
      events.push({ kind: "hitTarget", x: projectile.centerX, y: projectile.centerY, target, damage: projectile.damage, directionX });
      if (projectile.definition.isPiercing !== true) {
        this.finishPlayerProjectile(projectile, events);
        return;
      }
    }
    const hitsWall = platforms.some((platform) => platform.oneWay !== true && CollisionSystem.intersects(bounds, platform));
    if (hitsWall) {
      events.push({ kind: "impact", x: projectile.centerX, y: projectile.centerY });
      // il coltello rimbalza indietro dal muro prima di cadere, così non resta dentro la parete
      projectile.positionX -= directionX * (projectile.width + 2);
      this.finishPlayerProjectile(projectile, events);
      return;
    }
    if (ProjectileSystem.isOutOfMap(projectile, mapWidth, mapHeight)) {
      projectile.destroy(); // fuori dalla mappa: perso
      return;
    }
    if (projectile.hasTimedOut) {
      this.finishPlayerProjectile(projectile, events);
    }
  }

  /** Il proiettile del giocatore si ferma: sparisce e, se è recuperabile, resta a terra come munizione. */
  private finishPlayerProjectile(projectile: Projectile, events: ProjectileEvent[]): void {
    projectile.destroy();
    const weaponId = projectile.definition.recoveredAsAmmoOf;
    if (weaponId !== undefined) {
      const frameIds = projectile.definition.frameIds;
      // a terra si vede l'ultimo frame dell'animazione (il coltello disteso)
      events.push({ kind: "dropAmmo", x: projectile.centerX, y: projectile.centerY, weaponId, spriteId: frameIds[frameIds.length - 1]! });
    }
  }

  private static isOutOfMap(projectile: Projectile, mapWidth: number, mapHeight: number): boolean {
    const bounds = projectile.getBounds();
    return (
      bounds.x + bounds.width < -OUT_OF_MAP_MARGIN ||
      bounds.x > mapWidth + OUT_OF_MAP_MARGIN ||
      bounds.y > mapHeight + OUT_OF_MAP_MARGIN ||
      bounds.y + bounds.height < -OUT_OF_MAP_MARGIN
    );
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
