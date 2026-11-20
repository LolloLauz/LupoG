/**
 * Strumenti condivisi per costruire sprite pixel art come testo:
 * griglie di pixel, linee, armi, scie e pose standard delle gambe.
 * Usati da knightSprites.ts e enemySprites.ts.
 */

/** Pose delle gambe (12 colonne x 7 righe). */
export const LEGS_STAND: string[] = [
  "...kgg.ggk..",
  "...kgg.ggk..",
  "...kgg.ggk..",
  "...kgg.ggk..",
  "...kgg.ggk..",
  "..kkgg.ggkk.",
  "..kkkk.kkkk.",
];

export const LEGS_STRIDE: string[] = [
  "...kgg.ggk..",
  "...kgg.ggk..",
  "..kgg...ggk.",
  ".kgg.....ggk",
  ".kgg.....ggk",
  ".kkgg...ggkk",
  ".kkkk...kkkk",
];

export const LEGS_PASSING: string[] = [
  "....kgggk...",
  "....kgggk...",
  "....kgggk...",
  "....kgggk...",
  "....kgggk...",
  "...kkgggkk..",
  "...kkkkkkk..",
];

export const LEGS_JUMP: string[] = [
  "...kgg.ggk..",
  "..kgg...ggk.",
  "..kgg...kgg.",
  "..kkkk..kkk.",
  "............",
  "............",
  "............",
];

export const LEGS_FALL: string[] = [
  "...kgg.ggk..",
  "..kgg...ggk.",
  ".kgg.....ggk",
  ".kgg.....ggk",
  ".kkgg...ggkk",
  ".kkkk...kkkk",
  "............",
];


// ---------------------------------------------------------------------------
// Griglie di pixel
// ---------------------------------------------------------------------------

export type PixelGrid = string[][];

export function createGrid(width: number, height: number): PixelGrid {
  return Array.from({ length: height }, () => Array<string>(width).fill("."));
}

export function stampRows(grid: PixelGrid, rows: string[], offsetX = 0, offsetY = 0): void {
  rows.forEach((row, rowIndex) => {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      if (row[columnIndex] !== ".") {
        setPixel(grid, columnIndex + offsetX, rowIndex + offsetY, row[columnIndex]!, true);
      }
    }
  });
}

export function setPixel(grid: PixelGrid, x: number, y: number, key: string, overwrite: boolean): void {
  const row = grid[y];
  if (row === undefined || x < 0 || x >= row.length) {
    return;
  }
  if (overwrite || row[x] === ".") {
    row[x] = key;
  }
}

/** Punti di una linea (algoritmo di Bresenham). */
export function linePoints(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  let x = x0;
  let y = y0;
  const deltaX = Math.abs(x1 - x0);
  const deltaY = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = deltaX + deltaY;
  for (;;) {
    points.push({ x, y });
    if (x === x1 && y === y1) {
      break;
    }
    const doubledError = 2 * error;
    if (doubledError >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubledError <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
  return points;
}

/** Caratteri usati per disegnare un'arma (chiavi della mappa colori dello sprite). */
export interface BladeKeys {
  grip: string;
  blade: string;
  edge: string;
  guard: string;
}

export const DEFAULT_BLADE_KEYS: BladeKeys = { grip: "r", blade: "s", edge: "w", guard: "y" };

/** Disegna l'arma dall'impugnatura (hand) alla punta (tip). */
export function drawSword(
  grid: PixelGrid,
  handX: number,
  handY: number,
  tipX: number,
  tipY: number,
  keys: BladeKeys = DEFAULT_BLADE_KEYS
): void {
  const points = linePoints(handX, handY, tipX, tipY);
  const isMostlyHorizontal = Math.abs(tipX - handX) >= Math.abs(tipY - handY);
  points.forEach((point, pointIndex) => {
    if (pointIndex < 2) {
      setPixel(grid, point.x, point.y, keys.grip, true); // impugnatura
      return;
    }
    setPixel(grid, point.x, point.y, keys.blade, true);
    // filo luminoso accanto alla lama
    setPixel(grid, point.x + (isMostlyHorizontal ? 0 : 1), point.y + (isMostlyHorizontal ? -1 : 0), keys.edge, true);
  });
  const tip = points[points.length - 1]!;
  setPixel(grid, tip.x, tip.y, keys.edge, true);
  const guard = points[2] ?? points[points.length - 1]!;
  const guardStepX = isMostlyHorizontal ? 0 : 1;
  const guardStepY = isMostlyHorizontal ? 1 : 0;
  for (const distance of [-2, -1, 1, 2]) {
    setPixel(grid, guard.x + guardStepX * distance, guard.y + guardStepY * distance, keys.guard, true);
  }
}

/** Scia bianca del colpo: arco di cerchio centrato sull'impugnatura (0° = destra, positivo = verso il basso). */
export function drawSlashArc(
  grid: PixelGrid,
  centerX: number,
  centerY: number,
  radius: number,
  startDegrees: number,
  endDegrees: number
): void {
  const stepDegrees = startDegrees <= endDegrees ? 3 : -3;
  for (let angle = startDegrees; stepDegrees > 0 ? angle <= endDegrees : angle >= endDegrees; angle += stepDegrees) {
    const radians = (angle * Math.PI) / 180;
    setPixel(
      grid,
      Math.round(centerX + Math.cos(radians) * radius),
      Math.round(centerY + Math.sin(radians) * radius),
      "w",
      false
    );
  }
}

