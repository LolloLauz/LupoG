import type { CharacterId, WeaponAffinity, WeaponCategoryId, WeaponId } from "../types/EntityTypes";
import { WEAPON_CONFIG } from "./weaponConfig";

/** Nessun bonus, nessun malus, nessun divieto. */
export const NEUTRAL_WEAPON_AFFINITY: Readonly<WeaponAffinity> = { isAllowed: true, damageMultiplier: 1, recoveryMultiplier: 1 };

/** Arma vietata alla classe (Classi Fase 2: il bastone per le classi senza magia, le altre armi per il Mago). */
export const FORBIDDEN_WEAPON_AFFINITY: Readonly<WeaponAffinity> = { isAllowed: false, damageMultiplier: 1, recoveryMultiplier: 1 };

/**
 * Compatibilità classe x categoria d'arma (Classi Fase 0): l'unica fonte di verità su armi preferite, armi con
 * malus e armi vietate. Le categorie delle armi sono in WEAPON_CONFIG (category).
 * Fase 0: tutte le celle neutre (×1, nessun divieto), il gioco non cambia. I valori veri arrivano con la Fase 3.
 * Fase 2: il bastone è solo del Mago, e il Mago usa solo il bastone. Per ora i divieti li legge solo il filtro del
 * bottino (resolveLootWeaponId): Player.equipWeapon li applicherà dalla Fase 3.
 */
export const WEAPON_AFFINITY_CONFIG: Record<CharacterId, Record<WeaponCategoryId, Readonly<WeaponAffinity>>> = {
  knight: {
    blade: NEUTRAL_WEAPON_AFFINITY,
    heavy: NEUTRAL_WEAPON_AFFINITY,
    polearm: NEUTRAL_WEAPON_AFFINITY,
    ranged: NEUTRAL_WEAPON_AFFINITY,
    thrown: NEUTRAL_WEAPON_AFFINITY,
    staff: FORBIDDEN_WEAPON_AFFINITY,
  },
  ranger: {
    blade: NEUTRAL_WEAPON_AFFINITY,
    heavy: NEUTRAL_WEAPON_AFFINITY,
    polearm: NEUTRAL_WEAPON_AFFINITY,
    ranged: NEUTRAL_WEAPON_AFFINITY,
    thrown: NEUTRAL_WEAPON_AFFINITY,
    staff: FORBIDDEN_WEAPON_AFFINITY,
  },
  berserker: {
    blade: NEUTRAL_WEAPON_AFFINITY,
    heavy: NEUTRAL_WEAPON_AFFINITY,
    polearm: NEUTRAL_WEAPON_AFFINITY,
    ranged: NEUTRAL_WEAPON_AFFINITY,
    thrown: NEUTRAL_WEAPON_AFFINITY,
    staff: FORBIDDEN_WEAPON_AFFINITY,
  },
  paladin: {
    blade: NEUTRAL_WEAPON_AFFINITY,
    heavy: NEUTRAL_WEAPON_AFFINITY,
    polearm: NEUTRAL_WEAPON_AFFINITY,
    ranged: NEUTRAL_WEAPON_AFFINITY,
    thrown: NEUTRAL_WEAPON_AFFINITY,
    staff: FORBIDDEN_WEAPON_AFFINITY,
  },
  mage: {
    blade: FORBIDDEN_WEAPON_AFFINITY,
    heavy: FORBIDDEN_WEAPON_AFFINITY,
    polearm: FORBIDDEN_WEAPON_AFFINITY,
    ranged: FORBIDDEN_WEAPON_AFFINITY,
    thrown: FORBIDDEN_WEAPON_AFFINITY,
    staff: NEUTRAL_WEAPON_AFFINITY,
  },
};

/** Compatibilità di una classe con un'arma (attraverso la categoria dell'arma). */
export function getWeaponAffinity(characterId: CharacterId, weaponId: WeaponId): Readonly<WeaponAffinity> {
  return WEAPON_AFFINITY_CONFIG[characterId][WEAPON_CONFIG[weaponId].category];
}
