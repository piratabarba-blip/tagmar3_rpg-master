import {CRITICAL_SCOPE as S,CRITICAL_KEY as K,UNITS,STATUS_NAMES,escapeHTML as esc,consequenceOptions,calendarNow,normalizeParts,effectState,remainingText,consequenceId} from './critical-rules.mjs';
const list=c=>Array.from(c?.contents??c??[]);
// Read the first preview's metadata directly: getFlag rejects its unregistered scope.
// New writes use the native world scope and a namespaced key, on both Tagmar editions.
export const consequenceRecord=effect=>effect?.flags?.[S]?.[K]?.consequence??effect?.flags?.[K]?.consequence;
const stateOf=consequenceRecord;
const recordPath=`flags.${S}.${K}.consequence`;
const flagOf=message=>{
 const legacy=message?.flags?.[K],current=message?.flags?.[S]?.[K];
 return legacy||current?{...legacy,...current,applications:{...legacy?.applications,...current?.applications}}:null;
};
const openSheets=new Map(),trackedActors=new Map(),busy=new Set();
const selectionEditors=new Set();
let syncQueue=Promise.resolve();

export function compactCriticalDamage(_message,html){
 const root=html?.[0]??html;if(!root?.querySelector)return;
 const buttons=[...root.querySelectorAll('.aplicarDano[data-critico="true"][data-cura="false"]')].filter(b=>!b.classList.contains('tagmar-damage-percent'));
 if(buttons.length!==4)return;
 const percentages=[25,50,75,100];
 if(!buttons.every((button,i)=>button.textContent.trim()===`Aplicar ${percentages[i]}% Dano`))return;
 const table=[...root.querySelectorAll('table')].find(t=>t.rows.length===2&&t.rows[0].cells.length===4&&t.rows[1].cells.length===4&&percentages.every((n,i)=>t.rows[0].cells[i].textContent.trim()===`${n}%`&&Number(t.rows[1].cells[i].textContent.trim())===Number(buttons[i].dataset.dano)));
 if(!table||table.closest('.tagmar-critical-damage'))return;
 const groups=new Set(buttons.map(b=>b.parentElement)),details=new Set(buttons.map(b=>b.closest('details')).filter(Boolean));
 buttons.forEach((button,i)=>{
  const percent=percentages[i],value=Number(button.dataset.dano);
  const label=`Aplicar ${percent}%: ${Number.isFinite(value)?value:button.dataset.dano} pontos de dano aos tokens selecionados`;
  button.type='button';button.textContent=`${percent}%`;button.classList.add('tagmar-damage-percent');button.title=label;button.setAttribute('aria-label',label);
  const header=table.rows[0].cells[i];header.setAttribute('scope','col');header.replaceChildren(button);
 });
 const section=document.createElement('section');section.className='tagmar-critical-damage';
 const hint=document.createElement('p');hint.className='mediaeval';hint.textContent='Clique no percentual para aplicar dano aos tokens selecionados.';
 table.before(section);section.append(hint,table);
 for(const group of groups)if(!group.textContent.trim()&&!group.querySelector('button,input,select,a'))group.remove();
 for(const detail of details)if(!detail.querySelector('button,input,select,a'))detail.remove();
}

export function collapseCriticalChoices(root,rows){
 for(const button of root.querySelectorAll('[data-critical-open]')){
  const li=button.closest('li'),row=rows.find(r=>r.key===button.dataset.criticalOpen);
  if(!li||!row||button.closest('.tagmar-critical-choice'))continue;
  const choice=document.createElement('details');choice.className='tagmar-critical-choice';choice.dataset.criticalChoice=row.key;
  const summary=document.createElement('summary');summary.className='mediaeval';summary.textContent=row.label;
  const body=document.createElement('div');body.className='tagmar-critical-choice-body';
  const description=document.createElement('p');description.className='mediaeval';description.textContent=row.description;
  body.append(description,button);choice.append(summary,body);
  li.replaceChildren(choice);li.classList.add('tagmar-critical-row');li.parentElement?.classList.add('tagmar-critical-list');
 }
}

