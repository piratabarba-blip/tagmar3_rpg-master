import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheRoot = join(root, ".cache", "tagmar-sync");
const sourcePath = resolve(root, "packs", "criaturas-e-arquetipos-sem-tecnicas");
const destinationPath = resolve(root, "packs", "criaturas-t3er");
if (destinationPath !== resolve(root, "packs", "criaturas-t3er")) throw new Error("Destino do pack fora do caminho permitido");
const system = JSON.parse(await readFile(join(root, "system.json"), "utf8"));
const audit = JSON.parse(await readFile(join(cacheRoot, "creature-sync-audit.json"), "utf8"));
const allMatched = process.argv.includes("--all-matched");
const allOfficial = process.argv.includes("--all-official");
const mechanics = JSON.parse(await readFile(join(cacheRoot, "creatures", (allMatched || allOfficial) ? "mechanics.json" : "mechanics-pilot.json"), "utf8"));
const fullDetails = JSON.parse(await readFile(join(cacheRoot, "creatures", "full-details.json"), "utf8"));
const creatureImages = JSON.parse(await readFile(join(cacheRoot, "creature-images.json"), "utf8"));
const revised = JSON.parse(await readFile(join(cacheRoot, "snapshot-criando-fichas-t3er.json"), "utf8"));
const classic = JSON.parse(await readFile(join(cacheRoot, "snapshot-criando-fichas.json"), "utf8"));
const specialTechniqueRules = JSON.parse(await readFile(join(here, "creature-special-techniques.json"), "utf8"));
const editorialOverrides = JSON.parse(await readFile(join(here, "creature-editorial-overrides.json"), "utf8"));
const tokenOverrides = JSON.parse(await readFile(join(here, "creature-token-overrides.json"), "utf8"));
const tokenFamilyOverrides = JSON.parse(await readFile(join(here, "creature-token-family-overrides.json"), "utf8"));
const documentTemplates = JSON.parse(await readFile(join(root, "template.json"), "utf8"));

const pilotNames = ["Águia", "Cobra Venenosa", "Corvo", "Crocodilo", "Urso"];
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const stableId = (namespace, value) => createHash("sha256").update(`${namespace}:${String(value).normalize("NFC").toLocaleLowerCase("pt-BR")}`).digest("hex").slice(0, 16);
const localCreatureImagePath = (name, url, currentImage = null) => {
  const original = url ? creatureImages.images[url] ?? null : null;
  const editorial = tokenOverrides[name] ?? tokenFamilyOverrides[original] ?? null;
  if (editorial) return editorial;
  const normalizedCurrent = String(currentImage ?? "").replaceAll("\\", "/").toLocaleLowerCase("pt-BR");
  const hasClassicToken = normalizedCurrent.includes("/assets/tokens/")
    && !normalizedCurrent.includes("/assets/tokens/oficiais-sincronizados/");
  return hasClassicToken ? currentImage : original;
};
const mechanicsByName = new Map(mechanics.creatures.map((creature) => [creature.name, creature]));
const fullDetailsByName = new Map(fullDetails.creatures.map((creature) => [creature.name, creature]));
const excludedForMissingModels = new Set();
let unresolvedSkillsReport = {};
const officialRows = allOfficial
  ? [...audit.matched.filter((row) => row.classic.length === 1), ...audit.officialOnly]
  : allMatched
    ? audit.matched.filter((row) => row.classic.length === 1)
  : pilotNames.map((name) => {
      const row = audit.matched.find((entry) => entry.name === name);
      if (!row || row.classic.length !== 1) throw new Error(`${name}: correspondência clássica não é inequívoca`);
      return row;
    });
if (!officialRows.length) throw new Error("Nenhuma criatura com correspondência clássica inequívoca e mecânica oficial foi encontrada");
const matchedRows = officialRows.filter((row) => row.classic?.length === 1);
const byClassicId = new Map(matchedRows.map((row) => [row.classic[0].id, row]));
const actorIdMap = new Map(officialRows.map((row) => [row.key, stableId("tagmar-creature", row.key)]));
const templateByTypeAndName = new Map();
for (const item of revised.documents) {
  const mapKey = `${item.type}:${normalize(item.name)}`;
  if (!templateByTypeAndName.has(mapKey)) templateByTypeAndName.set(mapKey, item);
}
const canonicalSkillCatalog = revised.documents
  .filter((item) => item.type === "Habilidade")
  .filter((item, index, catalog) => catalog.findIndex((candidate) => normalize(candidate.name) === normalize(item.name)) === index)
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
if (canonicalSkillCatalog.length !== 42) {
  throw new Error(`Catálogo revisado de habilidades inesperado: ${canonicalSkillCatalog.length}, esperado 42`);
}
const techniqueAliases = new Map([
  [normalize("Inibir Ataque"), normalize("Inibir Ataques")]
]);
const template = (type, name) => {
  const normalizedName = normalize(name);
  const direct = templateByTypeAndName.get(`${type}:${normalizedName}`);
  if (direct || type !== "Tecnica_Combate") return direct;
  const alias = techniqueAliases.get(normalizedName);
  return alias ? templateByTypeAndName.get(`${type}:${alias}`) : undefined;
};
const specialTechniqueFolderId = "7BDhfDa5LnprQwDc";
const canonicalSpecialTechniques = new Map(
  classic.documents
    .filter((item) => item.type === "Tecnica_Combate" && item.folder === specialTechniqueFolderId)
    .map((item) => [normalize(item.name), item])
);
const specialRulesByName = new Map(
  Object.entries(specialTechniqueRules.techniques).map(([name, rule]) => [normalize(name), rule])
);
const officialMagicOverridesByCreature = new Map(
  editorialOverrides.overrides
    .filter((entry) => entry.type === "add-official-magics")
    .map((entry) => [entry.creature, entry])
);

