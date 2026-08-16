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

const manifest = JSON.parse(await readFile(join(cacheDir, "manifest.json"), "utf8"));
const page = manifest.pages.find((entry) => entry.category === category && entry.pageName === pageName);
if (!page) throw new Error("Página não encontrada no manifesto");
const filename = `${createHash("sha256").update(`${category}:${pageName}`).digest("hex").slice(0, 16)}.html`;
const html = await readFile(join(cacheDir, "pages", filename), "utf8");
const links = new Set();
for (const match of html.matchAll(/href=["'][^"']*Default\.aspx\?PageName=([^"'&#]+)[^"']*["']/gi)) {
  let name = match[1];
  try { name = decodeURIComponent(name.replace(/\+/g, "%20")); } catch { /* preserva o original */ }
  links.add(name.replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim());
}
console.log([...links].map((name, index) => `${String(index + 1).padStart(2, "0")} ${name}`).join("\n"));
