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
    const scale = computeIntegerScale(window.innerWidth, window.innerHeight, window.devicePixelRatio);
    this.canvas.style.width = `${scale.cssWidth}px`;
    this.canvas.style.height = `${scale.cssHeight}px`;
  };
}

/** I browser misurano le dimensioni CSS in multipli di 1/64 di pixel. */
const LAYOUT_UNITS_PER_CSS_PIXEL = 64;
/** Scarto massimo (pixel fisici) tra la dimensione voluta e quella che il browser può rappresentare. */
const MAX_DEVICE_PIXEL_ERROR = 0.01;

/** Scala scelta per il canvas: pixel fisici per pixel di gioco e dimensioni CSS da impostare. */
export interface IntegerScale {
  deviceScale: number;
  cssWidth: number;
  cssHeight: number;
}

/**
 * Sceglie la scala del canvas: un numero intero di PIXEL DELLO SCHERMO per ogni pixel del gioco (con una
 * scala di sistema frazionaria, es. 125% o 150%, un multiplo intero di pixel CSS darebbe pixel irregolari).
 *
 * Tra le scale intere che entrano nella finestra si prende la più grande che il browser può rappresentare
 * quasi esattamente: le dimensioni CSS sono multipli di 1/64 di pixel e, per esempio, 1280 pixel fisici con
 * scala di sistema 300% (426,667 px CSS) diventerebbero 1279,97: il browser ricampionerebbe l'immagine e
 * tutti i blocchi di pixel diventerebbero irregolari. In quel caso si scende alla scala intera successiva.
 * Se nessuna scala è rappresentabile si usa comunque la più grande (al minimo 1).
 */
export function computeIntegerScale(windowWidth: number, windowHeight: number, devicePixelRatio: number): IntegerScale {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const maxScale = Math.max(
    1,
    Math.floor(Math.min((windowWidth * ratio) / GAME_CONFIG.internalWidth, (windowHeight * ratio) / GAME_CONFIG.internalHeight))
  );
  const toCss = (devicePixels: number): { css: number; error: number } => {
    const css = Math.round((devicePixels / ratio) * LAYOUT_UNITS_PER_CSS_PIXEL) / LAYOUT_UNITS_PER_CSS_PIXEL;
    return { css, error: Math.abs(css * ratio - devicePixels) };
  };
  for (let deviceScale = maxScale; deviceScale >= 1; deviceScale--) {
    const width = toCss(GAME_CONFIG.internalWidth * deviceScale);
    const height = toCss(GAME_CONFIG.internalHeight * deviceScale);
    if (width.error < MAX_DEVICE_PIXEL_ERROR && height.error < MAX_DEVICE_PIXEL_ERROR) {
      return { deviceScale, cssWidth: width.css, cssHeight: height.css };
    }
  }
  return {
    deviceScale: maxScale,
    cssWidth: toCss(GAME_CONFIG.internalWidth * maxScale).css,
    cssHeight: toCss(GAME_CONFIG.internalHeight * maxScale).css,
  };
}
