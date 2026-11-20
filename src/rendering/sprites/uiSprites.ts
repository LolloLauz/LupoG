import { PALETTE } from "../../config/gameConfig";
import type { SpriteManager } from "../SpriteManager";

/** Icone 8x8 dell'interfaccia (HUD). */
const UI_COLORS: Record<string, string> = {
  k: PALETTE.black,
  s: PALETTE.lightGray,
  d: PALETTE.darkBlue,
  r: PALETTE.red,
  w: PALETTE.white,
};

const LIFE_ICON_ROWS = [
  "...rr...",
  "..kkkk..",
  ".kswsssk",
  ".kddddsk",
  ".kssssk.",
  ".kssssk.",
  "..kkkk..",
  "........",
];

export function registerUiSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("hudLife", LIFE_ICON_ROWS, UI_COLORS);
}
