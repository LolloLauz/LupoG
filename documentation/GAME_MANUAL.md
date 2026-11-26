# IRON & SHADOW – Manuale di gioco

*Medieval Action Arcade in pixel art a 16 bit.* Versione 2.6.0.

Questo manuale è per chi gioca. Per modificare il gioco leggere `CODE_MANUAL.md`; per avviarlo, `INSTALLATION.md`.
I numeri indicati (salute, danni, tempi) sono quelli del gioco così com'è: si possono cambiare in `src/config/`.

---

## 1. Come si avvia

- **Per giocare:** apri `dist/index.html` con un browser moderno (doppio clic). Non serve installare nulla.
- **Per modificare il gioco:** vedi `INSTALLATION.md`.

Il gioco è pensato per essere usato solo con la **tastiera**. Non ha audio.

---

## 2. Storia

Un'ombra è calata sul regno. Dalla Foresta Oscura fino alle profondità del dungeon, scheletri, goblin e soldati
corrotti servono un misterioso **Cavaliere Nero**.

Tu sei il **Cavaliere di Ferro**: armato solo della tua spada, attraversi il regno per sconfiggere il Cavaliere Nero.
Ma il Cavaliere Nero era solo un luogotenente: il vero nemico è il **Signore dell'Ombra**, che attende in cima alla sua torre.
Per raggiungerlo dovrai attraversare la Palude Maledetta della **Strega**, i Picchi Ghiacciati del **Re dei Lupi**, le Lande Desolate
del **Signore delle Lande**, capo dei predoni, e infine la **Torre dell'Ombra**. La storia è tutta qui: nessun dialogo ti rallenta, l'azione viene prima di tutto.

## 3. Ambientazione

Un mondo medievale fantastico, visto di lato (scorrimento orizzontale), con tre ambientazioni:

| Ambientazione | Atmosfera |
|---|---|
| **Foresta Oscura** | notte con la luna piena e le stelle che brillano, montagne innevate, foschia, colline e tre file di pini; prato e terra con sassi, ponticelli di legno |
| **Castello Medievale** | cielo stellato, castelli lontani con le finestre accese, mura merlate con l'edera, colonne con stendardi rossi e corona d'oro; pavimento di pietra |
| **Dungeon Sotterraneo** | mura di mattoni con muschio e crepe, celle con sbarre, torce che illuminano il muro, catene, foschia viola; pavimento di mattoni viola |
| **Lande Desolate** (livello 6) | tramonto rosso con il sole basso e nuvole lunghe, altopiani dalla cima piatta, alberi secchi, costole e sassi, polvere portata dal vento; terra secca con l'erba bruciata, sporgenze di roccia chiara |

I personaggi sono più grandi e dettagliati della versione 1.0 (grafica a 16 bit), ma le **hitbox sono le stesse**: pennacchio, corna, mantelli
e armi sporgono solo per bellezza. Il cavaliere viene colpito sul corpo, non sul pennacchio.

---

## 4. Controlli

