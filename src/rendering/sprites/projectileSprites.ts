import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";

/**
 * Sprite dei proiettili (rivolti a destra; lo sprite si specchia per chi va a sinistra).
 * Lo sprite si disegna centrato sull'hitbox del proiettile (vedi ProjectileSystem.render).
 */
const PROJECTILE_COLORS: Record<string, string> = {
  k: PALETTE.black,
  w: PALETTE.white,
  // freccia: piume rosse, asta di legno, punta di ferro
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

export function registerProjectileSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("projectileArrow", ARROW_ROWS, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileBolt1", BOLT_ROWS_1, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileBolt2", BOLT_ROWS_2, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileFire1", FIRE_ROWS_1, PROJECTILE_COLORS);
  spriteManager.registerSprite("projectileFire2", FIRE_ROWS_2, PROJECTILE_COLORS);
}
