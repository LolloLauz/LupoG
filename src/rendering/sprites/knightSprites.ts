import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";
import { createGrid, drawSlashArc, drawSword, setPixel, stampRows, type BladeKeys } from "./spriteTools";

/**
 * Sprite del cavaliere in stile 16 bit (24x30 pixel, rivolto a destra).
 * Ogni frame è composto da: parte superiore (elmo con pennacchio, busto, scudo, braccio: 23 righe)
 * + gambe (7 righe) + spada disegnata a parte dalla mano (HAND_X, HAND_Y).
 * Le pose di camminata, salto e caduta riusano la stessa parte superiore e cambiano solo le gambe.
 *
 * L'hitbox (12x24) occupa le colonne KNIGHT_ANCHOR_X..+11 e le ultime 24 righe: pennacchio ed elmo
 * sporgono sopra l'hitbox, spada e scie davanti (a destra). Vedi SpriteManager.drawSpriteAligned.
 *
 * Colori (luce dall'alto a sinistra): armatura in 4 toni (d, g, s, w), sopravveste rossa (m, r, o),
 * finiture d'oro (n, y), cuoio (e, l), scudo blu (N, B, L).
 */
const KNIGHT_COLORS: Record<string, string> = {
  k: PALETTE.black,
  d: PALETTE.slate,
  g: PALETTE.gray,
  s: PALETTE.lightGray,
  w: PALETTE.white,
  m: PALETTE.purple,
  r: PALETTE.red,
  o: PALETTE.orange,
  n: PALETTE.gold,
  y: PALETTE.goldLight,
  e: PALETTE.earth,
  l: PALETTE.wood,
  N: PALETTE.navy,
  B: PALETTE.blue,
  L: PALETTE.lightBlue,
  // spada e scie (chiavi proprie, così il power-up del fuoco può ricolorarle senza toccare l'armatura)
  b: PALETTE.lightGray,
  v: PALETTE.white,
  a: PALETTE.white,
  c: PALETTE.cyan,
};

/** Colori con il power-up del fuoco: lama incandescente e scie di fiamma. */
const KNIGHT_FIRE_COLORS: Record<string, string> = {
  ...KNIGHT_COLORS,
  b: PALETTE.orange,
  v: PALETTE.yellow,
  a: PALETTE.yellow,
  c: PALETTE.flame,
};

/** Suffisso degli sprite del cavaliere con il power-up del fuoco (es. "knightIdle1Fire"). */
export const KNIGHT_FIRE_SUFFIX = "Fire";

/** Larghezza dei frame normali; i frame d'attacco sono più larghi (la spada sporge a destra). */
const KNIGHT_WIDTH = 24;
const KNIGHT_HEIGHT = 30;
/** Colonna in cui inizia l'hitbox del cavaliere dentro lo sprite. */
export const KNIGHT_ANCHOR_X = 7;

/** Parte superiore: elmo con pennacchio, busto con sopravveste, scudo (dietro) e braccio armato (davanti). */
export const BODY_ROWS: string[] = [
  "...........kkk..........",
  ".........kkrook.........",
  ".......kkrrrrrok........",
  "......kmrrrkkkkkk.......",
  ".....kmmrkkwwsssgk......",
  ".....kmmkwwsssssggk.....",
  "......kkkwssssssggk.....",
  "........kssssskkkkk.....",
  "........kgsssgkddgk.....",
  "........kgsssssssdk.....",
  "........kdgsssssgdk.....",
  ".........kdggggggk......",
  "......kkkkkkkkkkkkk.....",
  ".....kwsskyyyyykwssk....",
  "....kwssgkrrrorkssggk...",
  "...kNBBBkkrorrrrkkgggk..",
  "..kBLLBBBkrorrrrrkdgdk..",
  "..kBLyBBBkrrrrrrrkkssk..",
  "..kByyyBBkmrrrrrmkksgk..",
  "..kBLyBBNkkyyyyykkkwk...",
  "..kBBBBNNkeennneek.kk...",
  "...kBBNNkkmrrrrrmk......",
  "....kNNk.kmrrmrrmk......",
];

/** Pose delle gambe (24 colonne x 7 righe). */
export const KNIGHT_LEGS_STAND: string[] = [
  ".........kgsk.kgsk......",
  ".........kgsk.kgssk.....",
  ".........kdgk.kdgsk.....",
  ".........kdgk.kdgsk.....",
  "........kdggk.kdggk.....",
  "........keelk.keellk....",
  "........kkkkk.kkkkkk....",
];

