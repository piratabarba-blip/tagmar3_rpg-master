import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const category = "objetos-magicos";
const edition = "Tagmar 3 — Livro dos Objetos Mágicos";
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const system = JSON.parse(await readFile(join(root, "system.json"), "utf8"));
const revised = JSON.parse(await readFile(join(cacheDir, "snapshot-criando-fichas-t3er.json"), "utf8"));
const sources = manifest.pages.filter((page) => page.category === category);
if (sources.length !== 10) throw new Error(`Esperadas 10 páginas oficiais; encontradas ${sources.length}`);

const decode = (value) => String(value)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"');
const plain = (value) => decode(String(value).replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const key = (value) => plain(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const stableId = (namespace, value) => createHash("sha256").update(`${namespace}:${key(value)}`).digest("hex").slice(0, 16);
const snapshotFilename = (page) => `${createHash("sha256").update(`${page.category}:${page.pageName}`).digest("hex").slice(0, 16)}.html`;
const pageHtml = async (page) => readFile(join(cacheDir, "pages", snapshotFilename(page)), "utf8");
const sourceFor = (pattern) => {
  const found = sources.find((page) => pattern.test(page.pageName));
  if (!found) throw new Error(`Página oficial ausente: ${pattern}`);
  return found;
};
const catalogSources = [
  { pattern: /J[oó]ias e Vestimentos$/i, chapter: "01 - JOIAS E VESTIMENTAS" },
  { pattern: /Armas$/i, chapter: "02 - ARMAS MÁGICAS" },
  { pattern: /Armaduras Elmos e Escudos$/i, chapter: "03 - DEFESAS MÁGICAS" },
  { pattern: /Cetros e Cajados$/i, chapter: "04 - CETROS E CAJADOS" },
  { pattern: /Po[cç][oõ]es e Elixires$/i, chapter: "05 - POÇÕES E ELIXIRES" },
  { pattern: /Outros Objetos$/i, chapter: "06 - OUTROS OBJETOS" }
].map((entry) => ({ ...entry, source: sourceFor(entry.pattern) }));

function cleanSectionHtml(html) {
  return html
    .replace(/<h3[^>]*>\s*Verbetes que fazem refer[êe]ncia[\s\S]*$/i, "")
    .replace(/<h3[^>]*>\s*Verbetes relacionados[\s\S]*$/i, "")
    .replace(/<p>\s*<\/p>/gi, "").trim();
}
function sections(html) {
  return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi)]
    .map((match) => ({ name: plain(match[1]), html: cleanSectionHtml(match[2]), body: plain(cleanSectionHtml(match[2])) }))
    .filter((entry) => entry.name && /\bOrigem\s*:/i.test(entry.body) && /\bRaridade\s*:/i.test(entry.body));
}
function field(body, label, next = "Origem|Raridade|Objeto|Descri[cç][aã]o|Hist[oó]ria|Efeitos?") {
  return body.match(new RegExp(`${label}\\s*:\\s*(.*?)(?=\\s+(?:${next})\\s*:|$)`, "i"))?.[1]?.trim() ?? "";
}
function sourceFooter(source) {
  return `<hr><p><strong>Fonte oficial:</strong> <a href="${source.url}" target="_blank" rel="noopener">${source.pageName}</a></p>`;
}

