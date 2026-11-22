import { getAttackWorldHitbox } from "../combat/AttackDefinition";
import { ComboManager } from "../combat/ComboManager";
import { PlayerModifiers } from "../combat/PlayerModifiers";
import { KNIGHT_CROUCH_SUFFIX, KNIGHT_FIRE_SUFFIX } from "../rendering/sprites/knightSprites";
import { GAME_CONFIG } from "../config/gameConfig";
import { PLAYER_ANIMATIONS } from "../config/animationConfig";
import { PLAYER_CONFIG } from "../config/playerConfig";
import { DEFAULT_WEAPON_ID, WEAPON_CONFIG } from "../config/weaponConfig";
import { AnimationPlayer } from "../rendering/AnimationManager";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import { CollisionSystem } from "../systems/CollisionSystem";
import type { AttackDefinition, Damageable, PlayerEnvironment, PlayerState, PowerUpDefinition, WeaponDefinition } from "../types/EntityTypes";
import type { GameAction, InputSource, Rectangle, Vector2 } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { GameObject } from "./GameObject";

/** Intervallo (ms) del lampeggio durante l'invulnerabilità. */
const BLINK_INTERVAL_MS = 80;

type AttackInput = "attack" | "heavyAttack";

/** Negli ultimi ms di un power-up l'alone lampeggia (sta per scadere). */
const POWER_UP_WARNING_MS = 2000;

/** Ambiente normale: nessun modificatore. */
export const NORMAL_PLAYER_ENVIRONMENT: PlayerEnvironment = {
  speedMultiplier: 1,
  gravityMultiplier: 1,
  maxFallSpeedMultiplier: 1,
  jumpMultiplier: 1,
  traction: null,
  canSwim: false,
};

/** Il cavaliere controllato dal giocatore. */
export class Player extends GameObject {
  public currentState: PlayerState = "idle";
  /** Ambiente in cui si trova (acqua, ghiaccio...): lo imposta il motore prima di ogni aggiornamento. */
  public environment: PlayerEnvironment = NORMAL_PLAYER_ENVIRONMENT;
  /** Power-up attivi: le statistiche effettive si calcolano da qui, PLAYER_CONFIG resta invariato. */
  public readonly modifiers = new PlayerModifiers();
  public currentHealth: number = PLAYER_CONFIG.maxHealth;
  public readonly maxHealth: number = PLAYER_CONFIG.maxHealth;

  private readonly animationPlayer = new AnimationPlayer(PLAYER_ANIMATIONS, "idle");
  /** Arma in mano: decide attacchi e combo (vedi equipWeapon). */
  private weapon: WeaponDefinition = WEAPON_CONFIG[DEFAULT_WEAPON_ID];
  /** Combo a terra e in aria (categorie separate): un attacco usa quella di dove si trova il cavaliere. */
  private groundComboManager = Player.createComboManager(this.weapon, "ground");
  private airComboManager = Player.createComboManager(this.weapon, "air");
  /** Il gestore usato dall'ultimo attacco: cambiando categoria l'altro riparte da capo. */
  private comboManager: ComboManager = this.groundComboManager;
  /** Nome dell'ultima combo completata, finché il motore non lo preleva (per mostrarlo). */
  private completedComboName: string | null = null;
  /** Vero per un frame dopo che un colpo in picchiata ha toccato terra (polvere, tremolio). */
  private hasPendingPlungeLanding = false;

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
  /** Durata dell'ultimo aggiornamento (serve all'aderenza sul ghiaccio). */
  private lastDeltaTimeSeconds = 0;
  /** Salute rigenerata non ancora applicata (frazioni di HP). */
  private regenerationAccumulator = 0;
  /** Tempo per la pulsazione degli aloni dei power-up. */
  private auraElapsedMs = 0;
  private deathElapsedMs = 0;

  constructor(startX: number, startY: number) {
    super(startX, startY, PLAYER_CONFIG.hitboxWidth, PLAYER_CONFIG.hitboxHeight);
  }

  /** Nome dell'animazione in corso (utile per debug e test). */
  public get currentAnimationName(): string {
    return this.animationPlayer.animationName;
  }

  /** Vero quando il cavaliere è accovacciato (hitbox più bassa, i piedi restano a terra). */
  public get isCrouching(): boolean {
    return this.height < PLAYER_CONFIG.hitboxHeight;
  }

