import { PALETTE } from "../config/gameConfig";
import type { InputManager } from "../core/InputManager";
import { BackgroundRenderer } from "../rendering/BackgroundRenderer";
import { measureTextWidth } from "../rendering/BitmapFont";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { GameStateName } from "../types/GameTypes";
import { MenuManager } from "./MenuManager";

/** Comandi che i menu possono richiedere al motore. */
export type MenuCommand = "newGame" | "showControls" | "backToTitle" | "resume";

/** Dati che le schermate mostrano (forniti dal motore). */
export interface ScreenData {
  score: number;
  bestScore: number;
  collectibles: number;
  isNewRecord: boolean;
}

/** Riga della schermata dei controlli: tasti (come tasti disegnati) e descrizione. */
interface ControlsRow {
  keyGroups: string[][];
  description: string;
}

const CONTROLS_ROWS: ControlsRow[] = [
  { keyGroups: [["A", "D"], ["<", ">"]], description: "MUOVI" },
  { keyGroups: [["W"], ["^"]], description: "SALTA" },
  { keyGroups: [["SPAZIO"]], description: "ATTACCO" },
  { keyGroups: [["J"]], description: "ATTACCO PESANTE" },
  { keyGroups: [["K"]], description: "SCHIVATA" },
  { keyGroups: [["ESC"]], description: "PAUSA" },
];

/**
 * Schermate a tutto campo: titolo, controlli, pausa, Game Over, vittoria.
 * I menu sono gestiti da MenuManager; qui c'è soprattutto il disegno.
 */
export class ScreenManager {
  private readonly menus: Partial<Record<GameStateName, MenuManager<MenuCommand>>> = {
    title: new MenuManager<MenuCommand>([
      { label: "NUOVA PARTITA", command: "newGame" },
      { label: "CONTROLLI", command: "showControls" },
    ]),
    paused: new MenuManager<MenuCommand>([
      { label: "RIPRENDI", command: "resume" },
      { label: "ESCI AL TITOLO", command: "backToTitle" },
    ]),
    gameOver: new MenuManager<MenuCommand>([
      { label: "RIPROVA", command: "newGame" },
      { label: "TORNA AL TITOLO", command: "backToTitle" },
    ]),
    victory: new MenuManager<MenuCommand>([
      { label: "NUOVA PARTITA", command: "newGame" },
      { label: "TORNA AL TITOLO", command: "backToTitle" },
    ]),
  };
  private readonly backgroundRenderer = new BackgroundRenderer();
  private animationTimeSeconds = 0;

  constructor(private readonly spriteManager: SpriteManager) {}

  /** Fa avanzare le animazioni delle schermate (da chiamare a ogni frame). */
  public tick(deltaTimeSeconds: number): void {
    this.animationTimeSeconds += deltaTimeSeconds;
  }

  /** Riporta il cursore alla prima voce (da chiamare a ogni cambio di stato). */
  public resetSelection(): void {
    Object.values(this.menus).forEach((menu) => menu?.reset());
  }

  /** Legge l'input e restituisce l'eventuale comando scelto dal giocatore. */
  public update(state: GameStateName, input: InputManager): MenuCommand | null {
    if (state === "controls") {
      return input.wasPressed("confirm") || input.wasPressed("pause") ? "backToTitle" : null;
    }
    return this.menus[state]?.update(input) ?? null;
  }

  public render(renderer: Renderer, state: GameStateName, data: ScreenData): void {
    switch (state) {
      case "title":
        this.renderTitle(renderer, data);
        break;
      case "controls":
        this.renderControls(renderer);
        break;
      case "paused":
        this.renderPause(renderer);
        break;
      case "gameOver":
        this.renderGameOver(renderer, data);
        break;
      case "victory":
        this.renderVictory(renderer, data);
        break;
      case "playing":
        break;
    }
  }

  // -------------------------------------------------------------------------

