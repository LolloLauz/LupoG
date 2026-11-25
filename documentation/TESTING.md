# Test e verifiche

Versione descritta: **2.0.1**. Questo documento dice **cosa è stato verificato, come ripetere le verifiche e quali sono i limiti**.
Non dichiara nulla che non sia stato eseguito: i numeri sono quelli dell'ultima esecuzione prima della consegna.

---

## 1. Come eseguire i test

| Comando | Cosa fa | Richiede | Durata |
|---|---|---|---|
| `npm run typecheck` | controllo dei tipi TypeScript (strict) | `npm install` | pochi secondi |
| `npm test` | **test unitari**: 1111 controlli in 29 file, eseguiti in Node | `npm install` | meno di 1 secondo |
| `npm run test:browser` | **test nel browser**: 174 controlli sulla build reale e sul motore reale | Playwright (sotto) | circa 1 minuto (`-- --quick`: 40 s) |
| `npm run verify-docs` | applica i 11 esempi del `CODE_MANUAL.md` a una copia del progetto | `npm install` | circa 15 secondi |
| `npm run balance` | simulatore di bilanciamento con un bot (non è un test: produce misure); `-- --characters` misura solo i personaggi | `npm install` | circa 1 minuto |
| `npm run build` | controllo dei tipi + versione distribuibile in `dist/` | `npm install` | pochi secondi |

I test unitari e `verify-docs` non richiedono nulla oltre a `npm install`. I **test nel browser** usano Playwright, che **non è una dipendenza del progetto**
(per non appesantirlo): per eseguirli una volta sola

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

Senza Playwright il comando stampa queste istruzioni ed esce senza eseguire nulla.

Un file di test si può eseguire da solo con una parte del nome: `npm test -- combat`.

---

## 2. Che cosa verificano

### 2.1 Test unitari (`tests/unit/`, 1111 controlli)

