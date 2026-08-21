import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const category = "reino-de-tagmar";
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const system = JSON.parse(await readFile(join(root, "system.json"), "utf8"));

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;

const specs = [
  ["Livro dos Reinos", "Guia do Livro dos Reinos", "00 - GUIA"],
  ["Cronologia dos Reinos do Mundo Conhecido", "Cronologia dos Reinos do Mundo Conhecido", "00 - GUIA"],
  ["Livro dos Reinos - Prólogo", "Prólogo", "00 - GUIA"],
  ["Levânia", "Levânia", "01 - REINOS"],
  ["Ludgrim", "Ludgrim", "01 - REINOS"],
  ["Eredra", "Eredra", "01 - REINOS"],
  ["Verrogar", "Verrogar", "01 - REINOS"],
  ["Dantsem", "Dantsem", "01 - REINOS"],
  ["Marana", "Marana", "01 - REINOS"],
  ["Luna", "Luna", "01 - REINOS"],
  ["Portis", "Portis", "01 - REINOS"],
  ["Âmiem", "Âmiem", "01 - REINOS"],
  ["Abadom", "Abadom", "01 - REINOS"],
  ["Acordo", "Acordo", "01 - REINOS"],
  ["Plana", "Plana", "01 - REINOS"],
  ["Filanti", "Filanti", "01 - REINOS"],
  ["Conti", "Conti", "01 - REINOS"],
  ["Azanti", "Azanti", "01 - REINOS"],
  ["Calco", "Calco", "01 - REINOS"],
  ["Cidades-Estado", "Cidades-Estado", "01 - REINOS"],
  ["Porto Livre", "Porto Livre", "01 - REINOS"],
  ["Livro dos Deuses", "Guia do Livro dos Deuses", "02 - PANTEÃO E CALENDÁRIO"],
  ["Os deuses de Tagmar", "Os deuses de Tagmar", "02 - PANTEÃO E CALENDÁRIO"],
  ["Calendário de Tagmar", "Calendário e festividades", "02 - PANTEÃO E CALENDÁRIO"],
  ["Livro de Ambientação", "Guia do Livro de Ambientação", "03 - REGIÕES E GEOGRAFIA"],
  ["As Regiões de Tagmar", "As Regiões de Tagmar", "03 - REGIÕES E GEOGRAFIA"],
  ["Região dos Reinos", "Região dos Reinos", "03 - REGIÕES E GEOGRAFIA"],
  ["Região das Terras selvagens", "Região das Terras Selvagens", "03 - REGIÕES E GEOGRAFIA"],
  ["Região do Império", "Região do Império", "03 - REGIÕES E GEOGRAFIA"],
  ["Raças para Roleplay", "Raças para interpretação", "04 - POVOS E CULTURAS"],
  ["As Línguas de Tagmar", "As Línguas de Tagmar", "04 - POVOS E CULTURAS"],
  ["Os aventureiros", "Os aventureiros", "04 - POVOS E CULTURAS"],
  ["Prólogo - Extratos do \"Livro de Maudi\"", "Prólogo histórico — Extratos do Livro de Maudi", "05 - HISTÓRIA E CRONOLOGIA"],
  ["1º Ciclo ou O \"Tempo das Névoas\"", "Primeiro Ciclo — O Tempo das Névoas", "05 - HISTÓRIA E CRONOLOGIA"],
  ["2º Ciclo ou \"O Tempo dos Filhos\"", "Segundo Ciclo — O Tempo dos Filhos", "05 - HISTÓRIA E CRONOLOGIA"],
  ["3º Ciclo ou \"Tempo das Mentiras Infernais\"", "Terceiro Ciclo — Tempo das Mentiras Infernais", "05 - HISTÓRIA E CRONOLOGIA"],
  ["Cronologia de Tagmar", "Cronologia de Tagmar", "05 - HISTÓRIA E CRONOLOGIA"],
  ["Colégios de Magia", "Colégios de Magia", "06 - ORGANIZAÇÕES E FACÇÕES"],
  ["Ordens Sacerdotais", "Ordens Sacerdotais", "06 - ORGANIZAÇÕES E FACÇÕES"],
  ["As Trilhas", "Trilhas dos Rastreadores", "06 - ORGANIZAÇÕES E FACÇÕES"],
  ["As Confrarias", "Confrarias dos Bardos", "06 - ORGANIZAÇÕES E FACÇÕES"],
  ["Cosmologia", "Cosmologia de Tagmar", "07 - MAPAS E AMBIENTAÇÃO GERAL"],
  ["Livro de Ambientação - Considerações Finais", "Considerações finais da ambientação", "07 - MAPAS E AMBIENTAÇÃO GERAL"],
  ["Créditos do Livro de Ambientação", "Créditos do Livro de Ambientação", "07 - MAPAS E AMBIENTAÇÃO GERAL"],
  ["Livro dos Reinos - Epílogo", "Epílogo", "08 - ENCERRAMENTO"],
  ["Livro dos Reinos - Créditos", "Créditos", "08 - ENCERRAMENTO"]
];

function source(pageName) {
  const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
  if (!page) throw new Error(`Página do Reino de Tagmar ausente do manifesto: ${pageName}`);
  return page;
}

