# Changelog

## 2.6.0 – Classi, Fase 6A: grafica delle mosse (2026-11-26)
Solo grafica: danni, costi, tempi e hitbox restano quelli di prima, `npm run balance` identico al baseline.
### Aggiunto
- **Aspetto delle mosse come dati** (`src/config/abilityVisualConfig.ts`): `ABILITY_VISUAL_CONFIG` ha una voce per ogni mossa (icona 8×8, tinta della lama, effetti con istante e punto d'appoggio, sagome degli scatti, barriera delle guardie); `ABILITY_EFFECT_CONFIG` descrive 17 effetti (anelli di polvere, fuoco, gelo e shock, lampi di lancio, nuvole di polvere e arcane, fulmine, scie di velocità, fendenti di fiamma e di sangue).
- **Sprite delle mosse** (`src/rendering/sprites/abilitySprites.ts`): effetti con quattro toni per elemento, barriere arcana e sacra, 20 icone, `WEAPON_TINT_COLORS`. Nessun colore nuovo fuori palette.
- **Pipeline degli effetti**: `Player.drainAbilityEffects`, `GameEngine.showAbilityEffects`, `EffectsManager.spawnSpriteEffect`, `spawnAfterimage`, `renderAfterimages` (prima del giocatore) e `renderSpriteEffects` (dopo i proiettili).
- **Lama tinta** dell'elemento durante la mossa (variante di colore sopra le armature) e **barriera della guardia** come sprite, bianca nella finestra della parata perfetta.
- **Cinque pose nuove** (`ABILITY_POSES`): lancio a mano aperta, arco teso, carica, colpo di scudo, ginocchio a terra; animazioni delle mosse in `animationConfig.ts`.
- **Proiettili**: il dardo di fuoco è una cometa (`projectileFirebolt1-3`); nuovi `fireArrow`, `frostArrow`, `poisonArrow` (valori della freccia del giocatore, sprite propri) per le frecce del Ranger.
- Test: `tests/unit/classes-phase6.test.mjs` (31 controlli); `config-integrity` registra anche gli sprite delle mosse.
### Modificato
- **HUD**: il riquadro 10×10 mostra l'icona della mossa; il numero del tasto passa sopra il riquadro (`ABILITY_KEY_LABEL_Y`); sagoma grigia senza requisito; la ricarica è un retino scuro. `HUDData.abilities` ha `iconSpriteId`.
- **Mago ridisegnato**: veste lunga fino ai piedi (l'orlo ondeggia), barba sul petto, mantello senza stemma, cappello con fascia e stella, bastone con punte d'oro. Hitbox, ancore e altezza dei frame invariati.
- `knightSprites.ts`: le gambe dipendono dal personaggio (`LegSet`, `activeLegs` al posto delle costanti `LEGS_*`); `CharacterVisual` ha `torsoRows` e `legs`.
- Altare della bottega rifinito.
- Documenti: GAME_MANUAL (HUD, mosse, Mago), ARCHITECTURE (grafica delle mosse), CODE_MANUAL (file nuovi, Esempio 11 con `activeLegs.stand`, guida "Dare grafica a una mossa nuova"), TESTING, FEATURES.
- Versione portata a 2.6.0 (`package.json`, `GAME_CONFIG.version` e documenti).
### Verificato
- Gate verde: `npm run typecheck`, `npm test` (1511 controlli in 36 file), `npm run test:browser` (180 controlli), `npm run verify-docs`; `npm run balance` identico al baseline (solo grafica).

## 2.5.1 – Veleno e bruciatura uccidono, bottino a terra (2026-11-26)
### Corretto
- Il danno nel tempo (veleno, bruciatura) non si ferma più a 1 HP: nemici e boss muoiono. La morte vale come un colpo del giocatore: punti, monete, oggetti lasciati, trofeo e mossa del boss, mana del Mago (`GameEngine.handleStatusKill` e `rewardDefeat`; prima la regola "lascia almeno 1 HP" era voluta, perché le ricompense partivano solo da un colpo).
- Il bottino di nemici e boss non resta più sospeso in aria (nemici uccisi in volo) né sopra gli abissi: si posa sul terreno sottostante, oppure sull'ultimo terreno fermo del giocatore (nuovo `src/systems/DropPlacement.ts`; vale anche per l'armatura laterale dei forzieri e le pozioni di mana).
- Test: `tests/unit/drop-placement.test.mjs` (11 controlli).
### Modificato
- Simulatore: anche le morti da danno nel tempo chiamano `Player.registerKill`; baseline aggiornato (cambiano poco le righe con elementi: bottino del Cavaliere, Ranger e Mago).
- Versione portata a 2.5.1 (`package.json`, `GAME_CONFIG.version` e documenti).
### Verificato
- `npm test` (1480 controlli in 35 file), `npm run test:browser`, `npm run balance`, `npm run typecheck`, `npm run verify-docs`.

## 2.5.0 – Classi, Fase 5: contenuto per classe, mosse da imparare, passivi e sinergie (2026-11-26)
Quattro mosse per ogni classe, un passivo e le sinergie elementali. Tutti i numeri sono provvisori (Classi Fase 6B).
### Aggiunto
- **Dodici mosse** (`ABILITY_CONFIG`), tutte di grado 1, con le animazioni delle pose comuni. In ordine di tasto (7/8/9/0): Cavaliere onda d'urto, affondo, colpo di scudo (fulmine), lama ardente (fuoco); Ranger tiro in ritirata, freccia velenosa, freccia gelida, freccia di fuoco (senza munizioni); Berserker carica furiosa, ascia rovente (fuoco), terremoto (fulmine), colpo di sangue (costa 15 di salute); Paladino scudo, martello sacro (fulmine), consacrazione (fuoco), giudizio gelido (gelo).
- **Mosse da imparare** (`ABILITY_UNLOCK_CONFIG`): si parte con 2; la 3ª e la 4ª si imparano in ordine da un forziere (25%) o da un boss (sempre). Popup "NUOVA MOSSA: ..." e riga nel riquadro di fine livello. Valgono per la sola partita e stanno nello snapshot di inizio livello. Slot chiuso: lucchetto nell'HUD e popup "MOSSA NON ANCORA IMPARATA".
- **Costo in salute**: popup "SALUTE INSUFFICIENTE" se non resterebbe almeno 1 HP.
- **Passivi** (`CharacterDefinition`): Cavaliere `staminaPerWeaponHit` 4 (corpo a corpo), Berserker `lowHealthPower` (+25% di danno sotto il 40% di salute), Mago `manaPerKill` 10 (`Player.registerKill`, da `CombatSystem` e `ProjectileSystem`). Paladino e Ranger invariati.
- **Sinergie elementali** (`ELEMENT_SYNERGIES`, `StatusEffects.consumeSynergy`, nemici e boss): Frantumare (gelo + colpo che rompe la guardia o schiaccia le corazze), shock termico (gelo + fuoco), sovraccarico (bruciatura + fulmine), detonazione (veleno + fuoco). +50% di danno, l'effetto si consuma, una per colpo; un colpo con lo stesso elemento dell'effetto non la innesca.
- Test: `tests/unit/classes-phase5.test.mjs` (129 controlli).
### Modificato
- **Il Mago parte con due incantesimi** (dardo di fuoco e nova di gelo); balzo arcano e barriera si imparano.
- La scritta del tratto nella scheda del Cavaliere, del Berserker e del Mago descrive il passivo.
- L'HUD mostra quattro riquadri per ogni classe.
- **Simulatore**: nuova opzione `knownAbilities` di `playLevel`; nelle partite complete si parte con 2 mosse e se ne impara una per boss (i forzieri non si contano); duelli, boss e livelli singoli le hanno tutte. Baseline `tools/balance-baseline.txt` aggiornato. Cambia quasi solo il Mago, più forte per il passivo del mana e lo shock termico (nova e dardo): senza bottino il rusher passa da 13% a 95% di partite vinte e il medio da 93% a 100%; con il bottino 83% → 90% e 88% → 93%. Le build del Cavaliere cambiano di pochissimo, le altre sezioni sono identiche. Da bilanciare nella Fase 6B (vedi `BALANCE.md`).
- Test adattati: classes-phase0, classes-phase4, elements, mage-phase2, stamina-abilities.
- Versione portata a 2.5.0 (`package.json`, `GAME_CONFIG.version` e documenti).
### Verificato
- `npm test` (1467 controlli in 34 file), `npm run test:browser` (180 controlli), `npm run balance`, `npm run typecheck`, `npm run verify-docs`.

## 2.4.0 – Classi, Fase 4: attributi, requisiti di Forza, punti e pentagono (2026-11-26)
Cinque attributi con effetti veri, punti da spendere all'altare della bottega e una schermata a pentagono.
### Aggiunto
- **Attributi** (`ATTRIBUTE_CONFIG`: Forza, Destrezza, Intelligenza, Vitalità, Tempra), da 0 a `ATTRIBUTE_MAX_VALUE` (20). Basi per classe in `CHARACTER_CONFIG.baseAttributes` (somma 25): Cavaliere 6/5/2/6/6, Ranger 3/9/3/4/6, Berserker 9/4/1/8/3, Paladino 6/2/4/7/6, Mago 2/4/10/4/5. Base neutra: gli effetti contano solo i punti **sopra la base**, quindi chi non spende punti gioca come nella 2.3.
- **Effetti per punto speso**: DES recupero -1% e costo della schivata -1,5%; INT potenza delle mosse 7-0 +2% (tutte le classi) e, solo per chi ha mana, mana +4, rigenerazione del mana +3%, costo degli incantesimi -1% (`onlyWithMana`); VIT salute +4 e difesa +0,5%; TEM stamina +4, recupero della stamina +3%, resistenze +1%. Difesa (25%), resistenze (60%) e recupero (30%) condividono il tetto con l'equipaggiamento (`AFFIX_CONFIG`, `combineCappedFraction`). Otto `PlayerStatName` percentuali nuove; `PlayerModifiers` ha le basi nuove, `getAttributeBonus` e `onPowerUpsChanged`.
- **Danno delle armi** (`WEAPON_SCALING_CONFIG`): +3% per punto sull'attributo principale (`scalingAttribute`), +1% sul secondario (Forza per corpo a corpo e bastone, Destrezza per armi a distanza e da lancio), solo sugli attacchi dell'arma.
- **Requisiti di Forza morbidi** (`STRENGTH_REQUIREMENT_CONFIG`): armi da Forza di peso 3 o più, Forza richiesta (peso - 2) × 3 (lancia 3, ascia e mazza 6, spadone 9), -4% di danno e +4% di recupero per punto mancante; armature, Forza richiesta pari al peso del pezzo, -3% di velocità per punto mancante sommato sui pezzi; tetto 40%. **Carico** (`CARRY_CONFIG`): 8 + Forza su arma in mano e armature indossate, -3% di velocità per punto in più, tetto 30%. Avvisi "FORZA INSUFFICIENTE (-n)" alla raccolta e nell'equipaggiamento; "FOR n" nella scheda (rosso se non basta).
- **Gradi delle mosse**: `AbilityDefinition.grade` (1-3; tutte le mosse attuali di grado 1) e requisito rigido di Intelligenza 12 (grado 2) e 16 (grado 3) in `SPELL_GRADE_INT_REQUIREMENT`: riquadro grigio nell'HUD e popup "INTELLIGENZA INSUFFICIENTE".
- **Power-up**: `PowerUpDefinition.attributeBonuses` (punti di attributo temporanei, entro il 20). Nessun power-up nuovo.
- **Punti attributo** (`src/systems/AttributePoints.ts`): 3 a fine livello, più 2 se il livello aveva un boss, solo se c'è un livello successivo; i boss sono nei livelli 3-7, quindi 26 punti spendibili in una partita. Uguali a ogni difficoltà, azzerati a nuova partita, salvati nello snapshot di inizio livello (ricominciando il livello tornano com'erano). Riquadro di fine livello "+N PUNTI ATTRIBUTO"; HUD "+N PUNTI" sotto il pannello a sinistra.
- **Altare** nella stanza della bottega (`SHOP_ROOM_CONFIG.altar`, x 330, sprite provvisorio `shopAltar` in `uiSprites.ts`): **E** vicino apre il pentagono in modalità spesa (frecce su/giù, **J** o Invio assegna un punto, Esc chiude; nessuna ridistribuzione). Il messaggio della bottega ha la riga dell'altare e i punti da spendere.
- **Schermata degli attributi**: nuovo stato `attributes` (da `playing` e da `equipment`); dall'equipaggiamento **P** (azione `openAttributes`, `KeyP`; `assignPoint` = `KeyJ`, entrambe nel contesto menu) la apre in sola lettura. Pentagono a pixel (`src/ui/PentagonChart.ts`) con base, punti spesi e bonus dei power-up in tre colori della palette (`ATTRIBUTE_CHART_COLORS`), elenco a destra, effetti dell'attributo scelto, carico e requisiti in fondo.
- **Simulatore**: opzione `spentAttributes` di `playLevel` e nuova sezione "BUILD" (`npm run balance -- --build`): Cavaliere con l'onda d'urto, tutti i punti in Forza, Intelligenza, Vitalità o nessuno; stampa anche tempo e HP persi.
- Test: `tests/unit/classes-phase4.test.mjs` (78 controlli); nel browser pentagono, altare e nuova partita senza punti (3 controlli).
### Modificato
- `Player.setAttributes` diventa `setSpentAttributes` (punti spesi sopra la base); `attributes` restituisce i valori effettivi (base + spesi + power-up, al massimo 20).
- Chiudendo l'equipaggiamento si torna dove era stato aperto (`equipmentReturnState`), anche dopo essere passati dal pentagono.
- Il peso degli oggetti, finora solo un dato mostrato, ora conta per i requisiti di Forza e il carico.
- **Simulatore, tre righe cambiano per scelta** (il bot indossa armature pesanti senza la Forza richiesta): Cavaliere "medio" con equipaggiamento al massimo (acciaio) 100% → 95% vinte; Mago col bottino, rusher 95% → 83% e medio 95% → 88%. Baseline `tools/balance-baseline.txt` aggiornato con la sezione nuova. Esito della sezione BUILD (rusher): Forza finisce prima (311 s contro 378 s) e perde meno salute (551 HP contro 798), Vitalità non muore ma perde più salute (731), Intelligenza sta in mezzo.
- Test adattati: classes-phase0 (46 controlli: gli attributi hanno le basi), classes-phase3, weapons, mage-phase2, equipment-phases (forma dei dati e delle regex).
- Versione portata a 2.4.0 (`package.json`, `GAME_CONFIG.version` e documenti).
### Verificato
- `npm test` (1338 controlli in 33 file), `npm run test:browser` (180 controlli), `npm run balance -- --build`, `npm run verify-docs`.

