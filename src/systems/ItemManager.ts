import { PALETTE } from "../config/gameConfig";
import { ITEM_SIZE } from "../config/itemConfig";
import { POWER_UP_CONFIG } from "../config/powerUpConfig";
import { Item } from "../entities/Item";
import type { Player } from "../entities/Player";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { ItemSpawnDefinition, ItemTypeId } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";
import type { ScoreManager } from "./ScoreManager";

/** Gestisce gli oggetti del livello: creazione, raccolta, effetti e disegno. */
export class ItemManager {
  private items: Item[] = [];
  private elapsedSeconds = 0;

  /** Sostituisce gli oggetti correnti con quelli del livello. */
  public loadItems(spawns: ItemSpawnDefinition[]): void {
    this.items = spawns.map((spawn) => new Item(spawn.type, spawn.position.x, spawn.position.y));
    this.elapsedSeconds = 0;
  }

  public get remainingItemCount(): number {
    return this.items.length;
  }

  public update(deltaTimeSeconds: number): void {
    this.elapsedSeconds += deltaTimeSeconds;
  }

  /**
   * Raccoglie gli oggetti toccati dal giocatore e ne applica gli effetti
   * (salute, punti, collezionabili, power-up). Restituisce gli oggetti raccolti
   * (servono al motore per mostrare gli effetti). Gli oggetti da borsa (pozioni) restano
   * a terra: si raccolgono con E (vedi findReachableBagItem).
   */
  public collectItems(player: Player, scoreManager: ScoreManager): Item[] {
    if (player.isDead) {
      return [];
    }
    const playerBounds = player.getBounds();
    const touched = this.items.filter(
      (item) =>
        item.definition.storedInBag !== true &&
        item.definition.refillsAmmo !== true &&
        CollisionSystem.intersects(playerBounds, item.getBounds())
    );
    for (const item of touched) {
      const definition = item.definition;
      if (definition.healAmount > 0) {
        player.heal(definition.healAmount);
      }
      if (definition.scoreBonus > 0) {
        scoreManager.addScore(definition.scoreBonus);
      }
      if (definition.isCollectible) {
        scoreManager.registerCollectible();
      }
      if (definition.powerUpId !== undefined) {
        player.applyPowerUp(POWER_UP_CONFIG[definition.powerUpId]);
      }
    }
    this.items = this.items.filter((item) => !touched.includes(item));
    return touched;
  }

  /** L'oggetto da borsa (pozione) che il giocatore sta toccando, oppure null. */
  public findReachableBagItem(player: Player): Item | null {
    if (player.isDead) {
      return null;
    }
    const playerBounds = player.getBounds();
    return this.items.find((item) => item.definition.storedInBag === true && CollisionSystem.intersects(playerBounds, item.getBounds())) ?? null;
  }

  /** La faretra che il giocatore sta toccando, oppure null (la raccoglie il motore, se ricarica qualcosa). */
  public findTouchedAmmoRefill(player: Player): Item | null {
    if (player.isDead) {
      return null;
    }
    const playerBounds = player.getBounds();
    return this.items.find((item) => item.definition.refillsAmmo === true && CollisionSystem.intersects(playerBounds, item.getBounds())) ?? null;
  }

  /** Mette un oggetto a terra durante il gioco (es. una pozione lasciata con Q). */
  public addItem(type: ItemTypeId, x: number, y: number): Item {
    const item = new Item(type, x, y);
    this.items.push(item);
    return item;
  }

  /** Toglie un oggetto dal livello (raccolto nella borsa). */
  public removeItem(item: Item): void {
    this.items = this.items.filter((candidate) => candidate !== item);
  }

  /**
   * Disegna gli oggetti; se player è indicato, sopra l'oggetto da borsa che sta toccando compare
   * il suggerimento "E PRENDI ...".
   */
  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number, player: Player | null = null): void {
    const reachable = player === null ? null : this.findReachableBagItem(player);
    for (const item of this.items) {
      const screenX = item.positionX - cameraX;
      if (screenX < -ITEM_SIZE || screenX > renderer.width) {
        continue;
      }
      // leggera oscillazione verticale di 1 pixel
      const bobOffset = Math.sin(this.elapsedSeconds * 4 + item.bobPhase) > 0 ? -1 : 0;
      spriteManager.drawSprite(renderer, item.definition.spriteId, screenX, item.positionY - cameraY + bobOffset, false);
      if (item === reachable) {
        renderer.drawText(`E PRENDI ${item.definition.name.toUpperCase()}`, screenX + ITEM_SIZE / 2, item.positionY - cameraY - 10, PALETTE.goldLight, {
          align: "center",
          shadowColor: PALETTE.black,
        });
      }
    }
  }
}
