import { CHARACTER_CONFIG, DEFAULT_CHARACTER_ID } from "../../config/characterConfig";
import { PALETTE } from "../../config/gameConfig";
import { WEAPON_CONFIG, WEAPON_ICON_SIZE } from "../../config/weaponConfig";
import type { CharacterId, WeaponId } from "../../types/EntityTypes";
import type { SpriteManager } from "../SpriteManager";
import { drawAxe, drawBow, drawCrossbow, drawMace, drawSpear, type WeaponDrawer } from "./weaponShapes";
import { addOutline, createGrid, drawSlashArc, drawSword, remapSpriteKeys, setPixel, stampRows, type BladeKeys, type PixelGrid } from "./spriteTools";

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

interface SwordPose {
  tipX: number;
  tipY: number;
  arcs?: Array<{ radius: number; startDegrees: number; endDegrees: number }>;
  bodyDrop?: number;
  /** Larghezza del frame (se omessa ATTACK_SPRITE_WIDTH). */
  frameWidth?: number;
  /** Vero per le pose disegnate per un'arma precisa: la lunghezza dell'arma non viene scalata. */
  fixedLength?: boolean;
}

/**
 * Aspetto di un'arma in mano al cavaliere. Le pose della spada valgono per tutte le armi:
 * la punta si avvicina o si allontana dalla mano secondo lengthScale (anche le scie).
 */
interface WeaponVisual {
  /** Lunghezza rispetto alla spada (1 = spada). */
  lengthScale: number;
  draw: WeaponDrawer;
  /** Pose d'attacco registrate per quest'arma (anche in versione accovacciata). */
  attackPoses: Record<string, SwordPose>;
  /** Icona 16x16 (oggetto a terra e HUD): impugnatura e punta. */
  icon: { handX: number; handY: number; tipX: number; tipY: number };
  /** Direzione dell'arma a riposo rispetto alla mano (se omessa: dritta verso l'alto, come la spada). */
  restTip?: { offsetX: number; offsetY: number };
}

const drawKnightSword: WeaponDrawer = (grid, handX, handY, tipX, tipY) => drawSword(grid, handX, handY, tipX, tipY, SWORD_KEYS);

/**
 * Arma usata dalle funzioni compose* mentre si compongono i frame (vedi registerKnightSprites):
 * così l'elenco dei frame si scrive una volta sola e vale per tutte le armi.
 */
let activeVisual: WeaponVisual | null = null;
/** Parte superiore del personaggio che si sta componendo (testa propria + busto del cavaliere). */
let activeBodyRows: string[] = BODY_ROWS;

/** Disegna l'arma attiva dalla mano verso la punta della posa (accorciata o allungata). */
function drawActiveWeapon(grid: PixelGrid, handX: number, handY: number, tipX: number, tipY: number, fixedLength = false): void {
  const visual = activeVisual;
  if (visual === null) {
    drawKnightSword(grid, handX, handY, tipX, tipY);
    return;
  }
  const scale = fixedLength ? 1 : visual.lengthScale;
  visual.draw(grid, handX, handY, Math.round(handX + (tipX - handX) * scale), Math.round(handY + (tipY - handY) * scale));
}

/** L'arma a riposo: dritta verso l'alto, o nella direzione restTip dell'arma attiva (arco, balestra). */
function drawRestingWeapon(grid: PixelGrid, handY: number): void {
  const restTip = activeVisual?.restTip;
  if (restTip === undefined) {
    drawActiveWeapon(grid, HAND_X, handY, HAND_X + 1, handY - 16);
  } else {
    drawActiveWeapon(grid, HAND_X, handY, HAND_X + restTip.offsetX, handY + restTip.offsetY, true);
  }
}

/**
 * Unisce parte superiore e gambe. bodyDrop = pixel di cui abbassare la parte superiore
 * (respiro, passo). withSword = arma a riposo in mano (la spada, o l'arma che si sta componendo).
 */
function composeKnightFrame(legRows: string[], bodyDrop: number, withSword = true): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  stampRows(grid, legRows, 0, BODY_ROWS.length);
  stampRows(grid, activeBodyRows, 0, bodyDrop);
  if (withSword) {
    drawRestingWeapon(grid, HAND_Y + bodyDrop);
  }
  return grid.map((row) => row.join(""));
}

