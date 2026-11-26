// Classi Fase 5: quattro mosse per classe (due da imparare), passivi e sinergie elementali
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "../helpers.mjs";

export const description = "Contenuto per classe (Classi Fase 5): mosse, sblocco da forzieri e boss, passivi, sinergie elementali";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { ABILITY_CONFIG, ABILITY_UNLOCK_CONFIG } = await load("config/abilityConfig");
  const { ELEMENT_SYNERGIES } = await load("config/elementConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { ENEMY_CONFIG, BOSS_CONFIG } = await load("config/enemyConfig");
  const { PLAYER_ANIMATIONS } = await load("config/animationConfig");
  const { PALETTE } = await load("config/gameConfig");
  const { Player } = await load("entities/Player");
  const { Enemy } = await load("entities/Enemy");
  const { Boss } = await load("entities/Boss");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { CombatSystem } = await load("combat/CombatSystem");
  const { ProjectileSystem } = await load("systems/ProjectileSystem");
  const { StatusEffects } = await load("combat/StatusEffects");
  const { HUDManager } = await load("ui/HUDManager");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const step = (p, held = [], pressed = [], frames = 1) => { for (let i = 0; i < frames; i++) p.update(frame, input(held, i === 0 ? pressed : []), collision, ground, 3000); };
  const grounded = (id, known = 4) => {
    const p = new Player(300, 176, CHARACTER_CONFIG[id]);
    p.equipWeapon(WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId]);
    p.setKnownAbilityCount(known);
    step(p, [], [], 5);
    return p;
  };
  const dummy = (x, extra = {}) => ({
    isAlive: true,
    hits: [],
    getBounds: () => ({ x, y: 176, width: 12, height: 24 }),
    receiveHit(damage, direction, hit) { this.hits.push({ damage, hit }); },
    ...extra,
  });

  // --- dati ---
  const expectedMoves = {
    knight: "shockwave,lunge,shieldBash,flameBlade",
    ranger: "backstepShot,poisonArrow,frostArrow,fireArrow",
    berserker: "furiousCharge,hotAxe,earthquake,bloodStrike",
    paladin: "shieldGuard,holyHammer,consecration,frozenJudgement",
    mage: "firebolt,frostNova,arcaneLeap,arcaneBarrier",
  };
  t("quattro mosse per classe, nell'ordine dei tasti 7-0", CHARACTER_ORDER.every((id) => CHARACTER_CONFIG[id].abilityIds.join() === expectedMoves[id]));
  t("nessuna mossa è condivisa tra classi", new Set(CHARACTER_ORDER.flatMap((id) => CHARACTER_CONFIG[id].abilityIds)).size === 20);
  t("tutte di grado 1, con nome, descrizione, costo e ricarica", Object.values(ABILITY_CONFIG).every((a) => a.grade === 1 && a.name.length > 0 && a.description.length > 0 && Object.values(a.cost).some((v) => v > 0) && a.cooldownMs > 0));
  t("ogni mossa d'attacco ha un'animazione col nome del suo attacco", Object.values(ABILITY_CONFIG).every((a) => a.kind === "guard" || (a.attack.id === a.attack.animation && PLAYER_ANIMATIONS[a.attack.animation] !== undefined)));
  t("il costo di ogni mossa sta nelle risorse della classe", CHARACTER_ORDER.every((id) => CHARACTER_CONFIG[id].abilityIds.every((abilityId) => { const c = ABILITY_CONFIG[abilityId].cost; const d = CHARACTER_CONFIG[id]; return (c.stamina ?? 0) <= d.maxStamina && (c.mana ?? 0) <= d.maxMana && (c.health ?? 0) < d.maxHealth; })));
  t("ogni classe lascia almeno un effetto elementale con le proprie mosse", CHARACTER_ORDER.every((id) => CHARACTER_CONFIG[id].abilityIds.some((abilityId) => (ABILITY_CONFIG[abilityId].attack?.elements?.length ?? 0) > 0)));

  // --- ogni mossa: costo, ricarica, effetto ---
  for (const characterId of CHARACTER_ORDER) {
    CHARACTER_CONFIG[characterId].abilityIds.forEach((abilityId, slotIndex) => {
      const ability = ABILITY_CONFIG[abilityId];
      const action = `ability${slotIndex + 1}`;
      const p = grounded(characterId);
      const before = { stamina: p.stamina, mana: p.mana, health: p.currentHealth };
      const cost = p.getAbilityCost(ability);
      step(p, ability.kind === "guard" ? [action] : [], [action]);
      t(`${abilityId}: paga il suo costo`,
        Math.abs(before.stamina - p.stamina - (cost.stamina ?? 0)) < 0.5 && Math.abs(before.mana - p.mana - (cost.mana ?? 0)) < 0.5 && before.health - p.currentHealth === (cost.health ?? 0));
      if (ability.kind === "guard") {
        t(`${abilityId}: tenendo il tasto la guardia si alza; lasciandolo parte la ricarica`, p.isGuarding && (step(p), !p.isGuarding && p.abilitySlots[slotIndex].cooldownFraction > 0.9));
        return;
      }
      t(`${abilityId}: parte il suo attacco e la sua ricarica`, p.activeAttack?.id === ability.attack.id && p.abilitySlots[slotIndex].cooldownFraction === 1);
      const attack = ability.attack;
      const startX = p.positionX;
      let hitbox = null;
      const launches = [];
      for (let i = 0; i < Math.ceil(attack.durationMs / (1000 / 60)) + 1; i++) {
        step(p);
        hitbox ??= p.getActiveAttackHitbox();
        launches.push(...p.drainProjectileLaunches());
      }
      if (attack.projectile !== undefined) {
        t(`${abilityId}: lancia un proiettile del giocatore, senza munizioni`,
          launches.length === 1 && launches[0].owner === "player" && attack.projectile.usesAmmo === false && p.currentAmmo === p.maxAmmo);
        t(`${abilityId}: il proiettile porta gli elementi della mossa`, (attack.elements ?? []).every((element) => launches[0]?.hit.elements?.includes(element)));
      } else if (attack.hitbox.width > 0) {
        t(`${abilityId}: ha un'area d'urto attiva e i suoi elementi`, hitbox !== null && (attack.elements ?? []).every((element) => p.getHitProperties(attack).elements.includes(element)));
      }
      if (attack.dash !== undefined) {
        t(`${abilityId}: lo scatto va nel verso giusto`, Math.sign(p.positionX - startX) === Math.sign(attack.dash.speed));
      }
    });
  }

  // --- sblocco ---
  t("si parte con due mosse; il forziere ne insegna una il 25% delle volte", ABILITY_UNLOCK_CONFIG.startingCount === 2 && ABILITY_UNLOCK_CONFIG.chestChance === 0.25);
  for (const characterId of CHARACTER_ORDER) {
    const p = new Player(300, 176, CHARACTER_CONFIG[characterId]);
    t(`${characterId}: a inizio partita sono note le prime due mosse`, p.knownAbilityCount === 2 && p.abilitySlots.map((s) => s.isKnown).join() === "true,true,false,false");
  }
  {
    const p = grounded("knight", 2);
    const stamina = p.stamina;
    step(p, [], ["ability3"]);
    t("il tasto di una mossa non imparata non fa niente e avvisa", p.activeAttack === null && p.stamina === stamina && p.activeAbilitySlotIndex === 0 && p.drainUnknownAbility() && !p.drainUnknownAbility());
    t("uno slot chiuso non è mai pronto", p.abilitySlots[2].isReady === false);
    const third = p.learnNextAbility();
    const fourth = p.learnNextAbility();
    t("le mosse si imparano in ordine: 9 e poi 0", third.slotIndex === 2 && third.ability.id === "shieldBash" && fourth.slotIndex === 3 && fourth.ability.id === "flameBlade");
    t("con tutte imparate non c'è altro da imparare", p.learnNextAbility() === null && p.knownAbilityCount === 4);
    step(p, [], ["ability3"]);
    t("imparata la mossa, il tasto la usa", p.activeAttack?.id === "abilityShieldBash");
    p.selectAbilitySlot(0);
    p.setKnownAbilityCount(0);
    t("mai meno delle mosse di partenza", p.knownAbilityCount === 2);
    p.setKnownAbilityCount(99);
    p.setCharacter(CHARACTER_CONFIG.knight);
    t("nuova partita: si torna a due mosse", p.knownAbilityCount === 2 && p.activeAbilitySlotIndex === 0);
  }
  {
    const p = grounded("knight", 4);
    step(p);
    p.selectAbilitySlot(3);
    p.setKnownAbilityCount(2);
    t("se lo slot attivo si richiude si torna al primo", p.activeAbilitySlotIndex === 0);
    p.learnNextAbility();
    p.revive();
    t("morire non toglie le mosse imparate (le rimette a posto il motore a inizio livello)", p.knownAbilityCount === 3);
  }
  t("motore: le mosse note stanno nello snapshot di inizio livello",
    /this\.levelStartAbilityCount = this\.player\.knownAbilityCount;/.test(engineSource) && /this\.player\.setKnownAbilityCount\(this\.levelStartAbilityCount\);/.test(engineSource));
  t("motore: il boss insegna di sicuro, il forziere con la probabilità di configurazione",
    /this\.bossAbilityMessage = this\.learnNextAbility\(/.test(engineSource) && /this\.lootRandom\(\) < ABILITY_UNLOCK_CONFIG\.chestChance\) \{\s*this\.learnNextAbility\(/.test(engineSource));

  // --- HUD: slot chiuso ---
  {
    const texts = [];
    const renderer = { width: 320, height: 240, fillRect() {}, strokeRect() {}, drawText: (text) => texts.push(text), fillVerticalGradient() {}, fillDithered() {}, fillGlow() {}, fillDitheredOverlay() {} };
    const abilities = [true, true, false, false].map((isKnown) => ({ cooldownFraction: 0, isReady: isKnown, isAffordable: true, isSelected: false, isActive: false, meetsRequirement: true, isKnown }));
    new HUDManager().render(renderer, { drawSprite() {} }, { health: 100, maxHealth: 100, stamina: 100, maxStamina: 100, mana: 0, maxMana: 0, abilities, lives: 3, score: 0, coins: 0, levelNumber: 1, bag: [], powerUps: [], boss: null, unspentAttributePoints: 0 }, 0);
    t("HUD: gli slot non imparati non mostrano il numero del tasto", texts.includes("7") && texts.includes("8") && !texts.includes("9") && !texts.includes("0"));
  }

  // --- costo in salute ---
  {
    const p = grounded("berserker");
    p.currentHealth = ABILITY_CONFIG.bloodStrike.cost.health;
    step(p, [], ["ability4"]);
    t("colpo di sangue: con la salute pari al costo non parte (non ci si uccide) e avvisa", p.activeAttack === null && p.currentHealth === ABILITY_CONFIG.bloodStrike.cost.health && p.drainLowHealth());
  }

  {
    const p = grounded("berserker");
    step(p, [], ["ability4"]);
    t("la salute pagata per una mossa si segnala una volta sola (il motore non la mostra come un colpo)", p.drainPaidHealth() === ABILITY_CONFIG.bloodStrike.cost.health && p.drainPaidHealth() === 0);
  }
  t("motore: niente effetti da colpo subito per la salute pagata, e ogni bersaglio premiato una volta sola",
    /updatePlayerDamageEffects\(healthBeforeUpdate - this\.player\.drainPaidHealth\(\)\)/.test(engineSource) && /if \(this\.rewardedTargets\.has\(target\)\) \{\s*return;/.test(engineSource));

  // --- passivi ---
  t("ogni passivo sta nella sua classe",
    CHARACTER_ORDER.filter((id) => CHARACTER_CONFIG[id].staminaPerWeaponHit !== undefined).join() === "knight" &&
      CHARACTER_ORDER.filter((id) => CHARACTER_CONFIG[id].lowHealthPower !== undefined).join() === "berserker" &&
      CHARACTER_ORDER.filter((id) => CHARACTER_CONFIG[id].manaPerKill !== undefined).join() === "mage" &&
      CHARACTER_CONFIG.paladin.regeneration !== undefined && CHARACTER_CONFIG.ranger.ammoRegeneration !== undefined);
  {
    const combat = new CombatSystem();
    const swingAt = (characterId, target, action = "attack") => {
      const p = grounded(characterId);
      step(p, [], ["dodge"]);
      step(p, [], [], 90);
      p.positionX = 300;
      p.facingDirection = "right";
      step(p, [], ["dodge"]);
      step(p, [], [], 25); // la schivata consuma stamina e non è ancora cominciato il recupero
      p.positionX = 300;
      const before = p.stamina;
      step(p, [], [action]);
      let hits = [];
      for (let i = 0; i < 30 && hits.length === 0; i++) { step(p); hits = combat.processPlayerAttack(p, [target]); }
      return { p, gained: p.stamina - before, hits };
    };
    const knight = swingAt("knight", dummy(314));
    t("Cavaliere: un bersaglio colpito con l'arma ridà stamina", knight.hits.length === 1 && knight.gained >= CHARACTER_CONFIG.knight.staminaPerWeaponHit);
    const chest = swingAt("knight", dummy(314, { isScenery: true }));
    t("Cavaliere: un forziere non ridà stamina", chest.hits.length === 1 && knight.gained - chest.gained === CHARACTER_CONFIG.knight.staminaPerWeaponHit);
  }
  {
    const p = grounded("knight");
    step(p, [], ["ability1"]);
    const stamina = p.stamina;
    p.registerHit(dummy(0));
    t("Cavaliere: le mosse non ridanno stamina", p.stamina === stamina);
  }
  {
    const p = grounded("berserker");
    const full = p.getDamageMultiplier();
    p.currentHealth = Math.ceil(p.maxHealth * 0.4);
    const atThreshold = p.getDamageMultiplier();
    p.currentHealth = Math.floor(p.maxHealth * 0.4) - 1;
    t("Berserker: +25% di danno solo sotto il 40% di salute", atThreshold === full && Math.abs(p.getDamageMultiplier() - full * 1.25) < 1e-9);
    t("Berserker: vale anche per le mosse", Math.abs(p.getDamageMultiplierFor(ABILITY_CONFIG.hotAxe.attack) - full * 1.25) < 1e-9);
  }
  {
    const p = grounded("mage");
    step(p, [], ["ability1"]);
    const mana = p.mana;
    const victim = dummy(314);
    victim.receiveHit = function () { this.isAlive = false; };
    const projectiles = new ProjectileSystem();
    projectiles.spawn({ projectileId: "arcaneFireball", owner: "player", origin: { x: 320, y: 186 }, direction: { x: 1, y: 0 }, damage: 99 });
    projectiles.update(frame, p, ground, 3000, 400, [victim]);
    t("Mago: un nemico sconfitto da un proiettile ridà mana", p.mana === mana + CHARACTER_CONFIG.mage.manaPerKill);
    const knight = grounded("knight");
    knight.registerKill();
    t("il passivo del mana non tocca le altre classi", knight.mana === 0);
  }
  {
    const p = grounded("mage");
    p.manaPool.trySpend(50);
    const mana = p.mana;
    const victim = dummy(314);
    victim.receiveHit = function () { this.isAlive = false; };
    const chest = dummy(314, { isScenery: true });
    chest.receiveHit = function () { this.isAlive = false; };
    step(p, [], ["attack"]);
    let hits = [];
    for (let i = 0; i < 30 && hits.length < 2; i++) { step(p); hits.push(...new CombatSystem().processPlayerAttack(p, [victim, chest])); }
    t("Mago: l'uccisione in mischia conta, il forziere no", p.mana === mana + CHARACTER_CONFIG.mage.manaPerKill + WEAPON_CONFIG.staff.spellFocus.manaPerHit, `${mana} -> ${p.mana}`);
  }

  // --- sinergie ---
  t("quattro sinergie, ognuna con un innesco e +50% di danno", ELEMENT_SYNERGIES.map((s) => `${s.id}:${s.status}:${s.triggerElement ?? "colpo pesante"}`).join() === "shatter:frost:colpo pesante,thermalShock:frost:fire,overload:fire:shock,detonation:poison:fire" && ELEMENT_SYNERGIES.every((s) => s.damageMultiplier === 1.5 && Object.values(PALETTE).includes(s.color)));
  for (const synergy of ELEMENT_SYNERGIES) {
    const trigger = synergy.triggerElement === undefined ? { crushesArmor: true } : { elements: [synergy.triggerElement] };
    const effects = new StatusEffects();
    t(`${synergy.id}: senza l'effetto non scatta`, effects.consumeSynergy(trigger) === null);
    effects.apply(synergy.status);
    t(`${synergy.id}: un colpo semplice non scatta`, effects.consumeSynergy({}) === null && effects.has(synergy.status));
    t(`${synergy.id}: un colpo con l'elemento dell'effetto non scatta`, effects.consumeSynergy({ ...trigger, elements: [synergy.status, ...(trigger.elements ?? [])] }) === null);
    t(`${synergy.id}: scatta e consuma l'effetto`, effects.consumeSynergy(trigger)?.id === synergy.id && !effects.has(synergy.status) && effects.consumeSynergy(trigger) === null);

    const enemy = new Enemy(ENEMY_CONFIG.soldier, 100, 176);
    enemy.receiveHit(1, "right", { elements: [synergy.status] });
    const health = enemy.currentHealth;
    enemy.receiveHit(10, "right", trigger);
    t(`${synergy.id}: sul nemico fa +50% e si segnala una volta sola`, health - enemy.currentHealth === 15 && enemy.lastHitDamage === 15 && enemy.drainSynergy()?.id === synergy.id && enemy.drainSynergy() === null);
  }
  {
    const effects = new StatusEffects();
    effects.apply("frost");
    t("Frantumare vale anche per i colpi che rompono la guardia", effects.consumeSynergy({ breaksGuard: true })?.id === "shatter");
    effects.apply("frost");
    effects.apply("fire");
    t("un colpo innesca una sola sinergia (la prima dell'elenco)", effects.consumeSynergy({ breaksGuard: true, elements: ["shock"] })?.id === "shatter" && effects.has("fire"));
    const immune = new StatusEffects({ shock: 0 });
    immune.apply("fire");
    t("chi è immune all'elemento d'innesco non subisce la sinergia", immune.consumeSynergy({ elements: ["shock"] }) === null && immune.has("fire"));
  }
  {
    const boss = new Boss(BOSS_CONFIG, 100, 150, () => 0.5);
    boss.receiveHit(1, "right", { elements: ["frost"] });
    const health = boss.currentHealth;
    boss.receiveHit(20, "right", { breaksGuard: true });
    t("sinergie anche sui boss", health - boss.currentHealth === 30 && boss.drainSynergy()?.id === "shatter");
  }
  t("ogni classe può innescare almeno una sinergia con le sole mosse", CHARACTER_ORDER.every((id) => {
    const attacks = CHARACTER_CONFIG[id].abilityIds.map((abilityId) => ABILITY_CONFIG[abilityId].attack).filter((a) => a !== undefined);
    const weapon = Object.values(WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId].attacks);
    return ELEMENT_SYNERGIES.some((s) => attacks.some((a) => a.elements?.includes(s.status)) && [...attacks, ...weapon].some((a) => !a.elements?.includes(s.status) && (a.elements?.includes(s.triggerElement) || (s.triggersOnHeavyImpact && (a.breaksGuard || a.crushesArmor)))));
  }));
  t("motore: il nome della sinergia compare sul bersaglio", /sufferer\.drainSynergy\(\)/.test(engineSource));
}
