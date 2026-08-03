export default class tagmarAltSheet extends ActorSheet {

    static get defaultOptions() {
        this.lastUpdate = {};
        this.lastItemsUpdate = [];
        return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["tagmar", "sheet", "actor"],
        //width: 900,
        height: 890,
        tabs: [{
            navSelector: ".prim-tabs",
            contentSelector: ".sheet-primary",
            initial: "basico"
            }]
        });
    }
    
    get template() {
        let gameSystem = game.system.id;
        let layout = game.settings.get(gameSystem, "sheetTemplate");
        if (this.document.type == "NPC") {
            this['options']['height'] = 735;
            this['position']['height'] = 735;
        }
        if (this.document.type == "Personagem" && layout != "base") {
            if (layout == 'tagmar3anao') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-anao.hbs';
            } else if (layout == 'tagmar3barda') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-barda.hbs';
            } else if (layout == 'tagmar3bardo') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-bardo.hbs';
            } else if (layout == 'tagmar3gana') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-gana.hbs';
            } else if (layout == 'tagmar3ghuma') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-ghuma.hbs';
            } else if (layout == 'tagmar3ghumk') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-ghumk.hbs';
            } else if (layout == 'tagmar3lhuma') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-lhuma.hbs';
            } else if (layout == 'tagmar3lpeqa') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-lpeqa.hbs';
            } else if (layout == 'tagmar3lpeq') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-lpeq.hbs';
            } else if (layout == 'tagmar3lhum') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-lhum.hbs';
            } else if (layout == 'tagmar3melfa') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-melfa.hbs';
            } else if (layout == 'tagmar3mhuma') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-mhuma.hbs';
            } else if (layout == 'tagmar3melfo') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-melfo.hbs';
            } else if (layout == 'tagmar3pap') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-pap.hbs';
            } else if (layout == 'tagmar3relf') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-relf.hbs';
            } else if (layout == 'tagmar3rhuma') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-rhuma.hbs';
            } else if (layout == 'tagmar3shum') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-shum.hbs';
            } else if (layout == 'tagmar3shumv') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-shumv.hbs';
            } else if (layout == 'tagmar3selfa') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-selfa.hbs';
            } else if (layout == 'tagmar3shum1') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-shum1.hbs';
            } else if (layout == 'tagmar3shum2') {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha-shum2.hbs';
            } else {
                return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-ficha.hbs';
            }
            
        } else if (this.document.type == "Personagem" && layout == "base") {
            return 'systems/tagmar_rpg/templates/sheetsPoints/personagem-sheet.hbs';
        } else if (this.document.type == "NPC" && layout != "base") {
            return 'systems/tagmar_rpg/templates/sheets/npc-ficha.hbs';
        } else if (this.document.type == "Inventario" && layout != "base") {
            return 'systems/tagmar_rpg/templates/sheets/inventario-ficha.hbs';
        } else {
            return 'systems/tagmar_rpg/templates/sheets/'+ this.document.type.toLowerCase() +'-sheet.hbs';
        }
    }

    async getData(options) {
        const data = super.getData(options);
        const actorUtils = await import("./actorUtils.js");
        data.dtypes = ["String", "Number", "Boolean"];
        if (data.document.type == 'Personagem') {
            let updatePers = {};
            let items_toUpdate = [];
            this._prepareCharacterItems(data);
            const gameSystem = game.system.id;
            if (!game.settings.get(gameSystem, 'ajusteManual')) actorUtils._setPontosRaca(data, updatePers); // pontos = actor.system.carac_final.INT
            actorUtils._prepareValorTeste(data, updatePers);
            if (data.document.raca) {
                actorUtils._preparaCaracRaciais(data, updatePers);
            }
            if (data.document.profissao) {
                actorUtils._attProfissao(data, updatePers, items_toUpdate);
            }
            actorUtils._attCargaAbsorcaoDefesa(data, updatePers);
            if (data.document.raca && data.document.profissao) {
                actorUtils._attEfEhVB(data, updatePers); 
            }
            actorUtils._attProximoEstag(data, updatePers);
            actorUtils._attKarmaMax(data, updatePers);
            actorUtils._attRM(data, updatePers);
            actorUtils._attRF(data, updatePers);
            if (updatePers.hasOwnProperty('_id')) delete updatePers['_id'];
            if (this.lastUpdate) {
                if (this.lastUpdate.hasOwnProperty('_id')) delete this.lastUpdate['_id'];
            }
            if (Object.keys(updatePers).length > 0 && options.editable) {
                if (!this.lastUpdate) {
                    this.lastUpdate = updatePers;
                    data.document.update(updatePers);
                    //ui.notifications.info("Ficha atualizada.");
                }
                else if (JSON.stringify(updatePers) !== JSON.stringify(this.lastUpdate)) {   // updatePers[Object.keys(updatePers)[0]] != this.lastUpdate[Object.keys(updatePers)[0]]
                    this.lastUpdate = updatePers;
                    data.document.update(updatePers);
                    //ui.notifications.info("Ficha atualizada.");
                }
            }
            actorUtils._updateCombatItems(data, items_toUpdate);
            actorUtils._updateMagiasItems(data, items_toUpdate);
            actorUtils._updateTencnicasItems(data, items_toUpdate);
            if (items_toUpdate.length > 0 && options.editable) {
                if (!this.lastItemsUpdate) {
                    this.lastItemsUpdate = items_toUpdate;
                    data.document.updateEmbeddedDocuments("Item", items_toUpdate);
                } else if (JSON.stringify(items_toUpdate) !== JSON.stringify(this.lastItemsUpdate)) {
                    this.lastItemsUpdate = items_toUpdate;
                    data.document.updateEmbeddedDocuments("Item", items_toUpdate);
                }
            }
        } else if (data.document.type == "Inventario") {
            this._prepareInventarioItems(data);
        } else if (data.document.type == 'NPC') {
            let updateNpc = {};
            let updateItemsNpc = [];
            this._prepareCharacterItems(data);
            actorUtils._prepareValorTeste(data, updateNpc);
            actorUtils._attDefesaNPC(data, updateNpc);
            if (Object.keys(updateNpc).length > 0) {
                data.document.update(updateNpc);
            }
            actorUtils._updateCombatItems(data,updateItemsNpc);
            actorUtils._updateMagiasItems(data,updateItemsNpc);
            actorUtils._updateTencnicasItems(data,updateItemsNpc);
            actorUtils._updateHabilItems(data, updateItemsNpc);
            if (updateItemsNpc.length > 0) {
                data.document.updateEmbeddedDocuments("Item", updateItemsNpc);
            }
        }
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (this.document.type != "Inventario") {
            if (!this.options.editable) return;
        }
  
        // Update Inventory Item
        html.find('.item-upp').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.document.items.get(li.data('itemId'));
            const nivel = item.system.nivel;
            item.update({
                "system.nivel": nivel+1
            }); 
        });
        html.find('.item-edit').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.document.items.get(li.data("itemId"));
            item.sheet.render(true);
        });

        html.find('.item-equipa').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.document.items.get(li.data('itemId'));
            if (item.system.equipado) {
                item.update({
                    "system.equipado": false
                });
            } else {
                item.update({
                    "system.equipado": true
                });
            }
        });

        html.find('.item-delete').click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            let dialog = new Dialog({
                title: "Tem certeza que deseja deletar?",
                content: "<p class='rola_desc mediaeval'>Deseja mesmo <b>deletar</b> esse item?</p>",
                buttons: {
                    sim: {
                        icon: "<i class='fas fa-check'></i>",
                        label: "Confirmar",
                        callback: () => {
                            this.document.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
                            li.slideUp(200, () => this.render(false));
                        }
                    },
                    nao: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancelar",
                        callback: () => {}
                    }
                },
                default: "nao"
            });
            dialog.render(true);
        });
  
        if (this.document.type != "Inventario") {

        html.find('.item-copy').click(this._duplicateItem.bind(this));

        html.find('.toJournal').click(this._toJournal.bind(this));

        html.find('.rollable').click(this._onItemRoll.bind(this));
        html.find('.rollable').contextmenu(this._onItemRightButton.bind(this));
        html.find('.dano_rell').click(this._danoRell.bind(this));
        html.find(".movePertence").click(ev => {
            const li = $(ev.currentTarget).parents(".item");
            const item = this.document.items.get(li.data("itemId"));
            if (this.document.system.carga_transp.hasTransp){
                if (!item.system.inTransport) {
                    item.update({
                        "system.inTransport": true
                    });
                } else {
                    item.update({
                        "system.inTransport": false
                    });
                }
            }
        });
        html.find('.idiomas').click(this._linguasDialog.bind(this));
        html.find(".ativaEfeito").click(this._ativaEfeito.bind(this));
        html.find('.newEfeito').click(this._newEfeito.bind(this));
        html.find(".newHabilidade").click(this._newHabilidade.bind(this));
        html.find(".newCombat").click(this._newCombate.bind(this));
        html.find(".newMagia").click(this._newMagia.bind(this));
        html.find(".newPertence").click(this._newPertence.bind(this));
        html.find(".subir_estagio").click(this._subirEstagio.bind(this));
        html.find(".rolarIniciativa").click(this._rolarIniciativa.bind(this));
        html.find('.rolaR_Fis').hover(function (event) {
            $(event.currentTarget).html("<i class='fas fa-dice-d20' style='margin-right:5px;'></i><i class='fas fa-dice-d20' style='margin-right:5px;'></i>");
        }, function (event) {
            $(event.currentTarget).html("Física");
        });
        html.find('.rolaR_Mag').hover(function (event) {
            $(event.currentTarget).html("<i class='fas fa-dice-d20' style='margin-right:5px;'></i><i class='fas fa-dice-d20' style='margin-right:5px;'></i>");
        }, function (event) {
            $(event.currentTarget).html("Magia");
        });
        html.find('.rolarIniciativa').hover(function (event) {
            $(event.currentTarget).html("<i class='fas fa-dice-d20' style='margin-right:5px;'></i><i class='fas fa-dice-d20' style='margin-right:5px;'></i><i class='fas fa-dice-d20' style='margin-right:5px;'></i>");
        }, function (event) {
            $(event.currentTarget).html("Iniciativa");
        });
        html.find(".clickHab").mousedown( function (event) {
            $('.clickHab').html("Nível");
            $('.habNivel').removeClass('esconde');
            $('.habTotal').addClass('esconde');
        });
        html.find(".clickHab").mouseup( function (event) {
            $('.clickHab').html("Total");
            $('.habNivel').addClass('esconde');
            $('.habTotal').removeClass('esconde');
        });
        html.find(".showImg").click(this._combateImg.bind(this));
        html.find(".displayRaca").click(this._displayRaca.bind(this));
        html.find(".displayRaca").contextmenu(this._editRaca.bind(this));
        html.find(".displayProf").click(this._displayProf.bind(this));
        html.find(".displayProf").contextmenu(this._editProf.bind(this));
        html.find(".addGrupoArmas").click(this._addGrupoArmas.bind(this));
        html.find(".subGrupoArmas").click(this._subGrupoArmas.bind(this));
        html.find(".rolarMoral").click(this._rolarMoral.bind(this));
        html.find(".rolaR_Fis").click(this._rolaRFIS.bind(this));
        html.find(".rolaR_Mag").click(this._rolaRMAG.bind(this));
        html.find(".rolarAtt").click(this._rolarAtt.bind(this));
        html.find('.rolarAtt').hover(function (event) {
            const target = event.currentTarget;
            const cat = $(target).data("itemId");
            $(target).html("<i class='fas fa-dice-d20' style='margin-right:5px;'></i><i class='fas fa-dice-d20' style='margin-right:5px;'></i>");
        }, function (event) {
            const target = event.currentTarget;
            const cat = $(target).data("itemId");
            $(target).html(cat);
        });
        if (this.document.isOwner) {
        let handler = ev => this._onDragStart(ev);
        html.find('.dragable').each((i, li) => {
            if (li.classList.contains("inventory-header")) return;
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", handler, false);
        });
        }
        }
        if (this.document.type == "Inventario") {
            $('.searchPertence').prop( "disabled", false );
            html.find('.searchPertence').keyup(this._realcaPertence.bind(this));
            html.find('.item-cesto').click(ev => {
                const actors = game.actors;
                let personagem;
                let inventario;
                let bau = null;
                actors.forEach(function (actor){
                    if (actor.isOwner && actor.type == "Personagem") personagem = actor;
                    if (actor.isOwner && actor.type == "Inventario") {
                        bau = actor;
                        inventario = actor;
                    }
                    else if (actor.type == "Inventario") inventario = actor;
                });
                const li = $(ev.currentTarget).parents(".item");
                const item = this.document.items.get(li.data('itemId')); 
                personagem.createEmbeddedDocuments("Item", [item.data.document]); 
                if (bau.id == this.document.id) {
                    bau.deleteEmbeddedDocuments("Item", [item.id]); 
                }
            });
        } else if (this.document.type == "Personagem") {
            html.find('.searchPertence').keyup(this._realcaPertence.bind(this));
            html.find('.searchMagia').keyup(this._realcaMagia.bind(this));
            html.find('.searchCombate').keyup(this._realcaCombate.bind(this));
            html.find('.searchHabilidade').keyup(this._realcaHablidade.bind(this));
            html.find('.searchEfeito').keyup(this._realcaEfeito.bind(this));
            html.find('.descansar').click(this._descanso.bind(this));
            html.find('input[name="grupo_aprim"]').click(this._radio_grupo_aprim.bind(this));
        } 
    }

    _radio_grupo_aprim(event) {
        event.preventDefault();
        let old_grup = this.document.system.grupo_aprim;
        if (old_grup == $(event.currentTarget).val()) {
            this.document.update({
                'system.grupo_aprim': ""
            });
        } else {
            this.document.update({
                'system.grupo_aprim': $(event.currentTarget).val()
            });
        }
    }

    _linguasDialog(event) {
        let dialogContent = `
            <ul id="linguas" class="mediaeval" style="list-style-type: none;columns: 2;">
            <li><input type="checkbox" value="males"/>Malês</li>
            <li><input type="checkbox" value="leva"/>Leva</li>
            <li><input type="checkbox" value="lud"/>Lud</li>
            <li><input type="checkbox" value="eredri"/>Eredri</li>
            <li><input type="checkbox" value="verrogari"/>Verrogari</li>
            <li><input type="checkbox" value="dantseniano"/>Dantseniano</li>
            <li><input type="checkbox" value="maranes"/>Maranês</li>
            <li><input type="checkbox" value="lunes"/>Lunês</li>
            <li><input type="checkbox" value="runes"/>Runês</li>
            <li><input type="checkbox" value="abadrim"/>Abadrim</li>
            <li><input type="checkbox" value="planense"/>Planense</li>
            <li><input type="checkbox" value="linguacomumdascidadesestados"/>Língua comum das Cidades-Estados</li>
            <li><input type="checkbox" value="linguacomumdosmangues"/>Língua comum dos Mangues</li>
            <li><input type="checkbox" value="rubeo"/>Rúbeo</li>
            <li><input type="checkbox" value="lazuli"/>Lazúli</li>
            <li><input type="checkbox" value="linguasbarbaras"/>Línguas bárbaras</li>
            <li><input type="checkbox" value="aktar"/>Aktar</li>
            <li><input type="checkbox" value="dictio"/>Díctio</li>
            <li><input type="checkbox" value="birso"/>Birso</li>
            <li><input type="checkbox" value="povosdodeserto"/>Povos do deserto</li>
            <li><input type="checkbox" value="lanta"/>Lanta</li>
            <li><input type="checkbox" value="avozdepedra"/>A voz de pedra</li>
            <li><input type="checkbox" value="elfico"/>Élfico</li>
            <li><input type="checkbox" value="tessaldar"/>Tessaldar</li>
            <li><input type="checkbox" value="kurng"/>Kurng</li>
            <li><input type="checkbox" value="linguadasfadas"/>Língua das fadas</li>
            <li><input type="checkbox" value="linguadosdragoes"/>Língua dos dragões</li>
            <li><input type="checkbox" value="linguasselvagens"/>Línguas selvagens</li>
            <li><input type="checkbox" value="marante"/>Marante</li>
            <li><input type="checkbox" value="infernal"/>Infernal</li>
            <li><input type="checkbox" value="abissal"/>Abissal</li>
            </ul>`;
        let dialog = new Dialog({
            title: "Idiomas",
            content: dialogContent,
            buttons: {
                salvar: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Salvar",
                    callback: (html) => {
                        let idiomas = [];
                        let ul = html.find('input:checked');
                        $(ul).each(function (i, c) {
                            idiomas.push(c.value);
                        });
                        this.document.update({
                            'system.defesa.categoria': idiomas.join(';')
                        });
                    }
                }
            },
            render: (html) => {
                let idiomas = this.document.system.defesa.categoria.split(';');
                html.find('input[type="checkbox"]').each(function (i, c) {
                    if (idiomas.includes(c.value)) {
                        $(c).prop('checked',true);
                    }
                });
            }
        },{width: 600});
        dialog.render(true);
    }

    _descanso(event) {
        let dialog = new Dialog({
            title: "Descanso",
            content: `<div class="container">
                        <div class="row">
                            <div class="col-12">
                                <select class="mediaeval tipoDescanso">
                                    <option value="full">Descanso Completo</option>
                                    <option value="meio">Descanso Curto</option>
                                </select>
                            </div>
                        </div>
                     </div>`,
            buttons: {
                "descansar": {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'Descansar',
                    callback: (html) => {
                        let descanso = $('.tipoDescanso').val();
                        let changes = {};
                        let dif_ef = 0;
                        let dif_eh = 0;
                        let dif_karma = 0;
                        if (descanso === "full") {
                            dif_ef = this.document.system.ef.max - this.document.system.ef.value;
                            dif_eh = this.document.system.eh.max - this.document.system.eh.value;
                            dif_karma = this.document.system.karma.max - this.document.system.karma.value;
                            changes = {
                                'system.ef.value': this.document.system.ef.max,
                                'system.eh.value': this.document.system.eh.max,
                                'system.karma.value': this.document.system.karma.max
                            };
                        } else if (descanso === "meio") {
                            let efAtual = this.document.system.ef.value;
                            let ehAtual = this.document.system.eh.value;
                            let karmaAtual = this.document.system.karma.value;
                            let efMax = this.document.system.ef.max;
                            let ehMax = this.document.system.eh.max;
                            let karmaMax = this.document.system.karma.max;
                            let efNovo = 0;
                            let ehNovo = 0;
                            let karmaNovo = 0;
                            if (efAtual < efMax) {
                                efNovo = efAtual + efMax/2;
                                if (efNovo > efMax) efNovo = efMax;
                                dif_ef = efNovo - efAtual;
                                changes['system.ef.value'] = parseInt(efNovo)
                            }
                            if (ehAtual < ehMax) {
                                ehNovo = ehAtual + ehMax/2;
                                if (ehNovo > ehMax) ehNovo = ehMax;
                                dif_eh = ehNovo - ehAtual;
                                changes['system.eh.value'] = parseInt(ehNovo)
                            }
                            if (karmaAtual < karmaMax) {
                                karmaNovo = karmaAtual + karmaMax/2;
                                if (karmaNovo > karmaMax) karmaNovo = karmaMax;
                                dif_karma = karmaNovo - karmaAtual;
                                changes['system.karma.value'] = parseInt(karmaNovo)
                            }
                        }
                        this.document.update(changes);
                        let desc_text = "Completo";
                        if (descanso == "meio") desc_text = "Curto";
                        ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({
                                actor: this.document
                            }),
                            content: `<img src="${this.document.img}" style='display: block; margin-left: auto; margin-right: auto; border-width:0;' />
                            <p class="mediaeval rola_desc">${this.document.name} fez um descanso <b>${desc_text}</b>.</p>
                            <h3 class="mediaeval">Recuperou:</h3>
                            <p class="mediaeval rola_desc">${parseInt(dif_ef)} de Energia Física.</p>
                            <p class="mediaeval rola_desc">${parseInt(dif_eh)} de Energia Heroica.</p>
                            <p class="mediaeval rola_desc">${parseInt(dif_karma)} de Karma.</p>`
                        });
                    }
                },
                "cancelar": {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancelar'
                }
            },
            default: "cancelar"
        });
        dialog.render(true);
    }

    async _toJournal(event) { 
        let journal = await JournalEntry.create({
            name: this.document.name,
            img: this.document.img,
            content: `<div class="bg-img"><div class="container" style="height:100%;">
                <div class="row">
                    <div class="col-12">
                        <h2 class="fairyDust" style="text-align:center;">${this.document.name}</h2>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <img src="${this.document.img}" style="border-width:0;display:block;margin-left:auto;margin-right:auto;"/>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12 mediaeval">
                        <p class="rola_desc">${this.document.system.descricao}</p>
                    </div>
                </div>
            </div></div>`
        });
        journal.sheet.render(true);
    }

    _rolarIniciativa(event) {
        if (!this.options.editable) return;
        if (game.combats.size > 0) this.document.rollInitiative({createCombatants:false, rerollInitiative:false});
    }

    _newMagia(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        actor.createEmbeddedDocuments('Item', [{name: "Nova Magia", type: "Magia"}]).then(function (item) {
            item[0].sheet.render(true);
        });
    }

    _newPertence(event) {
        if (!this.options.editable) return;
        let create = false;
        let tipo = "";
        const actor = this.document;
        let dialogContent = `<div>
            <label for="selectTipo" class="mediaeval">Selecione o tipo do item:</label>
            <select id="selectTipo" name="selectTipo" class="selectType mediaeval" height="30" style="margin-left:2px;">
                <option value="Pertence">Pertence</option>
                <option value="Transporte">Transporte</option>
            </select>
        </div>`;
        let dialog = new Dialog({
            title: "Escolha o tipo do item que deseja criar.",
            content: dialogContent,
            buttons: {
                criar: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Criar Item",
                    callback: html => {
                        create = true;
                        tipo = html.find(".selectType").val();
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancelar'
                }
            },
            default: "cancel",
            close: html => {
                if (create) {
                    if (tipo.length > 0) {
                        actor.createEmbeddedDocuments("Item", [{name: `Novo ${tipo}`, type: tipo}]).then(function (item) {
                            item[0].sheet.render(true);
                        });
                    }
                }
            }
        });
        dialog.render(true);
    }

    _newCombate(event) {
        if (!this.options.editable) return;
        let create = false;
        let tipo = "";
        const actor = this.document;
        let dialogContent = `<div>
            <label for="selectTipo" class="mediaeval">Selecione o tipo do item:</label>
            <select id="selectTipo" name="selectTipo" class="selectType mediaeval" height="30" style="margin-left:2px;">
                <option value="Ataque">Ataque</option>
                <option value="Defesa">Defesa</option>
                <option value="Tecnica">Técnica de Combate</option>
            </select>
            </div>`;
        let dialog = new Dialog({
            title: "Escolha o tipo do item que deseja criar.",
            content: dialogContent,
            buttons: {
                criar: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Criar Item",
                    callback: html => {
                        create = true;
                        tipo = html.find(".selectType").val();
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: 'Cancelar'
                }
            },
            default: "cancel",
            close: html => {
                if (create) {
                    let tipoItem = "";
                    if (tipo == "Ataque") tipoItem = "Combate";
                    else if (tipo == "Defesa") tipoItem = "Defesa";
                    else if (tipo == "Tecnica") tipoItem = "TecnicasCombate";
                    if (tipoItem.length > 0) {
                        actor.createEmbeddedDocuments("Item", [{name: "Novo Item Criado", type: tipoItem}]).then(function (item) {
                            item[0].sheet.render(true);
                        });
                    }
                }
            }
        });
        dialog.render(true);
    }

    _newHabilidade(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        actor.createEmbeddedDocuments("Item", [{name: "Nova Habilidade", type: "Habilidade", data: {tipo: "profissional"}}]).then(function (item) {
            item[0].sheet.render(true);
        });
    }

    _newEfeito(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        actor.createEmbeddedDocuments('Item', [{name: "Novo Efeito", type: "Efeito"}]).then(function (efeito) {
            efeito[0].sheet.render(true);
        });
    }

    _danoRell(event) {
        if (!this.options.editable) return;
        const tipo = $(event.currentTarget).data('tipo');
        const actor = this.document;
        let updateComand = "";
        let valor = 0;
        if (tipo == "EF") {
            if (actor.type == "Personagem") {
                valor = actor.system.ef.value;
                updateComand = "EF";
            }
            else if (actor.type == "NPC") {
                valor = actor.system.ef_npc.value;
                updateComand = "EF_NPC";
            }
        } else if (tipo == "EH") {
            if (actor.type == "Personagem") {
                valor = actor.system.eh.value;
                updateComand = "EH";
            }
            else if (actor.type == "NPC") {
                valor = actor.system.eh_npc.value;
                updateComand = "EH_NPC";
            }
        } else if (tipo == "KARMA") {
            if (actor.type == "Personagem") {
                valor = actor.system.karma.value;
                updateComand = "KARMA";
            } else if (actor.type == "NPC") {
                valor = actor.system.karma_npc.value;
                updateComand = "KARMA_NPC";
            }
        } else if (tipo == "FOCUS") {
            if (actor.type == "Personagem" || actor.type == "NPC") {
                valor = actor.system.focus.value;
                updateComand = "FOCUS";
            }
        } else if (tipo == "ABS") {
            if (actor.type == "Personagem" || actor.type == "NPC") {
                valor = actor.system.absorcao.value;
                updateComand = "ABS";
            }
        }
        let dialog = new Dialog({
            title: "Dano/Cura na " + tipo,
            content: '<input type="number" class="dano_valor"/>',
            buttons: {
                vai: {
                    icon: '<i class="fas fa-check-circle"></i>',
                    label: 'Aceitar',
                    callback: (html) => {
                        let dano = html.find('.dano_valor').val();
                        if (dano) dano = parseInt(dano);
                        else dano = 0;
                        valor -= dano;
                    }
                },
                novai: {
                    icon: '<i class="fas fa-window-close"></i>',
                    label: 'Cancelar'
                }
            },
            default: 'vai',
            render: html => {html.css('font-family','GoudyMediaeval');},
            close: html => {
                switch (updateComand) {
                    case 'EF':
                        actor.update({'system.ef.value': valor});
                        break;
                    case 'EF_NPC':
                        actor.update({'system.ef_npc.value': valor});
                        break;
                    case 'EH':
                        actor.update({'system.eh.value': valor});
                        break;
                    case 'EH_NPC':
                        actor.update({'system.eh_npc.value': valor});
                        break;
                    case 'KARMA':
                        actor.update({'system.karma.value': valor});
                        break;
                    case 'KARMA_NPC':
                        actor.update({'system.karma_npc.value': valor});
                        break;
                    case 'FOCUS':
                        actor.update({'system.focus.value': valor});
                        break;
                    case 'ABS':
                        actor.update({'system.absorcao.value': valor});
                        break;
                }
            }
        });
        if (updateComand != "") dialog.render(true);
    }

    async _rolarMoral(event) {
        this.document._rollTeste({name: "Moral"});        
    }

    _prepareInventarioItems(sheetData) { 
        const actorData = sheetData.actor;
        const pertences = actorData.items.filter(item => item.type == "Pertence");
        const transportes = actorData.items.filter(item => item.type == "Transporte");
        const cesto = [];
        if (pertences.length > 1) pertences.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (transportes.length > 1) transportes.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        actorData.pertences = pertences;
        actorData.transportes = transportes;
        actorData.cesto = cesto;
        this.cesto = cesto;
    }

    _realcaEfeito(event) {
        event.preventDefault();
        const search = $(event.target).val();
        let search_down = search.toLowerCase();
        $(".efeitoName").each(function(this_td, element) {
            let efeito = $(element).html();
            efeito = efeito.toLowerCase();
            let parente = $(element).closest('tr');
            if (efeito.includes(search_down) && search_down.length > 0) {
                $(parente).removeClass('esconde');
            } else if (search_down.length > 0) {
                $(parente).addClass('esconde');
            }
            else {
                $(parente).removeClass('esconde');
            }
        });
    }

    _realcaHablidade(event) {
        event.preventDefault();
        const search = $(event.target).val();
        let search_down = search.toLowerCase();
        $(".habName").each(function(this_td, element) {
            let pertence = $(element).html();
            pertence = pertence.toLowerCase();
            let parente = $(element).closest('tr');
            if (pertence.includes(search_down) && search_down.length > 0) {
                $(parente).removeClass('esconde');
            } else if (search_down.length > 0) {
                $(parente).addClass('esconde');
            }
            else {
                $(parente).removeClass('esconde');
            }
        });
    }

    _realcaCombate(event) {
        event.preventDefault();
        const search = $(event.target).val();
        let search_down = search.toLowerCase();
        $(".combateName").each(function(this_td, element) {
            let pertence = $(element).html();
            pertence = pertence.toLowerCase();
            let parente = $(element).closest('tr');
            if (pertence.includes(search_down) && search_down.length > 0) {
                $(parente).removeClass('esconde');
            } else if (search_down.length > 0) {
                $(parente).addClass('esconde');
            }
            else {
                $(parente).removeClass('esconde');
            }
        });
    }

    _realcaMagia(event) {
        event.preventDefault();
        const search = $(event.target).val();
        let search_down = search.toLowerCase();
        $(".magiaName").each(function(this_td, element) {
            let pertence = $(element).html();
            pertence = pertence.toLowerCase();
            let parente = $(element).closest('tr');
            if (pertence.includes(search_down) && search_down.length > 0) {
                $(parente).removeClass('esconde');
            } else if (search_down.length > 0) {
                $(parente).addClass('esconde');
            }
            else {
                $(parente).removeClass('esconde');
            }
        });
    }

    _realcaPertence(event) {
        event.preventDefault();
        const search = $(event.target).val();
        let search_down = search.toLowerCase();
        $(".pertenceName").each(function(this_td, element) {
            let pertence = $(element).html();
            pertence = pertence.toLowerCase();
            let parente = $(element).closest('tr');
            if (pertence.includes(search_down) && search_down.length > 0) {
                $(parente).removeClass('esconde');
            } 
            else if (search_down.length > 0) {
                $(parente).addClass('esconde');
            }
            else {
                $(parente).removeClass('esconde');
            }
        });
    }

    async _rolarAtt(event) {      // Rolar Atributo
        const target = event.currentTarget;
        const cat = $(target).data("itemId");
        let teste = {name: "Atributo", id: cat};
        this.document._rollTeste(teste);
    }

    _rolaRMAG(event) {
        const forcAtaqueI = parseInt($(".F_Ataque").val());
        if (!forcAtaqueI) {
            this._dialogResistencia("Magía");
            return;
        }
        this.document._rollTeste({name: "Resistencia", id: "Magía", f_ataque: parseInt(forcAtaqueI)});
        $(".F_Ataque").val("");
        if (this.document.system.forca_ataque) {
            this.document.update({
                "system.forca_ataque": null
            });
        }
    }

    _rolaRFIS(event) {
        const forcAtaqueI = parseInt($(".F_Ataque").val());
        if (!forcAtaqueI) {
            this._dialogResistencia("Física");
            return;
        }
        this.document._rollTeste({name: "Resistencia", id: "Física", f_ataque: parseInt(forcAtaqueI)});
        $(".F_Ataque").val("");
        if (this.document.system.forca_ataque) {
            this.document.update({
                "system.forca_ataque": null
            });
        }
    }

    _dialogResistencia(tipo) {
        let f_ataque;
        let rolar = false;
        let dialogContent = `
        <div class="mediaeval">
            <label for="forca-ataque">Força de Ataque:</label>
            <input type="number" name="forca-ataque" id="forca-ataque" value="1" style="width: 60px; text-align: center;"/>
        </div>`;
        let dialog = new Dialog({
            title: "Informe a força de ataque.",
            content: dialogContent,
            buttons: {
                Rolar: {
                    icon: '<i class="fas fa-dice-d20"></i>',
                    label: "Rolar Teste",
                    callback: (html) => {
                        f_ataque = html.find('#forca-ataque').val();
                        if (f_ataque) {
                            f_ataque = parseInt(f_ataque);
                            rolar = true;
                        }
                    }
                },
                Cancelar: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancelar"
                }
            },
            default: "Cancelar",
            close: html => {
                if (rolar) this.document._rollTeste({name: "Resistencia", id: tipo, f_ataque: f_ataque});
            }
        });
        dialog.render(true);
    }

    _addGrupoArmas(event) {
        const grupo = $(event.currentTarget).data("itemId");
        const actorData = this.document;
        if (actorData.system.pontos_comb >= 0) {
            if (grupo == "CD") {
                let pontos = actorData.system.grupos.CD + 1;
                this.document.update({
                    "system.grupos.CD": pontos
                });
            } else if (grupo == "CI") {
                let pontos = actorData.system.grupos.CI + 1;
                this.document.update({
                    "system.grupos.CI": pontos
                });
            } else if (grupo == "CL") {
                let pontos = actorData.system.grupos.CL + 1;
                this.document.update({
                    "system.grupos.CL": pontos
                });
            } else if (grupo == "CLD") {
                let pontos = actorData.system.grupos.CLD + 1;
                this.document.update({
                    "system.grupos.CLD": pontos
                });
            } else if (grupo == "EL") {
                let pontos = actorData.system.grupos.EL + 1;
                this.document.update({
                    "system.grupos.EL": pontos
                });
            } else if (grupo == "CmE") {
                let pontos = actorData.system.grupos.CmE + 1;
                this.document.update({
                    "system.grupos.CmE": pontos
                });
            } else if (grupo == "CmM") {
                let pontos = actorData.system.grupos.CmM + 1;
                this.document.update({
                    "system.grupos.CmM": pontos
                });
            } else if (grupo == "EM") {
                let pontos = actorData.system.grupos.EM + 1;
                this.document.update({
                    "system.grupos.EM": pontos
                });
            } else if (grupo == "PmA") {
                let pontos = actorData.system.grupos.PmA + 1;
                this.document.update({
                    "system.grupos.PmA": pontos
                });
            } else if (grupo == "PmL") {
                let pontos = actorData.system.grupos.PmL + 1;
                this.document.update({
                    "system.grupos.PmL": pontos
                });
            } else if (grupo == "CpE") {
                let pontos = actorData.system.grupos.CpE + 1;
                this.document.update({
                    "system.grupos.CpE": pontos
                });
            } else if (grupo == "CpM") {
                let pontos = actorData.system.grupos.CpM + 1;
                this.document.update({
                    "system.grupos.CpM": pontos
                });
            } else if (grupo == "EP") {
                let pontos = actorData.system.grupos.EP + 1;
                this.document.update({
                    "system.grupos.EP": pontos
                });
            } else if (grupo == "PP") {
                let pontos = actorData.system.grupos.PP + 1;
                this.document.update({
                    "system.grupos.PP": pontos
                });
            } else if (grupo == "PpA") {
                let pontos = actorData.system.grupos.PpA + 1;
                this.document.update({
                    "system.grupos.PpA": pontos
                });
            } else if (grupo == "PpB") {
                let pontos = actorData.system.grupos.PpB + 1;
                this.document.update({
                    "system.grupos.PpB": pontos
                });
            }
        }
    }
    _subGrupoArmas(event){
        const grupo = $(event.currentTarget).data("itemId");
        const actorData = this.document;
        if (grupo == "CD" && actorData.system.grupos.CD > 0) {
            let pontos = actorData.system.grupos.CD - 1;
            this.document.update({
                "system.grupos.CD": pontos
            });
        } else if (grupo == "CI" && actorData.system.grupos.CI > 0) {
            let pontos = actorData.system.grupos.CI - 1;
            this.document.update({
                "system.grupos.CI": pontos
            });
        } else if (grupo == "CL" && actorData.system.grupos.CL > 0) {
            let pontos = actorData.system.grupos.CL - 1;
            this.document.update({
                "system.grupos.CL": pontos
            });
        } else if (grupo == "CLD" && actorData.system.grupos.CLD > 0) {
            let pontos = actorData.system.grupos.CLD - 1;
            this.document.update({
                "system.grupos.CLD": pontos
            });
        } else if (grupo == "EL" && actorData.system.grupos.EL > 0) {
            let pontos = actorData.system.grupos.EL - 1;
            this.document.update({
                "system.grupos.EL": pontos
            });
        } else if (grupo == "CmE" && actorData.system.grupos.CmE > 0) {
            let pontos = actorData.system.grupos.CmE - 1;
            this.document.update({
                "system.grupos.CmE": pontos
            });
        } else if (grupo == "CmM" && actorData.system.grupos.CmM > 0) {
            let pontos = actorData.system.grupos.CmM - 1;
            this.document.update({
                "system.grupos.CmM": pontos
            });
        } else if (grupo == "EM" && actorData.system.grupos.EM > 0) {
            let pontos = actorData.system.grupos.EM - 1;
            this.document.update({
                "system.grupos.EM": pontos
            });
        } else if (grupo == "PmA" && actorData.system.grupos.PmA > 0) {
            let pontos = actorData.system.grupos.PmA - 1;
            this.document.update({
                "system.grupos.PmA": pontos
            });
        } else if (grupo == "PmL" && actorData.system.grupos.PmL > 0) {
            let pontos = actorData.system.grupos.PmL - 1;
            this.document.update({
                "system.grupos.PmL": pontos
            });
        } else if (grupo == "CpE" && actorData.system.grupos.CpE > 0) {
            let pontos = actorData.system.grupos.CpE - 1;
            this.document.update({
                "system.grupos.CpE": pontos
            });
        } else if (grupo == "CpM" && actorData.system.grupos.CpM > 0) {
            let pontos = actorData.system.grupos.CpM - 1;
            this.document.update({
                "system.grupos.CpM": pontos
            });
        } else if (grupo == "EP" && actorData.system.grupos.EP > 0) {
            let pontos = actorData.system.grupos.EP - 1;
            this.document.update({
                "system.grupos.EP": pontos
            });
        } else if (grupo == "PP" && actorData.system.grupos.PP > 0) {
            let pontos = actorData.system.grupos.PP - 1;
            this.document.update({
                "system.grupos.PP": pontos
            });
        } else if (grupo == "PpA" && actorData.system.grupos.PpA > 0) {
            let pontos = actorData.system.grupos.PpA - 1;
            this.document.update({
                "system.grupos.PpA": pontos
            });
        } else if (grupo == "PpB" && actorData.system.grupos.PpB > 0) {
            let pontos = actorData.system.grupos.PpB - 1;
            this.document.update({
                "system.grupos.PpB": pontos
            });
        }
        
    }

    _editRaca(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        const raca = actor.items.find(item => item.type == "Raca");
        if (!raca) return;
        raca.sheet.render(true);
    }

    _displayRaca(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        const racaData = actor.items.find(item => item.type == "Raca");
        if (!racaData) {
            actor.createEmbeddedDocuments("Item", [{name: "Raça", type: "Raca"}]).then(function (item) {
                item[0].sheet.render(true);
            });
        } else {
            let chatData = {
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({
                    actor: this.document
                  })
            };
            chatData.content = "<img src='"+ racaData.img +"' style='display: block; margin-left: auto; margin-right: auto;' /><h1 class='mediaeval rola' style='text-align: center;'>" + racaData.name + "</h1>"  + "<h3 class='mediaeval rola rola_desc'>" + racaData.system.descricao + "</h3>";
            ChatMessage.create(chatData);
        } 
    }

    _editProf(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        const profissao = actor.items.find(item => item.type == "Profissao");
        if (!profissao) return;
        profissao.sheet.render(true);
    }

    _displayProf(event) {
        if (!this.options.editable) return;
        const actor = this.document;
        const profData = actor.items.find(item => item.type == "Profissao");
        if (!profData) {
            actor.createEmbeddedDocuments("Item", [{name: "Profissão", type: "Profissao"}]).then(function (item) {
                item[0].sheet.render(true);
            });
        } else {
            let chatData = {
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({
                    actor: this.document
                  })
            };
            chatData.content = "<img src='"+ profData.img +"' style='display: block; margin-left: auto; margin-right: auto;' /><h1 class='mediaeval rola' style='text-align: center;'>" + profData.name + "</h1>"  + "<h3 class='mediaeval rola rola_desc'>" + profData.system.descricao + "</h3>";
            ChatMessage.create(chatData);
        }
    }

    _combateImg(event) {
        const actorData = this.document.system;
        const grupo = $(event.currentTarget).data("itemId");
        let combos = actorData.combos;
        let com_list = combos.split(',');
        const found = com_list.find(element => element == grupo);
        if (found) {
            com_list.splice(com_list.indexOf(grupo),1);
            this.document.update({
                "system.combos": com_list.join(',')
            });
        } else {
            com_list.push(grupo);
            this.document.update({
                "system.combos": com_list.join(',')
            });
        }
    }

    async _subirEstagio(event) {
        let estagio_atual = this.document.system.estagio;
        let r = new Roll('1d10');
        await r.evaluate();
        let valord10 = r.total;
        let nova_eh = 0;
        let eh_atual = this.document.system.eh.max;
        let attFIS = this.document.system.atributos.FIS;
        if (this.profissao) {
            if (valord10 >= 1 && valord10 <= 2) {
                nova_eh = this.profissao.system.lista_eh.v1;
                this.document.update({
                    "system.eh.max": eh_atual + nova_eh + attFIS,
                    "system.estagio": estagio_atual + 1
                });
                ui.notifications.info("Nova EH calculada. Seu estágio agora é "+(estagio_atual+1)+".");
            } else if (valord10 >= 3 && valord10 <= 5) {
                nova_eh = this.profissao.system.lista_eh.v2;
                this.document.update({
                    "system.eh.max": eh_atual + nova_eh + attFIS,
                    "system.estagio": estagio_atual + 1
                });
                ui.notifications.info("Nova EH calculada. Seu estágio agora é "+(estagio_atual+1)+".");
            } else if (valord10 >= 6 && valord10 <= 8) {
                nova_eh = this.profissao.system.lista_eh.v3;
                this.document.update({
                    "system.eh.max": eh_atual + nova_eh + attFIS,
                    "system.estagio": estagio_atual + 1
                });
                ui.notifications.info("Nova EH calculada. Seu estágio agora é "+(estagio_atual+1)+".");
            } else if (valord10 >= 9 && valord10 <= 10) {
                nova_eh = this.profissao.system.lista_eh.v4;
                this.document.update({
                    "system.eh.max": eh_atual + nova_eh + attFIS,
                    "system.estagio": estagio_atual + 1
                });
                ui.notifications.info("Nova EH calculada. Seu estágio agora é "+(estagio_atual+1)+".");
            }
            await r.toMessage({user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: this.document }),
                flavor: ``})
        } else return;
    }

    _ativaEfeito(event) {
        event.preventDefault();
        let button = $(event.currentTarget);
        const li = button.parents(".item");
        const item = this.document.items.get(li.data("itemId"));
        let ativo = item.system.ativo;
        let ativa;
        if (ativo) {
            ativa = false;
        } else {
            ativa = true;
        }
        this.document.updateEmbeddedDocuments("Item", [{
            "_id": item._id,
            "system.ativo": ativa
        }]);
    }

    _onItemRightButton (event) {
        let button = $(event.currentTarget);
        const li = button.parents(".item");
        const item = this.document.items.get(li.data("itemId"));
        if (typeof item.system.descricao == "string") {
            let content = `<div style="height:800px" class='rola_desc mediaeval'><img src="${item.img}" style="display:block;margin-left:auto;margin-right:auto">`;
            content += `<h1 class="fairyDust" style="text-align:center;">${item.name}</h1>`;
            if (item.type == "Magia") content += item.system.efeito ;
            else if (item.type == "Habilidade") {
                if (item.system.tarefAperf.length > 0) content += `<h3 class="mediaeval">Tarefas aperfeiçoadas:</h3>` +  item.system.tarefAperf;
                content += `<br><br><h3 class="mediaeval">Descrição:</h3>` + item.system.descricao;
            }
            else content += item.system.descricao;
            content += `</div>`;
            let dialog = new Dialog({
                title: item.name,
                content: content,
                buttons: {}
            });
            dialog.render(true);
        }
    }

    _onItemRoll (event) {
        let button = $(event.currentTarget);
        const li = button.parents(".item");
        const item = this.document.items.get(li.data("itemId"));
        item.rollTagmarItem();
    }

    _duplicateItem(event) {
        const li = $(event.currentTarget).parents(".item");
        const item = this.document.items.get(li.data("itemId"));
        let dupi = duplicate(item);
        dupi.name = dupi.name + "(Cópia)";
        this.document.createEmbeddedDocuments("Item", [dupi]);
    }

    _prepareCharacterItems(sheetData) {
        const actorData = sheetData.actor;
        const combate = actorData.items.filter(item => item.type == "Combate");
        const magias = actorData.items.filter(item => item.type == "Magia");
        const h_prof = actorData.items.filter(item => item.type == "Habilidade" && item.system.tipo == "profissional");
        const h_man = actorData.items.filter(item => item.type == "Habilidade" && item.system.tipo == "manobra");
        const h_con = actorData.items.filter(item => item.type == "Habilidade" && item.system.tipo == "conhecimento");
        const h_sub = actorData.items.filter(item => item.type == "Habilidade" && item.system.tipo == "subterfugio");
        const h_inf = actorData.items.filter(item => item.type == "Habilidade" && item.system.tipo == "influencia");
        const h_geral = actorData.items.filter(item => item.type == "Habilidade" && item.system.tipo == "geral");
        const tecnicas = actorData.items.filter(item => item.type == "Tecnica_Combate");
        const defesas = actorData.items.filter(item => item.type == "Defesa");
        const transportes = actorData.items.filter(item => item.type == "Transporte");
        const pertences = actorData.items.filter(item => item.type == "Pertence" && !item.system.inTransport);
        const pertences_transporte = actorData.items.filter(item => item.type == "Pertence" && item.system.inTransport);
        const racas = actorData.items.filter(item => item.type == "Raca");
        const profissoes = actorData.items.filter(item => item.type == "Profissao");
        //if (racas.length >= 1) this.document.deleteEmbeddedDocuments("Item", [racas]);
        //if (profissoes.length >= 1) this.document.deleteEmbeddedDocuments("Item", [item._id]);
        const old_tecnicas = actorData.items.filter(item => item.type == "TecnicasCombate");
        if (old_tecnicas.length > 0) {
            let old_ids = [];
            old_tecnicas.forEach(function (old) {
                old_ids.push(old.id);
            });
            this.document.deleteEmbeddedDocuments("Item", old_ids);
        }
        var especializacoes = [];
        const efeitos = actorData.items.filter(item => item.type == "Efeito");
        const tabela_resol = [
            [-7, "verde", "verde", "verde", "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "laranja", "vermelho", "azul", "cinza"],
            [-6, "verde", "verde", "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "laranja", "vermelho", "azul", "cinza"],
            [-5, "verde", "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "azul", "cinza"],
            [-4, "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "azul", "cinza"],
            [-3, "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "azul", "cinza"],
            [-2, "verde", "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "vermelho", "azul", "cinza"],
            [-1, "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "azul", "cinza"],
            [0, "verde", "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "cinza"],
            [1, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "cinza"],
            [2, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "azul", "azul", "cinza"],
            [3, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "cinza"],
            [4, "verde", "branco", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "cinza"],
            [5, "verde", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "cinza"],
            [6, "verde", "branco", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
            [7, "verde", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
            [8, "verde", "branco", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
            [9, "verde", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "cinza"],
            [10, "verde", "branco", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "cinza"],
            [11, "verde", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "cinza"],
            [12, "verde", "branco", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "cinza"],
            [13, "verde", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "cinza"],
            [14, "verde", "branco", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "roxo", "cinza"],
            [15, "verde", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
            [16, "verde", "amarelo", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
            [17, "verde", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
            [18, "verde", "amarelo", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "roxo", "roxo", "cinza"],
            [19, "verde", "amarelo", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "roxo", "roxo", "roxo", "cinza"],
            [20, "verde", "amarelo", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "laranja", "vermelho", "vermelho", "vermelho", "azul", "azul", "azul", "azul", "roxo", "roxo", "roxo", "cinza"]
        ];
        const table_resFisMag = [
            [-2, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20],
            [-1, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20],
            [ 0, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20, 20],
            [ 1, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20, 20],
            [ 2, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20, 20],
            [ 3,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20, 20],
            [ 4,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 20],
            [ 5,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20],
            [ 6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20],
            [ 7,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19],
            [ 8,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19],
            [ 9,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18, 18],
            [10,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17, 18],
            [11,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17, 17],
            [12,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16, 17],
            [13,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16, 16],
            [14,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15, 16],
            [15,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 15],
            [16,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14, 15],
            [17,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13, 14],
            [18,  2,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12, 13],
            [19,  2,  2,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11, 12],
            [20,  2,  2,  2,  2,  2,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  9, 10, 11]
        ];
        if (profissoes[0]) {
            //especializacoes = profissoes[0].system.especializacoes.split(",");
            profissoes[0].system.especializacoes.split(",").forEach(function (espec) {
                especializacoes.push({key : espec});
            });
        } // Alow
        
        if (h_prof.length > 1) h_prof.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (h_man.length > 1) h_man.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (h_con.length > 1) h_con.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (h_sub.length > 1) h_sub.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (h_inf.length > 1) h_inf.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (h_geral.length > 1) h_geral.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (magias.length > 1) magias.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (combate.length > 1) combate.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (tecnicas.length > 1) tecnicas.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (defesas.length > 1) defesas.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (pertences.length > 1) pertences.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (transportes.length > 1) transportes.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (pertences_transporte.length > 1) pertences_transporte.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        if (efeitos.length > 1) efeitos.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });
        const combate_fav = combate.filter(item => item.system.favorito == true);
        const tecnica_fav = tecnicas.filter(item => item.system.favorito == true);
        const magia_fav = magias.filter(item => item.system.favorito == true);
        actorData.efeitos = efeitos;
        this.efeitos = efeitos;
        this.table_resFisMag = table_resFisMag;
        this.tabela_resol = tabela_resol;
        actorData.especializacoes = especializacoes;
        actorData.raca = racas[0];
        actorData.profissao = profissoes[0];
        this.raca = actorData.raca;
        this.profissao = actorData.profissao;
        actorData.pertences_transporte = pertences_transporte;
        actorData.pertences = pertences;
        actorData.defesas = defesas;
        actorData.transportes = transportes;
        actorData.tecnicas = tecnicas;
        actorData.h_prof = h_prof;
        actorData.h_man = h_man;
        actorData.h_con = h_con;
        actorData.h_sub = h_sub;
        actorData.h_inf = h_inf;
        actorData.h_geral = h_geral;
        actorData.habilidades = h_prof.concat(h_man, h_con, h_sub, h_inf, h_geral);
        actorData.cat_def = [{key : "L"}, {key : "M"}, {key : "P"}];
        actorData.combate = combate;
        actorData.combate_fav = combate_fav;
        actorData.tecnica_fav = tecnica_fav;
        actorData.magia_fav = magia_fav;
        actorData.magias = magias;
        actorData.ficha = "Pontos";
        actorData.cd_aprim = false;
        actorData.ci_aprim = false;
        actorData.cl_aprim = false;
        actorData.cld_aprim = false;
        actorData.el_aprim = false;
        actorData.cme_aprim = false;
        actorData.cmm_aprim = false;
        actorData.em_aprim = false;
        actorData.pma_aprim = false;
        actorData.pml_aprim = false;
        actorData.cpe_aprim = false;
        actorData.cpm_aprim = false;
        actorData.ep_aprim = false;
        actorData.pp_aprim = false;
        actorData.ppa_aprim = false;
        actorData.ppb_aprim = false;
        switch (actorData.system.grupo_aprim) {
            case "CD":
                actorData.cd_aprim = true;
                break;
            case "CI":
                actorData.ci_aprim = true;
                break;
            case "CL":
                actorData.cl_aprim = true;
                break;
            case "CLD":
                actorData.cld_aprim = true;
                break;
            case "EL":
                actorData.el_aprim = true;
                break;
            case "CmE":
                actorData.cme_aprim = true;
                break;
            case "CmM":
                actorData.cmm_aprim = true;
                break;
            case "EM":
                actorData.em_aprim = true;
                break;
            case "PmA":
                actorData.pma_aprim = true;
                break;
            case "PmL":
                actorData.pml_aprim = true;
                break;
            case "CpE":
                actorData.cpe_aprim = true;
                break;
            case "CpM":
                actorData.cpm_aprim = true;
                break;
            case "EP":
                actorData.ep_aprim = true;
                break;
            case "PP":
                actorData.pp_aprim = true;
                break;
            case "PpA":
                actorData.ppa_aprim = true;
                break;
            case "PpB":
                actorData.ppb_aprim = true;
                break;
            default:
                actorData.cd_aprim = false;
                actorData.ci_aprim = false;
                actorData.cl_aprim = false;
                actorData.cld_aprim = false;
                actorData.el_aprim = false;
                actorData.cme_aprim = false;
                actorData.cmm_aprim = false;
                actorData.em_aprim = false;
                actorData.pma_aprim = false;
                actorData.pml_aprim = false;
                actorData.cpe_aprim = false;
                actorData.cpm_aprim = false;
                actorData.ep_aprim = false;
                actorData.pp_aprim = false;
                actorData.ppa_aprim = false;
                actorData.ppb_aprim = false;
                break;
        }
    }

}