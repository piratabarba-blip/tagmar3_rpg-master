import assert from 'node:assert/strict';
import {elvenWeaponDamageAttribute as bonus} from './tagmar-sync/elven-weapon-damage.mjs';

for (const name of ['Sabre Élfico', 'sabre elfico', ' SABRE  ÉLFICO ', 'Sabre E\u0301lfico']) {
  assert.equal(bonus(name, 'PER'), 'AGI');
  assert.equal(bonus(name, 'AGI'), 'AGI');
}
for (const name of ['Arco Longo Élfico', 'arco longo elfico', ' ARCO  LONGO ÉLFICO ']) {
  assert.equal(bonus(name, 'PER'), 'FOR');
  assert.equal(bonus(name, 'FOR'), 'FOR');
}
for (const name of ['Espada', 'Espada Iantus Uma Mão', 'Arco simples', 'Sabre das Brumas', 'Bola de Fogo', 'Sabre Élfico +1']) {
  for (const previous of ['FOR', 'PER', 'AGI', 'AUR', '', undefined]) assert.equal(bonus(name, previous), previous);
}
console.log('OK: AGI no sabre, FOR no arco, normalização, idempotência e demais armas preservadas.');
