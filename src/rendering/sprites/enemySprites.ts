import { PALETTE } from "../../config/gameConfig";
import { ENEMY_CONFIG } from "../../config/enemyConfig";
import type { SpriteManager } from "../SpriteManager";
import { composeBlob, composeScorpion, composeWolf, type BlobPose, type ScorpionPose, type WolfPose } from "./creatureTools";
import { createGrid, drawSlashArc, drawSword, linePoints, mirrorRows, setPixel, stampRows, type BladeKeys, type PixelGrid } from "./spriteTools";

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
  idPrefix: "skeleton" | "goblin" | "soldier" | "skeletonArcher" | "iceGolem" | "raider";
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
  /**
   * Arma: spada (predefinita), arco (per chi tira frecce: niente spada, arco teso nella preparazione) o arma da lancio
   * (accetta del predone: corta, e nel colpo il braccio si allunga solo un poco, perché l'arma vola via).
   */
  weapon?: "sword" | "bow" | "thrown";
  /** Larghezza dello sprite, se deve essere più larga del disegno (es. per l'arco). */
  spriteWidth?: number;
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
// Predone delle Lande (Fase 8): testa avvolta in un panno con la coda al vento, occhi gialli, sciarpa rossa sul viso,
// corpo del soldato in cuoio; lancia accette
// ---------------------------------------------------------------------------

const RAIDER_HEAD_ROWS: string[] = [
  "......kkkkk.........",
  ".....khHHhhk........",
  "....khHhhhhhk.......",
  "...kthhhhhhhhk......",
  "..kttkhkkkkkhk......",
  "..kt.kfffffekk......",
  "..k..kmmmmmmmk......",
  "......kmmmmmdk......",
];

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

// ---------------------------------------------------------------------------
// Golem di ghiaccio: corpo massiccio di blocchi di ghiaccio, crepe scure, occhi bianchi, mazza di ghiaccio
// ---------------------------------------------------------------------------

const GOLEM_BODY_ROWS: string[] = [
  ".......kkkkkk...........",
  "......kwwllmmk..........",
  ".....kwllllmmdk.........",
  ".....kllekllmek.........",
  ".....klllllmmdk.........",
  "......kdmcmmdk..........",
  "...kkkkkkkkkkkkkk.......",
  "..kwwllkllllmmkmmk......",
  ".kwllllkllclmmkmmdk.....",
  ".klllmmklllllmdkmddk....",
  ".klmmmdkllllmmdkkddk....",
  ".kdmmdkklcllmmddkkdk....",
  "..kddk.kllllmmdk.kddk...",
  "..kddk.klllmmmdk.kmmk...",
  "..kmmk.kmmcmmmdk.kmmk...",
  "..kwwk.kddddddk..kwwk...",
  "...kk..kmmmmmmk...kk....",
  ".......kdmmmmdk.........",
  "......kssssssssk........",
  "......kkkkkkkkkk........",
];

const GOLEM_LEGS: LegPoses = {
  stand: [
    ".......kllmk.kllmk......",
    ".......kllmk.kllmk......",
    ".......klmdk.klmdk......",
    ".......kmmdk.kmmdk......",
    ".......kmcdk.kmmdk......",
    "......kllmdk.kllmdk.....",
    "......kmmmdk.kmmmdk.....",
    "......kkkkkk.kkkkkk.....",
    "........................",
  ],
  stride: [
    ".......kllmk.kllmk......",
    "......kllmk...kllmk.....",
    "......klmdk...klmdk.....",
    ".....kmmdk.....kmmdk....",
    ".....kmcdk.....kmmdk....",
    "....kllmdk.....kllmdk...",
    "....kmmmdk.....kmmmdk...",
    "....kkkkkk.....kkkkkk...",
    "........................",
  ],
  passing: [
    "........kllmmk..........",
    "........kllmmk..........",
    "........klmmdk..........",
    "........kmmmdk..........",
    "........kmcmdk..........",
    ".......kllmmdk..........",
    ".......kmmmmdk..........",
    ".......kkkkkkk..........",
    "........................",
  ],
  fall: [
    ".......kllmk.kllmk......",
    "......kllmk...kllmk.....",
    ".....klmdk.....klmdk....",
    "....kmmdk.......kmmdk...",
    "....kkkk.........kkkk...",
    "........................",
    "........................",
    "........................",
    "........................",
  ],
};

