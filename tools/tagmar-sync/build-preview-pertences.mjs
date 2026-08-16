import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const source = manifest.pages.find((page) => page.category === "pertences" && page.pageName === "Livro de Regras - Pertences e Afins");
if (!source) throw new Error("Snapshot oficial de Pertences e Afins ausente");
const sourceFile = `${createHash("sha256").update(`pertences:${source.pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", sourceFile), "utf8");

const decode = (value) => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'");
const clean = (value) => decode(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => clean(String(value)).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const stableId = (namespace, value) => createHash("sha256").update(`${namespace}:${key(value)}`).digest("hex").slice(0, 16);
const folderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
function folderPath(id) { const names = []; while (id && folderById.has(id)) { const folder = folderById.get(id); names.unshift(folder.name); id = folder.folder; } return names.join(" / "); }
const legacyPertences = legacy.items.filter((item) => folderPath(item.folder).startsWith("10 - PERTENCES E AFINS"));

function section(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<h4[^>]*>${escaped}\\s*<\\/h2>([\\s\\S]*?)(?=<h[34][^>]*>|$)`, "i"));
  if (!match) throw new Error(`Seção oficial ausente: ${name}`);
  return match[1].replace(/<br\s*\/?\s*>/gi, "\n").split(/\n+/).map(clean).filter(Boolean);
}
function priceLine(line) {
  if (/\s-\s*$/.test(line) || line.endsWith(" -")) return { body: line.replace(/\s-\s*$/, "").trim(), price: "-" };
  const match = line.match(/^(.*?)(\d[\d.,]*\s*m\.[ocp]\.?)\s*(?:\(\*\))?$/i);
  return match ? { body: match[1].trim(), price: match[2].replace(/\s+/g, "").toLocaleLowerCase("pt-BR") } : null;
}
function legacyCandidates(folderName) {
  return legacyPertences.filter((item) => key(folderPath(item.folder).split(" / ").at(-1)) === key(folderName));
}
const materialNames = [
  "Estojo de Cirurgia", "Estojo de primeiros socorros", "Estojo para arrombamento", "Estojo para disfarces",
  "Estojo para higiene pessoal", "Estojo para jogos", "Estojo para pesca", "Estojo para trabalho em metal",
  "Estojo para trabalhos em madeira", "Estojo para trabalhos manuais", "Material completo para construção, agricultura ou mineração",
  "Material completo para escalada", "Material completo para laboratório de venefício, herbalismo ou de alquimia",
  "Material completo para montaria", "Material completo para trabalhos em metais", "Material para Destravar Fechaduras"
];
const rarity = ["Muito Dificil", "Muito Difícil", "Impossível", "Rotineiro", "Absurdo", "Dificil", "Difícil", "Fácil", "Facil", "Médio", "Medio"];
function splitBody(body, candidates, explicitNames = []) {
  const choices = [...candidates.map((item) => item.name), ...explicitNames].sort((a, b) => key(b).length - key(a).length);
  const normalized = key(body);
  const name = choices.find((candidate) => normalized.startsWith(key(candidate)));
  if (!name) return { name: body, details: "" };
  const words = name.split(/\s+/).length;
  const rough = body.split(/\s+/);
  let cut = words;
  while (cut <= rough.length && !key(rough.slice(0, cut).join(" ")).startsWith(key(name))) cut += 1;
  return { name, details: rough.slice(cut).join(" ").trim() };
}
function parseLines(lines, folderName, options = {}) {
  const candidates = legacyCandidates(folderName);
  const start = lines.findIndex((line) => options.header ? key(line) === key(options.header) : /pre[cç]o/i.test(line));
  if (start < 0) throw new Error(`Cabeçalho de preços ausente: ${folderName}`);
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    const parsed = priceLine(line); if (!parsed) continue;
    let body = parsed.body;
    let rarityValue = "";
    if (options.rarity) {
      const found = rarity.find((value) => key(body).endsWith(key(value)));
      if (found) { rarityValue = found; body = body.slice(0, body.toLocaleLowerCase("pt-BR").lastIndexOf(found.toLocaleLowerCase("pt-BR"))).trim(); }
    }
    const split = splitBody(body, candidates, options.names ?? []);
    if (split.name === "Aluguel de uma Casa Simples4") split.name = "Aluguel de uma Casa Simples";
    rows.push({ ...split, price: parsed.price, rarity: rarityValue });
  }
  return rows;
}

const equipment = section("Armas, Armaduras e Afins");
const armsHeader = equipment.findIndex((line) => key(line) === "armas preco");
const armorRows = parseLines(equipment.slice(0, armsHeader), "ARMADURAS", { header: "Armaduras, Elmos e Escudos Preço" });
const armRows = parseLines(["Armas Preço", ...equipment.slice(armsHeader + 1)], "ARMAS", { header: "Armas Preço" });
const categoryRows = new Map([
  ["ARMAS", armRows],
  ["ANIMAIS", parseLines(section("Animais"), "ANIMAIS", { header: "Animais Preço" })],
  ["TRANSPORTES", parseLines(section("Transportes"), "TRANSPORTES", { header: "Transportes Capacidade Preço" })],
  ["RESIDENCIAS", parseLines(section("Residências"), "RESIDENCIAS", { header: "Residências Preço" })],
  ["ESTALAGENS", parseLines(section("Estalagens"), "ESTALAGENS", { header: "Estalagens Preço" })],
  ["REFEIÇÕES", parseLines(section("Refeições"), "REFEIÇÕES", { header: "Refeições Preço" })],
  ["VESTIMENTAS", parseLines(section("Vestimentas"), "VESTIMENTAS", { header: "Vestimentas Preço" })],
  ["MATERIAL PROFISSIONAL", parseLines(section("Material Profissional"), "MATERIAL PROFISSIONAL", { header: "Materiais Profissionais Conteúdo Preço", names: materialNames })],
  ["INSTRUMENTOS MUSICAIS", parseLines(section("Instrumentos Musicais"), "INSTRUMENTOS MUSICAIS", { header: "Instrumentos Preço" })],
  ["GEMAS E PEDRAS PRECIOSAS", parseLines(section("Gemas e Pedras preciosas"), "GEMAS E PEDRAS PRECIOSAS", { header: "Itens Raridade Preço (1g)", rarity: true })],
  ["MISCELÃNEAS", parseLines(section("Miscelâneas"), "MISCELÃNEAS", { header: "Itens Preço", names: ["Água abençoada (250 ml)"] })]
]);
categoryRows.set("ARMADURAS", armorRows.filter((row) => !/^escudo|^elmo/i.test(row.name)));
categoryRows.set("ESCUDOS", armorRows.filter((row) => /^escudo/i.test(row.name)));
categoryRows.set("ELMOS", armorRows.filter((row) => /^elmo/i.test(row.name)));

const rootName = "10 - PERTENCES E AFINS";
const folderNames = [...categoryRows.keys()];
const rootId = stableId("tagmar-t3er-pertences-folder", rootName);
const folders = [{ _id: rootId, name: rootName, type: "Item", folder: null, sorting: "a", sort: 1000, color: "#8c00d4", flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category: "pertences", origin: "core" } } }];
const folderIds = new Map();
for (const [index, name] of folderNames.entries()) {
  const classic = legacy.folders.find((folder) => key(folderPath(folder._id)) === key(`${rootName} / ${name}`));
  const id = stableId("tagmar-t3er-pertences-folder", `${rootName}/${name}`); folderIds.set(name, id);
  folders.push({ _id: id, name, type: "Item", folder: rootId, sorting: "a", sort: classic?.sort ?? (index + 1) * 10, color: classic?.color ?? "#b000a0", flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category: "pertences", origin: "core" } } });
}
const allLegacyByName = new Map(legacyPertences.map((item) => [`${item.type}:${key(item.name)}`, item]));
const items = [];
for (const [folderName, rows] of categoryRows) for (const row of rows) {
  const type = ["ANIMAIS", "TRANSPORTES"].includes(folderName) ? "Transporte" : "Pertence";
  const legacyItem = allLegacyByName.get(`${type}:${key(row.name)}`) ?? allLegacyByName.get(`Pertence:${key(row.name)}`);
  const descriptionParts = [row.details, row.rarity ? `Raridade: ${row.rarity}` : ""].filter(Boolean);
  const system = type === "Transporte"
    ? { capacidade: legacyItem?.system?.capacidade ?? { carga: 0, pessoas: 0 }, preco: row.price, descricao: descriptionParts.join("<br/>") || legacyItem?.system?.descricao || "" }
    : { quant: 0, descricao: descriptionParts.join("<br/>") || legacyItem?.system?.descricao || "", peso: legacyItem?.system?.peso ?? 0, preco: row.price, inTransport: false };
  items.push({ _id: stableId("tagmar-t3er-pertence", `${folderName}:${row.name}`), name: row.name, type, img: legacyItem?.img ?? "icons/containers/bags/pack-simple-leather-tan.webp", folder: folderIds.get(folderName), system, flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category: "pertences", origin: "core", sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash, legacyItemId: legacyItem?._id ?? null, needsReview: !legacyItem } } });
}
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados em Pertences");
if (items.some((item) => !item.system.preco)) throw new Error("Pertence sem preço");
if (items.some((item) => !folderIds.has(folderNames.find((name) => folderIds.get(name) === item.folder)))) throw new Error("Pertence órfão");
await writeFile(join(cacheDir, "preview-pertences.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-pertences-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, matchedClassic: items.filter((item) => item.flags.tagmarSync.legacyItemId).length, newOfficial: items.filter((item) => !item.flags.tagmarSync.legacyItemId).length, byFolder: Object.fromEntries(folderNames.map((name) => [name, items.filter((item) => item.folder === folderIds.get(name)).length])) }, null, 2));
