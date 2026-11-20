import { BOSS_CATALOG, BOSS_CONFIG, ENEMY_CONFIG } from "../config/enemyConfig";
import { LEVEL_CONFIG, THEME_STYLES } from "../config/levelConfig";
import { Boss } from "../entities/Boss";
import { Enemy } from "../entities/Enemy";
import { BackgroundRenderer } from "../rendering/BackgroundRenderer";
import { PALETTE } from "../config/gameConfig";
import type { Camera } from "../rendering/Camera";
import type { Renderer } from "../rendering/Renderer";
import type { LevelDefinition, PlatformDefinition } from "../types/LevelTypes";

/** Dimensione (pixel) del motivo a mattoni del terreno. */
const TILE_SIZE = 8;

/**
 * Carica i livelli da LEVEL_CONFIG, crea nemici e boss del livello e disegna
 * sfondo, terreno, porta d'uscita e cancello dell'arena.
 */
export class LevelManager {
  private currentLevel: LevelDefinition | null = null;
  private readonly backgroundRenderer = new BackgroundRenderer();
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
    this.renderExitDoor(renderer, camera);
    for (const platform of this.activePlatforms) {
      if (this.isArenaLocked && platform.y === 0 && platform.height === 200) {
        this.renderArenaGate(renderer, platform, camera);
        continue;
      }
      const screenX = platform.x - camera.x;
      if (screenX + platform.width < 0 || screenX > renderer.width) {
        continue; // fuori dalla vista
      }
      renderer.fillRect(screenX, platform.y - camera.y, platform.width, platform.height, style.groundFillColor);
      renderer.fillRect(screenX, platform.y - camera.y, platform.width, 2, style.groundTopColor);
      if (platform.oneWay === true) {
        renderer.fillRect(screenX, platform.y - camera.y + platform.height - 1, platform.width, 1, style.groundDetailColor);
        continue;
      }
      this.renderBrickPattern(renderer, platform, camera, style.groundDetailColor);
    }
  }

  /** Righe orizzontali e giunti verticali sfalsati, solo nella parte visibile. */
  private renderBrickPattern(
    renderer: Renderer,
    platform: PlatformDefinition,
    camera: Camera,
    detailColor: string
  ): void {
    const visibleStart = Math.max(platform.x, camera.x);
    const visibleEnd = Math.min(platform.x + platform.width, camera.x + renderer.width);
    let rowIndex = 0;
    for (let rowY = platform.y + 2 + TILE_SIZE; rowY < platform.y + platform.height; rowY += TILE_SIZE) {
      renderer.fillRect(visibleStart - camera.x, rowY - camera.y, visibleEnd - visibleStart, 1, detailColor);
      const jointOffset = (rowIndex % 2) * TILE_SIZE;
      const firstJoint = platform.x + jointOffset + Math.ceil((visibleStart - platform.x - jointOffset) / (TILE_SIZE * 2)) * TILE_SIZE * 2;
      for (let jointX = firstJoint; jointX < visibleEnd; jointX += TILE_SIZE * 2) {
        renderer.fillRect(jointX - camera.x, rowY - camera.y - TILE_SIZE + 1, 1, TILE_SIZE - 1, detailColor);
      }
      rowIndex++;
    }
  }

  /** Porta di uscita (solo nei livelli che si completano raggiungendola). */
  private renderExitDoor(renderer: Renderer, camera: Camera): void {
    const completion = this.level.completion;
    if (completion.kind !== "reachExit") {
      return;
    }
    const doorX = completion.exitX - 4 - camera.x;
    if (doorX < -24 || doorX > renderer.width) {
      return;
    }
    const doorY = 200 - 36 - camera.y;
    renderer.fillRect(doorX - 3, doorY - 3, 30, 39, PALETTE.black);
    renderer.fillRect(doorX, doorY, 24, 36, PALETTE.purple);
    renderer.fillRect(doorX + 2, doorY + 2, 20, 34, PALETTE.black);
    renderer.fillRect(doorX + 4, doorY + 4, 16, 32, PALETTE.yellow);
    renderer.fillRect(doorX + 6, doorY + 6, 12, 30, PALETTE.orange);
    renderer.fillRect(doorX + 11, doorY + 6, 2, 30, PALETTE.black);
    renderer.fillRect(doorX + 8, doorY + 20, 2, 3, PALETTE.yellow);
    renderer.fillRect(doorX + 14, doorY + 20, 2, 3, PALETTE.yellow);
  }

  /** Cancello a sbarre che chiude l'arena del boss. */
  private renderArenaGate(renderer: Renderer, gate: PlatformDefinition, camera: Camera): void {
    const gateX = gate.x - camera.x;
    renderer.fillRect(gateX, 0, gate.width, gate.height, PALETTE.black);
    for (let barX = gateX + 1; barX < gateX + gate.width; barX += 5) {
      renderer.fillRect(barX, 0, 2, gate.height, PALETTE.gray);
    }
    for (let barY = 12; barY < gate.height; barY += 40) {
      renderer.fillRect(gateX, barY, gate.width, 2, PALETTE.lightGray);
    }
  }
}
