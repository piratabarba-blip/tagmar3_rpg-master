import {
  DIVINE_ORDERS, HISTORICAL_FRAMES, INFERNAL_CURSES, INFERNAL_PATRONS, INFERNAL_SOURCE_URL, WILDERNESS_REGIONS
} from "./treasureLore.js";

const SYSTEM_ID = import.meta.url.match(/\/systems\/([^/]+)\//)?.[1] || "tagmar_rpg";
const ROOT_FOLDER_NAME = "Tesouros em Tagmar";
const ANCESTRAL_MAGIC_LIMITS = [11, 13, 15, 17, 19, 20, 23, 25, 27, 30];
const PROPERTY_EXISTENCE_CHANCES = [15, 22, 30, 39, 49, 60, 71, 81, 90, 97];
const TREASURE_SOCKET = `system.${SYSTEM_ID}`;
const CURSE_SOURCE_URL = "https://tagmar.com.br/wiki/Default.aspx?PageName=Magia+-+Maldi%C3%A7%C3%B5es";
const PHYSICAL_OBJECT_WORDS = /^(amuleto|anel|arma|armadura|bracelete|brinco|broche|cajado|cetro|colar|coroa|escudo|espada|elmo|joia|medalh[aã]o|pingente|po[cç][aã]o|tiara)\b/i;
const CURSE_SEPARATION_TIMES = [
  { minimumLevel: 1, values: ["1 hora", "3 horas", "6 horas"] },
  { minimumLevel: 2, values: ["6 horas", "até o próximo amanhecer", "1 dia"] },
  { minimumLevel: 4, values: ["1 dia", "3 dias", "uma semana"] },
  { minimumLevel: 6, values: ["3 dias", "uma semana", "uma lua completa"] },
  { minimumLevel: 8, values: ["uma semana", "uma lua completa", "um ciclo lunar"] }
];
const LORE_EPITHETS = {
  blator: "Dádiva de Blator",
  palier: "Segredo de Palier",
  parom: "Obra de Parom",
  crezir: "Fúria de Crezir",
  crisagom: "Juramento de Crisagom",
  cruine: "Sentença de Cruine",
  ganis: "Relíquia de Ganis",
  maira: "Legado de Maira",
  plandis: "Capricho de Plandis",
  selimom: "Voto de Selimom",
  sevides: "Herança de Sevides"
};
const TREASURE_PROPERTIES = [
  { key: "bonus", label: "Bônus mágico", compatibility: "Armas e proteções" },
  { key: "magia", label: "Magias", compatibility: "Todos os objetos" },
  { key: "focus", label: "Focus", compatibility: "Exceto poções, óleos, elixires e unguentos" },
  { key: "resistencia", label: "Resistência à Magia (RM)", compatibility: "Armas, proteções, joias, cetros e cajados" },
  { key: "absorcao", label: "Absorção", compatibility: "Proteções e joias" }
];

function normalize(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function normalizeWords(value = "") {
  return normalize(value).replace(/&[a-z]+;/gi, " ").replace(/[^a-z0-9]+/g, " ").trim();
}

function magicTraditions(route = "") {
  const value = normalize(route);
  const traditions = [];
  if (/(^|\/)\s*basica\s*($|\/)/.test(value)) traditions.push("basic");
  if (/(^|\/)\s*mago\s*($|\/)/.test(value)) traditions.push("mage");
  if (/(^|\/)\s*rastreador\s*($|\/)/.test(value)) traditions.push("ranger");
  if (/(^|\/)\s*bardos?\s*($|\/)/.test(value)) traditions.push("bard");
  if (/(^|\/)\s*sacerdote\s*($|\/)/.test(value)) traditions.push("priest");
  return traditions;
}

function magicRepertoire(category = "", origin = "", route = "") {
  const value = normalize(`${category} ${origin} ${route}`);
  if (value.includes("ancestral")) return "ancestral";
  if (value.includes("perdida") || /(^|\s)lost($|\s)/.test(value)) return "lost";
  return "core";
}

function extractMagicLevels(name, effectHtml = "", ancestral = false) {
  const levels = new Set();
  const wanted = normalizeWords(name);
  const listStart = String(effectHtml).search(/<(?:ul|ol)\b/i);
  const tagPattern = /<(?:b|strong)>\s*([^<]+?)\s*<\/(?:b|strong)>/gi;
  for (const match of String(effectHtml).matchAll(tagPattern)) {
    const label = normalizeWords(match[1]);
    const number = label.match(/(?:^|\s)(\d{1,2})$/);
    if (!number) continue;
    const insideEffectList = listStart >= 0 && match.index >= listStart;
    if (insideEffectList || label.includes(wanted)) levels.add(Number(number[1]));
  }
  if (levels.size) return [...levels].filter((level) => level >= 1 && level <= 30).sort((a, b) => a - b);
  // Alguns encantos de nível livre não enumeram efeitos na descrição.
  return ancestral ? [...ANCESTRAL_MAGIC_LIMITS] : Array.from({ length: 10 }, (_value, index) => index + 1);
}

function magicLevelLimit(treasureType, ancestral = false) {
  const type = Math.max(1, Math.min(10, Number(treasureType) || 1));
  return ancestral ? ANCESTRAL_MAGIC_LIMITS[type - 1] : type;
}

function availableMagicLevels(magic, treasureType) {
  const limit = magicLevelLimit(treasureType, magic.ancestral);
  return (magic.levels || []).filter((level) => level <= limit);
}

function propertyExistenceChance(treasureType) {
  const type = Math.max(1, Math.min(10, Number(treasureType) || 1));
  return PROPERTY_EXISTENCE_CHANCES[type - 1];
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function stripHtml(value = "") {
  const div = document.createElement("div");
  div.innerHTML = String(value);
  return div.textContent?.replace(/\s+/g, " ").trim() || "";
}

function stripMundaneMaintenance(value = "") {
  const container = document.createElement("div");
  container.innerHTML = String(value);
  for (const element of container.querySelectorAll("p, li, div")) {
    const text = normalizeWords(element.textContent || "");
    if (/^manutencao teste de trabalhos manuais?$/.test(text)) element.remove();
  }
  // Compatibilidade com descrições antigas nas quais a manutenção era apenas
  // uma linha separada por <br>, sem um parágrafo próprio.
  return container.innerHTML.replace(
    /(?:<br\s*\/?>)?\s*(?:<(?:b|strong)>\s*)?manuten[cç][aã]o\s*:\s*(?:<\/(?:b|strong)>\s*)?teste de trabalhos manuais?\.?\s*(?=<br\s*\/?>|$)/gi,
    ""
  );
}

function isTruthy(value) {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function publicPowerSummary(entry, revealSecrets = false) {
  const powers = [];
  if (entry.bonus) powers.push(signed(entry.bonus));
  if (entry.focus) powers.push(`Focus +${entry.focus}`);
  if (entry.resistance) powers.push(`RM +${entry.resistance}`);
  if (entry.absorption) powers.push(`Absorção +${entry.absorption}`);
  for (const magic of entry.magics || []) powers.push(`${magic.name} ${magic.effect} (${magic.usageLabel})`);
  if (powers.length) return powers.join(", ");
  if (entry.curseMode === "only" && entry.curse && !(revealSecrets || entry.revealCurse)) return "sem poder aparente";
  return entry.powerSummary || "sem poder definido";
}

function chatMagicLink(magic, linked = true) {
  const label = `${magic.name} ${magic.effect}`;
  return linked && magic.uuid ? `@UUID[${magic.uuid}]{${label}}` : escapeHtml(label);
}

function randomOf(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function parseObjectPool(values) {
  const allowedKinds = new Set(["weapon", "defense", "ring", "staff", "potion"]);
  const entries = Array.isArray(values) ? values : values ? [values] : [];
  const unique = new Map();
  for (const raw of entries) {
    const separator = String(raw).indexOf("|||");
    if (separator < 1) continue;
    const kind = String(raw).slice(0, separator);
    const value = String(raw).slice(separator + 3).trim();
    if (!allowedKinds.has(kind) || !value) continue;
    unique.set(`${kind}|||${normalize(value)}`, { kind, value });
  }
  return [...unique.values()];
}

function weightedRandom(entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (total <= 0) return entries[0];
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= Math.max(0, Number(entry.weight) || 0);
    if (roll < 0) return entry;
  }
  return entries.at(-1);
}

function leastUsedRandom(values, usage, keyOf = (value) => value) {
  if (!values.length) return undefined;
  const minimum = Math.min(...values.map((value) => usage.get(keyOf(value)) || 0));
  const candidates = values.filter((value) => (usage.get(keyOf(value)) || 0) === minimum);
  const selected = randomOf(candidates);
  const key = keyOf(selected);
  usage.set(key, (usage.get(key) || 0) + 1);
  return selected;
}

function consumableCreator(curse = null) {
  const selected = weightedRandom([
    { key: "alchemist", weight: 65, label: "alquimista" },
    { key: "sorcerer", weight: 20, label: "feiticeiro" },
    { key: "collaboration", weight: 10, label: "colaboração arcana" },
    { key: "extraordinary", weight: 5, label: "origem extraordinária" }
  ]);
  if (selected.key !== "extraordinary") return selected;
  return curse
    ? { ...selected, label: "fórmula de procedência obscura" }
    : { ...selected, label: "tradição sacerdotal ou ancestral" };
}

function deityFromOrigin(origin = "") {
  const normalizedOrigin = normalize(origin);
  return Object.keys(DIVINE_ORDERS).find((deity) => normalizedOrigin.includes(normalize(deity))) || "";
}

function infernalPatronFor(effect = "", origin = "") {
  const facadeDeity = deityFromOrigin(origin);
  let candidates = facadeDeity
    ? INFERNAL_PATRONS.filter((patron) => patron.opposedDeities.includes(facadeDeity))
    : [];
  if (!candidates.length) {
    const normalizedEffect = normalize(effect);
    const scored = INFERNAL_PATRONS.map((patron) => ({
      patron,
      score: patron.affinity.filter((term) => normalizedEffect.includes(normalize(term))).length
    }));
    const maximumScore = Math.max(...scored.map((entry) => entry.score));
    candidates = scored.filter((entry) => entry.score === maximumScore).map((entry) => entry.patron);
  }
  const patron = randomOf(candidates.length ? candidates : INFERNAL_PATRONS);
  const disguisedDeity = facadeDeity || randomOf(patron.opposedDeities);
  return { patron, facadeDeity: disguisedDeity, order: DIVINE_ORDERS[disguisedDeity] };
}

function curseLevelLimit(treasureType) {
  if (treasureType >= 9) return 10;
  if (treasureType >= 7) return 8;
  if (treasureType >= 5) return 6;
  if (treasureType >= 3) return 4;
  if (treasureType >= 2) return 2;
  return 1;
}

function curseSeparationTime(level) {
  const available = CURSE_SEPARATION_TIMES.filter((entry) => level >= entry.minimumLevel);
  return randomOf(available.at(-1)?.values || CURSE_SEPARATION_TIMES[0].values);
}

function curseBinding(treasureType, level, separationTime) {
  const persistentChance = Math.min(0.32, 0.06 + (treasureType * 0.018) + (level * 0.008));
  const resistantChance = Math.min(0.42, 0.20 + (level * 0.018));
  const roll = Math.random();
  if (roll < persistentChance) {
    return {
      key: "persistent",
      label: "Persistente",
      detail: "se for abandonado, vendido ou destruído por meios comuns, o item reaparece junto ao antigo portador após o próximo repouso",
      release: "somente Quebra de Encantos, um ritual apropriado definido pelo Mestre ou outra solução sobrenatural equivalente rompe o vínculo; o tempo de afastamento só começa depois disso"
    };
  }
  if (roll < persistentChance + resistantChance) {
    return {
      key: "resistant",
      label: "Difícil de abandonar",
      detail: "o portador sente uma compulsão intensa para conservar ou recuperar o item; o Mestre pode exigir uma resistência coerente com a situação para abandoná-lo voluntariamente",
      release: `depois de vencer a compulsão e permanecer ${separationTime} longe do item, a maldição termina`
    };
  }
  return {
    key: "ordinary",
    label: "Comum",
    detail: "o item pode ser abandonado normalmente, mas a influência não desaparece de imediato",
    release: `a maldição termina depois que o antigo portador permanece ${separationTime} longe do item`
  };
}

function signed(value) {
  return Number(value) >= 0 ? `+${value}` : String(value);
}

function magicalAdjective(baseName = "") {
  const name = normalize(baseName);
  if (/^(botas|luvas|manoplas)\b/.test(name)) return "Mágicas";
  if (/^(brincos)\b/.test(name)) return "Mágicos";
  if (/^(adaga|alabarda|armadura|besta|bracadeira|capa|cimitarra|clava|cota|coura[cç]a|espada|foice|funda|lan[cç]a|ma[cç]a|machadinha|po[cç][aã]o|tiara|t[uú]nica|vestimenta|joia)\b/.test(name)) return "Mágica";
  return "Mágico";
}

// Quantidades da Tabela XIV-3a (Tagmar 1), usadas apenas como referência
// estatística. Os tipos pares interpolam as cinco colunas originais.
const TREASURE_QUANTITY_ANCHORS = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4],
  [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 5],
  [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 6, 6, 7, 7, 8]
];

const TREASURE_POWER_ANCHORS = [
  [0, 0, 0, 0, 0, 0, 10, 10, 10, 20],
  [0, 0, 10, 10, 20, 20, 20, 20, 30, 30],
  [10, 10, 20, 20, 30, 30, 30, 30, 40, 40],
  [30, 40, 40, 40, 50, 50, 50, 50, 60, 60],
  [40, 50, 50, 50, 60, 60, 60, 60, 70, 70]
];

function treasureQuantity(type, dieResult) {
  const safeType = Math.max(1, Math.min(10, Number(type) || 1));
  const index = Math.max(0, Math.min(19, Number(dieResult) - 1));
  if (safeType % 2 === 1) return TREASURE_QUANTITY_ANCHORS[(safeType - 1) / 2][index];
  if (safeType === 10) {
    const vast = TREASURE_QUANTITY_ANCHORS[4][index];
    return vast > 0 ? Math.min(10, vast + 1) : 0;
  }
  const lower = TREASURE_QUANTITY_ANCHORS[(safeType / 2) - 1][index];
  const upper = TREASURE_QUANTITY_ANCHORS[safeType / 2][index];
  return Math.round((lower + upper) / 2);
}

function treasurePowerBonus(type, dieResult) {
  const safeType = Math.max(1, Math.min(10, Number(type) || 1));
  const index = Math.max(0, Math.min(9, Number(dieResult) - 1));
  if (safeType % 2 === 1) return TREASURE_POWER_ANCHORS[(safeType - 1) / 2][index];
  if (safeType === 10) return Math.min(70, TREASURE_POWER_ANCHORS[4][index] + 10);
  const lower = TREASURE_POWER_ANCHORS[(safeType / 2) - 1][index];
  const upper = TREASURE_POWER_ANCHORS[safeType / 2][index];
  return Math.round((lower + upper) / 20) * 10;
}

function kindFromRoll(d20) {
  if (d20 <= 3) return "ring";
  if (d20 <= 8) return "weapon";
  if (d20 <= 11) return "defense";
  if (d20 <= 14) return "staff";
  return "potion";
}

function weaponBonus(total) {
  if (total <= 12) return 1;
  if (total <= 30) return 2;
  if (total <= 60) return 3;
  if (total <= 77) return 4;
  return 5;
}

function staffProfile(specificName = "", objectRoll = 1) {
  const normalized = normalize(specificName);
  if (normalized === "cetro comum") return { name: "Cetro comum", matrices: 1 };
  if (normalized === "cetro maior") return { name: "Cetro maior", matrices: 2 };
  if (normalized === "cajado comum") return { name: "Cajado comum", matrices: 3 };
  if (normalized === "cajado maior") return { name: "Cajado maior", matrices: 4 };
  if (objectRoll <= 5) return { name: "Cetro comum", matrices: 1 };
  if (objectRoll <= 8) return { name: "Cetro maior", matrices: 2 };
  if (objectRoll <= 16) return { name: "Cajado comum", matrices: 3 };
  return { name: "Cajado maior", matrices: 4 };
}

function staffProfileForMatrices(requiredMatrices = 1) {
  const matrices = Math.max(1, Math.min(4, Math.trunc(Number(requiredMatrices) || 1)));
  if (matrices === 1) return { name: "Cetro comum", matrices: 1 };
  if (matrices === 2) return { name: "Cetro maior", matrices: 2 };
  if (matrices === 3) return { name: "Cajado comum", matrices: 3 };
  return { name: "Cajado maior", matrices: 4 };
}

function staffMagicBehavior(magic, treasureType) {
  const name = normalize(magic?.name || "");
  const effect = normalize(magic?.effectText || "");
  const instantaneous = /(acido|ataque|bola de fogo|cura|desintegr|encantar objetos|explos|ferimento|fulmin|raio|relampago|ressurre|telecines|teleport|toque)/.test(name);
  const constantEligible = /(adapt|armadura|camuflag|conhecimento natural|defesa|fortalecimento|intangibilidade|intuicao|invisibilidade|levita|membros metalicos|mimetismo|olhar|protecao|respira|resistencia|sentido|visao|voar|voo|vinculo vital)/.test(name);
  const describedDuration = /(duracao|permanece|enquanto).{0,50}(rodada|minuto|hora|dia|concentr|empunh)/.test(effect);
  if (instantaneous || (!constantEligible && !describedDuration)) return { mode: "activation", label: "ativação livre" };

  // Uma matriz reutilizável não torna o efeito permanente. A permanência é um
  // poder adicional raro, reservado a efeitos sustentáveis de tesouros elevados.
  const constantChance = treasureType >= 10 ? 35
    : treasureType >= 9 ? 28
      : treasureType >= 7 ? 18
        : treasureType >= 5 ? 8
          : 0;
  if (constantEligible && (Math.random() * 100) < constantChance) return { mode: "constant", label: "constante enquanto empunhado" };
  return { mode: "sustained", label: "ativação livre; duração conforme a magia" };
}

function folderPath(folder, folders = null) {
  const parts = [];
  let current = folder;
  while (current) {
    if (typeof current === "string") current = folders?.get?.(current) || game.folders?.get?.(current);
    if (!current) break;
    parts.unshift(current.name);
    current = current.folder;
  }
  return parts.join(" / ");
}

function stampedFolderName() {
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR").replaceAll("/", "-");
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replaceAll(":", "-");
  return `Tesouro ${date} ${time}`;
}

export class TesourosTagmarApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "tesouros-tagmar",
      title: "Tesouros em Tagmar",
      template: `systems/${SYSTEM_ID}/templates/apps/tesouros-tagmar.hbs`,
      width: 1120,
      height: 820,
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      tabs: [{ navSelector: ".tesouro-tabs", contentSelector: ".tesouro-body", initial: "gerar" }]
    });
  }

  constructor(...args) {
    super(...args);
    this._catalog = null;
    this._preview = [];
    this._lastRoll = null;
    this._formState = null;
    this._objectSelections = {};
    const savedPool = game.settings.get(SYSTEM_ID, "tesourosObjetosSelecionados")?.items || [];
    this._objectPoolSelections = new Set(Array.isArray(savedPool) ? savedPool : []);
  }

  _persistObjectPoolSelections() {
    return game.settings.set(SYSTEM_ID, "tesourosObjetosSelecionados", {
      items: [...this._objectPoolSelections]
    });
  }

  async _loadCatalog() {
    if (this._catalog) return this._catalog;

    const magicByName = new Map();
    const weapons = [];
    const defenses = [];
    const jewelry = [];
    const packSources = [
      { id: `${SYSTEM_ID}.criando-fichas-t3er`, realm: "reinos", realmLabel: "Reinos Conhecidos" },
      { id: `${SYSTEM_ID}.terras-selvagens-t3er`, realm: "terras", realmLabel: "Terras Selvagens" }
    ];

    for (const source of packSources) {
      const pack = game.packs.get(source.id);
      if (!pack) continue;
      const documents = await pack.getDocuments();
      for (const item of documents) {
        const sync = item.flags?.tagmarSync || {};
        const folderRoute = folderPath(item.folder, pack.folders);
          const route = sync.route || folderRoute || pack.title;
        const provenance = normalize([
          folderRoute,
          sync.route,
          sync.category,
          sync.origin,
          sync.purpose,
          sync.sourceName
        ].filter(Boolean).join(" / "));
        const normalizedName = normalize(item.name);
        const category = normalize(sync.category);
        const sourceName = normalize(sync.sourceName);
        const ancestralMagic = normalize([
          sync.category,
          sync.origin,
          sync.acquisitionList,
          route
        ].filter(Boolean).join(" / ")).includes("ancestral");
        const creatureOnly = sync.creatureEmbedded === true
          || provenance.includes("criando criaturas")
          || provenance.includes("criacao de criaturas")
          || provenance.includes("poderes natos")
          || provenance.includes("efeitos especiais")
          || provenance.includes("consulta-e-criacao-de-criaturas")
          || normalizedName.includes("efeitos especiais");
        const naturalAttack = /^(halito|mordida|garras?|tentaculos?|coice|chifrada|picada|patada|pancada|cauda)(\b|\s)/.test(normalizedName);
        const playerUsable = !creatureOnly && !(item.type === "Combate" && naturalAttack);
        const currentEquipmentSource = sourceName.includes("livro de regras - combate")
          || sourceName.includes("tabela e funcionamento das novas armas");
        const playerCombatRoute = provenance.includes("04 - combate")
          || category === "combate"
          || (category === "terras-selvagens" && currentEquipmentSource);
        const playerDefenseRoute = provenance.includes("05 - defesa")
          || category === "defesa"
          || (category === "terras-selvagens" && currentEquipmentSource);
        const jewelryRoute = provenance.includes("gemas e pedras preciosas")
          || provenance.includes("joias")
          || provenance.includes("adornos");
        const jewelryName = /(^|\s)(anel|colar|brinco|joia|broche|bracelete|pulseira|coroa|tiara|diadema|amuleto|medalhao|pingente|adorno)(\b|\s)/.test(normalizedName);
        const weaponDerivedBelonging = normalize(sync.belongingKind) === "weapon" || Boolean(sync.sourceWeaponId);
        const equipmentPlaceholder = normalizedName === "nada" || normalizedName === "combate desarmado";
        if (item.type === "Magia" && playerUsable) {
          const key = normalize(item.name);
          const levels = extractMagicLevels(item.name, item.system?.efeito, ancestralMagic);
          const traditions = magicTraditions(route);
          const repertoire = magicRepertoire(sync.category, sync.origin, route);
          const existing = magicByName.get(key);
          if (existing) {
            existing.origins.add(route);
            existing.realms.add(source.realm);
            for (const tradition of traditions) existing.traditions.add(tradition);
            existing.repertoires.add(repertoire);
            existing.ancestral ||= ancestralMagic;
            if (!existing.effectText) existing.effectText = stripHtml(item.system?.efeito || "");
            for (const level of levels) existing.levels.add(level);
          } else {
            magicByName.set(key, {
              key,
              name: item.name,
              origins: new Set([route]),
              realms: new Set([source.realm]),
              traditions: new Set(traditions),
              repertoires: new Set([repertoire]),
              uuid: item.uuid,
              ancestral: ancestralMagic,
              effectText: stripHtml(item.system?.efeito || ""),
              levels: new Set(levels)
            });
          }
        } else if (item.type === "Combate" && playerUsable && playerCombatRoute && !sync.parentMagicName && !equipmentPlaceholder) {
          weapons.push({ item, realm: source.realm });
        } else if (item.type === "Defesa" && playerUsable && playerDefenseRoute && !equipmentPlaceholder) {
          defenses.push({ item, realm: source.realm });
        } else if (item.type === "Pertence" && playerUsable && !weaponDerivedBelonging && (jewelryRoute || jewelryName)) {
          jewelry.push({ item, realm: source.realm, gemstone: provenance.includes("gemas e pedras preciosas") });
        }
      }
    }

    const magics = [...magicByName.values()]
      .map((magic) => ({
        ...magic,
        origins: [...magic.origins].sort((a, b) => a.localeCompare(b, "pt-BR")),
        realms: [...magic.realms],
        traditions: [...magic.traditions],
        repertoires: [...magic.repertoires],
        levels: [...magic.levels].sort((a, b) => a - b),
        realmLabel: [...magic.realms].map((realm) => realm === "terras" ? "Terras Selvagens" : "Reinos Conhecidos").join(" + ")
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const origins = [...new Set(magics.flatMap((magic) => magic.origins))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((name) => ({
        name,
        realms: [...new Set(magics.filter((magic) => magic.origins.includes(name)).flatMap((magic) => magic.realms))].join(" "),
        traditions: [...new Set(magics.filter((magic) => magic.origins.includes(name)).flatMap((magic) => magic.traditions))].join(" "),
        repertoires: [...new Set(magics.filter((magic) => magic.origins.includes(name)).flatMap((magic) => magic.repertoires))].join(" ")
      }));

    const lore = { deities: new Map(), regions: [] };
    const lorePack = game.packs.get(`${SYSTEM_ID}.reino-de-tagmar-t3er`);
    if (lorePack) {
      const journals = await lorePack.getDocuments();
      const gods = journals.find((journal) => normalize(journal.name) === "os deuses de tagmar");
      const godsHtml = gods?.pages?.contents?.map((page) => page.text?.content || "").join("") || "";
      for (const match of godsHtml.matchAll(/<h3[^>]*>\s*([^<]+?)\s*<\/h3>([\s\S]*?)(?=<h3|<hr|$)/gi)) {
        const name = stripHtml(match[1]);
        const summary = stripHtml(match[2]).split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
        if (name && summary) lore.deities.set(normalize(name), { name, summary, uuid: gods.uuid });
      }
      lore.regions = journals
        .filter((journal) => journal.flags?.tagmarSync?.sourceBook === "Livro dos Reinos")
        .filter((journal) => !/^(guia|cronologia|pr[oó]logo|ep[ií]logo|cr[eé]ditos)/i.test(journal.name))
        .map((journal) => ({ name: journal.name, uuid: journal.uuid }));
    }

    this._catalog = { magics, origins, weapons, defenses, jewelry, lore };
    return this._catalog;
  }

  async getData() {
    const catalog = await this._loadCatalog();
    const propertySettings = game.settings.get(SYSTEM_ID, "tesourosPropriedades") || {};
    const magics = catalog.magics.map((magic) => ({
      ...magic,
      originLabel: magic.origins.join(" · "),
      realmLabel: magic.realmLabel,
      realms: magic.realms.join(" "),
      originValues: magic.origins.join("|||"),
      traditionValues: magic.traditions.join(" "),
      repertoireValues: magic.repertoires.join(" "),
      repertoireSuffix: magic.repertoires.includes("ancestral") ? " — Ancestral"
        : magic.repertoires.includes("lost") ? " — Perdida" : ""
    }));
    const uniqueDocuments = (entries) => {
      const merged = new Map();
      for (const { item, realm } of entries) {
        const key = normalize(item.name);
        const current = merged.get(key) || { item, realms: new Set() };
        current.realms.add(realm);
        merged.set(key, current);
      }
      return [...merged.values()].map((entry) => ({ ...entry, realms: [...entry.realms].join(" ") }))
        .sort((a, b) => a.item.name.localeCompare(b.item.name, "pt-BR"));
    };
    const mergeChoices = (choices) => {
      const merged = new Map();
      for (const choice of choices) {
        const key = normalize(choice.value);
        const current = merged.get(key) || { ...choice, realms: new Set() };
        for (const realm of choice.realms.split(" ")) current.realms.add(realm);
        merged.set(key, current);
      }
      return [...merged.values()].map((choice) => ({ ...choice, realms: [...choice.realms].join(" ") }))
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
    };
    const jewelryChoices = mergeChoices([
      ...["Anel", "Colar", "Brincos", "Bracelete", "Broche", "Tiara", "Pingente"]
        .map((name) => ({ value: name, label: name, realms: "reinos terras" })),
      ...catalog.jewelry.flatMap(({ item, realm, gemstone }) => {
        const names = gemstone ? item.name.split(/,\s*|\s+e\s+/i) : [item.name];
        return names.map((itemName) => {
          const name = gemstone ? `Joia com ${itemName.trim()}` : itemName;
          return { value: name, label: name, realms: realm };
        });
      })
    ]);
    const objectChoices = [
      ...uniqueDocuments(catalog.weapons).map(({ item, realms }) => ({ kind: "weapon", value: item.name, label: item.name, realms })),
      ...uniqueDocuments(catalog.defenses).map(({ item, realms }) => ({ kind: "defense", value: item.name, label: item.name, realms })),
      ...jewelryChoices.map((choice) => ({ kind: "ring", ...choice })),
      ...["Cetro comum", "Cetro maior", "Cajado comum", "Cajado maior"].map((name) => ({ kind: "staff", value: name, label: name, realms: "reinos terras" })),
      ...["Poção", "Óleo", "Elixir", "Unguento"].map((name) => ({ kind: "potion", value: name, label: name, realms: "reinos terras" }))
    ];
    const objectGroupLabels = {
      weapon: "Armas",
      defense: "Armaduras, elmos e escudos",
      ring: "Joias",
      staff: "Cetros e cajados",
      potion: "Preparados mágicos"
    };
    const objectPoolChoices = objectChoices.map((choice) => ({
      ...choice,
      poolValue: `${choice.kind}|||${choice.value}`,
      groupLabel: objectGroupLabels[choice.kind]
    }));
    return {
      magics,
      origins: catalog.origins,
      objectChoices,
      objectPoolChoices,
      preview: this._preview,
      hasPreview: this._preview.length > 0,
      hasRoll: this._lastRoll !== null,
      lastRoll: this._lastRoll,
      properties: TREASURE_PROPERTIES.map((property) => ({
        ...property,
        enabled: propertySettings[property.key] !== false
      }))
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='save-properties']").on("click", () => this._saveProperties(html));
    html.find("[data-action='generate-preview']").on("click", () => this._generatePreview(html));
    html.find("[data-action='create-treasure']").on("click", () => this._createTreasure());
    html.find("[data-action='send-roll-to-chat']").on("click", () => this._sendRollToChat(html));
    html.find("[data-magic-uuid]").on("click", async (event) => {
      event.preventDefault();
      if (!game.user?.isGM) return;
      const magic = await fromUuid(event.currentTarget.dataset.magicUuid);
      if (!magic) return ui.notifications.warn("A magia não foi encontrada no compêndio atual.");
      magic.sheet.render(true);
    });
    html.find("select[name='generationMode']").on("change", (event) => {
      html.find(".tesouro-quick-options").toggle(event.currentTarget.value === "quick");
      html.find(".tesouro-specific-options").toggle(event.currentTarget.value === "specific");
    });
    html.find("select[name='magicMode']").on("change", (event) => {
      const disabled = event.currentTarget.value === "none";
      html.find("[data-magic-option] select, [data-magic-option] input").prop("disabled", disabled);
      html.find("[data-magic-option]").toggleClass("is-disabled", disabled);
    });
    const objectOptionCatalog = html.find("select[name='itemSpecific'] option[data-kind]").map((_index, option) => ({
      kind: option.dataset.kind,
      realms: option.dataset.realms || "reinos terras",
      value: option.value,
      label: option.textContent
    })).get();
    const updateObjectPool = () => {
      const source = html.find("select[name='contentSource']").val();
      const query = normalize(html.find("[data-object-pool-search]").val() || "");
      let selectionChanged = false;
      html.find(".tesouro-object-pool-list label[data-realms]").each((_index, label) => {
        const matchesSource = source === "all" || label.dataset.realms.split(" ").includes(source);
        const matchesQuery = !query || normalize(label.dataset.search || label.textContent).includes(query);
        label.hidden = !matchesSource || !matchesQuery;
        const input = label.querySelector("input");
        if (!matchesSource && input?.checked) {
          input.checked = false;
          this._objectPoolSelections.delete(input.value);
          selectionChanged = true;
        }
      });
      const selected = html.find("input[name='itemPool']:checked").length;
      html.find("[data-object-pool-count]").text(`${selected} ${selected === 1 ? "objeto selecionado" : "objetos selecionados"}.`);
      if (selectionChanged) this._persistObjectPoolSelections();
    };
    const updateObjectOptions = () => {
      const kind = html.find("select[name='itemKind']").val();
      const source = html.find("select[name='contentSource']").val();
      const specific = html.find("select[name='itemSpecific']")[0];
      const selectedValue = specific.value || this._objectSelections[kind] || "";
      specific.disabled = kind === "random" || kind === "pool";
      $(specific).closest("label").toggleClass("is-disabled", specific.disabled);
      html.find(".tesouro-object-pool").toggle(kind === "pool");
      const choices = objectOptionCatalog.filter((choice) => choice.kind === kind
        && (source === "all" || choice.realms.split(" ").includes(source)));
      specific.replaceChildren(new Option("Aleatório dentro do tipo", ""));
      for (const choice of choices) specific.add(new Option(choice.label, choice.value));
      specific.value = choices.some((choice) => choice.value === selectedValue) && !specific.disabled ? selectedValue : "";
      this._objectSelections[kind] = specific.value;
      updateObjectPool();
    };
    html.find("select[name='itemKind']").on("change", updateObjectOptions);
    html.find("select[name='itemSpecific']").on("change", (event) => {
      const kind = html.find("select[name='itemKind']").val();
      this._objectSelections[kind] = event.currentTarget.value;
    });
    html.find("[data-object-pool-search]").on("input", updateObjectPool);
    html.find("input[name='itemPool']").on("change", (event) => {
      if (event.currentTarget.checked) this._objectPoolSelections.add(event.currentTarget.value);
      else this._objectPoolSelections.delete(event.currentTarget.value);
      this._persistObjectPoolSelections();
      updateObjectPool();
    });
    html.find("[data-action='clear-object-pool']").on("click", () => {
      this._objectPoolSelections.clear();
      html.find("input[name='itemPool']").prop("checked", false);
      if (this._formState) this._formState.itemPool = [];
      this._persistObjectPoolSelections();
      updateObjectPool();
    });
    const updateMagicFilters = () => {
      const source = html.find("select[name='contentSource']").val();
      const tradition = html.find("select[name='magicTradition']").val() || "all";
      const repertoire = html.find("select[name='magicRepertoire']").val() || "all";
      html.find("select[name='magicOrigin'] option[data-realms]").each((_index, option) => {
        const matchesSource = source === "all" || option.dataset.realms.split(" ").includes(source);
        const matchesTradition = tradition === "all" || (option.dataset.traditions || "").split(" ").includes(tradition);
        const matchesRepertoire = repertoire === "all" || (option.dataset.repertoires || "").split(" ").includes(repertoire);
        option.hidden = !matchesSource || !matchesTradition || !matchesRepertoire;
      });
      const originSelect = html.find("select[name='magicOrigin']")[0];
      if (originSelect?.selectedOptions[0]?.hidden) originSelect.value = "";
      const activeOrigin = originSelect?.value || "";
      html.find("select[name='specificMagic'] option[data-realms]").each((_index, option) => {
        const matchesSource = source === "all" || option.dataset.realms.split(" ").includes(source);
        const matchesOrigin = !activeOrigin || (option.dataset.origins || "").split("|||").includes(activeOrigin);
        const matchesTradition = tradition === "all" || (option.dataset.traditions || "").split(" ").includes(tradition);
        const matchesRepertoire = repertoire === "all" || (option.dataset.repertoires || "").split(" ").includes(repertoire);
        option.hidden = !matchesSource || !matchesOrigin || !matchesTradition || !matchesRepertoire;
      });
      const magicSelect = html.find("select[name='specificMagic']")[0];
      if (magicSelect?.selectedOptions[0]?.hidden) magicSelect.value = "";
    };
    html.find("select[name='contentSource']").on("change", () => {
      updateObjectOptions();
      updateMagicFilters();
    });
    html.find("select[name='magicTradition'], select[name='magicRepertoire']").on("change", updateMagicFilters);
    html.find("select[name='magicOrigin']").on("change", updateMagicFilters);
    const updateLoreOptions = () => {
      const history = html.find("input[name='includeHistory']").prop("checked");
      const curse = html.find("input[name='includeCurse']").prop("checked");
      html.find("input[name='revealHistory']").prop("disabled", !history).closest("label").toggleClass("is-disabled", !history);
      html.find("input[name='revealCurse']").prop("disabled", !curse).closest("label").toggleClass("is-disabled", !curse);
      html.find("select[name='curseNature']").prop("disabled", !curse).closest("label").toggleClass("is-disabled", !curse);
    };
    const updateMoneyOptions = () => {
      const enabled = html.find("input[name='includeMoney']").prop("checked");
      html.find("input[name^='money'][name$='Bonus']").prop("disabled", !enabled);
      html.find(".tesouro-money-additions").toggleClass("is-disabled", !enabled);
    };
    html.find("input[name='includeHistory'], input[name='includeCurse']").on("change", updateLoreOptions);
    html.find("input[name='includeMoney']").on("change", updateMoneyOptions);
    if (this._formState) {
      for (const [name, value] of Object.entries(this._formState)) {
        const fields = html.find(`[name='${name}']`);
        if (name === "itemPool" && Array.isArray(value)) {
          fields.each((_index, field) => field.checked = value.includes(field.value));
        } else if (fields[0]?.type === "checkbox") fields.prop("checked", isTruthy(value));
        else fields.val(value);
      }
    }
    if (Array.isArray(this._formState?.itemPool)) {
      this._objectPoolSelections = new Set(this._formState.itemPool);
    }
    html.find("input[name='itemPool']").each((_index, field) => {
      field.checked = this._objectPoolSelections.has(field.value);
    });
    html.find("select[name='generationMode'], select[name='magicMode']").trigger("change");
    updateObjectOptions();
    updateMagicFilters();
    updateLoreOptions();
    updateMoneyOptions();
  }

  async _saveProperties(html) {
    const values = {};
    html.find("input[data-property]").each((_index, input) => values[input.value] = input.checked);
    await game.settings.set(SYSTEM_ID, "tesourosPropriedades", values);
    ui.notifications.info("Catálogo de propriedades salvo.");
  }

  _formValues(html) {
    const values = {};
    html.find("[name]").each((_index, field) => {
      if (field.name === "itemPool" && field.type === "checkbox") {
        values.itemPool ||= [];
        if (field.checked) values.itemPool.push(field.value);
      } else if (field.type === "checkbox") values[field.name] = field.checked;
      else if (field.type !== "radio" || field.checked) values[field.name] = $(field).val();
    });
    values.itemPool = [...this._objectPoolSelections];
    return values;
  }

  async _generatePreview(html) {
    const options = this._formValues(html);
    const selectedKind = html.find("select[name='itemKind']")[0]?.value || "random";
    const selectedObject = html.find("select[name='itemSpecific']")[0]?.value || this._objectSelections[selectedKind] || "";
    options.itemKind = selectedKind;
    options.itemSpecific = ["random", "pool"].includes(selectedKind) ? "" : selectedObject;
    this._formState = { ...options };
    return this._generateWithOptions(options, { render: true });
  }

  async _generateWithOptions(options, { render = true } = {}) {
    const catalog = await this._loadCatalog();
    const propertySettings = game.settings.get(SYSTEM_ID, "tesourosPropriedades") || {};
    const propertyEnabled = (key) => propertySettings[key] !== false;
    const personalized = options.generationMode === "specific";
    const includeCurse = isTruthy(options.includeCurse);
    const curseNature = ["magic", "only"].includes(options.curseNature) ? options.curseNature : "automatic";
    const requestedMagicCount = personalized ? Math.max(0, Math.trunc(Number(options.magicCount) || 0)) : 0;
    const requestedUses = personalized ? Math.max(0, Math.round(Number(options.uses) || 0)) : 0;
    const objectPool = options.itemKind === "pool" ? parseObjectPool(options.itemPool) : [];
    const generateMagics = options.magicMode !== "none"
      && (propertyEnabled("magia") || personalized || (includeCurse && curseNature === "magic"));
    const forceMagics = Boolean(options.specificMagic) || (personalized && (requestedMagicCount > 0 || requestedUses > 0));
    if (includeCurse && curseNature === "magic" && options.magicMode === "none") {
      ui.notifications.warn("O modo “Item mágico amaldiçoado” precisa da opção “Com magia”.");
      return;
    }
    if (personalized && requestedMagicCount > 0 && options.magicMode === "none" && !(includeCurse && curseNature === "only")) {
      ui.notifications.warn("O modo Personalizado pediu magias, mas a opção “Sem magia” também está selecionada.");
      return;
    }
    if (options.itemKind === "potion" && !generateMagics && !(includeCurse && curseNature === "only")) {
      ui.notifications.warn("Poções, óleos, elixires e unguentos precisam da propriedade Magias ativada e da opção “Com magia”.");
      return;
    }
    if (options.itemKind === "pool" && !objectPool.length) {
      ui.notifications.warn("Marque pelo menos um objeto para usar a seleção múltipla personalizada.");
      return;
    }
    if (objectPool.some((entry) => entry.kind === "potion") && !generateMagics && !(includeCurse && curseNature === "only")) {
      ui.notifications.warn("A seleção contém preparados mágicos, que precisam da opção “Com magia”.");
      return;
    }
    if (requestedMagicCount > 4 && objectPool.some((entry) => entry.kind === "staff")) {
      ui.notifications.warn("A seleção contém cetros ou cajados, que comportam no máximo quatro matrizes de poder.");
      return;
    }
    const incompatibleStaff = objectPool.find((entry) => entry.kind === "staff"
      && requestedMagicCount > 0 && requestedMagicCount > staffProfile(entry.value).matrices);
    if (incompatibleStaff) {
      const profile = staffProfile(incompatibleStaff.value);
      ui.notifications.warn(`${profile.name} comporta ${profile.matrices} ${profile.matrices === 1 ? "matriz de poder" : "matrizes de poder"}. Reduza as magias ou retire-o da seleção.`);
      return;
    }
    if (options.itemKind === "staff" && requestedMagicCount > 4) {
      ui.notifications.warn("Cetros e cajados comportam no máximo quatro matrizes de poder. Reduza a quantidade de magias.");
      return;
    }
    if (options.itemKind === "staff" && options.itemSpecific && requestedMagicCount > staffProfile(options.itemSpecific).matrices) {
      const profile = staffProfile(options.itemSpecific);
      ui.notifications.warn(`${profile.name} comporta ${profile.matrices} ${profile.matrices === 1 ? "matriz de poder" : "matrizes de poder"}. Escolha um objeto maior ou reduza as magias.`);
      return;
    }
    if (["weapon", "defense"].includes(options.itemKind)) {
      const entries = options.itemKind === "weapon" ? catalog.weapons : catalog.defenses;
      const regionEntries = entries.filter((entry) => !["reinos", "terras"].includes(options.contentSource)
        || entry.realm === options.contentSource);
      const exactItem = !options.itemSpecific || regionEntries.some((entry) => normalize(entry.item.name) === normalize(options.itemSpecific));
      if (!regionEntries.length || !exactItem) {
        ui.notifications.warn("O objeto escolhido não foi encontrado na região consultada. Escolha outro objeto ou use o sorteio aleatório.");
        return;
      }
    }
    const treasureType = Math.max(1, Math.min(10, Number(options.treasureType) || 1));
    const existenceChance = propertyExistenceChance(treasureType);
    const quantityRoll = await new Roll("1d20").evaluate();
    let count = options.generationMode === "quick"
      ? treasureQuantity(treasureType, quantityRoll.total)
      : Math.max(1, Math.trunc(Number(options.itemCount) || 1));
    // Uma escolha explícita de objeto é uma ordem de criação, não uma tentativa.
    // Mantemos o sorteio da quantidade, mas impedimos que ele resulte em zero.
    if (options.itemSpecific || objectPool.length) count = Math.max(1, count);
    this._lastRoll = { die: quantityRoll.total, count, type: treasureType };
    const includeHistory = isTruthy(options.includeHistory);
    let fixedStoryOrigin = options.magicOrigin || "";
    if (includeHistory && !fixedStoryOrigin && options.specificMagic) {
      fixedStoryOrigin = catalog.magics.find((magic) => magic.key === options.specificMagic)?.origins?.[0] || "";
    }
    const regionalOrigins = catalog.origins.filter((origin) => !["reinos", "terras"].includes(options.contentSource)
      || origin.realms.split(" ").includes(options.contentSource));
    let magicPool = [...catalog.magics];
    if (["reinos", "terras"].includes(options.contentSource)) {
      magicPool = magicPool.filter((magic) => magic.realms.includes(options.contentSource));
    }
    if (options.magicTradition && options.magicTradition !== "all") {
      magicPool = magicPool.filter((magic) => magic.traditions.includes(options.magicTradition));
    }
    if (options.magicRepertoire && options.magicRepertoire !== "all") {
      magicPool = magicPool.filter((magic) => magic.repertoires.includes(options.magicRepertoire));
    }
    if (fixedStoryOrigin) magicPool = magicPool.filter((magic) => magic.origins.includes(fixedStoryOrigin));
    // O Tipo limita o efeito da magia, não cria níveis inexistentes.
    magicPool = magicPool.filter((magic) => availableMagicLevels(magic, treasureType).length > 0);
    if (count > 0 && generateMagics && magicPool.length === 0 && !(includeCurse && curseNature === "only")) {
      ui.notifications.warn("Nenhuma magia corresponde aos filtros escolhidos. Selecione outra origem ou deixe a opção como aleatória.");
      return;
    }

    const result = [];
    let objectPoolQueue = [];
    // Uma rodada compartilha este controle narrativo entre todos os itens. Assim,
    // época, região e voz só voltam a aparecer quando as alternativas compatíveis
    // já foram usadas, evitando listas inteiras presas à Moldânia ou à mesma frase.
    const loreContext = {
      periodGroups: new Map(),
      periods: new Map(),
      regions: new Map(),
      voices: new Map()
    };
    for (let index = 0; index < count; index++) {
      const categoryRoll = await new Roll("1d20").evaluate();
      const objectRoll = await new Roll("1d20").evaluate();
      const qualityRoll = await new Roll("1d10").evaluate();
      const powerRoll = await new Roll("1d20").evaluate();
      const bonusChanceRoll = await new Roll("1d100").evaluate();
      const magicChanceRoll = await new Roll("1d100").evaluate();
      const focusChanceRoll = await new Roll("1d100").evaluate();
      const focusRoll = await new Roll(`1d${treasureType * 10}`).evaluate();
      const resistanceChanceRoll = await new Roll("1d100").evaluate();
      const resistanceValueRoll = await new Roll(`1d${treasureType}`).evaluate();
      const absorptionChanceRoll = await new Roll("1d100").evaluate();
      const absorptionValueRoll = await new Roll("1d10").evaluate();
      const pureCurseChance = Math.max(15, 45 - (treasureType * 3));
      const pureCurse = includeCurse && (curseNature === "only"
        || (curseNature === "automatic" && (!generateMagics || options.magicMode === "none"
          || (await new Roll("1d100").evaluate()).total <= pureCurseChance)));
      let itemSpecific = options.itemSpecific;
      let kind = options.itemKind === "random" ? kindFromRoll(categoryRoll.total) : options.itemKind;
      if (options.itemKind === "pool") {
        if (!objectPoolQueue.length) objectPoolQueue = shuffled(objectPool);
        const selectedObject = objectPoolQueue.shift();
        kind = selectedObject.kind;
        itemSpecific = selectedObject.value;
      }
      if (kind === "potion" && !generateMagics && !pureCurse) kind = randomOf(["weapon", "defense", "ring", "staff"]);
      if (kind === "staff" && requestedMagicCount > 4) kind = randomOf(["weapon", "defense", "ring", "potion"]);
      const qualityBonus = treasurePowerBonus(treasureType, qualityRoll.total);
      const total = Math.min(90, powerRoll.total + qualityBonus);
      const hasMagicProperty = !pureCurse && generateMagics
        && (kind === "potion" || kind === "staff" || forceMagics || includeCurse || magicChanceRoll.total <= existenceChance);
      let magicCount = 0;
      if (hasMagicProperty) {
        if (requestedMagicCount > 0) {
          magicCount = requestedMagicCount;
        } else if (kind === "staff") {
          const capacity = staffProfile(itemSpecific, objectRoll.total).matrices;
          magicCount = 1;
          for (let matrix = 1; matrix < capacity; matrix++) {
            if ((await new Roll("1d100").evaluate()).total <= existenceChance) magicCount++;
          }
        } else if (kind === "potion") {
          magicCount = 1;
        } else {
          magicCount = (await new Roll("1d2").evaluate()).total;
        }
      }
      let itemStoryOrigin = fixedStoryOrigin;
      let itemMagicPool = [...magicPool];
      if (includeHistory && !itemStoryOrigin) {
        const requiredMagics = Math.max(1, magicCount);
        const suitableOrigins = regionalOrigins.filter((origin) => itemMagicPool.filter((magic) => magic.origins.includes(origin.name)).length >= requiredMagics);
        const distinctive = suitableOrigins.filter((origin) => /(ordem|col[eé]gio|confraria|trilha)/i.test(origin.name));
        itemStoryOrigin = randomOf(distinctive.length ? distinctive : suitableOrigins)?.name || "";
        if (itemStoryOrigin) itemMagicPool = itemMagicPool.filter((magic) => magic.origins.includes(itemStoryOrigin));
      }
      const selectedMagics = [];
      const specificMagic = options.specificMagic
        ? itemMagicPool.find((magic) => magic.key === options.specificMagic)
        : null;
      if (magicCount > 0 && specificMagic) selectedMagics.push(specificMagic);
      const available = [...itemMagicPool]
        .filter((magic) => magic.key !== specificMagic?.key);
      while (selectedMagics.length < magicCount && available.length) {
        const selected = randomOf(available);
        selectedMagics.push(selected);
        available.splice(available.indexOf(selected), 1);
      }
      if (magicCount > 0 && selectedMagics.length === 0) {
        ui.notifications.warn(`Nenhuma magia está disponível para ${kind} com os filtros atuais.`);
        return;
      }
      if (selectedMagics.length < magicCount) {
        const explicitMagicDemand = requestedMagicCount > 0
          || Boolean(options.magicOrigin)
          || Boolean(options.specificMagic)
          || (options.magicTradition && options.magicTradition !== "all")
          || (options.magicRepertoire && options.magicRepertoire !== "all");
        if (explicitMagicDemand) {
          ui.notifications.warn(`Foram solicitadas ${magicCount} magias diferentes, mas os filtros atuais oferecem apenas ${selectedMagics.length}. Amplie a região ou a escola/origem.`);
          return;
        }
        // No modo automático, uma limitação excepcional do repertório não deve
        // transformar o convite do chat em erro. Usamos todas as opções distintas disponíveis.
        magicCount = selectedMagics.length;
      }
      const randomUsesDie = treasureType >= 9 ? 6 : treasureType >= 6 ? 4 : treasureType >= 3 ? 3 : 2;
      const configuredUses = options.generationMode === "specific" ? Number(options.uses) || 0 : 0;
      const magicDetails = [];
      for (const magic of selectedMagics) {
        const levels = availableMagicLevels(magic, treasureType);
        const level = randomOf(levels);
        const uses = configuredUses > 0
          ? Math.max(1, Math.round(configuredUses))
          : kind === "potion"
            ? 1
            : (await new Roll(`1d${randomUsesDie}`).evaluate()).total;
        magicDetails.push({ ...magic, level, uses });
      }
      result.push(this._buildPreviewItem({
        kind, magics: magicDetails, options: { ...options, itemSpecific, _storyOrigin: itemStoryOrigin, _loreContext: loreContext }, catalog, propertySettings, treasureType, total,
        curseMode: pureCurse ? "only" : "magic",
        rolls: {
          category: categoryRoll.total,
          object: objectRoll.total,
          quality: qualityRoll.total,
          power: powerRoll.total,
          qualityBonus,
          bonusChance: bonusChanceRoll.total,
          magicChance: magicChanceRoll.total,
          focusChance: focusChanceRoll.total,
          focus: focusRoll.total,
          resistanceChance: resistanceChanceRoll.total,
          resistanceValue: resistanceValueRoll.total,
          absorptionChance: absorptionChanceRoll.total,
          absorptionValue: absorptionValueRoll.total
        }
      }));
    }
    if (options.includeMoney) result.push(await this._buildMoneyPreview(treasureType, options));
    this._preview = result;
    if (render) this.render(false);
    return true;
  }

  async _buildMoneyPreview(treasureType, options = {}) {
    const type = Math.max(1, Math.min(10, Number(treasureType) || 1));
    const moRoll = await new Roll(`${type}d6`).evaluate();
    const mpRoll = await new Roll(`${type}d10 * 2`).evaluate();
    const mcRoll = await new Roll(`${type}d20 * 5`).evaluate();
    const added = {
      mo: Math.max(0, Math.trunc(Number(options.moneyMoBonus) || 0)),
      mp: Math.max(0, Math.trunc(Number(options.moneyMpBonus) || 0)),
      mc: Math.max(0, Math.trunc(Number(options.moneyMcBonus) || 0))
    };
    const baseMoney = { mo: moRoll.total, mp: mpRoll.total, mc: mcRoll.total };
    const money = { mo: baseMoney.mo + added.mo, mp: baseMoney.mp + added.mp, mc: baseMoney.mc + added.mc };
    const summary = `${money.mo} MO · ${money.mp} MP · ${money.mc} MC`;
    const addedSummary = [added.mo ? `${added.mo} MO` : "", added.mp ? `${added.mp} MP` : "", added.mc ? `${added.mc} MC` : ""].filter(Boolean).join(" · ");
    const description = [
      `<p><strong>Tesouro monetário gerado por Tesouros em Tagmar.</strong></p>`,
      `<p><strong>Tipo do tesouro:</strong> ${type}</p>`,
      addedSummary ? `<p><strong>Acréscimos definidos pelo Mestre:</strong> ${addedSummary}</p>` : "",
      `<p><strong>Moedas encontradas:</strong> ${summary}</p>`
    ].join("");
    const name = "Tesouro monetário";
    return {
      name,
      publicName: name,
      kind: "money",
      kindLabel: "Tesouro monetário",
      icon: "fas fa-coins",
      img: "icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp",
      powerSummary: summary,
      treasureType: type,
      total: 0,
      bonus: 0,
      focus: 0,
      uses: [],
      magics: [],
      money,
      moneyBase: baseMoney,
      moneyAdded: added,
      description,
      baseDocument: null
    };
  }

  _buildCurse(treasureType, kind, apparentOrigin = "") {
    const maximum = curseLevelLimit(treasureType);
    // Primeiro definimos a vertente — especialmente quando uma origem divina
    // já existe — e só então procuramos um efeito que expresse sua heresia.
    const { patron, facadeDeity, order } = infernalPatronFor("", apparentOrigin);
    const available = INFERNAL_CURSES.filter((curse) => curse.minimumLevel <= maximum);
    const thematic = available.filter((curse) => curse.patrons.includes(patron.key));
    const generic = available.filter((curse) => !curse.patrons.length);
    const selected = randomOf(thematic.length ? thematic : generic.length ? generic : available);
    const isThematic = Boolean(selected?.patrons.includes(patron.key));
    const level = Math.min(maximum, Math.max(1, selected?.minimumLevel || 1));
    const separationTime = curseSeparationTime(level);
    const binding = curseBinding(treasureType, level, separationTime);
    const effect = selected?.effect || "uma influência profana acompanha o portador";
    const patronLabel = `${patron.name}, ${patron.title}`;
    return {
      name: `Maldição infernal — grau ${level}`,
      level,
      effect: `${effect}.`,
      separationTime,
      binding,
      patron: { key: patron.key, name: patron.name, title: patron.title, domains: patron.domains },
      patronLabel,
      facade: { deity: facadeDeity, order },
      thematic: isThematic,
      heresy: isThematic ? patron.heresy : "nenhum sinal herético específico pode ser reconhecido; a manifestação parece uma maldição profana genérica",
      recognition: isThematic
        ? `Um integrante de ${order} pode desconfiar da falsificação ao perceber que ${patron.heresy}.`
        : "A natureza infernal só pode ser confirmada por investigação, magia ou conhecimento especializado.",
      origin: `A maldição pertence à vertente infernal de ${patronLabel}. Ela foi ocultada sob inscrições atribuídas a ${order}.`,
      source: CURSE_SOURCE_URL,
      infernalSource: INFERNAL_SOURCE_URL
    };
  }

  _buildLore({ baseName, kind, magics, options, catalog, treasureType, curse }) {
    const loreContext = options._loreContext || {
      periodGroups: new Map(), periods: new Map(), regions: new Map(), voices: new Map()
    };
    const origin = options._storyOrigin || magics[0]?.origins?.[0] || "";
    const originMatch = origin.match(/ordem(?: sacerdotal)? de ([^/]+)/i);
    const patronKey = normalize(originMatch?.[1] || "").split(" ")[0];
    const deity = catalog.lore?.deities?.get(patronKey);
    const knownRegions = catalog.lore?.regions || [];
    const wildernessRegions = WILDERNESS_REGIONS.map((name) => ({ name, uuid: null }));
    const availableRegions = options.contentSource === "terras"
      ? wildernessRegions
      : options.contentSource === "reinos"
        ? knownRegions
        : [...knownRegions, ...wildernessRegions];
    const region = leastUsedRandom(availableRegions, loreContext.regions, (entry) => normalize(entry.name));
    const historicalFrames = HISTORICAL_FRAMES.filter((frame) => treasureType >= frame.minimumType);
    const historicalGroups = [...new Set(historicalFrames.map((frame) => frame.group || frame.label))];
    const historicalGroup = leastUsedRandom(historicalGroups, loreContext.periodGroups);
    const historicalFrame = leastUsedRandom(
      historicalFrames.filter((frame) => (frame.group || frame.label) === historicalGroup),
      loreContext.periods,
      (frame) => frame.label
    );
    const creator = kind === "potion" ? consumableCreator(curse) : null;
    let epithet = LORE_EPITHETS[patronKey];
    if (!epithet && /col[eé]gio/i.test(origin)) epithet = `Obra do ${origin.split(" / ").at(-1)}`;
    if (!epithet && /confraria|trilha|ordem/i.test(origin)) epithet = `Legado de ${origin.split(" / ").at(-1)}`;
    if (!epithet && magics.some((magic) => magic.ancestral) && treasureType >= 8) epithet = "Legado do Segundo Ciclo";
    if (!epithet) epithet = "Relíquia de Origem Incerta";
    const trueName = `${baseName}, ${epithet}`;
    const joinNatural = (values) => values.length < 2
      ? values[0] || ""
      : `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
    const magicNames = joinNatural(magics.map((magic) => magic.name));
    const originLabel = deity ? `Ordem de ${deity.name}` : origin ? origin.split(" / ").at(-1) : "";
    const originGrammar = normalize(originLabel);
    const feminineOrigin = /^(ordem|trilha|confraria)\b/.test(originGrammar);
    const masculineOrigin = /^(col[eé]gio)\b/.test(originGrammar);
    const originGenitive = feminineOrigin ? `da ${originLabel}` : masculineOrigin ? `do ${originLabel}` : `de ${originLabel}`;
    const originDative = feminineOrigin ? `à ${originLabel}` : masculineOrigin ? `ao ${originLabel}` : `a ${originLabel}`;
    const periodLabel = historicalFrame?.label || "uma época que nenhum cronista conseguiu determinar";
    const periodParts = periodLabel.match(/^(o|a|os|as)\s+(.+)$/i);
    const periodGenitive = periodParts
      ? `${({ o: "do", a: "da", os: "dos", as: "das" })[periodParts[1].toLowerCase()]} ${periodParts[2]}`
      : `de ${periodLabel}`;
    const regionLabel = region?.name || "um paradeiro apagado dos mapas conhecidos";
    const materialLabel = kind === "weapon" ? "metal" : kind === "defense" ? "corpo da proteção" : "objeto";
    const techniqueLabel = kind === "weapon" ? "técnica de forja e encantamento"
      : kind === "defense" ? "técnica de fabricação e encantamento da proteção"
        : kind === "ring" ? "técnica de ourivesaria, gravação e lapidação"
          : kind === "staff" ? "técnica de entalhe e incrustação das matrizes de poder"
            : kind === "potion" ? "técnica de preparação alquímica"
              : "técnica de fabricação";
    const powerLabel = magicNames || `as propriedades gravadas em seu ${materialLabel}`;
    const summarySentence = deity?.summary?.split(/(?<=[.!?])\s+/)[0]?.trim() || "";
    const integratedSummary = summarySentence
      ? normalize(summarySentence).startsWith(normalize(deity.name))
        ? summarySentence
        : `${deity.name}, ${summarySentence.charAt(0).toLocaleLowerCase("pt-BR")}${summarySentence.slice(1)}`
      : "";
    const divineContext = integratedSummary && Math.random() < 0.35 ? integratedSummary : "";
    const knownOrigin = Boolean(originLabel);
    const knownRegion = Boolean(region);
    const knownPeriod = Boolean(historicalFrame);
    const assimilatedOrigin = knownOrigin ? ` e assimilou encantos ligados ${originDative}` : "";
    const creatorAttribution = creator?.key === "alchemist"
      ? `A fórmula é atribuída a um alquimista${assimilatedOrigin}.`
      : creator?.key === "sorcerer"
        ? `Os vestígios arcanos apontam para um feiticeiro, que estabilizou os efeitos no preparado${knownOrigin ? ` a partir de conhecimentos ligados ${originDative}` : ""}.`
        : creator?.key === "collaboration"
          ? `A preparação combina o trabalho de um alquimista com o de outro mago${knownOrigin ? ` versado nos ensinamentos ${originGenitive}` : ""}.`
          : creator?.key === "extraordinary"
            ? curse
              ? `A receita não corresponde a nenhuma escola reconhecida e sua procedência foi deliberadamente ocultada.`
              : `A receita parece derivar de uma tradição sacerdotal ou ancestral${knownOrigin ? ` preservada por ${originLabel}` : ""}.`
            : "";
    const narratives = [
      {
        voice: "crônica",
        sentences: [
          knownPeriod
            ? `Crônicas apócrifas datam a criação desta peça de ${periodLabel}.`
            : "Nenhuma crônica preservou com segurança a época em que esta peça foi criada.",
          creatorAttribution || (knownOrigin
            ? `Os mesmos textos atribuem seu trabalho a artífices ligados ${originDative}.`
            : "As margens desses textos oferecem autores diferentes e nenhuma atribuição confiável."),
          divineContext,
          knownRegion
            ? `A última anotação verificável menciona ${regionLabel}; depois disso, a relíquia desaparece dos registros.`
            : "Depois de sua criação, a relíquia desaparece dos registros conhecidos.",
          magicNames
            ? `Ainda assim, os encantos ${powerLabel} conservam traços reconhecíveis dessa antiga origem.`
            : `Restaram apenas ${powerLabel}, cuja origem nenhum estudioso explicou por completo.`
        ]
      },
      {
        voice: "tradição oral",
        sentences: [
          knownRegion
            ? `Nas estradas próximas de ${regionLabel}, viajantes ainda contam histórias sobre esta relíquia.`
            : "Viajantes contam versões contraditórias sobre uma relíquia que jamais permanece muito tempo no mesmo lugar.",
          creatorAttribution || (knownOrigin
            ? `Uns juram que ela saiu das mãos de seguidores ${originGenitive}; outros tratam essa autoria como simples superstição.`
            : "Ninguém concorda sobre quem a criou, e cada narrador acrescenta um novo nome à história."),
          knownPeriod
            ? `Todas as versões, porém, fazem a narrativa recuar até ${periodLabel}.`
            : "Nem mesmo os relatos mais antigos concordam sobre quando tudo começou.",
          divineContext,
          magicNames
            ? `Quando ${powerLabel} despertam, até os mais céticos reconhecem que a história guarda algum fundo de verdade.`
            : `Quando ${powerLabel} se manifestam, até os mais céticos hesitam em chamar o relato de invenção.`
        ]
      },
      {
        voice: "registro erudito",
        sentences: [
          `Um catálogo incompleto de antiguidades descreve um objeto que corresponde à peça conhecida como ${trueName}.`,
          creatorAttribution || (knownOrigin
            ? `Pela ${techniqueLabel} e pelos símbolos reproduzidos, o compilador o relacionou ${originDative}.`
            : `O compilador recusou-se a indicar um criador, alegando que os símbolos e a ${techniqueLabel} pertenciam a tradições incompatíveis.`),
          divineContext,
          knownPeriod
            ? `A caligrafia do registro sugere uma cópia de documentos provenientes ${periodGenitive}.`
            : "A caligrafia oferece pistas demais para uma datação segura e poucas para uma conclusão.",
          knownRegion
            ? `Uma nota posterior afirma que o objeto foi visto em ${regionLabel}, mas não informa quem o transportava.`
            : "As páginas que poderiam registrar seu destino foram removidas do volume.",
          magicNames
            ? `A descrição dos fenômenos coincide com os encantos hoje identificados como ${powerLabel}.`
            : `A descrição dos fenômenos coincide com ${powerLabel}.`
        ]
      },
      {
        voice: "memória de ordem",
        sentences: [
          creatorAttribution || (knownOrigin
            ? `Entre os guardiões ${originGenitive}, esta peça é lembrada mais como testemunho do que como tesouro.`
            : "Entre sacerdotes e estudiosos, esta peça é lembrada como testemunho de uma tradição cujo nome se perdeu."),
          divineContext,
          knownPeriod
            ? `A tradição situa sua primeira aparição durante ${periodLabel}, embora nenhum original dessa narrativa tenha sobrevivido.`
            : "A tradição evita atribuir-lhe uma data, como se sua origem devesse permanecer fora dos calendários.",
          magicNames
            ? `Os poderes ${powerLabel} são apresentados como a assinatura deixada por seus criadores.`
            : `As propriedades inscritas no ${materialLabel} são apresentadas como a assinatura deixada por seus criadores.`,
          knownRegion
            ? `O último guardião citado teria seguido para ${regionLabel}; dali em diante, resta apenas silêncio.`
            : "O nome do último guardião foi raspado, e com ele desapareceu qualquer indicação do paradeiro atual."
        ]
      },
      {
        voice: "investigação",
        sentences: [
          `Três pistas acompanham ${trueName}: uma antiga ${techniqueLabel}, relatos desencontrados e uma assinatura mágica persistente.`,
          creatorAttribution || (knownOrigin
            ? `A ${techniqueLabel} aponta para artífices de ${originLabel}.`
            : `A ${techniqueLabel} combina tradições diferentes e impede uma atribuição definitiva.`),
          knownPeriod
            ? `Os relatos conduzem a ${periodLabel}.`
            : "Os relatos não oferecem uma data em que se possa confiar.",
          knownRegion
            ? `Já a pista mais recente termina em ${regionLabel}, onde o objeto teria mudado de mãos pela última vez.`
            : "A pista mais recente termina antes que o objeto alcance qualquer local identificável.",
          divineContext,
          magicNames
            ? `Por fim, ${powerLabel} confirmam que não se trata apenas de outro objeto com nome emprestado.`
            : `Por fim, ${powerLabel} confirmam que não se trata apenas de outro objeto com nome emprestado.`
        ]
      },
      {
        voice: "cantiga",
        sentences: [
          knownPeriod
            ? `Uma cantiga de autoria desconhecida faz ${trueName} surgir em ${periodLabel}.`
            : `Uma cantiga sem data é a menção mais antiga encontrada para ${trueName}.`,
          creatorAttribution || (knownOrigin
            ? `Seus versos entregam a fabricação a mãos devotadas ${originDative}.`
            : "Cada versão da cantiga oferece um criador diferente, talvez para proteger o verdadeiro."),
          knownRegion
            ? `A última estrofe conduz a peça até ${regionLabel} e termina antes de revelar seu destino.`
            : "A última estrofe termina justamente quando o destino da peça seria revelado.",
          divineContext,
          magicNames
            ? `Os nomes ${powerLabel} aparecem preservados no refrão, quase como palavras destinadas a despertar seus encantos.`
            : `O refrão descreve ${powerLabel} como marcas que jamais puderam ser apagadas.`
        ]
      }
    ];
    const narrative = leastUsedRandom(narratives, loreContext.voices, (entry) => entry.voice);
    return {
      trueName,
      publicName: baseName,
      text: narrative.sentences.filter(Boolean).join(" "),
      voice: narrative.voice,
      origin: origin || "Origem incerta",
      creator: creator ? { key: creator.key, label: creator.label } : null,
      generated: true,
      sources: [deity?.uuid, region?.uuid].filter(Boolean)
    };
  }

  _buildPreviewItem({ kind, magics, options, catalog, propertySettings, treasureType, total, rolls, curseMode = "magic" }) {
    const labels = {
      weapon: "Arma", defense: "Proteção", ring: "Joia", staff: "Cetro ou cajado",
      potion: "Poção, óleo, elixir ou unguento"
    };
    let baseDocument = null;
    let baseName = labels[kind];
    const selectedRealm = ["reinos", "terras"].includes(options.contentSource) ? options.contentSource : null;
    const realmDocuments = (entries) => entries.filter((entry) => !selectedRealm || entry.realm === selectedRealm).map((entry) => entry.item);
    const availableWeapons = realmDocuments(catalog.weapons);
    const availableDefenses = realmDocuments(catalog.defenses);
    if (kind === "weapon" && availableWeapons.length) {
      const selected = options.itemSpecific
        ? availableWeapons.find((item) => normalize(item.name) === normalize(options.itemSpecific))
        : null;
      baseDocument = selected || availableWeapons[(rolls.object - 1) % availableWeapons.length];
      baseName = baseDocument.name;
    } else if (kind === "defense" && availableDefenses.length) {
      const selected = options.itemSpecific
        ? availableDefenses.find((item) => normalize(item.name) === normalize(options.itemSpecific))
        : null;
      baseDocument = selected || availableDefenses[(rolls.object - 1) % availableDefenses.length];
      baseName = baseDocument.name;
    } else if (kind === "ring") {
      const jewelry = ["Anel", "Colar", "Brincos", "Bracelete", "Broche", "Tiara", "Pingente"];
      baseName = options.itemSpecific || jewelry[(rolls.object - 1) % jewelry.length];
    } else if (kind === "staff") {
      const rolledProfile = staffProfile(options.itemSpecific, rolls.object);
      const compatibleProfile = !options.itemSpecific && magics.length > rolledProfile.matrices
        ? staffProfileForMatrices(magics.length)
        : rolledProfile;
      baseName = compatibleProfile.name;
    } else if (kind === "potion") {
      const liquids = ["Poção", "Óleo", "Elixir", "Unguento"];
      baseName = options.itemSpecific || liquids[(rolls.object - 1) % liquids.length];
    }
    const propertyEnabled = (key) => propertySettings?.[key] !== false;
    const pureCurse = curseMode === "only";
    const existenceChance = propertyExistenceChance(treasureType);
    const weaponBonusLimit = Math.min(5, Math.max(1, Math.ceil(treasureType / 2)));
    const defenseBonusLimit = Math.min(3, Math.max(1, Math.ceil(treasureType / 4)));
    const bonusLimit = kind === "weapon" ? weaponBonusLimit : kind === "defense" ? defenseBonusLimit : 0;
    const automaticBonus = kind === "weapon"
      ? Math.min(bonusLimit, weaponBonus(total))
      : kind === "defense"
        ? Math.min(bonusLimit, Math.max(1, Math.ceil(total / 8)))
        : 0;
    const configuredBonus = options.generationMode === "specific" ? Number(options.magicBonus) || 0 : 0;
    const hasConfiguredBonus = Number.isFinite(configuredBonus) && configuredBonus !== 0;
    const bonus = !pureCurse && (propertyEnabled("bonus") || hasConfiguredBonus)
      ? hasConfiguredBonus
        ? Math.round(configuredBonus)
        : bonusLimit > 0 && rolls.bonusChance <= existenceChance ? automaticBonus : 0
      : 0;
    const configuredFocus = options.generationMode === "specific" ? Number(options.focus) || 0 : 0;
    const focusBase = treasureType * 10;
    const focus = pureCurse ? 0 : configuredFocus > 0
      ? Math.max(1, Math.round(configuredFocus))
      : kind === "potion" || !propertyEnabled("focus") || rolls.focusChance > existenceChance
        ? 0
        : focusBase + Math.max(1, Math.min(focusBase, rolls.focus));
    const focusPower = focus > 0 ? `Focus +${focus}` : "";
    const resistanceCompatible = ["weapon", "defense", "ring", "staff"].includes(kind);
    const absorptionCompatible = ["defense", "ring"].includes(kind);
    const resistance = !pureCurse && propertyEnabled("resistencia") && resistanceCompatible && rolls.resistanceChance <= existenceChance
      ? Math.max(1, Math.min(treasureType, rolls.resistanceValue))
      : 0;
    let absorption = 0;
    if (!pureCurse && propertyEnabled("absorcao") && absorptionCompatible && rolls.absorptionChance <= existenceChance) {
      const absorptionBase = (treasureType - 1) * 10;
      absorption = Math.max(1, Math.min(100, absorptionBase + rolls.absorptionValue));
    }
    const resistancePower = resistance > 0 ? `RM +${resistance}` : "";
    const absorptionPower = absorption > 0 ? `Absorção +${absorption}` : "";
    const timesPerDay = (uses) => `${uses} ${uses === 1 ? "vez por dia" : "vezes por dia"}`;
    const configuredUses = options.generationMode === "specific" ? Number(options.uses) || 0 : 0;
    const staffMatrices = staffProfile(baseName, rolls.object).matrices;
    const filledMatrices = kind === "staff" ? Math.min(staffMatrices, magics.length) : 0;
    const emptyMatrices = kind === "staff" ? Math.max(0, staffMatrices - filledMatrices) : 0;
    const matrixSummary = kind === "staff"
      ? `${filledMatrices} ${filledMatrices === 1 ? "matriz preenchida" : "matrizes preenchidas"} · ${emptyMatrices} ${emptyMatrices === 1 ? "matriz vazia" : "matrizes vazias"}`
      : "";
    const magicUsage = magics.map((magic, index) => {
      const staffBehavior = kind === "staff" ? staffMagicBehavior(magic, treasureType) : null;
      const usage = kind === "potion" && configuredUses <= 0
        ? "uso único"
        : kind === "staff"
          ? `${configuredUses > 0 ? timesPerDay(magic.uses) : staffBehavior.label}; ${index + 1}ª matriz de poder`
          : timesPerDay(magic.uses);
      return { ...magic, usageMode: staffBehavior?.mode || "limited", usageLabel: usage, powerLabel: `${magic.name} ${magic.level} (${usage})` };
    });
    const magicPowers = magicUsage.map((magic) => magic.powerLabel);
    const linkedMagicPowers = magicUsage.map((magic) => {
      const label = `${magic.name} ${magic.level}`.replaceAll("]", "").replaceAll("}", "");
      const linkedLabel = magic.uuid
        ? `<a class="content-link" draggable="true" data-link data-uuid="${escapeHtml(magic.uuid)}"><i class="fas fa-book-open"></i>${escapeHtml(label)}</a>`
        : escapeHtml(label);
      return `${linkedLabel} (${escapeHtml(magic.usageLabel)})`;
    });
    const standaloneBonusPower = bonus && !["weapon", "defense"].includes(kind) ? `Bônus mágico ${signed(bonus)}` : "";
    const secondaryPowers = [standaloneBonusPower, focusPower, resistancePower, absorptionPower].filter(Boolean);
    const baseWithBonus = `${baseName}${bonus && ["weapon", "defense"].includes(kind) ? ` ${signed(bonus)}` : ""}`;
    const semanticConflict = kind === "ring" && magicUsage.some((magic) => PHYSICAL_OBJECT_WORDS.test(magic.name)
      && normalize(magic.name).split(" ")[0] !== normalize(baseName).split(" ")[0]);
    const apparentOrigin = options._storyOrigin || magicUsage[0]?.origins?.[0] || "";
    const curse = isTruthy(options.includeCurse) ? this._buildCurse(treasureType, kind, apparentOrigin) : null;
    const lore = isTruthy(options.includeHistory)
      ? this._buildLore({ baseName: baseWithBonus, kind, magics: magicUsage, options, catalog, treasureType, curse })
      : null;
    if (curse) curse.hasNarrative = Boolean(lore);
    const hasMagicalTrait = Boolean(bonus || focus || resistance || absorption || magicPowers.length || curse);
    const shortName = pureCurse && curse
      ? `${baseName}${isTruthy(options.revealCurse) ? " sob Maldição" : ""}`
      : hasMagicalTrait
        ? `${baseName} ${magicalAdjective(baseName)}${bonus && ["weapon", "defense"].includes(kind) ? ` ${signed(bonus)}` : ""}`
      : baseName;
    // O título identifica apenas o objeto. Poderes, história e maldição pertencem à descrição.
    const name = shortName;
    const publicName = shortName;
    const powerSummary = [bonus && ["weapon", "defense"].includes(kind) ? signed(bonus) : "", ...secondaryPowers, ...magicPowers].filter(Boolean).join(", ")
      || (pureCurse && curse ? "somente amaldiçoado" : "sem poder definido");
    const powerWeight = (Math.abs(bonus) * 2)
      + Math.ceil(focus / 10)
      + (resistance * 2)
      + (absorption * 2)
      + magics.reduce((sum, magic) => sum + magic.level, 0);
    const curseNarrativeHtml = curse?.hasNarrative
      ? `<p><strong>Vertente infernal:</strong> ${escapeHtml(curse.patronLabel)}</p><p><strong>Fachada profanada:</strong> ${escapeHtml(curse.facade.order)}</p><p><strong>Sinal de heresia:</strong> ${escapeHtml(curse.heresy)}</p><p><em>${escapeHtml(curse.recognition)}</em></p>`
      : "";
    const curseBindingHtml = curse
      ? `<p><strong>Tempo de afastamento:</strong> ${escapeHtml(curse.separationTime)}</p><p><strong>Vínculo com o item:</strong> ${escapeHtml(curse.binding.label)} — ${escapeHtml(curse.binding.detail)}.</p><p><strong>Como se libertar:</strong> ${escapeHtml(curse.binding.release)}.</p>`
      : "";
    const lines = [
      `<p><strong>Item gerado por Tesouros em Tagmar.</strong></p>`,
      `<p><strong>Tipo do tesouro:</strong> ${treasureType}</p>`,
      curse && isTruthy(options.revealCurse) ? `<p><strong>Natureza:</strong> ${pureCurse ? "somente amaldiçoado" : "item mágico amaldiçoado"}</p>` : "",
      bonus ? `<p><strong>Bônus mágico:</strong> ${signed(bonus)}</p>` : "",
      focusPower ? `<p><strong>Focus:</strong> +${focus}</p>` : "",
      resistancePower ? `<p><strong>Resistência à Magia (RM):</strong> +${resistance}</p>` : "",
      absorptionPower ? `<p><strong>Absorção:</strong> +${absorption}</p>` : "",
      linkedMagicPowers.length ? `<p><strong>Poderes:</strong> ${linkedMagicPowers.join(", ")}</p>` : "",
      kind === "staff" ? `<p><strong>Matrizes de poder:</strong> ${staffMatrices} — ${matrixSummary}</p>` : "",
      ["weapon", "defense", "ring", "staff"].includes(kind)
        ? `<p><strong>Integridade mágica:</strong> este objeto não se quebra por desgaste comum; quando danificado, recupera-se com o tempo conforme as regras de itens mágicos.</p>`
        : "",
      lore && isTruthy(options.revealHistory) ? `<section><h3>História do item</h3><p><strong>Nome verdadeiro:</strong> ${escapeHtml(lore.trueName)}</p><p>${escapeHtml(lore.text)}</p><p><em>História gerada a partir das referências de ambientação; este objeto não é um artefato canônico publicado.</em></p></section>` : "",
      curse && isTruthy(options.revealCurse) ? `<section><h3>Maldição</h3><p><strong>${escapeHtml(curse.name)}:</strong> ${escapeHtml(curse.effect)}</p>${curseBindingHtml}${curseNarrativeHtml}<p><a href="${curse.source}" target="_blank" rel="noopener">Consultar a magia oficial Maldições</a></p></section>` : "",
      `<p><em>Item genérico criado com o repertório atual de Tagmar.</em></p>`
    ].filter(Boolean);
    return {
      name, publicName, kind, kindLabel: labels[kind], bonus, focus, resistance, absorption, powerWeight,
      uses: magics.map((magic) => magic.uses), treasureType, total,
      icon: "fas fa-gem", powerSummary, matrixSummary, semanticConflict,
      magics: magicUsage.map((magic) => ({ name: magic.name, uuid: magic.uuid, effect: magic.level, uses: magic.uses, usageLabel: magic.usageLabel, realms: magic.realms })),
      lore, curse, curseMode,
      revealHistory: isTruthy(options.revealHistory),
      revealCurse: isTruthy(options.revealCurse),
      description: lines.join(""), baseDocument
    };
  }

  _previewChatContent({ gm = false, claimedBy = "" } = {}) {
    const entries = this._preview.map((entry) => {
      if (entry.kind === "money") {
        return `<li><i class="fas fa-coins"></i> <strong>${escapeHtml(entry.name)}</strong><div>${escapeHtml(entry.powerSummary)}</div></li>`;
      }
      const visibleName = entry.publicName || entry.name;
      const magicLinks = (entry.magics || []).map((magic) => `${chatMagicLink(magic, gm)} (${escapeHtml(magic.usageLabel)})`).join(" · ");
      const lore = entry.lore && (gm || entry.revealHistory)
        ? `<p><strong>Nome verdadeiro:</strong> ${escapeHtml(entry.lore.trueName)}</p><p><strong>História:</strong> ${escapeHtml(entry.lore.text)}</p>`
        : "";
      const curseDetails = entry.curse?.hasNarrative
        ? `<p><strong>Vertente infernal:</strong> ${escapeHtml(entry.curse.patronLabel)}</p><p><strong>Fachada profanada:</strong> ${escapeHtml(entry.curse.facade.order)}</p><p><strong>Sinal de heresia:</strong> ${escapeHtml(entry.curse.heresy)}</p>`
        : "";
      const curseBinding = entry.curse
        ? `<p><strong>Tempo de afastamento:</strong> ${escapeHtml(entry.curse.separationTime)}</p><p><strong>Vínculo:</strong> ${escapeHtml(entry.curse.binding.label)} — ${escapeHtml(entry.curse.binding.detail)}.</p><p><strong>Libertação:</strong> ${escapeHtml(entry.curse.binding.release)}.</p>`
        : "";
      const curse = entry.curse && (gm || entry.revealCurse)
        ? `<p><strong>${escapeHtml(entry.curse.name)}:</strong> ${escapeHtml(entry.curse.effect)}</p>${curseBinding}${curseDetails}`
        : "";
      return `<li><i class="fas fa-gem"></i> <strong>${escapeHtml(visibleName)}</strong><div>${escapeHtml(publicPowerSummary(entry, gm))}</div>${magicLinks ? `<div class="tesouro-chat-magics"><i class="fas fa-book-open"></i> ${magicLinks}</div>` : ""}${lore}${curse}</li>`;
    }).join("");
    const notice = gm
      ? "Visão completa do Mestre: nomes verdadeiros, histórias, maldições e vínculos de compêndio."
      : "Somente informações já reveladas pelo Mestre são exibidas aqui.";
    return `<section class="tagmar-treasure-chat"><h3><i class="fas fa-gem"></i> Tesouro encontrado</h3>${claimedBy ? `<p>A rolagem foi realizada por <strong>${escapeHtml(claimedBy)}</strong>.</p>` : ""}<ul>${entries || "<li>Nenhum item mágico foi encontrado.</li>"}</ul><p class="notes">${notice}</p></section>`;
  }

  async _sendRollToChat(html) {
    if (!game.user?.isGM) return;
    const options = this._formValues(html);
    const selectedKind = html.find("select[name='itemKind']")[0]?.value || "random";
    options.itemKind = selectedKind;
    options.itemSpecific = ["random", "pool"].includes(selectedKind)
      ? ""
      : html.find("select[name='itemSpecific']")[0]?.value || this._objectSelections[selectedKind] || "";
    const content = `<section class="tagmar-treasure-chat tagmar-treasure-invitation"><h3><i class="fas fa-dice-d20"></i> Descoberta de tesouro</h3><p>O Mestre preparou um tesouro. Um jogador pode realizar a rolagem que revelará o que foi encontrado.</p><button type="button" data-action="claim-treasure-roll"><i class="fas fa-dice"></i> Rolar o tesouro</button><p class="notes">O primeiro clique válido encerra esta rolagem.</p></section>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      content,
      flags: { tagmarTreasure: { invitation: { status: "pending", createdBy: game.user.id, options } } }
    });
    ui.notifications.info("Convite de rolagem enviado ao chat.");
  }

  async _ensureTreasureFolder() {
    let root = game.folders.find((folder) => folder.type === "Item" && !folder.folder && folder.name === ROOT_FOLDER_NAME);
    if (!root) root = await Folder.create({ name: ROOT_FOLDER_NAME, type: "Item", color: "#c58a00" });
    return Folder.create({ name: stampedFolderName(), type: "Item", folder: root.id, color: "#7a1f1f" });
  }

  async _createTreasure() {
    if (!this._preview.length) return ui.notifications.warn("Gere uma prévia antes de criar o tesouro.");
    const folder = await this._ensureTreasureFolder();
    const itemData = this._preview.map((entry) => {
      let data;
      const createdName = entry.publicName || entry.name;
      if (entry.baseDocument) {
        data = entry.baseDocument.toObject();
        delete data._id;
        data.name = createdName;
        data.folder = folder.id;
        data.system = foundry.utils.deepClone(data.system);
        if (data.type === "Combate") data.system.bonus_magico = entry.bonus;
        if (data.type === "Defesa") {
          data.system.defesa_base = foundry.utils.deepClone(data.system.defesa_base || { tipo: "", valor: 0 });
          data.system.defesa_base.valor = (Number(data.system.defesa_base.valor) || 0) + entry.bonus;
          data.system.absorcao = (Number(data.system.absorcao) || 0) + entry.absorption;
        }
        data.system.descricao = `${stripMundaneMaintenance(data.system.descricao || "")}${entry.description}`;
      } else {
        data = {
          name: createdName,
          type: "Pertence",
          img: entry.img || "icons/containers/chest/chest-reinforced-steel-brown.webp",
          folder: folder.id,
          system: { quant: 1, descricao: entry.description, peso: 0, preco: "", inTransport: false }
        };
      }
      data.flags = foundry.utils.mergeObject(data.flags || {}, {
        tagmarTreasure: {
          generated: true,
          treasureType: entry.treasureType,
          powerTotal: entry.total,
          bonus: entry.bonus,
          focus: entry.focus,
          resistance: entry.resistance || 0,
          absorption: entry.absorption || 0,
          powerWeight: entry.powerWeight || 0,
          uses: entry.uses,
          magics: entry.magics,
          money: entry.money || null,
          lore: entry.lore || null,
          curse: entry.curse || null,
          curseMode: entry.curseMode || "magic",
          revealHistory: entry.revealHistory || false,
          revealCurse: entry.revealCurse || false,
          trueName: entry.lore?.trueName || entry.name,
          publicName: entry.publicName
        }
      }, { inplace: false });
      return data;
    });
    const created = await Item.createDocuments(itemData);
    const hasPublicRevelation = this._preview.some((entry) => entry.revealHistory || entry.revealCurse);
    if (hasPublicRevelation) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker(),
        content: this._previewChatContent({ gm: false })
      });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      whisper: gmRecipientIds(),
      content: this._previewChatContent({ gm: true })
    });
    ui.notifications.info(`${created.length} item(ns) criado(s) na pasta “${folder.name}”.`);
    this._preview = [];
    this._lastRoll = null;
    this.render(false);
  }

  async _updateObject() {}
}

