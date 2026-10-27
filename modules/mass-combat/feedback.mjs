import {TROOP} from './rules.mjs';
const labels={ef:'EF',absorcao:'ABS',muros:'Muros',armadilhas:'Armadilhas',aparatos:'Aparatos'};
export function feedbackLines(result) {
  const lines=Object.entries(labels).filter(([key])=>result.before[key]>result.pools[key])
    .map(([key,label])=>`${label} −${result.before[key]-result.pools[key]}`);
  if(result.defeated)lines.push('DERROTADA');
  return lines;
}
export function registerTroopFeedback() {
  const seen=new Set();
  Hooks.on('updateActor',async(actor,changes,options,userId)=>{
    if(actor.type!==TROOP)return;
    const event=options?.tagmarTroopDamage;
    if(event&&!seen.has(event.id)) {
      seen.add(event.id);if(seen.size>200)seen.delete(seen.values().next().value);
      if(canvas.ready) {
        const text=feedbackLines(event.result).join('\n');
        if(text)for(const token of canvas.tokens?.placeables??[]) {
          if(token.actor?.uuid===actor.uuid&&token.isVisible)canvas.interface.createScrollingText(token.center,text,
            {fill:event.result.defeated?'#ff6060':'#ffbe70',stroke:'#000000',strokeThickness:4,fontSize:28,duration:2500});
        }
      }
    }
    // O hook normal do sistema cuida do efeito no ator; sincroniza também o monitor de combate.
    const flat=foundry.utils.flattenObject(changes);
    if(userId!==game.user.id||!game.user.isGM||!Object.hasOwn(flat,'system.ef.value'))return;
    const defeated=Number(actor.system.ef.value)<=0;
    for(const combat of game.combats??[]) {
      const updates=combat.combatants.filter(c=>c.actor?.uuid===actor.uuid&&c.defeated!==defeated).map(c=>({_id:c.id,defeated}));
      if(updates.length)await combat.updateEmbeddedDocuments('Combatant',updates);
    }
  });
}
