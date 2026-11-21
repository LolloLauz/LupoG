# IRON & SHADOW – Manuale di gioco

*Medieval Action Arcade in pixel art a 16 bit.* Versione 2.0.0-alpha.3.

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

Tu sei il **Cavaliere di Ferro**: armato solo della tua spada, attraversi tre luoghi maledetti per sconfiggere
il Cavaliere Nero e liberare il regno. La storia è tutta qui: nessun dialogo ti rallenta, l'azione viene prima di tutto.

## 3. Ambientazione

Un mondo medievale fantastico, visto di lato (scorrimento orizzontale), con tre ambientazioni:

| Ambientazione | Atmosfera |
|---|---|
| **Foresta Oscura** | notte con la luna piena e le stelle che brillano, montagne innevate, foschia, colline e tre file di pini; prato e terra con sassi, ponticelli di legno |
| **Castello Medievale** | cielo stellato, castelli lontani con le finestre accese, mura merlate con l'edera, colonne con stendardi rossi e corona d'oro; pavimento di pietra |
| **Dungeon Sotterraneo** | mura di mattoni con muschio e crepe, celle con sbarre, torce che illuminano il muro, catene, foschia viola; pavimento di mattoni viola |

I personaggi sono più grandi e dettagliati della versione 1.0 (grafica a 16 bit), ma le **hitbox sono le stesse**: pennacchio, corna, mantelli
e armi sporgono solo per bellezza. Il cavaliere viene colpito sul corpo, non sul pennacchio.

---

## 4. Controlli

| Azione | Tasti |
|---|---|
| Muoversi | **A** / **D** oppure **←** / **→** |
| Saltare | **W** oppure **↑** (tieni premuto per saltare più in alto; rilascia per un salto più corto) |
| Attacco leggero | **Spazio** |
| Attacco pesante | **J** |
| Schivata | **K** |
| Pausa / riprendi | **Esc** |
| Menu: scegliere | **W** / **S** oppure **↑** / **↓** |
| Menu: confermare | **Invio** |

Durante la pausa e nei menu i comandi di gioco (salto, attacco...) sono bloccati. Se la finestra del browser perde il focus il gioco va
in pausa da solo.

I tasti si possono cambiare in `src/config/controlsConfig.ts`.

### Dimensione della finestra

Il gioco ha una risoluzione interna di 320×240 pixel e viene ingrandito **solo di multipli interi** (2×, 3×, 4×...), il massimo che entra nella finestra, così i pixel restano nitidi.
Per averlo più grande usa il **pieno schermo del browser (F11)**. Funziona anche con la scala dello schermo di Windows (125%, 150%...). Se la finestra è più piccola del gioco (sotto 320×240 pixel fisici) il gioco viene tagliato.

---

## 5. Come si gioca

**Obiettivo:** completare i tre livelli e sconfiggere il boss con le vite a disposizione.