let treasureChatHooksRegistered = false;
const processingTreasureInvitations = new Set();

function primaryActiveGM() {
  return game.users?.filter((user) => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0] || null;
}

function gmRecipientIds() {
  return game.users?.filter((user) => user.isGM).map((user) => user.id) || [];
}

async function resolveTreasureInvitation({ messageId, userId }) {
  if (!game.user?.isGM || primaryActiveGM()?.id !== game.user.id || processingTreasureInvitations.has(messageId)) return;
  const message = game.messages.get(messageId);
  const invitation = message?.flags?.tagmarTreasure?.invitation;
  const rollingUser = game.users.get(userId);
  if (!message || invitation?.status !== "pending" || !rollingUser?.active) return;
  processingTreasureInvitations.add(messageId);
  try {
    await message.update({
      content: `<section class="tagmar-treasure-chat tagmar-treasure-invitation"><h3><i class="fas fa-dice-d20"></i> Rolagem em andamento</h3><p><strong>${escapeHtml(rollingUser.name)}</strong> está revelando o tesouro...</p></section>`,
      "flags.tagmarTreasure.invitation.status": "rolling",
      "flags.tagmarTreasure.invitation.claimedBy": rollingUser.id
    });
    const app = getTesourosTagmarApp();
    app._formState = foundry.utils.deepClone(invitation.options || {});
    const generated = await app._generateWithOptions(app._formState, { render: false });
    if (!generated) throw new Error("As opções preparadas não produziram uma rolagem válida.");
    const publicContent = app._previewChatContent({ gm: false, claimedBy: rollingUser.name });
    await message.update({
      content: publicContent,
      "flags.tagmarTreasure.invitation.status": "claimed",
      "flags.tagmarTreasure.invitation.roll": app._lastRoll
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      whisper: gmRecipientIds(),
      content: app._previewChatContent({ gm: true, claimedBy: rollingUser.name })
    });
    app.render(true);
  } catch (error) {
    console.error("Tagmar | Falha na rolagem participativa de tesouro", error);
    await message.update({
      content: `<section class="tagmar-treasure-chat tagmar-treasure-invitation"><h3>Não foi possível concluir a rolagem</h3><p>O Mestre deve revisar as opções do gerador e enviar um novo convite.</p></section>`,
      "flags.tagmarTreasure.invitation.status": "failed"
    });
    ui.notifications.error("Não foi possível concluir a rolagem participativa do tesouro.");
  } finally {
    processingTreasureInvitations.delete(messageId);
  }
}

