import { getAttackWorldHitbox } from "../combat/AttackDefinition";
import { ComboManager } from "../combat/ComboManager";
import { GAME_CONFIG } from "../config/gameConfig";
import { PLAYER_ANIMATIONS } from "../config/animationConfig";
import {
  ATTACK_DEFINITIONS,
  COMBO_DEFINITIONS,
  DEFAULT_ATTACK_BY_INPUT,
  PLAYER_CONFIG,
} from "../config/playerConfig";
import { AnimationPlayer } from "../rendering/AnimationManager";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { CollisionSystem } from "../systems/CollisionSystem";
import type { AttackDefinition, Damageable, PlayerState } from "../types/EntityTypes";
import type { GameAction, InputSource, Rectangle, Vector2 } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { GameObject } from "./GameObject";

/** Intervallo (ms) del lampeggio durante l'invulnerabilità. */
const BLINK_INTERVAL_MS = 80;

type AttackInput = "attack" | "heavyAttack";

/** Il cavaliere controllato dal giocatore. */
export class Player extends GameObject {
  public currentState: PlayerState = "idle";
  public currentHealth: number = PLAYER_CONFIG.maxHealth;
  public readonly maxHealth: number = PLAYER_CONFIG.maxHealth;

  private readonly animationPlayer = new AnimationPlayer(PLAYER_ANIMATIONS, "idle");
  private readonly comboManager = new ComboManager(
    COMBO_DEFINITIONS,
    ATTACK_DEFINITIONS,
    DEFAULT_ATTACK_BY_INPUT
  );

  // --- attacco ---
  private currentAttack: AttackDefinition | null = null;
  private attackElapsedMs = 0;
  private attackCooldownRemainingMs = 0;
  private bufferedAttackInput: AttackInput | null = null;
  private bufferRemainingMs = 0;
  private readonly targetsHitByCurrentAttack = new Set<Damageable>();

  // --- tolleranza nel salto ---
  private coyoteRemainingMs = 0;
  private jumpBufferRemainingMs = 0;

  // --- schivata, danno, morte ---
  private dodgeRemainingMs = 0;
  private dodgeCooldownRemainingMs = 0;
  private hurtRemainingMs = 0;
  private invulnerabilityRemainingMs = 0;
  private deathElapsedMs = 0;

  constructor(startX: number, startY: number) {
    super(startX, startY, PLAYER_CONFIG.hitboxWidth, PLAYER_CONFIG.hitboxHeight);
  }

  /** Nome dell'animazione in corso (utile per debug e test). */
  public get currentAnimationName(): string {
    return this.animationPlayer.animationName;
  }

  public get isDead(): boolean {
    return this.currentHealth <= 0;
  }

  /** Vero se i colpi subiti vengono ignorati (dopo un colpo o durante la schivata). */
  public get isInvulnerable(): boolean {
    return this.invulnerabilityRemainingMs > 0 || this.dodgeRemainingMs > 0;
  }

  /** Vero quando la morte è durata abbastanza e si può ripartire. */
  public get isReadyToRespawn(): boolean {
    return this.isDead && this.deathElapsedMs >= PLAYER_CONFIG.deathDurationMs;
  }

  /** Attacco in corso (anche se non ancora attivo), oppure null. */
  public get activeAttack(): AttackDefinition | null {
    return this.currentAttack;
  }

  /** Moltiplicatore del danno inflitto. Punto di estensione per i futuri power-up. */
  public getDamageMultiplier(): number {
    return 1;
  }

  /** Recupera salute (senza superare il massimo). */
  public heal(amount: number): void {
    if (!this.isDead) {
      this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }
  }

  /**
   * Danno ambientale (es. caduta in un abisso): ignora l'invulnerabilità,
   * non causa rinculo. Dopo il danno il giocatore è invulnerabile per un po'.
   */
  public takeEnvironmentalDamage(damage: number): void {
    if (this.isDead) {
      return;
    }
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.invulnerabilityRemainingMs = PLAYER_CONFIG.invulnerabilityDurationMs;
    if (this.isDead) {
      this.deathElapsedMs = 0;
      this.animationPlayer.restart("dead");
    }
  }

