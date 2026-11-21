/**
 * Palette del gioco (stile 16 bit). Tutti i colori del gioco partono da qui.
 *
 * Le console a 16 bit mostravano poche decine di colori alla volta, scelti da una tavolozza
 * più ampia: il "look" nasce dalle RAMPE, cioè gruppi di 4-6 tonalità dello stesso colore
 * dal più scuro al più chiaro, usate per ombre, riflessi e retini (dithering).
 *
 * Regole:
 * - ogni colore è un esadecimale distinto e il totale non supera MAX_PALETTE_COLORS;
 * - i 16 nomi della versione 1.0 (black, darkBlue, ... gray) restano validi con lo stesso valore,
 *   così la grafica esistente non cambia: sono diventati membri delle rampe;
 * - ogni colore appartiene ad almeno una rampa (verificato dai test).
 */
export const PALETTE = {
  // --- i 16 colori della versione 1.0 (invariati) ---
  black: "#0f0f1b",
  darkBlue: "#1a1c2c",
  purple: "#5d275d",
  red: "#b13e53",
  orange: "#ef7d57",
  yellow: "#ffcd75",
  lightGreen: "#a7f070",
  green: "#38b764",
  darkGreen: "#257179",
  navy: "#29366f",
  blue: "#3b5dc9",
  lightBlue: "#41a6f6",
  cyan: "#73eff7",
  white: "#f4f4f4",
  lightGray: "#94b0c2",
  gray: "#566c86",

  // --- acciaio (neutri freddi): completa black → white ---
  slate: "#333c57",

  // --- blu e ghiaccio ---
  deepNavy: "#151d3b",
  iceWhite: "#c8f8ff",

  // --- verdi (foresta) ---
  deepForest: "#0b2622",
  pine: "#154a3c",
  paleGreen: "#e2f8b0",

  // --- caldi (sangue, tramonto) ---
  wine: "#3a1426",
  cream: "#fff4c2",

  // --- fuoco e lava ---
  emberDark: "#4a0f12",
  ember: "#8f1e1a",
  flame: "#d6431f",

  // --- magia (viola) ---
  violetDark: "#1e1033",
  violet: "#3d1f66",
  amethyst: "#6b3fa0",
  lilac: "#a46fd8",
  lavender: "#dcb6ff",

  // --- pelle ---
  skinShadow: "#4a2a2a",
  skinDark: "#8a4f3c",
  skin: "#c98462",
  skinLight: "#f2c094",

  // --- terra e legno ---
  earthDark: "#1f140f",
  earth: "#3d2618",
  wood: "#6b4226",
  woodLight: "#a0683a",
  sand: "#d19a5b",

  // --- pietra (grigi caldi per castello e dungeon) ---
  stoneDark: "#24222b",
  stoneShadow: "#3e3a47",
  stone: "#625c6e",
  stoneLight: "#8c8597",
  stonePale: "#bdb6c6",

  // --- palude (oliva) ---
  bogDark: "#1d2210",
  bog: "#363f1a",
  moss: "#5a6a28",
  olive: "#8a9a3c",
  reed: "#c2cc6e",

  // --- oro e bronzo ---
  bronze: "#5c3a0e",
  gold: "#a06a12",
  goldLight: "#e0a42a",
} as const;

/** Nome di un colore della palette. */
export type PaletteColorName = keyof typeof PALETTE;
/** Valore esadecimale di un colore della palette. */
export type PaletteColor = (typeof PALETTE)[PaletteColorName];

/** Numero massimo di colori distinti ammessi (limite di stile, controllato dai test). */
export const MAX_PALETTE_COLORS = 64;

/**
 * Rampe di colore, dal più scuro al più chiaro. Una rampa può condividere colori con
 * un'altra (es. "fire" termina con l'arancio e il giallo dei colori caldi).
 * Si usano per ombreggiare (shadeColor), per i gradienti del cielo e per il ciclo dei colori
 * (torce, acqua, lava).
 */
export const PALETTE_RAMPS = {
  steel: [PALETTE.black, PALETTE.darkBlue, PALETTE.slate, PALETTE.gray, PALETTE.lightGray, PALETTE.white],
  blue: [PALETTE.deepNavy, PALETTE.navy, PALETTE.blue, PALETTE.lightBlue, PALETTE.cyan, PALETTE.iceWhite],
  green: [PALETTE.deepForest, PALETTE.pine, PALETTE.darkGreen, PALETTE.green, PALETTE.lightGreen, PALETTE.paleGreen],
  warm: [PALETTE.wine, PALETTE.purple, PALETTE.red, PALETTE.orange, PALETTE.yellow, PALETTE.cream],
  fire: [PALETTE.emberDark, PALETTE.ember, PALETTE.flame, PALETTE.orange, PALETTE.yellow, PALETTE.cream],
  magic: [PALETTE.violetDark, PALETTE.violet, PALETTE.amethyst, PALETTE.lilac, PALETTE.lavender],
  skin: [PALETTE.skinShadow, PALETTE.skinDark, PALETTE.skin, PALETTE.skinLight],
  earth: [PALETTE.earthDark, PALETTE.earth, PALETTE.wood, PALETTE.woodLight, PALETTE.sand],
  stone: [PALETTE.stoneDark, PALETTE.stoneShadow, PALETTE.stone, PALETTE.stoneLight, PALETTE.stonePale],
  bog: [PALETTE.bogDark, PALETTE.bog, PALETTE.moss, PALETTE.olive, PALETTE.reed],
  gold: [PALETTE.bronze, PALETTE.gold, PALETTE.goldLight, PALETTE.yellow, PALETTE.cream],
} as const satisfies Record<string, readonly PaletteColor[]>;

/** Nome di una rampa. */
export type PaletteRampName = keyof typeof PALETTE_RAMPS;
