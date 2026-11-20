import type { LevelDefinition, ThemeId } from "../types/LevelTypes";
import { PALETTE } from "./gameConfig";

/** Colori usati per disegnare il terreno di ogni ambientazione. */
export const THEME_STYLES: Record<
  ThemeId,
  { skyColor: string; groundTopColor: string; groundFillColor: string; groundDetailColor: string }
> = {
  forest: {
    skyColor: PALETTE.darkBlue,
    groundTopColor: PALETTE.green,
    groundFillColor: PALETTE.darkGreen,
    groundDetailColor: PALETTE.black,
  },
  castle: {
    skyColor: PALETTE.darkBlue,
    groundTopColor: PALETTE.lightGray,
    groundFillColor: PALETTE.gray,
    groundDetailColor: PALETTE.darkBlue,
  },
  dungeon: {
    skyColor: PALETTE.black,
    groundTopColor: PALETTE.gray,
    groundFillColor: PALETTE.purple,
    groundDetailColor: PALETTE.black,
  },
};

/**
 * Elenco dei livelli. Per crearne uno nuovo basta aggiungere un oggetto
 * a questo array (con id successivo): il motore non va modificato.
 *
 * Misure utili per progettare: il giocatore salta circa 50 px in altezza e
 * supera abissi larghi al massimo ~36 px. Il terreno sta a y = 200.
 * Le coordinate sono l'angolo in alto a sinistra; gli oggetti sono 8x8.
 */
