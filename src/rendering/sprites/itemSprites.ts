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

/** Faretra: astuccio di cuoio con fascia d'oro e due frecce. */
const QUIVER_ROWS = [
  ".w..w...",
  ".cw.cw..",
  "..kkkk..",
  "..kebk..",
  "..kebk..",
  "..kyyk..",
  "..kebk..",
  "..kkkk..",
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

/** Colori dei power-up. */
const POWER_UP_COLORS: Record<string, string> = {
  k: PALETTE.black,
  w: PALETTE.white,
  s: PALETTE.stone,
  S: PALETTE.stoneLight,
  r: PALETTE.red,
  o: PALETTE.orange,
  f: PALETTE.flame,
  y: PALETTE.goldLight,
  c: PALETTE.cream,
  B: PALETTE.blue,
  L: PALETTE.lightBlue,
  N: PALETTE.navy,
  g: PALETTE.green,
  G: PALETTE.lightGreen,
  d: PALETTE.darkGreen,
};

/** Runa della Furia: pietra con una runa rossa incandescente. */
const BERSERK_ROWS = [
  ".kkkkkk.",
  "kSssssSk",
  "ksrssrsk",
  "kssrrssk",
  "kssrrssk",
  "ksrssrsk",
  "kSssssSk",
  ".kkkkkk.",
];

/** Stivali Alati. */
const SPEED_ROWS = [
  ".....ww.",
  "....wwk.",
  ".kkkkwk.",
  ".koook..",
  ".koook..",
  "kkoookk.",
  "koooooyk",
  "kkkkkkkk",
];

/** Scudo Benedetto: scudo blu con croce d'oro. */
const SHIELD_ROWS = [
  "kkkkkkkk",
  "kLLyLLBk",
  "kLByLBNk",
  "kyyyyyNk",
  "kBByBBNk",
  ".kByBNk.",
  "..kBNk..",
  "...kk...",
];

/** Fiamma Eterna. */
const FIRE_ROWS = [
  "...k....",
  "..kok...",
  "..koyk..",
  ".kofyok.",
  ".kfyyfk.",
  "kfyccyfk",
  "kfyyyyfk",
  ".kkkkkk.",
];

/** Erba della Vita: foglia verde con croce bianca. */
const REGENERATION_ROWS = [
  "...kk...",
  "..kgGk..",
  ".kgGwgk.",
  "kgGwwwgk",
  "kgGgwGgk",
  ".kgGGgk.",
  "..kddk..",
  "...kk...",
];

/** Forziere 16x12 (Fase 1): legno con fasce di ferro e serratura d'oro; aperto, il coperchio è sollevato. */
const CHEST_COLORS: Record<string, string> = {
  k: PALETTE.black,
  e: PALETTE.earth,
  l: PALETTE.wood,
  d: PALETTE.slate,
  g: PALETTE.gray,
  n: PALETTE.gold,
  y: PALETTE.goldLight,
};

const CHEST_CLOSED_ROWS = [
  "................",
  "..kkkkkkkkkkkk..",
  ".kllllllllllllk.",
  "kgllldgllgdlllgk",
  "kglllldggdllllgk",
  "kkkkkkkynkkkkkkk",
  "kglllllyylllllgk",
  "kglllllnnlllllgk",
  "kgeeeeeeeeeeeegk",
  "kgllldgllgdlllgk",
  "kgeeeeeeeeeeeegk",
  "kkkkkkkkkkkkkkkk",
];

const CHEST_OPEN_ROWS = [
  "..kkkkkkkkkkkk..",
  ".kllllllllllllk.",
  "kglldglllgdlllgk",
  "kkkkkkkkkkkkkkkk",
  "k..............k",
  "kkkkkkkkkkkkkkkk",
  "kglllllllllllllk",
  "kglllllnnlllllgk",
  "kgeeeeeeeeeeeegk",
  "kgllldgllgdlllgk",
  "kgeeeeeeeeeeeegk",
  "kkkkkkkkkkkkkkkk",
];

export function registerItemSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("chestClosed", CHEST_CLOSED_ROWS, CHEST_COLORS);
  spriteManager.registerSprite("chestOpen", CHEST_OPEN_ROWS, CHEST_COLORS);
  spriteManager.registerSprite("itemBerserk", BERSERK_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemSpeed", SPEED_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemShield", SHIELD_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemFire", FIRE_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemRegeneration", REGENERATION_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemPotion", POTION_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemCoin", COIN_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemGem", GEM_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemQuiver", QUIVER_ROWS, ITEM_COLORS);
}
