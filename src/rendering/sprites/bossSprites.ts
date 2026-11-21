import { PALETTE } from "../../config/gameConfig";
import { BOSS_CATALOG } from "../../config/enemyConfig";
import type { BossDefinition } from "../../types/EntityTypes";
import type { SpriteManager } from "../SpriteManager";
import { composeWolf, type WolfPose } from "./creatureTools";
import { addOutline, createGrid, drawSlashArc, drawSword, linePoints, mirrorRows, setPixel, stampRows, type BladeKeys } from "./spriteTools";

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
  swampWitch: {
    k: PALETTE.black,
    h: PALETTE.violetDark,
    H: PALETTE.violet,
    t: PALETTE.bronze,
    y: PALETTE.gold,
    f: PALETTE.moss,
    F: PALETTE.olive,
    e: PALETTE.yellow,
    r: PALETTE.wine,
    c: PALETTE.bogDark,
    p: PALETTE.bog,
    P: PALETTE.moss,
    n: PALETTE.earth,
    s: PALETTE.wood,
    w: PALETTE.woodLight,
    o: PALETTE.lilac,
    O: PALETTE.lavender,
  },
  wolfKing: {
    k: PALETTE.black,
    d: PALETTE.slate,
    m: PALETTE.gray,
    l: PALETTE.stonePale,
    w: PALETTE.white,
    e: PALETTE.red,
    n: PALETTE.earthDark,
    r: PALETTE.wine,
  },
  shadowLord: {
    k: PALETTE.black,
    h: PALETTE.violetDark,
    H: PALETTE.violet,
    t: PALETTE.gold,
    y: PALETTE.goldLight,
    f: PALETTE.black,
    F: PALETTE.violetDark,
    e: PALETTE.flame,
    r: PALETTE.ember,
    c: PALETTE.black,
    p: PALETTE.darkBlue,
    P: PALETTE.slate,
    n: PALETTE.goldLight,
    s: PALETTE.amethyst,
    w: PALETTE.lavender,
    o: PALETTE.flame,
    O: PALETTE.yellow,
  },
};

/**
 * Forma dello sprite di ogni boss (se manca: "knight"). La forma decide la hitbox obbligatoria:
 * knight, witch, sorcerer 24x40 (umanoidi); beast 40x24 (quadrupede).
 */
export type BossSpriteShape = "knight" | "witch" | "sorcerer" | "beast";

export const BOSS_SPRITE_SHAPES: Record<string, BossSpriteShape> = {
  blackKnight: "knight",
  swampWitch: "witch",
  wolfKing: "beast",
  shadowLord: "sorcerer",
};

