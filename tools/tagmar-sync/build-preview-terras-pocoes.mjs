import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const edition = "Aventuras nas Terras Selvagens";
const category = "terras-pocoes";
const rootRoute = "10 - POÇÕES TERRAS SELVAGENS";

const stableId = (namespace, value) => createHash("sha256")
  .update(`${namespace}:${value.normalize("NFC").toLocaleLowerCase("pt-BR")}`)
  .digest("hex").slice(0, 16);
const decodeEntities = (value) => String(value)
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"")
  .replace(/&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const plainText = (value) => decodeEntities(value)
  .replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "\n").replace(/<\/li>/gi, "\n")
  .replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim()
  .replace(/Poçãodo/gi, "Poção do");
const key = (value) => plainText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphs = (value) => String(value).split(/\n+/).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const magics = JSON.parse(await readFile(join(cacheDir, "preview-terras-magias.json"), "utf8"));
const potionMagics = new Map();
for (const magic of magics) {
  if (!/^po[cç][aã]o\b/iu.test(magic.name)) continue;
  const magicKey = key(magic.name);
  if (!potionMagics.has(magicKey)) potionMagics.set(magicKey, { magic, acquisitions: [] });
  potionMagics.get(magicKey).acquisitions.push(magic);
}
if (potionMagics.size !== 15) throw new Error(`Esperadas 15 famílias de poções; encontradas ${potionMagics.size}`);

const rootFolderId = stableId("tagmar-terras-pocoes-folder", rootRoute);
const folders = [{
  _id: rootFolderId, name: rootRoute, type: "Item", folder: null, sorting: "a", sort: 1000,
  color: "#008f8f", flags: { tagmarSync: { edition, category, route: rootRoute } }
}];
const items = [];
const pathFolderIds = new Map();
const familyFolderIds = new Map();

const folderDocument = (route, name, parent, color) => ({
  _id: stableId("tagmar-terras-pocoes-folder", route), name, type: "Item", folder: parent,
  sorting: "a", sort: 0, color, flags: { tagmarSync: { edition, category, route } }
});
const pathNameFrom = (acquisition) => acquisition.flags.tagmarSync.acquisitionList.split(" / ").at(-1);
const familyFolder = (pathName, magicName) => {
  if (!pathFolderIds.has(pathName)) {
    const route = `${rootRoute} / ${pathName}`;
    const folder = folderDocument(route, pathName, rootFolderId, "#265aa8");
    pathFolderIds.set(pathName, folder._id);
    folders.push(folder);
  }
  const route = `${rootRoute} / ${pathName} / ${magicName.toLocaleUpperCase("pt-BR")}`;
  if (!familyFolderIds.has(route)) {
    const folder = folderDocument(route, magicName.toLocaleUpperCase("pt-BR"), pathFolderIds.get(pathName), "#164b82");
    familyFolderIds.set(route, folder._id);
    folders.push(folder);
  }
  return { route, id: familyFolderIds.get(route) };
};

const aliases = new Map([
  [key("Poção da Restauração"), "Poção d[ae] Restauração"],
  [key("Poção do Duplo"), "Poção d[ao] (?:Duplo|transformação)"]
]);
function effectSections(magic) {
  const text = plainText(magic.system.efeito);
  const familyPattern = aliases.get(key(magic.name)) ?? escapeRegExp(magic.name);
  const expression = new RegExp(
    `${familyPattern}\\s+(\\d+)\\s*[:;\-]\\s*([\\s\\S]*?)(?=${familyPattern}\\s+\\d+\\s*[:;\-]|$)`, "giu"
  );
  return [...text.matchAll(expression)].map((match) => ({ level: Number(match[1]), text: match[2].trim() }));
}
const introductionFrom = (magic, firstSection) => {
  const text = plainText(magic.system.efeito);
  const marker = firstSection ? text.indexOf(firstSection.text) : -1;
  let introduction = marker > 0 ? text.slice(0, marker) : text;
  introduction = introduction
    .replace(/^Alcance:\s*[^\n]+\s*/iu, "")
    .replace(/^Duração:\s*[^\n]+\s*/iu, "")
    .replace(/^Evocação:\s*[^\n]+\s*/iu, "")
    .trim();
  return introduction;
};
const productionFrom = (text) => text.match(/(?:Faz|Produz|Cria)\s+(?:até\s+)?(\d+)\s+(?:poções|frascos|doses?)/iu)?.[1]
  ?? (/Faz\s+1\s+poção/iu.test(text) ? "1" : null);
