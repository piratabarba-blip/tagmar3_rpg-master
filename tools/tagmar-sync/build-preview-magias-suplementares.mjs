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

const specs = [
  {
    category: "magias-ancestrais",
    origin: "ancestral",
    rootRoute: "08 - MAGIAS ANCESTRAIS",
    listPage: "Livro das Magias Perdidas - Magias Ancestrais",
    routes: [
      "RASTREADOR / TODAS AS TRILHAS", "RASTREADOR / TRILHA DOS CAÇADORES",
      "RASTREADOR / TRILHA DOS EXPLORADORES", "RASTREADOR / TRILHA DOS GUARDIÕES",
      "BARDOS / TODAS AS CONFRARIAS", "BARDOS / CONFRARIA DOS ARTISTAS",
      "BARDOS / CONFRARIA DOS ARAUTOS", "BARDOS / CONFRARIA DOS ERUDITOS",
      "SACERDOTE / TODAS AS ORDENS", "SACERDOTE / ORDEM DE CAMBU",
      "SACERDOTE / ORDEM DE CRIZAGOM", "SACERDOTE / ORDEM DE GANIS",
      "SACERDOTE / ORDEM DE MAIRA", "SACERDOTE / ORDEM DE PALIER",
      "SACERDOTE / ORDEM DE PLANDIS", "SACERDOTE / ORDEM DE BLATOR",
      "SACERDOTE / ORDEM DE CREZIR", "SACERDOTE / ORDEM DE CRUINE",
      "SACERDOTE / ORDEM DE LENA", "SACERDOTE / ORDENS DE SEVIDES, LIRIS E QUIRIS",
      "SACERDOTE / ORDEM DE PAROM", "SACERDOTE / ORDEM DE SELIMOM",
      "MAGO / TODOS OS COLÉGIOS", "MAGO / COLÉGIO ALQUÍMICO",
      "MAGO / COLÉGIO ELEMENTAL", "MAGO / COLÉGIO NATURALISTA",
      "MAGO / COLÉGIO DO CONHECIMENTO", "MAGO / COLÉGIO DAS ILUSÕES",
      "MAGO / COLÉGIO NECROMÂNTICO"
    ]
  },
  {
    category: "magias-perdidas",
    origin: "lost",
    rootRoute: "09 - MAGIAS PERDIDAS",
    listPage: "Livro das Magias Perdidas - Magias Perdidas",
    routes: [
      "RASTREADOR / BÁSICA", "RASTREADOR / TRILHA DOS CAÇADORES",
      "RASTREADOR / TRILHA DOS EXPLORADORES", "RASTREADOR / TRILHA DOS GUARDIÕES",
      "BARDOS / BÁSICA", "BARDOS / CONFRARIA DOS ARAUTOS",
      "BARDOS / CONFRARIA DOS ARTISTAS", "BARDOS / CONFRARIA DOS ERUDITOS",
      "MAGO / BÁSICA", "MAGO / COLÉGIO ALQUÍMICO", "MAGO / COLÉGIO DO CONHECIMENTO",
      "MAGO / COLÉGIO ELEMENTAL", "MAGO / COLÉGIO DAS ILUSÕES",
      "MAGO / COLÉGIO NATURALISTA", "MAGO / COLÉGIO NECROMÂNTICO",
      "SACERDOTE / BÁSICA", "SACERDOTE / ORDEM DE BLATOR", "SACERDOTE / ORDEM DE BLATOR",
      "SACERDOTE / ORDEM DE CAMBU", "SACERDOTE / ORDEM DE CAMBU",
      "SACERDOTE / ORDEM DE CREZIR", "SACERDOTE / ORDEM DE CRIZAGOM",
      "SACERDOTE / ORDEM DE CRUINE", "SACERDOTE / ORDEM DE GANIS",
      "SACERDOTE / ORDEM DE LENA", "SACERDOTE / ORDEM DE MAIRA",
      "SACERDOTE / ORDEM DE PALIER", "SACERDOTE / ORDEM DE PAROM",
      "SACERDOTE / ORDEM DE PLANDIS", "SACERDOTE / ORDEM DE SELIMOM",
      "SACERDOTE / ORDENS DE SEVIDES, LIRIS E QUIRIS"
    ]
  }
];

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

