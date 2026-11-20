import { ENEMY_AI_CONFIG } from "../config/enemyConfig";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { PlatformDefinition } from "../types/LevelTypes";
import { CollisionSystem } from "./CollisionSystem";

/**
 * Decide cosa fa ogni nemico a ogni frame, in base al suo comportamento:
 *  - patrol: pattuglia una zona attorno al punto di partenza e, se vede il
 *    giocatore, lo affronta restando dentro la zona;
 *  - chase: aspetta, poi insegue il giocatore quando entra nel raggio;
 *  - guard: resta fermo, si volta verso il giocatore e attacca se è abbastanza vicino.
 * Tutti attaccano quando il giocatore è a portata. Nessuno cammina nel vuoto
 * o contro un muro.
 */
export class EnemyAISystem {
  public update(enemies: Enemy[], player: Player, platforms: PlatformDefinition[]): void {
    for (const enemy of enemies) {
      if (!enemy.canAct) {
        continue;
      }
      this.updateEnemy(enemy, player, platforms);
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
        if (canSeePlayer) {
          enemy.faceTowards(playerCenterX);
        }
        break;
    }
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
    return hasGround && !isBlockedByWall;
  }
}
