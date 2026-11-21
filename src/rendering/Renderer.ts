import { GAME_CONFIG, PALETTE } from "../config/gameConfig";
import { GLYPH_HEIGHT, GLYPH_SPACING, getGlyph, measureTextWidth } from "./BitmapFont";
import {
  DITHER_LEVELS,
  buildDitherTile,
  clampDitherLevel,
  computeGradientBands,
  computeLineWaveOffset,
} from "./PaletteEffects";

export type TextAlignment = "left" | "center" | "right";

export interface DrawTextOptions {
  /** Moltiplicatore intero della dimensione del font (default 1). */
  scale?: number;
  align?: TextAlignment;
  /** Se indicato, il testo viene prima disegnato in questo colore spostato di 1 pixel (per scala) in basso a destra. */
  shadowColor?: string;
}

/**
 * Wrapper del canvas 2D a risoluzione interna fissa (320x240, vedi GAME_CONFIG).
 * Tutte le coordinate sono in pixel interni; il canvas viene ingrandito
 * solo con moltiplicatori interi per mantenere i pixel nitidi.
 * Ogni metodo disegna solo con i colori ricevuti (mai sfumature o trasparenze del browser):
 * anche retini, gradienti e ondulazioni restano dentro la palette.
 */
export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private ditherPattern: HTMLCanvasElement | null = null;
  /** Motivi del retino già creati, per chiave "coloreA|coloreB|livello". */
  private readonly ditherPatternCache = new Map<string, CanvasPattern>();
  /** Copia di lavoro dello schermo usata dall'effetto di ondulazione. */
  private waveBuffer: HTMLCanvasElement | null = null;

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
   * Oscura lo schermo con un retino a scacchi di pixel neri (senza trasparenze).
   * Il motivo è creato una volta sola.
   */
  public drawDitherOverlay(): void {
    if (this.ditherPattern === null) {
      const pattern = document.createElement("canvas");
      pattern.width = this.canvas.width;
      pattern.height = this.canvas.height;
      const patternContext = pattern.getContext("2d")!;
      patternContext.fillStyle = PALETTE.black;
      for (let rowY = 0; rowY < pattern.height; rowY++) {
        for (let columnX = rowY % 2; columnX < pattern.width; columnX += 2) {
          patternContext.fillRect(columnX, rowY, 1, 1);
        }
      }
      this.ditherPattern = pattern;
    }
    this.context.drawImage(this.ditherPattern, 0, 0);
  }

  /**
   * Rettangolo riempito con un retino ordinato di due colori (dithering, vedi PaletteEffects):
   * "level" va da 0 (solo colorA) a 16 (solo colorB); 8 è una scacchiera.
   * Il motivo è ancorato all'origine dello schermo, quindi aree vicine si raccordano senza cuciture.
   */
  public fillDithered(x: number, y: number, width: number, height: number, colorA: string, colorB: string, level: number): void {
    const clampedLevel = clampDitherLevel(level);
    if (clampedLevel === 0 || colorA === colorB) {
      this.fillRect(x, y, width, height, colorA);
      return;
    }
    if (clampedLevel === DITHER_LEVELS) {
      this.fillRect(x, y, width, height, colorB);
      return;
    }
    const left = Math.round(x);
    const top = Math.round(y);
    const right = Math.round(x + width);
    const bottom = Math.round(y + height);
    if (right <= left || bottom <= top) {
      return;
    }
    this.context.fillStyle = this.getDitherPattern(colorA, colorB, clampedLevel);
    this.context.fillRect(left, top, right - left, bottom - top);
  }

  /**
   * Gradiente verticale a fasce, dall'alto (primo colore) al basso (ultimo colore): fasce piene
   * raccordate da fasce a retino, come i cieli dei giochi a 16 bit. "steps" = gradini di retino
   * tra due colori consecutivi.
   */
  public fillVerticalGradient(x: number, y: number, width: number, height: number, colors: readonly string[], steps = 4): void {
    for (const band of computeGradientBands(y, height, colors, steps)) {
      this.fillDithered(x, band.top, width, band.height, band.colorA, band.colorB, band.level);
    }
  }

  /**
   * Ondulazione per riga (effetto "raster" di acqua, calore, magia): ogni riga della fascia
   * indicata viene spostata in orizzontale di un numero intero di pixel secondo un'onda.
   * Va chiamato DOPO aver disegnato ciò che deve ondulare. I pixel scoperti ai bordi
   * mantengono il contenuto precedente della riga.
   */
  public applyLineWave(top: number, height: number, amplitude: number, wavelength: number, phase: number): void {
    const firstRow = Math.max(0, Math.round(top));
    const lastRow = Math.min(this.canvas.height, Math.round(top + height));
    if (lastRow <= firstRow || amplitude === 0) {
      return;
    }
    if (this.waveBuffer === null) {
      this.waveBuffer = document.createElement("canvas");
      this.waveBuffer.width = this.canvas.width;
      this.waveBuffer.height = this.canvas.height;
    }
    const bufferContext = this.waveBuffer.getContext("2d")!;
    const bandHeight = lastRow - firstRow;
    bufferContext.drawImage(this.canvas, 0, firstRow, this.canvas.width, bandHeight, 0, firstRow, this.canvas.width, bandHeight);
    for (let rowY = firstRow; rowY < lastRow; rowY++) {
      const offset = computeLineWaveOffset(rowY, amplitude, wavelength, phase);
      if (offset !== 0) {
        this.context.drawImage(this.waveBuffer, 0, rowY, this.canvas.width, 1, offset, rowY, this.canvas.width, 1);
      }
    }
  }

  /** Motivo 4x4 del retino per una coppia di colori e un livello (creato una volta sola). */
  private getDitherPattern(colorA: string, colorB: string, level: number): CanvasPattern {
    const cacheKey = `${colorA}|${colorB}|${level}`;
    const cached = this.ditherPatternCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const tile = document.createElement("canvas");
    tile.width = 4;
    tile.height = 4;
    const tileContext = tile.getContext("2d")!;
    buildDitherTile(colorA, colorB, level).forEach((row, rowIndex) => {
      row.forEach((color, columnIndex) => {
        tileContext.fillStyle = color;
        tileContext.fillRect(columnIndex, rowIndex, 1, 1);
      });
    });
    const pattern = this.context.createPattern(tile, "repeat");
    if (pattern === null) {
      throw new Error("Impossibile creare il motivo del retino");
    }
    this.ditherPatternCache.set(cacheKey, pattern);
    return pattern;
  }

  /** Contorno di 1 pixel. */
  public strokeRect(x: number, y: number, width: number, height: number, color: string): void {
    this.fillRect(x, y, width, 1, color);
    this.fillRect(x, y + height - 1, width, 1, color);
    this.fillRect(x, y, 1, height, color);
    this.fillRect(x + width - 1, y, 1, height, color);
  }

  /** Disegna testo con il font bitmap. L'ancora verticale è il bordo superiore delle maiuscole. */
  public drawText(
    text: string,
    x: number,
    y: number,
    color: string,
    options: DrawTextOptions = {}
  ): void {
    const scale = options.scale ?? 1;
    if (options.shadowColor !== undefined) {
      this.drawText(text, x + scale, y + scale, options.shadowColor, { scale, align: options.align ?? "left" });
    }
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
      const glyph = getGlyph(character);
      for (let rowIndex = 0; rowIndex < GLYPH_HEIGHT; rowIndex++) {
        const row = glyph.rows[rowIndex]!;
        for (let columnIndex = glyph.firstColumn; columnIndex < glyph.firstColumn + glyph.width; columnIndex++) {
          if (row[columnIndex] === "#") {
            this.context.fillRect(
              cursorX + (columnIndex - glyph.firstColumn) * scale,
              baseY + rowIndex * scale,
              scale,
              scale
            );
          }
        }
      }
      cursorX += (glyph.width + GLYPH_SPACING) * scale;
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
