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
  /** Abilità speciale del personaggio (Fase 5); lo scudo del Paladino si tiene premuto. */
  ability: ["KeyL"],
  crouch: ["KeyS", "ArrowDown"],
  pickUp: ["KeyE"],
  /** Q: lascia a terra l'arma in mano; Q tenuto + 1-4: lascia il contenuto di quel posto (anche una pozione). */
  dropItem: ["KeyQ"],
  bagSlot1: ["Digit1", "Numpad1"],
  bagSlot2: ["Digit2", "Numpad2"],
  bagSlot3: ["Digit3", "Numpad3"],
  bagSlot4: ["Digit4", "Numpad4"],
  /** Schermata dell'equipaggiamento (E4): si apre e si chiude con I (anche dalla pausa). */
  openEquipment: ["KeyI"],
  pause: ["Escape"],
  confirm: ["Enter"],
  menuUp: ["KeyW", "ArrowUp"],
  menuDown: ["KeyS", "ArrowDown"],
  menuLeft: ["KeyA", "ArrowLeft"],
  menuRight: ["KeyD", "ArrowRight"],
};

/**
 * Azioni accettate in ciascun contesto.
 * In pausa e nei menu i comandi di gioco (salto, attacco...) sono bloccati.
 */
export const INPUT_CONTEXT_ACTIONS: Record<InputContext, GameAction[]> = {
  gameplay: [
    "moveLeft",
    "moveRight",
    "jump",
    "attack",
    "heavyAttack",
    "dodge",
    "ability",
    "crouch",
    "pickUp",
    "dropItem",
    "bagSlot1",
    "bagSlot2",
    "bagSlot3",
    "bagSlot4",
    "openEquipment",
    "pause",
  ],
  // nella schermata dell'equipaggiamento: I la chiude, Q lascia a terra l'oggetto scelto
  menu: ["menuUp", "menuDown", "menuLeft", "menuRight", "confirm", "pause", "openEquipment", "dropItem"],
};
