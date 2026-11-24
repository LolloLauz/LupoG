import { addOutline, createGrid, linePoints, setPixel, type PixelGrid } from "./spriteTools";

/**
 * Costruttori procedurali per le creature non umanoidi (lupi, melme): invece di scrivere ogni riga
 * a mano si compongono ellissi e rettangoli ombreggiati (luce in alto a sinistra), poi si aggiunge
 * il contorno con addOutline. Le stesse funzioni disegnano il lupo normale e il Re dei Lupi a scale diverse.
 *
 * Chiavi dei colori usate (la mappa la fornisce chi registra lo sprite):
 *   k contorno, d ombra, m tono medio, l luce, w riflesso/denti, e occhio, n naso/artigli, r bocca.
 */

/** Ellisse piena con tre toni: luce in alto a sinistra, ombra in basso a destra. */
export function fillShadedEllipse(grid: PixelGrid, centerX: number, centerY: number, radiusX: number, radiusY: number): void {
  for (let y = Math.floor(centerY - radiusY); y <= Math.ceil(centerY + radiusY); y++) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.ceil(centerX + radiusX); x++) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      const distance = normalizedX * normalizedX + normalizedY * normalizedY;
      if (distance > 1) {
        continue;
      }
      const lightness = -normalizedX * 0.45 - normalizedY * 0.8;
      const key = lightness > 0.35 ? "l" : lightness < -0.35 ? "d" : "m";
      setPixel(grid, x, y, key, true);
    }
  }
}

/** Rettangolo pieno con un tono (per zampe, collo...). */
function fillBlock(grid: PixelGrid, left: number, top: number, width: number, height: number, key: string): void {
  for (let y = top; y < top + height; y++) {
    for (let x = left; x < left + width; x++) {
      setPixel(grid, x, y, key, true);
    }
  }
}

/** Pose di un lupo. */
export type WolfPose = "stand" | "standBreath" | "run1" | "run2" | "run3" | "crouch" | "leap" | "bite" | "howl" | "hurt" | "lying";

/** Dimensioni del lupo: scale 1 = lupo normale (26x17), 2 = Re dei Lupi (circa 52x34). */
export interface WolfShape {
  scale: number;
  /** Larghezza e altezza dello sprite. */
  width: number;
  height: number;
}

/**
 * Lupo rivolto a destra: corpo allungato, testa con muso e orecchie a destra, coda a sinistra,
 * quattro zampe. La posa cambia gambe, altezza del corpo e posizione della testa.
 */
