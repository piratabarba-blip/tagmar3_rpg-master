export const CRITICAL_SCOPE='world';
export const CRITICAL_KEY='tagmarCritical';
export const UNITS={manual:0,rounds:15,minutes:60,hours:3600,days:86400};
export const STATUS_NAMES={dead:'Morto',unconscious:'Inconsciente',stun:'Atordoado',prone:'Caído',paralysis:'Paralisado'};
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const part=(label,duration=0,unit='manual',status='',combat=0)=>({label,duration,unit,status,combat,skill:0});
const option=(label,...parts)=>({label,parts});
const injury=label=>part(label);
const penalty=(value,duration,unit='rounds')=>part('Ajuste nas rolagens',duration,unit,'',value);
const paralyze=n=>part('Paralisado',n,'rounds','paralysis');
const unconscious=(n,unit)=>part('Inconsciente',n,unit,'unconscious');
const noAttack=n=>part('Sem atacar / agir — controle da mesa',n,'rounds','stun');
const prone=()=>part('Caído — encerrar quando se levantar',0,'manual','prone');

// Presets cover only consequences already printed in the system's critical table.
// Conditional equipment, anatomy, weight and numerical interpretation remain GM choices.
export function consequenceOptions(color,failure,label){
 const index=['Combate Desarmado','Garras/Mordida','Corte','Esmagamento','Penetração','Magia','10 a 50 vezes o peso do atacante','Peso acima de 50 vezes'].findIndex(s=>label.startsWith(s));
 let parts;
 if(failure){
  if(color==='roxo')parts=[penalty(-3,2)];
  else if(color==='azul')parts=[penalty(-4,3)];
  else if(color==='branco')parts=[noAttack(1)];
  else parts=[injury({cinza:'Golpe ruim: errou o adversário',vermelho:'Aplicar 25% de dano em si mesmo pelas ações de dano',laranja:'Aplicar 50% de dano em si mesmo pelas ações de dano',amarelo:'Arma caída a 3 metros — movimentar manualmente',verde:'Fazer um ataque no companheiro mais próximo — resolver manualmente'}[color]??'Conferir consequência na descrição')];
  return [option('Consequência da falha crítica',...parts)];
 }
 if(color==='cinza'){
  if(index===0)parts=[unconscious(1,'hours'),part('Incapacitado',2,'days')];
  else if(index===6)parts=[paralyze(1),penalty(-10,7),injury('Ferimento fatal: após 7 rodadas, o mestre resolve a morte')];
  else if(index===7)parts=[injury('Metade dos ataques — controle da mesa')];
  else parts=[part('Morto — marcador; não altera EF',0,'manual','dead')];
 }else if(color==='roxo'){
  if(index===0)parts=[unconscious(30,'minutes')];
  else if(index===6)parts=[injury('Metade dos ataques — controle da mesa')];
  else if(index===7)parts=[paralyze(1),penalty(-5,10)];
  else parts=[paralyze(2),injury(['','Olho arrancado','Olho inutilizado','Pulso destruído; avaliar amputação em 2 dias','Mão inutilizada permanentemente','Pé destruído'][index]??'Lesão permanente; consultar descrição')];
 }else if(color==='azul'){
  if(index===0)parts=[noAttack(2)];
  else if(index===1)parts=[paralyze(1),injury('Orelha arrancada')];
  else if(index===2||index===4)parts=[part('Braço inutilizado',7,'days')];
  else if(index===3)return [option('Com elmo: conferir quebra do equipamento',injury('Conferir elmo; não quebrar automaticamente equipamento mágico')),option('Sem elmo: coma por 2 dias',part('Coma',2,'days','unconscious'))];
  else if(index===5)parts=[unconscious(1,'days')];
  else if(index===6)parts=[paralyze(2),penalty(-5,10)];
  else parts=[noAttack(1)];
 }else if(color==='vermelho'){
  if(index===0)parts=[prone(),injury('Desarmado: arma caída a 3 metros')];
  else if(index===1)parts=[penalty(-8,2,'days')];
  else if(index===2||index===4)parts=[part('Braço inutilizado',2,'days')];
  else if(index===3)return [option('Com elmo: conferir quebra do equipamento',injury('Conferir elmo; não quebrar automaticamente equipamento mágico')),option('Sem elmo: inconsciência e incapacitação',unconscious(2,'hours'),part('Incapacitado',2,'days'))];
  else if(index===5)parts=[unconscious(30,'minutes')];
  else if(index===6)parts=[paralyze(1),penalty(-5,10)];
  else parts=[noAttack(1),injury('Velocidade base pela metade — controle da mesa')];
 }else if(color==='laranja'){
  if(index===0)parts=[penalty(-5,4)];
  else if(index===1)parts=[prone(),noAttack(3)];
  else if(index===2)return [option('Sem elmo: coma por 1 dia',part('Coma',1,'days','unconscious')),option('Com elmo: registrar e julgar pela mesa',injury('Conferir proteção do elmo antes de aplicar a consequência'))];
  else if(index===3)return [option('Com escudo: conferir quebra do equipamento',injury('Conferir escudo; não quebrar automaticamente equipamento mágico')),option('Sem escudo: braço quebrado',part('Braço quebrado — conferir cura após um mês',0,'manual'))];
  else if(index===4)return [option('Com escudo: derrubado',prone()),option('Sem escudo: incapacitado por 2 dias',part('Incapacitado',2,'days'))];
  else if(index===5)parts=[noAttack(3)];
  else if(index===6)parts=[noAttack(2)];
  else parts=[penalty(-3,5),injury('Velocidade base pela metade — controle da mesa')];
 }else if(color==='amarelo'){
  if(index===0)parts=[penalty(-3,6)];
  else if(index===1||index===2)parts=[injury('Desarmado — movimentar a arma manualmente')];
  else if(index===3)parts=[prone(),injury('Itens que segurava caíram — controle da mesa')];
  else if(index===4)parts=[paralyze(2)];
  else if(index===5||index===6)parts=[noAttack(1)];
  else parts=[penalty(-3,5)];
 }else if(color==='branco'){
  if(index===0)parts=[injury('Desarmado: arma caída a 2 metros')];
  else if(index===1||index===5)parts=[noAttack(1)];
  else if(index===2)parts=[penalty(-4,1,'days')];
  else if(index===3)parts=[paralyze(1)];
  else if(index===4)return [option('Perfuração: ajuste −4 por 2 dias',penalty(-4,2,'days')),option('Flecha: ajuste −6 até retirar',penalty(-6,0,'manual'))];
  else if(index===6)parts=[penalty(-3,5),injury('Velocidade base pela metade — controle da mesa')];
  else parts=[penalty(-3,3)];
 }else if(color==='verde'){
  if(index===0)parts=[penalty(-3,3)];
  else if(index===1)parts=[prone(),noAttack(1)];
  else if(index===2||index===3)parts=[penalty(-4,1)];
  else if(index===4)parts=[penalty(-2,1,'hours'),part('Movimento pela metade — controle da mesa',1,'hours')];
  else if(index===5)return [option('Economizar 1 Karma — ajustar manualmente',injury('Magia evocada com maestria: economia de 1 Karma')),option('Aumentar FA em 2 — ajustar manualmente',injury('Magia evocada com maestria: +2 na FA'))];
  else if(index===6)parts=[penalty(-3,5)];
  else parts=[part('Ajuste −5 no próximo ataque — encerrar após usar',0,'manual','',-5)];
 }
 return [option('Consequência da tabela',...(parts??[injury('Conferir a descrição do crítico')]))];
}

