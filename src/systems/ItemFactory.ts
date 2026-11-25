import { AFFIX_CONFIG, AFFIX_ORDER, ELEMENT_NAME_SUFFIXES } from "../config/affixConfig";
import { ARMOR_CONFIG } from "../config/armorConfig";
import { ELEMENT_ORDER } from "../config/elementConfig";
import { RARITY_CONFIG, RARITY_ORDER } from "../config/rarityConfig";
import { LEGENDARY_ITEMS, MYTHIC_ITEMS, type UniqueItemDefinition } from "../config/uniqueItemConfig";
import { WEAPON_CONFIG, isWeaponId } from "../config/weaponConfig";
import type { ElementId, WeaponId } from "../types/EntityTypes";
import type { AffixId, AffixRoll, ArmorId, ArmorItem, ItemInstance, RarityId, RolledRarityId, WeaponItem } from "../types/ItemTypes";

/** Generatore di numeri tra 0 (compreso) e 1 (escluso), come Math.random. */
export type RandomSource = () => number;

/** Prezzo base nella bottega, prima del moltiplicatore della rarità. */
export const ITEM_BASE_PRICES = { weapon: 60, armor: 45 } as const;

/**
 * Generatore ripetibile (mulberry32): con lo stesso seme dà sempre la stessa sequenza.
 * Serve ai test e alle offerte della bottega.
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un elemento a caso da un elenco non vuoto. */
export function pickRandom<T>(choices: readonly T[], random: RandomSource): T {
  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length));
  return choices[Math.max(0, index)]!;
}

/** Intero a caso tra min e max compresi. */
function randomInteger(min: number, max: number, random: RandomSource): number {
  return min + Math.min(max - min, Math.floor(random() * (max - min + 1)));
}

/** Estrae una rarità secondo i pesi indicati (le rarità senza peso, o con peso 0, non escono). */
export function rollRarity(weights: Partial<Record<RarityId, number>>, random: RandomSource): RarityId {
  const total = RARITY_ORDER.reduce((sum, rarity) => sum + Math.max(0, weights[rarity] ?? 0), 0);
  if (total <= 0) {
    return "common";
  }
  let remaining = random() * total;
  for (const rarity of RARITY_ORDER) {
    const weight = Math.max(0, weights[rarity] ?? 0);
    if (weight > 0 && remaining < weight) {
      return rarity;
    }
    remaining -= weight;
  }
  return [...RARITY_ORDER].reverse().find((rarity) => (weights[rarity] ?? 0) > 0) ?? "common";
}

export function createWeaponItem(baseId: WeaponId, rarity: RarityId = "common", affixes: AffixRoll[] = []): WeaponItem {
  return { kind: "weapon", baseId, rarity, affixes: affixes.map((affix) => ({ ...affix })) };
}

export function createArmorItem(baseId: ArmorId, rarity: RarityId = "common", affixes: AffixRoll[] = []): ArmorItem {
  return { kind: "armor", baseId, rarity, affixes: affixes.map((affix) => ({ ...affix })) };
}

/** Un id d'arma diventa un'arma Comune (compatibilità: armi salvate come id, forzieri, test). */
export function toWeaponItem(weapon: WeaponId | WeaponItem): WeaponItem {
  return typeof weapon === "string" ? createWeaponItem(weapon) : weapon;
}

/** Copia indipendente di un oggetto (anche dei modificatori). */
export function cloneItem<T extends ItemInstance>(item: T): T {
  return { ...item, affixes: item.affixes.map((affix) => ({ ...affix })) };
}

export function getUniqueItemDefinition(uniqueId: string): UniqueItemDefinition | undefined {
  return LEGENDARY_ITEMS[uniqueId] ?? MYTHIC_ITEMS[uniqueId];
}

