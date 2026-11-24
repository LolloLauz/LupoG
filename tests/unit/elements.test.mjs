// Fase 7: elementi ed effetti di stato (bruciatura, veleno, gelo, shock), resistenze e debolezze dei nemici
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Elementi: bruciatura, veleno, gelo, shock; resistenze dei nemici e dei boss; power-up degli elementi";

export default async function (t, load) {
  const { ELEMENT_CONFIG, ELEMENT_ORDER } = await load("config/elementConfig");
  const { StatusEffects } = await load("combat/StatusEffects");
  const { CombatSystem } = await load("combat/CombatSystem");
  const { ENEMY_CONFIG, BOSS_CATALOG, BOSS_CONFIG } = await load("config/enemyConfig");
  const { POWER_UP_CONFIG } = await load("config/powerUpConfig");
  const { ITEM_CONFIG } = await load("config/itemConfig");
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { Enemy } = await load("entities/Enemy");
  const { Boss } = await load("entities/Boss");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { registerItemSprites } = await load("rendering/sprites/itemSprites");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");
  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];

  // --- configurazione ---
  t("quattro elementi con nome, colore e durata", ELEMENT_ORDER.join() === "fire,poison,frost,shock" && ELEMENT_ORDER.every((e) => ELEMENT_CONFIG[e].durationMs > 0 && ELEMENT_CONFIG[e].name.length > 0 && ELEMENT_CONFIG[e].color.startsWith("#")));
  t("bruciatura e veleno feriscono nel tempo, il gelo rallenta, lo shock stordisce (poi per un po' no)", ELEMENT_CONFIG.fire.tickDamage > 0 && ELEMENT_CONFIG.poison.tickDamage > 0 && ELEMENT_CONFIG.frost.speedMultiplier < 1 && ELEMENT_CONFIG.shock.stunMs > 0 && ELEMENT_CONFIG.shock.stunImmunityMs > ELEMENT_CONFIG.shock.stunMs);
  t("un power-up per ogni elemento (il fuoco tiene anche il danno in più)", ELEMENT_ORDER.every((e) => Object.values(POWER_UP_CONFIG).some((p) => p.element === e)) && POWER_UP_CONFIG.fire.effects.length > 0);
  {
    const sm = new FakeSpriteManager();
    registerItemSprites(sm);
    const elementItems = Object.values(ITEM_CONFIG).filter((item) => item.powerUpId !== undefined && POWER_UP_CONFIG[item.powerUpId].element !== undefined);
    t("oggetti degli elementi con sprite 8x8 e icona del power-up", elementItems.length === 4 && elementItems.every((item) => sm.sprites.get(item.spriteId)?.width === 8 && sm.sprites.has(POWER_UP_CONFIG[item.powerUpId].iconSpriteId)));
    const placed = new Set(LEVEL_CONFIG.flatMap((level) => level.items.map((item) => item.type)));
    t("ogni elemento si trova in almeno un livello", elementItems.every((item) => placed.has(item.id)));
  }
  t("ogni nemico e ogni boss ha almeno una resistenza o debolezza, con valori validi", Object.values(ENEMY_CONFIG).every((e) => Object.keys(e.elementModifiers ?? {}).length > 0) && Object.values(BOSS_CATALOG).every((b) => Object.keys(b.elementModifiers ?? {}).length > 0) && [...Object.values(ENEMY_CONFIG), ...Object.values(BOSS_CATALOG)].every((d) => Object.entries(d.elementModifiers ?? {}).every(([e, m]) => ELEMENT_ORDER.includes(e) && m >= 0 && m <= 3)));
  t("scheletri e melme immuni al veleno, golem immune al gelo e debole al fuoco", ENEMY_CONFIG.skeleton.elementModifiers.poison === 0 && ENEMY_CONFIG.slime.elementModifiers.poison === 0 && ENEMY_CONFIG.iceGolem.elementModifiers.frost === 0 && ENEMY_CONFIG.iceGolem.elementModifiers.fire > 1);

  // --- StatusEffects ---
  const run = (status, ms) => { const ticks = []; for (let i = 0; i < ms / (1000 / 60); i++) ticks.push(...status.update(1000 / 60)); return ticks; };
  {
    const s = new StatusEffects();
    t("veleno applicato", s.apply("poison").isApplied && s.has("poison"));
    const ticks = run(s, 4100);
    t("veleno: 3 danni al secondo per 4 s (4 colpi), poi finisce", ticks.length === 4 && ticks.every((x) => x.element === "poison" && x.damage === 3) && !s.has("poison"), ticks.map((x) => x.damage).join());
    const weak = new StatusEffects({ poison: 1.5 });
    weak.apply("poison");
    t("debole al veleno (x1,5): 5 danni a colpo (4,5 arrotondato)", run(weak, 1100)[0]?.damage === 5);
    const immune = new StatusEffects({ poison: 0 });
    t("immune: l'effetto non si applica", !immune.apply("poison").isApplied && !immune.has("poison") && run(immune, 2000).length === 0);
    const burn = new StatusEffects();
    burn.apply("fire");
    t("bruciatura: 2 danni ogni 0,5 s per 2 s", run(burn, 2100).reduce((sum, x) => sum + x.damage, 0) === 8);
    const refresh = new StatusEffects();
    refresh.apply("poison");
    run(refresh, 3000);
    refresh.apply("poison");
    t("riapplicato, l'effetto riparte da capo", refresh.has("poison") && (run(refresh, 3500), refresh.has("poison")));
  }
  {
    const s = new StatusEffects();
    s.apply("frost");
    t("gelo: velocità dimezzata per 3 s", s.speedMultiplier === 0.5 && (run(s, 2900), s.speedMultiplier === 0.5) && (run(s, 200), s.speedMultiplier === 1));
    const resistant = new StatusEffects({ frost: 0.5 });
    resistant.apply("frost");
    t("resistente al gelo: dura la metà", (run(resistant, 1400), resistant.has("frost")) && (run(resistant, 200), !resistant.has("frost")));
    const shock = new StatusEffects();
    const first = shock.apply("shock");
    const second = shock.apply("shock");
    run(shock, 2100);
    const third = shock.apply("shock");
    t("shock: stordisce 0,5 s, poi per 2 s non si stordisce di nuovo", first.stunMs === 500 && second.stunMs === 0 && third.stunMs === 500);
    const both = new StatusEffects();
    both.apply("shock");
    both.apply("fire");
    t("più effetti insieme, nell'ordine degli elementi", both.activeElements.join() === "fire,shock");
  }

  // --- nemici ---
  {
    const goblin = new Enemy(ENEMY_CONFIG.goblin, 100, 184);
    goblin.receiveHit(1, "right", { elements: ["poison"] });
    const afterHit = goblin.currentHealth;
    for (let i = 0; i < 60 * 2.1; i++) goblin.update(frame, collision, ground, 3000);
    const ticks = goblin.drainStatusTicks();
    t("goblin avvelenato (debole): perde salute nel tempo e il motore riceve i numeri", goblin.activeStatusElements.includes("poison") && goblin.currentHealth < afterHit && ticks.length === 2 && ticks.every((x) => x.damage === 5), `${afterHit} -> ${goblin.currentHealth}`);
    const weakGoblin = new Enemy(ENEMY_CONFIG.goblin, 100, 184);
    weakGoblin.receiveHit(weakGoblin.currentHealth - 2, "right", { elements: ["poison"] });
    for (let i = 0; i < 60 * 5; i++) weakGoblin.update(frame, collision, ground, 3000);
    t("il danno nel tempo non uccide mai (resta 1 HP)", weakGoblin.isAlive && weakGoblin.currentHealth === 1);
    const skeleton = new Enemy(ENEMY_CONFIG.skeleton, 100, 176);
    skeleton.receiveHit(1, "right", { elements: ["poison"] });
    t("scheletro: il veleno non attecchisce", skeleton.activeStatusElements.length === 0);
    const dead = new Enemy(ENEMY_CONFIG.goblin, 100, 184);
    dead.receiveHit(999, "right", { elements: ["fire"] });
    dead.update(frame, collision, ground, 3000);
    t("un nemico ucciso dal colpo non tiene effetti", !dead.isAlive && dead.activeStatusElements.length === 0);
  }
  {
    const walk = (elements) => {
      const enemy = new Enemy(ENEMY_CONFIG.soldier, 300, 176);
      for (let i = 0; i < 5; i++) enemy.update(frame, collision, ground, 3000);
      if (elements) enemy.receiveHit(1, "right", { elements });
      for (let i = 0; i < 40; i++) enemy.update(frame, collision, ground, 3000); // finisce lo stordimento del colpo
      const x0 = enemy.positionX;
      for (let i = 0; i < 60; i++) { enemy.setMovement(1, 1); enemy.update(frame, collision, ground, 3000); }
      return enemy.positionX - x0;
    };
    const normal = walk(null);
    const frozen = walk(["frost"]);
    t("gelo: il nemico cammina a metà velocità", normal > 0 && Math.abs(frozen - normal / 2) < normal * 0.15, `${normal.toFixed(1)} / ${frozen.toFixed(1)}`);
  }
  {
    const soldier = new Enemy(ENEMY_CONFIG.soldier, 300, 176);
    for (let i = 0; i < 5; i++) soldier.update(frame, collision, ground, 3000);
    soldier.beginAttack({ x: 330, y: 188 });
    for (let i = 0; i < 30; i++) soldier.update(frame, collision, ground, 3000); // oltre la finestra di interruzione
    soldier.receiveHit(1, "right", {});
    const stillAttacking = soldier.isAttacking;
    soldier.receiveHit(1, "right", { elements: ["shock"] });
    t("shock: interrompe anche un attacco già avviato (che un colpo normale non ferma)", stillAttacking && !soldier.isAttacking);
    soldier.update(frame, collision, ground, 3000);
    t("shock: il soldato (debole al fulmine) resta stordito", soldier.currentState === "hurt");
  }

  // --- boss ---
  {
    const boss = new Boss(BOSS_CONFIG, 400, 160, () => 0.5);
    const before = boss.currentHealth;
    boss.receiveHit(10, "right", { elements: ["shock"] });
    t("boss: lo shock non stordisce ma ferisce subito (Cavaliere Nero debole: 9 in più)", before - boss.currentHealth === 10 + 9, String(before - boss.currentHealth));
    const lord = new Boss(BOSS_CATALOG.shadowLord, 400, 160, () => 0.5);
    lord.receiveHit(1, "right", { elements: ["poison", "frost"] });
    t("il Signore dell'Ombra resiste a tutto, ma non è immune", lord.activeStatusElements.join() === "poison,frost");
    const player = new Player(100, 176);
    for (let i = 0; i < 5; i++) player.update(frame, { isHeld: () => false, wasPressed: () => false, wasReleased: () => false }, collision, ground, 3000);
    const weak = new Boss(BOSS_CONFIG, 400, 160, () => 0.5);
    weak.receiveHit(weak.currentHealth - 2, "right", { elements: ["poison"] });
    for (let i = 0; i < 60 * 6; i++) weak.update(frame, player, collision, ground, 3000, 0);
    t("boss: il danno nel tempo non lo uccide", weak.isAlive && weak.currentHealth >= 1);
  }

  // --- giocatore ---
  {
    const p = new Player(100, 176);
    t("senza power-up i colpi non hanno elementi", p.getAttackElements().length === 0 && p.getHitProperties(WEAPON_CONFIG.sword.attacks.swordLight1).elements === undefined);
    p.applyPowerUp(POWER_UP_CONFIG.fire);
    p.applyPowerUp(POWER_UP_CONFIG.frost);
    t("con Fuoco e Gelo i colpi bruciano e rallentano", p.getAttackElements().join() === "fire,frost");
    const axeHit = p.getHitProperties(WEAPON_CONFIG.axe.attacks.axeChop1);
    t("le proprietà dell'arma restano (ascia: rompe la guardia)", axeHit.breaksGuard === true && axeHit.elements.join() === "fire,frost");
    const input = (pressed = []) => ({ isHeld: () => false, wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
    for (let i = 0; i < 5; i++) p.update(frame, input(), collision, ground, 3000);
    p.update(frame, input(["attack"]), collision, ground, 3000);
    const received = [];
    const target = { isAlive: true, getBounds: () => ({ x: p.positionX + 12, y: p.positionY, width: 20, height: 24 }), receiveHit: (damage, dir, hit) => received.push(hit) };
    for (let i = 0; i < 12 && received.length === 0; i++) { p.update(frame, input(), collision, ground, 3000); new CombatSystem().processPlayerAttack(p, [target]); }
    t("il colpo di spada porta gli elementi al bersaglio", received.length === 1 && received[0].elements.join() === "fire,frost");
    const archer = new Player(100, 176);
    archer.equipWeapon(WEAPON_CONFIG.bow);
    archer.applyPowerUp(POWER_UP_CONFIG.shock);
    for (let i = 0; i < 5; i++) archer.update(frame, input(), collision, ground, 3000);
    archer.update(frame, input(["attack"]), collision, ground, 3000);
    let launches = [];
    for (let i = 0; i < 20; i++) { archer.update(frame, input(), collision, ground, 3000); launches = launches.concat(archer.drainProjectileLaunches()); }
    t("anche le frecce portano gli elementi", launches.length === 1 && launches[0].hit.elements.join() === "shock");
  }
  t("motore: numeri del danno nel tempo dopo l'aggiornamento dei nemici", /this\.updateCombatAndEnemies\(deltaTimeSeconds\);\s*this\.showStaminaAndAbilityEffects\(\);\s*this\.showStatusDamage\(\);/.test(engineSource) && /private showStatusDamage[\s\S]{0,300}drainStatusTicks\(\)/.test(engineSource));
}
