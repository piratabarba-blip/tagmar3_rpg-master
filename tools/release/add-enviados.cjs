// Acrescenta os Enviados de uma cópia offline; preserva todos os registros anteriores.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {ClassicLevel} = require(path.join(process.env.TAGMAR_FOUNDRY_MODULES || 'C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/node_modules', 'classic-level'));
const root = path.resolve(__dirname, '../..');
const sourceData = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const oldPrefix = 'assets/tagmar-enviados/';
const newPrefix = 'systems/tagmar_rpg/assets/tokens/enviados/';
const packPath = path.join(root, 'packs/personagens-xxx');
const media = new Map();
async function readCopy(source, name) {
  const copy = path.join(output, name);
  await fs.cp(source, copy, {recursive:true, force:false, errorOnExist:true, filter:p=>!['LOCK','LOG','LOG.old'].includes(path.basename(p))});
  await fs.writeFile(path.join(copy,'CURRENT'), (await fs.readFile(path.join(copy,'CURRENT'),'utf8')).trim()+'\n');
  const db = new ClassicLevel(copy, {valueEncoding:'json', readOnly:true});
  const records = new Map();
  try { for await(const [key,value] of db.iterator()) records.set(key,value); }
  finally { await db.close(); }
  return records;
}
function prepare(value) {
  if(typeof value === 'string') return value.split(oldPrefix).join(newPrefix);
  if(Array.isArray(value)) return value.map(prepare);
  if(!value || typeof value !== 'object') return value;
  const result={};
  for(const [key,v] of Object.entries(value)) {
    if(key === 'videoEsperado') continue; // Caminho de trabalho antigo, nunca usado para renderizar.
    result[key]=prepare(v);
  }
  if(result._stats) result._stats.lastModifiedBy=null;
  const provenance=result.flags?.world?.enviadosTagmar;
  if(provenance) provenance.revisao='Enviados da mesa; retratos e tokens incluídos no sistema XXX';
  return result;
}
function walk(value, callback) {
  if(typeof value==='string') callback(value);
  else if(value && typeof value==='object') Object.values(value).forEach(v=>walk(v,callback));
}
async function validateMedia(records) {
  const refs=new Set();
  for(const value of records.values()) walk(value,text=>{
    if(/^(assets|worlds|systems|modules|icons)\//.test(text) && /\.(png|jpe?g|webp|webm|mp4|svg)$/i.test(text)) refs.add(text);
    for(const m of text.matchAll(/(?:src|poster)=["']([^"']+)["']/g)) refs.add(m[1]);
    assert(!text.includes(oldPrefix), 'Referência particular não convertida');
    assert(!text.startsWith('worlds/'), 'Dependência de mundo particular');
  });
  for(const ref of refs) {
    let file;
    if(ref.startsWith('systems/tagmar_rpg/')) file=path.join(root,decodeURIComponent(ref.slice('systems/tagmar_rpg/'.length)));
    else if(ref.startsWith('icons/')) file=path.join('C:/Users/PIRATA/AppData/Local/Programs/Foundry Virtual Tabletop/resources/app/public',decodeURIComponent(ref));
    else throw Error('Recurso externo inesperado: '+ref);
    await fs.access(file);
  }
  return refs.size;
}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const before=await readCopy(packPath,'pack-original');
  const source=await readCopy(path.join(sourceData,'systems/tagmar_rpg/packs/personagens-xxx'),'pack-local');
  const actors=[...source].filter(([key,v])=>/^!actors![^!]+$/.test(key) && v.flags?.world?.enviadosTagmar?.chave);
  assert.equal(actors.length,102);
  const ids=new Set(actors.map(([,v])=>v._id));
  assert.equal(ids.size,102);
  const folders=new Set();
  for(const [,actor] of actors) {
    let id=actor.folder;
    while(id) { if(folders.has(id)) break; folders.add(id); const folder=source.get('!folders!'+id); assert(folder,'Pasta ausente'); id=folder.folder; }
    for(const ref of [actor.img,actor.prototypeToken.texture.src]) {
      assert(ref.startsWith(oldPrefix));
      media.set(ref,ref.replace(oldPrefix,newPrefix));
    }
  }
  assert.equal(folders.size,18); assert.equal(media.size,196);
  const added=new Map();
  for(const [key,value] of source) {
    const actorId=key.match(/^!actors(?:\.[^!]+)?!([^.]+)/)?.[1];
    if(ids.has(actorId) || (key.startsWith('!folders!') && folders.has(value._id))) {
      assert(!before.has(key),'ID já existe no pacote publicado: '+key);
      added.set(key,prepare(value));
    }
  }
  assert.equal(added.size,9235);
  let bytes=0; const files=[];
  for(const [from,to] of media) {
    const source=path.resolve(sourceData,from);
    const target=path.resolve(root,to.slice('systems/tagmar_rpg/'.length));
    assert(target.startsWith(root+path.sep));
    const data=await fs.readFile(source); bytes+=data.length;
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.writeFile(target,data,{flag:'wx'});
    files.push({path:to,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});
  }
  const validatedReferences=await validateMedia(added);
  await fs.writeFile(path.join(packPath,'CURRENT'),(await fs.readFile(path.join(packPath,'CURRENT'),'utf8')).trim()+'\n');
  const db=new ClassicLevel(packPath,{valueEncoding:'json'});
  try { await db.batch([...added].map(([key,value])=>({type:'put',key,value}))); await db.compactRange('\x00','\xff'); }
  finally { await db.close(); }
  const after=await readCopy(packPath,'pack-verificado');
  for(const [key,value] of before) assert.deepEqual(after.get(key),value,'Registro anterior alterado: '+key);
  for(const [key,value] of added) assert.deepEqual(after.get(key),value);
  assert.equal(after.size,before.size+added.size);
  for(const [key,actor] of after) if(/^!actors![^!]+$/.test(key)) {
    for(const id of actor.items || []) assert(after.has('!actors.items!'+actor._id+'.'+id),'Item não encontrado: '+id);
    if(actor.folder) assert(after.has('!folders!'+actor.folder));
  }
  const report={status:'PASS',actors:329,addedActors:102,addedFolders:18,addedEmbeddedItems:9115,previousRecordsPreserved:before.size,addedRecords:added.size,mediaFiles:files.length,mediaBytes:bytes,validatedReferences,files};
  await fs.writeFile(path.join(output,'enviados-validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,files:undefined},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