export const KNIGHT_LEGS_STRIDE: string[] = [
  ".........kgsk.kgsk......",
  "........kgsk...kgsk.....",
  ".......kdgk.....kdgk....",
  "......kdgk......kdgsk...",
  ".....kdggk.......kdgsk..",
  ".....keelk.......keellk.",
  ".....kkkkk.......kkkkkk.",
];

export const KNIGHT_LEGS_PASSING: string[] = [
  "..........kgssk.........",
  "..........kgssk.........",
  "..........kdgsk.........",
  "..........kdgsk.........",
  ".........kdggsk.........",
  ".........keeellk........",
  ".........kkkkkkk........",
];

export const KNIGHT_LEGS_JUMP: string[] = [
  ".........kgsk.kgsk......",
  "........kgsk..kdgsk.....",
  "........kdgk...kdgsk....",
  "........keek....keelk...",
  "........kkkk....kkkkk...",
  "........................",
  "........................",
];

export const KNIGHT_LEGS_FALL: string[] = [
  ".........kgsk.kgsk......",
  "........kgsk...kgsk.....",
  ".......kdgk.....kdgk....",
  "......kdgk......kdgk....",
  "......keek.......keek...",
  "......kkkk.......kkkk...",
  "........................",
];

/** Gambe piegate (schivata): 4 righe. */
const KNIGHT_LEGS_CROUCH: string[] = [
  ".......kgssk.kgssk......",
  "......kdgggkkdgggsk.....",
  ".....keeelk..keeellk....",
  ".....kkkkkk..kkkkkkk....",
];

/** Compatibilità con i nomi della versione 1.0 (usati anche negli esempi del manuale). */
const LEGS_STAND = KNIGHT_LEGS_STAND;
const LEGS_STRIDE = KNIGHT_LEGS_STRIDE;
const LEGS_PASSING = KNIGHT_LEGS_PASSING;
const LEGS_JUMP = KNIGHT_LEGS_JUMP;
const LEGS_FALL = KNIGHT_LEGS_FALL;

/** Spada a riposo: tenuta dritta davanti, la mano è su HAND_X/HAND_Y. */
const SWORD_KEYS: BladeKeys = { grip: "e", blade: "b", edge: "v", guard: "y" };
/** Posizione dell'impugnatura rispetto allo sprite (la mano destra, davanti). */
const HAND_X = 19;
const HAND_Y = 18;
const ATTACK_SPRITE_WIDTH = 44;

/**
 * Unisce parte superiore e gambe. bodyDrop = pixel di cui abbassare la parte superiore
 * (respiro, passo). withSword = spada a riposo in mano.
 */
function composeKnightFrame(legRows: string[], bodyDrop: number, withSword = true): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  stampRows(grid, legRows, 0, BODY_ROWS.length);
  stampRows(grid, BODY_ROWS, 0, bodyDrop);
  if (withSword) {
    drawSword(grid, HAND_X, HAND_Y + bodyDrop, HAND_X + 1, 2 + bodyDrop, SWORD_KEYS);
  }
  return grid.map((row) => row.join(""));
}

interface SwordPose {
  tipX: number;
  tipY: number;
  arcs?: Array<{ radius: number; startDegrees: number; endDegrees: number }>;
  bodyDrop?: number;
}

/** Frame di attacco largo 44 pixel: corpo a sinistra, spada e scia (bianca e azzurra) a destra. */
function composeAttackFrame(pose: SwordPose): string[] {
  const bodyDrop = pose.bodyDrop ?? 0;
  const grid = createGrid(ATTACK_SPRITE_WIDTH, KNIGHT_HEIGHT);
  stampRows(grid, composeKnightFrame(LEGS_STAND, bodyDrop, false));
  for (const arc of pose.arcs ?? []) {
    drawSlashArc(grid, HAND_X, HAND_Y + bodyDrop, arc.radius, arc.startDegrees, arc.endDegrees, "a");
    drawSlashArc(grid, HAND_X, HAND_Y + bodyDrop, arc.radius - 1, arc.startDegrees, arc.endDegrees, "c");
  }
  drawSword(grid, HAND_X, HAND_Y + bodyDrop, pose.tipX, pose.tipY, SWORD_KEYS);
  return grid.map((row) => row.join(""));
}

/** Cavaliere colpito: indietreggia con la spada abbassata e stelline d'impatto. */
function composeHurtFrame(): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  stampRows(grid, LEGS_FALL, 0, BODY_ROWS.length);
  stampRows(grid, BODY_ROWS, -1, 1);
  drawSword(grid, HAND_X - 1, HAND_Y + 1, KNIGHT_WIDTH - 1, KNIGHT_HEIGHT - 3, SWORD_KEYS);
  for (const [x, y] of [[3, 2], [2, 4], [4, 1], [6, 0], [1, 7], [20, 3], [22, 5]] as const) {
    setPixel(grid, x, y, "y", true);
  }
  return grid.map((row) => row.join(""));
}

