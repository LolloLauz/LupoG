import { PALETTE } from "../../config/gameConfig";
import { BOSS_CATALOG } from "../../config/enemyConfig";
import type { BossDefinition } from "../../types/EntityTypes";
import type { SpriteManager } from "../SpriteManager";
import { createGrid, drawSlashArc, drawSword, mirrorRows, stampRows, type BladeKeys } from "./spriteTools";

/**
 * Sprite dei boss in stile 16 bit, a piena risoluzione (36x41 pixel, rivolti a destra).
 * Tutti i boss condividono la stessa forma (elmo cornuto, spallacci, mantello, spadone):
 * cambiano i colori (BOSS_SPRITE_STYLES) e le statistiche.
 * L'hitbox (24x40) inizia alla colonna BOSS_ANCHOR_X; le corna sporgono 1 pixel sopra.
 */
/**
 * Colori di ogni boss (chiave = id in BOSS_CATALOG). Lettere usate dalla forma:
 * k contorno, n ombra profonda dell'armatura, d armatura, s luci dell'armatura, w corna e lama,
 * r dettagli, e bagliore degli occhi, y impugnatura e finiture, c mantello (ombra), p mantello (luce).
 */
export const BOSS_SPRITE_STYLES: Record<string, Record<string, string>> = {
  blackKnight: {
    k: PALETTE.black,
    n: PALETTE.deepNavy,
    d: PALETTE.navy,
    s: PALETTE.blue,
    w: PALETTE.lightGray,
    r: PALETTE.red,
    e: PALETTE.orange,
    y: PALETTE.goldLight,
    c: PALETTE.wine,
    p: PALETTE.purple,
  },
};

const BLADE_KEYS: BladeKeys = { grip: "y", blade: "w", edge: "w", guard: "r" };

/**
 * Parte superiore: corna, elmo, spallacci, busto, braccio (davanti) e mantello (dietro), 31 righe.
 * Le gambe iniziano alla riga LEGS_TOP: le ultime righe del mantello scendono accanto alle gambe.
 */
const UPPER_ROWS: string[] = [
  "...........kk..........kk...........",
  "..........kwk..........kwk..........",
  "..........kwsk........kswk..........",
  "...........kwsk......kswk...........",
  "...........kkwskkkkkkswkk...........",
  "............kdsssssssddk............",
  "...........kdssddddddddnk...........",
  "...........kdsdkkkkkkkkkk...........",
  "...........kdsdkreeerreek...........",
  "...........kdsddkkkkkkkdk...........",
  "...........kndsddddddddnk...........",
  "............kndddsdddddk............",
  "......kkkkkkkknnnnnnnnkkkkkkk.......",
  ".....kcpkwsdddkkkkkkkkdddswsk.......",
  "....kccpkssdddsdrrrrddddsddsdk......",
  "....kcpckkdddsddrrddsdddkkddsk......",
  "...kcpcpk.kndssddddssdnk.kdssk......",
  "...kcpcpk.kndsdddssdddnk.kdsk.......",
  "..kccpcpk.kndddddddddddk.kdsk.......",
  "..kcpccpk.knddyyyyyyddnk.kwsdk......",
  "..kcpccpk.knnddddddddnnk.kkkkk......",
  ".kccpccpk..knndddddnnk..............",
  ".kcpccpk..kndsdkkdsdnk..............",
  ".kcpcccpk.kndsdk.kdsdnk.............",
  "kccpccpk..knddk..kddnk..............",
  "kcpccpk...kkkk...kkkk...............",
  "kcpcccpk............................",
  "kccpccpk............................",
  "kcpccpk.............................",
  "kkcpcpk.............................",
  ".kkkkk..............................",
];

