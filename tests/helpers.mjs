/**
 * Strumenti condivisi dai test.
 * I moduli TypeScript del gioco vengono compilati al volo con esbuild (incluso con Vite)
 * in una cartella temporanea e importati in Node: nessuna dipendenza aggiuntiva.
 */
import { buildSync } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = mkdtempSync(join(tmpdir(), "iron-tests-"));
const moduleCache = new Map();

/** Compila e importa un modulo di src/ (es. load("entities/Player")). Il risultato è in cache. */
export async function load(relativePath) {
  if (!moduleCache.has(relativePath)) {
    const outputFile = join(outputDirectory, relativePath.replace(/\W/g, "_") + ".mjs");
    buildSync({
      entryPoints: [join(projectRoot, "src", relativePath + ".ts")],
      bundle: true,
      format: "esm",
      outfile: outputFile,
      logLevel: "error",
    });
    moduleCache.set(relativePath, import(pathToFileURL(outputFile).href));
  }
  return moduleCache.get(relativePath);
}

/** Finto SpriteManager: applica le stesse regole di quello vero (righe uguali, colori definiti). */
export class FakeSpriteManager {
  sprites = new Map();
  registerSprite(spriteId, pixelRows, colorByKey, anchorX = 0) {
    const width = pixelRows[0]?.length ?? 0;
    if (width === 0 || pixelRows.some((row) => row.length !== width)) {
      throw new Error(`Sprite "${spriteId}": righe di lunghezza diversa o vuote`);
    }
    for (const row of pixelRows) {
      for (const key of row) {
        if (key !== "." && colorByKey[key] === undefined) {
          throw new Error(`Sprite "${spriteId}": colore '${key}' non definito`);
        }
      }
    }
    this.sprites.set(spriteId, { width, height: pixelRows.length, rows: pixelRows, colors: colorByKey, anchorX });
  }
  has(spriteId) { return this.sprites.has(spriteId); }
  getSpriteSize(spriteId) { return this.sprites.get(spriteId); }
  getSpriteAnchorX(spriteId) { return this.sprites.get(spriteId).anchorX; }
  drawSprite() {}
  drawSpriteAligned() {}
  drawSpriteSilhouette() {}
}