export function criticalCard(table,{color,failure,actor,targetUuid=null}){
 const doc=new DOMParser().parseFromString(table,'text/html'),rows=[];
 for(const [index,li] of [...doc.querySelectorAll('li')].entries()){
  const label=(li.querySelector('b')?.textContent??'Consequência').replace(/:\s*$/,'').trim();
  const full=li.textContent.trim(),description=full.slice(full.indexOf(':')+1).trim();
  const key=String(index);rows.push({key,label,description:description.slice(0,2048)});
  const button=doc.createElement('button');button.type='button';button.dataset.criticalOpen=key;
  button.className='tagmar-critical-open mediaeval';button.textContent='Aplicar consequência';li.append(button);
 }
 collapseCriticalChoices(doc.body,rows);
 return {html:doc.body.innerHTML,record:{version:1,color,failure:!!failure,attackerUuid:actor?.uuid??null,targetUuid,rows}};
}
function requireGM(game){if(!game.user?.isGM)throw Error('Somente o mestre pode aplicar ou desfazer consequências.');}
function criticalData(message,rowKey){
 const data=flagOf(message),row=data?.rows?.find(r=>r.key===rowKey);
 if(data?.version!==1||!row||typeof row.description!=='string')throw Error('Este cartão não possui uma consequência válida. Faça uma nova resolução do crítico.');
 return {data,row};
}
function iconFor(status){return globalThis.CONFIG?.statusEffects?.find(s=>s.id===status)?.img??'icons/svg/aura.svg';}
function rememberActor(actor){
 if(!actor?.uuid)return;
 if(list(actor.effects).some(e=>stateOf(e)))trackedActors.set(actor.uuid,actor);else trackedActors.delete(actor.uuid);
}

export async function applyConsequence({message,rowKey,actor,tokenName,parts,game=globalThis.game}){
 requireGM(game);const {data,row}=criticalData(message,rowKey);
 if(!actor||!['Personagem','NPC'].includes(actor.type)||actor.pack)throw Error('Escolha um personagem ou PNJ válido do mundo, pelo token na cena.');
 const normalized=normalizeParts(parts),now=calendarNow(game);
 if(now===null&&normalized.some(p=>p.seconds!==null))throw Error('Ative o Grande Calendário para acompanhar a duração desta consequência.');
 const id=await consequenceId(message.id,actor.uuid),key=actor.uuid+':'+id;
 if(busy.has(key))return {duplicate:true};busy.add(key);
 try{
  const existing=actor.effects.get(id),old=stateOf(existing);
  if(existing&&(!old||old.messageId!==message.id))throw Error('Não foi possível reservar o registro da consequência; nenhum efeito foi alterado.');
  if(old&&old.endedReason!=='undone'){
   if(old.rowKey!==rowKey)throw Error('Outra consequência deste crítico já foi aplicada nesta ficha. Desfaça-a antes de escolher outra.');
   if(!existing.flags?.[S]?.[K]?.consequence)await existing.update({[recordPath]:old});
   rememberActor(actor);
   try{await message.update({[`flags.${S}.${K}.applications.${id}`]:{actorUuid:actor.uuid,effectId:id,rowKey:old.rowKey,targetName:old.targetName,undone:false}});}
   catch(error){console.warn('Tagmar | Efeito já aplicado; não foi possível atualizar o recibo.',error);}
   return {effect:existing,duplicate:true};
  }
  const record={version:1,messageId:message.id,rowKey,label:row.label,description:row.description,failure:data.failure,
   actorUuid:actor.uuid,targetName:String(tokenName||actor.name),appliedBy:game.user.id,startsAt:now,endedReason:null,
   parts:normalized.map(p=>({...p,endsAt:p.seconds===null?null:now+p.seconds}))};
  const state=effectState(record,now);
  const effectData={_id:id,name:`${data.failure?'Falha crítica':'Crítico'} — ${row.label}`,img:iconFor(state.statuses[0]),origin:message.uuid,
   description:`<p><strong>${esc(row.label)}</strong>: ${esc(row.description)}</p><p>Destino: ${esc(record.targetName)}. Consequência escolhida pelo mestre; dano é aplicado separadamente.</p>`,
   transfer:false,...state,flags:{[S]:{[K]:{consequence:record}}}};
  let effect;
  if(existing){await existing.update(effectData);effect=existing;}
  else {
   try{[effect]=await actor.createEmbeddedDocuments('ActiveEffect',[effectData],{keepId:true});}
   catch(error){const same=actor.effects.get(id);if(stateOf(same)?.messageId===message.id)return {effect:same,duplicate:true};throw error;}
  }
  if(!effect)throw Error('O Foundry não criou o efeito. Confira as permissões da ficha.');
  rememberActor(actor);
  // The Actor effect is authoritative if the optional receipt update fails.
  try{await message.update({[`flags.${S}.${K}.applications.${id}`]:{actorUuid:actor.uuid,effectId:id,rowKey,targetName:record.targetName,undone:false}});}
  catch(error){console.warn('Tagmar | Consequência aplicada; não foi possível atualizar o recibo do cartão.',error);}
  return {effect,duplicate:false};
 }finally{busy.delete(key);}
}

