import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";

/**
 * Sprite 8x8 degli oggetti raccoglibili, in stile 16 bit: ogni oggetto ha la sua rampa
 * (vetro e liquido rosso, oro, gemma blu) con riflesso in alto a sinistra.
 * La dimensione resta 8x8 perché la raccolta usa ITEM_SIZE (itemConfig.ts).
 */
const ITEM_COLORS: Record<string, string> = {
  k: PALETTE.black,
  w: PALETTE.white,
  // pozione
  m: PALETTE.purple,
  r: PALETTE.red,
  o: PALETTE.orange,
  g: PALETTE.lightGray,
  e: PALETTE.wood,
  // moneta
  b: PALETTE.bronze,
  n: PALETTE.gold,
  y: PALETTE.goldLight,
  v: PALETTE.cream,
  // gemma
  N: PALETTE.navy,
  B: PALETTE.blue,
  L: PALETTE.lightBlue,
  c: PALETTE.cyan,
};

const POTION_ROWS = [
  "...ke...",
  "..kggk..",
  "...kgk..",
  "..kwrrk.",
  ".kwormrk",
  ".krrrrmk",
  ".kmrrmmk",
  "..kkkkk.",
];

const COIN_ROWS = [
  "..kkkk..",
  ".kvyyyk.",
  "kvyynnyk",
  "kyynynbk",
  "kyynynbk",
  "kyyynnbk",
  ".knbbbk.",
  "..kkkk..",
];

const GEM_ROWS = [
  "..kkkk..",
  ".kwcLBNk",
  "kwcLLBNk",
  "kcLLBBNk",
  ".kLBBNk.",
  "..kBNk..",
  "...kk...",
  "........",
];

export function registerItemSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("itemPotion", POTION_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemCoin", COIN_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemGem", GEM_ROWS, ITEM_COLORS);
}
