/**
 * Pagina di prova per i test nel browser (NON fa parte del gioco distribuito).
 *
 * Crea il vero GameEngine, ferma il loop di requestAnimationFrame e lo fa avanzare a mano,
 * così i test sono veloci e ripetibili. L'input arriva da eventi di tastiera veri
 * (window.dispatchEvent), cioè passa da InputManager come per un giocatore.
 * Accede alle variabili private del motore (in JavaScript è possibile): serve solo ai test.
 */
import { GameEngine } from "../../src/core/GameEngine";
import "../../src/style.css";

const canvas = document.getElementById("game-canvas");
const engine = new GameEngine(canvas);
engine.start();
engine.loop.stop();

// ---------------------------------------------------------------- tastiera
const heldKeys = new Set();
const pendingReleases = [];

function setKey(code, isDown) {
  const isHeld = heldKeys.has(code);
  if (isDown && !isHeld) {
    heldKeys.add(code);
    window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
  } else if (!isDown && isHeld) {
    heldKeys.delete(code);
    window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
  }
}

/** Premi e rilascia: il tasto resta premuto per un frame. */
function tap(code) {
  setKey(code, true);
  pendingReleases.push(code);
}

function step(deltaTimeSeconds = 1 / 60, shouldRender = true) {
  engine.update(deltaTimeSeconds);
  if (shouldRender) engine.render();
  while (pendingReleases.length > 0) setKey(pendingReleases.pop(), false);
}

function releaseAll() {
  for (const code of [...heldKeys]) setKey(code, false);
}

// ---------------------------------------------------------------- utilità
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Colori distinti presenti nel canvas (come "r,g,b"). */
function readCanvasColors() {
  const context = canvas.getContext("2d");
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const colors = new Map();
  for (let index = 0; index < data.length; index += 4) {
    const key = `${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`;
    colors.set(key, (colors.get(key) ?? 0) + 1);
  }
  return colors;
}

const VALID_STATES = ["title", "controls", "playing", "paused", "gameOver", "victory"];

/** Controlla le regole che devono valere sempre. Restituisce l'elenco dei problemi. */
function checkInvariants() {
  const problems = [];
  const { player, enemies, boss, levelManager, gameState } = engine;
  const where = ` [stato=${gameState.current} livello=${engine.currentLevelId} larghezza=${levelManager.level.width} giocatore=(${player.positionX.toFixed(1)},${player.positionY.toFixed(1)}) salute=${player.currentHealth}]`;
  const level = levelManager.level;
  const finite = (value) => Number.isFinite(value);
  if (!VALID_STATES.includes(gameState.current)) problems.push(`stato non valido ${gameState.current}`);
  if (![player.positionX, player.positionY, player.velocityX, player.velocityY].every(finite)) problems.push("giocatore con valori non finiti");
  if (player.currentHealth < 0 || player.currentHealth > player.maxHealth) problems.push(`salute fuori intervallo ${player.currentHealth}`);
  if (player.positionX < -0.01 || player.positionX + player.width > level.width + 0.01) problems.push(`giocatore fuori mappa x=${player.positionX}`);
  if (engine.livesManager.remainingLives < 0 || engine.livesManager.remainingLives > 3) problems.push(`vite fuori intervallo ${engine.livesManager.remainingLives}`);
  if (!Number.isInteger(engine.scoreManager.currentScore) || engine.scoreManager.currentScore < 0) problems.push(`punteggio non valido ${engine.scoreManager.currentScore}`);
  for (const enemy of enemies) {
    if (![enemy.positionX, enemy.positionY].every(finite)) problems.push("nemico con valori non finiti");
    if (enemy.currentHealth < 0) problems.push("nemico con salute negativa");
    if (enemy.positionX < -50 || enemy.positionX > level.width + 50) problems.push(`nemico fuori mappa x=${enemy.positionX}`);
  }
  if (boss !== null && ![boss.positionX, boss.positionY, boss.currentHealth].every(finite)) problems.push("boss con valori non finiti");
  const camera = engine.camera;
  if (camera.x < 0 || camera.x > Math.max(0, level.width - engine.renderer.width) || camera.y !== 0) problems.push(`camera fuori limiti x=${camera.x} y=${camera.y}`);
  if (engine.effects.particleCount > 200) problems.push("troppe particelle");
  return problems.map((problem) => problem + where);
}

// ---------------------------------------------------------------- bot
/**
 * Giocatore automatico che usa solo la tastiera. skill = probabilità di schivare un attacco.
 * Restituisce una funzione da chiamare a ogni frame (prima di step()).
 */
