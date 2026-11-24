import type { EnemyTypeId, WeaponId } from "./EntityTypes";
import type { Rectangle, Vector2 } from "./GameTypes";

/** Ambientazioni disponibili. */
export type ThemeId = "forest" | "castle" | "dungeon" | "swamp" | "ice" | "wasteland" | "tower";

/** Tessiture del terreno disponibili (disegnate da TerrainRenderer). */
export type TerrainTexture = "grassAndEarth" | "stoneTiles" | "dungeonBricks" | "swampMud" | "snowAndRock" | "runeStone";

/** Aspetto del terreno di un'ambientazione. Ogni colore deve essere della palette. */
export interface ThemeStyle {
  terrainTexture: TerrainTexture;
  /** Righe della superficie del terreno, dall'alto (luce, colore, ombra). */
  surfaceColors: readonly [string, string, string];
  /** Corpo del terreno: luce, faccia, ombra, fuga tra le pietre. */
  fillColors: readonly [string, string, string, string];
  /** Piattaforme sospese: bordo superiore, corpo, bordo inferiore. */
  ledgeColors: readonly [string, string, string];
  /** Dettagli (sassi, muschio...): scuro e chiaro. */
  detailColors: readonly [string, string];
  /** Colori dell'acqua (se omessi: acqua blu). Fondo dall'alto al basso, velo, superficie (ciclo dei colori). */
  waterColors?: { depth: readonly string[]; veil: string; surface: readonly string[] };
}

/** Tipi di oggetto raccoglibile. */
export type ItemTypeId =
  | "healthPotion"
  | "scoreCoin"
  | "collectible"
  | "powerBerserk"
  | "powerSpeed"
  | "powerShield"
  | "powerFire"
  | "powerRegeneration"
  | "quiver"
  | "powerPoison"
  | "powerFrost"
  | "powerShock";

/**
 * Piattaforma del livello. Se oneWay è true si può attraversare dal basso
 * e ci si può salire sopra (piattaforme sospese); altrimenti è solida.
 */
export interface PlatformDefinition extends Rectangle {
  oneWay?: boolean;
  /** Vero per le piattaforme mobili (aggiunte dal LevelManager, non scritte nei livelli). */
  isMoving?: boolean;
}

/**
 * Piattaforma mobile (sempre attraversabile dal basso): va avanti e indietro tra la posizione
 * iniziale e quella spostata di (travelX, travelY), rallentando agli estremi. Trasporta chi ci sta sopra.
 */
export interface MovingPlatformDefinition extends Rectangle {
  travelX: number;
  travelY: number;
  /** Durata (ms) di un'andata e ritorno. */
  periodMs: number;
  /** Sfasamento (ms) per non far muovere insieme piattaforme vicine. */
  phaseOffsetMs?: number;
}

/**
 * Pericoli e zone speciali (vedi HAZARD_CONFIG):
 * - spikes: spuntoni, feriscono e respingono al contatto;
 * - water: acqua, rallenta, alleggerisce la caduta e permette di risalire a nuoto;
 * - ice: ghiaccio, la superficie su cui si cammina è scivolosa.
 */
export type HazardKind = "spikes" | "water" | "ice";

/** Zona di pericolo: rettangolo nel mondo (per gli spuntoni e il ghiaccio, appoggiato sulla superficie). */
export interface HazardDefinition extends Rectangle {
  kind: HazardKind;
}

export interface EnemySpawnDefinition {
  type: EnemyTypeId;
  position: Vector2;
  /** Nemico d'élite: più salute, più danno, più punti, alone dorato. */
  elite?: boolean;
  /** Arma lasciata a terra quando muore (solo per i nemici d'élite). */
  weaponDrop?: WeaponId;
}

/** Forziere: si apre colpendolo e lascia un'arma. y = superficie - CHEST_SIZE.height. */
export interface ChestSpawnDefinition {
  position: Vector2;
  weaponId: WeaponId;
}

export interface ItemSpawnDefinition {
  type: ItemTypeId;
  position: Vector2;
}

/** Condizione per terminare il livello. */
export type CompletionCondition =
  | { kind: "reachExit"; exitX: number }
  | { kind: "defeatBoss" };

/** Descrizione completa di un livello: aggiungerne uno = aggiungere dati. */
export interface LevelDefinition {
  id: number;
  name: string;
  theme: ThemeId;
  /** Dimensioni della mappa in pixel. */
  width: number;
  height: number;
  playerStart: Vector2;
  platforms: PlatformDefinition[];
  enemies: EnemySpawnDefinition[];
  items: ItemSpawnDefinition[];
  completion: CompletionCondition;
  hasBoss: boolean;
  /** Quale boss affrontare (chiave di BOSS_CATALOG). Se omesso si usa il Cavaliere Nero. */
  bossId?: string;
  /** Posizione (angolo in alto a sinistra) del boss, obbligatoria se hasBoss è true. */
  bossSpawn?: Vector2;
  /** Quando il giocatore supera questa x si chiude un cancello alle sue spalle e il boss si attiva. */
  bossArenaStartX?: number;
  /** Pericoli e zone speciali (facoltativi). */
  hazards?: HazardDefinition[];
  /** Piattaforme mobili (facoltative). */
  movingPlatforms?: MovingPlatformDefinition[];
  /** Forzieri con un'arma (facoltativi). */
  chests?: ChestSpawnDefinition[];
}
