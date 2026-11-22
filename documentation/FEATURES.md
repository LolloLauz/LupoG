# Funzionalità

Versione: **2.0.0**.

**Stati usati:**

| Stato | Significato |
|---|---|
| **Implementata** | presente nel codice e verificata (con test o prove nel browser) |
| **In sviluppo** | iniziata ma incompleta |
| **Da implementare** | decisa per il progetto ma non ancora iniziata (di solito una fase della roadmap) |
| **Pianificata** | prevista per una versione futura; non iniziata; esistono al massimo punti d'aggancio |
| **Non prevista** | esclusa dal progetto |

Una funzionalità **solo progettata non è mai indicata come implementata.**

---

## Progetto e distribuzione

| Funzionalità | Stato | Note |
|---|---|---|
| TypeScript in modalità strict, nessun `any` | Implementata | `npm run typecheck` |
| Vite, npm, moduli ES | Implementata | |
| Build avviabile con doppio clic (`dist/index.html`) | Implementata | verificata in Chromium; altri browser non provati |
| Modalità sviluppatore (`dev`, `build`, `preview`, `typecheck`) | Implementata | `preview` richiede un server locale (lo avvia Vite) |
| Configurazione centralizzata in `src/config/` | Implementata | |
| Archivio ZIP completo con la versione compilata (`dist/`) | Implementata | più un archivio solo per giocare |
| Test unitari inclusi (`npm test`, 513 controlli) | Implementata | |
| Test nel browser (`npm run test:browser`, 165 controlli) | Implementata | richiede Playwright, non incluso; eseguiti per la 2.0.0: 165/165 |
| Verifica con più dimensioni di schermo e scale di sistema | Implementata | 17 combinazioni (2.0: scala scelta tra quelle rappresentabili esattamente dal browser) |
| Scala intera in pixel fisici (schermi 125%-300%) | Implementata | |
| Compatibilità con Firefox, Safari, Edge e browser mobili | Da implementare | non provata: verificato solo Chromium |
| Prova di gioco con persone reali | Da implementare | il bilanciamento è stato misurato solo con un bot |

## Motore

| Funzionalità | Stato | Note |
|---|---|---|
| Game Loop con `requestAnimationFrame` e delta time | Implementata | velocità indipendente dagli FPS (provata a 30 e 120 fps) |
| Macchina a stati (titolo, controlli, gioco, pausa, Game Over, vittoria) | Implementata | |
| Input centralizzato (premuto/tenuto/rilasciato, no auto-repeat) | Implementata | |
| Blocco dei comandi in pausa e nei menu | Implementata | |
| Tasti modificabili da file di configurazione | Implementata | `controlsConfig.ts` |
| Rimappatura dei tasti dal gioco | Non prevista | |
| Pausa automatica alla perdita del focus | Implementata | |
| Canvas 320×240 (16 bit) con scala intera e pixel nitidi | Implementata | 2.0: era 256×240 |
| Font a pixel con maiuscole, minuscole, accentate italiane e spaziatura proporzionale | Implementata | 2.0: era 5×7 solo maiuscole; le cifre restano a larghezza fissa |
| Testo con ombra (`shadowColor`) | Implementata | 2.0 |
| Camera laterale che segue il giocatore | Implementata | |

## Grafica a 16 bit (versione 2.0)

