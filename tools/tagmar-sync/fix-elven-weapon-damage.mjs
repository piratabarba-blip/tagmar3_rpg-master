// node tools/tagmar-sync/fix-elven-weapon-damage.mjs <repositorio> [--write]
// Audita cópias; --write instala somente packs com alterações, guardando os originais.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {cp, mkdir, mkdtemp, readFile, readdir, rename, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {elvenWeaponDamageAttribute} from './elven-weapon-damage.mjs';

const root = path.resolve(process.argv[2] ?? '.');
assert.ok(!/laboratorio/i.test(root), 'Este script não opera no laboratório');
const manifest = JSON.parse(await readFile(path.join(root, 'system.json'), 'utf8'));
assert.ok(['tagmar_rpg', 'tagmar3er_oficial'].includes(manifest.id));
assert.ok(process.env.TAGMAR_FOUNDRY_MODULES, 'Defina TAGMAR_FOUNDRY_MODULES');
const require = createRequire(import.meta.url);
const {ClassicLevel} = require(path.join(process.env.TAGMAR_FOUNDRY_MODULES, 'classic-level'));
const write = process.argv.includes('--write');
const backupParent = path.join(root, '.tmp');
await mkdir(backupParent, {recursive:true});
const work = await mkdtemp(path.join(backupParent, 'elven-damage-'));
const plans = [];

async function fingerprint(dir) {
  const hash = createHash('sha256');
  for (const name of (await readdir(dir)).sort()) {
    hash.update(name);
    hash.update(await readFile(path.join(dir, name)));
  }
  return hash.digest('hex');
}

function verify(before, after, changes) {
  assert.equal(after.size, before.size, 'Quantidade de registros preservada');
  for (const [key, value] of before) {
    const expected = structuredClone(value);
    const change = changes.find(c => c.key === key);
    if (change) expected.system.bonus_dano = change.to;
    assert.deepEqual(after.get(key), expected, `Alteração indevida: ${key}`);
  }
}

for (const pack of manifest.packs.filter(p => p.type === 'Item')) {
  const source = path.resolve(root, pack.path);
  assert.equal(path.dirname(source), path.join(root, 'packs'), 'Pack fora da raiz esperada');
  assert.equal(path.basename(source), pack.name);
  const initialHash = await fingerprint(source);
  const copy = path.join(work, pack.name);
  await cp(source, copy, {recursive:true});
  const current = path.join(copy, 'CURRENT');
  await writeFile(current, (await readFile(current, 'utf8')).trim() + '\n');
  const db = new ClassicLevel(copy, {keyEncoding:'utf8', valueEncoding:'json'});
  let before, changes;
  try {
    await db.open();
    before = new Map(await db.iterator().all());
    changes = [];
    for (const [key, item] of before) {
      if (!key.startsWith('!items!') || item.type !== 'Combate') continue;
      const to = elvenWeaponDamageAttribute(item.name, undefined);
      if (!to) continue;
      console.log(JSON.stringify({pack:pack.name, id:item._id, name:item.name,
        attack:item.system.bonus, damage:item.system.bonus_dano, expected:to}));
      if (item.system.bonus_dano !== to) changes.push({key, to, from:item.system.bonus_dano, name:item.name});
    }
    if (write && changes.length) {
      await db.batch(changes.map(c => {
        const item = structuredClone(before.get(c.key));
        item.system.bonus_dano = c.to;
        return {type:'put', key:c.key, value:item};
      }));
      verify(before, new Map(await db.iterator().all()), changes);
    }
  } finally { await db.close(); }
  if (changes.length) plans.push({pack:pack.name, source, copy, initialHash, changes, before});
}

if (write) {
  // Valida tudo antes de substituir qualquer pack; nunca sobrescreve o backup.
  for (const plan of plans) {
    assert.equal(await fingerprint(plan.source), plan.initialHash, 'Pack modificado durante a auditoria');
    const db = new ClassicLevel(plan.copy, {keyEncoding:'utf8', valueEncoding:'json'});
    try { await db.open(); verify(plan.before, new Map(await db.iterator().all()), plan.changes); }
    finally { await db.close(); }
  }
  for (const plan of plans) {
    const backup = path.join(work, 'original-' + plan.pack);
    await rename(plan.source, backup);
    try { await rename(plan.copy, plan.source); }
    catch (error) { await rename(backup, plan.source); throw error; }
  }
}
const report = {root, applied:write, backup:work,
  changes:plans.map(p => ({pack:p.pack, records:p.before.size, changes:p.changes}))};
await writeFile(path.join(work, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
