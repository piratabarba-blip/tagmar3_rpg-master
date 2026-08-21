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
const genericBag = "icons/containers/bags/pack-simple-leather-tan.webp";
function nativeIcon(name, folderName, legacyImage = "") {
  const monochromeLegacy = [
    "alao.png", "cao%20comum.png", "corvo.png", "92008.png",
    "a9e5ae88941f75ebc7499c584ca569d3-coelho-coelho-cauda-orelha-perna-silhueta-detalhada-lebre-by-vexels.png",
    "66722.png", "image_icon_pig_2_pic_512x512.png", "7.png", "treno.png",
    "8bb12b2cad6c5c2e871be94ebb9c67f7-silhueta-de-clarinete-by-vexels.png"
  ];
  const legacyFilename = legacyImage.replaceAll("\\", "/").split("/").at(-1)?.toLocaleLowerCase("pt-BR") ?? "";
  const repairedNativeIcons = new Map([
    ["icons/equipment/chest/breastplate-pieced-black-02.webp", "icons/equipment/chest/breastplate-layered-leather-studded-black.webp"],
    ["icons/equipment/chest/breastplate-pieced-black-01.webp", "icons/equipment/chest/breastplate-layered-steel-grey.webp"]
  ]);
  if (repairedNativeIcons.has(legacyImage)) return repairedNativeIcons.get(legacyImage);
  if (legacyImage && legacyImage !== genericBag && !legacyImage.startsWith("icons/svg/") && !monochromeLegacy.includes(legacyFilename)) return legacyImage;
  const value = key(name);
  const matches = (pattern) => pattern.test(value);

  if (matches(/aguia|gaviao/)) return "icons/creatures/birds/raptor-hawk-flying.webp";
  if (matches(/corvo|pombo/)) return "icons/creatures/birds/corvid-flying-wings-purple.webp";
  if (matches(/canario/)) return "icons/creatures/birds/songbird-yellow-flying.webp";
  if (matches(/galinha/)) return "icons/creatures/birds/chicken-hen-white.webp";
  if (matches(/ganso|pato/)) return "icons/creatures/birds/duck-green.webp";
  if (matches(/cavalo|ponei/)) return "icons/environment/creatures/horse-brown.webp";
  if (matches(/burro|mula/)) return "icons/environment/creatures/horse-tan.webp";
  if (matches(/bufalo/)) return "icons/creatures/mammals/ox-buffalo-horned-green.webp";
  if (matches(/^boi$/)) return "icons/creatures/mammals/ox-bull-horned-glowing-orange.webp";
  if (matches(/vaca/)) return "icons/creatures/mammals/livestock-cow-green.webp";
  if (matches(/cabra|bode/)) return "icons/creatures/mammals/goat-horned-blue.webp";
  if (matches(/ovelha|carneiro/)) return "icons/creatures/mammals/livestock-sheep-green.webp";
  if (matches(/porco/)) return "icons/creatures/mammals/livestock-pig-green.webp";
  if (matches(/cao/)) return "icons/creatures/mammals/dog-husky-white-blue.webp";
  if (matches(/gato/)) return "icons/creatures/mammals/cat-hunched-glowing-red.webp";
  if (matches(/coelho|lebre/)) return "icons/creatures/mammals/rabbit-movement-glowing-green.webp";

  if (matches(/barcaca|barco|canoa|caravela|galera|veleiro/)) return "icons/environment/vehicles/boat-fishing-masted.webp";
  if (matches(/carro de boi|carroca|carruagem|charrete/)) return "icons/environment/settlement/wagon.webp";
  if (matches(/treno/)) return "icons/environment/settlement/wagon-black.webp";
  if (matches(/casa confortavel/)) return "icons/environment/settlement/house-two-stories.webp";
  if (matches(/casa simples/)) return "icons/environment/settlement/house-farmland-small.webp";
  if (matches(/hospedagem/)) return "icons/sundries/survival/bedroll-worn-tan.webp";

  if (matches(/balalaica|bandolim|banjo|rabeca/)) return "icons/tools/instruments/lute-gold-brown.webp";
  if (matches(/clarineta|gaita/)) return "icons/tools/instruments/pipe-flute-brown.webp";
  if (matches(/berrante/)) return "icons/tools/instruments/horn-flared-wood.webp";
  if (matches(/pandeirola/)) return "icons/tools/instruments/drum-hand-tan.webp";
  if (matches(/triangulo de metal/)) return "icons/tools/instruments/chimes-wood-white.webp";

  if (matches(/banquete nobre/)) return "icons/consumables/food/plate-steak-grilled-brown-green.webp";
  if (matches(/banquete|refeicao cara/)) return "icons/consumables/food/plate-chicken-grilled-mushroom-brown.webp";
  if (matches(/refeicao boa|refeicao normal/)) return "icons/consumables/food/bowl-stew-brown.webp";
  if (matches(/refeicao barata/)) return "icons/consumables/food/bread-toast-tan.webp";
  if (matches(/racao para animais/)) return "icons/containers/bags/sack-twisted-brown.webp";
  if (matches(/racao semanal/)) return "icons/consumables/food/berries-ration-round-red.webp";
  if (matches(/cesta de frutas/)) return "icons/skills/trades/farming-picking-basket-fruit-green.webp";
  if (matches(/copo de vinho/)) return "icons/consumables/drinks/wine-amphora-clay-gray.webp";
  if (matches(/^agua fresca$/)) return "icons/consumables/drinks/water-jug-clay-brown.webp";

  if (matches(/par de botas/)) return "icons/equipment/feet/boots-leather-simple-brown.webp";
  if (matches(/^tenda$/)) return "icons/environment/settlement/tent.webp";
  if (matches(/^funda$/)) return "icons/weapons/slings/sling-leather.webp";
  if (matches(/projetil.*funda/)) return "icons/weapons/ammunition/shot-round-lead.webp";
  if (matches(/^flecha/)) return "icons/weapons/ammunition/arrows-fletching.webp";
  if (matches(/lanca de justa/)) return "icons/weapons/polearms/spear-simple-barbed.webp";
  if (matches(/cadeado/)) return "icons/sundries/misc/lock-steel-blue.webp";
  if (matches(/frasco de vidro/)) return "icons/consumables/potions/bottle-round-empty-glass.webp";
  if (matches(/agua abencoada/)) return "icons/consumables/potions/bottle-round-corked-blue.webp";
  if (matches(/^vela/)) return "icons/sundries/lights/candle-unlit-tan.webp";
  if (matches(/componentes misticos/)) return "icons/commodities/materials/feather-colored-green.webp";

  if (matches(/escalada/)) return "icons/sundries/survival/climbing-anchor-steel-grey.webp";
  if (matches(/montaria/)) return "icons/equipment/feet/boots-leather-simple-brown.webp";
  if (matches(/madeira|trabalhos manuais/)) return "icons/tools/hand/hammer-cobbler-steel.webp";
  if (matches(/metais/)) return "icons/tools/smithing/hammer-sledge-steel-grey.webp";
  if (matches(/construcao|agricultura|minera/)) return "icons/weapons/axes/pickaxe-gray.webp";
  if (matches(/veneficio|herbalismo|alquimia/)) return "icons/consumables/plants/dried-herb-bundle-brown.webp";
  if (matches(/destravar fechaduras/)) return "icons/tools/hand/lockpicks-steel-grey.webp";

  const defaults = {
    ANIMAIS: "icons/environment/creatures/horse-brown.webp",
    TRANSPORTES: "icons/environment/settlement/wagon.webp",
    RESIDENCIAS: "icons/environment/settlement/house-wooden-fence.webp",
    ESTALAGENS: "icons/sundries/survival/bedroll-worn-tan.webp",
    "REFEIÇÕES": "icons/consumables/food/bowl-stew-brown.webp",
    "INSTRUMENTOS MUSICAIS": "icons/tools/instruments/lute-gold-brown.webp",
    "MATERIAL PROFISSIONAL": "icons/tools/hand/hammer-cobbler-steel.webp"
  };
  return defaults[folderName] ?? genericBag;
}
const items = [];
for (const [folderName, rows] of categoryRows) for (const row of rows) {
  const type = ["ANIMAIS", "TRANSPORTES"].includes(folderName) ? "Transporte" : "Pertence";
  const legacyItem = allLegacyByName.get(`${type}:${key(row.name)}`) ?? allLegacyByName.get(`Pertence:${key(row.name)}`);
  const descriptionParts = [row.details, row.rarity ? `Raridade: ${row.rarity}` : ""].filter(Boolean);
  const system = type === "Transporte"
    ? { capacidade: legacyItem?.system?.capacidade ?? { carga: 0, pessoas: 0 }, preco: row.price, descricao: descriptionParts.join("<br/>") || legacyItem?.system?.descricao || "" }
    : { quant: 0, descricao: descriptionParts.join("<br/>") || legacyItem?.system?.descricao || "", peso: legacyItem?.system?.peso ?? 0, preco: row.price, inTransport: false };
  items.push({ _id: stableId("tagmar-t3er-pertence", `${folderName}:${row.name}`), name: row.name, type, img: nativeIcon(row.name, folderName, legacyItem?.img), folder: folderIds.get(folderName), system, flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category: "pertences", origin: "core", sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash, legacyItemId: legacyItem?._id ?? null, needsReview: !legacyItem } } });
}
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados em Pertences");
if (items.some((item) => !item.system.preco)) throw new Error("Pertence sem preço");
if (items.some((item) => !folderIds.has(folderNames.find((name) => folderIds.get(name) === item.folder)))) throw new Error("Pertence órfão");
await writeFile(join(cacheDir, "preview-pertences.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-pertences-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, matchedClassic: items.filter((item) => item.flags.tagmarSync.legacyItemId).length, newOfficial: items.filter((item) => !item.flags.tagmarSync.legacyItemId).length, byFolder: Object.fromEntries(folderNames.map((name) => [name, items.filter((item) => item.folder === folderIds.get(name)).length])) }, null, 2));
