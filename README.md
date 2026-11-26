# IRON & SHADOW
*Medieval Action Arcade* in pixel art a 16 bit – TypeScript, HTML5 Canvas, Vite. Nessun audio, nessuna dipendenza di esecuzione.

**Versione 2.6.0** – grafica a 16 bit (320×240), 7 livelli, 14 tipi di nemici, 5 boss, armi, personaggi, abilità, bottega, elementi, 3 difficoltà, selezione dei livelli.
Provato solo in Chromium (vedi `documentation/TESTING.md`).

## Giocare
Apri **`dist/index.html`** con un browser moderno (doppio clic). Non serve installare nulla.

Controlli: **A/D** o frecce per muoversi · **W**/↑ salto · **J** attacco (×3 = combo; J, K = combo mista; K in aria = picchiata) · **K** attacco pesante · **Shift sinistro** schivata · **7**, **8**, **9**, **0** mosse speciali (**L** = 7; la terza e la quarta si imparano giocando) · **S** accovacciati · **E** prendi · **Q** lascia · **1-4** borsa · **I** equipaggiamento · **Esc** pausa · **Invio** conferma.
Per ingrandire il gioco usa il pieno schermo del browser (F11).

## Sviluppare
```bash
npm install
npm run dev
```

| Comando | Funzione |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run typecheck` | controllo dei tipi (strict) |
| `npm run build` | build distribuibile in `dist/` |
| `npm run preview` | anteprima della build |
| `npm test` | 1511 test unitari (meno di 1 secondo) |
| `npm run test:browser` | 180 test nel browser (richiede Playwright, vedi `TESTING.md`) |
| `npm run balance` | simulatore di bilanciamento |
| `npm run verify-docs` | verifica gli esempi del manuale del codice |

## Documentazione (`documentation/`)

| File | Per chi | Contenuto |
|---|---|---|
| `GAME_MANUAL.md` | chi gioca | storia, regole, controlli, nemici, boss, livelli, consigli |
| `INSTALLATION.md` | chi installa | requisiti, comandi, build, distribuzione, problemi comuni |
| `CODE_MANUAL.md` | chi modifica | file, classi, configurazioni, flussi, **11 esempi verificati** |
| `ARCHITECTURE.md` | chi vuole capire il progetto | game loop, rendering, input, combattimento, livelli, estensioni future |
| `FEATURES.md` | tutti | cosa è implementato, cosa è pianificato o non provato |
| `TESTING.md` | chi verifica | cosa è stato testato, come ripetere le prove, limiti |
| `BALANCE.md` | chi regola la difficoltà | valori, misure, come ripeterle |
| `CHANGELOG.md` | tutti | storia delle versioni e problemi noti |
