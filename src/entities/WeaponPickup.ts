import { WEAPON_ICON_SIZE } from "../config/weaponConfig";
import type { WeaponId } from "../types/EntityTypes";
import type { ItemInstance } from "../types/ItemTypes";
import { GameObject } from "./GameObject";

/**
 * Oggetto d'equipaggiamento posato a terra: un'arma (da un forziere, da un nemico d'élite, trofeo di un boss o
 * lasciata dal giocatore) o, dal piano dell'equipaggiamento, un pezzo d'armatura. Ha la sua rarità (bagliore colorato).
 * Non cade: si posa con il fondo sul terreno.
 * Un oggetto appena lasciato dal giocatore non è "pronto" finché lui non se ne allontana:
 * altrimenti lo riprenderebbe subito.
 */
export class WeaponPickup extends GameObject {
  /** Fase dell'oscillazione verticale (solo effetto grafico). */
  public readonly bobPhase: number;

  constructor(
    public readonly item: ItemInstance,
    centerX: number,
    bottomY: number,
    public isArmed = true,
    /** Munizioni (armi da lancio lasciate a terra); null = piene. */
    public readonly ammo: number | null = null
  ) {
    super(Math.round(centerX - WEAPON_ICON_SIZE / 2), Math.round(bottomY - WEAPON_ICON_SIZE), WEAPON_ICON_SIZE, WEAPON_ICON_SIZE);
    this.bobPhase = centerX * 0.05;
  }

  /** Tipo dell'arma (null per le armature). */
  public get weaponId(): WeaponId | null {
    return this.item.kind === "weapon" ? this.item.baseId : null;
  }
}