export function composeWolf(shape: WolfShape, pose: WolfPose): string[] {
  const s = shape.scale;
  const grid = createGrid(shape.width, shape.height);
  const groundY = shape.height - 1;
  const legLength = Math.round(5 * s);
  // altezza del corpo e spostamenti per posa
  const bodyLift = pose === "leap" ? Math.round(3 * s) : 0;
  const bodyDrop = pose === "crouch" ? Math.round(3 * s) : pose === "standBreath" ? 1 : pose === "lying" ? Math.round(6 * s) : 0;
  const bodyCenterX = Math.round(shape.width * 0.45);
  const bodyCenterY = groundY - legLength - Math.round(3.5 * s) + bodyDrop - bodyLift;
  const bodyRadiusX = Math.round(8.5 * s);
  const bodyRadiusY = Math.round(3.6 * s);

  // zampe (prima quelle lontane, più scure)
  if (pose !== "lying") {
    const frontX = bodyCenterX + Math.round(5.5 * s);
    const backX = bodyCenterX - Math.round(6.5 * s);
    const legWidth = Math.max(2, Math.round(2 * s));
    const legTop = bodyCenterY + Math.round(2 * s);
    const strides: Record<string, [number, number]> = {
      stand: [0, 0],
      standBreath: [0, 0],
      run1: [3, -3],
      run2: [0, 0],
      run3: [-3, 3],
      crouch: [1, -1],
      leap: [5, -5],
      bite: [2, 0],
      howl: [0, 0],
      hurt: [-2, 2],
    };
    const [frontStride, backStride] = strides[pose] ?? [0, 0];
    const legBottom = pose === "leap" ? groundY - Math.round(2 * s) : groundY;
    for (const [legX, stride, key] of [
      [frontX + 2, frontStride, "d"],
      [backX + 2, backStride, "d"],
      [frontX, -frontStride, "m"],
      [backX, -backStride, "m"],
    ] as const) {
      const footX = legX + Math.round(stride * s * 0.6);
      const height = Math.max(1, legBottom - legTop);
      fillBlock(grid, Math.round((legX + footX) / 2), legTop, legWidth, height, key);
      fillBlock(grid, footX, legBottom - Math.max(1, Math.round(s)) + 1, legWidth + 1, Math.max(1, Math.round(s)), "n");
    }
  }

  // coda (sale dietro il corpo; in posa d'attacco è tesa)
  const tailBaseX = bodyCenterX - bodyRadiusX;
  const tailLift = pose === "leap" || pose === "bite" ? 0 : Math.round(3 * s);
  fillShadedEllipse(grid, tailBaseX - Math.round(2 * s), bodyCenterY - tailLift, Math.round(3.5 * s), Math.max(1, Math.round(1.6 * s)));

  // corpo e criniera
  fillShadedEllipse(grid, bodyCenterX, bodyCenterY, bodyRadiusX, bodyRadiusY);
  fillShadedEllipse(grid, bodyCenterX + Math.round(5 * s), bodyCenterY - Math.round(1 * s), Math.round(4 * s), Math.round(4 * s));

  // testa
  const headOffsets: Record<string, [number, number]> = {
    bite: [3, 1],
    howl: [0, -4],
    crouch: [1, 1],
    hurt: [-1, -1],
    lying: [1, 2],
  };
  const [headDX, headDY] = headOffsets[pose] ?? [0, 0];
  const headX = bodyCenterX + Math.round((9 + headDX) * s);
  const headY = bodyCenterY - Math.round((3 - headDY) * s);
  fillShadedEllipse(grid, headX, headY, Math.round(3.2 * s), Math.round(2.8 * s));
  // muso (verso destra; nell'ululato verso l'alto)
  const isHowling = pose === "howl";
  const snoutX = isHowling ? headX + Math.round(2 * s) : headX + Math.round(3 * s);
  const snoutY = isHowling ? headY - Math.round(3 * s) : headY + Math.round(0.5 * s);
  fillShadedEllipse(grid, snoutX, snoutY, Math.round(isHowling ? 1.6 * s : 2.6 * s), Math.max(1, Math.round(isHowling ? 2.4 * s : 1.4 * s)));
  setPixel(grid, isHowling ? snoutX + 1 : snoutX + Math.round(2.4 * s), isHowling ? snoutY - Math.round(2 * s) : snoutY - 1, "n", true);
  // fauci aperte (morso, ululato)
  if (pose === "bite" || isHowling) {
    const mouthX = isHowling ? snoutX - 1 : snoutX;
    const mouthY = isHowling ? snoutY : snoutY + Math.max(1, Math.round(s));
    fillBlock(grid, mouthX, mouthY, Math.max(2, Math.round(2 * s)), Math.max(1, Math.round(s * 0.8)), "r");
    setPixel(grid, mouthX + 1, mouthY, "w", true);
  }
  // orecchie
  for (const earOffset of [-1.6, 0.4]) {
    const earX = headX + Math.round(earOffset * s);
    const earTop = headY - Math.round(2.6 * s) - Math.round(2 * s);
    for (let row = 0; row < Math.round(2.5 * s); row++) {
      fillBlock(grid, earX, earTop + row, Math.max(1, Math.round(row * 0.6) + 1), 1, row === 0 ? "l" : "m");
    }
  }
  // occhio (feroce: brilla)
  const eyeX = headX + Math.round(0.8 * s);
  const eyeY = headY - Math.round(0.6 * s);
  setPixel(grid, eyeX, eyeY, "e", true);
  if (s >= 2) {
    setPixel(grid, eyeX + 1, eyeY, "e", true);
    setPixel(grid, eyeX, eyeY - 1, "w", true);
  }
  // stelline del colpo
  if (pose === "hurt") {
    setPixel(grid, headX + Math.round(2 * s), headY - Math.round(5 * s), "w", true);
    setPixel(grid, headX - Math.round(2 * s), headY - Math.round(6 * s), "w", true);
  }
  // occhio chiuso da morto
  if (pose === "lying") {
    setPixel(grid, eyeX, eyeY, "d", true);
  }
  return addOutline(grid.map((row) => row.join("")), "k");
}

