import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";

/** Sprite 8x8 degli oggetti raccoglibili. */
const ITEM_COLORS: Record<string, string> = {
  k: PALETTE.black,
  w: PALETTE.white,
  r: PALETTE.red,
  y: PALETTE.yellow,
  c: PALETTE.cyan,
  b: PALETTE.blue,
};

const POTION_ROWS = [
  "..kkkk..",
  "...kk...",
  "..kwwk..",
  ".krrrrk.",
  ".krwrrk.",
  ".krrrrk.",
  ".krrrrk.",
  "..kkkk..",
];

const COIN_ROWS = [
  "..kkkk..",
  ".kyyyyk.",
  "kyywwyyk",
  "kywyyyyk",
  "kywyyyyk",
  "kyyyyyyk",
  ".kyyyyk.",
  "..kkkk..",
];

const GEM_ROWS = [
  "..kkkk..",
  ".kwccbck",
  "kwccbbck",
  "kccbbbbk",
  ".kcbbbk.",
  "..kbbk..",
  "...kk...",
  "........",
];

export function registerItemSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("itemPotion", POTION_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemCoin", COIN_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemGem", GEM_ROWS, ITEM_COLORS);
}
