import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const reportPath = join(cacheDir, "audit-terras-report.json");
const writeReport = process.argv.includes("--write");
const parts = ["terras-personagens", "terras-combate"];
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
const repeated = (values) => [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map())]
  .filter(([, count]) => count > 1);
for (const [id] of repeated(items.map((item) => item._id))) errors.push(`ID de item duplicado: ${id}`);
for (const [id] of repeated(folders.map((folder) => folder._id))) errors.push(`ID de pasta duplicado: ${id}`);
const folderIds = new Set(folders.map((folder) => folder._id));
for (const folder of folders) {
  if (!folder._id || !folder.name || folder.type !== "Item") errors.push(`Pasta inválida: ${folder.name ?? folder._id}`);
  if (folder.folder && !folderIds.has(folder.folder)) errors.push(`Pasta órfã: ${folder.name}`);
}
for (const item of items) {
  const label = `${item.type}: ${item.name}`;
  if (!item._id || !item.name || !item.type || !item.system) errors.push(`Item incompleto: ${label}`);
  if (!folderIds.has(item.folder)) errors.push(`Item em pasta inexistente: ${label}`);
  if (!item.flags?.tagmarSync?.sourceName || !item.flags?.tagmarSync?.sourceUrl) errors.push(`Item sem fonte: ${label}`);
  if (item.flags?.tagmarSync?.needsReview) warnings.push(`Revisão sinalizada: ${label}`);
  if (!String(item.system?.descricao ?? "").trim()) errors.push(`Item sem descrição: ${label}`);
}
for (const race of items.filter((item) => item.type === "Raca")) {
  for (const attribute of ["INT", "AUR", "CAR", "FOR", "FIS", "AGI", "PER"]) {
    if (!Number.isInteger(race.system?.mod_racial?.[attribute])) errors.push(`${race.name} sem modificador ${attribute}`);
  }
  if (!Number.isInteger(race.system?.ef_base) || race.system.ef_base < 1) errors.push(`${race.name} com EF inválida`);
  if (!Number.isInteger(race.system?.vb) || race.system.vb < 1) errors.push(`${race.name} com VB inválida`);
}
for (const profession of items.filter((item) => item.type === "Profissao")) {
  if (!profession.system?.especializacoes?.endsWith(",")) errors.push(`${profession.name} sem especializações válidas`);
  if (!Number.isInteger(profession.system?.eh_base) || profession.system.eh_base < 1) errors.push(`${profession.name} com EH inválida`);
  for (const field of ["p_hab", "p_tec", "p_gra", "p_mag"]) {
    if (!Number.isInteger(profession.system?.p_aquisicao?.[field])) errors.push(`${profession.name} sem ${field}`);
  }
}
for (const weapon of items.filter((item) => item.type === "Combate")) {
  for (const field of ["def_l", "def_m", "def_p", "forca_min"]) {
    if (!Number.isInteger(weapon.system?.[field])) errors.push(`${weapon.name} sem ${field}`);
  }
  for (const percentage of [25, 50, 75, 100]) {
    if (!Number.isInteger(weapon.system?.dano_base?.[`d${percentage}`])) errors.push(`${weapon.name} sem dano ${percentage}%`);
  }
  if (!weapon.flags?.tagmarSync?.legacyItemId) errors.push(`${weapon.name} sem referência mecânica clássica`);
}

const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const report = {
  generatedAt: new Date().toISOString(),
  sourceManifestGeneratedAt: manifest.generatedAt,
  status: errors.length ? "error" : warnings.length ? "warning" : "ok",
  totals: {
    items: items.length,
    folders: folders.length,
    races: items.filter((item) => item.type === "Raca").length,
    professions: items.filter((item) => item.type === "Profissao").length,
    weapons: items.filter((item) => item.type === "Combate").length
  },
  byPart,
  errors,
  warnings
};
if (writeReport) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
