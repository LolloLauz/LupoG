import { ABILITY_EFFECT_CONFIG, ABILITY_VISUAL_CONFIG, type AbilityEffectId } from "../../config/abilityVisualConfig";
import { PALETTE } from "../../config/gameConfig";
import type { AbilityId, ElementId } from "../../types/EntityTypes";
import type { SpriteManager } from "../SpriteManager";
import { createGrid, drawSlashArc, linePoints, setPixel, type PixelGrid } from "./spriteTools";

/**
 * Grafica delle mosse (Classi Fase 6A): effetti nel mondo, barriere delle guardie e icone 8x8 dell'HUD.
 * Gli effetti si disegnano con quattro toni (chiavi 1-4, dal più scuro al più chiaro) e si colorano con i toni
 * dell'elemento: una forma sola serve a più mosse (l'anello a terra è polvere, fuoco, gelo o fulmine).
 * Le forme sono generate con un caso pseudo-casuale a seme fisso: gli sprite sono sempre uguali.
 */

/** Toni di ogni colorazione degli effetti, dal più scuro al più chiaro (ognuno da una rampa della palette). */
const EFFECT_TONES = {
  dust: [PALETTE.stoneShadow, PALETTE.stone, PALETTE.stoneLight, PALETTE.stonePale],
  fire: [PALETTE.ember, PALETTE.flame, PALETTE.orange, PALETTE.yellow],
  frost: [PALETTE.blue, PALETTE.lightBlue, PALETTE.cyan, PALETTE.iceWhite],
  shock: [PALETTE.gold, PALETTE.goldLight, PALETTE.yellow, PALETTE.cream],
  arcane: [PALETTE.violet, PALETTE.amethyst, PALETTE.lilac, PALETTE.lavender],
  poison: [PALETTE.pine, PALETTE.green, PALETTE.lightGreen, PALETTE.paleGreen],
  holy: [PALETTE.goldLight, PALETTE.yellow, PALETTE.cream, PALETTE.white],
  blood: [PALETTE.wine, PALETTE.purple, PALETTE.red, PALETTE.orange],
} as const;

type EffectTone = keyof typeof EFFECT_TONES;

function toneColors(tone: EffectTone): Record<string, string> {
  const [dark, mid, light, bright] = EFFECT_TONES[tone];
  return { "1": dark, "2": mid, "3": light, "4": bright, k: PALETTE.black };
}

/**
 * Colori della lama e delle scie quando la mossa tinge l'arma (chiavi b, v, a, c degli sprite del personaggio):
 * vedi AbilityVisual.weaponTint.
 */
export const WEAPON_TINT_COLORS: Record<ElementId, Readonly<Record<string, string>>> = {
  fire: { b: PALETTE.orange, v: PALETTE.yellow, a: PALETTE.yellow, c: PALETTE.flame },
  frost: { b: PALETTE.lightBlue, v: PALETTE.iceWhite, a: PALETTE.iceWhite, c: PALETTE.cyan },
  shock: { b: PALETTE.goldLight, v: PALETTE.cream, a: PALETTE.cream, c: PALETTE.yellow },
  poison: { b: PALETTE.green, v: PALETTE.paleGreen, a: PALETTE.paleGreen, c: PALETTE.lightGreen },
};

/** Generatore pseudo-casuale a seme fisso (stessa sequenza a ogni avvio). */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function toRows(grid: PixelGrid): string[] {
  return grid.map((row) => row.join(""));
}