/** Gambe (36 colonne x 15 righe). */
const LEGS_STAND: string[] = [
  "..........kndsk...kndsk.............",
  "..........kndsk...kndsk.............",
  "..........kndsk...kndsk.............",
  "..........kkkkk...kkkkk.............",
  "..........kdssk...kdssk.............",
  "..........kndsk...kndsk.............",
  "..........kndsk...kndsk.............",
  "..........kndsk...kndsk.............",
  "..........kndsk...kndsk.............",
  "..........kndsk...kndsk.............",
  ".........kkndsk..kkndsk.............",
  ".........kndssk..kndssk.............",
  "........knnddssk.knnddssk...........",
  "........knnnddsk.knnnddsk...........",
  "........kkkkkkkk.kkkkkkkk...........",
];

const LEGS_STRIDE: string[] = [
  "..........kndsk...kndsk.............",
  ".........kndsk.....kndsk............",
  ".........kndsk.....kndsk............",
  "........kkkkk.......kkkkk...........",
  "........kdssk.......kdssk...........",
  ".......kndsk.........kndsk..........",
  ".......kndsk.........kndsk..........",
  "......kndsk...........kndsk.........",
  "......kndsk...........kndsk.........",
  ".....kndsk.............kndsk........",
  ".....kndsk.............kndssk.......",
  "....kkndssk............kkndssk......",
  "...knnddssk...........knnddssk......",
  "...knnnddsk...........knnnddsk......",
  "...kkkkkkkk...........kkkkkkkk......",
];

const LEGS_PASSING: string[] = [
  "............kndssk..................",
  "............kndssk..................",
  "............kndssk..................",
  "............kkkkkk..................",
  "............kdsssk..................",
  "............kndssk..................",
  "............kndssk..................",
  "............kndssk..................",
  "............kndssk..................",
  "............kndssk..................",
  "...........kkndssk..................",
  "...........kndsssk..................",
  "..........knnddsssk.................",
  "..........knnnddssk.................",
  "..........kkkkkkkkk.................",
];

/** Tutti i boss hanno hitbox 24x40; lo sprite base è 36x41 (le corna sporgono di 1 pixel, il mantello dietro). */
const BODY_WIDTH = 24;
const BODY_HEIGHT = 40;
const SPRITE_WIDTH = 36;
const SPRITE_HEIGHT = 41;
/** Riga in cui iniziano le gambe. */
const LEGS_TOP = 26;
/** Colonna in cui inizia l'hitbox del boss dentro lo sprite. */
const BOSS_ANCHOR_X = 6;
/** Mano che impugna lo spadone. */
const HAND_X = 27;
const HAND_Y = 19;

/** Corpo completo; bodyDrop abbassa la parte superiore (respiro, passo). */
function composeBody(legRows: string[], bodyDrop: number, width = SPRITE_WIDTH): string[] {
  const grid = createGrid(width, SPRITE_HEIGHT);
  stampRows(grid, legRows, 0, LEGS_TOP);
  stampRows(grid, UPPER_ROWS, 0, bodyDrop);
  return grid.map((row) => row.join(""));
}

interface BossPose {
  tipX: number;
  tipY: number;
  handX?: number;
  handY?: number;
  bodyShiftX?: number;
  arcs?: Array<{ radius: number; startDegrees: number; endDegrees: number }>;
  legs?: string[];
}

/** Sprite con spadone: corpo a sinistra, arma e scia a destra. */
function composeWithSword(spriteWidth: number, pose: BossPose, bodyDrop = 0): string[] {
  const grid = createGrid(spriteWidth, SPRITE_HEIGHT);
  stampRows(grid, composeBody(pose.legs ?? LEGS_STAND, bodyDrop), pose.bodyShiftX ?? 0, 0);
  const handX = pose.handX ?? HAND_X;
  const handY = (pose.handY ?? HAND_Y) + bodyDrop;
  for (const arc of pose.arcs ?? []) {
    drawSlashArc(grid, handX, handY, arc.radius, arc.startDegrees, arc.endDegrees, "w");
    drawSlashArc(grid, handX, handY, arc.radius - 1, arc.startDegrees, arc.endDegrees, "e");
  }
  // lo spadone del boss è spesso il doppio: due linee affiancate
  drawSword(grid, handX, handY, pose.tipX, pose.tipY, BLADE_KEYS);
  drawSword(grid, handX, handY + 1, pose.tipX, pose.tipY + 1, BLADE_KEYS);
  return grid.map((row) => row.join(""));
}

