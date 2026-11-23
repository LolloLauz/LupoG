import { PALETTE } from "../config/gameConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import { AmmoDrop } from "../entities/AmmoDrop";
import type { Player } from "../entities/Player";
import { WeaponPickup } from "../entities/WeaponPickup";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { WeaponId } from "../types/EntityTypes";
import { GAME_CONFIG } from "../config/gameConfig";
import type { PlatformDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/**
 * Armi a terra (Fase 1 del piano espansioni). Si raccolgono con E e vanno nella borsa (Inventory);
 * se la borsa è piena, l'arma in mano resta a terra al posto di quella presa (spawn con isArmed false),
 * così si può tornare indietro e riprenderla.
 */
export class WeaponPickupManager {
  private pickups: WeaponPickup[] = [];
  /** Munizioni cadute (coltelli lanciati): si recuperano passandoci sopra. */
  private ammoDrops: AmmoDrop[] = [];
  private elapsedSeconds = 0;

  public get activePickups(): readonly WeaponPickup[] {
    return this.pickups;
  }

  public get activeAmmoDrops(): readonly AmmoDrop[] {
    return this.ammoDrops;
  }

  public clear(): void {
    this.ammoDrops = [];
    this.pickups = [];
    this.elapsedSeconds = 0;
  }

  /** Posa un'arma a terra: centerX al centro, bottomY sul terreno. */
  public spawn(weaponId: WeaponId, centerX: number, bottomY: number, isArmed = true, ammo: number | null = null): WeaponPickup {
    const pickup = new WeaponPickup(weaponId, centerX, bottomY, isArmed, ammo);
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

  /** Una munizione cade a terra nel punto indicato (centro). */
  public spawnAmmoDrop(weaponId: WeaponId, spriteId: string, centerX: number, centerY: number): AmmoDrop {
    const drop = new AmmoDrop(weaponId, spriteId, centerX, centerY);
    this.ammoDrops.push(drop);
    return drop;
  }

  /** Le munizioni cadono fino al terreno; quelle finite negli abissi si perdono. */
  public updateAmmoDrops(deltaTimeSeconds: number, collisionSystem: CollisionSystem, platforms: PlatformDefinition[], mapWidth: number, mapHeight: number): void {
    for (const drop of this.ammoDrops) {
      if (!drop.isOnGround) {
        drop.velocityX = 0;
        collisionSystem.applyGravityAndMove(drop, deltaTimeSeconds, GAME_CONFIG.gravity, GAME_CONFIG.maxFallSpeed, platforms, mapWidth);
      }
    }
    this.ammoDrops = this.ammoDrops.filter((drop) => drop.positionY < mapHeight + 32);
  }

  /** Munizioni a terra che il giocatore sta toccando. */
  public findTouchedAmmoDrops(player: Player): AmmoDrop[] {
    const playerBounds = player.getBounds();
    return player.isDead ? [] : this.ammoDrops.filter((drop) => CollisionSystem.intersects(playerBounds, drop.getBounds()));
  }

  public removeAmmoDrop(drop: AmmoDrop): void {
    this.ammoDrops = this.ammoDrops.filter((candidate) => candidate !== drop);
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
    for (const drop of this.ammoDrops) {
      spriteManager.drawSprite(renderer, drop.spriteId, drop.positionX - cameraX, drop.positionY - cameraY, false);
    }
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
