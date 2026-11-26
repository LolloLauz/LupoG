import { BOSS_ATTACK_ANIMATIONS, createBossAnimations } from "../config/animationConfig";
import { ENEMY_CONFIG } from "../config/enemyConfig";
import { DEFAULT_DIFFICULTY, DIFFICULTY_CONFIG, GAME_CONFIG, PALETTE, type DifficultyId } from "../config/gameConfig";
import { StatusEffects, type StatusTick } from "../combat/StatusEffects";
import { ELEMENT_CONFIG } from "../config/elementConfig";
import { AnimationPlayer } from "../rendering/AnimationManager";
import { renderStatusAuras, renderStatusPips } from "../rendering/StatusRenderer";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import type { CollisionSystem } from "../systems/CollisionSystem";
import type {
  ElementId,
  HitProperties,
  BossAttackDefinition,
  BossDefinition,
  BossPhaseDefinition,
  Damageable,
  ProjectileLaunch,
  SummonRequest,
  SynergyDefinition,
} from "../types/EntityTypes";
import type { FacingDirection, Rectangle } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import { GameObject } from "./GameObject";
import type { Player } from "./Player";

/** Stati del boss fuori dagli attacchi (durante un attacco lo stato è il nome della fase, vedi BOSS_ATTACK_ANIMATIONS). */
type BossBaseState = "dormant" | "idle" | "walk" | "dead";

/** Fase dell'attacco in corso. */
type AttackPhase = "windup" | "active" | "recovery";

/** Pausa (ms) dopo il risveglio prima del primo attacco. */
const WAKE_UP_COOLDOWN_MS = 800;

/**
 * Boss guidato dai dati (BossDefinition): sceglie a caso, con i pesi della fase corrente, uno degli
 * attacchi configurati e lo esegue in tre fasi (preparazione ben visibile, fase attiva, recupero).
 * A differenza dei nemici normali non viene stordito dai colpi (lampeggia soltanto).
 *
 * Tipi di attacco:
 *  - melee: colpo davanti a sé, a portata "range";
 *  - charge: scatto in avanti, tutto il corpo ferisce; si ferma contro i muri;
 *  - projectile: ventaglio di proiettili mirati al giocatore (li lancia il motore, vedi drainProjectileLaunches);
 *  - summon: evoca nemici accanto a sé (li crea il motore, vedi drainSummonRequests).
 * Se l'attacco sorteggiato non è possibile (troppo vicino per caricare o lanciare, troppi evocati),
 * il boss usa il suo attacco corpo a corpo se il giocatore è a portata, altrimenti si avvicina.
 * L'IA è contenuta in questa classe.
 */
export class Boss extends GameObject implements Damageable {
  public currentHealth: number;
  public readonly maxHealth: number;
  /** Moltiplicatore del danno di tutti i suoi attacchi (difficoltà). */
  private readonly damageMultiplier: number;

  private readonly animationPlayer: AnimationPlayer;
  private baseState: BossBaseState = "dormant";
  private currentAttack: BossAttackDefinition | null = null;
  private attackPhase: AttackPhase = "windup";
  private stateElapsedMs = 0;
  private cooldownRemainingMs = 0;
  private nextAttack: BossAttackDefinition;
  private hasHitPlayerThisAttack = false;
  private hitFlashRemainingMs = 0;
  private deathElapsedMs = 0;
  private lockedDirection: 1 | -1 = -1;
  private pendingLaunches: ProjectileLaunch[] = [];
  private pendingSummons: SummonRequest[] = [];
  /**
   * Bordo sinistro dell'arena (oltre il cancello): il boss non va mai più a sinistra, così non può inseguire il
   * giocatore fuori dall'arena e restare chiuso fuori quando il cancello si chiude. null = nessun limite.
   */
  public arenaMinX: number | null = null;
  /** Effetti di stato (Fase 7): come per i nemici, ma il boss non si stordisce (lo shock lo ferisce subito). */
  private readonly statusEffects: StatusEffects;
  private pendingSynergy: SynergyDefinition | null = null;
  private pendingStatusTicks: StatusTick[] = [];

