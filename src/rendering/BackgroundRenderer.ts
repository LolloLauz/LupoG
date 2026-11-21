import { PALETTE, PALETTE_RAMPS } from "../config/gameConfig";
import type { ThemeId } from "../types/LevelTypes";
import { cycleRampColor } from "./PaletteEffects";
import { PixelPainter } from "./PixelPainter";
import type { Renderer } from "./Renderer";

/** Altezza del terreno (le decorazioni poggiano su questa linea). */
const GROUND_Y = 200;
/** Altezza dei livelli di parallasse: tutto lo schermo (sotto il terreno si vede il fondo degli abissi). */
const LAYER_HEIGHT = 240;
/**
 * Larghezza (periodo) di ogni livello di parallasse: il contenuto si ripete ogni LAYER_PERIOD pixel
 * senza cuciture. Deve essere almeno il doppio della larghezza dello schermo.
 */
const LAYER_PERIOD = 640;

/** Numero pseudo-casuale ripetibile (0..999) a partire da un intero. */
function hashNumber(value: number): number {
  let hashed = Math.imul(value + 7919, 2654435761) >>> 0;
  hashed ^= hashed >>> 15;
  return hashed % 1000;
}

/**
 * Un livello di parallasse: un'immagine larga LAYER_PERIOD disegnata una volta sola,
 * che scorre a "speed" volte la velocità della camera e si ripete in orizzontale.
 */
interface ParallaxLayer {
  kind: "layer";
  canvas: HTMLCanvasElement;
  speed: number;
}

/** Un elemento animato, disegnato a ogni frame (stelle, luna, torce, nebbia). */
interface LiveStep {
  kind: "live";
  draw: (renderer: Renderer, cameraX: number, timeSeconds: number) => void;
}

type BackgroundStep = ParallaxLayer | LiveStep;

/**
 * Sfondi in stile 16 bit: 4-6 livelli di parallasse per ambientazione, con gradienti a fasce,
 * retini, ombreggiatura lungo le rampe e ciclo dei colori.
 * Come sulle console a 16 bit, ogni livello statico viene disegnato UNA volta in un'immagine
 * a parte (alla prima richiesta) e poi solo copiato spostato: il costo per frame è minimo.
 * Gli elementi animati (stelle, luna, torce, nebbia) si disegnano a ogni frame.
 */
export class BackgroundRenderer {
  private readonly stepsByTheme = new Map<ThemeId, BackgroundStep[]>();

  public render(renderer: Renderer, theme: ThemeId, cameraX: number, timeSeconds: number): void {
    let steps = this.stepsByTheme.get(theme);
    if (steps === undefined) {
      steps = this.buildTheme(theme, renderer.width);
      this.stepsByTheme.set(theme, steps);
    }
    for (const step of steps) {
      if (step.kind === "layer") {
        this.drawLayer(renderer, step, cameraX);
      } else {
        step.draw(renderer, cameraX, timeSeconds);
      }
    }
  }

  private drawLayer(renderer: Renderer, layer: ParallaxLayer, cameraX: number): void {
    const shift = Math.round(cameraX * layer.speed);
    const offset = ((shift % LAYER_PERIOD) + LAYER_PERIOD) % LAYER_PERIOD;
    for (let drawX = -offset; drawX < renderer.width; drawX += LAYER_PERIOD) {
      renderer.drawImage(layer.canvas, drawX, 0);
    }
  }

  private buildTheme(theme: ThemeId, screenWidth: number): BackgroundStep[] {
    switch (theme) {
      case "forest":
        return this.buildForest(screenWidth);
      case "castle":
        return this.buildCastle(screenWidth);
      case "dungeon":
        return this.buildDungeon(screenWidth);
    }
  }