// ---------------------------------------------------------------------------
// Lupo e melme (forme procedurali, vedi creatureTools.ts)
// ---------------------------------------------------------------------------

const WOLF_COLORS: Record<string, string> = {
  k: PALETTE.black,
  d: PALETTE.slate,
  m: PALETTE.gray,
  l: PALETTE.lightGray,
  w: PALETTE.white,
  e: PALETTE.yellow,
  n: PALETTE.earthDark,
  r: PALETTE.red,
};

const SLIME_COLORS: Record<string, string> = {
  k: PALETTE.bogDark,
  d: PALETTE.bog,
  m: PALETTE.moss,
  l: PALETTE.olive,
  w: PALETTE.reed,
  e: PALETTE.black,
};

/** Frame dei nemici animali: stesso schema di nomi degli umanoidi (Idle1-2, Walk1-3, AttackA-C, Hurt, Heap). */
function registerCreature(
  spriteManager: SpriteManager,
  prefix: string,
  framesByName: Record<string, string[]>,
  colors: Record<string, string>,
  anchorX: number
): void {
  for (const [frameName, pixelRows] of Object.entries(framesByName)) {
    spriteManager.registerSprite(`${prefix}${frameName}`, pixelRows, colors, anchorX);
  }
}

function registerWolf(spriteManager: SpriteManager): void {
  const shape = { scale: 1, width: 31, height: 19 };
  const pose = (name: WolfPose): string[] => composeWolf(shape, name);
  registerCreature(
    spriteManager,
    "wolf",
    {
      Idle1: pose("stand"),
      Idle2: pose("standBreath"),
      Walk1: pose("run1"),
      Walk2: pose("run2"),
      Walk3: pose("run3"),
      AttackA: pose("crouch"),
      AttackB: pose("leap"),
      AttackC: pose("bite"),
      Hurt: pose("hurt"),
      Heap: pose("lying"),
    },
    WOLF_COLORS,
    4
  );
}

function registerSlime(spriteManager: SpriteManager, prefix: string, width: number, height: number, anchorX: number): void {
  const pose = (name: BlobPose): string[] => composeBlob(width, height, name);
  registerCreature(
    spriteManager,
    prefix,
    {
      Idle1: pose("rest"),
      Idle2: pose("squash"),
      Walk1: pose("wobbleLeft"),
      Walk2: pose("rest"),
      Walk3: pose("wobbleRight"),
      AttackA: pose("squash"),
      AttackB: pose("stretch"),
      AttackC: pose("rest"),
      Hurt: pose("hurt"),
      Heap: pose("puddle"),
    },
    SLIME_COLORS,
    anchorX
  );
}

// ---------------------------------------------------------------------------
// Arciere scheletro: lo scheletro con cappuccio verde, faretra sulla schiena e arco
// ---------------------------------------------------------------------------

const ARCHER_BODY_ROWS: string[] = [
  ".....hhhhhh.........",
  "....hHHhhhhh........",
  "...hHhkbbbbhh.......",
  "...hhkbbbkkbh.......",
  "...hhkbbbkrok.......",
  "...hhkgbbbbbbk......",
  "....hhkgbbkbkbk.....",
  "....hhhkgbbbbk......",
  ".lr.hh..kkkkk.......",
  ".lrkkkkkkbkkkkk.....",
  ".lrebbgkbbbkgbbk....",
  ".eekbk.kwbbk.kbgk...",
  ".eekbk.kbkbk.kbbk...",
  ".eekbk.kwbbk..kbk...",
  "..ekgk..kbk...kbk...",
  "...kbk.knnnk..kbbk..",
  "...kbkkmemmek.kkk...",
  "....kkkmekmek.......",
  ".......kk.kk........",
];

