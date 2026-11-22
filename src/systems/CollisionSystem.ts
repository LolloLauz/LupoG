import type { GameObject } from "../entities/GameObject";
import type { PlatformDefinition } from "../types/LevelTypes";
import type { Rectangle } from "../types/GameTypes";

/** Collisioni tra entità e terreno, tra corpi solidi e tra attacchi e bersagli. */
export class CollisionSystem {
  /** Vero se i due rettangoli si sovrappongono (il semplice contatto non conta). */
  public static intersects(first: Rectangle, second: Rectangle): boolean {
    return (
      first.x < second.x + second.width &&
      first.x + first.width > second.x &&
      first.y < second.y + second.height &&
      first.y + first.height > second.y
    );
  }

  /**
   * Applica la gravità e muove l'oggetto (poi risolve le collisioni).
   * Usa la **velocità media** del frame (tra quella iniziale e quella finale) per calcolare lo
   * spostamento verticale: con gravità costante la traiettoria è esatta, quindi altezza e durata
   * del salto non dipendono dagli FPS. (Con la sola velocità finale il salto sarebbe più basso
   * a frequenze basse.)
   */
  public applyGravityAndMove(
    gameObject: GameObject,
    deltaTimeSeconds: number,
    gravity: number,
    maxFallSpeed: number,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    const previousVelocityY = gameObject.velocityY;
    const newVelocityY = Math.min(previousVelocityY + gravity * deltaTimeSeconds, maxFallSpeed);
    const averageVelocityY = (previousVelocityY + newVelocityY) / 2;
    gameObject.velocityY = averageVelocityY;
    this.moveAndCollide(gameObject, deltaTimeSeconds, platforms, mapWidth);
    // se una collisione (terreno o soffitto) ha azzerato la velocità, resta azzerata
    const wasStoppedByCollision = gameObject.velocityY === 0 && averageVelocityY !== 0;
    if (!wasStoppedByCollision) {
      gameObject.velocityY = newVelocityY;
    }
  }

  /**
   * Muove l'oggetto secondo la sua velocità e risolve le collisioni.
   * Prima si muove sull'asse X, poi sull'asse Y, così le collisioni
   * orizzontali e verticali non si confondono.
   * Aggiorna anche isOnGround. Con le velocità massime configurate lo
   * spostamento per frame resta inferiore allo spessore delle piattaforme.
   */
  public moveAndCollide(
    gameObject: GameObject,
    deltaTimeSeconds: number,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    // --- asse X ---
    gameObject.positionX += gameObject.velocityX * deltaTimeSeconds;
    gameObject.positionX = Math.max(0, Math.min(gameObject.positionX, mapWidth - gameObject.width));
    for (const platform of platforms) {
      if (platform.oneWay === true) {
        continue; // le piattaforme sospese non bloccano di lato
      }
      if (CollisionSystem.intersects(gameObject.getBounds(), platform)) {
        if (gameObject.velocityX > 0) {
          gameObject.positionX = platform.x - gameObject.width;
        } else if (gameObject.velocityX < 0) {
          gameObject.positionX = platform.x + platform.width;
        }
      }
    }

    // un muro o una piattaforma non possono spingere l'oggetto fuori dalla mappa
    gameObject.positionX = Math.max(0, Math.min(gameObject.positionX, mapWidth - gameObject.width));

    // --- asse Y ---
    const previousBottom = gameObject.positionY + gameObject.height;
    gameObject.positionY += gameObject.velocityY * deltaTimeSeconds;
    gameObject.isOnGround = false;
    for (const platform of platforms) {
      if (!CollisionSystem.intersects(gameObject.getBounds(), platform)) {
        continue;
      }
      if (gameObject.velocityY > 0 && previousBottom <= platform.y + 0.001) {
        // atterraggio sopra la piattaforma
        gameObject.positionY = platform.y - gameObject.height;
        gameObject.velocityY = 0;
        gameObject.isOnGround = true;
      } else if (gameObject.velocityY < 0 && platform.oneWay !== true) {
        // testata contro il soffitto
        gameObject.positionY = platform.y + platform.height;
        gameObject.velocityY = 0;
      }
    }
  }

  /**
   * Corpi solidi (giocatore contro nemici): se mover e obstacle si sovrappongono, mover viene spinto
   * fuori di lato, dalla parte in cui si trova il suo centro. Se lì c'è un muro o il bordo della
   * mappa, si sposta invece l'ostacolo dall'altra parte (se può). Restituisce true se si toccavano.
   */
  public separateHorizontally(
    mover: GameObject,
    obstacle: GameObject,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): boolean {
    const moverBounds = mover.getBounds();
    const obstacleBounds = obstacle.getBounds();
    if (!CollisionSystem.intersects(moverBounds, obstacleBounds)) {
      return false;
    }
    const moverCenterX = moverBounds.x + moverBounds.width / 2;
    const obstacleCenterX = obstacleBounds.x + obstacleBounds.width / 2;
    // a centri allineati decide da che parte arrivava chi si muove
    const side =
      moverCenterX !== obstacleCenterX
        ? Math.sign(moverCenterX - obstacleCenterX)
        : mover.velocityX !== 0
          ? -Math.sign(mover.velocityX)
          : mover.facingDirection === "right" ? -1 : 1;
    const moverTargetX = side < 0 ? obstacleBounds.x - moverBounds.width : obstacleBounds.x + obstacleBounds.width;
    if (CollisionSystem.canOccupy(mover, moverTargetX, platforms, mapWidth)) {
      mover.positionX = moverTargetX;
      return true;
    }
    const obstacleTargetX = side < 0 ? moverBounds.x + moverBounds.width : moverBounds.x - obstacleBounds.width;
    if (CollisionSystem.canOccupy(obstacle, obstacleTargetX, platforms, mapWidth)) {
      obstacle.positionX = obstacleTargetX;
    }
    return true;
  }

  /** Vero se l'oggetto, spostato in orizzontale a x, resta nella mappa e non entra in un muro. */
  private static canOccupy(gameObject: GameObject, x: number, platforms: PlatformDefinition[], mapWidth: number): boolean {
    if (x < 0 || x + gameObject.width > mapWidth) {
      return false;
    }
    const bounds = { x, y: gameObject.positionY, width: gameObject.width, height: gameObject.height };
    return !platforms.some((platform) => platform.oneWay !== true && CollisionSystem.intersects(bounds, platform));
  }
}