- Hai **3 vite**. Se la salute arriva a 0 perdi una vita e **ricominci il livello** da capo (con nemici e oggetti ripristinati, e con
  il punteggio e le gemme che avevi all'inizio di quel livello). Finite le vite: **Game Over**.
- La salute **non si rigenera**: si recupera con le **pozioni** e con la **cura di fine livello** (+30 HP, tranne dopo il boss).
- La salute si porta da un livello all'altro. Quando ricominci un livello dopo una morte riparti con la salute piena.
- Nei livelli 1 e 2 si finisce **raggiungendo la porta** in fondo. Nel livello 3 si finisce **sconfiggendo il boss**.
- Cadere in un **abisso** costa **15 HP** e ti riporta all'ultimo punto sicuro (se muori cadendo, perdi una vita).
- Dopo aver subito un colpo sei **invulnerabile per 1 secondo** (il cavaliere lampeggia).
- Toccare un nemico non fa danno: **si viene feriti solo dai loro attacchi** (e cadendo negli abissi).

### Schermate

| Schermata | Cosa mostra |
|---|---|
| **Titolo** | logo, record, menu *Nuova partita* e *Controlli* |
| **Controlli** | l'elenco dei tasti |
| **Gioco** | il livello con la barra in alto (HUD) |
| **Pausa** | menu *Riprendi* e *Esci al titolo* (lo schermo si oscura con un retino di pixel) |
| **Game Over** | punti, gemme, record; *Riprova* (nuova partita dal livello 1) o *Torna al titolo* |
| **Vittoria** | storia conclusiva, punti, gemme, record |

### L'HUD (la barra in alto)

| Elemento | Significato |
|---|---|
| cuore + 10 segmenti rossi | salute; lampeggia sotto il 30% |
| icona dell'elmo **x3** | vite rimaste |
| **LIVELLO n** | livello corrente |
| numero dorato a 6 cifre | punteggio |
| gemma blu **xn** | gemme raccolte |
| teschio e barra in basso (solo contro il boss) | salute del boss, con una tacca dove cambia fase; diventa arancione nella seconda fase |

---

## 6. Il combattimento

Il cavaliere ha una sola arma: la **spada**.

### Attacchi

| Attacco | Tasto | Danno | Durata | Note |
|---|---|---|---|---|
| Fendente 1 | Spazio | 15 | 250 ms | colpisce tra 80 e 170 ms |
| Fendente 2 | Spazio | 15 | 250 ms | colpisce tra 80 e 170 ms |
| Fendente 3 (finale) | Spazio | 30 | 350 ms | colpisce tra 120 e 250 ms; 400 ms di pausa dopo |
| Attacco pesante | J | 30 | 500 ms | colpisce tra 220 e 360 ms; area più grande; 500 ms di pausa dopo |

### Combo

| Combo | Sequenza | Colpi | Danno totale |
|---|---|---|---|
| **Triplo fendente** | Spazio → Spazio → Spazio | fendente 1, 2, 3 | 15 + 15 + 30 = **60** |

Per concatenare la combo premi il tasto successivo **entro 0,4 secondi dalla fine del colpo precedente**: se aspetti troppo,
la sequenza riparte dal primo colpo. Se premi il tasto negli **ultimi 0,2 secondi** prima che l'attacco successivo possa partire, il colpo viene **memorizzato** e parte appena possibile: non serve premere con precisione al millisecondo. Un tasto premuto molto prima viene invece **ignorato**, e quando smetti di premere il cavaliere si ferma (al massimo parte un ultimo attacco, entro 0,2 secondi dall'ultima pressione).

### Regole degli attacchi

- A **terra**, mentre attacchi non puoi muoverti, saltare o girarti: l'attacco ti impegna fino alla fine.
- In **aria** puoi attaccare e continuare a controllare il movimento.
- Ogni attacco **colpisce ogni nemico una sola volta**.
- L'area colpita è davanti a te; si specchia se guardi a sinistra.

### La schivata (K)

- Uno **scatto di circa 48 px** nella direzione in cui guardi, della durata di 0,3 secondi.
- Durante la schivata sei **invulnerabile**: puoi attraversare gli attacchi dei nemici.
- Dopo la schivata devi aspettare 0,7 secondi.
- Si può fare solo **a terra** e non mentre stai attaccando.

### Come ti feriscono

Quando vieni colpito perdi salute, vieni spinto indietro, resti stordito per 0,35 secondi e sei invulnerabile per 1 secondo.
Un colpo subito **interrompe** il tuo attacco in corso. Il rinculo **non ti spinge mai giù da un bordo**: se alle tue spalle c'è un abisso resti dove sei (subisci comunque il danno).

---

## 7. Nemici

I nemici hanno tre comportamenti diversi. Tutti, quando sei a portata, **preparano un attacco** (un breve gesto che puoi vedere) e poi colpiscono.
I nemici non camminano nel vuoto né attraverso i muri.

| Nemico | Salute | Danno | Velocità | Comportamento | Punti |
|---|---|---|---|---|---|
| **Scheletro Guerriero** | 40 | 10 | lenta (30) | **Pattuglia** una zona di 60 px per lato attorno al suo punto; se ti vede (80 px) ti affronta restando nella zona | 100 |
| **Goblin** | 25 | 8 | veloce (55) | **Insegue**: aspetta, poi ti corre incontro se entri nei 110 px; smette se ti allontani oltre 165 px | 75 |
| **Soldato Nemico** | 60 | 15 | lenta (25) | **Guardia**: sta fermo, si volta verso di te e **attacca solo se sei a portata** (24 px) | 150 |

Dettagli utili per sconfiggerli:

| Nemico | Preparazione del colpo | Si può interrompere? |
|---|---|---|
| Scheletro | 0,4 s | **sì**, ma solo nei primi 0,15 s dell'attacco |
| Goblin | 0,2 s (molto rapido) | no: una volta iniziato, colpisce comunque |
| Soldato | 0,6 s | no: è "corazzato", subisce i danni ma completa l'attacco |

Quando colpisci un nemico, **lampeggia di bianco**. Se è stordito dal colpo (scheletro) o sta per attaccare, ricordati che
la **schivata** è lo strumento più sicuro: scatta durante la preparazione del suo colpo e passa attraverso l'attacco.

---

### In arrivo nella versione 2.0

