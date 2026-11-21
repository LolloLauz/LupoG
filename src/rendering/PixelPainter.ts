import { GLYPH_HEIGHT, GLYPH_SPACING, getGlyph, measureTextWidth } from "./BitmapFont";
import { DITHER_LEVELS, buildDitherTile, clampDitherLevel, computeGradientBands, isDitherPixelOn } from "./PaletteEffects";

export type TextAlignment = "left" | "center" | "right";

export interface DrawTextOptions {
  /** Moltiplicatore intero della dimensione del font (default 1). */
  scale?: number;
  align?: TextAlignment;
  /** Se indicato, il testo viene prima disegnato in questo colore spostato di 1 pixel (per scala) in basso a destra. */
  shadowColor?: string;
  /**
   * Colore di ogni riga del glifo (0 = riga più alta): permette scritte "metalliche" a fasce,
   * come i titoli dei giochi a 16 bit. Le righe senza colore usano il colore principale.
   */
  rowColors?: readonly string[];
}

/**
 * Primitive di disegno a pixel nitidi su un qualsiasi canvas: rettangoli a coordinate intere,
 * retini, gradienti a fasce, cerchi, testo bitmap. Le usa il Renderer (lo schermo) e le usano
 * gli sfondi per disegnare una volta sola i livelli di parallasse in canvas separati.
 * Ogni metodo disegna solo con i colori ricevuti, pixel pieni o trasparenti: mai sfumature o
 * trasparenze parziali, quindi i colori restano sempre quelli della palette.
 */
export class PixelPainter {
  protected readonly context: CanvasRenderingContext2D;
  /** Motivi del retino già creati, per chiave "coloreA|coloreB|livello". */
  private readonly ditherPatternCache = new Map<string, CanvasPattern>();

  constructor(protected readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Impossibile ottenere il contesto 2D del canvas");
    }
    this.context = context;
    this.context.imageSmoothingEnabled = false;
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
   * Retino "sovrapposto" di un solo colore: i pixel accesi (livello 0-16) prendono il colore,
   * gli altri lasciano vedere ciò che c'è sotto. Serve per nebbia, aloni di luce e ombre
   * senza trasparenze vere.
   */
  public fillDitheredOverlay(x: number, y: number, width: number, height: number, color: string, level: number): void {
    const clampedLevel = clampDitherLevel(level);
    if (clampedLevel === 0) {
      return;
    }
    if (clampedLevel === DITHER_LEVELS) {
      this.fillRect(x, y, width, height, color);
      return;
    }
    const left = Math.round(x);
    const top = Math.round(y);
    const right = Math.round(x + width);
    const bottom = Math.round(y + height);
    if (right <= left || bottom <= top) {
      return;
    }
    this.context.fillStyle = this.getOverlayPattern(color, clampedLevel);
    this.context.fillRect(left, top, right - left, bottom - top);
  }


  /** Cerchio pieno (approssimato a righe di pixel interi). */
  public fillCircle(centerX: number, centerY: number, radius: number, color: string): void {
    const roundedRadius = Math.round(radius);
    for (let offsetY = -roundedRadius; offsetY <= roundedRadius; offsetY++) {
      const halfWidth = Math.floor(Math.sqrt(roundedRadius * roundedRadius - offsetY * offsetY));
      this.fillRect(Math.round(centerX) - halfWidth, Math.round(centerY) + offsetY, halfWidth * 2 + 1, 1, color);
    }
  }

  /**
   * Alone di luce: anelli concentrici a retino sempre più fitto verso il centro (solo il colore
   * indicato, ciò che sta sotto resta visibile tra i pixel). "rings" = numero di anelli.
   */
  public fillGlow(centerX: number, centerY: number, radius: number, color: string, rings = 3, maxLevel = 8): void {
    for (let ringIndex = 0; ringIndex < rings; ringIndex++) {
      const ringRadius = Math.round(radius * (1 - ringIndex / rings));
      const level = Math.round((maxLevel * (ringIndex + 1)) / rings);
      for (let offsetY = -ringRadius; offsetY <= ringRadius; offsetY++) {
        const halfWidth = Math.floor(Math.sqrt(ringRadius * ringRadius - offsetY * offsetY));
        const rowY = Math.round(centerY) + offsetY;
        for (let rowX = Math.round(centerX) - halfWidth; rowX <= Math.round(centerX) + halfWidth; rowX++) {
          // ogni anello disegna solo i pixel che l'anello precedente non aveva acceso
          const previousLevel = Math.round((maxLevel * ringIndex) / rings);
          if (isDitherPixelOn(rowX, rowY, level) && !isDitherPixelOn(rowX, rowY, previousLevel)) {
            this.context.fillStyle = color;
            this.context.fillRect(rowX, rowY, 1, 1);
          }
        }
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

  /** Motivo 4x4 del retino sovrapposto: solo i pixel accesi sono colorati, gli altri trasparenti. */
  private getOverlayPattern(color: string, level: number): CanvasPattern {
    const cacheKey = `${color}|sovrapposto|${level}`;
    const cached = this.ditherPatternCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const tile = document.createElement("canvas");
    tile.width = 4;
    tile.height = 4;
    const tileContext = tile.getContext("2d")!;
    tileContext.fillStyle = color;
    for (let rowIndex = 0; rowIndex < 4; rowIndex++) {
      for (let columnIndex = 0; columnIndex < 4; columnIndex++) {
        if (isDitherPixelOn(columnIndex, rowIndex, level)) {
          tileContext.fillRect(columnIndex, rowIndex, 1, 1);
        }
      }
    }
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
    for (const character of text) {
      const glyph = getGlyph(character);
      for (let rowIndex = 0; rowIndex < GLYPH_HEIGHT; rowIndex++) {
        const row = glyph.rows[rowIndex]!;
        this.context.fillStyle = options.rowColors?.[rowIndex] ?? color;
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
}
