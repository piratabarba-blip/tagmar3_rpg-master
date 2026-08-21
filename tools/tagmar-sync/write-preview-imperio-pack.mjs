import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const expectedPath = resolve(root, "packs", "o-imperio-t3er");
const packPath = expectedPath;
if (packPath !== expectedPath) throw new Error("Destino do pack fora do caminho permitido");

const documents = JSON.parse(await readFile(join(cacheDir, "preview-imperio-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-imperio-pages.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-imperio-folders.json"), "utf8"));
if (documents.length !== 26 || pages.length !== 26 || folders.length !== 11) throw new Error("Prévia de O Império incompleta");
const parentByPageId = new Map(documents.flatMap((document) => document.pages.map((pageId) => [pageId, document._id])));

const db = new ClassicLevel(packPath, { keyEncoding: "utf8", valueEncoding: "json" });
try {
  await db.open();
  await db.clear();
  await db.batch([
    ...folders.map((folder) => ({ type: "put", key: `!folders!${folder._id}`, value: folder })),
    ...documents.map((document) => ({ type: "put", key: `!journal!${document._id}`, value: document })),
    ...pages.map((page) => ({ type: "put", key: `!journal.pages!${parentByPageId.get(page._id)}.${page._id}`, value: page }))
  ]);
  await db.compactRange("\x00", "\xff");
} finally {
  await db.close();
}
const files = await readdir(packPath);
if (!files.includes("CURRENT") || !files.some((name) => name.endsWith(".ldb") || name.endsWith(".log"))) throw new Error("Banco do Império incompleto");
console.log(JSON.stringify({ packPath, folders: folders.length, documents: documents.length, pages: pages.length }, null, 2));