  /** Vero durante la schivata: l'unico momento in cui si attraversano i nemici. */
  public get isDodging(): boolean {
    return this.dodgeRemainingMs > 0;
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

  public get equippedWeapon(): WeaponDefinition {
    return this.weapon;
  }

  /** Cambia arma (di solito una voce di WEAPON_CONFIG): l'attacco in corso e la combo vengono annullati. */
  public equipWeapon(weapon: WeaponDefinition): void {
    if (this.weapon === weapon) {
      return;
    }
    this.cancelAttack();
    this.weapon = weapon;
    this.groundComboManager = Player.createComboManager(weapon, "ground");
    this.airComboManager = Player.createComboManager(weapon, "air");
    this.comboManager = this.groundComboManager;
  }

  /** Nome della combo appena completata (una volta sola), oppure null. */
  public drainCompletedComboName(): string | null {
    const name = this.completedComboName;
    this.completedComboName = null;
    return name;
  }

  /** Vero una volta sola dopo che un colpo in picchiata ha toccato terra. */
  public drainPlungeLanding(): boolean {
    const hasLanded = this.hasPendingPlungeLanding;
    this.hasPendingPlungeLanding = false;
    return hasLanded;
  }

  /**
   * Il colpo in corso ha preso un bersaglio. Se è un colpo in picchiata il cavaliere rimbalza verso
   * l'alto e l'attacco finisce (si può subito colpire di nuovo in picchiata). Restituisce true se rimbalza.
   */
  public bounceOffTarget(): boolean {
    const plunge = this.currentAttack?.plunge;
    if (plunge === undefined || this.isOnGround) {
      return false;
    }
    this.velocityY = -plunge.bounceSpeed;
    this.currentAttack = null;
    this.attackElapsedMs = 0;
    this.attackCooldownRemainingMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.airComboManager.reset();
    return true;
  }

  /** Moltiplicatore del danno inflitto. Punto di estensione per i futuri power-up. */
  public getDamageMultiplier(): number {
    return this.modifiers.getValue("damageMultiplier");
  }

  /** Danno aggiunto a ogni colpo (power-up del fuoco). */
  public getBonusDamage(): number {
    return this.modifiers.getValue("bonusDamage");
  }

  /** Attiva un power-up raccolto. */
  public applyPowerUp(definition: PowerUpDefinition): void {
    if (!this.isDead) {
      this.modifiers.add(definition);
    }
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
    this.height = PLAYER_CONFIG.hitboxHeight;
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
    this.modifiers.clear();
    this.regenerationAccumulator = 0;
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
    // lo scudo riduce il danno, ma un colpo toglie sempre almeno 1 HP
    const reducedDamage = Math.max(1, Math.round(damage * this.modifiers.getValue("damageTakenMultiplier")));
    this.currentHealth = Math.max(0, this.currentHealth - reducedDamage);
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
    this.lastDeltaTimeSeconds = deltaTimeSeconds;

    this.updateCrouch(input, platforms);
    if (this.isDead) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
      // stordito: nessun controllo, il rinculo prosegue
    } else {
      this.handleInput(input);
    }

    // colpo in picchiata: si scende a velocità fissa (la gravità del frame si aggiunge, entro maxFallSpeed)
    const plunge = this.currentAttack?.plunge;
    if (plunge !== undefined && !this.isOnGround) {
      this.velocityY = plunge.fallSpeed;
    }

    // Il rinculo non può spingere il giocatore giù da un bordo: se dietro di lui c'è il vuoto si ferma.
    if (this.hurtRemainingMs > 0 && this.velocityX !== 0 && !this.hasGroundInDirectionOfMovement(platforms)) {
      this.velocityX = 0;
    }

    collisionSystem.applyGravityAndMove(
      this,
      deltaTimeSeconds,
      GAME_CONFIG.gravity * this.environment.gravityMultiplier,
      GAME_CONFIG.maxFallSpeed * this.environment.maxFallSpeedMultiplier,
      platforms,
      mapWidth
    );
    if (this.hurtRemainingMs > 0 && this.isOnGround && this.velocityY === 0) {
      this.velocityX = 0; // il rinculo finisce toccando terra
    }
    if (this.currentAttack?.plunge !== undefined && this.isOnGround) {
      this.finishPlungeOnLanding();
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
    this.renderPowerUpAuras(renderer, cameraX, cameraY);
    // Lo sprite è più grande dell'hitbox (pennacchio, spada, scie): l'allineamento usa
    // la colonna d'ancoraggio registrata con lo sprite (vedi knightSprites.ts).
    // Con il power-up del fuoco si usano le varianti con la lama incandescente;
    // attaccando da accovacciati, le varianti in cui il cavaliere resta basso.
    const fireSuffix = this.modifiers.has("fire") ? KNIGHT_FIRE_SUFFIX : "";
    spriteManager.drawSpriteAligned(
      renderer,
      `${this.getRenderedFrameId()}${fireSuffix}`,
      this.positionX - cameraX,
      this.positionY + this.height - cameraY,
      PLAYER_CONFIG.hitboxWidth,
      this.facingDirection === "left"
    );
  }

  /**
   * Alone (retino che pulsa) dietro il cavaliere per ogni power-up attivo, nel suo colore.
   * Negli ultimi 2 secondi lampeggia per avvisare che sta per scadere.
   */
  private renderPowerUpAuras(renderer: Renderer, cameraX: number, cameraY: number): void {
    const centerX = this.positionX + this.width / 2 - cameraX;
    const centerY = this.positionY + this.height / 2 - 2 - cameraY;
    this.modifiers.activePowerUps.forEach((powerUp, auraIndex) => {
      const isExpiring = powerUp.remainingMs < POWER_UP_WARNING_MS;
      if (isExpiring && Math.floor(powerUp.remainingMs / 120) % 2 === 0) {
        return;
      }
      const pulse = Math.floor((this.auraElapsedMs + auraIndex * 150) / 180) % 2;
      renderer.fillGlow(centerX, centerY, 17 + pulse + auraIndex * 2, powerUp.definition.auraColor, 2, 4);
    });
  }

  // -------------------------------------------------------------------------
  // Logica interna
  // -------------------------------------------------------------------------

  private updateTimers(deltaTimeMs: number): void {
    this.invulnerabilityRemainingMs = Math.max(0, this.invulnerabilityRemainingMs - deltaTimeMs);
    this.attackCooldownRemainingMs = Math.max(0, this.attackCooldownRemainingMs - deltaTimeMs);
    this.dodgeCooldownRemainingMs = Math.max(0, this.dodgeCooldownRemainingMs - deltaTimeMs);
    this.groundComboManager.update(deltaTimeMs);
    this.airComboManager.update(deltaTimeMs);
    // prima la cura del frame, poi la scadenza: così l'ultimo frame del power-up conta
    this.applyRegeneration(deltaTimeMs);
    this.modifiers.update(deltaTimeMs);
    this.auraElapsedMs += deltaTimeMs;
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

  /**
   * Accovacciarsi: solo a terra, tenendo il tasto. La hitbox si abbassa e i piedi restano dove sono.
   * Ci si rialza solo se non c'è una piattaforma solida sopra la testa (quelle a senso unico non contano).
   */
  private updateCrouch(input: InputSource, platforms: PlatformDefinition[]): void {
    const canCrouch =
      input.isHeld("crouch") &&
      this.isOnGround &&
      !this.isDead &&
      this.hurtRemainingMs <= 0 &&
      this.dodgeRemainingMs <= 0;
    this.setCrouched(canCrouch, platforms);
  }

  private setCrouched(crouched: boolean, platforms: PlatformDefinition[]): void {
    if (crouched === this.isCrouching) {
      return;
    }
    const feetY = this.positionY + this.height;
    const newHeight = crouched ? PLAYER_CONFIG.crouchHitboxHeight : PLAYER_CONFIG.hitboxHeight;
    if (!crouched) {
      const standingBounds = { x: this.positionX, y: feetY - newHeight, width: this.width, height: newHeight };
      const isBlockedByCeiling = platforms.some(
        (platform) => !platform.oneWay && CollisionSystem.intersects(standingBounds, platform)
      );
      if (isBlockedByCeiling) {
        return;
      }
    }
    this.height = newHeight;
    this.positionY = feetY - newHeight;
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
      this.approachHorizontalVelocity(0); // a terra l'attacco ferma il movimento (sul ghiaccio scivola)
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

  /** Attacco a terra o in aria (categorie di combo separate: passando dall'una all'altra la combo riparte). */
  private startAttack(attackInput: GameAction): void {
    const manager = this.isOnGround ? this.groundComboManager : this.airComboManager;
    if (manager !== this.comboManager) {
      this.comboManager.reset();
      this.comboManager = manager;
    }
    const attack = manager.getNextAttack(attackInput);
    const completedCombo = manager.drainCompletedCombo();
    if (completedCombo?.name !== undefined) {
      this.completedComboName = completedCombo.name;
    }
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
    this.groundComboManager.reset();
    this.airComboManager.reset();
  }

  /** Il colpo in picchiata tocca terra: finisce, con il suo tempo di recupero. */
  private finishPlungeOnLanding(): void {
    this.attackCooldownRemainingMs = this.currentAttack?.cooldownMs ?? 0;
    this.currentAttack = null;
    this.attackElapsedMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.airComboManager.reset();
    this.hasPendingPlungeLanding = true;
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
    // accovacciato non ci si sposta: ci si può solo girare
    const crouchFactor = this.isCrouching ? 0 : 1;
    this.approachHorizontalVelocity(
      crouchFactor *
        direction *
        PLAYER_CONFIG.movementSpeed *
        this.weapon.movementSpeedMultiplier *
        this.environment.speedMultiplier *
        this.modifiers.getValue("movementSpeedMultiplier")
    );
    // la direzione resta bloccata mentre si attacca
    if (direction !== 0 && this.currentAttack === null) {
      this.facingDirection = direction < 0 ? "left" : "right";
    }
  }

  private applyJumpInput(input: InputSource, isJumpBlocked: boolean): void {
    if (input.wasPressed("jump")) {
      this.jumpBufferRemainingMs = PLAYER_CONFIG.jumpBufferMs;
    }
    const canJump = (this.isOnGround || this.coyoteRemainingMs > 0 || this.environment.canSwim) && !isJumpBlocked;
    if (this.jumpBufferRemainingMs > 0 && canJump) {
      this.velocityY = -PLAYER_CONFIG.jumpForce * this.environment.jumpMultiplier;
      this.jumpBufferRemainingMs = 0;
      this.coyoteRemainingMs = 0;
    }
    // Salto variabile: rilasciando il tasto in salita il salto si accorcia.
    if (input.wasReleased("jump") && this.velocityY < 0) {
      this.velocityY *= PLAYER_CONFIG.jumpCutMultiplier;
    }
  }

  /** Rigenerazione (power-up): accumula frazioni di HP e cura a punti interi. */
  private applyRegeneration(deltaTimeMs: number): void {
    const healthPerSecond = this.modifiers.getValue("healthRegenPerSecond");
    if (healthPerSecond <= 0 || this.isDead) {
      this.regenerationAccumulator = 0;
      return;
    }
    this.regenerationAccumulator += (healthPerSecond * deltaTimeMs) / 1000;
    // piccola tolleranza: la somma di molti frame (es. 600 x 0,0667) non deve perdere un punto per arrotondamento
    const wholePoints = Math.floor(this.regenerationAccumulator + 1e-6);
    if (wholePoints > 0) {
      this.regenerationAccumulator -= wholePoints;
      this.heal(wholePoints);
    }
  }

  /**
   * Porta la velocità orizzontale verso quella voluta: subito se l'aderenza è piena, altrimenti
   * gradualmente (ghiaccio: si scivola all'avvio e alla frenata). In aria l'aderenza non conta.
   */
  private approachHorizontalVelocity(targetVelocityX: number): void {
    const traction = this.environment.traction;
    if (traction === null || !this.isOnGround) {
      this.velocityX = targetVelocityX;
      return;
    }
    const blend = Math.min(1, traction * this.lastDeltaTimeSeconds);
    this.velocityX += (targetVelocityX - this.velocityX) * blend;
    if (Math.abs(this.velocityX) < 1 && targetVelocityX === 0) {
      this.velocityX = 0;
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
    } else if (this.isCrouching && this.isOnGround) {
      this.currentState = "crouch";
    } else if (!this.isOnGround) {
      this.currentState = this.velocityY < 0 ? "jump" : "fall";
    } else if (this.velocityX !== 0) {
      this.currentState = "walk";
    } else {
      this.currentState = "idle";
    }
  }

  /**
   * Frame da disegnare: quello dell'animazione con il suffisso dell'arma in mano ("" per la spada);
   * durante un attacco da accovacciati, la variante bassa dello sprite.
   * Si guarda l'animazione in corso, non lo stato: un colpo subito cambia subito l'animazione
   * (danno), mentre lo stato si aggiorna solo al frame successivo.
   */
  public getRenderedFrameId(): string {
    const frameId = this.animationPlayer.currentFrameId;
    const isCrouchedAttackFrame =
      this.isCrouching && this.currentAttack !== null && this.animationPlayer.animationName === this.currentAttack.animation;
    const crouchSuffix = isCrouchedAttackFrame ? KNIGHT_CROUCH_SUFFIX : "";
    return `${frameId}${crouchSuffix}${this.weapon.spriteSuffix}`;
  }

  /** Gestore delle combo dell'arma per terra o aria (senza combo aeree, in aria valgono quelle di terra). */
  private static createComboManager(weapon: WeaponDefinition, category: "ground" | "air"): ComboManager {
    const comboSet = category === "air" && weapon.air !== undefined ? weapon.air : weapon;
    return new ComboManager(comboSet.combos, weapon.attacks, comboSet.defaultAttackByInput);
  }

  private getAnimationName(): string {
    if (this.currentState === "attack" && this.currentAttack !== null) {
      return this.currentAttack.animation;
    }
    return this.currentState;
  }
}
