import { PALETTE } from "../../config/gameConfig";
import { BOSS_CATALOG } from "../../config/enemyConfig";
import type { BossDefinition } from "../../types/EntityTypes";
import type { SpriteManager } from "../SpriteManager";
import { createGrid, drawSlashArc, drawSword, stampRows, type BladeKeys } from "./spriteTools";

/**
 * Sprite del Cavaliere Nero. Il corpo è disegnato a metà risoluzione
 * (12 colonne x 20 righe) e poi ingrandito 2x (24x40), così resta
 * facile da modificare. La spada si aggiunge dopo l'ingrandimento.
 */
/**
 * Colori di ogni boss (chiave = id in BOSS_CATALOG). Lettere usate dalla forma:
 * k contorno, d armatura, s luci dell'armatura, r occhi/dettagli, w corna e lama, y impugnatura.
 */
export const BOSS_SPRITE_STYLES: Record<string, Record<string, string>> = {
  blackKnight: {
    k: PALETTE.black,
    d: PALETTE.navy,
    s: PALETTE.blue,
    r: PALETTE.red,
    w: PALETTE.lightGray,
    y: PALETTE.yellow,
  },
};

const BLADE_KEYS: BladeKeys = { grip: "y", blade: "w", edge: "w", guard: "r" };

const UPPER_ROWS: string[] = [
  ".w........w.",
  ".kw......wk.",
  "..kkkkkkkk..",
  "..kddddddk..",
  "..kdrddrdk..",
  "..kddddddk..",
  "...kkkkkk...",
  ".kkddddddkk.",
  "kdddsddsdddk",
  "kddsddddsddk",
  "kdddrrrrdddk",
  ".kddddddddk.",
  ".kddddddddk.",
  "..kdddddddk.",
];

const LEGS_STAND: string[] = [
  "..kddk.kddk.",
  "..kddk.kddk.",
  "..kddk.kddk.",
  "..kddk.kddk.",
  ".kkddk.kddkk",
  ".kkkkk.kkkkk",
];

const LEGS_STRIDE: string[] = [
  "..kddk.kddk.",
  ".kdd....kddk",
  ".kdd....kddk",
  "kdd......ddk",
  "kkdk.....dkk",
  "kkkk.....kkk",
];

const LEGS_PASSING: string[] = [
  "...kdddddk..",
  "...kdddddk..",
  "...kdddddk..",
  "...kdddddk..",
  "..kkdddddkk.",
  "..kkkkkkkkk.",
];

/** Tutti i boss condividono la stessa forma: hitbox 24x40. */
const BODY_WIDTH = 24;
const BODY_HEIGHT = 40;

/** Ingrandisce uno sprite 2x (ogni pixel diventa un quadrato 2x2). */
function scaleUp(rows: string[]): string[] {
  return rows.flatMap((row) => {
    const doubled = [...row].map((key) => key + key).join("");
    return [doubled, doubled];
  });
}

/** Corpo a risoluzione doppia; bodyDrop è in pixel della griglia piccola. */
function composeBody(legRows: string[], bodyDrop: number): string[] {
  const emptyRow = ".".repeat(12);
  const upper =
    bodyDrop > 0
      ? [...Array<string>(bodyDrop).fill(emptyRow), ...UPPER_ROWS.slice(0, UPPER_ROWS.length - bodyDrop)]
      : UPPER_ROWS;
  return scaleUp([...upper, ...legRows]);
}

interface BossPose {
  tipX: number;
  tipY: number;
  handX?: number;
  handY?: number;
  bodyShiftX?: number;
  arcs?: Array<{ radius: number; startDegrees: number; endDegrees: number }>;
}

/** Sprite con spada: corpo a sinistra, arma e scia a destra. */
function composeWithSword(spriteWidth: number, pose: BossPose, bodyDrop = 0): string[] {
  const grid = createGrid(spriteWidth, BODY_HEIGHT);
  stampRows(grid, composeBody(LEGS_STAND, bodyDrop), pose.bodyShiftX ?? 0, 0);
  const handX = pose.handX ?? 22;
  const handY = (pose.handY ?? 24) + bodyDrop * 2;
  for (const arc of pose.arcs ?? []) {
    drawSlashArc(grid, handX, handY, arc.radius, arc.startDegrees, arc.endDegrees);
  }
  // l'arma del boss è spessa il doppio: due linee affiancate
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
  const slashWidth = BODY_WIDTH + definition.slashRange + 6;
  const slashTipX = Math.min(slashWidth - 1, BODY_WIDTH + definition.slashRange);
  const mirroredStride = LEGS_STRIDE.map((row) => [...row].reverse().join(""));
  const frames: Record<string, string[]> = {
    [`${prefix}Idle1`]: composeWithSword(BODY_WIDTH + 8, { tipX: 29, tipY: 6 }),
    [`${prefix}Idle2`]: composeWithSword(BODY_WIDTH + 8, { tipX: 29, tipY: 6 }, 1),
    [`${prefix}Walk1`]: composeBody(LEGS_STRIDE, 1),
    [`${prefix}Walk2`]: composeBody(LEGS_PASSING, 0),
    [`${prefix}Walk3`]: composeBody(mirroredStride, 1),
    [`${prefix}SlashA`]: composeWithSword(slashWidth, { tipX: 28, tipY: 2 }, 1),
    [`${prefix}SlashB`]: composeWithSword(slashWidth, {
      tipX: slashTipX,
      tipY: 22,
      arcs: [
        { radius: 34, startDegrees: -80, endDegrees: -5 },
        { radius: 28, startDegrees: -75, endDegrees: -15 },
      ],
    }),
    [`${prefix}SlashC`]: composeWithSword(slashWidth, { tipX: 40, tipY: 38 }),
    [`${prefix}ChargeWindup`]: composeWithSword(BODY_WIDTH + 28, { tipX: 50, tipY: 22 }, 1),
    [`${prefix}ChargeDash`]: composeWithSword(BODY_WIDTH + 28, { tipX: 52, tipY: 26, bodyShiftX: 4, handX: 26, handY: 26 }),
    [`${prefix}Hurt`]: composeWithSword(BODY_WIDTH + 8, { tipX: 30, tipY: 40 }, 1),
  };
  frames[`${prefix}Heap`] = collapse(composeBody(LEGS_STAND, 0));
  // I frame di camminata non hanno spada in vista: allargati per avere la stessa larghezza di base.
  for (const walkId of [`${prefix}Walk1`, `${prefix}Walk2`, `${prefix}Walk3`]) {
    const walkGrid = createGrid(BODY_WIDTH + 8, BODY_HEIGHT);
    stampRows(walkGrid, frames[walkId]!);
    drawSword(walkGrid, 22, 24, 29, 6, BLADE_KEYS);
    drawSword(walkGrid, 22, 25, 29, 7, BLADE_KEYS);
    frames[walkId] = walkGrid.map((row) => row.join(""));
  }
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, colors);
  }
}

/** Registra gli sprite di tutti i boss del catalogo. */
export function registerBossSprites(spriteManager: SpriteManager): void {
  Object.values(BOSS_CATALOG).forEach((definition) => registerBossSpritesFor(spriteManager, definition));
}
