# Bilanciamento

Questo documento spiega come sono stati scelti i valori di difficoltà e come
verificarli dopo una modifica. Tutti i valori si cambiano in `src/config/`.

## Come si misura: `npm run balance`

`tools/balance.mjs` fa giocare un **bot** nel gioco reale (stesse classi del gioco, senza grafica)
e stampa duelli, boss, livelli e partite complete. Con `npm run balance -- --quick` è più rapido
ma meno preciso.

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
| Cura di livello, danno da caduta, vite | `src/config/gameConfig.ts` | `GAME_CONFIG` |
| Pozione, moneta, gemma | `src/config/itemConfig.ts` | `ITEM_CONFIG` |
| Posizione di nemici e oggetti | `src/config/levelConfig.ts` | `LEVEL_CONFIG` |
| Moltiplicatori di difficoltà | `src/config/gameConfig.ts` | `DIFFICULTY_CONFIG` |