const SHAPE_HITBOX: Record<BossSpriteShape, { width: number; height: number }> = {
  knight: { width: 24, height: 40 },
  witch: { width: 24, height: 40 },
  sorcerer: { width: 24, height: 40 },
  beast: { width: 40, height: 24 },
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
const SPRITE_WIDTH = 36;
const SPRITE_HEIGHT = 41;
/** Riga in cui iniziano le gambe. */
const LEGS_TOP = 26;
/** Colonna in cui inizia l'hitbox del boss dentro lo sprite. */
const BOSS_ANCHOR_X = 6;
/** Portata usata per disegnare la scia se il boss non ha un attacco corpo a corpo. */
const DEFAULT_SLASH_RANGE = 34;
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

/**
 * Posa dell'incantesimo: come composeWithSword, più un bagliore ("e" e "w") attorno alla punta.
 * isReleased = bagliore che si stacca in avanti (fase attiva).
 */
function composeCastFrame(spriteWidth: number, pose: BossPose, bodyDrop: number, isReleased: boolean): string[] {
  const rows = composeWithSword(spriteWidth, pose, bodyDrop);
  const grid = rows.map((row) => [...row]);
  const glowCenterX = Math.min(spriteWidth - 3, pose.tipX + (isReleased ? 1 : 0));
  const glowCenterY = Math.max(2, pose.tipY + (isReleased ? 0 : 2));
  for (let offsetY = -2; offsetY <= 2; offsetY++) {
    for (let offsetX = -2; offsetX <= 2; offsetX++) {
      const distance = Math.abs(offsetX) + Math.abs(offsetY);
      if (distance > 3) {
        continue;
      }
      const row = grid[glowCenterY + offsetY];
      if (row !== undefined && glowCenterX + offsetX >= 0 && glowCenterX + offsetX < row.length) {
        row[glowCenterX + offsetX] = distance <= 1 ? "w" : "e";
      }
    }
  }
  return grid.map((row) => row.join(""));
}

function collapse(rows: string[]): string[] {
  const sampled = rows.filter((_, rowIndex) => rowIndex % 3 === 2);
  const emptyRow = ".".repeat(rows[0]!.length);
  return [...Array<string>(rows.length - sampled.length).fill(emptyRow), ...sampled];
}

/** Frame della forma "knight" (cavaliere corazzato con spadone). */
function composeKnightFrames(definition: BossDefinition): Record<string, string[]> {
  const prefix = definition.id;
  // la scia arriva dove arriva il colpo: bordo anteriore dell'hitbox + portata del corpo a corpo
  const meleeAttack = definition.attacks.find((attack) => attack.kind === "melee");
  const meleeRange = meleeAttack !== undefined && meleeAttack.kind === "melee" ? meleeAttack.range : DEFAULT_SLASH_RANGE;
  const slashTipX = BOSS_ANCHOR_X + BODY_WIDTH + meleeRange;
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
    // incantesimo (proiettili, evocazione): spada alzata che si carica, poi puntata in avanti
    [`${prefix}CastA`]: composeCastFrame(SPRITE_WIDTH + 4, { tipX: HAND_X + 2, tipY: 0 }, 1, false),
    [`${prefix}CastB`]: composeCastFrame(SPRITE_WIDTH + 8, { tipX: SPRITE_WIDTH + 6, tipY: HAND_Y - 4 }, 0, true),
  };
  frames[`${prefix}Heap`] = collapse(composeBody(LEGS_STAND, 0));
  return frames;
}

/** Registra gli sprite di un boss con il prefisso del suo id (es. "blackKnightIdle1"). */
function registerBossSpritesFor(spriteManager: SpriteManager, definition: BossDefinition): void {
  const colors = BOSS_SPRITE_STYLES[definition.id];
  if (colors === undefined) {
    throw new Error(`Colori dello sprite mancanti per il boss "${definition.id}": aggiungerli a BOSS_SPRITE_STYLES`);
  }
  const shape = BOSS_SPRITE_SHAPES[definition.id] ?? "knight";
  const requiredHitbox = SHAPE_HITBOX[shape];
  if (definition.hitbox.width !== requiredHitbox.width || definition.hitbox.height !== requiredHitbox.height) {
    throw new Error(`Il boss "${definition.id}" (forma ${shape}) deve avere hitbox ${requiredHitbox.width}x${requiredHitbox.height}`);
  }
  let frames: Record<string, string[]>;
  let anchorX: number;
  switch (shape) {
    case "knight":
      frames = composeKnightFrames(definition);
      anchorX = BOSS_ANCHOR_X;
      break;
    case "witch":
    case "sorcerer":
      frames = composeRobedFrames(definition, shape);
      anchorX = ROBED_ANCHOR_X;
      break;
    case "beast":
      frames = composeBeastFrames(definition);
      anchorX = BEAST_ANCHOR_X;
      break;
  }
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, colors, anchorX);
  }
}

// ===========================================================================
// Forme "witch" e "sorcerer": figura con la veste lunga fino a terra, testa propria e arma
// (bastone con sfera per la strega, spada d'ombra per il Signore dell'Ombra)
// ===========================================================================

const ROBED_WIDTH = 36;
const ROBED_HEIGHT = 44;
const ROBED_ANCHOR_X = 6;
const ROBED_CENTER_X = 18;
const ROBED_HAND_X = 27;
const ROBED_HAND_Y = 24;

