import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));

const edition = "Tagmar 3 Edição Revisada";
const category = "magias";
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

function folderPath(folderById, id) {
  const names = [];
  while (id && folderById.has(id)) {
    const folder = folderById.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}

function labelMatch(html, label) {
  return html.match(new RegExp(`<b[^>]*>\\s*${label}\\s*:?\\s*<\\/b>\\s*:?\\s*(.*?)<br\\s*\\/?>`, "is"));
}

function looseLabelMatch(html, label) {
  return labelMatch(html, label)
    ?? html.match(new RegExp(`${label}\\s*:\\s*(.*?)<br\\s*\\/?>`, "is"));
}

function parseMagicPage(html) {
  const disclaimer = html.match(/<p[^>]*>\s*Esta página contém material oriundo dos livros oficiais.*?<\/p>/is);
  let body = disclaimer ? html.slice((disclaimer.index ?? 0) + disclaimer[0].length) : html;
  const footer = body.search(/<hr[^>]*>\s*<h3[^>]*>\s*(?:Listas|Verbetes)/i);
  if (footer >= 0) body = body.slice(0, footer);

  const labels = ["Evocação", "Alcance", "Duração"];
  const values = Object.fromEntries(labels.map((label) => [label, stripTags(looseLabelMatch(body, label)?.[1] ?? "")]));
  let descriptionStart = 0;
  for (const label of labels) {
    const match = looseLabelMatch(body, label);
    if (match && (match.index ?? 0) + match[0].length > descriptionStart) {
      descriptionStart = (match.index ?? 0) + match[0].length;
    }
  }
  const effect = body
    .slice(descriptionStart)
    .replace(/^\s*(?:<br\s*\/?>\s*)+/i, "")
    .replace(/\s*<\/div>\s*$/i, "")
    .trim();
  return { evocacao: values["Evocação"], alcance: values.Alcance, duracao: values["Duração"], effect };
}

const pages = manifest.pages.filter((page) => page.category === category);
if (!pages.length) throw new Error("Execute sync.mjs --category=magias --write antes de gerar a prévia");
const pageByName = new Map(pages.map((page) => [page.pageName, page]));
const htmlByName = new Map();
async function pageHtml(name) {
  if (!htmlByName.has(name)) {
    const page = pageByName.get(name);
    if (!page) throw new Error(`Página oficial não encontrada no manifesto: ${name}`);
    htmlByName.set(name, await readFile(join(cacheDir, "pages", snapshotFilename(page)), "utf8"));
  }
  return htmlByName.get(name);
}

const acquisitions = [];
function addTable(route, sourcePage, table, expectedCount = null) {
  const rows = rowsFromTable(table).slice(1).filter((cells) => cells.length >= 2 && cells[0]);
  if (expectedCount !== null && rows.length !== expectedCount) {
    throw new Error(`${sourcePage}/${route}: esperadas ${expectedCount} magias; encontradas ${rows.length}`);
  }
  for (const [rawName, cost] of rows) {
    // As siglas entre colchetes são referências editoriais da tabela, não parte do nome do encanto.
    const name = rawName.replace(/\s*\[\s*[^\]]+\]\s*$/u, "").trim();
    const parsedCost = Number.parseInt(cost, 10);
    if (!Number.isInteger(parsedCost)) throw new Error(`Custo inválido para ${name} em ${sourcePage}: ${cost}`);
    acquisitions.push({ route, name, rawName, custo: parsedCost, sourcePage });
  }
}

async function addSingleList(pageName, route) {
  const tables = [...((await pageHtml(pageName)).matchAll(/<table[^>]*>.*?<\/table>/gis))].map((match) => match[0]);
  if (tables.length < 2) throw new Error(`${pageName}: tabela de magias não encontrada`);
  addTable(route, pageName, tables[1]);
}

const rootRoute = "07 - MAGIAS";
const professionRoutes = {
  MAGO: `${rootRoute} / MAGO`,
  SACERDOTE: `${rootRoute} / SACERDOTE`,
  RASTREADOR: `${rootRoute} / RASTREADOR`,
  BARDOS: `${rootRoute} / BARDOS`
};

await addSingleList("Magias dos Magos", `${professionRoutes.MAGO} / BÁSICA`);
await addSingleList("Magias dos Sacerdotes", `${professionRoutes.SACERDOTE} / BÁSICA`);
await addSingleList("Magias dos Rastreadores", `${professionRoutes.RASTREADOR} / BÁSICA`);
await addSingleList("Magias dos Bardos", `${professionRoutes.BARDOS} / BÁSICA`);

const colleges = [
  "Colégio das Ilusões", "Colégio Elemental", "Colégio Necromântico",
  "Colégio Naturalista", "Colégio Alquímico", "Colégio do Conhecimento"
];
for (const college of colleges) await addSingleList(college, `${professionRoutes.MAGO} / ${college.toLocaleUpperCase("pt-BR")}`);

