import { measureTextWidth } from "./BitmapFont";
import { AFTERIMAGE_CONFIG, type AbilityEffectDefinition } from "../config/abilityVisualConfig";
import { PALETTE } from "../config/gameConfig";
import type { Renderer } from "./Renderer";
import type { SpriteManager } from "./SpriteManager";

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  gravity: number;
  lifeMs: number;
  remainingMs: number;
  size: number;
  color: string;
}

interface ScorePopup {
  text: string;
  x: number;
  y: number;
  color: string;
  remainingMs: number;
}

/** Effetto a sprite (Classi Fase 6A): una serie di frame giocata una volta nel punto indicato. */
interface SpriteEffect {
  definition: AbilityEffectDefinition;
  x: number;
  y: number;
  isFlipped: boolean;
  elapsedMs: number;
}

/** Sagoma a tinta unita di un frame del personaggio, lasciata dove era (scatti e balzi, Classi Fase 6A). */
interface Afterimage {
  spriteId: string;
  hitboxX: number;
  hitboxBottom: number;
  hitboxWidth: number;
  isFlipped: boolean;
  color: string;
  remainingMs: number;
}

const MAX_PARTICLES = 200;
const MAX_SPRITE_EFFECTS = 24;

const POPUP_DURATION_MS = 700;
const POPUP_RISE_PIXELS = 14;

/**
 * Effetti grafici in stile 8 bit: particelle quadrate, scritte che salgono,
 * tremolio dello schermo (a pixel interi) e hit-stop (breve pausa all'impatto).
 * Tutto è puramente visivo: non influisce sulle regole del gioco, tranne il
 * hit-stop che ferma per pochi istanti l'aggiornamento per dare "peso" ai colpi.
 */
export class EffectsManager {
  private particles: Particle[] = [];
  private popups: ScorePopup[] = [];
  private spriteEffects: SpriteEffect[] = [];
  private afterimages: Afterimage[] = [];
  private shakeRemainingMs = 0;
  private shakeTotalMs = 1;
  private shakeMagnitude = 0;
  private hitStopRemainingMs = 0;

  /** randomNumber è iniettabile per rendere gli effetti prevedibili nei test. */
  constructor(private readonly randomNumber: () => number = Math.random) {}

  public get particleCount(): number {
    return this.particles.length;
  }

  public get popupCount(): number {
    return this.popups.length;
  }

  public get spriteEffectCount(): number {
    return this.spriteEffects.length;
  }

  public get afterimageCount(): number {
    return this.afterimages.length;
  }

  public get isHitStopActive(): boolean {
    return this.hitStopRemainingMs > 0;
  }

  // --- generazione ----------------------------------------------------------

  /**
   * Effetto a sprite (Classi Fase 6A) nel punto (x, y) del mondo, allineato secondo la definizione
   * (centrato, o appoggiato con l'ultima riga). isFlipped = rivolto a sinistra.
   */
  public spawnSpriteEffect(definition: AbilityEffectDefinition, x: number, y: number, isFlipped: boolean): void {
    if (this.spriteEffects.length >= MAX_SPRITE_EFFECTS) {
      return;
    }
    this.spriteEffects.push({ definition, x: Math.round(x), y: Math.round(y), isFlipped, elapsedMs: 0 });
  }

  /** Sagoma del frame spriteId allineata all'hitbox indicata (coordinate del mondo), nel colore indicato. */
  public spawnAfterimage(spriteId: string, hitboxX: number, hitboxBottom: number, hitboxWidth: number, isFlipped: boolean, color: string): void {
    if (this.afterimages.length >= MAX_SPRITE_EFFECTS) {
      return;
    }
    this.afterimages.push({ spriteId, hitboxX: Math.round(hitboxX), hitboxBottom: Math.round(hitboxBottom), hitboxWidth, isFlipped, color, remainingMs: AFTERIMAGE_CONFIG.durationMs });
  }

  /** Scintille di un colpo: partono nella direzione dell'attacco (1 = destra, -1 = sinistra). */
  public spawnHitSparks(x: number, y: number, direction: 1 | -1): void {
    const colors = [PALETTE.white, PALETTE.yellow, PALETTE.orange];
    for (let index = 0; index < 7; index++) {
      this.addParticle({
        x,
        y,
        velocityX: direction * (30 + this.randomNumber() * 70),
        velocityY: -20 - this.randomNumber() * 60,
        gravity: 260,
        lifeMs: 180 + this.randomNumber() * 160,
        size: this.randomNumber() < 0.3 ? 2 : 1,
        color: colors[index % colors.length]!,
      });
    }
  }

