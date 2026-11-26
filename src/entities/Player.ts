import { getAttackWorldHitbox } from "../combat/AttackDefinition";
import { CombatSystem } from "../combat/CombatSystem";
import { ComboManager } from "../combat/ComboManager";
import { PlayerModifiers } from "../combat/PlayerModifiers";
import { ResourcePool } from "../combat/ResourcePool";
import { KNIGHT_CROUCH_SUFFIX, KNIGHT_FIRE_SUFFIX } from "../rendering/sprites/knightSprites";
import { buildEquipmentVariant } from "../rendering/sprites/equipmentVisuals";
import { WEAPON_TINT_COLORS } from "../rendering/sprites/abilitySprites";
import { ABILITY_VISUAL_CONFIG, GUARD_FRAME_DURATION_MS, type AbilityEffectCue } from "../config/abilityVisualConfig";
import type { SpriteColorVariant } from "../rendering/SpriteManager";
import {
  NO_STRENGTH_PENALTIES,
  combineCappedFraction,
  computeAttributeEffects,
  computeEffectiveAttributes,
  computeStrengthPenalties,
  getPointsAboveBase,
  getWeaponScalingMultiplier,
  meetsGradeRequirement,
  type StrengthPenalties,
} from "../systems/AttributeStats";
import { EMPTY_ARMOR, NO_EQUIPMENT_BONUSES, computeEquipmentBonuses } from "../systems/EquipmentStats";
import { createWeaponItem } from "../systems/ItemFactory";
import { GAME_CONFIG, PALETTE } from "../config/gameConfig";
import { PLAYER_ANIMATIONS } from "../config/animationConfig";
import { ABILITY_CONFIG, ABILITY_UNLOCK_CONFIG } from "../config/abilityConfig";
import { AFFIX_CONFIG } from "../config/affixConfig";
import { ARMOR_CONFIG, ARMOR_SLOTS } from "../config/armorConfig";
import { ATTRIBUTE_ORDER, ZERO_ATTRIBUTES } from "../config/attributeConfig";
import { CHARACTER_CONFIG, DEFAULT_CHARACTER_ID } from "../config/characterConfig";
import { ABILITY_SLOT_ACTIONS } from "../config/controlsConfig";
import { PLAYER_CONFIG } from "../config/playerConfig";
import { getWeaponAffinity } from "../config/weaponAffinityConfig";
import { DEFAULT_WEAPON_ID, WEAPON_CONFIG } from "../config/weaponConfig";
import { AnimationPlayer } from "../rendering/AnimationManager";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteManager } from "../rendering/SpriteManager";
import { canWieldWeapon, getWeaponMaxAmmo } from "../systems/WeaponAffinity";
import { CollisionSystem } from "../systems/CollisionSystem";
import type { AbilityDefinition, AttackDefinition, AttributeId, Attributes, CharacterDefinition, Damageable, ElementId, GuardOutcome, HitProperties, PlayerEnvironment, PlayerState, PlayerStatName, PowerUpDefinition, ProjectileLaunch, ResourceCost, SpellFocusDefinition, WeaponAffinity, WeaponDefinition } from "../types/EntityTypes";
import type { GameAction, InputSource, Rectangle, Vector2 } from "../types/GameTypes";
import type { PlatformDefinition } from "../types/LevelTypes";
import type { EquipmentBonuses, EquippedArmor, WeaponItem } from "../types/ItemTypes";
import { GameObject } from "./GameObject";

/** Intervallo (ms) del lampeggio durante l'invulnerabilità. */
const BLINK_INTERVAL_MS = 80;

type AttackInput = "attack" | "heavyAttack";

/** Dopo una parata, per questo tempo (ms) gli altri colpi dello stesso attacco vengono parati senza costo. */
const GUARD_BLOCK_GRACE_MS = 300;

/** Negli ultimi ms di un power-up l'alone lampeggia (sta per scadere). */
const POWER_UP_WARNING_MS = 2000;

/** Stato di uno slot delle mosse speciali (per l'HUD, Classi Fase 2). */
export interface AbilitySlotStatus {
  ability: AbilityDefinition;
  /** Ricarica che manca (1 = appena usata, 0 = pronta). */
  cooldownFraction: number;
  /** Le risorse bastano per il costo (con lo sconto del catalizzatore). */
  isAffordable: boolean;
  /** Ricarica finita e risorse sufficienti. */
  isReady: boolean;
  /** Slot attivo (l'ultimo scelto con 7-0). */
  isSelected: boolean;
  /** La mossa è stata imparata (Classi Fase 5); altrimenti lo slot è chiuso. */
  isKnown: boolean;
  /** Il grado della mossa è alla portata dell'Intelligenza (Classi Fase 4: requisito rigido). */
  meetsRequirement: boolean;
  /** In uso: guardia alzata. */
  isActive: boolean;
}

/** Ambiente normale: nessun modificatore. */
export const NORMAL_PLAYER_ENVIRONMENT: PlayerEnvironment = {
  speedMultiplier: 1,
  gravityMultiplier: 1,
  maxFallSpeedMultiplier: 1,
  jumpMultiplier: 1,
  traction: null,
  canSwim: false,
};

/**
 * Il personaggio controllato dal giocatore (il cavaliere, o un'altra classe: vedi setCharacter).
 * Le statistiche che cambiano da una classe all'altra vengono da CharacterDefinition, il resto da PLAYER_CONFIG.
 */
export class Player extends GameObject {
  public currentState: PlayerState = "idle";
  /** Ambiente in cui si trova (acqua, ghiaccio...): lo imposta il motore prima di ogni aggiornamento. */
  public environment: PlayerEnvironment = NORMAL_PLAYER_ENVIRONMENT;
  /** Power-up attivi: le statistiche effettive si calcolano da qui, PLAYER_CONFIG resta invariato. */
  public readonly modifiers = new PlayerModifiers();
  /** Classe del personaggio (Fase 4): salute, velocità, danno, schivata, cura lenta e sprite. */
  private character: CharacterDefinition = CHARACTER_CONFIG[DEFAULT_CHARACTER_ID];
  /**
   * Equipaggiamento (piano E1-E4): l'oggetto dell'arma in mano (rarità e modificatori) e le armature indossate.
   * I bonus si calcolano in un punto solo (refreshEquipment).
   */
  private weaponItem: WeaponItem = createWeaponItem(DEFAULT_WEAPON_ID);
  private armor: EquippedArmor = { ...EMPTY_ARMOR };
  private equipment: EquipmentBonuses = NO_EQUIPMENT_BONUSES;
  /** Colori dell'arma (rarità) e delle armature indossate, applicati agli sprite del personaggio (null = nessuno). */
  private equipmentVariant: SpriteColorVariant | null = null;
  /** Gli stessi colori senza quelli dell'arma: con il power-up del fuoco la lama resta incandescente. */
  private armorOnlyVariant: SpriteColorVariant | null = null;
  /** Furto di vita: frazioni di HP non ancora restituite. */
  private lifeStealAccumulator = 0;
  public currentHealth: number = this.character.maxHealth;

  /**
   * Attributi (Classi Fase 4): punti spesi sopra la base della classe, valori effettivi (base + spesi + power-up, entro
   * il massimo), punti sopra la base che danno gli effetti, e malus della Forza per l'equipaggiamento in uso.
   * Si ricalcolano insieme in refreshAttributes.
   */
  private spentAttributeValues: Readonly<Attributes> = ZERO_ATTRIBUTES;
  private effectiveAttributeValues: Readonly<Attributes> = this.character.baseAttributes;
  private attributePointsAboveBase: Readonly<Attributes> = ZERO_ATTRIBUTES;
  private strengthPenalties: Readonly<StrengthPenalties> = NO_STRENGTH_PENALTIES;

  // --- risorse (stamina: Fase 5; mana: Classi Fase 0) e abilità ---
  private readonly staminaPool = new ResourcePool(
    () => this.maxStamina,
    () => this.character.staminaRegenPerSecond * this.getPercentBonusMultiplier("staminaRegenPercent"),
    PLAYER_CONFIG.staminaRegenDelayMs
  );
  private readonly manaPool = new ResourcePool(
    () => this.maxMana,
    () => this.character.manaRegenPerSecond * this.getPercentBonusMultiplier("manaRegenPercent"),
    PLAYER_CONFIG.manaRegenDelayMs
  );
  /** Slot dell'abilità attiva (indice in character.abilityIds) e ricarica che manca a ogni slot (ms). */
  private activeAbilitySlot = 0;
  /** Mosse imparate (Classi Fase 5): sono note le prime knownAbilities di character.abilityIds. */
  private knownAbilities: number = ABILITY_UNLOCK_CONFIG.startingCount;
  private abilityCooldownsMs: number[] = this.character.abilityIds.map(() => 0);
  /** Scudo alzato (abilità del Paladino) e da quanto tempo (per la parata perfetta). */
  private isGuardUp = false;
  private guardElapsedMs = 0;
  private guardGraceRemainingMs = 0;
  /** Esito della parata dell'ultimo colpo ricevuto (null = nessuna parata): CombatSystem stordisce l'attaccante. */
  public lastGuardOutcome: GuardOutcome | null = null;
  private guardEvents: GuardOutcome[] = [];
  private hasPendingTired = false;
  /** Vero dopo un incantesimo rifiutato per mancanza di mana (il motore mostra "SENZA MANA"). */
  private hasPendingNoMana = false;
  /** Vero dopo una mossa rifiutata per il grado troppo alto (il motore mostra "INTELLIGENZA INSUFFICIENTE"). */
  private hasPendingLowIntelligence = false;
  /** Vero dopo aver premuto il tasto di una mossa non ancora imparata. */
  private hasPendingUnknownAbility = false;
  /** Salute pagata per le mosse e non ancora prelevata dal motore (non è un colpo subito). */
  private pendingHealthPaid = 0;
  /** Vero dopo una mossa rifiutata perché la salute non basta a pagarla. */
  private hasPendingLowHealth = false;
  private pendingAbilityName: string | null = null;
  private hasPendingAbilityImpact = false;
  /** Effetti grafici delle mosse dovuti dall'ultima chiamata a drainAbilityEffects (Classi Fase 6A). */
  private pendingAbilityEffects: AbilityEffectCue[] = [];
  /** Varianti di colore con la lama tinta di un elemento, sopra le armature indossate (si azzerano cambiando equipaggiamento). */
  private readonly weaponTintVariants = new Map<ElementId, SpriteColorVariant>();

