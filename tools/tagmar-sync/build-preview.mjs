import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex")
  .slice(0, 16);
const stripTags = (value) => value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
const mechanicalKey = (value) => stripTags(value)
  .replace(/[*.…]+/g, "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR")
  .replace(/^destrancar fechaduras$/, "destravar fechaduras");
const systemGroupKey = (value) => mechanicalKey(value).replace(/\s+/g, "_");

const source = manifest.pages.find((page) =>
  page.category === "habilidades" && page.pageName === "Manual de Regras - Habilidades"
);
if (!source) throw new Error("Execute sync.mjs --category=habilidades --write antes de gerar a prévia");

const sourceFile = join(cacheDir, "pages", `${stableId(source.category, source.pageName)}.html`);
let html;
try {
  html = await readFile(sourceFile, "utf8");
} catch {
  // O snapshot usa o mesmo SHA-256, mas calculado sem normalização de caixa.
  const filename = createHash("sha256").update(`${source.category}:${source.pageName}`).digest("hex").slice(0, 16);
  html = await readFile(join(cacheDir, "pages", `${filename}.html`), "utf8");
}

const descriptionStart = html.search(/<h[1-4][^>]*>\s*Descrição das Habilidades\s*<\/h[1-4]>/i);
if (descriptionStart < 0) throw new Error("Seção 'Descrição das Habilidades' não encontrada");
const relevant = html.slice(descriptionStart);
const groupByTable = ["Profissional", "Manobra", "Conhecimento", "Subterfúgio", "Influência", "Geral"];
const legacyFolders = new Map(legacy.folders.map((folder) => [mechanicalKey(folder.name), folder]));
const legacySkillsRoot = legacyFolders.get(mechanicalKey("03 - HABILIDADES"));
const skillsRoot = {
  _id: stableId("tagmar-t3er-root-folder", "03 - HABILIDADES"),
  name: "03 - HABILIDADES",
  type: "Item",
  folder: null,
  sorting: "a",
  sort: legacySkillsRoot?.sort ?? 30,
  color: legacySkillsRoot?.color ?? "#0bbda9",
  flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", legacyFolderId: legacySkillsRoot?._id ?? null } }
};
const skillGroupFolders = groupByTable.map((name, sort) => {
  const legacyFolder = legacyFolders.get(mechanicalKey(name));
  return {
    _id: stableId("tagmar-t3er-habilidades-folder", name),
    name,
    type: "Item",
    folder: skillsRoot._id,
    sorting: "a",
    sort: sort * 10,
    color: legacyFolder?.color ?? "#000000",
    flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", legacyFolderId: legacyFolder?._id ?? null } }
  };
});
const folderDocuments = [skillsRoot, ...skillGroupFolders];
const folderIdByGroup = new Map(skillGroupFolders.map((folder) => [mechanicalKey(folder.name), folder._id]));
const legacySkills = new Map(
  legacy.items
    .filter((item) => item.type === "Habilidade")
    .map((item) => [mechanicalKey(item.name), item])
);
const tables = [...html.matchAll(/<table[^>]*>.*?<\/table>/gis)].slice(2, 8);
const mechanics = new Map();
for (let tableIndex = 0; tableIndex < tables.length; tableIndex += 1) {
  const rows = [...tables[tableIndex][0].matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].slice(1);
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]));
    if (cells.length < 3) continue;
    mechanics.set(mechanicalKey(cells[0]), {
      custo: Number.parseInt(cells[1], 10),
      atributo: cells[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase(),
      grupo: groupByTable[tableIndex]
    });
  }
}

// Algumas páginas antigas possuem abertura h3 e fechamento h2. Aceitamos ambos,
// mas só transformamos cabeçalhos que também aparecem nas tabelas mecânicas.
const headingPattern = /<h[23][^>]*>\s*(.*?)\s*<\/h[23]>/gis;
const headings = [...relevant.matchAll(headingPattern)];
const items = [];

for (let index = 0; index < headings.length; index += 1) {
  const heading = headings[index];
  const name = stripTags(heading[1]);
  const mechanical = mechanics.get(mechanicalKey(name));
  if (!mechanical) continue;
  const start = heading.index + heading[0].length;
  const end = headings[index + 1]?.index ?? relevant.length;
  const description = relevant.slice(start, end).trim();
  if (!description) continue;
  const legacySkill = legacySkills.get(mechanicalKey(name));

  items.push({
    _id: stableId("tagmar-t3er-habilidade", name),
    name,
    type: "Habilidade",
    img: legacySkill?.img ?? "icons/svg/book.svg",
    folder: folderIdByGroup.get(mechanicalKey(mechanical.grupo)) ?? null,
    system: {
      custo: mechanical?.custo ?? 0,
      nivel: 0,
      ajuste: { atributo: mechanical?.atributo ?? "", valor: 0 },
      penalidade: 0,
      bonus: 0,
      total: 0,
      tipo: mechanical ? systemGroupKey(mechanical.grupo) : "",
      custoAdd: { profissao: "", valor: 0 },
      hab_nata: false,
      descricao: description,
      tarefAperf: "",
      nao_rolar_sem_nivel: false
    },
    flags: {
      tagmarSync: {
        edition: "Tagmar 3 Edição Revisada",
        category: "habilidades",
        sourceName: source.pageName,
        sourceUrl: source.url,
        sourceHash: source.hash,
        needsMechanicalMapping: !mechanical,
        legacyItemId: legacySkill?._id ?? null
      }
    }
  });
}

const output = join(cacheDir, "preview-habilidades.json");
const foldersOutput = join(cacheDir, "preview-habilidades-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folderDocuments, null, 2)}\n`, "utf8");
const mapped = items.filter((item) => !item.flags.tagmarSync.needsMechanicalMapping).length;
const visualMatches = items.filter((item) => item.flags.tagmarSync.legacyItemId).length;
console.log(JSON.stringify({
  output,
  foldersOutput,
  documents: items.length,
  mechanicallyMapped: mapped,
  needsReview: items.length - mapped,
  legacyVisualMatches: visualMatches,
  sample: items.slice(0, 3).map(({ _id, name, type, system, flags }) => ({
    _id,
    name,
    type,
    grupo: system.tipo,
    custo: system.custo,
    atributo: system.ajuste.atributo,
    sourceUrl: flags.tagmarSync.sourceUrl
  }))
}, null, 2));