function absolutizeOfficialUrls(html, pageUrl) {
  return html.replace(/\b(href|src)=(?:"([^"]*)"|'([^']*)')/gi, (match, attribute, doubleQuoted, singleQuoted) => {
    const quote = doubleQuoted !== undefined ? '"' : "'";
    const value = doubleQuoted ?? singleQuoted;
    const normalized = value.replace(/&amp;/gi, "&").trim();
    if (/^(?:https?:|data:|mailto:|tel:|#|@UUID\[|systems\/)/i.test(normalized)) return match;
    try {
      const absolute = new URL(normalized, pageUrl).href.replace(/&/g, "&amp;");
      return `${attribute}=${quote}${absolute}${quote}`;
    } catch {
      return match;
    }
  });
}

function prepareOfficialHtml(html, page) {
  const localizedHtml = page.pageName === "As Regiões de Tagmar"
    ? html.replace(
      /http:\/\/3\.bp\.blogspot\.com\/-NN17_VJzyho\/U1bZYtXg9wI\/AAAAAAAAAVM\/KyvfawwPuso\/s1600\/tagmar2-mapa-v7-lo2\.jpg/gi,
      "systems/tagmar_rpg/assets/mapas/tagmar2-mapa-v7-lo2.jpg"
    )
    : html;
  const portableHtml = absolutizeOfficialUrls(localizedHtml, page.url);
  return `<section class="tagmar-reinos-referencia">
${portableHtml.replace(/<p>\s*<\/p>/gi, "")}
<hr>
<p><strong>Fonte oficial sincronizada:</strong> <a href="${page.url}" target="_blank" rel="noopener">${page.pageName}</a></p>
</section>`;
}

const folderColors = new Map([
  ["00 - GUIA", "#11bfae"],
  ["01 - REINOS", "#b99300"],
  ["02 - PANTEÃO E CALENDÁRIO", "#2878a8"],
  ["03 - REGIÕES E GEOGRAFIA", "#298b57"],
  ["04 - POVOS E CULTURAS", "#a84f7a"],
  ["05 - HISTÓRIA E CRONOLOGIA", "#9a612a"],
  ["06 - ORGANIZAÇÕES E FACÇÕES", "#5947a8"],
  ["07 - MAPAS E AMBIENTAÇÃO GERAL", "#31778f"],
  ["08 - ENCERRAMENTO", "#7254a8"]
]);
const folderIds = new Map();
const folders = [...new Set(specs.map(([, , folder]) => folder))].map((name, index) => {
  const id = stableId("tagmar-reinos-folder", name);
  folderIds.set(name, id);
  return {
    _id: id, name, type: "JournalEntry", folder: null, sorting: "m", sort: index * 100000,
    color: folderColors.get(name), flags: {},
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null }
  };
});

const documents = [];
const pages = [];
for (const [index, [pageName, name, folder]] of specs.entries()) {
  const pageSource = source(pageName);
  const html = await readFile(join(cacheDir, "pages", snapshotFilename(pageSource)), "utf8");
  const documentId = stableId("tagmar-reinos-journal", pageName);
  const pageId = stableId("tagmar-reinos-page", pageName);
  const sourceBook = ["Calendário de Tagmar", "Livro de Ambientação", "As Regiões de Tagmar", "Região dos Reinos", "Região das Terras selvagens", "Região do Império", "Raças para Roleplay", "As Línguas de Tagmar", "Os aventureiros", "Prólogo - Extratos do \"Livro de Maudi\"", "1º Ciclo ou O \"Tempo das Névoas\"", "2º Ciclo ou \"O Tempo dos Filhos\"", "3º Ciclo ou \"Tempo das Mentiras Infernais\"", "Cronologia de Tagmar", "Cosmologia", "Livro de Ambientação - Considerações Finais", "Créditos do Livro de Ambientação"].includes(pageName)
    ? "Livro de Ambientação"
    : ["Livro dos Deuses", "Os deuses de Tagmar"].includes(pageName)
      ? "Livro dos Deuses"
      : ["Colégios de Magia", "Ordens Sacerdotais", "As Trilhas", "As Confrarias"].includes(pageName)
        ? "Livro de Magias"
      : "Livro dos Reinos";
  const syncFlags = { sourceBook, sourcePage: pageName, sourceUrl: pageSource.url, sourceHash: pageSource.hash };
  documents.push({
    _id: documentId, name, folder: folderIds.get(folder), pages: [pageId], sort: index * 100000,
    ownership: { default: 0 }, flags: { tagmarSync: syncFlags },
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
  pages.push({
    _id: pageId, name, type: "text", title: { show: false, level: 1 },
    text: { format: 1, content: prepareOfficialHtml(html, pageSource) }, image: {},
    video: { controls: true, volume: 0.5 }, src: null, system: {}, sort: 0,
    ownership: { default: -1 }, flags: { tagmarSync: syncFlags },
    _stats: { systemId: null, systemVersion: null, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
}

await mkdir(cacheDir, { recursive: true });
await Promise.all([
  writeFile(join(cacheDir, "preview-reinos-documents.json"), `${JSON.stringify(documents, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-reinos-pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-reinos-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8")
]);
console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length }, null, 2));
