import { CHARACTER_CONFIG, CHARACTER_ORDER } from "../config/characterConfig";
import { PALETTE, PALETTE_RAMPS } from "../config/gameConfig";
import { WEAPON_CONFIG } from "../config/weaponConfig";
import type { InputManager } from "../core/InputManager";
import { BackgroundRenderer } from "../rendering/BackgroundRenderer";
import { measureTextWidth } from "../rendering/BitmapFont";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteColorVariant, SpriteManager } from "../rendering/SpriteManager";
import { getCharacterPreviewFrameId } from "../rendering/sprites/knightSprites";
import type { CharacterDefinition, CharacterId } from "../types/EntityTypes";
import type { GameStateName } from "../types/GameTypes";
import type { ThemeId } from "../types/LevelTypes";
import { MenuManager } from "./MenuManager";
import { TITLE_GOLD_ROWS, drawOrnateFrame } from "./HUDManager";
import { cycleRampColor } from "../rendering/PaletteEffects";
import { ARMOR_CONFIG, ARMOR_SLOTS, ARMOR_SLOT_NAMES } from "../config/armorConfig";
import { RARITY_CONFIG } from "../config/rarityConfig";
import { getItemIconVariant } from "../rendering/sprites/equipmentVisuals";
import { compareItemStats, describeItemStats } from "../systems/EquipmentStats";
import { getItemBaseName, getItemIconSpriteId, getItemName, getItemWeight, getUniqueItemDefinition } from "../systems/ItemFactory";
import { describeWeaponAffinity, type WeaponAffinityLine } from "../systems/WeaponAffinity";
import { getWeaponAffinity } from "../config/weaponAffinityConfig";
import type { ArmorSlot, EquipmentBonuses, EquippedArmor, ItemInstance, WeaponItem } from "../types/ItemTypes";

/** Icona della sagoma di un posto d'armatura vuoto. */
const ARMOR_ICON_BY_SLOT: Record<ArmorSlot, string> = { helmet: "armorIconHelmet", chest: "armorIconChest", boots: "armorIconBoots" };

/** Comandi che i menu possono richiedere al motore. */
export type MenuCommand =
  | "newGame"
  | "showControls"
  | "showLevelSelect"
  | "showCharacterSelect"
  | "confirmCharacter"
  | "showResetConfirm"
  | "resetAllData"
  | "buyShopOffer"
  | "leaveShop"
  | "cycleDifficulty"
  | "startSelectedLevel"
  | "backToTitle"
  | "resume"
  | "showEquipment"
  | "equipmentUse"
  | "equipmentDrop"
  | "closeEquipment";

/** Un posto della borsa nella schermata dell'equipaggiamento (E4). */
export type EquipmentBagView = { kind: "weapon"; item: WeaponItem; ammo: number | null; isEquipped: boolean } | { kind: "potion"; iconSpriteId: string; count: number } | null;

/** Dati della schermata dell'equipaggiamento (E4). */
export interface EquipmentView {
  armor: Readonly<EquippedArmor>;
  bag: EquipmentBagView[];
  backpack: readonly ItemInstance[];
  backpackCapacity: number;
  /** Set attivi, già scritti ("SET DEL SOLDATO 2/3"). */
  activeSets: string[];
  /** Bonus totali dell'equipaggiamento (riassunto a destra). */
  bonuses: EquipmentBonuses;
  /** Classe in uso: bonus e malus delle armi nella scheda (Classi Fase 3). */
  characterId: CharacterId;
}

/** Colori della riga di classe delle armi (Classi Fase 3): verde i bonus, rosso malus e divieti. */
export const WEAPON_AFFINITY_TONE_COLORS: Record<WeaponAffinityLine["tone"], string> = {
  bonus: PALETTE.lightGreen,
  malus: PALETTE.red,
  forbidden: PALETTE.red,
};

/** Casella scelta nella schermata dell'equipaggiamento. */
export type EquipmentCell = { section: "armor"; slot: ArmorSlot } | { section: "bag"; index: number } | { section: "backpack"; index: number };

/** Geometria della schermata dell'equipaggiamento: caselle, passo, righe dello zaino. */
export const EQUIPMENT_LAYOUT = {
  cellSize: 20,
  cellStep: 24,
  topRowY: 40,
  armorX: 16,
  bagX: 96,
  backpackX: 16,
  backpackY: 76,
  backpackColumns: 6,
  cardY: 126,
} as const;

/** Un livello come appare nella schermata di selezione. */
export interface LevelSummary {
  id: number;
  name: string;
  theme: ThemeId;
  isUnlocked: boolean;
  bossName: string | null;
}

/** Dati che le schermate mostrano (forniti dal motore). */
export interface ScreenData {
  score: number;
  bestScore: number;
  isNewRecord: boolean;
  /** Nome della difficoltà scelta (mostrato nel menu del titolo). */
  difficultyName: string;
  /** Personaggio scelto (menu del titolo e schermata di scelta). */
  characterId: CharacterId;
  /** Tutti i livelli, con quelli già raggiunti sbloccati. */
  levels: LevelSummary[];
  /** Fase 6: personaggi sbloccati, monete della partita e voci della bottega. */
  unlockedCharacterIds: CharacterId[];
  coins: number;
  shopOffers: ShopOfferView[];
  /** Equipaggiamento (E4): solo quando serve la sua schermata. */
  equipment?: EquipmentView;
}

/** Una voce della bottega come appare sullo schermo. */
export interface ShopOfferView {
  name: string;
  description: string;
  price: number;
  isSoldOut: boolean;
  iconSpriteId: string;
  /** Colori della rarità dell'oggetto (armi e armature), null per le altre voci. */
  iconVariant?: SpriteColorVariant | null;
  /** Colore del nome (la rarità), null = bianco. */
  nameColor?: string | null;
  /** Lato dell'icona (16 le armi, 8 gli oggetti). */
  iconSize: 8 | 16;
  /** Bonus e malus della classe per l'arma in vendita (Classi Fase 3): prende il posto della descrizione. */
  classLine?: WeaponAffinityLine | null;
}

/** Colore rappresentativo di ogni ambientazione (riquadro nella selezione dei livelli). */
const THEME_SWATCHES: Record<ThemeId, [string, string]> = {
  forest: [PALETTE.green, PALETTE.deepForest],
  castle: [PALETTE.stoneLight, PALETTE.stoneShadow],
  dungeon: [PALETTE.amethyst, PALETTE.violetDark],
  swamp: [PALETTE.olive, PALETTE.bogDark],
  ice: [PALETTE.iceWhite, PALETTE.blue],
  wasteland: [PALETTE.sand, PALETTE.ember],
  tower: [PALETTE.lilac, PALETTE.violet],
  shop: [PALETTE.woodLight, PALETTE.earth],
};

