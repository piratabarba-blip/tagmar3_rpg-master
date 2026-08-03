export class tagmarActor extends Actor {
    
    async prepareData() {
        this.dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
    }

    async _aplicarDano(dano, token) {
        if (this.type == "Inventario") return;
        let eh = this.system.eh.value;
        let eh_max = this.system.eh.max;
        let ef = this.system.ef.value;
        let abs = this.system.absorcao.value;
        let abs_magica = this.system.v_base;
        if (abs_magica > 0) abs_magica = true;
        else abs_magica = false;
        let eh_str = 'system.eh.value';
        let ef_str = 'system.ef.value';
        if (this.type == "NPC") {
            eh_str = 'system.eh_npc.value';
            ef_str = 'system.ef_npc.value';
            eh = this.system.eh_npc.value;
            eh_max = this.system.eh_npc.max;
            ef = this.system.ef_npc.value;
        }
        let update = {};
        let olds = {};
        if (!dano.isCritico) {
            if (!dano.isCura) {
                if (eh > 0) {
                    eh -= dano.valor;
                    if (eh < 0) eh = 0;
                    update[eh_str] = eh;
                    olds[eh_str] = this.system.eh.value - eh;
                    if (this.type == "NPC") olds[eh_str] = this.system.eh_npc.value - eh;
                } else if (abs > 0) {
                    abs -= dano.valor;
                    if (abs < 0) {
                        ef += abs;
                        abs = 0;
                        update[ef_str] = ef;
                        olds[ef_str] = this.system.ef.value - ef;
                        if (this.type == "NPC") olds[ef_str] = this.system.ef_npc.value - ef;
                    }
                    update['system.absorcao.value'] = abs;
                    olds['system.absorcao.value'] = this.system.absorcao.value - abs;
                } else {
                    ef -= dano.valor;
                    update[ef_str] = ef;
                    olds[ef_str] = this.system.ef.value - ef;
                    if (this.type == "NPC") olds[ef_str] = this.system.ef_npc.value - ef;
                }
            } else {
                if (eh < eh_max) {
                    eh += dano.valor;
                    if (eh > eh_max) eh = eh_max;
                    update[eh_str] = eh;
                    olds[eh_str] = this.system.eh.value - eh;
                    if (this.type == "NPC") olds[eh_str] = this.system.eh_npc.value - eh;
                } else {
                    ui.notifications.info('Sua EH atual é igual ou maior que o valor máximo. Nenhum valor alterado.');
                }
            }
        } else {
            if (abs > 0 && abs_magica) {
                abs -= dano.valor;
                if (abs < 0) {
                    ef += abs;
                    abs = 0;
                    update[ef_str] = ef;
                    olds[ef_str] = this.system.ef.value - ef;
                    if (this.type == "NPC") olds[ef_str] = this.system.ef_npc.value - ef;
                }
                update['system.absorcao.value'] = abs;
                olds['system.absorcao.value'] = this.system.absorcao.value - abs;
            } else {
                ef -= dano.valor;
                update[ef_str] = ef;
                olds[ef_str] = this.system.ef.value - ef;
                if (this.type == "NPC") olds[ef_str] = this.system.ef_npc.value - ef;
            }
        }
        await this.update(update);
        if (update.hasOwnProperty('_id')) delete update['_id'];
        if (Object.keys(update).length > 0) {
            let scrolling = "";
            let scrollStyle = {fill: "red", fontFamily: "GoudyMediaeval", strokeThickness: 2, stroke: "black"};
            for (let key of Object.keys(update)) {
                let att = key.replace("system.", "").replace('.value', "");
                if (dano.isCura) {
                    scrolling += `${att.toUpperCase()} +${olds[key] *-1}\n`;
                    scrollStyle = {fill: "green", fontFamily: "GoudyMediaeval", strokeThickness: 2, stroke: "black"};
                }
                else {
                    scrolling += `${att.toUpperCase()} -${olds[key]}\n`;
                }
            }
            //token.hud.createScrollingText(scrolling, scrollStyle);
            canvas.interface.createScrollingText(token.center, scrolling, scrollStyle);
        }
    }
    
    _rollTeste(teste) {
        if (teste.name == "Atributo") {
            this._rollAtributo(teste.id);
        } else if (teste.name == "Resistencia") {
            this._rollResistencia(teste.f_ataque, teste.id);
        } else if (teste.name == "Moral") {
            this._rollMoral();
        }
    }

    async _rollMoral() {
        const tabela_resol = game.tagmar.tabela_resol;
        let moral = this.system.moral;
        if (moral < -7) moral = -7;
        let formulaD = "1d20";
        let r = new Roll(formulaD);
        let resultado = "";
        let col_tab = [];
        let PrintResult = "";
        await r.evaluate();
        let Dresult = r.total;
        if (moral <= 20) {
            col_tab = tabela_resol.find(h => h[0] == moral);
            resultado = col_tab[Dresult];
            PrintResult = await this.evalAtrib(resultado);
            let coluna = "<h4 class='mediaeval rola'>Coluna:" + col_tab[0] + "</h4>";
            if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
                this.dadosColoridos.dadosColoridos(resultado, r);
            }
            await r.toMessage({
                user: game.user.id,
                speaker: ChatMessage.getSpeaker({ actor: this }),
                flavor: `<h2 class='mediaeval rola'>Moral: ${moral}</h2>${coluna}${PrintResult}`
            });
        } else {
            let valor_hab = moral % 20;
            if (valor_hab == 0) {
                let vezes = moral / 20;
                for (let x = 0; x < vezes; x++){
                    let ds = await new Roll("1d20").evaluate();
                    col_tab = tabela_resol.find(h => h[0] == 20);
                    resultado = col_tab[ds.total];
                    PrintResult = await this.evalAtrib(resultado);
                    let coluna = "<h4 class='mediaeval rola'>Coluna:" + col_tab[0] + "</h4>";
                    if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
                        this.dadosColoridos.dadosColoridos(resultado, ds);
                    }
                    await ds.toMessage({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({ actor: this }),
                        flavor: `<h2 class='mediaeval rola'>Moral: ${moral}</h2>${coluna}${PrintResult}`
                    });
                }
            } else if (valor_hab > 0) {
                    let vezes = parseInt(moral / 20);
                    let sobra = moral % 20;
                    for (let x = 0; x < vezes; x++){
                        let ds = await new Roll("1d20").evaluate();
                        col_tab = tabela_resol.find(h => h[0] == 20);
                        resultado = col_tab[ds.total];
                        PrintResult = await this.evalAtrib(resultado);
                        let coluna = "<h4 class='mediaeval rola'>Coluna:" + col_tab[0] + "</h4>";
                        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
                            this.dadosColoridos.dadosColoridos(resultado, ds);
                        }
                        await ds.toMessage({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ actor: this }),
                            flavor: `<h2 class='mediaeval rola'>Moral: ${moral}</h2>${coluna}${PrintResult}`
                        });
                    }
                    let dado = await new Roll(formulaD).evaluate();
                    col_tab = tabela_resol.find(h => h[0] == sobra);
                    resultado = col_tab[dado.total];
                    PrintResult = await this.evalAtrib(resultado);
                    let coluna = "<h4 class='mediaeval rola'>Coluna:" + col_tab[0] + "</h4>";
                    if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
                        this.dadosColoridos.dadosColoridos(resultado, dado);
                    }
                    await dado.toMessage({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({ actor: this }),
                        flavor: `<h2 class='mediaeval rola'>Moral: ${moral}</h2>${coluna}${PrintResult}`
                    });
                }
        }
    }

    async _rollResistencia(forcAtaqueI, tipo) {
        const table_resFisMag = game.tagmar.table_resFisMag;
        let valorDefI;
        if (tipo == "Magía") valorDefI = this.system.rm;
        else valorDefI = this.system.rf;
        let forcAtaque = forcAtaqueI;
        let valorDef = valorDefI;
        let def_ataq = valorDef - forcAtaque;
        let stringSucesso = "";
        let valorSucess = 0;
        if ((valorDef >= -2 && valorDef <= 20) && (forcAtaque >= 1 && forcAtaque <= 20)) {
            let coluna = table_resFisMag.find(col => col[0] == valorDef);
            valorSucess = coluna[forcAtaque];
        } else {
            if (def_ataq == 0) valorSucess = 11;
            else if (def_ataq == 1) valorSucess = 10;
            else if (def_ataq == 2) valorSucess = 9;
            else if (def_ataq == 3) valorSucess = 8;
            else if (def_ataq == 4 || def_ataq == 5) valorSucess = 7;
            else if (def_ataq == 6 || def_ataq == 7) valorSucess = 6;
            else if (def_ataq == 8 || def_ataq == 9) valorSucess = 5;
            else if (def_ataq == 10 || def_ataq == 11) valorSucess = 4;
            else if (def_ataq == 12 || def_ataq == 13) valorSucess = 3;
            else if (def_ataq == 14 || def_ataq == 15) valorSucess = 2;
            else if (def_ataq >= 16) valorSucess = 1;
            else if (def_ataq == -1) valorSucess = 11;
            else if (def_ataq == -2) valorSucess = 12;
            else if (def_ataq == -3) valorSucess = 13;
            else if (def_ataq == -4 || def_ataq == -5) valorSucess = 14;
            else if (def_ataq == -6 || def_ataq == -7) valorSucess = 15;
            else if (def_ataq == -8 || def_ataq == -9) valorSucess = 16;
            else if (def_ataq == -10 || def_ataq == -11) valorSucess = 17;
            else if (def_ataq == -12 || def_ataq == -13) valorSucess = 18;
            else if (def_ataq == -14 || def_ataq == -15) valorSucess = 19;
            else if (def_ataq <= -16) valorSucess = 20;
        }
        const r = new Roll("1d20");
        await r.evaluate();
        const Dresult = r.total;
        if ((Dresult >= valorSucess || Dresult == 20) && Dresult > 1) { // Sucesso
            stringSucesso = "<h1 class='mediaeval rola' style='text-align:center; color: white;background-color:#00a1e8;'>SUCESSO</h1>";
            if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
                this.dadosColoridos.dadosColoridos("azul", r);
            }
        } else {    // Insucesso
            stringSucesso = "<h1 class='mediaeval rola' style='text-align:center; color: white;background-color:#ff0000;'>FRACASSO</h1>";
            if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
                this.dadosColoridos.dadosColoridos("vermelho", r);
            }
        }
        r.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            flavor: `<img src="${this.img}" style="display:block;margin-left:auto;margin-right:auto;border-width:0;"/><h2 class="mediaeval rola" style="text-align:center;">Teste de Resistência </h2><h3 class="mediaeval rola"> Força Ataque: ${forcAtaqueI}</h3><h3 class="mediaeval rola">Resistência ${tipo}: ${valorDefI}</h3>${stringSucesso}`
        });
    }

    async evalAtrib(resultado) {
        let PrintResult = "";
        if (resultado == "verde") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#91cf50;'>Verde - Falha</h1>";
        else if (resultado == "branco") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:white;'>Branco - Rotineiro</h1>";
        else if (resultado == "amarelo") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#ffff00;'>Amarelo - Fácil</h1>";
        else if (resultado == "laranja") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff9900;'>Laranja - Médio</h1>";
        else if (resultado == "vermelho") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff0000;'>Vermelho - Difícil</h1>";
        else if (resultado == "azul") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#00a1e8;'>Azul - Muito Difícil</h1>";
        else if (resultado == "roxo") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#0000ff;'>Azul Escuro - Absurdo</h1>";
        else if (resultado == "cinza") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#bfbfbf;'>Cinza - Impossível</h1>";
        return PrintResult;
    }

    async AtribToChat(resultado, r, col, cat, habil) {
        let PrintResult = await this.evalAtrib(resultado);
        const actorImg = `<img src='${this.img}' style='display:block;border-width:0;margin-left:auto;margin-right:auto;'/>`;
        let coluna = "<h4 class='mediaeval rola'>Coluna:" + col + "</h4>";
        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
            this.dadosColoridos.dadosColoridos(resultado, r);
        }
        await r.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this }),
            flavor: `${actorImg}<h2 class="mediaeval rola" style="text-align:center;">Teste de Habilidade ${cat} : ${habil}</h2>${coluna}${PrintResult}`
        });
    }

    async AtribToChat2(vezes, tabela_resol, sobra, cat, habil) {
        let dados = [];
        let melhor;
        let valor = 0;
        let m_valor = 0;
        let m_cor;
        let conteudo = "";
        const actorImg = `<img src='${this.img}' style='display:block;border-width:0;margin-left:auto;margin-right:auto;'/>`;
        for (let x = 0; x < vezes; x++){
            dados[x] = new Roll("1d20");
            await dados[x].evaluate();
            let coluna_tab = tabela_resol.filter(b => b[0] === 20);
            let color = "";
            let resultado = coluna_tab[0][dados[x].total];
            let PrintResult = await this.evalAtrib(resultado);
            switch (resultado) {
                case 'verde':
                    valor = 0;
                    color = 'green';
                    break;
                case 'branco':
                    valor = 1;
                    color = 'white';
                    break;
                case 'amarelo':
                    valor = 2;
                    color = 'yellow';
                    break;
                case 'laranja':
                    valor = 3;
                    color = 'orange';
                    break;
                case 'vermelho':
                    valor = 4;
                    color = 'red';
                    break;
                case 'azul':
                    valor = 5;
                    color = 'blue';
                    break;
                case 'roxo':
                    valor = 6;
                    color = 'darkBlue'
                    break;
                default:
                    valor = 7;
                    color = 'grey';
                    break;
            }
            conteudo += "<h4 class='mediaeval rola'>Coluna:" + coluna_tab[0][0] + " <span style='color: "+ color +"; text-shadow: 2px 2px 5px black;'>Dado:"+ dados[x].total +"</span></h4>";
            if (x == 0) {
                melhor = dados[x];
                m_cor = resultado;
                m_valor = valor;
            } else if (valor > m_valor) {
                melhor = dados[x];
                m_cor = resultado;
                m_valor = valor;
            }
            conteudo += PrintResult;
        }
        if (sobra > 0) {
            let dado = new Roll("1d20");
            await dado.evaluate();
            let coluna_tab = tabela_resol.filter(b => b[0] === sobra);
            let resultado = coluna_tab[0][dado.total];
            let color = "";
            let PrintResult = await this.evalAtrib(resultado);
            switch (resultado) {
                case 'verde':
                    valor = 0;
                    color = 'green';
                    break;
                case 'branco':
                    valor = 1;
                    color = 'white';
                    break;
                case 'amarelo':
                    valor = 2;
                    color = 'yellow';
                    break;
                case 'laranja':
                    valor = 3;
                    color = 'orange';
                    break;
                case 'vermelho':
                    valor = 4;
                    color = 'red';
                    break;
                case 'azul':
                    valor = 5;
                    color = 'blue';
                    break;
                case 'roxo':
                    valor = 6;
                    color = 'darkBlue'
                    break;
                default:
                    valor = 7;
                    color = 'grey';
                    break;
            }
            conteudo += "<h4 class='mediaeval rola'>Coluna:" + coluna_tab[0][0] + " <span style='color: "+ color +"; text-shadow: 2px 2px 5px black;'>Dado:"+ dado.total +"</span></h4>";
            if (valor > m_valor) {
                melhor = dado;
                m_cor = resultado;
                m_valor = valor;
            }
            conteudo += PrintResult;
        }
        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
            this.dadosColoridos.dadosColoridos(m_cor, melhor);
        }
        melhor.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${actorImg}<h2 class="mediaeval rola" style="text-align:center;">Teste de Habilidade ${cat} : ${habil}</h2>${conteudo}`
        });
    }

    async _rollAtributo(cat) {
        const tabela_resol = game.tagmar.tabela_resol;
        let valor_teste = 0;
        const actorData = this.system;
        let habil = 0;
        if (cat == "INT") {
            habil = actorData.atributos.INT;
            valor_teste = actorData.valor_teste.INT;
        }
        else if (cat == "AUR") {
            habil = actorData.atributos.AUR;
            valor_teste = actorData.valor_teste.AUR;
        }
        else if (cat == "CAR") {
            habil = actorData.atributos.CAR;
            valor_teste = actorData.valor_teste.CAR;
        }
        else if (cat == "FOR") {
            habil = actorData.atributos.FOR;
            valor_teste = actorData.valor_teste.FOR;
        }
        else if (cat == "FIS") {
            habil = actorData.atributos.FIS;
            valor_teste = actorData.valor_teste.FIS;
        }
        else if (cat == "AGI") {
            habil = actorData.atributos.AGI;
            valor_teste = actorData.valor_teste.AGI;
        }
        else if (cat == "PER") {
            habil = actorData.atributos.PER;
            valor_teste = actorData.valor_teste.PER;
        }
        if (valor_teste < -7) valor_teste = -7;
        if (valor_teste <= 20) {
            let r = await new Roll("1d20").evaluate();
            let col_tab = tabela_resol.find(h => h[0] == valor_teste);
            let resultado = col_tab[r.total];
            await this.AtribToChat(resultado, r, col_tab[0], cat, habil);
        } else {
            let valor_atrib = valor_teste % 20;
            if (valor_atrib == 0) {
                let vezes = valor_teste / 20;
                await this.AtribToChat2(vezes, tabela_resol, 0, cat, habil);                
            } else if (valor_atrib > 0) {
                let vezes = parseInt(valor_teste / 20);
                let sobra = valor_teste % 20;
                await this.AtribToChat2(vezes, tabela_resol, sobra, cat, habil);
            }
        }
    }

}