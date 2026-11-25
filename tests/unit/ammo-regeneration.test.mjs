// Passiva del Ranger: le frecce dell'arco si ricaricano piano piano
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "../helpers.mjs";

export const description = "Ricarica passiva delle frecce del Ranger";

export default async function (t, load) {
  const { CHARACTER_CONFIG, CHARACTER_ORDER } = await load("config/characterConfig");
  const { WEAPON_CONFIG } = await load("config/weaponConfig");
  const { Inventory } = await load("systems/Inventory");
  const { AmmoRegeneration } = await load("systems/AmmoRegeneration");
  const passive = CHARACTER_CONFIG.ranger.ammoRegeneration;
  const max = WEAPON_CONFIG.bow.ammo.max;

  t("solo il Ranger ha la passiva, sulle frecce dell'arco", CHARACTER_ORDER.filter((id) => CHARACTER_CONFIG[id].ammoRegeneration !== undefined).join() === "ranger" && passive.weaponId === "bow" && passive.intervalMs > 0);

  const bag = new Inventory();
  bag.reset(["bow", "sword"], "bow");
  bag.setEquippedAmmo(0);
  const regeneration = new AmmoRegeneration();
  const early = regeneration.update(passive.intervalMs - 1, passive, bag);
  const first = regeneration.update(1, passive, bag);
  t("una freccia allo scadere dell'intervallo, non prima", !early && first && bag.equippedAmmo === 1);
  bag.selectSlot(1);
  bag.reset(["bow", "sword"], "sword");
  const stowed = bag.bagSlots[0];
  stowed.ammo = 3;
  regeneration.reset();
  t("si ricarica anche con l'arco in borsa e un'altra arma in mano", regeneration.update(passive.intervalMs, passive, bag) && stowed.ammo === 4);
  stowed.ammo = max;
  regeneration.update(passive.intervalMs * 5, passive, bag);
  stowed.ammo = max - 1;
  t("a faretra piena il tempo non si accumula", !regeneration.update(passive.intervalMs - 1, passive, bag) && regeneration.update(1, passive, bag) && stowed.ammo === max);
  t("mai oltre il massimo", !regeneration.update(passive.intervalMs * 3, passive, bag) && stowed.ammo === max);

  const crossbow = new Inventory();
  crossbow.reset(["crossbow"], "crossbow");
  crossbow.setEquippedAmmo(0);
  t("i quadrelli della balestra non si ricaricano, e senza passiva non succede niente", !new AmmoRegeneration().update(60000, passive, crossbow) && !new AmmoRegeneration().update(60000, undefined, crossbow) && crossbow.equippedAmmo === 0);

  const engine = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");
  t("motore: la passiva aggiorna anche le frecce in mano e il tempo riparte a ogni livello", /this\.regenerateAmmo\(deltaTimeSeconds\);/.test(engine) && /private regenerateAmmo[\s\S]{0,500}this\.player\.setAmmo\(this\.inventory\.equippedAmmo \?\? 0\)/.test(engine) && /private startLevel[\s\S]{0,700}this\.ammoRegeneration\.reset\(\)/.test(engine));
}
