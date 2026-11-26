import type { AbilityId, ElementId } from "../types/EntityTypes";
import { PALETTE } from "./paletteConfig";

/**
 * Aspetto delle mosse (Classi Fase 6A): solo grafica, nessun effetto sul gioco.
 * Ogni mossa ha un'icona per l'HUD, una tinta facoltativa della lama durante la mossa e una serie di effetti
 * (sprite animati nel mondo e sagome del personaggio) che partono a un istante preciso dell'attacco.
 * Gli sprite sono registrati in rendering/sprites/abilitySprites.ts.
 */

/** Effetti a sprite (una serie di frame che si gioca una volta sola, poi sparisce). */
export type AbilityEffectId =
  | "dustRing"
  | "fireRing"
  | "frostRing"
  | "shockRing"
  | "castFire"
  | "castFrost"
  | "castArcane"
  | "castPoison"
  | "castShock"
  | "castHoly"
  | "dustPuff"
  | "arcanePuff"
  | "lightning"
  | "speedLines"
  | "flameSlash"
  | "bloodAura"
  | "bloodSlash";

/**
 * Come si allinea uno sprite d'effetto al suo punto: "center" = centrato, "bottom" = centrato in orizzontale e
 * appoggiato con l'ultima riga sul punto (effetti a terra).
 */
export type EffectAlignment = "center" | "bottom";

export interface AbilityEffectDefinition {
  /** Id degli sprite, uno per frame (prefisso "effect"). */
  frameIds: readonly string[];
  frameDurationMs: number;
  align: EffectAlignment;
}

/**
 * Punto d'appoggio di un effetto: offsetX in avanti dal centro del personaggio (segue lo sguardo), offsetY dal
 * bordo superiore dell'hitbox (0 = testa, 24 = piedi; negativo = sopra la testa).
 */
interface EffectPoint {
  atMs: number;
  offsetX: number;
  offsetY: number;
}

/** Un effetto della mossa: uno sprite d'effetto, o la sagoma colorata del personaggio che resta dove era. */
export type AbilityEffectCue =
  | (EffectPoint & { kind: "sprite"; effectId: AbilityEffectId })
  | { kind: "afterimage"; atMs: number; color: string };

export interface AbilityVisual {
  /** Icona 8x8 nel riquadro della mossa (HUD). */
  iconSpriteId: string;
  /** Durante la mossa, lama e scie prendono i colori di questo elemento. */
  weaponTint?: ElementId;
  /** Effetti, in ordine di tempo; atMs entro la durata dell'attacco (le guardie non ne hanno). */
  cues: readonly AbilityEffectCue[];
  /** Solo le guardie: barriera disegnata davanti finché è alzata (due frame che si alternano). */
  guardFrameIds?: readonly [string, string];
}

/** Frame "effect<Nome><n>" per n = 1..count. */
function frames(name: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `effect${name}${index + 1}`);
}

export const ABILITY_EFFECT_CONFIG: Record<AbilityEffectId, AbilityEffectDefinition> = {
  dustRing: { frameIds: frames("RingDust", 4), frameDurationMs: 70, align: "bottom" },
  fireRing: { frameIds: frames("RingFire", 4), frameDurationMs: 90, align: "bottom" },
  frostRing: { frameIds: frames("RingFrost", 4), frameDurationMs: 90, align: "bottom" },
  shockRing: { frameIds: frames("RingShock", 4), frameDurationMs: 70, align: "bottom" },
  castFire: { frameIds: frames("CastFire", 3), frameDurationMs: 60, align: "center" },
  castFrost: { frameIds: frames("CastFrost", 3), frameDurationMs: 60, align: "center" },
  castArcane: { frameIds: frames("CastArcane", 3), frameDurationMs: 60, align: "center" },
  castPoison: { frameIds: frames("CastPoison", 3), frameDurationMs: 60, align: "center" },
  castShock: { frameIds: frames("CastShock", 3), frameDurationMs: 60, align: "center" },
  castHoly: { frameIds: frames("CastHoly", 3), frameDurationMs: 70, align: "center" },
  dustPuff: { frameIds: frames("DustPuff", 3), frameDurationMs: 70, align: "bottom" },
  arcanePuff: { frameIds: frames("ArcanePuff", 3), frameDurationMs: 70, align: "center" },
  lightning: { frameIds: frames("Lightning", 3), frameDurationMs: 60, align: "bottom" },
  speedLines: { frameIds: frames("SpeedLines", 3), frameDurationMs: 60, align: "center" },
  flameSlash: { frameIds: frames("FlameSlash", 3), frameDurationMs: 60, align: "center" },
  bloodAura: { frameIds: frames("BloodAura", 2), frameDurationMs: 120, align: "center" },
  bloodSlash: { frameIds: frames("BloodSlash", 3), frameDurationMs: 60, align: "center" },
};

