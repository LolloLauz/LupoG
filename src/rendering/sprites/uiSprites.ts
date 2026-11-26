import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";

/** Icone dell'interfaccia (HUD), in stile 16 bit. */
const UI_COLORS: Record<string, string> = {
  k: PALETTE.black,
  d: PALETTE.slate,
  g: PALETTE.gray,
  s: PALETTE.lightGray,
  w: PALETTE.white,
  m: PALETTE.purple,
  r: PALETTE.red,
  o: PALETTE.orange,
  n: PALETTE.gold,
  y: PALETTE.goldLight,
};

/** Elmo del cavaliere (vite rimaste), 9x9. */
const LIFE_ICON_ROWS = [
  "...kmrok.",
  "..kkkkkk.",
  ".kwsssgk.",
  ".kssskkk.",
  ".kgssgdk.",
  ".kdgggdk.",
  "..kkkkk..",
  ".kynnnyk.",
  "..kkkkk..",
];

/** Cuore della salute, 9x8. */
const HEART_ICON_ROWS = [
  ".kk...kk.",
  "kwok.kork",
  "kwoorrrmk",
  "korrrrrmk",
  ".krrrrmk.",
  "..krrmk..",
  "...kmk...",
  "....k....",
];

/** Teschio del boss (accanto alla barra della salute), 9x9. */
const SKULL_ICON_ROWS = [
  "..kkkkk..",
  ".kwsssgk.",
  "kwsssssgk",
  "kskkskkgk",
  "kskoskodk",
  "kgssgssdk",
  ".kdsksdk.",
  "..kgkgk..",
  "...kkk...",
];

/** Colori dell'altare degli attributi (Classi Fase 4): pietra, intarsi d'oro, cristallo viola. */
const ALTAR_COLORS: Record<string, string> = {
  k: PALETTE.black,
  D: PALETTE.stoneDark,
  S: PALETTE.stoneShadow,
  T: PALETTE.stone,
  L: PALETTE.stoneLight,
  P: PALETTE.stonePale,
  n: PALETTE.gold,
  y: PALETTE.goldLight,
  v: PALETTE.violet,
  a: PALETTE.amethyst,
  l: PALETTE.lilac,
  w: PALETTE.white,
};

/**
 * Altare degli attributi nella stanza del negozio (Classi Fase 4), 16x20: un cristallo su un piedistallo di pietra.
 * Sprite provvisorio: quello rifinito arriva con la Fase 6A.
 */
const ALTAR_ROWS = [
  "......kkkk......",
  ".....klwlak.....",
  "....klwllaak....",
  "....kllaaavk....",
  ".....kaavvk.....",
  "......kvvk......",
  ".......kk.......",
  "..kkkkkkkkkkkk..",
  ".kPPPPPPPPPPPLk.",
  ".kLLyLLLLLLyLSk.",
  ".kkkkkkkkkkkkkk.",
  "...kLTTTTTTSk...",
  "...kLTnyynTSk...",
  "...kLTynnyTSk...",
  "...kLTTTTTTSk...",
  "...kLTTTTTTSk...",
  "..kkkkkkkkkkkk..",
  ".kPLLLLLLLLLLSk.",
  ".kSSSSSSSSSSSDk.",
  ".kkkkkkkkkkkkkk.",
];

export function registerUiSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("hudLife", LIFE_ICON_ROWS, UI_COLORS);
  spriteManager.registerSprite("hudHeart", HEART_ICON_ROWS, UI_COLORS);
  spriteManager.registerSprite("hudSkull", SKULL_ICON_ROWS, UI_COLORS);
  spriteManager.registerSprite("shopAltar", ALTAR_ROWS, ALTAR_COLORS);
}
