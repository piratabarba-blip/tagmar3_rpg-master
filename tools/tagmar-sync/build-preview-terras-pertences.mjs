import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const edition = "Aventuras nas Terras Selvagens";
const category = "terras-pertences";
const weapons = JSON.parse(await readFile(join(cacheDir, "preview-terras-combate.json"), "utf8"));
const defenses = JSON.parse(await readFile(join(cacheDir, "preview-terras-defesa.json"), "utf8"));
const defenseFolders = JSON.parse(await readFile(join(cacheDir, "preview-terras-defesa-folders.json"), "utf8"));
const overrides = JSON.parse(await readFile(join(here, "terras-pertences-overrides.json"), "utf8"));

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const rootRoute = "08 - PERTENCES DE TERRAS SELVAGENS";
const rootId = stableId("tagmar-terras-pertences-folder", rootRoute);
const groupLabels = {
  CC: "CC — Armas de Cauda", CD: "CD — Garras e Manoplas", CI: "CI — Imobilização",
  CL: "CL — Armas Curtas", CLD: "CLD — Disparo Leve", CME: "CME — Corte Médio",
  CPE: "CPE — Corte Pesado", CPF: "CPF — Foices Pesadas", CPM: "CPM — Machados Pesados",
  EL: "EL — Esmagamento Leve", EM: "EM — Esmagamento Médio", EP: "EP — Esmagamento Pesado",
  PML: "PML — Perfuração Média", PPP: "PPP — Perfuração Pesada"
};
const groups = [...new Set(weapons.map((weapon) => weapon.flags?.tagmarSync?.sourceGroup || weapon.system?.tipo || "ESPECIAL"))]
  .sort((a, b) => a.localeCompare(b, "pt-BR"));
const folderIds = new Map(groups.map((group) => [group, stableId("tagmar-terras-pertences-folder", `${rootRoute}:${group}`)]));
const defenseFolderNames = ["ARMADURAS", "ELMOS", "ESCUDO", "PROTETOR EXOTICO"];
const defenseFolderById = new Map(defenseFolders.map((folder) => [folder._id, folder.name]));
const defenseBelongingFolderIds = new Map(defenseFolderNames.map((name) => [name,
  stableId("tagmar-terras-pertences-folder", `${rootRoute}:DEFESA:${name}`)]));
const folders = [{
  _id: rootId, name: rootRoute, type: "Item", folder: null, sorting: "a", sort: 70, color: "#8b5a2b",
  flags: { tagmarSync: { edition, category, route: rootRoute } }
}, ...groups.map((group, index) => ({
  _id: folderIds.get(group), name: groupLabels[group] ?? `${group} — Armas Especiais`, type: "Item", folder: rootId,
  sorting: "a", sort: index * 10, color: "#a86f32",
  flags: { tagmarSync: { edition, category, route: `${rootRoute} / ${group}`, sourceGroup: group, belongingKind: "weapon" } }
})), ...defenseFolderNames.map((name, index) => ({
  _id: defenseBelongingFolderIds.get(name), name: `DEFESA — ${name}`, type: "Item", folder: rootId,
  sorting: "a", sort: 1000 + index * 10, color: "#2f6f8f",
  flags: { tagmarSync: { edition, category, route: `${rootRoute} / DEFESA — ${name}`, belongingKind: "defense" } }
}))];

