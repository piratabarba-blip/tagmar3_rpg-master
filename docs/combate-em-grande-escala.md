# Tropa — Combate em Grande Escala

Prévia para Foundry VTT 14.369. Novo tipo de ator **Tropa (Grande Escala)**, separado de personagens, PNJs e veículos. Compêndio: **Combate em Grande Escala — Tropas (Extraoficial)**.

## Fonte e atribuição

Baseado em **Tagmar Suplemento — Combate em Grande Escala**, de **Fábio Carvalho Magalhães**, publicado em **19/02/2024**, 40 páginas no PDF. As referências abaixo usam a numeração impressa do livro (duas páginas a menos que a posição no PDF).

Regras e material derivado são disponibilizados sob **Creative Commons Atribuição-NãoComercial-CompartilhaIgual 3.0 Brasil (CC BY-NC-SA 3.0 BR)**, conforme a declaração de licenciamento da obra. [Licença](https://creativecommons.org/licenses/by-nc-sa/3.0/br/). Adaptação digital para Tagmar Foundry, por Vinicius Fernandez e colaboradores do sistema. É uma adaptação extraoficial; sua presença no sistema Oficial não a torna regra oficial do Projeto Tagmar. Não reproduzimos as ilustrações do suplemento.

## Teste rápido

1. Importe **Tropa Verrogari — Exemplo do suplemento** do compêndio ou crie um ator do tipo **Tropa (Grande Escala)**.
2. Em Básico, informe estágio médio, EF inicial/atual, equipamentos, liderança e distribuição L/M/P. Iniciar batalha recompõe EF/ABS e aparatos, mediante confirmação.
3. O comandante e o especialista podem usar totais manuais ou personagens vinculados. A busca de personagens e habilidades fica na própria ficha. Só o vínculo selecionado fornece seu total; não se somam os oficiais.
4. Selecione o token atacante e marque uma tropa adversária como alvo. Na aba Combate, a rolagem consulta a defesa e a resistência especial desse alvo; sem alvo, usa os campos manuais. Clique em **Ataque da tropa** ou no nome do aparato. Use a moral para comparar com a dificuldade do livro.
5. Depois da rolagem, o mestre usa **Registrar para a resolução** no chat. O alvo original fica guardado no cartão; em ataques manuais sem alvo, selecione os tokens atingidos. O registro não reduz os recursos imediatamente. Também existe **Aplicar dano** para uso quando chegar a etapa de resolução. Nos críticos, escolha o percentual adequado à resolução do crítico; não há ferimentos anatômicos automáticos.
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
