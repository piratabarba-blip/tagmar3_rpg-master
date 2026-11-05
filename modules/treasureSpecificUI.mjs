import {SPECIFIC_KINDS,DAMAGE_STEPS,newSpecificDraft,chooseSpecificObject,specificChoices,buildSpecificTreasure,normalized,safeText} from './treasureSpecific.mjs';

export function specificView(app,catalog){
  const draft=app._specificDraft??=newSpecificDraft();
  const choices=specificChoices(catalog,draft.kind);
  const magic=catalog.magics.find(m=>m.key===draft.magicKey);
  const levels=magic?.levels??[];
  const level=levels.includes(Number(draft.magicLevel))?Number(draft.magicLevel):levels[0];
  if(level!==undefined)draft.magicLevel=level;
  const basket=app._specificBasket??=[];
  const isMoney=draft.kind==='money',hasObject=isMoney||choices.some(c=>c.value===draft.object);
  const rows=(draft.magics??[]).map((m,i)=>({index:i,name:catalog.magics.find(v=>v.key===m.key)?.name??m.key,
    level:m.level,usage:m.mode==='single'?'Uso único':m.mode==='unlimited'?'À vontade':`${m.uses} vez(es)/dia`,matrix:m.matrix}));
  return {draft,isMoney,hasObject,isWeapon:draft.kind==='weapon',isDefense:draft.kind==='defense',isStaff:draft.kind==='staff',
    hasFocus:draft.kind!=='potion',hasAbsorption:['defense','ring'].includes(draft.kind),isEditing:Boolean(app._specificEditId),
    kinds:SPECIFIC_KINDS.map(k=>({...k,selected:k.value===draft.kind})),
    choices:choices.map(({value,label})=>({value,label,selected:value===draft.object})),
    magics:catalog.magics.map(m=>({key:m.key,label:m.name+(m.repertoires?.includes('ancestral')?' — Ancestral':m.repertoires?.includes('lost')?' — Perdida':''),
      search:normalized([m.name,...m.origins??[]].join(' ')),selected:m.key===draft.magicKey})),
    levels:levels.map(n=>({value:n,selected:n===level})),canAddMagic:Boolean(magic),
    modes:[{value:'daily',label:'Vezes por dia'},{value:'single',label:'Uso único'},{value:'unlimited',label:'À vontade'}].map(m=>({...m,selected:m.value===(draft.magicMode??'daily')})),
    daily:(draft.magicMode??'daily')==='daily',magicUses:draft.magicUses??1,
    matrices:Array.from({length:Math.max(1,Math.min(4,Number(draft.matrices)||1))},(_,i)=>({value:i+1,selected:(i+1)===(Number(draft.magicMatrix)||1)})),
    damage:DAMAGE_STEPS.map(n=>({field:'damage.d'+n,label:n+'%',value:draft.damage['d'+n]})),
    defenseCategories:['L','M','P'].map(value=>({value,selected:value===draft.defCategory})),powers:rows,hasPowers:rows.length>0,
    basket:basket.map(e=>({...e,amount:e.quantity??1})),hasBasket:basket.length>0,basketCount:basket.reduce((n,e)=>n+(e.quantity??1),0)};
}

