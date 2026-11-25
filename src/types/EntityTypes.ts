import type { FacingDirection, Rectangle, Vector2 } from "./GameTypes";

/** Stati possibili del protagonista (corrispondono alle animazioni). */
export type PlayerState =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "fall"
  | "attack"
  | "hurt"
  | "dodge"
  | "crouch"
  | "guard"
  | "dead";

/**
 * Modificatori del movimento del giocatore dati dall'ambiente (acqua, ghiaccio). Vedi HazardSystem.
 * Nell'ambiente normale tutti i moltiplicatori valgono 1 e l'aderenza è piena (null).
 */
export interface PlayerEnvironment {
  speedMultiplier: number;
  gravityMultiplier: number;
  maxFallSpeedMultiplier: number;
  jumpMultiplier: number;
  /** Aderenza (1/s) con cui la velocità orizzontale raggiunge quella voluta; null = istantanea. */
  traction: number | null;
  /** Vero in acqua: si può saltare (nuotare) anche senza toccare terra. */
  canSwim: boolean;
  /** Zone in cui gli scatti delle abilità si fermano (gli spuntoni del livello, Fase 8). */
  dashStopZones?: readonly Rectangle[];
}

/** Identificatori dei power-up (vedi powerUpConfig.ts). */
export type PowerUpId = "berserk" | "speed" | "shield" | "fire" | "regeneration" | "poison" | "frost" | "shock";

/**
 * Elementi (Fase 7): un colpo con un elemento lascia un effetto di stato sul bersaglio.
 * fuoco = bruciatura, veleno = danno nel tempo, gelo = rallenta, shock = stordisce per un attimo.
 */
export type ElementId = "fire" | "poison" | "frost" | "shock";

/**
 * Resistenze e debolezze di un nemico o di un boss: moltiplicatore per elemento (1 se omesso).
 * 0 = immune (l'effetto non si applica); meno di 1 = resiste (effetto più debole o più breve); più di 1 = debole.
 */
export type ElementModifiers = Partial<Record<ElementId, number>>;

/**
 * Statistiche del giocatore modificabili dai power-up. Il valore effettivo è
 * (base + somma dei bonus "add") x prodotto dei fattori "multiply"; la base è 1 per i
 * moltiplicatori e 0 per i bonus (vedi PlayerModifiers).
 */
export type PlayerStatName =
  | "damageMultiplier"
  | "movementSpeedMultiplier"
  | "damageTakenMultiplier"
  | "bonusDamage"
  | "healthRegenPerSecond"
  /** Punti in più sui massimi di salute, stamina e mana (Classi Fase 0: li useranno attributi e power-up). */
  | "maxHealthBonus"
  | "maxStaminaBonus"
  | "maxManaBonus";

/**
 * Fonti permanenti dei modificatori, accanto ai power-up (Classi Fase 0): restano finché la fonte non le cambia
 * e la morte non le toglie. "attributes" = i cinque attributi del personaggio (vedi AttributeStats).
 */
export type ModifierSourceId = "attributes";

/**
 * Attributi del personaggio (Classi Fase 0, effetti dalla Fase 4): Forza, Destrezza, Intelligenza, Vitalità, Tempra.
 * Ogni punto dà gli effetti indicati in ATTRIBUTE_CONFIG.
 */
export type AttributeId = "strength" | "dexterity" | "intelligence" | "vitality" | "endurance";

/** Valore di ogni attributo (punti). */
export type Attributes = Record<AttributeId, number>;

/** Effetto di un punto di attributo su una statistica: si somma (operazione "add") valuePerPoint x punti. */
export interface AttributeEffectPerPoint {
  stat: PlayerStatName;
  valuePerPoint: number;
}

/** Definizione di un attributo (dati, nessuna logica). */
export interface AttributeDefinition {
  id: AttributeId;
  /** Nome mostrato al giocatore (es. "FORZA") e sigla per il pentagono (es. "FOR"). */
  name: string;
  shortName: string;
  /** Effetti di ogni punto (Classi Fase 0: nessuno, l'attributo non cambia niente). */
  effectsPerPoint: readonly AttributeEffectPerPoint[];
}

