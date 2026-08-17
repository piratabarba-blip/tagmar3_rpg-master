# Sincronização com a TagmarPedia

Este diretório contém a base do atualizador dos compêndios do Tagmar 3 para Foundry VTT.

## Princípios

- A fonte é sempre uma página pública do site oficial `tagmar.com.br`.
- O processo não altera o site oficial e limita as consultas a uma por segundo.
- Criaturas e arquétipos não fazem parte da primeira etapa.
- Nenhum pack do Foundry é alterado durante a descoberta.
- Cada página recebe uma assinatura SHA-256 para detectar mudanças.
- A conversão futura preservará IDs estáveis e incluirá URL de origem e atribuição.
- Mudanças serão revisadas e testadas antes da publicação.

## Uso

Com Node.js 18 ou superior:

```powershell
node tools/tagmar-sync/sync.mjs
```

O comando acima apenas compara o site com o último snapshot local. Para aceitar a versão consultada como nova base:

```powershell
node tools/tagmar-sync/sync.mjs --write
```

Durante o desenvolvimento, é possível limitar a consulta:

```powershell
node tools/tagmar-sync/sync.mjs --category=magias --limit=3
```

Para atualizar apenas as páginas de índice e organização de uma categoria:

```powershell
node tools/tagmar-sync/sync.mjs --category=magias --indexes-only --write
```

O snapshot fica em `.cache/tagmar-sync/` e não é versionado. Os próximos componentes transformarão o conteúdo aprovado em dados intermediários e, por fim, nos packs do Foundry V14.

## Prévia de documentos

Após criar o snapshot de habilidades, gere documentos de prévia com IDs estáveis:

```powershell
node tools/tagmar-sync/build-preview.mjs
```

## Auditoria do compêndio

Depois de gerar todas as prévias, execute a auditoria antes de escrever o pack:

```powershell
node tools/tagmar-sync/audit-preview.mjs --write
```

O relatório fica em `.cache/tagmar-sync/audit-report.json`. A auditoria confere IDs, pastas órfãs, documentos na raiz, origem oficial, cabeçalhos das magias, vínculos entre efeitos e Magias-pai, valores de dano e dados de cura. Avisos `needsReview` representam dados que a fonte oficial não publicou de forma objetiva e não devem ser preenchidos por suposição.

O resultado `preview-habilidades.json` ainda não é um pack. Campos mecânicos desconhecidos são mantidos neutros e marcados com `needsMechanicalMapping`, impedindo que conteúdo textual seja confundido com uma implementação aprovada.

Para ler a organização e os ícones do compêndio clássico sem alterá-lo:

```powershell
node tools/tagmar-sync/read-legacy-pack.mjs
```

O caminho dos módulos do Foundry pode ser informado na variável `TAGMAR_FOUNDRY_MODULES`. A leitura usa o LevelDB em modo somente leitura e salva o resultado apenas no cache ignorado pelo Git.

Para gerar o pack separado de prévia:

```powershell
node tools/tagmar-sync/write-preview-pack.mjs
```

O único destino permitido é `packs/criando-fichas-t3er`. O pack clássico `packs/criando-fichas` nunca é aberto para escrita por esse comando.

Para gerar as Raças e Profissões do núcleo revisado:

```powershell
node tools/tagmar-sync/sync.mjs --category=racas --write
node tools/tagmar-sync/sync.mjs --category=profissoes --write
node tools/tagmar-sync/build-preview-personagens.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

O núcleo contém somente as seis raças e seis profissões básicas da edição revisada. Raças e profissões de Terras Selvagens ou de outros suplementos permanecem em packs separados. Os modificadores raciais, EF, VB, EH, pontos de Habilidades, Técnicas e Grupos de Armas são extraídos das tabelas oficiais; a estrutura dos campos e os ícones seguem o sistema clássico.

Para gerar as Técnicas de Combate revisadas depois da sincronização completa:

```powershell
node tools/tagmar-sync/build-preview-tecnicas.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

As técnicas preservam as listas separadas por profissão, Academia e Guilda. Quando a tabela oficial concede custo reduzido, o documento da especialização recebe o custo já reduzido, como no compêndio clássico.

Para gerar as armas e os grupos de Combate revisados:

