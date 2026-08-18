import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const source = resolve(root, "packs", "criaturas-e-arquetipos-sem-tecnicas");
const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-classic-techniques-"));
const readable = join(temporaryRoot, "pack");
await cp(source, readable, { recursive: true });
await writeFile(join(readable, "CURRENT"), `${(await readFile(join(readable, "CURRENT"), "utf8")).trim()}\n`, "utf8");
const db = new ClassicLevel(readable, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
const actors = new Map();
const embedded = [];

try {
  await db.open();
  for await (const [key, value] of db.iterator()) {
    const actorMatch = key.match(/^!actors!([^.]+)$/);
    if (actorMatch) actors.set(actorMatch[1], { id: actorMatch[1], name: value.name, type: value.type });
    const itemMatch = key.match(/^!actors\.items!([^.]+)\.(.+)$/);
    if (itemMatch) embedded.push({ actorId: itemMatch[1], itemId: itemMatch[2], name: value.name, type: value.type, system: value.system });
  }
} finally {
  await db.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

const npcItems = embedded
  .filter((item) => actors.get(item.actorId)?.type === "NPC")
  .map((item) => ({ ...item, actorName: actors.get(item.actorId).name }));
const isTechnique = (item) => /t[eé]cnica/i.test(item.type ?? "")
  || /t[eé]cnica/i.test(item.system?.tipo ?? "")
  || ["Bote", "Carga Quadrúpede", "Carga Quadrupede"].includes(item.name);
const techniques = npcItems.filter(isTechnique);
const byName = [...techniques.reduce((map, item) => {
  const entry = map.get(item.name) ?? { name: item.name, count: 0, actors: [] };
  entry.count += 1;
  entry.actors.push(item.actorName);
  return map.set(item.name, entry);
}, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
const byType = Object.fromEntries([...npcItems.reduce((map, item) => map.set(item.type, (map.get(item.type) ?? 0) + 1), new Map())].sort());
const combatNames = [...npcItems.filter((item) => item.type === "Combate").reduce((map, item) => {
  const entry = map.get(item.name) ?? { name: item.name, count: 0, actors: [] };
  entry.count += 1;
  entry.actors.push(item.actorName);
  return map.set(item.name, entry);
}, new Map()).values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
const report = { actors: [...actors.values()].filter((actor) => actor.type === "NPC").length, embeddedItems: npcItems.length, techniqueItems: techniques.length, byType, byName, combatNames };
await writeFile(join(root, ".cache", "tagmar-sync", "classic-creature-techniques.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ actors: report.actors, embeddedItems: report.embeddedItems, techniqueItems: report.techniqueItems, techniqueNames: report.byName.length, byType }, null, 2));