  /** Riporta il giocatore in una posizione, fermo (usato per cadute e nuovi livelli). */
  public respawnAt(position: Vector2): void {
    this.positionX = position.x;
    this.positionY = position.y;
    this.velocityX = 0;
    this.velocityY = 0;
    this.facingDirection = "right";
    this.cancelAttack();
    this.dodgeRemainingMs = 0;
    this.hurtRemainingMs = 0;
    this.coyoteRemainingMs = 0;
    this.jumpBufferRemainingMs = 0;
    this.currentState = "idle";
  }

  /** Dopo la morte: salute piena e nessuna invulnerabilità residua. */
  public revive(): void {
    this.currentHealth = this.maxHealth;
    this.deathElapsedMs = 0;
    this.invulnerabilityRemainingMs = 0;
    this.dodgeCooldownRemainingMs = 0;
  }

  /**
   * Il giocatore subisce danno da una fonte posta a sourceX.
   * Restituisce false se il colpo viene ignorato (invulnerabile o già morto).
   */
  public takeDamage(damage: number, sourceCenterX: number): boolean {
    if (this.isDead || this.isInvulnerable) {
      return false;
    }
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.cancelAttack();
    this.invulnerabilityRemainingMs = PLAYER_CONFIG.invulnerabilityDurationMs;
    const knockbackDirection = this.positionX + this.width / 2 < sourceCenterX ? -1 : 1;
    this.velocityX = knockbackDirection * PLAYER_CONFIG.knockbackSpeedX;
    this.velocityY = -PLAYER_CONFIG.knockbackSpeedY;
    this.isOnGround = false;
    if (this.isDead) {
      this.deathElapsedMs = 0;
      this.hurtRemainingMs = 0;
      this.animationPlayer.restart("dead");
    } else {
      this.hurtRemainingMs = PLAYER_CONFIG.hurtDurationMs;
      this.animationPlayer.restart("hurt");
    }
    return true;
  }

  /** Area d'urto dell'attacco se in questo istante è attivo, altrimenti null. */
  public getActiveAttackHitbox(): Rectangle | null {
    const attack = this.currentAttack;
    if (attack === null || this.attackElapsedMs < attack.hitStartMs || this.attackElapsedMs > attack.hitEndMs) {
      return null;
    }
    return getAttackWorldHitbox(attack, this.getBounds(), this.facingDirection);
  }

  public hasAlreadyHit(target: Damageable): boolean {
    return this.targetsHitByCurrentAttack.has(target);
  }

  public registerHit(target: Damageable): void {
    this.targetsHitByCurrentAttack.add(target);
  }

  /** Un frame di gioco: timer, input, gravità, collisioni, stato e animazione. */
  public update(
    deltaTimeSeconds: number,
    input: InputSource,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    this.updateTimers(deltaTimeSeconds * 1000);

    if (this.isDead) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
      // stordito: nessun controllo, il rinculo prosegue
    } else {
      this.handleInput(input);
    }

    // Il rinculo non può spingere il giocatore giù da un bordo: se dietro di lui c'è il vuoto si ferma.
    if (this.hurtRemainingMs > 0 && this.velocityX !== 0 && !this.hasGroundInDirectionOfMovement(platforms)) {
      this.velocityX = 0;
    }