/** Arco: legno chiaro e scuro, corda bianca; freccia incoccata (legno chiaro, punta di ferro). */
const BOW_RADIUS = 7;

/**
 * Disegna l'arco davanti alla mano. drawAmount 0 = corda dritta (a riposo), 1 = corda tirata
 * fino alla mano con la freccia incoccata.
 */
function drawBow(grid: PixelGrid, handX: number, handY: number, drawAmount: number): void {
  const centerX = handX - 2;
  drawSlashArc(grid, centerX, handY, BOW_RADIUS, -78, 78, "e");
  drawSlashArc(grid, centerX, handY, BOW_RADIUS - 1, -60, 60, "l");
  const topTip = { x: Math.round(centerX + Math.cos((78 * Math.PI) / 180) * BOW_RADIUS), y: handY - BOW_RADIUS };
  const bottomTip = { x: topTip.x, y: handY + BOW_RADIUS };
  const pullX = topTip.x - Math.round(drawAmount * 5);
  for (const tip of [topTip, bottomTip]) {
    for (const point of linePoints(tip.x, tip.y, pullX, handY)) {
      setPixel(grid, point.x, point.y, "w", false);
    }
  }
  if (drawAmount > 0) {
    for (let arrowX = pullX; arrowX <= handX + BOW_RADIUS + 1; arrowX++) {
      setPixel(grid, arrowX, handY, "l", true);
    }
    setPixel(grid, handX + BOW_RADIUS + 2, handY, "s", true);
    setPixel(grid, pullX - 1, handY - 1, "r", true);
    setPixel(grid, pullX - 1, handY + 1, "r", true);
  }
}

/** Predone: la testa propria sopra il busto del soldato (righe 8-19), ricolorato in cuoio. */
const RAIDER_BODY_ROWS: string[] = [...RAIDER_HEAD_ROWS, ...SOLDIER_BODY_ROWS.slice(RAIDER_HEAD_ROWS.length)];

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
    idPrefix: "skeletonArcher",
    bodyRows: ARCHER_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      w: PALETTE.white,
      b: PALETTE.stonePale,
      g: PALETTE.stoneLight,
      r: PALETTE.red,
      o: PALETTE.orange,
      m: PALETTE.earth,
      e: PALETTE.wood,
      l: PALETTE.woodLight,
      s: PALETTE.lightGray,
      n: PALETTE.bronze,
      y: PALETTE.gold,
      h: PALETTE.pine,
      H: PALETTE.darkGreen,
    },
    bladeKeys: { grip: "e", blade: "g", edge: "b", guard: "n" },
    handX: 16,
    handY: 13,
    legs: SKELETON_LEGS,
    anchorX: 3,
    weapon: "bow",
    spriteWidth: 26,
  },
  {
    idPrefix: "iceGolem",
    bodyRows: GOLEM_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      d: PALETTE.blue,
      m: PALETTE.lightBlue,
      l: PALETTE.cyan,
      w: PALETTE.iceWhite,
      c: PALETTE.deepNavy,
      e: PALETTE.white,
      s: PALETTE.slate,
    },
    bladeKeys: { grip: "s", blade: "m", edge: "w", guard: "d" },
    handX: 19,
    handY: 14,
    legs: GOLEM_LEGS,
    anchorX: 4,
    restingTip: { dx: 1, dy: -11 },
    spriteWidth: 24,
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
  {
    idPrefix: "raider",
    bodyRows: RAIDER_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      h: PALETTE.wood,
      H: PALETTE.woodLight,
      t: PALETTE.earth,
      f: PALETTE.skinDark,
      e: PALETTE.yellow,
      m: PALETTE.ember,
      s: PALETTE.woodLight,
      g: PALETTE.wood,
      w: PALETTE.sand,
      r: PALETTE.ember,
      y: PALETTE.bronze,
      d: PALETTE.earthDark,
      x: PALETTE.stoneLight,
      X: PALETTE.stonePale,
    },
    bladeKeys: { grip: "t", blade: "x", edge: "X", guard: "y" },
    handX: 17,
    handY: 15,
    weapon: "thrown",
    restingTip: { dx: 2, dy: -6 },
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
  return spec.spriteWidth ?? Math.max(...spec.bodyRows.map((row) => row.length), ...getLegs(spec).stand.map((row) => row.length));
}

