# Architettura

Versione descritta: **2.0.0-alpha.1**. Questo documento spiega **come è pensato** il gioco e **perché**. Per l'elenco dei file e delle
funzioni vedere `CODE_MANUAL.md`.

---

## 1. Obiettivi e vincoli di progetto

| Obiettivo | Come è stato ottenuto |
|---|---|
| Si avvia con un doppio clic, senza Node.js | la build produce un unico script classico con percorsi relativi; nessun asset esterno |
| Facile da modificare | i numeri sono in `src/config/`; i contenuti (livelli, nemici, oggetti) sono dati |
| Stile 16 bit coerente | risoluzione 320×240, palette a rampe (al massimo 64 colori), retini e gradienti a fasce, scala intera, font a pixel, nessuna trasparenza né colore fuori palette |
| Velocità coerente | loop con delta time; tutta la fisica in unità al secondo |
| Espandibile | punti di estensione espliciti (sezione 10) senza anticipare funzioni future |
| Semplice | nessun framework né motore; una sola classe di coordinamento (`GameEngine`) |

**Tecnologie:** TypeScript (strict), HTML5 Canvas, CSS3, Vite, npm, moduli ES. Nessuna dipendenza di esecuzione: in
`package.json` ci sono solo `typescript` e `vite` (di sviluppo).

### Perché la build è "classica" e non a moduli ES

I browser bloccano `<script type="module">` quando la pagina è aperta da `file://` (doppio clic). Il plugin in `vite.config.ts`
produce quindi un unico file `assets/game.js` in formato **IIFE** e lo carica con `<script defer>`, con percorsi relativi.
Verificato in Chromium; senza server HTTP. Se in futuro si caricassero risorse con `fetch`, quelle richiederebbero un server.

### Perché sprite e sfondi sono nel codice

Gli sprite sono righe di testo (`"..kkkk.."`) registrate all'avvio; gli sfondi sono rettangoli. Così non esistono file immagine da
caricare (nessun problema di `file://`, nessun ritardo di caricamento) e lo stile resta coerente. Il prezzo: disegnare nuova grafica
significa scrivere testo, non usare un editor di immagini. Le cartelle `public/assets/*` sono pronte per risorse esterne ma oggi vuote.

---

## 2. Visione d'insieme

```
                              ┌────────────────────┐
   tastiera ───────────────►  │   InputManager     │  azioni (premuto / tenuto / rilasciato)
                              └─────────┬──────────┘
                                        │
 requestAnimationFrame ─►┌──────────────▼───────────────┐
                         │          GameLoop            │  delta time (secondi)
                         └──────────────┬───────────────┘
                                        │ update(dt) → render()
                         ┌──────────────▼───────────────┐
                         │         GameEngine           │◄── GameState (title, playing, ...)
                         └─┬──────┬──────┬──────┬───────┘
         ┌─────────────────┘      │      │      └──────────────────┐
         ▼                        ▼      ▼                         ▼
  LOGICA DI GIOCO           SISTEMI   PRESENTAZIONE            CONFIGURAZIONE
  Player, Enemy, Boss,      Collision, Renderer, Camera,       config/*  (dati)
  Item                      EnemyAI,   SpriteManager,          types/*   (tipi)
  CombatSystem,             LevelMgr,  AnimationPlayer,
  ComboManager              ItemMgr,   EffectsManager,
                            Score,     HUDManager,
                            Lives,     ScreenManager
                            HighScore
```

Tre strati, con una regola semplice: **la logica non disegna** (le entità hanno un `render` che delega al renderer, ma le regole di gioco non
dipendono dal canvas) e **la configurazione non contiene logica**. La logica importa la configurazione, mai il contrario.

---

## 3. Il Game Loop

`GameLoop` usa `requestAnimationFrame`. A ogni frame:

1. calcola `deltaTimeSeconds = (adesso − precedente) / 1000`, con **tetto a 0,05 s** (`maxDeltaTimeSeconds`) e **0 al primo frame**;
2. chiama `GameEngine.update(dt)`;
3. chiama `GameEngine.render()`;
4. richiede il frame successivo.

