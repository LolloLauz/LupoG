import type { GameAction, InputContext } from "../types/GameTypes";

/** Cifra del tasto di ogni slot delle mosse speciali (la mostra l'HUD). */
export const ABILITY_SLOT_KEY_LABELS: readonly string[] = ["7", "8", "9", "0"];

/** Azione di ogni slot delle mosse speciali, nell'ordine (slot 0 = tasto 7). */
export const ABILITY_SLOT_ACTIONS: readonly GameAction[] = ["ability1", "ability2", "ability3", "ability4"];

/**
 * Mappa azione -> tasti (valori di KeyboardEvent.code).
 * Per cambiare i controlli basta modificare questa tabella.
 * Lo stesso tasto può comparire in più azioni (es. W = salto e menu su).
 */
export const CONTROLS_CONFIG: Record<GameAction, string[]> = {
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  jump: ["KeyW", "ArrowUp"],
  attack: ["KeyJ"],
  heavyAttack: ["KeyK"],
  dodge: ["ShiftLeft"],
  /** Mosse speciali, una per slot (tasti 7, 8, 9 e 0; L vale come il 7). Lo scudo del Paladino si tiene premuto. */
  ability1: ["Digit7", "Numpad7", "KeyL"],
  ability2: ["Digit8", "Numpad8"],
  ability3: ["Digit9", "Numpad9"],
  ability4: ["Digit0", "Numpad0"],
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
  /** Classi Fase 4: dalla schermata dell'equipaggiamento P apre il pentagono degli attributi; lì J assegna un punto. */
  openAttributes: ["KeyP"],
  assignPoint: ["KeyJ"],
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
    "ability1",
    "ability2",
    "ability3",
    "ability4",
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
  menu: ["menuUp", "menuDown", "menuLeft", "menuRight", "confirm", "pause", "openEquipment", "dropItem", "openAttributes", "assignPoint"],
};
