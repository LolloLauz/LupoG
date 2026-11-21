import { BOSS_ANIMATIONS } from "../config/animationConfig";
import { GAME_CONFIG, PALETTE } from "../config/gameConfig";
import { AnimationPlayer } from "../rendering/AnimationManager";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { CollisionSystem } from "../systems/CollisionSystem";
import type { BossDefinition, BossPhaseDefinition, Damageable } from "../types/EntityTypes";
import type { FacingDirection, Rectangle } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { GameObject } from "./GameObject";
import type { Player } from "./Player";

export type BossState =
  | "dormant"
  | "idle"
  | "walk"
  | "slash"
  | "chargeWindup"
  | "charging"
  | "recovery"
  | "dead";

type BossAttackChoice = "slash" | "charge";

/**
 * Cavaliere Nero. A differenza dei nemici normali non viene stordito dai colpi
 * (lampeggia soltanto) e ha due attacchi, con fasi di combattimento.
 *  - fendente: vicino, preparazione 600 ms;
 *  - carica: da lontano, si ferma 700 ms (segnale d'allarme), poi scatta in avanti.
 * Dopo la carica resta fermo e vulnerabile. Sotto il 50% di salute entra nella fase 2
 * (più veloce, attacca più spesso). L'IA è contenuta in questa classe.
 */
export class Boss extends GameObject implements Damageable {
  public currentHealth: number;
  public readonly maxHealth: number;
  public currentState: BossState = "dormant";

  private readonly animationPlayer: AnimationPlayer;
  private stateElapsedMs = 0;
  private cooldownRemainingMs = 0;
  private nextAttack: BossAttackChoice = "slash";
  private hasHitPlayerThisAttack = false;
  private hitFlashRemainingMs = 0;
  private deathElapsedMs = 0;
  private lockedDirection: 1 | -1 = -1;

  constructor(
    public readonly definition: BossDefinition,
    startX: number,
    startY: number,
    private readonly randomNumber: () => number = Math.random
  ) {
    super(startX, startY, definition.hitbox.width, definition.hitbox.height);
    this.maxHealth = definition.maxHealth;
    this.currentHealth = definition.maxHealth;
    this.facingDirection = "left";
    const animations = BOSS_ANIMATIONS[definition.id];
    if (animations === undefined) {
      throw new Error(`Animazioni del boss non definite: ${definition.id}`);
    }
    this.animationPlayer = new AnimationPlayer(animations, "idle");
  }

  public get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  /** Vero quando l'animazione di morte è finita: il livello può considerarsi completato. */
  public get isDefeated(): boolean {
    return !this.isAlive && this.deathElapsedMs >= this.definition.deathDurationMs;
  }

  /** Vero dopo il risveglio (usato per mostrare la barra della salute). */
  public get isActive(): boolean {
    return this.currentState !== "dormant";
  }

  public get centerX(): number {
    return this.positionX + this.width / 2;
  }

  public get scoreReward(): number {
    return this.definition.scoreReward;
  }

  /** Indice della fase corrente (0 = prima fase). */
  public get phaseIndex(): number {
    const healthPercent = (this.currentHealth / this.maxHealth) * 100;
    let index = 0;
    this.definition.phases.forEach((phase, phaseIndex) => {
      if (healthPercent <= phase.healthPercentThreshold) {
        index = phaseIndex;
      }
    });
    return index;
  }

  public get currentPhase(): BossPhaseDefinition {
    return this.definition.phases[this.phaseIndex]!;
  }

  public get currentAnimationName(): string {
    return this.animationPlayer.animationName;
  }

  /** Danno dell'attacco in corso (fendente o carica). */
  public get currentAttackDamage(): number {
    return this.currentState === "charging" ? this.definition.chargeDamage : this.definition.slashDamage;
  }

  public receiveHit(damage: number, _hitDirection: FacingDirection): void {
    if (!this.isAlive) {
      return;
    }
    // colpirlo da lontano lo sveglia
    if (this.currentState === "dormant") {
      this.wakeUp();
    }
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.hitFlashRemainingMs = this.definition.hitFlashMs;
    if (!this.isAlive) {
      this.deathElapsedMs = 0;
      this.velocityX = 0;
      this.changeState("dead");
    }
  }

  /** Area d'urto dell'attacco se in questo momento è attiva, altrimenti null. */
  public getAttackHitbox(): Rectangle | null {
    if (this.hasHitPlayerThisAttack) {
      return null;
    }
    const direction = this.facingDirection === "right" ? 1 : -1;
    if (this.currentState === "slash") {
      const activeStartMs = this.definition.slashWindupMs;
      const activeEndMs = activeStartMs + this.definition.slashActiveMs;
      if (this.stateElapsedMs < activeStartMs || this.stateElapsedMs > activeEndMs) {
        return null;
      }
      const range = this.definition.slashRange;
      return {
        x: direction > 0 ? this.positionX + this.width : this.positionX - range,
        y: this.positionY + this.height * 0.1,
        width: range,
        height: this.height * 0.8,
      };
    }
    if (this.currentState === "charging") {
      // durante la carica tutto il corpo è pericoloso
      return { x: this.positionX - 2, y: this.positionY, width: this.width + 4, height: this.height };
    }
    return null;
  }

  public markPlayerHit(): void {
    this.hasHitPlayerThisAttack = true;
  }

  public update(
    deltaTimeSeconds: number,
    player: Player,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    const deltaTimeMs = deltaTimeSeconds * 1000;
    this.hitFlashRemainingMs = Math.max(0, this.hitFlashRemainingMs - deltaTimeMs);
    this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - deltaTimeMs);
    this.stateElapsedMs += deltaTimeMs;
    if (!this.isAlive) {
      this.deathElapsedMs += deltaTimeMs;
    }

