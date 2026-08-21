import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync", "creatures");
const pilot = process.argv.includes("--pilot");
const mechanics = JSON.parse(await readFile(join(cacheDir, pilot ? "mechanics-pilot.json" : "mechanics.json"), "utf8"));
const outputDir = join(cacheDir, "technique-pages");
const headers = { "User-Agent": "Tagmar-Foundry-Compendium-Sync/1.0 (+https://github.com/piratabarba-blip/tagmar3_rpg-master)" };
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function pageUrl(pageName) {
  return `https://tagmar.com.br/wiki/Default.aspx?PageName=${encodeURIComponent(pageName).replace(/%20/g, "+")}`;
}

function restUrl(pageName) {
  return `https://tagmar.com.br/wiki/rest.aspx?PageName=${encodeURIComponent(pageName).replace(/%20/g, "+")}`;
}

function extractDefault(html) {
  const marker = "<!-- INICIO do Corpo de Texto -->";
  const endMarker = "<!-- FIM do Corpo de Texto -->";
  const first = html.indexOf(marker);
  const start = html.indexOf(marker, first + marker.length);
  const end = html.indexOf(endMarker, start + marker.length);
  if (start < 0 || end < 0) throw new Error("marcadores do corpo não encontrados");
  return html.slice(start + marker.length, end).trim();
}

function extractRest(html) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]?.trim();
  if (!body || !/<h[1-6][^>]*>/i.test(body)) throw new Error("resposta REST sem verbete");
  return body;
}

async function fetchPage(pageName) {
  const attempts = [
    { transport: "rest", url: restUrl(pageName), extract: extractRest },
    { transport: "default", url: pageUrl(pageName), extract: extractDefault }
  ];
  const failures = [];
  for (const attempt of attempts) {
    try {
      const response = await fetch(attempt.url, { headers });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return { body: attempt.extract(await response.text()), transport: attempt.transport, fetchUrl: attempt.url };
    } catch (error) {
      failures.push(`${attempt.transport}: ${error.message}`);
    }
  }
  throw new Error(`${pageName}: ${failures.join("; ")}`);
}

const pageNames = [...new Set(mechanics.creatures.flatMap((creature) => creature.tecnicas)
  .map((technique) => technique.pageName)
  .filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
const pages = [];
await mkdir(outputDir, { recursive: true });
for (const pageName of pageNames) {
  const page = await fetchPage(pageName);
  const filename = `${digest(pageName).slice(0, 16)}.html`;
  await writeFile(join(outputDir, filename), page.body, "utf8");
  pages.push({ pageName, url: pageUrl(pageName), fetchUrl: page.fetchUrl, transport: page.transport, hash: digest(page.body.replace(/\s+/g, " ")), file: filename });
  await sleep(750);
}

const outputFile = pilot ? "technique-pages-pilot.json" : "technique-pages.json";
await writeFile(join(cacheDir, outputFile), `${JSON.stringify({ generatedAt: new Date().toISOString(), pages }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: join(cacheDir, outputFile), pages: pages.length, pageNames }, null, 2));