  /** Crea un livello: "paint" disegna nel canvas largo LAYER_PERIOD (alto quanto lo schermo). */
  private createLayer(speed: number, paint: (painter: PixelPainter) => void): ParallaxLayer {
    const canvas = document.createElement("canvas");
    canvas.width = LAYER_PERIOD;
    canvas.height = LAYER_HEIGHT;
    paint(new PixelPainter(canvas));
    return { kind: "layer", canvas, speed };
  }

  // ===========================================================================
  // Foresta oscura: cielo notturno, luna con alone, montagne, colline, tre file di pini
  // ===========================================================================

  private buildForest(screenWidth: number): BackgroundStep[] {
    return [
      this.createLayer(0, (painter) => {
        painter.fillVerticalGradient(0, 0, LAYER_PERIOD, GROUND_Y, [PALETTE.black, PALETTE.violetDark, PALETTE.deepNavy, PALETTE.navy]);
        this.paintPit(painter, [PALETTE.deepForest, PALETTE.black]);
      }),
      this.createStars(screenWidth, 110, 46),
      {
        kind: "live",
        draw: (renderer, cameraX): void => {
          const moonX = 236 - Math.round(cameraX * 0.02);
          renderer.fillGlow(moonX, 54, 30, PALETTE.slate, 3, 6);
          renderer.fillCircle(moonX, 54, 12, PALETTE.cream);
          renderer.fillCircle(moonX + 3, 56, 10, PALETTE.white);
          renderer.fillCircle(moonX - 4, 50, 2, PALETTE.stonePale);
          renderer.fillCircle(moonX + 4, 60, 3, PALETTE.stonePale);
          renderer.fillRect(moonX + 2, 47, 2, 2, PALETTE.stonePale);
        },
      },
      this.createLayer(0.08, (painter) => this.paintMountains(painter, 96, 46, PALETTE.deepNavy, PALETTE.slate, PALETTE.stonePale)),
      {
        kind: "live",
        draw: (renderer): void => {
          renderer.fillDitheredOverlay(0, 150, renderer.width, 14, PALETTE.slate, 2);
          renderer.fillDitheredOverlay(0, 156, renderer.width, 6, PALETTE.slate, 4);
        },
      },
      this.createLayer(0.2, (painter) => {
        this.paintRollingHills(painter, 150, 14, PALETTE.deepForest);
        this.paintPineRow(painter, { spacing: 8, baseY: 168, minHeight: 12, heightRange: 12, width: 9, seed: 300, fill: PALETTE.deepForest, light: null, trunk: null });
      }),
      this.createLayer(0.38, (painter) => {
        this.paintPineRow(painter, { spacing: 20, baseY: GROUND_Y, minHeight: 56, heightRange: 30, width: 22, seed: 500, fill: PALETTE.pine, light: PALETTE.darkGreen, trunk: PALETTE.earthDark });
      }),
      this.createLayer(0.6, (painter) => {
        this.paintPineRow(painter, { spacing: 64, baseY: GROUND_Y, minHeight: 96, heightRange: 40, width: 40, seed: 900, fill: PALETTE.deepForest, light: PALETTE.pine, trunk: PALETTE.earth, highlight: PALETTE.darkGreen });
      }),
      {
        kind: "live",
        draw: (renderer): void => {
          renderer.fillDitheredOverlay(0, 188, renderer.width, 12, PALETTE.slate, 2);
        },
      },
    ];
  }

  /** Catena di montagne ripetibile: creste, versanti illuminati a sinistra e cime innevate. */
  private paintMountains(painter: PixelPainter, baseHeight: number, amplitude: number, fill: string, ridge: string, snow: string): void {
    const heightAt = (x: number): number => {
      const phase = (x / LAYER_PERIOD) * Math.PI * 2;
      // somma di armoniche intere: la forma si ripete esattamente ogni LAYER_PERIOD pixel
      const wave = Math.abs(Math.sin(phase * 3)) * 0.6 + Math.abs(Math.sin(phase * 7 + 1)) * 0.3 + Math.sin(phase * 13) * 0.1;
      return Math.round(baseHeight * 0.55 + amplitude * wave);
    };
    for (let columnX = 0; columnX < LAYER_PERIOD; columnX++) {
      const height = heightAt(columnX);
      const topY = GROUND_Y - height;
      painter.fillRect(columnX, topY, 1, height, fill);
      const isLitSlope = height > heightAt(columnX - 1);
      painter.fillRect(columnX, topY, 1, isLitSlope ? 3 : 1, ridge);
      if (height > baseHeight * 0.55 + amplitude * 0.75) {
        painter.fillRect(columnX, topY, 1, isLitSlope ? 2 : 1, snow);
      }
    }
  }