function looseLabelMatch(html, label) {
  return html.match(new RegExp(`<b[^>]*>\\s*${label}\\s*:?\\s*<\\/b>\\s*:?\\s*(.*?)<br\\s*\\/?>`, "is"))
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
    if (match && (match.index ?? 0) + match[0].length > descriptionStart) descriptionStart = (match.index ?? 0) + match[0].length;
  }
  const effect = body.slice(descriptionStart)
    .replace(/^\s*(?:<br\s*\/?>\s*)+/i, "")
    .replace(/\s*<\/div>\s*$/i, "")
    .trim();
  return { evocacao: values["Evocação"], alcance: values.Alcance, duracao: values["Duração"], effect };
}

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [key(folderPath(legacyFolderById, folder._id)), folder]));
const legacyMagicByName = new Map();
for (const item of legacy.items.filter((entry) => entry.type === "Magia")) {
  if (!legacyMagicByName.has(key(item.name))) legacyMagicByName.set(key(item.name), item);
}

for (const spec of specs) {
  const pages = manifest.pages.filter((page) => page.category === spec.category);
  if (!pages.length) throw new Error(`Execute sync.mjs --category=${spec.category} --write antes de gerar a prévia`);
  const pageByName = new Map(pages.map((page) => [page.pageName, page]));
  async function pageHtml(name) {
    const page = pageByName.get(name);
    if (!page) throw new Error(`${spec.category}: página oficial não encontrada: ${name}`);
    return readFile(join(cacheDir, "pages", snapshotFilename(page)), "utf8");
  }

  const listHtml = await pageHtml(spec.listPage);
  const tables = [...listHtml.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]).slice(1);
  if (tables.length !== spec.routes.length) {
    throw new Error(`${spec.category}: esperadas ${spec.routes.length} tabelas; encontradas ${tables.length}`);
  }

  const acquisitionByKey = new Map();
  tables.forEach((table, index) => {
    const route = `${spec.rootRoute} / ${spec.routes[index]}`;
    for (const cells of rowsFromTable(table).slice(1)) {
      if (cells.length < 2 || !cells[0]) continue;
      const rawName = cells[0];
      const name = rawName.replace(/\s*\[\s*[^\]]+\]\s*$/u, "").trim();
      const custo = Number.parseInt(cells[1], 10);
      if (!Number.isInteger(custo)) throw new Error(`${spec.category}: custo inválido para ${name}: ${cells[1]}`);
      const acquisitionKey = `${key(route)}:${key(name)}`;
      if (!acquisitionByKey.has(acquisitionKey)) {
        acquisitionByKey.set(acquisitionKey, { route, name, rawName, custo, sourcePage: spec.listPage });
      }
    }
  });
  const acquisitions = [...acquisitionByKey.values()];

  const allRoutes = new Set([spec.rootRoute]);
  for (const acquisition of acquisitions) {
    const parts = acquisition.route.split(" / ");
    for (let index = 1; index <= parts.length; index += 1) allRoutes.add(parts.slice(0, index).join(" / "));
  }
  const routes = [...allRoutes].sort((a, b) => {
    const depth = (value) => value.split(" / ").length;
    return depth(a) - depth(b) || a.localeCompare(b, "pt-BR");
  });
  const folderIds = new Map();
  const folders = routes.map((route, index) => {
    const parentRoute = route.includes(" / ") ? route.slice(0, route.lastIndexOf(" / ")) : null;
    const legacyFolder = legacyFolderByPath.get(key(route));
    const id = stableId(`tagmar-t3er-${spec.category}-folder`, route);
    folderIds.set(route, id);
    const profession = route.split(" / ")[1];
    const colors = { MAGO: "#a1a1a1", SACERDOTE: "#666666", RASTREADOR: "#141414", BARDOS: "#333333" };
    return {
      _id: id,
      name: route.split(" / ").at(-1),
      type: "Item",
      folder: parentRoute ? folderIds.get(parentRoute) : null,
      sorting: "a",
      sort: legacyFolder?.sort ?? index * 10,
      color: legacyFolder?.color ?? colors[profession] ?? (spec.origin === "ancestral" ? "#d5bd2c" : "#7d19b5"),
      flags: { tagmarSync: { edition, category: spec.category, route, legacyFolderId: legacyFolder?._id ?? null } }
    };
  });

  const descriptionByKey = new Map();
  const descriptionTitlesByKey = new Map();
  for (const page of pages.filter((entry) => entry.pageName.startsWith("Magia - "))) {
    const name = page.pageName.replace(/^Magia - /, "");
    const magicKey = key(name);
    if (!descriptionTitlesByKey.has(magicKey)) descriptionTitlesByKey.set(magicKey, []);
    descriptionTitlesByKey.get(magicKey).push(name);
    if (!descriptionByKey.has(magicKey)) descriptionByKey.set(magicKey, page);
  }
  const parsedByKey = new Map();
  for (const acquisition of acquisitions) {
    const magicKey = key(acquisition.name);
    const source = descriptionByKey.get(magicKey);
    if (source && !parsedByKey.has(magicKey)) parsedByKey.set(magicKey, parseMagicPage(await pageHtml(source.pageName)));
  }

  const items = acquisitions.map((acquisition) => {
    const magicKey = key(acquisition.name);
    const source = descriptionByKey.get(magicKey);
    const parsed = parsedByKey.get(magicKey);
    const legacyItem = legacyMagicByName.get(magicKey);
    const alcance = parsed?.alcance ?? legacyItem?.system?.alcance ?? "";
    const evocacao = parsed?.evocacao ?? legacyItem?.system?.evocacao ?? "";
    const duracao = parsed?.duracao ?? legacyItem?.system?.duracao ?? "";
    const header = [
      `<strong>Alcance:</strong> ${alcance}`,
      `<strong>Duração:</strong> ${duracao}`,
      `<strong>Evocação:</strong> ${evocacao}`
    ].join("<br/>");
    return {
      _id: stableId(`tagmar-t3er-${spec.category}`, `${acquisition.route}:${acquisition.name}`),
      name: acquisition.name,
      type: "Magia",
      img: legacyItem?.img ?? "icons/svg/explosion.svg",
      folder: folderIds.get(acquisition.route),
      system: {
        alcance,
        descricao: "",
        favorito: false,
        custo: acquisition.custo,
        nivel: 0,
        evocacao,
        duracao,
        efeito: `${header}<br/><br/>${parsed?.effect ?? legacyItem?.system?.efeito ?? ""}`,
        total: { valor: 0, valorKarma: 0 }
      },
      flags: {
        tagmarSync: {
          edition,
          category: spec.category,
          origin: spec.origin,
          acquisitionList: acquisition.route,
          acquisitionSourcePage: acquisition.sourcePage,
          acquisitionTableName: acquisition.rawName,
          sourceName: source?.pageName ?? null,
          sourceUrl: source?.url ?? null,
          sourceHash: source?.hash ?? null,
          legacyItemId: legacyItem?._id ?? null,
          needsReview: !source || !parsed?.effect || !alcance || !evocacao || !duracao
        }
      }
    };
  });

  const itemIds = new Set(items.map((item) => item._id));
  const folderIdSet = new Set(folders.map((folder) => folder._id));
  if (itemIds.size !== items.length) throw new Error(`${spec.category}: IDs de item duplicados`);
  if (items.some((item) => !folderIdSet.has(item.folder))) throw new Error(`${spec.category}: item órfão`);
  if (folders.some((folder) => folder.folder && !folderIdSet.has(folder.folder))) throw new Error(`${spec.category}: pasta órfã`);

  const output = join(cacheDir, `preview-${spec.category}.json`);
  const foldersOutput = join(cacheDir, `preview-${spec.category}-folders.json`);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await writeFile(foldersOutput, `${JSON.stringify(folders, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    category: spec.category,
    output,
    foldersOutput,
    sourceTables: tables.length,
    uniqueDescriptions: descriptionByKey.size,
    documents: items.length,
    uniqueMagics: new Set(items.map((item) => key(item.name))).size,
    folders: folders.length,
    needsReview: items.filter((item) => item.flags.tagmarSync.needsReview).length,
    missingDescriptions: [...new Set(items.filter((item) => !item.flags.tagmarSync.sourceName).map((item) => item.name))],
    unlistedDescriptions: [...descriptionByKey.keys()]
      .filter((magicKey) => !items.some((item) => key(item.name) === magicKey))
      .map((magicKey) => descriptionTitlesByKey.get(magicKey)[0]),
    duplicateDescriptionTitles: [...descriptionTitlesByKey.values()].filter((titles) => titles.length > 1)
  }, null, 2));
}