/** Oggetti fissi di una rarità (Leggendario o Mitico), eventualmente di un tipo di base. */
export function findUniqueItems(rarity: "legendary" | "mythic", baseId?: WeaponId | ArmorId): UniqueItemDefinition[] {
  const catalog = rarity === "legendary" ? LEGENDARY_ITEMS : MYTHIC_ITEMS;
  return Object.values(catalog).filter((definition) => baseId === undefined || definition.baseId === baseId);
}

/** Crea l'oggetto fisso indicato (null se l'id non esiste). */
export function createUniqueItem(uniqueId: string): ItemInstance | null {
  const definition = getUniqueItemDefinition(uniqueId);
  if (definition === undefined) {
    return null;
  }
  const rarity: RarityId = MYTHIC_ITEMS[uniqueId] !== undefined ? "mythic" : "legendary";
  const item: ItemInstance =
    definition.kind === "weapon" ? createWeaponItem(definition.baseId, rarity, definition.affixes) : createArmorItem(definition.baseId, rarity, definition.affixes);
  return { ...item, uniqueId };
}

/** Vero se tutti gli attacchi dell'arma rompono già la guardia (allora il modificatore non serve). */
function alwaysBreaksGuard(baseId: WeaponId): boolean {
  return Object.values(WEAPON_CONFIG[baseId].attacks).every((attack) => attack.breaksGuard === true);
}

/**
 * Modificatori casuali di un oggetto: tanti quanti dice la rarità, senza ripetizioni. Un oggetto Epico ne ha
 * sempre uno "di stile" (elemento, rompe la guardia, resistenza); Non comune e Raro solo statistiche.
 */
export function rollAffixes(kind: "weapon" | "armor", baseId: WeaponId | ArmorId, rarity: RolledRarityId, random: RandomSource): AffixRoll[] {
  const pool = AFFIX_ORDER.filter((affixId) => {
    if (!AFFIX_CONFIG[affixId].appliesTo.includes(kind)) {
      return false;
    }
    return !(affixId === "breaksGuard" && isWeaponId(baseId) && alwaysBreaksGuard(baseId));
  });
  const styleAffixes = pool.filter((affixId) => AFFIX_CONFIG[affixId].isStyle);
  const statAffixes = pool.filter((affixId) => !AFFIX_CONFIG[affixId].isStyle);
  const chosen: AffixId[] = [];
  const count = RARITY_CONFIG[rarity].affixCount;
  if (rarity === "epic" && styleAffixes.length > 0) {
    chosen.push(pickRandom(styleAffixes, random));
  }
  while (chosen.length < count) {
    const remaining = statAffixes.filter((affixId) => !chosen.includes(affixId));
    if (remaining.length === 0) {
      break;
    }
    chosen.push(pickRandom(remaining, random));
  }
  return chosen.map((affixId): AffixRoll => {
    const [min, max] = AFFIX_CONFIG[affixId].ranges[rarity];
    const roll: AffixRoll = { id: affixId, value: randomInteger(min, max, random) };
    if (affixId === "element" || affixId === "resistance") {
      roll.element = pickRandom<ElementId>(ELEMENT_ORDER, random);
    }
    return roll;
  });
}

/**
 * Un'arma della rarità indicata. Leggendari e Mitici sono gli oggetti fissi di quell'arma; se l'arma non ne ha,
 * si scende di una rarità (Mitico -> Leggendario -> Epico).
 */
export function rollWeaponItem(baseId: WeaponId, rarity: RarityId, random: RandomSource): WeaponItem {
  const fixed = rollFixedItem(baseId, rarity, random);
  if (fixed !== null && fixed.kind === "weapon") {
    return fixed;
  }
  const rolledRarity = toRolledRarity(rarity);
  return createWeaponItem(baseId, rolledRarity ?? "common", rolledRarity === null ? [] : rollAffixes("weapon", baseId, rolledRarity, random));
}

/** Come rollWeaponItem, per un pezzo d'armatura. */
export function rollArmorItem(baseId: ArmorId, rarity: RarityId, random: RandomSource): ArmorItem {
  const fixed = rollFixedItem(baseId, rarity, random);
  if (fixed !== null && fixed.kind === "armor") {
    return fixed;
  }
  const rolledRarity = toRolledRarity(rarity);
  return createArmorItem(baseId, rolledRarity ?? "common", rolledRarity === null ? [] : rollAffixes("armor", baseId, rolledRarity, random));
}

