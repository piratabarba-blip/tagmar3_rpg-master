import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root = process.argv[2] ? new URL(`file:///${process.argv[2].replaceAll('\\','/')}/`) : new URL('../', import.meta.url);
const source = await readFile(new URL('modules/tagmar.js', root), 'utf8');
const start = source.indexOf('async function aplicarDanoPeloChat(event)');
const end = source.indexOf("Hooks.on('tagmar_Critico'", start);
assert(start > 0 && end > start);
const warnings = [], errors = [], calls = [];
const context = vm.createContext({
  canvas: {tokens:{controlled:[]}}, game: {user:{isGM:true}},
  foundry:{utils:{escapeHTML:s=>s.replaceAll('<','&lt;')}},
  ui:{notifications:{warn:s=>warnings.push(s),error:s=>errors.push(s)}}, console:{error(){}}
});
vm.runInContext(source.slice(start,end), context);
const token = (id, actor) => ({id,name:id,actor});
const good = token('válido', {isOwner:true,_aplicarDano:async(d,t)=>calls.push({d:JSON.parse(JSON.stringify(d)),t})});
const invoke = async (tokens, data={dano:'12'}) => {
  context.canvas.tokens.controlled=tokens;
  await context.aplicarDanoPeloChat({target:{closest:()=>({dataset:data})},preventDefault(){}});
};
await invoke([token('órfão',null),good]);
assert.equal(calls.length,1);assert.match(warnings[0],/órfão.*sem ator válido/);
assert.deepEqual(calls[0].d,{valor:12,isCura:false,curaTipo:null,isCritico:false});
assert.equal(calls[0].t,good);
await invoke([token('falhou',{_aplicarDano:async()=>{throw Error('offline');}}),good]);
assert.equal(calls.length,2);assert.equal(errors.length,1);
await invoke([good],{dano:'8',cura:'true',curaTipo:'EF',critico:'true'});
assert.deepEqual(calls.at(-1).d,{valor:8,isCura:true,curaTipo:'EF',isCritico:true});
context.game.user.isGM=false;
await invoke([token('sem permissão',{isOwner:false,_aplicarDano:async()=>{throw Error('não deve executar');}}),good]);
assert.equal(calls.length,4);assert.match(warnings.at(-1),/permissão/);
await invoke([good],{dano:'NaN'});await invoke([good],{dano:'-3'});assert.equal(calls.length,4);
await invoke([]);assert.match(warnings.at(-1),/Nenhum token/);
await invoke([token('sem método',{})]);assert.equal(errors.length,1);
console.log('PASS: tokens órfãos, seleção mista, falhas isoladas, permissões, cura/critico, valores inválidos e token sintético preservado.');
