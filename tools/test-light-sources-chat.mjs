/**
 * Light Sources chat translation regression, without a server or world writes.
 * TAGMAR_TEST_FOUNDRY_PUBLIC: installed Foundry public directory.
 * TAGMAR_TEST_LIGHT_SOURCES: unmodified Light Sources module directory.
 * Usage: node tools/test-light-sources-chat.mjs [system-directory]
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const publicRoot = process.env.TAGMAR_TEST_FOUNDRY_PUBLIC;
const moduleRoot = process.env.TAGMAR_TEST_LIGHT_SOURCES;
assert.ok(publicRoot && moduleRoot, "Set TAGMAR_TEST_FOUNDRY_PUBLIC and TAGMAR_TEST_LIGHT_SOURCES");
const json = async p => JSON.parse(await readFile(p, "utf8"));
const manifest = await json(path.join(root, "system.json"));
const moduleManifest = await json(path.join(moduleRoot, "module.json"));
const en = await json(path.join(moduleRoot, "languages/en.json"));
const language = manifest.languages.find(l => l.lang === "pt-BR" && l.module === "light-sources");
assert.ok(language, "Translation must be gated on the optional module");
const pt = await json(path.join(root, language.path));
assert.deepEqual(Object.keys(pt), ["LIGHTSOURCES"]);
assert.deepEqual(Object.keys(pt.LIGHTSOURCES), ["Chat"]);
assert.deepEqual(Object.keys(pt.LIGHTSOURCES.Chat).sort(), Object.keys(en.LIGHTSOURCES.Chat).sort());
const variables = text => [...text.matchAll(/\{([^}]+)\}/g)].map(m => m[1]).sort();
for (const [key, text] of Object.entries(pt.LIGHTSOURCES.Chat)) {
    assert.equal(typeof text, "string");
    assert.ok(text.trim());
    assert.deepEqual(variables(text), variables(en.LIGHTSOURCES.Chat[key]), key);
}

const core = await readFile(path.join(publicRoot, "scripts/foundry.mjs"), "utf8");
const start = core.indexOf("class Localization {");
const alias = core.indexOf("Object.defineProperties(Localization.prototype", start);
const end = core.indexOf("\n", alias);
assert.ok(start >= 0 && alias > start && end > alias);
const files = new Map();
for (const lang of manifest.languages) files.set(lang.path, await json(path.join(root, lang.path)));
for (const lang of moduleManifest.languages) {
    files.set("modules/light-sources/" + lang.path, await json(path.join(moduleRoot, lang.path)));
}
function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
        if (value && typeof value === "object" && !Array.isArray(value)) merge(target[key] ??= {}, value);
        else target[key] = value;
    }
    return target;
}
const moduleData = {...moduleManifest, active: true,
    languages: moduleManifest.languages.map(l => ({...l, path: "modules/light-sources/" + l.path}))};
const loaded = [];
const context = vm.createContext({
    console: {log() {}, error: (...args) => {throw Error(args.join(" "));}},
    CONFIG: {supportedLanguages: {"pt-BR": "Português (Brasil)", en: "English", it: "Italiano"}, debug: {}},
    CONST: {CORE_SUPPORTED_LANGUAGES: [], vtt: "Foundry test"},
    game: {system: manifest, modules: new Map([["light-sources", moduleData]])},
    document: {documentElement: {setAttribute() {}}},
    foundry: {utils: {
        mergeObject: merge, expandObject: x => x,
        getProperty: (object, key) => key.split(".").reduce((value, part) => value?.[part], object)
    }},
    Hooks$1: {onError: (_name, error) => {throw error;}},
    fetch: async source => {
        assert.ok(files.has(source), "Unexpected translation request: " + source);
        loaded.push(source);
        return {status: 200, json: async () => structuredClone(files.get(source))};
    },
    ChatMessage: {implementation: {getSpeaker: ({actor}) => ({alias: actor?.name})}}
});
vm.runInContext(core.slice(start, end) + "\nglobalThis.Localization = Localization;", context);
const i18n = new context.Localization("pt-BR.core");
await i18n.setLanguage("pt-BR");
assert.equal(i18n.localize("LIGHTSOURCES.Chat.ExpiredTitle"), "A luz se apagou");
const body = i18n.format("LIGHTSOURCES.Chat.Expired", {item: "Tochas", actor: "Donovan Hell"});
assert.equal(body, "A fonte de luz “Tochas”, carregada por Donovan Hell, se apagou.");
assert.equal(i18n.format("LIGHTSOURCES.Chat.LitPattern", {item: "Tochas", actor: "Donovan Hell", pattern: "Luz forte"}),
    "Donovan Hell acende a fonte de luz “Tochas” (Luz forte).");
assert.equal(i18n.localize("LIGHTSOURCES.Chat.Unknown"), "LIGHTSOURCES.Chat.Unknown");
// Untranslated controls keep the module's English fallback.
const hudKey = Object.keys(en.LIGHTSOURCES.Hud)[0];
assert.equal(i18n.localize("LIGHTSOURCES.Hud." + hudKey), en.LIGHTSOURCES.Hud[hudKey]);

// Use the installed module's unchanged card builder to verify the new text and styling.
const helpers = await readFile(path.join(moduleRoot, "scripts/helpers.js"), "utf8");
const functions = ["buildLightMessage", "buildChatCard"].map(name => {
    const match = helpers.match(new RegExp("^export function " + name + "\\([^\\n]*\\) \\{[\\s\\S]*?^\\}", "m"));
    assert.ok(match, name);
    return match[0].replace("export ", "");
}).join("\n");
vm.runInContext('const CHAT_CARD_ACCENT = "#ff9838"; const CHAT_CARD_BG = "modules/light-sources/assets/banner.webp";\n'
    + functions + "\nglobalThis.makeCard = buildLightMessage;", context);
const oldContent = "<h3>Light Burns Out</h3>";
const message = context.makeCard({name: "Donovan Hell"}, i18n.localize("LIGHTSOURCES.Chat.ExpiredTitle"), body);
assert.ok(message.content.includes("A luz se apagou") && message.content.includes(body));
assert.ok(message.content.includes("#ff9838") && message.content.includes("text-transform: uppercase"));
assert.equal(message.speaker.alias, "Donovan Hell");
assert.equal(oldContent, "<h3>Light Burns Out</h3>");

for (const lang of ["en", "it"]) {
    const original = files.get("modules/light-sources/languages/" + lang + ".json");
    const other = new context.Localization(lang + ".core");
    await other.setLanguage(lang);
    assert.equal(other.localize("LIGHTSOURCES.Chat.ExpiredTitle"), original.LIGHTSOURCES.Chat.ExpiredTitle);
}
moduleData.active = false;
loaded.length = 0;
const disabled = new context.Localization("pt-BR.core");
await disabled.setLanguage("pt-BR");
assert.equal(loaded.length, 0, "Do not load module-specific translation when Light Sources is inactive");
assert.equal(disabled.localize("LIGHTSOURCES.Chat.ExpiredTitle"), "LIGHTSOURCES.Chat.ExpiredTitle");
console.log("PASS " + manifest.id + ": 12 chat keys, placeholders, native localization, card styling, fallback, other languages and inactive module");
