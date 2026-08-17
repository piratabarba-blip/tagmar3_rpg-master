import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const documents = JSON.parse(await readFile(join(cacheDir, "preview-terras-regras-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-terras-regras-pages.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-terras-regras-folders.json"), "utf8"));
const errors = [];

if (documents.length !== 2) errors.push(`Esperados 2 diários; encontrados ${documents.length}`);
if (pages.length !== 2) errors.push(`Esperadas 2 páginas; encontradas ${pages.length}`);
if (folders.length !== 2) errors.push(`Esperadas 2 pastas; encontradas ${folders.length}`);
const allIds = [...documents, ...pages, ...folders].map((entry) => entry._id);
if (new Set(allIds).size !== allIds.length) errors.push("Há IDs duplicados no pack de regras");
for (const document of documents) {
  if (!folders.some((folder) => folder._id === document.folder)) errors.push(`${document.name}: pasta inválida`);
  if (document.pages.length !== 1 || !pages.some((page) => page._id === document.pages[0])) errors.push(`${document.name}: página vinculada inválida`);
  if (!document.flags?.tagmarSync?.sourceUrl?.startsWith("https://tagmar.com.br/")) errors.push(`${document.name}: fonte oficial ausente`);
}
for (const page of pages) {
  const content = page.text?.content ?? "";
  if (content.length < 10000) errors.push(`${page.name}: conteúdo parece truncado (${content.length} caracteres)`);
  if (!content.includes("<strong>Fonte oficial:</strong>")) errors.push(`${page.name}: crédito da fonte ausente`);
  if (/http:\/\//i.test(content)) errors.push(`${page.name}: contém recurso HTTP inseguro`);
}
const regions = pages.find((page) => page.name === "Influência das Regiões Mágicas");
if (!regions?.text?.content.includes("systems/tagmar_rpg/assets/tagmar-site/mapa-planar.jpg")) errors.push("Mapa planar local ausente");
const characterizations = pages.find((page) => page.name.startsWith("Caracterizações"));
for (const name of ["Agricultor {1}", "Conhecimento Místico {3}", "Prodígio {1 à 5}", "Vulnerável ao Clima Extremo"]) {
  if (!characterizations?.text?.content.includes(name)) errors.push(`Caracterização ausente: ${name}`);
}
for (const name of ["Arredores do Domo de Arminus", "Caridrândia e Floresta sombria", "Estepes Vítreas", "Gammar Tir"]) {
  if (!regions?.text?.content.includes(name)) errors.push(`Região mágica ausente: ${name}`);
}

console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