function registerTreasureChatHooks() {
  if (treasureChatHooksRegistered) return;
  treasureChatHooksRegistered = true;
  Hooks.once("ready", () => game.socket.on(TREASURE_SOCKET, (payload) => {
    if (payload?.type === "claimTreasureRoll") resolveTreasureInvitation(payload);
  }));
  Hooks.on("createChatMessage", async (message) => {
    const request = message.flags?.tagmarTreasure?.claimRequest;
    if (!request || !game.user?.isGM || primaryActiveGM()?.id !== game.user.id) return;
    try {
      await resolveTreasureInvitation({ messageId: request.messageId, userId: request.userId });
    } finally {
      // A solicitação é apenas um transporte privado entre jogador e Mestre.
      // O resultado permanece no convite original; esta mensagem técnica desaparece.
      await message.delete().catch(() => {});
    }
  });
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const root = html?.querySelector ? html : html?.[0];
    const button = root?.querySelector?.("[data-action='claim-treasure-roll']");
    if (!button) return;
    const invitation = message.flags?.tagmarTreasure?.invitation;
    // Alguns clientes sem permissão de Mestre podem receber a mensagem antes de
    // seus flags estarem disponíveis. Estado ausente não significa convite encerrado:
    // o Mestre ativo ainda valida atomicamente o primeiro pedido recebido.
    if (invitation?.status && invitation.status !== "pending") {
      button.disabled = true;
      return;
    }
    button.addEventListener("click", async () => {
      button.disabled = true;
      const payload = { type: "claimTreasureRoll", messageId: message.id, userId: game.user.id };
      if (game.user.isGM) await resolveTreasureInvitation(payload);
      else {
        if (!primaryActiveGM()) {
          button.disabled = false;
          return ui.notifications.warn("É necessário que um Mestre esteja conectado para realizar a rolagem.");
        }
        try {
          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            whisper: gmRecipientIds(),
            content: `<p><strong>${escapeHtml(game.user.name)}</strong> solicitou a rolagem do tesouro.</p>`,
            flags: { tagmarTreasure: { claimRequest: { messageId: message.id, userId: game.user.id } } }
          });
          ui.notifications.info("Solicitação enviada ao Mestre. Preparando o tesouro...");
        } catch (error) {
          console.error("Tagmar | Falha ao enviar a solicitação de tesouro", error);
          button.disabled = false;
          ui.notifications.error("Não foi possível enviar a rolagem ao Mestre.");
        }
      }
    }, { once: true });
  });
}

