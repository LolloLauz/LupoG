# IRON & SHADOW – Manuale di gioco

*Medieval Action Arcade in pixel art a 16 bit.* Versione 2.0.0-alpha.5.

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
Per raggiungerlo dovrai attraversare la Palude Maledetta della **Strega**, i Picchi Ghiacciati del **Re dei Lupi** e infine la
**Torre dell'Ombra**. La storia è tutta qui: nessun dialogo ti rallenta, l'azione viene prima di tutto.

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
| **Titolo** | logo, record, menu *Nuova partita*, *Scegli livello*, *Difficoltà* (Invio la cambia: Facile → Normale → Difficile) e *Controlli* |
| **Scegli livello** | i sei livelli: quelli già raggiunti si possono giocare (partita nuova da quel livello), gli altri sono chiusi da un lucchetto; W/S per scegliere, Invio per giocare, Esc per tornare |
| **Controlli** | l'elenco dei tasti |
| **Gioco** | il livello con la barra in alto (HUD) |
| **Pausa** | menu *Riprendi* e *Esci al titolo* (lo schermo si oscura con un retino di pixel) |
| **Game Over** | punti, gemme, record; *Riprova* (nuova partita dal livello 1) o *Torna al titolo* |
| **Vittoria** | storia conclusiva, punti, gemme, record |

### L'HUD (la barra in alto)

| Elemento | Significato |
|---|---|
| cuore + 10 segmenti rossi | salute; lampeggia sotto il 30% |
| icone sotto la barra | power-up attivi, ognuno con la barra del tempo che resta (lampeggia quando sta per finire) |
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

Tutti i nemici, quando sei a portata, **preparano un attacco** (un breve gesto che puoi vedere) e poi colpiscono.
I nemici a terra non camminano nel vuoto, attraverso i muri, sugli spuntoni o nell'acqua.

| Nemico | Salute | Danno | Velocità | Comportamento | Punti |
|---|---|---|---|---|---|
| **Scheletro Guerriero** | 40 | 10 | lenta (30) | **Pattuglia** una zona di 60 px per lato attorno al suo punto; se ti vede (80 px) ti affronta restando nella zona | 100 |
| **Goblin** | 25 | 8 | veloce (55) | **Insegue**: aspetta, poi ti corre incontro se entri nei 110 px; smette se ti allontani oltre 165 px | 75 |
| **Soldato Nemico** | 60 | 15 | lenta (25) | **Guardia**: sta fermo, si volta verso di te e **attacca solo se sei a portata** (24 px) | 150 |
| **Arciere Scheletro** | 30 | 10 (freccia) | lenta (30) | **Tira frecce** a chi è alla sua altezza fino a 130 px; se ti avvicini troppo **indietreggia** | 125 |
| **Pipistrello** | 15 | 8 | media (50) | **Vola**: ti segue restando sopra la tua testa e si lancia **in picchiata** verso il punto in cui eri | 80 |
| **Lupo** | 30 | 9 | molto veloce (70) | **Insegue**; a 34 px si acquatta e **balza** in avanti (non oltre il bordo di un abisso) | 100 |
| **Melma della Palude** | 36 | 8 | lentissima (18) | **Pattuglia**; quando muore **si divide in due melmine** (10 HP, veloci) | 60 (+25 per melmina) |
| **Golem di Ghiaccio** | 70 | 15 | lentissima (16) | **Pattuglia**; è **corazzato**: l'attacco leggero gli fa metà danno, quello **pesante (J)** il danno pieno; non vacilla e non arretra | 250 |

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

Ogni boss aspetta in un'**arena** alla fine del suo livello: **quando ci entri un cancello si chiude alle tue spalle**. Nessun boss vacilla quando lo
colpisci (lampeggia soltanto). Prima di ogni attacco c'è una **preparazione** ben visibile: è il momento di schivare o di allontanarsi. La barra in basso
mostra la salute e una tacca per ogni cambio di fase.

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

### Il Signore dell'Ombra (livello 6, boss finale)

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
| **6 – Torre dell'Ombra** | torre | 2304 px | 2 soldati, 2 arcieri, 2 pipistrelli, 1 golem, 1 melma, 1 scheletro, 1 lupo + **Signore dell'Ombra** | sconfiggere il boss |

Ogni livello ha **abissi**, **piattaforme sospese** (si attraversano dal basso e ci si sale sopra), blocchi di pietra e oggetti da raccogliere.
I livelli 4-6 hanno anche **pericoli** (vasche d'acqua, ghiaccio, spuntoni) e **piattaforme mobili**. La telecamera segue il cavaliere.
Dopo il Signore dell'Ombra compare la schermata di vittoria.

A inizio livello compare il nome; a fine livello un riquadro mostra bonus, gemme e salute recuperata.

---

## 10. Oggetti

Si raccolgono semplicemente toccandoli. Alcuni sono su piattaforme sospese: bisogna saltare.

| Oggetto | Aspetto | Effetto |
|---|---|---|
| **Pozione** | boccetta rossa | **+30 HP** (non oltre il massimo) |
| **Moneta** | disco giallo | **+50 punti** |
| **Gemma** | cristallo azzurro | **+200 punti** e conta come *gemma* (almeno 1 per livello, 2 nella torre) |

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
| **Fuoco** | fiamma | +8 danni a ogni colpo; la spada diventa incandescente | 12 s |
| **Rigenerazione** | foglia verde | +4 HP al secondo | 10 s |

Si trovano lungo i livelli (alcuni su piattaforme in alto), **mai subito prima di un boss**: aiutano contro i nemici, il boss resta la prova finale.
Furia e Fuoco si sommano: (15 + 8) × 1,5 = 35 danni con l'attacco leggero.

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
