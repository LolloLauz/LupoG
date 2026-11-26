# Architettura

Versione descritta: **2.5.0**. Questo documento spiega **come è pensato** il gioco e **perché**. Per l'elenco dei file e delle
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

Gli sprite sono righe di testo (`"..kkkk.."`) registrate all'avvio; gli sfondi sono disegnati dal codice (rettangoli, retini, gradienti). Così non esistono file immagine da
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
| `title` | `controls`, `levelSelect`, `characterSelect`, `confirmReset`, `playing` |
| `controls` | `title` |
| `levelSelect` (2.0) | `title`, `playing` |
| `characterSelect`, `confirmReset` | `title` |
| `shop` (bottega a menu) | `playing` |
| `playing` | `paused`, `gameOver`, `victory`, `shop`, `equipment`, `attributes` |
| `paused` | `playing`, `title`, `equipment` |
| `equipment` (E4) | `playing`, `paused` (si torna da dove si era), `attributes` |
| `attributes` (Classi Fase 4) | `equipment`, `playing` (pentagono: in sola lettura dall'equipaggiamento, in spesa dall'altare della bottega) |
| `gameOver` | `title`, `playing` (è il "Riprova") |
| `victory` | `title` |

Un cambio di stato imposta il **contesto di input** (`gameplay` solo in `playing`, `menu` altrove) e azzera i cursori dei menu.
All'interno di `playing` il motore distingue ancora due **fasi del livello**: `playing` e `completed` (messaggio di fine livello).
Anche la **stanza del negozio** (E6) è `playing`: è un livello speciale (`SHOP_ROOM_LEVEL`, `GameEngine.isInShopRoom`) caricato tra un livello e
l'altro; la bottega a menu (`shop`) resta come ripiego. Nella stanza c'è anche l'**altare** degli attributi (Classi Fase 4): **E** vicino porta allo stato `attributes` in modalità spesa.
`GameEngine.equipmentReturnState` ricorda se l'equipaggiamento è stato aperto da `playing` o da `paused`: chiudendolo si torna lì, anche dopo essere passati dal pentagono.

---

## 5. Gestione dell'input

`InputManager` è l'unico punto che parla con la tastiera:

- **Tasti → azioni.** `CONTROLS_CONFIG` associa a ogni azione (`GameAction`) uno o più codici tasto. Lo stesso tasto può avere più azioni
  (W è sia *salto* sia *menu su*).
- **Eventi per frame.** `wasPressed` e `wasReleased` valgono per **un solo frame** (`endFrame()` li azzera); `isHeld` vale finché il tasto è premuto.
  L'auto-repeat del sistema operativo viene ignorato.