function readDraft(app,root){
  const draft=app._specificDraft??=newSpecificDraft();
  for(const field of root.querySelectorAll('[data-specific-field]')){
    const key=field.dataset.specificField;
    if(key==='kind'||key==='object')continue;
    const value=field.type==='checkbox'?field.checked:field.value;
    if(/^damage\.d\d+$/.test(key))draft.damage[key.split('.')[1]]=value;
    else if(Object.hasOwn(draft,key)||['magicKey','magicLevel','magicMode','magicUses','magicMatrix'].includes(key))draft[key]=value;
  }
  return draft;
}
function redraw(app,root){
  app._specificScroll=root.querySelector('[data-specific-panel]')?.scrollTop??0;
  app.render(false);
}
export function bindSpecificUI(app,html){
  const root=html[0]??html,panel=root.querySelector('[data-specific-panel]');if(!panel)return;
  const kind=root.querySelector('[data-specific-field="kind"]'),object=root.querySelector('[data-specific-field="object"]');
  kind.addEventListener('change',()=>{
    app._specificDraft=newSpecificDraft(kind.value);app._specificEditId=null;redraw(app,root);
  });
  object?.addEventListener('change',async()=>{
    readDraft(app,root);
    const choices=specificChoices(await app._loadCatalog(),app._specificDraft.kind);
    app._specificDraft=chooseSpecificObject(app._specificDraft,choices.find(c=>c.value===object.value));
    redraw(app,root);
  });
  for(const field of panel.querySelectorAll('[data-specific-field]')){
    if(field===kind||field===object)continue;
    field.addEventListener('input',()=>readDraft(app,root));
    field.addEventListener('change',()=>{
      readDraft(app,root);
      if(['magicKey','magicMode','matrices'].includes(field.dataset.specificField))redraw(app,root);
    });
  }
  const search=(input,select,attribute)=>input?.addEventListener('input',()=>{
    const query=normalized(input.value);
    for(const option of select?.options??[])if(option.value)option.hidden=!normalized(attribute?option.dataset[attribute]:option.textContent).includes(query);
  });
  search(root.querySelector('[data-specific-object-search]'),object);
  search(root.querySelector('[data-specific-magic-search]'),root.querySelector('[data-specific-field="magicKey"]'),'search');
  const on=(selector,fn)=>root.querySelectorAll(selector).forEach(b=>b.addEventListener('click',async event=>{
    event.preventDefault();if(!game.user?.isGM)return;
    try{await fn(b);}catch(error){ui.notifications.warn(error.message);}
  }));
  on('[data-specific-action="add-power"]',async()=>{
    const draft=readDraft(app,root),catalog=await app._loadCatalog();
    const magic=catalog.magics.find(m=>m.key===draft.magicKey);
    if(!magic)throw Error('Escolha uma magia na lista.');
    const power={key:magic.key,level:Number(draft.magicLevel),mode:draft.magicMode??'daily',uses:Number(draft.magicUses??1),matrix:Number(draft.magicMatrix??1)};
    const candidate={...draft,magics:[...draft.magics,power]};
    // Validate before committing to the draft; failures preserve all prior powers.
    buildSpecificTreasure(candidate,catalog);app._specificDraft=candidate;redraw(app,root);
  });
  on('[data-specific-remove-power]',b=>{
    readDraft(app,root);app._specificDraft.magics.splice(Number(b.dataset.specificRemovePower),1);redraw(app,root);
  });
  on('[data-specific-action="add-basket"]',async()=>{
    if(app._specificBusy)return;app._specificBusy=true;
    try{
      const draft=readDraft(app,root),catalog=await app._loadCatalog();
      const entry=buildSpecificTreasure(draft,catalog);
      app._specificSerial=(app._specificSerial??0)+1;
      entry.basketId=app._specificEditId??`specific-${app._specificSerial}`;
      entry.manualDraft=structuredClone(draft);
      const index=app._specificBasket.findIndex(e=>e.basketId===app._specificEditId);
      if(index<0)app._specificBasket.push(entry);else app._specificBasket[index]=entry;
      app._specificEditId=null;app._specificDraft=newSpecificDraft(draft.kind);
      redraw(app,root);
    }finally{app._specificBusy=false;}
  });
  on('[data-specific-edit]',b=>{
    const entry=app._specificBasket.find(e=>e.basketId===b.dataset.specificEdit);if(!entry)return;
    app._specificDraft=structuredClone(entry.manualDraft);app._specificEditId=entry.basketId;
    app._specificScroll=0;app.render(false);
  });
  on('[data-specific-delete]',b=>{
    app._specificBasket=app._specificBasket.filter(e=>e.basketId!==b.dataset.specificDelete);
    if(app._specificEditId===b.dataset.specificDelete){app._specificEditId=null;app._specificDraft=newSpecificDraft(app._specificDraft.kind);}
    redraw(app,root);
  });
  on('[data-specific-action="cancel-edit"]',()=>{app._specificEditId=null;app._specificDraft=newSpecificDraft(app._specificDraft.kind);redraw(app,root);});
  on('[data-specific-action="create-basket"]',()=>app._createTreasure(app._specificBasket,{specific:true}));
  on('[data-specific-action="clear-basket"]',async()=>{
    if(!await Dialog.confirm({title:'Esvaziar cesta',content:'<p>Remover todos os itens desta cesta? Tesouros já criados no Foundry permanecem como estão.</p>',defaultYes:false}))return;
    app._specificBasket=[];app._specificEditId=null;redraw(app,root);
  });
  panel.scrollTop=app._specificScroll??0;
}

export function openTreasureProperties(app,properties,systemId){
  if(!game.user?.isGM)return;
  const current=game.settings.get(systemId,'tesourosPropriedades')??{};
  const content=`<form class="tesouros-tagmar-form tesouro-properties-form"><p>Estas propriedades participam somente do sorteio de itens aleatórios. Na aba Específicos, você escolhe os valores.</p><div class="tesouro-property-grid">${properties.map(p=>`<label class="tesouro-property-option"><span><input type="checkbox" data-property value="${safeText(p.key)}" ${current[p.key]!==false?'checked':''}> <strong>${safeText(p.label)}</strong></span><small>${safeText(p.compatibility)}</small></label>`).join('')}</div><p>Propriedades incompatíveis com o objeto não são sorteadas. Desmarcar uma propriedade não altera itens já criados.</p></form>`;
  new Dialog({title:'Propriedades dos itens aleatórios',content,buttons:{save:{icon:'fas fa-save',label:'Salvar',callback:async html=>{
    await app._saveProperties(html);
  }},cancel:{label:'Cancelar'}},default:'save'},{classes:['tagmar-modern-dialog','tesouro-properties-dialog'],width:580}).render(true);
}
