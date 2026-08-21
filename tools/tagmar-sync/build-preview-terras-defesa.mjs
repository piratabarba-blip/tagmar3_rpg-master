import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "snapshot-terras-selvagens.json"), "utf8"));
const edition = "Aventuras nas Terras Selvagens";
const category = "terras-selvagens";
const source = manifest.pages.find((page) => page.category === category && page.pageName === "4.1 Tabela e funcionamento das novas armas");
if (!source) throw new Error("Sincronize a página 4.1 de Terras Selvagens antes de gerar Defesa");

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;
const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => stripTags(String(value)).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const integer = (value) => {
  const parsed = Number.parseInt(String(value).replace("+", ""), 10);
  return Number.isInteger(parsed) ? parsed : 0;
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function rowsFromTable(table) {
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]))
  );
}

function folderPath(folderById, id) {
  const names = [];
  while (id && folderById.has(id)) {
    const folder = folderById.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}

const html = await readFile(join(cacheDir, "pages", snapshotFilename(source)), "utf8");
const tables = [...html.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
const defenseTable = tables.find((table) => {
  const header = rowsFromTable(table)[0] ?? [];
  return header[0] === "Equipamentos de defesa" && header[1] === "Defesa base" && header[2] === "Absorção";
});
if (!defenseTable) throw new Error("Tabela oficial de Defesa de Terras Selvagens não encontrada");

const sourceItems = rowsFromTable(defenseTable).slice(1).map((cells) => {
  if (cells.length !== 9) throw new Error(`Linha oficial de Defesa inválida: ${JSON.stringify(cells)}`);
  const defenseMatch = cells[1].match(/^([LMP])(\d+)$/i);
  return {
    name: cells[0], defenseBase: cells[1], defenseType: defenseMatch?.[1]?.toUpperCase() ?? "",
    defenseValue: defenseMatch ? integer(defenseMatch[2]) : integer(cells[1]),
    absorption: integer(cells[2]), physicalMinimum: integer(cells[3]), strengthMinimum: integer(cells[4]),
    raceUse: { anao: cells[5], elfoGouraNapoi: cells[6], humanoMeioOrcoSekbete: cells[7] }, exclusive: cells[8]
  };
});

const priceTable = tables.find((table) => {
  const header = rowsFromTable(table)[0] ?? [];
  return header[0] === "Equipamentos de defesa" && header[1] === "Preço" && header.includes("Equipamentos de saque");
});
if (!priceTable) throw new Error("Tabela oficial de preços de Defesa não encontrada");
const prices = new Map();
for (const row of rowsFromTable(priceTable).slice(1)) {
  if (row[0] && row[1] && row[0] !== "-") prices.set(key(row[0]), row[1]);
  if (row[3] && row[4] && row[3] !== "-") prices.set(key(row[3]), row[4]);
}

const aliases = new Map([
  [key("Couro de Cerberus"), key("Couro de Cérberus")],
  [key("Escamas de Basiliscos e Cocatrizes"), key("Escamas de Basilicos e Cocatrizes")],
  [key("Escudo pequeno com couro de Cerberus"), key("Escudo pequeno com couro de Cérberus")]
]);
const sourceByName = new Map(sourceItems.map((item) => [key(item.name), item]));
const folderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyItems = legacy.items.filter((item) => item.type === "Defesa");

const descriptiveHeadings = [...new Set(sourceItems.map((item) => item.name))].sort((a, b) => b.length - a.length);
function currentDescription(name, fallback) {
  const startMatch = new RegExp(`<b[^>]*>\\s*${escapeRegex(name)}\\s*<\\/b>\\s*<br\\s*\\/?>`, "i").exec(html);
  if (!startMatch) return fallback;
  const start = startMatch.index;
  let end = html.search(/<b[^>]*>\s*Tabelas de armaduras\s*<\/b>/i);
  if (end < start) end = html.length;
  for (const other of descriptiveHeadings) {
    if (key(other) === key(name)) continue;
    const match = new RegExp(`<b[^>]*>\\s*${escapeRegex(other)}\\s*<\\/b>\\s*<br\\s*\\/?>`, "ig");
    match.lastIndex = startMatch.index + startMatch[0].length;
    const next = match.exec(html);
    if (next && next.index < end) end = next.index;
  }
  const block = html.slice(start, end).trim();
  return stripTags(block).length > 20 ? `<p>${block}</p>` : fallback;
}

const rootRoute = "05 - DEFESA TERRAS SELVAGENS";
const legacyGroups = [...new Set(legacyItems.map((item) => folderPath(folderById, item.folder).split(" / ").at(-1)))];
const folderIds = new Map([[rootRoute, stableId("tagmar-terras-defesa-folder", rootRoute)]]);
const folders = [{
  _id: folderIds.get(rootRoute), name: rootRoute, type: "Item", folder: null, sorting: "a", sort: 40, color: "#1fb26d",
  flags: { tagmarSync: { edition, category, route: rootRoute } }
}];
for (const [index, group] of legacyGroups.entries()) {
  const route = `${rootRoute} / ${group}`;
  const legacyFolder = legacy.folders.find((folder) => folder.name === group && folderPath(folderById, folder._id).startsWith("DEFESA TERRAS SELVAGENS /"));
  const id = stableId("tagmar-terras-defesa-folder", route);
  folderIds.set(route, id);
  folders.push({
    _id: id, name: group, type: "Item", folder: folderIds.get(rootRoute), sorting: "a",
    sort: legacyFolder?.sort ?? index * 10, color: legacyFolder?.color ?? "#0104b7",
    flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
  });
}

const missing = [];
const items = legacyItems.map((legacyItem) => {
  const lookup = aliases.get(key(legacyItem.name)) ?? key(legacyItem.name);
  const sourceItem = sourceByName.get(lookup);
  if (!sourceItem) missing.push(legacyItem.name);
  const group = folderPath(folderById, legacyItem.folder).split(" / ").at(-1);
  const route = `${rootRoute} / ${group}`;
  const tableDescription = sourceItem ? [
    `<p><strong>Defesa base:</strong> ${sourceItem.defenseBase}</p>`,
    `<p><strong>Absorção:</strong> ${sourceItem.absorption}</p>`,
    `<p><strong>Físico mínimo:</strong> ${sourceItem.physicalMinimum}</p>`,
    `<p><strong>Força mínima:</strong> ${sourceItem.strengthMinimum}</p>`,
    sourceItem.exclusive && sourceItem.exclusive !== "--" ? `<p><strong>Uso exclusivo:</strong> ${sourceItem.exclusive}</p>` : ""
  ].join("") : "";
  return {
    _id: stableId("tagmar-terras-defesa", `${route}:${legacyItem.name}`), name: legacyItem.name,
    type: "Defesa", img: legacyItem.img, folder: folderIds.get(route),
    system: {
      ...legacyItem.system,
      defesa_base: { tipo: sourceItem?.defenseType ?? legacyItem.system.defesa_base?.tipo ?? "", valor: sourceItem?.defenseValue ?? integer(legacyItem.system.defesa_base?.valor) },
      absorcao: sourceItem?.absorption ?? integer(legacyItem.system.absorcao),
      fis_min: sourceItem?.physicalMinimum ?? integer(legacyItem.system.fis_min),
      for_min: sourceItem?.strengthMinimum ?? integer(legacyItem.system.for_min),
      preco: prices.get(lookup) ?? legacyItem.system.preco,
      descricao: currentDescription(sourceItem?.name ?? legacyItem.name, legacyItem.system.descricao || tableDescription)
    },
    flags: { tagmarSync: {
      edition, category, origin: "official-current-with-classic-mechanics", sourceName: source.pageName,
      sourceUrl: source.url, sourceHash: source.hash, sourceDefenseBase: sourceItem?.defenseBase ?? null,
      sourceRaceUse: sourceItem?.raceUse ?? null, sourceExclusive: sourceItem?.exclusive ?? null,
      legacyItemId: legacyItem._id
    } }
  };
});

if (missing.length) throw new Error(`Defesas clássicas ausentes da tabela oficial: ${missing.join(", ")}`);
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados na Defesa de Terras Selvagens");
const invalidItems = items.filter((item) => !item.folder || !item.system.descricao);
if (invalidItems.length) throw new Error(`Defesa órfã ou sem descrição: ${invalidItems.map((item) => item.name).join(", ")}`);

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-defesa.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-defesa-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length }, null, 2));
