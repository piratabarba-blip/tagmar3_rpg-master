/**
 * Regressão dos efeitos de atributos, sem servidor nem dados de um mundo.
 * Uso: node tools/test-attribute-effects.mjs [caminho-do-repositorio]
 * O teste usa os utilitários e getData reais, com persistência simulada.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const repository = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const templates = JSON.parse(await readFile(path.join(repository, "template.json"), "utf8"));
const utils = await import(pathToFileURL(path.join(repository, "modules/sheets/actorUtils.js")));

function merge(target, source) {
    for (const [key, value] of Object.entries(source)) {
        if (key === "templates") continue;
        if (value && typeof value === "object" && !Array.isArray(value)) {
            merge(target[key] ??= {}, value);
        } else target[key] = structuredClone(value);
    }
    return target;
}

function systemFor(documentType, type, overrides = {}) {
    const schema = templates[documentType];
    const result = {};
    for (const template of schema[type].templates ?? []) merge(result, schema.templates[template]);
    return merge(merge(result, schema[type]), overrides);
}

function item(id, type, name, system) {
    return {_id: id, id, type, name, system: systemFor("Item", type, system)};
}

function fixture(withProfession = true) {
    const actor = {
        type: "Personagem",
        system: systemFor("Actor", "Personagem", {
            estagio: 5,
            atributos: {FOR: 2, AUR: 2},
            hab_nata: withProfession ? "Habilidade nata" : ""
        }),
        items: [
            item("trained", "Habilidade", "Escalar", {tipo: "geral", nivel: 3, custo: 1, ajuste: {atributo: "FOR"}}),
            item("innate", "Habilidade", "Habilidade nata", {tipo: "geral", nivel: 1, custo: 1, ajuste: {atributo: "FOR"}}),
            item("untrained", "Habilidade", "Não aprendida", {tipo: "geral", nivel: 0, custo: 1, ajuste: {atributo: "FOR"}}),
            item("technique", "Tecnica_Combate", "Técnica de teste", {nivel: 2, custo: 1, ajuste: {atributo: "FOR", valor: 1}, bonus: 2}),
            item("spell", "Magia", "Magia de teste", {nivel: 3, custo: 1, total: {valorKarma: 1}}),
            item("combat", "Combate", "Ataque de teste", {nivel: 2, bonus: "FOR", bonus_dano: "FOR", peso: 1,
                dano_base: Object.fromEntries(Array.from({length: 12}, (_, index) => [`d${(index + 1) * 25}`, index + 1]))}),
            item("strengthEffect", "Efeito", "Força temporária", {atributo: "FOR", tipo: "+", valor: 1, ativo: false}),
            item("auraEffect", "Efeito", "Aura temporária", {atributo: "AUR", tipo: "+", valor: 1, ativo: false})
        ]
    };
    if (withProfession) actor.items.push(item("profession", "Profissao", "Profissão de teste", {
        grupo_pen: "conhecimento", atrib_mag: "AUR", p_aquisicao: {p_hab: 10, p_tec: 5, p_gra: 5}
    }));
    return actor;
}

function getItem(actor, id) {
    return actor.items.find(entry => entry.id === id);
}

function apply(target, update) {
    for (const [key, value] of Object.entries(update)) {
        if (key === "_id") continue;
        assert.ok(typeof value !== "number" || Number.isFinite(value), `Valor inválido em ${key}`);
        const segments = key.split(".");
        const last = segments.pop();
        let destination = target;
        for (const segment of segments) destination = destination[segment] ??= {};
        destination[last] = structuredClone(value);
    }
}

function applyItems(actor, updates) {
    const ids = updates.map(update => update._id);
    assert.equal(new Set(ids).size, ids.length, "Dois cálculos tentaram atualizar o mesmo item no mesmo passe");
    for (const update of updates) {
        const target = getItem(actor, update._id);
        assert.ok(target, `Item desconhecido: ${update._id}`);
        apply(target, update);
    }
}

function sheetData(actor) {
    return {document: actor, actor, items: actor.items, options: {editable: true}};
}

function derive(actor) {
    const data = sheetData(actor);
    const actorUpdates = {};
    const itemUpdates = [];
    const effective = utils._preparaEfeitosAtributos(data).efetivos;
    utils._setPontosRaca(data, actorUpdates);
    utils._prepareValorTeste(data, actorUpdates, effective);
    if (actor.items.some(entry => entry.type === "Profissao")) {
        utils._attProfissao(data, actorUpdates, itemUpdates, effective);
    } else utils._updateHabilItems(data, itemUpdates, effective);
    utils._updateCombatItems(data, itemUpdates, effective);
    utils._updateMagiasItems(data, itemUpdates, effective);
    utils._updateTencnicasItems(data, itemUpdates, effective);
    return {actorUpdates, itemUpdates};
}

function convergePipeline(actor) {
    for (let pass = 0; pass < 6; pass++) {
        const {actorUpdates, itemUpdates} = derive(actor);
        if (Object.keys(actorUpdates).length === 0 && itemUpdates.length === 0) return;
        apply(actor, actorUpdates);
        applyItems(actor, itemUpdates);
    }
    assert.fail("Os cálculos não estabilizaram: possível ciclo de atualização da ficha");
}

function pointSnapshot(actor) {
    const data = actor.system;
    return structuredClone({
        atributos: data.atributos, mod_racial: data.mod_racial,
        pontosGastos: data.carac_sort, pontosRestantes: data.carac_final.INT,
        habilidades: data.pontos_aqui, tecnicas: data.pontos_tec,
        magias: data.pontos_mag, combate: data.pontos_comb
    });
}

function checkTotals(actor, forModifier, auraModifier, withProfession = true) {
    assert.equal(getItem(actor, "trained").system.total, 5 + forModifier, "Total da habilidade treinada");
    assert.equal(getItem(actor, "untrained").system.total, -7, "Habilidade não aprendida permanece -7");
    assert.equal(getItem(actor, "innate").system.nivel, withProfession ? 5 : 1, "Estágio da habilidade nata");
    assert.equal(getItem(actor, "innate").system.total, (withProfession ? 7 : 3) + forModifier);
    assert.equal(getItem(actor, "technique").system.fa, 7 + forModifier, "FA da técnica");
    assert.equal(getItem(actor, "spell").system.total.valor, 6 + auraModifier, "Total da magia usa Aura efetiva");
    assert.equal(getItem(actor, "combat").system.custo, 2 + forModifier, "Bônus do combate usa Força efetiva");
    for (let index = 1; index <= 12; index++) {
        assert.equal(getItem(actor, "combat").system.dano[`d${index * 25}`], index + 3 + forModifier, "Dano do combate");
    }
    assert.equal(actor.system.valor_teste.FOR, (2 + forModifier) * 4);
    assert.equal(actor.system.valor_teste.AUR, (2 + auraModifier) * 4);
}

async function exercise(actor, settle, withProfession = true) {
    await settle(actor);
    checkTotals(actor, 0, 0, withProfession);
    const originalPoints = pointSnapshot(actor);
    if (withProfession) {
        assert.equal(originalPoints.habilidades, 47, "Habilidade nata não consome pontos");
        assert.equal(originalPoints.magias, 52, "Pontos de magia calculados sobre Aura-base 2");
    }
    const strength = getItem(actor, "strengthEffect").system;
    const aura = getItem(actor, "auraEffect").system;
    for (const step of [
        {active: true, operator: "+", modifier: 1},
        {active: false, operator: "+", modifier: 0},
        {active: true, operator: "-", modifier: -1},
        {active: false, operator: "-", modifier: 0}
    ]) {
        Object.assign(strength, {ativo: step.active, tipo: step.operator});
        Object.assign(aura, {ativo: step.active, tipo: step.operator});
        await settle(actor);
        checkTotals(actor, step.modifier, step.modifier, withProfession);
        assert.deepEqual(pointSnapshot(actor), originalPoints, "Efeitos temporários alteraram atributos-base ou pontos");
    }
}

// Executa o getData verdadeiro com uma ActorSheet mínima e gravações adiadas.
// Não simula cliques DOM; verifica o ciclo de renderização que os interrompia.
globalThis.game = {system: {id: "tagmar_rpg"}, packs: new Map(), settings: {get: () => false}};
globalThis.foundry = {appv1: {sheets: {ActorSheet: class {
    constructor(document) { this.document = document; this.options = {editable: true}; }
    getData(options) { return {...sheetData(this.document), options}; }
}}}};
const {default: PointsSheet} = await import(pathToFileURL(path.join(repository, "modules/sheets/tagmarAltSheet.js")));

function integrationRunner(actor) {
    let actorUpdates = [];
    let itemUpdates = [];
    actor.update = update => { actorUpdates.push(structuredClone(update)); return Promise.resolve(actor); };
    actor.updateEmbeddedDocuments = (type, updates) => {
        assert.equal(type, "Item");
        itemUpdates.push(...structuredClone(updates));
        return Promise.resolve([]);
    };
    const sheet = new PointsSheet(actor);
    return async () => {
        for (let pass = 0; pass < 8; pass++) {
            actorUpdates = [];
            itemUpdates = [];
            await sheet.getData({editable: true});
            if (actorUpdates.length === 0 && itemUpdates.length === 0) {
                // Caches de patches não podem esconder cálculos ainda divergentes.
                const pending = derive(actor);
                assert.equal(pending.itemUpdates.length, 0, "O cache interrompeu as gravações antes de os itens estabilizarem");
                assert.equal(Object.keys(pending.actorUpdates).length, 0);
                return;
            }
            for (const update of actorUpdates) apply(actor, update);
            applyItems(actor, itemUpdates);
        }
        assert.fail("getData continuou gravando e renderizando após oito passes");
    };
}

await exercise(fixture(), convergePipeline);
await exercise(fixture(false), convergePipeline, false);
const integrationActor = fixture();
await exercise(integrationActor, integrationRunner(integrationActor));
const noProfessionActor = fixture(false);
await exercise(noProfessionActor, integrationRunner(noProfessionActor), false);
console.log(`OK: efeitos, habilidades, técnicas, magias, combate, pontos e estabilidade de getData (${repository})`);
