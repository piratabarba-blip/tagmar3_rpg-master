import {TROOP,derive,int,nat,damageAmount,damageUpdate,POOLS} from './rules.mjs';
import {requireOwner,exclusive} from '../vehicles/actions.mjs';
import {resolveOperator} from '../vehicles/operators.mjs';
import {attackColumn,escape} from '../vehicles/rules.mjs';
import {dadosColoridos} from '../dadosColoridos.js';
import {selectedTroopTarget,attackRecipients} from './targeting.mjs';
import {feedbackLines} from './feedback.mjs';
import {managedCombat,stateOf,assertGuidedRoll} from './battle-state.mjs';

export function gm(actor) {requireOwner(actor);if(!game.user.isGM)throw Error('A resolução e a preparação das tropas são controladas pelo mestre.');}
export async function troopData(actor,{strict=false,apparatus=false}={}) {
  const s=actor.system,errors=[];let leader=int(s.comando.totalManual),expert=int(s.especialista.totalManual);
  for(const key of ['comando','especialista']) {
    if(s[key].modo!=='vinculado')continue;
    try {const result=await resolveOperator(s[key]);if(key==='comando')leader=result.total;else expert=result.total;}
    catch(error){if(key==='comando')leader=0;else expert=0;errors.push(`${key==='comando'?'Comandante':'Especialista'}: ${error.message}`);
      if(strict && key===(apparatus?'especialista':'comando') && !(key==='comando'&&s.semComando))throw error;}
  }
  return {...derive(s,leader,expert),errors};
}
const colors={verde:['Falha crítica','#91cf50'],branco:['Errou','#ffffff'],amarelo:['25%','#ffff00'],laranja:['50%','#ff9900'],vermelho:['75%','#ee5555'],azul:['100%','#00a1e8'],roxo:['125%','#b3a0ff'],cinza:['Crítico','#bfbfbf']};
const percentages={amarelo:25,laranja:50,vermelho:75,azul:100,roxo:125};