/** Riga della schermata dei controlli: tasti (come tasti disegnati) e descrizione. */
/** Righe della tabella dei controlli: prima riga e passo (i tasti sono alti 14 px). */
export const CONTROLS_TABLE = { firstRowY: 38, rowStep: 14 } as const;
/** Righe di testo sotto la tabella dei controlli (combo, picchiata, salto). */
export const CONTROLS_NOTES_Y = [193, 204, 215] as const;

export interface ControlsRow {
  keyGroups: string[][];
  description: string;
}

export const CONTROLS_ROWS: ControlsRow[] = [
  { keyGroups: [["A", "D"], ["<", ">"]], description: "MUOVI" },
  { keyGroups: [["W"], ["^"]], description: "SALTA" },
  { keyGroups: [["J"]], description: "ATTACCO" },
  { keyGroups: [["K"]], description: "ATTACCO PESANTE" },
  { keyGroups: [["SHIFT SX"]], description: "SCHIVATA (COSTA STAMINA)" },
  { keyGroups: [["7", "8", "9", "0"], ["L"]], description: "MOSSE (L = 7)" },
  { keyGroups: [["S"], ["↓"]], description: "ABBASSATI" },
  { keyGroups: [["E"], ["Q"]], description: "E PRENDI, Q LASCIA (Q+1-4)" },
  { keyGroups: [["1", "2", "3", "4"]], description: "BORSA: USA IL POSTO" },
  { keyGroups: [["I"]], description: "EQUIPAGGIAMENTO" },
  { keyGroups: [["ESC"]], description: "PAUSA" },
];

/** Valutazione da 1 a 5 di una statistica (schermata di scelta del personaggio). */
export interface CharacterRating {
  label: string;
  value: number;
}

const clampRating = (value: number): number => Math.max(1, Math.min(5, Math.round(value)));

/**
 * Statistiche di un personaggio in "tacche" da 1 a 5, calcolate dai suoi valori (il cavaliere sta nel mezzo):
 * così cambiando CHARACTER_CONFIG la schermata di scelta si aggiorna da sola.
 */
export function getCharacterRatings(character: CharacterDefinition): CharacterRating[] {
  return [
    { label: "SALUTE", value: clampRating(character.maxHealth / 26) },
    { label: "VELOCITÀ", value: clampRating((character.movementSpeed - 56) / 8) },
    { label: "DANNO", value: clampRating(3 + (character.damageMultiplier - 1) * 6.7) },
    { label: "DIFESA", value: clampRating(3 + (1 - character.damageTakenMultiplier) * 10) },
    { label: "SCHIVATA", value: clampRating(5 - (character.dodgeCooldownMs - 450) / 300) },
  ];
}

/**
 * Schermate a tutto campo: titolo, controlli, selezione dei livelli e del personaggio, pausa, Game Over, vittoria.
 * I menu sono gestiti da MenuManager; qui c'è soprattutto il disegno.
 */
export class ScreenManager {
  private readonly menus: Partial<Record<GameStateName, MenuManager<MenuCommand>>> = {
    title: new MenuManager<MenuCommand>([
      { label: "NUOVA PARTITA", command: "newGame" },
      { label: (): string => `PERSONAGGIO: ${CHARACTER_CONFIG[this.latestData?.characterId ?? "knight"].name}`, command: "showCharacterSelect" },
      { label: "SCEGLI LIVELLO", command: "showLevelSelect" },
      { label: (): string => `DIFFICOLTÀ: ${this.latestData?.difficultyName ?? ""}`, command: "cycleDifficulty" },
      { label: "CONTROLLI", command: "showControls" },
      { label: "CANCELLA DATI", command: "showResetConfirm" },
    ]),
    // la prima voce è "no": un Invio di troppo non cancella niente
    confirmReset: new MenuManager<MenuCommand>([
      { label: "NO, TORNA INDIETRO", command: "backToTitle" },
      { label: "SÌ, CANCELLA TUTTO", command: "resetAllData" },
    ]),
    paused: new MenuManager<MenuCommand>([
      { label: "RIPRENDI", command: "resume" },
      { label: "ESCI AL TITOLO", command: "backToTitle" },
      // ultima voce: chi preme S e Invio per uscire al titolo trova la voce di sempre
      { label: "EQUIPAGGIAMENTO", command: "showEquipment" },
    ]),
    gameOver: new MenuManager<MenuCommand>([
      { label: "RIPROVA", command: "newGame" },
      { label: "TORNA AL TITOLO", command: "backToTitle" },
    ]),
    victory: new MenuManager<MenuCommand>([
      { label: "NUOVA PARTITA", command: "newGame" },
      { label: "TORNA AL TITOLO", command: "backToTitle" },
    ]),
  };
  private readonly backgroundRenderer = new BackgroundRenderer();
  private animationTimeSeconds = 0;
  /** Ultimi dati ricevuti dal motore (servono alle voci di menu che cambiano). */
  private latestData: ScreenData | null = null;
  /** Livello evidenziato nella schermata di selezione. */
  private selectedLevelIndex = 0;
  /** Avviso mostrato per qualche secondo sul titolo (es. "DATI CANCELLATI"). */
  private notice: { text: string; remainingSeconds: number } | null = null;
  /** Personaggio evidenziato nella schermata di scelta (null = parte da quello salvato). */
  private selectedCharacterIndex: number | null = null;

  /** Voce evidenziata nella bottega (l'ultima è "PROSEGUI"). */
  private shopIndex = 0;
  /** Cursore della schermata dell'equipaggiamento: riga 0 = armature e borsa, righe 1-2 = zaino. */
  private equipmentRow = 0;
  private equipmentColumn = 0;

  /** Casella scelta nella schermata dell'equipaggiamento. */
  public get selectedEquipmentCell(): EquipmentCell {
    if (this.equipmentRow === 0) {
      return this.equipmentColumn < ARMOR_SLOTS.length
        ? { section: "armor", slot: ARMOR_SLOTS[this.equipmentColumn]! }
        : { section: "bag", index: this.equipmentColumn - ARMOR_SLOTS.length };
    }
    return { section: "backpack", index: (this.equipmentRow - 1) * EQUIPMENT_LAYOUT.backpackColumns + this.equipmentColumn };
  }

  public get selectedShopIndex(): number {
    return this.shopIndex;
  }

  /** Personaggio evidenziato nella schermata di scelta. */
  public get selectedCharacterId(): CharacterId {
    return CHARACTER_ORDER[this.selectedCharacterIndex ?? 0] ?? "knight";
  }

  /** Id del livello scelto nella schermata di selezione. */
  public get selectedLevelId(): number {
    return this.latestData?.levels[this.selectedLevelIndex]?.id ?? 1;
  }

  constructor(private readonly spriteManager: SpriteManager) {}

  /** Fa avanzare le animazioni delle schermate (da chiamare a ogni frame). */
  public tick(deltaTimeSeconds: number): void {
    this.animationTimeSeconds += deltaTimeSeconds;
    if (this.notice !== null) {
      this.notice.remainingSeconds -= deltaTimeSeconds;
      if (this.notice.remainingSeconds <= 0) {
        this.notice = null;
      }
    }
  }

