import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../modules/tagmar.js", import.meta.url), "utf8");
const start = source.indexOf('Hooks.once("polyglot.init"');
const end = source.indexOf('\nHooks.once("ready"', start);
assert.ok(start >= 0 && end > start, "Polyglot hook boundaries");
const hookSource = source.slice(start, end);
class LanguageProvider {
  constructor(id) { this.id = id; }
}

// Mirror both private-method ownership models; an incorrect receiver must throw.
class LegacyAPI {
  providers = {};
  registerSystem(Provider) { this.#register("system.test", Provider); }
  #register(id, Provider) { this.providers[id] = new Provider(id); }
}
class Polyglot {
  providers = {};
  api = { registerSystem: this.#registerSystem };
  #registerSystem(Provider) { this.#register("system.test", Provider); }
  #register(id, Provider) { this.providers[id] = new Provider(id); }
}
assert.throws(() => new Polyglot().api.registerSystem(LanguageProvider),
  /Receiver must be an instance of class Polyglot/);

function run(version, polyglot, registry) {
  let hook;
  const game = { polyglot, modules: new Map([["polyglot", {version}]]) };
  vm.runInNewContext(hookSource, {
    game, Hooks: { once(name, fn) { assert.equal(name, "polyglot.init"); hook = fn; } }
  });
  hook(LanguageProvider);
  assert.equal(Object.keys(registry).length, 1, "Register exactly one provider");
  const provider = registry["system.test"];
  assert.ok(provider instanceof LanguageProvider);
  assert.ok(provider.languages.males, "Keep Tagmar language catalogue");
  assert.deepEqual(Array.from(provider.getUserLanguages({
    type: "Personagem", system: { defesa: { categoria: "males;leva" } }
  })[0]), ["males", "leva"]);
  assert.equal(provider.getUserLanguages({type: "Inventario"})[0].size, 0);
}

const legacy = new LegacyAPI();
run("2.9.2", {api: legacy}, legacy.providers);
const broken = new Polyglot();
run("2.10.2", broken, broken.providers);
const future = new Polyglot();
future.api.registerSystem = future.api.registerSystem.bind(future);
run("2.10.3", future, future.providers);
const other = new LegacyAPI();
run("3.0.0", {api: other}, other.providers);

// Optional: exercise the actual installed 2.10.2 registration methods.
if (process.argv[2]) {
  const actual = fs.readFileSync(process.argv[2], "utf8");
  const field = actual.match(/^\tapi = \{[\s\S]*?^\t\};/m)?.[0];
  const registerSystem = actual.match(/^\t#registerSystem\(languageProvider\) \{[\s\S]*?^\t\}/m)?.[0];
  const register = actual.match(/^\t#register\(id, languageProvider\) \{[\s\S]*?^\t\}/m)?.[0];
  assert.ok(field && registerSystem && register, "Actual Polyglot methods found");
  const actualInstance = vm.runInNewContext(
    `new (class Polyglot { providers = {}; #registerModule() { throw Error("Not used by this test"); } ${field}\n${registerSystem}\n${register} })()`,
    {game: {system: {id: "test"}}});
  assert.throws(() => actualInstance.api.registerSystem(LanguageProvider),
    /Receiver must be an instance of class Polyglot/);
  run("2.10.2", actualInstance, actualInstance.providers);
}
console.log("PASS: legacy, Polyglot 2.10.2, future API, languages and inventory.");

