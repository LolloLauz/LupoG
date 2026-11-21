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

## Risultati attuali (`npm run balance`, 40-60 ripetizioni)

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