/** Frame con l'arma a riposo (tenuta in alto davanti al corpo). */
function composeRestingFrame(spec: HumanoidSpec, legRows: string[], bodyDrop: number): string[] {
  const width = getSpriteWidth(spec);
  const rows = composeRows(spec, width, legRows, bodyDrop);
  const grid = createGrid(width, rows.length);
  stampRows(grid, rows);
  if (spec.weapon === "bow") {
    drawBow(grid, spec.handX, spec.handY + bodyDrop, 0);
    return grid.map((row) => row.join(""));
  }
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

/** Frame dell'arciere: arco teso (preparazione), freccia appena scoccata (colpo), arco a riposo (recupero). */
function composeBowFrames(spec: HumanoidSpec): { attackA: string[]; attackB: string[]; attackC: string[]; hurt: string[] } {
  const width = getSpriteWidth(spec);
  const legs = getLegs(spec);
  const compose = (drawAmount: number, withSpark: boolean, legRows: string[], bodyDrop: number, shiftLeft: number): string[] => {
    const rows = composeRows(spec, width, legRows, bodyDrop);
    const grid = createGrid(width, rows.length);
    stampRows(grid, rows.map((row) => row.slice(shiftLeft) + ".".repeat(shiftLeft)));
    drawBow(grid, spec.handX - shiftLeft, spec.handY + bodyDrop, drawAmount);
    if (withSpark) {
      for (const [x, y] of [[width - 2, spec.handY - 1], [width - 1, spec.handY], [width - 2, spec.handY + 1]] as const) {
        setPixel(grid, x, y, "w", true);
      }
    }
    return grid.map((row) => row.join(""));
  };
  return {
    attackA: compose(1, false, legs.stand, 1, 0),
    attackB: compose(0, true, legs.stand, 0, 0),
    attackC: compose(0, false, legs.stand, 0, 0),
    hurt: compose(0, false, legs.fall, 1, 1),
  };
}

function registerHumanoid(spriteManager: SpriteManager, spec: HumanoidSpec): void {
  const definition = ENEMY_CONFIG[spec.idPrefix];
  const anchorX = spec.anchorX ?? SOLDIER_ANCHOR_X;
  const legs = getLegs(spec);
  const baseWidth = getSpriteWidth(spec);
  // la punta della spada arriva dove arriva il colpo: bordo anteriore dell'hitbox + attackRange
  const hitboxFrontColumn = anchorX + definition.hitbox.width;
  const tipX = spec.weapon === "thrown" ? spec.handX + 8 : hitboxFrontColumn + definition.attackRange;
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
  if (spec.weapon === "bow") {
    const bowFrames = composeBowFrames(spec);
    frames[`${prefix}AttackA`] = bowFrames.attackA;
    frames[`${prefix}AttackB`] = bowFrames.attackB;
    frames[`${prefix}AttackC`] = bowFrames.attackC;
    frames[`${prefix}Hurt`] = bowFrames.hurt;
  }
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, spec.colors, anchorX);
  }
}

// ---------------------------------------------------------------------------
// Pipistrello (volante): visto di fronte, ali in quattro pose
// ---------------------------------------------------------------------------

const BAT_COLORS: Record<string, string> = {
  k: PALETTE.black,
  d: PALETTE.violetDark,
  v: PALETTE.violet,
  a: PALETTE.amethyst,
  i: PALETTE.lilac,
  r: PALETTE.red,
  o: PALETTE.orange,
  w: PALETTE.white,
  y: PALETTE.yellow,
};

/**
 * Metà sinistra del pipistrello (colonne 0-9, la colonna 9 è l'asse): lo sprite intero (19 colonne)
 * si ottiene specchiando. Corpo con orecchie, occhio rosso e zanna; ali in pose diverse.
 */
