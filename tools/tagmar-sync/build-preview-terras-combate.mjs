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
if (!source) throw new Error("Sincronize a página 4.1 de Terras Selvagens antes de gerar Combate");

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

function expandedRowsFromTable(table) {
  const spans = new Map();
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((rowMatch, rowIndex) => {
    const row = [];
    for (const [column, span] of spans) {
      if (span.endRow >= rowIndex) row[column] = span.value;
      else spans.delete(column);
    }
    const cells = [...rowMatch[1].matchAll(/<t([hd])([^>]*)>(.*?)<\/t\1>/gis)];
    let column = 0;
    for (const cell of cells) {
      while (row[column] !== undefined) column += 1;
      const colspan = integer(cell[2].match(/colspan=["']?(\d+)/i)?.[1] ?? "1");
      const rowspan = integer(cell[2].match(/rowspan=["']?(\d+)/i)?.[1] ?? "1");
      const value = stripTags(cell[3]);
      for (let offset = 0; offset < colspan; offset += 1) {
        row[column + offset] = value;
        if (rowspan > 1) spans.set(column + offset, { value, endRow: rowIndex + rowspan - 1 });
      }
      column += colspan;
    }
    return row;
  });
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

function fullDamage(d25) {
  const result = {};
  for (let percentage = 25; percentage <= 300; percentage += 25) result[`d${percentage}`] = d25 * (percentage / 25);
  return result;
}

const html = await readFile(join(cacheDir, "pages", snapshotFilename(source)), "utf8");
const tables = [...html.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
const weaponTable = tables.find((table) => {
  const header = rowsFromTable(table)[0] ?? [];
  return header[0] === "Grupo" && header[2] === "Arma" && header.includes("Dano 100(%)");
});
if (!weaponTable) throw new Error("Tabela oficial de armas de Terras Selvagens não encontrada");

const sourceWeapons = [];
let previousName = "";
for (const cells of expandedRowsFromTable(weaponTable).slice(1)) {
  if (cells.length !== 17) throw new Error(`Linha oficial de arma inválida: ${JSON.stringify(cells)}`);
  const variant = /^\(com duas mãos\)$/i.test(cells[2]);
  const name = variant ? `${previousName} (Duas Mãos)` : cells[2];
  if (!variant) previousName = name;
  sourceWeapons.push({
    group: cells[0], groupCost: integer(cells[1]), name,
    alcance: cells[3] === "--" ? "" : cells[3], forcaMin: integer(cells[4]), bonus: cells[5].toUpperCase(),
    defL: integer(cells[6]), defM: integer(cells[7]), defP: integer(cells[8]),
    damage25: key(cells[12]) === "x" || cells[12] === "--" ? null : integer(cells[12]),
    hands: { anao: cells[13], elfoGouraNapoi: cells[14], humanoMeioOrcoSekbete: cells[15] },
    exclusive: cells[16]
  });
}

const aliases = new Map([
  [key("Espada Iantus Uma Mão"), key("Espada de Mão e Meia Iantus")],
  [key("Espada Iantus Duas Mãos"), key("Espada de Mão e Meia Iantus (Duas Mãos)")],
  [key("Faca Negra -"), key("Faca Negra")]
]);
const sourceByName = new Map(sourceWeapons.map((weapon) => [key(weapon.name), weapon]));
const folderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyWeapons = legacy.items.filter((item) => item.type === "Combate");

const priceTable = tables.find((table) => {
  const header = rowsFromTable(table)[0] ?? [];
  return header[0] === "Arma" && header[1] === "Preço";
});
if (!priceTable) throw new Error("Tabela oficial de preços das armas não encontrada");
const prices = new Map(rowsFromTable(priceTable).slice(1).map(([name, price]) => [key(name.replace(/\s*\([^)]*unidades?[^)]*\)\s*/gi, "")), price]));

const descriptiveHeadings = [...new Set([
  ...sourceWeapons.map((weapon) => weapon.name.replace(/ \(Duas Mãos\)$/i, "")),
  "Adornos", "Garras", "Espada de Mão e Meia Lantus"
])].sort((a, b) => b.length - a.length);
function currentDescription(names, fallback) {
  for (const name of names) {
    const startMatch = new RegExp(`<b[^>]*>\\s*${escapeRegex(name)}\\s*<\\/b>\\s*<br\\s*\\/?>`, "i").exec(html);
    if (!startMatch) continue;
    const start = startMatch.index;
    let end = html.search(/<b[^>]*>\s*Tabela de Armas\s*<\/b>/i);
    if (end < start) end = html.length;
    for (const other of descriptiveHeadings) {
      if (key(other) === key(name)) continue;
      const match = new RegExp(`<b[^>]*>\\s*${escapeRegex(other)}\\s*<\\/b>\\s*<br\\s*\\/?>`, "ig");
      match.lastIndex = startMatch.index + startMatch[0].length;
      const next = match.exec(html);
      if (next && next.index < end) end = next.index;
    }
    const block = html.slice(start, end).trim();
    if (stripTags(block).length > 20) return `<p>${block}</p>`;
  }
  return fallback;
}

const rootRoute = "04 - COMBATE TERRAS SELVAGENS";
const legacyGroups = [...new Set(legacyWeapons.map((item) => folderPath(folderById, item.folder).split(" / ").at(-1)))];
const folderIds = new Map([[rootRoute, stableId("tagmar-terras-combate-folder", rootRoute)]]);
const folders = [{
  _id: folderIds.get(rootRoute), name: rootRoute, type: "Item", folder: null, sorting: "a", sort: 30, color: "#85750f",
  flags: { tagmarSync: { edition, category, route: rootRoute } }
}];
for (const [index, group] of legacyGroups.entries()) {
  const route = `${rootRoute} / ${group}`;
  const legacyFolder = legacy.folders.find((folder) => folder.name === group && folderPath(folderById, folder._id).startsWith("COMBATE TERRAS SELVAGENS /"));
  const id = stableId("tagmar-terras-combate-folder", route);
  folderIds.set(route, id);
  folders.push({
    _id: id, name: group, type: "Item", folder: folderIds.get(rootRoute), sorting: "a",
    sort: legacyFolder?.sort ?? index * 10, color: legacyFolder?.color ?? "#028a00",
    flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
  });
}

const missing = [];
const items = legacyWeapons.map((legacyItem) => {
  const lookup = aliases.get(key(legacyItem.name)) ?? key(legacyItem.name);
  const weapon = sourceByName.get(lookup);
  if (!weapon) missing.push(legacyItem.name);
  const group = folderPath(folderById, legacyItem.folder).split(" / ").at(-1);
  const route = `${rootRoute} / ${group}`;
  const descriptionNames = key(legacyItem.name).startsWith("adorno") ? ["Adornos"]
    : key(legacyItem.name).startsWith("garra") ? ["Garras"]
      : key(legacyItem.name).startsWith("espada iantus") ? ["Espada de Mão e Meia Lantus", "Espada de Mão e Meia Iantus"]
        : [weapon?.name ?? legacyItem.name, legacyItem.name.replace(/ -$/, "")];
  const inheritedMechanics = !weapon || weapon.damage25 === null;
  const tableDescription = weapon ? [
    `<p><strong>Grupo:</strong> ${weapon.group} (custo ${weapon.groupCost})</p>`,
    `<p><strong>Força mínima:</strong> ${weapon.forcaMin}</p>`,
    weapon.alcance ? `<p><strong>Alcance:</strong> ${weapon.alcance}</p>` : "",
    weapon.exclusive && weapon.exclusive !== "--" ? `<p><strong>Uso exclusivo:</strong> ${weapon.exclusive}</p>` : ""
  ].join("") : "";
  return {
    _id: stableId("tagmar-terras-combate", `${route}:${legacyItem.name}`),
    name: legacyItem.name.replace(/ -$/, ""), type: "Combate", img: legacyItem.img, folder: folderIds.get(route),
    system: {
      ...legacyItem.system,
      alcance: weapon?.alcance ?? legacyItem.system.alcance,
      descricao: currentDescription(descriptionNames, legacyItem.system.descricao || tableDescription),
      forca_min: weapon?.forcaMin ?? legacyItem.system.forca_min,
      bonus: weapon?.bonus ?? legacyItem.system.bonus,
      preco: prices.get(key(weapon?.name ?? legacyItem.name)) ?? legacyItem.system.preco,
      def_l: inheritedMechanics ? integer(legacyItem.system.def_l) : weapon.defL,
      def_m: inheritedMechanics ? integer(legacyItem.system.def_m) : weapon.defM,
      def_p: inheritedMechanics ? integer(legacyItem.system.def_p) : weapon.defP,
      dano_base: inheritedMechanics ? legacyItem.system.dano_base : fullDamage(weapon.damage25)
    },
    flags: { tagmarSync: {
      edition, category, origin: "official-current-with-classic-mechanics", sourceName: source.pageName,
      sourceUrl: source.url, sourceHash: source.hash, sourceGroup: weapon?.group ?? legacyItem.system.tipo,
      sourceGroupCost: weapon?.groupCost ?? null, sourceHands: weapon?.hands ?? null, sourceExclusive: weapon?.exclusive ?? null,
      legacyItemId: legacyItem._id, inheritedMechanics
    } }
  };
});

if (missing.length) throw new Error(`Armas clássicas ausentes da tabela oficial: ${missing.join(", ")}`);
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados no Combate de Terras Selvagens");
const invalidItems = items.filter((item) => !item.folder || !item.system.descricao);
if (invalidItems.length) throw new Error(`Item órfão ou sem descrição no Combate de Terras Selvagens: ${invalidItems.map((item) => item.name).join(", ")}`);

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-combate.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-combate-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, inheritedMechanics: items.filter((item) => item.flags.tagmarSync.inheritedMechanics).length }, null, 2));
