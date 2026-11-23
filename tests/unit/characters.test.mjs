// Fase 4: personaggi con classi (cavaliere, ranger, berserker, paladino)
// Ogni t(descrizione, condizione, dettaglio) è un controllo: se la condizione è falsa il test fallisce.
import { FakeSpriteManager } from "../helpers.mjs";

export const description = "Personaggi (Fase 4): statistiche, arma iniziale, schivata, cura lenta, sprite, scelta e salvataggio";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER, DEFAULT_CHARACTER_ID, isCharacterId } = await load("config/characterConfig");
  const { PLAYER_CONFIG } = await load("config/playerConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { PALETTE } = await load("config/gameConfig");
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const { CONTROLS_CONFIG, INPUT_CONTEXT_ACTIONS } = await load("config/controlsConfig");
  const { POWER_UP_CONFIG } = await load("config/powerUpConfig");
  const { PLAYER_ANIMATIONS } = await load("config/animationConfig");
  const { Player } = await load("entities/Player");
  const { CollisionSystem } = await load("systems/CollisionSystem");
  const { ProgressManager } = await load("systems/ProgressManager");
  const { GameState } = await load("core/GameState");
  const { ScreenManager, getCharacterRatings } = await load("ui/ScreenManager");
  const { registerKnightSprites, registerCharacterPreviews, getCharacterPreviewFrameId, KNIGHT_CROUCH_SUFFIX, KNIGHT_FIRE_SUFFIX } = await load("rendering/sprites/knightSprites");

  const frame = 1 / 60;
  const collision = new CollisionSystem();
  const ground = [{ x: 0, y: 200, width: 3000, height: 40 }];
  const input = (held = [], pressed = []) => ({ isHeld: (a) => held.includes(a), wasPressed: (a) => pressed.includes(a), wasReleased: () => false });
  const grounded = (id, x = 100) => {
    const player = new Player(x, 176, CHARACTER_CONFIG[id]);
    player.equipWeapon(WEAPON_CONFIG[CHARACTER_CONFIG[id].startingWeaponId]);
    for (let i = 0; i < 5; i++) player.update(frame, input(), collision, ground, 3000);
    return player;
  };
  const { knight, ranger, berserker, paladin } = CHARACTER_CONFIG;

  // --- configurazione ---
  t("quattro personaggi, nello stesso ordine della schermata di scelta", CHARACTER_ORDER.length === 4 && CHARACTER_ORDER.every((id) => CHARACTER_CONFIG[id]?.id === id) && Object.keys(CHARACTER_CONFIG).length === 4);
  t("il personaggio predefinito è il cavaliere", DEFAULT_CHARACTER_ID === "knight" && isCharacterId("ranger") && !isCharacterId("mago") && !isCharacterId("toString"));
  t("il cavaliere legge salute, velocità e schivata da PLAYER_CONFIG (e usa la spada)", knight.maxHealth === PLAYER_CONFIG.maxHealth && knight.movementSpeed === PLAYER_CONFIG.movementSpeed && knight.dodgeCooldownMs === PLAYER_CONFIG.dodgeCooldownMs && knight.dodgeSpeed === PLAYER_CONFIG.dodgeSpeed && knight.startingWeaponId === "sword" && knight.spriteSuffix === "");
  t("ogni personaggio ha un'arma iniziale esistente, valori positivi e un suffisso degli sprite unico", CHARACTER_ORDER.every((id) => { const c = CHARACTER_CONFIG[id]; return WEAPON_CONFIG[c.startingWeaponId] !== undefined && c.maxHealth > 0 && c.movementSpeed > 0 && c.damageMultiplier > 0 && c.damageTakenMultiplier > 0 && c.dodgeDurationMs > 0 && c.name.length > 0 && c.description.length > 0 && c.trait.length > 0; }) && new Set(CHARACTER_ORDER.map((id) => CHARACTER_CONFIG[id].spriteSuffix)).size === 4);
  t("ranger: più veloce, meno salute, arco come arma base", ranger.movementSpeed > knight.movementSpeed && ranger.maxHealth < knight.maxHealth && ranger.startingWeaponId === "bow");
  t("berserker: più danno, più salute, nessuna schivata economica (attesa molto più lunga)", berserker.damageMultiplier > 1 && berserker.maxHealth > knight.maxHealth && berserker.dodgeCooldownMs >= 2 * knight.dodgeCooldownMs);
  t("paladino: lo scudo riduce il danno e si cura piano", paladin.damageTakenMultiplier < 1 && paladin.regeneration !== undefined && paladin.regeneration.healthPerSecond > 0 && paladin.regeneration.delayAfterHitMs > 0);
  t("solo il paladino ha la cura lenta", CHARACTER_ORDER.filter((id) => CHARACTER_CONFIG[id].regeneration !== undefined).join() === "paladin");

  // --- Player ---
  {
    const p = new Player(0, 0, ranger);
    t("un personaggio parte con la propria salute piena", p.maxHealth === 75 && p.currentHealth === 75 && p.characterDefinition === ranger);
    const q = new Player(0, 0);
    t("senza personaggio si gioca con il cavaliere", q.characterDefinition.id === "knight" && q.maxHealth === PLAYER_CONFIG.maxHealth);
    q.takeDamage(30, 0);
    q.setCharacter(berserker);
    t("cambiando personaggio la salute torna al massimo della nuova classe", q.maxHealth === berserker.maxHealth && q.currentHealth === berserker.maxHealth);
    q.revive();
    t("dopo la morte si torna alla salute massima del personaggio", q.currentHealth === berserker.maxHealth);
  }
  // velocità: in 1 s il personaggio percorre la propria velocità per il moltiplicatore dell'arma
  const walked = (id, weaponId) => {
    const p = grounded(id);
    p.equipWeapon(WEAPON_CONFIG[weaponId]);
    const x0 = p.positionX;
    for (let i = 0; i < 60; i++) p.update(frame, input(["moveRight"]), collision, ground, 3000);
    return p.positionX - x0;
  };
  t("velocità: ranger 96 px/s con la spada, cavaliere 80, paladino 72", Math.abs(walked("ranger", "sword") - 96) < 1 && Math.abs(walked("knight", "sword") - 80) < 1 && Math.abs(walked("paladin", "sword") - 72) < 1, ["ranger", "knight", "paladin"].map((id) => walked(id, "sword").toFixed(1)).join(" "));
  t("velocità: anche il moltiplicatore dell'arma vale (ranger con l'arco)", Math.abs(walked("ranger", "bow") - 96 * WEAPON_CONFIG.bow.movementSpeedMultiplier) < 1);

  // danno inflitto e subito
  {
    const b = grounded("berserker");
    t("berserker: moltiplicatore del danno 1,3", Math.abs(b.getDamageMultiplier() - 1.3) < 1e-9);
    b.applyPowerUp(POWER_UP_CONFIG.berserk);
    t("berserker: il power-up Furia (x1,5) si moltiplica con il suo bonus (x1,3)", Math.abs(b.getDamageMultiplier() - 1.3 * 1.5) < 1e-9, String(b.getDamageMultiplier()));
    t("cavaliere e ranger: danno normale", grounded("knight").getDamageMultiplier() === 1 && grounded("ranger").getDamageMultiplier() === 1);
    const pal = grounded("paladin");
    pal.takeDamage(20, 0);
    const kn = grounded("knight");
    kn.takeDamage(20, 0);
    t("paladino: un colpo da 20 toglie 15 HP (cavaliere 20)", pal.maxHealth - pal.currentHealth === 15 && kn.maxHealth - kn.currentHealth === 20, `${pal.maxHealth - pal.currentHealth} ${kn.maxHealth - kn.currentHealth}`);
    const shielded = grounded("paladin");
    shielded.applyPowerUp(POWER_UP_CONFIG.shield);
    shielded.takeDamage(20, 0);
    t("paladino con il power-up Scudo: le due riduzioni si moltiplicano (20 x 0,5 x 0,75 = 7,5 -> 8)", shielded.maxHealth - shielded.currentHealth === 8, String(shielded.maxHealth - shielded.currentHealth));
    const pal2 = grounded("paladin");
    pal2.takeDamage(1, 0);
    t("paladino: un colpo toglie comunque almeno 1 HP", pal2.currentHealth === pal2.maxHealth - 1);
  }

  // cura lenta del paladino: niente per 4 s dopo un colpo, poi 1 HP al secondo
  {
    const pal = grounded("paladin");
    pal.takeDamage(40, 0);
    const afterHit = pal.currentHealth;
    for (let i = 0; i < 60 * 3.9; i++) pal.update(frame, input(), collision, ground, 3000);
    const beforeDelay = pal.currentHealth;
    for (let i = 0; i < 60 * 5; i++) pal.update(frame, input(), collision, ground, 3000);
    t("paladino: nessuna cura nei 4 s dopo un colpo", beforeDelay === afterHit, `${afterHit} -> ${beforeDelay}`);
    t("paladino: poi si cura di circa 1 HP al secondo", pal.currentHealth - beforeDelay >= 4 && pal.currentHealth - beforeDelay <= 6, `${beforeDelay} -> ${pal.currentHealth}`);
    pal.takeEnvironmentalDamage(5);
    const afterFall = pal.currentHealth;
    for (let i = 0; i < 60 * 3; i++) pal.update(frame, input(), collision, ground, 3000);
    t("paladino: anche il danno ambientale ferma la cura", pal.currentHealth === afterFall);
    for (let i = 0; i < 60 * 120; i++) pal.update(frame, input(), collision, ground, 3000);
    t("paladino: la cura non supera la salute massima", pal.currentHealth === pal.maxHealth);
    const kn = grounded("knight");
    kn.takeDamage(40, 0);
    const knightHealth = kn.currentHealth;
    for (let i = 0; i < 60 * 10; i++) kn.update(frame, input(), collision, ground, 3000);
    t("cavaliere: nessuna cura lenta", kn.currentHealth === knightHealth);
  }

  // schivata: durata, velocità e attesa del personaggio
  const dodge = (id) => {
    const p = grounded(id);
    const x0 = p.positionX;
    p.update(frame, input([], ["dodge"]), collision, ground, 3000);
    let frames = 0;
    while (p.isDodging && frames < 200) { p.update(frame, input(), collision, ground, 3000); frames++; }
    const distance = p.positionX - x0;
    let waited = 0;
    for (; waited < 300; waited++) {
      p.update(frame, input([], ["dodge"]), collision, ground, 3000);
      if (p.isDodging) break;
    }
    return { distance, waitedMs: (waited * 1000) / 60 };
  };
  const dodges = Object.fromEntries(CHARACTER_ORDER.map((id) => [id, dodge(id)]));
  t("schivata: il ranger va più lontano del cavaliere, il berserker meno", dodges.ranger.distance > dodges.knight.distance && dodges.berserker.distance < dodges.knight.distance, Object.entries(dodges).map(([k, v]) => `${k}:${v.distance.toFixed(0)}`).join(" "));
  t("schivata: l'attesa per la successiva segue il personaggio (±1 frame)", CHARACTER_ORDER.every((id) => Math.abs(dodges[id].waitedMs - CHARACTER_CONFIG[id].dodgeCooldownMs) <= 17), Object.entries(dodges).map(([k, v]) => `${k}:${v.waitedMs.toFixed(0)}`).join(" "));

  // percorribilità: ogni personaggio, anche con l'arma più lenta, arriva in fondo a ogni livello
  const slowestWeapon = Object.values(WEAPON_CONFIG).reduce((a, b) => (b.movementSpeedMultiplier < a.movementSpeedMultiplier ? b : a));
  const blocked = [];
  for (const id of CHARACTER_ORDER) {
    for (const level of LEVEL_CONFIG) {
      const goal = level.completion.kind === "reachExit" ? level.completion.exitX : level.bossArenaStartX + 40;
      const player = new Player(level.playerStart.x, level.playerStart.y, CHARACTER_CONFIG[id]);
      player.equipWeapon(slowestWeapon);
      const isGroundAt = (x) => level.platforms.some((p) => !p.oneWay && x >= p.x && x <= p.x + p.width && p.y >= player.positionY + 20);
      let reached = false;
      for (let i = 0; i < 60 * 150 && !reached; i++) {
        const aheadX = player.positionX + player.width + 10;
        const wall = level.platforms.some((p) => !p.oneWay && aheadX >= p.x && aheadX <= p.x + p.width && p.y < player.positionY + 20 && p.y + p.height > player.positionY + 2);
        const edge = player.isOnGround && !isGroundAt(player.positionX + player.width + 6);
        player.update(frame, input(["moveRight"], player.isOnGround && (wall || edge) ? ["jump"] : []), collision, level.platforms, level.width);
        if (player.positionY > 300) break;
        if (player.positionX + player.width / 2 >= goal) reached = true;
      }
      if (!reached) blocked.push(`${id}@${level.id}`);
    }
  }
  t(`ogni personaggio, anche con l'arma più lenta (${slowestWeapon.name}), supera abissi e salite di ogni livello`, blocked.length === 0, blocked.join(" "));

  // --- sprite ---
  const paletteValues = new Set(Object.values(PALETTE));
  const animationFrames = [...new Set(Object.values(PLAYER_ANIMATIONS).flatMap((a) => a.frameIds))];
  for (const id of CHARACTER_ORDER) {
    const sm = new FakeSpriteManager();
    registerKnightSprites(sm, id);
    const suffix = CHARACTER_CONFIG[id].spriteSuffix;
    const knightSm = new FakeSpriteManager();
    registerKnightSprites(knightSm);
    // ogni frame di ogni arma esiste (anche col fuoco), con le stesse dimensioni e ancora del cavaliere
    const missing = [];
    for (const weapon of Object.values(WEAPON_CONFIG)) {
      for (const frameId of animationFrames) {
        const base = `${frameId}${weapon.spriteSuffix}`;
        if (!knightSm.sprites.has(base)) continue; // frame non usati da quest'arma
        const sprite = sm.sprites.get(`${base}${suffix}`);
        const knightSprite = knightSm.sprites.get(base);
        if (sprite === undefined || !sm.sprites.has(`${base}${suffix}${KNIGHT_FIRE_SUFFIX}`) || sprite.width !== knightSprite.width || sprite.height !== knightSprite.height || sprite.anchorX !== knightSprite.anchorX) missing.push(base);
      }
    }
    t(`${id}: ogni frame di ogni arma è registrato (normale e fuoco) con le misure e l'ancora del cavaliere`, missing.length === 0, missing.slice(0, 4).join(","));
    const offPalette = [...sm.sprites.values()].flatMap((s) => Object.values(s.colors ?? {})).filter((c) => !paletteValues.has(c));
    t(`${id}: solo colori della palette`, offPalette.length === 0, offPalette.slice(0, 3).join(","));
    // il frame che il giocatore disegna esiste, anche accovacciato in attacco
    const p = grounded(id);
    const shown = [p.getRenderedFrameId()];
    for (let i = 0; i < 3; i++) p.update(frame, input(["crouch"]), collision, ground, 3000);
    p.update(frame, input(["crouch"], ["attack"]), collision, ground, 3000);
    p.update(frame, input(["crouch"]), collision, ground, 3000);
    shown.push(p.getRenderedFrameId());
    t(`${id}: i frame disegnati dal giocatore sono registrati`, shown.every((frameId) => sm.sprites.has(frameId) && sm.sprites.has(frameId + KNIGHT_FIRE_SUFFIX)) && shown.every((frameId) => frameId.endsWith(suffix)), shown.join(","));
  }
  {
    const sm = new FakeSpriteManager();
    registerKnightSprites(sm, "ranger");
    const knightSm = new FakeSpriteManager();
    registerKnightSprites(knightSm);
    const differs = (a, b) => JSON.stringify(a.rows) !== JSON.stringify(b.rows) || JSON.stringify(a.colors) !== JSON.stringify(b.colors);
    t("il ranger ha un aspetto proprio (cappuccio, colori) rispetto al cavaliere", differs(sm.sprites.get("knightIdle1Ranger"), knightSm.sprites.get("knightIdle1")));
    t("registrare un personaggio non cambia le icone delle armi del cavaliere", JSON.stringify(sm.sprites.get(WEAPON_CONFIG.bow.iconSpriteId).rows) === JSON.stringify(knightSm.sprites.get(WEAPON_CONFIG.bow.iconSpriteId).rows));
    const previews = new FakeSpriteManager();
    registerCharacterPreviews(previews);
    t("anteprime: due frame d'attesa per personaggio, con l'arma iniziale", CHARACTER_ORDER.every((id) => previews.sprites.has(getCharacterPreviewFrameId(id, 1)) && previews.sprites.has(getCharacterPreviewFrameId(id, 2))) && previews.sprites.size === 8 && getCharacterPreviewFrameId("ranger", 1) === "knightIdle1BowRanger");
    t("anteprima e serie completa coincidono (stesso id, stesse righe)", JSON.stringify(previews.sprites.get("knightIdle2BowRanger").rows) === JSON.stringify(sm.sprites.get("knightIdle2BowRanger").rows));
    t("le varianti accovacciate restano basse anche con la testa del personaggio", sm.sprites.get(`knightAttack1A${KNIGHT_CROUCH_SUFFIX}Ranger`).rows.findIndex((r) => /[^.]/.test(r.slice(0, 15))) >= 6);
  }

  // --- scelta e salvataggio ---
  {
    const memory = () => { const data = new Map(); return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
    const store = memory();
    const progress = new ProgressManager(store);
    t("progressi nuovi: cavaliere", progress.characterId === "knight");
    progress.setCharacter("paladin");
    t("il personaggio scelto si salva", new ProgressManager(store).characterId === "paladin");
    const old = memory();
    old.setItem("ironAndShadow.progress", JSON.stringify({ unlockedLevelId: 3, difficulty: "hard", equippedWeaponId: "axe", bagWeaponIds: ["axe"] }));
    const fromOld = new ProgressManager(old);
    t("un salvataggio di prima della Fase 4 (senza personaggio) dà il cavaliere e tiene il resto", fromOld.characterId === "knight" && fromOld.unlockedLevelId === 3 && fromOld.equippedWeaponId === "axe");
    const bad = memory();
    bad.setItem("ironAndShadow.progress", JSON.stringify({ unlockedLevelId: 2, characterId: "mago" }));
    t("un personaggio sconosciuto torna al cavaliere", new ProgressManager(bad).characterId === "knight");
  }
  {
    const state = new GameState();
    t("titolo -> scelta del personaggio -> titolo; dalla scelta non si va direttamente in gioco", state.change("characterSelect") && !state.change("playing") && !state.change("levelSelect") && state.change("title"));
    t("A/D (e frecce) nei menu, solo nel contesto dei menu", CONTROLS_CONFIG.menuLeft.includes("KeyA") && CONTROLS_CONFIG.menuRight.includes("KeyD") && INPUT_CONTEXT_ACTIONS.menu.includes("menuLeft") && INPUT_CONTEXT_ACTIONS.menu.includes("menuRight") && !INPUT_CONTEXT_ACTIONS.gameplay.includes("menuLeft"));
    const screens = new ScreenManager(new FakeSpriteManager());
    const data = { score: 0, bestScore: 0, collectibles: 0, isNewRecord: false, difficultyName: "NORMALE", characterId: "berserker", levels: [] };
    const press = (action) => screens.update("characterSelect", { wasPressed: (a) => a === action, isHeld: () => false, wasReleased: () => false }, data);
    press(null);
    t("la scelta parte dal personaggio salvato", screens.selectedCharacterId === "berserker");
    press("menuRight");
    const afterRight = screens.selectedCharacterId;
    press("menuRight");
    const wrapped = screens.selectedCharacterId;
    press("menuLeft");
    press("menuLeft");
    press("menuLeft");
    t("D va avanti, A indietro, in modo circolare", afterRight === "paladin" && wrapped === "knight" && screens.selectedCharacterId === "ranger", `${afterRight} ${wrapped} ${screens.selectedCharacterId}`);
    t("Invio conferma, ESC torna al titolo", press("confirm") === "confirmCharacter" && press("pause") === "backToTitle");
    screens.resetSelection();
    press(null);
    t("rientrando nella schermata si riparte dal personaggio salvato", screens.selectedCharacterId === "berserker");
    const title = screens.update("title", { wasPressed: (a) => a === "menuDown", isHeld: () => false, wasReleased: () => false }, data);
    t("la seconda voce del titolo apre la scelta del personaggio", title === null && screens.update("title", { wasPressed: (a) => a === "confirm", isHeld: () => false, wasReleased: () => false }, data) === "showCharacterSelect");
  }
  {
    const ratings = Object.fromEntries(CHARACTER_ORDER.map((id) => [id, Object.fromEntries(getCharacterRatings(CHARACTER_CONFIG[id]).map((r) => [r.label, r.value]))]));
    const all = Object.values(ratings).flatMap((r) => Object.values(r));
    t("tacche delle statistiche tra 1 e 5", all.every((v) => Number.isInteger(v) && v >= 1 && v <= 5));
    t("tacche coerenti con i valori: ranger più veloce, berserker più forte con la schivata peggiore, paladino più difeso", ratings.ranger["VELOCITÀ"] > ratings.knight["VELOCITÀ"] && ratings.berserker.DANNO > ratings.knight.DANNO && ratings.berserker.SCHIVATA < ratings.knight.SCHIVATA && ratings.paladin.DIFESA > ratings.knight.DIFESA && ratings.ranger.SALUTE < ratings.knight.SALUTE, JSON.stringify(ratings));
  }
}
