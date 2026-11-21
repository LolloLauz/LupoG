import { BOSS_CATALOG, BOSS_CONFIG, ENEMY_CONFIG } from "../config/enemyConfig";
import { LEVEL_CONFIG, THEME_STYLES } from "../config/levelConfig";
import { Boss } from "../entities/Boss";
import { Enemy } from "../entities/Enemy";
import { BackgroundRenderer } from "../rendering/BackgroundRenderer";
import { TerrainRenderer } from "../rendering/TerrainRenderer";
import type { Camera } from "../rendering/Camera";
import type { Renderer } from "../rendering/Renderer";
import type { GameObject } from "../entities/GameObject";
import type { HazardDefinition, LevelDefinition, MovingPlatformDefinition, PlatformDefinition } from "../types/LevelTypes";

/** Una piattaforma mobile: la definizione (posizione di partenza) e la piattaforma che si muove davvero. */
interface MovingPlatformState {
  definition: MovingPlatformDefinition;
  platform: PlatformDefinition;
}

/** Tolleranza (px) per considerare i piedi appoggiati su una piattaforma. */
const STANDING_TOLERANCE = 1;

/**
 * Carica i livelli da LEVEL_CONFIG, crea nemici e boss del livello e disegna il livello
 * (sfondo con BackgroundRenderer; terreno, porta d'uscita e cancello con TerrainRenderer).
 */
export class LevelManager {
  private currentLevel: LevelDefinition | null = null;
  private readonly backgroundRenderer = new BackgroundRenderer();
  private readonly terrainRenderer = new TerrainRenderer();
  /** Piattaforme del livello più eventuali elementi aggiunti durante il gioco (cancello dell'arena). */
  private activePlatforms: PlatformDefinition[] = [];
  private movingPlatforms: MovingPlatformState[] = [];
  private isArenaLocked = false;

  /** Vero se esiste un livello con questo id. */
  public hasLevel(levelId: number): boolean {
    return LEVEL_CONFIG.some((candidate) => candidate.id === levelId);
  }

  public loadLevel(levelId: number): void {
    const level = LEVEL_CONFIG.find((candidate) => candidate.id === levelId);
    if (level === undefined) {
      throw new Error(`Livello non trovato: ${levelId}`);
    }
    this.loadLevelDefinition(level);
  }

  /**
   * Carica una definizione di livello qualsiasi, anche fuori da LEVEL_CONFIG (test, livelli di prova).
   * Il gioco usa loadLevel(id).
   */
  public loadLevelDefinition(level: LevelDefinition): void {
    this.currentLevel = level;
    this.movingPlatforms = (level.movingPlatforms ?? []).map((definition) => ({
      definition,
      platform: { x: definition.x, y: definition.y, width: definition.width, height: definition.height, oneWay: true, isMoving: true },
    }));
    this.activePlatforms = [...level.platforms, ...this.movingPlatforms.map((state) => state.platform)];
    this.isArenaLocked = false;
  }

  public get arenaLocked(): boolean {
    return this.isArenaLocked;
  }

  /** Chiude il cancello dell'arena alle spalle del giocatore (una sola volta). */
  public lockArena(): void {
    const arenaStartX = this.level.bossArenaStartX;
    if (this.isArenaLocked || arenaStartX === undefined) {
      return;
    }
    this.isArenaLocked = true;
    this.activePlatforms = [...this.activePlatforms, { x: arenaStartX, y: 0, width: 16, height: 200 }];
  }

  public get level(): LevelDefinition {
    if (this.currentLevel === null) {
      throw new Error("Nessun livello caricato: chiamare loadLevel()");
    }
    return this.currentLevel;
  }

  /** Tutte le piattaforme attive in questo momento (comprese le mobili e il cancello dell'arena). */
  public get platforms(): PlatformDefinition[] {
    return this.activePlatforms;
  }

  /** Pericoli e zone speciali del livello. */
  public get hazards(): HazardDefinition[] {
    return this.level.hazards ?? [];
  }

  /**
   * Muove le piattaforme mobili alla posizione dell'istante "elapsedMs" (andata e ritorno con
   * rallentamento agli estremi) e trasporta chi ci stava sopra (giocatore, nemici a terra).
   * Va chiamato prima di aggiornare le entità.
   */
  public updateMovingPlatforms(elapsedMs: number, riders: readonly GameObject[]): void {
    for (const { definition, platform } of this.movingPlatforms) {
      const standingRiders = riders.filter(
        (rider) =>
          rider.isOnGround &&
          Math.abs(rider.positionY + rider.height - platform.y) <= STANDING_TOLERANCE &&
          rider.positionX + rider.width > platform.x &&
          rider.positionX < platform.x + platform.width
      );
      const progress = (1 - Math.cos((((elapsedMs + (definition.phaseOffsetMs ?? 0)) / definition.periodMs) * Math.PI * 2))) / 2;
      const newX = definition.x + definition.travelX * progress;
      const newY = definition.y + definition.travelY * progress;
      const deltaX = newX - platform.x;
      const deltaY = newY - platform.y;
      platform.x = newX;
      platform.y = newY;
      for (const rider of standingRiders) {
        rider.positionX += deltaX;
        rider.positionY += deltaY;
      }
    }
  }

  /** Crea il boss del livello (se previsto). */
  public createBoss(): Boss | null {
    const spawn = this.level.bossSpawn;
    if (!this.level.hasBoss || spawn === undefined) {
      return null;
    }
    const bossId = this.level.bossId ?? BOSS_CONFIG.id;
    const definition = BOSS_CATALOG[bossId];
    if (definition === undefined) {
      throw new Error(`Boss non presente in BOSS_CATALOG: ${bossId}`);
    }
    return new Boss(definition, spawn.x, spawn.y);
  }

  /** Crea i nemici del livello corrente secondo le posizioni di generazione. */
  public createEnemies(): Enemy[] {
    return this.level.enemies.map(
      (spawn) => new Enemy(ENEMY_CONFIG[spawn.type], spawn.position.x, spawn.position.y)
    );
  }

  public render(renderer: Renderer, camera: Camera, timeSeconds: number): void {
    const style = THEME_STYLES[this.level.theme];
    this.backgroundRenderer.render(renderer, this.level.theme, camera.x, timeSeconds);
    const completion = this.level.completion;
    if (completion.kind === "reachExit") {
      this.terrainRenderer.renderExitDoor(renderer, completion.exitX, camera);
    }
    for (const platform of this.activePlatforms) {
      if (this.isArenaLocked && platform.y === 0 && platform.height === 200) {
        this.terrainRenderer.renderArenaGate(renderer, platform, camera);
        continue;
      }
      this.terrainRenderer.renderPlatform(renderer, platform, camera, style, timeSeconds);
    }
    for (const hazard of this.hazards) {
      this.terrainRenderer.renderHazard(renderer, hazard, camera, timeSeconds, style);
    }
  }

  /** Ciò che sta DAVANTI alle entità: la superficie e il velo dell'acqua (con ondulazione). */
  public renderForeground(renderer: Renderer, camera: Camera, timeSeconds: number): void {
    const style = THEME_STYLES[this.level.theme];
    for (const hazard of this.hazards) {
      if (hazard.kind === "water") {
        this.terrainRenderer.renderWaterForeground(renderer, hazard, camera, timeSeconds, style);
      }
    }
  }
}
