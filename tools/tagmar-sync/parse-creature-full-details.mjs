import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const { parse } = require(`${foundryModules}/parse5`);
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync", "creatures");
const details = JSON.parse(await readFile(join(cacheDir, "details.json"), "utf8"));

const namedEntities = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => namedEntities[name.toLowerCase()] ?? all);
}

const cleanText = (value) => decodeEntities(String(value ?? "").replace(/<[^>]+>/g, " "))
  .replace(/\s+/g, " ").trim();
const normalize = (value) => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const children = (node) => node?.childNodes ?? [];
const attr = (node, name) => node?.attrs?.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value ?? null;
const textContent = (node) => node?.nodeName === "#text"
  ? node.value
  : children(node).map(textContent).join("");
function descendants(node, predicate, output = []) {
  if (predicate(node)) output.push(node);
  for (const child of children(node)) descendants(child, predicate, output);
  return output;
}

function tableGrid(table) {
  const rows = descendants(table, (node) => node.tagName === "tr");
  const grid = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    grid[rowIndex] ??= [];
    const cells = children(rows[rowIndex]).filter((node) => node.tagName === "td" || node.tagName === "th");
    let column = 0;
    for (const cell of cells) {
      while (grid[rowIndex][column] !== undefined) column += 1;
      const value = cleanText(textContent(cell));
      const rowspan = Math.max(1, Number.parseInt(attr(cell, "rowspan") ?? "1", 10));
      const colspan = Math.max(1, Number.parseInt(attr(cell, "colspan") ?? "1", 10));
      for (let rowOffset = 0; rowOffset < rowspan; rowOffset += 1) {
        grid[rowIndex + rowOffset] ??= [];
        for (let columnOffset = 0; columnOffset < colspan; columnOffset += 1) {
          grid[rowIndex + rowOffset][column + columnOffset] = value;
        }
      }
      column += colspan;
    }
  }
  return grid;
}

