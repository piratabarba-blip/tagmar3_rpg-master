# Compatibilidade com Theatre Inserts

O sistema aplica um adaptador em memória quando o Theatre **original 3.4.2** está ativo, com PIXI 7 e libWrapper disponível. Não é preciso instalar uma cópia modificada do módulo.

- WebM no palco: reprodução sem áudio, em repetição; pausa quando o retrato deixa o palco.
- Miniatura e imagem do editor de chat: imagem estática de `Actor.img`, com ícone de reserva se ausente.
- O vídeo continua escolhido nas configurações do Theatre. O vídeo da ficha Tagmar e o retrato do Theatre são escolhas independentes.
- PNG/WebP/GIF continuam usando o carregador original. Texturas de vídeo do adaptador não alteram o cache compartilhado com tokens.
- Nada é gravado em atores, mundos ou arquivos do Theatre. Não há dependência obrigatória nova.
- Em versões não testadas, o adaptador não é aplicado; o Theatre mantém seu comportamento original e registra um aviso no console.

## Arquitetura

`modules/compat/theatre.js` registra wrappers identificados pelo ID do sistema no libWrapper. A inicialização aguarda o término de `renderChatLog` porque é nesse hook que o Theatre expõe sua classe. Um observador restrito à barra/capa do Theatre corrige miniaturas após alterações na configuração. O código é o mesmo nos dois sistemas.

`theatre-media.js` gerencia exclusivamente os vídeos criados pelo adaptador. Não substitui PIXI.Assets.load nem registra suas texturas no cache global.

## Validação

`tools/test-theatre-compat.cjs` executa teste isolado em Edge com o bundle **original**, PIXI real e documentos fictícios. Simula a API de encadeamento do libWrapper e as interfaces do Foundry necessárias ao teste; não substitui um teste completo dentro de um mundo.

Definir `TAGMAR_TEST_NODE_MODULES` para a pasta que contém Playwright. O PIXI é lido de `TAGMAR_TEST_PIXI_URL` (padrão: `http://localhost:30000/scripts/pixi.min.js`). Executar:

```powershell
node tools/test-theatre-compat.cjs <pasta-do-sistema> <module.js-original-do-Theatre>
```

Casos: módulo desativado, versão desconhecida, inicialização tardia, instalação idempotente, inclusão original na barra, troca de miniaturas, cache da configuração, quadros diferentes no palco sem tweens, repetição, remoção/retomada, troca por PNG e ativação durante carregamento.

O Theatre original é mantido pela League of Foundry Developers: https://github.com/League-of-Foundry-Developers/fvtt-module-theatre. Esta integração pertence ao Tagmar e não é uma distribuição alternativa do Theatre.

## Publicação

Incluída no XXX 2.7.0-v14.1-rc.47 e no oficial 2.7.0-v14.1-official.35. Além dos testes isolados, o mantenedor confirmou o funcionamento no seu mundo antes de autorizar esta publicação. Recarregar os clientes após atualizar o sistema. Não é necessário substituir o Theatre nem instalar um fork.
