/**
 * Test nel browser (npm run test:browser). Richiede Playwright:
 *     npm install --no-save playwright
 *     npx playwright install chromium
 * (non è una dipendenza del progetto: serve solo a chi vuole rieseguire questi test).
 *
 * Cosa fa:
 *  1. ricostruisce la versione distribuibile (npm run build) e la apre con file:// come un giocatore;
 *  2. controlla errori, richieste di rete, audio, palette, tastiera reale, pausa;
 *  3. prova molte dimensioni di finestra e scale di sistema (100%-300%) controllando che i pixel restino nitidi;
 *  4. con il motore reale avanzato a mano: velocità coerente, bot che gioca tutto il gioco con eventi di
 *     tastiera veri, Game Over, record, regole generali con tasti a caso, prestazioni, rendering di ogni livello.
 *
 * Uso:  npm run test:browser            (completo, circa 2-3 minuti)
 *       npm run test:browser -- --quick (meno ripetizioni)
 */
import { buildSync } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { load, projectRoot } from "../helpers.mjs";

const isQuick = process.argv.includes("--quick");
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright non è installato. Per eseguire questi test:\n  npm install --no-save playwright\n  npx playwright install chromium");
  process.exit(2);
}

// ---------------------------------------------------------------- esito
let totalChecks = 0;
const failures = [];
const check = (name, condition, detail = "") => {
  totalChecks++;
  console.log(`  ${condition ? "✔" : "✘"} ${name}${detail === "" ? "" : "  — " + detail}`);
  if (!condition) failures.push(`${name}${detail === "" ? "" : " (" + detail + ")"}`);
};
const section = (title) => console.log(`\n=== ${title} ===`);

// ---------------------------------------------------------------- preparazione
const { PALETTE, GAME_CONFIG } = await load("config/gameConfig");
const { computeIntegerScale } = await load("rendering/Renderer");
const W = GAME_CONFIG.internalWidth, H = GAME_CONFIG.internalHeight;
const hexToRgba = (hex) => `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},255`;
const paletteColors = Object.values(PALETTE).map(hexToRgba);

section("Preparazione");
const build = spawnSync("npm", ["run", "build"], { cwd: projectRoot, encoding: "utf8", shell: true });
check("npm run build riesce (controllo dei tipi e build)", build.status === 0, build.status === 0 ? "" : (build.stdout + build.stderr).slice(-300));
const distUrl = pathToFileURL(join(projectRoot, "dist", "index.html")).href;
check("dist/index.html esiste", existsSync(join(projectRoot, "dist", "index.html")));

const harnessDirectory = mkdtempSync(join(tmpdir(), "iron-harness-"));
buildSync({ entryPoints: [join(projectRoot, "tests/browser/harness.js")], bundle: true, outfile: join(harnessDirectory, "h.js"), loader: { ".css": "css" }, logLevel: "error" });
writeFileSync(join(harnessDirectory, "index.html"), '<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="h.css"></head><body><div id="game-container"><canvas id="game-canvas" width="' + W + '" height="' + H + '"></canvas></div><script src="h.js"></script></body></html>');
const harnessUrl = pathToFileURL(join(harnessDirectory, "index.html")).href;

const browser = await chromium.launch();
const collectErrors = (page, errors) => {
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
};
const evaluate = (page, code) => page.evaluate(code);

/** Decodifica minimale di un PNG a 8 bit non interlacciato (RGB o RGBA). */
function decodePng(buffer) {
  let offset = 8, width = 0, height = 0, colorType = 0;
  const dataChunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") { width = body.readUInt32BE(0); height = body.readUInt32BE(4); colorType = body[9]; }
    if (type === "IDAT") dataChunks.push(body);
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(dataChunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let row = 0; row < height; row++) {
    const filter = raw[row * (stride + 1)];
    const source = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    for (let column = 0; column < stride; column++) {
      const left = column >= channels ? pixels[row * stride + column - channels] : 0;
      const up = row > 0 ? pixels[(row - 1) * stride + column] : 0;
      const upLeft = row > 0 && column >= channels ? pixels[(row - 1) * stride + column - channels] : 0;
      let value = source[column];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const distanceLeft = Math.abs(estimate - left), distanceUp = Math.abs(estimate - up), distanceUpLeft = Math.abs(estimate - upLeft);
        value += distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft ? left : distanceUp <= distanceUpLeft ? up : upLeft;
      }
      pixels[row * stride + column] = value & 255;
    }
  }
  return { width, height, channels, pixels };
}

/**
 * Quota di blocchi scale x scale NON uniformi dentro la regione (left, top, width, height) dell'immagine
 * (0 = ogni pixel di gioco è un quadrato perfetto, senza sfocature né pixel irregolari).
 */
function irregularBlockShare(image, scale, left, top, width, height) {
  let irregular = 0, total = 0;
  for (let blockY = top; blockY + scale <= top + height; blockY += scale) {
    for (let blockX = left; blockX + scale <= left + width; blockX += scale) {
      const base = (blockY * image.width + blockX) * image.channels;
      let uniform = true;
      for (let dy = 0; dy < scale && uniform; dy++) for (let dx = 0; dx < scale; dx++) {
        const index = ((blockY + dy) * image.width + blockX + dx) * image.channels;
        if (image.pixels[index] !== image.pixels[base] || image.pixels[index + 1] !== image.pixels[base + 1] || image.pixels[index + 2] !== image.pixels[base + 2]) { uniform = false; break; }
      }
      total++;
      if (!uniform) irregular++;
    }
  }
  return irregular / total;
}