    this.updateBehavior(player);

    const xBeforeMove = this.positionX;
    collisionSystem.applyGravityAndMove(
      this,
      deltaTimeSeconds,
      GAME_CONFIG.gravity,
      GAME_CONFIG.maxFallSpeed,
      platforms,
      mapWidth
    );
    // la carica finisce se sbatte contro un muro o il bordo della mappa
    if (this.currentState === "charging") {
      const expectedMovement = Math.abs(this.velocityX * deltaTimeSeconds);
      if (Math.abs(this.positionX - xBeforeMove) < expectedMovement * 0.5) {
        this.changeState("recovery");
      }
    }
    this.animationPlayer.play(this.getAnimationName());
    this.animationPlayer.update(deltaTimeSeconds);
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    spriteManager.drawSpriteAligned(
      renderer,
      this.animationPlayer.currentFrameId,
      this.positionX - cameraX,
      this.positionY + this.height - cameraY,
      this.width,
      this.facingDirection === "left",
      this.hitFlashRemainingMs > 0 ? PALETTE.white : null
    );
  }

  // -------------------------------------------------------------------------
  // Comportamento
  // -------------------------------------------------------------------------

  private updateBehavior(player: Player): void {
    const definition = this.definition;
    const phase = this.currentPhase;
    const playerCenterX = player.positionX + player.width / 2;
    const horizontalDistance = Math.abs(playerCenterX - this.centerX);
    const horizontalGap = Math.max(0, horizontalDistance - (this.width + player.width) / 2);
    const directionToPlayer: 1 | -1 = playerCenterX < this.centerX ? -1 : 1;
    this.velocityX = 0;

    switch (this.currentState) {
      case "dormant":
        if (!player.isDead && horizontalDistance <= definition.activationRange) {
          this.wakeUp();
        }
        break;
      case "idle":
      case "walk":
        this.faceDirection(directionToPlayer);
        if (player.isDead) {
          this.changeState("idle");
        } else if (this.cooldownRemainingMs <= 0) {
          this.chooseAndStartAttack(horizontalGap, directionToPlayer);
        } else if (this.nextAttack === "slash") {
          this.approachIfFar(horizontalGap, directionToPlayer, phase);
        }
        // se ha scelto la carica resta fermo ad aspettare: serve distanza per prendere la rincorsa
        break;
      case "slash": {
        const totalMs = definition.slashWindupMs + definition.slashActiveMs + definition.slashRecoveryMs;
        if (this.stateElapsedMs >= totalMs) {
          this.finishAttack(phase);
        }
        break;
      }
      case "chargeWindup":
        if (this.stateElapsedMs >= definition.chargeWindupMs) {
          this.changeState("charging");
        }
        break;
      case "charging":
        this.velocityX = this.lockedDirection * definition.chargeSpeed * phase.speedMultiplier;
        if (this.stateElapsedMs >= definition.chargeDurationMs) {
          this.changeState("recovery");
        }
        break;
      case "recovery":
        if (this.stateElapsedMs >= definition.chargeRecoveryMs) {
          this.finishAttack(phase);
        }
        break;
      case "dead":
        break;
    }
  }

  private wakeUp(): void {
    this.changeState("idle");
    this.cooldownRemainingMs = 800;
    this.nextAttack = this.rollNextAttack();
  }

  private rollNextAttack(): BossAttackChoice {
    return this.randomNumber() < this.currentPhase.chargeChance ? "charge" : "slash";
  }

  /** Il prossimo attacco è sorteggiato una volta sola per ogni pausa. */
  private chooseAndStartAttack(horizontalGap: number, directionToPlayer: 1 | -1): void {
    const definition = this.definition;
    const wantsCharge = this.nextAttack === "charge" && horizontalGap >= definition.chargeMinDistance;
    if (wantsCharge) {
      this.lockedDirection = directionToPlayer;
      this.hasHitPlayerThisAttack = false;
      this.changeState("chargeWindup");
    } else if (horizontalGap <= definition.slashRange) {
      this.lockedDirection = directionToPlayer;
      this.hasHitPlayerThisAttack = false;
      this.changeState("slash");
    } else {
      this.approachIfFar(horizontalGap, directionToPlayer, this.currentPhase);
    }
  }

  private approachIfFar(horizontalGap: number, directionToPlayer: 1 | -1, phase: BossPhaseDefinition): void {
    if (horizontalGap > this.definition.slashRange * 0.8) {
      this.velocityX = directionToPlayer * this.definition.movementSpeed * phase.speedMultiplier;
      this.changeState("walk");
    } else {
      this.changeState("idle");
    }
  }

  private finishAttack(phase: BossPhaseDefinition): void {
    // la fase può essere cambiata durante l'attacco: rollNextAttack usa quella corrente
    this.cooldownRemainingMs = this.definition.attackCooldownMs * phase.cooldownMultiplier;
    this.nextAttack = this.rollNextAttack();
    this.changeState("idle");
  }

  private faceDirection(direction: 1 | -1): void {
    this.facingDirection = direction < 0 ? "left" : "right";
  }

  private changeState(newState: BossState): void {
    if (this.currentState === newState) {
      return;
    }
    this.currentState = newState;
    this.stateElapsedMs = 0;
    if (newState === "slash" || newState === "chargeWindup") {
      this.faceDirection(this.lockedDirection);
      this.animationPlayer.restart(this.getAnimationName());
    }
    if (newState === "dead") {
      this.animationPlayer.restart("dead");
    }
  }

  private getAnimationName(): string {
    switch (this.currentState) {
      case "dormant":
        return "idle";
      default:
        return this.currentState;
    }
  }
}