/** Oggetto fisso di quel tipo di base, se la rarità è Leggendario o Mitico e ne esiste uno (altrimenti null). */
function rollFixedItem(baseId: WeaponId | ArmorId, rarity: RarityId, random: RandomSource): ItemInstance | null {
  if (rarity === "mythic") {
    const mythics = findUniqueItems("mythic", baseId);
    if (mythics.length > 0) {
      return createUniqueItem(pickRandom(mythics, random).id);
    }
  }
  if (rarity === "mythic" || rarity === "legendary") {
    const legendaries = findUniqueItems("legendary", baseId);
    if (legendaries.length > 0) {
      return createUniqueItem(pickRandom(legendaries, random).id);
    }
  }
  return null;
}

/** Comune resta null (nessun modificatore); Leggendario e Mitico senza oggetto fisso diventano Epico. */
function toRolledRarity(rarity: RarityId): RolledRarityId | null {
  if (rarity === "common") {
    return null;
  }
  return rarity === "legendary" || rarity === "mythic" ? "epic" : rarity;
}

/** Nome del tipo di base ("SPADA", "ELMO DI FERRO"). */
export function getItemBaseName(item: ItemInstance): string {
  return item.kind === "weapon" ? WEAPON_CONFIG[item.baseId].name.toUpperCase() : ARMOR_CONFIG[item.baseId].name;
}

/**
 * Nome dell'oggetto: quello degli oggetti fissi, altrimenti il tipo di base seguito dal nome del primo modificatore
 * ("SPADA DELLA FURIA", "ELMO DI FERRO DELLA SALAMANDRA"). Gli oggetti Comuni hanno solo il nome del tipo.
 */
export function getItemName(item: ItemInstance): string {
  if (item.uniqueId !== undefined) {
    const definition = getUniqueItemDefinition(item.uniqueId);
    if (definition !== undefined) {
      return definition.name;
    }
  }
  const baseName = getItemBaseName(item);
  const first = item.affixes[0];
  if (first === undefined) {
    return baseName;
  }
  let suffix = AFFIX_CONFIG[first.id].nameSuffix;
  if (first.element !== undefined && (first.id === "element" || first.id === "resistance")) {
    suffix = first.id === "element" ? ELEMENT_NAME_SUFFIXES[first.element].weapon : ELEMENT_NAME_SUFFIXES[first.element].resistance;
  }
  return suffix === "" ? baseName : `${baseName} ${suffix}`;
}

/** Icona 16x16 dell'oggetto (da disegnare con i colori di getItemIconVariant, vedi equipmentVisuals.ts). */
export function getItemIconSpriteId(item: ItemInstance): string {
  return item.kind === "weapon" ? WEAPON_CONFIG[item.baseId].iconSpriteId : ARMOR_CONFIG[item.baseId].iconSpriteId;
}

/** Vero se due oggetti sono identici (stesso tipo, rarità, modificatori). */
export function areItemsEqual(first: ItemInstance, second: ItemInstance): boolean {
  return (
    first.kind === second.kind &&
    first.baseId === second.baseId &&
    first.rarity === second.rarity &&
    first.uniqueId === second.uniqueId &&
    first.affixes.length === second.affixes.length &&
    first.affixes.every((affix, index) => {
      const other = second.affixes[index]!;
      return affix.id === other.id && affix.value === other.value && affix.element === other.element;
    })
  );
}

/** Prezzo nella bottega: prezzo base del tipo per il moltiplicatore della rarità, arrotondato a 5 monete. */
export function getItemPrice(item: ItemInstance): number {
  return Math.round((ITEM_BASE_PRICES[item.kind] * RARITY_CONFIG[item.rarity].priceMultiplier) / 5) * 5;
}
