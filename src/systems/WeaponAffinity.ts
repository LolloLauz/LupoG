import { getWeaponAffinity } from "../config/weaponAffinityConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import type { CharacterId, WeaponAffinity, WeaponId } from "../types/EntityTypes";

/**
 * Massimo delle munizioni di un'arma per una classe (Classi Fase 3): quello dell'arma per l'ammoMultiplier della
 * tabella di compatibilità, per difetto. undefined = munizioni infinite. Senza classe: il massimo dell'arma.
 */
export function getWeaponMaxAmmo(characterId: CharacterId | null, weaponId: WeaponId): number | undefined {
  const max = WEAPON_CONFIG[weaponId].ammo?.max;
  if (max === undefined || characterId === null) {
    return max;
  }
  return Math.max(1, Math.floor(max * getWeaponAffinity(characterId, weaponId).ammoMultiplier));
}

/** Vero se la classe può impugnare l'arma (senza classe: sempre). */
export function canWieldWeapon(characterId: CharacterId | null, weaponId: WeaponId): boolean {
  return characterId === null || getWeaponAffinity(characterId, weaponId).isAllowed;
}

/**
 * Bonus e malus della classe per un'arma (equipaggiamento e bottega): tono, testo su una riga e le singole voci
 * ("DANNO +15%"), che la scheda dell'equipaggiamento mostra una per riga. Per un'arma vietata: nessuna voce.
 */
export interface WeaponAffinityLine {
  tone: "bonus" | "malus" | "forbidden";
  text: string;
  parts: string[];
}

/** Messaggio quando la classe prova a impugnare un'arma vietata. */
export const FORBIDDEN_WEAPON_MESSAGE = "NON PUOI USARLA";

/**
 * Descrive bonus e malus di una cella della tabella, ad esempio "CLASSE: DANNO +15% MUNIZIONI +50%".
 * Le munizioni compaiono solo per le armi che ne hanno.
 */
export function describeWeaponAffinity(affinity: Readonly<WeaponAffinity>, weaponId: WeaponId): WeaponAffinityLine | null {
  if (!affinity.isAllowed) {
    return { tone: "forbidden", text: FORBIDDEN_WEAPON_MESSAGE, parts: [] };
  }
  const percent = (multiplier: number): string => {
    const value = Math.round((multiplier - 1) * 100);
    return `${value >= 0 ? "+" : ""}${value}%`;
  };
  const parts: string[] = [];
  if (affinity.damageMultiplier !== 1) {
    parts.push(`DANNO ${percent(affinity.damageMultiplier)}`);
  }
  if (affinity.recoveryMultiplier !== 1) {
    parts.push(`RECUPERO ${percent(affinity.recoveryMultiplier)}`);
  }
  if (affinity.ammoMultiplier !== 1 && WEAPON_CONFIG[weaponId].ammo !== undefined) {
    parts.push(`MUNIZIONI ${percent(affinity.ammoMultiplier)}`);
  }
  if (parts.length === 0) {
    return null;
  }
  const isBonus = affinity.damageMultiplier >= 1 && affinity.recoveryMultiplier <= 1 && affinity.ammoMultiplier >= 1;
  return { tone: isBonus ? "bonus" : "malus", text: `CLASSE: ${parts.join(" ")}`, parts };
}
