import type { FacingDirection, Rectangle } from "../types/GameTypes";

/**
 * Classe base di ogni oggetto dotato di posizione e movimento.
 * positionX/positionY indicano l'angolo in alto a sinistra dell'hitbox
 * (in pixel del mondo di gioco). Le velocità sono in pixel al secondo.
 */
export abstract class GameObject {
  public velocityX = 0;
  public velocityY = 0;
  public facingDirection: FacingDirection = "right";
  /** Vero se l'oggetto poggia su una piattaforma (aggiornato dal CollisionSystem). */
  public isOnGround = false;

  constructor(
    public positionX: number,
    public positionY: number,
    public readonly width: number,
    public height: number
  ) {}

  public getBounds(): Rectangle {
    return { x: this.positionX, y: this.positionY, width: this.width, height: this.height };
  }
}
