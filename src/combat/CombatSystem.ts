import type { Boss } from "../entities/Boss";
import type { Enemy } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { Damageable } from "../types/EntityTypes";
import { CollisionSystem } from "../systems/CollisionSystem";

/** Risultato di un colpo andato a segno. */
export interface HitResult {
  target: Damageable;
  damage: number;
}

/**
 * Applica i danni degli attacchi del giocatore ai bersagli.
 * Punti di estensione futuri: calculateDamage() è il luogo dove aggiungere
 * moltiplicatori (power-up), danni elementali e riduzioni.
 */
export class CombatSystem {
  /** Danno finale = danno base x moltiplicatore, almeno 1. */
  public static calculateDamage(baseDamage: number, damageMultiplier: number): number {
    return Math.max(1, Math.round(baseDamage * damageMultiplier));
  }

  /**
   * Controlla se l'attacco attivo del giocatore colpisce qualche bersaglio.
   * Ogni bersaglio viene colpito una sola volta per attacco.
   */
  public processPlayerAttack(player: Player, targets: Damageable[]): HitResult[] {
    const attack = player.activeAttack;
    const hitbox = player.getActiveAttackHitbox();
    if (attack === null || hitbox === null) {
      return [];
    }
    const hits: HitResult[] = [];
    for (const target of targets) {
      if (!target.isAlive || player.hasAlreadyHit(target)) {
        continue;
      }
      if (CollisionSystem.intersects(hitbox, target.getBounds())) {
        // danno = (danno dell'attacco + bonus del fuoco) x moltiplicatore della furia
        const damage = CombatSystem.calculateDamage(attack.damage + player.getBonusDamage(), player.getDamageMultiplierFor(attack));
        player.registerHit(target);
        target.receiveHit(damage, player.facingDirection, player.getHitProperties(attack));
        hits.push({ target, damage });
      }
    }
    return hits;
  }

  /**
   * Controlla se gli attacchi dei nemici raggiungono il giocatore.
   * Ogni attacco può colpire una sola volta, anche se il giocatore è invulnerabile
   * (in quel caso il colpo viene semplicemente schivato). Restituisce i colpi andati a segno.
   */
  public processEnemyAttacks(enemies: Enemy[], player: Player): number {
    let landedHits = 0;
    for (const enemy of enemies) {
      const hitbox = enemy.getAttackHitbox();
      if (hitbox === null || !CollisionSystem.intersects(hitbox, player.getBounds())) {
        continue;
      }
      enemy.markPlayerHit();
      if (player.takeDamage(enemy.attackDamage, enemy.centerX, enemy.attackElement)) {
        landedHits++;
      } else if (player.lastGuardOutcome === "perfect" && player.ability.kind === "guard") {
        // parata perfetta: l'attaccante resta stordito (i boss no: non vengono mai storditi)
        enemy.stun(player.ability.parryStunMs);
      }
    }
    return landedHits;
  }

  /** Controlla se l'attacco del boss (fendente o carica) raggiunge il giocatore. */
  public processBossAttack(boss: Boss, player: Player): boolean {
    const hitbox = boss.getAttackHitbox();
    if (hitbox === null || !CollisionSystem.intersects(hitbox, player.getBounds())) {
      return false;
    }
    boss.markPlayerHit();
    return player.takeDamage(boss.currentAttackDamage, boss.centerX);
  }
}
