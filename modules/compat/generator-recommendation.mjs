// SPDX-License-Identifier: GPL-3.0-or-later
export const GENERATOR_VERSION='0.3.0';
const ID='tagmar-personagens',SETTING='generatorRecommendationSeen';
const MANIFEST='https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-personagens/module.json';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recommendationState(){
 if(!game.user.isGM)return null;
 const module=game.modules.get(ID);
 if(!module)return {kind:'missing',version:''};
 if(foundry.utils.isNewerVersion(GENERATOR_VERSION,module.version??'0'))return {kind:'outdated',version:module.version??''};
 if(!module.active)return {kind:'inactive',version:module.version};
 return null;
}
export async function showGeneratorRecommendation(){
 const state=recommendationState();if(!state)return;
 const key=GENERATOR_VERSION+':'+state.kind+':'+state.version;
 if(game.settings.get(game.system.id,SETTING)===key)return;
 const instruction=state.kind==='missing'?'O módulo ainda não está instalado. Na configuração inicial do Foundry, abra Módulos adicionais → Instalar módulo e cole o manifesto abaixo.':state.kind==='outdated'?`Sua instalação está na versão ${escape(state.version)}. Na configuração inicial do Foundry, abra Módulos adicionais e use Atualizar no gerador.`:'O gerador já está instalado. Abra Gerenciamento de Módulos neste mundo e ative o módulo para usar o atalho dourado.';
 const result=await foundry.applications.api.DialogV2.wait({
  window:{title:'Tagmar — Gerador de Personagens, PNJs e Criaturas'},position:{width:560},rejectClose:false,
  content:`<h2>Gerador ${GENERATOR_VERSION}</h2><p>${instruction}</p><p>Crie personagens e PNJs, adapte criaturas do compêndio ou construa uma criatura do zero. Habilidades agrupadas, estágio até 50, VB direta, linhas compactas e buscas sem nomes repetidos.</p><p><a href="${MANIFEST}" target="_blank" rel="noopener noreferrer">Manifesto de instalação e atualização</a></p><p>Depois de instalar ou atualizar, ative o módulo no mundo. A instalação é opcional e exclusiva do mestre; este aviso não instala nada automaticamente.</p>`,
  buttons:[{action:'later',label:'Lembrar depois',default:true,callback:()=>false},{action:'dismiss',label:'Não lembrar desta versão',callback:()=>true}]
 });
 if(result===true)await game.settings.set(game.system.id,SETTING,key);
}
Hooks.once('init',()=>game.settings.register(game.system.id,SETTING,{scope:'client',config:false,type:String,default:''}));
Hooks.once('ready',()=>showGeneratorRecommendation().catch(error=>console.warn('Tagmar | Aviso do gerador',error)));
