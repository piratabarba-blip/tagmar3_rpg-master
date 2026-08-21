import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync", "creatures");
const index = JSON.parse(await readFile(join(cacheDir, "index.json"), "utf8"));
const pilot = process.argv.includes("--pilot");
const pilotNames = new Set(["Águia", "Cobra Venenosa", "Corvo", "Crocodilo", "Urso"]);
const selected = index.creatures.filter((creature) => !pilot || pilotNames.has(creature.name));
if (pilot && selected.length !== pilotNames.size) throw new Error(`Lote piloto incompleto: ${selected.length}/${pilotNames.size}`);
const headers = { "User-Agent": "Tagmar-Foundry-Compendium-Sync/1.0 (+https://github.com/piratabarba-blip/tagmar3_rpg-master)" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const filename = (key) => `${digest(key).slice(0, 16)}.html`;
const details = [];
const responseCache = new Map();

await mkdir(join(cacheDir, "details"), { recursive: true });
for (const creature of selected) {
  let html = responseCache.get(creature.url);
  if (!html) {
    const response = await fetch(creature.url, { headers });
    if (!response.ok) throw new Error(`${creature.name}: ${response.status} ${response.statusText}`);
    html = await response.text();
    responseCache.set(creature.url, html);
    await sleep(1000);
  }
  const hash = digest(html.replace(/\s+/g, " "));
  const file = filename(creature.key);
  await writeFile(join(cacheDir, "details", file), html, "utf8");
  details.push({ key: creature.key, name: creature.name, categoryCode: creature.categoryCode, categoryLabel: creature.categoryLabel, url: creature.url, hash, file });
}

const outputPath = join(cacheDir, pilot ? "details-pilot.json" : "details.json");
await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), details }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, details: details.length, uniqueRequests: responseCache.size, names: details.map((detail) => detail.name) }, null, 2));
