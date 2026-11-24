import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, GAME_CONFIG, PALETTE, type DifficultyId } from "../config/gameConfig";
import { ENEMY_AI_CONFIG, ENEMY_CONFIG } from "../config/enemyConfig";
import { ENEMY_ANIMATIONS } from "../config/animationConfig";
import { StatusEffects, type StatusTick } from "../combat/StatusEffects";
import { AnimationPlayer } from "../rendering/AnimationManager";
import { renderStatusAuras, renderStatusPips } from "../rendering/StatusRenderer";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { CollisionSystem } from "../systems/CollisionSystem";
import type { Damageable, ElementId, EnemyDefinition, EnemyState, HitProperties, ProjectileLaunch, SummonRequest, WeaponId } from "../types/EntityTypes";
import type { FacingDirection, Rectangle, Vector2 } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { GameObject } from "./GameObject";

/** Durata (ms) del lampo bianco quando il nemico viene colpito. */
const HIT_FLASH_MS = 100;

/**
 * Nemico generico guidato da un EnemyDefinition.
 * Questa classe gestisce stato, timer, fisica e animazione; le decisioni
 * (dove muoversi, quando attaccare) le prende EnemyAISystem.
 * Varianti:
 *  - a distanza (definition.ranged): alla fine della preparazione chiede il lancio di un proiettile
 *    (vedi drainProjectileLaunches) invece di colpire davanti a sé;
 *  - volante (definition.flight): niente gravità finché è vivo; vola verso il punto scelto dall'IA
 *    e attacca in picchiata (il corpo ferisce durante la fase attiva); da morto cade;
 *  - balzo (definition.lunge): nella fase attiva scatta in avanti (ma non oltre il bordo di un abisso);
 *  - divisione (definition.splitInto): alla morte chiede di far comparire nemici più piccoli (drainSplitRequests);
 *  - corazza (definition.armor): i colpi deboli fanno solo una parte del danno;
 *  - d'élite (options.elite): più salute, danno e punti, alone dorato; può lasciare un'arma (weaponDrop).
 */
export interface EnemyOptions {
  elite?: boolean;
  /** Arma lasciata a terra alla morte (la raccoglie il motore, vedi WeaponPickupManager). */
  weaponDrop?: WeaponId;
}

export class Enemy extends GameObject implements Damageable {
  public currentState: EnemyState = "idle";
  public currentHealth: number;
  public readonly maxHealth: number;
  public readonly attackDamage: number;
  public readonly spawnPositionX: number;
  public readonly spawnPositionY: number;
  /** Vero se è stato evocato da un boss (conta per il limite di evocati). */
  public isSummoned = false;
  /** Direzione di pattuglia corrente (1 = destra, -1 = sinistra). */
  public patrolDirection: 1 | -1 = 1;
  /** Vero se sta inseguendo il giocatore (comportamento "chase"). */
  public isChasing = false;
  public readonly isElite: boolean;
  /** Arma che lascia morendo (null se nessuna). */
  public readonly weaponDrop: WeaponId | null;

  private readonly animationPlayer: AnimationPlayer;
  private desiredDirection: -1 | 0 | 1 = 0;
  private desiredSpeedMultiplier = 1;
  private hurtRemainingMs = 0;
  private deathElapsedMs = 0;
  private isAttackInProgress = false;
  private attackElapsedMs = 0;
  private attackCooldownRemainingMs = 0;
  private hasHitPlayerThisAttack = false;
  private hitFlashRemainingMs = 0;
  /** Volo: punto verso cui volare in questo frame (scelto dall'IA) e direzione della picchiata. */
  private flightTarget: Vector2 | null = null;
  private diveDirection: Vector2 = { x: 0, y: 1 };
  private hasLaunchedThisAttack = false;
  private pendingLaunches: ProjectileLaunch[] = [];
  private hasSplit = false;
  /** Danno effettivamente subito con l'ultimo colpo (dopo la corazza). */
  private lastDamageTaken = 0;
  /** Tempo per la pulsazione dell'alone d'élite. */
  private eliteGlowElapsedMs = 0;
  /** Effetti di stato (Fase 7): bruciatura, veleno, gelo, shock, con le resistenze del nemico. */
  private readonly statusEffects: StatusEffects;
  private pendingStatusTicks: StatusTick[] = [];