- **Comandi (2.1).** `attack` = J, `heavyAttack` = K, `dodge` = Shift sinistro; Spazio non è assegnato. Le mosse speciali sono quattro azioni,
  `ability1`-`ability4` (tasti 7, 8, 9 e 0, anche del tastierino numerico; L è un alias di `ability1`; 5 e 6 non sono assegnati). `ABILITY_SLOT_ACTIONS` (`controlsConfig.ts`) dice quale
  azione comanda ogni slot: `Player.handleInput` cerca il tasto premuto, sceglie lo slot con `selectAbilitySlot` (non durante un attacco o una
  schivata; uno slot vuoto non fa niente, uno non ancora imparato è rifiutato e avvisa) e avvia l'abilità; lo scudo resta alzato finché è tenuto il tasto del suo slot. L'HUD mostra un riquadro per ogni slot (`HUDData.abilities`), con la cifra
  del tasto presa da `ABILITY_SLOT_KEY_LABELS` (`controlsConfig.ts`).
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
  portatili Windows. **2.0:** i browser misurano le dimensioni CSS in multipli di 1/64 di pixel, quindi non ogni misura in pixel fisici è esprimibile
  (1280 pixel fisici al 300% = 426,667 px CSS diventerebbero 1279,97 e l'immagine verrebbe ricampionata). `computeIntegerScale` prende la scala intera più grande
  che entra nella finestra **e** che il browser rappresenta con meno di 0,01 pixel di scarto. Verificato con 17 combinazioni di finestra e scala (vedi `TESTING.md`).
- **Rettangoli a pixel interi.** `Renderer.fillRect` arrotonda **tutti e quattro** i bordi: con coordinate frazionarie il browser sfumerebbe i bordi creando colori fuori palette.
- **Niente testo del browser.** Il testo del canvas sarebbe sfocato: `BitmapFont` disegna pixel per pixel un font con maiuscole (5×7), minuscole con discendenti (altezza totale 9 righe) e spaziatura proporzionale; le cifre restano a larghezza fissa perché i numeri dell'HUD non "ballino". `drawText` accetta un colore d'ombra.
- **Sprite come testo.** `SpriteManager.registerSprite` trasforma righe di caratteri in piccoli canvas (uno normale e uno specchiato; le sagome a
  tinta unita per il lampo di danno si creano alla prima richiesta). Disegnare uno sprite è un `drawImage`.
- **Sprite più grandi dell'hitbox (2.0).** Gli sprite a 16 bit sporgono dall'hitbox (pennacchio, corna, spada, mantello) ma le hitbox sono quelle
  della 1.0, quindi bilanciamento e livelli non cambiano. Ogni sprite si registra con una **colonna d'ancoraggio** (`anchorX`: dove inizia l'hitbox
  nell'immagine rivolta a destra); `SpriteManager.drawSpriteAligned` appoggia i piedi sul fondo dell'hitbox e, se l'entità guarda a sinistra, specchia
  l'immagine tenendo l'hitbox nello stesso punto, così ciò che sporge davanti passa dall'altra parte. Tutti i frame di un personaggio hanno la stessa
  ancora (controllato dai test).
- **PixelPainter.** Le primitive di disegno (rettangoli interi, retini, gradienti, cerchi, aloni, testo) sono in `PixelPainter`, che lavora su
  qualsiasi canvas; `Renderer` lo estende con la scala intera, l'oscuramento della pausa e l'ondulazione per riga. Così gli sfondi possono disegnare
  i loro livelli in canvas separati con gli stessi strumenti.
- **Animazioni.** `AnimationPlayer` riproduce un'animazione definita da `frameIds` e durate (uguali per tutti i frame o per ciascuno). Le animazioni di
  attacco derivano la durata dei frame dalla durata dell'attacco, così non si disallineano se si ritocca il bilanciamento.
- **Camera.** `Camera.follow` centra il bersaglio e limita ai bordi della mappa; coordinate intere.
- **Ordine di disegno** (`GameEngine.render`): sfondo con parallasse → porta/terreno → oggetti → nemici → boss → giocatore → effetti → HUD → messaggi → schermata
  dello stato (pausa, ecc.).
- **Tremolio dello schermo:** si sposta temporaneamente la camera di pochi pixel interi solo per il disegno del mondo (non dell'HUD).
- **Sfondi (2.0).** `BackgroundRenderer` compone per ogni ambientazione 4-6 livelli di parallasse più alcuni elementi animati. Come sulle console
  a 16 bit, ogni livello statico si disegna **una sola volta** (alla prima richiesta) in un canvas largo 640 pixel il cui contenuto si ripete senza
  cuciture (armoniche intere, spaziature che dividono 640, elementi ridisegnati a ±640); a ogni frame si copia spostato con uno o due `drawImage`.
  Si disegnano a ogni frame solo stelle (ciclo dei colori), luna con alone, nebbia a retino e torce. Misura: circa 0,8 ms per aggiornamento più
  disegno in Chrome senza GPU.
  - Foresta: cielo a fasce, stelle, luna con alone, montagne con creste illuminate e neve, foschia, colline, tre file di pini ombreggiati, nebbia a terra.
  - Castello: cielo a fasce, stelle, colline, castelli lontani con tetti conici e finestre accese, mura merlate in mattoni ombreggiati con edera,
    colonne cilindriche con stendardi.
  - Dungeon: muro di mattoni ombreggiati con muschio e crepe, celle ad arco con sbarre, torce con alone e fiamma a ciclo dei colori, catene, foschia.
  - Palude (2.0 Fase 4): cielo torbido, luna malata dietro le nuvole, alberi morti e salici piangenti, nebbia a retino, lucciole a ciclo dei colori.
  - Picchi Ghiacciati: alba con aurora boreale (nastri ondulati a retino), due catene di montagne innevate, pini con la neve, nevicata a due velocità.
  - Torre dell'Ombra: cielo in tempesta con fulmini lontani, rovine che fluttuano, muro viola con vetrate gotiche a ciclo dei colori, bracieri di fuoco magico.
- **Terreno (2.0).** `TerrainRenderer` disegna le piattaforme con la tessitura dell'ambientazione (`THEME_STYLES` in `levelConfig.ts`): erba e terra
  con sassi, piastrelle di pietra smussate, mattoni del dungeon; piattaforme sospese come assi con giunti e ombra a retino; porta d'uscita con arco
  di pietra e luce calda; cancello a saracinesca. Tessiture aggiunte nella Fase 4: fango e muschio con canne palustri e bolle (`swampMud`), neve e roccia con
  ghiaccioli (`snowAndRock`), pietra con rune luminose a ciclo dei colori (`runeStone`). L'acqua prende i colori dell'ambientazione (`waterColors`). I motivi sono ancorati alle coordinate del mondo e si disegna solo la parte visibile.
- **Interfaccia (2.0).** HUD su pannello metallico a fasce con bordo dorato; salute a segmenti ombreggiati; con il mana (2.2.0) stamina e mana su due barre da 3 px (`STAMINA_BAR_WITH_MANA_GEOMETRY`, `MANA_BAR_GEOMETRY`), mentre senza mana la barra è quella di prima; titoli con riempimento a fasce
  (`rowColors` di `drawText`); riquadri decorati (`drawOrnateFrame`) per messaggi, menu e schermate.
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
| `Enemy` | `EnemyAISystem` | decide `EnemyAISystem`, esegue `Enemy`: separa "cosa voglio fare" da "come lo faccio". Varianti (2.0): a distanza e volante |
| `Boss` | se stesso (IA interna) | stati propri, attacchi come dati, fasi |
| `Projectile` (2.0) | `ProjectileSystem` | si muove dritto (o ad arco), scade; contatti gestiti dal sistema |
| `Item` | nessuno | non ha fisica; `ItemManager` gestisce raccolta ed effetti |

**Stato derivato, non memorizzato.** Il `Player` mantiene timer (`hurtRemainingMs`, `dodgeRemainingMs`, `currentAttack`...) e ricalcola ogni frame
lo stato (`idle`, `walk`, `attack`...) con una priorità fissa. È più semplice e robusto di una macchina a stati con transizioni manuali: non esistono stati
"incoerenti" (per esempio schivare e attaccare insieme).

**Movimento e collisioni.** `CollisionSystem.moveAndCollide` muove prima sull'asse X, risolve, poi sull'asse Y e risolve: così gli urti orizzontali e verticali non si confondono. Le piattaforme sospese (`oneWay`) bloccano solo chi **cade** dall'alto
(se prima era sopra la piattaforma). `isOnGround` si ricalcola a ogni frame.

**Tolleranza nel salto.** *Coyote time* (80 ms dopo aver lasciato un bordo si salta ancora) e *salto anticipato* (100 ms): rendono il gioco più
indulgente senza cambiare le regole.

**Difficoltà (2.0).** `DIFFICULTY_CONFIG` definisce per ogni difficoltà i moltiplicatori di salute e danno di nemici **e boss** e le vite iniziali.
Si sceglie nel menu del titolo; `GameEngine` la passa a `LevelManager.createEnemies/createBoss` e ai nemici evocati o nati da una divisione, e
`LivesManager.reset` usa le sue vite. La scelta è salvata da `ProgressManager`.

**Progressi e salvataggio (2.0, ridotto nella 2.1).** `ProgressManager` salva nel browser solo `{ version: 2, unlockedLevelId, difficulty, characterId }`
(chiave `ironAndShadow.progress`, costante `SAVE_VERSION`). Le classi sbloccate non si salvano: `isCharacterUnlocked` le ricava dal livello più avanzato
raggiunto (aggiornato a fine livello e da `startLevel`). Il record è a parte, in `HighScoreManager`. La schermata `levelSelect` permette una partita nuova da
uno qualsiasi dei livelli raggiunti. La lettura è tollerante, campo per campo: senza archivio si riparte dal livello 1.

**Migrazione dal formato 2.0.** Un salvataggio senza `version: 2` conserva livello, difficoltà e personaggio e viene **riscritto subito** al caricamento,
così armi, armature, zaino, gemme, potenziamenti e armi trovate non restano nell'archivio. Se l'archivio non è scrivibile, i progressi letti valgono lo stesso.

**Partite scollegate (2.1).** Tutto l'equipaggiamento vive solo in memoria. `GameEngine.resetRunEquipment` (avvio, nuova partita, "Cancella dati") mette nella borsa
la sola arma iniziale della classe, svuota armature e zaino e riporta le armi trovate (`GameEngine.discoveredWeaponIds`) a spada più arma iniziale; monete e
punteggio si azzerano con `ScoreManager.reset`. Scegliere il personaggio salva solo la scelta (`chooseCharacter`): la partita in corso non cambia, la classe si applica
in `startNewGame`.

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
- **Passivi (Classi Fase 5).** Sono campi facoltativi di `CharacterDefinition`, letti da `Player`. `staminaPerWeaponHit` sta in `registerHit`, che chiama solo il combattimento corpo a corpo e che ignora mosse e forzieri. `lowHealthPower` è un fattore di `getDamageMultiplier`. `manaPerKill` sta in `registerKill`, chiamato da `CombatSystem` e da `ProjectileSystem` quando un colpo diretto uccide un bersaglio che non è scena.
- **Sinergie elementali (Classi Fase 5).** Sono dati (`ELEMENT_SYNERGIES`). `Enemy.receiveHit` e `Boss.receiveHit` chiamano `StatusEffects.consumeSynergy(hit)` **prima** di applicare gli elementi del colpo: vale la prima voce dell'elenco con l'effetto attivo e un innesco valido (elemento a cui il bersaglio non è immune, oppure colpo che rompe la guardia o schiaccia le corazze), mai se il colpo porta lo stesso elemento dell'effetto. L'effetto si consuma e il danno si moltiplica (per i nemici dopo la corazza). La sinergia resta in attesa e il motore la preleva con `drainSynergy` (`showStatusDamage`) per nome e scintille. Il moltiplicatore si applica dentro il bersaglio: il danno restituito da `CombatSystem` (furto di vita, hit-stop) resta quello senza bonus.

### Il boss

`Boss` ha una macchina a stati esplicita: `dormant → idle/walk → attacco (preparazione → fase attiva → recupero) → idle`, `dead`. **Gli attacchi sono
dati (2.0):** `BossDefinition.attacks` elenca fino a un attacco per tipo (`melee`, `charge`, `projectile`, `summon`), ognuno con le sue tre durate e i suoi
numeri; ogni fase dà un peso a ogni attacco (`attackWeights`). Il prossimo attacco viene **sorteggiato una volta per pausa** (non a ogni frame); se è un
attacco da lontano il boss **aspetta a distanza** invece di avvicinarsi; se al momento non è possibile, ripiega sul corpo a corpo o si avvicina. Le **fasi**
sono dati (`phases`): la fase corrente è l'ultima la cui soglia di salute è ≥ della salute attuale. L'HUD legge le soglie dalla definizione del boss.

Il boss **non crea oggetti**: proiettili ed evocati sono *richieste* (`ProjectileLaunch`, `SummonRequest`) che il motore preleva dopo l'aggiornamento
(`drainProjectileLaunches`, `drainSummonRequests`) e trasforma in `Projectile` ed `Enemy`. Lo stesso vale per i nemici a distanza. Così le entità restano
indipendenti da chi le contiene e si provano da sole nei test.

**Compatibilità.** Il Cavaliere Nero è descritto con i nuovi dati (carica e fendente, stessi numeri della 1.0). La carica è elencata prima del fendente perché
nel sorteggio i pesi si sommano in quell'ordine: con lo stesso numero casuale si ottiene lo stesso attacco di prima. Il simulatore di bilanciamento dà
esattamente le stesse percentuali (vedi `BALANCE.md`).

### Proiettili, nemici a distanza e volanti (2.0)

- **`ProjectileSystem`**: un proiettile colpisce il giocatore una volta e sparisce; se il giocatore è invulnerabile (schivata, appena colpito) gli **passa
  attraverso** e prosegue, quindi la schivata funziona anche contro i proiettili. La spada distrugge i proiettili "deviabili" (frecce, dardi), non le palle
  di fuoco. I proiettili attraversano le piattaforme sospese e si schiantano contro quelle solide.
- **Nemico a distanza** (`behavior: "ranged"`): tira solo a chi è alla sua altezza ed entro `attackRange`; se il giocatore è più vicino di
  `retreatDistance` indietreggia guardandolo. La preparazione è lunga e interrompibile: colpirlo mentre tende l'arco annulla il tiro.
- **Nemico volante** (`behavior: "flyer"`): niente gravità finché è vivo; si muove verso un punto scelto dall'IA a ogni frame (sopra la testa del giocatore
  o attorno al punto di partenza, con un'oscillazione); la picchiata punta al punto in cui era il giocatore all'inizio della preparazione, quindi si
  schiva spostandosi.

---

## 9. Livelli

Un livello è un oggetto `LevelDefinition`: nome, ambientazione, dimensioni, partenza, piattaforme, nemici (tipo + posizione), oggetti, condizione di
completamento (`reachExit` o `defeatBoss`), eventuale boss (`bossId`, `bossSpawn`) e arena (`bossArenaStartX`). **Nessun livello è codice.**

- `LevelManager` carica un livello, crea i nemici (`createEnemies`) e il boss (`createBoss`), tiene le piattaforme **attive** (quelle del livello, le
  piattaforme mobili e il cancello dell'arena quando si chiude) e disegna sfondo, terreno, pericoli, porta d'uscita e cancello.
- **Piattaforme mobili (2.0)** (`movingPlatforms`): sempre attraversabili dal basso; vanno avanti e indietro con una curva a coseno (rallentano agli
  estremi). La posizione dipende solo dal tempo del livello, quindi è indipendente dagli FPS. Prima di aggiornare le entità, `updateMovingPlatforms`
  sposta le piattaforme e **trasporta** chi ci stava sopra (giocatore e nemici a terra) dello stesso spostamento.
- **Pericoli (2.0)** (`hazards`): `HazardSystem` calcola a ogni frame l'**ambiente** del giocatore (`PlayerEnvironment`): in acqua velocità, gravità e
  salto ridotti e si può nuotare verso l'alto; sul ghiaccio l'aderenza è bassa e la velocità cambia gradualmente. Gli spuntoni feriscono e respingono
  verso l'alto (poi l'invulnerabilità evita colpi ripetuti). I nemici a terra trattano spuntoni e acqua come un vuoto. L'acqua si disegna in due tempi:
  il fondo dietro le entità e il velo con l'ondulazione per riga davanti, così chi è immerso sembra davvero sott'acqua.
- `GameEngine` gestisce il flusso: `startLevel(id)` → gioco → `checkLevelCompletion()` → messaggio → `advanceToNextLevel()` (id + 1, oppure vittoria).
  **Gli id devono essere consecutivi da 1.**
- **Punto sicuro.** Il motore ricorda l'ultima posizione in cui il giocatore poggiava **interamente** sul terreno; dopo una caduta si riparte da lì.
- **Arena.** Superata `bossArenaStartX` (+24 px) viene aggiunta una piattaforma solida alle spalle del giocatore, disegnata come cancello a sbarre.

**Regole di progettazione (verificate dai test):** abissi ≤ 36 px (le **vasche** con il fondo al massimo 44 px più in basso non contano come abissi),
piattaforme raggiungibili con una salita ≤ 44 px, nemici a terra e oggetti appoggiati su una superficie, nemici volanti a mezz'aria sopra una superficie,
spuntoni appoggiati e larghi al massimo 36 px, ghiaccio a cavallo della superficie, acqua con il fondo, piattaforme mobili dentro la mappa, boss appoggiato,
uscita su terreno. Il bot di percorribilità usa solo il terreno fisso: le piattaforme mobili servono a raggiungere gli oggetti, mai obbligatorie. `npm run verify-docs` applica le stesse regole al livello aggiunto nell'esempio 9 del manuale.

---

## 10. Punti di estensione futuri

Questa sezione descrive **dove** si innesterebbero le funzioni previste dalla roadmap. **Nessuna di queste funzioni è implementata**: esistono solo i punti
d'aggancio elencati, volutamente minimi.

| Funzione futura | Versione prevista | Punto d'aggancio oggi | Che cosa servirebbe |
|---|---|---|---|
| Nuove combo | già possibile (Fase 3: miste, ramificate, per arma, a terra e in aria) | `COMBO_DEFINITIONS`, `WEAPON_CONFIG[...].combos` e `.air` | solo dati (esempio 5 del manuale); i test controllano che combo con lo stesso inizio usino gli stessi attacchi e che il recupero di ogni colpo sia più breve della finestra della combo |
| Nuovi nemici / boss / oggetti / livelli | già possibile | `ENEMY_CONFIG`, `BOSS_CATALOG`, `ITEM_CONFIG`, `LEVEL_CONFIG` | solo dati e sprite (esempi 6-10) |
| Power-up temporanei | implementato (2.0) | `POWER_UP_CONFIG`, `PlayerModifiers` | nuovi power-up: solo dati (effetti su statistiche esistenti) e uno sprite; una statistica nuova richiede di leggerla dove serve |
| Power-up permanenti | punto di estensione | `PowerUpDefinition.type = "permanent"` (non scade) | oggi la partita li toglierebbe a ogni livello (`modifiers.clear()` in `startLevel`): servirebbe conservarli |
| Elementi ed effetti di stato | implementato (Fase 7 del piano espansioni) | `ELEMENT_CONFIG`, `StatusEffects`, `HitProperties.elements`, `PowerUpDefinition.element`, `elementModifiers` di nemici e boss, `renderStatusAuras`/`renderStatusPips` | un elemento nuovo: un id in `ElementId`, una voce in `ELEMENT_CONFIG` ed `ELEMENT_ORDER` (danno nel tempo, rallentamento o stordimento si ottengono con i dati); un effetto di tipo nuovo richiede un caso in `StatusEffects` e in chi lo subisce (`Enemy`, `Boss`). Una sinergia nuova: un id in `SynergyId` e una voce in `ELEMENT_SYNERGIES` (innesco con un elemento o con un colpo pesante) |
| Abilità speciali e stamina | implementato (Fase 5 del piano espansioni; quattro mosse per classe dalla Classi Fase 5) | `ABILITY_CONFIG`, `ABILITY_UNLOCK_CONFIG`, `AbilityDefinition`, `CharacterDefinition.abilityIds`, `Player` (`spendStamina`, `tryStartAbility`, `updateGuard`, `selectAbilitySlot`, `learnNextAbility`), `ABILITY_SLOT_ACTIONS` (tasto di ogni slot), `AttackDefinition.dash` | un'abilità d'attacco nuova: un id in `AbilityId`, una voce in `ABILITY_CONFIG` con il suo attacco (per i casi comuni gli aiuti `strike`, `elementArrow`, `attackAbility`) e un'animazione in `PLAYER_ANIMATIONS` con le pose comuni (`ABILITY_POSES`); un tipo nuovo (oltre ad attacco e scudo) richiede un caso in `Player` |
| Classi: mana, affinità delle armi, attributi (Classi Fase 0; attributi attivi dalla Fase 4) | implementato; gli attributi hanno effetti dalla 2.4.0 | `ResourcePool` (stamina e mana di `Player`), `AbilityDefinition.cost` (`ResourceCost`) e `modifiers`, `CharacterDefinition.abilityIds`/`maxMana`/`manaRegenPerSecond`/`baseAttributes`, `WeaponDefinition.category`/`weight`/`scalingAttribute`, `WEAPON_AFFINITY_CONFIG`, `ATTRIBUTE_CONFIG`, `computeAttributeEffects`, `PlayerModifiers.setSourceEffects` | un costo in mana: un valore in `cost.mana` e `maxMana` della classe; un bonus o un malus d'arma: la cella arma × classe in `WEAPON_AFFINITY_CONFIG`; un effetto di attributo: una voce in `effectsPerPoint` (la statistica va in `PlayerStatName` e in `PlayerModifiers`; poi `Player.setSpentAttributes`); una base diversa: `CHARACTER_CONFIG.baseAttributes`; il danno per punto delle armi: `WEAPON_SCALING_CONFIG`; un requisito: `STRENGTH_REQUIREMENT_CONFIG`, `CARRY_CONFIG`, `SPELL_GRADE_INT_REQUIREMENT`; un modificatore di incantesimo: una voce in `AbilityDefinition.modifiers` (oggi il campo è vuoto e non letto) |
| Nuove armi | implementato (Fasi 0-1 del piano espansioni: 5 armi corpo a corpo) | `WeaponDefinition`, `WEAPON_CONFIG`, `WEAPON_VISUALS` (`knightSprites.ts`), `Player.equipWeapon`, `WeaponPickupManager`, forzieri (`LevelDefinition.chests`), `EnemySpawnDefinition.weaponDrop`, `BossDefinition.weaponReward` | un'arma corpo a corpo nuova: un id in `WeaponId`, una voce in `WEAPON_CONFIG`, le animazioni dei suoi attacchi, una voce in `WEAPON_VISUALS` (forma ed eventuali pose proprie); effetti nuovi sul bersaglio richiedono un campo in `AttackDefinition`/`HitProperties` letto in `Enemy.receiveHit`. Armi a distanza (Fase 2): attacchi con `projectile` (e `charge` per l'arco), proiettili con `owner: "player"` in `ProjectileSystem`, munizioni in `WeaponDefinition.ammo` e nella borsa |
| Boss con più fasi o attacchi diversi | già possibile (2.0) | `BossDefinition.attacks` e `phases[].attackWeights` | solo dati per i 4 tipi esistenti; un **tipo** di attacco nuovo richiede un caso in `Boss.ts` (`canPerform`, `onActivePhaseStart`, `getAttackHitbox`) e le animazioni in `BOSS_ATTACK_ANIMATIONS` |
| Nemici a distanza e volanti, balzo, divisione, corazza, proiettili, pericoli, piattaforme mobili | già possibile (2.0) | `ENEMY_CONFIG` (`ranged`, `flight`, `lunge`, `splitInto`, `armor`), `PROJECTILE_CONFIG`, `LevelDefinition.hazards` e `movingPlatforms` | solo dati e sprite |
| Boss con una silhouette nuova | già possibile (2.0) | `BOSS_SPRITE_SHAPES` (`knight`, `witch`, `sorcerer`, `beast`) | una forma nuova richiede una funzione che componga i frame in `bossSprites.ts` e la sua hitbox in `SHAPE_HITBOX` |
| Nuove ambientazioni | già possibile (2.0: sei; Fase 8 del piano espansioni: sette, con le Lande Desolate) | `ThemeId`, `THEME_STYLES`, `BackgroundRenderer`, `TerrainRenderer` | un caso in `BackgroundRenderer.buildTheme` (livelli di parallasse) e i colori del terreno; una tessitura nuova richiede un caso in `TerrainRenderer` |
| Personaggi alternativi | implementato (Fase 4 del piano espansioni: cavaliere, ranger, berserker, paladino; Classi Fase 2: mago) | `CharacterDefinition`, `CHARACTER_CONFIG`, `CHARACTER_VISUALS` (`knightSprites.ts`), `Player.setCharacter`, `ProgressManager.characterId`, schermata `characterSelect` | un personaggio nuovo: un id in `CharacterId`, una voce in `CHARACTER_CONFIG` e in `CHARACTER_ORDER`, una voce in `CHARACTER_VISUALS` (colori e, se serve, le 12 righe della testa). Un tratto che non è una statistica (es. la parata del paladino, Fase 5) richiede un campo in `CharacterDefinition` letto da `Player`. La ricarica delle munizioni è già solo un dato (`ammoRegeneration`, letto da `GameEngine`) |
| Progressione: monete, bottega, sblocchi | implementato (Fase 6 del piano espansioni; nella 2.1 rimossi i potenziamenti permanenti) | `progressionConfig.ts`, `Shop`, `ScoreManager.coins`, `ProgressManager` (`unlockLevel`, `isCharacterUnlocked`) | una voce nuova della bottega: un id in `ShopOfferId`, una voce in `SHOP_OFFERS` e il suo caso in `Shop.buy`/`findRefusal` |
| Equipaggiamento: rarità, modificatori, armature, zaino, bottino, negozio camminabile | implementato (piano dell'equipaggiamento, E1-E6) | `RARITY_CONFIG`, `AFFIX_CONFIG`, `ARMOR_CONFIG`, `LEGENDARY_ITEMS`/`MYTHIC_ITEMS`, `LOOT_SOURCES`, `ItemFactory`, `EquipmentStats`, `LootSystem`, `Inventory` (zaino e armature), `Player.equipWeapon(..., item)`/`setArmor`, `SpriteColorVariant` | un modificatore nuovo: un id in `AffixId`, una voce in `AFFIX_CONFIG` e il suo effetto in `EquipmentStats` (e, se è una statistica nuova, in `Player`); un pezzo d'armatura o un Leggendario: solo dati; uno sprite su misura per un Mitico: vedi `PIANO_EQUIPAGGIAMENTO.md` |
| Classifica di punteggi | pianificata | `HighScoreManager` | salvare un elenco invece di un solo valore |
| Selettore di difficoltà | implementato (2.0) | `DIFFICULTY_CONFIG`, menu del titolo, `ProgressManager` | - |
| Audio | escluso dal progetto | eventi già individuabili in `GameEngine` (colpi, raccolte, morte) | un `AudioManager` chiamato da quei punti |

### Statistiche base e modificatori (implementato nella 2.0 con i power-up)

Il requisito è che "la scadenza di un power-up ripristini i valori precedenti senza perdere gli altri". La strada più semplice è **non modificare mai** i valori base:

```text
valoreEffettivo(stat) = (base[stat] + somma dei bonus additivi attivi) × prodotto dei moltiplicatori attivi
```

Ogni power-up (`PowerUpDefinition` in `powerUpConfig.ts`) ha `id`, `name`, `description`, `type` (temporaneo/permanente), `effects` (quali statistiche e
come: `add` o `multiply`), `durationMs` e `requirements` (punto di estensione). Il giocatore tiene l'elenco di quelli attivi in `PlayerModifiers` e, a ogni
frame, scarta quelli scaduti: il valore effettivo (`getValue`) si ricalcola dall'elenco, quindi la scadenza di uno non può danneggiare gli altri, e
`PLAYER_CONFIG` non cambia mai. Le statistiche lette così sono: moltiplicatore del danno e danno aggiunto (in `CombatSystem.processPlayerAttack`),
velocità (in `Player.applyHorizontalInput`), danni subiti (in `Player.takeDamage`), rigenerazione (in `Player.updateTimers`). Lo stesso power-up raccolto
di nuovo fa ripartire la durata invece di sommarsi. I power-up si perdono a ogni nuovo livello e alla perdita di una vita (scelta di bilanciamento).

**Fonti permanenti (Classi Fase 0).** Accanto ai power-up, `PlayerModifiers` tiene fonti che non scadono (`setSourceEffects`, oggi solo `"attributes"`): i loro effetti entrano nella stessa formula, e `clear()` toglie solo i power-up. `Player.setAttributes` calcola gli effetti con `computeAttributeEffects` (da `ATTRIBUTE_CONFIG`, oggi vuoti) e li registra; `maxHealth`, `maxStamina` e `maxMana` leggono le statistiche `maxHealthBonus`, `maxStaminaBonus`, `maxManaBonus`. Stamina e mana sono due `ResourcePool`; le abilità pagano un `ResourceCost` (`stamina`, `mana`, `health`) e stanno in un elenco con uno slot attivo. L'affinità classe × categoria d'arma (`WEAPON_AFFINITY_CONFIG`) moltiplica danno e recupero. Con i valori neutri introdotti dalla Fase 0 (2.0.1) niente di questo cambia il gioco; dalla Fase 4 (2.4.0) gli attributi hanno effetti, descritti sotto (`Player.setAttributes` è sostituito da `setSpentAttributes`).

**Ricarica passiva delle munizioni (2.1.1).** È un dato della classe, `CharacterDefinition.ammoRegeneration` (`weaponId`, `intervalMs`; oggi solo il Ranger: arco, 3000 ms). La logica è in `systems/AmmoRegeneration.ts`, che tiene il tempo trascorso e aggiunge una munizione con `Inventory.addAmmo`. Il tempo scorre solo se `Inventory.isMissingAmmo` è vero, cioè se l'arma è nella borsa (non nello zaino) e non è piena; altrimenti si azzera. `GameEngine.regenerateAmmo` la chiama dentro `updatePickupsAndBag` (quindi solo in gioco e con il giocatore vivo) e, se l'arma è quella in mano, aggiorna anche `Player.setAmmo`. `startLevel` azzera il conteggio.

**Mana e incantesimi (Classi Fase 2, 2.2.0).** Il mana è la seconda `ResourcePool` del giocatore (massimo e recupero letti da `CharacterDefinition.maxMana` e `manaRegenPerSecond`; il recupero riparte `PLAYER_CONFIG.manaRegenDelayMs` dopo l'ultimo consumo). Un incantesimo è una normale abilità (`ABILITY_CONFIG`) con `cost: { mana }`: per questo usa le stesse regole di slot, ricarica e `canAfford`. Il Mago ne ha quattro (tasti 7-0; dalla 2.5.0 all'inizio ne conosce due) e ogni slot ha il suo stato in `Player.abilitySlots`, letto dall'HUD. `AttackDefinition.elements` aggiunge elementi propri all'attacco (bruciatura del dardo, gelo della nova) accanto a quelli di power-up e arma. La guardia (`kind: "guard"`) ha ora `resource: "stamina" | "mana"` e `costPerBlockedDamage`: lo scudo del Paladino consuma stamina, la barriera del Mago consuma mana, con la stessa parata perfetta. Se manca il mana l'incantesimo non parte e compare "SENZA MANA" (`Player.drainNoMana`).

**Contenuto per classe (Classi Fase 5, 2.5.0).** Ogni classe ha quattro voci in `abilityIds`, in ordine di tasto. `Player` non tiene un elenco delle mosse sbloccate ma solo un numero (`knownAbilityCount`): sono note le prime n, si parte da `ABILITY_UNLOCK_CONFIG.startingCount` (2) e `learnNextAbility` aggiunge la successiva. `setCharacter` (nuova partita) torna a 2; `revive` non le tocca. Il motore decide **quando** si impara (`GameEngine.learnNextAbility`): `openChest` con probabilità `chestChance` (0,25, da `lootRandom`, solo se ne manca una) e `handlePlayerHit` alla sconfitta di ogni boss, sempre (il testo va anche nel riquadro di fine livello). Come i punti attributo, il numero sta nello snapshot di inizio livello (`levelStartAbilityCount`) e `restartCurrentLevel` lo ripristina; non si salva tra le partite. L'HUD riceve `isKnown` per ogni slot e disegna un lucchetto. Il costo in salute usa `ResourceCost.health` (la salute deve restare almeno a 1, altrimenti `drainLowHealth` → "SALUTE INSUFFICIENTE"). Nel simulatore le partite complete partono con 2 mosse e ne imparano una per boss (i forzieri non si contano); duelli, boss e livelli singoli le hanno tutte (`knownAbilities` di `playLevel`).

**Catalizzatore.** `WeaponDefinition.spellFocus` (`powerMultiplier`, `manaCostMultiplier`, `manaPerHit`) descrive cosa dà un'arma agli incantesimi; vale solo se la classe ha `usesSpellFocus` (`Player.activeSpellFocus`). Tre punti lo leggono: `Player.getAbilityCost` (costo in mana, arrotondato), `Player.getDamageMultiplierFor(attack)` (moltiplica solo il danno degli incantesimi; lo usano `CombatSystem` e i proiettili) e `Player.registerHit` (ogni bersaglio colpito con un attacco dell'arma ridà `manaPerHit`, tramite `restoreMana` e `ResourcePool.restore`). Le altre classi con il bastone non ottengono niente: il bonus è della classe, non dell'arma.

**Compatibilità arma-classe e filtro del bottino (Classi Fase 3).** `weaponAffinityConfig.ts` ha una tabella **per arma**: 11 armi × 5 classi, non più per categoria (la categoria resta nei tag di `WEAPON_CONFIG` solo per lo scaling della Fase 4). Ogni cella `WeaponAffinity` ha `isAllowed`, `damageMultiplier`, `recoveryMultiplier`, `ammoMultiplier` e, per le vietate, `lootSubstituteId`. Quattro costanti: `NEUTRAL_WEAPON_AFFINITY` (✓ e arma iniziale, tutto ×1), `PREFERRED_WEAPON_AFFINITY` (★: danno ×1,15, munizioni ×1,5), `PENALIZED_WEAPON_AFFINITY` (▼: danno ×0,85, recupero ×1,15, cioè più lento) e `forbidden(sostituto)`. Il Mago può ora impugnare spada e pugnale (la Fase 2 prevedeva solo il bastone); il catalizzatore (`spellFocus`) resta del bastone.

Il **filtro del bottino** `resolveLootWeaponId` (`LootSystem`) sostituisce un'arma vietata con il `lootSubstituteId` della cella (rete di sicurezza: l'arma iniziale): spadone del Ranger → balestra; Mago: spadone → spada, le altre vietate → bastone; bastone delle altre classi → arma iniziale. Vale per forzieri, élite, trofei dei boss, ricompensa finale e bottega, quindi un'arma vietata non compare mai a terra.

