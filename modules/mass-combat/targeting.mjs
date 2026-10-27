import {TROOP,derive} from './rules.mjs';
import {requireOwner} from '../vehicles/actions.mjs';

export function selectedTroopTarget(attacker,{required=false}={}) {
  const targets=[...(game.user.targets??[])];
  if(!targets.length){if(required)throw Error('Marque uma tropa como alvo.');return null;}
  if(targets.length!==1)throw Error('Marque apenas uma tropa: cada adversária exige sua própria rolagem.');
  const token=targets[0],actor=token.actor;
  if(actor?.type!==TROOP)throw Error('Escolha uma Tropa como alvo para o combate em grande escala.');
  if(actor.uuid===attacker.uuid)throw Error('A tropa não pode atacar a si mesma.');
  const d=derive(actor.system);
  return {tokenUuid:token.document.uuid,actorUuid:actor.uuid,name:token.name??actor.name,
    category:d.category,defense:d.defense,resistance:!!actor.system.tipos?.defesaEspecial};
}
export function targetChanges(target) {
  return {'system.inf_ataque.cat_def':target.category,'system.inf_ataque.valor_def':target.defense,'system.ataque.resistenciaEspecial':target.resistance};
}
export async function copyTroopTarget(actor) {
  requireOwner(actor);
  return actor.update(targetChanges(selectedTroopTarget(actor,{required:true})));
}
export async function attackRecipients(data) {
  if(data?.target) {
    // O destino do ataque é o token que foi mirado na rolagem, mesmo se o GM trocar a seleção depois.
    const token=await fromUuid(data.target.tokenUuid),actor=token?.actor;
    if(!actor||actor.type!==TROOP||actor.uuid!==data.target.actorUuid)throw Error('O alvo original não está mais disponível. Não foi aplicado dano em outro token.');
    return [actor];
  }
  // Cartões manuais/anteriores continuam permitindo selecionar os destinatários.
  const actors=[...new Map((canvas.tokens?.controlled??[]).filter(t=>t.actor?.type===TROOP&&t.actor.uuid!==data?.actorUuid).map(t=>[t.actor.uuid,t.actor])).values()];
  if(!actors.length)throw Error('Selecione os tokens das tropas atingidas. O atacante não pode receber seu próprio ataque.');
  return actors;
}
export function registerTroopTargeting() {
  const pending=new WeakMap();
  Hooks.on('targetToken',(user,_token,targeted)=>{
    if(user.id!==game.user.id||!targeted||game.settings.get(game.system.id,'autoTarget')!=='yes')return;
    const selected=(canvas.tokens?.controlled??[]).map(t=>t.actor).filter(a=>a?.type===TROOP&&a.isOwner);
    if(!selected.length){const speaker=ChatMessage.getSpeaker();const actor=game.actors.get(speaker.actor);if(actor?.type===TROOP&&actor.isOwner)selected.push(actor);}
    for(const actor of new Set(selected)) {
      const run=(pending.get(actor)??Promise.resolve()).catch(()=>{}).then(async()=>{
        if(game.user.targets?.size!==1)return;
        const target=selectedTroopTarget(actor);if(target)await actor.update(targetChanges(target));
      }).catch(error=>ui.notifications.warn(error.message));
      pending.set(actor,run);
    }
  });
}
