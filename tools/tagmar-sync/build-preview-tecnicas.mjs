import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeTechniqueIcon } from "./native-action-icon.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));

const edition = "Tagmar 3 Edição Revisada";
const category = "tecnicas-combate";
const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex")
  .slice(0, 16);
const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");
const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => stripTags(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;

function rowsFromTable(table) {
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]))
  );
}

function labelValue(html, label) {
  const pattern = new RegExp(`<b[^>]*>\\s*${label}\\s*<\\/b>\\s*:\\s*(?:<b[^>]*>\\s*<\\/b>)?\\s*(.*?)<br\\s*\\/?>`, "is");
  return stripTags(html.match(pattern)?.[1] ?? "");
}

function parseDuration(value) {
  const normalized = key(value);
  if (!normalized) return { valor: 1, tipo: "Rodada(s)", mapped: false };
  if (normalized.includes("variavel") || normalized.includes(" ou ")) return { valor: 1, tipo: "Rodada(s)", mapped: false };
  if (normalized.includes("combate")) return { valor: 1, tipo: "Combate", mapped: true };
  if (normalized.includes("ataque")) {
    const count = Number.parseInt(normalized.match(/\d+/)?.[0] ?? "1", 10);
    return { valor: count, tipo: "Ataque(s)", mapped: true };
  }
  if (normalized.includes("rodada")) {
    const count = Number.parseInt(normalized.match(/\d+/)?.[0] ?? "1", 10);
    return { valor: count, tipo: "Rodada(s)", mapped: true };
  }
  return { valor: 1, tipo: "Rodada(s)", mapped: false };
}

