import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const pagesDir = join(cacheDir, "pages");
const manifestPath = join(cacheDir, "manifest.json");
const writeSnapshot = process.argv.includes("--write");
const indexesOnly = process.argv.includes("--indexes-only");
const categoryArg = process.argv.find((arg) => arg.startsWith("--category="))?.split("=", 2)[1];
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=", 2)[1];
const pageLimit = limitArg ? Number.parseInt(limitArg, 10) : Number.POSITIVE_INFINITY;
const config = JSON.parse(await readFile(join(here, "sources.json"), "utf8"));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const canonicalName = (value) => decodeEntities(value)
  .replace(/\+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"" };
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function pageUrl(pageName) {
  return `${config.baseUrl}${encodeURIComponent(pageName).replace(/%20/g, "+")}`;
}

function extractBody(html) {
  const marker = "<!-- INICIO do Corpo de Texto -->";
  const endMarker = "<!-- FIM do Corpo de Texto -->";
  const first = html.indexOf(marker);
  const start = html.indexOf(marker, first + marker.length);
  const end = html.indexOf(endMarker, start + marker.length);
  if (start < 0 || end < 0) throw new Error("Marcadores do corpo da página não encontrados");
  return html.slice(start + marker.length, end).trim();
}

function normalizeBody(body) {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

function discoverLinks(body, prefixes) {
  const names = new Set();
  const hrefPattern = /href=["'][^"']*Default\.aspx\?PageName=([^"'&#]+)[^"']*["']/gi;
  for (const match of body.matchAll(hrefPattern)) {
    let raw = match[1];
    try { raw = decodeURIComponent(raw.replace(/\+/g, "%20")); } catch { /* mantém o valor original */ }
    const name = canonicalName(raw);
    if (prefixes.some((prefix) => name.toLocaleLowerCase("pt-BR").startsWith(prefix.toLocaleLowerCase("pt-BR")))) {
      names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

async function fetchPage(pageName) {
  const url = pageUrl(pageName);
  const response = await fetch(url, {
    headers: { "User-Agent": "Tagmar-Foundry-Compendium-Sync/1.0 (+https://github.com/piratabarba-blip/tagmar3_rpg-master)" }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const html = await response.text();
  const body = extractBody(html);
  return { pageName, url, body, hash: digest(normalizeBody(body)) };
}

async function loadPreviousManifest() {
  try { return JSON.parse(await readFile(manifestPath, "utf8")); }
  catch { return { pages: [] }; }
}

const previous = await loadPreviousManifest();
const currentPages = [];

const selectedCategories = categoryArg
  ? config.categories.filter((category) => category.id === categoryArg)
  : config.categories;
if (!selectedCategories.length) throw new Error(`Categoria desconhecida: ${categoryArg}`);
const selectedCategoryIds = new Set(selectedCategories.map((category) => category.id));
const previousSelectedPages = previous.pages.filter((page) => selectedCategoryIds.has(page.category));
const previousByKey = new Map(previousSelectedPages.map((page) => [`${page.category}:${page.pageName}`, page]));
const authoritativeCategoryScan = !indexesOnly && pageLimit === Number.POSITIVE_INFINITY;

for (const category of selectedCategories) {
  const discovered = new Set(category.indexPages);
  for (const indexPage of category.indexPages) {
    const index = await fetchPage(indexPage);
    if (category.pagePrefixes.length) {
      for (const pageName of discoverLinks(index.body, category.pagePrefixes)) discovered.add(pageName);
    }
    await sleep(config.requestDelayMs);
  }

  const selectedPages = [...(indexesOnly ? category.indexPages : discovered)]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .slice(0, pageLimit);
  for (const pageName of selectedPages) {
    const page = await fetchPage(pageName);
    currentPages.push({ category: category.id, pageName, url: page.url, hash: page.hash });
    if (writeSnapshot) {
      const filename = `${digest(`${category.id}:${pageName}`).slice(0, 16)}.html`;
      await mkdir(pagesDir, { recursive: true });
      await writeFile(join(pagesDir, filename), page.body, "utf8");
    }
    await sleep(config.requestDelayMs);
  }
}

const currentKeys = new Set(currentPages.map((page) => `${page.category}:${page.pageName}`));
const added = currentPages.filter((page) => !previousByKey.has(`${page.category}:${page.pageName}`));
const changed = currentPages.filter((page) => {
  const old = previousByKey.get(`${page.category}:${page.pageName}`);
  return old && old.hash !== page.hash;
});
const unchanged = currentPages.length - added.length - changed.length;
const removed = authoritativeCategoryScan
  ? previousSelectedPages.filter((page) => !currentKeys.has(`${page.category}:${page.pageName}`))
  : [];

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), total: currentPages.length, added, changed, removed, unchanged }, null, 2));

if (writeSnapshot) {
  await mkdir(cacheDir, { recursive: true });
  const preservedPages = previous.pages.filter((page) => {
    if (!selectedCategoryIds.has(page.category)) return true;
    if (authoritativeCategoryScan) return false;
    return !currentKeys.has(`${page.category}:${page.pageName}`);
  });
  const mergedPages = [...preservedPages, ...currentPages]
    .sort((a, b) => `${a.category}:${a.pageName}`.localeCompare(`${b.category}:${b.pageName}`, "pt-BR"));
  await writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: mergedPages }, null, 2)}\n`, "utf8");
  console.error(`Snapshot salvo em ${manifestPath}`);
}
