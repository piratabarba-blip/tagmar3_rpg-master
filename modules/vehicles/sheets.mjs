import {syncOperatorForm} from './operators.mjs';
import {inlineOperatorHTML, activateInlineOperators} from './inline-operators.mjs';
import {getPortraitData, activatePortraitListeners, editPortrait} from '../sheets/portrait.js';
import {VEHICLE, WAR_WEAPON, positive, integer, escape, cargoWeight, structuralDamage, operational, damageTable, weaponProblem} from './rules.mjs';
import {operatorOptions, resolveOperator, requireOwner, attackFromSheet, maneuverFromSheet, exclusive} from './actions.mjs';

const path = name => `systems/${game.system.id}/templates/sheets/${name}.hbs`;
function theme(sheet) {
  const selected = game.settings.get(game.system.id,'sheetTemplate');
  sheet.element.toggleClass('tagmar-dark-sheet',selected==='dark');
  sheet.element.toggleClass('tagmar-foundry-sheet',selected==='foundry');
}
function guarded(action) {return async event=>{event.preventDefault();try {await action(event);} catch(error) {console.error('Tagmar | Veículos',error);ui.notifications.warn(error.message);}};}
async function saveForAction(sheet,event,{skipWeapon=false}={}) {
  if (!skipWeapon && sheet._vehicleWeaponPending) await sheet._vehicleWeaponPending;
  if (sheet._vehiclePendingChange) await sheet._vehiclePendingChange;
  if (sheet._submitting) throw Error('Aguarde a ficha terminar de salvar e tente novamente.');
  // _onSubmit do Foundry captura erros internamente; a ação precisa parar se o update falhar.
  await sheet._updateObject(event,sheet._getSubmitData());
}
function numericDialog(title,label,callback,{signed=false}={}) {
  return new Dialog({title,content:`<div class="form-group"><label>${escape(label)}</label><input name="amount" type="number" ${signed?'':'min="0"'} step="1" value="0"></div>`,
    buttons:{apply:{label:'Confirmar',callback:html=>Promise.resolve(callback(html.find('[name=amount]').val())).catch(error=>ui.notifications.warn(error.message))},cancel:{label:'Cancelar'}},default:'apply'}).render(true);
}

