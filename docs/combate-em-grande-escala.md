# Tropa — Combate em Grande Escala

Prévia para Foundry VTT 14.369. Novo tipo de ator **Tropa (Grande Escala)**, separado de personagens, PNJs e veículos. Compêndio: **Combate em Grande Escala — Tropas (Extraoficial)**.

## Fonte e atribuição

Baseado em **Tagmar Suplemento — Combate em Grande Escala**, de **Fábio Carvalho Magalhães**, publicado em **19/02/2024**, 40 páginas no PDF. As referências abaixo usam a numeração impressa do livro (duas páginas a menos que a posição no PDF).

Regras e material derivado são disponibilizados sob **Creative Commons Atribuição-NãoComercial-CompartilhaIgual 3.0 Brasil (CC BY-NC-SA 3.0 BR)**, conforme a declaração de licenciamento da obra. [Licença](https://creativecommons.org/licenses/by-nc-sa/3.0/br/). Adaptação digital para Tagmar Foundry, por Vinicius Fernandez e colaboradores do sistema. É uma adaptação extraoficial; sua presença no sistema Oficial não a torna regra oficial do Projeto Tagmar. O compêndio de consulta inclui o PDF original completo, sem alterações e com todos os créditos; suas imagens não são extraídas para tokens ou retratos.

## Teste rápido

1. Importe **Tropa Verrogari — Exemplo do suplemento** do compêndio ou crie um ator do tipo **Tropa (Grande Escala)**.
2. Em Básico, informe estágio médio, EF inicial/atual, equipamentos, liderança e distribuição L/M/P. Iniciar batalha recompõe EF/ABS e aparatos, mediante confirmação.
3. O comandante e o especialista podem usar totais manuais ou personagens vinculados. A busca de personagens e habilidades fica na própria ficha. Só o vínculo selecionado fornece seu total; não se somam os oficiais.
4. Selecione o token atacante e marque uma tropa adversária como alvo. Na aba Combate, a rolagem consulta a defesa e a resistência especial desse alvo; sem alvo, usa os campos manuais. Clique em **Ataque da tropa** ou no nome do aparato. Use a moral para comparar com a dificuldade do livro.
5. Com um alvo e um resultado único, o mestre ativo registra o dano automaticamente; o botão **Registrar para a resolução** continua no chat. O alvo original fica guardado no cartão; em ataques manuais sem alvo, selecione os tokens atingidos. O registro não reduz os recursos imediatamente. Também existe **Aplicar dano** para uso quando chegar a etapa de resolução. Nos críticos, escolha o percentual adequado à resolução do crítico; não há ferimentos anatômicos automáticos.
6. Terminadas todas as rolagens, use **Aplicar danos registrados** nas tropas. Ataques estruturais são resolvidos antes dos gerais. Os danos gerais consomem as proteções na ordem do livro; críticos de tropa ignoram absorções. Não aplique antecipadamente, pois a EF altera o dano da tropa.
7. Nos preparativos da próxima rodada, **Restaurar ABS** recompõe só a absorção dos equipamentos e limpa a referência de perdas da rodada. Faça o resgate necessário antes disso. Aparatos têm reparo separado; muros e armadilhas são editados pelo mestre.

## Cálculos

- EF representa combatentes equivalentes. A calculadora de criaturas aplica `ceil((EF + EH + ABS + bônus de categoria) / 50) × quantidade`, com +25 para M e +50 para P. O mestre incorpora o resultado à EF inicial; a calculadora não soma silenciosamente.
- ABS dos equipamentos: zero / `ceil(EF atual / 7)` / `ceil(EF atual / 5)` / `ceil(EF atual / 3)`.
- Defesa: L0, L1, M0 ou P0, acrescida do estágio. Pontos L/M/P: 2, 4, 7 ou 10; custos 1, 2 e 3 por ponto.
- Liderança efetiva: básica + bônus dos notáveis, limitada ao dobro da básica. Moral: estágio + liderança efetiva + ajuste de mesa.
- Ataque: estágio + metade da liderança efetiva + ajuste L/M/P. Especialista substitui o comandante nos aparatos. Bônus de campo é acrescentado após vantagem de ataque; a defesa do alvo é subtraída na rolagem. Usa a tabela nativa e o tratamento AAC20 do sistema.
- Dano principal de 25%: `ceil(EF atual / 10)`. Demais danos são múltiplos desse valor, conforme texto e exemplo das pp. 11 e 15.
- Aparatos: 50/100/150 ABS por unidade, mais 50 quando reforçados. Dano de 100% limitado à ABS atual dos aparatos; percentuais arredondados para cima.
- Iniciativa do exército: 1d10 + liderança do general + bônus informado de Voz de Comando −4 por tropa com aparatos. Uma rolagem por exército, compartilhada entre suas tropas. A ficha não reordena automaticamente o monitor; o livro usa ordem crescente nos preparativos e fase posterior para cavalaria.

## Divergências do PDF e escolhas da prévia

- O texto dá 25% = EF/10 arredondada para cima e multiplica esse resultado no exemplo de 465 combatentes (47/94/141/188). O Anexo II tem aproximações e percentuais calculados de outra forma. Esta prévia segue o texto/exemplo, calculando a EF exata, sem buscar uma faixa na tabela aproximada.
- A absorção é arredondada para cima, como na tabela do Anexo II. Um exemplo narrativo usa 28 para 200/7, enquanto a tabela usa 29; adotamos 29.
- Metade da liderança/habilidade é arredondada para baixo. O livro não esclarece todos os casos ímpares. Os totais manuais e ajustes permitem conferir com a mesa.
- O bônus dos notáveis é informado como total pelo mestre. A p. 10 dá +3 para um PJ de estágio 5, mas também dá +15 para cinco PJs de estágio 3, uma soma incompatível com metade dos estágios. A ajuda sugere somar as metades arredondadas para cima; não implementamos esse exemplo divergente como fórmula.
- A p. 13 permite notáveis também para o especialista, mas o exemplo da p. 16 não os inclui. Por isso o especialista tem seu próprio campo de bônus, inicialmente zero; o exemplo reproduz 12/11/9 e permite que a mesa acrescente o bônus quando aplicável.
- Apoio é descrito como mais de 1/3 na tipagem e mais da metade em outra seção. O mestre marca os tipos; não classificamos automaticamente a tropa por composição.

## Controle da mesa

Terreno, emboscada, ocultação, apoio, motim, tempo de ações, recursos para reparos e fortificações compartilhadas dependem da situação narrativa. Use os campos e as dicas da ficha. Ajuste de dano é dado em pontos percentuais (passos de 25); resistência especial reduz o resultado à metade se o atacante não tiver ataque especial. Um único Uso de alvo copia defesa e resistência especial, mas não decide posicionamento, terreno ou quem está defendendo.

A ficha mantém a ordem dos preparativos, relógio e ações ocupadas sob controle manual. Não altera as regras do combate individual. A recuperação por resgate é sugerida no chat e confirmada pelo mestre na ficha. Os registros de dano são editáveis antes de aplicar; o mesmo ataque de chat não é registrado duas vezes na mesma tropa, inclusive após resolvido (histórico dos últimos 500 registros).

O compêndio contém um modelo editável e o exemplo de 465 combatentes do livro. Não contém personagens ou dados dos mundos do usuário.

## Alvo e mensagens de dano

Marque uma tropa inimiga como alvo. A opção padrão do sistema de preenchimento por alvo atualiza os campos de combate; ao clicar no ataque, a defesa e a resistência especial são consultadas novamente. Com mais de um alvo, faça uma rolagem separada para cada adversária. Sem alvo marcado, continuam disponíveis os valores manuais.

O cartão guarda o token mirado: trocar a seleção depois não muda o destinatário. O mestre pode usar **Aplicar dano** no cartão quando chegar a resolução ou **Registrar para a resolução** e resolver os ataques em conjunto pela ficha. O mesmo ataque não é aplicado duas vezes. Se o alvo original tiver sido excluído, o botão avisa em vez de atingir outro token.

Ao aplicar, aparecem perdas de EF, ABS e proteções sobre os tokens visíveis da tropa, nos clientes conectados à cena. O chat informa se a tropa continua em combate ou foi derrotada. EF zero marca derrota; recuperar EF também retira a derrota do monitor. O controle da ordem das etapas continua com a mesa.

## Livro e ajudas na ficha

O botão **Livro / guia** abre o compêndio **Combate em Grande Escala — Livro e Guia (Extraoficial)**: sete páginas de orientação e uma página com o PDF completo. Os campos (?) explicam a montagem; quadros de composição, comando, contingente e grupos de armas separam os valores editáveis dos calculados. A Biografia mantém suas anotações separadas das instruções.

## Adicionar, editar e excluir aparatos

Na aba Combate, use **Adicionar aparato** para cadastrar um conjunto. O lápis leva aos campos de nome, porte, quantidade e ABS; a lixeira pede confirmação e remove o conjunto, permitindo adicionar outro. O ataque básico pertence à própria tropa e permanece disponível.

Arraste uma **Arma de Guerra** para a área de Combate ou para a linha dos aparatos para usar seu nome e imagem. Os valores coletivos continuam sendo os desta ficha: o vínculo não importa o dano ou a munição da arma individual. A imagem acompanha a origem ao reabrir a ficha; se o item deixar de existir, conserva a imagem salva. O ícone de restaurar retira apenas a imagem vinculada.

## Batalha guiada

1. Coloque os tokens de Tropa no monitor de combate. O encontro deve conter somente tropas, com uma ficha independente por unidade. Preencha **Exército / lado** de cada tropa; são necessários dois lados com tropas vivas.
2. Abra **Batalha em massa** na aba Combate da ficha ou no monitor. O mestre ativo informa Liderança do general e bônus de Voz de Comando por exército e inicia a condução. A penalidade por tropas com aparatos é contada pelo encontro.
3. Na preparação, a ABS dos equipamentos é restaurada conforme a EF atual, sem reparar muros ou aparatos. Contadores de ocupação diminuem uma vez. As perdas anteriores permanecem disponíveis para resgate.
4. As tropas comuns decidem em ordem crescente de iniciativa por exército; depois, a cavalaria. O proprietário escolhe a ação e os alvos e clica **Salvar decisão**. O mestre avança pelo painel ou pelo controle de próximo turno do monitor.
5. Confira posições, terreno, armadilhas, ações ocupadas, moral e ações especiais nas fichas. Os alvos escolhidos são a declaração da mesa: o programa não detecta hexágonos compartilhados nem calcula movimento. Fortificar e reparar exigem conferência e aplicação pela ficha; escolher o nome da ação não concede esses efeitos sozinho. Para resgatar, salve a ação e use a confirmação de posição no painel.
6. O painel apresenta os ataques extras e depois os ataques principais, incluindo a resposta de cada defensora. Clique **Rolar ataque**. Defesa e alvo são consultados diretamente; o mestre ativo registra os danos sem reduzir EF/ABS. Nos críticos, escolha o resultado no painel ou pelo botão do chat. É possível passar um ataque explicitamente.
7. Confira os apoios. O painel registra o dano de apoio mediante confirmação do mestre, quando a tropa possui Apoio, está fora dos confrontos declarados e a aliada causou dano. Confirme adjacência e demais condições do livro no mapa; casos especiais podem ser registrados manualmente.
8. Na Resolução, confira o resumo e confirme a aplicação. Danos estruturais precedem os gerais; perdas e derrotas usam os avisos já existentes. Só depois comece a próxima rodada.

O encontro guarda a etapa, escolhas e registros. Reabrir o painel retoma o fluxo; registros usam identificadores para evitar duplicação. Se uma operação falhar, confira o aviso e tente novamente. Não é permitido voltar etapas como se os danos fossem desfeitos: corrija os valores nas fichas ou encerre o modo guiado para reorganizar. Mudanças nos participantes exigem encerrar e reorganizar o modo.

O modo guiado é optativo e depende de um mestre ativo conectado. Outros encontros continuam com o funcionamento normal. O avanço de etapas não representa passagem automática de tempo no calendário. Fluxo validado pelo mantenedor na prévia local e por testes automatizados antes da publicação.

## Recursos e registro automático

EF atual/inicial e ABS atual/calculada ficam abaixo do nome, visíveis em todas as abas. A calculadora e os quadros de ajuda preservam seu estado aberto ou fechado enquanto a ficha permanece aberta.

Ataques diretos com um único alvo e um único resultado de dano são registrados automaticamente pelo mestre ativo conectado. Nos críticos, o mestre escolhe o percentual; sem alvo, usa o registro manual do chat. O alvo é o token marcado no momento da rolagem. Registrar não reduz EF nem ABS: aplique os danos na resolução.

O botão **Registrar para a resolução** permanece no chat, inclusive no modo guiado. Ele usa o mesmo registro da automação e não duplica o dano. Na batalha guiada, respeita a etapa e o resultado já escolhido; cartões de rodadas anteriores não reabrem ataques.

## Recuperação após a resolução

O painel abre o resumo de recuperação ao encerrar a resolução coletiva: perdas de EF por tropa, ABS atual e a reserva prevista para a próxima rodada. Não cura imediatamente.

Conforme os Preparativos, item 1.b (p. 19 do suplemento), os equipamentos restauram a ABS com base na EF atual ao iniciar a rodada seguinte. Aparatos e muralhas exigem ações e recursos; armadilhas destruídas não se restauram. A automação não concede reparos gratuitos.

**Resgatar feridos** (p. 23) é uma ação dos preparativos seguintes. Salve essa ação, confirme com o mestre que a tropa permanece no hexágono do combate anterior e role no painel. A coluna é o estágio da tropa; o percentual recupera parte da EF perdida na última rodada, limitado à EF inicial. A tentativa ocupa uma rodada, mesmo sem recuperar EF. A restauração da ABS já ocorreu antes da ação e não é repetida após a cura.

O resultado e a recuperação ficam registrados para impedir nova cura ao repetir o clique ou reabrir o painel. Críticos continuam exigindo escolha de percentual pelo mestre, como na rolagem manual anterior; o trecho de resgate não detalha um efeito crítico próprio. Tropas derrotadas exigem avaliação do mestre sobre sobreviventes e não fazem resgate automático de si mesmas. Fora do modo guiado, as ações manuais da ficha continuam disponíveis.