  /** Mostra un avviso sul titolo per qualche secondo. */
  public showNotice(text: string, durationSeconds = 2.5): void {
    this.notice = { text, remainingSeconds: durationSeconds };
  }

  /** Riporta il cursore alla prima voce (da chiamare a ogni cambio di stato). */
  public resetSelection(): void {
    Object.values(this.menus).forEach((menu) => menu?.reset());
    this.selectedLevelIndex = 0;
    this.selectedCharacterIndex = null;
    this.shopIndex = 0;
    this.equipmentRow = 0;
    this.equipmentColumn = 0;
  }

  /** Legge l'input e restituisce l'eventuale comando scelto dal giocatore. */
  public update(state: GameStateName, input: InputManager, data: ScreenData): MenuCommand | null {
    this.latestData = data;
    if (state === "controls") {
      return input.wasPressed("confirm") || input.wasPressed("pause") ? "backToTitle" : null;
    }
    if (state === "levelSelect") {
      return this.updateLevelSelect(input, data);
    }
    if (state === "characterSelect") {
      return this.updateCharacterSelect(input, data);
    }
    if (state === "confirmReset" && input.wasPressed("pause")) {
      return "backToTitle";
    }
    if (state === "shop") {
      // voci della bottega + "PROSEGUI" (si esce solo da lì: un Esc per sbaglio non fa partire il livello)
      this.shopIndex = ScreenManager.moveCursor(input, this.shopIndex, data.shopOffers.length + 1);
      if (input.wasPressed("confirm")) {
        return this.shopIndex < data.shopOffers.length ? "buyShopOffer" : "leaveShop";
      }
      return null;
    }
    if (state === "equipment") {
      return this.updateEquipment(input, data);
    }
    return this.menus[state]?.update(input) ?? null;
  }

  /**
   * Schermata dell'equipaggiamento (E4): frecce per scegliere la casella, Invio per usarla (indossare, togliere,
   * mettere nello zaino), Q per lasciarla a terra, I o Esc per chiudere.
   */
  private updateEquipment(input: InputManager, data: ScreenData): MenuCommand | null {
    const bagCount = data.equipment?.bag.length ?? 4;
    const capacity = data.equipment?.backpackCapacity ?? 12;
    const rowLength = (row: number): number => (row === 0 ? ARMOR_SLOTS.length + bagCount : Math.min(EQUIPMENT_LAYOUT.backpackColumns, capacity - (row - 1) * EQUIPMENT_LAYOUT.backpackColumns));
    const rowCount = 1 + Math.ceil(capacity / EQUIPMENT_LAYOUT.backpackColumns);
    if (input.wasPressed("menuLeft")) {
      this.equipmentColumn = (this.equipmentColumn - 1 + rowLength(this.equipmentRow)) % rowLength(this.equipmentRow);
    }
    if (input.wasPressed("menuRight")) {
      this.equipmentColumn = (this.equipmentColumn + 1) % rowLength(this.equipmentRow);
    }
    if (input.wasPressed("menuUp")) {
      this.equipmentRow = (this.equipmentRow - 1 + rowCount) % rowCount;
    }
    if (input.wasPressed("menuDown")) {
      this.equipmentRow = (this.equipmentRow + 1) % rowCount;
    }
    this.equipmentColumn = Math.min(this.equipmentColumn, rowLength(this.equipmentRow) - 1);
    if (input.wasPressed("confirm")) {
      return "equipmentUse";
    }
    if (input.wasPressed("dropItem")) {
      return "equipmentDrop";
    }
    return input.wasPressed("pause") || input.wasPressed("openEquipment") ? "closeEquipment" : null;
  }

  /** Cursore verticale circolare (W/S). */
  private static moveCursor(input: InputManager, index: number, count: number): number {
    if (input.wasPressed("menuUp")) {
      return (index - 1 + count) % count;
    }
    if (input.wasPressed("menuDown")) {
      return (index + 1) % count;
    }
    return index;
  }

  /** Scelta del personaggio: A/D (o W/S) cambia personaggio in modo circolare, Invio conferma, ESC annulla. */
  private updateCharacterSelect(input: InputManager, data: ScreenData): MenuCommand | null {
    const count = CHARACTER_ORDER.length;
    let index = this.selectedCharacterIndex ?? Math.max(0, CHARACTER_ORDER.indexOf(data.characterId));
    if (input.wasPressed("menuLeft") || input.wasPressed("menuUp")) {
      index = (index - 1 + count) % count;
    }
    if (input.wasPressed("menuRight") || input.wasPressed("menuDown")) {
      index = (index + 1) % count;
    }
    this.selectedCharacterIndex = index;
    if (input.wasPressed("confirm")) {
      // un personaggio bloccato non si sceglie (Fase 6)
      const characterId = CHARACTER_ORDER[index] ?? "knight";
      if (!data.unlockedCharacterIds.includes(characterId)) {
        this.showNotice(`BLOCCATO: ${CHARACTER_CONFIG[characterId].unlockText}`, 2);
        return null;
      }
      return "confirmCharacter";
    }
    return input.wasPressed("pause") ? "backToTitle" : null;
  }

  /** Selezione dei livelli: il cursore passa solo sui livelli sbloccati (in modo circolare). */
  private updateLevelSelect(input: InputManager, data: ScreenData): MenuCommand | null {
    const unlocked = data.levels.map((level, index) => (level.isUnlocked ? index : -1)).filter((index) => index >= 0);
    if (unlocked.length === 0) {
      return input.wasPressed("pause") ? "backToTitle" : null;
    }
    if (!unlocked.includes(this.selectedLevelIndex)) {
      this.selectedLevelIndex = unlocked[0]!;
    }
    const position = unlocked.indexOf(this.selectedLevelIndex);
    if (input.wasPressed("menuUp")) {
      this.selectedLevelIndex = unlocked[(position - 1 + unlocked.length) % unlocked.length]!;
    }
    if (input.wasPressed("menuDown")) {
      this.selectedLevelIndex = unlocked[(position + 1) % unlocked.length]!;
    }
    if (input.wasPressed("confirm")) {
      return "startSelectedLevel";
    }
    return input.wasPressed("pause") ? "backToTitle" : null;
  }

  public render(renderer: Renderer, state: GameStateName, data: ScreenData): void {
    this.latestData = data;
    switch (state) {
      case "title":
        this.renderTitle(renderer, data);
        break;
      case "controls":
        this.renderControls(renderer);
        break;
      case "levelSelect":
        this.renderLevelSelect(renderer, data);
        break;
      case "characterSelect":
        this.renderCharacterSelect(renderer, data);
        break;
      case "confirmReset":
        this.renderResetConfirm(renderer, data);
        break;
      case "shop":
        this.renderShop(renderer, data);
        break;
      case "equipment":
        this.renderEquipment(renderer, data);
        break;
      case "paused":
        this.renderPause(renderer);
        break;
      case "gameOver":
        this.renderGameOver(renderer, data);
        break;
      case "victory":
        this.renderVictory(renderer, data);
        break;
      case "playing":
        break;
    }
  }

