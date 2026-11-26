// Classi Fase 6A: grafica delle mosse (pose, effetti, icone, proiettili, barriere) e Mago con la veste lunga
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FakeSpriteManager, projectRoot } from "../helpers.mjs";

export const description = "Grafica delle mosse (Classi Fase 6A): effetti come dati, icone dell'HUD, lama tinta, barriere, proiettili, veste del Mago";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { ABILITY_CONFIG } = await load("config/abilityConfig");
  const { ABILITY_VISUAL_CONFIG, ABILITY_EFFECT_CONFIG } = await load("config/abilityVisualConfig");
  const { PROJECTILE_CONFIG } = await load("config/projectileConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { PLAYER_CONFIG } = await load("config/playerConfig");
  const { PALETTE } = await load("config/gameConfig");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { EffectsManager } = await load("rendering/EffectsManager");
  const { AFTERIMAGE_CONFIG } = await load("config/abilityVisualConfig");
  const { HUDManager, ABILITY_BOX_GEOMETRY, ABILITY_KEY_LABEL_Y } = await load("ui/HUDManager");
  const abilitySprites = await load("rendering/sprites/abilitySprites");
  const knightSprites = await load("rendering/sprites/knightSprites");
  const projectileSprites = await load("rendering/sprites/projectileSprites");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const sprites = new FakeSpriteManager();
  abilitySprites.registerAbilitySprites(sprites);
  projectileSprites.registerProjectileSprites(sprites);
  const paletteColors = new Set(Object.values(PALETTE));
  const usesOnlyPalette = (spriteId) => {
    const sprite = sprites.sprites.get(spriteId);
    return [...new Set(sprite.rows.join("").replaceAll(".", ""))].every((key) => paletteColors.has(sprite.colors[key]));
  };

  // --- dati: ogni mossa ha la sua grafica ---
  const abilityIds = Object.keys(ABILITY_CONFIG);
  t("ogni mossa ha una voce in ABILITY_VISUAL_CONFIG (e nessuna voce in più)", abilityIds.length === Object.keys(ABILITY_VISUAL_CONFIG).length && abilityIds.every((id) => ABILITY_VISUAL_CONFIG[id] !== undefined));
  const iconIds = abilityIds.map((id) => ABILITY_VISUAL_CONFIG[id].iconSpriteId);
  t("ogni mossa ha un'icona 8x8 registrata, diversa dalle altre, con i colori della palette",
    new Set(iconIds).size === iconIds.length && iconIds.every((id) => sprites.has(id) && sprites.getSpriteSize(id).width === 8 && sprites.getSpriteSize(id).height === 8 && usesOnlyPalette(id)),
    iconIds.filter((id) => !sprites.has(id)).join(", "));
  const effectFrames = Object.values(ABILITY_EFFECT_CONFIG).flatMap((effect) => effect.frameIds);
  t("ogni frame degli effetti è uno sprite registrato con i colori della palette", effectFrames.every((id) => sprites.has(id) && usesOnlyPalette(id)), effectFrames.filter((id) => !sprites.has(id)).join(", "));
  t("gli effetti hanno almeno due frame e una durata positiva", Object.values(ABILITY_EFFECT_CONFIG).every((effect) => effect.frameIds.length >= 2 && effect.frameDurationMs > 0));
  const badCues = [];
  for (const id of abilityIds) {
    const ability = ABILITY_CONFIG[id];
    const visual = ABILITY_VISUAL_CONFIG[id];
    if (ability.kind === "guard") {
      if (visual.cues.length > 0 || visual.guardFrameIds === undefined || !visual.guardFrameIds.every((frameId) => sprites.has(frameId))) badCues.push(`${id}: guardia senza barriera`);
      continue;
    }
    if (visual.guardFrameIds !== undefined) badCues.push(`${id}: barriera su un attacco`);
    let previousMs = 0;
    for (const cue of visual.cues) {
      if (cue.atMs < 0 || cue.atMs >= ability.attack.durationMs) badCues.push(`${id}: effetto a ${cue.atMs} ms fuori dalla mossa`);
      if (cue.atMs < previousMs) badCues.push(`${id}: effetti non in ordine`);
      if (cue.kind === "sprite" && ABILITY_EFFECT_CONFIG[cue.effectId] === undefined) badCues.push(`${id}: effetto ${cue.effectId} sconosciuto`);
      if (cue.kind === "afterimage" && !paletteColors.has(cue.color)) badCues.push(`${id}: sagoma fuori palette`);
      previousMs = cue.atMs;
    }
  }
  t("effetti dentro la durata della mossa e in ordine; le guardie hanno solo la barriera", badCues.length === 0, badCues.slice(0, 3).join("; "));
  t("ogni attacco con un elemento ha un effetto o la lama tinta (si vede di che elemento è)",
    abilityIds.filter((id) => ABILITY_CONFIG[id].kind === "attack" && (ABILITY_CONFIG[id].attack.elements ?? []).length > 0)
      .every((id) => ABILITY_VISUAL_CONFIG[id].weaponTint !== undefined || ABILITY_VISUAL_CONFIG[id].cues.some((cue) => cue.kind === "sprite") || ABILITY_CONFIG[id].attack.projectile !== undefined));
  t("le tinte della lama usano colori della palette e le chiavi di lama e scie",
    Object.values(abilitySprites.WEAPON_TINT_COLORS).every((colors) => Object.keys(colors).sort().join("") === "abcv" && Object.values(colors).every((color) => paletteColors.has(color))));

  // --- proiettili dedicati ---
  const arrow = PROJECTILE_CONFIG.playerArrow;
  t("le frecce elementali hanno sprite propri e gli stessi valori della freccia del giocatore", ["fireArrow", "frostArrow", "poisonArrow"].every((id) => {
    const projectile = PROJECTILE_CONFIG[id];
    return projectile.speed === arrow.speed && projectile.gravityScale === arrow.gravityScale && projectile.lifetimeMs === arrow.lifetimeMs && projectile.hitbox.width === arrow.hitbox.width && projectile.hitbox.height === arrow.hitbox.height && projectile.frameIds.every((frameId) => sprites.has(frameId) && usesOnlyPalette(frameId));
  }));
  t("le frecce del Ranger usano la freccia del loro elemento", ABILITY_CONFIG.fireArrow.attack.projectile.projectileId === "fireArrow" && ABILITY_CONFIG.frostArrow.attack.projectile.projectileId === "frostArrow" && ABILITY_CONFIG.poisonArrow.attack.projectile.projectileId === "poisonArrow");
  t("il dardo di fuoco ha la sua cometa a tre frame", PROJECTILE_CONFIG.arcaneFireball.frameIds.length === 3 && PROJECTILE_CONFIG.arcaneFireball.frameIds.every((frameId) => frameId.startsWith("projectileFirebolt") && sprites.has(frameId)));

  // --- pose nuove e veste del Mago ---
  const knightFrames = new FakeSpriteManager();
  for (const characterId of CHARACTER_ORDER) knightSprites.registerKnightSprites(knightFrames, characterId);
  const newPoses = ["knightAbilityCast", "knightAbilityDraw", "knightAbilityWindup", "knightAbilityBash", "knightAbilityKneel"];
  const missingPoses = [];
  for (const characterId of CHARACTER_ORDER) for (const weapon of Object.values(WEAPON_CONFIG)) for (const pose of newPoses) {
    const id = `${pose}${weapon.spriteSuffix}${CHARACTER_CONFIG[characterId].spriteSuffix}`;
    if (!knightFrames.has(id)) missingPoses.push(id);
  }
  t("le cinque pose nuove esistono per ogni arma e ogni classe", missingPoses.length === 0, missingPoses.slice(0, 3).join(", "));
  const mageSuffix = CHARACTER_CONFIG.mage.spriteSuffix;
  const mageFrames = [...knightFrames.sprites].filter(([id]) => id.endsWith(mageSuffix) && id.startsWith("knight"));
  t("i frame del Mago restano alti 30, con l'ancora del cavaliere e l'hitbox dentro",
    mageFrames.length > 0 && mageFrames.every(([, sprite]) => sprite.height === 30 && sprite.anchorX === knightSprites.KNIGHT_ANCHOR_X && sprite.anchorX + PLAYER_CONFIG.hitboxWidth <= sprite.width));
  const mageIdle = knightFrames.sprites.get(`knightIdle1${mageSuffix}`);
  const knightIdle = knightFrames.sprites.get("knightIdle1");
  const lastRow = (sprite) => sprite.rows[sprite.rows.length - 1];
  t("il Mago porta la veste lunga (chiavi proprie della veste) e poggia a terra con le scarpe",
    mageIdle.rows.slice(23).join("").includes("P") && !knightIdle.rows.join("").includes("P") && /[67]/.test(lastRow(mageIdle)));
  t("passo, salto e caduta del Mago sono diversi dalla posa ferma (la veste si muove)",
    ["knightWalk1", "knightJump", "knightFall"].every((frame) => knightFrames.sprites.get(`${frame}${mageSuffix}`).rows.join("") !== mageIdle.rows.join("")));
  t("barba sul petto del Mago e cappello con la fascia", mageIdle.rows.slice(12, 15).join("").includes("x") && mageIdle.rows.slice(0, 12).join("").includes("r"));

  // --- in gioco: effetti dovuti, lama tinta, barriera ---
  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const step = (p, held = [], pressed = []) => p.update(frame, input(held, pressed), collision, ground, 3000);
  const grounded = (id) => {
    const p = new Player(300, 176, CHARACTER_CONFIG[id]);
    p.equipWeapon(WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId]);
    p.setKnownAbilityCount(4);
    for (let i = 0; i < 5; i++) step(p);
    return p;
  };
  const cueMismatches = [];
  for (const characterId of CHARACTER_ORDER) {
    CHARACTER_CONFIG[characterId].abilityIds.forEach((abilityId, slotIndex) => {
      const ability = ABILITY_CONFIG[abilityId];
      if (ability.kind !== "attack") return;
      const p = grounded(characterId);
      p.drainAbilityEffects();
      step(p, [], [`ability${slotIndex + 1}`]);
      const seen = [...p.drainAbilityEffects()];
      for (let i = 0; i < Math.ceil(ability.attack.durationMs / (1000 / 60)) + 2; i++) {
        step(p);
        seen.push(...p.drainAbilityEffects());
      }
      const expected = ABILITY_VISUAL_CONFIG[abilityId].cues;
      if (JSON.stringify(seen) !== JSON.stringify(expected)) cueMismatches.push(`${abilityId}: ${seen.length}/${expected.length}`);
    });
  }
  t("durante ogni mossa il giocatore segnala ogni effetto una volta sola, in ordine", cueMismatches.length === 0, cueMismatches.slice(0, 3).join("; "));

  const renderer = { width: 320, height: 240, fillRect() {}, strokeRect() {}, drawText() {}, fillGlow() {}, fillDitheredOverlay() {}, fillVerticalGradient() {}, drawImage() {} };
  const recordingSprites = () => {
    const calls = { aligned: [], sprites: [], silhouettes: [] };
    return {
      calls,
      drawSpriteAligned: (r, spriteId, x, bottom, width, flipped, flash, variant) => calls.aligned.push({ spriteId, variant, flash }),
      drawSprite: (r, spriteId, x, y, flipped) => calls.sprites.push({ spriteId, x, y, flipped }),
      drawSpriteSilhouette: (r, spriteId, x, y, flipped, color) => calls.silhouettes.push({ spriteId, color }),
      getSpriteSize: (spriteId) => sprites.getSpriteSize(spriteId),
    };
  };
  {
    const knight = grounded("knight");
    step(knight, [], ["ability4"]); // lama ardente
    for (let i = 0; i < 4; i++) step(knight);
    const recorder = recordingSprites();
    knight.render(renderer, recorder, 0, 0);
    const variant = recorder.calls.aligned[0]?.variant;
    t("lama ardente: durante la mossa lama e scie prendono i colori del fuoco", variant?.colors.b === abilitySprites.WEAPON_TINT_COLORS.fire.b && variant?.colors.c === abilitySprites.WEAPON_TINT_COLORS.fire.c);
    for (let i = 0; i < 60; i++) step(knight);
    const after = recordingSprites();
    knight.render(renderer, after, 0, 0);
    t("finita la mossa la lama torna normale", after.calls.aligned[0]?.variant === null);
  }
  {
    // cambiare slot durante la mossa non ne interrompe effetti e lama tinta
    const knight = grounded("knight");
    knight.drainAbilityEffects();
    step(knight, [], ["ability4"]); // lama ardente
    step(knight, [], ["ability1"]); // si sceglie un altro slot mentre la mossa è in corso
    const seen = [...knight.drainAbilityEffects()];
    const recorder = recordingSprites();
    knight.render(renderer, recorder, 0, 0);
    for (let i = 0; i < 40; i++) { step(knight); seen.push(...knight.drainAbilityEffects()); }
    t("cambiando slot a metà mossa la lama resta tinta e tutti gli effetti arrivano",
      recorder.calls.aligned[0]?.variant?.colors.b === abilitySprites.WEAPON_TINT_COLORS.fire.b && JSON.stringify(seen) === JSON.stringify(ABILITY_VISUAL_CONFIG.flameBlade.cues));
  }
  {
    const mage = grounded("mage");
    step(mage, ["ability4"], ["ability4"]); // barriera
    const recorder = recordingSprites();
    mage.render(renderer, recorder, 0, 0);
    t("barriera alzata: nella finestra della parata perfetta la barriera è una sagoma bianca", recorder.calls.silhouettes.some((call) => call.spriteId.startsWith("effectBarrierArcane") && call.color === PALETTE.white));
    for (let i = 0; i < 30; i++) step(mage, ["ability4"]);
    const later = recordingSprites();
    mage.render(renderer, later, 0, 0);
    t("barriera alzata: poi si vede la barriera arcana davanti al Mago", later.calls.sprites.some((call) => call.spriteId.startsWith("effectBarrierArcane") && call.x > mage.positionX + mage.width - 1));
  }

  // --- EffectsManager: sprite d'effetto e sagome ---
  {
    const effects = new EffectsManager(() => 0.5);
    const ring = ABILITY_EFFECT_CONFIG.frostRing;
    effects.spawnSpriteEffect(ring, 100, 200, false);
    const recorder = recordingSprites();
    effects.renderSpriteEffects(renderer, recorder, 0, 0);
    const first = recorder.calls.sprites[0];
    const size = sprites.getSpriteSize(ring.frameIds[0]);
    t("un anello a terra poggia sul punto come un personaggio sul fondo dell'hitbox (ultima riga subito sopra) ed è centrato", first?.spriteId === ring.frameIds[0] && first.y === 200 - size.height && first.x === 100 - Math.floor(size.width / 2));
    effects.update((ring.frameDurationMs * 1.5) / 1000);
    const second = recordingSprites();
    effects.renderSpriteEffects(renderer, second, 0, 0);
    t("l'effetto passa al frame successivo col tempo", second.calls.sprites[0]?.spriteId === ring.frameIds[1]);
    effects.update((ring.frameDurationMs * ring.frameIds.length) / 1000);
    t("finiti i frame l'effetto sparisce", effects.spriteEffectCount === 0);
    effects.spawnAfterimage("knightDodge1", 100, 200, 12, true, PALETTE.lilac);
    const ghost = recordingSprites();
    effects.renderAfterimages(renderer, ghost, 0, 0);
    t("la sagoma si disegna a tinta unita nel suo colore", ghost.calls.aligned[0]?.flash === PALETTE.lilac);
    effects.update(AFTERIMAGE_CONFIG.durationMs / 1000 + 0.01);
    t("la sagoma sparisce dopo la sua durata; clear svuota tutto", effects.afterimageCount === 0 && (effects.spawnSpriteEffect(ring, 0, 0, false), effects.clear(), effects.spriteEffectCount === 0));
  }

  // --- HUD: icone e numeri dei tasti ---
  {
    const texts = [];
    const recorder = recordingSprites();
    const hudRenderer = { ...renderer, drawText: (text, x, y, color) => texts.push({ text, x, y, color }) };
    const slot = (iconSpriteId, extra = {}) => ({ cooldownFraction: 0, isReady: true, isAffordable: true, isSelected: false, isActive: false, meetsRequirement: true, isKnown: true, iconSpriteId, ...extra });
    const abilities = [slot("abilityIconFirebolt"), slot("abilityIconFrostNova", { meetsRequirement: false }), slot("abilityIconArcaneLeap", { isAffordable: false, isReady: false }), slot("abilityIconArcaneBarrier", { isKnown: false })];
    new HUDManager().render(hudRenderer, recorder, { health: 70, maxHealth: 70, stamina: 50, maxStamina: 100, mana: 50, maxMana: 100, abilities, lives: 3, score: 0, coins: 0, levelNumber: 1, bag: [], powerUps: [], boss: null, unspentAttributePoints: 0 }, 0);
    const box = ABILITY_BOX_GEOMETRY;
    t("HUD: l'icona di ogni mossa sta dentro il suo riquadro", recorder.calls.sprites.some((call) => call.spriteId === "abilityIconFirebolt" && call.x === box.x + 1 && call.y === box.y + 1));
    t("HUD: senza requisito l'icona è una sagoma grigia", recorder.calls.silhouettes.some((call) => call.spriteId === "abilityIconFrostNova" && call.color === PALETTE.gray));
    t("HUD: una mossa non imparata mostra il lucchetto, non l'icona", !recorder.calls.sprites.some((call) => call.spriteId === "abilityIconArcaneBarrier"));
    const label = (text) => texts.find((entry) => entry.text === text && entry.y === ABILITY_KEY_LABEL_Y);
    t("HUD: il numero del tasto sta sopra il riquadro, rosso se la risorsa non basta",
      label("7") !== undefined && label("7").x > box.x && label("7").x < box.x + box.size && label("9")?.color === PALETTE.red && ABILITY_KEY_LABEL_Y + 7 < box.y);
  }

  // --- motore ---
  t("motore: registra gli sprite delle mosse e passa gli effetti del giocatore a EffectsManager",
    /registerAbilitySprites\(this\.spriteManager\)/.test(engineSource) && /drainAbilityEffects\(\)[\s\S]{0,700}spawnAfterimage[\s\S]{0,400}spawnSpriteEffect/.test(engineSource));
  t("motore: le sagome si disegnano prima del giocatore, gli effetti dopo i proiettili",
    /renderAfterimages[\s\S]{0,200}this\.player\.render[\s\S]{0,200}projectileSystem\.render[\s\S]{0,200}renderSpriteEffects/.test(engineSource));
}
