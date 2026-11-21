/**
 * Effetti dei pericoli e delle zone speciali dei livelli (vedi HazardDefinition in LevelTypes.ts).
 * I moltiplicatori si applicano ai valori normali del giocatore (PLAYER_CONFIG e GAME_CONFIG).
 */
export const HAZARD_CONFIG = {
  spikes: {
    /** Danno al contatto (poi l'invulnerabilità impedisce colpi ripetuti). */
    damage: 12,
  },
  water: {
    speedMultiplier: 0.6,
    gravityMultiplier: 0.4,
    maxFallSpeedMultiplier: 0.3,
    /** In acqua si può "nuotare": il salto funziona anche senza toccare il fondo, più debole. */
    jumpMultiplier: 0.7,
  },
  ice: {
    /**
     * Aderenza (1/s): quanto in fretta la velocità raggiunge quella voluta. Fuori dal ghiaccio
     * è istantanea; con 2,5 servono circa 0,4 s per fermarsi o per raggiungere la piena velocità.
     */
    traction: 2.5,
  },
} as const;
