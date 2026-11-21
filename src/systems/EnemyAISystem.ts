import { ENEMY_AI_CONFIG } from "../config/enemyConfig";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { HazardDefinition, PlatformDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/**
 * Decide cosa fa ogni nemico a ogni frame, in base al suo comportamento:
 *  - patrol: pattuglia una zona attorno al punto di partenza e, se vede il
 *    giocatore, lo affronta restando dentro la zona;
 *  - chase: aspetta, poi insegue il giocatore quando entra nel raggio;
 *  - guard: resta fermo, si volta verso il giocatore e attacca se è abbastanza vicino;
 *  - ranged: tiene le distanze (indietreggia se il giocatore è troppo vicino) e tira proiettili
 *    quando il giocatore è alla sua altezza ed entro attackRange;
 *  - flyer: vola attorno al punto di partenza; quando vede il giocatore (in qualsiasi direzione)
 *    gli resta sopra la testa e, a distanza attackRange, si lancia in picchiata.
 * Tutti attaccano quando il giocatore è a portata. Nessun nemico a terra cammina nel vuoto,
 * contro un muro, sugli spuntoni o nell'acqua.
 */
export class EnemyAISystem {
  private hazards: HazardDefinition[] = [];

  /**
   * @param elapsedMs tempo di gioco (ms), per l'oscillazione dei volanti
   * @param hazards pericoli del livello (i nemici a terra non ci entrano)
   */
  public update(
    enemies: Enemy[],
    player: Player,
    platforms: PlatformDefinition[],
    hazards: HazardDefinition[] = [],
    elapsedMs = 0
  ): void {
    this.hazards = hazards;
    for (const enemy of enemies) {
      if (!enemy.canAct) {
        continue;
      }
      if (enemy.definition.behavior === "flyer") {
        this.updateFlyer(enemy, player, elapsedMs);
      } else if (enemy.definition.behavior === "ranged") {
        this.updateRanged(enemy, player, platforms);
      } else {
        this.updateEnemy(enemy, player, platforms);
      }
    }
  }

  private updateEnemy(enemy: Enemy, player: Player, platforms: PlatformDefinition[]): void {
    const playerCenterX = player.positionX + player.width / 2;
    const horizontalDistance = Math.abs(playerCenterX - enemy.centerX);
    const horizontalGap = Math.max(0, horizontalDistance - (enemy.width + player.width) / 2);
    const verticalDistance = Math.abs(
      player.positionY + player.height / 2 - (enemy.positionY + enemy.height / 2)
    );
    const isPlayerOnSameLevel =
      !player.isDead && verticalDistance <= ENEMY_AI_CONFIG.verticalDetectionTolerance;
    const canSeePlayer = isPlayerOnSameLevel && horizontalDistance <= enemy.definition.detectionRange;
    const isPlayerInAttackRange = isPlayerOnSameLevel && horizontalGap <= enemy.definition.attackRange;

    if (isPlayerInAttackRange) {
      enemy.faceTowards(playerCenterX);
      if (enemy.isAttackReady) {
        enemy.beginAttack();
      }
      return; // a portata: resta fermo (attacca o aspetta il recupero)
    }

    switch (enemy.definition.behavior) {
      case "patrol":
        this.updatePatrol(enemy, canSeePlayer, playerCenterX, platforms);
        break;
      case "chase":
        this.updateChase(enemy, canSeePlayer, isPlayerOnSameLevel, horizontalDistance, playerCenterX, platforms);
        break;
      case "guard":
      case "ranged":
      case "flyer":
        if (canSeePlayer) {
          enemy.faceTowards(playerCenterX);
        }
        break;
    }
  }

  /** A distanza: indietreggia se il giocatore è troppo vicino, altrimenti tira quando è alla sua altezza. */
  private updateRanged(enemy: Enemy, player: Player, platforms: PlatformDefinition[]): void {
    const ranged = enemy.definition.ranged;
    const playerCenterX = player.positionX + player.width / 2;
    const horizontalDistance = Math.abs(playerCenterX - enemy.centerX);
    const horizontalGap = Math.max(0, horizontalDistance - (enemy.width + player.width) / 2);
    const verticalDistance = Math.abs(player.positionY + player.height / 2 - enemy.centerY);
    const isPlayerOnSameLevel = !player.isDead && verticalDistance <= ENEMY_AI_CONFIG.verticalDetectionTolerance;
    if (!isPlayerOnSameLevel || horizontalDistance > enemy.definition.detectionRange) {
      if (enemy.definition.patrolDistance > 0) {
        this.updatePatrol(enemy, false, playerCenterX, platforms);
      }
      return;
    }
    enemy.faceTowards(playerCenterX);
    const directionToPlayer = playerCenterX < enemy.centerX ? -1 : 1;
    const directionAway = directionToPlayer > 0 ? -1 : 1;
    if (ranged !== undefined && horizontalGap < ranged.retreatDistance && this.canMoveForward(enemy, directionAway, platforms)) {
      // indietreggia senza voltarsi: continua a guardare il giocatore
      enemy.setMovement(directionAway);
      enemy.faceTowards(playerCenterX);
      return;
    }
    if (horizontalGap <= enemy.definition.attackRange && enemy.isAttackReady) {
      enemy.beginAttack();
    }
  }

  /**
   * Volante: senza bersaglio volteggia attorno al punto di partenza; visto il giocatore (distanza
   * tra i centri entro detectionRange) gli si porta sopra la testa, dal lato in cui si trova, e
   * a distanza attackRange si lancia in picchiata verso di lui.
   */
  private updateFlyer(enemy: Enemy, player: Player, elapsedMs: number): void {
    const flight = enemy.definition.flight;
    if (flight === undefined) {
      return;
    }
    const playerCenterX = player.positionX + player.width / 2;
    const playerCenterY = player.positionY + player.height / 2;
    const distance = Math.hypot(playerCenterX - enemy.centerX, playerCenterY - enemy.centerY);
    if (!player.isDead && distance <= enemy.definition.detectionRange) {
      enemy.isChasing = true;
    } else if (player.isDead || distance > enemy.definition.detectionRange * ENEMY_AI_CONFIG.loseInterestMultiplier) {
      enemy.isChasing = false;
    }
    const bobPhase = ((elapsedMs + enemy.spawnPositionX * 7) / flight.bobPeriodMs) * Math.PI * 2;
    const bobOffset = Math.sin(bobPhase) * flight.bobAmplitude;
    if (!enemy.isChasing) {
      const patrolOffset = Math.sin(bobPhase / 3) * enemy.definition.patrolDistance;
      enemy.setFlightTarget(enemy.spawnPositionX + enemy.width / 2 + patrolOffset, enemy.spawnPositionY + enemy.height / 2 + bobOffset);
      return;
    }
    if (distance <= enemy.definition.attackRange && enemy.isAttackReady) {
      enemy.beginAttack({ x: playerCenterX, y: playerCenterY });
      return;
    }
    const side = enemy.centerX < playerCenterX ? -1 : 1;
    enemy.setFlightTarget(playerCenterX + side * 24, player.positionY - flight.hoverHeight + bobOffset);
  }

  private updatePatrol(
    enemy: Enemy,
    canSeePlayer: boolean,
    playerCenterX: number,
    platforms: PlatformDefinition[]
  ): void {
    const zoneMinX = enemy.spawnPositionX - enemy.definition.patrolDistance;
    const zoneMaxX = enemy.spawnPositionX + enemy.definition.patrolDistance;

    if (canSeePlayer) {
      const directionToPlayer = playerCenterX < enemy.centerX ? -1 : 1;
      const isInsideZone =
        directionToPlayer > 0 ? enemy.positionX < zoneMaxX : enemy.positionX > zoneMinX;
      enemy.faceTowards(playerCenterX);
      if (isInsideZone && this.canMoveForward(enemy, directionToPlayer, platforms)) {
        enemy.setMovement(directionToPlayer);
      }
      return;
    }

    const isAtZoneEdge =
      enemy.patrolDirection > 0 ? enemy.positionX >= zoneMaxX : enemy.positionX <= zoneMinX;
    if (isAtZoneEdge || !this.canMoveForward(enemy, enemy.patrolDirection, platforms)) {
      enemy.patrolDirection = enemy.patrolDirection > 0 ? -1 : 1;
    }
    if (this.canMoveForward(enemy, enemy.patrolDirection, platforms)) {
      enemy.setMovement(enemy.patrolDirection, ENEMY_AI_CONFIG.patrolSpeedMultiplier);
    }
  }

  private updateChase(
    enemy: Enemy,
    canSeePlayer: boolean,
    isPlayerOnSameLevel: boolean,
    horizontalDistance: number,
    playerCenterX: number,
    platforms: PlatformDefinition[]
  ): void {
    if (canSeePlayer) {
      enemy.isChasing = true;
    } else if (
      !isPlayerOnSameLevel ||
      horizontalDistance > enemy.definition.detectionRange * ENEMY_AI_CONFIG.loseInterestMultiplier
    ) {
      enemy.isChasing = false;
    }
    if (!enemy.isChasing) {
      return;
    }
    const directionToPlayer = playerCenterX < enemy.centerX ? -1 : 1;
    enemy.faceTowards(playerCenterX);
    if (this.canMoveForward(enemy, directionToPlayer, platforms)) {
      enemy.setMovement(directionToPlayer);
    }
  }

  /** Vero se davanti c'è terreno su cui camminare e nessun muro. */
  private canMoveForward(enemy: Enemy, direction: number, platforms: PlatformDefinition[]): boolean {
    const probeX = direction > 0 ? enemy.positionX + enemy.width : enemy.positionX - 1;
    const groundProbe = { x: probeX, y: enemy.positionY + enemy.height, width: 1, height: 2 };
    const wallProbe = { x: probeX, y: enemy.positionY + 2, width: 1, height: enemy.height - 4 };
    const hasGround = platforms.some((platform) => CollisionSystem.intersects(groundProbe, platform));
    const isBlockedByWall = platforms.some(
      (platform) => platform.oneWay !== true && CollisionSystem.intersects(wallProbe, platform)
    );
    // spuntoni e acqua contano come un vuoto: il nemico non ci entra
    const bodyProbe = { x: probeX, y: enemy.positionY, width: 1, height: enemy.height + 2 };
    const isDangerous = this.hazards.some(
      (hazard) => (hazard.kind === "spikes" || hazard.kind === "water") && CollisionSystem.intersects(bodyProbe, hazard)
    );
    return hasGround && !isBlockedByWall && !isDangerous;
  }
}
