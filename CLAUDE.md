# Iron & Shadow

Gioco d'azione in pixel art 16 bit: TypeScript strict, Canvas, Vite, nessuna dipendenza di esecuzione. Comandi in `package.json`, panoramica in `README.md`.

## Lavoro in corso
Il piano attivo è `documentation/PIANO_CLASSI.md` (Fasi 0-6, classi, mana, statistiche). Leggilo a inizio sessione, lavora una fase alla volta e spunta le checkbox completate.

## Gate di fase
Una fase è chiusa solo quando:
1. `npm run typecheck`, `npm test`, `npm run balance`, `npm run test:browser`, `npm run verify-docs` passano: lancia l'agent `gate-runner`;
2. GAME_MANUAL, ARCHITECTURE e CODE_MANUAL descrivono il nuovo comportamento: agent `docs-sync`;
3. la versione è salita in `package.json`, in `CHANGELOG.md` e nelle righe "Versione" dei documenti in `documentation/`.

Quando una modifica deve lasciare il gioco identico (Fase 0, refactor), lancia `balance-check`: confronta il simulatore con `tools/balance-baseline.txt`. Aggiorna il baseline solo quando la fase cambia i numeri apposta, nello stesso commit.

## Convenzioni
- Numeri e contenuti stanno in `src/config/` come dati; la logica sta fuori da `config/`. Una nuova mossa, arma o classe è prima di tutto una voce di config.
- Commenti, documentazione, messaggi di commit e testi del gioco in italiano.
- Tipi espliciti, niente `any`. Tempi in millisecondi con suffisso `Ms`, velocità in pixel al secondo.
- Colori solo dalla palette (`paletteConfig.ts`, massimo `MAX_PALETTE_COLORS`).
- Ogni comportamento nuovo ha un test in `tests/unit/`; un file si lancia da solo con `npm test -- <parte del nome>`.
- Skill di progetto: `iron-shadow-add-enemy`, `iron-shadow-add-level`, `iron-shadow-pixel-sprites`.

## Git
- Branch di base: `espansioni`. Ogni fase su `classi/fase-N`, merge su `espansioni` a gate verde.
- Messaggi di commit come la storia: `Classi Fase N: <cosa cambia>`.
