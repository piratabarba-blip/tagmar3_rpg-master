/*Classe para configurar opções do sistema*/
export const SystemSettings = function() {

    game.settings.register("tagmar_rpg", "sheetTemplate", {
        name: "Ficha",
        hint: "Opção de imagem de fundo da ficha, padrão ou fundo do livro",
        scope: "client",
        config: true,
        default: "tagmar3",
        type: String,
        choices: {
          "base": "Sem Imagem (padrão)",
          "tagmar3": "Borda Dos Livros Tagmar 3.0",
          "tagmar3pap": "Borda Dos Livros Tagmar 3.0 + Papiros (Licinio Souza)",
          "tagmar3barda": "Borda Dos Livros Tagmar 3.0 + Barda - Meio-Elfa (Antomio Jironimo Bizerril Neto)",
          "tagmar3bardo": "Borda Dos Livros Tagmar 3.0 + Bardo - Meio-Elfo (Claudio Souza)",
          "tagmar3anao": "Borda Dos Livros Tagmar 3.0 + Guerreiro - Anão (Sergio Artigas)",
          "tagmar3gana": "Borda Dos Livros Tagmar 3.0 + Guerreira - Anã (Berbert)",
          "tagmar3ghuma": "Borda Dos Livros Tagmar 3.0 + Guerreira - Humana  (Jorge Paiva)",
          "tagmar3ghumk": "Borda Dos Livros Tagmar 3.0 + Guerreira - Humana (Jorge Kenko)",
          "tagmar3lhuma": "Borda Dos Livros Tagmar 3.0 + Ladina Humana (Licinio Souza)",
          "tagmar3lhum": "Borda Dos Livros Tagmar 3.0 + Ladino - Humano (Luiz Berbert)",
          "tagmar3lpeqa": "Borda Dos Livros Tagmar 3.0 + Ladina Pequenina (Licinio Souza)",
          "tagmar3lpeq": "Borda Dos Livros Tagmar 3.0 + Ladino - Pequenino (Antomio Jironimo Bizerril Neto)",
          "tagmar3melfa": "Borda Dos Livros Tagmar 3.0 + Maga - Elfa (Luis Berbert)",
          "tagmar3melfo": "Borda Dos Livros Tagmar 3.0 + Mago - Elfo (Antomio Jironimo Bizerril Neto)",
          "tagmar3mhuma": "Borda Dos Livros Tagmar 3.0 + Maga - Humana (Antomio Jironimo Bizerril Neto)",
          "tagmar3relf": "Borda Dos Livros Tagmar 3.0 + Rastreador Elfo (Sergio Artigas)",
          "tagmar3rhuma": "Borda Dos Livros Tagmar 3.0 + Rastreadora Humana (Sergio Artigas)",
          "tagmar3shum": "Borda Dos Livros Tagmar 3.0 + Sacerdote Humano (Luis Berbert)",
          "tagmar3shumv": "Borda Dos Livros Tagmar 3.0 + Sacerdote Humano Velho (Luis Berbert)",
          "tagmar3selfa": "Borda Dos Livros Tagmar 3.0 + Sacerdotisa Elfa Dourada (Licinio Souza)",
          "tagmar3shum1": "Borda Dos Livros Tagmar 3.0 + Sacerdotiza - Humana (Marlon Souza)",
          "tagmar3shum2": "Borda Dos Livros Tagmar 3.0 + Sacerdotiza Humana (Sergio Artigas)"
        }
      });
      game.settings.register("tagmar_rpg", "autoBars", {
        name: "Barras automaticas (Bar Brawl)",
        hint: "Opção para criar barras automaticamente ao criar um token.(Nescessário módulo Bar Brawl)",
        scope: "world",
        config: true,
        default: "barra_both",
        type: String,
        choices: {
          "no": "Não criar barras automaticamente.",
          "barra_pers": "Criar barras para tokens de Personagem.",
          "barra_npc": "Criar barras para tokens de NPC.",
          "barra_both": "Criar barras para tokens de Personagem e NPC."
        }
      });
      game.settings.register("tagmar_rpg", "autoTarget", {
        name: "Setar Def. Oponente ao marcar target",
        hint: "Com o token controlado selecionado, marcar target no token que deseja atacar.",
        scope: "world",
        config: true,
        default: "yes",
        type: String,
        choices: {
          "yes": "Setar Def. Oponente automaticamente.",
          "no": "Desativar essa opção."
        }
      });
      game.settings.register('tagmar_rpg', 'fonteMsg', {
        name: 'Tamanho da fonte do chat',
        hint: 'Porcentagem do tamanho original (100%)',
        scope: 'client',
        config: true,
        default: 100,
        type: Number,
        onChange: () => {location.reload();}
      });
      game.settings.register('tagmar_rpg', 'ajusteManual', {
        name: 'Modificar ajuste manualmente',
        hint: 'Quando ativado, deixa de calcular os valores de ajuste da ficha de Personagem',
        scope: 'world',
        config: true,
        default: false,
        type: Boolean
      });
      game.settings.register('tagmar_rpg', 'popOutCombat', {
        name: 'PopOut TurnOrder automático',
        hint: 'Quando um combate começa, Turn Order abre em popOut.',
        scope: 'client',
        config: true,
        default: true,
        type: Boolean
      });
      game.settings.register('tagmar_rpg', 'dadosColoridos', {
        name: 'Dados coloridos (Dice so nice)',
        hint: 'Dados 3d na cor do resultado.',
        scope: 'client',
        config: true,
        default: true,
        type: Boolean
      });
}