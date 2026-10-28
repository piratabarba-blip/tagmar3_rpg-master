import {derive,nat,int,damageUpdate,damageAmount} from './rules.mjs';
import {escape} from '../vehicles/rules.mjs';
import {exclusive} from '../vehicles/actions.mjs';
import {rollTroop,enqueue,resolvePending} from './actions.mjs';
import {BATTLE_FLAG,PHASES,CHOICES,stateOf,members,roster,orderedUnits,validPlan,engagements,tasksFor,currentTask,currentUnit,contextFor,sameContext,initiativeTerms} from './battle-state.mjs';

const locks=new Map(),panels=new Map();
const flagPath=`flags`;
const clone=s=>structuredClone(s);
function controller(){if(!game.user.isGM||game.users.activeGM?.id!==game.user.id)throw Error('O mestre ativo conduz as etapas da batalha.');}
async function serial(c,fn){const last=locks.get(c.id)??Promise.resolve();const run=last.catch(()=>{}).then(fn);locks.set(c.id,run);try{return await run;}finally{if(locks.get(c.id)===run)locks.delete(c.id);}}
function actorOf(c,id){const a=c.combatants.get(id)?.actor;if(!a||a.type!=='Tropa')throw Error('Uma tropa foi removida do encontro. Encerre o modo guiado para reorganizá-lo.');return a;}
function assertRoster(c,s){for(const unit of s.units)if(actorOf(c,unit.id).uuid!==unit.uuid)throw Error('Os participantes mudaram. Encerre e reorganize a batalha.');if(members(c).length!==s.rosterIds.length||members(c).some(t=>!s.rosterIds.includes(t.id)))throw Error('Os participantes mudaram. Encerre e reorganize a batalha.');}
async function save(c,s){
  await c.update({[`${flagPath}.${game.system.id}.${BATTLE_FLAG}`]:s,round:s.round},{tagmarBattle:true});
  c.setupTurns();
  const id=currentUnit(s),index=id?c.turns.findIndex(t=>t.id===id):null;
  await c.update({turn:index===-1?null:index},{tagmarBattle:true});
}
function proposalKey(s){return `${s.session}:${s.round}`;}
async function prepareRound(c,s){
  assertRoster(c,s);
  await c.updateEmbeddedDocuments('Combatant',s.units.map(t=>({_id:t.id,initiative:s.initiatives[t.army]})));
  for(const id of s.order){
    const a=actorOf(c,id),key=proposalKey(s);
    if(a.getFlag(game.system.id,'battlePrepared')===key)continue;
    if(a.system.pendentes?.length)throw Error(`Resolva os danos pendentes de ${a.name} antes de iniciar outra rodada.`);
    await a.update({'system.absorcao.value':derive(a.system).absorption,'system.ocupada':Math.max(0,nat(a.system.ocupada)-1),[`flags.${game.system.id}.battlePrepared`]:key});
  }
  s.preparing=false;await save(c,s);
}
export async function startBattle(c,armyConfig){
  controller();return serial(c,async()=>{
    if(stateOf(c)?.enabled)throw Error('Esta batalha já está sendo conduzida.');
    for(const t of members(c))if(t.actor?.system.pendentes?.length)throw Error('Resolva os danos pendentes antes de iniciar o modo guiado.');
    const units=roster(c),s={enabled:true,session:foundry.utils.randomID(),round:Math.max(1,c.round),phase:'preparation',cursor:0,tasks:[],plans:{},history:[],supportDone:{},rescues:{},lastLosses:{},armyConfig,units,rosterIds:members(c).map(t=>t.id),initiatives:{},preparing:true};
    await rollInitiatives(s);s.order=orderedUnits(units,s.initiatives).map(t=>t.id);
    await save(c,s);await prepareRound(c,s);
  });
}
async function rollInitiatives(s){
  for(const army of new Set(s.units.map(t=>t.army))){
    const terms=initiativeTerms(s.units,army,s.armyConfig[army]??{}),roll=await new Roll('1d10 + @general + @voice - @penalty',terms).evaluate();
    s.initiatives[army]=roll.total;
    await roll.toMessage({flavor:`<h3>Iniciativa — ${escape(army)}</h3><p>Rodada ${s.round}. Menor resultado declara primeiro; cavalaria depois das tropas comuns.</p>`});
  }
}
export async function savePlan(c,plan){
  const s=stateOf(c);if(!s?.enabled||s.preparing||s.phase!=='preparation')throw Error('A etapa de escolha de ações não está aberta.');
  const id=currentUnit(s),unit=s.units.find(t=>t.id===id),a=actorOf(c,id);
  if(!a.isOwner)throw Error('Você precisa controlar a tropa da vez.');
  if(s.rescues?.[id]&&plan.action!=='rescue')throw Error('O resgate já foi rolado nesta rodada. Conclua-o antes de avançar.');
  if(plan.action==='rescue'&&!nat(s.lastLosses?.[id]))throw Error('Esta tropa não possui perdas de EF da última rodada para resgatar.');
  if(nat(a.system.ocupada)>0&&plan.action!=='defend'&&!s.rescues?.[id])throw Error('A tropa está ocupada. Confira ou interrompa a tarefa na ficha antes de escolher outra ação.');
  const valid=validPlan(unit,plan,s.units);
  await a.setFlag(game.system.id,'battleProposal',{key:proposalKey(s),...valid});
}
function beginPhase(c,s,phase){
  s.phase=phase;s.cursor=0;
  s.tasks=['extras','attacks'].includes(phase)?tasksFor(s,phase,id=>derive(actorOf(c,id).system).apparatusCurrent>0):[];
  // No empty rolling screens: these phases have no action to perform.
  if(phase==='extras'&&!s.tasks.length)return beginPhase(c,s,'attacks');
  if(phase==='attacks'&&!s.tasks.length)return beginPhase(c,s,'support');
}
export async function advanceBattle(c){
  controller();return serial(c,async()=>{
    const s=clone(stateOf(c));if(!s?.enabled)return;
    assertRoster(c,s);if(s.preparing)return prepareRound(c,s);
    if(s.phase==='preparation'){
      const id=currentUnit(s),a=actorOf(c,id),p=a.getFlag(game.system.id,'battleProposal');
      if(p?.key!==proposalKey(s))throw Error('Salve a decisão desta rodada antes de avançar.');
      if(p.action==='rescue'&&!s.rescues?.[id]?.done)throw Error('Confirme a posição e conclua o resgate antes de avançar, ou escolha outra ação.');
      s.plans[id]=validPlan(s.units.find(t=>t.id===id),p,s.units);
      if(++s.cursor>=s.order.length)beginPhase(c,s,'field');
    }else if(s.phase==='field')beginPhase(c,s,'extras');
    else if(['extras','attacks'].includes(s.phase)){
      if(currentTask(s)?.status!=='done')throw Error('Role o ataque, resolva o crítico ou use Passar ataque.');
      (s.history??=[]).push({...clone(currentTask(s)),phase:s.phase});
      if(++s.cursor>=s.tasks.length)beginPhase(c,s,s.phase==='extras'?'attacks':'support');
    }else if(s.phase==='support')beginPhase(c,s,'resolution');
    else if(s.phase==='resolution')throw Error('Confira o resumo e use Confirmar resolução.');
    else if(s.phase==='finished'){
      const units=roster(c);s.units=units;s.round++;s.phase='preparation';s.cursor=0;s.tasks=[];s.plans={};s.history=[];s.supportDone={};s.rescues={};s.preparing=true;
      await rollInitiatives(s);s.order=orderedUnits(units,s.initiatives).map(t=>t.id);
      await save(c,s);return prepareRound(c,s);
    }
    await save(c,s);
  });
}
export async function skipAttack(c){controller();return serial(c,async()=>{const s=clone(stateOf(c)),t=currentTask(s);if(!t||!['extras','attacks'].includes(s.phase)||t.status!=='waiting')throw Error('Não há ataque pendente para passar.');t.status='done';t.skipped=true;await save(c,s);});}
export async function rollCurrent(c){
  const s=stateOf(c),task=currentTask(s);if(!task||!['extras','attacks'].includes(s.phase)||task.status!=='waiting')throw Error('Não há ataque aguardando rolagem.');
  const source=actorOf(c,task.actorId),dest=c.combatants.get(task.targetId),a=actorOf(c,task.targetId);
  if(!source.isOwner)throw Error('Você precisa controlar a tropa atacante.');
  if(!dest.token)throw Error('O token do alvo não está disponível.');
  const d=derive(a.system),target={tokenUuid:dest.token.uuid,actorUuid:a.uuid,name:dest.name,category:d.category,defense:d.defense,resistance:!!a.system.tipos.defesaEspecial};
  return rollTroop(source,{apparatus:s.phase==='extras',battleContext:contextFor(c,s),targetOverride:target});
}
async function recordVariant(c,s,index){
  const task=currentTask(s),v=task.result?.variants?.[index];if(!v)throw Error('Escolha um resultado válido para o crítico.');
  const target=actorOf(c,task.targetId),existing=target.system.pendentes?.find(p=>p.id===task.id);
  if(existing&&(existing.amount!==v.amount||existing.kind!==v.kind))throw Error('Este ataque já foi registrado com outro resultado. Confira os danos pendentes na ficha antes de alterar o crítico.');
  const queued=await enqueue(target,{...v,id:task.id,source:`Batalha R${s.round} · ${actorOf(c,task.actorId).name}`});
  if(queued===undefined)throw Error('O alvo está concluindo outra operação. Confirme o registro novamente no painel.');
  task.status='done';task.chosen=index;await save(c,s);
}
export async function chooseVariant(c,index){controller();return serial(c,async()=>{const s=clone(stateOf(c));if(currentTask(s)?.status!=='critical')throw Error('Não há crítico pendente.');await recordVariant(c,s,index);});}
export async function acceptBattleMessage(message){
  if(!game.user.isGM||game.users.activeGM?.id!==game.user.id)return;
  const data=message.getFlag(game.system.id,'troopAttack'),ctx=data?.battle;
  if(!ctx)return;
  const c=game.combats.get(ctx.combatId);if(!c)return;
  return serial(c,async()=>{
    const s=clone(stateOf(c));if(!sameContext(s,ctx))return;
    const task=currentTask(s);if(task.status!=='waiting')return;
    const a=actorOf(c,task.actorId),dest=c.combatants.get(task.targetId),author=message.author??message.user;
    if(data.actorUuid!==a.uuid||data.target?.tokenUuid!==dest?.token?.uuid||data.target?.actorUuid!==dest?.actor?.uuid||!author||(!author.isGM&&!a.testUserPermission(author,'OWNER')))return;
    task.result={messageId:message.id,variants:data.variants??[]};
    // Persist the roll before enqueueing. Retrying after an interruption uses the same packet id.
    task.status=task.result.variants.length?'critical':'done';await save(c,s);
    if(task.result.variants.length===1)await recordVariant(c,s,0);
  });
}
// The chat fallback follows the same task and packet id as the automatic panel registration.
export async function registerBattleChatResult(message,index){
  controller();
  await acceptBattleMessage(message);
  const data=message.getFlag(game.system.id,'troopAttack'),ctx=data?.battle;
  const c=game.combats.get(ctx?.combatId);if(!c)throw Error('O encontro deste ataque não está mais disponível.');
  return serial(c,async()=>{
    const s=clone(stateOf(c));
    const task=sameContext(s,ctx)?currentTask(s):s?.history?.find(t=>t.id===ctx?.taskId);
    if(!task||task.result?.messageId!==message.id)throw Error('Este cartão não corresponde ao ataque atual. Confira o painel e os registros da tropa.');
    if(task.status==='done'){
      if(task.chosen!==index)throw Error('Este ataque já foi registrado com outro resultado. Confira os registros da tropa.');
      return false;
    }
    if(!sameContext(s,ctx)||task.status!=='critical')throw Error('Use o painel para conferir a etapa deste ataque.');
    await recordVariant(c,s,index);return true;
  });
}
export async function reconcile(c){
  if(!game.user.isGM||game.users.activeGM?.id!==game.user.id)return;
  const s=stateOf(c),task=currentTask(s);if(!task||task.status!=='waiting')return;
  const msg=game.messages.find(m=>sameContext(s,m.getFlag(game.system.id,'troopAttack')?.battle));
  if(msg)await acceptBattleMessage(msg);
}
export function supportPackets(c,s,id){
  const plan=s.plans[id];if(plan?.action!=='support')return [];
  const edges=engagements(s);if(edges.some(([a])=>a===id))return [];
  const source=actorOf(c,id),d=derive(source.system),ally=plan.targets[0];if(!source.system.tipos.apoio)return [];
  const targets=edges.filter(([a])=>a===ally).map(([,b])=>b);
  return targets.filter(targetId=>(s.history??[]).some(t=>t.phase==='attacks'&&t.actorId===ally&&t.targetId===targetId&&t.result?.variants?.[t.chosen]?.amount>0)).map(targetId=>{
    const target=actorOf(c,targetId),sys={...source.system,ataque:{...source.system.ataque,ajusteDano:0,resistenciaEspecial:!!target.system.tipos.defesaEspecial}};
    return {targetId,amount:damageAmount(sys,d,25),kind:'geral',id:`${s.session}:${s.round}:support:${id}:${targetId}`,source:`Apoio — ${source.name}`};
  });
}
export async function recordSupport(c,id){controller();return serial(c,async()=>{
  const s=clone(stateOf(c));if(s.phase!=='support')throw Error('A etapa de apoio não está aberta.');
  if(s.supportDone?.[id])return;
  const packets=supportPackets(c,s,id);if(!packets.length)throw Error('Não há apoio elegível: confira se a tropa está livre e se a aliada causou dano.');
  for(const p of packets)if(await enqueue(actorOf(c,p.targetId),p)===undefined)throw Error('Um alvo está ocupado. Tente registrar o apoio novamente.');
  (s.supportDone??={})[id]=true;await save(c,s);
});}
export async function resolveBattle(c){
  controller();return serial(c,async()=>{
    const s=clone(stateOf(c));if(s.phase!=='resolution')throw Error('A batalha não está na resolução.');
    assertRoster(c,s);
    for(const unit of s.units){
      const a=actorOf(c,unit.id),key=proposalKey(s);
      if(a.getFlag(game.system.id,'battleLossReset')!==key)await a.update({'system.perdasRodada':0,[`flags.${game.system.id}.battleLossReset`]:key});
      await resolvePending(a);
      if(a.system.pendentes?.length)throw Error(`Ainda há danos pendentes em ${a.name}. Confira a ficha e tente novamente.`);
    }
    s.lastLosses=Object.fromEntries(s.units.map(t=>[t.id,nat(actorOf(c,t.id).system.perdasRodada)]));
    s.phase='finished';s.tasks=[];s.cursor=0;await save(c,s);
  });
}
async function finishRescue(c,s,id,index){
  const a=actorOf(c,id),r=s.rescues[id],key=`${proposalKey(s)}:${id}`;
  const saved=a.getFlag(game.system.id,'battleRescue');
  if(saved?.key===key){r.done=true;r.recovered=saved.recovered;r.chosen=saved.chosen;await save(c,s);return;}
  const v=r.variants[index];if(r.variants.length&&!v)throw Error('Escolha um percentual válido para o resgate.');
  const completed=await exclusive(a,async()=>{
    if(!nat(a.system.ef.value))throw Error('A tropa está derrotada. O mestre deve avaliar os sobreviventes.');
    const recovered=Math.min(nat(v?.amount),nat(r.losses),Math.max(0,nat(a.system.ef.max)-nat(a.system.ef.value)));
    await a.update({'system.ef.value':nat(a.system.ef.value)+recovered,'system.ocupada':Math.max(1,nat(a.system.ocupada)),
      [`flags.${game.system.id}.battleRescue`]:{key,recovered,chosen:index}});
    return recovered;
  });
  if(completed===undefined)throw Error('A tropa está ocupada com outra atualização. Retome o resgate no painel.');
  r.done=true;r.recovered=completed;r.chosen=index;await save(c,s);
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:a}),content:`<h3>Resgate — ${escape(a.name)}</h3><p>EF recuperada: ${completed}. EF atual: ${nat(a.system.ef.value)} / ${nat(a.system.ef.max)}.</p><p>Tropa ocupada por uma rodada. ABS dos equipamentos será restaurada nos próximos preparativos; aparatos, muros e armadilhas não foram reparados.</p>`});
}
export async function rescueCurrent(c,{sameHex=false,index=null}={}){
  controller();return serial(c,async()=>{
    const s=clone(stateOf(c));if(!s?.enabled||s.preparing||s.phase!=='preparation')throw Error('Resgate é uma ação dos preparativos da rodada seguinte.');
    assertRoster(c,s);const id=currentUnit(s),a=actorOf(c,id),p=a.getFlag(game.system.id,'battleProposal');
    if(p?.key!==proposalKey(s)||p.action!=='rescue')throw Error('Salve a ação Resgatar feridos para esta tropa.');
    s.rescues??={};let r=s.rescues[id];if(r?.done)return false;
    if(!r){
      if(!sameHex)throw Error('Confirme que a tropa permanece no hexágono do combate anterior.');
      const losses=nat(s.lastLosses?.[id]);if(!losses)throw Error('Não há perdas de EF da rodada anterior.');
      if(nat(a.system.ocupada)>0)throw Error('A tropa já está ocupada com outra ação.');
      if(!nat(a.system.ef.value))throw Error('A tropa está derrotada. O mestre deve avaliar os sobreviventes.');
      const roll=await rollTroop(a,{rescue:true,recoveryContext:{session:s.session,round:s.round,losses}});
      if(!roll)throw Error('A tropa está concluindo outra operação. Tente novamente.');
      r=s.rescues[id]={losses,variants:roll.variants,color:roll.color,done:false,sameHex:true};await save(c,s);
    }
    if(r.variants.length>1&&index===null)return;
    await finishRescue(c,s,id,index??0);return true;
  });
}
export async function stopBattle(c){controller();return serial(c,async()=>{const s=clone(stateOf(c));s.enabled=false;await c.setFlag(game.system.id,BATTLE_FLAG,s);c.setupTurns();});}

