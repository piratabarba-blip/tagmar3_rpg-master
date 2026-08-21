import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const documents = JSON.parse(await readFile(join(cacheDir, "preview-imperio-documents.json"), "utf8"));
const pages = JSON.parse(await readFile(join(cacheDir, "preview-imperio-pages.json"), "utf8"));
const folders = JSON.parse(await readFile(join(cacheDir, "preview-imperio-folders.json"), "utf8"));
const errors = [];

if (documents.length !== 26) errors.push(`Esperados 26 diários; encontrados ${documents.length}`);
if (pages.length !== 26) errors.push(`Esperadas 26 páginas; encontradas ${pages.length}`);
if (folders.length !== 11) errors.push(`Esperadas 11 pastas; encontradas ${folders.length}`);
const ids = [...documents, ...pages, ...folders].map((entry) => entry._id);
if (new Set(ids).size !== ids.length) errors.push("Há IDs duplicados no pack");
for (const document of documents) {
  if (!folders.some((folder) => folder._id === document.folder)) errors.push(`${document.name}: pasta inválida`);
  if (document.pages.length !== 1 || !pages.some((page) => page._id === document.pages[0])) errors.push(`${document.name}: página inválida`);
  const sync = document.flags?.tagmarSync;
  if (sync?.guideType === "official-rules-mapping") {
    if (!sync?.sourceBook?.includes("Criando Fichas")) errors.push(`${document.name}: origem do guia incorreta`);
    if (!sync?.synchronizedAt) errors.push(`${document.name}: data do guia ausente`);
  } else {
    if (sync?.sourceBook !== "O Império") errors.push(`${document.name}: livro de origem incorreto`);
    if (!sync?.sourceUrl?.startsWith("https://tagmar.com.br/")) errors.push(`${document.name}: URL oficial ausente`);
    if (!sync?.sourceHash || !sync?.synchronizedAt) errors.push(`${document.name}: hash ou data de sincronização ausente`);
  }
}
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
  if (content.length < 500) errors.push(`${page.name}: conteúdo parece truncado (${content.length} caracteres)`);
  const isGuide = page.flags?.tagmarSync?.guideType === "official-rules-mapping";
  if (!isGuide && !content.includes("Fonte oficial sincronizada:")) errors.push(`${page.name}: crédito da fonte ausente`);
  if (isGuide && !content.includes("Guia editorial:")) errors.push(`${page.name}: identificação editorial ausente`);
  if (/localhost:30000|href=["']\/|src=["']\//i.test(content)) errors.push(`${page.name}: link local ou relativo incompatível com o Foundry`);
  if (/http:\/\/(?:www\.)?tagmar\.com\.br/i.test(content)) errors.push(`${page.name}: URL oficial insegura`);
  const relative = findRelativeAttributes(content);
  if (relative.length) errors.push(`${page.name}: URL relativa (${relative[0]})`);
}
for (const name of ["O Império — Guia Oficial", "Império Aktar", "Cidades-Estado Dicitíneas", "Cidades-Estado Birsas", "Povos do Deserto", "Bestiais", "Crisom", "Palátinus", "Tessaldarianos", "A Magia no Império"]) {
  if (!documents.some((document) => document.name === name)) errors.push(`Referência essencial ausente: ${name}`);
}
for (const name of ["00 — Como criar um personagem do Império", "01 — Raças disponíveis", "02 — Profissões disponíveis", "03 — Habilidades e técnicas de combate", "04 — Magias e tradições imperiais", "05 — Origens e conceitos de personagem"]) {
  if (!documents.some((document) => document.name === name)) errors.push(`Guia de personagem ausente: ${name}`);
}
for (const name of ["A Magia Magmática", "Academia Dictinea de Magia", "Guilda Birsa de Magia", "Ordem Imperial de Magia"]) {
  if (!documents.some((document) => document.name === name)) errors.push(`Organização mágica ausente: ${name}`);
}

console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length, errors }, null, 2));
if (errors.length) process.exitCode = 1;
