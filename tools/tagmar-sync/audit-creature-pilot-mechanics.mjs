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
const mechanics = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "creatures", "mechanics-pilot.json"), "utf8"));
const pilotNames = new Set(mechanics.creatures.map((creature) => creature.name));
const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-pilot-mechanics-"));
const readable = join(temporaryRoot, "pack");
await cp(source, readable, { recursive: true });
await writeFile(join(readable, "CURRENT"), `${(await readFile(join(readable, "CURRENT"), "utf8")).trim()}\n`, "utf8");
const db = new ClassicLevel(readable, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
const actors = new Map();
const items = [];

try {
  await db.open();
  for await (const [key, value] of db.iterator()) {
    const actorMatch = key.match(/^!actors!([^.]+)$/);
    if (actorMatch && pilotNames.has(value.name)) actors.set(actorMatch[1], { id: actorMatch[1], name: value.name, type: value.type, system: value.system });
    const itemMatch = key.match(/^!actors\.items!([^.]+)\.(.+)$/);
    if (itemMatch) items.push({ actorId: itemMatch[1], itemId: itemMatch[2], name: value.name, type: value.type, system: value.system });
  }
} finally {
  await db.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

const report = [...actors.values()].map((actor) => {
  const official = mechanics.creatures.find((creature) => creature.name === actor.name);
  const wanted = new Set([...official.habilidades, ...official.tecnicas].map((entry) => entry.name));
  return {
    actor,
    official: { habilidades: official.habilidades, tecnicas: official.tecnicas },
    classicItems: items.filter((item) => item.actorId === actor.id && wanted.has(item.name))
  };
}).sort((a, b) => a.actor.name.localeCompare(b.actor.name, "pt-BR"));

const output = join(root, ".cache", "tagmar-sync", "creatures", "pilot-mechanics-audit.json");
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), creatures: report }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, creatures: report.length, matchedClassicItems: report.reduce((sum, creature) => sum + creature.classicItems.length, 0) }, null, 2));