const explicitVariantName = (magicName, section) => {
  const before = section.text.split(/\s+[–—-]\s+|\.\s+/u)[0].trim();
  if (/^(?:Permite|Produz|Cria|Faz|Idem|Aumenta|Diminui|Concede|Transforma|Causa|Um frasco|Três frascos|Cinco frascos)/iu.test(before)) {
    return `${magicName} ${section.level}`;
  }
  if (/^(?:Poção|Elixir|Incenso)/iu.test(before) && before.length < 90) return before;
  return `${magicName} ${section.level}`;
};
const priceFor = (magicName, level) => {
  if (key(magicName) === key("Poção da Restauração")) return `${5 * level}mp`;
  if (key(magicName) === key("Poção do hálito de dragão")) return `${2 * level}mp`;
  if (key(magicName) === key("Poção do Tamanho") || key(magicName) === key("Poção do Vigor")) return `${4 * level}mp`;
  if (key(magicName) === key("Poção Pele Cascarocha") || key(magicName) === key("Poção do Sono")) return `${5 * level}mp`;
  if ([key("Poção da Juventude"), key("Poção da maldição"), key("Poção da Metamorfose"), key("Poção do Duplo"), key("Poção de voo")].includes(key(magicName))) return `${level}mo`;
  return "";
};
const sourceFlags = (magic) => ({
  sourceName: magic.flags.tagmarSync.sourceName,
  sourceUrl: magic.flags.tagmarSync.sourceUrl,
  sourceHash: magic.flags.tagmarSync.sourceHash
});
function addItem({ magic, pathName, folderId, level, name, variant, detail, introduction, price, production, compoundTemplate = false }) {
  const routeKey = `${pathName}:${magic.name}:${level}:${variant}`;
  const description = [
    `<p><strong>Magia criadora:</strong> ${escapeHtml(magic.name)} ${level}</p>`,
    `<p><strong>Lista do feiticeiro:</strong> ${escapeHtml(pathName)}</p>`,
    price ? `<p><strong>Custo dos componentes:</strong> ${escapeHtml(price)}</p>` : "",
    production ? `<p><strong>Quantidade produzida:</strong> ${escapeHtml(production)}</p>` : "",
    compoundTemplate ? "<p><strong>Modelo composto:</strong> duplique este pertence e registre os efeitos escolhidos. O mesmo efeito não pode ser repetido.</p>" : "",
    paragraphs(detail),
    "<details><summary>Regras de preparação da magia</summary>", paragraphs(introduction), "</details>"
  ].filter(Boolean).join("");
  items.push({
    _id: stableId("tagmar-terras-pocao", routeKey), name, type: "Pertence", img: magic.img,
    folder: folderId,
    system: { quant: 0, descricao: description, peso: 0, preco: price, inTransport: false },
    flags: { tagmarSync: {
      edition, category, origin: "official-current", ...sourceFlags(magic),
      parentMagicName: magic.name, parentMagicId: magic._id,
      recipePath: pathName, recipeLevel: level, recipeVariant: variant,
      production: production ? Number(production) : null,
      compoundTemplate, manualPreparation: true, needsReview: false
    } }
  });
}

const restorationEffects = {
  1: ["Poção Menor de Cura — restaura 3 de EF", "Poção Energética — restaura 9 de EH"],
  2: ["Poção de Cura — restaura 6 de EF", "Poção Energética — restaura 18 de EH", "Poção da Saúde — cura doenças tipo I", "Poção Antídoto — restaura venenos tipo I", "Poção Mística Mínima — restaura 1 ponto de Karma"],
  4: ["Poção Média de Cura — restaura 9 de EF", "Poção Média Energética — restaura 27 de EH", "Poção Média da Saúde — cura doenças até tipo III", "Poção Média de Antídoto — restaura venenos até tipo II", "Poção Mística Menor — restaura 2 pontos de Karma"],
  6: ["Poção Forte de Cura — restaura 12 de EF", "Poção Forte Energética — restaura 36 de EH", "Poção Forte da Saúde — cura doenças até tipo III", "Poção Forte de Antídoto — restaura venenos até tipo III", "Poção Mística Média — restaura 4 pontos de Karma"],
  8: ["Poção Potente de Cura — restaura 15 de EF", "Poção Potente Energética — restaura 45 de EH", "Poção Potente da Saúde — cura doenças até tipo IV", "Poção Potente de Antídoto — restaura venenos até tipo IV", "Poção Mística Potente — restaura 6 pontos de Karma"],
  10: ["Elixir de Cura — restaura 18 de EF", "Elixir Energético — restaura 54 de EH", "Elixir da Saúde — cura doenças até tipo V", "Elixir de Antídoto — restaura venenos até tipo V", "Poção Mística Potente — restaura 8 pontos de Karma"]
};
const breathVariants = [
  ["Hálito de Queimadura", "Escama de dragão púrpura, do fogo ou dourado; dano de queimadura."],
  ["Hálito de Corrosão", "Escama de dradenar; dano de corrosão."],
  ["Hálito Elétrico", "Escama de dragão de areia; dano elétrico."],
  ["Hálito Congelante", "Escama de dragão do gelo; dano de frio."],
  ["Hálito de Esmagamento", "Escama de draquae; dano de esmagamento."],
  ["Hálito Sagrado", "Escama de dragão de cristal; dano de Karma."],
  ["Hálito Infernal", "Escama de dragão negro; dano de Karma."]
];

