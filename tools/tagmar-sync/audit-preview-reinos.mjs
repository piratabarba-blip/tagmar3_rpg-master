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

if (documents.length !== 46) errors.push(`Esperados 46 diários; encontrados ${documents.length}`);
if (pages.length !== 46) errors.push(`Esperadas 46 páginas; encontradas ${pages.length}`);
if (folders.length !== 9) errors.push(`Esperadas 9 pastas; encontradas ${folders.length}`);
const ids = [...documents, ...pages, ...folders].map((entry) => entry._id);
if (new Set(ids).size !== ids.length) errors.push("Há IDs duplicados no pack");
for (const document of documents) {
  if (!folders.some((folder) => folder._id === document.folder)) errors.push(`${document.name}: pasta inválida`);
  if (document.pages.length !== 1 || !pages.some((page) => page._id === document.pages[0])) errors.push(`${document.name}: página inválida`);
  if (!["Livro dos Reinos", "Livro dos Deuses", "Livro de Ambientação", "Livro de Magias"].includes(document.flags?.tagmarSync?.sourceBook)) errors.push(`${document.name}: livro de origem ausente`);
}
for (const reference of ["Guia do Livro dos Deuses", "Os deuses de Tagmar", "Calendário e festividades"]) {
  if (!documents.some((document) => document.name === reference)) errors.push(`Referência do panteão ausente: ${reference}`);
}
for (const reference of ["Guia do Livro de Ambientação", "As Regiões de Tagmar", "Região dos Reinos", "Região das Terras Selvagens", "Região do Império"]) {
  if (!documents.some((document) => document.name === reference)) errors.push(`Referência geográfica ausente: ${reference}`);
}
for (const reference of ["Raças para interpretação", "As Línguas de Tagmar", "Os aventureiros"]) {
  if (!documents.some((document) => document.name === reference)) errors.push(`Referência cultural ausente: ${reference}`);
}
for (const reference of ["Prólogo histórico — Extratos do Livro de Maudi", "Primeiro Ciclo — O Tempo das Névoas", "Segundo Ciclo — O Tempo dos Filhos", "Terceiro Ciclo — Tempo das Mentiras Infernais", "Cronologia de Tagmar"]) {
  if (!documents.some((document) => document.name === reference)) errors.push(`Referência histórica ausente: ${reference}`);
}
for (const reference of ["Colégios de Magia", "Ordens Sacerdotais", "Trilhas dos Rastreadores", "Confrarias dos Bardos"]) {
  if (!documents.some((document) => document.name === reference)) errors.push(`Referência de organização ausente: ${reference}`);
}
for (const reference of ["Cosmologia de Tagmar", "Considerações finais da ambientação", "Créditos do Livro de Ambientação"]) {
  if (!documents.some((document) => document.name === reference)) errors.push(`Referência de ambientação ausente: ${reference}`);
}
const regionsDocument = documents.find((document) => document.name === "As Regiões de Tagmar");
const regionsPage = pages.find((page) => page._id === regionsDocument?.pages?.[0]);
if (!regionsPage?.text?.content?.includes("systems/tagmar_rpg/assets/mapas/tagmar2-mapa-v7-lo2.jpg")) errors.push("Mapa geral local ausente em As Regiões de Tagmar");
function findRelativeAttributes(content) {
  const relative = [];
  for (const match of content.matchAll(/\b(href|src)=(?:"([^"]*)"|'([^']*)')/gi)) {
    const attribute = match[1].toLowerCase();
    const value = (match[2] ?? match[3]).trim();
    const allowed = attribute === "href"
      ? /^(?:https?:|mailto:|tel:|#|@UUID\[)/i
      : /^(?:https?:|data:|systems\/)/i;
    if (!allowed.test(value)) relative.push(`${attribute}=${value}`);
  }
  return relative;
}
for (const page of pages) {
  const content = page.text?.content ?? "";
  if (content.length < 150) errors.push(`${page.name}: conteúdo parece truncado (${content.length} caracteres)`);
  if (!content.includes("Fonte oficial sincronizada:")) errors.push(`${page.name}: fonte oficial ausente`);
  if (!page.flags?.tagmarSync?.sourceHash) errors.push(`${page.name}: hash da origem ausente`);
  const relativeAttributes = findRelativeAttributes(content);
  if (relativeAttributes.length) errors.push(`${page.name}: URL relativa incompatível com o Foundry (${relativeAttributes[0]})`);
}
for (const realm of ["Levânia", "Ludgrim", "Eredra", "Verrogar", "Dantsem", "Marana", "Luna", "Portis", "Âmiem", "Abadom", "Acordo", "Plana", "Filanti", "Conti", "Azanti", "Calco", "Cidades-Estado", "Porto Livre"]) {
  if (!documents.some((document) => document.name === realm)) errors.push(`Reino ausente: ${realm}`);
}

console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