async function addGroupedLists(pageName, parentRoute, groupNames) {
  const tables = [...((await pageHtml(pageName)).matchAll(/<table[^>]*>.*?<\/table>/gis))].map((match) => match[0]);
  if (tables.length !== groupNames.length + 1) {
    throw new Error(`${pageName}: esperadas ${groupNames.length + 1} tabelas; encontradas ${tables.length}`);
  }
  groupNames.forEach((group, index) => addTable(`${parentRoute} / ${group.toLocaleUpperCase("pt-BR")}`, pageName, tables[index + 1]));
}

const orders = [
  "Ordem de Blator", "Ordem de Cambu", "Ordem de Crezir", "Ordem de Crizagom", "Ordem de Cruine",
  "Ordem de Ganis", "Ordem de Lena", "Ordem de Maira", "Ordem de Palier", "Ordem de Parom",
  "Ordem de Plandis", "Ordem de Selimom", "Ordem de Sevides"
];
const trails = ["Trilha dos Caçadores", "Trilha dos Guardiões", "Trilha dos Exploradores"];
const confraternities = ["Confraria dos Artistas", "Confraria dos Arautos", "Confraria dos Eruditos"];
await addGroupedLists("Ordens Sacerdotais", professionRoutes.SACERDOTE, orders);
await addGroupedLists("As Trilhas", professionRoutes.RASTREADOR, trails);
await addGroupedLists("As Confrarias", professionRoutes.BARDOS, confraternities);

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyFolderByNormalizedPath = new Map(legacy.folders.map((folder) => [key(folderPath(legacyFolderById, folder._id)), folder]));
const legacyRouteAliases = new Map([
  [key(`${professionRoutes.MAGO} / BÁSICA`), "07 MAGIAS MAGO BASICA"],
  [key(`${professionRoutes.MAGO} / COLÉGIO DAS ILUSÕES`), "07 MAGIAS MAGO COLEGIO ILUSOES"],
  [key(`${professionRoutes.MAGO} / COLÉGIO DO CONHECIMENTO`), "07 MAGIAS MAGO COLEGIO CONHECIMENTO"],
  [key(`${professionRoutes.SACERDOTE} / ORDEM DE CAMBU`), "07 MAGIAS SACERDOTE ORDEM DE CAMBU"],
  [key(`${professionRoutes.SACERDOTE} / ORDEM DE SELIMOM`), "07 MAGIAS SACERDOTE ORDEM DE SELIMMOM"]
]);
function legacyFolderForRoute(route) {
  return legacyFolderByNormalizedPath.get(legacyRouteAliases.get(key(route)) ?? key(route));
}

const allRoutes = new Set([rootRoute, ...Object.values(professionRoutes)]);
for (const acquisition of acquisitions) {
  const parts = acquisition.route.split(" / ");
  for (let index = 1; index <= parts.length; index += 1) allRoutes.add(parts.slice(0, index).join(" / "));
}
const routes = [...allRoutes].sort((a, b) => {
  const depth = (value) => value.split(" / ").length;
  return depth(a) - depth(b) || a.localeCompare(b, "pt-BR");
});
const folderIds = new Map();
const folderDocuments = routes.map((route, index) => {
  const parentRoute = route.includes(" / ") ? route.slice(0, route.lastIndexOf(" / ")) : null;
  const legacyFolder = legacyFolderForRoute(route);
  const id = stableId("tagmar-t3er-magias-folder", route);
  folderIds.set(route, id);
  const profession = route.split(" / ")[1];
  const defaultColors = { MAGO: "#a1a1a1", SACERDOTE: "#666666", RASTREADOR: "#141414", BARDOS: "#333333" };
  return {
    _id: id,
    name: route.split(" / ").at(-1),
    type: "Item",
    folder: parentRoute ? folderIds.get(parentRoute) : null,
    sorting: "a",
    sort: legacyFolder?.sort ?? index * 10,
    color: legacyFolder?.color ?? defaultColors[profession] ?? "#967b08",
    flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
  };
});

const descriptionPages = pages.filter((page) => page.pageName.startsWith("Magia - "));
const descriptionPageByKey = new Map();
for (const page of descriptionPages) {
  const name = page.pageName.replace(/^Magia - /, "");
  const magicKey = key(name);
  const current = descriptionPageByKey.get(magicKey);
  // Em duplicatas que diferem apenas por caixa, preferimos o título capitalizado da página.
  if (!current || name === name.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("pt-BR"))) {
    descriptionPageByKey.set(magicKey, page);
  }
}
const aliases = new Map([
  ["curas heroicas", "curas heroicas"],
  ["campo abencoado", "campo abencoado"]
]);
const sourceForName = (name) => descriptionPageByKey.get(aliases.get(key(name)) ?? key(name));

