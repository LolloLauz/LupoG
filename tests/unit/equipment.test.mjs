// Piano dell'equipaggiamento, fasi E1-E2: rarità, oggetti con modificatori, tetti, salvataggi, armature, set, aspetto
import { FakeSpriteManager } from "../helpers.mjs";

export const description = "Equipaggiamento (E1-E2): rarità, modificatori e tetti, oggetti fissi, armature, set, resistenze, colori";

export default async function (t, load) {
  const { RARITY_CONFIG, RARITY_ORDER } = await load("config/rarityConfig");
  const { AFFIX_CONFIG, AFFIX_ORDER } = await load("config/affixConfig");
  const { ARMOR_CONFIG, ARMOR_SETS, ARMOR_MATERIALS, ARMOR_SLOTS } = await load("config/armorConfig");
  const { LEGENDARY_ITEMS, MYTHIC_ITEMS } = await load("config/uniqueItemConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { PALETTE } = await load("config/gameConfig");
  const F = await load("systems/ItemFactory");
  const E = await load("systems/EquipmentStats");
  const { Inventory } = await load("systems/Inventory");
  const { Player } = await load("entities/Player");
  const { CHARACTER_CONFIG } = await load("config/characterConfig");
  const V = await load("rendering/sprites/equipmentVisuals");
  const { registerKnightSprites, HELMET_TONE_KEYS, BOOT_TONE_KEYS } = await load("rendering/sprites/knightSprites");
  const { registerItemSprites } = await load("rendering/sprites/itemSprites");
  const paletteColors = new Set(Object.values(PALETTE));
  const memory = () => { const data = new Map(); return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };

  // --- rarità ---
  t("sei rarità in ordine, con nome, colore della palette e prezzo crescente", RARITY_ORDER.join() === "common,uncommon,rare,epic,legendary,mythic" && RARITY_ORDER.every((id, i) => RARITY_CONFIG[id].name.length > 0 && paletteColors.has(RARITY_CONFIG[id].color) && (i === 0 || RARITY_CONFIG[id].priceMultiplier > RARITY_CONFIG[RARITY_ORDER[i - 1]].priceMultiplier)));
  t("colori consueti: grigio, verde, blu, viola, arancione, rosso", [PALETTE.lightGray, PALETTE.lightGreen, PALETTE.lightBlue, PALETTE.lilac, PALETTE.orange, PALETTE.red].every((c, i) => RARITY_CONFIG[RARITY_ORDER[i]].color === c));
  t("modificatori per rarità: Comune 0, Non comune 1, Raro 2, Epico 3; Leggendario e Mitico fissi", [0, 1, 2, 3].every((n, i) => RARITY_CONFIG[RARITY_ORDER[i]].affixCount === n && !RARITY_CONFIG[RARITY_ORDER[i]].isFixed) && RARITY_CONFIG.legendary.isFixed && RARITY_CONFIG.mythic.isFixed);
  t("pesi nei drop decrescenti; il Mitico non esce mai a caso", RARITY_ORDER.slice(0, 5).every((id, i) => i === 0 || RARITY_CONFIG[id].dropWeight < RARITY_CONFIG[RARITY_ORDER[i - 1]].dropWeight) && RARITY_CONFIG.mythic.dropWeight === 0);
  t("metallo delle armi: colori della palette, diversi per ogni rarità", RARITY_ORDER.every((id) => paletteColors.has(RARITY_CONFIG[id].weaponColors.metal) && paletteColors.has(RARITY_CONFIG[id].weaponColors.shine)) && new Set(RARITY_ORDER.map((id) => RARITY_CONFIG[id].weaponColors.metal)).size === 6);
  {
    const random = F.createSeededRandom(7);
    const counts = Object.fromEntries(RARITY_ORDER.map((id) => [id, 0]));
    const weights = Object.fromEntries(RARITY_ORDER.map((id) => [id, RARITY_CONFIG[id].dropWeight]));
    for (let i = 0; i < 20000; i++) counts[F.rollRarity(weights, random)]++;
    const total = RARITY_ORDER.reduce((sum, id) => sum + RARITY_CONFIG[id].dropWeight, 0);
    t("le estrazioni seguono i pesi (20000 prove, scarto sotto il 2%)", ["common", "uncommon", "rare"].every((id) => Math.abs(counts[id] / 20000 - RARITY_CONFIG[id].dropWeight / total) < 0.02) && counts.mythic === 0, JSON.stringify(counts));
    t("pesi tutti a zero: Comune", F.rollRarity({}, random) === "common");
  }
  {
    const a = F.createSeededRandom(42), b = F.createSeededRandom(42);
    const first = Array.from({ length: 20 }, () => F.rollWeaponItem("sword", "epic", a));
    const second = Array.from({ length: 20 }, () => F.rollWeaponItem("sword", "epic", b));
    t("estrazione ripetibile: stesso seme, stessi oggetti", first.every((item, i) => F.areItemsEqual(item, second[i])));
  }

  // --- modificatori ---
  t("ogni modificatore ha etichetta, posti validi, intervalli crescenti entro il tetto", AFFIX_ORDER.every((id) => {
    const d = AFFIX_CONFIG[id];
    const r = d.ranges;
    return d.label.length > 0 && d.appliesTo.length > 0 && (d.format === "flag" || (r.uncommon[0] <= r.uncommon[1] && r.rare[1] >= r.uncommon[1] && r.epic[1] >= r.rare[1] && r.epic[1] <= d.cap));
  }));
  {
    const random = F.createSeededRandom(3);
    let ok = true, epicStyleOk = true, noStyleBelowEpic = true, inRange = true, noDuplicates = true;
    for (const rarity of ["uncommon", "rare", "epic"]) {
      for (let i = 0; i < 300; i++) {
        const weapon = F.rollWeaponItem(["sword", "bow", "axe"][i % 3], rarity, random);
        const armor = F.rollArmorItem("ironChest", rarity, random);
        for (const item of [weapon, armor]) {
          if (item.affixes.length !== RARITY_CONFIG[rarity].affixCount) ok = false;
          if (new Set(item.affixes.map((a) => a.id)).size !== item.affixes.length) noDuplicates = false;
          const styles = item.affixes.filter((a) => AFFIX_CONFIG[a.id].isStyle);
          if (rarity === "epic" && styles.length !== 1) epicStyleOk = false;
          if (rarity !== "epic" && styles.length > 0) noStyleBelowEpic = false;
          for (const affix of item.affixes) {
            const [min, max] = AFFIX_CONFIG[affix.id].ranges[rarity];
            if (affix.value < min || affix.value > max || !AFFIX_CONFIG[affix.id].appliesTo.includes(item.kind)) inRange = false;
            if ((affix.id === "element" || affix.id === "resistance") && affix.element === undefined) inRange = false;
          }
          if (weapon.baseId === "axe" && weapon.affixes.some((a) => a.id === "breaksGuard")) inRange = false;
        }
      }
    }
    t("numero di modificatori secondo la rarità", ok);
    t("niente modificatori ripetuti nello stesso oggetto", noDuplicates);
    t("un Epico ha sempre un modificatore di stile; Non comune e Raro mai", epicStyleOk && noStyleBelowEpic);
    t("valori negli intervalli della rarità, solo sugli oggetti giusti (l'ascia non riceve \"rompe la guardia\")", inRange);
  }
  t("Comune: nessun modificatore", F.rollWeaponItem("dagger", "common", Math.random).affixes.length === 0);

  // --- oggetti fissi ---
  const uniques = [...Object.values(LEGENDARY_ITEMS), ...Object.values(MYTHIC_ITEMS)];
  t("un Leggendario per ogni arma", Object.keys(WEAPON_CONFIG).every((id) => Object.values(LEGENDARY_ITEMS).some((u) => u.kind === "weapon" && u.baseId === id)), Object.keys(WEAPON_CONFIG).filter((id) => !Object.values(LEGENDARY_ITEMS).some((u) => u.baseId === id)).join());
  t("almeno un Mitico arma e un Mitico armatura", Object.values(MYTHIC_ITEMS).some((u) => u.kind === "weapon") && Object.values(MYTHIC_ITEMS).some((u) => u.kind === "armor"));
  t("oggetti fissi: id unici, nome, tipo di base esistente, modificatori validi entro i tetti", new Set(uniques.map((u) => u.id)).size === uniques.length && uniques.every((u) => u.name.length > 0 && (u.kind === "weapon" ? WEAPON_CONFIG[u.baseId] !== undefined : ARMOR_CONFIG[u.baseId] !== undefined) && u.affixes.every((a) => AFFIX_CONFIG[a.id].appliesTo.includes(u.kind) && (AFFIX_CONFIG[a.id].format === "flag" || a.value <= AFFIX_CONFIG[a.id].cap))));
  {
    const legendary = F.rollWeaponItem("spear", "legendary", F.createSeededRandom(1));
    const mythicSword = F.rollWeaponItem("sword", "mythic", F.createSeededRandom(1));
    const mythicDagger = F.rollWeaponItem("dagger", "mythic", F.createSeededRandom(1));
    t("Leggendario estratto: l'oggetto fisso di quell'arma, con il suo nome", legendary.rarity === "legendary" && legendary.uniqueId === "thunderSpear" && F.getItemName(legendary) === "LANCIA DEL TUONO");
    t("Mitico: l'oggetto fisso se l'arma ne ha uno, altrimenti il suo Leggendario", mythicSword.rarity === "mythic" && mythicSword.uniqueId === "eternalShadow" && mythicDagger.rarity === "legendary");
  }

  // --- nomi, prezzi, uguaglianza ---
  {
    const plain = F.createWeaponItem("sword");
    const furious = F.createWeaponItem("sword", "uncommon", [{ id: "damage", value: 5 }]);
    const fiery = F.createArmorItem("ironHelmet", "epic", [{ id: "resistance", value: 30, element: "fire" }, { id: "defense", value: 6 }]);
    t("nomi: Comune = tipo; poi il primo modificatore; le resistenze hanno il loro nome", F.getItemName(plain) === "SPADA" && F.getItemName(furious) === "SPADA DELLA FURIA" && F.getItemName(fiery) === "ELMO DI FERRO DELLA SALAMANDRA");
    t("prezzo secondo la rarità", F.getItemPrice(plain) === 60 && F.getItemPrice(furious) === 90 && F.getItemPrice(fiery) > F.getItemPrice(F.createArmorItem("ironHelmet")));
    t("uguaglianza: stesso tipo, rarità e modificatori", F.areItemsEqual(furious, F.createWeaponItem("sword", "uncommon", [{ id: "damage", value: 5 }])) && !F.areItemsEqual(furious, plain));
    const copy = F.cloneItem(fiery);
    copy.affixes[0].value = 1;
    t("la copia di un oggetto è indipendente", fiery.affixes[0].value === 30);
  }

  // --- borsa con oggetti, zaino, armature ---
  {
    const bag = new Inventory();
    const rareSword = F.createWeaponItem("sword", "rare", [{ id: "damage", value: 8 }, { id: "recovery", value: 9 }]);
    const replaced = bag.addWeapon(rareSword);
    t("un'arma dello stesso tipo ma diversa prende il posto della vecchia (che esce dalla borsa)", replaced.outcome === "replaced" && replaced.droppedItem.rarity === "common" && bag.equippedWeaponItem.rarity === "rare" && bag.weaponIds.join() === "sword");
    t("un'arma identica non si prende due volte", bag.addWeapon(F.cloneItem(rareSword)).outcome === "duplicate");
    const helmet = F.createArmorItem("leatherHelmet");
    t("armatura raccolta con il posto libero: si indossa", bag.pickUpArmor(helmet) === "equipped" && bag.equippedArmor.helmet.baseId === "leatherHelmet");
    t("armatura raccolta con il posto occupato: va nello zaino", bag.pickUpArmor(F.createArmorItem("ironHelmet")) === "stored" && bag.backpackItems.length === 1);
    t("dallo zaino si indossa; quella di prima prende il suo posto nello zaino", bag.equipFromBackpack(0) === "equipped" && bag.equippedArmor.helmet.baseId === "ironHelmet" && bag.backpackItems[0].baseId === "leatherHelmet");
    bag.addToBackpack(F.createWeaponItem("bow", "uncommon", [{ id: "damage", value: 5 }]));
    t("un'arma dello zaino entra nella borsa e si impugna (con le munizioni piene)", bag.equipFromBackpack(1) === "equipped" && bag.equippedWeaponId === "bow" && bag.equippedAmmo === WEAPON_CONFIG.bow.ammo.max && bag.backpackItems.length === 1);
    t("un'arma della borsa va nello zaino; l'ultima no", bag.moveWeaponToBackpack(bag.equippedSlotIndex) === "unequipped" && bag.equippedWeaponId === "sword" && bag.moveWeaponToBackpack(0) === "lastWeapon");
    t("togliere un'armatura: va nello zaino", bag.unequipArmor("helmet") === "unequipped" && bag.equippedArmor.helmet === null && bag.unequipArmor("helmet") === "empty");
    const snap = bag.snapshot();
    while (bag.addToBackpack(F.createArmorItem("clothChest")));
    t("zaino pieno: non entra altro (capacità fissa)", bag.backpackItems.length === bag.backpackCapacity && !bag.hasBackpackRoom && bag.pickUpArmor(F.createArmorItem("clothHelmet")) === "equipped" && bag.pickUpArmor(F.createArmorItem("clothHelmet")) === "full" && bag.unequipArmor("helmet") === "backpackFull");
    bag.restore(snap);
    t("il ripristino del livello riporta anche zaino e armature", bag.backpackItems.length === snap.backpack.length && bag.equippedArmor.helmet === null);
  }

  // --- armature ---
  t("dodici pezzi: quattro materiali per tre posti, con icona e nome", Object.values(ARMOR_CONFIG).length === 12 && Object.keys(ARMOR_MATERIALS).every((m) => ARMOR_SLOTS.every((s) => Object.values(ARMOR_CONFIG).some((a) => a.material === m && a.slot === s))) && Object.values(ARMOR_CONFIG).every((a) => a.name.length > 0 && a.iconSpriteId.startsWith("armorIcon")));
  t("materiali: quattro toni della palette dal più scuro al più chiaro", Object.values(ARMOR_MATERIALS).every((m) => m.tones.length === 4 && m.tones.every((c) => paletteColors.has(c))));
  t("la corazza conta più di elmo e stivali; l'acciaio difende più della stoffa", Object.keys(ARMOR_MATERIALS).every((m) => ARMOR_CONFIG[`${m}Chest`].stats.defense > ARMOR_CONFIG[`${m}Helmet`].stats.defense) && ARMOR_CONFIG.steelChest.stats.defense > ARMOR_CONFIG.clothChest.stats.defense);
  {
    const commonPlate = E.getItemTotals(F.createArmorItem("steelChest"));
    const epicPlate = E.getItemTotals(F.createArmorItem("steelChest", "epic"));
    t("le statistiche base crescono con la rarità (la lentezza no)", epicPlate.defense > commonPlate.defense && epicPlate.maxHealth > commonPlate.maxHealth && epicPlate.moveSpeed === commonPlate.moveSpeed);
  }
  t("set: uno per materiale, bonus con due e con tre pezzi", Object.keys(ARMOR_MATERIALS).every((m) => ARMOR_SETS[m].name.startsWith("SET") && ARMOR_SETS[m].twoPieces.length > 0 && ARMOR_SETS[m].threePieces.length > 0));
  {
    const two = { helmet: F.createArmorItem("ironHelmet"), chest: F.createArmorItem("ironChest"), boots: null };
    const three = { ...two, boots: F.createArmorItem("ironBoots") };
    const totalsTwo = E.computeEquipmentTotals(null, two);
    const totalsThree = E.computeEquipmentTotals(null, three);
    const ironHealth = ARMOR_CONFIG.ironHelmet.stats.maxHealth + ARMOR_CONFIG.ironChest.stats.maxHealth;
    const ironDefense = ARMOR_CONFIG.ironHelmet.stats.defense + ARMOR_CONFIG.ironChest.stats.defense + ARMOR_CONFIG.ironBoots.stats.defense;
    t("set del Soldato: con due pezzi più salute, con tre anche più difesa", totalsTwo.maxHealth === ironHealth + ARMOR_SETS.iron.twoPieces[0].value && totalsThree.defense === ironDefense + ARMOR_SETS.iron.threePieces[0].value && E.getActiveSets(three)[0].pieces === 3);
    t("pezzi di materiali diversi: nessun set", E.getActiveSets({ helmet: F.createArmorItem("ironHelmet"), chest: F.createArmorItem("steelChest"), boots: null }).length === 0);
  }
  {
    const huge = Array.from({ length: 3 }, () => F.createArmorItem("steelChest", "epic", [{ id: "defense", value: 30 }, { id: "maxHealth", value: 50 }, { id: "resistance", value: 50, element: "fire" }]));
    const bonuses = E.computeEquipmentBonuses(F.createWeaponItem("sword", "epic", [{ id: "damage", value: 49 }, { id: "lifeSteal", value: 7 }, { id: "recovery", value: 40 }]), { helmet: huge[0], chest: huge[1], boots: huge[2] });
    t("tetti: difesa al massimo 25%, salute +40, resistenza 60%, recupero 30%, furto di vita 8%", Math.abs(bonuses.damageTakenMultiplier - 0.75) < 1e-9 && bonuses.maxHealth === 40 && Math.abs(bonuses.resistances.fire - 0.6) < 1e-9 && Math.abs(bonuses.recoveryMultiplier - 0.7) < 1e-9 && bonuses.lifeStealFraction <= 0.08);
    t("tetto del danno: +50% (più la rarità dell'arma)", Math.abs(bonuses.damageMultiplier - RARITY_CONFIG.epic.weaponDamageMultiplier * 1.49) < 1e-9);
    const slow = E.computeEquipmentBonuses(null, { helmet: null, chest: F.createArmorItem("steelChest", "common", [{ id: "moveSpeed", value: -50 }]), boots: null });
    t("la velocità non scende sotto -20%", slow.movementSpeedMultiplier >= 0.8 - 1e-9);
    t("senza equipaggiamento nessun bonus", JSON.stringify(E.computeEquipmentBonuses(F.createWeaponItem("sword"), E.EMPTY_ARMOR)) === JSON.stringify(E.NO_EQUIPMENT_BONUSES));
  }

  // --- giocatore ---
  {
    const p = new Player(0, 0, CHARACTER_CONFIG.knight);
    const baseHealth = p.maxHealth;
    p.setArmor({ helmet: F.createArmorItem("ironHelmet"), chest: F.createArmorItem("ironChest"), boots: null });
    const armorHealth = ARMOR_CONFIG.ironHelmet.stats.maxHealth + ARMOR_CONFIG.ironChest.stats.maxHealth + ARMOR_SETS.iron.twoPieces[0].value;
    t("armature sul giocatore: salute massima più alta, quella attuale non sale da sola", p.maxHealth === baseHealth + armorHealth && p.currentHealth === baseHealth);
    p.revive();
    const healthBefore = p.currentHealth;
    p.takeDamage(20, 1000);
    const expected = Math.max(1, Math.round(20 * (1 - (ARMOR_CONFIG.ironHelmet.stats.defense + ARMOR_CONFIG.ironChest.stats.defense) / 100)));
    t("la difesa riduce il danno subito", healthBefore - p.currentHealth === expected, `${healthBefore - p.currentHealth} vs ${expected}`);
    const tank = new Player(0, 0, CHARACTER_CONFIG.paladin);
    tank.setArmor({ helmet: F.createArmorItem("steelHelmet", "epic", [{ id: "defense", value: 30 }]), chest: F.createArmorItem("steelChest", "epic", [{ id: "defense", value: 30 }]), boots: null });
    const tankHealth = tank.currentHealth;
    tank.takeDamage(1, 1000);
    t("un colpo toglie sempre almeno 1 HP", tankHealth - tank.currentHealth === 1);
    const resistant = new Player(0, 0, CHARACTER_CONFIG.knight);
    resistant.setArmor({ helmet: F.createArmorItem("clothHelmet", "rare", [{ id: "resistance", value: 50, element: "fire" }]), chest: null, boots: null });
    const h0 = resistant.currentHealth;
    resistant.takeDamage(20, 1000, "fire");
    const fireLoss = h0 - resistant.currentHealth;
    const other = new Player(0, 0, CHARACTER_CONFIG.knight);
    other.setArmor({ helmet: F.createArmorItem("clothHelmet", "rare", [{ id: "resistance", value: 50, element: "fire" }]), chest: null, boots: null });
    const h1 = other.currentHealth;
    other.takeDamage(20, 1000, "poison");
    const clothDefense = 1 - E.getItemTotals(F.createArmorItem("clothHelmet", "rare")).defense / 100;
    t("resistenza al fuoco: i colpi di fuoco fanno metà danno, gli altri no", fireLoss === Math.round(20 * clothDefense * 0.5) && h1 - other.currentHealth === Math.round(20 * clothDefense), `${fireLoss} ${h1 - other.currentHealth}`);
    const fighter = new Player(0, 0, CHARACTER_CONFIG.knight);
    fighter.equipWeapon(WEAPON_CONFIG.sword, null, F.createWeaponItem("sword", "rare", [{ id: "damage", value: 10 }, { id: "element", value: 0, element: "frost" }]));
    t("arma con modificatori: danno più alto ed elemento nei colpi", Math.abs(fighter.getDamageMultiplier() - RARITY_CONFIG.rare.weaponDamageMultiplier * 1.1) < 1e-9 && fighter.getAttackElements().includes("frost") && fighter.getHitProperties(WEAPON_CONFIG.sword.attacks.swordLight1).elements.includes("frost"));
    fighter.equipWeapon(WEAPON_CONFIG.axe);
    t("cambiando arma senza oggetto: arma Comune, i bonus della vecchia spariscono", fighter.equippedWeaponItem.baseId === "axe" && fighter.equippedWeaponItem.rarity === "common" && fighter.getAttackElements().length === 0);
    const guardBreaker = new Player(0, 0, CHARACTER_CONFIG.knight);
    guardBreaker.equipWeapon(WEAPON_CONFIG.sword, null, F.createWeaponItem("sword", "epic", [{ id: "breaksGuard", value: 0 }]));
    t("\"rompe la guardia\" vale per tutti i colpi dell'arma", guardBreaker.getHitProperties(WEAPON_CONFIG.sword.attacks.swordLight1).breaksGuard === true);
    const vampire = new Player(0, 0, CHARACTER_CONFIG.knight);
    vampire.equipWeapon(WEAPON_CONFIG.sword, null, F.createWeaponItem("sword", "rare", [{ id: "lifeSteal", value: 5 }]));
    vampire.takeDamage(30, 1000);
    const hurt = vampire.currentHealth;
    for (let i = 0; i < 10; i++) vampire.registerDamageDealt(10);
    t("furto di vita: il 5% di 100 danni inflitti torna in salute (a punti interi)", vampire.currentHealth === hurt + 5);
  }

  // --- aspetto: solo ricolorazioni ---
  {
    const sm = new FakeSpriteManager();
    registerKnightSprites(sm, "knight");
    registerKnightSprites(sm, "ranger");
    registerItemSprites(sm);
    const idle = sm.sprites.get("knightIdle1");
    const flatKeys = idle.rows.join("");
    t("il cavaliere ha chiavi proprie per elmo (1-4) e gambe (5-7)", HELMET_TONE_KEYS.some((k) => flatKeys.includes(k)) && BOOT_TONE_KEYS.every((k) => flatKeys.includes(k)) && !idle.rows.slice(0, 8).join("").match(/[dgsw]/));
    t("senza armatura gli stessi colori di sempre (elmo e gambe come l'armatura)", idle.colors["1"] === idle.colors.d && idle.colors["4"] === idle.colors.w && idle.colors["5"] === idle.colors.d && idle.colors["7"] === idle.colors.s);
    const ranger = sm.sprites.get("knightIdle1Ranger");
    t("ranger: il cappuccio prende le chiavi dell'elmo", ["2", "3", "4"].every((k) => ranger.rows.join("").includes(k)) && ranger.colors["3"] === PALETTE.darkGreen);
    t("icone delle armature registrate (16x16)", ["armorIconHelmet", "armorIconChest", "armorIconBoots"].every((id) => sm.sprites.get(id)?.width === 16 && sm.sprites.get(id)?.height === 16));
    const variant = V.buildEquipmentVariant(F.createWeaponItem("sword", "epic"), { helmet: F.createArmorItem("ironHelmet", "rare"), chest: null, boots: F.createArmorItem("leatherBoots") }, true);
    t("variante: metallo dell'arma della rarità, elmo e stivali nei toni del materiale", variant.colors.b === RARITY_CONFIG.epic.weaponColors.metal && variant.colors["1"] === ARMOR_MATERIALS.iron.tones[0] && variant.colors["4"] === RARITY_CONFIG.rare.color && variant.colors["5"] === ARMOR_MATERIALS.leather.tones[0] && variant.colors.d === undefined);
    t("con il fuoco: la variante senza l'arma (lama incandescente)", V.buildEquipmentVariant(F.createWeaponItem("sword", "epic"), E.EMPTY_ARMOR, false) === null);
    t("nessun cambio di colore senza equipaggiamento", V.buildEquipmentVariant(F.createWeaponItem("sword"), E.EMPTY_ARMOR, true) === null);
    const allVariantColors = [];
    for (const rarity of RARITY_ORDER) {
      for (const id of Object.keys(ARMOR_CONFIG)) allVariantColors.push(...Object.values(V.getItemIconVariant(F.createArmorItem(id, rarity)).colors), ...Object.values(V.getArmorPieceColors(F.createArmorItem(id, rarity))));
      allVariantColors.push(...Object.values(V.getWeaponRarityColors(rarity)));
    }
    t("tutti i colori delle varianti sono della palette", allVariantColors.every((c) => paletteColors.has(c)));
    t("le chiavi dell'arma (b, v) e quelle delle armature non si sovrappongono a ferro scuro e corda (j, q)", Object.keys(V.getArmorPieceColors(F.createArmorItem("ironChest"))).every((k) => !["b", "v", "j", "q"].includes(k)));
  }
}
