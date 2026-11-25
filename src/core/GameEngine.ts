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
import { getCharacterPreviewFrameId, registerCharacterPreviews, registerKnightSprites } from "../rendering/sprites/knightSprites";
import type { SpriteColorVariant } from "../rendering/SpriteManager";
import { SHOP_ROOM_CONFIG, SHOP_ROOM_LEVEL } from "../config/shopRoomConfig";
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
import { Inventory, type EquipmentActionOutcome, type InventorySnapshot } from "../systems/Inventory";
import { WeaponPickupManager } from "../systems/WeaponPickupManager";
import type { WeaponPickup } from "../entities/WeaponPickup";
import { BAG_SLOT_ACTIONS } from "../config/inventoryConfig";
import { ITEM_CONFIG, ITEM_SIZE } from "../config/itemConfig";
import type { CharacterId, Damageable } from "../types/EntityTypes";
import type { ItemInstance } from "../types/ItemTypes";
import { RARITY_CONFIG, getRarityRank } from "../config/rarityConfig";
import { getItemIconVariant } from "../rendering/sprites/equipmentVisuals";
import { getItemIconSpriteId, getItemName, type RandomSource } from "../systems/ItemFactory";
import { rollArmorDrop, rollFinalBossReward, rollLootArmor, rollLootWeapon, type LootContext } from "../systems/LootSystem";
import type { LootSourceId } from "../config/lootConfig";
import type { Vector2 } from "../types/GameTypes";
import { HUDManager, type HUDData } from "../ui/HUDManager";
import { ScreenManager, type EquipmentCell, type EquipmentView, type MenuCommand, type ScreenData } from "../ui/ScreenManager";
import { ARMOR_SETS } from "../config/armorConfig";
import { getActiveSets } from "../systems/EquipmentStats";
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
/** Distanza tra gli oggetti del trofeo (arma e armatura). */
const WEAPON_REWARD_SPACING_X = 22;

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
  /**
   * Trofeo dell'ultimo boss sconfitto: la sua arma (con una rarità alta) e un pezzo d'armatura, che compaiono
   * all'inizio del livello indicato.
   */
  private weaponReward: { levelId: number; items: ItemInstance[] } | null = null;
  /** Estrazioni casuali del bottino (rarità, armature): sostituibile nei test per risultati ripetibili. */
  private lootRandom: RandomSource = Math.random;
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
  /** Vero nella stanza del negozio (E6), tra un livello e l'altro. */
  private isInShopRoom = false;
  /** Nome della ricompensa del boss finale (messa nello zaino), per il riquadro di fine livello. */
  private finalBossRewardName: string | null = null;
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
    this.loadSavedEquipment();
    this.equipFromInventory();
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
      } else if (this.input.wasPressed("openEquipment") && this.levelPhase === "playing" && !this.player.isDead) {
        this.gameState.change("equipment");
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
      case "showEquipment":
        this.gameState.change("equipment");
        break;
      case "closeEquipment":
        this.gameState.change(this.gameState.previous === "paused" ? "paused" : "playing");
        break;
      case "equipmentUse":
        this.useEquipmentCell(this.screens.selectedEquipmentCell);
        break;
      case "equipmentDrop":
        this.dropEquipmentCell(this.screens.selectedEquipmentCell);
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
    // l'arma iniziale entra nella borsa (se c'è già, anche di una rarità migliore, resta quella)
    const savedItems = this.progressManager.bagWeaponItems;
    const hasStartingWeapon = savedItems.some((item) => item.baseId === startingWeaponId);
    this.progressManager.setBagWeapons(hasStartingWeapon ? savedItems : [startingWeaponId, ...savedItems], startingWeaponId);
    this.ensureCharacterSprites(characterId);
  }

  /**
   * "Cancella dati" dal titolo: record, livelli raggiunti, difficoltà, personaggio e armi salvate tornano come
   * alla prima partita (cavaliere con la sola spada).
   */
  private resetAllData(): void {
    this.progressManager.reset();
    this.highScoreManager.reset();
    this.loadSavedEquipment();
    this.levelStartInventory = this.inventory.snapshot();
    this.player.setCharacter(CHARACTER_CONFIG[this.progressManager.characterId]);
    this.equipFromInventory();
    this.player.setUpgrades(computeUpgradeBonuses(NO_UPGRADES));
    this.weaponReward = null;
    this.isNewRecord = false;
  }

  /** Messaggio dell'esito di un acquisto. */
  private static readonly PURCHASE_MESSAGES: Record<PurchaseOutcome, string> = {
    bought: "COMPRATO!",
    notEnoughCoins: "MONETE INSUFFICIENTI",
    notNeeded: "NON SERVE",
    bagFull: "BORSA PIENA",
    soldOut: "ESAURITO",
  };

  /**
   * Bottega (Fase 6, E6): compra la voce indicata e aggiorna l'arma in mano. Nella bottega a menu l'esito compare come
   * avviso; nella stanza del negozio lo mostra chi chiama.
   */
  private buyFromShop(offerIndex: number): PurchaseOutcome {
    if (this.shop === null) {
      return "soldOut";
    }
    const outcome = this.shop.buy(offerIndex, { inventory: this.inventory, player: this.player, scoreManager: this.scoreManager });
    if (outcome === "bought") {
      this.equipFromInventory();
      this.saveBagWeapons();
    }
    if (!this.isInShopRoom) {
      this.screens.showNotice(GameEngine.PURCHASE_MESSAGES[outcome], 1.5);
    }
    return outcome;
  }

  /** Si esce dalla bottega (dal menu o dalla porta della stanza): comincia il livello successivo. */
  private leaveShop(): void {
    this.shop = null;
    this.isInShopRoom = false;
    this.startLevel(this.currentLevelId + 1);
    this.gameState.change("playing");
  }

  /**
   * Stanza del negozio (E6): la bottega come livello speciale senza nemici. Il livello completato resta quello
   * corrente (currentLevelId); uscendo dalla porta in fondo comincia il successivo (leaveShop).
   */
  private enterShopRoom(): void {
    this.isInShopRoom = true;
    this.levelManager.loadLevelDefinition(SHOP_ROOM_LEVEL);
    this.enemies = [];
    this.boss = null;
    this.chests = [];
    this.itemManager.loadItems([]);
    this.weaponPickups.clear();
    this.effects.clear();
    this.projectileSystem.clear();
    const start = SHOP_ROOM_LEVEL.playerStart;
    this.player.respawnAt(start);
    this.lastSafePosition = { ...start };
    this.levelPhase = "playing";
    this.bannerRemainingMs = GAME_CONFIG.levelBannerDurationMs;
    this.levelElapsedSeconds = 0;
    this.updateCamera();
  }

  /** Indice della voce del piedistallo che il giocatore può comprare (abbastanza vicino), oppure -1. */
  private findReachableShopOffer(): number {
    if (this.shop === null) {
      return -1;
    }
    const centerX = this.player.positionX + this.player.width / 2;
    return this.shop.offers.findIndex((_, index) => {
      const pedestalX = SHOP_ROOM_CONFIG.pedestalCenters[index];
      return pedestalX !== undefined && Math.abs(pedestalX - centerX) <= SHOP_ROOM_CONFIG.reachDistance;
    });
  }

  /** E nella stanza del negozio: compra la voce del piedistallo vicino; l'esito compare sopra il piedistallo. */
  private buyFromShopRoom(offerIndex: number): void {
    const outcome = this.buyFromShop(offerIndex);
    const pedestalX = SHOP_ROOM_CONFIG.pedestalCenters[offerIndex] ?? this.player.positionX;
    const color = outcome === "bought" ? PALETTE.lightGreen : PALETTE.lightGray;
    this.effects.addPopup(GameEngine.PURCHASE_MESSAGES[outcome], pedestalX, 140, color);
    if (outcome === "bought") {
      this.effects.spawnSparkle(pedestalX, 176);
    }
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
    // a ogni nuova partita: le armi salvate nella borsa (con rarità), armature e zaino salvati,
    // e le pozioni del potenziamento "Scorta"
    this.loadSavedEquipment();
    this.equipFromInventory();
    const upgrades = computeUpgradeBonuses(this.progressManager.upgradeLevels);
    this.player.setUpgrades(upgrades);
    this.player.revive();
    for (let potion = 0; potion < upgrades.startingPotions; potion++) {
      this.inventory.addPotion();
    }
    this.shop = null;
    this.weaponReward = null;
    this.finalBossRewardName = null;
    this.startLevel(this.levelManager.hasLevel(levelId) ? levelId : FIRST_LEVEL_ID);
  }

  /** Carica un livello: nemici, boss, oggetti, giocatore alla partenza e camera. */
  private startLevel(levelId: number): void {
    this.currentLevelId = levelId;
    this.isInShopRoom = false;
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
      this.weaponReward.items.forEach((item, index) => {
        this.weaponPickups.spawn(item, start.x + WEAPON_REWARD_OFFSET_X + index * WEAPON_REWARD_SPACING_X, start.y + PLAYER_CONFIG.hitboxHeight);
      });
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
    this.equipFromInventory();
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
    // furto di vita (modificatore dell'arma)
    this.player.registerDamageDealt(damage);
    if (target === this.boss && this.boss !== null) {
      if (!this.boss.isAlive) {
        const reward = this.boss.definition.weaponReward;
        if (reward !== undefined && this.levelManager.hasLevel(this.currentLevelId + 1)) {
          // trofeo: l'arma del boss con una rarità alta e un pezzo d'armatura (fonte "boss")
          const context = this.getLootContext("boss");
          const items: ItemInstance[] = [rollLootWeapon(reward, context, this.lootRandom)];
          if (rollArmorDrop("boss", this.lootRandom)) {
            items.push(rollLootArmor(context, this.lootRandom));
          }
          this.weaponReward = { levelId: this.currentLevelId + 1, items };
        } else if (!this.levelManager.hasLevel(this.currentLevelId + 1)) {
          this.storeFinalBossReward();
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
      const source: LootSourceId = enemy.isElite ? "elite" : "enemy";
      if (enemy.weaponDrop !== null) {
        this.dropWeapon(rollLootWeapon(enemy.weaponDrop, this.getLootContext("elite"), this.lootRandom), centerX, targetBounds.y + targetBounds.height);
      }
      // i nemici possono lasciare un pezzo d'armatura (le élite più spesso)
      if (rollArmorDrop(source, this.lootRandom)) {
        this.dropWeapon(rollLootArmor(this.getLootContext(source), this.lootRandom), centerX + 10, targetBounds.y + targetBounds.height);
      }
    }
  }

  /** Fonte, livello e difficoltà di un bottino. */
  private getLootContext(source: LootSourceId): LootContext {
    return { source, levelId: this.currentLevelId, difficulty: this.progressManager.difficulty };
  }

  /**
   * Boss finale sconfitto (E5): l'unica fonte dei Mitici. La partita finisce, quindi l'oggetto va direttamente nello
   * zaino (salvato); se lo zaino è pieno prende il posto dell'oggetto meno raro.
   */
  private storeFinalBossReward(): void {
    const reward = rollFinalBossReward(this.getLootContext("finalBoss"), this.lootRandom);
    if (!this.inventory.addToBackpack(reward)) {
      const items = this.inventory.backpackItems;
      let weakestIndex = 0;
      items.forEach((item, index) => {
        if (getRarityRank(item.rarity) < getRarityRank(items[weakestIndex]!.rarity)) {
          weakestIndex = index;
        }
      });
      this.inventory.removeFromBackpack(weakestIndex);
      this.inventory.addToBackpack(reward);
    }
    this.finalBossRewardName = getItemName(reward);
    this.saveBagWeapons();
  }

  /** Forziere aperto: compare l'arma sopra il coperchio. */
  private openChest(chest: Chest): void {
    const weaponId = chest.drainOpenedWeapon();
    if (weaponId !== null) {
      // l'arma del forziere con una rarità estratta (fonte "chest") e, a volte, anche un pezzo d'armatura
      const context = this.getLootContext("chest");
      const centerX = chest.positionX + chest.width / 2;
      this.dropWeapon(rollLootWeapon(weaponId, context, this.lootRandom), centerX, chest.positionY);
      if (rollArmorDrop("chest", this.lootRandom)) {
        this.dropWeapon(rollLootArmor(context, this.lootRandom), centerX + 18, chest.positionY + chest.height);
      }
    }
  }

  /** Un oggetto compare a terra (forziere, nemico) con scintille e il suo nome, nel colore della rarità. */
  private dropWeapon(item: ItemInstance, centerX: number, bottomY: number): void {
    const pickup = this.weaponPickups.spawn(item, centerX, bottomY);
    const rarityColor = RARITY_CONFIG[item.rarity].color;
    this.effects.spawnBurst(centerX, pickup.positionY + pickup.height / 2, [rarityColor, PALETTE.white], 12);
    this.effects.addPopup(getItemName(item), centerX, pickup.positionY - 4, rarityColor);
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
      this.weaponPickups.spawn(drop.item, centerX, feetY, false, drop.ammo);
      this.equipFromInventory();
      this.saveBagWeapons();
      this.effects.addPopup(`${getItemName(drop.item)} A TERRA`, centerX, popupY, PALETTE.lightGray);
    } else if (drop.kind === "potion") {
      this.itemManager.addItem("healthPotion", Math.round(centerX - ITEM_SIZE / 2), feetY - ITEM_SIZE);
      this.effects.addPopup("POZIONE A TERRA", centerX, popupY, PALETTE.lightGray);
    } else if (drop.kind === "lastWeapon") {
      this.effects.addPopup("È L'ULTIMA ARMA", centerX, popupY, PALETTE.lightGray);
    }
  }

  /**
   * Schermata dell'equipaggiamento (E4), Invio: un'armatura indossata va nello zaino; un'arma della borsa va nello zaino
   * (non l'ultima); un oggetto dello zaino si indossa o si impugna (quello di prima torna nello zaino).
   */
  private useEquipmentCell(cell: EquipmentCell): void {
    let outcome: EquipmentActionOutcome = "empty";
    if (cell.section === "armor") {
      outcome = this.inventory.unequipArmor(cell.slot);
    } else if (cell.section === "bag") {
      const slot = this.inventory.bagSlots[cell.index];
      if (slot?.kind === "potion") {
        this.screens.showNotice("POZIONI: USALE CON 1-4", 1.5);
        return;
      }
      outcome = this.inventory.moveWeaponToBackpack(cell.index);
    } else {
      outcome = this.inventory.equipFromBackpack(cell.index);
    }
    if (outcome === "equipped" || outcome === "unequipped") {
      this.equipFromInventory();
      this.saveBagWeapons();
    }
    const messages: Record<EquipmentActionOutcome, string> = {
      equipped: "EQUIPAGGIATO",
      unequipped: "NELLO ZAINO",
      backpackFull: "ZAINO PIENO",
      lastWeapon: "È L'ULTIMA ARMA",
      empty: "",
    };
    if (messages[outcome] !== "") {
      this.screens.showNotice(messages[outcome], 1.5);
    }
  }

  /** Schermata dell'equipaggiamento, Q: l'oggetto scelto resta a terra ai piedi del giocatore (solo stando a terra). */
  private dropEquipmentCell(cell: EquipmentCell): void {
    if (!this.player.isOnGround) {
      this.screens.showNotice("SOLO A TERRA", 1.5);
      return;
    }
    const centerX = this.player.positionX + this.player.width / 2;
    const feetY = this.player.positionY + this.player.height;
    let dropped: ItemInstance | null = null;
    if (cell.section === "bag") {
      const slot = this.inventory.bagSlots[cell.index];
      if (slot === null || slot === undefined) {
        return;
      }
      if (slot.kind === "weapon" && this.inventory.weaponIds.length <= 1) {
        this.screens.showNotice("È L'ULTIMA ARMA", 1.5);
        return;
      }
      this.dropFromBag(cell.index);
      this.screens.showNotice("A TERRA", 1.5);
      return;
    }
    dropped = cell.section === "armor" ? this.inventory.takeArmor(cell.slot) : this.inventory.removeFromBackpack(cell.index);
    if (dropped === null) {
      return;
    }
    this.weaponPickups.spawn(dropped, centerX, feetY, false);
    this.equipFromInventory();
    this.saveBagWeapons();
    this.screens.showNotice(`${getItemName(dropped)} A TERRA`, 1.5);
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
    if (this.isInShopRoom) {
      const offerIndex = this.findReachableShopOffer();
      if (offerIndex >= 0) {
        this.buyFromShopRoom(offerIndex);
        return;
      }
    }
    const pickup = this.weaponPickups.findReachablePickup(this.player);
    if (pickup !== null) {
      this.pickUpEquipment(pickup);
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

  /**
   * Raccolta di un oggetto a terra con E. Armatura (E2): si indossa se il posto è libero, altrimenti va nello zaino.
   * Arma: entra nella borsa e si impugna; quella che esce dalla borsa (borsa piena, o stesso tipo ma diversa) va nello
   * zaino se c'è spazio, altrimenti resta a terra (non prendibile finché non ci si allontana).
   */
  private pickUpEquipment(pickup: WeaponPickup): void {
    const centerX = pickup.positionX + pickup.width / 2;
    const popupY = pickup.positionY - 4;
    const item = pickup.item;
    const rarityColor = RARITY_CONFIG[item.rarity].color;
    if (item.kind === "armor") {
      const outcome = this.inventory.pickUpArmor(item);
      if (outcome === "full") {
        this.effects.addPopup("ZAINO PIENO", centerX, popupY, PALETTE.lightGray);
        return;
      }
      this.weaponPickups.take(pickup);
      this.equipFromInventory();
      this.saveBagWeapons();
      this.effects.spawnSparkle(centerX, pickup.positionY + pickup.height / 2);
      this.effects.addPopup(outcome === "equipped" ? getItemName(item) : `${getItemName(item)} NELLO ZAINO`, centerX, popupY, rarityColor);
      return;
    }
    const result = this.inventory.addWeapon(item, pickup.ammo);
    if (result.outcome === "duplicate") {
      this.effects.addPopup("GIÀ NELLA BORSA", centerX, popupY, PALETTE.lightGray);
      return;
    }
    this.weaponPickups.take(pickup);
    this.progressManager.discoverWeapon(item.baseId); // trovata una volta: resta sbloccata (bottega)
    if (result.outcome === "refilled") {
      // stessa arma da lancio: le munizioni tornano piene (anche quelle in mano)
      if (this.inventory.equippedWeaponId === item.baseId) {
        this.player.setAmmo(this.inventory.equippedAmmo ?? 0);
      }
      this.effects.spawnSparkle(centerX, pickup.positionY + pickup.height / 2);
      this.effects.addPopup("MUNIZIONI PIENE", centerX, popupY, PALETTE.goldLight);
      return;
    }
    let message = getItemName(item);
    if (result.droppedItem !== undefined) {
      // l'arma che esce dalla borsa va nello zaino; se è pieno resta a terra al posto di quella presa
      if (this.inventory.addToBackpack(result.droppedItem)) {
        message = `${message} (${getItemName(result.droppedItem)} NELLO ZAINO)`;
      } else {
        this.weaponPickups.spawn(result.droppedItem, centerX, pickup.positionY + pickup.height, false, result.droppedAmmo ?? null);
      }
    }
    this.equipFromInventory();
    this.saveBagWeapons();
    this.effects.spawnSparkle(centerX, pickup.positionY + pickup.height / 2);
    this.effects.addPopup(message, centerX, popupY, rarityColor);
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
      this.inventory.removeWeapon(weapon.id);
      this.equipFromInventory();
      this.saveBagWeapons();
      this.effects.addPopup(`${weapon.name.toUpperCase()} FINITO`, centerX, this.player.positionY - 6, PALETTE.lightGray);
    }
  }

  /** Tasto numerico: impugna l'arma del posto o beve una pozione (non a salute piena). */
  private useBagSlot(slotIndex: number): void {
    const selection = this.inventory.selectSlot(slotIndex);
    const centerX = this.player.positionX + this.player.width / 2;
    if (selection.kind === "equip") {
      this.equipFromInventory();
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

  /**
   * Salva nei progressi le armi della borsa (con rarità e modificatori) e quella in mano, le armature indossate e lo
   * zaino (le pozioni non si salvano).
   */
  private saveBagWeapons(): void {
    this.progressManager.setBagWeapons(this.inventory.weaponItems, this.inventory.equippedWeaponId);
    this.progressManager.setEquipment(this.inventory.equippedArmor, this.inventory.backpackItems);
  }

  /** La borsa, le armature e lo zaino salvati nei progressi (inizio partita, cancella dati). */
  private loadSavedEquipment(): void {
    this.inventory.reset(this.progressManager.bagWeaponItems, this.progressManager.equippedWeaponId);
    this.inventory.setArmorAndBackpack(this.progressManager.savedArmor, this.progressManager.savedBackpack);
  }

  /**
   * Il giocatore impugna l'arma in mano della borsa (con le sue munizioni, rarità e modificatori) e indossa le
   * armature: l'unico punto in cui l'equipaggiamento passa dalla borsa al giocatore.
   */
  private equipFromInventory(): void {
    this.player.equipWeapon(WEAPON_CONFIG[this.inventory.equippedWeaponId], this.inventory.equippedAmmo, this.inventory.equippedWeaponItem);
    this.player.setArmor(this.inventory.equippedArmor);
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
    if (isCompleted && this.isInShopRoom) {
      this.leaveShop(); // la porta della bottega porta al livello successivo
      return;
    }
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
      this.shop = Shop.open(this.progressManager.discoveredWeaponIds, this.inventory, this.lootRandom, {
        levelId: nextLevelId,
        difficulty: this.progressManager.difficulty,
      });
      // E6: la stanza camminabile; con SHOP_ROOM_CONFIG.isEnabled = false, la bottega a menu della Fase 6
      if (SHOP_ROOM_CONFIG.isEnabled) {
        this.enterShopRoom();
      } else {
        this.gameState.change("shop");
      }
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
    if (state === "playing" || state === "paused" || state === "equipment") {
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
        isReady: this.player.isAbilityReady,
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
              iconSpriteId: getItemIconSpriteId(slot.item),
              iconVariant: getItemIconVariant(slot.item),
              rarityColor: slot.item.rarity === "common" ? null : RARITY_CONFIG[slot.item.rarity].color,
              iconSize: 16,
              count: slot.ammo ?? null,
              isEquipped: slotIndex === this.inventory.equippedSlotIndex,
            }
          : { iconSpriteId: ITEM_CONFIG.healthPotion.spriteId, iconVariant: null, rarityColor: null, iconSize: 8, count: slot.count, isEquipped: false };
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
        const item = offer.item;
        return {
          name: offer.name,
          description: item === null ? offer.description : `${RARITY_CONFIG[item.rarity].name} - ${offer.description}`,
          price: this.shop?.getPrice(offer) ?? offer.price,
          isSoldOut: offer.isSoldOut,
          iconSpriteId: item !== null ? getItemIconSpriteId(item) : GameEngine.SHOP_ICONS[offer.id],
          iconVariant: item !== null ? getItemIconVariant(item) : null,
          nameColor: item !== null ? RARITY_CONFIG[item.rarity].color : null,
          iconSize: item !== null ? 16 : 8,
        };
      }),
      equipment: this.gameState.is("equipment") ? this.getEquipmentView() : undefined,
      upgrades: UPGRADE_ORDER.map((upgradeId) => ({
        name: UPGRADE_CONFIG[upgradeId].name,
        description: UPGRADE_CONFIG[upgradeId].description,
        level: this.progressManager.upgradeLevels[upgradeId],
        maxLevel: UPGRADE_CONFIG[upgradeId].costs.length,
        nextCost: this.progressManager.getNextUpgradeCost(upgradeId),
      })),
    };
  }

  /** Dati della schermata dell'equipaggiamento (E4): armature, borsa, zaino, set attivi e bonus. */
  private getEquipmentView(): EquipmentView {
    const armor = this.inventory.equippedArmor;
    return {
      armor,
      bag: this.inventory.bagSlots.map((slot, index) => {
        if (slot === null) {
          return null;
        }
        return slot.kind === "weapon"
          ? { kind: "weapon", item: slot.item, ammo: slot.ammo ?? null, isEquipped: index === this.inventory.equippedSlotIndex }
          : { kind: "potion", count: slot.count };
      }),
      backpack: this.inventory.backpackItems,
      backpackCapacity: this.inventory.backpackCapacity,
      activeSets: getActiveSets(armor).map((set) => `${ARMOR_SETS[set.material].name} ${set.pieces}/3`),
      bonuses: this.player.equipmentBonuses,
    };
  }

  /** Icona (8x8) di ogni voce della bottega; l'arma usa la propria icona. */
  private static readonly SHOP_ICONS: Record<ShopOfferId, string> = {
    potion: "itemPotion",
    heal: "hudHeart",
    ammo: "itemQuiver",
    weapon: "itemCoin",
    armor: "itemCoin",
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
    if (this.isInShopRoom) {
      this.renderShopRoom();
    }
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

  /**
   * Stanza del negozio (E6): il banco con il mercante e un piedistallo per ogni voce, con l'oggetto (colori e bagliore
   * della rarità), il prezzo (rosso se le monete non bastano) e, sul piedistallo vicino, "E COMPRA" con il nome.
   */
  private renderShopRoom(): void {
    const cameraX = this.camera.x;
    const cameraY = this.camera.y;
    const floorY = SHOP_ROOM_LEVEL.platforms[0]!.y - cameraY;
    const counter = SHOP_ROOM_CONFIG.counter;
    const merchantFrame = getCharacterPreviewFrameId("ranger", Math.floor(this.levelElapsedSeconds * 2) % 2 === 0 ? 1 : 2);
    this.spriteManager.drawSprite(this.renderer, merchantFrame, SHOP_ROOM_CONFIG.merchantX - cameraX, floorY - 30, true, false, GameEngine.MERCHANT_VARIANT);
    const counterX = counter.x - cameraX;
    this.renderer.fillRect(counterX, floorY - counter.height, counter.width, counter.height, PALETTE.wood);
    this.renderer.fillRect(counterX, floorY - counter.height, counter.width, 2, PALETTE.woodLight);
    this.renderer.fillRect(counterX, floorY - 2, counter.width, 2, PALETTE.earthDark);
    for (let plankX = 8; plankX < counter.width; plankX += 12) {
      this.renderer.fillRect(counterX + plankX, floorY - counter.height + 3, 1, counter.height - 5, PALETTE.earth);
    }
    this.renderer.drawText("MERCANTE", counterX + counter.width / 2, floorY - counter.height - 40, PALETTE.lilac, { align: "center", shadowColor: PALETTE.black });
    const offers = this.shop?.offers ?? [];
    const reachable = this.findReachableShopOffer();
    const bob = Math.sin(this.levelElapsedSeconds * 4) > 0 ? -1 : 0;
    offers.forEach((offer, index) => {
      const centerX = (SHOP_ROOM_CONFIG.pedestalCenters[index] ?? 0) - cameraX;
      const pedestalTop = floorY - SHOP_ROOM_CONFIG.pedestalHeight;
      const halfWidth = SHOP_ROOM_CONFIG.pedestalWidth / 2;
      this.renderer.fillRect(centerX - halfWidth, pedestalTop, SHOP_ROOM_CONFIG.pedestalWidth, SHOP_ROOM_CONFIG.pedestalHeight, PALETTE.stoneShadow);
      this.renderer.fillRect(centerX - halfWidth - 1, pedestalTop, SHOP_ROOM_CONFIG.pedestalWidth + 2, 2, PALETTE.stoneLight);
      this.renderer.fillRect(centerX - halfWidth, pedestalTop + 2, 1, SHOP_ROOM_CONFIG.pedestalHeight - 2, PALETTE.stone);
      if (offer.isSoldOut) {
        this.renderer.drawText("VENDUTO", centerX, pedestalTop - 12, PALETTE.slate, { align: "center", shadowColor: PALETTE.black });
        return;
      }
      const item = offer.item;
      const iconSize = item === null ? 8 : 16;
      const iconY = pedestalTop - iconSize - 3 + bob;
      if (item !== null) {
        this.renderer.fillGlow(centerX, iconY + iconSize / 2, 11, RARITY_CONFIG[item.rarity].color, 2, 4);
      }
      const iconSpriteId = item === null ? GameEngine.SHOP_ICONS[offer.id] : getItemIconSpriteId(item);
      this.spriteManager.drawSprite(this.renderer, iconSpriteId, Math.round(centerX - iconSize / 2), iconY, false, false, item === null ? null : getItemIconVariant(item));
      const price = this.shop?.getPrice(offer) ?? offer.price;
      this.renderer.drawText(String(price), centerX, pedestalTop - 30, price <= this.scoreManager.coins ? PALETTE.goldLight : PALETTE.red, { align: "center", shadowColor: PALETTE.black });
      if (index === reachable) {
        const nameColor = item === null ? PALETTE.white : RARITY_CONFIG[item.rarity].color;
        this.renderer.drawText(offer.name, centerX, pedestalTop - 52, nameColor, { align: "center", shadowColor: PALETTE.black });
        this.renderer.drawText(item === null ? `E COMPRA - ${offer.description}` : `E COMPRA - ${RARITY_CONFIG[item.rarity].name}`, centerX, pedestalTop - 42, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
      }
    });
  }

  /** Colori del mercante: il personaggio incappucciato con la veste del mercante (nessuno sprite nuovo). */
  private static readonly MERCHANT_VARIANT: SpriteColorVariant = { id: "merchant", colors: SHOP_ROOM_CONFIG.merchantColors };

  /** Messaggi di inizio livello e di livello completato. */
  private renderLevelMessages(): void {
    if (this.bannerRemainingMs <= 0 || this.gameState.is("paused")) {
      return;
    }
    if (this.isInShopRoom) {
      this.hud.renderMessageBox(this.renderer, "BOTTEGA", ["E: COMPRA DAI PIEDISTALLI", "PORTA A DESTRA: PROSEGUI"]);
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
        lines.push(`TROFEO: ${getItemName(this.weaponReward.items[0]!)}`);
      }
      if (this.finalBossRewardName !== null && !this.levelManager.hasLevel(this.currentLevelId + 1)) {
        lines.push(`NELLO ZAINO: ${this.finalBossRewardName}`);
      }
      this.hud.renderMessageBox(this.renderer, "LIVELLO COMPLETATO!", lines);
    } else {
      this.hud.renderMessageBox(this.renderer, `LIVELLO ${this.currentLevelId}`, [
        this.levelManager.level.name.toUpperCase(),
      ]);
    }
  }
}
