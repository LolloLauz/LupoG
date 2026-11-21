import { GAME_CONFIG, PALETTE } from "../config/gameConfig";
import { computeLineWaveOffset } from "./PaletteEffects";
import { PixelPainter } from "./PixelPainter";

export type { DrawTextOptions, TextAlignment } from "./PixelPainter";

/**
 * Lo schermo del gioco: un PixelPainter sul canvas della pagina, a risoluzione interna fissa
 * (320x240, vedi GAME_CONFIG). Tutte le coordinate sono in pixel interni; il canvas viene
 * ingrandito solo con moltiplicatori interi per mantenere i pixel nitidi.
 * In più rispetto a PixelPainter: scala intera, oscuramento della pausa, ondulazione per riga.
 */
export class Renderer extends PixelPainter {
  private ditherPattern: HTMLCanvasElement | null = null;
  /** Copia di lavoro dello schermo usata dall'effetto di ondulazione. */
  private waveBuffer: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(Renderer.prepareCanvas(canvas));
    window.addEventListener("resize", this.applyIntegerScale);
    this.applyIntegerScale();
  }

  /** Imposta la risoluzione interna del canvas (prima di ottenere il contesto). */
  private static prepareCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    canvas.width = GAME_CONFIG.internalWidth;
    canvas.height = GAME_CONFIG.internalHeight;
    return canvas;
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
   * Ondulazione per riga (effetto "raster" di acqua, calore, magia): ogni riga della fascia
   * indicata viene spostata in orizzontale di un numero intero di pixel secondo un'onda.
   * Va chiamato DOPO aver disegnato ciò che deve ondulare. Con "left" e "regionWidth" ondula solo
   * quella parte della riga (es. una pozza d'acqua). I pixel scoperti ai bordi mantengono il
   * contenuto precedente della riga.
   */
  public applyLineWave(
    top: number,
    height: number,
    amplitude: number,
    wavelength: number,
    phase: number,
    left = 0,
    regionWidth = this.canvas.width
  ): void {
    const firstRow = Math.max(0, Math.round(top));
    const lastRow = Math.min(this.canvas.height, Math.round(top + height));
    const regionLeft = Math.max(0, Math.round(left));
    const regionRight = Math.min(this.canvas.width, Math.round(left + regionWidth));
    if (lastRow <= firstRow || regionRight <= regionLeft || amplitude === 0) {
      return;
    }
    if (this.waveBuffer === null) {
      this.waveBuffer = document.createElement("canvas");
      this.waveBuffer.width = this.canvas.width;
      this.waveBuffer.height = this.canvas.height;
    }
    const bufferContext = this.waveBuffer.getContext("2d")!;
    const bandHeight = lastRow - firstRow;
    const bandWidth = regionRight - regionLeft;
    bufferContext.drawImage(this.canvas, regionLeft, firstRow, bandWidth, bandHeight, regionLeft, firstRow, bandWidth, bandHeight);
    for (let rowY = firstRow; rowY < lastRow; rowY++) {
      const offset = computeLineWaveOffset(rowY, amplitude, wavelength, phase);
      if (offset === 0) {
        continue;
      }
      // la riga spostata resta dentro la regione: si copia solo la parte che ci entra
      const sourceLeft = offset > 0 ? regionLeft : regionLeft - offset;
      const copyWidth = bandWidth - Math.abs(offset);
      if (copyWidth > 0) {
        this.context.drawImage(this.waveBuffer, sourceLeft, rowY, copyWidth, 1, sourceLeft + offset, rowY, copyWidth, 1);
      }
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
