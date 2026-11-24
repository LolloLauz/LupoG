import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";
import { addOutline } from "./spriteTools";

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
  // elementi (Fase 7)
  i: PALETTE.iceWhite,
  C: PALETTE.cyan,
  Y: PALETTE.yellow,
  p: PALETTE.purple,
};

/** Fiala del Veleno: boccetta verde con il teschio-bolla. */
const POISON_ROWS = [
  "...kk...",
  "..kssk..",
  "...kk...",
  "..kGGk..",
  ".kGgGgk.",
  "kgGwgGdk",
  ".kgggdk.",
  "..kkkk..",
];

/** Cristallo del Gelo: cristallo di ghiaccio a punte. */
const FROST_ROWS = [
  "...kk...",
  "..kiCk..",
  ".kiwiCk.",
  "kiwiCLBk",
  ".kiCLBk.",
  "..kCBk..",
  "...kNk..",
  "....k...",
];

/** Runa del Fulmine: pietra con un fulmine giallo. */
const SHOCK_ROWS = [
  ".kkkkkk.",
  "kSSSYYSk",
  "kSSYYSsk",
  "kSYYYYsk",
  "kSsYYSsk",
  "kSYYSssk",
  "kSYSsssk",
  ".kkkkkk.",
];

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

/**
 * Icone 16x16 delle armature (piano dell'equipaggiamento, E2): elmo, corazza, stivali. Le chiavi 1-4 sono i toni del
 * materiale dal più scuro al più chiaro (luce in alto a sinistra): si disegnano sempre con la variante di colore del
 * pezzo (getItemIconVariant), qui registrate con i toni dell'acciaio. Il contorno nero si aggiunge con addOutline.
 */
const ARMOR_ICON_COLORS: Record<string, string> = {
  k: PALETTE.black,
  "1": PALETTE.slate,
  "2": PALETTE.gray,
  "3": PALETTE.lightGray,
  "4": PALETTE.white,
};

const ARMOR_ICON_HELMET_ROWS: string[] = [
  "................",
  "................",
  "......4443......",
  ".....443332.....",
  "....44333322....",
  "....43333322....",
  "...4333333322...",
  "...4322222221...",
  "...432.....21...",
  "...4322.2.221...",
  "...43222.2221...",
  "...4322222221...",
  "....32222211....",
  ".....221111.....",
  "................",
  "................",
];

const ARMOR_ICON_CHEST_ROWS: string[] = [
  "................",
  "................",
  "..443......221..",
  ".44333.44.32221.",
  ".43332333332221.",
  ".43323333332221.",
  "..4233333333321.",
  "...4333333332...",
  "...4333333322...",
  "...4333333322...",
  "...4333333322...",
  "...4332222222...",
  "...4322222221...",
  "....22222111....",
  "................",
  "................",
];

const ARMOR_ICON_BOOTS_ROWS: string[] = [
  "................",
  "................",
  "...443...443....",
  "...432...432....",
  "...432...432....",
  "...432...432....",
  "...4321..4321...",
  "...4321..4321...",
  "...43221.43221..",
  "..443322143322..",
  "..4332221433222.",
  "..3222211322221.",
  "..1111111111111.",
  "................",
  "................",
  "................",
];

export function registerItemSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("chestClosed", CHEST_CLOSED_ROWS, CHEST_COLORS);
  spriteManager.registerSprite("chestOpen", CHEST_OPEN_ROWS, CHEST_COLORS);
  spriteManager.registerSprite("itemBerserk", BERSERK_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemSpeed", SPEED_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemShield", SHIELD_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemFire", FIRE_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemRegeneration", REGENERATION_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemPoison", POISON_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemFrost", FROST_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemShock", SHOCK_ROWS, POWER_UP_COLORS);
  spriteManager.registerSprite("itemPotion", POTION_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemCoin", COIN_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemGem", GEM_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("itemQuiver", QUIVER_ROWS, ITEM_COLORS);
  spriteManager.registerSprite("armorIconHelmet", addOutline(ARMOR_ICON_HELMET_ROWS, "k"), ARMOR_ICON_COLORS);
  spriteManager.registerSprite("armorIconChest", addOutline(ARMOR_ICON_CHEST_ROWS, "k"), ARMOR_ICON_COLORS);
  spriteManager.registerSprite("armorIconBoots", addOutline(ARMOR_ICON_BOOTS_ROWS, "k"), ARMOR_ICON_COLORS);
}
