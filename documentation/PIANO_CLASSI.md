# Iron & Shadow – Piano di implementazione a fasi

25 nov 2026 · @Lauz

## Panoramica

Il lavoro si divide in sette fasi, da una fondazione senza cambiamenti visibili fino al bilanciamento finale. Ogni fase si chiude con un gioco giocabile, i test verdi e la documentazione aggiornata, prima di passare alla successiva.

1. **Fase 0, fondazione**: risorse, tag delle armi, statistiche e abilità come dati, tutto neutro. Nessun cambiamento per chi gioca.
2. **Fase 1, partite scollegate (v2.1)**: salvataggio ridotto, gemme in monete, Shift per la schivata, tasti 7-0 per le mosse.
3. **Fase 2, il Mago (v2.2)**: mana, bastone, incantesimi, pozione di mana.
4. **Fase 3, compatibilità armi e classi (v2.3)**: tabella applicata a tutte e cinque le classi, filtro del loot.
5. **Fase 4, statistiche (v2.4)**: cinque attributi, pentagono, punti spesi in bottega.
6. **Fase 5, contenuto per classe (v2.5)**: mosse extra, passivi, sinergie elementali, tutto come dati.
7. **Fase 6, grafica e bilanciamento (v2.6)**: animazioni dedicate, poi una sessione di bilanciamento con il simulatore.

### Gate comune a ogni fase

- `npm run typecheck`, `npm test`, `npm run balance`, `npm run test:browser` e `npm run verify-docs` passano;
- GAME_MANUAL, ARCHITECTURE e CODE_MANUAL sono aggiornati;
- il numero di versione sale.

---

## Fase 0 – Fondazione senza cambiamenti visibili

**Obiettivo:** preparare i punti d'innesto per mana, affinità e statistiche con valori neutri, così il gioco si comporta esattamente come prima. È il lavoro che evita di rifare tutto dopo.

- [x] **Risorse:** aggiungere un `ResourcePool` (stamina e mana) a `Player`; il costo delle abilità in `AbilityDefinition` diventa `{ mana?, stamina?, salute? }`, con i costi attuali tradotti.
- [x] **Abilità come lista:** `CharacterDefinition.abilityId` diventa un elenco di abilità (oggi 1 elemento) e `Player` ne gestisce uno slot attivo.
- [x] **Tag delle armi:** in `WeaponDefinition` aggiungere categoria, peso e statistica di scaling, per tutte le armi esistenti.
- [x] **Compatibilità come dati:** nuova tabella classe × categoria di arma (file di configurazione nuovo) con tutti i valori a ×1 e nessun divieto.
- [x] **Statistiche nella pipeline:** attributi di base a zero come nuova fonte di `PlayerModifiers`, accanto ad `EquipmentStats`.
- [x] Campo `modifiers` vuoto nella definizione degli incantesimi, per i modificatori futuri.
- [x] **Test di parità:** il simulatore di bilanciamento deve dare le stesse percentuali di prima (come per il Cavaliere Nero); i test esistenti passano senza modifiche. *Fatto: simulatore identico al baseline; in `stamina-abilities.test.mjs` adattate solo tre asserzioni sulla forma dei dati (`abilityIds`, `cost.stamina`) e due scritture del campo privato della stamina, nessun controllo di comportamento.*

**Criterio di chiusura:** nessuna differenza osservabile, `npm run balance` identico, tutti i controlli verdi.

---

## Fase 1 – Partite scollegate e nuovi comandi (v2.1)

**Obiettivo:** ogni nuova partita parte da zero, con le sole eccezioni decise, e i comandi sono quelli nuovi. Cambia il comportamento, quindi è una versione a sé.