  /** Colline morbide piene (fondo della foresta). */
  private paintRollingHills(painter: PixelPainter, topY: number, amplitude: number, fill: string): void {
    for (let columnX = 0; columnX < LAYER_PERIOD; columnX++) {
      const phase = (columnX / LAYER_PERIOD) * Math.PI * 2;
      const hillTop = Math.round(topY + amplitude * Math.sin(phase * 4) + (amplitude / 2) * Math.sin(phase * 9 + 2));
      painter.fillRect(columnX, hillTop, 1, GROUND_Y - hillTop, fill);
    }
  }

  /** Fila di pini a strati, ripetibile. light = lato illuminato (sinistro), highlight = punte delle fronde. */
  private paintPineRow(
    painter: PixelPainter,
    options: {
      spacing: number;
      baseY: number;
      minHeight: number;
      heightRange: number;
      width: number;
      seed: number;
      fill: string;
      light: string | null;
      trunk: string | null;
      highlight?: string;
    }
  ): void {
    const treeCount = Math.round(LAYER_PERIOD / options.spacing);
    for (let treeIndex = 0; treeIndex < treeCount; treeIndex++) {
      const randomValue = hashNumber(treeIndex + options.seed);
      const centerX = treeIndex * options.spacing + (randomValue % Math.max(1, Math.floor(options.spacing / 3)));
      const treeHeight = options.minHeight + (randomValue % Math.max(1, options.heightRange));
      // ogni albero si disegna anche spostato di un periodo, così chi attraversa il bordo si ripete
      for (const wrapOffset of [-LAYER_PERIOD, 0, LAYER_PERIOD]) {
        this.paintPine(painter, centerX + wrapOffset, options.baseY, treeHeight, options);
      }
    }
  }

  private paintPine(
    painter: PixelPainter,
    centerX: number,
    baseY: number,
    treeHeight: number,
    options: { width: number; fill: string; light: string | null; trunk: string | null; highlight?: string }
  ): void {
    const trunkHeight = Math.round(treeHeight * 0.14);
    if (options.trunk !== null) {
      const trunkWidth = Math.max(2, Math.round(options.width / 8));
      painter.fillRect(centerX - Math.floor(trunkWidth / 2), baseY - trunkHeight - 2, trunkWidth, trunkHeight + 2, options.trunk);
    }
    const tierCount = treeHeight > 60 ? 4 : 3;
    const crownHeight = treeHeight - trunkHeight;
    const tierHeight = Math.round(crownHeight / (tierCount - 0.6));
    for (let tierIndex = 0; tierIndex < tierCount; tierIndex++) {
      const tierBottom = baseY - trunkHeight - Math.round(tierIndex * tierHeight * 0.62);
      const tierHalfWidth = Math.round((options.width / 2) * (1 - tierIndex * 0.2));
      for (let rowOffset = 0; rowOffset < tierHeight; rowOffset++) {
        const rowY = tierBottom - rowOffset;
        const halfWidth = Math.round(tierHalfWidth * (1 - rowOffset / tierHeight));
        if (halfWidth <= 0) {
          painter.fillRect(centerX, rowY, 1, 1, options.fill);
          continue;
        }
        painter.fillRect(centerX - halfWidth, rowY, halfWidth * 2 + 1, 1, options.fill);
        if (options.light !== null) {
          // lato in luce (sinistro): metà sinistra più chiara, con bordo seghettato
          painter.fillRect(centerX - halfWidth, rowY, halfWidth - (rowOffset % 3), 1, options.light);
        }
        if (options.highlight !== undefined && rowOffset % 3 === 0 && halfWidth > 2) {
          painter.fillRect(centerX - halfWidth, rowY, 2, 1, options.highlight);
        }
      }
    }
  }

