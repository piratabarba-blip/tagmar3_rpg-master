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
const packPath = resolve(root, "packs", "terras-selvagens-regras-t3er");
if (packPath !== resolve(root, "packs", "terras-selvagens-regras-t3er")) throw new Error("Destino do pack fora do caminho permitido");

const documents = JSON.parse(await readFile(join(cacheDir, "preview-terras-regras-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-terras-regras-pages.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-terras-regras-folders.json"), "utf8"));
if (!documents.length || !pages.length || !folders.length) throw new Error("Prévia das regras de Terras Selvagens está vazia");
const parentByPageId = new Map();
for (const document of documents) {
  for (const pageId of document.pages) {
    if (parentByPageId.has(pageId)) throw new Error(`Página vinculada a mais de um diário: ${pageId}`);
    parentByPageId.set(pageId, document._id);
  }
}
for (const page of pages) {
  if (!parentByPageId.has(page._id)) throw new Error(`Página sem diário pai: ${page._id}`);
}

const stagingRoot = await mkdtemp(join(tmpdir(), "tagmar-terras-regras-pack-"));
const stagingPath = join(stagingRoot, "terras-selvagens-regras-t3er");
const db = new ClassicLevel(stagingPath, { keyEncoding: "utf8", valueEncoding: "json" });
let writtenFolders = 0;
let writtenDocuments = 0;
let writtenPages = 0;
try {
  await db.open();
  await db.clear();
  await db.batch([
    ...folders.map((folder) => ({ type: "put", key: `!folders!${folder._id}`, value: folder })),
    ...documents.map((document) => ({ type: "put", key: `!journal!${document._id}`, value: document })),
    ...pages.map((page) => ({ type: "put", key: `!journal.pages!${parentByPageId.get(page._id)}.${page._id}`, value: page }))
  ]);
  for await (const [key] of db.iterator({ keys: true, values: false })) {
    if (key.includes("folders!")) writtenFolders += 1;
    if (key.includes("!journal!")) writtenDocuments += 1;
    if (key.includes("journal.pages!")) writtenPages += 1;
  }
} finally {
  await db.close();
}
if (writtenFolders !== folders.length || writtenDocuments !== documents.length || writtenPages !== pages.length) {
  throw new Error("Falha na validação do pack de regras de Terras Selvagens");
}
try {
  const stagedFiles = await readdir(stagingPath);
  if (!stagedFiles.includes("CURRENT") || !stagedFiles.some((name) => name.endsWith(".ldb") || name.endsWith(".log"))) throw new Error("Banco temporário incompleto");
  await rm(packPath, { recursive: true, force: true });
  await cp(stagingPath, packPath, { recursive: true });
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
console.log(JSON.stringify({ packPath, folders: writtenFolders, documents: writtenDocuments, pages: writtenPages }, null, 2));
