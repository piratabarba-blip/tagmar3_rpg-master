# Veículos, máquinas e armas de guerra — adaptação extraoficial

Esta é uma adaptação **extraoficial**, disponível nos sistemas XXX e Oficial. Não estabelece valores oficiais de embarcações ou armas e não modifica os compêndios existentes.

## Criar uma estrutura

1. Em **Atores → Criar**, escolha **Veículo / Máquina**.
2. Dê um nome, clique no retrato para escolher uma imagem ou vídeo e configure o token pelo botão nativo da ficha.
3. Preencha **ABS atual e máxima**, **ARM** e **VB**. Os valores começam em zero para o mestre definir o porte e o balanceamento.
4. Em **Básico**, escolha embarcação, carroça, máquina de guerra ou outro veículo. Informe propulsão, defesa, iniciativa, tripulação e passageiros.
5. Em **Manobra**, escolha total manual (somente o mestre pode rolar assim) ou vincule um personagem/PNJ e uma habilidade. O vínculo consulta o total atual, incluindo bônus e os efeitos de atributos usados pela ficha correspondente. O jogador precisa controlar o veículo e o operador.

O ajuste da máquina altera colunas do teste; não altera a VB. O mestre determina a dificuldade e interpreta a cor na tabela de resolução do Tagmar. A VB usa a mesma convenção das fichas existentes e não é calculada automaticamente pela quantidade de animais ou pelo vento.

## ABS e ARM

**Dano à ABS = máximo entre 0 e dano recebido − ARM.**

Exemplo ilustrativo: com ARM 10, um impacto de 8 não causa perda de ABS; um impacto de 30 retira 20 ABS. A ARM não se gasta. ABS zero impede manobras e disparos. O mestre descreve o colapso, naufrágio ou imobilização; não há animação nem exclusão automática do token.

Selecione o token e aplique dano por um cartão do sistema. **Reparar** recupera ABS até o máximo; botões de cura de EF/EH não reparam a estrutura. A barra nativa do token aponta para ABS. Com Bar Brawl e criação automática de barras habilitada, os novos tokens recebem uma barra de ABS.

## Montar e operar uma arma

1. Na aba **Combate**, clique em **Add**, ou arraste um item desse tipo para a ficha.
2. Preencha dano de 25%, ajustes contra L/M/P, ajuste geral, alcance e peso. Os demais percentuais de dano são calculados como nas armas do sistema.
3. Na aba **Combate** do veículo, abaixo da arma, escolha **Personagem vinculado**. Na própria ficha, digite o nome e selecione o personagem nos resultados; faça o mesmo na busca de habilidade e clique em **Vincular**. Use **+ Adicionar personagem vinculado** para cadastrar outros operadores. Cada vínculo mostra o nível cadastrado e o total atual da habilidade. Clique no nome cadastrado para usá-lo; o lápis permite editar a habilidade de cada vínculo. Na ficha do item, informe a equipe mínima, munição e recarga de referência. A tripulação disponível vem do campo **Atual** no veículo.
4. Na própria aba **Combate** do veículo, configure a defesa do oponente e o bônus/penalidade. **Usar alvo** copia a defesa de um único alvo marcado. Cada arma mostra sua origem e seus operadores logo abaixo da linha.
5. Clique no **nome da arma** para rolar imediatamente, sem abrir outra janela. O ataque reutiliza a tabela, os cartões e o cálculo acima da coluna 20 do sistema. Cada disparo consome uma munição quando o controle estiver ativo, mesmo se errar.

Falta de munição/tripulação, arma desativada e estrutura sem ABS impedem o disparo. O alcance é informativo: o mestre confere distância e ajustes. A quantidade de personagens vinculados não define a tripulação: os vínculos permitem escolher quem fornece o total da habilidade. A distribuição das pessoas entre armas é controlada pela mesa, sem reserva automática.

**Recarga** informa apenas a quantidade de rodadas de referência. Não existe botão de avançar rodada, contador ou bloqueio de disparos por recarga; a mesa acompanha isso no rastreador de combate. Contadores antigos são ignorados. Evite vários usuários disparando a mesma arma simultaneamente.

Em **Manobra**, os vínculos funcionam da mesma forma, diretamente na ficha. Cada personagem guarda sua própria habilidade; antes de atacar ou testar uma manobra, clique no nome de quem fará o teste. Usa-se o total atual de apenas um personagem, sem somar os demais. O jogador precisa controlar a estrutura e o personagem escolhido. O **×** ao lado do nome retira só a associação; não altera a ficha do personagem. Vínculos únicos de versões anteriores continuam disponíveis.

**Total manual (mestre):** a origem da manobra e a origem de cada arma são independentes. O total manual do veículo serve para suas manobras; a origem e o total manual de cada arma ficam diretamente abaixo dela na aba **Combate** do veículo. O modo manual não exige um operador vinculado. Os ajustes ficam salvos para os próximos ataques. Jogadores continuam precisando de um personagem autorizado.

Críticos e falhas críticas aparecem na tabela; o mestre decide consequências especiais. Armas de guerra não disparam automaticamente a tabela de ferimentos anatômicos. Uma balista ou catapulta independente pode ser criada como uma Máquina de guerra com sua arma montada.

## Pertences, biografia, resistências e permissões

A ficha usa as abas **Básico, Combate, Pertences e Biografia**. Em Pertences, use **Add** (Pertence ou Transporte) ou arraste itens; os controles da tabela permitem editar/remover. Biografia usa o editor nativo do Foundry e preserva o conteúdo das antigas notas.

- A carga soma os pesos das armas, pertences (peso × quantidade) e carga adicional. Pesos ausentes contam como zero. Excesso é informado, sem penalidade automática.
- Resistências física e mágica são opcionais, com valores definidos pelo mestre e a resolução existente no sistema. Não concedem imunidades automáticas.
- Compartilhe a ficha pelas permissões nativas do Foundry. Controlar o veículo não concede controle sobre outros personagens.
- Imagens, token e propriedade do ator seguem o comportamento nativo das outras fichas.

## Validação

Testes automatizados cobrem dano/reparo, múltiplos vínculos, total atual do operador escolhido, efeitos de atributos, permissões, munição, tripulação, contadores antigos ignorados, críticos e integração com as rolagens existentes. As fichas foram renderizadas em navegador de teste com os estilos do sistema, incluindo busca entre 500 personagens. O mantenedor aprovou a interface e autorizou esta publicação após testar a prévia local.

Não há integração com o módulo de viagens, vento ou calendário nesta versão. Combate em massa fica para uma etapa posterior.

## Padrão visual e interação

Seguir as fichas existentes de PNJ, Personagem e Combate: cabeçalho ocupando a largura da ficha, mesmas molduras e fontes, campos compactos, tabelas com linhas alternadas. Atacar clicando no nome da arma; arrastar a linha permite criar macro com o fluxo nativo. Pertences usa quantidade, peso unitário, total, busca e editar/remover. O controle Mover usa transportes auxiliares e conserva o peso total a bordo. A Biografia mantém o conteúdo existente.
