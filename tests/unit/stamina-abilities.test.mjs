// Fase 5: stamina (schivata, attacchi pesanti, abilità), abilità speciali dei personaggi, parata con lo scudo
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Stamina, abilità (onda d'urto, tiro in ritirata, carica furiosa, scudo), parata perfetta, HUD";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { ABILITY_CONFIG } = await load("config/abilityConfig");
  const { PLAYER_CONFIG } = await load("config/playerConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { PLAYER_ANIMATIONS } = await load("config/animationConfig");
  const { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } = await load("config/controlsConfig");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { CombatSystem } = await load("combat/CombatSystem");
  const { ProjectileSystem } = await load("systems/ProjectileSystem");
  const { CONTROLS_ROWS } = await load("ui/ScreenManager");
  const { HUDManager, STAMINA_BAR_GEOMETRY, ABILITY_BOX_GEOMETRY, HEALTH_SEGMENT_GEOMETRY } = await load("ui/HUDManager");
  const { registerKnightSprites } = await load("rendering/sprites/knightSprites");
  const { PALETTE } = await load("config/gameConfig");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const step = (p, held = [], pressed = [], frames = 1) => { for (let i = 0; i < frames; i++) p.update(frame, input(held, i === 0 ? pressed : []), collision, ground, 3000); };
  const grounded = (id = "knight", x = 300) => {
    const p = new Player(x, 176, CHARACTER_CONFIG[id]);
    p.equipWeapon(WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId]);
    step(p, [], [], 5);
    return p;
  };

  // --- configurazione ---
  t("ogni personaggio ha stamina, recupero, costo della schivata e un'abilità esistente", CHARACTER_ORDER.every((id) => { const c = CHARACTER_CONFIG[id]; return c.maxStamina > 0 && c.staminaRegenPerSecond > 0 && c.dodgeStaminaCost > 0 && c.dodgeStaminaCost < c.maxStamina && c.abilityIds.length === 1 && ABILITY_CONFIG[c.abilityIds[0]]?.id === c.abilityIds[0]; }));
  t("abilità diverse per ogni personaggio (onda d'urto, tiro in ritirata, carica furiosa, scudo)", CHARACTER_ORDER.map((id) => CHARACTER_CONFIG[id].abilityIds.join("+")).join() === "shockwave,backstepShot,furiousCharge,shieldGuard");
  t("ogni abilità costa stamina (meno del massimo di chi la usa)", CHARACTER_ORDER.every((id) => { const a = ABILITY_CONFIG[CHARACTER_CONFIG[id].abilityIds[0]]; return a.cost.stamina > 0 && a.cost.stamina <= CHARACTER_CONFIG[id].maxStamina && a.cooldownMs >= 0 && a.name.length > 0; }));
  t("tasto 7 (o L) per la prima abilità, solo in gioco; riga nella schermata dei controlli", CONTROLS_CONFIG.ability1.includes("Digit7") && CONTROLS_CONFIG.ability1.includes("KeyL") && INPUT_CONTEXT_ACTIONS.gameplay.includes("ability1") && !INPUT_CONTEXT_ACTIONS.menu.includes("ability1") && CONTROLS_ROWS.some((r) => r.keyGroups.flat().includes("L")));
  {
    const abilityAttacks = Object.values(ABILITY_CONFIG).filter((a) => a.kind === "attack");
    const sm = new FakeSpriteManager();
    registerKnightSprites(sm);
    const missing = [];
    for (const ability of abilityAttacks) {
      const animation = PLAYER_ANIMATIONS[ability.attack.animation];
      if (animation === undefined) { missing.push(ability.id); continue; }
      if (Math.abs(animation.frameDurationMs * animation.frameIds.length - ability.attack.durationMs) > 1) missing.push(`${ability.id}: durata`);
      for (const weapon of Object.values(WEAPON_CONFIG)) for (const frameId of animation.frameIds) if (!sm.sprites.has(frameId + weapon.spriteSuffix)) missing.push(frameId + weapon.spriteSuffix);
    }
    t("le abilità hanno animazioni sincronizzate e i loro frame esistono con ogni arma", missing.length === 0 && PLAYER_ANIMATIONS.guard !== undefined, missing.slice(0, 4).join(","));
  }

  // --- stamina ---
  {
    const p = grounded("knight");
    t("si parte con la stamina piena", p.stamina === 100 && p.maxStamina === 100);
    step(p, [], ["dodge"]);
    t("la schivata costa stamina (cavaliere 25)", p.isDodging && p.stamina === 75, String(p.stamina));
    step(p, [], [], 30);
    const afterPause = p.stamina;
    step(p, [], [], 60);
    t("la stamina riparte dopo 0,6 s e recupera circa 30 al secondo", afterPause === 75 && Math.abs(p.stamina - 75 - 30 * (1 - 0.1)) <= 3, `${afterPause} -> ${p.stamina.toFixed(1)}`);
    step(p, [], [], 120);
    t("la stamina non supera il massimo", p.stamina === 100);
  }
  {
    const p = grounded("berserker");
    p.staminaPool.currentValue = 30; // stamina già consumata (campo privato, solo nel test)
    const before = p.stamina;
    step(p, [], ["dodge"]);
    t("senza stamina sufficiente non si schiva e compare \"stanco\"", before < CHARACTER_CONFIG.berserker.dodgeStaminaCost && !p.isDodging && p.drainTired() && !p.drainTired(), `${before.toFixed(1)}`);
  }
  {
    const p = grounded("knight");
    step(p, [], ["heavyAttack"]);
    t("l'attacco pesante costa 15 di stamina", p.activeAttack?.id === "swordHeavy" && p.stamina === 100 - PLAYER_CONFIG.heavyAttackStaminaCost);
    const q = grounded("knight");
    step(q, [], ["attack"]);
    t("l'attacco leggero non costa stamina", q.activeAttack !== null && q.stamina === 100);
    const tired = grounded("knight");
    tired.staminaPool.currentValue = 10; // stamina già consumata (campo privato, solo nel test)
    step(tired, [], ["heavyAttack"]);
    t("senza stamina l'attacco pesante non parte", tired.stamina < 15 && tired.activeAttack === null && tired.drainTired(), tired.stamina.toFixed(1));
  }

  // --- onda d'urto (cavaliere) ---
  {
    const p = grounded("knight");
    const x0 = p.positionX;
    step(p, [], ["ability1"]);
    t("onda d'urto: costa 40, parte la ricarica e si annuncia il nome", p.stamina === 60 && p.abilityCooldownFraction === 1 && p.drainStartedAbilityName() === "ONDA D'URTO" && p.activeAttack?.id === "abilityShockwave");
    let impacts = 0;
    let hitbox = null;
    for (let i = 0; i < 30; i++) { step(p); if (p.drainAbilityImpact()) impacts++; hitbox = hitbox ?? p.getActiveAttackHitbox(); }
    const center = x0 + 6;
    t("onda d'urto: l'area copre 40 px davanti e dietro, e scatta un solo effetto d'impatto", impacts === 1 && hitbox !== null && Math.abs(hitbox.x + hitbox.width / 2 - center) <= 1 && hitbox.width === 92, JSON.stringify(hitbox));
    t("onda d'urto: il cavaliere resta fermo", Math.abs(p.positionX - x0) < 0.5);
    step(p, [], ["ability1"]);
    t("durante la ricarica l'abilità non riparte (e non consuma stamina)", p.activeAttack === null && p.stamina >= 60);
    step(p, [], [], 60 * 6);
    t("dopo 6 s l'abilità è di nuovo pronta", p.abilityCooldownFraction === 0);
    const air = new Player(300, 100, CHARACTER_CONFIG.knight);
    air.update(frame, input([], ["ability1"]), collision, ground, 3000);
    t("in aria le abilità d'attacco non partono", air.activeAttack === null && air.stamina === 100);
    const crouching = grounded("knight");
    step(crouching, ["crouch"], [], 3);
    step(crouching, ["crouch"], ["ability1"]);
    t("da accovacciati l'abilità non parte", crouching.activeAttack === null);
    const k = grounded("knight");
    step(k, [], ["ability1"]);
    step(k, ["crouch"], [], 5);
    t("durante l'abilità non ci si accovaccia (non ci sono pose basse)", !k.isCrouching && k.activeAttack?.id === "abilityShockwave");
  }

  // --- tiro in ritirata (ranger) ---
  {
    const p = grounded("ranger");
    const x0 = p.positionX;
    const ammo = p.currentAmmo;
    step(p, [], ["ability1"]);
    step(p, [], [], 3);
    const invulnerableDuringDash = p.isInvulnerable && p.isDodging && !p.takeDamage(10, x0 + 30);
    let launches = [];
    for (let i = 0; i < 30; i++) { step(p); launches = launches.concat(p.drainProjectileLaunches()); }
    t("tiro in ritirata: balzo all'indietro, invulnerabile durante il balzo", p.positionX < x0 - 40 && invulnerableDuringDash && p.currentHealth === p.maxHealth, `${x0} -> ${p.positionX.toFixed(0)}`);
    t("tiro in ritirata: una freccia in avanti da 20, senza consumare frecce", launches.length === 1 && launches[0].direction.x === 1 && launches[0].damage === 20 && p.currentAmmo === ammo);
  }

  {
    // Fase 8: il balzo all'indietro si ferma prima degli spuntoni (il bot del bilanciamento ci finiva sopra)
    const p = grounded("ranger", 300);
    const { HazardSystem } = await load("systems/HazardSystem");
    const spikes = [{ kind: "spikes", x: 240, y: 192, width: 24, height: 8 }];
    p.environment = new HazardSystem().computePlayerEnvironment(p, spikes);
    step(p, [], ["ability1"]);
    for (let i = 0; i < 30; i++) { p.environment = new HazardSystem().computePlayerEnvironment(p, spikes); step(p); }
    t("tiro in ritirata: il balzo si ferma prima degli spuntoni", p.positionX >= 264 && p.positionX < 300 && p.currentHealth === p.maxHealth, p.positionX.toFixed(1));
  }

  // --- carica furiosa (berserker) ---
  {
    const p = grounded("berserker");
    const x0 = p.positionX;
    step(p, [], ["ability1"]);
    let sawHitbox = false;
    let passesThrough = false;
    for (let i = 0; i < 35; i++) { step(p); sawHitbox ||= p.getActiveAttackHitbox() !== null; passesThrough ||= p.isDodging; }
    const travelled = p.positionX - x0;
    t("carica furiosa: scatto in avanti di circa 70 px con il colpo attivo", travelled > 55 && travelled < 85 && sawHitbox, travelled.toFixed(0));
    t("carica furiosa: attraversa i nemici ma non è invulnerabile", passesThrough && ABILITY_CONFIG.furiousCharge.attack.dash.invulnerable !== true && ABILITY_CONFIG.furiousCharge.attack.breaksGuard === true);
  }

  // --- scudo (paladino) ---
  {
    const p = grounded("paladin");
    const x0 = p.positionX;
    step(p, ["ability1"], ["ability1"]);
    t("scudo: si alza tenendo L (costa 10)", p.isGuarding && p.currentState === "guard" && p.stamina === 110);
    step(p, ["ability1", "moveLeft"], [], 30);
    t("scudo alzato: ci si gira ma non ci si muove, e consuma stamina", p.positionX === x0 && p.facingDirection === "left" && p.stamina < 110 && p.stamina > 100, p.stamina.toFixed(1));
    step(p, [], [], 2);
    t("rilasciando L lo scudo si abbassa", !p.isGuarding && p.abilityCooldownFraction > 0);
  }
  {
    // parata perfetta: scudo appena alzato, colpo da davanti
    const p = grounded("paladin");
    step(p, ["ability1"], ["ability1"]);
    const stunned = [];
    const enemy = { getAttackHitbox: () => p.getBounds(), markPlayerHit() {}, attackDamage: 20, centerX: p.positionX + 30, stun: (ms) => stunned.push(ms) };
    const hits = new CombatSystem().processEnemyAttacks([enemy], p);
    t("parata perfetta: nessun danno, nessun costo, l'attaccante resta stordito 1 s", hits === 0 && p.currentHealth === p.maxHealth && p.stamina === 110 && p.lastGuardOutcome === "perfect" && stunned.join() === "1000" && p.drainGuardEvents().join() === "perfect");
    step(p, ["ability1"], [], 30);
    const before = p.stamina;
    p.takeDamage(20, p.positionX + 30);
    t("parata normale (scudo alzato da più di 0,25 s): costa 1,5 stamina per punto di danno", p.lastGuardOutcome === "blocked" && p.currentHealth === p.maxHealth && Math.abs(before - p.stamina - 30) < 0.01, `${before.toFixed(1)} -> ${p.stamina.toFixed(1)}`);
    step(p, ["ability1"], [], 30);
    p.takeDamage(20, p.positionX - 30);
    t("un colpo alle spalle non si para", p.currentHealth < p.maxHealth && !p.isGuarding);
  }
  {
    const p = grounded("paladin");
    step(p, ["ability1"], ["ability1"]);
    step(p, ["ability1"], [], 60 * 6); // lo scudo consuma stamina
    const lowStamina = p.stamina;
    p.takeDamage(40, p.positionX + 30);
    t("stamina insufficiente: la guardia si rompe e il colpo passa", lowStamina < 60 && p.currentHealth < p.maxHealth && !p.isGuarding && p.stamina === 0 && p.lastGuardOutcome === "broken", lowStamina.toFixed(1));
    const q = grounded("paladin");
    step(q, ["ability1"], ["ability1"]);
    let dropped = false;
    for (let i = 0; i < 60 * 15; i++) { step(q, ["ability1"]); dropped ||= !q.isGuarding && q.stamina === 0; }
    t("finita la stamina lo scudo si abbassa da solo (e tenendo L non si rialza)", dropped && !q.isGuarding);
  }
  {
    const p = grounded("paladin", 300);
    step(p, ["ability1"], ["ability1"]);
    const system = new ProjectileSystem();
    system.spawn({ projectileId: "arrow", origin: { x: 360, y: 184 }, direction: { x: -1, y: 0 }, damage: 10 });
    let events = [];
    for (let i = 0; i < 40; i++) { step(p, ["ability1"]); events = events.concat(system.update(frame, p, ground, 3000, 240)); }
    t("lo scudo ferma le frecce da davanti", p.currentHealth === p.maxHealth && system.activeProjectiles.length === 0 && events.some((e) => e.kind === "deflected"), events.map((e) => e.kind).join());
  }
  {
    const knight = grounded("knight");
    knight.takeDamage(10, knight.positionX + 30);
    t("senza scudo nessuna parata (cavaliere)", knight.lastGuardOutcome === null && knight.currentHealth === 90);
  }

  // --- HUD e motore ---
  {
    const fills = [];
    const texts = [];
    const renderer = {
      width: 320, height: 240,
      fillRect: (x, y, w, h, c) => fills.push({ x, y, w, h, c }), strokeRect() {}, drawText: (text, x, y, c) => texts.push({ text, x, y, c }),
      fillVerticalGradient() {}, fillDitheredOverlay() {}, fillGlow() {},
    };
    const sm = { drawSprite() {} };
    new HUDManager().render(renderer, sm, { health: 100, maxHealth: 100, stamina: 50, maxStamina: 100, ability: { slotNumber: 0, cooldownFraction: 0.5, isReady: false, isActive: false }, lives: 3, score: 0, coins: 0, levelNumber: 1, bag: [], powerUps: [], boss: null }, 0);
    const bar = STAMINA_BAR_GEOMETRY;
    const staminaFill = fills.find((f) => f.x === bar.x && f.y === bar.y && f.c === PALETTE.green);
    t("HUD: barra della stamina piena a metà", staminaFill !== undefined && staminaFill.w === bar.width / 2);
    t("HUD: riquadro dell'abilità con il numero del tasto", texts.some((x) => x.text === "7" && x.x > ABILITY_BOX_GEOMETRY.x && x.x < ABILITY_BOX_GEOMETRY.x + ABILITY_BOX_GEOMETRY.size));
    t("HUD: la barra della stamina sta sotto la salute, dentro il pannello", bar.y > HEALTH_SEGMENT_GEOMETRY.y + HEALTH_SEGMENT_GEOMETRY.height && bar.y + bar.height <= 22 && ABILITY_BOX_GEOMETRY.y + ABILITY_BOX_GEOMETRY.size <= 22);
    t("HUD: tutti i colori dalla palette", fills.every((f) => Object.values(PALETTE).includes(f.c)));
  }
  t("motore: mostra nome dell'abilità, \"stanco\", onda d'urto e parate; passa stamina e abilità all'HUD", /this\.updateCombatAndEnemies\(deltaTimeSeconds\);\s*this\.showStaminaAndAbilityEffects\(\);/.test(engineSource) && /drainStartedAbilityName\(\)[\s\S]{0,400}drainTired\(\)[\s\S]{0,400}drainAbilityImpact\(\)[\s\S]{0,600}drainGuardEvents\(\)/.test(engineSource) && /stamina: this\.player\.stamina,\s*maxStamina: this\.player\.maxStamina,/.test(engineSource));
}