/** Effetto di un power-up su una statistica. */
export interface StatModifierEffect {
  stat: PlayerStatName;
  operation: "add" | "multiply";
  value: number;
}

/** Definizione di un power-up (dati, nessuna logica). */
export interface PowerUpDefinition {
  id: PowerUpId;
  name: string;
  description: string;
  /** "temporary" scade dopo durationMs; "permanent" resta fino alla fine della partita (punto di estensione). */
  type: "temporary" | "permanent";
  effects: StatModifierEffect[];
  durationMs: number;
  /** Requisiti (punto di estensione): livello minimo a partire dal quale ha effetto. */
  requirements?: { minLevel?: number };
  /** Icona nell'HUD (sprite 8x8: lo stesso dell'oggetto da raccogliere). */
  iconSpriteId: string;
  /** Colore dell'alone attorno al cavaliere e della barra del tempo nell'HUD. */
  auraColor: string;
  /** Elemento dato ai colpi del cavaliere finché il power-up è attivo (Fase 7). */
  element?: ElementId;
}

/** Power-up attivo: la definizione e il tempo che resta (per l'HUD). */
export interface ActivePowerUp {
  definition: PowerUpDefinition;
  remainingMs: number;
}

/** Stati possibili dei nemici. */
export type EnemyState =
  | "idle"
  | "patrol"
  | "chase"
  | "attack"
  | "hurt"
  | "dead";

/**
 * Comportamenti AI disponibili per i nemici.
 * "ranged" tira proiettili da lontano (serve "ranged"); "flyer" vola e attacca in picchiata (serve "flight").
 */
export type EnemyBehavior = "patrol" | "chase" | "guard" | "ranged" | "flyer";

/** Identificatori dei tipi di nemico normale. */
export type EnemyTypeId =
  | "skeleton"
  | "goblin"
  | "soldier"
  | "skeletonArcher"
  | "bat"
  | "wolf"
  | "slime"
  | "slimeSmall"
  | "iceGolem"
  | "raider"
  | "scorpion"
  | "vulture";

/** Identificatori dei tipi di proiettile (vedi projectileConfig.ts). */
export type ProjectileTypeId = "arrow" | "magicBolt" | "fireball" | "playerArrow" | "crossbowBolt" | "throwingKnife" | "javelin" | "hatchet";

/** Attacco a distanza di un nemico: alla fine della preparazione lancia un proiettile invece di colpire davanti a sé. */
export interface RangedAttackDefinition {
  projectileId: ProjectileTypeId;
  /** Altezza (px) da cui parte il proiettile, misurata dalla cima dell'hitbox. */
  launchOffsetY: number;
  /** Se il giocatore è più vicino di così (px tra le hitbox) il nemico indietreggia. */
  retreatDistance: number;
}

/** Volo di un nemico: niente gravità, volteggia e attacca in picchiata. */
export interface FlightDefinition {
  /** Quota (px) a cui si tiene sopra la testa del giocatore mentre lo segue. */
  hoverHeight: number;
  /** Velocità (px/s) della picchiata (la fase attiva dell'attacco). */
  diveSpeed: number;
  /** Ampiezza (px) e periodo (ms) dell'oscillazione verticale in volo. */
  bobAmplitude: number;
  bobPeriodMs: number;
}

/** Configurazione di un tipo di proiettile. Il danno lo decide chi lo lancia. */
export interface ProjectileDefinition {
  id: ProjectileTypeId;
  name: string;
  /** Velocità (px/s). */
  speed: number;
  /** Frazione della gravità applicata (0 = traiettoria dritta). */
  gravityScale: number;
  /** Durata massima in volo (ms). */
  lifetimeMs: number;
  hitbox: { width: number; height: number };
  /** Vero se la spada del giocatore può distruggerlo in volo. */
  isDeflectable: boolean;
  /** Frame dell'animazione (id degli sprite) e durata di ciascuno. */
  frameIds: string[];
  frameDurationMs: number;
  /** Proiettili del giocatore (Fase 2): trafigge i bersagli invece di fermarsi al primo. */
  isPiercing?: boolean;
  /** Proiettili del giocatore: a fine corsa resta a terra e si recupera (munizione di quest'arma). */
  recoveredAsAmmoOf?: WeaponId;
  /** Elemento del colpo sul giocatore (E2): le resistenze delle armature ne riducono il danno. */
  element?: ElementId;
}