/** Pose di una melma. */
export type BlobPose = "rest" | "squash" | "stretch" | "wobbleLeft" | "wobbleRight" | "puddle" | "hurt";

/**
 * Melma rivolta a destra: goccia semitrasparente (resa con un riflesso e un nucleo più scuro),
 * due occhi. "width" e "height" sono le dimensioni dello sprite.
 */
export function composeBlob(width: number, height: number, pose: BlobPose): string[] {
  const grid = createGrid(width, height);
  const baseY = height - 1;
  const shapes: Record<BlobPose, { radiusX: number; radiusY: number; shiftX: number }> = {
    rest: { radiusX: width / 2 - 1.5, radiusY: height * 0.42, shiftX: 0 },
    squash: { radiusX: width / 2 - 0.5, radiusY: height * 0.3, shiftX: 0 },
    stretch: { radiusX: width / 2 - 2.5, radiusY: height * 0.5 - 0.5, shiftX: 1 },
    wobbleLeft: { radiusX: width / 2 - 1.5, radiusY: height * 0.4, shiftX: -1 },
    wobbleRight: { radiusX: width / 2 - 1.5, radiusY: height * 0.4, shiftX: 1 },
    puddle: { radiusX: width / 2 - 0.5, radiusY: Math.max(1.5, height * 0.15), shiftX: 0 },
    hurt: { radiusX: width / 2 - 2, radiusY: height * 0.38, shiftX: -1 },
  };
  const { radiusX, radiusY, shiftX } = shapes[pose];
  const centerX = width / 2 - 0.5 + shiftX;
  const centerY = baseY - radiusY;
  fillShadedEllipse(grid, centerX, centerY, radiusX, radiusY);
  // base piatta appoggiata a terra
  for (let x = Math.round(centerX - radiusX * 0.8); x <= Math.round(centerX + radiusX * 0.8); x++) {
    setPixel(grid, x, baseY, "d", true);
  }
  // riflesso
  setPixel(grid, Math.round(centerX - radiusX * 0.5), Math.round(centerY - radiusY * 0.5), "w", true);
  if (radiusX > 5) {
    setPixel(grid, Math.round(centerX - radiusX * 0.5) + 1, Math.round(centerY - radiusY * 0.5), "w", true);
  }
  // occhi (guardano a destra); nella pozzanghera chiusi
  if (pose !== "puddle") {
    const eyeY = Math.round(centerY - radiusY * 0.15);
    for (const eyeX of [Math.round(centerX + radiusX * 0.15), Math.round(centerX + radiusX * 0.55)]) {
      setPixel(grid, eyeX, eyeY, "e", true);
      if (radiusY > 3) {
        setPixel(grid, eyeX, eyeY + 1, "e", true);
      }
    }
  }
  if (pose === "hurt") {
    setPixel(grid, 0, 0, "w", true);
    setPixel(grid, width - 2, 1, "w", true);
  }
  return addOutline(grid.map((row) => row.join("")), "k");
}

/** Pose dello scorpione (Fase 8). */
export type ScorpionPose = "stand" | "breath" | "walk1" | "walk2" | "walk3" | "raise" | "strike" | "recover" | "hurt" | "lying";

