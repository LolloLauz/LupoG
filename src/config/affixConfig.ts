import type { ElementId } from "../types/EntityTypes";
import type { AffixId, RolledRarityId } from "../types/ItemTypes";

/**
 * Modificatori (affissi) degli oggetti (fase E1). Solo dati: l'estrazione è in ItemFactory, l'effetto in EquipmentStats.
 * Ogni modificatore ha un intervallo per rarità e un **tetto** sul totale di tutto l'equipaggiamento, così a fine
 * partita i valori non esplodono. I modificatori "di stile" (elemento, rompe la guardia, resistenza) cambiano il modo
 * di giocare: un oggetto Epico ne ha sempre uno.
 */
export interface AffixDefinition {
  id: AffixId;
  /** Nome nella scheda dell'oggetto. */
  label: string;
  /** Parte del nome dell'oggetto quando è il suo primo modificatore (es. "SPADA DELLA FURIA"). */
  nameSuffix: string;
  /** Su quali oggetti può uscire. */
  appliesTo: ReadonlyArray<"weapon" | "armor">;
  /** Intervallo (estremi compresi) per ogni rarità estratta a caso; [0, 0] per i modificatori senza valore. */
  ranges: Record<RolledRarityId, readonly [number, number]>;
  /** Tetto del totale (stessa unità del valore). */
  cap: number;
  /** Come si mostra il valore: percentuale, punti, solo il nome. */
  format: "percent" | "flat" | "flag";
  /** Vero per i modificatori che cambiano lo stile di gioco (uno sempre negli Epici). */
  isStyle: boolean;
  /** Vero se il valore è un malus da mostrare con il segno meno (recupero: meno tempo). */
  isReduction?: boolean;
}

const NO_VALUE = { uncommon: [0, 0], rare: [0, 0], epic: [0, 0] } as const;

export const AFFIX_CONFIG: Record<AffixId, AffixDefinition> = {
  damage: { id: "damage", label: "DANNO", nameSuffix: "DELLA FURIA", appliesTo: ["weapon"], ranges: { uncommon: [4, 8], rare: [7, 12], epic: [10, 16] }, cap: 50, format: "percent", isStyle: false },
  recovery: { id: "recovery", label: "RECUPERO", nameSuffix: "DEL FALCO", appliesTo: ["weapon"], ranges: { uncommon: [5, 10], rare: [8, 15], epic: [12, 20] }, cap: 30, format: "percent", isStyle: false, isReduction: true },
  moveSpeed: { id: "moveSpeed", label: "VELOCITÀ", nameSuffix: "DEL VENTO", appliesTo: ["weapon", "armor"], ranges: { uncommon: [3, 5], rare: [4, 7], epic: [6, 10] }, cap: 20, format: "percent", isStyle: false },
  lifeSteal: { id: "lifeSteal", label: "FURTO DI VITA", nameSuffix: "DEL VAMPIRO", appliesTo: ["weapon"], ranges: { uncommon: [1, 2], rare: [2, 3], epic: [3, 5] }, cap: 8, format: "percent", isStyle: false },
  maxHealth: { id: "maxHealth", label: "SALUTE", nameSuffix: "DELL'ORSO", appliesTo: ["armor"], ranges: { uncommon: [4, 8], rare: [6, 12], epic: [10, 16] }, cap: 40, format: "flat", isStyle: false },
  maxStamina: { id: "maxStamina", label: "STAMINA", nameSuffix: "DEL CERVO", appliesTo: ["armor"], ranges: { uncommon: [5, 10], rare: [8, 15], epic: [12, 20] }, cap: 50, format: "flat", isStyle: false },
  defense: { id: "defense", label: "DIFESA", nameSuffix: "DELLA ROCCIA", appliesTo: ["armor"], ranges: { uncommon: [1, 3], rare: [2, 4], epic: [3, 6] }, cap: 25, format: "percent", isStyle: false },
  resistance: { id: "resistance", label: "RESISTENZA", nameSuffix: "", appliesTo: ["armor"], ranges: { uncommon: [10, 20], rare: [15, 30], epic: [25, 40] }, cap: 60, format: "percent", isStyle: true },
  element: { id: "element", label: "ELEMENTO", nameSuffix: "", appliesTo: ["weapon"], ranges: NO_VALUE, cap: 0, format: "flag", isStyle: true },
  breaksGuard: { id: "breaksGuard", label: "ROMPE LA GUARDIA", nameSuffix: "DELL'ARIETE", appliesTo: ["weapon"], ranges: NO_VALUE, cap: 0, format: "flag", isStyle: true },
};

/** Parte del nome per i modificatori con un elemento: arma con l'elemento, armatura che gli resiste. */
export const ELEMENT_NAME_SUFFIXES: Record<ElementId, { weapon: string; resistance: string }> = {
  fire: { weapon: "DEL FUOCO", resistance: "DELLA SALAMANDRA" },
  poison: { weapon: "DEL VELENO", resistance: "DEL SERPENTE" },
  frost: { weapon: "DEL GELO", resistance: "DELL'ORSO BIANCO" },
  shock: { weapon: "DEL FULMINE", resistance: "DELLA TEMPESTA" },
};

/** Nome breve dell'elemento nella scheda ("FUOCO", "RESIST. FUOCO"). */
export const ELEMENT_SHORT_NAMES: Record<ElementId, string> = { fire: "FUOCO", poison: "VELENO", frost: "GELO", shock: "FULMINE" };

export const AFFIX_ORDER: readonly AffixId[] = ["damage", "recovery", "moveSpeed", "lifeSteal", "maxHealth", "maxStamina", "defense", "resistance", "element", "breaksGuard"];

export function isAffixId(value: unknown): value is AffixId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AFFIX_CONFIG, value);
}
