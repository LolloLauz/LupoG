// La velocità di gioco non deve dipendere dagli FPS: stesso scenario simulato a frequenze diverse

export const description = "Velocità coerente: movimento, salto, nemici, boss, animazioni e delta time a 20-144 FPS";

export default async function (t, load) {
  const { Player } = await load("entities/Player");
  const { Enemy } = await load("entities/Enemy");
  const { Boss } = await load("entities/Boss");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { GameLoop } = await load("core/GameLoop");
  const { AnimationPlayer } = await load("rendering/AnimationManager");
  const { ENEMY_CONFIG, BOSS_CONFIG } = await load("config/enemyConfig");
  const { PLAYER_ANIMATIONS } = await load("config/animationConfig");
  const { EffectsManager } = await load("rendering/EffectsManager");
  const { GAME_CONFIG } = await load("config/gameConfig");

  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 5000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const rates = [20, 30, 60, 120, 144];
  const settle = (player, dt) => { for (let i = 0; i < Math.ceil(0.1 / dt); i++) player.update(dt, input(), collision, ground, 5000); };

  // --- camminata: 1 secondo ---
  const distances = rates.map((fps) => {
    const dt = 1 / fps;
    const p = new Player(100, 176); settle(p, dt);
    const x0 = p.positionX;
    for (let i = 0; i < fps; i++) p.update(dt, input(["moveRight"]), collision, ground, 5000);
    return p.positionX - x0;
  });
  t("camminata: in 1 secondo la distanza è uguale a 20, 30, 60, 120 e 144 FPS (±1,5%)", distances.every((d) => Math.abs(d - 80) <= 1.2), distances.map((d) => d.toFixed(1)).join(" "));

  // --- salto: altezza massima e durata ---
  const jumps = rates.map((fps) => {
    const dt = 1 / fps;
    const p = new Player(100, 176); settle(p, dt);
    const groundY = p.positionY;
    p.update(dt, input([], ["jump"]), collision, ground, 5000);
    let apex = 0, airTime = 0;
    for (let i = 0; i < fps * 2 && (airTime === 0 || !p.isOnGround); i++) {
      p.update(dt, input(), collision, ground, 5000);
      apex = Math.max(apex, groundY - p.positionY);
      if (!p.isOnGround) airTime += dt;
    }
    return { apex, airTime };
  });
  const apexes = jumps.map((j) => j.apex);
  const spread = Math.max(...apexes) - Math.min(...apexes);
  t("salto: l'altezza massima varia meno di 5 px tra 20 e 144 FPS (circa 53 px)", spread < 5 && apexes.every((a) => a > 46 && a < 60), apexes.map((a) => a.toFixed(1)).join(" "));
  const airTimes = jumps.map((j) => j.airTime);
  t("salto: la durata in aria varia meno di 0,1 s tra 20 e 144 FPS", Math.max(...airTimes) - Math.min(...airTimes) < 0.1, airTimes.map((a) => a.toFixed(2)).join(" "));

  // --- nemico che cammina e boss che carica ---
  const enemyDistances = rates.map((fps) => {
    const dt = 1 / fps;
    const e = new Enemy(ENEMY_CONFIG.goblin, 100, 184);
    for (let i = 0; i < Math.ceil(0.1 / dt); i++) e.update(dt, collision, ground, 5000);
    const x0 = e.positionX;
    for (let i = 0; i < fps * 2; i++) { e.setMovement(1); e.update(dt, collision, ground, 5000); }
    return e.positionX - x0;
  });
  t("goblin: in 2 secondi percorre 110 px a qualsiasi FPS (±2 px)", enemyDistances.every((d) => Math.abs(d - 110) <= 2), enemyDistances.map((d) => d.toFixed(1)).join(" "));

  const chargeDistances = [30, 60, 120].map((fps) => {
    const dt = 1 / fps;
    const player = new Player(100, 176); settle(player, dt);
    const boss = new Boss(BOSS_CONFIG, 1200, 160, () => 0);
    for (let i = 0; i < Math.ceil(0.1 / dt); i++) boss.update(dt, player, collision, ground, 5000);
    const startX = boss.positionX;
    let minX = startX;
    for (let i = 0; i < fps * 6; i++) { player.update(dt, input(), collision, ground, 5000); boss.update(dt, player, collision, ground, 5000); minX = Math.min(minX, boss.positionX); }
    return startX - minX;
  });
  t("boss: la carica (e l'avvicinamento) coprono la stessa distanza a 30, 60 e 120 FPS (±12 px)", Math.max(...chargeDistances) - Math.min(...chargeDistances) <= 12, chargeDistances.map((d) => d.toFixed(0)).join(" "));

  // --- animazioni ed effetti ---
  const frameAfterOneSecond = rates.map((fps) => {
    const animation = new AnimationPlayer(PLAYER_ANIMATIONS, "walk");
    for (let i = 0; i < fps; i++) animation.update(1 / fps);
    return animation.currentFrameId;
  });
  t("animazione di camminata: dopo 1 secondo è sullo stesso frame a tutti gli FPS (±1 frame)", new Set(frameAfterOneSecond).size <= 2, frameAfterOneSecond.join(","));
  const particleLives = [30, 60, 144].map((fps) => {
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const fx = new EffectsManager(rnd);
    fx.spawnBurst(0, 0, ["#fff"], 20);
    let frames = 0;
    while (fx.particleCount > 0 && frames < 1000) { fx.update(1 / fps); frames++; }
    return frames / fps;
  });
  t("effetti: le particelle durano lo stesso tempo reale a 30, 60 e 144 FPS (±0,05 s)", Math.max(...particleLives) - Math.min(...particleLives) <= 0.05, particleLives.map((v) => v.toFixed(2)).join(" "));

  // --- delta time del loop ---
  const max = GAME_CONFIG.maxDeltaTimeSeconds;
  t("delta time: 0 al primo frame, intervallo reale nei casi normali, tetto dopo una pausa lunga", GameLoop.calculateDeltaTime(null, 500, max) === 0 && Math.abs(GameLoop.calculateDeltaTime(0, 16.7, max) - 0.0167) < 1e-9 && GameLoop.calculateDeltaTime(0, 5000, max) === max);
  t("delta time: mai negativo (orologio che torna indietro)", GameLoop.calculateDeltaTime(100, 50, max) === 0);
  t("con il tetto di 0,05 s e la velocità massima di caduta lo spostamento per frame resta < 21 px (niente tunneling)", GAME_CONFIG.maxDeltaTimeSeconds * GAME_CONFIG.maxFallSpeed <= 20.0001);

  // --- tunneling: frame molto lunghi non fanno attraversare il terreno ---
  const p = new Player(100, 100);
  for (let i = 0; i < 40; i++) p.update(max, input(), collision, ground, 5000);
  t("anche con frame da 50 ms il giocatore non attraversa il terreno cadendo da 100 px", p.isOnGround && Math.abs(p.positionY - 176) < 0.01, p.positionY.toFixed(1));
}
