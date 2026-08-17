import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const category = "terras-selvagens";
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;

function source(pageName) {
  const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
  if (!page) throw new Error(`Página de Terras Selvagens ausente do manifesto: ${pageName}`);
  return page;
}

async function pageHtml(pageName) {
  const page = source(pageName);
  return readFile(join(cacheDir, "pages", snapshotFilename(page)), "utf8");
}

function prepareOfficialHtml(html, page) {
  return `<section class="tagmar-terras-regras">
${html
  .replace(/http:\/\/www\.tagmar\.com\.br\/Images\/wiki\/MapaPlanar\.jpg/gi, "systems/tagmar_rpg/assets/tagmar-site/mapa-planar.jpg")
  .replace(/<p>\s*<\/p>/gi, "")
  .replace(/<h1>([\s\S]*?)<\/h2>/gi, "<h1>$1</h1>")
  .replace(/<h3>([\s\S]*?)<\/h2>/gi, "<h3>$1</h3>")}
<hr>
<p><strong>Fonte oficial:</strong> <a href="${page.url}" target="_blank" rel="noopener">${page.pageName}</a></p>
</section>`;
}

const specs = [
  {
    pageName: "Terras Selvagens - Introdução",
    name: "Introdução às Terras Selvagens",
    folder: "00 - GUIA"
  },
  {
    pageName: "Criando Personagens",
    name: "Criando Personagens",
    folder: "01 - CRIAÇÃO DE PERSONAGENS"
  },
  {
    pageName: "3.1 Caracterizações para as Terras Selvagens",
    name: "Caracterizações para as Terras Selvagens",
    folder: "01 - CRIAÇÃO DE PERSONAGENS"
  },
  {
    pageName: "3.3 Influência das regiões mágicas sobre os personagens",
    name: "Influência das Regiões Mágicas",
    folder: "02 - AMBIENTAÇÃO E REGRAS"
  },
  {
    pageName: "4.1 Tabela e funcionamento das novas armas",
    name: "Equipamentos e Novas Armas",
    folder: "03 - EQUIPAMENTOS E COMBATE"
  }
];

const folderIds = new Map();
const folders = [...new Set(specs.map((spec) => spec.folder))].map((name, index) => {
  const id = stableId("tagmar-terras-regras-folder", name);
  folderIds.set(name, id);
  return {
    _id: id,
    name,
    type: "JournalEntry",
    folder: null,
    sorting: "m",
    sort: index * 100000,
    color: index === 0 ? "#11bfae" : "#b99300",
    flags: {},
    _stats: {
      systemId: "tagmar_rpg",
      systemVersion: "2.6.0-v14.1",
      coreVersion: "14.366",
      createdTime: null,
      modifiedTime: null,
      lastModifiedBy: null
    }
  };
});

const documents = [];
const pages = [];
for (const [index, spec] of specs.entries()) {
  const sourcePage = source(spec.pageName);
  const html = await pageHtml(spec.pageName);
  const documentId = stableId("tagmar-terras-regras-journal", spec.name);
  const pageId = stableId("tagmar-terras-regras-page", spec.name);
  documents.push({
    _id: documentId,
    name: spec.name,
    folder: folderIds.get(spec.folder),
    pages: [pageId],
    sort: index * 100000,
    ownership: { default: 0 },
    flags: { tagmarSync: { sourcePage: spec.pageName, sourceUrl: sourcePage.url, sourceHash: sourcePage.hash } },
    _stats: {
      systemId: "tagmar_rpg",
      systemVersion: "2.6.0-v14.1",
      coreVersion: "14.366",
      createdTime: null,
      modifiedTime: null,
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null
    }
  });
  pages.push({
    _id: pageId,
    name: spec.name,
    type: "text",
    title: { show: false, level: 1 },
    text: { format: 1, content: prepareOfficialHtml(html, sourcePage) },
    image: {},
    video: { controls: true, volume: 0.5 },
    src: null,
    system: {},
    sort: 0,
    ownership: { default: -1 },
    flags: { tagmarSync: { sourcePage: spec.pageName, sourceUrl: sourcePage.url, sourceHash: sourcePage.hash } },
    _stats: {
      systemId: null,
      systemVersion: null,
      coreVersion: "14.366",
      createdTime: null,
      modifiedTime: null,
      lastModifiedBy: null,
      compendiumSource: null,
      duplicateSource: null
    }
  });
}

await mkdir(cacheDir, { recursive: true });
await Promise.all([
  writeFile(join(cacheDir, "preview-terras-regras-documents.json"), `${JSON.stringify(documents, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-terras-regras-pages.json"), `${JSON.stringify(pages, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-terras-regras-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8")
]);
console.log(JSON.stringify({ documents: documents.length, pages: pages.length, folders: folders.length }, null, 2));
