import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));

const edition = "Tagmar 3 Edição Revisada";
const category = "combate";
const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex")
  .slice(0, 16);
const decodeEntities = (value) => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");
const stripTags = (value) => decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => stripTags(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;

function rowsFromTable(table) {
  return [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => stripTags(cell[1]))
  );
}

// Expande rowspans/colspans para que cada linha mecânica tenha as 18 colunas
// declaradas no cabeçalho. A tabela oficial usa rowspans em grupos e variantes.
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
      const attributes = cell[2];
      const value = stripTags(cell[3]);
      const colspan = integer(attributes.match(/colspan=["']?(\d+)/i)?.[1] ?? "1");
      const rowspan = integer(attributes.match(/rowspan=["']?(\d+)/i)?.[1] ?? "1");
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

const integer = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : 0;
};
const range = (value) => value === "-" ? "" : value;
const damageValue = (value) => key(value) === "x" ? 0 : integer(value);

const source = manifest.pages.find((page) => page.category === category && page.pageName === "Livro de Regras - Combate");
if (!source) throw new Error("Execute sync.mjs --category=combate --write antes de gerar a prévia");
const html = await readFile(join(cacheDir, "pages", snapshotFilename(source)), "utf8");
const tables = [...html.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
const weaponTables = tables.filter((table) => {
  const header = rowsFromTable(table)[0] ?? [];
  return header[0] === "Tipo" && header[1] === "Custo" && header[2] === "Arma";
});
if (weaponTables.length !== 2) throw new Error(`Esperadas duas tabelas gerais de armas; encontradas ${weaponTables.length}`);

const weapons = [];
let previous = null;

function normalWeapon(cells) {
  const offset = 2;
  const variant = /^\(com duas mãos\)$/i.test(cells[offset]);
  const damage = {
    d25: damageValue(cells[offset + 7]),
    d50: damageValue(cells[offset + 8]),
    d75: damageValue(cells[offset + 9]),
    d100: damageValue(cells[offset + 10])
  };
  const item = {
    group: cells[0],
    groupCost: integer(cells[1]),
    name: variant && previous ? `${previous.name} (Duas Mãos)` : cells[offset],
    alcance: range(cells[offset + 1]),
    forcaMin: integer(cells[offset + 2]),
    bonus: cells[offset + 3],
    defL: integer(cells[offset + 4]),
    defM: integer(cells[offset + 5]),
    defP: integer(cells[offset + 6]),
    damage,
    reach: {
      pequenino: cells[offset + 11],
      anao: cells[offset + 12],
      elfo: cells[offset + 13],
      meioElfo: cells[offset + 14],
      humano: cells[offset + 15]
    }
  };
  weapons.push(item);
  previous = item;
}

for (const table of weaponTables) {
  for (const cells of expandedRowsFromTable(table).slice(1)) {
    if (!cells.length || cells[0] === "Tipo") continue;
    if (cells.length === 18) normalWeapon(cells);
    else {
      throw new Error(`Formato não reconhecido na tabela de armas: ${JSON.stringify(cells)}`);
    }
  }
}

for (const weapon of weapons) {
  const expected = [weapon.damage.d25, weapon.damage.d25 * 2, weapon.damage.d25 * 3, weapon.damage.d25 * 4];
  const actual = [weapon.damage.d25, weapon.damage.d50, weapon.damage.d75, weapon.damage.d100];
  if (actual.some((value, index) => value !== expected[index])) {
    throw new Error(`Progressão de dano não linear em ${weapon.name}: ${actual.join("/")}`);
  }
}

const rootRoute = "04 - COMBATE";
const groupOrder = ["CD", "CI", "CL", "CLD", "CmE", "CmM", "EL", "EM", "PmA", "PmL", "CpE", "CpM", "EP", "PP", "PpA", "PpB"];
const sourceGroups = [...new Set(weapons.map((weapon) => weapon.group))];
if (sourceGroups.length !== groupOrder.length || groupOrder.some((group) => !sourceGroups.includes(group))) {
  throw new Error(`Grupos oficiais inesperados: ${sourceGroups.join(", ")}`);
}

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [key(folderPath(legacyFolderById, folder._id)), folder]));
const routes = [rootRoute, ...groupOrder.map((group) => `${rootRoute} / ${group}`)];
const folderIds = new Map();
const folderDocuments = routes.map((route, index) => {
  const parentRoute = route.includes(" / ") ? rootRoute : null;
  const legacyFolder = legacyFolderByPath.get(key(route));
  const id = stableId("tagmar-t3er-combate-folder", route);
  folderIds.set(route, id);
  return {
    _id: id,
    name: route.split(" / ").at(-1),
    type: "Item",
    folder: parentRoute ? folderIds.get(parentRoute) : null,
    sorting: "a",
    sort: legacyFolder?.sort ?? index * 10,
    color: legacyFolder?.color ?? (route === rootRoute ? "#85750f" : "#028a00"),
    flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
  };
});

const legacyWeapons = new Map();
for (const item of legacy.items.filter((entry) => entry.type === "Combate")) {
  const route = folderPath(legacyFolderById, item.folder);
  if (!route.startsWith(`${rootRoute} / `) || route.includes("ARMAS DE TÉCNICA") || route.includes("ARMAS NATURAIS")) continue;
  legacyWeapons.set(key(item.name), item);
}

function fullDamage(base) {
  const result = {};
  for (let percentage = 25; percentage <= 300; percentage += 25) {
    result[`d${percentage}`] = base.d25 * (percentage / 25);
  }
  return result;
}

const items = weapons.map((weapon) => {
  const legacyItem = legacyWeapons.get(key(weapon.name));
  const route = `${rootRoute} / ${weapon.group}`;
  const sourceReach = weapon.reach;
  const description = [
    `<p><strong>Grupo:</strong> ${weapon.group} (custo ${weapon.groupCost})</p>`,
    `<p><strong>Força mínima:</strong> ${weapon.forcaMin}</p>`,
    `<p><strong>Alcance corporal por raça:</strong> Pequenino ${sourceReach.pequenino}; Anão ${sourceReach.anao}; Elfo ${sourceReach.elfo}; Meio-elfo ${sourceReach.meioElfo}; Humano ${sourceReach.humano}.</p>`
  ].join("");
  return {
    _id: stableId("tagmar-t3er-combate", `${route}:${weapon.name}`),
    name: legacyItem?.name ?? weapon.name,
    type: "Combate",
    img: legacyItem?.img ?? "icons/svg/sword.svg",
    folder: folderIds.get(route) ?? null,
    system: {
      alcance: weapon.alcance,
      descricao: description,
      favorito: false,
      custo: 0,
      nivel: 0,
      forca_min: weapon.forcaMin,
      bonus: weapon.bonus,
      bonus_dano: legacyItem?.system?.bonus_dano ?? "",
      peso: 0,
      preco: "",
      bonus_magico: 0,
      def_l: weapon.defL,
      def_m: weapon.defM,
      def_p: weapon.defP,
      dano: fullDamage({ d25: 0 }),
      dano_base: fullDamage(weapon.damage),
      penalidade: legacyItem?.system?.penalidade ?? { p25: false, p50: false, p75: false, p100: false },
      tipo: weapon.group,
      municao: 0
    },
    flags: {
      tagmarSync: {
        edition,
        category,
        origin: "core",
        sourceName: source.pageName,
        sourceUrl: source.url,
        sourceHash: source.hash,
        sourceGroup: weapon.group,
        sourceGroupCost: weapon.groupCost,
        sourceStrengthMinimum: weapon.forcaMin,
        sourceReach,
        legacyItemId: legacyItem?._id ?? null,
        needsReview: !legacyItem
      }
    }
  };
});

const uniqueIds = new Set(items.map((item) => item._id));
const orphanItems = items.filter((item) => !folderDocuments.some((folder) => folder._id === item.folder));
const visualMatches = items.filter((item) => item.flags.tagmarSync.legacyItemId).length;
const needsReview = items.filter((item) => item.flags.tagmarSync.needsReview);
if (uniqueIds.size !== items.length) throw new Error(`IDs duplicados: ${items.length - uniqueIds.size}`);
if (orphanItems.length) throw new Error(`Itens órfãos: ${orphanItems.map((item) => item.name).join(", ")}`);

const output = join(cacheDir, "preview-combate.json");
const foldersOutput = join(cacheDir, "preview-combate-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folderDocuments, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  documents: items.length,
  folders: folderDocuments.length,
  groups: sourceGroups.length,
  uniqueIds: uniqueIds.size,
  visualMatches,
  needsReview: needsReview.map((item) => item.name),
  officialCorrection: items.filter((item) => item.name === "Boleadeira").map((item) => ({
    name: item.name,
    defP: item.system.def_p,
    classicDefP: legacyWeapons.get(key(item.name))?.system?.def_p
  })),
  countsByGroup: Object.fromEntries(groupOrder.map((group) => [group, weapons.filter((weapon) => weapon.group === group).length]))
}, null, 2));
