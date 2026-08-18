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
  ["Livro dos Reinos - Epílogo", "Epílogo", "02 - ENCERRAMENTO"],
  ["Livro dos Reinos - Créditos", "Créditos", "02 - ENCERRAMENTO"]
];

function source(pageName) {
  const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
  if (!page) throw new Error(`Página do Reino de Tagmar ausente do manifesto: ${pageName}`);
  return page;
}

function prepareOfficialHtml(html, page) {
  return `<section class="tagmar-reinos-referencia">
${html.replace(/<p>\s*<\/p>/gi, "")}
<hr>
<p><strong>Fonte oficial sincronizada:</strong> <a href="${page.url}" target="_blank" rel="noopener">${page.pageName}</a></p>
</section>`;
}

const folderColors = new Map([
  ["00 - GUIA", "#11bfae"],
  ["01 - REINOS", "#b99300"],
  ["02 - ENCERRAMENTO", "#7254a8"]
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
  const syncFlags = { sourceBook: "Livro dos Reinos", sourcePage: pageName, sourceUrl: pageSource.url, sourceHash: pageSource.hash };
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
