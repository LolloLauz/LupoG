// Fase 3: proiettili, nemici a distanza e volanti, pericoli (acqua, ghiaccio, spuntoni), piattaforme mobili, attacchi dei boss come dati

export const description = "Proiettili, arciere e pipistrello, acqua/ghiaccio/spuntoni, piattaforme mobili, attacchi dei boss (proiettili, evocazione, pesi)";

export default async function (t, load) {
  const { Player } = await load("entities/Player");
  const { Enemy } = await load("entities/Enemy");
  const { Boss } = await load("entities/Boss");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { EnemyAISystem } = await load("systems/EnemyAISystem");
  const { ProjectileSystem } = await load("systems/ProjectileSystem");
  const { HazardSystem } = await load("systems/HazardSystem");
  const { LevelManager } = await load("systems/LevelManager");
  const { ENEMY_CONFIG, BOSS_CONFIG } = await load("config/enemyConfig");
  const { HAZARD_CONFIG } = await load("config/hazardConfig");
  const { PROJECTILE_CONFIG } = await load("config/projectileConfig");
  const { BOSS_ANIMATIONS } = await load("config/animationConfig");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 2000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const groundedPlayer = (x, platforms = ground) => {
    const player = new Player(x, 176);
    for (let i = 0; i < 5; i++) player.update(frame, input(), collision, platforms, 2000);
    return player;
  };

  // =========================================================================
  // Proiettili
  // =========================================================================
  {
    const system = new ProjectileSystem();
    const farPlayer = groundedPlayer(1500);
    system.spawn({ projectileId: "arrow", origin: { x: 100, y: 150 }, direction: { x: 1, y: 0 }, damage: 10 });
    const arrow = system.activeProjectiles[0];
    for (let i = 0; i < 60; i++) system.update(frame, farPlayer, ground, 2000, 240);
    t("la freccia vola dritta alla sua velocità (170 px in 1 s)", Math.abs(arrow.centerX - (100 + PROJECTILE_CONFIG.arrow.speed)) < 1 && Math.abs(arrow.centerY - 150) < 0.01, arrow.centerX.toFixed(1));
    for (let i = 0; i < 120; i++) system.update(frame, farPlayer, ground, 3000, 240);
    t("a fine durata (2 s) la freccia sparisce", system.activeProjectiles.length === 0);

    const target = groundedPlayer(300);
    system.spawn({ projectileId: "arrow", origin: { x: 200, y: 188 }, direction: { x: 1, y: 0 }, damage: 10 });
    const hitEvents = [];
    for (let i = 0; i < 60 && hitEvents.length === 0; i++) hitEvents.push(...system.update(frame, target, ground, 2000, 240).filter((e) => e.kind === "hitPlayer"));
    t("la freccia colpisce il giocatore: 10 danni, sparisce, il giocatore è respinto nel verso del volo", hitEvents.length === 1 && target.currentHealth === 90 && system.activeProjectiles.length === 0 && target.velocityX > 0);

    const dodger = groundedPlayer(300);
    dodger.update(frame, input([], ["dodge"]), collision, ground, 2000);
    system.spawn({ projectileId: "arrow", origin: { x: 305, y: 188 }, direction: { x: 1, y: 0 }, damage: 10 });
    system.update(frame, dodger, ground, 2000, 240);
    t("durante la schivata la freccia passa attraverso il giocatore e prosegue", dodger.currentHealth === 100 && system.activeProjectiles.length === 1);
    system.clear();

    const wallPlatforms = [...ground, { x: 400, y: 100, width: 20, height: 100 }, { x: 250, y: 150, width: 40, height: 8, oneWay: true }];
    system.spawn({ projectileId: "magicBolt", origin: { x: 200, y: 154 }, direction: { x: 1, y: 0 }, damage: 5 });
    const impacts = [];
    for (let i = 0; i < 180; i++) impacts.push(...system.update(frame, groundedPlayer(1500, wallPlatforms), wallPlatforms, 2000, 240));
    t("i proiettili attraversano le piattaforme sospese e si schiantano contro i muri", impacts.some((e) => e.kind === "impact" && Math.abs(e.x - 400) < 8) && system.activeProjectiles.length === 0);

    // deviazione con la spada
    const swordsman = groundedPlayer(300);
    swordsman.update(frame, input([], ["attack"]), collision, ground, 2000);
    let swordBox = null;
    for (let i = 0; i < 20 && swordBox === null; i++) { swordsman.update(frame, input(), collision, ground, 2000); swordBox = swordsman.getActiveAttackHitbox(); }
    const deflectable = new ProjectileSystem();
    deflectable.spawn({ projectileId: "arrow", origin: { x: swordBox.x + swordBox.width / 2, y: swordBox.y + swordBox.height / 2 }, direction: { x: -1, y: 0 }, damage: 10 });
    const deflectEvents = deflectable.update(0, swordsman, ground, 2000, 240);
    t("la spada devia (distrugge) la freccia, senza danno", deflectEvents.some((e) => e.kind === "deflected") && deflectable.activeProjectiles.length === 0 && swordsman.currentHealth === 100);
    const fire = new ProjectileSystem();
    fire.spawn({ projectileId: "fireball", origin: { x: swordBox.x + swordBox.width / 2, y: swordBox.y + swordBox.height / 2 }, direction: { x: -1, y: 0 }, damage: 10 });
    const fireEvents = fire.update(0, swordsman, ground, 2000, 240);
    t("la palla di fuoco non si può deviare", !fireEvents.some((e) => e.kind === "deflected"));
    const lost = new ProjectileSystem();
    lost.spawn({ projectileId: "magicBolt", origin: { x: 10, y: 100 }, direction: { x: -1, y: 0 }, damage: 5 });
    for (let i = 0; i < 40; i++) lost.update(frame, farPlayer, ground, 2000, 240);
    t("un proiettile uscito dalla mappa sparisce", lost.activeProjectiles.length === 0);
  }

  // =========================================================================
  // Arciere scheletro (comportamento "ranged")
  // =========================================================================
  {
    const ai = new EnemyAISystem();
    const archerConfig = ENEMY_CONFIG.skeletonArcher;
    const runArcher = (playerX, frames, playerY = 176, platforms = ground) => {
      const archer = new Enemy(archerConfig, 600, 176);
      const player = new Player(playerX, playerY);
      const launches = [];
      for (let i = 0; i < frames; i++) {
        player.update(frame, input(), collision, platforms, 2000);
        ai.update([archer], player, platforms);
        archer.update(frame, collision, platforms, 2000);
        launches.push(...archer.drainProjectileLaunches().map((launch) => ({ ...launch, frame: i })));
      }
      return { archer, player, launches };
    };
    const shot = runArcher(500, 60);
    const firstLaunch = shot.launches[0];
    t("l'arciere tira una freccia verso il giocatore alla sua altezza (entro 130 px)", firstLaunch !== undefined && firstLaunch.projectileId === "arrow" && firstLaunch.direction.x === -1 && firstLaunch.damage === archerConfig.attackDamage);
    t("la freccia parte alla fine della preparazione (600 ms), non prima", firstLaunch !== undefined && Math.abs(firstLaunch.frame * (1000 / 60) - archerConfig.attackWindupMs) <= 20, String(firstLaunch?.frame));
    t("l'arciere non ferisce con il corpo (nessuna area d'urto da mischia)", shot.archer.getAttackHitbox() === null);
    t("un solo tiro per attacco, poi la pausa (1 s: 1 freccia)", shot.launches.length === 1);
    const far = runArcher(300, 120);
    t("fuori dal raggio di vista (150 px) non tira", far.launches.length === 0);
    const high = runArcher(560, 120, 100, [...ground, { x: 540, y: 124, width: 60, height: 8, oneWay: true }]);
    t("non tira a chi sta su un'altra altezza", high.launches.length === 0);
    const close = runArcher(590, 30);
    t("se il giocatore è troppo vicino indietreggia (senza voltarsi)", close.archer.positionX > 600 && close.archer.facingDirection === "left", close.archer.positionX.toFixed(1));
    // interruzione: colpito durante la preparazione non tira
    const archer = new Enemy(archerConfig, 600, 176);
    const player = new Player(500, 176);
    let launches = 0;
    for (let i = 0; i < 90; i++) {
      player.update(frame, input(), collision, ground, 2000);
      ai.update([archer], player, ground);
      archer.update(frame, collision, ground, 2000);
      if (archer.isAttacking && i % 20 === 5) archer.receiveHit(1, "right");
      launches += archer.drainProjectileLaunches().length;
    }
    t("colpito durante la preparazione, l'arciere non scocca", launches === 0);
  }

  // =========================================================================
  // Pipistrello (comportamento "flyer")
  // =========================================================================
  {
    const ai = new EnemyAISystem();
    const batConfig = ENEMY_CONFIG.bat;
    const platforms = [...ground, { x: 380, y: 150, width: 60, height: 8, oneWay: true }];
    const bat = new Enemy(batConfig, 400, 120);
    const farPlayer = groundedPlayer(1200, platforms);
    for (let i = 0; i < 120; i++) { ai.update([bat], farPlayer, platforms, [], i * 16.7); bat.update(frame, collision, platforms, 2000); }
    t("senza bersaglio il pipistrello resta in volo vicino al punto di partenza (niente gravità)", Math.abs(bat.positionY - 120) <= batConfig.flight.bobAmplitude + 2 && Math.abs(bat.positionX - 400) <= batConfig.patrolDistance + 2, `${bat.positionX.toFixed(0)},${bat.positionY.toFixed(0)}`);
    const player = groundedPlayer(480, platforms);
    let sawDive = false;
    let damage = 0;
    for (let i = 0; i < 240; i++) {
      player.update(frame, input(), collision, platforms, 2000);
      ai.update([bat], player, platforms, [], i * 16.7);
      bat.update(frame, collision, platforms, 2000);
      const hitbox = bat.getAttackHitbox();
      if (hitbox !== null) sawDive = true;
      if (hitbox !== null && CollisionSystem.intersects(hitbox, player.getBounds())) { bat.markPlayerHit(); if (player.takeDamage(bat.attackDamage, bat.centerX)) damage += bat.attackDamage; }
    }
    t("visto il giocatore si avvicina e attacca in picchiata (area d'urto = corpo)", sawDive);
    t("la picchiata può ferire il giocatore", damage === batConfig.attackDamage, String(damage));
    t("in volo attraversa le piattaforme sospese (non resta appoggiato)", !bat.isOnGround || bat.positionY + bat.height < 150);
    bat.receiveHit(1000, "right");
    for (let i = 0; i < 120; i++) bat.update(frame, collision, platforms, 2000);
    t("da morto il pipistrello cade a terra", bat.isOnGround && !bat.isAlive);
  }

  // =========================================================================
  // Pericoli: acqua, ghiaccio, spuntoni
  // =========================================================================
  {
    const hazards = new HazardSystem();
    const water = { kind: "water", x: 100, y: 160, width: 100, height: 40 };
    const ice = { kind: "ice", x: 300, y: 198, width: 100, height: 4 };
    const spikes = { kind: "spikes", x: 500, y: 192, width: 24, height: 8 };
    const level = [water, ice, spikes];
    t("in acqua: ambiente acquatico (si nuota)", hazards.computePlayerEnvironment(groundedPlayer(140), level).canSwim === true);
    t("sul ghiaccio: aderenza ridotta", hazards.computePlayerEnvironment(groundedPlayer(340), level).traction === HAZARD_CONFIG.ice.traction);
    t("altrove: ambiente normale", hazards.computePlayerEnvironment(groundedPlayer(700), level).traction === null && !hazards.computePlayerEnvironment(groundedPlayer(700), level).canSwim);
    const jumper = groundedPlayer(340);
    jumper.update(frame, input([], ["jump"]), collision, ground, 2000);
    for (let i = 0; i < 4; i++) jumper.update(frame, input(), collision, ground, 2000);
    t("in aria sopra il ghiaccio l'aderenza non conta (vale solo a terra)", hazards.computePlayerEnvironment(jumper, level).traction === null);

    // ghiaccio: si scivola all'avvio e alla frenata
    const slide = (environment) => {
      const player = groundedPlayer(340);
      player.environment = environment;
      for (let i = 0; i < 6; i++) player.update(frame, input(["moveRight"]), collision, ground, 2000);
      const speedAfterStart = player.velocityX;
      for (let i = 0; i < 60; i++) player.update(frame, input(["moveRight"]), collision, ground, 2000);
      const startX = player.positionX;
      for (let i = 0; i < 12; i++) player.update(frame, input(), collision, ground, 2000);
      return { speedAfterStart, slideDistance: player.positionX - startX };
    };
    const normal = slide(hazards.computePlayerEnvironment(groundedPlayer(700), level));
    const onIce = slide(hazards.computePlayerEnvironment(groundedPlayer(340), level));
    t("sul ghiaccio si accelera piano (dopo 0,1 s meno di metà velocità; fuori subito piena)", onIce.speedAfterStart < 40 && normal.speedAfterStart === 80, `${onIce.speedAfterStart.toFixed(1)} / ${normal.speedAfterStart}`);
    t("sul ghiaccio si scivola dopo aver lasciato il tasto (fuori ci si ferma subito)", onIce.slideDistance > 6 && normal.slideDistance === 0, `${onIce.slideDistance.toFixed(1)} / ${normal.slideDistance}`);

    // acqua: caduta lenta e nuoto
    const fall = (environment) => {
      const player = new Player(140, 100);
      player.environment = environment;
      for (let i = 0; i < 30; i++) player.update(frame, input(), collision, ground, 2000);
      return player.positionY;
    };
    const waterEnvironment = hazards.computePlayerEnvironment(groundedPlayer(140), level);
    const normalEnvironment = hazards.computePlayerEnvironment(groundedPlayer(700), level);
    t("in acqua si cade più lentamente", fall(waterEnvironment) < fall(normalEnvironment) - 20, `${fall(waterEnvironment).toFixed(0)} / ${fall(normalEnvironment).toFixed(0)}`);
    const swimmer = new Player(140, 120);
    swimmer.environment = waterEnvironment;
    for (let i = 0; i < 10; i++) swimmer.update(frame, input(), collision, ground, 2000);
    const yBeforeStroke = swimmer.positionY;
    swimmer.update(frame, input([], ["jump"]), collision, ground, 2000);
    for (let i = 0; i < 10; i++) swimmer.update(frame, input(), collision, ground, 2000);
    t("in acqua si può nuotare verso l'alto anche senza toccare il fondo", swimmer.positionY < yBeforeStroke - 5, `${yBeforeStroke.toFixed(1)} -> ${swimmer.positionY.toFixed(1)}`);
    const waterWalker = groundedPlayer(110);
    waterWalker.environment = waterEnvironment;
    for (let i = 0; i < 60; i++) waterWalker.update(frame, input(["moveRight"]), collision, ground, 2000);
    t("in acqua si cammina al 60% della velocità", Math.abs(waterWalker.positionX - 110 - 80 * HAZARD_CONFIG.water.speedMultiplier) < 1, (waterWalker.positionX - 110).toFixed(1));

    // spuntoni
    const victim = groundedPlayer(506);
    const firstHit = hazards.applyContactDamage(victim, level);
    const secondHit = hazards.applyContactDamage(victim, level);
    t(`spuntoni: ${HAZARD_CONFIG.spikes.damage} danni e rinculo verso l'alto, poi invulnerabilità (nessun secondo colpo)`, firstHit && !secondHit && victim.currentHealth === 100 - HAZARD_CONFIG.spikes.damage && victim.velocityY < 0);
    t("lontano dagli spuntoni nessun danno", !hazards.applyContactDamage(groundedPlayer(700), level));

    // i nemici a terra non entrano negli spuntoni e nell'acqua
    const ai = new EnemyAISystem();
    const goblin = new Enemy(ENEMY_CONFIG.goblin, 540, 184);
    const bait = groundedPlayer(450);
    for (let i = 0; i < 120; i++) { ai.update([goblin], bait, ground, level); goblin.update(frame, collision, ground, 2000); }
    t("un goblin che insegue si ferma prima degli spuntoni", goblin.positionX >= spikes.x + spikes.width - 1, goblin.positionX.toFixed(1));
  }

  // =========================================================================
  // Piattaforme mobili
  // =========================================================================
  {
    const testLevel = {
      id: 99, name: "Prova", theme: "castle", width: 1000, height: 240, playerStart: { x: 10, y: 176 },
      platforms: [{ x: 0, y: 200, width: 1000, height: 40 }],
      enemies: [], items: [], completion: { kind: "reachExit", exitX: 900 }, hasBoss: false,
      movingPlatforms: [{ x: 200, y: 150, width: 48, height: 8, travelX: 100, travelY: 0, periodMs: 4000 }],
    };
    {
      const manager = new LevelManager();
      manager.loadLevelDefinition(testLevel);
      const moving = manager.platforms.find((platform) => platform.isMoving);
      t("la piattaforma mobile è tra le piattaforme attive, attraversabile dal basso", moving !== undefined && moving.oneWay === true);
      manager.updateMovingPlatforms(2000, []);
      const halfwayX = moving.x;
      manager.updateMovingPlatforms(4000, []);
      t("andata e ritorno: a metà periodo è spostata di travelX, a fine periodo torna al punto di partenza", Math.abs(halfwayX - 300) < 0.01 && Math.abs(moving.x - 200) < 0.01);
      manager.updateMovingPlatforms(1000, []);
      const quarterX = moving.x;
      t("rallenta agli estremi (a un quarto di periodo è a metà strada)", Math.abs(quarterX - 250) < 0.01);
      // trasporto
      const rider = new Player(moving.x + 10, 100);
      for (let i = 0; i < 90; i++) rider.update(frame, input(), collision, manager.platforms, 1000);
      const onPlatform = rider.isOnGround && Math.abs(rider.positionY + rider.height - moving.y) < 0.5;
      const bystander = groundedPlayer(600, manager.platforms);
      const riderStartX = rider.positionX;
      const platformStartX = moving.x;
      for (let i = 1; i <= 30; i++) {
        manager.updateMovingPlatforms(1000 + i * (1000 / 60), [rider, bystander]);
        rider.update(frame, input(), collision, manager.platforms, 1000);
        bystander.update(frame, input(), collision, manager.platforms, 1000);
      }
      t("chi sta sopra viene trasportato insieme alla piattaforma", onPlatform && Math.abs((rider.positionX - riderStartX) - (moving.x - platformStartX)) < 0.01 && rider.isOnGround, `${(rider.positionX - riderStartX).toFixed(2)} / ${(moving.x - platformStartX).toFixed(2)}`);
      t("chi non ci sta sopra non si muove", Math.abs(bystander.positionX - 600) < 0.01);
    }
  }

  // =========================================================================
  // Boss: attacchi come dati
  // =========================================================================
  {
    const flat = [{ x: 0, y: 200, width: 1536, height: 40 }];
    const caster = {
      ...BOSS_CONFIG,
      id: "blackKnight",
      attacks: [
        { id: "volley", kind: "projectile", damage: 9, projectileId: "magicBolt", count: 3, spreadDegrees: 30, launchOffset: { x: 30, y: 10 }, minDistance: 40, windupMs: 500, activeMs: 200, recoveryMs: 300 },
        { id: "call", kind: "summon", enemyType: "bat", count: 2, maxAlive: 2, spawnDistance: 30, windupMs: 500, activeMs: 200, recoveryMs: 300 },
        { id: "slash", kind: "melee", damage: 20, range: 34, windupMs: 600, activeMs: 200, recoveryMs: 400 },
      ],
      phases: [{ healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { volley: 1, call: 1, slash: 1 } }],
    };
    const runBoss = (randomValue, playerX, frames, aliveMinions = 0) => {
      const boss = new Boss(caster, 1000, 160, () => randomValue);
      const player = new Player(playerX, 176);
      const launches = [];
      const summons = [];
      const states = new Set();
      for (let i = 0; i < frames; i++) {
        player.update(frame, input(), collision, flat, 1536);
        boss.update(frame, player, collision, flat, 1536, aliveMinions);
        launches.push(...boss.drainProjectileLaunches());
        summons.push(...boss.drainSummonRequests());
        states.add(boss.currentState);
      }
      return { boss, player, launches, summons, states };
    };
    // sorteggio: con pesi uguali 0 -> primo (volley), 0.5 -> secondo (call), 0.9 -> terzo (slash)
    const volley = runBoss(0, 860, 120);
    t("attacco a proiettili: un ventaglio di 3 dardi magici con il danno dell'attacco", volley.launches.length === 3 && volley.launches.every((l) => l.projectileId === "magicBolt" && l.damage === 9));
    // angoli in 0-360 gradi: verso sinistra stanno attorno a 180, senza il salto tra -180 e 180
    const angles = volley.launches.map((l) => ((Math.atan2(l.direction.y, l.direction.x) * 180) / Math.PI + 360) % 360).sort((a, b) => a - b);
    t("il ventaglio è aperto 30° e mirato al giocatore (a sinistra)", Math.abs(angles[2] - angles[0] - 30) < 0.5 && volley.launches.every((l) => l.direction.x < 0), angles.map((a) => a.toFixed(1)).join(","));
    t("stati e animazioni dell'incantesimo: castWindup -> casting -> castRecovery", ["castWindup", "casting", "castRecovery"].every((s) => volley.states.has(s)) && BOSS_ANIMATIONS.blackKnight !== undefined);
    const summon = runBoss(0.5, 860, 120);
    t("evocazione: 2 pipistrelli ai lati del boss, appoggiati alla sua base", summon.summons.length === 2 && summon.summons.every((s) => s.enemyType === "bat") && summon.summons[0].position.x < summon.boss.centerX && summon.summons[1].position.x > summon.boss.centerX);
    const crowded = runBoss(0.5, 860, 120, 2);
    t("con già 2 evocati vivi (maxAlive) non evoca altro", crowded.summons.length === 0);
    const tooClose = runBoss(0, 1000 - 30, 120);
    t("troppo vicino per i proiettili: usa il corpo a corpo", tooClose.launches.length === 0 && tooClose.states.has("slash"));
    const noMelee = { ...caster, attacks: caster.attacks.filter((a) => a.kind !== "melee"), phases: [{ ...caster.phases[0], attackWeights: { volley: 1, call: 1 } }] };
    const statue = new Boss(noMelee, 1000, 160, () => 0);
    const statuePlayer = new Player(990, 176);
    for (let i = 0; i < 120; i++) { statuePlayer.update(frame, input(), collision, flat, 1536); statue.update(frame, statuePlayer, collision, flat, 1536); }
    t("un boss senza corpo a corpo non insegue: resta fermo se il giocatore è troppo vicino", Math.abs(statue.positionX - 1000) < 0.01);
    const weights = { ...caster, phases: [{ ...caster.phases[0], attackWeights: { volley: 0, call: 0, slash: 1 } }] };
    const onlySlash = new Boss(weights, 1000, 160, () => 0);
    const slashPlayer = new Player(970, 176);
    const seenStates = new Set();
    for (let i = 0; i < 240; i++) { slashPlayer.update(frame, input(), collision, flat, 1536); onlySlash.update(frame, slashPlayer, collision, flat, 1536); seenStates.add(onlySlash.currentState); }
    t("un attacco con peso 0 non viene mai scelto", seenStates.has("slash") && !seenStates.has("castWindup") && !seenStates.has("summonWindup"));
    t("durante la preparazione il boss dichiara quanto dura (per i bot di prova)", (() => {
      const boss = new Boss(BOSS_CONFIG, 1000, 160, () => 0.9);
      const p = new Player(970, 176);
      for (let i = 0; i < 240; i++) { p.update(frame, input(), collision, flat, 1536); boss.update(frame, p, collision, flat, 1536); if (boss.currentState === "slash" && boss.currentAttackWindupMs !== null) return boss.currentAttackWindupMs === 600; }
      return false;
    })());
  }
}
