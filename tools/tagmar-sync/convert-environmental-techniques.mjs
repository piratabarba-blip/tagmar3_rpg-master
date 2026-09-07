// Converte somente os dois registros ambientais, preservando IDs e o restante do pack.
import {createRequire} from 'node:module';
import {cp, mkdtemp, readFile, writeFile, rename, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const {ClassicLevel} = require(path.join(process.env.TAGMAR_FOUNDRY_MODULES, 'classic-level'));
const root = path.resolve(process.argv[2] ?? '.');
const pack = path.join(root, 'packs', 'terras-selvagens-t3er');
const temporary = await mkdtemp(path.join(tmpdir(), 'tagmar-environmental-'));
const copy = path.join(temporary, 'pack');
await cp(pack, copy, {recursive:true});
await writeFile(path.join(copy,'CURRENT'), (await readFile(path.join(copy,'CURRENT'),'utf8')).trim()+'\n');
const db = new ClassicLevel(copy, {keyEncoding:'utf8',valueEncoding:'json'});
await db.open();
const original = new Map(await db.iterator().all());
const changes = [];
const names = new Set(['Combate Aéreo','Combate Aquático']);
for (const [key, item] of original) {
  if (!key.startsWith('!items!') || !names.has(item.name)) continue;
  assert.equal(item.type,'Habilidade');
  const converted = structuredClone(item);
  converted.type = 'Tecnica_Combate';
  converted.system = {
    custo:item.system.custo, nivel:item.system.nivel,
    ajuste:{atributo:'FIS',valor:0}, bonus:item.system.bonus ?? 0,
    fa:-7, mecanica:2, duracao:{valor:0,tipo:'Ataque(s)'}, teste:'Não',
    restricao:'Conforme a descrição da técnica.',
    pre_requisito:{valor:'Não',tecnica:''}, complemento:'Não',
    descricao:item.system.descricao
  };
  converted.flags.tagmarSync.environmentalTechnique = true;
  changes.push({type:'put',key,value:converted});
}
assert.equal(changes.length,2,'Esperados exatamente dois registros antigos');
await db.batch(changes);
const after = new Map(await db.iterator().all());
assert.equal(after.size,original.size);
for (const [key,item] of original) {
  if (!changes.some(change=>change.key===key)) assert.deepEqual(after.get(key),item);
}
for (const change of changes) {
  assert.equal(after.get(change.key)._id,original.get(change.key)._id);
  assert.equal(after.get(change.key).type,'Tecnica_Combate');
}
await db.close();
// Backup recuperável, sem apagar ou sobrescrever outro pack.
const backupRoot = path.join(root,'.tmp');
await mkdir(backupRoot,{recursive:true});
const backup = await mkdtemp(path.join(backupRoot,'before-environmental-'));
assert.equal(path.dirname(pack),path.join(root,'packs'));
await rename(pack,path.join(backup,'terras-selvagens-t3er'));
try { await cp(copy,pack,{recursive:true}); }
catch (error) { throw new Error(`Falha ao instalar pack. Backup preservado em ${backup}`,{cause:error}); }
console.log(JSON.stringify({root,converted:changes.map(c=>c.value.name),unchanged:original.size-2,backup}));