/** Cerchio pieno di un tono, con il tono più chiaro in alto a sinistra (luce). */
function fillBlob(grid: PixelGrid, centerX: number, centerY: number, radius: number, base: string, light: string): void {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= radius * radius + radius) {
        const isLit = x + y < -radius / 2;
        setPixel(grid, centerX + x, centerY + y, isLit ? light : base, true);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Anelli a terra (mosse ad area): 96x24, quattro frame che si allargano dal centro
// ---------------------------------------------------------------------------

const RING_WIDTH = 96;
const RING_HEIGHT = 24;
const RING_CENTER = RING_WIDTH / 2;
/** Raggio raggiunto in ogni frame (l'area delle mosse va da 40 px dietro a 52 px davanti). */
const RING_RADII = [14, 28, 40, 46] as const;

type RingStyle = "dust" | "fire" | "frost" | "shock";

/** Polvere: sbuffi rotondi sul fronte dell'onda e una crepa scura per terra. */
function drawDustRing(grid: PixelGrid, frame: number, random: () => number): void {
  const radius = RING_RADII[frame]!;
  const bottom = RING_HEIGHT - 1;
  for (let x = RING_CENTER - radius; x <= RING_CENTER + radius; x++) {
    if (random() < 0.7) setPixel(grid, x, bottom, "1", true);
  }
  for (const side of [-1, 1]) {
    const puffSize = frame === 3 ? 2 : 3 + (frame % 2);
    fillBlob(grid, RING_CENTER + side * radius, bottom - puffSize, puffSize, frame === 3 ? "2" : "3", frame === 3 ? "3" : "4");
    if (radius > 12) fillBlob(grid, RING_CENTER + side * (radius - 9), bottom - 2, 2, "2", "3");
    if (frame >= 1) setPixel(grid, RING_CENTER + side * (radius + 3), bottom - 7 - frame, "2", true);
  }
}

/** Fuoco: lingue di fiamma lungo l'area, più alte vicino al fronte, che si abbassano nell'ultimo frame. */
function drawFireRing(grid: PixelGrid, frame: number, random: () => number): void {
  const radius = RING_RADII[frame]!;
  const fade = frame === 3 ? 0.55 : 1;
  for (let x = RING_CENTER - radius; x <= RING_CENTER + radius; x += 5) {
    const nearFront = 1 - Math.abs(Math.abs(x - RING_CENTER) - radius) / Math.max(radius, 1);
    const height = Math.round((5 + nearFront * 10 + random() * 5) * fade);
    for (let level = 0; level < height; level++) {
      const y = RING_HEIGHT - 1 - level;
      const halfWidth = Math.max(0, Math.round(2 * (1 - level / height)));
      const key = level > height * 0.75 ? "4" : level > height * 0.4 ? "3" : level > 1 ? "2" : "1";
      const flicker = level > height / 2 && random() < 0.5 ? 1 : 0; // la punta della fiamma ondeggia
      for (let dx = -halfWidth; dx <= halfWidth; dx++) setPixel(grid, x + dx + flicker, y, key, false);
    }
    if (random() < 0.5) setPixel(grid, x + 2, RING_HEIGHT - height - 3, "3", true); // scintilla
  }
}

/** Gelo: spuntoni di ghiaccio che spuntano dal suolo, più alti sul fronte; nell'ultimo frame si spezzano. */
function drawFrostRing(grid: PixelGrid, frame: number, random: () => number): void {
  const radius = RING_RADII[frame]!;
  for (let x = RING_CENTER - radius; x <= RING_CENTER + radius; x += 7) {
    const distance = Math.abs(x - RING_CENTER);
    const nearFront = 1 - Math.abs(distance - radius) / Math.max(radius, 1);
    let height = Math.round(6 + nearFront * 12 + random() * 4);
    if (frame === 3) height = Math.round(height / 2);
    const lean = x < RING_CENTER ? -1 : 1;
    for (let level = 0; level < height; level++) {
      const y = RING_HEIGHT - 1 - level;
      // cristallo a punta: largo 5 alla base, 3 a metà, 1 in cima; faccia chiara a sinistra, ombra a destra
      const halfWidth = level < height / 4 ? 2 : level < (height * 2) / 3 ? 1 : 0;
      const shift = level > height * 0.7 ? lean : 0;
      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const key = level === height - 1 ? "4" : dx < 0 ? "4" : dx === 0 ? "3" : dx === halfWidth ? "1" : "2";
        setPixel(grid, x + dx + shift, y, key, true);
      }
    }
    if (frame === 3) {
      setPixel(grid, x + lean * 2, RING_HEIGHT - height - 3, "4", true); // schegge
      setPixel(grid, x - lean, RING_HEIGHT - height - 5, "3", true);
    }
  }
  for (let x = RING_CENTER - radius; x <= RING_CENTER + radius; x++) setPixel(grid, x, RING_HEIGHT - 1, "2", false);
}

