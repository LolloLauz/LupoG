import type { GameAction, InputContext } from "../types/GameTypes";

/**
 * Mappa azione -> tasti (valori di KeyboardEvent.code).
 * Per cambiare i controlli basta modificare questa tabella.
 * Lo stesso tasto può comparire in più azioni (es. W = salto e menu su).
 */
export const CONTROLS_CONFIG: Record<GameAction, string[]> = {
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  jump: ["KeyW", "ArrowUp"],
  attack: ["Space"],
  heavyAttack: ["KeyJ"],
  dodge: ["KeyK"],
  pause: ["Escape"],
  confirm: ["Enter"],
  menuUp: ["KeyW", "ArrowUp"],
  menuDown: ["KeyS", "ArrowDown"],
};

/**
 * Azioni accettate in ciascun contesto.
 * In pausa e nei menu i comandi di gioco (salto, attacco...) sono bloccati.
 */
export const INPUT_CONTEXT_ACTIONS: Record<InputContext, GameAction[]> = {
  gameplay: ["moveLeft", "moveRight", "jump", "attack", "heavyAttack", "dodge", "pause"],
  menu: ["menuUp", "menuDown", "confirm", "pause"],
};
