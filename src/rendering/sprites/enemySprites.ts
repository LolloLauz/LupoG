import { PALETTE } from "../../config/gameConfig";
import { ENEMY_CONFIG } from "../../config/enemyConfig";
import type { SpriteManager } from "../SpriteManager";
import { BODY_ROWS as KNIGHT_BODY_ROWS } from "./knightSprites";
import {
  LEGS_FALL,
  LEGS_PASSING,
  LEGS_STAND,
  LEGS_STRIDE,
  createGrid,
  drawSlashArc,
  drawSword,
  setPixel,
  stampRows,
  type BladeKeys,
} from "./spriteTools";

/**
 * Sprite dei nemici. Tutti i nemici umanoidi usano lo stesso schema del
 * cavaliere: corpo (12 colonne) + gambe (7 righe), sprite largo 16 pixel
 * (più largo nei frame di attacco, per l'arma). Ogni nemico ha il proprio
 * corpo e la propria tavolozza di colori.
 * Il soldato è una variante cromatica del cavaliere senza pennacchio,
 * come si usava nei giochi a 8 bit.
 */

const SKELETON_BODY_ROWS: string[] = [
  "............",
  "....kkkkk...",
  "...kwwwwwk..",
  "..kwwwwwwwk.",
  "..kwkwwkwwk.",
  "..kwwwwwwwk.",
  "...kwkkkwk..",
  "....kkkkk...",
  ".....kwk....",
  "...kkwwwkk..",
  "..kwkwkwkwk.",
  "...kwwwwwk..",
  "..kwkwkwkwk.",
  "...kwwwwwk..",
  "....kwwwk...",
  "...kkgggkk..",
  "....kgggk...",
];

const GOBLIN_BODY_ROWS: string[] = [
  ".k........k.",
  ".kk.kkkk.kk.",
  "..kknnnnkk..",
  "..knynnynk..",
  "..knnnnnnk..",
  "...kwnnwk...",
  "..kkoooookk.",
  ".knnoooonnk.",
  "..kkoooookk.",
];

/** Soldato = corpo del cavaliere senza le due righe del pennacchio. */
const SOLDIER_BODY_ROWS: string[] = KNIGHT_BODY_ROWS.map((row, rowIndex) =>
  rowIndex < 2 ? ".".repeat(row.length) : row
);

interface HumanoidSpec {
  idPrefix: "skeleton" | "goblin" | "soldier";
  bodyRows: string[];
  colors: Record<string, string>;
  bladeKeys: BladeKeys;
  /** Posizione dell'impugnatura nello sprite. */
  handX: number;
  handY: number;
}

const SPECS: HumanoidSpec[] = [
  {
    idPrefix: "skeleton",
    bodyRows: SKELETON_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      w: PALETTE.white,
      g: PALETTE.lightGray,
      s: PALETTE.lightGray,
      o: PALETTE.orange,
      y: PALETTE.yellow,
    },
    bladeKeys: { grip: "o", blade: "s", edge: "w", guard: "y" },
    handX: 12,
    handY: 11,
  },
  {
    idPrefix: "goblin",
    bodyRows: GOBLIN_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      n: PALETTE.green,
      g: PALETTE.darkGreen,
      y: PALETTE.yellow,
      w: PALETTE.white,
      o: PALETTE.orange,
      s: PALETTE.lightGray,
    },
    bladeKeys: { grip: "o", blade: "s", edge: "w", guard: "o" },
    handX: 12,
    handY: 8,
  },
  {
    idPrefix: "soldier",
    bodyRows: SOLDIER_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      s: PALETTE.gray,
      g: PALETTE.navy,
      w: PALETTE.lightGray,
      r: PALETTE.purple,
      y: PALETTE.orange,
      d: PALETTE.black,
    },
    bladeKeys: { grip: "y", blade: "w", edge: "w", guard: "y" },
    handX: 12,
    handY: 12,
  },
];

const SPRITE_BODY_WIDTH = 16;
/** Colonna in cui finisce l'hitbox nello sprite (il corpo parte da x = -2 rispetto all'hitbox). */
const HITBOX_FRONT_COLUMN = 14;