  /** Stelle fisse che brillano con il ciclo dei colori (si muovono pochissimo con la camera). */
  private createStars(screenWidth: number, maxY: number, count: number): LiveStep {
    const twinkleRamp = PALETTE_RAMPS.steel.slice(2);
    return {
      kind: "live",
      draw: (renderer, cameraX, timeSeconds): void => {
        const shift = Math.round(cameraX * 0.02);
        for (let starIndex = 0; starIndex < count; starIndex++) {
          const starX = (((hashNumber(starIndex) * 7 - shift) % screenWidth) + screenWidth) % screenWidth;
          const starY = 4 + (hashNumber(starIndex + 100) % maxY);
          const color = cycleRampColor(twinkleRamp, timeSeconds, 1.5 + (starIndex % 3), starIndex, "pingPong");
          renderer.fillRect(starX, starY, 1, 1, color);
          if (starIndex % 9 === 0) {
            // stelle più grandi a croce
            renderer.fillRect(starX - 1, starY, 3, 1, color);
            renderer.fillRect(starX, starY - 1, 1, 3, color);
          }
        }
      },
    };
  }

  // ===========================================================================
  // Castello: notte stellata, colline, castello lontano, mura merlate, colonne con stendardi
  // ===========================================================================

  private buildCastle(screenWidth: number): BackgroundStep[] {
    return [
      this.createLayer(0, (painter) => {
        painter.fillVerticalGradient(0, 0, LAYER_PERIOD, GROUND_Y, [PALETTE.black, PALETTE.deepNavy, PALETTE.darkBlue, PALETTE.slate]);
        this.paintPit(painter, [PALETTE.darkBlue, PALETTE.black]);
      }),
      this.createStars(screenWidth, 100, 40),
      this.createLayer(0.06, (painter) => this.paintRollingHills(painter, 156, 10, PALETTE.violetDark)),
      this.createLayer(0.18, (painter) => this.paintFarCastle(painter)),
      this.createLayer(0.42, (painter) => this.paintCurtainWall(painter)),
      this.createLayer(0.68, (painter) => this.paintColumnsWithBanners(painter)),
    ];
  }

  /** Sagome di castelli lontani con tetti conici e finestre accese. */
  private paintFarCastle(painter: PixelPainter): void {
    const period = 320;
    for (let baseX = 0; baseX < LAYER_PERIOD; baseX += period) {
      painter.fillRect(baseX, GROUND_Y - 50, period, 50, PALETTE.navy);
      for (let merlon = 0; merlon < period; merlon += 8) {
        painter.fillRect(baseX + merlon, GROUND_Y - 55, 4, 5, PALETTE.navy);
      }
      const towers: Array<[number, number, number]> = [[30, 96, 22], [110, 124, 28], [196, 84, 20], [262, 108, 24]];
      for (const [towerOffset, towerHeight, towerWidth] of towers) {
        const towerX = baseX + towerOffset;
        const towerTop = GROUND_Y - towerHeight;
        painter.fillRect(towerX, towerTop, towerWidth, towerHeight, PALETTE.navy);
        painter.fillRect(towerX, towerTop, 2, towerHeight, PALETTE.slate);
        // tetto conico a gradini
        for (let roofRow = 0; roofRow < towerWidth / 2 + 4; roofRow++) {
          const roofHalfWidth = Math.max(0, Math.round((towerWidth / 2 + 2) * (1 - roofRow / (towerWidth / 2 + 4))));
          const roofY = towerTop - 1 - roofRow;
          painter.fillRect(towerX + towerWidth / 2 - roofHalfWidth, roofY, roofHalfWidth * 2, 1, PALETTE.wine);
          painter.fillRect(towerX + towerWidth / 2 - roofHalfWidth, roofY, Math.max(1, roofHalfWidth - 1), 1, PALETTE.purple);
        }
        // finestre: alcune accese
        for (let windowIndex = 0; windowIndex < 3; windowIndex++) {
          const windowY = towerTop + 12 + windowIndex * 22;
          if (windowY > GROUND_Y - 24) {
            continue;
          }
          const isLit = hashNumber(towerOffset + windowIndex * 31) % 3 !== 0;
          painter.fillRect(towerX + towerWidth / 2 - 2, windowY, 4, 7, isLit ? PALETTE.goldLight : PALETTE.deepNavy);
          if (isLit) {
            painter.fillRect(towerX + towerWidth / 2 - 2, windowY, 4, 2, PALETTE.cream);
          }
        }
      }
    }
  }