- [x] **Salvataggio:** `ProgressManager` conserva solo livelli già giocati, classi sbloccate, record e difficoltà; aggiungere un campo di versione con migrazione dal formato 2.0, che scarta il resto. *Fatto: resta salvato anche il personaggio scelto nel menu (una preferenza, come la difficoltà); le classi sbloccate si ricavano dal livello raggiunto.*
- [x] **Azzeramento a nuova partita:** borsa, zaino, armature, monete e gemme ripartono da zero; nessun cambio di classe durante la partita. *Fatto: anche le armi trovate (vendute in bottega) valgono solo per la partita; il Mitico del boss finale è ora solo un trofeo mostrato.*
- [x] **Gemme in monete:** raccogliere una gemma dà 30 monete (valore da bilanciare) oltre ai 200 punti; togliere il contatore gemme dall'HUD.
- [x] **Potenziamenti permanenti:** rimuovere i potenziamenti a gemme e la voce Potenziamenti dal titolo; sistemare Cancella dati e la scheda del personaggio.
- [x] **Comandi:**
  - schivata su Shift sinistro; K liberato;
  - mosse speciali sui tasti 7, 8, 9 e 0, con L come alias dello slot 1 (lo scudo del Paladino resta a tasto premuto);
  - l'attacco eseguito con Spazio passa al tasto J; l'attacco pesante eseguito con J passa a K;
  - modificare `controlsConfig.ts` e la schermata Controlli.
- [x] **Test:** aggiornare i test su salvataggio, comandi e punteggio; il bot dei test del browser usa i nuovi tasti.
- [x] **Documentazione:** sezioni 4, 5, 11b del GAME_MANUAL (controlli, schermate, gemme, sblocchi) e la sezione sull'input di ARCHITECTURE.
- [x] **Ritocchi dopo la fase (2.1.1):** mosse spostate dai tasti 5-8 ai tasti 7-0; passiva del Ranger, le frecce dell'arco si ricaricano (una ogni 3 s, valore da bilanciare nella Fase 6).

**Criterio di chiusura:** due partite di seguito non condividono nulla tranne livelli raggiunti, classi, record e difficoltà.

---

## Fase 2 – Il Mago (v2.2)

**Obiettivo:** una classe giocabile dall'inizio alla fine, con mana, bastone e 3-4 incantesimi, usando animazioni ed effetti esistenti dove possibile.

- [x] **Personaggio:** voce nuova in `CHARACTER_CONFIG` e `CHARACTER_ORDER` (salute bassa, mana alto, velocità media), tipo in `CharacterId`, scheda nella schermata Personaggio, condizione di sblocco dopo la strega. *Fatto: 70 HP, 100 mana, velocità 84, si sblocca al livello 5; nella scelta sta tra il Berserker e il Paladino (ordine di sblocco).*
- [x] **Mana:** barra nell'HUD sotto la stamina, rigenerazione lenta, un po' di mana recuperato quando il bastone colpisce. *Fatto: 6 al secondo dopo 0,6 s dall'ultimo consumo, +5 per ogni bersaglio colpito con il bastone (non con gli incantesimi).*
- [x] **Bastone:** arma nuova in `WEAPON_CONFIG`, solo per il Mago; attacchi leggeri deboli; bonus a potenza degli incantesimi e riduzione del costo, validi solo se in mano al Mago. *Fatto: `WeaponDefinition.spellFocus` (×1,2 danno, ×0,85 mana), letto solo dalle classi con `usesSpellFocus`; categoria `staff` nella tabella di compatibilità; Leggendario "Bastone delle Stelle".*
- [x] **Incantesimi** (dati in `ABILITY_CONFIG`): quattro mosse che riusano i tipi esistenti (*fatto: dardo di fuoco, nova di gelo, balzo arcano, barriera; elementi degli attacchi con `AttackDefinition.elements`, guardia a mana con `resource`*):
  - proiettile elementale (`ProjectileSystem`, con gli elementi di `ELEMENT_CONFIG`);
  - colpo ad area come l'onda d'urto;
  - balzo/teletrasporto come il tiro in ritirata;
  - barriera come lo scudo del Paladino.
