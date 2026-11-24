import { PALETTE } from "../config/gameConfig";
import type { Renderer } from "../rendering/Renderer";
import type { SpriteColorVariant, SpriteManager } from "../rendering/SpriteManager";

/** Dati mostrati dall'HUD (il motore li compone a ogni frame). */
export interface HUDData {
  health: number;
  maxHealth: number;
  /** Stamina (Fase 5): barra verde sotto la salute. */
  stamina: number;
  maxStamina: number;
  /** Abilità (tasto L): ricarica che manca (1 = appena usata), pronta (ricarica finita e stamina sufficiente), in uso (scudo alzato). */
  ability: { cooldownFraction: number; isReady: boolean; isActive: boolean };
  lives: number;
  score: number;
  collectibles: number;
  /** Monete della partita (Fase 6), da spendere nella bottega. */
  coins: number;
  levelNumber: number;
  /**
   * Posti della borsa, in ordine (null = vuoto): icona (16 px le armi, 8 px le pozioni), quantità
   * (pozioni o munizioni; null per le armi senza munizioni) e se è l'arma in mano. Disegnati sotto il
   * pannello, a destra, con il tasto numerico di ognuno. Le armi hanno i colori della loro rarità (iconVariant) e,
   * se non sono Comuni, una lineetta del colore della rarità sotto l'icona (rarityColor).
   */
  bag: Array<{ iconSpriteId: string; iconVariant: SpriteColorVariant | null; rarityColor: string | null; iconSize: 8 | 16; count: number | null; isEquipped: boolean } | null>;
  /** Power-up attivi: icona, colore e frazione di tempo che resta (1 = appena preso). */
  powerUps: Array<{ iconSpriteId: string; color: string; remainingFraction: number }>;
  boss: {
    name: string;
    health: number;
    maxHealth: number;
    /** Soglie (in %) in cui cambia fase: mostrate come tacche sulla barra. */
    phaseMarkerPercents: number[];
    phaseIndex: number;
  } | null;
}

/** Altezza (px) della barra superiore dell'HUD (bordo dorato compreso). */
const HUD_HEIGHT = 24;
/** La barra della salute ha sempre 10 segmenti, qualunque sia la salute massima. */
export const HEALTH_SEGMENT_COUNT = 10;
/** Geometria di ogni segmento della salute (il rettangolo principale, nel colore di riempimento). */
export const HEALTH_SEGMENT_GEOMETRY = { firstX: 19, stepX: 6, y: 4, width: 5, height: 7 } as const;
const LOW_HEALTH_PERCENT = 30;
/** Barra della stamina (a destra delle vite) e riquadro dell'abilità (tasto L) subito dopo. */
export const STAMINA_BAR_GEOMETRY = { x: 36, y: 15, width: 40, height: 4 } as const;
export const ABILITY_BOX_GEOMETRY = { x: 80, y: 12, size: 10 } as const;
/** Riquadri della borsa sotto il pannello, a destra: lato (cornice compresa) e distanza tra i riquadri. */
export const BAG_SLOT_GEOMETRY = { size: 20, step: 22, rightMargin: 4, y: HUD_HEIGHT + 3 } as const;

/**
 * HUD di gioco in stile 16 bit: pannello metallico con bordo dorato, cuore e barra della salute
 * a segmenti ombreggiati, vite, livello, punteggio, gemme e barra del boss con teschio.
 * Contiene anche i riquadri dei messaggi (inizio e fine livello).
 */
export class HUDManager {
  public render(renderer: Renderer, spriteManager: SpriteManager, data: HUDData, timeSeconds: number): void {
    this.renderPanel(renderer);
    this.renderHealth(renderer, spriteManager, data, timeSeconds);
    this.renderLives(renderer, spriteManager, data.lives);
    this.renderStaminaAndAbility(renderer, data, timeSeconds);
    renderer.drawText(`LIVELLO ${data.levelNumber}`, renderer.width / 2, 8, PALETTE.stonePale, { align: "center", shadowColor: PALETTE.black });
    renderer.drawText(String(data.score).padStart(6, "0"), renderer.width - 6, 3, PALETTE.goldLight, {
      align: "right",
      shadowColor: PALETTE.black,
      rowColors: [PALETTE.cream, PALETTE.yellow, PALETTE.yellow, PALETTE.goldLight, PALETTE.goldLight, PALETTE.gold, PALETTE.gold],
    });
    // monete (Fase 6) a sinistra delle gemme
    spriteManager.drawSprite(renderer, "itemCoin", renderer.width - 80, 13, false);
    renderer.drawText(`x${data.coins}`, renderer.width - 42, 13, PALETTE.goldLight, { align: "right", shadowColor: PALETTE.black });
    spriteManager.drawSprite(renderer, "itemGem", renderer.width - 34, 13, false);
    renderer.drawText(`x${data.collectibles}`, renderer.width - 6, 13, PALETTE.cyan, { align: "right", shadowColor: PALETTE.black });
    this.renderPowerUps(renderer, spriteManager, data.powerUps, timeSeconds);
    this.renderBag(renderer, spriteManager, data.bag);
    if (data.boss !== null) {
      this.renderBossBar(renderer, spriteManager, data.boss);
    }
  }