**Perché un passo variabile con tetto e non un passo fisso.** È la soluzione più semplice che dà una velocità indipendente dagli FPS:
ogni movimento è `velocità × dt`. Il tetto impedisce che dopo un cambio di scheda del browser (frame lunghissimo) il gioco "teletrasporti"
le entità attraverso i muri. Con `maxFallSpeed` 400 px/s e `dt` massimo 0,05 s lo spostamento verticale per frame resta ≤ 20 px: inferiore allo
spessore delle piattaforme, quindi niente "tunneling". È stata verificata l'indipendenza dagli FPS (30 contro 120 fps danno la stessa posizione).

**Integrazione della gravità.** `CollisionSystem.applyGravityAndMove` calcola lo spostamento verticale con la **velocità media** del frame: con gravità costante la parabola è esatta,
quindi altezza e durata del salto non dipendono dagli FPS (con la sola velocità finale il salto sarebbe stato più basso a frequenze basse: 45,8 px a 20 FPS contro 53,4).

**Hit-stop.** Quando il motore vuole "congelare" per qualche istante (colpo a segno), `update` scala solo il timer del hit-stop e ritorna
senza aggiornare il mondo né consumare gli input: un tasto premuto in quell'intervallo viene letto subito dopo.

---

## 4. Gestione degli stati

`GameState` è una piccola macchina a stati con transizioni esplicite; tentare una transizione non prevista restituisce `false` e non cambia nulla.

| Da | A (transizioni ammesse) |
|---|---|
| `title` | `controls`, `playing` |
| `controls` | `title` |
| `playing` | `paused`, `gameOver`, `victory` |
| `paused` | `playing`, `title` |
| `gameOver` | `title`, `playing` (è il "Riprova") |
| `victory` | `title` |

Un cambio di stato imposta il **contesto di input** (`gameplay` solo in `playing`, `menu` altrove) e azzera i cursori dei menu.
All'interno di `playing` il motore distingue ancora due **fasi del livello**: `playing` e `completed` (messaggio di fine livello).

---

## 5. Gestione dell'input

`InputManager` è l'unico punto che parla con la tastiera:

- **Tasti → azioni.** `CONTROLS_CONFIG` associa a ogni azione (`GameAction`) uno o più codici tasto. Lo stesso tasto può avere più azioni
  (W è sia *salto* sia *menu su*).
- **Eventi per frame.** `wasPressed` e `wasReleased` valgono per **un solo frame** (`endFrame()` li azzera); `isHeld` vale finché il tasto è premuto.
  L'auto-repeat del sistema operativo viene ignorato.
- **Contesti.** `INPUT_CONTEXT_ACTIONS` indica quali azioni sono ammesse in `gameplay` e in `menu`: in pausa e nei menu salto e attacco semplicemente
  non esistono, quindi non serve controllarlo altrove.
- **Robustezza.** Alla perdita del focus tutti i tasti vengono rilasciati (altrimenti resterebbero "incastrati").
- **Testabilità.** Le entità non conoscono `InputManager` ma l'interfaccia `InputSource` (`isHeld`, `wasPressed`, `wasReleased`): nei test e nel
  simulatore di bilanciamento basta un oggetto finto.

Per cambiare i tasti basta modificare `CONTROLS_CONFIG`.

---

## 6. Rendering

- **Canvas a risoluzione fissa.** `Renderer` lavora sempre in 320×240 (`GAME_CONFIG.internalWidth/Height`); il canvas viene ingrandito con CSS di un **fattore intero di pixel FISICI** (il massimo che entra
  nella finestra, calcolato con `devicePixelRatio`), con `image-rendering: pixelated`. Ragionare in pixel fisici evita pixel irregolari con la scala di sistema frazionaria (125%, 150%) tipica dei
  portatili Windows. Verificato con 17 combinazioni di finestra e scala (vedi `TESTING.md`); con 150% e 300% il browser non riesce a dimensionare il canvas esattamente al pixel fisico e il bordo
  può sfumare di 1 pixel.
- **Rettangoli a pixel interi.** `Renderer.fillRect` arrotonda **tutti e quattro** i bordi: con coordinate frazionarie il browser sfumerebbe i bordi creando colori fuori palette.
- **Niente testo del browser.** Il testo del canvas sarebbe sfocato: `BitmapFont` disegna pixel per pixel un font con maiuscole (5×7), minuscole con discendenti (altezza totale 9 righe) e spaziatura proporzionale; le cifre restano a larghezza fissa perché i numeri dell'HUD non "ballino". `drawText` accetta un colore d'ombra.
- **Sprite come testo.** `SpriteManager.registerSprite` trasforma righe di caratteri in piccoli canvas (uno normale, uno specchiato, due "bianchi" per il
  lampo di danno). Disegnare uno sprite è un `drawImage`.
