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
const category = "defesa";
const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex")
  .slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;
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
const integer = (value) => {
  const parsed = Number.parseInt(String(value).replace("+", ""), 10);
  return Number.isInteger(parsed) ? parsed : 0;
};

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

const sourceCombat = manifest.pages.find((page) => page.category === category && page.pageName === "Livro de Regras - Combate");
const sourcePrices = manifest.pages.find((page) => page.category === category && page.pageName === "Livro de Regras - Pertences e Afins");
if (!sourceCombat || !sourcePrices) throw new Error("Execute sync.mjs --category=defesa --write antes de gerar a prévia");

const combatHtml = await readFile(join(cacheDir, "pages", snapshotFilename(sourceCombat)), "utf8");
const priceHtml = await readFile(join(cacheDir, "pages", snapshotFilename(sourcePrices)), "utf8");
const tables = [...combatHtml.matchAll(/<table[^>]*>.*?<\/table>/gis)].map((match) => match[0]);
const defenseTables = tables.filter((table) => {
  const header = rowsFromTable(table)[0] ?? [];
  return header[0] === "Equipamentos de Defesa" && header[1] === "Defesa Base" && header[2] === "Absorção";
});
if (defenseTables.length !== 1) throw new Error(`Esperada uma tabela oficial de Defesa; encontradas ${defenseTables.length}`);

const defenseRows = rowsFromTable(defenseTables[0]).slice(1);
if (defenseRows.length !== 12 || defenseRows.some((row) => row.length !== 10)) {
  throw new Error(`Formato inesperado na tabela de Defesa: ${defenseRows.length} linhas`);
}

const priceSection = priceHtml.match(/<b>Armaduras, Elmos e Escudos<\/b>\s*<b>Preço<\/b><br\s*\/?>((?:(?!<b>Armas<\/b>)[\s\S])*)/i)?.[1];
if (!priceSection) throw new Error("Lista oficial de preços de Defesa não encontrada");
const prices = new Map();
for (const line of priceSection.split(/<br\s*\/?>/i).map(stripTags).filter(Boolean)) {
  const match = line.match(/^(.*?)\s+(\d+\s+m\.[ocp]\.)$/i);
  if (match) prices.set(key(match[1]), match[2]);
}
prices.set(key("Escudo Torre"), prices.get(key("Escudo de torre")));

const itemsFromSource = defenseRows.map((cells) => {
  const [name, defenseBase, absorption, physicalMinimum, strengthMinimum, ...raceUse] = cells;
  const armorMatch = defenseBase.match(/^([LMP])(\d+)$/i);
  const route = /^Escudo /i.test(name) ? "ESCUDOS" : /^Elmo /i.test(name) ? "ELMOS" : "ARMADURAS";
  return {
    name,
    route,
    defenseBase,
    defenseType: armorMatch?.[1]?.toUpperCase() ?? "",
    defenseValue: armorMatch ? integer(armorMatch[2]) : integer(defenseBase),
    absorption: integer(absorption),
    physicalMinimum,
    strengthMinimum,
    raceUse,
    price: prices.get(key(name)) ?? ""
  };
});

const expectedNames = [
  "Nada", "Couro Leve", "Couro Rígido", "Cota de Malha Parcial", "Cota de Malha Completa",
  "Couraça Parcial", "Couraça Completa", "Escudo Pequeno", "Escudo Grande", "Escudo Torre",
  "Elmo Aberto", "Elmo Fechado"
];
if (expectedNames.length !== itemsFromSource.length || expectedNames.some((name) => !itemsFromSource.some((item) => item.name === name))) {
  throw new Error(`Itens oficiais de Defesa inesperados: ${itemsFromSource.map((item) => item.name).join(", ")}`);
}

const rootRoute = "05 - DEFESA";
const categoryRoutes = ["ARMADURAS", "ELMOS", "ESCUDOS"];
const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [key(folderPath(legacyFolderById, folder._id)), folder]));
const routes = [rootRoute, ...categoryRoutes.map((name) => `${rootRoute} / ${name}`)];
const folderIds = new Map();
const folderDocuments = routes.map((route, index) => {
  const parentRoute = route.includes(" / ") ? rootRoute : null;
  const legacyFolder = legacyFolderByPath.get(key(route));
  const id = stableId("tagmar-t3er-defesa-folder", route);
  folderIds.set(route, id);
  return {
    _id: id,
    name: route.split(" / ").at(-1),
    type: "Item",
    folder: parentRoute ? folderIds.get(parentRoute) : null,
    sorting: legacyFolder?.sorting ?? "a",
    sort: legacyFolder?.sort ?? index * 10,
    color: legacyFolder?.color ?? (route === rootRoute ? "#1fb26d" : "#0104b7"),
    flags: { tagmarSync: { edition, category, route, legacyFolderId: legacyFolder?._id ?? null } }
  };
});