const folderDefinitions = [
  { route: "01 - JOIAS E VESTIMENTAS", color: "#b57a18" },
  { route: "02 - ARMAS MÁGICAS", color: "#9e2929" },
  { route: "03 - DEFESAS MÁGICAS", color: "#286b9e" },
  { route: "03 - DEFESAS MÁGICAS / ARMADURAS", color: "#385f87" },
  { route: "03 - DEFESAS MÁGICAS / ELMOS", color: "#4c7399" },
  { route: "03 - DEFESAS MÁGICAS / ESCUDOS", color: "#5d84aa" },
  { route: "04 - CETROS E CAJADOS", color: "#7752a1" },
  { route: "05 - POÇÕES E ELIXIRES", color: "#29784a" },
  { route: "05 - POÇÕES E ELIXIRES / ELIXIRES E ESSÊNCIAS", color: "#31945b" },
  { route: "05 - POÇÕES E ELIXIRES / ÓLEOS", color: "#4a9a65" },
  { route: "05 - POÇÕES E ELIXIRES / PASTILHAS", color: "#62a475" },
  { route: "05 - POÇÕES E ELIXIRES / POÇÕES", color: "#31a36b" },
  { route: "05 - POÇÕES E ELIXIRES / UNGUENTOS", color: "#79ad86" },
  { route: "06 - OUTROS OBJETOS", color: "#7a5535" }
];
const folderIds = new Map(folderDefinitions.map(({ route }) => [route, stableId("tagmar-objetos-folder", route)]));
const itemFolders = folderDefinitions.map(({ route, color }, index) => {
  const parts = route.split(" / ");
  const parentRoute = parts.length > 1 ? parts.slice(0, -1).join(" / ") : null;
  return {
    _id: folderIds.get(route), name: parts.at(-1), type: "Item", folder: parentRoute ? folderIds.get(parentRoute) : null,
    sorting: "a", sort: index * 100000, color, flags: { tagmarSync: { edition, category, route } },
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null }
  };
});

