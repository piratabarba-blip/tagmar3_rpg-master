# Contexto do projeto — Tagmar Foundry VTT V14 RC8

Atualizado em: **17/08/2026**
Responsável pelo repositório: **piratabarba-blip**
Projeto: **Tagmar para Foundry VTT V14**

## Mensagem inicial para o Codex do outro computador

> Leia este arquivo inteiro antes de alterar qualquer coisa. Continue o projeto a partir da versão `2.7.0-v14.1-rc.8`, sem refazer a migração V13/V14 e sem modificar os compêndios clássicos. Preserve todas as automações que já existem no sistema e não crie novas automações sem aprovação e teste explícitos. Use o site oficial do Tagmar como fonte principal, o endpoint `rest.aspx` quando disponível e PDFs oficiais apenas como fallback documentado. Trabalhe somente no repositório `piratabarba-blip/tagmar3_rpg-master`; o repositório original de Marcos Walker deve permanecer inalterado. Antes de editar packs LevelDB, feche completamente o Foundry. Faça mudanças pequenas, valide no Foundry V14 e mantenha checkpoints no Git.

## Objetivo geral

Manter uma versão moderna do sistema Tagmar para Foundry VTT V14, com compêndios sincronizáveis a partir do conteúdo oficial de `tagmar.com.br`, preservando a lógica e as automações já implementadas no sistema clássico.

O projeto deve:

- preservar o sistema e o compêndio clássico como referência recuperável;
- publicar novos compêndios separados e sincronizados;
- acompanhar as mudanças frequentes do projeto oficial Tagmar;
- organizar tudo em pastas equivalentes às do compêndio clássico;
- usar regras oficiais, sem deduzir números ou criar automações por suposição;
- permitir que o jogador continue administrando Karma, efeitos, durações e condições;
- futuramente substituir o compêndio clássico somente quando todo o conteúdo sincronizado estiver completo e aprovado.

## Publicação atual

- Sistema: `tagmar_rpg`
- Título atual: `Tagmar XXX`
- Foundry: V14, testado no build 366
- Versão: `2.7.0-v14.1-rc.8`
- Commit: `fb7b7b3` — `feat: publica RC8 sincronizada`
- Tag: `v2.7.0-v14.1-rc.8`
- Branch: `codex/compendio-t3er-v14`
- Base protegida: `main`
- PR em rascunho: <https://github.com/piratabarba-blip/tagmar3_rpg-master/pull/3>
- Repositório: <https://github.com/piratabarba-blip/tagmar3_rpg-master>

Manifesto instalável no Foundry V14:

```text
https://raw.githubusercontent.com/piratabarba-blip/tagmar3_rpg-master/v2.7.0-v14.1-rc.8/system.json
```

Download correspondente à tag:

```text
https://codeload.github.com/piratabarba-blip/tagmar3_rpg-master/zip/refs/tags/v2.7.0-v14.1-rc.8
```

O RAW foi verificado após a publicação: HTTP 200 e versão RC8 correta.

## Como preparar o outro computador

Para apenas testar o sistema e os compêndios:

1. Abra o Foundry VTT V14.
2. Entre em **Game Systems → Install System**.
3. Cole o manifesto RAW da RC8.
4. Crie um mundo novo de teste usando `tagmar_rpg`.
5. Não é necessário copiar o mundo antigo para testar o sistema.

Para continuar o desenvolvimento:

```powershell
git clone -b codex/compendio-t3er-v14 https://github.com/piratabarba-blip/tagmar3_rpg-master.git
```

Depois, abra a pasta clonada como projeto no Codex e anexe este relatório.

## Histórico concluído

### Migração do sistema

- A versão original V12 foi preservada.
- A migração V13 foi concluída, testada e publicada.
- A migração V14 foi concluída e testada.
- Fichas de personagem e NPC abrem, editam e salvam.
- Criação e uso de habilidades, itens, magias, técnicas e pertences foram testados.
- A versão V14 clássica validada não deve receber mudanças retroativas.
- O trabalho sincronizado atual é uma evolução separada.

### Módulos e dependências

O manifesto RC8 declara estas dependências V14 mantidas no repositório `piratabarba-blip/modulos_foundry`:

- Bar Brawl;
- libWrapper;
- Dice So Nice;
- socketlib;
- Polyglot;
- Tagmar Gestão de Munições;
- Tagmar Transações.