  constructor(
    public readonly definition: EnemyDefinition,
    startX: number,
    startY: number,
    difficulty: DifficultyId = DEFAULT_DIFFICULTY,
    options: EnemyOptions = {}
  ) {
    super(startX, startY, definition.hitbox.width, definition.hitbox.height);
    const difficultyConfig = DIFFICULTY_CONFIG[difficulty];
    this.isElite = options.elite === true;
    this.weaponDrop = options.weaponDrop ?? null;
    const eliteHealth = this.isElite ? ENEMY_AI_CONFIG.eliteHealthMultiplier : 1;
    const eliteDamage = this.isElite ? ENEMY_AI_CONFIG.eliteDamageMultiplier : 1;
    this.maxHealth = Math.round(definition.maxHealth * difficultyConfig.enemyHealthMultiplier * eliteHealth);
    this.currentHealth = this.maxHealth;
    this.attackDamage = Math.round(definition.attackDamage * difficultyConfig.enemyDamageMultiplier * eliteDamage);
    this.spawnPositionX = startX;
    this.spawnPositionY = startY;
    this.animationPlayer = new AnimationPlayer(ENEMY_ANIMATIONS[definition.id], "idle");
    this.statusEffects = new StatusEffects(definition.elementModifiers);
  }

  /** Effetti di stato attivi (Fase 7). */
  public get activeStatusElements(): ElementId[] {
    return this.statusEffects.activeElements;
  }

  /** Danni nel tempo avvenuti dall'ultima chiamata (il motore mostra i numeri). */
  public drainStatusTicks(): StatusTick[] {
    const ticks = this.pendingStatusTicks;
    this.pendingStatusTicks = [];
    return ticks;
  }

  /**
   * Elementi del colpo: ognuno lascia il suo effetto (se il nemico non è immune). Restituisce lo stordimento dello shock
   * da applicare dopo la reazione al colpo (0 = nessuno).
   */
  private applyHitElements(hit: HitProperties): number {
    let stunMs = 0;
    for (const element of hit.elements ?? []) {
      stunMs = Math.max(stunMs, this.statusEffects.apply(element).stunMs);
    }
    return stunMs;
  }

  public get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  /** Vero quando l'animazione di morte è finita e il nemico va tolto dal livello. */
  public get isRemovable(): boolean {
    return !this.isAlive && this.deathElapsedMs >= ENEMY_AI_CONFIG.deathDurationMs;
  }

  public get scoreReward(): number {
    return this.isElite ? this.definition.scoreReward * ENEMY_AI_CONFIG.eliteScoreMultiplier : this.definition.scoreReward;
  }

  /** Può decidere cosa fare: vivo, non stordito e non nel mezzo di un attacco. */
  public get canAct(): boolean {
    return this.isAlive && this.hurtRemainingMs <= 0 && !this.isAttackInProgress;
  }

  public get isAttacking(): boolean {
    return this.isAttackInProgress;
  }

  public get isAttackReady(): boolean {
    return this.canAct && this.attackCooldownRemainingMs <= 0;
  }

  public get centerX(): number {
    return this.positionX + this.width / 2;
  }

  public get centerY(): number {
    return this.positionY + this.height / 2;
  }

  /** Vero per i nemici volanti (definition.flight). */
  /** Elemento dei colpi (le resistenze delle armature del giocatore ne riducono il danno), se ne ha uno. */
  public get attackElement(): ElementId | undefined {
    return this.definition.attackElement;
  }

  public get isFlying(): boolean {
    return this.definition.flight !== undefined;
  }

  /** Millisecondi trascorsi dall'inizio dell'attacco in corso (0 se non attacca). */
  public get currentAttackElapsedMs(): number {
    return this.isAttackInProgress ? this.attackElapsedMs : 0;
  }

  /** Volo: punto verso cui volare in questo frame (lo sceglie l'IA a ogni frame). */
  public setFlightTarget(x: number, y: number): void {
    this.flightTarget = { x, y };
  }

  /** Danno effettivamente subito con l'ultimo colpo (minore del danno dell'attacco se il nemico è corazzato). */
  public get lastHitDamage(): number {
    return this.lastDamageTaken;
  }

