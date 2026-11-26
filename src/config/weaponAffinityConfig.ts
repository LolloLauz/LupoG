import type { CharacterId, WeaponAffinity, WeaponId } from "../types/EntityTypes";

/** ✓ Nessun bonus, nessun malus. È anche il valore dell'arma iniziale (★ iniziale): la classe è bilanciata su quella. */
export const NEUTRAL_WEAPON_AFFINITY: Readonly<WeaponAffinity> = { isAllowed: true, damageMultiplier: 1, recoveryMultiplier: 1, ammoMultiplier: 1 };

/** ★ Arma preferita (non iniziale): più danno e, per le armi con munizioni, più colpi. */
export const PREFERRED_WEAPON_AFFINITY: Readonly<WeaponAffinity> = { isAllowed: true, damageMultiplier: 1.15, recoveryMultiplier: 1, ammoMultiplier: 1.5 };

/** ▼ Arma poco adatta: meno danno e recupero più lento. */
export const PENALIZED_WEAPON_AFFINITY: Readonly<WeaponAffinity> = { isAllowed: true, damageMultiplier: 0.85, recoveryMultiplier: 1.15, ammoMultiplier: 1 };

/** ✗ Arma vietata: la classe non la impugna e nel bottino diventa lootSubstituteId. */
function forbidden(lootSubstituteId: WeaponId): Readonly<WeaponAffinity> {
  return { isAllowed: false, damageMultiplier: 1, recoveryMultiplier: 1, ammoMultiplier: 1, lootSubstituteId };
}

const STARTING = NEUTRAL_WEAPON_AFFINITY;
/** Arco del Ranger (Classi Fase 6B): è l'unica sua arma di partenza, quindi porta il doppio delle frecce. */
const RANGER_BOW: Readonly<WeaponAffinity> = { ...NEUTRAL_WEAPON_AFFINITY, ammoMultiplier: 2 };
const OK = NEUTRAL_WEAPON_AFFINITY;
const PREFERRED = PREFERRED_WEAPON_AFFINITY;
const PENALIZED = PENALIZED_WEAPON_AFFINITY;

/**
 * Compatibilità classe x arma (Classi Fase 3): l'unica fonte di verità su armi preferite (★), con malus (▼) e vietate
 * (✗). Una cella per arma, non per categoria: armi della stessa categoria possono comportarsi in modo diverso (il
 * Paladino è bravo con la mazza ma non con lo spadone). La categoria resta in WEAPON_CONFIG per lo scaling (Fase 4).
 * Le armi vietate non compaiono mai a terra: il filtro del bottino (resolveLootWeaponId) dà lootSubstituteId.
 * I valori sono uguali per simbolo; unica eccezione (Classi Fase 6B) la capienza dell'arco del Ranger.
 */
export const WEAPON_AFFINITY_CONFIG: Record<CharacterId, Record<WeaponId, Readonly<WeaponAffinity>>> = {
  knight: {
    sword: STARTING,
    dagger: OK,
    spear: PREFERRED,
    axe: OK,
    mace: OK,
    greatsword: PREFERRED,
    bow: PENALIZED,
    crossbow: PENALIZED,
    throwingKnives: PENALIZED,
    javelin: OK,
    staff: forbidden("sword"),
  },
  ranger: {
    sword: OK,
    dagger: OK,
    spear: PENALIZED,
    axe: PENALIZED,
    mace: PENALIZED,
    greatsword: forbidden("crossbow"),
    bow: RANGER_BOW,
    crossbow: PREFERRED,
    throwingKnives: PREFERRED,
    javelin: PREFERRED,
    staff: forbidden("bow"),
  },
  berserker: {
    sword: OK,
    dagger: PENALIZED,
    spear: OK,
    axe: STARTING,
    mace: OK,
    greatsword: PREFERRED,
    bow: PENALIZED,
    crossbow: PENALIZED,
    throwingKnives: PENALIZED,
    javelin: OK,
    staff: forbidden("axe"),
  },
  paladin: {
    sword: PREFERRED,
    dagger: PENALIZED,
    spear: OK,
    axe: PREFERRED,
    mace: STARTING,
    greatsword: PENALIZED,
    bow: PENALIZED,
    crossbow: PENALIZED,
    throwingKnives: PENALIZED,
    javelin: PENALIZED,
    staff: forbidden("mace"),
  },
  // il Mago: bastone, spada e pugnale; il catalizzatore (spellFocus) resta solo del bastone
  mage: {
    sword: OK,
    dagger: OK,
    spear: forbidden("staff"),
    axe: forbidden("staff"),
    mace: forbidden("staff"),
    greatsword: forbidden("sword"),
    bow: forbidden("staff"),
    crossbow: forbidden("staff"),
    throwingKnives: forbidden("staff"),
    javelin: forbidden("staff"),
    staff: STARTING,
  },
};

/** Compatibilità di una classe con un'arma. */
export function getWeaponAffinity(characterId: CharacterId, weaponId: WeaponId): Readonly<WeaponAffinity> {
  return WEAPON_AFFINITY_CONFIG[characterId][weaponId];
}