I **divieti** sono applicati in tre punti: `Player.equipWeapon` restituisce `boolean` e rifiuta le armi vietate (non cambia nulla); `Inventory.equipFromBackpack` restituisce `"forbidden"` (l'arma resta nello zaino) e il motore mostra "NON PUOI USARLA"; `GameEngine.pickUpEquipment` non raccoglie l'arma vietata. Il modulo `src/systems/WeaponAffinity.ts` raccoglie le funzioni di lettura (`getWeaponMaxAmmo`, `canWieldWeapon`, `describeWeaponAffinity`, `FORBIDDEN_WEAPON_MESSAGE`).

**Munizioni per classe.** Il massimo delle munizioni è quello dell'arma per `ammoMultiplier`, per difetto (`getWeaponMaxAmmo`). `Inventory.setCharacter(characterId)` è chiamato da `GameEngine.resetRunEquipment` a ogni nuova partita; `Inventory.getMaxAmmo` e `Player.maxAmmo` valgono per borsa, raccolta, faretra, ricarica dell'arco del Ranger e coltelli recuperati.

**Zaino con munizioni.** Lo zaino conserva per ogni posto una `BackpackEntry { item, ammo? }`, anche nello snapshot di inizio livello (`InventorySnapshot.backpack`). Un'arma da lancio messa nello zaino e ripresa, lasciata a terra dallo zaino, scambiata a borsa piena o comprata a borsa piena conserva le munizioni; nello zaino non si ricaricano.

**Peso.** Le armature hanno `weight` (`ARMOR_WEIGHT_BY_MATERIAL` × `ARMOR_WEIGHT_SLOT_FACTOR`); `getItemWeight(item)` (`ItemFactory`) lo legge per ogni oggetto. Dalla Fase 4 (2.4.0) il peso conta per i requisiti di Forza e il carico (vedi sopra); il malus di velocità previsto in origine per il solo peso è stato scartato perché le armature pesanti hanno già `moveSpeed` negativo.

**Attributi (Classi Fase 4, 2.4.0).** Cinque attributi (`ATTRIBUTE_CONFIG`: Forza, Destrezza, Intelligenza, Vitalità, Tempra), da 0 a `ATTRIBUTE_MAX_VALUE` (20). Ogni classe ha la sua base (`CharacterDefinition.baseAttributes`, somma 25). Il valore **effettivo** è base + punti spesi + bonus dei power-up (`PowerUpDefinition.attributeBonuses`, letti da `PlayerModifiers.getAttributeBonus`), tagliato a 20 (`computeEffectiveAttributes`). Due letture diverse:
- gli **effetti per punto** (`effectsPerPoint`) contano solo i punti **sopra la base** (`getPointsAboveBase`): chi non spende punti ha l'elenco di effetti vuoto e gioca come nella 2.3. Quelli con `onlyWithMana` si saltano per le classi senza mana. Gli effetti entrano in `PlayerModifiers` come fonte `"attributes"` attraverso otto statistiche percentuali nuove di `PlayerStatName` (`attackRecoveryPercent`, `dodgeCostReductionPercent`, `abilityPowerPercent`, `manaRegenPercent`, `spellCostReductionPercent`, `defensePercent`, `staminaRegenPercent`, `resistancePercent`) più le basi `maxHealthBonus`, `maxStaminaBonus`, `maxManaBonus` già esistenti;
- **requisiti, carico e gradi** leggono invece il valore effettivo (`computeStrengthPenalties`, `meetsGradeRequirement`).

`Player.refreshAttributes` ricalcola tutto insieme quando cambiano i punti spesi (`setSpentAttributes`), i power-up (`PlayerModifiers.onPowerUpsChanged`), l'arma o le armature. I tetti restano quelli dell'equipaggiamento: difesa, resistenze e recupero combinano la parte dell'equipaggiamento e quella degli attributi con `combineCappedFraction`, sotto `AFFIX_CONFIG` (`Player.getDefenseMultiplier`, `getResistanceFraction`, `getRecoveryMultiplier`). Il danno di un attacco dell'arma è `getDamageMultiplierFor`: generale × classe (Fase 3) × scaling (`getWeaponScalingMultiplier`: +3% per punto sull'attributo principale, +1% sul secondario, `WEAPON_SCALING_CONFIG`) × malus di Forza; le mosse ricevono invece `abilityPowerPercent`. Il costo degli incantesimi (`getAbilityCost`) e la schivata (`dodgeStaminaCost`) leggono le loro riduzioni.

**Requisiti di Forza e carico.** Sono **morbidi**: l'oggetto si usa sempre, con un malus. `getWeaponStrengthRequirement` (solo armi da Forza di peso ≥ 3: (peso - 2) × 3) e `getArmorStrengthRequirement` (il peso del pezzo) alimentano `StrengthPenalties` (`Player.strengthStatus`): danno e recupero dell'arma (-4% e +4% per punto, tetto 40%), velocità delle armature (-3% per punto, sommato sui pezzi, tetto 40%) e carico (`CARRY_CONFIG`: 8 + Forza, -3% di velocità per punto in più, tetto 30%; conta l'arma in mano e le armature indossate, non lo zaino). Il motore avvisa con "FORZA INSUFFICIENTE (-n)" alla raccolta (popup) e nell'equipaggiamento (`GameEngine.describeMissingStrength`). I **gradi delle mosse** invece sono **rigidi**: `AbilityDefinition.grade` (1-3) richiede INT 12 e 16 (`SPELL_GRADE_INT_REQUIREMENT`); sotto la soglia la mossa non parte (`Player.drainLowIntelligence` → popup "INTELLIGENZA INSUFFICIENTE") e `HUDData.abilities[].meetsRequirement` rende il riquadro grigio.

**Punti attributo.** `systems/AttributePoints.ts` tiene punti da spendere e punti spesi per attributo. `GameEngine.checkLevelCompletion` li assegna a fine livello (`AttributePoints.pointsForLevel`: 3, più 2 se il livello ha il boss) solo se esiste un livello successivo; i boss sono nei livelli 3-7, quindi in una partita si spendono 26 punti. Non dipendono dalla difficoltà. Una nuova partita li azzera; `levelStartAttributePoints` li salva a inizio livello e `restartCurrentLevel` li ripristina insieme alla borsa. Non ci sono ridistribuzioni: `spend` rifiuta se non ci sono punti (`noPoints`) o se base + spesi ha già raggiunto il massimo (`atMax`).

**Altare e pentagono.** Lo stato `attributes` ha due modalità (`attributesScreenMode`): `spend` (dall'altare, `SHOP_ROOM_CONFIG.altar`, sprite `shopAltar`) e `view` (dall'equipaggiamento con **P**, `openAttributes`, sola lettura). La schermata (`ScreenManager`, `AttributesView` costruito da `GameEngine.getAttributesView`) disegna il pentagono con `ui/PentagonChart.ts` (poligoni e linee a pixel interi, senza forme del canvas) in tre colori della palette (`ATTRIBUTE_CHART_COLORS`: base, punti spesi, bonus dei power-up), l'elenco degli attributi, gli effetti di quello scelto, il carico e i requisiti. I comandi `showAttributes`, `assignAttributePoint` (`assignPoint` = J o Invio) e `closeAttributes` passano dal motore. L'HUD mostra "+N PUNTI" sotto il pannello; il riquadro di fine livello "+N PUNTI ATTRIBUTO".

**Pozioni per tipo.** `BagSlot` di tipo pozione ha `potionId` (`PotionId`: salute o mana). Ogni tipo ha i suoi posti (`INVENTORY_CONFIG.maxPotionSlots`, `maxPotionsPerSlot`), quindi due pozioni di mana non tolgono posto a quelle di salute; `addPotion`, `canAddPotion` e `getPotionCount` prendono il tipo. Il bottino estrae la pozione di mana con `rollManaPotionDrop`, solo per le classi con mana, così per le altre il generatore casuale resta lo stesso di prima. La bottega, per chi ha mana, vende la pozione di mana al posto della faretra e offre sempre un bastone (che prende il posto del suo, mandandolo nello zaino).

---

## 11. Testabilità e strumenti

| Strumento | Cosa fa |
|---|---|
| `npm run typecheck` | controllo dei tipi (strict) |
| `npm run build` | controllo dei tipi + build distribuibile in `dist/` |
| `npm test` | 1467 controlli unitari in Node (meno di 1 secondo) |
| `npm run test:browser` | 180 controlli nel browser: build reale con `file://`, dimensioni di schermo, bot che gioca tutto il gioco con eventi di tastiera, tasti a caso, velocità sotto carico (richiede Playwright) |
| `npm run balance` | simulatore di bilanciamento con un bot (usa le classi reali, senza grafica); `-- --build` solo le build di attributi (Classi Fase 4) |
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