  /** Mura merlate in pietra con mattoni ombreggiati, feritoie e edera. */
  private paintCurtainWall(painter: PixelPainter): void {
    const wallTop = 120;
    painter.fillRect(0, wallTop, LAYER_PERIOD, GROUND_Y - wallTop, PALETTE.stoneShadow);
    for (let merlon = 0; merlon < LAYER_PERIOD; merlon += 20) {
      painter.fillRect(merlon, wallTop - 10, 12, 10, PALETTE.stoneShadow);
      painter.fillRect(merlon, wallTop - 10, 12, 1, PALETTE.stone);
      painter.fillRect(merlon, wallTop - 10, 1, 10, PALETTE.stone);
      painter.fillRect(merlon + 11, wallTop - 10, 1, 10, PALETTE.stoneDark);
    }
    painter.fillRect(0, wallTop, LAYER_PERIOD, 2, PALETTE.stone);
    this.paintBricks(painter, 0, wallTop + 2, LAYER_PERIOD, GROUND_Y - wallTop - 2, 20, 10, {
      face: PALETTE.stoneShadow,
      light: PALETTE.stone,
      dark: PALETTE.stoneDark,
      mortar: PALETTE.black,
      seed: 40,
    });
    for (let slitX = 40; slitX < LAYER_PERIOD; slitX += 80) {
      painter.fillRect(slitX, wallTop + 22, 4, 16, PALETTE.black);
      painter.fillRect(slitX - 2, wallTop + 28, 8, 3, PALETTE.black);
    }
    // edera che scende dai merli
    for (let ivyIndex = 0; ivyIndex < 10; ivyIndex++) {
      const ivyX = (ivyIndex * 64 + (hashNumber(ivyIndex + 70) % 40)) % LAYER_PERIOD;
      const ivyLength = 14 + (hashNumber(ivyIndex + 90) % 30);
      for (let leafY = 0; leafY < ivyLength; leafY += 2) {
        const leafX = ivyX + Math.round(Math.sin(leafY * 0.5) * 2);
        painter.fillRect(leafX, wallTop + leafY, 3, 2, leafY % 4 === 0 ? PALETTE.darkGreen : PALETTE.pine);
      }
    }
  }