- [x] **Loadout:** slot attivi sui tasti 7-0, indicatori nell'HUD con ricarica e mana sufficiente. *Fatto: un riquadro per slot (`Player.abilitySlots`), numero rosso se la risorsa non basta, bordo dorato sullo slot attivo.*
- [x] **Pozione di mana:** secondo tipo di pozione nella borsa, un posto proprio, massimo 2; aggiunta a bottega e loot (`Inventory`, `Shop`, `LootSystem`, HUD). *Fatto: +40 mana; in bottega al posto della faretra per chi ha mana; dal bottino di forzieri, élite e boss solo per chi ha mana.*
- [x] **Loot del Mago:** a terra compaiono solo bastoni con affissi; per le altre armi il filtro della Fase 3 viene qui anticipato per il solo Mago. *Fatto: `resolveLootWeaponId` su forzieri, élite, trofei dei boss e bottega; il divieto in `equipWeapon` resta alla Fase 3.*
- [x] **Sprite:** testa, veste e bastone provvisori con le routine esistenti (`CHARACTER_VISUALS`, `WEAPON_VISUALS`); l'arte rifinita è nella Fase 6.
- [x] **Test e bot:** unit test su costi, rigenerazione e sblocco; bot di bilanciamento per il Mago nel simulatore. *Fatto: `mage-phase2.test.mjs`, giro del Mago nei test del browser, sezione MAGO in `npm run balance` (anche `--mage`).*
- [x] **Documentazione:** nuova voce nelle tabelle dei personaggi, abilità, armi, oggetti e punteggi del manuale. *Fatto (2.2.0): anche ARCHITECTURE, CODE_MANUAL, TESTING, FEATURES, BALANCE (sezione del Mago) e CHANGELOG.*

**Criterio di chiusura:** il Mago completa i 7 livelli con il bot del simulatore e non può restare senza modo di attaccare.

---

## Fase 3 – Compatibilità armi e classi (v2.3)

**Obiettivo:** ogni classe ha armi preferite, armi con malus e armi vietate, con la tabella come unica fonte di verità.

**Decisioni (grilling del 25 nov 2026):**

- La tabella è indicizzata **per arma** (11 armi × 5 classi), non per categoria: la categoria resta nei tag dell'arma per lo scaling della Fase 4.
- Ogni cella: `isAllowed`, `damageMultiplier`, `recoveryMultiplier`, `ammoMultiplier` e, se vietata, `lootSubstituteId`.
- Valori uguali per simbolo (la messa a punto per cella è della Fase 6B): ★ = danno ×1,15 e munizioni ×1,5 (per difetto); ▼ = danno ×0,85 e recupero ×1,15; ✓ = ×1. La ★ sull'arma iniziale vale ×1 (la classe è già bilanciata su quella).
- Celle: la ★ sta su spada (Cavaliere), arco (Ranger), ascia (Berserker), mazza (Paladino), bastone (Mago), tutte armi iniziali a ×1; ★ con bonus su lancia e spadone (Cavaliere), balestra, coltelli e giavellotto (Ranger), spadone (Berserker), spada e ascia (Paladino). I ▼ sono quelli della bozza. Divieti: spadone per il Ranger; per il Mago tutto tranne spada, pugnale e bastone (il catalizzatore resta solo del bastone); bastone per le altre classi.
- Sostituti nel bottino: spadone del Ranger → balestra; Mago: spadone → spada, le altre armi vietate → bastone; bastone delle altre classi → arma iniziale.
- Le armi vietate non compaiono mai a terra; il divieto in `equipWeapon` è una rete di sicurezza.
- Peso delle armature solo come dato (stoffa 1, cuoio 2, ferro 3, acciaio 4, la corazza vale il doppio), mostrato come `PESO n`; nessun effetto sul gioco fino alla Fase 4.
- Nessun bot nuovo nel simulatore (restano alla 6B): il criterio di chiusura diventa "nessun drop inutilizzabile", provato dai test sui dati e dal bot del browser.

