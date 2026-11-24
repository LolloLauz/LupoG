import { RARITY_CONFIG } from "../config/rarityConfig";
import { AmmoDrop } from "../entities/AmmoDrop";
import type { Player } from "../entities/Player";
import { WeaponPickup } from "../entities/WeaponPickup";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { WeaponId } from "../types/EntityTypes";
import type { ItemInstance, WeaponItem } from "../types/ItemTypes";
import { getItemIconVariant } from "../rendering/sprites/equipmentVisuals";
import { getItemIconSpriteId, getItemName, toWeaponItem } from "./ItemFactory";
import { GAME_CONFIG, PALETTE } from "../config/gameConfig";
import type { PlatformDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/**
 * Oggetti a terra: armi (Fase 1 del piano espansioni) e, dal piano dell'equipaggiamento, armature, con la loro
 * rarità. Si raccolgono con E: le armi vanno nella borsa (Inventory), le armature si indossano o vanno nello zaino.
 * Un oggetto lasciato dal giocatore resta a terra non prendibile (spawn con isArmed false) finché lui non si
 * allontana, così si può tornare indietro e riprenderlo.
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

  /** Posa un oggetto a terra (un id d'arma diventa un'arma Comune): centerX al centro, bottomY sul terreno. */
  public spawn(item: ItemInstance | WeaponId, centerX: number, bottomY: number, isArmed = true, ammo: number | null = null): WeaponPickup {
    const pickupItem: ItemInstance | WeaponItem = typeof item === "string" ? toWeaponItem(item) : item;
    const pickup = new WeaponPickup(pickupItem, centerX, bottomY, isArmed, ammo);
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
   * Disegna gli oggetti (oscillano di un pixel e brillano del colore della rarità) e, sopra quello che il
   * giocatore può prendere, il suggerimento "E PRENDI" con il nome dell'oggetto, nel colore della rarità.
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
      const rarityColor = RARITY_CONFIG[pickup.item.rarity].color;
      renderer.fillGlow(screenX + pickup.width / 2, screenY + pickup.height / 2, 11, rarityColor, 2, 4);
      spriteManager.drawSprite(renderer, getItemIconSpriteId(pickup.item), screenX, screenY, false, false, getItemIconVariant(pickup.item));
      if (pickup === reachable) {
        const label = `E PRENDI ${getItemName(pickup.item)}`;
        renderer.drawText(label, screenX + pickup.width / 2, screenY - 10, rarityColor, { align: "center", shadowColor: PALETTE.black });
      }
    }
  }
}