const officialSupplementalMagicPages = new Map([
  [normalize("Fanatismo"), "1bdf07a8964359fe.html"],
  [normalize("Detecções"), "cd3209bdaa0b6b77.html"]
]);

const stripHtml = (value) => String(value ?? "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/\s+/g, " ").trim();

async function buildOfficialMagic(entry, creature, itemId) {
  const filename = officialSupplementalMagicPages.get(normalize(entry.name));
  if (!filename) throw new Error(`${creature.name}: página oficial da magia não configurada: ${entry.name}`);
  const html = await readFile(join(cacheRoot, "pages", filename), "utf8");
  const official = /Images\/Oficial\.png/i.test(html)
    && /material oriundo dos livros oficiais/i.test(html);
  if (!official) throw new Error(`${creature.name}/${entry.name}: a página sincronizada não possui selo oficial`);
  const field = (label) => stripHtml(html.match(new RegExp(`<b[^>]*>\\s*${label}\\s*<\\/b>\\s*:\\s*(.*?)(?:<br\\s*\\/?>)+`, "is"))?.[1]);
  const disclaimer = html.match(/<p[^>]*>\s*Esta página contém material oriundo dos livros oficiais.*?<\/p>/is);
  let effect = disclaimer ? html.slice((disclaimer.index ?? 0) + disclaimer[0].length) : html;
  const footer = effect.search(/<hr[^>]*>\s*<h3/i);
  if (footer >= 0) effect = effect.slice(0, footer);
  const alcance = field("Alcance");
  const duracao = field("Duração");
  const evocacao = field("Evocação");
  return {
    _id: itemId, name: entry.name, type: "Magia", img: "icons/svg/explosion.svg", folder: null,
    system: {
      alcance, descricao: "", favorito: false, custo: 0, nivel: entry.level, evocacao, duracao,
      efeito: `<strong>Alcance:</strong> ${alcance}<br/><strong>Duração:</strong> ${duracao}<br/><strong>Evocação:</strong> ${evocacao}<br/><br/>${effect}`,
      total: { valor: entry.level, valorKarma: 0 }
    },
    effects: [], sort: 0, ownership: { default: 0 },
    flags: { tagmarSync: {
      creatureEmbedded: true, mappingStatus: "oficial-livro-criaturas-e-livro-magias",
      creatureKey: creature.key, creatureName: creature.name,
      sourcePage: `Magia - ${entry.name}`, officialBadge: true,
      sourceConflict: entry.name === "Detecções" && entry.level === 10
        ? "Livro de Criaturas indica nível 10; descrição oficial publicada detalha efeitos até 8."
        : null
    } },
    _stats: itemStats({})
  };
}

if (allMatched || allOfficial) {
  const unresolvedTechniques = new Map();
  for (const row of officialRows) {
    const creature = mechanicsByName.get(row.name);
    for (const entry of creature?.tecnicas ?? []) {
      const key = normalize(entry.name);
      if (specialRulesByName.has(key) && canonicalSpecialTechniques.has(key)) continue;
      if (template("Tecnica_Combate", entry.name)) continue;
      if (!unresolvedTechniques.has(entry.name)) unresolvedTechniques.set(entry.name, []);
      unresolvedTechniques.get(entry.name).push(creature.name);
    }
  }
  if (unresolvedTechniques.size) {
    throw new Error(`Técnicas sem modelo revisado:\n${JSON.stringify(Object.fromEntries(unresolvedTechniques), null, 2)}`);
  }
}

const categoryColors = ["#4e9a51", "#8d6e63", "#5c6bc0", "#00897b", "#7e57c2", "#c62828", "#ad8b00", "#546e7a"];
const categories = [...new Map(officialRows.map((row) => [row.categoryCode, {
  code: row.categoryCode,
  label: row.categoryLabel || row.categoryCode
}])).values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
const folders = categories.map((category, index) => ({
  _id: stableId("tagmar-creatures-folder", `${category.code}:${category.label}`),
  name: category.label.toLocaleUpperCase("pt-BR"), type: "Actor", folder: null, sorting: "a", sort: index * 100000,
  color: categoryColors[index % categoryColors.length],
  flags: { tagmarSync: { categoryCode: category.code, categoryLabel: category.label } },
  _stats: { systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", createdTime: null, modifiedTime: null, lastModifiedBy: null }
}));
const folderIdByCategory = new Map(categories.map((category) => [category.code, stableId("tagmar-creatures-folder", `${category.code}:${category.label}`)]));

const attributeValue = (actor, attribute) => Number(actor.system?.atributos?.[attribute] ?? 0);
const boundedLevel = (actor, target, attribute) => Math.max(1, Math.min(Number(actor.system?.estagio ?? 1), Math.max(1, Number(target) - attributeValue(actor, attribute))));
const itemStats = (item) => ({ ...(item._stats ?? {}), systemId: "tagmar_rpg", systemVersion: system.version, coreVersion: "14.366", modifiedTime: null, lastModifiedBy: null });
const sourceFlags = (creature, entry, mappingStatus) => ({
  creatureKey: creature.key, creatureName: creature.name, sourceUrl: entry.sourceUrl ?? creature.sourceUrl,
  sourcePageName: entry.pageName ?? null, sourceHash: creature.sourceHash, officialValue: entry.value ?? null,
  officialDifficulty: entry.difficulty ?? null, mappingStatus,
  editorialCorrection: entry.editorialCorrection ?? null
});

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function mergeCurrentSchema(defaultValue, legacyValue) {
  if (Array.isArray(defaultValue)) return Array.isArray(legacyValue) ? structuredClone(legacyValue) : structuredClone(defaultValue);
  if (!isPlainObject(defaultValue)) return legacyValue === undefined ? structuredClone(defaultValue) : structuredClone(legacyValue);
  const merged = {};
  for (const [key, value] of Object.entries(defaultValue)) {
    merged[key] = mergeCurrentSchema(value, isPlainObject(legacyValue) ? legacyValue[key] : undefined);
  }
  return merged;
}

const npcTemplate = {
  ...structuredClone(documentTemplates.Actor.templates.base),
  ...Object.fromEntries(Object.entries(documentTemplates.Actor.NPC).filter(([key]) => key !== "templates"))
};

const itemSystemTemplate = (type) => ({
  ...structuredClone(documentTemplates.Item.templates.base),
  ...Object.fromEntries(Object.entries(documentTemplates.Item[type] ?? {}).filter(([key]) => key !== "templates"))
});

function buildCurrentNpc(legacyActor, row, actorId, folderId) {
  const systemData = mergeCurrentSchema(npcTemplate, legacyActor.system);
  const prototypeToken = structuredClone(legacyActor.prototypeToken);
  prototypeToken.actorLink = false;
  return {
    _id: actorId,
    name: row.name,
    type: "NPC",
    img: legacyActor.img,
    system: systemData,
    prototypeToken,
    items: [],
    effects: structuredClone(legacyActor.effects ?? []),
    folder: folderId,
    sort: Number(legacyActor.sort ?? 0),
    ownership: structuredClone(legacyActor.ownership ?? { default: 0 }),
    flags: {},
    _stats: itemStats({})
  };
}

function buildOfficialNpc(row, actorId, folderId, referenceActor) {
  const details = fullDetailsByName.get(row.name);
  const image = localCreatureImagePath(row.name, details?.imageUrl) ?? "icons/svg/mystery-man.svg";
  const prototypeToken = structuredClone(referenceActor?.prototypeToken ?? {
    name: row.name, displayName: 20, actorLink: false, appendNumber: false, prependAdjective: false,
    texture: { src: image, anchorX: 0.5, anchorY: 0.5, offsetX: 0, offsetY: 0, fit: "contain", scaleX: 1, scaleY: 1, rotation: 0, tint: "#ffffff", alphaThreshold: 0.75 },
    width: 1, height: 1, lockRotation: false, rotation: 0, alpha: 1, disposition: -1,
    bar1: { attribute: "ef_npc" }, bar2: { attribute: "eh_npc" }, randomImg: false
  });
  prototypeToken.name = row.name;
  prototypeToken.actorLink = false;
  prototypeToken.texture = { ...(prototypeToken.texture ?? {}), src: image };
  prototypeToken.randomImg = false;
  return {
    _id: actorId, name: row.name, type: "NPC", img: image,
    system: structuredClone(npcTemplate), prototypeToken, items: [], effects: [], folder: folderId, sort: 0,
    ownership: { default: 0 }, flags: {}, _stats: itemStats({})
  };
}

function synchronizeActorDetails(actor, row) {
  const details = fullDetailsByName.get(row.name);
  if (!details || details.combat?.error) return;
  const combat = details.combat;
  const image = localCreatureImagePath(row.name, details.imageUrl, actor.img);
  actor.name = row.name;
  actor.img = image ?? actor.img;
  if (image && actor.prototypeToken?.texture) {
    actor.prototypeToken.texture.src = image;
    actor.prototypeToken.randomImg = false;
  }
  const biography = details.biography || actor.system.descricao || "";
  actor.system.descricao = details.imageUrl && image ? biography.replaceAll(details.imageUrl, image) : biography;
  actor.system.estagio = combat.stage;
  for (const code of ["INT", "AUR", "CAR", "FOR", "FIS", "AGI", "PER"]) {
    const value = Number(details.attributes?.values?.[code.toLowerCase()] ?? actor.system.atributos?.[code] ?? 0);
    actor.system.atributos[code] = value;
    actor.system.valor_teste[code] = value * 4;
  }
  actor.system.peso = Number(details.dimensions?.weight ?? actor.system.peso ?? 0);
  actor.system.altura = details.dimensions?.heightRaw || actor.system.altura || "";
  actor.system.rf = combat.rf;
  actor.system.rm = combat.rm;
  actor.system.moral = combat.moral;
  actor.system.vb = combat.vb;
  actor.system.v_base = combat.vb;
  actor.system.defesa = { categoria: combat.defense.category, valor: combat.defense.value };
  actor.system.d_ativa = { categoria: combat.defense.category, valor: combat.defense.value };
  actor.system.d_passiva = { categoria: combat.defense.category, valor: 0 };
  for (const field of ["ef", "ef_npc"]) actor.system[field] = { value: combat.ef, min: 0, max: combat.ef };
  for (const field of ["eh", "eh_npc"]) actor.system[field] = { value: combat.eh, min: 0, max: combat.eh };
  for (const field of ["karma", "karma_npc"]) actor.system[field] = { value: combat.karma, min: 0, max: combat.karma };
}

function extendedDamage(attack) {
  const damage = { d25: attack.damage.d25, d50: attack.damage.d50, d75: attack.damage.d75, d100: attack.damage.d100 };
  const step = Math.max(0, Math.ceil(attack.damage.d100 - attack.damage.d75));
  for (let percentage = 125; percentage <= 300; percentage += 25) {
    damage[`d${percentage}`] = Math.ceil(damage[`d${percentage - 25}`] + step);
  }
  return damage;
}

function synchronizeAttack(templateItem, attack, actor, creature, itemId) {
  const value = templateItem ? structuredClone(templateItem) : {
    _id: itemId, name: attack.name, type: "Combate", img: "icons/skills/melee/unarmed-punch-fist.webp",
    system: itemSystemTemplate("Combate"), effects: [], folder: null, sort: 0, ownership: { default: 0 }, flags: {}
  };
  const stage = Number(actor.system.estagio ?? 1);
  const damage = extendedDamage(attack);
  const bonusAttribute = String(value.system?.bonus_dano ?? "").toUpperCase();
  const attributeBonus = Number(actor.system.atributos?.[bonusAttribute] ?? 0);
  value._id = itemId;
  value.name = attack.name;
  value.folder = null;
  value.system.nivel = stage;
  value.system.def_l = attack.l - stage;
  value.system.def_m = attack.m - stage;
  value.system.def_p = attack.p - stage;
  value.system.dano = damage;
  value.system.dano_base = Object.fromEntries(Object.entries(damage).map(([key, amount]) => [key, Math.max(0, Math.ceil(amount - attributeBonus))]));
  value.flags = { ...(value.flags ?? {}), tagmarSync: { creatureEmbedded: true, mappingStatus: "oficial-tabela-combate", creatureKey: creature.key, creatureName: creature.name, sourceUrl: creature.sourceUrl, sourceHash: creature.sourceHash, rawOfficialValues: attack.raw } };
  value._stats = itemStats(value);
  return value;
}

function buildNaturalDefense(actor, creature, itemId) {
  const defense = creature.combat.defense;
  return {
    _id: itemId, name: `Defesa Natural ${defense.category}`, type: "Defesa", img: "icons/equipment/shield/buckler-wooden-boss-steel.webp",
    system: { ...itemSystemTemplate("Defesa"), defesa_base: { tipo: defense.category, valor: defense.value }, absorcao: 0, equipado: true },
    effects: [], folder: null, sort: 0, ownership: { default: 0 },
    flags: { tagmarSync: { creatureEmbedded: true, mappingStatus: "oficial-defesa-base", creatureKey: creature.key, creatureName: creature.name, sourceUrl: creature.sourceUrl, sourceHash: creature.sourceHash, rawOfficialValue: defense.raw } },
    _stats: itemStats({})
  };
}

function buildSkill(templateItem, entry, actor, creature, itemId) {
  if (!templateItem) throw new Error(`${creature.name}: habilidade revisada não encontrada: ${entry.name}`);
  const value = structuredClone(templateItem);
  const attribute = value.system?.ajuste?.atributo ?? "";
  const level = boundedLevel(actor, entry.value, attribute);
  const actorAttribute = attributeValue(actor, attribute);
  value._id = itemId;
  value.folder = null;
  value.system.custo = 0;
  value.system.nivel = level;
  value.system.ajuste = { atributo: attribute, valor: actorAttribute };
  value.system.penalidade = 0;
  value.system.bonus = Number(entry.value) - actorAttribute - level;
  value.system.total = Number(entry.value);
  value.flags = { ...(value.flags ?? {}), tagmarSync: { ...(value.flags?.tagmarSync ?? {}), ...sourceFlags(creature, entry, "oficial-exata"), creatureEmbedded: true } };
  value._stats = itemStats(value);
  return value;
}

function buildUntrainedSkill(templateItem, actor, creature, itemId) {
  const value = structuredClone(templateItem);
  const attribute = value.system?.ajuste?.atributo ?? "";
  value._id = itemId;
  value.folder = null;
  value.system.nivel = 0;
  value.system.ajuste = { atributo: attribute, valor: attributeValue(actor, attribute) };
  value.system.penalidade = 0;
  value.system.bonus = 0;
  value.system.total = -7;
  value.flags = {
    ...(value.flags ?? {}),
    tagmarSync: {
      ...(value.flags?.tagmarSync ?? {}),
      creatureEmbedded: true,
      creatureKey: creature.key,
      creatureName: creature.name,
      mappingStatus: "repertorio-nao-treinado",
      untrainedRule: "nivel-0-total-menos-7"
    }
  };
  value._stats = itemStats(value);
  return value;
}

function buildTechnique(templateItem, entry, actor, creature, itemId, mappingStatus = "oficial-exata") {
  if (!templateItem) throw new Error(`${creature.name}: técnica revisada não encontrada: ${entry.name}`);
  const value = structuredClone(templateItem);
  const attribute = value.system?.ajuste?.atributo ?? "";
  const level = boundedLevel(actor, entry.value, attribute);
  const actorAttribute = attributeValue(actor, attribute);
  value._id = itemId;
  value.name = entry.name;
  value.folder = null;
  value.system.custo = 0;
  value.system.nivel = level;
  value.system.ajuste = { atributo: attribute, valor: 0 };
  value.system.bonus = Number(entry.value) - actorAttribute - level;
  value.system.fa = Number(entry.value);
  value.flags = { ...(value.flags ?? {}), tagmarSync: { ...(value.flags?.tagmarSync ?? {}), ...sourceFlags(creature, entry, mappingStatus), creatureEmbedded: true } };
  value._stats = itemStats(value);
  return value;
}

function informationalTechnique(entry, actor, creature, itemId, description, options = {}) {
  const target = Number(entry.value ?? 1);
  const attribute = options.attribute ?? "";
  const hasTotal = options.hasTotal ?? entry.value != null;
  const level = hasTotal ? boundedLevel(actor, target, attribute) : 0;
  const actorAttribute = attributeValue(actor, attribute);
  return {
    _id: itemId, name: entry.name, type: "Tecnica_Combate",
    img: options.img ?? "icons/skills/melee/unarmed-punch-fist.webp", folder: null,
    system: {
      custo: 0, nivel: level, descricao: description, ajuste: { atributo: attribute, valor: 0 },
      fa: hasTotal ? target : 0, mecanica: options.mechanic ?? 1,
      duracao: options.duration ?? { valor: 1, tipo: "Ataque(s)" }, teste: options.test ?? "Não",
      restricao: options.restriction ?? "Consulte a descrição oficial da criatura.",
      pre_requisito: { valor: "Não", tecnica: "" }, complemento: "Não",
      bonus: hasTotal ? target - actorAttribute - level : 0
    },
    flags: { tagmarSync: { ...sourceFlags(creature, entry, options.mappingStatus ?? "criatura-especifica"), creatureEmbedded: true, needsMechanicalReview: Boolean(options.needsMechanicalReview), officialGroup: options.group ?? null, ruleSource: options.ruleSource ?? null } },
    effects: [], sort: 0, ownership: { default: 0 }, _stats: itemStats({})
  };
}

function specialTechnique(entry, actor, creature, itemId) {
  const lookup = normalize(entry.name);
  const rule = specialRulesByName.get(lookup);
  const canonical = canonicalSpecialTechniques.get(lookup);
  if (!rule || !canonical) return null;

  const value = structuredClone(canonical);
  const hasTotal = Boolean(rule.hasTotal && entry.value != null);
  const attribute = value.system?.ajuste?.atributo ?? rule.attribute ?? "";
  const target = hasTotal ? Number(entry.value) : 0;
  const level = hasTotal ? boundedLevel(actor, target, attribute) : 0;
  const actorAttribute = attributeValue(actor, attribute);
  value._id = itemId;
  value.name = entry.name;
  value.folder = null;
  value.system.custo = 0;
  value.system.nivel = level;
  value.system.ajuste = { atributo: attribute, valor: 0 };
  value.system.fa = target;
  value.system.bonus = hasTotal ? target - actorAttribute - level : 0;
  if (entry.name === "Prender" && entry.difficulty) {
    value.system.restricao = `Dificuldade oficial para Escapar: ${entry.difficulty}.`;
  }
  if (normalize(entry.name) === normalize("Ataques Múltiplos") && entry.value != null) {
    value.system.restricao = `Quantidade oficial: ${entry.value} ataques por rodada.`;
  }
  value.flags = {
    ...(value.flags ?? {}),
    tagmarSync: {
      ...(value.flags?.tagmarSync ?? {}),
      ...sourceFlags(creature, entry, "oficial-livro-criaturas"),
      creatureEmbedded: true,
      canonicalClassicFolder: "11 - CRIANDO CRIATURAS / TECNICAS ESPECIAIS",
      canonicalClassicItemId: canonical._id,
      officialGroup: rule.group,
      ruleSource: specialTechniqueRules.source
    }
  };
  value._stats = itemStats(value);
  return value;
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "tagmar-creatures-pilot-"));
const readableSource = join(temporaryRoot, "source");
const stagingPath = join(temporaryRoot, "criaturas-t3er");
await cp(sourcePath, readableSource, { recursive: true });
await writeFile(join(readableSource, "CURRENT"), `${(await readFile(join(readableSource, "CURRENT"), "utf8")).trim()}\n`, "utf8");
const sourceDb = new ClassicLevel(readableSource, { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
const destinationDb = new ClassicLevel(stagingPath, { keyEncoding: "utf8", valueEncoding: "json" });
const sourceActors = new Map();
const sourceItems = new Map(matchedRows.map((row) => [row.classic[0].id, []]));

try {
  await sourceDb.open();
  for await (const [key, value] of sourceDb.iterator()) {
    const actorMatch = key.match(/^!actors!([^.]+)$/);
    if (actorMatch && byClassicId.has(actorMatch[1])) sourceActors.set(actorMatch[1], structuredClone(value));
    const itemMatch = key.match(/^!actors\.items!([^.]+)\.(.+)$/);
    if (itemMatch && byClassicId.has(itemMatch[1])) sourceItems.get(itemMatch[1]).push({ id: itemMatch[2], value: structuredClone(value) });
  }
} finally {
  await sourceDb.close();
}

if (allMatched || allOfficial) {
  const classicSkillNames = new Set(
    [...sourceItems.values()].flat()
      .filter((candidate) => candidate.value.type === "Habilidade")
      .map((candidate) => normalize(candidate.value.name))
  );
  const unresolvedSkills = new Map();
  for (const row of officialRows) {
    const creature = mechanicsByName.get(row.name);
    for (const entry of creature?.habilidades ?? []) {
      if (template("Habilidade", entry.name) || classicSkillNames.has(normalize(entry.name))) continue;
      if (!unresolvedSkills.has(entry.name)) unresolvedSkills.set(entry.name, []);
      unresolvedSkills.get(entry.name).push(creature.name);
    }
  }
  if (unresolvedSkills.size) {
    unresolvedSkillsReport = Object.fromEntries(unresolvedSkills);
    for (const creatureNames of unresolvedSkills.values()) {
      for (const creatureName of creatureNames) excludedForMissingModels.add(creatureName);
    }
  }
}

const operations = folders.map((folder) => ({ type: "put", key: `!folders!${folder._id}`, value: folder }));
const counts = [];
const referenceActor = sourceActors.values().next().value;
for (const row of officialRows) {
  const classicId = row.classic?.[0]?.id ?? null;
  const actorId = actorIdMap.get(row.key);
  const legacyActor = classicId ? sourceActors.get(classicId) : null;
  const creature = mechanicsByName.get(row.name);
  const completeDetails = fullDetailsByName.get(row.name);
  if (classicId && !legacyActor) throw new Error(`${row.name}: dados do ator clássico ausentes`);
  if (!completeDetails) throw new Error(`${row.name}: detalhes oficiais completos ausentes`);
  const actor = legacyActor
    ? buildCurrentNpc(legacyActor, row, actorId, folderIdByCategory.get(row.categoryCode))
    : buildOfficialNpc(row, actorId, folderIdByCategory.get(row.categoryCode), referenceActor);
  synchronizeActorDetails(actor, row);
  actor.flags = { ...(actor.flags ?? {}), tagmarSync: { syncKey: row.key, normalizedName: row.normalizedName, categoryCode: row.categoryCode, categoryLabel: row.categoryLabel, sourceUrl: row.url, indexHash: row.indexHash, detailHash: completeDetails.sourceHash, classicActorId: classicId, mechanicsPolicy: legacyActor ? "classic-reconciled-with-complete-official-sheet" : "official-complete-sheet-created-without-classic-source", officialImageRemote: Boolean(completeDetails.imageUrl), rawOfficialCombat: completeDetails.combat.raw, parsedSourceVariant: completeDetails.combat.sourceVariant } };
  actor._stats = itemStats(actor);
  const officialSkills = new Map((creature?.habilidades ?? [])
    .filter((entry) => !(unresolvedSkillsReport[entry.name] ?? []).includes(row.name))
    .map((entry) => [normalize(entry.name), entry]));
  const usedSkills = new Set();
  const embeddedSkillNames = new Set();
  let preserved = 0;
  let synchronizedSkills = 0;
  const embeddedSourceItems = classicId ? sourceItems.get(classicId) : [];
  const officialAttacks = new Map((completeDetails.combat.attacks ?? []).map((entry) => [normalize(entry.name), entry]));
  const usedAttacks = new Set();
  let synchronizedAttacks = 0;
  let defenseItems = 0;
  for (const sourceItem of embeddedSourceItems) {
    if (sourceItem.value.type === "Habilidade") embeddedSkillNames.add(normalize(sourceItem.value.name));
    const skillEntry = sourceItem.value.type === "Habilidade" ? officialSkills.get(normalize(sourceItem.value.name)) : null;
    const attackEntry = sourceItem.value.type === "Combate" ? officialAttacks.get(normalize(sourceItem.value.name)) : null;
    if (attackEntry && !usedAttacks.has(normalize(attackEntry.name))) {
      const value = synchronizeAttack(sourceItem.value, attackEntry, actor, completeDetails, sourceItem.id);
      operations.push({ type: "put", key: `!actors.items!${actorId}.${sourceItem.id}`, value });
      actor.items.push(sourceItem.id);
      usedAttacks.add(normalize(attackEntry.name));
      synchronizedAttacks += 1;
    } else if (attackEntry) {
      // A tabela oficial é a fonte canônica. Duplicatas homônimas herdadas do
      // compêndio clássico não podem gerar dois ataques idênticos na nova ficha.
      continue;
    } else if (skillEntry) {
      const value = buildSkill(template("Habilidade", skillEntry.name) ?? sourceItem.value, skillEntry, actor, creature, sourceItem.id);
      operations.push({ type: "put", key: `!actors.items!${actorId}.${sourceItem.id}`, value });
      actor.items.push(sourceItem.id);
      usedSkills.add(normalize(skillEntry.name));
      embeddedSkillNames.add(normalize(skillEntry.name));
      synchronizedSkills += 1;
    } else {
      operations.push({ type: "put", key: `!actors.items!${actorId}.${sourceItem.id}`, value: sourceItem.value });
      actor.items.push(sourceItem.id);
      preserved += 1;
      if (sourceItem.value.type === "Defesa") defenseItems += 1;
    }
  }
  for (const attack of completeDetails.combat.attacks ?? []) {
    if (usedAttacks.has(normalize(attack.name))) continue;
    const itemId = stableId("tagmar-creature-attack", `${completeDetails.key}:${attack.name}`);
    const attackTemplate = template("Combate", attack.name);
    const value = synchronizeAttack(attackTemplate, attack, actor, completeDetails, itemId);
    operations.push({ type: "put", key: `!actors.items!${actorId}.${itemId}`, value });
    actor.items.push(itemId);
    synchronizedAttacks += 1;
  }
  if (!defenseItems && !legacyActor) {
    const itemId = stableId("tagmar-creature-defense", `${completeDetails.key}:${completeDetails.combat.defense.raw}`);
    const value = buildNaturalDefense(actor, completeDetails, itemId);
    operations.push({ type: "put", key: `!actors.items!${actorId}.${itemId}`, value });
    actor.items.push(itemId);
    defenseItems += 1;
  }
  for (const entry of creature?.habilidades ?? []) {
    if ((unresolvedSkillsReport[entry.name] ?? []).includes(row.name)) continue;
    if (usedSkills.has(normalize(entry.name))) continue;
    const itemId = stableId("tagmar-creature-skill", `${creature.key}:${entry.name}`);
    const classicTemplate = [...sourceItems.values()].flat().find((candidate) => candidate.value.type === "Habilidade" && normalize(candidate.value.name) === normalize(entry.name))?.value;
    const value = buildSkill(template("Habilidade", entry.name) ?? classicTemplate, entry, actor, creature, itemId);
    operations.push({ type: "put", key: `!actors.items!${actorId}.${itemId}`, value });
    actor.items.push(itemId);
    embeddedSkillNames.add(normalize(entry.name));
    synchronizedSkills += 1;
  }
  let untrainedSkills = 0;
  for (const skillTemplate of canonicalSkillCatalog) {
    const skillName = normalize(skillTemplate.name);
    if (embeddedSkillNames.has(skillName)) continue;
    const itemId = stableId("tagmar-creature-untrained-skill", `${row.key}:${skillName}`);
    const value = buildUntrainedSkill(skillTemplate, actor, completeDetails, itemId);
    operations.push({ type: "put", key: `!actors.items!${actorId}.${itemId}`, value });
    actor.items.push(itemId);
    embeddedSkillNames.add(skillName);
    untrainedSkills += 1;
  }
  let addedTechniques = 0;
  for (const entry of creature?.tecnicas ?? []) {
    const itemId = stableId("tagmar-creature-technique", `${creature.key}:${entry.name}`);
    const value = specialTechnique(entry, actor, creature, itemId)
      ?? buildTechnique(template("Tecnica_Combate", entry.name), entry, actor, creature, itemId);
    operations.push({ type: "put", key: `!actors.items!${actorId}.${itemId}`, value });
    actor.items.push(itemId);
    addedTechniques += 1;
  }
  let addedOfficialMagics = 0;
  const magicOverride = officialMagicOverridesByCreature.get(row.name);
  for (const entry of magicOverride?.magics ?? []) {
    const itemId = stableId("tagmar-creature-official-magic", `${row.key}:${entry.name}:${entry.level}`);
    const value = await buildOfficialMagic(entry, completeDetails, itemId);
    operations.push({ type: "put", key: `!actors.items!${actorId}.${itemId}`, value });
    actor.items.push(itemId);
    addedOfficialMagics += 1;
  }
  operations.push({ type: "put", key: `!actors!${actorId}`, value: actor });
  counts.push({ name: row.name, status: creature ? (excludedForMissingModels.has(row.name) ? "partial-missing-model" : "synchronized-complete") : "complete-stats-attacks-biography-mechanics-section-pending", source: legacyActor ? "classic+official" : "official-only", preserved, officialAttacks: synchronizedAttacks, defenseItems, officialSkills: synchronizedSkills, untrainedSkills, skillCatalogSize: canonicalSkillCatalog.length, officialTechniques: addedTechniques, officialMagics: addedOfficialMagics, total: actor.items.length });
}

try {
  await destinationDb.open();
  await destinationDb.batch(operations);
  await destinationDb.compactRange("\x00", "\xff");
} finally {
  await destinationDb.close();
}
try {
  const files = await readdir(stagingPath);
  if (!files.includes("CURRENT") || !files.some((name) => name.endsWith(".ldb") || name.endsWith(".log"))) throw new Error("Banco temporário incompleto");
  await rm(destinationPath, { recursive: true, force: true });
  await cp(stagingPath, destinationPath, { recursive: true });
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

const buildReport = {
  mode: allOfficial ? "all-official" : allMatched ? "all-matched" : "pilot",
  pack: "criaturas-t3er",
  actors: counts.length,
  folders: folders.length,
  excludedWithoutParsedMechanics: (allMatched || allOfficial) ? officialRows.filter((row) => !mechanicsByName.has(row.name)).map((row) => row.name) : [],
  excludedForMissingModels: [...excludedForMissingModels],
  unresolvedSkills: unresolvedSkillsReport,
  counts,
  embeddedItems: counts.reduce((sum, entry) => sum + entry.total, 0),
  officialOnlyActorsCreated: counts.filter((entry) => entry.source === "official-only").length,
  officialAttacks: counts.reduce((sum, entry) => sum + entry.officialAttacks, 0),
  untrainedSkillsAdded: counts.reduce((sum, entry) => sum + entry.untrainedSkills, 0),
  skillCatalogSize: canonicalSkillCatalog.length
};
const buildReportPath = join(root, ".cache", "tagmar-sync", "creatures", `${buildReport.mode}-pack-build.json`);
await writeFile(buildReportPath, `${JSON.stringify(buildReport, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output: buildReportPath,
  mode: buildReport.mode,
  pack: buildReport.pack,
  actors: buildReport.actors,
  folders: buildReport.folders,
  embeddedItems: buildReport.embeddedItems,
  officialOnlyActorsCreated: buildReport.officialOnlyActorsCreated,
  officialAttacks: buildReport.officialAttacks,
  untrainedSkillsAdded: buildReport.untrainedSkillsAdded,
  skillCatalogSize: buildReport.skillCatalogSize,
  pendingMechanicsSections: buildReport.excludedWithoutParsedMechanics.length,
  unresolvedSkills: buildReport.unresolvedSkills
}, null, 2));
