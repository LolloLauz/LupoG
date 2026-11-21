---
name: "iron-shadow-pixel-sprites"
description: "Use when drawing, registering or changing pixel-art sprites, palettes, outlines, colour variants or 16-bit effects (dithering, gradients, colour cycling) in the Iron and Shadow game, which stores sprites as text rows."
---

# Sprite e palette in stile 16 bit (Iron and Shadow)

Gli sprite sono righe di testo registrate all'avvio. Nessun file immagine: così il gioco funziona con doppio clic. Vedi CODE_MANUAL.md sezione 3.6 e ARCHITECTURE.md sezioni 6 e 6.1.

## Formato di uno sprite
- Una lista di stringhe. Il carattere punto è trasparente. Ogni altra lettera è una chiave della mappa dei colori.
- Tutte le righe devono avere la stessa lunghezza. Ogni lettera deve avere un colore.
- Registrazione: spriteManager.registerSprite(id, righe, mappaColori, anchorX).
- Per i personaggi l'ancora è la colonna in cui inizia l'hitbox con lo sprite rivolto a destra. Tutti i frame di un personaggio hanno la stessa ancora. Lo sprite poggia sul fondo dell'hitbox.
- Il contorno nero k si genera con addOutline. Disegna solo l'interno.
- Le varianti di colore si ottengono con remapSpriteKeys, senza ridisegnare.
- Le sagome a tinta unita per il lampo di danno si ottengono con drawSpriteSilhouette.

## Palette
- Usa solo colori di PALETTE (src/config/paletteConfig.ts). Massimo 64 colori.
- I 16 colori della versione 1.0 non cambiano.
- Ogni colore deve stare in una rampa di PALETTE_RAMPS, ordinata dal più scuro al più chiaro. Ogni materiale usa 2 o 4 tonalità della stessa rampa, con la luce in alto a sinistra.
- Non introdurre colori fuori palette nemmeno per una sfumatura: il test controlla ogni schermata.

## Effetti 16 bit
- Sfumature: retino di Bayer 4 per 4 (fillDithered) o gradienti a fasce (fillVerticalGradient) con fasce piene e fasce a retino.
- Ombreggiatura: shadeColor(colore, passi), con passi negativi per scurire.
- Animazione di colore: cycleRampColor, per fuoco, acqua, lava e cristalli senza nuovi sprite.
- Effetto raster: applyLineWave, da chiamare dopo aver disegnato ciò che deve ondulare.

## Regole di disegno
- Coordinate e rettangoli a pixel interi: fillRect arrotonda già i quattro bordi.
- Niente fillText e niente trasparenze (globalAlpha, rgba). Il testo si disegna con BitmapFont.
- Risoluzione interna 320 per 240. Il canvas si scala con un intero di pixel fisici.
- Le hitbox non cambiano quando cambi lo sprite: lo sprite può sporgere, l'hitbox resta quella.

## Verifica
- npm test -- config (sprite registrati, colori della palette, ancore che contengono l'hitbox, frame delle animazioni).
- npm test -- graphics (retino, gradienti, font, sprite specchiati).
- npm run test:browser per controllare che ogni schermata usi solo colori della palette.
- Per vedere lo sprite serve il browser: npm run dev.

## Errori comuni
- Sprite xyz: righe di lunghezza diversa: una riga è più corta o più lunga.
- Sprite xyz: colore non definito: una lettera non è nella mappa dei colori.
- Colori fuori palette in gioco: quasi sempre una sfumatura del browser o una coordinata frazionaria.
- Lo sprite sta sopra o sotto l'hitbox: controlla l'ancora e la y di appoggio.

## Quando usare altre skill
- Per l'HUD, i menu e le schermate in CSS o HTML, la skill frontend-design è utile per la composizione. Mantieni però i colori della palette.
- Per le tabelle di bilanciamento usa la skill xlsx e per i grafici dataviz.