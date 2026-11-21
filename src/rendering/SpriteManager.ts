import { PALETTE } from "../config/gameConfig";
import type { Renderer } from "./Renderer";

interface CompiledSprite {
  normal: HTMLCanvasElement;
  flipped: HTMLCanvasElement;
  /**
   * Sagome a tinta unita (chiave: colore + "n"/"f" per normale/specchiata), create alla prima
   * richiesta. La bianca serve per il lampo quando un personaggio viene colpito; altri colori
   * per ombre, lampi rossi o sagome scure.
   */
  silhouettes: Map<string, HTMLCanvasElement>;
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

    this.sprites.set(spriteId, { normal, flipped, silhouettes: new Map() });
  }

  /** Copia dell'immagine con ogni pixel non trasparente reso del colore indicato. */
  private static createSilhouette(source: HTMLCanvasElement, color: string): HTMLCanvasElement {
    const silhouette = document.createElement("canvas");
    silhouette.width = source.width;
    silhouette.height = source.height;
    const context = silhouette.getContext("2d")!;
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = color;
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
    if (isWhiteFlash) {
      this.drawSpriteSilhouette(renderer, spriteId, x, y, isFlipped, PALETTE.white);
      return;
    }
    const sprite = this.getCompiledSprite(spriteId);
    renderer.drawImage(isFlipped ? sprite.flipped : sprite.normal, x, y);
  }

  /** Disegna la sagoma dello sprite a tinta unita (usare un colore della palette). */
  public drawSpriteSilhouette(
    renderer: Renderer,
    spriteId: string,
    x: number,
    y: number,
    isFlipped: boolean,
    color: string
  ): void {
    const sprite = this.getCompiledSprite(spriteId);
    const cacheKey = `${color}${isFlipped ? "f" : "n"}`;
    let silhouette = sprite.silhouettes.get(cacheKey);
    if (silhouette === undefined) {
      silhouette = SpriteManager.createSilhouette(isFlipped ? sprite.flipped : sprite.normal, color);
      sprite.silhouettes.set(cacheKey, silhouette);
    }
    renderer.drawImage(silhouette, x, y);
  }

  private getCompiledSprite(spriteId: string): CompiledSprite {
    const sprite = this.sprites.get(spriteId);
    if (sprite === undefined) {
      throw new Error(`Sprite non registrato: ${spriteId}`);
    }
    return sprite;
  }
}