function folderPath(legacyFolders, id) {
  const names = [];
  while (id && legacyFolders.has(id)) {
    const folder = legacyFolders.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}

const pages = manifest.pages.filter((page) => page.category === category);
const indexPage = pages.find((page) => page.pageName === "Livro de Regras - Combate");
if (!indexPage) throw new Error("Execute sync.mjs --category=tecnicas-combate --write antes de gerar a prévia");
const indexHtml = await readFile(join(cacheDir, "pages", snapshotFilename(indexPage)), "utf8");
const acquisitionStart = indexHtml.indexOf("Adquirindo Técnicas de Combate");
if (acquisitionStart < 0) throw new Error("Seção de aquisição das Técnicas de Combate não encontrada");
const acquisitionHtml = indexHtml.slice(acquisitionStart);
const tables = [...acquisitionHtml.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
if (tables.length < 5) throw new Error(`Esperadas 5 tabelas de aquisição; encontradas ${tables.length}`);

const acquisitions = [];
const add = (folder, name, cost, attribute, source = "lista") => acquisitions.push({
  folder,
  name: stripTags(name),
  custo: Number.parseInt(cost, 10),
  atributo: stripTags(attribute),
  source
});

// Lista compartilhada por Bardo, Mago, Rastreador e Sacerdote.
for (const cells of rowsFromTable(tables[1]).slice(2)) {
  if (cells.length >= 3) add("Bardo, Mago, Rastreador e Sacerdote", cells[0], cells[1], cells[2]);
}

function parseProfessionTable(table, profession, specialties) {
  let currentGroup = profession;
  for (const cells of rowsFromTable(table).slice(1)) {
    if (cells.length === 5) currentGroup = cells[0];
    const offset = cells.length === 5 ? 1 : 0;
    if (cells.length - offset < 4) continue;
    const [name, cost, reduced, attribute] = cells.slice(offset, offset + 4);
    add(currentGroup, name, cost, attribute);
    if (currentGroup === profession && reduced && reduced !== "-" && specialties.includes(reduced)) {
      add(reduced, name, Math.max(0, Number.parseInt(cost, 10) - 1), attribute, "custo-reduzido");
    }
  }
}

const ladinoSpecialties = ["Guilda dos Assassinos", "Guilda dos Ladrões", "Guilda dos Piratas"];
const guerreiroSpecialties = ["Academia de Infantaria", "Academia dos Arqueiros", "Academia dos Cavaleiros", "Academia dos Gladiadores"];
parseProfessionTable(tables[2], "Ladino", ladinoSpecialties);
parseProfessionTable(tables[3], "Guerreiro", guerreiroSpecialties);
parseProfessionTable(tables[4], "Guerreiro", guerreiroSpecialties);

const folderSpecs = [
  ["06 - TÉCNICAS DE COMBATE", null],
  ["Bardo, Mago, Rastreador e Sacerdote", "06 - TÉCNICAS DE COMBATE"],
  ["Guerreiros", "06 - TÉCNICAS DE COMBATE"],
  ["01 - Básicas", "Guerreiros"],
  ["02 - Academia de Infantaria", "Guerreiros"],
  ["03 - Academia dos Arqueiros", "Guerreiros"],
  ["04 - Academia dos Cavaleiros", "Guerreiros"],
  ["05 - Academia dos Gladiadores", "Guerreiros"],
  ["Ladinos", "06 - TÉCNICAS DE COMBATE"],
  ["01 - Básicas", "Ladinos"],
  ["02 - Guilda dos Assassinos", "Ladinos"],
  ["03 - Guilda dos Ladrões", "Ladinos"],
  ["04 - Guilda dos Piratas", "Ladinos"]
];
const routeForAcquisition = new Map([
  ["Bardo, Mago, Rastreador e Sacerdote", "06 - TÉCNICAS DE COMBATE / Bardo, Mago, Rastreador e Sacerdote"],
  ["Guerreiro", "06 - TÉCNICAS DE COMBATE / Guerreiros / 01 - Básicas"],
  ["Academia de Infantaria", "06 - TÉCNICAS DE COMBATE / Guerreiros / 02 - Academia de Infantaria"],
  ["Academia dos Arqueiros", "06 - TÉCNICAS DE COMBATE / Guerreiros / 03 - Academia dos Arqueiros"],
  ["Academia dos Cavaleiros", "06 - TÉCNICAS DE COMBATE / Guerreiros / 04 - Academia dos Cavaleiros"],
  ["Academia dos Gladiadores", "06 - TÉCNICAS DE COMBATE / Guerreiros / 05 - Academia dos Gladiadores"],
  ["Ladino", "06 - TÉCNICAS DE COMBATE / Ladinos / 01 - Básicas"],
  ["Guilda dos Assassinos", "06 - TÉCNICAS DE COMBATE / Ladinos / 02 - Guilda dos Assassinos"],
  ["Guilda dos Ladrões", "06 - TÉCNICAS DE COMBATE / Ladinos / 03 - Guilda dos Ladrões"],
  ["Guilda dos Piratas", "06 - TÉCNICAS DE COMBATE / Ladinos / 04 - Guilda dos Piratas"]
]);

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [folderPath(legacyFolderById, folder._id), folder]));
const folderIds = new Map();
const folderDocuments = [];
for (const [name, parentName] of folderSpecs) {
  let route;
  if (!parentName) route = name;
  else if (parentName === "Guerreiros" || parentName === "Ladinos") route = `06 - TÉCNICAS DE COMBATE / ${parentName} / ${name}`;
  else route = `06 - TÉCNICAS DE COMBATE / ${name}`;
  const parentRoute = route.includes(" / ") ? route.slice(0, route.lastIndexOf(" / ")) : null;
  const legacyFolder = legacyFolderByPath.get(route);
  const id = stableId("tagmar-t3er-tecnicas-folder", route);
  folderIds.set(route, id);
  folderDocuments.push({
    _id: id,
    name,
    type: "Item",
    folder: parentRoute ? folderIds.get(parentRoute) : null,
    sorting: "a",
    sort: legacyFolder?.sort ?? folderDocuments.length * 10,
    color: legacyFolder?.color ?? "#b6c214",
    flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
  });
}