/** Fulmine: crepa a zig-zag per terra e scariche verticali sul fronte. */
function drawShockRing(grid: PixelGrid, frame: number, random: () => number): void {
  const radius = RING_RADII[frame]!;
  for (const side of [-1, 1]) {
    let y = RING_HEIGHT - 2;
    for (let step = 0; step <= radius; step++) {
      const x = RING_CENTER + side * step;
      if (step % 4 === 0) y = RING_HEIGHT - 2 - Math.round(random() * 2);
      setPixel(grid, x, y, step > radius - 6 ? "4" : "2", true);
      setPixel(grid, x, y + 1, "1", false);
    }
    if (frame < 3) {
      // scarica verticale sul fronte
      let boltX = RING_CENTER + side * radius;
      for (let y2 = RING_HEIGHT - 2; y2 > RING_HEIGHT - 16 - frame * 2; y2--) {
        if (random() < 0.35) boltX += random() < 0.5 ? -1 : 1;
        setPixel(grid, boltX, y2, "4", true);
        setPixel(grid, boltX + 1, y2, "3", false);
        setPixel(grid, boltX - 1, y2, "2", false);
      }
    }
    for (let spark = 0; spark < 3; spark++) {
      setPixel(grid, RING_CENTER + side * Math.round(random() * radius), RING_HEIGHT - 4 - Math.round(random() * 8), "3", true);
    }
  }
}

const RING_DRAWERS: Record<RingStyle, (grid: PixelGrid, frame: number, random: () => number) => void> = {
  dust: drawDustRing,
  fire: drawFireRing,
  frost: drawFrostRing,
  shock: drawShockRing,
};

function composeRing(style: RingStyle, frame: number): string[] {
  const grid = createGrid(RING_WIDTH, RING_HEIGHT);
  RING_DRAWERS[style](grid, frame, seededRandom(31 + frame * 7));
  return toRows(grid);
}

// ---------------------------------------------------------------------------
// Lampi e sbuffi piccoli
// ---------------------------------------------------------------------------

/** Lampo d'incantesimo 13x13: un punto, poi una stella a otto raggi, poi un anello di scintille. */
function composeCastFlash(frame: number): string[] {
  const size = 13;
  const center = 6;
  const grid = createGrid(size, size);
  if (frame === 0) {
    fillBlob(grid, center, center, 2, "3", "4");
    return toRows(grid);
  }
  if (frame === 1) {
    for (const [dx, dy, length] of [[1, 0, 6], [-1, 0, 6], [0, 1, 6], [0, -1, 6], [1, 1, 3], [-1, 1, 3], [1, -1, 3], [-1, -1, 3]] as const) {
      for (let step = 1; step <= length; step++) setPixel(grid, center + dx * step, center + dy * step, step > length - 2 ? "2" : "3", true);
    }
    fillBlob(grid, center, center, 1, "4", "4");
    return toRows(grid);
  }
  for (let angle = 0; angle < 360; angle += 45) {
    const radians = (angle * Math.PI) / 180;
    setPixel(grid, Math.round(center + Math.cos(radians) * 5), Math.round(center + Math.sin(radians) * 5), "2", true);
  }
  setPixel(grid, center, center, "3", true);
  return toRows(grid);
}

