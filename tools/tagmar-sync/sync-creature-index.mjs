import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync", "creatures");
const baseUrl = "https://tagmar.com.br/Criaturas.aspx?Tipo=";
const detailBaseUrl = "https://tagmar.com.br/";
const categoryIndexUrl = "https://tagmar.com.br/Criaturas.aspx";
const headers = { "User-Agent": "Tagmar-Foundry-Compendium-Sync/1.0 (+https://github.com/piratabarba-blip/tagmar3_rpg-master)" };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const digest = (value) => createHash("sha256").update(value).digest("hex");

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return value
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function cleanText(value) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractCreatures(html, categoryCode, categoryLabel) {
  const creatures = [];
  const seen = new Set();
  const pattern = /<a\b[^>]*href=["']([^"']*Criaturas_detalhe\.aspx\?[^"']*Nome=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const name = cleanText(match[2]);
    if (!name) continue;
    const href = decodeEntities(match[1]);
    const url = new URL(href, detailBaseUrl).toString();
    const key = `${categoryCode}:${name.normalize("NFC").toLocaleLowerCase("pt-BR")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    creatures.push({ key, name, categoryCode, categoryLabel, url });
  }
  return creatures;
}

function extractCategories(html) {
  const categories = [];
  const seen = new Set();
  const pattern = /<a\b[^>]*href=["']([^"']*Criaturas\.aspx\?[^"']*Tipo=([A-Z0-9]+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const code = match[2].toUpperCase();
    const label = cleanText(match[3]);
    if (!label || seen.has(code)) continue;
    seen.add(code);
    categories.push([code, label]);
  }
  return categories;
}

await mkdir(cacheDir, { recursive: true });
const categoryIndexResponse = await fetch(categoryIndexUrl, { headers });
if (!categoryIndexResponse.ok) throw new Error(`Índice de categorias: ${categoryIndexResponse.status} ${categoryIndexResponse.statusText}`);
const categoryIndexHtml = await categoryIndexResponse.text();
const categories = extractCategories(categoryIndexHtml);
if (categories.length !== 19) throw new Error(`Esperadas 19 categorias oficiais, encontradas ${categories.length}`);
await writeFile(join(cacheDir, "categories.html"), categoryIndexHtml, "utf8");
const allCreatures = [];
const snapshots = [];
for (const [code, label] of categories) {
  const url = `${baseUrl}${code}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${label}: ${response.status} ${response.statusText}`);
  const html = await response.text();
  const creatures = extractCreatures(html, code, label);
  if (!creatures.length) throw new Error(`${label}: nenhuma criatura encontrada em ${url}; confirme o código ${code}`);
  const hash = digest(html.replace(/\s+/g, " "));
  await writeFile(join(cacheDir, `${code}.html`), html, "utf8");
  snapshots.push({ code, label, url, hash, count: creatures.length });
  allCreatures.push(...creatures.map((creature) => ({ ...creature, indexHash: hash })));
  await sleep(1000);
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "https://tagmar.com.br/Criaturas.aspx",
  snapshots,
  creatures: allCreatures.sort((a, b) => `${a.categoryLabel}:${a.name}`.localeCompare(`${b.categoryLabel}:${b.name}`, "pt-BR"))
};
await writeFile(join(cacheDir, "index.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ categories: snapshots.length, creatures: allCreatures.length, snapshots }, null, 2));
