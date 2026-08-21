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
const skipErrors = process.argv.includes("--skip-errors");
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

function restPageUrl(pageName) {
  return `${config.restBaseUrl}${encodeURIComponent(pageName).replace(/%20/g, "+")}`;
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

function extractRestBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) throw new Error("Corpo da resposta REST não encontrado");
  const body = match[1].trim();
  if (!body || !/<h[1-6][^>]*>/i.test(body)) throw new Error("Resposta REST sem conteúdo de verbete");
  return body;
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
  const headers = { "User-Agent": "Tagmar-Foundry-Compendium-Sync/1.0 (+https://github.com/piratabarba-blip/tagmar3_rpg-master)" };
  const attempts = [
    // A página normal preserva tabelas e estrutura editorial necessárias aos
    // geradores; o endpoint REST é apenas o fallback para verbetes simples.
    { transport: "default", fetchUrl: url, extract: extractBody },
    { transport: "rest", fetchUrl: restPageUrl(pageName), extract: extractRestBody }
  ];
  const failures = [];
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.fetchUrl, { headers });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body = attempt.extract(await response.text());
      return { pageName, url, fetchUrl: attempt.fetchUrl, transport: attempt.transport, body, hash: digest(normalizeBody(body)) };
    } catch (error) {
      failures.push(`${attempt.transport}: ${error.message}`);
    }
  }
  throw new Error(`${url} — ${failures.join("; ")}`);
}

async function loadPreviousManifest() {
  try { return JSON.parse(await readFile(manifestPath, "utf8")); }
  catch { return { pages: [] }; }
}

const previous = await loadPreviousManifest();
const currentPages = [];
const failedPages = [];

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
  const prefetched = new Map();
  const discoveryQueue = [...category.indexPages];
  while (discoveryQueue.length) {
    const indexPage = discoveryQueue.shift();
    if (prefetched.has(indexPage)) continue;
    const index = await fetchPage(indexPage);
    prefetched.set(indexPage, index);
    if (category.pagePrefixes.length) {
      for (const pageName of discoverLinks(index.body, category.pagePrefixes)) {
        const isNew = !discovered.has(pageName);
        discovered.add(pageName);
        if (isNew && category.recursiveDiscovery) discoveryQueue.push(pageName);
      }
    }
    await sleep(config.requestDelayMs);
  }

  const selectedPages = [...(indexesOnly ? category.indexPages : discovered)]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .slice(0, pageLimit);
  for (const pageName of selectedPages) {
    let page;
    try {
      page = prefetched.get(pageName) ?? await fetchPage(pageName);
    } catch (error) {
      if (!skipErrors) throw error;
      failedPages.push({ category: category.id, pageName, url: pageUrl(pageName), error: error.message });
      continue;
    }
    currentPages.push({ category: category.id, pageName, url: page.url, fetchUrl: page.fetchUrl, transport: page.transport, hash: page.hash });
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

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), total: currentPages.length, added, changed, removed, unchanged, failed: failedPages }, null, 2));

if (writeSnapshot) {
  await mkdir(cacheDir, { recursive: true });
  const preservedPages = previous.pages.filter((page) => {
    if (!selectedCategoryIds.has(page.category)) return true;
    const pageKey = `${page.category}:${page.pageName}`;
    if (authoritativeCategoryScan) {
      return failedPages.some((failed) => `${failed.category}:${failed.pageName}` === pageKey);
    }
    return !currentKeys.has(`${page.category}:${page.pageName}`);
  });
  const mergedPages = [...preservedPages, ...currentPages]
    .sort((a, b) => `${a.category}:${a.pageName}`.localeCompare(`${b.category}:${b.pageName}`, "pt-BR"));
  await writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), pages: mergedPages }, null, 2)}\n`, "utf8");
  console.error(`Snapshot salvo em ${manifestPath}`);
}
