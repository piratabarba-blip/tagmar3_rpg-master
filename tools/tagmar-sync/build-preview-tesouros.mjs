import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const category = "tesouros-magicos";
const source = manifest.pages.find((page) => page.category === category && page.pageName === "Livro dos Objetos Mágicos - Poções e Elixires");
if (!source) throw new Error("Snapshot oficial de Poções e Elixires ausente");
const sourceFile = `${createHash("sha256").update(`${category}:${source.pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", sourceFile), "utf8");

const decode = (value) => value.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16))).replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"');
const plain = (value) => decode(value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => plain(String(value)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const stableId = (namespace, value) => createHash("sha256").update(`${namespace}:${key(value)}`).digest("hex").slice(0, 16);
const folderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
function folderPath(id) { const names = []; while (id && folderById.has(id)) { const folder = folderById.get(id); names.unshift(folder.name); id = folder.folder; } return names.join(" / "); }
const legacyItems = legacy.items.filter((item) => folderPath(item.folder).startsWith("10 - PERTENCES E AFINS"));
const legacyByName = new Map(legacyItems.map((item) => [key(item.name), item]));

const matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h[23][^>]*>|$)/gi)];
const officialSections = matches.map((match) => ({ name: plain(match[1]), body: plain(match[2]) })).filter((entry) => entry.name && !/verbetes/i.test(entry.name));
function folderFor(name) {
  if (/^(Elixir|Essência|Infusão)/i.test(name)) return "ELIXIRES";
  if (/^Óleo/i.test(name)) return "OLEOS";
  if (/^Pastilha/i.test(name)) return "PASTILHAS";
  if (/^Poção/i.test(name)) return "POÇÕES";
  if (/^Ung[üu]ento/i.test(name)) return "UNGUENTOS";
  throw new Error(`Forma de tesouro desconhecida: ${name}`);
}
const folderNames = ["ELIXIRES", "OLEOS", "PASTILHAS", "POÇÕES", "UNGUENTOS"];
const parentId = stableId("tagmar-t3er-pertences-folder", "10 - PERTENCES E AFINS");
const folderIds = new Map(folderNames.map((name) => [name, stableId("tagmar-t3er-pertences-folder", `10 - PERTENCES E AFINS/${name}`)]));
const folders = folderNames.map((name, index) => {
  const classic = legacy.folders.find((folder) => key(folderPath(folder._id)) === key(`10 - PERTENCES E AFINS / ${name}`));
  return { _id: folderIds.get(name), name, type: "Item", folder: parentId, sorting: "a", sort: classic?.sort ?? (index + 20) * 10, color: classic?.color ?? "#00b5ad", flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category, origin: "core" } } };
});
const formatDescription = (body) => body
  .replace(/(?:^|\s+)Efeitos?\s*:\s*/gi, "<br/><br/><b>Efeito:</b> ")
  .replace(/(?:^|\s+)(Origem|Raridade|Fórmula|Ingrediente|Descrição|História)\s*:\s*/gi, "<br/><br/><b>$1:</b> ")
  .replace(/^<br\/><br\/>/, "");
const items = officialSections.map(({ name, body }) => {
  const legacyItem = legacyByName.get(key(name));
  const folderName = folderFor(name);
  return {
    _id: stableId("tagmar-t3er-tesouro", `${folderName}:${name}`), name, type: "Pertence",
    img: legacyItem?.img ?? "icons/consumables/potions/potion-bottle-corked-labeled-pink.webp",
    folder: folderIds.get(folderName),
    system: { quant: 0, descricao: formatDescription(body), peso: legacyItem?.system?.peso ?? 0, preco: legacyItem?.system?.preco ?? "", inTransport: false },
    flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category, origin: "core", sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash, legacyItemId: legacyItem?._id ?? null, needsReview: !legacyItem } }
  };
});
if (items.length !== 21) throw new Error(`Esperados 21 tesouros, encontrados ${items.length}`);
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados em Tesouros Mágicos");
const missingEffect = items.filter((item) => !item.system.descricao.includes("<b>Efeito:</b>"));
if (missingEffect.length) throw new Error(`Tesouro sem efeito oficial: ${missingEffect.map((item) => item.name).join(", ")}`);
await writeFile(join(cacheDir, "preview-tesouros.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-tesouros-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, matchedClassic: items.filter((item) => item.flags.tagmarSync.legacyItemId).length, newOfficial: items.filter((item) => !item.flags.tagmarSync.legacyItemId).map((item) => item.name), byFolder: Object.fromEntries(folderNames.map((name) => [name, items.filter((item) => item.folder === folderIds.get(name)).length])) }, null, 2));