const sourceByTechnique = new Map();
for (const page of pages.filter((entry) => entry !== indexPage)) {
  const name = page.pageName
    .replace(/^Técnicas? de Combate - /i, "")
    .replace(/^Livro de Regras - Técnicas de combate - /i, "");
  sourceByTechnique.set(key(name), page);
}
const legacyTechniques = new Map();
for (const item of legacy.items.filter((item) => item.type === "Tecnica_Combate")) {
  if (!legacyTechniques.has(key(item.name))) legacyTechniques.set(key(item.name), item);
}

const attributeMap = new Map([
  ["percepcao", "PER"], ["fisico", "FIS"], ["forca", "FOR"], ["agilidade", "AGI"],
  ["aura", "AUR"], ["carisma", "CAR"], ["intelecto", "INT"], ["", ""], ["-", ""]
]);
const mechanicMap = new Map([
  ["bonus de fa", 0], ["efeito de nivel", 1], ["rolamento de dados", 2],
  ["bonus especial", 3], ["bonus especiais", 3], ["aprimoramento", 4], ["aprimoramento de tecnica", 4]
]);
const mechanicKey = (value) => key(value)
  .replace(/^efeitos? de niveis?$/, "efeito de nivel")
  .replace(/^bonus especiais?$/, "bonus especial")
  .replace(/^aprimoramento(?: de tecnica)?$/, "aprimoramento");
const techniqueData = new Map();
for (const [techniqueKey, source] of sourceByTechnique) {
  const html = await readFile(join(cacheDir, "pages", snapshotFilename(source)), "utf8");
  const atributoTexto = labelValue(html, "Atributo");
  const duracaoTexto = labelValue(html, "Duração");
  const mecanicaTexto = labelValue(html, "Mecânica");
  const restricao = labelValue(html, "Restrição");
  const testeTexto = labelValue(html, "Teste(?: de)? resistência");
  const prerequisito = labelValue(html, "Pré-requisito");
  const knownLabels = "Atributo|Duração|Mecânica|Restrição|Teste(?: de)? resistência|Pré-requisito";
  const matches = [...html.matchAll(new RegExp(`<b[^>]*>\\s*(?:${knownLabels})\\s*<\\/b>\\s*:.*?<br\\s*\\/?>(?:\\s*<br\\s*\\/?>)?`, "gis"))];
  const descriptionStart = matches.length ? matches.at(-1).index + matches.at(-1)[0].length : 0;
  const description = html.slice(descriptionStart).replace(/^\s*(?:<br\s*\/?>\s*)+/i, "").trim();
  techniqueData.set(techniqueKey, {
    source,
    atributoTexto,
    atributo: key(atributoTexto).startsWith("fisico") ? "FIS" : (attributeMap.get(key(atributoTexto)) ?? null),
    duracaoTexto,
    duracao: parseDuration(duracaoTexto),
    mecanicaTexto,
    mecanica: mechanicMap.get(mechanicKey(mecanicaTexto)),
    restricao,
    testeTexto,
    prerequisito,
    description
  });
}

