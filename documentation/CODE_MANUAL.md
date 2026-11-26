# Manuale del codice

Versione del gioco descritta: **2.6.0**. Per la visione d'insieme leggere prima `ARCHITECTURE.md`;
per le regole di gioco `GAME_MANUAL.md`.

Questo manuale spiega **cosa c'è in ogni file**, **come si muove il codice** e, nella parte finale,
come modificarlo con **11 esempi pratici**. Gli esempi non sono scritti "a memoria": si verificano
con `npm run verify-docs` (vedi l'ultima sezione), che applica ogni modifica a una copia del progetto,
controlla che compili e che il risultato sia quello descritto.

---

## 1. Convenzioni

| Aspetto | Regola |
|---|---|
| Linguaggio | TypeScript in modalità `strict`; nessun `any` |
| Nomi | variabili e funzioni in `camelCase`, classi e tipi in `PascalCase` |
| Lingua | commenti e documentazione in italiano |
| Coordinate | pixel del mondo di gioco; l'origine (0,0) è in alto a sinistra, `y` cresce verso il basso |
| Risoluzione | schermo interno 320×240 pixel, ingrandito solo con moltiplicatori interi |
| Posizione delle entità | `positionX`/`positionY` = angolo in alto a sinistra dell'**hitbox** |
| Velocità | pixel al secondo; accelerazioni in pixel/secondo² |
| Tempi | secondi (`deltaTimeSeconds`) nel loop; millisecondi (`...Ms`) nei timer e nelle configurazioni |
| Direzioni | `"left"`/`"right"` per `facingDirection`; `-1`/`1` per i calcoli |
| Terreno | il suolo dei livelli sta a `y = 200` |

---

## 2. Struttura dei file

```
IRON_AND_SHADOW/
├── index.html                  pagina con il canvas (sorgente per Vite)
├── package.json                comandi npm e dipendenze di sviluppo
├── tsconfig.json               TypeScript strict
├── vite.config.ts              build in un unico file classico, avviabile con doppio clic
├── tests/
│   ├── run.mjs                 esegue i test unitari (npm test)
│   ├── helpers.mjs             compila i moduli di src/ al volo e finti oggetti per i test
│   ├── unit/                   36 file di test unitari (*.test.mjs)
│   └── browser/                test nel browser con Playwright (npm run test:browser): run.mjs e la pagina di prova harness.js
├── tools/
│   ├── balance.mjs             simulatore di bilanciamento (npm run balance)
│   └── verifyManualExamples.mjs  verifica degli esempi di questo manuale (npm run verify-docs)
├── documentation/              manuali
├── public/assets/              cartelle per risorse esterne (vuote: tutta la grafica è nel codice)
└── src/
    ├── main.ts                 punto di ingresso: crea GameEngine e lo avvia
    ├── style.css               stile della pagina (sfondo, canvas con pixel nitidi)
    ├── config/                 TUTTI i numeri modificabili del gioco
    ├── core/                   motore: loop, stati, input
    ├── entities/               oggetti di gioco: giocatore, nemici, boss, oggetti
    ├── combat/                 attacchi, combo, danni
    ├── systems/                collisioni, IA, livelli, oggetti, punteggio, vite, record
    ├── rendering/              disegno: renderer, camera, sprite, animazioni, effetti, sfondi
    │   └── sprites/            sprite pixel art descritti come testo
    ├── ui/                     HUD, menu, schermate
    └── types/                  tipi e interfacce condivisi
```

### Variazioni rispetto alla struttura proposta nel progetto iniziale

| Variazione | Motivo |
|---|---|
| Nessun `AudioManager.ts` e nessun file in `public/assets/audio` usato | il gioco non ha audio (scelta del progetto) |
| Nessun file in `public/assets/sprites`, `backgrounds`, `fonts` | sprite, sfondi e font sono generati dal codice: il gioco non dipende da file esterni e si avvia con doppio clic |
| `config/animationConfig.ts`, `config/itemConfig.ts` | animazioni e oggetti seguono lo stesso principio "tutto in configurazione" |
| `rendering/EffectsManager.ts`, `rendering/BackgroundRenderer.ts`, `rendering/BitmapFont.ts`, `rendering/sprites/*` | effetti, sfondi con parallasse, font a pixel e sprite non erano nella struttura iniziale |
| `config/paletteConfig.ts`, `rendering/PaletteEffects.ts` (2.0) | palette a rampe e effetti di colore a 16 bit (retino, gradienti, ciclo dei colori, ondulazione) |
| `rendering/PixelPainter.ts`, `rendering/TerrainRenderer.ts` (2.0) | primitive di disegno riusabili su qualsiasi canvas (per i livelli di parallasse) e disegno del terreno separato da `LevelManager` |
| `ui/MenuManager.ts` separato da `ScreenManager.ts` | i menu sono riusabili, le schermate si limitano a disegnare |
| `systems/LivesManager.ts`, `systems/HighScoreManager.ts` | vite e record sono responsabilità distinte dal punteggio |
| `entities/Item.ts` | serve agli oggetti raccoglibili |
| `tools/`, `tests/` | strumenti per sviluppatori (bilanciamento, verifica del manuale) e test automatici (vedi `TESTING.md`) |

---

## 3. Moduli in dettaglio

### 3.1 `src/config/` – i numeri del gioco

Questa cartella contiene **solo dati**. Per cambiare il comportamento del gioco quasi sempre basta
modificare qui, senza toccare la logica.

| File | Contenuto |
|---|---|
| `gameConfig.ts` | `GAME_CONFIG` (risoluzione, gravità, vite, bonus, cura, danno da caduta...), `DIFFICULTY_CONFIG` (nome, moltiplicatori di salute e danno di nemici e boss, vite iniziali) e `DIFFICULTY_ORDER`; riesporta `PALETTE` e `PALETTE_RAMPS` |
| `weaponConfig.ts` | `WEAPON_CONFIG` (11 armi; Classi Fase 2: `staff`, il bastone del Mago, categoria `staff`, peso 2, `scalingAttribute` `intelligence`, attacchi `staffStrike1/2`, `staffSpin`, `staffSweep`, `staffHeavy`, `staffPlunge`, combo *MULINELLO* (J ×3) e *SPAZZATA ARCANA* (J, K), `spellFocus` `{ powerMultiplier: 1.2, manaCostMultiplier: 0.85, manaPerHit: 5 }`; Classi Fase 0: ogni arma ha `category` (blade: spada, pugnale; heavy: ascia, mazza, spadone; polearm: lancia; ranged: arco, balestra; thrown: coltelli, giavellotto), `weight` 1-5 e `scalingAttribute`; E3: `greatsword`, lo spadone, con `GREATSWORD_ATTACKS` che rompono tutti la guardia, combo *Lama del gigante* e *Turbine*, passo ×0,85; prima 5 armi: `sword`, che riusa `ATTACK_DEFINITIONS`, `COMBO_DEFINITIONS` e `DEFAULT_ATTACK_BY_INPUT`; `dagger`, `spear`, `axe`, `mace` con i propri attacchi, combo, suffisso degli sprite, icona e velocità; l'id di ogni attacco è anche il nome della sua animazione; ogni arma corpo a corpo ha una combo mista con nome e una categoria `air` con la combo in volo e il colpo in picchiata; le armi a distanza `bow`, `crossbow`, `throwingKnives`, `javelin` hanno attacchi con `projectile`/`charge` e, coltelli e giavellotto, `ammo`), `WEAPON_ICON_SIZE`, `DEFAULT_WEAPON_ID`, `getAllWeaponAttacks()` (usata dalle animazioni), `isWeaponId()` (valida i progressi) |
| `weaponAffinityConfig.ts` (Classi Fase 0, per arma dalla Fase 3) | `WEAPON_AFFINITY_CONFIG` (classe × `WeaponId`, 5 × 11 celle `WeaponAffinity`: `isAllowed`, `damageMultiplier`, `recoveryMultiplier`, `ammoMultiplier`, `lootSubstituteId` per le vietate), `NEUTRAL_WEAPON_AFFINITY` (✓ e arma iniziale), `PREFERRED_WEAPON_AFFINITY` (★: danno ×1,15, munizioni ×1,5), `PENALIZED_WEAPON_AFFINITY` (▼: danno ×0,85, recupero ×1,15), `forbidden(sostituto)`, `getWeaponAffinity(characterId, weaponId)`; la categoria resta solo un tag di `WEAPON_CONFIG` (scaling della Fase 4). Il Mago impugna anche spada e pugnale |
| `attributeConfig.ts` (Classi Fase 0, effetti dalla Fase 4) | `ATTRIBUTE_CONFIG` (Forza, Destrezza, Intelligenza, Vitalità, Tempra: nome, sigla e `effectsPerPoint` con `stat`, `valuePerPoint`, `percent`, `isReduction`, `onlyWithMana`, `label`), `ATTRIBUTE_ORDER` (vertici del pentagono), `ZERO_ATTRIBUTES`, `ATTRIBUTE_MAX_VALUE` (20), `ATTRIBUTE_POINTS_CONFIG` (3 a livello, 2 per il boss), `WEAPON_SCALING_CONFIG` (+3% sul principale, +1% sul secondario per categoria), `STRENGTH_REQUIREMENT_CONFIG` (requisiti di armi e armature, malus per punto, tetto 40%), `CARRY_CONFIG` (8 + Forza, -3% per punto, tetto 30%), `SPELL_GRADE_INT_REQUIREMENT` (grado 1, 2, 3 → INT 0, 12, 16) |
| `powerUpConfig.ts` (2.0) | `POWER_UP_CONFIG`: Furia, Velocità, Scudo, Fuoco, Rigenerazione (nome, descrizione, tipo, effetti sulle statistiche, durata, requisiti, icona, colore dell'alone; Classi Fase 4: `attributeBonuses` facoltativo, punti di attributo temporanei, nessun power-up attuale lo usa) |
| `paletteConfig.ts` | `PALETTE` (colori con nome, al massimo `MAX_PALETTE_COLORS`), `PALETTE_RAMPS` (rampe dallo scuro al chiaro), tipi `PaletteColor`, `PaletteRampName` |
| `playerConfig.ts` | `PLAYER_CONFIG` (statistiche del cavaliere e valori comuni a tutti i personaggi: salto, hitbox, tempi), `ATTACK_DEFINITIONS` (attacchi), `DEFAULT_ATTACK_BY_INPUT`, `COMBO_DEFINITIONS` |
| `elementConfig.ts` (Fase 7) | `ELEMENT_CONFIG` (bruciatura, veleno, gelo, shock: nome, colore, durata, danno nel tempo, rallentamento, stordimento con il tempo senza stordimento, danno ai boss), `ELEMENT_ORDER`; Classi Fase 5: `ELEMENT_SYNERGIES` (`SynergyDefinition[]`: `shatter` gelo + colpo pesante, `thermalShock` gelo + fuoco, `overload` bruciatura + fulmine, `detonation` veleno + fuoco; danno ×1,5; l'ordine decide quale scatta) |
| `progressionConfig.ts` (Fase 6) | `ECONOMY_CONFIG` (monete per nemico, moltiplicatore delle élite, monete per boss), `SHOP_OFFERS` (E5: anche `armor`), `SHOP_HEAL_AMOUNT` e `SHOP_PRICE_INCREASE_PER_PURCHASE` (bottega), `ALWAYS_DISCOVERED_WEAPONS` (la spada: sempre tra le armi che la bottega può vendere) |
| `abilityVisualConfig.ts` (Classi Fase 6A) | `ABILITY_VISUAL_CONFIG` (una voce per `AbilityId`: `iconSpriteId` 8×8, `weaponTint` facoltativo, `cues` e, per le guardie, `guardFrameIds`), `ABILITY_EFFECT_CONFIG` (17 effetti: anelli `dustRing`, `fireRing`, `frostRing`, `shockRing`, lampi `cast*`, `dustPuff`, `arcanePuff`, `lightning`, `speedLines`, `flameSlash`, `bloodAura`, `bloodSlash`), tipi `AbilityEffectId`, `AbilityEffectCue` (sprite con `atMs`, `offsetX`, `offsetY`, oppure `afterimage` con colore). Solo grafica |
| `abilityConfig.ts` (Fase 5) | `ABILITY_CONFIG` (Classi Fase 4: ogni voce ha `grade` 1-3, `AbilityGrade`, tutte di grado 1; ogni voce ha `cost: ResourceCost` = `{ stamina?, mana?, health? }` al posto di `staminaCost`, e `modifiers: []` per i modificatori degli incantesimi; base comune `AbilityBase`) (onda d'urto, tiro in ritirata, carica furiosa: abilità d'attacco con il loro `AttackDefinition`; scudo: abilità di guardia con consumo al secondo, finestra della parata perfetta, costo per punto di danno, stordimento), `getAbilityAttacks()` (usata dalle animazioni). Classi Fase 5: quattro mosse per classe, tutte di grado 1; le dodici nuove sono `lunge`, `shieldBash`, `flameBlade` (Cavaliere), `poisonArrow`, `frostArrow`, `fireArrow` (Ranger, senza munizioni), `hotAxe`, `earthquake`, `bloodStrike` (Berserker, costa 15 di salute), `holyHammer`, `consecration`, `frozenJudgement` (Paladino), costruite con gli aiuti `strike`, `elementArrow`, `attackAbility` e `AROUND_HITBOX`; `ABILITY_UNLOCK_CONFIG` (`startingCount` 2, `chestChance` 0,25). Classi Fase 2, incantesimi del Mago: `firebolt` (15 mana, 900 ms; `abilityFirebolt`, 22 danni, proiettile `arcaneFireball` senza munizioni, `elements: ["fire"]`), `frostNova` (30 mana, 5 s; `abilityFrostNova`, 18 danni, `elements: ["frost"]`, `impactEffect: "shockwave"`), `arcaneLeap` (20 mana, 3 s; `abilityArcaneLeap`, scatto indietro invulnerabile), `arcaneBarrier` (guardia: 10 mana per alzarla, 10/s, `costPerBlockedDamage` 1, parata perfetta 250 ms). La guardia ha `resource: "stamina" \| "mana"` (scudo: stamina) e `costPerBlockedDamage` (prima `staminaPerBlockedDamage`) |
| `characterConfig.ts` (Fase 4) | `CHARACTER_CONFIG` (cavaliere, ranger, berserker, paladino e, Classi Fase 2, mago: nome, descrizione, tratto, suffisso degli sprite, arma iniziale, salute, velocità, moltiplicatori del danno inflitto e subito, schivata, `regeneration` facoltativa; 2.1.1: `ammoRegeneration` facoltativa (`weaponId`, `intervalMs`; solo il Ranger: `bow`, 3000 ms); Fase 5: `maxStamina`, `staminaRegenPerSecond`, `dodgeStaminaCost`, `abilityIds` (elenco in ordine di tasto; dalla Classi Fase 5 quattro per classe); Classi Fase 5, passivi facoltativi: `staminaPerWeaponHit` (Cavaliere, 4), `lowHealthPower` (Berserker: `healthFraction` 0,4, `damageMultiplier` 1,25), `manaPerKill` (Mago, 10), e `trait` aggiornati; Classi Fase 0: `maxMana`, `manaRegenPerSecond` (0), `baseAttributes` (dalla Fase 4 le basi della classe, somma 25: Cavaliere 6/5/2/6/6, Ranger 3/9/3/4/6, Berserker 9/4/1/8/3, Paladino 6/2/4/7/6, Mago 2/4/10/4/5); Fase 6: `unlockLevel`, `unlockText`; Classi Fase 2: `usesSpellFocus` facoltativo, vero solo per il Mago, che ha 70 HP, velocità 84, stamina 80, mana 100 con recupero 6/s, bastone, `abilityIds` `firebolt`, `frostNova`, `arcaneLeap`, `arcaneBarrier`, sblocco al livello 5), `CHARACTER_ORDER` (cavaliere, ranger, berserker, mago, paladino), `DEFAULT_CHARACTER_ID`, `isCharacterId()`. Il cavaliere legge salute, velocità e schivata da `PLAYER_CONFIG` |
| `enemyConfig.ts` | `ENEMY_AI_CONFIG` (anche `armorCrushStunMs` e i moltiplicatori dei nemici d'élite), `ENEMY_CONFIG` (nemici), `BOSS_CONFIG` e `BOSS_CATALOG` (boss; `weaponReward` = trofeo) Fase 8: `raider` (Predone, a distanza con le accette), `scorpion` (corazzato, scatto), `vulture` (volante), `LANDS_LORD_CONFIG` (Signore delle Lande). |
| `projectileConfig.ts` (2.0) | `PROJECTILE_CONFIG`: freccia, dardo magico, palla di fuoco, Classi Fase 2: `arcaneFireball` (il dardo di fuoco del Mago, sprite a cometa `projectileFirebolt1-3` dalla Fase 6A; velocità, traiettoria, durata, dimensioni, se la spada li devia, frame), Classi Fase 6A: `fireArrow`, `frostArrow`, `poisonArrow` (valori della freccia del giocatore, sprite propri `projectileArrow<Elemento>1-2`, usati dalle mosse del Ranger), Fase 8: `hatchet` (accetta di predoni e Signore delle Lande, respinta dalla spada). |
| `hazardConfig.ts` (2.0) | `HAZARD_CONFIG`: danno degli spuntoni, moltiplicatori in acqua, aderenza sul ghiaccio |
| `itemConfig.ts` | `ITEM_CONFIG` (oggetti raccoglibili; quelli con `powerUpId` attivano un power-up, `storedInBag` = pozione da borsa, `manaAmount` = mana dato dalla pozione di mana (Classi Fase 2: `manaPotion`, 40, sprite `itemManaPotion`), `refillsAmmo` = faretra, `coins` = monete), `ITEM_SIZE` |
| `levelConfig.ts` | `LEVEL_CONFIG` (i 7 livelli; il 6 sono le Lande Desolate della Fase 8), `THEME_STYLES` (tessitura e rampe di colore del terreno per ambientazione: `terrainTexture`, `surfaceColors`, `fillColors`, `ledgeColors`, `detailColors`, `waterColors` facoltativo) |
| `controlsConfig.ts` | `CONTROLS_CONFIG` (tasti; anche `pickUp` = E, `dropItem` = Q (anche nei menu, per la schermata dell'equipaggiamento), `openEquipment` = I (E4), `openAttributes` = P e `assignPoint` = J (Classi Fase 4, nel contesto menu), `attack` = J, `heavyAttack` = K, `dodge` = Shift sinistro, `ability1`-`ability4` = 7, 8, 9, 0 (anche tastierino numerico; L alias di `ability1`; 5, 6 e Spazio non assegnati), `bagSlot1`-`bagSlot4` = 1-4 e, nei menu, `menuLeft`/`menuRight` = A/D e frecce), `INPUT_CONTEXT_ACTIONS` (azioni ammesse nei menu e in gioco), `ABILITY_SLOT_ACTIONS` (azione di ogni slot delle mosse; slot 0 = tasto 7), `ABILITY_SLOT_KEY_LABELS` (cifra del tasto di ogni slot, mostrata dall'HUD) |
| `inventoryConfig.ts` | `INVENTORY_CONFIG` (`slotCount` 4, `maxPotionsPerSlot` 2, `maxPotionSlots` 1, `backpackSize` 12; Classi Fase 2: i posti per le pozioni valgono per ogni tipo), `PotionId` (`healthPotion` \| `manaPotion`), `BAG_SLOT_ACTIONS` (tasto di ogni posto) |
| `animationConfig.ts` | `PLAYER_ANIMATIONS` (Classi Fase 5: le dodici mosse nuove riusano le pose comuni), `ENEMY_ANIMATIONS`, `BOSS_ANIMATIONS` |
| `rarityConfig.ts` (E1) | `RARITY_CONFIG` (sei rarità: nome, colore, colori del metallo delle armi, peso nei drop, moltiplicatore del prezzo, numero di modificatori, oggetto fisso, moltiplicatori del danno delle armi e delle statistiche delle armature), `RARITY_ORDER`, `isRarityId()`, `getRarityRank()` |
| `affixConfig.ts` (E1) | `AFFIX_CONFIG` (modificatori: etichetta, parte del nome, oggetti su cui escono, intervallo per rarità, **tetto** del totale, formato, "di stile"), `ELEMENT_NAME_SUFFIXES`, `ELEMENT_SHORT_NAMES`, `AFFIX_ORDER`, `isAffixId()` |
| `armorConfig.ts` (E2) | `ARMOR_SLOTS`, `ARMOR_SLOT_NAMES`, `ARMOR_MATERIALS` (stoffa, cuoio, ferro, acciaio: nome e quattro toni), `ARMOR_CONFIG` (12 pezzi: nome, posto, materiale, `weight`, statistiche base, icona), `ARMOR_WEIGHT_BY_MATERIAL` (stoffa 1, cuoio 2, ferro 3, acciaio 4) e `ARMOR_WEIGHT_SLOT_FACTOR` (corazza ×2; Classi Fase 3, solo dato mostrato), `ARMOR_SETS` (bonus con due e tre pezzi dello stesso materiale), `isArmorId()`, `isArmorSlot()` |
| `uniqueItemConfig.ts` (E1, E3) | `LEGENDARY_ITEMS` (uno per arma e tre armature), `MYTHIC_ITEMS` (Ombra Eterna, Corona dell'Ombra; Classi Fase 2: `starStaff`, BASTONE DELLE STELLE, Leggendario del bastone): oggetti fissi con nome, descrizione, tipo di base e modificatori |
| `lootConfig.ts` (E5) | `LOOT_SOURCES` (forziere, nemico, élite, boss, boss finale, bottega: pesi di rarità, probabilità di un'armatura e, Classi Fase 2, `manaPotionChance`: forziere 1, élite 0,5, boss 1, altri 0), `LOOT_LEVEL_SCALE`, `LOOT_DIFFICULTY_LEVEL_BONUS` |
| `shopRoomConfig.ts` (E6) | `SHOP_ROOM_CONFIG` (`isEnabled`: stanza o bottega a menu; piedistalli, distanza per comprare, banco, mercante e i suoi colori; Classi Fase 4: `altar` = `{ centerX: 330, reachDistance: 14, spriteId: "shopAltar", width: 16, height: 20 }`, l'altare degli attributi), `SHOP_ROOM_LEVEL` (la stanza come `LevelDefinition`, ambientazione `shop`, uscita `reachExit`) |

#### `PLAYER_CONFIG`

Salute, velocità e schivata qui sotto sono quelle del **cavaliere**; gli altri personaggi hanno i propri valori in `CHARACTER_CONFIG`
(vedi la tabella dei personaggi in `GAME_MANUAL.md`). Il resto vale per tutti.

| Chiave | Valore | Significato |
|---|---|---|
| `maxHealth` | 100 | salute massima |
| `movementSpeed` | 80 | velocità orizzontale (px/s) |
| `jumpForce` | 310 | velocità iniziale del salto (px/s); altezza ≈ `jumpForce² / (2·gravity)` ≈ 53 px |
| `lightAttackDamage` / `heavyAttackDamage` | 15 / 30 | danno base degli attacchi |
| `invulnerabilityDurationMs` | 1000 | invulnerabilità dopo un colpo subito |
| `dodgeDurationMs` / `dodgeCooldownMs` / `dodgeSpeed` | 300 / 700 / 160 | schivata (durata, ricarica, velocità): ≈ 48 px di scatto |
| `hitboxWidth` / `hitboxHeight` | 12 / 24 | dimensioni del corpo |
| `spriteWidth` / `spriteHeight` | 24 / 30 | dimensioni dello sprite a riposo (solo informative: l'allineamento usa l'ancora dello sprite) |
| `jumpCutMultiplier` | 0,5 | rilasciando il salto in salita la velocità si dimezza (salto variabile) |
| `coyoteTimeMs` | 80 | si può saltare ancora per 80 ms dopo aver lasciato un bordo |
| `jumpBufferMs` | 100 | un salto premuto 100 ms prima di atterrare viene eseguito all'atterraggio |
| `hurtDurationMs` | 350 | stordimento dopo un colpo |
| `knockbackSpeedX` / `knockbackSpeedY` | 90 / 120 | rinculo |
| `knockbackLedgeCheckDepth` | 48 | il rinculo si ferma se oltre il bordo non c'è terreno entro 48 px: non si viene spinti negli abissi |
| `attackBufferMs` | 200 | un attacco si memorizza solo se premuto negli ultimi 200 ms prima di poter partire; il buffer scade comunque dopo 200 ms |
| `deathDurationMs` | 1500 | tempo tra la morte e la perdita della vita |

#### `GAME_CONFIG`

| Chiave | Valore | Significato |
|---|---|---|
| `internalWidth` / `internalHeight` | 320 / 240 | risoluzione interna (16 bit; nella 1.0 era 256 / 240) |
| `maxDeltaTimeSeconds` | 0,05 | tetto del delta time (evita salti dopo cambi di scheda) |
| `gravity` | 900 | gravità (px/s²) |
| `maxFallSpeed` | 400 | velocità massima di caduta |
| `levelCompleteBonus` | 500 | punti a fine livello |
| `levelCompleteHeal` | 30 | salute recuperata a fine livello (non nell'ultimo) |
| `fallDamage` | 15 | danno caduta nell'abisso |
| `levelBannerDurationMs` | 2200 | durata dei messaggi di livello |
| `startingLives` | 3 | vite iniziali |
| `pauseOnFocusLoss` | true | pausa automatica se la finestra perde il focus |
| `debugMode` | false | mostra hitbox del giocatore e FPS |

#### `ATTACK_DEFINITIONS` (tipo `AttackDefinition`)

| Campo | Significato |
|---|---|
| `id` | identificativo |
| `damage` | danno |
| `durationMs` | durata totale dell'attacco |
| `hitStartMs` / `hitEndMs` | finestra in cui il colpo è attivo (dall'inizio dell'attacco) |
| `cooldownMs` | pausa dopo la fine, prima di un nuovo attacco |
| `hitbox` | area d'urto relativa all'angolo in alto a sinistra del giocatore, pensata per chi guarda a destra (viene specchiata) |
| `animation` | nome dell'animazione in `PLAYER_ANIMATIONS` |

Attacchi esistenti: `swordLight1`, `swordLight2` (250 ms, danno 15), `swordLight3` (350 ms, danno 30),
`swordHeavy` (500 ms, danno 30). `DEFAULT_ATTACK_BY_INPUT` indica che cosa fare se un input non fa parte
di nessuna combo. `COMBO_DEFINITIONS` contiene `tripleSlash` (J ×3, finestra 400 ms).

#### `ENEMY_CONFIG` (tipo `EnemyDefinition`)

| Campo | Significato |
|---|---|
| `id`, `name` | identificativo e nome mostrato |
| `maxHealth`, `attackDamage`, `movementSpeed` | statistiche base |
| `detectionRange` | distanza (px) a cui nota il giocatore |
| `attackRange` | portata dell'attacco (px dal bordo del nemico); l'area d'urto in mischia parte dalla metà del corpo, così colpisce anche chi gli sta addosso |
| `attackCooldownMs` | pausa tra due attacchi |
| `attackWindupMs` / `attackActiveMs` / `attackRecoveryMs` | preparazione, colpo attivo, recupero |
| `hurtDurationMs`, `knockbackSpeed` | stordimento e rinculo quando viene colpito |
| `attackInterruptWindowMs` | per quanti ms (dall'inizio dell'attacco) un colpo subito lo interrompe; 0 = mai |
| `patrolDistance` | raggio (px) della zona di pattuglia (solo `patrol`) |
| `behavior` | `"patrol"`, `"chase"`, `"guard"`, `"ranged"` (tira proiettili, serve `ranged`) o `"flyer"` (vola, serve `flight`) |
| `ranged` (facoltativo) | `projectileId`, `launchOffsetY` (altezza di lancio dalla cima dell'hitbox), `retreatDistance` (sotto questa distanza indietreggia) |
| `flight` (facoltativo) | `hoverHeight` (quota sopra la testa del giocatore), `diveSpeed` (velocità della picchiata), `bobAmplitude` e `bobPeriodMs` (oscillazione) |
| `lunge` (facoltativo) | `speed`: nella fase attiva dell'attacco il nemico balza in avanti (non oltre il bordo di un abisso); l'area d'urto è il corpo più 6 px davanti (lupo) |
| `splitInto` (facoltativo) | `enemyType`, `count`: alla morte compaiono questi nemici al suo posto (melma → 2 melmine) |
| `armor` (facoltativo) | `damageMultiplier`, `breakDamage`: i colpi con danno minore di `breakDamage` fanno solo quella frazione (golem: l'attacco leggero fa metà danno, il pesante il danno pieno) |
| `scoreReward` | punti alla sconfitta |
| `hitbox` | dimensioni del corpo (`x`,`y` non usati) |

#### `BOSS_CONFIG` (tipo `BossDefinition`)

Contiene salute, velocità, `activationRange`, l'elenco degli **attacchi** (`attacks`, tipo `BossAttackDefinition`),
`attackCooldownMs`, `hitFlashMs`, `deathDurationMs`, `scoreReward`, `hitbox` e l'elenco `phases` (tipo
`BossPhaseDefinition`: soglia di salute in %, moltiplicatori di velocità e di pausa, `attackWeights` = peso di ogni attacco
nel sorteggio). `BOSS_CATALOG` raccoglie tutti i boss per id.

Ogni attacco ha `id`, `kind`, `windupMs` (preparazione ben visibile), `activeMs`, `recoveryMs` e i campi del suo tipo:

| `kind` | Campi | Cosa fa |
|---|---|---|
| `melee` | `damage`, `range` | colpo davanti a sé, a portata `range` |
| `charge` | `damage`, `speed`, `minDistance` | scatto in avanti per `activeMs`; tutto il corpo ferisce; si ferma contro i muri; solo da almeno `minDistance` |
| `projectile` | `damage`, `projectileId`, `count`, `spreadDegrees`, `launchOffset`, `minDistance` | ventaglio di `count` proiettili mirati al giocatore all'inizio della fase attiva |
| `summon` | `enemyType`, `count`, `maxAlive`, `spawnDistance` | evoca nemici ai suoi lati, senza superare `maxAlive` evocati vivi |

Al massimo un attacco per tipo. Nel sorteggio i pesi si sommano nell'ordine di `attacks` (per questo nel Cavaliere Nero la
carica è prima del fendente: con lo stesso numero casuale si ottiene lo stesso attacco della versione 1.0).

### 3.2 `src/core/` – il motore

| File | Classe | Responsabilità |
|---|---|---|
| `GameLoop.ts` | `GameLoop` | ciclo con `requestAnimationFrame`; calcola il delta time (`calculateDeltaTime`, 0 al primo frame, tetto `maxDeltaTimeSeconds`); chiama `update` poi `render` |
| `GameState.ts` | `GameState` | macchina a stati: `current`, `previous`, `is()`, `onChange()`, `change()` (rifiuta le transizioni non previste) |
| `InputManager.ts` | `InputManager` | tastiera centralizzata (vedi sotto) |
| `GameEngine.ts` | `GameEngine` | coordina tutto: stati, livelli, combattimento, effetti, disegno |

**`GameState`** – stati: `title`, `controls`, `levelSelect`, `characterSelect`, `confirmReset`, `shop`, `equipment`, `attributes` (Classi Fase 4), `playing`, `paused`, `gameOver`, `victory`. Transizioni valide:
`title→controls/levelSelect/characterSelect/confirmReset/playing`, `controls→title`, `levelSelect→title/playing`, `characterSelect→title`, `confirmReset→title`, `shop→playing`, `equipment→playing/paused/attributes`, `attributes→equipment/playing`, `playing→paused/gameOver/victory/shop/equipment/attributes`,
`paused→playing/title/equipment`, `gameOver→title/playing`, `victory→title`.

**`InputManager`** – traduce i tasti (`KeyboardEvent.code`) in azioni (`GameAction`) secondo
`CONTROLS_CONFIG`. Metodi: `isHeld(action)` (tenuto premuto), `wasPressed(action)` (premuto in questo frame,
una sola volta, senza auto-repeat), `wasReleased(action)`, `endFrame()` (azzera gli eventi del frame),
`setContext("gameplay" | "menu")` (blocca le azioni non ammesse, vedi `INPUT_CONTEXT_ACTIONS`), `attach()`/`detach()`.
Alla perdita del focus rilascia tutti i tasti. Implementa l'interfaccia `InputSource`, usata da `Player`
(così si può testare senza tastiera).

**`GameEngine`** – variabili principali:

| Variabile | Significato |
|---|---|
| `player`, `enemies`, `boss` | entità del livello corrente |
| `levelManager`, `itemManager` | livello e oggetti |
| `scoreManager`, `livesManager`, `highScoreManager` | punteggio, vite, record |
| `effects`, `hud`, `screens` | effetti grafici, HUD, schermate |
| `currentLevelId`, `levelPhase` (`"playing"`/`"completed"`) | avanzamento |
| `bannerRemainingMs` | tempo restante del messaggio di livello |
| `lastSafePosition` | ultima posizione sul terreno, per ripartire dopo una caduta |
| `levelStartScore`, `levelStartCoins`, `levelStartInventory` | per ripristinare punteggio, monete e borsa se si muore |
| `discoveredWeaponIds` | armi trovate nella partita in corso (più la spada e l'arma iniziale): la bottega le può vendere |

Funzioni principali: `start()`, `update()` (un frame di logica), `render()`, `startNewGame()`, `startLevel()`,
`updatePlaying()`, `updateCombatAndEnemies()`, `handlePlayerDeath()`, `finishRun()`, `checkLevelCompletion()`,
`advanceToNextLevel()`, `getHUDData()`, `getScreenData()`, `chooseCharacter()` (Fase 4: salva il personaggio; vale dalla
prossima partita, il giocatore in corso non cambia), `resetRunEquipment()` (sola arma iniziale della classe, niente armature, zaino o pozioni, armi trovate
azzerate; all'avvio, a ogni nuova partita e da "Cancella dati"), `awardFinalBossReward()` (il nome del trofeo del boss finale, solo mostrato), `ensureCharacterSprites()` (registra la serie di sprite di un
personaggio la prima volta che serve), `resetAllData()` ("Cancella dati": `ProgressManager.reset`, `HighScoreManager.reset`, personaggio
iniziale e `resetRunEquipment`), `dropFromBag()` (tasto Q: Q tenuto + 1-4 lascia quel posto, Q da solo, al rilascio, l'arma in mano; solo a terra),
`refillAmmoFromQuiver()` (faretra: raccolta solo se `Inventory.refillAllAmmo` ricarica qualcosa), `useBagSlot` (Classi Fase 2: la pozione di mana ridà `manaAmount`, "MANA PIENO" a mana pieno), `dropManaPotionIfRolled`/`resolveLootWeapon` (bottino con filtro e pozione di mana), `regenerateAmmo()` (2.1.1: passiva delle munizioni della classe, con `AmmoRegeneration`; `startLevel` azzera il conteggio), Fase 6: `buyFromShop()`, `leaveShop()`
(la bottega si apre in `advanceToNextLevel` e PROSEGUI avvia il livello successivo); a fine livello (`checkLevelCompletion`)
si sblocca il livello successivo (e i personaggi), `showStaminaAndAbilityEffects()`
(Fase 5: nome dell'abilità, "STANCO", Classi Fase 5: "MOSSA NON ANCORA IMPARATA" e "SALUTE INSUFFICIENTE", polvere e tremolio dell'onda d'urto, scintille e "PARATA!" dello scudo). Le costanti `EFFECT_CONFIG` (in cima al file)
regolano hit-stop, tremolio e polvere.

Classi Fase 5: `learnNextAbility(x, y)` (fa imparare la mossa successiva, con scintille e "NUOVA MOSSA: NOME (tasto)"; restituisce il testo o `null`) è chiamata da `openChest` (se ne manca una e `lootRandom() < ABILITY_UNLOCK_CONFIG.chestChance`) e da `handlePlayerHit` alla sconfitta di un boss (il testo resta in `bossAbilityMessage` per il riquadro di fine livello). `levelStartAbilityCount` salva le mosse note in `startLevel` e `restartCurrentLevel` le ripristina. `showStatusDamage` preleva anche `drainSynergy` di nemici e boss (nome e scintille).

### 3.3 `src/entities/` – gli oggetti di gioco

| File | Classe | Note |
|---|---|---|
| `GameObject.ts` | `GameObject` (astratta) | `positionX`, `positionY`, `velocityX`, `velocityY`, `facingDirection`, `isOnGround`, `width`, `height`, `getBounds()` |
| `Player.ts` | `Player` | il cavaliere |
| `Enemy.ts` | `Enemy` | nemico normale guidato da una `EnemyDefinition` (anche a distanza e volante); `stun(ms)` (parata perfetta: attacco interrotto, nessun danno); Fase 7: effetti di stato (`StatusEffects` con `definition.elementModifiers`: gli elementi del colpo si applicano in `receiveHit`, il danno nel tempo in `updateTimers`, che può uccidere: il motore se ne accorge e chiama `handleStatusKill` → `rewardDefeat`, il gelo rallenta, lo shock chiama `stun`), `activeStatusElements`, `drainStatusTicks`; Classi Fase 5: in `receiveHit` la sinergia (`StatusEffects.consumeSynergy`, danno moltiplicato dopo la corazza) e `drainSynergy()`, che ha anche `Boss` |
| `Boss.ts` | `Boss` | boss con IA propria, attacchi come dati e fasi; Fase 7: effetti di stato (`activeStatusElements`, `drainStatusTicks`; lo shock ferisce subito invece di stordire, il gelo rallenta camminata e carica); `arenaMinX` (impostato da `LevelManager.createBoss` oltre il cancello, `ARENA_GATE_WIDTH`): il boss non esce mai dall'arena |
| `Projectile.ts` (2.0) | `Projectile` | proiettile nemico o del giocatore (`owner`): si muove, scade (`hasTimedOut`), si anima, ricorda i bersagli già colpiti (`targetsHit`); le regole di contatto sono in `ProjectileSystem` |
| `AmmoDrop.ts` | `AmmoDrop`, `AMMO_DROP_SIZE` | munizione caduta a terra (coltello lanciato): cade con la gravità, si recupera passandoci sopra |
| `Item.ts` | `Item` | oggetto raccoglibile |
| `Chest.ts` | `Chest`, `CHEST_SIZE` | forziere 16×12 con un'arma: `Damageable`, si apre al primo colpo; `drainOpenedWeapon()` restituisce l'arma una volta sola |
| `WeaponPickup.ts` | `WeaponPickup` | arma a terra 16×16 (`weaponId`, `isArmed`: un'arma appena lasciata dal giocatore non è prendibile finché lui non se ne allontana; `ammo`: munizioni di un'arma da lancio lasciata a terra) |

**`Player`** – `currentState` (`PlayerState`: `idle`, `walk`, `jump`, `fall`, `attack`, `hurt`, `dodge`, `crouch`, `dead`;
`run` è previsto dal tipo ma non usato), `currentHealth`, `maxHealth`. Funzioni:

| Funzione | Cosa fa |
|---|---|
| `update(dt, input, collisionSystem, platforms, mapWidth)` | un frame: timer, input, gravità, collisioni, stato, animazione |
| `takeDamage(damage, sourceCenterX)` | danno da nemico: rinculo, stordimento, invulnerabilità; `false` se ignorato |
| `takeEnvironmentalDamage(damage)` | danno senza rinculo (cadute) |
| `heal(amount)` | cura fino al massimo |
| `getActiveAttackHitbox()` | area d'urto se il colpo è attivo, altrimenti `null` |
| `hasAlreadyHit(target)`, `registerHit(target)` | un bersaglio si colpisce una volta per attacco |
| `getAttackElements()`, `getHitProperties(attack)` | Fase 7: elementi dei power-up attivi e proprietà del colpo (quelle dell'attacco più gli elementi) passate da `CombatSystem.processPlayerAttack` e messe nei proiettili |
| `getDamageMultiplier()`, `getBonusDamage()` | moltiplicatore del danno (Furia × quello del personaggio) e danno aggiunto (Fuoco), da `modifiers` |
| `activeSpellFocus`, `getAbilityCost(abilità)`, `getDamageMultiplierFor(attacco)`, `restoreMana(n)`, `abilitySlots`, `drainNoMana()` | Classi Fase 2: `activeSpellFocus` è il `spellFocus` dell'arma in mano, ma solo se la classe ha `usesSpellFocus` (altrimenti `null`). `getAbilityCost` applica `manaCostMultiplier` al costo in mana (arrotondato); `getDamageMultiplierFor` aggiunge `powerMultiplier` per gli attacchi delle abilità che costano mana (usata da `CombatSystem.processPlayerAttack` e dai proiettili); `registerHit` ridà `manaPerHit` con gli attacchi dell'arma; `restoreMana` serve alla pozione. `abilitySlots` dà per ogni slot ricarica, `isReady`, `isAffordable`, `isSelected`, `isActive` (per l'HUD); `drainNoMana` è vero una volta quando un incantesimo non parte (popup "SENZA MANA") |
| `mana`, `maxMana`, `canAfford(cost)`, `abilities`, `activeAbilitySlotIndex`, `selectAbilitySlot(i)`, `isAbilityReady`, `weaponAffinity`, `attributes`, `setSpentAttributes(spesi)` | Classi Fase 0 (attributi dalla Fase 4, vedi la riga seguente): stamina e mana sono due `ResourcePool` (mana 0 per tutti, attesa `PLAYER_CONFIG.manaRegenDelayMs` 600 ms). `canAfford` e il privato `payCost` leggono un `ResourceCost` (la salute si paga solo se ne resta almeno 1). Le abilità sono un elenco (`CharacterDefinition.abilityIds`); `selectAbilitySlot` rifiuta slot inesistenti e abbassa lo scudo se lo slot cambia; la ricarica è per slot; `ability` è quella dello slot attivo. `weaponAffinity` (da `getWeaponAffinity`, ×1) entra in `getDamageMultiplier` e nel recupero tra gli attacchi. `setSpentAttributes` scrive la fonte `attributes` di `modifiers`; `maxHealth`, `maxStamina`, `maxMana` leggono `maxHealthBonus`, `maxStaminaBonus`, `maxManaBonus` |
| `stamina`, `maxStamina`, `ability`, `abilityCooldownFraction`, `isGuarding`, `lastGuardOutcome`, `drainTired()`, `drainStartedAbilityName()`, `drainAbilityImpact()`, `drainGuardEvents()` | Fase 5: la stamina si consuma con `spendStamina` (schivata: `dodgeStaminaCost`; attacco pesante: `PLAYER_CONFIG.heavyAttackStaminaCost`; abilità) e si recupera in `updateStamina` dopo `staminaRegenDelayMs`. L'abilità d'attacco (`tryStartAbility`) diventa l'attacco in corso: area d'urto, proiettile (`usesAmmo: false`) e scatto (`AttackDefinition.dash`: velocità, finestra, invulnerabilità; durante lo scatto `isDodging` è vero e il bordo di un abisso lo ferma). `handleInput` sceglie lo slot dal tasto premuto (`ABILITY_SLOT_ACTIONS`, `selectAbilitySlot`; non durante un attacco o una schivata). Lo scudo (`updateGuard`, stato `guard`) si tiene con il tasto del suo slot; `takeDamage` passa da `tryBlockWithShield` (parata perfetta, normale o guardia rotta, solo da davanti) e scrive `lastGuardOutcome`, che `CombatSystem.processEnemyAttacks` usa per stordire l'attaccante (`Enemy.stun`) e `ProjectileSystem` per fermare le frecce. Le abilità non hanno pose accovacciate: durante un'abilità non ci si accovaccia |
| `baseAttributes`, `spentAttributes`, `attributes`, `attributePointsAboveBaseValues`, `getAttributePowerUpBonus(id)`, `strengthStatus`, `dodgeStaminaCost`, `meetsAbilityGrade(abilità)`, `drainLowIntelligence()`, `getDefenseMultiplier()`, `getResistanceFraction(elemento)`, `getRecoveryMultiplier()` | Classi Fase 4: `attributes` sono i valori effettivi (base + spesi + power-up, al massimo 20); `attributePointsAboveBaseValues` sono i punti che danno gli effetti; `refreshAttributes` (privato) ricalcola effetti e malus di Forza quando cambiano punti, power-up, arma o armature. `strengthStatus` (`StrengthPenalties`: `load`, `carryCapacity`, `weaponMissingStrength`, `armorMissingStrength`, moltiplicatori di danno, recupero e velocità) è letto da `getDamageMultiplierFor`, dal recupero e dalla velocità di movimento. Difesa, resistenze e recupero combinano equipaggiamento e attributi sotto i tetti di `AFFIX_CONFIG`. `drainLowIntelligence` è vero una volta dopo una mossa rifiutata per il grado (il motore mostra "INTELLIGENZA INSUFFICIENTE"). `AbilitySlotStatus.meetsRequirement` va all'HUD |
| `knownAbilityCount`, `setKnownAbilityCount(n)`, `learnNextAbility()`, `drainUnknownAbility()`, `drainLowHealth()`, `registerKill()` | Classi Fase 5: sono note le prime `knownAbilityCount` mosse di `abilities`. `setKnownAbilityCount` tiene il valore tra quelle di partenza e quelle della classe (se lo slot attivo si richiude abbassa lo scudo e torna al primo); `learnNextAbility` restituisce `{ ability, slotIndex }` o `null`; `setCharacter` torna alle iniziali. `selectAbilitySlot` rifiuta uno slot non imparato (`drainUnknownAbility`); `AbilitySlotStatus.isKnown` va all'HUD. `drainLowHealth` è vero una volta quando la salute non basta a pagare. `registerKill` applica `manaPerKill`; `registerHit` con un attacco dell'arma (non su scena) ridà anche `staminaPerWeaponHit`; `getDamageMultiplier` include `lowHealthPower` |
| `characterDefinition`, `setCharacter(definizione)`, `maxHealth` | Fase 4: classe del personaggio (`CharacterDefinition`, terzo parametro facoltativo del costruttore; senza, il cavaliere). Ne vengono salute massima, velocità, danno inflitto e subito, schivata, cura lenta (dopo `delayAfterHitMs` senza colpi subiti, anche ambientali) e suffisso degli sprite. `setCharacter` riporta la salute al massimo; il motore la chiama a ogni nuova partita |
| `modifiers`, `applyPowerUp(definizione)` | power-up attivi (`PlayerModifiers`); la velocità usa `movementSpeedMultiplier`, `takeDamage` usa `damageTakenMultiplier` (Scudo, almeno 1 danno), la rigenerazione cura a punti interi; `revive` li toglie tutti |
| `respawnAt(position)`, `revive()` | ripartenza e rianimazione |
| `currentAmmo`, `setAmmo(n)`, `chargeFraction`, `drainProjectileLaunches()`, `drainOutOfAmmo()` | Fase 2: munizioni dell'arma in mano (`equipWeapon(definizione, ammo)`), carica dell'arco, proiettili da lanciare (il motore li passa a `ProjectileSystem` e tiene la borsa al passo con le munizioni in `updateRangedWeapon`), avviso di munizioni finite. Gli attacchi con `projectile` lanciano a `launchAtMs`, quelli con `charge` si caricano finché si tiene il tasto e poi passano all'attacco di rilascio. Il danno dei proiettili usa i power-up come la spada |
| `bounceOffTarget()`, `drainCompletedComboName()`, `drainPlungeLanding()` | Fase 3: il colpo in picchiata (`AttackDefinition.plunge`) rimbalza quando colpisce (il motore la chiama dopo `processPlayerAttack`) e finisce toccando terra; nome della combo completata da mostrare. Il cavaliere ha due `ComboManager`, a terra e in aria (`WeaponDefinition.air`): passando dall'uno all'altro la combo riparte |
| `maxAmmo` | Classi Fase 3: massimo delle munizioni dell'arma in mano per la classe (`getWeaponMaxAmmo`) |
| `equippedWeapon`, `equipWeapon(definizione)` | Classi Fase 3: `equipWeapon` restituisce `boolean` e rifiuta le armi vietate dalla classe (`false`, non cambia niente). Arma in mano (`WeaponDefinition`): attacchi, combo, attacco predefinito per input e velocità di camminata; cambiarla annulla attacco e combo e, a metà attacco, anche l'animazione (la nuova arma potrebbe non averne i frame). Il motore dà l'arma iniziale della classe all'avvio e a ogni nuova partita |
| `getRenderedFrameId()` | frame da disegnare: frame dell'animazione + `Crouch` (attacco da accovacciati; guarda l'animazione in corso, non lo stato) + suffisso dell'arma + suffisso del personaggio |
| `isInvulnerable`, `isDodging`, `isCrouching`, `isDead`, `isReadyToRespawn`, `activeAttack` | stato letto dal motore (`isDodging`: si attraversano i nemici) |

L'ordine dentro `update`: timer → (morto / stordito / input) → gravità → `moveAndCollide` → stato → animazione.
Priorità degli stati in `updateState()`: morto > stordito > schivata > scudo > attacco > accovacciato > aria > camminata > fermo.

**`Enemy`** – decide `EnemyAISystem`, esegue `Enemy`. Balzo, divisione (`drainSplitRequests`, il motore crea i nemici) e corazza (`lastHitDamage` = danno davvero subito) sono gestiti qui. Funzioni: `setMovement(direction, speedMultiplier)`,
`faceTowards(x)`, `beginAttack(target?)`, `setFlightTarget(x, y)` (volanti), `getAttackHitbox()`, `markPlayerHit()`,
`receiveHit(damage, hitDirection, hit?)` (`hit` = `HitProperties` dell'attacco: `breaksGuard` interrompe anche un attacco già avviato, `crushesArmor` ignora la corazza e stordisce per almeno `armorCrushStunMs`), `drainProjectileLaunches()` (a distanza), `update(...)`, `render(...)`. Getter: `isAlive`,
`isRemovable`, `canAct`, `isAttacking`, `isAttackReady`, `isFlying`, `centerX`, `centerY`, `scoreReward`. Proprietà
`isSummoned` (evocato da un boss), `isElite`, `weaponDrop`. Applica `DIFFICULTY_CONFIG` a salute e danno quando viene creato; il quinto parametro `EnemyOptions` (`elite`, `weaponDrop`) applica i moltiplicatori d'élite e disegna l'alone dorato.
- **A distanza** (`ranged`): alla fine della preparazione mette in coda un `ProjectileLaunch`; il motore lo preleva con
  `drainProjectileLaunches()` e lo passa a `ProjectileSystem`. Non ha area d'urto da mischia.
- **Volante** (`flight`): da vivo niente gravità; vola verso il punto scelto dall'IA (`setFlightTarget`), attraversa le
  piattaforme sospese ma non i muri; la preparazione lo tiene fermo a mezz'aria, la fase attiva è una picchiata verso il punto
  bloccato da `beginAttack(target)` (ferisce tutto il corpo), il recupero lo fa risalire. Da morto cade.

**`Boss`** – fuori dagli attacchi gli stati sono `dormant`, `idle`, `walk`, `dead`; durante un attacco `currentState` è il
nome della fase (`BOSS_ATTACK_ANIMATIONS` in `animationConfig.ts`: `slash`; `chargeWindup`/`charging`/`recovery`;
`castWindup`/`casting`/`castRecovery`; `summonWindup`/`summoning`/`summonRecovery`), che è anche il nome dell'animazione.
Si risveglia entro `activationRange` (o se colpito). Sorteggia il prossimo attacco una volta per pausa (`rollNextAttack`) con i
pesi della fase corrente. Se l'attacco sorteggiato non è possibile (troppo vicino per caricare o lanciare, troppi evocati) usa
il corpo a corpo se il giocatore è a portata, altrimenti si avvicina (un boss senza corpo a corpo resta fermo). Proiettili ed
evocazioni sono richieste che il motore preleva (`drainProjectileLaunches`, `drainSummonRequests`). Non viene stordito dai colpi
(lampeggia). Getter: `phaseIndex`, `currentPhase`, `isActive`, `isDefeated`, `currentAttackDamage`, `currentAttackWindupMs`.
Le animazioni si ricavano dalla definizione (`createBossAnimations`). Il generatore casuale è un parametro del costruttore
(utile per i test).

**`Item`** – ha `definition` (da `ITEM_CONFIG`) e `bobPhase` (solo grafica).

### 3.4 `src/combat/`

| File | Contenuto |
|---|---|
| `AttackDefinition.ts` | ri-esporta il tipo `AttackDefinition`; `getAttackWorldHitbox()` converte l'area d'urto in coordinate del mondo, specchiandola se si guarda a sinistra |
| `ComboManager.ts` | sceglie l'attacco in base alla sequenza di input: sequenze miste (leggero e pesante) e ramificate (combo con lo stesso inizio devono usare gli stessi attacchi per quell'inizio), continuazione anche quando una combo è l'inizio di un'altra, `drainCompletedCombo()` (combo appena completata, con il suo `name`) |
| `CombatSystem.ts` | applica i danni: (danno dell'attacco + `getBonusDamage()`) × `getDamageMultiplierFor(attacco)`; Classi Fase 5: se il bersaglio muore (e non è scena) chiama `player.registerKill()` |
| `StatusEffects.ts` (Fase 7) | `StatusEffects`, `StatusTick`, `StatusApplication` | effetti di stato di un bersaglio: `apply(elemento)` (rispetta le resistenze; restituisce lo stordimento dello shock), `update(ms)` (colpi del danno nel tempo), `speedMultiplier` (gelo), `activeElements`, `clear()`; Classi Fase 5: `consumeSynergy(colpo)` (restituisce la prima sinergia valida di `ELEMENT_SYNERGIES` e consuma l'effetto, oppure `null`; va chiamata prima di applicare gli elementi del colpo). Disegno degli aloni in `rendering/StatusRenderer.ts` |
| `ResourcePool.ts` (Classi Fase 0) | `ResourcePool` | una risorsa del giocatore (stamina, mana): `new ResourcePool(getMax, getRegenPerSecond, regenDelayMs)` con massimo e recupero letti da callback; `value`, `max`, `canSpend`, `trySpend` (consuma e fa partire l'attesa), `drain`, `empty`, `refill`, `clampToMax`, `restore(n)` (Classi Fase 2: recupera senza superare il massimo e senza fermare il recupero), `update(dt)` (recupero dopo l'attesa) |
| `PlayerModifiers.ts` (2.0) | power-up attivi del giocatore: `add` (o riparte la durata), `update` (toglie gli scaduti), `clear` (solo i power-up), fonti permanenti (Classi Fase 0: `setSourceEffects(fonte, effetti)`, `getSourceEffects`, `ModifierSourceId = "attributes"`, sommate nella stessa formula; Classi Fase 4: `getAttributeBonus(id)` somma gli `attributeBonuses` dei power-up attivi e `onPowerUpsChanged` avvisa `Player` quando l'elenco cambia; le basi delle otto statistiche percentuali nuove sono a 0), `has`, `getValue(stat)` = (base + bonus) × moltiplicatori; le statistiche base non cambiano mai |

**`ComboManager`** – `getNextAttack(input)`: prova a **continuare** la combo in corso (la sequenza di input finora deve essere
l'inizio di una combo definita); se non va, **riparte** da questo input; se nessuna combo inizia con questo input usa
`DEFAULT_ATTACK_BY_INPUT`. `onAttackFinished()` avvia la finestra `comboWindowMs`; `update(dtMs)` la fa scadere; `reset()`.

**`CombatSystem`** – `processPlayerAttack(player, targets)` (colpisce chi si sovrappone all'area d'urto, una volta per
attacco), `processEnemyAttacks(enemies, player)`, `processBossAttack(boss, player)`, e la funzione statica
`calculateDamage(base, multiplier)` (≥ 1): è il punto dove inserire in futuro moltiplicatori, danni elementali, riduzioni.

### 3.5 `src/systems/`

| File | Classe | Responsabilità |
|---|---|---|
| `CollisionSystem.ts` | `CollisionSystem` | `intersects(a, b)`, `applyGravityAndMove(object, dt, gravity, maxFallSpeed, platforms, mapWidth)` (gravità con **velocità media** del frame: la traiettoria del salto è esatta a qualsiasi FPS) e `moveAndCollide(object, dt, platforms, mapWidth)`: muove prima su X poi su Y, risolve le collisioni, impone i limiti della mappa, imposta `isOnGround`; piattaforme sospese (`oneWay`) attraversabili dal basso; `separateHorizontally(mover, obstacle, platforms, mapWidth)`: corpi solidi, spinge `mover` fuori dal lato del suo centro (o sposta l'ostacolo se `mover` è contro un muro). La usa `GameEngine.separatePlayerFromBodies()` per giocatore contro nemici a terra e boss, tranne durante la schivata (`Player.isDodging`) |
| `EnemyAISystem.ts` | `EnemyAISystem` | decide cosa fa ogni nemico (pattuglia, insegue, guardia, tira a distanza, vola e picchia, attacca); i nemici a terra evitano abissi, muri, spuntoni e acqua |
| `LevelManager.ts` | `LevelManager` | `loadLevel`, `loadLevelDefinition` (livelli fuori da `LEVEL_CONFIG`, per test e prove), `hasLevel`, `createEnemies`, `createBoss` (con `arenaMinX`), `lockArena`, `hazards`, `updateMovingPlatforms(ms, chi)` (muove le piattaforme mobili e trasporta chi ci sta sopra), `render` (sfondo, terreno, porta, cancello, pericoli), `renderForeground` (acqua davanti alle entità) |
| `ProjectileSystem.ts` (2.0) | `ProjectileSystem` | `spawn`, `update(dt, player, platforms, mapWidth, mapHeight, targets)` (restituisce gli eventi: colpito il giocatore, deviato dalla spada, schianto; per i proiettili del giocatore `hitTarget` e `dropAmmo`), `render`, `clear`. Il proiettile nemico passa attraverso il giocatore invulnerabile (schivata). Quelli del giocatore (Fase 2) colpiscono `targets` (nemici, boss, forzieri chiusi), si fermano al primo o trafiggono (`isPiercing`), e se recuperabili (`recoveredAsAmmoOf`) a fine corsa diventano munizioni a terra; Classi Fase 5: un proiettile del giocatore che uccide (non la scena) chiama `player.registerKill()` |
| `HazardSystem.ts` (2.0) | `HazardSystem` | `computePlayerEnvironment` (acqua o ghiaccio: modificatori del movimento), `applyContactDamage` (spuntoni) Fase 8: l'ambiente porta anche gli spuntoni come `dashStopZones`, dove gli scatti delle abilità si fermano. |
| `ItemManager.ts` | `ItemManager` | `loadItems`, `collectItems(player, scoreManager)` (applica gli effetti; salta gli oggetti da borsa, `ItemDefinition.storedInBag`), `findReachableBagItem(player)`, `findTouchedAmmoRefill(player)` (faretra, salta da `collectItems`: la raccoglie il motore), `addItem(tipo, x, y)` (pozione lasciata con Q), `removeItem(item)`, `render(..., player)` (suggerimento "E PRENDI ..." sopra la pozione toccata) |
| `ItemFactory.ts` (E1) | funzioni, `RandomSource`, `ITEM_BASE_PRICES` | oggetti: `createSeededRandom(seme)` (estrazioni ripetibili), `rollRarity(pesi, random)`, `createWeaponItem`/`createArmorItem`, `toWeaponItem` (un id diventa un'arma Comune), `cloneItem`, `rollAffixes`, `rollWeaponItem`/`rollArmorItem` (Leggendari e Mitici sono gli oggetti fissi del tipo; se non ce ne sono si scende di rarità), `createUniqueItem`, `findUniqueItems`, `getItemName` (tipo + nome del primo modificatore), `getItemBaseName`, `getItemIconSpriteId`, `areItemsEqual`, `getItemPrice`; Classi Fase 3: `getItemWeight(item)` (peso mostrato: armature da `ARMOR_CONFIG`, armi da `WEAPON_CONFIG`) |
| `EquipmentStats.ts` (E1-E2) | funzioni, `EMPTY_ARMOR`, `NO_EQUIPMENT_BONUSES`, `StatTotals`, `ItemStatLine` | effetti dell'equipaggiamento: `getArmorBaseStats` (statistiche base per la rarità), `getItemTotals`, `getActiveSets`, `computeEquipmentTotals`, `computeEquipmentBonuses(arma, armature)` (bonus **con i tetti**, per `Player`), `describeItemStats` (righe della scheda), `compareItemStats` (differenze con l'oggetto indossato) |
| `DropPlacement.ts` (2.5.1) | `findDropPoint`, `DropPoint` | posa del bottino: il primo terreno fermo e senza spuntoni sotto il punto di caduta; se non c'è (abisso, piattaforma mobile) il ripiego, cioè l'ultimo terreno fermo del giocatore (`GameEngine.getDropPoint` e `dropOnGround`) |
| `LootSystem.ts` (E5) | funzioni, `LootContext` | bottino: `getLootRarityWeights(contesto)` (pesi della fonte che crescono con livello e difficoltà), `rollLootRarity`, `rollLootWeapon`, `getArmorMaterialWeights(livello)`, `rollLootArmor`, `rollArmorDrop`, `rollFinalBossReward` (l'unica fonte dei Mitici); Classi Fase 2: `resolveLootWeaponId(classe, arma)` (filtro: un'arma vietata alla classe diventa il `lootSubstituteId` della sua cella, in ultima istanza l'arma iniziale; applicato a forzieri, élite, trofei, ricompensa finale e bottega; Classi Fase 3) e `rollManaPotionDrop(fonte, classe, random)` (solo per le classi con mana) |
| `WeaponPickupManager.ts` | `WeaponPickupManager` | oggetti a terra (armi e, da E2, armature, con la rarità: bagliore e nome colorati): `spawn(oggetto o weaponId, centerX, bottomY, isArmed)`, `update(dt, player)` (rende prendibili le armi lasciate quando il giocatore se ne allontana), `findReachablePickup(player)`, `take(pickup)`, `render` (con il suggerimento "E PRENDI ...") |
| `Inventory.ts` | `Inventory`, `BagSlot`, `BackpackEntry`, `InventorySnapshot`, `WeaponAddResult`, `SlotSelection`, `ArmorPickupOutcome`, `EquipmentActionOutcome` | (E1-E4) ogni arma della borsa è un oggetto (`BagSlot.item`, con `weaponId` per comodità), `equippedWeaponItem`, `weaponItems`; `addWeapon(id o oggetto)` con l'esito `replaced` (stesso tipo, oggetto diverso) e `droppedItem`; armature e **zaino**: `equippedArmor`, `backpackItems` (elenco degli oggetti), `addToBackpack(oggetto, ammo?)`, `removeFromBackpack` (Classi Fase 3: restituisce la `BackpackEntry` con le munizioni), `getBackpackAmmo(indice)`, `setCharacter(characterId)` (a ogni nuova partita) e `getMaxAmmo(armaId)` (massimo per classe), `equipFromBackpack` (esito `forbidden` per le armi vietate), `equipArmor`, `pickUpArmor` (indossa o mette nello zaino), `unequipArmor`, `takeArmor`, `equipFromBackpack`, `moveWeaponToBackpack`, `setArmorAndBackpack`; `snapshot()`/`restore()` comprendono armature e zaino (`InventorySnapshot.backpack` è `BackpackEntry[]`, con le munizioni). La borsa, solo logica: `bagSlots`, `equippedSlotIndex`, `equippedWeaponId`, `weaponIds`, `potionCount`, `reset(weaponIds, equipped)`, `addWeapon(id, ammo)` (posto libero, altrimenti al posto dell'arma in mano: `droppedWeaponId`, `droppedAmmo`; `duplicate` se c'è già, `refilled` se è un'arma con munizioni non piene), munizioni (`equippedAmmo`, `setEquippedAmmo`, `addAmmo`), `isMissingAmmo(id)` (2.1.1: l'arma è nella borsa e non è piena), `removeWeapon(id)` (giavellotti finiti; senza armi torna la spada), `dropSlot(i)` (tasto Q: l'arma con le munizioni o una pozione; mai l'ultima arma), `refillAllAmmo()` (faretra), `addPotion(potionId)`/`canAddPotion(potionId)`/`getPotionCount(potionId)` (Classi Fase 2: `BagSlot` pozione ha `potionId`; ogni tipo ha i suoi gruppi, limiti di `INVENTORY_CONFIG`), `selectSlot(i)`, `consumePotion(i)`, `snapshot()`/`restore()`. Il motore (`updatePickupsAndBag`, `pickUpWithE`, `useBagSlot`) applica gli effetti e ripristina la borsa di inizio livello quando si ricomincia |
| `ScoreManager.ts` | `ScoreManager` | `currentScore`, `addScore`, `restore(punti, monete?)` (senza monete restano quelle attuali), `reset`; Fase 6: `coins`, `addCoins`, `spendCoins` (false se non bastano) |
| `Shop.ts` (Fase 6) | `Shop`, `ShopOffer`, `PurchaseOutcome`, `ShopContext` | la bottega, solo logica: `Shop.open(armiTrovate, borsa, random, {levelId, difficulty, characterId})` (`armiTrovate` = `GameEngine.discoveredWeaponIds`, solo della partita in corso) (pozione, cura, faretra, un'arma trovata che non è nella borsa e, E5, un pezzo d'armatura: arma e armatura con rarità della fonte "shop", `ShopOffer.item`), `getPrice(offerta)` (arma e armatura +25% dopo ogni acquisto di equipaggiamento), l'arma comprata va nella borsa o nello zaino, `buy(indice, {inventory, player, scoreManager})` → `bought`/`notEnoughCoins`/`notNeeded`/`bagFull`/`soldOut`; Classi Fase 2: con `characterId` di una classe con mana la faretra è sostituita da `manaPotion` (35 monete), le armi passano da `resolveLootWeaponId` (il Mago trova sempre un bastone in vendita, che prende il posto del suo e lo manda nello zaino) e un'arma identica a una della borsa è rifiutata (`notNeeded`); controlla prima di spendere, così un acquisto inutile non costa monete |
| `WeaponAffinity.ts` (Classi Fase 3) | `getWeaponMaxAmmo`, `canWieldWeapon`, `describeWeaponAffinity`, `WeaponAffinityLine`, `FORBIDDEN_WEAPON_MESSAGE` | lettura della tabella di compatibilità: `getWeaponMaxAmmo(classe, arma)` (massimo per difetto, `undefined` = infinite), `canWieldWeapon(classe, arma)`, `describeWeaponAffinity(cella, arma)` (riga di classe: tono `bonus`/`malus`/`forbidden`, testo e voci, ad esempio "CLASSE: DANNO +15% MUNIZIONI +50%"), messaggio "NON PUOI USARLA" |
| `AmmoRegeneration.ts` (2.1.1) | `AmmoRegeneration` | ricarica passiva delle munizioni: `update(deltaTimeMs, definizione, borsa)` aggiunge una munizione ogni `intervalMs` all'arma `weaponId` (true quando l'aggiunge). Senza definizione, senza l'arma nella borsa o con l'arma piena il tempo si azzera; `reset()` |
| `AttributeStats.ts` (Classi Fase 0, formule dalla Fase 4) | `computeAttributeEffects(puntiSopraBase, haMana)`, `computeEffectiveAttributes`, `getPointsAboveBase`, `getWeaponScalingMultiplier`, `getWeaponScalingPercentFor`, `getWeaponSecondaryAttribute`, `getWeaponStrengthRequirement`, `getArmorStrengthRequirement`, `getItemStrengthRequirement`, `getCarryCapacity`, `computeStrengthPenalties` (`StrengthPenalties`, `NO_STRENGTH_PENALTIES`), `meetsGradeRequirement`, `combineCappedFraction`, `describeAttributeEffects` | solo calcoli, nessuno stato: trasformano i punti sopra la base negli effetti sulle statistiche (`StatModifierEffect[]`), danno dell'arma, requisiti e carico, gradi delle mosse; senza punti spesi non producono niente |
| `AttributePoints.ts` (Classi Fase 4) | `AttributePoints`, `AttributePointsSnapshot`, `SpendPointOutcome` | punti da spendere e punti spesi per attributo: `pointsForLevel(haBoss)` (3, più 2 con il boss), `award`, `spend(id, base)` (`"spent"`, `"noPoints"`, `"atMax"`), `reset`, `snapshot`, `restore` |
| `LivesManager.ts` | `LivesManager` | `remainingLives`, `hasLivesLeft`, `loseLife`, `addLife`, `reset` |
| `HighScoreManager.ts` | `HighScoreManager` | record nel browser (`localStorage`), tollerante agli errori; `bestScore`, `submitScore`, `reset` |
| `ProgressManager.ts` (2.0) | `ProgressManager`, `SAVE_VERSION` | ciò che passa da una partita all'altra: JSON `{ version, unlockedLevelId, difficulty, characterId }` nella chiave `ironAndShadow.progress`; tollerante a dati assenti, corrotti o archivio bloccato (un valore non valido torna a quello iniziale). Un salvataggio senza `version` uguale a `SAVE_VERSION` (2.0) conserva questi dati e si riscrive subito, scartando il resto. `unlockedLevelId`, `isLevelUnlocked`, `unlockLevel` (non torna indietro), `isCharacterUnlocked` (dal livello raggiunto; non si salva), `characterId` (il cavaliere se quello salvato è bloccato), `setCharacter`, `difficulty`, `setDifficulty`, `reset()`. Il record è in `HighScoreManager` |

### 3.6 `src/rendering/`

| File | Classe / funzioni | Responsabilità |
|---|---|---|
| `PixelPainter.ts` | `PixelPainter`, `DrawTextOptions` | primitive di disegno su qualsiasi canvas: `clear`, `fillRect` (arrotonda tutti i bordi: niente sfumature), `strokeRect`, `drawImage`, `fillDithered` (retino di due colori), `fillDitheredOverlay` (retino di un colore sopra ciò che c'è), `fillVerticalGradient` (gradiente a fasce), `fillCircle`, `fillGlow` (alone a anelli di retino), `drawText` (`shadowColor`, `rowColors` per le scritte a fasce) |
| `Renderer.ts` | `Renderer` (estende `PixelPainter`) | lo schermo: risoluzione fissa con scala intera **in pixel fisici** (tiene conto di `devicePixelRatio`), `drawDitherOverlay` (pausa), `applyLineWave` (ondulazione per riga) |
| `BitmapFont.ts` | `getGlyph`, `getGlyphRows`, `measureTextWidth` | font a pixel: maiuscole 5×7, minuscole con discendenti (9 righe in tutto), accentate italiane minuscole, spaziatura proporzionale con cifre a larghezza fissa |
| `PaletteEffects.ts` | `isDitherPixelOn`, `buildDitherTile`, `computeGradientBands`, `shadeColor`, `cycleRampColor`, `computeLineWaveOffset` | effetti di colore a 16 bit come funzioni pure (testabili senza browser) |
| `Camera.ts` | `Camera` | `follow(target, mapWidth, mapHeight)`: centra e limita ai bordi |
| `SpriteManager.ts` | `SpriteManager`, `SpriteColorVariant` | `registerSprite(id, righe, colori, anchorX)`, `drawSprite(..., variant)`, `drawSpriteAligned(..., flashColor, variant)` (E2-E3: una **variante di colore** cambia alcune chiavi; si compone alla prima richiesta e resta in memoria, così l'equipaggiamento non moltiplica i frame) (allinea lo sprite all'hitbox con l'ancora, anche specchiato), `drawSpriteSilhouette(..., colore)`, `getSpriteSize`, `getSpriteAnchorX`; crea le versioni specchiate e, alla prima richiesta, le sagome a tinta unita |
| `AnimationManager.ts` | `AnimationPlayer`, `AnimationDefinition` | riproduce un'animazione: `play`, `restart`, `update`, `currentFrameId`; durata per frame (`frameDurationsMs`) opzionale |
| `EffectsManager.ts` | `EffectsManager` | particelle, scritte, tremolio, hit-stop; Classi Fase 6A: `spawnSpriteEffect`, `spawnAfterimage`, `renderAfterimages` (prima del giocatore), `renderSpriteEffects` (dopo i proiettili) |
| `sprites/abilitySprites.ts` (Classi Fase 6A) | `registerAbilitySprites`, `WEAPON_TINT_COLORS`, `ABILITY_ICON_SIZE` | effetti delle mosse con quattro toni per elemento (chiavi `1`-`4`), barriere arcana e sacra, 20 icone 8×8; `WEAPON_TINT_COLORS` dà i colori della lama per elemento. Registrato all'avvio da `GameEngine` |
| `BackgroundRenderer.ts` | `BackgroundRenderer` | sfondi a 16 bit per `forest`, `castle`, `dungeon`, `swamp`, `ice`, `wasteland` (Fase 8: tramonto, `paintMesas`, `paintBones`, `createDust`), `tower`, `shop` (E6: `buildShop`, assi, travi, scaffali con vasi e pozioni, lanterne): 4-6 livelli di parallasse disegnati una volta in canvas da 640 px che si ripetono, più elementi animati (stelle, luna, torce, nebbia, lucciole, aurora, neve, fulmini, vetrate, bracieri) |
| `TerrainRenderer.ts` | `TerrainRenderer` | terreno e piattaforme con la tessitura dell'ambientazione (`THEME_STYLES`: erba, pietra, mattoni, fango, neve, pietra runica), piattaforme mobili, pericoli (spuntoni, ghiaccio, acqua in due tempi), porta d'uscita, cancello dell'arena |
| `sprites/spriteTools.ts` | funzioni | `createGrid`, `stampRows`, `setPixel`, `drawSword`, `drawSlashArc`, pose delle gambe, `addOutline` (contorno automatico), `remapSpriteKeys` (varianti) |
| `sprites/knightSprites.ts` | `registerKnightSprites`, `registerCharacterPreviews`, `getCharacterPreviewFrameId`, `KNIGHT_ANCHOR_X`, `KNIGHT_FIRE_SUFFIX`, `KNIGHT_CROUCH_SUFFIX` | cavaliere 24×30 (attacchi 44×30, lancia 58×30): parte superiore + gambe + arma; ancora alla colonna 7. `registerKnightSprites(spriteManager, personaggio)` compone **una serie completa di frame per ogni arma** (`WEAPON_VISUALS`: lunghezza rispetto alla spada, funzione di disegno, pose d'attacco, icona): le funzioni `compose*` disegnano l'arma e il busto attivi, quindi un frame aggiunto all'elenco vale per tutte le armi e tutti i personaggi. **Personaggi** (Fase 4, `CHARACTER_VISUALS`): stesso corpo del cavaliere, colori propri (stesse chiavi: armatura `d g s w`, sopravveste `m r o`, scudo `N B L`) e, se serve, le 12 righe della testa (`RANGER_HEAD_ROWS`, `BERSERKER_HEAD_ROWS`; il paladino ricolora il pennacchio). Pose delle abilità (`ABILITY_POSES`, otto: arma alzata, colpo a terra, affondo e, dalla Fase 6A, lancio a mano aperta `Cast`, arco teso `Draw`, carica `Windup`, colpo di scudo `Bash` con `shiftX`, ginocchio a terra `Kneel`) comuni a tutte le armi. Classi Fase 6A: le gambe dipendono dal personaggio (`LegSet`, `activeLegs`, al posto delle costanti `LEGS_*`); `CharacterVisual` ha `torsoRows` e `legs`; il Mago ha la veste lunga (`MAGE_LEGS` da `composeRobeLegs`), barba sul petto, mantello senza stemma e cappello con fascia e stella. **Equipaggiamento** (E2): la testa usa le chiavi dell'elmo `1`-`4` (`HELMET_TONE_KEYS`; il cappuccio del ranger `h H i` diventa `2 3 4`), le gambe `5`-`7` (`BOOT_TONE_KEYS`), il busto resta `d g s w` (`CHEST_TONE_KEYS`): le righe sono scritte come prima, la sostituzione avviene componendo i frame (`characterBodyRows`, `bootRows`), e `characterColors` dà alle nuove chiavi i colori di sempre. Lo spadone (E3) usa le pose della spada in frame larghi 54 (`GREATSWORD_POSES`). Id di uno sprite: frame + `Crouch` (attacco da accovacciati) + suffisso dell'arma + suffisso del personaggio + `Fire`. Una serie è di circa 600 sprite: il motore registra quella di un personaggio quando serve (`GameEngine.ensureCharacterSprites`) e, all'avvio, solo i due frame d'attesa di ognuno per i menu (`registerCharacterPreviews`). Registra anche le icone 16×16 delle armi. `Player.getRenderedFrameId()` sceglie il frame |
| `sprites/weaponShapes.ts` | `drawSpear`, `drawAxe`, `drawMace`, `drawBow`, `drawCrossbow`, `drawGreatsword` (E3), `drawStaff` (Classi Fase 2), `WeaponDrawer` | forme delle armi della Fase 1 dalla mano alla punta (metallo con le chiavi della lama `b`, `v`: il fuoco e la rarità le ricolorano; ferro scuro `j` e corda `q` hanno chiavi proprie) |
| `sprites/equipmentVisuals.ts` (E2-E3) | `buildEquipmentVariant`, `getItemIconVariant`, `getWeaponRarityColors`, `getArmorTones`, `getArmorPieceColors`, `ARMOR_ICON_TONE_KEYS` | aspetto dell'equipaggiamento, **solo ricolorazioni**: il metallo delle armi prende i colori della rarità; ogni pezzo d'armatura ricolora la sua parte del personaggio con i toni del materiale e, da Non comune, il tono più chiaro della rarità |
| `sprites/enemySprites.ts` | `registerEnemySprites` | umanoidi da `SPECS` (`HumanoidSpec`: parte superiore, pose delle gambe, colori, arma spada o arco, mano, ancora): scheletro, arciere, goblin, soldato, golem; pipistrello disegnato a metà e specchiato; lupo e melme con le forme procedurali di `creatureTools.ts` Fase 8: `weapon: "thrown"` (accetta del predone: attacco corto, l'arma vola via), avvoltoio (ali del pipistrello e corpo proprio, `composeVultureHalf`), scorpione (`composeScorpion`). |
| `sprites/creatureTools.ts` (2.0) | `composeWolf`, `composeBlob`, `composeScorpion` (Fase 8), `fillShadedEllipse` | creature non umanoidi composte da ellissi ombreggiate e rettangoli, con contorno automatico: lo stesso codice disegna il lupo (scala 1) e il Re dei Lupi (scala 2) |
| `sprites/bossSprites.ts` | `registerBossSprites`, `BOSS_SPRITE_STYLES`, `BOSS_SPRITE_SHAPES` | quattro forme (`BOSS_SPRITE_SHAPES`, se manca: `knight`): **knight** cavaliere corazzato 36×41 (Cavaliere Nero), **witch** strega con veste e bastone, **sorcerer** stregone incappucciato con corona e spada d'ombra (36×44), **beast** lupo gigante 60×42 (hitbox 40×24). La forma impone la hitbox; i colori di ogni boss sono in `BOSS_SPRITE_STYLES` con le chiavi della sua forma |
| `sprites/projectileSprites.ts` | `registerProjectileSprites` | freccia, dardo magico (2 frame), palla di fuoco (2 frame) |
| `sprites/itemSprites.ts`, `uiSprites.ts` | funzioni | oggetti 8×8 ombreggiati, forziere chiuso e aperto (`chestClosed`, `chestOpen`, 16×12), icone 16×16 delle armature (`armorIconHelmet`, `armorIconChest`, `armorIconBoots`, chiavi `1`-`4` del materiale, E2); icone dell'HUD (`hudLife`, `hudHeart`, `hudSkull`); Classi Fase 2: `itemManaPotion`; Classi Fase 4: `shopAltar` (16×20, l'altare degli attributi, rifinito nella Fase 6A) |

**Come si descrive uno sprite.** Uno sprite è una lista di righe di testo; `.` è trasparente, ogni altra lettera è una
chiave della mappa dei colori:

```ts
const COIN_ROWS = [
  "..kkkk..",
  ".kyyyyk.",
  // ...
];
spriteManager.registerSprite("itemCoin", COIN_ROWS, { k: PALETTE.black, y: PALETTE.yellow });
```

`registerSprite` controlla che tutte le righe abbiano la stessa lunghezza e che ogni lettera abbia un colore:
altrimenti lancia un errore con il nome dello sprite. I test controllano anche che ogni colore usato sia della palette.

**Stile 16 bit degli sprite.** Ogni materiale ha 2-4 tonalità della stessa rampa (luce in alto a sinistra), il contorno è
nero (`k`), le scie dei colpi sono doppie (bianca e colorata). Per i personaggi si passa anche l'**ancora** (quarto parametro):
la colonna in cui inizia l'hitbox quando lo sprite guarda a destra. Esempio del cavaliere: lo sprite è largo 24 pixel, l'hitbox 12,
l'ancora 7; nei frame d'attacco (larghi 44) l'ancora resta 7 e la spada occupa le colonne in più a destra. Lo sprite poggia sempre
sul fondo dell'hitbox: ciò che è più alto dell'hitbox (pennacchio, corna) sporge sopra.

### 3.7 `src/ui/`

| File | Classe | Responsabilità |
|---|---|---|
| `HUDManager.ts` | `HUDManager`, `drawOrnateFrame`, `HEALTH_SEGMENT_GEOMETRY`, `STAMINA_BAR_GEOMETRY`, `STAMINA_BAR_WITH_MANA_GEOMETRY`, `MANA_BAR_GEOMETRY`, `ABILITY_BOX_GEOMETRY`, `TITLE_GOLD_ROWS` | pannello superiore (cuore e salute a 10 segmenti, vite, monete (Fase 6), barra della stamina (Fase 5) e un riquadro per ogni mossa con il numero del tasto (`HUDData.abilities[]`, passo 11 px, `ABILITY_SLOT_KEY_LABELS`; numero rosso se le risorse non bastano, riquadro grigio se il grado richiede più Intelligenza (`meetsRequirement`), bordo dorato sullo slot scelto se le mosse sono più d'una; Classi Fase 5: lucchetto se `isKnown` è falso); Classi Fase 2: con `maxMana > 0` stamina e mana stanno su due barre da 3 px (`HUDData.mana`, `maxMana`), livello, punteggio dorato; Classi Fase 4: `HUDData.unspentAttributePoints` mostra "+N PUNTI" sotto il pannello a sinistra), borsa sotto il pannello a destra (`BAG_SLOT_GEOMETRY`, `getBagSlotX`: riquadri numerati, arma in mano con la cornice dorata, numero di pozioni), power-up attivi con la barra del tempo, barra del boss con teschio e tacche di fase, riquadri decorati dei messaggi |
| `PentagonChart.ts` (Classi Fase 4) | `getPentagonVertices`, `getPolygonSpans`, `getLinePixels`, `fillPolygon`, `strokePolygon`, `drawLine` | geometria del pentagono a pixel interi (poligoni pieni e contorni con righe di pixel, senza forme del canvas) |
| `MenuManager.ts` | `MenuManager<TCommand>` | menu verticale: `update(input)` restituisce il comando confermato, `render(...)` (voce scelta in bianco-oro con frecce); l'etichetta di una voce può essere una funzione (testo che cambia) |
| `ScreenManager.ts` | `ScreenManager`, `getCharacterRatings`, `ATTRIBUTE_CHART_COLORS`, `ATTRIBUTES_LAYOUT`, `AttributesView`, `AttributeRowView` (Classi Fase 4: schermata `attributes`, comandi `showAttributes`, `assignAttributePoint`, `closeAttributes`; `selectedAttributeId`; "FOR n" nella scheda), `WEAPON_AFFINITY_TONE_COLORS` (Classi Fase 3: colori della riga di classe; `EquipmentView.characterId`, `ShopOfferView.classLine`, "PESO n" nella scheda) | schermate titolo (con personaggio e difficoltà nel menu), controlli, **selezione dei livelli** (cursore solo sui livelli sbloccati, `selectedLevelId`), **scelta del personaggio** (Fase 4: A/D o W/S circolari, parte dal personaggio salvato, `selectedCharacterId`; comandi `showCharacterSelect`, `confirmCharacter`; **bottega** (Fase 6: elenco con cursore circolare, `selectedShopIndex`, comandi `buyShopOffer`, `leaveShop`; la scelta del personaggio rifiuta quelli bloccati e li disegna come sagome); **conferma di "Cancella dati"** (`confirmReset`, voce predefinita "no", comandi `showResetConfirm`, `resetAllData`; `showNotice` mostra "DATI CANCELLATI" sul titolo); le tacche da 1 a 5 vengono da `getCharacterRatings`, calcolate dai valori di `CHARACTER_CONFIG`), pausa (E4: ultima voce *Equipaggiamento*, comando `showEquipment`), Game Over, vittoria; **schermata dell'equipaggiamento** (E4: `EquipmentView`, `EquipmentCell`, `EQUIPMENT_LAYOUT`, `selectedEquipmentCell`; frecce tra armature, borsa e zaino, comandi `equipmentUse`, `equipmentDrop`, `closeEquipment`; scheda dell'oggetto con `describeItemStats` e confronto con `compareItemStats`); usa un `MenuManager` per ciascuna; riceve dal motore `ScreenData` (anche `difficultyName`, `characterId`, `levels` ed `equipment`) |

### 3.8 `src/types/`

| File | Tipi |
|---|---|
| `ItemTypes.ts` (E1-E2) | `RarityId`, `RolledRarityId`, `ArmorSlot`, `ArmorMaterialId`, `ArmorId`, `AffixId`, `AffixRoll`, `WeaponItem`, `ArmorItem`, `ItemInstance`, `EquippedArmor`, `EquipmentBonuses` |
| `GameTypes.ts` | `GameStateName` (E4: `equipment`; Classi Fase 4: `attributes`), `GameAction` (Classi Fase 4: `openAttributes` = P, `assignPoint` = J, nel contesto menu; E4: `openEquipment`; 2.1: `ability1`-`ability4`), `InputContext`, `Vector2`, `Rectangle`, `FacingDirection`, `InputSource` |
| `EntityTypes.ts` | `PlayerState`, `PlayerEnvironment`, `PowerUpId`, `AmmoRegenerationDefinition` (2.1.1), `PlayerStatName` (anche `maxHealthBonus`, `maxStaminaBonus`, `maxManaBonus` e, Classi Fase 4, `attackRecoveryPercent`, `dodgeCostReductionPercent`, `abilityPowerPercent`, `manaRegenPercent`, `spellCostReductionPercent`, `defensePercent`, `staminaRegenPercent`, `resistancePercent`), `AbilityGrade`, `ModifierSourceId`, `AttributeId`, `Attributes`, `AttributeDefinition`, `AttributeEffectPerPoint`, `WeaponCategoryId`, `WeaponAffinity` (`ammoMultiplier`, `lootSubstituteId`; Classi Fase 3), `StatModifierEffect`, `PowerUpDefinition`, `ActivePowerUp` (e nei nemici `lunge`, `splitInto`, `armor`), `EnemyState`, `EnemyBehavior`, `EnemyTypeId`, `ProjectileTypeId`, `RangedAttackDefinition`, `FlightDefinition`, `ProjectileDefinition`, `ProjectileLaunch`, `SummonRequest`, `EnemyDefinition`, `AttackDefinition` (`elements`, Classi Fase 2; `breaksGuard`, `crushesArmor`, `plunge`, `projectile`, `charge`), `ProjectileDefinition` (`isPiercing`, `recoveredAsAmmoOf`), `ProjectileLaunch` (`owner`, `speedMultiplier`, `hit`), `WeaponDefinition` (`ammo`, `spellFocus`), `SpellFocusDefinition` (Classi Fase 2), `HitProperties`, `ComboDefinition` (`name`), `WeaponDefinition` (`air`), `WeaponId`, `AttackInputAction`, `WeaponDefinition`, `CharacterId`, `CharacterDefinition` (Fase 4; `usesSpellFocus`, Classi Fase 2; `staminaPerWeaponHit`, `lowHealthPower`, `manaPerKill`, Classi Fase 5), `ElementId`, `ElementModifiers`, `SynergyId`, `SynergyDefinition` (Classi Fase 5), `HitProperties.elements`, `PowerUpDefinition.element` (Fase 7), `AbilityId`, `AbilityDefinition` (`cost`, `modifiers`, `grade`), `AbilityBase`, `ResourceCost`, `AbilityModifier`, `GuardOutcome`, `AttackDefinition.dash` (Fase 5), `Damageable`, `BossAttackKind`, `BossAttackDefinition` (e i 4 tipi di attacco), `BossPhaseDefinition`, `BossDefinition` |
| `LevelTypes.ts` | `ThemeId` (8 ambientazioni, con `wasteland` e `shop`), `TerrainTexture` (6 tessiture), `ThemeStyle`, `ItemTypeId`, `PlatformDefinition`, `MovingPlatformDefinition`, `HazardKind`, `HazardDefinition`, `EnemySpawnDefinition` (`elite`, `weaponDrop`), `ChestSpawnDefinition`, `ItemSpawnDefinition`, `CompletionCondition`, `LevelDefinition` (`chests`) |

---

## 4. Flussi di esecuzione

### 4.1 Avvio
`index.html` carica lo script → `main.ts` cerca il canvas → `new GameEngine(canvas).start()` → il costruttore
registra gli sprite, carica il livello 1, crea giocatore/nemici/oggetti → `start()` collega la tastiera e avvia il `GameLoop`.

### 4.2 Un frame (`GameEngine.update`, poi `render`)
1. `GameLoop` calcola `deltaTimeSeconds` e chiama `update`.
2. Se `playing` e c'è un hit-stop attivo: si scala solo il suo tempo e si esce (senza consumare gli input).
3. In `playing`: ESC mette in pausa; altrimenti `updatePlaying`. In `paused`: ESC riprende, altrimenti menu. Negli altri stati: menu.
4. `input.endFrame()` azzera "premuto adesso".
5. `render()`: mondo (con tremolio) → HUD → messaggi di livello → schermata dello stato.

### 4.3 `updatePlaying` (l'ordine conta)
piattaforme mobili (trasportano chi ci sta sopra) → ambiente del giocatore (acqua, ghiaccio) → `player.update` → spuntoni →
effetti di movimento (polvere) → punto sicuro → arena del boss → combattimento (`processPlayerAttack` → effetti/punti →
IA dei nemici → `enemy.update`, proiettili lanciati e melme che si dividono → attacchi nemici → boss, i suoi proiettili e i suoi evocati →
`projectileSystem.update` → rimozione dei morti) → oggetti → effetti di danno → ripartenza dopo la morte o caduta →
completamento del livello → camera.

Ordine di disegno del mondo: livello (sfondo, terreno, pericoli) → oggetti → nemici → boss → sagome degli scatti → giocatore → proiettili →
effetti a sprite delle mosse → acqua in primo piano (con ondulazione) → effetti.

### 4.4 Un colpo del giocatore
`Player.handleInput` memorizza l'input (`bufferAttack`, solo se l'attacco può partire entro `attackBufferMs`) → quando possibile `startAttack` chiede a `ComboManager` l'attacco →
durante `hitStartMs…hitEndMs` `getActiveAttackHitbox()` restituisce l'area d'urto → `CombatSystem.processPlayerAttack`
la confronta con i bersagli → `target.receiveHit(...)` (qui nemici e boss risolvono le sinergie; se il bersaglio muore, `player.registerKill()`) → il motore genera scintille, hit-stop, tremolio e, se il nemico
muore, punti e popup.

### 4.5 Morte e fine partita
Salute 0 → stato `dead` → dopo `deathDurationMs` `isReadyToRespawn` → `handlePlayerDeath`: toglie una vita; se ne restano,
`restartCurrentLevel` (ripristina punteggio, monete, borsa, punti attributo e mosse note di inizio livello e ricarica il livello); altrimenti `finishRun("gameOver")`
registra il record e cambia stato.

### 4.6 Fine livello
`checkLevelCompletion`: raggiungere `exitX` oppure boss sconfitto (`isDefeated`) → `levelPhase = "completed"`, bonus, cura e, se c'è un livello successivo, i punti attributo (`AttributePoints.pointsForLevel`: 3, più 2 con il boss; "+N PUNTI ATTRIBUTO" nel riquadro) →
dopo il messaggio `advanceToNextLevel`: se c'è un livello successivo apre la bottega (`Shop.open`) e, con `SHOP_ROOM_CONFIG.isEnabled`,
entra nella **stanza del negozio** (`enterShopRoom`: carica `SHOP_ROOM_LEVEL` con `loadLevelDefinition`, niente nemici, `isInShopRoom`;
**E** vicino a un piedistallo chiama `buyFromShopRoom`, vicino all'altare (`isNearShopAltar`) apre lo stato `attributes` in modalità spesa; raggiunta la porta `checkLevelCompletion` chiama `leaveShop`, che avvia `startLevel(id + 1)`);
altrimenti lo stato `shop` (bottega a menu). Senza livello successivo: `finishRun("victory")` (la ricompensa del boss finale è solo il trofeo mostrato nel riquadro di fine livello).

### 4.7 Equipaggiamento (piano E1-E6)
- **Un solo punto di applicazione**: `GameEngine.equipFromInventory()` passa al giocatore l'arma in mano (`equipWeapon(definizione, munizioni, oggetto)`)
  e le armature (`setArmor`); `Player.refreshEquipment()` ricalcola `computeEquipmentBonuses` e la variante di colore (`buildEquipmentVariant`).
  I bonus entrano in salute e stamina massime, danno, elementi e "rompe la guardia" dei colpi, danno subito (difesa e resistenze, minimo 1),
  velocità, recupero tra gli attacchi e furto di vita (`registerDamageDealt`, chiamato da `handlePlayerHit`).
- **Mosse** (Classi Fase 5): boss e forzieri insegnano la mossa successiva in `handlePlayerHit` e `openChest`.
- **Bottino**: `handlePlayerHit` e `openChest` usano `LootSystem` con `this.lootRandom` (sostituibile nei test); i trofei dei boss sono
  `weaponReward.items` (arma e armatura) e compaiono all'inizio del livello successivo.
- **Solo per la partita**: armi, armature e zaino non si salvano; `resetRunEquipment()` li azzera a ogni nuova partita (e dà all'inventario la classe con `setCharacter`). Il ripristino di inizio livello (`InventorySnapshot`) comprende armature e zaino.
- **Aggiungere un oggetto Leggendario o Mitico**: una voce in `LEGENDARY_ITEMS` o `MYTHIC_ITEMS` (tipo di base esistente, modificatori
  entro i tetti di `AFFIX_CONFIG`); l'aspetto viene dai colori della rarità. **Aggiungere un pezzo d'armatura**: una voce in `ARMOR_CONFIG`
  (l'id è materiale + posto); un materiale nuovo vuole anche `ARMOR_MATERIALS` (quattro toni della palette) e `ARMOR_SETS`.

---

## 5. Relazioni tra componenti

```
main.ts ──► GameEngine ──┬─► GameLoop            (chiama update/render)
                         ├─► GameState           (stati)
                         ├─► InputManager        (tasti) ──► Player (come InputSource)
                         ├─► LevelManager ──► LEVEL_CONFIG, BackgroundRenderer, crea Enemy / Boss
                         ├─► Player / Enemy[] / Boss ──► CollisionSystem, AnimationPlayer
                         ├─► EnemyAISystem ──► Enemy (decide), Player (osserva)
                         ├─► CombatSystem ──► Damageable (Enemy, Boss), Player
                         ├─► ItemManager ──► Item, ScoreManager, Player
                         ├─► ScoreManager, LivesManager, HighScoreManager
                         ├─► EffectsManager      (solo grafica + hit-stop)
                         ├─► HUDManager, ScreenManager (MenuManager)
                         └─► Renderer, Camera, SpriteManager
config/*  ◄── letto da quasi tutti; non dipende da nessuno (solo da types/)
```

Regola di dipendenza: `config` e `types` non importano la logica; la logica importa la configurazione.

---

## 6. Esempi pratici

Ogni esempio indica: **file da aprire**, **cosa cercare**, **codice originale**, **codice aggiornato**,
**spiegazione** e **risultato atteso**. Gli esempi sono **indipendenti**: ciascuno parte dal codice originale
del progetto (applicandone più d'uno bisogna fare attenzione agli stessi punti).

Dopo ogni modifica: `npm run typecheck` per controllare gli errori, `npm run dev` per provare.

### Esempio 1 – Aumentare la salute del giocatore

**Obiettivo:** salute massima da 100 a 150.

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `PLAYER_CONFIG` e la riga `maxHealth`.

Codice originale:
```ts
export const PLAYER_CONFIG = {
  maxHealth: 100,
```
Codice aggiornato:
```ts
export const PLAYER_CONFIG = {
  maxHealth: 150,
```

**Spiegazione.** Il cavaliere (`CHARACTER_CONFIG.knight`) legge `maxHealth` da `PLAYER_CONFIG`, e `Player` lo usa sia per la
salute massima sia per quella iniziale (`currentHealth`). Gli altri personaggi hanno la propria salute in `characterConfig.ts`. La barra dell'HUD ha sempre 10 segmenti e si adatta da sola alla salute massima. Pozioni (+30)
e cura di fine livello (+30) valgono invece lo stesso numero di punti: ora pesano di meno in percentuale.

**Risultato atteso:** il cavaliere parte con 150 HP, la barra è piena con 10 segmenti, ogni segmento ne vale 15.
Il gioco diventa più facile; per ribilanciare rilanciare `npm run balance`.

### Esempio 2 – Modificare la velocità

**Obiettivo:** velocità di camminata da 80 a 100 px/s.

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `movementSpeed`.

Codice originale:
```ts
  /** Velocità orizzontale in pixel/secondo. */
  movementSpeed: 80,
```
Codice aggiornato:
```ts
  /** Velocità orizzontale in pixel/secondo. */
  movementSpeed: 100,
```

**Spiegazione.** `Player.applyHorizontalInput` imposta `velocityX = direzione × movementSpeed` (del personaggio: il cavaliere la
legge da `PLAYER_CONFIG`; poi moltiplicata per arma, ambiente e power-up). Il movimento usa il
delta time, quindi 100 px/s restano 100 px/s a qualsiasi frequenza di aggiornamento. Con più velocità si salta più
lontano: gli abissi (≤ 36 px) restano superabili.

**Risultato atteso:** in 1 secondo il cavaliere percorre 100 px invece di 80; la schivata (160 px/s) resta più veloce della corsa.

### Esempio 3 – Modificare la forza del salto

**Obiettivo:** salto più alto (da circa 53 a circa 64 px).

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `jumpForce`.

Codice originale:
```ts
  /** Velocità iniziale del salto (pixel/secondo verso l'alto). */
  jumpForce: 310,
```
Codice aggiornato:
```ts
  /** Velocità iniziale del salto (pixel/secondo verso l'alto). */
  jumpForce: 340,
```

**Spiegazione.** `Player.applyJumpInput` assegna `velocityY = -jumpForce`; la gravità (`GAME_CONFIG.gravity`, 900)
frena la salita. L'altezza massima è `jumpForce² / (2 × gravity)`: 310 → ≈ 53 px, 340 → ≈ 64 px.
Rilasciando il tasto durante la salita l'altezza si riduce (`jumpCutMultiplier`).

**Risultato atteso:** il salto raggiunge circa 64 px. Attenzione: i livelli sono progettati per un salto di circa 50 px;
con più altezza si possono raggiungere zone pensate come irraggiungibili.

### Esempio 4 – Modificare il danno della spada

**Obiettivo:** attacco leggero da 15 a 20 e pesante da 30 a 40.

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `lightAttackDamage` e `heavyAttackDamage`.

Codice originale:
```ts
  lightAttackDamage: 15,
  heavyAttackDamage: 30,
```
Codice aggiornato:
```ts
  lightAttackDamage: 20,
  heavyAttackDamage: 40,
```

**Spiegazione.** `ATTACK_DEFINITIONS` usa questi valori: `swordLight1` e `swordLight2` fanno `lightAttackDamage`,
`swordLight3` (il finale della combo) ne fa il doppio, `swordHeavy` fa `heavyAttackDamage`. Per cambiare **un solo**
attacco si modifica il suo `damage` dentro `ATTACK_DEFINITIONS`.

**Risultato atteso:** la combo `tripleSlash` infligge 20 + 20 + 40 = 80 invece di 60; l'attacco pesante 40.
Scheletro (40 HP) e Goblin (25 HP) cadono con meno colpi.

### Esempio 5 – Modificare le combo

**Obiettivo:** aggiungere una seconda combo: J, J, **K** (due fendenti e un attacco pesante).

#### Passo 1 – `src/config/playerConfig.ts`

**Cerca:** `COMBO_DEFINITIONS`.

Codice originale:
```ts
    attackIds: ["swordLight1", "swordLight2", "swordLight3"],
    comboWindowMs: 400,
  },
];
```
Codice aggiornato:
```ts
    attackIds: ["swordLight1", "swordLight2", "swordLight3"],
    comboWindowMs: 400,
  },
  {
    id: "heavyFinisher",
    inputSequence: ["attack", "attack", "heavyAttack"],
    attackIds: ["swordLight1", "swordLight2", "swordHeavy"],
    comboWindowMs: 400,
  },
];
```

**Spiegazione.** Una combo è una sequenza di azioni (`inputSequence`, valori di `GameAction`) e gli attacchi
corrispondenti (`attackIds`, chiavi di `ATTACK_DEFINITIONS`). `ComboManager` confronta gli input premuti con l'inizio
di ogni combo: dopo "J, J" sono possibili entrambe, e la terza pressione decide (J → `tripleSlash`,
K → `heavyFinisher`). `comboWindowMs` è il tempo massimo tra la fine di un colpo e il successivo. Per rendere più o meno
severa una combo basta cambiare quel numero (es. 600 per concatenare più facilmente).

**Risultato atteso:** J, J, K esegue le animazioni `attack1`, `attack2`, `attackHeavy`; J ×3 funziona come prima.

### Esempio 6 – Aggiungere un nuovo nemico

**Obiettivo:** il **Bruto**, un nemico lento e molto forte (90 HP, 20 di danno), che pattuglia una zona, usando il corpo
del soldato con colori rossi.

Servono 6 passi: tipo, statistiche, animazioni, sprite (2 punti) e posizione nel livello.

#### Passo 1 – `src/types/EntityTypes.ts`

**Cerca:** `EnemyTypeId`.

Codice originale:
```ts
  | "vulture";
```
Codice aggiornato:
```ts
  | "vulture"
  | "brute";
```

#### Passo 2 – `src/config/enemyConfig.ts`

**Cerca:** `ENEMY_CONFIG`, in fondo alla voce `iceGolem` (l'ultima).

Codice originale:
```ts
    armor: { damageMultiplier: 0.5, breakDamage: 30 },
  },
};
```
Codice aggiornato:
```ts
    armor: { damageMultiplier: 0.5, breakDamage: 30 },
  },
  brute: {
    id: "brute",
    name: "Bruto",
    maxHealth: 90,
    attackDamage: 20,
    movementSpeed: 20,
    detectionRange: 60,
    attackRange: 22,
    attackCooldownMs: 1800,
    attackWindupMs: 700,
    attackActiveMs: 200,
    attackRecoveryMs: 500,
    hurtDurationMs: 100,
    knockbackSpeed: 20,
    attackInterruptWindowMs: 0,
    patrolDistance: 40,
    behavior: "patrol",
    scoreReward: 300,
    hitbox: { x: 0, y: 0, width: 12, height: 24 },
  },
};
```

#### Passo 3 – `src/config/animationConfig.ts`

**Cerca:** `ENEMY_ANIMATIONS`.

Codice originale:
```ts
  vulture: createEnemyAnimations("vulture"),
};
```
Codice aggiornato:
```ts
  vulture: createEnemyAnimations("vulture"),
  brute: createEnemyAnimations("brute"),
};
```

#### Passo 4 – `src/rendering/sprites/enemySprites.ts` (tipo dell'identificativo)

**Cerca:** la prima riga `import` che contiene `enemyConfig`, poi `idPrefix` nell'interfaccia `HumanoidSpec`.

Codice originale:
```ts
import { ENEMY_CONFIG } from "../../config/enemyConfig";
```
Codice aggiornato:
```ts
import { ENEMY_CONFIG } from "../../config/enemyConfig";
import type { EnemyTypeId } from "../../types/EntityTypes";
```

#### Passo 5 – `src/rendering/sprites/enemySprites.ts` (l'interfaccia)

**Cerca:** `idPrefix:` dentro `interface HumanoidSpec`.

Codice originale:
```ts
  idPrefix: "skeleton" | "goblin" | "soldier" | "skeletonArcher" | "iceGolem" | "raider";
```
Codice aggiornato:
```ts
  idPrefix: EnemyTypeId;
```

#### Passo 6 – `src/rendering/sprites/enemySprites.ts` (lo sprite)

**Cerca:** `SPECS`, in fondo alla voce `raider` (l'ultima).

Codice originale:
```ts
    weapon: "thrown",
    restingTip: { dx: 2, dy: -6 },
  },
];
```
Codice aggiornato:
```ts
    weapon: "thrown",
    restingTip: { dx: 2, dy: -6 },
  },
  {
    idPrefix: "brute",
    bodyRows: SOLDIER_BODY_ROWS,
    colors: {
      k: PALETTE.black,
      s: PALETTE.red,
      g: PALETTE.purple,
      w: PALETTE.orange,
      r: PALETTE.black,
      y: PALETTE.yellow,
      d: PALETTE.black,
    },
    bladeKeys: { grip: "y", blade: "w", edge: "w", guard: "y" },
    handX: 17,
    handY: 15,
  },
];
```

#### Passo 7 – `src/config/levelConfig.ts`

**Cerca:** nel livello 2 (`Castello Medievale`), l'ultimo nemico dell'elenco `enemies`.

Codice originale:
```ts
      { type: "goblin", position: { x: 1680, y: 184 } },
```
Codice aggiornato:
```ts
      { type: "goblin", position: { x: 1680, y: 184 } },
      { type: "brute", position: { x: 1620, y: 176 } },
```

**Spiegazione.** `EnemyTypeId` è un'unione di stringhe: aggiungere `"brute"` obbliga TypeScript a segnalarti
dove manca qualcosa (`ENEMY_CONFIG` e `ENEMY_ANIMATIONS` sono `Record<EnemyTypeId, ...>`). I nemici umanoidi condividono lo
schema degli sprite: `registerHumanoid` genera da solo idle, camminata, attacco (largo quanto serve alla portata
`attackRange`), danno e morte; basta fornire corpo e colori. La y di partenza è
`200 − altezza dell'hitbox` (qui 176) perché il nemico poggi sul terreno. Il comportamento `patrol` usa
`patrolDistance` come raggio della zona; `attackInterruptWindowMs: 0` lo rende "corazzato" (i colpi non lo interrompono).

**Risultato atteso:** nel livello 2, vicino alla fine, un cavaliere rosso e viola pattuglia 40 px attorno al suo punto,
colpisce con 20 di danno dopo 700 ms di preparazione e vale 300 punti.

### Esempio 7 – Modificare il comportamento di un nemico

**Obiettivo:** far inseguire il giocatore allo scheletro (invece di pattugliare), con raggio di vista di 120 px.

#### Passo 1 – `src/config/enemyConfig.ts` (raggio)

**Cerca:** la voce `skeleton`, riga `detectionRange`.

Codice originale:
```ts
    detectionRange: 80,
    attackRange: 20,
```
Codice aggiornato:
```ts
    detectionRange: 120,
    attackRange: 20,
```

#### Passo 2 – `src/config/enemyConfig.ts` (comportamento)

**Cerca:** nella voce `skeleton`, `behavior: "patrol"` (subito dopo `patrolDistance: 60`).

Codice originale:
```ts
    patrolDistance: 60,
    behavior: "patrol",
```
Codice aggiornato:
```ts
    patrolDistance: 60,
    behavior: "chase",
```

**Spiegazione.** `EnemyAISystem` sceglie la funzione in base a `behavior`: `patrol` (zona fissa),
`chase` (aspetta, poi insegue entro `detectionRange` e smette oltre `detectionRange × loseInterestMultiplier`, cioè 1,5),
`guard` (fermo, attacca a portata). Per far restare un nemico fermo ma pericoloso si usa `guard`. Con `chase` il valore
`patrolDistance` non viene usato.

**Risultato atteso:** lo scheletro resta fermo finché non entri nei 120 px, poi ti insegue (a 30 px/s) anche fuori
dalla vecchia zona di pattuglia; non cammina nel vuoto.

### Esempio 8 – Aggiungere un oggetto raccoglibile

**Obiettivo:** l'**Elisir**: cura 60 HP e dà 100 punti. Si trova nel livello 1.

#### Passo 1 – `src/types/LevelTypes.ts`

**Cerca:** `ItemTypeId`.

Codice originale:
```ts
  | "powerShock";
```
Codice aggiornato:
```ts
  | "powerShock"
  | "elixir";
```

#### Passo 2 – `src/config/itemConfig.ts`

**Cerca:** `ITEM_CONFIG`, in fondo alla voce `quiver` (la faretra, l'ultima).

Codice originale:
```ts
    refillsAmmo: true,
  },
};
```
Codice aggiornato:
```ts
    refillsAmmo: true,
  },
  elixir: {
    id: "elixir",
    name: "Elisir",
    spriteId: "itemElixir",
    healAmount: 60,
    scoreBonus: 100,
  },
};
```

#### Passo 3 – `src/rendering/sprites/itemSprites.ts`

**Cerca:** `registerItemSprites`.

Codice originale:
```ts
export function registerItemSprites(spriteManager: SpriteManager): void {
```
Codice aggiornato:
```ts
const ELIXIR_ROWS = [
  "..kkkk..",
  "...kk...",
  ".kbbbbk.",
  "kbcccbbk",
  "kbcwcbbk",
  "kbcccbbk",
  ".kbbbbk.",
  "..kkkk..",
];

export function registerItemSprites(spriteManager: SpriteManager): void {
  spriteManager.registerSprite("itemElixir", ELIXIR_ROWS, ITEM_COLORS);
```

#### Passo 4 – `src/config/levelConfig.ts`

**Cerca:** nel livello 1 (`Foresta Oscura`), l'ultimo oggetto dell'elenco `items`.

Codice originale:
```ts
      { type: "scoreCoin", position: { x: 1270, y: 120 } },
```
Codice aggiornato:
```ts
      { type: "scoreCoin", position: { x: 1270, y: 120 } },
      { type: "elixir", position: { x: 1000, y: 192 } },
```

**Spiegazione.** `ItemManager.collectItems` legge `healAmount`, `scoreBonus` e l'eventuale `coins` dalla definizione:
non serve scrivere altra logica. Lo sprite è 8×8 e usa le lettere dei colori di `ITEM_COLORS` (`k w r y c b`).
La posizione `y` è `superficie − 8`: sul terreno (y = 200) l'oggetto sta a 192. Anche il popup "+60 HP" del motore
funziona da solo perché `healAmount > 0`.

**Risultato atteso:** nel livello 1, a x ≈ 1000, una boccetta blu: toccarla cura 60 HP, dà 100 punti e mostra "+60 HP".

### Esempio 9 – Aggiungere un nuovo livello

**Obiettivo:** inserire un nuovo livello ("Rovine Antiche", ambientazione castello) **prima** del dungeon del Cavaliere Nero,
che diventa il livello 4. Poiché gli `id` devono restare consecutivi, i livelli successivi (palude, picchi, lande, torre) vanno
rinumerati (passi 2-5).

#### Passo 1 – `src/config/levelConfig.ts`

**Cerca:** l'inizio del livello del dungeon: `id: 3` con `name: "Dungeon Sotterraneo"`.

Codice originale:
```ts
  {
    id: 3,
    name: "Dungeon Sotterraneo",
```
Codice aggiornato:
```ts
  {
    id: 3,
    name: "Rovine Antiche",
    theme: "castle",
    width: 1280,
    height: 240,
    playerStart: { x: 24, y: 176 },
    platforms: [
      // terreno con due abissi (x 420-456 e 860-896)
      { x: 0, y: 200, width: 420, height: 40 },
      { x: 456, y: 200, width: 404, height: 40 },
      { x: 896, y: 200, width: 384, height: 40 },
      // piattaforme sospese
      { x: 180, y: 164, width: 48, height: 8, oneWay: true },
      { x: 240, y: 128, width: 48, height: 8, oneWay: true },
      { x: 520, y: 164, width: 48, height: 8, oneWay: true },
      { x: 940, y: 164, width: 48, height: 8, oneWay: true },
      { x: 1000, y: 128, width: 48, height: 8, oneWay: true },
      // blocco di pietra
      { x: 640, y: 172, width: 28, height: 28 },
    ],
    enemies: [
      { type: "skeleton", position: { x: 300, y: 176 } },
      { type: "goblin", position: { x: 560, y: 184 } },
      { type: "soldier", position: { x: 700, y: 176 } },
      { type: "goblin", position: { x: 960, y: 184 } },
      { type: "skeleton", position: { x: 1100, y: 176 } },
    ],
    items: [
      { type: "scoreCoin", position: { x: 260, y: 120 } },
      { type: "healthPotion", position: { x: 470, y: 192 } },
      { type: "collectible", position: { x: 1020, y: 120 } },
    ],
    completion: { kind: "reachExit", exitX: 1240 },
    hasBoss: false,
  },
  {
    id: 4,
    name: "Dungeon Sotterraneo",
```

#### Passo 2 – `src/config/levelConfig.ts`

**Cerca:** l'inizio della Palude Maledetta.

Codice originale:
```ts
    id: 4,
    name: "Palude Maledetta",
```
Codice aggiornato:
```ts
    id: 5,
    name: "Palude Maledetta",
```

#### Passo 3 – `src/config/levelConfig.ts`

**Cerca:** l'inizio dei Picchi Ghiacciati.

Codice originale:
```ts
    id: 5,
    name: "Picchi Ghiacciati",
```
Codice aggiornato:
```ts
    id: 6,
    name: "Picchi Ghiacciati",
```

#### Passo 4 – `src/config/levelConfig.ts`

**Cerca:** l'inizio delle Lande Desolate.

Codice originale:
```ts
    id: 6,
    name: "Lande Desolate",
```
Codice aggiornato:
```ts
    id: 7,
    name: "Lande Desolate",
```

#### Passo 5 – `src/config/levelConfig.ts`

**Cerca:** l'inizio della Torre dell'Ombra.

Codice originale:
```ts
    id: 7,
    name: "Torre dell'Ombra",
```
Codice aggiornato:
```ts
    id: 8,
    name: "Torre dell'Ombra",
```

**Spiegazione.** Un livello è solo un oggetto dati: nessun codice del motore cambia. Regole da rispettare:
gli `id` sono consecutivi da 1 (il motore passa a `id + 1` e dopo l'ultimo mostra la vittoria); gli abissi non più larghi di
circa 36 px; le piattaforme non più di circa 44 px sopra una superficie da cui salire; i nemici e gli oggetti poggiano su una
superficie (nemico: `y = superficie − altezza hitbox`; oggetto: `y = superficie − 8`); l'uscita (`exitX`) sta su un tratto di terreno.
Le ambientazioni disponibili sono `forest`, `castle`, `dungeon`, `swamp`, `ice`, `wasteland`, `tower`. Il dungeon (ora livello 4)
mantiene boss, arena e posizioni invariate. Si può anche aggiungere un livello in fondo all'elenco (id 8) senza rinumerare: diventerebbe
l'ultimo, giocato dopo il Signore dell'Ombra.

**Risultato atteso:** dopo il Castello Medievale compare "LIVELLO 3 – ROVINE ANTICHE"; raggiunta la porta in fondo si
passa al Dungeon (ora livello 4) con il Cavaliere Nero, poi a Palude (5), Picchi (6), Lande (7) e Torre (8); vinto il Signore dell'Ombra,
la vittoria.

### Esempio 10 – Aggiungere un boss

**Obiettivo:** il **Re Scheletro**, un boss a **tre fasi**, che prende il posto del Cavaliere Nero nel livello del dungeon.

#### Passo 1 – `src/config/enemyConfig.ts`

**Cerca:** `BOSS_CATALOG`, in fondo al file.

Codice originale:
```ts
export const BOSS_CATALOG: Record<string, BossDefinition> = {
  [BOSS_CONFIG.id]: BOSS_CONFIG,
  [SWAMP_WITCH_CONFIG.id]: SWAMP_WITCH_CONFIG,
  [WOLF_KING_CONFIG.id]: WOLF_KING_CONFIG,
  [LANDS_LORD_CONFIG.id]: LANDS_LORD_CONFIG,
  [SHADOW_LORD_CONFIG.id]: SHADOW_LORD_CONFIG,
};
```
Codice aggiornato:
```ts
const SKELETON_KING_CONFIG: BossDefinition = {
  id: "skeletonKing",
  name: "RE SCHELETRO",
  maxHealth: 360,
  movementSpeed: 34,
  activationRange: 220,
  attacks: [
    { id: "charge", kind: "charge", damage: 18, speed: 150, minDistance: 70, windupMs: 800, activeMs: 600, recoveryMs: 800 },
    { id: "slash", kind: "melee", damage: 22, range: 36, windupMs: 650, activeMs: 200, recoveryMs: 450 },
  ],
  attackCooldownMs: 1500,
  hitFlashMs: 100,
  deathDurationMs: 1500,
  scoreReward: 1500,
  hitbox: { x: 0, y: 0, width: 24, height: 40 },
  phases: [
    { healthPercentThreshold: 100, speedMultiplier: 1, cooldownMultiplier: 1, attackWeights: { charge: 0.2, slash: 0.8 } },
    { healthPercentThreshold: 66, speedMultiplier: 1.15, cooldownMultiplier: 0.85, attackWeights: { charge: 0.4, slash: 0.6 } },
    { healthPercentThreshold: 33, speedMultiplier: 1.4, cooldownMultiplier: 0.7, attackWeights: { charge: 0.6, slash: 0.4 } },
  ],
};

export const BOSS_CATALOG: Record<string, BossDefinition> = {
  [BOSS_CONFIG.id]: BOSS_CONFIG,
  [SWAMP_WITCH_CONFIG.id]: SWAMP_WITCH_CONFIG,
  [WOLF_KING_CONFIG.id]: WOLF_KING_CONFIG,
  [LANDS_LORD_CONFIG.id]: LANDS_LORD_CONFIG,
  [SHADOW_LORD_CONFIG.id]: SHADOW_LORD_CONFIG,
  [SKELETON_KING_CONFIG.id]: SKELETON_KING_CONFIG,
};
```

#### Passo 2 – `src/rendering/sprites/bossSprites.ts`

**Cerca:** `BOSS_SPRITE_STYLES`.

Codice originale:
```ts
    c: PALETTE.wine,
    p: PALETTE.purple,
  },
  swampWitch: {
```
Codice aggiornato:
```ts
    c: PALETTE.wine,
    p: PALETTE.purple,
  },
  skeletonKing: {
    k: PALETTE.black,
    n: PALETTE.slate,
    d: PALETTE.gray,
    s: PALETTE.lightGray,
    w: PALETTE.white,
    r: PALETTE.cyan,
    e: PALETTE.cyan,
    y: PALETTE.yellow,
    c: PALETTE.violetDark,
    p: PALETTE.violet,
  },
  swampWitch: {
```

#### Passo 3 – `src/config/levelConfig.ts`

**Cerca:** nel livello del dungeon, la riga `bossSpawn`.

Codice originale:
```ts
    bossSpawn: { x: 1320, y: 160 },
```
Codice aggiornato:
```ts
    bossId: "skeletonKing",
    bossSpawn: { x: 1320, y: 160 },
```

**Spiegazione.** Il catalogo `BOSS_CATALOG` associa un id a una `BossDefinition`; il livello sceglie il boss con `bossId`
(se omesso: Cavaliere Nero). Le animazioni (`BOSS_ANIMATIONS`) e gli sprite (`registerBossSprites`) si generano da soli per ogni
boss del catalogo, con il nome `<id>Idle1`, `<id>SlashA`, ecc.; per questo serve solo la mappa colori in `BOSS_SPRITE_STYLES`
(lettere: `k` contorno, `n` ombra profonda, `d` armatura, `s` luci, `w` corna e lama, `r` dettagli, `e` bagliore degli occhi e della scia,
`y` impugnatura e finiture, `c` e `p` mantello in ombra e in luce: tutte devono avere un colore). **Le fasi** sono l'elenco
`phases`, ordinato per soglia decrescente: una fase è attiva quando la salute in % scende sotto la sua soglia; l'HUD mostra
una tacca sulla barra per ogni soglia sotto il 100. Il Re Scheletro non è in `BOSS_SPRITE_SHAPES`, quindi usa la forma
`knight` (hitbox 24×40 obbligatoria). Per un'altra silhouette si sceglie una forma esistente (`witch`, `sorcerer`, `beast`) con la sua hitbox e i colori
con le chiavi di quella forma; una forma del tutto nuova richiede di disegnarne i frame in `bossSprites.ts`.
Gli attacchi sono dati: il Re Scheletro usa gli stessi tipi del Cavaliere Nero (carica e fendente) con numeri diversi; per
dargli anche un ventaglio di proiettili o un'evocazione basta aggiungere un attacco `projectile` o `summon` in `attacks` e il
suo peso in `attackWeights` delle fasi (vedi la tabella degli attacchi in 3.1).

**Risultato atteso:** nel dungeon l'avversario è un Re Scheletro (360 HP, armatura grigia, occhi azzurri) che cambia
comportamento a 66% e 33% di salute; la barra mostra due tacche.

### Esempio 11 – Aggiungere una nuova animazione

**Obiettivo:** un'animazione di **esultanza** (`cheer`): alla fine di un livello il cavaliere alza la spada, saltellando.

Servono: un nuovo stato del giocatore, due sprite, la definizione dell'animazione, la logica nel `Player` e la chiamata del motore.

#### Passo 1 – `src/types/EntityTypes.ts`

**Cerca:** `PlayerState`.

Codice originale:
```ts
  | "crouch"
  | "guard"
  | "dead";
```
Codice aggiornato:
```ts
  | "crouch"
  | "guard"
  | "cheer"
  | "dead";
```

#### Passo 2 – `src/rendering/sprites/knightSprites.ts`

**Cerca:** `registerKnightSprites`, il frame `knightIdle2`.

Codice originale:
```ts
    knightIdle2: composeKnightFrame(activeLegs.stand, 1),
```
Codice aggiornato:
```ts
    knightIdle2: composeKnightFrame(activeLegs.stand, 1),
    knightCheer1: composeAttackFrame({ tipX: 13, tipY: 0 }),
    knightCheer2: composeAttackFrame({ tipX: 13, tipY: 0, bodyDrop: 1 }),
```

#### Passo 3 – `src/config/animationConfig.ts`

**Cerca:** `PLAYER_ANIMATIONS`, la voce `idle`.

Codice originale:
```ts
  idle: { frameIds: ["knightIdle1", "knightIdle2"], frameDurationMs: 500, loop: true },
```
Codice aggiornato:
```ts
  idle: { frameIds: ["knightIdle1", "knightIdle2"], frameDurationMs: 500, loop: true },
  cheer: { frameIds: ["knightCheer1", "knightCheer2"], frameDurationMs: 250, loop: true },
```

#### Passo 4 – `src/entities/Player.ts` (variabile)

**Cerca:** `deathElapsedMs`.

Codice originale:
```ts
  private deathElapsedMs = 0;
```
Codice aggiornato:
```ts
  private deathElapsedMs = 0;
  private isCelebrating = false;
```

#### Passo 5 – `src/entities/Player.ts` (funzione)

**Cerca:** il commento di `respawnAt`.

Codice originale:
```ts
  /** Riporta il giocatore in una posizione, fermo (usato per cadute e nuovi livelli). */
```
Codice aggiornato:
```ts
  /** Il giocatore esulta: ignora i comandi e mostra l'animazione "cheer". */
  public celebrate(): void {
    this.isCelebrating = true;
    this.cancelAttack();
    this.velocityX = 0;
    this.animationPlayer.restart("cheer");
  }

  /** Riporta il giocatore in una posizione, fermo (usato per cadute e nuovi livelli). */
```

#### Passo 6 – `src/entities/Player.ts` (fine dell'esultanza)

**Cerca:** dentro `respawnAt`, le ultime due righe.

Codice originale:
```ts
    this.jumpBufferRemainingMs = 0;
    this.currentState = "idle";
```
Codice aggiornato:
```ts
    this.jumpBufferRemainingMs = 0;
    this.isCelebrating = false;
    this.currentState = "idle";
```

#### Passo 7 – `src/entities/Player.ts` (niente comandi mentre esulta)

**Cerca:** in `update`, il primo `if (this.isDead)`.

Codice originale:
```ts
    if (this.isDead) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
```
Codice aggiornato:
```ts
    if (this.isDead || this.isCelebrating) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
```

#### Passo 8 – `src/entities/Player.ts` (stato)

**Cerca:** `updateState`.

Codice originale:
```ts
    if (this.isDead) {
      this.currentState = "dead";
    } else if (this.hurtRemainingMs > 0) {
```
Codice aggiornato:
```ts
    if (this.isDead) {
      this.currentState = "dead";
    } else if (this.isCelebrating) {
      this.currentState = "cheer";
    } else if (this.hurtRemainingMs > 0) {
```

#### Passo 9 – `src/core/GameEngine.ts` (inizio dell'esultanza)

**Cerca:** `checkLevelCompletion`, la riga del bonus.

Codice originale:
```ts
      this.scoreManager.addScore(GAME_CONFIG.levelCompleteBonus);
```
Codice aggiornato:
```ts
      this.scoreManager.addScore(GAME_CONFIG.levelCompleteBonus);
      this.player.celebrate();
```

#### Passo 10 – `src/core/GameEngine.ts` (aggiornare il giocatore durante il messaggio)

**Cerca:** `updatePlaying`, il blocco `levelPhase === "completed"`.

Codice originale:
```ts
    if (this.levelPhase === "completed") {
      this.effects.update(deltaTimeSeconds);
```
Codice aggiornato:
```ts
    if (this.levelPhase === "completed") {
      this.effects.update(deltaTimeSeconds);
      this.player.update(
        deltaTimeSeconds,
        this.input,
        this.collisionSystem,
        this.levelManager.platforms,
        this.levelManager.level.width
      );
```

**Spiegazione.** Un'animazione si compone di tre pezzi. **(1) Sprite:** nuove righe registrate con `registerSprite`
(qui si riusa `composeAttackFrame`, la funzione che disegna il cavaliere con la spada sollevata). **(2) Definizione:**
una voce in `PLAYER_ANIMATIONS` con i `frameIds`, la durata di ogni frame e se si ripete (`loop`). **(3) Logica:** un valore
di `PlayerState` e un punto in cui il `Player` sceglie quell'animazione: `getAnimationName()` restituisce per
default il nome dello stato, quindi lo stato `"cheer"` seleziona da solo l'animazione `"cheer"`. Il motore, durante il
messaggio di fine livello, prima non aggiornava il giocatore: il passo 10 lo fa andare avanti.

**Risultato atteso:** raggiunta la porta (o sconfitto il boss) il cavaliere si ferma e alterna due pose con la spada in alto
finché non parte il livello successivo.

### Per saperne di più – Dare grafica a una mossa nuova

Questa guida **non è verificata** da `npm run verify-docs` (non ha il formato "Codice originale / Codice aggiornato"). Una mossa nuova ha già la sua voce in `ABILITY_CONFIG` (`abilityConfig.ts`). La grafica è tutta dati:

1. **Icona.** In `src/rendering/sprites/abilitySprites.ts` aggiungi l'icona 8×8 a `ABILITY_ICONS` (otto righe di otto caratteri, colori di `ICON_COLORS`). Il tipo `Record<AbilityId, ...>` segnala l'icona mancante.
2. **Voce visiva.** In `src/config/abilityVisualConfig.ts` aggiungi la voce a `ABILITY_VISUAL_CONFIG`, per esempio una mossa che lancia un lampo di fuoco e lascia una fiamma:
```ts
  emberStrike: {
    iconSpriteId: "abilityIconEmberStrike",
    weaponTint: "fire",
    cues: [effect("castFire", 0, 16, HAND), effect("flameSlash", 200, 18, 8)],
  },
```
   `atMs` è l'istante dall'inizio della mossa (entro la durata dell'attacco), `offsetX` è in avanti rispetto al personaggio, `offsetY` parte dalla testa (`FEET` = piedi, `HAND` = mano). Per le sagome di uno scatto usa `...afterimages(PALETTE.lilac, 60, 120)`. Una guardia non ha `cues` ma `guardFrameIds` (due frame della barriera).
3. **Effetto nuovo (solo se serve).** Aggiungi l'id a `AbilityEffectId`, la voce a `ABILITY_EFFECT_CONFIG` (frame, durata, allineamento) e la forma a `EFFECT_SOURCES` in `abilitySprites.ts` (una funzione `compose*` e il tono dell'elemento). Gli effetti esistenti bastano quasi sempre.
4. **Pose.** Il corpo usa le animazioni in `animationConfig.ts` (`ABILITY_POSES` in `knightSprites.ts` ha le otto pose comuni): scegli quella più vicina, non servono frame nuovi.
5. **Verifica.** `npm test -- classes-phase6` controlla che ogni mossa abbia icona, effetti con istanti validi e sprite registrati; `npm run test:browser` controlla la palette.

Nessun passo tocca il combattimento: `Player.drainAbilityEffects` e `GameEngine.showAbilityEffects` leggono la voce da soli.

---

## 7. Verifica degli esempi

```bash
npm run verify-docs
```

Lo script `tools/verifyManualExamples.mjs` legge questo file e, per ogni esempio:

1. controlla che ogni "Codice originale" compaia **una sola volta** nel file indicato (se il codice cambia, l'esempio va aggiornato);
2. applica le modifiche a una **copia temporanea** del progetto (il tuo codice non viene toccato);
3. esegue il controllo dei tipi (`tsc --noEmit`);
4. esegue un controllo del **comportamento** specifico dell'esempio (per es. "la salute massima è 150", "il Bruto infligge 20 di danno",
   "il livello 3 è percorribile da un bot", "il Re Scheletro ha tre fasi");
5. stampa l'esito di ciascun esempio.

Controlli che richiedono il browser (per esempio come appare uno sprite) non fanno parte dello script: per quelli si prova il gioco con `npm run dev`.

Per **provare** un esempio senza modificare il tuo progetto:

```bash
npm run verify-docs -- --export 6 /percorso/della/cartella
```

scrive nella cartella indicata una copia del progetto con l'esempio 6 già applicato (poi `npm install` e `npm run dev` in quella cartella).

---

## 8. Problemi comuni

| Sintomo | Causa probabile |
|---|---|
| Errore TypeScript su `Record<EnemyTypeId, ...>` dopo aver aggiunto un nemico | manca la voce in `ENEMY_CONFIG` o in `ENEMY_ANIMATIONS` |
| "Sprite non registrato: xyz" | l'id in un'animazione non corrisponde a uno sprite registrato |
| "Sprite xyz: righe di lunghezza diversa" | una riga di testo dello sprite è più corta o più lunga delle altre |
| "Sprite xyz: colore 'q' non definito" | una lettera dello sprite non è nella mappa dei colori |
| "Livello non trovato" o il gioco finisce troppo presto | gli `id` dei livelli non sono consecutivi da 1 |
| Un nemico cade nel vuoto o sta a mezz'aria | la sua `y` non è `superficie − altezza dell'hitbox` |
| Il gioco non parte con il doppio clic su `index.html` della cartella principale | si deve aprire `dist/index.html` dopo `npm run build`, non l'`index.html` dei sorgenti |
