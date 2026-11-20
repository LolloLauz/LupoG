import type { AttackDefinition } from "../types/EntityTypes";
import type { FacingDirection, Rectangle } from "../types/GameTypes";

export type { AttackDefinition };

/**
 * Converte l'area d'urto di un attacco (definita per un personaggio che guarda
 * a destra, relativa all'angolo in alto a sinistra) in coordinate del mondo.
 * Se il personaggio guarda a sinistra l'area viene specchiata.
 */
export function getAttackWorldHitbox(
  attack: AttackDefinition,
  ownerBounds: Rectangle,
  facingDirection: FacingDirection
): Rectangle {
  const localHitbox = attack.hitbox;
  const worldX =
    facingDirection === "right"
      ? ownerBounds.x + localHitbox.x
      : ownerBounds.x + ownerBounds.width - localHitbox.x - localHitbox.width;
  return {
    x: worldX,
    y: ownerBounds.y + localHitbox.y,
    width: localHitbox.width,
    height: localHitbox.height,
  };
}
