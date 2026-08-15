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

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;
const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => stripTags(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const integer = (value) => {
  const parsed = Number.parseInt(String(value).replace("+", ""), 10);
  return Number.isInteger(parsed) ? parsed : 0;
};

function rowsFromTable(table) {
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]))
  );
}

function findTable(html, expectedHeader) {
  const tables = [...html.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
  const matches = tables.filter((table) => {
    const header = rowsFromTable(table)[0] ?? [];
    return expectedHeader.every((value, index) => header[index] === value);
  });
  if (matches.length !== 1) throw new Error(`Esperada uma tabela ${expectedHeader.join(" / ")}; encontradas ${matches.length}`);
  return rowsFromTable(matches[0]);
}

function extractSection(html, heading) {
  const headings = [...html.matchAll(/<h([2-6])[^>]*>(.*?)<\/h\1>/gis)];
  const index = headings.findIndex((match) => key(match[2]) === key(heading));
  if (index < 0) throw new Error(`Seção oficial não encontrada: ${heading}`);
  const current = headings[index];
  const level = integer(current[1]);
  const start = current.index + current[0].length;
  const next = headings.slice(index + 1).find((match) => integer(match[1]) <= level);
  const end = next?.index ?? html.length;
  return html.slice(start, end).trim();
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

function source(category, pageName) {
  const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
  if (!page) throw new Error(`Execute sync.mjs --category=${category} --write: ${pageName}`);
  return page;
}

const racePage = source("racas", "Livro de Regras - Características Básicas");
const professionBasicsPage = source("profissoes", "Livro de Regras - Características Básicas");
const professionCombatPage = source("profissoes", "Livro de Regras - Combate");
const professionSkillsPage = source("profissoes", "Livro de Regras - Habilidades");
const raceHtml = await readFile(join(cacheDir, "pages", snapshotFilename(racePage)), "utf8");
const professionBasicsHtml = await readFile(join(cacheDir, "pages", snapshotFilename(professionBasicsPage)), "utf8");
const professionCombatHtml = await readFile(join(cacheDir, "pages", snapshotFilename(professionCombatPage)), "utf8");
const professionSkillsHtml = await readFile(join(cacheDir, "pages", snapshotFilename(professionSkillsPage)), "utf8");

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [key(folderPath(legacyFolderById, folder._id)), folder]));
const legacyItemByTypeName = new Map(legacy.items.map((item) => [`${item.type}:${key(item.name)}`, item]));
const routes = ["01 - RAÇAS", "02 - PROFISSÕES"];
const folderIds = new Map();
const folderDocuments = routes.map((route, index) => {
  const legacyFolder = legacyFolderByPath.get(key(route));
  const id = stableId("tagmar-t3er-personagens-folder", route);
  folderIds.set(route, id);
  return {
    _id: id,
    name: route,
    type: "Item",
    folder: null,
    sorting: legacyFolder?.sorting ?? "m",
    sort: legacyFolder?.sort ?? index * 100000,
    color: legacyFolder?.color ?? (route.startsWith("01") ? "#ff0000" : "#168bd1"),
    flags: { tagmarSync: { edition, category: route.startsWith("01") ? "racas" : "profissoes", route, legacyFolderId: legacyFolder?._id ?? null } }
  };
});

const raceNameMap = new Map([
  [key("Humano"), "Humano"], [key("Pequenino"), "Pequenino"], [key("Anões"), "Anão"],
  [key("Elfo florestal"), "Elfo Florestal"], [key("Elfo dourado"), "Elfo Dourado"], [key("Meio-elfo"), "Meio Elfo"]
]);
const raceRows = findTable(raceHtml, ["Raça", "Pontos de Atributos", "Atributo Inicial*", "Velocidade Base"]).slice(1);
const raceEfRows = findTable(professionCombatHtml, ["Raça", "EF Básica"]).slice(1);
const efByRace = new Map(raceEfRows.map(([name, ef]) => [key(name), integer(ef)]));
const attributes = ["INT", "AUR", "CAR", "FOR", "FIS", "AGI", "PER"];

