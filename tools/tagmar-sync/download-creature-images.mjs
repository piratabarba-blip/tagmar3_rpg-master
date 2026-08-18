import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheRoot = join(root, ".cache", "tagmar-sync");
const outputDir = join(root, "assets", "tokens", "oficiais-sincronizados");
const details = JSON.parse(await readFile(join(cacheRoot, "creatures", "full-details.json"), "utf8"));
const delayMs = 1000;
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const normalizeCreatureImageUrl = (url) => String(url ?? "")
  .replace(/%3Cbr(?:%2F|\/)?%3E$/i, "")
  .replace(/<br\s*\/?>$/i, "");

export function localCreatureImagePath(url) {
  if (!url) return null;
  const normalizedUrl = normalizeCreatureImageUrl(url);
  const extension = extname(new URL(normalizedUrl).pathname).toLocaleLowerCase("pt-BR") || ".png";
  const id = createHash("sha256").update(normalizedUrl).digest("hex").slice(0, 20);
  return `systems/tagmar_rpg/assets/tokens/oficiais-sincronizados/${id}${extension}`;
}

const urls = [...new Set(details.creatures.map((creature) => creature.imageUrl).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "pt-BR"));
await mkdir(outputDir, { recursive: true });

let downloaded = 0;
let existing = 0;
const images = {};
const failures = [];
for (const [index, url] of urls.entries()) {
  const normalizedUrl = normalizeCreatureImageUrl(url);
  const relative = localCreatureImagePath(url).replace("systems/tagmar_rpg/", "");
  const destination = join(root, ...relative.split("/"));
  try {
    if ((await stat(destination)).size > 0) {
      existing += 1;
      images[url] = localCreatureImagePath(url);
      continue;
    }
  } catch { /* baixa o arquivo ausente */ }

  const response = await fetch(normalizedUrl, {
    headers: { "User-Agent": "Tagmar-Foundry-Compendium-Sync/1.0 (+https://github.com/piratabarba-blip/tagmar3_rpg-master)" }
  });
  if (!response.ok) {
    failures.push({ url: normalizedUrl, status: response.status, statusText: response.statusText });
    console.error(`[${index + 1}/${urls.length}] ${response.status} ${response.statusText}: ${normalizedUrl}`);
    if (index < urls.length - 1) await sleep(delayMs);
    continue;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLocaleLowerCase("pt-BR").startsWith("image/")) {
    throw new Error(`Resposta não é imagem (${contentType}): ${normalizedUrl}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Imagem vazia: ${normalizedUrl}`);
  await writeFile(destination, bytes);
  images[url] = localCreatureImagePath(url);
  downloaded += 1;
  console.log(`[${index + 1}/${urls.length}] ${relative}`);
  if (index < urls.length - 1) await sleep(delayMs);
}

const manifestPath = join(cacheRoot, "creature-images.json");
await writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), images, failures }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputDir, manifestPath, images: urls.length, available: Object.keys(images).length, downloaded, existing, failures }, null, 2));
