import type { PixelPainter } from "../rendering/PixelPainter";
import type { Vector2 } from "../types/GameTypes";

/**
 * Pentagono a pixel degli attributi (Classi Fase 4): un vertice per attributo, dall'alto in senso orario, a distanza dal
 * centro proporzionale al valore (il massimo tocca il bordo). Solo rettangoli di 1 px di altezza: niente antialiasing,
 * i colori restano quelli della palette.
 */

/** Un tratto orizzontale pieno: riga y, da x1 a x2 compresi. */
export interface PixelSpan {
  y: number;
  x1: number;
  x2: number;
}

/** Vertici del poligono: values[i] / maxValue del raggio, il primo in alto, poi in senso orario. */
export function getPentagonVertices(centerX: number, centerY: number, radius: number, values: readonly number[], maxValue: number): Vector2[] {
  const count = values.length;
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    const distance = (radius * Math.max(0, Math.min(maxValue, value))) / maxValue;
    return { x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance };
  });
}

/**
 * Riempimento a righe di un poligono (regola pari-dispari, centro dei pixel): un tratto per ogni coppia di
 * intersezioni di ogni riga. Funzione pura, provata nei test.
 */
export function getPolygonSpans(points: readonly Vector2[]): PixelSpan[] {
  if (points.length < 3) {
    return [];
  }
  const minY = Math.floor(Math.min(...points.map((point) => point.y)));
  const maxY = Math.ceil(Math.max(...points.map((point) => point.y)));
  const spans: PixelSpan[] = [];
  for (let y = minY; y <= maxY; y++) {
    const sampleY = y + 0.5;
    const crossings: number[] = [];
    points.forEach((start, index) => {
      const end = points[(index + 1) % points.length]!;
      if ((start.y <= sampleY && end.y > sampleY) || (end.y <= sampleY && start.y > sampleY)) {
        crossings.push(start.x + ((sampleY - start.y) / (end.y - start.y)) * (end.x - start.x));
      }
    });
    crossings.sort((a, b) => a - b);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      const x1 = Math.round(crossings[index]!);
      const x2 = Math.round(crossings[index + 1]!) - 1;
      if (x2 >= x1) {
        spans.push({ y, x1, x2 });
      }
    }
  }
  return spans;
}

/** Pixel di un segmento (Bresenham), estremi compresi. */
export function getLinePixels(from: Vector2, to: Vector2): Vector2[] {
  let x = Math.round(from.x);
  let y = Math.round(from.y);
  const endX = Math.round(to.x);
  const endY = Math.round(to.y);
  const deltaX = Math.abs(endX - x);
  const deltaY = -Math.abs(endY - y);
  const stepX = x < endX ? 1 : -1;
  const stepY = y < endY ? 1 : -1;
  let error = deltaX + deltaY;
  const pixels: Vector2[] = [];
  for (;;) {
    pixels.push({ x, y });
    if (x === endX && y === endY) {
      return pixels;
    }
    const doubled = 2 * error;
    if (doubled >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubled <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

/** Poligono pieno. */
export function fillPolygon(painter: PixelPainter, points: readonly Vector2[], color: string): void {
  for (const span of getPolygonSpans(points)) {
    painter.fillRect(span.x1, span.y, span.x2 - span.x1 + 1, 1, color);
  }
}

/** Contorno del poligono. */
export function strokePolygon(painter: PixelPainter, points: readonly Vector2[], color: string): void {
  points.forEach((start, index) => {
    drawLine(painter, start, points[(index + 1) % points.length]!, color);
  });
}

/** Segmento di 1 px. */
export function drawLine(painter: PixelPainter, from: Vector2, to: Vector2, color: string): void {
  for (const pixel of getLinePixels(from, to)) {
    painter.fillRect(pixel.x, pixel.y, 1, 1, color);
  }
}