export class VehicleSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions,{classes:['tagmar','sheet','actor','tagmar-vehicle'],width:860,height:820,submitOnChange:true,
      tabs:[{navSelector:'.prim-tabs',contentSelector:'.sheet-primary',initial:'basico'}]});
  }
  get template() {return path('veiculo-sheet');}
  async getData(options) {
    const data = await super.getData(options);
    const actor = this.actor;
    const items = [...actor.items];
    const weight = cargoWeight(items,actor.system.cargaExtra);
    const weapons = await Promise.all(items.filter(item=>item.type===WAR_WEAPON).map(async item=>{
      let operator;
      try {operator=await resolveOperator(item.system.operacao);} catch {operator=null;}
      const column=category=>operator ? (operator.trained ? operator.total+integer(item.system.ajuste)+integer(item.system[`def_${category}`]) : -7) : '—';
      return {id:item.id,name:item.name,img:item.img,ammo:item.system.controlarMunicao?item.system.municao:'—',
        reload:item.system.recarga,range:item.system.alcance||'—',l:column('l'),m:column('m'),p:column('p'),damage:damageTable(item.system.dano25).d100,
        mode:item.system.operacao.modo,manualTotal:item.system.operacao.totalManual,isManual:item.system.operacao.modo!=='vinculado',
        operatorEditorHTML:await inlineOperatorHTML(item.system.operacao,data.editable),
        crew:`${actor.system.tripulacao.atual}/${item.system.operadoresMinimos}`,status:weaponProblem(item,actor)??'Pronta'};
    }));
    const cargoRow=item=>({id:item.id,name:item.name,img:item.img,quantity:item.system.quant??1,weight:item.system.peso??0,
      total:(positive(item.system.peso)*positive(item.system.quant??1)).toFixed(2),inTransport:!!item.system.inTransport});
    // Mantém as notas já preenchidas; apenas a apresentação passa para Biografia.
    const notes = actor.system.notas ?? '';
    const biography = /<(?:p|div|h[1-6]|ul|ol|table|blockquote)(?:\s|>)/i.test(notes) ? notes : escape(notes).replace(/\r?\n/g,'<br>');
    const biographyHTML = await foundry.applications.ux.TextEditor.enrichHTML(biography,{secrets:actor.isOwner,relativeTo:actor});
    return {...data,actor,system:actor.system,...getPortraitData(actor),isGM:game.user.isGM,owner:actor.isOwner,biographyHTML,
      attackSettings:{...actor.system.inf_ataque,cat_def:actor.system.inf_ataque?.cat_def||'L'},
      systemPath:`systems/${game.system.id}`,operational:operational(actor.system),
      absPercent:actor.system.absorcao.max>0 ? Math.min(100,Math.max(0,actor.system.absorcao.value / actor.system.absorcao.max*100)) : 0,
      manualOperator:actor.system.manobra.modo!=='vinculado', operatorEditorHTML:await inlineOperatorHTML(actor.system.manobra,data.editable),
      modes:{manual:'Total manual (mestre)',vinculado:'Personagem vinculado'},
      categories:{barco:'Embarcação',carroca:'Carroça / carruagem',maquina:'Máquina de guerra',outro:'Outro veículo'},
      propulsion:{vela:'Vela',remos:'Remos',mista:'Vela e remos',animal:'Tração animal',manual:'Empurrada / rebocada',fixa:'Estacionária',outra:'Outra'},
      defenses:{L:'Leve (L)',M:'Média (M)',P:'Pesada (P)'},
      weapons,
      cargo:items.filter(item=>item.type==='Pertence'&&!item.system.inTransport).map(cargoRow),
      transportedCargo:items.filter(item=>item.type==='Pertence'&&item.system.inTransport).map(cargoRow),
      transports:items.filter(item=>item.type==='Transporte').map(item=>({id:item.id,name:item.name,img:item.img,capacity:item.system.capacidade?.carga??0,people:item.system.capacidade?.pessoas??0})),
      cargoWeight:Math.round(weight*100)/100,overloaded:weight>positive(actor.system.carga.max)};
  }
  _onEditImage(event) {return editPortrait(this,event);}
  activateListeners(html) {
    super.activateListeners(html);theme(this);activatePortraitListeners(this,html);
    if (!this.isEditable) return;
    void activateInlineOperators(this,html,'manobra',saveForAction).catch(error=>ui.notifications.warn(error.message));
    for(const host of html[0]?.querySelectorAll('[data-weapon-operator]')??[]) {
      const item=this.actor.items.get(host.dataset.weaponOperator);if(!item)continue;
      void activateInlineOperators(this,html,'operacao',saveForAction,{document:item,host:host.querySelector('[data-operator-editor]')}).catch(error=>ui.notifications.warn(error.message));
    }
    for(const field of html[0]?.querySelectorAll('[data-weapon-field]')??[])field.addEventListener('change',event=>{
      event.stopPropagation();const item=this.actor.items.get(field.closest('[data-item-id]').dataset.itemId),key=field.dataset.weaponField,value=field.value;
      const previous=this._vehicleWeaponPending;
      const pending=(async()=>{
        if(previous)await previous;requireOwner(this.actor);requireOwner(item);
        if(!['operacao.modo','operacao.totalManual'].includes(key))throw Error('Campo de arma inválido.');
        await saveForAction(this,event,{skipWeapon:true});
        await item.update({['system.'+key]:key==='operacao.modo'?(value==='vinculado'?'vinculado':'manual'):integer(value)});
      })();
      this._vehicleWeaponPending=pending;
      pending.catch(error=>ui.notifications.warn(error.message)).finally(()=>{if(this._vehicleWeaponPending===pending)this._vehicleWeaponPending=null;});
    });
    html.find('[data-vehicle-search]').on('input',event=>{
      const query=event.currentTarget.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const tab=event.currentTarget.closest('.tab');
      for(const row of tab.querySelectorAll('tr.item')) {row.hidden=!row.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query);const controls=tab.querySelector('[data-weapon-operator="'+row.dataset.itemId+'"]');if(controls)controls.hidden=row.hidden;}
    });
    html.find('.rollable').on('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.currentTarget.click();}});
    html.find('.rollable').on('contextmenu',guarded(async event=>{
      const item=this.actor.items.get(event.currentTarget.closest('[data-item-id]')?.dataset.itemId);
      if (!item) return;
      const description=await foundry.applications.ux.TextEditor.enrichHTML(item.system.descricao??'',{secrets:item.isOwner,relativeTo:item});
      new Dialog({title:item.name,content:`<h2>${escape(item.name)}</h2>${description}`,buttons:{}}).render(true);
    }));
    html.find('[data-action]').on('click',guarded(async event=>{
      requireOwner(this.actor);
      const action = event.currentTarget.dataset.action;
      const item = this.actor.items.get(event.currentTarget.closest('[data-item-id]')?.dataset.itemId);
      await saveForAction(this,event);
      if (action==='edit') return item?.sheet.render(true);
      if (action==='remove') return Dialog.confirm({title:'Remover item',content:`<p>Remover ${escape(item?.name)} desta ficha?</p>`,yes:()=>item&&this.actor.deleteEmbeddedDocuments('Item',[item.id])});
      if (action==='attack') return item&&attackFromSheet(item);
      if (action==='copy'&&item) {
        const copy=item.toObject();delete copy._id;copy.name=`${item.name} (Cópia)`;
        return this.actor.createEmbeddedDocuments('Item',[copy]);
      }
      if (action==='move'&&item?.type==='Pertence') {
        if (!item.system.inTransport&&!this.actor.items.some(i=>i.type==='Transporte')) return ui.notifications.warn('Adicione um item de Transporte para mover o pertence.');
        return item.update({'system.inTransport':!item.system.inTransport});
      }
      if (action==='belonging') {
        return new Dialog({title:'Escolha o tipo do item que deseja criar.',
          content:'<label>Selecione o tipo do item:<select name="itemType"><option value="Pertence">Pertence</option><option value="Transporte">Transporte</option></select></label>',
          buttons:{create:{label:'Criar Item',callback:html=>(async()=>{
            requireOwner(this.actor);
            const type=html.find('[name=itemType]').val()==='Transporte'?'Transporte':'Pertence';
            const [created]=await this.actor.createEmbeddedDocuments('Item',[{name:type==='Transporte'?'Novo transporte':'Novo pertence',type,img:'icons/svg/item-bag.svg',...(type==='Pertence'?{system:{quant:1}}:{})}]);
            created.sheet.render(true);
          })().catch(error=>ui.notifications.warn(error.message))},cancel:{label:'Cancelar'}},default:'create'}).render(true);
      }
      if (action==='target-defense') {
        const targets=[...(game.user.targets??[])];if(targets.length!==1||!targets[0].actor)throw Error('Marque um único alvo para copiar sua defesa.');
        const defense=targets[0].actor.system.d_ativa??{};
        return this.actor.update({'system.inf_ataque.cat_def':['L','M','P'].includes(defense.categoria)?defense.categoria:'L','system.inf_ataque.valor_def':integer(defense.valor)});
      }
      if (action==='weapon') {
        const [created] = await this.actor.createEmbeddedDocuments('Item',[{name:'Nova Arma de Guerra',type:WAR_WEAPON,img:'icons/svg/sword.svg'}]);
        return created.sheet.render(true);
      }
      if (action==='maneuver') return maneuverFromSheet(this.actor);
      if (action==='repair') {
        if (!game.user.isGM) throw Error('O mestre confirma os reparos da estrutura.');
        return numericDialog('Reparar ABS','ABS a recuperar',value=>exclusive(this.actor,async()=>{
          requireOwner(this.actor);
          const result=structuralDamage(this.actor.system,value,{repair:true});
          await this.actor.update({'system.absorcao.value':result.after});
          ui.notifications.info(`ABS: ${result.before} → ${result.after}`);
        }));
      }
      if (action==='rf' || action==='rm') {
        if (!this.actor.system.resistenciasAtivas) throw Error('O mestre deve habilitar resistências quando forem aplicáveis.');
        return numericDialog('Teste de resistência','Força de ataque',value=>{
          requireOwner(this.actor);
          if (integer(value)<1) throw Error('A força de ataque deve ser ao menos 1.');
          return this.actor._rollResistencia(integer(value),action==='rm'?'Magía':'Física');
        });
      }
    }));
  }
  async _onChangeInput(event) {
    const pending=super._onChangeInput(event);this._vehiclePendingChange=pending;
    try {return await pending;} finally {if(this._vehiclePendingChange===pending)this._vehiclePendingChange=null;}
  }
  async _updateObject(event,formData) {
    for (const key of ['system.absorcao.value','system.absorcao.max','system.arm','system.vb','system.carga.max','system.cargaExtra',
      'system.tripulacao.minima','system.tripulacao.atual','system.passageiros']) if (key in formData) formData[key]=positive(formData[key]);
    if ('system.absorcao.value' in formData) formData['system.absorcao.value']=Math.min(formData['system.absorcao.value'],formData['system.absorcao.max']??this.actor.system.absorcao.max);
    syncOperatorForm(this.actor.system.manobra,'system.manobra',formData);
    return super._updateObject(event,formData);
  }
  async _onDropItem(event,data) {
    requireOwner(this.actor);
    const item = await Item.implementation.fromDropData(data);
    if (!item || ![WAR_WEAPON,'Pertence','Transporte'].includes(item.type)) {
      ui.notifications.warn('Arraste Armas de Guerra, Pertences ou itens de Transporte para esta ficha.');return false;
    }
    return super._onDropItem(event,data);
  }
}