const races = raceRows.map((cells) => {
  const [sourceName, attributePoints, initialAttributes, baseSpeed, age, height, weight, languages, specialPowers] = cells;
  const name = raceNameMap.get(key(sourceName));
  if (!name) throw new Error(`Raça não mapeada no núcleo: ${sourceName}`);
  const modifiers = Object.fromEntries(attributes.map((attribute) => [attribute, 0]));
  for (const match of initialAttributes.matchAll(/([+-]\d+)\s+(INT|AUR|CAR|FOR|FIS|AGI|PER)/gi)) {
    modifiers[match[2].toUpperCase()] = integer(match[1]);
  }
  const tableModifiers = { ...modifiers };
  const ef = efByRace.get(key(name));
  if (!Number.isInteger(ef)) throw new Error(`EF Básica ausente para ${name}`);
  const legacyItem = legacyItemByTypeName.get(`Raca:${key(name)}`);
  if (!legacyItem) throw new Error(`Referência clássica ausente para ${name}`);
  const heading = sourceName === "Anões" ? "Anões" : sourceName === "Meio-elfo" ? "Meio-Elfos" : sourceName === "Elfo florestal" ? "Elfos Florestais" : sourceName === "Elfo dourado" ? "Elfos Dourados" : `${sourceName}s`;
  const description = extractSection(raceHtml, heading);
  let officialDiscrepancy = null;
  if (name === "Pequenino") {
    const prose = key(description);
    if (!prose.includes("ajuste de 1 no valor corresponde a seu fisico") || !prose.includes("1 para percepcao")) {
      throw new Error("O texto oficial dos Pequeninos não confirma Físico +1 e Percepção +1");
    }
    modifiers.FIS = 1;
    modifiers.PER = 1;
    officialDiscrepancy = {
      field: "Atributo Inicial",
      table: initialAttributes,
      prose: "Físico +1 e Percepção +1",
      applied: "O texto oficial e o comportamento clássico prevalecem até correção da tabela oficial."
    };
  }
  return {
    _id: stableId("tagmar-t3er-raca", name),
    name: legacyItem.name,
    type: "Raca",
    img: legacyItem.img,
    folder: folderIds.get("01 - RAÇAS"),
    system: { descricao: description, mod_racial: modifiers, ef_base: ef, vb: integer(baseSpeed) },
    flags: { tagmarSync: {
      edition, category: "racas", origin: "core", sourceName: racePage.pageName, sourceUrl: racePage.url, sourceHash: racePage.hash,
      sourceRaceName: sourceName, sourceAttributePoints: integer(attributePoints), sourceInitialAttributes: initialAttributes,
      sourceTableModifiers: tableModifiers, officialDiscrepancy,
      sourceBaseSpeed: baseSpeed, sourceAge: age, sourceHeight: height, sourceWeight: weight, sourceLanguages: languages,
      sourceSpecialPowers: specialPowers, combatSourceUrl: professionCombatPage.url, combatSourceHash: professionCombatPage.hash,
      legacyItemId: legacyItem._id, needsReview: false
    } }
  };
});