  // -------------------------------------------------------------------------

  private renderTitle(renderer: Renderer, data: ScreenData): void {
    // notte nel castello, con lo sfondo che scorre piano
    this.backgroundRenderer.render(renderer, "castle", this.animationTimeSeconds * 14, this.animationTimeSeconds);
    const centerX = renderer.width / 2;
    this.drawFloor(renderer);
    // il personaggio scelto aspetta a sinistra del menu
    const knightFrame = getCharacterPreviewFrameId(data.characterId, Math.floor(this.animationTimeSeconds * 2) % 2 === 0 ? 1 : 2);
    this.spriteManager.drawSprite(renderer, knightFrame, centerX - 124, 200 - 30, false);

    this.drawLogo(renderer, centerX, 30);
    this.drawDivider(renderer, 62);
    drawOrnateFrame(renderer, centerX - 92, 68, 184, 34);
    renderer.drawText("Medieval Action Arcade", centerX, 74, PALETTE.stonePale, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText(`RECORD ${String(data.bestScore).padStart(6, "0")}`, centerX, 87, PALETTE.cyan, { align: "center", shadowColor: PALETTE.black });
    drawOrnateFrame(renderer, centerX - 84, 106, 168, 68);
    this.menus.title?.render(renderer, centerX, 112, 10);
    this.renderNotice(renderer, 190);
    renderer.drawText("W/S: scegli   INVIO: conferma", centerX, 222, PALETTE.lightGray, { align: "center", shadowColor: PALETTE.black });
  }

  /** Selezione dei livelli: elenco con ambientazione, boss e lucchetto per quelli non ancora raggiunti. */
  private renderLevelSelect(renderer: Renderer, data: ScreenData): void {
    const centerX = renderer.width / 2;
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.deepNavy, PALETTE.darkBlue, PALETTE.black]);
    this.drawGradientTitle(renderer, "SCEGLI LIVELLO", centerX, 12, 2, TITLE_GOLD_ROWS);
    this.drawDivider(renderer, 36);
    const rowHeight = 22;
    const listLeft = centerX - 120;
    data.levels.forEach((level, levelIndex) => {
      const rowY = 46 + levelIndex * rowHeight;
      const isSelected = levelIndex === this.selectedLevelIndex && level.isUnlocked;
      if (isSelected) {
        drawOrnateFrame(renderer, listLeft - 6, rowY - 4, 252, rowHeight - 2);
      }
      const [swatchLight, swatchDark] = THEME_SWATCHES[level.theme];
      renderer.fillRect(listLeft, rowY, 14, 11, PALETTE.black);
      if (level.isUnlocked) {
        renderer.fillVerticalGradient(listLeft + 1, rowY + 1, 12, 9, [swatchLight, swatchDark], 2);
      } else {
        renderer.fillRect(listLeft + 1, rowY + 1, 12, 9, PALETTE.slate);
        // lucchetto
        renderer.strokeRect(listLeft + 5, rowY + 2, 4, 4, PALETTE.gray);
        renderer.fillRect(listLeft + 4, rowY + 5, 6, 4, PALETTE.gray);
      }
      const nameColor = !level.isUnlocked ? PALETTE.slate : isSelected ? PALETTE.white : PALETTE.lightGray;
      const name = level.isUnlocked ? level.name.toUpperCase() : "? ? ? ? ?";
      renderer.drawText(`${level.id}`, listLeft + 22, rowY + 2, level.isUnlocked ? PALETTE.goldLight : PALETTE.slate, { shadowColor: PALETTE.black });
      renderer.drawText(name, listLeft + 34, rowY + 2, nameColor, { shadowColor: PALETTE.black });
      if (level.bossName !== null && level.isUnlocked) {
        this.spriteManager.drawSprite(renderer, "hudSkull", listLeft + 228, rowY + 1, false);
      }
    });
    renderer.drawText("W/S: scegli   INVIO: gioca   ESC: indietro", centerX, 220, PALETTE.gray, { align: "center" });
  }

  /**
   * Scelta del personaggio: i quattro personaggi in fila (quello evidenziato si muove) e, sotto, la scheda
   * di quello evidenziato: descrizione, statistiche in tacche, arma iniziale e tratto.
   */
  private renderCharacterSelect(renderer: Renderer, data: ScreenData): void {
    const centerX = renderer.width / 2;
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.deepNavy, PALETTE.darkBlue, PALETTE.black]);
    this.drawGradientTitle(renderer, "PERSONAGGIO", centerX, 10, 2, TITLE_GOLD_ROWS);
    this.drawDivider(renderer, 32);
    const selectedIndex = this.selectedCharacterIndex ?? Math.max(0, CHARACTER_ORDER.indexOf(data.characterId));
    const idleFrame = Math.floor(this.animationTimeSeconds * 2) % 2 === 0 ? 1 : 2;
    const columnWidth = renderer.width / CHARACTER_ORDER.length;
    CHARACTER_ORDER.forEach((characterId, index) => {
      const columnCenterX = Math.round(columnWidth * index + columnWidth / 2);
      const isSelected = index === selectedIndex;
      const isLocked = !data.unlockedCharacterIds.includes(characterId);
      if (isSelected) {
        // la cornice resta dentro la colonna (5 personaggi: colonne di 64 px)
        const frameWidth = Math.min(68, Math.floor(columnWidth) - 2);
        drawOrnateFrame(renderer, columnCenterX - Math.floor(frameWidth / 2), 38, frameWidth, 58);
      }
      const previewId = getCharacterPreviewFrameId(characterId, isSelected && !isLocked ? idleFrame : 1);
      if (isLocked) {
        // bloccato: solo la sagoma scura e un lucchetto
        this.spriteManager.drawSpriteSilhouette(renderer, previewId, columnCenterX - 12, 46, false, PALETTE.slate);
        renderer.strokeRect(columnCenterX - 3, 58, 6, 5, PALETTE.lightGray);
        renderer.fillRect(columnCenterX - 4, 62, 8, 6, PALETTE.lightGray);
      } else {
        this.spriteManager.drawSprite(renderer, previewId, columnCenterX - 12, 46, false);
      }
      const nameColor = isLocked ? PALETTE.slate : isSelected ? PALETTE.white : PALETTE.gray;
      renderer.drawText(CHARACTER_CONFIG[characterId].name, columnCenterX, 82, nameColor, {
        align: "center",
        shadowColor: PALETTE.black,
        rowColors: isSelected ? TITLE_GOLD_ROWS : undefined,
      });
    });

    const character = CHARACTER_CONFIG[CHARACTER_ORDER[selectedIndex] ?? "knight"];
    drawOrnateFrame(renderer, 24, 102, 272, 108);
    renderer.drawText(character.description, centerX, 109, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    getCharacterRatings(character).forEach((rating, rowIndex) => {
      const rowY = 124 + rowIndex * 11;
      renderer.drawText(rating.label, 44, rowY, PALETTE.lightGray, { shadowColor: PALETTE.black });
      for (let pip = 0; pip < 5; pip++) {
        const pipX = 120 + pip * 10;
        renderer.fillRect(pipX, rowY, 8, 6, PALETTE.black);
        renderer.fillRect(pipX + 1, rowY + 1, 6, 4, pip < rating.value ? PALETTE.goldLight : PALETTE.slate);
        if (pip < rating.value) {
          renderer.fillRect(pipX + 1, rowY + 1, 6, 1, PALETTE.yellow);
        }
      }
    });
    const weapon = WEAPON_CONFIG[character.startingWeaponId];
    this.spriteManager.drawSprite(renderer, weapon.iconSpriteId, 196, 126, false);
    renderer.drawText(weapon.name.toUpperCase(), 222, 131, PALETTE.goldLight, { shadowColor: PALETTE.black });
    renderer.drawText(`${character.maxHealth} HP`, 222, 145, PALETTE.lightGray, { shadowColor: PALETTE.black });
    if (character.maxMana > 0) {
      renderer.drawText(`${character.maxMana} MANA`, 222, 157, PALETTE.lightBlue, { shadowColor: PALETTE.black });
    }
    if (data.unlockedCharacterIds.includes(character.id)) {
      renderer.drawText(character.trait, centerX, 184, PALETTE.cyan, { align: "center", shadowColor: PALETTE.black });
    } else {
      renderer.drawText(`BLOCCATO: ${character.unlockText}`, centerX, 184, PALETTE.orange, { align: "center", shadowColor: PALETTE.black });
    }
    this.renderNotice(renderer, 212);
    renderer.drawText("A/D: scegli   INVIO: conferma   ESC: indietro", centerX, 222, PALETTE.gray, { align: "center" });
  }

  /** Avviso temporaneo (acquisti, personaggio bloccato, dati cancellati), centrato. */
  private renderNotice(renderer: Renderer, y: number): void {
    if (this.notice !== null) {
      renderer.drawText(this.notice.text, renderer.width / 2, y, PALETTE.lightGreen, { align: "center", shadowColor: PALETTE.black });
    }
  }

  /** Riga di un elenco con cursore (bottega): riquadro dorato sulla voce scelta. */
  private drawListRow(renderer: Renderer, rowY: number, isSelected: boolean): void {
    if (isSelected) {
      drawOrnateFrame(renderer, 30, rowY - 3, renderer.width - 60, 22);
    }
  }

  /**
   * Bottega tra un livello e l'altro (Fase 6): monete in alto, le voci con icona, descrizione e prezzo
   * (rosso se non bastano le monete), poi "PROSEGUI".
   */
  private renderShop(renderer: Renderer, data: ScreenData): void {
    const centerX = renderer.width / 2;
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.wine, PALETTE.darkBlue, PALETTE.black]);
    this.drawGradientTitle(renderer, "BOTTEGA", centerX, 10, 2, TITLE_GOLD_ROWS);
    this.drawDivider(renderer, 32);
    this.spriteManager.drawSprite(renderer, "itemCoin", centerX - 30, 38, false);
    renderer.drawText(`MONETE ${data.coins}`, centerX - 18, 39, PALETTE.goldLight, { shadowColor: PALETTE.black });
    data.shopOffers.forEach((offer, index) => {
      const rowY = 54 + index * 24;
      this.drawListRow(renderer, rowY, index === this.shopIndex);
      const iconY = offer.iconSize === 16 ? rowY - 1 : rowY + 3;
      this.spriteManager.drawSprite(renderer, offer.iconSpriteId, offer.iconSize === 16 ? 38 : 42, iconY, false, false, offer.iconVariant ?? null);
      const nameColor = offer.isSoldOut ? PALETTE.slate : (offer.nameColor ?? PALETTE.white);
      renderer.drawText(offer.name, 60, rowY, nameColor, { shadowColor: PALETTE.black });
      const classLine = offer.classLine ?? null;
      const descriptionColor = classLine === null || offer.isSoldOut ? PALETTE.lightGray : WEAPON_AFFINITY_TONE_COLORS[classLine.tone];
      renderer.drawText(classLine === null ? offer.description : classLine.text, 60, rowY + 9, descriptionColor, { shadowColor: PALETTE.black });
      if (offer.isSoldOut) {
        renderer.drawText("ESAURITO", renderer.width - 38, rowY + 4, PALETTE.slate, { align: "right" });
      } else {
        const priceColor = offer.price <= data.coins ? PALETTE.goldLight : PALETTE.red;
        renderer.drawText(String(offer.price), renderer.width - 50, rowY + 4, priceColor, { align: "right", shadowColor: PALETTE.black });
        this.spriteManager.drawSprite(renderer, "itemCoin", renderer.width - 46, rowY + 3, false);
      }
    });
    const continueY = 54 + data.shopOffers.length * 24 + 4;
    const isContinueSelected = this.shopIndex === data.shopOffers.length;
    this.drawListRow(renderer, continueY, isContinueSelected);
    renderer.drawText("PROSEGUI", centerX, continueY + 4, isContinueSelected ? PALETTE.white : PALETTE.gray, {
      align: "center",
      shadowColor: PALETTE.black,
      rowColors: isContinueSelected ? TITLE_GOLD_ROWS : undefined,
    });
    this.renderNotice(renderer, 206);
    renderer.drawText("W/S: scegli   INVIO: compra o prosegui", centerX, 222, PALETTE.gray, { align: "center" });
  }

  /**
   * Schermata dell'equipaggiamento (E4), sopra il gioco fermo: in alto armature indossate e borsa, poi lo zaino e il
   * riassunto dei bonus, in basso la scheda della casella scelta (nome nel colore della rarità, statistiche e, per gli
   * oggetti dello zaino, il confronto con quello indossato: in verde se migliora, in rosso se peggiora).
   */
  private renderEquipment(renderer: Renderer, data: ScreenData): void {
    const view = data.equipment;
    renderer.drawDitherOverlay();
    drawOrnateFrame(renderer, 6, 4, renderer.width - 12, renderer.height - 8);
    this.drawGradientTitle(renderer, "EQUIPAGGIAMENTO", renderer.width / 2, 10, 2, TITLE_GOLD_ROWS);
    if (view === undefined) {
      return;
    }
    const layout = EQUIPMENT_LAYOUT;
    const selected = this.selectedEquipmentCell;
    renderer.drawText("ARMATURA", layout.armorX, 30, PALETTE.stonePale, { shadowColor: PALETTE.black });
    renderer.drawText("BORSA", layout.bagX, 30, PALETTE.stonePale, { shadowColor: PALETTE.black });
    ARMOR_SLOTS.forEach((slot, index) => {
      const x = layout.armorX + index * layout.cellStep;
      const item = view.armor[slot];
      this.drawEquipmentCell(renderer, x, layout.topRowY, item, selected.section === "armor" && selected.slot === slot, false);
      if (item === null) {
        // posto vuoto: la sagoma del pezzo
        this.spriteManager.drawSpriteSilhouette(renderer, ARMOR_ICON_BY_SLOT[slot], x + 2, layout.topRowY + 2, false, PALETTE.slate);
      }
    });
    view.bag.forEach((slot, index) => {
      const x = layout.bagX + index * layout.cellStep;
      const isSelected = selected.section === "bag" && selected.index === index;
      if (slot?.kind === "potion") {
        this.drawEquipmentCell(renderer, x, layout.topRowY, null, isSelected, false);
        this.spriteManager.drawSprite(renderer, slot.iconSpriteId, x + 6, layout.topRowY + 6, false);
        renderer.drawText(String(slot.count), x + layout.cellSize - 2, layout.topRowY + layout.cellSize - 8, PALETTE.white, { align: "right", shadowColor: PALETTE.black });
      } else {
        this.drawEquipmentCell(renderer, x, layout.topRowY, slot?.item ?? null, isSelected, slot?.isEquipped === true);
      }
      renderer.drawText(String(index + 1), x + 2, layout.topRowY + 2, slot !== null && slot.kind === "weapon" && slot.isEquipped ? PALETTE.goldLight : PALETTE.stonePale, { shadowColor: PALETTE.black });
    });
    view.activeSets.forEach((line, index) => {
      renderer.drawText(line, 200, 34 + index * 10, PALETTE.cyan, { shadowColor: PALETTE.black });
    });
    renderer.drawText(`ZAINO ${view.backpack.length}/${view.backpackCapacity}`, layout.backpackX, 66, PALETTE.stonePale, { shadowColor: PALETTE.black });
    for (let index = 0; index < view.backpackCapacity; index++) {
      const x = layout.backpackX + (index % layout.backpackColumns) * layout.cellStep;
      const y = layout.backpackY + Math.floor(index / layout.backpackColumns) * layout.cellStep;
      this.drawEquipmentCell(renderer, x, y, view.backpack[index] ?? null, selected.section === "backpack" && selected.index === index, false);
    }
    this.renderEquipmentSummary(renderer, view.bonuses);
    this.renderEquipmentCard(renderer, view, selected);
    this.renderNotice(renderer, 116);
    renderer.drawText("FRECCE: scegli  INVIO: usa  Q: lascia  I: chiudi", renderer.width / 2, 220, PALETTE.gray, { align: "center" });
  }

  /** Casella con l'icona dell'oggetto (colori della rarità), lineetta della rarità; cornice bianca sul cursore. */
  private drawEquipmentCell(renderer: Renderer, x: number, y: number, item: ItemInstance | null, isSelected: boolean, isEquipped: boolean): void {
    const size = EQUIPMENT_LAYOUT.cellSize;
    renderer.fillRect(x + 1, y + 1, size - 2, size - 2, PALETTE.black);
    renderer.strokeRect(x, y, size, size, isEquipped ? PALETTE.goldLight : PALETTE.gray);
    if (item !== null) {
      this.spriteManager.drawSprite(renderer, getItemIconSpriteId(item), x + 2, y + 2, false, false, getItemIconVariant(item));
      if (item.rarity !== "common") {
        renderer.fillRect(x + 3, y + size - 3, size - 6, 1, RARITY_CONFIG[item.rarity].color);
      }
    }
    if (isSelected) {
      const isBlinkOn = Math.floor(this.animationTimeSeconds * 4) % 2 === 0;
      renderer.strokeRect(x - 2, y - 2, size + 4, size + 4, isBlinkOn ? PALETTE.white : PALETTE.goldLight);
    }
  }

  /** Riassunto dei bonus di tutto l'equipaggiamento (a destra dello zaino). */
  private renderEquipmentSummary(renderer: Renderer, bonuses: EquipmentBonuses): void {
    const percent = (value: number): string => `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
    const lines: string[] = [
      `DANNO ${percent(bonuses.damageMultiplier - 1)}`,
      `DIFESA ${Math.round((1 - bonuses.damageTakenMultiplier) * 100)}%`,
      `VELOCITÀ ${percent(bonuses.movementSpeedMultiplier - 1)}`,
      `SALUTE +${bonuses.maxHealth}  STAMINA +${bonuses.maxStamina}`,
    ];
    if (bonuses.recoveryMultiplier < 1) {
      lines.push(`RECUPERO -${Math.round((1 - bonuses.recoveryMultiplier) * 100)}%`);
    }
    if (bonuses.lifeStealFraction > 0) {
      lines.push(`FURTO DI VITA ${Math.round(bonuses.lifeStealFraction * 100)}%`);
    }
    renderer.drawText("BONUS", 172, 66, PALETTE.stonePale, { shadowColor: PALETTE.black });
    lines.slice(0, 5).forEach((line, index) => {
      renderer.drawText(line, 172, 77 + index * 9, PALETTE.lightGray, { shadowColor: PALETTE.black });
    });
  }

  /** Scheda della casella scelta: nome, rarità e tipo, statistiche (con il confronto per gli oggetti dello zaino). */
  private renderEquipmentCard(renderer: Renderer, view: EquipmentView, cell: EquipmentCell): void {
    const top = EQUIPMENT_LAYOUT.cardY;
    drawOrnateFrame(renderer, 12, top, renderer.width - 24, 88);
    let item: ItemInstance | null = null;
    let comparedWith: ItemInstance | null = null;
    let hint = "";
    if (cell.section === "armor") {
      item = view.armor[cell.slot];
      hint = item === null ? `${ARMOR_SLOT_NAMES[cell.slot]}: VUOTO` : "INVIO: TOGLI (NELLO ZAINO)";
    } else if (cell.section === "bag") {
      const slot = view.bag[cell.index] ?? null;
      if (slot?.kind === "weapon") {
        item = slot.item;
        hint = "INVIO: METTI NELLO ZAINO";
      } else {
        hint = slot?.kind === "potion" ? `POZIONI: ${slot.count}` : "POSTO VUOTO";
      }
    } else {
      item = view.backpack[cell.index] ?? null;
      hint = item === null ? "ZAINO: POSTO VUOTO" : "INVIO: INDOSSA / IMPUGNA";
      if (item !== null) {
        comparedWith = ScreenManager.findEquippedCounterpart(item, view);
      }
    }
    if (item === null) {
      renderer.drawText(hint, renderer.width / 2, top + 38, PALETTE.gray, { align: "center", shadowColor: PALETTE.black });
      return;
    }
    const rarity = RARITY_CONFIG[item.rarity];
    renderer.drawText(getItemName(item), 22, top + 8, rarity.color, { shadowColor: PALETTE.black });
    const slotName = item.kind === "armor" ? ARMOR_SLOT_NAMES[ARMOR_CONFIG[item.baseId].slot] : "ARMA";
    renderer.drawText(`${rarity.name} - ${getItemBaseName(item)} (${slotName})  PESO ${getItemWeight(item)}`, 22, top + 19, PALETTE.lightGray, { shadowColor: PALETTE.black });
    const differences = comparedWith === null && cell.section !== "backpack" ? null : compareItemStats(item, comparedWith);
    const lines = describeItemStats(item);
    // bonus e malus della classe per le armi (Classi Fase 3): prime righe della griglia, nei colori del tono. Le statistiche
    // non devono sparire: se non c'è posto per una riga per voce, una sola riga riassuntiva; se manca anche quella, niente
    const classLine = item.kind === "weapon" ? describeWeaponAffinity(getWeaponAffinity(view.characterId, item.baseId), item.baseId) : null;
    const gridSize = 8;
    let classTexts: string[] = [];
    if (classLine !== null) {
      const fullTexts = classLine.tone === "forbidden" ? [classLine.text] : classLine.parts.map((part) => `CLASSE ${part}`);
      const summary = classLine.tone === "forbidden" ? classLine.text : classLine.tone === "bonus" ? "CLASSE: BONUS" : "CLASSE: MALUS";
      classTexts = lines.length + fullTexts.length <= gridSize ? fullTexts : lines.length < gridSize ? [summary] : [];
    }
    const classColor = classLine === null ? PALETTE.white : WEAPON_AFFINITY_TONE_COLORS[classLine.tone];
    const gridLines = [
      ...classTexts.map((text) => ({ key: "", text, color: classColor })),
      ...lines.map((line) => ({ key: line.key, text: line.text === "" ? line.label : `${line.label} ${line.text}`, color: PALETTE.white })),
    ];
    gridLines.slice(0, gridSize).forEach((line, index) => {
      const x = index < 4 ? 22 : 164;
      const y = top + 32 + (index % 4) * 10;
      const text = line.text;
      renderer.drawText(text, x, y, line.color, { shadowColor: PALETTE.black });
      const difference = line.key === "" ? 0 : (differences?.get(line.key) ?? 0);
      if (differences !== null && difference !== 0) {
        const differenceText = `(${difference > 0 ? "+" : ""}${difference})`;
        renderer.drawText(differenceText, x + measureTextWidth(text, 1) + 4, y, difference > 0 ? PALETTE.lightGreen : PALETTE.red, { shadowColor: PALETTE.black });
      }
    });
    if (gridLines.length === 0) {
      renderer.drawText("NESSUN BONUS", 22, top + 32, PALETTE.gray, { shadowColor: PALETTE.black });
    }
    const unique = item.uniqueId === undefined ? undefined : getUniqueItemDefinition(item.uniqueId);
    const footer = comparedWith !== null ? `AL POSTO DI: ${getItemName(comparedWith)}` : (unique?.description ?? hint);
    renderer.drawText(footer, 22, top + 74, comparedWith !== null ? PALETTE.stonePale : unique !== undefined ? PALETTE.cyan : PALETTE.gray, { shadowColor: PALETTE.black });
  }

  /** L'oggetto indossato con cui confrontare un oggetto dello zaino: stesso posto d'armatura, o arma dello stesso tipo, o arma in mano. */
  private static findEquippedCounterpart(item: ItemInstance, view: EquipmentView): ItemInstance | null {
    if (item.kind === "armor") {
      return view.armor[ARMOR_CONFIG[item.baseId].slot];
    }
    const weapons = view.bag.flatMap((slot) => (slot?.kind === "weapon" ? [slot] : []));
    return weapons.find((slot) => slot.item.baseId === item.baseId)?.item ?? weapons.find((slot) => slot.isEquipped)?.item ?? null;
  }

  /** Conferma prima di cancellare record e progressi: la voce predefinita è "no". */
  private renderResetConfirm(renderer: Renderer, data: ScreenData): void {
    this.renderTitle(renderer, data);
    renderer.drawDitherOverlay();
    const centerX = renderer.width / 2;
    drawOrnateFrame(renderer, centerX - 110, 60, 220, 120);
    this.drawGradientTitle(renderer, "CANCELLA DATI", centerX, 70, 2, TITLE_GOLD_ROWS);
    renderer.drawText("Record, livelli raggiunti,", centerX, 98, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText("personaggio e difficoltà.", centerX, 109, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText("Non si può annullare.", centerX, 122, PALETTE.orange, { align: "center", shadowColor: PALETTE.black });
    this.menus.confirmReset?.render(renderer, centerX, 142, 14);
  }

  private renderControls(renderer: Renderer): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.deepNavy, PALETTE.darkBlue, PALETTE.black]);
    this.drawGradientTitle(renderer, "CONTROLLI", renderer.width / 2, 12, 2, TITLE_GOLD_ROWS);
    this.drawDivider(renderer, 36);
    // la tabella (larga 256 px) è centrata nello schermo
    const tableLeft = (renderer.width - 256) / 2;
    CONTROLS_ROWS.forEach((row, rowIndex) => {
      const rowY = CONTROLS_TABLE.firstRowY + rowIndex * CONTROLS_TABLE.rowStep;
      let cursorX = tableLeft + 14;
      row.keyGroups.forEach((group, groupIndex) => {
        if (groupIndex > 0) {
          renderer.drawText("o", cursorX + 3, rowY + 3, PALETTE.gray);
          cursorX += 14;
        }
        group.forEach((keyLabel) => {
          cursorX += this.drawKeyCap(renderer, keyLabel, cursorX, rowY) + 3;
        });
      });
      renderer.drawText(row.description, tableLeft + 142, rowY + 3, PALETTE.white, { shadowColor: PALETTE.black });
    });
    renderer.drawText("COMBO: J x3 o J, K (secondo l'arma)", renderer.width / 2, CONTROLS_NOTES_Y[0], PALETTE.orange, { align: "center", shadowColor: PALETTE.wine });
    renderer.drawText("In aria: K = colpo in picchiata (rimbalza)", renderer.width / 2, CONTROLS_NOTES_Y[1], PALETTE.orange, { align: "center", shadowColor: PALETTE.wine });
    renderer.drawText("Tieni premuto SALTA: salto più alto", renderer.width / 2, CONTROLS_NOTES_Y[2], PALETTE.lightGray, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText("INVIO: indietro", renderer.width / 2, 225, PALETTE.gray, { align: "center" });
  }

  private renderPause(renderer: Renderer): void {
    const boxX = renderer.width / 2 - 76;
    renderer.drawDitherOverlay();
    drawOrnateFrame(renderer, boxX, 70, 152, 106);
    this.drawGradientTitle(renderer, "PAUSA", renderer.width / 2, 82, 2, TITLE_GOLD_ROWS);
    this.menus.paused?.render(renderer, renderer.width / 2, 112);
    renderer.drawText("ESC: riprendi", renderer.width / 2, 160, PALETTE.gray, { align: "center" });
  }

  private renderGameOver(renderer: Renderer, data: ScreenData): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, renderer.height, [PALETTE.black, PALETTE.wine, PALETTE.black]);
    this.drawGradientTitle(renderer, "GAME OVER", renderer.width / 2, 52, 3, [
      PALETTE.orange,
      PALETTE.red,
      PALETTE.red,
      PALETTE.red,
      PALETTE.purple,
      PALETTE.purple,
      PALETTE.wine,
    ]);
    this.drawDivider(renderer, 90);
    this.renderResults(renderer, data, 104);
    drawOrnateFrame(renderer, renderer.width / 2 - 76, 156, 152, 40);
    this.menus.gameOver?.render(renderer, renderer.width / 2, 164);
  }

  private renderVictory(renderer: Renderer, data: ScreenData): void {
    this.backgroundRenderer.render(renderer, "castle", this.animationTimeSeconds * 20, this.animationTimeSeconds);
    this.drawFloor(renderer);
    const boxX = renderer.width / 2 - 100;
    drawOrnateFrame(renderer, boxX, 26, 200, 182);
    this.drawGradientTitle(renderer, "VITTORIA!", renderer.width / 2, 40, 3, TITLE_GOLD_ROWS);
    renderer.drawText("L'Ombra è sconfitta.", renderer.width / 2, 72, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText("Il regno è salvo!", renderer.width / 2, 84, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    this.drawDivider(renderer, 102, renderer.width / 2 - 88);
    this.renderResults(renderer, data, 114);
    this.menus.victory?.render(renderer, renderer.width / 2, 164);
  }

  /** Punteggio e record (con scritta lampeggiante se nuovo). */
  private renderResults(renderer: Renderer, data: ScreenData, startY: number): void {
    const centerX = renderer.width / 2;
    renderer.drawText(`PUNTI ${String(data.score).padStart(6, "0")}`, centerX, startY, PALETTE.goldLight, { align: "center", shadowColor: PALETTE.black });
    if (data.isNewRecord) {
      const recordColor = cycleRampColor(PALETTE_RAMPS.fire.slice(2), this.animationTimeSeconds, 10, 0, "pingPong");
      renderer.drawText("NUOVO RECORD!", centerX, startY + 18, recordColor, { align: "center", shadowColor: PALETTE.black });
    } else {
      renderer.drawText(`RECORD ${String(data.bestScore).padStart(6, "0")}`, centerX, startY + 18, PALETTE.lightGray, { align: "center", shadowColor: PALETTE.black });
    }
  }

  // --- elementi grafici ------------------------------------------------------

  /** Logo del titolo: lettere grandi con riempimento metallico a fasce e doppia ombra. */
  private drawLogo(renderer: Renderer, centerX: number, y: number): void {
    const scale = 3;
    renderer.drawText("IRON & SHADOW", centerX + 2, y + 2, PALETTE.black, { scale, align: "center" });
    renderer.drawText("IRON & SHADOW", centerX + 1, y + 1, PALETTE.wine, { scale, align: "center" });
    renderer.drawText("IRON & SHADOW", centerX, y, PALETTE.goldLight, { scale, align: "center", rowColors: TITLE_GOLD_ROWS });
    // scintilla che attraversa il logo
    const sparkleX = Math.round(centerX - 120 + ((this.animationTimeSeconds * 60) % 300));
    if (sparkleX < centerX + 118) {
      renderer.fillRect(sparkleX, y + 2, 1, 5, PALETTE.white);
      renderer.fillRect(sparkleX - 2, y + 4, 5, 1, PALETTE.white);
    }
  }

  /** Titolo centrato con riempimento a fasce (rowColors) e ombra. */
  private drawGradientTitle(renderer: Renderer, text: string, centerX: number, y: number, scale: number, rowColors: readonly string[]): void {
    renderer.drawText(text, centerX, y, rowColors[0] ?? PALETTE.white, { scale, align: "center", shadowColor: PALETTE.black, rowColors });
  }

  /** Pavimento di pietra sotto le schermate con sfondo (titolo, vittoria). */
  private drawFloor(renderer: Renderer): void {
    renderer.fillRect(0, 200, renderer.width, 40, PALETTE.stoneShadow);
    renderer.fillRect(0, 200, renderer.width, 1, PALETTE.stonePale);
    renderer.fillRect(0, 201, renderer.width, 2, PALETTE.stoneLight);
    for (let rowY = 211; rowY < 240; rowY += 9) {
      renderer.fillRect(0, rowY, renderer.width, 1, PALETTE.stoneDark);
      const offset = ((rowY - 211) / 9) % 2 === 0 ? 0 : 8;
      for (let jointX = offset; jointX < renderer.width; jointX += 16) {
        renderer.fillRect(jointX, rowY - 8, 1, 8, PALETTE.stoneDark);
        renderer.fillRect(jointX + 1, rowY - 8, 1, 8, PALETTE.stone);
      }
    }
    renderer.fillDitheredOverlay(0, 203, renderer.width, 37, PALETTE.black, 4);
  }

  /** Linea decorativa dorata con gemma centrale; "margin" = distanza dai bordi dello schermo. */
  private drawDivider(renderer: Renderer, y: number, margin = 40): void {
    const centerX = renderer.width / 2;
    const lineLength = centerX - margin - 6;
    renderer.fillRect(margin, y, lineLength, 1, PALETTE.gold);
    renderer.fillRect(centerX + 6, y, lineLength, 1, PALETTE.gold);
    renderer.fillRect(margin, y + 1, lineLength, 1, PALETTE.bronze);
    renderer.fillRect(centerX + 6, y + 1, lineLength, 1, PALETTE.bronze);
    renderer.fillRect(centerX - 1, y - 2, 3, 5, PALETTE.red);
    renderer.fillRect(centerX - 2, y - 1, 5, 3, PALETTE.red);
    renderer.fillRect(centerX - 1, y - 1, 1, 1, PALETTE.orange);
  }

  /** Disegna un tasto in rilievo (riquadro con il simbolo). Restituisce la larghezza usata. */
  private drawKeyCap(renderer: Renderer, label: string, x: number, y: number): number {
    const width = measureTextWidth(label, 1) + 9;
    renderer.fillRect(x, y, width, 14, PALETTE.black);
    renderer.fillVerticalGradient(x + 1, y + 1, width - 2, 11, [PALETTE.stonePale, PALETTE.stoneLight, PALETTE.stone], 2);
    renderer.fillRect(x + 1, y + 12, width - 2, 1, PALETTE.stoneShadow);
    renderer.fillRect(x + 1, y + 1, width - 2, 1, PALETTE.white);
    renderer.drawText(label, x + 5, y + 3, PALETTE.black);
    return width;
  }
}
