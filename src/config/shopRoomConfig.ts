import type { LevelDefinition } from "../types/LevelTypes";
import { PALETTE } from "./gameConfig";

/**
 * Il negozio come stanza camminabile (fase E6): tra un livello e l'altro si entra nella bottega del mercante, si
 * compra avvicinandosi a un piedistallo e premendo E, si esce dalla porta in fondo. Niente nemici.
 * Con isEnabled = false torna la bottega a menu della Fase 6 (il ripiego).
 */
export const SHOP_ROOM_CONFIG = {
  isEnabled: true,
  /** Centri (x) dei piedistalli, uno per voce della bottega, da sinistra. */
  pedestalCenters: [136, 176, 216, 256, 296],
  pedestalWidth: 18,
  pedestalHeight: 10,
  /** Distanza massima (px) tra il centro del giocatore e quello del piedistallo per comprare. */
  reachDistance: 14,
  /** Banco del mercante: x, larghezza e altezza (poggia sul pavimento). */
  counter: { x: 48, width: 56, height: 16 },
  /** Mercante (dietro il banco): x dello sprite. */
  merchantX: 66,
  /**
   * Il mercante è il personaggio con il cappuccio (ranger) con altri colori: cappuccio viola, veste di cuoio, mantello
   * scuro. Nessuno sprite nuovo, solo una variante di colore (chiavi di knightSprites.ts).
   */
  merchantColors: {
    "2": PALETTE.violet,
    "3": PALETTE.amethyst,
    "4": PALETTE.lilac,
    d: PALETTE.earth,
    g: PALETTE.wood,
    s: PALETTE.woodLight,
    w: PALETTE.sand,
    m: PALETTE.violetDark,
    r: PALETTE.violet,
    o: PALETTE.amethyst,
    N: PALETTE.earthDark,
    B: PALETTE.earth,
    L: PALETTE.wood,
  } as Readonly<Record<string, string>>,
} as const;

/** Pavimento della stanza (y della superficie). */
const FLOOR_Y = 200;

/** La stanza: una sala senza pericoli, la porta d'uscita a destra (si riusa reachExit). */
export const SHOP_ROOM_LEVEL: LevelDefinition = {
  id: 0,
  name: "Bottega del Mercante",
  theme: "shop",
  width: 400,
  height: 240,
  playerStart: { x: 16, y: FLOOR_Y - 24 },
  platforms: [{ x: 0, y: FLOOR_Y, width: 400, height: 40 }],
  enemies: [],
  items: [],
  completion: { kind: "reachExit", exitX: 380 },
  hasBoss: false,
};
