import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const edition = "Tagmar 3 Edição Revisada";
const category = "magias-dano";
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
const plainText = (value) => decodeEntities(value
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/li>/gi, "\n")
  .replace(/<[^>]+>/g, " "))
  .replace(/[ \t]+/g, " ")
  .replace(/\s*\n\s*/g, "\n")
  .trim();
const key = (value) => plainText(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLocaleLowerCase("pt-BR");

const magias = JSON.parse(await readFile(join(cacheDir, "preview-magias.json"), "utf8"));
const magiaFolders = JSON.parse(await readFile(join(cacheDir, "preview-magias-folders.json"), "utf8"));
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const rootFolder = magiaFolders.find((folder) => folder.name === "07 - MAGIAS" && !folder.folder);
if (!rootFolder) throw new Error("Pasta raiz de Magias não encontrada. Gere primeiro preview-magias-folders.json");

const legacyFolderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
function legacyFolderPath(id) {
  const names = [];
  while (id && legacyFolderById.has(id)) {
    const folder = legacyFolderById.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}
const legacyFolderByPath = new Map(legacy.folders.map((folder) => [key(legacyFolderPath(folder._id)), folder]));
const legacyAttackByName = new Map(legacy.items
  .filter((item) => item.type === "Combate" && key(legacyFolderPath(item.folder)).startsWith(key("07 - MAGIAS / MAGIAS DE ATAQUE")))
  .map((item) => [key(item.name), item]));

const uniqueMagicByName = new Map();
for (const magia of magias) {
  if (!uniqueMagicByName.has(key(magia.name))) uniqueMagicByName.set(key(magia.name), magia);
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const effectSections = (spellName, text) => [...text.matchAll(new RegExp(
  `${escapeRegExp(spellName)}\\s+(\\d+)\\s*:\\s*([\\s\\S]*?)(?=${escapeRegExp(spellName)}\\s+\\d+\\s*:|$)`,
  "gi"
))].map((match) => ({ effect: Number(match[1]), text: match[2].trim() }));
const damageFrom = (section, expression, spellName) => {
  const match = section.text.match(expression);
  if (!match) throw new Error(`Dano não reconhecido em ${spellName} ${section.effect}: ${section.text}`);
  return Number(match[1]);
};
const normalizeRange = (value) => value
  .trim()
  .replace(/\s*metros?\b/gi, "m")
  .replace(/\s+/g, " ");
const parsedSections = (spellName, text, expression, options = {}) => {
  let previousDamage;
  return effectSections(spellName, text)
    .filter((section) => options.effects?.includes(section.effect) ?? true)
    .map((section) => {
      const match = section.text.match(expression);
      const maxDamage = match
        ? Number(match[1])
        : (options.inheritDamage ? previousDamage : damageFrom(section, expression, spellName));
      if (!maxDamage) throw new Error(`Dano não reconhecido em ${spellName} ${section.effect}: ${section.text}`);
      previousDamage = maxDamage;
      return {
        effect: section.effect,
        maxDamage,
        range: options.range instanceof Function
          ? options.range(section)
          : (options.range ?? ""),
        detail: section.text,
        bonus: options.bonus,
        bonusDamage: options.bonusDamage,
        note: options.note
      };
    });
};

const definitions = [
  {
    name: "Aeromanipulação",
    folderName: "AEROMANIPULAÇÃO",
    parse(text) {
      return parsedSections(this.name, text, /dano máximo de\s+(\d+)/i, {
        effects: [10],
        range: "20m",
        note: "Até quatro objetos; faça um ataque separado para cada objeto lançado."
      });
    }
  },
  {
    name: "Armadilha Natural",
    folderName: "ARMADILHA NATURAL",
    parse(text) {
      return parsedSections(this.name, text, /causa\s+(\d+)\s+pontos? de dano/i, { range: "Variável" });
    }
  },
  {
    name: "Bola de Fogo",
    folderName: "BOLA DE FOGO",
    legacyFolderName: "BOLA E FOGO",
    parse(text) {
      return [...text.matchAll(/Bola de Fogo\s+(\d+)\s*:\s*Causa\s+(\d+)\s+pontos? de dano\s+em uma esfera de\s+([^\n.]+)[.]/gi)]
        .map((match) => ({ effect: Number(match[1]), maxDamage: Number(match[2]), range: "50m", detail: `Esfera de ${match[3].trim()}` }));
    }
  },
  {
    name: "Cataclisma",
    folderName: "CATACLISMA",
    parse(text) {
      return parsedSections(this.name, text, /causa dano máximo\s+(\d+)/i, {
        range: "Variável",
        note: "Cada ponto de Karma roubado acrescenta 4 ao dano máximo; ajuste manualmente antes da rolagem."
      });
    }
  },
  {
    name: "Dardos de Gelo",
    folderName: "DARDOS DE GELO",
    parse(text) {
      return parsedSections(this.name, text, /Cada dardo tem\s+(\d+)\s+de dano máximo/i, {
        range: "50m",
        note: "O valor é por dardo. Cada dardo adicional contra o mesmo alvo acrescenta 4 ao dano máximo."
      });
    }
  },
  {
    name: "Explosão Mística",
    folderName: "EXPLOSÃO MÍSTICA",
    legacyFolderName: "EXPLOSÃO MISTICA",
    parse(text) {
      return parsedSections(this.name, text, /Causa dano máximo\s+(\d+)/i, {
        range: "20m",
        note: "O dano desta magia reduz Karma, não EH ou EF; aplique o resultado manualmente no Karma da vítima."
      });
    }
  },
  {
    name: "Feixes Incandescentes",
    folderName: "FEIXES INCANDESCENTES",
    parse(text) {
      return parsedSections(this.name, text, /feixes? de dano\s+(\d+)/i, {
        range: "50m",
        note: "Faça um ataque separado para cada feixe e respeite a restrição de uso ao ar livre."
      });
    }
  },
  {
    name: "Fogo Divino",
    folderName: "FOGO DIVINO",
    parse(text) {
      return parsedSections(this.name, text, /Causa\s+(\d+)\s+pontos? de dano/i, { range: "100m" });
    }
  },
  {
    name: "Garras",
    folderName: "GARRAS",
    parse(text) {
      return parsedSections(this.name, text, /dano máximo \(100%\) igual a\s+(\d+)/i, {
        range: (section) => section.effect === 9 ? "25m" : "Pessoal",
        bonus: "AGI",
        bonusDamage: "FOR",
        inheritDamage: true,
        note: "Aplique manualmente o efeito extra descrito quando atingir a EF ou 100% da EH."
      });
    }
  },
  {
    name: "Lâmina de Luz",
    folderName: "LÂMINA DE LUZ",
    legacyFolderName: "LAMINA DE LUZ",
    parse(text) {
      return parsedSections(this.name, text, /^(\d+)\s+de dano/i, {
        range: "Pessoal",
        bonusDamage: "FOR",
        note: "A arma soma Força ao dano, não Agilidade, e só afeta demônios e mortos-vivos."
      });
    }
  },
  {
    name: "Meteoros",
    folderName: "METEOROS",
    parse(text) {
      return parsedSections(this.name, text, /Causa dano máximo\s+(\d+)/i, {
        range: (section) => normalizeRange(section.text.match(/O alcance é de\s+([^.]*)/i)?.[1] ?? "Variável")
      });
    }
  },
  {
    name: "Onda Destrutiva",
    folderName: "ONDA DESTRUTIVA",
    parse(text) {
      return parsedSections(this.name, text, /Causa dano máximo de\s+(\d+)/i, {
        range: "10m",
        note: "O dano é aplicado aos equipamentos conforme a descrição oficial, não à EH ou EF da criatura."
      });
    }
  },
  {
    name: "Putrefação",
    folderName: "PUTREFAÇÃO",
    parse(text) {
      return parsedSections(this.name, text, /Causa\s+(\d+)\s+pontos? de dano/i, { range: "20m" });
    }
  },
  {
    name: "Raio Elétrico",
    folderName: "RAIO ELÉTRICO",
    legacyFolderName: "RAIO ELÉTRICO",
    parse(text) {
      return [...text.matchAll(/Raio Elétrico\s+(\d+)\s*:\s*Causa\s+(\d+)\s+de dano máximo\s+e o alcance é de\s+([^\n.]+)[.]/gi)]
        .map((match) => ({ effect: Number(match[1]), maxDamage: Number(match[2]), range: match[3].trim().replace(/\s*metros?$/i, "m"), detail: `Alcance de ${match[3].trim()}` }));
    }
  },
  {
    name: "Relâmpagos",
    folderName: "RELÂMPAGOS",
    legacyFolderName: "RELAMPAGOS",
    parse(text) {
      return parsedSections(this.name, text, /(?:dano máximo de|causa(?:ndo)?)\s+(\d+)\s+pontos?/i, {
        range: "100m",
        note: "Nos efeitos 8 e 10, faça um ataque separado para cada vítima."
      });
    }
  },
  {
    name: "Ruído",
    folderName: "RUÍDO",
    legacyFolderName: "RUIDO",
    parse(text) {
      return parsedSections(this.name, text, /dano máximo de\s+(\d+)\s+pontos?/i, {
        effects: [4, 6, 8, 10],
        range: "15m",
        note: "O dano é causado por rodada enquanto o evocador mantiver o ruído; aplique também a penalidade descrita."
      });
    }
  },
  {
    name: "Toque Gélido",
    folderName: "TOQUE GÉLIDO",
    legacyFolderName: "TOQUE GELIDO",
    parse(text) {
      return parsedSections(this.name, text, /Causa\s+(\d+)\s+de dano máximo/i, {
        range: "Toque",
        note: "Aplique manualmente a absorção de EH e os efeitos especiais descritos para 100% na EH ou dano na EF."
      });
    }
  }
];

const attackRoute = "07 - MAGIAS / MAGIAS DE ATAQUE";
const attackLegacyFolder = legacyFolderByPath.get(key(attackRoute));
const attackFolderId = stableId("tagmar-t3er-folder", attackRoute);
const folderDocument = (id, name, folder, route, legacyFolder, sort, color) => ({
  _id: id,
  name,
  type: "Item",
  folder,
  sorting: legacyFolder?.sorting ?? "a",
  sort: legacyFolder?.sort ?? sort,
  color: legacyFolder?.color ?? color,
  flags: {
    tagmarSync: {
      edition,
      category,
      route,
      legacyFolderId: legacyFolder?._id ?? null
    }
  }
});

const folders = [folderDocument(
  attackFolderId,
  "MAGIAS DE ATAQUE",
  rootFolder._id,
  attackRoute,
  attackLegacyFolder,
  900000,
  "#a00000"
)];
const items = [];

const damageProgression = (maxDamage) => Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => {
    const percentage = (index + 1) * 25;
    return [`d${percentage}`, Math.ceil((maxDamage * percentage) / 100)];
  })
);

for (const definition of definitions) {
  const magia = uniqueMagicByName.get(key(definition.name));
  if (!magia) throw new Error(`Magia oficial não encontrada: ${definition.name}`);
  const effects = definition.parse(plainText(magia.system.efeito));
  if (!effects.length) throw new Error(`Nenhum efeito ofensivo reconhecido em ${definition.name}`);
  if (effects.some((effect) => !Number.isInteger(effect.effect) || !Number.isInteger(effect.maxDamage) || effect.maxDamage <= 0)) {
    throw new Error(`Progressão de dano inválida em ${definition.name}`);
  }
  const effectNumbers = new Set(effects.map((effect) => effect.effect));
  if (effectNumbers.size !== effects.length) throw new Error(`Efeitos duplicados em ${definition.name}`);

  const route = `${attackRoute} / ${definition.folderName}`;
  const legacyRoute = `${attackRoute} / ${definition.legacyFolderName}`;
  const legacyFolder = legacyFolderByPath.get(key(legacyRoute));
  const folderId = stableId("tagmar-t3er-folder", route);
  folders.push(folderDocument(folderId, definition.folderName, attackFolderId, route, legacyFolder, 100000 + folders.length * 100000, "#5e0000"));

  for (const effect of effects) {
    const name = `${definition.name} ${effect.effect}`;
    const legacyItem = legacyAttackByName.get(key(name));
    const description = `${name}: ${effect.detail}${effect.note ? `\n\nObservação de uso: ${effect.note}` : ""}`;
    items.push({
      _id: stableId("tagmar-t3er-magia-dano", name),
      name,
      type: "Combate",
      img: legacyItem?.img ?? magia.img,
      folder: folderId,
      system: {
        alcance: effect.range,
        descricao: description,
        favorito: false,
        custo: 0,
        nivel: effect.effect,
        forca_min: 0,
        bonus: effect.bonus ?? "AUR",
        bonus_dano: effect.bonusDamage ?? "AUR",
        peso: 0,
        preco: "",
        bonus_magico: 0,
        def_l: 0,
        def_m: 0,
        def_p: 0,
        dano: damageProgression(0),
        dano_base: damageProgression(effect.maxDamage),
        penalidade: { p25: false, p50: false, p75: false, p100: false },
        tipo: "",
        municao: 0
      },
      flags: {
        tagmarSync: {
          edition,
          category,
          origin: "core",
          sourceName: magia.flags.tagmarSync.sourceName,
          sourceUrl: magia.flags.tagmarSync.sourceUrl,
          sourceHash: magia.flags.tagmarSync.sourceHash,
          parentMagicName: definition.name,
          parentMagicId: magia._id,
          effect: effect.effect,
          maxDamage: effect.maxDamage,
          legacyItemId: legacyItem?._id ?? null,
          needsReview: false
        }
      }
    });
  }
}

if (new Set(folders.map((folder) => folder._id)).size !== folders.length) throw new Error("IDs de pastas duplicados");
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs de ataques mágicos duplicados");
if (items.some((item) => !folders.some((folder) => folder._id === item.folder))) throw new Error("Ataque mágico sem pasta");

const output = join(cacheDir, "preview-magias-dano.json");
const foldersOutput = join(cacheDir, "preview-magias-dano-folders.json");
await mkdir(cacheDir, { recursive: true });
await writeFile(output, `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(foldersOutput, `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output,
  foldersOutput,
  magias: definitions.length,
  efeitos: items.length,
  porMagia: Object.fromEntries(definitions.map((definition) => [definition.name, items.filter((item) => item.flags.tagmarSync.parentMagicName === definition.name).length]))
}, null, 2));