  /** Esplosione di particelle (morte di un nemico, boss). */
  public spawnBurst(x: number, y: number, colors: string[], count: number): void {
    for (let index = 0; index < count; index++) {
      const angle = this.randomNumber() * Math.PI * 2;
      const speed = 25 + this.randomNumber() * 85;
      this.addParticle({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 30,
        gravity: 220,
        lifeMs: 350 + this.randomNumber() * 350,
        size: this.randomNumber() < 0.4 ? 2 : 1,
        color: colors[index % colors.length]!,
      });
    }
  }

  /** Nuvoletta di polvere (atterraggio, schivata). */
  public spawnDust(x: number, y: number): void {
    for (let index = 0; index < 5; index++) {
      this.addParticle({
        x: x + (this.randomNumber() - 0.5) * 6,
        y,
        velocityX: (this.randomNumber() - 0.5) * 50,
        velocityY: -5 - this.randomNumber() * 18,
        gravity: 0,
        lifeMs: 200 + this.randomNumber() * 150,
        size: 2,
        color: PALETTE.lightGray,
      });
    }
  }

  /** Scintillio quando si raccoglie un oggetto. */
  public spawnSparkle(x: number, y: number): void {
    const colors = [PALETTE.yellow, PALETTE.white, PALETTE.cyan];
    for (let index = 0; index < 6; index++) {
      this.addParticle({
        x,
        y,
        velocityX: (this.randomNumber() - 0.5) * 50,
        velocityY: -15 - this.randomNumber() * 40,
        gravity: 60,
        lifeMs: 300 + this.randomNumber() * 200,
        size: 1,
        color: colors[index % colors.length]!,
      });
    }
  }

  /** Scritta che sale e svanisce (es. "+100"). */
  public addPopup(text: string, x: number, y: number, color: string = PALETTE.yellow): void {
    this.popups.push({ text, x, y, color, remainingMs: POPUP_DURATION_MS });
  }

  /** Fa tremolare lo schermo. Se c'è già un tremolio più forte non lo sostituisce. */
  public triggerShake(magnitudePixels: number, durationMs: number): void {
    if (this.shakeRemainingMs > 0 && magnitudePixels * durationMs < this.shakeMagnitude * this.shakeRemainingMs) {
      return;
    }
    this.shakeMagnitude = magnitudePixels;
    this.shakeRemainingMs = durationMs;
    this.shakeTotalMs = Math.max(1, durationMs);
  }

  /** Congela il gioco per qualche istante (non si somma: vale il più lungo). */
  public triggerHitStop(durationMs: number): void {
    this.hitStopRemainingMs = Math.max(this.hitStopRemainingMs, durationMs);
  }

  // --- aggiornamento e disegno ----------------------------------------------

