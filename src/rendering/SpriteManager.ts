import { PALETTE } from "../config/gameConfig";
import type { Renderer } from "./Renderer";

/**
 * Variante di colore di uno sprite (equipaggiamento, piano E2-E3): alcune chiavi dei colori prendono un colore
 * diverso, senza registrare un altro sprite. L'id identifica la combinazione di colori (stesso id = stessi colori).
 */
export interface SpriteColorVariant {
  id: string;
  colors: Readonly<Record<string, string>>;
}

interface CompiledSprite {
  normal: HTMLCanvasElement;
  flipped: HTMLCanvasElement;
  /**
   * Sagome a tinta unita (chiave: colore + "n"/"f" per normale/specchiata), create alla prima
   * richiesta. La bianca serve per il lampo quando un personaggio viene colpito; altri colori
   * per ombre, lampi rossi o sagome scure.
   */
  silhouettes: Map<string, HTMLCanvasElement>;
  /** Colonna dello sprite (rivolto a destra) in cui inizia l'hitbox dell'entità. */
  anchorX: number;
  /** Righe e colori originali: servono a comporre le varianti di colore. */
  pixelRows: string[];
  colorByKey: Record<string, string>;
  /**
   * Varianti di colore (chiave: id della variante), create alla prima richiesta: così si compongono solo
   * i frame davvero disegnati con quell'equipaggiamento.
   */
  variants: Map<string, { normal: HTMLCanvasElement; flipped: HTMLCanvasElement }>;
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
   * @param anchorX colonna dello sprite (rivolto a destra) in cui cade il bordo sinistro
   *   dell'hitbox: serve a drawSpriteAligned per allineare sprite più grandi dell'hitbox
   */
  public registerSprite(
    spriteId: string,
    pixelRows: string[],
    colorByKey: Record<string, string>,
    anchorX = 0
  ): void {
    const width = pixelRows[0]?.length ?? 0;
    if (width === 0 || pixelRows.some((row) => row.length !== width)) {
      throw new Error(`Sprite "${spriteId}": righe di lunghezza diversa o vuote`);
    }
    const { normal, flipped } = SpriteManager.paint(spriteId, pixelRows, colorByKey);
    this.sprites.set(spriteId, { normal, flipped, silhouettes: new Map(), anchorX, pixelRows, colorByKey, variants: new Map() });
  }

  /** Disegna le righe di testo su un canvas, e la sua copia specchiata. */
  private static paint(spriteId: string, pixelRows: string[], colorByKey: Readonly<Record<string, string>>): { normal: HTMLCanvasElement; flipped: HTMLCanvasElement } {
    const width = pixelRows[0]?.length ?? 0;
    const height = pixelRows.length;
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
    return { normal, flipped };
  }

  /** Immagini dello sprite con la variante di colore indicata (o quelle normali se null). */
  private getImages(sprite: CompiledSprite, spriteId: string, variant: SpriteColorVariant | null): { normal: HTMLCanvasElement; flipped: HTMLCanvasElement } {
    if (variant === null) {
      return sprite;
    }
    let images = sprite.variants.get(variant.id);
    if (images === undefined) {
      images = SpriteManager.paint(spriteId, sprite.pixelRows, { ...sprite.colorByKey, ...variant.colors });
      sprite.variants.set(variant.id, images);
    }
    return images;
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

  /** Colonna d'ancoraggio dell'hitbox nello sprite (vedi registerSprite). */
  public getSpriteAnchorX(spriteId: string): number {
    return this.getCompiledSprite(spriteId).anchorX;
  }

  /**
   * Disegna lo sprite allineato all'hitbox di un'entità: i piedi (ultima riga) poggiano sul bordo
   * inferiore dell'hitbox e la colonna d'ancoraggio coincide con il suo bordo sinistro.
   * Specchiato (entità rivolta a sinistra) l'hitbox resta nello stesso punto: ciò che sporge
   * davanti (armi, scie) passa dall'altra parte.
   * @param hitboxScreenX bordo sinistro dell'hitbox, in coordinate dello schermo
   * @param hitboxScreenBottom bordo inferiore dell'hitbox, in coordinate dello schermo
   * @param flashColor se indicato, disegna la sagoma a tinta unita (lampo quando viene colpito)
   * @param variant se indicata, i colori dell'equipaggiamento (vedi SpriteColorVariant)
   */
  public drawSpriteAligned(
    renderer: Renderer,
    spriteId: string,
    hitboxScreenX: number,
    hitboxScreenBottom: number,
    hitboxWidth: number,
    isFlipped: boolean,
    flashColor: string | null = null,
    variant: SpriteColorVariant | null = null
  ): void {
    const sprite = this.getCompiledSprite(spriteId);
    const spriteWidth = sprite.normal.width;
    const drawX = isFlipped
      ? hitboxScreenX - (spriteWidth - sprite.anchorX - hitboxWidth)
      : hitboxScreenX - sprite.anchorX;
    const drawY = hitboxScreenBottom - sprite.normal.height;
    if (flashColor !== null) {
      this.drawSpriteSilhouette(renderer, spriteId, drawX, drawY, isFlipped, flashColor);
    } else {
      const images = this.getImages(sprite, spriteId, variant);
      renderer.drawImage(isFlipped ? images.flipped : images.normal, drawX, drawY);
    }
  }

  public drawSprite(
    renderer: Renderer,
    spriteId: string,
    x: number,
    y: number,
    isFlipped: boolean,
    isWhiteFlash = false,
    variant: SpriteColorVariant | null = null
  ): void {
    if (isWhiteFlash) {
      this.drawSpriteSilhouette(renderer, spriteId, x, y, isFlipped, PALETTE.white);
      return;
    }
    const sprite = this.getCompiledSprite(spriteId);
    const images = this.getImages(sprite, spriteId, variant);
    renderer.drawImage(isFlipped ? images.flipped : images.normal, x, y);
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