  /**
   * Se il nemico è appena morto e si divide (definition.splitInto), restituisce una volta sola i nemici
   * da far comparire (affiancati, appoggiati sullo stesso terreno). Altrimenti un elenco vuoto.
   */
  public drainSplitRequests(): SummonRequest[] {
    const split = this.definition.splitInto;
    if (split === undefined || this.isAlive || this.hasSplit) {
      return [];
    }
    this.hasSplit = true;
    const child = ENEMY_CONFIG[split.enemyType];
    return Array.from({ length: split.count }, (_, childIndex) => ({
      enemyType: split.enemyType,
      position: {
        x: this.centerX - child.hitbox.width / 2 + (childIndex - (split.count - 1) / 2) * (child.hitbox.width + 2),
        y: this.positionY + this.height - child.hitbox.height,
      },
    }));
  }

  /** Proiettili da lanciare chiesti dall'ultimo aggiornamento (li crea il motore). Svuota l'elenco. */
  public drainProjectileLaunches(): ProjectileLaunch[] {
    const launches = this.pendingLaunches;
    this.pendingLaunches = [];
    return launches;
  }

  public get currentAnimationName(): string {
    return this.animationPlayer.animationName;
  }

  /** Imposta il movimento desiderato per questo frame (applicato solo se può agire). */
  public setMovement(direction: -1 | 0 | 1, speedMultiplier = 1): void {
    this.desiredDirection = direction;
    this.desiredSpeedMultiplier = speedMultiplier;
    if (direction !== 0 && this.canAct) {
      this.facingDirection = direction < 0 ? "left" : "right";
    }
  }

  public faceTowards(targetCenterX: number): void {
    if (this.canAct) {
      this.facingDirection = targetCenterX < this.centerX ? "left" : "right";
    }
  }

  /**
   * Inizia un attacco. Per i volanti "target" è il punto (centro del giocatore) verso cui
   * puntare la picchiata, bloccato adesso: durante la preparazione c'è il tempo di spostarsi.
   */
  public beginAttack(target?: Vector2): void {
    this.isAttackInProgress = true;
    this.attackElapsedMs = 0;
    this.hasHitPlayerThisAttack = false;
    this.hasLaunchedThisAttack = false;
    if (target !== undefined) {
      const deltaX = target.x - this.centerX;
      const deltaY = target.y - this.centerY;
      const length = Math.hypot(deltaX, deltaY);
      this.diveDirection = length > 0 ? { x: deltaX / length, y: deltaY / length } : { x: 0, y: 1 };
      if (deltaX !== 0) {
        this.facingDirection = deltaX < 0 ? "left" : "right";
      }
    }
    this.animationPlayer.restart("attack");
  }

  /** Area d'urto dell'attacco se in questo momento è attiva, altrimenti null. */
  public getAttackHitbox(): Rectangle | null {
    if (!this.isAttackInProgress || this.hasHitPlayerThisAttack || this.definition.ranged !== undefined) {
      return null; // chi attacca a distanza ferisce solo con i proiettili
    }
    const activeStartMs = this.definition.attackWindupMs;
    const activeEndMs = activeStartMs + this.definition.attackActiveMs;
    if (this.attackElapsedMs < activeStartMs || this.attackElapsedMs > activeEndMs) {
      return null;
    }
    if (this.isFlying) {
      // picchiata: ferisce tutto il corpo
      return { x: this.positionX - 1, y: this.positionY - 1, width: this.width + 2, height: this.height + 2 };
    }
    if (this.definition.lunge !== undefined) {
      // balzo: ferisce il corpo e un poco davanti (le fauci)
      const reach = 6;
      return {
        x: this.facingDirection === "right" ? this.positionX : this.positionX - reach,
        y: this.positionY,
        width: this.width + reach,
        height: this.height,
      };
    }
    // dalla metà del corpo fino a attackRange davanti: colpisce anche chi gli sta addosso
    const range = this.definition.attackRange;
    const halfWidth = this.width / 2;
    return {
      x: this.facingDirection === "right" ? this.positionX + halfWidth : this.positionX - range,
      y: this.positionY + this.height * 0.2,
      width: halfWidth + range,
      height: this.height * 0.6,
    };
  }

