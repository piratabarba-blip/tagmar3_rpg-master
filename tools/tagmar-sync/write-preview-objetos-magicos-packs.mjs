import { createRequire } from "node:module";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");

async function writePack(name, entries) {
  const expected = resolve(root, "packs", name);
  if (!expected.startsWith(`${resolve(root, "packs")}\\`)) throw new Error("Pack fora do destino permitido");
  await mkdir(expected, { recursive: true });
  const db = new ClassicLevel(expected, { keyEncoding: "utf8", valueEncoding: "json" });
  try {
    await db.open(); await db.clear(); await db.batch(entries); await db.compactRange("\x00", "\xff");
  } finally { await db.close(); }
  const files = await readdir(expected);
  if (!files.includes("CURRENT") || !files.some((file) => /\.(?:ldb|log)$/.test(file))) throw new Error(`${name}: banco incompleto`);
  return expected;
}

const items = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos.json"), "utf8"));
const itemFolders = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-folders.json"), "utf8"));
const documents = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-guide-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-guide-pages.json"), "utf8"));
const journalFolders = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-guide-folders.json"), "utf8"));
if (items.length !== 137 || documents.length !== 10 || pages.length !== 10) throw new Error("Prévia dos Objetos Mágicos incompleta");
const parentByPageId = new Map(documents.flatMap((document) => document.pages.map((pageId) => [pageId, document._id])));
const itemPath = await writePack("objetos-magicos-t3er", [
  ...itemFolders.map((value) => ({ type: "put", key: `!folders!${value._id}`, value })),
  ...items.map((value) => ({ type: "put", key: `!items!${value._id}`, value }))
]);
const guidePath = await writePack("objetos-magicos-regras-t3er", [
  ...journalFolders.map((value) => ({ type: "put", key: `!folders!${value._id}`, value })),
  ...documents.map((value) => ({ type: "put", key: `!journal!${value._id}`, value })),
  ...pages.map((value) => ({ type: "put", key: `!journal.pages!${parentByPageId.get(value._id)}.${value._id}`, value }))
]);
console.log(JSON.stringify({ itemPath, guidePath, items: items.length, documents: documents.length, pages: pages.length }, null, 2));
