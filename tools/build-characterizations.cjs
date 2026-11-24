// SPDX-License-Identifier: GPL-3.0-or-later
// node tools/build-characterizations.cjs <creation-help.json da Ficha de Bolso>
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const modules = process.env.TAGMAR_FOUNDRY_MODULES;
const {ClassicLevel} = require(modules ? path.join(modules,'classic-level') : 'classic-level');
const dataPath = path.resolve(process.argv[2] || 'creation-help.json');
const data = JSON.parse(fs.readFileSync(dataPath,'utf8'));
const pack = path.resolve(__dirname,'../packs/caracterizacoes');
const esc = text => String(text).replace(/[&<>"']/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[match]);
const id = (kind,key) => createHash('sha256').update(`tagmar-characterizations:${kind}:${key}`).digest('hex').slice(0,16);
const rules = new Map(data.rules.map(rule=>[rule.id,rule]));
const acquisition = rules.get('complementares-162');
assert.ok(acquisition?.text && data.traits.length);

const operations = [];
function put(key,value) { operations.push({type:'put',key,value}); }
const folders = new Map();
for (const {group} of data.traits) {
    if (folders.has(group)) continue;
    const _id = id('group',group);
    folders.set(group,_id);
    put(`!folders!${_id}`,{_id,name:group,type:'JournalEntry',folder:null,sorting:'a',sort:0,color:null,flags:{}});
}

function addJournal({id:sourceId,title,group,text,reference}) {
    assert.ok(text,`Texto ausente: ${sourceId}`);
    const _id = id('journal',sourceId);
    const pageId = id('page',sourceId);
    const book = reference.startsWith('ats-') ? 'Aventuras nas Terras Selvagens' : 'Regras Complementares';
    const excerpt = esc(text).replace(/\r?\n/g,'<br>');
    const url = 'https://tagmarzero.com/zeropedia/#verbete/' + encodeURIComponent(reference);
    const attribution = `<p><small>Projeto Tagmar · ${book} · <a href="${url}">Fonte na ZeroPédia</a> · <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/br/">CC BY-NC-SA 3.0 BR</a></small></p>`;
    put(`!journal!${_id}`,{_id,name:title,img:'icons/svg/book.svg',pages:[pageId],folder:folders.get(group)??null,sort:0,
        ownership:{default:2},flags:{tagmarzero:{characterization:{id:sourceId,group}}}});
    put(`!journal.pages!${_id}.${pageId}`,{
        _id:pageId,name:title,type:'text',title:{show:true,level:1},text:{format:1,content:`<p>${excerpt}</p>${attribution}`},
        sort:0,ownership:{default:-1},flags:{}
    });
}

addJournal({id:acquisition.id,title:'Como adquirir Caracterizações',text:acquisition.text,reference:acquisition.id});
for (const trait of data.traits) {
    const reference = trait.sourceId || trait.id;
    addJournal({...trait,reference,text:trait.text || rules.get(reference)?.text});
}

async function build() {
    assert.ok(!fs.existsSync(pack),'Escolha uma cópia de trabalho sem um pacote de Caracterizações existente.');
    assert.equal(new Set(operations.map(operation=>operation.key)).size,operations.length);
    const db = new ClassicLevel(pack,{keyEncoding:'utf8',valueEncoding:'json',errorIfExists:true});
    try {
        await db.batch(operations);
        await db.compactRange('\x00','\xff');
    } finally { await db.close(); }
    console.log(`${data.traits.length} características, ${folders.size} grupos e regra de aquisição`);
}
build().catch(error=>{console.error(error);process.exitCode=1;});
