# Auditoria — Reino de Tagmar e ambientação

Data: 18/08/2026

## Resultado atual

- 46 diários;
- 46 páginas;
- 9 pastas;
- nenhum ID duplicado;
- nenhuma entrada órfã;
- nenhuma referência sem livro, URL ou hash de origem;
- pacote LevelDB reconstruído e auditado sem erros.

## Panteão e calendário

Foram adicionadas três referências oficiais:

1. `Guia do Livro dos Deuses`, originado de `Livro dos Deuses`;
2. `Os deuses de Tagmar`, originado do `Livro dos Deuses`;
3. `Calendário e festividades`, originado do `Livro de Ambientação`.

Os três verbetes sincronizados exibem no site o selo `Oficial.png` e a indicação `Texto oficial, não é possivel editar`.

## Regiões e geografia

Foram adicionadas cinco referências oficiais do Livro de Ambientação:

1. `Guia do Livro de Ambientação`;
2. `As Regiões de Tagmar`;
3. `Região dos Reinos`;
4. `Região das Terras Selvagens`;
5. `Região do Império`.

Os cinco verbetes exibem o selo oficial, estão bloqueados para edição no site e possuem URL e hash de origem registrados.

## Povos e culturas

Foram adicionadas três referências oficiais do Livro de Ambientação:

1. `Raças para interpretação`, originada de `Raças para Roleplay`;
2. `As Línguas de Tagmar`;
3. `Os aventureiros`.

Os três verbetes exibem o selo oficial, estão bloqueados para edição no site e possuem URL e hash de origem registrados.

## História e cronologia ampliada

Foram adicionadas cinco referências oficiais do Livro de Ambientação:

1. `Prólogo histórico — Extratos do Livro de Maudi`;
2. `Primeiro Ciclo — O Tempo das Névoas`;
3. `Segundo Ciclo — O Tempo dos Filhos`;
4. `Terceiro Ciclo — Tempo das Mentiras Infernais`;
5. `Cronologia de Tagmar`.

O índice do site abrevia os quatro primeiros títulos nas aspas. Os títulos completos foram usados para evitar páginas vazias. Todos os cinco verbetes corretos exibem selo oficial, bloqueio de edição, conteúdo completo, URL e hash de origem.

## Organizações e facções

Foram adicionadas quatro referências gerais oficiais do Livro de Magias:

1. `Colégios de Magia`;
2. `Ordens Sacerdotais`;
3. `Trilhas dos Rastreadores`;
4. `Confrarias dos Bardos`.

As entradas foram mantidas como diários informativos e não alteram fichas, requisitos ou magias. Seus hashes coincidem com as mesmas páginas oficiais já sincronizadas na categoria de magias.

## Mapas e ambientação geral

Foram adicionadas três referências oficiais do Livro de Ambientação:

1. `Cosmologia de Tagmar`;
2. `Considerações finais da ambientação`;
3. `Créditos do Livro de Ambientação`.

O mapa geral de Tagmar II referenciado por `As Regiões de Tagmar` foi armazenado localmente em `assets/mapas/tagmar2-mapa-v7-lo2.jpg`. O sincronizador substitui o endereço externo antigo pela cópia local, sem modificar o conteúdo editorial da página.

SHA-256 do mapa local: `27B5ECE25E0AF44690B0DDD52AD8591BFDB73213CD7C4618EB31712A2111B8B1`.

## Organização

1. `00 - GUIA`;
2. `01 - REINOS`;
3. `02 - PANTEÃO E CALENDÁRIO`;
4. `03 - REGIÕES E GEOGRAFIA`;
5. `04 - POVOS E CULTURAS`;
6. `05 - HISTÓRIA E CRONOLOGIA`;
7. `06 - ORGANIZAÇÕES E FACÇÕES`;
8. `07 - MAPAS E AMBIENTAÇÃO GERAL`;
9. `08 - ENCERRAMENTO`.

## Instalação

O pack `reino-de-tagmar-t3er` foi instalado no sistema ativo do Foundry. A versão anterior foi preservada em:

`C:\Users\PIRATA\AppData\Local\FoundryVTT\Data\systems\tagmar_rpg\packs\reino-de-tagmar-t3er.backup-20260818-131236`

A comparação SHA-256 dos cinco arquivos do pacote de origem e do pacote ativo não apresentou diferenças.

## Correção de links no Foundry

Os links relativos herdados do HTML oficial, como `Default.aspx?PageName=...`, eram interpretados pelo Foundry como caminhos de `localhost:30000`. O gerador agora converte todos os atributos `href` e `src` relativos em URLs absolutas baseadas na página oficial de origem.

A auditoria rejeita qualquer novo link ou imagem relativa incompatível com o Foundry. Os 46 diários passaram nessa verificação em 18/08/2026. O pack corrigido foi instalado, com a versão anterior preservada em:

`C:\Users\PIRATA\AppData\Local\FoundryVTT\Data\systems\tagmar_rpg\packs\reino-de-tagmar-t3er.backup-20260818-132957`

## Próxima ampliação

O núcleo planejado de Reino de Tagmar e ambientação está completo. Prosseguir com a auditoria conjunta dos compêndios revisados.