  /** Colonne cilindriche ombreggiate a fasce, con stendardi rossi e oro. */
  private paintColumnsWithBanners(painter: PixelPainter): void {
    const columnShades = [PALETTE.stoneDark, PALETTE.stoneShadow, PALETTE.stone, PALETTE.stoneLight, PALETTE.stoneLight, PALETTE.stone, PALETTE.stoneShadow, PALETTE.stoneShadow, PALETTE.stoneDark, PALETTE.stoneDark];
    const columnWidth = columnShades.length * 2;
    for (let columnX = 40; columnX < LAYER_PERIOD; columnX += 160) {
      columnShades.forEach((shade, stripeIndex) => {
        painter.fillRect(columnX + stripeIndex * 2, 34, 2, GROUND_Y - 34, shade);
      });
      // capitello e base
      painter.fillRect(columnX - 4, 26, columnWidth + 8, 8, PALETTE.stoneShadow);
      painter.fillRect(columnX - 4, 26, columnWidth + 8, 2, PALETTE.stoneLight);
      painter.fillRect(columnX - 2, 34, columnWidth + 4, 2, PALETTE.stoneDark);
      painter.fillRect(columnX - 4, GROUND_Y - 8, columnWidth + 8, 8, PALETTE.stoneShadow);
      painter.fillRect(columnX - 4, GROUND_Y - 8, columnWidth + 8, 2, PALETTE.stoneLight);
      // stendardo appeso a destra della colonna
      const bannerX = columnX + columnWidth + 6;
      painter.fillRect(bannerX - 2, 48, 26, 3, PALETTE.wood);
      painter.fillRect(bannerX - 2, 48, 26, 1, PALETTE.woodLight);
      for (let bannerRow = 0; bannerRow < 56; bannerRow++) {
        const sway = Math.round(Math.sin(bannerRow * 0.12) * 1);
        painter.fillRect(bannerX + sway, 51 + bannerRow, 22, 1, PALETTE.red);
        painter.fillRect(bannerX + sway, 51 + bannerRow, 2, 1, PALETTE.goldLight);
        painter.fillRect(bannerX + sway + 20, 51 + bannerRow, 2, 1, PALETTE.gold);
        painter.fillRect(bannerX + sway + 16, 51 + bannerRow, 4, 1, PALETTE.purple);
      }
      // coda a rondine
      for (let tailRow = 0; tailRow < 8; tailRow++) {
        painter.fillRect(bannerX + 1, 107 + tailRow, 8 - tailRow, 1, PALETTE.red);
        painter.fillRect(bannerX + 13 + tailRow, 107 + tailRow, 8 - tailRow, 1, PALETTE.purple);
      }
      // stemma: corona d'oro
      painter.fillRect(bannerX + 6, 72, 10, 6, PALETTE.goldLight);
      painter.fillRect(bannerX + 6, 68, 2, 4, PALETTE.goldLight);
      painter.fillRect(bannerX + 10, 66, 2, 6, PALETTE.goldLight);
      painter.fillRect(bannerX + 14, 68, 2, 4, PALETTE.goldLight);
      painter.fillRect(bannerX + 6, 76, 10, 2, PALETTE.gold);
    }
  }

  // ===========================================================================
  // Dungeon: muro di mattoni ombreggiati, celle ad arco, torce con alone, catene
  // ===========================================================================

  private buildDungeon(screenWidth: number): BackgroundStep[] {
    const wallSpeed = 0.45;
    const torchSpacing = 160;
    return [
      this.createLayer(wallSpeed, (painter) => {
        painter.fillRect(0, 0, LAYER_PERIOD, GROUND_Y, PALETTE.stoneDark);
        this.paintPit(painter, [PALETTE.violetDark, PALETTE.black]);
        this.paintBricks(painter, 0, 0, LAYER_PERIOD, GROUND_Y, 32, 12, {
          face: PALETTE.stoneShadow,
          light: PALETTE.stone,
          dark: PALETTE.stoneDark,
          mortar: PALETTE.black,
          seed: 7,
          moss: PALETTE.bog,
        });
        for (let archX = 20; archX < LAYER_PERIOD; archX += torchSpacing) {
          this.paintCellArch(painter, archX);
        }
      }),
      {
        kind: "live",
        draw: (renderer, cameraX, timeSeconds): void => {
          const shift = Math.round(cameraX * wallSpeed);
          const firstTorch = Math.floor((shift - 120) / torchSpacing);
          for (let torchIndex = firstTorch; torchIndex * torchSpacing + 110 - shift < screenWidth + 40; torchIndex++) {
            this.drawTorch(renderer, torchIndex * torchSpacing + 110 - shift, 70, timeSeconds, torchIndex);
          }
        },
      },
      this.createLayer(0.75, (painter) => {
        for (let chainIndex = 0; chainIndex < 8; chainIndex++) {
          const chainX = chainIndex * 80 + (hashNumber(chainIndex) % 40);
          const chainLength = 30 + (hashNumber(chainIndex + 50) % 50);
          for (let linkY = 0; linkY < chainLength; linkY += 4) {
            const isSideways = linkY % 8 === 0;
            painter.fillRect(chainX + (isSideways ? 0 : 1), linkY, isSideways ? 3 : 2, 3, PALETTE.slate);
            painter.fillRect(chainX + (isSideways ? 0 : 1), linkY, 1, 2, PALETTE.gray);
          }
          if (chainIndex % 3 === 0) {
            // anello e gancio in fondo alla catena
            painter.fillRect(chainX - 2, chainLength, 7, 2, PALETTE.gray);
            painter.fillRect(chainX - 2, chainLength + 2, 2, 4, PALETTE.slate);
            painter.fillRect(chainX + 3, chainLength + 2, 2, 4, PALETTE.slate);
            painter.fillRect(chainX - 1, chainLength + 6, 5, 1, PALETTE.slate);
          }
        }
      }),
      {
        kind: "live",
        draw: (renderer): void => {
          renderer.fillDitheredOverlay(0, 184, renderer.width, 16, PALETTE.violetDark, 4);
        },
      },
    ];
  }

