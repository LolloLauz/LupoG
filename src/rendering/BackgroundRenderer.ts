import { PALETTE, PALETTE_RAMPS } from "../config/gameConfig";
import { cycleRampColor } from "./PaletteEffects";
import type { ThemeId } from "../types/LevelTypes";
import type { Renderer } from "./Renderer";

/** Altezza del terreno (le decorazioni poggiano su questa linea). */
const GROUND_Y = 200;

/** Numero pseudo-casuale ripetibile (0..999) a partire da un intero. */
function hashNumber(value: number): number {
  let hashed = Math.imul(value + 7919, 2654435761) >>> 0;
  hashed ^= hashed >>> 15;
  return hashed % 1000;
}

/** Colori della fiamma delle torce (ciclo avanti e indietro lungo la rampa del fuoco). */
const TORCH_FLAME_RAMP = PALETTE_RAMPS.fire.slice(2, 5);

/**
 * Sfondi a più livelli con effetto parallasse (i livelli lontani scorrono
 * più lentamente della camera). Tutto è disegnato con rettangoli, retini e
 * gradienti a fasce, senza immagini. Ogni ciclo di elementi ripetuti continua
 * finché non copre tutta la larghezza dello schermo.
 */
export class BackgroundRenderer {
  public render(renderer: Renderer, theme: ThemeId, cameraX: number, timeSeconds: number): void {
    switch (theme) {
      case "forest":
        this.renderForest(renderer, cameraX);
        break;
      case "castle":
        this.renderCastle(renderer, cameraX, timeSeconds);
        break;
      case "dungeon":
        this.renderDungeon(renderer, cameraX, timeSeconds);
        break;
    }
  }

  // --- Foresta oscura: luna, colline lontane, pini ---------------------------

  private renderForest(renderer: Renderer, cameraX: number): void {
    // cielo a fasce: dal nero in alto al blu notte verso l'orizzonte
    renderer.fillVerticalGradient(0, 0, renderer.width, 150, [PALETTE.black, PALETTE.darkBlue, PALETTE.deepNavy]);
    renderer.fillRect(0, 150, renderer.width, GROUND_Y - 150, PALETTE.deepNavy);
    // luna (quasi ferma)
    const moonX = 196 - Math.round(cameraX * 0.02);
    this.fillCircle(renderer, moonX, 40, 12, PALETTE.white);
    this.fillCircle(renderer, moonX - 4, 36, 3, PALETTE.lightGray);
    this.fillCircle(renderer, moonX + 4, 45, 2, PALETTE.lightGray);
    // colline lontane
    const hillShift = cameraX * 0.15;
    for (let screenX = 0; screenX < renderer.width; screenX += 4) {
      const worldX = screenX + hillShift;
      const hillHeight = 46 + 16 * Math.sin(worldX * 0.02) + 8 * Math.sin(worldX * 0.055 + 1);
      renderer.fillRect(screenX, GROUND_Y - hillHeight, 4, hillHeight, PALETTE.navy);
    }
    // pini vicini
    this.renderPines(renderer, cameraX * 0.5, 38, PALETTE.black, PALETTE.darkGreen, 0);
  }

  private renderPines(
    renderer: Renderer,
    shiftX: number,
    spacing: number,
    trunkColor: string,
    leafColor: string,
    seedOffset: number
  ): void {
    const firstIndex = Math.floor(shiftX / spacing) - 1;
    const lastIndex = Math.ceil((shiftX + renderer.width) / spacing) + 1;
    for (let treeIndex = firstIndex; treeIndex <= lastIndex; treeIndex++) {
      const randomValue = hashNumber(treeIndex + seedOffset);
      const baseX = treeIndex * spacing + (randomValue % 14) - shiftX;
      const treeHeight = 64 + (randomValue % 30);
      renderer.fillRect(baseX + 13, GROUND_Y - 14, 4, 14, trunkColor);
      for (let layer = 0; layer < 4; layer++) {
        const layerWidth = 30 - layer * 7;
        const layerBottom = GROUND_Y - 10 - layer * Math.floor((treeHeight - 20) / 4);
        renderer.fillRect(baseX + 15 - layerWidth / 2, layerBottom - 16, layerWidth, 16, leafColor);
        renderer.fillRect(baseX + 15 - layerWidth / 2, layerBottom - 16, layerWidth, 1, trunkColor);
      }
    }
  }

