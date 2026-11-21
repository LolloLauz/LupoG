import { CombatSystem } from "../combat/CombatSystem";
import { GAME_CONFIG, PALETTE } from "../config/gameConfig";
import type { Boss } from "../entities/Boss";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Camera } from "../rendering/Camera";
import { EffectsManager } from "../rendering/EffectsManager";
import { Renderer } from "../rendering/Renderer";
import { SpriteManager } from "../rendering/SpriteManager";
import { registerBossSprites } from "../rendering/sprites/bossSprites";
import { registerEnemySprites } from "../rendering/sprites/enemySprites";
import { registerItemSprites } from "../rendering/sprites/itemSprites";
import { registerKnightSprites } from "../rendering/sprites/knightSprites";
import { registerUiSprites } from "../rendering/sprites/uiSprites";
import { CollisionSystem } from "../systems/CollisionSystem";
import { EnemyAISystem } from "../systems/EnemyAISystem";
import { HazardSystem } from "../systems/HazardSystem";
import { ProjectileSystem, type ProjectileEvent } from "../systems/ProjectileSystem";
import { ENEMY_CONFIG } from "../config/enemyConfig";
import { registerProjectileSprites } from "../rendering/sprites/projectileSprites";
import { HighScoreManager } from "../systems/HighScoreManager";
import { ItemManager } from "../systems/ItemManager";
import { LevelManager } from "../systems/LevelManager";
import { LivesManager } from "../systems/LivesManager";
import { ScoreManager } from "../systems/ScoreManager";
import type { Vector2 } from "../types/GameTypes";
import { HUDManager, type HUDData } from "../ui/HUDManager";
import { ScreenManager, type MenuCommand, type ScreenData } from "../ui/ScreenManager";
import { GameLoop } from "./GameLoop";
import { GameState } from "./GameState";
import { InputManager } from "./InputManager";

/** Livello caricato all'inizio di una nuova partita. */
const FIRST_LEVEL_ID = 1;
/** Margine sotto la mappa oltre il quale il giocatore è considerato caduto. */
const FALL_MARGIN = 40;
/** Distanza oltre l'inizio dell'arena a cui si chiude il cancello. */
const ARENA_LOCK_MARGIN = 24;

/** Parametri degli effetti di gioco (durate in ms, intensità in pixel). */
const EFFECT_CONFIG = {
  lightHitStopMs: 40,
  heavyHitStopMs: 75,
  /** Un colpo che infligge almeno questo danno è considerato "pesante" (più effetto). */
  heavyHitDamage: 30,
  playerHurtHitStopMs: 70,
  playerHurtShakePixels: 3,
  playerHurtShakeMs: 220,
  enemyDeathShakePixels: 2,
  enemyDeathShakeMs: 120,
  bossDeathShakePixels: 4,
  bossDeathShakeMs: 600,
  /** Velocità di caduta minima (px/s) per sollevare polvere all'atterraggio. */
  landingDustSpeed: 150,
} as const;

/** Fase del livello in corso. */
type LevelPhase = "playing" | "completed";

/**
 * Motore del gioco: possiede loop, stato, input e rendering e li coordina.
 * Gestisce anche il flusso dei livelli: inizio, completamento, livello successivo
 * e vittoria finale.
 */