    collisionSystem.applyGravityAndMove(
      this,
      deltaTimeSeconds,
      GAME_CONFIG.gravity,
      GAME_CONFIG.maxFallSpeed,
      platforms,
      mapWidth
    );
    if (this.hurtRemainingMs > 0 && this.isOnGround && this.velocityY === 0) {
      this.velocityX = 0; // il rinculo finisce toccando terra
    }
    this.updateState();
    this.animationPlayer.play(this.getAnimationName());
    this.animationPlayer.update(deltaTimeSeconds);
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    const isBlinkHidden =
      !this.isDead &&
      this.invulnerabilityRemainingMs > 0 &&
      this.dodgeRemainingMs <= 0 &&
      Math.floor(this.invulnerabilityRemainingMs / BLINK_INTERVAL_MS) % 2 === 1;
    if (isBlinkHidden) {
      return;
    }
    const frameId = this.animationPlayer.currentFrameId;
    const spriteSize = spriteManager.getSpriteSize(frameId);
    const isFlipped = this.facingDirection === "left";
    // Il corpo occupa sempre i primi 16 pixel dello sprite; spada/scia sporgono dopo.
    const bodyOffsetX = (PLAYER_CONFIG.hitboxWidth - PLAYER_CONFIG.spriteWidth) / 2;
    const extraWidth = spriteSize.width - PLAYER_CONFIG.spriteWidth;
    spriteManager.drawSprite(
      renderer,
      frameId,
      this.positionX + bodyOffsetX - (isFlipped ? extraWidth : 0) - cameraX,
      this.positionY + PLAYER_CONFIG.hitboxHeight - spriteSize.height - cameraY,
      isFlipped
    );
  }

  // -------------------------------------------------------------------------
  // Logica interna
  // -------------------------------------------------------------------------

  private updateTimers(deltaTimeMs: number): void {
    this.invulnerabilityRemainingMs = Math.max(0, this.invulnerabilityRemainingMs - deltaTimeMs);
    this.attackCooldownRemainingMs = Math.max(0, this.attackCooldownRemainingMs - deltaTimeMs);
    this.dodgeCooldownRemainingMs = Math.max(0, this.dodgeCooldownRemainingMs - deltaTimeMs);
    this.comboManager.update(deltaTimeMs);
    // tolleranza nel salto: "coyote time" (si salta anche subito dopo aver lasciato il bordo)
    this.coyoteRemainingMs = this.isOnGround
      ? PLAYER_CONFIG.coyoteTimeMs
      : Math.max(0, this.coyoteRemainingMs - deltaTimeMs);
    this.jumpBufferRemainingMs = Math.max(0, this.jumpBufferRemainingMs - deltaTimeMs);

    // Un attacco memorizzato scade sempre dopo attackBufferMs: se non è partito in tempo, si perde.
    if (this.bufferedAttackInput !== null) {
      this.bufferRemainingMs -= deltaTimeMs;
      if (this.bufferRemainingMs <= 0) {
        this.bufferedAttackInput = null;
      }
    }
    if (this.isDead) {
      this.deathElapsedMs += deltaTimeMs;
    }
    if (this.hurtRemainingMs > 0) {
      this.hurtRemainingMs = Math.max(0, this.hurtRemainingMs - deltaTimeMs);
      if (this.hurtRemainingMs === 0) {
        this.velocityX = 0;
      }
    }
    if (this.dodgeRemainingMs > 0) {
      this.dodgeRemainingMs = Math.max(0, this.dodgeRemainingMs - deltaTimeMs);
      if (this.dodgeRemainingMs === 0) {
        this.velocityX = 0;
        this.dodgeCooldownRemainingMs = PLAYER_CONFIG.dodgeCooldownMs;
      }
    }
    if (this.currentAttack !== null) {
      this.attackElapsedMs += deltaTimeMs;
      if (this.attackElapsedMs >= this.currentAttack.durationMs) {
        this.attackCooldownRemainingMs = this.currentAttack.cooldownMs;
        this.currentAttack = null;
        this.targetsHitByCurrentAttack.clear();
        this.comboManager.onAttackFinished();
      }
    }
  }

  private handleInput(input: InputSource): void {
    const isDodging = this.dodgeRemainingMs > 0;

    if (input.wasPressed("dodge") && this.canStartDodge()) {
      this.startDodge();
    }
    if (input.wasPressed("attack")) {
      this.bufferAttack("attack");
    } else if (input.wasPressed("heavyAttack")) {
      this.bufferAttack("heavyAttack");
    }
    if (
      this.bufferedAttackInput !== null &&
      !isDodging &&
      this.currentAttack === null &&
      this.attackCooldownRemainingMs <= 0
    ) {
      this.startAttack(this.bufferedAttackInput);
      this.bufferedAttackInput = null;
    }

    if (this.dodgeRemainingMs > 0) {
      return; // durante la schivata la velocità è fissata
    }
    const isGroundedAttack = this.currentAttack !== null && this.isOnGround;
    if (isGroundedAttack) {
      this.velocityX = 0; // a terra l'attacco ferma il movimento
    } else {
      this.applyHorizontalInput(input);
    }
    this.applyJumpInput(input, isGroundedAttack);
  }

  /**
   * Memorizza un attacco premuto in anticipo, ma solo se potrà partire entro attackBufferMs.
   * Un tasto premuto molto prima (es. all'inizio di una sequenza lunga) viene ignorato:
   * altrimenti, premendo a raffica, il cavaliere continuerebbe ad attaccare anche dopo
   * aver smesso di premere.
   */
  /** Vero se subito oltre il bordo del corpo, nella direzione del movimento, c'è terreno poco più in basso. */
  private hasGroundInDirectionOfMovement(platforms: PlatformDefinition[]): boolean {
    const probeX = this.velocityX > 0 ? this.positionX + this.width + 2 : this.positionX - 2;
    const feetY = this.positionY + this.height;
    return platforms.some(
      (platform) =>
        probeX >= platform.x &&
        probeX <= platform.x + platform.width &&
        platform.y >= feetY - 6 &&
        platform.y - feetY <= PLAYER_CONFIG.knockbackLedgeCheckDepth
    );
  }

  private bufferAttack(attackInput: AttackInput): void {
    if (this.getMsUntilAttackAllowed() > PLAYER_CONFIG.attackBufferMs) {
      return;
    }
    this.bufferedAttackInput = attackInput;
    this.bufferRemainingMs = PLAYER_CONFIG.attackBufferMs;
  }

  /** Tra quanti ms si potrà iniziare un nuovo attacco (0 = subito). */
  private getMsUntilAttackAllowed(): number {
    let remainingMs = this.attackCooldownRemainingMs;
    if (this.currentAttack !== null) {
      remainingMs = this.currentAttack.durationMs - this.attackElapsedMs + this.currentAttack.cooldownMs;
    }
    return Math.max(remainingMs, this.dodgeRemainingMs);
  }

  private startAttack(attackInput: GameAction): void {
    const attack = this.comboManager.getNextAttack(attackInput);
    this.currentAttack = attack;
    this.attackElapsedMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.animationPlayer.restart(attack.animation);
  }

  private cancelAttack(): void {
    this.currentAttack = null;
    this.attackElapsedMs = 0;
    this.attackCooldownRemainingMs = 0;
    this.bufferedAttackInput = null;
    this.targetsHitByCurrentAttack.clear();
    this.comboManager.reset();
  }

  private canStartDodge(): boolean {
    return (
      this.isOnGround &&
      this.currentAttack === null &&
      this.dodgeRemainingMs <= 0 &&
      this.dodgeCooldownRemainingMs <= 0
    );
  }

  private startDodge(): void {
    this.dodgeRemainingMs = PLAYER_CONFIG.dodgeDurationMs;
    this.velocityX = (this.facingDirection === "right" ? 1 : -1) * PLAYER_CONFIG.dodgeSpeed;
    this.bufferedAttackInput = null;
    this.animationPlayer.restart("dodge");
  }

  private applyHorizontalInput(input: InputSource): void {
    let direction = 0;
    if (input.isHeld("moveLeft")) {
      direction -= 1;
    }
    if (input.isHeld("moveRight")) {
      direction += 1;
    }
    this.velocityX = direction * PLAYER_CONFIG.movementSpeed;
    // la direzione resta bloccata mentre si attacca
    if (direction !== 0 && this.currentAttack === null) {
      this.facingDirection = direction < 0 ? "left" : "right";
    }
  }

  private applyJumpInput(input: InputSource, isJumpBlocked: boolean): void {
    if (input.wasPressed("jump")) {
      this.jumpBufferRemainingMs = PLAYER_CONFIG.jumpBufferMs;
    }
    const canJump = (this.isOnGround || this.coyoteRemainingMs > 0) && !isJumpBlocked;
    if (this.jumpBufferRemainingMs > 0 && canJump) {
      this.velocityY = -PLAYER_CONFIG.jumpForce;
      this.jumpBufferRemainingMs = 0;
      this.coyoteRemainingMs = 0;
    }
    // Salto variabile: rilasciando il tasto in salita il salto si accorcia.
    if (input.wasReleased("jump") && this.velocityY < 0) {
      this.velocityY *= PLAYER_CONFIG.jumpCutMultiplier;
    }
  }

  /** Priorità: morto > stordito > schivata > attacco > aria > camminata > fermo. */
  private updateState(): void {
    if (this.isDead) {
      this.currentState = "dead";
    } else if (this.hurtRemainingMs > 0) {
      this.currentState = "hurt";
    } else if (this.dodgeRemainingMs > 0) {
      this.currentState = "dodge";
    } else if (this.currentAttack !== null) {
      this.currentState = "attack";
    } else if (!this.isOnGround) {
      this.currentState = this.velocityY < 0 ? "jump" : "fall";
    } else if (this.velocityX !== 0) {
      this.currentState = "walk";
    } else {
      this.currentState = "idle";
    }
  }

  private getAnimationName(): string {
    if (this.currentState === "attack" && this.currentAttack !== null) {
      return this.currentAttack.animation;
    }
    return this.currentState;
  }
}
