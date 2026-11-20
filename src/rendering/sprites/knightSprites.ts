import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";
import {
  LEGS_FALL,
  LEGS_JUMP,
  LEGS_PASSING,
  LEGS_STAND,
  LEGS_STRIDE,
  createGrid,
  drawSlashArc,
  drawSword,
  setPixel,
  stampRows,
} from "./spriteTools";

/**
 * Sprite del cavaliere (16x24 pixel, rivolto a destra).
 * Ogni frame è composto da: corpo (12 colonne x 17 righe) + spada (4 colonne)
 * + gambe (12 colonne x 7 righe). Così le pose di camminata/salto riusano
 * la stessa parte superiore e cambia solo la parte inferiore.
 */
const KNIGHT_COLORS: Record<string, string> = {
  k: PALETTE.black,
  s: PALETTE.lightGray,
  g: PALETTE.gray,
  w: PALETTE.white,
  r: PALETTE.red,
  y: PALETTE.yellow,
  d: PALETTE.darkBlue,
};

export const BODY_ROWS: string[] = [
  "......rr....",
  ".....rrrr...",
  "....kkkkkk..",
  "...kswwsssk.",
  "...ksssssssk",
  "...ksdddddsk",
  "...ksssssssk",
  "....kksssskk",
  "...kkgggggkk",
  "..kssssssssk",
  ".kssrrrrrrsk",
  ".ksgrrrrrrgk",
  ".kssrryyrrsk",
  "..kssrrrrsk.",
  "..kyyyyyyyk.",
  "..kggrrrggk.",
  "..kgrrrrrgk.",
];

const SWORD_ROWS: string[] = [
  "....",
  "..w.",
  ".ws.",
  ".ws.",
  ".ws.",
  ".ws.",
  ".ws.",
  ".ws.",
  ".ws.",
  ".ws.",
  "yyyy",
  ".rr.",
  ".rr.",
  ".yy.",
  "....",
  "....",
  "....",
];

/** Unisce corpo, spada e gambe. bodyDrop = pixel di cui abbassare la parte superiore. */
function composeKnightFrame(legRows: string[], bodyDrop: number, withSword = true): string[] {
  const upperRows = BODY_ROWS.map(
    (bodyRow, rowIndex) => bodyRow + (withSword ? SWORD_ROWS[rowIndex]! : "....")
  );
  const emptyRow = ".".repeat(16);
  const shiftedUpperRows =
    bodyDrop > 0
      ? [...Array<string>(bodyDrop).fill(emptyRow), ...upperRows.slice(0, upperRows.length - bodyDrop)]
      : upperRows;
  return [...shiftedUpperRows, ...legRows.map((legRow) => legRow + "....")];
}

/** Posizione dell'impugnatura rispetto allo sprite (vicino alla mano destra). */
const HAND_X = 12;
const HAND_Y = 12;
const ATTACK_SPRITE_WIDTH = 32;

interface SwordPose {
  tipX: number;
  tipY: number;
  arcs?: Array<{ radius: number; startDegrees: number; endDegrees: number }>;
  bodyDrop?: number;
}

/** Frame di attacco largo 32 pixel: corpo a sinistra, spada e scia a destra. */
function composeAttackFrame(pose: SwordPose): string[] {
  const bodyDrop = pose.bodyDrop ?? 0;
  const grid = createGrid(ATTACK_SPRITE_WIDTH, 24);
  stampRows(grid, composeKnightFrame(LEGS_STAND, bodyDrop, false));
  for (const arc of pose.arcs ?? []) {
    drawSlashArc(grid, HAND_X, HAND_Y + bodyDrop, arc.radius, arc.startDegrees, arc.endDegrees);
  }
  drawSword(grid, HAND_X, HAND_Y + bodyDrop, pose.tipX, pose.tipY);
  return grid.map((row) => row.join(""));
}

/** Cavaliere colpito: indietreggia con la spada abbassata e una stella d'impatto. */
function composeHurtFrame(): string[] {
  const grid = createGrid(16, 24);
  stampRows(grid, composeKnightFrame(LEGS_FALL, 1, false));
  drawSword(grid, HAND_X, HAND_Y + 1, 15, 21);
  for (const [x, y] of [[1, 1], [0, 3], [2, 0], [4, 0], [0, 6]] as const) {
    setPixel(grid, x, y, "y", true);
  }
  return grid.map((row) => row.join(""));
}