const professionNames = ["Bardo", "Guerreiro", "Ladino", "Mago", "Rastreador", "Sacerdote"];
function valueMap(rows, valueIndex = 1) {
  return new Map(rows.map((cells) => [key(cells[0]), cells[valueIndex]]));
}
const skillRows = findTable(professionSkillsHtml, ["Profissão", "Pontos de Aquisição", "Grupo Penalizado", "Habilidade Aperfeiçoada"]).slice(1);
const ehByProfession = valueMap(findTable(professionCombatHtml, ["Profissões", "EH Básica"]).slice(1));
const weaponPointsByProfession = valueMap(findTable(professionCombatHtml, ["Profissão", "Pontos para Grupos de Armas"]).slice(1));
const techniquePointsByProfession = valueMap(findTable(professionCombatHtml, ["Profissão", "Pontos de aquisição"]).slice(1));
const skillsByProfession = new Map(skillRows.map((cells) => [key(cells[0]), { points: integer(cells[1]), penalized: cells[2], innate: cells[3] }]));
const specializationMap = {
  Bardo: ["Confraria dos Artistas", "Confraria dos Arautos", "Confraria dos Eruditos", "Confraria dos Encantadores"],
  Guerreiro: ["Academia de Infantaria", "Academia dos Arqueiros", "Academia dos Cavaleiros", "Academia dos Gladiadores"],
  Ladino: ["Guilda dos Assassinos", "Guilda dos Ladrões", "Guilda dos Piratas"],
  Mago: ["Colégio Alquímico", "Colégio do Conhecimento", "Colégio Elemental", "Colégio das Ilusões", "Colégio Naturalista", "Colégio Necromântico"],
  Rastreador: ["Trilha dos Caçadores", "Trilha dos Guardiões", "Trilha dos Exploradores"],
  Sacerdote: ["A Ordem Blator", "A Ordem de Cambu", "A Ordem de Crezir", "A Ordem de Crizagom", "A Ordem Cruine", "A Ordem de Ganis", "A Ordem de Lena", "A Ordem de Maira", "A Ordem de Palier", "A Ordem de Parom", "A Ordem de Plandis", "A Ordem de Selimom", "A Ordem de Sevides"]
};
const magicAttribute = { Bardo: "CAR", Guerreiro: "", Ladino: "", Mago: "INT", Rastreador: "PER", Sacerdote: "CAR" };
const professionHeading = { Bardo: "Bardos", Guerreiro: "Guerreiros", Ladino: "Ladinos", Mago: "Magos", Rastreador: "Rastreadores", Sacerdote: "Sacerdotes" };

const professions = professionNames.map((name) => {
  const skill = skillsByProfession.get(key(name));
  const ehBase = integer(ehByProfession.get(key(name)));
  const weaponPoints = integer(weaponPointsByProfession.get(key(name)));
  const techniquePoints = integer(techniquePointsByProfession.get(key(name)));
  if (!skill || !ehBase || !weaponPoints || !techniquePoints || ehBase % 3 !== 0) throw new Error(`Dados mecânicos incompletos para ${name}`);
  const legacyItem = legacyItemByTypeName.get(`Profissao:${key(name)}`);
  if (!legacyItem) throw new Error(`Referência clássica ausente para ${name}`);
  const ehStep = ehBase / 3;
  const penalized = key(skill.penalized) === "nenhum" ? "" : key(skill.penalized);
  return {
    _id: stableId("tagmar-t3er-profissao", name),
    name: legacyItem.name,
    type: "Profissao",
    img: legacyItem.img,
    folder: folderIds.get("02 - PROFISSÕES"),
    system: {
      especializacoes: `${specializationMap[name].join(",")},`,
      eh_base: ehBase,
      lista_eh: { v1: ehStep, v2: ehStep + 1, v3: ehStep + 2, v4: ehStep + 3 },
      descricao: extractSection(professionBasicsHtml, professionHeading[name]),
      hab_nata: skill.innate,
      grupo_pen: penalized,
      p_aquisicao: { p_hab: skill.points, p_tec: techniquePoints, p_gra: weaponPoints, p_mag: 0 },
      atrib_mag: magicAttribute[name],
      grupo_aprim: false
    },
    flags: { tagmarSync: {
      edition, category: "profissoes", origin: "core", sourceName: professionBasicsPage.pageName,
      sourceUrl: professionBasicsPage.url, sourceHash: professionBasicsPage.hash,
      skillsSourceUrl: professionSkillsPage.url, skillsSourceHash: professionSkillsPage.hash,
      combatSourceUrl: professionCombatPage.url, combatSourceHash: professionCombatPage.hash,
      legacyItemId: legacyItem._id, needsReview: false
    } }
  };
});

const items = [...races, ...professions];
const uniqueIds = new Set(items.map((item) => item._id));
if (races.length !== 6 || professions.length !== 6) throw new Error(`Contagem inesperada: ${races.length} raças e ${professions.length} profissões`);
if (uniqueIds.size !== items.length) throw new Error("IDs duplicados em Raças e Profissões");
if (items.some((item) => !folderDocuments.some((folder) => folder._id === item.folder))) throw new Error("Item órfão em Raças e Profissões");

const output = join(cacheDir, "preview-personagens.json");
const foldersOutput = join(cacheDir, "preview-personagens-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folderDocuments, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, foldersOutput, races: races.length, professions: professions.length, folders: folderDocuments.length, uniqueIds: uniqueIds.size, visualMatches: items.length }, null, 2));
