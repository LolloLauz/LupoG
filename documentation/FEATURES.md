# Funzionalità

Versione: **2.0.0**. (Il piano dell'equipaggiamento è in "Non ancora rilasciato" nel CHANGELOG.)

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
| Test unitari inclusi (`npm test`, 1063 controlli) | Implementata | |
| Test nel browser (`npm run test:browser`, 175 controlli) | Implementata | richiede Playwright, non incluso; eseguiti per la 2.0.0: 165/165; dopo la Fase 6 del piano espansioni: 174/174; dopo il piano dell'equipaggiamento: 175/175 |
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
| Livello 6 "Lande Desolate" (tramonto, altopiani, ossa, polvere al vento) con il **Signore delle Lande** (accette a ventaglio, carica, predoni, fendente); la Torre dell'Ombra diventa il livello 7 | Implementata | Fase 8 del piano espansioni; non provato da persone |
| Nuovi nemici: **Predone** (lancia accette, indietreggia), **Scorpione Gigante** (corazzato, scatto con il pungiglione), **Avvoltoio** (volante, picchiata veloce) | Implementata | Fase 8 del piano espansioni; tutti nel livello 6 |
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
| Accovacciarsi (S / ↓): hitbox più bassa, piedi fermi, niente movimento; si attacca restando accovacciati | Implementata | sprite accovacciati (anche per i 14 frame d'attacco), da verificare nel gioco |
| Corsa | Non prevista | `run` esiste nel tipo `PlayerState` ma non è usato |
| Salute, vite, invulnerabilità temporanea | Implementata | |
| Personaggi con classi (`CharacterDefinition`, `CHARACTER_CONFIG`): **Cavaliere** (equilibrato, spada), **Ranger** (veloce, 75 HP, arco, schivata lunga e frequente), **Berserker** (130 HP, danno ×1,3, ascia, schivata corta e ogni 1,6 s), **Paladino** (lento, 110 HP, danno subito ×0,75, mazza, si cura di 1 HP/s dopo 4 s senza colpi) | Implementata | Fase 4 del piano espansioni; sprite ricolorati dal cavaliere con testa propria (cappuccio, elmo con corna, pennacchio bianco); non provato da persone; il bot di bilanciamento usa solo la spada |
| Scelta del personaggio dal menu del titolo (schermata con statistiche in tacche, arma iniziale e tratto), salvata nei progressi | Implementata | Fase 4; scegliendo un personaggio si impugna la sua arma iniziale, le altre armi raccolte restano nella borsa |
| Stamina (barra nell'HUD): la consumano schivata, attacchi pesanti (15) e abilità; recupero dopo 0,6 s; "STANCO" quando non basta | Implementata | Fase 5 del piano espansioni; valori per personaggio in `CHARACTER_CONFIG` |
| Abilità speciali (tasto L, costo in stamina e ricarica): onda d'urto (Cavaliere), tiro in ritirata (Ranger), carica furiosa (Berserker), scudo (Paladino) | Implementata | Fase 5; `ABILITY_CONFIG`; gli scatti si fermano sul bordo degli abissi; non provato da persone |
| Parata con lo scudo (Paladino): para i colpi da davanti e le frecce, costa stamina; parata perfetta (scudo alzato da meno di 0,25 s) gratuita, stordisce l'attaccante per 1 s; guardia rotta senza stamina | Implementata | Fase 5; i boss non vengono storditi |
| Gestione delle cadute (danno e ripartenza dall'ultimo punto sicuro) | Implementata | |

## Combattimento

| Funzionalità | Stato | Note |
|---|---|---|
| Spada: attacco leggero e pesante | Implementata | |
| Struttura delle armi (`WeaponDefinition`): attacchi, combo e velocità per arma; arma in mano salvata nei progressi | Implementata | Fase 0 del piano espansioni |
| Armi corpo a corpo: pugnale, lancia, ascia (rompe la guardia), mazza (schiaccia le corazze) | Implementata | Fase 1; sprite del cavaliere per ogni arma, da verificare nel gioco; bilanciamento misurato solo con il bot |
| Forzieri (si aprono colpendoli), nemici d'élite (alone dorato, lasciano un'arma), trofei dei boss | Implementata | Fase 1 |
| Armi a distanza: arco (tiro caricato tenendo J), balestra (ricarica), coltelli da lancio (6, si recuperano da terra), giavellotto (3, trafigge, si perde); proiettili del giocatore contro nemici, boss e forzieri; munizioni nella borsa e nell'HUD | Implementata | Fase 2 del piano espansioni; non provato da persone; il bot di bilanciamento usa solo la spada |
| Combo miste e ramificate (leggero e pesante) per arma, con il nome mostrato al completamento; attacchi in aria come categoria separata: combo in volo e colpo in picchiata con rimbalzo | Implementata | Fase 3 del piano espansioni; non provato da persone |
| Lasciare a terra con Q (l'arma in mano) o Q+1-4 (un posto: un'arma con le sue munizioni o una pozione); solo a terra, mai l'ultima arma | Implementata | segnalazione dopo la Fase 4 |
| Munizioni anche per arco (12) e balestra (6); faretra in ogni livello che riempie le munizioni di tutte le armi della borsa | Implementata | segnalazione dopo la Fase 4 (le armi a distanza erano troppo facili); non provato da persone |
| Borsa (4 posti): armi e pozioni raccolte con E, scelte con 1-4; pozioni conservate (massimo 2) invece di curare al tocco; borsa piena: l'arma in mano resta a terra; armi salvate nei progressi; ripristino a inizio livello quando si perde una vita | Implementata | dopo la Fase 1, su richiesta; i power-up restano automatici; bilanciamento misurato solo con il bot (vedi `BALANCE.md`) |
| Corpi solidi: il giocatore non entra nei nemici a terra né nel boss, se non con la schivata; chi gli sta addosso lo colpisce comunque | Implementata | `CollisionSystem.separateHorizontally`, `GameEngine.separatePlayerFromBodies` |
| Combo statiche predefinite e configurabili | Implementata | `tripleSlash` |
| Buffer degli attacchi premuti in anticipo (ultimi 200 ms) | Implementata | un tasto premuto molto prima viene ignorato |
| Schivata con invulnerabilità | Implementata | |
| Collisioni arma-nemico, un colpo per attacco | Implementata | |
| Sistema di danno, rinculo, stordimento | Implementata | il rinculo non spinge il giocatore giù dai bordi |
| Effetti: scintille, particelle, tremolio, hit-stop, lampo bianco | Implementata | |
| Combo personalizzabili dal giocatore | Non prevista | |
| Magie | Pianificata | le abilità della Fase 5 coprono gli attacchi speciali |
| Elementi ed effetti di stato: bruciatura (Fuoco), veleno, gelo (rallenta), shock (stordisce; i boss subiscono danno); power-up Veleno, Gelo, Fulmine; effetti anche da proiettili e abilità | Implementata | Fase 7 del piano espansioni; il danno nel tempo non uccide mai; aloni e numeri colorati sui nemici |
| Resistenze e debolezze agli elementi per nemico e boss (`elementModifiers`) | Implementata | Fase 7; immune = 0, resiste = 0,5, debole = 1,5-2 |

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
| Boss aggiuntivi nel gioco | Implementata | Fase 4 della 2.0: quattro boss; Fase 8 del piano espansioni: Signore delle Lande |
| Attacchi nuovi per un boss | Implementata | 2.0 Fase 3: 4 tipi di attacco configurabili; un tipo nuovo richiede di estendere `Boss.ts` |

## Livelli e oggetti

| Funzionalità | Stato | Note |
|---|---|---|
| Tre livelli: Foresta Oscura, Castello Medievale, Dungeon Sotterraneo | Implementata | |
| Sfondi con parallasse per ognuna delle tre ambientazioni | Implementata | |
| Livelli come dati (nuovo livello senza toccare il motore) | Implementata | esempio 9 del manuale |
| Progressione tra livelli, bonus e cura di fine livello | Implementata | |
| Condizioni di completamento: raggiungere l'uscita, sconfiggere il boss | Implementata | |
| Arena del boss con cancello | Implementata | il boss non esce mai dall'arena (`Boss.arenaMinX`): prima poteva inseguire il giocatore fuori e restare chiuso fuori |
| Schermata di vittoria | Implementata | |
| Pozione, moneta, gemma | Implementata | |
| Nuovi oggetti tramite configurazione | Implementata | esempio 8 del manuale |
| Power-up temporanei (Furia, Velocità, Scudo, Fuoco, Rigenerazione) | Implementata | 2.0 Fase 5; vedi `ARCHITECTURE.md` sez. 10 |
| Potenziamenti permanenti con le gemme (Vitalità, Resistenza, Forza, Scorta), schermata dal titolo; gemme messe da parte a fine livello | Implementata | Fase 6 del piano espansioni; `UPGRADE_CONFIG`; non usano `PowerUpDefinition.type = "permanent"` (i bonus vanno direttamente al giocatore) |
| Monete (monete raccolte, nemici, boss) e bottega tra un livello e l'altro (pozione, cura, faretra, un'arma già trovata) | Implementata | Fase 6; `ECONOMY_CONFIG`, `SHOP_OFFERS`, `Shop`; il bot di bilanciamento non usa la bottega. Dal piano dell'equipaggiamento (E6) la bottega è una stanza camminabile; quella a menu resta come ripiego (`SHOP_ROOM_CONFIG.isEnabled`) |
| Sblocchi: Ranger, Berserker e Paladino raggiungendo i livelli 3, 4 e 6; armi trovate almeno una volta in vendita nella bottega | Implementata | Fase 6; salvati nei progressi |
| Nuove ambientazioni | Implementata | Fase 4 della 2.0: sei ambientazioni; Fase 8 del piano espansioni: Lande Desolate |

## Equipaggiamento (piano E1-E6)

| Funzionalità | Stato | Note |
|---|---|---|
| Rarità degli oggetti (Comune, Non comune, Raro, Epico, Leggendario, Mitico) con colore, peso, prezzo e numero di modificatori | Implementata | E1; `RARITY_CONFIG` |
| Oggetti con modificatori estratti (danno, recupero, velocità, furto di vita, salute, stamina, difesa, resistenza, elemento, rompe la guardia) e tetti sul totale | Implementata | E1; `AFFIX_CONFIG`, `ItemFactory`, `EquipmentStats`; estrazione con seme iniettabile |
| Leggendari (uno per arma, tre armature) e Mitici (un'arma e un elmo) fissi | Implementata | E1/E3; `LEGENDARY_ITEMS`, `MYTHIC_ITEMS` |
| Sprite su misura per i Mitici | Pianificata | per ora i Mitici usano i colori della rarità, come gli altri oggetti (scelta del 25/11/2026); procedura in `PIANO_EQUIPAGGIAMENTO.md` |
| Migrazione dei salvataggi (armi di prima = Comuni) | Implementata | E1; `ProgressManager` salva `bagItems`, `armor`, `backpack` e continua a scrivere `bagWeaponIds` |
| Armature: elmo, corazza, stivali in quattro materiali (stoffa, cuoio, ferro, acciaio), set di materiale, resistenze agli elementi dei colpi nemici | Implementata | E2; `ARMOR_CONFIG`, `ARMOR_SETS`; `EnemyDefinition.attackElement`, `ProjectileDefinition.element` |
| Aspetto: metallo delle armi nel colore della rarità, armature che ricolorano la loro parte del personaggio | Implementata | E2-E3; varianti di colore create alla prima richiesta (`SpriteColorVariant`), nessun frame in più |
| Spadone a due mani (lento, portata lunga, rompe la guardia, due combo) | Implementata | E3; scheletro d'élite del livello 4 |
| Schermata dell'equipaggiamento (tasto I, anche dalla pausa) con zaino di 12 posti, confronto in verde e rosso, scheda dell'oggetto, Q per lasciare a terra | Implementata | E4 |
| Fonti degli oggetti: forzieri, nemici, élite, boss (arma e armatura), boss finale (unica fonte dei Mitici), rarità che crescono con il livello e la difficoltà | Implementata | E5; `LOOT_SOURCES`, `LootSystem` |
| Bottega come stanza camminabile: mercante, piedistalli, E per comprare, porta d'uscita; arma e armatura con rarità; prezzi che salgono a ogni acquisto; niente rivendita | Implementata | E6; `SHOP_ROOM_LEVEL`, `SHOP_ROOM_CONFIG`, ambientazione `shop` |
| Rinnovo dell'offerta della bottega a pagamento | Pianificata | opzionale nel piano |
| Altre armi (frusta, falce, ...) | Pianificata | stesso metodo dello spadone |

## Interfaccia

| Funzionalità | Stato | Note |
|---|---|---|
| Schermata iniziale con menu e record | Implementata | |
| Schermata di scelta del personaggio (A/D per scegliere) | Implementata | Fase 4 del piano espansioni |
| Cancella dati (titolo): record, livelli raggiunti, difficoltà, personaggio e armi salvate, con conferma (No predefinito) | Implementata | segnalazione dopo la Fase 4 |
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
