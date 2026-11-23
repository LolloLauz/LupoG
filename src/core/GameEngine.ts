import { CombatSystem } from "../combat/CombatSystem";
import { DIFFICULTY_CONFIG, DIFFICULTY_ORDER, GAME_CONFIG, PALETTE } from "../config/gameConfig";
import type { Boss } from "../entities/Boss";
import { Chest } from "../entities/Chest";
import type { GameObject } from "../entities/GameObject";
import { Enemy } from "../entities/Enemy";
import { Player } from "../entities/Player";
import { Camera } from "../rendering/Camera";
import { EffectsManager } from "../rendering/EffectsManager";
import { Renderer } from "../rendering/Renderer";
import { SpriteManager } from "../rendering/SpriteManager";
import { registerBossSprites } from "../rendering/sprites/bossSprites";
import { registerEnemySprites } from "../rendering/sprites/enemySprites";
import { registerItemSprites } from "../rendering/sprites/itemSprites";
import { registerCharacterPreviews, registerKnightSprites } from "../rendering/sprites/knightSprites";
import { CHARACTER_CONFIG, CHARACTER_ORDER } from "../config/characterConfig";
import { ELEMENT_CONFIG } from "../config/elementConfig";
import { ECONOMY_CONFIG, NO_UPGRADES, UPGRADE_CONFIG, UPGRADE_ORDER, computeUpgradeBonuses, type ShopOfferId } from "../config/progressionConfig";
import { Shop, type PurchaseOutcome } from "../systems/Shop";
import { registerUiSprites } from "../rendering/sprites/uiSprites";
import { CollisionSystem } from "../systems/CollisionSystem";
import { EnemyAISystem } from "../systems/EnemyAISystem";
import { HazardSystem } from "../systems/HazardSystem";
import { ProjectileSystem, type ProjectileEvent } from "../systems/ProjectileSystem";
import { BOSS_CATALOG, BOSS_CONFIG, ENEMY_CONFIG } from "../config/enemyConfig";
import { POWER_UP_CONFIG } from "../config/powerUpConfig";
import { PLAYER_CONFIG } from "../config/playerConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import { registerProjectileSprites } from "../rendering/sprites/projectileSprites";
import { HighScoreManager } from "../systems/HighScoreManager";
import { ItemManager } from "../systems/ItemManager";
import { LevelManager } from "../systems/LevelManager";
import { LivesManager } from "../systems/LivesManager";
import { ScoreManager } from "../systems/ScoreManager";
import { Inventory, type InventorySnapshot } from "../systems/Inventory";
import { WeaponPickupManager } from "../systems/WeaponPickupManager";
import { BAG_SLOT_ACTIONS } from "../config/inventoryConfig";
import { ITEM_CONFIG, ITEM_SIZE } from "../config/itemConfig";
import type { CharacterId, Damageable, WeaponId } from "../types/EntityTypes";
import type { Vector2 } from "../types/GameTypes";
import { HUDManager, type HUDData } from "../ui/HUDManager";
import { ScreenManager, type MenuCommand, type ScreenData } from "../ui/ScreenManager";
import { ProgressManager } from "../systems/ProgressManager";
import { LEVEL_CONFIG } from "../config/levelConfig";
import { GameLoop } from "./GameLoop";
import { GameState } from "./GameState";
import { InputManager } from "./InputManager";