export class GameEngine {
  private readonly renderer: Renderer;
  private readonly input = new InputManager();
  private readonly gameState = new GameState();
  private readonly loop: GameLoop;
  private readonly spriteManager = new SpriteManager();
  private readonly levelManager = new LevelManager();
  private readonly itemManager = new ItemManager();
  private readonly collisionSystem = new CollisionSystem();
  private readonly camera = new Camera(GAME_CONFIG.internalWidth, GAME_CONFIG.internalHeight);
  private readonly combatSystem = new CombatSystem();
  private readonly player: Player;
  private readonly enemyAISystem = new EnemyAISystem();
  private readonly projectileSystem = new ProjectileSystem();
  private readonly hazardSystem = new HazardSystem();
  private readonly scoreManager = new ScoreManager();
  private readonly livesManager = new LivesManager();
  private readonly highScoreManager = new HighScoreManager();
  private readonly hud = new HUDManager();
  private readonly effects = new EffectsManager();
  private readonly screens: ScreenManager;

  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private currentLevelId = FIRST_LEVEL_ID;
  private levelPhase: LevelPhase = "playing";
  private bannerRemainingMs = 0;
  private levelElapsedSeconds = 0;
  private lastSafePosition: Vector2;
  /** Punteggio e gemme all'inizio del livello, per ripristinarli se si ricomincia. */
  private levelStartScore = 0;
  private levelStartCollectibles = 0;
  /** Vero se l'ultima partita ha stabilito un nuovo record. */
  private isNewRecord = false;
  private framesPerSecond = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    registerKnightSprites(this.spriteManager);
    registerEnemySprites(this.spriteManager);
    registerBossSprites(this.spriteManager);
    registerItemSprites(this.spriteManager);
    registerUiSprites(this.spriteManager);
    registerProjectileSprites(this.spriteManager);
    this.screens = new ScreenManager(this.spriteManager);
    this.levelManager.loadLevel(FIRST_LEVEL_ID);
    const playerStart = this.levelManager.level.playerStart;
    this.player = new Player(playerStart.x, playerStart.y);
    this.lastSafePosition = { ...playerStart };
    this.populateLevel();
    this.loop = new GameLoop(
      (deltaTimeSeconds) => this.update(deltaTimeSeconds),
      () => this.render(),
      GAME_CONFIG.maxDeltaTimeSeconds
    );
    this.gameState.onChange((newState) => {
      this.input.setContext(newState === "playing" ? "gameplay" : "menu");
      this.screens.resetSelection();
    });
  }

  public start(): void {
    this.input.attach();
    window.addEventListener("blur", this.pauseIfPlaying);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseIfPlaying();
      }
    });
    this.loop.start();
  }

  private readonly pauseIfPlaying = (): void => {
    if (GAME_CONFIG.pauseOnFocusLoss && this.gameState.is("playing")) {
      this.gameState.change("paused");
    }
  };

  // -------------------------------------------------------------------------
  // Aggiornamento
  // -------------------------------------------------------------------------

  private update(deltaTimeSeconds: number): void {
    if (deltaTimeSeconds > 0) {
      this.framesPerSecond = 0.9 * this.framesPerSecond + 0.1 * (1 / deltaTimeSeconds);
    }
    this.screens.tick(deltaTimeSeconds);
    const currentState = this.gameState.current;

    // Hit-stop: per pochi istanti il gioco si ferma. Gli input non vengono consumati,
    // così un tasto premuto in questo intervallo viene letto subito dopo.
    if (currentState === "playing" && this.effects.isHitStopActive) {
      this.effects.tickHitStop(deltaTimeSeconds);
      return;
    }

    if (currentState === "playing") {
      if (this.input.wasPressed("pause")) {
        this.gameState.change("paused");
      } else {
        this.updatePlaying(deltaTimeSeconds);
      }
    } else if (currentState === "paused" && this.input.wasPressed("pause")) {
      this.gameState.change("playing");
    } else {
      this.applyMenuCommand(this.screens.update(currentState, this.input));
    }
    this.input.endFrame();
  }

  private applyMenuCommand(command: MenuCommand | null): void {
    switch (command) {
      case "newGame":
        this.startNewGame();
        this.gameState.change("playing");
        break;
      case "showControls":
        this.gameState.change("controls");
        break;
      case "backToTitle":
        this.gameState.change("title");
        break;
      case "resume":
        this.gameState.change("playing");
        break;
      case null:
        break;
    }
  }

  /** Nuova partita: primo livello, salute piena, vite e punteggio azzerati. */
  private startNewGame(): void {
    this.scoreManager.reset();
    this.livesManager.reset();
    this.isNewRecord = false;
    this.player.revive();
    this.startLevel(FIRST_LEVEL_ID);
  }

  /** Carica un livello: nemici, boss, oggetti, giocatore alla partenza e camera. */
  private startLevel(levelId: number): void {
    this.currentLevelId = levelId;
    this.levelManager.loadLevel(levelId);
    this.populateLevel();
    const playerStart = this.levelManager.level.playerStart;
    this.player.respawnAt(playerStart);
    this.lastSafePosition = { ...playerStart };
    this.effects.clear();
    this.projectileSystem.clear();
    this.levelPhase = "playing";
    this.bannerRemainingMs = GAME_CONFIG.levelBannerDurationMs;
    this.levelElapsedSeconds = 0;
    this.levelStartScore = this.scoreManager.currentScore;
    this.levelStartCollectibles = this.scoreManager.collectiblesFound;
    this.updateCamera();
  }

  private populateLevel(): void {
    this.enemies = this.levelManager.createEnemies();
    this.boss = this.levelManager.createBoss();
    this.itemManager.loadItems(this.levelManager.level.items);
  }

  /** Il giocatore è morto: perde una vita; se ne ha ancora ricomincia il livello, altrimenti Game Over. */
  private handlePlayerDeath(): void {
    this.livesManager.loseLife();
    if (this.livesManager.hasLivesLeft) {
      this.restartCurrentLevel();
    } else {
      this.finishRun("gameOver");
    }
  }

  /** Fine partita: registra il punteggio (record locale) e mostra la schermata finale. */
  private finishRun(finalState: "gameOver" | "victory"): void {
    this.isNewRecord = this.highScoreManager.submitScore(this.scoreManager.currentScore);
    this.gameState.change(finalState);
  }

  /** Ricomincia il livello corrente con punteggio e gemme ripristinati. */
  private restartCurrentLevel(): void {
    this.player.revive();
    // prima si ripristinano punteggio e gemme, poi si ricarica il livello (che ne memorizza i valori)
    this.scoreManager.restore(this.levelStartScore, this.levelStartCollectibles);
    this.startLevel(this.currentLevelId);
  }

  private updatePlaying(deltaTimeSeconds: number): void {
    this.bannerRemainingMs = Math.max(0, this.bannerRemainingMs - deltaTimeSeconds * 1000);
    if (this.levelPhase === "completed") {
      this.effects.update(deltaTimeSeconds);
      if (this.bannerRemainingMs <= 0) {
        this.advanceToNextLevel();
      }
      return;
    }

    this.levelElapsedSeconds += deltaTimeSeconds;
    const level = this.levelManager.level;
    const wasOnGround = this.player.isOnGround;
    const fallingSpeed = this.player.velocityY;
    const wasDodging = this.player.currentState === "dodge";
    const healthBeforeUpdate = this.player.currentHealth;
    // piattaforme mobili (trasportano chi ci sta sopra) e ambiente del giocatore (acqua, ghiaccio)
    this.levelManager.updateMovingPlatforms(this.levelElapsedSeconds * 1000, [
      this.player,
      ...this.enemies.filter((enemy) => !enemy.isFlying),
    ]);
    this.player.environment = this.hazardSystem.computePlayerEnvironment(this.player, this.levelManager.hazards);
    this.player.update(
      deltaTimeSeconds,
      this.input,
      this.collisionSystem,
      this.levelManager.platforms,
      level.width
    );
    this.hazardSystem.applyContactDamage(this.player, this.levelManager.hazards);
    this.updateMovementEffects(wasOnGround, fallingSpeed, wasDodging);
    this.updateSafePosition();
    this.updateArena();
    this.updateCombatAndEnemies(deltaTimeSeconds);
    this.itemManager.update(deltaTimeSeconds);
    this.collectItemsWithEffects();
    this.updatePlayerDamageEffects(healthBeforeUpdate);
    this.effects.update(deltaTimeSeconds);

    if (this.player.isReadyToRespawn) {
      this.handlePlayerDeath();
      return;
    }
    if (this.player.positionY > level.height + FALL_MARGIN) {
      this.handleFall();
    }
    this.checkLevelCompletion();
    this.updateCamera();
  }

  /** Memorizza l'ultima posizione in cui il giocatore poggiava interamente sul terreno. */
  private updateSafePosition(): void {
    if (!this.player.isOnGround) {
      return;
    }
    const feetY = this.player.positionY + this.player.height;
    const platforms = this.levelManager.platforms;
    const isSupported = (pointX: number): boolean =>
      platforms.some(
        (platform) =>
          pointX >= platform.x &&
          pointX <= platform.x + platform.width &&
          Math.abs(platform.y - feetY) < 1
      );
    if (isSupported(this.player.positionX + 1) && isSupported(this.player.positionX + this.player.width - 1)) {
      this.lastSafePosition = { x: this.player.positionX, y: this.player.positionY };
    }
  }

  /** Caduta in un abisso: danno e ripartenza dall'ultimo punto sicuro. */
  private handleFall(): void {
    this.player.takeEnvironmentalDamage(GAME_CONFIG.fallDamage);
    this.player.respawnAt(this.lastSafePosition);
    this.effects.triggerShake(EFFECT_CONFIG.playerHurtShakePixels, EFFECT_CONFIG.playerHurtShakeMs);
  }

  /** Quando il giocatore entra nell'arena del boss si chiude il cancello alle sue spalle. */
  private updateArena(): void {
    const arenaStartX = this.levelManager.level.bossArenaStartX;
    if (
      arenaStartX !== undefined &&
      !this.levelManager.arenaLocked &&
      this.player.positionX > arenaStartX + ARENA_LOCK_MARGIN
    ) {
      this.levelManager.lockArena();
    }
  }

  /** Attacchi del giocatore, IA dei nemici e del boss, attacchi nemici, punteggio e rimozione dei morti. */
  private updateCombatAndEnemies(deltaTimeSeconds: number): void {
    const platforms = this.levelManager.platforms;
    const mapWidth = this.levelManager.level.width;
    const targets = this.boss === null ? this.enemies : [...this.enemies, this.boss];

    const hits = this.combatSystem.processPlayerAttack(this.player, targets);
    for (const hit of hits) {
      const targetBounds = hit.target.getBounds();
      const centerX = targetBounds.x + targetBounds.width / 2;
      const centerY = targetBounds.y + targetBounds.height / 2;
      const isHeavyHit = hit.damage >= EFFECT_CONFIG.heavyHitDamage;
      this.effects.spawnHitSparks(centerX, centerY, this.player.facingDirection === "right" ? 1 : -1);
      this.effects.triggerHitStop(isHeavyHit ? EFFECT_CONFIG.heavyHitStopMs : EFFECT_CONFIG.lightHitStopMs);
      if (isHeavyHit) {
        this.effects.triggerShake(1, 100);
      }
      if (hit.target === this.boss && this.boss !== null) {
        if (!this.boss.isAlive) {
          this.scoreManager.addScore(this.boss.scoreReward);
          this.effects.spawnBurst(centerX, centerY, [PALETTE.white, PALETTE.red, PALETTE.orange, PALETTE.yellow], 50);
          this.effects.addPopup(`+${this.boss.scoreReward}`, centerX, targetBounds.y, PALETTE.yellow);
          this.effects.triggerShake(EFFECT_CONFIG.bossDeathShakePixels, EFFECT_CONFIG.bossDeathShakeMs);
        }
        continue;
      }
      const enemy = this.enemies.find((candidate) => candidate === hit.target);
      if (enemy !== undefined && !enemy.isAlive) {
        this.scoreManager.addScore(enemy.scoreReward);
        this.effects.spawnBurst(centerX, centerY, [PALETTE.white, PALETTE.lightGray, PALETTE.red], 14);
        this.effects.addPopup(`+${enemy.scoreReward}`, centerX, targetBounds.y, PALETTE.yellow);
        this.effects.triggerShake(EFFECT_CONFIG.enemyDeathShakePixels, EFFECT_CONFIG.enemyDeathShakeMs);
      }
    }

    this.enemyAISystem.update(this.enemies, this.player, platforms, this.levelManager.hazards, this.levelElapsedSeconds * 1000);
    for (const enemy of this.enemies) {
      enemy.update(deltaTimeSeconds, this.collisionSystem, platforms, mapWidth);
      enemy.drainProjectileLaunches().forEach((launch) => this.projectileSystem.spawn(launch));
    }
    this.combatSystem.processEnemyAttacks(this.enemies, this.player);
    if (this.boss !== null) {
      const aliveMinionCount = this.enemies.filter((enemy) => enemy.isSummoned && enemy.isAlive).length;
      this.boss.update(deltaTimeSeconds, this.player, this.collisionSystem, platforms, mapWidth, aliveMinionCount);
      this.combatSystem.processBossAttack(this.boss, this.player);
      this.boss.drainProjectileLaunches().forEach((launch) => this.projectileSystem.spawn(launch));
      for (const summon of this.boss.drainSummonRequests()) {
        const minion = new Enemy(ENEMY_CONFIG[summon.enemyType], summon.position.x, summon.position.y);
        minion.isSummoned = true;
        this.enemies.push(minion);
        this.effects.spawnBurst(minion.centerX, minion.centerY, [PALETTE.violet, PALETTE.lilac, PALETTE.white], 12);
      }
    }
    const level = this.levelManager.level;
    const projectileEvents = this.projectileSystem.update(deltaTimeSeconds, this.player, platforms, level.width, level.height);
    this.showProjectileEffects(projectileEvents);
    this.enemies = this.enemies.filter((enemy) => !enemy.isRemovable);
  }

  /** Scintille quando un proiettile viene deviato dalla spada o si schianta. */
  private showProjectileEffects(events: ProjectileEvent[]): void {
    for (const event of events) {
      if (event.kind === "deflected") {
        this.effects.spawnHitSparks(event.x, event.y, this.player.facingDirection === "right" ? 1 : -1);
        this.effects.triggerHitStop(EFFECT_CONFIG.lightHitStopMs);
      } else if (event.kind === "impact") {
        this.effects.spawnDust(event.x, event.y);
      }
    }
  }

  /** Polvere all'atterraggio e all'inizio della schivata. */
  private updateMovementEffects(wasOnGround: boolean, previousVelocityY: number, wasDodging: boolean): void {
    const feetX = this.player.positionX + this.player.width / 2;
    const feetY = this.player.positionY + this.player.height;
    if (!wasOnGround && this.player.isOnGround && previousVelocityY > EFFECT_CONFIG.landingDustSpeed) {
      this.effects.spawnDust(feetX, feetY - 1);
    }
    if (!wasDodging && this.player.currentState === "dodge") {
      this.effects.spawnDust(feetX, feetY - 1);
    }
  }

  /** Raccoglie gli oggetti e mostra scintillio e scritta del bonus. */
  private collectItemsWithEffects(): void {
    for (const item of this.itemManager.collectItems(this.player, this.scoreManager)) {
      const centerX = item.positionX + item.width / 2;
      this.effects.spawnSparkle(centerX, item.positionY + 4);
      const definition = item.definition;
      if (definition.healAmount > 0) {
        this.effects.addPopup(`+${definition.healAmount} HP`, centerX, item.positionY - 4, PALETTE.lightGreen);
      } else if (definition.scoreBonus > 0) {
        this.effects.addPopup(`+${definition.scoreBonus}`, centerX, item.positionY - 4, PALETTE.cyan);
      }
    }
  }

  /** Se il giocatore ha perso salute in questo frame: scintille, tremolio e hit-stop. */
  private updatePlayerDamageEffects(healthBeforeUpdate: number): void {
    if (this.player.currentHealth >= healthBeforeUpdate) {
      return;
    }
    const playerBounds = this.player.getBounds();
    this.effects.spawnHitSparks(
      playerBounds.x + playerBounds.width / 2,
      playerBounds.y + playerBounds.height / 2,
      this.player.facingDirection === "right" ? -1 : 1
    );
    this.effects.triggerShake(EFFECT_CONFIG.playerHurtShakePixels, EFFECT_CONFIG.playerHurtShakeMs);
    this.effects.triggerHitStop(EFFECT_CONFIG.playerHurtHitStopMs);
    if (this.player.isDead) {
      this.effects.spawnBurst(
        playerBounds.x + playerBounds.width / 2,
        playerBounds.y + playerBounds.height / 2,
        [PALETTE.white, PALETTE.lightGray, PALETTE.red],
        16
      );
    }
  }

  /** Controlla la condizione di completamento del livello (uscita raggiunta o boss sconfitto). */
  private checkLevelCompletion(): void {
    if (this.player.isDead) {
      return;
    }
    const completion = this.levelManager.level.completion;
    const isCompleted =
      completion.kind === "reachExit"
        ? this.player.positionX + this.player.width / 2 >= completion.exitX
        : this.boss !== null && this.boss.isDefeated;
    if (isCompleted) {
      this.levelPhase = "completed";
      this.bannerRemainingMs = GAME_CONFIG.levelBannerDurationMs;
      this.scoreManager.addScore(GAME_CONFIG.levelCompleteBonus);
      if (this.levelManager.hasLevel(this.currentLevelId + 1)) {
        this.player.heal(GAME_CONFIG.levelCompleteHeal);
      }
    }
  }

  private advanceToNextLevel(): void {
    const nextLevelId = this.currentLevelId + 1;
    if (this.levelManager.hasLevel(nextLevelId)) {
      this.startLevel(nextLevelId);
    } else {
      this.finishRun("victory");
    }
  }

  private updateCamera(): void {
    const level = this.levelManager.level;
    this.camera.follow(this.player.getBounds(), level.width, level.height);
  }

  // -------------------------------------------------------------------------
  // Disegno
  // -------------------------------------------------------------------------

  private render(): void {
    const state = this.gameState.current;
    if (state === "playing" || state === "paused") {
      this.renderWorld();
      this.hud.render(this.renderer, this.spriteManager, this.getHUDData(), this.levelElapsedSeconds);
      this.renderLevelMessages();
    }
    this.screens.render(this.renderer, state, this.getScreenData());
    if (GAME_CONFIG.debugMode) {
      this.renderer.drawText(`FPS ${Math.round(this.framesPerSecond)}`, 2, 232, PALETTE.lightGreen);
    }
  }

  private getHUDData(): HUDData {
    const boss = this.boss;
    const isBossVisible = boss !== null && boss.isActive && !boss.isDefeated;
    return {
      health: this.player.currentHealth,
      maxHealth: this.player.maxHealth,
      lives: this.livesManager.remainingLives,
      score: this.scoreManager.currentScore,
      collectibles: this.scoreManager.collectiblesFound,
      levelNumber: this.currentLevelId,
      boss: isBossVisible
        ? {
            name: boss.definition.name,
            health: boss.currentHealth,
            maxHealth: boss.maxHealth,
            phaseIndex: boss.phaseIndex,
            phaseMarkerPercents: boss.definition.phases
              .map((phase) => phase.healthPercentThreshold)
              .filter((threshold) => threshold < 100),
          }
        : null,
    };
  }

  private getScreenData(): ScreenData {
    return {
      score: this.scoreManager.currentScore,
      bestScore: this.highScoreManager.bestScore,
      collectibles: this.scoreManager.collectiblesFound,
      isNewRecord: this.isNewRecord,
    };
  }

  private renderWorld(): void {
    // il tremolio sposta la vista del mondo (non l'HUD) di pochi pixel interi
    const shake = this.effects.getShakeOffset();
    const originalCameraX = this.camera.x;
    const originalCameraY = this.camera.y;
    this.camera.x += shake.x;
    this.camera.y += shake.y;
    this.renderWorldLayers();
    this.camera.x = originalCameraX;
    this.camera.y = originalCameraY;
  }

  private renderWorldLayers(): void {
    this.levelManager.render(this.renderer, this.camera, this.levelElapsedSeconds);
    this.itemManager.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y);
    this.enemies.forEach((enemy) => enemy.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y));
    this.boss?.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y);
    this.player.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y);
    this.projectileSystem.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y);
    this.levelManager.renderForeground(this.renderer, this.camera, this.levelElapsedSeconds);
    this.effects.render(this.renderer, this.camera.x, this.camera.y);
    if (GAME_CONFIG.debugMode) {
      const bounds = this.player.getBounds();
      this.renderer.strokeRect(bounds.x - this.camera.x, bounds.y - this.camera.y, bounds.width, bounds.height, PALETTE.lightGreen);
    }
  }

  /** Messaggi di inizio livello e di livello completato. */
  private renderLevelMessages(): void {
    if (this.bannerRemainingMs <= 0 || this.gameState.is("paused")) {
      return;
    }
    if (this.levelPhase === "completed") {
      const lines = [`BONUS ${GAME_CONFIG.levelCompleteBonus}`, `GEMME ${this.scoreManager.collectiblesFound}`];
      if (this.levelManager.hasLevel(this.currentLevelId + 1)) {
        lines.push(`SALUTE +${GAME_CONFIG.levelCompleteHeal}`);
      }
      this.hud.renderMessageBox(this.renderer, "LIVELLO COMPLETATO!", lines);
    } else {
      this.hud.renderMessageBox(this.renderer, `LIVELLO ${this.currentLevelId}`, [
        this.levelManager.level.name.toUpperCase(),
      ]);
    }
  }
}
