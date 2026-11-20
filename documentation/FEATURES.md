# Funzionalità

Versione: **1.0.0**.

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
| Test unitari inclusi (`npm test`, 308 controlli) | Implementata | |
| Test nel browser (`npm run test:browser`, 165 controlli) | Implementata | richiede Playwright, non incluso |
| Verifica con più dimensioni di schermo e scale di sistema | Implementata | 17 combinazioni; con 150% e 300% il bordo può sfumare di 1 pixel fisico |
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
| Canvas 256×240 con scala intera e pixel nitidi | Implementata | |
| Font a pixel 5×7 (solo maiuscole) | Implementata | |
| Camera laterale che segue il giocatore | Implementata | |

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
| Danni elementali | Pianificata | v1.2-1.3; punto d'aggancio: `CombatSystem.calculateDamage` |

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
| Boss aggiuntivi nel gioco | Pianificata | v1.1; il catalogo è pronto, il gioco ne ha uno |
| Attacchi nuovi per un boss | Da implementare | richiedono di estendere `Boss.ts` |

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
| Power-up temporanei (Berserk, Velocità, Scudo, Fuoco, Salute) | Pianificata | v1.2; vedi `ARCHITECTURE.md` sez. 10 |
| Potenziamenti permanenti | Pianificata | v1.2-2.0 |
| Nuove ambientazioni | Pianificata | v1.1 |

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
| Selettore di difficoltà | Da implementare | `DIFFICULTY_CONFIG` esiste, ma il gioco usa sempre `normal` |

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
