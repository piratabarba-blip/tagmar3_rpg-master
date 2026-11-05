export const SPECIFIC_KINDS = [
  {value:'weapon',label:'Arma'}, {value:'defense',label:'Armadura, elmo ou escudo'},
  {value:'ring',label:'Joia'}, {value:'staff',label:'Cetro ou cajado'},
  {value:'potion',label:'Poção, óleo, elixir ou unguento'}, {value:'money',label:'Tesouro monetário'}
];
export const DAMAGE_STEPS=Array.from({length:12},(_,i)=>(i+1)*25);
const clone=value=>structuredClone(value);
export const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const safeText=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function integer(value,label,min=0,max=Number.MAX_SAFE_INTEGER){
  const number=Number(value??0);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw Error(`${label}: informe um número inteiro entre ${min} e ${max}.`);
  return number;
}
export function specificChoices(catalog,kind){
  if(kind==='weapon'||kind==='defense')return (kind==='weapon'?catalog.weapons:catalog.defenses).map(({item,realm},i)=>({
    value:`${realm}:${item.uuid??item.id??i}`,name:item.name,label:`${item.name} · ${realm==='terras'?'Terras Selvagens':'Reinos Conhecidos'}`,item
  })).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
  const names=kind==='ring'?['Anel','Colar','Brincos','Bracelete','Broche','Tiara','Pingente',
    ...(catalog.jewelry??[]).filter(e=>!e.gemstone).map(e=>e.item.name)]
    :kind==='staff'?['Cetro comum','Cetro maior','Cajado comum','Cajado maior']
    :kind==='potion'?['Poção','Óleo','Elixir','Unguento']:[];
  return [...new Set(names)].map(name=>({value:name,label:name,name})).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
}
export function newSpecificDraft(kind='weapon'){
  return {kind,object:'',name:'',quantity:1,bonus:0,focus:0,resistance:0,absorption:0,
    matrices:1,range:'',defL:0,defM:0,defP:0,defCategory:'L',defValue:0,baseAbs:0,
    damage:Object.fromEntries(DAMAGE_STEPS.map(n=>['d'+n,0])),magics:[],
    mo:0,mp:0,mc:0,notes:'',history:'',trueName:'',revealHistory:false,
    curseName:'',curseText:'',curseDuration:'',curseRelease:'',revealCurse:false};
}
export function chooseSpecificObject(draft,choice){
  const next=clone(draft);next.object=choice?.value??'';
  const data=choice?.item?.toObject?.()??choice?.item??{},s=data.system??{};
  next.range=s.alcance??'';next.defL=s.def_l??0;next.defM=s.def_m??0;next.defP=s.def_p??0;
  next.defCategory=s.defesa_base?.tipo||'L';next.defValue=s.defesa_base?.valor??0;next.baseAbs=s.absorcao??0;
  next.damage=Object.fromEntries(DAMAGE_STEPS.map(n=>['d'+n,s.dano_base?.['d'+n]??s.dano?.['d'+n]??0]));
  if(next.kind==='staff')next.matrices={'Cetro comum':1,'Cetro maior':2,'Cajado comum':3,'Cajado maior':4}[choice?.name]??1;
  return next;
}
function resolvePowers(draft,catalog){
  const seen=new Set(),matrices=new Set();
  return (draft.magics??[]).map(power=>{
    const magic=catalog.magics.find(m=>m.key===power.key);
    if(!magic)throw Error('Uma magia escolhida não está mais no catálogo. Remova-a ou escolha novamente.');
    const level=integer(power.level,'Nível da magia',0,100);
    if(!magic.levels.includes(level))throw Error(`O nível ${level} não está disponível para ${magic.name}.`);
    const key=magic.key+'|'+level;
    if(seen.has(key))throw Error(`A magia ${magic.name} ${level} já está neste objeto.`);
    seen.add(key);
    const mode=power.mode??'daily';
    if(!['daily','single','unlimited'].includes(mode))throw Error('Escolha o modo de uso da magia.');
    const uses=mode==='daily'?integer(power.uses,'Usos por dia',1,9999):mode==='single'?1:0;
    let matrix=null;
    if(draft.kind==='staff'){
      matrix=integer(power.matrix,'Matriz',1,integer(draft.matrices,'Matrizes',1,4));
      if(matrices.has(matrix))throw Error('Cada matriz pode receber apenas uma magia. Escolha outra matriz ou aumente a quantidade.');
      matrices.add(matrix);
    }
    const usageLabel=(mode==='daily'?`${uses} ${uses===1?'vez por dia':'vezes por dia'}`:mode==='single'?'uso único':'à vontade')+(matrix?`; ${matrix}ª matriz`:'');
    return {key:magic.key,name:magic.name,uuid:magic.uuid,effect:level,level,uses,usageMode:mode,usageLabel,matrix,realms:magic.realms??[]};
  });
}
export function buildSpecificTreasure(draft,catalog){
  if(!SPECIFIC_KINDS.some(k=>k.value===draft.kind))throw Error('Escolha o tipo do tesouro.');
  const quantity=integer(draft.quantity,'Quantidade',1,99);
  if(draft.kind==='money'){
    const money={mo:integer(draft.mo,'MO'),mp:integer(draft.mp,'MP'),mc:integer(draft.mc,'MC')};
    if(!Object.values(money).some(Boolean))throw Error('Informe pelo menos uma moeda para adicionar à cesta.');
    const summary=`${money.mo} MO · ${money.mp} MP · ${money.mc} MC`;
    const name=String(draft.name||'Tesouro monetário').trim();
    return {manual:true,quantity:1,name,publicName:name,kind:'money',kindLabel:'Moedas',money,bonus:0,focus:0,resistance:0,absorption:0,
      uses:[],magics:[],icon:'fas fa-coins',powerSummary:summary,description:`<p><strong>Tesouro monetário:</strong> ${summary}</p>`,
      img:'icons/commodities/currency/coins-assorted-mix-copper-silver-gold.webp',treasureType:null,total:null};
  }
  const choice=specificChoices(catalog,draft.kind).find(c=>c.value===draft.object);
  if(!choice)throw Error('Escolha o objeto que deseja criar.');
  const data=choice.item?clone(choice.item.toObject?.()??choice.item):{
    name:choice.name,type:'Pertence',img:draft.kind==='potion'?'icons/consumables/potions/potion-bottle-corked-red.webp':'icons/containers/chest/chest-reinforced-steel-brown.webp',
    system:{quant:1,peso:0,preco:'',descricao:'',inTransport:false}};
  if(choice.item&&data.type!==(draft.kind==='weapon'?'Combate':'Defesa'))throw Error('O tipo do objeto não corresponde à categoria escolhida.');
  delete data._id;delete data.folder;delete data._stats;delete data.ownership;
  const bonus=integer(draft.bonus,'Bônus mágico',-100,100);
  const focus=integer(draft.focus,'Focus',0,99999),resistance=integer(draft.resistance,'Resistência à Magia',0,9999),absorption=integer(draft.absorption,'Absorção adicional',0,99999);
  if(draft.kind==='potion'&&(focus||resistance||absorption||bonus))throw Error('Preparados recebem as magias escolhidas; os outros bônus não são compatíveis com esse tipo.');
  if(!['defense','ring'].includes(draft.kind)&&absorption)throw Error('Absorção adicional é uma propriedade de proteções e joias.');
  const magics=resolvePowers(draft,catalog);
  const matrices=draft.kind==='staff'?integer(draft.matrices,'Matrizes',1,4):null;
  const name=String(draft.name||choice.name+(bonus&&['weapon','defense'].includes(draft.kind)?` ${bonus>0?'+':''}${bonus}`:'')).trim();
  const powers=[bonus?`Bônus mágico ${bonus>0?'+':''}${bonus}`:'',focus?`Focus +${focus}`:'',resistance?`RM +${resistance}`:'',absorption?`Absorção +${absorption}`:'',
    ...magics.map(m=>`${m.name} ${m.level} (${m.usageLabel})`)].filter(Boolean);
  const lore=String(draft.history??'').trim()?{trueName:String(draft.trueName||name),text:String(draft.history),manual:true}:null;
  const hasCurse=Boolean(String(draft.curseName??'').trim()||String(draft.curseText??'').trim());
  if(hasCurse&&(!String(draft.curseName??'').trim()||!String(draft.curseText??'').trim()))throw Error('Preencha o nome e a descrição da maldição.');
  const curse=hasCurse?{name:String(draft.curseName),effect:String(draft.curseText),separationTime:String(draft.curseDuration||'Definido pelo mestre'),
    binding:{label:'Condição escolhida',detail:String(draft.curseRelease||'Definida pelo mestre'),release:String(draft.curseRelease||'Definida pelo mestre')},hasNarrative:false,manual:true}:null;
  const description=[`<p><strong>Item montado pelo Mestre em Tesouros em Tagmar.</strong></p>`,
    powers.length?`<p><strong>Propriedades:</strong> ${powers.map(safeText).join('; ')}.</p>`:'<p>Item sem propriedades mágicas adicionais.</p>',
    matrices?`<p><strong>Matrizes:</strong> ${magics.length} preenchida(s), ${matrices-magics.length} vazia(s).</p>`:'',
    draft.notes?`<p>${safeText(draft.notes).replaceAll('\n','<br>')}</p>`:'',
    lore&&draft.revealHistory?`<p><strong>${safeText(lore.trueName)}:</strong> ${safeText(lore.text)}</p>`:'',
    curse&&draft.revealCurse?`<p><strong>Maldição — ${safeText(curse.name)}:</strong> ${safeText(curse.effect)}. ${safeText(curse.binding.release)}</p>`:''].join('');
  data.name=name;data.system??={};
  if(draft.kind==='weapon'){
    const damage=Object.fromEntries(DAMAGE_STEPS.map(n=>['d'+n,integer(draft.damage?.['d'+n],'Dano '+n+'%',0,999999)]));
    Object.assign(data.system,{bonus_magico:bonus,def_l:integer(draft.defL,'L',-100,100),def_m:integer(draft.defM,'M',-100,100),def_p:integer(draft.defP,'P',-100,100),
      alcance:String(draft.range??''),dano:clone(damage),dano_base:clone(damage)});
  }
  if(draft.kind==='defense'){
    if(!['L','M','P'].includes(draft.defCategory))throw Error('Escolha a categoria de defesa L, M ou P.');
    data.system.defesa_base={tipo:draft.defCategory,valor:integer(draft.defValue,'Defesa base',-100,9999)+bonus};
    data.system.absorcao=integer(draft.baseAbs,'Absorção base',0,999999)+absorption;
  }
  data.system.descricao=String(data.system.descricao??'')+description;
  return {manual:true,manualData:data,quantity,name,publicName:name,kind:draft.kind,kindLabel:SPECIFIC_KINDS.find(k=>k.value===draft.kind).label,
    bonus,focus,resistance,absorption,uses:magics.map(m=>m.uses),magics,icon:'fas fa-gem',img:data.img,description,
    powerSummary:powers.join(', ')||'Sem propriedades mágicas adicionais',matrixSummary:matrices?`${magics.length}/${matrices} matrizes preenchidas`:'',
    lore,curse,revealHistory:Boolean(draft.revealHistory),revealCurse:Boolean(draft.revealCurse),treasureType:null,total:null};
}