  /** Cella con arco di conci, interno buio sfumato e sbarre di ferro. */
  private paintCellArch(painter: PixelPainter, archX: number): void {
    const archWidth = 48;
    const archTop = 96;
    painter.fillRect(archX, archTop, archWidth, GROUND_Y - archTop, PALETTE.black);
    painter.fillVerticalGradient(archX + 4, archTop + 4, archWidth - 8, 30, [PALETTE.stoneDark, PALETTE.black]);
    // conci dell'arco (ombreggiati)
    for (let stoneIndex = 0; stoneIndex < 6; stoneIndex++) {
      const stoneX = archX + stoneIndex * 8;
      const stoneY = archTop - 8 + Math.round(Math.abs(stoneIndex - 2.5) * 2);
      painter.fillRect(stoneX, stoneY, 8, 8, PALETTE.stone);
      painter.fillRect(stoneX, stoneY, 8, 1, PALETTE.stoneLight);
      painter.fillRect(stoneX + 7, stoneY, 1, 8, PALETTE.stoneDark);
      painter.fillRect(stoneX, stoneY + 7, 8, 1, PALETTE.black);
    }
    painter.fillRect(archX - 4, archTop, 4, GROUND_Y - archTop, PALETTE.stone);
    painter.fillRect(archX - 4, archTop, 1, GROUND_Y - archTop, PALETTE.stoneLight);
    painter.fillRect(archX + archWidth, archTop, 4, GROUND_Y - archTop, PALETTE.stoneShadow);
    // sbarre
    for (let barX = archX + 6; barX < archX + archWidth - 4; barX += 7) {
      painter.fillRect(barX, archTop + 4, 3, GROUND_Y - archTop - 4, PALETTE.slate);
      painter.fillRect(barX, archTop + 4, 1, GROUND_Y - archTop - 4, PALETTE.gray);
    }
    painter.fillRect(archX + 2, archTop + 20, archWidth - 4, 3, PALETTE.slate);
    painter.fillRect(archX + 2, archTop + 20, archWidth - 4, 1, PALETTE.gray);
  }

