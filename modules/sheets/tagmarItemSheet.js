export default class tagmarItemSheet extends foundry.appv1.sheets.ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["tagmar", "sheet", "item"],
        width: 600,
        height: 600,
        tabs: [{
            navSelector: ".prim-tabs",
            contentSelector: ".sheet-primary",
            initial: "basico"
            }]
        });
    }

    get template() {
        let layout = game.settings.get("tagmar_rpg", "sheetTemplate");
        if (this.object.type == "Efeito") {
            this['options']['height'] = 350;
            this['position']['height'] = 350;
            this['options']['width'] = 500;
            this['position']['width'] = 500;
        }
        if (this.object.type == "Combate") {
            this['options']['height'] = 560;
            this['position']['height'] = 560;
        }
        if (this.object.type == "Profissao") {
            this['options']['height'] = 600;
            this['position']['height'] = 600;
        }
        if (this.object.type == "Tecnica_Combate") {
            this['options']['height'] = 730;
            this['position']['height'] = 730;
        }
        if (this.object.type == "Habilidade") {
            this['options']['height'] = 605;
            this['position']['height'] = 605;
        }
        if (!["base", "dark", "foundry"].includes(layout)) {
            return 'systems/tagmar_rpg/templates/sheets/'+ this.object.type.toLowerCase() +'-ficha.hbs';
        } else {
            return 'systems/tagmar_rpg/templates/sheets/'+ this.object.type.toLowerCase() +'-sheet.hbs';
        }
    }

    getData(options) {
        const data = super.getData(options);
        this._prepareItemData(data);
        if (this.object.type == "Profissao" && this.object.system.especializacoes != "") {
            data.data.system.especializacoes = this.object.system.especializacoes.split(",");
        } else if (this.object.type == "Profissao") data.data.system.especializacoes = [];
        console.log(this.object.img);
        return data;
    }

    revemoDupTec(tecnicas) {
        let unique = [];
        tecnicas.forEach(element => {
            if (!unique.includes(element.name)) {
                unique.push(element.name);
            }
        });
        let retorno = [];
        unique.forEach(element => {
            retorno.push({"name": element});
        });
        return retorno;
    }

    _prepareItemData(sheetData) {
        const itemData = sheetData.document;
        itemData.comb_bonus = [{key : ""}, {key : "AUR"}, {key : "FOR"}, {key : "AGI"}, {key : "PER"}];
        itemData.comb_tipos = [ {key : ""}, {key : "CD"}, {key : "CI"}, {key : "CL"}, {key : "CLD"}, {key : "EL"}, {key : "CmE"}, {key : "CmM"}, {key : "EM"}, {key : "PmA"}, {key : "PmL"}, {key : "CpE"}, {key : "CpM"}, {key : "EP"}, {key : "PP"}, {key : "PpA"}, {key : "PpB"}];
        itemData.def_tipos = [{key : ""}, {key : "L"}, {key : "M"}, {key : "P"}];
        const atrib_bas = [{key : "INT"}, {key : "AUR"}, {key : "CAR"}, {key : "FOR"}, {key : "FIS"}, {key : "AGI"}, {key : "PER"}];
        const atrib_res = [{key : "EF"}, {key : "ABS"}, {key : "DEF"}, {key : "KMA"}, {key : "VB"}, {key : "RFIS"}, {key : "RMAG"}, {key : "PHAB"}, {key : "PTEC"}, {key : "PARM"}, {key : "PMAG"}];
        itemData.efeitos_tipos = atrib_bas.concat(atrib_res);
        const actor = game.actors.find(a => a.items.find(i => i.id == itemData._id));
        itemData.tecnicas = [{name : ""}];
        if (typeof actor != 'undefined') {
            if (actor.ficha != "Sorteio") {
                itemData.efeitos_tipos = atrib_res;
            } 
        }
        const tecnicas = this.revemoDupTec(game.items.filter(e => e.type == "Tecnica_Combate" && e.system.complemento == "Sim"));
        if (tecnicas.length > 0) itemData.tecnicas = [{name : ""}].concat(tecnicas);
        itemData.efeitos_oper = [{key : "+"}, {key : "-"}, {key : "/"}, {key : "*"}];
        itemData.hab_tipos = [
            {key : "profissional", label : "Profissional"},
            {key : "manobra", label : "Manobra"},
            {key : "conhecimento", label : "Conhecimento"},
            {key : "subterfugio", label : "Subterfúgio"},
            {key : "influencia", label : "Influência"},
            {key : "geral", label : "Geral"}
        ];
        itemData.prof_grupo_pen = [{key : "", label : ""}].concat(itemData.hab_tipos);
        itemData.prof_atribM = [{key : ""}].concat(atrib_bas);
        itemData.tec_mecanicas = [
            {value: 0, label: "Bônus de FA"},
            {value: 1, label: "Efeito de nível"},
            {value: 2, label: "Rolamento de dados"},
            {value: 3, label: "Bônus especiais"},
            {value: 4, label: "Aprimoramento de Técnica"}
        ];
        itemData.tec_perg = [
            {key: "Não"},
            {key: "Sim"}
        ];
        itemData.tec_durac = [
            {key: "Ataque(s)"},
            {key: "Rodada(s)"},
            {key: "Combate"}
        ];
    }

    activateListeners(html) {
        super.activateListeners(html);
        this.element.toggleClass("tagmar-dark-sheet", game.settings.get("tagmar_rpg", "sheetTemplate") === "dark");
        this.element.toggleClass("tagmar-foundry-sheet", game.settings.get("tagmar_rpg", "sheetTemplate") === "foundry");
        this._activateTreasureMagicLinks(html);
        this._renderTreasureSecrets(html);
        if (!this.options.editable) return;

        html.find(".dano25").change(event => {
            const dano25Input = html.find(".dano25");
            var dano25 = parseInt($(dano25Input).val());
            var dano50 = dano25 + dano25;
            var dano75 = dano50 + dano25;
            var dano100 = dano75 + dano25;
            var dano125 = dano100 + dano25;
            var dano150 = dano125 + dano25;
            var dano175 = dano150 + dano25;
            var dano200 = dano175 + dano25;
            var dano225 = dano200 + dano25;
            var dano250 = dano225 + dano25;
            var dano275 = dano250 + dano25;
            var dano300 = dano275 + dano25;
            $(html.find(".dano50")).val(dano50);
            $(html.find(".dano75")).val(dano75);
            $(html.find(".dano100")).val(dano100);
            $(html.find(".dano125")).val(dano125);
            $(html.find(".dano150")).val(dano150);
            $(html.find(".dano175")).val(dano175);
            $(html.find(".dano200")).val(dano200);
            $(html.find(".dano225")).val(dano225);
            $(html.find(".dano250")).val(dano250);
            $(html.find(".dano275")).val(dano275);
            $(html.find(".dano300")).val(dano300);
        });
        html.find(".sendMessage").click(this._sendMessage.bind(this));

        html.find(".ajuste").change(this._attTotalHab(this));
        html.find(".nivel").change(this._attTotalHab(this));
        html.find(".penal").change(this._attTotalHab(this));
        html.find(".bonus").change(this._attTotalHab(this));
        html.find(".bAddEspec").click(this._addEspec.bind(this));
        html.find(".bApagaEspec").click(this._deleteEspec.bind(this));
        html.find(".armPen25").click(function (event) {
            if (event.currentTarget.checked) {
                $('.armPen50').attr('checked', false);
                $('.armPen75').attr('checked', false);
                $('.armPen100').attr('checked', false);
            }
        });
        html.find(".armPen50").click(function (event) {
            if (event.currentTarget.checked) {
                $('.armPen25').attr('checked', false);
                $('.armPen75').attr('checked', false);
                $('.armPen100').attr('checked', false);
            }
        });
        html.find(".armPen75").click(function (event) {
            if (event.currentTarget.checked) {
                $('.armPen25').attr('checked', false);
                $('.armPen50').attr('checked', false);
                $('.armPen100').attr('checked', false);
            }
        });
        html.find(".armPen100").click(function (event) {
            if (event.currentTarget.checked) {
                $('.armPen25').attr('checked', false);
                $('.armPen50').attr('checked', false);
                $('.armPen75').attr('checked', false);
            }
        });
        html.find('.abs_magica').click(this._abs_magica.bind(this));
    }

    _activateTreasureMagicLinks(html) {
        if (!this.object.flags?.tagmarTreasure) return;
        html.find('a.content-link[data-uuid]')
            .off('click.tagmarTreasure')
            .on('click.tagmarTreasure', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const uuid = event.currentTarget.dataset.uuid;
                if (!uuid) return;
                try {
                    const linkedDocument = await fromUuid(uuid);
                    if (!linkedDocument) {
                        ui.notifications.warn("A magia vinculada não está mais disponível no compêndio.");
                        return;
                    }
                    linkedDocument.sheet?.render(true);
                } catch (error) {
                    console.error("Tagmar | Falha ao abrir magia vinculada", error);
                    ui.notifications.error("Não foi possível abrir a magia vinculada.");
                }
            });
    }

    _renderTreasureSecrets(html) {
        if (!game.user?.isGM) return;
        const treasure = this.object.flags?.tagmarTreasure;
        if (!treasure?.lore && !treasure?.curse) return;
        const hiddenLore = treasure.lore && !treasure.revealHistory;
        const hiddenCurse = treasure.curse && !treasure.revealCurse;
        if (!hiddenLore && !hiddenCurse) return;
        const root = html?.[0] || this.element?.[0];
        const target = root?.querySelector?.(".sheet-primary") || root?.querySelector?.("form") || root;
        if (!target || target.querySelector(".tagmar-treasure-item-secrets")) return;
        const panel = document.createElement("section");
        panel.className = "tagmar-treasure-item-secrets";
        const title = document.createElement("h3");
        title.textContent = "Segredos do tesouro — somente Mestre";
        panel.append(title);
        const addParagraph = (label, value) => {
            if (!value) return;
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = `${label}: `;
            paragraph.append(strong, document.createTextNode(value));
            panel.append(paragraph);
        };
        if (hiddenLore) {
            addParagraph("Nome verdadeiro", treasure.trueName || treasure.lore.trueName);
            addParagraph("História", treasure.lore.text);
            addParagraph("Situação", "história ainda oculta dos jogadores");
        }
        if (hiddenCurse) {
            addParagraph("Natureza", treasure.curseMode === "only" ? "somente amaldiçoado" : "item mágico amaldiçoado");
            addParagraph(treasure.curse.name || "Maldição", treasure.curse.effect);
            addParagraph("Tempo de afastamento", treasure.curse.separationTime);
            addParagraph("Vínculo com o item", treasure.curse.binding
                ? `${treasure.curse.binding.label} — ${treasure.curse.binding.detail}`
                : "");
            addParagraph("Como se libertar", treasure.curse.binding?.release);
            if (treasure.curse.hasNarrative) {
                addParagraph("Vertente infernal", treasure.curse.patronLabel);
                addParagraph("Fachada profanada", treasure.curse.facade?.order);
                addParagraph("Sinal de heresia", treasure.curse.heresy);
                addParagraph("Reconhecimento", treasure.curse.recognition);
            }
            addParagraph("Situação", "maldição ainda oculta dos jogadores");
            if (treasure.curse.source) {
                const link = document.createElement("a");
                link.href = treasure.curse.source;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "Consultar a magia oficial Maldições";
                panel.append(link);
            }
            if (treasure.curse.hasNarrative && treasure.curse.infernalSource) {
                const link = document.createElement("a");
                link.href = treasure.curse.infernalSource;
                link.target = "_blank";
                link.rel = "noopener";
                link.textContent = "Consultar Senhores das Profundezas";
                panel.append(link);
            }
        }
        const actions = document.createElement("div");
        actions.className = "tagmar-treasure-secret-actions";
        const addRevealButton = (kind, label) => {
            const button = document.createElement("button");
            button.type = "button";
            button.innerHTML = `<i class="fas fa-eye"></i> ${label}`;
            button.addEventListener("click", () => this._revealTreasureSecret(kind));
            actions.append(button);
        };
        if (hiddenLore) addRevealButton("history", "Revelar história aos jogadores");
        if (hiddenCurse) addRevealButton("curse", "Revelar maldição aos jogadores");
        if (actions.childElementCount) panel.append(actions);
        target.prepend(panel);
    }

    async _revealTreasureSecret(kind) {
        if (!game.user?.isGM) return;
        const treasure = this.object.flags?.tagmarTreasure;
        const isHistory = kind === "history";
        const secret = isHistory ? treasure?.lore : treasure?.curse;
        if (!secret) return;
        const flagKey = isHistory ? "revealHistory" : "revealCurse";
        if (treasure?.[flagKey]) return;
        const escapeHtml = (value) => String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
        const heading = isHistory ? "História revelada" : (secret.name || "Maldição revelada");
        const detail = isHistory ? secret.text : secret.effect;
        const curseNature = !isHistory
            ? `<p><strong>Natureza:</strong> ${treasure.curseMode === "only" ? "somente amaldiçoado" : "item mágico amaldiçoado"}</p>`
            : "";
        const curseBinding = !isHistory && secret.binding
            ? `<p><strong>Tempo de afastamento:</strong> ${escapeHtml(secret.separationTime)}</p><p><strong>Vínculo com o item:</strong> ${escapeHtml(secret.binding.label)} — ${escapeHtml(secret.binding.detail)}.</p><p><strong>Como se libertar:</strong> ${escapeHtml(secret.binding.release)}.</p>`
            : "";
        const curseNarrative = !isHistory && secret.hasNarrative
            ? `<p><strong>Vertente infernal:</strong> ${escapeHtml(secret.patronLabel)}</p><p><strong>Fachada profanada:</strong> ${escapeHtml(secret.facade?.order)}</p><p><strong>Sinal de heresia:</strong> ${escapeHtml(secret.heresy)}</p><p><em>${escapeHtml(secret.recognition)}</em></p>`
            : "";
        const infernalSourceLink = !isHistory && secret.hasNarrative && secret.infernalSource
            ? `<p><a href="${escapeHtml(secret.infernalSource)}" target="_blank" rel="noopener">Consultar Senhores das Profundezas</a></p>`
            : "";
        const descriptionBlock = `<section class="tagmar-treasure-revealed"><h3>${escapeHtml(heading)}</h3>${curseNature}<p>${escapeHtml(detail)}</p>${curseBinding}${curseNarrative}${infernalSourceLink}</section>`;
        const updates = {
            "system.descricao": `${this.object.system?.descricao || ""}${descriptionBlock}`,
            [`flags.tagmarTreasure.${flagKey}`]: true
        };
        await this.object.update(updates);
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker(),
            content: `<section class="tagmar-treasure-chat"><h3><i class="fas fa-eye"></i> ${escapeHtml(heading)}</h3><p><strong>${escapeHtml(this.object.name)}</strong></p>${curseNature}<p>${escapeHtml(detail)}</p>${curseBinding}${curseNarrative}${infernalSourceLink}</section>`
        });
        ui.notifications.info(isHistory ? "História revelada aos jogadores." : "Maldição revelada aos jogadores.");
    }

    _abs_magica(event) {
        let abs_magica = 0; 
        if (this.object.system.peso == 0) {
            abs_magica = 1;
        } else {
            abs_magica = 0;
        }
        this.object.update({'system.peso': abs_magica});
    }

    async _sendMessage(event) {
        if (this.object.isOwned) {
            let itemActor = this.object.actor.items.get(this.object.id);
            let newItem = await Item.create(itemActor.data);
            let chatData = {};
            chatData.content = '@Item['+newItem.id+']';
            ChatMessage.create(chatData);
        } else {
            let chatData = {};
            chatData.content = '@Item['+this.item.id+']';
            ChatMessage.create(chatData);
        }
    }

    _deleteEspec(event) {
        const itemData = this.object.system;
        let especD = $(event.currentTarget).data("itemId");
        let espec_list_string = itemData.especializacoes;
        let nova_string = "";
        let espec_list = espec_list_string.split(",");
        for (let i = 0; i < espec_list.length; i++) {
            if (espec_list[i] == especD) {
                espec_list.splice(i, 1);
            }
        }
        nova_string = espec_list.join(",");
        this.item.update({
            "system.especializacoes": nova_string
        });
        this.render();
    }

    _addEspec(event) {
        const item = this.object;
        const espec_name = $(".iEspecName").val();
        let espec_list = item.system.especializacoes;
        let espec_list_string = "";
        
        if (!espec_list.search(",") && espec_name != "") {
            espec_list_string = espec_name + ",";
        } else if (espec_name != "") {
            espec_list_string = espec_list + espec_name + ",";
        }
        if (espec_list_string != "") {
            item.update({
                "system.especializacoes": espec_list_string
            });
        }
        this.render();
    }
    

    _attTotalHab(event) {
        if (!this.object.isOwned) return;
        const ajuste = $(".ajuste").val();
        const nivel = $(".nivel").val();
        const penal = $(".penal").val();
        const bonus = $(".bonus").val();
        let soma = 0;
        if (nivel > 0) { 
            soma = parseInt(ajuste) + parseInt(nivel) + parseInt(penal) + parseInt(bonus);
        } else {
            soma = parseInt(ajuste) - 7 + parseInt(penal) + parseInt(bonus);
        }
        $(".totalInput2").val(soma);
    }

}
