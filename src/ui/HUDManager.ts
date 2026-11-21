import { PALETTE } from "../config/gameConfig";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";

/** Dati mostrati dall'HUD (il motore li compone a ogni frame). */
export interface HUDData {
  health: number;
  maxHealth: number;
  lives: number;
  score: number;
  collectibles: number;
  levelNumber: number;
  boss: {
    name: string;
    health: number;
    maxHealth: number;
    /** Soglie (in %) in cui cambia fase: mostrate come tacche sulla barra. */
    phaseMarkerPercents: number[];
    phaseIndex: number;
  } | null;
}

/** Altezza (px) della barra superiore dell'HUD (bordo dorato compreso). */
const HUD_HEIGHT = 24;
/** La barra della salute ha sempre 10 segmenti, qualunque sia la salute massima. */
export const HEALTH_SEGMENT_COUNT = 10;
/** Geometria di ogni segmento della salute (il rettangolo principale, nel colore di riempimento). */
export const HEALTH_SEGMENT_GEOMETRY = { firstX: 19, stepX: 6, y: 4, width: 5, height: 7 } as const;
const LOW_HEALTH_PERCENT = 30;

/**
 * HUD di gioco in stile 16 bit: pannello metallico con bordo dorato, cuore e barra della salute
 * a segmenti ombreggiati, vite, livello, punteggio, gemme e barra del boss con teschio.
 * Contiene anche i riquadri dei messaggi (inizio e fine livello).
 */
export class HUDManager {
  public render(renderer: Renderer, spriteManager: SpriteManager, data: HUDData, timeSeconds: number): void {
    this.renderPanel(renderer);
    this.renderHealth(renderer, spriteManager, data, timeSeconds);
    this.renderLives(renderer, spriteManager, data.lives);
    renderer.drawText(`LIVELLO ${data.levelNumber}`, renderer.width / 2, 8, PALETTE.stonePale, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText(String(data.score).padStart(6, "0"), renderer.width - 6, 3, PALETTE.goldLight, {
      align: "right",
      shadowColor: PALETTE.black,
      rowColors: [PALETTE.cream, PALETTE.yellow, PALETTE.yellow, PALETTE.goldLight, PALETTE.goldLight, PALETTE.gold, PALETTE.gold],
    });
    spriteManager.drawSprite(renderer, "itemGem", renderer.width - 34, 13, false);
    renderer.drawText(`x${data.collectibles}`, renderer.width - 6, 13, PALETTE.cyan, { align: "right", shadowColor: PALETTE.black });
    if (data.boss !== null) {
      this.renderBossBar(renderer, spriteManager, data.boss);
    }
  }

  /** Riquadro centrato con titolo e righe di testo (messaggi di livello). */
  public renderMessageBox(renderer: Renderer, title: string, lines: string[]): void {
    const boxWidth = 200;
    const boxHeight = 24 + lines.length * 12;
    const boxX = Math.round((renderer.width - boxWidth) / 2);
    const boxY = Math.round(100 - boxHeight / 2);
    drawOrnateFrame(renderer, boxX, boxY, boxWidth, boxHeight);
    renderer.drawText(title, renderer.width / 2, boxY + 8, PALETTE.goldLight, {
      align: "center",
      shadowColor: PALETTE.wine,
      rowColors: TITLE_GOLD_ROWS,
    });
    lines.forEach((line, lineIndex) => {
      renderer.drawText(line, renderer.width / 2, boxY + 23 + lineIndex * 12, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    });
  }

  /** Pannello metallico a fasce con bordo dorato e ombra a retino sotto. */
  private renderPanel(renderer: Renderer): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, HUD_HEIGHT - 2, [PALETTE.slate, PALETTE.darkBlue, PALETTE.black], 4);
    renderer.fillRect(0, 0, renderer.width, 1, PALETTE.gray);
    renderer.fillRect(0, HUD_HEIGHT - 2, renderer.width, 1, PALETTE.goldLight);
    renderer.fillRect(0, HUD_HEIGHT - 1, renderer.width, 1, PALETTE.bronze);
    renderer.fillDitheredOverlay(0, HUD_HEIGHT, renderer.width, 2, PALETTE.black, 8);
  }

  /** Cuore e salute a 10 segmenti ombreggiati; lampeggia quando è bassa. */
  private renderHealth(renderer: Renderer, spriteManager: SpriteManager, data: HUDData, timeSeconds: number): void {
    spriteManager.drawSprite(renderer, "hudHeart", 5, 3, false);
    const geometry = HEALTH_SEGMENT_GEOMETRY;
    const healthPercent = (data.health / data.maxHealth) * 100;
    const filledSegments = Math.ceil((Math.max(0, data.health) / data.maxHealth) * HEALTH_SEGMENT_COUNT);
    const isLow = healthPercent <= LOW_HEALTH_PERCENT && data.health > 0;
    const isFlashing = isLow && Math.floor(timeSeconds * 4) % 2 === 0;
    const barWidth = HEALTH_SEGMENT_COUNT * geometry.stepX + 1;
    renderer.fillRect(geometry.firstX - 2, geometry.y - 2, barWidth + 2, geometry.height + 4, PALETTE.black);
    renderer.strokeRect(geometry.firstX - 2, geometry.y - 2, barWidth + 2, geometry.height + 4, PALETTE.gray);
    for (let segmentIndex = 0; segmentIndex < HEALTH_SEGMENT_COUNT; segmentIndex++) {
      const segmentX = geometry.firstX + segmentIndex * geometry.stepX;
      const isFilled = segmentIndex < filledSegments;
      const fillColor = isFilled ? (isFlashing ? PALETTE.white : PALETTE.red) : PALETTE.violetDark;
      renderer.fillRect(segmentX, geometry.y, geometry.width, geometry.height, fillColor);
      if (isFilled && !isFlashing) {
        // riflesso in alto e ombra in basso: il segmento sembra una gemma
        renderer.fillRect(segmentX, geometry.y, geometry.width, 1, PALETTE.orange);
        renderer.fillRect(segmentX, geometry.y + 1, 1, 1, PALETTE.cream);
        renderer.fillRect(segmentX, geometry.y + geometry.height - 2, geometry.width, 2, PALETTE.purple);
      }
    }
  }