  /** Power-up attivi sotto il pannello: icona e barra del tempo che resta (lampeggia quando sta per finire). */
  private renderPowerUps(renderer: Renderer, spriteManager: SpriteManager, powerUps: HUDData["powerUps"], timeSeconds: number): void {
    powerUps.forEach((powerUp, powerUpIndex) => {
      const slotX = 5 + powerUpIndex * 30;
      const slotY = HUD_HEIGHT + 4;
      renderer.fillRect(slotX - 1, slotY - 1, 28, 10, PALETTE.black);
      spriteManager.drawSprite(renderer, powerUp.iconSpriteId, slotX, slotY, false);
      const isExpiring = powerUp.remainingFraction < 0.2 && Math.floor(timeSeconds * 6) % 2 === 0;
      const barWidth = Math.max(1, Math.round(16 * powerUp.remainingFraction));
      renderer.fillRect(slotX + 10, slotY + 3, 16, 3, PALETTE.slate);
      renderer.fillRect(slotX + 10, slotY + 3, barWidth, 3, isExpiring ? PALETTE.white : powerUp.color);
    });
  }

  /** Riquadro centrato con titolo e righe di testo (messaggi di livello). */
  public renderMessageBox(renderer: Renderer, title: string, lines: string[]): void {
    const boxWidth = 200;
    const boxHeight = 24 + lines.length * 12;
    const boxX = Math.round((renderer.width - boxWidth) / 2);
    const boxY = Math.round(100 - boxHeight / 2);
    drawOrnateFrame(renderer, boxX, boxY, boxWidth, boxHeight);
    renderer.drawText(title, renderer.width / 2, boxY + 8, PALETTE.goldLight, {
      align: "center",
      shadowColor: PALETTE.wine,
      rowColors: TITLE_GOLD_ROWS,
    });
    lines.forEach((line, lineIndex) => {
      renderer.drawText(line, renderer.width / 2, boxY + 23 + lineIndex * 12, PALETTE.white, { align: "center", shadowColor: PALETTE.black });
    });
  }

  /** Pannello metallico a fasce con bordo dorato e ombra a retino sotto. */
  private renderPanel(renderer: Renderer): void {
    renderer.fillVerticalGradient(0, 0, renderer.width, HUD_HEIGHT - 2, [PALETTE.slate, PALETTE.darkBlue, PALETTE.black], 4);
    renderer.fillRect(0, 0, renderer.width, 1, PALETTE.gray);
    renderer.fillRect(0, HUD_HEIGHT - 2, renderer.width, 1, PALETTE.goldLight);
    renderer.fillRect(0, HUD_HEIGHT - 1, renderer.width, 1, PALETTE.bronze);
    renderer.fillDitheredOverlay(0, HUD_HEIGHT, renderer.width, 2, PALETTE.black, 8);
  }

  /** Cuore e salute a 10 segmenti ombreggiati; lampeggia quando è bassa. */
  private renderHealth(renderer: Renderer, spriteManager: SpriteManager, data: HUDData, timeSeconds: number): void {
    spriteManager.drawSprite(renderer, "hudHeart", 5, 3, false);
    const geometry = HEALTH_SEGMENT_GEOMETRY;
    const healthPercent = (data.health / data.maxHealth) * 100;
    const filledSegments = Math.ceil((Math.max(0, data.health) / data.maxHealth) * HEALTH_SEGMENT_COUNT);
    const isLow = healthPercent <= LOW_HEALTH_PERCENT && data.health > 0;
    const isFlashing = isLow && Math.floor(timeSeconds * 4) % 2 === 0;
    const barWidth = HEALTH_SEGMENT_COUNT * geometry.stepX + 1;
    renderer.fillRect(geometry.firstX - 2, geometry.y - 2, barWidth + 2, geometry.height + 4, PALETTE.black);
    renderer.strokeRect(geometry.firstX - 2, geometry.y - 2, barWidth + 2, geometry.height + 4, PALETTE.gray);
    for (let segmentIndex = 0; segmentIndex < HEALTH_SEGMENT_COUNT; segmentIndex++) {
      const segmentX = geometry.firstX + segmentIndex * geometry.stepX;
      const isFilled = segmentIndex < filledSegments;
      const fillColor = isFilled ? (isFlashing ? PALETTE.white : PALETTE.red) : PALETTE.violetDark;
      renderer.fillRect(segmentX, geometry.y, geometry.width, geometry.height, fillColor);
      if (isFilled && !isFlashing) {
        // riflesso in alto e ombra in basso: il segmento sembra una gemma
        renderer.fillRect(segmentX, geometry.y, geometry.width, 1, PALETTE.orange);
        renderer.fillRect(segmentX, geometry.y + 1, 1, 1, PALETTE.cream);
        renderer.fillRect(segmentX, geometry.y + geometry.height - 2, geometry.width, 2, PALETTE.purple);
      }
    }
  }