export function registerTesourosTagmarSettings() {
  game.settings.register(SYSTEM_ID, "tesourosMagiasAprovadas", {
    scope: "world", config: false, type: Object, default: {}
  });
  game.settings.register(SYSTEM_ID, "tesourosPropriedades", {
    scope: "world", config: false, type: Object,
    default: { bonus: true, magia: true, focus: true, resistencia: true, absorcao: true }
  });
  game.settings.register(SYSTEM_ID, "tesourosObjetosSelecionados", {
    scope: "client", config: false, type: Object, default: { items: [] }
  });
  game.settings.registerMenu(SYSTEM_ID, "tesourosTagmar", {
    name: "Tesouros em Tagmar",
    label: "Abrir gerador",
    hint: "Seleção de propriedades e geração sistemática de tesouros genéricos por tipo e região.",
    icon: "fas fa-gem",
    type: TesourosTagmarApp,
    restricted: true
  });
  registerTreasureChatHooks();
  registerTesourosSidebarButton();
}

function getTesourosTagmarApp() {
  const current = Object.values(ui.windows || {}).find((app) => app.id === "tesouros-tagmar");
  return current || new TesourosTagmarApp();
}

function openTesourosTagmar() {
  const current = Object.values(ui.windows || {}).find((app) => app.id === "tesouros-tagmar");
  if (current) {
    current.render(true);
    current.bringToTop?.();
    return current;
  }
  const app = new TesourosTagmarApp();
  app.render(true);
  return app;
}

function registerTesourosSidebarButton() {
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user?.isGM) return;
    const tools = controls.tokens?.tools ?? controls.token?.tools;
    if (!tools || tools.tesourosTagmar) return;
    tools.tesourosTagmar = {
      name: "tesourosTagmar",
      title: "Tesouros em Tagmar",
      icon: "fa-solid fa-gem",
      button: true,
      onChange: openTesourosTagmar
    };
  });
}
