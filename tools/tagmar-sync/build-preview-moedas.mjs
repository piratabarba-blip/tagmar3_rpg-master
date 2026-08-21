import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const category = "valores-monetarios";
const source = manifest.pages.find((page) => page.category === "pertences" && page.pageName === "Livro de Regras - Pertences e Afins");
if (!source) throw new Error("Snapshot oficial do sistema monetário ausente");
const sourceFile = `${createHash("sha256").update(`pertences:${source.pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", sourceFile), "utf8");

const decode = (value) => String(value)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'");
const plain = (value) => decode(value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
const key = (value) => plain(String(value)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
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

const section = html.match(/<h3[^>]*>[^<]*Sistema Monetário de Tagmar[^<]*<\/h2>([\s\S]*?)(?=<h[34][^>]*>)/i);
if (!section) throw new Error("Seção oficial do Sistema Monetário não encontrada");
const officialRule = plain(section[1]);
for (const required of ["Moedas de Cobre", "Moedas de Prata", "Moedas de Ouro", "10 Moedas de Prata", "100 Moedas de Cobre"]) {
  if (!key(officialRule).includes(key(required))) throw new Error(`Regra monetária obrigatória ausente: ${required}`);
}

const rootName = "10 - PERTENCES E AFINS";
const folderName = "VALORES MONETARIOS";
const parentId = stableId("tagmar-t3er-pertences-folder", rootName);
const folderId = stableId("tagmar-t3er-pertences-folder", `${rootName}/${folderName}`);
const classicFolder = legacy.folders.find((folder) => key(folderPath(folder._id)) === key(`${rootName} / ${folderName}`));
if (!classicFolder) throw new Error("Pasta monetária clássica não encontrada");
const classicItems = legacy.items.filter((item) => item.folder === classicFolder._id);
const classicByName = new Map(classicItems.map((item) => [key(item.name), item]));

const definitions = [
  ...[1, 10, 50].flatMap((quantity) => [
    { quantity, currency: "mc", currencyName: "Cobre", copperValue: quantity },
    { quantity, currency: "mp", currencyName: "Prata", copperValue: quantity * 10 },
    { quantity, currency: "mo", currencyName: "Ouro", copperValue: quantity * 100 }
  ]),
  { quantity: 0, currency: null, currencyName: null, copperValue: 0, name: "1 Nada Encontrado" }
];
const folders = [{
  _id: folderId, name: folderName, type: "Item", folder: parentId, sorting: classicFolder.sorting ?? "m",
  sort: classicFolder.sort ?? 0, color: classicFolder.color ?? "#a30096",
  flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category, origin: "core" } }
}];
const items = definitions.map((definition) => {
  const singular = definition.quantity === 1;
  const name = definition.name ?? `${definition.quantity} ${singular ? "Moeda" : "Moedas"} de ${definition.currencyName}`;
  const classic = classicByName.get(key(name));
  if (!classic) throw new Error(`Valor monetário clássico ausente: ${name}`);
  const details = definition.currency
    ? `<b>Quantidade representada:</b> ${definition.quantity}<br/><br/><b>Moeda:</b> ${definition.currencyName} (${definition.currency.toUpperCase()})<br/><br/><b>Valor equivalente:</b> ${definition.copperValue} moeda${definition.copperValue === 1 ? "" : "s"} de cobre.`
    : "<b>Resultado vazio:</b> nenhuma moeda ou pertence foi encontrado.";
  return {
    _id: stableId("tagmar-t3er-moeda", name), name, type: "Pertence", img: classic.img, folder: folderId,
    system: { quant: classic.system?.quant ?? 0, descricao: `${details}<br/><br/><b>Regra oficial:</b> ${officialRule.replace(/\n+/g, "<br/><br/>")}`, peso: classic.system?.peso ?? 0, preco: "", inTransport: false },
    flags: { tagmarSync: {
      edition: "Tagmar 3 Edição Revisada", category, origin: "core",
      sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash,
      legacyItemId: classic._id, currency: definition.currency, representedQuantity: definition.quantity,
      copperValue: definition.copperValue, conversion: { mc: 1, mp: 10, mo: 100 }
    } }
  };
});

if (items.length !== 10) throw new Error(`Esperados 10 valores monetários, encontrados ${items.length}`);
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs monetários duplicados");
await writeFile(join(cacheDir, "preview-moedas.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-moedas-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, conversion: { mc: 1, mp: 10, mo: 100 }, names: items.map((item) => item.name) }, null, 2));
