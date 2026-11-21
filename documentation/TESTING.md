# Test e verifiche

Versione descritta: **2.0.0-alpha.2**. Questo documento dice **cosa è stato verificato, come ripetere le verifiche e quali sono i limiti**.
Non dichiara nulla che non sia stato eseguito: i numeri sono quelli dell'ultima esecuzione prima della consegna.

---

## 1. Come eseguire i test

| Comando | Cosa fa | Richiede | Durata |
|---|---|---|---|
| `npm run typecheck` | controllo dei tipi TypeScript (strict) | `npm install` | pochi secondi |
| `npm test` | **test unitari**: 372 controlli in 12 file, eseguiti in Node | `npm install` | meno di 1 secondo |
| `npm run test:browser` | **test nel browser**: 165 controlli sulla build reale e sul motore reale | Playwright (sotto) | circa 1 minuto (`-- --quick`: 40 s) |
| `npm run verify-docs` | applica i 11 esempi del `CODE_MANUAL.md` a una copia del progetto | `npm install` | circa 15 secondi |
| `npm run balance` | simulatore di bilanciamento con un bot (non è un test: produce misure) | `npm install` | circa 1 minuto |
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

### 2.1 Test unitari (`tests/unit/`, 372 controlli)

| File | Controlli | Che cosa copre |
|---|---|---|
| `movement.test.mjs` | 13 | movimento, salto, salto variabile, niente doppio salto, gravità, muri, piattaforme sospese, abissi, indipendenza dagli FPS |
| `combat.test.mjs` | 37 | attacchi leggeri e pesanti, combo (avanzamento, finestra di tempo, ripartenza), buffer, schivata e suo tempo di ricarica, invulnerabilità, rinculo, danno, morte e ripartenza, hitbox specchiata, sincronizzazione animazioni |
| `enemy-ai.test.mjs` | 32 | pattuglia dentro la zona, inseguimento e perdita d'interesse, guardia, attacco in tre fasi, danno e schivata, interruzioni degli attacchi, morte e rimozione, moltiplicatori di difficoltà, niente salti nel vuoto |
| `levels-boss-items.test.mjs` | 51 | geometria dei livelli, bot di percorribilità, boss (risveglio, fendente, carica, fasi, morte, nessuno stordimento), oggetti (cura, punti, gemme), danno da caduta |
| `config-integrity.test.mjs` | 57 | ogni sprite si registra (colori della palette, ancore che contengono l'hitbox), ogni frame delle animazioni è uno sprite, combo e attacchi coerenti, nemici/boss/oggetti ben formati, controlli senza conflitti, palette (al massimo 64 colori distinti, 16 colori della 1.0 invariati, rampe ordinate dallo scuro al chiaro, ogni colore in una rampa), **tutti i livelli** (regole geometriche e percorribilità) |
| `interface-state.test.mjs` | 28 | vite, record (archivio normale, guasto, assente, corrotto), menu, transizioni di stato, font |
| `effects-and-jump.test.mjs` | 21 | particelle, popup, tremolio, hit-stop, coyote time, salto anticipato |
| `rendering-and-physics.test.mjs` | 19 | rettangoli a pixel interi, scala intera in pixel fisici (14 combinazioni), gravità esatta, atterraggio, soffitto, limiti della mappa |
| `speed-consistency.test.mjs` | 11 | camminata, salto, nemico, boss, animazioni, effetti e delta time a 20, 30, 60, 120 e 144 FPS |
| `regressions.test.mjs` | 21 | rinculo vicino agli abissi e attacco a raffica (difetti della 0.9.1) |
| `graphics-16bit.test.mjs` | 54 | retino di Bayer, retino sovrapposto, aloni, cerchi, testo a fasce, sprite allineati all'hitbox (anche specchiati), gradienti a fasce, ombreggiatura, ciclo dei colori, ondulazione, `Renderer` su un finto canvas (retino, gradiente, ondulazione, testo con ombra), font (glifi, discendenti, spaziatura proporzionale, cifre a larghezza fissa), contorno e varianti degli sprite |
| `static-rules.test.mjs` | 28 | strict, nessun `any`, tipi di ritorno espliciti, nomi, nessun audio né risorsa esterna, struttura del progetto, versioni e manuali aggiornati |

### 2.2 Test nel browser (`tests/browser/`, 165 controlli, Chromium)

> **Stato nella 2.0.0-alpha.2.** Come nella alpha.1, `npm run test:browser` non è stato eseguito. In più, il bot di `harness.js` è stato fatto
> giocare in Chrome headless senza Playwright: 3 partite complete vinte, 0 colori fuori palette, 0 violazioni; 6000 frame di tasti a caso senza problemi.
>
> **Stato nella 2.0.0-alpha.1.** I test nel browser sono stati adattati alla risoluzione 320×240 (leggono le dimensioni da `GAME_CONFIG`)
> ma **non sono stati rieseguiti** con questa versione, perché Playwright non era installato. I numeri qui sotto si riferiscono alla 1.0.0.
> Al loro posto è stata fatta una verifica con Chrome senza interfaccia (headless) sulla build: titolo, controlli, pausa e i tre livelli
> (incluso il boss) si disegnano a 320×240 con **0 pixel fuori palette**; le immagini sono state controllate a occhio.

| Sezione | Che cosa si verifica |
|---|---|
| **1. Build reale con `file://`** | la build riesce; nessun errore in console; tutte le richieste sono file locali di `dist/` (nessuna rete); nessuna richiesta fallita; canvas 320×240; solo colori della palette; tastiera vera (Invio, Esc, D, Spazio, K); la pausa congela l'immagine e blocca i comandi di gioco; 1500 pressioni di tasti a caso senza errori; **nessun uso dell'audio** (AudioContext, Audio, play) |
| **2. Dimensioni dello schermo** | 17 combinazioni di finestra e scala di sistema (da 320×240 a 3840×2160, 100%-300%, verticale e orizzontale): scala intera in pixel fisici, canvas centrato, `image-rendering: pixelated`, nessuna sfumatura all'interno, pixel di gioco quadrati; ridimensionamento durante il gioco |
| **3. Motore reale** | schermate e flusso con tastiera (titolo, controlli, pausa, riprendi); palette di ogni schermata; velocità identica a 30, 60, 120 e 144 passi al secondo; tre morti → Game Over → "Riprova"; rendering dei tre livelli; **un giocatore automatico che usa solo eventi di tastiera completa tutto il gioco fino alla vittoria**; regole sempre valide (posizioni finite e dentro la mappa, salute, vite, punteggio, camera); prestazioni; record salvato e ancora presente dopo il ricaricamento; **120.000 frame di tasti a caso** con teletrasporti e passi da 7 a 50 ms |
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

- **Browser:** tutto è stato provato **solo in Chromium** (via Playwright) su Linux. **Firefox, Safari, Edge e i browser mobili non sono stati provati.**
  Il codice usa funzioni standard (Canvas 2D, `requestAnimationFrame`, `KeyboardEvent`, `localStorage`), ma questo non equivale a una verifica.
- **Nessuna prova con persone:** non c'è stata una partita completa giocata da una persona. Il bilanciamento è misurato con un bot (vedi `BALANCE.md`).
- **Nessuna GPU e nessuno schermo reale:** i tempi di disegno (media 0,07 ms per frame nel test) sono quelli di Chromium senza GPU; indicano che il gioco è leggerissimo,
  non sono un benchmark su un computer reale.
- **Finestra più piccola del gioco (sotto 320×240 pixel fisici):** la scala minima è 1 e il canvas viene **tagliato** (non esiste una scala "frazionaria": sarebbe contro
  lo stile a pixel). Su un telefono in verticale a 100% di scala l'area visibile è minore del gioco.
- **Scala di sistema 150% e 300%:** il browser non può dimensionare il canvas con precisione al pixel fisico (la misura in pixel CSS non è rappresentabile esattamente).
  L'interno dell'immagine resta nitido; la prima e l'ultima colonna/riga possono fondersi di poco con lo sfondo e un blocco può spostarsi di 1 pixel fisico. Invisibile a occhio, ma non
  è la perfezione che si ottiene a 100%, 125%, 200%. I test lo ammettono solo in quei casi.
- **Sotto i 22 FPS** il tetto del delta time (0,05 s) rallenta il gioco invece di farlo "saltare": voluto, per non attraversare i muri.
- **Il fuzz non raggiunge Game Over e vittoria da solo** (lo fanno i test dedicati e il bot); nei tasti a caso gli stati visitati sono titolo, controlli, gioco e pausa.
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