const legacyItems = new Map();
for (const item of legacy.items.filter((entry) => entry.type === "Defesa")) {
  const route = folderPath(legacyFolderById, item.folder);
  if (routes.includes(route)) legacyItems.set(key(item.name), item);
}

const raceLabels = ["Pequenino", "Anão", "Elfo", "Meio-elfo", "Humano"];
const items = itemsFromSource.map((sourceItem) => {
  const legacyItem = legacyItems.get(key(sourceItem.name));
  const route = `${rootRoute} / ${sourceItem.route}`;
  const description = [
    `<p><strong>Defesa Base:</strong> ${sourceItem.defenseBase}</p>`,
    `<p><strong>Absorção:</strong> ${sourceItem.absorption}</p>`,
    `<p><strong>Físico mínimo:</strong> ${sourceItem.physicalMinimum}</p>`,
    `<p><strong>Força mínima:</strong> ${sourceItem.strengthMinimum}</p>`,
    sourceItem.price ? `<p><strong>Preço:</strong> ${sourceItem.price}</p>` : "",
    sourceItem.raceUse.some((value) => value !== "---")
      ? `<p><strong>Uso por raça:</strong> ${sourceItem.raceUse.map((value, index) => `${raceLabels[index]} ${value}`).join("; ")}.</p>`
      : ""
  ].join("");
  return {
    _id: stableId("tagmar-t3er-defesa", `${route}:${sourceItem.name}`),
    name: legacyItem?.name ?? sourceItem.name,
    type: "Defesa",
    img: legacyItem?.img ?? "icons/svg/shield.svg",
    folder: folderIds.get(route) ?? null,
    system: {
      defesa_base: { tipo: sourceItem.defenseType, valor: sourceItem.defenseValue },
      absorcao: sourceItem.absorption,
      fis_min: integer(sourceItem.physicalMinimum),
      for_min: integer(sourceItem.strengthMinimum),
      peso: 0,
      preco: sourceItem.price,
      descricao: description,
      equipado: true
    },
    flags: {
      tagmarSync: {
        edition,
        category,
        origin: "core",
        sourceName: sourceCombat.pageName,
        sourceUrl: sourceCombat.url,
        sourceHash: sourceCombat.hash,
        priceSourceName: sourcePrices.pageName,
        priceSourceUrl: sourcePrices.url,
        priceSourceHash: sourcePrices.hash,
        sourceDefenseBase: sourceItem.defenseBase,
        sourcePhysicalMinimum: sourceItem.physicalMinimum,
        sourceStrengthMinimum: sourceItem.strengthMinimum,
        sourceRaceUse: Object.fromEntries(raceLabels.map((label, index) => [label, sourceItem.raceUse[index]])),
        legacyItemId: legacyItem?._id ?? null,
        needsReview: !legacyItem
      }
    }
  };
});

const uniqueIds = new Set(items.map((item) => item._id));
const orphanItems = items.filter((item) => !folderDocuments.some((folder) => folder._id === item.folder));
const visualMatches = items.filter((item) => item.flags.tagmarSync.legacyItemId).length;
const missingPrices = items.filter((item) => item.name !== "Nada" && !item.system.preco);
if (uniqueIds.size !== items.length) throw new Error(`IDs duplicados: ${items.length - uniqueIds.size}`);
if (orphanItems.length) throw new Error(`Itens órfãos: ${orphanItems.map((item) => item.name).join(", ")}`);
if (visualMatches !== items.length) throw new Error(`Itens sem correspondência visual clássica: ${items.filter((item) => !item.flags.tagmarSync.legacyItemId).map((item) => item.name).join(", ")}`);
if (missingPrices.length) throw new Error(`Preços oficiais ausentes: ${missingPrices.map((item) => item.name).join(", ")}`);

const output = join(cacheDir, "preview-defesa.json");
const foldersOutput = join(cacheDir, "preview-defesa-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folderDocuments, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  documents: items.length,
  folders: folderDocuments.length,
  uniqueIds: uniqueIds.size,
  visualMatches,
  missingPrices: missingPrices.map((item) => item.name),
  countsByCategory: Object.fromEntries(categoryRoutes.map((route) => [route, itemsFromSource.filter((item) => item.route === route).length]))
}, null, 2));
