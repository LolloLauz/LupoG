# Bilanciamento

Questo documento spiega come sono stati scelti i valori di difficoltà e come
verificarli dopo una modifica. Tutti i valori si cambiano in `src/config/`.

## Come si misura: `npm run balance`

`tools/balance.mjs` fa giocare un **bot** nel gioco reale (stesse classi del gioco, senza grafica)
e stampa duelli, boss, livelli e partite complete. Con `npm run balance -- --quick` è più rapido
ma meno preciso. Le sezioni si possono lanciare da sole: `--characters`, `--mage`, `--equipment` e, dalla Classi Fase 4, `--build`.

Due profili di bot:

- **rusher**: avvicina il nemico e attacca sempre, senza mai schivare.
- **medio**: ogni tanto decide di schivare un attacco.

**Limiti, da sapere:** il bot è semplice. Non gioca come una persona (non sfrutta le piattaforme
sospese, non sceglie quando indietreggiare, schiva in modo grezzo). I numeri indicano la
**direzione** di una modifica (più facile / più difficile) e permettono di scoprire valori
sbilanciati, ma non sostituiscono una prova con giocatori reali.

## Cosa è stato cambiato in Fase 8 e perché

Misure iniziali (valori della 0.7.0) con il rusher:

| Situazione | Risultato iniziale | Problema |
|---|---|---|
| Goblin e Soldato in duello | 0 HP persi | ogni colpo del giocatore interrompeva il loro attacco: non colpivano mai |
| Livello 2 | 0 HP persi con 8 nemici | stesso motivo |
| Partita completa (3 vite) | 33% vinte, morte quasi sempre nel livello 3 | boss troppo duro e salute non recuperata tra i livelli |

Modifiche:

1. **`attackInterruptWindowMs`** (per nemico): un colpo subito interrompe l'attacco solo nei primi ms
   della preparazione. Scheletro 150 ms (fragile), Goblin e Soldato 0 (non interrompibili: subiscono
   il danno ma completano l'attacco). Così non basta più "spammare" l'attacco: bisogna schivare o
   accettare lo scambio di colpi.
2. **Goblin: `attackRange` 14 → 18**: prima il giocatore (portata ~16 px) colpiva sempre per primo.
3. **Cura a fine livello** `levelCompleteHeal: 30` (non nell'ultimo livello).
4. **Boss**: salute 300 → 290, fendente 25 → 20, carica 20 → 16, pausa tra gli attacchi 1200 → 1500 ms,
   fase 2 con pausa x0,75 (prima x0,7).
5. Danni dei nemici normali **invariati** (scheletro 10, goblin 8, soldato 15): variarli non cambiava
   l'esito dei bot, quindi non c'era evidenza per toccarli.

## Piano espansioni: armi, nemici d'élite, corpi solidi, borsa (non ancora rilasciata)

> **Correzione.** Una prima misura dopo la Fase 1 dava 68% / 27%, ma era sbagliata: `tools/balance.mjs` non creava i nemici d'élite e non aveva
> i corpi solidi. Ora lo strumento fa come il gioco: nemici d'élite, corpi solidi (`separateHorizontally`) e borsa (il bot raccoglie le
> pozioni e ne beve una quando ha perso almeno 30 HP).

Partite complete vinte (`npm run balance`, bot che usa solo la spada):

| Situazione | bot medio | rusher |
|---|---|---|
| 2.0.0 (prima delle espansioni) | circa 75% | circa 32% |
| élite + corpi solidi, pozioni che curano al tocco | 48% | 7% |
| ... con la borsa, al massimo 1 pozione | 73% | 90% |
| ... con la borsa, al massimo **2 pozioni (scelta attuale)** | **88%** | **93%** |
| ... con la borsa, al massimo 3 pozioni | 90% | 98% |

Nemici d'élite e corpi solidi rendono il gioco molto più difficile (soprattutto livelli 3 e 6). La borsa lo rende molto più facile, perché
prima le pozioni prese a salute piena andavano sprecate e ora si conservano per i boss. Il limite si cambia in `INVENTORY_CONFIG`
(`maxPotionsPerSlot`, `maxPotionSlots`): con 1 pozione il bot medio torna vicino alla 2.0. Il rusher (che non schiva) beneficia
più del medio delle pozioni conservate. **Il bot non usa le armi nuove**, e le statistiche delle armi non sono state provate da persone.

**Fase 2 (due nemici d'élite in più, livelli 3 e 5).** Con lo scheletro d'élite del livello 3 e il goblin d'élite del livello 5 (che lasciano
coltelli e giavellotto) il bot medio scende da 88% a **82%**; il rusher resta al 100%. Misurato dopo la Fase 4 togliendo e rimettendo
le due élite (nella Fase 2 la misura non era stata rifatta). Resta sopra la 2.0 (circa 75%); non è stato cambiato niente.

### Personaggi (Fase 4)

`npm run balance -- --characters`: partite complete (60 ripetizioni) con le statistiche di ogni personaggio. **Il bot usa sempre la spada**,
quindi misura salute, velocità, danno, difesa, schivata e cura, non l'arma iniziale (il Ranger, nel gioco, combatte da lontano con l'arco).

