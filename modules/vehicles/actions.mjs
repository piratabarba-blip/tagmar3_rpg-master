import {resolveOperator, resolveRollOperator} from './operators.mjs';
export {resolveOperator, operatorOptions} from './operators.mjs';
import {VEHICLE, WAR_WEAPON, number, integer, positive, escape, structuralDamage, operational, skillTotal, attackColumn, damageTable, weaponProblem, shotUpdate} from './rules.mjs';

const busy = new Set();
export async function exclusive(document, action) {
  const key = document.uuid ?? document.id;
  if (busy.has(key)) return;
  busy.add(key);
  try {return await action();} finally {busy.delete(key);}
}

export function requireOwner(document) {
  if (!document?.isOwner || document.compendium?.locked) throw Error('Você precisa controlar esta ficha e ela deve estar desbloqueada.');
}

export async function applyVehicleDamage(actor, damage, token) {
  requireOwner(actor);
  if (damage.isCura) {
    ui.notifications.warn('Veículos usam reparos em ABS. Cura de EF/EH não repara a estrutura automaticamente.');return;
  }
  return exclusive(actor, async()=>{
    const result = structuralDamage(actor.system, damage.valor);
    await actor.update({'system.absorcao.value':result.after});
    if (token?.center && canvas.ready) canvas.interface.createScrollingText(token.center,
      result.change ? `ABS ${result.change}` : 'ARM absorveu o impacto', {fill:'#edbe64',stroke:'#000',strokeThickness:2});
    return result;
  });
}

async function attackView(item, operator, category, total) {
  const description=await foundry.applications.ux.TextEditor.enrichHTML(item.system.descricao??'',{secrets:false,relativeTo:item});
  const view = {type:WAR_WEAPON,id:item.id,name:escape(item.name),img:escape(item.img),actor:item.actor,flags:{},
    system:{...item.system,tipo:`${escape(category)} — ${escape(operator.label)}`,
      descricao:`${description}<p>Arma de guerra extraoficial. Total do operador: ${total}. Críticos e falhas críticas: consequências definidas pelo mestre, sem ferimentos anatômicos automáticos.</p>`,
      dano:damageTable(item.system.dano25)}};
  view._chatActionButtons = (damage, critical, failure)=>{
    if (failure) return {button:'',buttonC:''};
    const result = game.tagmar.tagmarItem.prototype._chatActionButtons.call(view,damage,critical,failure);
    return {...result,buttonC:''};
  };
  return view;
}

export async function rollWarWeapon(item, input = {}) {
  requireOwner(item);requireOwner(item.actor);
  return exclusive(item, async()=>{
    const problem = weaponProblem(item,item.actor);
    if (problem) throw Error(problem);
    const operator = await resolveRollOperator(item.system.operacao,input);
    const category = ['L','M','P'].includes(input.category) ? input.category : 'L';
    const attack = attackColumn(operator.total, integer(item.system.ajuste) + integer(input.adjustment), input.defense,
      item.system[`def_${category.toLowerCase()}`], operator.trained);
    const row = game.tagmar.tabela_resol.find(row=>row[0] === attack.column);
    if (!row) throw Error('Coluna de resolução inválida.');
    const roll = await new Roll('1d20').evaluate();
    const outcome = row[roll.total];
    const view = await attackView(item,operator,category,operator.total);
    const update = shotUpdate(item.system);
    // O estado é salvo antes de publicar o disparo. Falhas de validação não gastam munição.
    if (Object.keys(update).length) await item.update(update);
    const ammo = item.system.controlarMunicao ? `<p>Munição: ${item.system.municao}</p>` : '';
    const methods = game.tagmar.tagmarItem.prototype;
    const args = [attack.column,outcome,false,false,false,false,roll,ammo,attack.totalColumn];
    if (attack.extraDamage) await methods.combateToChatPlus.call(view,...args,attack.extraDamage);
    else await methods.combateToChat.call(view,...args);
    return {attack,outcome};
  });
}

export function attackFromSheet(item) {
  const attack=item.actor?.system.inf_ataque??{};
  return rollWarWeapon(item,{category:attack.cat_def||'L',defense:attack.valor_def??0,adjustment:attack.bonus??0});
}

// Mantém macros e importações anteriores funcionando, agora sem abrir janela.
export const attackDialog=attackFromSheet;

export async function rollManeuver(actor, adjustment = 0, operatorUuid, input = {}) {
  requireOwner(actor);
  if (!operational(actor.system)) throw Error('Configure a ABS; uma estrutura inoperante não pode manobrar.');
  if (positive(actor.system.tripulacao.atual) < positive(actor.system.tripulacao.minima)) throw Error('Tripulação insuficiente para manobrar.');
  const operator = await resolveRollOperator(actor.system.manobra,{...input,operator:operatorUuid??input.operator});
  const total = operator.trained ? operator.total + integer(actor.system.manobra.ajuste) + integer(adjustment) : -7;
  // Documento temporário: reutiliza toda a rolagem de Habilidade, inclusive totais acima de 20.
  const temporary = new game.tagmar.tagmarItem({name:`Manobra — ${escape(actor.name)}`,type:'Habilidade',img:actor.img,
    system:{nivel:operator.trained?1:0,total:total-integer(actor.system.bonus_habil),descricao:'',tarefAperf:`${escape(operator.label)} · Ajuste da máquina: ${integer(actor.system.manobra.ajuste)}. Compare a cor com a dificuldade definida pelo mestre.`}}, {parent:actor});
  return temporary.rollHabilidade();
}

export function maneuverFromSheet(actor) {
  return rollManeuver(actor,integer(actor.system.manobra.ajusteCircunstancial));
}
export const maneuverDialog=maneuverFromSheet;