/** Testa della strega: cappello a punta piegato all'indietro, tesa larga, viso verde con naso lungo. */
const WITCH_HEAD_ROWS: string[] = [
  "...kk...........",
  "..khHk..........",
  "...khHk.........",
  "....khHk........",
  ".....khHHk......",
  ".....khhHHk.....",
  "....khhhHHHk....",
  "...kttyyyyyttk..",
  "kkkhhhhhhhhhhkkk",
  ".kkkkkFFFFFFkk..",
  "....kfFFFeFFFk..",
  "....kfFFFFFFFFk.",
  ".....kfFFFFFkk..",
  "......kfrrFk....",
  ".......kkkk.....",
];

/** Testa del Signore dell'Ombra: cappuccio con corona d'oro, volto buio con occhi di fuoco. */
const SORCERER_HEAD_ROWS: string[] = [
  "...y...y...y....",
  "..kyk.kyk.kyk...",
  "..kyykyyykyyk...",
  "..ktttttttttk...",
  ".khHHHHHHhhhk...",
  "khHHhhhhhhhhhk..",
  "khHhkkkkkkkhhk..",
  "khhkkkkkkkkkhk..",
  "khhkkekkkkekhk..",
  "khhkkkkkkkkkhk..",
  "khhhkkkkkkkhhk..",
  ".khhhhkkkhhhk...",
  "..khhhhhhhhk....",
  "...kkkkkkkk.....",
  "................",
];

interface RobedPose {
  /** Punta dell'arma (dalla mano ROBED_HAND_X/Y, spostata con il corpo). */
  tipX: number;
  tipY: number;
  bodyDrop?: number;
  hemShift?: number;
  shiftX?: number;
  arcs?: Array<{ radius: number; startDegrees: number; endDegrees: number }>;
  /** Bagliore magico sulla punta dell'arma (incantesimi). */
  glow?: boolean;
  /** Scie di movimento dietro il corpo (scatto). */
  streaks?: boolean;
  /** Stelline del colpo subito. */
  stars?: boolean;
}

