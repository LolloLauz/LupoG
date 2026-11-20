/**
 * Esegue tutti i test di tests/unit (npm test).
 *
 * Ogni file esporta `description` e una funzione `default(t, load)`:
 *   t(descrizione, condizione, dettaglio)  registra un controllo;
 *   load("percorso/in/src")                importa un modulo del gioco.
 * Un controllo fallito, o un'eccezione, fa fallire il file. Codice di uscita 1 se qualcosa fallisce.
 *
 * Uso:  npm test                 (tutto)
 *       npm test -- combat       (solo i file il cui nome contiene "combat")
 */
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { load } from "./helpers.mjs";

const unitDirectory = join(dirname(fileURLToPath(import.meta.url)), "unit");
const filter = process.argv[2] ?? "";
const files = readdirSync(unitDirectory).filter((name) => name.endsWith(".test.mjs") && name.includes(filter)).sort();

let totalChecks = 0;
let failedChecks = 0;
const failures = [];
const startTime = Date.now();

for (const file of files) {
  const module = await import(pathToFileURL(join(unitDirectory, file)).href);
  let fileChecks = 0;
  let fileFailures = 0;
  const check = (name, condition, detail = "") => {
    fileChecks++;
    if (!condition) {
      fileFailures++;
      failures.push(`  ✘ [${file}] ${name}${detail === "" ? "" : "  (" + detail + ")"}`);
    }
  };
  try {
    await module.default(check, load);
  } catch (error) {
    fileFailures++;
    failures.push(`  ✘ [${file}] eccezione: ${error.stack?.split("\n").slice(0, 3).join(" | ") ?? error}`);
  }
  totalChecks += fileChecks;
  failedChecks += fileFailures;
  console.log(`${fileFailures === 0 ? "✔" : "✘"} ${file.padEnd(34)} ${String(fileChecks).padStart(3)} controlli   ${module.description ?? ""}`);
}

if (failures.length > 0) {
  console.log("\nFALLIMENTI:\n" + failures.join("\n"));
}
console.log(`\n${totalChecks} controlli in ${files.length} file, ${failedChecks} falliti (${((Date.now() - startTime) / 1000).toFixed(1)} s).`);
process.exit(failedChecks === 0 && files.length > 0 ? 0 : 1);
