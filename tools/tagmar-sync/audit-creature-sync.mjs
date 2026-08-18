import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const classic = JSON.parse(await readFile(join(cacheDir, "snapshot-criaturas-e-arquetipos-sem-tecnicas.json"), "utf8"));
const official = JSON.parse(await readFile(join(cacheDir, "creatures", "index.json"), "utf8"));

const normalize = (value) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const classicActors = classic.documents
  .filter((document) => document.type === "NPC")
  .map((document) => ({ id: document._id, name: document.name, key: normalize(document.name), folder: document.folder }));
const classicByKey = new Map();
for (const actor of classicActors) {
  const entries = classicByKey.get(actor.key) ?? [];
  entries.push(actor);
  classicByKey.set(actor.key, entries);
}

const officialRows = official.creatures.map((creature) => ({ ...creature, normalizedName: normalize(creature.name) }));
const officialKeys = new Set(officialRows.map((creature) => creature.normalizedName));
const matched = officialRows
  .filter((creature) => classicByKey.has(creature.normalizedName))
  .map((creature) => ({ ...creature, classic: classicByKey.get(creature.normalizedName) }));
const officialOnly = officialRows.filter((creature) => !classicByKey.has(creature.normalizedName));
const classicOnly = classicActors.filter((actor) => !officialKeys.has(actor.key));
const duplicateClassicKeys = [...classicByKey.entries()]
  .filter(([, actors]) => actors.length > 1)
  .map(([key, actors]) => ({ key, actors }));

const report = {
  generatedAt: new Date().toISOString(),
  policy: {
    classicPack: "read-only",
    destinationPack: "criaturas-t3er",
    syncKey: "categoria-oficial + nome normalizado + variante",
    mechanics: "preservar itens incorporados e automações do ator clássico quando houver correspondência inequívoca"
  },
  counts: {
    official: officialRows.length,
    classicNpc: classicActors.length,
    matched: matched.length,
    officialOnly: officialOnly.length,
    classicOnly: classicOnly.length,
    duplicateClassicKeys: duplicateClassicKeys.length
  },
  matched,
  officialOnly,
  classicOnly,
  duplicateClassicKeys
};
await writeFile(join(cacheDir, "creature-sync-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.counts, null, 2));
