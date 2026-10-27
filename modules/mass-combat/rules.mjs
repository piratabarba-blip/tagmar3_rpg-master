// Adaptação do suplemento extraoficial de Fábio Carvalho Magalhães (19/02/2024).
// Convenções e divergências editoriais: docs/combate-em-grande-escala.md.
export const TROOP = 'Tropa';
export const int = value => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
export const nat = value => Math.max(0, int(value));
export const EQUIPMENT = {
  nenhum:{label:'Sem equipamentos', divisor:0, category:'L', defense:0, points:2},
  ruim:{label:'Ruins', divisor:7, category:'L', defense:1, points:4},
  medio:{label:'Médios', divisor:5, category:'M', defense:0, points:7},
  bom:{label:'Bons', divisor:3, category:'P', defense:0, points:10}
};
export const POOLS = {geral:'Dano geral', critico:'Crítico — EF', muros:'Só ABS de muros', armadilhas:'Só ABS de armadilhas', aparatos:'Só ABS de aparatos', absorcao:'Só ABS da tropa', mira:'Geral — mirando aparatos'};
export function creatureCount({ef, eh, abs, category, quantity}) {
  return Math.ceil((nat(ef)+nat(eh)+nat(abs)+(category==='P'?50:category==='M'?25:0))/50)*nat(quantity);
}
export function derive(s, commander = s.comando?.totalManual, specialist = s.especialista?.totalManual) {
  const equipment=EQUIPMENT[s.equipamento]??EQUIPMENT.nenhum;
  const stage=Math.max(1,nat(s.estagio)), ef=Math.min(nat(s.ef?.value),nat(s.ef?.max));
  const bonus=nat(s.notaveis);
  const effective=(value,addition)=>Math.max(0,Math.min(nat(value)*2,nat(value)+addition));
  const leadership=s.semComando?0:effective(commander,bonus), expert=effective(specialist,nat(s.notaveisEspecialista));
  const base=stage+Math.floor(leadership/2), apparatusBase=stage+Math.floor(expert/2);
  const groups=['L','M','P'].map(k=>nat(s.colunas?.[k]));
  const totals=groups.map(v=>base+v), apparatusTotals=groups.map(v=>apparatusBase+v);
  const absorption=Math.ceil(equipment.divisor?ef/equipment.divisor:0)*(s.vantagemDefesa?2:1);
  const unit=Math.ceil(ef/10);
  const apparatusMax=nat(s.aparatos?.quantidade)*(nat(s.aparatos?.porUnidade)+(s.aparatos?.reforcados?50:0));
  const apparatusCurrent=Math.min(apparatusMax,nat(s.aparatos?.atual));
  const apparatus100=Math.min(unit*4,apparatusCurrent);
  const damages=Array.from({length:12},(_,i)=>unit*(i+1));
  const apparatusDamages=Array.from({length:12},(_,i)=>Math.ceil(apparatus100*(i+1)/4));
  return {stage,ef,equipment,leadership,expert,totals,apparatusTotals,absorption,unit,damages,apparatusDamages,
    apparatusMax,apparatusCurrent,moral:stage+leadership+int(s.ajusteMoral),defense:stage+equipment.defense,
    category:equipment.category,spent:groups[0]+2*groups[1]+3*groups[2],points:equipment.points,
    initiative:int(s.general)+int(s.vozComando)-4*nat(s.tropasComAparatos)};
}
export function damageAmount(s,d,percent,apparatus=false) {
  // Ajustes em passos de 25%; resistência especial reduz o dano final à metade.
  const adjusted=Math.max(0,percent+int(s.ataque?.ajusteDano));
  const raw=apparatus?Math.ceil((d.apparatusDamages[3]??0)*adjusted/100):Math.ceil(d.unit*adjusted/25);
  return s.ataque?.resistenciaEspecial && !s.tipos?.ataqueEspecial?Math.ceil(raw/2):raw;
}
export function resolveDamage(s, packets) {
  const d=derive(s);
  const pools={ef:d.ef,absorcao:Math.min(nat(s.absorcao?.value),d.absorption),
    muros:nat(s.fortificacao?.muros),armadilhas:nat(s.fortificacao?.armadilhas),aparatos:d.apparatusCurrent};
  const before={...pools};
  function spend(amount,keys){let left=nat(amount);for(const k of keys){const take=Math.min(pools[k],left);pools[k]-=take;left-=take;}return left;}
  // Ataques estruturais sempre se resolvem primeiro, sem transbordar para EF.
  for(const p of packets.filter(p=>['muros','armadilhas','aparatos','absorcao'].includes(p.kind))) spend(p.amount,[p.kind]);
  for(const p of packets.filter(p=>['geral','mira','critico'].includes(p.kind))) {
    const fort=s.fortificacao?.ativa?['armadilhas','muros']:[];
    spend(p.amount,p.kind==='critico'?['ef']:[...fort,...(p.kind==='mira'?['aparatos']:[]),'absorcao','ef']);
  }
  return {before,pools,loss:before.ef-pools.ef,defeated:pools.ef===0};
}
export function damageUpdate(s, packets) {
  const result=resolveDamage(s,packets),p=result.pools;
  return {result,update:{'system.ef.value':p.ef,'system.absorcao.value':p.absorcao,
    'system.fortificacao.muros':p.muros,'system.fortificacao.armadilhas':p.armadilhas,'system.aparatos.atual':p.aparatos,
    'system.perdasRodada':nat(s.perdasRodada)+result.loss}};
}