  // --- Castello: stelle, sagoma del castello lontano, colonne con stendardi --

  private renderCastle(renderer: Renderer, cameraX: number, timeSeconds: number): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, GROUND_Y, [PALETTE.black, PALETTE.darkBlue, PALETTE.darkBlue, PALETTE.slate]);
    // stelle
    for (let starIndex = 0; starIndex < 28; starIndex++) {
      const starX = (hashNumber(starIndex) * 13) % renderer.width;
      const starY = hashNumber(starIndex + 100) % 110;
      const twinkles = Math.floor(timeSeconds * 2 + starIndex) % 5 === 0;
      renderer.fillRect(starX, starY, 1, 1, twinkles ? PALETTE.gray : PALETTE.lightGray);
    }
    // castello lontano, ripetuto ogni 192 px
    const farShift = cameraX * 0.3;
    const period = 192;
    const firstPeriod = Math.floor(farShift / period) - 1;
    for (let periodIndex = firstPeriod; periodIndex * period - farShift < renderer.width; periodIndex++) {
      const baseX = periodIndex * period - farShift;
      renderer.fillRect(baseX, GROUND_Y - 44, period, 44, PALETTE.navy); // mura
      for (let merlon = 0; merlon < period; merlon += 8) {
        renderer.fillRect(baseX + merlon, GROUND_Y - 50, 4, 6, PALETTE.navy);
      }
      for (const [towerOffset, towerHeight] of [[20, 90], [120, 112]] as const) {
        renderer.fillRect(baseX + towerOffset, GROUND_Y - towerHeight, 24, towerHeight, PALETTE.navy);
        for (let merlon = 0; merlon < 24; merlon += 8) {
          renderer.fillRect(baseX + towerOffset + merlon, GROUND_Y - towerHeight - 6, 4, 6, PALETTE.navy);
        }
        renderer.fillRect(baseX + towerOffset + 10, GROUND_Y - towerHeight + 14, 4, 8, PALETTE.yellow);
        renderer.fillRect(baseX + towerOffset + 10, GROUND_Y - towerHeight + 40, 4, 8, PALETTE.black);
      }
    }
    // colonne vicine con stendardi rossi, ogni 96 px
    const nearShift = cameraX * 0.6;
    const columnSpacing = 96;
    const firstColumn = Math.floor(nearShift / columnSpacing) - 1;
    for (let columnIndex = firstColumn; columnIndex * columnSpacing - nearShift < renderer.width; columnIndex++) {
      const columnX = columnIndex * columnSpacing - nearShift;
      renderer.fillRect(columnX, 40, 12, GROUND_Y - 40, PALETTE.black);
      renderer.fillRect(columnX + 2, 40, 2, GROUND_Y - 40, PALETTE.darkBlue);
      renderer.fillRect(columnX - 2, 36, 16, 6, PALETTE.black);
      renderer.fillRect(columnX + 14, 60, 10, 30, PALETTE.red);
      renderer.fillRect(columnX + 14, 90, 3, 5, PALETTE.red);
      renderer.fillRect(columnX + 21, 90, 3, 5, PALETTE.red);
      renderer.fillRect(columnX + 17, 68, 4, 8, PALETTE.yellow);
    }
  }

  // --- Dungeon: muro di mattoni, archi, catene e torce -----------------------

  private renderDungeon(renderer: Renderer, cameraX: number, timeSeconds: number): void {
    renderer.clear(PALETTE.black);
    const wallShift = Math.round(cameraX * 0.5);
    const brickHeight = 12;
    const brickWidth = 24;
    // mattoni
    for (let rowIndex = 0; rowIndex * brickHeight < GROUND_Y; rowIndex++) {
      const rowY = rowIndex * brickHeight;
      renderer.fillRect(0, rowY, renderer.width, 1, PALETTE.darkBlue);
      const jointOffset = (rowIndex % 2) * (brickWidth / 2);
      const firstJoint = Math.floor((wallShift - jointOffset) / brickWidth) * brickWidth + jointOffset;
      for (let jointX = firstJoint; jointX < wallShift + renderer.width; jointX += brickWidth) {
        renderer.fillRect(jointX - wallShift, rowY, 1, brickHeight, PALETTE.darkBlue);
      }
    }
    // archi scuri ogni 128 px
    const archSpacing = 128;
    const firstArch = Math.floor(wallShift / archSpacing) - 1;
    for (let archIndex = firstArch; archIndex * archSpacing + 40 - wallShift < renderer.width; archIndex++) {
      const archX = archIndex * archSpacing + 40 - wallShift;
      renderer.fillRect(archX, 90, 36, GROUND_Y - 90, PALETTE.darkBlue);
      renderer.fillRect(archX + 4, 98, 28, GROUND_Y - 98, PALETTE.black);
      renderer.fillRect(archX + 8, 90, 20, 8, PALETTE.black);
      // sbarre della cella
      for (let barX = archX + 8; barX < archX + 30; barX += 6) {
        renderer.fillRect(barX, 108, 2, 60, PALETTE.gray);
      }
    }
    // torce ogni 128 px (sfalsate), con fiamma che tremola
    const torchShift = Math.round(cameraX * 0.5);
    const firstTorch = Math.floor(torchShift / archSpacing) - 1;
    for (let torchIndex = firstTorch; torchIndex * archSpacing + 100 - torchShift < renderer.width; torchIndex++) {
      const torchX = torchIndex * archSpacing + 100 - torchShift;
      const isFlameHigh = Math.floor(timeSeconds * 6 + torchIndex) % 2 === 0;
      // ciclo dei colori: il cuore della fiamma pulsa lungo la rampa del fuoco
      const flameCoreColor = cycleRampColor(TORCH_FLAME_RAMP, timeSeconds, 8, torchIndex, "pingPong");
      renderer.fillRect(torchX, 70, 3, 14, PALETTE.gray);
      renderer.fillRect(torchX - 2, 66, 7, 4, PALETTE.gray);
      renderer.fillRect(torchX - 1, isFlameHigh ? 56 : 58, 5, isFlameHigh ? 10 : 8, PALETTE.orange);
      renderer.fillRect(torchX, isFlameHigh ? 59 : 60, 3, 6, flameCoreColor);
    }
    // catene appese (si muovono un po' più veloci)
    const chainShift = Math.round(cameraX * 0.7);
    const chainSpacing = 90;
    const firstChain = Math.floor(chainShift / chainSpacing) - 1;
    for (let chainIndex = firstChain; chainIndex * chainSpacing - chainShift < renderer.width; chainIndex++) {
      const chainX = chainIndex * chainSpacing + (hashNumber(chainIndex) % 30) - chainShift;
      const chainLength = 30 + (hashNumber(chainIndex + 50) % 40);
      for (let linkY = 0; linkY < chainLength; linkY += 4) {
        renderer.fillRect(chainX + (linkY % 8 === 0 ? 0 : 1), linkY, 2, 3, PALETTE.gray);
      }
    }
  }

  /** Cerchio pieno (approssimato a righe). */
  private fillCircle(renderer: Renderer, centerX: number, centerY: number, radius: number, color: string): void {
    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
      const halfWidth = Math.floor(Math.sqrt(radius * radius - offsetY * offsetY));
      renderer.fillRect(centerX - halfWidth, centerY + offsetY, halfWidth * 2 + 1, 1, color);
    }
  }
}
