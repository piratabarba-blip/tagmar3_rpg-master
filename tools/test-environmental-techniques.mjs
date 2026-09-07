import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2] ?? '.');
globalThis.Item = class {};
globalThis.game = {tagmar:{tabela_resol:[[-7,'amarelo'],[6,'vermelho']]}};
let warnings = 0;
globalThis.ui = {notifications:{warn:()=>warnings++}};
globalThis.Roll = class { async evaluate(){this.total=1;} };
const {tagmarItem} = await import(pathToFileURL(path.join(root,'modules/tagmarItem.js')));
const {_updateTencnicasItems} = await import(pathToFileURL(path.join(root,'modules/sheets/actorUtils.js')));
for (const name of ['Combate Aéreo','Combate Aquático']) {
  const item = Object.assign(new tagmarItem(), {
    id:'test',name,type:'Tecnica_Combate',flags:{tagmarSync:{environmentalTechnique:true}},
    system:{nivel:0,fa:99,mecanica:2,ajuste:{atributo:'FIS',valor:0},bonus:0}
  });
  const updates=[];
  _updateTencnicasItems({options:{editable:true},document:{system:{atributos:{FIS:4}},items:[item]}},updates);
  assert.equal(updates[0]['system.fa'],-7);
  let result;
  item.tecnicaToChat=async(color,roll,column)=>{result={color,column};};
  await item.rollTecnica_Combate();
  assert.deepEqual(result,{color:'amarelo',column:-7});
  item.system.nivel=2;
  updates.length=0;
  _updateTencnicasItems({options:{editable:true},document:{system:{atributos:{FIS:4}},items:[item]}},updates);
  assert.equal(updates[0]['system.fa'],6);
  item.system.fa=6;
  await item.rollTecnica_Combate();
  assert.deepEqual(result,{color:'vermelho',column:6});
  item.flags={}; item.system.nivel=0; result=null;
  await item.rollTecnica_Combate();
  assert.equal(result,null,'Técnicas comuns continuam exigindo nível');
}
assert.equal(warnings,2);
console.log('OK: técnicas ambientais sem nível (-7), com FIS + nível e bloqueio das demais técnicas.');
