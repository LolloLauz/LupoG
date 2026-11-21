---
name: "iron-shadow-add-enemy"
description: "Use when adding or changing an enemy type in the Iron and Shadow pixel-art game project: enemy config, animations, sprite specs, level placement, and the tests and manuals that must follow."
---

# Aggiungere o modificare un nemico (Iron and Shadow)

Questa skill segue la procedura di CODE_MANUAL.md, esempi 6 e 7, e le regole di GAME_MANUAL.md sezione 7. Prima di toccare il codice leggi questi due manuali nella cartella documentation/ del progetto.

## Regole fisse
- Tutti i numeri stanno in src/config/. La logica non va mai in config/.
- Commenti e documentazione in italiano. Niente tipo any. Tipi di ritorno espliciti.
- Il tempo nelle configurazioni è in millisecondi con suffisso Ms. Le velocità sono in pixel al secondo.
- positionY e la y di partenza valgono superficie meno altezza dell'hitbox. Il suolo dei livelli è a y uguale 200.

## Procedura
1. Aggiungi il nuovo id a EnemyTypeId in src/types/EntityTypes.ts.
2. Aggiungi la voce in ENEMY_CONFIG (src/config/enemyConfig.ts) con: id, name, maxHealth, attackDamage, movementSpeed, detectionRange, attackRange, attackCooldownMs, attackWindupMs, attackActiveMs, attackRecoveryMs, hurtDurationMs, knockbackSpeed, attackInterruptWindowMs, patrolDistance, behavior, scoreReward, hitbox.
3. Aggiungi la voce in ENEMY_ANIMATIONS (src/config/animationConfig.ts) con createEnemyAnimations(id).
4. Aggiungi la voce in SPECS (src/rendering/sprites/enemySprites.ts) con idPrefix, bodyRows, colors, bladeKeys, handX, handY. Il nemico umanoide riusa registerHumanoid, quindi basta fornire corpo e colori. Usa solo colori della palette.
5. Scegli il comportamento: patrol (pattuglia nella zona patrolDistance), chase (insegue entro detectionRange e smette oltre 1,5 volte quella distanza), guard (fermo, attacca solo a portata).
6. Per un nemico corazzato che non si interrompe, imposta attackInterruptWindowMs a 0.
7. Aggiungi la posizione in src/config/levelConfig.ts nel livello scelto, con y uguale a 200 meno l'altezza dell'hitbox.

## Verifica
- npm run typecheck. Se compaiono errori su Record con EnemyTypeId, manca una voce in ENEMY_CONFIG o ENEMY_ANIMATIONS.
- npm test -- enemy e npm test -- config per controllare sprite, animazioni e posizioni.
- npm run balance per vedere l'effetto sul bilanciamento.
- Se hai cambiato il comportamento, npm run test:browser se Playwright è installato.

## Documentazione da aggiornare
- GAME_MANUAL.md, tabella dei nemici della sezione 7 e tabella dei livelli della sezione 9.
- CODE_MANUAL.md solo se hai aggiunto un comportamento o un campo nuovo a EnemyDefinition.
- Se il nuovo nemico è un esempio, verifica con npm run verify-docs.

## Errori comuni
- Sprite non registrato: l'id in un'animazione non corrisponde a uno sprite.
- Righe di lunghezza diversa in uno sprite: controlla le righe delle parti del corpo.
- Colore non definito: una lettera dello sprite non è nella mappa dei colori.
- Nemico a mezz'aria o sotto terra: la y non è superficie meno altezza dell'hitbox.