/** Sbuffo di polvere 16x10 (scatti e partenze): si allarga ai lati e si dirada. */
function composeDustPuff(frame: number): string[] {
  const grid = createGrid(16, 10);
  const spread = [2, 4, 6][frame]!;
  const size = [3, 3, 2][frame]!;
  for (const side of [-1, 1]) {
    fillBlob(grid, 8 + side * spread, 9 - size, size, frame === 2 ? "2" : "3", frame === 2 ? "3" : "4");
  }
  if (frame < 2) fillBlob(grid, 8, 9 - size - 1, size - 1, "3", "4");
  return toRows(grid);
}

/** Nube arcana 16x16 (balzo del Mago): un globo, un anello con scintille, scintille sparse. */
function composeArcanePuff(frame: number): string[] {
  const grid = createGrid(16, 16);
  const random = seededRandom(97 + frame);
  if (frame === 0) {
    fillBlob(grid, 8, 8, 4, "2", "3");
    fillBlob(grid, 7, 7, 1, "4", "4");
  } else if (frame === 1) {
    drawSlashArc(grid, 8, 8, 6, 0, 360, "3");
    drawSlashArc(grid, 8, 8, 5, 0, 360, "1");
    for (const [x, y] of [[8, 1], [15, 8], [8, 15], [1, 8]] as const) setPixel(grid, x, y, "4", true);
  } else {
    for (let spark = 0; spark < 9; spark++) setPixel(grid, 1 + Math.round(random() * 14), 1 + Math.round(random() * 14), spark % 3 === 0 ? "4" : "2", true);
  }
  return toRows(grid);
}

/** Fulmine dal cielo 12x56 (martello sacro): saetta a zig-zag, poi più spessa con i rami, poi scintille a terra. */
function composeLightning(frame: number): string[] {
  const width = 12;
  const height = 56;
  const grid = createGrid(width, height);
  const random = seededRandom(53);
  let x = 6;
  const path: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y++) {
    if (y % 5 === 0 && y > 0) x = Math.min(width - 3, Math.max(2, x + (random() < 0.5 ? -2 : 2)));
    path.push({ x, y });
  }
  if (frame < 2) {
    for (const point of path) {
      setPixel(grid, point.x, point.y, "4", true);
      setPixel(grid, point.x + 1, point.y, frame === 1 ? "4" : "3", true);
      setPixel(grid, point.x - 1, point.y, "2", false);
      if (frame === 1) setPixel(grid, point.x + 2, point.y, "2", false);
    }
    if (frame === 1) {
      // due rami
      for (const start of [path[18]!, path[34]!]) {
        for (const point of linePoints(start.x, start.y, start.x + (start.y % 2 === 0 ? 4 : -4), start.y + 6)) setPixel(grid, point.x, point.y, "3", false);
      }
    }
  } else {
    for (let y = 0; y < height; y += 2) setPixel(grid, path[y]!.x, y, "2", true); // la saetta si spegne (a puntini)
  }
  // impatto a terra
  for (const [dx, dy] of [[-4, -1], [-3, -3], [3, -2], [4, -4], [0, -2]] as const) setPixel(grid, 6 + dx, height - 1 + dy - frame, "4", true);
  for (let dx = -5; dx <= 5; dx++) setPixel(grid, 6 + dx, height - 1, Math.abs(dx) < 3 ? "4" : "3", true);
  return toRows(grid);
}

/** Linee di velocità 24x16 dietro chi scatta (rivolte a destra: le linee restano a sinistra). */
function composeSpeedLines(frame: number): string[] {
  const grid = createGrid(24, 16);
  const lines = [
    { y: 2, length: 10, start: 6 },
    { y: 5, length: 16, start: 2 },
    { y: 8, length: 12, start: 8 },
    { y: 11, length: 18, start: 3 },
    { y: 14, length: 9, start: 10 },
  ];
  lines.forEach((line, lineIndex) => {
    const shift = frame * 3;
    const length = Math.max(3, line.length - frame * 4);
    for (let step = 0; step < length; step++) {
      const x = line.start + shift + step;
      setPixel(grid, x, line.y, step > length - 3 ? "4" : lineIndex % 2 === 0 ? "3" : "2", true);
    }
  });
  return toRows(grid);
}

