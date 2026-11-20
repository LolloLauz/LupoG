import type { GameObject } from "../entities/GameObject";
import type { PlatformDefinition } from "../types/LevelTypes";
import type { Rectangle } from "../types/GameTypes";

/** Collisioni tra entità e terreno (e, in seguito, tra attacchi e bersagli). */
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
}