- **Animazioni.** `AnimationPlayer` riproduce un'animazione definita da `frameIds` e durate (uguali per tutti i frame o per ciascuno). Le animazioni di
  attacco derivano la durata dei frame dalla durata dell'attacco, così non si disallineano se si ritocca il bilanciamento.
- **Camera.** `Camera.follow` centra il bersaglio e limita ai bordi della mappa; coordinate intere.
- **Ordine di disegno** (`GameEngine.render`): sfondo con parallasse → porta/terreno → oggetti → nemici → boss → giocatore → effetti → HUD → messaggi → schermata
  dello stato (pausa, ecc.).
- **Tremolio dello schermo:** si sposta temporaneamente la camera di pochi pixel interi solo per il disegno del mondo (non dell'HUD).
- **Sfondi.** `BackgroundRenderer` disegna 2-3 livelli di profondità per ambientazione; i livelli lontani scorrono più piano (parallasse).
- **Pausa.** Oscuramento con un retino a scacchi di pixel (un'immagine creata una volta sola): niente trasparenze.

### 6.1 Strumenti grafici a 16 bit (versione 2.0)

Le console a 16 bit non avevano più "potenza" per disegnare sfumature vere: ottenevano profondità con **rampe** di colore, **retini**
e **trucchi di palette**. Il gioco fa lo stesso, con una regola che i test controllano su ogni schermata: **nessun pixel fuori palette**.

| Strumento | Dove | Come funziona |
|---|---|---|
| Palette a rampe | `config/paletteConfig.ts` | `PALETTE` (colori con nome, al massimo `MAX_PALETTE_COLORS` = 64) e `PALETTE_RAMPS` (gruppi di 4-6 tonalità dal più scuro al più chiaro). I 16 colori della 1.0 sono invariati e fanno parte delle rampe |
| Retino ordinato | `PaletteEffects.isDitherPixelOn`, `Renderer.fillDithered` | matrice di Bayer 4×4: con livello *n* (0-16) sono accesi *n* pixel su 16. Il motivo (4×4 pixel, creato una volta per coppia di colori e livello) è ancorato all'origine dello schermo, quindi aree vicine si raccordano |
| Gradiente a fasce | `computeGradientBands`, `Renderer.fillVerticalGradient` | divide l'altezza in fasce piene raccordate da fasce a retino (livelli 0, 4, 8, 12): i cieli "a strisce" tipici dei 16 bit |
| Ciclo dei colori | `cycleRampColor` | il colore scorre lungo una rampa (`loop` o `pingPong`): fiamme, acqua, lava, cristalli senza nuovi sprite |
| Ombreggiatura | `shadeColor(colore, passi)` | sposta un colore lungo la sua rampa (negativo = più scuro) |
| Ondulazione per riga | `computeLineWaveOffset`, `Renderer.applyLineWave` | effetto "raster": ogni riga di una fascia dello schermo viene spostata di un numero intero di pixel secondo un'onda. Va chiamato dopo aver disegnato ciò che deve ondulare |
| Sagome colorate | `SpriteManager.drawSpriteSilhouette` | sagoma a tinta unita di uno sprite (creata alla prima richiesta e conservata); il lampo bianco dei colpi è un caso particolare |
| Contorni e varianti | `addOutline`, `remapSpriteKeys` (`sprites/spriteTools.ts`) | si disegna solo l'interno dello sprite e il contorno si genera da solo; le varianti si ottengono sostituendo i caratteri |

**Perché 320×240.** È una risoluzione reale delle console a 16 bit e ha la **stessa altezza** della 1.0: la geometria dei livelli (terreno a `y = 200`,
salti, abissi) non cambia, la vista è solo più larga. Le schermate e l'HUD sono disposti rispetto al centro e ai bordi, non a coordinate fisse.

**Variazione rispetto al prompt iniziale.** Il prompt della 1.0 chiedeva grafica a 8 bit (256×240, palette limitata). La 2.0 passa ai 16 bit per scelta
del progetto; restano tutte le altre regole di stile: pixel nitidi, scala intera, palette limitata, nessuna sfumatura del browser.

---

## 7. Entità

`GameObject` è la base: posizione (angolo in alto a sinistra dell'hitbox), velocità, direzione, `isOnGround`, `getBounds()`.

| Entità | Chi la comanda | Note |
|---|---|---|
| `Player` | `InputManager` (tramite `InputSource`) | timer interni per attacco, schivata, danno, invulnerabilità, salto |
| `Enemy` | `EnemyAISystem` | decide `EnemyAISystem`, esegue `Enemy`: separa "cosa voglio fare" da "come lo faccio" |
| `Boss` | se stesso (IA interna) | stati propri, due attacchi, fasi |
| `Item` | nessuno | non ha fisica; `ItemManager` gestisce raccolta ed effetti |

**Stato derivato, non memorizzato.** Il `Player` mantiene timer (`hurtRemainingMs`, `dodgeRemainingMs`, `currentAttack`...) e ricalcola ogni frame
lo stato (`idle`, `walk`, `attack`...) con una priorità fissa. È più semplice e robusto di una macchina a stati con transizioni manuali: non esistono stati
"incoerenti" (per esempio schivare e attaccare insieme).

**Movimento e collisioni.** `CollisionSystem.moveAndCollide` muove prima sull'asse X, risolve, poi sull'asse Y e risolve: così gli urti orizzontali e verticali non si confondono. Le piattaforme sospese (`oneWay`) bloccano solo chi **cade** dall'alto
(se prima era sopra la piattaforma). `isOnGround` si ricalcola a ogni frame.

**Tolleranza nel salto.** *Coyote time* (80 ms dopo aver lasciato un bordo si salta ancora) e *salto anticipato* (100 ms): rendono il gioco più
indulgente senza cambiare le regole.

**Difficoltà.** `DIFFICULTY_CONFIG` definisce tre moltiplicatori (salute e danno dei nemici) e `Enemy` li applica alla creazione. Oggi il livello usa sempre
`normal` e **non c'è un selettore di difficoltà in gioco** (vedi `FEATURES.md`).

---

## 8. Combattimento

```
 input ─► Player.handleInput ─► ComboManager.getNextAttack ─► AttackDefinition
                                                                   │
              (finestra hitStartMs…hitEndMs)                       ▼
 Player.getActiveAttackHitbox() ─► CombatSystem.processPlayerAttack ─► target.receiveHit(...)
                                        │                                   │
                                  Damageable[]  (Enemy, Boss)         punti, effetti, hit-stop
```

- **Attacchi come dati.** `ATTACK_DEFINITIONS` descrive ogni attacco (danno, durata, finestra attiva, recupero, area, animazione). Nessuna logica per
  attacco: si aggiunge un attacco aggiungendo dati.
- **Combo statiche.** `COMBO_DEFINITIONS` elenca sequenze di input e attacchi. `ComboManager` fa prefisso-matching: continua la combo se l'input è la mossa
  successiva di una combo definita, altrimenti riparte; se nessuna combo inizia con quell'input usa `DEFAULT_ATTACK_BY_INPUT`.
- **Buffer degli attacchi.** Un attacco premuto in anticipo viene memorizzato solo se potrà partire entro `attackBufferMs` (200 ms) e scade comunque dopo lo stesso tempo (`Player.bufferAttack`, `getMsUntilAttackAllowed`). Senza questo limite, premendo a raffica, il cavaliere avrebbe continuato ad attaccare anche dopo aver smesso di premere (difetto presente fino alla 0.9.0).
- **Un colpo per attacco.** `targetsHitByCurrentAttack` evita di colpire lo stesso bersaglio più volte con la stessa mossa.
- **Interfaccia `Damageable`.** `CombatSystem` non sa se il bersaglio è un nemico o un boss: gli basta `isAlive`, `getBounds()`, `receiveHit()`.
- **Interruzioni.** Un colpo subito interrompe l'attacco del giocatore. Per i nemici dipende da `attackInterruptWindowMs`: solo i primissimi istanti
  della preparazione (scheletro) oppure mai (goblin, soldato). È la leva principale del bilanciamento (vedi `BALANCE.md`).
- **Schivata.** Invulnerabilità per tutta la durata (`dodgeRemainingMs`), consentita solo a terra e fuori da un attacco.
- **Danno al giocatore.** `takeDamage` ignora il colpo se invulnerabile (post-colpo o schivata); altrimenti applica salute, rinculo, stordimento e un secondo di
  invulnerabilità. **Il rinculo è protetto dai bordi:** durante lo stordimento, se nella direzione del movimento non c'è terreno entro `knockbackLedgeCheckDepth`, la velocità orizzontale si azzera, così un nemico vicino a un abisso non può spingere il giocatore giù (`Player.hasGroundInDirectionOfMovement`). `takeEnvironmentalDamage` (cadute) non causa rinculo.
- **Calcolo del danno.** Una sola funzione, `CombatSystem.calculateDamage(base, moltiplicatore)`, è il punto dove in futuro passeranno moltiplicatori e riduzioni.

### Il boss

`Boss` ha una macchina a stati esplicita (`dormant → idle/walk → slash | chargeWindup → charging → recovery → idle`, `dead`). Il prossimo attacco viene
**sorteggiato una volta per pausa** (non a ogni frame) e se è una carica il boss **aspetta a distanza** invece di avvicinarsi. Le **fasi** sono dati
(`phases`): la fase corrente è l'ultima la cui soglia di salute è ≥ della salute attuale. L'HUD legge le soglie dalla definizione del boss.

---

## 9. Livelli

Un livello è un oggetto `LevelDefinition`: nome, ambientazione, dimensioni, partenza, piattaforme, nemici (tipo + posizione), oggetti, condizione di
completamento (`reachExit` o `defeatBoss`), eventuale boss (`bossId`, `bossSpawn`) e arena (`bossArenaStartX`). **Nessun livello è codice.**

- `LevelManager` carica un livello, crea i nemici (`createEnemies`) e il boss (`createBoss`), tiene le piattaforme **attive** (quelle del livello più il cancello
  dell'arena quando si chiude) e disegna sfondo, terreno, porta d'uscita e cancello.
- `GameEngine` gestisce il flusso: `startLevel(id)` → gioco → `checkLevelCompletion()` → messaggio → `advanceToNextLevel()` (id + 1, oppure vittoria).
  **Gli id devono essere consecutivi da 1.**
- **Punto sicuro.** Il motore ricorda l'ultima posizione in cui il giocatore poggiava **interamente** sul terreno; dopo una caduta si riparte da lì.
- **Arena.** Superata `bossArenaStartX` (+24 px) viene aggiunta una piattaforma solida alle spalle del giocatore, disegnata come cancello a sbarre.

**Regole di progettazione (verificate dai test):** abissi ≤ 36 px, piattaforme raggiungibili con una salita ≤ 44 px, nemici e oggetti appoggiati su una superficie,
uscita su terreno. `npm run verify-docs` applica le stesse regole al livello aggiunto nell'esempio 9 del manuale.

---

## 10. Punti di estensione futuri

Questa sezione descrive **dove** si innesterebbero le funzioni previste dalla roadmap. **Nessuna di queste funzioni è implementata**: esistono solo i punti
d'aggancio elencati, volutamente minimi.

| Funzione futura | Versione prevista | Punto d'aggancio oggi | Che cosa servirebbe |
|---|---|---|---|
| Nuove combo | già possibile | `COMBO_DEFINITIONS` | solo dati (esempio 5 del manuale) |
| Nuovi nemici / boss / oggetti / livelli | già possibile | `ENEMY_CONFIG`, `BOSS_CATALOG`, `ITEM_CONFIG`, `LEVEL_CONFIG` | solo dati e sprite (esempi 6-10) |
| Power-up temporanei e permanenti | 1.2 | `Player.getDamageMultiplier()` e `CombatSystem.calculateDamage()` | un elenco di **modificatori** nel giocatore, separato dalle statistiche base di `PLAYER_CONFIG` (vedi sotto) |
| Danni elementali | 1.2-1.3 | `calculateDamage()` e `HitResult` | un tipo di elemento nell'attacco e un effetto sul bersaglio |
| Attacchi speciali, magie, abilità | 1.2-1.3 | `GameAction`, `Player.handleInput`, `ATTACK_DEFINITIONS` | nuove azioni nei controlli, un costo (risorsa) e un nuovo stato di animazione |
| Nuove armi | 1.3 | `ATTACK_DEFINITIONS`, `COMBO_DEFINITIONS` | oggi esiste un solo insieme globale di attacchi: servirebbe una `WeaponDefinition` con i propri attacchi e combo, scelta dal giocatore |
| Boss con più fasi o attacchi diversi | 1.1 | `BossDefinition.phases` | più fasi sono già dati; **nuovi attacchi** richiedono di estendere `Boss.ts` |
| Nuove ambientazioni | 1.1 | `ThemeId`, `THEME_STYLES`, `BackgroundRenderer` | un nuovo caso in `BackgroundRenderer.render` e i colori del terreno |
| Personaggi alternativi, equipaggiamento | 2.0 | `PLAYER_CONFIG`, `knightSprites.ts` | un `CharacterDefinition` che sostituisce la configurazione e gli sprite del giocatore |
| Classifica di punteggi | pianificata | `HighScoreManager` | salvare un elenco invece di un solo valore |
| Selettore di difficoltà | da implementare | `DIFFICULTY_CONFIG` (già presente) | un menu e passare la scelta a `LevelManager.createEnemies` |
| Audio | escluso dal progetto | eventi già individuabili in `GameEngine` (colpi, raccolte, morte) | un `AudioManager` chiamato da quei punti |

### Come si distinguerebbero statistiche base e modificatori (progetto, non codice esistente)

Il requisito è che "la scadenza di un power-up ripristini i valori precedenti senza perdere gli altri". La strada più semplice è **non modificare mai** i valori base:

```text
valoreEffettivo(stat) = (base[stat] + somma dei bonus additivi attivi) × prodotto dei moltiplicatori attivi
```

Ogni power-up sarebbe un oggetto con `id`, `name`, `description`, `type` (temporaneo/permanente), `effect` (quali statistiche e come), `durationMs` e
`requirements`. Il giocatore terrebbe una lista di quelli attivi e, a ogni frame, scarterebbe quelli scaduti: il valore effettivo si ricalcola dalla lista,
quindi rimuovere uno non può danneggiare gli altri. I punti dove oggi si leggono le statistiche (`PLAYER_CONFIG.movementSpeed`, `getDamageMultiplier()`, `calculateDamage`)
sarebbero i luoghi da sostituire con `valoreEffettivo`.

---

## 11. Testabilità e strumenti

| Strumento | Cosa fa |
|---|---|
| `npm run typecheck` | controllo dei tipi (strict) |
| `npm run build` | controllo dei tipi + build distribuibile in `dist/` |
| `npm test` | 308 controlli unitari in Node (meno di 1 secondo) |
| `npm run test:browser` | 165 controlli nel browser: build reale con `file://`, dimensioni di schermo, bot che gioca tutto il gioco con eventi di tastiera, tasti a caso, velocità sotto carico (richiede Playwright) |
| `npm run balance` | simulatore di bilanciamento con un bot (usa le classi reali, senza grafica) |
| `npm run verify-docs` | applica gli esempi del `CODE_MANUAL.md` a una copia del progetto e ne verifica compilazione e comportamento |

Il codice di gioco non dipende dal DOM tranne dove deve (`Renderer`, `SpriteManager`, `InputManager`, `GameEngine`): per questo `Player`, `Enemy`, `Boss`,
`CollisionSystem`, `CombatSystem`, ecc. si possono eseguire in Node, ed è ciò che fanno il simulatore, lo script di verifica e i test unitari. Il dettaglio di che cosa è verificato, e che cosa no, è in `TESTING.md`.

---

## 12. Decisioni e compromessi (riassunto)

| Decisione | Alternativa scartata | Motivo |
|---|---|---|
| Un solo `GameEngine` che coordina | molti gestori con eventi | più semplice da leggere; il progetto è piccolo |
| Delta time variabile con tetto | passo fisso con accumulatore | meno codice, sufficiente per un gioco arcade a velocità basse |
| Stato derivato per il giocatore | macchina a stati con transizioni | evita combinazioni incoerenti |
| Sprite come testo | immagini PNG | si avvia con doppio clic, nessun caricamento, facile da ritoccare |
| Contenuti come dati | codice per livello/nemico | aggiungere contenuti senza toccare il motore |
| Boss con IA interna | `EnemyAISystem` anche per i boss | il boss ha stati e attacchi diversi dai nemici normali |
| Nessun audio | `AudioManager` | escluso dal progetto |
