import type { WeaponId } from "../types/EntityTypes";
import type { AffixRoll, ArmorId } from "../types/ItemTypes";

/**
 * Oggetti fissi (fasi E1 ed E3): Leggendari e Mitici hanno nome ed effetti decisi a mano, non estratti a caso.
 * Il Leggendario è un oggetto "d'identità" (uno per arma, più qualche armatura); il Mitico è il più raro e arriva
 * solo da fonti speciali (il boss finale), mai dai forzieri normali.
 * Aspetto: per ora nessuno sprite su misura, solo i colori della rarità (vedi PIANO_EQUIPAGGIAMENTO.md,
 * "Come si aggiunge un oggetto Mitico").
 */
export type UniqueItemDefinition =
  | { id: string; name: string; description: string; kind: "weapon"; baseId: WeaponId; affixes: AffixRoll[] }
  | { id: string; name: string; description: string; kind: "armor"; baseId: ArmorId; affixes: AffixRoll[] };

export const LEGENDARY_ITEMS: Record<string, UniqueItemDefinition> = {
  dawnBlade: {
    id: "dawnBlade",
    name: "LAMA DELL'ALBA",
    description: "Brucia e restituisce vita.",
    kind: "weapon",
    baseId: "sword",
    affixes: [{ id: "damage", value: 16 }, { id: "element", value: 0, element: "fire" }, { id: "lifeSteal", value: 3 }],
  },
  viperFang: {
    id: "viperFang",
    name: "ZANNA DI VIPERA",
    description: "Colpi rapidissimi e velenosi.",
    kind: "weapon",
    baseId: "dagger",
    affixes: [{ id: "damage", value: 14 }, { id: "element", value: 0, element: "poison" }, { id: "recovery", value: 20 }],
  },
  thunderSpear: {
    id: "thunderSpear",
    name: "LANCIA DEL TUONO",
    description: "Ogni affondo stordisce.",
    kind: "weapon",
    baseId: "spear",
    affixes: [{ id: "damage", value: 15 }, { id: "element", value: 0, element: "shock" }, { id: "moveSpeed", value: 8 }],
  },
  northAxe: {
    id: "northAxe",
    name: "SCURE DEL NORD",
    description: "Gela e si nutre dei colpi.",
    kind: "weapon",
    baseId: "axe",
    affixes: [{ id: "damage", value: 18 }, { id: "element", value: 0, element: "frost" }, { id: "lifeSteal", value: 4 }],
  },
  judgementHammer: {
    id: "judgementHammer",
    name: "MARTELLO DEL GIUDIZIO",
    description: "Fulmini sulle corazze.",
    kind: "weapon",
    baseId: "mace",
    affixes: [{ id: "damage", value: 16 }, { id: "element", value: 0, element: "shock" }, { id: "breaksGuard", value: 0 }],
  },
  phoenixBow: {
    id: "phoenixBow",
    name: "ARCO DELLA FENICE",
    description: "Frecce infuocate e rapide.",
    kind: "weapon",
    baseId: "bow",
    affixes: [{ id: "damage", value: 14 }, { id: "element", value: 0, element: "fire" }, { id: "recovery", value: 18 }],
  },
  hunterCrossbow: {
    id: "hunterCrossbow",
    name: "BALESTRA DEL CACCIATORE",
    description: "Dardi velenosi che spezzano la guardia.",
    kind: "weapon",
    baseId: "crossbow",
    affixes: [{ id: "damage", value: 18 }, { id: "element", value: 0, element: "poison" }, { id: "breaksGuard", value: 0 }],
  },
  twinBlades: {
    id: "twinBlades",
    name: "LAME GEMELLE",
    description: "Lame di ghiaccio, passo leggero.",
    kind: "weapon",
    baseId: "throwingKnives",
    affixes: [{ id: "recovery", value: 22 }, { id: "element", value: 0, element: "frost" }, { id: "moveSpeed", value: 8 }],
  },
  stormJavelin: {
    id: "stormJavelin",
    name: "GIAVELLOTTO DELLA TEMPESTA",
    description: "Trafigge e fulmina.",
    kind: "weapon",
    baseId: "javelin",
    affixes: [{ id: "damage", value: 20 }, { id: "element", value: 0, element: "shock" }],
  },
  fallenKingBlade: {
    id: "fallenKingBlade",
    name: "SPADONE DEL RE CADUTO",
    description: "Gelido, si nutre di ogni colpo.",
    kind: "weapon",
    baseId: "greatsword",
    affixes: [{ id: "damage", value: 18 }, { id: "element", value: 0, element: "frost" }, { id: "lifeSteal", value: 4 }],
  },
  guardianHelm: {
    id: "guardianHelm",
    name: "ELMO DEL GUARDIANO",
    description: "Protegge dal fuoco.",
    kind: "armor",
    baseId: "steelHelmet",
    affixes: [{ id: "defense", value: 6 }, { id: "maxHealth", value: 15 }, { id: "resistance", value: 40, element: "fire" }],
  },
  dragonPlate: {
    id: "dragonPlate",
    name: "CORAZZA DEL DRAGO",
    description: "Squame che respingono il fuoco.",
    kind: "armor",
    baseId: "steelChest",
    affixes: [{ id: "defense", value: 8 }, { id: "maxHealth", value: 20 }, { id: "resistance", value: 50, element: "fire" }],
  },
  windBoots: {
    id: "windBoots",
    name: "STIVALI DEL VENTO",
    description: "Leggeri come l'aria.",
    kind: "armor",
    baseId: "leatherBoots",
    affixes: [{ id: "moveSpeed", value: 12 }, { id: "maxStamina", value: 20 }],
  },
};

export const MYTHIC_ITEMS: Record<string, UniqueItemDefinition> = {
  eternalShadow: {
    id: "eternalShadow",
    name: "OMBRA ETERNA",
    description: "La lama del Signore dell'Ombra.",
    kind: "weapon",
    baseId: "sword",
    affixes: [{ id: "damage", value: 28 }, { id: "lifeSteal", value: 6 }, { id: "element", value: 0, element: "shock" }, { id: "breaksGuard", value: 0 }],
  },
  shadowCrown: {
    id: "shadowCrown",
    name: "CORONA DELL'OMBRA",
    description: "Chi la porta non teme i fulmini.",
    kind: "armor",
    baseId: "steelHelmet",
    affixes: [{ id: "defense", value: 10 }, { id: "maxHealth", value: 25 }, { id: "maxStamina", value: 20 }, { id: "resistance", value: 50, element: "shock" }],
  },
};