/** Richiesta di lancio di un proiettile (da un nemico o da un boss al motore). */
export interface ProjectileLaunch {
  projectileId: ProjectileTypeId;
  /** Chi lo lancia: i proiettili nemici feriscono il giocatore, quelli del giocatore nemici, boss e forzieri. Se omesso: "enemy". */
  owner?: "enemy" | "player";
  /** Moltiplicatore della velocità di PROJECTILE_CONFIG (es. freccia caricata). Se omesso: 1. */
  speedMultiplier?: number;
  /** Proprietà del colpo per i bersagli (ascia/mazza: non usate dalle armi a distanza, ma possibili). */
  hit?: HitProperties;
  /** Centro del proiettile alla partenza (coordinate del mondo). */
  origin: Vector2;
  /** Direzione (vettore di lunghezza 1). */
  direction: Vector2;
  damage: number;
}

/** Richiesta di evocazione di un nemico (da un boss al motore). */
export interface SummonRequest {
  enemyType: EnemyTypeId;
  /** Angolo in alto a sinistra dell'hitbox del nemico evocato. */
  position: Vector2;
}

/** Configurazione di un tipo di nemico (vedi enemyConfig.ts). */
export interface EnemyDefinition {
  id: EnemyTypeId;
  name: string;
  /** Resistenze e debolezze agli elementi (Fase 7). */
  elementModifiers?: ElementModifiers;
  /** Elemento dei colpi (equipaggiamento, E2): le resistenze delle armature del giocatore ne riducono il danno. */
  attackElement?: ElementId;
  maxHealth: number;
  attackDamage: number;
  movementSpeed: number;
  detectionRange: number;
  attackRange: number;
  /** Pausa tra la fine di un attacco e l'inizio del successivo (ms). */
  attackCooldownMs: number;
  /** Fasi dell'attacco (ms): preparazione (windup), colpo attivo, recupero. */
  attackWindupMs: number;
  attackActiveMs: number;
  attackRecoveryMs: number;
  hurtDurationMs: number;
  knockbackSpeed: number;
  /**
   * Un colpo subito interrompe l'attacco del nemico solo nei primi ms della preparazione.
   * Dopo il nemico completa l'attacco (subisce il danno ma non vacilla). 0 = mai interrompibile.
   */
  attackInterruptWindowMs: number;
  /** Distanza (px) dal punto di partenza entro cui pattuglia (usata dal comportamento "patrol"). */
  patrolDistance: number;
  behavior: EnemyBehavior;
  scoreReward: number;
  hitbox: Rectangle;
  /** Solo per il comportamento "ranged". */
  ranged?: RangedAttackDefinition;
  /** Solo per il comportamento "flyer". */
  flight?: FlightDefinition;
  /** Balzo: durante la fase attiva dell'attacco il nemico scatta in avanti a questa velocità (px/s). */
  lunge?: { speed: number };
  /** Alla morte si divide: compaiono "count" nemici di tipo "enemyType" dove è morto. */
  splitInto?: { enemyType: EnemyTypeId; count: number };
  /**
   * Corazza: i colpi con danno minore di breakDamage (gli attacchi leggeri) fanno solo
   * damageMultiplier del danno; i colpi più forti (l'attacco pesante) fanno il danno pieno.
   */
  armor?: { damageMultiplier: number; breakDamage: number };
}

