import { ITEM_CONFIG, ITEM_SIZE, type ItemDefinition } from "../config/itemConfig";
import type { ItemTypeId } from "../types/LevelTypes";
import { GameObject } from "./GameObject";

/** Oggetto raccoglibile posato nel livello. Non è soggetto alla gravità. */
export class Item extends GameObject {
  public readonly definition: ItemDefinition;
  /** Fase dell'oscillazione verticale (solo effetto grafico). */
  public readonly bobPhase: number;

  constructor(itemType: ItemTypeId, startX: number, startY: number) {
    super(startX, startY, ITEM_SIZE, ITEM_SIZE);
    this.definition = ITEM_CONFIG[itemType];
    this.bobPhase = startX * 0.05;
  }
}