const revisedItems = revised.documents ?? [];
const coreCombatByName = new Map(revisedItems.filter((item) => item.type === "Combate").map((item) => [key(item.name), item]));
const coreDefenseByName = new Map(revisedItems.filter((item) => item.type === "Defesa").map((item) => [key(item.name), item]));
const defenseAlias = new Map([
  [key("Couraça Metálica Parcial"), "Couraça Parcial"], [key("Couraça Metálica Completa"), "Couraça Completa"]
]);
const weaponAlias = new Map([[key("Espada Montante"), "Montante"]]);
const firstObject = (value) => value.split(/,|\be\b|\bou\b/iu)[0].replace(/[.()]/g, " ").replace(/\s+/g, " ").trim();
function baseDefense(objectName) {
  const name = defenseAlias.get(key(firstObject(objectName))) ?? firstObject(objectName);
  return coreDefenseByName.get(key(name));
}
function baseWeapon(objectName) {
  const objectKey = key(objectName);
  const alias = [...weaponAlias.entries()].find(([sourceName]) => objectKey.includes(sourceName));
  if (alias) return coreCombatByName.get(key(alias[1]));
  return [...coreCombatByName.entries()]
    .filter(([name]) => objectKey.includes(name))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1];
}
const weaponBonusOverrides = new Map(Object.entries({
  "Alma dos Mártires": 1, "Arco de Aglaio": 2, "Arco Negro": 2, "Arien, A Luz-Guia": 0,
  "Axa do Fogo Invernal": 5, "Blur'ator, O Guarda do Salão das Estrelas": 4,
  "Condenação Eterna & Salvação Final": 3, "Coração de Jade": 0, "Doruntar, A Lâmina que Retorna": 4,
  "Epona, A Rainha dos Cavalos": 5, "Espada de Meriam": 0, "Esquecimento Profano": 3,
  "Etos Seranatiel, A Semente do Mal": 2, "Garra de Ocantir": 0, "Guardião da Rosa dos Ventos": 4,
  "Hongor-Tun, A Maça das Tempestades": 5, "Lágrima Fria de Liris": 2, "Mankdir, A Tecelã do Espaço": 4,
  "Sagae, A Pacificadora": 0, "Sopro Mortal da Enida": 0, "Ur": 3, "Vampirus Escarlate": 3,
  "Vingadora Eterna": 3
}));
const defenseAdjustmentOverrides = new Map(Object.entries({
  "Albernatus, A Última Lagrima de Ódio": { defense: 3, absorption: 0 },
  "Asas de Fênix": { defense: 3, absorption: 7 }, "Aura Branca": { defense: 2, absorption: 6 },
  "Balinar, O Escudo Orgulhoso": { defense: 2, absorption: 5 }, "Baluarte de Ganis": { defense: 3, absorption: 25 },
  "Camuflagem do Assassino sem Rosto": { defense: 3, absorption: 10 }, "Cannisium, A Fera Demoníaca": { defense: 2, absorption: 5 },
  "Corações de Luz": { defense: 3, absorption: 0 }, "Coroa de Plandis": { defense: 0, absorption: 2 },
  "Crânio de Ferro": { defense: 3, absorption: 5 }, "Crizar, A Couraça Sangrenta": { defense: 8, absorption: 25 },
  "Cruinar, Aquela que Vive Eternamente": { defense: 5, absorption: 8 }, "Dracus, A Mente Draconiana": { defense: 0, absorption: 0 },
  "Entropia": { defense: 4, absorption: 10 }, "Escama do Leviatã": { defense: 5, absorption: 5 },
  "Isjur, O Defensor Silencioso": { defense: 3, absorption: 3 }, "Jormar, A que Caminha entre os Mortos": { defense: 0, absorption: 0 },
  "Maximus, A Guarda de Blator": { defense: 5, absorption: 0 }, "Nebular": { defense: 0, absorption: 0 }
}));
function magicAdjustments(name, body) {
  const first = body.match(/Efeitos?\s*:\s*([\s\S]*)/i)?.[1] ?? body;
  const defense = Number(first.match(/(?:defesa|prote[cç][aã]o)\s*\+\s*(\d+)/i)?.[1] ?? first.match(/\+\s*(\d+)\s*(?:de\s*)?defesa/i)?.[1] ?? 0);
  const absorption = Number(first.match(/absor[cç][aã]o\s*\+\s*(\d+)/i)?.[1] ?? first.match(/\+\s*(\d+)\s*(?:de\s*)?absor[cç][aã]o/i)?.[1] ?? 0);
  const generic = Number(first.match(/\b(?:arma|armadura|cota|coura[cç]a|escudo|elmo)\b[^.!]{0,70}?\+(\d+)(?!\s*(?:de\s*)?(?:defesa|absor[cç][aã]o))/i)?.[1] ?? 0);
  const defenseOverride = defenseAdjustmentOverrides.get(name);
  return {
    defense: defenseOverride?.defense ?? (defense || generic),
    absorption: defenseOverride?.absorption ?? absorption,
    weapon: weaponBonusOverrides.get(name) ?? generic
  };
}
function nativeIcon(chapter, name, objectName) {
  const text = key(`${name} ${objectName}`);
  if (chapter.startsWith("04")) return "icons/weapons/staves/staff-blue-jewel.webp";
  if (chapter.startsWith("05")) {
    if (/oleo/.test(text)) return "icons/consumables/potions/bottle-bulb-corked-purple.webp";
    if (/pastilha/.test(text)) return "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp";
    if (/elixir|essencia|infusao/.test(text)) return "icons/consumables/potions/bottle-bulb-corked-green.webp";
    return "icons/consumables/potions/bottle-bulb-corked-labeled-blue.webp";
  }
  if (chapter.startsWith("02")) {
    if (/arco/.test(text)) return "icons/weapons/bows/bow-ornamental-gold-blue.webp";
    if (/machado|axa/.test(text)) return "icons/weapons/axes/axe-double-engraved-runes.webp";
    if (/maca|mangual|marreta/.test(text)) return "icons/weapons/maces/mace-round-ornate-purple.webp";
    if (/lanca/.test(text)) return "icons/weapons/polearms/spear-ornate-gold.webp";
    if (/punhal|gladio/.test(text)) return "icons/weapons/daggers/dagger-magical-glowing-blue.webp";
    return "icons/weapons/swords/sword-runed-glowing.webp";
  }
  if (chapter.startsWith("03")) {
    if (/escudo/.test(text)) return "icons/equipment/shield/buckler-wooden-boss-glowing-blue.webp";
    if (/elmo|coroa/.test(text)) return "icons/equipment/head/greathelm-banded-steel.webp";
    return "icons/equipment/chest/breastplate-banded-blue.webp";
  }
  if (/anel/.test(text)) return "icons/equipment/finger/ring-ball-gold.webp";
  if (/amuleto|medalhao|colar/.test(text)) return "icons/equipment/neck/amulet-carved-stone-eye.webp";
  if (/bracelete|bracadeira/.test(text)) return "icons/equipment/wrist/bracer-armored-steel-purple.webp";
  if (/capa|manto|vestimenta/.test(text)) return "icons/equipment/back/cape-layered-blue-accent.webp";
  if (/livro|tomo/.test(text)) return "icons/sundries/books/book-backed-blue-gold.webp";
  return "icons/magic/symbols/runes-carved-stone-purple.webp";
}
function potionFolder(name) {
  if (/^(Elixir|Ess[êe]ncia|Infus[aã]o)/i.test(name)) return "05 - POÇÕES E ELIXIRES / ELIXIRES E ESSÊNCIAS";
  if (/^Óleo/i.test(name)) return "05 - POÇÕES E ELIXIRES / ÓLEOS";
  if (/^Pastilha/i.test(name)) return "05 - POÇÕES E ELIXIRES / PASTILHAS";
  if (/^Poção/i.test(name)) return "05 - POÇÕES E ELIXIRES / POÇÕES";
  if (/^Ung[üu]ento/i.test(name)) return "05 - POÇÕES E ELIXIRES / UNGUENTOS";
  return "05 - POÇÕES E ELIXIRES";
}

