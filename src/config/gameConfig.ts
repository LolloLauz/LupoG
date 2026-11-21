/** Configurazione generale del gioco. */
export const GAME_CONFIG = {
  title: "IRON & SHADOW",
  version: "2.0.0-alpha.2",
  /**
   * Risoluzione interna (stile 16 bit, come le console di quarta generazione in modalità 320x240).
   * L'altezza è la stessa della versione 1.0, quindi la geometria dei livelli non cambia:
   * la vista è solo più larga (320 px invece di 256).
   */
  internalWidth: 320,
  internalHeight: 240,
  /** Passo massimo di aggiornamento (secondi), evita salti dopo cambi tab. */
  maxDeltaTimeSeconds: 0.05,
  /** Gravità in pixel/secondo^2. */
  gravity: 900,
  /** Velocità di caduta massima (pixel/secondo). Con dt max 0.05 s = 20 px per passo. */
  maxFallSpeed: 400,
  /** Punti assegnati al completamento di un livello. */
  levelCompleteBonus: 500,
  /** Salute recuperata al completamento di ogni livello (non oltre il massimo). */
  levelCompleteHeal: 30,
  /** Danno subito cadendo in un abisso (il giocatore riparte dall'ultimo punto sicuro). */
  fallDamage: 15,
  /** Durata (ms) dei messaggi di inizio e fine livello. */
  levelBannerDurationMs: 2200,
  /** Vite iniziali. */
  startingLives: 3,
  /** Mette in pausa il gioco se la finestra perde il focus. */
  pauseOnFocusLoss: true,
  /** Mostra informazioni di debug (hitbox, FPS). */
  debugMode: false,
} as const;

/**
 * La palette (colori e rampe) è in paletteConfig.ts; qui viene riesportata perché
 * molti moduli importano PALETTE da gameConfig.
 */
export { PALETTE, PALETTE_RAMPS, MAX_PALETTE_COLORS } from "./paletteConfig";
export type { PaletteColor, PaletteColorName, PaletteRampName } from "./paletteConfig";

/** Difficoltà: moltiplicatori applicati ai valori base. */
export const DIFFICULTY_CONFIG = {
  easy: { enemyHealthMultiplier: 0.75, enemyDamageMultiplier: 0.75 },
  normal: { enemyHealthMultiplier: 1, enemyDamageMultiplier: 1 },
  hard: { enemyHealthMultiplier: 1.5, enemyDamageMultiplier: 1.25 },
} as const;

export type DifficultyId = keyof typeof DIFFICULTY_CONFIG;
export const DEFAULT_DIFFICULTY: DifficultyId = "normal";
