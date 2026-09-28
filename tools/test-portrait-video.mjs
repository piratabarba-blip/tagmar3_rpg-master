/** Regressão do salvamento de retratos com o validador real do Foundry, sem mundos. */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";

const root = path.resolve(process.argv[2] ?? ".");
const scope = JSON.parse(await readFile(path.join(root, "system.json"), "utf8")).id;
const core = process.env.TAGMAR_TEST_FOUNDRY_PUBLIC;
assert.ok(core, "Defina TAGMAR_TEST_FOUNDRY_PUBLIC para testar com o validador do Foundry instalado");
const common = path.resolve(core, "..", "common");
const {FilePathField} = await import(pathToFileURL(path.join(common, "data/fields.mjs")));
await import(pathToFileURL(path.join(common, "primitives/array.mjs")));
const imageField = new FilePathField({categories: ["IMAGE"]});
assert.match(await readFile(path.join(common,"documents/actor.mjs"),"utf8"), /img: new fields.FilePathField\(\{categories: \["IMAGE"\]/);
assert.equal(imageField.validate("old.png"), undefined);
assert.match(imageField.validate("new.webm").message, /valid file extension/);

const {isVideoPortrait, getPortraitData, editPortrait, activatePortraitListeners} = await import(pathToFileURL(path.join(root, "modules/sheets/portrait.js")));
for (const src of ["actor.webm", "actor.WEBM", "folder/a.webm?v=3#t=1", "https://example.com/a.mp4", "a.m4v", "a.ogv"]) assert.equal(isVideoPortrait(src), true, src);
for (const src of [null, undefined, "", "a.png", "a.webp", "a.gif", "a.webm.png", "folder.webm/a.png"]) assert.equal(isVideoPortrait(src), false, String(src));

let picker;
globalThis.game = {system: {id: scope}};
globalThis.foundry = {applications: {apps: {FilePicker: {implementation: class {
    constructor(options) { picker = options; }
    browse() { return "picker-open"; }
}}}}, appv1: {sheets: {ActorSheet: class { _onEditImage() { return "native-picker"; } }}}};

for (const type of ["Personagem", "NPC"]) {
    const actor = {type, img: "old.png", flags: {[scope]: {existing: 7}}, system: {eh: 10},
        constructor: {getDefaultArtwork: () => ({img: "default.svg"})}, toObject: () => ({})};
    const submitted = [];
    const sheet = {isEditable: true, document: actor, position: {top: 10, left: 20},
        _onSubmit: async (_event, options) => {
            // Simula o envio normal da ficha, mas valida img com o campo real do Foundry.
            const update = options.updateData;
            const candidate = structuredClone({img: actor.img, flags: actor.flags});
            if ("img" in update) candidate.img = update.img;
            const failure = imageField.validate(candidate.img);
            if (failure) throw new Error(failure.message);
            const flag = `flags.${scope}.portraitVideo`;
            if (flag in update) candidate.flags[scope].portraitVideo = update[flag];
            actor.img = candidate.img;
            actor.flags = candidate.flags;
            submitted.push(options);
            return update;
        }};
    // Qualquer alteração da prévia antes do update é um erro no teste.
    const event = {currentTarget: {setAttribute() { throw new Error("Não alterar DOM antes de salvar"); }}, preventDefault() {}};
    assert.equal(editPortrait(sheet,event), "picker-open");
    assert.equal(picker.type, "imagevideo");
    assert.equal(picker.current, "old.png");
    assert.equal(picker.document, actor);
    assert.deepEqual(picker.redirectToRoot, ["default.svg"]);
    await picker.callback("new.webm");
    assert.equal(actor.img, "old.png", "WebM jamais substitui Actor.img");
    assert.equal(actor.flags[scope].existing, 7);
    assert.deepEqual(submitted.at(-1), {updateData: {[`flags.${scope}.portraitVideo`]: "new.webm"}, preventClose: true});
    assert.deepEqual(getPortraitData(actor), {portraitIsVideo: true, portraitSrc: "new.webm"});
    // Reabrir a ficha lê dados persistidos, sem depender do DOM anterior.
    assert.deepEqual(getPortraitData(JSON.parse(JSON.stringify(actor))), getPortraitData(actor));
    editPortrait(sheet,event);
    assert.equal(picker.current, "new.webm");
    await picker.callback("second.webm");
    assert.equal(actor.img, "old.png");
    await sheet._onSubmit(event,{updateData: {}, preventClose:true});
    assert.equal(actor.flags[scope].portraitVideo, "second.webm", "Fechar/salvar não limpa o vídeo");
    await picker.callback("back.png");
    assert.equal(actor.img, "back.png");
    assert.equal(actor.flags[scope].portraitVideo, null);
    assert.deepEqual(getPortraitData(actor), {portraitIsVideo:false, portraitSrc:"back.png"});
    const saved = JSON.stringify(actor);
    await assert.rejects(picker.callback("invalid.exe"), /valid file extension/);
    assert.equal(JSON.stringify(actor), saved, "Falha não deve alterar a imagem nem as flags");
    const originalSubmit = sheet._onSubmit;
    sheet._onSubmit = async () => { throw new Error("Falha de gravação simulada"); };
    await assert.rejects(picker.callback("failure.webm"), /Falha de gravação/);
    assert.equal(JSON.stringify(actor), saved);
    sheet._onSubmit = originalSubmit;
    const previousSubmissions = submitted.length;
    sheet.isEditable = false;
    await picker.callback("forbidden.webm");
    assert.equal(editPortrait(sheet,event), undefined);
    assert.equal(submitted.length, previousSubmissions);
    assert.deepEqual(actor.system, {eh:10});
}
assert.deepEqual(getPortraitData({img:"fallback.png",flags:{[scope]:{portraitVideo:"invalid.exe"}}}), {portraitIsVideo:false,portraitSrc:"fallback.png"});
assert.deepEqual(getPortraitData({img:"fallback.png"}), {portraitIsVideo:false,portraitSrc:"fallback.png"});

const video = {}, handlers = [];
const html = {find: selector => ({each: fn => fn(0, video), on: (type, fn) => handlers.push({selector,type,fn})})};
const sheet = {isEditable:false};
activatePortraitListeners(sheet,html);
assert.equal(video.muted,true);
assert.equal(video.defaultMuted,true);
assert.equal(video.volume,0);
assert.equal(handlers.length,0);
sheet.isEditable = true;
let editEvents = 0;
sheet._onEditImage = () => editEvents++;
activatePortraitListeners(sheet,html);
assert.deepEqual(handlers.map(({selector,type}) => [selector,type]), [["video.tagmar-portrait","click"],[".tagmar-portrait","keydown"]]);
handlers[0].fn({});
for (const key of ["Enter"," ","Escape"]) handlers[1].fn({key,preventDefault(){}});
assert.equal(editEvents,3);
for (const name of ["tagmarActorSheet","tagmarAltSheet"]) {
    const {default: Sheet} = await import(pathToFileURL(path.join(root,"modules/sheets",name+".js")));
    const event = {currentTarget:{classList:{contains:()=>true}},preventDefault(){}};
    assert.equal(Sheet.prototype._onEditImage.call({isEditable:false},event),undefined);
    event.currentTarget.classList.contains = () => false;
    assert.equal(Sheet.prototype._onEditImage.call(sheet,event),"native-picker");
    const source = await readFile(path.join(root,"modules/sheets",name+".js"),"utf8");
    assert.match(source, /Object.assign\(data, getPortraitData\(this.document\)\)/);
    assert.match(source, /activatePortraitListeners\(this, html\)/);
}
console.log("OK: validador real de img, vídeo em flag, reabertura, troca de mídia, falhas, permissões e regras preservadas: " + scope);