/** Sprite d'effetto a un istante della mossa. */
function effect(effectId: AbilityEffectId, atMs: number, offsetX: number, offsetY: number): AbilityEffectCue {
  return { kind: "sprite", effectId, atMs, offsetX, offsetY };
}

/** Sagome del personaggio lasciate durante uno scatto, una per istante. */
function afterimages(color: string, ...times: number[]): AbilityEffectCue[] {
  return times.map((atMs) => ({ kind: "afterimage", atMs, color }));
}

/** Altezza dei piedi rispetto al bordo superiore dell'hitbox. */
const FEET = 24;
/** Altezza della mano (dove partono i proiettili). */
const HAND = 9;

export const ABILITY_VISUAL_CONFIG: Record<AbilityId, AbilityVisual> = {
  // --- Cavaliere ---
  shockwave: { iconSpriteId: "abilityIconShockwave", cues: [effect("dustRing", 200, 0, FEET)] },
  lunge: {
    iconSpriteId: "abilityIconLunge",
    cues: [effect("speedLines", 80, -12, 12), ...afterimages(PALETTE.lightGray, 130, 210)],
  },
  shieldBash: { iconSpriteId: "abilityIconShieldBash", weaponTint: "shock", cues: [effect("castShock", 140, 14, 11)] },
  flameBlade: {
    iconSpriteId: "abilityIconFlameBlade",
    weaponTint: "fire",
    cues: [effect("castFire", 0, 2, -4), effect("flameSlash", 200, 20, 8)],
  },

  // --- Ranger ---
  backstepShot: {
    iconSpriteId: "abilityIconBackstepShot",
    cues: [effect("dustPuff", 0, 4, FEET), ...afterimages(PALETTE.green, 70, 150)],
  },
  poisonArrow: { iconSpriteId: "abilityIconPoisonArrow", weaponTint: "poison", cues: [effect("castPoison", 0, 16, HAND)] },
  frostArrow: { iconSpriteId: "abilityIconFrostArrow", weaponTint: "frost", cues: [effect("castFrost", 0, 16, HAND)] },
  fireArrow: { iconSpriteId: "abilityIconFireArrow", weaponTint: "fire", cues: [effect("castFire", 0, 16, HAND)] },

  // --- Berserker ---
  furiousCharge: {
    iconSpriteId: "abilityIconFuriousCharge",
    cues: [effect("dustPuff", 100, -6, FEET), effect("speedLines", 140, -14, 12), ...afterimages(PALETTE.ember, 200, 300), effect("dustPuff", 400, 10, FEET)],
  },
  hotAxe: { iconSpriteId: "abilityIconHotAxe", weaponTint: "fire", cues: [effect("castFire", 0, -2, -4), effect("flameSlash", 200, 18, 8)] },
  earthquake: { iconSpriteId: "abilityIconEarthquake", cues: [effect("shockRing", 200, 0, FEET), effect("dustRing", 220, 0, FEET)] },
  bloodStrike: { iconSpriteId: "abilityIconBloodStrike", cues: [effect("bloodAura", 0, 0, 10), effect("bloodSlash", 300, 18, 10)] },

  // --- Paladino ---
  shieldGuard: { iconSpriteId: "abilityIconShieldGuard", cues: [], guardFrameIds: ["effectBarrierHoly1", "effectBarrierHoly2"] },
  holyHammer: { iconSpriteId: "abilityIconHolyHammer", weaponTint: "shock", cues: [effect("castHoly", 0, 2, -6), effect("lightning", 180, 22, FEET)] },
  consecration: { iconSpriteId: "abilityIconConsecration", cues: [effect("castHoly", 0, 2, -6), effect("fireRing", 200, 0, FEET)] },
  frozenJudgement: { iconSpriteId: "abilityIconFrozenJudgement", weaponTint: "frost", cues: [effect("castFrost", 0, 2, -6), effect("frostRing", 200, 0, FEET)] },

  // --- Mago ---
  firebolt: { iconSpriteId: "abilityIconFirebolt", cues: [effect("castFire", 100, 20, -2)] },
  frostNova: { iconSpriteId: "abilityIconFrostNova", weaponTint: "frost", cues: [effect("castFrost", 0, 7, -8), effect("frostRing", 200, 0, FEET)] },
  arcaneLeap: {
    iconSpriteId: "abilityIconArcaneLeap",
    cues: [effect("arcanePuff", 0, 0, 12), ...afterimages(PALETTE.lilac, 60, 120, 180), effect("arcanePuff", 240, 0, 12)],
  },
  arcaneBarrier: { iconSpriteId: "abilityIconArcaneBarrier", cues: [], guardFrameIds: ["effectBarrierArcane1", "effectBarrierArcane2"] },
};