/** Corpo + gambe allargati a 16 colonne; bodyDrop abbassa la parte superiore. */
function composeRows(bodyRows: string[], legRows: string[], bodyDrop: number): string[] {
  const pad = (row: string): string => row.padEnd(SPRITE_BODY_WIDTH, ".");
  const upperRows = bodyRows.map(pad);
  const emptyRow = ".".repeat(SPRITE_BODY_WIDTH);
  const shifted =
    bodyDrop > 0
      ? [...Array<string>(bodyDrop).fill(emptyRow), ...upperRows.slice(0, upperRows.length - bodyDrop)]
      : upperRows;
  return [...shifted, ...legRows.map(pad)];
}

/** Mucchio a terra: l'immagine in piedi compressa a un terzo dell'altezza, appoggiata al suolo. */
function collapseRows(standingRows: string[]): string[] {
  const sampled = standingRows.filter((_, rowIndex) => rowIndex % 3 === 2);
  const emptyRow = ".".repeat(standingRows[0]!.length);
  return [...Array<string>(standingRows.length - sampled.length).fill(emptyRow), ...sampled];
}

function composeAttackFrame(
  spec: HumanoidSpec,
  spriteWidth: number,
  tipX: number,
  tipYOffset: number,
  bodyDrop: number,
  withArc: boolean
): string[] {
  const legRows = LEGS_STAND;
  const bodyRows = composeRows(spec.bodyRows, legRows, bodyDrop);
  const grid = createGrid(spriteWidth, bodyRows.length);
  stampRows(grid, bodyRows);
  const handY = spec.handY + bodyDrop;
  const tipY = Math.max(0, Math.min(bodyRows.length - 1, handY + tipYOffset));
  if (withArc) {
    drawSlashArc(grid, spec.handX, handY, tipX - spec.handX, -70, -5);
  }
  drawSword(grid, spec.handX, handY, tipX, tipY, spec.bladeKeys);
  return grid.map((row) => row.join(""));
}

function composeHurtFrame(spec: HumanoidSpec): string[] {
  const rows = composeRows(spec.bodyRows, LEGS_FALL, 1);
  const grid = createGrid(SPRITE_BODY_WIDTH, rows.length);
  stampRows(grid, rows);
  drawSword(grid, spec.handX, spec.handY + 1, spec.handX + 3, spec.handY + 10, spec.bladeKeys);
  for (const [x, y] of [[1, 0], [0, 2], [3, 0]] as const) {
    setPixel(grid, x, y, "y" in spec.colors ? "y" : "w", true);
  }
  return grid.map((row) => row.join(""));
}

function registerHumanoid(spriteManager: SpriteManager, spec: HumanoidSpec): void {
  const definition = ENEMY_CONFIG[spec.idPrefix];
  const attackSpriteWidth = SPRITE_BODY_WIDTH + definition.attackRange + 4;
  const tipX = Math.min(attackSpriteWidth - 1, HITBOX_FRONT_COLUMN + definition.attackRange);
  const standing = composeRows(spec.bodyRows, LEGS_STAND, 0);
  const mirroredStride = LEGS_STRIDE.map((row) => [...row].reverse().join(""));
  const prefix = spec.idPrefix;
  const frames: Record<string, string[]> = {
    [`${prefix}Idle1`]: standing,
    [`${prefix}Idle2`]: composeRows(spec.bodyRows, LEGS_STAND, 1),
    [`${prefix}Walk1`]: composeRows(spec.bodyRows, LEGS_STRIDE, 1),
    [`${prefix}Walk2`]: composeRows(spec.bodyRows, LEGS_PASSING, 0),
    [`${prefix}Walk3`]: composeRows(spec.bodyRows, mirroredStride, 1),
    [`${prefix}AttackA`]: composeAttackFrame(spec, attackSpriteWidth, spec.handX + 3, -11, 1, false),
    [`${prefix}AttackB`]: composeAttackFrame(spec, attackSpriteWidth, tipX, -1, 0, true),
    [`${prefix}AttackC`]: composeAttackFrame(spec, attackSpriteWidth, spec.handX + 9, 9, 0, false),
    [`${prefix}Hurt`]: composeHurtFrame(spec),
    [`${prefix}Heap`]: collapseRows(standing),
  };
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, spec.colors);
  }
}

/** Registra gli sprite di tutti i nemici. */
export function registerEnemySprites(spriteManager: SpriteManager): void {
  SPECS.forEach((spec) => registerHumanoid(spriteManager, spec));
}
