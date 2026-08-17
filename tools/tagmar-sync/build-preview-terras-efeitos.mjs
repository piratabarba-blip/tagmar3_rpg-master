import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const edition = "Aventuras nas Terras Selvagens";
const categoryDamage = "terras-magias-dano";
const categoryHealing = "terras-magias-cura";
const rootRoute = "07 - MAGIAS TERRAS SELVAGENS";

const stableId = (namespace, name) => createHash("sha256")
  .update(`${namespace}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const decodeEntities = (value) => String(value)
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const plainText = (value) => decodeEntities(value)
  .replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "\n").replace(/<\/li>/gi, "\n")
  .replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const key = (value) => plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const damageProgression = (maximum) => Object.fromEntries(Array.from({ length: 12 }, (_, index) => {
  const percentage = (index + 1) * 25;
  return [`d${percentage}`, Math.ceil((maximum * percentage) / 100)];
}));
const zeroProgression = () => damageProgression(0);

const magics = JSON.parse(await readFile(join(cacheDir, "preview-terras-magias.json"), "utf8"));
const magicFolders = JSON.parse(await readFile(join(cacheDir, "preview-terras-magias-folders.json"), "utf8"));
const coreDamage = JSON.parse(await readFile(join(cacheDir, "preview-magias-dano.json"), "utf8"));
const coreHealing = JSON.parse(await readFile(join(cacheDir, "preview-magias-cura.json"), "utf8"));
const rootFolder = magicFolders.find((folder) => folder.name === rootRoute && !folder.folder);
if (!rootFolder) throw new Error(`Pasta raiz ausente: ${rootRoute}`);

const uniqueMagicByName = new Map();
for (const magic of magics) if (!uniqueMagicByName.has(key(magic.name))) uniqueMagicByName.set(key(magic.name), magic);
const magicByName = (name) => {
  const magic = uniqueMagicByName.get(key(name));
  if (!magic) throw new Error(`Magia de Terras Selvagens ausente: ${name}`);
  return magic;
};
const sourceFlags = (magic) => ({
  sourceName: magic.flags.tagmarSync.sourceName,
  sourceUrl: magic.flags.tagmarSync.sourceUrl,
  sourceHash: magic.flags.tagmarSync.sourceHash
});
const folderDocument = (route, parent, color, category) => ({
  _id: stableId("tagmar-terras-magias-folder", route),
  name: route.split(" / ").at(-1), type: "Item", folder: parent,
  sorting: "a", sort: 0, color,
  flags: { tagmarSync: { edition, category, route } }
});

const attackRoute = `${rootRoute} / MAGIAS DE ATAQUE`;
const healingRoute = `${rootRoute} / MAGIAS DE CURA`;
const attackFolder = folderDocument(attackRoute, rootFolder._id, "#a00000", categoryDamage);
const healingFolder = folderDocument(healingRoute, rootFolder._id, "#208040", categoryHealing);
const folders = [attackFolder, healingFolder];
const items = [];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sections = (name, text) => [...text.matchAll(new RegExp(
  `${escapeRegExp(name)}\\s+(\\d+)\\s*[:;\-]\\s*([\\s\\S]*?)(?=${escapeRegExp(name)}\\s+\\d+\\s*[:;\-]|$)`, "gi"
))].map((match) => ({ effect: Number(match[1]), text: match[2].trim() }));
const parsedSections = (name, expression, options = {}) => {
  const magic = magicByName(name);
  const parsed = [];
  let previousMaximum = null;
  for (const section of sections(name, plainText(magic.system.efeito))) {
    const match = section.text.match(expression);
    const maximum = match ? Number(match[1]) : (options.inherit ? previousMaximum : null);
    if (!maximum) continue;
    previousMaximum = maximum;
    parsed.push({
      effect: section.effect, maxDamage: maximum, detail: section.text,
      range: options.range ?? magic.system.alcance,
      note: options.note ?? null
    });
  }
  return parsed;
};

const damageDefinitions = [
  { name: "Enxame de Pragas", parse: () => parsedSections("Enxame de Pragas", /causa\s+(\d+)\s+de dano/i, { range: "20m", note: "Mantenha a concentração; faça os ataques por alvo e aplique manualmente área, doença, fuga e penalidade de visibilidade." }) },
  { name: "Estremecer", parse: () => parsedSections("Estremecer", /Provoca\s+(?:\d+\s*\/\s*){3}(\d+)/i, { range: "2m", note: "Use uma única rolagem contra todos na área; aplique manualmente afastamento, queda e RM." }) },
  { name: "Espírito das Feras", parse: () => parsedSections("Espírito das Feras", /Causa\s+(\d+)\s+de\s+da[dn]o/i, { range: "20m", note: "Faça um ataque separado para cada alvo permitido pelo efeito." }) },
  { name: "Disparo de vácuo", parse: () => parsedSections("Disparo de vácuo", /dano base\s+(\d+)/i, { range: "50m" }) },
  { name: "Poção do hálito de dragão", parse: () => parsedSections("Poção do hálito de dragão", /Causa\s+(\d+)\s+pontos? de dano/i, { range: "4m", note: "Faça um ataque separado para cada alvo e administre manualmente a poção consumida." }) },
  { name: "Legião de almas", parse: () => parsedSections("Legião de almas", /(?:Provoca|Causa)\s+(?:até\s+)?(\d+)\s+pontos? de dano/i, { note: "Faça um ataque separado para cada alvo permitido pelo efeito." }) },
  { name: "Arma Flamejante", parse: () => parsedSections("Arma Flamejante", /causa\s+(?:\d+\s*\/\s*){3}(\d+)\s+pontos? de dano/i, { range: "Pessoal", note: "O dano não recebe Força; use o total da magia como coluna de ataque." }) },
  { name: "Garra de Dragão", parse: () => parsedSections("Garra de Dragão", /Causa\s+(?:\d+\s*\/\s*){3}(\d+)\s+pontos? de dano/i, { range: "5m", inherit: true, note: "O dano recebe Aura; movimento e quebra de objetos continuam manuais." }) },
  { name: "Lança Elemental", parse: () => parsedSections("Lança Elemental", /Causa\s+(?:\d+\s*\/\s*){3}(\d+)\s+pontos? de dano/i, { range: "50m", note: "Ajuste manualmente um nível de dano por vulnerabilidade ou resistência elemental." }) },
  { name: "Chuva Estelar", parse: () => parsedSections("Chuva Estelar", /dano base igual a\s+(\d+)/i, { range: "1km", note: "Atinge com resultado de 25% ou mais. Faça as rolagens por feixe e alvo conforme o tamanho ocupado." }) },
  { name: "Energia infernal", parse: () => parsedSections("Energia infernal", /Causa\s+(\d+)[,\s]+pontos? de dano/i, { range: "15m", note: "Além do resultado, aplique manualmente 25% do dano base diretamente na EF, como determina a descrição." }) }
];

const cloneCoreFamily = (familyName, sourceItems, targetCategory, parentFolder, color) => {
  const magic = magicByName(familyName);
  const parentRoute = parentFolder === attackFolder._id ? attackRoute : healingRoute;
  const familyRoute = `${parentRoute} / ${familyName.toLocaleUpperCase("pt-BR")}`;
  const familyFolder = folderDocument(familyRoute, parentFolder, color, targetCategory);
  folders.push(familyFolder);
  for (const source of sourceItems.filter((item) => key(item.flags?.tagmarSync?.parentMagicName) === key(familyName))) {
    items.push({
      ...source,
      _id: stableId(`tagmar-${targetCategory}`, source.name),
      folder: familyFolder._id,
      system: structuredClone(source.system),
      flags: { tagmarSync: {
        ...source.flags.tagmarSync, ...sourceFlags(magic), edition,
        category: targetCategory, origin: "official-current",
        parentMagicName: magic.name, parentMagicId: magic._id,
        reusedCoreAutomationId: source._id, legacyItemId: source.flags.tagmarSync.legacyItemId ?? null
      } }
    });
  }
};

for (const family of ["Onda Destrutiva", "Relâmpagos"]) {
  cloneCoreFamily(family, coreDamage, categoryDamage, attackFolder._id, "#5e0000");
}

for (const definition of damageDefinitions) {
  const magic = magicByName(definition.name);
  const effects = definition.parse();
  if (!effects.length) throw new Error(`Nenhum efeito de ataque reconhecido: ${definition.name}`);
  const familyRoute = `${attackRoute} / ${definition.name.toLocaleUpperCase("pt-BR")}`;
  const familyFolder = folderDocument(familyRoute, attackFolder._id, "#5e0000", categoryDamage);
  folders.push(familyFolder);
  for (const effect of effects) {
    const name = `${magic.name} ${effect.effect}`;
    items.push({
      _id: stableId("tagmar-terras-magia-dano", name), name, type: "Combate", img: magic.img,
      folder: familyFolder._id,
      system: {
        alcance: effect.range, descricao: `${name}: ${effect.detail}${effect.note ? `\n\nObservação de uso: ${effect.note}` : ""}`,
        favorito: false, custo: 0, nivel: effect.effect, forca_min: 0,
        bonus: "AUR", bonus_dano: "AUR", peso: 0, preco: "", bonus_magico: 0,
        def_l: 0, def_m: 0, def_p: 0, dano: zeroProgression(), dano_base: damageProgression(effect.maxDamage),
        penalidade: { p25: false, p50: false, p75: false, p100: false }, tipo: "", municao: 0
      },
      flags: { tagmarSync: {
        edition, category: categoryDamage, origin: "official-current", ...sourceFlags(magic),
        parentMagicName: magic.name, parentMagicId: magic._id,
        effect: effect.effect, maxDamage: effect.maxDamage, legacyItemId: null, needsReview: false
      } }
    });
  }
}

cloneCoreFamily("Curas Espirituais", coreHealing, categoryHealing, healingFolder._id, "#176337");
{
  const magic = magicByName("Avivar");
  const familyRoute = `${healingRoute} / AVIVAR`;
  const familyFolder = folderDocument(familyRoute, healingFolder._id, "#176337", categoryHealing);
  folders.push(familyFolder);
  const effects = sections("Avivar", plainText(magic.system.efeito)).map((section) => ({
    ...section, amount: Number(section.text.match(/Cura\s+(\d+)\s+pontos? de dano na EF/i)?.[1] ?? 0)
  })).filter((effect) => effect.amount > 0);
  if (!effects.length) throw new Error("Nenhuma cura reconhecida em Avivar");
  for (const effect of effects) {
    const name = `Avivar ${effect.effect}`;
    items.push({
      _id: stableId("tagmar-terras-magia-cura", name), name, type: "Combate", img: magic.img,
      folder: familyFolder._id,
      system: {
        alcance: "Toque", descricao: `${name}: ${effect.text}`, favorito: false, custo: 0,
        nivel: effect.effect, forca_min: 0, bonus: "AUR", bonus_dano: "AUR", peso: 0,
        preco: "", bonus_magico: 0, def_l: 0, def_m: 0, def_p: 0,
        dano: zeroProgression(), dano_base: zeroProgression(),
        penalidade: { p25: false, p50: false, p75: false, p100: false }, tipo: "", municao: 0
      },
      flags: { tagmarSync: {
        edition, category: categoryHealing, origin: "official-current", ...sourceFlags(magic),
        parentMagicName: magic.name, parentMagicId: magic._id, effect: effect.effect,
        healingMode: "fixed", healTarget: "EF", healAmount: effect.amount,
        legacyItemId: null, needsReview: false
      } }
    });
  }
}

if (new Set(folders.map((folder) => folder._id)).size !== folders.length) throw new Error("IDs de pastas de efeitos duplicados");
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs de efeitos duplicados");
const folderIds = new Set(folders.map((folder) => folder._id));
if (items.some((item) => !folderIds.has(item.folder))) throw new Error("Efeito sem pasta");
for (const item of items.filter((item) => item.flags.tagmarSync.category === categoryDamage)) {
  const maximum = item.flags.tagmarSync.maxDamage;
  for (const percentage of [25, 50, 75, 100]) {
    if (item.system.dano_base[`d${percentage}`] !== Math.ceil((maximum * percentage) / 100)) {
      throw new Error(`Arredondamento de dano inválido em ${item.name} (${percentage}%)`);
    }
  }
}

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-efeitos.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-efeitos-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  items: items.length, folders: folders.length,
  attacks: items.filter((item) => item.flags.tagmarSync.category === categoryDamage).length,
  healing: items.filter((item) => item.flags.tagmarSync.category === categoryHealing).length,
  families: Object.fromEntries([...new Set(items.map((item) => item.flags.tagmarSync.parentMagicName))]
    .map((name) => [name, items.filter((item) => item.flags.tagmarSync.parentMagicName === name).length]))
}, null, 2));