- [x] **Valori reali:** riempire la tabella di compatibilità (bozza nel documento di progetto): bonus di danno, munizioni o velocità per le armi preferite, malus per quelle meno adatte. *Fatto: tabella per arma in `weaponAffinityConfig.ts` con le costanti ★/▼/✓ delle decisioni qui sopra.*
- [x] **Divieti:** `Player.equipWeapon` rifiuta le armi ✗ con il messaggio "NON PUOI USARLA"; se l'arma è in uno slot (zaino) resta lì, ma non si impugna. *Fatto: `equipWeapon` restituisce false, `equipFromBackpack` dà "forbidden", la raccolta a terra rifiuta l'arma.*
- [x] **Filtro del loot:** `ItemFactory` e `LootSystem` non generano a terra armi vietate per la classe in uso, e le sostituiscono con un'arma compatibile; vale anche per forzieri, élite, trofei dei boss e bottega. *Fatto: `resolveLootWeaponId` usa `lootSubstituteId` della cella.*
- [x] **Peso:** ogni arma e armatura ha un peso; senza le statistiche della Fase 4 il peso dà solo un malus di velocità fisso, che la Fase 4 sostituisce con il requisito di Forza. *Cambiato: il peso è solo un dato mostrato (`PESO n`), senza malus; le armature pesanti rallentano già con `moveSpeed`. L'effetto arriva con la Forza nella Fase 4.*
- [x] **Munizioni nello zaino (difetto da correggere):** oggi un'arma da lancio spostata nello zaino e ripresa torna con le munizioni piene, perché lo zaino conserva solo l'oggetto (`Inventory.moveWeaponToBackpack` ed `equipFromBackpack`; anche lo scambio a borsa piena in `GameEngine.pickUpEquipment` ignora `droppedAmmo`). Lo zaino deve conservare il numero di munizioni, anche nello snapshot di inizio livello. *Fatto: `BackpackEntry { item, ammo? }`; anche a terra dallo zaino e in bottega a borsa piena.*
- [x] **Schermata equipaggiamento:** mostrare bonus e malus della classe accanto al confronto con l'oggetto indossato. *Fatto: righe "CLASSE …" nella scheda (verdi/rosse) e riga di classe nella bottega.*
- [x] **Test:** una prova per ogni cella della tabella (vietata, malus, bonus); verifica che nessun livello possa lasciare il giocatore senza arma impugnabile. *Fatto: `classes-phase3.test.mjs`.*
- [x] **Documentazione:** la tabella entra nel manuale, nella sezione delle armi. *Fatto (2.3.0): GAME_MANUAL (tabella, legenda, sostituti), ARCHITECTURE, CODE_MANUAL, TESTING, FEATURES, BALANCE e CHANGELOG.*

**Criterio di chiusura:** tutte e cinque le classi completano i livelli con armi trovate lungo il percorso, senza drop inutilizzabili.

---

## Fase 4 – Statistiche e pentagono (v2.4)

**Obiettivo:** cinque attributi che cambiano davvero il modo di giocare, con una schermata che li mostra come un pentagono.

**Decisioni (grilling del 26 nov 2026):** tutti i numeri sono provvisori, la messa a punto è della Fase 6B.

