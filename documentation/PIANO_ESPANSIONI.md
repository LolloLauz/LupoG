# Piano delle espansioni (dopo la 2.0.0)

Questo documento è un piano, non una specifica. Lo stato reale delle funzionalità resta in `FEATURES.md`.

**Stato:** Fasi 0-7 completate, più la **borsa** (aggiunta dopo la Fase 1, vedi sotto). Fase 8: completati i contenuti; modalità e controlli
rimandati su richiesta.

## Punto di partenza

Il progetto ha già diversi punti d'aggancio (vedi `ARCHITECTURE.md`, sezione 10):

- **Combo**: `COMBO_DEFINITIONS` (solo dati).
- **Attacchi**: `ATTACK_DEFINITIONS`, un unico set globale. Per avere più armi serve prima una struttura per arma.
- **Proiettili**: `ProjectileSystem` gestisce già frecce, dardi e palle di fuoco, ma oggi sono usati dai nemici. Il giocatore dovrà poterli sparare.
- **Power-up**: `PlayerModifiers` permette bonus temporanei senza toccare i valori base.
- **Configurazione**: nemici, boss, livelli e oggetti sono dati, quindi aggiungerne di nuovi costa poco.

Vincolo: l'audio è escluso dal progetto per scelta. Il piano non lo include.

---

## Fase 0 – Fondamenta (prerequisito di tutto) – completata

