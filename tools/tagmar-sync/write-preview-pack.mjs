import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const packPath = resolve(root, "packs", "criando-fichas-t3er");
const expectedPath = resolve(root, "packs", "criando-fichas-t3er");
if (packPath !== expectedPath) throw new Error("Destino do pack fora do caminho permitido");

const previewParts = [
  ["preview-personagens.json", "preview-personagens-folders.json"],
  ["preview-pertences.json", "preview-pertences-folders.json"],
  ["preview-tesouros.json", "preview-tesouros-folders.json"],
  ["preview-venenos.json", "preview-venenos-folders.json"],
  ["preview-rituais.json", "preview-rituais-folders.json"],
  ["preview-moedas.json", "preview-moedas-folders.json"],
  ["preview-habilidades.json", "preview-habilidades-folders.json"],
  ["preview-combate.json", "preview-combate-folders.json"],
  ["preview-defesa.json", "preview-defesa-folders.json"],
  ["preview-tecnicas.json", "preview-tecnicas-folders.json"],
  ["preview-magias.json", "preview-magias-folders.json"],
  ["preview-magias-ancestrais.json", "preview-magias-ancestrais-folders.json"],
  ["preview-magias-perdidas.json", "preview-magias-perdidas-folders.json"],
  ["preview-magias-dano.json", "preview-magias-dano-folders.json"],
  ["preview-magias-cura.json", "preview-magias-cura-folders.json"]
];
const items = [];
const folders = [];
for (const [itemsFile, foldersFile] of previewParts) {
  try {
    items.push(...JSON.parse(await readFile(join(cacheDir, itemsFile), "utf8")));
    folders.push(...JSON.parse(await readFile(join(cacheDir, foldersFile), "utf8")));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!items.length || !folders.length) throw new Error("Nenhuma prévia foi gerada");
const db = new ClassicLevel(packPath, { keyEncoding: "utf8", valueEncoding: "json" });

const itemDocuments = items.map((item) => ({
  ...item,
  effects: [],
  sort: 0,
  ownership: { default: 0 },
  _stats: {
    compendiumSource: null,
    duplicateSource: null,
    coreVersion: "14.366",
    systemId: "tagmar_rpg",
    systemVersion: "2.6.0-v14.1"
  }
}));
let writtenFolders = 0;
let writtenItems = 0;

try {
  await db.open();
  await db.clear();
  const operations = [
    ...folders.map((folder) => ({ type: "put", key: `!folders!${folder._id}`, value: folder })),
    ...itemDocuments.map((item) => ({ type: "put", key: `!items!${item._id}`, value: item }))
  ];
  await db.batch(operations);
  for await (const [key] of db.iterator({ keys: true, values: false })) {
    if (key.includes("folders!")) writtenFolders += 1;
    if (key.includes("items!")) writtenItems += 1;
  }
} finally {
  await db.close();
}

if (writtenFolders !== folders.length || writtenItems !== itemDocuments.length) {
  throw new Error(`Falha de validação: esperado ${folders.length}/${itemDocuments.length}, gravado ${writtenFolders}/${writtenItems}`);
}
console.log(JSON.stringify({ packPath, folders: writtenFolders, items: writtenItems }, null, 2));