  private renderLives(renderer: Renderer, spriteManager: SpriteManager, lives: number): void {
    spriteManager.drawSprite(renderer, "hudLife", 5, 13, false);
    renderer.drawText(`x${lives}`, 16, 14, PALETTE.white, { shadowColor: PALETTE.black });
  }

  private renderBossBar(renderer: Renderer, spriteManager: SpriteManager, boss: NonNullable<HUDData["boss"]>): void {
    const barWidth = 180;
    const barX = Math.round((renderer.width - barWidth) / 2) + 6;
    const barY = 222;
    renderer.drawText(boss.name, renderer.width / 2, 209, PALETTE.white, { align: "center", shadowColor: PALETTE.wine, rowColors: TITLE_SILVER_ROWS });
    spriteManager.drawSprite(renderer, "hudSkull", barX - 14, barY - 1, false);
    renderer.fillRect(barX - 2, barY - 2, barWidth + 4, 11, PALETTE.black);
    renderer.strokeRect(barX - 2, barY - 2, barWidth + 4, 11, PALETTE.stoneLight);
    renderer.fillRect(barX - 1, barY + 8, barWidth + 2, 1, PALETTE.stoneShadow);
    const filledWidth = Math.round((barWidth * Math.max(0, boss.health)) / boss.maxHealth);
    const isEnraged = boss.phaseIndex > 0;
    renderer.fillRect(barX, barY, barWidth, 7, PALETTE.violetDark);
    renderer.fillRect(barX, barY, filledWidth, 7, isEnraged ? PALETTE.orange : PALETTE.red);
    renderer.fillRect(barX, barY, filledWidth, 2, isEnraged ? PALETTE.yellow : PALETTE.orange);
    renderer.fillRect(barX, barY + 5, filledWidth, 2, isEnraged ? PALETTE.flame : PALETTE.purple);
    for (const markerPercent of boss.phaseMarkerPercents) {
      const markerX = barX + Math.round((barWidth * markerPercent) / 100);
      renderer.fillRect(markerX, barY - 2, 1, 11, PALETTE.white);
      renderer.fillRect(markerX - 1, barY - 3, 3, 1, PALETTE.goldLight);
    }
  }
}

/** Colori a fasce per le scritte dorate (titoli). */
export const TITLE_GOLD_ROWS: readonly string[] = [
  PALETTE.cream,
  PALETTE.yellow,
  PALETTE.goldLight,
  PALETTE.goldLight,
  PALETTE.gold,
  PALETTE.gold,
  PALETTE.bronze,
];

/** Colori a fasce per le scritte argentate. */
export const TITLE_SILVER_ROWS: readonly string[] = [
  PALETTE.white,
  PALETTE.white,
  PALETTE.stonePale,
  PALETTE.lightGray,
  PALETTE.lightGray,
  PALETTE.gray,
  PALETTE.slate,
];

/**
 * Riquadro decorato in stile 16 bit: fondo a fasce scure, doppio bordo (pietra e oro),
 * angoli dorati e ombra a retino. Usato dai messaggi di livello e dalle schermate.
 */
export function drawOrnateFrame(renderer: Renderer, x: number, y: number, width: number, height: number): void {
  renderer.fillDitheredOverlay(x + 3, y + 3, width, height, PALETTE.black, 8);
  renderer.fillVerticalGradient(x, y, width, height, [PALETTE.deepNavy, PALETTE.black], 4);
  renderer.strokeRect(x, y, width, height, PALETTE.black);
  renderer.strokeRect(x + 1, y + 1, width - 2, height - 2, PALETTE.goldLight);
  renderer.fillRect(x + 2, y + height - 2, width - 3, 1, PALETTE.gold);
  renderer.fillRect(x + width - 2, y + 2, 1, height - 3, PALETTE.gold);
  renderer.strokeRect(x + 3, y + 3, width - 6, height - 6, PALETTE.slate);
  for (const [cornerX, cornerY] of [[x, y], [x + width - 5, y], [x, y + height - 5], [x + width - 5, y + height - 5]] as const) {
    renderer.fillRect(cornerX, cornerY, 5, 5, PALETTE.gold);
    renderer.fillRect(cornerX + 1, cornerY + 1, 3, 3, PALETTE.goldLight);
    renderer.fillRect(cornerX + 2, cornerY + 2, 1, 1, PALETTE.cream);
  }
}
