import type { WeaponId } from "../types/EntityTypes";
import { GameObject } from "./GameObject";

/** Lato (px) di una munizione a terra. */
export const AMMO_DROP_SIZE = 6;

/**
 * Munizione caduta a terra (Fase 2: il coltello lanciato). Cade con la gravità fino al terreno e si
 * recupera passandoci sopra, se l'arma è nella borsa e non è piena.
 */
export class AmmoDrop extends GameObject {
  constructor(
    public readonly weaponId: WeaponId,
    public readonly spriteId: string,
    centerX: number,
    centerY: number
  ) {
    super(Math.round(centerX - AMMO_DROP_SIZE / 2), Math.round(centerY - AMMO_DROP_SIZE / 2), AMMO_DROP_SIZE, AMMO_DROP_SIZE);
  }
}
