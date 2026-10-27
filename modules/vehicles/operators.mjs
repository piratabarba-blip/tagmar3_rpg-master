import {escape, integer, skillTotal} from './rules.mjs';

export function bindings(config = {}) {
  const rows = Array.isArray(config.operadores) ? config.operadores : [];
  const byId = new Map(rows.filter(row=>typeof row?.operador==='string' && row.operador)
    .map(row=>[row.operador,{operador:row.operador,habilidade:row.habilidade || ''}]));
  // O vínculo antigo continua válido sem regravar fichas existentes.
  if (config.operador) byId.set(config.operador,{operador:config.operador,habilidade:config.habilidade || ''});
  return [...byId.values()];
}
export const searchName = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export const permitted = actor => actor?.documentName==='Actor' && !actor.compendium && ['Personagem','NPC'].includes(actor.type)
  && (game.user.isGM || actor.isOwner);

export async function resolveOperator(config, uuid) {
  if (config.modo!=='vinculado') {
    if (!game.user.isGM) throw Error('O total manual é reservado ao mestre. Vincule seu personagem e uma habilidade.');
    return {total:integer(config.totalManual),trained:true,label:'Equipe — total manual',actor:null};
  }
  const binding=bindings(config).find(row=>row.operador===(uuid || config.operador));
  if (!binding) throw Error('Escolha um dos personagens vinculados.');
  const actor=await fromUuid(binding.operador);
  if (!permitted(actor)) throw Error('Escolha um operador que você controle.');
  const skill=actor.items.get(binding.habilidade);
  return {...skillTotal(actor,skill),actor,skill,label:`${actor.name} — ${skill.name}`};
}

export async function operatorOptions(config) {
  const actors=[];let selected;
  for (const row of bindings(config)) {
    const actor=await fromUuid(row.operador);
    actors.push({value:row.operador,label:permitted(actor)?actor.name:'Vínculo indisponível'});
    if (row.operador===config.operador && permitted(actor)) selected=actor;
  }
  const skills=(selected?.items.filter(item=>item.type==='Habilidade')??[])
    .map(item=>({value:item.id,label:`${item.name} (${skillTotal(selected,item).total})`}));
  if (config.habilidade && !skills.some(row=>row.value===config.habilidade)) skills.push({value:config.habilidade,label:'Habilidade indisponível'});
  return {actors,skills};
}

export function syncOperatorForm(config, prefix, form) {
  const actorKey=`${prefix}.operador`, skillKey=`${prefix}.habilidade`;
  if (!(actorKey in form) && !(skillKey in form)) return;
  const rows=bindings(config), uuid=form[actorKey]??config.operador;
  const row=rows.find(row=>row.operador===uuid);
  if (uuid && !row) throw Error('Use Vincular para adicionar um personagem.');
  if (uuid!==config.operador) form[skillKey]=row?.habilidade || '';
  else if (row && skillKey in form) row.habilidade=form[skillKey];
  form[`${prefix}.operadores`]=rows;
}

function owner(document) {if (!document.isOwner || document.compendium?.locked) throw Error('Você precisa controlar esta ficha e ela deve estar desbloqueada.');}

export async function removeOperator(document, key, uuid) {
  owner(document);
  const config=document.system[key], current=uuid || config.operador;
  if (!current) return;
  return Dialog.confirm({title:'Retirar vínculo',content:'<p>Retirar o personagem selecionado desta lista? A ficha dele será preservada.</p>',yes:async()=>{
    owner(document);
    const latest=document.system[key], rows=bindings(latest).filter(row=>row.operador!==current);
    const active=rows.find(row=>row.operador===latest.operador)??rows[0];
    await document.update({[`system.${key}.operadores`]:rows,[`system.${key}.operador`]:active?.operador||'',[`system.${key}.habilidade`]:active?.habilidade||''});
  }});
}

export async function linkOperator(document,key,uuid,skillId) {
  owner(document);
  const actor=uuid ? await fromUuid(uuid) : null;
  if (!permitted(actor)) throw Error('Selecione um personagem que você controle.');
  skillTotal(actor,actor.items.get(skillId));
  const rows=bindings(document.system[key]).filter(row=>row.operador!==uuid);
  rows.push({operador:uuid,habilidade:skillId});
  return document.update({[`system.${key}.operadores`]:rows,[`system.${key}.operador`]:uuid,[`system.${key}.habilidade`]:skillId,[`system.${key}.modo`]:'vinculado'});
}

export async function resolveRollOperator(config,input={}) {
  const mode=input.mode??config.modo;
  if(mode==='manual') {
    const total=input.manualTotal??config.totalManual;
    if(!Number.isFinite(Number(total)))throw Error('Informe um total manual numérico.');
    return resolveOperator({...config,modo:'manual',totalManual:total});
  }
  return resolveOperator({...config,modo:'vinculado'},input.operator);
}

export function rollOperatorInput(html) {
  return {mode:html.find('[name=operatorMode]').val(),manualTotal:html.find('[name=manualTotal]').val(),operator:html.find('[name=operator]').val()};
}

export function activateRollOperatorField(html) {
  const host=html[0],mode=host?.querySelector('[name=operatorMode]');if(!mode)return;
  const refresh=()=>{for(const el of host.querySelectorAll('[data-roll-manual]'))el.style.display=mode.value==='manual'?'':'none';for(const el of host.querySelectorAll('[data-roll-linked]'))el.style.display=mode.value==='vinculado'?'':'none';};
  mode.addEventListener('change',refresh);refresh();
}

export async function rollOperatorField(config) {
  if (!game.user.isGM && config.modo!=='vinculado') await resolveOperator(config);
  const options=[];
  for (const row of bindings(config)) {
    try {
      const op=await resolveOperator({...config,modo:'vinculado'},row.operador);
      options.push(`<option value="${escape(row.operador)}" ${row.operador===config.operador?'selected':''}>${escape(op.label)} (${op.total})</option>`);
    } catch { /* Não oferece personagens indisponíveis ou sem permissão. */ }
  }
  if (!game.user.isGM && !options.length) throw Error('Vincule um personagem que você controle e escolha uma habilidade válida.');
  const manual=config.modo!=='vinculado';
  const source=game.user.isGM ? `<div class="form-group"><label>Origem deste teste</label><select name="operatorMode"><option value="manual" ${manual?'selected':''}>Total manual (mestre)</option><option value="vinculado" ${manual?'':'selected'}>Personagem vinculado</option></select></div><div class="form-group" data-roll-manual style="${manual?'':'display:none'}"><label>Total manual</label><input type="number" name="manualTotal" value="${integer(config.totalManual)}"></div>` : '';
  return source+`<div data-roll-linked style="${manual?'display:none':''}">${options.length?`<div class="form-group"><label>Quem fará o teste?</label><select name="operator">${options.join('')}</select></div>`:'<p>Nenhum personagem vinculado com habilidade válida. O mestre pode escolher Total manual acima.</p>'}</div>`;
}
