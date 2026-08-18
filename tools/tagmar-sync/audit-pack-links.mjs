import { createRequire } from "node:module";
import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const foundryModules = process.env.TAGMAR_FOUNDRY_MODULES
  ?? "D:/FOUNDRY VTT 14/FoundryVTT-WindowsPortable-14.366/App/resources/app/node_modules";
const require = createRequire(import.meta.url);
const { ClassicLevel } = require(`${foundryModules}/classic-level`);
const packsRoot = join(root, "packs");

function collectStrings(value, path = "$", output = []) {
  if (typeof value === "string") output.push({ path, value });
  else if (Array.isArray(value)) value.forEach((entry, index) => collectStrings(entry, `${path}[${index}]`, output));
  else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) collectStrings(entry, `${path}.${key}`, output);
  }
  return output;
}

function htmlAttributes(content) {
  return [...content.matchAll(/\b(href|src)=(?:"([^"]*)"|'([^']*)')/gi)].map((match) => ({
    attribute: match[1].toLowerCase(),
    value: (match[2] ?? match[3]).replace(/&amp;/gi, "&").trim()
  }));
}

function isRelative({ attribute, value }) {
  const allowed = attribute === "href"
    ? /^(?:https?:|mailto:|tel:|#|@UUID\[)/i
    : /^(?:https?:|data:|systems\/)/i;
  return !allowed.test(value);
}

const packNames = (await readdir(packsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "pt-BR"));
const report = [];
for (const packName of packNames) {
  const db = new ClassicLevel(join(packsRoot, packName), { keyEncoding: "utf8", valueEncoding: "json", readOnly: true });
  const findings = [];
  let records = 0;
  let databaseError = null;
  try {
    await db.open();
    for await (const [key, value] of db.iterator()) {
      records += 1;
      for (const field of collectStrings(value)) {
        for (const attribute of htmlAttributes(field.value)) {
          if (isRelative(attribute) || /localhost(?::\d+)?/i.test(attribute.value)) {
            findings.push({ key, document: value.name ?? null, field: field.path, ...attribute });
          }
        }
      }
    }
  } catch (error) {
    databaseError = error?.cause?.message ?? error?.message ?? String(error);
  } finally {
    if (db.status === "open") await db.close();
  }
  report.push({ pack: packName, records, brokenRelativeUrls: findings.length, databaseError, examples: findings.slice(0, 10) });
}

const total = report.reduce((sum, entry) => sum + entry.brokenRelativeUrls, 0);
const unreadablePacks = report.filter((entry) => entry.databaseError).length;
console.log(JSON.stringify({ packs: report.length, unreadablePacks, brokenRelativeUrls: total, report }, null, 2));
if (total) process.exitCode = 1;
