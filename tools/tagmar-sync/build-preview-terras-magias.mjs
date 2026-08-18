import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TERRAS_ATS_PDF_FALLBACKS, TERRAS_ATS_PDF_URL, renderTerrasPdfFallback
} from "./terras-pdf-fallbacks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const edition = "Aventuras nas Terras Selvagens";
const category = "terras-selvagens";
const listPage = "LATS - Tabelas das Magias das Profissões e Especializações";
const rootRoute = "07 - MAGIAS TERRAS SELVAGENS";

const routes = [
  "BARDOS / CONFRARIA DOS ILUMINADOS", "BARDOS / CONFRARIA DOS ENCANTADORES",
  "BERSERKER / RITOS BÁSICOS", "BERSERKER / TRADIÇÃO DO FERRO",
  "BERSERKER / TRADIÇÃO DO MISTICISMO", "BERSERKER / TRADIÇÃO DA HERANÇA",
  "BERSERKER / TRADIÇÃO DO SANGUE", "BERSERKER / TRADIÇÃO DA FERA",
  "FEITICEIRO / FEITIÇOS BÁSICOS", "FEITICEIRO / CAMINHO DA BRUXARIA",
  "FEITICEIRO / CAMINHO DO DESTINO", "FEITICEIRO / CAMINHO DO DRUIDISMO",
  "FEITICEIRO / CAMINHO DOS SONHOS", "FEITICEIRO / CAMINHO DO XAMANISMO",
  "FEITICEIRO / CAMINHO DRACÔNICO", "MAGO / COLÉGIO CRONOMÂNTICO",
  "MAGO / COLÉGIO SOMBRIO — NAARI", "MAGO / COLÉGIO SOMBRIO — AAROIM",
  "RASTREADOR / TRILHA DA NOITE", "RASTREADOR / TRILHA DOS MESTRES DAS FERAS"
];

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const stripTags = (value) => decodeEntities(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => stripTags(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const baseName = (value) => stripTags(value)
  .replace(/\s*\(\s*revis[aã]o\s*\)?\s*$/iu, "")
  .replace(/\s*[-–—]\s*revis[aã]o\s*$/iu, "").trim();
const baseKey = (value) => key(baseName(value));
const isRevision = (value) => /revis[aã]o/iu.test(value);
const pdfFallbackByKey = new Map(TERRAS_ATS_PDF_FALLBACKS.map((fallback) => [baseKey(fallback.name), fallback]));
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;

function rowsFromTable(table) {
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]))
  );
}

function parseMagicPage(html) {
  let body = html.replace(/^\s*<h4[^>]*>.*?<\/h4>/is, "");
  const officialContentMissing = /Esta página ainda não possui conteúdo/iu.test(body);
  const labelValue = (label) => {
    const bold = body.match(new RegExp(`<b[^>]*>\\s*${label}\\s*:?\\s*<\\/b>\\s*:?\\s*(.*?)<\\/p>`, "is"));
    if (bold) return stripTags(bold[1]);
    const plain = stripTags(body).match(new RegExp(`${label}\\s*:\\s*([^.;]+[.;]?)`, "i"));
    return plain?.[1]?.trim() ?? "";
  };
  const alcance = labelValue("Alcance");
  const duracao = labelValue("Dura(?:ç|&ccedil;|&#231;)ão");
  const evocacao = labelValue("Evoca(?:ç|&ccedil;|&#231;)ão");
  for (const label of ["Alcance", "Dura(?:ç|&ccedil;|&#231;)ão", "Evoca(?:ç|&ccedil;|&#231;)ão"]) {
    body = body.replace(new RegExp(`<p[^>]*>\\s*<b[^>]*>\\s*${label}\\s*:?\\s*<\\/b>.*?<\\/p>`, "gis"), "");
  }
  body = body.replace(/<p>\s*<\/p>/gi, "").trim();
  if (officialContentMissing) {
    body = "<p><strong>Conteúdo pendente na fonte oficial.</strong> A magia consta na tabela oficial de aquisição, mas seu verbete ainda não possui descrição publicada na TagmarPedia.</p>";
  }
  return { alcance, duracao, evocacao, effect: body, officialContentMissing };
}

async function readJsonIfPresent(filename) {
  const path = join(cacheDir, filename);
  try { await access(path); } catch { return null; }
  return JSON.parse(await readFile(path, "utf8"));
}