const weaponItems = weapons.map((weapon) => {
  const override = overrides[weapon.name];
  if (!override || !Number.isFinite(override.peso)) throw new Error(`Peso proposto ausente: ${weapon.name}`);
  const officialPrice = String(weapon.system?.preco ?? "").trim();
  const estimatedPrice = !officialPrice;
  const price = officialPrice || override.preco;
  if (!price) throw new Error(`Preço ausente: ${weapon.name}`);
  const group = weapon.flags?.tagmarSync?.sourceGroup || weapon.system?.tipo || "ESPECIAL";
  const reviewNote = [
    `<p><strong>Objeto correspondente à ficha de combate:</strong> ${escapeHtml(weapon.name)}</p>`,
    `<p><strong>Peso:</strong> ${override.peso} kg — estimado por analogia com ${escapeHtml(override.referenciaPeso)}.</p>`,
    estimatedPrice
      ? `<p><strong>Preço proposto:</strong> ${escapeHtml(price)} — estimado por analogia com ${escapeHtml(override.referenciaPreco)}.</p>`
      : `<p><strong>Preço:</strong> ${escapeHtml(price)} — preservado da tabela oficial sincronizada.</p>`,
    weapon.system?.descricao || ""
  ].join("");
  return {
    _id: stableId("tagmar-terras-pertence", weapon.name), name: weapon.name, type: "Pertence", img: weapon.img,
    folder: folderIds.get(group),
    system: { quant: 0, descricao: reviewNote, peso: override.peso, preco: price, inTransport: false },
    flags: { tagmarSync: {
      edition, category, origin: "derived-from-official-terras-weapon", sourceName: weapon.flags.tagmarSync.sourceName,
      sourceUrl: weapon.flags.tagmarSync.sourceUrl, sourceHash: weapon.flags.tagmarSync.sourceHash,
      sourceWeaponId: weapon._id, sourceGroup: group, sourceExclusive: weapon.flags.tagmarSync.sourceExclusive,
      weightStatus: "project-estimate-approved", weightReference: override.referenciaPeso,
      priceStatus: estimatedPrice ? "project-estimate-approved" : "official",
      priceReference: estimatedPrice ? override.referenciaPreco : null, belongingKind: "weapon"
    } }
  };
});

const defensePriceOverrides = {
  "Cota de malha completa de Aço de Tar Omons": [12, "m.o.", "Cota de malha completa e ganho de absorção"],
  "Cota de malha parcial de Aço de Tar Omons": [4, "m.o.", "Cota de malha parcial e ganho de absorção"],
  "Couraça completa de Aço de Tar Omons": [35, "m.o.", "Couraça completa e ganho de absorção"],
  "Couraça completa de Coral de Aço": [50, "m.o.", "Couraça parcial de Coral de Aço"],
  "Couraça parcial de Aço de Tar Omons": [25, "m.o.", "Couraça parcial e ganho de absorção"],
  "Couraça parcial de ossos de monstro dos mangues": [8, "m.p.", "Couraça parcial de ossos"],
  "Elmo Aberto de Aço de Tar Omons": [8, "m.p.", "Elmo aberto e ganho de absorção"],
  "Elmo fechado de Aço de Tar Omons": [3, "m.o.", "Elmo fechado e ganho de absorção"],
  "Escudo grande de Aço de Tar Omons": [4, "m.o.", "Escudo grande e ganho de absorção"],
  "Escudo pequeno de Aço de Tar Omons": [12, "m.p.", "Escudo pequeno e ganho de absorção"],
  "Escudo Torre de Aço de Tar Omons": [7, "m.o.", "Escudo de torre e ganho de absorção"]
};
function defenseWeight(name, folderName) {
  const lower = name.toLocaleLowerCase("pt-BR");
  if (folderName === "ARMADURAS") {
    if (lower.includes("casaco")) return [2, "Casaco reforçado / Couro leve"];
    if (lower === "casco de tartaruga") return [4, "Couro leve"];
    if (lower.includes("correntes de caudas")) return [1.5, "Proteção parcial de cauda"];
    if (lower.includes("cota de caudas")) return [3, "Cota de malha adaptada à cauda"];
    if (lower.includes("couraça de caudas")) return [4, "Couraça adaptada à cauda"];
    if (lower.includes("cota de malha completa")) return [23, "Cota de malha completa"];
    if (lower.includes("cota de malha parcial")) return [10, "Cota de malha parcial"];
    if (lower.includes("couraça completa")) return [35, "Couraça completa"];
    if (lower.includes("couraça parcial")) return [30, "Couraça parcial"];
    if (lower.includes("cerberus") || lower.includes("escamas") || lower.includes("pazuzu")) return [6, "Couro rígido"];
    return [4, "Couro leve"];
  }
  if (folderName === "ELMOS") {
    if (lower.includes("gorro")) return [0.5, "Proteção leve para a cabeça"];
    if (lower.includes("fechado")) return [2, "Elmo fechado"];
    return [1, "Elmo aberto / capacete"];
  }
  if (folderName === "ESCUDO") {
    if (lower.includes("torre")) return [9, "Escudo de torre"];
    if (lower.includes("pequeno")) return [3, "Escudo pequeno"];
    return [6, "Escudo grande"];
  }
  if (lower.includes("laços")) return [0.5, "Proteção leve de cauda"];
  return [2, "Proteção de asas"];
}

