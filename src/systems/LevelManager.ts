import { BOSS_CATALOG, BOSS_CONFIG, ENEMY_CONFIG } from "../config/enemyConfig";
import { LEVEL_CONFIG, THEME_STYLES } from "../config/levelConfig";
import { Boss } from "../entities/Boss";
import { Enemy } from "../entities/Enemy";
import { BackgroundRenderer } from "../rendering/BackgroundRenderer";
import { TerrainRenderer } from "../rendering/TerrainRenderer";
import type { Camera } from "../rendering/Camera";
import type { Renderer } from "../rendering/Renderer";
import type { LevelDefinition, PlatformDefinition } from "../types/LevelTypes";

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
    this.currentLevel = level;
    this.activePlatforms = [...level.platforms];
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

  /** Tutte le piattaforme attive in questo momento. */
  public get platforms(): PlatformDefinition[] {
    return this.activePlatforms;
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
      this.terrainRenderer.renderPlatform(renderer, platform, camera, style);
    }
  }
}