  private renderTitle(renderer: Renderer, data: ScreenData): void {
    // notte nel castello, con lo sfondo che scorre piano
    this.backgroundRenderer.render(renderer, "castle", this.animationTimeSeconds * 14, this.animationTimeSeconds);
    renderer.fillRect(0, 200, renderer.width, 40, PALETTE.black);
    renderer.fillRect(0, 200, renderer.width, 2, PALETTE.gray);
    const knightFrame = Math.floor(this.animationTimeSeconds * 2) % 2 === 0 ? "knightIdle1" : "knightIdle2";
    this.spriteManager.drawSprite(renderer, knightFrame, 120, 176, false);

    this.drawShadowedText(renderer, "IRON & SHADOW", renderer.width / 2, 34, PALETTE.yellow, PALETTE.red, 3);
    this.drawDivider(renderer, 62);
    this.drawPlaque(renderer, 40, 66, 176, 34);
    renderer.drawText("MEDIEVAL ACTION ARCADE", renderer.width / 2, 70, PALETTE.lightGray, { align: "center" });
    renderer.drawText(`RECORD ${String(data.bestScore).padStart(6, "0")}`, renderer.width / 2, 88, PALETTE.cyan, { align: "center" });
    this.drawPlaque(renderer, 56, 108, 144, 40);
    this.menus.title?.render(renderer, renderer.width / 2, 116);
    renderer.drawText("W/S: SCEGLI   INVIO: CONFERMA", renderer.width / 2, 216, PALETTE.gray, { align: "center" });
  }