/** Schivata: cavaliere accovacciato dietro lo scudo. shiftX sposta il corpo a destra. */
function composeDodgeFrame(shiftX: number): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  const crouchDrop = KNIGHT_HEIGHT - KNIGHT_LEGS_CROUCH.length - BODY_ROWS.length + 3;
  stampRows(grid, KNIGHT_LEGS_CROUCH, shiftX, KNIGHT_HEIGHT - KNIGHT_LEGS_CROUCH.length);
  stampRows(grid, BODY_ROWS.slice(0, BODY_ROWS.length - 3), shiftX, crouchDrop);
  return grid.map((row) => row.join(""));
}

/** Cavaliere a terra (32x30): ultimo frame dell'animazione di morte. */
function composeLyingFrame(): string[] {
  const lyingRows = [
    "...kkkk...........kkk.........",
    "..kwssgk..kkkkkkkkrrok.kk.....",
    ".kwsssgkkkrrrorrrrrrrrkkgk....",
    ".ksskddkkyyyyyyyyykkkgssgkk...",
    ".kgssgdkkmrrrrrrrmkkdgssgdkk..",
    "..kdggk.kkkkkkkkkk..kkkkkkkk..",
  ];
  const width = lyingRows[0]!.length;
  return [...Array<string>(KNIGHT_HEIGHT - lyingRows.length).fill(".".repeat(width)), ...lyingRows];
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
    knightAttack1A: composeAttackFrame({ tipX: 21, tipY: 1, bodyDrop: 1 }),
    knightAttack1B: composeAttackFrame({ tipX: 40, tipY: 15, arcs: [{ radius: 20, startDegrees: -80, endDegrees: -5 }] }),
    knightAttack1C: composeAttackFrame({ tipX: 33, tipY: 28, arcs: [{ radius: 20, startDegrees: 5, endDegrees: 50 }] }),
    // attacco leggero 2: dal basso verso l'alto
    knightAttack2A: composeAttackFrame({ tipX: 30, tipY: 28, bodyDrop: 1 }),
    knightAttack2B: composeAttackFrame({ tipX: 40, tipY: 18, arcs: [{ radius: 20, startDegrees: 75, endDegrees: 5 }] }),
    knightAttack2C: composeAttackFrame({ tipX: 33, tipY: 4, arcs: [{ radius: 20, startDegrees: -5, endDegrees: -55 }] }),
    // attacco leggero 3 (finale): fendente in quattro tempi
    knightAttack3A: composeAttackFrame({ tipX: 22, tipY: 0, bodyDrop: 1 }),
    knightAttack3B: composeAttackFrame({ tipX: 36, tipY: 5, arcs: [{ radius: 22, startDegrees: -85, endDegrees: -30 }] }),
    knightAttack3C: composeAttackFrame({ tipX: 41, tipY: 17, arcs: [{ radius: 22, startDegrees: -30, endDegrees: 20 }] }),
    knightAttack3D: composeAttackFrame({ tipX: 35, tipY: 29, arcs: [{ radius: 22, startDegrees: 20, endDegrees: 80 }] }),
    // attacco pesante: carica lunga e fendente ampio
    knightHeavyA: composeAttackFrame({ tipX: 16, tipY: 1, bodyDrop: 1 }),
    knightHeavyB: composeAttackFrame({ tipX: 21, tipY: 0 }),
    knightHeavyC: composeAttackFrame({
      tipX: 42,
      tipY: 12,
      arcs: [
        { radius: 23, startDegrees: -88, endDegrees: -10 },
        { radius: 18, startDegrees: -80, endDegrees: -20 },
      ],
    }),
    knightHeavyD: composeAttackFrame({
      tipX: 38,
      tipY: 29,
      arcs: [
        { radius: 23, startDegrees: 10, endDegrees: 80 },
        { radius: 18, startDegrees: 20, endDegrees: 75 },
      ],
    }),
    knightHurt: composeHurtFrame(),
    knightDodge1: composeDodgeFrame(0),
    knightDodge2: composeDodgeFrame(1),
    knightDeadFall: composeKnightFrame(LEGS_FALL, 2, false),
    knightDeadLie: composeLyingFrame(),
  };
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, KNIGHT_COLORS, KNIGHT_ANCHOR_X);
    spriteManager.registerSprite(`${spriteId}${KNIGHT_FIRE_SUFFIX}`, pixelRows, KNIGHT_FIRE_COLORS, KNIGHT_ANCHOR_X);
  }
}