/** Schivata: cavaliere accovacciato (senza spada in vista). shiftX sposta il corpo a destra. */
function composeDodgeFrame(shiftX: number): string[] {
  const crouchedUpperRows = BODY_ROWS.filter((_, rowIndex) => ![9, 11, 12, 14].includes(rowIndex));
  const rows = [...crouchedUpperRows, ...LEGS_STRIDE.slice(3)];
  const paddedRows = [...Array<string>(24 - rows.length).fill(".".repeat(12)), ...rows];
  return paddedRows.map((row) => ".".repeat(shiftX) + row + ".".repeat(4 - shiftX));
}

/** Cavaliere a terra (24x24): ultimo frame dell'animazione di morte. */
function composeLyingFrame(): string[] {
  const lyingRows = [
    "..kkkk...kkkkkkkk.......",
    ".kssswk.kssssssssk.kkk..",
    ".ksddsk.ksrrrrrrsk.kgk..",
    ".kssssk.kyyyyyyyyk.kgk..",
    "..kkkk..kggggggggkkggk..",
    "........kkkkkkkkkk.kkkk.",
  ];
  return [...Array<string>(24 - lyingRows.length).fill(".".repeat(24)), ...lyingRows];
}

/** Registra tutti gli sprite del cavaliere nello SpriteManager. */
export function registerKnightSprites(spriteManager: SpriteManager): void {
  const frames: Record<string, string[]> = {
    knightIdle1: composeKnightFrame(LEGS_STAND, 0),
    knightIdle2: composeKnightFrame(LEGS_STAND, 1),
    knightWalk1: composeKnightFrame(LEGS_STRIDE, 1),
    knightWalk2: composeKnightFrame(LEGS_PASSING, 0),
    knightWalk3: composeKnightFrame(LEGS_STRIDE.map((row) => [...row].reverse().join("")), 1),
    knightJump: composeKnightFrame(LEGS_JUMP, 0),
    knightFall: composeKnightFrame(LEGS_FALL, 0),
    // attacco leggero 1: dall'alto verso il basso-avanti
    knightAttack1A: composeAttackFrame({ tipX: 15, tipY: 0, bodyDrop: 1 }),
    knightAttack1B: composeAttackFrame({ tipX: 30, tipY: 11, arcs: [{ radius: 17, startDegrees: -75, endDegrees: -5 }] }),
    knightAttack1C: composeAttackFrame({ tipX: 24, tipY: 21, arcs: [{ radius: 17, startDegrees: 5, endDegrees: 50 }] }),
    // attacco leggero 2: dal basso verso l'alto
    knightAttack2A: composeAttackFrame({ tipX: 22, tipY: 20, bodyDrop: 1 }),
    knightAttack2B: composeAttackFrame({ tipX: 30, tipY: 13, arcs: [{ radius: 17, startDegrees: 75, endDegrees: 5 }] }),
    knightAttack2C: composeAttackFrame({ tipX: 24, tipY: 3, arcs: [{ radius: 17, startDegrees: -5, endDegrees: -50 }] }),
    // attacco leggero 3 (finale): fendente in quattro tempi
    knightAttack3A: composeAttackFrame({ tipX: 13, tipY: 0, bodyDrop: 1 }),
    knightAttack3B: composeAttackFrame({ tipX: 27, tipY: 4, arcs: [{ radius: 18, startDegrees: -80, endDegrees: -30 }] }),
    knightAttack3C: composeAttackFrame({ tipX: 30, tipY: 12, arcs: [{ radius: 18, startDegrees: -30, endDegrees: 20 }] }),
    knightAttack3D: composeAttackFrame({ tipX: 26, tipY: 22, arcs: [{ radius: 18, startDegrees: 20, endDegrees: 80 }] }),
    // attacco pesante: carica lunga e fendente ampio
    knightHeavyA: composeAttackFrame({ tipX: 9, tipY: 0, bodyDrop: 1 }),
    knightHeavyB: composeAttackFrame({ tipX: 13, tipY: 0 }),
    knightHeavyC: composeAttackFrame({
      tipX: 30,
      tipY: 9,
      arcs: [
        { radius: 18, startDegrees: -85, endDegrees: -10 },
        { radius: 14, startDegrees: -80, endDegrees: -20 },
      ],
    }),
    knightHeavyD: composeAttackFrame({
      tipX: 28,
      tipY: 22,
      arcs: [
        { radius: 18, startDegrees: 10, endDegrees: 80 },
        { radius: 14, startDegrees: 20, endDegrees: 75 },
      ],
    }),
    knightHurt: composeHurtFrame(),
    knightDodge1: composeDodgeFrame(0),
    knightDodge2: composeDodgeFrame(1),
    knightDeadFall: composeKnightFrame(LEGS_FALL, 2, false),
    knightDeadLie: composeLyingFrame(),
  };
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, KNIGHT_COLORS);
  }
}
