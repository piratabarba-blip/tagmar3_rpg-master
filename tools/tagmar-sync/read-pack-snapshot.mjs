import { createRequire } from "node:module";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const packsRoot = resolve(root, "packs");
const packName = process.argv.find((argument) => argument.startsWith("--pack="))?.slice("--pack=".length);
if (!packName || basename(packName) !== packName) throw new Error("Informe um pack local simples com --pack=nome-do-pack");

const sourcePackPath = resolve(packsRoot, packName);
if (!sourcePackPath.startsWith(`${packsRoot}\\`)) throw new Error("Pack fora da pasta permitida");
const system = JSON.parse(await readFile(join(root, "system.json"), "utf8"));
const registeredPack = system.packs?.find((pack) => pack.name === packName);
if (!registeredPack) throw new Error(`Pack não registrado no sistema: ${packName}`);

const outputPath = join(root, ".cache", "tagmar-sync", `snapshot-${packName}.json`);
const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-pack-read-"));
const packPath = join(temporaryRoot, packName);
await cp(sourcePackPath, packPath, { recursive: true });
// Alguns packs antigos foram versionados com CURRENT em CRLF. O LevelDB trata
// o caractere CR como parte do nome do manifesto; normalizamos apenas a cópia.
const currentPath = join(packPath, "CURRENT");
await writeFile(currentPath, `${(await readFile(currentPath, "utf8")).trim()}\n`, "utf8");
const db = new ClassicLevel(packPath, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
const documentKeys = {
  Actor: "actors",
  Item: "items",
  JournalEntry: "journal",
  Macro: "macros",
  Playlist: "playlists",
  RollTable: "tables",
  Scene: "scenes"
};
const documentKey = documentKeys[registeredPack.type];
if (!documentKey) throw new Error(`Tipo de pack ainda não suportado: ${registeredPack.type}`);
const result = { pack: packName, type: registeredPack.type, folders: [], documents: [], pages: [], databaseKeys: [] };

try {
  await db.open();
  for await (const [key, value] of db.iterator()) {
    result.databaseKeys.push(key);
    if (key.includes("folders!")) result.folders.push(value);
    if (key.includes(`${documentKey}!`)) result.documents.push(value);
    if (registeredPack.type === "JournalEntry" && key.includes("pages!")) result.pages.push(value);
  }
} finally {
  await db.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

result.folders.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
result.documents.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
result.pages.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
const byType = Object.fromEntries([...result.documents.reduce((map, document) => {
  const type = document.type ?? registeredPack.type;
  return map.set(type, (map.get(type) ?? 0) + 1);
}, new Map())].sort(([a], [b]) => a.localeCompare(b, "pt-BR")));
console.log(JSON.stringify({ output: outputPath, type: registeredPack.type, folders: result.folders.length, documents: result.documents.length, pages: result.pages.length, byType }, null, 2));
