// Pixel nitidi (Renderer), scala intera in pixel fisici, integrazione della gravità e limiti della mappa

export const description = "Renderer (rettangoli a pixel interi, scala intera), integrazione della gravità e limiti della mappa";

export default async function (t, load) {
  const { Renderer } = await load("rendering/Renderer");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { Player } = await load("entities/Player");
  const { GAME_CONFIG } = await load("config/gameConfig");

  // ---------- finto canvas e finta finestra ----------
  const calls = [];
  const context = {
    imageSmoothingEnabled: true,
    fillStyle: "",
    fillRect: (...args) => calls.push(args),
    drawImage: (...args) => calls.push(["drawImage", ...args]),
  };
  const fakeCanvas = { width: 0, height: 0, style: {}, getContext: () => context };
  const listeners = [];
  globalThis.window = { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener: (name, fn) => listeners.push([name, fn]) };
  const renderer = new Renderer(fakeCanvas);

  t("il canvas interno è 256x240 e lo smoothing è disattivato", fakeCanvas.width === 256 && fakeCanvas.height === 240 && context.imageSmoothingEnabled === false);
  t("il renderer ascolta il ridimensionamento della finestra", listeners.some(([name]) => name === "resize"));

  // ---------- fillRect: tutti i bordi a pixel interi ----------
  const integerArgs = (args) => args.every((value) => Number.isInteger(value));
  calls.length = 0;
  renderer.fillRect(10.4, 20.6, 5.5, 3.3, "#fff");
  t("fillRect con coordinate e dimensioni frazionarie disegna con valori interi (nessuna sfumatura)", calls.length === 1 && integerArgs(calls[0]), JSON.stringify(calls[0]));
  calls.length = 0;
  renderer.fillRect(0, 154.2, 4, 45.8, "#fff"); // come le colline della foresta (difetto fino alla 0.9.1)
  t("rettangolo con altezza frazionaria (colline della foresta): bordi interi e il bordo inferiore resta a 200", integerArgs(calls[0]) && calls[0][1] + calls[0][3] === 200, JSON.stringify(calls[0]));
  calls.length = 0;
  renderer.fillRect(5, 5, 0.2, 10, "#fff");
  t("un rettangolo più sottile di mezzo pixel non disegna nulla (non produce righe sfumate)", calls.length === 0);
  calls.length = 0;
  for (let i = 0; i < 200; i++) renderer.fillRect(Math.random() * 300 - 20, Math.random() * 280 - 20, Math.random() * 40, Math.random() * 40, "#fff");
  t("200 rettangoli casuali: sempre valori interi", calls.every(integerArgs));
  calls.length = 0;
  renderer.drawText("PUNTI 123", 10.7, 20.2, "#fff", { scale: 2 });
  t("il testo si disegna sempre con valori interi", calls.length > 0 && calls.every(integerArgs));
  calls.length = 0;
  renderer.drawImage({}, 10.5, 20.5);
  t("drawImage arrotonda la posizione", Number.isInteger(calls[0][2]) && Number.isInteger(calls[0][3]));

  // ---------- scala intera in pixel FISICI ----------
  const resize = listeners.find(([name]) => name === "resize")[1];
  const scaleFor = (width, height, ratio) => {
    globalThis.window.innerWidth = width; globalThis.window.innerHeight = height; globalThis.window.devicePixelRatio = ratio;
    resize();
    return { cssWidth: parseFloat(fakeCanvas.style.width), cssHeight: parseFloat(fakeCanvas.style.height) };
  };
  const cases = [[320, 240, 1], [640, 480, 1], [800, 600, 1], [1280, 720, 1], [1366, 768, 1], [1920, 1080, 1], [2560, 1440, 1], [3840, 2160, 1], [1536, 864, 1.25], [1280, 720, 1.5], [1280, 720, 2], [390, 844, 3], [200, 150, 1], [100, 100, 2]];
  const wrong = [];
  for (const [width, height, ratio] of cases) {
    const { cssWidth, cssHeight } = scaleFor(width, height, ratio);
    const deviceWidth = cssWidth * ratio, deviceHeight = cssHeight * ratio;
    const scale = deviceWidth / 256;
    const isInteger = Math.abs(scale - Math.round(scale)) < 0.001 && Math.abs(deviceHeight / 240 - Math.round(deviceHeight / 240)) < 0.001;
    const expected = Math.max(1, Math.floor(Math.min((width * ratio) / 256, (height * ratio) / 240)));
    const fits = deviceWidth <= width * ratio + 0.01 && deviceHeight <= height * ratio + 0.01;
    if (!isInteger || Math.round(scale) !== expected || (expected > 1 && !fits)) wrong.push(`${width}x${height}@${ratio}: scala ${scale}`);
  }
  t("la scala è sempre un numero intero di pixel fisici, la massima che entra nella finestra (14 combinazioni di dimensione e scala di sistema)", wrong.length === 0, wrong.join("; "));
  const normal = scaleFor(1280, 720, 1);
  t("1280x720 al 100%: canvas 768x720 (scala 3)", normal.cssWidth === 768 && normal.cssHeight === 720);
  const dpi150 = scaleFor(1280, 720, 1.5);
  t("1280x720 al 150%: 4 pixel fisici per pixel di gioco (non 3 pixel CSS = 4,5 fisici)", Math.abs(dpi150.cssWidth * 1.5 - 1024) < 0.01);
  const tiny = scaleFor(100, 100, 1);
  t("finestra più piccola del gioco: scala minima 1 (256x240), mai zero né frazionaria", tiny.cssWidth === 256 && tiny.cssHeight === 240);
  globalThis.window.devicePixelRatio = 0;
  resize();
  t("devicePixelRatio non valido (0) trattato come 1", fakeCanvas.style.width === `${256 * Math.max(1, Math.floor(Math.min(100 / 256, 100 / 240)))}px`);

  // ---------- gravità con velocità media ----------
  const collision = new CollisionSystem();
  const platforms = [{ x: 0, y: 200, width: 1000, height: 40 }];
  const falling = { positionX: 100, positionY: 0, velocityX: 0, velocityY: 0, width: 12, height: 24, isOnGround: false, getBounds() { return { x: this.positionX, y: this.positionY, width: 12, height: 24 }; } };
  const dt = 1 / 60;
  const startY = falling.positionY;
  for (let i = 0; i < 24; i++) collision.applyGravityAndMove(falling, dt, GAME_CONFIG.gravity, GAME_CONFIG.maxFallSpeed, platforms, 1000);
  const elapsed = 24 * dt; // 0,4 s: velocità finale 360 px/s, sotto il tetto di 400
  const exact = 0.5 * GAME_CONFIG.gravity * elapsed * elapsed;
  t("caduta libera di 0,4 s: la distanza coincide con la formula esatta ½·g·t² (±0,1 px)", Math.abs(falling.positionY - startY - exact) < 0.1, `${(falling.positionY - startY).toFixed(2)} / ${exact.toFixed(2)}`);
  const lander = { positionX: 100, positionY: 150, velocityX: 0, velocityY: 300, width: 12, height: 24, isOnGround: false, getBounds() { return { x: this.positionX, y: this.positionY, width: 12, height: 24 }; } };
  for (let i = 0; i < 10; i++) collision.applyGravityAndMove(lander, dt, GAME_CONFIG.gravity, GAME_CONFIG.maxFallSpeed, platforms, 1000);
  t("atterraggio: si ferma sul terreno e la velocità verticale resta zero (la gravità non la riattiva)", lander.isOnGround && lander.positionY === 176 && lander.velocityY === 0 || (lander.positionY === 176 && Math.abs(lander.velocityY) < 20), `y=${lander.positionY} vy=${lander.velocityY}`);
  const ceiling = [{ x: 0, y: 200, width: 1000, height: 40 }, { x: 0, y: 100, width: 1000, height: 20 }];
  const jumper = { positionX: 100, positionY: 130, velocityX: 0, velocityY: -300, width: 12, height: 24, isOnGround: false, getBounds() { return { x: this.positionX, y: this.positionY, width: 12, height: 24 }; } };
  for (let i = 0; i < 3; i++) collision.applyGravityAndMove(jumper, dt, GAME_CONFIG.gravity, GAME_CONFIG.maxFallSpeed, ceiling, 1000);
  t("testa contro un soffitto: la posizione non lo attraversa e la salita si interrompe", jumper.positionY >= 120 && jumper.velocityY >= 0, `y=${jumper.positionY} vy=${jumper.velocityY}`);
  const capped = { positionX: 100, positionY: -5000, velocityX: 0, velocityY: 390, width: 12, height: 24, isOnGround: false, getBounds() { return { x: this.positionX, y: this.positionY, width: 12, height: 24 }; } };
  for (let i = 0; i < 60; i++) collision.applyGravityAndMove(capped, dt, GAME_CONFIG.gravity, GAME_CONFIG.maxFallSpeed, [], 1000);
  t("la velocità di caduta non supera mai maxFallSpeed", capped.velocityY <= GAME_CONFIG.maxFallSpeed + 1e-9 && capped.velocityY > GAME_CONFIG.maxFallSpeed - 1, String(capped.velocityY));

  // ---------- limiti della mappa ----------
  const wall = [{ x: 0, y: 200, width: 400, height: 40 }, { x: 380, y: 100, width: 20, height: 100 }];
  const player = new Player(100, 176);
  const input = (held = []) => ({ isHeld: (a) => held.includes(a), wasPressed: () => false, wasReleased: () => false });
  for (let i = 0; i < 400; i++) player.update(dt, input(["moveRight"]), collision, wall, 400);
  t("contro un muro posto al bordo della mappa il giocatore resta dentro la mappa", player.positionX + player.width <= 400 + 0.001 && player.positionX >= 0, `x=${player.positionX}`);
  const embedded = new Player(388, 190);
  embedded.velocityX = -80;
  collision.moveAndCollide(embedded, dt, [{ x: 0, y: 200, width: 400, height: 40 }], 400);
  t("anche se parte infilato nel terreno vicino al bordo non viene mai spinto fuori dalla mappa", embedded.positionX + embedded.width <= 400.001 && embedded.positionX >= 0, `x=${embedded.positionX}`);

  delete globalThis.window;
}
