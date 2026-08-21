import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const cacheRoot = join(root, ".cache", "tagmar-sync");
const details = JSON.parse(await readFile(join(cacheRoot, "creatures", "full-details.json"), "utf8"));
const catalog = JSON.parse(await readFile(join(cacheRoot, "snapshot-criando-fichas-t3er.json"), "utf8"));
const packAudit = JSON.parse(await readFile(join(cacheRoot, "creatures", "magic-audit.json"), "utf8"));
const syncAudit = JSON.parse(await readFile(join(cacheRoot, "creature-sync-audit.json"), "utf8"));

const clean = (value) => String(value ?? "")
  .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
  .replace(/\s+/g, " ").trim();
const normalize = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
function section(biography, creatureName) {
  const html = String(biography ?? "").match(/<h5>\s*Magias e Poderes Especiais\s*<\/h5>\s*<p>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const normalizedCreature = normalize(creatureName);
  const variants = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => {
    const item = match[1];
    const label = clean(item.match(/^\s*<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? "");
    const normalizedLabel = normalize(label);
    const score = normalizedLabel && (normalizedCreature.includes(normalizedLabel) || normalizedLabel.includes(normalizedCreature)) ? normalizedLabel.length : 0;
    return { item, label, score };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
  if (!variants.length) return clean(html);
  return clean(variants[0].item.replace(/^\s*<b\b[^>]*>[\s\S]*?<\/b>\s*:\s*/i, ""));
}
const magicNames = [...new Set(catalog.documents.filter((item) => item.type === "Magia").map((item) => item.name))]
  .sort((a, b) => normalize(b).length - normalize(a).length);
const packedByActor = new Map(packAudit.rows.map((row) => [row.actor, row.magics]));

const rows = [];
for (const creature of details.creatures) {
  const raw = section(creature.biography, creature.name);
  if (!raw || /^(?:-|nenhuma|n[aã]o possui)$/i.test(raw)) continue;
  const normalizedRaw = ` ${normalize(raw)} `;
  const matched = [];
  let remainder = normalizedRaw;
  for (const name of magicNames) {
    const needle = ` ${normalize(name)} `;
    if (!needle.trim() || !remainder.includes(needle)) continue;
    matched.push(name);
    remainder = remainder.replaceAll(needle, " ");
  }
  const packed = packedByActor.get(creature.name) ?? [];
  const packedNames = new Set(packed.map((item) => normalize(String(item.name).replace(/\s*\([^)]*\)\s*$/g, ""))));
  const missingMatched = matched.filter((name) => !packedNames.has(normalize(name)));
  rows.push({ actor: creature.name, sourceUrl: creature.sourceUrl, officialText: raw, matchedCatalogNames: matched, packedMagicCount: packed.length, missingMatched });
}
rows.sort((a, b) => b.missingMatched.length - a.missingMatched.length || a.actor.localeCompare(b.actor, "pt-BR"));
const officialOnlyNames = new Set(syncAudit.officialOnly.map((row) => row.name));
const report = {
  generatedAt: new Date().toISOString(), sections: rows.length,
  sectionsWithCatalogMatches: rows.filter((row) => row.matchedCatalogNames.length).length,
  actorsWithMissingMatched: rows.filter((row) => row.missingMatched.length).length,
  officialOnlyWithMagicText: rows.filter((row) => officialOnlyNames.has(row.actor)).map((row) => row.actor),
  rows
};
const output = join(cacheRoot, "creatures", "official-magic-audit.json");
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, sections: report.sections, sectionsWithCatalogMatches: report.sectionsWithCatalogMatches, actorsWithMissingMatched: report.actorsWithMissingMatched, officialOnlyWithMagicText: report.officialOnlyWithMagicText, topMissing: rows.filter((row) => row.missingMatched.length).slice(0, 25).map((row) => ({ actor: row.actor, packed: row.packedMagicCount, missing: row.missingMatched })) }, null, 2));