| Personaggio | bot medio | rusher | morti medie (medio) |
|---|---|---|---|
| Cavaliere | 82% | 100% | 1,18 |
| Ranger | 87% | 65% | 1,02 |
| Berserker | 93% | 100% | 0,68 |
| Paladino | 93% | 100% | 0,77 |

- **Paladino**: con danno subito ×0,85 vinceva solo il 65% (bot medio, misura rapida): moriva quasi sempre contro il boss finale, perché a
  72 px/s resta più a lungo sotto i suoi attacchi e la cura lenta non parte mai durante il combattimento. Con ×0,75 torna in linea con gli altri e
  resta il più lento. Con 76 px/s e ×0,85 il risultato era 85%.
- **Ranger**: con 75 HP chi non schiva (rusher) perde spesso, soprattutto nel livello 3; chi schiva va meglio del cavaliere (schivata più
  lunga e più frequente). È il comportamento voluto: fragile, ma agile.
- **Berserker**: più salute e più danno compensano la schivata rara. Il bot medio schiva poco, quindi la penalità pesa meno che per una persona.
- Sono misure di un bot, da confermare giocando.

### Fase 5: stamina, abilità e una correzione del bot

> **Correzione del bot.** Il bot di `tools/balance.mjs` non si girava mai verso un nemico che gli finiva alle spalle: dopo una schivata
> (che attraversa i nemici) continuava ad attaccare l'aria e prendeva colpi. Ora, come il bot dei test nel browser, prima si gira verso il
> bersaglio. **Le misure precedenti erano quindi troppo pessimiste** (bot medio: 82% con il cavaliere). Il difetto è emerso con la carica
> del Berserker, che porta oltre il nemico.

Partite complete (60 ripetizioni, tutti con la spada; "con abilità" = il bot usa anche L: le abilità d'attacco appena il bersaglio è a
portata, lo scudo al posto della schivata):

| Personaggio | medio senza / con abilità | rusher senza / con abilità |
|---|---|---|
| Cavaliere | 100% / 100% | 100% / 100% |
| Ranger | 100% / 100% | 65% / 68% |
| Berserker | 100% / 100% | 100% / 100% |
| Paladino | 100% / 100% | 100% / 100% |

- La stamina non cambia i risultati del bot: schiva di rado e non resta mai senza. Per una persona che schiva spesso, invece, è un limite vero.
- Con il bot corretto quasi tutte le partite sono vinte: **il gioco potrebbe essere diventato facile**. La borsa con 2 pozioni conservabili
  (vedi sopra) è la ragione principale. Prima di cambiare valori conviene una prova con persone; le leve più semplici sono
  `INVENTORY_CONFIG.maxPotionsPerSlot` e la difficoltà.
