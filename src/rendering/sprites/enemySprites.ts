import { PALETTE } from "../../config/gameConfig";
import { ENEMY_CONFIG } from "../../config/enemyConfig";
import type { SpriteManager } from "../SpriteManager";
import { createGrid, drawSlashArc, drawSword, mirrorRows, setPixel, stampRows, type BladeKeys } from "./spriteTools";

/**
 * Sprite dei nemici in stile 16 bit (rivolti a destra).
 * Ogni nemico è descritto da una HumanoidSpec: parte superiore (bodyRows), pose delle gambe,
 * colori, arma e posizione della mano. Da questi dati si generano tutti i frame:
 * Idle1-2, Walk1-3, AttackA-C (preparazione, colpo con scia, recupero), Hurt, Heap (a terra).
 *
 * Gli sprite sono più grandi dell'hitbox (testa e arma sporgono): anchorX indica la colonna
 * dello sprite in cui inizia l'hitbox, così SpriteManager.drawSpriteAligned li allinea.
 */

/** Pose delle gambe di un nemico (strisce larghe quanto lo sprite, stessa altezza). */
interface LegPoses {
  stand: string[];
  stride: string[];
  passing: string[];
  fall: string[];
}

interface HumanoidSpec {
  idPrefix: "skeleton" | "goblin" | "soldier";
  bodyRows: string[];
  colors: Record<string, string>;
  bladeKeys: BladeKeys;
  /** Posizione dell'impugnatura nello sprite. */
  handX: number;
  handY: number;
  /** Gambe (se omesse: quelle del soldato). */
  legs?: LegPoses;
  /** Colonna in cui inizia l'hitbox (se omessa: quella del soldato). */
  anchorX?: number;
  /** Punta della spada a riposo (relativa alla mano). */
  restingTip?: { dx: number; dy: number };
}

// ---------------------------------------------------------------------------
// Scheletro guerriero: ossa avorio, occhi rossi, spada arrugginita
// ---------------------------------------------------------------------------

const SKELETON_BODY_ROWS: string[] = [
  "......kkkkk.........",
  ".....kwwbbbk........",
  "....kwbbbbbbk.......",
  "....kbbbbkkbk.......",
  "....kbbbbkrok.......",
  "....kgbbbbbbbk......",
  ".....kgbbkbkbk......",
  "......kgbbbbk.......",
  ".......kkkkk........",
  "....kkkkkbkkkkk.....",
  "...kbbgkbbbkgbbk....",
  "...kbk.kwbbk.kbgk...",
  "...kbk.kbkbk.kbbk...",
  "...kbk.kwbbk..kbk...",
  "...kgk..kbk...kbk...",
  "...kbk.knnnk..kbbk..",
  "...kbkkmemmek.kkk...",
  "....kkkmekmek.......",
  ".......kk.kk........",
];

const SKELETON_LEGS: LegPoses = {
  stand: [
    ".......kbk.kbk......",
    ".......kbk.kbk......",
    ".......kgk.kgk......",
    ".......kbk.kbk......",
    ".......kbk.kbk......",
    "......kbbk.kbbk.....",
    "......kkkk.kkkk.....",
  ],
  stride: [
    ".......kbk.kbk......",
    "......kbk...kbk.....",
    "......kgk....kgk....",
    ".....kbk.....kbk....",
    ".....kbk......kbk...",
    "....kbbk......kbbk..",
    "....kkkk......kkkk..",
  ],
  passing: [
    "........kbkbk.......",
    "........kbkbk.......",
    "........kgkgk.......",
    "........kbkbk.......",
    "........kbkbk.......",
    ".......kbbkbbk......",
    ".......kkkkkkk......",
  ],
  fall: [
    ".......kbk.kbk......",
    "......kbk...kbk.....",
    ".....kgk.....kgk....",
    "....kbk.......kbk...",
    "....kbbk......kbbk..",
    "....kkkk......kkkk..",
    "....................",
  ],
};

// ---------------------------------------------------------------------------
// Goblin: pelle verde, grandi orecchie, occhi gialli, pugnale
// ---------------------------------------------------------------------------

const GOBLIN_BODY_ROWS: string[] = [
  ".kk...........kk....",
  ".kgk..kkkkk..kgk....",
  "..kgkkgggggkkgnk....",
  "..kdggnnggggggdk....",
  "...kkgngggkykggk....",
  "....kgggggkkkggk....",
  "....kdgggggggggk....",
  ".....kdgwkwkgdk.....",
  "....kkkddgggdkkk....",
  "...kgkleeelleekgk...",
  "..kgk.kleleleek.kk..",
  "..kk..kleeeleek.....",
  "......kkyyyyykk.....",
  "......kllllelk......",
];

const GOBLIN_LEGS: LegPoses = {
  stand: [
    ".......kgk.kgk......",
    ".......kdk.kdk......",
    "......kgdk.kgdk.....",
    "......kkkk.kkkk.....",
    "....................",
  ],
  stride: [
    "......kgk...kgk.....",
    ".....kdk.....kdk....",
    "....kgdk.....kgdk...",
    "....kkkk.....kkkk...",
    "....................",
  ],
  passing: [
    "........kgkgk.......",
    "........kdkdk.......",
    ".......kgdkgdk......",
    ".......kkkkkkk......",
    "....................",
  ],
  fall: [
    "......kgk...kgk.....",
    ".....kdk.....kdk....",
    "....kgk.......kgk...",
    "....kkk.......kkk...",
    "....................",
  ],
};

