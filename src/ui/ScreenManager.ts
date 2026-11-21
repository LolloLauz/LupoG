import { PALETTE, PALETTE_RAMPS } from "../config/gameConfig";
import type { InputManager } from "../core/InputManager";
import { BackgroundRenderer } from "../rendering/BackgroundRenderer";
import { measureTextWidth } from "../rendering/BitmapFont";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { GameStateName } from "../types/GameTypes";
import { MenuManager } from "./MenuManager";
import { TITLE_GOLD_ROWS, drawOrnateFrame } from "./HUDManager";
import { cycleRampColor } from "../rendering/PaletteEffects";

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
    const centerX = renderer.width / 2;
    this.drawFloor(renderer);
    const knightFrame = Math.floor(this.animationTimeSeconds * 2) % 2 === 0 ? "knightIdle1" : "knightIdle2";
    this.spriteManager.drawSprite(renderer, knightFrame, centerX - 12, 200 - 30, false);

    this.drawLogo(renderer, centerX, 30);
    this.drawDivider(renderer, 62);
    drawOrnateFrame(renderer, centerX - 92, 68, 184, 34);
    renderer.drawText("Medieval Action Arcade", centerX, 74, PALETTE.stonePale, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText(`RECORD ${String(data.bestScore).padStart(6, "0")}`, centerX, 87, PALETTE.cyan, { align: "center", shadowColor: PALETTE.black });
    drawOrnateFrame(renderer, centerX - 76, 110, 152, 42);
    this.menus.title?.render(renderer, centerX, 119);
    renderer.drawText("W/S: scegli   INVIO: conferma", centerX, 222, PALETTE.lightGray, { align: "center", shadowColor: PALETTE.black });
  }

  private renderControls(renderer: Renderer): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.deepNavy, PALETTE.darkBlue, PALETTE.black]);
    this.drawGradientTitle(renderer, "CONTROLLI", renderer.width / 2, 12, 2, TITLE_GOLD_ROWS);
    this.drawDivider(renderer, 36);
    // la tabella (larga 256 px) è centrata nello schermo
    const tableLeft = (renderer.width - 256) / 2;
    CONTROLS_ROWS.forEach((row, rowIndex) => {
      const rowY = 48 + rowIndex * 20;
      let cursorX = tableLeft + 14;
      row.keyGroups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
          renderer.drawText("o", cursorX + 3, rowY + 3, PALETTE.gray);
          cursorX += 14;
        }
        group.forEach((keyLabel) => {
          cursorX += this.drawKeyCap(renderer, keyLabel, cursorX, rowY) + 3;
        });
      });
      renderer.drawText(row.description, tableLeft + 142, rowY + 3, PALETTE.white, { shadowColor: PALETTE.black });
    });
    renderer.drawText("COMBO: SPAZIO x3 di seguito", renderer.width / 2, 176, PALETTE.orange, { align: "center", shadowColor: PALETTE.wine });
    renderer.drawText("Tieni premuto SALTA: salto più alto", renderer.width / 2, 189, PALETTE.lightGray, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText("INVIO: indietro", renderer.width / 2, 220, PALETTE.gray, { align: "center" });
  }

  private renderPause(renderer: Renderer): void {
    const boxX = renderer.width / 2 - 76;
    renderer.drawDitherOverlay();
    drawOrnateFrame(renderer, boxX, 74, 152, 92);
    this.drawGradientTitle(renderer, "PAUSA", renderer.width / 2, 86, 2, TITLE_GOLD_ROWS);
    this.menus.paused?.render(renderer, renderer.width / 2, 118);
    renderer.drawText("ESC: riprendi", renderer.width / 2, 150, PALETTE.gray, { align: "center" });
  }

  private renderGameOver(renderer: Renderer, data: ScreenData): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.black, PALETTE.wine, PALETTE.black]);
    this.drawGradientTitle(renderer, "GAME OVER", renderer.width / 2, 52, 3, [
      PALETTE.orange,
      PALETTE.red,
      PALETTE.red,
      PALETTE.red,
      PALETTE.purple,
      PALETTE.purple,
      PALETTE.wine,
    ]);
    this.drawDivider(renderer, 90);
    this.renderResults(renderer, data, 104);
    drawOrnateFrame(renderer, renderer.width / 2 - 76, 156, 152, 40);
    this.menus.gameOver?.render(renderer, renderer.width / 2, 164);
  }

  private renderVictory(renderer: Renderer, data: ScreenData): void {
    this.backgroundRenderer.render(renderer, "castle", this.animationTimeSeconds * 20, this.animationTimeSeconds);
    this.drawFloor(renderer);
    const boxX = renderer.width / 2 - 100;
    drawOrnateFrame(renderer, boxX, 26, 200, 182);
    this.drawGradientTitle(renderer, "VITTORIA!", renderer.width / 2, 40, 3, TITLE_GOLD_ROWS);
    renderer.drawText("L'Ombra è sconfitta.", renderer.width / 2, 72, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText("Il regno è salvo!", renderer.width / 2, 84, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    this.drawDivider(renderer, 102, renderer.width / 2 - 88);
    this.renderResults(renderer, data, 114);
    this.menus.victory?.render(renderer, renderer.width / 2, 164);
  }

  /** Punteggio, gemme e record (con scritta lampeggiante se nuovo). */
  private renderResults(renderer: Renderer, data: ScreenData, startY: number): void {
    const centerX = renderer.width / 2;
    renderer.drawText(`PUNTI ${String(data.score).padStart(6, "0")}`, centerX, startY, PALETTE.goldLight, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText(`GEMME ${data.collectibles}`, centerX, startY + 12, PALETTE.cyan, { align: "center", shadowColor: PALETTE.black });
    if (data.isNewRecord) {
      const recordColor = cycleRampColor(PALETTE_RAMPS.fire.slice(2), this.animationTimeSeconds, 10, 0, "pingPong");
      renderer.drawText("NUOVO RECORD!", centerX, startY + 26, recordColor, { align: "center", shadowColor: PALETTE.black });
    } else {
      renderer.drawText(`RECORD ${String(data.bestScore).padStart(6, "0")}`, centerX, startY + 26, PALETTE.lightGray, { align: "center", shadowColor: PALETTE.black });
    }
  }

  // --- elementi grafici ------------------------------------------------------

  /** Logo del titolo: lettere grandi con riempimento metallico a fasce e doppia ombra. */
  private drawLogo(renderer: Renderer, centerX: number, y: number): void {
    const scale = 3;
    renderer.drawText("IRON & SHADOW", centerX + 2, y + 2, PALETTE.black, { scale, align: "center" });
    renderer.drawText("IRON & SHADOW", centerX + 1, y + 1, PALETTE.wine, { scale, align: "center" });
    renderer.drawText("IRON & SHADOW", centerX, y, PALETTE.goldLight, { scale, align: "center", rowColors: TITLE_GOLD_ROWS });
    // scintilla che attraversa il logo
    const sparkleX = Math.round(centerX - 120 + ((this.animationTimeSeconds * 60) % 300));
    if (sparkleX < centerX + 118) {
      renderer.fillRect(sparkleX, y + 2, 1, 5, PALETTE.white);
      renderer.fillRect(sparkleX - 2, y + 4, 5, 1, PALETTE.white);
    }
  }

  /** Titolo centrato con riempimento a fasce (rowColors) e ombra. */
  private drawGradientTitle(renderer: Renderer, text: string, centerX: number, y: number, scale: number, rowColors: readonly string[]): void {
    renderer.drawText(text, centerX, y, rowColors[0] ?? PALETTE.white, { scale, align: "center", shadowColor: PALETTE.black, rowColors });
  }

  /** Pavimento di pietra sotto le schermate con sfondo (titolo, vittoria). */
  private drawFloor(renderer: Renderer): void {
    renderer.fillRect(0, 200, renderer.width, 40, PALETTE.stoneShadow);
    renderer.fillRect(0, 200, renderer.width, 1, PALETTE.stonePale);
    renderer.fillRect(0, 201, renderer.width, 2, PALETTE.stoneLight);
    for (let rowY = 211; rowY < 240; rowY += 9) {
      renderer.fillRect(0, rowY, renderer.width, 1, PALETTE.stoneDark);
      const offset = ((rowY - 211) / 9) % 2 === 0 ? 0 : 8;
      for (let jointX = offset; jointX < renderer.width; jointX += 16) {
        renderer.fillRect(jointX, rowY - 8, 1, 8, PALETTE.stoneDark);
        renderer.fillRect(jointX + 1, rowY - 8, 1, 8, PALETTE.stone);
      }
    }
    renderer.fillDitheredOverlay(0, 203, renderer.width, 37, PALETTE.black, 4);
  }

  /** Linea decorativa dorata con gemma centrale; "margin" = distanza dai bordi dello schermo. */
  private drawDivider(renderer: Renderer, y: number, margin = 40): void {
    const centerX = renderer.width / 2;
    const lineLength = centerX - margin - 6;
    renderer.fillRect(margin, y, lineLength, 1, PALETTE.gold);
    renderer.fillRect(centerX + 6, y, lineLength, 1, PALETTE.gold);
    renderer.fillRect(margin, y + 1, lineLength, 1, PALETTE.bronze);
    renderer.fillRect(centerX + 6, y + 1, lineLength, 1, PALETTE.bronze);
    renderer.fillRect(centerX - 1, y - 2, 3, 5, PALETTE.red);
    renderer.fillRect(centerX - 2, y - 1, 5, 3, PALETTE.red);
    renderer.fillRect(centerX - 1, y - 1, 1, 1, PALETTE.orange);
  }

  /** Disegna un tasto in rilievo (riquadro con il simbolo). Restituisce la larghezza usata. */
  private drawKeyCap(renderer: Renderer, label: string, x: number, y: number): number {
    const width = measureTextWidth(label, 1) + 9;
    renderer.fillRect(x, y, width, 14, PALETTE.black);
    renderer.fillVerticalGradient(x + 1, y + 1, width - 2, 11, [PALETTE.stonePale, PALETTE.stoneLight, PALETTE.stone], 2);
    renderer.fillRect(x + 1, y + 12, width - 2, 1, PALETTE.stoneShadow);
    renderer.fillRect(x + 1, y + 1, width - 2, 1, PALETTE.white);
    renderer.drawText(label, x + 5, y + 3, PALETTE.black);
    return width;
  }
}