export async function rollTroop(actor,{apparatus=false,rescue=false,battleContext=null,targetOverride=null,recoveryContext=null}={}) {
  requireOwner(actor);
  const managed=managedCombat(actor);
  if(managed&&rescue&&!recoveryContext)throw Error('Escolha Resgatar feridos nos preparativos do painel da batalha.');
  if(recoveryContext){const state=stateOf(managed);if(!rescue||!state?.enabled||state.phase!=='preparation'||state.session!==recoveryContext.session||state.round!==recoveryContext.round)throw Error('A etapa de resgate mudou. Confira o painel.');}
  if(managed&&!rescue&&!battleContext)throw Error('Use Rolar ataque no painel Batalha em massa para respeitar a etapa e o alvo registrados.');
  if(battleContext)assertGuidedRoll(game.combats.get(battleContext.combatId),actor,battleContext,targetOverride,apparatus);
  return exclusive(actor,async()=>{
    const stored=recoveryContext?{...actor.system,perdasRodada:nat(recoveryContext.losses)}:actor.system,target=rescue?null:(targetOverride??selectedTroopTarget(actor));
    // Consulta ao alvo no instante do clique, sem depender de um update assíncrono da ficha.
    const s=target?{...stored,inf_ataque:{...stored.inf_ataque,cat_def:target.category,valor_def:target.defense},ataque:{...stored.ataque,resistenciaEspecial:target.resistance}}:stored;
    const d=await troopData(actor,{strict:!rescue,apparatus});
    if(!d.ef)throw Error('Esta tropa está derrotada (EF zero).');
    if(apparatus&&!d.apparatusCurrent)throw Error('Configure os aparatos e sua ABS atual antes de atacar.');
    const category=['L','M','P'].includes(s.inf_ataque.cat_def)?s.inf_ataque.cat_def:'L';
    const total=(apparatus?d.apparatusTotals:d.totals)[['L','M','P'].indexOf(category)];
    const column=rescue?attackColumn(d.stage,0,0):attackColumn(total*(s.vantagemAtaque?2:1),int(s.inf_ataque.bonus)+(s.familiar?d.stage:0),s.inf_ataque.valor_def);
    const row=game.tagmar.tabela_resol.find(r=>r[0]===column.column);
    if(!row)throw Error('Tabela de resolução indisponível.');
    const roll=await new Roll('1d20').evaluate(),color=row[roll.total],critical=color==='cinza';
    const [label,bg]=colors[color];
    const variants=[];
    const candidates=critical?[25,50,75,100]:percentages[color]?[percentages[color]+column.extraDamage]:[];
    for(const percent of candidates){
      const amount=rescue?Math.min(nat(s.perdasRodada),Math.ceil(nat(s.perdasRodada)*percent/100)):damageAmount(s,d,percent,apparatus);
      let kind=apparatus?s.ataque.alvoEstrutural:critical?'critico':s.ataque.mirarAparatos?'mira':'geral';
      if(apparatus&&!['muros','armadilhas','aparatos','absorcao'].includes(kind))kind='muros';
      if(amount>0)variants.push({amount,kind,percent});
    }
    const heading=rescue?'Resgatar feridos':apparatus?(s.aparatos.nome||'Ataque de aparatos'):'Ataque da tropa';
    const buttons=rescue?'':variants.map((v,i)=>`<div>${battleContext?'':`<button type="button" data-troop-packet="${i}" data-troop-apply="true">Aplicar ${v.amount} — ${critical?v.percent+'% · ':''}${escape(POOLS[v.kind])}</button>`}<button type="button" data-troop-packet="${i}">Registrar para a resolução${critical?' — '+v.percent+'%':''}</button></div>`).join('');
    const result=variants.map(v=>`${v.percent}%: ${v.amount}`).join(' · ');
    const reminder=battleContext?'Batalha guiada: registro automático pelo mestre ativo; escolha o crítico no painel ou no chat. Os danos são aplicados na resolução.':rescue?(recoveryContext?'Resgate da batalha guiada: o painel registra a recuperação de EF e uma rodada de ocupação. Críticos exigem escolha do mestre.':'Sugestão de EF a recuperar; o mestre confirma os feridos resgatáveis na ficha. Não altera a EF automaticamente.'):
      `Mestre: ${target?(critical?'escolha o resultado crítico abaixo para registrar no alvo':'o dano será registrado automaticamente no alvo pelo mestre ativo'):'selecione os tokens das tropas atingidas e registre abaixo'}. O registro não desconta EF/ABS: aplique na resolução. Os botões continuam disponíveis para conferência ou recuperação, sem duplicar o ataque.`;
    if(game.settings.get(game.system.id,'dadosColoridos'))dadosColoridos(color,roll);
    const targetInfo=target?`<p><strong>Alvo: ${escape(target.name)}</strong> · Defesa ${target.category}${target.defense}${target.resistance?' · Defesa especial':''}</p>`:'';
    await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:`<h2>${escape(heading)} — ${escape(actor.name)}</h2>${targetInfo}<p>Coluna ${column.totalColumn}${column.extraDamage?' · AAC20 +'+column.extraDamage+'%':''}</p><h3 style="background:${bg};color:#111;text-align:center">${escape(label)}</h3><p>${result}</p><p>${reminder}</p>${buttons}`,
      flags:{[game.system.id]:{troopAttack:{variants:rescue?[]:variants,autoRegister:!rescue,actorUuid:actor.uuid,target,...(battleContext?{battle:battleContext}:{})}}}});
    return {column,color,variants};
  });
}
export async function rollMorale(actor) {
  requireOwner(actor);
  const d=await troopData(actor,{strict:true});
  const item=new game.tagmar.tagmarItem({name:`Moral — ${actor.name}`,type:'Habilidade',img:actor.img,
    system:{nivel:1,total:d.moral-int(actor.system.bonus_habil),descricao:'',tarefAperf:'Manter ataque: Médio sem perda de EF; Difícil com perda; Muito Difícil abaixo de metade da EF inicial. Motim e demais consequências são avaliados pelo mestre (suplemento, pp. 21 e 27).'}},{parent:actor});
  return item.rollHabilidade();
}
export async function enqueue(actor,packet) {
  gm(actor);if(actor.type!==TROOP)throw Error('Selecione uma tropa.');
  if(!Object.hasOwn(POOLS,packet.kind)||!Number.isFinite(Number(packet.amount))||Number(packet.amount)<=0)throw Error('Informe dano positivo e destino válido.');
  return exclusive(actor,async()=>{
    const queue=actor.system.pendentes??[],history=actor.system.resolvidos??[];
    if(queue.some(p=>p.id===packet.id)||history.includes(packet.id))return false;
    await actor.update({'system.pendentes':[...queue,{id:packet.id,amount:nat(packet.amount),kind:packet.kind,source:String(packet.source??'Dano manual')}]});return true;
  });
}
async function persistDamage(actor,packets) {
  const battle=managedCombat(actor),state=stateOf(battle),key=state?.enabled?`${state.session}:${state.round}`:null;
  const reset=key&&actor.getFlag(game.system.id,'battleLossReset')!==key;
  const {result,update}=damageUpdate(reset?{...actor.system,perdasRodada:0}:actor.system,packets),ids=new Set(packets.map(p=>p.id));
  if(reset)update[`flags.${game.system.id}.battleLossReset`]=key;
  update['system.pendentes']=(actor.system.pendentes??[]).filter(p=>!ids.has(p.id));
  update['system.resolvidos']=[...(actor.system.resolvidos??[]),...ids].slice(-500);
  await actor.update(update,{tagmarTroopDamage:{id:foundry.utils.randomID(),result}});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<h3>Resolução — ${escape(actor.name)}</h3><p>${feedbackLines(result).map(escape).join(' · ')||'Sem perda de recursos.'}</p><p>EF: ${result.before.ef} → ${result.pools.ef} · ABS: ${result.before.absorcao} → ${result.pools.absorcao}</p><p>Muros: ${result.pools.muros} · Armadilhas: ${result.pools.armadilhas} · Aparatos: ${result.pools.aparatos}</p><p><strong>${result.defeated?'Tropa derrotada — EF zero.':'Tropa ainda em combate.'}</strong></p>`});
  return result;
}
export async function applyAttackPacket(actor,packet) {
  const battle=managedCombat(actor);if(battle&&stateOf(battle).phase!=='resolution')throw Error('Aguarde a etapa de Resolução da batalha para aplicar os danos.');
  gm(actor);if(actor.type!==TROOP)throw Error('Escolha uma tropa.');
  if(!Object.hasOwn(POOLS,packet.kind)||!Number.isFinite(Number(packet.amount))||Number(packet.amount)<=0)throw Error('Dano inválido.');
  return exclusive(actor,async()=>{
    if((actor.system.resolvidos??[]).includes(packet.id))return false;
    const saved=(actor.system.pendentes??[]).find(p=>p.id===packet.id);
    if(saved&&(saved.amount!==packet.amount||saved.kind!==packet.kind))throw Error('Este crítico já foi registrado com outro resultado. Retire o registro antes de escolher outro percentual.');
    await persistDamage(actor,[saved??packet]);return true;
  });
}
export async function resolvePending(actor) {
  const battle=managedCombat(actor);if(battle&&stateOf(battle).phase!=='resolution')throw Error('Aguarde a etapa de Resolução da batalha para aplicar os danos.');
  gm(actor);
  return exclusive(actor,async()=>{
    const packets=actor.system.pendentes??[];if(!packets.length)return;
    return persistDamage(actor,packets);
  });
}
// O botão padrão do chat também respeita a etapa de resolução e não aplica ferimentos pessoais.
export async function applyTroopDamage(actor,damage) {
  gm(actor);
  if(damage.isCura)throw Error('Recupere os combatentes pela ficha de tropa; ela não possui EH.');
  await enqueue(actor,{id:foundry.utils.randomID(),amount:damage.valor,kind:damage.isCritico?'critico':'geral',source:'Chat do sistema'});
  ui.notifications.info('Dano registrado. Aplique na aba Combate, durante a etapa de resolução.');
}
// Only the active GM writes to an opposing actor; the target is frozen in the chat card.
export async function registerTargetedAttack(message){
  if(!game.user.isGM||game.users?.activeGM?.id!==game.user.id)return;
  const data=message.getFlag(game.system.id,'troopAttack');
  if(!data?.autoRegister||data.battle||!data.target||data.variants?.length!==1)return;
  const author=message.author??message.user,source=await fromUuid(data.actorUuid);
  if(source?.type!==TROOP||!author||(!author.isGM&&!source.testUserPermission(author,'OWNER')))return;
  const [target]=await attackRecipients(data);
  if(target.uuid===source.uuid)return;
  const registered=await enqueue(target,{...data.variants[0],id:message.id,source:message.speaker?.alias||source.name});
  if(registered===undefined)throw Error('O alvo está ocupado. Use Registrar para a resolução no chat para concluir.');
  return registered;
}
export function registerTroopChat() {
  Hooks.on('createChatMessage',message=>registerTargetedAttack(message).catch(error=>ui.notifications.warn(`Registro de dano: ${error.message}`)));

  Hooks.on('renderChatMessageHTML',(message,html)=>{
    for(const button of html.querySelectorAll('[data-troop-packet]')) {
      button.hidden=!game.user.isGM;
      button.addEventListener('click',async()=>{
        if(!game.user.isGM)return;
        const index=int(button.dataset.troopPacket),data=message.getFlag(game.system.id,'troopAttack'),packet=data?.variants?.[index];
        if(!packet)return;
        button.disabled=true;
        try {
          if(data.battle){
            const {registerBattleChatResult}=await import('./battle.mjs');
            await registerBattleChatResult(message,index);
            ui.notifications.info('Ataque conferido no painel da batalha; o dano será aplicado na resolução.');return;
          }
          const actors=await attackRecipients(data),apply=button.dataset.troopApply==='true';
          let count=0;
          for(const actor of actors)if(await (apply?applyAttackPacket:enqueue)(actor,{...packet,id:message.id,source:message.speaker?.alias||'Ataque de tropa'}))count++;
          ui.notifications.info(count?`Dano ${apply?'aplicado':'registrado'} em ${count} tropa(s).`:'Este ataque já foi registrado/aplicado nestas tropas.');
        } catch(error){ui.notifications.warn(error.message);} finally{button.disabled=false;}
      });
    }
  });
}