  /**
   * Stamina: barra verde con il contorno (gialla quando è sotto un terzo). Abilità: riquadro con la "L", dorata
   * quando è pronta, grigia con il riempimento che scende durante la ricarica, azzurra con lo scudo alzato.
   */
  private renderStaminaAndAbility(renderer: Renderer, data: HUDData, timeSeconds: number): void {
    const staminaBar = STAMINA_BAR_GEOMETRY;
    const fraction = data.maxStamina <= 0 ? 0 : Math.max(0, Math.min(1, data.stamina / data.maxStamina));
    renderer.fillRect(staminaBar.x - 1, staminaBar.y - 1, staminaBar.width + 2, staminaBar.height + 2, PALETTE.black);
    renderer.fillRect(staminaBar.x, staminaBar.y, staminaBar.width, staminaBar.height, PALETTE.deepForest);
    const filledWidth = Math.round(staminaBar.width * fraction);
    if (filledWidth > 0) {
      const isLow = fraction < 1 / 3;
      renderer.fillRect(staminaBar.x, staminaBar.y, filledWidth, staminaBar.height, isLow ? PALETTE.goldLight : PALETTE.green);
      renderer.fillRect(staminaBar.x, staminaBar.y, filledWidth, 1, isLow ? PALETTE.yellow : PALETTE.lightGreen);
    }
    const abilityBox = ABILITY_BOX_GEOMETRY;
    const ability = data.ability;
    renderer.fillRect(abilityBox.x, abilityBox.y, abilityBox.size, abilityBox.size, PALETTE.black);
    const innerSize = abilityBox.size - 2;
    const background = ability.isActive ? PALETTE.blue : ability.isReady ? PALETTE.bronze : PALETTE.slate;
    renderer.fillRect(abilityBox.x + 1, abilityBox.y + 1, innerSize, innerSize, background);
    if (ability.cooldownFraction > 0) {
      const coveredHeight = Math.ceil(innerSize * ability.cooldownFraction);
      renderer.fillRect(abilityBox.x + 1, abilityBox.y + 1, innerSize, coveredHeight, PALETTE.darkBlue);
    }
    const isPulsing = ability.isReady && !ability.isActive && Math.floor(timeSeconds * 2) % 2 === 0;
    const letterColor = ability.isActive ? PALETTE.white : ability.isReady ? (isPulsing ? PALETTE.cream : PALETTE.goldLight) : PALETTE.gray;
    renderer.drawText("L", abilityBox.x + 3, abilityBox.y + 2, letterColor);
  }

  /** X del riquadro della borsa numero slotIndex (0 = tasto 1). */
  public static getBagSlotX(slotIndex: number, slotCount: number, screenWidth: number): number {
    const geometry = BAG_SLOT_GEOMETRY;
    return screenWidth - geometry.rightMargin - geometry.size - (slotCount - 1 - slotIndex) * geometry.step;
  }

  /**
   * Borsa: un riquadro per posto con il suo tasto numerico in alto a sinistra. L'arma in mano ha la
   * cornice dorata; le pozioni mostrano quante sono.
   */
  private renderBag(renderer: Renderer, spriteManager: SpriteManager, bag: HUDData["bag"]): void {
    const geometry = BAG_SLOT_GEOMETRY;
    bag.forEach((slot, slotIndex) => {
      const slotX = HUDManager.getBagSlotX(slotIndex, bag.length, renderer.width);
      renderer.fillRect(slotX + 1, geometry.y + 1, geometry.size - 2, geometry.size - 2, PALETTE.black);
      renderer.strokeRect(slotX, geometry.y, geometry.size, geometry.size, slot?.isEquipped === true ? PALETTE.goldLight : PALETTE.gray);
      if (slot !== null) {
        // icone centrate nel riquadro (armi 16x16, pozione 8x8)
        const iconOffset = (geometry.size - slot.iconSize) / 2;
        spriteManager.drawSprite(renderer, slot.iconSpriteId, slotX + iconOffset, geometry.y + iconOffset, false, false, slot.iconVariant);
        if (slot.rarityColor !== null) {
          renderer.fillRect(slotX + 3, geometry.y + geometry.size - 3, geometry.size - 6, 1, slot.rarityColor);
        }
        if (slot.count !== null) {
          // munizioni finite in rosso
          const countColor = slot.count === 0 ? PALETTE.red : PALETTE.white;
          renderer.drawText(String(slot.count), slotX + geometry.size - 2, geometry.y + geometry.size - 8, countColor, { align: "right", shadowColor: PALETTE.black });
        }
      }
      renderer.drawText(String(slotIndex + 1), slotX + 2, geometry.y + 2, slot?.isEquipped === true ? PALETTE.goldLight : PALETTE.stonePale, { shadowColor: PALETTE.black });
    });
  }