export async function undoConsequence({message,actor,effectId,game=globalThis.game}){
 requireGM(game);const effect=actor?.effects?.get(effectId),record=stateOf(effect);
 if(!record||record.messageId!==message.id)throw Error('A consequência não pertence a este cartão ou já foi removida.');
 if(record.endedReason==='undone')return;
 await effect.update({disabled:true,changes:[],statuses:[],[recordPath]:{...record,endedReason:'undone'}});
 const receipt={actorUuid:actor.uuid,effectId,rowKey:record.rowKey,targetName:record.targetName,undone:true};
 try{await message.update({[`flags.${S}.${K}.applications.${effectId}`]:receipt});}catch(error){console.warn('Tagmar | Consequência desfeita; o recibo não foi atualizado.',error);}
 // Do not toggle a status off globally: separate pre-existing status effects remain intact.
}

export async function synchronizeConsequences(actors,game=globalThis.game){
 const primary=list(game.users).find(u=>u.active&&u.isGM);
 if(!game.user?.isGM||primary&&primary.id!==game.user.id)return;
 const now=calendarNow(game);if(now===null)return;
 for(const actor of actors){
  // A transformation may have retired this synthetic Actor since it was tracked.
  if(actor.isToken&&actor.token?.actor!==actor)continue;
  for(const effect of list(actor.effects)){
  const record=stateOf(effect);if(!record)continue;
  if(effect.disabled||record.endedReason){if(!effect.flags?.[S]?.[K]?.consequence)await effect.update({[recordPath]:record});continue;}
  const next=effectState(record,now),previousStatuses=[...effect.statuses??[]].sort();
  if(!effect.flags?.[S]?.[K]?.consequence||next.disabled||JSON.stringify(previousStatuses)!==JSON.stringify([...next.statuses].sort())||JSON.stringify(effect.changes)!==JSON.stringify(next.changes)){
   await effect.update({...next,[recordPath]:{...record,endedReason:next.disabled?'expired':record.endedReason}});
  }
 }
 }
}