export function calendarNow(game){
 const cal=game.modules?.get('tagmar-calendario');
 if(!cal?.active||typeof cal.api?.getDate!=='function')return null;
 const date=cal.api.getDate(),time=Number(game.time?.worldTime);
 return [date?.year,date?.dayOfYear,time].every(Number.isFinite)?(date.year*361+date.dayOfYear)*86400+((time%86400)+86400)%86400:null;
}
export function normalizeParts(parts){
 if(!Array.isArray(parts)||!parts.length||parts.length>6)throw Error('Confira as consequências antes de aplicar.');
 return parts.map(p=>{
  if(!Object.hasOwn(UNITS,p.unit))throw Error('Unidade de duração inválida.');
  const duration=Number(p.duration),combat=Number(p.combat),skill=Number(p.skill);
  if(![duration,combat,skill].every(Number.isFinite)||duration<0||Math.abs(combat)>100||Math.abs(skill)>100)throw Error('Informe duração e ajustes numéricos válidos.');
  const seconds=duration*UNITS[p.unit];
  if(p.unit!=='manual'&&(seconds<=0||seconds>365*86400))throw Error('A duração deve ser maior que zero, de até 365 dias.');
  if(p.status&&!Object.hasOwn(STATUS_NAMES,p.status))throw Error('Marcador de status inválido.');
  const label=String(p.label??'').trim().slice(0,160);if(!label)throw Error('Informe o nome da consequência.');
  return {label,seconds:p.unit==='manual'?null:seconds,status:p.status||'',combat:Math.trunc(combat),skill:Math.trunc(skill)};
 });
}
export function effectState(record,now){
 const current=record.parts.filter(p=>p.endsAt===null||now===null||p.endsAt>now);
 const status=[...new Set(current.map(p=>p.status).filter(Boolean))];
 const changes=[['combat','system.tagmarFxCombatAdjustment'],['skill','system.tagmarFxSkillAdjustment']].map(([kind,key])=>({key,mode:2,value:String(current.reduce((sum,p)=>sum+p[kind],0)),priority:20})).filter(c=>c.value!=='0');
 return {statuses:status,changes,disabled:record.endedReason==='undone'||current.length===0};
}
export function remainingText(part,now){
 if(part.endsAt===null)return 'Até o mestre encerrar';
 if(now===null)return 'Calendário indisponível';
 let n=Math.ceil(part.endsAt-now);if(n<=0)return 'Prazo encerrado';
 const pieces=[];for(const [unit,size] of [['d',86400],['h',3600],['min',60],['s',1]]){const q=Math.floor(n/size);n%=size;if(q)pieces.push(`${q} ${unit}`);if(pieces.length===2)break;}
 return `Restam ${pieces.join(' ')}`;
}
export async function consequenceId(messageId,actorUuid){
 // Stable document identity, not a security hash. Works in HTTP LAN games too,
 // where the browser does not expose crypto.subtle. Collisions are checked on use.
 let hash=14695981039346656037n;
 for(const byte of new TextEncoder().encode(`tagmar-critical:${messageId}:${actorUuid}`))hash=BigInt.asUintN(64,(hash^BigInt(byte))*1099511628211n);
 return hash.toString(16).padStart(16,'0');
}