/** Suffisso delle varianti accovacciate dei frame d'attacco (es. "knightAttack1ACrouch"). */
export const KNIGHT_CROUCH_SUFFIX = "Crouch";

/** Gambe piegate in basso, busto (senza le ultime 3 righe) abbassato di CROUCH_BODY_DROP pixel. */
const CROUCH_BODY_DROP = KNIGHT_HEIGHT - KNIGHT_LEGS_CROUCH.length - BODY_ROWS.length + 3;

function stampCrouchedBody(grid: PixelGrid, shiftX: number): void {
  stampRows(grid, KNIGHT_LEGS_CROUCH, shiftX, KNIGHT_HEIGHT - KNIGHT_LEGS_CROUCH.length);
  stampRows(grid, activeBodyRows.slice(0, activeBodyRows.length - 3), shiftX, CROUCH_BODY_DROP);
}

/** Cavaliere accovacciato con la spada dritta davanti. */
function composeCrouchFrame(): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  stampCrouchedBody(grid, 0);
  drawRestingWeapon(grid, HAND_Y + CROUCH_BODY_DROP);
  return grid.map((row) => row.join(""));
}

/**
 * Frame di attacco largo 44 pixel: corpo a sinistra, arma e scia (bianca e azzurra) a destra.
 * crouched = variante accovacciata: busto e arma si abbassano, la punta non scende sotto i piedi.
 */
function composeAttackFrame(pose: SwordPose, crouched = false): string[] {
  const grid = createGrid(pose.frameWidth ?? ATTACK_SPRITE_WIDTH, KNIGHT_HEIGHT);
  const arcScale = pose.fixedLength === true || activeVisual === null ? 1 : activeVisual.lengthScale;
  let handY = HAND_Y + (pose.bodyDrop ?? 0);
  let tipY = pose.tipY;
  if (crouched) {
    stampCrouchedBody(grid, 0);
    handY = HAND_Y + CROUCH_BODY_DROP;
    tipY = Math.min(KNIGHT_HEIGHT - 1, pose.tipY + CROUCH_BODY_DROP);
  } else {
    stampRows(grid, composeKnightFrame(LEGS_STAND, pose.bodyDrop ?? 0, false));
  }
  for (const arc of pose.arcs ?? []) {
    const radius = Math.max(6, Math.round(arc.radius * arcScale));
    drawSlashArc(grid, HAND_X, handY, radius, arc.startDegrees, arc.endDegrees, "a");
    drawSlashArc(grid, HAND_X, handY, radius - 1, arc.startDegrees, arc.endDegrees, "c");
  }
  drawActiveWeapon(grid, HAND_X, handY, pose.tipX, tipY, pose.fixedLength === true);
  return grid.map((row) => row.join(""));
}

/** Cavaliere colpito: indietreggia con la spada abbassata e stelline d'impatto. */
function composeHurtFrame(): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  stampRows(grid, LEGS_FALL, 0, BODY_ROWS.length);
  stampRows(grid, activeBodyRows, -1, 1);
  drawActiveWeapon(grid, HAND_X - 1, HAND_Y + 1, KNIGHT_WIDTH - 1, KNIGHT_HEIGHT - 3);
  for (const [x, y] of [[3, 2], [2, 4], [4, 1], [6, 0], [1, 7], [20, 3], [22, 5]] as const) {
    setPixel(grid, x, y, "y", true);
  }
  return grid.map((row) => row.join(""));
}

