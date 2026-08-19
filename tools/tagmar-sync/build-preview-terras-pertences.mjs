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
const folders = [{
  _id: rootId, name: rootRoute, type: "Item", folder: null, sorting: "a", sort: 70, color: "#8b5a2b",
  flags: { tagmarSync: { edition, category, route: rootRoute } }
}, ...groups.map((group, index) => ({
  _id: folderIds.get(group), name: groupLabels[group] ?? `${group} — Armas Especiais`, type: "Item", folder: rootId,
  sorting: "a", sort: index * 10, color: "#a86f32",
  flags: { tagmarSync: { edition, category, route: `${rootRoute} / ${group}`, sourceGroup: group } }
}))];

const items = weapons.map((weapon) => {
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
      priceReference: estimatedPrice ? override.referenciaPreco : null
    } }
  };
});

if (items.length !== 46) throw new Error(`Esperados 46 Pertences de armas; encontrados ${items.length}`);
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados nos Pertences de Terras Selvagens");
await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-pertences.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-pertences-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, officialPrices: items.filter((item) => item.flags.tagmarSync.priceStatus === "official").length, estimatedPrices: items.filter((item) => item.flags.tagmarSync.priceStatus !== "official").length }, null, 2));