export function selectedConsequenceTargets(canvas){
 // Use the same current token selection as the native damage buttons. Target marks,
 // disposition and the attacker's identity never choose the recipients implicitly.
 return list(canvas?.tokens?.controlled).filter(t=>t.actor&&['Personagem','NPC'].includes(t.actor.type)).map(t=>({actor:t.actor,name:t.name||t.actor.name}));
}
export function refreshCriticalSelection(){
 const selected=selectedConsequenceTargets(globalThis.canvas);
 for(const editor of selectionEditors){
  if(!editor.isConnected){selectionEditors.delete(editor);continue;}
  const destination=editor.querySelector('[data-critical-destination]');
  if(destination)destination.textContent=selected.length?selected.map(t=>t.name).join(', '):'Nenhum personagem ou PNJ selecionado.';
  const status=editor.querySelector('[role="status"]');
  if(selected.length&&status?.textContent.startsWith('Selecione no mapa'))status.textContent='';
 }
}
const optionHTML=(value,label,selected)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
function partsFields(parts){
 return '<details class="tagmar-critical-options"><summary>Ajustar prazo, marcador e penalidades</summary>'+parts.map((p,i)=>`<fieldset data-critical-part="${i}"><legend>${esc(p.label)}</legend><input type="hidden" data-field="label" value="${esc(p.label)}"><div class="tagmar-critical-grid"><label title="Rodada = 15 segundos do jogo. Até o mestre encerrar serve para lesões, equipamento e próxima ação; não são curados automaticamente.">Prazo ⓘ<input type="number" min="0" step="any" data-field="duration" value="${p.duration}"></label><label>Unidade<select data-field="unit">${Object.keys(UNITS).map(k=>optionHTML(k,{manual:'Até o mestre encerrar',rounds:'Rodadas',minutes:'Minutos',hours:'Horas',days:'Dias'}[k],k===p.unit)).join('')}</select></label><label>Status<select data-field="status">${optionHTML('','Sem marcador',!p.status)}${Object.entries(STATUS_NAMES).map(([k,v])=>optionHTML(k,v,k===p.status)).join('')}</select></label><label>Combate<input type="number" min="-100" max="100" data-field="combat" value="${p.combat}"></label><label>Habilidades<input type="number" min="-100" max="100" data-field="skill" value="${p.skill}"></label></div></fieldset>`).join('')+'</details>';
}
export function bindCriticalChat(message,html){
 const root=html?.[0]??html,data=flagOf(message);if(!root?.querySelector||!data?.rows)return;
 // Also compact cards from the earlier preview without rewriting their messages.
 collapseCriticalChoices(root,data.rows);
 if(!game.user.isGM){root.querySelectorAll('[data-critical-open],.tagmar-critical-editor,.tagmar-critical-receipts').forEach(e=>e.remove());return;}
 for(const button of root.querySelectorAll('[data-critical-open]')){
  if(button.dataset.boundCritical)continue;button.dataset.boundCritical='true';
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   root.querySelectorAll('.tagmar-critical-editor').forEach(e=>e.remove());
   const row=data.rows.find(r=>r.key===button.dataset.criticalOpen);if(!row)return;
   const choices=consequenceOptions(data.color,data.failure,row.label);
   const editor=document.createElement('section');editor.className='tagmar-critical-editor';
   editor.innerHTML=`<h4>Conferir consequência</h4><label>Aplicar nos tokens selecionados<strong data-critical-destination></strong></label><label>Caso aplicável<select data-critical-variant>${choices.length>1?optionHTML('','Escolha conforme a mesa',true):''}${choices.map((c,i)=>optionHTML(i,c.label,choices.length===1)).join('')}</select></label><div data-critical-parts>${choices.length===1?partsFields(choices[0].parts):''}</div><p class="hint">Basta selecionar o token, inclusive aliados. Na falha crítica, selecione quem sofrerá a consequência, inclusive o atacante quando for o caso. Não aplica dano. Ajustes −X vêm somente em combate.</p><p class="tagmar-critical-result" role="status"></p><div class="tagmar-critical-actions"><button type="button" data-critical-confirm>Aplicar consequência</button><button type="button" data-critical-cancel>Cancelar</button></div>`;
   button.insertAdjacentElement('afterend',editor);
   selectionEditors.add(editor);refreshCriticalSelection();
   const variant=editor.querySelector('[data-critical-variant]');
   variant.addEventListener('change',()=>{editor.querySelector('[data-critical-parts]').innerHTML=variant.value===''?'':partsFields(choices[Number(variant.value)].parts);editor.querySelector('[role="status"]').textContent='';});
   editor.querySelector('[data-critical-cancel]').addEventListener('click',()=>{selectionEditors.delete(editor);editor.remove();});
   editor.querySelector('[data-critical-confirm]').addEventListener('click',async event=>{
    event.preventDefault();const confirm=event.currentTarget,status=editor.querySelector('[role="status"]');if(confirm.disabled)return;
    try{
     if(variant.value==='')throw Error('Escolha o caso aplicável antes de confirmar.');
     const destination=selectedConsequenceTargets(canvas);refreshCriticalSelection();
     if(!destination.length)throw Error('Selecione no mapa o personagem ou PNJ que receberá a consequência. Não é necessário marcar como alvo.');
     const parts=[...editor.querySelectorAll('[data-critical-part]')].map(el=>Object.fromEntries([...el.querySelectorAll('[data-field]')].map(f=>[f.dataset.field,f.value])));
     normalizeParts(parts);confirm.disabled=true;
     const applied=[],failed=[];const actors=new Set();
     for(const target of destination){if(actors.has(target.actor.uuid))continue;actors.add(target.actor.uuid);
      try{const result=await applyConsequence({message,rowKey:row.key,actor:target.actor,tokenName:target.name,parts});applied.push(`${target.name}${result.duplicate?' (já aplicada)':''}`);}
      catch(error){failed.push(`${target.name}: ${error.message}`);}
     }
     status.textContent=(applied.length?'Consequência registrada: '+applied.join(', ')+'. ':'')+(failed.length?'Não aplicada: '+failed.join('; ')+'. ':'')+'Nenhum dano foi aplicado.';
     confirm.disabled=failed.length===0;
     ui.notifications[failed.length?'warn':'info'](status.textContent);
    }catch(error){status.textContent=error.message;ui.notifications.warn(error.message);confirm.disabled=false;}
   });
  });
 }
 let receipts=root.querySelector('.tagmar-critical-receipts');if(!receipts){receipts=document.createElement('section');receipts.className='tagmar-critical-receipts';root.querySelector('.message-content')?.append(receipts);}
 receipts.innerHTML=Object.values(data.applications??{}).map(a=>`<p>${esc(a.targetName)}: ${a.undone?'consequência desfeita':'consequência registrada'} ${!a.undone?`<button type="button" data-critical-undo="${esc(a.effectId)}" data-actor="${esc(a.actorUuid)}">Desfazer consequência</button>`:''}</p>`).join('');
 receipts.querySelectorAll('[data-critical-undo]').forEach(button=>button.addEventListener('click',async event=>{
  event.preventDefault();button.disabled=true;
  try{const actor=await fromUuid(button.dataset.actor);await undoConsequence({message,actor,effectId:button.dataset.criticalUndo});ui.notifications.info('Consequência desfeita. O dano permanece como estava.');}
  catch(error){ui.notifications.warn(error.message);button.disabled=false;}
 }));
}