const defenseItems = defenses.map((defense) => {
  const folderName = defenseFolderById.get(defense.folder);
  if (!defenseBelongingFolderIds.has(folderName)) throw new Error(`Pasta de Defesa inesperada: ${defense.name}`);
  const [weight, weightReference] = defenseWeight(defense.name, folderName);
  const officialPrice = String(defense.system?.preco ?? "").trim();
  const proposed = defensePriceOverrides[defense.name];
  const estimatedPrice = !officialPrice;
  const price = officialPrice || (proposed ? `${proposed[0]} ${proposed[1]}` : "");
  if (!price) throw new Error(`Preço defensivo ausente: ${defense.name}`);
  const description = [
    `<p><strong>Objeto correspondente à ficha de Defesa:</strong> ${escapeHtml(defense.name)}</p>`,
    `<p><strong>Peso:</strong> ${weight} kg — estimado por analogia com ${escapeHtml(weightReference)}.</p>`,
    estimatedPrice
      ? `<p><strong>Preço proposto:</strong> ${escapeHtml(price)} — estimado por analogia com ${escapeHtml(proposed[2])}.</p>`
      : `<p><strong>Preço:</strong> ${escapeHtml(price)} — preservado da tabela oficial sincronizada.</p>`,
    defense.system?.descricao || ""
  ].join("");
  return {
    _id: stableId("tagmar-terras-pertence-defesa", defense.name), name: defense.name, type: "Pertence", img: defense.img,
    folder: defenseBelongingFolderIds.get(folderName),
    system: { quant: 0, descricao: description, peso: weight, preco: price, inTransport: false },
    flags: { tagmarSync: {
      edition, category, origin: "derived-from-official-terras-defense", sourceName: defense.flags.tagmarSync.sourceName,
      sourceUrl: defense.flags.tagmarSync.sourceUrl, sourceHash: defense.flags.tagmarSync.sourceHash,
      sourceDefenseId: defense._id, defenseCategory: folderName,
      weightStatus: "project-estimate-approved", weightReference,
      priceStatus: estimatedPrice ? "project-estimate-approved" : "official",
      priceReference: estimatedPrice ? proposed[2] : null, belongingKind: "defense"
    } }
  };
});
const items = [...weaponItems, ...defenseItems];

if (weaponItems.length !== 46) throw new Error(`Esperados 46 Pertences de armas; encontrados ${weaponItems.length}`);
if (defenseItems.length !== 86) throw new Error(`Esperados 86 Pertences de defesa; encontrados ${defenseItems.length}`);
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados nos Pertences de Terras Selvagens");
await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-pertences.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-pertences-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, weaponItems: weaponItems.length, defenseItems: defenseItems.length, folders: folders.length, officialPrices: items.filter((item) => item.flags.tagmarSync.priceStatus === "official").length, estimatedPrices: items.filter((item) => item.flags.tagmarSync.priceStatus !== "official").length }, null, 2));
