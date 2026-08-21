# Cronograma pendente — Tagmar Foundry VTT V14

Atualizado em: **17/08/2026**
Ponto de partida: **v2.7.0-v14.1-rc.8**
Branch atual: **codex/compendio-t3er-v14**

## Regra geral de trabalho

Antes de iniciar qualquer etapa:

1. Ler `contexto_do_projeto.md` por completo.
2. Trabalhar apenas no repositório `piratabarba-blip/tagmar3_rpg-master`.
3. Manter o repositório original de Marcos Walker inalterado.
4. Fechar completamente o Foundry antes de modificar packs LevelDB.
5. Preservar todas as automações já existentes.
6. Não criar novas automações sem aprovação e testes específicos.
7. Não modificar os compêndios clássicos.
8. Fazer checkpoint Git após cada lote aprovado.

## Resumo do que já está concluído

- Migração V12 → V13 concluída.
- Migração V13 → V14 concluída.
- Sistema RC8 publicado e instalável.
- Compêndio Criando Fichas revisado criado.
- Terras Selvagens revisado criado.
- Regras de Terras Selvagens criadas como diários.
- Poções e receitas de Terras Selvagens criadas.
- Magias de dano e cura objetivas implementadas usando as mecânicas existentes.
- Reino de Tagmar criado como compêndio de referências.
- 414 criaturas oficiais geradas no compêndio sincronizado.
- Habilidades completas adicionadas às criaturas sem apagar níveis existentes.
- Técnicas especiais do Livro de Criaturas 3.0 incorporadas.
- Fichas de personagem e NPC ajustadas para 900 × 950.
- RC8 auditada, testada e publicada.

## Etapa 1 — Teste limpo da RC8 no segundo computador

Status: **próxima etapa imediata**

### Ações

1. Instalar pelo manifesto:

   ```text
   https://raw.githubusercontent.com/piratabarba-blip/tagmar3_rpg-master/v2.7.0-v14.1-rc.8/system.json
   ```

2. Criar um mundo V14 vazio.
3. Confirmar a instalação das dependências declaradas.
4. Confirmar que todos os nove compêndios aparecem.
5. Abrir os compêndios novos e verificar pastas, imagens e documentos.
6. Abrir o console do Foundry e registrar erros relacionados ao sistema.

### Amostra mínima de teste

- uma ficha de personagem nova;
- uma ficha de NPC criada manualmente;
- Urso;
- Crocodilo;
- uma criatura com Ataques múltiplos;
- uma criatura com Bote;
- uma criatura com Carga Aérea;
- uma criatura com Carga de Quadrúpede;
- uma criatura com Prender;
- um Golem;
- uma criatura conjuradora;
- uma criatura humanoide com muitas habilidades.

### Conferir

- abertura e salvamento da ficha;
- tamanho inicial da janela;
- habilidades sem quebra de linha inadequada;
- ataques e valores L/M/P/100%;
- dano e arredondamento para cima;
- defesa e absorção;
- técnicas especiais;
- magias incorporadas;
- Biografia;
- imagens e tokens;
- arrastar documentos dos compêndios para a ficha;
- ausência de erros críticos no console.

### Critério de conclusão

A instalação limpa deve apresentar o mesmo comportamento aprovado no computador original.

## Etapa 2 — Auditoria completa das criaturas

Status: **pendente**

### Objetivo

Revisar as 414 criaturas por categoria sem alterar dados por suposição.

### Ações

1. Separar a revisão por pasta/categoria oficial.
2. Comparar cada amostra com a página oficial e, quando necessário, com o PDF oficial.
3. Conferir variantes que possuem nomes semelhantes.
4. Conferir ataques naturais e especiais.
5. Conferir defesas e absorções.
6. Conferir habilidades com nível e habilidades adicionadas com nível zero.
7. Conferir técnicas especiais e seus níveis.
8. Conferir criaturas conjuradoras e suas magias.
9. Conferir imagens, tokens e escala do protótipo.
10. Conferir Biografia e descrição do modo de luta.

### Categorias que exigem atenção especial

- Golens e outras criaturas artificiais;
- criaturas com Ataques múltiplos;
- criaturas com Bote ou Prender;
- criaturas voadoras;
- criaturas quadrúpedes de carga;
- criaturas com poderes natos;
- criaturas com várias formas de ataque;
- criaturas com magia;
- criaturas com variantes por estágio ou função;
- criaturas que existem apenas no clássico ou apenas na lista oficial.

### Regra para Golens

Não inventar técnicas de combate para um Golem apenas porque a descrição sugere uma forma de luta. Quando não houver técnica oficial objetiva, manter o comportamento na Biografia para consulta do Mestre.

### Critério de conclusão

Cada categoria deve possuir uma amostra validada e não pode apresentar erro estrutural ou mecânico comprovado.

## Etapa 3 — Lista de criaturas ausentes no site

Status: **concluída em 18/08/2026**

### Objetivo