const relevantLegacyPrefixes = Object.values(professionRoutes).map((route) => key(route));
const legacyMagicByName = new Map();
for (const item of legacy.items.filter((entry) => entry.type === "Magia")) {
  const route = key(folderPath(legacyFolderById, item.folder));
  if (!relevantLegacyPrefixes.some((prefix) => route.startsWith(prefix))) continue;
  if (!legacyMagicByName.has(key(item.name))) legacyMagicByName.set(key(item.name), item);
}

const parsedPageByKey = new Map();
for (const acquisition of acquisitions) {
  const source = sourceForName(acquisition.name);
  if (!source || parsedPageByKey.has(key(acquisition.name))) continue;
  parsedPageByKey.set(key(acquisition.name), parseMagicPage(await pageHtml(source.pageName)));
}

const items = acquisitions.map((acquisition) => {
  const source = sourceForName(acquisition.name);
  const parsed = parsedPageByKey.get(key(acquisition.name));
  const legacyItem = legacyMagicByName.get(key(acquisition.name));
  const missingMetadata = !parsed?.evocacao || !parsed?.alcance || !parsed?.duracao;
  const alcance = parsed?.alcance ?? legacyItem?.system?.alcance ?? "";
  const evocacao = parsed?.evocacao ?? legacyItem?.system?.evocacao ?? "";
  const duracao = parsed?.duracao ?? legacyItem?.system?.duracao ?? "";
  const metadataHeader = [
    `<strong>Alcance:</strong> ${alcance}`,
    `<strong>Duração:</strong> ${duracao}`,
    `<strong>Evocação:</strong> ${evocacao}`
  ].join("<br/>");
  const effectBody = parsed?.effect ?? legacyItem?.system?.efeito ?? "";
  return {
    _id: stableId("tagmar-t3er-magia", `${acquisition.route}:${acquisition.name}`),
    name: acquisition.name,
    type: "Magia",
    img: legacyItem?.img ?? "icons/svg/explosion.svg",
    folder: folderIds.get(acquisition.route) ?? null,
    system: {
      alcance,
      descricao: "",
      favorito: false,
      custo: acquisition.custo,
      nivel: 0,
      evocacao,
      duracao,
      efeito: `${metadataHeader}<br/><br/>${effectBody}`,
      total: { valor: 0, valorKarma: 0 }
    },
    flags: {
      tagmarSync: {
        edition,
        category,
        origin: "core",
        acquisitionList: acquisition.route,
        acquisitionSourcePage: acquisition.sourcePage,
        acquisitionTableName: acquisition.rawName,
        sourceName: source?.pageName ?? null,
        sourceUrl: source?.url ?? null,
        sourceHash: source?.hash ?? null,
        legacyItemId: legacyItem?._id ?? null,
        needsReview: !source || !parsed?.effect || missingMetadata
      }
    }
  };
});

const uniqueIds = new Set(items.map((item) => item._id));
const uniqueNames = new Set(acquisitions.map((entry) => key(entry.name)));
const missingPages = [...uniqueNames].filter((name) => !descriptionPageByKey.has(aliases.get(name) ?? name));
const unusedDescriptionPages = [...descriptionPageByKey.keys()].filter((name) => !uniqueNames.has(name));
const orphanItems = items.filter((item) => !folderDocuments.some((folder) => folder._id === item.folder));
const orphanFolders = folderDocuments.filter((folder) => folder.folder && !folderDocuments.some((parent) => parent._id === folder.folder));
if (uniqueIds.size !== items.length) throw new Error(`IDs duplicados: ${items.length - uniqueIds.size}`);
if (orphanItems.length || orphanFolders.length) throw new Error(`Órfãos: ${orphanItems.length} itens, ${orphanFolders.length} pastas`);

const countsByRoute = Object.fromEntries([...new Set(acquisitions.map((entry) => entry.route))]
  .sort((a, b) => a.localeCompare(b, "pt-BR"))
  .map((route) => [route, acquisitions.filter((entry) => entry.route === route).length]));
const output = join(cacheDir, "preview-magias.json");
const foldersOutput = join(cacheDir, "preview-magias-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folderDocuments, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  descriptionPages: descriptionPageByKey.size,
  uniqueCoreMagics: uniqueNames.size,
  documents: items.length,
  folders: folderDocuments.length,
  uniqueIds: uniqueIds.size,
  missingPages,
  unusedDescriptionPages: unusedDescriptionPages.length,
  needsReview: items.filter((item) => item.flags.tagmarSync.needsReview).length,
  missingMetadata: items.filter((item) => !item.system.evocacao || !item.system.alcance || !item.system.duracao).map((item) => item.name),
  countsByRoute
}, null, 2));