/** Definizione di un attacco (spada, combo...). */
export interface AttackDefinition {
  id: string;
  damage: number;
  /** Durata totale dell'attacco (windup + colpo + chiusura). */
  durationMs: number;
  /** Il colpo è attivo (può ferire) tra hitStartMs e hitEndMs dall'inizio dell'attacco. */
  hitStartMs: number;
  hitEndMs: number;
  /** Pausa dopo la fine dell'attacco prima di poterne iniziare un altro. */
  cooldownMs: number;
  /** Area colpita, relativa al personaggio che guarda a destra. */
  hitbox: Rectangle;
  animation: string;
  /** Rompe la guardia (ascia): interrompe anche gli attacchi nemici già avviati. */
  breaksGuard?: boolean;
  /**
   * Colpo in picchiata (solo in aria): il cavaliere scende a fallSpeed px/s finché tocca terra
   * (fine dell'attacco, poi cooldownMs di recupero) o colpisce qualcosa (rimbalza a bounceSpeed px/s).
   */
  plunge?: { fallSpeed: number; bounceSpeed: number };
  /** Schiaccia le corazze (mazza): danno pieno contro i nemici corazzati, che restano storditi. */
  crushesArmor?: boolean;
  /**
   * Armi a distanza (Fase 2): a launchAtMs dall'inizio dell'attacco parte un proiettile da (originX, originY),
   * relativi al cavaliere che guarda a destra, nella direzione (avanti, aimY). L'attacco non ha area d'urto.
   */
  projectile?: {
    projectileId: ProjectileTypeId;
    launchAtMs: number;
    originX: number;
    originY: number;
    aimY: number;
    /** false = il tiro non consuma munizioni dell'arma in mano (abilità del Ranger). Se omesso: le consuma. */
    usesAmmo?: boolean;
  };
  /**
   * Scatto durante l'attacco (abilità, Fase 5): tra startMs ed endMs il personaggio si muove a speed px/s
   * (positivo = in avanti, negativo = all'indietro) e attraversa i nemici; invulnerable = non viene colpito.
   */
  dash?: { speed: number; startMs: number; endMs: number; invulnerable?: boolean };
  /**
   * Carica (arco): finché si tiene premuto il tasto il cavaliere tende l'arco (fino a maxChargeMs; dopo durationMs
   * tira da solo); rilasciando parte releaseAttackId, con danno e velocità tra il minimo e il massimo secondo la carica.
   */
  charge?: { maxChargeMs: number; releaseAttackId: string; minDamage: number; maxDamage: number; minSpeedMultiplier: number; maxSpeedMultiplier: number };
}

/** Proprietà del colpo che il bersaglio deve conoscere (vedi Damageable.receiveHit). */
export type HitProperties = Pick<AttackDefinition, "breaksGuard" | "crushesArmor"> & {
  /** Elementi del colpo (Fase 7, dai power-up attivi): ognuno lascia il suo effetto di stato. */
  elements?: ElementId[];
};

/** Sequenza statica di attacchi concatenati (anche mista: leggero e pesante). */
export interface ComboDefinition {
  id: string;
  /** Nome mostrato quando la combo viene completata (facoltativo). */
  name?: string;
  /** Azioni da premere in sequenza, es. ["attack","attack","attack"]. */
  inputSequence: string[];
  /** Id degli attacchi eseguiti, nello stesso ordine. */
  attackIds: string[];
  /** Tempo massimo (ms) tra un colpo e il successivo. */
  comboWindowMs: number;
}

/** Armi del giocatore: corpo a corpo (Fase 1) e a distanza (Fase 2). */
export type WeaponId = "sword" | "dagger" | "spear" | "axe" | "mace" | "bow" | "crossbow" | "throwingKnives" | "javelin" | "greatsword";

/**
 * Categorie delle armi (Classi Fase 0): la tabella di compatibilità classe x categoria (WEAPON_AFFINITY_CONFIG)
 * decide bonus, malus e divieti. blade = spada e pugnale; heavy = ascia, mazza e spadone; polearm = lancia;
 * ranged = arco e balestra; thrown = coltelli e giavellotto.
 */
export type WeaponCategoryId = "blade" | "heavy" | "polearm" | "ranged" | "thrown";