function createBot(skill, seed) {
  const random = createRandom(seed);
  const attackStartTimes = new Map();
  const dodgeDecisions = new Map();
  let frameCount = 0;
  let jumpHeldUntil = 0;
  return function botFrame() {
    frameCount++;
    const time = frameCount / 60;
    const state = engine.gameState.current;
    const heldWanted = new Set();
    if (state === "title" || state === "gameOver") {
      if (frameCount % 20 === 0) tap("Enter");
      for (const code of ["KeyA", "KeyD"]) setKey(code, false);
      return;
    }
    if (state !== "playing" || engine.levelPhase !== "playing") return;
    const { player, enemies, boss, levelManager } = engine;
    const platforms = levelManager.platforms;
    const centerX = player.positionX + player.width / 2;
    const targets = [...enemies.filter((e) => e.isAlive), ...(boss !== null && boss.isAlive && boss.isActive ? [boss] : [])];
    let nearest = null;
    let nearestDistance = Infinity;
    for (const target of targets) {
      const dx = target.positionX + target.width / 2 - centerX;
      const dy = Math.abs(target.positionY + target.height / 2 - (player.positionY + player.height / 2));
      if (dy < 16 && Math.abs(dx) < (target === boss ? 160 : 90) && Math.abs(dx) < nearestDistance) {
        nearest = target;
        nearestDistance = Math.abs(dx);
      }
    }
    if (boss !== null && !boss.isActive && levelManager.arenaLocked) nearest = boss;
    const isGroundAt = (x) => platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && p.y >= player.positionY + 20);
    const isWallAt = (x) => platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && p.y < player.positionY + 20 && p.y + p.height > player.positionY + 2);
    let wantsJump = false, wantsAttack = false, wantsDodge = false;
    if (nearest !== null && !player.isDead) {
      const targetCenter = nearest.positionX + nearest.width / 2;
      const direction = targetCenter < centerX ? -1 : 1;
      const gap = Math.abs(targetCenter - centerX) - (nearest.width + player.width) / 2;
      heldWanted.add(direction > 0 ? "KeyD" : "KeyA");
      const isAttacking = nearest.isAttacking || ["slash", "chargeWindup", "charging"].includes(nearest.currentState);
      if (isAttacking) {
        if (!attackStartTimes.has(nearest)) { attackStartTimes.set(nearest, time); dodgeDecisions.set(nearest, random() < skill); }
      } else { attackStartTimes.delete(nearest); dodgeDecisions.delete(nearest); }
      const windupMs = nearest === boss ? (nearest.currentState === "chargeWindup" ? boss.definition.chargeWindupMs : boss.definition.slashWindupMs) : nearest.definition.attackWindupMs;
      const elapsedMs = (time - (attackStartTimes.get(nearest) ?? time)) * 1000;
      const wantsToDodge = isAttacking && dodgeDecisions.get(nearest) && gap < (nearest === boss ? 90 : 40);
      if (wantsToDodge && elapsedMs >= windupMs - 100 && elapsedMs <= windupMs - 30 && player.isOnGround && !player.activeAttack) { wantsDodge = true; dodgeDecisions.set(nearest, false); }
      const holdAttack = wantsToDodge && elapsedMs >= windupMs - 520;
      if (gap <= 16) { heldWanted.clear(); wantsAttack = !holdAttack; }
      else {
        if (gap < 22 && !holdAttack) wantsAttack = true;
        const aheadX = direction > 0 ? player.positionX + player.width + 10 : player.positionX - 10;
        const edgeX = direction > 0 ? player.positionX + player.width + 6 : player.positionX - 6;
        if (player.isOnGround && (isWallAt(aheadX) || !isGroundAt(edgeX)) && !player.activeAttack) wantsJump = true;
      }
    } else if (!player.isDead) {
      heldWanted.add("KeyD");
      if (player.isOnGround && (isWallAt(player.positionX + player.width + 10) || !isGroundAt(player.positionX + player.width + 6))) wantsJump = true;
    }
    setKey("KeyA", heldWanted.has("KeyA"));
    setKey("KeyD", heldWanted.has("KeyD"));
    // il salto si tiene premuto fino all'apice (rilasciando subito il salto si accorcia, come per una persona)
    if (wantsJump) { setKey("KeyW", true); jumpHeldUntil = frameCount + 26; }
    if (frameCount >= jumpHeldUntil) setKey("KeyW", false);
    if (wantsAttack) tap("Space");
    if (wantsDodge) tap("KeyK");
  };
}

/**
 * Fa giocare il bot fino alla vittoria, al Game Over definitivo o al limite di frame.
 * renderEvery: disegna solo un frame ogni N (più veloce); controllo del palette sui frame disegnati.
 */
