import { GAME_CONFIG } from "../config/gameConfig";
import { GLYPH_ADVANCE, GLYPH_HEIGHT, getGlyphRows, measureTextWidth } from "./BitmapFont";

export type TextAlignment = "left" | "center" | "right";

export interface DrawTextOptions {
  /** Moltiplicatore intero della dimensione del font (default 1). */
  scale?: number;
  align?: TextAlignment;
}

/**
 * Wrapper del canvas 2D a risoluzione interna fissa (256x240).
 * Tutte le coordinate sono in pixel interni; il canvas viene ingrandito
 * solo con moltiplicatori interi per mantenere i pixel nitidi.
 */
export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private ditherPattern: HTMLCanvasElement | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = GAME_CONFIG.internalWidth;
    canvas.height = GAME_CONFIG.internalHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Impossibile ottenere il contesto 2D del canvas");
    }
    this.context = context;
    this.context.imageSmoothingEnabled = false;
    window.addEventListener("resize", this.applyIntegerScale);
    this.applyIntegerScale();
  }

  public get width(): number {
    return this.canvas.width;
  }

  public get height(): number {
    return this.canvas.height;
  }

  public clear(color: string): void {
    this.fillRect(0, 0, this.canvas.width, this.canvas.height, color);
  }

  /**
   * Rettangolo pieno. Tutti e quattro i bordi vengono arrotondati a pixel interi: con coordinate
   * o dimensioni frazionarie il browser sfumerebbe i bordi creando colori che non sono nella
   * palette (difetto presente fino alla 0.9.1 nelle colline della foresta).
   */
  public fillRect(x: number, y: number, width: number, height: number, color: string): void {
    const left = Math.round(x);
    const top = Math.round(y);
    const right = Math.round(x + width);
    const bottom = Math.round(y + height);
    if (right <= left || bottom <= top) {
      return;
    }
    this.context.fillStyle = color;
    this.context.fillRect(left, top, right - left, bottom - top);
  }

  /** Disegna un'immagine (es. uno sprite già compilato) a coordinate intere. */
  public drawImage(image: CanvasImageSource, x: number, y: number): void {
    this.context.drawImage(image, Math.round(x), Math.round(y));
  }

  /**
   * Oscura lo schermo con un retino a scacchi di pixel neri (come nei giochi a 8 bit,
   * senza trasparenze). Il motivo è creato una volta sola.
   */
  public drawDitherOverlay(): void {
    if (this.ditherPattern === null) {
      const pattern = document.createElement("canvas");
      pattern.width = this.canvas.width;
      pattern.height = this.canvas.height;
      const patternContext = pattern.getContext("2d")!;
      patternContext.fillStyle = "#0f0f1b";
      for (let rowY = 0; rowY < pattern.height; rowY++) {
        for (let columnX = rowY % 2; columnX < pattern.width; columnX += 2) {
          patternContext.fillRect(columnX, rowY, 1, 1);
        }
      }
      this.ditherPattern = pattern;
    }
    this.context.drawImage(this.ditherPattern, 0, 0);
  }

  /** Contorno di 1 pixel. */
  public strokeRect(x: number, y: number, width: number, height: number, color: string): void {
    this.fillRect(x, y, width, 1, color);
    this.fillRect(x, y + height - 1, width, 1, color);
    this.fillRect(x, y, 1, height, color);
    this.fillRect(x + width - 1, y, 1, height, color);
  }

  /** Disegna testo con il font bitmap. L'ancora verticale è il bordo superiore. */
  public drawText(
    text: string,
    x: number,
    y: number,
    color: string,
    options: DrawTextOptions = {}
  ): void {
    const scale = options.scale ?? 1;
    const align = options.align ?? "left";
    const textWidth = measureTextWidth(text, scale);
    let cursorX = Math.round(x);
    if (align === "center") {
      cursorX -= Math.floor(textWidth / 2);
    } else if (align === "right") {
      cursorX -= textWidth;
    }
    const baseY = Math.round(y);
    this.context.fillStyle = color;
    for (const character of text) {
      const glyphRows = getGlyphRows(character);
      for (let rowIndex = 0; rowIndex < GLYPH_HEIGHT; rowIndex++) {
        const row = glyphRows[rowIndex] ?? "";
        for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
          if (row[columnIndex] === "#") {
            this.context.fillRect(
              cursorX + columnIndex * scale,
              baseY + rowIndex * scale,
              scale,
              scale
            );
          }
        }
      }
      cursorX += GLYPH_ADVANCE * scale;
    }
  }

  /** Ingrandisce il canvas del massimo moltiplicatore intero (in pixel fisici) che entra nella finestra. */
  private readonly applyIntegerScale = (): void => {
    // La scala è un numero intero di PIXEL DELLO SCHERMO per ogni pixel del gioco: con una scala di
    // sistema frazionaria (es. 125% o 150% su Windows) un multiplo intero di pixel CSS darebbe
    // pixel irregolari. Si ragiona quindi in pixel fisici e si converte in pixel CSS.
    const devicePixelRatio = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const deviceScale = Math.max(
      1,
      Math.floor(
        Math.min(
          (window.innerWidth * devicePixelRatio) / GAME_CONFIG.internalWidth,
          (window.innerHeight * devicePixelRatio) / GAME_CONFIG.internalHeight
        )
      )
    );
    this.canvas.style.width = `${(GAME_CONFIG.internalWidth * deviceScale) / devicePixelRatio}px`;
    this.canvas.style.height = `${(GAME_CONFIG.internalHeight * deviceScale) / devicePixelRatio}px`;
  };
}
