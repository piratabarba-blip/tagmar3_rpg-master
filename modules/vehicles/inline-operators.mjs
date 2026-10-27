import {escape, integer, skillTotal} from './rules.mjs';
import {bindings, searchName, permitted, linkOperator, removeOperator} from './operators.mjs';

export async function inlineOperatorHTML(config, editable) {
  const rows=[];
  for (const row of bindings(config)) {
    const actor=await fromUuid(row.operador), allowed=permitted(actor);
    const skill=allowed?actor.items.get(row.habilidade):null;
    const skillLabel=skill?.type==='Habilidade'
      ? `${skill.name} · Nív. ${integer(skill.system.nivel)} · Total ${skillTotal(actor,skill).total}`
      : 'Sem habilidade';
    rows.push(`<span class="tv-linked-person ${row.operador===config.operador?'active':''}"><button type="button" data-operator-select="${escape(row.operador)}" ${editable?'':'disabled'} aria-pressed="${row.operador===config.operador}" title="Usar este personagem na próxima rolagem. Nív.: nível cadastrado na habilidade. Total: valor atual da habilidade, antes dos ajustes da máquina, da arma e do alvo.">${escape(allowed?actor.name:'Vínculo indisponível')} · ${escape(skillLabel)}</button>${editable?`<button type="button" data-operator-edit="${escape(row.operador)}" title="Editar habilidade" aria-label="Editar vínculo">✎</button><button type="button" data-operator-remove="${escape(row.operador)}" aria-label="Retirar vínculo" title="Retirar vínculo">×</button>`:''}</span>`);
  }
  return `<div class="tv-inline-operators" data-operator-editor ${config.modo==='vinculado'?'':'hidden'}>
    <div class="tv-linked-people">${rows.join('')}</div>
    ${editable?`<button type="button" class="tv-add-operator" data-operator-add>+ Adicionar personagem vinculado</button><div class="tv-inline-pickers" data-operator-draft ${rows.length?'hidden':''}>
      <label class="tv-picker">Personagem<input type="search" data-character-search autocomplete="off" placeholder="Digite o nome…" role="combobox" aria-autocomplete="list" aria-expanded="false"><div class="tv-picker-results" data-character-results role="listbox" hidden></div></label>
      <label class="tv-picker">Habilidade<input type="search" data-skill-search autocomplete="off" placeholder="Escolha o personagem…" role="combobox" aria-autocomplete="list" aria-expanded="false" disabled><div class="tv-picker-results" data-skill-results role="listbox" hidden></div></label>
      <button type="button" data-operator-save title="Guarda o personagem e sua habilidade nesta lista.">Vincular</button>
    </div><small class="tv-inline-hint">Clique no personagem cadastrado para usá-lo na rolagem. Para incluir outro, use + Adicionar personagem vinculado.</small>`:''}
  </div>`;
}

function picker(input,list,onPick,onClear) {
  let options=[],visible=[],active=-1;
  function close(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
  function choose(index){const option=visible[index];if(!option)return;input.value=option.label;close();onPick(option);}
  function highlight(){for(const [index,button]of [...list.querySelectorAll('[role=option]')].entries()){button.setAttribute('aria-selected',String(index===active));if(index===active){input.setAttribute('aria-activedescendant',button.id);button.scrollIntoView({block:'nearest'});}}}
  function show(){const q=searchName(input.value);const matches=options.filter(row=>searchName(row.label).includes(q));visible=matches.slice(0,40);active=-1;
    list.replaceChildren();
    for(const [index,option]of visible.entries()){
      const button=document.createElement('button');button.type='button';button.role='option';button.id=`${list.id}-${index}`;button.setAttribute('aria-selected','false');button.textContent=option.label;
      button.addEventListener('mousedown',event=>event.preventDefault());
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();choose(index);});list.append(button);
    }
    if(!visible.length||matches.length>40){const hint=document.createElement('span');hint.className='tv-picker-hint';hint.textContent=matches.length?'Digite mais para refinar a lista.':'Nenhum resultado.';list.append(hint);}
    list.hidden=false;input.setAttribute('aria-expanded','true');
  }
  input.addEventListener('input',event=>{event.stopPropagation();onClear();show();});
  // These search boxes are UI state, not document fields; do not trigger V1 auto-submit.
  input.addEventListener('change',event=>event.stopPropagation());
  input.addEventListener('focus',show);
  input.addEventListener('blur',()=>{setTimeout(()=>{if(!list.contains(document.activeElement))close();},0);});
  input.addEventListener('keydown',event=>{
    if(['ArrowDown','ArrowUp','Enter','Escape'].includes(event.key)){event.preventDefault();event.stopPropagation();}
    if(event.key==='Escape')return close();
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){if(list.hidden)show();active=Math.max(0,Math.min(visible.length-1,active+(event.key==='ArrowDown'?1:-1)));highlight();}
    if(event.key==='Enter'&&!list.hidden)choose(active<0?0:active);
  });
  return {setOptions(rows){options=rows;close();},setValue(value){input.value=value;close();}};
}

