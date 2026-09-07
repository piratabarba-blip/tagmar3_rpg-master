import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2] ?? '.');
globalThis.foundry = {appv1:{sheets:{ActorSheet:class {}}}};
for (const filename of ['tagmarActorSheet.js','tagmarAltSheet.js']) {
  const {default:Sheet} = await import(pathToFileURL(path.join(root,'modules/sheets',filename)));
  const items = ['Magia','Tecnica_Combate','Combate','Habilidade'].flatMap(type =>
    [['Zebra',9],['Água',1],['Bola',0],['Abelha','0'],['Brisa','2']].map(([name,nivel]) =>
      ({name,type,system:{nivel,tipo:'geral',favorito:true}})));
  const before = structuredClone(items);
  const data={actor:{items,system:{}}};
  data.document=data.actor;
  const sheet=new Sheet();
  sheet._prepareCharacterItems(data);
  for (const key of ['tecnicas','magias','tecnica_fav','magia_fav']) {
    assert.deepEqual(data.actor[key].map(i=>i.name),['Água','Brisa','Zebra','Abelha','Bola']);
  }
  for (const key of ['combate','habilidades']) {
    assert.deepEqual(data.actor[key].map(i=>i.name),['Abelha','Água','Bola','Brisa','Zebra']);
  }
  assert.deepEqual(items,before,'Não altera itens nem a ordem persistida');
  items.find(i=>i.name==='Bola' && i.type==='Magia').system.nivel=1;
  sheet._prepareCharacterItems(data);
  assert.deepEqual(data.actor.magias.map(i=>i.name),['Água','Bola','Brisa','Zebra','Abelha']);
  console.log(`OK: ${filename}, grupos com/sem nível, alfabético, reordenação e outras listas preservadas.`);
}
