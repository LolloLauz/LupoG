import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { Damageable, WeaponId } from "../types/EntityTypes";
import { GameObject } from "./GameObject";

/** Dimensioni del forziere: si posa con y = superficie - CHEST_SIZE.height. */
export const CHEST_SIZE = { width: 16, height: 12 } as const;

/**
 * Forziere con un'arma: si apre al primo colpo del giocatore (qualsiasi arma) e da quel momento
 * non conta più come bersaglio. Il motore, vedendolo aprirsi, fa comparire l'arma (vedi drainOpenedWeapon).
 */
export class Chest extends GameObject implements Damageable {
  private isOpen = false;
  private hasReleasedWeapon = false;

  constructor(
    startX: number,
    startY: number,
    public readonly weaponId: WeaponId
  ) {
    super(startX, startY, CHEST_SIZE.width, CHEST_SIZE.height);
  }

  /** Un forziere chiuso si può colpire (come un nemico vivo); aperto, no. */
  public get isAlive(): boolean {
    return !this.isOpen;
  }

  public get isOpened(): boolean {
    return this.isOpen;
  }

  public receiveHit(): void {
    this.isOpen = true;
  }

  /** L'arma contenuta, una sola volta dopo l'apertura (altrimenti null). */
  public drainOpenedWeapon(): WeaponId | null {
    if (!this.isOpen || this.hasReleasedWeapon) {
      return null;
    }
    this.hasReleasedWeapon = true;
    return this.weaponId;
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    spriteManager.drawSprite(renderer, this.isOpen ? "chestOpen" : "chestClosed", this.positionX - cameraX, this.positionY - cameraY, false);
  }
}