  private renderLives(renderer: Renderer, spriteManager: SpriteManager, lives: number): void {
    spriteManager.drawSprite(renderer, "hudLife", 5, 13, false);
    renderer.drawText(`x${lives}`, 16, 14, PALETTE.white, { shadowColor: PALETTE.black });
  }

  private renderBossBar(renderer: Renderer, spriteManager: SpriteManager, boss: NonNullable<HUDData["boss"]>): void {
    const barWidth = 180;
    const barX = Math.round((renderer.width - barWidth) / 2) + 6;
    const barY = 222;
    renderer.drawText(boss.name, renderer.width / 2, 209, PALETTE.white, { align: "center", shadowColor: PALETTE.wine, rowColors: TITLE_SILVER_ROWS });
    spriteManager.drawSprite(renderer, "hudSkull", barX - 14, barY - 1, false);
    renderer.fillRect(barX - 2, barY - 2, barWidth + 4, 11, PALETTE.black);
    renderer.strokeRect(barX - 2, barY - 2, barWidth + 4, 11, PALETTE.stoneLight);
    renderer.fillRect(barX - 1, barY + 8, barWidth + 2, 1, PALETTE.stoneShadow);
    const filledWidth = Math.round((barWidth * Math.max(0, boss.health)) / boss.maxHealth);
    const isEnraged = boss.phaseIndex > 0;
    renderer.fillRect(barX, barY, barWidth, 7, PALETTE.violetDark);
    renderer.fillRect(barX, barY, filledWidth, 7, isEnraged ? PALETTE.orange : PALETTE.red);
    renderer.fillRect(barX, barY, filledWidth, 2, isEnraged ? PALETTE.yellow : PALETTE.orange);
    renderer.fillRect(barX, barY + 5, filledWidth, 2, isEnraged ? PALETTE.flame : PALETTE.purple);
    for (const markerPercent of boss.phaseMarkerPercents) {
      const markerX = barX + Math.round((barWidth * markerPercent) / 100);
      renderer.fillRect(markerX, barY - 2, 1, 11, PALETTE.white);
      renderer.fillRect(markerX - 1, barY - 3, 3, 1, PALETTE.goldLight);
    }
  }
}

/** Colori a fasce per le scritte dorate (titoli). */
export const TITLE_GOLD_ROWS: readonly string[] = [
  PALETTE.cream,
  PALETTE.yellow,
  PALETTE.goldLight,
  PALETTE.goldLight,
  PALETTE.gold,
  PALETTE.gold,
  PALETTE.bronze,
];

/** Colori a fasce per le scritte argentate. */
export const TITLE_SILVER_ROWS: readonly string[] = [
  PALETTE.white,
  PALETTE.white,
  PALETTE.stonePale,
  PALETTE.lightGray,
  PALETTE.lightGray,
  PALETTE.gray,
  PALETTE.slate,
];

/**
 * Riquadro decorato in stile 16 bit: fondo a fasce scure, doppio bordo (pietra e oro),
 * angoli dorati e ombra a retino. Usato dai messaggi di livello e dalle schermate.
 */
export function drawOrnateFrame(renderer: Renderer, x: number, y: number, width: number, height: number): void {
  renderer.fillDitheredOverlay(x + 3, y + 3, width, height, PALETTE.black, 8);
  renderer.fillVerticalGradient(x, y, width, height, [PALETTE.deepNavy, PALETTE.black], 4);
  renderer.strokeRect(x, y, width, height, PALETTE.black);
  renderer.strokeRect(x + 1, y + 1, width - 2, height - 2, PALETTE.goldLight);
  renderer.fillRect(x + 2, y + height - 2, width - 3, 1, PALETTE.gold);
  renderer.fillRect(x + width - 2, y + 2, 1, height - 3, PALETTE.gold);
  renderer.strokeRect(x + 3, y + 3, width - 6, height - 6, PALETTE.slate);
  for (const [cornerX, cornerY] of [[x, y], [x + width - 5, y], [x, y + height - 5], [x + width - 5, y + height - 5]] as const) {
    renderer.fillRect(cornerX, cornerY, 5, 5, PALETTE.gold);
    renderer.fillRect(cornerX + 1, cornerY + 1, 3, 3, PALETTE.goldLight);
    renderer.fillRect(cornerX + 2, cornerY + 2, 1, 1, PALETTE.cream);
  }
}
