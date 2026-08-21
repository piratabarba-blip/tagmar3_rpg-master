import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheDir = join(root, ".cache", "tagmar-sync");
const category = process.argv.find((argument) => argument.startsWith("--category="))?.slice(11);
const pageName = process.argv.find((argument) => argument.startsWith("--page="))?.slice(7);
if (!category || !pageName) throw new Error("Use --category=id --page=Nome da página");

const decode = (value) => value
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"");
const text = (value) => decode(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
if (!page) throw new Error("Página não encontrada no manifesto");
const filename = `${createHash("sha256").update(`${category}:${pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", filename), "utf8");
if (process.argv.includes("--text")) {
  console.log(text(html));
  process.exit(0);
}
let previousEnd = 0;
let index = 0;
for (const match of html.matchAll(/<table[^>]*>(.*?)<\/table>/gis)) {
  const context = text(html.slice(previousEnd, match.index)).slice(-180);
  const rows = [...match[1].matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((row) =>
    [...row[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gis)].map((cell) => text(cell[1]))
  );
  console.log(JSON.stringify({ table: index, context, rows }, null, 2));
  previousEnd = (match.index ?? 0) + match[0].length;
  index += 1;
}
if (!index) console.log(JSON.stringify({ tableCount: 0, text: text(html).slice(0, 2000) }, null, 2));
