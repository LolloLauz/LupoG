import { ITEM_SIZE } from "../config/itemConfig";
import { Item } from "../entities/Item";
import type { Player } from "../entities/Player";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { ItemSpawnDefinition } from "../types/LevelTypes";
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
   * (salute, punti, collezionabili). Restituisce gli oggetti raccolti
   * (servono al motore per mostrare gli effetti).
   */
  public collectItems(player: Player, scoreManager: ScoreManager): Item[] {
    if (player.isDead) {
      return [];
    }
    const playerBounds = player.getBounds();
    const touched = this.items.filter((item) => CollisionSystem.intersects(playerBounds, item.getBounds()));
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
    }
    this.items = this.items.filter((item) => !touched.includes(item));
    return touched;
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    for (const item of this.items) {
      const screenX = item.positionX - cameraX;
      if (screenX < -ITEM_SIZE || screenX > renderer.width) {
        continue;
      }
      // leggera oscillazione verticale di 1 pixel
      const bobOffset = Math.sin(this.elapsedSeconds * 4 + item.bobPhase) > 0 ? -1 : 0;
      spriteManager.drawSprite(renderer, item.definition.spriteId, screenX, item.positionY - cameraY + bobOffset, false);
    }
  }
}