/** Livello caricato all'inizio di una nuova partita. */
const FIRST_LEVEL_ID = 1;
/** Margine sotto la mappa oltre il quale il giocatore è considerato caduto. */
const FALL_MARGIN = 40;
/** Distanza oltre l'inizio dell'arena a cui si chiude il cancello. */
const ARENA_LOCK_MARGIN = 24;
/** Il trofeo di un boss compare a questa distanza (px) a destra della partenza del livello successivo. */
const WEAPON_REWARD_OFFSET_X = 48;

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
  /** Livelli sbloccati e difficoltà scelta (salvati nel browser). */
  private readonly progressManager = new ProgressManager();
  private readonly hud = new HUDManager();
  private readonly effects = new EffectsManager();
  private readonly screens: ScreenManager;

  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private currentLevelId = FIRST_LEVEL_ID;
  /** Forzieri del livello (si aprono colpendoli e lasciano un'arma). */
  private chests: Chest[] = [];
  /** Armi a terra (forzieri, nemici d'élite, trofei dei boss, armi lasciate dal giocatore). */
  private readonly weaponPickups = new WeaponPickupManager();
  /** La borsa: pozioni e armi, scelte con i tasti numerici. */
  private readonly inventory = new Inventory();
  /** Borsa all'inizio del livello: ricominciando il livello torna così (come punteggio e gemme). */
  private levelStartInventory: InventorySnapshot = this.inventory.snapshot();
  /** Trofeo dell'ultimo boss sconfitto: un'arma che compare all'inizio del livello indicato. */
  private weaponReward: { levelId: number; weaponId: WeaponId } | null = null;
  private levelPhase: LevelPhase = "playing";
  private bannerRemainingMs = 0;
  private levelElapsedSeconds = 0;
  private lastSafePosition: Vector2;
  /** Punteggio e gemme all'inizio del livello, per ripristinarli se si ricomincia. */
  private levelStartScore = 0;
  private levelStartCollectibles = 0;
  /** Fase 6: monete a inizio livello (ricominciando tornano queste), bottega aperta tra un livello e l'altro. */
  private levelStartCoins = 0;
  private shop: Shop | null = null;
  /** Gemme messe da parte e personaggi sbloccati completando il livello (righe del riquadro di fine livello). */
  private gemsBankedThisLevel = 0;
  private newlyUnlockedCharacterNames: string[] = [];
  /** Vero se l'ultima partita ha stabilito un nuovo record. */
  private isNewRecord = false;
  private framesPerSecond = 0;
  /** Personaggi di cui sono già registrati tutti gli sprite (si registrano quando servono, vedi ensureCharacterSprites). */
  private readonly registeredCharacters = new Set<CharacterId>();
  /** Vero se, tenendo Q, si è già lasciato un posto con 1-4 (allora il rilascio di Q non lascia l'arma in mano). */
  private hasDroppedWithSlotKey = false;
  /** Momento (secondi di livello) dell'ultimo "STANCO": la scritta non si ripete di continuo. */
  private lastTiredPopupSeconds = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.ensureCharacterSprites("knight");
    this.ensureCharacterSprites(this.progressManager.characterId);
    registerCharacterPreviews(this.spriteManager);
    registerEnemySprites(this.spriteManager);
    registerBossSprites(this.spriteManager);
    registerItemSprites(this.spriteManager);
    registerUiSprites(this.spriteManager);
    registerProjectileSprites(this.spriteManager);
    this.screens = new ScreenManager(this.spriteManager);
    this.levelManager.loadLevel(FIRST_LEVEL_ID);
    const playerStart = this.levelManager.level.playerStart;
    this.player = new Player(playerStart.x, playerStart.y, CHARACTER_CONFIG[this.progressManager.characterId]);
    this.inventory.reset(this.progressManager.bagWeaponIds, this.progressManager.equippedWeaponId);
    this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo);
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
      this.applyMenuCommand(this.screens.update(currentState, this.input, this.getScreenData()));
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
      case "showLevelSelect":
        this.gameState.change("levelSelect");
        break;
      case "showCharacterSelect":
        this.gameState.change("characterSelect");
        break;
      case "confirmCharacter":
        this.chooseCharacter(this.screens.selectedCharacterId);
        this.gameState.change("title");
        break;
      case "showResetConfirm":
        this.gameState.change("confirmReset");
        break;
      case "resetAllData":
        this.resetAllData();
        this.gameState.change("title");
        this.screens.showNotice("DATI CANCELLATI");
        break;
      case "cycleDifficulty": {
        const currentIndex = DIFFICULTY_ORDER.indexOf(this.progressManager.difficulty);
        this.progressManager.setDifficulty(DIFFICULTY_ORDER[(currentIndex + 1) % DIFFICULTY_ORDER.length]!);
        break;
      }
      case "startSelectedLevel":
        this.startNewGame(this.screens.selectedLevelId);
        this.gameState.change("playing");
        break;
      case "backToTitle":
        this.gameState.change("title");
        break;
      case "buyShopOffer":
        this.buyFromShop(this.screens.selectedShopIndex);
        break;
      case "leaveShop":
        this.leaveShop();
        break;
      case "showUpgrades":
        this.gameState.change("upgrades");
        break;
      case "buyUpgrade":
        this.buyUpgrade(this.screens.selectedUpgradeIndex);
        break;
      case "resume":
        this.gameState.change("playing");
        break;
      case null:
        break;
    }
  }

  /**
   * Personaggio scelto nella schermata di scelta: si salva e, se è cambiato, impugna la sua arma iniziale
   * (che entra nella borsa insieme alle armi già raccolte). Vale dalla prossima partita.
   */
  private chooseCharacter(characterId: CharacterId): void {
    // un personaggio bloccato non si sceglie (Fase 6)
    if (characterId === this.progressManager.characterId || !this.progressManager.isCharacterUnlocked(characterId)) {
      return;
    }
    this.progressManager.setCharacter(characterId);
    const startingWeaponId = CHARACTER_CONFIG[characterId].startingWeaponId;
    this.progressManager.discoverWeapon(startingWeaponId);
    this.progressManager.setBagWeapons([startingWeaponId, ...this.progressManager.bagWeaponIds], startingWeaponId);
    this.ensureCharacterSprites(characterId);
  }

  /**
   * "Cancella dati" dal titolo: record, livelli raggiunti, difficoltà, personaggio e armi salvate tornano come
   * alla prima partita (cavaliere con la sola spada).
   */
  private resetAllData(): void {
    this.progressManager.reset();
    this.highScoreManager.reset();
    this.inventory.reset(this.progressManager.bagWeaponIds, this.progressManager.equippedWeaponId);
    this.levelStartInventory = this.inventory.snapshot();
    this.player.setCharacter(CHARACTER_CONFIG[this.progressManager.characterId]);
    this.player.setUpgrades(computeUpgradeBonuses(NO_UPGRADES));
    this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo);
    this.weaponReward = null;
    this.isNewRecord = false;
  }

  /** Bottega (Fase 6): compra la voce scelta e aggiorna l'arma in mano; l'esito compare come avviso. */
  private buyFromShop(offerIndex: number): void {
    if (this.shop === null) {
      return;
    }
    const outcome = this.shop.buy(offerIndex, { inventory: this.inventory, player: this.player, scoreManager: this.scoreManager });
    if (outcome === "bought") {
      this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo);
      this.saveBagWeapons();
    }
    const messages: Record<PurchaseOutcome, string> = {
      bought: "COMPRATO!",
      notEnoughCoins: "MONETE INSUFFICIENTI",
      notNeeded: "NON SERVE",
      bagFull: "BORSA PIENA",
      soldOut: "ESAURITO",
    };
    this.screens.showNotice(messages[outcome], 1.5);
  }

  /** Si esce dalla bottega: comincia il livello successivo. */
  private leaveShop(): void {
    this.shop = null;
    this.startLevel(this.currentLevelId + 1);
    this.gameState.change("playing");
  }

  /** Potenziamento permanente comprato con le gemme (schermata dal titolo). */
  private buyUpgrade(upgradeIndex: number): void {
    const upgradeId = UPGRADE_ORDER[upgradeIndex];
    if (upgradeId === undefined) {
      return;
    }
    const cost = this.progressManager.getNextUpgradeCost(upgradeId);
    if (cost === null) {
      this.screens.showNotice("AL MASSIMO", 1.5);
    } else if (this.progressManager.buyUpgrade(upgradeId)) {
      this.screens.showNotice(`${UPGRADE_CONFIG[upgradeId].name} POTENZIATA!`, 1.5);
    } else {
      this.screens.showNotice("GEMME INSUFFICIENTI", 1.5);
    }
  }

  /** Registra tutti gli sprite di un personaggio la prima volta che servono (sono molti: uno per arma e posa). */
  private ensureCharacterSprites(characterId: CharacterId): void {
    if (!this.registeredCharacters.has(characterId)) {
      registerKnightSprites(this.spriteManager, characterId);
      this.registeredCharacters.add(characterId);
    }
  }

  /**
   * Nuova partita (dal primo livello o da un livello scelto tra quelli sbloccati): salute piena,
   * vite della difficoltà scelta, punteggio azzerato.
   */
  private startNewGame(levelId: number = FIRST_LEVEL_ID): void {
    this.scoreManager.reset();
    this.livesManager.reset(DIFFICULTY_CONFIG[this.progressManager.difficulty].startingLives);
    this.isNewRecord = false;
    this.player.setCharacter(CHARACTER_CONFIG[this.progressManager.characterId]);
    const upgrades = computeUpgradeBonuses(this.progressManager.upgradeLevels);
    this.player.setUpgrades(upgrades);
    this.player.revive();
    // a ogni nuova partita: le armi salvate nella borsa e le pozioni del potenziamento "Scorta"
    this.inventory.reset(this.progressManager.bagWeaponIds, this.progressManager.equippedWeaponId);
    this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo);
    for (let potion = 0; potion < upgrades.startingPotions; potion++) {
      this.inventory.addPotion();
    }
    this.shop = null;
    this.weaponReward = null;
    this.startLevel(this.levelManager.hasLevel(levelId) ? levelId : FIRST_LEVEL_ID);
  }

  /** Carica un livello: nemici, boss, oggetti, giocatore alla partenza e camera. */
  private startLevel(levelId: number): void {
    this.currentLevelId = levelId;
    this.progressManager.unlockLevel(levelId);
    this.levelManager.loadLevel(levelId);
    this.populateLevel();
    const playerStart = this.levelManager.level.playerStart;
    this.player.respawnAt(playerStart);
    this.lastSafePosition = { ...playerStart };
    this.effects.clear();
    this.projectileSystem.clear();
    // i power-up non passano da un livello all'altro
    this.player.modifiers.clear();
    this.levelPhase = "playing";
    this.bannerRemainingMs = GAME_CONFIG.levelBannerDurationMs;
    this.levelElapsedSeconds = 0;
    this.levelStartScore = this.scoreManager.currentScore;
    this.levelStartInventory = this.inventory.snapshot();
    this.levelStartCollectibles = this.scoreManager.collectiblesFound;
    this.levelStartCoins = this.scoreManager.coins;
    this.updateCamera();
  }

  private populateLevel(): void {
    const difficulty = this.progressManager.difficulty;
    this.enemies = this.levelManager.createEnemies(difficulty);
    this.boss = this.levelManager.createBoss(difficulty);
    this.itemManager.loadItems(this.levelManager.level.items);
    this.chests = (this.levelManager.level.chests ?? []).map((chest) => new Chest(chest.position.x, chest.position.y, chest.weaponId));
    this.weaponPickups.clear();
    // il trofeo del boss sconfitto aspetta poco più avanti della partenza (anche ricominciando il livello)
    if (this.weaponReward !== null && this.weaponReward.levelId === this.currentLevelId) {
      const start = this.levelManager.level.playerStart;
      this.weaponPickups.spawn(this.weaponReward.weaponId, start.x + WEAPON_REWARD_OFFSET_X, start.y + PLAYER_CONFIG.hitboxHeight);
    }
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
    this.scoreManager.restore(this.levelStartScore, this.levelStartCollectibles, this.levelStartCoins);
    // anche la borsa torna com'era a inizio livello (pozioni e armi raccolte nel livello si ritrovano a terra)
    this.inventory.restore(this.levelStartInventory);
    this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo);
    this.saveBagWeapons();
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
    this.updateRangedWeapon();
    this.updatePickupsAndBag(deltaTimeSeconds);
    this.updateMovementEffects(wasOnGround, fallingSpeed, wasDodging);
    this.showComboAndPlungeEffects();
    this.updateSafePosition();
    this.updateArena();
    this.updateCombatAndEnemies(deltaTimeSeconds);
    this.showStaminaAndAbilityEffects();
    this.showStatusDamage();
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
    const closedChests = this.chests.filter((chest) => chest.isAlive);
    const targets = [...this.enemies, ...(this.boss === null ? [] : [this.boss]), ...closedChests];

    const hits = this.combatSystem.processPlayerAttack(this.player, targets);
    // colpo in picchiata andato a segno: il cavaliere rimbalza (si può colpire di nuovo dall'alto)
    if (hits.length > 0) {
      this.player.bounceOffTarget();
    }
    for (const hit of hits) {
      this.handlePlayerHit(hit.target, hit.damage, this.player.facingDirection === "right" ? 1 : -1);
    }

    this.enemyAISystem.update(this.enemies, this.player, platforms, this.levelManager.hazards, this.levelElapsedSeconds * 1000);
    const splitChildren: Enemy[] = [];
    for (const enemy of this.enemies) {
      enemy.update(deltaTimeSeconds, this.collisionSystem, platforms, mapWidth);
      enemy.drainProjectileLaunches().forEach((launch) => this.projectileSystem.spawn(launch));
      // le melme si dividono quando muoiono
      for (const split of enemy.drainSplitRequests()) {
        splitChildren.push(new Enemy(ENEMY_CONFIG[split.enemyType], split.position.x, split.position.y, this.progressManager.difficulty));
        this.effects.spawnBurst(enemy.centerX, enemy.centerY, [PALETTE.moss, PALETTE.olive, PALETTE.reed], 8);
      }
    }
    this.enemies.push(...splitChildren);
    this.separatePlayerFromBodies();
    this.combatSystem.processEnemyAttacks(this.enemies, this.player);
    if (this.boss !== null) {
      const aliveMinionCount = this.enemies.filter((enemy) => enemy.isSummoned && enemy.isAlive).length;
      this.boss.update(deltaTimeSeconds, this.player, this.collisionSystem, platforms, mapWidth, aliveMinionCount);
      this.separatePlayerFromBodies();
      this.combatSystem.processBossAttack(this.boss, this.player);
      this.boss.drainProjectileLaunches().forEach((launch) => this.projectileSystem.spawn(launch));
      for (const summon of this.boss.drainSummonRequests()) {
        const minion = new Enemy(ENEMY_CONFIG[summon.enemyType], summon.position.x, summon.position.y, this.progressManager.difficulty);
        minion.isSummoned = true;
        this.enemies.push(minion);
        this.effects.spawnBurst(minion.centerX, minion.centerY, [PALETTE.violet, PALETTE.lilac, PALETTE.white], 12);
      }
    }
    const level = this.levelManager.level;
    // i proiettili del giocatore colpiscono nemici, boss e forzieri ancora chiusi
    const projectileTargets = [...this.enemies, ...(this.boss === null ? [] : [this.boss]), ...this.chests.filter((chest) => chest.isAlive)];
    const projectileEvents = this.projectileSystem.update(deltaTimeSeconds, this.player, platforms, level.width, level.height, projectileTargets);
    this.showProjectileEffects(projectileEvents);
    this.enemies = this.enemies.filter((enemy) => !enemy.isRemovable);
  }

  /**
   * I nemici a terra e il boss hanno un corpo solido: il giocatore non può entrarci dentro,
   * se non durante la schivata (se ne esce già dentro, viene spinto fuori dal lato più vicino).
   */
  private separatePlayerFromBodies(): void {
    if (this.player.isDead || this.player.isDodging) {
      return;
    }
    const platforms = this.levelManager.platforms;
    const mapWidth = this.levelManager.level.width;
    const bodies: GameObject[] = this.enemies.filter((enemy) => enemy.isAlive && !enemy.isFlying);
    if (this.boss !== null && this.boss.isAlive) {
      bodies.push(this.boss);
    }
    for (const body of bodies) {
      this.collisionSystem.separateHorizontally(this.player, body, platforms, mapWidth);
    }
  }

  /**
   * Un colpo del giocatore (spada o proiettile) è andato a segno: scintille, hit-stop, e se il bersaglio
   * muore punti, esplosione e armi lasciate; un forziere si apre.
   */
  private handlePlayerHit(target: Damageable, damage: number, directionX: 1 | -1): void {
    const targetBounds = target.getBounds();
    const centerX = targetBounds.x + targetBounds.width / 2;
    const centerY = targetBounds.y + targetBounds.height / 2;
    const isHeavyHit = damage >= EFFECT_CONFIG.heavyHitDamage;
    this.effects.spawnHitSparks(centerX, centerY, directionX);
    this.effects.triggerHitStop(isHeavyHit ? EFFECT_CONFIG.heavyHitStopMs : EFFECT_CONFIG.lightHitStopMs);
    if (isHeavyHit) {
      this.effects.triggerShake(1, 100);
    }
    if (target instanceof Chest) {
      this.openChest(target);
      return;
    }
    if (target === this.boss && this.boss !== null) {
      if (!this.boss.isAlive) {
        const reward = this.boss.definition.weaponReward;
        if (reward !== undefined && this.levelManager.hasLevel(this.currentLevelId + 1)) {
          this.weaponReward = { levelId: this.currentLevelId + 1, weaponId: reward };
        }
        this.scoreManager.addScore(this.boss.scoreReward);
        this.scoreManager.addCoins(ECONOMY_CONFIG.coinsPerBoss);
        this.effects.spawnBurst(centerX, centerY, [PALETTE.white, PALETTE.red, PALETTE.orange, PALETTE.yellow], 50);
        this.effects.addPopup(`+${this.boss.scoreReward}`, centerX, targetBounds.y, PALETTE.yellow);
        this.effects.triggerShake(EFFECT_CONFIG.bossDeathShakePixels, EFFECT_CONFIG.bossDeathShakeMs);
      }
      return;
    }
    const enemy = this.enemies.find((candidate) => candidate === target);
    if (enemy !== undefined && !enemy.isAlive) {
      this.scoreManager.addScore(enemy.scoreReward);
      this.scoreManager.addCoins(ECONOMY_CONFIG.coinsPerEnemy * (enemy.isElite ? ECONOMY_CONFIG.eliteCoinMultiplier : 1));
      this.effects.spawnBurst(centerX, centerY, [PALETTE.white, PALETTE.lightGray, PALETTE.red], 14);
      this.effects.addPopup(`+${enemy.scoreReward}`, centerX, targetBounds.y, PALETTE.yellow);
      this.effects.triggerShake(EFFECT_CONFIG.enemyDeathShakePixels, EFFECT_CONFIG.enemyDeathShakeMs);
      if (enemy.weaponDrop !== null) {
        this.dropWeapon(enemy.weaponDrop, centerX, targetBounds.y + targetBounds.height);
      }
    }
  }

  /** Forziere aperto: compare l'arma sopra il coperchio. */
  private openChest(chest: Chest): void {
    const weaponId = chest.drainOpenedWeapon();
    if (weaponId !== null) {
      this.dropWeapon(weaponId, chest.positionX + chest.width / 2, chest.positionY);
    }
  }

  /** Un'arma compare a terra (forziere, nemico d'élite) con scintille e il suo nome. */
  private dropWeapon(weaponId: WeaponId, centerX: number, bottomY: number): void {
    const pickup = this.weaponPickups.spawn(weaponId, centerX, bottomY);
    this.effects.spawnBurst(centerX, pickup.positionY + pickup.height / 2, [PALETTE.goldLight, PALETTE.white], 12);
    this.effects.addPopup(WEAPON_CONFIG[weaponId].name.toUpperCase(), centerX, pickup.positionY - 4, PALETTE.goldLight);
  }

  /**
   * Raccolta con E (prima un'arma, se il giocatore ne tocca una, altrimenti una pozione) e scelta dei
   * posti della borsa con i tasti numerici: un'arma diventa quella in mano, una pozione si beve.
   */
  private updatePickupsAndBag(deltaTimeSeconds: number): void {
    this.weaponPickups.update(deltaTimeSeconds, this.player);
    const level = this.levelManager.level;
    this.weaponPickups.updateAmmoDrops(deltaTimeSeconds, this.collisionSystem, this.levelManager.platforms, level.width, level.height);
    if (this.player.isDead) {
      return;
    }
    this.recoverAmmoDrops();
    this.refillAmmoFromQuiver();
    if (this.input.wasPressed("pickUp")) {
      this.pickUpWithE();
    }
    // Q tenuto + 1-4 lascia a terra quel posto; Q da solo (al rilascio) lascia l'arma in mano
    const isDropHeld = this.input.isHeld("dropItem");
    if (this.input.wasPressed("dropItem")) {
      this.hasDroppedWithSlotKey = false;
    }
    BAG_SLOT_ACTIONS.forEach((action, slotIndex) => {
      if (this.input.wasPressed(action)) {
        if (isDropHeld) {
          this.hasDroppedWithSlotKey = true;
          this.dropFromBag(slotIndex);
        } else {
          this.useBagSlot(slotIndex);
        }
      }
    });
    if (this.input.wasReleased("dropItem") && !this.hasDroppedWithSlotKey) {
      this.dropFromBag(this.inventory.equippedSlotIndex);
    }
  }

  /**
   * Lascia a terra il contenuto di un posto della borsa (tasto Q): l'arma con le sue munizioni (si può riprendere
   * con E dopo essersi allontanati) o una pozione. Solo stando a terra; l'ultima arma non si lascia.
   */
  private dropFromBag(slotIndex: number): void {
    const centerX = this.player.positionX + this.player.width / 2;
    const feetY = this.player.positionY + this.player.height;
    const popupY = this.player.positionY - 6;
    if (!this.player.isOnGround) {
      this.effects.addPopup("SOLO A TERRA", centerX, popupY, PALETTE.lightGray);
      return;
    }
    const drop = this.inventory.dropSlot(slotIndex);
    if (drop.kind === "weapon") {
      this.weaponPickups.spawn(drop.weaponId, centerX, feetY, false, drop.ammo);
      this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo);
      this.saveBagWeapons();
      this.effects.addPopup(`${WEAPON_CONFIG[drop.weaponId].name.toUpperCase()} A TERRA`, centerX, popupY, PALETTE.lightGray);
    } else if (drop.kind === "potion") {
      this.itemManager.addItem("healthPotion", Math.round(centerX - ITEM_SIZE / 2), feetY - ITEM_SIZE);
      this.effects.addPopup("POZIONE A TERRA", centerX, popupY, PALETTE.lightGray);
    } else if (drop.kind === "lastWeapon") {
      this.effects.addPopup("È L'ULTIMA ARMA", centerX, popupY, PALETTE.lightGray);
    }
  }

  /** Faretra toccata: munizioni piene per tutte le armi della borsa che ne hanno (se non serve, resta a terra). */
  private refillAmmoFromQuiver(): void {
    const quiver = this.itemManager.findTouchedAmmoRefill(this.player);
    if (quiver === null || !this.inventory.refillAllAmmo()) {
      return;
    }
    this.itemManager.removeItem(quiver);
    if (this.inventory.equippedAmmo !== null) {
      this.player.setAmmo(this.inventory.equippedAmmo);
    }
    const centerX = quiver.positionX + quiver.width / 2;
    this.effects.spawnSparkle(centerX, quiver.positionY + 4);
    this.effects.addPopup("MUNIZIONI PIENE", centerX, quiver.positionY - 4, PALETTE.goldLight);
  }

  private pickUpWithE(): void {
    const pickup = this.weaponPickups.findReachablePickup(this.player);
    if (pickup !== null) {
      const centerX = pickup.positionX + pickup.width / 2;
      const result = this.inventory.addWeapon(pickup.weaponId, pickup.ammo);
      if (result.outcome === "duplicate") {
        this.effects.addPopup("GIÀ NELLA BORSA", centerX, pickup.positionY - 4, PALETTE.lightGray);
        return;
      }
      this.weaponPickups.take(pickup);
      this.progressManager.discoverWeapon(pickup.weaponId); // trovata una volta: resta sbloccata (bottega)
      if (result.outcome === "refilled") {
        // stessa arma da lancio: le munizioni tornano piene (anche quelle in mano)
        if (this.inventory.equippedWeaponId === pickup.weaponId) {
          this.player.setAmmo(this.inventory.equippedAmmo ?? 0);
        }
        this.effects.spawnSparkle(centerX, pickup.positionY + pickup.height / 2);
        this.effects.addPopup("MUNIZIONI PIENE", centerX, pickup.positionY - 4, PALETTE.goldLight);
        return;
      }
      if (result.droppedWeaponId !== null) {
        // borsa piena: l'arma che si aveva in mano resta a terra al posto di quella presa (con le sue munizioni)
        this.weaponPickups.spawn(result.droppedWeaponId, centerX, pickup.positionY + pickup.height, false, result.droppedAmmo ?? null);
      }
      this.player.equipWeapon(WEAPON_CONFIG[pickup.weaponId], this.inventory.equippedAmmo);
      this.saveBagWeapons();
      this.effects.spawnSparkle(centerX, pickup.positionY + pickup.height / 2);
      this.effects.addPopup(WEAPON_CONFIG[pickup.weaponId].name.toUpperCase(), centerX, pickup.positionY - 4, PALETTE.goldLight);
      return;
    }
    const item = this.itemManager.findReachableBagItem(this.player);
    if (item === null) {
      return;
    }
    const centerX = item.positionX + item.width / 2;
    if (!this.inventory.addPotion()) {
      this.effects.addPopup("BORSA PIENA", centerX, item.positionY - 4, PALETTE.lightGray);
      return;
    }
    this.itemManager.removeItem(item);
    this.effects.spawnSparkle(centerX, item.positionY + 4);
    this.effects.addPopup(item.definition.name.toUpperCase(), centerX, item.positionY - 4, PALETTE.lightGreen);
  }

  /** Coltelli a terra: passandoci sopra tornano nella borsa (se l'arma c'è e non è piena). */
  private recoverAmmoDrops(): void {
    for (const drop of this.weaponPickups.findTouchedAmmoDrops(this.player)) {
      if (!this.inventory.addAmmo(drop.weaponId, 1)) {
        continue;
      }
      this.weaponPickups.removeAmmoDrop(drop);
      if (this.inventory.equippedWeaponId === drop.weaponId) {
        this.player.setAmmo(this.inventory.equippedAmmo ?? 0);
      }
      this.effects.addPopup("+1", drop.positionX + drop.width / 2, drop.positionY - 4, PALETTE.lightGray);
    }
  }

  /**
   * Armi a distanza: i proiettili del cavaliere entrano in gioco, le munizioni della borsa seguono quelle
   * in mano, e finiti i giavellotti (che si perdono) l'arma esce dalla borsa a fine lancio.
   */
  private updateRangedWeapon(): void {
    this.player.drainProjectileLaunches().forEach((launch) => this.projectileSystem.spawn(launch));
    const centerX = this.player.positionX + this.player.width / 2;
    if (this.player.drainOutOfAmmo()) {
      this.effects.addPopup("SENZA MUNIZIONI", centerX, this.player.positionY - 6, PALETTE.lightGray);
    }
    const ammo = this.player.currentAmmo;
    if (ammo === null) {
      return;
    }
    this.inventory.setEquippedAmmo(ammo);
    const weapon = this.player.equippedWeapon;
    if (ammo === 0 && weapon.ammo?.isLostWhenEmpty === true && this.player.activeAttack === null) {
      const nextWeaponId = this.inventory.removeWeapon(weapon.id);
      this.player.equipWeapon(WEAPON_CONFIG[nextWeaponId], this.inventory.equippedAmmo);
      this.saveBagWeapons();
      this.effects.addPopup(`${weapon.name.toUpperCase()} FINITO`, centerX, this.player.positionY - 6, PALETTE.lightGray);
    }
  }

  /** Tasto numerico: impugna l'arma del posto o beve una pozione (non a salute piena). */
  private useBagSlot(slotIndex: number): void {
    const selection = this.inventory.selectSlot(slotIndex);
    const centerX = this.player.positionX + this.player.width / 2;
    if (selection.kind === "equip") {
      this.player.equipWeapon(WEAPON_CONFIG[selection.weaponId], this.inventory.equippedAmmo);
      this.saveBagWeapons();
    } else if (selection.kind === "potion") {
      if (this.player.currentHealth >= this.player.maxHealth) {
        this.effects.addPopup("SALUTE PIENA", centerX, this.player.positionY - 6, PALETTE.lightGray);
        return;
      }
      this.inventory.consumePotion(slotIndex);
      const healAmount = ITEM_CONFIG.healthPotion.healAmount;
      this.player.heal(healAmount);
      this.effects.spawnSparkle(centerX, this.player.positionY + this.player.height / 2);
      this.effects.addPopup(`+${healAmount} HP`, centerX, this.player.positionY - 6, PALETTE.lightGreen);
    }
  }

  /** Salva nei progressi le armi della borsa e quella in mano (le pozioni non si salvano). */
  private saveBagWeapons(): void {
    this.progressManager.setBagWeapons(this.inventory.weaponIds, this.inventory.equippedWeaponId);
  }

  /** Scintille quando un proiettile viene deviato dalla spada o si schianta. */
  private showProjectileEffects(events: ProjectileEvent[]): void {
    for (const event of events) {
      if (event.kind === "hitTarget") {
        this.handlePlayerHit(event.target, event.damage, event.directionX);
        continue;
      }
      if (event.kind === "dropAmmo") {
        this.weaponPickups.spawnAmmoDrop(event.weaponId, event.spriteId, event.x, event.y);
        continue;
      }
      if (event.kind === "deflected") {
        this.effects.spawnHitSparks(event.x, event.y, this.player.facingDirection === "right" ? 1 : -1);
        this.effects.triggerHitStop(EFFECT_CONFIG.lightHitStopMs);
      } else if (event.kind === "impact") {
        this.effects.spawnDust(event.x, event.y);
      }
    }
  }

  /** Nome della combo appena completata sopra il cavaliere; polvere e tremolio quando una picchiata tocca terra. */
  private showComboAndPlungeEffects(): void {
    const centerX = this.player.positionX + this.player.width / 2;
    const comboName = this.player.drainCompletedComboName();
    if (comboName !== null) {
      this.effects.addPopup(`${comboName}!`, centerX, this.player.positionY - 8, PALETTE.orange);
    }
    if (this.player.drainPlungeLanding()) {
      const feetY = this.player.positionY + this.player.height;
      this.effects.spawnDust(centerX - 6, feetY - 1);
      this.effects.spawnDust(centerX + 6, feetY - 1);
      this.effects.triggerShake(1, 80);
    }
  }

  /**
   * Fase 5: nome dell'abilità usata, "STANCO" quando manca la stamina (al massimo ogni mezzo secondo), tremolio e
   * polvere dell'onda d'urto, scintille delle parate con lo scudo.
   */
  private showStaminaAndAbilityEffects(): void {
    const centerX = this.player.positionX + this.player.width / 2;
    const popupY = this.player.positionY - 8;
    const abilityName = this.player.drainStartedAbilityName();
    if (abilityName !== null) {
      this.effects.addPopup(abilityName, centerX, popupY, PALETTE.cyan);
    }
    if (this.player.drainTired() && (this.levelElapsedSeconds - this.lastTiredPopupSeconds >= 0.5 || this.levelElapsedSeconds < this.lastTiredPopupSeconds)) {
      this.lastTiredPopupSeconds = this.levelElapsedSeconds;
      this.effects.addPopup("STANCO", centerX, popupY, PALETTE.lightGray);
    }
    if (this.player.drainAbilityImpact()) {
      const feetY = this.player.positionY + this.player.height;
      for (const offsetX of [-36, -18, 18, 36]) {
        this.effects.spawnDust(centerX + offsetX, feetY - 1);
      }
      this.effects.triggerShake(2, 160);
    }
    const shieldX = this.player.facingDirection === "right" ? this.player.positionX + this.player.width + 4 : this.player.positionX - 4;
    const shieldY = this.player.positionY + this.player.height / 2;
    for (const outcome of this.player.drainGuardEvents()) {
      if (outcome === "perfect") {
        this.effects.spawnBurst(shieldX, shieldY, [PALETTE.white, PALETTE.cyan, PALETTE.yellow], 10);
        this.effects.addPopup("PARATA!", centerX, popupY, PALETTE.yellow);
        this.effects.triggerHitStop(60);
      } else if (outcome === "blocked") {
        this.effects.spawnHitSparks(shieldX, shieldY, this.player.facingDirection === "right" ? 1 : -1);
      } else {
        this.effects.addPopup("GUARDIA ROTTA", centerX, popupY, PALETTE.orange);
      }
    }
  }

  /** Fase 7: numeri del danno nel tempo (bruciatura, veleno) sopra nemici e boss, nel colore dell'elemento. */
  private showStatusDamage(): void {
    const sufferers: Array<Enemy | Boss> = this.boss === null ? this.enemies : [...this.enemies, this.boss];
    for (const sufferer of sufferers) {
      for (const tick of sufferer.drainStatusTicks()) {
        this.effects.addPopup(`-${tick.damage}`, sufferer.positionX + sufferer.width / 2, sufferer.positionY - 4, ELEMENT_CONFIG[tick.element].color);
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
      if (definition.powerUpId !== undefined) {
        const powerUp = POWER_UP_CONFIG[definition.powerUpId];
        this.effects.addPopup(`${powerUp.name}!`, centerX, item.positionY - 4, powerUp.auraColor);
        this.effects.spawnBurst(centerX, item.positionY + 4, [powerUp.auraColor, PALETTE.white], 12);
      } else if (definition.healAmount > 0) {
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
      const nextLevelId = this.currentLevelId + 1;
      if (this.levelManager.hasLevel(nextLevelId)) {
        this.player.heal(GAME_CONFIG.levelCompleteHeal);
      }
      // Fase 6: le gemme del livello si mettono da parte; raggiungere il livello successivo può sbloccare un personaggio
      this.gemsBankedThisLevel = this.scoreManager.collectiblesFound - this.levelStartCollectibles;
      this.progressManager.addGems(this.gemsBankedThisLevel);
      const lockedBefore = CHARACTER_ORDER.filter((id) => !this.progressManager.isCharacterUnlocked(id));
      if (this.levelManager.hasLevel(nextLevelId)) {
        this.progressManager.unlockLevel(nextLevelId);
      }
      this.newlyUnlockedCharacterNames = lockedBefore
        .filter((id) => this.progressManager.isCharacterUnlocked(id))
        .map((id) => CHARACTER_CONFIG[id].name);
    }
  }

  /** Dopo il riquadro di fine livello: la bottega (se c'è un livello successivo) oppure la vittoria. */
  private advanceToNextLevel(): void {
    const nextLevelId = this.currentLevelId + 1;
    if (this.levelManager.hasLevel(nextLevelId)) {
      this.shop = Shop.open(this.progressManager.discoveredWeaponIds, this.inventory);
      this.gameState.change("shop");
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
      stamina: this.player.stamina,
      maxStamina: this.player.maxStamina,
      ability: {
        cooldownFraction: this.player.abilityCooldownFraction,
        isReady: this.player.abilityCooldownFraction === 0 && this.player.stamina >= this.player.ability.staminaCost,
        isActive: this.player.isGuarding,
      },
      lives: this.livesManager.remainingLives,
      score: this.scoreManager.currentScore,
      collectibles: this.scoreManager.collectiblesFound,
      coins: this.scoreManager.coins,
      levelNumber: this.currentLevelId,
      bag: this.inventory.bagSlots.map((slot, slotIndex) => {
        if (slot === null) {
          return null;
        }
        return slot.kind === "weapon"
          ? {
              iconSpriteId: WEAPON_CONFIG[slot.weaponId].iconSpriteId,
              iconSize: 16,
              count: slot.ammo ?? null,
              isEquipped: slotIndex === this.inventory.equippedSlotIndex,
            }
          : { iconSpriteId: ITEM_CONFIG.healthPotion.spriteId, iconSize: 8, count: slot.count, isEquipped: false };
      }),
      powerUps: this.player.modifiers.activePowerUps.map((powerUp) => ({
        iconSpriteId: powerUp.definition.iconSpriteId,
        color: powerUp.definition.auraColor,
        remainingFraction: Math.max(0, powerUp.remainingMs / powerUp.definition.durationMs),
      })),
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
      difficultyName: DIFFICULTY_CONFIG[this.progressManager.difficulty].name,
      characterId: this.progressManager.characterId,
      levels: LEVEL_CONFIG.map((level) => ({
        id: level.id,
        name: level.name,
        theme: level.theme,
        isUnlocked: this.progressManager.isLevelUnlocked(level.id),
        bossName: level.hasBoss ? (BOSS_CATALOG[level.bossId ?? BOSS_CONFIG.id]?.name ?? null) : null,
      })),
      unlockedCharacterIds: CHARACTER_ORDER.filter((id) => this.progressManager.isCharacterUnlocked(id)),
      gems: this.progressManager.gems,
      coins: this.scoreManager.coins,
      shopOffers: (this.shop?.offers ?? []).map((offer) => {
        const icon = GameEngine.SHOP_ICONS[offer.id];
        return {
          name: offer.name,
          description: offer.description,
          price: offer.price,
          isSoldOut: offer.isSoldOut,
          iconSpriteId: offer.weaponId !== null ? WEAPON_CONFIG[offer.weaponId].iconSpriteId : icon,
          iconSize: offer.weaponId !== null ? 16 : 8,
        };
      }),
      upgrades: UPGRADE_ORDER.map((upgradeId) => ({
        name: UPGRADE_CONFIG[upgradeId].name,
        description: UPGRADE_CONFIG[upgradeId].description,
        level: this.progressManager.upgradeLevels[upgradeId],
        maxLevel: UPGRADE_CONFIG[upgradeId].costs.length,
        nextCost: this.progressManager.getNextUpgradeCost(upgradeId),
      })),
    };
  }

  /** Icona (8x8) di ogni voce della bottega; l'arma usa la propria icona. */
  private static readonly SHOP_ICONS: Record<ShopOfferId, string> = {
    potion: "itemPotion",
    heal: "hudHeart",
    ammo: "itemQuiver",
    weapon: "itemCoin",
  };

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
    this.chests.forEach((chest) => chest.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y));
    this.itemManager.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y, this.player);
    this.weaponPickups.render(this.renderer, this.spriteManager, this.camera.x, this.camera.y, this.player);
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
      const lines = [`BONUS ${GAME_CONFIG.levelCompleteBonus}`, `GEMME +${this.gemsBankedThisLevel} (DA SPENDERE ${this.progressManager.gems})`];
      for (const name of this.newlyUnlockedCharacterNames) {
        lines.push(`SBLOCCATO: ${name}`);
      }
      if (this.levelManager.hasLevel(this.currentLevelId + 1)) {
        lines.push(`SALUTE +${GAME_CONFIG.levelCompleteHeal}`);
      }
      if (this.weaponReward !== null && this.weaponReward.levelId === this.currentLevelId + 1) {
        lines.push(`TROFEO: ${WEAPON_CONFIG[this.weaponReward.weaponId].name.toUpperCase()}`);
      }
      this.hud.renderMessageBox(this.renderer, "LIVELLO COMPLETATO!", lines);
    } else {
      this.hud.renderMessageBox(this.renderer, `LIVELLO ${this.currentLevelId}`, [
        this.levelManager.level.name.toUpperCase(),
      ]);
    }
  }
}
