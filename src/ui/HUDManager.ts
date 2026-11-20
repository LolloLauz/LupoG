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

/** Altezza (px) della barra superiore dell'HUD. */
const HUD_HEIGHT = 24;
/** La barra della salute ha sempre 10 segmenti, qualunque sia la salute massima. */
const HEALTH_SEGMENT_COUNT = 10;
const LOW_HEALTH_PERCENT = 30;

/**
 * HUD di gioco: salute, vite, punteggio, gemme, livello e barra del boss.
 * Contiene anche i riquadri dei messaggi (inizio e fine livello).
 */
export class HUDManager {
  public render(renderer: Renderer, spriteManager: SpriteManager, data: HUDData, timeSeconds: number): void {
    // barra superiore
    renderer.fillRect(0, 0, renderer.width, HUD_HEIGHT, PALETTE.black);
    renderer.fillRect(0, HUD_HEIGHT, renderer.width, 1, PALETTE.gray);
    this.renderHealth(renderer, data, timeSeconds);
    this.renderLives(renderer, spriteManager, data.lives);
    renderer.drawText(`LIVELLO ${data.levelNumber}`, renderer.width / 2, 4, PALETTE.lightGray, { align: "center" });
    renderer.drawText(String(data.score).padStart(6, "0"), renderer.width - 6, 4, PALETTE.yellow, { align: "right" });
    renderer.drawText(`GEMME ${data.collectibles}`, renderer.width - 6, 14, PALETTE.cyan, { align: "right" });
    if (data.boss !== null) {
      this.renderBossBar(renderer, data.boss);
    }
  }

  /** Riquadro centrato con titolo e righe di testo (messaggi di livello). */
  public renderMessageBox(renderer: Renderer, title: string, lines: string[]): void {
    const boxHeight = 22 + lines.length * 12;
    const boxY = 100 - boxHeight / 2;
    renderer.fillRect(32, boxY, 192, boxHeight, PALETTE.black);
    renderer.strokeRect(32, boxY, 192, boxHeight, PALETTE.lightGray);
    renderer.strokeRect(34, boxY + 2, 188, boxHeight - 4, PALETTE.gray);
    renderer.drawText(title, renderer.width / 2, boxY + 8, PALETTE.yellow, { align: "center" });
    lines.forEach((line, lineIndex) => {
      renderer.drawText(line, renderer.width / 2, boxY + 22 + lineIndex * 12, PALETTE.white, { align: "center" });
    });
  }

  /** Salute a 10 segmenti; lampeggia quando è bassa. */
  private renderHealth(renderer: Renderer, data: HUDData, timeSeconds: number): void {
    renderer.drawText("HP", 6, 4, PALETTE.white);
    const healthPercent = (data.health / data.maxHealth) * 100;
    const filledSegments = Math.ceil((Math.max(0, data.health) / data.maxHealth) * HEALTH_SEGMENT_COUNT);
    const isLow = healthPercent <= LOW_HEALTH_PERCENT && data.health > 0;
    const fillColor = isLow && Math.floor(timeSeconds * 4) % 2 === 0 ? PALETTE.white : PALETTE.red;
    for (let segmentIndex = 0; segmentIndex < HEALTH_SEGMENT_COUNT; segmentIndex++) {
      const segmentX = 22 + segmentIndex * 6;
      renderer.fillRect(segmentX, 3, 5, 9, segmentIndex < filledSegments ? fillColor : PALETTE.darkBlue);
    }
  }

  private renderLives(renderer: Renderer, spriteManager: SpriteManager, lives: number): void {
    spriteManager.drawSprite(renderer, "hudLife", 6, 13, false);
    renderer.drawText(`X${lives}`, 17, 14, PALETTE.white);
  }

  private renderBossBar(renderer: Renderer, boss: NonNullable<HUDData["boss"]>): void {
    const barWidth = 160;
    const barX = (renderer.width - barWidth) / 2;
    renderer.drawText(boss.name, renderer.width / 2, 210, PALETTE.white, { align: "center" });
    renderer.fillRect(barX - 2, 221, barWidth + 4, 11, PALETTE.black);
    renderer.strokeRect(barX - 2, 221, barWidth + 4, 11, PALETTE.lightGray);
    const filledWidth = Math.round((barWidth * boss.health) / boss.maxHealth);
    renderer.fillRect(barX, 223, filledWidth, 7, boss.phaseIndex === 0 ? PALETTE.red : PALETTE.orange);
    for (const markerPercent of boss.phaseMarkerPercents) {
      renderer.fillRect(barX + Math.round((barWidth * markerPercent) / 100), 222, 1, 9, PALETTE.white);
    }
  }
}