Fatto: `WeaponDefinition` (attacchi, combo, attacco predefinito per input, velocità di camminata) in `EntityTypes.ts`, `WEAPON_CONFIG` in `weaponConfig.ts` con la spada come prima arma (riusa i valori della 2.0), `Player.equipWeapon`, arma salvata in `ProgressManager` e data dal motore a ogni partita, 27 test in `weapons.test.mjs`. Lo sprite di un'arma viene dalle animazioni dei suoi attacchi. Lo scambio d'arma in gioco (forzieri, nemici d'élite) arriva con la Fase 1.

Piano originale:

- **`WeaponDefinition`**: un'arma ha i propri attacchi, le proprie combo, la velocità e lo sprite. La spada attuale diventa la prima arma.
- **Equipaggiamento**: uno slot arma attivo, cambiabile e salvato nei progressi.
- **Test**: i test esistenti devono restare verdi; ogni fase aggiunge test per le proprie regole.

## Fase 1 – Armi corpo a corpo – completata

Fatto: pugnale, lancia, ascia e mazza in `WEAPON_CONFIG`, con attacchi, combo, velocità e sprite propri (il cavaliere ha una serie di frame per ogni arma, la lancia ha pose proprie). "Rompe la guardia" (ascia) = interrompe anche un nemico che ha già avviato l'attacco; "stordisce i corazzati" (mazza) = danno pieno e 0,6 s di stordimento contro la corazza. I boss non vengono storditi. Fonti: forzieri (livelli 1, 3, 5), nemici d'élite con alone dorato (livelli 2, 4, 6), trofei di tre boss (all'inizio del livello successivo). Le armi si raccolgono con E nella borsa (vedi sotto). 44 test in `weapons-phase1.test.mjs`. Da fare con persone: provare il bilanciamento delle armi.

Piano originale:

- **Pugnale**: veloce, danno basso, combo rapide.
- **Lancia**: portata lunga, stile Draco Knight.
- **Ascia**: lenta, danno alto, rompe la guardia.
- **Mazza**: stordisce i nemici corazzati (esiste già il campo `armor`).

Fonte: le armi si ottengono da forzieri, nemici d'élite e boss. Il giocatore ne tiene una alla volta.

## Borsa (aggiunta tra la Fase 1 e la Fase 3) – completata

Su richiesta: una borsa di 4 posti con armi e pozioni. Si raccoglie con **E**, si sceglie con **1-4** (arma = la si impugna, pozione = la si beve). I power-up restano automatici. Le pozioni non curano più al tocco; al massimo 2, perché conservarle rende il gioco molto più facile (vedi `BALANCE.md`). La borsa è il punto d'aggancio naturale per munizioni e oggetti da lancio (Fase 2) e per gli acquisti del negozio (Fase 6).

## Fase 2 – Armi a distanza – completata

Fatto: arco (Spazio tiro rapido, J tenuto premuto = tiro caricato: danno 10-34 e velocità ×1-1,6), balestra (dardo da 40, ricarica di 0,9 s), coltelli da lancio (6, cadono a terra e si recuperano passandoci sopra), giavellotto (3, 50 danni, trafigge, ogni lancio si perde; finiti, l'arma esce dalla borsa). I proiettili hanno un proprietario (`ProjectileLaunch.owner`): quelli del giocatore colpiscono nemici, boss e forzieri. Le munizioni stanno nella borsa (`BagSlot.ammo`), si vedono nell'HUD e si ricaricano riprendendo la stessa arma. Fonti: forzieri (livelli 2, 4, 6) e nemici d'élite (livelli 3, 5). 44 test in `weapons-phase2.test.mjs`.

Piano originale:

- **Arco**: frecce con carica (tenere premuto J) e danno che dipende dalla carica.
- **Balestra**: lenta, colpo pesante, ricarica.
- **Coltelli da lancio**: quantità limitata, si recuperano.
- **Giavellotto**: un colpo potente, si perde.

Lavoro necessario: un campo `owner` nei proiettili (nemico o giocatore), munizioni in `PlayerModifiers` o in uno stato dedicato, e il collegamento con `ProjectileSystem` e `CollisionSystem`. Da verificare nel codice prima di stimarla con precisione.

## Fase 3 – Combo – completata

Fatto: `ComboManager` gestisce sequenze miste (leggero e pesante) e ramificate, e continua anche quando una combo è l'inizio di un'altra; ogni combo ha un nome mostrato quando la si completa. Ogni arma ha una combo mista nuova (Fendente montante, Morso del serpente, Carica del drago, Spaccaossa, Terremoto). Gli attacchi in aria sono una categoria separata (`WeaponDefinition.air`): combo in volo di due colpi e **colpo in picchiata** (J in aria) che rimbalza sui bersagli. I test controllano anche che ogni combo si possa davvero eseguire (il recupero di un colpo più breve della finestra): così è emerso che lo Spaccaossa era irraggiungibile (recupero dell'ascia ridotto da 450 a 250 ms). 31 test in `combos-phase3.test.mjs`.

Piano originale:

- Generalizzare le combo a **sequenze di input** (es. leggero-leggero-pesante), con finestra temporale.
- Ogni arma ha le proprie combo.
- Combo di **salto** e **aereo** (attacco in discesa) come categoria separata.
- Il buffer di 200 ms già presente aiuta a rendere le sequenze leggibili.

## Fase 4 – Personaggi con classi – completata

Fatto: `CharacterDefinition` e `CHARACTER_CONFIG` (`characterConfig.ts`) con salute, velocità, danno inflitto e subito, schivata, cura lenta,
arma iniziale e suffisso degli sprite; `PLAYER_CONFIG` resta per ciò che è comune (salto, hitbox, tempi) e per i valori del cavaliere.
Voce *Personaggio* nel menu del titolo e schermata di scelta (statistiche in tacche, arma iniziale, tratto), personaggio salvato nei progressi.
Valori: Ranger 75 HP, 96 px/s, arco, schivata ogni 0,45 s; Berserker 130 HP, danno ×1,3, ascia, schivata corta ogni 1,6 s; Paladino
110 HP, 72 px/s, danno subito ×0,75, mazza, 1 HP/s dopo 4 s senza colpi (con ×0,85 moriva spesso contro il boss finale, vedi
`BALANCE.md`). Grafica: un personaggio non si ridisegna da zero, ma ricolora il cavaliere e cambia la testa (cappuccio del Ranger, elmo con
le corna e barba del Berserker, armatura d'oro e pennacchio bianco del Paladino). 58 test in `characters.test.mjs`. La parata dello scudo
e le abilità speciali restano per la Fase 5. Da fare con persone: provare i personaggi (il bot di bilanciamento usa solo la spada).

Piano originale:

Un `CharacterDefinition` sostituisce `PLAYER_CONFIG` e gli sprite del giocatore. Il menu del titolo permette di scegliere.

- **Cavaliere** (attuale): equilibrato.
- **Ranger**: più veloce, arco come arma base, meno salute.
- **Berserker**: più danno, più salute, nessuna schivata economica.
- **Paladino**: scudo che para, guarigione leggera.

Il punto critico è la grafica: ogni personaggio richiede sprite a 16 bit. Conviene farne uno alla volta.

## Segnalazioni dopo la Fase 4 – completate

- **Boss chiuso fuori dall'arena**: il boss si svegliava con il giocatore ancora fuori e poteva inseguirlo oltre il cancello. Ora non esce mai dall'arena.
- **Munizioni anche per arco (12) e balestra (6)**: con frecce e dardi infiniti il gioco era troppo facile. Si ricaricano con la **faretra**
  (una per livello) o riprendendo la stessa arma.
- **Tasto Q**: lascia a terra l'arma in mano; Q + 1-4 lascia un posto della borsa (anche una pozione).
- **Cancella dati** nel menu del titolo, con conferma.

## Fase 5 – Risorsa e abilità speciali – completata

Fatto: **stamina** per personaggio (massimo, recupero al secondo dopo 0,6 s dall'ultimo consumo, barra nell'HUD) consumata da schivata
(20-40), attacchi pesanti (15, `PLAYER_CONFIG.heavyAttackStaminaCost`) e abilità; senza stamina l'azione non parte ("STANCO"). Il Berserker
ora ha la schivata "non economica" con la stamina (40, la più cara) e un'attesa di 1 s invece di 1,6. **Abilità** sul tasto L
(`ABILITY_CONFIG`, `AbilityDefinition`): onda d'urto (Cavaliere), tiro in ritirata (Ranger), carica furiosa (Berserker), scudo (Paladino),
con costo, ricarica e riquadro nell'HUD. Le abilità d'attacco sono attacchi come quelli delle armi, con due campi nuovi (`dash`,
`projectile.usesAmmo`); le pose sono comuni a tutte le armi. **Parata con lo scudo**: para da davanti (anche le frecce), costa stamina in
proporzione al danno; la parata perfetta (scudo alzato da meno di 0,25 s) è gratuita e stordisce il nemico per 1 s (`Enemy.stun`).
Gli scatti si fermano sul bordo degli abissi (il bot di bilanciamento cadeva di continuo con il balzo del Ranger). 40 test in
`stamina-abilities.test.mjs`. Da fare con persone: provare costi e ricariche.

Piano originale:

- Introdurre una **stamina** che regola schivata, attacchi pesanti e abilità. Oggi non esiste: è una scelta di design da decidere prima di questa fase.
- Abilità speciali per classe, con cooldown o costo in stamina. Esempi: onda d'urto, colpo di carica, scatto indietro con colpo di ritorno.
- **Parata con lo scudo**: parare nel momento giusto dà un vantaggio; tenere lo scudo costa stamina.

## Fase 6 – Progressione e meta-progressione – completata

Fatto: **monete** della partita (moneta raccolta 10, nemico 2, élite 6, boss 50; `ECONOMY_CONFIG`) mostrate nell'HUD; **bottega** tra
un livello e l'altro (`Shop`, `SHOP_OFFERS`, stato `shop`): pozione 40, cura +40 HP 25, faretra 20, un'arma già trovata 60; si esce solo
con PROSEGUI. **Gemme** messe da parte a fine livello (`ProgressManager.gems`) e **potenziamenti permanenti** dal titolo (`UPGRADE_CONFIG`,
stato `upgrades`): Vitalità, Resistenza, Forza, Scorta. **Sblocchi**: Ranger, Berserker e Paladino raggiungendo i livelli 3, 4 e 6
(`CharacterDefinition.unlockLevel`); armi trovate salvate (`discoveredWeaponIds`) e in vendita nella bottega. 50 test in
`progression.test.mjs`. Da fare con persone: prezzi e costi (il bot di bilanciamento non usa la bottega né i potenziamenti).

Scelte: i potenziamenti non usano `PowerUpDefinition.type = "permanent"` ma vanno direttamente al giocatore (`Player.setUpgrades`),
perché devono cambiare anche salute e stamina massime. Le gemme si possono raccogliere di nuovo rigiocando un livello: è un modo
(lento) di accumularle, come in Dead Cells.

Piano originale:

Ispirata a Dead Cells: alcuni progressi restano tra una partita e l'altra. Il progetto ha già il punto d'aggancio "potenziamenti permanenti" (`PowerUpDefinition.type = "permanent"`).

- **Monete e negozio** tra un livello e l'altro (le monete esistono già).
- **Potenziamenti permanenti** acquistati con le gemme.
- **Sblocchi**: armi e classi si sbloccano completando obiettivi.

## Fase 7 – Effetti di stato ed elementi – completata

Fatto: quattro elementi (`ELEMENT_CONFIG`): **bruciatura** (Fuoco, 2 danni ogni 0,5 s per 2 s), **veleno** (3 al secondo per 4 s), **gelo**
(metà velocità per 3 s), **shock** (stordisce 0,5 s, poi 2 s senza stordimento; ai boss, che non si stordiscono, 6 danni subito). Logica
in `StatusEffects`, usata da `Enemy` e `Boss`; il danno nel tempo non uccide mai. Nuovi power-up Veleno, Gelo e Fulmine (`PowerUpDefinition.element`;
il Fuoco aggiunge la bruciatura al danno in più) nei livelli 2-6. Gli elementi passano con il colpo (`HitProperties.elements`): spada e
armi, proiettili, abilità. **Resistenze e debolezze** in `ENEMY_CONFIG` e nei boss (`elementModifiers`). Aloni e quadratini colorati sui nemici,
numeri del danno nel tempo. 33 test in `elements.test.mjs`.

Scelte: le resistenze valgono per gli effetti di stato, non per il danno in più del Fuoco (che è parte del colpo); il danno nel tempo lascia
almeno 1 HP, così l'ultimo colpo (con punti, monete e oggetti lasciati) resta del giocatore.

Piano originale:

Il danno elementale è già "in sviluppo" (il Fuoco). Si può completare con:

- Stati sui nemici: **veleno**, **gelo** (rallenta), **shock** (blocca i movimenti brevemente).
- Resistenze e debolezze per nemico, leggibili da `ENEMY_CONFIG`.

## Fase 8 – Contenuti e modalità – contenuti completati

Fatto (scelta: 2-3 nemici e un livello "bosco o lande desolate" con il suo boss; modalità e controlli per ora no):
- **Livello 6 "Lande Desolate"** (ambientazione nuova `wasteland`: tramonto, sole basso, altopiani, alberi secchi, ossa, polvere al vento; terreno di
  terra secca), messo prima della Torre, che diventa il livello 7: il Signore dell'Ombra resta il boss finale.
- **Signore delle Lande** (`LANDS_LORD_CONFIG`, forma "knight" ricolorata): accette a ventaglio, carica, chiama i predoni, fendente; trofeo la balestra.
- **Tre nemici**: Predone (a distanza, accette che la spada respinge, proiettile `hatchet`), Scorpione Gigante (corazzato, scatto; forma
  procedurale `composeScorpion`), Avvoltoio (volante, picchiata più veloce).
- Bilanciamento con il bot: il livello costava molta più salute degli altri; sono stati ammorbiditi predone, scorpione e avvoltoio e tolti un predone e un
  avvoltoio (vedi `BALANCE.md`).
- Emersi e corretti: due oggetti nascosti dentro blocchi di pietra (livelli 2 e 3, nuovo test) e il balzo del Ranger che finiva sugli spuntoni.

Non fatto (rimandato): modalità roguelike, sfide con modificatori, rimappatura dei tasti e controller.

Piano originale:

- Nuovi nemici, boss e livelli (sono già dati: si fanno con le skill del progetto).
- **Modalità roguelike**: stanze generate in sequenza, con ricompense scelte a caso.
- **Sfide giornaliere** o con modificatori (es. nessuna cura, nemici più veloci).
- **Rimappatura dei tasti** e **controller**: oggi sono "non previste", quindi andrebbe cambiata la scelta in `FEATURES.md`.

---

## Idee dalla ricerca

La ricerca è stata generica (per lo più liste e recensioni). Spunti utili:

- **Meta-progressione con morte permanente** (Dead Cells): https://gamerjournalist.com/games-similar-to-hollow-knight/
- **Salute scarsa e combattimento basato sulla distanza** (Hyper Light Drifter): https://medium.com/vicas-likes-games/hyper-light-drifter-12ace54421e5
- **Lancia e scudo** (Draco Knight): https://store.steampowered.com/app/1591740/Draco%20Knight%20Demo
- **Oggetti magici che potenziano il personaggio** (Medieval Souls): https://thedhamibro.itch.io/medieval-souls
- **Checkpoint generosi e combattimento a puzzle** (Horned Knight): https://news.xbox.com/en-us/2021/02/23/horned-knight-reintroducing-the-golden-age-of-arcade-gaming/

Due idee a basso costo e alto effetto:

1. **Parata con tempismo**: una tecnica che richiede abilità, senza nuovi sprite complessi.
2. **Modificatori di sfida**: cambiano le regole di un livello con dati, quindi costano poco e aumentano la rigiocabilità.

---

## Ordine suggerito

Fase 0 → 1 → 3 → 2 → 4 → 5 → 6 → 7 → 8.

Le armi e le combo danno il maggior salto di varietà con meno lavoro grafico. Le classi richiedono più sprite, quindi vanno dopo.

## Decisioni aperte

- **Stamina** (Fase 5): **decisa: sì**.
- **Primo passo**: deciso (Fase 0, poi 1, 3, 2).
- **Controlli**: rimappatura e controller per ora no (decisione della Fase 8).

## Regole di aggiornamento

A ogni fase completata:
- aggiornare `FEATURES.md` (stato delle funzionalità) e `CHANGELOG.md`;
- aggiornare `GAME_MANUAL.md` e `CODE_MANUAL.md` se cambiano regole o codice documentato;
- eseguire `npm run typecheck`, `npm test`, `npm run verify-docs`.