const BAT_HALVES: Record<string, string[]> = {
  wingsUp: [
    "k.........",
    "kd........",
    "kad....k..",
    ".kad...kk.",
    ".kvad.kvvv",
    "..kvadkvrv",
    "..kkvdkvvv",
    "....kkkvwv",
    "......kvvv",
    ".......kvv",
    "........kk",
    "..........",
  ],
  wingsMid: [
    "..........",
    "..........",
    ".......k..",
    ".......kk.",
    "kkk...kvvv",
    "kaavvdkvrv",
    ".kkaavdvvv",
    "...kkkkvwv",
    "......kvvv",
    ".......kvv",
    "........kk",
    "..........",
  ],
  wingsDown: [
    "..........",
    "..........",
    ".......k..",
    ".......kk.",
    "......kvvv",
    "....kkkvrv",
    "..kkavdvvv",
    ".kavadkvwv",
    "kavdk.kvvv",
    "kadk...kvv",
    "kk......kk",
    "..........",
  ],
  // ali raccolte (picchiata)
  folded: [
    "..........",
    ".......k..",
    ".......kk.",
    "......kvvv",
    ".....kavrv",
    ".....kavvv",
    ".....kavwv",
    ".....kavvv",
    "......kavv",
    ".......kav",
    "........kk",
    "..........",
  ],
};

/** Colonna d'ancoraggio del pipistrello (hitbox 12 px centrata su 19). */
const BAT_ANCHOR_X = 4;

function mirrorHalf(halfRows: string[]): string[] {
  return halfRows.map((row) => row + [...row.slice(0, -1)].reverse().join(""));
}

function registerBat(spriteManager: SpriteManager): void {
  const up = mirrorHalf(BAT_HALVES.wingsUp!);
  const mid = mirrorHalf(BAT_HALVES.wingsMid!);
  const down = mirrorHalf(BAT_HALVES.wingsDown!);
  const folded = mirrorHalf(BAT_HALVES.folded!);
  // preparazione: ali spalancate e occhi che brillano (arancio)
  const screech = up.map((row) => row.split("r").join("o"));
  const hurtGrid = createGrid(up[0]!.length, up.length);
  stampRows(hurtGrid, mid);
  for (const [x, y] of [[2, 0], [16, 1], [0, 3]] as const) {
    setPixel(hurtGrid, x, y, "y", true);
  }
  const heap = [
    ...Array<string>(8).fill(".".repeat(19)),
    "....kkk.kvk.kkk....",
    "..kkavdkvrvkdvakk..",
    ".kavdddkvvvkdddvak.",
    "kkkkkkkkkkkkkkkkkkk",
  ];
  const frames: Record<string, string[]> = {
    batIdle1: up,
    batIdle2: down,
    batWalk1: up,
    batWalk2: mid,
    batWalk3: down,
    batAttackA: screech,
    batAttackB: folded,
    batAttackC: mid,
    batHurt: hurtGrid.map((row) => row.join("")),
    batHeap: heap,
  };
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, BAT_COLORS, BAT_ANCHOR_X);
  }
}

// ---------------------------------------------------------------------------
// Avvoltoio (Fase 8): le ali del pipistrello in piume marroni, testa calva rossa, becco chiaro e collare bianco
// ---------------------------------------------------------------------------

const VULTURE_COLORS: Record<string, string> = {
  k: PALETTE.black,
  d: PALETTE.earthDark,
  v: PALETTE.wood,
  a: PALETTE.woodLight,
  R: PALETTE.skinDark,
  y: PALETTE.yellow,
  o: PALETTE.orange,
  N: PALETTE.sand,
  w: PALETTE.cream,
  r: PALETTE.red,
};

/** Corpo dell'avvoltoio (colonne 6-9 della metà sinistra, la 9 è l'asse): testa, becco, collare, ventre. */
const VULTURE_BODY_COLUMNS: string[] = ["....", "..kk", ".kRR", ".kyR", ".kkN", ".kww", "kwvv", "kvav", "kvvv", ".kvv", "..kk", "...."];

