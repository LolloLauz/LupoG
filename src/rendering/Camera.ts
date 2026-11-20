import type { Rectangle } from "../types/GameTypes";

/** Camera laterale: segue il bersaglio senza uscire dai bordi della mappa. */
export class Camera {
  /** Angolo in alto a sinistra della vista, in coordinate mondo (interi). */
  public x = 0;
  public y = 0;

  constructor(
    private readonly viewWidth: number,
    private readonly viewHeight: number
  ) {}

  /** Centra la camera sul bersaglio e la limita ai bordi della mappa. */
  public follow(target: Rectangle, mapWidth: number, mapHeight: number): void {
    const desiredX = target.x + target.width / 2 - this.viewWidth / 2;
    const desiredY = target.y + target.height / 2 - this.viewHeight / 2;
    this.x = Math.round(Math.max(0, Math.min(desiredX, mapWidth - this.viewWidth)));
    this.y = Math.round(Math.max(0, Math.min(desiredY, mapHeight - this.viewHeight)));
  }
}