// ---------------------------------------------------------------------------
// Soldato nemico: elmo a cappello, cotta di maglia, sopravveste viola
// (usa solo i colori k, s, g, w, r, y, d: le varianti si ottengono cambiando la mappa dei colori)
// ---------------------------------------------------------------------------

const SOLDIER_BODY_ROWS: string[] = [
  "......kkkkkk........",
  ".....kwwsssgk.......",
  "...kkwssssssgkk.....",
  "..kyyyyyyyyyyyyk....",
  "...kkkssssssgkk.....",
  ".....kssskddddk.....",
  ".....kgssssssgk.....",
  "......kgsssgdk......",
  "....kkkkkkkkkkkk....",
  "...kwsskyyyyykwsk...",
  "..kwssgkrrrrrkssgk..",
  "..ksggkkrryrrkkgsk..",
  "..kgsgkrrrrrrrkgsk..",
  "...kgkkrrrrrrrkkk...",
  "...kskkyyyyyyykk....",
  "....k.kgrrrrrgk.....",
  "......kgrrkrrgk.....",
  "......kdgk.kgdk.....",
  "......kkkk.kkkk.....",
  ".......kgk.kgk......",
];

const SOLDIER_LEGS: LegPoses = {
  stand: [
    ".......kgsk.kgsk....",
    ".......kgsk.kgsk....",
    ".......kdgk.kdgk....",
    ".......kdgk.kdgk....",
    "......kddgk.kddgk...",
    "......kkkkk.kkkkk...",
    "....................",
  ],
  stride: [
    ".......kgsk.kgsk....",
    "......kgsk...kgsk...",
    ".....kdgk.....kdgk..",
    "....kdgk......kdgk..",
    "...kddgk......kddgk.",
    "...kkkkk......kkkkk.",
    "....................",
  ],
  passing: [
    "........kgssk.......",
    "........kgssk.......",
    "........kdgsk.......",
    "........kdgsk.......",
    ".......kddgsk.......",
    ".......kkkkkk.......",
    "....................",
  ],
  fall: [
    ".......kgsk.kgsk....",
    "......kgsk...kgsk...",
    ".....kdgk.....kdgk..",
    "....kddk.......kddk.",
    "....kkkk.......kkkk.",
    "....................",
    "....................",
  ],
};

const SOLDIER_ANCHOR_X = 4;

const SPECS: HumanoidSpec[] = [
  {
    idPrefix: "skeleton",
    bodyRows: SKELETON_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      w: PALETTE.white,
      b: PALETTE.stonePale,
      g: PALETTE.stoneLight,
      r: PALETTE.red,
      o: PALETTE.orange,
      m: PALETTE.earth,
      e: PALETTE.wood,
      s: PALETTE.stone,
      n: PALETTE.bronze,
      y: PALETTE.gold,
    },
    bladeKeys: { grip: "e", blade: "g", edge: "b", guard: "n" },
    handX: 15,
    handY: 16,
    legs: SKELETON_LEGS,
    anchorX: 3,
    restingTip: { dx: 3, dy: -10 },
  },
  {
    idPrefix: "goblin",
    bodyRows: GOBLIN_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      d: PALETTE.pine,
      g: PALETTE.green,
      n: PALETTE.lightGreen,
      y: PALETTE.yellow,
      w: PALETTE.white,
      e: PALETTE.earth,
      l: PALETTE.wood,
      s: PALETTE.lightGray,
      o: PALETTE.orange,
    },
    bladeKeys: { grip: "e", blade: "s", edge: "w", guard: "o" },
    handX: 16,
    handY: 10,
    legs: GOBLIN_LEGS,
    anchorX: 4,
    restingTip: { dx: 4, dy: -5 },
  },
  {
    idPrefix: "soldier",
    bodyRows: SOLDIER_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      s: PALETTE.stoneLight,
      g: PALETTE.stone,
      w: PALETTE.stonePale,
      r: PALETTE.purple,
      y: PALETTE.gold,
      d: PALETTE.stoneShadow,
    },
    bladeKeys: { grip: "y", blade: "w", edge: "w", guard: "y" },
    handX: 17,
    handY: 15,
  },
];

/** Unisce parte superiore e gambe; bodyDrop abbassa la parte superiore (respiro, passo). */
function composeRows(spec: HumanoidSpec, width: number, legRows: string[], bodyDrop: number): string[] {
  const height = spec.bodyRows.length + legRows.length;
  const grid = createGrid(width, height);
  stampRows(grid, legRows, 0, spec.bodyRows.length);
  stampRows(grid, spec.bodyRows, 0, bodyDrop);
  return grid.map((row) => row.join(""));
}

function getLegs(spec: HumanoidSpec): LegPoses {
  return spec.legs ?? SOLDIER_LEGS;
}