| File | Controlli | Che cosa copre |
|---|---|---|
| `movement.test.mjs` | 13 | movimento, salto, salto variabile, niente doppio salto, gravità, muri, piattaforme sospese, abissi, indipendenza dagli FPS |
| `combat.test.mjs` | 37 | attacchi leggeri e pesanti, combo (avanzamento, finestra di tempo, ripartenza), buffer, schivata e suo tempo di ricarica, invulnerabilità, rinculo, danno, morte e ripartenza, hitbox specchiata, sincronizzazione animazioni |
| `enemy-ai.test.mjs` | 41 | pattuglia dentro la zona, inseguimento e perdita d'interesse, guardia, attacco in tre fasi, danno e schivata, interruzioni degli attacchi, morte e rimozione, moltiplicatori di difficoltà, niente salti nel vuoto |
| `levels-boss-items.test.mjs` | 89 | geometria dei livelli, bot di percorribilità, boss (risveglio, fendente, carica, fasi, morte, nessuno stordimento), oggetti (cura, punti, gemme), danno da caduta |
| `config-integrity.test.mjs` | 85 | ogni sprite si registra (colori della palette, ancore che contengono l'hitbox), ogni frame delle animazioni è uno sprite, combo e attacchi coerenti, nemici/boss/oggetti ben formati, controlli senza conflitti, palette (al massimo 64 colori distinti, 16 colori della 1.0 invariati, rampe ordinate dallo scuro al chiaro, ogni colore in una rampa), **tutti i livelli** (regole geometriche e percorribilità), nessun oggetto o forziere dentro un blocco solido |
| `interface-state.test.mjs` | 28 | vite, record (archivio normale, guasto, assente, corrotto), menu, transizioni di stato, font |
| `effects-and-jump.test.mjs` | 21 | particelle, popup, tremolio, hit-stop, coyote time, salto anticipato |
| `rendering-and-physics.test.mjs` | 20 | rettangoli a pixel interi, scala intera in pixel fisici rappresentabile dal browser (16 combinazioni, telefono al 300%), gravità esatta, atterraggio, soffitto, limiti della mappa |
| `speed-consistency.test.mjs` | 11 | camminata, salto, nemico, boss, animazioni, effetti e delta time a 20, 30, 60, 120 e 144 FPS |
| `regressions.test.mjs` | 21 | rinculo vicino agli abissi e attacco a raffica (difetti della 0.9.1) |
| `graphics-16bit.test.mjs` | 54 | retino di Bayer, retino sovrapposto, aloni, cerchi, testo a fasce, sprite allineati all'hitbox (anche specchiati), gradienti a fasce, ombreggiatura, ciclo dei colori, ondulazione, `Renderer` su un finto canvas (retino, gradiente, ondulazione, testo con ombra), font (glifi, discendenti, spaziatura proporzionale, cifre a larghezza fissa), contorno e varianti degli sprite |
| `systems-phase3.test.mjs` | 58 | (Fase 4) balzo del lupo e bordo degli abissi, divisione della melma, corazza del golem, 7 livelli con i nuovi elementi (Lande Desolate dalla Fase 8 del piano espansioni), forme dei boss; proiettili (volo, durata, colpo, passaggio durante la schivata, muri e piattaforme sospese, deviazione con la spada, palla di fuoco non deviabile, uscita dalla mappa), arciere (tiro alla fine della preparazione, una freccia per attacco, raggio, altezza, ritirata, interruzione), pipistrello (volo senza gravità, picchiata che ferisce, piattaforme sospese, caduta da morto), acqua, ghiaccio, spuntoni, nemici che evitano i pericoli, piattaforme mobili (andata e ritorno, trasporto), boss (ventaglio di proiettili, evocazione con limite, ripiego sul corpo a corpo, pesi zero) |
| `powerups-progress.test.mjs` | 28 | modificatori (combinazione, durata che riparte, scadenza che non tocca gli altri, permanenti), effetti di Furia, Fuoco, Scudo, Velocità e Rigenerazione, raccolta, difficoltà (nemici, boss, vite), progressi salvati (assenti, corrotti, archivio bloccato), selezione dei livelli e voce della difficoltà nel menu |
| `crouch.test.mjs` | 19 | accovacciarsi: hitbox bassa con i piedi fermi, niente movimento, soffitti solidi e a senso unico, niente accovacciata in aria o da colpiti, attacco da accovacciati (hitbox e sprite restano bassi), varianti accovacciate di ogni frame d'attacco, frame valido se colpiti durante un attacco da accovacciati |
| `body-contact.test.mjs` | 13 | corpi solidi: camminando ci si ferma al bordo del nemico (da entrambi i lati), la schivata lo attraversa, chi resta dentro viene spinto fuori, contro un muro si sposta il nemico, colpo a contatto e area d'urto dalla metà del corpo, volanti e morti non bloccano, boss solido, ordine nel motore |
| `weapons.test.mjs` | 27 | armi: definizioni coerenti (id, attacchi unici, combo e predefiniti dell'arma, animazioni sincronizzate), la spada identica alla 2.0, cambio d'arma (annulla attacco e combo, attacchi e velocità della nuova arma), arma salvata nei progressi (assente, sconosciuta, salvataggio 2.0.0), il motore dà l'arma salvata |
| `weapons-phase1.test.mjs` | 45 | armi corpo a corpo: statistiche relative (pugnale rapido, lancia lunga, ascia lenta e forte), solo l'ascia rompe la guardia e solo la mazza schiaccia le corazze (effetti su soldato, golem, scheletro), nemici d'élite, forzieri, armi a terra e scambio (l'arma vecchia resta a terra e non si riprende subito), tutti i frame del cavaliere per ogni arma, icone, HUD, ogni arma presente nei livelli, forzieri e trofei su terreno sicuro, collegamenti nel motore |
| `inventory.test.mjs` | 28 | borsa: tasti E e 1-4 (solo in gioco), tabella dei controlli che non tocca le scritte, posti, armi (posto libero, doppioni, borsa piena con l'arma in mano lasciata a terra), pozioni (limite, bere, posto che si libera), copia e ripristino, salvataggio delle armi (assente, vecchio, non valido), pozioni non automatiche e power-up automatici, collegamenti nel motore |
| `combos-phase3.test.mjs` | 31 | combo: ramificazione, nome all'ultimo colpo, combo che continua una più corta, finestra scaduta; dati di ogni arma (attacchi propri, stesso inizio = stessi attacchi, ogni combo eseguibile: recupero più breve della finestra, combo mista con nome, picchiata solo in aria); il cavaliere (combo miste di spada, pugnale e ascia, categorie terra/aria separate, picchiata: discesa, area sotto i piedi, atterraggio con recupero, rimbalzo e nuova picchiata); scritte dentro lo schermo; collegamenti nel motore |
| `weapons-phase2.test.mjs` | 45 | armi a distanza: configurazione (proiettili del giocatore e loro sprite, niente area d'urto, carica dell'arco, munizioni), tiri dell'arco (direzione, carica minima, metà, piena, tiro automatico), coltelli finiti e avviso, giavellotto, power-up sui tiri; proiettili del giocatore (colpiscono i nemici e non il giocatore, trafiggere, coltello contro muro e nemico che cade a terra, perso fuori mappa, non deviabili); munizioni nella borsa (ricarica, recupero, giavellotti finiti, borsa piena); coltelli a terra; presenza nei livelli; collegamenti nel motore; cambio d'arma a metà attacco (il frame disegnato esiste per la nuova arma, a terra e in aria) |
| `characters.test.mjs` | 58 | personaggi (Fase 4): configurazione (il cavaliere legge `PLAYER_CONFIG`, ranger, berserker e paladino come da piano), salute e cambio di personaggio, velocità con e senza arma, danno inflitto e subito (anche con Furia e Scudo, almeno 1 HP), cura lenta del paladino (attesa dopo i colpi, anche ambientali; non oltre il massimo), schivata (distanza e attesa), percorribilità di ogni livello per ogni personaggio con l'arma più lenta, sprite (ogni frame di ogni arma, colori della palette, anteprime, varianti accovacciate), salvataggio (assente, vecchio, non valido), schermata di scelta (parte dal salvato, A/D circolari, Invio, Esc, voce del titolo), tacche delle statistiche |
| `feedback-fixes.test.mjs` | 32 | segnalazioni dopo la Fase 4: il boss non esce dall'arena (senza limite il difetto si riproduce; con il limite nessun boss supera il cancello in 15 s, nemmeno caricando), munizioni di arco (12) e balestra (6), niente tiro caricato senza frecce, faretra (ricarica tutte le armi, resta a terra se non serve, una per livello prima dell'arena), tasto Q (arma con munizioni, una pozione alla volta, mai l'ultima arma, solo a terra, Q+1-4 e Q da solo), cancella dati (progressi e record, anche ricaricando e con archivio bloccato; conferma con "no" predefinito) |
| `classes-phase0.test.mjs` | 48 | Classi Fase 0 (tutto neutro): `ResourcePool` (spesa, attesa, recupero, massimo, svuotamento), costo delle abilità (`stamina`, `mana`, `health`, salute da lasciare almeno a 1), slot delle abilità (`selectAbilitySlot`, slot inesistenti, scudo abbassato, ricarica per slot), tag delle armi (categoria, peso, scaling), tabella delle affinità neutra, attributi a zero e fonte `attributes` di `PlayerModifiers` (`clear()` non la tocca), mana a 0 |
| `stamina-abilities.test.mjs` | 41 | Fase 5: configurazione (stamina e abilità per personaggio, tasto L, animazioni sincronizzate con i frame di ogni arma), stamina (costo della schivata, pausa e recupero, massimo, "stanco", attacco pesante sì e leggero no), onda d'urto (costo, ricarica, area davanti e dietro, un solo impatto, non in aria, non da accovacciati, niente accovacciata durante l'abilità), tiro in ritirata (balzo invulnerabile, freccia senza munizioni), carica furiosa (scatto con colpo, attraversa i nemici), scudo (alzare, girarsi senza muoversi, consumo, parata perfetta con stordimento, parata normale, colpo alle spalle, guardia rotta, abbassamento senza stamina, frecce fermate), HUD (barra, riquadro L, colori), collegamenti nel motore |
| `progression.test.mjs` | 50 | Fase 6: configurazione (economia, bottega, costi crescenti dei potenziamenti, bonus, sblocchi a livelli esistenti), monete (spesa solo se bastano, ripristino, moneta raccolta), bottega (voci con e senza armi da vendere, arma scelta tra quelle trovate, cura, pozione e borsa piena, faretra, arma esaurita, monete insufficienti senza spesa, borsa senza posti), progressi (gemme salvate, potenziamenti e livello massimo, armi trovate, sblocchi e personaggio bloccato salvato, cancella dati, dati strani, salvataggi vecchi), giocatore con i potenziamenti, stati e schermate (bottega con uscita solo da PROSEGUI, potenziamenti, personaggio bloccato), collegamenti nel motore |
| `elements.test.mjs` | 33 | Fase 7: configurazione (quattro elementi, power-up e oggetti con sprite, presenza nei livelli, resistenze valide per ogni nemico e boss), `StatusEffects` (veleno, debolezza, immunità, bruciatura, durata che riparte, gelo e resistenza, shock con il tempo senza stordimento, più effetti), nemici (danno nel tempo che non uccide, immunità, morto senza effetti, gelo a metà velocità, shock che interrompe un attacco), boss (shock come danno, resistenze, danno nel tempo che non uccide), giocatore (elementi dai power-up, con le proprietà dell'arma, nei colpi di spada e nelle frecce), collegamenti nel motore |
| `equipment.test.mjs` | 69 | piano dell'equipaggiamento E1-E2: rarità (ordine, colori consueti, modificatori per rarità, pesi e estrazioni su 20000 prove, Mitico mai a caso), estrazione ripetibile con il seme, modificatori (intervalli entro il tetto, numero per rarità, niente doppioni, uno di stile negli Epici e mai sotto, l'ascia senza "rompe la guardia"), oggetti fissi (un Leggendario per arma, Mitici, valori entro i tetti), nomi, prezzi, uguaglianza e copia, salvataggi (oggetti validi e no, Leggendari alterati, migrazione dalle armi di prima, armature e zaino salvati, niente riscritture inutili, dati strani), borsa con oggetti (stesso tipo diverso, identico, zaino, indossare, scambiare, togliere, zaino pieno, ripristino), armature (dodici pezzi, toni della palette, corazza e materiali, rarità), set, tetti, giocatore (salute, difesa, minimo 1 danno, resistenze, danno ed elementi dell'arma, rompe la guardia, furto di vita), aspetto (chiavi di elmo e gambe, colori di partenza, cappuccio del ranger, icone, varianti, solo colori della palette) |
| `equipment-phases.test.mjs` | 38 | E3-E6: spadone (statistiche, animazioni sincronizzate, combo eseguibili anche in aria, un frame per ogni posa anche accovacciata, icona, presenza nei livelli e Leggendario), fonti (pesi validi, Mitici solo dal boss finale, crescita con livello e difficoltà, niente Mitici dai forzieri su 3000 prove, ricompensa del boss finale, materiali per livello, tutti i posti), bottega (offerta ripetibile con il seme, prezzi per rarità, prezzo che sale dopo un acquisto, consumabili che non rincarano, armatura comprata indossata, niente rivendita), schermata dell'equipaggiamento (stati, tasto I e Q nei menu, tabella dei controlli, cursore tra armature, borsa e zaino, comandi, voce della pausa), stanza del negozio (attiva con il ripiego, niente nemici, pavimento e uscita, piedistalli, ambientazione e colori del mercante), collegamenti nel motore |
| `static-rules.test.mjs` | 28 | strict, nessun `any`, tipi di ritorno espliciti, nomi, nessun audio né risorsa esterna, struttura del progetto, versioni e manuali aggiornati |

### 2.2 Test nel browser (`tests/browser/`, 175 controlli, Chromium)

> **Stato nella 2.0.0.** La suite è stata **rieseguita con Playwright** (Chromium headless, macOS): **165 controlli, 0 falliti**, dopo due correzioni:
> - un controllo cercava i "Controlli" come seconda voce del menu, che ora ne ha quattro (si usa W, il menu è circolare);
> - **un difetto reale**: a 844×390 con scala di sistema 300% (telefono in orizzontale) il 18% dei blocchi di pixel era irregolare. Con 320 px di larghezza,
>   4 pixel fisici per pixel di gioco danno 1280 pixel fisici = 426,667 px CSS, che il browser (misure in multipli di 1/64 di pixel) riduce a 1279,97 e
>   ricampiona. Ora `computeIntegerScale` (in `Renderer.ts`) sceglie la scala intera più grande che il browser rappresenta esattamente (lì 3): 0% di blocchi irregolari.
> Durante le alpha intermedie (2.0.0-alpha.1 - alpha.5) la suite non era stata eseguita; al suo posto il bot di `harness.js` e il fuzz giravano in Chrome headless
> senza Playwright (vedi `CHANGELOG.md`).

| Sezione | Che cosa si verifica |
|---|---|
| **1. Build reale con `file://`** | la build riesce; nessun errore in console; tutte le richieste sono file locali di `dist/` (nessuna rete); nessuna richiesta fallita; canvas 320×240; solo colori della palette; tastiera vera (Invio, Esc, D, Spazio, K); la pausa congela l'immagine e blocca i comandi di gioco; 1500 pressioni di tasti a caso senza errori; **nessun uso dell'audio** (AudioContext, Audio, play) |
| **2. Dimensioni dello schermo** | 17 combinazioni di finestra e scala di sistema (da 320×240 a 3840×2160, 100%-300%, verticale e orizzontale): scala intera in pixel fisici, canvas centrato, `image-rendering: pixelated`, nessuna sfumatura all'interno, pixel di gioco quadrati; ridimensionamento durante il gioco |
| **3. Motore reale** | schermate e flusso con tastiera (titolo, controlli, pausa, riprendi); palette di ogni schermata; **scelta del personaggio** (si apre dal titolo, Invio conferma ed Esc chiude; ognuno dei quattro entra in gioco con classe, salute piena, arma iniziale e sprite esistenti, solo colori della palette); **potenziamenti** (si aprono dal titolo, palette, Esc) e **bottega** (E6: a fine livello si entra nella stanza del negozio, solo colori della palette, E vicino al primo piedistallo compra una pozione, la porta in fondo porta al livello 2; il bot che gioca tutto il gioco attraversa la stanza camminando); **schermata dell'equipaggiamento** (I la apre e la chiude, solo colori della palette); **cancella dati** (conferma con "no" predefinito, poi record, livelli, personaggio e armi come alla prima partita, anche dopo aver ricaricato); velocità identica a 30, 60, 120 e 144 passi al secondo; tre morti → Game Over → "Riprova"; rendering dei tre livelli; **un giocatore automatico che usa solo eventi di tastiera completa tutto il gioco fino alla vittoria** (con la spada; raccoglie le pozioni con E e ne beve una quando ha perso almeno 30 HP; se serve un altro salto rilascia e ripreme il tasto, e a contatto con un nemico si gira verso di lui prima di attaccare); regole sempre valide (posizioni finite e dentro la mappa, salute, vite, punteggio, camera); prestazioni; record salvato e ancora presente dopo il ricaricamento; **120.000 frame di tasti a caso** con teletrasporti e passi da 7 a 50 ms |
| **4. Velocità sotto carico** | con il loop reale e un carico artificiale fino a 55 ms per frame, la distanza percorsa resta uguale al tempo reale finché si resta sopra i 22 FPS |

---

## 3. Verifica dei requisiti di qualità

Corrispondenza con l'elenco "Qualità e test" del progetto:

| Requisito | Come è verificato | Esito |
|---|---|---|
| Compilazione TypeScript | `npm run typecheck`, `npm run build` (anche dentro `test:browser` e nella verifica da archivio) | ✔ |
| Strict mode | `static-rules`: `strict`, `noImplicitAny`, `noImplicitReturns`, `noUnused*` attivi | ✔ |
| Input da tastiera | eventi di tastiera veri nel browser; menu e contesti nei test unitari | ✔ |
| Movimento, salto, collisioni | `movement`, `rendering-and-physics`, `speed-consistency` | ✔ |
| Combattimento, combo | `combat`, `regressions`, bot nel browser | ✔ |
| Salute | `combat`, `levels-boss-items` (danno, cura, morte, caduta) | ✔ |
| Nemici, boss | `enemy-ai`, `levels-boss-items`; il bot nel browser li affronta tutti | ✔ |
| Livelli | `config-integrity` (geometria + percorribilità), rendering dei tre livelli nel browser | ✔ |
| Oggetti, punteggio | `levels-boss-items`, `interface-state`, bot nel browser | ✔ |
| Pausa | test nel browser (immagine congelata, comandi bloccati) | ✔ |
| Game Over | test nel browser con tastiera ("Riprova") | ✔ |
| Audio | assente per scelta; verificato che il codice non lo usi (`static-rules`) e che durante tutto il test nel browser non venga creato nulla | ✔ (non applicabile) |
| Rendering | palette rispettata su ogni schermata e su ogni frame campionato; nessuna sfumatura | ✔ |
| Nessun errore bloccante | zero errori in console in tutte le sessioni del test, compresi 120.000 frame casuali e 1500 tasti sulla build reale | ✔ |
| Risorse caricate correttamente | nessuna richiesta fallita, nessuna richiesta di rete | ✔ |
| Dimensioni dello schermo diverse | 17 combinazioni e ridimensionamento in gioco | ✔ (vedi limiti) |
| Velocità coerente | 20-144 FPS nei test unitari; 30-144 passi/s e carico artificiale nel browser | ✔ |
| Manuali aggiornati | `static-rules` (versione e CHANGELOG), `verify-docs` (esempi) | ✔ |

---

## 4. Difetti trovati e corretti durante la Fase 10

La fase di verifica ha trovato **difetti reali del gioco**, oltre a errori nei test stessi (corretti anch'essi):

| Difetto | Come è emerso | Correzione |
|---|---|---|
| **L'altezza del salto dipendeva dagli FPS**: 45,8 px a 20 FPS, 52,3 a 144 FPS (la durata in aria variava di 0,12 s) | `speed-consistency` | la gravità si integra con la velocità media del frame (`CollisionSystem.applyGravityAndMove`): ora 53,4 px a tutte le frequenze (valore teorico 53,4) |
| **Colori fuori palette in gioco** (sfumature sui bordi delle colline della foresta) | palette dei frame nel browser | `Renderer.fillRect` arrotonda tutti e quattro i bordi a pixel interi |
| **Pixel irregolari con la scala di sistema 150%** (frequente su portatili Windows): 3 pixel CSS per pixel di gioco = 4,5 pixel fisici | test delle dimensioni dello schermo | la scala intera si calcola in **pixel fisici** (`devicePixelRatio`) |
| Il giocatore poteva finire fuori dalla mappa se spinto da un blocco al bordo (situazione estrema) | test con tasti a caso | dopo la risoluzione sull'asse X si riapplica il limite della mappa |

Errori dei test, non del gioco (per completezza): il bot automatico rilasciava il tasto di salto dopo un frame (salto corto), un test cercava più di 100 sprite
(ce ne sono 72), e due test con valori attesi sbagliati.

---

## 5. Limiti e cosa NON è verificato

Dichiarati con chiarezza:

- **Browser:** tutto è stato provato **solo in Chromium** (via Playwright; la 1.0 su Linux, la 2.0 su macOS). **Firefox, Safari, Edge e i browser mobili non sono stati provati.**
  Il codice usa funzioni standard (Canvas 2D, `requestAnimationFrame`, `KeyboardEvent`, `localStorage`), ma questo non equivale a una verifica.
- **Nessuna prova con persone:** non c'è stata una partita completa giocata da una persona. Il bilanciamento è misurato con un bot (vedi `BALANCE.md`).
- **Nessuna GPU e nessuno schermo reale:** i tempi di disegno (media 0,07 ms per frame nel test) sono quelli di Chromium senza GPU; indicano che il gioco è leggerissimo,
  non sono un benchmark su un computer reale.
- **Finestra più piccola del gioco (sotto 320×240 pixel fisici):** la scala minima è 1 e il canvas viene **tagliato** (non esiste una scala "frazionaria": sarebbe contro
  lo stile a pixel). Su un telefono in verticale a 100% di scala l'area visibile è minore del gioco.
- **Scala di sistema 150% e 300%:** alcune dimensioni in pixel fisici non sono esprimibili in pixel CSS (multipli di 1/64). Il gioco sceglie la scala intera più grande
  che il browser rappresenta con meno di 0,01 pixel di scarto (a volte una in meno della massima: es. 3 invece di 4 su un telefono al 300%). La soglia di 0,01 è stata
  trovata sperimentalmente in Chromium; in altri browser potrebbe essere diversa. Dove resta uno scarto, il bordo può fondersi di 1 pixel fisico con lo sfondo.
- **Sotto i 22 FPS** il tetto del delta time (0,05 s) rallenta il gioco invece di farlo "saltare": voluto, per non attraversare i muri.
- **Il fuzz non raggiunge Game Over e vittoria da solo** (lo fanno i test dedicati e il bot); nei tasti a caso gli stati visitati sono titolo, controlli, selezione dei livelli, gioco e pausa.
- **Touch e gamepad** non sono previsti: il gioco è solo da tastiera.
- **`npm audit`:** restano 2 segnalazioni su `vite`/`esbuild` nel server di sviluppo (vedi `INSTALLATION.md`); non riguardano il gioco compilato.

---

## 6. Come aggiungere un test

**Unitario:** creare `tests/unit/nome.test.mjs`:

```js
export const description = "Che cosa verifica";

export default async function (t, load) {
  const { Player } = await load("entities/Player");   // importa un modulo di src/
  const player = new Player(100, 176);
  t("il giocatore parte con 100 HP", player.currentHealth === 100);
}
```

`t(descrizione, condizione, dettaglio)` registra un controllo: se la condizione è falsa il test fallisce e il dettaglio compare nel report. `npm test` trova da solo i file `*.test.mjs`.

**Nel browser:** aggiungere i controlli a `tests/browser/run.mjs` (la pagina di prova `tests/browser/harness.js` espone `window.iron` con il motore, la tastiera simulata, il bot e le funzioni di fuzz).
