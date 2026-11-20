import type { GameStateName } from "../types/GameTypes";

/** Transizioni consentite tra gli stati del gioco. */
const ALLOWED_TRANSITIONS: Record<GameStateName, GameStateName[]> = {
  title: ["controls", "playing"],
  controls: ["title"],
  playing: ["paused", "gameOver", "victory"],
  paused: ["playing", "title"],
  gameOver: ["title", "playing"],
  victory: ["title"],
};

/** Macchina a stati del gioco: tiene lo stato corrente e valida i cambi. */
export class GameState {
  private currentStateName: GameStateName = "title";
  private previousStateName: GameStateName = "title";
  private readonly changeListeners: Array<
    (newState: GameStateName, oldState: GameStateName) => void
  > = [];

  public get current(): GameStateName {
    return this.currentStateName;
  }

  public get previous(): GameStateName {
    return this.previousStateName;
  }

  public is(stateName: GameStateName): boolean {
    return this.currentStateName === stateName;
  }

  /** Registra una funzione chiamata a ogni cambio di stato. */
  public onChange(
    listener: (newState: GameStateName, oldState: GameStateName) => void
  ): void {
    this.changeListeners.push(listener);
  }

  /** Cambia stato se la transizione è permessa. Restituisce true se avvenuto. */
  public change(nextState: GameStateName): boolean {
    if (!ALLOWED_TRANSITIONS[this.currentStateName].includes(nextState)) {
      return false;
    }
    this.previousStateName = this.currentStateName;
    this.currentStateName = nextState;
    for (const listener of this.changeListeners) {
      listener(this.currentStateName, this.previousStateName);
    }
    return true;
  }
}