  /** Scorre il tempo del hit-stop. Quando è attivo il resto del gioco non si aggiorna. */
  public tickHitStop(deltaTimeSeconds: number): void {
    this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - deltaTimeSeconds * 1000);
  }

  public update(deltaTimeSeconds: number): void {
    const deltaTimeMs = deltaTimeSeconds * 1000;
    for (const particle of this.particles) {
      particle.velocityY += particle.gravity * deltaTimeSeconds;
      particle.x += particle.velocityX * deltaTimeSeconds;
      particle.y += particle.velocityY * deltaTimeSeconds;
      particle.remainingMs -= deltaTimeMs;
    }
    this.particles = this.particles.filter((particle) => particle.remainingMs > 0);
    for (const popup of this.popups) {
      popup.remainingMs -= deltaTimeMs;
    }
    this.popups = this.popups.filter((popup) => popup.remainingMs > 0);
    for (const effect of this.spriteEffects) {
      effect.elapsedMs += deltaTimeMs;
    }
    this.spriteEffects = this.spriteEffects.filter(
      (effect) => effect.elapsedMs < effect.definition.frameDurationMs * effect.definition.frameIds.length
    );
    for (const afterimage of this.afterimages) {
      afterimage.remainingMs -= deltaTimeMs;
    }
    this.afterimages = this.afterimages.filter((afterimage) => afterimage.remainingMs > 0);
    this.shakeRemainingMs = Math.max(0, this.shakeRemainingMs - deltaTimeMs);
  }

  /** Spostamento (in pixel interi) da applicare alla vista in questo frame. */
  public getShakeOffset(): { x: number; y: number } {
    if (this.shakeRemainingMs <= 0) {
      return { x: 0, y: 0 };
    }
    const strength = Math.max(1, Math.round((this.shakeMagnitude * this.shakeRemainingMs) / this.shakeTotalMs));
    const phase = Math.floor(this.shakeRemainingMs / 33) % 4;
    const offsets = [
      { x: strength, y: 0 },
      { x: 0, y: -strength },
      { x: -strength, y: 0 },
      { x: 0, y: strength },
    ];
    return offsets[phase]!;
  }

  public render(renderer: Renderer, cameraX: number, cameraY: number): void {
    for (const particle of this.particles) {
      // le particelle quasi esaurite lampeggiano (un frame su due)
      if (particle.remainingMs < particle.lifeMs * 0.25 && Math.floor(particle.remainingMs / 40) % 2 === 0) {
        continue;
      }
      renderer.fillRect(
        Math.round(particle.x - cameraX),
        Math.round(particle.y - cameraY),
        particle.size,
        particle.size,
        particle.color
      );
    }
    for (const popup of this.popups) {
      const progress = 1 - popup.remainingMs / POPUP_DURATION_MS;
      const popupY = popup.y - cameraY - Math.round(progress * POPUP_RISE_PIXELS);
      // il bordo nero tiene leggibile il testo su qualsiasi sfondo
      // le scritte lunghe (nomi delle combo) restano dentro lo schermo anche vicino ai bordi
      const halfWidth = Math.ceil(measureTextWidth(popup.text, 1) / 2);
      const popupX = Math.min(Math.max(popup.x - cameraX, halfWidth + 1), renderer.width - halfWidth - 2);
      renderer.drawText(popup.text, popupX + 1, popupY + 1, PALETTE.black, { align: "center" });
      renderer.drawText(popup.text, popupX, popupY, popup.color, { align: "center" });
    }
  }

  /** Sagome dei personaggi: si disegnano prima del giocatore, così restano dietro. */
  public renderAfterimages(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    for (const afterimage of this.afterimages) {
      if (afterimage.remainingMs < AFTERIMAGE_CONFIG.durationMs / 2 && Math.floor(afterimage.remainingMs / AFTERIMAGE_CONFIG.blinkMs) % 2 === 0) {
        continue;
      }
      spriteManager.drawSpriteAligned(
        renderer,
        afterimage.spriteId,
        afterimage.hitboxX - cameraX,
        afterimage.hitboxBottom - cameraY,
        afterimage.hitboxWidth,
        afterimage.isFlipped,
        afterimage.color
      );
    }
  }

  /** Effetti a sprite (anelli, lampi, fulmini): sopra i personaggi. */
  public renderSpriteEffects(renderer: Renderer, spriteManager: SpriteManager, cameraX: number, cameraY: number): void {
    for (const effect of this.spriteEffects) {
      const { frameIds, frameDurationMs, align } = effect.definition;
      const frameIndex = Math.min(frameIds.length - 1, Math.floor(effect.elapsedMs / frameDurationMs));
      const frameId = frameIds[frameIndex]!;
      const size = spriteManager.getSpriteSize(frameId);
      const drawX = effect.x - Math.floor(size.width / 2) - cameraX;
      const drawY = (align === "bottom" ? effect.y - size.height : effect.y - Math.floor(size.height / 2)) - cameraY;
      spriteManager.drawSprite(renderer, frameId, Math.round(drawX), Math.round(drawY), effect.isFlipped);
    }
  }

  public clear(): void {
    this.particles = [];
    this.popups = [];
    this.spriteEffects = [];
    this.afterimages = [];
    this.shakeRemainingMs = 0;
    this.hitStopRemainingMs = 0;
  }

  private addParticle(particle: Omit<Particle, "remainingMs">): void {
    if (this.particles.length >= MAX_PARTICLES) {
      return;
    }
    this.particles.push({ ...particle, remainingMs: particle.lifeMs });
  }
}
