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

Para gerar as Magias revisadas depois da sincronização completa:

```powershell
node tools/tagmar-sync/build-preview-magias.mjs
node tools/tagmar-sync/write-preview-pack.mjs
```

As listas oficiais de aquisição são a autoridade para pastas e custos. As descrições preenchem Evocação, Alcance, Duração e Efeito sem modificar a mecânica clássica de nível, Karma e total. Como no compêndio clássico, o texto visível de cada magia começa com Alcance, Duração e Evocação; os mesmos valores também permanecem em campos internos para automações futuras. O núcleo revisado contém 248 magias únicas e 426 documentos, pois uma mesma magia pode existir em várias listas com custos próprios. Magias de suplementos não entram automaticamente no pack do núcleo.