O Drag Ruler não foi mantido porque o Foundry moderno já oferece a função correspondente de forma nativa. Não remover ou substituir dependências sem verificar primeiro a funcionalidade nativa e a compatibilidade com V14.

### Compêndios atuais do manifesto

Clássicos preservados:

- `criando-fichas`;
- `terras-selvagens`;
- `criaturas-e-arquetipos-sem-tecnicas`;
- `registro-de-datas`.

Novos/sincronizados:

- `criando-fichas-t3er` — Criando Fichas, edição revisada;
- `terras-selvagens-t3er` — Terras Selvagens, edição atual;
- `terras-selvagens-regras-t3er` — diários de regras;
- `reino-de-tagmar-t3er` — referências oficiais do Reino;
- `criaturas-t3er` — criaturas oficiais sincronizadas.

## Estado do compêndio revisado

O compêndio `criando-fichas-t3er` contém e organiza:

- raças;
- profissões;
- habilidades;
- combate e grupos de armas;
- defesa: armaduras, escudos e elmos;
- técnicas de combate;
- magias básicas e especializações;
- magias ancestrais;
- magias perdidas;
- pertences e afins;
- consumíveis, venenos, drogas, rituais e moedas.

### Regras obrigatórias das habilidades

- Uma habilidade não adquirida normalmente é testada com total `-7`.
- O botão `+` compra/aumenta nível.
- O nível de uma habilidade não pode ultrapassar o estágio do personagem.
- Valores raciais, profissionais, atributo e outros ajustes existentes devem continuar sendo considerados.
- Todas as criaturas sincronizadas receberam a lista completa de habilidades para permitir testes ocasionais durante o combate.
- Habilidades já existentes com nível foram preservadas; as ausentes foram acrescentadas com nível zero, sem sobrescrever as implementadas.

### Organização

O clássico é a referência estrutural. As categorias principais são:

1. Raças
2. Profissões
3. Habilidades, separadas em Profissional, Manobra, Conhecimento, Subterfúgio, Influência e Geral
4. Combate, separado por grupo de armas
5. Defesa
6. Técnicas de Combate
7. Magias, separadas por profissão, ordem, colégio, trilha ou confraria
8. Magias Ancestrais
9. Magias Perdidas
10. Pertences e Afins

Nenhum documento deve ficar solto na raiz quando houver uma categoria aplicável.

## Magias e automações

Decisão central: **preservar todas as automações existentes, mas não criar novas automações nesta fase**.

- O jogador administra Karma manualmente.
- O jogador administra duração, efeitos contínuos e condições.
- Efeitos gerais são criados e controlados pelo próprio jogador na ficha.
- Magias informativas continuam informativas.
- Somente dano e cura com regra oficial objetiva reutilizam mecanismos já existentes e testados.
- Todo resultado de dano fracionário deve ser arredondado para cima.
- Curas nunca podem ultrapassar o máximo de EF ou EH.

Magias de dano foram convertidas em itens de Combate quando a regra oficial realmente manda resolver pela Tabela de Resolução. Dano direto condicionado a RM, dano ambiental, dano por rodada ou regras especiais permanecem manuais quando colocar o efeito na tabela de ataque mudaria a regra oficial.

Magias de cura:

- Curas Heroicas usam a tabela e arredondam para cima;
- Curas Espirituais recuperam EH diretamente;
- Curas Físicas recuperam EF diretamente.

As descrições visíveis das magias devem começar com:

- Alcance;
- Duração;
- Evocação.

Esses dados também permanecem em campos internos para uso futuro.

## Terras Selvagens

O suplemento fica separado em `terras-selvagens-t3er` e não altera o pack clássico.

Já foram incluídos:

- raças e profissões do suplemento;
- combate e novas armas;
- defesa e equipamentos especiais;
- perícias ambientais;
- magias organizadas por profissão, caminho, confraria, colégio e trilha;
- ataques e curas objetivas compatíveis com a mecânica existente;
- poções e receitas separadas por tipo de Feiticeiro e magia criadora;
- regras extensas em um pack de JournalEntries separado;
- imagens próprias criadas para entradas que não possuíam ilustração adequada.

As perícias Combate Aéreo e Combate Aquático usam o tipo `Habilidade`, atributo Físico e nível zero, pois devem poder ser testadas em `-7` sem aquisição.

As receitas de poções são itens prontos para consulta e arraste. Fabricação, gasto de Karma, limites e escolhas continuam manuais.

Quatro páginas estiveram vazias no site e receberam fallback temporário do PDF oficial **Tagmar — Livro ATS**:

- Bestializar;
- Enxame de Pragas;
- Escudo Espiritual;
- Invocar Espíritos.

O responsável pelo site foi avisado e começou a corrigir os links. Na próxima sincronização, verificar se os quatro verbetes já possuem conteúdo. Se possuírem, o site deve voltar a ter prioridade automática sobre o PDF.

## Reino de Tagmar

O pack `reino-de-tagmar-t3er` contém referências oficiais sincronizadas do Livro dos Reinos.

- 23 documentos;
- 23 páginas;
- 3 pastas;
- auditoria estrutural sem erros.

O objetivo é oferecer consulta de ambientação, cronologia, regiões e reinos dentro do Foundry. Posteriormente outros conteúdos como panteão, regiões e ambientação geral poderão receber packs próprios.

## Criaturas oficiais sincronizadas

O pack atual é `criaturas-t3er`, exibido como **Criaturas — Edição Oficial Sincronizada (Prévia)**.

Estado auditado no RC8:

- 414 atores oficiais;
- 20.280 itens incorporados;
- 16.605 itens de Habilidade;
- nenhuma pasta órfã;
- nenhuma duplicação de chave clássica detectada;
- 364 correspondências entre o índice oficial e o clássico;
- 50 entradas somente na lista oficial;
- 41 entradas somente no clássico.

As criaturas completas preservam:

- estatísticas oficiais atuais;
- ataques e defesas;
- habilidades com e sem nível;
- técnicas de combate aplicáveis;
- imagens e tokens;
- descrição e modo de luta na Biografia;
- flags de sincronização com URL, hash, categoria, variante e chave estável.

### Técnicas especiais de criaturas

A seção 3.4 do **Livro de Criaturas 3.0** é a autoridade para:

- Ataques múltiplos;
- Bote;
- Carga Aérea;
- Carga de Quadrúpede;
- Prender.

O mapeamento está em:

```text
tools/tagmar-sync/creature-special-techniques.json
```

Regras importantes:

- técnicas entram como `Tecnica_Combate`, não como ataques;
- formas de ataque permanecem como itens `Combate`;
- ataque e técnica podem coexistir;
- o nível/força oficial da criatura é preservado quando a técnica possui total;
- `Prender` não possui nível numérico; usa a dificuldade informada na ficha e permanece manual;
- não inventar técnicas para Golens ou outras criaturas apenas pelo nome;
- a Biografia oficial é suficiente para registrar comportamento que não possui uma técnica objetiva.

O compêndio clássico `11 - CRIANDO CRIATURAS` foi estudado como referência para ataques, poderes natos, defesas e variações. Ele não deve ser copiado cegamente: o conteúdo oficial atual e o formato moderno da ficha prevalecem, preservando apenas implementações clássicas que continuam válidas.

## Ajustes das fichas

Na RC8:

- `tagmarActorSheet` abre por padrão com largura 900 e altura 950;
- `tagmarAltSheet` abre por padrão com largura 900 e altura 950;
- a ficha de NPC não força mais a largura antiga de 735;
- as colunas de habilidades ganharam espaço para evitar quebras de linha ruins;
- o conteúdo continua rolável quando a tela disponível for menor;
- fichas de personagem e NPC foram testadas visualmente.

Também foi adicionada proteção para evitar que a renderização de uma ficha aberta diretamente de um compêndio bloqueado tente gravar alterações no próprio pack. Para editar/testar uma criatura, prefira importá-la para o mundo.

## Fonte e sincronização

Fonte principal:

```text
https://tagmar.com.br/
```

O sincronizador consulta preferencialmente:

```text
https://tagmar.com.br/wiki/rest.aspx?word=true&PageName=...
```

e usa `Default.aspx` como alternativa.

Princípios:

- no máximo uma consulta por segundo;
- snapshots e hashes SHA-256 detectam alterações;
- IDs e pastas são determinísticos;
- o clássico é lido como referência, nunca sobrescrito pelo sincronizador;
- nenhum campo mecânico desconhecido deve ser inventado;
- `needsReview` e `needsMechanicalMapping` são avisos deliberados, não autorização para adivinhar valores;
- URLs e origem oficial devem permanecer registradas nos documentos.

Documentação técnica principal:

- `tools/tagmar-sync/README.md`;
- `tools/tagmar-sync/ORGANIZACAO.md`;
- `tools/tagmar-sync/REINOS_E_CRIATURAS.md`;
- `tools/tagmar-sync/sources.json`.

