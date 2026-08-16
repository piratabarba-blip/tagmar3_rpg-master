import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const edition = "Tagmar 3 Edição Revisada";
const category = "magias-cura";
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
const plainText = (value) => decodeEntities(value
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<li[^>]*>/gi, "\n")
  .replace(/<\/li>/gi, "\n")
  .replace(/<[^>]+>/g, " "))
  .replace(/[ \t]+/g, " ")
  .replace(/\s*\n\s*/g, "\n")
  .trim();
const key = (value) => plainText(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");

const magias = JSON.parse(await readFile(join(cacheDir, "preview-magias.json"), "utf8"));
const magiaFolders = JSON.parse(await readFile(join(cacheDir, "preview-magias-folders.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const rootFolder = magiaFolders.find((folder) => folder.name === "07 - MAGIAS" && !folder.folder);
if (!rootFolder) throw new Error("Pasta raiz de Magias não encontrada");

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
function legacyFolderPath(id) {
  const names = [];
  while (id && legacyFolderById.has(id)) {
    const folder = legacyFolderById.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [key(legacyFolderPath(folder._id)), folder]));
const legacyItemByName = new Map(legacy.items
  .filter((item) => item.type === "Combate")
  .map((item) => [key(item.name), item]));
const uniqueMagicByName = new Map();
for (const magia of magias) {
  if (!uniqueMagicByName.has(key(magia.name))) uniqueMagicByName.set(key(magia.name), magia);
}

const healingProgression = (maximum) => Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => {
    const percentage = (index + 1) * 25;
    return [`d${percentage}`, Math.ceil((maximum * percentage) / 100)];
  })
);
const zeroProgression = () => healingProgression(0);
const headerFrom = (text) => {
  const values = {};
  for (const label of ["Alcance", "Duração", "Evocação"]) {
    values[label] = text.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"))?.[1]?.trim() ?? "Não informado";
  }
  return `Alcance: ${values.Alcance}\nDuração: ${values.Duração}\nEvocação: ${values.Evocação}`;
};
const parseEffects = (text, familyPattern, amountPattern) => {
  const expression = new RegExp(
    `${familyPattern}\\s+(\\d+)\\s*:\\s*([\\s\\S]*?)(?=${familyPattern}\\s+\\d+\\s*:|$)`,
    "gi"
  );
  return [...text.matchAll(expression)].map((match) => {
    const amount = match[2].match(amountPattern)?.[1];
    if (!amount) throw new Error(`Valor de cura não reconhecido em ${match[0]}`);
    return { effect: Number(match[1]), amount: Number(amount), detail: match[2].trim() };
  });
};

const definitions = [
  {
    name: "Curas Heroicas",
    folderName: "CURAS HEROICAS",
    target: "EH",
    mode: "table",
    parse: (text) => parseEffects(text, "Curas Her[oó]icas", /valor máximo de\s+(\d+)\s+pontos? de EH/i)
  },
  {
    name: "Curas Espirituais",
    folderName: "CURAS ESPIRITUAIS",
    target: "EH",
    mode: "fixed",
    parse: (text) => parseEffects(text, "Curas Espirituais", /(?:cura|curar)\s+(\d+)\s+pontos? de EH/i)
  },
  {
    name: "Curas Físicas",
    folderName: "CURAS FÍSICAS",
    target: "EF",
    mode: "fixed",
    parse: (text) => parseEffects(text, "Curas Físicas", /cura\s+(\d+)\s+pontos? de dano na EF/i)
  }
];

const cureRoute = "07 - MAGIAS / MAGIAS DE CURA";
const cureFolderId = stableId("tagmar-t3er-folder", cureRoute);
const folderDocument = (id, name, folder, route, legacyFolder, sort, color) => ({
  _id: id,
  name,
  type: "Item",
  folder,
  sorting: legacyFolder?.sorting ?? "a",
  sort: legacyFolder?.sort ?? sort,
  color: legacyFolder?.color ?? color,
  flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
});
const folders = [folderDocument(
  cureFolderId,
  "MAGIAS DE CURA",
  rootFolder._id,
  cureRoute,
  legacyFolderByPath.get(key(cureRoute)),
  1000000,
  "#208040"
)];
const items = [];

for (const definition of definitions) {
  const magia = uniqueMagicByName.get(key(definition.name));
  if (!magia) throw new Error(`Magia oficial não encontrada: ${definition.name}`);
  const text = plainText(magia.system.efeito);
  const effects = definition.parse(text);
  if (!effects.length) throw new Error(`Nenhum efeito reconhecido em ${definition.name}`);
  if (effects.some(({ effect, amount }) => !Number.isInteger(effect) || !Number.isInteger(amount) || amount <= 0)) {
    throw new Error(`Progressão de cura inválida em ${definition.name}`);
  }
  if (new Set(effects.map(({ effect }) => effect)).size !== effects.length) {
    throw new Error(`Efeitos duplicados em ${definition.name}`);
  }

  const route = `${cureRoute} / ${definition.folderName}`;
  const legacyFolder = legacyFolderByPath.get(key(route));
  const folderId = stableId("tagmar-t3er-folder", route);
  folders.push(folderDocument(folderId, definition.folderName, cureFolderId, route, legacyFolder, folders.length * 100000, "#176337"));

  for (const effect of effects) {
    const name = `${definition.name} ${effect.effect}`;
    const legacyItem = legacyItemByName.get(key(name));
    const description = `${headerFrom(text)}\n\n${name}: ${effect.detail}`;
    items.push({
      _id: stableId("tagmar-t3er-magia-cura", name),
      name,
      type: "Combate",
      img: legacyItem?.img ?? magia.img,
      folder: folderId,
      system: {
        alcance: "Toque",
        descricao: description,
        favorito: false,
        custo: 0,
        nivel: effect.effect,
        forca_min: 0,
        bonus: "AUR",
        bonus_dano: "AUR",
        peso: 0,
        preco: "",
        bonus_magico: 0,
        def_l: 0,
        def_m: 0,
        def_p: 0,
        dano: zeroProgression(),
        dano_base: definition.mode === "table" ? healingProgression(effect.amount) : zeroProgression(),
        penalidade: { p25: false, p50: false, p75: false, p100: false },
        tipo: "",
        municao: 0
      },
      flags: {
        tagmarSync: {
          edition,
          category,
          origin: "core",
          sourceName: magia.flags.tagmarSync.sourceName,
          sourceUrl: magia.flags.tagmarSync.sourceUrl,
          sourceHash: magia.flags.tagmarSync.sourceHash,
          parentMagicName: definition.name,
          parentMagicId: magia._id,
          effect: effect.effect,
          healingMode: definition.mode,
          healTarget: definition.target,
          healAmount: effect.amount,
          legacyItemId: legacyItem?._id ?? null,
          needsReview: false
        }
      }
    });
  }
}

if (new Set(folders.map(({ _id }) => _id)).size !== folders.length) throw new Error("IDs de pastas duplicados");
if (new Set(items.map(({ _id }) => _id)).size !== items.length) throw new Error("IDs de curas duplicados");
if (items.some((item) => !folders.some((folder) => folder._id === item.folder))) throw new Error("Cura sem pasta");

const output = join(cacheDir, "preview-magias-cura.json");
const foldersOutput = join(cacheDir, "preview-magias-cura-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  familias: definitions.length,
  efeitos: items.length,
  porFamilia: Object.fromEntries(definitions.map((definition) => [
    definition.name,
    items.filter((item) => item.flags.tagmarSync.parentMagicName === definition.name).length
  ]))
}, null, 2));
