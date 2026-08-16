import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const edition = "Tagmar 3 Edição Revisada";
const category = "magias-dano";
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
if (!rootFolder) throw new Error("Pasta raiz de Magias não encontrada. Gere primeiro preview-magias-folders.json");

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
const legacyAttackByName = new Map(legacy.items
  .filter((item) => item.type === "Combate" && key(legacyFolderPath(item.folder)).startsWith(key("07 - MAGIAS / MAGIAS DE ATAQUE")))
  .map((item) => [key(item.name), item]));

const uniqueMagicByName = new Map();
for (const magia of magias) {
  if (!uniqueMagicByName.has(key(magia.name))) uniqueMagicByName.set(key(magia.name), magia);
}

const definitions = [
  {
    name: "Bola de Fogo",
    folderName: "BOLA DE FOGO",
    legacyFolderName: "BOLA E FOGO",
    parse(text) {
      return [...text.matchAll(/Bola de Fogo\s+(\d+)\s*:\s*Causa\s+(\d+)\s+pontos? de dano\s+em uma esfera de\s+([^\n.]+)[.]/gi)]
        .map((match) => ({ effect: Number(match[1]), maxDamage: Number(match[2]), range: "50m", detail: `Esfera de ${match[3].trim()}` }));
    }
  },
  {
    name: "Raio Elétrico",
    folderName: "RAIO ELÉTRICO",
    legacyFolderName: "RAIO ELÉTRICO",
    parse(text) {
      return [...text.matchAll(/Raio Elétrico\s+(\d+)\s*:\s*Causa\s+(\d+)\s+de dano máximo\s+e o alcance é de\s+([^\n.]+)[.]/gi)]
        .map((match) => ({ effect: Number(match[1]), maxDamage: Number(match[2]), range: match[3].trim().replace(/\s*metros?$/i, "m"), detail: `Alcance de ${match[3].trim()}` }));
    }
  }
];

const attackRoute = "07 - MAGIAS / MAGIAS DE ATAQUE";
const attackLegacyFolder = legacyFolderByPath.get(key(attackRoute));
const attackFolderId = stableId("tagmar-t3er-folder", attackRoute);
const folderDocument = (id, name, folder, route, legacyFolder, sort, color) => ({
  _id: id,
  name,
  type: "Item",
  folder,
  sorting: legacyFolder?.sorting ?? "a",
  sort: legacyFolder?.sort ?? sort,
  color: legacyFolder?.color ?? color,
  flags: {
    tagmarSync: {
      edition,
      category,
      route,
      legacyFolderId: legacyFolder?._id ?? null
    }
  }
});

const folders = [folderDocument(
  attackFolderId,
  "MAGIAS DE ATAQUE",
  rootFolder._id,
  attackRoute,
  attackLegacyFolder,
  900000,
  "#a00000"
)];
const items = [];

const damageProgression = (maxDamage) => Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => {
    const percentage = (index + 1) * 25;
    return [`d${percentage}`, (maxDamage * percentage) / 100];
  })
);

for (const definition of definitions) {
  const magia = uniqueMagicByName.get(key(definition.name));
  if (!magia) throw new Error(`Magia oficial não encontrada: ${definition.name}`);
  const effects = definition.parse(plainText(magia.system.efeito));
  if (!effects.length) throw new Error(`Nenhum efeito ofensivo reconhecido em ${definition.name}`);
  if (effects.some((effect) => !Number.isInteger(effect.effect) || !Number.isInteger(effect.maxDamage) || effect.maxDamage % 4 !== 0)) {
    throw new Error(`Progressão de dano inválida em ${definition.name}`);
  }
  const effectNumbers = new Set(effects.map((effect) => effect.effect));
  if (effectNumbers.size !== effects.length) throw new Error(`Efeitos duplicados em ${definition.name}`);

  const route = `${attackRoute} / ${definition.folderName}`;
  const legacyRoute = `${attackRoute} / ${definition.legacyFolderName}`;
  const legacyFolder = legacyFolderByPath.get(key(legacyRoute));
  const folderId = stableId("tagmar-t3er-folder", route);
  folders.push(folderDocument(folderId, definition.folderName, attackFolderId, route, legacyFolder, 100000 + folders.length * 100000, "#5e0000"));

  for (const effect of effects) {
    const name = `${definition.name} ${effect.effect}`;
    const legacyItem = legacyAttackByName.get(key(name));
    const description = `${name}: causa ${effect.maxDamage} pontos de dano máximo. ${effect.detail}.`;
    items.push({
      _id: stableId("tagmar-t3er-magia-dano", name),
      name,
      type: "Combate",
      img: legacyItem?.img ?? magia.img,
      folder: folderId,
      system: {
        alcance: effect.range,
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
        dano: damageProgression(0),
        dano_base: damageProgression(effect.maxDamage),
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
          maxDamage: effect.maxDamage,
          legacyItemId: legacyItem?._id ?? null,
          needsReview: false
        }
      }
    });
  }
}

if (new Set(folders.map((folder) => folder._id)).size !== folders.length) throw new Error("IDs de pastas duplicados");
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs de ataques mágicos duplicados");
if (items.some((item) => !folders.some((folder) => folder._id === item.folder))) throw new Error("Ataque mágico sem pasta");

const output = join(cacheDir, "preview-magias-dano.json");
const foldersOutput = join(cacheDir, "preview-magias-dano-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  magias: definitions.length,
  efeitos: items.length,
  porMagia: Object.fromEntries(definitions.map((definition) => [definition.name, items.filter((item) => item.flags.tagmarSync.parentMagicName === definition.name).length]))
}, null, 2));