/** Lato dello sprite dello scorpione: 30x16, rivolto a destra (le chele sporgono davanti all'hitbox). */
export const SCORPION_SPRITE = { width: 30, height: 16 } as const;

/**
 * Scorpione rivolto a destra: addome basso e largo, testa con le chele davanti, otto zampe sotto e la coda a
 * segmenti che sale dalla schiena e si piega in avanti con il pungiglione (chiave r, punta w).
 * Nella preparazione la coda si tira indietro, nel colpo scatta in avanti sopra la testa.
 */
export function composeScorpion(pose: ScorpionPose): string[] {
  const { width, height } = SCORPION_SPRITE;
  const grid = createGrid(width, height);
  const bodyY = pose === "breath" ? 11.5 : 11;
  // zampe: quattro per lato, la camminata alterna le punte
  const legPhase = pose === "walk1" ? 1 : pose === "walk3" ? -1 : 0;
  for (let legIndex = 0; legIndex < 4; legIndex++) {
    const rootX = 8 + legIndex * 4;
    const swing = legIndex % 2 === 0 ? legPhase : -legPhase;
    for (const point of linePoints(rootX, 13, rootX - 2 + swing, 15)) {
      setPixel(grid, point.x, point.y, "d", true);
    }
  }
  fillShadedEllipse(grid, 12, bodyY, 8, 3);
  fillShadedEllipse(grid, 21, bodyY, 3.5, 2.5);
  // chele: braccio e pinza, una alta e una bassa
  const clawReach = pose === "strike" ? 1 : 0;
  for (const point of linePoints(23, 10, 25 + clawReach, 8)) {
    setPixel(grid, point.x, point.y, "m", true);
  }
  fillShadedEllipse(grid, 27 + clawReach, 8, 2, 1.5);
  setPixel(grid, 29, 8, ".", true);
  fillShadedEllipse(grid, 26 + clawReach, 13, 1.8, 1.2);
  setPixel(grid, 22, Math.round(bodyY) - 1, "e", true);
  // coda: segmenti dalla schiena al pungiglione, secondo la posa
  const tailPaths: Record<ScorpionPose, Array<[number, number]>> = {
    stand: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 2], [10, 3]],
    breath: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 2], [10, 3]],
    walk1: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 2], [10, 3]],
    walk2: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 3], [10, 4]],
    walk3: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 2], [10, 3]],
    raise: [[5, 9], [3, 7], [2, 5], [2, 3], [4, 2], [6, 2], [8, 3]],
    strike: [[5, 9], [5, 6], [8, 4], [11, 3], [15, 3], [19, 4], [22, 5]],
    recover: [[5, 9], [3, 7], [4, 5], [6, 3], [9, 3], [12, 3], [14, 4]],
    hurt: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 2], [10, 3]],
    lying: [[5, 9], [3, 7], [3, 5], [4, 3], [6, 2], [8, 2], [10, 3]],
  };
  const tail = tailPaths[pose];
  for (const [index, [x, y]] of tail.entries()) {
    fillShadedEllipse(grid, x, y, index === 0 ? 1.9 : 1.6, 1.6);
  }
  const [tipX, tipY] = tail[tail.length - 1]!;
  setPixel(grid, tipX + 1, tipY + 1, "r", true);
  setPixel(grid, tipX + 2, tipY + 2, "w", true);
  if (pose === "hurt") {
    setPixel(grid, 0, 0, "w", true);
    setPixel(grid, width - 3, 2, "w", true);
  }
  let rows = addOutline(grid.map((row) => row.join("")), "k");
  if (pose === "hurt") {
    rows = rows.map((row) => row.slice(1) + ".");
  }
  if (pose === "lying") {
    // a pancia in su, appoggiato a terra: l'immagine capovolta e schiacciata (una riga su due) in basso
    const flipped = [...rows].reverse().filter((_, rowIndex) => rowIndex % 2 === 0);
    rows = [...Array<string>(height - flipped.length).fill(".".repeat(width)), ...flipped];
  }
  return rows;
}
