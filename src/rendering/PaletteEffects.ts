import { PALETTE_RAMPS } from "../config/paletteConfig";

/**
 * Effetti di colore tipici dei giochi a 16 bit, come funzioni pure (senza canvas):
 * - retino ordinato (dithering) per sfumare due colori senza creare colori nuovi;
 * - ombreggiatura spostandosi lungo una rampa;
 * - ciclo dei colori (palette cycling) per torce, acqua e lava.
 * Nessuna di queste funzioni produce colori fuori dalla palette.
 */

/**
 * Matrice di Bayer 4x4: l'ordine in cui si "accendono" i pixel del retino.
 * Con livello n (0-16) sono accesi i pixel con valore < n: 0 = nessuno, 8 = scacchiera, 16 = tutti.
 */
export const BAYER_MATRIX_4X4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Numero di livelli del retino (oltre allo zero). */
export const DITHER_LEVELS = 16;

/**
 * Indica se, nel retino di livello "level" (0-16), il pixel (x, y) usa il secondo colore.
 * Il motivo è ancorato all'origine dello schermo: due aree vicine con lo stesso livello si
 * raccordano senza cuciture.
 */
export function isDitherPixelOn(x: number, y: number, level: number): boolean {
  const row = BAYER_MATRIX_4X4[((y % 4) + 4) % 4]!;
  return row[((x % 4) + 4) % 4]! < level;
}

/** Riduce un livello qualsiasi a un intero tra 0 e 16. */
export function clampDitherLevel(level: number): number {
  return Math.max(0, Math.min(DITHER_LEVELS, Math.round(level)));
}

/**
 * Colori di una tessera 4x4 del retino: "colorA" dove il pixel è spento, "colorB" dove è acceso.
 * Restituisce 4 righe da 4 colori.
 */
export function buildDitherTile(colorA: string, colorB: string, level: number): string[][] {
  const clampedLevel = clampDitherLevel(level);
  return BAYER_MATRIX_4X4.map((row, rowIndex) =>
    row.map((_, columnIndex) => (isDitherPixelOn(columnIndex, rowIndex, clampedLevel) ? colorB : colorA))
  );
}

/** Una fascia orizzontale di un gradiente: righe da "top" (incluso) per "height" righe. */
export interface GradientBand {
  top: number;
  height: number;
  colorA: string;
  colorB: string;
  /** Livello del retino (0 = solo colorA). */
  level: number;
}

/**
 * Divide un gradiente verticale in fasce a colore pieno raccordate da fasce a retino,
 * come i cieli dei giochi a 16 bit. "steps" è il numero di gradini di retino tra due colori
 * (es. 4 → livelli 0, 4, 8, 12). Le fasce adiacenti identiche vengono unite.
 */
export function computeGradientBands(top: number, height: number, colors: readonly string[], steps = 4): GradientBand[] {
  const roundedTop = Math.round(top);
  const roundedHeight = Math.round(height);
  if (colors.length === 0 || roundedHeight <= 0) {
    return [];
  }
  if (colors.length === 1) {
    return [{ top: roundedTop, height: roundedHeight, colorA: colors[0]!, colorB: colors[0]!, level: 0 }];
  }
  const safeSteps = Math.max(1, Math.round(steps));
  const segmentCount = colors.length - 1;
  const bands: GradientBand[] = [];
  for (let rowOffset = 0; rowOffset < roundedHeight; rowOffset++) {
    const position = (rowOffset / roundedHeight) * segmentCount;
    const segmentIndex = Math.min(segmentCount - 1, Math.floor(position));
    const fraction = position - segmentIndex;
    const level = Math.floor(fraction * safeSteps) * (DITHER_LEVELS / safeSteps);
    const colorA = colors[segmentIndex]!;
    const colorB = colors[segmentIndex + 1]!;
    const previous = bands[bands.length - 1];
    if (previous !== undefined && previous.colorA === colorA && previous.colorB === colorB && previous.level === level) {
      previous.height += 1;
    } else {
      bands.push({ top: roundedTop + rowOffset, height: 1, colorA, colorB, level });
    }
  }
  return bands;
}

/**
 * Sposta un colore lungo la sua rampa: steps negativi = più scuro, positivi = più chiaro.
 * Si ferma agli estremi della rampa. Se il colore non è in nessuna rampa viene restituito invariato.
 * Se un colore è in più rampe si usa la prima in cui compare (ordine di PALETTE_RAMPS).
 */
export function shadeColor(color: string, steps: number): string {
  for (const ramp of Object.values(PALETTE_RAMPS) as readonly (readonly string[])[]) {
    const index = ramp.indexOf(color);
    if (index !== -1) {
      return ramp[Math.max(0, Math.min(ramp.length - 1, index + Math.round(steps)))]!;
    }
  }
  return color;
}

export type ColorCycleMode = "loop" | "pingPong";

/**
 * Ciclo dei colori: restituisce il colore della rampa da mostrare all'istante "timeSeconds".
 * "offset" sfasa elementi diversi (es. torce vicine che non tremolano insieme).
 * "loop" ricomincia dal primo colore; "pingPong" torna indietro (0,1,2,1,0,...).
 */
export function cycleRampColor(
  ramp: readonly string[],
  timeSeconds: number,
  stepsPerSecond: number,
  offset = 0,
  mode: ColorCycleMode = "loop"
): string {
  if (ramp.length === 0) {
    throw new Error("cycleRampColor: rampa vuota");
  }
  if (ramp.length === 1) {
    return ramp[0]!;
  }
  const step = Math.floor(timeSeconds * stepsPerSecond) + Math.round(offset);
  if (mode === "loop") {
    return ramp[((step % ramp.length) + ramp.length) % ramp.length]!;
  }
  const period = (ramp.length - 1) * 2;
  const positionInPeriod = ((step % period) + period) % period;
  return ramp[positionInPeriod < ramp.length ? positionInPeriod : period - positionInPeriod]!;
}

/**
 * Spostamento orizzontale (in pixel interi) della riga "rowY" per l'effetto di ondulazione
 * (acqua, calore, magia): un'onda sinusoidale che scorre nel tempo.
 */
export function computeLineWaveOffset(rowY: number, amplitude: number, wavelength: number, phase: number): number {
  if (wavelength <= 0) {
    return 0;
  }
  return Math.round(amplitude * Math.sin((rowY / wavelength) * Math.PI * 2 + phase));
}