  /** Torcia a muro: alone di luce a retino, fiamma con ciclo dei colori, supporto di ferro. */
  private drawTorch(renderer: Renderer, torchX: number, torchY: number, timeSeconds: number, torchIndex: number): void {
    const flicker = Math.floor(timeSeconds * 8 + torchIndex) % 2;
    // la luce schiarisce il muro (pietra più chiara a retino) e lo scalda vicino alla fiamma
    renderer.fillGlow(torchX + 1, torchY - 6, 30 + flicker, PALETTE.stone, 2, 4);
    renderer.fillGlow(torchX + 1, torchY - 6, 12, PALETTE.ember, 2, 4);
    // supporto
    renderer.fillRect(torchX - 1, torchY, 5, 14, PALETTE.slate);
    renderer.fillRect(torchX - 1, torchY, 1, 14, PALETTE.gray);
    renderer.fillRect(torchX - 3, torchY - 2, 9, 3, PALETTE.slate);
    renderer.fillRect(torchX - 3, torchY - 2, 9, 1, PALETTE.gray);
    // fiamma: tre strati, il cuore segue la rampa del fuoco
    const flameHeight = 10 + flicker * 2;
    renderer.fillRect(torchX - 2, torchY - 2 - flameHeight, 7, flameHeight, PALETTE.flame);
    renderer.fillRect(torchX - 1, torchY - 4 - flameHeight, 5, 3, PALETTE.flame);
    renderer.fillRect(torchX - 1, torchY - flameHeight, 5, flameHeight - 3, PALETTE.orange);
    const coreColor = cycleRampColor(PALETTE_RAMPS.fire.slice(3), timeSeconds, 9, torchIndex, "pingPong");
    renderer.fillRect(torchX, torchY - flameHeight + 2, 3, flameHeight - 6, coreColor);
  }

  // ===========================================================================
  // Strumenti comuni
  // ===========================================================================

  /** Fondo degli abissi (sotto il livello del terreno): gradiente verso il nero. */
  private paintPit(painter: PixelPainter, colors: readonly string[]): void {
    painter.fillVerticalGradient(0, GROUND_Y, LAYER_PERIOD, LAYER_HEIGHT - GROUND_Y, colors);
  }

  /**
   * Muro di mattoni sfalsati con ogni mattone ombreggiato (luce in alto a sinistra), alcuni più
   * scuri o coperti di muschio per variare. Le dimensioni del periodo devono essere multiple
   * della larghezza del mattone, così il motivo si ripete senza cuciture.
   */
  private paintBricks(
    painter: PixelPainter,
    left: number,
    top: number,
    width: number,
    height: number,
    brickWidth: number,
    brickHeight: number,
    colors: { face: string; light: string; dark: string; mortar: string; seed: number; moss?: string }
  ): void {
    for (let rowIndex = 0; rowIndex * brickHeight < height; rowIndex++) {
      const rowY = top + rowIndex * brickHeight;
      const rowOffset = (rowIndex % 2) * (brickWidth / 2);
      for (let brickX = left - rowOffset; brickX < left + width; brickX += brickWidth) {
        const brickIndex = Math.floor((brickX - left + rowOffset) / brickWidth) % Math.round(width / brickWidth);
        const randomValue = hashNumber(brickIndex * 131 + rowIndex * 17 + colors.seed);
        const face = randomValue % 7 === 0 ? colors.dark : colors.face;
        painter.fillRect(brickX, rowY, brickWidth, brickHeight, colors.mortar);
        painter.fillRect(brickX + 1, rowY + 1, brickWidth - 1, brickHeight - 1, face);
        painter.fillRect(brickX + 1, rowY + 1, brickWidth - 2, 1, colors.light);
        painter.fillRect(brickX + 1, rowY + 1, 1, brickHeight - 2, colors.light);
        painter.fillRect(brickX + 2, rowY + brickHeight - 1, brickWidth - 2, 1, colors.dark);
        if (colors.moss !== undefined && randomValue % 11 === 0) {
          painter.fillDitheredOverlay(brickX + 1, rowY + brickHeight - 4, brickWidth - 1, 3, colors.moss, 8);
        }
        if (randomValue % 13 === 0) {
          // crepa
          painter.fillRect(brickX + 5, rowY + 3, 1, 3, colors.mortar);
          painter.fillRect(brickX + 6, rowY + 5, 3, 1, colors.mortar);
        }
      }
    }
  }
}
