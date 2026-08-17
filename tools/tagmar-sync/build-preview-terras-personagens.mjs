import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const legacyCore = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const legacyTerras = JSON.parse(await readFile(join(cacheDir, "snapshot-terras-selvagens.json"), "utf8"));
const currentCore = JSON.parse(await readFile(join(cacheDir, "preview-personagens.json"), "utf8"));
const edition = "Aventuras nas Terras Selvagens";
const category = "terras-selvagens";

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;
const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => stripTags(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const integer = (value) => {
  const parsed = Number.parseInt(String(value).replace("+", ""), 10);
  return Number.isInteger(parsed) ? parsed : 0;
};

function source(pageName) {
  const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
  if (!page) throw new Error(`Página de Terras Selvagens ausente do manifesto: ${pageName}`);
  return page;
}

async function pageHtml(pageName) {
  const page = source(pageName);
  return readFile(join(cacheDir, "pages", snapshotFilename(page)), "utf8");
}

function rowsFromTable(table) {
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]))
  );
}

function mechanicTable(html) {
  const tables = [...html.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
  const table = tables.find((candidate) => (rowsFromTable(candidate)[0] ?? [])[0] === "-");
  if (!table) throw new Error("Tabela de atributos raciais não encontrada");
  return rowsFromTable(table);
}

function pageContent(html) {
  const firstTableEnd = html.indexOf("</table>");
  let body = firstTableEnd >= 0 ? html.slice(firstTableEnd + 8) : html;
  const footer = body.search(/<hr[^>]*>[\s\S]*?<h3[^>]*>\s*Verbetes/i);
  if (footer >= 0) body = body.slice(0, footer);
  return body.trim();
}

function requiredNumber(text, pattern, label) {
  const match = text.match(pattern);
  if (!match) throw new Error(`Dado mecânico ausente: ${label}`);
  return integer(match[1]);
}

const raceTablePage = source("1.0 Atributos das raças das terras selvagens");
const raceTableHtml = await pageHtml(raceTablePage.pageName);
const rows = mechanicTable(raceTableHtml);
const headers = rows[0];
const rowByName = new Map(rows.slice(1).map((row) => [key(row[0]), row]));
const valueFor = (column, rowName) => rowByName.get(key(rowName))?.[column] ?? "";
const attributes = { "Físico": "FIS", "Força": "FOR", "Agilidade": "AGI", "Percepção": "PER", "Intelecto": "INT", "Carisma": "CAR", "Aura": "AUR" };

const raceSpecs = [
  { sourceName: "Anões", name: "Anão", page: "1.1 Anões", img: "systems/tagmar_rpg/assets/an%C3%A3o.png" },
  { sourceName: "Elfos sombrios", name: "Elfo Sombrio", page: "1.2 Elfos Sombrios", img: "systems/tagmar_rpg/assets/elfo%20sombrio.png" },
  { sourceName: "Gourais", name: "Goura", page: "1.3 Gouras", img: "systems/tagmar_rpg/assets/gouras.png" },
  { sourceName: "Humanos", name: "Humano", page: "1.4 Humanos", img: "systems/tagmar_rpg/assets/humanos%20123.png" },
  { sourceName: "Napóis", name: "Napói", page: "1.5 Napois", img: "systems/tagmar_rpg/assets/napol.png" },
  { sourceName: "Meio-orco", name: "Meio-Orco", page: "1.6 Meio Orcos", img: "systems/tagmar_rpg/assets/meio%20orc.png" },
  { sourceName: "Sekbets", name: "Sekbete", page: "1.7 Sekbetes", img: "systems/tagmar_rpg/assets/sekbet.png" }
];

const routes = ["01 - RAÇAS", "02 - PROFISSÕES"];
const folderIds = new Map();
const folders = routes.map((route, index) => {
  const id = stableId("tagmar-terras-personagens-folder", route);
  folderIds.set(route, id);
  return {
    _id: id,
    name: route,
    type: "Item",
    folder: null,
    sorting: "m",
    sort: index * 100000,
    color: route.startsWith("01") ? "#ff0000" : "#168bd1",
    flags: { tagmarSync: { edition, category, route } }
  };
});

const races = raceSpecs.map((spec) => {
  const column = headers.findIndex((header) => key(header) === key(spec.sourceName));
  if (column < 1) throw new Error(`Coluna racial não encontrada: ${spec.sourceName}`);
  const modifiers = Object.fromEntries(Object.entries(attributes).map(([rowName, field]) => [field, integer(valueFor(column, rowName))]));
  const descriptionPage = source(spec.page);
  return {
    _id: stableId("tagmar-terras-raca", spec.name),
    name: spec.name,
    type: "Raca",
    img: spec.img,
    folder: folderIds.get("01 - RAÇAS"),
    system: {
      descricao: "",
      mod_racial: modifiers,
      ef_base: integer(valueFor(column, "EF")),
      vb: integer(valueFor(column, "VB"))
    },
    flags: { tagmarSync: {
      edition, category, origin: "terras-selvagens", sourceName: descriptionPage.pageName,
      sourceUrl: descriptionPage.url, sourceHash: descriptionPage.hash,
      mechanicsSourceName: raceTablePage.pageName, mechanicsSourceUrl: raceTablePage.url,
      mechanicsSourceHash: raceTablePage.hash, sourceRaceName: spec.sourceName,
      sourceBaseSpeed: valueFor(column, "VB"), sourceHeight: valueFor(column, "Altura média"),
      sourceLifeExpectancy: valueFor(column, "Expectativa de vida"), sourceWeight: valueFor(column, "Peso médio"),
      allowedProfessions: Object.fromEntries(["Bardo?", "Guerreiro?", "Ladino?", "Mago?", "Rastreador?", "Sacerdote?", "Feiticeiros", "Berserkeres"]
        .map((rowName) => [rowName.replace("?", ""), valueFor(column, rowName)])),
      needsReview: false
    } }
  };
});

for (let index = 0; index < races.length; index += 1) {
  races[index].system.descricao = pageContent(await pageHtml(raceSpecs[index].page));
}

const legacyProfessionByName = new Map(legacyTerras.items.filter((item) => item.type === "Profissao")
  .map((item) => [key(item.name), item]));
const coreProfessionByName = new Map(legacyCore.items.filter((item) => item.type === "Profissao")
  .map((item) => [key(item.name), item]));
const professionSpecs = [
  {
    page: "2.1 Berserker",
    name: "Berserker",
    legacyName: "Berserkeres",
    magicAttribute: "FIS",
    specializations: ["Tradição da Fera", "Tradição do Ferro", "Tradição da Herança", "Tradição do Misticismo", "Tradição do Sangue"]
  },
  {
    page: "2.2 Feiticeiros",
    name: "Feiticeiro",
    legacyName: "Feiticeiro",
    magicAttribute: "PER",
    specializations: ["Caminho da Bruxaria", "Caminho do Destino", "Caminho do Druidismo", "Caminho dos Sonhos", "Caminho do Xamanismo", "Caminho Dracônico"]
  }
];

const professions = [];
for (const spec of professionSpecs) {
  const page = source(spec.page);
  const html = await pageHtml(spec.page);
  const plain = stripTags(html);
  const evolution = plain.match(/Evolução de EH\s*:\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/i);
  if (!evolution) throw new Error(`Evolução de EH ausente para ${spec.name}`);
  const penalized = plain.match(/Grupo penalizado\s*:\s*([\p{L}-]+)/iu)?.[1];
  const innate = plain.match(/Habilidade (?:especializada|aperfeiçoada)\s*:\s*([\p{L}-]+)/iu)?.[1];
  if (!penalized || !innate) throw new Error(`Habilidade ou grupo penalizado ausente para ${spec.name}`);
  const legacyItem = legacyProfessionByName.get(key(spec.legacyName)) ?? coreProfessionByName.get(key(spec.name));
  if (!legacyItem) throw new Error(`Imagem clássica ausente para ${spec.name}`);
  professions.push({
    _id: stableId("tagmar-terras-profissao", spec.name),
    name: spec.name,
    type: "Profissao",
    img: legacyItem.img,
    folder: folderIds.get("02 - PROFISSÕES"),
    system: {
      especializacoes: `${spec.specializations.join(",")},`,
      eh_base: requiredNumber(plain, /EH básica\s*=\s*(\d+)/i, `${spec.name}.EH`),
      lista_eh: { v1: integer(evolution[1]), v2: integer(evolution[2]), v3: integer(evolution[3]), v4: integer(evolution[4]) },
      descricao: pageContent(html),
      hab_nata: innate,
      grupo_pen: key(penalized),
      p_aquisicao: {
        p_hab: requiredNumber(plain, /Pontos para aquisição de habilidades\s*:\s*(\d+)/i, `${spec.name}.Habilidades`),
        p_tec: requiredNumber(plain, /Pontos de técnicas de combate\s*=\s*(\d+)/i, `${spec.name}.Técnicas`),
        p_gra: requiredNumber(plain, /Pontos em grupos de armas\s*=\s*(\d+)/i, `${spec.name}.Armas`),
        p_mag: 0
      },
      atrib_mag: spec.magicAttribute,
      grupo_aprim: false
    },
    flags: { tagmarSync: {
      edition, category, origin: "terras-selvagens", sourceName: page.pageName,
      sourceUrl: page.url, sourceHash: page.hash, legacyItemId: legacyItem._id,
      legacyTechniquePoints: legacyItem.system?.p_aquisicao?.p_tec ?? null,
      needsReview: false
    } }
  });
}

const currentProfessionByName = new Map(currentCore.filter((item) => item.type === "Profissao")
  .map((item) => [key(item.name), item]));
const extendedProfessionSpecs = [
  {
    name: "Bardo",
    additions: ["Confraria dos Encantadores", "Confraria dos Iluminados"],
    pages: ["2.5 Confraria dos Encantadores", "2.12 Confraria dos Iluminados"]
  },
  {
    name: "Guerreiro",
    additions: ["Academia dos Guardas", "Academia dos Duelistas"],
    pages: ["2.6 Academia dos guardas", "2.9 Academia dos Duelistas"]
  },
  {
    name: "Ladino",
    additions: ["Guilda dos Caçadores de Recompensa", "Guilda dos Trapaceiros"],
    pages: ["2.4 Guilda dos Caçadores de Recompensa", "2.7 Guilda dos trapaceiros"]
  },
  {
    name: "Mago",
    additions: ["Colégio Sombrio", "Colégio Cronomântico"],
    pages: ["2.3 Colégio dos Magos Sombrios - Colégio Sombrio", "2.8 Colégio Cronomântico"]
  },
  {
    name: "Rastreador",
    additions: ["Trilha da Noite", "Trilha dos Mestres das Feras"],
    pages: ["2.10 Trilha da Noite", "2.11 Trilha dos Mestres das Feras"]
  }
];

for (const spec of extendedProfessionSpecs) {
  const base = currentProfessionByName.get(key(spec.name));
  if (!base) throw new Error(`Profissão revisada ausente para extensão de Terras Selvagens: ${spec.name}`);
  const existing = String(base.system.especializacoes ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const specializations = [...new Set([...existing, ...spec.additions])];
  const sourcePages = spec.pages.map((pageName) => source(pageName));
  const descriptions = [];
  for (const pageName of spec.pages) descriptions.push(pageContent(await pageHtml(pageName)));
  professions.push({
    _id: stableId("tagmar-terras-profissao-estendida", spec.name),
    name: spec.name,
    type: "Profissao",
    img: base.img,
    folder: folderIds.get("02 - PROFISSÕES"),
    system: {
      ...structuredClone(base.system),
      especializacoes: `${specializations.join(",")},`,
      descricao: [base.system.descricao, ...descriptions].filter(Boolean).join("<hr>")
    },
    flags: { tagmarSync: {
      edition,
      category,
      origin: "terras-selvagens-profession-extension",
      sourceName: sourcePages[0].pageName,
      sourceUrl: sourcePages[0].url,
      sourceHash: sourcePages[0].hash,
      specializationSources: sourcePages.map((page) => ({ pageName: page.pageName, url: page.url, hash: page.hash })),
      baseProfessionId: base._id,
      addedSpecializations: spec.additions,
      needsReview: false
    } }
  });
}

const items = [...races, ...professions];
const itemIds = new Set(items.map((item) => item._id));
const folderIdSet = new Set(folders.map((folder) => folder._id));
if (races.length !== 7 || professions.length !== 7) throw new Error("Contagem inesperada em personagens das Terras Selvagens");
if (itemIds.size !== items.length) throw new Error("IDs duplicados em personagens das Terras Selvagens");
if (items.some((item) => !folderIdSet.has(item.folder))) throw new Error("Item órfão em personagens das Terras Selvagens");
if (items.some((item) => !item.flags.tagmarSync.sourceUrl)) throw new Error("Item sem origem oficial");

const output = join(cacheDir, "preview-terras-personagens.json");
const foldersOutput = join(cacheDir, "preview-terras-personagens-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output, foldersOutput, races: races.length, professions: professions.length, folders: folders.length,
  extendedProfessions: extendedProfessionSpecs.map((spec) => spec.name),
  berserkerTechniquePoints: professions.find((item) => item.name === "Berserker").system.p_aquisicao.p_tec,
  legacyBerserkerTechniquePoints: professions.find((item) => item.name === "Berserker").flags.tagmarSync.legacyTechniquePoints
}, null, 2));
