import { ARMOR_CONFIG, ARMOR_MATERIALS, ARMOR_SLOTS } from "../../config/armorConfig";
import { RARITY_CONFIG } from "../../config/rarityConfig";
import type { ArmorItem, ArmorSlot, EquippedArmor, ItemInstance, RarityId, WeaponItem } from "../../types/ItemTypes";
import type { SpriteColorVariant } from "../SpriteManager";
import { BOOT_TONE_KEYS, CHEST_TONE_KEYS, HELMET_TONE_KEYS } from "./knightSprites";

/**
 * Aspetto dell'equipaggiamento (E2-E3): solo ricolorazioni, nessuno sprite nuovo.
 * - Armi: il metallo (chiavi b e v) prende i colori della rarità (RARITY_CONFIG.weaponColors).
 * - Armature: ogni pezzo ricolora la sua parte del personaggio con i toni del materiale; dalla rarità Non comune
 *   in su il tono più chiaro diventa il colore della rarità (un riflesso che si nota anche da lontano).
 * Le icone 16x16 usano le stesse regole (le armature con le chiavi 1-4 del materiale).
 */

/** Chiavi dei toni di ogni parte del personaggio, dal più scuro al più chiaro. */
const REGION_KEYS: Record<ArmorSlot, readonly string[]> = {
  helmet: HELMET_TONE_KEYS,
  chest: CHEST_TONE_KEYS,
  boots: BOOT_TONE_KEYS,
};

/** Chiavi delle icone delle armature (dal più scuro al più chiaro). */
export const ARMOR_ICON_TONE_KEYS = ["1", "2", "3", "4"] as const;

/** Colori del metallo di un'arma della rarità indicata (vuoto per Comune: i colori di sempre). */
export function getWeaponRarityColors(rarity: RarityId): Record<string, string> {
  if (rarity === "common") {
    return {};
  }
  const { metal, shine } = RARITY_CONFIG[rarity].weaponColors;
  return { b: metal, v: shine };
}

/** Toni di un pezzo d'armatura: quelli del materiale, con il più chiaro della rarità (da Non comune in su). */
export function getArmorTones(item: ArmorItem): string[] {
  const tones = [...ARMOR_MATERIALS[ARMOR_CONFIG[item.baseId].material].tones];
  if (item.rarity !== "common") {
    tones[tones.length - 1] = RARITY_CONFIG[item.rarity].color;
  }
  return tones;
}

/** Colori di un pezzo indossato, sulle chiavi della sua parte del personaggio. */
export function getArmorPieceColors(item: ArmorItem): Record<string, string> {
  const keys = REGION_KEYS[ARMOR_CONFIG[item.baseId].slot];
  const tones = getArmorTones(item);
  const colors: Record<string, string> = {};
  keys.forEach((key, index) => {
    // gli stivali hanno tre toni: il terzo è il più chiaro del materiale (o il riflesso della rarità)
    colors[key] = index === keys.length - 1 ? tones[tones.length - 1]! : tones[index]!;
  });
  return colors;
}

/**
 * Variante di colore del personaggio con l'arma e le armature indicate (null se non cambia niente).
 * includeWeapon = false: solo le armature (con il power-up del fuoco la lama resta incandescente).
 */
export function buildEquipmentVariant(weapon: WeaponItem | null, armor: Readonly<EquippedArmor>, includeWeapon: boolean): SpriteColorVariant | null {
  const colors: Record<string, string> = {};
  const idParts: string[] = [];
  if (includeWeapon && weapon !== null && weapon.rarity !== "common") {
    Object.assign(colors, getWeaponRarityColors(weapon.rarity));
    idParts.push(`w-${weapon.rarity}`);
  }
  for (const slot of ARMOR_SLOTS) {
    const item = armor[slot];
    if (item !== null) {
      Object.assign(colors, getArmorPieceColors(item));
      idParts.push(`${item.baseId}-${item.rarity}`);
    }
  }
  return idParts.length === 0 ? null : { id: idParts.join("|"), colors };
}

/** Variante di colore dell'icona di un oggetto (null per un'arma Comune). */
export function getItemIconVariant(item: ItemInstance): SpriteColorVariant | null {
  if (item.kind === "weapon") {
    return item.rarity === "common" ? null : { id: `w-${item.rarity}`, colors: getWeaponRarityColors(item.rarity) };
  }
  const tones = getArmorTones(item);
  const colors: Record<string, string> = {};
  ARMOR_ICON_TONE_KEYS.forEach((key, index) => {
    colors[key] = tones[index]!;
  });
  return { id: `${ARMOR_CONFIG[item.baseId].material}-${item.rarity}`, colors };
}
