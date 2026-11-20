import { PALETTE } from "../config/gameConfig";
import type { InputManager } from "../core/InputManager";
import type { Renderer } from "../rendering/Renderer";

export interface MenuItem<TCommand extends string> {
  label: string;
  command: TCommand;
}

/**
 * Menu verticale navigabile da tastiera (W/S o frecce su/giù, Invio per confermare).
 * Il cursore passa da una voce all'altra in modo circolare.
 */
export class MenuManager<TCommand extends string> {
  private selectedIndex = 0;

  constructor(private readonly items: MenuItem<TCommand>[]) {}

  public get selectedItemIndex(): number {
    return this.selectedIndex;
  }

  public reset(): void {
    this.selectedIndex = 0;
  }

  /** Legge l'input e restituisce il comando della voce confermata (o null). */
  public update(input: InputManager): TCommand | null {
    if (input.wasPressed("menuUp")) {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    }
    if (input.wasPressed("menuDown")) {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    }
    if (input.wasPressed("confirm")) {
      return this.items[this.selectedIndex]?.command ?? null;
    }
    return null;
  }

  public render(renderer: Renderer, centerX: number, startY: number, lineHeight = 14): void {
    this.items.forEach((item, itemIndex) => {
      const isSelected = itemIndex === this.selectedIndex;
      const itemY = startY + itemIndex * lineHeight;
      renderer.drawText(item.label, centerX, itemY, isSelected ? PALETTE.white : PALETTE.gray, {
        align: "center",
      });
      if (isSelected) {
        const halfWidth = Math.floor((item.label.length * 6 - 1) / 2);
        renderer.drawText(">", centerX - halfWidth - 12, itemY, PALETTE.orange);
        renderer.drawText("<", centerX + halfWidth + 7, itemY, PALETTE.orange);
      }
    });
  }
}
