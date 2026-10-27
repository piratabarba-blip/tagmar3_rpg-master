import {TROOP,EQUIPMENT,POOLS,derive,nat,int,creatureCount} from './rules.mjs';
import {troopData,rollTroop,rollMorale,enqueue,resolvePending,gm,registerTroopChat} from './actions.mjs';
import {requireOwner,exclusive} from '../vehicles/actions.mjs';
import {inlineOperatorHTML,activateInlineOperators} from '../vehicles/inline-operators.mjs';
import {syncOperatorForm} from '../vehicles/operators.mjs';
import {getPortraitData,activatePortraitListeners,editPortrait} from '../sheets/portrait.js';
import {copyTroopTarget,registerTroopTargeting} from './targeting.mjs';
import {registerTroopFeedback} from './feedback.mjs';

export class TroopSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{classes:['tagmar','sheet','actor','tagmar-vehicle','tagmar-troop'],width:860,height:860,submitOnChange:true,
    tabs:[{navSelector:'.prim-tabs',contentSelector:'.sheet-primary',initial:'basico'}]});}
  get template(){return `systems/${game.system.id}/templates/sheets/tropa-sheet.hbs`;}
  async getData(options){
    const data=await super.getData(options),actor=this.actor,s=actor.system,d=await troopData(actor);
    const biographyHTML=await foundry.applications.ux.TextEditor.enrichHTML(s.biografia??'',{secrets:actor.isOwner,relativeTo:actor});
    const rows=[{action:'attack',name:'Ataque da tropa',totals:d.totals,damages:d.damages.slice(0,4)},
      {action:'apparatus',name:s.aparatos.nome||'Ataque dos aparatos',totals:d.apparatusTotals,damages:d.apparatusDamages.slice(0,4)}];
    return {...data,actor,system:s,d,rows,...getPortraitData(actor),systemPath:`systems/${game.system.id}`,isGM:game.user.isGM,
      biographyHTML,equipmentOptions:Object.fromEntries(Object.entries(EQUIPMENT).map(([k,v])=>[k,v.label])),
      modes:{manual:'Total manual (mestre)',vinculado:'Personagem vinculado'},defenses:{L:'Leve (L)',M:'Média (M)',P:'Pesada (P)'},
      sizes:{50:'Pequeno — 50 ABS',100:'Médio — 100 ABS',150:'Grande — 150 ABS'},pools:POOLS,
      structuralPools:Object.fromEntries(Object.entries(POOLS).filter(([k])=>['muros','armadilhas','aparatos','absorcao'].includes(k))),
      commanderHTML:await inlineOperatorHTML(s.comando,this.isEditable),specialistHTML:await inlineOperatorHTML(s.especialista,this.isEditable),
      manualCommander:s.comando.modo!=='vinculado',manualSpecialist:s.especialista.modo!=='vinculado',overBudget:d.spent>d.points,
      queue:(s.pendentes??[]).map(p=>({...p,label:POOLS[p.kind]})),creatures:creatureCount(s.calculadora),
      defenseText:`${d.category}${d.defense}`,atHalf:d.ef<nat(s.ef.max)/2};
  }
  _onEditImage(event){return editPortrait(this,event);}
  async saveForAction(event){
    if(this._troopPendingChange)await this._troopPendingChange;
    if(this._submitting)throw Error('Aguarde a ficha terminar de salvar.');
    await this._updateObject(event,this._getSubmitData());
  }
  activateListeners(html){
    super.activateListeners(html);
    const theme=game.settings.get(game.system.id,'sheetTemplate');
    this.element.toggleClass('tagmar-dark-sheet',theme==='dark');this.element.toggleClass('tagmar-foundry-sheet',theme==='foundry');
    activatePortraitListeners(this,html);
    for(const key of ['comando','especialista'])activateInlineOperators(this,html,key,(_sheet,event)=>this.saveForAction(event),{host:html[0]?.querySelector(`[data-troop-links="${key}"] [data-operator-editor]`)});
    if(!this.isEditable)return;
    html.find('[data-troop-action]').on('click',async event=>{
      event.preventDefault();const button=event.currentTarget;if(this._troopBusy)return;this._troopBusy=true;
      try {requireOwner(this.actor);await this.saveForAction(event);await this.action(button.dataset.troopAction,button.dataset.id);}
      catch(error){console.error('Tagmar | Tropas',error);ui.notifications.warn(error.message);}
      finally{this._troopBusy=false;}
    });
  }
  async action(action,id){
    const a=this.actor,s=a.system;
    if(action==='attack'||action==='apparatus'||action==='rescue')return rollTroop(a,{apparatus:action==='apparatus',rescue:action==='rescue'});
    if(action==='morale')return rollMorale(a);
    if(action==='target')return copyTroopTarget(a);
    gm(a);
    if(action==='initiative')return new Roll('1d10 + @bonus',{bonus:derive(s).initiative}).toMessage({speaker:ChatMessage.getSpeaker({actor:a}),flavor:'Iniciativa do exército — use a mesma rolagem para suas tropas. Preparativos: menor primeiro; cavalaria age depois. A ordem do monitor continua sob controle do mestre.'});
    if(action==='register')return enqueue(a,{id:foundry.utils.randomID(),amount:s.entradaDano.valor,kind:s.entradaDano.tipo,source:'Registro manual'});
    if(action==='remove-packet')return exclusive(a,()=>a.update({'system.pendentes':(a.system.pendentes??[]).filter(p=>p.id!==id)}));
    if(action==='resolve')return resolvePending(a);
    if(action==='prepare'){
      if(s.pendentes.length)throw Error('Resolva ou retire os danos pendentes antes dos preparativos.');
      return a.update({'system.absorcao.value':derive(s).absorption,'system.perdasRodada':0});
    }
    if(action==='recover')return a.update({'system.ef.value':Math.min(nat(s.ef.max),nat(s.ef.value)+nat(s.recuperar)),'system.recuperar':0});
    if(action==='repair')return a.update({'system.aparatos.atual':derive(s).apparatusMax});
    if(action==='start')return Dialog.confirm({title:'Iniciar uma nova batalha?',content:'<p>Recompor EF e ABS da tropa, reparar os aparatos e limpar os danos registrados? Muros e armadilhas permanecem como estão.</p>',yes:async()=>{
      gm(a);const state=a.system,d=derive({...state,ef:{...state.ef,value:state.ef.max}});
      return a.update({'system.ef.value':nat(state.ef.max),'system.absorcao.value':d.absorption,'system.aparatos.atual':d.apparatusMax,'system.pendentes':[],'system.perdasRodada':0});
    }});
  }
  async _onChangeInput(event){const promise=super._onChangeInput(event);this._troopPendingChange=promise;try{return await promise;}finally{if(this._troopPendingChange===promise)this._troopPendingChange=null;}}
  async _updateObject(event,form){
    requireOwner(this.actor);
    for(const key of ['comando','especialista'])syncOperatorForm(this.actor.system[key],`system.${key}`,form);
    for(const [key,value]of Object.entries(form))if(key.startsWith('system.')&&typeof value==='number'){
      form[key]=/ajuste|bonus|totalManual|general|vozComando|valor_def/.test(key)?int(value):nat(value);
    }
    if(!game.user.isGM){
      for(const key of ['system.comando.totalManual','system.especialista.totalManual','system.comando.modo','system.especialista.modo']){
        const old=foundry.utils.getProperty(this.actor,key);
        if(key in form&&form[key]!==old)throw Error('A configuração manual do comando é reservada ao mestre.');
      }
    }
    if('system.estagio'in form)form['system.estagio']=Math.max(1,nat(form['system.estagio']));
    if('system.ef.value'in form)form['system.ef.value']=Math.min(nat(form['system.ef.value']),nat(form['system.ef.max']??this.actor.system.ef.max));
    return super._updateObject(event,form);
  }
  async _onDropItem(){ui.notifications.warn('A ficha de tropa usa as estatísticas coletivas do suplemento. Vincule os personagens pelo comando; itens individuais ficam nas fichas deles.');return false;}
}
export function prepareTroop(actor){
  if(actor.type!==TROOP)return;
  const d=derive(actor.system);
  actor.system.absorcao.max=d.absorption;
  actor.system.d_ativa={categoria:d.category,valor:d.defense};
  actor.system.iniciativa=d.initiative;
}
export function registerTroopSheet(){
  CONFIG.Actor.typeLabels[TROOP]='TYPES.Actor.Tropa';
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,'tagmar',TroopSheet,{types:[TROOP],makeDefault:true,label:'Tropa — Combate em Grande Escala'});
  Hooks.on('preCreateActor',(actor,data)=>{
    if(actor.type!==TROOP)return;
    const defaults={};if(!data.img)defaults.img='icons/svg/combat.svg';
    if(!data.prototypeToken?.bar1?.attribute)defaults['prototypeToken.bar1.attribute']='ef';
    if(!data.prototypeToken?.bar2?.attribute)defaults['prototypeToken.bar2.attribute']='absorcao';
    if(data.prototypeToken?.actorLink===undefined)defaults['prototypeToken.actorLink']=true;
    actor.updateSource(defaults);
  });
  registerTroopChat();
  registerTroopTargeting();
  registerTroopFeedback();
}