function composeRobed(variant: "witch" | "sorcerer", width: number, pose: RobedPose): string[] {
  const grid = createGrid(width, ROBED_HEIGHT);
  const drop = pose.bodyDrop ?? 0;
  const shiftX = pose.shiftX ?? 0;
  const hemShift = pose.hemShift ?? 0;
  const centerX = ROBED_CENTER_X + shiftX;
  // veste: un trapezio che si allarga verso terra, luce a sinistra, pieghe scure
  for (let rowY = 14 + drop; rowY < ROBED_HEIGHT; rowY++) {
    const progress = (rowY - 14) / (ROBED_HEIGHT - 14);
    const halfWidth = Math.round(7 + progress * 6);
    const rowShift = rowY >= ROBED_HEIGHT - 6 ? hemShift : 0;
    const left = centerX - halfWidth + rowShift;
    const right = centerX + halfWidth + rowShift;
    for (let columnX = left; columnX <= right; columnX++) {
      let key = "p";
      if (columnX - left < 3) {
        key = "P";
      } else if (right - columnX < 3) {
        key = "c";
      } else if (rowY > 26 && (columnX - left) % 6 === 0) {
        key = "c";
      }
      if (rowY >= ROBED_HEIGHT - 3) {
        key = rowY === ROBED_HEIGHT - 3 ? "y" : "t";
      }
      setPixel(grid, columnX, rowY, key, true);
    }
  }
  // cintura con fibbia
  for (let columnX = centerX - 8; columnX <= centerX + 8; columnX++) {
    setPixel(grid, columnX, 25 + drop, "t", true);
  }
  setPixel(grid, centerX, 25 + drop, "y", true);
  setPixel(grid, centerX + 1, 25 + drop, "y", true);
  // braccio davanti, dalla spalla alla mano
  const handX = ROBED_HAND_X + shiftX;
  const handY = ROBED_HAND_Y + drop;
  for (const point of linePoints(centerX + 5, 16 + drop, handX, handY)) {
    setPixel(grid, point.x, point.y, "p", true);
    setPixel(grid, point.x + 1, point.y, "c", true);
    setPixel(grid, point.x, point.y + 1, "p", true);
  }
  setPixel(grid, handX, handY, "F", true);
  setPixel(grid, handX + 1, handY, "F", true);
  // testa
  const headRows = variant === "witch" ? WITCH_HEAD_ROWS : SORCERER_HEAD_ROWS;
  stampRows(grid, headRows, centerX - 7, drop);
  // scie e scia dell'arma
  if (pose.streaks === true) {
    for (const [streakY, length] of [[20, 8], [28, 11], [36, 7]] as const) {
      for (let offset = 0; offset < length; offset++) {
        setPixel(grid, centerX - 14 - offset + shiftX, streakY + drop, "c", false);
      }
    }
  }
  for (const arc of pose.arcs ?? []) {
    drawSlashArc(grid, handX, handY, arc.radius, arc.startDegrees, arc.endDegrees, "O");
    drawSlashArc(grid, handX, handY, arc.radius - 1, arc.startDegrees, arc.endDegrees, "o");
  }
  const weaponKeys: BladeKeys =
    variant === "witch" ? { grip: "n", blade: "s", edge: "w", guard: "n" } : { grip: "t", blade: "s", edge: "w", guard: "y" };
  drawSword(grid, handX, handY, pose.tipX + shiftX, pose.tipY + drop, weaponKeys);
  const tipX = Math.max(1, Math.min(width - 2, pose.tipX + shiftX));
  const tipY = Math.max(1, pose.tipY + drop);
  if (variant === "witch") {
    // sfera sulla punta del bastone
    for (const [offsetX, offsetY] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      setPixel(grid, tipX + offsetX, tipY + offsetY, "o", true);
    }
    setPixel(grid, tipX - 1, tipY - 1, "O", true);
  }
  if (pose.glow === true) {
    for (let offsetY = -2; offsetY <= 2; offsetY++) {
      for (let offsetX = -2; offsetX <= 2; offsetX++) {
        const distance = Math.abs(offsetX) + Math.abs(offsetY);
        if (distance <= 3) {
          setPixel(grid, tipX + offsetX, tipY + offsetY, distance <= 1 ? "O" : "o", true);
        }
      }
    }
  }
  if (pose.stars === true) {
    for (const [x, y] of [[3, 2], [2, 6], [30, 3], [33, 7]] as const) {
      setPixel(grid, x, y, "y", true);
    }
  }
  return addOutline(grid.map((row) => row.join("")), "k");
}