| Azione | Tasti |
|---|---|
| Muoversi | **A** / **D** oppure **←** / **→** |
| Saltare | **W** oppure **↑** (tieni premuto per saltare più in alto; rilascia per un salto più corto) |
| Attacco leggero | **J** |
| Attacco pesante | **K** |
| Schivata | **Shift sinistro** (costa stamina) |
| Mosse speciali | **7**, **8**, **9**, **0** (sopra le lettere o sul tastierino numerico); **L** vale come il **7**. Ogni personaggio ha quattro mosse, una per tasto: parte con quelle sul **7** e sull'**8**, le altre due si imparano giocando (vedi "Mosse speciali"). Lo scudo del Paladino (7) e la barriera del Mago (0) si tengono premuti |
| Accovacciarsi | **S** oppure **↓** (solo a terra: non ci si muove e non ci si rialza sotto un soffitto; si può attaccare restando accovacciati, con un colpo più basso) |
| Prendere un'arma, un'armatura o una pozione | **E** stando sopra (vedi "La borsa" ed "Equipaggiamento"); nella bottega, **E** vicino a un piedistallo compra |
| Lasciare a terra | **Q** (l'arma in mano) oppure **Q** + **1**-**4** (quel posto della borsa); nella schermata dell'equipaggiamento, **Q** sull'oggetto scelto |
| Usare un posto della borsa | **1**, **2**, **3**, **4** (arma: la impugni; pozione di salute o di mana: la bevi) |
| Equipaggiamento (armature, borsa, zaino) | **I** (anche dalla pausa); **I** o **Esc** la richiude |
| Attributi (pentagono) | **P** dalla schermata dell'equipaggiamento (sola lettura; **P** o **Esc** per tornare); all'**altare** della bottega, **E** vicino: **W**/**S** scelgono l'attributo, **J** o **Invio** assegna un punto, **Esc** chiude |
| Pausa / riprendi | **Esc** |
| Menu: scegliere | **W** / **S** oppure **↑** / **↓** (scelta del personaggio: anche **A** / **D** oppure **←** / **→**) |
| Menu: confermare | **Invio** |

Durante la pausa e nei menu i comandi di gioco (salto, attacco...) sono bloccati. Se la finestra del browser perde il focus il gioco va
in pausa da solo.

**Spazio**, **5** e **6** non fanno niente.

I tasti si possono cambiare in `src/config/controlsConfig.ts`.

### Dimensione della finestra

Il gioco ha una risoluzione interna di 320×240 pixel e viene ingrandito **solo di multipli interi** (2×, 3×, 4×...), il massimo che entra nella finestra, così i pixel restano nitidi.
Per averlo più grande usa il **pieno schermo del browser (F11)**. Funziona anche con la scala dello schermo di Windows (125%, 150%...). Se la finestra è più piccola del gioco (sotto 320×240 pixel fisici) il gioco viene tagliato.

---

## 5. Come si gioca

**Obiettivo:** completare i sette livelli e sconfiggere il boss finale con le vite a disposizione.

- Hai **3 vite**. Se la salute arriva a 0 perdi una vita e **ricominci il livello** da capo (con nemici e oggetti ripristinati, e con
  il punteggio e le monete che avevi all'inizio di quel livello). Finite le vite: **Game Over**.
- **Ogni nuova partita parte da zero:** solo l'arma iniziale del personaggio, niente pozioni, armature, zaino o monete (vedi "Cosa resta tra
  una partita e l'altra" nella sezione 11b).
- La salute **non si rigenera** (tranne per il Paladino, vedi *Personaggi*): si recupera con le **pozioni** e con la **cura di fine livello**
  (+30 HP, tranne dopo il boss).
- Con **forzieri** e **boss** impari nuove mosse (vedi "Mosse speciali"). Se perdi una vita tornano quelle che avevi a inizio livello.
- La salute si porta da un livello all'altro. Quando ricominci un livello dopo una morte riparti con la salute piena.
- Nei livelli 1 e 2 si finisce **raggiungendo la porta** in fondo. Dal livello 3 al 7 si finisce **sconfiggendo il boss**.
- Cadere in un **abisso** costa **15 HP** e ti riporta all'ultimo punto sicuro (se muori cadendo, perdi una vita).
- Dopo aver subito un colpo sei **invulnerabile per 1 secondo** (il cavaliere lampeggia).
- Toccare un nemico non fa danno: **si viene feriti solo dai loro attacchi** (e cadendo negli abissi).

### Schermate

| Schermata | Cosa mostra |
|---|---|
| **Titolo** | logo, record, il personaggio scelto, menu *Nuova partita*, *Personaggio*, *Scegli livello*, *Difficoltà* (Invio la cambia: Facile → Normale → Difficile), *Controlli* e *Cancella dati* |
| **Cancella dati** | chiede conferma (la voce già scelta è *No*): con *Sì* cancella record, livelli raggiunti, difficoltà e personaggio, e si riparte come alla prima partita (cavaliere con la spada) |
| **Attributi** | il pentagono con i cinque attributi, i punti spesi e i bonus dei power-up, gli effetti dell'attributo scelto, il carico e i requisiti di Forza (vedi "Attributi"); si apre con **P** dall'equipaggiamento o dall'altare della bottega |
| **Bottega** | tra un livello e l'altro: si comprano pozioni, cure, munizioni, armi e armature con le monete (vedi sezione 11b) |
| **Personaggio** | i cinque personaggi in fila (quelli non ancora sbloccati sono sagome con il lucchetto) e la scheda di quello evidenziato (statistiche in tacche da 1 a 5, arma iniziale, salute, mana (riga "100 MANA", solo per il Mago), tratto); A/D (o W/S) per scegliere, Invio per confermare, Esc per tornare senza cambiare |
| **Scegli livello** | i sette livelli: quelli già raggiunti si possono giocare (partita nuova da quel livello), gli altri sono chiusi da un lucchetto; W/S per scegliere, Invio per giocare, Esc per tornare |
| **Controlli** | l'elenco dei tasti |
| **Gioco** | il livello con la barra in alto (HUD) |
| **Pausa** | menu *Riprendi* e *Esci al titolo* (lo schermo si oscura con un retino di pixel) |
| **Game Over** | punti, record; *Riprova* (nuova partita dal livello 1) o *Torna al titolo* |
| **Vittoria** | storia conclusiva, punti, record |

### Personaggi

Il personaggio si sceglie dal titolo (*Personaggio*) e resta salvato. Durante una partita non si può cambiare. Tutti hanno gli stessi tasti, lo stesso salto e la stessa hitbox;
cambiano salute, velocità, danno, difesa, stamina, schivata, arma iniziale, passivo e mosse (vedi *Stamina* e *Mosse speciali* più sotto).

| Personaggio | Salute | Velocità | Danno | Danno subito | Stamina (recupero/s) | Schivata (stamina, attesa) | Arma iniziale | Mosse di partenza (7, 8) |
|---|---|---|---|---|---|---|---|---|
| **Cavaliere** | 100 | 80 | ×1 | ×1 | 100 (30) | 25, 0,7 s | spada | **Onda d'urto**, **Affondo** |
| **Ranger** | 75 | 96 | ×1 | ×1 | 100 (40) | 20, 0,45 s (più lunga) | arco | **Tiro in ritirata**, **Freccia velenosa** |
| **Berserker** | 130 | 80 | ×1,3 | ×1 | 100 (25) | 40, 1 s (più corta) | ascia | **Carica furiosa**, **Ascia rovente** |
| **Mago** | 70 | 84 | ×1 | ×1 | 80 (30), più 100 di mana | 25, 0,7 s | bastone | **Dardo di fuoco**, **Nova di gelo** |
| **Paladino** | 110 | 72 | ×1 | ×0,75 | 120 (25) | 30, 0,8 s | mazza | **Scudo**, **Martello sacro** (e cura lenta: 1 HP/s dopo 4 s senza colpi) |

- Ogni nuova partita inizia con la **sola arma iniziale** del personaggio scelto. Durante la partita puoi cambiare arma: il personaggio non limita
  le armi, cambia solo le statistiche; ogni classe ha però armi preferite, penalizzate o vietate (vedi "Compatibilità classe-arma" nelle armi). Il **Mago** è l'eccezione più forte: usa il **bastone**, che è solo suo, oltre a **spada e pugnale**.
- Velocità: la velocità dell'arma in mano si moltiplica con quella del personaggio (es. Paladino con l'ascia: 72 × 0,85).
- I power-up si sommano ai tratti: la Furia moltiplica anche il danno del Berserker, lo Scudo anche la difesa del Paladino.
- **Passiva del Ranger:** le frecce dell'**arco** si ricaricano da sole, **una ogni 3 secondi** (vedi "Le armi"). La sua schivata resta più lunga e più frequente.

**Passivi.** Ogni personaggio ha un tratto sempre attivo. Quello scritto nella scheda è nella terza colonna.

| Personaggio | Effetto | Scritta nella scheda |
|---|---|---|
| **Cavaliere** | ogni bersaglio colpito con l'arma **corpo a corpo** ridà **4 di stamina** (non con le mosse, non con i proiettili, non con i forzieri) | "PASSIVA: I COLPI RIDANNO STAMINA" |
| **Ranger** | le frecce dell'arco si ricaricano, una ogni 3 s | "PASSIVA: LE FRECCE SI RICARICANO" |
| **Berserker** | con la salute **sotto il 40%** il danno è **×1,25** (armi e mosse). La sua schivata resta corta e faticosa | "PASSIVA: PIÙ FORTE SOTTO IL 40% HP" |
| **Mago** | ogni **nemico o boss sconfitto** da un suo colpo diretto (arma o incantesimo) ridà **10 di mana** | "PASSIVA: MANA DAI NEMICI VINTI" |
| **Paladino** | si cura di **1 HP al secondo** dopo 4 s senza colpi | "SI CURA PIANO FUORI DAI COLPI" |

- **Mago:** fragile, ma gli incantesimi colpiscono da lontano e a mana. Ha **100 di mana** (barra blu sotto la stamina; scheda del personaggio: "100 MANA"). Il mana si recupera piano, **6 al secondo** dopo 0,6 secondi senza spese, e **5 per ogni bersaglio colpito con il bastone**. Si sblocca sconfiggendo la **Strega della Palude** (livello 4). Veste viola lunga fino ai piedi (l'orlo ondeggia quando cammina), barba bianca sul petto, cappello a punta con fascia e stella, mantello e bastone con le punte d'oro.

### Attributi (Forza, Destrezza, Intelligenza, Vitalità, Tempra)

Ogni personaggio ha cinque **attributi**, da 0 a **20**. Partono da valori propri della classe (somma 25) e si alzano con i **punti attributo**.
Chi non spende punti gioca come prima: gli effetti contano solo i punti **sopra la base**.

| Personaggio | FOR | DES | INT | VIT | TEM |
|---|---|---|---|---|---|
| **Cavaliere** | 6 | 5 | 2 | 6 | 6 |
| **Ranger** | 3 | 9 | 3 | 4 | 6 |
| **Berserker** | 9 | 4 | 1 | 8 | 3 |
| **Paladino** | 6 | 2 | 4 | 7 | 6 |
| **Mago** | 2 | 4 | 10 | 4 | 5 |

**Effetti di ogni punto speso:**

| Attributo | Effetto per punto |
|---|---|
| **Forza** | danno +3% per spada, lancia, ascia, mazza e spadone, +1% per pugnale e bastone; carico +1 (capacità); requisiti delle armi e armature pesanti |
| **Destrezza** | recupero tra gli attacchi -1%; costo della schivata -1,5%; danno +3% per pugnale, arco, balestra, coltelli e giavellotto |
| **Intelligenza** | potenza delle mosse 7-0 +2% (tutte le classi); per chi ha mana: mana +4, rigenerazione del mana +3%, costo degli incantesimi -1%; danno del bastone +3%; grado delle mosse usabili |
| **Vitalità** | salute +4; difesa +0,5% |
| **Tempra** | stamina +4; recupero della stamina +3%; resistenze agli elementi +1% |

Difesa (tetto 25%), resistenze (60%) e recupero (30%) condividono il **tetto** con l'equipaggiamento: i punti non lo superano.

**Danno delle armi.** Ogni arma ha un attributo **principale** (Forza: spada, lancia, ascia, mazza, spadone; Destrezza: pugnale, arco, balestra, coltelli, giavellotto; Intelligenza: bastone): +3% di danno per punto speso. Il **secondario** (Forza per il corpo a corpo e il bastone, Destrezza per le armi a distanza e da lancio) dà +1% per punto; se coincide con il principale vale solo il principale. Vale solo per gli attacchi dell'arma, non per le mosse e gli incantesimi.

**Requisiti di Forza** (morbidi: l'oggetto si usa sempre, ma con un malus):

| Oggetto | Forza richiesta | Se manca |
|---|---|---|
| Arma da Forza di peso 3 o più (lancia 3, ascia e mazza 6, spadone 9) | (peso - 2) × 3 | per ogni punto che manca, danno -4% e recupero +4% (tetto 40%) |
| Pezzo d'armatura | il suo peso (1-4, corazza ×2) | per ogni punto che manca, velocità -3%, sommato sui pezzi (tetto 40%) |

L'arma iniziale non ha malus. Alla raccolta e nell'equipaggiamento compare "FORZA INSUFFICIENTE (-n)"; nella scheda dell'oggetto "FOR n" è **rosso** se non basta.

**Carico.** Si porta senza malus fino a **8 + Forza** di peso, contando l'arma in mano e le armature indossate (non lo zaino). Ogni punto in più toglie il **3%** di velocità, fino a -30%.

**Gradi delle mosse.** Ogni mossa ha un grado da 1 a 3: il 2 richiede **Intelligenza 12**, il 3 richiede **16**. Sotto la soglia la mossa non parte ("INTELLIGENZA INSUFFICIENTE") e il suo riquadro nell'HUD è grigio. Tutte le mosse attuali sono di grado 1.

**Power-up.** Un power-up può dare punti di attributo temporanei (sempre entro il 20). Nessun power-up attuale lo fa.

**Punti attributo.** Si guadagnano a fine livello: **3**, più **2** se il livello aveva un boss. Non si ricevono dopo l'ultimo livello. I boss sono nei livelli 3-7: in una partita si spendono **26 punti**. Sono uguali a ogni difficoltà, valgono per la sola partita (una nuova partita riparte da zero) e, se perdi una vita e ricominci il livello, tornano com'erano all'inizio. Il riquadro di fine livello mostra "+N PUNTI ATTRIBUTO".

**Altare.** Nella stanza della bottega, tra l'ultimo piedistallo e la porta, c'è l'**altare**: con punti da spendere brilla e mostra quanti sono. **E** vicino apre il pentagono in modalità spesa: **W**/**S** scelgono l'attributo, **J** o **Invio** assegna un punto, **Esc** chiude. I punti spesi **non si ridistribuiscono**; quelli non spesi si tengono per la bottega dopo.

**Il pentagono.** Cinque vertici (FOR in alto, poi in senso orario DES, INT, VIT, TEM) con tre colori: la **base** della classe, i **punti spesi** e i **bonus dei power-up**. A destra l'elenco con i valori, sotto gli effetti dell'attributo scelto (anche il danno dell'arma in mano), in fondo "CARICO n/m" e, se serve, "FORZA INSUFFICIENTE". Dall'equipaggiamento (**P**) è solo da leggere. Chiudendo l'equipaggiamento si torna dove era stato aperto (gioco o pausa).

### Stamina

La **barra verde** sotto la salute è la **stamina** (diventa gialla sotto un terzo). La consumano:

- la **schivata** (Shift sinistro): da 20 a 40 secondo il personaggio (il Berserker è quello che fa più fatica);
- ogni **attacco pesante** (K), compresi il tiro caricato dell'arco e il colpo in picchiata: **15**;
- le **mosse speciali** che costano stamina (tutte quelle delle classi senza mana, tranne il Colpo di sangue, che costa salute) e lo scudo alzato.

Gli attacchi leggeri (J), il salto e la corsa non costano niente. La stamina si ricarica da sola **0,6 secondi** dopo l'ultimo consumo;
il Cavaliere ne recupera anche colpendo (vedi *Passivi*).
Se non basta l'azione non parte e compare "STANCO".

### Mosse speciali (tasti 7, 8, 9, 0)

Ogni personaggio ha **quattro mosse** proprie, una per ciascuno dei tasti **7**, **8**, **9** e **0** (**L** vale come il **7**).
Durante un attacco o una schivata la mossa attiva non cambia. Una mossa ha un costo (stamina, mana o salute) e poi va ricaricata:
accanto alla barra della stamina ogni mossa ha un riquadro con la sua **icona**; il **numero del tasto** sta sopra il riquadro; un retino scuro copre l'icona e scende mentre la mossa si ricarica; il numero è dorato
quando la mossa è pronta (ricaricata e con abbastanza risorse). Il riquadro dell'ultima mossa scelta ha il **bordo dorato**; il numero diventa **rosso** se la risorsa non basta.
Le mosse si usano solo a terra e in piedi, con qualsiasi arma in mano (l'arma cambia solo l'aspetto).

**Come si imparano.** Si parte con **due mosse** (7 e 8). La terza (9) e la quarta (0) si imparano **in quest'ordine**:

- aprendo un **forziere** hai il **25%** di probabilità di imparare la prossima;
- ogni **boss** sconfitto te la insegna **di sicuro** (compare anche nel riquadro di fine livello).

Compare "NUOVA MOSSA: nome (tasto)". Finché non è imparata, il riquadro mostra un **lucchetto** e il tasto fa comparire "MOSSA NON ANCORA IMPARATA".
Le mosse imparate valgono **solo per la partita in corso** (anche partendo da **Scegli livello** si inizia con due). Se perdi una vita e ricominci il livello, tornano quelle che avevi all'inizio.

| Mossa | Classe (tasto) | Costo | Ricarica | Effetto |
|---|---|---|---|---|
| **Onda d'urto** | Cavaliere (7) | 40 stamina | 6 s | colpo a terra da **25** che investe tutti fino a **40 px davanti e dietro**; rompe la guardia; tremolio e polvere |
| **Affondo** | Cavaliere (8) | 25 stamina | 3,5 s | **scatto in avanti** di circa 36 px con una stoccata da **22**, stretta e lunga; non rende invulnerabili |
| **Colpo di scudo** | Cavaliere (9) | 25 stamina | 6 s | colpo ravvicinato da **14** con **shock** (stordisce) |
| **Lama ardente** | Cavaliere (0) | 35 stamina | 6 s | fendente da **28** che **brucia** |
| **Tiro in ritirata** | Ranger (7) | 30 stamina | 4 s | **balzo all'indietro** (circa 55 px, invulnerabile) e una **freccia da 20** in avanti |
| **Freccia velenosa** | Ranger (8) | 25 stamina | 4 s | freccia da **14** che **avvelena** |
| **Freccia gelida** | Ranger (9) | 25 stamina | 5 s | freccia da **14** che **gela** |
| **Freccia di fuoco** | Ranger (0) | 30 stamina | 5 s | freccia da **18** che **brucia** |
| **Carica furiosa** | Berserker (7) | 40 stamina | 5 s | **scatto in avanti** di circa 70 px che **travolge** e attraversa i nemici (35 danni, rompe la guardia); non rende invulnerabili |
| **Ascia rovente** | Berserker (8) | 30 stamina | 4,5 s | fendente da **30** che **brucia** |
| **Terremoto** | Berserker (9) | 40 stamina | 7 s | colpo tutt'intorno da **20** con **shock**; tremolio e polvere |
| **Colpo di sangue** | Berserker (0) | **15 di salute** | 6 s | colpo lento da **55** che rompe la guardia; non parte se non ti resterebbe almeno 1 HP ("SALUTE INSUFFICIENTE") |
| **Scudo** | Paladino (7) | 10 stamina per alzarlo | 0,3 s | **tieni premuto 7** (o L): lo scudo para i colpi **da davanti** (anche le frecce); non ti muovi ma puoi girarti; consuma 12 di stamina al secondo |
| **Martello sacro** | Paladino (8) | 30 stamina | 5 s | colpo da **24** con **shock** che rompe la guardia |
| **Consacrazione** | Paladino (9) | 40 stamina | 7 s | fuoco tutt'intorno: **18** e **bruciatura**; tremolio e polvere |
| **Giudizio gelido** | Paladino (0) | 40 stamina | 7 s | colpo tutt'intorno da **18** che **gela**; tremolio e polvere |
| **Dardo di fuoco** | Mago (7) | 15 mana | 0,9 s | proiettile da **22** che **brucia** il bersaglio |
| **Nova di gelo** | Mago (8) | 30 mana | 5 s | colpo tutt'intorno da **18** che **gela** chi colpisce (velocità dimezzata per 3 s); tremolio e polvere |
| **Balzo arcano** | Mago (9) | 20 mana | 3 s | **balzo all'indietro** invulnerabile, per allontanarsi (non fa danno) |
| **Barriera** | Mago (0) | 10 mana per alzarla | 0,3 s | **tieni premuto 0**: come lo scudo, para i colpi **da davanti**; consuma 10 mana al secondo e **1 mana per ogni punto di danno parato**; parata perfetta come lo scudo |

Le mosse "tutt'intorno" arrivano fino a **40 px davanti e dietro**. Le frecce e il dardo non consumano munizioni. 

**Come si vedono.** Ogni mossa ha pose del corpo e **effetti** propri. Le pose sono otto in tutto, comuni a tutte le armi: arma alzata, colpo a terra, affondo, lancio a mano aperta, arco teso, carica dietro la testa, colpo di scudo e ginocchio a terra. Il resto lo fanno gli effetti.

| Effetto | Dove si vede |
|---|---|
| anelli d'area (polvere, fuoco, gelo, shock) | onda d'urto, terremoto (anello di shock e di polvere), nova di gelo, consacrazione, giudizio gelido: partono ai piedi e si allargano |
| lampi di lancio (fuoco, gelo, arcano, veleno, shock, sacro) | davanti alla mano all'inizio di incantesimi e frecce |
| fulmine, fiamme, schegge | colpo di scudo, lama ardente, ascia rovente, martello sacro |
| scie di velocità e **sagome** colorate (grigio, verde, brace, lilla) lasciate indietro | affondo, tiro in ritirata, carica furiosa, balzo arcano |
| aura e fendente rossi | colpo di sangue |
| **lama tinta** | durante la mossa la lama prende i colori dell'elemento (fuoco, gelo, shock...), anche sopra le armature |

Il dardo di fuoco è una **cometa** e le tre frecce del Ranger hanno la punta dell'elemento. Lo scudo del Paladino e la barriera del Mago sono due **barriere** disegnate davanti: la barriera è bianca nella finestra della parata perfetta.

- Gli incantesimi del Mago (tutti quelli che costano mana) con il **bastone in mano** fanno **il 20% di danno in più** e costano **il 15% di mana in meno** (arrotondato). Se il mana non basta l'incantesimo non parte e compare "SENZA MANA". Con la guardia rotta (mana finito) la barriera cade come lo scudo.
- Gli scatti delle mosse (affondo, tiro in ritirata, carica furiosa, balzo arcano) **si fermano sul bordo** di un abisso.
- **Parata perfetta**: se lo scudo è alzato da **meno di 0,25 secondi** quando arriva il colpo (la barriera davanti al Paladino è
  **bianca**, poi diventa azzurra), il colpo non costa niente e chi ha attaccato resta **stordito per 1 secondo** ("PARATA!"). I boss non vengono storditi.
- **Parata normale**: costa 1,5 di stamina per ogni punto di danno (la Barriera: 1 mana). Se la stamina (o il mana) non basta la **guardia si rompe** ("GUARDIA ROTTA") e il colpo passa.
- I colpi **alle spalle** non si parano.

### L'HUD (la barra in alto)

| Elemento | Significato |
|---|---|
| cuore + 10 segmenti rossi | salute; lampeggia sotto il 30% |
| barra verde sotto la salute | stamina (gialla sotto un terzo); per chi ha mana (Mago) le barre sono due, più sottili: stamina sopra, **mana blu** sotto |
| riquadri con l'icona della mossa (uno ogni 11 px) e il numero del tasto (**7**, **8**, **9**, **0**) sopra | mosse speciali: **lucchetto** su riquadro scuro se non ancora imparata; icona a colori quando è pronta, coperta da un retino scuro mentre si ricarica, riquadro azzurro con lo scudo o la barriera alzati; numero rosso se la risorsa non basta; riquadro **grigio scuro** con l'icona a sagoma grigia se la mossa richiede più Intelligenza di quella che hai; bordo dorato sulla mossa scelta |
| icone sotto la barra | power-up attivi, ognuno con la barra del tempo che resta (lampeggia quando sta per finire) |
| **+N PUNTI** sotto il pannello, a sinistra (dopo le icone dei power-up) | punti attributo ancora da spendere; lampeggia piano; sparisce quando sono finiti |
| icona dell'elmo **x3** | vite rimaste |
| 4 riquadri numerati sotto la barra, a destra | la borsa: armi e pozioni (con quante sono); l'arma in mano ha la cornice dorata |
| **LIVELLO n** | livello corrente |
| numero dorato a 6 cifre | punteggio |
| moneta **xn** | monete della partita |
| teschio e barra in basso (solo contro il boss) | salute del boss, con una tacca dove cambia fase; diventa arancione nella seconda fase |

---

## 6. Il combattimento

Il Cavaliere parte con la **spada** (gli altri personaggi con la propria arma) e ne tiene in mano **una alla volta**: lungo il viaggio trova altre armi (vedi "Le armi" più avanti).
Le tabelle qui sotto valgono per la spada.

### Attacchi

| Attacco | Tasto | Danno | Durata | Note |
|---|---|---|---|---|
| Fendente 1 | J | 15 | 250 ms | colpisce tra 80 e 170 ms |
| Fendente 2 | J | 15 | 250 ms | colpisce tra 80 e 170 ms |
| Fendente 3 (finale) | J | 30 | 350 ms | colpisce tra 120 e 250 ms; 400 ms di pausa dopo |
| Attacco pesante | K | 30 | 500 ms | colpisce tra 220 e 360 ms; area più grande; 500 ms di pausa dopo |

### Combo

Le combo possono mescolare attacco leggero (J) e pesante (K). Ogni arma ha le sue; quando completi una combo il suo nome
compare sopra il cavaliere. Con la spada:

| Combo | Sequenza | Colpi | Danno totale |
|---|---|---|---|
| **Triplo fendente** | J → J → J | fendente 1, 2, 3 | 15 + 15 + 30 = **60** |
| **Fendente montante** | J → K | fendente 1, montante (colpisce anche in alto) | 15 + 28 = **43** |

Le combo delle altre armi sono nella tabella "Le armi" più avanti.

Per concatenare la combo premi il tasto successivo **entro 0,4 secondi dalla fine del colpo precedente**: se aspetti troppo,
la sequenza riparte dal primo colpo. Se premi il tasto negli **ultimi 0,2 secondi** prima che l'attacco successivo possa partire, il colpo viene **memorizzato** e parte appena possibile: non serve premere con precisione al millisecondo. Un tasto premuto molto prima viene invece **ignorato**, e quando smetti di premere il cavaliere si ferma (al massimo parte un ultimo attacco, entro 0,2 secondi dall'ultima pressione).

### Regole degli attacchi

- A **terra**, mentre attacchi non puoi muoverti, saltare o girarti: l'attacco ti impegna fino alla fine.
- In **aria** puoi attaccare e continuare a controllare il movimento. Gli attacchi in aria sono una **categoria a parte**:
  - **J, J**: combo in volo di due colpi (i primi due colpi leggeri dell'arma; un'eventuale combo a terra riparte da capo);
  - **K**: **colpo in picchiata**: scendi velocemente con l'arma puntata in basso e colpisci chi sta sotto (anche poco sotto i piedi).
    Se colpisci qualcosa **rimbalzi verso l'alto** e puoi colpire di nuovo in picchiata; se tocchi terra la picchiata finisce, con un breve
    recupero (0,25 s). Danni: spada 24, pugnale 16, lancia 26, ascia 34 (rompe la guardia), mazza 30 (schiaccia le corazze).
- Ogni attacco **colpisce ogni nemico una sola volta**.
- L'area colpita è davanti a te; si specchia se guardi a sinistra.

### La schivata (Shift sinistro)

- Uno **scatto di circa 48 px** nella direzione in cui guardi, della durata di 0,3 secondi.
- Durante la schivata sei **invulnerabile**: puoi attraversare gli attacchi dei nemici.
- È anche **l'unico modo per passare attraverso un nemico**: camminando ti fermi contro il suo corpo (vale anche per il boss; i nemici volanti non bloccano). Se la schivata finisce dentro un nemico, vieni spinto fuori dal lato più vicino.
- Dopo la schivata devi aspettare 0,7 secondi (il tempo cambia con il personaggio) e la schivata **costa stamina**.
- Si può fare solo **a terra** e non mentre stai attaccando.

### Le armi

Oltre alla spada ci sono cinque armi corpo a corpo, più il bastone del Mago. Si usano con gli stessi tasti (J, K) e ognuna ha i propri colpi e la propria combo.

| Arma | Colpi leggeri (J) | Combo | Attacco pesante (K) | Passo | Particolarità |
|---|---|---|---|---|---|
| **Spada** | 15 danni, 250 ms | **Triplo fendente** (J ×3): 15 + 15 + 30; **Fendente montante** (J, K): 15 + 28 | 30 danni, 500 ms | normale | equilibrata |
| **Pugnale** | 9 danni, 160 ms | **Raffica** (J ×4): 9 + 9 + 9 + 18; **Morso del serpente** (J ×3, K): 9 + 9 + 9 + 30 | 22 danni, 360 ms | più svelto (×1,15) | il più rapido, portata corta |
| **Lancia** | affondi da 13 danni, 300 ms | **Danza della lancia** (J ×3): 13 + 13 + fendente ampio da 20; **Carica del drago** (J, K): 13 + affondo da 34 lungo 44 px | affondo da 32 danni, 560 ms | un po' più lento (×0,95) | **la portata più lunga**: colpisce fino a circa 40 px davanti, ma l'affondo è stretto |
| **Ascia** | 22 / 26 danni, 400-440 ms | **Doppio taglio** (J ×2): 22 + 26; **Spaccaossa** (J ×2, K): 22 + 26 + 52 | 46 danni, 700 ms | più lento (×0,85) | **rompe la guardia**: interrompe anche un nemico che ha già iniziato il suo colpo |
| **Mazza** | 17 danni, 340 ms | **Tempesta di colpi** (J ×3): 17 + 17 + 28; **Terremoto** (J, K): 17 + 32, colpisce in basso anche **dietro** di te | 36 danni, 620 ms | più lento (×0,9) | **schiaccia le corazze**: danno pieno al golem, che resta stordito per 0,6 secondi |
| **Spadone** (a due mani) | 30 / 34 danni, 520-540 ms | **Lama del gigante** (J ×2): 30 + 34; **Turbine** (J ×2, K): 30 + 34 + 48, colpisce anche **dietro** di te | 58 danni, 820 ms | più lento (×0,85) | **portata lunga e rompe la guardia** come l'ascia; il più lento di tutti |

| **Bastone** (solo Mago) | 8 / 8 danni, 320 ms | **Mulinello** (J ×3): 8 + 8 + 14; **Spazzata arcana** (J, K): 8 + 16, colpisce in basso anche **dietro** di te | 18 danni, 560 ms | normale | **catalizzatore**: ridà **5 mana** per ogni bersaglio colpito e rende gli incantesimi più forti (×1,2) e meno cari (×0,85); in picchiata 14 danni; non ha munizioni |

**Compatibilità classe-arma** (Classi Fase 3). Ogni classe ha un rapporto diverso con **ciascuna** arma. Legenda: **I** arma iniziale (valori normali), **✓** normale, **★** preferita, **▼** penalizzata, **✗** vietata.

| Arma | Cavaliere | Ranger | Berserker | Paladino | Mago |
|---|---|---|---|---|---|
| Spada | I | ✓ | ✓ | ★ | ✓ |
| Pugnale | ✓ | ✓ | ▼ | ▼ | ✓ |
| Lancia | ★ | ▼ | ✓ | ✓ | ✗ |
| Ascia | ✓ | ▼ | I | ★ | ✗ |
| Mazza | ✓ | ▼ | ✓ | I | ✗ |
| Spadone | ★ | ✗ | ★ | ▼ | ✗ |
| Arco | ▼ | I | ▼ | ▼ | ✗ |
| Balestra | ▼ | ★ | ▼ | ▼ | ✗ |
| Coltelli | ▼ | ★ | ▼ | ▼ | ✗ |
| Giavellotto | ✓ | ★ | ✓ | ▼ | ✗ |
| Bastone | ✗ | ✗ | ✗ | ✗ | I |

| Segno | Effetto |
|---|---|
| ★ preferita | **+15% di danno**; per le armi a distanza **+50% di munizioni** (Ranger: coltelli 9, balestra 9, giavellotti 4; l'arco resta a 12) |
| ▼ penalizzata | **-15% di danno** e recupero tra gli attacchi **+15%** (più lento) |
| ✗ vietata | non si impugna, non si raccoglie ("NON PUOI USARLA"); dallo zaino resta dov'è |

Bonus e malus valgono solo per gli **attacchi dell'arma**: le mosse speciali e gli incantesimi (tasti 7-0) hanno sempre il loro danno e la loro ricarica, qualunque arma si abbia in mano.

Il Mago può ora impugnare anche **spada e pugnale**; il bastone resta solo suo. Il **catalizzatore** (mana e incantesimi più forti) vale però solo con il bastone.

**Bottino filtrato.** Le armi vietate non compaiono mai a terra: forzieri, nemici d'élite, trofei dei boss, ricompensa finale e bottega le sostituiscono (rarità estratta come per le altre armi). Il **bastone** delle altre classi diventa la loro arma iniziale; lo **spadone** del Ranger diventa una **balestra**; per il Mago lo spadone diventa una **spada** e ogni altra arma vietata un **bastone**. In bottega il Mago trova sempre anche i bastoni tra le armi in vendita (di un'altra rarità rispetto al suo), non solo la spada. Il bastone Leggendario è il **BASTONE DELLE STELLE** (+14 danno, elemento folgore, recupero più rapido).

I boss non vengono mai storditi: contro di loro ascia e mazza contano solo per il danno.

**Armi a distanza.** Tirano proiettili invece di colpire davanti a te: colpiscono nemici, boss e forzieri, non si
deviano con la spada e non hanno combo. Si usano anche in aria (lì non c'è la picchiata).

| Arma | J | K | Munizioni | Particolarità |
|---|---|---|---|---|
| **Arco** | tiro rapido, 8 danni | **tieni premuto per caricare**, rilascia per tirare: da 10 a **34 danni**, freccia fino a 1,6 volte più veloce (carica piena in 0,9 s, segnalata da un bagliore; dopo 2,5 s tira da solo) | **12** frecce | la freccia scende appena: mira dritto |
| **Balestra** | dardo da **40 danni**, veloce e dritto | come J | **6** dardi | **ricarica di 0,9 s** dopo ogni tiro |
| **Coltelli** | lancio ad arco, 12 danni | lancio più basso (per i nemici piccoli) | **6** | il coltello cade dove colpisce o dove si ferma: **passandoci sopra lo recuperi** (+1); quelli caduti negli abissi si perdono |
| **Giavellotto** | lancio potente ad arco, **50 danni**, **trafigge** tutti i nemici sulla sua strada | come J | **3** | ogni giavellotto lanciato **si perde**; finiti i giavellotti l'arma esce dalla borsa e impugni l'arma successiva |

Senza munizioni l'arma non tira ("SENZA MUNIZIONI"), nemmeno il tiro caricato dell'arco. Frecce e dardi tirati non si recuperano: in ogni
livello c'è una **faretra** che, toccandola, riempie le munizioni di **tutte** le armi della borsa (se sono già piene resta a terra
per dopo). Anche raccogliendo di nuovo un'arma con munizioni che hai già le sue munizioni tornano piene. Il **massimo** delle munizioni dipende dalla classe (con ★ +50%, vedi "Compatibilità classe-arma"). Nella borsa il numero sotto l'icona indica le munizioni (in rosso quando sono finite).
I power-up valgono anche per i proiettili (per esempio la Furia aumenta il danno delle frecce).

**Frecce del Ranger.** Solo con il Ranger le frecce dell'arco tornano da sole, **una ogni 3 secondi**, fino al massimo di 12:

- vale con l'arco **in mano o in borsa**, non nello **zaino** (e non per un arco lasciato a terra);
- il tempo scorre solo se manca almeno una freccia: dopo un tiro con l'arco pieno, la prima torna dopo 3 secondi interi;
- il conteggio riparte da zero a ogni livello; in pausa e nei menu è fermo;
- i **quadrelli della balestra** e le altre munizioni non si ricaricano. La faretra continua a riempire tutto subito.

**Dove si trovano**

- **Forzieri**: colpiscili con qualsiasi arma per aprirli; l'arma compare sopra il coperchio. A volte (25%) insegnano anche una mossa (vedi "Mosse speciali").
- **Nemici d'élite**: hanno un **alone dorato**, il doppio della salute, il 30% di danno in più e valgono il triplo dei punti. Sconfitti, lasciano la loro arma. Il bottino di un nemico ucciso in volo **cade a terra**; sopra un abisso compare sull'ultimo terreno fermo su cui sei passato.
- **Trofei dei boss**: ogni boss tranne quello finale lascia un'arma (di rarità alta) e un pezzo d'armatura, che trovi poco dopo la partenza del livello successivo. Il riquadro di fine livello li annuncia ("TROFEO").

Ogni arma trovata ha una **rarità** (vedi "Equipaggiamento"): la stessa arma può essere Comune o, con fortuna, Epica.

| Livello | Arma | Dove |
|---|---|---|
| 1 | Pugnale | forziere vicino alla partenza |
| 2 | Lancia | soldato d'élite |
| 3 | Ascia | forziere |
| 4 | Mazza | trofeo del Cavaliere Nero, all'inizio del livello |
| 4 | Spadone | scheletro d'élite |
| 5 | Ascia | trofeo della Strega, all'inizio del livello |
| 5 | Mazza | forziere vicino al golem |
| 6 | Lancia | trofeo del Re dei Lupi, all'inizio del livello |
| 6 | Mazza | soldato d'élite |
| 7 | Balestra | trofeo del Signore delle Lande, all'inizio del livello |
| 2 | Arco | forziere vicino alla partenza |
| 3 | Coltelli | scheletro d'élite |
| 4 | Balestra | forziere |
| 5 | Giavellotto | goblin d'élite |
| 6 | Giavellotto | forziere prima dell'arena |

**Prendere e cambiare arma**: le armi vanno nella **borsa** (vedi sotto). Stando sopra un'arma compare la scritta "E PRENDI ...":
premi **E** e la prendi; la impugni subito. Per cambiare arma premi il **numero** del suo posto nella borsa.

### La borsa

La borsa ha **4 posti**, mostrati sotto la barra in alto a destra, ognuno con il suo numero. Contiene **armi** e **pozioni**.

- **E** raccoglie l'arma o la pozione che stai toccando. Le **pozioni non curano più al tocco**: le conservi e le bevi quando vuoi.
- **1-4** usano il posto: un'arma diventa quella in mano (cornice dorata); una pozione di salute cura **30 HP** (a salute piena non viene sprecata); una **pozione di mana** ridà **40 mana** (a mana pieno resta, con la scritta "MANA PIENO").
- Le pozioni di ogni tipo (salute, mana) stanno in un posto proprio, **al massimo 2 per tipo**: conservarle per i boss aiuta molto, quindi la scorta è piccola.
- **Q** lascia a terra l'**arma in mano** (impugni la prossima della borsa); tenendo **Q** e premendo **1-4** lasci il contenuto di quel posto
  (un'arma, oppure **una** pozione). Solo stando a terra; l'ultima arma non si può lasciare. Un'arma lasciata (anche dallo zaino) tiene le sue munizioni e si
  riprende con **E** dopo essersi allontanati un attimo; una pozione si riprende subito.
- Un'arma **identica** a una che hai già non si prende due volte ("GIÀ NELLA BORSA"). Un'arma dello **stesso tipo ma diversa** (un'altra
  rarità o altri modificatori) prende il posto della tua, che va nello **zaino**.
- **Borsa piena**: una nuova arma prende il posto di quella in mano, che va nello **zaino** (vedi "Equipaggiamento"); se anche lo zaino è
  pieno resta a terra nello stesso punto (puoi riprenderla dopo esserti allontanato un attimo). Una pozione in più non entra ("BORSA PIENA").
- Se perdi una vita, la borsa torna **com'era all'inizio del livello** (come punteggio e monete): ciò che avevi raccolto nel livello è di nuovo a terra.
- **Munizioni nello zaino**: un'arma da lancio messa nello zaino e ripresa (o scambiata a borsa piena, o comprata con la borsa piena) **conserva** le munizioni che aveva. Nello zaino le munizioni non si ricaricano.
- Borsa, armature e zaino valgono **solo per la partita in corso**: la partita successiva riparte con la sola arma iniziale.
- I **power-up**, le monete e le gemme non vanno nella borsa: si raccolgono toccandoli.

### Equipaggiamento: rarità, armature e zaino

**Rarità.** Ogni arma e ogni armatura ha una rarità, che si riconosce dal **colore** del nome, del bagliore a terra e dell'oggetto stesso
(il metallo delle armi, il riflesso delle armature):

| Rarità | Colore | Modificatori |
|---|---|---|
| Comune | grigio | nessuno |
| Non comune | verde | 1 |
| Raro | blu | 2 |
| Epico | viola | 3, di cui uno che cambia il modo di giocare (un elemento, "rompe la guardia" o una resistenza) |
| Leggendario | arancione | oggetto unico con nome ed effetti fissi (uno per ogni arma, più tre armature) |
| Mitico | rosso | oggetto unico, il più raro: solo dal boss finale |

Più è rara, più l'arma fa danno (fino a +20%) e più l'armatura protegge. I **modificatori** sono: danno, recupero tra un colpo e l'altro
più corto, velocità, furto di vita (una parte del danno inflitto torna in salute), salute, stamina, difesa, resistenza a un elemento,
colpi con un elemento (fuoco, veleno, gelo, fulmine, come i power-up) e "rompe la guardia". Il nome dell'oggetto dice il primo
modificatore (per esempio *Spada della Furia*: più danno). I valori hanno un **tetto**: per esempio la difesa totale non supera il 25%.

**Armature.** Tre posti: **elmo**, **corazza**, **stivali**. Quattro materiali:

| Materiale | Effetto |
|---|---|
| Stoffa (Cappuccio, Tunica, Calzari) | leggera: stamina in più |
| Cuoio | un po' di difesa e velocità |
| Ferro | difesa e salute, un po' più lento |
| Acciaio | la difesa più alta, il più lento |

La corazza conta più di elmo e stivali. Ogni pezzo cambia il colore della sua parte del personaggio. **Set**: due o tre pezzi dello
stesso materiale danno un bonus (Set del Viandante, del Predone, del Soldato, del Guardiano). Le **resistenze** riducono il danno dei
colpi di quell'elemento: il veleno di melme e scorpioni, il gelo del golem, il fuoco delle palle di fuoco, il fulmine dei dardi magici.
La difesa non scende mai sotto 1 danno per colpo.

**Raccogliere un'armatura** (E): se il suo posto è libero la indossi subito, altrimenti va nello zaino ("ZAINO PIENO" se non c'è spazio).

**Schermata dell'equipaggiamento** (tasto **I**, anche dalla pausa). Il gioco si ferma. In alto le armature indossate e la borsa, sotto lo
**zaino** (12 posti per armi e armature di riserva) e il riassunto dei bonus; in basso la scheda dell'oggetto scelto: nella riga del tipo compare il **PESO** (armature da 1 di stoffa a 4 di acciaio, la corazza conta il doppio). Il peso conta per i requisiti di Forza e per il carico (vedi "Attributi"); nella scheda, "FOR n" è la Forza richiesta (rossa se non basta). Per le armi le prime righe della griglia mostrano i bonus e malus della tua classe: in **verde** "CLASSE DANNO +15%" e "CLASSE MUNIZIONI +50%", in **rosso** "CLASSE DANNO -15%", "CLASSE RECUPERO +15%" e, per le vietate, "NON PUOI USARLA". Frecce per scegliere:

- **Invio** su un'armatura indossata la toglie (nello zaino); su un'arma della borsa la mette nello zaino (non l'ultima); su un oggetto dello
  zaino lo indossa o lo impugna (quello che aveva lo stesso posto torna nello zaino).
- **Q** lascia a terra l'oggetto scelto (solo stando a terra).
- Un'arma che la tua classe non può usare non si impugna dallo zaino: "NON PUOI USARLA".
- Per gli oggetti dello zaino la scheda li **confronta** con quello che indossi: tra parentesi la differenza, **verde** se migliora,
  **rossa** se peggiora.

**Dove si trovano**: forzieri ed élite lasciano la loro arma con una rarità e a volte un pezzo d'armatura; i nemici normali qualche volta
un'armatura; i boss un'arma e un'armatura di rarità alta; il **boss finale** assegna un oggetto Leggendario o **Mitico**: è un **trofeo** mostrato a fine livello
("TROFEO: ..."), non va nello zaino perché la partita finisce.
Avanzando nei livelli (e a difficoltà difficile) le rarità alte escono più spesso, e le armature passano dalla stoffa all'acciaio.

### Come ti feriscono

Quando vieni colpito perdi salute, vieni spinto indietro, resti stordito per 0,35 secondi e sei invulnerabile per 1 secondo.
Un colpo subito **interrompe** il tuo attacco in corso. Il rinculo **non ti spinge mai giù da un bordo**: se alle tue spalle c'è un abisso resti dove sei (subisci comunque il danno).

---

## 7. Nemici

Tutti i nemici, quando sei a portata, **preparano un attacco** (un breve gesto che puoi vedere) e poi colpiscono.
I nemici a terra non camminano nel vuoto, attraverso i muri, sugli spuntoni o nell'acqua. Il loro corpo è solido: non puoi entrarci dentro (se non schivando), e se gli stai addosso il loro colpo ti raggiunge comunque.

| Nemico | Salute | Danno | Velocità | Comportamento | Punti |
|---|---|---|---|---|---|
| **Scheletro Guerriero** | 40 | 10 | lenta (30) | **Pattuglia** una zona di 60 px per lato attorno al suo punto; se ti vede (80 px) ti affronta restando nella zona | 100 |
| **Goblin** | 25 | 8 | veloce (55) | **Insegue**: aspetta, poi ti corre incontro se entri nei 110 px; smette se ti allontani oltre 165 px | 75 |
| **Soldato Nemico** | 60 | 15 | lenta (25) | **Guardia**: sta fermo, si volta verso di te e **attacca solo se sei a portata** (24 px) | 150 |
| **Arciere Scheletro** | 30 | 10 (freccia) | lenta (30) | **Tira frecce** a chi è alla sua altezza fino a 130 px; se ti avvicini troppo **indietreggia** | 125 |
| **Pipistrello** | 15 | 8 | media (50) | **Vola**: ti segue restando sopra la tua testa e si lancia **in picchiata** verso il punto in cui eri | 80 |
| **Lupo** | 30 | 9 | molto veloce (70) | **Insegue**; a 34 px si acquatta e **balza** in avanti (non oltre il bordo di un abisso) | 100 |
| **Melma della Palude** | 36 | 8 | lentissima (18) | **Pattuglia**; quando muore **si divide in due melmine** (10 HP, veloci) | 60 (+25 per melmina) |
| **Golem di Ghiaccio** | 70 | 15 | lentissima (16) | **Pattuglia**; è **corazzato**: l'attacco leggero gli fa metà danno, quello **pesante (K)** il danno pieno; non vacilla e non arretra | 250 |
| **Predone** | 30 | 9 (accetta) | lenta (45) | **Lancia accette** rotanti fino a 110 px (si possono respingere con la spada); se ti avvicini troppo **indietreggia** | 130 |
| **Scorpione Gigante** | 45 | 10 | lenta (40) | **Insegue**; a 30 px alza la coda e **scatta** con il pungiglione; il carapace è **corazzato** (attacchi deboli a metà, quelli da 25 in su pieni) | 140 |
| **Avvoltoio** | 24 | 8 | media (55) | **Vola** più in alto del pipistrello e si getta **in picchiata** più veloce | 120 |

Dettagli utili per sconfiggerli:

| Nemico | Preparazione del colpo | Si può interrompere? |
|---|---|---|
| Scheletro | 0,4 s | **sì**, ma solo nei primi 0,15 s dell'attacco |
| Goblin | 0,2 s (molto rapido) | no: una volta iniziato, colpisce comunque |
| Soldato | 0,6 s | no: è "corazzato", subisce i danni ma completa l'attacco |
| Arciere | 0,6 s (tende l'arco) | **sì**: colpito mentre tende l'arco non scocca |
| Pipistrello | 0,35 s (sospeso a mezz'aria) | sì, durante la sospensione |
| Lupo | 0,35 s (si acquatta) | sì, durante l'acquattamento |
| Melma | 0,5 s | sì |
| Golem | 0,8 s (alza la mazza) | no |
| Predone | 0,5 s (porta l'accetta dietro la spalla) | **sì**: colpito in quel momento non lancia |
| Scorpione | 0,45 s (alza la coda) | sì, ma solo nei primi 0,2 s |
| Avvoltoio | 0,45 s (ali spalancate, occhi accesi) | sì, durante la sospensione |

Quando colpisci un nemico, **lampeggia di bianco**. Se è stordito dal colpo (scheletro) o sta per attaccare, ricordati che
la **schivata** è lo strumento più sicuro: scatta durante la preparazione del suo colpo e passa attraverso l'attacco.
La schivata passa anche attraverso le frecce e le magie. La spada **devia** (distrugge) frecce e dardi magici, ma **non le palle di fuoco**.

### Pericoli dei livelli

| Pericolo | Effetto | Come si affronta |
|---|---|---|
| **Spuntoni** | 12 danni e un rimbalzo all'indietro | saltali (sono larghi al massimo 36 px) |
| **Acqua** (vasche della palude) | sei più lento, cadi piano; premendo salto **nuoti** verso l'alto anche senza toccare il fondo | - |
| **Ghiaccio** | si scivola: si parte e ci si ferma con un certo ritardo | frena prima dei bordi e dei nemici |
| **Piattaforme mobili** | vanno avanti e indietro (o su e giù) e ti trasportano | portano agli oggetti più in alto |

---

## 8. I boss

Ogni boss aspetta in un'**arena** alla fine del suo livello: **quando ci entri un cancello si chiude alle tue spalle**. Il boss non esce
mai dall'arena: se si sveglia mentre sei ancora fuori, ti aspetta al cancello (e resta dentro quando il cancello si chiude). Nessun boss vacilla quando lo
colpisci (lampeggia soltanto). Prima di ogni attacco c'è una **preparazione** ben visibile: è il momento di schivare o di allontanarsi. La barra in basso
mostra la salute e una tacca per ogni cambio di fase.

Ogni boss sconfitto insegna la **prossima mossa** che ti manca, se ne manca una (vedi "Mosse speciali"). Anche contro i boss valgono le
**sinergie elementali** (vedi "Elementi ed effetti di stato").

### Il Cavaliere Nero (livello 3)

Aspetta nel fondo del dungeon. **Quando entri nell'arena un cancello si chiude alle tue spalle**: non si può tornare indietro finché
non lo sconfiggi.

| Dato | Valore |
|---|---|
| Salute | 290 |
| Si risveglia | quando ti avvicini a meno di 220 px (o se lo colpisci) |
| Stordimento | **non vacilla** quando lo colpisci: lampeggia soltanto |

**Attacchi**

| Attacco | Quando | Danno | Come riconoscerlo |
|---|---|---|---|
| **Fendente** | quando sei vicino | 20 | alza la spada per 0,6 s, poi colpisce davanti a sé (portata 34 px) |
| **Carica** | quando sei lontano (almeno 70 px) | 16 | si ferma per 0,7 s con la spada puntata, poi **scatta in avanti** per 0,6 s. Dopo la carica resta fermo e **vulnerabile** per 0,7 s |

**Fasi.** Quando la sua salute scende **sotto il 50%** il boss entra nella **seconda fase**: si muove più in fretta (×1,3), fa meno pause tra un
attacco e l'altro (×0,75) e carica più spesso. Sulla barra in basso compare una tacca a metà e la barra diventa arancione.

**Consigli**

- La carica è lo spunto migliore: schiva al momento dello scatto e colpiscilo mentre è fermo.
- Il fendente ha una lunga preparazione: schiva quando sta per calare, poi colpisci.
- Appena dentro l'arena, a terra, c'è una pozione.
- Sconfiggerlo vale 1000 punti.

### La Strega della Palude (livello 4)

300 HP, due fasi (sotto il 50% lancia più spesso). Vale 1200 punti.

| Attacco | Quando | Danno | Come riconoscerlo |
|---|---|---|---|
| **Maleficio** | quando sei ad almeno 40 px | 10 per dardo | alza il bastone che si illumina per 0,7 s, poi lancia **tre dardi magici a ventaglio** verso di te |
| **Covata** | se non ci sono già 2 melmine | - | alza il bastone per 0,8 s ed evoca **due melmine** ai suoi lati |
| **Bastonata** | quando sei vicino | 14 | porta indietro il bastone per 0,55 s, poi colpisce davanti a sé |

Consiglio: i dardi si deviano con la spada o si schivano; restare vicino la costringe alla bastonata, la più facile da evitare.

### Il Re dei Lupi (livello 5)

Un lupo enorme: 300 HP, due fasi. Vale 1400 punti.

| Attacco | Quando | Danno | Come riconoscerlo |
|---|---|---|---|
| **Balzo** | quando sei ad almeno 60 px | 18 | si acquatta per 0,65 s, poi scatta in avanti velocissimo; dopo resta fermo 0,7 s |
| **Branco** | se non ci sono già 2 lupi evocati | - | ulula per 0,9 s e chiama **due lupi** |
| **Morso** | quando sei vicino | 16 | si acquatta per 0,45 s, poi azzanna |

Consiglio: il balzo si schiva come la carica del Cavaliere Nero; quando ulula colpiscilo prima che arrivi il branco.

### Il Signore delle Lande (livello 6)

Il capo dei predoni, in armatura arrugginita con le corna d'osso: 320 HP, due fasi (sotto il 50% è più veloce e attacca più spesso).
Vale 1800 punti; lascia come trofeo la **balestra**. Debole al gelo, resiste al fuoco.

| Attacco | Quando | Danno | Come riconoscerlo |
|---|---|---|---|
| **Accette** | quando sei ad almeno 50 px | 11 per accetta | porta indietro il braccio per 0,65 s, poi lancia **tre accette a ventaglio** (la spada le respinge) |
| **Carica** | quando sei ad almeno 70 px | 18 | si abbassa per 0,65 s, poi carica; dopo resta fermo 0,65 s |
| **Predoni** | se non ce ne sono già 2 | - | alza la spada per 0,9 s e chiama **un predone** |
| **Fendente** | quando sei vicino | 20 | alza lo spadone per 0,55 s, poi colpisce davanti a sé |

Consiglio: stare vicino evita le accette; la carica si schiva come quella del Cavaliere Nero.

### Il Signore dell'Ombra (livello 7, boss finale)

340 HP, **tre fasi** (sotto il 66% evoca pipistrelli, sotto il 33% è più veloce e aggressivo). Vale 2500 punti.

| Attacco | Quando | Danno | Come riconoscerlo |
|---|---|---|---|
| **Lama d'ombra** | quando sei vicino | 20 | alza la spada viola per 0,6 s, poi colpisce davanti a sé (portata 36 px) |
| **Scatto d'ombra** | quando sei ad almeno 70 px | 16 | si piega per 0,7 s, poi scatta in avanti lasciando una scia |
| **Fuoco infernale** | quando sei ad almeno 50 px | 10 per palla | alza la spada che si infiamma per 0,75 s, poi lancia **tre palle di fuoco**: **non si deviano**, vanno schivate o saltate |
| **Ali della notte** (dalla seconda fase) | se non ci sono già 2 pipistrelli evocati | - | alza la spada per 0,9 s ed evoca due pipistrelli |

---

## 9. I livelli

| Livello | Ambientazione | Lunghezza | Nemici | Fine livello |
|---|---|---|---|---|
| **1 – Foresta Oscura** | foresta | 1536 px | 2 scheletri, 3 goblin, 2 soldati | raggiungere la porta |
| **2 – Castello Medievale** | castello | 1792 px | 2 scheletri, 3 goblin, 3 soldati | raggiungere la porta |
| **3 – Dungeon Sotterraneo** | dungeon | 1536 px | 4 scheletri, 2 goblin, 1 soldato + **Cavaliere Nero** | sconfiggere il boss |
| **4 – Palude Maledetta** | palude | 2048 px | 3 melme, 3 pipistrelli, 2 arcieri, 1 goblin, 1 scheletro + **Strega della Palude** | sconfiggere il boss |
| **5 – Picchi Ghiacciati** | montagna innevata | 2048 px | 3 lupi, 2 pipistrelli, 1 golem, 1 arciere, 1 goblin + **Re dei Lupi** | sconfiggere il boss |
| **6 – Lande Desolate** | lande al tramonto | 2048 px | 2 predoni, 3 scorpioni, 1 avvoltoio, 1 goblin d'élite, 1 lupo + **Signore delle Lande** | sconfiggere il boss |
| **7 – Torre dell'Ombra** | torre | 2304 px | 2 soldati, 2 arcieri, 2 pipistrelli, 1 golem, 1 melma, 1 scheletro, 1 lupo + **Signore dell'Ombra** | sconfiggere il boss |

Ogni livello ha **abissi**, **piattaforme sospese** (si attraversano dal basso e ci si sale sopra), blocchi di pietra e oggetti da raccogliere.
I livelli 4-7 hanno anche **pericoli** (vasche d'acqua, ghiaccio, spuntoni) e **piattaforme mobili**. La telecamera segue il cavaliere.
Dopo il Signore dell'Ombra compare la schermata di vittoria.

A inizio livello compare il nome; a fine livello un riquadro mostra bonus, personaggi sbloccati, salute recuperata, l'eventuale mossa insegnata dal boss e il suo trofeo.
Alcuni livelli hanno **forzieri** e **nemici d'élite** con un'arma (vedi "Le armi").

---

## 10. Oggetti

Si raccolgono semplicemente toccandoli, tranne la **pozione**, che si prende con **E** e va nella borsa. Alcuni sono su piattaforme sospese: bisogna saltare.

| Oggetto | Aspetto | Effetto |
|---|---|---|
| **Pozione** | boccetta rossa | si prende con **E** e va nella borsa; bevuta (tasto del suo posto) dà **+30 HP** (non oltre il massimo) |
| **Pozione di mana** | boccetta blu | solo per chi ha mana: si prende con **E** e va nella borsa (un posto a parte, al massimo 2); bevuta dà **+40 mana**. La lasciano forzieri (sempre), nemici d'élite (una volta su due) e boss (sempre); per le classi senza mana non compare |
| **Moneta** | disco giallo | **+50 punti** e **10 monete** da spendere nella bottega |
| **Gemma** | cristallo azzurro | **+200 punti** e **30 monete** (almeno 1 per livello, 2 nella torre) |
| **Faretra** | astuccio di cuoio con due frecce | munizioni piene per tutte le armi della borsa che ne hanno (arco, balestra, coltelli, giavellotto); una per livello, prima dell'arena; se non serve resta a terra |

Quando raccogli un oggetto compare una scritta con il bonus (per esempio "+30 HP").

### Power-up

Oggetti speciali che danno un potere per qualche secondo (e 25 punti). Mentre sono attivi il cavaliere è circondato da un **alone** del loro colore
e sotto la barra in alto compare l'icona con il tempo che resta; negli ultimi 2 secondi l'alone lampeggia. Si possono avere più power-up insieme;
raccogliere di nuovo lo stesso ne fa ripartire il tempo. **Si perdono** cambiando livello o perdendo una vita.

| Power-up | Aspetto | Effetto | Durata |
|---|---|---|---|
| **Furia** | runa rossa su pietra | danno degli attacchi ×1,5 | 12 s |
| **Velocità** | stivali alati | movimento ×1,4 | 12 s |
| **Scudo** | scudo blu con croce d'oro | danni subiti dimezzati (almeno 1) | 15 s |
| **Fuoco** | fiamma | +8 danni a ogni colpo e **bruciatura**; la spada diventa incandescente | 12 s |
| **Rigenerazione** | foglia verde | +4 HP al secondo | 10 s |
| **Veleno** | fiala verde | i colpi **avvelenano** | 15 s |
| **Gelo** | cristallo di ghiaccio | i colpi **rallentano** | 15 s |
| **Fulmine** | runa con un fulmine | i colpi danno lo **shock** | 15 s |

Si trovano lungo i livelli (alcuni su piattaforme in alto), **mai subito prima di un boss**: aiutano contro i nemici, il boss resta la prova finale.
Furia e Fuoco si sommano: (15 + 8) × 1,5 = 35 danni con l'attacco leggero.

### Elementi ed effetti di stato

Con Fuoco, Veleno, Gelo o Fulmine attivi, ogni colpo (spada e altre armi, frecce e altri proiettili, mosse) lascia sul bersaglio un
**effetto di stato**. Il nemico si circonda di un alone del colore dell'elemento e sopra la sua barra della salute compare un quadratino
colorato; il danno nel tempo appare come numeri colorati. Con più power-up insieme i colpi lasciano tutti gli effetti.
Molte mosse e alcune armi hanno un elemento proprio, anche senza power-up.

| Effetto | Elemento | Cosa fa | Durata |
|---|---|---|---|
| **Bruciatura** | Fuoco | 2 danni ogni 0,5 s | 2 s |
| **Veleno** | Veleno | 3 danni al secondo | 4 s |
| **Gelo** | Gelo | il nemico si muove a **metà velocità** (anche il boss) | 3 s |
| **Shock** | Fulmine | **stordisce** per 0,5 s, anche chi sta già attaccando; poi per 2 s non si può stordire di nuovo. I boss non si stordiscono: lo shock li ferisce subito (6 danni) | – |

- Il danno nel tempo **può uccidere**, anche un boss: vale come un tuo colpo (punti, monete, oggetti lasciati, mosse del boss e mana del Mago).
- Colpire di nuovo fa ripartire la durata.

**Sinergie.** Un colpo su un bersaglio che ha **già** un effetto può innescare una sinergia: fa **+50% di danno** e **consuma** l'effetto.
Sopra il bersaglio compare il nome, con scintille.

| Sinergia | Effetto già presente | Colpo che la innesca | Scritta |
|---|---|---|---|
| **Frantumare** | Gelo | un colpo che **rompe la guardia** o **schiaccia le corazze** (arma, mossa o modificatore) | "FRANTUMATO!" |
| **Shock termico** | Gelo | un colpo di **fuoco** | "SHOCK TERMICO!" |
| **Sovraccarico** | Bruciatura | un colpo di **fulmine** | "SOVRACCARICO!" |
| **Detonazione** | Veleno | un colpo di **fuoco** | "DETONAZIONE!" |

- Un colpo che porta **lo stesso elemento** dell'effetto non lo innesca (per esempio un colpo di gelo e che rompe la guardia non frantuma).
- Scatta al massimo **una** sinergia per colpo: la prima della tabella che vale.
- L'effetto si consuma, poi il colpo applica i suoi elementi.
- Chi è immune all'elemento che innesca non subisce la sinergia.
- Il +50% vale sul danno del colpo, non sui 6 danni immediati dello shock ai boss. Il danno nel tempo non innesca niente.
- **Resistenze e debolezze**: ogni nemico reagisce in modo diverso (tabella sotto). *Immune* = l'effetto non si applica;
  *debole* = danno nel tempo, rallentamento o stordimento più forti (×1,5 o ×2); *resiste* = più deboli (×0,5).

| Nemico | Debole a | Resiste a | Immune a |
|---|---|---|---|
| Scheletro, Arciere Scheletro | fuoco | – | veleno |
| Goblin | veleno | – | – |
| Soldato | fulmine | veleno | – |
| Pipistrello | fulmine, gelo | – | – |
| Lupo | fuoco | gelo | – |
| Melma, Melmina | gelo | – | veleno |
| Golem di Ghiaccio | fuoco (×2) | fulmine | gelo, veleno |
| Cavaliere Nero | fulmine | veleno | – |
| Strega della Palude | fuoco | – | veleno |
| Re dei Lupi | fuoco | gelo | – |
| Signore dell'Ombra | – | tutti | – |

### Difficoltà

| Difficoltà | Salute dei nemici e dei boss | Danno dei nemici e dei boss | Vite |
|---|---|---|---|
| Facile | ×0,75 | ×0,75 | 5 |
| Normale | ×1 | ×1 | 3 |
| Difficile | ×1,5 | ×1,25 | 2 |

La difficoltà scelta e i livelli raggiunti vengono **ricordati dal browser** (come il record).

---

## 11. Punteggio

| Azione | Punti |
|---|---|
| Scheletro / Goblin / Soldato | 100 / 75 / 150 |
| Arciere / Pipistrello / Lupo | 125 / 80 / 100 |
| Melma / Melmina / Golem | 60 / 25 / 250 |
| Cavaliere Nero / Strega / Re dei Lupi / Signore dell'Ombra | 1000 / 1200 / 1400 / 2500 |
| Moneta | 50 |
| Gemma | 200 |
| Power-up | 25 |
| Livello completato | 500 |

Il punteggio massimo teorico (tutto raccolto, tutti i nemici del livello sconfitti, senza contare quelli evocati dai boss) è
**17100** punti: 5975 nei primi tre livelli e 11125 negli altri tre (power-up compresi, 25 punti l'uno). Anche i nemici evocati dai boss danno punti.
Se perdi una vita, il punteggio torna al valore che avevi all'inizio di quel livello.

## 11b. Monete, bottega, gemme e sblocchi

**Monete** (in alto a destra). Valgono solo per la partita in corso e si spendono nella **bottega**:

| Fonte | Monete |
|---|---|
| Moneta raccolta | 10 (oltre ai 50 punti) |
| Gemma raccolta | 30 (oltre ai 200 punti) |
| Nemico sconfitto | 2 (élite 6) |
| Boss sconfitto | 50 |

Se perdi una vita tornano quelle che avevi all'inizio del livello; ogni nuova partita parte da zero.

**Bottega.** Dopo il riquadro di fine livello (tranne l'ultimo) si entra nella **bottega del mercante**, una stanza in cui si cammina:
niente nemici. Ogni voce sta su un **piedistallo** con il suo prezzo sopra (rosso se le monete non bastano); avvicinati e premi **E**
per comprarla. Per andare avanti esci dalla **porta in fondo** a destra. Sul cammino c'è anche l'**altare degli attributi** (vedi "Attributi"): **E** vicino per spendere i punti guadagnati. Il messaggio della bottega ricorda l'altare e i punti da spendere.

| Voce | Prezzo | Effetto |
|---|---|---|
| Pozione | 40 | una pozione nella borsa (se c'è posto) |
| Cura | 25 | +40 HP subito (non a salute piena) |
| Faretra | 20 | munizioni piene per tutte le armi della borsa (se ne mancano); non c'è per chi ha mana |
| Pozione di mana | 35 | una pozione di mana nella borsa (se c'è posto); solo per chi ha mana, al posto della faretra |
| Un'arma | 60 × rarità | una delle armi **trovate in questa partita** (la spada e l'arma iniziale contano sempre) che non hai nella borsa, scelta a caso, con una rarità; va nella borsa o, se è piena, nello zaino; si compra una volta sola |
| Un'armatura | 45 × rarità | un pezzo d'armatura con una rarità: lo indossi (posto libero) o va nello zaino; si compra una volta sola |

Il prezzo di arma e armatura cresce con la rarità (Non comune ×1,5 ... Leggendario ×5) e **sale del 25% dopo ogni acquisto di
equipaggiamento** nella stessa visita. L'offerta cambia a ogni visita e, avanzando, le rarità sono più alte. **Non si rivende niente.**
Nelle offerte di arma, la riga sotto il nome mostra i bonus e malus della tua classe al posto della descrizione (nella bottega camminabile compare sopra il nome dell'offerta che stai toccando). Le armi vietate non vengono mai messe in vendita. Con la borsa piena un'arma da lancio comprata va nello zaino con le sue munizioni.
Il Mago trova in vendita un **bastone**, che prende il posto del suo (il vecchio va nello zaino); un bastone identico a quello che ha già non viene messo in vendita. Un acquisto che non serve non toglie monete ("NON SERVE", "BORSA PIENA").

**Sblocchi.** All'inizio si gioca solo il **Cavaliere**. Il **Ranger** si sblocca completando il livello 2, il **Berserker** sconfiggendo il
Cavaliere Nero (livello 3), il **Mago** sconfiggendo la Strega della Palude (livello 4), il **Paladino** sconfiggendo il Re dei Lupi (livello 5); nella scelta del personaggio quelli bloccati sono
sagome con il lucchetto e l'obiettivo. Gli sblocchi dipendono dal livello più avanzato raggiunto.

**Cosa resta tra una partita e l'altra.** Il browser ricorda solo:

| Resta | Riparte da zero |
|---|---|
| livelli raggiunti (e i personaggi sbloccati) | armi (si riparte con quella iniziale) e armi trovate |
| record | armature e zaino |
| difficoltà | pozioni |
| personaggio scelto | monete e punteggio |
|  | punti attributo (spesi e da spendere) |
|  | mosse imparate (si riparte con due) |

Chi aveva un salvataggio della versione 2.0 tiene livelli raggiunti, difficoltà e personaggio; il resto del vecchio salvataggio viene
cancellato al primo avvio. Il record è salvato a parte e resta. *Cancella dati* azzera tutto, record e sblocchi compresi.

**Record.** Il tuo miglior punteggio viene salvato **nel browser** (non su un server). Compare nella schermata del titolo, nel
Game Over e nella vittoria, con la scritta lampeggiante **NUOVO RECORD!** quando lo batti. Il record appartiene al browser e alla
posizione da cui apri il gioco: cambiando browser o cartella ripartirà da zero.

---

## 12. Consigli

1. **Schiva, non solo attacca.** J a ripetizione funziona contro lo scheletro, ma goblin e soldati completano il loro attacco anche se li colpisci.
2. **Impara le preparazioni.** Ogni nemico alza l'arma prima di colpire: quello è il momento di schivare.
3. **Non farti circondare.** Un Goblin alla volta è facile; tre insieme no.
4. **Usa le piattaforme sospese** per raccogliere monete e gemme: i nemici non salgono e non ti colpiscono se sei a un'altra altezza.
5. **Occhio agli abissi:** il salto si può accorciare rilasciando il tasto, ma anche allungare tenendolo premuto fino all'apice.
6. **Conserva le pozioni.** Si prendono con **E** e restano nella borsa (massimo 2): bevile quando servono, per esempio contro un boss.
7. **Contro il boss** concentrati sulla carica: è l'unico momento in cui resta fermo e scoperto.
8. **Combina le mosse.** Prima lascia un effetto (gelo, bruciatura, veleno), poi colpisci con ciò che lo innesca: la sinergia fa +50% di danno.
