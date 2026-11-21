# Manuale del codice

Versione del gioco descritta: **2.0.0-alpha.2**. Per la visione d'insieme leggere prima `ARCHITECTURE.md`;
per le regole di gioco `GAME_MANUAL.md`.

Questo manuale spiega **cosa c'è in ogni file**, **come si muove il codice** e, nella parte finale,
come modificarlo con **11 esempi pratici**. Gli esempi non sono scritti "a memoria": si verificano
con `npm run verify-docs` (vedi l'ultima sezione), che applica ogni modifica a una copia del progetto,
controlla che compili e che il risultato sia quello descritto.

---

## 1. Convenzioni

| Aspetto | Regola |
|---|---|
| Linguaggio | TypeScript in modalità `strict`; nessun `any` |
| Nomi | variabili e funzioni in `camelCase`, classi e tipi in `PascalCase` |
| Lingua | commenti e documentazione in italiano |
| Coordinate | pixel del mondo di gioco; l'origine (0,0) è in alto a sinistra, `y` cresce verso il basso |
| Risoluzione | schermo interno 320×240 pixel, ingrandito solo con moltiplicatori interi |
| Posizione delle entità | `positionX`/`positionY` = angolo in alto a sinistra dell'**hitbox** |
| Velocità | pixel al secondo; accelerazioni in pixel/secondo² |
| Tempi | secondi (`deltaTimeSeconds`) nel loop; millisecondi (`...Ms`) nei timer e nelle configurazioni |
| Direzioni | `"left"`/`"right"` per `facingDirection`; `-1`/`1` per i calcoli |
| Terreno | il suolo dei livelli sta a `y = 200` |

---

## 2. Struttura dei file

```
IRON_AND_SHADOW/
├── index.html                  pagina con il canvas (sorgente per Vite)
├── package.json                comandi npm e dipendenze di sviluppo
├── tsconfig.json               TypeScript strict
├── vite.config.ts              build in un unico file classico, avviabile con doppio clic
├── tests/
│   ├── run.mjs                 esegue i test unitari (npm test)
│   ├── helpers.mjs             compila i moduli di src/ al volo e finti oggetti per i test
│   ├── unit/                   11 file di test unitari (*.test.mjs)
│   └── browser/                test nel browser con Playwright (npm run test:browser): run.mjs e la pagina di prova harness.js
├── tools/
│   ├── balance.mjs             simulatore di bilanciamento (npm run balance)
│   └── verifyManualExamples.mjs  verifica degli esempi di questo manuale (npm run verify-docs)
├── documentation/              manuali
├── public/assets/              cartelle per risorse esterne (vuote: tutta la grafica è nel codice)
└── src/
    ├── main.ts                 punto di ingresso: crea GameEngine e lo avvia
    ├── style.css               stile della pagina (sfondo, canvas con pixel nitidi)
    ├── config/                 TUTTI i numeri modificabili del gioco
    ├── core/                   motore: loop, stati, input
    ├── entities/               oggetti di gioco: giocatore, nemici, boss, oggetti
    ├── combat/                 attacchi, combo, danni
    ├── systems/                collisioni, IA, livelli, oggetti, punteggio, vite, record
    ├── rendering/              disegno: renderer, camera, sprite, animazioni, effetti, sfondi
    │   └── sprites/            sprite pixel art descritti come testo
    ├── ui/                     HUD, menu, schermate
    └── types/                  tipi e interfacce condivisi
```

### Variazioni rispetto alla struttura proposta nel progetto iniziale

| Variazione | Motivo |
|---|---|
| Nessun `AudioManager.ts` e nessun file in `public/assets/audio` usato | il gioco non ha audio (scelta del progetto) |
| Nessun file in `public/assets/sprites`, `backgrounds`, `fonts` | sprite, sfondi e font sono generati dal codice: il gioco non dipende da file esterni e si avvia con doppio clic |
| `config/animationConfig.ts`, `config/itemConfig.ts` | animazioni e oggetti seguono lo stesso principio "tutto in configurazione" |
| `rendering/EffectsManager.ts`, `rendering/BackgroundRenderer.ts`, `rendering/BitmapFont.ts`, `rendering/sprites/*` | effetti, sfondi con parallasse, font a pixel e sprite non erano nella struttura iniziale |
| `config/paletteConfig.ts`, `rendering/PaletteEffects.ts` (2.0) | palette a rampe e effetti di colore a 16 bit (retino, gradienti, ciclo dei colori, ondulazione) |
| `rendering/PixelPainter.ts`, `rendering/TerrainRenderer.ts` (2.0) | primitive di disegno riusabili su qualsiasi canvas (per i livelli di parallasse) e disegno del terreno separato da `LevelManager` |
| `ui/MenuManager.ts` separato da `ScreenManager.ts` | i menu sono riusabili, le schermate si limitano a disegnare |
| `systems/LivesManager.ts`, `systems/HighScoreManager.ts` | vite e record sono responsabilità distinte dal punteggio |
| `entities/Item.ts` | serve agli oggetti raccoglibili |
| `tools/`, `tests/` | strumenti per sviluppatori (bilanciamento, verifica del manuale) e test automatici (vedi `TESTING.md`) |

---

## 3. Moduli in dettaglio

### 3.1 `src/config/` – i numeri del gioco

Questa cartella contiene **solo dati**. Per cambiare il comportamento del gioco quasi sempre basta
modificare qui, senza toccare la logica.

| File | Contenuto |
|---|---|
| `gameConfig.ts` | `GAME_CONFIG` (risoluzione, gravità, vite, bonus, cura, danno da caduta...), `DIFFICULTY_CONFIG`; riesporta `PALETTE` e `PALETTE_RAMPS` |
| `paletteConfig.ts` | `PALETTE` (colori con nome, al massimo `MAX_PALETTE_COLORS`), `PALETTE_RAMPS` (rampe dallo scuro al chiaro), tipi `PaletteColor`, `PaletteRampName` |
| `playerConfig.ts` | `PLAYER_CONFIG` (statistiche del cavaliere), `ATTACK_DEFINITIONS` (attacchi), `DEFAULT_ATTACK_BY_INPUT`, `COMBO_DEFINITIONS` |
| `enemyConfig.ts` | `ENEMY_AI_CONFIG`, `ENEMY_CONFIG` (nemici), `BOSS_CONFIG` e `BOSS_CATALOG` (boss) |
| `itemConfig.ts` | `ITEM_CONFIG` (oggetti raccoglibili), `ITEM_SIZE` |
| `levelConfig.ts` | `LEVEL_CONFIG` (i livelli), `THEME_STYLES` (tessitura e rampe di colore del terreno per ambientazione: `terrainTexture`, `surfaceColors`, `fillColors`, `ledgeColors`, `detailColors`) |
| `controlsConfig.ts` | `CONTROLS_CONFIG` (tasti), `INPUT_CONTEXT_ACTIONS` (azioni ammesse nei menu e in gioco) |
| `animationConfig.ts` | `PLAYER_ANIMATIONS`, `ENEMY_ANIMATIONS`, `BOSS_ANIMATIONS` |

#### `PLAYER_CONFIG`

| Chiave | Valore | Significato |
|---|---|---|
| `maxHealth` | 100 | salute massima |
| `movementSpeed` | 80 | velocità orizzontale (px/s) |
| `jumpForce` | 310 | velocità iniziale del salto (px/s); altezza ≈ `jumpForce² / (2·gravity)` ≈ 53 px |
| `lightAttackDamage` / `heavyAttackDamage` | 15 / 30 | danno base degli attacchi |
| `invulnerabilityDurationMs` | 1000 | invulnerabilità dopo un colpo subito |
| `dodgeDurationMs` / `dodgeCooldownMs` / `dodgeSpeed` | 300 / 700 / 160 | schivata (durata, ricarica, velocità): ≈ 48 px di scatto |
| `hitboxWidth` / `hitboxHeight` | 12 / 24 | dimensioni del corpo |
| `spriteWidth` / `spriteHeight` | 24 / 30 | dimensioni dello sprite a riposo (solo informative: l'allineamento usa l'ancora dello sprite) |
| `jumpCutMultiplier` | 0,5 | rilasciando il salto in salita la velocità si dimezza (salto variabile) |
| `coyoteTimeMs` | 80 | si può saltare ancora per 80 ms dopo aver lasciato un bordo |
| `jumpBufferMs` | 100 | un salto premuto 100 ms prima di atterrare viene eseguito all'atterraggio |
| `hurtDurationMs` | 350 | stordimento dopo un colpo |
| `knockbackSpeedX` / `knockbackSpeedY` | 90 / 120 | rinculo |
| `knockbackLedgeCheckDepth` | 48 | il rinculo si ferma se oltre il bordo non c'è terreno entro 48 px: non si viene spinti negli abissi |
| `attackBufferMs` | 200 | un attacco si memorizza solo se premuto negli ultimi 200 ms prima di poter partire; il buffer scade comunque dopo 200 ms |
| `deathDurationMs` | 1500 | tempo tra la morte e la perdita della vita |

#### `GAME_CONFIG`

| Chiave | Valore | Significato |
|---|---|---|
| `internalWidth` / `internalHeight` | 320 / 240 | risoluzione interna (16 bit; nella 1.0 era 256 / 240) |
| `maxDeltaTimeSeconds` | 0,05 | tetto del delta time (evita salti dopo cambi di scheda) |
| `gravity` | 900 | gravità (px/s²) |
| `maxFallSpeed` | 400 | velocità massima di caduta |
| `levelCompleteBonus` | 500 | punti a fine livello |
| `levelCompleteHeal` | 30 | salute recuperata a fine livello (non nell'ultimo) |
| `fallDamage` | 15 | danno caduta nell'abisso |
| `levelBannerDurationMs` | 2200 | durata dei messaggi di livello |
| `startingLives` | 3 | vite iniziali |
| `pauseOnFocusLoss` | true | pausa automatica se la finestra perde il focus |
| `debugMode` | false | mostra hitbox del giocatore e FPS |

#### `ATTACK_DEFINITIONS` (tipo `AttackDefinition`)

| Campo | Significato |
|---|---|
| `id` | identificativo |
| `damage` | danno |
| `durationMs` | durata totale dell'attacco |
| `hitStartMs` / `hitEndMs` | finestra in cui il colpo è attivo (dall'inizio dell'attacco) |
| `cooldownMs` | pausa dopo la fine, prima di un nuovo attacco |
| `hitbox` | area d'urto relativa all'angolo in alto a sinistra del giocatore, pensata per chi guarda a destra (viene specchiata) |
| `animation` | nome dell'animazione in `PLAYER_ANIMATIONS` |

Attacchi esistenti: `swordLight1`, `swordLight2` (250 ms, danno 15), `swordLight3` (350 ms, danno 30),
`swordHeavy` (500 ms, danno 30). `DEFAULT_ATTACK_BY_INPUT` indica che cosa fare se un input non fa parte
di nessuna combo. `COMBO_DEFINITIONS` contiene `tripleSlash` (Spazio ×3, finestra 400 ms).

#### `ENEMY_CONFIG` (tipo `EnemyDefinition`)

| Campo | Significato |
|---|---|
| `id`, `name` | identificativo e nome mostrato |
| `maxHealth`, `attackDamage`, `movementSpeed` | statistiche base |
| `detectionRange` | distanza (px) a cui nota il giocatore |
| `attackRange` | portata dell'attacco (px dal bordo del nemico) |
| `attackCooldownMs` | pausa tra due attacchi |
| `attackWindupMs` / `attackActiveMs` / `attackRecoveryMs` | preparazione, colpo attivo, recupero |
| `hurtDurationMs`, `knockbackSpeed` | stordimento e rinculo quando viene colpito |
| `attackInterruptWindowMs` | per quanti ms (dall'inizio dell'attacco) un colpo subito lo interrompe; 0 = mai |
| `patrolDistance` | raggio (px) della zona di pattuglia (solo `patrol`) |
| `behavior` | `"patrol"`, `"chase"` o `"guard"` |
| `scoreReward` | punti alla sconfitta |
| `hitbox` | dimensioni del corpo (`x`,`y` non usati) |

#### `BOSS_CONFIG` (tipo `BossDefinition`)

Contiene salute, velocità, `activationRange`, i parametri del **fendente** (`slash...`) e della **carica**
(`charge...`), `attackCooldownMs`, `hitFlashMs`, `deathDurationMs`, `scoreReward`, `hitbox` e l'elenco
`phases` (tipo `BossPhaseDefinition`: soglia di salute in %, moltiplicatori di velocità e di pausa,
probabilità di carica). `BOSS_CATALOG` raccoglie tutti i boss per id.

### 3.2 `src/core/` – il motore

| File | Classe | Responsabilità |
|---|---|---|
| `GameLoop.ts` | `GameLoop` | ciclo con `requestAnimationFrame`; calcola il delta time (`calculateDeltaTime`, 0 al primo frame, tetto `maxDeltaTimeSeconds`); chiama `update` poi `render` |
| `GameState.ts` | `GameState` | macchina a stati: `current`, `previous`, `is()`, `onChange()`, `change()` (rifiuta le transizioni non previste) |
| `InputManager.ts` | `InputManager` | tastiera centralizzata (vedi sotto) |
| `GameEngine.ts` | `GameEngine` | coordina tutto: stati, livelli, combattimento, effetti, disegno |

**`GameState`** – stati: `title`, `controls`, `playing`, `paused`, `gameOver`, `victory`. Transizioni valide:
`title→controls/playing`, `controls→title`, `playing→paused/gameOver/victory`, `paused→playing/title`,
`gameOver→title/playing`, `victory→title`.

**`InputManager`** – traduce i tasti (`KeyboardEvent.code`) in azioni (`GameAction`) secondo
`CONTROLS_CONFIG`. Metodi: `isHeld(action)` (tenuto premuto), `wasPressed(action)` (premuto in questo frame,
una sola volta, senza auto-repeat), `wasReleased(action)`, `endFrame()` (azzera gli eventi del frame),
`setContext("gameplay" | "menu")` (blocca le azioni non ammesse, vedi `INPUT_CONTEXT_ACTIONS`), `attach()`/`detach()`.
Alla perdita del focus rilascia tutti i tasti. Implementa l'interfaccia `InputSource`, usata da `Player`
(così si può testare senza tastiera).

**`GameEngine`** – variabili principali:

| Variabile | Significato |
|---|---|
| `player`, `enemies`, `boss` | entità del livello corrente |
| `levelManager`, `itemManager` | livello e oggetti |
| `scoreManager`, `livesManager`, `highScoreManager` | punteggio, vite, record |
| `effects`, `hud`, `screens` | effetti grafici, HUD, schermate |
| `currentLevelId`, `levelPhase` (`"playing"`/`"completed"`) | avanzamento |
| `bannerRemainingMs` | tempo restante del messaggio di livello |
| `lastSafePosition` | ultima posizione sul terreno, per ripartire dopo una caduta |
| `levelStartScore`, `levelStartCollectibles` | per ripristinare punteggio e gemme se si muore |

Funzioni principali: `start()`, `update()` (un frame di logica), `render()`, `startNewGame()`, `startLevel()`,
`updatePlaying()`, `updateCombatAndEnemies()`, `handlePlayerDeath()`, `finishRun()`, `checkLevelCompletion()`,
`advanceToNextLevel()`, `getHUDData()`, `getScreenData()`. Le costanti `EFFECT_CONFIG` (in cima al file)
regolano hit-stop, tremolio e polvere.

### 3.3 `src/entities/` – gli oggetti di gioco

| File | Classe | Note |
|---|---|---|
| `GameObject.ts` | `GameObject` (astratta) | `positionX`, `positionY`, `velocityX`, `velocityY`, `facingDirection`, `isOnGround`, `width`, `height`, `getBounds()` |
| `Player.ts` | `Player` | il cavaliere |
| `Enemy.ts` | `Enemy` | nemico normale guidato da una `EnemyDefinition` |
| `Boss.ts` | `Boss` | boss con IA propria e fasi |
| `Item.ts` | `Item` | oggetto raccoglibile |

**`Player`** – `currentState` (`PlayerState`: `idle`, `walk`, `jump`, `fall`, `attack`, `hurt`, `dodge`, `dead`;
`run` è previsto dal tipo ma non usato), `currentHealth`, `maxHealth`. Funzioni:

| Funzione | Cosa fa |
|---|---|
| `update(dt, input, collisionSystem, platforms, mapWidth)` | un frame: timer, input, gravità, collisioni, stato, animazione |
| `takeDamage(damage, sourceCenterX)` | danno da nemico: rinculo, stordimento, invulnerabilità; `false` se ignorato |
| `takeEnvironmentalDamage(damage)` | danno senza rinculo (cadute) |
| `heal(amount)` | cura fino al massimo |
| `getActiveAttackHitbox()` | area d'urto se il colpo è attivo, altrimenti `null` |
| `hasAlreadyHit(target)`, `registerHit(target)` | un bersaglio si colpisce una volta per attacco |
| `getDamageMultiplier()` | punto di estensione per i futuri power-up (ora 1) |
| `respawnAt(position)`, `revive()` | ripartenza e rianimazione |
| `isInvulnerable`, `isDead`, `isReadyToRespawn`, `activeAttack` | stato letto dal motore |

L'ordine dentro `update`: timer → (morto / stordito / input) → gravità → `moveAndCollide` → stato → animazione.
Priorità degli stati in `updateState()`: morto > stordito > schivata > attacco > aria > camminata > fermo.

**`Enemy`** – decide `EnemyAISystem`, esegue `Enemy`. Funzioni: `setMovement(direction, speedMultiplier)`,
`faceTowards(x)`, `beginAttack()`, `getAttackHitbox()`, `markPlayerHit()`, `receiveHit(damage, hitDirection)`,
`update(...)`, `render(...)`. Getter: `isAlive`, `isRemovable`, `canAct`, `isAttacking`, `isAttackReady`, `scoreReward`.
Applica `DIFFICULTY_CONFIG` a salute e danno quando viene creato.

**`Boss`** – stati `dormant`, `idle`, `walk`, `slash`, `chargeWindup`, `charging`, `recovery`, `dead`. Si risveglia entro
`activationRange` (o se colpito). Sorteggia il prossimo attacco una volta per pausa (`rollNextAttack`), usando
`chargeChance` della fase corrente. Non viene stordito dai colpi (lampeggia). Getter: `phaseIndex`, `currentPhase`,
`isActive`, `isDefeated`, `currentAttackDamage`. Il generatore casuale è un parametro del costruttore (utile per i test).

**`Item`** – ha `definition` (da `ITEM_CONFIG`) e `bobPhase` (solo grafica).

### 3.4 `src/combat/`

| File | Contenuto |
|---|---|
| `AttackDefinition.ts` | ri-esporta il tipo `AttackDefinition`; `getAttackWorldHitbox()` converte l'area d'urto in coordinate del mondo, specchiandola se si guarda a sinistra |
| `ComboManager.ts` | sceglie l'attacco in base alla sequenza di input |
| `CombatSystem.ts` | applica i danni |

**`ComboManager`** – `getNextAttack(input)`: prova a **continuare** la combo in corso (la sequenza di input finora deve essere
l'inizio di una combo definita); se non va, **riparte** da questo input; se nessuna combo inizia con questo input usa
`DEFAULT_ATTACK_BY_INPUT`. `onAttackFinished()` avvia la finestra `comboWindowMs`; `update(dtMs)` la fa scadere; `reset()`.

**`CombatSystem`** – `processPlayerAttack(player, targets)` (colpisce chi si sovrappone all'area d'urto, una volta per
attacco), `processEnemyAttacks(enemies, player)`, `processBossAttack(boss, player)`, e la funzione statica
`calculateDamage(base, multiplier)` (≥ 1): è il punto dove inserire in futuro moltiplicatori, danni elementali, riduzioni.

### 3.5 `src/systems/`

| File | Classe | Responsabilità |
|---|---|---|
| `CollisionSystem.ts` | `CollisionSystem` | `intersects(a, b)`, `applyGravityAndMove(object, dt, gravity, maxFallSpeed, platforms, mapWidth)` (gravità con **velocità media** del frame: la traiettoria del salto è esatta a qualsiasi FPS) e `moveAndCollide(object, dt, platforms, mapWidth)`: muove prima su X poi su Y, risolve le collisioni, impone i limiti della mappa, imposta `isOnGround`; piattaforme sospese (`oneWay`) attraversabili dal basso |
| `EnemyAISystem.ts` | `EnemyAISystem` | decide cosa fa ogni nemico (pattuglia, insegue, guardia, attacca); evita abissi e muri |
| `LevelManager.ts` | `LevelManager` | `loadLevel`, `hasLevel`, `createEnemies`, `createBoss`, `lockArena`, `render` (sfondo, terreno, porta, cancello) |
| `ItemManager.ts` | `ItemManager` | `loadItems`, `collectItems(player, scoreManager)` (applica gli effetti), `render` |
| `ScoreManager.ts` | `ScoreManager` | `currentScore`, `collectiblesFound`, `addScore`, `registerCollectible`, `restore`, `reset` |
| `LivesManager.ts` | `LivesManager` | `remainingLives`, `hasLivesLeft`, `loseLife`, `addLife`, `reset` |
| `HighScoreManager.ts` | `HighScoreManager` | record nel browser (`localStorage`), tollerante agli errori; `bestScore`, `submitScore` |

### 3.6 `src/rendering/`

| File | Classe / funzioni | Responsabilità |
|---|---|---|
| `PixelPainter.ts` | `PixelPainter`, `DrawTextOptions` | primitive di disegno su qualsiasi canvas: `clear`, `fillRect` (arrotonda tutti i bordi: niente sfumature), `strokeRect`, `drawImage`, `fillDithered` (retino di due colori), `fillDitheredOverlay` (retino di un colore sopra ciò che c'è), `fillVerticalGradient` (gradiente a fasce), `fillCircle`, `fillGlow` (alone a anelli di retino), `drawText` (`shadowColor`, `rowColors` per le scritte a fasce) |
| `Renderer.ts` | `Renderer` (estende `PixelPainter`) | lo schermo: risoluzione fissa con scala intera **in pixel fisici** (tiene conto di `devicePixelRatio`), `drawDitherOverlay` (pausa), `applyLineWave` (ondulazione per riga) |
| `BitmapFont.ts` | `getGlyph`, `getGlyphRows`, `measureTextWidth` | font a pixel: maiuscole 5×7, minuscole con discendenti (9 righe in tutto), accentate italiane minuscole, spaziatura proporzionale con cifre a larghezza fissa |
| `PaletteEffects.ts` | `isDitherPixelOn`, `buildDitherTile`, `computeGradientBands`, `shadeColor`, `cycleRampColor`, `computeLineWaveOffset` | effetti di colore a 16 bit come funzioni pure (testabili senza browser) |
| `Camera.ts` | `Camera` | `follow(target, mapWidth, mapHeight)`: centra e limita ai bordi |
| `SpriteManager.ts` | `SpriteManager` | `registerSprite(id, righe, colori, anchorX)`, `drawSprite(...)`, `drawSpriteAligned(...)` (allinea lo sprite all'hitbox con l'ancora, anche specchiato), `drawSpriteSilhouette(..., colore)`, `getSpriteSize`, `getSpriteAnchorX`; crea le versioni specchiate e, alla prima richiesta, le sagome a tinta unita |
| `AnimationManager.ts` | `AnimationPlayer`, `AnimationDefinition` | riproduce un'animazione: `play`, `restart`, `update`, `currentFrameId`; durata per frame (`frameDurationsMs`) opzionale |
| `EffectsManager.ts` | `EffectsManager` | particelle, scritte, tremolio, hit-stop |
| `BackgroundRenderer.ts` | `BackgroundRenderer` | sfondi a 16 bit per `forest`, `castle`, `dungeon`: 4-6 livelli di parallasse disegnati una volta in canvas da 640 px che si ripetono, più elementi animati (stelle, luna, torce, nebbia) |
| `TerrainRenderer.ts` | `TerrainRenderer` | terreno e piattaforme con la tessitura dell'ambientazione (`THEME_STYLES`), porta d'uscita, cancello dell'arena |
| `sprites/spriteTools.ts` | funzioni | `createGrid`, `stampRows`, `setPixel`, `drawSword`, `drawSlashArc`, pose delle gambe, `addOutline` (contorno automatico), `remapSpriteKeys` (varianti) |
| `sprites/knightSprites.ts` | `registerKnightSprites`, `KNIGHT_ANCHOR_X` | cavaliere 24×30 (attacchi 44×30): parte superiore + gambe + spada; ancora alla colonna 7 |
| `sprites/enemySprites.ts` | `registerEnemySprites` | nemici da `SPECS` (`HumanoidSpec`: parte superiore, pose delle gambe, colori, arma, mano, ancora): scheletro 20×26, goblin 20×19, soldato 20×27 |
| `sprites/bossSprites.ts` | `registerBossSprites`, `BOSS_SPRITE_STYLES` | boss 36×41 a piena risoluzione (corna, spallacci, mantello, spadone); i colori di ogni boss sono in `BOSS_SPRITE_STYLES` (chiavi k, n, d, s, w, r, e, y, c, p) |
| `sprites/itemSprites.ts`, `uiSprites.ts` | funzioni | oggetti 8×8 ombreggiati; icone dell'HUD (`hudLife`, `hudHeart`, `hudSkull`) |

**Come si descrive uno sprite.** Uno sprite è una lista di righe di testo; `.` è trasparente, ogni altra lettera è una
chiave della mappa dei colori:

```ts
const COIN_ROWS = [
  "..kkkk..",
  ".kyyyyk.",
  // ...
];
spriteManager.registerSprite("itemCoin", COIN_ROWS, { k: PALETTE.black, y: PALETTE.yellow });
```

`registerSprite` controlla che tutte le righe abbiano la stessa lunghezza e che ogni lettera abbia un colore:
altrimenti lancia un errore con il nome dello sprite. I test controllano anche che ogni colore usato sia della palette.

**Stile 16 bit degli sprite.** Ogni materiale ha 2-4 tonalità della stessa rampa (luce in alto a sinistra), il contorno è
nero (`k`), le scie dei colpi sono doppie (bianca e colorata). Per i personaggi si passa anche l'**ancora** (quarto parametro):
la colonna in cui inizia l'hitbox quando lo sprite guarda a destra. Esempio del cavaliere: lo sprite è largo 24 pixel, l'hitbox 12,
l'ancora 7; nei frame d'attacco (larghi 44) l'ancora resta 7 e la spada occupa le colonne in più a destra. Lo sprite poggia sempre
sul fondo dell'hitbox: ciò che è più alto dell'hitbox (pennacchio, corna) sporge sopra.

### 3.7 `src/ui/`

| File | Classe | Responsabilità |
|---|---|---|
| `HUDManager.ts` | `HUDManager`, `drawOrnateFrame`, `HEALTH_SEGMENT_GEOMETRY`, `TITLE_GOLD_ROWS` | pannello superiore (cuore e salute a 10 segmenti, vite, livello, punteggio dorato, gemme), barra del boss con teschio e tacche di fase, riquadri decorati dei messaggi |
| `MenuManager.ts` | `MenuManager<TCommand>` | menu verticale: `update(input)` restituisce il comando confermato, `render(...)` (voce scelta in bianco-oro con frecce) |
| `ScreenManager.ts` | `ScreenManager` | schermate titolo, controlli, pausa, Game Over, vittoria; usa un `MenuManager` per ciascuna |

### 3.8 `src/types/`

| File | Tipi |
|---|---|
| `GameTypes.ts` | `GameStateName`, `GameAction`, `InputContext`, `Vector2`, `Rectangle`, `FacingDirection`, `InputSource` |
| `EntityTypes.ts` | `PlayerState`, `EnemyState`, `EnemyBehavior`, `EnemyTypeId`, `EnemyDefinition`, `AttackDefinition`, `ComboDefinition`, `Damageable`, `BossPhaseDefinition`, `BossDefinition` |
| `LevelTypes.ts` | `ThemeId`, `TerrainTexture`, `ThemeStyle`, `ItemTypeId`, `PlatformDefinition`, `EnemySpawnDefinition`, `ItemSpawnDefinition`, `CompletionCondition`, `LevelDefinition` |

---

## 4. Flussi di esecuzione

### 4.1 Avvio
`index.html` carica lo script → `main.ts` cerca il canvas → `new GameEngine(canvas).start()` → il costruttore
registra gli sprite, carica il livello 1, crea giocatore/nemici/oggetti → `start()` collega la tastiera e avvia il `GameLoop`.

### 4.2 Un frame (`GameEngine.update`, poi `render`)
1. `GameLoop` calcola `deltaTimeSeconds` e chiama `update`.
2. Se `playing` e c'è un hit-stop attivo: si scala solo il suo tempo e si esce (senza consumare gli input).
3. In `playing`: ESC mette in pausa; altrimenti `updatePlaying`. In `paused`: ESC riprende, altrimenti menu. Negli altri stati: menu.
4. `input.endFrame()` azzera "premuto adesso".
5. `render()`: mondo (con tremolio) → HUD → messaggi di livello → schermata dello stato.

### 4.3 `updatePlaying` (l'ordine conta)
`player.update` → effetti di movimento (polvere) → punto sicuro → arena del boss → combattimento
(`processPlayerAttack` → effetti/punti → IA dei nemici → `enemy.update` → attacchi nemici → boss) → oggetti →
effetti di danno → ripartenza dopo la morte o caduta → completamento del livello → camera.

### 4.4 Un colpo del giocatore
`Player.handleInput` memorizza l'input (`bufferAttack`, solo se l'attacco può partire entro `attackBufferMs`) → quando possibile `startAttack` chiede a `ComboManager` l'attacco →
durante `hitStartMs…hitEndMs` `getActiveAttackHitbox()` restituisce l'area d'urto → `CombatSystem.processPlayerAttack`
la confronta con i bersagli → `target.receiveHit(...)` → il motore genera scintille, hit-stop, tremolio e, se il nemico
muore, punti e popup.

### 4.5 Morte e fine partita
Salute 0 → stato `dead` → dopo `deathDurationMs` `isReadyToRespawn` → `handlePlayerDeath`: toglie una vita; se ne restano,
`restartCurrentLevel` (ripristina punteggio e gemme di inizio livello e ricarica il livello); altrimenti `finishRun("gameOver")`
registra il record e cambia stato.

### 4.6 Fine livello
`checkLevelCompletion`: raggiungere `exitX` oppure boss sconfitto (`isDefeated`) → `levelPhase = "completed"`, bonus e cura →
dopo il messaggio `advanceToNextLevel`: `startLevel(id + 1)` se esiste, altrimenti `finishRun("victory")`.

---

## 5. Relazioni tra componenti

```
main.ts ──► GameEngine ──┬─► GameLoop            (chiama update/render)
                         ├─► GameState           (stati)
                         ├─► InputManager        (tasti) ──► Player (come InputSource)
                         ├─► LevelManager ──► LEVEL_CONFIG, BackgroundRenderer, crea Enemy / Boss
                         ├─► Player / Enemy[] / Boss ──► CollisionSystem, AnimationPlayer
                         ├─► EnemyAISystem ──► Enemy (decide), Player (osserva)
                         ├─► CombatSystem ──► Damageable (Enemy, Boss), Player
                         ├─► ItemManager ──► Item, ScoreManager, Player
                         ├─► ScoreManager, LivesManager, HighScoreManager
                         ├─► EffectsManager      (solo grafica + hit-stop)
                         ├─► HUDManager, ScreenManager (MenuManager)
                         └─► Renderer, Camera, SpriteManager
config/*  ◄── letto da quasi tutti; non dipende da nessuno (solo da types/)
```

Regola di dipendenza: `config` e `types` non importano la logica; la logica importa la configurazione.

---

## 6. Esempi pratici

Ogni esempio indica: **file da aprire**, **cosa cercare**, **codice originale**, **codice aggiornato**,
**spiegazione** e **risultato atteso**. Gli esempi sono **indipendenti**: ciascuno parte dal codice originale
del progetto (applicandone più d'uno bisogna fare attenzione agli stessi punti).

Dopo ogni modifica: `npm run typecheck` per controllare gli errori, `npm run dev` per provare.

### Esempio 1 – Aumentare la salute del giocatore

**Obiettivo:** salute massima da 100 a 150.

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `PLAYER_CONFIG` e la riga `maxHealth`.

Codice originale:
```ts
export const PLAYER_CONFIG = {
  maxHealth: 100,
```
Codice aggiornato:
```ts
export const PLAYER_CONFIG = {
  maxHealth: 150,
```

**Spiegazione.** `Player` legge `maxHealth` da `PLAYER_CONFIG` sia per la salute massima sia per quella iniziale
(`currentHealth`). La barra dell'HUD ha sempre 10 segmenti e si adatta da sola alla salute massima. Pozioni (+30)
e cura di fine livello (+30) valgono invece lo stesso numero di punti: ora pesano di meno in percentuale.

**Risultato atteso:** il cavaliere parte con 150 HP, la barra è piena con 10 segmenti, ogni segmento ne vale 15.
Il gioco diventa più facile; per ribilanciare rilanciare `npm run balance`.

### Esempio 2 – Modificare la velocità

**Obiettivo:** velocità di camminata da 80 a 100 px/s.

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `movementSpeed`.

Codice originale:
```ts
  /** Velocità orizzontale in pixel/secondo. */
  movementSpeed: 80,
```
Codice aggiornato:
```ts
  /** Velocità orizzontale in pixel/secondo. */
  movementSpeed: 100,
```

**Spiegazione.** `Player.applyHorizontalInput` imposta `velocityX = direzione × movementSpeed`. Il movimento usa il
delta time, quindi 100 px/s restano 100 px/s a qualsiasi frequenza di aggiornamento. Con più velocità si salta più
lontano: gli abissi (≤ 36 px) restano superabili.

**Risultato atteso:** in 1 secondo il cavaliere percorre 100 px invece di 80; la schivata (160 px/s) resta più veloce della corsa.

### Esempio 3 – Modificare la forza del salto

**Obiettivo:** salto più alto (da circa 53 a circa 64 px).

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `jumpForce`.

Codice originale:
```ts
  /** Velocità iniziale del salto (pixel/secondo verso l'alto). */
  jumpForce: 310,
```
Codice aggiornato:
```ts
  /** Velocità iniziale del salto (pixel/secondo verso l'alto). */
  jumpForce: 340,
```

**Spiegazione.** `Player.applyJumpInput` assegna `velocityY = -jumpForce`; la gravità (`GAME_CONFIG.gravity`, 900)
frena la salita. L'altezza massima è `jumpForce² / (2 × gravity)`: 310 → ≈ 53 px, 340 → ≈ 64 px.
Rilasciando il tasto durante la salita l'altezza si riduce (`jumpCutMultiplier`).

**Risultato atteso:** il salto raggiunge circa 64 px. Attenzione: i livelli sono progettati per un salto di circa 50 px;
con più altezza si possono raggiungere zone pensate come irraggiungibili.

### Esempio 4 – Modificare il danno della spada

**Obiettivo:** attacco leggero da 15 a 20 e pesante da 30 a 40.

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `lightAttackDamage` e `heavyAttackDamage`.

Codice originale:
```ts
  lightAttackDamage: 15,
  heavyAttackDamage: 30,
```
Codice aggiornato:
```ts
  lightAttackDamage: 20,
  heavyAttackDamage: 40,
```

**Spiegazione.** `ATTACK_DEFINITIONS` usa questi valori: `swordLight1` e `swordLight2` fanno `lightAttackDamage`,
`swordLight3` (il finale della combo) ne fa il doppio, `swordHeavy` fa `heavyAttackDamage`. Per cambiare **un solo**
attacco si modifica il suo `damage` dentro `ATTACK_DEFINITIONS`.

**Risultato atteso:** la combo `tripleSlash` infligge 20 + 20 + 40 = 80 invece di 60; l'attacco pesante 40.
Scheletro (40 HP) e Goblin (25 HP) cadono con meno colpi.

### Esempio 5 – Modificare le combo

**Obiettivo:** aggiungere una seconda combo: Spazio, Spazio, **J** (due fendenti e un attacco pesante).

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `COMBO_DEFINITIONS`.

Codice originale:
```ts
    attackIds: ["swordLight1", "swordLight2", "swordLight3"],
    comboWindowMs: 400,
  },
];
```
Codice aggiornato:
```ts
    attackIds: ["swordLight1", "swordLight2", "swordLight3"],
    comboWindowMs: 400,
  },
  {
    id: "heavyFinisher",
    inputSequence: ["attack", "attack", "heavyAttack"],
    attackIds: ["swordLight1", "swordLight2", "swordHeavy"],
    comboWindowMs: 400,
  },
];
```

**Spiegazione.** Una combo è una sequenza di azioni (`inputSequence`, valori di `GameAction`) e gli attacchi
corrispondenti (`attackIds`, chiavi di `ATTACK_DEFINITIONS`). `ComboManager` confronta gli input premuti con l'inizio
di ogni combo: dopo "Spazio, Spazio" sono possibili entrambe, e la terza pressione decide (Spazio → `tripleSlash`,
J → `heavyFinisher`). `comboWindowMs` è il tempo massimo tra la fine di un colpo e il successivo. Per rendere più o meno
severa una combo basta cambiare quel numero (es. 600 per concatenare più facilmente).

**Risultato atteso:** Spazio, Spazio, J esegue le animazioni `attack1`, `attack2`, `attackHeavy`; Spazio ×3 funziona come prima.

### Esempio 6 – Aggiungere un nuovo nemico

**Obiettivo:** il **Bruto**, un nemico lento e molto forte (90 HP, 20 di danno), che pattuglia una zona, usando il corpo
del soldato con colori rossi.

Servono 6 passi: tipo, statistiche, animazioni, sprite (2 punti) e posizione nel livello.

#### Passo 1 – `src/types/EntityTypes.ts`

**Cerca:** `EnemyTypeId`.

Codice originale:
```ts
export type EnemyTypeId = "skeleton" | "goblin" | "soldier";
```
Codice aggiornato:
```ts
export type EnemyTypeId = "skeleton" | "goblin" | "soldier" | "brute";
```

#### Passo 2 – `src/config/enemyConfig.ts`

**Cerca:** `ENEMY_CONFIG`, in fondo alla voce `soldier`.

Codice originale:
```ts
    scoreReward: 150,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
  },
};
```
Codice aggiornato:
```ts
    scoreReward: 150,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
  },
  brute: {
    id: "brute",
    name: "Bruto",
    maxHealth: 90,
    attackDamage: 20,
    movementSpeed: 20,
    detectionRange: 60,
    attackRange: 22,
    attackCooldownMs: 1800,
    attackWindupMs: 700,
    attackActiveMs: 200,
    attackRecoveryMs: 500,
    hurtDurationMs: 100,
    knockbackSpeed: 20,
    attackInterruptWindowMs: 0,
    patrolDistance: 40,
    behavior: "patrol",
    scoreReward: 300,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
  },
};
```

#### Passo 3 – `src/config/animationConfig.ts`

**Cerca:** `ENEMY_ANIMATIONS`.

Codice originale:
```ts
  soldier: createEnemyAnimations("soldier"),
};
```
Codice aggiornato:
```ts
  soldier: createEnemyAnimations("soldier"),
  brute: createEnemyAnimations("brute"),
};
```

#### Passo 4 – `src/rendering/sprites/enemySprites.ts` (tipo dell'identificativo)

**Cerca:** la prima riga `import` che contiene `enemyConfig`, poi `idPrefix` nell'interfaccia `HumanoidSpec`.

Codice originale:
```ts
import { ENEMY_CONFIG } from "../../config/enemyConfig";
```
Codice aggiornato:
```ts
import { ENEMY_CONFIG } from "../../config/enemyConfig";
import type { EnemyTypeId } from "../../types/EntityTypes";
```

#### Passo 5 – `src/rendering/sprites/enemySprites.ts` (l'interfaccia)

**Cerca:** `idPrefix:` dentro `interface HumanoidSpec`.

Codice originale:
```ts
  idPrefix: "skeleton" | "goblin" | "soldier";
```
Codice aggiornato:
```ts
  idPrefix: EnemyTypeId;
```

#### Passo 6 – `src/rendering/sprites/enemySprites.ts` (lo sprite)

**Cerca:** `SPECS`, in fondo alla voce `soldier`.

Codice originale:
```ts
    bladeKeys: { grip: "y", blade: "w", edge: "w", guard: "y" },
    handX: 17,
    handY: 15,
  },
];
```
Codice aggiornato:
```ts
    bladeKeys: { grip: "y", blade: "w", edge: "w", guard: "y" },
    handX: 17,
    handY: 15,
  },
  {
    idPrefix: "brute",
    bodyRows: SOLDIER_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      s: PALETTE.red,
      g: PALETTE.purple,
      w: PALETTE.orange,
      r: PALETTE.black,
      y: PALETTE.yellow,
      d: PALETTE.black,
    },
    bladeKeys: { grip: "y", blade: "w", edge: "w", guard: "y" },
    handX: 17,
    handY: 15,
  },
];
```

#### Passo 7 – `src/config/levelConfig.ts`

**Cerca:** nel livello 2 (`Castello Medievale`), l'ultimo nemico dell'elenco `enemies`.

Codice originale:
```ts
      { type: "goblin", position: { x: 1680, y: 184 } },
```
Codice aggiornato:
```ts
      { type: "goblin", position: { x: 1680, y: 184 } },
      { type: "brute", position: { x: 1620, y: 176 } },
```

**Spiegazione.** `EnemyTypeId` è un'unione di stringhe: aggiungere `"brute"` obbliga TypeScript a segnalarti
dove manca qualcosa (`ENEMY_CONFIG` e `ENEMY_ANIMATIONS` sono `Record<EnemyTypeId, ...>`). I nemici umanoidi condividono lo
schema degli sprite: `registerHumanoid` genera da solo idle, camminata, attacco (largo quanto serve alla portata
`attackRange`), danno e morte; basta fornire corpo e colori. La y di partenza è
`200 − altezza dell'hitbox` (qui 176) perché il nemico poggi sul terreno. Il comportamento `patrol` usa
`patrolDistance` come raggio della zona; `attackInterruptWindowMs: 0` lo rende "corazzato" (i colpi non lo interrompono).

**Risultato atteso:** nel livello 2, vicino alla fine, un cavaliere rosso e viola pattuglia 40 px attorno al suo punto,
colpisce con 20 di danno dopo 700 ms di preparazione e vale 300 punti.

### Esempio 7 – Modificare il comportamento di un nemico

**Obiettivo:** far inseguire il giocatore allo scheletro (invece di pattugliare), con raggio di vista di 120 px.

#### Passo 1 – `src/config/enemyConfig.ts` (raggio)

**Cerca:** la voce `skeleton`, riga `detectionRange`.

Codice originale:
```ts
    detectionRange: 80,
    attackRange: 20,
```
Codice aggiornato:
```ts
    detectionRange: 120,
    attackRange: 20,
```

#### Passo 2 – `src/config/enemyConfig.ts` (comportamento)

**Cerca:** `behavior: "patrol"`.

Codice originale:
```ts
    behavior: "patrol",
```
Codice aggiornato:
```ts
    behavior: "chase",
```

**Spiegazione.** `EnemyAISystem` sceglie la funzione in base a `behavior`: `patrol` (zona fissa),
`chase` (aspetta, poi insegue entro `detectionRange` e smette oltre `detectionRange × loseInterestMultiplier`, cioè 1,5),
`guard` (fermo, attacca a portata). Per far restare un nemico fermo ma pericoloso si usa `guard`. Con `chase` il valore
`patrolDistance` non viene usato.

**Risultato atteso:** lo scheletro resta fermo finché non entri nei 120 px, poi ti insegue (a 30 px/s) anche fuori
dalla vecchia zona di pattuglia; non cammina nel vuoto.

### Esempio 8 – Aggiungere un oggetto raccoglibile

**Obiettivo:** l'**Elisir**: cura 60 HP e dà 100 punti. Si trova nel livello 1.

#### Passo 1 – `src/types/LevelTypes.ts`

**Cerca:** `ItemTypeId`.

Codice originale:
```ts
export type ItemTypeId = "healthPotion" | "scoreCoin" | "collectible";
```
Codice aggiornato:
```ts
export type ItemTypeId = "healthPotion" | "scoreCoin" | "collectible" | "elixir";
```

#### Passo 2 – `src/config/itemConfig.ts`

**Cerca:** `ITEM_CONFIG`, in fondo alla voce `collectible`.

Codice originale:
```ts
    scoreBonus: 200,
    isCollectible: true,
  },
};
```
Codice aggiornato:
```ts
    scoreBonus: 200,
    isCollectible: true,
  },
  elixir: {
    id: "elixir",
    name: "Elisir",
    spriteId: "itemElixir",
    healAmount: 60,
    scoreBonus: 100,
    isCollectible: false,
  },
};
```

#### Passo 3 – `src/rendering/sprites/itemSprites.ts`

**Cerca:** `registerItemSprites`.

Codice originale:
```ts
export function registerItemSprites(spriteManager: SpriteManager): void {
```
Codice aggiornato:
```ts
const ELIXIR_ROWS = [
  "..kkkk..",
  "...kk...",
  ".kbbbbk.",
  "kbcccbbk",
  "kbcwcbbk",
  "kbcccbbk",
  ".kbbbbk.",
  "..kkkk..",
];

export function registerItemSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("itemElixir", ELIXIR_ROWS, ITEM_COLORS);
```

#### Passo 4 – `src/config/levelConfig.ts`

**Cerca:** nel livello 1 (`Foresta Oscura`), l'ultimo oggetto dell'elenco `items`.

Codice originale:
```ts
      { type: "scoreCoin", position: { x: 1270, y: 120 } },
```
Codice aggiornato:
```ts
      { type: "scoreCoin", position: { x: 1270, y: 120 } },
      { type: "elixir", position: { x: 1000, y: 192 } },
```

**Spiegazione.** `ItemManager.collectItems` legge `healAmount`, `scoreBonus` e `isCollectible` dalla definizione:
non serve scrivere altra logica. Lo sprite è 8×8 e usa le lettere dei colori di `ITEM_COLORS` (`k w r y c b`).
La posizione `y` è `superficie − 8`: sul terreno (y = 200) l'oggetto sta a 192. Anche il popup "+60 HP" del motore
funziona da solo perché `healAmount > 0`.

**Risultato atteso:** nel livello 1, a x ≈ 1000, una boccetta blu: toccarla cura 60 HP, dà 100 punti e mostra "+60 HP".

### Esempio 9 – Aggiungere un nuovo livello

**Obiettivo:** inserire un nuovo livello ("Rovine Antiche", ambientazione castello) **prima** del livello del boss,
che diventa il livello 4.

#### Passo 1 – `src/config/levelConfig.ts`

**Cerca:** l'inizio del livello del dungeon: `id: 3` con `name: "Dungeon Sotterraneo"`.

Codice originale:
```ts
  {
    id: 3,
    name: "Dungeon Sotterraneo",
```
Codice aggiornato:
```ts
  {
    id: 3,
    name: "Rovine Antiche",
    theme: "castle",
    width: 1280,
    height: 240,
    playerStart: { x: 24, y: 176 },
    platforms: [
      // terreno con due abissi (x 420-456 e 860-896)
      { x: 0, y: 200, width: 420, height: 40 },
      { x: 456, y: 200, width: 404, height: 40 },
      { x: 896, y: 200, width: 384, height: 40 },
      // piattaforme sospese
      { x: 180, y: 164, width: 48, height: 8, oneWay: true },
      { x: 240, y: 128, width: 48, height: 8, oneWay: true },
      { x: 520, y: 164, width: 48, height: 8, oneWay: true },
      { x: 940, y: 164, width: 48, height: 8, oneWay: true },
      { x: 1000, y: 128, width: 48, height: 8, oneWay: true },
      // blocco di pietra
      { x: 640, y: 172, width: 28, height: 28 },
    ],
    enemies: [
      { type: "skeleton", position: { x: 300, y: 176 } },
      { type: "goblin", position: { x: 560, y: 184 } },
      { type: "soldier", position: { x: 700, y: 176 } },
      { type: "goblin", position: { x: 960, y: 184 } },
      { type: "skeleton", position: { x: 1100, y: 176 } },
    ],
    items: [
      { type: "scoreCoin", position: { x: 260, y: 120 } },
      { type: "healthPotion", position: { x: 470, y: 192 } },
      { type: "collectible", position: { x: 1020, y: 120 } },
    ],
    completion: { kind: "reachExit", exitX: 1240 },
    hasBoss: false,
  },
  {
    id: 4,
    name: "Dungeon Sotterraneo",
```

**Spiegazione.** Un livello è solo un oggetto dati: nessun codice del motore cambia. Regole da rispettare:
gli `id` sono consecutivi da 1 (il motore passa a `id + 1` e dopo l'ultimo mostra la vittoria); gli abissi non più larghi di
circa 36 px; le piattaforme non più di circa 44 px sopra una superficie da cui salire; i nemici e gli oggetti poggiano su una
superficie (nemico: `y = superficie − altezza hitbox`; oggetto: `y = superficie − 8`); l'uscita (`exitX`) sta su un tratto di terreno.
Le ambientazioni disponibili sono `forest`, `castle`, `dungeon`. Il boss (livello 4) mantiene arena e posizioni invariate.

**Risultato atteso:** dopo il Castello Medievale compare "LIVELLO 3 – ROVINE ANTICHE"; raggiunta la porta in fondo si
passa al Dungeon (ora livello 4) con il boss; vinto il boss, la vittoria.

### Esempio 10 – Aggiungere un boss

**Obiettivo:** il **Re Scheletro**, un boss a **tre fasi**, che prende il posto del Cavaliere Nero nel livello del dungeon.

#### Passo 1 – `src/config/enemyConfig.ts`

**Cerca:** `BOSS_CATALOG`, in fondo al file.

Codice originale:
```ts
export const BOSS_CATALOG: Record<string, BossDefinition> = {
  [BOSS_CONFIG.id]: BOSS_CONFIG,
};
```
Codice aggiornato:
```ts
const SKELETON_KING_CONFIG: BossDefinition = {
  id: "skeletonKing",
  name: "RE SCHELETRO",
  maxHealth: 360,
  movementSpeed: 34,
  activationRange: 220,
  slashDamage: 22,
  slashRange: 36,
  slashWindupMs: 650,
  slashActiveMs: 200,
  slashRecoveryMs: 450,
  chargeDamage: 18,
  chargeSpeed: 150,
  chargeMinDistance: 70,
  chargeWindupMs: 800,
  chargeDurationMs: 600,
  chargeRecoveryMs: 800,
  attackCooldownMs: 1500,
  hitFlashMs: 100,
  deathDurationMs: 1500,
  scoreReward: 1500,
  hitbox: { x: 0, y: 0, width: 24, height: 40 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, chargeChance: 0.2 },
    { healthPercentThreshold: 66, speedMultiplier: 1.15, cooldownMultiplier: 0.85, chargeChance: 0.4 },
    { healthPercentThreshold: 33, speedMultiplier: 1.4, cooldownMultiplier: 0.7, chargeChance: 0.6 },
  ],
};

export const BOSS_CATALOG: Record<string, BossDefinition> = {
  [BOSS_CONFIG.id]: BOSS_CONFIG,
  [SKELETON_KING_CONFIG.id]: SKELETON_KING_CONFIG,
};
```

#### Passo 2 – `src/rendering/sprites/bossSprites.ts`

**Cerca:** `BOSS_SPRITE_STYLES`.

Codice originale:
```ts
    p: PALETTE.purple,
  },
};

const BLADE_KEYS: BladeKeys
```
Codice aggiornato:
```ts
    p: PALETTE.purple,
  },
  skeletonKing: {
    k: PALETTE.black,
    n: PALETTE.slate,
    d: PALETTE.gray,
    s: PALETTE.lightGray,
    w: PALETTE.white,
    r: PALETTE.cyan,
    e: PALETTE.cyan,
    y: PALETTE.yellow,
    c: PALETTE.violetDark,
    p: PALETTE.violet,
  },
};

const BLADE_KEYS: BladeKeys
```

#### Passo 3 – `src/config/levelConfig.ts`

**Cerca:** nel livello del dungeon, la riga `bossSpawn`.

Codice originale:
```ts
    bossSpawn: { x: 1320, y: 160 },
```
Codice aggiornato:
```ts
    bossId: "skeletonKing",
    bossSpawn: { x: 1320, y: 160 },
```

**Spiegazione.** Il catalogo `BOSS_CATALOG` associa un id a una `BossDefinition`; il livello sceglie il boss con `bossId`
(se omesso: Cavaliere Nero). Le animazioni (`BOSS_ANIMATIONS`) e gli sprite (`registerBossSprites`) si generano da soli per ogni
boss del catalogo, con il nome `<id>Idle1`, `<id>SlashA`, ecc.; per questo serve solo la mappa colori in `BOSS_SPRITE_STYLES`
(lettere: `k` contorno, `n` ombra profonda, `d` armatura, `s` luci, `w` corna e lama, `r` dettagli, `e` bagliore degli occhi e della scia,
`y` impugnatura e finiture, `c` e `p` mantello in ombra e in luce: tutte devono avere un colore). **Le fasi** sono l'elenco
`phases`, ordinato per soglia decrescente: una fase è attiva quando la salute in % scende sotto la sua soglia; l'HUD mostra
una tacca sulla barra per ogni soglia sotto il 100. **Limite:** tutti i boss condividono la forma dello sprite (hitbox 24×40
obbligatoria): per una silhouette diversa servirebbe disegnare nuove righe di sprite in `bossSprites.ts`.
Il tipo di attacchi (fendente e carica) è lo stesso: per attacchi nuovi va esteso `Boss.ts`.

**Risultato atteso:** nel dungeon l'avversario è un Re Scheletro (360 HP, armatura grigia, occhi azzurri) che cambia
comportamento a 66% e 33% di salute; la barra mostra due tacche.

### Esempio 11 – Aggiungere una nuova animazione

**Obiettivo:** un'animazione di **esultanza** (`cheer`): alla fine di un livello il cavaliere alza la spada, saltellando.

Servono: un nuovo stato del giocatore, due sprite, la definizione dell'animazione, la logica nel `Player` e la chiamata del motore.

#### Passo 1 – `src/types/EntityTypes.ts`

**Cerca:** `PlayerState`.

Codice originale:
```ts
  | "dodge"
  | "dead";
```
Codice aggiornato:
```ts
  | "dodge"
  | "cheer"
  | "dead";
```

#### Passo 2 – `src/rendering/sprites/knightSprites.ts`

**Cerca:** `registerKnightSprites`, il frame `knightIdle2`.

Codice originale:
```ts
    knightIdle2: composeKnightFrame(LEGS_STAND, 1),
```
Codice aggiornato:
```ts
    knightIdle2: composeKnightFrame(LEGS_STAND, 1),
    knightCheer1: composeAttackFrame({ tipX: 13, tipY: 0 }),
    knightCheer2: composeAttackFrame({ tipX: 13, tipY: 0, bodyDrop: 1 }),
```

#### Passo 3 – `src/config/animationConfig.ts`

**Cerca:** `PLAYER_ANIMATIONS`, la voce `idle`.

Codice originale:
```ts
  idle: { frameIds: ["knightIdle1", "knightIdle2"], frameDurationMs: 500, loop: true },
```
Codice aggiornato:
```ts
  idle: { frameIds: ["knightIdle1", "knightIdle2"], frameDurationMs: 500, loop: true },
  cheer: { frameIds: ["knightCheer1", "knightCheer2"], frameDurationMs: 250, loop: true },
```

#### Passo 4 – `src/entities/Player.ts` (variabile)

**Cerca:** `deathElapsedMs`.

Codice originale:
```ts
  private deathElapsedMs = 0;
```
Codice aggiornato:
```ts
  private deathElapsedMs = 0;
  private isCelebrating = false;
```

#### Passo 5 – `src/entities/Player.ts` (funzione)

**Cerca:** il commento di `respawnAt`.

Codice originale:
```ts
  /** Riporta il giocatore in una posizione, fermo (usato per cadute e nuovi livelli). */
```
Codice aggiornato:
```ts
  /** Il giocatore esulta: ignora i comandi e mostra l'animazione "cheer". */
  public celebrate(): void {
    this.isCelebrating = true;
    this.cancelAttack();
    this.velocityX = 0;
    this.animationPlayer.restart("cheer");
  }

  /** Riporta il giocatore in una posizione, fermo (usato per cadute e nuovi livelli). */
```

#### Passo 6 – `src/entities/Player.ts` (fine dell'esultanza)

**Cerca:** dentro `respawnAt`, le ultime due righe.

Codice originale:
```ts
    this.jumpBufferRemainingMs = 0;
    this.currentState = "idle";
```
Codice aggiornato:
```ts
    this.jumpBufferRemainingMs = 0;
    this.isCelebrating = false;
    this.currentState = "idle";
```

#### Passo 7 – `src/entities/Player.ts` (niente comandi mentre esulta)

**Cerca:** in `update`, il primo `if (this.isDead)`.

Codice originale:
```ts
    if (this.isDead) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
```
Codice aggiornato:
```ts
    if (this.isDead || this.isCelebrating) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
```

#### Passo 8 – `src/entities/Player.ts` (stato)

**Cerca:** `updateState`.

Codice originale:
```ts
    if (this.isDead) {
      this.currentState = "dead";
    } else if (this.hurtRemainingMs > 0) {
```
Codice aggiornato:
```ts
    if (this.isDead) {
      this.currentState = "dead";
    } else if (this.isCelebrating) {
      this.currentState = "cheer";
    } else if (this.hurtRemainingMs > 0) {
```

#### Passo 9 – `src/core/GameEngine.ts` (inizio dell'esultanza)

**Cerca:** `checkLevelCompletion`, la riga del bonus.

Codice originale:
```ts
      this.scoreManager.addScore(GAME_CONFIG.levelCompleteBonus);
```
Codice aggiornato:
```ts
      this.scoreManager.addScore(GAME_CONFIG.levelCompleteBonus);
      this.player.celebrate();
```

#### Passo 10 – `src/core/GameEngine.ts` (aggiornare il giocatore durante il messaggio)

**Cerca:** `updatePlaying`, il blocco `levelPhase === "completed"`.

Codice originale:
```ts
    if (this.levelPhase === "completed") {
      this.effects.update(deltaTimeSeconds);
```
Codice aggiornato:
```ts
    if (this.levelPhase === "completed") {
      this.effects.update(deltaTimeSeconds);
      this.player.update(
        deltaTimeSeconds,
        this.input,
        this.collisionSystem,
        this.levelManager.platforms,
        this.levelManager.level.width
      );
```

**Spiegazione.** Un'animazione si compone di tre pezzi. **(1) Sprite:** nuove righe registrate con `registerSprite`
(qui si riusa `composeAttackFrame`, la funzione che disegna il cavaliere con la spada sollevata). **(2) Definizione:**
una voce in `PLAYER_ANIMATIONS` con i `frameIds`, la durata di ogni frame e se si ripete (`loop`). **(3) Logica:** un valore
di `PlayerState` e un punto in cui il `Player` sceglie quell'animazione: `getAnimationName()` restituisce per
default il nome dello stato, quindi lo stato `"cheer"` seleziona da solo l'animazione `"cheer"`. Il motore, durante il
messaggio di fine livello, prima non aggiornava il giocatore: il passo 10 lo fa andare avanti.

**Risultato atteso:** raggiunta la porta (o sconfitto il boss) il cavaliere si ferma e alterna due pose con la spada in alto
finché non parte il livello successivo.

---

## 7. Verifica degli esempi

```bash
npm run verify-docs
```

Lo script `tools/verifyManualExamples.mjs` legge questo file e, per ogni esempio:

1. controlla che ogni "Codice originale" compaia **una sola volta** nel file indicato (se il codice cambia, l'esempio va aggiornato);
2. applica le modifiche a una **copia temporanea** del progetto (il tuo codice non viene toccato);
3. esegue il controllo dei tipi (`tsc --noEmit`);
4. esegue un controllo del **comportamento** specifico dell'esempio (per es. "la salute massima è 150", "il Bruto infligge 20 di danno",
   "il livello 3 è percorribile da un bot", "il Re Scheletro ha tre fasi");
5. stampa l'esito di ciascun esempio.

Controlli che richiedono il browser (per esempio come appare uno sprite) non fanno parte dello script: per quelli si prova il gioco con `npm run dev`.

Per **provare** un esempio senza modificare il tuo progetto:

```bash
npm run verify-docs -- --export 6 /percorso/della/cartella
```

scrive nella cartella indicata una copia del progetto con l'esempio 6 già applicato (poi `npm install` e `npm run dev` in quella cartella).

---

## 8. Problemi comuni

| Sintomo | Causa probabile |
|---|---|
| Errore TypeScript su `Record<EnemyTypeId, ...>` dopo aver aggiunto un nemico | manca la voce in `ENEMY_CONFIG` o in `ENEMY_ANIMATIONS` |
| "Sprite non registrato: xyz" | l'id in un'animazione non corrisponde a uno sprite registrato |
| "Sprite xyz: righe di lunghezza diversa" | una riga di testo dello sprite è più corta o più lunga delle altre |
| "Sprite xyz: colore 'q' non definito" | una lettera dello sprite non è nella mappa dei colori |
| "Livello non trovato" o il gioco finisce troppo presto | gli `id` dei livelli non sono consecutivi da 1 |
| Un nemico cade nel vuoto o sta a mezz'aria | la sua `y` non è `superficie − altezza dell'hitbox` |
| Il gioco non parte con il doppio clic su `index.html` della cartella principale | si deve aprire `dist/index.html` dopo `npm run build`, non l'`index.html` dei sorgenti |
