export class tagmarItem extends Item {

    async prepareData() {
        if (!this.isOwned) return;
        super.prepareData();
    }

    async evalHab(resultado) {
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

    async habToChat(resultado, r, h_total, colunarolada) {
        let dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
        let conteudo = "<h3 class='mediaeval rola'>Informações adicionais: </h3>" + "<div class='mediaeval rola rola_desc'>" + this.system.tarefAperf + "</div>";
        let PrintResult = await this.evalHab(resultado);
        let coluna = "<h4 class='mediaeval rola'>Coluna:" + colunarolada + "</h4>";
        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
            dadosColoridos.dadosColoridos(resultado, r);
        }
        r.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `<img src="${this.img}" style="display: block; margin-left: auto; margin-right: auto;" /><h2 class="mediaeval rola" style="text-align:center;">${this.name}: ${h_total}</h2>${conteudo}${coluna}${PrintResult}`
        });
    }

    async habToChat2(vezes, h_total, tabela_resol, sobra) {
        let dados = [];
        let dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
        let conteudo = "<h3 class='mediaeval rola'>Informações adicionais: </h3>" + "<div class='mediaeval rola rola_desc'>" + this.system.tarefAperf + "</div>";
        let melhor;
        let valor = 0;
        let m_valor = 0;
        let m_cor;
        for (let x = 0; x < vezes; x++){
            dados[x] = new Roll("1d20");
            await dados[x].evaluate();
            let coluna_tab = tabela_resol.filter(b => b[0] === 20);
            let resultado = coluna_tab[0][dados[x].total];
            let PrintResult = await this.evalHab(resultado);
            let color = "";
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
            let PrintResult = await this.evalHab(resultado);
            let color = "";
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
            dadosColoridos.dadosColoridos(m_cor, melhor);
        }
        melhor.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `<img src="${this.img}" style="display: block; margin-left: auto; margin-right: auto;" /><h2 class="mediaeval rola" style="text-align:center;">${this.name}: ${h_total}</h2>${conteudo}`
        });
    }

    async rollHabilidade() {
        const tabela_resol = game.tagmar.tabela_resol;
        let bonus_hab = this.actor.system.bonus_habil;
        let h_total = 0;
        if (this.system.nivel > 0){
            h_total = this.system.total + bonus_hab;
        } else {
            h_total = -7 + this.system.ajuste.valor + this.system.bonus + this.system.penalidade + bonus_hab;
        }
        if (h_total < -7) h_total = -7;
        if (h_total <= 20) {
            let r = new Roll('1d20');
            await r.evaluate();
            let coluna_tab = tabela_resol.filter(b => b[0] === h_total);
            let resultado = coluna_tab[0][r.total];
            await this.habToChat(resultado, r, h_total, coluna_tab[0][0]);
        } else {
            let valor_hab = h_total % 20;
            if (valor_hab == 0) {
                let vezes = h_total / 20;
                await this.habToChat2(vezes, h_total, tabela_resol, 0);                
            } else if (valor_hab > 0) {
                let vezes = parseInt(h_total / 20);
                let sobra = h_total % 20;
                await this.habToChat2(vezes, h_total, tabela_resol, sobra);
            }
        }
    }

    async magiaToChat() {
        let itemId = `<h1 class="esconde" id="itemId" data-item-id="${this.id}">id</h1>`;
        let chatData = {
            user: game.user.id,
            flavor: `${itemId}`,
            speaker: ChatMessage.getSpeaker({
                actor: this.actor
              })
        };
        chatData.content = "<img src='"+ this.img +"' style='display: block; margin-left: auto; margin-right: auto;' /><h1 class='mediaeval rola' style='text-align: center;'>" + this.name + "</h1>" + "<h2 class='mediaeval rola' style='text-align: center'>Nível: " + this.system.nivel + "</h2>" + "<div class='mediaeval rola rola_desc'>" + this.system.efeito + "</div>";
        ChatMessage.create(chatData);
    }

    async tecnicaToChat(resultado, r, coluna_rolada) {
        let dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
        let PrintResult = "";
        let mecanica = "";
        let mec_num = parseInt(this.system.mecanica);
        switch (mec_num) {
            case 0:
                mecanica = "Bônus de FA";
                break;
            case 1:
                mecanica = "Efeito de nível";
                break;
            case 2:
                mecanica = "Rolamento de dados";
                break;
            case 3:
                mecanica = "Bônus especiais";
                break;
            case 4:
                mecanica = "Aprimoramento de Técnica";
                break;
            default:
                mecanica = "";
        }
        let pre_requisito = "";
        let pre_sim = this.system.pre_requisito.valor;
        if (pre_sim == "Sim") {
            pre_requisito = this.system.pre_requisito.tecnica;
        } else pre_requisito = this.system.pre_requisito.valor;
        let conteudo = "<img src='"+ this.img +"' style='display: block; margin-left: auto; margin-right: auto;' /><h1 class='mediaeval rola' style='text-align: center;'>" + this.name + "</h1>" + "<h2 class='mediaeval rola' style='text-align: center'>Força de Ataque: " + this.system.fa + "</h2><p class='mediaeval rola_desc'><b>Mecânica:</b> <span>" + mecanica + "</span></p><p class='mediaeval rola_desc'><b>Duração:</b> <span>" + this.system.duracao.valor + " " + this.system.duracao.tipo + "</span></p><p class='mediaeval rola_desc'><b>Teste Resistência:</b> <span>" + this.system.teste + "</p><p class='mediaeval rola_desc'><b>Restrição:</b> <span>" + this.system.restricao + "</p><p class='mediaeval rola_desc'><b>Pré-requisito:</b> <span>" + pre_requisito + "</p>" + "<div class='mediaeval rola rola_desc'>" + this.system.descricao + "</div>";
        if (resultado == "verde") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#91cf50;'>Verde - Falha</h1>";
        else if (resultado == "branco") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:white;'>Branco - Rotineiro</h1>";
        else if (resultado == "amarelo") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#ffff00;'>Amarelo - Fácil</h1>";
        else if (resultado == "laranja") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff9900;'>Laranja - Médio</h1>";
        else if (resultado == "vermelho") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff0000;'>Vermelho - Difícil</h1>";
        else if (resultado == "azul" || resultado == "roxo") PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#00a1e8;'>Azul - Muito Difícil</h1>";
        else if (resultado == "cinza") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#bfbfbf;'>Cinza - Crítico Absurdo</h1>";
        let coluna = "<h4 class='mediaeval rola'>Coluna:" + coluna_rolada + "</h4>";
        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
            dadosColoridos.dadosColoridos(resultado, r);
        }
        r.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${conteudo}${coluna}${PrintResult}`
        });
    }

    async tecnicaToChat2(vezes, total, tabela_resol, sobra) {
        let dados = [];
        let dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
        let mecanica = "";
        let mec_num = parseInt(this.system.mecanica);
        switch (mec_num) {
            case 0:
                mecanica = "Bônus de FA";
                break;
            case 1:
                mecanica = "Efeito de nível";
                break;
            case 2:
                mecanica = "Rolamento de dados";
                break;
            case 3:
                mecanica = "Bônus especiais";
                break;
            case 4:
                mecanica = "Aprimoramento de Técnica";
                break;
            default:
                mecanica = "";
        }
        let pre_requisito = "";
        let pre_sim = this.system.pre_requisito.valor;
        if (pre_sim == "Sim") {
            pre_requisito = this.system.pre_requisito.tecnica;
        } else pre_requisito = this.system.pre_requisito.valor;
        let conteudo = "<img src='"+ this.img +"' style='display: block; margin-left: auto; margin-right: auto;' /><h1 class='mediaeval rola' style='text-align: center;'>" + this.name + "</h1>" + "<h2 class='mediaeval rola' style='text-align: center'>Força de Ataque: " + this.system.fa + "</h2><p class='mediaeval rola_desc'><b>Mecânica:</b> <span>" + mecanica + "</span></p><p class='mediaeval rola_desc'><b>Duração:</b> <span>" + this.system.duracao.valor + " " + this.system.duracao.tipo + "</span></p><p class='mediaeval rola_desc'><b>Teste Resistência:</b> <span>" + this.system.teste + "</p><p class='mediaeval rola_desc'><b>Restrição:</b> <span>" + this.system.restricao + "</p><p class='mediaeval rola_desc'><b>Pré-requisito:</b> <span>" + pre_requisito + "</p>" + "<div class='mediaeval rola rola_desc'>" + this.system.descricao + "</div>";
        let melhor;
        let valor = 0;
        let m_valor = 0;
        let m_cor;
        for (let x = 0; x < vezes; x++) {
            dados[x] = new Roll('1d20');
            await dados[x].evaluate();
            let coluna_tab = tabela_resol.filter(b => b[0] === 20);
            let resultado = coluna_tab[0][dados[x].total];
            if (resultado == "roxo") resultado = "azul";
            let PrintResult = await this.evalHab(resultado);
            let color = "";
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
                    color = 'blue'
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
            let dado = new Roll('1d20');
            await dado.evaluate();
            let coluna_tab = tabela_resol.filter(b => b[0] === sobra);
            let resultado = coluna_tab[0][dado.total];
            if (resultado == 'roxo') resultado = 'azul';
            let PrintResult = await this.evalHab(resultado);
            let color = "";
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
            dadosColoridos.dadosColoridos(m_cor, melhor);
        }
        melhor.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `${conteudo}`
        });
    }

    async rollTecnica_Combate() {
        const tabela_resol = game.tagmar.tabela_resol;
        let mecanica = this.system.mecanica;
        if (mecanica == 2) { // Rolar dados
            let fa = this.system.fa;
            if (fa < -7) fa = -7;
            if (fa <= 20) {
                let r = new Roll('1d20');
                await r.evaluate();
                let coluna_tab = tabela_resol.filter(b => b[0] === fa);
                let resultado = coluna_tab[0][r.total];
                await this.tecnicaToChat(resultado, r, coluna_tab[0][0]);
            } else {
                let valor_total = fa % 20;
                if (valor_total == 0) {
                    let vezes = fa / 20;
                    await  this.tecnicaToChat2(vezes, fa, tabela_resol, 0);
                } else if (valor_total > 0) {
                    let vezes = parseInt(fa / 20);
                    await this.tecnicaToChat2(vezes, fa, tabela_resol, valor_total);
                }
            }
        } else {
            this.tecnica_combateToChat()
        }
    }

    async tecnica_combateToChat() {
        let itemId = `<h1 class="esconde" id="itemId" data-item-id="${this.id}">id</h1>`;
        let chatData = {
            user: game.user.id,
            flavor: `${itemId}`,
            speaker: ChatMessage.getSpeaker({
                actor: this.actor
              })
        };
        let mecanica = "";
        let mec_num = parseInt(this.system.mecanica);
        switch (mec_num) {
            case 0:
                mecanica = "Bônus de FA";
                break;
            case 1:
                mecanica = "Efeito de nível";
                break;
            case 2:
                mecanica = "Rolamento de dados";
                break;
            case 3:
                mecanica = "Bônus especiais";
                break;
            case 4:
                mecanica = "Aprimoramento de Técnica";
                break;
            default:
                mecanica = "";
        }
        let pre_requisito = "";
        let pre_sim = this.system.pre_requisito.valor;
        if (pre_sim == "Sim") {
            pre_requisito = this.system.pre_requisito.tecnica;
        } else pre_requisito = this.system.pre_requisito.valor;
        chatData.content = "<img src='"+ this.img +"' style='display: block; margin-left: auto; margin-right: auto;' /><h1 class='mediaeval rola' style='text-align: center;'>" + this.name + "</h1>" + "<h2 class='mediaeval rola' style='text-align: center'>Força de Ataque: " + this.system.fa + "</h2><p class='mediaeval rola_desc'><b>Mecânica:</b> <span>" + mecanica + "</span></p><p class='mediaeval rola_desc'><b>Duração:</b> <span>" + this.system.duracao.valor + " " + this.system.duracao.tipo + "</span></p><p class='mediaeval rola_desc'><b>Teste Resistência:</b> <span>" + this.system.teste + "</p><p class='mediaeval rola_desc'><b>Restrição:</b> <span>" + this.system.restricao + "</p><p class='mediaeval rola_desc'><b>Pré-requisito:</b> <span>" + pre_requisito + "</p>" + "<div class='mediaeval rola rola_desc'>" + this.system.descricao + "</div>";
        ChatMessage.create(chatData);
    }

    async combateToChat(coluna_rolada, resultado, puni_25, puni_50, puni_75, puni_100, r, municao_text, valor_tabela) {
        let dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
        let critico = false;
        let falha = false;
        const tabela_resol = game.tagmar.tabela_resol;
        let PrintResult = "";
        let dano_total = 0;
        let punicaoText = "";
        let conteudo = "<h4 class='mediaeval rola rola_desc'>Descrição: " + this.system.descricao + "</h4>";
        if (resultado == "verde") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#91cf50;'>Verde - Falha Crítica</h1>";
            critico = true;
            falha = true;
        }
        else if (resultado == "branco") PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:white;'>Branco - Errou</h1>";
        else if (resultado == "amarelo") {
            PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#ffff00;'>Amarelo - 25%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    dano_total = 0;
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                } 
                else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 0;
                }
                else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 0;
                }
                else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 0;
                }
            } else dano_total = this.system.dano.d25;
        }
        else if (resultado == "laranja") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff9900;'>Laranja - 50%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = this.system.dano.d25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 0;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 0;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 0;
                }
            } else dano_total = this.system.dano.d50;
        }
        else if (resultado == "vermelho") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff0000;'>Vermelho - 75%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = this.system.dano.d50;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = this.system.dano.d25;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 0;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 0;
                }
            } else dano_total = this.system.dano.d75;
        }
        else if (resultado == "azul") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#00a1e8;'>Azul - 100%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = this.system.dano.d75;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = this.system.dano.d50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = this.system.dano.d25;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 0;
                }
            } else dano_total = this.system.dano.d100;
        }
        else if (resultado == "roxo") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#0000ff;'>Azul Escuro - 125%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = this.system.dano.d100;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = this.system.dano.d75;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = this.system.dano.d50;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = this.system.dano.d25;
                }
            } else dano_total = this.system.dano.d125;
        }
        else if (resultado == "cinza") {
            PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#bfbfbf;'>Cinza - Crítico</h1>";
            critico = true;
        }
        let coluna = "<h4 class='mediaeval rola'>Coluna: " + coluna_rolada + "</h4>";
        let dano_text = "<h2 class='mediaeval rola rola_dano' style='text-align: center;'>Dano: " + dano_total + "</h2>";
        let table_dano = `<table style="margin-left: auto;margin-right: auto;text-align:center;" class="mediaeval"><tr><th>25%</th><th>50%</th><th>75%</th><th>100%</th></tr><tr><td>${this.system.dano.d25}</td><td>${this.system.dano.d50}</td><td>${this.system.dano.d75}</td><td>${this.system.dano.d100}</td></tr></table>`;
        if (critico) dano_text = table_dano;
        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
            dadosColoridos.dadosColoridos(resultado, r);
        }
        let button = "";
        let buttonC = "";
        if (!critico && dano_total != 0) button = `<button class="aplicarDano mediaeval" data-critico="false" data-cura="false" data-dano="${dano_total}">Aplicar Dano</button>`;
        if (!critico && dano_total != 0) buttonC = `<button class="aplicarDano mediaeval" data-critico="false" data-cura="true" data-dano="${dano_total}">Aplicar Cura EH</button>`;
        if (critico) {
            button = `<p>
                <button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d25}">Aplicar 25% Dano</button>
                <br><button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d50}">Aplicar 50% Dano</button>
                <br><button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d75}">Aplicar 75% Dano</button>
                <br><button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d100}">Aplicar 100% Dano</button>
            </p>`;
        }
        let itemId = `<h1 class="esconde" id="itemId" data-item-id="${this.id}">id</h1>`;
        await r.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `<img src="${this.img}" style="display: block; margin-left: auto; margin-right: auto;" /><h2 class="mediaeval rola" style="text-align:center;">${this.name}: ${valor_tabela} - ${this.system.tipo}</h2>${conteudo}${municao_text}${coluna}${PrintResult}${punicaoText}${dano_text}${button}${buttonC}${itemId}`
        });
        if (critico) Hooks.callAll('tagmar_Critico', coluna_rolada, tabela_resol, game.user, this.actor, this.system.tipo, falha);
        else Hooks.callAll('tagmar_combate_roll', {coluna: coluna_rolada, user: game.user, dano: dano_total, actor: this.actor});
    }

    async combateToChatPlus(coluna_rolada, resultado, puni_25, puni_50, puni_75, puni_100, r, municao_text, valor_tabela, ajusteDano) {
        let dadosColoridos = await import("/systems/"+game.system.id+"/modules/dadosColoridos.js");
        let critico = false;
        let falha = false;
        const tabela_resol = game.tagmar.tabela_resol;
        let PrintResult = "";
        let dano_total = 0;
        let punicaoText = "";
        let conteudo = "<h4 class='mediaeval rola rola_desc'>Descrição: " + this.system.descricao + "</h4>";
        if (resultado == "verde") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#91cf50;'>Verde - Falha Crítica</h1>";
            critico = true;
            falha = true;
        }
        else if (resultado == "branco") {
            PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:white;'>Branco</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = ajusteDano + 0 - 25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 0 + ajusteDano - 50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 0 + ajusteDano - 75;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 0 + ajusteDano - 100;
                }
            } else dano_total = 0 + ajusteDano;
        }
        else if (resultado == "amarelo") {
            PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#ffff00;'>Amarelo - 25%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = ajusteDano + 25 - 25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 25 + ajusteDano - 50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 25 + ajusteDano - 75;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 25 + ajusteDano - 100;
                }
            } else dano_total = 25 + ajusteDano;
        }
        else if (resultado == "laranja") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff9900;'>Laranja - 50%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = ajusteDano + 50 - 25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 50 + ajusteDano - 50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 50 + ajusteDano - 75;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 50 + ajusteDano - 100;
                }
            } else dano_total = 50 + ajusteDano;
        }
        else if (resultado == "vermelho") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#ff0000;'>Vermelho - 75%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = ajusteDano + 75 - 25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 75 + ajusteDano - 50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 75 + ajusteDano - 75;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 75 + ajusteDano - 100;
                }
            } else dano_total = 75 + ajusteDano;
        }
        else if (resultado == "azul") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#00a1e8;'>Azul - 100%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = ajusteDano + 100 - 25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 100 + ajusteDano - 50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 100 + ajusteDano - 75;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 100 + ajusteDano - 100;
                }
            } else dano_total = 100 + ajusteDano;
        }
        else if (resultado == "roxo") {
            PrintResult = "<h1 class='mediaeval rola' style='color: white; text-align:center;background-color:#0000ff;'>Azul Escuro - 125%</h1>";
            if (puni_25 || puni_50 || puni_75 || puni_100) {
                if (puni_25) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 25%</h4>";
                    dano_total = ajusteDano + 125 - 25;
                } else if (puni_50) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 50%</h4>";
                    dano_total = 125 + ajusteDano - 50;
                } else if (puni_75) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 75%</h4>";
                    dano_total = 125 + ajusteDano - 75;
                } else if (puni_100) {
                    punicaoText = "<h4 class='mediaeval rola' style='color: red; text-align: center;'>Penalidade 100%</h4>";
                    dano_total = 125 + ajusteDano - 100;
                }
            } else dano_total = 125 + ajusteDano;
        }
        else if (resultado == "cinza") {
            PrintResult = "<h1 class='mediaeval rola' style='color: black; text-align:center;background-color:#bfbfbf;'>Cinza - Crítico</h1>";
            critico = true;
        }
        let dano_novo = 0;
        switch (dano_total) {
            case 0:
                dano_novo = 0;
                break;
            case 25:
                dano_novo = this.system.dano.d25;
                break;
            case 50:
                dano_novo = this.system.dano.d50;
                break;
            case 75:
                dano_novo = this.system.dano.d75;
                break;
            case 100:
                dano_novo = this.system.dano.d100;
                break;
            case 125:
                dano_novo = this.system.dano.d125;
                break;
            case 150:
                dano_novo = this.system.dano.d150;
                break;
            case 175:
                dano_novo = this.system.dano.d175;
                break;
            case 200:
                dano_novo = this.system.dano.d200;
                break;
            case 225:
                dano_novo = this.system.dano.d225;
                break;
            case 250:
                dano_novo = this.system.dano.d250;
                break;
            case 275:
                dano_novo = this.system.dano.d275;
                break;
            case 300:
                dano_novo = this.system.dano.d300;
                break;
            default:
                let vez = dano_total / 25;
                let dif = this.system.dano.d50 - this.system.dano.d25;
                dano_novo = this.system.dano.d25 + ( (vez-1) * dif );
                break;
        }
        let coluna = "<h4 class='mediaeval rola'>Coluna: " + coluna_rolada + "</h4>";
        let ajuste_text = "<h1 class='mediaeval rola' style='text-align: center;'>AAC20: " + ajusteDano + "%</h1>";
        let dano_text = "<h1 class='mediaeval rola rola_dano' style='text-align: center;'>Dano: " + dano_novo + "</h1>";
        let table_dano = `<table style="margin-left: auto;margin-right: auto;text-align:center;" class="mediaeval"><tr><th>25%</th><th>50%</th><th>75%</th><th>100%</th></tr><tr><td>${this.system.dano.d25}</td><td>${this.system.dano.d50}</td><td>${this.system.dano.d75}</td><td>${this.system.dano.d100}</td></tr></table>`;
        if (critico) dano_text = table_dano;
        if (game.settings.get('tagmar_rpg', 'dadosColoridos')) {
            dadosColoridos.dadosColoridos(resultado, r);
        }
        let button = "";
        let buttonC = "";
        if (!critico && dano_novo != 0) button = `<button class="aplicarDano mediaeval" data-critico="false" data-cura="false" data-dano="${dano_novo}">Aplicar Dano</button>`;
        if (!critico && dano_novo != 0) buttonC = `<button class="aplicarDano mediaeval" data-critico="false" data-cura="true" data-dano="${dano_novo}">Aplicar Cura EH</button>`;
        if (critico) {
            button = `<p>
                <button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d25}">Aplicar 25% Dano</button>
                <br><button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d50}">Aplicar 50% Dano</button>
                <br><button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d75}">Aplicar 75% Dano</button>
                <br><button class="aplicarDano mediaeval" data-critico="true" data-cura="false" data-dano="${this.system.dano.d100}">Aplicar 100% Dano</button>
            </p>`;
        }
        let itemId = `<h1 class="esconde" id="itemId" data-item-id="${this.id}">id</h1>`;
        await r.toMessage({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flavor: `<img src="${this.img}" style="display: block; margin-left: auto; margin-right: auto;" /><h2 class="mediaeval rola" style="text-align:center;">${this.name}: ${valor_tabela} - ${this.system.tipo}</h2>${conteudo}${municao_text}${coluna}${PrintResult}${ajuste_text}${punicaoText}${dano_text}${button}${buttonC}${itemId}`
        });
        if (critico) Hooks.callAll('tagmar_Critico', coluna_rolada, tabela_resol, game.user, this.actor, this.system.tipo, falha);
        else Hooks.callAll('tagmar_combate_roll', {coluna: coluna_rolada, user: game.user, dano: dano_novo, actor: this.actor});
    }

    async rollCombate() {
        const tabela_resol = game.tagmar.tabela_resol;
        let municao = this.system.municao;
        let muni_usada = 0;
        if (municao > 0) {
            if (this.system.tipo == "")  muni_usada = this.system.nivel;
            else muni_usada = 1;
            municao -= muni_usada;
            if (this.system.municao != municao) await this.update({"system.municao": municao});
        }
        let municao_text = "";
        if (muni_usada >= 1) municao_text = "<h4 class='mediaeval rola'>Munição gasta: " + muni_usada + " Restam: " + municao + "</h4>";
        else municao_text = "";
        let bonus_cat = this.system.bonus;
        let bonus_ajustev = 0;
        const puni_25 = this.system.penalidade.p25;
        const puni_50 = this.system.penalidade.p50;
        const puni_75 = this.system.penalidade.p75;
        const puni_100 = this.system.penalidade.p100;
        if (bonus_cat == "AUR") bonus_ajustev = this.actor.system.atributos.AUR;
        else if (bonus_cat == "FOR") bonus_ajustev = this.actor.system.atributos.FOR;
        else if (bonus_cat == "AGI") bonus_ajustev = this.actor.system.atributos.AGI;
        else if (bonus_cat == "PER") bonus_ajustev = this.actor.system.atributos.PER; 
        let total_l = this.system.nivel + bonus_ajustev + this.system.bonus_magico + this.system.def_l;
        let total_m = this.system.nivel + bonus_ajustev + this.system.bonus_magico + this.system.def_m;
        let total_p = this.system.nivel + bonus_ajustev + this.system.bonus_magico + this.system.def_p;
        const cat_def = this.actor.system.inf_ataque.cat_def;
        let valor_tabela = 0;
        if (this.system.nivel > 0) {
            if (cat_def == "L") valor_tabela = total_l + this.actor.system.inf_ataque.bonus - this.actor.system.inf_ataque.valor_def;
            else if (cat_def == "M") valor_tabela = total_m + this.actor.system.inf_ataque.bonus - this.actor.system.inf_ataque.valor_def;
            else if (cat_def == "P") valor_tabela = total_p + this.actor.system.inf_ataque.bonus - this.actor.system.inf_ataque.valor_def;
        } else {
            valor_tabela = -7;
        }
        if (this.system.tipo == "" || this.system.tipo == "MAG") valor_tabela = total_l + this.actor.system.inf_ataque.bonus; // Magia de Ataque
        if (valor_tabela < -7) valor_tabela = -7; // Abaixo da Tabela
        let r = new Roll("1d20");
        await r.evaluate();
        let Dresult = r.total;
        if (valor_tabela <= 20) {
            let coluna_tab = tabela_resol.filter(b => b[0] === valor_tabela);
            let resultado = coluna_tab[0][Dresult];
            await this.combateToChat(coluna_tab[0][0], resultado, puni_25, puni_50, puni_75, puni_100, r, municao_text, valor_tabela);
        } else {
            let coluna_t = valor_tabela % 20;
            if (coluna_t == 0) coluna_t = 20;
            const ajusteDano = parseInt((valor_tabela-coluna_t)/20) * 50;
            let coluna_tab = tabela_resol.filter(b => b[0] === coluna_t);
            let resultado = coluna_tab[0][Dresult];
            await this.combateToChatPlus(coluna_tab[0][0], resultado, puni_25, puni_50, puni_75, puni_100, r, municao_text, valor_tabela, ajusteDano);
        }
    }

    async rollTagmarItem() {
        Hooks.callAll('tagmar_itemRoll', this, game.user);
        if (this.type === "Habilidade") {
            this.rollHabilidade();
        } else if (this.type === "Magia") {
            this.magiaToChat();
        } else if (this.type === "Combate") {
            this.rollCombate();
        } else if (this.type == "Tecnica_Combate") {
            this.rollTecnica_Combate();
        }
    }

}