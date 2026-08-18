import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const documents = JSON.parse(await readFile(join(cacheDir, "preview-reinos-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-reinos-pages.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-reinos-folders.json"), "utf8"));
const errors = [];

if (documents.length !== 23) errors.push(`Esperados 23 diários; encontrados ${documents.length}`);
if (pages.length !== 23) errors.push(`Esperadas 23 páginas; encontradas ${pages.length}`);
if (folders.length !== 3) errors.push(`Esperadas 3 pastas; encontradas ${folders.length}`);
const ids = [...documents, ...pages, ...folders].map((entry) => entry._id);
if (new Set(ids).size !== ids.length) errors.push("Há IDs duplicados no pack");
for (const document of documents) {
  if (!folders.some((folder) => folder._id === document.folder)) errors.push(`${document.name}: pasta inválida`);
  if (document.pages.length !== 1 || !pages.some((page) => page._id === document.pages[0])) errors.push(`${document.name}: página inválida`);
  if (document.flags?.tagmarSync?.sourceBook !== "Livro dos Reinos") errors.push(`${document.name}: livro de origem ausente`);
}
for (const page of pages) {
  const content = page.text?.content ?? "";
  if (content.length < 150) errors.push(`${page.name}: conteúdo parece truncado (${content.length} caracteres)`);
  if (!content.includes("Fonte oficial sincronizada:")) errors.push(`${page.name}: fonte oficial ausente`);
  if (!page.flags?.tagmarSync?.sourceHash) errors.push(`${page.name}: hash da origem ausente`);
}
for (const realm of ["Levânia", "Ludgrim", "Eredra", "Verrogar", "Dantsem", "Marana", "Luna", "Portis", "Âmiem", "Abadom", "Acordo", "Plana", "Filanti", "Conti", "Azanti", "Calco", "Cidades-Estado", "Porto Livre"]) {
  if (!documents.some((document) => document.name === realm)) errors.push(`Reino ausente: ${realm}`);
}

console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