  constructor(
    public readonly definition: BossDefinition,
    startX: number,
    startY: number,
    private readonly randomNumber: () => number = Math.random,
    difficulty: DifficultyId = DEFAULT_DIFFICULTY
  ) {
    super(startX, startY, definition.hitbox.width, definition.hitbox.height);
    const firstAttack = definition.attacks[0];
    if (firstAttack === undefined) {
      throw new Error(`Il boss "${definition.id}" non ha attacchi`);
    }
    const difficultyConfig = DIFFICULTY_CONFIG[difficulty];
    this.maxHealth = Math.round(definition.maxHealth * difficultyConfig.enemyHealthMultiplier);
    this.currentHealth = this.maxHealth;
    this.damageMultiplier = difficultyConfig.enemyDamageMultiplier;
    this.facingDirection = "left";
    // le animazioni si ricavano dalla definizione (attacchi compresi): funziona con qualsiasi boss
    this.animationPlayer = new AnimationPlayer(createBossAnimations(definition), "idle");
    this.nextAttack = firstAttack;
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

  public get isAlive(): boolean {
    return this.currentHealth > 0;
  }

  /** Vero quando l'animazione di morte è finita: il livello può considerarsi completato. */
  public get isDefeated(): boolean {
    return !this.isAlive && this.deathElapsedMs >= this.definition.deathDurationMs;
  }

  /** Vero dopo il risveglio (usato per mostrare la barra della salute). */
  public get isActive(): boolean {
    return this.baseState !== "dormant";
  }

  /**
   * Stato corrente: "dormant", "idle", "walk", "dead" oppure, durante un attacco, il nome della
   * fase (es. "slash", "chargeWindup", "charging", "recovery", "castWindup"...).
   */
  public get currentState(): string {
    if (this.currentAttack === null) {
      return this.baseState;
    }
    return BOSS_ATTACK_ANIMATIONS[this.currentAttack.kind][this.attackPhase];
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

  /** Danno dell'attacco in corso (0 se l'attacco non ferisce con il corpo o con l'arma). */
  public get currentAttackDamage(): number {
    const attack = this.currentAttack;
    return attack !== null && (attack.kind === "melee" || attack.kind === "charge") ? Math.round(attack.damage * this.damageMultiplier) : 0;
  }

  /** Durata della preparazione dell'attacco in corso, se è in preparazione (utile ai bot di prova), altrimenti null. */
  public get currentAttackWindupMs(): number | null {
    return this.currentAttack !== null && this.attackPhase === "windup" ? this.currentAttack.windupMs : null;
  }

  /** Proiettili da lanciare chiesti dall'ultimo aggiornamento (li crea il motore). Svuota l'elenco. */
  public drainProjectileLaunches(): ProjectileLaunch[] {
    const launches = this.pendingLaunches;
    this.pendingLaunches = [];
    return launches;
  }

  /** Nemici da evocare chiesti dall'ultimo aggiornamento (li crea il motore). Svuota l'elenco. */
  public drainSummonRequests(): SummonRequest[] {
    const summons = this.pendingSummons;
    this.pendingSummons = [];
    return summons;
  }

  /** Sinergia innescata dall'ultimo colpo (una volta sola, il motore ne mostra il nome), oppure null. */
  public drainSynergy(): SynergyDefinition | null {
    const synergy = this.pendingSynergy;
    this.pendingSynergy = null;
    return synergy;
  }

  public receiveHit(damage: number, _hitDirection: FacingDirection, hit: HitProperties = {}): void {
    if (!this.isAlive) {
      return;
    }
    // colpirlo da lontano lo sveglia
    if (this.baseState === "dormant") {
      this.wakeUp();
    }
    // sinergia (Classi Fase 5): danno in più sull'effetto già presente, prima di applicare quelli del colpo
    const synergy = this.statusEffects.consumeSynergy(hit);
    if (synergy !== null) {
      this.pendingSynergy = synergy;
    }
    const hitDamage = synergy === null ? damage : Math.round(damage * synergy.damageMultiplier);
    // elementi (Fase 7): lo shock non stordisce un boss, ma lo ferisce subito
    let shockDamage = 0;
    for (const element of hit.elements ?? []) {
      if (this.statusEffects.apply(element).isApplied && element === "shock") {
        shockDamage = Math.round(ELEMENT_CONFIG.shock.bossInstantDamage * this.statusEffects.getMultiplier("shock"));
      }
    }
    this.currentHealth = Math.max(0, this.currentHealth - hitDamage - shockDamage);
    this.hitFlashRemainingMs = this.definition.hitFlashMs;
    if (!this.isAlive) {
      this.startDying();
    }
  }

  /** Comincia la morte: si ferma, l'attacco si interrompe, parte l'animazione. */
  private startDying(): void {
    this.deathElapsedMs = 0;
    this.velocityX = 0;
    this.currentAttack = null;
    this.changeBaseState("dead");
    this.animationPlayer.restart("dead");
  }

  /** Area d'urto dell'attacco se in questo momento è attiva, altrimenti null. */
  public getAttackHitbox(): Rectangle | null {
    const attack = this.currentAttack;
    if (attack === null || this.hasHitPlayerThisAttack || this.attackPhase !== "active") {
      return null;
    }
    if (attack.kind === "melee") {
      // dalla metà del corpo fino a range davanti: colpisce anche chi gli sta addosso
      const halfWidth = this.width / 2;
      return {
        x: this.facingDirection === "right" ? this.positionX + halfWidth : this.positionX - attack.range,
        y: this.positionY + this.height * 0.1,
        width: halfWidth + attack.range,
        height: this.height * 0.8,
      };
    }
    if (attack.kind === "charge") {
      // durante la carica tutto il corpo è pericoloso
      return { x: this.positionX - 2, y: this.positionY, width: this.width + 4, height: this.height };
    }
    return null;
  }

  public markPlayerHit(): void {
    this.hasHitPlayerThisAttack = true;
  }

  /**
   * @param aliveMinionCount nemici evocati da questo boss ancora vivi (limita gli attacchi "summon")
   */
  public update(
    deltaTimeSeconds: number,
    player: Player,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number,
    aliveMinionCount = 0
  ): void {
    const deltaTimeMs = deltaTimeSeconds * 1000;
    this.hitFlashRemainingMs = Math.max(0, this.hitFlashRemainingMs - deltaTimeMs);
    // effetti di stato: il danno nel tempo può uccidere (il motore dà le ricompense)
    if (this.isAlive) {
      for (const tick of this.statusEffects.update(deltaTimeMs)) {
        const tickDamage = Math.min(tick.damage, this.currentHealth);
        if (tickDamage > 0) {
          this.currentHealth -= tickDamage;
          this.pendingStatusTicks.push({ element: tick.element, damage: tickDamage });
        }
      }
      if (!this.isAlive) {
        this.startDying();
      }
    } else {
      this.statusEffects.clear();
    }
    this.cooldownRemainingMs = Math.max(0, this.cooldownRemainingMs - deltaTimeMs);
    this.stateElapsedMs += deltaTimeMs;
    if (!this.isAlive) {
      this.deathElapsedMs += deltaTimeMs;
    }

    this.updateBehavior(player, aliveMinionCount);

    const xBeforeMove = this.positionX;
    collisionSystem.applyGravityAndMove(
      this,
      deltaTimeSeconds,
      GAME_CONFIG.gravity,
      GAME_CONFIG.maxFallSpeed,
      platforms,
      mapWidth
    );
    // il boss resta nella sua arena (anche durante la carica, che si ferma come contro un muro)
    if (this.arenaMinX !== null && this.positionX < this.arenaMinX) {
      this.positionX = this.arenaMinX;
      this.velocityX = Math.max(0, this.velocityX);
    }
    // la carica finisce se sbatte contro un muro o il bordo della mappa
    if (this.currentAttack?.kind === "charge" && this.attackPhase === "active") {
      const expectedMovement = Math.abs(this.velocityX * deltaTimeSeconds);
      if (Math.abs(this.positionX - xBeforeMove) < expectedMovement * 0.5) {
        this.changeAttackPhase("recovery");
      }
    }
    this.animationPlayer.play(this.baseState === "dormant" ? "idle" : this.currentState);
    this.animationPlayer.update(deltaTimeSeconds);
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    const screenBounds = { x: this.positionX - cameraX, y: this.positionY - cameraY, width: this.width, height: this.height };
    renderStatusAuras(renderer, this.statusEffects, screenBounds);
    spriteManager.drawSpriteAligned(
      renderer,
      this.animationPlayer.currentFrameId,
      this.positionX - cameraX,
      this.positionY + this.height - cameraY,
      this.width,
      this.facingDirection === "left",
      this.hitFlashRemainingMs > 0 ? PALETTE.white : null
    );
    renderStatusPips(renderer, this.statusEffects, screenBounds);
  }

  // -------------------------------------------------------------------------
  // Comportamento
  // -------------------------------------------------------------------------

  private updateBehavior(player: Player, aliveMinionCount: number): void {
    const phase = this.currentPhase;
    const playerCenterX = player.positionX + player.width / 2;
    const horizontalDistance = Math.abs(playerCenterX - this.centerX);
    const horizontalGap = Math.max(0, horizontalDistance - (this.width + player.width) / 2);
    const directionToPlayer: 1 | -1 = playerCenterX < this.centerX ? -1 : 1;
    this.velocityX = 0;

    if (this.currentAttack !== null) {
      this.updateAttack(this.currentAttack, player, phase);
      return;
    }
    switch (this.baseState) {
      case "dormant":
        if (!player.isDead && horizontalDistance <= this.definition.activationRange) {
          this.wakeUp();
        }
        break;
      case "idle":
      case "walk":
        this.faceDirection(directionToPlayer);
        if (player.isDead) {
          this.changeBaseState("idle");
        } else if (this.cooldownRemainingMs <= 0) {
          this.chooseAndStartAttack(horizontalGap, directionToPlayer, aliveMinionCount);
        } else if (this.nextAttack.kind === "melee") {
          this.approachIfFar(horizontalGap, directionToPlayer, phase);
        }
        // gli altri attacchi si fanno da lontano: aspetta fermo
        break;
      case "dead":
        break;
    }
  }

  private updateAttack(attack: BossAttackDefinition, player: Player, phase: BossPhaseDefinition): void {
    switch (this.attackPhase) {
      case "windup":
        if (this.stateElapsedMs >= attack.windupMs) {
          this.changeAttackPhase("active");
          this.onActivePhaseStart(attack, player);
        }
        break;
      case "active":
        if (attack.kind === "charge") {
          this.velocityX = this.lockedDirection * attack.speed * phase.speedMultiplier * this.statusEffects.speedMultiplier;
        }
        if (this.stateElapsedMs >= attack.activeMs) {
          this.changeAttackPhase("recovery");
        }
        break;
      case "recovery":
        if (this.stateElapsedMs >= attack.recoveryMs) {
          this.finishAttack(phase);
        }
        break;
    }
  }

  /** All'inizio della fase attiva: lancia i proiettili o chiede gli evocati. */
  private onActivePhaseStart(attack: BossAttackDefinition, player: Player): void {
    if (attack.kind === "projectile") {
      const origin = {
        x:
          this.lockedDirection > 0
            ? this.positionX + attack.launchOffset.x
            : this.positionX + this.width - attack.launchOffset.x,
        y: this.positionY + attack.launchOffset.y,
      };
      const targetX = player.positionX + player.width / 2;
      const targetY = player.positionY + player.height / 2;
      const baseAngle = Math.atan2(targetY - origin.y, targetX - origin.x);
      const spreadRadians = (attack.spreadDegrees * Math.PI) / 180;
      for (let projectileIndex = 0; projectileIndex < attack.count; projectileIndex++) {
        const angleOffset = attack.count === 1 ? 0 : spreadRadians * (projectileIndex / (attack.count - 1) - 0.5);
        const angle = baseAngle + angleOffset;
        this.pendingLaunches.push({
          projectileId: attack.projectileId,
          origin: { ...origin },
          direction: { x: Math.cos(angle), y: Math.sin(angle) },
          damage: Math.round(attack.damage * this.damageMultiplier),
        });
      }
    } else if (attack.kind === "summon") {
      const minion = ENEMY_CONFIG[attack.enemyType];
      for (let summonIndex = 0; summonIndex < attack.count; summonIndex++) {
        const side = summonIndex % 2 === 0 ? -1 : 1;
        const distance = attack.spawnDistance * (1 + Math.floor(summonIndex / 2));
        this.pendingSummons.push({
          enemyType: attack.enemyType,
          position: {
            x: this.centerX + side * distance - minion.hitbox.width / 2,
            y: this.positionY + this.height - minion.hitbox.height,
          },
        });
      }
    }
  }

  private wakeUp(): void {
    this.changeBaseState("idle");
    this.cooldownRemainingMs = WAKE_UP_COOLDOWN_MS;
    this.nextAttack = this.rollNextAttack();
  }

  /** Sorteggio pesato: i pesi della fase si sommano nell'ordine degli attacchi della definizione. */
  private rollNextAttack(): BossAttackDefinition {
    const weights = this.currentPhase.attackWeights;
    const candidates = this.definition.attacks.filter((attack) => (weights[attack.id] ?? 0) > 0);
    const lastCandidate = candidates[candidates.length - 1];
    if (lastCandidate === undefined) {
      return this.nextAttack;
    }
    const totalWeight = candidates.reduce((sum, attack) => sum + (weights[attack.id] ?? 0), 0);
    let threshold = this.randomNumber() * totalWeight;
    for (const attack of candidates) {
      threshold -= weights[attack.id] ?? 0;
      if (threshold < 0) {
        return attack;
      }
    }
    return lastCandidate;
  }

  /** Vero se l'attacco si può eseguire ora (distanza, numero di evocati). */
  private canPerform(attack: BossAttackDefinition, horizontalGap: number, aliveMinionCount: number): boolean {
    switch (attack.kind) {
      case "melee":
        return horizontalGap <= attack.range;
      case "charge":
      case "projectile":
        return horizontalGap >= attack.minDistance;
      case "summon":
        return aliveMinionCount < attack.maxAlive;
    }
  }

  /** Il prossimo attacco è sorteggiato una volta sola per ogni pausa. */
  private chooseAndStartAttack(horizontalGap: number, directionToPlayer: 1 | -1, aliveMinionCount: number): void {
    if (this.canPerform(this.nextAttack, horizontalGap, aliveMinionCount)) {
      this.startAttack(this.nextAttack, directionToPlayer);
      return;
    }
    const meleeAttack = this.findMeleeAttack();
    if (meleeAttack !== null && this.canPerform(meleeAttack, horizontalGap, aliveMinionCount)) {
      this.startAttack(meleeAttack, directionToPlayer);
    } else {
      this.approachIfFar(horizontalGap, directionToPlayer, this.currentPhase);
    }
  }

  private findMeleeAttack(): Extract<BossAttackDefinition, { kind: "melee" }> | null {
    for (const attack of this.definition.attacks) {
      if (attack.kind === "melee") {
        return attack;
      }
    }
    return null;
  }

  private startAttack(attack: BossAttackDefinition, directionToPlayer: 1 | -1): void {
    this.lockedDirection = directionToPlayer;
    this.hasHitPlayerThisAttack = false;
    this.currentAttack = attack;
    this.attackPhase = "windup";
    this.stateElapsedMs = 0;
    this.faceDirection(directionToPlayer);
    this.animationPlayer.restart(this.currentState);
  }

  /** Si avvicina se è lontano (entro l'80% della portata del corpo a corpo); senza corpo a corpo resta fermo. */
  private approachIfFar(horizontalGap: number, directionToPlayer: 1 | -1, phase: BossPhaseDefinition): void {
    const meleeAttack = this.findMeleeAttack();
    if (meleeAttack !== null && horizontalGap > meleeAttack.range * 0.8) {
      this.velocityX = directionToPlayer * this.definition.movementSpeed * phase.speedMultiplier * this.statusEffects.speedMultiplier;
      this.changeBaseState("walk");
    } else {
      this.changeBaseState("idle");
    }
  }

  private finishAttack(phase: BossPhaseDefinition): void {
    // la fase può essere cambiata durante l'attacco: rollNextAttack usa quella corrente
    this.cooldownRemainingMs = this.definition.attackCooldownMs * phase.cooldownMultiplier;
    this.nextAttack = this.rollNextAttack();
    this.currentAttack = null;
    this.changeBaseState("idle");
  }

  private faceDirection(direction: 1 | -1): void {
    this.facingDirection = direction < 0 ? "left" : "right";
  }

  private changeAttackPhase(phase: AttackPhase): void {
    this.attackPhase = phase;
    this.stateElapsedMs = 0;
  }

  private changeBaseState(newState: BossBaseState): void {
    if (this.baseState === newState) {
      return;
    }
    this.baseState = newState;
    this.stateElapsedMs = 0;
  }
}