/**
 * Compatibilità di una classe con una categoria di armi (Classi Fase 0: tutte neutre, valori dalla Fase 3).
 * isAllowed = false: la classe non può impugnarla. I moltiplicatori valgono sul danno inflitto e sul recupero
 * tra un attacco e l'altro (meno di 1 = più rapido).
 */
export interface WeaponAffinity {
  isAllowed: boolean;
  damageMultiplier: number;
  recoveryMultiplier: number;
}

/** Input che fanno partire un attacco. */
export type AttackInputAction = "attack" | "heavyAttack";

/**
 * Un'arma: i propri attacchi, le proprie combo e l'attacco predefinito per ogni input.
 * L'aspetto viene dalle animazioni indicate negli attacchi (e quindi dai loro sprite).
 */
export interface WeaponDefinition {
  id: WeaponId;
  /** Nome mostrato al giocatore. */
  name: string;
  /** Suffisso degli sprite del cavaliere con quest'arma in mano ("" per la spada, vedi knightSprites.ts). */
  spriteSuffix: string;
  /** Sprite 16x16 dell'arma (oggetto a terra e HUD). */
  iconSpriteId: string;
  /** Attacchi dell'arma, per id (gli id devono essere unici fra tutte le armi). */
  attacks: Record<string, AttackDefinition>;
  /** Combo dell'arma: usano solo i suoi attacchi. */
  combos: ComboDefinition[];
  /** Attacco eseguito quando un input non continua nessuna combo. */
  defaultAttackByInput: Record<AttackInputAction, string>;
  /**
   * Attacchi in aria (categoria separata, Fase 3): combo e attacco predefinito per input, con id presi
   * da attacks. Se manca, in aria valgono combo e attacchi di terra.
   */
  air?: { combos: ComboDefinition[]; defaultAttackByInput: Record<AttackInputAction, string> };
  /** Moltiplicatore della velocità di camminata con quest'arma in mano (1 = normale). */
  movementSpeedMultiplier: number;
  /** Categoria (Classi Fase 0): la usa la tabella di compatibilità con le classi. */
  category: WeaponCategoryId;
  /** Peso (unità astratte, 1 = leggerissima): dalla Fase 3 rallenta, dalla Fase 4 richiede Forza. */
  weight: number;
  /** Attributo che dalla Fase 4 fa crescere il danno dell'arma. */
  scalingAttribute: AttributeId;
  /** Munizioni (coltelli, giavellotti): senza, l'arma non attacca. Se omesso: munizioni infinite. */
  ammo?: {
    max: number;
    /** Vero se, finite le munizioni, l'arma sparisce dalla borsa (giavellotto: ogni colpo si perde). */
    isLostWhenEmpty: boolean;
  };
}

/** Abilità speciali dei personaggi (Fase 5). */
export type AbilityId = "shockwave" | "backstepShot" | "furiousCharge" | "shieldGuard";

/**
 * Costo di un'abilità (Classi Fase 0): stamina, mana e salute, ognuno facoltativo (omesso = 0).
 * La salute si paga solo se ne resta almeno un punto.
 */
export interface ResourceCost {
  stamina?: number;
  mana?: number;
  health?: number;
}

/**
 * Modificatore di un'abilità o di un incantesimo (punto di estensione, previsto dopo la 2.6): per ora nessuna
 * abilità ne ha e nessuno li legge.
 */
export interface AbilityModifier {
  id: string;
  value: number;
}

/** Parte comune di ogni abilità. */
interface AbilityBase {
  id: AbilityId;
  name: string;
  description: string;
  /** Costo per usarla (lo scudo: per alzarlo). */
  cost: ResourceCost;
  /** Ricarica (ms) dopo l'uso (lo scudo: dopo averlo abbassato). */
  cooldownMs: number;
  /** Modificatori (punto di estensione): vuoto. */
  modifiers: readonly AbilityModifier[];
}

