import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";

/**
 * Sprite dei proiettili (rivolti a destra; lo sprite si specchia per chi va a sinistra).
 * Lo sprite si disegna centrato sull'hitbox del proiettile (vedi ProjectileSystem.render).
 */
const PROJECTILE_COLORS: Record<string, string> = {
  k: PALETTE.black,
  w: PALETTE.white,
  // freccia: piume rosse (azzurre per il cavaliere), asta di legno, punta di ferro
  b: PALETTE.blue,
  B: PALETTE.lightBlue,
  r: PALETTE.red,
  m: PALETTE.purple,
  l: PALETTE.woodLight,
  e: PALETTE.wood,
  s: PALETTE.lightGray,
  g: PALETTE.gray,
  // dardo magico
  d: PALETTE.violet,
  a: PALETTE.amethyst,
  i: PALETTE.lilac,
  v: PALETTE.lavender,
  // palla di fuoco
  E: PALETTE.ember,
  f: PALETTE.flame,
  o: PALETTE.orange,
  y: PALETTE.yellow,
  c: PALETTE.cream,
};

const ARROW_ROWS = [
  "rm..........",
  "mrleeeeeelsw",
  "rm.......g..",
];

const BOLT_ROWS_1 = [
  "...a...",
  "..aid..",
  ".aivia.",
  "aivwvia",
  ".aivia.",
  "..dia..",
  "...a...",
];

const BOLT_ROWS_2 = [
  ".v...a.",
  "..did..",
  ".divid.",
  "divwvid",
  ".divid.",
  "..did..",
  ".a...v.",
];

const FIRE_ROWS_1 = [
  "...E.fff..",
  ".E.ffoooff",
  "EffooyyyoE",
  "Efoyyccyof",
  "EffooyyyoE",
  ".E.ffoooff",
  "...E.fff..",
];

const FIRE_ROWS_2 = [
  "..E..fff..",
  "E.ffooooff",
  ".EfooyyyoE",
  "Effoycccyf",
  ".EfooyyyoE",
  "E.ffooooff",
  "..E..fff..",
];

// --- proiettili del giocatore (Fase 2) ---
/** Freccia del cavaliere: piume azzurre, per distinguerla da quelle degli arcieri. */
const PLAYER_ARROW_ROWS = [
  "Bb..........",
  "bBleeeeeelsw",
  "Bb.......g..",
];

/** Dardo di balestra: corto e spesso, punta larga. */
const CROSSBOW_BOLT_ROWS = [
  ".........gs.",
  "rrleeeeeelsw",
  "rrleeeeeelsw",
  ".........gs.",
];

/** Coltello da lancio che ruota (4 frame, 6x6). */
/** Accetta dei predoni (Fase 8): manico di legno e lama di ferro, che ruota in quattro pose. */
const HATCHET_ROWS = [
  ["...ss...", "..swsk..", "..sgsk..", "...ek...", "...ek...", "...ek...", "...ek...", "........"],
  ["........", "......s.", ".....sws", "....esgk", "...ek...", "..ek....", ".ek.....", "........"],
  ["........", "........", "........", "eeeeesss", "kkkkkgws", ".....gsk", "........", "........"],
  ["........", ".ek.....", "..ek....", "...ek...", "....esgk", ".....sws", "......s.", "........"],
];

const KNIFE_ROWS = [
  ["......", "..e...", "..e...", "..gs..", "..sw..", "...w.."],
  ["......", ".....w", "....s.", "...g..", ".ee...", "......"],
  ["......", "w.....", ".ws...", "..gs..", "...e..", "...e.."],
  ["......", "......", "..ee..", "...gsw", "......", "......"],
];

/** Giavellotto: asta lunga e punta di ferro. */
const JAVELIN_ROWS = [
  "..............g...",
  "eelllllllllllllssw",
  "..............g...",
];

export function registerProjectileSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("projectilePlayerArrow", PLAYER_ARROW_ROWS, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileCrossbowBolt", CROSSBOW_BOLT_ROWS, PROJECTILE_COLORS);
  KNIFE_ROWS.forEach((rows, frameIndex) => spriteManager.registerSprite(`projectileKnife${frameIndex + 1}`, rows, PROJECTILE_COLORS));
  HATCHET_ROWS.forEach((rows, frameIndex) => spriteManager.registerSprite(`projectileHatchet${frameIndex + 1}`, rows, PROJECTILE_COLORS));
  spriteManager.registerSprite("projectileJavelin", JAVELIN_ROWS, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileArrow", ARROW_ROWS, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileBolt1", BOLT_ROWS_1, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileBolt2", BOLT_ROWS_2, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileFire1", FIRE_ROWS_1, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileFire2", FIRE_ROWS_2, PROJECTILE_COLORS);
}