```powershell
node tools/tagmar-sync/sync.mjs --category=combate --write
node tools/tagmar-sync/build-preview-combate.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

As duas tabelas gerais de armas do capítulo oficial são a autoridade para grupo, custo do grupo, alcance, Força mínima, atributo, ajustes L/M/P e danos. A progressão acima de 100% preserva a progressão linear usada pelo sistema clássico. Ícones e o atributo de bônus de dano são reaproveitados do compêndio clássico, sem importar as pastas de armas naturais ou de técnicas para o núcleo revisado.

Para gerar os equipamentos de Defesa revisados:

```powershell
node tools/tagmar-sync/sync.mjs --category=defesa --write
node tools/tagmar-sync/build-preview-defesa.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

A tabela de Defesa do capítulo oficial de Combate define Defesa Base, Absorção, Físico mínimo, Força mínima e restrições raciais. A página oficial de Pertences e Afins define os preços. A organização e os ícones vêm do compêndio clássico, sem alterar seus documentos.

Para gerar os Pertences e Afins comuns revisados:

```powershell
node tools/tagmar-sync/sync.mjs --category=pertences --write
node tools/tagmar-sync/build-preview-pertences.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

O capítulo oficial define os itens, preços, capacidades e textos. Pesos e capacidades mecânicas que não foram republicados na tabela são preservados do compêndio clássico. Tesouros mágicos, poções, elixires, venenos e outros itens de livros próprios serão tratados separadamente, sem serem confundidos com equipamentos comuns.

Para gerar os consumíveis do Livro dos Objetos Mágicos:

```powershell
node tools/tagmar-sync/sync.mjs --category=tesouros-magicos --write
node tools/tagmar-sync/build-preview-tesouros.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

Poções, elixires, essências, infusões, óleos, pastilhas e ungüentos preservam a organização clássica, mas usam integralmente as descrições, origens, raridades, fórmulas, histórias e efeitos da publicação oficial atual.

Para gerar os Venenos e Drogas revisados:

```powershell
node tools/tagmar-sync/sync.mjs --category=venenos-drogas --write
node tools/tagmar-sync/build-preview-venenos.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

Os exemplos vêm do capítulo oficial de Regras Complementares. Venenos preservam Força de Ataque, método de aplicação, efeitos e duração; drogas preservam também ciclo e uso viciante. Os ícones, pesos e preços disponíveis são reaproveitados dos documentos correspondentes do compêndio clássico, que permanece inalterado.

Para gerar o kit de Materiais Mágicos e Rituais:

```powershell
node tools/tagmar-sync/sync.mjs --category=rituais --write
node tools/tagmar-sync/build-preview-rituais.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

O kit continua personalizável como no compêndio clássico. A descrição oficial de cada efeito mágico é a autoridade para o preço dos materiais; o kit registra que os componentes são consumidos integralmente e que a evocação ritual demora tantas horas quanto o nível do efeito. Não são inventados componentes que a magia não especifique.

Para gerar os Valores Monetários revisados:

```powershell
node tools/tagmar-sync/build-preview-moedas.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

Os lotes clássicos de 1, 10 e 50 moedas preservam seus nomes, ícones e comportamento como pertences de tesouro. Cada documento registra a moeda, a quantidade representada e seu valor equivalente em cobre segundo a conversão oficial: 1 M.O. = 10 M.P. = 100 M.C. A entrada de resultado vazio também é preservada para tabelas aleatórias.

## Efeitos da ficha

O compêndio revisado não cria uma lista automática de efeitos gerais. O próprio jogador configura os efeitos na ficha e controla quando ficam ativos. O sincronizador não transforma condições narrativas em modificadores numéricos sem uma regra oficial objetiva e testada.

## Magias de dano

Os níveis ofensivos são gerados como itens de Combate dentro de `07 - MAGIAS / MAGIAS DE ATAQUE`, preservando o funcionamento clássico da ficha. A descrição oficial atual define o nível do efeito, o dano máximo, o alcance e a área. As frações de 25%, 50%, 75% e 100% são calculadas a partir desse dano e continuam usando a rolagem e os botões de aplicação de dano já existentes no sistema. Todo resultado fracionário é arredondado para cima; por exemplo, dano máximo 18 produz 5, 9, 14 e 18 nas quatro faixas básicas.

```powershell
node tools/tagmar-sync/build-preview-magias-dano.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