function parseNumber(raw, fallback = 0) {
  const match = String(raw ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function parseDefense(raw) {
  const match = String(raw ?? "").trim().match(/^([LMP])\s*(-?\d+)/i);
  return match ? { category: match[1].toUpperCase(), value: Number(match[2]), raw: String(raw).trim() } : { category: "L", value: 0, raw: String(raw ?? "").trim() };
}

function nameScore(candidate, expected) {
  const a = normalize(candidate);
  const b = normalize(expected);
  if (!a || !b) return -1;
  if (a === b) return 10000;
  if (a.includes(b)) return 5000 + b.length;
  if (b.includes(a)) return 4000 + a.length;
  const words = new Set(b.split(" "));
  return a.split(" ").filter((word) => words.has(word)).join(" ").length;
}

function parseCombatTable(document, creatureName) {
  const table = descendants(document, (node) => node.tagName === "table" && /grdAtaques$/i.test(attr(node, "id") ?? ""))[0];
  if (!table) return { error: "tabela de combate não encontrada", candidates: [] };
  const grid = tableGrid(table);
  if (grid.length < 2) return { error: "tabela de combate vazia", candidates: [] };
  const headers = grid[0].map((value) => cleanText(value));
  const index = Object.fromEntries(headers.map((header, position) => [normalize(header), position]));
  const rows = grid.slice(1).map((values) => ({
    name: values[index.nome] ?? "",
    stage: values[index.est] ?? "",
    ef: values[index.ef] ?? "",
    eh: values[index.eh] ?? "",
    defense: values[index.defesa] ?? "",
    attack: values[index.ataque] ?? "",
    l: values[index.l] ?? "",
    m: values[index.m] ?? "",
    p: values[index.p] ?? "",
    d100: values[index["100"]] ?? "",
    d75: values[index["75"]] ?? "",
    d50: values[index["50"]] ?? "",
    d25: values[index["25"]] ?? "",
    rf: values[index.rf] ?? "",
    rm: values[index.rm] ?? "",
    moral: values[index.moral] ?? "",
    karma: index.karma === undefined ? "" : values[index.karma] ?? "",
    vb: values[index.vb] ?? ""
  }));
  const names = [...new Set(rows.map((row) => row.name).filter(Boolean))];
  const selectedName = names.map((name) => ({ name, score: nameScore(name, creatureName) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!selectedName || selectedName.score <= 0) return { error: `variante não identificada: ${creatureName}`, candidates: names };
  const selectedRows = rows.filter((row) => row.name === selectedName.name);
  const base = selectedRows[0];
  return {
    sourceVariant: selectedName.name,
    raw: { stage: base.stage, ef: base.ef, eh: base.eh, defense: base.defense, rf: base.rf, rm: base.rm, moral: base.moral, karma: base.karma, vb: base.vb },
    stage: parseNumber(base.stage, 1),
    ef: parseNumber(base.ef),
    eh: parseNumber(base.eh),
    defense: parseDefense(base.defense),
    rf: parseNumber(base.rf),
    rm: parseNumber(base.rm),
    moral: parseNumber(base.moral),
    karma: parseNumber(base.karma),
    vb: parseNumber(base.vb),
    attacks: selectedRows.filter((row) => row.attack && !/^\(?ver texto\)?$/i.test(row.attack)).map((row) => ({
      name: row.attack,
      raw: { l: row.l, m: row.m, p: row.p, d100: row.d100, d75: row.d75, d50: row.d50, d25: row.d25 },
      l: parseNumber(row.l), m: parseNumber(row.m), p: parseNumber(row.p),
      damage: { d100: parseNumber(row.d100), d75: parseNumber(row.d75), d50: parseNumber(row.d50), d25: parseNumber(row.d25) }
    })),
    candidates: names
  };
}

function sectionHtml(html, headingPattern) {
  const match = html.match(new RegExp(`<h5[^>]*>\\s*${headingPattern}\\s*</h5>([\\s\\S]*?)(?=<h5\\b|<br\\s*/?>\\s*<div>\\s*<table[^>]+grdAtaques|$)`, "i"));
  return match?.[1] ?? "";
}

function selectVariantText(section, creatureName) {
  const items = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => match[1]);
  if (!items.length) return cleanText(section);
  const selected = items.map((item) => {
    const label = cleanText(item.match(/^\s*<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? "");
    return { item, label, score: nameScore(label, creatureName) };
  }).sort((a, b) => b.score - a.score)[0];
  return cleanText((selected?.score ?? -1) > 0 ? selected.item.replace(/^\s*<b\b[^>]*>[\s\S]*?<\/b>\s*:\s*/i, "") : section);
}

function parseAttributes(html, creatureName) {
  const value = selectVariantText(sectionHtml(html, "Atributos"), creatureName);
  const attributes = {};
  for (const code of ["INT", "AUR", "CAR", "FOR", "FIS", "AGI", "PER"]) {
    const raw = value.match(new RegExp(`${code}\\s*\\(([^)]+)\\)`, "i"))?.[1] ?? "";
    attributes[code.toLowerCase()] = /^i$/i.test(raw.trim()) ? -7 : parseNumber(raw);
  }
  return { raw: value, values: attributes };
}

function parseDimensions(html, creatureName) {
  const section = sectionHtml(html, "Peso\\s*\\/\\s*(?:Altura|Comprimento)");
  const value = selectVariantText(section, creatureName);
  const [weightRaw = "", heightRaw = ""] = value.split("/").map((entry) => entry.trim());
  return { raw: value, weightRaw, heightRaw, weight: parseNumber(weightRaw), height: parseNumber(heightRaw) };
}

function extractBiography(html, sourceUrl) {
  const labelEnd = html.search(/<label[^>]+Destaque1[^>]*>[\s\S]*?<\/label>/i);
  const startSearch = labelEnd >= 0 ? html.slice(labelEnd).match(/<(?:img|p)\b/i) : null;
  if (!startSearch) return "";
  const start = labelEnd + startSearch.index;
  const endMatch = html.slice(start).match(/<br\s*\/?>\s*<div>\s*<table[^>]+grdAtaques/i);
  const end = endMatch ? start + endMatch.index : html.length;
  let content = html.slice(start, end).trim();
  // A biografia deve permanecer como texto de consulta. O único link clicável
  // é a fonte oficial acrescentada ao final, evitando referências parciais e
  // inconsistentes entre habilidades e técnicas mencionadas no corpo.
  content = content.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  content = content.replace(/\b(href|src)=(?:"([^"]*)"|'([^']*)')/gi, (all, attribute, doubleQuoted, singleQuoted) => {
    const quote = doubleQuoted !== undefined ? '"' : "'";
    const target = decodeEntities(doubleQuoted ?? singleQuoted).trim();
    if (/^(?:https?:|data:|mailto:|tel:|#|@UUID\[|systems\/)/i.test(target)) return all;
    try {
      const absolute = new URL(target, sourceUrl).href.replace(/&/g, "&amp;");
      return `${attribute}=${quote}${absolute}${quote}`;
    } catch {
      return all;
    }
  });
  return `${content}\n<hr>\n<p class="tagmar-fonte-oficial" style="clear: both; margin-top: 1rem;"><strong>Consultar fonte oficial:</strong> <a href="${sourceUrl}" target="_blank" rel="noopener">${sourceUrl}</a></p>`;
}

function extractImage(html, sourceUrl) {
  const raw = html.match(/<img\s+[^>]*src=['"]([^'"]*\/images\/criaturas\/[^'"]+)['"]/i)?.[1];
  const cleaned = decodeEntities(raw ?? "").replace(/<br\s*\/?>$/i, "");
  return cleaned ? new URL(cleaned, sourceUrl).href : null;
}

const creatures = [];
const errors = [];
for (const detail of details.details) {
  const html = await readFile(join(cacheDir, "details", detail.file), "utf8");
  const document = parse(html);
  const combat = parseCombatTable(document, detail.name);
  if (combat.error) errors.push(`${detail.name}: ${combat.error}`);
  const attributes = parseAttributes(html, detail.name);
  const dimensions = parseDimensions(html, detail.name);
  creatures.push({
    key: detail.key, name: detail.name, categoryCode: detail.categoryCode, categoryLabel: detail.categoryLabel,
    sourceUrl: detail.url, sourceHash: detail.hash, imageUrl: extractImage(html, detail.url),
    biography: extractBiography(html, detail.url), attributes, dimensions, combat
  });
}

const report = {
  generatedAt: new Date().toISOString(), source: "details.json", creatures, errors,
  totals: {
    creatures: creatures.length,
    completeCombatTables: creatures.filter((creature) => !creature.combat.error).length,
    attacks: creatures.reduce((sum, creature) => sum + (creature.combat.attacks?.length ?? 0), 0),
    biographies: creatures.filter((creature) => creature.biography).length,
    attributes: creatures.filter((creature) => creature.attributes.raw).length,
    dimensions: creatures.filter((creature) => creature.dimensions.raw).length
  }
};
await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, "full-details.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: join(cacheDir, "full-details.json"), ...report.totals, errors }, null, 2));
if (errors.length) process.exitCode = 1;
