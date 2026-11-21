import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, GAME_CONFIG, PALETTE, type DifficultyId } from "../config/gameConfig";
import { ENEMY_AI_CONFIG } from "../config/enemyConfig";
import { ENEMY_ANIMATIONS } from "../config/animationConfig";
import { AnimationPlayer } from "../rendering/AnimationManager";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { CollisionSystem } from "../systems/CollisionSystem";
import type { Damageable, EnemyDefinition, EnemyState } from "../types/EntityTypes";
import type { FacingDirection, Rectangle } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { GameObject } from "./GameObject";

/** Durata (ms) del lampo bianco quando il nemico viene colpito. */
const HIT_FLASH_MS = 100;

/**
 * Nemico generico guidato da un EnemyDefinition.
 * Questa classe gestisce stato, timer, fisica e animazione; le decisioni
 * (dove muoversi, quando attaccare) le prende EnemyAISystem.
 */
export class Enemy extends GameObject implements Damageable {
  public currentState: EnemyState = "idle";
  public currentHealth: number;
  public readonly maxHealth: number;
  public readonly attackDamage: number;
  public readonly spawnPositionX: number;
  /** Direzione di pattuglia corrente (1 = destra, -1 = sinistra). */
  public patrolDirection: 1 | -1 = 1;
  /** Vero se sta inseguendo il giocatore (comportamento "chase"). */
  public isChasing = false;

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

  constructor(
    public readonly definition: EnemyDefinition,
    startX: number,
    startY: number,
    difficulty: DifficultyId = DEFAULT_DIFFICULTY
  ) {
    super(startX, startY, definition.hitbox.width, definition.hitbox.height);
    const difficultyConfig = DIFFICULTY_CONFIG[difficulty];
    this.maxHealth = Math.round(definition.maxHealth * difficultyConfig.enemyHealthMultiplier);
    this.currentHealth = this.maxHealth;
    this.attackDamage = Math.round(definition.attackDamage * difficultyConfig.enemyDamageMultiplier);
    this.spawnPositionX = startX;
    this.animationPlayer = new AnimationPlayer(ENEMY_ANIMATIONS[definition.id], "idle");
  }

  public get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  /** Vero quando l'animazione di morte è finita e il nemico va tolto dal livello. */
  public get isRemovable(): boolean {
    return !this.isAlive && this.deathElapsedMs >= ENEMY_AI_CONFIG.deathDurationMs;
  }

  public get scoreReward(): number {
    return this.definition.scoreReward;
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

  public beginAttack(): void {
    this.isAttackInProgress = true;
    this.attackElapsedMs = 0;
    this.hasHitPlayerThisAttack = false;
    this.animationPlayer.restart("attack");
  }

  /** Area d'urto dell'attacco se in questo momento è attiva, altrimenti null. */
  public getAttackHitbox(): Rectangle | null {
    if (!this.isAttackInProgress || this.hasHitPlayerThisAttack) {
      return null;
    }
    const activeStartMs = this.definition.attackWindupMs;
    const activeEndMs = activeStartMs + this.definition.attackActiveMs;
    if (this.attackElapsedMs < activeStartMs || this.attackElapsedMs > activeEndMs) {
      return null;
    }
    const range = this.definition.attackRange;
    return {
      x: this.facingDirection === "right" ? this.positionX + this.width : this.positionX - range,
      y: this.positionY + this.height * 0.2,
      width: range,
      height: this.height * 0.6,
    };
  }

  /** Segnala che il colpo ha raggiunto il giocatore (un colpo per attacco). */
  public markPlayerHit(): void {
    this.hasHitPlayerThisAttack = true;
  }

  public receiveHit(damage: number, hitDirection: FacingDirection): void {
    if (!this.isAlive) {
      return;
    }
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.hitFlashRemainingMs = HIT_FLASH_MS;
    // Un attacco già avviato (oltre la finestra di interruzione) prosegue: niente stordimento.
    const isUninterruptible =
      this.isAttackInProgress &&
      this.isAlive &&
      this.attackElapsedMs >= this.definition.attackInterruptWindowMs;
    if (isUninterruptible) {
      return;
    }
    this.isAttackInProgress = false;
    this.velocityX = (hitDirection === "right" ? 1 : -1) * this.definition.knockbackSpeed;
    if (this.isAlive) {
      this.hurtRemainingMs = this.definition.hurtDurationMs;
      this.animationPlayer.restart("hurt");
    } else {
      this.hurtRemainingMs = 0;
      this.deathElapsedMs = 0;
      this.animationPlayer.restart("dead");
    }
  }

  public update(
    deltaTimeSeconds: number,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    this.updateTimers(deltaTimeSeconds * 1000);

    if (!this.isAlive) {
      this.velocityX *= 0.9; // il rinculo si smorza
    } else if (this.hurtRemainingMs > 0) {
      this.velocityX *= 0.92;
    } else if (this.isAttackInProgress) {
      this.velocityX = 0;
    } else {
      this.velocityX = this.desiredDirection * this.definition.movementSpeed * this.desiredSpeedMultiplier;
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
  }

  private updateTimers(deltaTimeMs: number): void {
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
      const totalMs =
        this.definition.attackWindupMs + this.definition.attackActiveMs + this.definition.attackRecoveryMs;
      if (this.attackElapsedMs >= totalMs) {
        this.isAttackInProgress = false;
        this.attackCooldownRemainingMs = this.definition.attackCooldownMs;
      }
    }
  }

  /** Priorità: morto > stordito > attacco > in movimento (patrol/chase) > fermo. */
  private updateState(): void {
    if (!this.isAlive) {
      this.currentState = "dead";
    } else if (this.hurtRemainingMs > 0) {
      this.currentState = "hurt";
    } else if (this.isAttackInProgress) {
      this.currentState = "attack";
    } else if (this.velocityX !== 0) {
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
