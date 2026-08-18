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
const system = JSON.parse(await readFile(join(root, "system.json"), "utf8"));
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
// Biblioteca autoral criada no compêndio clássico para auxiliar o Mestre a
// montar criaturas. Ela é preservada localmente e não participa da
// sincronização editorial com o site oficial.
const classicSnapshot = JSON.parse(await readFile(join(cacheDir, "snapshot-criando-fichas.json"), "utf8"));
const supportRoot = classicSnapshot.folders.find((folder) => folder.name === "11 - CRIANDO CRIATURAS");
if (!supportRoot) throw new Error("Pasta clássica 11 - CRIANDO CRIATURAS não encontrada");
const supportFolderIds = new Set([supportRoot._id]);
let supportFolderAdded = true;
while (supportFolderAdded) {
  supportFolderAdded = false;
  for (const folder of classicSnapshot.folders) {
    if (supportFolderIds.has(folder._id) || !supportFolderIds.has(folder.folder)) continue;
    supportFolderIds.add(folder._id);
    supportFolderAdded = true;
  }
}
const supportFlags = {
  origin: "material-autoral-classico",
  purpose: "consulta-e-criacao-de-criaturas",
  official: false,
  synchronizedWithOfficialSite: false,
  protectedFromOfficialSync: true
};
const supportFolders = classicSnapshot.folders
  .filter((folder) => supportFolderIds.has(folder._id))
  .map((folder) => ({
    ...structuredClone(folder),
    name: folder._id === supportRoot._id ? "11 - CRIANDO CRIATURAS — MATERIAL DE APOIO" : folder.name,
    flags: { ...(folder.flags ?? {}), tagmarSync: supportFlags }
  }));
const supportItems = classicSnapshot.documents
  .filter((item) => supportFolderIds.has(item.folder))
  .map((item) => ({
    ...structuredClone(item),
    flags: { ...(item.flags ?? {}), tagmarSync: supportFlags }
  }));
const existingFolderIds = new Set(folders.map((folder) => folder._id));
const existingItemIds = new Set(items.map((item) => item._id));
const folderCollisions = supportFolders.filter((folder) => existingFolderIds.has(folder._id));
const itemCollisions = supportItems.filter((item) => existingItemIds.has(item._id));
if (folderCollisions.length || itemCollisions.length) {
  throw new Error(`Colisões ao preservar material de apoio: ${folderCollisions.length} pastas, ${itemCollisions.length} itens`);
}
folders.push(...supportFolders);
items.push(...supportItems);
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
    systemVersion: system.version
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
console.log(JSON.stringify({
  packPath, folders: writtenFolders, items: writtenItems,
  supportLibrary: { folders: supportFolders.length, items: supportItems.length, official: false, synchronizedWithOfficialSite: false }
}, null, 2));