## 2.3.0 – Classi, Fase 3: compatibilità classe × arma, munizioni nello zaino, peso (2026-11-25)
La tabella di compatibilità diventa per arma e viene applicata; le munizioni nello zaino non si perdono più.
### Aggiunto
- **Tabella per arma** (`WEAPON_AFFINITY_CONFIG`, 11 armi × 5 classi): ogni cella `WeaponAffinity` ha `isAllowed`, `damageMultiplier`, `recoveryMultiplier`, `ammoMultiplier` e, per le vietate, `lootSubstituteId`. Costanti `NEUTRAL_WEAPON_AFFINITY` (✓ e arma iniziale), `PREFERRED_WEAPON_AFFINITY` (★: danno ×1,15, munizioni ×1,5), `PENALIZED_WEAPON_AFFINITY` (▼: danno ×0,85, recupero ×1,15), `forbidden(sostituto)`. La categoria resta un tag di `WEAPON_CONFIG` (scaling della Fase 4). Munizioni ★ del Ranger: coltelli 9, balestra 9, giavellotti 4 (arco 12).
- **Divieti**: `Player.equipWeapon` restituisce `boolean` e rifiuta le armi vietate; `Inventory.equipFromBackpack` ha il nuovo esito `forbidden` (l'arma resta nello zaino); `GameEngine.pickUpEquipment` non raccoglie un'arma vietata. Messaggio "NON PUOI USARLA".
- **Modulo `src/systems/WeaponAffinity.ts`**: `getWeaponMaxAmmo`, `canWieldWeapon`, `describeWeaponAffinity`, `FORBIDDEN_WEAPON_MESSAGE`.
- **Munizioni per classe**: `Player.maxAmmo`, `Inventory.setCharacter` (chiamato da `resetRunEquipment` a ogni nuova partita) e `Inventory.getMaxAmmo`; il massimo vale per borsa, raccolta, faretra, ricarica dell'arco del Ranger e coltelli recuperati.
- **Peso**: `weight` nelle armature (`ARMOR_WEIGHT_BY_MATERIAL`: stoffa 1, cuoio 2, ferro 3, acciaio 4; `ARMOR_WEIGHT_SLOT_FACTOR`: corazza ×2) e `getItemWeight(item)`. Per ora è solo un dato mostrato: dalla Fase 4 richiederà Forza (il malus di velocità previsto in origine è scartato, le armature pesanti hanno già `moveSpeed` negativo).
- **Interfaccia**: la scheda dell'equipaggiamento mostra "PESO n" e, per le armi, i bonus e malus della classe nelle prime righe della griglia ("CLASSE DANNO +15%", "CLASSE MUNIZIONI +50%" in verde; "CLASSE DANNO -15%", "CLASSE RECUPERO +15%", "NON PUOI USARLA" in rosso); `EquipmentView.characterId`. In bottega la riga di classe prende il posto della descrizione (`ShopOfferView.classLine`); nella bottega camminabile compare sopra il nome dell'offerta. Colori in `WEAPON_AFFINITY_TONE_COLORS`. L'HUD non cambia.
- Test: `tests/unit/classes-phase3.test.mjs` (99 controlli).
### Modificato
- **Il Mago può impugnare spada e pugnale** (la Fase 2 prevedeva solo il bastone); il catalizzatore resta solo del bastone. In bottega i catalizzatori restano sempre tra le armi in vendita per le classi con `usesSpellFocus`, così la spada (sempre scoperta) non toglie il bastone di un'altra rarità.
- **Bonus e malus della tabella solo sugli attacchi dell'arma**: `getDamageMultiplier()` è ora il moltiplicatore generale; `getDamageMultiplierFor(attacco)` e il recupero applicano la cella solo se l'attacco è dell'arma in mano (`isWeaponAttack`), quindi abilità e incantesimi non cambiano.
- La scheda dell'equipaggiamento non nasconde più statistiche per far posto alle righe di classe: se la griglia è piena compare una sola riga riassuntiva ("CLASSE: BONUS"/"CLASSE: MALUS").
- `Inventory.setArmorAndBackpack` riceve `BackpackEntry[]` (munizioni comprese); `equipFromInventory` controlla l'esito di `equipWeapon` e, se l'arma è rifiutata, la borsa torna all'arma in mano.
- **Filtro del bottino** (`resolveLootWeaponId`): un'arma vietata diventa il `lootSubstituteId` della cella (rete di sicurezza: l'arma iniziale). Spadone del Ranger → balestra; Mago: spadone → spada, le altre vietate → bastone; bastone delle altre classi → arma iniziale. Vale per forzieri, élite, trofei dei boss, ricompensa finale e bottega: le armi vietate non compaiono mai a terra.
- Lo zaino conserva `BackpackEntry { item, ammo? }` (anche in `InventorySnapshot.backpack`); `addToBackpack(item, ammo?)`, `removeFromBackpack` restituisce l'entry, nuovo `getBackpackAmmo(index)`; `backpackItems` resta l'elenco degli oggetti.
- Test adattati: classes-phase0, mage-phase2 (Mago con spada e pugnale, bottino), weapons-phase2 (i test dell'arco usano il Ranger, per cui l'arco è neutro), inventory.
- Versione portata a 2.3.0 (`package.json`, `GAME_CONFIG.version` e documenti).
### Corretto
- Le munizioni nello zaino: un'arma da lancio messa nello zaino e ripresa (o lasciata a terra dallo zaino, scambiata a borsa piena, comprata in bottega con borsa piena) conserva le sue munizioni; nello zaino non si ricaricano.
### Verificato
- `npm run typecheck`, `npm test` (1263 controlli in 32 file), `npm run balance` (cambia solo il Paladino "rusher" con la spada: 2,70 → 2,98 vite; baseline aggiornato), `npm run test:browser` (177 controlli), `npm run verify-docs`.

## 2.2.0 – Classi, Fase 2: il Mago (2026-11-25)
Quinta classe giocabile: il Mago, con mana, bastone e quattro incantesimi.
### Aggiunto
- **Mago** (`CHARACTER_CONFIG.mage`): 70 HP, velocità 84, stamina 80 (recupero 30, schivata 25), **mana 100** con recupero 6/s dopo 600 ms dall'ultimo consumo, arma iniziale bastone. Si sblocca al livello 5 ("SCONFIGGI LA STREGA DELLA PALUDE"). `CHARACTER_ORDER`: cavaliere, ranger, berserker, mago, paladino. La schermata del personaggio ha 5 colonne e la riga "100 MANA". Sprite provvisori: cappello a punta e veste viola (`CHARACTER_VISUALS.mage`).
- **Quattro incantesimi** sui tasti 7-0 (`ABILITY_CONFIG`): **DARDO DI FUOCO** (15 mana, 0,9 s, proiettile `arcaneFireball` da 22 con bruciatura, senza munizioni), **NOVA DI GELO** (30 mana, 5 s, area da 18 con gelo), **BALZO ARCANO** (20 mana, 3 s, scatto indietro invulnerabile), **BARRIERA** (guardia tenuta sul tasto 0: 10 mana per alzarla, 10/s, 1 mana per punto parato, parata perfetta come lo scudo). Nuovi `AttackDefinition.elements` e, nella guardia, `resource: "stamina" | "mana"`. Animazioni `abilityFirebolt`, `abilityFrostNova`, `abilityArcaneLeap`.
- **Bastone** (`WEAPON_CONFIG.staff`, categoria `staff`, peso 2, scaling `intelligence`): colpi 8/8/14 (combo MULINELLO), pesante 18, combo SPAZZATA ARCANA (finale 16, colpisce anche dietro), picchiata 14. Il **catalizzatore** `WeaponDefinition.spellFocus` (potenza ×1,2, costo in mana ×0,85 arrotondato, 5 mana per bersaglio colpito) vale solo per le classi con `CharacterDefinition.usesSpellFocus`. Leggendario **BASTONE DELLE STELLE**. `drawStaff`, `WEAPON_VISUALS.staff`.
- `Player`: `activeSpellFocus`, `getAbilityCost`, `getDamageMultiplierFor(attacco)` (usato da `CombatSystem` e dai proiettili), `restoreMana`, `abilitySlots`, `drainNoMana` (popup "SENZA MANA"); `ResourcePool.restore`; `registerHit` ridà mana con gli attacchi dell'arma.
- **Compatibilità arma-classe**: categoria `staff` in `WEAPON_AFFINITY_CONFIG`; il Mago usa solo il bastone, le altre classi tutto tranne il bastone (`FORBIDDEN_WEAPON_AFFINITY`). Per ora i divieti li legge solo il filtro del bottino `resolveLootWeaponId` (forzieri, élite, trofei dei boss, bottega); `equipWeapon` li applicherà dalla Fase 3.
- **Pozione di mana** (`ITEM_CONFIG.manaPotion`, +40 mana, sprite `itemManaPotion`): `BagSlot` pozione con `potionId` (`PotionId`), ogni tipo con il suo posto (max 2); `Inventory.addPotion(potionId)`, `canAddPotion(potionId)`, `getPotionCount(potionId)`. Si beve con 1-4 ("MANA PIENO" se pieno), si raccoglie con E, Q la lascia a terra. Bottino: `manaPotionChance` (forziere 1, élite 0,5, boss 1, altri 0) con `rollManaPotionDrop`, solo per le classi con mana. Bottega: `manaPotion` a 35 monete al posto della faretra per chi ha mana.
- **Bottega del Mago**: trova sempre un bastone in vendita (sostituisce il suo, che va nello zaino), ma non uno identico a quello che ha già. Le voci fisse per classe sono dati (`SHOP_BASIC_OFFERS`); un'arma identica a una della borsa è comunque rifiutata ("NON SERVE").
- **Trofeo del boss finale** per classe: solo armature e armi che la classe può usare (`LootContext.characterId`); per le altre classi i trofei restano quelli di prima.
- **HUD**: `HUDData.abilities[]` (un riquadro per slot, passo 11 px, numero rosso se la risorsa non basta, bordo dorato sullo slot scelto con più mosse), `mana`/`maxMana`; con il mana stamina e mana su due barre da 3 px (`STAMINA_BAR_WITH_MANA_GEOMETRY`, `MANA_BAR_GEOMETRY`). Senza mana l'HUD resta com'era, salvo il numero rosso quando la stamina non basta.
- **Simulatore**: bot del Mago (`playMageTurn`), sezione "MAGO" (boss da solo, partite complete senza e con bottino) e opzione `--mage`; il Mago è escluso dalla sezione "tutti con la spada".
- Test: `tests/unit/mage-phase2.test.mjs` (66 controlli); giro del Mago nei test del browser.
### Modificato
- `AttackDefinition`/guardia: `staminaPerBlockedDamage` rinominato `costPerBlockedDamage`.
- Test adattati: characters, classes-phase0, stamina-abilities, combos-phase3, config-integrity, equipment-phases, feedback-fixes, inventory, progression, weapons-phase1.
- Versione portata a 2.2.0 (`package.json`, `GAME_CONFIG.version` e documenti).
### Corretto
- Un attacco senza area d'urto (balzo arcano) non colpisce più niente: prima, nel primo frame, un'area vuota sovrapposta a un nemico poteva ferirlo (`Player.getActiveAttackHitbox`).
- Colpire un forziere con il bastone non ridà mana: i forzieri sono scena (`Damageable.isScenery`).
### Verificato
- `npm run balance`: le righe del baseline restano identiche, si aggiungono solo quelle del Mago (`tools/balance-baseline.txt` aggiornato).
- `npm test` (1166 controlli in 31 file), `npm run test:browser` (177/177), `npm run verify-docs`.

## 2.1.1 – Classi, Fase 1: ritocchi a comandi e Ranger (2026-11-25)
Le mosse speciali cambiano tasti e il Ranger ricarica le frecce.
### Aggiunto
- **Passiva del Ranger**: le frecce dell'arco si ricaricano, **una ogni 3 s** (valore da bilanciare), con l'arco in mano o in borsa; non nello zaino. I quadrelli della balestra e le altre munizioni no. Il tempo scorre solo se manca una freccia e riparte da zero a ogni livello. Nuovi `CharacterDefinition.ammoRegeneration` (`AmmoRegenerationDefinition`), `systems/AmmoRegeneration.ts`, `Inventory.isMissingAmmo`, `GameEngine.regenerateAmmo`.
- Test: `tests/unit/ammo-regeneration.test.mjs` (7 controlli).
### Modificato
- **Mosse speciali** sui tasti **7, 8, 9 e 0** (anche tastierino numerico; prima 5-8), con **L** come alias del 7. **5** e **6** non sono assegnati. L'HUD mostra la cifra di `ABILITY_SLOT_KEY_LABELS`. Aggiornati la schermata dei controlli, la descrizione dello scudo, i test unitari e quelli del browser.
- Il tratto del Ranger nella scheda del personaggio è "PASSIVA: LE FRECCE SI RICARICANO" (prima "SCHIVATA LUNGA E LEGGERA"; la schivata non cambia).
- Versione portata a 2.1.1 (`package.json`, `GAME_CONFIG.version` e documenti).
### Verificato
- `npm run typecheck`, `npm test` (1097 controlli in 30 file), `npm run verify-docs`, `npm run test:browser` (176/176), `npm run balance` (identico al baseline).