const canvasHash = (page) => evaluate(page, `(() => { const d = document.getElementById("game-canvas").getContext("2d").getImageData(0,0,${W},${H}).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i+1]*3 + d[i+2]*7) | 0; return h; })()`);
const canvasColors = (page) => evaluate(page, `(() => { const d = document.getElementById("game-canvas").getContext("2d").getImageData(0,0,${W},${H}).data; const s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(d[i]+","+d[i+1]+","+d[i+2]+","+d[i+3]); return [...s]; })()`);

try {
  // ================================================================= 1. BUILD REALE
  section("1. Versione distribuibile aperta con file:// (come un giocatore)");
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    const page = await context.newPage();
    const errors = [], requests = [], failedRequests = [];
    collectErrors(page, errors);
    page.on("request", (request) => requests.push(request.url()));
    page.on("requestfailed", (request) => failedRequests.push(request.url()));
    await page.addInitScript(() => {
      window.__audioCalls = [];
      for (const name of ["AudioContext", "webkitAudioContext", "Audio"]) {
        if (window[name]) { const Original = window[name]; window[name] = function (...args) { window.__audioCalls.push(name); return new Original(...args); }; }
      }
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.__audioCalls.push("play"); return originalPlay.call(this); };
    });
    await page.goto(distUrl);
    await page.waitForTimeout(600);
    check("nessun errore in console all'avvio", errors.length === 0, errors.join(" | "));
    check("tutte le richieste sono file locali della cartella dist (nessuna rete)", requests.length > 0 && requests.every((url) => url.startsWith(distUrl.replace("index.html", ""))), requests.filter((url) => !url.startsWith(distUrl.replace("index.html", ""))).join(", "));
    check("nessuna richiesta fallita (risorse caricate correttamente)", failedRequests.length === 0, failedRequests.join(", "));
    check(`richieste totali: ${requests.length} (pagina, script, stile)`, requests.length <= 5);
    const size = await evaluate(page, `({w: document.getElementById("game-canvas").width, h: document.getElementById("game-canvas").height})`);
    check(`canvas interno ${W}x${H}`, size.w === W && size.h === H);
    const titleColors = await canvasColors(page);
    check("schermata del titolo: usa solo colori della palette (nessuna sfumatura)", titleColors.every((c) => paletteColors.includes(c)), titleColors.filter((c) => !paletteColors.includes(c)).slice(0, 3).join(" "));
    check("schermata del titolo: usa più di 6 colori (non è vuota)", titleColors.length > 6, String(titleColors.length));
    const titleHash = await canvasHash(page);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    check("Invio sul titolo avvia la partita (l'immagine cambia)", (await canvasHash(page)) !== titleHash);
    const colorsInGame = await canvasColors(page);
    check("in gioco: solo colori della palette", colorsInGame.every((c) => paletteColors.includes(c)), colorsInGame.filter((c) => !paletteColors.includes(c)).slice(0, 3).join(" "));
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(500);
    const movingHash = await canvasHash(page);
    await page.keyboard.up("KeyD");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    const pausedHash1 = await canvasHash(page);
    await page.waitForTimeout(500);
    const pausedHash2 = await canvasHash(page);
    check("tasto Esc: la pausa congela l'immagine", pausedHash1 === pausedHash2 && pausedHash1 !== movingHash);
    await page.keyboard.down("KeyD"); await page.keyboard.press("KeyJ"); await page.keyboard.press("ShiftLeft"); await page.keyboard.press("Digit7");
    await page.waitForTimeout(300);
    await page.keyboard.up("KeyD");
    check("in pausa i comandi di gioco (D, J, Shift, 7) non hanno effetto", (await canvasHash(page)) === pausedHash1);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    check("Esc di nuovo: il gioco riprende", (await canvasHash(page)) !== pausedHash1);

    // frequenza di aggiornamento reale
    const fps = await evaluate(page, `new Promise((resolve) => { let frames = 0; const start = performance.now(); const tick = () => { frames++; if (performance.now() - start < 2000) requestAnimationFrame(tick); else resolve(frames / ((performance.now() - start) / 1000)); }; requestAnimationFrame(tick); })`);
    check(`il browser di prova mantiene un ritmo di disegno fluido (${fps.toFixed(0)} FPS con il gioco in esecuzione)`, fps >= 30);

    // tasti a caso sulla build reale
    const keyNames = ["KeyA", "KeyD", "KeyW", "KeyS", "KeyJ", "KeyK", "KeyL", "ShiftLeft", "Digit7", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    const keyCount = isQuick ? 400 : 1500;
    for (let i = 0; i < keyCount; i++) {
      const key = keyNames[Math.floor(Math.random() * keyNames.length)];
      if (Math.random() < 0.5) await page.keyboard.press(key, { delay: Math.random() * 20 });
      else { await page.keyboard.down(key); if (Math.random() < 0.3) await page.waitForTimeout(15); await page.keyboard.up(key); }
    }
    await page.waitForTimeout(300);
    check(`${keyCount} pressioni di tasti a caso sulla build reale senza errori`, errors.length === 0, errors.slice(0, 2).join(" | "));
    const audioCalls = await evaluate(page, "window.__audioCalls");
    check("nessun uso dell'audio durante tutto il test (AudioContext, Audio, play)", audioCalls.length === 0, audioCalls.join(","));
    check("nessun elemento <audio> o <video> nella pagina", (await evaluate(page, 'document.querySelectorAll("audio, video").length')) === 0);
    await context.close();
  }

  // ================================================================= 2. DIMENSIONI DELLO SCHERMO
  section("2. Dimensioni dello schermo e scala del sistema (pixel nitidi, scala intera)");
  {
    const configurations = [
      [320, 240, 1], [640, 480, 1], [800, 600, 1], [1024, 768, 1], [1280, 720, 1], [1366, 768, 1], [1920, 1080, 1], [2560, 1440, 1], [3840, 2160, 1],
      [1536, 864, 1.25], [1280, 720, 1.5], [1280, 720, 2], [1920, 1080, 1.25], [1707, 960, 1.5], [390, 844, 3], [844, 390, 3], [1000, 1000, 1],
    ];
    for (const [width, height, ratio] of configurations) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: ratio });
      const page = await context.newPage();
      const errors = [];
      collectErrors(page, errors);
      await page.goto(distUrl);
      await page.waitForTimeout(250);
      const rect = await evaluate(page, `(() => { const r = document.getElementById("game-canvas").getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height, rendering: getComputedStyle(document.getElementById("game-canvas")).imageRendering, overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight }; })()`);
      // stessa regola del gioco: la scala intera più grande che entra e che il browser rappresenta esattamente
      const deviceScale = computeIntegerScale(width, height, ratio).deviceScale;
      const label = `${width}x${height} a ${Math.round(ratio * 100)}%`;
      check(`${label}: scala di ${deviceScale} pixel fisici per pixel di gioco (canvas ${(rect.width * ratio).toFixed(0)}x${(rect.height * ratio).toFixed(0)} px fisici)`, Math.abs(rect.width * ratio - deviceScale * W) < 0.05 && Math.abs(rect.height * ratio - deviceScale * H) < 0.05);
      const fits = rect.width <= width + 0.01 && rect.height <= height + 0.01;
      if (fits) check(`${label}: canvas centrato e senza barre di scorrimento`, Math.abs(rect.left - (width - rect.width) / 2) <= 1 && Math.abs(rect.top - (height - rect.height) / 2) <= 1 && !rect.overflow);
      check(`${label}: rendering "pixelated"`, rect.rendering === "pixelated" || rect.rendering === "crisp-edges");
      if (fits) {
        const shot = decodePng(await page.screenshot());
        const originX = Math.round(rect.left * ratio), originY = Math.round(rect.top * ratio);
        const regionFits = originX >= 0 && originY >= 0 && originX + deviceScale * W <= shot.width && originY + deviceScale * H <= shot.height;
        // il browser aggancia il canvas alla griglia dei pixel fisici: si prova lo scarto di ±1 pixel
        let irregular = 1, bestOffset = [0, 0];
        if (regionFits) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          if (originX + dx < 0 || originY + dy < 0 || originX + dx + deviceScale * W > shot.width || originY + dy + deviceScale * H > shot.height) continue;
          const share = irregularBlockShare(shot, deviceScale, originX + dx, originY + dy, deviceScale * W, deviceScale * H);
          if (share < irregular) { irregular = share; bestOffset = [dx, dy]; }
          if (irregular === 0) break;
        }
        // nitidezza: nello screenshot non devono comparire colori fuori palette (niente sfumature)
        let foreignInside = 0, foreignOnEdge = 0;
        if (regionFits) {
          const palettePixels = new Set(paletteColors.map((c) => c.split(",").slice(0, 3).join(",")));
          const left = originX + bestOffset[0], top = originY + bestOffset[1];
          for (let y = top; y < top + deviceScale * H; y++) for (let x = left; x < left + deviceScale * W; x++) {
            const index = (y * shot.width + x) * shot.channels;
            if (palettePixels.has(`${shot.pixels[index]},${shot.pixels[index + 1]},${shot.pixels[index + 2]}`)) continue;
            const isEdge = x === left || x === left + deviceScale * W - 1 || y === top || y === top + deviceScale * H - 1;
            if (isEdge) foreignOnEdge++; else foreignInside++;
          }
        }
        // La dimensione in pixel CSS è esatta solo se è multiplo di 1/64 (precisione del layout del browser).
        // Altrimenti (es. 150% e 300%) il browser può sfumare di poco la prima e l'ultima colonna/riga fisica
        // e spostare di 1 pixel un solo blocco: l'interno dell'immagine resta nitido.
        const cssWidth = (deviceScale * W) / ratio, cssHeight = (deviceScale * H) / ratio;
        const isExactCssSize = Math.abs(cssWidth * 64 - Math.round(cssWidth * 64)) < 1e-6 && Math.abs(cssHeight * 64 - Math.round(cssHeight * 64)) < 1e-6;
        check(`${label}: nessuna sfumatura all'interno del canvas (solo colori della palette)`, regionFits && foreignInside === 0, `${foreignInside} pixel fuori palette`);
        check(`${label}: bordo del canvas nitido${isExactCssSize ? "" : " — si tollera 1 pixel fisico di sfumatura sul bordo (dimensione CSS non esatta)"}`, regionFits && (isExactCssSize ? foreignOnEdge === 0 : foreignOnEdge <= 2 * (deviceScale * W + deviceScale * H)), `${foreignOnEdge} pixel di bordo fuori palette`);
        check(`${label}: pixel di gioco quadrati e regolari (blocchi ${deviceScale}x${deviceScale})${isExactCssSize ? "" : " — si tollera lo scarto di 1 pixel fisico di un blocco"}`, regionFits && (isExactCssSize ? irregular === 0 : irregular <= 0.05), `${(irregular * 100).toFixed(2)}% di blocchi irregolari`);
      } else {
        check(`${label}: finestra più piccola del gioco, scala minima 1 senza errori (il canvas viene tagliato)`, errors.length === 0 && deviceScale === 1);
      }
      check(`${label}: nessun errore`, errors.length === 0, errors.join(" | "));
      await context.close();
    }
    // ridimensionamento durante il gioco
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    collectErrors(page, errors);
    await page.goto(distUrl);
    await page.keyboard.press("Enter");
    const widths = [];
    for (const [w, h] of [[1280, 720], [640, 480], [1920, 1080], [500, 300], [1280, 720]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(200);
      widths.push(await evaluate(page, `document.getElementById("game-canvas").getBoundingClientRect().width`));
    }
    const expectedWidths = [[1280, 720], [640, 480], [1920, 1080], [500, 300], [1280, 720]].map(([w, h]) => W * Math.max(1, Math.floor(Math.min(w / W, h / H))));
    check(`ridimensionando la finestra in gioco la scala si aggiorna (${expectedWidths.join(", ")})`, widths.join(",") === expectedWidths.join(","), widths.join(","));
    check("nessun errore durante i ridimensionamenti", errors.length === 0, errors.join(" | "));
    await context.close();
  }

  // ================================================================= 3. MOTORE REALE
  section("3. Motore reale avanzato a mano (tastiera simulata con eventi veri)");
  const harnessContext = await browser.newContext({ viewport: { width: 768, height: 720 } });
  const page = await harnessContext.newPage();
  const harnessErrors = [];
  collectErrors(page, harnessErrors);
  await page.goto(harnessUrl);
  await page.waitForTimeout(300);
  const colorsArg = JSON.stringify(paletteColors);
  check("il motore si avvia nella schermata del titolo", (await evaluate(page, "iron.engine.gameState.current")) === "title");

  // --- schermate: palette
  const screenStates = await evaluate(page, `(() => {
    const palette = ${colorsArg}; const e = iron.engine; const result = {};
    const colorsOk = () => { const colors = iron.readCanvasColors(); return [...colors.keys()].filter(c => !palette.includes(c)).length === 0; };
    for (let i = 0; i < 5; i++) iron.step(); result.title = colorsOk();
    // "Controlli" è la penultima voce (l'ultima è "Cancella dati"): W due volte dalla prima voce, girando il menu
    iron.tap("KeyW"); iron.step(); iron.tap("KeyW"); iron.step(); iron.tap("Enter"); iron.step(); iron.step(); result.controlsState = e.gameState.current; result.controls = colorsOk();
    iron.tap("Enter"); iron.step(); iron.step(); result.backToTitle = e.gameState.current;
    iron.tap("Enter"); for (let i = 0; i < 20; i++) iron.step(); result.playing = e.gameState.current; result.game = colorsOk();
    iron.tap("Escape"); iron.step(); iron.step(); result.pausedState = e.gameState.current; result.pause = colorsOk();
    iron.tap("Escape"); iron.step(); iron.step(); result.resumed = e.gameState.current;
    e.gameState.change("gameOver"); iron.step(); iron.step(); result.gameOver = colorsOk();
    e.gameState.change("title"); e.gameState.change("playing"); e.gameState.change("victory"); iron.step(); iron.step(); result.victory = colorsOk();
    e.gameState.change("title"); iron.step();
    return result;
  })()`);
  check("tastiera: W W (menu circolare) + Invio sul titolo apre i controlli, Invio torna al titolo", screenStates.controlsState === "controls" && screenStates.backToTitle === "title");
  check("Invio avvia la partita; Esc mette in pausa e Esc riprende", screenStates.playing === "playing" && screenStates.pausedState === "paused" && screenStates.resumed === "playing");
  check("palette: titolo, controlli, gioco, pausa, Game Over, vittoria usano solo i colori della palette", ["title", "controls", "game", "pause", "gameOver", "victory"].every((k) => screenStates[k] === true), Object.entries(screenStates).filter(([, v]) => v === false).map(([k]) => k).join(","));

  // --- scelta del personaggio (Fase 4): si apre dal titolo, si conferma, la partita usa classe, arma e sprite scelti
  const characterRuns = await evaluate(page, `(() => {
    const palette = ${colorsArg}; const e = iron.engine; const result = { runs: [] };
    const colorsOk = () => { const colors = iron.readCanvasColors(); return [...colors.keys()].filter(c => !palette.includes(c)).length === 0; };
    const openSelect = () => { iron.tap("KeyS"); iron.step(); iron.tap("Enter"); iron.step(); iron.step(); };
    e.progressManager.unlockLevel(6); // tutti i personaggi sbloccati (Fase 6)
    openSelect();
    result.selectState = e.gameState.current; result.selectColors = colorsOk();
    for (const id of ["ranger", "berserker", "mage", "paladin", "knight"]) {
      let guard = 0;
      while (e.screens.selectedCharacterId !== id && guard++ < 8) { iron.tap("KeyD"); iron.step(); }
      iron.tap("Enter"); iron.step(); iron.step();
      const titleAfterConfirm = e.gameState.current;
      iron.tap("Enter"); for (let i = 0; i < 40; i++) iron.step();
      const frameId = e.player.getRenderedFrameId();
      if (id === "mage") {
        // Classi Fase 2: 7 lancia il dardo di fuoco (costa mana); HUD con barra del mana e 4 riquadri, colori della palette
        const manaBefore = e.player.mana;
        iron.tap("Digit7"); for (let i = 0; i < 20; i++) iron.step();
        result.mageCast = { spent: e.player.mana < manaBefore, slots: e.player.abilitySlots.length, colors: colorsOk() };
      }
      result.runs.push({ id, titleAfterConfirm, state: e.gameState.current, character: e.player.characterDefinition.id, weapon: e.player.equippedWeapon.id, health: e.player.currentHealth, maxHealth: e.player.maxHealth, hasFrame: e.spriteManager.sprites.has(frameId) && e.spriteManager.sprites.has(frameId + "Fire"), colors: colorsOk() });
      iron.tap("Escape"); iron.step(); iron.tap("KeyS"); iron.step(); iron.tap("Enter"); iron.step(); iron.step();
      openSelect();
    }
    iron.tap("Escape"); iron.step(); iron.step(); result.escState = e.gameState.current;
    // il resto delle prove parte come un giocatore nuovo: cavaliere con la sola spada
    e.progressManager.setCharacter("knight");
    return result;
  })()`);
  const expectedStart = { ranger: "bow", berserker: "axe", mage: "staff", paladin: "mace", knight: "sword" };
  check("la seconda voce del titolo apre la scelta del personaggio, che usa solo colori della palette", characterRuns.selectState === "characterSelect" && characterRuns.selectColors === true, characterRuns.selectState);
  check("confermando si torna al titolo; ESC chiude la scelta", characterRuns.runs.every((r) => r.titleAfterConfirm === "title") && characterRuns.escState === "title");
  check("ogni personaggio scelto entra in gioco con la propria classe, salute piena e arma iniziale", characterRuns.runs.length === 5 && characterRuns.runs.every((r) => r.state === "playing" && r.character === r.id && r.weapon === expectedStart[r.id] && r.maxHealth > 0 && r.health === r.maxHealth), JSON.stringify(characterRuns.runs.map((r) => [r.id, r.state, r.character, r.weapon, r.health])));
  check("Mago (Classi Fase 2): il tasto 7 lancia il dardo pagando mana; HUD con 4 mosse e barra del mana nei colori della palette", characterRuns.mageCast?.spent === true && characterRuns.mageCast?.slots === 4 && characterRuns.mageCast?.colors === true, JSON.stringify(characterRuns.mageCast));
  check("ogni personaggio: gli sprite disegnati esistono (anche col fuoco) e il gioco usa solo colori della palette", characterRuns.runs.every((r) => r.hasFrame && r.colors), JSON.stringify(characterRuns.runs.map((r) => [r.id, r.hasFrame, r.colors])));

  // --- Fase 6: bottega tra un livello e l'altro
  const progression = await evaluate(page, `(() => {
    const palette = ${colorsArg}; const e = iron.engine; const result = {};
    const colorsOk = () => { const colors = iron.readCanvasColors(); return [...colors.keys()].filter(c => !palette.includes(c)).length === 0; };
    iron.tap("Enter"); for (let i = 0; i < 5; i++) iron.step();
    e.bannerRemainingMs = 0; e.scoreManager.addCoins(100);
    e.levelPhase = "completed"; e.bannerRemainingMs = 1; iron.step(); iron.step();
    // E6: la bottega è una stanza camminabile (si resta "playing"); E vicino al primo piedistallo compra la pozione
    result.shopState = e.gameState.current; result.inShopRoom = e.isInShopRoom; result.shopColors = colorsOk();
    e.bannerRemainingMs = 0;
    e.player.positionX = 136 - e.player.width / 2; iron.step();
    const coinsBefore = e.scoreManager.coins;
    iron.tap("KeyE"); iron.step(); iron.step();
    result.bought = coinsBefore - e.scoreManager.coins; result.potions = e.inventory.potionCount;
    // E4: la schermata dell'equipaggiamento si apre con I, usa solo colori della palette e si chiude con I
    iron.tap("KeyI"); iron.step(); iron.step();
    result.equipmentState = e.gameState.current; result.equipmentColors = colorsOk();
    iron.tap("KeyI"); iron.step(); iron.step(); result.afterEquipment = e.gameState.current;
    // la porta in fondo alla stanza porta al livello 2
    iron.setKey("KeyD", true); for (let i = 0; i < 600 && e.isInShopRoom; i++) iron.step(); iron.setKey("KeyD", false); iron.step();
    result.afterShop = e.gameState.current; result.level = e.currentLevelId; result.leftShopRoom = !e.isInShopRoom;
    // partite scollegate: con pozioni, armi, armature, zaino e monete, la partita dopo riparte da zero
    e.inventory.addWeapon("axe"); e.inventory.addToBackpack({ kind: "armor", baseId: "clothHelmet", rarity: "common", affixes: [] });
    e.inventory.equipArmor({ kind: "armor", baseId: "clothBoots", rarity: "common", affixes: [] }); e.scoreManager.addCoins(50);
    iron.tap("Escape"); iron.step(); iron.tap("KeyS"); iron.step(); iron.tap("Enter"); iron.step(); iron.step();
    iron.tap("Enter"); for (let i = 0; i < 5; i++) iron.step();
    result.newRun = [e.currentLevelId, e.inventory.weaponIds.join(), e.inventory.potionCount, e.inventory.backpackItems.length, Object.values(e.inventory.equippedArmor).filter(Boolean).length, e.scoreManager.coins].join("/");
    result.savedKeys = Object.keys(JSON.parse(localStorage.getItem("ironAndShadow.progress"))).sort().join();
    iron.tap("Escape"); iron.step(); iron.tap("KeyS"); iron.step(); iron.tap("Enter"); iron.step(); iron.step();
    return result;
  })()`);
  check("partite scollegate: la nuova partita ha la sola arma iniziale, niente pozioni, zaino, armature o monete", progression.newRun === "1/sword/0/0/0/0", JSON.stringify(progression));
  check("il salvataggio contiene solo versione, livello raggiunto, difficoltà e personaggio", progression.savedKeys === "characterId,difficulty,unlockedLevelId,version", JSON.stringify(progression));
  check("bottega (E6): a fine livello si entra nella stanza del negozio (solo colori della palette), E sul piedistallo compra una pozione, la porta porta al livello 2", progression.shopState === "playing" && progression.inShopRoom === true && progression.shopColors === true && progression.bought === 40 && progression.potions === 1 && progression.afterShop === "playing" && progression.level === 2 && progression.leftShopRoom === true, JSON.stringify(progression));
  check("equipaggiamento (E4): I apre la schermata (solo colori della palette) e la richiude", progression.equipmentState === "equipment" && progression.equipmentColors === true && progression.afterEquipment === "playing", JSON.stringify(progression));

  // --- velocità coerente
  const speeds = await evaluate(page, `(() => {
    const e = iron.engine; const out = {};
    for (const [label, dt, seconds] of [["30", 1/30, 1.5], ["60", 1/60, 1.5], ["120", 1/120, 1.5], ["144", 1/144, 1.5]]) {
      if (e.gameState.current !== "playing") { iron.tap("Enter"); iron.step(); }
      e.startNewGame(); e.bannerRemainingMs = 0; e.enemies = [];
      for (let i = 0; i < 10; i++) iron.step(1/60, false);
      const x0 = e.player.positionX; iron.setKey("KeyD", true);
      for (let i = 0; i < Math.round(seconds / dt); i++) iron.step(dt, i % 8 === 0);
      iron.setKey("KeyD", false); out[label] = e.player.positionX - x0;
    }
    return out;
  })()`);
  check("tastiera reale: tenendo D per 1,5 s si percorrono 120 px a 30, 60, 120 e 144 passi al secondo", Object.values(speeds).every((d) => Math.abs(d - 120) <= 2), JSON.stringify(Object.fromEntries(Object.entries(speeds).map(([k, v]) => [k, +v.toFixed(1)]))));

  // --- Game Over con tastiera
  const gameOverFlow = await evaluate(page, `(() => {
    const e = iron.engine; const log = [];
    if (e.gameState.current !== "playing") { iron.tap("Enter"); iron.step(); }
    e.progressManager.setDifficulty("normal"); // il controllo conta 3 vite (difficoltà normale)
    e.startNewGame(); e.bannerRemainingMs = 0; e.enemies = [];
    for (let life = 3; life >= 1; life--) {
      e.player.takeDamage(10000, 0);
      for (let i = 0; i < 200 && e.gameState.current === "playing" && e.livesManager.remainingLives === life; i++) iron.step();
      log.push([life, e.livesManager.remainingLives, e.gameState.current]);
    }
    const stateAtEnd = e.gameState.current; const livesAtEnd = e.livesManager.remainingLives;
    iron.step(); iron.tap("Enter"); iron.step(); iron.step();
    return { log, stateAtEnd, livesAtEnd, afterRetry: e.gameState.current, livesAfterRetry: e.livesManager.remainingLives, expectedLives: iron.difficultyConfig[e.progressManager.difficulty].startingLives, level: e.currentLevelId, health: e.player.currentHealth };
  })()`);
  check("tre morti di fila: vite 3→2→1→0 e poi Game Over", gameOverFlow.log.map((l) => l[1]).join(",") === "2,1,0" && gameOverFlow.stateAtEnd === "gameOver", JSON.stringify(gameOverFlow.log));
  check("Invio su 'Riprova': nuova partita con le vite della difficoltà scelta, livello 1 e salute piena", gameOverFlow.afterRetry === "playing" && gameOverFlow.livesAfterRetry === gameOverFlow.expectedLives && gameOverFlow.level === 1 && gameOverFlow.health === 100);

  // --- rendering di ogni livello
  const levelRender = await evaluate(page, `(() => {
    const palette = ${colorsArg}; const e = iron.engine; const out = [];
    for (let id = 1; id <= 3; id++) {
      e.startLevel(id); e.bannerRemainingMs = 0;
      if (id === 3) { e.player.positionX = 1235; e.player.positionY = 170; }
      for (let i = 0; i < (id === 3 ? 90 : 10); i++) iron.step();
      const colors = [...iron.readCanvasColors().keys()];
      out.push({ id, name: e.levelManager.level.name, colors: colors.length, onlyPalette: colors.every(c => palette.includes(c)), boss: e.boss !== null && e.boss.isActive });
    }
    return out;
  })()`);
  for (const level of levelRender) check(`livello ${level.id} (${level.name}) si disegna: ${level.colors} colori, tutti della palette${level.id === 3 ? ", boss attivo" : ""}`, level.onlyPalette && level.colors >= 6 && (level.id !== 3 || level.boss));

  // --- bot che gioca tutto il gioco
  const maxFrames = 60 * 60 * 10;
  let victoryResult = null;
  const seeds = isQuick ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];
  const outcomes = [];
  for (const seed of seeds) {
    await evaluate(page, `(() => { const e = iron.engine; iron.releaseAll(); e.gameState.current !== "title" && (e.gameState.change(e.gameState.current === "playing" ? "paused" : e.gameState.current), e.gameState.change("title")); })()`);
    const result = await evaluate(page, `iron.playGame({ skill: 0.5, seed: ${seed}, maxFrames: ${maxFrames}, renderEvery: 3, paletteColors: ${colorsArg} })`);
    outcomes.push(result);
    if (result.victory) { victoryResult = result; break; }
  }
  check(`un giocatore automatico (tastiera simulata) completa il gioco fino alla vittoria: ${outcomes.map((o) => o.victory ? "vittoria" : o.finalState).join(", ")}`, victoryResult !== null);
  const reference = victoryResult ?? outcomes[outcomes.length - 1];
  check(`la partita passa per i livelli 1, 2 e 3 (${reference.levelsVisited.join(",")}) e per gli stati title, playing e victory`, ["1", "2", "3"].every((l) => reference.levelsVisited.map(String).includes(l)) && ["title", "playing", "victory"].every((s) => reference.statesVisited.includes(s)), reference.statesVisited.join(","));
  check(`durata simulata: ${(reference.frames / 3600).toFixed(1)} minuti, ${reference.deathCount} morti, punteggio ${reference.score}`, reference.frames > 600);
  check("nessuna regola violata durante la partita (posizioni finite e dentro la mappa, salute, vite, punteggio, camera)", outcomes.every((o) => o.invariantProblems.length === 0), outcomes.flatMap((o) => o.invariantProblems).slice(0, 3).join("; "));
  check("durante la partita ogni frame disegnato usa solo la palette (effetti, HUD, boss, pausa inclusi)", outcomes.every((o) => o.badColors.length === 0), JSON.stringify(outcomes.flatMap((o) => o.badColors).slice(0, 2)));
  const frameTimeMean = reference.meanFrameMs, frameTimeP99 = reference.p99FrameMs;
  check(`prestazioni (aggiornamento + disegno ogni 3 frame, Chromium senza GPU): media ${frameTimeMean.toFixed(2)} ms, 99° percentile ${frameTimeP99.toFixed(1)} ms, massimo ${reference.maxFrameMs.toFixed(1)} ms (budget 16,7 ms per frame)`, frameTimeMean < 8 && frameTimeP99 < 33);

  // --- record e persistenza
  if (victoryResult !== null) {
    const best = await evaluate(page, "iron.engine.highScoreManager.bestScore");
    check(`il record viene salvato alla vittoria (${best})`, best >= victoryResult.score && best > 0);
    await page.reload();
    await page.waitForTimeout(300);
    const afterReload = await evaluate(page, "iron.engine.highScoreManager.bestScore");
    check("dopo aver ricaricato la pagina il record è ancora lì", afterReload === best, `${afterReload} / ${best}`);
  }

  // --- cancella dati: conferma con "no" predefinito, poi tutto torna come alla prima partita (anche ricaricando)
  const resetFlow = await evaluate(page, `(() => {
    const palette = ${colorsArg}; const e = iron.engine; const result = {};
    const colorsOk = () => { const colors = iron.readCanvasColors(); return [...colors.keys()].filter(c => !palette.includes(c)).length === 0; };
    e.progressManager.unlockLevel(4); e.progressManager.setCharacter("berserker");
    result.scoreBefore = e.highScoreManager.bestScore;
    iron.tap("KeyW"); iron.step(); iron.tap("Enter"); iron.step(); iron.step();
    result.confirmState = e.gameState.current; result.confirmColors = colorsOk();
    iron.tap("Enter"); iron.step(); iron.step();
    result.afterNo = e.gameState.current; result.scoreAfterNo = e.highScoreManager.bestScore;
    iron.tap("KeyW"); iron.step(); iron.tap("Enter"); iron.step(); iron.tap("KeyS"); iron.step(); iron.tap("Enter"); iron.step(); iron.step();
    result.afterYes = e.gameState.current;
    result.scoreAfterYes = e.highScoreManager.bestScore;
    result.progress = [e.progressManager.unlockedLevelId, e.progressManager.characterId, e.inventory.weaponIds.join()].join("/");
    result.player = [e.player.characterDefinition.id, e.player.equippedWeapon.id].join("/");
    return result;
  })()`);
  check("cancella dati: si apre una conferma (solo colori della palette) e Invio sul \"no\" predefinito non cancella", resetFlow.confirmState === "confirmReset" && resetFlow.confirmColors === true && resetFlow.afterNo === "title" && resetFlow.scoreAfterNo === resetFlow.scoreBefore, JSON.stringify(resetFlow));
  check("cancella dati: con \"sì\" record, livelli, personaggio e armi tornano come alla prima partita", resetFlow.afterYes === "title" && resetFlow.scoreAfterYes === 0 && resetFlow.progress === "1/knight/sword" && resetFlow.player === "knight/sword", JSON.stringify(resetFlow));
  await page.reload();
  await page.waitForTimeout(300);
  const afterResetReload = await evaluate(page, `[iron.engine.highScoreManager.bestScore, iron.engine.progressManager.unlockedLevelId, iron.engine.progressManager.characterId].join("/")`);
  check("cancella dati: anche dopo aver ricaricato la pagina", afterResetReload === "0/1/knight", afterResetReload);

  // --- tasti a caso con passi di tempo diversi
  const fuzzFrames = isQuick ? 15000 : 60000;
  const fuzzResults = [];
  for (const seed of [11, 22]) fuzzResults.push(await evaluate(page, `iron.fuzz({ frames: ${fuzzFrames}, seed: ${seed}, paletteColors: ${colorsArg} })`));
  check(`${fuzzFrames * 2} frame con tasti a caso, teletrasporti e passi da 7 a 50 ms: nessuna regola violata`, fuzzResults.every((r) => r.problems.length === 0), fuzzResults.flatMap((r) => r.problems).slice(0, 3).join("; "));
  check("tasti a caso: palette rispettata", fuzzResults.every((r) => r.badColors.length === 0));
  check(`tasti a caso: sono stati visitati più stati (${[...new Set(fuzzResults.flatMap((r) => r.statesVisited))].join(", ")})`, new Set(fuzzResults.flatMap((r) => r.statesVisited)).size >= 4);
  check("nessun errore in console con il motore di prova", harnessErrors.length === 0, harnessErrors.slice(0, 3).join(" | "));
  await harnessContext.close();

  // ================================================================= 4. VELOCITÀ IN TEMPO REALE SOTTO CARICO
  section("4. Velocità in tempo reale con carico artificiale (loop reale con requestAnimationFrame)");
  {
    const results = [];
    for (const burnMs of [0, 14, 30, 55]) {
      const context = await browser.newContext({ viewport: { width: 768, height: 720 } });
      const realPage = await context.newPage();
      await realPage.goto(harnessUrl);
      await realPage.waitForTimeout(200);
      const measurement = await evaluate(realPage, `new Promise((resolve) => {
        const e = iron.engine; iron.tap("Enter"); iron.step(1/60, false); e.startNewGame(); e.bannerRemainingMs = 0; e.enemies = []; e.player.positionX = 24;
        e.loop.start();
        const x0 = e.player.positionX; const t0 = performance.now(); let frames = 0; iron.setKey("KeyD", true);
        const busy = (ms) => { const end = performance.now() + ms; while (performance.now() < end) { /* occupa la CPU */ } };
        const tick = () => { frames++; busy(${burnMs}); if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else { iron.setKey("KeyD", false); e.loop.stop(); resolve({ distance: e.player.positionX - x0, seconds: (performance.now() - t0) / 1000, fps: frames / ((performance.now() - t0) / 1000) }); } };
        requestAnimationFrame(tick);
      })`);
      results.push({ burnMs, ...measurement });
      await context.close();
    }
    for (const r of results) {
      const expected = 80 * r.seconds;
      const isFastEnough = r.fps >= 22;
      check(`carico di ${r.burnMs} ms per frame (${r.fps.toFixed(0)} FPS): in ${r.seconds.toFixed(2)} s il cavaliere percorre ${r.distance.toFixed(0)} px (reali attesi ${expected.toFixed(0)})`, isFastEnough ? Math.abs(r.distance - expected) / expected < 0.08 : r.distance > 0 && r.distance <= expected * 1.02, isFastEnough ? "" : "sotto i 22 FPS il tetto di 0,05 s del delta time rallenta il gioco invece di farlo saltare (voluto)");
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${totalChecks} controlli, ${failures.length} falliti.`);
if (failures.length > 0) console.log("FALLIMENTI:\n" + failures.map((f) => "  ✘ " + f).join("\n"));
process.exit(failures.length === 0 ? 0 : 1);
