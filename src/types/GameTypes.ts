/** Tipi generici condivisi da tutto il gioco. */

/** Stati principali del gioco (usati dalla macchina a stati di GameState). */
export type GameStateName =
  | "title"
  | "controls"
  | "levelSelect"
  | "characterSelect"
  | "confirmReset"
  | "upgrades"
  | "shop"
  | "equipment"
  | "playing"
  | "paused"
  | "gameOver"
  | "victory";

/** Azioni logiche che il giocatore può compiere (indipendenti dal tasto). */
export type GameAction =
  | "moveLeft"
  | "moveRight"
  | "jump"
  | "attack"
  | "heavyAttack"
  | "dodge"
  | "ability"
  | "crouch"
  | "pickUp"
  | "dropItem"
  | "bagSlot1"
  | "bagSlot2"
  | "bagSlot3"
  | "bagSlot4"
  | "openEquipment"
  | "pause"
  | "confirm"
  | "menuUp"
  | "menuDown"
  | "menuLeft"
  | "menuRight";

/** Contesto di input: decide quali azioni vengono accettate. */
export type InputContext = "gameplay" | "menu";

/** Vettore 2D semplice. */
export interface Vector2 {
  x: number;
  y: number;
}

/** Rettangolo usato per collisioni e hitbox. */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Direzione orizzontale verso cui guarda un'entità. */
export type FacingDirection = "left" | "right";

/** Interfaccia minima di input: permette di testare le entità senza tastiera reale. */
export interface InputSource {
  isHeld(action: GameAction): boolean;
  wasPressed(action: GameAction): boolean;
  wasReleased(action: GameAction): boolean;
}