export function renderCriticalEffects(app,html){
 const root=html?.[0]??html,actor=app.actor??app.document;if(!root?.querySelector||!actor?.effects)return;
 openSheets.set(app,root);
 const effects=list(actor.effects).filter(e=>stateOf(e));
 let panel=root.querySelector('.tagmar-critical-effects');if(!effects.length){panel?.remove();return;}
 let tab=root.querySelector('.sheet-primary .tab[data-tab="efeitos"]');
 if(!tab){
  const nav=root.querySelector('.prim-tabs'),body=root.querySelector('.sheet-primary .tab[data-tab]')?.parentElement;
  if(!nav||!body)return;
  const label=document.createElement('label');label.className='mediaeval';label.innerHTML='<a class="item" data-tab="efeitos">Efeitos</a>';nav.append(label);
  tab=document.createElement('div');tab.className='tab efeitos container';tab.dataset.tab='efeitos';tab.dataset.group='primary';body.append(tab);
  if(app._tabs?.[0]?.active==='efeitos')tab.classList.add('active');
 }
 if(!panel){panel=document.createElement('section');panel.className='tagmar-critical-effects';tab.prepend(panel);}
 const now=calendarNow(game);
 panel.innerHTML=`<h3 class="fairyDust">Debilitações de críticos e falhas críticas</h3><p class="hint">O prazo acompanha o calendário. Após uma cura, o mestre pode remover a debilitação e seus ajustes pelo botão Curado.</p><table><thead><tr><th>Efeito / descrição</th><th>Duração e ajustes</th><th></th></tr></thead><tbody>${effects.map(e=>{
  const r=stateOf(e);return `<tr class="${e.disabled?'inactive':''}"><td><details><summary><img src="${esc(e.img)}" width="26" height="26" alt=""> ${esc(e.name)}</summary><p>${esc(r.description)}</p><p>Aplicado em: ${esc(r.targetName)}</p></details></td><td>${e.disabled?esc(r.endedReason==='undone'?'Removida pelo mestre':'Prazo encerrado'):r.parts.map(p=>`${esc(p.label)}: ${esc(remainingText(p,now))}${p.combat?`; combate ${p.combat>0?'+':''}${p.combat}`:''}${p.skill?`; habilidades ${p.skill>0?'+':''}${p.skill}`:''}`).join('<br>')}</td><td>${game.user.isGM&&!e.disabled?`<button type="button" data-critical-end="${esc(e.id)}" title="Remover a debilitação após a cura: retira seus ajustes e marcadores, sem curar EF/EH">Curado</button>`:''}</td></tr>`;
 }).join('')}</tbody></table>`;
 panel.querySelectorAll('[data-critical-end]').forEach(button=>button.addEventListener('click',async event=>{
  event.preventDefault();button.disabled=true;
  try{const e=actor.effects.get(button.dataset.criticalEnd),message=game.messages.get(stateOf(e).messageId);
   if(message)await undoConsequence({message,actor,effectId:e.id});
   else{requireGM(game);await e.update({disabled:true,changes:[],statuses:[],[recordPath]:{...stateOf(e),endedReason:'undone'}});}
   ui.notifications.info('Debilitação removida. Seus ajustes negativos e marcadores foram retirados; EF/EH permanecem como estavam.');
  }catch(error){ui.notifications.warn(error.message);button.disabled=false;}
 }));
 openSheets.set(app,root);
}
export function registerCriticalConsequences(){
 const refresh=()=>{for(const [app,root] of openSheets){if(root.isConnected)renderCriticalEffects(app,root);else openSheets.delete(app);}};
 const sync=()=>{syncQueue=syncQueue.catch(error=>console.error('Tagmar | Prazo do crítico',error)).then(()=>synchronizeConsequences(trackedActors.values())).then(refresh);};
 const scan=()=>{for(const actor of list(game.actors))rememberActor(actor);for(const scene of list(game.scenes))for(const token of list(scene.tokens))if(!token.actorLink)rememberActor(token.actor);sync();};
 Hooks.on('renderChatMessageHTML',bindCriticalChat);
 Hooks.on('renderChatMessageHTML',compactCriticalDamage);
 Hooks.on('controlToken',()=>queueMicrotask(refreshCriticalSelection));
 Hooks.on('canvasReady',refreshCriticalSelection);
 Hooks.on('renderActorSheet',renderCriticalEffects);Hooks.on('closeActorSheet',app=>openSheets.delete(app));
 for(const name of ['createActiveEffect','updateActiveEffect','deleteActiveEffect'])Hooks.on(name,e=>{rememberActor(e.parent);refresh();});
 Hooks.on('updateWorldTime',sync);Hooks.on('updateSetting',s=>{if(s.key?.startsWith('tagmar-calendario.'))sync();});
 Hooks.once('ready',scan);Hooks.on('canvasReady',scan);Hooks.on('updateUser',sync);
 Hooks.on('deleteActor',actor=>trackedActors.delete(actor.uuid));
}