const button=(action,label,disabled=false)=>`<button type="button" data-battle-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const friendly=(c,id)=>{const t=c.combatants.get(id);return t?.hidden&&!game.user.isGM?'Tropa oculta':t?.name??'Tropa removida';};
const help={preparation:'Escolha a ação e os alvos. Confirme no mapa quem estará no mesmo hexágono. Manter ataque pode exigir moral; reparos e fortificação são confirmados na ficha pelo mestre. O resgate é conduzido aqui após confirmar o mesmo hexágono.',field:'Confira terreno e bônus nas fichas. Resolva armadilhas quando exigirem rolagem e registre seus danos. Tropas atacadas enquanto ocupadas perdem a tarefa: confira o campo Rodadas ocupada.',extras:'Role os ataques dos aparatos. A defesa vem do alvo e o dano fica registrado para o final.',attacks:'Cada confronto tem uma rolagem por adversária, incluindo a resposta da defensora. A EF permanece intacta até a resolução.',support:'Confirme a posição e as condições do apoio no mapa antes de registrar. O painel considera a tropa livre de combate e os ataques com dano da aliada escolhida. Casos especiais podem ser registrados manualmente na ficha.',resolution:'Confira os danos registrados. Ataques estruturais serão tratados antes dos gerais; depois vêm as proteções e a EF. Confirme uma única vez.',finished:'Perdas e derrotas atualizadas. Confira abaixo a recuperação para a próxima rodada. Resgatar feridos é uma ação dos preparativos, exige permanecer no hexágono anterior e ocupa a tropa por uma rodada.'};
export function battleHTML(c){
  const s=stateOf(c),isGM=game.user.isGM;
  if(!s?.enabled){
    let units;try{units=roster(c);}catch(e){return `<p>${escape(e.message)}</p><p>Adicione os tokens ao monitor de combate. Identifique cada Exército / lado na aba Básico.</p>`;}
    const armies=[...new Set(units.map(t=>t.army))];
    return `<p>Conduzir este encontro como batalha em massa. Preparativos → Combate → Resolução.</p><p>A iniciativa é do exército. A ABS dos equipamentos será restaurada; aparatos e fortificações permanecem como estão.</p>${armies.map((army,i)=>{const a=actorOf(c,units.find(t=>t.army===army).id);return `<fieldset data-army="${i}"><legend>${escape(army)}</legend><label>Liderança do general <input type="number" name="general" value="${int(a.system.general)}"></label><label>Bônus de Voz de Comando <input type="number" name="voice" value="${int(a.system.vozComando)}"></label><small>−4 por tropa com aparatos; calculado pelo encontro.</small></fieldset>`;}).join('')}${isGM?button('start','Iniciar batalha guiada'):'<p>Aguardando o mestre iniciar.</p>'}`;
  }
  const id=currentUnit(s),a=id?c.combatants.get(id)?.actor:null,canAct=!!a?.isOwner;
  let body=`<div class="tm-battle-heading"><b>Rodada ${s.round} · ${PHASES[s.phase]??s.phase}</b>${id?`<p>${escape(friendly(c,id))}</p>`:''}</div><p>${help[s.phase]??''}</p>`;
  if(s.preparing)return body+'<p>Preparação incompleta. O mestre pode retomar sem restaurar duas vezes as tropas já preparadas.</p>'+(isGM?button('next','Retomar preparação'):'');
  if(s.phase==='preparation'&&canAct){
    const raw=a.getFlag(game.system.id,'battleProposal'),p=raw?.key===proposalKey(s)?raw:null;
    body+=`<label>Ação <select name="action">${Object.entries(CHOICES).map(([k,v])=>`<option value="${k}" ${p?.action===k?'selected':''}>${v}</option>`).join('')}</select></label><fieldset><legend>Alvos: adversárias para atacar; uma aliada para apoiar</legend>${s.units.filter(t=>t.id!==id&&(!c.combatants.get(t.id)?.hidden||isGM)).map(t=>`<label class="tm-battle-target"><input type="checkbox" name="target" value="${t.id}" ${p?.targets.includes(t.id)?'checked':''}>${escape(friendly(c,t.id))} · ${escape(t.army)}</label>`).join('')}</fieldset><label>Observação <input name="note" maxlength="300" value="${escape(p?.note??'')}"></label>${button('plan','Salvar decisão')}<p>${p?(p.action==='rescue'&&!s.rescues?.[id]?.done?'Decisão salva; conclua o resgate antes de avançar.':'Decisão salva; o mestre pode avançar.'):'Aguardando salvar a decisão desta rodada.'}</p>`;
  }
  if(s.phase==='preparation'&&a&&(isGM||canAct)){
    const p=a.getFlag(game.system.id,'battleProposal'),r=s.rescues?.[id];
    if(p?.key===proposalKey(s)&&p.action==='rescue'){
      body+=`<fieldset><legend>Resgatar feridos</legend><p>EF perdida na última rodada: ${nat(s.lastLosses?.[id])}. Coluna: estágio ${derive(a.system).stage}. Recuperação limitada à EF inicial.</p>`;
      if(r?.done)body+=`<p>Recuperados ${r.recovered} de EF. Ocupada por uma rodada.</p>`;
      else if(isGM){
        if(r?.variants?.length>1)body+=`<p>Crítico: confirme o percentual com a mesa.</p>${r.variants.map((v,i)=>button(`rescue-variant:${i}`,`${v.percent}% — recuperar ${v.amount} EF`)).join('')}`;
        else body+=button('rescue',r?'Retomar recuperação':'Confirmar posição e rolar resgate');
      }else body+='<p>Aguardando o mestre confirmar a posição e conduzir o resgate.</p>';
      body+='</fieldset>';
    }
  }
  if(s.phase==='finished'&&isGM){
    body+='<h3>Recuperação para a próxima rodada</h3><table><thead><tr><th>Tropa</th><th>EF perdida</th><th>ABS atual → próxima</th><th>Resgate</th></tr></thead><tbody>';
    for(const u of s.units){const a=actorOf(c,u.id),loss=nat(s.lastLosses?.[u.id]);body+=`<tr><td>${escape(a.name)}</td><td>${loss}</td><td>${nat(a.system.absorcao.value)} → ${derive(a.system).absorption}</td><td>${!nat(a.system.ef.value)?'Derrotada: avaliar sobreviventes':loss?'Possível: confirmar mesmo hexágono':'Sem perdas de EF'}</td></tr>`;}
    body+='</tbody></table><p>A ABS dos equipamentos será restaurada automaticamente ao iniciar a próxima rodada, conforme a EF atual. Aparatos e muralhas exigem ação de reparo; armadilhas destruídas não se recuperam.</p>';
  }
  if(['extras','attacks'].includes(s.phase)){
    const t=currentTask(s);body+=`<p>Alvo: <b>${escape(friendly(c,t.targetId))}</b> · Ataque ${s.cursor+1}/${s.tasks.length}</p>`;
    if(t.status==='waiting'){if(canAct)body+=button('roll','Rolar ataque');if(isGM)body+=button('skip','Passar ataque');}
    else if(t.status==='critical')body+=`<p>O mestre escolhe o resultado do crítico:</p>${isGM?t.result.variants.map((v,i)=>button(`variant:${i}`,`${v.percent}% — ${v.amount} de dano`)).join(''):''}`;
    else body+=`<p>${t.skipped?'Ataque dispensado pelo mestre.':'Ataque concluído; danos registrados para a resolução.'}</p>`;
  }
  if(isGM&&['field','support'].includes(s.phase))body+=`<ul>${Object.entries(s.plans).filter(([,p])=>s.phase!=='support'||p.action==='support').map(([id,p])=>`<li>${escape(friendly(c,id))}: ${CHOICES[p.action]} ${p.targets.map(t=>escape(friendly(c,t))).join(', ')}${p.action==='support'?` · 25% = ${derive(actorOf(c,id).system).unit}`:''}${p.note?` — ${escape(p.note)}`:''}</li>`).join('')}</ul>`;
  if(isGM&&s.phase==='support')for(const [id,p]of Object.entries(s.plans))if(p.action==='support'){
    const packets=supportPackets(c,s,id);
    body+=`<p>${escape(friendly(c,id))}: ${s.supportDone?.[id]?'apoio registrado':packets.length?packets.map(p=>`${p.amount} para ${escape(friendly(c,p.targetId))}`).join(' · '):'sem apoio elegível nesta rodada'}</p>`;
    if(packets.length&&!s.supportDone?.[id])body+=button(`support:${id}`,'Confirmar posição e registrar apoio');
  }
  if(isGM&&s.phase==='resolution'){
    body+='<table><thead><tr><th>Tropa</th><th>Registros</th><th>EF</th><th>ABS</th></tr></thead><tbody>';
    for(const unit of s.units){const a=actorOf(c,unit.id),q=a.system.pendentes??[],r=damageUpdate(a.system,q).result;body+=`<tr><td>${escape(a.name)}</td><td>${q.length}</td><td>${r.before.ef} → ${r.pools.ef}${r.defeated?' · Derrotada':''}</td><td>${r.before.absorcao} → ${r.pools.absorcao}</td></tr>`;}
    body+='</tbody></table>'+button('resolve','Confirmar resolução');
  }
  if(a&&canAct)body+=button('sheet','Abrir ficha da tropa');
  if(isGM){if(s.phase!=='resolution')body+=button('next',s.phase==='finished'?'Iniciar próxima rodada':'Avançar etapa / tropa');body+=button('stop','Encerrar modo guiado');}
  return body;
}

let Panel;
function panelClass(){
  return Panel??=class extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS={id:'tagmar-mass-battle',classes:['tagmar-mass-battle'],window:{title:'Tagmar — Batalha em massa',icon:'fas fa-chess-rook',resizable:true},position:{width:540,height:'auto'}};
    constructor(combat){super({id:`tagmar-mass-battle-${combat.id}`});this.combatId=combat.id;}
    get combat(){return game.combats.get(this.combatId);}
    async _renderHTML(){try{return battleHTML(this.combat);}catch(e){return `<p>${escape(e.message)}</p>${game.user.isGM&&stateOf(this.combat)?.enabled?button('stop','Encerrar modo guiado'):''}`;}}
    _replaceHTML(result,content){content.innerHTML=result;}
    _onRender(context,options){super._onRender(context,options);for(const b of this.element.querySelectorAll('[data-battle-action]'))b.addEventListener('click',async()=>{
      if(this.busy)return;this.busy=true;b.disabled=true;
      try{await this.run(b.dataset.battleAction);}catch(e){console.error('Tagmar | Batalha guiada',e);ui.notifications.warn(e.message);}finally{this.busy=false;this.render({force:true});}
    });}
    async run(action){
      const c=this.combat;if(!c)throw Error('O encontro foi encerrado.');
      if(action==='start'){
        const armies=[...new Set(roster(c).map(t=>t.army))],config={};
        for(const [i,army]of armies.entries()){const el=this.element.querySelector(`[data-army="${i}"]`);config[army]={general:int(el.querySelector('[name=general]').value),voice:int(el.querySelector('[name=voice]').value)};}
        return startBattle(c,config);
      }
      if(action==='plan')return savePlan(c,{action:this.element.querySelector('[name=action]').value,targets:[...this.element.querySelectorAll('[name=target]:checked')].map(e=>e.value),note:this.element.querySelector('[name=note]').value});
      if(action==='next')return advanceBattle(c);
      if(action==='rescue'){
        const expected=`${proposalKey(stateOf(c))}:${currentUnit(stateOf(c))}`;
        const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Confirmar resgate de feridos'},content:'<p>A tropa permanece no mesmo hexágono do combate da rodada anterior e pode realizar o resgate? A tentativa ocupa uma rodada, mesmo sem recuperar EF.</p>'});
        if(yes){if(`${proposalKey(stateOf(c))}:${currentUnit(stateOf(c))}`!==expected)throw Error('A tropa ou a rodada mudou. Confira o painel.');return rescueCurrent(c,{sameHex:true});}
      }
      if(action.startsWith('rescue-variant:'))return rescueCurrent(c,{index:Number(action.split(':')[1])});
      if(action==='roll')return rollCurrent(c);
      if(action==='skip')return skipAttack(c);
      if(action.startsWith('support:'))return recordSupport(c,action.slice(8));
      if(action.startsWith('variant:'))return chooseVariant(c,Number(action.split(':')[1]));
      if(action==='sheet')return actorOf(c,currentUnit(stateOf(c))).sheet.render(true);
      if(action==='resolve'){
        const expected=proposalKey(stateOf(c));
        const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Aplicar os danos da rodada?'},content:'<p>Aplicar os registros pendentes de todas as tropas? Confira o resumo antes de confirmar.</p>'});
        if(yes){if(proposalKey(stateOf(c))!==expected)throw Error('A rodada mudou. Confira o novo resumo.');return resolveBattle(c);}
      }
      if(action==='stop'){
        const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Encerrar condução?'},content:'<p>Os danos já aplicados permanecem e os pendentes podem ser resolvidos pelas fichas. Encerrar o modo guiado?</p>'});
        if(yes)return stopBattle(c);
      }
    }
    async close(options){panels.delete(this.combatId);return super.close(options);}
  };
}
export function openBattle(c=game.combat){
  if(!c){ui.notifications.warn('Adicione os tokens de Tropa ao monitor de combate e abra o encontro.');return;}
  let panel=panels.get(c.id);if(!panel){panel=new (panelClass())(c);panels.set(c.id,panel);}
  panel.render({force:true});reconcile(c).catch(e=>ui.notifications.warn(e.message));return panel;
}
export function registerBattle(){
  const Base=CONFIG.Combat.documentClass;
  CONFIG.Combat.documentClass=class extends Base {
    async nextTurn(){if(!stateOf(this)?.enabled)return super.nextTurn();try{await advanceBattle(this);}catch(e){ui.notifications.warn(e.message);}return this;}
    async nextRound(){if(!stateOf(this)?.enabled)return super.nextRound();return this.nextTurn();}
    async previousTurn(){if(!stateOf(this)?.enabled)return super.previousTurn();ui.notifications.warn('A condução não desfaz danos. Corrija a ficha ou encerre o modo guiado para reorganizar.');return this;}
    async previousRound(){if(!stateOf(this)?.enabled)return super.previousRound();return this.previousTurn();}
    _sortCombatants(a,b){const s=stateOf(this);if(s?.enabled){const rank=id=>{const i=s.order.indexOf(id);return i<0?9999:i;};return rank(a.id)-rank(b.id)||super._sortCombatants(a,b);}return super._sortCombatants(a,b);}
  };
  Hooks.on('preUpdateCombat',(c,change,options)=>{
    if(stateOf(c)?.enabled&&!options.tagmarBattle&&('round'in change||'turn'in change)){
      ui.notifications.warn('Use Avançar etapa / tropa no painel da batalha.');return false;
    }
  });
  Hooks.once('ready',()=>{for(const c of game.combats)if(stateOf(c)?.enabled){const a=c.combatants.get(currentUnit(stateOf(c)))?.actor;if(game.user.isGM||a?.isOwner)openBattle(c);}});
  Hooks.on('createChatMessage',m=>acceptBattleMessage(m).catch(e=>ui.notifications.warn(`Batalha: ${e.message}. Reabra o painel para conferir o registro.`)));
  Hooks.on('updateCombat',(c,change)=>{
    const s=stateOf(c);if(!s?.enabled){panels.get(c.id)?.render({force:true});return;}
    c.setupTurns();ui.combat?.render();
    const a=c.combatants.get(currentUnit(s))?.actor;
    if(game.user.isGM||a?.isOwner||panels.has(c.id))openBattle(c);
  });
  Hooks.on('updateActor',(_actor,change)=>{for(const panel of panels.values())if(panel.rendered&&(stateOf(panel.combat)?.phase!=='preparation'||JSON.stringify(change).includes('battleProposal')))panel.render({force:true});});
  Hooks.on('deleteCombat',c=>panels.get(c.id)?.close());
  Hooks.on('renderCombatTracker',(app,html)=>{
    const c=app.viewed;if(!c||!members(c).some(t=>t.actor?.type==='Tropa'))return;
    const root=html instanceof HTMLElement?html:html?.[0];if(!root||root.querySelector('[data-mass-battle-open]'))return;
    const b=document.createElement('button');b.type='button';b.dataset.massBattleOpen='';b.textContent='Batalha em massa';b.addEventListener('click',()=>openBattle(c));root.prepend(b);
  });
}