O lote ofensivo validado contém 90 efeitos distribuídos em 17 famílias: **Aeromanipulação**, **Armadilha Natural**, **Bola de Fogo**, **Cataclisma**, **Dardos de Gelo**, **Explosão Mística**, **Feixes Incandescentes**, **Fogo Divino**, **Garras**, **Lâmina de Luz**, **Meteoros**, **Onda Destrutiva**, **Putrefação**, **Raio Elétrico**, **Relâmpagos**, **Ruído** e **Toque Gélido**.

O gerador preserva as exceções oficiais em texto e nos atributos usados pela ficha. Entre elas: Garras usa Agilidade no ataque e Força no dano; Lâmina de Luz soma Força apenas ao dano; Explosão Mística reduz Karma; Onda Destrutiva danifica equipamentos; Ruído causa dano por rodada; Cataclisma pode receber dano adicional pelo Karma roubado; e magias com vários projéteis ou alvos exigem rolagens separadas.

Nem toda magia que menciona dano vira um item de Combate. **Ataque Térmico** causa dano direto na EF após Resistência à Magia, **Chuva Ácida** causa dano ambiental fixo por rodada e **Auxílio Natural** resolve primeiro a Resistência à Magia. Esses efeitos continuam sob controle manual do jogador, pois inseri-los na tabela de ataque produziria uma regra diferente da oficial. Magias defensivas, curativas, invocações e melhorias de armas também não são classificadas como ataques independentes.

As antigas famílias **Energia Infernal** e **Esferas do Primórdio** não aparecem no núcleo oficial revisado sincronizado e, por isso, não são copiadas artificialmente para o novo compêndio. Elas permanecem preservadas somente no compêndio clássico.

## Magias de cura

As curas objetivas ficam organizadas em `07 - MAGIAS / MAGIAS DE CURA`, separadas em **Curas Heroicas**, **Curas Espirituais** e **Curas Físicas**. O gerador lê os níveis e valores das descrições oficiais atuais, sem alterar o compêndio clássico.

```powershell
node tools/tagmar-sync/build-preview-magias-cura.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

O lote contém 17 efeitos. **Curas Heroicas** possui seis níveis e usa a tabela de resolução: a fração obtida determina a EH recuperada e qualquer resultado decimal é arredondado para cima. **Curas Espirituais** possui seis níveis de recuperação fixa de EH, enquanto **Curas Físicas** possui cinco níveis de recuperação fixa de EF; essas duas famílias publicam diretamente no chat o botão de cura, sem rolagem de ataque.

Ao aplicar a cura pelo chat, o jogador seleciona o token beneficiado. A recuperação nunca ultrapassa a EH ou EF máxima, tanto para Personagens quanto para NPCs. Efeitos adicionais descritos nos níveis mais altos, como expulsão de espíritos, continuam sob controle do jogador. Outras magias restauradoras com regras especiais permanecem informativas até receberem implementação e testes próprios.

Para gerar as Magias revisadas depois da sincronização completa:

```powershell
node tools/tagmar-sync/build-preview-magias.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

As listas oficiais de aquisição são a autoridade para pastas e custos. As descrições preenchem Evocação, Alcance, Duração e Efeito sem modificar a mecânica clássica de nível, Karma e total. Como no compêndio clássico, o texto visível de cada magia começa com Alcance, Duração e Evocação; os mesmos valores também permanecem em campos internos para automações futuras. O núcleo revisado contém 248 magias únicas e 426 documentos, pois uma mesma magia pode existir em várias listas com custos próprios. As magias suplementares são produzidas por geradores separados para não alterarem esse conjunto nuclear.

## Magias Ancestrais e Magias Perdidas

Os dois suplementos são sincronizados em categorias próprias e não alteram as Magias do núcleo. As listas oficiais determinam profissão, especialização e custo; as páginas individuais fornecem Alcance, Duração, Evocação e a descrição integral. Entradas repetidas de forma idêntica na mesma lista oficial são consolidadas, mas a mesma magia continua aparecendo em todas as listas distintas nas quais pode ser adquirida.

```powershell
node tools/tagmar-sync/sync.mjs --category=magias-ancestrais --write
node tools/tagmar-sync/sync.mjs --category=magias-perdidas --write
node tools/tagmar-sync/build-preview-magias-suplementares.mjs
node tools/tagmar-sync/audit-preview.mjs --write
node tools/tagmar-sync/write-preview-pack.mjs
```