function collapse(rows: string[]): string[] {
  const sampled = rows.filter((_, rowIndex) => rowIndex % 3 === 2);
  const emptyRow = ".".repeat(rows[0]!.length);
  return [...Array<string>(rows.length - sampled.length).fill(emptyRow), ...sampled];
}

/** Registra gli sprite di un boss con il prefisso del suo id (es. "blackKnightIdle1"). */
function registerBossSpritesFor(spriteManager: SpriteManager, definition: BossDefinition): void {
  const colors = BOSS_SPRITE_STYLES[definition.id];
  if (colors === undefined) {
    throw new Error(`Colori dello sprite mancanti per il boss "${definition.id}": aggiungerli a BOSS_SPRITE_STYLES`);
  }
  if (definition.hitbox.width !== BODY_WIDTH || definition.hitbox.height !== BODY_HEIGHT) {
    throw new Error(`Il boss "${definition.id}" deve avere hitbox ${BODY_WIDTH}x${BODY_HEIGHT} (forma dello sprite)`);
  }
  const prefix = definition.id;
  // la scia arriva dove arriva il colpo: bordo anteriore dell'hitbox + slashRange
  const slashTipX = BOSS_ANCHOR_X + BODY_WIDTH + definition.slashRange;
  const slashWidth = slashTipX + 4;
  const chargeWidth = SPRITE_WIDTH + 24;
  const restingTip = { tipX: HAND_X + 6, tipY: 4 };
  const frames: Record<string, string[]> = {
    [`${prefix}Idle1`]: composeWithSword(SPRITE_WIDTH, restingTip),
    [`${prefix}Idle2`]: composeWithSword(SPRITE_WIDTH, { ...restingTip, tipY: 5 }, 1),
    [`${prefix}Walk1`]: composeWithSword(SPRITE_WIDTH, { ...restingTip, tipY: 5, legs: LEGS_STRIDE }, 1),
    [`${prefix}Walk2`]: composeWithSword(SPRITE_WIDTH, { ...restingTip, legs: LEGS_PASSING }),
    [`${prefix}Walk3`]: composeWithSword(SPRITE_WIDTH, { ...restingTip, tipY: 5, legs: mirrorRows(LEGS_STRIDE) }, 1),
    [`${prefix}SlashA`]: composeWithSword(slashWidth, { tipX: HAND_X - 4, tipY: 0 }, 1),
    [`${prefix}SlashB`]: composeWithSword(slashWidth, {
      tipX: slashTipX,
      tipY: 26,
      arcs: [
        { radius: slashTipX - HAND_X, startDegrees: -30, endDegrees: 32 },
        { radius: slashTipX - HAND_X - 6, startDegrees: -28, endDegrees: 28 },
      ],
    }),
    [`${prefix}SlashC`]: composeWithSword(slashWidth, { tipX: HAND_X + 18, tipY: SPRITE_HEIGHT - 2 }),
    [`${prefix}ChargeWindup`]: composeWithSword(chargeWidth, { tipX: chargeWidth - 4, tipY: HAND_Y - 2 }, 2),
    [`${prefix}ChargeDash`]: composeWithSword(chargeWidth, {
      tipX: chargeWidth - 1,
      tipY: HAND_Y + 3,
      bodyShiftX: 3,
      handX: HAND_X + 3,
      handY: HAND_Y + 2,
      legs: LEGS_STRIDE,
    }),
    [`${prefix}Hurt`]: composeWithSword(SPRITE_WIDTH, { tipX: SPRITE_WIDTH - 2, tipY: SPRITE_HEIGHT - 1 }, 2),
  };
  frames[`${prefix}Heap`] = collapse(composeBody(LEGS_STAND, 0));
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, colors, BOSS_ANCHOR_X);
  }
}

/** Registra gli sprite di tutti i boss del catalogo. */
export function registerBossSprites(spriteManager: SpriteManager): void {
  Object.values(BOSS_CATALOG).forEach((definition) => registerBossSpritesFor(spriteManager, definition));
}