  /** Segnala che il colpo ha raggiunto il giocatore (un colpo per attacco). */
  public markPlayerHit(): void {
    this.hasHitPlayerThisAttack = true;
  }

  /**
   * Colpo ricevuto. hit (facoltativo) porta le proprietà dell'arma: breaksGuard (ascia) interrompe
   * anche un attacco già avviato; crushesArmor (mazza) ignora la corazza e stordisce il nemico corazzato.
   */
  public receiveHit(damage: number, hitDirection: FacingDirection, hit: HitProperties = {}): void {
    if (!this.isAlive) {
      return;
    }
    const armor = this.definition.armor;
    const isArmorCrushed = armor !== undefined && hit.crushesArmor === true;
    const effectiveDamage =
      armor !== undefined && !isArmorCrushed && damage < armor.breakDamage ? Math.max(1, Math.round(damage * armor.damageMultiplier)) : damage;
    this.lastDamageTaken = effectiveDamage;
    this.currentHealth = Math.max(0, this.currentHealth - effectiveDamage);
    this.hitFlashRemainingMs = HIT_FLASH_MS;
    const shockStunMs = this.isAlive ? this.applyHitElements(hit) : 0;
    this.reactToHit(hitDirection, hit, isArmorCrushed);
    // lo shock stordisce anche chi sta già attaccando (dopo la reazione normale al colpo, che non lo accorcia)
    if (shockStunMs > 0 && this.isAlive) {
      this.stun(shockStunMs);
    }
  }

  /** Reazione a un colpo: stordimento e rinculo, a meno che l'attacco in corso sia già oltre la finestra di interruzione. */
  private reactToHit(hitDirection: FacingDirection, hit: HitProperties, isArmorCrushed: boolean): void {
    // Un attacco già avviato (oltre la finestra di interruzione) prosegue: niente stordimento,
    // a meno che il colpo rompa la guardia o schiacci la corazza.
    const isUninterruptible =
      this.isAttackInProgress &&
      this.isAlive &&
      this.attackElapsedMs >= this.definition.attackInterruptWindowMs &&
      hit.breaksGuard !== true &&
      !isArmorCrushed;
    if (isUninterruptible) {
      return;
    }
    this.isAttackInProgress = false;
    this.velocityX = (hitDirection === "right" ? 1 : -1) * this.definition.knockbackSpeed;
    if (this.isFlying) {
      this.velocityY = -this.definition.knockbackSpeed * 0.5;
    }
    if (this.isAlive) {
      this.hurtRemainingMs = isArmorCrushed
        ? Math.max(this.definition.hurtDurationMs, ENEMY_AI_CONFIG.armorCrushStunMs)
        : this.definition.hurtDurationMs;
      this.animationPlayer.restart("hurt");
    } else {
      this.hurtRemainingMs = 0;
      this.deathElapsedMs = 0;
      this.animationPlayer.restart("dead");
    }
  }

  /**
   * Parata perfetta del giocatore (scudo del Paladino): l'attacco si interrompe e il nemico resta stordito
   * per durationMs, senza subire danno.
   */
  public stun(durationMs: number): void {
    if (!this.isAlive) {
      return;
    }
    this.isAttackInProgress = false;
    this.velocityX = 0;
    this.hurtRemainingMs = Math.max(this.hurtRemainingMs, durationMs);
    this.animationPlayer.restart("hurt");
  }