- Il Ranger che non schiva resta fragile (75 HP): è voluto.
- **Scatti sul bordo**: con l'abilità, il Ranger del bot moriva sempre nel livello 1, perché il balzo all'indietro lo portava nell'abisso appena saltato.
  Lo stesso poteva succedere a una persona: ora gli scatti delle abilità si fermano sul bordo (come il rinculo).

### Fase 8: Lande Desolate (livello 6) e nuovi nemici

Duelli (bot che non schiva): Predone 27 HP persi (l'arciere 20), Scorpione 10, Avvoltoio 0 (nei duelli il bot non lo raggiunge; nel livello
colpisce mentre si cammina). Signore delle Lande da solo: vittorie 100% / 100%, HP persi 51 / 22.

Con la prima versione il livello 6 era molto più duro degli altri: vittorie 7% (rusher) / 20% (medio), 190 / 150 HP persi. Misurando gruppo per
gruppo, predoni, scorpioni e avvoltoi pesavano tutti (circa +25-45 HP ciascuno). Correzioni: predone 35 → 30 HP, danno 11 → 9, attesa 1,6 → 2,1 s,
portata 120 → 110, accetta più bassa; avvoltoio 28 → 24 HP, danno 10 → 8, attesa 1,6 → 2 s, picchiata 175 → 160; scorpione danno 12 → 10; nel
livello un predone in meno (al suo posto un goblin, che è l'élite) e un avvoltoio in meno. Risultato (40 ripetizioni):

| Livello | rusher: vittorie / HP persi | medio: vittorie / HP persi |
|---|---|---|
| 5 – Picchi Ghiacciati | 100% / 108 | 100% / 67 |
| 6 – Lande Desolate | 100% / 132 | 98% / 118 |
| 7 – Torre dell'Ombra | 100% / 115 | 98% / 93 |

Partite complete (7 livelli): 100% per entrambi i bot. Con sette livelli invece di sei il **Ranger che non schiva** (75 HP, con la spada) scende al
25-30% (era 65%); quello che schiva resta al 100%. Il balzo all'indietro del Ranger ora si ferma anche prima degli spuntoni: il bot ci finiva sopra.

### Piano dell'equipaggiamento (E1-E6): rarità e armature

`npm run balance -- --equipment` (anche nel report completo): partite complete del cavaliere (60 ripetizioni) in tre modi. **Senza**
equipaggiamento; con il **bottino** di fine livello (per ogni forziere, élite e boss del livello il bot estrae con `LootSystem` un pezzo
d'armatura, che indossa se è migliore, e una spada, che prende se è di rarità più alta; la bottega no, perché costa monete); al **massimo**
(tre pezzi d'acciaio Epici e una spada Leggendaria dall'inizio: il tetto).

| Bot | senza | bottino | massimo |
|---|---|---|---|
| rusher: vinte / vite rimaste / morti medie | 100% / 2,10 / 0,90 | 98% / 3,00 / 0,05 | 100% / 3,00 / 0,00 |
| medio: vinte / vite rimaste / morti medie | 100% / 2,90 / 0,10 | 100% / 3,00 / 0,00 | 100% / 3,00 / 0,00 |

- **Come temuto nel piano, l'equipaggiamento rende il gioco più facile per il bot.** Le morti (già rare) quasi spariscono; le poche
  che restano senza equipaggiamento sono nei livelli 6 e 7, dove ogni piccolo vantaggio sposta l'esito. Armi e armature, misurate
  separatamente (misura rapida), aiutano entrambe.
- **Primi valori ridotti dopo la misura**: difesa delle armature circa dimezzata (corazza d'acciaio 8% → 5%, elmo 4% → 3%, ...), salute
  della corazza d'acciaio 15 → 10, set più deboli, tetti più bassi (difesa 40% → **25%**, salute +60 → **+40**), modificatori di difesa e
  salute più piccoli. Il risultato del bot non è cambiato: è vicino alla soglia, quindi la misura non distingue bene.
- **La rarità non peggiora il caso peggiore**: al massimo il bot non muore mai, ma senza equipaggiamento vinceva già il 100%.
  Il gioco era già facile per il bot (vedi Fase 5): prima di cambiare altri valori serve una **prova con persone**. Le leve sono i tetti
  in `affixConfig.ts`, le statistiche in `armorConfig.ts`, i pesi delle fonti in `lootConfig.ts` (meno armature: `armorChance`) e la difficoltà.
- Il bot non usa elementi e furto di vita in modo diverso da una persona: li riceve dalla spada estratta, come il gioco.

### Fase 6: bottega

Il bot di `tools/balance.mjs` **non usa la bottega**, quindi le misure qui sopra valgono per una partita senza acquisti, che la renderebbero più facile.
Dalla 2.1 le gemme valgono 30 monete (8 gemme in tutto il gioco: 240 monete) e i potenziamenti permanenti non ci sono più (il bot non li usava).
Raccogliendo tutto e sconfiggendo tutti i nemici del livello si guadagnano da 74 monete (livello 1) a 154 (livello 7), boss ed élite compresi;
una pozione costa 40. Il valore della gemma è provvisorio. Prezzi in `progressionConfig.ts`, gemma in `itemConfig.ts`; vanno provati con persone, soprattutto
perché il gioco sembrava già facile per il bot.

## Classi Fase 4: attributi, requisiti e build (2.4.0)

Gli attributi non cambiano le classi che non spendono punti (le basi sono neutre: contano solo i punti sopra la base). Le differenze
nel simulatore vengono da due fonti: i **requisiti di Forza** (il bot indossa le armature migliori senza badare alla Forza) e la nuova
sezione **BUILD**. Valori in `src/config/attributeConfig.ts`; tutti provvisori, da rivedere nella Classi Fase 6B.

**Sezione BUILD** (`npm run balance -- --build`, 60 partite per riga): il Cavaliere con l'onda d'urto gioca partite complete e,
a fine livello, mette **tutti i punti** (3 + 2 con il boss) in un attributo: Forza, Intelligenza, Vitalità o nessuno. Misura anche tempo
e salute persa. Il bot usa solo la spada e non cambia equipaggiamento.

| Build (rusher, 60 partite) | Vinte | Morti medie | Tempo | HP persi |
|---|---|---|---|---|
| nessuna | 100% | 0,85 | 378 s | 798 |
| **Forza** | 100% | 0,00 | 311 s | 551 |
| Intelligenza | 100% | 0,57 | 356 s | 719 |
| Vitalità | 100% | 0,00 | 331 s | 731 |

Il medio vince sempre con ogni build (HP persi: nessuna 448, Forza 396, Intelligenza 425, Vitalità 455). Direzione: **Forza** finisce prima e perde
meno salute; **Vitalità** non muore ma perde più salute; **Intelligenza** sta in mezzo (il Cavaliere ha poca Intelligenza e la usa solo per la potenza dell'onda).
Le build giocano in modo riconoscibile, che era il criterio di chiusura della fase.

**Tre righe esistenti cambiano, per scelta** (baseline `tools/balance-baseline.txt` aggiornato a parte, dalla decisione del 26 novembre):

| Riga | Prima | Dopo | Perché |
|---|---|---|---|
| Cavaliere "medio", equipaggiamento al massimo (acciaio) | 100% vinte | 95% vinte (2,53 vite rimaste, 0,60 morti) | l'acciaio pesa 4 per pezzo: senza Forza la velocità cala |
| Mago "rusher", partite complete con il bottino | 95% | 83% | il bot indossa armature pesanti senza la Forza richiesta (Mago: FOR 2) |
| Mago "medio", partite complete con il bottino | 95% | 88% | come sopra |

Sono effetti del bot, che non spende punti in Forza né sceglie armature leggere: una persona può evitarli.

## Classi Fase 3: compatibilità armi e classi (2.3.0)

La tabella classe × arma (`src/config/weaponAffinityConfig.ts`) usa tre valori, uguali per simbolo:
★ (arma preferita, non iniziale) danno ×1,15 e munizioni ×1,5 per difetto; ▼ danno ×0,85 e recupero
×1,15; ✓ e arma iniziale ×1. L'arma iniziale resta a ×1 perché ogni classe era già bilanciata su quella.
La messa a punto cella per cella è rimandata alla Classi Fase 6B, con i bot per classe.

Effetto sul simulatore (il bot usa la spada per tutte le classi tranne il Mago): cambia solo il Paladino,
per cui la spada è ★. Nelle partite complete il Paladino "rusher" passa da 2,70 a 2,98 vite rimaste (morti
medie da 0,30 a 0,02), con e senza abilità; tutte le altre righe sono identiche. Il baseline
(`tools/balance-baseline.txt`) è aggiornato nello stesso commit.

## Classi Fase 2: il Mago (2.2.0)

Il Mago ha un bot proprio (`playMageTurn` in `tools/balance.mjs`; solo lui con `npm run balance -- --mage`): colpisce con il
bastone e usa gli incantesimi. Il dardo (7) parte appena il bersaglio è a tiro, la nova (8) quando è vicino. Al momento del colpo,
se decide di schivare, usa il balzo (9) al posto della schivata. Contro i boss alza la barriera (0), come lo scudo del Paladino.
Non bada al mana: se non basta, l'incantesimo semplicemente non parte.
Le pozioni di mana non sono misurate: il simulatore non apre forzieri.
Gli altri personaggi restano nella sezione "tutti con la spada" e i loro numeri non cambiano (righe del baseline identiche).

| Misura (60 partite) | rusher | medio |
|---|---|---|
| Boss da soli (40 prove ciascuno) | 100% vittorie, 22-47 HP persi | 100% vittorie, 17-32 HP persi |
| Partite complete senza bottino | 13% (morti ai livelli 3, 6 e 7) | 93%, 2,48 vite rimaste |
| Partite complete con il bottino di fine livello | 95% | 95% |

**Valori scelti.** Con la prima proposta (65 HP, 4 mana al secondo) il medio vinceva il 30% delle partite. Il rusher moriva sempre
al livello 3: perde quanto il Cavaliere (circa 105 HP) ma ne ha 65. Il mana conta più della salute:
- 75 HP con 4 mana al secondo: il medio arriva al 47%;
- 75 HP con 6 mana al secondo: il medio arriva al 100%.

Scelti **70 HP e 6 mana al secondo** (rusher 20%, medio 93% su 30 prove): una classe fragile, come il Ranger rusher (30%).
Il bastone (+5 mana a colpo, incantesimi ×1,2 e mana ×0,85) è rimasto com'era. Tutti i valori del Mago (salute, mana, costi,
ricariche, danni, bastone, prezzo della pozione di mana e probabilità nel bottino) vanno rivisti nella Classi Fase 6.

## Versione 2.0 con i power-up (2.0.0-alpha.5)

Con i power-up nei livelli: partita completa vinta dal bot "medio" circa **75%** (era 73%), dal rusher circa 32% (invariato); boss da solo:
Cavaliere Nero 100% / 95%, Strega 100% / 100%, Re dei Lupi 100% / 98%, Signore dell'Ombra 48% / 70%; livelli 1-6 (medio): 100 / 95 / 78 / 98 / 95 / 45%.

**Una prima versione era troppo generosa:** con Furia e Scudo raccolti subito prima delle arene il bot vinceva il 100% delle partite (anche senza
schivare), perché il power-up era ancora attivo contro il boss. I power-up sono stati spostati più indietro: aiutano contro i nemici del livello e scadono
prima del boss. Nella misura "boss da solo" (livello senza nemici) il bot arriva all'arena in fretta e ha ancora la Furia del livello 3: per questo il
Cavaliere Nero risulta più facile lì che nella misura del livello intero.

## Versione 2.0: sei livelli (`npm run balance`, 40-60 ripetizioni, 2.0.0-alpha.4)

Dalla 2.0.0-alpha.4 il simulatore usa gli stessi sistemi del gioco: boss di ogni livello (`bossId`), proiettili, pericoli (acqua, ghiaccio, spuntoni:
il bot salta gli spuntoni come gli abissi), piattaforme mobili, evocazioni dei boss e divisione delle melme. I livelli 1-3 danno gli stessi numeri di prima.

| Misura | rusher | medio |
|---|---|---|
| Duello lupo / melma / arciere / golem (HP persi) | 9 / 0 / 20 / 15 | - |
| Boss da solo, vittorie: Cavaliere Nero / Strega / Re dei Lupi / Signore dell'Ombra | 33% / 100% / 100% / 45% | 88% / 100% / 95% / 68% |
| Livelli 1 / 2 / 3, vittorie | 100% / 100% / 33% | 100% / 95% / 75% |
| Livelli 4 / 5 / 6, vittorie | 100% / 100% / 35% | 98% / 90% / 48% |
| Partita completa (6 livelli), vinte | circa 32% | circa 73% |
| Morti medie per livello (L1-L6) | 0 / 0 / 1,5 / 0 / 0 / 0,9 | 0 / 0,2 / 0,2 / 0 / 0,2 / 0,9 |

**Come si legge.** La palude (4) è un respiro dopo il Cavaliere Nero; i picchi (5) consumano molta salute (lupi veloci, golem corazzato);
la torre (6) con il Signore dell'Ombra è il punto più difficile, come deve essere un finale. Il bot non usa mai l'attacco pesante: contro il
golem corazzato (che lo richiede) e contro i pipistrelli (che il bot non insegue in aria) i numeri sono pessimisti o non significativi
(pipistrello: 40 s = il bot non lo affronta).

**Modifiche fatte durante la Fase 4** (misurate con il simulatore): golem 90 → 70 HP, danno 18 → 15, corazza 0,4 → 0,5 (era quasi
invulnerabile per chi usa solo l'attacco leggero); nel livello 5 un golem sostituito da un goblin e una pozione in più (vittorie del bot
medio 53% → 90%); Signore dell'Ombra 400 → 340 HP e attacchi un poco più deboli (da solo 33% → 68%); Strega 260 → 300 HP perché era più
facile del Cavaliere Nero che la precede.

## Risultati della versione 1.0 (tre livelli)

> Rieseguito nella 2.0.0-alpha.3, dopo che gli attacchi del boss sono diventati dati: **stessi risultati** (boss 33% / 88%, livello 3 33% / 75%,
> partite 67% / 98%). La grafica a 16 bit (2.0.0-alpha.2) non ha cambiato le hitbox, quindi nemmeno il bilanciamento.

| Misura | rusher | medio |
|---|---|---|
| Duello scheletro / goblin / soldato (HP persi) | 10 / 8 / 15 | - |
| Boss da solo, vittorie | circa 33% | circa 88% |
| Livello 1, vittorie | 100% | 100% |
| Livello 2, vittorie | 100% | circa 95% |
| Livello 3, vittorie | circa 33% | circa 75% |
| Partita completa, vinte | circa 67% | circa 98% |
| Morti medie per livello (L1 / L2 / L3) | 0 / 0 / 1,5 | 0 / 0,2 / 0,2 |

Il livello 3 (e soprattutto il boss) è il punto più difficile, come previsto. I livelli 1 e 2 non fanno
perdere vite a chi attacca di continuo. Misure aggiornate alla 1.0.0, dopo la correzione del buffer degli attacchi (0.9.1) e della gravità con velocità media (1.0.0, che ha reso il salto leggermente più alto e identico a ogni FPS):
il bot "medio" va meglio di prima (boss da circa 75-87% a circa 88%); il rusher non cambia.

## Sensibilità del boss

Il risultato del boss cambia a gradini (es. 285 HP: 100% vittorie, 290 HP: 32% per il rusher) perché
un piccolo cambiamento può aggiungere un colpo necessario al giocatore o a lui. Dopo ogni modifica al
boss conviene rilanciare `npm run balance` e guardare più valori vicini.

## Dove cambiare cosa

| Cosa | File | Valore |
|---|---|---|
| Salute, danni, velocità del giocatore | `src/config/playerConfig.ts` | `PLAYER_CONFIG` |
| Danni e durata degli attacchi, combo | `src/config/playerConfig.ts` | `ATTACK_DEFINITIONS`, `COMBO_DEFINITIONS` |
| Nemici normali | `src/config/enemyConfig.ts` | `ENEMY_CONFIG` |
| Boss e fasi | `src/config/enemyConfig.ts` | `BOSS_CONFIG` |
| Ricarica delle frecce del Ranger (2.1.1: una ogni 3 s; non misurata, il bot usa solo la spada; valore da rivedere nella Classi Fase 6) | `src/config/characterConfig.ts` | `ammoRegeneration.intervalMs` |
| Mago: salute, mana e recupero (2.2.0) | `src/config/characterConfig.ts` | `CHARACTER_CONFIG.mage` |
| Incantesimi: costi, ricariche, danni, elementi | `src/config/abilityConfig.ts` | `ABILITY_CONFIG` (firebolt, frostNova, arcaneLeap, arcaneBarrier) |
| Bastone e catalizzatore | `src/config/weaponConfig.ts` | `WEAPON_CONFIG.staff`, `spellFocus` |
| Attributi: basi per classe | `src/config/characterConfig.ts` | `CHARACTER_CONFIG[..].baseAttributes` |
| Attributi: effetti per punto, massimo e punti per livello (2.4.0) | `src/config/attributeConfig.ts` | `ATTRIBUTE_CONFIG`, `ATTRIBUTE_MAX_VALUE`, `ATTRIBUTE_POINTS_CONFIG` |
| Scaling delle armi, requisiti di Forza, carico, gradi delle mosse | `src/config/attributeConfig.ts` | `WEAPON_SCALING_CONFIG`, `STRENGTH_REQUIREMENT_CONFIG`, `CARRY_CONFIG`, `SPELL_GRADE_INT_REQUIREMENT` |
| Compatibilità classe × arma: bonus, malus, divieti e sostituti nel bottino (2.3.0) | `src/config/weaponAffinityConfig.ts` | `PREFERRED_WEAPON_AFFINITY`, `PENALIZED_WEAPON_AFFINITY`, `WEAPON_AFFINITY_CONFIG` |
| Pozione di mana (bottino e bottega) | `src/config/itemConfig.ts`, `lootConfig.ts`, `progressionConfig.ts` | `manaPotion`, `manaPotionChance`, `SHOP_OFFERS.manaPotion` |
| Cura di livello, danno da caduta, vite | `src/config/gameConfig.ts` | `GAME_CONFIG` |
| Pozione, moneta, gemma | `src/config/itemConfig.ts` | `ITEM_CONFIG` |
| Posizione di nemici e oggetti | `src/config/levelConfig.ts` | `LEVEL_CONFIG` |
| Moltiplicatori di difficoltà | `src/config/gameConfig.ts` | `DIFFICULTY_CONFIG` |
| Rarità (pesi, prezzi, numero di modificatori, potenza) | `src/config/rarityConfig.ts` | `RARITY_CONFIG` |
| Modificatori e tetti | `src/config/affixConfig.ts` | `AFFIX_CONFIG` |
| Armature e set | `src/config/armorConfig.ts` | `ARMOR_CONFIG`, `ARMOR_SETS` |
| Fonti degli oggetti (forzieri, nemici, boss, bottega) | `src/config/lootConfig.ts` | `LOOT_SOURCES`, `LOOT_LEVEL_SCALE` |
| Prezzi della bottega e aumento a ogni acquisto | `src/config/progressionConfig.ts`, `src/systems/ItemFactory.ts` | `SHOP_OFFERS`, `SHOP_PRICE_INCREASE_PER_PURCHASE`, `ITEM_BASE_PRICES` |