export class WarWeaponSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {return foundry.utils.mergeObject(super.defaultOptions,{classes:['tagmar','sheet','item','tagmar-vehicle'],width:650,height:650,submitOnChange:true,
    tabs:[{navSelector:'.prim-tabs',contentSelector:'.sheet-primary',initial:'basico'}]});}
  get template() {return path('arma-guerra-sheet');}
  async getData(options) {
    const data=await super.getData(options);
    const damage=damageTable(this.item.system.dano25);
    const descriptionHTML=await foundry.applications.ux.TextEditor.enrichHTML(this.item.system.descricao??'',{secrets:this.item.isOwner,relativeTo:this.item});
    return {...data,item:this.item,system:this.item.system,isGM:game.user.isGM,systemPath:`systems/${game.system.id}`,descriptionHTML,
      damage,
      crewAvailable:this.item.actor?.system.tripulacao?.atual??0, mounted:this.item.actor?.type===VEHICLE};
  }
  activateListeners(html) {
    super.activateListeners(html);theme(this);
  }
  async _onChangeInput(event) {
    const pending=super._onChangeInput(event);this._vehiclePendingChange=pending;
    try {return await pending;} finally {if(this._vehiclePendingChange===pending)this._vehiclePendingChange=null;}
  }
  async _updateObject(event,formData) {
    for (const key of ['system.dano25','system.recarga','system.recargaRestante','system.municao','system.operadoresAtuais','system.operadoresMinimos']) {
      if (key in formData) formData[key]=Math.max(key==='system.operadoresMinimos'?1:0,integer(formData[key]));
    }
    if ('system.peso' in formData) formData['system.peso']=positive(formData['system.peso']);
    syncOperatorForm(this.item.system.operacao,'system.operacao',formData);
    return super._updateObject(event,formData);
  }
}

export function registerVehicleSheets() {
  CONFIG.Actor.typeLabels[VEHICLE]='TYPES.Actor.Veiculo';
  CONFIG.Item.typeLabels[WAR_WEAPON]='TYPES.Item.Arma_Guerra';
  const sheets=foundry.applications.apps.DocumentSheetConfig;
  sheets.registerSheet(Actor,'tagmar',VehicleSheet,{types:[VEHICLE],makeDefault:true,label:'Veículo / Máquina — Tagmar'});
  sheets.registerSheet(Item,'tagmar',WarWeaponSheet,{types:[WAR_WEAPON],makeDefault:true,label:'Arma de Guerra — Tagmar'});
  Hooks.on('preCreateActor',(actor,data)=>{
    if (actor.type!==VEHICLE) return;
    const prototype=data.prototypeToken??{};
    const defaults={};
    if (!prototype.bar1?.attribute) defaults['prototypeToken.bar1.attribute']='absorcao';
    if (prototype.bar2?.attribute===undefined) defaults['prototypeToken.bar2.attribute']=null;
    if (prototype.actorLink===undefined) defaults['prototypeToken.actorLink']=true;
    if (!data.img) defaults.img='icons/svg/anchor.svg';
    actor.updateSource(defaults);
  });
}
