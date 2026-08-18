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
const packPath = resolve(root, "packs", "reino-de-tagmar-t3er");
if (packPath !== resolve(root, "packs", "reino-de-tagmar-t3er")) throw new Error("Destino do pack fora do caminho permitido");

const documents = JSON.parse(await readFile(join(cacheDir, "preview-reinos-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-reinos-pages.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-reinos-folders.json"), "utf8"));
if (documents.length !== 31 || pages.length !== 31 || folders.length !== 5) throw new Error("Prévia do Reino de Tagmar incompleta");
const parentByPageId = new Map(documents.flatMap((document) => document.pages.map((pageId) => [pageId, document._id])));

const stagingRoot = await mkdtemp(join(tmpdir(), "tagmar-reinos-pack-"));
const stagingPath = join(stagingRoot, "reino-de-tagmar-t3er");
const db = new ClassicLevel(stagingPath, { keyEncoding: "utf8", valueEncoding: "json" });
try {
  await db.open();
  await db.batch([
    ...folders.map((folder) => ({ type: "put", key: `!folders!${folder._id}`, value: folder })),
    ...documents.map((document) => ({ type: "put", key: `!journal!${document._id}`, value: document })),
    ...pages.map((page) => ({ type: "put", key: `!journal.pages!${parentByPageId.get(page._id)}.${page._id}`, value: page }))
  ]);
} finally {
  await db.close();
}
try {
  const files = await readdir(stagingPath);
  if (!files.includes("CURRENT") || !files.some((name) => name.endsWith(".ldb") || name.endsWith(".log"))) throw new Error("Banco temporário incompleto");
  await rm(packPath, { recursive: true, force: true });
  await cp(stagingPath, packPath, { recursive: true });
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
console.log(JSON.stringify({ packPath, folders: folders.length, documents: documents.length, pages: pages.length }, null, 2));