function getSpriteWidth(spec: HumanoidSpec): number {
  return Math.max(...spec.bodyRows.map((row) => row.length), ...getLegs(spec).stand.map((row) => row.length));
}

/** Frame con l'arma a riposo (tenuta in alto davanti al corpo). */
function composeRestingFrame(spec: HumanoidSpec, legRows: string[], bodyDrop: number): string[] {
  const width = getSpriteWidth(spec);
  const rows = composeRows(spec, width, legRows, bodyDrop);
  const grid = createGrid(width, rows.length);
  stampRows(grid, rows);
  const tip = spec.restingTip ?? { dx: 2, dy: -12 };
  drawSword(grid, spec.handX, spec.handY + bodyDrop, spec.handX + tip.dx, Math.max(0, spec.handY + bodyDrop + tip.dy), spec.bladeKeys);
  return grid.map((row) => row.join(""));
}

function composeAttackFrame(
  spec: HumanoidSpec,
  spriteWidth: number,
  tipX: number,
  tipYOffset: number,
  bodyDrop: number,
  withArc: boolean
): string[] {
  const bodyRows = composeRows(spec, spriteWidth, getLegs(spec).stand, bodyDrop);
  const grid = createGrid(spriteWidth, bodyRows.length);
  stampRows(grid, bodyRows);
  const handY = spec.handY + bodyDrop;
  const tipY = Math.max(0, Math.min(bodyRows.length - 1, handY + tipYOffset));
  if (withArc) {
    drawSlashArc(grid, spec.handX, handY, tipX - spec.handX, -70, -5, "w");
    drawSlashArc(grid, spec.handX, handY, tipX - spec.handX - 1, -65, -10, spec.bladeKeys.edge);
  }
  drawSword(grid, spec.handX, handY, tipX, tipY, spec.bladeKeys);
  return grid.map((row) => row.join(""));
}

function composeHurtFrame(spec: HumanoidSpec): string[] {
  const width = getSpriteWidth(spec);
  const rows = composeRows(spec, width, getLegs(spec).fall, 1);
  const grid = createGrid(width, rows.length);
  stampRows(grid, rows.map((row) => row.slice(1) + "."));
  drawSword(grid, spec.handX - 1, spec.handY + 1, spec.handX + 2, spec.handY + 9, spec.bladeKeys);
  const sparkKey = "y" in spec.colors ? "y" : "w";
  for (const [x, y] of [[1, 0], [0, 2], [3, 0], [width - 3, 1]] as const) {
    setPixel(grid, x, y, sparkKey, true);
  }
  return grid.map((row) => row.join(""));
}

/** Mucchio a terra: l'immagine in piedi compressa a un terzo dell'altezza, appoggiata al suolo. */
function collapseRows(standingRows: string[]): string[] {
  const sampled = standingRows.filter((_, rowIndex) => rowIndex % 3 === 2);
  const emptyRow = ".".repeat(standingRows[0]!.length);
  return [...Array<string>(standingRows.length - sampled.length).fill(emptyRow), ...sampled];
}

function registerHumanoid(spriteManager: SpriteManager, spec: HumanoidSpec): void {
  const definition = ENEMY_CONFIG[spec.idPrefix];
  const anchorX = spec.anchorX ?? SOLDIER_ANCHOR_X;
  const legs = getLegs(spec);
  const baseWidth = getSpriteWidth(spec);
  // la punta della spada arriva dove arriva il colpo: bordo anteriore dell'hitbox + attackRange
  const hitboxFrontColumn = anchorX + definition.hitbox.width;
  const tipX = hitboxFrontColumn + definition.attackRange;
  const attackSpriteWidth = Math.max(baseWidth, tipX + 3);
  const standing = composeRows(spec, baseWidth, legs.stand, 0);
  const prefix = spec.idPrefix;
  const frames: Record<string, string[]> = {
    [`${prefix}Idle1`]: composeRestingFrame(spec, legs.stand, 0),
    [`${prefix}Idle2`]: composeRestingFrame(spec, legs.stand, 1),
    [`${prefix}Walk1`]: composeRestingFrame(spec, legs.stride, 1),
    [`${prefix}Walk2`]: composeRestingFrame(spec, legs.passing, 0),
    [`${prefix}Walk3`]: composeRestingFrame(spec, mirrorRows(legs.stride), 1),
    [`${prefix}AttackA`]: composeAttackFrame(spec, attackSpriteWidth, spec.handX - 2, -14, 1, false),
    [`${prefix}AttackB`]: composeAttackFrame(spec, attackSpriteWidth, tipX, -1, 0, true),
    [`${prefix}AttackC`]: composeAttackFrame(spec, attackSpriteWidth, spec.handX + 9, 9, 0, false),
    [`${prefix}Hurt`]: composeHurtFrame(spec),
    [`${prefix}Heap`]: collapseRows(standing),
  };
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, spec.colors, anchorX);
  }
}

/** Registra gli sprite di tutti i nemici. */
export function registerEnemySprites(spriteManager: SpriteManager): void {
  SPECS.forEach((spec) => registerHumanoid(spriteManager, spec));
}