  public update(
    deltaTimeSeconds: number,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    this.updateTimers(deltaTimeSeconds * 1000);
    if (this.isFlying && this.isAlive) {
      this.updateFlight(deltaTimeSeconds, collisionSystem, platforms, mapWidth);
      this.updateState();
      this.animationPlayer.play(this.getAnimationName());
      this.animationPlayer.update(deltaTimeSeconds);
      return;
    }

    if (!this.isAlive) {
      this.velocityX *= 0.9; // il rinculo si smorza
    } else if (this.hurtRemainingMs > 0) {
      this.velocityX *= 0.92;
    } else if (this.isAttackInProgress) {
      this.velocityX = this.getLungeVelocity(platforms);
    } else {
      this.velocityX = this.desiredDirection * this.definition.movementSpeed * this.desiredSpeedMultiplier * this.statusEffects.speedMultiplier;
    }
    this.desiredDirection = 0;
    this.desiredSpeedMultiplier = 1;

    collisionSystem.applyGravityAndMove(
      this,
      deltaTimeSeconds,
      GAME_CONFIG.gravity,
      GAME_CONFIG.maxFallSpeed,
      platforms,
      mapWidth
    );
    this.updateState();
    this.animationPlayer.play(this.getAnimationName());
    this.animationPlayer.update(deltaTimeSeconds);
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    const screenX = this.positionX - cameraX;
    if (this.isElite && this.isAlive) {
      // alone dorato che pulsa: si riconosce un nemico d'élite (più forte, può lasciare un'arma)
      const pulse = Math.floor(this.eliteGlowElapsedMs / 200) % 2;
      renderer.fillGlow(screenX + this.width / 2, this.positionY + this.height / 2 - cameraY, Math.max(this.width, this.height) * 0.8 + pulse, PALETTE.goldLight, 2, 4);
    }
    const screenBounds = { x: screenX, y: this.positionY - cameraY, width: this.width, height: this.height };
    renderStatusAuras(renderer, this.statusEffects, screenBounds);
    spriteManager.drawSpriteAligned(
      renderer,
      this.animationPlayer.currentFrameId,
      screenX,
      this.positionY + this.height - cameraY,
      this.width,
      this.facingDirection === "left",
      this.hitFlashRemainingMs > 0 ? PALETTE.white : null
    );
    // barra della salute, visibile solo se il nemico è stato ferito
    if (this.isAlive && this.currentHealth < this.maxHealth) {
      const barY = this.positionY - cameraY - 5;
      renderer.fillRect(screenX, barY, this.width, 3, PALETTE.black);
      renderer.fillRect(
        screenX + 1,
        barY + 1,
        Math.round(((this.width - 2) * this.currentHealth) / this.maxHealth),
        1,
        PALETTE.red
      );
    }
    renderStatusPips(renderer, this.statusEffects, screenBounds);
  }

  private updateTimers(deltaTimeMs: number): void {
    this.eliteGlowElapsedMs += deltaTimeMs;
    // effetti di stato: il danno nel tempo non uccide mai (lascia almeno 1 HP); da morto spariscono
    if (this.isAlive) {
      for (const tick of this.statusEffects.update(deltaTimeMs)) {
        const damage = Math.min(tick.damage, this.currentHealth - 1);
        if (damage > 0) {
          this.currentHealth -= damage;
          this.pendingStatusTicks.push({ element: tick.element, damage });
        }
      }
    } else {
      this.statusEffects.clear();
    }
    this.attackCooldownRemainingMs = Math.max(0, this.attackCooldownRemainingMs - deltaTimeMs);
    this.hitFlashRemainingMs = Math.max(0, this.hitFlashRemainingMs - deltaTimeMs);
    if (!this.isAlive) {
      this.deathElapsedMs += deltaTimeMs;
    }
    if (this.hurtRemainingMs > 0) {
      this.hurtRemainingMs = Math.max(0, this.hurtRemainingMs - deltaTimeMs);
    }
    if (this.isAttackInProgress) {
      this.attackElapsedMs += deltaTimeMs;
      this.launchProjectileIfReady();
      const totalMs =
        this.definition.attackWindupMs + this.definition.attackActiveMs + this.definition.attackRecoveryMs;
      if (this.attackElapsedMs >= totalMs) {
        this.isAttackInProgress = false;
        this.attackCooldownRemainingMs = this.definition.attackCooldownMs;
      }
    }
  }