Il codice contiene già nuovi nemici e pericoli, che compariranno nei livelli nuovi (Palude Maledetta, Picchi Ghiacciati, Torre dell'Ombra):

| Novità | Come si comporta | Come si affronta |
|---|---|---|
| **Arciere Scheletro** (30 HP, freccia da 10) | tira frecce a chi è alla sua altezza fino a 130 px; se ti avvicini troppo indietreggia | colpiscilo mentre tende l'arco (annulla il tiro); la spada devia le frecce; la schivata ci passa attraverso |
| **Pipistrello** (15 HP, picchiata da 8) | vola, ti segue restando sopra la testa e si lancia in picchiata | durante la breve pausa prima della picchiata spostati: punta dove eri |
| **Spuntoni** | 12 danni e un rimbalzo all'indietro | saltali |
| **Acqua** | sei più lento, cadi piano, puoi risalire premendo salto anche senza toccare il fondo | - |
| **Ghiaccio** | si scivola: si parte e ci si ferma con un certo ritardo | frena prima dei bordi |
| **Piattaforme mobili** | vanno avanti e indietro (o su e giù) e ti trasportano | - |
| **Palle di fuoco** | non si possono deviare con la spada | schivale o saltale |

## 8. Il boss: il Cavaliere Nero

Aspetta nel fondo del dungeon (livello 3). **Quando entri nell'arena un cancello si chiude alle tue spalle**: non si può tornare indietro finché
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

---

## 9. I livelli

| Livello | Ambientazione | Lunghezza | Nemici | Fine livello |
|---|---|---|---|---|
| **1 – Foresta Oscura** | foresta | 1536 px | 2 scheletri, 3 goblin, 2 soldati | raggiungere la porta |
| **2 – Castello Medievale** | castello | 1792 px | 2 scheletri, 3 goblin, 3 soldati | raggiungere la porta |
| **3 – Dungeon Sotterraneo** | dungeon | 1536 px | 4 scheletri, 2 goblin, 1 soldato + **boss** | sconfiggere il boss |

Ogni livello ha **abissi** (livelli 1 e 2: tre; livello 3: due), **piattaforme sospese** (si attraversano dal basso e ci si sale sopra), blocchi di pietra, e
oggetti da raccogliere. La telecamera segue il cavaliere.

A inizio livello compare il nome; a fine livello un riquadro mostra bonus, gemme e salute recuperata.

---

## 10. Oggetti

Si raccolgono semplicemente toccandoli. Alcuni sono su piattaforme sospese: bisogna saltare.

| Oggetto | Aspetto | Effetto |
|---|---|---|
| **Pozione** | boccetta rossa | **+30 HP** (non oltre il massimo) |
| **Moneta** | disco giallo | **+50 punti** |
| **Gemma** | cristallo azzurro | **+200 punti** e conta come *gemma* (1 per livello) |

Quando raccogli un oggetto compare una scritta con il bonus (per esempio "+30 HP").

---

## 11. Punteggio

| Azione | Punti |
|---|---|
| Scheletro / Goblin / Soldato | 100 / 75 / 150 |
| Cavaliere Nero | 1000 |
| Moneta | 50 |
| Gemma | 200 |
| Livello completato | 500 |

Il punteggio massimo teorico (tutto raccolto, tutti i nemici sconfitti) è **5900** punti.
Se perdi una vita, il punteggio torna al valore che avevi all'inizio di quel livello.

**Record.** Il tuo miglior punteggio viene salvato **nel browser** (non su un server). Compare nella schermata del titolo, nel
Game Over e nella vittoria, con la scritta lampeggiante **NUOVO RECORD!** quando lo batti. Il record appartiene al browser e alla
posizione da cui apri il gioco: cambiando browser o cartella ripartirà da zero.

---

## 12. Consigli

1. **Schiva, non solo attacca.** Spazio a ripetizione funziona contro lo scheletro, ma goblin e soldati completano il loro attacco anche se li colpisci.
2. **Impara le preparazioni.** Ogni nemico alza l'arma prima di colpire: quello è il momento di schivare.
3. **Non farti circondare.** Un Goblin alla volta è facile; tre insieme no.
4. **Usa le piattaforme sospese** per raccogliere monete e gemme: i nemici non salgono e non ti colpiscono se sei a un'altra altezza.
5. **Occhio agli abissi:** il salto si può accorciare rilasciando il tasto, ma anche allungare tenendolo premuto fino all'apice.
6. **Le pozioni si raccolgono toccandole, anche a salute piena** (e allora si sprecano). Se sei in forma, salta sopra e torna a prenderle quando ti servono, finché non cambi livello.
7. **Contro il boss** concentrati sulla carica: è l'unico momento in cui resta fermo e scoperto.
