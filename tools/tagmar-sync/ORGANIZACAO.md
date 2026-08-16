# Organização do compêndio revisado

O compêndio clássico é a referência estrutural. Cada conversor deve preservar a hierarquia aplicável e só criar documentos dentro da categoria correta.

## Estrutura principal

1. Raças
2. Profissões
3. Habilidades
   - Profissional
   - Manobra
   - Conhecimento
   - Subterfúgio
   - Influência
   - Geral
4. Combate
   - Armas de Técnica de Combate
   - Armas Naturais
   - Grupos de armas (`CD`, `CI`, `CL`, `CLD`, `CmE`, `CpM`, `CmM`, `EL`, `EM`, `EP`, `PmA`, `PmL`, `PP`, `PpA`, `CpE`, `PpB`)
5. Defesa
   - Elmos
   - Escudos
   - Armaduras
6. Técnicas de Combate
   - Básicas e divisões por profissão/especialização conforme a edição revisada
7. Magias
   - Mago → Básica e Colégios
   - Sacerdote → Básica e Ordens
   - Rastreador → Básica e Trilhas
   - Bardo → Básica e Confrarias
   - A lista de aquisição oficial determina a pasta e o custo de cada documento
   - A mesma magia pode aparecer em mais de uma tradição, preservando o custo de cada lista
8. Magias Ancestrais
9. Magias Perdidas
10. Pertences e Afins
   - Categorias equivalentes às do compêndio clássico

Criaturas e arquétipos permanecem fora da primeira etapa.

## Suplementos oficiais

O compêndio clássico é referência de estrutura e comportamento, mas não limita o conteúdo novo. Materiais oficiais como **Terras Selvagens** possuem raças, profissões, técnicas e magias que não existem no núcleo clássico.

Esses documentos serão sincronizados em packs próprios para manter clara a origem:

- `Criando Fichas — Edição Revisada`: regras e opções do núcleo oficial revisado.
- `Terras Selvagens — Edição Revisada`: raças, profissões, técnicas, ritos, feitiços e magias do suplemento.
- Outros suplementos oficiais: packs separados quando possuírem volume ou estrutura próprios.

Dentro de cada pack suplementar, a hierarquia seguirá a mesma lógica do núcleo: Raças, Profissões, Habilidades, Combate, Defesa, Técnicas, Magias e Pertences, contendo apenas as categorias existentes naquele suplemento.

Documentos com nomes iguais não serão mesclados apenas pelo nome. O ID estável também considerará edição, origem, categoria e tradição mágica, evitando substituir acidentalmente uma opção do núcleo por outra de suplemento.

## Regras do gerador

- Nenhum item pode ficar diretamente na raiz quando existe categoria no clássico.
- IDs das pastas novas são determinísticos.
- Nome, cor, ordem e relação pai/filho são copiados do clássico quando aplicáveis.
- O rótulo exibido pode conter acentos; o valor mecânico interno deve manter o formato esperado pelo código.
- Uma categoria só é publicada depois de validar dados, organização e comportamento na ficha.
- A página oficial de origem e o suplemento devem ficar registrados em todos os documentos sincronizados.

## Automação futura das magias

Nesta primeira conversão, as magias preservam a apresentação e a mecânica clássica de custo, nível, Karma e total. A automação dos efeitos será feita junto da implementação de Combate.

- Cada nível descrito na página oficial deve ser tratado individualmente.
- Magias ofensivas, como **Raio Elétrico**, devem informar e aplicar o dano correto do nível usado.
- Magias de cura devem informar e aplicar a recuperação correta do nível usado.
- Proteções, resistências, durações e demais efeitos não devem ser inferidos apenas pelo nome da magia.
- A implementação deve usar as regras oficiais e o comportamento clássico como especificação, sem inventar automações ausentes.
- A automação só será publicada depois de testes separados de dano, cura, Karma, resistência e escolha de nível.

## Efeitos criados pelos jogadores

Os efeitos gerais não serão publicados como uma lista automática no compêndio revisado. O próprio jogador cria, configura e ativa o efeito na ficha, usando o atributo, a operação e o valor adequados à situação da mesa.

- O gerador não deve presumir modificadores a partir apenas do nome de uma condição.
- Condições narrativas e penalidades circunstanciais permanecem sob controle da mesa.
- A mecânica atual de efeitos da ficha deve ser preservada.
- Efeitos específicos de magias só poderão ser automatizados futuramente quando cada nível possuir uma regra oficial objetiva e tiver sido testado separadamente.