  /**
   * Volo (solo da vivo): niente gravità; passa attraverso le piattaforme sospese ma non i muri.
   * Preparazione = sospeso a mezz'aria; fase attiva = picchiata; recupero = risale.
   */
  private updateFlight(
    deltaTimeSeconds: number,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    const flight = this.definition.flight!;
    const windupMs = this.definition.attackWindupMs;
    const activeEndMs = windupMs + this.definition.attackActiveMs;
    if (this.hurtRemainingMs > 0) {
      this.velocityX *= 0.9;
      this.velocityY *= 0.9;
    } else if (this.isAttackInProgress && this.attackElapsedMs < windupMs) {
      this.velocityX = 0;
      this.velocityY = 0;
    } else if (this.isAttackInProgress && this.attackElapsedMs < activeEndMs) {
      this.velocityX = this.diveDirection.x * flight.diveSpeed;
      this.velocityY = this.diveDirection.y * flight.diveSpeed;
    } else if (this.isAttackInProgress) {
      this.velocityX *= 0.85;
      this.velocityY = -this.definition.movementSpeed * 0.6;
    } else if (this.flightTarget !== null) {
      const deltaX = this.flightTarget.x - this.centerX;
      const deltaY = this.flightTarget.y - this.centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const speed = Math.min(
        this.definition.movementSpeed * this.desiredSpeedMultiplier * this.statusEffects.speedMultiplier,
        distance / Math.max(deltaTimeSeconds, 0.001)
      );
      this.velocityX = distance > 0.5 ? (deltaX / distance) * speed : 0;
      this.velocityY = distance > 0.5 ? (deltaY / distance) * speed : 0;
      if (Math.abs(deltaX) > 2) {
        this.facingDirection = deltaX < 0 ? "left" : "right";
      }
    } else {
      this.velocityX = 0;
      this.velocityY = 0;
    }
    this.flightTarget = null;
    this.desiredSpeedMultiplier = 1;
    const solidPlatforms = platforms.filter((platform) => platform.oneWay !== true);
    collisionSystem.moveAndCollide(this, deltaTimeSeconds, solidPlatforms, mapWidth);
    this.positionY = Math.max(0, this.positionY);
  }

  /** Balzo: velocità orizzontale durante la fase attiva; si ferma se davanti non c'è terreno. */
  private getLungeVelocity(platforms: PlatformDefinition[]): number {
    const lunge = this.definition.lunge;
    const activeStartMs = this.definition.attackWindupMs;
    const isActive = this.attackElapsedMs >= activeStartMs && this.attackElapsedMs < activeStartMs + this.definition.attackActiveMs;
    if (lunge === undefined || !isActive || !this.isOnGround) {
      return 0;
    }
    const direction = this.facingDirection === "right" ? 1 : -1;
    const probeX = direction > 0 ? this.positionX + this.width + 2 : this.positionX - 2;
    const feetY = this.positionY + this.height;
    const hasGroundAhead = platforms.some(
      (platform) => probeX >= platform.x && probeX <= platform.x + platform.width && Math.abs(platform.y - feetY) <= 2
    );
    return hasGroundAhead ? direction * lunge.speed : 0;
  }

  /** A distanza: alla fine della preparazione chiede il lancio del proiettile (una volta per attacco). */
  private launchProjectileIfReady(): void {
    const ranged = this.definition.ranged;
    if (ranged === undefined || this.hasLaunchedThisAttack || this.attackElapsedMs < this.definition.attackWindupMs) {
      return;
    }
    this.hasLaunchedThisAttack = true;
    const directionX = this.facingDirection === "right" ? 1 : -1;
    this.pendingLaunches.push({
      projectileId: ranged.projectileId,
      origin: {
        x: directionX > 0 ? this.positionX + this.width + 2 : this.positionX - 2,
        y: this.positionY + ranged.launchOffsetY,
      },
      direction: { x: directionX, y: 0 },
      damage: this.attackDamage,
    });
  }

  /** Priorità: morto > stordito > attacco > in movimento (patrol/chase) > fermo. */
  private updateState(): void {
    if (!this.isAlive) {
      this.currentState = "dead";
    } else if (this.hurtRemainingMs > 0) {
      this.currentState = "hurt";
    } else if (this.isAttackInProgress) {
      this.currentState = "attack";
    } else if (this.velocityX !== 0 || (this.isFlying && this.velocityY !== 0)) {
      this.currentState = this.isChasing ? "chase" : "patrol";
    } else {
      this.currentState = "idle";
    }
  }

  private getAnimationName(): string {
    switch (this.currentState) {
      case "patrol":
      case "chase":
        return "walk";
      default:
        return this.currentState;
    }
  }
}
