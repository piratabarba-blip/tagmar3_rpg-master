// Regressão: macros prontas devem chegar ao tratamento nativo do Foundry.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../modules/tagmar.js'), 'utf8');
const registration = source.match(/Hooks\.on\("hotbarDrop", \(bar, data, slot\) => \{[\s\S]*?\n  \}\);/)?.[0];
assert.ok(registration, 'Registro do hook encontrado');
let handler;
const itemCalls = [];
vm.runInNewContext(registration, {
  Hooks: {on: (name, callback) => { handler = callback; }},
  createTagmarMacro: (...args) => itemCalls.push(args)
});
for (const data of [
  {type:'Macro', uuid:'Macro.example', slot:'1'},
  {type:'Macro', uuid:'Macro.example'},
  {type:'RollTable', uuid:'RollTable.example'},
  {type:'Actor', uuid:'Actor.example'},
  {type:'JournalEntry', uuid:'JournalEntry.example'}
]) {
  assert.notEqual(handler({}, data, '5'), false, `${data.type}: permitir Foundry`);
}
assert.equal(itemCalls.length, 0, 'Não tentar recriar macros existentes');
const item = {type:'Item', uuid:'Actor.example.Item.weapon'};
assert.equal(handler({}, item, '5'), false, 'Item mantém rolagem Tagmar');
assert.equal(itemCalls.length, 1);
assert.equal(itemCalls[0][0], item);
assert.equal(itemCalls[0][1], '5');
console.log('OK: mover macros, importar macros e documentos nativos; rolagem Tagmar preservada.');
