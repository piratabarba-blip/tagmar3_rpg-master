# Prévia de testes — Combate em Grande Escala

**Tagmar XXX · 2.7.0-v14.1-rc.56-beta.1 · Foundry VTT 14.369**

Esta é uma prévia extraoficial para validação pela comunidade. Ela usa o mesmo ID do sistema correspondente e substitui sua instalação; não instala um terceiro sistema. Faça backup do mundo e use uma cópia para os testes. Não há migração ou alteração automática dos compêndios existentes.

## Instalação

1. Na configuração inicial do Foundry, abra **Sistemas de jogo → Instalar sistema**.
2. Cole no campo **URL do manifesto**:

```text
https://github.com/piratabarba-blip/tagmar3_rpg-master/releases/download/v2.7.0-v14.1-rc.56-beta.1/system.json
```

3. Instale a prévia e abra um mundo de testes desse sistema. O manifesto desta prévia aponta para esta versão específica; futuras prévias terão novos links.
4. Crie um ator **Tropa (Grande Escala)** ou importe um dos dois exemplos do compêndio **Combate em Grande Escala — Tropas (Extraoficial)**.

## O que testar

- Valores de EF/ABS, equipamentos, liderança e colunas L/M/P; confira o exemplo Verrogari com a biografia.
- Comandantes e especialistas vinculados: busca por personagem e habilidade e troca do vínculo ativo.
- Dois atores de tropa diferentes no mapa: selecione o atacante, marque o adversário como alvo e clique no ataque. Confira a defesa e a resistência especial usadas.
- Registre os danos antes de resolvê-los, preservando a ordem de combate do suplemento. Teste também o botão de aplicação direta na etapa de resolução.
- Confira as perdas no chat e sobre o token, a derrota com EF zero e a recuperação no monitor de combate. Teste a visão de um jogador conectado.
- Moral, aparatos, fortificações, reparos e resgate de feridos.

Para relatar problemas, informe versão do Foundry e do sistema, valores das duas tropas, passos para reproduzir, resultado esperado e observado. Inclua uma captura do erro se houver. Os cálculos e as escolhas feitas diante das divergências do livro estão no [guia completo](combate-em-grande-escala.md).

As verificações automatizadas passaram; os testes em mesas reais ainda estão em andamento. A adaptação se baseia no suplemento de Fábio Carvalho Magalhães (19/02/2024), com atribuição e licença descritas no guia.
