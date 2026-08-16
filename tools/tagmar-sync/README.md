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

Os níveis ofensivos são gerados como itens de Combate dentro de `07 - MAGIAS / MAGIAS DE ATAQUE`, preservando o funcionamento clássico da ficha. A descrição oficial atual define o nível do efeito, o dano máximo, o alcance e a área. As frações de 25%, 50%, 75% e 100% são calculadas a partir desse dano e continuam usando a rolagem e os botões de aplicação de dano já existentes no sistema.

```powershell
node tools/tagmar-sync/build-preview-magias-dano.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

O primeiro lote validado contém **Bola de Fogo** e **Raio Elétrico**. Outras magias ofensivas só serão acrescentadas depois de validar individualmente suas exceções, alvos, áreas, danos contínuos e efeitos especiais.

Para gerar as Magias revisadas depois da sincronização completa:

```powershell
node tools/tagmar-sync/build-preview-magias.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

As listas oficiais de aquisição são a autoridade para pastas e custos. As descrições preenchem Evocação, Alcance, Duração e Efeito sem modificar a mecânica clássica de nível, Karma e total. Como no compêndio clássico, o texto visível de cada magia começa com Alcance, Duração e Evocação; os mesmos valores também permanecem em campos internos para automações futuras. O núcleo revisado contém 248 magias únicas e 426 documentos, pois uma mesma magia pode existir em várias listas com custos próprios. Magias de suplementos não entram automaticamente no pack do núcleo.
