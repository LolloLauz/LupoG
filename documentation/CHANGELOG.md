# Changelog

## 2.0.0-alpha.5 – Versione 2.0, Fase 5: power-up, difficoltà, selezione dei livelli (2026-11-22)
### Aggiunto
- **Cinque power-up temporanei** (`config/powerUpConfig.ts`): **Furia** (danno ×1,5), **Velocità** (movimento ×1,4), **Scudo** (danni subiti dimezzati, almeno 1), **Fuoco** (+8 danni a ogni colpo, spada e scie incandescenti), **Rigenerazione** (+4 HP al secondo). Si raccolgono come oggetti (runa, stivali alati, scudo, fiamma, foglia; 25 punti), sono nei sei livelli e mai subito prima di un boss.
- **Modificatori** (`combat/PlayerModifiers.ts`): le statistiche base non cambiano mai; il valore effettivo è (base + bonus) × moltiplicatori dei power-up attivi, quindi la scadenza di uno non tocca gli altri; lo stesso power-up raccolto di nuovo riparte da capo. Realizza il progetto descritto in `ARCHITECTURE.md` sez. 10.
- Alone colorato attorno al cavaliere per ogni power-up (lampeggia negli ultimi 2 s), icone con la barra del tempo nell'HUD, scritta e scintille alla raccolta; varianti "incandescenti" di tutti gli sprite del cavaliere (chiavi di colore separate per lama e scie).
- **Difficoltà nel menu del titolo** (Facile, Normale, Difficile): salute e danno di nemici **e boss**, vite iniziali 5 / 3 / 2.
- **Selezione dei livelli** (nuovo stato `levelSelect`): una partita nuova da qualsiasi livello già raggiunto; i livelli non raggiunti hanno il lucchetto.
- **Progressi salvati** (`systems/ProgressManager.ts`): livello più avanzato e difficoltà, nel browser, tolleranti ad archivio assente, bloccato o dati corrotti.
- **Test**: nuova suite `powerups-progress.test.mjs` (28 controlli). Totale 512 controlli in 14 file.
### Modificato
- `DIFFICULTY_CONFIG` ha anche `name` e `startingLives`; `DIFFICULTY_ORDER`. `Boss` accetta la difficoltà; `LevelManager.createEnemies/createBoss` la ricevono; `LivesManager.reset` accetta le vite.
- `ItemDefinition.powerUpId`, nuovi `ItemTypeId`; `MenuItem.label` può essere una funzione; `ScreenManager.update` riceve `ScreenData` (difficoltà e livelli); `HUDData.powerUps`.
- Bot dei test nel browser e fuzz: accettano lo stato `levelSelect` e le vite della difficoltà facile; il controllo del Game Over fissa la difficoltà normale.
- Manuali aggiornati (`GAME_MANUAL` con power-up, difficoltà e selezione dei livelli, punteggio massimo 17100; `CODE_MANUAL`, `ARCHITECTURE`, `FEATURES`, `TESTING`, `BALANCE`).
### Verificato
- `npm run typecheck`, `npm test` (512 controlli), `npm run verify-docs` (11 esempi), `npm run balance`, `npm run build`.
- Chrome headless: titolo con il nuovo menu, selezione dei livelli, power-up in gioco (HUD, alone, spada incandescente) con 0 pixel fuori palette; fuzz senza problemi.
### Limiti
- `npm run test:browser` (Playwright) non eseguito.
- Power-up permanenti: solo il punto d'aggancio (`type: "permanent"`).

## 2.0.0-alpha.4 – Versione 2.0, Fase 4: nuovi livelli, nemici e boss (2026-11-21)
Quarta fase della versione 2.0: il gioco passa da 3 a **6 livelli**. I primi tre non cambiano; dopo il Cavaliere Nero la storia continua fino al
**Signore dell'Ombra**, il vero nemico.
### Aggiunto
- **Tre ambientazioni** con sfondi a più livelli di parallasse e terreni propri:
  - **Palude Maledetta**: cielo torbido, luna malata, alberi morti, salici piangenti, nebbia, lucciole; fango e muschio con canne palustri; acqua verde.
  - **Picchi Ghiacciati**: aurora boreale, montagne innevate, pini con la neve, nevicata; neve e roccia con ghiaccioli.
  - **Torre dell'Ombra**: cielo in tempesta con fulmini, rovine sospese, vetrate e bracieri magici; pietra con rune luminose.
- **Tre livelli** (4, 5, 6) con vasche d'acqua, ghiaccio, spuntoni, piattaforme mobili e un boss ciascuno; la vittoria arriva dopo il livello 6.
- **Nuovi nemici**: **Lupo** (veloce, balza in avanti senza cadere negli abissi), **Melma della Palude** (alla morte si divide in due **melmine**), **Golem di Ghiaccio** (corazzato: l'attacco leggero fa metà danno, il pesante il danno pieno; non vacilla). Arciere Scheletro e Pipistrello (Fase 3) compaiono nei livelli.
- **Nuovi boss**: **Strega della Palude** (dardi a ventaglio, evoca melmine, bastonata), **Re dei Lupi** (balzo, morso, chiama il branco; forma di belva con hitbox 40×24), **Signore dell'Ombra** (boss finale a tre fasi: lama d'ombra, scatto, palle di fuoco, pipistrelli).
- **Forme degli sprite dei boss** (`BOSS_SPRITE_SHAPES`): `knight`, `witch`, `sorcerer`, `beast`. Nuovo `sprites/creatureTools.ts` per disegnare in modo procedurale lupi (anche giganti) e melme.
- Campi dei nemici `lunge`, `splitInto`, `armor`; colori dell'acqua per ambientazione (`ThemeStyle.waterColors`); tessiture `swampMud`, `snowAndRock`, `runeStone`.
- **Test**: regole dei livelli estese (vasche, volanti, spuntoni, ghiaccio, acqua, piattaforme mobili, boss appoggiato), test di balzo, divisione, corazza, livelli nuovi e forme dei boss. Totale 484 controlli in 13 file.
### Modificato
- **Simulatore di bilanciamento** (`tools/balance.mjs`): usa il boss di ogni livello e gli stessi sistemi del gioco (proiettili, pericoli, piattaforme mobili, evocazioni, divisioni); il bot salta gli spuntoni; nuovi duelli e una riga per ogni boss. Numeri dei livelli 1-3 invariati.
- Bot dei test nel browser (`harness.js`): salta gli spuntoni e riconosce gli attacchi di qualsiasi boss.
- Bilanciamento dei contenuti nuovi misurato e corretto (vedi `BALANCE.md`): partita completa vinta dal bot "medio" circa 73% (32% senza schivate).
- `CODE_MANUAL`: esempi 6, 7, 9 (ora rinumera anche i livelli successivi) e 10 aggiornati; `GAME_MANUAL` con storia, nemici, pericoli, quattro boss, sei livelli e punteggio massimo (16875); `ARCHITECTURE`, `FEATURES`, `TESTING`, `BALANCE`, `README`.
### Verificato
- `npm run typecheck`, `npm test` (484 controlli), `npm run verify-docs` (11 esempi), `npm run balance`, `npm run build`.
- Chrome headless: schermate dei livelli 4-6 con 0 pixel fuori palette; il bot vince 2 partite complete di 6 livelli su 3, senza violazioni.
### Limiti
- `npm run test:browser` (Playwright) non eseguito.
- Il bilanciamento dei livelli nuovi è misurato solo con il bot, che non usa l'attacco pesante e non insegue i pipistrelli: serve una prova con persone.
- I power-up, il selettore di difficoltà e la selezione dei livelli sono la Fase 5.