function composeRobedFrames(definition: BossDefinition, variant: "witch" | "sorcerer"): Record<string, string[]> {
  const prefix = definition.id;
  const meleeAttack = definition.attacks.find((attack) => attack.kind === "melee");
  const meleeRange = meleeAttack !== undefined && meleeAttack.kind === "melee" ? meleeAttack.range : DEFAULT_SLASH_RANGE;
  const slashTipX = ROBED_ANCHOR_X + 24 + meleeRange;
  const slashWidth = Math.max(ROBED_WIDTH, slashTipX + 4);
  const chargeWidth = ROBED_WIDTH + 24;
  const rest = { tipX: ROBED_HAND_X + 2, tipY: 4 };
  const pile = composeRobed(variant, ROBED_WIDTH, { ...rest, bodyDrop: 0 });
  return {
    [`${prefix}Idle1`]: composeRobed(variant, ROBED_WIDTH, rest),
    [`${prefix}Idle2`]: composeRobed(variant, ROBED_WIDTH, { ...rest, bodyDrop: 1 }),
    [`${prefix}Walk1`]: composeRobed(variant, ROBED_WIDTH, { ...rest, bodyDrop: 1, hemShift: -1 }),
    [`${prefix}Walk2`]: composeRobed(variant, ROBED_WIDTH, rest),
    [`${prefix}Walk3`]: composeRobed(variant, ROBED_WIDTH, { ...rest, bodyDrop: 1, hemShift: 1 }),
    [`${prefix}SlashA`]: composeRobed(variant, slashWidth, { tipX: ROBED_HAND_X - 8, tipY: 2, bodyDrop: 1 }),
    [`${prefix}SlashB`]: composeRobed(variant, slashWidth, {
      tipX: slashTipX,
      tipY: ROBED_HAND_Y + 2,
      arcs: [{ radius: slashTipX - ROBED_HAND_X, startDegrees: -60, endDegrees: 10 }],
    }),
    [`${prefix}SlashC`]: composeRobed(variant, slashWidth, { tipX: ROBED_HAND_X + 14, tipY: ROBED_HEIGHT - 2 }),
    [`${prefix}ChargeWindup`]: composeRobed(variant, chargeWidth, { tipX: ROBED_HAND_X + 16, tipY: ROBED_HAND_Y + 4, bodyDrop: 2 }),
    [`${prefix}ChargeDash`]: composeRobed(variant, chargeWidth, { tipX: chargeWidth - 6, tipY: ROBED_HAND_Y, shiftX: 3, streaks: true }),
    [`${prefix}Hurt`]: composeRobed(variant, ROBED_WIDTH, { tipX: ROBED_WIDTH - 3, tipY: ROBED_HEIGHT - 4, bodyDrop: 2, shiftX: -1, stars: true }),
    [`${prefix}CastA`]: composeRobed(variant, ROBED_WIDTH + 4, { tipX: ROBED_HAND_X + 1, tipY: 2, bodyDrop: 1, glow: true }),
    [`${prefix}CastB`]: composeRobed(variant, ROBED_WIDTH + 10, { tipX: ROBED_WIDTH + 6, tipY: ROBED_HAND_Y - 6, glow: true }),
    [`${prefix}Heap`]: collapse(pile),
  };
}

// ===========================================================================
// Forma "beast": il Re dei Lupi, un lupo enorme (vedi composeWolf in creatureTools.ts)
// ===========================================================================

const BEAST_SHAPE = { scale: 2, width: 60, height: 42 };
const BEAST_ANCHOR_X = 7;

function composeBeastFrames(definition: BossDefinition): Record<string, string[]> {
  const prefix = definition.id;
  const pose = (name: WolfPose): string[] => composeWolf(BEAST_SHAPE, name);
  /** Allarga un frame verso destra e ci disegna archi bianchi (morso, ululato). */
  const withArcs = (rows: string[], extraWidth: number, centerX: number, centerY: number, radii: number[], startDegrees: number, endDegrees: number): string[] => {
    const grid = createGrid(BEAST_SHAPE.width + extraWidth, BEAST_SHAPE.height);
    stampRows(grid, rows);
    for (const radius of radii) {
      drawSlashArc(grid, centerX, centerY, radius, startDegrees, endDegrees, "w");
    }
    return grid.map((row) => row.join(""));
  };
  return {
    [`${prefix}Idle1`]: pose("stand"),
    [`${prefix}Idle2`]: pose("standBreath"),
    [`${prefix}Walk1`]: pose("run1"),
    [`${prefix}Walk2`]: pose("run2"),
    [`${prefix}Walk3`]: pose("run3"),
    [`${prefix}SlashA`]: pose("crouch"),
    [`${prefix}SlashB`]: withArcs(pose("bite"), 12, 52, 24, [9, 12], -60, 60),
    [`${prefix}SlashC`]: pose("stand"),
    [`${prefix}ChargeWindup`]: pose("crouch"),
    [`${prefix}ChargeDash`]: pose("leap"),
    [`${prefix}Hurt`]: pose("hurt"),
    [`${prefix}CastA`]: pose("howl"),
    [`${prefix}CastB`]: withArcs(pose("howl"), 8, 50, 10, [5, 8, 11], -80, 10),
    [`${prefix}Heap`]: pose("lying"),
  };
}



/** Registra gli sprite di tutti i boss del catalogo. */
export function registerBossSprites(spriteManager: SpriteManager): void {
  Object.values(BOSS_CATALOG).forEach((definition) => registerBossSpritesFor(spriteManager, definition));
}
