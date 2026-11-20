import { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } from "../config/controlsConfig";
import type { GameAction, InputContext, InputSource } from "../types/GameTypes";

/**
 * Gestione centralizzata della tastiera.
 * - isHeld: tasto tenuto premuto
 * - wasPressed: premuto in questo frame (una sola volta, niente auto-repeat)
 * - wasReleased: rilasciato in questo frame
 * Le azioni non consentite dal contesto corrente (gameplay/menu) restano bloccate.
 */
export class InputManager implements InputSource {
  private readonly actionsByKeyCode = new Map<string, GameAction[]>();
  private readonly heldKeyCodes = new Set<string>();
  private readonly pressedActions = new Set<GameAction>();
  private readonly releasedActions = new Set<GameAction>();
  private currentContext: InputContext = "menu";

  constructor(
    private readonly controls: Record<GameAction, string[]> = CONTROLS_CONFIG
  ) {
    for (const [actionName, keyCodes] of Object.entries(controls)) {
      for (const keyCode of keyCodes) {
        const existingActions = this.actionsByKeyCode.get(keyCode) ?? [];
        existingActions.push(actionName as GameAction);
        this.actionsByKeyCode.set(keyCode, existingActions);
      }
    }
  }

  public attach(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.releaseAllKeys);
  }

  public detach(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.releaseAllKeys);
  }

  /** Cambia contesto e scarta le pressioni non ancora consumate. */
  public setContext(context: InputContext): void {
    this.currentContext = context;
    this.pressedActions.clear();
    this.releasedActions.clear();
  }

  public isHeld(action: GameAction): boolean {
    return (
      this.isActionAllowed(action) &&
      this.controls[action].some((keyCode) => this.heldKeyCodes.has(keyCode))
    );
  }

  public wasPressed(action: GameAction): boolean {
    return this.isActionAllowed(action) && this.pressedActions.has(action);
  }

  public wasReleased(action: GameAction): boolean {
    return this.isActionAllowed(action) && this.releasedActions.has(action);
  }

  /** Da chiamare a fine frame: azzera gli eventi "premuto/rilasciato adesso". */
  public endFrame(): void {
    this.pressedActions.clear();
    this.releasedActions.clear();
  }

  private isActionAllowed(action: GameAction): boolean {
    return INPUT_CONTEXT_ACTIONS[this.currentContext].includes(action);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const actions = this.actionsByKeyCode.get(event.code);
    if (actions === undefined || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    event.preventDefault(); // evita scroll con frecce/spazio
    if (event.repeat || this.heldKeyCodes.has(event.code)) {
      return; // ignora l'auto-repeat del sistema operativo
    }
    this.heldKeyCodes.add(event.code);
    for (const action of actions) {
      this.pressedActions.add(action);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const actions = this.actionsByKeyCode.get(event.code);
    if (actions === undefined) {
      return;
    }
    event.preventDefault();
    this.heldKeyCodes.delete(event.code);
    for (const action of actions) {
      this.releasedActions.add(action);
    }
  };

  /** Se la finestra perde il focus i keyup andrebbero persi: rilascia tutto. */
  private readonly releaseAllKeys = (): void => {
    this.heldKeyCodes.clear();
    this.pressedActions.clear();
  };
}