let pickerId=0;
export async function activateInlineOperators(sheet,html,key,saveForAction,options={}) {
  const host=options.host??html[0]?.querySelector('[data-operator-editor]');if(!host||!sheet.isEditable)return;
  const target=options.document??sheet.document,config=target.system[key],actors=game.actors.filter(permitted).sort((a,b)=>a.name.localeCompare(b.name));
  if(config.operador&&!actors.some(a=>a.uuid===config.operador)){const actor=await fromUuid(config.operador);if(permitted(actor))actors.push(actor);}
  const actorInput=host.querySelector('[data-character-search]'),skillInput=host.querySelector('[data-skill-search]'),save=host.querySelector('[data-operator-save]');
  if(!actorInput)return;
  const actorList=host.querySelector('[data-character-results]'),skillList=host.querySelector('[data-skill-results]');
  for(const [input,list]of [[actorInput,actorList],[skillInput,skillList]]){list.id=`tv-operator-options-${++pickerId}`;input.setAttribute('aria-controls',list.id);}
  let actorId='',skillId='',saving=false;
  const skillPicker=picker(skillInput,skillList,option=>{skillId=option.value;},()=>{skillId='';});
  function selectActor(option){
    actorId=option.value;skillId='';const actor=actors.find(a=>a.uuid===actorId);
    const skills=(actor?.items.filter(i=>i.type==='Habilidade')??[]).map(i=>({value:i.id,label:`${i.name} (${skillTotal(actor,i).total})`})).sort((a,b)=>a.label.localeCompare(b.label));
    skillPicker.setOptions(skills);skillInput.disabled=!actor;skillInput.placeholder='Digite a habilidade…';
    const previous=bindings(target.system[key]).find(row=>row.operador===actorId);
    const selected=skills.find(row=>row.value===previous?.habilidade);skillId=selected?.value||'';skillPicker.setValue(selected?.label||'');
    save.textContent=previous?'Salvar vínculo':'Vincular';
  }
  const actorPicker=picker(actorInput,actorList,selectActor,()=>{actorId='';skillId='';skillPicker.setOptions([]);skillPicker.setValue('');skillInput.disabled=true;save.textContent='Vincular';});
  actorPicker.setOptions(actors.map(a=>({value:a.uuid,label:a.name})));
  const selected=actors.find(a=>a.uuid===config.operador);if(selected){actorPicker.setValue(selected.name);selectActor({value:selected.uuid});}
  const safely=fn=>async event=>{event.preventDefault();event.stopPropagation();if(saving)return;saving=true;save.disabled=true;try{await fn(event);}catch(error){ui.notifications.warn(error.message);}finally{saving=false;save.disabled=false;}};
  host.querySelector('[data-operator-add]').addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();host.querySelector('[data-operator-draft]').hidden=false;
    actorId='';skillId='';actorPicker.setValue('');skillPicker.setOptions([]);skillPicker.setValue('');skillInput.disabled=true;save.textContent='Vincular';actorInput.focus();
  });
  for(const button of host.querySelectorAll('[data-operator-edit]'))button.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();const actor=actors.find(a=>a.uuid===button.dataset.operatorEdit);if(!actor)return;
    host.querySelector('[data-operator-draft]').hidden=false;actorPicker.setValue(actor.name);selectActor({value:actor.uuid});skillInput.focus();
  });
  save.addEventListener('click',safely(async event=>{
    const uuid=actorId,skill=skillId;if(!uuid||!skill)throw Error('Selecione o personagem e a habilidade nos resultados da busca.');
    await saveForAction(sheet,event);await linkOperator(target,key,uuid,skill);
  }));
  for(const button of host.querySelectorAll('[data-operator-select]'))button.addEventListener('click',safely(async event=>{
    const uuid=button.dataset.operatorSelect;await saveForAction(sheet,event);
    const row=bindings(target.system[key]).find(r=>r.operador===uuid);if(!row)return;
    await target.update({[`system.${key}.operador`]:uuid,[`system.${key}.habilidade`]:row.habilidade});
  }));
  for(const button of host.querySelectorAll('[data-operator-remove]'))button.addEventListener('click',safely(async event=>{await saveForAction(sheet,event);await removeOperator(target,key,button.dataset.operatorRemove);}));
}