/** Mezzaluna di un fendente 30x30 (fuoco o sangue): mezza, piena e spessa, poi solo la coda con le braci. */
function composeCrescent(frame: number, radius: number): string[] {
  const size = 30;
  const center = 15;
  const grid = createGrid(size, size);
  const ranges = [
    [-75, -5],
    [-75, 75],
    [5, 75],
  ] as const;
  const [start, end] = ranges[frame]!;
  const centerX = center - radius / 2; // l'arco sporge in avanti
  drawSlashArc(grid, centerX, center, radius, start, end, "4");
  drawSlashArc(grid, centerX, center, radius - 1, start, end, "3");
  drawSlashArc(grid, centerX, center, radius - 2, start, end, frame === 1 ? "3" : "2");
  drawSlashArc(grid, centerX, center, radius - 3, start, end, "2");
  if (frame === 1) drawSlashArc(grid, centerX, center, radius + 1, -40, 40, "2");
  if (frame === 2) {
    const random = seededRandom(71);
    for (let ember = 0; ember < 6; ember++) setPixel(grid, Math.round(centerX + radius + random() * 4), 4 + Math.round(random() * 22), ember % 2 === 0 ? "4" : "3", true);
  }
  return toRows(grid);
}

/** Aura del colpo di sangue 24x34: un contorno tremolante intorno al corpo, con fiammelle che salgono. */
function composeBloodAura(frame: number): string[] {
  const width = 24;
  const height = 34;
  const grid = createGrid(width, height);
  const random = seededRandom(13 + frame * 5);
  for (let angle = 0; angle < 360; angle += 3) {
    const radians = (angle * Math.PI) / 180;
    const wobble = random() < 0.3 ? 1 : 0;
    const x = Math.round(12 + Math.cos(radians) * (10 + wobble));
    const y = Math.round(17 + Math.sin(radians) * (15 + wobble));
    setPixel(grid, x, y, (angle + frame * 12) % 24 < 12 ? "3" : "2", true);
    // alone interno a retino: un pixel sì e uno no, alternato tra i due frame
    const innerX = Math.round(12 + Math.cos(radians) * 9);
    const innerY = Math.round(17 + Math.sin(radians) * 14);
    if ((innerX + innerY + frame) % 2 === 0) setPixel(grid, innerX, innerY, "1", false);
  }
  for (let flame = 0; flame < 4; flame++) {
    const x = 4 + Math.round(random() * 16);
    const top = 2 + Math.round(random() * 6) + frame * 2;
    setPixel(grid, x, top, "4", true);
    setPixel(grid, x, top + 1, "3", true);
  }
  return toRows(grid);
}

// ---------------------------------------------------------------------------
// Barriere delle guardie (8x28): ovale di luce davanti al personaggio
// ---------------------------------------------------------------------------

/**
 * Barriera: un ovale stretto con il bordo chiaro. pattern "hex" = trama a celle (Mago), "cross" = croce al centro
 * (Paladino). Il secondo frame sposta la trama: la barriera sembra vibrare.
 */
function composeBarrier(pattern: "hex" | "cross", frame: number): string[] {
  const width = 8;
  const height = 28;
  const grid = createGrid(width, height);
  const centerX = 3.5;
  const centerY = 13.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - centerX) / 3.6;
      const ny = (y - centerY) / 13.6;
      const distance = nx * nx + ny * ny;
      if (distance > 1) continue;
      if (distance > 0.62) {
        setPixel(grid, x, y, x < centerX ? "4" : "3", true);
      } else if (pattern === "hex") {
        const row = (y + frame * 2) % 6;
        const isLine = row === 0 || ((row < 3 ? x + 1 : x) % 4 === 0);
        setPixel(grid, x, y, isLine ? "3" : (x + y) % 2 === 0 ? "2" : "1", true);
      } else {
        const isCross = (x === 3 || x === 4) ? y > 7 && y < 21 : y === 11 || y === 12;
        setPixel(grid, x, y, isCross ? "4" : (x + y + frame) % 2 === 0 ? "2" : "1", true);
      }
    }
  }
  return toRows(grid);
}

