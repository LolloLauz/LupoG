// Posa del bottino: niente oggetti sospesi in aria o sopra gli abissi
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "../helpers.mjs";

export const description = "Posa del bottino: sul terreno sotto il punto di caduta, mai in aria, sugli spuntoni o sopra un abisso";

export default async function (t, load) {
  const { findDropPoint } = await load("systems/DropPlacement");
  const { LEVEL_CONFIG } = await load("config/levelConfig");
  const engineSource = readFileSync(join(projectRoot, "src/core/GameEngine.ts"), "utf8");

  const floor = { x: 0, y: 200, width: 100, height: 40 };
  const ledge = { x: 20, y: 150, width: 40, height: 6, oneWay: true };
  const fallback = { centerX: 10, bottomY: 200 };
  const at = (x, y, platforms = [floor, ledge], hazards = []) => findDropPoint(x, y, platforms, hazards, fallback);

  t("in aria scende sul primo terreno sotto", at(40, 90).bottomY === 150 && at(40, 90).centerX === 40);
  t("sotto la sporgenza scende fino al suolo", at(40, 170).bottomY === 200);
  t("già a terra resta dov'è (anche di poco affondato)", at(80, 200).bottomY === 200 && at(80, 203).bottomY === 200);
  t("sopra un abisso va sul ripiego", at(150, 90).centerX === 10 && at(150, 90).bottomY === 200);
  t("sotto la mappa va sul ripiego", at(80, 230).centerX === 10);
  t("una piattaforma mobile non trattiene l'oggetto", at(150, 90, [floor, { x: 140, y: 160, width: 30, height: 6, oneWay: true, isMoving: true }]).centerX === 10);
  t("sugli spuntoni non resta", at(80, 120, [floor], [{ kind: "spikes", x: 70, y: 192, width: 20, height: 8 }]).centerX === 10);
  t("acqua e ghiaccio non contano", at(80, 120, [floor], [{ kind: "water", x: 70, y: 180, width: 20, height: 20 }]).centerX === 80);
  t("il punto restituito è una copia del ripiego", at(150, 90) !== fallback);
  t("in ogni livello ogni punto sopra la mappa finisce su un terreno fermo", LEVEL_CONFIG.every((level) => {
    const start = findDropPoint(level.playerStart.x + 6, level.playerStart.y, level.platforms, level.hazards ?? [], { centerX: -1, bottomY: -1 });
    if (start.centerX < 0) return false;
    for (let x = 0; x <= level.width; x += 8) {
      const point = findDropPoint(x, 0, level.platforms, level.hazards ?? [], start);
      if (!level.platforms.some((p) => point.centerX >= p.x && point.centerX <= p.x + p.width && p.y === point.bottomY)) return false;
    }
    return true;
  }));
  t("motore: bottino di nemici e boss, pozioni di mana e scambi passano dalla posa a terra",
    (engineSource.match(/this\.dropOnGround\(/g) ?? []).length === 3 && /private dropManaPotionIfRolled[\s\S]{0,300}this\.getDropPoint\(centerX, bottomY\)/.test(engineSource) && /private getDropPoint[\s\S]{0,300}findDropPoint\(centerX, bottomY, this\.levelManager\.platforms, this\.levelManager\.hazards, this\.lastDropGround\)/.test(engineSource));
}
