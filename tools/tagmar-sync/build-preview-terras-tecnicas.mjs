import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const edition = "Aventuras nas Terras Selvagens";
const category = "terras-selvagens";

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;
const stripEmptyParagraphs = (value) => value
  .replace(/^\s*<h4[^>]*>.*?<\/h4>/is, "")
  .replace(/<p>\s*<\/p>/gi, "")
  .trim();

const specs = [
  { name: "Combate Aéreo", pageName: "Técnicas de combate - Combate Aéreo", img: "systems/tagmar_rpg/assets/tagmar-geradas/combate-aereo.webp" },
  { name: "Combate Aquático", pageName: "Técnicas de combate - Combate Aquático", img: "systems/tagmar_rpg/assets/tagmar-geradas/combate-aquatico.webp" }
];

const rootRoute = "06 - TÉCNICAS DE COMBATE TERRAS SELVAGENS";
const groupRoute = `${rootRoute} / PERÍCIAS AMBIENTAIS`;
const rootId = stableId("tagmar-terras-tecnicas-folder", rootRoute);
const groupId = stableId("tagmar-terras-tecnicas-folder", groupRoute);
const folders = [
  {
    _id: rootId, name: rootRoute, type: "Item", folder: null, sorting: "a", sort: 50, color: "#b6c214",
    flags: { tagmarSync: { edition, category, route: rootRoute } }
  },
  {
    _id: groupId, name: "PERÍCIAS AMBIENTAIS", type: "Item", folder: rootId, sorting: "a", sort: 0, color: "#6f8500",
    flags: { tagmarSync: { edition, category, route: groupRoute } }
  }
];

const items = [];
for (const spec of specs) {
  const source = manifest.pages.find((page) => page.category === category && page.pageName === spec.pageName);
  if (!source) throw new Error(`Sincronize a página oficial antes de gerar ${spec.name}`);
  const html = await readFile(join(cacheDir, "pages", snapshotFilename(source)), "utf8");
  const officialDescription = stripEmptyParagraphs(html);
  if (!officialDescription.includes("ausência de nível") || !officialDescription.includes("-7")) {
    throw new Error(`A regra oficial de teste sem nível não foi localizada em ${spec.name}`);
  }
  const description = [
    officialDescription,
    "<hr>",
    "<p><strong>Nota do compêndio:</strong> esta regra é cadastrada como Perícia para preservar o teste em –7 sem nível, conforme a fonte oficial. A fonte não publica custo de aquisição; sua aquisição deve ser administrada manualmente pelo Mestre.</p>"
  ].join("");
  items.push({
    _id: stableId("tagmar-terras-tecnicas", `${groupRoute}:${spec.name}`),
    name: spec.name,
    type: "Habilidade",
    img: spec.img,
    folder: groupId,
    system: {
      custo: 0,
      nivel: 0,
      ajuste: { atributo: "FIS", valor: 0 },
      penalidade: 0,
      bonus: 0,
      total: -7,
      tipo: "manobra",
      custoAdd: { profissao: "", valor: 0 },
      hab_nata: false,
      descricao: description,
      tarefAperf: "Personagens aprimorados nesta perícia não precisam efetuar testes, independentemente da dificuldade.",
      nao_rolar_sem_nivel: false
    },
    flags: { tagmarSync: {
      edition,
      category,
      origin: "official-current",
      sourceName: source.pageName,
      sourceUrl: source.url,
      fetchUrl: source.fetchUrl ?? source.url,
      transport: source.transport ?? "default",
      sourceHash: source.hash,
      officialCategory: "Perícia",
      officialAttribute: "Físico",
      officialAcquisitionCost: null,
      manualAcquisition: true,
      untrainedTotal: -7
    } }
  });
}

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-tecnicas.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-tecnicas-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, type: "Habilidade", untrainedTotal: -7 }, null, 2));
