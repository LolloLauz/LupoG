import "./style.css";
import { GameEngine } from "./core/GameEngine";

/** Punto di ingresso: crea il motore sul canvas e lo avvia. */
function startApplication(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;
  if (canvas === null) {
    throw new Error("Canvas #game-canvas non trovato in index.html");
  }
  new GameEngine(canvas).start();
}

startApplication();