// ---------------------------------------------------------------------------
// Icone 8x8 delle mosse (HUD): disegnate a mano; i pixel vuoti lasciano vedere il fondo del riquadro
// ---------------------------------------------------------------------------

const ICON_COLORS: Record<string, string> = {
  k: PALETTE.black,
  w: PALETTE.white,
  s: PALETTE.lightGray,
  g: PALETTE.gray,
  R: PALETTE.red,
  O: PALETTE.orange,
  Y: PALETTE.yellow,
  F: PALETTE.flame,
  W: PALETTE.wine,
  C: PALETTE.cyan,
  L: PALETTE.lightBlue,
  B: PALETTE.blue,
  I: PALETTE.iceWhite,
  G: PALETTE.green,
  H: PALETTE.lightGreen,
  A: PALETTE.amethyst,
  M: PALETTE.lilac,
  N: PALETTE.lavender,
  y: PALETTE.goldLight,
  e: PALETTE.earth,
  l: PALETTE.woodLight,
};

/** Freccia in diagonale con la punta dell'elemento (head) e l'impennaggio (tail). */
function arrowIcon(head: string, tail: string): string[] {
  return [
    `.....${head}${head}${head}`,
    `......${head}${head}`,
    `.....l.${head}`,
    "....l...",
    "...l....",
    `${tail}${tail}l.....`,
    `${tail}${tail}......`,
    "........",
  ];
}

const ABILITY_ICONS: Record<AbilityId, string[]> = {
  shockwave: ["...ss...", "..swws..", "...gg...", "...gg...", "s..gg..s", ".s.gg.s.", "kkkkkkkk", "eeeeeeee"],
  lunge: ["........", "ss......", "...y....", "s.eywwws", "...y....", "ss......", "........", "........"],
  shieldBash: ["kkkkk..Y", "kBLBk.Y.", "kLyLk.YY", "kByBk..Y", "kBBBk.Y.", ".kBk..Y.", "..k.....", "........"],
  flameBlade: ["...Y....", "..YwO...", "..OwF...", ".FOwOF..", "..FwF...", "..yyy...", "...e....", "...e...."],
  backstepShot: ["......s.", "Gllllsss", "......s.", "........", "..s..s..", ".s..s...", "..s..s..", "........"],
  poisonArrow: arrowIcon("H", "G"),
  frostArrow: arrowIcon("C", "L"),
  fireArrow: arrowIcon("O", "F"),
  furiousCharge: ["R..R....", ".R..R...", "..R..R..", "...R..R.", "..R..R..", ".R..R...", "R..R....", "........"],
  hotAxe: ["...OOO..", "..OYYOO.", "..OYlOO.", "...OlO..", "....l...", "....l...", "...l....", "...l...."],
  earthquake: ["Y..Y..Y.", ".Y.Y.Y..", "........", "eeekeeee", "lllkklll", "llllkkll", "lllllkll", "eeeeeeee"],
  bloodStrike: ["...R....", "...R....", "..RRR...", ".RRORR..", ".RROORR.", ".RRRRRR.", "..WRRW..", "...WW..."],
  shieldGuard: ["kkkkkkk.", "kBLyLBk.", "kLyyyLk.", "kBLyLBk.", "kBByBBk.", ".kBBBk..", "..kBk...", "...k...."],
  holyHammer: ["ggggg..Y", "gswwg.Y.", "ggggg.YY", "..l....Y", "..l...Y.", "..l.....", "..l.....", "..e....."],
  consecration: ["...Y....", "..YYY...", "...Y....", "...Y....", "O.....O.", "OF.O.FO.", "FOFOFOFO", "FFFFFFFF"],
  frozenJudgement: ["...C....", ".C.C.C..", "..CIC...", "CCIwICC.", "..CIC...", ".C.C.C..", "...C....", "........"],
  firebolt: ["........", ".....OO.", "...FOYYO", ".FOOYwYO", "F.FOYYYO", "...FOOO.", ".....F..", "........"],
  frostNova: ["..CCCC..", ".C....C.", "C..LL..C", "C.LIIL.C", "C.LIIL.C", "C..LL..C", ".C....C.", "..CCCC.."],
  arcaneLeap: ["...N....", "..M.M..N", ".M.M....", "M.M.....", ".M.M....", "..M.M..N", "...N....", "........"],
  arcaneBarrier: ["..AAAA..", ".AMNNMA.", "AMN..NMA", "AMN..NMA", "AMN..NMA", ".AMNNMA.", "..AAAA..", "........"],
};

