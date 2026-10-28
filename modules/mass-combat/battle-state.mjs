import {nat,int} from './rules.mjs';

export const BATTLE_FLAG='massBattle';
export const PHASES={preparation:'Preparativos',field:'Conferir o campo',extras:'Ataques extras',attacks:'Ataques principais',support:'Apoio',resolution:'Resolução',finished:'Rodada encerrada · Recuperação'};
export const CHOICES={attack:'Atacar',maintain:'Manter ataque',defend:'Defender / aguardar',support:'Apoiar',fortify:'Fortificar',repair:'Reparar',rescue:'Resgatar feridos',other:'Outra ação'};
export const stateOf=c=>c?.getFlag?.(game.system.id,BATTLE_FLAG);
export const members=c=>Array.from(c.combatants??[]);
export function roster(c){
  const all=members(c);
  if(!all.length||all.some(t=>t.actor?.type!=='Tropa'))throw Error('Use um encontro com tokens de Tropa somente.');
  const uuids=all.map(t=>t.actor.uuid);
  if(new Set(uuids).size!==uuids.length)throw Error('Dois tokens compartilham a mesma Tropa. Use fichas independentes para unidades distintas.');
  const result=all.filter(t=>nat(t.actor.system.ef.value)>0).map(t=>({id:t.id,uuid:t.actor.uuid,army:String(t.actor.system.exercito??'').trim(),cavalry:!!t.actor.system.tipos.cavalaria,support:!!t.actor.system.tipos.apoio,apparatus:nat(t.actor.system.aparatos.quantidade)>0}));
  if(result.some(t=>!t.army))throw Error('Preencha Exército / lado em todas as tropas vivas.');
  if(new Set(result.map(t=>t.army)).size<2)throw Error('A batalha precisa de pelo menos dois exércitos com tropas vivas.');
  return result;
}
export function orderedUnits(units,initiatives){
  return [...units].sort((a,b)=>Number(a.cavalry)-Number(b.cavalry)||initiatives[a.army]-initiatives[b.army]||a.army.localeCompare(b.army,'pt-BR')||a.id.localeCompare(b.id));
}
export function validPlan(unit,proposal,units){
  if(!proposal||!Object.hasOwn(CHOICES,proposal.action))throw Error('Salve a ação da tropa antes de avançar.');
  if(proposal.action==='support'&&!unit.support)throw Error('Esta tropa não possui a característica Apoio.');
  const targets=['attack','maintain','support'].includes(proposal.action)?[...new Set(proposal.targets??[])]:[];
  if(['attack','maintain','support'].includes(proposal.action)&&!targets.length)throw Error('Escolha pelo menos um alvo para esta ação.');
  if(proposal.action==='support'&&targets.length!==1)throw Error('Escolha uma tropa aliada para identificar o combate apoiado.');
  for(const id of targets){
    const other=units.find(t=>t.id===id);
    if(!other||id===unit.id)throw Error('Alvo inválido ou removido do encontro.');
    if((other.army===unit.army)!==(proposal.action==='support'))throw Error('Ataque exige adversários; apoio exige uma aliada.');
  }
  return {action:proposal.action,targets:['attack','maintain','support'].includes(proposal.action)?targets:[],note:String(proposal.note??'').slice(0,300)};
}
export function engagements(state){
  const edges=new Set();
  for(const [id,p]of Object.entries(state.plans))if(['attack','maintain'].includes(p.action))for(const target of p.targets){edges.add(`${id}|${target}`);edges.add(`${target}|${id}`);}
  const rank=new Map(state.order.map((id,i)=>[id,i]));
  return [...edges].map(e=>e.split('|')).sort((a,b)=>rank.get(a[0])-rank.get(b[0])||rank.get(a[1])-rank.get(b[1]));
}
export function tasksFor(state,phase,canUseApparatus=()=>true){
  const edges=engagements(state);
  return edges.filter(([id])=>phase!=='extras'||canUseApparatus(id)).map(([actorId,targetId],i)=>({id:`${state.session}:${state.round}:${phase}:${i}`,actorId,targetId,status:'waiting'}));
}
export const currentTask=s=>s?.tasks?.[s.cursor];
export function currentUnit(s){return s?.phase==='preparation'?s.order[s.cursor]:currentTask(s)?.actorId;}
export function contextFor(c,s,task=currentTask(s)){return {combatId:c.id,session:s.session,round:s.round,phase:s.phase,taskId:task?.id};}
export function sameContext(s,ctx){return !!s?.enabled&&s.session===ctx?.session&&s.round===ctx.round&&s.phase===ctx.phase&&currentTask(s)?.id===ctx.taskId;}
export function assertGuidedRoll(c,actor,ctx,target,apparatus){
  const s=stateOf(c),task=currentTask(s);
  if(!sameContext(s,ctx)||!['extras','attacks'].includes(s.phase)||task.status!=='waiting')throw Error('Esta etapa já mudou ou o ataque já foi registrado.');
  const source=c.combatants.get(task.actorId),dest=c.combatants.get(task.targetId);
  if(source?.actor?.uuid!==actor.uuid||dest?.token?.uuid!==target?.tokenUuid||dest?.actor?.uuid!==target?.actorUuid||apparatus!==(s.phase==='extras'))throw Error('Atacante ou alvo não corresponde à etapa atual.');
}
export function managedCombat(actor){return game.combats?.find?.(c=>stateOf(c)?.enabled&&members(c).some(t=>t.actor?.uuid===actor.uuid));}
export function initiativeTerms(units,army,config){return {general:int(config.general),voice:int(config.voice),penalty:4*units.filter(t=>t.army===army&&t.apparatus).length};}