/**
 * Abilità speciale (tasti 5-8): ha un costo (ResourceCost) e un tempo di ricarica.
 * - attack: un attacco speciale (area d'urto, scatto, proiettile), usato solo a terra;
 *   impactEffect = effetto del motore quando il colpo diventa attivo (onda d'urto: tremolio e polvere).
 * - guard: si tiene premuto per alzare lo scudo (para i colpi davanti); alzato da meno di perfectWindowMs, la
 *   parata è perfetta (nessun costo, l'attaccante resta stordito parryStunMs); altrimenti costa
 *   staminaPerBlockedDamage per punto di danno parato, e se la stamina non basta la guardia si rompe.
 */
export type AbilityDefinition =
  | (AbilityBase & {
      kind: "attack";
      attack: AttackDefinition;
      impactEffect?: "shockwave";
    })
  | (AbilityBase & {
      kind: "guard";
      /** Stamina consumata al secondo con lo scudo alzato. */
      drainPerSecond: number;
      perfectWindowMs: number;
      staminaPerBlockedDamage: number;
      parryStunMs: number;
    });

/** Esito di un colpo ricevuto con lo scudo alzato (abilità del Paladino). */
export type GuardOutcome = "perfect" | "blocked" | "broken";

/** Personaggi giocabili (Fase 4). */
export type CharacterId = "knight" | "ranger" | "berserker" | "paladin";

/**
 * Un personaggio: le statistiche che cambiano da una classe all'altra, l'arma con cui inizia e l'aspetto.
 * Ciò che è comune a tutti (salto, hitbox, tempi di danno e di attacco) resta in PLAYER_CONFIG.
 */
export interface CharacterDefinition {
  id: CharacterId;
  /** Nome mostrato al giocatore (es. "CAVALIERE"). */
  name: string;
  /** Descrizione breve (schermata di scelta). */
  description: string;
  /** Tratto particolare, in poche parole (schermata di scelta). */
  trait: string;
  /** Suffisso degli sprite del personaggio ("" per il cavaliere, vedi knightSprites.ts). */
  spriteSuffix: string;
  /** Arma impugnata a ogni nuova partita (l'unica arma all'inizio della partita). */
  startingWeaponId: WeaponId;
  maxHealth: number;
  /** Velocità di camminata (pixel/secondo), prima dei moltiplicatori di arma, ambiente e power-up. */
  movementSpeed: number;
  /** Moltiplicatore del danno inflitto (1 = cavaliere). */
  damageMultiplier: number;
  /** Moltiplicatore del danno subito (1 = cavaliere; lo scudo del paladino lo riduce). */
  damageTakenMultiplier: number;
  dodgeDurationMs: number;
  /** Attesa (ms) dopo una schivata prima della successiva. */
  dodgeCooldownMs: number;
  dodgeSpeed: number;
  /** Cura lenta: HP al secondo dopo delayAfterHitMs senza subire colpi. Se omessa, nessuna cura. */
  regeneration?: { healthPerSecond: number; delayAfterHitMs: number };
  /** Stamina (Fase 5): massimo e recupero al secondo (dopo PLAYER_CONFIG.staminaRegenDelayMs dall'ultimo consumo). */
  maxStamina: number;
  staminaRegenPerSecond: number;
  /** Stamina consumata da una schivata. */
  dodgeStaminaCost: number;
  /** Mana (Classi Fase 0): massimo e recupero al secondo (dopo PLAYER_CONFIG.manaRegenDelayMs). 0 = nessun mana. */
  maxMana: number;
  manaRegenPerSecond: number;
  /** Attributi di partenza (Classi Fase 0: tutti a zero). */
  baseAttributes: Readonly<Attributes>;
  /** Abilità speciali, una per slot (Classi Fase 0: una sola, tasto 5 o L). Player ne tiene attivo uno. */
  abilityIds: readonly AbilityId[];
  /**
   * Sblocco (Fase 6): il personaggio si sceglie solo dopo aver raggiunto questo livello (1 = subito disponibile).
   * unlockText descrive l'obiettivo nella schermata di scelta.
   */
  unlockLevel: number;
  unlockText: string;
}

/** Qualsiasi cosa possa essere colpita dagli attacchi (nemici, boss, bersagli di prova). */
export interface Damageable {
  readonly isAlive: boolean;
  getBounds(): Rectangle;
  /** Chiamata dal CombatSystem quando l'attacco va a segno. */
  receiveHit(damage: number, hitDirection: FacingDirection, hit?: HitProperties): void;
}