- **Base neutra:** i valori base per classe servono al pentagono e ai requisiti; gli effetti contano solo i punti spesi sopra la base, quindi un personaggio senza punti spesi gioca come nella 2.3 e le sezioni esistenti di `npm run balance` restano identiche al baseline.
- **Scala:** 0-20 per attributo (raggio pieno del pentagono); il valore effettivo (base + spesi + power-up) non supera mai 20. Requisiti e carico leggono il valore effettivo.
- **Basi (somma 25):** Cavaliere FOR 6, DES 5, INT 2, VIT 6, TEM 6; Ranger 3, 9, 3, 4, 6; Berserker 9, 4, 1, 8, 3; Paladino 6, 2, 4, 7, 6; Mago 2, 4, 10, 4, 5.
- **Punti:** 3 a fine livello e 2 per ogni boss (26 spendibili prima del livello 7: i boss stanno nei livelli 3-7), uguali a ogni difficoltà; valgono per la sola partita e stanno nello snapshot di inizio livello. Si spendono solo in bottega, all'altare della stanza, uno alla volta e senza ridistribuzione; si possono tenere da parte. Icona con il numero nell'HUD e promemoria entrando in bottega.
- **Danno delle armi:** +3% per punto sull'attributo principale (`scalingAttribute`), +1% per punto sul secondario: FOR per le armi corpo a corpo, DES per quelle a distanza e da lancio; se coincidono vale solo il principale.
- **Effetti per punto speso:** FOR carico +1; DES recupero degli attacchi −1% e costo della schivata −1,5%; INT potenza delle mosse 7-0 +2% (tutte le classi) e, per chi ha mana, mana massimo +4, rigenerazione +3%, costo degli incantesimi −1%; VIT salute +4 e difesa +0,5%; TEM stamina +4, recupero della stamina +3%, resistenze +1%.
- **Tetti:** difesa (25%), resistenze (60%) e recupero (30%) condivisi con l'equipaggiamento (`AFFIX_CONFIG`).
- **Requisiti di Forza (morbidi):** solo armi con scaling FOR e peso ≥ 3, FOR richiesta = (peso − 2) × 3 (lancia 3, ascia e mazza 6, spadone 9), −4% danno e +4% recupero per punto mancante; armature, FOR richiesta = peso del pezzo, −3% di velocità per punto mancante; tetto del malus 40%. Le armi iniziali non hanno malus.
- **Carico:** 8 + FOR, conta l'arma in mano più le armature indossate; −3% di velocità per ogni punto oltre, fino a −30%.
- **Gradi degli incantesimi:** `grade` 1-3 in `AbilityDefinition`, requisito rigido INT 12 (grado 2) e 16 (grado 3): slot grigio e messaggio "INTELLIGENZA INSUFFICIENTE". Gli incantesimi attuali sono di grado 1.
- **Power-up:** possono avere effetti sugli attributi; nessun power-up nuovo, il supporto si prova nei test.
- **Pentagono:** base, punti spesi e bonus dei power-up in tre colori della palette, valori e righe degli effetti accanto; in sola lettura dal tasto I, in modalità spesa dall'altare (frecce su/giù, J assegna un punto).
- **Altare:** sprite provvisorio con la skill dei pixel sprite, rifinito nella 6A.
- **Simulatore:** opzione `--build` per il Cavaliere che spende tutti i punti in un attributo; il baseline si aggiorna solo con la sezione nuova.

- [x] **Attributi:** Forza, Destrezza, Intelligenza, Vitalità e Tempra; valori base per classe in `CHARACTER_CONFIG`. *Fatto: basi delle decisioni; effetti per punto in `ATTRIBUTE_CONFIG`, calcoli in `systems/AttributeStats.ts`, punti della partita in `systems/AttributePoints.ts`.*
- [x] **Effetti** (tutti via `PlayerModifiers`, con tetti come quello della difesa al 25%): *fatto con i valori delle decisioni; otto statistiche nuove in `PlayerStatName`, difesa, resistenze e recupero sotto i tetti di `AFFIX_CONFIG`.*
  - **Forza:** danno corpo a corpo, peso trasportabile e requisiti di armi e armature pesanti.
  - **Destrezza:** danno a distanza, velocità d'attacco, costo della schivata.
  - **Intelligenza:** mana massimo e rigenerazione, potenza e costo degli incantesimi, grado degli incantesimi usabili.
  - **Vitalità:** salute massima e un po' di difesa.
  - **Tempra:** stamina massima e recupero, resistenze agli elementi.
- [x] **Scaling delle armi:** ogni arma legge la statistica indicata nei suoi tag (Fase 0). *Fatto: principale 3%, secondario 1% (`WEAPON_SCALING_CONFIG`), solo sugli attacchi dell'arma.*
- [x] **Punti:** un numero fisso a fine livello e un bonus per ogni boss, spesi nella bottega camminabile; quantità da decidere. *Fatto: 3 + 2 per il boss, all'altare della stanza del negozio; snapshot a inizio livello, azzerati a nuova partita.*
- [x] **Schermata delle statistiche:** pentagono a pixel con i cinque valori, apribile dalla schermata dell'equipaggiamento (tasto I) e dalla bottega; tutti i colori dalla palette. *Fatto: stato `attributes`, P dall'equipaggiamento (sola lettura), E all'altare (spesa con J o Invio); `ui/PentagonChart.ts`; indicatore "+N PUNTI" nell'HUD.*
- [x] **Power-up temporanei:** passano dalla stessa pipeline e cambiano le statistiche solo per la loro durata, senza toccare i valori base. *Fatto: `PowerUpDefinition.attributeBonuses`; nessun power-up nuovo, provato nei test.*
- [x] **Requisiti:** armi e armature pesanti richiedono Forza; incantesimi di grado alto richiedono Intelligenza; messaggi chiari quando manca il requisito. *Fatto: "FORZA INSUFFICIENTE (-n)" alla raccolta e nell'equipaggiamento, FOR richiesta nella scheda, slot grigio e "INTELLIGENZA INSUFFICIENTE" per i gradi.*
- [x] **Test e documentazione:** formule e tetti nei test unitari; sezione nuova nel manuale e in ARCHITECTURE. *Fatto: `classes-phase4.test.mjs`, prove nel browser (pentagono e altare), sezione BUILD nel simulatore (`--build`).*