  private readonly animationPlayer = new AnimationPlayer(PLAYER_ANIMATIONS, "idle");
  /** Arma in mano: decide attacchi e combo (vedi equipWeapon). */
  private weapon: WeaponDefinition = WEAPON_CONFIG[DEFAULT_WEAPON_ID];
  /** Combo a terra e in aria (categorie separate): un attacco usa quella di dove si trova il cavaliere. */
  private groundComboManager = Player.createComboManager(this.weapon, "ground");
  private airComboManager = Player.createComboManager(this.weapon, "air");
  /** Il gestore usato dall'ultimo attacco: cambiando categoria l'altro riparte da capo. */
  private comboManager: ComboManager = this.groundComboManager;
  /** Nome dell'ultima combo completata, finché il motore non lo preleva (per mostrarlo). */
  private completedComboName: string | null = null;
  /** Vero per un frame dopo che un colpo in picchiata ha toccato terra (polvere, tremolio). */
  private hasPendingPlungeLanding = false;

  // --- armi a distanza (Fase 2) ---
  /** Munizioni dell'arma in mano (null = infinite). */
  private ammo: number | null = null;
  /** Il proiettile dell'attacco in corso è già partito. */
  private hasLaunchedCurrentAttack = false;
  /** Tasto che sta caricando l'arco (rilasciandolo si tira), oppure null. */
  private chargeInput: AttackInput | null = null;
  /** Carica del tiro in corso (frazione 0-1 e parametri), dopo il rilascio. */
  private releasedCharge: { fraction: number; charge: NonNullable<AttackDefinition["charge"]> } | null = null;
  private pendingLaunches: ProjectileLaunch[] = [];
  /** Vero dopo un tentativo di attacco senza munizioni (il motore mostra un avviso). */
  private hasPendingOutOfAmmo = false;

  // --- attacco ---
  private currentAttack: AttackDefinition | null = null;
  private attackElapsedMs = 0;
  private attackCooldownRemainingMs = 0;
  private bufferedAttackInput: AttackInput | null = null;
  private bufferRemainingMs = 0;
  private readonly targetsHitByCurrentAttack = new Set<Damageable>();

  // --- tolleranza nel salto ---
  private coyoteRemainingMs = 0;
  private jumpBufferRemainingMs = 0;

  // --- schivata, danno, morte ---
  private dodgeRemainingMs = 0;
  private dodgeCooldownRemainingMs = 0;
  private hurtRemainingMs = 0;
  private invulnerabilityRemainingMs = 0;
  /** Durata dell'ultimo aggiornamento (serve all'aderenza sul ghiaccio). */
  private lastDeltaTimeSeconds = 0;
  /** Salute rigenerata non ancora applicata (frazioni di HP). */
  private regenerationAccumulator = 0;
  /** Tempo (ms) dall'ultimo danno subito: la cura lenta del personaggio parte dopo un po'. */
  private msSinceLastHit = 0;
  /** Tempo per la pulsazione degli aloni dei power-up. */
  private auraElapsedMs = 0;
  private deathElapsedMs = 0;

  constructor(startX: number, startY: number, character?: CharacterDefinition) {
    super(startX, startY, PLAYER_CONFIG.hitboxWidth, PLAYER_CONFIG.hitboxHeight);
    // un power-up che dà punti di attributo cambia gli effetti finché è attivo (Classi Fase 4)
    this.modifiers.onPowerUpsChanged = () => this.refreshAttributes();
    if (character !== undefined) {
      this.setCharacter(character);
    } else {
      this.refreshAttributes();
    }
  }

  /** Salute massima del personaggio. */
  public get maxHealth(): number {
    return this.character.maxHealth + this.equipment.maxHealth + this.modifiers.getValue("maxHealthBonus");
  }

  public get characterDefinition(): CharacterDefinition {
    return this.character;
  }

  /** Stamina attuale (Fase 5): la consumano schivata, attacchi pesanti e abilità. */
  public get stamina(): number {
    return this.staminaPool.value;
  }

  public get maxStamina(): number {
    return this.character.maxStamina + this.equipment.maxStamina + this.modifiers.getValue("maxStaminaBonus");
  }

  /** Mana attuale (Classi Fase 0): lo consumano le abilità che lo costano. Senza mana nella classe resta 0. */
  public get mana(): number {
    return this.manaPool.value;
  }

  public get maxMana(): number {
    return this.character.maxMana + this.modifiers.getValue("maxManaBonus");
  }

  /** Attributi effettivi (Classi Fase 4): base della classe + punti spesi + power-up, entro ATTRIBUTE_MAX_VALUE. */
  public get attributes(): Readonly<Attributes> {
    return this.effectiveAttributeValues;
  }

  /** Attributi di partenza della classe (pentagono e requisiti). */
  public get baseAttributes(): Readonly<Attributes> {
    return this.character.baseAttributes;
  }

  /** Punti spesi sopra la base (dall'altare della bottega). */
  public get spentAttributes(): Readonly<Attributes> {
    return this.spentAttributeValues;
  }

  /** Punti sopra la base che danno gli effetti (spesi + power-up, entro il massimo). */
  public get attributePointsAboveBaseValues(): Readonly<Attributes> {
    return this.attributePointsAboveBase;
  }

  /** Punti di attributo dati ora dai power-up attivi. */
  public getAttributePowerUpBonus(attributeId: AttributeId): number {
    return this.modifiers.getAttributeBonus(attributeId);
  }

  /** Malus della Forza per l'equipaggiamento in uso (requisiti dell'arma e delle armature, carico). */
  public get strengthStatus(): Readonly<StrengthPenalties> {
    return this.strengthPenalties;
  }

  /**
   * Imposta i punti spesi sopra la base (Classi Fase 4): gli effetti entrano nei modificatori (fonte "attributes"),
   * requisiti e carico si ricalcolano, i massimi si aggiornano.
   */
  public setSpentAttributes(spent: Readonly<Attributes>): void {
    this.spentAttributeValues = { ...spent };
    this.refreshAttributes();
  }

  /** Ricalcola valori effettivi, effetti per punto e malus della Forza (attributi, power-up o equipaggiamento cambiati). */
  private refreshAttributes(): void {
    const bonus: Partial<Attributes> = {};
    for (const attributeId of ATTRIBUTE_ORDER) {
      bonus[attributeId] = this.modifiers.getAttributeBonus(attributeId);
    }
    const base = this.character.baseAttributes;
    this.effectiveAttributeValues = computeEffectiveAttributes(base, this.spentAttributeValues, bonus);
    this.attributePointsAboveBase = getPointsAboveBase(this.effectiveAttributeValues, base);
    this.modifiers.setSourceEffects("attributes", computeAttributeEffects(this.attributePointsAboveBase, this.character.maxMana > 0));
    this.refreshStrengthPenalties();
    this.clampResourcesToMax();
  }

  /** Requisiti di Forza di arma e armature e carico, con la Forza effettiva. */
  private refreshStrengthPenalties(): void {
    const armorWeights = ARMOR_SLOTS.flatMap((slot) => {
      const piece = this.armor[slot];
      return piece === null ? [] : [ARMOR_CONFIG[piece.baseId].weight];
    });
    this.strengthPenalties = computeStrengthPenalties(this.effectiveAttributeValues.strength, this.weapon, armorWeights);
  }

  /** 1 + percentuale/100 di una statistica in percento data dagli attributi (esattamente 1 se è zero). */
  private getPercentBonusMultiplier(stat: PlayerStatName): number {
    const percent = this.modifiers.getValue(stat);
    return percent === 0 ? 1 : 1 + percent / 100;
  }

  /** 1 - percentuale/100 di una riduzione data dagli attributi (esattamente 1 se è zero). */
  private getPercentReductionMultiplier(stat: PlayerStatName): number {
    const percent = this.modifiers.getValue(stat);
    return percent <= 0 ? 1 : Math.max(0, 1 - percent / 100);
  }

  /** Stamina consumata da una schivata (Classi Fase 4: la Destrezza la riduce). */
  public get dodgeStaminaCost(): number {
    return this.character.dodgeStaminaCost * this.getPercentReductionMultiplier("dodgeCostReductionPercent");
  }

  /** Vero se la mossa è alla portata dell'Intelligenza effettiva (grado 1 sempre). */
  public meetsAbilityGrade(ability: AbilityDefinition): boolean {
    return meetsGradeRequirement(ability.grade, this.effectiveAttributeValues.intelligence);
  }

  /** Abilità del personaggio, una per slot (Classi Fase 0). */
  public get abilities(): AbilityDefinition[] {
    return this.character.abilityIds.map((abilityId) => ABILITY_CONFIG[abilityId]);
  }

  /** Quante mosse conosce il personaggio (le prime di abilities, Classi Fase 5). */
  public get knownAbilityCount(): number {
    return this.knownAbilities;
  }

  /**
   * Imposta quante mosse sono note (inizio livello, test): tra quelle di partenza e quelle della classe. Se lo slot
   * attivo resta chiuso si torna al primo.
   */
  public setKnownAbilityCount(count: number): void {
    const total = this.character.abilityIds.length;
    this.knownAbilities = Math.max(Math.min(ABILITY_UNLOCK_CONFIG.startingCount, total), Math.min(total, Math.floor(count)));
    if (this.activeAbilitySlot >= this.knownAbilities) {
      this.lowerGuard();
      this.activeAbilitySlot = 0;
    }
  }

  /** Impara la prossima mossa (forziere o boss): la restituisce, oppure null se le conosce già tutte. */
  public learnNextAbility(): { ability: AbilityDefinition; slotIndex: number } | null {
    const slotIndex = this.knownAbilities;
    const abilityId = this.character.abilityIds[slotIndex];
    if (abilityId === undefined) {
      return null;
    }
    this.knownAbilities++;
    return { ability: ABILITY_CONFIG[abilityId], slotIndex };
  }

  /** Indice dello slot attivo in abilities. */
  public get activeAbilitySlotIndex(): number {
    return this.activeAbilitySlot;
  }