/** Tipi di attacco di un boss. */
export type BossAttackKind = "melee" | "charge" | "projectile" | "summon";

/**
 * Parte comune di ogni attacco di un boss: tre fasi (preparazione ben visibile, fase attiva,
 * recupero). Le animazioni dipendono dal tipo (BOSS_ATTACK_ANIMATIONS in animationConfig.ts).
 */
interface BossAttackBase {
  /** Identificatore, usato nei pesi delle fasi (attackWeights). */
  id: string;
  kind: BossAttackKind;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
}

/** Colpo d'arma davanti a sé, a portata "range" (px dal bordo dell'hitbox). */
export interface BossMeleeAttackDefinition extends BossAttackBase {
  kind: "melee";
  damage: number;
  range: number;
}

/** Scatto in avanti per activeMs: tutto il corpo ferisce; si ferma contro i muri. Solo da almeno minDistance. */
export interface BossChargeAttackDefinition extends BossAttackBase {
  kind: "charge";
  damage: number;
  speed: number;
  minDistance: number;
}

/** Ventaglio di proiettili mirati al giocatore, lanciati all'inizio della fase attiva. Solo da almeno minDistance. */
export interface BossProjectileAttackDefinition extends BossAttackBase {
  kind: "projectile";
  damage: number;
  projectileId: ProjectileTypeId;
  /** Numero di proiettili e apertura totale del ventaglio (gradi). */
  count: number;
  spreadDegrees: number;
  /** Punto di lancio rispetto al boss rivolto a destra (dall'angolo in alto a sinistra dell'hitbox). */
  launchOffset: Vector2;
  minDistance: number;
}

/** Evoca nemici accanto a sé, senza superare maxAlive evocati vivi contemporaneamente. */
export interface BossSummonAttackDefinition extends BossAttackBase {
  kind: "summon";
  enemyType: EnemyTypeId;
  count: number;
  maxAlive: number;
  /** Distanza orizzontale (px) dal boss a cui compaiono gli evocati. */
  spawnDistance: number;
}

export type BossAttackDefinition =
  | BossMeleeAttackDefinition
  | BossChargeAttackDefinition
  | BossProjectileAttackDefinition
  | BossSummonAttackDefinition;

/** Fase di un combattimento contro il boss: si attiva quando la salute scende sotto la soglia. */
export interface BossPhaseDefinition {
  /** La fase è attiva quando la salute (in %) è minore o uguale a questo valore. */
  healthPercentThreshold: number;
  speedMultiplier: number;
  /** Moltiplicatore della pausa tra un attacco e l'altro (< 1 = più aggressivo). */
  cooldownMultiplier: number;
  /**
   * Peso di ogni attacco (id -> peso) nel sorteggio del prossimo attacco: la probabilità è
   * peso / somma dei pesi. Un attacco assente o con peso 0 non viene scelto in questa fase.
   */
  attackWeights: Record<string, number>;
}

/** Configurazione di un boss. */
export interface BossDefinition {
  id: string;
  name: string;
  /** Resistenze e debolezze agli elementi (Fase 7). I boss non vengono storditi: lo shock li ferisce subito. */
  elementModifiers?: ElementModifiers;
  /** Arma lasciata come trofeo: compare all'inizio del livello successivo. */
  weaponReward?: WeaponId;
  maxHealth: number;
  movementSpeed: number;
  /** Distanza orizzontale (px) entro cui il boss si risveglia. */
  activationRange: number;
  /**
   * Attacchi disponibili, al massimo uno per tipo. L'ordine conta nel sorteggio: i pesi si
   * sommano nell'ordine di questo elenco.
   */
  attacks: BossAttackDefinition[];
  attackCooldownMs: number;
  hitFlashMs: number;
  deathDurationMs: number;
  scoreReward: number;
  hitbox: Rectangle;
  /** Fasi in ordine di soglia decrescente (la prima ha soglia 100). */
  phases: BossPhaseDefinition[];
}