| Funzionalità | Stato | Note |
|---|---|---|
| Palette a rampe (54 colori su un massimo di 64, 11 rampe dallo scuro al chiaro) | Implementata | Fase 1; i 16 colori della 1.0 sono invariati |
| Retino ordinato (dithering Bayer 4×4) senza colori fuori palette | Implementata | Fase 1; `Renderer.fillDithered` |
| Gradienti verticali a fasce con retino (cieli) | Implementata | Fase 1; usati nei cieli di foresta e castello |
| Ciclo dei colori (palette cycling) | Implementata | Fase 1; usato in torce, stelle, scritta "nuovo record" |
| Ondulazione per riga (acqua, calore, magia) | Implementata | Fase 1; strumento pronto, non ancora usato nei livelli |
| Ombreggiatura lungo le rampe (`shadeColor`) | Implementata | Fase 1 |
| Sagome di sprite di qualsiasi colore | Implementata | Fase 1; il lampo bianco ora è un caso particolare |
| Contorno automatico degli sprite (`addOutline`) e varianti (`remapSpriteKeys`) | Implementata | Fase 1; strumenti pronti, la grafica della Fase 2 ha i contorni disegnati a mano |
| Cavaliere a 16 bit (24×30, attacchi 44×30): elmo con pennacchio, scudo, sopravveste, scie doppie | Implementata | Fase 2; hitbox invariata (12×24) |
| Nemici a 16 bit: scheletro, goblin, soldato | Implementata | Fase 2; hitbox invariate |
| Cavaliere Nero a piena risoluzione (36×41, prima era ingrandito 2×) con mantello e occhi luminosi | Implementata | Fase 2; hitbox invariata (24×40) |
| Sprite allineati all'hitbox con colonna d'ancoraggio (anche specchiati) | Implementata | Fase 2; `SpriteManager.drawSpriteAligned` |
| Oggetti e icone dell'HUD ombreggiati (pozione, moneta, gemma, elmo, cuore, teschio) | Implementata | Fase 2; oggetti sempre 8×8 |
| Sfondi con 4-6 livelli di parallasse disegnati una volta e ripetuti | Implementata | Fase 2; circa 0,8 ms per frame |
| Terreno con tessiture per ambientazione (erba e terra, pietra, mattoni), piattaforme sospese, porta e cancello ridisegnati | Implementata | Fase 2; `TerrainRenderer`, `THEME_STYLES` |
| HUD e schermate a 16 bit (pannello metallico, titoli a fasce, riquadri decorati, tasti in rilievo) | Implementata | Fase 2 |
| Effetto di ondulazione usato nei livelli (acqua) | Implementata | Fase 3; vasche della palude |
| Proiettili (freccia, dardo magico, palla di fuoco): deviabili con la spada, attraversabili con la schivata | Implementata | Fase 3; `ProjectileSystem`, `PROJECTILE_CONFIG` |
| Nemici a distanza (`ranged`: tira e indietreggia) | Implementata | Fase 3; Arciere Scheletro nei livelli 4 e 6 |
| Nemici volanti (`flyer`: volteggia e picchia, da morto cade) | Implementata | Fase 3; Pipistrello nei livelli 4-6 |
| Pericoli: spuntoni, acqua (si nuota, ondulazione), ghiaccio (scivoloso) | Implementata | Fase 3; nei livelli 4-6 |
| Piattaforme mobili che trasportano giocatore e nemici | Implementata | Fase 3; nei livelli 4-6 |
| Attacchi dei boss come dati (corpo a corpo, carica, proiettili, evocazione) con pesi per fase | Implementata | Fase 3; il Cavaliere Nero si comporta come nella 1.0 |
| Tre nuove ambientazioni (Palude Maledetta, Picchi Ghiacciati, Torre dell'Ombra) con sfondi a più livelli e terreni propri | Implementata | Fase 4; acqua con i colori dell'ambientazione |
| Livelli 4-6 con pericoli, piattaforme mobili e boss; vittoria dopo il livello 6 | Implementata | Fase 4 |
| Nuovi nemici: Lupo (balzo), Melma (si divide), Golem di ghiaccio (corazzato); Arciere e Pipistrello nei livelli | Implementata | Fase 4 |
| Nuovi boss: Strega della Palude, Re dei Lupi (forma di belva), Signore dell'Ombra (finale a tre fasi) | Implementata | Fase 4 |
| Power-up temporanei: Furia, Velocità, Scudo, Fuoco (spada incandescente), Rigenerazione; alone e tempo nell'HUD | Implementata | Fase 5; `POWER_UP_CONFIG`, `PlayerModifiers`, statistiche base mai modificate |
| Selezione dei livelli già raggiunti (salvati nel browser) | Implementata | Fase 5; `ProgressManager`, stato `levelSelect` |

## Protagonista

| Funzionalità | Stato | Note |
|---|---|---|
| Movimento orizzontale, salto, gravità | Implementata | |
| Salto variabile (rilascio del tasto) | Implementata | |
| Coyote time e salto anticipato | Implementata | |
| Collisioni con terreno, blocchi, piattaforme sospese, bordi mappa | Implementata | |
| Animazioni: idle, camminata, salto, caduta | Implementata | |
| Animazioni: attacco (4), danno, schivata, morte | Implementata | |
| Corsa | Non prevista | `run` esiste nel tipo `PlayerState` ma non è usato |
| Salute, vite, invulnerabilità temporanea | Implementata | |
| Gestione delle cadute (danno e ripartenza dall'ultimo punto sicuro) | Implementata | |

## Combattimento

| Funzionalità | Stato | Note |
|---|---|---|
| Spada: attacco leggero e pesante | Implementata | |
| Combo statiche predefinite e configurabili | Implementata | `tripleSlash` |
| Buffer degli attacchi premuti in anticipo (ultimi 200 ms) | Implementata | un tasto premuto molto prima viene ignorato |
| Schivata con invulnerabilità | Implementata | |
| Collisioni arma-nemico, un colpo per attacco | Implementata | |
| Sistema di danno, rinculo, stordimento | Implementata | il rinculo non spinge il giocatore giù dai bordi |
| Effetti: scintille, particelle, tremolio, hit-stop, lampo bianco | Implementata | |
| Combo personalizzabili dal giocatore | Non prevista | |
| Altre armi | Pianificata | v1.3 |
| Attacchi speciali, magie, abilità | Pianificata | v1.2-1.3 |
| Danni elementali | In sviluppo | 2.0: il Fuoco aggiunge danno a ogni colpo; mancano resistenze ed effetti sul bersaglio |

## Nemici e boss

| Funzionalità | Stato | Note |
|---|---|---|
| Nemici configurabili (salute, danno, velocità, raggi, ricompensa) | Implementata | |
| Tre comportamenti: pattuglia, insegue, guardia | Implementata | |
| Scheletro Guerriero, Goblin, Soldato Nemico | Implementata | |
| "Nemico medievale umano" distinto dal cavaliere | Implementata | il Soldato è una variante cromatica del cavaliere senza pennacchio |
| Attacchi in tre fasi, finestra di interruzione | Implementata | |
| Morte, rimozione, punteggio | Implementata | |
| Nuovi nemici tramite configurazione | Implementata | esempio 6 del manuale |
| Boss: Cavaliere Nero (290 HP) con fendente, carica, due fasi | Implementata | |
| Barra della salute del boss con tacche di fase | Implementata | |
| Struttura a fasi multiple e catalogo di boss | Implementata | esempio 10 del manuale (tre fasi) |
| Boss aggiuntivi nel gioco | Implementata | Fase 4: quattro boss |
| Attacchi nuovi per un boss | Implementata | 2.0 Fase 3: 4 tipi di attacco configurabili; un tipo nuovo richiede di estendere `Boss.ts` |

## Livelli e oggetti

| Funzionalità | Stato | Note |
|---|---|---|
| Tre livelli: Foresta Oscura, Castello Medievale, Dungeon Sotterraneo | Implementata | |
| Sfondi con parallasse per ognuna delle tre ambientazioni | Implementata | |
| Livelli come dati (nuovo livello senza toccare il motore) | Implementata | esempio 9 del manuale |
| Progressione tra livelli, bonus e cura di fine livello | Implementata | |
| Condizioni di completamento: raggiungere l'uscita, sconfiggere il boss | Implementata | |
| Arena del boss con cancello | Implementata | |
| Schermata di vittoria | Implementata | |
| Pozione, moneta, gemma | Implementata | |
| Nuovi oggetti tramite configurazione | Implementata | esempio 8 del manuale |
| Power-up temporanei (Furia, Velocità, Scudo, Fuoco, Rigenerazione) | Implementata | 2.0 Fase 5; vedi `ARCHITECTURE.md` sez. 10 |
| Potenziamenti permanenti | Pianificata | punto d'aggancio: `PowerUpDefinition.type = "permanent"` (2.0) |
| Nuove ambientazioni | Implementata | Fase 4: sei ambientazioni |

## Interfaccia

| Funzionalità | Stato | Note |
|---|---|---|
| Schermata iniziale con menu e record | Implementata | |
| Nuova partita | Implementata | |
| Schermata dei controlli | Implementata | |
| HUD: salute, vite, punteggio, gemme, livello, barra del boss | Implementata | |
| Pausa con oscuramento a retino | Implementata | |
| Game Over | Implementata | |
| Menu e schermate utilizzabili solo da tastiera | Implementata | |
| Vite e Game Over | Implementata | |
| Punteggio (nemici, oggetti, livelli) | Implementata | |
| Record locale (miglior punteggio) | Implementata | salvato nel browser; dipende da browser e cartella |
| Classifica con più punteggi | Pianificata | `HighScoreManager` salva un solo valore |
| Selettore di difficoltà (Facile, Normale, Difficile: nemici, boss e vite) | Implementata | 2.0 Fase 5; scelta salvata nel browser |

## Audio

| Funzionalità | Stato | Note |
|---|---|---|
| Musica ed effetti sonori | Non prevista | esclusi dal progetto; non esiste un `AudioManager` |

## Strumenti e documentazione

| Funzionalità | Stato | Note |
|---|---|---|
| Simulatore di bilanciamento (`npm run balance`) | Implementata | usa un bot semplice: indica la direzione, non il valore esatto per una persona |
| Verifica degli esempi del manuale (`npm run verify-docs`) | Implementata | |
| Documento dei test (`TESTING.md`) | Implementata | |
| Manuale di gioco, manuale del codice, architettura, installazione, changelog, bilanciamento | Implementata | |
| Versioni future: 1.1, 1.2, 1.3, 2.0 | Pianificata | vedi `ARCHITECTURE.md` sez. 10 |
