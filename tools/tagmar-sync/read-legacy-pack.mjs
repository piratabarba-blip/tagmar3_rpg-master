import { createRequire } from "node:module";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const sourcePackPath = join(root, "packs", "criando-fichas");
const outputPath = join(root, ".cache", "tagmar-sync", "legacy-pack.json");
// O LevelDB pode atualizar arquivos administrativos mesmo em uma leitura. Para
// garantir que o compêndio clássico permaneça byte a byte intacto, toda leitura
// é feita sobre uma cópia temporária descartável.
const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-classic-read-"));
const packPath = join(temporaryRoot, "criando-fichas");
await cp(sourcePackPath, packPath, { recursive: true });
const db = new ClassicLevel(packPath, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
const result = { folders: [], items: [] };

try {
  await db.open();
  for await (const [key, value] of db.iterator()) {
    if (key.includes("folders!")) result.folders.push(value);
    if (key.includes("items!")) result.items.push(value);
  }
} finally {
  await db.close();
  await rm(temporaryRoot, { recursive: true, force: true });
}

result.folders.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
result.items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, folders: result.folders.length, items: result.items.length }, null, 2));