for (const { magic, acquisitions } of potionMagics.values()) {
  const sections = effectSections(magic);
  if (sections.length < 5) throw new Error(`${magic.name}: apenas ${sections.length} níveis de receita reconhecidos`);
  const introduction = introductionFrom(magic, sections[0]);
  const paths = [...new Set(acquisitions.map(pathNameFrom))];
  for (const pathName of paths) {
    const folder = familyFolder(pathName, magic.name);
    for (const section of sections) {
      const price = priceFor(magic.name, section.level);
      const production = productionFrom(section.text);
      if (key(magic.name) === key("Poção da Restauração")) {
        for (const option of restorationEffects[section.level] ?? []) {
          const [variant] = option.split(/\s+[–—]\s+/u);
          addItem({ magic, pathName, folderId: folder.id, level: section.level, name: `${variant} (Nível ${section.level})`, variant, detail: option, introduction, price, production });
        }
        const eligible = Object.entries(restorationEffects).filter(([level]) => Number(level) <= section.level)
          .flatMap(([level, options]) => options.map((option) => `Nível ${level}: ${option}`));
        addItem({
          magic, pathName, folderId: folder.id, level: section.level,
          name: `Poção da Restauração Composta (até Nível ${section.level})`, variant: "Composta",
          detail: `Escolha dois ou mais efeitos disponíveis:\n${eligible.join("\n")}\n\nCusto total: some 5 mp × o nível próprio de cada efeito escolhido. Todas as poções produzidas no mesmo ritual devem ser idênticas.`,
          introduction, price: "Variável", production, compoundTemplate: true
        });
        continue;
      }
      if (key(magic.name) === key("Poção do hálito de dragão")) {
        for (const [variant, ingredient] of breathVariants) addItem({
          magic, pathName, folderId: folder.id, level: section.level,
          name: `${variant} (Nível ${section.level})`, variant,
          detail: `${ingredient}\n${section.text}`, introduction, price, production
        });
        continue;
      }
      if (key(magic.name) === key("Poção do Tamanho")) {
        for (const [variant, ingredient] of [
          ["Poção de Crescimento", "Ingrediente especial: dente de ogro."],
          ["Poção de Encolhimento", "Ingrediente especial: unha de pequenino."],
          ["Poção Dupla de Tamanho", "Ingredientes especiais: dente de ogro e unha de pequenino. O efeito é escolhido ao ingerir; se desconhecido, determine-o aleatoriamente."]
        ]) addItem({
          magic, pathName, folderId: folder.id, level: section.level,
          name: `${variant} (Nível ${section.level})`, variant,
          detail: `${ingredient}\n${section.text}`, introduction, price, production
        });
        continue;
      }
      if (key(magic.name) === key("Poção do Sono") && section.level === 1) {
        for (const variant of ["Poção da Sonolência", "Poção do Desmaio"]) addItem({
          magic, pathName, folderId: folder.id, level: section.level, name: `${variant} (Nível 1)`, variant,
          detail: section.text, introduction, price, production
        });
        continue;
      }
      const variant = explicitVariantName(magic.name, section);
      addItem({
        magic, pathName, folderId: folder.id, level: section.level,
        name: variant === `${magic.name} ${section.level}` ? variant : `${variant} (Nível ${section.level})`,
        variant, detail: section.text, introduction, price, production
      });
    }
  }
}

if (new Set(folders.map((folder) => folder._id)).size !== folders.length) throw new Error("IDs de pastas de poções duplicados");
if (new Set(items.map((item) => item._id)).size !== items.length) throw new Error("IDs de receitas de poções duplicados");
const folderIds = new Set(folders.map((folder) => folder._id));
if (items.some((item) => !folderIds.has(item.folder))) throw new Error("Receita de poção sem pasta");
if (items.some((item) => !item.system.descricao || !item.flags.tagmarSync.sourceUrl)) throw new Error("Receita de poção incompleta");

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "preview-terras-pocoes.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-terras-pocoes-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  families: potionMagics.size, paths: pathFolderIds.size, folders: folders.length, items: items.length,
  compoundTemplates: items.filter((item) => item.flags.tagmarSync.compoundTemplate).length,
  byPath: Object.fromEntries([...pathFolderIds.keys()].map((pathName) => [pathName, items.filter((item) => item.flags.tagmarSync.recipePath === pathName).length]))
}, null, 2));