  private renderControls(renderer: Renderer): void {
    renderer.clear(PALETTE.darkBlue);
    this.drawShadowedText(renderer, "CONTROLLI", renderer.width / 2, 14, PALETTE.yellow, PALETTE.red, 2);
    this.drawDivider(renderer, 36);
    CONTROLS_ROWS.forEach((row, rowIndex) => {
      const rowY = 48 + rowIndex * 20;
      let cursorX = 14;
      row.keyGroups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
          renderer.drawText("O", cursorX + 2, rowY + 2, PALETTE.gray);
          cursorX += 14;
        }
        group.forEach((keyLabel) => {
          cursorX += this.drawKeyCap(renderer, keyLabel, cursorX, rowY) + 3;
        });
      });
      renderer.drawText(row.description, 142, rowY + 2, PALETTE.white);
    });
    renderer.drawText("COMBO: SPAZIO X3 DI SEGUITO", renderer.width / 2, 176, PALETTE.orange, { align: "center" });
    renderer.drawText("TIENI PREMUTO SALTA: SALTO PIU' ALTO", renderer.width / 2, 188, PALETTE.lightGray, { align: "center" });
    renderer.drawText("INVIO: INDIETRO", renderer.width / 2, 216, PALETTE.gray, { align: "center" });
  }

  private renderPause(renderer: Renderer): void {
    renderer.drawDitherOverlay();
    renderer.fillRect(56, 76, 144, 88, PALETTE.black);
    renderer.strokeRect(56, 76, 144, 88, PALETTE.lightGray);
    renderer.strokeRect(58, 78, 140, 84, PALETTE.gray);
    this.drawShadowedText(renderer, "PAUSA", renderer.width / 2, 88, PALETTE.yellow, PALETTE.red, 2);
    this.menus.paused?.render(renderer, renderer.width / 2, 118);
    renderer.drawText("ESC: RIPRENDI", renderer.width / 2, 148, PALETTE.gray, { align: "center" });
  }

  private renderGameOver(renderer: Renderer, data: ScreenData): void {
    renderer.clear(PALETTE.black);
    this.drawShadowedText(renderer, "GAME OVER", renderer.width / 2, 56, PALETTE.red, PALETTE.purple, 3);
    this.drawDivider(renderer, 90);
    this.renderResults(renderer, data, 104);
    this.menus.gameOver?.render(renderer, renderer.width / 2, 164);
  }

  private renderVictory(renderer: Renderer, data: ScreenData): void {
    this.backgroundRenderer.render(renderer, "castle", this.animationTimeSeconds * 20, this.animationTimeSeconds);
    renderer.fillRect(0, 200, renderer.width, 40, PALETTE.black);
    renderer.fillRect(32, 28, 192, 180, PALETTE.black);
    renderer.strokeRect(32, 28, 192, 180, PALETTE.lightGray);
    renderer.strokeRect(34, 30, 188, 176, PALETTE.gray);
    this.drawShadowedText(renderer, "VITTORIA!", renderer.width / 2, 42, PALETTE.yellow, PALETTE.orange, 3);
    renderer.drawText("L'OMBRA E' SCONFITTA.", renderer.width / 2, 74, PALETTE.white, { align: "center" });
    renderer.drawText("IL REGNO E' SALVO!", renderer.width / 2, 86, PALETTE.white, { align: "center" });
    this.drawDivider(renderer, 104);
    this.renderResults(renderer, data, 116);
    this.menus.victory?.render(renderer, renderer.width / 2, 164);
  }

  /** Punteggio, gemme e record (con scritta lampeggiante se nuovo). */
  private renderResults(renderer: Renderer, data: ScreenData, startY: number): void {
    renderer.drawText(`PUNTI ${String(data.score).padStart(6, "0")}`, renderer.width / 2, startY, PALETTE.yellow, { align: "center" });
    renderer.drawText(`GEMME ${data.collectibles}`, renderer.width / 2, startY + 12, PALETTE.cyan, { align: "center" });
    if (data.isNewRecord) {
      const isVisible = Math.floor(this.animationTimeSeconds * 3) % 2 === 0;
      renderer.drawText("NUOVO RECORD!", renderer.width / 2, startY + 26, isVisible ? PALETTE.orange : PALETTE.yellow, { align: "center" });
    } else {
      renderer.drawText(`RECORD ${String(data.bestScore).padStart(6, "0")}`, renderer.width / 2, startY + 26, PALETTE.lightGray, { align: "center" });
    }
  }

  // --- elementi grafici ------------------------------------------------------

  private drawShadowedText(
    renderer: Renderer,
    text: string,
    centerX: number,
    y: number,
    color: string,
    shadowColor: string,
    scale: number
  ): void {
    renderer.drawText(text, centerX + scale, y + scale, shadowColor, { scale, align: "center" });
    renderer.drawText(text, centerX, y, color, { scale, align: "center" });
  }

  /** Riquadro scuro con bordo, per rendere leggibile il testo sopra lo sfondo. */
  private drawPlaque(renderer: Renderer, x: number, y: number, width: number, height: number): void {
    renderer.fillRect(x, y, width, height, PALETTE.black);
    renderer.strokeRect(x, y, width, height, PALETTE.gray);
  }

  /** Linea decorativa con rombo centrale. */
  private drawDivider(renderer: Renderer, y: number): void {
    const centerX = renderer.width / 2;
    renderer.fillRect(40, y, centerX - 46, 1, PALETTE.gray);
    renderer.fillRect(centerX + 6, y, centerX - 46, 1, PALETTE.gray);
    renderer.fillRect(centerX - 1, y - 2, 3, 5, PALETTE.orange);
    renderer.fillRect(centerX - 2, y - 1, 5, 3, PALETTE.orange);
  }

  /** Disegna un tasto (riquadro con il simbolo). Restituisce la larghezza usata. */
  private drawKeyCap(renderer: Renderer, label: string, x: number, y: number): number {
    const width = measureTextWidth(label, 1) + 8;
    renderer.fillRect(x, y, width, 13, PALETTE.black);
    renderer.strokeRect(x, y, width, 13, PALETTE.lightGray);
    renderer.fillRect(x + 1, y + 11, width - 2, 1, PALETTE.gray);
    renderer.drawText(label, x + 4, y + 3, PALETTE.white);
    return width;
  }
}