## 2.1.0 – Classi, Fase 1: partite scollegate e nuovi comandi (2026-11-25)
Ogni nuova partita parte da zero e i comandi cambiano.
### Modificato
- **Comandi**: attacco su **J** (prima Spazio), attacco pesante su **K** (prima J), schivata su **Shift sinistro** (prima K). Spazio non è assegnato. Le mosse speciali stanno sui tasti **5-8** (azioni `ability1`-`ability4` al posto di `ability`, `ABILITY_SLOT_ACTIONS`; anche il tastierino numerico), con **L** come alias del 5; oggi ogni classe ha una mossa, sul 5. Il riquadro dell'HUD mostra il numero del tasto. Schermata dei controlli aggiornata.
- **Partite scollegate**: ogni nuova partita ha la sola arma iniziale della classe, senza pozioni, armature, zaino o monete (`GameEngine.resetRunEquipment`). Le armi "trovate", che la bottega vende (spada sempre inclusa), valgono solo per la partita. Scegliere il personaggio salva la scelta e non tocca la partita.
- **Salvataggio** ridotto a `{ version: 2, unlockedLevelId, difficulty, characterId }` (`SAVE_VERSION`); le classi sbloccate si ricavano dal livello, i record restano in `HighScoreManager`. **Migrazione dal 2.0**: il vecchio salvataggio si riscrive subito, conservando livello, difficoltà e personaggio e scartando il resto.
- **Gemme**: danno **30 monete** (valore da bilanciare) oltre ai 200 punti.
- **Boss finale**: il suo oggetto Leggendario o Mitico è un trofeo mostrato a fine livello ("TROFEO: ..."), non va più nello zaino (`awardFinalBossReward`).
- Bot dei test del browser e `tools/balance.mjs` con i nuovi comandi.
- Versione portata a 2.1.0 (`package.json`, `GAME_CONFIG.version` e documenti).
### Corretto
- Ricominciando un livello dopo una morte la salute torna piena anche contando le armature di inizio livello.
- Raccogliendo una gemma (o una moneta) il messaggio mostra anche le monete ricevute.
### Rimosso
- Contatore delle gemme (HUD, fine livello, risultati), `ItemDefinition.isCollectible`, `ScoreManager.collectiblesFound` e `registerCollectible`.
- Potenziamenti permanenti: stato `upgrades`, voce del titolo *Potenziamenti*, `Player.setUpgrades`, `UPGRADE_CONFIG` e funzioni collegate.
- `ItemFactory.parseStoredItem` e i metodi di `ProgressManager` per armi, armature, zaino, gemme, potenziamenti e armi trovate.
### Verificato
- `npm test` (1090 controlli in 29 file), `npm run test:browser` (176/176), `npm run verify-docs`, `npm run balance` (identico al baseline).

## 2.0.1 – Classi, Fase 0: fondazione senza cambiamenti visibili (2026-11-25)
Refactor: per chi gioca non cambia niente (`npm run balance` identico al baseline). Prepara i punti d'innesto per mana, affinità delle armi e attributi, tutti con valori neutri.
### Aggiunto
- **Risorse** (`combat/ResourcePool.ts`): valore, massimo e recupero letti da callback, attesa dopo il consumo (`trySpend`, `canSpend`, `drain`, `empty`, `refill`, `clampToMax`, `update`). `Player` ha due pool: stamina (come prima) e **mana** (0 per tutti; getter `mana`, `maxMana`; `PLAYER_CONFIG.manaRegenDelayMs` = 600).
- **Costo delle abilità**: `AbilityDefinition.staminaCost` diventa `cost: ResourceCost` (`{ stamina?, mana?, health? }`; la salute si paga solo se ne resta almeno 1). Nuovo campo `modifiers: AbilityModifier[]`, vuoto: punto d'estensione per i modificatori degli incantesimi. Base comune `AbilityBase`.
- **Abilità come lista**: `CharacterDefinition.abilityId` diventa `abilityIds: AbilityId[]` (un elemento per classe). `Player`: `abilities`, `activeAbilitySlotIndex`, `selectAbilitySlot(i)` (rifiuta slot inesistenti, abbassa lo scudo se lo slot cambia), ricarica per slot, `canAfford(cost)`, `isAbilityReady`. HUD e bot del simulatore usano `isAbilityReady`.
- **Tag delle armi**: `WeaponDefinition.category` (`WeaponCategoryId`: `blade`, `heavy`, `polearm`, `ranged`, `thrown`), `weight` (1-5), `scalingAttribute`.
- **Affinità** (`weaponAffinityConfig.ts`): `WEAPON_AFFINITY_CONFIG` classe × categoria (`WeaponAffinity`: `isAllowed`, `damageMultiplier`, `recoveryMultiplier`), tutte le celle `NEUTRAL_WEAPON_AFFINITY`; `getWeaponAffinity(characterId, weaponId)`. `Player.weaponAffinity` entra in `getDamageMultiplier` e nel recupero tra gli attacchi (×1).
- **Attributi** (`attributeConfig.ts`, `systems/AttributeStats.ts`): `ATTRIBUTE_CONFIG` (Forza, Destrezza, Intelligenza, Vitalità, Tempra, con `effectsPerPoint` vuoti), `ATTRIBUTE_ORDER`, `ZERO_ATTRIBUTES`; `computeAttributeEffects(attributi)`. `CharacterDefinition.baseAttributes` (tutti a zero), `maxMana`, `manaRegenPerSecond` (0). `Player.attributes`, `setAttributes()`.
- **Fonti permanenti nei modificatori**: `PlayerModifiers.setSourceEffects(fonte, effetti)`, `getSourceEffects`, `ModifierSourceId = "attributes"`, sommate nella stessa formula dei power-up; `clear()` toglie solo i power-up. Nuove statistiche `maxHealthBonus`, `maxStaminaBonus`, `maxManaBonus` lette da `Player.maxHealth`, `maxStamina`, `maxMana`.
- Test: `tests/unit/classes-phase0.test.mjs` (50 controlli); in `stamina-abilities.test.mjs` adattate tre asserzioni sulla forma dei dati e due scritture del campo privato della stamina.
### Modificato
- Versione portata a 2.0.1 (`package.json`, `GAME_CONFIG.version` e documenti).

