import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const category = "venenos-drogas";
const source = manifest.pages.find((page) => page.category === category && page.pageName === "Livro de Regras - Regras Complementares");
if (!source) throw new Error("Snapshot oficial de Venenos e Drogas ausente");
const sourceFile = `${createHash("sha256").update(`${category}:${source.pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", sourceFile), "utf8");

const decode = (value) => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'");
const plain = (value) => decode(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => plain(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const stableId = (namespace, value) => createHash("sha256").update(`${namespace}:${key(value)}`).digest("hex").slice(0, 16);

const folderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
function folderPath(id) {
  const names = [];
  while (id && folderById.has(id)) {
    const folder = folderById.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}
const classicItems = legacy.items.filter((item) => /(?:^| \/ )(?:DROGAS|VENENOS)$/i.test(folderPath(item.folder)));
const classicByName = new Map(classicItems.map((item) => [key(item.name), item]));

const examplesStart = html.search(/<h3[^>]*>Exemplos de Venenos e Drogas/i);
if (examplesStart < 0) throw new Error("Seção oficial de exemplos não encontrada");
const examplesEnd = html.indexOf("<h3", examplesStart + 10);
const examplesHtml = html.slice(examplesStart, examplesEnd < 0 ? undefined : examplesEnd);
const typeMatches = [...examplesHtml.matchAll(/<h4[^>]*>Venenos e Drogas Tipo\s+(I{1,3}|IV|V)<\/h2>/gi)];
if (typeMatches.length !== 5) throw new Error(`Esperados 5 tipos, encontrados ${typeMatches.length}`);

const fieldPattern = /^(Força de ataque|Método de aplicação|Efeitos?|Duração do efeito|Ciclo|Uso viciante)\s*:/i;
const labelPattern = /^(Força de ataque|Método de aplicação|Efeitos?|Duração do efeito|Ciclo|Uso viciante)\s*:\s*/i;
const entries = [];
for (const [index, match] of typeMatches.entries()) {
  const type = match[1].toUpperCase();
  const start = match.index + match[0].length;
  const end = typeMatches[index + 1]?.index ?? examplesHtml.length;
  const lines = examplesHtml.slice(start, end)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .split(/\n+/).map(plain).filter(Boolean);
  const itemStarts = [];
  for (const [lineIndex, line] of lines.entries()) {
    const candidate = line.match(/^([^:]{2,80}):\s+(.+)$/);
    if (!candidate || fieldPattern.test(line)) continue;
    const following = lines.slice(lineIndex + 1, lineIndex + 8);
    if (following.some((value) => /^Força de ataque\s*:/i.test(value))) itemStarts.push(lineIndex);
  }
  for (const [itemIndex, lineIndex] of itemStarts.entries()) {
    const endIndex = itemStarts[itemIndex + 1] ?? lines.length;
    const block = lines.slice(lineIndex, endIndex);
    const first = block.shift().match(/^([^:]+):\s*(.*)$/);
    const name = first[1].trim();
    if (first[2]) block.unshift(first[2].trim());
    const isDrug = block.some((line) => /^(Ciclo|Uso viciante)\s*:/i.test(line));
    entries.push({ name, type, kind: isDrug ? "DROGAS" : "VENENOS", lines: block });
  }
}

const rootName = "10 - PERTENCES E AFINS";
const parentId = stableId("tagmar-t3er-pertences-folder", rootName);
const folderNames = ["DROGAS", "VENENOS"];
const folderIds = new Map(folderNames.map((name) => [name, stableId("tagmar-t3er-pertences-folder", `${rootName}/${name}`)]));
const folders = folderNames.map((name, index) => {
  const classic = legacy.folders.find((folder) => key(folderPath(folder._id)) === key(`${rootName} / ${name}`));
  return {
    _id: folderIds.get(name), name, type: "Item", folder: parentId, sorting: "a",
    sort: classic?.sort ?? (index + 30) * 10, color: classic?.color ?? "#f06800",
    flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category, origin: "core" } }
  };
});
const fieldValue = (lines, label) => {
  const line = lines.find((value) => new RegExp(`^${label}\\s*:`, "i").test(value));
  return line ? line.replace(new RegExp(`^${label}\\s*:\\s*`, "i"), "").trim() : null;
};
const formatDescription = (entry) => [
  `<b>Tipo:</b> ${entry.type}`,
  ...entry.lines.map((line) => line.replace(labelPattern, (_, label) => `<b>${label.replace(/^Efeitos$/i, "Efeito")}:</b> `))
].join("<br/><br/>");
const items = entries.map((entry) => {
  const classic = classicByName.get(key(entry.name));
  return {
    _id: stableId("tagmar-t3er-veneno-droga", `${entry.kind}:${entry.name}`),
    name: entry.name,
    type: "Pertence",
    img: classic?.img ?? (entry.kind === "DROGAS" ? "icons/consumables/plants/dried-herb-bundle-brown.webp" : "icons/consumables/potions/bottle-corked-toxic-green.webp"),
    folder: folderIds.get(entry.kind),
    system: {
      quant: 0,
      descricao: formatDescription(entry),
      peso: classic?.system?.peso ?? 0,
      preco: classic?.system?.preco ?? "",
      inTransport: false
    },
    flags: {
      tagmarSync: {
        edition: "Tagmar 3 Edição Revisada", category, origin: "core",
        sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash,
        substanceType: entry.kind === "DROGAS" ? "droga" : "veneno", type: entry.type,
        attackStrength: fieldValue(entry.lines, "Força de ataque"),
        applicationMethod: fieldValue(entry.lines, "Método de aplicação"),
        cycle: fieldValue(entry.lines, "Ciclo"), addictiveUse: fieldValue(entry.lines, "Uso viciante"),
        legacyItemId: classic?._id ?? null, needsReview: !classic
      }
    }
  };
});

if (items.length !== 19) throw new Error(`Esperados 19 exemplos oficiais, encontrados ${items.length}`);
if (items.filter((item) => item.folder === folderIds.get("VENENOS")).length !== 10) throw new Error("Quantidade inesperada de venenos");
if (items.filter((item) => item.folder === folderIds.get("DROGAS")).length !== 9) throw new Error("Quantidade inesperada de drogas");
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados em Venenos e Drogas");
if (items.some((item) => !item.flags.tagmarSync.attackStrength)) throw new Error("Exemplo sem Força de Ataque");
const newOfficial = items.filter((item) => item.flags.tagmarSync.needsReview).map((item) => item.name);
if (newOfficial.length !== 1 || key(newOfficial[0]) !== key("Pó de ossos de dragão")) {
  throw new Error(`Equivalentes clássicos inesperados: ${newOfficial.join(", ")}`);
}

await writeFile(join(cacheDir, "preview-venenos.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-venenos-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  items: items.length, folders: folders.length, matchedClassic: items.filter((item) => item.flags.tagmarSync.legacyItemId).length, newOfficial,
  byFolder: Object.fromEntries(folderNames.map((name) => [name, items.filter((item) => item.folder === folderIds.get(name)).length])),
  names: Object.fromEntries(folderNames.map((name) => [name, items.filter((item) => item.folder === folderIds.get(name)).map((item) => item.name)]))
}, null, 2));
