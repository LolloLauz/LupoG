import type { Renderer } from "./Renderer";

interface CompiledSprite {
  normal: HTMLCanvasElement;
  flipped: HTMLCanvasElement;
  /** Sagome tutte bianche, usate per il lampo quando un personaggio viene colpito. */
  whiteNormal: HTMLCanvasElement;
  whiteFlipped: HTMLCanvasElement;
}

/**
 * Trasforma gli sprite descritti come testo (pixel art) in immagini pronte
 * da disegnare. Ogni sprite viene creato una sola volta, anche in versione
 * specchiata per le entità che guardano a sinistra.
 */
export class SpriteManager {
  private readonly sprites = new Map<string, CompiledSprite>();

  /**
   * Registra uno sprite.
   * @param spriteId identificativo univoco
   * @param pixelRows righe di caratteri: '.' = trasparente, altri = chiave in colorByKey
   * @param colorByKey mappa carattere -> colore CSS
   */
  public registerSprite(
    spriteId: string,
    pixelRows: string[],
    colorByKey: Record<string, string>
  ): void {
    const width = pixelRows[0]?.length ?? 0;
    const height = pixelRows.length;
    if (width === 0 || pixelRows.some((row) => row.length !== width)) {
      throw new Error(`Sprite "${spriteId}": righe di lunghezza diversa o vuote`);
    }
    const normal = document.createElement("canvas");
    normal.width = width;
    normal.height = height;
    const context = normal.getContext("2d");
    if (context === null) {
      throw new Error("Impossibile creare il canvas dello sprite");
    }
    pixelRows.forEach((row, rowIndex) => {
      for (let columnIndex = 0; columnIndex < width; columnIndex++) {
        const key = row[columnIndex]!;
        if (key === ".") {
          continue;
        }
        const color = colorByKey[key];
        if (color === undefined) {
          throw new Error(`Sprite "${spriteId}": colore '${key}' non definito`);
        }
        context.fillStyle = color;
        context.fillRect(columnIndex, rowIndex, 1, 1);
      }
    });

    const flipped = document.createElement("canvas");
    flipped.width = width;
    flipped.height = height;
    const flippedContext = flipped.getContext("2d")!;
    flippedContext.translate(width, 0);
    flippedContext.scale(-1, 1);
    flippedContext.drawImage(normal, 0, 0);

    const whiteNormal = SpriteManager.createWhiteSilhouette(normal);
    const whiteFlipped = SpriteManager.createWhiteSilhouette(flipped);
    this.sprites.set(spriteId, { normal, flipped, whiteNormal, whiteFlipped });
  }

  /** Copia dell'immagine con ogni pixel non trasparente reso bianco. */
  private static createWhiteSilhouette(source: HTMLCanvasElement): HTMLCanvasElement {
    const silhouette = document.createElement("canvas");
    silhouette.width = source.width;
    silhouette.height = source.height;
    const context = silhouette.getContext("2d")!;
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = "#f4f4f4";
    context.fillRect(0, 0, source.width, source.height);
    return silhouette;
  }

  /** Dimensioni in pixel di uno sprite registrato. */
  public getSpriteSize(spriteId: string): { width: number; height: number } {
    const sprite = this.sprites.get(spriteId);
    if (sprite === undefined) {
      throw new Error(`Sprite non registrato: ${spriteId}`);
    }
    return { width: sprite.normal.width, height: sprite.normal.height };
  }

  public drawSprite(
    renderer: Renderer,
    spriteId: string,
    x: number,
    y: number,
    isFlipped: boolean,
    isWhiteFlash = false
  ): void {
    const sprite = this.sprites.get(spriteId);
    if (sprite === undefined) {
      throw new Error(`Sprite non registrato: ${spriteId}`);
    }
    if (isWhiteFlash) {
      renderer.drawImage(isFlipped ? sprite.whiteFlipped : sprite.whiteNormal, x, y);
    } else {
      renderer.drawImage(isFlipped ? sprite.flipped : sprite.normal, x, y);
    }
  }
}
