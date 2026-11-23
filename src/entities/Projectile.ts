import { GAME_CONFIG } from "../config/gameConfig";
import type { Damageable, HitProperties, ProjectileDefinition, ProjectileLaunch } from "../types/EntityTypes";
import { GameObject } from "./GameObject";

/**
 * Proiettile (freccia, dardo, palla di fuoco; del giocatore: freccia, dardo di balestra, coltello,
 * giavellotto). Si muove in linea retta (o ad arco se gravityScale > 0) finché non colpisce, tocca un
 * muro, esce dalla mappa o scade. Le regole di contatto sono in ProjectileSystem.
 */
export class Projectile extends GameObject {
  public readonly damage: number;
  /** Chi l'ha lanciato: decide chi può ferire. */
  public readonly owner: "enemy" | "player";
  public readonly hit: HitProperties;
  /** Bersagli già colpiti (un proiettile che trafigge colpisce ognuno una volta sola). */
  public readonly targetsHit = new Set<Damageable>();
  private elapsedMs = 0;
  private isFinished = false;

  constructor(public readonly definition: ProjectileDefinition, launch: ProjectileLaunch) {
    super(
      launch.origin.x - definition.hitbox.width / 2,
      launch.origin.y - definition.hitbox.height / 2,
      definition.hitbox.width,
      definition.hitbox.height
    );
    const length = Math.hypot(launch.direction.x, launch.direction.y);
    const directionX = length > 0 ? launch.direction.x / length : 1;
    const directionY = length > 0 ? launch.direction.y / length : 0;
    const speed = definition.speed * (launch.speedMultiplier ?? 1);
    this.velocityX = directionX * speed;
    this.velocityY = directionY * speed;
    this.facingDirection = directionX < 0 ? "left" : "right";
    this.damage = launch.damage;
    this.owner = launch.owner ?? "enemy";
    this.hit = launch.hit ?? {};
  }

  public get centerX(): number {
    return this.positionX + this.width / 2;
  }

  public get centerY(): number {
    return this.positionY + this.height / 2;
  }

  /** Vero quando il proiettile va tolto (colpito, scaduto, contro un muro). */
  public get isExpired(): boolean {
    return this.isFinished || this.hasTimedOut;
  }

  /** Vero se ha finito la sua durata in volo (anche se non è ancora stato tolto). */
  public get hasTimedOut(): boolean {
    return this.elapsedMs >= this.definition.lifetimeMs;
  }

  /** Id dello sprite da mostrare adesso (animazione a ciclo). */
  public get currentFrameId(): string {
    const frameIds = this.definition.frameIds;
    const frameIndex = Math.floor(this.elapsedMs / this.definition.frameDurationMs) % frameIds.length;
    return frameIds[frameIndex]!;
  }

  public update(deltaTimeSeconds: number): void {
    this.elapsedMs += deltaTimeSeconds * 1000;
    this.velocityY += GAME_CONFIG.gravity * this.definition.gravityScale * deltaTimeSeconds;
    this.positionX += this.velocityX * deltaTimeSeconds;
    this.positionY += this.velocityY * deltaTimeSeconds;
  }

  /** Segna il proiettile come finito (verrà tolto al prossimo aggiornamento del sistema). */
  public destroy(): void {
    this.isFinished = true;
  }
}