/** Schivata: cavaliere accovacciato dietro lo scudo. shiftX sposta il corpo a destra. */
function composeDodgeFrame(shiftX: number): string[] {
  const grid = createGrid(KNIGHT_WIDTH, KNIGHT_HEIGHT);
  stampCrouchedBody(grid, shiftX);
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

/** Pose della spada nei frame d'attacco (registrate anche in versione accovacciata). */
const ATTACK_POSES: Record<string, SwordPose> = {
  // attacco leggero 1: dall'alto verso il basso-avanti
  knightAttack1A: { tipX: 21, tipY: 1, bodyDrop: 1 },
  knightAttack1B: { tipX: 40, tipY: 15, arcs: [{ radius: 20, startDegrees: -80, endDegrees: -5 }] },
  knightAttack1C: { tipX: 33, tipY: 28, arcs: [{ radius: 20, startDegrees: 5, endDegrees: 50 }] },
  // attacco leggero 2: dal basso verso l'alto
  knightAttack2A: { tipX: 30, tipY: 28, bodyDrop: 1 },
  knightAttack2B: { tipX: 40, tipY: 18, arcs: [{ radius: 20, startDegrees: 75, endDegrees: 5 }] },
  knightAttack2C: { tipX: 33, tipY: 4, arcs: [{ radius: 20, startDegrees: -5, endDegrees: -55 }] },
  // attacco leggero 3 (finale): fendente in quattro tempi
  knightAttack3A: { tipX: 22, tipY: 0, bodyDrop: 1 },
  knightAttack3B: { tipX: 36, tipY: 5, arcs: [{ radius: 22, startDegrees: -85, endDegrees: -30 }] },
  knightAttack3C: { tipX: 41, tipY: 17, arcs: [{ radius: 22, startDegrees: -30, endDegrees: 20 }] },
  knightAttack3D: { tipX: 35, tipY: 29, arcs: [{ radius: 22, startDegrees: 20, endDegrees: 80 }] },
  // attacco pesante: carica lunga e fendente ampio
  knightHeavyA: { tipX: 16, tipY: 1, bodyDrop: 1 },
  knightHeavyB: { tipX: 21, tipY: 0 },
  knightHeavyC: {
    tipX: 42,
    tipY: 12,
    arcs: [
      { radius: 23, startDegrees: -88, endDegrees: -10 },
      { radius: 18, startDegrees: -80, endDegrees: -20 },
    ],
  },
  knightHeavyD: {
    tipX: 38,
    tipY: 29,
    arcs: [
      { radius: 23, startDegrees: 10, endDegrees: 80 },
      { radius: 18, startDegrees: 20, endDegrees: 75 },
    ],
  },  // colpo in picchiata (Fase 3): arma alzata, poi puntata in basso davanti ai piedi
  knightPlungeA: { tipX: 20, tipY: 0, bodyDrop: 1 },
  knightPlungeB: { tipX: 21, tipY: 29, arcs: [{ radius: 10, startDegrees: 60, endDegrees: 110 }] },
};

/**
 * Pose delle abilità (Fase 5): arma alzata, colpo a terra, affondo in avanti. Valgono per tutte le armi
 * (la lunghezza segue l'arma), quindi un'abilità si può usare con qualsiasi arma in mano.
 */
const ABILITY_POSES: Record<string, SwordPose> = {
  knightAbilityRaise: { tipX: 20, tipY: 0, bodyDrop: 1 },
  knightAbilitySlam: { tipX: 34, tipY: 27, arcs: [{ radius: 16, startDegrees: 20, endDegrees: 80 }] },
  knightAbilityThrust: { tipX: 38, tipY: 17, arcs: [{ radius: 18, startDegrees: -15, endDegrees: 15 }] },
};

/** Pose della lancia: affondi orizzontali e un fendente ampio (frame larghi 58 pixel). */
const SPEAR_FRAME_WIDTH = 58;
const SPEAR_POSES: Record<string, SwordPose> = {
  knightSpearThrustA: { tipX: 34, tipY: 17, bodyDrop: 1, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearThrustB: { tipX: 54, tipY: 18, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearThrustC: { tipX: 46, tipY: 18, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearSweepA: { tipX: 27, tipY: 0, bodyDrop: 1, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearSweepB: { tipX: 45, tipY: 8, arcs: [{ radius: 26, startDegrees: -75, endDegrees: -15 }], frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearSweepC: { tipX: 45, tipY: 25, arcs: [{ radius: 26, startDegrees: -10, endDegrees: 30 }], frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearSweepD: { tipX: 38, tipY: 29, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearChargeA: { tipX: 31, tipY: 16, bodyDrop: 1, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearChargeB: { tipX: 29, tipY: 17, bodyDrop: 1, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightSpearLunge: { tipX: 57, tipY: 18, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightPlungeA: { tipX: 24, tipY: 0, bodyDrop: 1, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
  knightPlungeB: { tipX: 21, tipY: 29, frameWidth: SPEAR_FRAME_WIDTH, fixedLength: true },
};

/** Pose delle armi a distanza (Fase 2): mira e rinculo, lancio (braccio indietro e avanti). */
const RANGED_POSES: Record<string, SwordPose> = {
  knightAimA: { tipX: 32, tipY: 17 },
  knightAimB: { tipX: 30, tipY: 16, bodyDrop: 1 },
  knightThrowA: { tipX: 9, tipY: 4, bodyDrop: 1 },
  knightThrowB: { tipX: 32, tipY: 11, arcs: [{ radius: 14, startDegrees: -100, endDegrees: -30 }] },
};

/** Aspetto di ogni arma. Il suffisso degli sprite è WEAPON_CONFIG[id].spriteSuffix. */
const WEAPON_VISUALS: Record<WeaponId, WeaponVisual> = {
  sword: { lengthScale: 1, draw: drawKnightSword, attackPoses: ATTACK_POSES, icon: { handX: 3, handY: 12, tipX: 13, tipY: 2 } },
  dagger: { lengthScale: 0.55, draw: drawKnightSword, attackPoses: ATTACK_POSES, icon: { handX: 5, handY: 11, tipX: 11, tipY: 5 } },
  spear: { lengthScale: 1.25, draw: drawSpear, attackPoses: SPEAR_POSES, icon: { handX: 6, handY: 10, tipX: 14, tipY: 2 } },
  axe: { lengthScale: 0.85, draw: drawAxe, attackPoses: ATTACK_POSES, icon: { handX: 3, handY: 13, tipX: 10, tipY: 6 } },
  mace: { lengthScale: 0.8, draw: drawMace, attackPoses: ATTACK_POSES, icon: { handX: 3, handY: 13, tipX: 10, tipY: 6 } },
  bow: { lengthScale: 1, draw: drawBow, attackPoses: RANGED_POSES, icon: { handX: 3, handY: 8, tipX: 13, tipY: 8 }, restTip: { offsetX: 12, offsetY: -1 } },
  crossbow: { lengthScale: 1, draw: drawCrossbow, attackPoses: RANGED_POSES, icon: { handX: 2, handY: 10, tipX: 13, tipY: 6 } },
  throwingKnives: { lengthScale: 0.45, draw: drawKnightSword, attackPoses: RANGED_POSES, icon: { handX: 5, handY: 11, tipX: 11, tipY: 5 } },
  javelin: { lengthScale: 1.1, draw: drawSpear, attackPoses: RANGED_POSES, icon: { handX: 6, handY: 10, tipX: 14, tipY: 2 } },
};

/** Icona di un'arma: l'arma in diagonale con il contorno nero. */
function composeWeaponIcon(visual: WeaponVisual): string[] {
  const grid = createGrid(WEAPON_ICON_SIZE - 2, WEAPON_ICON_SIZE - 2);
  const icon = visual.icon;
  visual.draw(grid, icon.handX - 1, icon.handY - 1, icon.tipX - 1, icon.tipY - 1);
  const padded = createGrid(WEAPON_ICON_SIZE, WEAPON_ICON_SIZE);
  stampRows(padded, grid.map((row) => row.join("")), 1, 1);
  return addOutline(padded.map((row) => row.join("")), "k");
}

/** Righe della testa (elmo o cappuccio) in cima a BODY_ROWS: un personaggio può sostituirle. */
const HEAD_ROW_COUNT = 12;

/**
 * Aspetto di un personaggio (Fase 4): stesso corpo del cavaliere, colori propri e, se serve, una testa propria.
 * Le chiavi dei colori sono quelle del cavaliere (armatura d g s w, sopravveste m r o, scudo N B L) più quelle
 * della testa.
 */
interface CharacterVisual {
  colors: Record<string, string>;
  headRows?: string[];
}

/** Ranger: cappuccio e mantello verdi, cuoio al posto dell'armatura (f, F = volto; h, H, i = cappuccio). */
const RANGER_HEAD_ROWS: string[] = [
  "........................",
  "..........kkkk..........",
  "........kkhHHHkk........",
  ".......khHHHHHHik.......",
  "......khHHHHHHHHik......",
  ".....khhHHHkkkkkHik.....",
  ".....khhHHkfFFFFkHk.....",
  "......khHkfFFFFkFkk.....",
  "......khhkfFFFFFFFk.....",
  ".......khkffFFFFFk......",
  "........khkkffffk.......",
  ".........khhhhhhk.......",
];

/** Berserker: elmo di ferro con le corna (x, X) e barba rossa (p, P). */
const BERSERKER_HEAD_ROWS: string[] = [
  "......kk......kk........",
  ".....kxXk....kXxk.......",
  ".....kxXk....kXxk.......",
  "......kxXkkkkkXxk.......",
  ".......kkwwsssskk.......",
  "........kwwsssssgk......",
  "........kwssssssggk.....",
  "........kssssskkkkk.....",
  "........kgsssskFkFk.....",
  "........kgsssPPPPPpk....",
  "........kdgsPPPPPPpk....",
  ".........kdgkPPPPpk.....",
]

const CHARACTER_VISUALS: Record<CharacterId, CharacterVisual> = {
  knight: { colors: {} },
  ranger: {
    colors: {
      d: PALETTE.earth,
      g: PALETTE.wood,
      s: PALETTE.woodLight,
      w: PALETTE.sand,
      m: PALETTE.pine,
      r: PALETTE.darkGreen,
      o: PALETTE.green,
      N: PALETTE.deepForest,
      B: PALETTE.pine,
      L: PALETTE.darkGreen,
      h: PALETTE.pine,
      H: PALETTE.darkGreen,
      i: PALETTE.green,
      f: PALETTE.skinDark,
      F: PALETTE.skin,
    },
    headRows: RANGER_HEAD_ROWS,
  },
  berserker: {
    colors: {
      d: PALETTE.stoneShadow,
      g: PALETTE.stone,
      s: PALETTE.stoneLight,
      w: PALETTE.stonePale,
      m: PALETTE.earth,
      r: PALETTE.wood,
      o: PALETTE.woodLight,
      N: PALETTE.emberDark,
      B: PALETTE.ember,
      L: PALETTE.flame,
      x: PALETTE.cream,
      X: PALETTE.stonePale,
      F: PALETTE.skin,
      p: PALETTE.ember,
      P: PALETTE.flame,
    },
    headRows: BERSERKER_HEAD_ROWS,
  },
  paladin: {
    // armatura d'oro, sopravveste blu, scudo d'argento, pennacchio bianco (u, x, X)
    colors: {
      d: PALETTE.bronze,
      g: PALETTE.gold,
      s: PALETTE.goldLight,
      w: PALETTE.yellow,
      m: PALETTE.navy,
      r: PALETTE.blue,
      o: PALETTE.lightBlue,
      N: PALETTE.gray,
      B: PALETTE.lightGray,
      L: PALETTE.white,
      u: PALETTE.lightGray,
      x: PALETTE.white,
      X: PALETTE.iceWhite,
    },
    headRows: remapSpriteKeys(BODY_ROWS.slice(0, HEAD_ROW_COUNT), { m: "u", r: "x", o: "X" }),
  },
};

/** Parte superiore di un personaggio: la sua testa (se ne ha una) sopra il busto del cavaliere. */
function characterBodyRows(visual: CharacterVisual): string[] {
  return visual.headRows === undefined ? BODY_ROWS : [...visual.headRows, ...BODY_ROWS.slice(HEAD_ROW_COUNT)];
}

/** Frame (1 o 2) dell'attesa di un personaggio con la sua arma iniziale: anteprima nei menu. */
export function getCharacterPreviewFrameId(characterId: CharacterId, frame: 1 | 2): string {
  const character = CHARACTER_CONFIG[characterId];
  return `knightIdle${frame}${WEAPON_CONFIG[character.startingWeaponId].spriteSuffix}${character.spriteSuffix}`;
}

/**
 * Registra solo i due frame d'attesa di ogni personaggio (con la sua arma iniziale), per i menu:
 * la serie completa si registra quando si gioca con quel personaggio (registerKnightSprites).
 */
export function registerCharacterPreviews(spriteManager: SpriteManager): void {
  for (const [characterId, characterVisual] of Object.entries(CHARACTER_VISUALS) as Array<[CharacterId, CharacterVisual]>) {
    const weaponId = CHARACTER_CONFIG[characterId].startingWeaponId;
    const colors = { ...KNIGHT_COLORS, ...characterVisual.colors };
    activeVisual = WEAPON_VISUALS[weaponId];
    activeBodyRows = characterBodyRows(characterVisual);
    const frames = [composeKnightFrame(LEGS_STAND, 0), composeKnightFrame(LEGS_STAND, 1)];
    activeVisual = null;
    activeBodyRows = BODY_ROWS;
    frames.forEach((pixelRows, index) => {
      spriteManager.registerSprite(getCharacterPreviewFrameId(characterId, index === 0 ? 1 : 2), pixelRows, colors, KNIGHT_ANCHOR_X);
    });
  }
}

/**
 * Registra tutti gli sprite di un personaggio (il cavaliere se omesso) nello SpriteManager: una serie completa
 * per ogni arma, ognuna anche nella versione con il fuoco, più le icone delle armi.
 * Id di un frame: frame + "Crouch" (attacco da accovacciati) + suffisso dell'arma ("" per la spada)
 * + suffisso del personaggio ("" per il cavaliere) + "Fire".
 */
export function registerKnightSprites(spriteManager: SpriteManager, characterId: CharacterId = DEFAULT_CHARACTER_ID): void {
  const character = CHARACTER_CONFIG[characterId];
  const characterVisual = CHARACTER_VISUALS[characterId];
  const colors = { ...KNIGHT_COLORS, ...characterVisual.colors };
  const fireColors = { ...colors, b: KNIGHT_FIRE_COLORS.b!, v: KNIGHT_FIRE_COLORS.v!, a: KNIGHT_FIRE_COLORS.a!, c: KNIGHT_FIRE_COLORS.c! };
  for (const [weaponId, visual] of Object.entries(WEAPON_VISUALS) as Array<[WeaponId, WeaponVisual]>) {
    const weapon = WEAPON_CONFIG[weaponId];
    activeVisual = visual;
    activeBodyRows = characterBodyRows(characterVisual);
    const frames = composeKnightFrames(visual.attackPoses);
    activeVisual = null;
    activeBodyRows = BODY_ROWS;
    for (const [spriteId, pixelRows] of Object.entries(frames)) {
      const weaponSpriteId = `${spriteId}${weapon.spriteSuffix}${character.spriteSuffix}`;
      spriteManager.registerSprite(weaponSpriteId, pixelRows, colors, KNIGHT_ANCHOR_X);
      spriteManager.registerSprite(`${weaponSpriteId}${KNIGHT_FIRE_SUFFIX}`, pixelRows, fireColors, KNIGHT_ANCHOR_X);
    }
    spriteManager.registerSprite(weapon.iconSpriteId, composeWeaponIcon(visual), KNIGHT_COLORS);
  }
}

/** Tutti i frame del cavaliere con l'arma attiva (activeVisual). */
function composeKnightFrames(attackPoses: Record<string, SwordPose>): Record<string, string[]> {
  const frames: Record<string, string[]> = {
    knightIdle1: composeKnightFrame(LEGS_STAND, 0),
    knightIdle2: composeKnightFrame(LEGS_STAND, 1),
    knightWalk1: composeKnightFrame(LEGS_STRIDE, 1),
    knightWalk2: composeKnightFrame(LEGS_PASSING, 0),
    knightWalk3: composeKnightFrame(LEGS_STRIDE.map((row) => [...row].reverse().join("")), 1),
    knightJump: composeKnightFrame(LEGS_JUMP, 0),
    knightFall: composeKnightFrame(LEGS_FALL, 0),
    knightCrouch: composeCrouchFrame(),
    knightHurt: composeHurtFrame(),
    knightDodge1: composeDodgeFrame(0),
    knightDodge2: composeDodgeFrame(1),
    knightDeadFall: composeKnightFrame(LEGS_FALL, 2, false),
    knightDeadLie: composeLyingFrame(),
  };
  for (const [spriteId, pose] of Object.entries(ABILITY_POSES)) {
    frames[spriteId] = composeAttackFrame(pose);
  }
  for (const [spriteId, pose] of Object.entries(attackPoses)) {
    frames[spriteId] = composeAttackFrame(pose);
    frames[`${spriteId}${KNIGHT_CROUCH_SUFFIX}`] = composeAttackFrame(pose, true);
  }
  return frames;
}