As pastas principais são `08 - MAGIAS ANCESTRAIS` e `09 - MAGIAS PERDIDAS`, com subdivisões por profissão e por Trilha, Confraria, Ordem ou Colégio. Os documentos permanecem informativos e preservam a gestão manual de Karma, duração e efeitos pelo jogador. O gerador não adiciona automações novas às magias suplementares.

O lote atual contém 76 Magias Ancestrais únicas em 82 listas de aquisição e 169 Magias Perdidas únicas em 188 listas. A página de **Ataque de Riso** existe na seção de descrições do site, mas a magia não aparece em nenhuma lista oficial de aquisição; por isso ela fica registrada como fonte não listada e não é inserida artificialmente no compêndio.

## Terras Selvagens

O conteúdo atual de **Aventuras nas Terras Selvagens** é mantido no pack independente `terras-selvagens-t3er`. O pack clássico `terras-selvagens` é usado apenas como referência estrutural e não é modificado. Isso permite atualizar o material em oficialização sem alterar a versão clássica já publicada e testada.

Para sincronizar as páginas oficiais, gerar a primeira etapa e produzir o pack:

```powershell
node tools/tagmar-sync/sync.mjs --category=terras-selvagens --skip-errors --write
node tools/tagmar-sync/build-preview-terras-personagens.mjs
node tools/tagmar-sync/build-preview-terras-combate.mjs
node tools/tagmar-sync/build-preview-terras-defesa.mjs
node tools/tagmar-sync/build-preview-terras-tecnicas.mjs
node tools/tagmar-sync/audit-preview-terras.mjs --write
node tools/tagmar-sync/write-preview-terras-pack.mjs
```

A primeira etapa contém `01 - RAÇAS` e `02 - PROFISSÕES`: sete raças jogadoras e as profissões Berserker e Feiticeiro. Os valores mecânicos vêm das tabelas oficiais atuais; campos e imagens seguem o formato que a ficha já utiliza. Divergências em relação ao compêndio clássico são preservadas nos metadados para auditoria, mas o documento gerado usa a regra oficial corrente.

O lote seguinte acrescenta `04 - COMBATE TERRAS SELVAGENS`, com as armas específicas do suplemento separadas pelos grupos de combate. Armas básicas que já existem no compêndio principal não são duplicadas. Os números vêm da tabela oficial atual, enquanto imagens, campos internos e casos sem valores próprios publicados preservam a implementação clássica já testada.

```powershell
node tools/tagmar-sync/build-preview-terras-combate.mjs
node tools/tagmar-sync/audit-preview-terras.mjs --write
node tools/tagmar-sync/write-preview-terras-pack.mjs
```

As proteções específicas ficam em `05 - DEFESA TERRAS SELVAGENS`, nas pastas **ARMADURAS**, **ELMOS**, **ESCUDO** e **PROTETOR EXOTICO**. O lote contém armaduras e materiais especiais, proteções de cauda dos Sekbetes, protetores de asas dos Napóis e os demais equipamentos publicados na tabela oficial.

```powershell
node tools/tagmar-sync/build-preview-terras-defesa.mjs
node tools/tagmar-sync/audit-preview-terras.mjs --write
node tools/tagmar-sync/write-preview-terras-pack.mjs
```

As perícias **Combate Aéreo** e **Combate Aquático** ficam em `06 - TÉCNICAS DE COMBATE TERRAS SELVAGENS / PERÍCIAS AMBIENTAIS`. Como a fonte oficial as classifica como Perícia e determina teste em -7 quando não há nível, os documentos usam a mecânica já existente de `Habilidade`, com atributo Físico e nível inicial zero. O site não publica custo de aquisição para elas; o compêndio registra essa ausência e deixa a aquisição sob administração manual, sem inventar regra ou criar automação nova.

```powershell
node tools/tagmar-sync/build-preview-terras-tecnicas.mjs
node tools/tagmar-sync/audit-preview-terras.mjs --write
node tools/tagmar-sync/write-preview-terras-pack.mjs
```

O sincronizador consulta primeiro o endpoint oficial `rest.aspx`, que devolve o conteúdo limpo do verbete, e usa `Default.aspx` como alternativa. A opção `--skip-errors` registra eventuais falhas e preserva qualquer cópia válida já armazenada, sem inventar conteúdo nem interromper a atualização das demais páginas.
