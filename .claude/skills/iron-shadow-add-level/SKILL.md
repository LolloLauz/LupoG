---
name: "iron-shadow-add-level"
description: "Use when creating, editing or validating a level of the Iron and Shadow game: platforms, abysses, enemies, items, exit, theme, boss, and the geometry rules that the tests enforce."
---

# Creare o modificare un livello (Iron and Shadow)

Un livello è un oggetto dati in LEVEL_CONFIG (src/config/levelConfig.ts). Nessun livello è codice, quindi di norma non si tocca il motore. Vedi CODE_MANUAL.md esempio 9 e ARCHITECTURE.md sezione 9.

## Struttura di un livello
- id: consecutivi a partire da 1. Il motore passa a id più 1 e dopo l'ultimo mostra la vittoria.
- name, theme (forest, castle o dungeon), width, height (di solito 240), playerStart.
- platforms: terreno con x, y, width, height; piattaforme sospese con oneWay: true; blocchi di pietra.
- enemies: type e position. Il tipo deve esistere in EnemyTypeId.
- items: type e position. Il tipo deve esistere in ItemTypeId.
- completion: reachExit con exitX, oppure defeatBoss.
- hasBoss, bossId e bossSpawn se c'è un boss; bossArenaStartX se c'è un'arena.

## Regole geometriche (verificate dai test)
- Abissi: non più larghi di circa 36 px.
- Salita tra piattaforme: non più di circa 44 px rispetto a una superficie da cui salire.
- Nemici: y uguale a superficie meno altezza hitbox (per l'umanoide base, 200 meno 24 è 176).
- Oggetti: y uguale a superficie meno 8.
- Uscita (exitX): deve stare su un tratto di terreno.
- Il giocatore deve poter arrivare alla fine: il bot di percorribilità lo verifica.

## Procedura
1. Disegna il terreno come segmenti orizzontali a y uguale 200 con altezza 40, lasciando gli spazi degli abissi.
2. Aggiungi le piattaforme sospese e controlla le salite con la regola dei 44 px.
3. Posiziona nemici e oggetti sulle superfici, usando le formule di sopra.
4. Imposta completion e, se serve, il boss.
5. Verifica con i comandi qui sotto.
6. Aggiorna la tabella dei livelli in GAME_MANUAL.md sezione 9.

## Verifica
- npm run typecheck.
- npm test -- config (tutti i livelli: geometria e percorribilità), npm test -- levels.
- npm run verify-docs se hai modificato un esempio del manuale del codice.
- npm run test:browser per il rendering e per il bot che gioca tutto il gioco.

## Errori comuni
- Livello non trovato o gioco che finisce troppo presto: gli id non sono consecutivi da 1.
- Nemico o oggetto che cade nel vuoto: controlla la y.
- Il giocatore non arriva all'uscita: abisso troppo largo o salita troppo alta.
- Cambiare il salto (jumpForce) rende irraggiungibili zone pensate per un salto di circa 53 px: rivedi il livello.