function playGame({ skill, seed, maxFrames, renderEvery = 3, paletteColors, stopOnGameOver = false }) {
  releaseAll();
  const bot = createBot(skill, seed);
  const statesVisited = new Set();
  const levelsVisited = new Set();
  const invariantProblems = new Set();
  const badColors = new Map();
  const frameTimes = [];
  let deathCount = 0;
  const deathLog = [];
  let lastLives = engine.livesManager.remainingLives;
  let frames = 0;
  let gameOverCount = 0;
  let lastState = engine.gameState.current;
  for (; frames < maxFrames; frames++) {
    bot();
    const shouldRender = frames % renderEvery === 0;
    const started = performance.now();
    step(1 / 60, shouldRender);
    frameTimes.push(performance.now() - started);
    const state = engine.gameState.current;
    statesVisited.add(state);
    if (state === "playing") levelsVisited.add(engine.currentLevelId);
    if (engine.livesManager.remainingLives < lastLives) {
      deathCount += lastLives - engine.livesManager.remainingLives;
      if (deathLog.length < 6) deathLog.push({ frame: frames, level: engine.currentLevelId, x: Math.round(engine.player.positionX), y: Math.round(engine.player.positionY), health: engine.player.currentHealth, enemies: engine.enemies.filter((e) => Math.abs(e.positionX - engine.player.positionX) < 120).map((e) => `${e.definition.id}@${Math.round(e.positionX)}:${e.currentState}`).join(" "), boss: engine.boss !== null ? engine.boss.currentState + ":" + engine.boss.currentHealth : "" });
    }
    lastLives = engine.livesManager.remainingLives;
    if (state === "gameOver" && lastState !== "gameOver") { gameOverCount++; if (stopOnGameOver) break; }
    lastState = state;
    if (frames % 30 === 0) for (const problem of checkInvariants()) invariantProblems.add(problem);
    if (shouldRender && frames % 90 === 0) {
      for (const [color, count] of readCanvasColors()) if (!paletteColors.includes(color)) badColors.set(color, (badColors.get(color) ?? 0) + count);
    }
    if (state === "victory") break;
  }
  releaseAll();
  frameTimes.sort((a, b) => a - b);
  const mean = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  return {
    frames, finalState: engine.gameState.current, victory: engine.gameState.current === "victory",
    statesVisited: [...statesVisited], levelsVisited: [...levelsVisited].sort(), deathCount, gameOverCount,
    deathLog, score: engine.scoreManager.currentScore, invariantProblems: [...invariantProblems],
    badColors: [...badColors.entries()].slice(0, 5), meanFrameMs: mean,
    p95FrameMs: frameTimes[Math.floor(frameTimes.length * 0.95)], p99FrameMs: frameTimes[Math.floor(frameTimes.length * 0.99)], maxFrameMs: frameTimes[frameTimes.length - 1],
  };
}

/** Tasti a caso per molti frame, con passi di tempo diversi, controllando le regole generali. */
function fuzz({ frames, seed, paletteColors }) {
  releaseAll();
  const random = createRandom(seed);
  const codes = ["KeyA", "KeyD", "KeyW", "KeyS", "Space", "KeyJ", "KeyK", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyQ", "Tab"];
  const deltas = [1 / 30, 1 / 60, 1 / 120, 1 / 144, 0.05];
  const problems = new Set();
  const badColors = new Set();
  const statesVisited = new Set();
  for (let frame = 0; frame < frames; frame++) {
    const events = Math.floor(random() * 3);
    for (let i = 0; i < events; i++) {
      const code = codes[Math.floor(random() * codes.length)];
      if (random() < 0.5) setKey(code, !heldKeys.has(code)); else tap(code);
    }
    if (random() < 0.002) window.dispatchEvent(new Event("blur"));
    if (random() < 0.01 && engine.gameState.current === "playing") {
      // teletrasporti e danni a caso per provare situazioni estreme
      const level = engine.levelManager.level;
      engine.player.positionX = random() * (level.width - 20);
      engine.player.positionY = random() * 90; // in cielo: poi cade da solo
    }
    step(deltas[Math.floor(random() * deltas.length)], frame % 5 === 0);
    statesVisited.add(engine.gameState.current);
    if (frame % 20 === 0) for (const problem of checkInvariants()) problems.add(problem);
    if (frame % 500 === 0) for (const [color] of readCanvasColors()) if (!paletteColors.includes(color)) badColors.add(color);
  }
  releaseAll();
  return { problems: [...problems], badColors: [...badColors], statesVisited: [...statesVisited] };
}

window.iron = { engine, setKey, tap, step, releaseAll, playGame, fuzz, checkInvariants, readCanvasColors, createRandom };
