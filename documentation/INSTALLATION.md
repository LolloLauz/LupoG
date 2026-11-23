# Manuale di installazione

Versione descritta: **2.0.0**. Ci sono due modi di usare il progetto: **giocare** (nessuna installazione) e
**modificare il codice** (serve Node.js).

---

## 1. Requisiti

### Per giocare
- Un browser moderno (provato in **Chromium**; non provato su Firefox o Safari).
- La cartella `dist/` (la "versione compilata").

Non servono Node.js, npm, TypeScript né altro.

### Per modificare il codice
- **Node.js 18 o superiore** (il progetto è stato sviluppato e provato con Node 22) e **npm**.
- Un editor, per esempio **Visual Studio Code** (consigliato: segnala gli errori di TypeScript mentre scrivi).
- Un browser moderno.

---

## 2. Modalità giocatore

1. Apri la cartella del gioco.
2. Apri **`dist/index.html`** con un browser (doppio clic).
3. Premi **Invio** su *Nuova partita*.

Per rendere possibile l'avvio con doppio clic, la build produce un unico script classico con percorsi relativi, perché i browser bloccano i moduli ES aperti
da `file://`. **Cosa funziona senza server:** tutto il gioco. **Cosa dipende dal browser:** il salvataggio del **record** (usa `localStorage`): alcuni browser lo
limitano per le pagine aperte da file; in quel caso il gioco funziona lo stesso e il record dura fino alla chiusura della pagina.

> Se nella cartella principale c'è anche un `index.html`, quello è il **sorgente** (per lo sviluppo) e **non** funziona con il doppio clic: usare sempre
> `dist/index.html`.

---

## 3. Modalità sviluppatore

### 3.1 Installazione

Aprire un terminale nella cartella del progetto (quella con `package.json`) ed eseguire:

```bash
npm install
```

Installa `typescript` e `vite` nella cartella `node_modules/` (non si distribuisce).

### 3.2 Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | avvia il server di sviluppo con ricarica automatica; apre l'indirizzo mostrato (di solito `http://localhost:5173`) |
| `npm run typecheck` | controlla gli errori di TypeScript (strict) senza creare file |
| `npm run build` | controlla i tipi e crea la versione distribuibile in `dist/` |
| `npm run preview` | avvia un server locale che mostra il contenuto di `dist/` (per provare la build) |
| `npm test` | esegue i test unitari (853 controlli, meno di 1 secondo); vedi `TESTING.md` |
| `npm run test:browser` | test nel browser (richiede Playwright: `npm install --no-save playwright` e `npx playwright install chromium`) |
| `npm run balance` | simulatore di bilanciamento con un bot (vedi `BALANCE.md`); `-- --quick` per una versione rapida |
| `npm run verify-docs` | verifica gli esempi del `CODE_MANUAL.md` (vedi la sezione 7 di quel manuale) |

Un flusso tipico: `npm run dev`, modificare un file in `src/`, vedere il risultato nel browser, e alla fine `npm run build`.

---

## 4. Configurazione

Quasi tutto ciò che si può voler cambiare è in **`src/config/`**:

| Voglio cambiare... | File |
|---|---|
| salute, velocità, salto, danni del cavaliere; attacchi e combo | `playerConfig.ts` |
| nemici e boss | `enemyConfig.ts` |
| vite, gravità, bonus, cura, danno da caduta, colori della palette | `gameConfig.ts` |
| oggetti raccoglibili | `itemConfig.ts` |
| livelli (piattaforme, nemici, oggetti) | `levelConfig.ts` |
| tasti | `controlsConfig.ts` |
| animazioni | `animationConfig.ts` |

Dopo ogni modifica: `npm run typecheck`. Esempi passo passo sono nella sezione 6 di `CODE_MANUAL.md`.

**Modalità debug.** In `gameConfig.ts` impostare `debugMode: true` per vedere l'hitbox del giocatore e gli FPS.

---

## 5. Compilazione

```bash
npm run build
```

Crea la cartella **`dist/`** con:

```
dist/
├── index.html
└── assets/
    ├── game.js      tutto il codice del gioco
    └── style.css
```

Se la build segnala errori di TypeScript non crea `dist/`: correggerli prima (`npm run typecheck` li mostra).

---

## 6. Distribuzione

Per dare il gioco a qualcuno basta la cartella **`dist/`** (puoi comprimerla in uno ZIP). Chi la riceve apre `index.html` con un browser: non deve
installare niente.

Con il progetto vengono consegnati due archivi:

| Archivio | Contenuto | Per chi |
|---|---|---|
| `IRON_AND_SHADOW_v2.0.0.zip` | progetto completo: sorgenti, test, strumenti, manuali, `package-lock.json` e la versione compilata `dist/` (senza `node_modules` e senza la cartella `.git`) | chi vuole modificare il gioco |
| `IRON_AND_SHADOW_v2.0.0_gioco.zip` | solo la versione giocabile e un file `LEGGIMI.txt` | chi vuole solo giocare |

Gli archivi sono allegati alla release `v2.0.0` del repository GitHub. Quelli della 1.0.0 restano validi per la versione a 8 bit.

Nel progetto completo `package-lock.json` garantisce le stesse versioni delle dipendenze: `npm ci` le installa esattamente.

Per pubblicarlo su un sito web, caricare il contenuto di `dist/` su un qualsiasi hosting di file statici (i percorsi sono relativi, quindi
funziona anche in una sottocartella).

---

## 7. Aggiornare le dipendenze e gli avvisi di `npm audit`

Dopo `npm install` npm può segnalare alcune vulnerabilità. Quelle note per questo progetto riguardano **`esbuild` e `vite` nel server di sviluppo**
(un sito aperto nello stesso browser potrebbe leggere le risposte di `npm run dev`). Non riguardano il gioco compilato (`dist/` non contiene Vite).
Per ridurre il rischio: usare `npm run dev` solo mentre si sviluppa e non aprire siti sconosciuti nel frattempo.

Non eseguire `npm audit fix --force` senza prima salvare il progetto: aggiorna Vite a una versione principale più recente che potrebbe cambiare il
comportamento del plugin in `vite.config.ts` (quello che rende `dist/index.html` avviabile con doppio clic). Dopo un aggiornamento controllare:
`npm run build`, apertura di `dist/index.html` con doppio clic e `npm run verify-docs`.

---

## 8. Problemi comuni

| Problema | Soluzione |
|---|---|
| `npm` non è riconosciuto | installare Node.js e riaprire il terminale |
| Su Windows (PowerShell) `npm run ...` è bloccato da una policy degli script | usare il Prompt dei comandi (`cmd`) oppure consentire gli script firmati localmente |
| Pagina bianca aprendo `index.html` della cartella principale | aprire `dist/index.html` (dopo `npm run build`) |
| Pagina bianca e errore nella console con il doppio clic su `dist/index.html` | ricostruire con `npm run build` (la build deve essere stata creata con la configurazione del progetto) |
| Il record non si salva | il browser blocca `localStorage` per le pagine da file; il gioco funziona comunque |
| Il gioco è molto piccolo | la finestra è piccola: il canvas si ingrandisce solo di multipli interi (2×, 3×...). Usare il pieno schermo del browser (F11) |
| Il gioco è tagliato | la finestra è più piccola di 320×240 pixel fisici: ingrandirla |
| Il gioco va in pausa da solo | succede se la finestra perde il focus; si può disattivare con `pauseOnFocusLoss: false` in `gameConfig.ts` |
