import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "..", "..", ".cache", "tagmar-sync");
const items = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-folders.json"), "utf8"));
const documents = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-guide-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-guide-pages.json"), "utf8"));
const guideFolders = JSON.parse(await readFile(join(cacheDir, "preview-objetos-magicos-guide-folders.json"), "utf8"));
const errors = [];
if (items.length !== 137) errors.push(`Itens utilizáveis: ${items.length}/137`);
if (new Set(items.map((item) => item.flags?.tagmarSync?.sourceArtifactName ?? item.name)).size !== 135) errors.push("Os itens não correspondem aos 135 objetos oficiais");
if (folders.length !== 14) errors.push(`Pastas de objetos: ${folders.length}/14`);
if (documents.length !== 10 || pages.length !== 10 || guideFolders.length !== 3) errors.push("Guia oficial incompleto");
if (new Set(items.map((item) => item._id)).size !== items.length) errors.push("IDs de objetos duplicados");
for (const item of items) {
  const sync = item.flags?.tagmarSync;
  if (!folders.some((folder) => folder._id === item.folder)) errors.push(`${item.name}: pasta inválida`);
  if (!sync?.sourceUrl?.startsWith("https://tagmar.com.br/") || !sync?.sourceHash) errors.push(`${item.name}: fonte incompleta`);
  if (!sync?.magicalOrigin || !sync?.rarity || !sync?.objectType) errors.push(`${item.name}: metadados oficiais incompletos`);
  if (!String(item.system?.descricao ?? "").includes("Fonte oficial:")) errors.push(`${item.name}: descrição ou fonte ausente`);
  if (!String(item.img ?? "").startsWith("icons/")) errors.push(`${item.name}: imagem não nativa do Foundry`);
  if (item.type === "Defesa" && Number(item.system?.peso) !== 1) errors.push(`${item.name}: Abs. Mágica não ativada`);
  if (item.type === "Combate" && !Number.isFinite(Number(item.system?.bonus_magico))) errors.push(`${item.name}: bônus mágico inválido`);
}
const expectedTypes = { Combate: 23, Defesa: 22, Pertence: 92 };
for (const [type, count] of Object.entries(expectedTypes)) if (items.filter((item) => item.type === type).length !== count) errors.push(`${type}: contagem inesperada`);
for (const document of documents) {
  if (!guideFolders.some((folder) => folder._id === document.folder)) errors.push(`${document.name}: pasta de guia inválida`);
  if (document.pages.length !== 1 || !pages.some((page) => page._id === document.pages[0])) errors.push(`${document.name}: página inválida`);
}
for (const page of pages) {
  const content = page.text?.content ?? "";
  if (content.length < 500 || !content.includes("Fonte oficial:")) errors.push(`${page.name}: conteúdo truncado`);
  if (/localhost:30000|href=["']\/|src=["']\//i.test(content)) errors.push(`${page.name}: URL local ou relativa`);
}
console.log(JSON.stringify({ items: items.length, folders: folders.length, documents: documents.length, pages: pages.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