const pages = manifest.pages.filter((page) => page.category === category);
const pageByName = new Map(pages.map((page) => [page.pageName, page]));
async function pageHtml(page) {
  const path = join(cacheDir, "pages", snapshotFilename(page));
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try { return await readFile(path, "utf8"); }
    catch (error) {
      if (error.code !== "ENOENT" || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }
  throw new Error(`Snapshot indisponível: ${page.pageName}`);
}
const acquisitionPage = pageByName.get(listPage);
if (!acquisitionPage) throw new Error(`Sincronize a página oficial ${listPage} antes de gerar as magias`);
const acquisitionHtml = await pageHtml(acquisitionPage);
const tables = [...acquisitionHtml.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
if (tables.length !== routes.length) throw new Error(`Esperadas ${routes.length} tabelas de aquisição; encontradas ${tables.length}`);

const acquisitions = [];
tables.forEach((table, tableIndex) => {
  const rows = rowsFromTable(table);
  const headers = rows[0].map((header) => key(header));
  const costIndex = headers.findIndex((header) => header === "custo");
  const categoryIndex = headers.findIndex((header) => header === "tipo" || header === "categoria");
  if (costIndex < 0) throw new Error(`Tabela ${tableIndex + 1} sem coluna Custo`);
  const route = `${rootRoute} / ${routes[tableIndex]}`;
  for (const cells of rows.slice(1)) {
    if (!cells[0]) continue;
    const rawName = cells[0].trim();
    const custo = Number.parseInt(cells[costIndex], 10);
    if (!Number.isInteger(custo)) throw new Error(`Custo inválido para ${rawName}: ${cells[costIndex]}`);
    acquisitions.push({
      route, rawName, name: baseName(rawName), custo,
      officialType: categoryIndex >= 0 ? cells[categoryIndex] : ""
    });
  }
});

const directDescriptionNames = new Set([
  "Assimilação Verdadeira", "Escudo Espiritual", "Invocar Espiritos",
  "Resistência Climática", "Aprimorar Habilidades (Revisão)", "Visão Animal (Revisão)"
]);
const descriptionPages = pages.filter((page) => page.pageName.startsWith("Magia - ") || directDescriptionNames.has(page.pageName));
const descriptionByExactKey = new Map();
const descriptionByBaseKey = new Map();
for (const page of descriptionPages) {
  const title = page.pageName.replace(/^Magia - /u, "");
  const exact = key(title);
  const base = baseKey(title);
  if (!descriptionByExactKey.has(exact)) descriptionByExactKey.set(exact, []);
  if (!descriptionByBaseKey.has(base)) descriptionByBaseKey.set(base, []);
  descriptionByExactKey.get(exact).push({ page, title });
  descriptionByBaseKey.get(base).push({ page, title });
}
const parsedBySourceName = new Map();
for (const candidate of descriptionPages) parsedBySourceName.set(candidate.pageName, parseMagicPage(await pageHtml(candidate)));
function pickDescription(rawName) {
  const candidates = [...new Map([
    ...(descriptionByExactKey.get(key(rawName)) ?? []),
    ...(descriptionByBaseKey.get(baseKey(rawName)) ?? [])
  ].map((candidate) => [candidate.page.pageName, candidate])).values()];
  const score = (candidate) => {
    const parsed = parsedBySourceName.get(candidate.page.pageName);
    const empty = /Esta página ainda não possui conteúdo/iu.test(parsed?.effect ?? "");
    const headers = [parsed?.alcance, parsed?.duracao, parsed?.evocacao].filter(Boolean).length;
    return (empty ? -100 : 0)
      + headers * 10
      + (key(candidate.title) === key(rawName) ? 5 : 0)
      + (isRevision(candidate.title) === isRevision(rawName) ? 3 : 0)
      + (candidate.page.transport === "rest" ? 1 : 0);
  };
  return candidates.sort((left, right) => score(right) - score(left))[0] ?? null;
}

const imageSources = [];
for (const filename of ["preview-magias.json", "preview-magias-ancestrais.json", "preview-magias-perdidas.json"]) {
  const data = await readJsonIfPresent(filename);
  if (Array.isArray(data)) imageSources.push(...data.filter((item) => item.type === "Magia"));
}
const legacy = await readJsonIfPresent("legacy-pack.json");
if (legacy?.items) imageSources.push(...legacy.items.filter((item) => item.type === "Magia"));
const imageByKey = new Map();
for (const item of imageSources) {
  const imageKey = baseKey(item.name);
  const current = imageByKey.get(imageKey);
  const generic = !item.img || item.img.startsWith("icons/svg/");
  if (!current || (!generic && current.generic)) imageByKey.set(imageKey, { img: item.img, itemId: item._id, generic });
}

const allRoutes = new Set([rootRoute]);
for (const acquisition of acquisitions) {
  const parts = acquisition.route.split(" / ");
  for (let index = 1; index <= parts.length; index += 1) allRoutes.add(parts.slice(0, index).join(" / "));
}
const orderedRoutes = [...allRoutes].sort((left, right) => {
  const depth = (route) => route.split(" / ").length;
  return depth(left) - depth(right) || left.localeCompare(right, "pt-BR");
});
const folderIds = new Map();
const professionColors = { BARDOS: "#7c4d9e", BERSERKER: "#9b2b22", FEITICEIRO: "#334f91", MAGO: "#777777", RASTREADOR: "#234f2d" };
const folders = orderedRoutes.map((route, index) => {
  const parentRoute = route.includes(" / ") ? route.slice(0, route.lastIndexOf(" / ")) : null;
  const id = stableId("tagmar-terras-magias-folder", route);
  folderIds.set(route, id);
  const profession = route.split(" / ")[1];
  return {
    _id: id, name: route.split(" / ").at(-1), type: "Item",
    folder: parentRoute ? folderIds.get(parentRoute) : null,
    sorting: "a", sort: index * 10,
    color: professionColors[profession] ?? "#9a7d10",
    flags: { tagmarSync: { edition, category, route } }
  };
});

const items = [];
for (const acquisition of acquisitions) {
  const description = pickDescription(acquisition.rawName);
  let source = description?.page ?? null;
  let parsed = null;
  if (source) {
    parsed = parsedBySourceName.get(source.pageName);
  }
  const emptySiteSource = parsed?.officialContentMissing === true ? source : null;
  const pdfFallback = emptySiteSource ? pdfFallbackByKey.get(baseKey(acquisition.name)) : null;
  if (pdfFallback) {
    const pages = pdfFallback.pages.join("-");
    parsed = {
      alcance: pdfFallback.alcance, duracao: pdfFallback.duracao, evocacao: pdfFallback.evocacao,
      effect: renderTerrasPdfFallback(pdfFallback), officialContentMissing: false, pdfFallback: true
    };
    source = {
      pageName: `Tagmar - Livro ATS (PDF, p. ${pages})`, url: TERRAS_ATS_PDF_URL,
      fetchUrl: TERRAS_ATS_PDF_URL, transport: "pdf-fallback",
      hash: createHash("sha256").update(JSON.stringify(pdfFallback)).digest("hex")
    };
  }
  const reusedImage = imageByKey.get(baseKey(acquisition.name));
  const alcance = parsed?.alcance || "Não informado na página oficial";
  const duracao = parsed?.duracao || "Não informada na página oficial";
  const evocacao = parsed?.evocacao || "Não informada na página oficial";
  const header = [
    `<strong>Alcance:</strong> ${alcance}`,
    `<strong>Duração:</strong> ${duracao}`,
    `<strong>Evocação:</strong> ${evocacao}`
  ].join("<br/>");
  items.push({
    _id: stableId("tagmar-terras-magias", `${acquisition.route}:${acquisition.rawName}`),
    name: acquisition.name, type: "Magia",
    img: reusedImage?.img ?? "icons/svg/explosion.svg",
    folder: folderIds.get(acquisition.route),
    system: {
      alcance, descricao: "", favorito: false, custo: acquisition.custo, nivel: 0,
      evocacao, duracao,
      efeito: `${header}<br/><br/>${parsed?.effect ?? ""}`,
      total: { valor: 0, valorKarma: 0 }
    },
    flags: { tagmarSync: {
      edition, category, origin: "official-current",
      acquisitionList: acquisition.route,
      acquisitionSourcePage: listPage,
      acquisitionSourceUrl: acquisitionPage.url,
      acquisitionTableName: acquisition.rawName,
      officialType: acquisition.officialType || null,
      sourceName: source?.pageName ?? null,
      sourceUrl: source?.url ?? null,
      fetchUrl: source?.fetchUrl ?? source?.url ?? null,
      transport: source?.transport ?? null,
      sourceHash: source?.hash ?? null,
      sourcePdfPages: pdfFallback?.pages ?? null,
      emptySiteSourceUrl: pdfFallback ? emptySiteSource?.url ?? null : null,
      reusedImageItemId: reusedImage?.itemId ?? null,
      generatedImageNeeded: !reusedImage || reusedImage.generic,
      officialContentMissing: parsed?.officialContentMissing ?? false,
      missingOfficialFields: [
        ...(!parsed?.alcance ? ["alcance"] : []),
        ...(!parsed?.duracao ? ["duracao"] : []),
        ...(!parsed?.evocacao ? ["evocacao"] : [])
      ],
      needsReview: !source || !parsed?.effect || parsed?.officialContentMissing === true
    } }
  });
}

const duplicateIds = items.map((item) => item._id).filter((id, index, values) => values.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`IDs duplicados: ${[...new Set(duplicateIds)].join(", ")}`);
const folderIdSet = new Set(folders.map((folder) => folder._id));
if (items.some((item) => !folderIdSet.has(item.folder))) throw new Error("Magia em pasta inexistente");

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-magias.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-magias-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  sourceTables: tables.length,
  documents: items.length,
  uniqueMagics: new Set(items.map((item) => baseKey(item.name))).size,
  descriptionPages: descriptionPages.length,
  folders: folders.length,
  needsReview: items.filter((item) => item.flags.tagmarSync.needsReview).length,
  missingDescriptions: [...new Set(items.filter((item) => !item.flags.tagmarSync.sourceName).map((item) => item.flags.tagmarSync.acquisitionTableName))],
  incompleteHeaders: [...new Set(items.filter((item) => !item.system.alcance || !item.system.duracao || !item.system.evocacao).map((item) => item.name))],
  generatedImagesNeeded: new Set(items.filter((item) => item.flags.tagmarSync.generatedImageNeeded).map((item) => baseKey(item.name))).size
}, null, 2));
