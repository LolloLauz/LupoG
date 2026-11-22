/**
 * Font bitmap in stile 16 bit, disegnato pixel per pixel (nessuna sfocatura).
 * Ogni glifo è una lista di righe da 5 caratteri: '#' = pixel acceso.
 * - Le maiuscole, le cifre e i simboli occupano le righe 0-6 (come il font 5x7 della versione 1.0).
 * - Le minuscole hanno l'altezza x sulle righe 2-6 e i discendenti (g, j, p, q, y) sulle righe 7-8.
 * - La spaziatura è proporzionale (una "i" è più stretta di una "m"); le cifre restano larghe
 *   uguali, così i numeri (punteggio, contatori) non cambiano larghezza mentre cambiano valore.
 * - Le maiuscole accentate diventano la lettera semplice; le minuscole accentate italiane hanno un glifo.
 */
const EMPTY_ROW = ".....";

const GLYPH_ROWS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
  ".": [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, ".##..", ".##.."],
  ",": [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, ".##..", "..#..", ".#..."],
  ":": [EMPTY_ROW, ".##..", ".##..", EMPTY_ROW, ".##..", ".##..", EMPTY_ROW],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", EMPTY_ROW, "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", EMPTY_ROW, "..#.."],
  "-": [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, "#####", EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
  "+": [EMPTY_ROW, "..#..", "..#..", "#####", "..#..", "..#..", EMPTY_ROW],
  "=": [EMPTY_ROW, EMPTY_ROW, "#####", EMPTY_ROW, "#####", EMPTY_ROW, EMPTY_ROW],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "'": ["..#..", "..#..", ".#...", EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
  "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
  "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
  _: [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, "#####"],
  ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  "^": ["..#..", ".###.", "#.#.#", "..#..", "..#..", "..#..", EMPTY_ROW],
  // freccia giù (tasto ↓ nella schermata dei controlli)
  "↓": ["..#..", "..#..", "..#..", "#.#.#", ".###.", "..#..", EMPTY_ROW],
  "*": [EMPTY_ROW, "#.#.#", ".###.", "#####", ".###.", "#.#.#", EMPTY_ROW],
  // --- minuscole (righe 0-1 ascendenti, 2-6 altezza x, 7-8 discendenti) ---
  a: [EMPTY_ROW, EMPTY_ROW, ".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [EMPTY_ROW, EMPTY_ROW, ".###.", "#....", "#....", "#....", ".###."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [EMPTY_ROW, EMPTY_ROW, ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#...", "####.", ".#...", ".#...", ".#...", ".#..."],
  g: [EMPTY_ROW, EMPTY_ROW, ".####", "#...#", "#...#", "#...#", ".####", "....#", ".###."],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: ["#....", EMPTY_ROW, "#....", "#....", "#....", "#....", "#...."],
  j: ["..#..", EMPTY_ROW, "..#..", "..#..", "..#..", "..#..", "..#..", "#.#..", ".#..."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: ["#....", "#....", "#....", "#....", "#....", "#....", ".#..."],
  m: [EMPTY_ROW, EMPTY_ROW, "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  n: [EMPTY_ROW, EMPTY_ROW, "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [EMPTY_ROW, EMPTY_ROW, ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [EMPTY_ROW, EMPTY_ROW, "####.", "#...#", "#...#", "#...#", "####.", "#....", "#...."],
  q: [EMPTY_ROW, EMPTY_ROW, ".####", "#...#", "#...#", "#...#", ".####", "....#", "....#"],
  r: [EMPTY_ROW, EMPTY_ROW, "#.##.", "##...", "#....", "#....", "#...."],
  s: [EMPTY_ROW, EMPTY_ROW, ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#...", "..##."],
  u: [EMPTY_ROW, EMPTY_ROW, "#...#", "#...#", "#...#", "#...#", ".####"],
  v: [EMPTY_ROW, EMPTY_ROW, "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [EMPTY_ROW, EMPTY_ROW, "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  x: [EMPTY_ROW, EMPTY_ROW, "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [EMPTY_ROW, EMPTY_ROW, "#...#", "#...#", "#...#", "#...#", ".####", "....#", ".###."],
  z: [EMPTY_ROW, EMPTY_ROW, "#####", "...#.", "..#..", ".#...", "#####"],
  // --- minuscole accentate (italiano) ---
  "à": [".#...", "..#..", ".###.", "....#", ".####", "#...#", ".####"],
  "è": [".#...", "..#..", ".###.", "#...#", "#####", "#....", ".###."],
  "é": ["...#.", "..#..", ".###.", "#...#", "#####", "#....", ".###."],
  "ì": ["#....", ".#...", ".#...", ".#...", ".#...", ".#...", ".#..."],
  "ò": [".#...", "..#..", ".###.", "#...#", "#...#", "#...#", ".###."],
  "ù": [".#...", "..#..", "#...#", "#...#", "#...#", "#...#", ".####"],
  // --- altri simboli ---
  ";": [EMPTY_ROW, ".##..", ".##..", EMPTY_ROW, ".##..", "..#..", ".#..."],
  '"': [".#.#.", ".#.#.", EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW, EMPTY_ROW],
};

/** Larghezza massima di un glifo (colonne). */
export const GLYPH_WIDTH = 5;
/** Altezza di un glifo, discendenti compresi (righe). */
export const GLYPH_HEIGHT = 9;
/** Altezza delle maiuscole (righe 0-6): è l'altezza "visiva" di una riga di testo maiuscolo. */
export const GLYPH_CAP_HEIGHT = 7;
/** Spazio tra due glifi (pixel). */
export const GLYPH_SPACING = 1;
/** Larghezza dello spazio (pixel, senza la spaziatura). */
const SPACE_WIDTH = 3;
/** Caratteri che occupano sempre tutta la larghezza (i numeri non devono "ballare"). */
const MONOSPACED_CHARACTERS = "0123456789";

const ACCENT_REPLACEMENTS: Record<string, string> = {
  "À": "A", "Á": "A", "È": "E", "É": "E", "Ì": "I", "Í": "I",
  "Ò": "O", "Ó": "O", "Ù": "U", "Ú": "U", "á": "à", "í": "ì", "ó": "ò", "ú": "ù",
};

/** Glifo pronto da disegnare: righe complete (GLYPH_HEIGHT) e colonne effettivamente occupate. */
export interface GlyphMetrics {
  rows: string[];
  /** Prima colonna occupata (le colonne a sinistra vuote non si disegnano). */
  firstColumn: number;
  /** Larghezza disegnata in pixel (senza spaziatura). */
  width: number;
}

function computeGlyphMetrics(character: string, rows: string[]): GlyphMetrics {
  const paddedRows = Array.from({ length: GLYPH_HEIGHT }, (_, rowIndex) => rows[rowIndex] ?? EMPTY_ROW);
  if (character === " ") {
    return { rows: paddedRows, firstColumn: 0, width: SPACE_WIDTH };
  }
  if (MONOSPACED_CHARACTERS.includes(character)) {
    return { rows: paddedRows, firstColumn: 0, width: GLYPH_WIDTH };
  }
  let firstColumn = GLYPH_WIDTH;
  let lastColumn = -1;
  for (const row of paddedRows) {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) {
      if (row[columnIndex] === "#") {
        firstColumn = Math.min(firstColumn, columnIndex);
        lastColumn = Math.max(lastColumn, columnIndex);
      }
    }
  }
  if (lastColumn === -1) {
    return { rows: paddedRows, firstColumn: 0, width: SPACE_WIDTH };
  }
  return { rows: paddedRows, firstColumn, width: lastColumn - firstColumn + 1 };
}

const GLYPH_METRICS = new Map<string, GlyphMetrics>(
  Object.entries(GLYPH_ROWS).map(([character, rows]) => [character, computeGlyphMetrics(character, rows)])
);

/** Restituisce il glifo di un carattere (con fallback a '?'). */
export function getGlyph(character: string): GlyphMetrics {
  const replaced = ACCENT_REPLACEMENTS[character] ?? character;
  return GLYPH_METRICS.get(replaced) ?? GLYPH_METRICS.get(replaced.toUpperCase()) ?? GLYPH_METRICS.get("?")!;
}

/** Righe complete (GLYPH_HEIGHT) del glifo di un carattere. */
export function getGlyphRows(character: string): string[] {
  return getGlyph(character).rows;
}

/** Larghezza in pixel di un testo disegnato con la scala indicata. */
export function measureTextWidth(text: string, scale: number): number {
  if (text.length === 0) {
    return 0;
  }
  let width = 0;
  for (const character of text) {
    width += getGlyph(character).width + GLYPH_SPACING;
  }
  return (width - GLYPH_SPACING) * scale;
}