/** Dimensione delle icone delle mosse (dentro il riquadro 10x10 dell'HUD). */
export const ABILITY_ICON_SIZE = 8;

// ---------------------------------------------------------------------------
// Registrazione
// ---------------------------------------------------------------------------

/** Forma e colorazione di ogni effetto (un frame per indice). */
const EFFECT_SOURCES: Record<AbilityEffectId, { compose: (frame: number) => string[]; tone: EffectTone }> = {
  dustRing: { compose: (frame) => composeRing("dust", frame), tone: "dust" },
  fireRing: { compose: (frame) => composeRing("fire", frame), tone: "fire" },
  frostRing: { compose: (frame) => composeRing("frost", frame), tone: "frost" },
  shockRing: { compose: (frame) => composeRing("shock", frame), tone: "shock" },
  castFire: { compose: composeCastFlash, tone: "fire" },
  castFrost: { compose: composeCastFlash, tone: "frost" },
  castArcane: { compose: composeCastFlash, tone: "arcane" },
  castPoison: { compose: composeCastFlash, tone: "poison" },
  castShock: { compose: composeCastFlash, tone: "shock" },
  castHoly: { compose: composeCastFlash, tone: "holy" },
  dustPuff: { compose: composeDustPuff, tone: "dust" },
  arcanePuff: { compose: composeArcanePuff, tone: "arcane" },
  lightning: { compose: composeLightning, tone: "holy" },
  speedLines: { compose: composeSpeedLines, tone: "dust" },
  flameSlash: { compose: (frame) => composeCrescent(frame, 12), tone: "fire" },
  bloodAura: { compose: composeBloodAura, tone: "blood" },
  bloodSlash: { compose: (frame) => composeCrescent(frame, 13), tone: "blood" },
};

/** Registra effetti, barriere e icone delle mosse. */
export function registerAbilitySprites(spriteManager: SpriteManager): void {
  for (const [effectId, definition] of Object.entries(ABILITY_EFFECT_CONFIG) as Array<[AbilityEffectId, (typeof ABILITY_EFFECT_CONFIG)[AbilityEffectId]]>) {
    const source = EFFECT_SOURCES[effectId];
    definition.frameIds.forEach((frameId, frameIndex) => {
      spriteManager.registerSprite(frameId, source.compose(frameIndex), toneColors(source.tone));
    });
  }
  for (const frame of [0, 1]) {
    spriteManager.registerSprite(`effectBarrierArcane${frame + 1}`, composeBarrier("hex", frame), toneColors("arcane"));
    spriteManager.registerSprite(`effectBarrierHoly${frame + 1}`, composeBarrier("cross", frame), {
      "1": PALETTE.blue,
      "2": PALETTE.lightBlue,
      "3": PALETTE.cyan,
      "4": PALETTE.white,
    });
  }
  for (const [abilityId, rows] of Object.entries(ABILITY_ICONS) as Array<[AbilityId, string[]]>) {
    spriteManager.registerSprite(ABILITY_VISUAL_CONFIG[abilityId].iconSpriteId, rows, ICON_COLORS);
  }
}