/** Metà dell'avvoltoio: le ali (colonne 0-5) della posa del pipistrello e il corpo dell'avvoltoio. */
function composeVultureHalf(batHalf: string[]): string[] {
  return batHalf.map((row, rowIndex) => {
    const bodyColumns = VULTURE_BODY_COLUMNS[rowIndex] ?? "....";
    const columns = [...row];
    for (let column = 0; column < bodyColumns.length; column++) {
      const bodyKey = bodyColumns[column]!;
      if (bodyKey !== ".") {
        columns[6 + column] = bodyKey;
      } else if (column >= 1 && "vrwa".includes(row[6 + column]!)) {
        columns[6 + column] = "."; // via il corpo del pipistrello
      }
    }
    return columns.join("");
  });
}

function registerVulture(spriteManager: SpriteManager): void {
  const pose = (name: string): string[] => mirrorHalf(composeVultureHalf(BAT_HALVES[name]!));
  const up = pose("wingsUp");
  const mid = pose("wingsMid");
  const down = pose("wingsDown");
  const folded = pose("folded");
  // preparazione: ali spalancate e occhi che si accendono (arancio)
  const screech = up.map((row) => row.split("y").join("o"));
  const hurtGrid = createGrid(up[0]!.length, up.length);
  stampRows(hurtGrid, mid);
  for (const [x, y] of [[2, 0], [16, 1], [0, 3]] as const) {
    setPixel(hurtGrid, x, y, "w", true);
  }
  const heap = [
    ...Array<string>(8).fill(".".repeat(19)),
    "....kkk.kRk.kkk....",
    "..kkavdkwwwkdvakk..",
    ".kavdddkvvvkdddvak.",
    "kkkkkkkkkkkkkkkkkkk",
  ];
  const frames: Record<string, string[]> = {
    vultureIdle1: up,
    vultureIdle2: down,
    vultureWalk1: up,
    vultureWalk2: mid,
    vultureWalk3: down,
    vultureAttackA: screech,
    vultureAttackB: folded,
    vultureAttackC: mid,
    vultureHurt: hurtGrid.map((row) => row.join("")),
    vultureHeap: heap,
  };
  for (const [spriteId, pixelRows] of Object.entries(frames)) {
    spriteManager.registerSprite(spriteId, pixelRows, VULTURE_COLORS, VULTURE_ANCHOR_X);
  }
}

/** Colonna d'ancoraggio dell'avvoltoio (hitbox 14 px centrata su 19). */
const VULTURE_ANCHOR_X = 3;

// ---------------------------------------------------------------------------
// Scorpione gigante (Fase 8): carapace bruno, chele, coda con il pungiglione rosso (forma procedurale, creatureTools.ts)
// ---------------------------------------------------------------------------

const SCORPION_COLORS: Record<string, string> = {
  k: PALETTE.black,
  d: PALETTE.earth,
  m: PALETTE.wood,
  l: PALETTE.woodLight,
  w: PALETTE.cream,
  e: PALETTE.red,
  r: PALETTE.flame,
};

function registerScorpion(spriteManager: SpriteManager): void {
  const pose = (name: ScorpionPose): string[] => composeScorpion(name);
  registerCreature(
    spriteManager,
    "scorpion",
    {
      Idle1: pose("stand"),
      Idle2: pose("breath"),
      Walk1: pose("walk1"),
      Walk2: pose("walk2"),
      Walk3: pose("walk3"),
      AttackA: pose("raise"),
      AttackB: pose("strike"),
      AttackC: pose("recover"),
      Hurt: pose("hurt"),
      Heap: pose("lying"),
    },
    SCORPION_COLORS,
    4
  );
}

/** Registra gli sprite di tutti i nemici. */
export function registerEnemySprites(spriteManager: SpriteManager): void {
  SPECS.forEach((spec) => registerHumanoid(spriteManager, spec));
  registerBat(spriteManager);
  registerWolf(spriteManager);
  registerSlime(spriteManager, "slime", 16, 12, 1);
  registerSlime(spriteManager, "slimeSmall", 12, 9, 1);
  registerVulture(spriteManager);
  registerScorpion(spriteManager);
}