export const LEVEL_CONFIG: LevelDefinition[] = [
  {
    id: 1,
    name: "Foresta Oscura",
    theme: "forest",
    width: 1536,
    height: 240,
    playerStart: { x: 24, y: 176 },
    platforms: [
      // terreno con tre abissi (x 380-416, 760-796, 1100-1136)
      { x: 0, y: 200, width: 380, height: 40 },
      { x: 416, y: 200, width: 344, height: 40 },
      { x: 796, y: 200, width: 304, height: 40 },
      { x: 1136, y: 200, width: 400, height: 40 },
      // piattaforme sospese
      { x: 150, y: 164, width: 48, height: 8, oneWay: true },
      { x: 215, y: 128, width: 48, height: 8, oneWay: true },
      { x: 290, y: 164, width: 48, height: 8, oneWay: true },
      { x: 480, y: 164, width: 48, height: 8, oneWay: true },
      { x: 640, y: 164, width: 48, height: 8, oneWay: true },
      { x: 700, y: 128, width: 56, height: 8, oneWay: true },
      { x: 850, y: 164, width: 48, height: 8, oneWay: true },
      { x: 900, y: 128, width: 40, height: 8, oneWay: true },
      { x: 1180, y: 164, width: 48, height: 8, oneWay: true },
      { x: 1250, y: 128, width: 48, height: 8, oneWay: true },
      // ceppi e rocce solidi
      { x: 560, y: 168, width: 32, height: 32 },
      { x: 960, y: 172, width: 28, height: 28 },
    ],
    enemies: [
      { type: "skeleton", position: { x: 250, y: 176 } },
      { type: "goblin", position: { x: 520, y: 184 } },
      { type: "soldier", position: { x: 700, y: 176 } },
      { type: "goblin", position: { x: 900, y: 184 } },
      { type: "skeleton", position: { x: 1200, y: 176 } },
      { type: "goblin", position: { x: 1340, y: 184 } },
      { type: "soldier", position: { x: 1420, y: 176 } },
    ],
    items: [
      { type: "healthPotion", position: { x: 440, y: 192 } },
      { type: "scoreCoin", position: { x: 235, y: 120 } },
      { type: "collectible", position: { x: 728, y: 120 } },
      { type: "scoreCoin", position: { x: 915, y: 120 } },
      { type: "healthPotion", position: { x: 1160, y: 192 } },
      { type: "scoreCoin", position: { x: 1270, y: 120 } },
    ],
    completion: { kind: "reachExit", exitX: 1500 },
    hasBoss: false,
  },
  {
    id: 2,
    name: "Castello Medievale",
    theme: "castle",
    width: 1792,
    height: 240,
    playerStart: { x: 24, y: 176 },
    platforms: [
      // terreno con tre abissi (x 448-484, 900-936, 1400-1436)
      { x: 0, y: 200, width: 448, height: 40 },
      { x: 484, y: 200, width: 416, height: 40 },
      { x: 936, y: 200, width: 464, height: 40 },
      { x: 1436, y: 200, width: 356, height: 40 },
      // piattaforme sospese
      { x: 150, y: 164, width: 48, height: 8, oneWay: true },
      { x: 520, y: 164, width: 48, height: 8, oneWay: true },
      { x: 700, y: 160, width: 48, height: 8, oneWay: true },
      { x: 760, y: 124, width: 48, height: 8, oneWay: true },
      { x: 1100, y: 164, width: 48, height: 8, oneWay: true },
      { x: 1160, y: 128, width: 48, height: 8, oneWay: true },
      { x: 1520, y: 164, width: 48, height: 8, oneWay: true },
      { x: 1590, y: 128, width: 56, height: 8, oneWay: true },
      // gradini e blocchi di pietra
      { x: 300, y: 176, width: 24, height: 24 },
      { x: 324, y: 152, width: 24, height: 48 },
      { x: 620, y: 168, width: 32, height: 32 },
      { x: 1000, y: 184, width: 24, height: 16 },
      { x: 1024, y: 168, width: 24, height: 32 },
      { x: 1048, y: 152, width: 24, height: 48 },
      { x: 1250, y: 176, width: 48, height: 24 },
    ],
    enemies: [
      { type: "soldier", position: { x: 200, y: 176 } },
      { type: "skeleton", position: { x: 560, y: 176 } },
      { type: "soldier", position: { x: 700, y: 176 } },
      { type: "goblin", position: { x: 820, y: 184 } },
      { type: "goblin", position: { x: 1100, y: 184 } },
      { type: "skeleton", position: { x: 1320, y: 176 } },
      { type: "soldier", position: { x: 1550, y: 176 } },
      { type: "goblin", position: { x: 1680, y: 184 } },
    ],
    items: [
      { type: "scoreCoin", position: { x: 170, y: 156 } },
      { type: "healthPotion", position: { x: 500, y: 192 } },
      { type: "scoreCoin", position: { x: 780, y: 116 } },
      { type: "collectible", position: { x: 1052, y: 144 } },
      { type: "scoreCoin", position: { x: 1180, y: 120 } },
      { type: "healthPotion", position: { x: 1450, y: 192 } },
      { type: "scoreCoin", position: { x: 1610, y: 120 } },
    ],
    completion: { kind: "reachExit", exitX: 1750 },
    hasBoss: false,
  },
  {
    id: 3,
    name: "Dungeon Sotterraneo",
    theme: "dungeon",
    width: 1536,
    height: 240,
    playerStart: { x: 24, y: 176 },
    platforms: [
      // terreno con due abissi (x 400-436, 900-936); dopo x 1200 c'è l'arena del boss
      { x: 0, y: 200, width: 400, height: 40 },
      { x: 436, y: 200, width: 464, height: 40 },
      { x: 936, y: 200, width: 600, height: 40 },
      { x: 140, y: 164, width: 48, height: 8, oneWay: true },
      { x: 205, y: 128, width: 48, height: 8, oneWay: true },
      { x: 500, y: 164, width: 48, height: 8, oneWay: true },
      { x: 560, y: 128, width: 48, height: 8, oneWay: true },
      { x: 760, y: 164, width: 48, height: 8, oneWay: true },
      { x: 1000, y: 164, width: 40, height: 8, oneWay: true },
      { x: 1060, y: 128, width: 48, height: 8, oneWay: true },
      { x: 300, y: 176, width: 24, height: 24 },
      { x: 650, y: 168, width: 32, height: 32 },
    ],
    enemies: [
      { type: "skeleton", position: { x: 220, y: 176 } },
      { type: "skeleton", position: { x: 480, y: 176 } },
      { type: "goblin", position: { x: 600, y: 184 } },
      { type: "skeleton", position: { x: 700, y: 176 } },
      { type: "soldier", position: { x: 820, y: 176 } },
      { type: "goblin", position: { x: 1040, y: 184 } },
      { type: "skeleton", position: { x: 1060, y: 176 } },
    ],
    items: [
      { type: "healthPotion", position: { x: 440, y: 192 } },
      { type: "scoreCoin", position: { x: 225, y: 120 } },
      { type: "scoreCoin", position: { x: 580, y: 120 } },
      { type: "collectible", position: { x: 780, y: 156 } },
      { type: "healthPotion", position: { x: 960, y: 192 } },
      { type: "scoreCoin", position: { x: 1080, y: 120 } },
      { type: "healthPotion", position: { x: 1230, y: 192 } },
    ],
    completion: { kind: "defeatBoss" },
    hasBoss: true,
    bossSpawn: { x: 1320, y: 160 },
    bossArenaStartX: 1200,
  },
];
