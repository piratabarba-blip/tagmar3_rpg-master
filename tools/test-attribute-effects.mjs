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
            atributos: {FOR: 2, AUR: 2, FIS: 2, AGI: 2},
            hab_nata: withProfession ? "Habilidade nata" : "",
            ef: {value: 8, max: 0},
            eh: {value: 15, max: 15},
            karma: {value: 17, max: 0},
            iniciativa: 4,
            carga: {value: 70, max: 0}
        }),
        items: [
            item("trained", "Habilidade", "Escalar", {tipo: "geral", nivel: 3, custo: 1, ajuste: {atributo: "FOR"}}),
            item("innate", "Habilidade", "Habilidade nata", {tipo: "geral", nivel: 1, custo: 1, ajuste: {atributo: "FOR"}}),
            item("untrained", "Habilidade", "Não aprendida", {tipo: "geral", nivel: 0, custo: 1, ajuste: {atributo: "FOR"}}),
            item("technique", "Tecnica_Combate", "Técnica de teste", {nivel: 2, custo: 1, ajuste: {atributo: "FOR", valor: 1}, bonus: 2}),
            item("spell", "Magia", "Magia de teste", {nivel: 3, custo: 1, total: {valorKarma: 1}}),
            item("combat", "Combate", "Ataque de teste", {nivel: 2, bonus: "FOR", bonus_dano: "FOR", peso: 1,
                dano_base: Object.fromEntries(Array.from({length: 12}, (_, index) => [`d${(index + 1) * 25}`, index + 1]))}),
            item("armor", "Defesa", "Armadura de teste", {
                equipado: true, absorcao: 2, peso: 0, defesa_base: {valor: 3, tipo: "L"}
            }),
            item("load", "Pertence", "Carga de teste", {quant: 1, peso: 70}),
            item("race", "Raca", "Raça de teste", {ef_base: 5, vb: 3}),
            item("strengthEffect", "Efeito", "Força temporária", {atributo: "FOR", tipo: "+", valor: 1, ativo: false}),
            item("auraEffect", "Efeito", "Aura temporária", {atributo: "AUR", tipo: "+", valor: 1, ativo: false}),
            item("physicalEffect", "Efeito", "Físico temporário", {atributo: "FIS", tipo: "+", valor: 1, ativo: false}),
            item("agilityEffect", "Efeito", "Agilidade temporária", {atributo: "AGI", tipo: "+", valor: 1, ativo: false})
        ]
    };
    if (withProfession) actor.items.push(item("profession", "Profissao", "Profissão de teste", {
        grupo_pen: "conhecimento", atrib_mag: "AUR", eh_base: 7,
        p_aquisicao: {p_hab: 10, p_tec: 5, p_gra: 5}
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
    actor.defesas = actor.items.filter(entry => entry.type === "Defesa");
    actor.pertences = actor.items.filter(entry => entry.type === "Pertence" && !entry.system.inTransport);
    actor.pertences_transporte = actor.items.filter(entry => entry.type === "Pertence" && entry.system.inTransport);
    actor.transportes = actor.items.filter(entry => entry.type === "Transporte");
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
    utils._attCargaAbsorcaoDefesa(data, actorUpdates, effective);
    if (actor.items.some(entry => entry.type === "Raca") && actor.items.some(entry => entry.type === "Profissao")) {
        utils._attEfEhVB(data, actorUpdates, effective);
    }
    utils._attKarmaMax(data, actorUpdates, effective);
    utils._attRM(data, actorUpdates, effective);
    utils._attRF(data, actorUpdates, effective);
    utils._attEhTemporaria(data, actorUpdates);
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

function checkTotals(actor, modifier, withProfession = true) {
    assert.equal(getItem(actor, "trained").system.total, 5 + modifier, "Total da habilidade treinada");
    assert.equal(getItem(actor, "untrained").system.total, -7, "Habilidade não aprendida permanece -7");
    assert.equal(getItem(actor, "innate").system.nivel, withProfession ? 5 : 1, "Estágio da habilidade nata");
    assert.equal(getItem(actor, "innate").system.total, (withProfession ? 7 : 3) + modifier);
    assert.equal(getItem(actor, "technique").system.fa, 7 + modifier, "FA da técnica");
    assert.equal(getItem(actor, "spell").system.total.valor, 6 + modifier, "Total da magia usa Aura efetiva");
    assert.equal(getItem(actor, "combat").system.custo, 2 + modifier, "Bônus do combate usa Força efetiva");
    for (let index = 1; index <= 12; index++) {
        assert.equal(getItem(actor, "combat").system.dano[`d${index * 25}`], index + 3 + modifier, "Dano do combate");
    }
    assert.equal(actor.system.valor_teste.FOR, (2 + modifier) * 4);
    assert.equal(actor.system.valor_teste.AUR, (2 + modifier) * 4);
    assert.equal(actor.system.valor_teste.FIS, (2 + modifier) * 4);
    assert.equal(actor.system.valor_teste.AGI, (2 + modifier) * 4);
    assert.equal(actor.system.karma.max, 18 + (modifier * 6), "Karma máximo usa Aura efetiva");
    assert.equal(actor.system.rm, 7 + modifier, "RM usa Aura efetiva");
    assert.equal(actor.system.rf, 7 + modifier, "RF usa Físico efetivo");
    assert.equal(actor.system.d_passiva.valor, 3, "Defesa Passiva não usa Agilidade");
    assert.equal(actor.system.d_ativa.valor, 5 + modifier, "Defesa Ativa usa Agilidade efetiva");
    assert.equal(actor.system.carga.max, 60 + (modifier * 20), "Carga máxima usa Força efetiva");
    assert.equal(actor.system.carga.sobrecarga, modifier !== 1, "Sobrecarga acompanha a Força efetiva");
    assert.equal(actor.system.carga.valor_s, modifier === 1 ? 0 : 10 - (modifier * 20));
    if (withProfession) {
        assert.equal(actor.system.ef.max, 9 + (modifier * 2), "EF máxima usa Força e Físico efetivos");
        assert.equal(actor.system.vb, 5 + modifier, "VB usa Físico efetivo");
    }
    assert.equal(actor.system.eh.max, 15 + modifier * 5, "EH acompanha a diferença de Físico por estágio");
    assert.equal(actor.system.eh.value, 15 + modifier * 5, "EH atual acompanha o modificador");
    assert.equal(actor.system.iniciativa, 4, "Iniciativa permanece manual");
}

async function exercise(actor, settle, withProfession = true) {
    await settle(actor);
    checkTotals(actor, 0, withProfession);
    const originalPoints = pointSnapshot(actor);
    if (withProfession) {
        assert.equal(originalPoints.habilidades, 47, "Habilidade nata não consome pontos");
        assert.equal(originalPoints.magias, 52, "Pontos de magia calculados sobre Aura-base 2");
    }
    const strength = getItem(actor, "strengthEffect").system;
    const aura = getItem(actor, "auraEffect").system;
    const physical = getItem(actor, "physicalEffect").system;
    const agility = getItem(actor, "agilityEffect").system;
    for (const step of [
        {active: true, operator: "+", modifier: 1},
        {active: false, operator: "+", modifier: 0},
        {active: true, operator: "-", modifier: -1},
        {active: false, operator: "-", modifier: 0}
    ]) {
        Object.assign(strength, {ativo: step.active, tipo: step.operator});
        Object.assign(aura, {ativo: step.active, tipo: step.operator});
        Object.assign(physical, {ativo: step.active, tipo: step.operator});
        Object.assign(agility, {ativo: step.active, tipo: step.operator});
        await settle(actor);
        checkTotals(actor, step.modifier, withProfession);
        if (step.modifier === -1) {
            if (withProfession) assert.equal(actor.system.ef.value, 7, "EF atual respeita a redução do máximo");
            assert.equal(actor.system.karma.value, 12, "Karma atual respeita a redução do máximo");
        }
        if (!step.active && step.operator === "-") {
            if (withProfession) assert.equal(actor.system.ef.value, 7, "Remover o efeito não cura EF");
            assert.equal(actor.system.karma.value, 12, "Remover o efeito não recupera Karma gasto");
        }
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
function ehFixture(stage = 10, maximum = 50, current = 40) {
    const actor = fixture();
    Object.assign(actor.system, {estagio: stage, eh: {max: maximum, value: current}});
    getItem(actor, "physicalEffect").system.valor = 8;
    return actor;
}

function settleEh(actor, sorteio = false) {
    const changes = {};
    utils._attEhTemporaria(sheetData(actor), changes, sorteio);
    apply(actor, changes);
    const repeated = {};
    utils._attEhTemporaria(sheetData(actor), repeated, sorteio);
    assert.deepEqual(repeated, {}, "EH deve estabilizar no primeiro passe e após reabrir");
}

function assertEh(actor, current, maximum, bonus) {
    assert.equal(actor.system.eh.value, current, "EH atual");
    assert.equal(actor.system.eh.max, maximum, "EH máxima");
    assert.equal(actor.system.eh.bonusFis ?? 0, bonus, "Bônus temporário separado");
}

const heroic = ehFixture();
getItem(heroic, "physicalEffect").system.ativo = true;
settleEh(heroic);
assertEh(heroic, 120, 130, 80);
heroic.system.eh.value -= 30;
settleEh(heroic);
assertEh(heroic, 90, 130, 80);
getItem(heroic, "physicalEffect").system.ativo = false;
settleEh(heroic);
assertEh(heroic, 10, 50, 0);
getItem(heroic, "physicalEffect").system.ativo = true;
settleEh(heroic);
heroic.system.eh.value += 15; // Cura real durante o efeito deve permanecer.
heroic.items = heroic.items.filter(entry => entry.id !== "physicalEffect");
settleEh(heroic);
assertEh(heroic, 25, 50, 0);

const penalty = ehFixture(10, 50, 3);
Object.assign(getItem(penalty, "physicalEffect").system, {ativo: true, tipo: "-", valor: 1});
settleEh(penalty);
assertEh(penalty, 0, 40, -10);
getItem(penalty, "physicalEffect").system.ativo = false;
settleEh(penalty);
assertEh(penalty, 3, 50, 0);
Object.assign(getItem(penalty, "physicalEffect").system, {ativo: true, valor: 100});
settleEh(penalty);
assertEh(penalty, 0, 0, -50);
getItem(penalty, "physicalEffect").system.ativo = false;
settleEh(penalty);
assertEh(penalty, 3, 50, 0);

const exhausted = ehFixture();
getItem(exhausted, "physicalEffect").system.ativo = true;
settleEh(exhausted);
exhausted.system.eh.value = 20;
getItem(exhausted, "physicalEffect").system.ativo = false;
settleEh(exhausted);
assertEh(exhausted, 0, 50, 0);

const stacked = ehFixture();
getItem(stacked, "physicalEffect").system.ativo = true;
stacked.items.push(item("multiplyFis", "Efeito", "Físico dobrado", {ativo: true, atributo: "FIS", tipo: "*", valor: 2}));
settleEh(stacked);
assertEh(stacked, 220, 230, 180);
getItem(stacked, "physicalEffect").system.ativo = false;
settleEh(stacked);
assertEh(stacked, 60, 70, 20);
getItem(stacked, "multiplyFis").system.ativo = false;
settleEh(stacked);
assertEh(stacked, 40, 50, 0);

const firstStage = ehFixture(1, 9, 6);
getItem(firstStage, "physicalEffect").system.ativo = true;
await integrationRunner(firstStage)();
assertEh(firstStage, 14, 17, 8);
getItem(firstStage, "physicalEffect").system.ativo = false;
await integrationRunner(firstStage)();
assertEh(firstStage, 6, 9, 0);

const {default: RolledSheet} = await import(pathToFileURL(path.join(repository, "modules/sheets/tagmarActorSheet.js")));
globalThis.Roll = class {
    constructor() { this.total = 1; }
    async evaluate() { return this; }
    async toMessage() {}
};
globalThis.ChatMessage = {getSpeaker: () => ({})};
game.user = {id: "test-gm"};
globalThis.ui = {notifications: {info() {}, warn(message) {throw new Error(message);}, error(message) {throw new Error(message);}}};
for (const [Sheet, rolled] of [[PointsSheet, false], [RolledSheet, true]]) {
    const growing = ehFixture();
    growing.system.carac_final.FIS = 16; // FIS-base 2 na ficha por sorteio.
    growing.system.pontos_estagio = {value: 10000, next: 1};
    growing.update = async changes => {apply(growing, changes);};
    const profession = getItem(growing, "profession");
    profession.system.lista_eh.v1 = 3;
    getItem(growing, "physicalEffect").system.ativo = true;
    settleEh(growing, rolled);
    const growingSheet = new Sheet(growing);
    growingSheet.profissao = profession;
    await growingSheet._subirEstagio();
    assert.equal(growing.system.estagio, 11);
    assertEh(growing, 128, 143, 88); // Permanente: 50 + tabela 3 + FIS-base 2.
    settleEh(growing, rolled);
    getItem(growing, "physicalEffect").system.ativo = false;
    settleEh(growing, rolled);
    assertEh(growing, 40, 55, 0);
}

const readOnly = ehFixture();
getItem(readOnly, "physicalEffect").system.ativo = true;
const readOnlyChanges = {};
utils._attEhTemporaria({...sheetData(readOnly), options: {editable: false}}, readOnlyChanges);
assert.deepEqual(readOnlyChanges, {});
console.log(`OK: atributos, recursos, EH temporária, dano/cura, penalidades, evolução e estabilidade da ficha (${repository})`);
