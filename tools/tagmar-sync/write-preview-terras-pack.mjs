import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const packPath = resolve(root, "packs", "terras-selvagens-t3er");
const expectedPath = resolve(root, "packs", "terras-selvagens-t3er");
if (packPath !== expectedPath) throw new Error("Destino do pack fora do caminho permitido");

const parts = ["terras-personagens", "terras-combate", "terras-defesa", "terras-tecnicas", "terras-magias"];
const items = [];
const folders = [];
for (const part of parts) {
  items.push(...JSON.parse(await readFile(join(cacheDir, `preview-${part}.json`), "utf8")));
  folders.push(...JSON.parse(await readFile(join(cacheDir, `preview-${part}-folders.json`), "utf8")));
}
if (!items.length || !folders.length) throw new Error("Nenhuma prévia de Terras Selvagens foi gerada");
const stagingRoot = await mkdtemp(join(tmpdir(), "tagmar-terras-pack-"));
const stagingPath = join(stagingRoot, "terras-selvagens-t3er");
const db = new ClassicLevel(stagingPath, { keyEncoding: "utf8", valueEncoding: "json" });
const documents = items.map((item) => ({
  ...item,
  effects: [],
  sort: 0,
  ownership: { default: 0 },
  _stats: { compendiumSource: null, duplicateSource: null, coreVersion: "14.366", systemId: "tagmar_rpg", systemVersion: "2.6.0-v14.1" }
}));
let writtenFolders = 0;
let writtenItems = 0;
try {
  await db.open();
  await db.clear();
  await db.batch([
    ...folders.map((folder) => ({ type: "put", key: `!folders!${folder._id}`, value: folder })),
    ...documents.map((item) => ({ type: "put", key: `!items!${item._id}`, value: item }))
  ]);
  for await (const [key] of db.iterator({ keys: true, values: false })) {
    if (key.includes("folders!")) writtenFolders += 1;
    if (key.includes("items!")) writtenItems += 1;
  }
} finally {
  await db.close();
}
if (writtenFolders !== folders.length || writtenItems !== documents.length) throw new Error("Falha na validação do pack de Terras Selvagens");
try {
  const stagedFiles = await readdir(stagingPath);
  if (!stagedFiles.some((name) => name.endsWith(".ldb") || name.endsWith(".log")) || !stagedFiles.includes("CURRENT")) {
    throw new Error("Banco temporário de Terras Selvagens incompleto");
  }
  await rm(packPath, { recursive: true, force: true });
  await cp(stagingPath, packPath, { recursive: true });
  const installedFiles = await readdir(packPath);
  if (!installedFiles.some((name) => name.endsWith(".ldb") || name.endsWith(".log")) || !installedFiles.includes("CURRENT")) {
    throw new Error("Banco copiado de Terras Selvagens incompleto");
  }
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
console.log(JSON.stringify({ packPath, folders: writtenFolders, items: writtenItems }, null, 2));
