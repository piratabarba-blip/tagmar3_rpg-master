import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const legacy = JSON.parse(await readFile(join(cacheDir, "legacy-pack.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const category = "rituais";
const source = manifest.pages.find((page) => page.category === category && page.pageName === "Livro de Regras - Magia");
if (!source) throw new Error("Snapshot oficial das regras de rituais ausente");
const sourceFile = `${createHash("sha256").update(`${category}:${source.pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", sourceFile), "utf8");

const decode = (value) => value
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;/gi, "'");
const plain = (value) => decode(String(value).replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
const key = (value) => plain(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const stableId = (namespace, value) => createHash("sha256").update(`${namespace}:${key(value)}`).digest("hex").slice(0, 16);
const folderById = new Map(legacy.folders.map((folder) => [folder._id, folder]));
function folderPath(id) {
  const names = [];
  while (id && folderById.has(id)) {
    const folder = folderById.get(id);
    names.unshift(folder.name);
    id = folder.folder;
  }
  return names.join(" / ");
}

const ritualMatch = html.match(/<li><strong>Ritual<\/strong>:\s*([\s\S]*?)<\/li>/i);
if (!ritualMatch) throw new Error("Regra oficial de evocação ritual não encontrada");
const ritualRule = plain(ritualMatch[1]);
for (const required of ["pago integralmente", "preço de cada ritual", "número de horas igual ao nível do efeito"]) {
  if (!key(ritualRule).includes(key(required))) throw new Error(`Trecho obrigatório ausente da regra ritual: ${required}`);
}

const rootName = "10 - PERTENCES E AFINS";
const folderName = "MATERIAIS MAGICOS RITUS";
const parentId = stableId("tagmar-t3er-pertences-folder", rootName);
const folderId = stableId("tagmar-t3er-pertences-folder", `${rootName}/${folderName}`);
const classicFolder = legacy.folders.find((folder) => key(folderPath(folder._id)) === key(`${rootName} / ${folderName}`));
const classicItem = legacy.items.find((item) => item.folder === classicFolder?._id && key(item.name) === key("Kit (nome da magia)"));
if (!classicFolder || !classicItem) throw new Error("Kit ritual clássico não encontrado");

const folders = [{
  _id: folderId, name: folderName, type: "Item", folder: parentId, sorting: "a",
  sort: classicFolder.sort ?? 0, color: classicFolder.color ?? "#b000a0",
  flags: { tagmarSync: { edition: "Tagmar 3 Edição Revisada", category, origin: "core" } }
}];
const description = [
  "<b>Uso no Foundry:</b> substitua o texto entre parênteses pelo nome da magia e registre no preço o custo indicado no nível do efeito. Use uma unidade para cada evocação preparada; materiais de outra magia ou de outro nível devem ser registrados separadamente.",
  `<b>Regra oficial — Ritual:</b> ${ritualRule.replace(/\n+/g, "<br/><br/>")}`
].join("<br/><br/>");
const items = [{
  _id: stableId("tagmar-t3er-ritual", "Kit (nome da magia)"),
  name: "Kit (nome da magia)", type: "Pertence", img: classicItem.img, folder: folderId,
  system: { quant: 1, descricao: description, peso: classicItem.system?.peso ?? 0, preco: "Conforme o efeito", inTransport: false },
  flags: { tagmarSync: {
    edition: "Tagmar 3 Edição Revisada", category, origin: "core",
    sourceName: source.pageName, sourceUrl: source.url, sourceHash: source.hash,
    legacyItemId: classicItem._id, customizable: true, consumedOnUse: true,
    ritualHoursEqualEffectLevel: true
  } }
}];

await writeFile(join(cacheDir, "preview-rituais.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
await writeFile(join(cacheDir, "preview-rituais-folders.json"), `${JSON.stringify(folders, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ items: items.length, folders: folders.length, source: source.url, ruleLength: ritualRule.length }, null, 2));