const prerequisiteTargets = new Set([...techniqueData.values()].map((entry) => key(entry.prerequisito)).filter(Boolean));
for (const item of legacy.items.filter((entry) => entry.type === "Tecnica_Combate")) {
  const prerequisite = item.system?.pre_requisito?.tecnica;
  if (prerequisite) prerequisiteTargets.add(key(prerequisite));
}
const items = acquisitions.map((acquisition) => {
  const techniqueKey = key(acquisition.name);
  const data = techniqueData.get(techniqueKey);
  const route = routeForAcquisition.get(acquisition.folder);
  const legacyItem = legacyTechniques.get(techniqueKey);
  const acquisitionAttribute = key(acquisition.atributo).startsWith("fisico")
    ? "FIS"
    : (attributeMap.get(key(acquisition.atributo)) ?? null);
  const legacyFallback = {
    descricao: legacyItem?.system?.descricao ?? "",
    mecanica: Number.parseInt(legacyItem?.system?.mecanica ?? "0", 10),
    duracao: legacyItem?.system?.duracao ?? { valor: 1, tipo: "Rodada(s)" },
    restricao: legacyItem?.system?.restricao ?? "",
    teste: legacyItem?.system?.teste ?? "Não",
    prerequisito: legacyItem?.system?.pre_requisito ?? { valor: "Não", tecnica: "" }
  };
  const usedLegacyMechanic = data?.mecanica === undefined;
  const usedLegacyDescription = !data?.description || usedLegacyMechanic;
  const usedLegacyDuration = !data?.duracao?.mapped;
  const sourceDetails = [
    data?.testeTexto ? `<p><strong>Teste de resistência:</strong> ${data.testeTexto}</p>` : "",
    usedLegacyDuration && data?.duracaoTexto ? `<p><strong>Duração oficial:</strong> ${data.duracaoTexto}</p>` : ""
  ].join("");
  const needsReview = !data || acquisitionAttribute === null || (usedLegacyMechanic && !legacyItem) || (usedLegacyDuration && !legacyItem);
  return {
    _id: stableId("tagmar-t3er-tecnica", `${route}:${acquisition.name}`),
    name: acquisition.name,
    type: "Tecnica_Combate",
    img: nativeTechniqueIcon(acquisition.name, legacyItem?.img),
    folder: folderIds.get(route) ?? null,
    system: {
      custo: acquisition.custo,
      nivel: 0,
      descricao: `${sourceDetails}${usedLegacyDescription ? legacyFallback.descricao : data.description}`,
      ajuste: { atributo: acquisitionAttribute ?? data?.atributo ?? "", valor: 0 },
      fa: 0,
      mecanica: data?.mecanica ?? legacyFallback.mecanica,
      duracao: usedLegacyDuration ? legacyFallback.duracao : { valor: data.duracao.valor, tipo: data.duracao.tipo },
      teste: data?.testeTexto ? "Sim" : legacyFallback.teste,
      restricao: data?.restricao || legacyFallback.restricao,
      pre_requisito: data?.prerequisito
        ? { valor: "Sim", tecnica: data.prerequisito }
        : legacyFallback.prerequisito,
      complemento: prerequisiteTargets.has(techniqueKey) ? "Sim" : "Não",
      bonus: 0
    },
    flags: {
      tagmarSync: {
        edition,
        category,
        acquisitionList: acquisition.folder,
        acquisitionSource: acquisition.source,
        sourceName: data?.source.pageName ?? null,
        sourceUrl: data?.source.url ?? null,
        sourceHash: data?.source.hash ?? null,
        sourceAttribute: data?.atributoTexto ?? null,
        sourceDuration: data?.duracaoTexto ?? null,
        sourceMechanic: data?.mecanicaTexto ?? null,
        sourceResistanceTest: data?.testeTexto ?? null,
        usedLegacyDescription,
        usedLegacyMechanic,
        usedLegacyDuration,
        needsMechanicalReview: needsReview,
        legacyItemId: legacyItem?._id ?? null
      }
    }
  };
});

const uniqueNames = new Set(items.map((item) => key(item.name)));
const missingPages = [...uniqueNames].filter((name) => !techniqueData.has(name));
const unusedPages = [...techniqueData.keys()].filter((name) => !uniqueNames.has(name));
const needsReview = items.filter((item) => item.flags.tagmarSync.needsMechanicalReview);
const output = join(cacheDir, "preview-tecnicas.json");
const foldersOutput = join(cacheDir, "preview-tecnicas-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folderDocuments, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  sourcePages: techniqueData.size,
  uniqueTechniques: uniqueNames.size,
  documents: items.length,
  folders: folderDocuments.length,
  missingPages,
  unusedPages,
  needsReview: needsReview.length,
  reviewFields: needsReview.slice(0, 20).map((item) => ({
    name: item.name,
    lista: item.flags.tagmarSync.acquisitionList,
    atributo: item.flags.tagmarSync.sourceAttribute,
    duracao: item.flags.tagmarSync.sourceDuration,
    mecanica: item.flags.tagmarSync.sourceMechanic
  }))
}, null, 2));
