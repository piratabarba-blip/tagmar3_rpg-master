import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nativeSkillIcon } from "./native-action-icon.mjs";

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
const cleanSkillName = (value) => stripTags(value)
  .replace(/[♘🦺🚫👨‍🎓…👷🏼*]+/gu, "")
  .replace(/\.+$/g, "")
  .trim();
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
  page.category === "habilidades" && page.pageName === "Livro de Regras - Habilidades"
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
const mechanics = new Map();
for (const table of html.matchAll(/<table[^>]*>.*?<\/table>/gis)) {
  const rows = [...table[0].matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)];
  let groups = null;
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]));
    const possibleGroups = [cells[0], cells[4], cells[8]];
    if (possibleGroups.every((group) => groupByTable.includes(group))) {
      groups = possibleGroups;
      continue;
    }
    if (!groups) continue;
    for (let column = 0; column < groups.length; column += 1) {
      const offset = column * 4;
      const name = cleanSkillName(cells[offset] ?? "");
      const custo = Number.parseInt(cells[offset + 1], 10);
      const atributo = (cells[offset + 2] ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      if (!name || !Number.isInteger(custo) || !atributo) continue;
      mechanics.set(mechanicalKey(name), { name, custo, atributo, grupo: groups[column] });
    }
  }
}

if (mechanics.size !== 42) {
  throw new Error(`Catálogo oficial inesperado: ${mechanics.size} habilidades, esperadas 42`);
}

const skillPages = new Map(manifest.pages
  .filter((page) => page.category === "habilidades" && page.pageName.startsWith("Habilidades - "))
  .map((page) => [mechanicalKey(page.pageName.slice("Habilidades - ".length)), page]));
const items = [];

for (const mechanical of mechanics.values()) {
  const name = mechanical.name;
  const skillPage = skillPages.get(mechanicalKey(name));
  if (!skillPage) throw new Error(`Verbete oficial de habilidade ausente: ${name}`);
  const skillFile = join(cacheDir, "pages", `${createHash("sha256").update(`${skillPage.category}:${skillPage.pageName}`).digest("hex").slice(0, 16)}.html`);
  const description = (await readFile(skillFile, "utf8")).trim();
  if (!description) throw new Error(`Verbete oficial de habilidade vazio: ${name}`);
  const legacySkill = legacySkills.get(mechanicalKey(name));

  items.push({
    _id: stableId("tagmar-t3er-habilidade", name),
    name,
    type: "Habilidade",
    img: nativeSkillIcon(name, legacySkill?.img),
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
        sourceName: skillPage.pageName,
        sourceUrl: skillPage.url,
        sourceHash: skillPage.hash,
        mechanicsSourceName: source.pageName,
        mechanicsSourceUrl: source.url,
        mechanicsSourceHash: source.hash,
        needsMechanicalMapping: false,
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
