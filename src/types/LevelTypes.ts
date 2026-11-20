import type { EnemyTypeId } from "./EntityTypes";
import type { Rectangle, Vector2 } from "./GameTypes";

/** Ambientazioni disponibili. */
export type ThemeId = "forest" | "castle" | "dungeon";

/** Tipi di oggetto raccoglibile. */
export type ItemTypeId = "healthPotion" | "scoreCoin" | "collectible";

/**
 * Piattaforma del livello. Se oneWay è true si può attraversare dal basso
 * e ci si può salire sopra (piattaforme sospese); altrimenti è solida.
 */
export interface PlatformDefinition extends Rectangle {
  oneWay?: boolean;
}

export interface EnemySpawnDefinition {
  type: EnemyTypeId;
  position: Vector2;
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
}
