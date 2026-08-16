import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const reportPath = join(cacheDir, "audit-report.json");
const writeReport = process.argv.includes("--write");

const parts = [
  "personagens",
  "pertences",
  "tesouros",
  "venenos",
  "rituais",
  "moedas",
  "habilidades",
  "combate",
  "defesa",
  "tecnicas",
  "magias",
  "magias-ancestrais",
  "magias-perdidas",
  "magias-dano",
  "magias-cura"
];

const items = [];
const folders = [];
const byPart = {};
for (const part of parts) {
  const partItems = JSON.parse(await readFile(join(cacheDir, `preview-${part}.json`), "utf8"));
  const partFolders = JSON.parse(await readFile(join(cacheDir, `preview-${part}-folders.json`), "utf8"));
  items.push(...partItems);
  folders.push(...partFolders);
  byPart[part] = { items: partItems.length, folders: partFolders.length };
}

const errors = [];
const warnings = [];
const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");
const repeated = (values) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())]
  .filter(([, count]) => count > 1)
  .map(([value, count]) => ({ value, count }));

const itemIds = new Set(items.map((item) => item._id));
const folderIds = new Set(folders.map((folder) => folder._id));
for (const duplicate of repeated(items.map((item) => item._id))) errors.push(`ID de item duplicado: ${duplicate.value}`);
for (const duplicate of repeated(folders.map((folder) => folder._id))) errors.push(`ID de pasta duplicado: ${duplicate.value}`);

for (const folder of folders) {
  if (!folder._id || !folder.name || folder.type !== "Item") errors.push(`Pasta inválida: ${folder.name ?? folder._id ?? "sem identificação"}`);
  if (folder.folder && !folderIds.has(folder.folder)) errors.push(`Pasta órfã: ${folder.name} -> ${folder.folder}`);
  const visited = new Set([folder._id]);
  let parent = folder.folder;
  while (parent) {
    if (visited.has(parent)) {
      errors.push(`Ciclo de pastas detectado em ${folder.name}`);
      break;
    }
    visited.add(parent);
    parent = folders.find((entry) => entry._id === parent)?.folder ?? null;
  }
}

const duplicateDocuments = repeated(items.map((item) => `${item.folder}|${item.type}|${normalize(item.name)}`));
for (const duplicate of duplicateDocuments) warnings.push(`Documento repetido na mesma pasta: ${duplicate.value} (${duplicate.count})`);

for (const item of items) {
  const label = `${item.type ?? "sem tipo"}: ${item.name ?? item._id ?? "sem identificação"}`;
  if (!item._id || !item.name || !item.type || !item.system) errors.push(`Documento incompleto: ${label}`);
  if (!item.folder) errors.push(`Documento na raiz: ${label}`);
  else if (!folderIds.has(item.folder)) errors.push(`Documento em pasta inexistente: ${label} -> ${item.folder}`);
  if (!item.flags?.tagmarSync?.sourceName || !item.flags?.tagmarSync?.sourceUrl) errors.push(`Documento sem origem oficial: ${label}`);
  if (item.flags?.tagmarSync?.needsReview) warnings.push(`Revisão sinalizada: ${label}`);
  const image = String(item.img ?? "");
  if (!image.startsWith("systems/tagmar_rpg/") && !image.startsWith("icons/")) {
    warnings.push(`Imagem fora do sistema ou do núcleo Foundry: ${label} -> ${item.img}`);
  }
}

const magics = items.filter((item) => item.type === "Magia");
const magicNames = new Set(magics.map((item) => normalize(item.name)));
for (const magic of magics) {
  const label = `Magia: ${magic.name}`;
  if (!magic.flags?.tagmarSync?.acquisitionList) errors.push(`${label} sem lista de aquisição`);
  for (const field of ["alcance", "duracao", "evocacao", "efeito"]) {
    if (!String(magic.system?.[field] ?? "").trim()) errors.push(`${label} sem ${field}`);
  }
  const effect = String(magic.system?.efeito ?? "");
  for (const heading of ["Alcance:", "Duração:", "Evocação:"]) {
    if (!effect.includes(heading)) errors.push(`${label} sem cabeçalho ${heading}`);
  }
}

const automatedEffects = items.filter((item) => ["magias-dano", "magias-cura"].includes(item.flags?.tagmarSync?.category));
for (const item of automatedEffects) {
  const sync = item.flags.tagmarSync;
  const label = `${sync.category}: ${item.name}`;
  if (!magicNames.has(normalize(sync.parentMagicName))) errors.push(`${label} sem Magia-pai: ${sync.parentMagicName}`);
  if (!Number.isInteger(Number(sync.effect)) || Number(sync.effect) < 1) errors.push(`${label} com nível de efeito inválido`);
}

const damageEffects = automatedEffects.filter((item) => item.flags.tagmarSync.category === "magias-dano");
for (const item of damageEffects) {
  const damage = item.system?.dano_base ?? {};
  const maximum = Number(item.flags.tagmarSync.maxDamage);
  const expected = {
    d25: Math.ceil(maximum * 0.25),
    d50: Math.ceil(maximum * 0.50),
    d75: Math.ceil(maximum * 0.75),
    d100: Math.ceil(maximum)
  };
  for (const [field, value] of Object.entries(expected)) {
    if (Number(damage[field]) !== value) errors.push(`Dano divergente em ${item.name}.${field}: ${damage[field]} != ${value}`);
  }
}

const healingEffects = automatedEffects.filter((item) => item.flags.tagmarSync.category === "magias-cura");
for (const item of healingEffects) {
  const sync = item.flags.tagmarSync;
  if (!["table", "fixed"].includes(sync.healingMode)) errors.push(`Modo de cura inválido em ${item.name}`);
  if (!["EH", "EF"].includes(sync.healTarget)) errors.push(`Alvo de cura inválido em ${item.name}`);
  if (!Number.isFinite(Number(sync.healAmount)) || Number(sync.healAmount) <= 0) errors.push(`Valor de cura inválido em ${item.name}`);
}

const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const statsByType = Object.fromEntries([...items.reduce((map, item) => map.set(item.type, (map.get(item.type) ?? 0) + 1), new Map())]
  .sort(([a], [b]) => a.localeCompare(b, "pt-BR")));
const statsByCategory = Object.fromEntries([...items.reduce((map, item) => {
  const category = item.flags?.tagmarSync?.category ?? "sem-categoria";
  return map.set(category, (map.get(category) ?? 0) + 1);
}, new Map())].sort(([a], [b]) => a.localeCompare(b, "pt-BR")));

const report = {
  generatedAt: new Date().toISOString(),
  sourceManifestGeneratedAt: manifest.generatedAt,
  status: errors.length ? "error" : warnings.length ? "warning" : "ok",
  totals: {
    items: items.length,
    folders: folders.length,
    uniqueItemIds: itemIds.size,
    uniqueFolderIds: folderIds.size,
    sourcePages: manifest.pages?.length ?? 0,
    uniqueMagics: magicNames.size,
    magicDocuments: magics.length,
    automatedDamageEffects: damageEffects.length,
    automatedHealingEffects: healingEffects.length
  },
  byPart,
  byType: statsByType,
  byCategory: statsByCategory,
  errors,
  warnings
};

if (writeReport) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