Identificar criaturas publicadas no clássico ou nos PDFs oficiais que não aparecem corretamente na TagmarPedia.

### Ações

1. Comparar as 414 entradas oficiais sincronizadas com o compêndio clássico.
2. Revisar as 50 entradas somente oficiais.
3. Revisar as 41 entradas somente clássicas.
4. Separar nomes alternativos, variantes e duplicações editoriais.
5. Não considerar automaticamente toda diferença como criatura ausente.
6. Gerar uma lista final contendo:
   - nome;
   - categoria;
   - fonte/PDF;
   - página;
   - possível nome equivalente no site;
   - observação do problema;
   - link esperado ou link vazio.

### Entrega

Criar um arquivo como:

```text
criaturas_ausentes_no_site.md
```

### Critério de conclusão

A lista deve estar pronta para ser enviada ao responsável pela TagmarPedia sem falsos positivos óbvios.

### Resultado

- relatório criado em `criaturas_ausentes_no_site.md`;
- 377 correspondências resolvidas;
- 37 entradas somente oficiais;
- 28 entradas clássicas sem correspondência automática;
- 1 ausência oficial confirmada: **Devorador Astral**;
- demais diferenças separadas entre renomeações/agrupamentos e casos para revisão editorial.

## Etapa 4 — Revisar os quatro verbetes de magia corrigidos no site

Status: **pendente de nova sincronização**

### Verbetes

- Bestializar;
- Enxame de Pragas;
- Escudo Espiritual;
- Invocar Espíritos.

### Ações

1. Consultar novamente o endpoint `rest.aspx`.
2. Verificar se o conteúdo oficial não está mais vazio.
3. Comparar o texto do site com o fallback atual do PDF ATS.
4. Se o conteúdo do site estiver completo, tornar o site novamente a fonte prioritária.
5. Manter URL e hash da nova fonte.
6. Não remover o fallback até confirmar que a sincronização funciona de forma reproduzível.
7. Gerar novamente Terras Selvagens.
8. Auditar e testar as quatro magias no Foundry.

### Critério de conclusão

As quatro magias devem vir diretamente do site quando o verbete oficial estiver válido, sem perder descrição, níveis, Alcance, Duração ou Evocação.

## Etapa 5 — Completar Reino de Tagmar e ambientação

Status: **parcialmente concluído**

### Já disponível

- Livro dos Reinos;
- cronologia;
- prólogo e epílogo;
- referências dos reinos e cidades-estado;
- Panteão e divindades, com o guia oficial do Livro dos Deuses;
- calendário e festividades oficiais de Tagmar;
- regiões e geografia, com o guia oficial do Livro de Ambientação e as regiões dos Reinos, Terras Selvagens e Império;
- povos e culturas, com raças para interpretação, línguas e aventureiros;
- história e cronologia ampliada, com o Livro de Maudi, os três Ciclos e a cronologia geral;
- organizações e facções, com colégios, ordens sacerdotais, trilhas e confrarias;
- mapa geral oficial armazenado localmente para evitar dependência do endereço externo antigo;
- cosmologia, considerações finais e créditos do Livro de Ambientação;
- 46 documentos em 9 pastas, todos com URL, suplemento e hash de origem;
- pack reconstruído, auditado e instalado no sistema ativo em 18/08/2026.

### Próximos conteúdos possíveis

O núcleo previsto de Reino de Tagmar e ambientação está completo. Novos conteúdos só devem ser adicionados quando houver uma fonte oficial relevante que ainda não esteja representada.

### Regras

- manter referências extensas em packs de JournalEntry;
- não transformar ambientação em itens de ficha;
- registrar sempre URL, título, suplemento e hash;
- organizar por assunto e região;
- usar imagens apenas quando forem próprias, autorizadas ou oficialmente reutilizáveis.

### Critério de conclusão

O pack deve permitir consulta prática durante a sessão e continuar atualizável pelo sincronizador.

## Etapa 6 — Conferência dos compêndios revisados

Status: **Criando Fichas e Terras Selvagens auditados em 18/08/2026; instalação da correção de duplicação pendente com Foundry fechado**

### Criando Fichas — Edição Revisada

Revisar:

- raças;
- profissões;
- habilidades;
- armas e grupos;
- armaduras, escudos e elmos;
- técnicas de combate;
- magias básicas;
- magias ancestrais;
- magias perdidas;
- pertences;
- consumíveis;
- venenos e drogas;
- rituais;
- valores monetários.

### Terras Selvagens — Edição Atual

Revisar:

- raças e profissões;
- armas e defesa;
- perícias ambientais;
- magias e organização por tradição;
- danos e curas objetivas;
- receitas e composições de poções;
- regras em JournalEntries;
- imagens criadas para entradas sem ilustração.

### Critério de conclusão

Nenhum item deve ficar na raiz indevidamente, nenhuma pasta deve estar vazia sem justificativa e nenhuma entrada deve perder a origem oficial.