  /**
   * Sceglie lo slot attivo (Classi Fase 0). Uno slot che non esiste o non ancora imparato viene rifiutato (false).
   * Cambiando slot con lo scudo alzato, lo scudo si abbassa (e parte la sua ricarica).
   */
  public selectAbilitySlot(slotIndex: number): boolean {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.character.abilityIds.length) {
      return false;
    }
    if (slotIndex >= this.knownAbilities) {
      this.hasPendingUnknownAbility = true;
      return false;
    }
    if (slotIndex !== this.activeAbilitySlot) {
      this.lowerGuard();
      this.activeAbilitySlot = slotIndex;
    }
    return true;
  }

  /** Abilità speciale dello slot attivo. */
  public get ability(): AbilityDefinition {
    return ABILITY_CONFIG[this.character.abilityIds[this.activeAbilitySlot]];
  }

  /** Ricarica dell'abilità attiva che manca (1 = appena usata, 0 = pronta). */
  public get abilityCooldownFraction(): number {
    return this.getSlotCooldownFraction(this.activeAbilitySlot);
  }

  private getSlotCooldownFraction(slotIndex: number): number {
    const cooldownMs = ABILITY_CONFIG[this.character.abilityIds[slotIndex]!].cooldownMs;
    return cooldownMs <= 0 ? 0 : Math.min(1, (this.abilityCooldownsMs[slotIndex] ?? 0) / cooldownMs);
  }

  /** Stato di ogni slot delle mosse (Classi Fase 2: l'HUD mostra tutti gli slot della classe). */
  public get abilitySlots(): AbilitySlotStatus[] {
    return this.abilities.map((ability, slotIndex) => {
      const cooldownFraction = this.getSlotCooldownFraction(slotIndex);
      const isAffordable = this.canAfford(this.getAbilityCost(ability));
      const isSelected = slotIndex === this.activeAbilitySlot;
      const meetsRequirement = this.meetsAbilityGrade(ability);
      const isKnown = slotIndex < this.knownAbilities;
      return {
        ability,
        cooldownFraction,
        isAffordable,
        isReady: isKnown && cooldownFraction === 0 && isAffordable && meetsRequirement,
        isKnown,
        isSelected,
        meetsRequirement,
        isActive: isSelected && this.isGuardUp,
      };
    });
  }

  /**
   * Catalizzatore attivo (Classi Fase 2): lo spellFocus dell'arma in mano, ma solo per le classi che lo sfruttano
   * (il Mago). null = nessun bonus agli incantesimi.
   */
  public get activeSpellFocus(): Readonly<SpellFocusDefinition> | null {
    return this.character.usesSpellFocus === true ? (this.weapon.spellFocus ?? null) : null;
  }

  /** Un incantesimo è un'abilità che costa mana. */
  public static isSpell(ability: AbilityDefinition): boolean {
    return (ability.cost.mana ?? 0) > 0;
  }

  /**
   * Costo effettivo di un'abilità: il mana scende con il catalizzatore in mano e con l'Intelligenza (Classi Fase 4),
   * a punti interi (arrotondato).
   */
  public getAbilityCost(ability: AbilityDefinition): ResourceCost {
    const focus = this.activeSpellFocus;
    const mana = ability.cost.mana ?? 0;
    const intelligenceMultiplier = this.getPercentReductionMultiplier("spellCostReductionPercent");
    if (mana <= 0 || (focus === null && intelligenceMultiplier === 1)) {
      return ability.cost;
    }
    return { ...ability.cost, mana: Math.round(mana * (focus?.manaCostMultiplier ?? 1) * intelligenceMultiplier) };
  }

  /**
   * Moltiplicatore del danno di un attacco: quello generale (getDamageMultiplier); per gli attacchi dell'arma in mano
   * il bonus o malus della classe (Classi Fase 3), lo scaling sugli attributi e il malus della Forza mancante
   * (Classi Fase 4); per le mosse la potenza data dall'Intelligenza e, per gli incantesimi, quella del catalizzatore.
   */
  public getDamageMultiplierFor(attack: AttackDefinition): number {
    const focus = this.activeSpellFocus;
    const abilityAttack = this.abilities.find((ability) => ability.kind === "attack" && ability.attack.id === attack.id);
    const spellPower = focus !== null && abilityAttack !== undefined && Player.isSpell(abilityAttack) ? focus.powerMultiplier : 1;
    const abilityPower = abilityAttack !== undefined ? this.getPercentBonusMultiplier("abilityPowerPercent") : 1;
    const weaponFactor = this.isWeaponAttack(attack)
      ? this.weaponAffinity.damageMultiplier * getWeaponScalingMultiplier(this.weapon, this.attributePointsAboveBase) * this.strengthPenalties.weaponDamageMultiplier
      : 1;
    return this.getDamageMultiplier() * spellPower * abilityPower * weaponFactor;
  }

  /** Vero se l'attacco è dell'arma in mano (non un'abilità o un incantesimo): solo questi sentono la tabella di compatibilità. */
  private isWeaponAttack(attack: AttackDefinition): boolean {
    return this.weapon.attacks[attack.id] !== undefined;
  }

  /** Recupera mana (pozione di mana): non oltre il massimo. */
  public restoreMana(amount: number): void {
    if (!this.isDead) {
      this.manaPool.restore(amount);
    }
  }

  /** Vero se le risorse bastano per il costo (la salute deve restare almeno a 1). */
  public canAfford(cost: Readonly<ResourceCost>): boolean {
    const healthCost = cost.health ?? 0;
    return (
      this.staminaPool.canSpend(cost.stamina ?? 0) &&
      this.manaPool.canSpend(cost.mana ?? 0) &&
      (healthCost <= 0 || this.currentHealth - healthCost >= 1)
    );
  }

  /** Vero se l'abilità attiva è pronta: niente ricarica, risorse sufficienti e grado alla portata. */
  public get isAbilityReady(): boolean {
    return this.abilityCooldownFraction === 0 && this.canAfford(this.getAbilityCost(this.ability)) && this.meetsAbilityGrade(this.ability);
  }

  /** Compatibilità della classe con l'arma in mano (Classi Fase 3: bonus e malus della tabella). */
  public get weaponAffinity(): Readonly<WeaponAffinity> {
    return getWeaponAffinity(this.character.id, this.weapon.id);
  }

  /** Vero con lo scudo alzato (abilità del Paladino). */
  public get isGuarding(): boolean {
    return this.isGuardUp;
  }

  /** Vero una volta sola dopo un'azione rifiutata per mancanza di stamina. */
  public drainTired(): boolean {
    const isTired = this.hasPendingTired;
    this.hasPendingTired = false;
    return isTired;
  }

  /** Vero una volta sola dopo un'azione rifiutata per mancanza di mana. */
  public drainNoMana(): boolean {
    const isOut = this.hasPendingNoMana;
    this.hasPendingNoMana = false;
    return isOut;
  }

  /** Vero una volta sola dopo una mossa rifiutata perché il suo grado richiede più Intelligenza. */
  public drainLowIntelligence(): boolean {
    const isLow = this.hasPendingLowIntelligence;
    this.hasPendingLowIntelligence = false;
    return isLow;
  }

  /** Salute pagata per le mosse dall'ultima chiamata: il motore non la mostra come un colpo subito. */
  public drainPaidHealth(): number {
    const paid = this.pendingHealthPaid;
    this.pendingHealthPaid = 0;
    return paid;
  }

  /** Vero una volta sola dopo una mossa rifiutata perché la salute non basta. */
  public drainLowHealth(): boolean {
    const isLow = this.hasPendingLowHealth;
    this.hasPendingLowHealth = false;
    return isLow;
  }

  /** Vero una volta sola dopo il tasto di una mossa non ancora imparata. */
  public drainUnknownAbility(): boolean {
    const isUnknown = this.hasPendingUnknownAbility;
    this.hasPendingUnknownAbility = false;
    return isUnknown;
  }

  /** Nome dell'abilità appena usata (una volta sola), oppure null. */
  public drainStartedAbilityName(): string | null {
    const name = this.pendingAbilityName;
    this.pendingAbilityName = null;
    return name;
  }

  /**
   * Effetti grafici della mossa in corso il cui istante è passato dall'ultima chiamata (Classi Fase 6A): il motore li
   * trasforma in sprite d'effetto e sagome (vedi ABILITY_VISUAL_CONFIG).
   */
  public drainAbilityEffects(): AbilityEffectCue[] {
    const effects = this.pendingAbilityEffects;
    this.pendingAbilityEffects = [];
    return effects;
  }

  /** Vero una volta sola quando il colpo di un'abilità con effetto (onda d'urto) diventa attivo. */
  public drainAbilityImpact(): boolean {
    const hasImpact = this.hasPendingAbilityImpact;
    this.hasPendingAbilityImpact = false;
    return hasImpact;
  }

  /** Parate avvenute dall'ultima chiamata (per gli effetti). */
  public drainGuardEvents(): GuardOutcome[] {
    const events = this.guardEvents;
    this.guardEvents = [];
    return events;
  }

  /** Cambia personaggio (inizio partita): la salute torna al massimo della nuova classe. */
  public setCharacter(character: CharacterDefinition): void {
    this.character = character;
    this.activeAbilitySlot = 0;
    this.knownAbilities = Math.min(ABILITY_UNLOCK_CONFIG.startingCount, character.abilityIds.length);
    this.abilityCooldownsMs = character.abilityIds.map(() => 0);
    // nuova classe: nessun punto speso (li reimposta chi gestisce la partita, vedi AttributePoints)
    this.spentAttributeValues = ZERO_ATTRIBUTES;
    this.refreshAttributes();
    this.currentHealth = this.maxHealth;
    this.resetStaminaAndAbility();
    this.regenerationAccumulator = 0;
    this.msSinceLastHit = 0;
  }

  /** Nome dell'animazione in corso (utile per debug e test). */
  public get currentAnimationName(): string {
    return this.animationPlayer.animationName;
  }

  /** Vero quando il cavaliere è accovacciato (hitbox più bassa, i piedi restano a terra). */
  public get isCrouching(): boolean {
    return this.height < PLAYER_CONFIG.hitboxHeight;
  }

  /** Vero durante la schivata: l'unico momento in cui si attraversano i nemici. */
  public get isDodging(): boolean {
    return this.dodgeRemainingMs > 0 || this.activeDash !== null;
  }

  /** Scatto in corso (abilità), oppure null. */
  private get activeDash(): NonNullable<AttackDefinition["dash"]> | null {
    const dash = this.currentAttack?.dash;
    if (dash === undefined) {
      return null;
    }
    return this.attackElapsedMs >= dash.startMs && this.attackElapsedMs < dash.endMs ? dash : null;
  }

  /**
   * Mossa a cui appartiene l'attacco in corso (null se non è una mossa), qualunque sia lo slot scelto adesso: cambiare
   * slot durante la mossa non ne interrompe gli effetti né la tinta della lama (Classi Fase 6A).
   */
  private get runningAbility(): AbilityDefinition | null {
    const attack = this.currentAttack;
    if (attack === null) {
      return null;
    }
    return this.abilities.find((ability) => ability.kind === "attack" && ability.attack === attack) ?? null;
  }

  /** Vero se l'attacco in corso è l'abilità del personaggio. */
  private get isAbilityAttackActive(): boolean {
    const ability = this.ability;
    return ability.kind === "attack" && this.currentAttack === ability.attack;
  }

  public get isDead(): boolean {
    return this.currentHealth <= 0;
  }

  /** Vero se i colpi subiti vengono ignorati (dopo un colpo o durante la schivata). */
  public get isInvulnerable(): boolean {
    return this.invulnerabilityRemainingMs > 0 || this.dodgeRemainingMs > 0 || this.activeDash?.invulnerable === true;
  }

  /** Vero quando la morte è durata abbastanza e si può ripartire. */
  public get isReadyToRespawn(): boolean {
    return this.isDead && this.deathElapsedMs >= PLAYER_CONFIG.deathDurationMs;
  }

  /** Attacco in corso (anche se non ancora attivo), oppure null. */
  public get activeAttack(): AttackDefinition | null {
    return this.currentAttack;
  }

  public get equippedWeapon(): WeaponDefinition {
    return this.weapon;
  }

  /** L'oggetto dell'arma in mano (rarità e modificatori). */
  public get equippedWeaponItem(): WeaponItem {
    return this.weaponItem;
  }

  /** Armature indossate. */
  public get equippedArmor(): Readonly<EquippedArmor> {
    return this.armor;
  }

  /** Bonus attuali dell'equipaggiamento (con i tetti). */
  public get equipmentBonuses(): Readonly<EquipmentBonuses> {
    return this.equipment;
  }

  /**
   * Indossa le armature indicate (E2): salute e stamina massime cambiano subito; quelle attuali restano,
   * ma non oltre il nuovo massimo.
   */
  public setArmor(armor: Readonly<EquippedArmor>): void {
    this.armor = { ...armor };
    this.refreshEquipment();
  }

  /** Ricalcola i bonus e i colori dell'equipaggiamento (l'unico punto in cui si applicano). */
  private refreshEquipment(): void {
    this.equipment = computeEquipmentBonuses(this.weaponItem, this.armor);
    this.equipmentVariant = buildEquipmentVariant(this.weaponItem, this.armor, true);
    this.armorOnlyVariant = buildEquipmentVariant(this.weaponItem, this.armor, false);
    this.weaponTintVariants.clear();
    this.refreshStrengthPenalties();
    this.clampResourcesToMax();
  }

  /** Salute, stamina e mana restano, ma non oltre i nuovi massimi. */
  private clampResourcesToMax(): void {
    this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    this.staminaPool.clampToMax();
    this.manaPool.clampToMax();
  }

  /**
   * Furto di vita (modificatore delle armi): una parte del danno inflitto torna in salute, a punti interi.
   * Lo chiama il motore per ogni colpo andato a segno.
   */
  public registerDamageDealt(damage: number): void {
    const fraction = this.equipment.lifeStealFraction;
    if (fraction <= 0 || this.isDead || damage <= 0) {
      return;
    }
    this.lifeStealAccumulator += damage * fraction;
    const wholePoints = Math.floor(this.lifeStealAccumulator + 1e-6);
    if (wholePoints > 0) {
      this.lifeStealAccumulator -= wholePoints;
      this.heal(wholePoints);
    }
  }

  /**
   * Cambia arma (di solito una voce di WEAPON_CONFIG): l'attacco in corso e la combo vengono annullati.
   * ammo = munizioni di quell'arma (solo per le armi con munizioni; se omesso: piene).
   * item = l'oggetto (rarità e modificatori); se omesso e l'arma cambia, un'arma Comune.
   * Classi Fase 3: un'arma vietata alla classe dalla tabella di compatibilità non si impugna (false, non cambia nulla).
   */
  public equipWeapon(weapon: WeaponDefinition, ammo: number | null = null, item: WeaponItem | null = null): boolean {
    if (!canWieldWeapon(this.character.id, weapon.id)) {
      return false;
    }
    const nextItem = item ?? (this.weaponItem.baseId === weapon.id ? this.weaponItem : createWeaponItem(weapon.id));
    if (nextItem !== this.weaponItem) {
      this.weaponItem = nextItem;
      this.refreshEquipment();
    }
    if (this.weapon !== weapon) {
      const wasAttacking = this.currentAttack !== null;
      this.cancelAttack();
      this.weapon = weapon;
      this.refreshStrengthPenalties();
      this.groundComboManager = Player.createComboManager(weapon, "ground");
      this.airComboManager = Player.createComboManager(weapon, "air");
      this.comboManager = this.groundComboManager;
      // l'animazione dell'attacco annullato non deve restare: la nuova arma potrebbe non averne i frame
      // (es. un fendente di spada con l'arco in mano)
      if (wasAttacking && !this.isDead && this.hurtRemainingMs <= 0) {
        this.updateState();
        this.animationPlayer.play(this.getAnimationName());
      }
    }
    const maxAmmo = this.maxAmmo;
    this.ammo = maxAmmo === null ? null : Math.max(0, Math.min(maxAmmo, ammo ?? maxAmmo));
    return true;
  }

  /** Munizioni dell'arma in mano (null = infinite). */
  public get currentAmmo(): number | null {
    return this.ammo;
  }

  /** Massimo delle munizioni dell'arma in mano per questa classe (Classi Fase 3: ammoMultiplier); null = infinite. */
  public get maxAmmo(): number | null {
    return getWeaponMaxAmmo(this.character.id, this.weapon.id) ?? null;
  }

  /** Imposta le munizioni dell'arma in mano (es. coltello recuperato). Ignorato per le armi senza munizioni. */
  public setAmmo(ammo: number): void {
    const maxAmmo = this.maxAmmo;
    if (maxAmmo !== null) {
      this.ammo = Math.max(0, Math.min(maxAmmo, ammo));
    }
  }

  /** Carica dell'arco in corso (0-1), oppure null se non si sta caricando. */
  public get chargeFraction(): number | null {
    const charge = this.currentAttack?.charge;
    return charge === undefined ? null : Math.min(1, this.attackElapsedMs / charge.maxChargeMs);
  }

  /** Proiettili lanciati dal cavaliere da far comparire (una volta sola). */
  public drainProjectileLaunches(): ProjectileLaunch[] {
    const launches = this.pendingLaunches;
    this.pendingLaunches = [];
    return launches;
  }

  /** Vero una volta sola dopo un tentativo di attacco senza munizioni. */
  public drainOutOfAmmo(): boolean {
    const isOut = this.hasPendingOutOfAmmo;
    this.hasPendingOutOfAmmo = false;
    return isOut;
  }

  /** Nome della combo appena completata (una volta sola), oppure null. */
  public drainCompletedComboName(): string | null {
    const name = this.completedComboName;
    this.completedComboName = null;
    return name;
  }

  /** Vero una volta sola dopo che un colpo in picchiata ha toccato terra. */
  public drainPlungeLanding(): boolean {
    const hasLanded = this.hasPendingPlungeLanding;
    this.hasPendingPlungeLanding = false;
    return hasLanded;
  }

  /**
   * Il colpo in corso ha preso un bersaglio. Se è un colpo in picchiata il cavaliere rimbalza verso
   * l'alto e l'attacco finisce (si può subito colpire di nuovo in picchiata). Restituisce true se rimbalza.
   */
  public bounceOffTarget(): boolean {
    const plunge = this.currentAttack?.plunge;
    if (plunge === undefined || this.isOnGround) {
      return false;
    }
    this.velocityY = -plunge.bounceSpeed;
    this.currentAttack = null;
    this.attackElapsedMs = 0;
    this.attackCooldownRemainingMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.airComboManager.reset();
    return true;
  }

  /**
   * Moltiplicatore generale del danno inflitto (power-up, classe, equipaggiamento). Il bonus o malus della classe per
   * l'arma vale solo per gli attacchi dell'arma: vedi getDamageMultiplierFor.
   */
  public getDamageMultiplier(): number {
    return this.modifiers.getValue("damageMultiplier") * this.character.damageMultiplier * this.equipment.damageMultiplier * this.getLowHealthMultiplier();
  }

  /** Passivo del Berserker (Classi Fase 5): più danno sotto la soglia di salute (esattamente 1 altrimenti). */
  private getLowHealthMultiplier(): number {
    const power = this.character.lowHealthPower;
    return power !== undefined && this.currentHealth < this.maxHealth * power.healthFraction ? power.damageMultiplier : 1;
  }

  /** Un nemico o un boss è stato sconfitto da un colpo del giocatore: passivo del Mago (mana). */
  public registerKill(): void {
    const mana = this.character.manaPerKill ?? 0;
    if (mana > 0) {
      this.restoreMana(mana);
    }
  }

  /**
   * Elementi dei colpi (Fase 7): quelli dei power-up attivi (fuoco, veleno, gelo, fulmine) e quelli
   * dell'equipaggiamento (modificatori delle armi), senza doppioni.
   */
  public getAttackElements(): ElementId[] {
    const elements = this.modifiers.activePowerUps.flatMap((powerUp) => (powerUp.definition.element === undefined ? [] : [powerUp.definition.element]));
    return [...new Set([...elements, ...this.equipment.elements])];
  }

  /** Proprietà del colpo per il bersaglio: quelle dell'attacco (ascia, mazza) e dell'arma, più gli elementi attivi. */
  public getHitProperties(attack: AttackDefinition): HitProperties {
    const elements = [...new Set([...this.getAttackElements(), ...(attack.elements ?? [])])];
    const breaksGuard = attack.breaksGuard === true || this.equipment.breaksGuard ? true : attack.breaksGuard;
    return { breaksGuard, crushesArmor: attack.crushesArmor, ...(elements.length > 0 ? { elements } : {}) };
  }

  /** Danno aggiunto a ogni colpo (power-up del fuoco). */
  public getBonusDamage(): number {
    return this.modifiers.getValue("bonusDamage");
  }

  /** Attiva un power-up raccolto. */
  public applyPowerUp(definition: PowerUpDefinition): void {
    if (!this.isDead) {
      this.modifiers.add(definition);
    }
  }

  /** Recupera salute (senza superare il massimo). */
  public heal(amount: number): void {
    if (!this.isDead) {
      this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    }
  }

  /**
   * Danno ambientale (es. caduta in un abisso): ignora l'invulnerabilità,
   * non causa rinculo. Dopo il danno il giocatore è invulnerabile per un po'.
   */
  public takeEnvironmentalDamage(damage: number): void {
    if (this.isDead) {
      return;
    }
    this.currentHealth = Math.max(0, this.currentHealth - damage);
    this.invulnerabilityRemainingMs = PLAYER_CONFIG.invulnerabilityDurationMs;
    this.msSinceLastHit = 0;
    if (this.isDead) {
      this.deathElapsedMs = 0;
      this.animationPlayer.restart("dead");
    }
  }

  /** Riporta il giocatore in una posizione, fermo (usato per cadute e nuovi livelli). */
  public respawnAt(position: Vector2): void {
    this.positionX = position.x;
    this.positionY = position.y;
    this.height = PLAYER_CONFIG.hitboxHeight;
    this.velocityX = 0;
    this.velocityY = 0;
    this.facingDirection = "right";
    this.cancelAttack();
    this.isGuardUp = false;
    this.dodgeRemainingMs = 0;
    this.hurtRemainingMs = 0;
    this.coyoteRemainingMs = 0;
    this.jumpBufferRemainingMs = 0;
    this.currentState = "idle";
  }

  /** Dopo la morte: salute piena e nessuna invulnerabilità residua. */
  public revive(): void {
    this.modifiers.clear();
    this.regenerationAccumulator = 0;
    this.msSinceLastHit = 0;
    this.currentHealth = this.maxHealth;
    this.resetStaminaAndAbility();
    this.deathElapsedMs = 0;
    this.invulnerabilityRemainingMs = 0;
    this.dodgeCooldownRemainingMs = 0;
  }

  /**
   * Il giocatore subisce danno da una fonte posta a sourceX; element = elemento del colpo (le resistenze delle
   * armature lo riducono). Restituisce false se il colpo viene ignorato (invulnerabile o già morto).
   */
  public takeDamage(damage: number, sourceCenterX: number, element?: ElementId): boolean {
    this.lastGuardOutcome = null;
    if (this.isDead || this.isInvulnerable) {
      return false;
    }
    if (this.tryBlockWithShield(damage, sourceCenterX)) {
      return false;
    }
    this.isGuardUp = false;
    // lo scudo (power-up e paladino), la difesa e le resistenze delle armature riducono il danno,
    // ma un colpo toglie sempre almeno 1 HP
    const resistance = this.getResistanceFraction(element);
    const takenMultiplier =
      this.modifiers.getValue("damageTakenMultiplier") * this.character.damageTakenMultiplier * this.getDefenseMultiplier() * (1 - resistance);
    const reducedDamage = Math.max(1, Math.round(damage * takenMultiplier));
    this.msSinceLastHit = 0;
    this.currentHealth = Math.max(0, this.currentHealth - reducedDamage);
    this.cancelAttack();
    this.invulnerabilityRemainingMs = PLAYER_CONFIG.invulnerabilityDurationMs;
    const knockbackDirection = this.positionX + this.width / 2 < sourceCenterX ? -1 : 1;
    this.velocityX = knockbackDirection * PLAYER_CONFIG.knockbackSpeedX;
    this.velocityY = -PLAYER_CONFIG.knockbackSpeedY;
    this.isOnGround = false;
    if (this.isDead) {
      this.deathElapsedMs = 0;
      this.hurtRemainingMs = 0;
      this.animationPlayer.restart("dead");
    } else {
      this.hurtRemainingMs = PLAYER_CONFIG.hurtDurationMs;
      this.animationPlayer.restart("hurt");
    }
    return true;
  }

  /**
   * Danno subito dopo la difesa: quella delle armature più quella della Vitalità (Classi Fase 4), sotto lo stesso tetto.
   * Senza punti in Vitalità è esattamente quello delle armature.
   */
  public getDefenseMultiplier(): number {
    const equipmentFraction = 1 - this.equipment.damageTakenMultiplier;
    const attributePercent = this.modifiers.getValue("defensePercent");
    return attributePercent <= 0 ? this.equipment.damageTakenMultiplier : 1 - combineCappedFraction(equipmentFraction, attributePercent, AFFIX_CONFIG.defense.cap);
  }

  /** Resistenza (frazione) a un elemento: armature più Tempra (Classi Fase 4), sotto lo stesso tetto. 0 senza elemento. */
  public getResistanceFraction(element: ElementId | undefined): number {
    if (element === undefined) {
      return 0;
    }
    const equipmentFraction = this.equipment.resistances[element] ?? 0;
    return combineCappedFraction(equipmentFraction, this.modifiers.getValue("resistancePercent"), AFFIX_CONFIG.resistance.cap);
  }

  /**
   * Scudo alzato e colpo da davanti: parata perfetta (appena alzato: nessun costo), parata normale (costa stamina
   * in proporzione al danno) o guardia rotta (stamina finita: il colpo passa). Restituisce true se il colpo è parato.
   */
  private tryBlockWithShield(damage: number, sourceCenterX: number): boolean {
    const ability = this.ability;
    if (!this.isGuardUp || ability.kind !== "guard") {
      return false;
    }
    const centerX = this.positionX + this.width / 2;
    const isInFront = this.facingDirection === "right" ? sourceCenterX >= centerX : sourceCenterX <= centerX;
    if (!isInFront) {
      return false;
    }
    if (this.guardGraceRemainingMs > 0) {
      this.lastGuardOutcome = "blocked"; // stesso attacco appena parato: niente costo
      return true;
    }
    let outcome: GuardOutcome = "perfect";
    if (this.guardElapsedMs > ability.perfectWindowMs) {
      const pool = this.getPool(ability.resource);
      const cost = damage * ability.costPerBlockedDamage;
      if (!pool.trySpend(cost)) {
        pool.empty();
        this.lowerGuard();
        this.lastGuardOutcome = "broken";
        this.guardEvents.push("broken");
        return false;
      }
      outcome = "blocked";
    }
    this.lastGuardOutcome = outcome;
    this.guardEvents.push(outcome);
    this.guardGraceRemainingMs = GUARD_BLOCK_GRACE_MS;
    return true;
  }

  /** Area d'urto dell'attacco se in questo istante è attivo, altrimenti null. */
  public getActiveAttackHitbox(): Rectangle | null {
    const attack = this.currentAttack;
    if (attack === null || this.attackElapsedMs < attack.hitStartMs || this.attackElapsedMs > attack.hitEndMs) {
      return null;
    }
    if (attack.projectile !== undefined || attack.charge !== undefined) {
      return null; // le armi a distanza feriscono solo con i proiettili
    }
    if (attack.hitbox.width <= 0 || attack.hitbox.height <= 0) {
      return null; // area vuota (balzo arcano): l'attacco non colpisce niente
    }
    return getAttackWorldHitbox(attack, this.getBounds(), this.facingDirection);
  }

  public hasAlreadyHit(target: Damageable): boolean {
    return this.targetsHitByCurrentAttack.has(target);
  }

  /**
   * Il colpo in corso ha preso target. Con un attacco dell'arma (non di un'abilità): con un catalizzatore attivo il
   * bastone ridà manaPerHit mana (Classi Fase 2) e il passivo del Cavaliere ridà stamina (Classi Fase 5).
   */
  public registerHit(target: Damageable): void {
    this.targetsHitByCurrentAttack.add(target);
    const focus = this.activeSpellFocus;
    const attack = this.currentAttack;
    // i forzieri sono scena: colpirli non ridà niente
    if (attack === null || target.isScenery === true || this.weapon.attacks[attack.id] !== attack) {
      return;
    }
    if (focus !== null) {
      this.manaPool.restore(focus.manaPerHit);
    }
    this.staminaPool.restore(this.character.staminaPerWeaponHit ?? 0);
  }

  /** Un frame di gioco: timer, input, gravità, collisioni, stato e animazione. */
  public update(
    deltaTimeSeconds: number,
    input: InputSource,
    collisionSystem: CollisionSystem,
    platforms: PlatformDefinition[],
    mapWidth: number
  ): void {
    this.updateTimers(deltaTimeSeconds * 1000);
    this.lastDeltaTimeSeconds = deltaTimeSeconds;

    this.updateCrouch(input, platforms);
    if (this.isDead) {
      this.velocityX = 0;
    } else if (this.hurtRemainingMs > 0) {
      // stordito: nessun controllo, il rinculo prosegue
    } else {
      this.handleInput(input);
    }

    // colpo in picchiata: si scende a velocità fissa (la gravità del frame si aggiunge, entro maxFallSpeed)
    const plunge = this.currentAttack?.plunge;
    if (plunge !== undefined && !this.isOnGround) {
      this.velocityY = plunge.fallSpeed;
    }

    // Il rinculo e gli scatti delle abilità non portano giù da un bordo: se oltre c'è il vuoto ci si ferma.
    const isPushedOrDashing = this.hurtRemainingMs > 0 || (this.activeDash !== null && this.isOnGround);
    if (isPushedOrDashing && this.velocityX !== 0 && !this.hasGroundInDirectionOfMovement(platforms)) {
      this.velocityX = 0;
    }
    // ...e uno scatto si ferma anche prima degli spuntoni
    if (this.activeDash !== null && this.velocityX !== 0 && this.isDashHeadingIntoStopZone()) {
      this.velocityX = 0;
    }

    collisionSystem.applyGravityAndMove(
      this,
      deltaTimeSeconds,
      GAME_CONFIG.gravity * this.environment.gravityMultiplier,
      GAME_CONFIG.maxFallSpeed * this.environment.maxFallSpeedMultiplier,
      platforms,
      mapWidth
    );
    if (this.hurtRemainingMs > 0 && this.isOnGround && this.velocityY === 0) {
      this.velocityX = 0; // il rinculo finisce toccando terra
    }
    if (this.currentAttack?.plunge !== undefined && this.isOnGround) {
      this.finishPlungeOnLanding();
    }
    this.updateState();
    this.animationPlayer.play(this.getAnimationName());
    this.animationPlayer.update(deltaTimeSeconds);
  }

  public render(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    const isBlinkHidden =
      !this.isDead &&
      this.invulnerabilityRemainingMs > 0 &&
      this.dodgeRemainingMs <= 0 &&
      Math.floor(this.invulnerabilityRemainingMs / BLINK_INTERVAL_MS) % 2 === 1;
    if (isBlinkHidden) {
      return;
    }
    this.renderPowerUpAuras(renderer, cameraX, cameraY);
    // Lo sprite è più grande dell'hitbox (pennacchio, spada, scie): l'allineamento usa
    // la colonna d'ancoraggio registrata con lo sprite (vedi knightSprites.ts).
    // Con il power-up del fuoco si usano le varianti con la lama incandescente;
    // attaccando da accovacciati, le varianti in cui il cavaliere resta basso.
    const fireSuffix = this.modifiers.has("fire") ? KNIGHT_FIRE_SUFFIX : "";
    const tintVariant = this.getWeaponTintVariant();
    spriteManager.drawSpriteAligned(
      renderer,
      `${this.getRenderedFrameId()}${fireSuffix}`,
      this.positionX - cameraX,
      this.positionY + this.height - cameraY,
      PLAYER_CONFIG.hitboxWidth,
      this.facingDirection === "left",
      null,
      tintVariant ?? (fireSuffix === "" ? this.equipmentVariant : this.armorOnlyVariant)
    );
    // guardia alzata: la barriera della mossa davanti (sagoma bianca finché la parata è perfetta)
    if (this.isGuardUp) {
      const ability = this.ability;
      const isPerfectWindow = ability.kind === "guard" && this.guardElapsedMs <= ability.perfectWindowMs;
      const guardFrameIds = ABILITY_VISUAL_CONFIG[ability.id].guardFrameIds;
      const glowColor = ability.kind === "guard" && ability.resource === "mana" ? PALETTE.lilac : PALETTE.cyan;
      if (guardFrameIds === undefined) {
        // guardia senza barriera disegnata: la barra di luce di prima (bianca nella finestra della parata perfetta)
        const barColor = isPerfectWindow ? PALETTE.white : glowColor;
        const barX = (this.facingDirection === "right" ? this.positionX + this.width + 3 : this.positionX - 5) - cameraX;
        renderer.fillGlow(barX + 1, this.positionY + this.height / 2 - cameraY, 9, barColor, 2, 4);
        renderer.fillRect(barX, this.positionY + 1 - cameraY, 2, this.height - 2, barColor);
      } else {
        const frameId = guardFrameIds[Math.floor(this.guardElapsedMs / GUARD_FRAME_DURATION_MS) % 2]!;
        const size = spriteManager.getSpriteSize(frameId);
        const barrierX = (this.facingDirection === "right" ? this.positionX + this.width + 1 : this.positionX - 1 - size.width) - cameraX;
        const barrierY = this.positionY + this.height / 2 - size.height / 2 - cameraY;
        renderer.fillGlow(barrierX + size.width / 2, barrierY + size.height / 2, 9, isPerfectWindow ? PALETTE.white : glowColor, 2, 4);
        if (isPerfectWindow) {
          spriteManager.drawSpriteSilhouette(renderer, frameId, Math.round(barrierX), Math.round(barrierY), this.facingDirection === "left", PALETTE.white);
        } else {
          spriteManager.drawSprite(renderer, frameId, Math.round(barrierX), Math.round(barrierY), this.facingDirection === "left");
        }
      }
    }
    // arco a piena carica: un bagliore che pulsa davanti alla mano
    if (this.chargeFraction === 1) {
      const handX = this.facingDirection === "right" ? this.positionX + this.width + 4 : this.positionX - 4;
      const pulse = Math.floor(this.attackElapsedMs / 120) % 2;
      renderer.fillGlow(handX - cameraX, this.positionY + 10 - cameraY, 6 + pulse, PALETTE.white, 2, 6);
    }
  }

  /**
   * Durante una mossa che tinge l'arma (Classi Fase 6A), la variante con lama e scie dell'elemento sopra le armature
   * indossate; null altrimenti.
   */
  private getWeaponTintVariant(): SpriteColorVariant | null {
    const running = this.runningAbility;
    if (running === null) {
      return null;
    }
    const element = ABILITY_VISUAL_CONFIG[running.id].weaponTint;
    if (element === undefined) {
      return null;
    }
    let variant = this.weaponTintVariants.get(element);
    if (variant === undefined) {
      const armor = this.armorOnlyVariant;
      variant = { id: `${armor?.id ?? ""}|tinta-${element}`, colors: { ...armor?.colors, ...WEAPON_TINT_COLORS[element] } };
      this.weaponTintVariants.set(element, variant);
    }
    return variant;
  }

  /**
   * Alone (retino che pulsa) dietro il cavaliere per ogni power-up attivo, nel suo colore.
   * Negli ultimi 2 secondi lampeggia per avvisare che sta per scadere.
   */
  private renderPowerUpAuras(renderer: Renderer, cameraX: number, cameraY: number): void {
    const centerX = this.positionX + this.width / 2 - cameraX;
    const centerY = this.positionY + this.height / 2 - 2 - cameraY;
    this.modifiers.activePowerUps.forEach((powerUp, auraIndex) => {
      const isExpiring = powerUp.remainingMs < POWER_UP_WARNING_MS;
      if (isExpiring && Math.floor(powerUp.remainingMs / 120) % 2 === 0) {
        return;
      }
      const pulse = Math.floor((this.auraElapsedMs + auraIndex * 150) / 180) % 2;
      renderer.fillGlow(centerX, centerY, 17 + pulse + auraIndex * 2, powerUp.definition.auraColor, 2, 4);
    });
  }

  // -------------------------------------------------------------------------
  // Logica interna
  // -------------------------------------------------------------------------

  private updateTimers(deltaTimeMs: number): void {
    this.invulnerabilityRemainingMs = Math.max(0, this.invulnerabilityRemainingMs - deltaTimeMs);
    this.attackCooldownRemainingMs = Math.max(0, this.attackCooldownRemainingMs - deltaTimeMs);
    this.updateStamina(deltaTimeMs);
    this.dodgeCooldownRemainingMs = Math.max(0, this.dodgeCooldownRemainingMs - deltaTimeMs);
    this.groundComboManager.update(deltaTimeMs);
    this.airComboManager.update(deltaTimeMs);
    // prima la cura del frame, poi la scadenza: così l'ultimo frame del power-up conta
    this.applyRegeneration(deltaTimeMs);
    const powerUpCount = this.modifiers.activePowerUps.length;
    this.modifiers.update(deltaTimeMs);
    if (this.modifiers.activePowerUps.length < powerUpCount) {
      this.clampResourcesToMax(); // un power-up scaduto può abbassare i massimi
    }
    this.auraElapsedMs += deltaTimeMs;
    // tolleranza nel salto: "coyote time" (si salta anche subito dopo aver lasciato il bordo)
    this.coyoteRemainingMs = this.isOnGround
      ? PLAYER_CONFIG.coyoteTimeMs
      : Math.max(0, this.coyoteRemainingMs - deltaTimeMs);
    this.jumpBufferRemainingMs = Math.max(0, this.jumpBufferRemainingMs - deltaTimeMs);

    // Un attacco memorizzato scade sempre dopo attackBufferMs: se non è partito in tempo, si perde.
    if (this.bufferedAttackInput !== null) {
      this.bufferRemainingMs -= deltaTimeMs;
      if (this.bufferRemainingMs <= 0) {
        this.bufferedAttackInput = null;
      }
    }
    if (this.isDead) {
      this.deathElapsedMs += deltaTimeMs;
    }
    if (this.hurtRemainingMs > 0) {
      this.hurtRemainingMs = Math.max(0, this.hurtRemainingMs - deltaTimeMs);
      if (this.hurtRemainingMs === 0) {
        this.velocityX = 0;
      }
    }
    if (this.dodgeRemainingMs > 0) {
      this.dodgeRemainingMs = Math.max(0, this.dodgeRemainingMs - deltaTimeMs);
      if (this.dodgeRemainingMs === 0) {
        this.velocityX = 0;
        this.dodgeCooldownRemainingMs = this.character.dodgeCooldownMs;
      }
    }
    if (this.currentAttack !== null) {
      const elapsedBefore = this.attackElapsedMs;
      this.attackElapsedMs += deltaTimeMs;
      const ability = this.ability;
      if (
        this.isAbilityAttackActive &&
        ability.kind === "attack" &&
        ability.impactEffect !== undefined &&
        elapsedBefore < ability.attack.hitStartMs &&
        this.attackElapsedMs >= ability.attack.hitStartMs
      ) {
        this.hasPendingAbilityImpact = true;
      }
      const running = this.runningAbility;
      if (running !== null) {
        for (const cue of ABILITY_VISUAL_CONFIG[running.id].cues) {
          if (elapsedBefore <= cue.atMs && cue.atMs < this.attackElapsedMs) {
            this.pendingAbilityEffects.push(cue);
          }
        }
      }
      this.launchProjectileIfDue();
      if (this.currentAttack.charge !== undefined && this.attackElapsedMs >= this.currentAttack.durationMs) {
        this.releaseCharge(); // tenuto troppo a lungo: l'arco tira da solo
      } else if (this.attackElapsedMs >= this.currentAttack.durationMs) {
        this.attackCooldownRemainingMs = this.getAttackCooldownMs(this.currentAttack);
        this.currentAttack = null;
        this.targetsHitByCurrentAttack.clear();
        this.comboManager.onAttackFinished();
      }
    }
  }

  /**
   * Accovacciarsi: solo a terra, tenendo il tasto. La hitbox si abbassa e i piedi restano dove sono.
   * Ci si rialza solo se non c'è una piattaforma solida sopra la testa (quelle a senso unico non contano).
   */
  private updateCrouch(input: InputSource, platforms: PlatformDefinition[]): void {
    const canCrouch =
      input.isHeld("crouch") &&
      this.isOnGround &&
      !this.isDead &&
      this.hurtRemainingMs <= 0 &&
      this.dodgeRemainingMs <= 0 &&
      !this.isGuardUp &&
      !this.isAbilityAttackActive; // le abilità non hanno pose accovacciate
    this.setCrouched(canCrouch, platforms);
  }

  private setCrouched(crouched: boolean, platforms: PlatformDefinition[]): void {
    if (crouched === this.isCrouching) {
      return;
    }
    const feetY = this.positionY + this.height;
    const newHeight = crouched ? PLAYER_CONFIG.crouchHitboxHeight : PLAYER_CONFIG.hitboxHeight;
    if (!crouched) {
      const standingBounds = { x: this.positionX, y: feetY - newHeight, width: this.width, height: newHeight };
      const isBlockedByCeiling = platforms.some(
        (platform) => !platform.oneWay && CollisionSystem.intersects(standingBounds, platform)
      );
      if (isBlockedByCeiling) {
        return;
      }
    }
    this.height = newHeight;
    this.positionY = feetY - newHeight;
  }

  private handleInput(input: InputSource): void {
    const isDodging = this.dodgeRemainingMs > 0;

    // mosse speciali (7-0, L = 7): il tasto sceglie lo slot; lo scudo si tiene premuto, le altre partono alla pressione
    const pressedSlot = ABILITY_SLOT_ACTIONS.findIndex((action) => input.wasPressed(action));
    // durante un attacco o una schivata lo slot attivo non cambia; uno slot vuoto non fa niente
    const isSlotChosen = pressedSlot >= 0 && this.currentAttack === null && !isDodging && this.selectAbilitySlot(pressedSlot);
    this.updateGuard(input);
    if (this.isGuardUp) {
      this.bufferedAttackInput = null;
      this.approachHorizontalVelocity(0);
      this.applyFacingInput(input); // con lo scudo alzato ci si gira ma non ci si muove
      return;
    }
    if (isSlotChosen) {
      this.tryStartAbility();
    }
    if (input.wasPressed("dodge") && this.canStartDodge() && this.spendStamina(this.dodgeStaminaCost)) {
      this.startDodge();
    }
    // arco: rilasciando il tasto parte il tiro caricato
    if (this.currentAttack?.charge !== undefined && this.chargeInput !== null && !input.isHeld(this.chargeInput)) {
      this.releaseCharge();
    }
    if (input.wasPressed("attack")) {
      this.bufferAttack("attack");
    } else if (input.wasPressed("heavyAttack")) {
      this.bufferAttack("heavyAttack");
    }
    if (
      this.bufferedAttackInput !== null &&
      !isDodging &&
      this.currentAttack === null &&
      this.attackCooldownRemainingMs <= 0
    ) {
      this.startAttack(this.bufferedAttackInput);
      this.bufferedAttackInput = null;
    }

    if (this.dodgeRemainingMs > 0) {
      return; // durante la schivata la velocità è fissata
    }
    const dash = this.activeDash;
    const isGroundedAttack = this.currentAttack !== null && this.isOnGround;
    if (dash !== null) {
      this.velocityX = (this.facingDirection === "right" ? 1 : -1) * dash.speed; // scatto dell'abilità
    } else if (isGroundedAttack) {
      this.approachHorizontalVelocity(0); // a terra l'attacco ferma il movimento (sul ghiaccio scivola)
    } else {
      this.applyHorizontalInput(input);
    }
    this.applyJumpInput(input, isGroundedAttack);
  }

  /**
   * Memorizza un attacco premuto in anticipo, ma solo se potrà partire entro attackBufferMs.
   * Un tasto premuto molto prima (es. all'inizio di una sequenza lunga) viene ignorato:
   * altrimenti, premendo a raffica, il cavaliere continuerebbe ad attaccare anche dopo
   * aver smesso di premere.
   */
  /** Vero se poco più avanti, nella direzione dello scatto, c'è una zona in cui fermarsi (spuntoni). */
  private isDashHeadingIntoStopZone(): boolean {
    const zones = this.environment.dashStopZones ?? [];
    const probe = { x: this.positionX + Math.sign(this.velocityX) * 3, y: this.positionY, width: this.width, height: this.height };
    return zones.some((zone) => CollisionSystem.intersects(probe, zone));
  }

  /** Vero se subito oltre il bordo del corpo, nella direzione del movimento, c'è terreno poco più in basso. */
  private hasGroundInDirectionOfMovement(platforms: PlatformDefinition[]): boolean {
    const probeX = this.velocityX > 0 ? this.positionX + this.width + 2 : this.positionX - 2;
    const feetY = this.positionY + this.height;
    return platforms.some(
      (platform) =>
        probeX >= platform.x &&
        probeX <= platform.x + platform.width &&
        platform.y >= feetY - 6 &&
        platform.y - feetY <= PLAYER_CONFIG.knockbackLedgeCheckDepth
    );
  }

  private bufferAttack(attackInput: AttackInput): void {
    if (this.getMsUntilAttackAllowed() > PLAYER_CONFIG.attackBufferMs) {
      return;
    }
    this.bufferedAttackInput = attackInput;
    this.bufferRemainingMs = PLAYER_CONFIG.attackBufferMs;
  }

  /** Tra quanti ms si potrà iniziare un nuovo attacco (0 = subito). */
  private getMsUntilAttackAllowed(): number {
    let remainingMs = this.attackCooldownRemainingMs;
    if (this.currentAttack !== null) {
      remainingMs = this.currentAttack.durationMs - this.attackElapsedMs + this.getAttackCooldownMs(this.currentAttack);
    }
    return Math.max(remainingMs, this.dodgeRemainingMs);
  }

  /** Attacco a terra o in aria (categorie di combo separate: passando dall'una all'altra la combo riparte). */
  private startAttack(attackInput: GameAction): void {
    const manager = this.isOnGround ? this.groundComboManager : this.airComboManager;
    if (manager !== this.comboManager) {
      this.comboManager.reset();
      this.comboManager = manager;
    }
    // l'attacco pesante costa stamina: senza, non parte
    const staminaCost = attackInput === "heavyAttack" ? PLAYER_CONFIG.heavyAttackStaminaCost : 0;
    if (!this.staminaPool.canSpend(staminaCost)) {
      this.hasPendingTired = true;
      return;
    }
    const attack = manager.getNextAttack(attackInput);
    // senza munizioni l'arma non tira e non comincia nemmeno a caricare (arco)
    if ((attack.projectile !== undefined || attack.charge !== undefined) && this.ammo !== null && this.ammo <= 0) {
      manager.reset();
      this.hasPendingOutOfAmmo = true; // senza munizioni l'arma non attacca
      return;
    }
    if (staminaCost > 0) {
      this.spendStamina(staminaCost);
    }
    this.hasLaunchedCurrentAttack = false;
    this.releasedCharge = null;
    this.chargeInput = attack.charge !== undefined && (attackInput === "attack" || attackInput === "heavyAttack") ? attackInput : null;
    const completedCombo = manager.drainCompletedCombo();
    if (completedCombo?.name !== undefined) {
      this.completedComboName = completedCombo.name;
    }
    this.currentAttack = attack;
    this.attackElapsedMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.animationPlayer.restart(attack.animation);
  }

  private cancelAttack(): void {
    this.currentAttack = null;
    this.attackElapsedMs = 0;
    this.attackCooldownRemainingMs = 0;
    this.bufferedAttackInput = null;
    this.targetsHitByCurrentAttack.clear();
    this.groundComboManager.reset();
    this.airComboManager.reset();
    this.chargeInput = null;
    this.releasedCharge = null;
  }

  /** Fine della carica dell'arco: parte l'attacco di rilascio, con la carica raggiunta. */
  private releaseCharge(): void {
    const charge = this.currentAttack?.charge;
    if (charge === undefined) {
      return;
    }
    const release = this.weapon.attacks[charge.releaseAttackId];
    const fraction = Math.min(1, this.attackElapsedMs / charge.maxChargeMs);
    this.chargeInput = null;
    if (release === undefined) {
      this.cancelAttack();
      return;
    }
    this.currentAttack = release;
    this.attackElapsedMs = 0;
    this.hasLaunchedCurrentAttack = false;
    this.releasedCharge = { fraction, charge };
    this.targetsHitByCurrentAttack.clear();
    this.animationPlayer.restart(release.animation);
  }

  /**
   * Arma a distanza: al momento giusto dell'attacco parte il proiettile, dalla mano, nella direzione in cui
   * guarda il cavaliere. Il danno segue la carica (arco) e i power-up (come per la spada); consuma una munizione.
   */
  private launchProjectileIfDue(): void {
    const attack = this.currentAttack;
    const spec = attack?.projectile;
    if (attack === null || spec === undefined || this.hasLaunchedCurrentAttack || this.attackElapsedMs < spec.launchAtMs) {
      return;
    }
    this.hasLaunchedCurrentAttack = true;
    let baseDamage = attack.damage;
    let speedMultiplier = 1;
    const released = this.releasedCharge;
    if (released !== null) {
      const { fraction, charge } = released;
      baseDamage = charge.minDamage + (charge.maxDamage - charge.minDamage) * fraction;
      speedMultiplier = charge.minSpeedMultiplier + (charge.maxSpeedMultiplier - charge.minSpeedMultiplier) * fraction;
    }
    const direction = this.facingDirection === "right" ? 1 : -1;
    const bounds = this.getBounds();
    this.pendingLaunches.push({
      projectileId: spec.projectileId,
      owner: "player",
      origin: {
        x: direction > 0 ? bounds.x + spec.originX : bounds.x + bounds.width - spec.originX,
        y: bounds.y + spec.originY,
      },
      direction: { x: direction, y: spec.aimY },
      damage: CombatSystem.calculateDamage(baseDamage + this.getBonusDamage(), this.getDamageMultiplierFor(attack)),
      speedMultiplier,
      hit: this.getHitProperties(attack),
    });
    if (this.ammo !== null && spec.usesAmmo !== false) {
      this.ammo = Math.max(0, this.ammo - 1);
    }
  }

  /** Il colpo in picchiata tocca terra: finisce, con il suo tempo di recupero. */
  private finishPlungeOnLanding(): void {
    this.attackCooldownRemainingMs = this.currentAttack === null ? 0 : this.getAttackCooldownMs(this.currentAttack);
    this.currentAttack = null;
    this.attackElapsedMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.airComboManager.reset();
    this.hasPendingPlungeLanding = true;
  }

  /**
   * Recupero dopo un attacco, accorciato dai modificatori "recupero" dell'arma e dalla Destrezza (Classi Fase 4, stesso
   * tetto); per gli attacchi dell'arma anche il bonus o malus della classe (Classi Fase 3) e il malus della Forza
   * mancante, che non toccano abilità e incantesimi.
   */
  private getAttackCooldownMs(attack: AttackDefinition): number {
    const weaponFactor = this.isWeaponAttack(attack) ? this.weaponAffinity.recoveryMultiplier * this.strengthPenalties.weaponRecoveryMultiplier : 1;
    return attack.cooldownMs * this.getRecoveryMultiplier() * weaponFactor;
  }

  /** Moltiplicatore dei tempi di recupero: equipaggiamento e Destrezza sotto lo stesso tetto. */
  public getRecoveryMultiplier(): number {
    const attributePercent = this.modifiers.getValue("attackRecoveryPercent");
    if (attributePercent <= 0) {
      return this.equipment.recoveryMultiplier;
    }
    return 1 - combineCappedFraction(1 - this.equipment.recoveryMultiplier, attributePercent, AFFIX_CONFIG.recovery.cap);
  }

  /** La risorsa indicata (guardia: stamina per lo scudo, mana per la barriera). */
  private getPool(resource: "stamina" | "mana"): ResourcePool {
    return resource === "mana" ? this.manaPool : this.staminaPool;
  }

  /** Consuma stamina; se non basta non consuma niente, segnala "stanco" e restituisce false. */
  private spendStamina(cost: number): boolean {
    if (!this.staminaPool.trySpend(cost)) {
      this.hasPendingTired = true;
      return false;
    }
    return true;
  }

  /**
   * Paga il costo di un'abilità (Classi Fase 0): tutto o niente. Se una risorsa non basta non consuma niente
   * e restituisce false ("stanco" se manca la stamina). Le risorse con costo 0 non si toccano.
   */
  private payCost(cost: Readonly<ResourceCost>): boolean {
    if (!this.canAfford(cost)) {
      if (!this.staminaPool.canSpend(cost.stamina ?? 0)) {
        this.hasPendingTired = true;
      }
      if (!this.manaPool.canSpend(cost.mana ?? 0)) {
        this.hasPendingNoMana = true;
      }
      if ((cost.health ?? 0) > 0 && this.currentHealth - (cost.health ?? 0) < 1) {
        this.hasPendingLowHealth = true;
      }
      return false;
    }
    if ((cost.stamina ?? 0) > 0) {
      this.staminaPool.trySpend(cost.stamina ?? 0);
    }
    if ((cost.mana ?? 0) > 0) {
      this.manaPool.trySpend(cost.mana ?? 0);
    }
    if ((cost.health ?? 0) > 0) {
      this.currentHealth -= cost.health ?? 0;
      this.pendingHealthPaid += cost.health ?? 0;
    }
    return true;
  }

  /**
   * Ricariche delle abilità e recupero delle risorse (dopo una pausa dall'ultimo consumo);
   * lo scudo alzato consuma stamina e ne ferma il recupero.
   */
  private updateStamina(deltaTimeMs: number): void {
    for (let slotIndex = 0; slotIndex < this.abilityCooldownsMs.length; slotIndex++) {
      this.abilityCooldownsMs[slotIndex] = Math.max(0, this.abilityCooldownsMs[slotIndex] - deltaTimeMs);
    }
    this.guardGraceRemainingMs = Math.max(0, this.guardGraceRemainingMs - deltaTimeMs);
    const ability = this.ability;
    // la guardia alzata consuma la sua risorsa e ne ferma il recupero; l'altra recupera normalmente
    const guardPool = this.isGuardUp && ability.kind === "guard" ? this.getPool(ability.resource) : null;
    if (guardPool !== null && ability.kind === "guard") {
      this.guardElapsedMs += deltaTimeMs;
      guardPool.drain((ability.drainPerSecond * deltaTimeMs) / 1000);
      if (guardPool.value <= 0) {
        this.lowerGuard();
      }
    }
    if (guardPool !== this.manaPool) {
      this.manaPool.update(deltaTimeMs);
    }
    if (guardPool !== this.staminaPool) {
      this.staminaPool.update(deltaTimeMs);
    }
  }

  private resetStaminaAndAbility(): void {
    this.staminaPool.refill();
    this.manaPool.refill();
    this.abilityCooldownsMs.fill(0);
    this.isGuardUp = false;
    this.guardGraceRemainingMs = 0;
  }

  /** Abilità d'attacco: solo a terra, in piedi, senza un altro attacco o una schivata in corso. */
  private tryStartAbility(): void {
    const ability = this.ability;
    if (ability.kind === "attack" && !this.meetsAbilityGrade(ability)) {
      this.hasPendingLowIntelligence = true; // grado troppo alto: la mossa resta visibile ma non parte
      return;
    }
    if (
      ability.kind !== "attack" ||
      !this.isOnGround ||
      this.isCrouching ||
      this.currentAttack !== null ||
      this.dodgeRemainingMs > 0 ||
      this.abilityCooldownsMs[this.activeAbilitySlot] > 0 ||
      !this.payCost(this.getAbilityCost(ability))
    ) {
      return;
    }
    this.abilityCooldownsMs[this.activeAbilitySlot] = ability.cooldownMs;
    this.groundComboManager.reset();
    this.airComboManager.reset();
    this.bufferedAttackInput = null;
    this.chargeInput = null;
    this.releasedCharge = null;
    this.hasLaunchedCurrentAttack = false;
    this.currentAttack = ability.attack;
    this.attackElapsedMs = 0;
    this.targetsHitByCurrentAttack.clear();
    this.animationPlayer.restart(ability.attack.animation);
    this.pendingAbilityName = ability.name;
  }

  /** Scudo (abilità del Paladino): si alza premendo il tasto del suo slot, resta alzato finché lo si tiene e c'è stamina. */
  private updateGuard(input: InputSource): void {
    const ability = this.ability;
    if (ability.kind !== "guard") {
      return;
    }
    if (this.isGuardUp) {
      if (!input.isHeld(ABILITY_SLOT_ACTIONS[this.activeAbilitySlot]!) || !this.isOnGround) {
        this.lowerGuard();
      }
      return;
    }
    const canRaise =
      input.wasPressed(ABILITY_SLOT_ACTIONS[this.activeAbilitySlot]!) &&
      this.isOnGround &&
      !this.isCrouching &&
      this.currentAttack === null &&
      this.dodgeRemainingMs <= 0 &&
      this.abilityCooldownsMs[this.activeAbilitySlot] <= 0;
    if (canRaise && !this.meetsAbilityGrade(ability)) {
      this.hasPendingLowIntelligence = true;
      return;
    }
    if (canRaise && this.payCost(this.getAbilityCost(ability))) {
      this.isGuardUp = true;
      this.guardElapsedMs = 0;
      this.guardGraceRemainingMs = 0;
      this.pendingAbilityName = ability.name;
    }
  }

  private lowerGuard(): void {
    if (this.isGuardUp) {
      this.isGuardUp = false;
      this.abilityCooldownsMs[this.activeAbilitySlot] = this.ability.cooldownMs;
    }
  }

  /** Solo la direzione (scudo alzato): ci si gira senza muoversi. */
  private applyFacingInput(input: InputSource): void {
    if (input.isHeld("moveLeft") && !input.isHeld("moveRight")) {
      this.facingDirection = "left";
    } else if (input.isHeld("moveRight") && !input.isHeld("moveLeft")) {
      this.facingDirection = "right";
    }
  }

  private canStartDodge(): boolean {
    return (
      this.isOnGround &&
      this.currentAttack === null &&
      this.dodgeRemainingMs <= 0 &&
      this.dodgeCooldownRemainingMs <= 0
    );
  }

  private startDodge(): void {
    this.dodgeRemainingMs = this.character.dodgeDurationMs;
    this.velocityX = (this.facingDirection === "right" ? 1 : -1) * this.character.dodgeSpeed;
    this.bufferedAttackInput = null;
    this.animationPlayer.restart("dodge");
  }

  private applyHorizontalInput(input: InputSource): void {
    let direction = 0;
    if (input.isHeld("moveLeft")) {
      direction -= 1;
    }
    if (input.isHeld("moveRight")) {
      direction += 1;
    }
    // accovacciato non ci si sposta: ci si può solo girare
    const crouchFactor = this.isCrouching ? 0 : 1;
    this.approachHorizontalVelocity(
      crouchFactor *
        direction *
        this.character.movementSpeed *
        this.weapon.movementSpeedMultiplier *
        this.environment.speedMultiplier *
        this.modifiers.getValue("movementSpeedMultiplier") *
        this.equipment.movementSpeedMultiplier *
        this.strengthPenalties.movementSpeedMultiplier
    );
    // la direzione resta bloccata mentre si attacca
    if (direction !== 0 && this.currentAttack === null) {
      this.facingDirection = direction < 0 ? "left" : "right";
    }
  }

  private applyJumpInput(input: InputSource, isJumpBlocked: boolean): void {
    if (input.wasPressed("jump")) {
      this.jumpBufferRemainingMs = PLAYER_CONFIG.jumpBufferMs;
    }
    const canJump = (this.isOnGround || this.coyoteRemainingMs > 0 || this.environment.canSwim) && !isJumpBlocked;
    if (this.jumpBufferRemainingMs > 0 && canJump) {
      this.velocityY = -PLAYER_CONFIG.jumpForce * this.environment.jumpMultiplier;
      this.jumpBufferRemainingMs = 0;
      this.coyoteRemainingMs = 0;
    }
    // Salto variabile: rilasciando il tasto in salita il salto si accorcia.
    if (input.wasReleased("jump") && this.velocityY < 0) {
      this.velocityY *= PLAYER_CONFIG.jumpCutMultiplier;
    }
  }

  /**
   * Rigenerazione (power-up, e cura lenta del personaggio dopo un po' senza colpi subiti):
   * accumula frazioni di HP e cura a punti interi.
   */
  private applyRegeneration(deltaTimeMs: number): void {
    this.msSinceLastHit += deltaTimeMs;
    const characterRegeneration = this.character.regeneration;
    const characterHealthPerSecond =
      characterRegeneration !== undefined && this.msSinceLastHit >= characterRegeneration.delayAfterHitMs ? characterRegeneration.healthPerSecond : 0;
    const healthPerSecond = this.modifiers.getValue("healthRegenPerSecond") + characterHealthPerSecond;
    if (healthPerSecond <= 0 || this.isDead) {
      this.regenerationAccumulator = 0;
      return;
    }
    this.regenerationAccumulator += (healthPerSecond * deltaTimeMs) / 1000;
    // piccola tolleranza: la somma di molti frame (es. 600 x 0,0667) non deve perdere un punto per arrotondamento
    const wholePoints = Math.floor(this.regenerationAccumulator + 1e-6);
    if (wholePoints > 0) {
      this.regenerationAccumulator -= wholePoints;
      this.heal(wholePoints);
    }
  }

  /**
   * Porta la velocità orizzontale verso quella voluta: subito se l'aderenza è piena, altrimenti
   * gradualmente (ghiaccio: si scivola all'avvio e alla frenata). In aria l'aderenza non conta.
   */
  private approachHorizontalVelocity(targetVelocityX: number): void {
    const traction = this.environment.traction;
    if (traction === null || !this.isOnGround) {
      this.velocityX = targetVelocityX;
      return;
    }
    const blend = Math.min(1, traction * this.lastDeltaTimeSeconds);
    this.velocityX += (targetVelocityX - this.velocityX) * blend;
    if (Math.abs(this.velocityX) < 1 && targetVelocityX === 0) {
      this.velocityX = 0;
    }
  }

  /** Priorità: morto > stordito > schivata > scudo > attacco > accovacciato > aria > camminata > fermo. */
  private updateState(): void {
    if (this.isDead) {
      this.currentState = "dead";
    } else if (this.hurtRemainingMs > 0) {
      this.currentState = "hurt";
    } else if (this.dodgeRemainingMs > 0) {
      this.currentState = "dodge";
    } else if (this.isGuardUp) {
      this.currentState = "guard";
    } else if (this.currentAttack !== null) {
      this.currentState = "attack";
    } else if (this.isCrouching && this.isOnGround) {
      this.currentState = "crouch";
    } else if (!this.isOnGround) {
      this.currentState = this.velocityY < 0 ? "jump" : "fall";
    } else if (this.velocityX !== 0) {
      this.currentState = "walk";
    } else {
      this.currentState = "idle";
    }
  }

  /**
   * Frame da disegnare: quello dell'animazione con il suffisso dell'arma in mano ("" per la spada) e quello del
   * personaggio ("" per il cavaliere);
   * durante un attacco da accovacciati, la variante bassa dello sprite.
   * Si guarda l'animazione in corso, non lo stato: un colpo subito cambia subito l'animazione
   * (danno), mentre lo stato si aggiorna solo al frame successivo.
   */
  public getRenderedFrameId(): string {
    const frameId = this.animationPlayer.currentFrameId;
    const isCrouchedAttackFrame =
      this.isCrouching && this.currentAttack !== null && this.animationPlayer.animationName === this.currentAttack.animation;
    const crouchSuffix = isCrouchedAttackFrame ? KNIGHT_CROUCH_SUFFIX : "";
    return `${frameId}${crouchSuffix}${this.weapon.spriteSuffix}${this.character.spriteSuffix}`;
  }

  /** Gestore delle combo dell'arma per terra o aria (senza combo aeree, in aria valgono quelle di terra). */
  private static createComboManager(weapon: WeaponDefinition, category: "ground" | "air"): ComboManager {
    const comboSet = category === "air" && weapon.air !== undefined ? weapon.air : weapon;
    return new ComboManager(comboSet.combos, weapon.attacks, comboSet.defaultAttackByInput);
  }

  private getAnimationName(): string {
    if (this.currentState === "attack" && this.currentAttack !== null) {
      return this.currentAttack.animation;
    }
    return this.currentState;
  }
}
