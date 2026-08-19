import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "..", "..");
const rootArgument = process.argv.find((argument) => argument.startsWith("--root="))?.slice(7);
const root = resolve(rootArgument ?? defaultRoot);
const errors = [];
const warnings = [];

const documentKeys = {
  Actor: "actors",
  Item: "items",
  JournalEntry: "journal",
  Macro: "macros",
  Playlist: "playlists",
  RollTable: "tables",
  Scene: "scenes"
};

async function exists(path) {
  try { await stat(path); return true; }
  catch { return false; }
}

function insideRoot(path) {
  const candidate = relative(root, path);
  return candidate === "" || (!candidate.startsWith("..") && !isAbsolute(candidate));
}

const manifestPath = join(root, "system.json");
if (!await exists(manifestPath)) throw new Error(`system.json ausente em ${root}`);
const system = JSON.parse(await readFile(manifestPath, "utf8"));
if (system.id !== "tagmar_rpg") errors.push(`ID inesperado: ${system.id}`);
if (String(system.compatibility?.minimum) !== "14") errors.push("Compatibilidade mínima não está em V14");
if (!String(system.compatibility?.verified ?? "").startsWith("14")) errors.push("Versão verificada não está em V14");
if (!/^https:\/\/raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/refs\/heads\/[\w./-]+\/system\.json$/i.test(String(system.manifest ?? ""))
  && !String(system.manifest ?? "").includes(system.version)) {
  errors.push("URL do manifesto não aponta para a ramificação atual nem contém a versão declarada");
}
if (!String(system.download ?? "").includes(system.version)) errors.push("URL de download não contém a versão declarada");

for (const path of [...(system.scripts ?? []), ...(system.esmodules ?? []), ...(system.styles ?? [])]) {
  const absolute = resolve(root, path);
  if (!insideRoot(absolute) || !await exists(absolute)) errors.push(`Arquivo declarado ausente ou inválido: ${path}`);
}

const packNames = new Set();
const packPaths = new Set();
const packReport = [];
for (const pack of system.packs ?? []) {
  if (packNames.has(pack.name)) errors.push(`Nome de pack duplicado: ${pack.name}`);
  if (packPaths.has(pack.path)) errors.push(`Caminho de pack duplicado: ${pack.path}`);
  packNames.add(pack.name);
  packPaths.add(pack.path);
  const documentKey = documentKeys[pack.type];
  if (!documentKey) {
    errors.push(`Tipo de pack não suportado no preflight: ${pack.name} (${pack.type})`);
    continue;
  }
  const sourcePath = resolve(root, pack.path);
  if (!insideRoot(sourcePath) || !await exists(sourcePath)) {
    errors.push(`Pack ausente ou fora da raiz: ${pack.name}`);
    continue;
  }
  const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-release-pack-"));
  const packPath = join(temporaryRoot, pack.name);
  const documents = [];
  const keys = new Set();
  let folders = 0;
  let pages = 0;
  try {
    await cp(sourcePath, packPath, { recursive: true });
    const currentPath = join(packPath, "CURRENT");
    if (await exists(currentPath)) await writeFile(currentPath, `${(await readFile(currentPath, "utf8")).trim()}\n`, "utf8");
    const db = new ClassicLevel(packPath, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
    try {
      await db.open();
      for await (const [key, value] of db.iterator()) {
        keys.add(key);
        if (key.includes("folders!")) folders += 1;
        if (key.includes(`${documentKey}!`)) documents.push(value);
        if (key.includes("journal.pages!")) pages += 1;
      }
    } finally {
      await db.close();
    }
  } catch (error) {
    errors.push(`${pack.name}: banco não pôde ser aberto (${error.message})`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  if (!documents.length) errors.push(`${pack.name}: nenhum documento encontrado`);
  if (pack.type === "JournalEntry") {
    for (const document of documents) {
      for (const pageId of document.pages ?? []) {
        const pageKey = `!journal.pages!${document._id}.${pageId}`;
        if (!keys.has(pageKey)) errors.push(`${pack.name}: página ${pageId} não está vinculada ao diário ${document._id}`);
      }
    }
    const expectedPages = documents.reduce((total, document) => total + (document.pages?.length ?? 0), 0);
    if (pages !== expectedPages) errors.push(`${pack.name}: ${pages} páginas gravadas para ${expectedPages} referências`);
  }
  packReport.push({ name: pack.name, type: pack.type, documents: documents.length, folders, pages });
}

if (!system.packs?.length) errors.push("Nenhum pack declarado");
const report = { root, id: system.id, version: system.version, packs: packReport, errors, warnings };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