**Criterio di chiusura:** due build molto diverse (ad esempio tutta Forza e tutta Intelligenza) giocano in modo riconoscibilmente diverso nel simulatore. *Sezione BUILD: il Cavaliere tutto Forza finisce prima e perde meno salute, tutto Vitalità non muore ma perde più salute, tutto Intelligenza sta in mezzo. Cambiano tre righe esistenti (Cavaliere in acciaio, Mago col bottino) per i malus della Forza: baseline aggiornato (decisione del 26 nov).*

---

## Fase 5 – Contenuto per classe (v2.5)

**Obiettivo:** tutte le classi hanno le loro mosse, un passivo e le sinergie elementali, ancora come dati e con animazioni riusate.

- [ ] **Mosse extra:** altre 3 mosse per Cavaliere, Ranger, Berserker e Paladino (4 per classe in tutto), ognuna come voce di `ABILITY_CONFIG` con il suo costo in mana, stamina o salute.
- [ ] **Come si ottengono:** da decidere tra mosse note dall'inizio o trovate (pergamene, boss); l'INT del Mago e la Tempra delle altre classi possono fissare i requisiti.
- [ ] **Passivi:** uno per classe (il Paladino ha già la cura lenta, il Ranger la ricarica delle frecce); nuovi campi in `CharacterDefinition` letti da `Player`.
- [ ] **Sinergie elementali:** regole in `ELEMENT_CONFIG` (ad esempio gelo e mazza, bruciatura e fulmine), solo dati e un caso in `StatusEffects` dove serve.
- [ ] **Animazioni:** riuso delle pose comuni (`ABILITY_POSES`); nessuna arte nuova qui.
- [ ] **Test e documentazione:** una prova per ogni mossa (costo, ricarica, effetto) e per ogni sinergia; tabelle del manuale aggiornate.

**Criterio di chiusura:** ogni classe ha 4 mosse funzionanti, un passivo e almeno una sinergia sfruttabile.

---

## Fase 6 – Grafica e bilanciamento (v2.6)

**Obiettivo:** sostituire le animazioni provvisorie e portare tutti i numeri a valori giocabili, in due sessioni separate.

### Sessione A, grafica

- [ ] Animazioni e sprite dedicati per le mosse di ogni classe, una classe alla volta, iniziando dal Mago.
- [ ] Effetti visivi degli incantesimi e del bastone; icone delle mosse nell'HUD.
- [ ] Controllo che nessun pixel esca dalla palette (`MAX_PALETTE_COLORS`) e che le ancore degli sprite siano coerenti.

### Sessione B, bilanciamento

- [ ] Estendere il simulatore con un bot per ciascuna classe e per le build di statistiche.
- [ ] Ritoccare costi, ricariche, danni, valori della tabella di compatibilità, prezzo delle gemme e punti statistica.
- [ ] Verificare i boss (HP, fasi) e il tasso di sopravvivenza per classe e per difficoltà.
- [ ] Aggiornare BALANCE.md e il manuale con i valori finali.

**Criterio di chiusura:** ogni classe completa il gioco in modo simile alle altre sul simulatore, a tutte e tre le difficoltà.

---

## Dopo la 2.6 e decisioni aperte

**Rimandati a dopo il bilanciamento:** modificatori di incantesimo (il campo `modifiers` esiste già dalla Fase 0), maestria delle armi e doni a scelta a fine livello.

**Decisioni ancora da prendere:**

