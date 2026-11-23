import { WEAPON_ICON_SIZE } from "../config/weaponConfig";
import type { WeaponId } from "../types/EntityTypes";
import { GameObject } from "./GameObject";

/**
 * Arma posata a terra (da un forziere, da un nemico d'élite, trofeo di un boss o lasciata dal
 * giocatore cambiando arma). Non cade: si posa con il fondo sul terreno.
 * Un'arma appena lasciata dal giocatore non è "pronta" finché lui non se ne allontana:
 * altrimenti la riprenderebbe subito.
 */
export class WeaponPickup extends GameObject {
  /** Fase dell'oscillazione verticale (solo effetto grafico). */
  public readonly bobPhase: number;

  constructor(
    public readonly weaponId: WeaponId,
    centerX: number,
    bottomY: number,
    public isArmed = true,
    /** Munizioni (armi da lancio lasciate a terra); null = piene. */
    public readonly ammo: number | null = null
  ) {
    super(Math.round(centerX - WEAPON_ICON_SIZE / 2), Math.round(bottomY - WEAPON_ICON_SIZE), WEAPON_ICON_SIZE, WEAPON_ICON_SIZE);
    this.bobPhase = centerX * 0.05;
  }
}