## 2.0.0-alpha.3 – Versione 2.0, Fase 3: sistemi per i nuovi contenuti (2026-11-21)
Terza fase della versione 2.0: i sistemi che servono ai livelli, ai nemici e ai boss della Fase 4. **I tre livelli attuali non cambiano** e il
bilanciamento è identico (vedi `BALANCE.md`): le novità si vedranno nei livelli nuovi.
### Aggiunto
- **Proiettili** (`entities/Projectile.ts`, `systems/ProjectileSystem.ts`, `config/projectileConfig.ts`, `sprites/projectileSprites.ts`): freccia, dardo magico, palla di fuoco. Colpiscono il giocatore una volta; durante la schivata (o l'invulnerabilità) passano attraverso; la spada distrugge frecce e dardi ma non le palle di fuoco; si schiantano contro i muri (non contro le piattaforme sospese).
- **Nemici a distanza** (`behavior: "ranged"`, campo `ranged`): tirano a chi è alla loro altezza entro `attackRange`, indietreggiano se il giocatore è troppo vicino; la preparazione è interrompibile. Nuovo nemico **Arciere Scheletro** (cappuccio, faretra, arco che si tende).
- **Nemici volanti** (`behavior: "flyer"`, campo `flight`): niente gravità, volteggiano attorno al punto di partenza, seguono il giocatore restando sopra la sua testa, attaccano in picchiata verso il punto in cui era; da morti cadono. Nuovo nemico **Pipistrello** (4 pose d'ala).
- **Pericoli** (`LevelDefinition.hazards`, `systems/HazardSystem.ts`, `config/hazardConfig.ts`): spuntoni (12 danni e rimbalzo), acqua (più lenti, caduta lenta, si nuota verso l'alto; fondo dietro e velo ondulato davanti alle entità), ghiaccio (aderenza ridotta: si scivola). I nemici a terra non entrano in spuntoni e acqua. Il giocatore ha un `environment` (`PlayerEnvironment`) che il motore aggiorna a ogni frame.
- **Piattaforme mobili** (`LevelDefinition.movingPlatforms`): avanti e indietro con rallentamento agli estremi, trasportano giocatore e nemici a terra; disegnate con piastre di ferro e bulloni d'oro.
- **Attacchi dei boss come dati** (`BossDefinition.attacks`, `BossPhaseDefinition.attackWeights`): quattro tipi (`melee`, `charge`, `projectile` con ventaglio mirato, `summon` con limite di evocati) con preparazione, fase attiva e recupero. Nuove pose del boss `CastA`/`CastB` (incantesimo) e animazioni per proiettili ed evocazioni (`BOSS_ATTACK_ANIMATIONS`).
- `LevelManager.loadLevelDefinition` (livelli fuori da `LEVEL_CONFIG`, per test e prove), `Renderer.applyLineWave` limitato a una zona orizzontale, `Boss.currentAttackWindupMs`.
- **Test**: nuova suite `systems-phase3.test.mjs` (47 controlli) e nuovi controlli di coerenza (comportamenti, proiettili, attacchi e pesi dei boss). Totale 428 controlli in 13 file.
### Modificato
- `BossDefinition`: i campi `slash...` e `charge...` e `phases[].chargeChance` sono sostituiti da `attacks` e `attackWeights`. Il Cavaliere Nero ha gli stessi numeri; la carica è elencata per prima perché il sorteggio dia gli stessi risultati della 1.0. `Boss.currentState` è ora un getter; gli stati visibili (`slash`, `chargeWindup`, `charging`, `recovery`...) sono gli stessi.
- `Boss` ricava le animazioni dalla propria definizione (`createBossAnimations`): funziona con qualsiasi boss, anche fuori dal catalogo.
- `EnemyAISystem.update` riceve anche i pericoli e il tempo di gioco; `Boss.update` riceve il numero di evocati vivi.
- Bot del simulatore (`tools/balance.mjs`) e dei test nel browser (`harness.js`): leggono la durata della preparazione dal boss.
- `CODE_MANUAL`: esempi 6 e 10 aggiornati (nuovi tipi di nemico; il Re Scheletro con la nuova struttura degli attacchi). Manuali aggiornati (`ARCHITECTURE` sez. 7-10, `CODE_MANUAL`, `FEATURES`, `GAME_MANUAL` con le novità in arrivo, `TESTING`, `BALANCE`).
### Verificato
- `npm run typecheck`, `npm test` (428 controlli), `npm run verify-docs` (11 esempi), `npm run balance` (risultati identici), `npm run build`.
- Livello di prova in Chrome headless (non incluso nel gioco) con tutte le novità: 0 pixel fuori palette; arcieri che tirano, pipistrelli, boss che evoca al massimo 2 pipistrelli e lancia palle di fuoco.
### Limiti
- Arciere, pipistrello, pericoli e piattaforme mobili non sono ancora nei livelli: arrivano con la Fase 4.
- `npm run test:browser` (Playwright) non eseguito.
- Tutti i boss condividono ancora la forma umanoide dello sprite: i boss non umanoidi della Fase 4 (es. Re dei Lupi) richiederanno sprite propri.

## 2.0.0-alpha.2 – Versione 2.0, Fase 2: grafica ridisegnata a 16 bit (2026-11-21)
Seconda fase della versione 2.0: tutta la grafica è ridisegnata con gli strumenti della Fase 1. **Il gioco non cambia**: hitbox, statistiche,
livelli e bilanciamento sono quelli di prima; cambia solo come appare.
### Aggiunto
- **Cavaliere a 16 bit** (24×30, attacchi 44×30): elmo a visiera con pennacchio, armatura in 4 toni, sopravveste rossa con cintura d'oro, scudo blu con croce, spada con scie bianche e azzurre. Pose nuove per schivata (accovacciato dietro lo scudo), danno, morte.
- **Nemici a 16 bit**: scheletro (ossa avorio, occhio rosso, spada arrugginita), goblin (pelle verde in 3 toni, orecchie, pugnale), soldato (elmo a falda dorata, sopravveste viola). Ogni nemico ha le sue pose delle gambe.
- **Cavaliere Nero a piena risoluzione** (36×41; nella 1.0 era disegnato a metà risoluzione e ingrandito 2×): corna, visiera con occhi arancioni, spallacci, mantello a pieghe, spadone con scia arancione.
- **Sprite allineati all'hitbox**: ogni sprite si registra con una colonna d'ancoraggio; `SpriteManager.drawSpriteAligned` lo appoggia sull'hitbox anche quando è specchiato. Sostituisce i calcoli di posizione che erano in `Player`, `Enemy` e `Boss`.
- **Sfondi a 4-6 livelli di parallasse** (`BackgroundRenderer` riscritto): ogni livello si disegna una volta in un canvas da 640 px che si ripete senza cuciture; a ogni frame si disegnano solo stelle, luna, nebbia e torce. Foresta con montagne innevate e tre file di pini; castello con castelli lontani, mura merlate e colonne con stendardi; dungeon con mattoni ombreggiati, celle ad arco e torce con alone.
- **Terreno** (`TerrainRenderer`, nuovo): erba e terra con sassi, piastrelle di pietra smussate, mattoni del dungeon; piattaforme sospese come assi; porta d'uscita ad arco con luce calda; cancello a saracinesca. Gli abissi mostrano un fondo scuro (prima restava il frame precedente sotto quota 200).
- **HUD e schermate**: pannello metallico con bordo dorato, cuore e salute a segmenti ombreggiati, punteggio dorato, gemma, teschio sulla barra del boss; titolo con scritta metallica a fasce e scintilla; riquadri decorati; tasti in rilievo; menu con voce scelta in bianco-oro.
- **Oggetti e icone ombreggiati** (sempre 8×8): pozione, moneta, gemma; icone elmo, cuore, teschio.
- **PixelPainter** (nuovo): le primitive di disegno del `Renderer` ora funzionano su qualsiasi canvas (servono per i livelli di parallasse). Nuove primitive: `fillDitheredOverlay` (retino di un solo colore), `fillCircle`, `fillGlow` (alone), `rowColors` di `drawText` (scritte a fasce).
- **Test**: 17 controlli nuovi (372 in totale): ogni colore degli sprite e del terreno è della palette, ogni frame contiene l'hitbox e tutti i frame di un personaggio hanno la stessa ancora, allineamento normale e specchiato, retino sovrapposto, aloni, cerchi, testo a fasce.
### Modificato
- `THEME_STYLES` (`levelConfig.ts`) descrive tessitura e rampe del terreno (`terrainTexture`, `surfaceColors`, `fillColors`, `ledgeColors`, `detailColors`) al posto dei 4 colori della 1.0. Nuovi tipi `ThemeStyle` e `TerrainTexture`.
- `BOSS_SPRITE_STYLES`: ogni boss definisce 10 colori (k, n, d, s, w, r, e, y, c, p) invece di 6.
- `SpriteManager.registerSprite` accetta l'ancora (quarto parametro, facoltativo); `drawSlashArc` accetta il colore della scia e non lascia buchi negli archi grandi.
- `PLAYER_CONFIG.spriteWidth/spriteHeight`: 24 / 30 (solo informativi).
- Rimosse le pose delle gambe a 12 colonne della 1.0 da `spriteTools.ts` (ogni personaggio ha le sue).
- `CODE_MANUAL`: esempi 6 (nuovo nemico) e 10 (nuovo boss) aggiornati al nuovo codice; `verify-docs` conta i segmenti della salute con `HEALTH_SEGMENT_GEOMETRY`.
- Manuali aggiornati (`ARCHITECTURE` sez. 6, `CODE_MANUAL`, `FEATURES`, `GAME_MANUAL`, `TESTING`).
### Verificato
- `npm run typecheck`, `npm test` (372 controlli), `npm run verify-docs` (11 esempi), `npm run build`.
- Chrome headless sulla build di prova: tutte le schermate e i tre livelli con 0 pixel fuori palette, controllati anche a occhio (attacchi specchiati compresi).
- Il bot dei test nel browser (`tests/browser/harness.js`), eseguito in Chrome headless **senza Playwright**: 3 partite complete vinte (livelli 1-2-3), 0 colori fuori palette nei frame controllati, 0 violazioni delle regole; 6000 frame di tasti a caso senza problemi.
- Prestazioni: circa 0,8 ms di media per aggiornamento più disegno (Chrome senza GPU).
### Limiti
- `npm run test:browser` (Playwright) non è stato eseguito: vale quanto detto per la 2.0.0-alpha.1.
- L'ondulazione per riga è ancora inutilizzata (servirà per acqua e calore nella Fase 4).
- La grafica è stata valutata solo da chi l'ha disegnata: serve il parere di chi gioca.

## 2.0.0-alpha.1 – Versione 2.0, Fase 1: fondamenta grafiche a 16 bit (2026-11-21)
Prima fase della versione 2.0 (grafica a 16 bit, nuovi nemici, boss, ambientazioni e contenuti). Il gioco resta lo stesso:
cambia il motore grafico, che ora offre gli strumenti per ridisegnare tutto a 16 bit nella Fase 2.
### Aggiunto
- **Palette a rampe** (`src/config/paletteConfig.ts`): 54 colori (massimo 64) organizzati in 11 rampe dallo scuro al chiaro (acciaio, blu, verdi, caldi, fuoco, magia, pelle, terra, pietra, palude, oro). I 16 colori della 1.0 hanno lo stesso nome e valore e fanno parte delle rampe. `PALETTE` resta importabile da `gameConfig.ts`.
- **Effetti di colore** (`src/rendering/PaletteEffects.ts`, funzioni pure): retino ordinato di Bayer 4×4, gradienti a fasce, ombreggiatura lungo le rampe (`shadeColor`), ciclo dei colori (`cycleRampColor`, modalità `loop` e `pingPong`), ondulazione per riga.
- **Renderer**: `fillDithered`, `fillVerticalGradient`, `applyLineWave`, opzione `shadowColor` di `drawText`. Nessuno produce colori fuori palette.
- **Font**: minuscole con discendenti, minuscole accentate italiane, `;` e `"`, spaziatura proporzionale (le cifre restano a larghezza fissa). Altezza del glifo: 9 righe (le maiuscole occupano sempre le righe 0-6).
- **SpriteManager**: `drawSpriteSilhouette` disegna la sagoma di uno sprite in qualsiasi colore; le sagome si creano alla prima richiesta.
- **Strumenti per gli sprite**: `addOutline` (contorno automatico) e `remapSpriteKeys` (varianti).
- **Test**: nuova suite `graphics-16bit.test.mjs` (42 controlli); controlli sulla palette a rampe in `config-integrity.test.mjs`. Totale: 355 controlli in 12 file.
### Modificato
- **Risoluzione interna 320×240** (era 256×240): stessa altezza, quindi livelli e bilanciamento non cambiano; la vista è più larga.
- HUD, riquadri dei messaggi, titolo, controlli, pausa e vittoria sono disposti rispetto al centro dello schermo.
- Sfondi: cieli a fasce con retino (foresta e castello), cuore delle torce del dungeon con ciclo dei colori. Corretti i cicli degli elementi ripetuti (castello lontano, colonne, archi, torce, catene), che con 320 px lasciavano vuota la parte destra dello schermo.
- `index.html` (canvas 320×240), test unitari e test nel browser leggono le dimensioni da `GAME_CONFIG`.
- Versione portata a 2.0.0-alpha.1; manuali aggiornati (`ARCHITECTURE` sez. 6.1 sugli strumenti a 16 bit, `CODE_MANUAL`, `FEATURES` con la tabella della 2.0, `GAME_MANUAL`, `INSTALLATION`, `TESTING`).
### Verificato
- `npm run typecheck`, `npm test` (355 controlli), `npm run verify-docs` (11 esempi), `npm run build`.
- Chrome headless sulla build: titolo, controlli, pausa e i tre livelli si disegnano a 320×240 con 0 pixel fuori palette.
### Limiti
- **I test nel browser (`npm run test:browser`) non sono stati rieseguiti** (Playwright non installato): sono stati adattati alla nuova risoluzione ma non provati.
- Gli sprite sono ancora quelli della 1.0: il ridisegno a 16 bit è la Fase 2.
- L'ondulazione per riga è pronta ma non ancora usata nei livelli.

## 1.0.0 – Fase 10: test, verifiche e distribuzione (2026-11-20)
Prima versione completa: gioco arcade con spada, combo statiche, nemici, tre livelli e boss, come previsto per la 1.0.
### Aggiunto – test (ora inclusi nel progetto)
- **`npm test`**: 308 controlli unitari in 11 file (`tests/unit/`), eseguiti in Node in meno di un secondo. Comprendono i test scritti nelle fasi precedenti (movimento, combattimento, IA, livelli, boss, oggetti, interfaccia, effetti, regressioni) e nuove suite: coerenza di tutte le configurazioni (ogni sprite, animazione, combo e livello), velocità coerente a 20-144 FPS, rendering e fisica, regole statiche del codice.
- **`npm run test:browser`**: 165 controlli in Chromium (richiede Playwright, non incluso nel progetto). Aprono la **build reale con `file://`**, provano **17 combinazioni di finestra e scala di sistema**, fanno giocare **un bot che usa solo eventi di tastiera veri fino alla vittoria**, eseguono **120.000 frame di tasti a caso**, verificano la palette su ogni schermata, la pausa, il Game Over, il record dopo il ricaricamento, l'assenza di audio e di richieste di rete, e la velocità con carico artificiale.
- **`TESTING.md`**: che cosa è verificato, come ripetere le prove, mappa dei requisiti di qualità, difetti trovati, limiti.
### Corretto (difetti trovati dalle verifiche)
- **L'altezza del salto dipendeva dagli FPS** (45,8 px a 20 FPS, 52,3 a 144 FPS): la gravità ora si integra con la velocità media del frame (`CollisionSystem.applyGravityAndMove`). Altezza 53,4 px a tutte le frequenze (valore teorico 53,4). Il salto a 60 FPS è passato da 50,8 a 53,4 px: livelli e bilanciamento verificati di nuovo.
- **Colori fuori palette in gioco**: le colline della foresta usavano altezze frazionarie e il browser sfumava i bordi. `Renderer.fillRect` ora arrotonda tutti e quattro i bordi.
- **Pixel irregolari con la scala di sistema frazionaria (125%, 150%...)**: la scala intera ora si calcola in **pixel fisici** (`devicePixelRatio`). Prima, con il 150%, 3 pixel CSS per pixel di gioco erano 4,5 pixel fisici.
- Il giocatore poteva essere spinto fuori dalla mappa da un blocco al bordo in una situazione estrema: dopo la risoluzione sull'asse X si riapplica il limite della mappa.
### Modificato
- Versione portata a 1.0.0 (`package.json`, `GAME_CONFIG.version`, manuali).
- Manuali aggiornati: `GAME_MANUAL` (dimensione della finestra), `INSTALLATION` (comandi di test, archivi), `CODE_MANUAL` (cartella `tests/`, nuove funzioni), `ARCHITECTURE` (rendering in pixel fisici, integrazione della gravità, test), `FEATURES` (stati aggiornati, compatibilità browser e prova con persone indicate come "Da implementare"), `BALANCE` (misure rifatte).
### Distribuzione
- `IRON_AND_SHADOW_v1.0.0.zip`: progetto completo (sorgenti, test, strumenti, manuali, `package-lock.json`, `dist/`), senza `node_modules`.
- `IRON_AND_SHADOW_v1.0.0_gioco.zip`: solo la versione giocabile e un `LEGGIMI.txt`.
- Verifica da archivio pulito: estratto lo ZIP in una cartella vuota, `npm ci`, `npm run typecheck`, `npm test`, `npm run build` e apertura di `dist/index.html` con `file://` (vedi `TESTING.md`).
### Problemi noti e limiti
- **Provato solo in Chromium** (su Linux). Firefox, Safari, Edge e browser mobili non sono stati provati.
- **Nessuna partita giocata da una persona**: il bilanciamento è misurato con un bot semplice (vedi `BALANCE.md`).
- Finestra sotto 256×240 pixel fisici: il gioco viene tagliato (non esiste scala frazionaria, per scelta di stile).
- Con la scala di sistema 150% e 300% il bordo del canvas può sfumare di 1 pixel fisico (invisibile a occhio).
- Sotto i 22 FPS il gioco rallenta invece di saltare i frame (tetto del delta time, voluto).
- Il record dipende dal browser e dalla posizione del file; la classifica con più punteggi non c'è.
- Un solo boss nel gioco; la difficoltà ha tre livelli di configurazione ma non un selettore in gioco; niente audio (escluso dal progetto).
- `npm audit` segnala 2 vulnerabilità nel server di sviluppo (`vite`/`esbuild`): non riguardano il gioco compilato (vedi `INSTALLATION.md`).

## 0.9.1 – Correzione di due difetti (2026-11-20)
Segnalati durante una prova di gioco.
### Corretto
- **Il goblin del livello 3 ributtava il giocatore nell'abisso.** Il goblin aspetta al bordo dell'abisso (non cammina nel vuoto) e, appena il giocatore atterra, attacca: il rinculo spingeva il cavaliere indietro, giù dal bordo. Riprodotto con la simulazione: su 15 salti riusciti sull'abisso 900-936, il giocatore veniva ributtato nel vuoto **15 volte su 15**.
  - **Causa:** il rinculo non teneva conto del terreno.
  - **Correzione:** durante lo stordimento il rinculo si ferma se oltre il bordo non c'è terreno entro 48 px (`knockbackLedgeCheckDepth`). Ora 0 volte su 15 (il danno si subisce comunque). La protezione vale per tutti i nemici e per il boss, in qualsiasi livello.
  - **In più:** il goblin del livello 3 è stato spostato da x=980 a x=1040 (a più di 100 px dal bordo dell'abisso).
- **Il cavaliere continuava ad attaccare dopo aver smesso di premere.** Premendo l'attacco a raffica, gli attacchi continuavano per circa 0,65 secondi dopo l'ultima pressione.
  - **Causa:** un effetto collaterale di una correzione della 0.8.0. Il buffer degli attacchi non scadeva mai mentre il cavaliere era impegnato: un tasto premuto all'inizio di una sequenza lunga restava in coda e partiva molto dopo.
  - **Correzione:** un attacco si memorizza solo se può partire entro 200 ms (`attackBufferMs`) e il buffer scade sempre dopo 200 ms. Premere molto prima non serve più (il tasto viene ignorato); il concatenamento delle combo con una cadenza normale o a raffica continua a funzionare (almeno 4 attacchi in 2 secondi premendo ogni 100 ms).
### Verificato
- Nuova suite di regressione (21 test): **12 falliscono sul codice con i difetti e tutti passano sul codice corretto** (così i test misurano davvero i difetti).
- Prova nel browser con il motore reale: raffica di 40 pressioni a ~50 ms → l'ultimo attacco parte 133 ms dopo l'ultima pressione e dopo 1,5 s non c'è nessun attacco in corso; cavaliere sul bordo dell'abisso del livello 3 colpito dal goblin (100 → 84 HP) senza cadere.
- Tutte le suite precedenti e `npm run verify-docs` (11 esempi) ancora verdi; `npm run balance` rieseguito (vedi `BALANCE.md`).
### Modificato
- `attackBufferMs`: nuovo significato (finestra degli ultimi 200 ms prima di poter attaccare). Un test della Fase 4 che premeva l'attacco a 100 ms dall'inizio è stato aggiornato: quel tasto ora è troppo anticipato e viene ignorato per scelta.
### Limiti
- Il goblin che attende al bordo e attacca chi atterra resta una situazione difficile (si subiscono 8 HP) ma non più letale.

## 0.9.0 – Fase 9 (2026-11-20)
### Aggiunto – documentazione
- `GAME_MANUAL.md`: storia, ambientazione, controlli, regole, combattimento, combo, nemici, boss, livelli, oggetti, punteggio, consigli. I dati (statistiche, punteggio massimo di 5900, numero di nemici per livello) sono stati ricavati dal codice.
- `CODE_MANUAL.md`: struttura dei file e variazioni rispetto alla struttura iniziale, ogni modulo con classi, interfacce, variabili e funzioni principali, tabelle di tutte le configurazioni, flussi di esecuzione, relazioni tra i componenti e **11 esempi pratici** (salute, velocità, salto, danno della spada, combo, nuovo nemico, comportamento di un nemico, nuovo oggetto, nuovo livello, nuovo boss, nuova animazione).
- `ARCHITECTURE.md`: obiettivi e compromessi, game loop, stati, input, rendering, entità, combattimento, boss, livelli, **punti di estensione futuri** (con l'indicazione esplicita che non sono implementati) e un progetto per i modificatori di statistiche dei futuri power-up.
- `INSTALLATION.md` completo (requisiti, installazione, comandi, configurazione, compilazione, distribuzione, avvisi di `npm audit`, problemi comuni).
- `FEATURES.md` riscritto: ogni funzionalità con uno stato (Implementata, In sviluppo, Da implementare, Pianificata, Non prevista).
### Aggiunto – verifica degli esempi
- `npm run verify-docs` (`tools/verifyManualExamples.mjs`): applica ogni esempio del manuale a una copia del progetto, controlla che il "codice originale" compaia una sola volta, che il codice modificato compili e che il comportamento sia quello descritto. Il controllo viene eseguito anche sul codice originale, dove **deve fallire**: così si sa che misura davvero la modifica. Opzione `--export <n> <cartella>` per ottenere una copia del progetto con l'esempio già applicato.
### Modificato – per rendere possibili gli esempi
- **Catalogo dei boss** (`BOSS_CATALOG`): ogni livello può scegliere il boss con `bossId`; sprite e animazioni si generano per ogni boss con il prefisso del suo id (`blackKnightIdle1`...). Prima c'era un solo boss cablato nel codice.
- **Barra della salute dell'HUD:** ora ha sempre 10 segmenti (prima ne aveva uno ogni 10 HP e, con più salute massima, sbordava sul testo centrale).
- Aggiornati commenti ormai obsoleti nel codice (riferimenti a fasi passate).
### Verificato
- `npm run verify-docs`: **11 esempi su 11** verificati (originale unico, compilazione, comportamento, il controllo fallisce sul codice originale).
- Lo script è stato messo alla prova con errori introdotti di proposito (valore sbagliato, codice originale non corrispondente, codice che non compila): li ha segnalati tutti.
- Gli esempi 6, 8, 9, 10 e 11 provati anche nel browser con il motore reale: il Bruto compare e ferisce, l'elisir cura, il livello aggiunto porta al boss e alla vittoria, il Re Scheletro mostra due tacche sulla barra, l'esultanza blocca i comandi. Nessun errore in console.
- Typecheck, build, `file://` e tutte le suite di test precedenti ancora verdi.
### Limiti
- Gli esempi verificano compilazione e comportamento in Node; l'aspetto grafico è stato guardato nel browser solo per gli esempi sopra citati.
- Non è stato esteso il supporto per boss con forma diversa o attacchi nuovi (richiede di estendere `bossSprites.ts` e `Boss.ts`): è scritto nel manuale.

## 0.8.0 – Fase 8 (2026-11-20)
**Audio non implementato per scelta del progetto** (non richiesto): `AudioManager` non esiste e non ci sono musiche né effetti sonori.
### Aggiunto – effetti grafici (`EffectsManager`)
- Scintille ai colpi, esplosione di particelle alla morte dei nemici e del boss, polvere all'atterraggio e alla schivata, scintillio alla raccolta degli oggetti.
- Scritte che salgono: "+100" per i nemici, "+50 / +200" per monete e gemme, "+30 HP" per le pozioni.
- **Tremolio dello schermo** (a pixel interi, solo mondo, non HUD) quando si subisce un colpo, alla morte dei nemici e del boss.
- **Hit-stop**: una pausa di 40 ms (75 ms per i colpi pesanti, 70 ms quando si viene colpiti) dà peso agli impatti. Gli input premuti durante la pausa non vanno persi.
- **Lampo bianco** sul nemico colpito (e sul boss).
- Parametri raccolti in `EFFECT_CONFIG` (`GameEngine.ts`).
### Aggiunto – rifiniture di gioco
- **Coyote time** (80 ms: si può saltare subito dopo aver lasciato un bordo) e **salto anticipato** (100 ms: un salto premuto poco prima di atterrare viene eseguito all'atterraggio).
- **Cura a fine livello**: +30 HP (non nell'ultimo livello), mostrata nel messaggio.
### Modificato – bilanciamento (vedi `BALANCE.md`)
- Nuovo parametro `attackInterruptWindowMs`: i colpi interrompono gli attacchi nemici solo all'inizio della preparazione (scheletro 150 ms; goblin e soldato mai).
- Goblin: raggio d'attacco 14 → 18.
- Boss: salute 300 → 290, fendente 25 → 20, carica 20 → 16, pausa 1200 → 1500 ms, fase 2 con pausa x0,75.
- `ItemManager.collectItems` restituisce gli oggetti raccolti (non più il numero).
### Aggiunto – strumenti
- `npm run balance`: simulatore di bilanciamento con bot (`tools/balance.mjs`). Documentazione in `BALANCE.md`.
### Verificato
- Typecheck, build, `file://` senza errori.
- Test di logica: movimento 13, combattimento 36, IA 32, livelli/boss/oggetti 51, interfaccia 28, effetti e salto 21.
- Prova nel browser con il motore vero: hit-stop osservato (circa 40-75 ms), particelle, popup, tremolio ±3 px dopo un colpo subito, pozione +30, +30 HP a fine livello 1, nessuna cura dopo il boss, nessun errore in console.
- Simulazioni di bilanciamento prima e dopo le modifiche (tabelle in `BALANCE.md`).
### Limiti
- Il bilanciamento è stato misurato solo con un bot semplice; non è stato provato da persone.
- Il bot non sfrutta bene la schivata: l'efficacia della schivata nel gioco è verificata dai test di logica, non dalle simulazioni.
- Il livello 3 è volutamente il più difficile; potrebbe risultare duro per chi non schiva.

## 0.7.0 – Fase 7 (2026-11-20)
### Aggiunto
- **Vite** (`LivesManager`, 3 iniziali): alla morte si perde una vita e si ricomincia il livello; a zero vite c'è il **Game Over** (con "RIPROVA" e "TORNA AL TITOLO").
- **HUD** (`HUDManager`): barra superiore con salute a segmenti (lampeggia sotto il 30%), vite con icona dell'elmo, punteggio a 6 cifre, gemme, numero del livello e barra del boss con la tacca della fase 2. Riquadri per i messaggi di livello.
- **Record locale** (`HighScoreManager`): il miglior punteggio si salva nel browser (localStorage) a fine partita e compare su titolo, Game Over e vittoria con la scritta "NUOVO RECORD!". Se l'archivio non è disponibile funziona solo in memoria, senza errori.
- **Menu** (`MenuManager`): navigazione circolare con W/S o frecce, cursore a due lati.
- **Schermate rifinite** (`ScreenManager`): titolo con castello animato, logo con ombra e cavaliere; controlli con i tasti disegnati; pausa con **retino a scacchi** (oscuramento senza trasparenze, in stile 8 bit); Game Over; Vittoria con storia finale, punteggio, gemme e record.
- Icona dell'elmo e glifo `^` nel font.
### Correzioni
- **Punteggio dopo la morte:** tornava al valore al momento della morte invece che a quello di inizio livello (errore di ordine delle chiamate introdotto in Fase 6), permettendo di accumulare punti morendo. Ora si ripristina il valore a inizio livello. Individuato dalla prova nel browser.
- Schermata dei controlli: una riga usciva dallo schermo (258 px su 256).
### Modificato
- `ScreenManager` non gestisce più direttamente le voci di menu (delegate a `MenuManager`).
- `ScreenManager.render` riceve un oggetto `ScreenData` (punteggio, record, gemme) invece di una stringa.
- L'HUD provvisorio è stato rimosso.
### Verificato
- Typecheck, build, `file://` senza errori.
- Test di logica: 13 (movimento) + 36 (combattimento) + 29 (IA) + 51 (livelli/boss/oggetti) + 28 nuovi (vite, record con archivio normale/guasto/assente/corrotto, menu, transizioni di stato, font).
- Prova nel browser con il motore reale: tre morti consecutive (vite 3 -> 2 -> 1 -> 0) -> Game Over, record salvato, "Riprova" riparte con 3 vite e punteggio a zero, vittoria con nuovo record, **record ancora presente dopo il ricaricamento della pagina**, comandi di gioco bloccati in pausa, nessun errore in console.
- Screenshot controllati: titolo, controlli, HUD (anche con salute bassa), pausa, Game Over, vittoria.
### Limiti
- Il record è un solo valore: la classifica con più punteggi è pianificata.
- Il record è legato al browser e alla posizione del file: aprendo `index.html` da un'altra cartella o con un altro browser il record riparte da zero.
- Nessuna partita completa giocata da una persona: il bilanciamento è da rifinire (Fase 8).

## 0.6.0 – Fase 6 (2026-11-20)
### Aggiunto
- **Tre livelli completi** (`LEVEL_CONFIG`): Foresta Oscura (1536 px), Castello Medievale (1792 px), Dungeon Sotterraneo (1536 px) con abissi, piattaforme sospese, blocchi e gradini. Ogni livello ha nemici, oggetti e una condizione di completamento.
- **Sfondi con parallasse** (`BackgroundRenderer`), disegnati solo con rettangoli: foresta (luna, colline, pini), castello (stelle, castello lontano, colonne con stendardi), dungeon (mattoni, archi con sbarre, torce che tremolano, catene).
- **Progressione:** messaggio di inizio livello, completamento (porta d'uscita o boss sconfitto), bonus di 500 punti, livello successivo e schermata di **vittoria** dopo l'ultimo. Il punteggio finale è mostrato in vittoria e Game Over.
- **Boss "Cavaliere Nero"** (`Boss`, 300 HP): fendente e carica con preparazione visibile (700 ms), non viene stordito dai colpi (lampeggia in bianco), resta vulnerabile dopo la carica. Due fasi: sotto il 50% è più veloce e carica più spesso. Barra della salute dedicata e sprite 24x40.
- **Arena del boss:** quando il giocatore entra, un cancello a sbarre si chiude alle sue spalle.
- **Oggetti raccoglibili** (`ItemManager`, `ITEM_CONFIG`): pozione (+30 HP), moneta (+50), gemma (+200 e conteggio collezionabili).
- **Cadute:** ora costano 15 HP e il giocatore riparte dall'ultimo punto sicuro (prima si ripartiva dall'inizio del livello).
- `SpriteManager`: sagome bianche per il lampo di danno.
### Modificato
- `BOSS_CONFIG` ora è un `BossDefinition` completo con fasi (`phases`).
- Dopo la morte si ricomincia il livello corrente (dalla 0.7.0 con vite e Game Over; il ripristino del punteggio era errato fino alla 0.6.x).
- La "porta di uscita" e il cancello sono disegnati con rettangoli (nessun asset esterno).
### Verificato
- Typecheck, build, `file://` senza errori in console.
- Test di logica: movimento 13, combattimento 36, IA 29, e 51 nuovi (dati dei livelli, boss, oggetti, danno da caduta).
- **Validazione dei livelli:** abissi <= 36 px, piattaforme raggiungibili (<= 44 px di salita), nemici e oggetti appoggiati sulle superfici, uscita e boss su terreno.
- **Bot di attraversamento:** con la fisica reale raggiunge l'uscita (o l'arena) in tutti e tre i livelli senza cadere, saltando abissi e blocchi.
- Prova nel browser con il motore reale: completamento di livello 1 e 2, passaggio al livello 3, chiusura del cancello, boss attivo, impossibilità di tornare indietro, boss sconfitto -> completamento -> vittoria; screenshot delle tre ambientazioni e del boss in entrambe le fasi.
### Non verificato / limiti
- Nessuna partita completa giocata da una persona: bilanciamento e difficoltà dei livelli vanno ancora rifiniti (Fase 8).
- Il bot di attraversamento ignora i nemici; le piattaforme sospese sono verificate con regole geometriche, non percorse dal bot.
- Il test con il motore completo è stato eseguito in una pagina di prova che accede alle variabili interne; il gioco distribuito non espone nulla.

## 0.5.0 – Fase 5 (2026-11-20)
### Aggiunto
- **Nemici** (`Enemy`) guidati da `ENEMY_CONFIG`: salute, danno, velocità, raggio di individuazione, distanza di attacco, fasi dell'attacco, rinculo, ricompensa. Si generano dalle posizioni del livello (`LevelManager.createEnemies()`) e applicano i moltiplicatori di difficoltà.
- **Tre comportamenti** (`EnemyAISystem`):
  - *patrol* (Scheletro Guerriero): pattuglia una zona di ±60 px; se vede il giocatore lo affronta restando nella zona;
  - *chase* (Goblin): aspetta, poi insegue il giocatore entro 110 px e smette oltre 1,5x il raggio;
  - *guard* (Soldato Nemico): fermo, si volta verso il giocatore e attacca se è a portata.
- Nessun nemico cammina nel vuoto o attraversa i muri (sonde davanti ai piedi).
- **Attacchi dei nemici** in tre fasi (preparazione, colpo, recupero) con un solo colpo per attacco. La schivata del giocatore evita il danno.
- **Morte del nemico:** animazione, rimozione dopo 700 ms e **punteggio** (`ScoreManager`, mostrato in alto a destra).
- Sprite e animazioni di Scheletro, Goblin e Soldato (idle, camminata, attacco, danno, morte). Il Soldato è una variante cromatica del cavaliere.
- `AnimationDefinition.frameDurationsMs`: durata diversa per ogni frame.
- Strumenti di disegno sprite condivisi in `rendering/sprites/spriteTools.ts`.
- Livelli 1-3: nemici posizionati (il livello 1 li mostra tutti e tre).
### Rimosso
- I manichini di prova della Fase 4.
### Modificato
- `soldier`: hitbox 12x24 (prima 14x26).
- Dopo la morte del giocatore si riparte dall'inizio del livello con nemici e punteggio azzerati (vite e Game Over in Fase 7).
### Verificato
- Typecheck, build, `file://` senza errori; sprite registrati correttamente nel browser.
- 29 test di logica sull'IA e i combattimenti + le suite precedenti (movimento 13/13, combattimento 35/35).
- Prova nel browser: scheletro che attacca e danneggia il giocatore, barra della salute, lampeggio d'invulnerabilità.
### Non verificato nel browser
- Uccisione di un nemico con assegnazione del punteggio: coperta dai test di logica ma non da una partita completa.
- Bilanciamento: valori iniziali, da rifinire in Fase 8.

## 0.4.0 – Fase 4 (2026-11-20)
### Aggiunto
- **Attacchi della spada:** leggero (Spazio) e pesante (J). Ogni attacco in `ATTACK_DEFINITIONS` ha danno, durata, finestra attiva (`hitStartMs`/`hitEndMs`), recupero (`cooldownMs`), area d'urto e animazione.
- **Combo statiche** (`COMBO_DEFINITIONS`): `tripleSlash` = Spazio, Spazio, Spazio (15, 15, 30 di danno). `ComboManager` fa avanzare la sequenza entro la finestra di tempo, altrimenti riparte.
- **Input anticipato (buffer):** un attacco premuto durante quello in corso viene eseguito appena possibile.
- **Schivata** (K): scatto di circa 48 px con invulnerabilità per tutta la durata e tempo di recupero (700 ms).
- **Sistema di danni:** `Player.takeDamage()` con rinculo, stordimento, invulnerabilità temporanea di 1 s con lampeggio, e morte a 0 HP. `CombatSystem` applica i colpi ai bersagli (`Damageable`), una sola volta per attacco.
- Hitbox degli attacchi specchiata quando il cavaliere guarda a sinistra (`getAttackWorldHitbox`).
- Sprite e animazioni: tre attacchi leggeri, attacco pesante, danno, schivata, morte. Le durate dei frame di attacco derivano dalla durata dell'attacco (restano sincronizzate se si modifica il bilanciamento).
- Hook per il futuro: `Player.getDamageMultiplier()` e `CombatSystem.calculateDamage()` sono i punti dove inserire power-up e danni elementali.
### Provvisorio (verrà sostituito)
- Due `TrainingDummy` nel livello 1 servono da bersaglio: spariranno con i nemici veri (Fase 5).
- Barra della salute in alto a sinistra: HUD completo in Fase 7.
- Dopo la morte il cavaliere riparte dall'inizio con salute piena dopo 1,5 s: vite e Game Over in Fase 7.
### Comportamento di gioco
- A terra, durante un attacco non ci si muove né si salta né si cambia direzione; in aria si può attaccare e controllare il movimento.
- Non si può schivare durante un attacco o in aria.
### Verificato
- Typecheck, build, `file://` senza errori in console.
- 35 test di logica (combo, finestra di tempo, buffer, danno 15/15/30, pesante, hitbox specchiata, schivata e cooldown, invulnerabilità, rinculo, morte e ripartenza, sincronizzazione animazioni) + 13 test del movimento della Fase 3.
- Prova nel browser: combo a tre colpi sul manichino, pesante, schivata, pausa senza input di gioco.
- Un difetto trovato durante i test e corretto: il buffer degli input scadeva prima della fine dell'attacco.
### Non verificato
- Subire danno da nemici veri (non esistono ancora): `takeDamage` è testato solo da codice.

## 0.3.0 – Fase 3 (2026-11-20)
### Aggiunto
- `GameObject` (posizione, velocità, direzione, hitbox) e `Player` (movimento, salto, gravità, stati, animazioni).
- Salto variabile: rilasciando il tasto in salita il salto si accorcia (`jumpCutMultiplier`).
- `CollisionSystem`: collisioni a assi separati (X poi Y), piattaforme solide e **sospese** (`oneWay`: si attraversano dal basso e ci si atterra sopra), limiti della mappa, `isOnGround`.
- Gestione delle cadute: cadendo sotto la mappa si riparte dall'inizio del livello (la perdita di vite arriva in Fase 7).
- `Camera` laterale che segue il giocatore ed è limitata ai bordi della mappa.
- `LevelManager` minimale: carica un livello da `LEVEL_CONFIG` e disegna terreno e piattaforme per ambientazione (`THEME_STYLES`).
- `SpriteManager` (sprite descritti come testo, con versione specchiata) e `AnimationPlayer` (`AnimationManager.ts`).
- Sprite del cavaliere (16x24): idle (2 frame), camminata (4), salto, caduta. Animazioni in `animationConfig.ts`.
- Interfaccia `InputSource`, che permette di testare le entità senza tastiera.
- Livello 1 con abisso, piattaforme sospese e un blocco solido per provare il movimento.
### Modificato
- La scena segnaposto della Fase 2 è stata sostituita dal livello reale.
- Nuove costanti: `GAME_CONFIG.maxFallSpeed`, `PLAYER_CONFIG.spriteWidth/spriteHeight/jumpCutMultiplier`.
### Non ancora presente
- Animazioni attacco, danno, schivata, morte (Fase 4); la corsa non è prevista.
- Sfondi decorativi (Fase 6): per ora cielo a tinta unita.
- Nemici, oggetti e boss del livello sono solo dati: non vengono ancora creati.
### Verificato
- Typecheck, build, apertura `file://` senza errori in console.
- 13 test di logica con input simulato: atterraggio, camminata ~80 px/s, direzione, altezza salto (~51 px), salto variabile, niente doppio salto, stati jump/fall, limite mappa, muro solido, piattaforma sospesa, abisso, indipendenza dagli FPS (30 vs 120 fps).
- Prova visiva nel browser: idle, camminata, salto, scorrimento camera.

## 0.2.0 – Fase 2 (2026-11-20)
### Aggiunto
- `GameLoop`: requestAnimationFrame con delta time in secondi (limitato a `maxDeltaTimeSeconds`).
- `GameState`: macchina a stati (title, controls, playing, paused, gameOver, victory) con transizioni validate.
- `InputManager`: tasti centralizzati, pressione singola senza auto-repeat, tenuto/rilasciato, contesti `gameplay`/`menu` che bloccano i comandi non pertinenti, rilascio tasti alla perdita del focus.
- `Renderer`: canvas 256x240, scala intera, rettangoli e testo.
- `BitmapFont`: font bitmap 5x7 nitido (il testo nativo del canvas è sfocato e rovinerebbe lo stile 8 bit).
- `ScreenManager`: schermate titolo, controlli, pausa, game over e vittoria con menu da tastiera.
- `GameEngine`: coordina i moduli; pausa automatica se la finestra perde il focus.
- Nuove azioni `menuUp` / `menuDown` (W/S, frecce) e `INPUT_CONTEXT_ACTIONS` in `controlsConfig.ts`.
### Note
- La scena "playing" è un segnaposto (quadrato animato) per dimostrare il delta time: sarà sostituita in Fase 3.
- Game Over e Vittoria sono implementate come schermate ma non ancora raggiungibili dal gioco (arrivano con vite e livelli).
### Verificato
- Typecheck e build; apertura `file://` senza errori; flusso menu/pausa/ripresa da tastiera; tempo di gioco fermo in pausa; spazio ignorato nei menu; delta time (primo frame 0, limite 0.05 s); validità dei glifi.

## 0.1.0 – Fase 1 (2026-11-20)
### Aggiunto
- Progetto npm + TypeScript (strict) + Vite.
- Struttura cartelle `src/`, `public/assets/`, `documentation/`.
- Configurazioni: gioco, palette, giocatore, attacchi/combo, nemici, boss, controlli, livelli, difficoltà.
- Tipi condivisi in `src/types/`.
- Build compatibile con apertura `index.html` via doppio clic.
- Canvas 256x240 con scala intera (schermata di prova).
### Problemi noti
- Il gioco non è ancora giocabile (motore in Fase 2).
