# Piano dell'equipaggiamento: rarità, armature, nuove armi, negozio fisico

Questo documento è un piano, non una specifica. Lo stato reale delle funzionalità resta in `FEATURES.md`. Continua `PIANO_ESPANSIONI.md`
(Fasi 0-8, completate le parti di contenuto).

**Stato:** non iniziato. Le fasi qui si chiamano **E1-E6** per non confondersi con le Fasi 0-8 del piano precedente.

## Decisioni prese

| Tema | Scelta |
|---|---|
| Negozio | **stanza camminabile** tra un livello e l'altro. Se si rivela troppo complesso, si fa **per ultimo** (E6) e fino ad allora resta la bottega a menu della Fase 6 |
| Armature | **3 slot**: elmo, corazza, stivali |
| Rarità | **6 livelli**: Comune, Non comune, Raro, Epico, Leggendario, **Mitico**. Il Mitico ha **sprite disegnato su misura** (vedi "Come si aggiunge un oggetto Mitico") |
| Rivendita | **no** |
| Armi nuove | per ora **solo lo Spadone a due mani**; altre in seguito |
| Audio, rimappatura tasti, controller, modalità roguelike | **esclusi** (come prima) |

## Ricerca (idee usate)

- La rarità serve soprattutto a decidere **quanti modificatori casuali (affissi)** ha un oggetto: nei giochi di ruolo di azione si va da 1-2 (magico) a 5-6 (epico). [Diablo IV](https://news.blizzard.com/en-us/article/23230076/system-design-in-diablo-iv-part-ii), [Titan Quest 2](https://game8.co/games/Titan-Quest-2/archives/543472)
- Il **Leggendario** ha effetti **fissi e disegnati a mano**: è un oggetto "d'identità", non solo più forte. L'Epico cambia lo stile di gioco. I valori hanno un **tetto**, altrimenti a fine partita esplodono. [Atherion](https://atherion.pages.dev/game-design/gameplay/items-rarity-and-affixes)
- Colori consueti: grigio, verde, blu, viola, arancione, rosso. [G2A](https://www.g2a.com/news/glossary/what-is-weapon-rarity-in-gaming/)
- Negozio tra i livelli e prezzi che salgono a ogni acquisto (Dead Cells). [Wiki](https://deadcells.wiki.gg/wiki/User:OfficialJoyFX)

## Punto di partenza (cosa c'è già)

- `WEAPON_CONFIG`: 9 armi come dati; oggi un'arma è solo un id (`WeaponId`). Borsa a 4 posti (`Inventory`), armi salvate come elenco di id.
- Bottega a menu (`Shop`, Fase 6), monete (`ScoreManager.coins`), potenziamenti permanenti con le gemme.
- Elementi ed effetti di stato (Fase 7: `HitProperties.elements`) e resistenze dei nemici: i modificatori delle armi possono riusarli.
- Personaggi con statistiche (`CharacterDefinition`), danno e difesa che passano da `Player` (`getDamageMultiplier`, `damageTakenMultiplier`).
- Sprite del cavaliere composti da dati, con colori propri per personaggio (`CHARACTER_VISUALS`): le armature si ricolorano allo stesso modo.
- Livelli come dati (`LEVEL_CONFIG`, ambientazioni): la stanza del negozio può essere un livello.

---

## E1 – Rarità e oggetti con modificatori (la base)

- `Rarity`: `common`, `uncommon`, `rare`, `epic`, `legendary`, `mythic`, con nome, **colore** (grigio, verde, blu, viola, arancione, rosso), peso nei drop, moltiplicatore di prezzo e numero di modificatori.
- **`ItemInstance`**: un oggetto di equipaggiamento = tipo di base (arma o armatura) + rarità + modificatori (affissi) estratti. Sostituisce l'id nudo.
- **Modificatori** (`AffixDefinition`, solo dati): danno %, velocità di attacco, velocità di movimento, salute, stamina, difesa, furto di vita, **elemento dato ai colpi** (usa la Fase 7), resistenza a un elemento (armature), rompe la guardia. Ognuno ha un intervallo per rarità e un **tetto**.
- Numero di modificatori: Comune 0, Non comune 1, Raro 2, Epico 3 (uno "che cambia lo stile", per esempio elemento o attacco speciale), Leggendario e Mitico **fissi, disegnati a mano**.
- Estrazione con seme casuale iniettabile (come `Shop.open`), così i test sono ripetibili.
- **Migrazione dei salvataggi**: le armi attuali diventano Comuni; un salvataggio senza oggetti resta valido.
- Test: pesi, tetti, numero di modificatori per rarità, ripetibilità, migrazione.

## E2 – Armature (3 slot)

- Slot: **elmo, corazza, stivali**. Statistiche base per materiale (stoffa, cuoio, ferro, ...) che scalano con la rarità.
- Effetti: salute, difesa (riduce il danno subito, minimo 1 come lo Scudo), stamina, velocità e **resistenze agli elementi**.
- **Set**: due o tre pezzi della stessa famiglia danno un bonus (per esempio "Set del Predone"). Solo dati.
- **Aspetto**: gli sprite del cavaliere sono composti da dati; le armature si disegnano come **ricolorazione per materiale e rarità** e, per l'elmo, con testa propria (come cappuccio e corna dei personaggi). Così i frame non si moltiplicano per ogni oggetto, ma per ogni famiglia di pezzi.
- `Player` applica i bonus in un punto solo (come `setUpgrades`).
- Test: bonus, minimo 1 danno, resistenze, set, ogni sprite registrato con le misure e l'ancora del cavaliere e solo colori della palette.

## E3 – Rarità sulle armi esistenti e Spadone a due mani

- Le 9 armi diventano oggetti con rarità e modificatori; i **Leggendari e i Mitici** sono armi fisse (uno o due per arma, disegnati a mano).
- **Spadone a due mani** (nuova arma): lento, danno alto, portata lunga, colpo pesante che **rompe la guardia**; velocità di camminata ridotta. Attacchi, combo e animazioni come per le armi della Fase 1 (`WEAPON_CONFIG`, `WEAPON_VISUALS`, pose proprie larghe come la lancia).
- Il template per aggiungere altre armi resta quello di `ARCHITECTURE.md` (sezione 10); le prossime (frusta, falce, ...) si aggiungono con lo stesso metodo.
- Test: ogni attacco con un'animazione sincronizzata, combo eseguibili (recupero più breve della finestra), frame per ogni posa.

## E4 – Equipaggiamento e inventario

- La borsa a 4 posti non basta: serve una **schermata equipaggiamento** (tasto dedicato, anche dalla pausa) con 3 slot armatura, arma in mano e uno **zaino più grande**.
- Confronto con l'oggetto equipaggiato (differenze in verde e rosso), nome colorato per rarità, elenco dei modificatori, scheda dell'oggetto.
- La borsa rapida (1-4) resta per cambiare arma e usare le pozioni durante l'azione.
- Salvataggio: gli oggetti equipaggiati e quelli nello zaino si salvano nei progressi (come le armi oggi).
- **Q** lascia a terra anche le armature; gli oggetti a terra mostrano il bagliore del colore della rarità.
- Test: equipaggiare e togliere, confronto, zaino pieno, salvataggio e migrazione, tasti.

## E5 – Fonti di oggetti ed economia

- **Forzieri, nemici d'élite e boss** danno oggetti con rarità (peso dal livello, dalla difficoltà e dal tipo di fonte: i boss più alti, le élite medi).
- I **Mitici** non escono dai forzieri normali: arrivano solo da fonti speciali (per esempio boss finale o sfida), così restano rari.
- Ritocco di prezzi e monete: oggi un livello dà 44-100 monete e una pozione costa 40 (vedi `BALANCE.md`).
- Bot di bilanciamento: usa armatura e rarità. **Il gioco è già facile per il bot**: la rarità non deve peggiorare la cosa (controllo con partite complete).
- Documentazione e test finali di questa fase.

## E6 – Il negozio fisico (stanza camminabile)

- Un **livello speciale** (`theme: "shop"`, ambientazione nuova) tra un livello e l'altro: il mercante, un banco e gli oggetti esposti su piedistalli.
- Si compra **avvicinandosi e premendo E**; si esce dalla porta in fondo (si riusa `reachExit`). Niente nemici.
- Categorie: **armi, armature, oggetti** (pozioni, munizioni, cure).
- L'offerta cambia a ogni visita e dipende dal livello raggiunto (più rarità alte avanzando).
- Prezzo secondo la rarità; **aumento a ogni acquisto** nella stessa visita (come in Dead Cells). **Niente rivendita.**
- Opzionale, se resta tempo: rinnovo dell'offerta a pagamento.
- Sostituisce il menu della Fase 6 (che resta come ripiego finché E6 non è finita).
- **Se la stanza camminabile è troppo complessa**: si completano E1-E5 con la bottega a menu, che vende anche oggetti con rarità, e E6 si fa per ultima.
- Test: stanza percorribile dal bot, acquisti, aumento dei prezzi, offerta ripetibile con il seme, uscita.

---

## Come si aggiunge un oggetto Mitico (anche tramite chat)

Il Mitico è l'unica rarità con **sprite disegnato su misura**: non è una ricolorazione. Un Mitico è anche un oggetto **fisso** (nome, effetti e aspetto decisi a mano). Va fatto con questa procedura.

### 1. Cosa dire in chat

Basta una richiesta come: *"Aggiungi un'arma Mitica: nome, tipo (spada, lancia, ...), come deve sembrare, effetto speciale"*. Serve indicare:

- **nome** e **tipo di base** (arma di quale famiglia, oppure elmo, corazza o stivali);
- **aspetto** a parole: colori, forme, dettagli (per esempio "lama di ossidiana con venature rosse, impugnatura d'oro, scia rossa");
- **effetto speciale** e statistiche (per esempio "+25% danno e le frecce infuocate");
- se esiste, un'**idea o un riferimento** (anche un'immagine o un link: lo sprite si ridisegna in pixel, non si copia).

Per un'arma o un'armatura già esistente in `WEAPON_CONFIG` basta dire quale sostituire o variare.

### 2. Cosa viene fatto (per chi modifica a mano)

1. **Dati**: una voce in `MYTHIC_ITEMS` (`src/config/...`) con id, nome, tipo di base, rarità `mythic`, modificatori fissi ed eventuale effetto speciale.
2. **Sprite**: uno sprite **disegnato a mano** come righe di testo (vedi la skill del progetto `iron-shadow-pixel-sprites` e `CODE_MANUAL.md`, sezione 3.6):
   - arma: l'icona 16x16 (`WEAPON_ICON_SIZE`) e, se vuoi un'arma diversa da quelle esistenti, la funzione di disegno in `weaponShapes.ts` o un `WeaponVisual` dedicato in `knightSprites.ts`;
   - armatura: le righe della parte superiore o dell'elmo (le 12 righe della testa, come `RANGER_HEAD_ROWS`) con la sua mappa di colori;
   - **solo colori della palette** (`paletteConfig.ts`): se serve un colore nuovo si aggiunge alla palette e a una rampa (massimo 64 colori);
   - tutte le righe della stessa lunghezza, il punto è trasparente, il contorno nero `k`.
3. **Registrazione** dello sprite nel punto in cui si registrano gli altri (`registerKnightSprites`, icone) e sua presenza nei test degli sprite (`characters.test.mjs`, `weapons-phase1.test.mjs`).
4. **Fonte**: dove si ottiene (boss, sfida, forziere speciale); i Mitici non escono dai forzieri normali.
5. **Test e documentazione**: il test di ogni oggetto Mitico (sprite registrato, solo colori della palette, effetti entro i tetti), e le tabelle in `GAME_MANUAL.md`, `FEATURES.md` e `CODE_MANUAL.md`.

### 3. Come lavoro io in chat (per te)

- Ti propongo prima lo sprite come **anteprima in testo** (come per i personaggi) o come **screenshot** dal gioco, e lo ritocchiamo insieme finché non va bene.
- Ogni Mitico è un commit a sé, con test e manuale aggiornati.
- Se preferisci disegnare tu lo sprite: scrivi le righe nel formato sopra (punto = trasparente, una lettera per colore) e mandamele; io le registro e controllo colori, misure e ancora.

---

## Ordine suggerito

E1 → E2 → E3 → E4 → E5 → E6.

Prima la base (rarità), poi i contenuti (armature, spadone), poi la schermata per usarli (E4), poi le fonti e l'economia (E5) e infine il negozio camminabile, che è la parte più rischiosa e si può rimandare senza bloccare il resto.

## Rischi e punti aperti

- **Il gioco è già facile per il bot** (vedi `BALANCE.md`): armature e rarità lo renderebbero ancora più facile. Servono tetti ai valori e un controllo con partite complete in E5.
- **Sprite**: tre slot di armatura per quattro personaggi con molte armi rischiano di moltiplicare i frame (oggi circa 600 sprite per personaggio). La scelta della ricolorazione per famiglia (E2) serve a contenerli: da verificare con una misura di tempo e memoria all'avvio.
- **Salvataggi**: il passaggio da "id dell'arma" a "oggetto" tocca `ProgressManager`, `Inventory` e il motore; la migrazione va coperta da test fin dalla E1.
- **Stanza del negozio**: richiede un'ambientazione, un mercante (sprite), e oggetti interattivi; il bot dei test deve saperla attraversare.

## Regole di aggiornamento

A ogni fase completata:
- aggiornare `FEATURES.md` e `CHANGELOG.md`;
- aggiornare `GAME_MANUAL.md` e `CODE_MANUAL.md` se cambiano regole o codice documentato;
- eseguire `npm run typecheck`, `npm test`, `npm run verify-docs`, `npm run test:browser` e `npm run balance`;
- aggiornare lo **Stato** di questo documento.
