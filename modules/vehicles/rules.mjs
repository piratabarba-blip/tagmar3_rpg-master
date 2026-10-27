import {_preparaEfeitosAtributos} from '../sheets/actorUtils.js';
// Adaptação extraoficial: ABS é a reserva estrutural; ARM reduz cada impacto.
export const VEHICLE = 'Veiculo';
export const WAR_WEAPON = 'Arma_Guerra';
export const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const integer = value => Math.trunc(number(value));
export const positive = value => Math.max(0, number(value));
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function structuralDamage(system, amount, {repair = false} = {}) {
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw Error('Informe um valor de dano ou reparo válido.');
  const maximum = positive(system.absorcao.max);
  const before = Math.min(maximum, positive(system.absorcao.value));
  const armor = positive(system.arm);
  const effective = repair ? positive(amount) : Math.max(0, positive(amount) - armor);
  const after = Math.min(maximum, Math.max(0, before + (repair ? effective : -effective)));
  return {before, after, armor, effective, change:after - before, collapsed:maximum > 0 && after === 0};
}

export function operational(system) {
  return positive(system.absorcao.max) > 0 && positive(system.absorcao.value) > 0;
}

export function skillTotal(actor, skill) {
  if (skill?.type !== 'Habilidade') throw Error('Escolha uma habilidade válida na ficha do operador.');
  let level = integer(skill.system.nivel);
  const profession = actor.type === 'Personagem' ? actor.items.find(item=>item.type === 'Profissao') : null;
  if (profession && skill.name === actor.system.hab_nata && skill.system.tipo !== profession.system.grupo_pen) level = integer(actor.system.estagio);
  if (level < 1) return {total:-7, trained:false};
  // Mesma composição de actorUtils._updateHabilItems, sem salvar/recalcular a ficha do operador.
  const attributes = actor.type === 'Personagem' ? _preparaEfeitosAtributos({document:actor}).efetivos : actor.system.atributos;
  const attribute = attributes?.[skill.system.ajuste?.atributo] ?? 0;
  return {total:level + integer(attribute) + integer(skill.system.penalidade)
    + integer(skill.system.bonus) + integer(actor.system.bonus_habil), trained:true};
}

export function attackColumn(total, adjustment, defense, categoryAdjustment = 0, trained = true) {
  const totalColumn = Math.max(-7, trained ? integer(total) + integer(adjustment) + integer(categoryAdjustment) - integer(defense) : -7);
  // Mesma regra de colunas acima de 20 (AAC20) de tagmarItem.rollCombate.
  const column = totalColumn <= 20 ? totalColumn : (totalColumn % 20 || 20);
  return {totalColumn, column, extraDamage:Math.max(0, Math.trunc((totalColumn - column) / 20) * 50)};
}

export function damageTable(damage25) {
  const unit = Math.max(0, integer(damage25));
  return Object.fromEntries(Array.from({length:12}, (_, i) => [`d${(i + 1) * 25}`,unit * (i + 1)]));
}

export function weaponProblem(weapon, vehicle) {
  if (!vehicle || vehicle.type !== VEHICLE) return 'Coloque esta arma na ficha de um Veículo / Máquina para disparar.';
  if (!operational(vehicle.system)) return 'A estrutura está inoperante ou ainda não tem ABS configurada.';
  if (weapon.system.desativada) return 'A arma está desativada.';
  if (positive(vehicle.system.tripulacao?.atual) < Math.max(1, integer(weapon.system.operadoresMinimos))) return 'Tripulação insuficiente para esta arma.';
  if (weapon.system.controlarMunicao && positive(weapon.system.municao) < 1) return 'A arma está sem munição.';
  return null;
}

export function shotUpdate(system) {
  return system.controlarMunicao ? {'system.municao':Math.max(0, integer(system.municao) - 1)} : {};
}

export function cargoWeight(items, extra = 0) {
  return positive(extra) + items.reduce((sum,item) => sum + positive(item.system.peso)
    * (item.type === 'Pertence' ? positive(item.system.quant) : 1), 0);
}
