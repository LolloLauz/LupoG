// Regole di qualità del progetto controllate direttamente sul codice sorgente
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { projectRoot } from "../helpers.mjs";

export const description = "Regole di qualità: strict, nessun any, tipi di ritorno, nomi, nessun audio né risorse esterne, struttura, versioni";

function listFiles(directory, extension, found = []) {
  for (const name of readdirSync(directory)) {
    const fullPath = join(directory, name);
    if (statSync(fullPath).isDirectory()) listFiles(fullPath, extension, found);
    else if (name.endsWith(extension)) found.push(fullPath);
  }
  return found;
}

export default async function (t) {
  const sourceFiles = listFiles(join(projectRoot, "src"), ".ts");
  const parsed = sourceFiles.map((file) => ({
    file: relative(projectRoot, file),
    text: readFileSync(file, "utf8"),
    ast: ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2020, true),
  }));
  const walk = (node, visit) => { visit(node); ts.forEachChild(node, (child) => walk(child, visit)); };
  const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
  const tsconfig = JSON.parse(readFileSync(join(projectRoot, "tsconfig.json"), "utf8"));

  // ---------- TypeScript ----------
  t("tsconfig: strict attivo", tsconfig.compilerOptions.strict === true);
  t("tsconfig: noImplicitAny, noImplicitReturns, noUnusedLocals e noUnusedParameters attivi", ["noImplicitAny", "noImplicitReturns", "noUnusedLocals", "noUnusedParameters"].every((o) => tsconfig.compilerOptions[o] === true));
  t("il codice è tutto TypeScript (nessun .js in src)", listFiles(join(projectRoot, "src"), ".js").length === 0);
  t("ci sono file sorgente TypeScript", sourceFiles.length > 30, String(sourceFiles.length));

  const anyUses = [];
  const missingReturnTypes = [];
  const badNames = [];
  const forbiddenNames = new Set(["temp", "tmp", "val", "data1", "data2", "foo", "bar", "stuff", "thing", "obj1"]);
  const varDeclarations = [];
  for (const { file, ast } of parsed) {
    walk(ast, (node) => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) anyUses.push(file);
      const isFunctionLike = ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node);
      if (isFunctionLike && node.type === undefined && node.body !== undefined) {
        missingReturnTypes.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.name?.getText() ?? "(anonima)"}`);
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) varDeclarations.push({ file, name: node.name.text, node });
      if ((ts.isParameter(node) || ts.isPropertyDeclaration(node)) && ts.isIdentifier(node.name)) varDeclarations.push({ file, name: node.name.text, node });
      if (ts.isIdentifier(node) && forbiddenNames.has(node.text)) badNames.push(`${file}: ${node.text}`);
    });
  }
  t("nessun uso di `any`", anyUses.length === 0, [...new Set(anyUses)].join(", "));
  t("ogni funzione, metodo e getter dichiarato ha il tipo di ritorno esplicito", missingReturnTypes.length === 0, missingReturnTypes.slice(0, 4).join("; "));
  t("nessun nome generico (temp, val, data1, ...)", badNames.length === 0, badNames.slice(0, 3).join("; "));

  // ---------- nomenclatura ----------
  const camelOrConstant = /^(_?[a-z][A-Za-z0-9]*|[A-Z][A-Z0-9]*(_[A-Z0-9]+)*)$/;
  const wrongVariableNames = varDeclarations.filter(({ name }) => !camelOrConstant.test(name) && name !== "_hitDirection" && name !== "_");
  t("variabili, parametri e proprietà in camelCase (le costanti di configurazione in MAIUSCOLO_CON_TRATTINI; `_` per i parametri inutilizzati)", wrongVariableNames.length === 0, wrongVariableNames.slice(0, 4).map((v) => `${v.file}:${v.name}`).join("; "));
  const classNames = [];
  for (const { file, ast } of parsed) walk(ast, (node) => { if (ts.isClassDeclaration(node) && node.name) classNames.push({ file, name: node.name.text }); });
  t("le classi sono in PascalCase", classNames.every(({ name }) => /^[A-Z][A-Za-z0-9]*$/.test(name)), classNames.filter(({ name }) => !/^[A-Z][A-Za-z0-9]*$/.test(name)).map((c) => c.name).join(","));
  const functionNames = [];
  for (const { file, ast } of parsed) walk(ast, (node) => { if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name && ts.isIdentifier(node.name)) functionNames.push(node.name.text); });
  t("funzioni e metodi in camelCase", functionNames.every((name) => /^[a-z][A-Za-z0-9]*$/.test(name)), functionNames.filter((name) => !/^[a-z][A-Za-z0-9]*$/.test(name)).join(","));
  const requiredNames = ["calculateDamage", "checkLevelCompletion", "loadLevel", "takeDamage", "moveAndCollide", "intersects"];
  t("esistono funzioni con i nomi esplicativi attesi (calculateDamage, loadLevel, takeDamage, ...)", requiredNames.every((name) => functionNames.includes(name)), requiredNames.filter((n) => !functionNames.includes(n)).join(","));
  const requiredClasses = ["Player", "Enemy", "Boss", "GameEngine", "InputManager", "CombatSystem", "ComboManager", "LevelManager"];
  t("esistono le classi principali previste (Player, Enemy, Boss, GameEngine, InputManager, CombatSystem, ComboManager, LevelManager)", requiredClasses.every((name) => classNames.some((c) => c.name === name)));
  t("nessun `var` e nessuna variabile globale esposta su window", parsed.every(({ text }) => !/\bvar\s+[a-zA-Z_]/.test(text) && !/window\.[a-zA-Z_]+\s*=[^=]/.test(text) && !/globalThis\./.test(text)));

  // ---------- nessun audio, nessuna risorsa esterna ----------
  const everythingServed = [...parsed.map((p) => ({ file: p.file, text: p.text })), { file: "index.html", text: readFileSync(join(projectRoot, "index.html"), "utf8") }, { file: "src/style.css", text: readFileSync(join(projectRoot, "src/style.css"), "utf8") }];
  const audioHits = everythingServed.filter(({ text }) => /AudioContext|webkitAudioContext|new Audio\(|<audio|HTMLAudioElement|\.play\(\)/.test(text)).map((f) => f.file);
  t("nessun uso dell'audio nel codice", audioHits.length === 0, audioHits.join(", "));
  const audioFolder = join(projectRoot, "public/assets/audio");
  t("la cartella public/assets/audio non contiene file di suono", !existsSync(audioFolder) || readdirSync(audioFolder).every((name) => name === ".gitkeep"));
  const externalHits = everythingServed.filter(({ text }) => /https?:\/\/|\/\/cdn|fetch\(|XMLHttpRequest|@import\s+url|<script[^>]+src="http|<link[^>]+href="http/.test(text)).map((f) => f.file);
  t("nessun collegamento esterno né richiesta di rete nel codice", externalHits.length === 0, externalHits.join(", "));
  t("index.html non carica font o librerie esterne", !/googleapis|gstatic|unpkg|jsdelivr|cdnjs/.test(everythingServed.find((f) => f.file === "index.html").text));

  // ---------- struttura del progetto ----------
  const requiredFiles = ["index.html", "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "README.md", "src/main.ts", "src/style.css"];
  t("file principali presenti", requiredFiles.every((f) => existsSync(join(projectRoot, f))), requiredFiles.filter((f) => !existsSync(join(projectRoot, f))).join(","));
  const requiredFolders = ["public/assets/sprites", "public/assets/backgrounds", "public/assets/audio", "public/assets/fonts", "src/config", "src/core", "src/entities", "src/combat", "src/systems", "src/rendering", "src/ui", "src/types", "documentation"];
  t("cartelle previste presenti", requiredFolders.every((f) => existsSync(join(projectRoot, f))), requiredFolders.filter((f) => !existsSync(join(projectRoot, f))).join(","));
  const requiredModules = ["config/gameConfig", "config/playerConfig", "config/enemyConfig", "config/controlsConfig", "config/levelConfig", "core/GameEngine", "core/GameLoop", "core/GameState", "core/InputManager", "entities/GameObject", "entities/Player", "entities/Enemy", "entities/Boss", "combat/CombatSystem", "combat/ComboManager", "combat/AttackDefinition", "systems/CollisionSystem", "systems/EnemyAISystem", "systems/LevelManager", "systems/ItemManager", "systems/ScoreManager", "rendering/Renderer", "rendering/SpriteManager", "rendering/AnimationManager", "rendering/Camera", "ui/MenuManager", "ui/HUDManager", "ui/ScreenManager", "types/GameTypes", "types/EntityTypes", "types/LevelTypes"];
  t("tutti i moduli della struttura proposta nel prompt esistono (AudioManager escluso per scelta)", requiredModules.every((m) => existsSync(join(projectRoot, "src", m + ".ts"))), requiredModules.filter((m) => !existsSync(join(projectRoot, "src", m + ".ts"))).join(","));
  const requiredDocs = ["GAME_MANUAL.md", "CODE_MANUAL.md", "FEATURES.md", "ARCHITECTURE.md", "INSTALLATION.md", "CHANGELOG.md"];
  t("i sei documenti obbligatori esistono e non sono vuoti", requiredDocs.every((d) => existsSync(join(projectRoot, "documentation", d)) && statSync(join(projectRoot, "documentation", d)).size > 2000), requiredDocs.filter((d) => !existsSync(join(projectRoot, "documentation", d))).join(","));
  t("comandi npm richiesti presenti (dev, build, preview, typecheck, install)", ["dev", "build", "preview", "typecheck"].every((s) => packageJson.scripts[s] !== undefined));
  t("nessuna dipendenza di esecuzione", Object.keys(packageJson.dependencies ?? {}).length === 0);
  t("package.json usa i moduli ES", packageJson.type === "module");

  // ---------- versioni e manuali aggiornati ----------
  const gameConfigText = readFileSync(join(projectRoot, "src/config/gameConfig.ts"), "utf8");
  const gameVersion = /version:\s*"([^"]+)"/.exec(gameConfigText)?.[1];
  t("la versione in package.json coincide con GAME_CONFIG.version", gameVersion === packageJson.version, `${gameVersion} / ${packageJson.version}`);
  const documentsWithVersion = ["GAME_MANUAL.md", "CODE_MANUAL.md", "ARCHITECTURE.md", "INSTALLATION.md", "FEATURES.md"];
  const outdated = documentsWithVersion.filter((d) => !readFileSync(join(projectRoot, "documentation", d), "utf8").includes(`**${packageJson.version}**`) && !readFileSync(join(projectRoot, "documentation", d), "utf8").includes(`Versione ${packageJson.version}`));
  t("i manuali dichiarano la versione corrente", outdated.length === 0, outdated.join(", "));
  const changelog = readFileSync(join(projectRoot, "documentation/CHANGELOG.md"), "utf8");
  t("il CHANGELOG ha una voce per la versione corrente", changelog.includes(`## ${packageJson.version} `), packageJson.version);
  const features = readFileSync(join(projectRoot, "documentation/FEATURES.md"), "utf8");
  t("FEATURES.md usa solo gli stati definiti", features.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Funzionalità") && !l.startsWith("|---") && !l.startsWith("| Stato") && !l.startsWith("| **")).filter((l) => l.split("|").length > 4).every((l) => /\|\s*(Implementata|In sviluppo|Da implementare|Pianificata|Non prevista)\b/.test(l)), "");
}
