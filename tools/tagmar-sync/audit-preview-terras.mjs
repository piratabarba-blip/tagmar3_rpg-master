import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const reportPath = join(cacheDir, "audit-terras-report.json");
const writeReport = process.argv.includes("--write");
const parts = ["terras-personagens", "terras-combate", "terras-defesa", "terras-tecnicas", "terras-magias"];
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
const folderById = new Map(folders.map((folder) => [folder._id, folder]));
for (const folder of folders) {
  if (!folder._id || !folder.name || folder.type !== "Item") errors.push(`Pasta inválida: ${folder.name ?? folder._id}`);
  if (folder.folder && !folderIds.has(folder.folder)) errors.push(`Pasta órfã: ${folder.name}`);
  let depth = 1;
  let parent = folder.folder ? folderById.get(folder.folder) : null;
  while (parent) {
    depth += 1;
    parent = parent.folder ? folderById.get(parent.folder) : null;
  }
  if (depth > 3) errors.push(`Pasta excede o limite de profundidade do compêndio: ${folder.name} (${depth})`);
}
for (const item of items) {
  const label = `${item.type}: ${item.name}`;
  if (!item._id || !item.name || !item.type || !item.system) errors.push(`Item incompleto: ${label}`);
  if (!folderIds.has(item.folder)) errors.push(`Item em pasta inexistente: ${label}`);
  if (!item.flags?.tagmarSync?.sourceName || !item.flags?.tagmarSync?.sourceUrl) errors.push(`Item sem fonte: ${label}`);
  if (item.flags?.tagmarSync?.needsReview) warnings.push(`Revisão sinalizada: ${label}`);
  const description = item.type === "Magia" ? item.system?.efeito : item.system?.descricao;
  if (!String(description ?? "").trim()) errors.push(`Item sem descrição: ${label}`);
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
for (const defense of items.filter((item) => item.type === "Defesa")) {
  for (const field of ["absorcao", "fis_min", "for_min"]) {
    if (!Number.isInteger(defense.system?.[field])) errors.push(`${defense.name} sem ${field}`);
  }
  if (!Number.isInteger(defense.system?.defesa_base?.valor)) errors.push(`${defense.name} sem valor de defesa base`);
  if (!defense.flags?.tagmarSync?.legacyItemId) errors.push(`${defense.name} sem referência mecânica clássica`);
}
for (const technique of items.filter((item) => item.flags?.tagmarSync?.officialCategory === "Perícia")) {
  if (technique.type !== "Habilidade") errors.push(`${technique.name} não preserva a categoria oficial Perícia`);
  if (technique.system?.ajuste?.atributo !== "FIS") errors.push(`${technique.name} sem atributo Físico`);
  if (technique.system?.nivel !== 0 || technique.system?.total !== -7) errors.push(`${technique.name} sem regra inicial de -7`);
  if (technique.system?.nao_rolar_sem_nivel !== false) errors.push(`${technique.name} bloqueia teste sem nível`);
  if (technique.flags?.tagmarSync?.officialAcquisitionCost !== null || technique.flags?.tagmarSync?.manualAcquisition !== true) {
    errors.push(`${technique.name} inventa ou omite a administração manual do custo não publicado`);
  }
}
for (const magic of items.filter((item) => item.type === "Magia")) {
  if (!Number.isInteger(magic.system?.custo) || magic.system.custo < 1) errors.push(`${magic.name} com custo inválido`);
  for (const field of ["alcance", "duracao", "evocacao"]) {
    if (!String(magic.system?.[field] ?? "").trim()) errors.push(`${magic.name} sem ${field}`);
  }
  if (!magic.system?.efeito?.includes("<strong>Alcance:</strong>")
    || !magic.system?.efeito?.includes("<strong>Duração:</strong>")
    || !magic.system?.efeito?.includes("<strong>Evocação:</strong>")) {
    errors.push(`${magic.name} sem cabeçalho visível completo`);
  }
  if (!magic.flags?.tagmarSync?.acquisitionList || !magic.flags?.tagmarSync?.acquisitionTableName) {
    errors.push(`${magic.name} sem origem de aquisição`);
  }
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
    weapons: items.filter((item) => item.type === "Combate").length,
    defenses: items.filter((item) => item.type === "Defesa").length,
    wildernessTechniques: items.filter((item) => item.flags?.tagmarSync?.officialCategory === "Perícia").length,
    magics: items.filter((item) => item.type === "Magia").length,
    uniqueMagics: new Set(items.filter((item) => item.type === "Magia").map((item) => item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"))).size
  },
  byPart,
  errors,
  warnings
};
if (writeReport) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
