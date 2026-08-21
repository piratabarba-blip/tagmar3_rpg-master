import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");

async function readPack(source, label) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), `tagmar-audit-creature-magics-${label}-`));
  const readable = join(temporaryRoot, "pack");
  await cp(source, readable, { recursive: true });
  await writeFile(join(readable, "CURRENT"), `${(await readFile(join(readable, "CURRENT"), "utf8")).trim()}\n`, "utf8");
  const db = new ClassicLevel(readable, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
  const actors = new Map();
  const magics = [];
  try {
    await db.open();
    for await (const [key, value] of db.iterator()) {
      const actorMatch = key.match(/^!actors!([^.]+)$/);
      if (actorMatch) actors.set(actorMatch[1], value);
      const itemMatch = key.match(/^!actors\.items!([^.]+)\.(.+)$/);
      if (itemMatch && value.type === "Magia") magics.push({ actorId: itemMatch[1], itemId: itemMatch[2], ...value });
    }
  } finally {
    await db.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  return { actors, magics };
}

const revised = await readPack(resolve(root, "packs", "criaturas-t3er"), "revised");
const classic = await readPack(resolve(root, "packs", "criaturas-e-arquetipos-sem-tecnicas"), "classic");
const syncAudit = JSON.parse(await readFile(join(root, ".cache", "tagmar-sync", "creature-sync-audit.json"), "utf8"));
const editorialOverrides = JSON.parse(await readFile(join(here, "creature-editorial-overrides.json"), "utf8"));
const { actors, magics } = revised;

const errors = [];
const warnings = [];
const classicMagicActors = new Map([...classic.actors].map(([actorId, actor]) => [actorId, { actor, items: classic.magics.filter((item) => item.actorId === actorId) }]));
const revisedActorByName = new Map([...actors].map(([actorId, actor]) => [actor.name, { actorId, actor }]));
const magicSignature = (item) => JSON.stringify({ name: item.name, system: item.system });
const unmappedClassic = [];
for (const [classicActorId, { actor: classicActor, items: classicItems }] of classicMagicActors) {
  if (!classicItems.length) continue;
  const match = syncAudit.matched.find((row) => row.classic?.some((entry) => entry.id === classicActorId));
  if (!match) {
    unmappedClassic.push({ actor: classicActor.name, count: classicItems.length, magics: classicItems.map((item) => item.name) });
    continue;
  }
  const revisedActor = revisedActorByName.get(match.name);
  if (!revisedActor) {
    errors.push(`${classicActor.name}: criatura mapeada como ${match.name}, mas ator revisado ausente`);
    continue;
  }
  const revisedItems = magics.filter((item) => item.actorId === revisedActor.actorId);
  const expected = classicItems.map(magicSignature).sort();
  const actual = revisedItems
    .filter((item) => item.flags?.tagmarSync?.mappingStatus !== "oficial-livro-criaturas-e-livro-magias")
    .map(magicSignature).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${match.name}: repertório mágico divergiu do compêndio clássico ${classicActor.name}`);
}
for (const override of editorialOverrides.overrides.filter((entry) => entry.type === "add-official-magics")) {
  const revisedActor = revisedActorByName.get(override.creature);
  if (!revisedActor) {
    errors.push(`${override.creature}: ator ausente para poderes mágicos oficiais`);
    continue;
  }
  const actorMagics = magics.filter((item) => item.actorId === revisedActor.actorId);
  for (const expected of override.magics) {
    const matches = actorMagics.filter((item) => normalize(item.name) === normalize(expected.name) && Number(item.system?.nivel) === expected.level);
    if (matches.length !== 1) errors.push(`${override.creature}: esperado exatamente ${expected.name} ${expected.level}; encontrados ${matches.length}`);
    else if (matches[0].flags?.tagmarSync?.officialBadge !== true) errors.push(`${override.creature}/${expected.name}: selo oficial não registrado`);
  }
}
const rows = [];
for (const [actorId, actor] of actors) {
  const actorMagics = magics.filter((item) => item.actorId === actorId);
  if (!actorMagics.length) continue;
  const duplicateNames = [...actorMagics.reduce((map, item) => {
    const key = normalize(item.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map())].filter(([, items]) => items.length > 1);
  if (duplicateNames.length) warnings.push(`${actor.name}: magias homônimas preservadas: ${duplicateNames.map(([name, items]) => `${name} (${items.length})`).join(", ")}`);
  const invalidLevels = actorMagics.filter((item) => {
    const level = Number(item.system?.nivel);
    return !Number.isFinite(level) || level < 0;
  });
  if (invalidLevels.length) errors.push(`${actor.name}: níveis inválidos em ${invalidLevels.map((item) => item.name).join(", ")}`);
  rows.push({
    actor: actor.name,
    stage: Number(actor.system?.estagio ?? 0),
    count: actorMagics.length,
    duplicateNames: duplicateNames.map(([name, items]) => ({ name, count: items.length })),
    magics: actorMagics.map((item) => ({ name: item.name, level: item.system?.nivel ?? null, effect: item.system?.efeito ?? null, source: item.flags?.tagmarSync?.mappingStatus ?? "classic-preserved" }))
  });
}
rows.sort((a, b) => b.count - a.count || a.actor.localeCompare(b.actor, "pt-BR"));
const report = {
  generatedAt: new Date().toISOString(), actors: actors.size, actorsWithMagics: rows.length,
  classicActorsWithMagics: [...classicMagicActors.values()].filter(({ items }) => items.length).length,
  unmappedClassic,
  totalMagics: magics.length, uniqueMagicNames: new Set(magics.map((item) => normalize(item.name))).size,
  errors, warnings, rows
};
const output = join(root, ".cache", "tagmar-sync", "creatures", "magic-audit.json");
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, actors: report.actors, actorsWithMagics: report.actorsWithMagics, classicActorsWithMagics: report.classicActorsWithMagics, unmappedClassicWithMagics: unmappedClassic.length, totalMagics: report.totalMagics, uniqueMagicNames: report.uniqueMagicNames, errors, warnings: warnings.length, top: rows.slice(0, 20).map(({ actor, stage, count }) => ({ actor, stage, count })) }, null, 2));
if (errors.length) process.exitCode = 1;