## Validações realizadas antes da RC8

- `audit-preview-creatures-pilot.mjs --all-official`: sem erros estruturais;
- `audit-preview-reinos.mjs`: sem erros;
- `audit-creature-sync.mjs`: sem duplicações de chave clássica;
- verificação de sintaxe JavaScript das duas classes de ficha;
- validação do JSON do manifesto;
- instalação do sistema e abertura dos compêndios no Foundry V14;
- testes de personagem e NPC;
- testes de ataques, defesas, habilidades, técnicas, dano, cura e salvamento;
- teste visual do novo tamanho das fichas.

Avisos sobre mecânicas que ainda exigem decisão oficial podem permanecer no relatório de auditoria. Eles não devem ser preenchidos por suposição.

## Arquivos locais que não pertencem ao RC8

No computador de origem existiam alterações locais causadas pelo Foundry, pelo LevelDB e pela sincronização do OneDrive. Elas ficaram propositalmente fora do commit `fb7b7b3`:

- renomeações estranhas de assets produzidas pelo OneDrive;
- logs, manifests e arquivos `.ldb` novos dos compêndios clássicos abertos pelo Foundry;
- `.tmp-v14-modules/`;
- `tmp/`;
- cópia local `modulos_foundry/`;
- `audit-preview-DESKTOP-KL9L43L.mjs`;
- outros resíduos de execução local.

Não tente incluir, apagar ou restaurar esses arquivos automaticamente. O clone no outro computador deve começar limpo no commit publicado.

## Política Git

- Trabalhar somente em `piratabarba-blip`.
- Não alterar o repositório original de Marcos Walker.
- `main` deve continuar protegida.
- Novas mudanças entram em branch `codex/...` e PR inicialmente em rascunho.
- Antes de cada commit, selecionar arquivos explicitamente; o worktree de origem pode conter resíduos do Foundry.
- Não executar `git reset --hard`, `git clean` ou exclusões em massa.
- Criar uma tag somente depois de teste e aprovação.
- O compêndio clássico só pode sair do manifesto no final do projeto, depois de cobertura e testes completos.

## Próximo passo recomendado no outro PC

### Primeiro: validar a instalação limpa da RC8

1. Instalar pelo RAW da tag RC8.
2. Criar um mundo V14 vazio.
3. Confirmar que aparecem os nove packs do manifesto.
4. Abrir `Criando Fichas — Edição Revisada` e arrastar alguns itens para uma ficha.
5. Abrir `Terras Selvagens — Edição Atual` e verificar magias, poções e organização.
6. Abrir `Reino de Tagmar — Referências Oficiais`.
7. Importar algumas criaturas do pack sincronizado para o mundo.
8. Testar, no mínimo:
   - Urso;
   - Crocodilo;
   - uma criatura com Ataques múltiplos;
   - uma criatura com Prender;
   - um Golem;
   - uma criatura com magia;
   - uma criatura humanoide com muitas habilidades.
9. Verificar ataques, dano, defesa, habilidades, técnicas, Biografia e token.
10. Abrir o console e registrar somente erros realmente relacionados ao sistema.

### Depois: continuar o cronograma

1. Gerar uma lista das criaturas presentes no clássico/PDF que ainda não aparecem no site oficial, para enviar ao responsável pela TagmarPedia.
2. Verificar se os quatro verbetes de magia antes vazios já foram corrigidos no site e remover o fallback apenas quando a sincronização comprovar conteúdo oficial válido.
3. Fazer auditoria amostral das 414 criaturas por categoria, especialmente ataques especiais, Golens, criaturas conjuradoras e variantes.
4. Corrigir somente divergências comprovadas entre site, PDF oficial e ficha gerada.
5. Completar a sincronização do restante das referências do Reino/ambientação conforme prioridade do usuário.
6. Manter o clássico ativo até a aprovação final de cobertura total.

## Critérios para concluir a substituição do clássico

Não retirar os packs clássicos enquanto não houver confirmação de:

- todas as criaturas e variantes oficiais;
- ataques e danos corretos;
- técnicas especiais corretas;
- habilidades completas;
- magias, defesas e itens incorporados;
- imagens e tokens adequados;
- descrições e Biografias;
- organização por pastas;
- atualização reproduzível a partir do site;
- instalação limpa no Foundry V14;
- ausência de erros críticos no console;
- testes e aprovação explícita do usuário.

Até lá, os packs novos permanecem identificados como **Prévia** e o PR pode continuar em rascunho.