const items = [];
for (const { source, chapter } of catalogSources) {
  const html = await pageHtml(source);
  for (const [index, section] of sections(html).entries()) {
    const origin = field(section.body, "Origem");
    const rarity = field(section.body, "Raridade");
    const explicitObjectName = field(section.body, "Objeto");
    const objectName = explicitObjectName || (chapter.startsWith("04") ? "Cetro ou Cajado" : chapter.startsWith("05") ? section.name.split(/\s+/)[0] : "Objeto mágico");
    const description = `<h1>${section.name}</h1>${section.html}${sourceFooter(source)}`;
    const commonFlags = {
      edition, category, origin: "official-current", chapter, sourceName: source.pageName, sourceUrl: source.url,
      sourceHash: source.hash, objectType: objectName, magicalOrigin: origin, rarity
    };
    let item;
    if (chapter.startsWith("03")) {
      const base = baseDefense(objectName);
      if (!base) throw new Error(`Defesa-base não encontrada: ${section.name} (${objectName})`);
      const adjustment = magicAdjustments(section.name, section.body);
      const subtype = /escudo/i.test(objectName) ? "ESCUDOS" : /elmo|coroa/i.test(objectName) ? "ELMOS" : "ARMADURAS";
      item = {
        ...base, _id: stableId("tagmar-objeto-magico", section.name), name: section.name,
        folder: folderIds.get(`03 - DEFESAS MÁGICAS / ${subtype}`), img: nativeIcon(chapter, section.name, objectName),
        system: {
          ...structuredClone(base.system),
          defesa_base: { ...base.system.defesa_base, valor: Number(base.system.defesa_base?.valor ?? 0) + adjustment.defense },
          absorcao: Number(base.system.absorcao ?? 0) + adjustment.absorption,
          peso: 1, descricao: description, equipado: true
        },
        flags: { tagmarSync: { ...commonFlags, baseItemName: base.name, magicalDefense: true, appliedDefenseBonus: adjustment.defense, appliedAbsorptionBonus: adjustment.absorption } }
      };
    } else if (chapter.startsWith("02")) {
      const base = baseWeapon(objectName);
      if (base) {
        const adjustment = magicAdjustments(section.name, section.body);
        item = {
          ...base, _id: stableId("tagmar-objeto-magico", section.name), name: section.name,
          folder: folderIds.get(chapter), img: nativeIcon(chapter, section.name, objectName),
          system: { ...structuredClone(base.system), bonus_magico: adjustment.weapon, descricao: description },
          flags: { tagmarSync: { ...commonFlags, baseItemName: base.name, appliedMagicBonus: adjustment.weapon, multipleForms: /,|\be\b|\bou\b/iu.test(objectName) } }
        };
      } else {
        item = {
          _id: stableId("tagmar-objeto-magico", section.name), name: section.name, type: "Pertence",
          folder: folderIds.get(chapter), img: nativeIcon(chapter, section.name, objectName),
          system: { quant: 0, descricao: description, peso: 0, preco: "", inTransport: false },
          flags: { tagmarSync: { ...commonFlags, manualCombatConfiguration: true } }
        };
      }
    } else {
      const route = chapter.startsWith("05") ? potionFolder(section.name) : chapter;
      item = {
        _id: stableId("tagmar-objeto-magico", section.name), name: section.name, type: "Pertence",
        folder: folderIds.get(route), img: nativeIcon(chapter, section.name, objectName),
        system: { quant: 0, descricao: description, peso: 0, preco: "", inTransport: false },
        flags: { tagmarSync: commonFlags }
      };
    }
    item.sort = index * 100000;
    item.ownership = { default: 0 };
    item._stats = { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
    items.push(item);
  }
}
const canmaxIndex = items.findIndex((item) => item.name === "As Crias Amaldiçoadas de Canmax");
if (canmaxIndex < 0) throw new Error("Conjunto de Canmax ausente");
const canmaxSet = items.splice(canmaxIndex, 1)[0];
const canmaxComponents = [
  { suffix: "Armadura", base: "Couraça Parcial", subtype: "ARMADURAS", defense: 3, absorption: 18 },
  { suffix: "Escudo", base: "Escudo Grande", subtype: "ESCUDOS", defense: 2, absorption: 10 },
  { suffix: "Elmo", base: "Elmo Fechado", subtype: "ELMOS", defense: 1, absorption: 4 }
].map((definition, index) => {
  const base = coreDefenseByName.get(key(definition.base));
  if (!base) throw new Error(`Componente-base de Canmax ausente: ${definition.base}`);
  return {
    ...base, _id: stableId("tagmar-objeto-magico-componente", `As Crias Amaldiçoadas de Canmax:${definition.suffix}`),
    name: `As Crias Amaldiçoadas de Canmax — ${definition.suffix}`, folder: folderIds.get(`03 - DEFESAS MÁGICAS / ${definition.subtype}`), img: nativeIcon("03 - DEFESAS MÁGICAS", definition.suffix, definition.base),
    system: {
      ...structuredClone(base.system),
      defesa_base: { ...base.system.defesa_base, valor: Number(base.system.defesa_base?.valor ?? 0) + definition.defense },
      absorcao: Number(base.system.absorcao ?? 0) + definition.absorption, peso: 1,
      descricao: canmaxSet.system.descricao, equipado: true
    },
    sort: (canmaxIndex + index) * 100000, ownership: { default: 0 },
    flags: { tagmarSync: { ...canmaxSet.flags.tagmarSync, sourceArtifactName: canmaxSet.name, component: definition.suffix, baseItemName: base.name, magicalDefense: true, appliedDefenseBonus: definition.defense, appliedAbsorptionBonus: definition.absorption } },
    _stats: { ...canmaxSet._stats }
  };
});
items.splice(canmaxIndex, 0, ...canmaxComponents);
if (items.length !== 137) throw new Error(`Esperados 137 itens utilizáveis para 135 objetos oficiais; encontrados ${items.length}`);
if (new Set(items.map((item) => item.flags?.tagmarSync?.sourceArtifactName ?? item.name)).size !== 135) throw new Error("Catálogo não representa exatamente 135 objetos oficiais");
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs duplicados no catálogo mágico");

const journalFolderDefinitions = [
  { name: "00 - GUIA E REGRAS", color: "#1ca58d" },
  { name: "01 - PRÓLOGO E EPÍLOGO", color: "#8d5935" },
  { name: "02 - CATÁLOGO OFICIAL", color: "#7352a6" }
];
const journalFolderIds = new Map(journalFolderDefinitions.map(({ name }) => [name, stableId("tagmar-objetos-guide-folder", name)]));
const journalFolders = journalFolderDefinitions.map(({ name, color }, index) => ({
  _id: journalFolderIds.get(name), name, type: "JournalEntry", folder: null, sorting: "m", sort: index * 100000, color, flags: {},
  _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null }
}));
const journalDocuments = [];
const journalPages = [];
function journalFolderFor(pageName) {
  if (/Pr[oó]logo|Ep[ií]logo/i.test(pageName)) return "01 - PRÓLOGO E EPÍLOGO";
  if (/Introdu[cç][aã]o|^Livro dos Objetos M[aá]gicos$/i.test(pageName)) return "00 - GUIA E REGRAS";
  return "02 - CATÁLOGO OFICIAL";
}
function displayPageName(pageName) {
  return pageName.replace(/^Livro dos [Oo]bjetos [Mm][aá]gicos\s*-\s*/i, "");
}
function absolutize(html, pageUrl) {
  return html.replace(/\b(href|src)=(?:"([^"]*)"|'([^']*)')/gi, (match, attribute, doubleQuoted, singleQuoted) => {
    const quote = doubleQuoted !== undefined ? '"' : "'";
    const value = (doubleQuoted ?? singleQuoted).replace(/&amp;/gi, "&").trim();
    if (/^(?:https?:|data:|mailto:|tel:|#|@UUID\[|systems\/)/i.test(value)) return match;
    try { return `${attribute}=${quote}${new URL(value, pageUrl).href.replace(/&/g, "&amp;")}${quote}`; }
    catch { return match; }
  });
}
for (const [index, source] of [...sources].sort((a, b) => a.pageName.localeCompare(b.pageName, "pt-BR")).entries()) {
  const documentId = stableId("tagmar-objetos-guide-journal", source.pageName);
  const pageId = stableId("tagmar-objetos-guide-page", source.pageName);
  const sync = { edition, category, sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash, synchronizedAt: manifest.generatedAt };
  journalDocuments.push({
    _id: documentId, name: displayPageName(source.pageName), folder: journalFolderIds.get(journalFolderFor(source.pageName)), pages: [pageId], sort: index * 100000,
    ownership: { default: 0 }, flags: { tagmarSync: sync },
    _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
  journalPages.push({
    _id: pageId, name: displayPageName(source.pageName), type: "text", title: { show: false, level: 1 },
    text: { format: 1, content: `<section class="tagmar-objetos-magicos">${absolutize(await pageHtml(source), source.url)}${sourceFooter(source)}<p><small>Fonte registrada por URL e hash para verificação de atualizações.</small></p></section>` },
    image: {}, video: { controls: true, volume: 0.5 }, src: null, system: {}, sort: 0, ownership: { default: -1 }, flags: { tagmarSync: sync },
    _stats: { systemId: null, systemVersion: null, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null, compendiumSource: null, duplicateSource: null }
  });
}

await mkdir(cacheDir, { recursive: true });
await Promise.all([
  writeFile(join(cacheDir, "preview-objetos-magicos.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-objetos-magicos-folders.json"), `${JSON.stringify(itemFolders, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-objetos-magicos-guide-documents.json"), `${JSON.stringify(journalDocuments, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-objetos-magicos-guide-pages.json"), `${JSON.stringify(journalPages, null, 2)}\n`, "utf8"),
  writeFile(join(cacheDir, "preview-objetos-magicos-guide-folders.json"), `${JSON.stringify(journalFolders, null, 2)}\n`, "utf8")
]);
console.log(JSON.stringify({
  items: items.length, itemFolders: itemFolders.length, guideDocuments: journalDocuments.length, guideFolders: journalFolders.length,
  byType: Object.fromEntries(["Combate", "Defesa", "Pertence"].map((type) => [type, items.filter((item) => item.type === type).length])),
  manualWeapons: items.filter((item) => item.flags?.tagmarSync?.manualCombatConfiguration).map((item) => item.name)
}, null, 2));
