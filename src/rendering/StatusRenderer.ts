import { ELEMENT_CONFIG } from "../config/elementConfig";
import { PALETTE } from "../config/gameConfig";
import type { StatusEffects } from "../combat/StatusEffects";
import type { Rectangle } from "../types/GameTypes";
import type { Renderer } from "./Renderer";

/**
 * Effetti di stato di un nemico o di un boss (Fase 7): un alone che pulsa nel colore di ogni elemento (dietro lo sprite) e,
 * con drawPips, un quadratino colorato per elemento sopra la barra della salute. screenBounds è già in coordinate dello schermo.
 */
export function renderStatusAuras(renderer: Renderer, statusEffects: StatusEffects, screenBounds: Rectangle): void {
  const centerX = screenBounds.x + screenBounds.width / 2;
  const centerY = screenBounds.y + screenBounds.height / 2;
  const baseRadius = Math.max(screenBounds.width, screenBounds.height) * 0.7;
  statusEffects.activeElements.forEach((element, index) => {
    const pulse = Math.floor((statusEffects.animationMs + index * 120) / 150) % 2;
    renderer.fillGlow(centerX, centerY, baseRadius + pulse + index * 2, ELEMENT_CONFIG[element].color, 2, 4);
  });
}

export function renderStatusPips(renderer: Renderer, statusEffects: StatusEffects, screenBounds: Rectangle): void {
  statusEffects.activeElements.forEach((element, index) => {
    const pipX = Math.round(screenBounds.x + index * 4);
    const pipY = Math.round(screenBounds.y - 10);
    renderer.fillRect(pipX, pipY, 4, 4, PALETTE.black);
    renderer.fillRect(pipX + 1, pipY + 1, 2, 2, ELEMENT_CONFIG[element].color);
  });
}
