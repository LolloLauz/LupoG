import { linePoints, setPixel, type PixelGrid } from "./spriteTools";

/**
 * Forme delle armi della Fase 1 (pugnale, lancia, ascia, mazza), disegnate su una griglia di
 * sprite dall'impugnatura (hand) alla punta (tip). Chiavi dei colori, come per la spada:
 * "e" impugnatura (cuoio), "l" asta (legno), "b" metallo, "v" riflesso del metallo, "g" ferro scuro.
 * Metallo e riflesso usano le stesse chiavi della lama: il power-up del fuoco li fa diventare incandescenti.
 */
export type WeaponDrawer = (grid: PixelGrid, handX: number, handY: number, tipX: number, tipY: number) => void;

interface Direction {
  unitX: number;
  unitY: number;
  length: number;
}

function getDirection(handX: number, handY: number, tipX: number, tipY: number): Direction {
  const length = Math.hypot(tipX - handX, tipY - handY);
  return length === 0 ? { unitX: 0, unitY: -1, length: 0 } : { unitX: (tipX - handX) / length, unitY: (tipY - handY) / length, length };
}

/** Asta di legno: i primi due pixel sono l'impugnatura in cuoio. */
function drawShaft(grid: PixelGrid, handX: number, handY: number, endX: number, endY: number): void {
  linePoints(handX, handY, endX, endY).forEach((point, pointIndex) => {
    setPixel(grid, point.x, point.y, pointIndex < 2 ? "e" : "l", true);
  });
}

/** Perpendicolare all'asta rivolta in avanti o in basso (dove sta il filo della lama). */
function getForwardPerpendicular(direction: Direction): { x: number; y: number } {
  const first = { x: -direction.unitY, y: direction.unitX };
  return first.x + first.y > 0 || (first.x + first.y === 0 && first.x > 0) ? first : { x: -first.x, y: -first.y };
}

/** Lancia: asta lunga che sporge un poco dietro la mano, punta di metallo a foglia. */
export const drawSpear: WeaponDrawer = (grid, handX, handY, tipX, tipY) => {
  const direction = getDirection(handX, handY, tipX, tipY);
  const headLength = 3;
  const baseX = Math.round(tipX - direction.unitX * headLength);
  const baseY = Math.round(tipY - direction.unitY * headLength);
  // il calcio dietro la mano non copre il corpo
  for (const point of linePoints(Math.round(handX - direction.unitX * 5), Math.round(handY - direction.unitY * 5), handX, handY)) {
    setPixel(grid, point.x, point.y, "e", false);
  }
  drawShaft(grid, handX, handY, baseX, baseY);
  for (const point of linePoints(baseX, baseY, tipX, tipY)) {
    setPixel(grid, point.x, point.y, "b", true);
  }
  setPixel(grid, tipX, tipY, "v", true);
  const side = { x: -direction.unitY, y: direction.unitX };
  const wingX = Math.round(tipX - direction.unitX * 2);
  const wingY = Math.round(tipY - direction.unitY * 2);
  setPixel(grid, Math.round(wingX + side.x), Math.round(wingY + side.y), "v", true);
  setPixel(grid, Math.round(wingX - side.x), Math.round(wingY - side.y), "b", true);
};

/** Ascia: asta di legno e lama larga tre pixel verso il davanti, con un dente di ferro dietro. */
export const drawAxe: WeaponDrawer = (grid, handX, handY, tipX, tipY) => {
  const direction = getDirection(handX, handY, tipX, tipY);
  drawShaft(grid, handX, handY, tipX, tipY);
  const forward = getForwardPerpendicular(direction);
  for (let along = 0; along <= 3; along++) {
    const centerX = tipX - direction.unitX * along;
    const centerY = tipY - direction.unitY * along;
    for (let across = 1; across <= 3; across++) {
      const key = across === 3 ? "v" : "b";
      setPixel(grid, Math.round(centerX + forward.x * across), Math.round(centerY + forward.y * across), key, true);
    }
    if (along === 1 || along === 2) {
      setPixel(grid, Math.round(centerX - forward.x), Math.round(centerY - forward.y), "g", true);
    }
  }
};

/** Mazza: asta di legno e testa di metallo tonda con quattro borchie. */
export const drawMace: WeaponDrawer = (grid, handX, handY, tipX, tipY) => {
  const direction = getDirection(handX, handY, tipX, tipY);
  drawShaft(grid, handX, handY, Math.round(tipX - direction.unitX * 2), Math.round(tipY - direction.unitY * 2));
  for (let offsetY = -2; offsetY <= 2; offsetY++) {
    for (let offsetX = -2; offsetX <= 2; offsetX++) {
      if (offsetX * offsetX + offsetY * offsetY <= 5) {
        setPixel(grid, tipX + offsetX, tipY + offsetY, "b", true);
      }
    }
  }
  setPixel(grid, tipX - 1, tipY - 1, "v", true);
  setPixel(grid, tipX, tipY - 1, "v", true);
  for (const [offsetX, offsetY] of [[3, 0], [-3, 0], [0, 3], [0, -3]] as const) {
    setPixel(grid, tipX + offsetX, tipY + offsetY, "g", true);
  }
};
