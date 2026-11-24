import { linePoints, setPixel, type PixelGrid } from "./spriteTools";

/**
 * Forme delle armi della Fase 1 (pugnale, lancia, ascia, mazza), disegnate su una griglia di
 * sprite dall'impugnatura (hand) alla punta (tip). Chiavi dei colori, come per la spada:
 * "e" impugnatura (cuoio), "l" asta (legno), "b" metallo, "v" riflesso del metallo, "j" ferro scuro, "q" corda dell'arco (chiavi proprie: le armature ricolorano d, g, s, w).
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
      setPixel(grid, Math.round(centerX - forward.x), Math.round(centerY - forward.y), "j", true);
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
    setPixel(grid, tipX + offsetX, tipY + offsetY, "j", true);
  }
};

/** Mezza lunghezza (px) dell'arco, da un'estremità al centro. */
const BOW_HALF_LENGTH = 6;

/**
 * Arco: hand → tip è la direzione di mira. L'arco (legno) sta poco davanti alla mano, di traverso, con il
 * centro più avanti delle punte; la corda (chiara) va dalle punte alla mano.
 */
export const drawBow: WeaponDrawer = (grid, handX, handY, tipX, tipY) => {
  const direction = getDirection(handX, handY, tipX, tipY);
  const side = { x: -direction.unitY, y: direction.unitX };
  const centerX = handX + direction.unitX * 4;
  const centerY = handY + direction.unitY * 4;
  const endpoints: Array<{ x: number; y: number }> = [];
  for (let along = -BOW_HALF_LENGTH; along <= BOW_HALF_LENGTH; along++) {
    // le punte restano 3 px indietro rispetto al centro (curva dell'arco)
    const bendBack = Math.round((3 * along * along) / (BOW_HALF_LENGTH * BOW_HALF_LENGTH));
    const x = Math.round(centerX + side.x * along - direction.unitX * bendBack);
    const y = Math.round(centerY + side.y * along - direction.unitY * bendBack);
    const isTip = Math.abs(along) === BOW_HALF_LENGTH;
    setPixel(grid, x, y, along === 0 ? "e" : isTip ? "e" : "l", true);
    if (isTip) {
      endpoints.push({ x, y });
    }
  }
  for (const endpoint of endpoints) {
    for (const point of linePoints(endpoint.x, endpoint.y, handX, handY)) {
      setPixel(grid, point.x, point.y, "q", false);
    }
  }
};

/** Balestra: calcio di legno lungo la mira e un piccolo arco di metallo di traverso sulla punta. */
export const drawCrossbow: WeaponDrawer = (grid, handX, handY, tipX, tipY) => {
  const direction = getDirection(handX, handY, tipX, tipY);
  const side = { x: -direction.unitY, y: direction.unitX };
  const frontX = Math.round(handX + direction.unitX * 9);
  const frontY = Math.round(handY + direction.unitY * 9);
  drawShaft(grid, handX, handY, frontX, frontY);
  for (let along = -4; along <= 4; along++) {
    const bendBack = Math.abs(along) >= 3 ? 1 : 0;
    const key = Math.abs(along) === 4 ? "v" : "b";
    setPixel(grid, Math.round(frontX + side.x * along - direction.unitX * bendBack), Math.round(frontY + side.y * along - direction.unitY * bendBack), key, true);
  }
  setPixel(grid, Math.round(frontX + direction.unitX), Math.round(frontY + direction.unitY), "v", true);
};

/**
 * Spadone a due mani (E3): impugnatura lunga (tre pixel di cuoio), elsa larga d'oro e lama larga due pixel con il filo
 * luminoso sul davanti. Metallo e riflesso usano le chiavi della lama (b, v): fuoco e rarità li ricolorano.
 */
export const drawGreatsword: WeaponDrawer = (grid, handX, handY, tipX, tipY) => {
  const direction = getDirection(handX, handY, tipX, tipY);
  // spessore lungo un asse (non in diagonale): così la lama larga non ha buchi
  const forward = getForwardPerpendicular(direction);
  const perpendicular = Math.abs(forward.x) >= Math.abs(forward.y) ? { x: Math.sign(forward.x), y: 0 } : { x: 0, y: Math.sign(forward.y) };
  const points = linePoints(handX, handY, tipX, tipY);
  points.forEach((point, pointIndex) => {
    if (pointIndex < 3) {
      setPixel(grid, point.x, point.y, "e", true);
      return;
    }
    setPixel(grid, point.x, point.y, "b", true);
    if (pointIndex < points.length - 1) {
      setPixel(grid, Math.round(point.x - perpendicular.x), Math.round(point.y - perpendicular.y), "b", true);
      setPixel(grid, Math.round(point.x + perpendicular.x), Math.round(point.y + perpendicular.y), "v", true);
    }
  });
  setPixel(grid, tipX, tipY, "v", true);
  const guard = points[3] ?? points[points.length - 1]!;
  const side = { x: -direction.unitY, y: direction.unitX };
  for (const distance of [-3, -2, -1, 1, 2, 3]) {
    setPixel(grid, Math.round(guard.x + side.x * distance), Math.round(guard.y + side.y * distance), "y", true);
  }
};
