import { PALETTE } from "../config/gameConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import type { Player } from "../entities/Player";
import { WeaponPickup } from "../entities/WeaponPickup";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { WeaponId } from "../types/EntityTypes";
import { CollisionSystem } from "./CollisionSystem";

/**
 * Armi a terra (Fase 1 del piano espansioni). Si raccolgono con E e vanno nella borsa (Inventory);
 * se la borsa è piena, l'arma in mano resta a terra al posto di quella presa (spawn con isArmed false),
 * così si può tornare indietro e riprenderla.
 */
export class WeaponPickupManager {
  private pickups: WeaponPickup[] = [];
  private elapsedSeconds = 0;

  public get activePickups(): readonly WeaponPickup[] {
    return this.pickups;
  }

  public clear(): void {
    this.pickups = [];
    this.elapsedSeconds = 0;
  }

  /** Posa un'arma a terra: centerX al centro, bottomY sul terreno. */
  public spawn(weaponId: WeaponId, centerX: number, bottomY: number, isArmed = true): WeaponPickup {
    const pickup = new WeaponPickup(weaponId, centerX, bottomY, isArmed);
    this.pickups.push(pickup);
    return pickup;
  }

  /** Le armi lasciate dal giocatore diventano prendibili quando lui non le tocca più. */
  public update(deltaTimeSeconds: number, player: Player): void {
    this.elapsedSeconds += deltaTimeSeconds;
    const playerBounds = player.getBounds();
    for (const pickup of this.pickups) {
      if (!pickup.isArmed && !CollisionSystem.intersects(playerBounds, pickup.getBounds())) {
        pickup.isArmed = true;
      }
    }
  }

  /** L'arma pronta che il giocatore sta toccando (la prima), oppure null. */
  public findReachablePickup(player: Player): WeaponPickup | null {
    if (player.isDead) {
      return null;
    }
    const playerBounds = player.getBounds();
    return this.pickups.find((pickup) => pickup.isArmed && CollisionSystem.intersects(playerBounds, pickup.getBounds())) ?? null;
  }

  /** Toglie un'arma da terra (raccolta nella borsa). */
  public take(pickup: WeaponPickup): void {
    this.pickups = this.pickups.filter((candidate) => candidate !== pickup);
  }

  /**
   * Disegna le armi (oscillano di un pixel e brillano) e, sopra quella che il giocatore può
   * prendere, il suggerimento "E PRENDI" con il nome dell'arma.
   */
  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number, player: Player): void {
    const reachable = this.findReachablePickup(player);
    for (const pickup of this.pickups) {
      const screenX = pickup.positionX - cameraX;
      if (screenX < -pickup.width || screenX > renderer.width) {
        continue;
      }
      const bobOffset = Math.sin(this.elapsedSeconds * 4 + pickup.bobPhase) > 0 ? -1 : 0;
      const screenY = pickup.positionY - cameraY + bobOffset;
      renderer.fillGlow(screenX + pickup.width / 2, screenY + pickup.height / 2, 11, PALETTE.goldLight, 2, 4);
      spriteManager.drawSprite(renderer, WEAPON_CONFIG[pickup.weaponId].iconSpriteId, screenX, screenY, false);
      if (pickup === reachable) {
        const label = `E PRENDI ${WEAPON_CONFIG[pickup.weaponId].name.toUpperCase()}`;
        renderer.drawText(label, screenX + pickup.width / 2, screenY - 10, PALETTE.goldLight, { align: "center", shadowColor: PALETTE.black });
      }
    }
  }
}
