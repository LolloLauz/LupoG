/** Configurazione generale del gioco. */
export const GAME_CONFIG = {
  title: "IRON & SHADOW",
  version: "1.0.0",
  /** Risoluzione interna (stile NES). */
  internalWidth: 256,
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

/** Palette limitata (stile 8 bit). Tutti i colori del gioco partono da qui. */
export const PALETTE = {
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
} as const;

/** Difficoltà: moltiplicatori applicati ai valori base. */
export const DIFFICULTY_CONFIG = {
  easy: { enemyHealthMultiplier: 0.75, enemyDamageMultiplier: 0.75 },
  normal: { enemyHealthMultiplier: 1, enemyDamageMultiplier: 1 },
  hard: { enemyHealthMultiplier: 1.5, enemyDamageMultiplier: 1.25 },
} as const;

export type DifficultyId = keyof typeof DIFFICULTY_CONFIG;
export const DEFAULT_DIFFICULTY: DifficultyId = "normal";