## Etapa 7 — Testes funcionais finais

Status: **pendente**

### Personagem

- criar do zero;
- escolher raça e profissão;
- adicionar habilidades;
- comprar níveis sem ultrapassar estágio;
- testar habilidade não adquirida em `-7`;
- adicionar armas, defesas e técnicas;
- adicionar magias e pertences;
- salvar, fechar e reabrir;
- testar dano e cura;
- testar módulos obrigatórios.

### NPC

- criar manualmente;
- importar do compêndio;
- salvar alterações no mundo;
- confirmar que o compêndio bloqueado não recebe tentativa de gravação;
- testar habilidades, ataques, técnicas, magias e Biografia;
- testar token e combate.

### Módulos

- Bar Brawl;
- Dice So Nice;
- libWrapper;
- socketlib;
- Polyglot;
- Gestão de Munições;
- Tagmar Transações com dois usuários.

### Critério de conclusão

Nenhum erro crítico vermelho relacionado ao sistema e nenhum problema de salvamento ou perda de item.

## Etapa 8 — Documentação e atualização reproduzível

Status: **pendente de consolidação**

### Ações

1. Atualizar `tools/tagmar-sync/README.md` quando o fluxo mudar.
2. Manter `ORGANIZACAO.md` coerente com os packs publicados.
3. Registrar comandos completos para reconstruir cada pack.
4. Documentar fallbacks de PDF e como removê-los.
5. Documentar auditorias obrigatórias antes de publicação.
6. Criar um comando ou roteiro único de atualização quando os geradores estiverem estáveis.
7. Garantir que nenhuma atualização dependa de arquivos temporários do computador original.

### Critério de conclusão

O outro computador deve conseguir sincronizar, gerar, auditar e testar os packs seguindo apenas a documentação versionada.

## Etapa 9 — Preparar Release Candidate final

Status: **pendente**

### Ações

1. Criar um checkpoint após todas as correções aprovadas.
2. Atualizar versão do `system.json`.
3. Atualizar URLs de manifesto e download para a nova tag.
4. Executar todas as auditorias.
5. Instalar a nova tag em um Foundry limpo.
6. Testar atualização sobre a RC8.
7. Atualizar o PR com resumo, números e resultados.
8. Manter o PR em rascunho até aprovação explícita.

### Critério de conclusão

A nova RC deve ser instalável por RAW e reproduzir todos os testes aprovados.

## Etapa 10 — Integração à main

Status: **somente depois da aprovação final**

### Condições

- revisão completa da nova RC;
- instalação limpa aprovada;
- testes de personagem e NPC aprovados;
- compêndios sincronizados auditados;
- sem arquivos temporários ou resíduos do OneDrive;
- PR revisado e sem conflitos;
- autorização explícita do usuário.

### Ações

1. Marcar o PR como pronto para revisão.
2. Conferir diferenças contra `main`.
3. Integrar mantendo o histórico.
4. Confirmar o RAW da versão estável.
5. Manter tags anteriores recuperáveis.

## Etapa 11 — Retirada futura dos compêndios clássicos

Status: **última etapa; não executar agora**

Os compêndios clássicos só podem ser removidos do manifesto quando os novos cobrirem integralmente:

- todas as raças e profissões necessárias;
- todas as habilidades;
- combate e defesa;
- técnicas de combate;
- magias e suplementos;
- pertences e consumíveis;
- todas as criaturas e variantes;
- ataques, técnicas, poderes e magias das criaturas;
- imagens e tokens;
- Biografias e referências;
- organização por pastas;
- atualização automática reproduzível;
- testes finais no Foundry V14.

Antes da retirada:

1. Criar uma tag final que ainda contenha o clássico.
2. Confirmar que o repositório de Marcos continua disponível como referência histórica.
3. Comparar cobertura clássica versus sincronizada.
4. Obter aprovação explícita do usuário.
5. Retirar apenas as declarações dos packs clássicos do `system.json`; não apagar o histórico Git.

## Ordem recomendada resumida

1. Testar a instalação limpa da RC8 no segundo PC.
2. Auditar as criaturas por categoria.
3. Gerar a lista de criaturas ausentes no site.
4. Ressincronizar as quatro magias corrigidas.
5. Completar Reino de Tagmar e ambientação.
6. Fazer auditoria conjunta dos compêndios revisados.
7. Executar testes funcionais finais.
8. Consolidar a documentação de atualização.
9. Publicar nova RC.
10. Integrar à `main` após aprovação.
11. Retirar o clássico somente no encerramento definitivo.

## Definição de pronto do projeto

O projeto estará pronto quando uma instalação limpa do sistema puder ser atualizada a partir do GitHub, carregar todos os compêndios sincronizados, permitir criar personagens e NPCs completos, fornecer todas as regras oficiais para consulta e não depender do compêndio clássico para nenhuma funcionalidade necessária — sem perder as automações existentes e sem inventar regras ausentes nas fontes oficiais.
