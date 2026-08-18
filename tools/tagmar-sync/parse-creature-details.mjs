import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync", "creatures");
const pilot = process.argv.includes("--pilot");
const detailsFile = pilot ? "details-pilot.json" : "details.json";
const outputFile = pilot ? "mechanics-pilot.json" : "mechanics.json";
const details = JSON.parse(await readFile(join(cacheDir, detailsFile), "utf8"));
const editorialOverrides = JSON.parse(await readFile(join(here, "creature-editorial-overrides.json"), "utf8"));

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return String(value)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

const cleanText = (value) => decodeEntities(String(value).replace(/<[^>]+>/g, " "))
  .replace(/\s+/g, " ")
  .trim();
const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("pt-BR");
const specialCreatureTechniques = new Set(["ataques multiplos", "bote", "carga aerea", "carga de quadrupede", "prender"]);

function applyEditorialOverrides(creatureName, techniques) {
  const result = techniques.map((entry) => ({ ...entry }));
  for (const override of editorialOverrides.overrides.filter((entry) => entry.creature === creatureName)) {
    if (override.type !== "replace-technique") continue;
    const index = result.findIndex((entry) => normalize(entry.name) === normalize(override.from));
    if (index < 0) throw new Error(`${creatureName}: técnica editorial de origem não encontrada: ${override.from}`);
    result[index] = {
      ...result[index],
      name: override.to,
      value: override.value,
      pageName: `Técnicas de combate - ${override.to}`,
      sourceUrl: `https://tagmar.com.br/wiki/Default.aspx?PageName=${encodeURIComponent(`Técnicas de combate - ${override.to}`)}`,
      editorialCorrection: { from: override.from, reason: override.reason }
    };
  }
  return result;
}

function decodePageName(href) {
  const raw = href.match(/[?&]PageName=([^&#]+)/i)?.[1] ?? "";
  try { return decodeURIComponent(raw.replace(/\+/g, "%20")).replace(/\s+/g, " ").trim(); }
  catch { return decodeEntities(raw).replace(/\+/g, " ").replace(/\s+/g, " ").trim(); }
}

function parseLinkedEntries(section) {
  const entries = [];
  const pattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*\(\s*(-?\d+)\s*\)/gi;
  for (const match of section.matchAll(pattern)) {
    const href = decodeEntities(match[1]);
    const pageName = decodePageName(href);
    const name = cleanText(match[2]);
    const value = Number.parseInt(match[3], 10);
    let kind = "unknown";
    if (/^Habilidades\s*-/i.test(pageName)) kind = "habilidade";
    if (/^T[eé]cnicas de combate\s*-/i.test(pageName)) kind = "tecnica";
    entries.push({ kind, name, value, pageName, sourceUrl: new URL(href, "https://tagmar.com.br/").href });
  }
  return entries;
}

function parseUnlinkedTechniques(section, linkedEntries) {
  let remainder = section.replace(/<a\s+[^>]*href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>\s*\(\s*-?\d+\s*\)/gi, " ");
  remainder = cleanText(remainder).replace(/^\s*\/\s*/, "").trim();
  const entries = [];
  const knownNames = new Set(linkedEntries.map((entry) => entry.name.toLocaleLowerCase("pt-BR")));
  const pattern = /(?:^|[,/])\s*([^,/(]+?)\s*\(\s*([^)]+?)\s*\)/g;
  for (const match of remainder.matchAll(pattern)) {
    const name = match[1].trim();
    if (!name || knownNames.has(name.toLocaleLowerCase("pt-BR"))) continue;
    const parameter = match[2].trim();
    const numeric = /^-?\d+$/.test(parameter) ? Number.parseInt(parameter, 10) : null;
    entries.push({
      kind: specialCreatureTechniques.has(normalize(name)) ? "tecnica-especial-criatura" : "tecnica-especifica",
      name,
      ...(numeric == null ? { difficulty: parameter } : { value: numeric }),
      pageName: null,
      sourceUrl: null
    });
  }
  return entries;
}

function selectCreatureVariant(section, creatureName) {
  const listItems = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => match[1]);
  if (!listItems.length) return { section, variant: null };
  const normalizedCreature = normalize(creatureName);
  const candidates = listItems.map((item) => {
    const label = cleanText(item.match(/^\s*<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? "");
    return { item, label, normalizedLabel: normalize(label) };
  }).filter((candidate) => candidate.normalizedLabel && normalizedCreature.includes(candidate.normalizedLabel));
  if (!candidates.length) {
    if (listItems.length === 1) return { section: listItems[0], variant: null };
    return null;
  }
  candidates.sort((a, b) => b.normalizedLabel.length - a.normalizedLabel.length);
  const selected = candidates[0];
  return {
    section: selected.item.replace(/^\s*<b\b[^>]*>[\s\S]*?<\/b>\s*:\s*/i, ""),
    variant: selected.label
  };
}

const creatures = [];
const errors = [];
for (const detail of details.details) {
  const html = await readFile(join(cacheDir, "details", detail.file), "utf8");
  const sectionMatch = html.match(/<h5>\s*Habilidades\s*\/\s*T[eé]cnicas de Combate\s*<\/h5>\s*<p>([\s\S]*?)<\/p>/i);
  if (!sectionMatch) {
    errors.push(`${detail.name}: seção de Habilidades / Técnicas de Combate não encontrada`);
    continue;
  }
  const selectedVariant = selectCreatureVariant(sectionMatch[1], detail.name);
  if (!selectedVariant) {
    errors.push(`${detail.name}: variante não identificada na seção de Habilidades / Técnicas de Combate`);
    continue;
  }
  const linked = parseLinkedEntries(selectedVariant.section);
  const unlinked = parseUnlinkedTechniques(selectedVariant.section, linked);
  const unknown = linked.filter((entry) => entry.kind === "unknown");
  if (unknown.length) errors.push(`${detail.name}: links sem classificação: ${unknown.map((entry) => entry.pageName).join(", ")}`);
  creatures.push({
    key: detail.key,
    name: detail.name,
    categoryCode: detail.categoryCode,
    categoryLabel: detail.categoryLabel,
    sourceUrl: detail.url,
    sourceHash: detail.hash,
    sourceVariant: selectedVariant.variant,
    habilidades: linked.filter((entry) => entry.kind === "habilidade"),
    tecnicas: applyEditorialOverrides(detail.name, [...linked.filter((entry) => entry.kind === "tecnica"), ...unlinked])
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  source: detailsFile,
  creatures,
  errors,
  totals: {
    creatures: creatures.length,
    habilidades: creatures.reduce((sum, creature) => sum + creature.habilidades.length, 0),
    tecnicas: creatures.reduce((sum, creature) => sum + creature.tecnicas.length, 0),
    tecnicasEspecificas: creatures.reduce((sum, creature) => sum + creature.tecnicas.filter((entry) => entry.kind === "tecnica-especifica").length, 0)
  }
};

await mkdir(cacheDir, { recursive: true });
await writeFile(join(cacheDir, outputFile), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: join(cacheDir, outputFile), ...report.totals, errors }, null, 2));
if (errors.length) process.exitCode = 1;