**La 2.0.1 contiene anche le modifiche fatte dopo la 2.0.0 e non ancora uscite in una versione (piano espansioni e piano dell'equipaggiamento E1-E6):**

### Aggiunto
- **Piano dell'equipaggiamento, E1 – rarità e oggetti**: sei rarità (`RARITY_CONFIG`: Comune grigio, Non comune verde, Raro blu, Epico viola, Leggendario arancione, Mitico rosso) con peso, prezzo e numero di modificatori (0/1/2/3; Leggendari e Mitici fissi). Un'arma è ora un **oggetto** (`ItemInstance`: tipo + rarità + modificatori, `types/ItemTypes.ts`). Modificatori (`AFFIX_CONFIG`) con un intervallo per rarità e un **tetto** sul totale: danno, recupero, velocità, furto di vita, salute, stamina, difesa, resistenza, elemento, rompe la guardia; un Epico ne ha sempre uno "di stile". Estrazione con seme iniettabile (`ItemFactory.createSeededRandom`). Nomi dal primo modificatore (*Spada della Furia*). Leggendari: uno per arma e tre armature; Mitici: *Ombra Eterna* e *Corona dell'Ombra* (`uniqueItemConfig.ts`). **Migrazione dei salvataggi**: le armi di prima diventano Comuni (`ProgressManager.bagItems`; `bagWeaponIds` continua a essere scritto). Bonus applicati in un punto solo (`Player.refreshEquipment`, `EquipmentStats.computeEquipmentBonuses`).
- **E2 – armature**: elmo, corazza, stivali in **stoffa, cuoio, ferro, acciaio** (`ARMOR_CONFIG`, 12 pezzi), statistiche base che crescono con la rarità, **set** dello stesso materiale (2 e 3 pezzi), **resistenze** contro i colpi con un elemento (nuovi `EnemyDefinition.attackElement`: melme e scorpione veleno, golem gelo; `ProjectileDefinition.element`: palla di fuoco, dardo magico). Difesa minima 1 danno per colpo. Raccogliendo un'armatura la si indossa (posto libero) o va nello zaino.
- **Aspetto dell'equipaggiamento, solo ricolorazioni** (nessuno sprite su misura, nemmeno per i Mitici, per ora): il metallo delle armi (chiavi `b`, `v`) prende i colori della rarità; ogni pezzo d'armatura ricolora la sua parte del personaggio con i toni del materiale e il riflesso della rarità. Elmo e gambe hanno chiavi proprie (`1`-`4`, `5`-`7`, impostate componendo i frame); ferro scuro e corda dell'arco hanno nuove chiavi (`j`, `q`). Le varianti di colore (`SpriteColorVariant`) si compongono in `SpriteManager` alla prima richiesta: nessun frame registrato in più. Icone 16×16 delle armature (`armorIconHelmet`, `armorIconChest`, `armorIconBoots`). Rarità visibile anche nella borsa dell'HUD (lineetta colorata) e a terra (bagliore e nome colorati).
- **E3 – spadone a due mani** (`greatsword`): 30/34 danni, pesante da 58, portata lunga, ogni colpo rompe la guardia, passo ×0,85; combo *Lama del gigante* e *Turbine* (colpisce anche dietro); pose della spada in frame larghi 54 (`GREATSWORD_POSES`), forma `drawGreatsword`; lo lascia lo scheletro d'élite del livello 4 (prima: pugnale). Leggendario: *Spadone del Re Caduto*.
- **E4 – schermata dell'equipaggiamento** (tasto **I**, anche dall'ultima voce della pausa; stato `equipment`): armature indossate, borsa, **zaino** da 12 posti (`INVENTORY_CONFIG.backpackSize`), riassunto dei bonus e set attivi, scheda dell'oggetto con il **confronto** (verde/rosso) con quello indossato; Invio indossa, toglie o mette nello zaino, **Q** lascia a terra (anche le armature). Un'arma che esce dalla borsa (borsa piena, o stesso tipo ma diversa) va nello zaino; se è pieno resta a terra. Armature e zaino si salvano e tornano come a inizio livello quando si perde una vita.
- **E5 – fonti ed economia**: `LOOT_SOURCES` e `LootSystem`: forzieri ed élite danno la loro arma con una rarità e a volte un'armatura; i nemici a volte un'armatura; i boss un'arma e un'armatura di rarità alta (trofeo); il **boss finale** mette nello zaino un oggetto Leggendario o **Mitico** (unica fonte dei Mitici). Le rarità alte crescono con il livello e a difficoltà difficile; le armature passano dalla stoffa all'acciaio. La bottega vende anche un'armatura; arma e armatura costano secondo la rarità. `tools/balance.mjs`: sezione e opzione `--equipment` (partite complete senza, con il bottino, al massimo).
- **E6 – il negozio come stanza camminabile**: tra un livello e l'altro si entra nella **bottega del mercante** (`SHOP_ROOM_LEVEL`, ambientazione nuova `shop` con sfondo di assi, scaffali e lanterne): mercante dietro il banco (il personaggio incappucciato ricolorato), un piedistallo per voce con prezzo e oggetto, **E** vicino al piedistallo compra, la porta in fondo porta al livello successivo. Prezzi di arma e armatura **+25% a ogni acquisto** di equipaggiamento nella stessa visita; niente rivendita. La bottega a menu della Fase 6 resta come ripiego (`SHOP_ROOM_CONFIG.isEnabled`).
- **Piano espansioni, Fase 8 – contenuti**: nuovo **livello 6 "Lande Desolate"** (ambientazione `wasteland`: tramonto con il sole basso, altopiani, alberi secchi, ossa, polvere al vento; terreno di terra secca) con il boss **Signore delle Lande** (accette a ventaglio, carica, chiama i predoni, fendente; trofeo: la balestra). La **Torre dell'Ombra diventa il livello 7** e resta il finale. **Tre nemici**: **Predone** (lancia accette che la spada respinge, indietreggia), **Scorpione Gigante** (carapace corazzato, scatto con il pungiglione), **Avvoltoio** (volante, picchiata più veloce). Nuovo proiettile `hatchet`; sprite del predone (testa propria sul busto del soldato, `weapon: "thrown"`), dell'avvoltoio e dello scorpione (`composeScorpion`). Modalità e rimappatura dei controlli rimandate.
- **Piano espansioni, Fase 7 – elementi ed effetti di stato**: `ELEMENT_CONFIG` e `StatusEffects` (usati da `Enemy` e `Boss`): **bruciatura** (il power-up Fuoco ora la lascia oltre al danno in più), **veleno**, **gelo** (metà velocità), **shock** (stordisce 0,5 s anche durante un attacco, poi 2 s senza stordimento; ai boss 6 danni subito). Il danno nel tempo non uccide mai. Nuovi power-up **Veleno**, **Gelo**, **Fulmine** (`PowerUpDefinition.element`) con oggetti e sprite, nei livelli 2-6. Gli elementi viaggiano con il colpo (`HitProperties.elements`, `Player.getHitProperties`): spada e armi, proiettili, abilità. **Resistenze e debolezze** di ogni nemico e boss (`elementModifiers`: immune 0, resiste 0,5, debole 1,5-2). Aloni, quadratini e numeri colorati sui nemici.
- **Piano espansioni, Fase 6 – progressione**: **monete** della partita (moneta raccolta 10, nemico 2, élite 6, boss 50; `ECONOMY_CONFIG`, `ScoreManager.coins`, nell'HUD) e **bottega** tra un livello e l'altro (`Shop`, `SHOP_OFFERS`, stato `shop`): pozione 40, cura +40 HP 25, faretra 20, un'arma già trovata 60; un acquisto inutile non costa niente; si esce con PROSEGUI. **Gemme** messe da parte a fine livello e **potenziamenti permanenti** dal titolo (stato `upgrades`, `UPGRADE_CONFIG`): Vitalità (+10 salute), Resistenza (+15 stamina), Forza (+5% danno), Scorta (+1 pozione a inizio partita); `Player.setUpgrades`. **Sblocchi**: Ranger, Berserker e Paladino raggiungendo i livelli 3, 4 e 6 (`CharacterDefinition.unlockLevel`, sagome con il lucchetto nella scelta), armi trovate salvate (`ProgressManager.discoveredWeaponIds`) e vendute nella bottega. Riquadro di fine livello con le gemme messe da parte e i personaggi sbloccati. Nuova voce *Potenziamenti* nel menu del titolo.
- **Piano espansioni, Fase 5 – stamina e abilità**: **stamina** per personaggio (`maxStamina`, `staminaRegenPerSecond`, barra verde nell'HUD) consumata dalla schivata (`dodgeStaminaCost`: 20-40), dagli attacchi pesanti (15) e dalle abilità; recupero dopo 0,6 s; "STANCO" quando non basta. **Abilità** sul tasto **L** (`ABILITY_CONFIG`, `AbilityDefinition`, riquadro con la L nell'HUD): **onda d'urto** (Cavaliere: 25 danni fino a 40 px davanti e dietro), **tiro in ritirata** (Ranger: balzo indietro invulnerabile e freccia da 20 senza munizioni), **carica furiosa** (Berserker: scatto di circa 70 px che travolge, 35 danni), **scudo** (Paladino: tenuto premuto para da davanti, anche le frecce; parata perfetta entro 0,25 s gratuita con 1 s di stordimento del nemico, `Enemy.stun`; guardia rotta senza stamina). Nuovi campi `AttackDefinition.dash` e `projectile.usesAmmo`, stato `guard`, pose comuni `ABILITY_POSES`. Gli scatti delle abilità si fermano sul bordo degli abissi. La schivata del Berserker è "non economica" con la stamina (40) e la sua attesa scende da 1,6 a 1 s.
- **Tasto Q – lasciare a terra** (`dropItem`): Q da solo (al rilascio) lascia l'arma in mano e si impugna la prossima; Q tenuto + 1-4 lascia il contenuto di quel posto (un'arma con le sue munizioni, oppure una pozione). Solo a terra; l'ultima arma non si lascia. `Inventory.dropSlot`, `ItemManager.addItem`, `GameEngine.dropFromBag`; nuova riga nella schermata dei controlli.
- **Cancella dati** (ultima voce del titolo): schermata di conferma `confirmReset` con "no" predefinito; "sì" azzera record, livelli raggiunti, difficoltà, personaggio e armi salvate (`ProgressManager.reset`, `HighScoreManager.reset`, `GameEngine.resetAllData`) e mostra "DATI CANCELLATI".
- **Faretra** (oggetto `quiver`, `ItemDefinition.refillsAmmo`): una per livello, prima dell'arena; toccandola tornano piene le munizioni di tutte le armi della borsa che ne hanno; se non serve resta a terra.
- **Piano espansioni, Fase 4 – personaggi con classi**: `CharacterDefinition` e `CHARACTER_CONFIG` (`characterConfig.ts`). **Cavaliere** (i valori di `PLAYER_CONFIG`, spada), **Ranger** (75 HP, 96 px/s, arco, schivata più lunga ogni 0,45 s), **Berserker** (130 HP, danno ×1,3, ascia, schivata corta ogni 1,6 s), **Paladino** (110 HP, 72 px/s, danno subito ×0,75, mazza, cura di 1 HP/s dopo 4 s senza colpi). `Player.setCharacter` e terzo parametro del costruttore; `PLAYER_CONFIG` resta per i valori comuni. Voce *Personaggio* nel menu del titolo e nuova schermata `characterSelect` (A/D o W/S, statistiche in tacche da `getCharacterRatings`, arma iniziale, tratto); nuove azioni di menu `menuLeft`/`menuRight`. Personaggio salvato in `ProgressManager.characterId` (i salvataggi precedenti danno il cavaliere); scegliendone uno diverso si impugna la sua arma iniziale, che entra nella borsa. Sprite: corpo del cavaliere ricolorato, con testa propria (cappuccio verde del Ranger, elmo con le corna e barba rossa del Berserker, armatura d'oro e pennacchio bianco del Paladino); id con il suffisso del personaggio dopo quello dell'arma. Il motore registra la serie di un personaggio solo quando serve (circa 600 sprite) e all'avvio solo le anteprime per i menu.
- **Accovacciarsi** (S / ↓): hitbox alta 16 px con i piedi fermi, niente movimento, non ci si rialza sotto un soffitto solido.
- **Piano espansioni, Fase 2 – armi a distanza**: **arco** (Spazio = tiro rapido da 8; J tenuto premuto = tiro caricato da 10 a 34 danni, freccia fino a 1,6 volte più veloce, bagliore a carica piena; `AttackDefinition.charge`), **balestra** (dardo da 40, ricarica di 0,9 s), **coltelli da lancio** (6; cadono a terra come `AmmoDrop` e si recuperano passandoci sopra), **giavellotto** (3, 50 danni, trafigge; ogni lancio si perde e, finiti, l'arma esce dalla borsa). Proiettili del giocatore (`ProjectileLaunch.owner`, `ProjectileSystem.update(..., targets)`) contro nemici, boss e forzieri, con i power-up; munizioni nella borsa e nell'HUD, piene riprendendo la stessa arma; un'arma da lancio lasciata a terra tiene le sue munizioni. Nuovi proiettili e sprite (freccia azzurra, dardo, coltello rotante, giavellotto), pose di mira e di lancio, forme `drawBow` e `drawCrossbow`. Armi nei livelli: arco (forziere, livello 2), coltelli (scheletro d'élite, 3), balestra (forziere, 4), giavellotto (goblin d'élite, 5; forziere, 6). Colpi di spada e proiettili vanno a segno con lo stesso codice (`GameEngine.handlePlayerHit`).
- **Piano espansioni, Fase 3 – combo**: `ComboManager` con sequenze miste e ramificate, continuazione quando una combo è l'inizio di un'altra e combo completata con nome (`ComboDefinition.name`, mostrato sopra il cavaliere). Una combo mista nuova per arma: **Fendente montante** (spada, Spazio J), **Morso del serpente** (pugnale, Spazio ×3 J), **Carica del drago** (lancia, Spazio J), **Spaccaossa** (ascia, Spazio ×2 J), **Terremoto** (mazza, Spazio J, colpisce anche dietro). Attacchi in aria come categoria separata (`WeaponDefinition.air`, due `ComboManager` nel cavaliere): combo in volo di due colpi e **colpo in picchiata** (`AttackDefinition.plunge`: J in aria, discesa a 360 px/s, rimbalzo a 250 px/s quando colpisce, recupero di 0,25 s all'atterraggio, polvere e tremolio). Nuove pose `knightPlungeA/B` per tutte le armi. Schermata dei controlli con le combo e la picchiata.
- **Le scritte che salgono** (nomi delle combo, punti) restano dentro lo schermo anche vicino ai bordi.
- **Borsa** (`Inventory`, `INVENTORY_CONFIG`): 4 posti per armi e pozioni, mostrati sotto il pannello dell'HUD con il loro numero. **E** raccoglie l'arma o la pozione toccata (suggerimento "E PRENDI ..."); **1-4** usano il posto (arma = in mano, pozione = +30 HP, non a salute piena). Le pozioni non curano più al tocco e sono al massimo 2. Borsa piena: un'arma nuova prende il posto di quella in mano, che resta a terra. Le armi della borsa sono salvate (`ProgressManager.bagWeaponIds`); perdendo una vita la borsa torna com'era a inizio livello. I power-up non cambiano. Prima S raccoglieva le armi: ora S serve solo ad abbassarsi.
- **Piano espansioni, Fase 1 – armi corpo a corpo**: **pugnale** (rapido, combo di 4 colpi, passo ×1,15), **lancia** (affondi lunghi fino a 40 px, pose proprie larghe 58 px), **ascia** (lenta e forte, `breaksGuard`: interrompe anche un attacco nemico già avviato), **mazza** (`crushesArmor`: danno pieno e 0,6 s di stordimento contro la corazza). Ogni arma ha attacchi, combo, velocità, una serie completa di sprite del cavaliere (anche accovacciati e con il fuoco: `WEAPON_VISUALS` e `weaponShapes.ts`) e un'icona 16×16. `Damageable.receiveHit` riceve le proprietà del colpo (`HitProperties`); i boss non vengono storditi.
- **Fonti delle armi**: **forzieri** (`Chest`, `LevelDefinition.chests`: livelli 1, 3, 5) che si aprono colpendoli; **nemici d'élite** (`EnemySpawnDefinition.elite`: salute ×2, danno ×1,3, punti ×3, alone dorato) che lasciano `weaponDrop` (livelli 2, 4, 6); **trofei** di Cavaliere Nero, Strega e Re dei Lupi (`BossDefinition.weaponReward`), che compaiono all'inizio del livello successivo e sono annunciati nel riquadro di fine livello.
- **Armi a terra** (`WeaponPickupManager`): l'arma lasciata a terra al posto di quella presa si può riprendere dopo essersi allontanati. (Nella prima versione della Fase 1 si raccoglieva con S e c'era un'icona dell'arma nel pannello; la borsa, sotto, ha sostituito entrambe le cose.)
- **Piano espansioni, Fase 0 – struttura delle armi**: tipo `WeaponDefinition` (attacchi, combo, attacco predefinito per input, velocità di camminata), `WEAPON_CONFIG` (`weaponConfig.ts`) con la spada come prima arma, che riusa gli attacchi e le combo della 2.0 (nessun valore cambia). `Player.equipWeapon` cambia arma annullando attacco e combo; `ProgressManager` salva l'arma in mano (`equippedWeaponId`; i salvataggi della 2.0.0 danno la spada) e il motore la consegna a ogni partita. Le animazioni cercano gli attacchi in tutte le armi (`getAllWeaponAttacks`). `DEFAULT_ATTACK_BY_INPUT` ora ha il tipo `Record<AttackInputAction, string>`.
### Corretto
- **Due oggetti erano nascosti dentro blocchi di pietra** (faretra del livello 2, Runa del Fulmine del livello 3, messi nelle Fasi 2 e 7): spostati, e un test controlla che nessun oggetto o forziere stia dentro un blocco. Anche il Cristallo del Gelo della torre era dentro un blocco.
- **Il balzo del Ranger poteva finire sugli spuntoni**: ora gli scatti delle abilità si fermano anche prima degli spuntoni (`PlayerEnvironment.dashStopZones`), come sul bordo degli abissi.
- **Il boss poteva restare chiuso fuori dall'arena**: si sveglia quando il giocatore è ancora fuori (raggio di 220-230 px) e poteva inseguirlo oltre il cancello; se poi il giocatore entrava, il cancello si chiudeva con il boss fuori e il livello non si poteva finire. Ora il boss non va mai a sinistra del cancello (`Boss.arenaMinX`, impostato da `LevelManager.createBoss`; `ARENA_GATE_WIDTH`), nemmeno caricando. Un test riproduce il difetto senza il limite.
- **Cambiando arma (1-4) a metà attacco il gioco si bloccava** con un errore "Sprite non registrato" (es. `knightAttack1BSpear`, `knightAttack1BBow`): l'animazione dell'attacco annullato restava e la nuova arma non ne aveva i frame. Esisteva dalla Fase 1 (spada → lancia); l'ha trovato il fuzz nel browser dopo la Fase 4, perché il Ranger ha arco e spada nella borsa. Ora `equipWeapon` riporta subito l'animazione a quella dello stato; un test prova ogni coppia di armi, a terra e in aria.
- **Attaccando da accovacciati il cavaliere si rialzava** (solo nell'immagine: la hitbox restava bassa). Le 14 pose d'attacco ora hanno una variante accovacciata (`KNIGHT_CROUCH_SUFFIX`, anche con il fuoco) e `Player.getRenderedFrameId()` la sceglie durante un attacco da accovacciati. Lo sprite accovacciato usa le gambe piegate della schivata. La scelta guarda l'animazione in corso, non lo stato: il fuzz nel browser aveva trovato un errore (`knightHurtCrouch` inesistente) se si veniva colpiti durante un attacco da accovacciati.
- **Si poteva entrare dentro i nemici**: li si colpiva ma il loro colpo, che partiva dal bordo del corpo, non raggiungeva il giocatore. Ora nemici a terra e boss hanno un **corpo solido** (`CollisionSystem.separateHorizontally`, chiamata da `GameEngine.separatePlayerFromBodies` prima dei colpi nemici): si attraversano solo con la schivata. Inoltre l'area d'urto in mischia di nemici e boss parte dalla metà del corpo, così colpisce anche chi gli sta addosso (la portata in avanti non cambia).
- **Lo Spaccaossa non si poteva eseguire**: il recupero del secondo colpo d'ascia (450 ms) superava la finestra della combo (400 ms). Ora 250 ms; un test controlla la regola per tutte le combo.
- **Schermata dei controlli**: la riga di "ABBASSATI" si sovrapponeva alla scritta della combo e la freccia giù appariva come "V". Righe più fitte (`CONTROLS_TABLE`), nuova riga per E e 1-4, glifo `↓` nel font.
### Modificato
- Equipaggiamento: valori delle armature e tetti di difesa (25%) e salute (+40) abbassati dopo la misura con il bot (vedi `BALANCE.md`).
- Menu di pausa: nuova voce *Equipaggiamento* in fondo (*Esci al titolo* resta la seconda). Schermata dei controlli: riga **I** (righe ogni 14 px).
- Test nel browser: la bottega è la stanza del negozio (E sul piedistallo, uscita dalla porta) e la schermata dell'equipaggiamento (175 controlli).
- `tools/balance.mjs`: duelli con predone, scorpione e avvoltoio. Valori dei nuovi nemici ritoccati dopo la misura (vedi `BALANCE.md`).
- Un personaggio scelto prima della Fase 6 ma non ancora sbloccato si gioca come cavaliere finché non si raggiunge il suo livello.
- Test nel browser: il bot esce dalla bottega; controlli di potenziamenti e bottega (174 controlli).
- `tools/balance.mjs`: il bot si gira verso il bersaglio prima di attaccare (prima, dopo una schivata attraverso un nemico, attaccava l'aria: le misure erano troppo pessimiste, il cavaliere passa da 82% a 100% con il bot medio); può usare l'abilità del personaggio (sezione `--characters`, con e senza abilità). Vedi `BALANCE.md`.
- Schermata dei controlli: nuova riga L; E e Q nella stessa riga.
- **Munizioni per arco (12 frecce) e balestra (6 dardi)**, prima infinite: le armi a distanza rendevano il gioco troppo facile. Frecce e dardi non si recuperano; si ricaricano con la faretra o riprendendo la stessa arma. Senza frecce l'arco non comincia nemmeno il tiro caricato (prima la carica sarebbe partita lo stesso).
- Schermata dei controlli: righe ogni 15 px e note 3 px più in basso, per far posto alla riga di Q. Menu del titolo con sei voci: il personaggio è disegnato a sinistra del riquadro.
- `tools/balance.mjs`: opzione `--characters` e sezione con le partite complete di ogni personaggio (con la spada). Il Paladino è passato da danno subito ×0,85 a ×0,75 dopo la misura. Rimisurato anche l'effetto delle due élite aggiunte nella Fase 2: bot medio da 88% a 82%. Vedi `BALANCE.md`.
- Test nel browser: controlli della schermata di scelta e di una partita con ogni personaggio, e del "Cancella dati" (172 controlli); il controllo della schermata dei controlli usa W due volte (il menu del titolo ha una voce in più).
- Test nel browser, bot: raccoglie le pozioni con E e le beve quando ha perso almeno 30 HP.
- Test nel browser, bot: se serve un altro salto rilascia e ripreme il tasto (prima lo teneva premuto per sempre e restava bloccato nell'acqua del livello 4 contro il bordo); a contatto con un nemico si gira verso di lui prima di attaccare (con i corpi solidi poteva restare incastrato a colpire l'aria).
- `tools/balance.mjs` fa come il gioco: nemici d'élite, corpi solidi e borsa (prima non creava le élite e non aveva i corpi solidi, quindi una prima misura di 68% / 27% era sbagliata). Partite complete vinte: 48% / 7% con élite e corpi solidi e pozioni al tocco; **88% / 93% con la borsa (massimo 2 pozioni)**. Vedi `BALANCE.md`.
### Verificato
- Piano dell'equipaggiamento: `npm run typecheck`, `npm test` (1063 controlli in 28 file: nuovi `equipment.test.mjs` ed `equipment-phases.test.mjs`), `npm run verify-docs` (11 esempi), `npm run test:browser` (175/175, il bot attraversa le stanze del negozio fino alla vittoria), `npm run balance`.
- `npm run typecheck`, `npm test` (955 controlli in 26 file: nuovi `crouch.test.mjs`, `body-contact.test.mjs`, `weapons.test.mjs`, `weapons-phase1.test.mjs`, `inventory.test.mjs`, `combos-phase3.test.mjs`, `weapons-phase2.test.mjs`, `characters.test.mjs`, `feedback-fixes.test.mjs`, `stamina-abilities.test.mjs`, `progression.test.mjs` e `elements.test.mjs`), `npm run verify-docs`, `npm run build`, `npm run test:browser` (174/174), `npm run balance -- --characters`.

## 2.0.0 – Versione 2.0: grafica a 16 bit e gioco ampliato (2026-11-22)
Prima versione stabile della 2.0. Riunisce le cinque fasi di sviluppo (le voci 2.0.0-alpha.1 - alpha.5 qui sotto ne descrivono i dettagli) più la verifica finale.

**In sintesi, rispetto alla 1.0.0:**
- **Grafica a 16 bit**: risoluzione 320×240, palette a rampe (54 colori), retini, gradienti, ciclo dei colori, ondulazione; personaggi, sfondi a più livelli di parallasse, terreni, HUD e schermate ridisegnati (alpha.1-2).
- **Sistemi nuovi**: proiettili, nemici a distanza e volanti, pericoli (acqua, ghiaccio, spuntoni), piattaforme mobili, attacchi dei boss come dati (alpha.3).
- **Contenuti**: da 3 a **6 livelli** (Palude Maledetta, Picchi Ghiacciati, Torre dell'Ombra), **11 tipi di nemici**, **4 boss** (Cavaliere Nero, Strega della Palude, Re dei Lupi, Signore dell'Ombra) (alpha.4).
- **Power-up** (Furia, Velocità, Scudo, Fuoco, Rigenerazione), **difficoltà** (Facile, Normale, Difficile), **selezione dei livelli** e progressi salvati (alpha.5).
- I livelli 1-3 e il Cavaliere Nero hanno la stessa geometria e le stesse statistiche della 1.0.

### Fase 6 (verifica finale e rilascio)
- **Test nel browser rieseguiti con Playwright** (non lo erano dalla 1.0.0): 165 controlli, 0 falliti dopo le correzioni sotto.
- **Corretto – pixel irregolari su un telefono in orizzontale al 300%** (844×390): il 18% dei blocchi di pixel era irregolare. 1280 pixel fisici corrispondono a 426,667 px CSS, che il browser (misure in multipli di 1/64 di pixel) riduce a 1279,97 e ricampiona. Nuova funzione `computeIntegerScale` (`Renderer.ts`): sceglie la scala intera più grande che entra nella finestra **e** che il browser rappresenta con meno di 0,01 pixel di scarto (qui 3 invece di 4). Il difetto è nato con il passaggio a 320 px di larghezza.
- Test nel browser: il controllo della schermata dei controlli usa la nuova posizione della voce nel menu; la scala attesa segue la stessa regola del gioco. Test unitario della scala con 16 combinazioni, telefono al 300% compreso. Totale: 513 controlli unitari in 14 file.
- Versione 2.0.0 in `package.json`, `GAME_CONFIG` e manuali; archivi `IRON_AND_SHADOW_v2.0.0.zip` e `IRON_AND_SHADOW_v2.0.0_gioco.zip` (allegati alla release GitHub).
### Verificato
- `npm run typecheck`, `npm test` (513), `npm run verify-docs` (11 esempi), `npm run balance`, `npm run build`, `npm run test:browser` (165/165).
### Limiti noti
- Provato solo in Chromium; Firefox, Safari, Edge e browser mobili non verificati.
- Bilanciamento misurato con un bot (partita completa vinta circa il 75% delle volte dal bot che schiva a volte, 32% senza schivate): serve una prova con persone.
- `npm audit`: 2 segnalazioni su `vite`/`esbuild` nel server di sviluppo (non riguardano il gioco compilato), come nella 1.0.

## 2.0.0-alpha.5 – Versione 2.0, Fase 5: power-up, difficoltà, selezione dei livelli (2026-11-22)
### Aggiunto
- **Cinque power-up temporanei** (`config/powerUpConfig.ts`): **Furia** (danno ×1,5), **Velocità** (movimento ×1,4), **Scudo** (danni subiti dimezzati, almeno 1), **Fuoco** (+8 danni a ogni colpo, spada e scie incandescenti), **Rigenerazione** (+4 HP al secondo). Si raccolgono come oggetti (runa, stivali alati, scudo, fiamma, foglia; 25 punti), sono nei sei livelli e mai subito prima di un boss.
- **Modificatori** (`combat/PlayerModifiers.ts`): le statistiche base non cambiano mai; il valore effettivo è (base + bonus) × moltiplicatori dei power-up attivi, quindi la scadenza di uno non tocca gli altri; lo stesso power-up raccolto di nuovo riparte da capo. Realizza il progetto descritto in `ARCHITECTURE.md` sez. 10.
- Alone colorato attorno al cavaliere per ogni power-up (lampeggia negli ultimi 2 s), icone con la barra del tempo nell'HUD, scritta e scintille alla raccolta; varianti "incandescenti" di tutti gli sprite del cavaliere (chiavi di colore separate per lama e scie).
- **Difficoltà nel menu del titolo** (Facile, Normale, Difficile): salute e danno di nemici **e boss**, vite iniziali 5 / 3 / 2.
- **Selezione dei livelli** (nuovo stato `levelSelect`): una partita nuova da qualsiasi livello già raggiunto; i livelli non raggiunti hanno il lucchetto.
- **Progressi salvati** (`systems/ProgressManager.ts`): livello più avanzato e difficoltà, nel browser, tolleranti ad archivio assente, bloccato o dati corrotti.
- **Test**: nuova suite `powerups-progress.test.mjs` (28 controlli). Totale 512 controlli in 14 file.
### Modificato
- `DIFFICULTY_CONFIG` ha anche `name` e `startingLives`; `DIFFICULTY_ORDER`. `Boss` accetta la difficoltà; `LevelManager.createEnemies/createBoss` la ricevono; `LivesManager.reset` accetta le vite.
- `ItemDefinition.powerUpId`, nuovi `ItemTypeId`; `MenuItem.label` può essere una funzione; `ScreenManager.update` riceve `ScreenData` (difficoltà e livelli); `HUDData.powerUps`.
- Bot dei test nel browser e fuzz: accettano lo stato `levelSelect` e le vite della difficoltà facile; il controllo del Game Over fissa la difficoltà normale.
- Manuali aggiornati (`GAME_MANUAL` con power-up, difficoltà e selezione dei livelli, punteggio massimo 17100; `CODE_MANUAL`, `ARCHITECTURE`, `FEATURES`, `TESTING`, `BALANCE`).
### Verificato
- `npm run typecheck`, `npm test` (512 controlli), `npm run verify-docs` (11 esempi), `npm run balance`, `npm run build`.
- Chrome headless: titolo con il nuovo menu, selezione dei livelli, power-up in gioco (HUD, alone, spada incandescente) con 0 pixel fuori palette; fuzz senza problemi.
### Limiti
- `npm run test:browser` (Playwright) non eseguito.
- Power-up permanenti: solo il punto d'aggancio (`type: "permanent"`).

## 2.0.0-alpha.4 – Versione 2.0, Fase 4: nuovi livelli, nemici e boss (2026-11-21)
Quarta fase della versione 2.0: il gioco passa da 3 a **6 livelli**. I primi tre non cambiano; dopo il Cavaliere Nero la storia continua fino al
**Signore dell'Ombra**, il vero nemico.
### Aggiunto
- **Tre ambientazioni** con sfondi a più livelli di parallasse e terreni propri:
  - **Palude Maledetta**: cielo torbido, luna malata, alberi morti, salici piangenti, nebbia, lucciole; fango e muschio con canne palustri; acqua verde.
  - **Picchi Ghiacciati**: aurora boreale, montagne innevate, pini con la neve, nevicata; neve e roccia con ghiaccioli.
  - **Torre dell'Ombra**: cielo in tempesta con fulmini, rovine sospese, vetrate e bracieri magici; pietra con rune luminose.
- **Tre livelli** (4, 5, 6) con vasche d'acqua, ghiaccio, spuntoni, piattaforme mobili e un boss ciascuno; la vittoria arriva dopo il livello 6.
- **Nuovi nemici**: **Lupo** (veloce, balza in avanti senza cadere negli abissi), **Melma della Palude** (alla morte si divide in due **melmine**), **Golem di Ghiaccio** (corazzato: l'attacco leggero fa metà danno, il pesante il danno pieno; non vacilla). Arciere Scheletro e Pipistrello (Fase 3) compaiono nei livelli.
- **Nuovi boss**: **Strega della Palude** (dardi a ventaglio, evoca melmine, bastonata), **Re dei Lupi** (balzo, morso, chiama il branco; forma di belva con hitbox 40×24), **Signore dell'Ombra** (boss finale a tre fasi: lama d'ombra, scatto, palle di fuoco, pipistrelli).
- **Forme degli sprite dei boss** (`BOSS_SPRITE_SHAPES`): `knight`, `witch`, `sorcerer`, `beast`. Nuovo `sprites/creatureTools.ts` per disegnare in modo procedurale lupi (anche giganti) e melme.
- Campi dei nemici `lunge`, `splitInto`, `armor`; colori dell'acqua per ambientazione (`ThemeStyle.waterColors`); tessiture `swampMud`, `snowAndRock`, `runeStone`.
- **Test**: regole dei livelli estese (vasche, volanti, spuntoni, ghiaccio, acqua, piattaforme mobili, boss appoggiato), test di balzo, divisione, corazza, livelli nuovi e forme dei boss. Totale 484 controlli in 13 file.
### Modificato
- **Simulatore di bilanciamento** (`tools/balance.mjs`): usa il boss di ogni livello e gli stessi sistemi del gioco (proiettili, pericoli, piattaforme mobili, evocazioni, divisioni); il bot salta gli spuntoni; nuovi duelli e una riga per ogni boss. Numeri dei livelli 1-3 invariati.
- Bot dei test nel browser (`harness.js`): salta gli spuntoni e riconosce gli attacchi di qualsiasi boss.
- Bilanciamento dei contenuti nuovi misurato e corretto (vedi `BALANCE.md`): partita completa vinta dal bot "medio" circa 73% (32% senza schivate).
- `CODE_MANUAL`: esempi 6, 7, 9 (ora rinumera anche i livelli successivi) e 10 aggiornati; `GAME_MANUAL` con storia, nemici, pericoli, quattro boss, sei livelli e punteggio massimo (16875); `ARCHITECTURE`, `FEATURES`, `TESTING`, `BALANCE`, `README`.
### Verificato
- `npm run typecheck`, `npm test` (484 controlli), `npm run verify-docs` (11 esempi), `npm run balance`, `npm run build`.
- Chrome headless: schermate dei livelli 4-6 con 0 pixel fuori palette; il bot vince 2 partite complete di 6 livelli su 3, senza violazioni.
### Limiti
- `npm run test:browser` (Playwright) non eseguito.
- Il bilanciamento dei livelli nuovi è misurato solo con il bot, che non usa l'attacco pesante e non insegue i pipistrelli: serve una prova con persone.
- I power-up, il selettore di difficoltà e la selezione dei livelli sono la Fase 5.

## 2.0.0-alpha.3 – Versione 2.0, Fase 3: sistemi per i nuovi contenuti (2026-11-21)
Terza fase della versione 2.0: i sistemi che servono ai livelli, ai nemici e ai boss della Fase 4. **I tre livelli attuali non cambiano** e il
bilanciamento è identico (vedi `BALANCE.md`): le novità si vedranno nei livelli nuovi.
### Aggiunto
- **Proiettili** (`entities/Projectile.ts`, `systems/ProjectileSystem.ts`, `config/projectileConfig.ts`, `sprites/projectileSprites.ts`): freccia, dardo magico, palla di fuoco. Colpiscono il giocatore una volta; durante la schivata (o l'invulnerabilità) passano attraverso; la spada distrugge frecce e dardi ma non le palle di fuoco; si schiantano contro i muri (non contro le piattaforme sospese).
- **Nemici a distanza** (`behavior: "ranged"`, campo `ranged`): tirano a chi è alla loro altezza entro `attackRange`, indietreggiano se il giocatore è troppo vicino; la preparazione è interrompibile. Nuovo nemico **Arciere Scheletro** (cappuccio, faretra, arco che si tende).
- **Nemici volanti** (`behavior: "flyer"`, campo `flight`): niente gravità, volteggiano attorno al punto di partenza, seguono il giocatore restando sopra la sua testa, attaccano in picchiata verso il punto in cui era; da morti cadono. Nuovo nemico **Pipistrello** (4 pose d'ala).
- **Pericoli** (`LevelDefinition.hazards`, `systems/HazardSystem.ts`, `config/hazardConfig.ts`): spuntoni (12 danni e rimbalzo), acqua (più lenti, caduta lenta, si nuota verso l'alto; fondo dietro e velo ondulato davanti alle entità), ghiaccio (aderenza ridotta: si scivola). I nemici a terra non entrano in spuntoni e acqua. Il giocatore ha un `environment` (`PlayerEnvironment`) che il motore aggiorna a ogni frame.
- **Piattaforme mobili** (`LevelDefinition.movingPlatforms`): avanti e indietro con rallentamento agli estremi, trasportano giocatore e nemici a terra; disegnate con piastre di ferro e bulloni d'oro.
- **Attacchi dei boss come dati** (`BossDefinition.attacks`, `BossPhaseDefinition.attackWeights`): quattro tipi (`melee`, `charge`, `projectile` con ventaglio mirato, `summon` con limite di evocati) con preparazione, fase attiva e recupero. Nuove pose del boss `CastA`/`CastB` (incantesimo) e animazioni per proiettili ed evocazioni (`BOSS_ATTACK_ANIMATIONS`).
- `LevelManager.loadLevelDefinition` (livelli fuori da `LEVEL_CONFIG`, per test e prove), `Renderer.applyLineWave` limitato a una zona orizzontale, `Boss.currentAttackWindupMs`.
- **Test**: nuova suite `systems-phase3.test.mjs` (47 controlli) e nuovi controlli di coerenza (comportamenti, proiettili, attacchi e pesi dei boss). Totale 428 controlli in 13 file.
### Modificato
- `BossDefinition`: i campi `slash...` e `charge...` e `phases[].chargeChance` sono sostituiti da `attacks` e `attackWeights`. Il Cavaliere Nero ha gli stessi numeri; la carica è elencata per prima perché il sorteggio dia gli stessi risultati della 1.0. `Boss.currentState` è ora un getter; gli stati visibili (`slash`, `chargeWindup`, `charging`, `recovery`...) sono gli stessi.
- `Boss` ricava le animazioni dalla propria definizione (`createBossAnimations`): funziona con qualsiasi boss, anche fuori dal catalogo.
- `EnemyAISystem.update` riceve anche i pericoli e il tempo di gioco; `Boss.update` riceve il numero di evocati vivi.
- Bot del simulatore (`tools/balance.mjs`) e dei test nel browser (`harness.js`): leggono la durata della preparazione dal boss.
- `CODE_MANUAL`: esempi 6 e 10 aggiornati (nuovi tipi di nemico; il Re Scheletro con la nuova struttura degli attacchi). Manuali aggiornati (`ARCHITECTURE` sez. 7-10, `CODE_MANUAL`, `FEATURES`, `GAME_MANUAL` con le novità in arrivo, `TESTING`, `BALANCE`).
### Verificato
- `npm run typecheck`, `npm test` (428 controlli), `npm run verify-docs` (11 esempi), `npm run balance` (risultati identici), `npm run build`.
- Livello di prova in Chrome headless (non incluso nel gioco) con tutte le novità: 0 pixel fuori palette; arcieri che tirano, pipistrelli, boss che evoca al massimo 2 pipistrelli e lancia palle di fuoco.
### Limiti
- Arciere, pipistrello, pericoli e piattaforme mobili non sono ancora nei livelli: arrivano con la Fase 4.
- `npm run test:browser` (Playwright) non eseguito.
- Tutti i boss condividono ancora la forma umanoide dello sprite: i boss non umanoidi della Fase 4 (es. Re dei Lupi) richiederanno sprite propri.

## 2.0.0-alpha.2 – Versione 2.0, Fase 2: grafica ridisegnata a 16 bit (2026-11-21)
Seconda fase della versione 2.0: tutta la grafica è ridisegnata con gli strumenti della Fase 1. **Il gioco non cambia**: hitbox, statistiche,
livelli e bilanciamento sono quelli di prima; cambia solo come appare.
### Aggiunto
- **Cavaliere a 16 bit** (24×30, attacchi 44×30): elmo a visiera con pennacchio, armatura in 4 toni, sopravveste rossa con cintura d'oro, scudo blu con croce, spada con scie bianche e azzurre. Pose nuove per schivata (accovacciato dietro lo scudo), danno, morte.
- **Nemici a 16 bit**: scheletro (ossa avorio, occhio rosso, spada arrugginita), goblin (pelle verde in 3 toni, orecchie, pugnale), soldato (elmo a falda dorata, sopravveste viola). Ogni nemico ha le sue pose delle gambe.
- **Cavaliere Nero a piena risoluzione** (36×41; nella 1.0 era disegnato a metà risoluzione e ingrandito 2×): corna, visiera con occhi arancioni, spallacci, mantello a pieghe, spadone con scia arancione.
- **Sprite allineati all'hitbox**: ogni sprite si registra con una colonna d'ancoraggio; `SpriteManager.drawSpriteAligned` lo appoggia sull'hitbox anche quando è specchiato. Sostituisce i calcoli di posizione che erano in `Player`, `Enemy` e `Boss`.
- **Sfondi a 4-6 livelli di parallasse** (`BackgroundRenderer` riscritto): ogni livello si disegna una volta in un canvas da 640 px che si ripete senza cuciture; a ogni frame si disegnano solo stelle, luna, nebbia e torce. Foresta con montagne innevate e tre file di pini; castello con castelli lontani, mura merlate e colonne con stendardi; dungeon con mattoni ombreggiati, celle ad arco e torce con alone.
- **Terreno** (`TerrainRenderer`, nuovo): erba e terra con sassi, piastrelle di pietra smussate, mattoni del dungeon; piattaforme sospese come assi; porta d'uscita ad arco con luce calda; cancello a saracinesca. Gli abissi mostrano un fondo scuro (prima restava il frame precedente sotto quota 200).
- **HUD e schermate**: pannello metallico con bordo dorato, cuore e salute a segmenti ombreggiati, punteggio dorato, gemma, teschio sulla barra del boss; titolo con scritta metallica a fasce e scintilla; riquadri decorati; tasti in rilievo; menu con voce scelta in bianco-oro.
- **Oggetti e icone ombreggiati** (sempre 8×8): pozione, moneta, gemma; icone elmo, cuore, teschio.
- **PixelPainter** (nuovo): le primitive di disegno del `Renderer` ora funzionano su qualsiasi canvas (servono per i livelli di parallasse). Nuove primitive: `fillDitheredOverlay` (retino di un solo colore), `fillCircle`, `fillGlow` (alone), `rowColors` di `drawText` (scritte a fasce).
- **Test**: 17 controlli nuovi (372 in totale): ogni colore degli sprite e del terreno è della palette, ogni frame contiene l'hitbox e tutti i frame di un personaggio hanno la stessa ancora, allineamento normale e specchiato, retino sovrapposto, aloni, cerchi, testo a fasce.
### Modificato
- `THEME_STYLES` (`levelConfig.ts`) descrive tessitura e rampe del terreno (`terrainTexture`, `surfaceColors`, `fillColors`, `ledgeColors`, `detailColors`) al posto dei 4 colori della 1.0. Nuovi tipi `ThemeStyle` e `TerrainTexture`.
- `BOSS_SPRITE_STYLES`: ogni boss definisce 10 colori (k, n, d, s, w, r, e, y, c, p) invece di 6.
- `SpriteManager.registerSprite` accetta l'ancora (quarto parametro, facoltativo); `drawSlashArc` accetta il colore della scia e non lascia buchi negli archi grandi.
- `PLAYER_CONFIG.spriteWidth/spriteHeight`: 24 / 30 (solo informativi).
- Rimosse le pose delle gambe a 12 colonne della 1.0 da `spriteTools.ts` (ogni personaggio ha le sue).
- `CODE_MANUAL`: esempi 6 (nuovo nemico) e 10 (nuovo boss) aggiornati al nuovo codice; `verify-docs` conta i segmenti della salute con `HEALTH_SEGMENT_GEOMETRY`.
- Manuali aggiornati (`ARCHITECTURE` sez. 6, `CODE_MANUAL`, `FEATURES`, `GAME_MANUAL`, `TESTING`).
### Verificato
- `npm run typecheck`, `npm test` (372 controlli), `npm run verify-docs` (11 esempi), `npm run build`.
- Chrome headless sulla build di prova: tutte le schermate e i tre livelli con 0 pixel fuori palette, controllati anche a occhio (attacchi specchiati compresi).
- Il bot dei test nel browser (`tests/browser/harness.js`), eseguito in Chrome headless **senza Playwright**: 3 partite complete vinte (livelli 1-2-3), 0 colori fuori palette nei frame controllati, 0 violazioni delle regole; 6000 frame di tasti a caso senza problemi.
- Prestazioni: circa 0,8 ms di media per aggiornamento più disegno (Chrome senza GPU).
### Limiti
- `npm run test:browser` (Playwright) non è stato eseguito: vale quanto detto per la 2.0.0-alpha.1.
- L'ondulazione per riga è ancora inutilizzata (servirà per acqua e calore nella Fase 4).
- La grafica è stata valutata solo da chi l'ha disegnata: serve il parere di chi gioca.

## 2.0.0-alpha.1 – Versione 2.0, Fase 1: fondamenta grafiche a 16 bit (2026-11-21)
Prima fase della versione 2.0 (grafica a 16 bit, nuovi nemici, boss, ambientazioni e contenuti). Il gioco resta lo stesso:
cambia il motore grafico, che ora offre gli strumenti per ridisegnare tutto a 16 bit nella Fase 2.
### Aggiunto
- **Palette a rampe** (`src/config/paletteConfig.ts`): 54 colori (massimo 64) organizzati in 11 rampe dallo scuro al chiaro (acciaio, blu, verdi, caldi, fuoco, magia, pelle, terra, pietra, palude, oro). I 16 colori della 1.0 hanno lo stesso nome e valore e fanno parte delle rampe. `PALETTE` resta importabile da `gameConfig.ts`.
- **Effetti di colore** (`src/rendering/PaletteEffects.ts`, funzioni pure): retino ordinato di Bayer 4×4, gradienti a fasce, ombreggiatura lungo le rampe (`shadeColor`), ciclo dei colori (`cycleRampColor`, modalità `loop` e `pingPong`), ondulazione per riga.
- **Renderer**: `fillDithered`, `fillVerticalGradient`, `applyLineWave`, opzione `shadowColor` di `drawText`. Nessuno produce colori fuori palette.
- **Font**: minuscole con discendenti, minuscole accentate italiane, `;` e `"`, spaziatura proporzionale (le cifre restano a larghezza fissa). Altezza del glifo: 9 righe (le maiuscole occupano sempre le righe 0-6).
- **SpriteManager**: `drawSpriteSilhouette` disegna la sagoma di uno sprite in qualsiasi colore; le sagome si creano alla prima richiesta.
- **Strumenti per gli sprite**: `addOutline` (contorno automatico) e `remapSpriteKeys` (varianti).
- **Test**: nuova suite `graphics-16bit.test.mjs` (42 controlli); controlli sulla palette a rampe in `config-integrity.test.mjs`. Totale: 355 controlli in 12 file.
### Modificato
- **Risoluzione interna 320×240** (era 256×240): stessa altezza, quindi livelli e bilanciamento non cambiano; la vista è più larga.
- HUD, riquadri dei messaggi, titolo, controlli, pausa e vittoria sono disposti rispetto al centro dello schermo.
- Sfondi: cieli a fasce con retino (foresta e castello), cuore delle torce del dungeon con ciclo dei colori. Corretti i cicli degli elementi ripetuti (castello lontano, colonne, archi, torce, catene), che con 320 px lasciavano vuota la parte destra dello schermo.
- `index.html` (canvas 320×240), test unitari e test nel browser leggono le dimensioni da `GAME_CONFIG`.
- Versione portata a 2.0.0-alpha.1; manuali aggiornati (`ARCHITECTURE` sez. 6.1 sugli strumenti a 16 bit, `CODE_MANUAL`, `FEATURES` con la tabella della 2.0, `GAME_MANUAL`, `INSTALLATION`, `TESTING`).
### Verificato
- `npm run typecheck`, `npm test` (355 controlli), `npm run verify-docs` (11 esempi), `npm run build`.
- Chrome headless sulla build: titolo, controlli, pausa e i tre livelli si disegnano a 320×240 con 0 pixel fuori palette.
### Limiti
- **I test nel browser (`npm run test:browser`) non sono stati rieseguiti** (Playwright non installato): sono stati adattati alla nuova risoluzione ma non provati.
- Gli sprite sono ancora quelli della 1.0: il ridisegno a 16 bit è la Fase 2.
- L'ondulazione per riga è pronta ma non ancora usata nei livelli.

## 1.0.0 – Fase 10: test, verifiche e distribuzione (2026-11-20)
Prima versione completa: gioco arcade con spada, combo statiche, nemici, tre livelli e boss, come previsto per la 1.0.
### Aggiunto – test (ora inclusi nel progetto)
- **`npm test`**: 308 controlli unitari in 11 file (`tests/unit/`), eseguiti in Node in meno di un secondo. Comprendono i test scritti nelle fasi precedenti (movimento, combattimento, IA, livelli, boss, oggetti, interfaccia, effetti, regressioni) e nuove suite: coerenza di tutte le configurazioni (ogni sprite, animazione, combo e livello), velocità coerente a 20-144 FPS, rendering e fisica, regole statiche del codice.
- **`npm run test:browser`**: 165 controlli in Chromium (richiede Playwright, non incluso nel progetto). Aprono la **build reale con `file://`**, provano **17 combinazioni di finestra e scala di sistema**, fanno giocare **un bot che usa solo eventi di tastiera veri fino alla vittoria**, eseguono **120.000 frame di tasti a caso**, verificano la palette su ogni schermata, la pausa, il Game Over, il record dopo il ricaricamento, l'assenza di audio e di richieste di rete, e la velocità con carico artificiale.
- **`TESTING.md`**: che cosa è verificato, come ripetere le prove, mappa dei requisiti di qualità, difetti trovati, limiti.
### Corretto (difetti trovati dalle verifiche)
- **L'altezza del salto dipendeva dagli FPS** (45,8 px a 20 FPS, 52,3 a 144 FPS): la gravità ora si integra con la velocità media del frame (`CollisionSystem.applyGravityAndMove`). Altezza 53,4 px a tutte le frequenze (valore teorico 53,4). Il salto a 60 FPS è passato da 50,8 a 53,4 px: livelli e bilanciamento verificati di nuovo.
- **Colori fuori palette in gioco**: le colline della foresta usavano altezze frazionarie e il browser sfumava i bordi. `Renderer.fillRect` ora arrotonda tutti e quattro i bordi.
- **Pixel irregolari con la scala di sistema frazionaria (125%, 150%...)**: la scala intera ora si calcola in **pixel fisici** (`devicePixelRatio`). Prima, con il 150%, 3 pixel CSS per pixel di gioco erano 4,5 pixel fisici.
- Il giocatore poteva essere spinto fuori dalla mappa da un blocco al bordo in una situazione estrema: dopo la risoluzione sull'asse X si riapplica il limite della mappa.
### Modificato
- Versione portata a 1.0.0 (`package.json`, `GAME_CONFIG.version`, manuali).
- Manuali aggiornati: `GAME_MANUAL` (dimensione della finestra), `INSTALLATION` (comandi di test, archivi), `CODE_MANUAL` (cartella `tests/`, nuove funzioni), `ARCHITECTURE` (rendering in pixel fisici, integrazione della gravità, test), `FEATURES` (stati aggiornati, compatibilità browser e prova con persone indicate come "Da implementare"), `BALANCE` (misure rifatte).
### Distribuzione
- `IRON_AND_SHADOW_v1.0.0.zip`: progetto completo (sorgenti, test, strumenti, manuali, `package-lock.json`, `dist/`), senza `node_modules`.
- `IRON_AND_SHADOW_v1.0.0_gioco.zip`: solo la versione giocabile e un `LEGGIMI.txt`.
- Verifica da archivio pulito: estratto lo ZIP in una cartella vuota, `npm ci`, `npm run typecheck`, `npm test`, `npm run build` e apertura di `dist/index.html` con `file://` (vedi `TESTING.md`).
### Problemi noti e limiti
- **Provato solo in Chromium** (su Linux). Firefox, Safari, Edge e browser mobili non sono stati provati.
- **Nessuna partita giocata da una persona**: il bilanciamento è misurato con un bot semplice (vedi `BALANCE.md`).
- Finestra sotto 256×240 pixel fisici: il gioco viene tagliato (non esiste scala frazionaria, per scelta di stile).
- Con la scala di sistema 150% e 300% il bordo del canvas può sfumare di 1 pixel fisico (invisibile a occhio).
- Sotto i 22 FPS il gioco rallenta invece di saltare i frame (tetto del delta time, voluto).
- Il record dipende dal browser e dalla posizione del file; la classifica con più punteggi non c'è.
- Un solo boss nel gioco; la difficoltà ha tre livelli di configurazione ma non un selettore in gioco; niente audio (escluso dal progetto).
- `npm audit` segnala 2 vulnerabilità nel server di sviluppo (`vite`/`esbuild`): non riguardano il gioco compilato (vedi `INSTALLATION.md`).

## 0.9.1 – Correzione di due difetti (2026-11-20)
Segnalati durante una prova di gioco.
### Corretto
- **Il goblin del livello 3 ributtava il giocatore nell'abisso.** Il goblin aspetta al bordo dell'abisso (non cammina nel vuoto) e, appena il giocatore atterra, attacca: il rinculo spingeva il cavaliere indietro, giù dal bordo. Riprodotto con la simulazione: su 15 salti riusciti sull'abisso 900-936, il giocatore veniva ributtato nel vuoto **15 volte su 15**.
  - **Causa:** il rinculo non teneva conto del terreno.
  - **Correzione:** durante lo stordimento il rinculo si ferma se oltre il bordo non c'è terreno entro 48 px (`knockbackLedgeCheckDepth`). Ora 0 volte su 15 (il danno si subisce comunque). La protezione vale per tutti i nemici e per il boss, in qualsiasi livello.
  - **In più:** il goblin del livello 3 è stato spostato da x=980 a x=1040 (a più di 100 px dal bordo dell'abisso).
- **Il cavaliere continuava ad attaccare dopo aver smesso di premere.** Premendo l'attacco a raffica, gli attacchi continuavano per circa 0,65 secondi dopo l'ultima pressione.
  - **Causa:** un effetto collaterale di una correzione della 0.8.0. Il buffer degli attacchi non scadeva mai mentre il cavaliere era impegnato: un tasto premuto all'inizio di una sequenza lunga restava in coda e partiva molto dopo.
  - **Correzione:** un attacco si memorizza solo se può partire entro 200 ms (`attackBufferMs`) e il buffer scade sempre dopo 200 ms. Premere molto prima non serve più (il tasto viene ignorato); il concatenamento delle combo con una cadenza normale o a raffica continua a funzionare (almeno 4 attacchi in 2 secondi premendo ogni 100 ms).
### Verificato
- Nuova suite di regressione (21 test): **12 falliscono sul codice con i difetti e tutti passano sul codice corretto** (così i test misurano davvero i difetti).
- Prova nel browser con il motore reale: raffica di 40 pressioni a ~50 ms → l'ultimo attacco parte 133 ms dopo l'ultima pressione e dopo 1,5 s non c'è nessun attacco in corso; cavaliere sul bordo dell'abisso del livello 3 colpito dal goblin (100 → 84 HP) senza cadere.
- Tutte le suite precedenti e `npm run verify-docs` (11 esempi) ancora verdi; `npm run balance` rieseguito (vedi `BALANCE.md`).
### Modificato
- `attackBufferMs`: nuovo significato (finestra degli ultimi 200 ms prima di poter attaccare). Un test della Fase 4 che premeva l'attacco a 100 ms dall'inizio è stato aggiornato: quel tasto ora è troppo anticipato e viene ignorato per scelta.
### Limiti
- Il goblin che attende al bordo e attacca chi atterra resta una situazione difficile (si subiscono 8 HP) ma non più letale.

## 0.9.0 – Fase 9 (2026-11-20)
### Aggiunto – documentazione
- `GAME_MANUAL.md`: storia, ambientazione, controlli, regole, combattimento, combo, nemici, boss, livelli, oggetti, punteggio, consigli. I dati (statistiche, punteggio massimo di 5900, numero di nemici per livello) sono stati ricavati dal codice.
- `CODE_MANUAL.md`: struttura dei file e variazioni rispetto alla struttura iniziale, ogni modulo con classi, interfacce, variabili e funzioni principali, tabelle di tutte le configurazioni, flussi di esecuzione, relazioni tra i componenti e **11 esempi pratici** (salute, velocità, salto, danno della spada, combo, nuovo nemico, comportamento di un nemico, nuovo oggetto, nuovo livello, nuovo boss, nuova animazione).
- `ARCHITECTURE.md`: obiettivi e compromessi, game loop, stati, input, rendering, entità, combattimento, boss, livelli, **punti di estensione futuri** (con l'indicazione esplicita che non sono implementati) e un progetto per i modificatori di statistiche dei futuri power-up.
- `INSTALLATION.md` completo (requisiti, installazione, comandi, configurazione, compilazione, distribuzione, avvisi di `npm audit`, problemi comuni).
- `FEATURES.md` riscritto: ogni funzionalità con uno stato (Implementata, In sviluppo, Da implementare, Pianificata, Non prevista).
### Aggiunto – verifica degli esempi
- `npm run verify-docs` (`tools/verifyManualExamples.mjs`): applica ogni esempio del manuale a una copia del progetto, controlla che il "codice originale" compaia una sola volta, che il codice modificato compili e che il comportamento sia quello descritto. Il controllo viene eseguito anche sul codice originale, dove **deve fallire**: così si sa che misura davvero la modifica. Opzione `--export <n> <cartella>` per ottenere una copia del progetto con l'esempio già applicato.
### Modificato – per rendere possibili gli esempi
- **Catalogo dei boss** (`BOSS_CATALOG`): ogni livello può scegliere il boss con `bossId`; sprite e animazioni si generano per ogni boss con il prefisso del suo id (`blackKnightIdle1`...). Prima c'era un solo boss cablato nel codice.
- **Barra della salute dell'HUD:** ora ha sempre 10 segmenti (prima ne aveva uno ogni 10 HP e, con più salute massima, sbordava sul testo centrale).
- Aggiornati commenti ormai obsoleti nel codice (riferimenti a fasi passate).
### Verificato
- `npm run verify-docs`: **11 esempi su 11** verificati (originale unico, compilazione, comportamento, il controllo fallisce sul codice originale).
- Lo script è stato messo alla prova con errori introdotti di proposito (valore sbagliato, codice originale non corrispondente, codice che non compila): li ha segnalati tutti.
- Gli esempi 6, 8, 9, 10 e 11 provati anche nel browser con il motore reale: il Bruto compare e ferisce, l'elisir cura, il livello aggiunto porta al boss e alla vittoria, il Re Scheletro mostra due tacche sulla barra, l'esultanza blocca i comandi. Nessun errore in console.
- Typecheck, build, `file://` e tutte le suite di test precedenti ancora verdi.
### Limiti
- Gli esempi verificano compilazione e comportamento in Node; l'aspetto grafico è stato guardato nel browser solo per gli esempi sopra citati.
- Non è stato esteso il supporto per boss con forma diversa o attacchi nuovi (richiede di estendere `bossSprites.ts` e `Boss.ts`): è scritto nel manuale.

## 0.8.0 – Fase 8 (2026-11-20)
**Audio non implementato per scelta del progetto** (non richiesto): `AudioManager` non esiste e non ci sono musiche né effetti sonori.
### Aggiunto – effetti grafici (`EffectsManager`)
- Scintille ai colpi, esplosione di particelle alla morte dei nemici e del boss, polvere all'atterraggio e alla schivata, scintillio alla raccolta degli oggetti.
- Scritte che salgono: "+100" per i nemici, "+50 / +200" per monete e gemme, "+30 HP" per le pozioni.
- **Tremolio dello schermo** (a pixel interi, solo mondo, non HUD) quando si subisce un colpo, alla morte dei nemici e del boss.
- **Hit-stop**: una pausa di 40 ms (75 ms per i colpi pesanti, 70 ms quando si viene colpiti) dà peso agli impatti. Gli input premuti durante la pausa non vanno persi.
- **Lampo bianco** sul nemico colpito (e sul boss).
- Parametri raccolti in `EFFECT_CONFIG` (`GameEngine.ts`).
### Aggiunto – rifiniture di gioco
- **Coyote time** (80 ms: si può saltare subito dopo aver lasciato un bordo) e **salto anticipato** (100 ms: un salto premuto poco prima di atterrare viene eseguito all'atterraggio).
- **Cura a fine livello**: +30 HP (non nell'ultimo livello), mostrata nel messaggio.
### Modificato – bilanciamento (vedi `BALANCE.md`)
- Nuovo parametro `attackInterruptWindowMs`: i colpi interrompono gli attacchi nemici solo all'inizio della preparazione (scheletro 150 ms; goblin e soldato mai).
- Goblin: raggio d'attacco 14 → 18.
- Boss: salute 300 → 290, fendente 25 → 20, carica 20 → 16, pausa 1200 → 1500 ms, fase 2 con pausa x0,75.
- `ItemManager.collectItems` restituisce gli oggetti raccolti (non più il numero).
### Aggiunto – strumenti
- `npm run balance`: simulatore di bilanciamento con bot (`tools/balance.mjs`). Documentazione in `BALANCE.md`.
### Verificato
- Typecheck, build, `file://` senza errori.
- Test di logica: movimento 13, combattimento 36, IA 32, livelli/boss/oggetti 51, interfaccia 28, effetti e salto 21.
- Prova nel browser con il motore vero: hit-stop osservato (circa 40-75 ms), particelle, popup, tremolio ±3 px dopo un colpo subito, pozione +30, +30 HP a fine livello 1, nessuna cura dopo il boss, nessun errore in console.
- Simulazioni di bilanciamento prima e dopo le modifiche (tabelle in `BALANCE.md`).
### Limiti
- Il bilanciamento è stato misurato solo con un bot semplice; non è stato provato da persone.
- Il bot non sfrutta bene la schivata: l'efficacia della schivata nel gioco è verificata dai test di logica, non dalle simulazioni.
- Il livello 3 è volutamente il più difficile; potrebbe risultare duro per chi non schiva.

## 0.7.0 – Fase 7 (2026-11-20)
### Aggiunto
- **Vite** (`LivesManager`, 3 iniziali): alla morte si perde una vita e si ricomincia il livello; a zero vite c'è il **Game Over** (con "RIPROVA" e "TORNA AL TITOLO").
- **HUD** (`HUDManager`): barra superiore con salute a segmenti (lampeggia sotto il 30%), vite con icona dell'elmo, punteggio a 6 cifre, gemme, numero del livello e barra del boss con la tacca della fase 2. Riquadri per i messaggi di livello.
- **Record locale** (`HighScoreManager`): il miglior punteggio si salva nel browser (localStorage) a fine partita e compare su titolo, Game Over e vittoria con la scritta "NUOVO RECORD!". Se l'archivio non è disponibile funziona solo in memoria, senza errori.
- **Menu** (`MenuManager`): navigazione circolare con W/S o frecce, cursore a due lati.
- **Schermate rifinite** (`ScreenManager`): titolo con castello animato, logo con ombra e cavaliere; controlli con i tasti disegnati; pausa con **retino a scacchi** (oscuramento senza trasparenze, in stile 8 bit); Game Over; Vittoria con storia finale, punteggio, gemme e record.
- Icona dell'elmo e glifo `^` nel font.
### Correzioni
- **Punteggio dopo la morte:** tornava al valore al momento della morte invece che a quello di inizio livello (errore di ordine delle chiamate introdotto in Fase 6), permettendo di accumulare punti morendo. Ora si ripristina il valore a inizio livello. Individuato dalla prova nel browser.
- Schermata dei controlli: una riga usciva dallo schermo (258 px su 256).
### Modificato
- `ScreenManager` non gestisce più direttamente le voci di menu (delegate a `MenuManager`).
- `ScreenManager.render` riceve un oggetto `ScreenData` (punteggio, record, gemme) invece di una stringa.
- L'HUD provvisorio è stato rimosso.
### Verificato
- Typecheck, build, `file://` senza errori.
- Test di logica: 13 (movimento) + 36 (combattimento) + 29 (IA) + 51 (livelli/boss/oggetti) + 28 nuovi (vite, record con archivio normale/guasto/assente/corrotto, menu, transizioni di stato, font).
- Prova nel browser con il motore reale: tre morti consecutive (vite 3 -> 2 -> 1 -> 0) -> Game Over, record salvato, "Riprova" riparte con 3 vite e punteggio a zero, vittoria con nuovo record, **record ancora presente dopo il ricaricamento della pagina**, comandi di gioco bloccati in pausa, nessun errore in console.
- Screenshot controllati: titolo, controlli, HUD (anche con salute bassa), pausa, Game Over, vittoria.
### Limiti
- Il record è un solo valore: la classifica con più punteggi è pianificata.
- Il record è legato al browser e alla posizione del file: aprendo `index.html` da un'altra cartella o con un altro browser il record riparte da zero.
- Nessuna partita completa giocata da una persona: il bilanciamento è da rifinire (Fase 8).

## 0.6.0 – Fase 6 (2026-11-20)
### Aggiunto
- **Tre livelli completi** (`LEVEL_CONFIG`): Foresta Oscura (1536 px), Castello Medievale (1792 px), Dungeon Sotterraneo (1536 px) con abissi, piattaforme sospese, blocchi e gradini. Ogni livello ha nemici, oggetti e una condizione di completamento.
- **Sfondi con parallasse** (`BackgroundRenderer`), disegnati solo con rettangoli: foresta (luna, colline, pini), castello (stelle, castello lontano, colonne con stendardi), dungeon (mattoni, archi con sbarre, torce che tremolano, catene).
- **Progressione:** messaggio di inizio livello, completamento (porta d'uscita o boss sconfitto), bonus di 500 punti, livello successivo e schermata di **vittoria** dopo l'ultimo. Il punteggio finale è mostrato in vittoria e Game Over.
- **Boss "Cavaliere Nero"** (`Boss`, 300 HP): fendente e carica con preparazione visibile (700 ms), non viene stordito dai colpi (lampeggia in bianco), resta vulnerabile dopo la carica. Due fasi: sotto il 50% è più veloce e carica più spesso. Barra della salute dedicata e sprite 24x40.
- **Arena del boss:** quando il giocatore entra, un cancello a sbarre si chiude alle sue spalle.
- **Oggetti raccoglibili** (`ItemManager`, `ITEM_CONFIG`): pozione (+30 HP), moneta (+50), gemma (+200 e conteggio collezionabili).
- **Cadute:** ora costano 15 HP e il giocatore riparte dall'ultimo punto sicuro (prima si ripartiva dall'inizio del livello).
- `SpriteManager`: sagome bianche per il lampo di danno.
### Modificato
- `BOSS_CONFIG` ora è un `BossDefinition` completo con fasi (`phases`).
- Dopo la morte si ricomincia il livello corrente (dalla 0.7.0 con vite e Game Over; il ripristino del punteggio era errato fino alla 0.6.x).
- La "porta di uscita" e il cancello sono disegnati con rettangoli (nessun asset esterno).
### Verificato
- Typecheck, build, `file://` senza errori in console.
- Test di logica: movimento 13, combattimento 36, IA 29, e 51 nuovi (dati dei livelli, boss, oggetti, danno da caduta).
- **Validazione dei livelli:** abissi <= 36 px, piattaforme raggiungibili (<= 44 px di salita), nemici e oggetti appoggiati sulle superfici, uscita e boss su terreno.
- **Bot di attraversamento:** con la fisica reale raggiunge l'uscita (o l'arena) in tutti e tre i livelli senza cadere, saltando abissi e blocchi.
- Prova nel browser con il motore reale: completamento di livello 1 e 2, passaggio al livello 3, chiusura del cancello, boss attivo, impossibilità di tornare indietro, boss sconfitto -> completamento -> vittoria; screenshot delle tre ambientazioni e del boss in entrambe le fasi.
### Non verificato / limiti
- Nessuna partita completa giocata da una persona: bilanciamento e difficoltà dei livelli vanno ancora rifiniti (Fase 8).
- Il bot di attraversamento ignora i nemici; le piattaforme sospese sono verificate con regole geometriche, non percorse dal bot.
- Il test con il motore completo è stato eseguito in una pagina di prova che accede alle variabili interne; il gioco distribuito non espone nulla.

## 0.5.0 – Fase 5 (2026-11-20)
### Aggiunto
- **Nemici** (`Enemy`) guidati da `ENEMY_CONFIG`: salute, danno, velocità, raggio di individuazione, distanza di attacco, fasi dell'attacco, rinculo, ricompensa. Si generano dalle posizioni del livello (`LevelManager.createEnemies()`) e applicano i moltiplicatori di difficoltà.
- **Tre comportamenti** (`EnemyAISystem`):
  - *patrol* (Scheletro Guerriero): pattuglia una zona di ±60 px; se vede il giocatore lo affronta restando nella zona;
  - *chase* (Goblin): aspetta, poi insegue il giocatore entro 110 px e smette oltre 1,5x il raggio;
  - *guard* (Soldato Nemico): fermo, si volta verso il giocatore e attacca se è a portata.
- Nessun nemico cammina nel vuoto o attraversa i muri (sonde davanti ai piedi).
- **Attacchi dei nemici** in tre fasi (preparazione, colpo, recupero) con un solo colpo per attacco. La schivata del giocatore evita il danno.
- **Morte del nemico:** animazione, rimozione dopo 700 ms e **punteggio** (`ScoreManager`, mostrato in alto a destra).
- Sprite e animazioni di Scheletro, Goblin e Soldato (idle, camminata, attacco, danno, morte). Il Soldato è una variante cromatica del cavaliere.
- `AnimationDefinition.frameDurationsMs`: durata diversa per ogni frame.
- Strumenti di disegno sprite condivisi in `rendering/sprites/spriteTools.ts`.
- Livelli 1-3: nemici posizionati (il livello 1 li mostra tutti e tre).
### Rimosso
- I manichini di prova della Fase 4.
### Modificato
- `soldier`: hitbox 12x24 (prima 14x26).
- Dopo la morte del giocatore si riparte dall'inizio del livello con nemici e punteggio azzerati (vite e Game Over in Fase 7).
### Verificato
- Typecheck, build, `file://` senza errori; sprite registrati correttamente nel browser.
- 29 test di logica sull'IA e i combattimenti + le suite precedenti (movimento 13/13, combattimento 35/35).
- Prova nel browser: scheletro che attacca e danneggia il giocatore, barra della salute, lampeggio d'invulnerabilità.
### Non verificato nel browser
- Uccisione di un nemico con assegnazione del punteggio: coperta dai test di logica ma non da una partita completa.
- Bilanciamento: valori iniziali, da rifinire in Fase 8.

## 0.4.0 – Fase 4 (2026-11-20)
### Aggiunto
- **Attacchi della spada:** leggero (Spazio) e pesante (J). Ogni attacco in `ATTACK_DEFINITIONS` ha danno, durata, finestra attiva (`hitStartMs`/`hitEndMs`), recupero (`cooldownMs`), area d'urto e animazione.
- **Combo statiche** (`COMBO_DEFINITIONS`): `tripleSlash` = Spazio, Spazio, Spazio (15, 15, 30 di danno). `ComboManager` fa avanzare la sequenza entro la finestra di tempo, altrimenti riparte.
- **Input anticipato (buffer):** un attacco premuto durante quello in corso viene eseguito appena possibile.
- **Schivata** (K): scatto di circa 48 px con invulnerabilità per tutta la durata e tempo di recupero (700 ms).
- **Sistema di danni:** `Player.takeDamage()` con rinculo, stordimento, invulnerabilità temporanea di 1 s con lampeggio, e morte a 0 HP. `CombatSystem` applica i colpi ai bersagli (`Damageable`), una sola volta per attacco.
- Hitbox degli attacchi specchiata quando il cavaliere guarda a sinistra (`getAttackWorldHitbox`).
- Sprite e animazioni: tre attacchi leggeri, attacco pesante, danno, schivata, morte. Le durate dei frame di attacco derivano dalla durata dell'attacco (restano sincronizzate se si modifica il bilanciamento).
- Hook per il futuro: `Player.getDamageMultiplier()` e `CombatSystem.calculateDamage()` sono i punti dove inserire power-up e danni elementali.
### Provvisorio (verrà sostituito)
- Due `TrainingDummy` nel livello 1 servono da bersaglio: spariranno con i nemici veri (Fase 5).
- Barra della salute in alto a sinistra: HUD completo in Fase 7.
- Dopo la morte il cavaliere riparte dall'inizio con salute piena dopo 1,5 s: vite e Game Over in Fase 7.
### Comportamento di gioco
- A terra, durante un attacco non ci si muove né si salta né si cambia direzione; in aria si può attaccare e controllare il movimento.
- Non si può schivare durante un attacco o in aria.
### Verificato
- Typecheck, build, `file://` senza errori in console.
- 35 test di logica (combo, finestra di tempo, buffer, danno 15/15/30, pesante, hitbox specchiata, schivata e cooldown, invulnerabilità, rinculo, morte e ripartenza, sincronizzazione animazioni) + 13 test del movimento della Fase 3.
- Prova nel browser: combo a tre colpi sul manichino, pesante, schivata, pausa senza input di gioco.
- Un difetto trovato durante i test e corretto: il buffer degli input scadeva prima della fine dell'attacco.
### Non verificato
- Subire danno da nemici veri (non esistono ancora): `takeDamage` è testato solo da codice.

## 0.3.0 – Fase 3 (2026-11-20)
### Aggiunto
- `GameObject` (posizione, velocità, direzione, hitbox) e `Player` (movimento, salto, gravità, stati, animazioni).
- Salto variabile: rilasciando il tasto in salita il salto si accorcia (`jumpCutMultiplier`).
- `CollisionSystem`: collisioni a assi separati (X poi Y), piattaforme solide e **sospese** (`oneWay`: si attraversano dal basso e ci si atterra sopra), limiti della mappa, `isOnGround`.
- Gestione delle cadute: cadendo sotto la mappa si riparte dall'inizio del livello (la perdita di vite arriva in Fase 7).
- `Camera` laterale che segue il giocatore ed è limitata ai bordi della mappa.
- `LevelManager` minimale: carica un livello da `LEVEL_CONFIG` e disegna terreno e piattaforme per ambientazione (`THEME_STYLES`).
- `SpriteManager` (sprite descritti come testo, con versione specchiata) e `AnimationPlayer` (`AnimationManager.ts`).
- Sprite del cavaliere (16x24): idle (2 frame), camminata (4), salto, caduta. Animazioni in `animationConfig.ts`.
- Interfaccia `InputSource`, che permette di testare le entità senza tastiera.
- Livello 1 con abisso, piattaforme sospese e un blocco solido per provare il movimento.
### Modificato
- La scena segnaposto della Fase 2 è stata sostituita dal livello reale.
- Nuove costanti: `GAME_CONFIG.maxFallSpeed`, `PLAYER_CONFIG.spriteWidth/spriteHeight/jumpCutMultiplier`.
### Non ancora presente
- Animazioni attacco, danno, schivata, morte (Fase 4); la corsa non è prevista.
- Sfondi decorativi (Fase 6): per ora cielo a tinta unita.
- Nemici, oggetti e boss del livello sono solo dati: non vengono ancora creati.
### Verificato
- Typecheck, build, apertura `file://` senza errori in console.
- 13 test di logica con input simulato: atterraggio, camminata ~80 px/s, direzione, altezza salto (~51 px), salto variabile, niente doppio salto, stati jump/fall, limite mappa, muro solido, piattaforma sospesa, abisso, indipendenza dagli FPS (30 vs 120 fps).
- Prova visiva nel browser: idle, camminata, salto, scorrimento camera.

## 0.2.0 – Fase 2 (2026-11-20)
### Aggiunto
- `GameLoop`: requestAnimationFrame con delta time in secondi (limitato a `maxDeltaTimeSeconds`).
- `GameState`: macchina a stati (title, controls, playing, paused, gameOver, victory) con transizioni validate.
- `InputManager`: tasti centralizzati, pressione singola senza auto-repeat, tenuto/rilasciato, contesti `gameplay`/`menu` che bloccano i comandi non pertinenti, rilascio tasti alla perdita del focus.
- `Renderer`: canvas 256x240, scala intera, rettangoli e testo.
- `BitmapFont`: font bitmap 5x7 nitido (il testo nativo del canvas è sfocato e rovinerebbe lo stile 8 bit).
- `ScreenManager`: schermate titolo, controlli, pausa, game over e vittoria con menu da tastiera.
- `GameEngine`: coordina i moduli; pausa automatica se la finestra perde il focus.
- Nuove azioni `menuUp` / `menuDown` (W/S, frecce) e `INPUT_CONTEXT_ACTIONS` in `controlsConfig.ts`.
### Note
- La scena "playing" è un segnaposto (quadrato animato) per dimostrare il delta time: sarà sostituita in Fase 3.
- Game Over e Vittoria sono implementate come schermate ma non ancora raggiungibili dal gioco (arrivano con vite e livelli).
### Verificato
- Typecheck e build; apertura `file://` senza errori; flusso menu/pausa/ripresa da tastiera; tempo di gioco fermo in pausa; spazio ignorato nei menu; delta time (primo frame 0, limite 0.05 s); validità dei glifi.

## 0.1.0 – Fase 1 (2026-11-20)
### Aggiunto
- Progetto npm + TypeScript (strict) + Vite.
- Struttura cartelle `src/`, `public/assets/`, `documentation/`.
- Configurazioni: gioco, palette, giocatore, attacchi/combo, nemici, boss, controlli, livelli, difficoltà.
- Tipi condivisi in `src/types/`.
- Build compatibile con apertura `index.html` via doppio clic.
- Canvas 256x240 con scala intera (schermata di prova).
### Problemi noti
- Il gioco non è ancora giocabile (motore in Fase 2).