- [x] Quanti punti statistica si guadagnano per livello e per boss. *Deciso: 3 per livello e 2 per boss (vedi Fase 4).*
- [ ] Come si ottengono le mosse extra delle classi (note dall'inizio o trovate).
- [ ] Valore in monete della gemma (proposta: 30).

---

## Come lavoriamo con Claude Code

### Configurazione iniziale (una volta sola)

- [x] Questo file in `documentation/PIANO_CLASSI.md`: è la fonte di verità che ogni sessione legge e spunta.
- [x] `CLAUDE.md` alla radice, corto (≤ 80 righe): comandi del gate, manuali da aggiornare, regola della versione (package.json + CHANGELOG), convenzioni (documenti in italiano, colori solo dalla palette, dati nei `*_CONFIG`), skill di progetto, flusso di fase, puntatore a questo file.
- [x] Permessi in `.claude/settings.json`: `npm run typecheck|test|balance|test:browser|verify-docs|build` e i comandi git di sola lettura senza prompt (`/fewer-permission-prompts` o skill `update-config`).
- [x] Tre agent in `.claude/agents/`, con il modello fissato:

| Agent | Modello | Compito |
|---|---|---|
| `gate-runner` | haiku | Lancia i 5 comandi del gate e restituisce solo PASS/FAIL ed errori (file:riga), così l'output dei test non riempie il contesto |
| `balance-check` | sonnet | Lancia `npm run balance`, lo confronta con `tools/balance-baseline.txt` e riporta le differenze (parità della Fase 0, Fase 6B) |
| `docs-sync` | sonnet | Dal diff della fase aggiorna GAME_MANUAL, ARCHITECTURE, CODE_MANUAL e CHANGELOG, e fa passare `verify-docs` |

- [x] Baseline di `npm run balance` salvato prima di iniziare la Fase 0.

Per cercare nel codice basta l'agent integrato `Explore`.

### Modello per fase

| Fase | Sessione principale | Perché |
|---|---|---|
| 0 Fondazione | Opus, effort high | Refactor delicato, parità esatta |
| 1 Partite scollegate | Sonnet (Opus per la migrazione del salvataggio) | Modifiche ripetitive su tasti, HUD, salvataggio |
| 2 Mago | Opus per il design, poi Sonnet | Dati, HUD e pozione sono meccanici |
| 3 Compatibilità | Opus | Filtro del loot e "mai senz'arma" |
| 4 Statistiche | Opus, effort high | Formule, tetti, pipeline dei modificatori |
| 5 Contenuto | Sonnet | Soprattutto voci di config, guidate da una skill |
| 6A Grafica | Opus | Pixel art in righe di testo, skill `iron-shadow-pixel-sprites` |
| 6B Bilanciamento | Sonnet + `/loop` | Cicli "ritocca → `balance-check`" |

`/fast` va bene nei cicli corti di correzione, non nella progettazione.

### Flusso di ogni fase

1. `/clear`, poi plan mode su Opus: legge questo file e `CLAUDE.md` e produce il piano di dettaglio della fase.
2. Prima delle Fasi 3 e 4: `/grilling` per chiudere le decisioni aperte.
3. Branch `classi/fase-N` da `espansioni`.
4. TDD (`/tdd`) dove ci sono formule: costi, rigenerazione, statistiche.
5. `gate-runner` dopo ogni blocco significativo; `docs-sync` a fine fase.
6. `/code-review medium` sul branch prima del merge.
7. Spuntare le checkbox qui, alzare la versione, commit e merge su `espansioni`.

### Skill da aggiungere

- Dopo la Fase 2: `iron-shadow-add-ability` (voce in `ABILITY_CONFIG`, costo, posa da `ABILITY_POSES`, HUD, test, manuale) ed eventualmente `iron-shadow-add-class`, scritte quando il percorso del Mago è noto, così la Fase 5 diventa ripetitiva.
- Facoltativa: `/chiudi-fase` per i passi 5-7 del flusso.

### Da evitare

- Hook che lanciano i test a ogni modifica: `test:browser` è lento. Al massimo un hook di `typecheck`, da valutare dopo la Fase 0.
- Worktree o agent in parallelo sulle fasi: sono sequenziali e toccano gli stessi file (`Player`, config).
