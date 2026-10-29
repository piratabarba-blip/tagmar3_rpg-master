<!-- tagmar-beta-migration-notice -->
> [!IMPORTANT]
> **Instalou a prévia de Combate em Grande Escala? Confira sua versão.**
>
> Na tela inicial do Foundry, abra **Sistemas de Jogo** e confira o número no cartão do sistema. Se aparecer **`2.7.0-v14.1-rc.56-beta.1`** ou outro número com **`beta`**, você está usando uma prévia. A versão definitiva publicada em 29/10/2026 é **`2.7.0-v14.1-rc.61`**.
>
> Para sair da beta com manifesto fixo, copie o [manifesto permanente](https://raw.githubusercontent.com/piratabarba-blip/tagmar3_rpg-master/refs/heads/v14/system.json), abra **Instalar Sistema → URL do Manifesto**, cole o endereço e instale. Faça isso uma única vez; as próximas versões poderão ser recebidas pelo botão **Atualizar**.
>
> **Não desinstale o sistema nem apague mundos ou fichas.** Faça backup do mundo antes de atualizar. Quem já usa o manifesto permanente pode atualizar normalmente; quem instalar agora por ele recebe a versão atual.
<!-- /tagmar-beta-migration-notice -->

# Tagmar XXX para Foundry VTT 14

Edição pessoal do **Tagmar 3** para Foundry Virtual Tabletop 14. Reúne fichas, compêndios sincronizados, coleções antigas para consulta e integrações visuais próprias desta edição. Não é o pacote de distribuição oficial.

Este guia apresenta a instalação, o primeiro personagem, o conteúdo dos compêndios e as integrações da edição pessoal. A referência desta documentação é a versão **2.7.0-v14.1-rc.61**, com identificador **`tagmar_rpg`**.

**Onde está o código atual?** Na [branch v14](https://github.com/piratabarba-blip/tagmar3_rpg-master/tree/v14). A branch `main`, exibida na página inicial, preserva código histórico; este README também aparece nela para orientar a instalação atual. Para instalar o XXX, use o manifesto da V14 indicado abaixo, não o `system.json` histórico da `main`.

### Atualização de 29/10/2026

Integração com **Tagmar Efeitos Mágicos 1.2.0**: animações JB2A opcionais, áreas posicionáveis, ataques individuais com críticos, resumo final, filtro de aliados e tempo de magias na aba Efeitos. A iluminação pode acompanhar o visual. Configure cada item pelo botão **FX**; os recursos novos começam desativados por item. [Leia o guia completo](https://github.com/piratabarba-blip/modulos_foundry/blob/v14/tagmar-token-fx/GUIA-XXX.md).

Atualize também **Grande Calendário 1.1.3** e **Gestão de Munições 1.2.3-v14.1**. O relógio automático do calendário pausa durante o combate para evitar descontar o tempo duas vezes; cada rodada continua valendo 15 segundos. A janela de munições aceita Enter nos campos sem erro nem fechamento.

Os compêndios e as mídias distribuídas são os mesmos da versão anterior.

### Ferramentas de mapa

Integradas ao sistema, sem instalar outro módulo:

- **Mover a barra de macros:** arraste pela alça de pontos à esquerda da hotbar. O botão de seta curva restaura a posição original. A posição fica salva neste navegador, separadamente por usuário e mundo, e se ajusta ao tamanho da janela e à escala da interface. A alça também aceita as teclas de seta; Esc cancela um arraste.
- **Reorganizar macros:** com a hotbar desbloqueada, arraste o ícone de uma macro para outro espaço. O Foundry move o atalho ou troca os atalhos quando o destino está ocupado. Arrastar itens para criar macros de rolagem Tagmar continua funcionando.

- **Escala da imagem em grupo:** selecione os tokens, deixe o mouse sobre o mapa e segure **G + roda**. Sem seleção, ajusta o token sob o mouse. Mantém o espaço ocupado na grade, posição, proporções e espelhamento. Cada passo aumenta ou diminui proporcionalmente a escala; não iguala tokens de tamanhos diferentes.
- **Restaurar escala:** **G + 0** (zero superior ou numérico) recupera a escala guardada antes do primeiro ajuste. A referência fica no token da cena e permanece após recarregar. Não altera o token de protótipo nem a ficha do ator.
- **Apontador:** segure **P** com o mouse sobre o mapa para mostrar a manopla dourada aos participantes na mesma cena e andar. Solte para esconder. Não move câmeras nem revela áreas do mapa. O apontador desaparece também ao sair da janela ou trocar de cena; uma mensagem perdida expira em cerca de 1,6 segundo.
- **Barras do Bar Brawl:** em **Configurações do jogo → Tagmar → Mapa — exibição das barras (Bar Brawl)**, escolha configuração individual (padrão), somente ao passar o mouse ou mouse/seleção. A escolha vale para todos os tokens do mundo e para todos os participantes. Preserva barras secretas, permissões de dono/mestre e restrições de barra cheia, vazia ou em combate. Nos dois modos globais, Alt sozinho não revela todas as barras. Voltar à configuração individual restaura o comportamento original sem regravar tokens ou recarregar o mundo. A integração requer Bar Brawl ativo e atua nas barras do mapa 2D; não altera os campos de recursos no HUD nem as fichas.

Em **Configurações do jogo → Tagmar**, procure as opções iniciadas por **Mapa**: ativação de cada recurso, autorização de jogadores para usar o apontador, passo da escala e formato Manopla dourada/Seta. As teclas **G**, **P** e de restauração podem ser remapeadas em **Configuração de controles**. **Ajustar e restaurar a escala com esta ferramenta é exclusivo do mestre**, inclusive em tokens pertencentes a jogadores. Todos veem o apontador; jogadores autorizados a apontar também precisam da permissão nativa de pings.

A escala fica entre 20% e 500% nos dois eixos; proporções já fora dessa faixa que não possam ser preservadas são ignoradas. A roda sobre formulários ou sem G pressionado permanece inalterada. G pode ser remapeado em Configuração de controles caso haja um atalho personalizado concorrente.

Recursos validados com testes automatizados e confirmados em sessão real de Foundry 14.369 pelo mantenedor.

## Veículos e armas de guerra

Crie um ator **Veículo / Máquina** para embarcações, carroças e máquinas de guerra. A ficha usa ABS, ARM, VB, tripulação, pertences e biografia, com o mesmo padrão visual das demais fichas.

Na aba **Combate**, monte itens **Arma de Guerra**, configure a defesa e os ajustes e clique no nome da arma para atacar. Vincule vários personagens às armas e manobras, com busca por nome e habilidade, e escolha quem fará cada teste; os vínculos mostram nível e total atual. O mestre também pode informar um total manual.

Este recurso é uma **adaptação extraoficial**, com valores definidos pela mesa. [Consulte o guia de veículos e armas de guerra](docs/veiculos.md).

## Índice

- [Instalação e primeiro mundo](#instalação-e-primeiro-mundo)
- [Primeiros passos com as fichas](#primeiros-passos-com-as-fichas)
- [Compêndios incluídos](#compêndios-incluídos)
- [Módulos obrigatórios](#módulos-obrigatórios)
- [Como usar os módulos Tagmar](#como-usar-os-módulos-tagmar)
- [Efeitos Mágicos — XXX e Token Magic FX](#efeitos-mágicos--xxx-e-token-magic-fx)
- [Integrações opcionais](#integrações-opcionais)
- [Tesouros em Tagmar](#tesouros-em-tagmar)
- [Atualização e solução de problemas](#atualização-e-solução-de-problemas)
- [Autoria e histórico](#autoria-e-histórico)
- [Licenciamento e conteúdo](#licenciamento-e-conteúdo)

## Instalação e primeiro mundo

### 1. Confira os requisitos

- Foundry VTT **14**, verificado pelo pacote na compilação **14.369**. Esta versão do sistema não declara suporte às gerações anteriores nem à V15.
- Acesso de administrador para instalar pacotes e de Mestre para configurar o mundo.
- Uma instalação licenciada do Foundry. O sistema Tagmar é gratuito; a licença do Foundry é separada.
- Backup dos mundos e dos arquivos de campanha antes de atualizar qualquer instalação existente.

**Já possui um mundo antigo do XXX?** Esta edição mantém o identificador `tagmar_rpg`. Faça backup e teste a atualização numa cópia do mundo antes de abrir a campanha principal. Não altere o identificador para o de outro sistema nem misture pastas de instalações diferentes.

### 2. Instale o sistema

1. Na tela inicial do Foundry, abra **Sistemas de Jogo / Game Systems**.
2. Clique em **Instalar Sistema / Install System**.
3. Em **URL do Manifesto / Manifest URL**, cole o endereço abaixo.
4. Clique em **Instalar** e aceite a instalação das dependências oferecidas.

```text
https://raw.githubusercontent.com/piratabarba-blip/tagmar3_rpg-master/refs/heads/v14/system.json
```

Use esse endereço para acompanhar as atualizações do XXX. Ele é um manifesto JSON, não o endereço da página do GitHub nem um ZIP. A instalação por manifesto pode ser usada independentemente de o sistema já aparecer na busca do catálogo.

Para instalar especificamente a versão de referência deste guia, use o [manifesto da rc.60](https://github.com/piratabarba-blip/tagmar3_rpg-master/releases/download/v2.7.0-v14.1-rc.61/system.json). Para acompanhar atualizações, prefira o endereço permanente da branch **v14** acima; um manifesto preso a uma versão antiga pode não servir como canal contínuo de atualização.

### 3. Crie e abra um mundo

1. Vá a **Mundos de Jogo / Game Worlds → Criar Mundo / Create World**.
2. Informe um nome e selecione **Tagmar XXX** como sistema, com identificador `tagmar_rpg`.
3. Crie o mundo, inicie-o e entre como Mestre.
4. Um mundo sem cenas recebe uma **Cena Inicial** neutra. Ela não é um mapa de aventura: serve de área inicial para colocar tokens e testar as fichas.

### 4. Ative os módulos no mundo

Abra **Configurações do Jogo → Gerenciamento de Módulos**, confira os dez [módulos obrigatórios](#módulos-obrigatórios), ative-os e salve. Aceite a recarga solicitada.

Instalar um módulo e ativá-lo em um mundo são etapas diferentes. Se faltar alguma dependência, volte à tela inicial, entre em **Módulos Complementares → Instalar Módulo** e use o manifesto da tabela abaixo. Os nomes dos menus podem variar conforme a tradução do Foundry.

Os procedimentos gerais também estão nos guias do Foundry: [instalar sistemas e criar mundos](https://foundryvtt.com/article/tutorial/) e [gerenciar módulos](https://foundryvtt.com/article/modules/).

## Primeiros passos com as fichas

### Crie um personagem

1. Na aba **Atores**, clique em criar um ator e escolha o tipo **Personagem**.
2. Abra **Compêndios → Tagmar — Criação de Fichas (Edição Sincronizada)**.
3. Localize a raça e a profissão desejadas e arraste os itens para a ficha.
4. Acrescente habilidades, grupos/armas de combate, técnicas, magias, defesas e pertences conforme as escolhas permitidas pelas regras.
5. Confira atributos, estágio, níveis, recursos e equipamento. As somas e rolagens automatizadas auxiliam o preenchimento; não substituem as escolhas de criação nem a conferência do Mestre.
6. Nas permissões do ator, dê ao jogador controle de sua ficha. Nas configurações do usuário, atribua o personagem correspondente.
7. Arraste o ator da lista para a cena para criar seu token.

As fichas organizam atributos e recursos na parte básica e possuem áreas de **Habilidades, Combate, Magia, Pertences e Efeitos**, além das informações de interpretação. Use os controles de rolagem da ficha para enviar os resultados ao chat.

Para uma criatura pronta, importe uma ficha do compêndio **Criaturas de Tagmar** para Atores e arraste-a para a cena. Há também os tipos de ator **NPC** e **Inventario**; este último é destinado a fichas de inventário, não a personagens de jogador.

### Quantidade e inventário

Um pertence pode representar várias unidades: por exemplo, um único item **Tochas** com **Quant: 10**. A quantidade fica no campo `system.quant`. Altere a cópia que pertence ao personagem, não apenas o item de referência no compêndio.

Não confunda quantidade, peso e texto descritivo. Escrever “10 unidades” na descrição não altera o campo Quant. O consumo por módulos precisa apontar para o campo numérico correto.

### Ajustes úteis do sistema

Em **Configurações do Jogo → Configurar o Jogo → Tagmar XXX**, confira:

- **Ficha:** aparência da ficha, incluindo as opções Sem Imagem, Tema Escuro e Tema Foundry.
- **Barras automáticas (Bar Brawl):** cria barras ao criar tokens de Personagem, NPC ou ambos. Alterar essa opção não equivale a reconstruir os tokens já existentes.
- **Setar Def. Oponente ao marcar target:** com seu token controlado, marcar um oponente como alvo permite preencher sua defesa automaticamente.
- **Modificar ajuste manualmente:** quando ativado, desliga o cálculo automático dos ajustes da ficha de Personagem. Deixe desativado se quiser esse cálculo automático.
- **Tamanho da fonte do chat**, **Dados coloridos (Dice So Nice)** e **PopOut TurnOrder automático:** preferências de apresentação.

Algumas opções são individuais por usuário; outras, como as barras automáticas e o ajuste manual, são do mundo.

## Compêndios incluídos

O pacote contém **15 compêndios: um de personagens prontos exclusivo do XXX, nove sincronizados, três antigos e dois de Combate em Grande Escala**. As quantidades das coleções de referência foram conferidas nos bancos da rc.50; Personagens Prontos foi atualizado na rc.58. As contagens representam documentos principais, sem somar pastas, páginas de diários ou itens internos dos atores. Prefira os sincronizados para conteúdo novo.

### Personagens prontos — exclusivo do XXX

**Tagmar XXX — Personagens Prontos** contém **329 PNJs**, organizados em **37 pastas**, com **15.585 itens internos** de habilidades, equipamentos, magias e demais recursos das fichas. Esta coleção é uma criação da mesa para a edição XXX; não é um novo suplemento oficial e não é incluída no sistema Tagmar 3ER Oficial.

| Pasta principal | Personagens | Organização |
| --- | ---: | --- |
| PESSOAS COMUNS | 28 | Homens, mulheres e aldeões lutadores. |
| PJM - VARIADOS | 175 | Guerreiros, ladinos, rastreadores, elfos sombrios, anões, nobres e guardas de vilarejo. |
| MAGOS | 24 | Alquímico, Elemental, Naturalista, Conhecimento, Necromântico e Ilusões. |
| ENVIADOS | 102 | 17 divisões por divindade/aspecto, com seis Enviados em cada uma. |

**Para usar:** abra **Compêndios → Tagmar XXX — Personagens Prontos**, encontre a ficha pela pasta ou busca e importe para **Atores**. Depois arraste o ator para o mapa e ajuste nome, estágio, equipamento e permissões conforme sua aventura.

Os **102 Enviados** incluem **102 retratos e 94 tokens animados**. As outras oito fichas usam o retrato estático como token. As animações de distribuição foram comprimidas mantendo resolução, quadros e transparência; as fichas conservam os IDs e a escala preparada pela mesa.

Retratos e tokens animados acompanham o sistema; as fichas não dependem dos arquivos particulares do mundo onde foram criadas. Atualizar o sistema disponibiliza o compêndio, mas não substitui os atores que você já importou ou editou. A coleção conserva os valores definidos pela mesa; confira o equilíbrio e as adaptações antes de usar.

### Os nove compêndios sincronizados

| Compêndio | Conteúdo e finalidade | Quantidade |
| --- | --- | ---: |
| **Tagmar — Criação de Fichas (Edição Sincronizada)** | Raças, profissões, habilidades, combate, defesas, técnicas, magias, pertences, transportes e material de apoio para criaturas. | 1.568 itens |
| **Reino de Tagmar — Referências Oficiais (Edição Sincronizada)** | Reinos, regiões, povos, culturas, deuses, calendário, história, cronologias e organizações. | 46 diários |
| **Objetos Mágicos — Itens Oficiais (Edição Sincronizada)** | Objetos para adicionar às fichas: joias, vestimentas, armas, proteções, cetros, cajados, poções, elixires e outros objetos. | 137 itens |
| **Objetos Mágicos — Guia e Regras (Edição Sincronizada)** | Introdução, orientações e referências do catálogo de objetos mágicos. | 10 diários |
| **O Império — Referências Oficiais (Edição Sincronizada)** | Povos, cidades-estado, Império Aktar, deuses, cronologia, tradições mágicas, organizações e guias de criação de personagem. | 26 diários |
| **Criaturas de Tagmar — Edição Oficial Sincronizada** | Fichas de NPCs organizadas por famílias de criaturas, prontas para importar e adaptar à aventura. | 414 atores |
| **Registro de Datas** | Datas sagradas e profanas para consulta durante a campanha. | 56 diários |
| **Terras Selvagens — Criação de Fichas (Edição Sincronizada)** | Raças, profissões, magias, combate, defesas, pertences e técnicas dessa região. | 963 itens |
| **Terras Selvagens — Regras (Edição Sincronizada)** | Criação de personagens, caracterizações, regiões mágicas, equipamentos e novas armas. | 5 diários |

### Os três compêndios antigos

Esses packs permanecem no XXX para consulta e continuidade de conteúdo legado. O próprio nome os identifica como **Edição Antiga — Desatualizada**; não os trate como a referência atual das regras.

| Compêndio | Conteúdo | Quantidade |
| --- | --- | ---: |
| **Tagmar — Criação de Fichas (Edição Antiga — Desatualizada)** | Raças, profissões, habilidades, combate, defesas, técnicas, magias, pertences e transportes da coleção anterior. | 1.764 itens |
| **Criaturas e Arquétipos (Edição Antiga — Desatualizada)** | 405 NPCs, 18 personagens e 16 inventários; inclui pastas de criaturas, arquétipos, vendedores, corpos para saque e baús. | 439 atores |
| **Terras Selvagens (Edição Antiga — Desatualizada)** | Coleção anterior de magias, defesas, combate e profissões. | 179 itens |

Os **414 atores do compêndio sincronizado** e os **439 atores antigos** não representam 853 criaturas diferentes: há sobreposição, personagens e inventários entre as coleções. Ao importar um arquétipo antigo, confira os itens e as regras antes de usá-lo em jogo.

### Onde procurar cada tipo de conteúdo

**Criação de Fichas** está dividido em pastas de Raças, Profissões, Habilidades, Combate, Defesa, Técnicas de Combate, Magias, Magias Ancestrais, Magias Perdidas, Pertences e Afins e material de apoio à criação de criaturas. Seus documentos são:

- 6 raças e 6 profissões;
- 42 habilidades e 132 técnicas de combate;
- 210 itens de combate e 35 defesas;
- 776 documentos de magia;
- 320 pertences e 41 transportes.

**Terras Selvagens** acrescenta 7 raças, 7 profissões, 321 documentos de magia, 127 itens de combate, 86 defesas, 413 pertences e 2 técnicas. Os números são registros do compêndio: não significam necessariamente magias diferentes, pois podem existir entradas por nível ou variação.

**Criaturas** reúne animais, animais gigantes e sombrios, dragões, dragões imperiais, hidras, elementais, licantropos, mortos-vivos, monstros, raças civilizadas, selvagens e gigantes, além de criaturas artificiais, vegetais, divinas, infernais, místicas e de Dartel. Confira o retrato e o token depois de importar: conteúdos antigos podem depender de caminhos de imagens específicos da instalação. Não conte com a atualização do sistema para recuperar arquivos particulares da campanha.

Os diários são material de consulta. Arrastar um diário do Império para a ficha não o transforma em uma raça ou magia utilizável: para isso, procure o documento do tipo Item nos compêndios de criação.

### Como usar sem alterar o material de referência

- Abra um compêndio e pesquise o nome do conteúdo desejado.
- Para equipar um personagem, arraste o item para a ficha. Para uma criatura, importe o ator para o mundo.
- Para personalizar conteúdo, trabalhe na cópia importada no mundo. Evite desbloquear e editar os compêndios distribuídos com o sistema: uma atualização pode substituir esses arquivos.
- Importe somente o necessário. Não é preciso copiar todos os compêndios para começar uma aventura.
- **Criaturas**, **Criaturas e Arquétipos (Edição Antiga)** e **Registro de Datas** são inicialmente restritos ao Mestre no manifesto. Compartilhe apenas o conteúdo que desejar disponibilizar aos jogadores.

Consulte também o [guia de compêndios do Foundry](https://foundryvtt.com/article/compendium/).

## Módulos obrigatórios

Estes **dez módulos são declarados como dependências pelo sistema**, não apenas sugestões. Os links abrem os manifestos usados na distribuição compatível; copie o endereço do link para **Instalar Módulo → URL do Manifesto** quando precisar instalar manualmente.

| Módulo | Função | Versão de referência | Manifesto |
| --- | --- | --- | --- |
| **Bar Brawl** | Barras de recursos nos tokens; integração com a criação automática de barras do Tagmar. | **1.9.3.1**, mínimo exigido | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/barbrawl/module.json) |
| **libWrapper** | Biblioteca de integração entre recursos e módulos. | 1.13.5.1 | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/lib-wrapper/module.json) |
| **Dice So Nice** | Dados 3D e cores dos resultados nas rolagens do sistema. | 6.2.9 | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/dice-so-nice/module.json) |
| **socketlib** | Biblioteca de comunicação utilizada por módulos. | v1.1.4 | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/socketlib/module.json) |
| **Polyglot** | Idiomas no chat, com provedor de línguas registrado pelo Tagmar. | 2.9.2 | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/polyglot/module.json) |
| **Tagmar Gestão de Munições** | Cadastro e compartilhamento de reservas de munição entre armas. | 1.2.3-v14.1 | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-ammu-nation/module.json) |
| **Tagmar Transações** | Envio de pertences para outro jogador conectado e com personagem atribuído. | 1.2.3-v14.1 | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmartrade/module.json) |
| **Tagmar — Grande Calendário** | Calendário, dia/noite, clima, vento, luas e marés. | **1.1.3**, mínimo exigido | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-calendario/module.json) |
| **Token Magic FX** | Motor original de filtros visuais nos tokens. | **0.8.4**, versão exigida | [Instalar](https://github.com/Feu-Secret/Tokenmagic/releases/download/0.8.4/module.json) |
| **Tagmar Efeitos Mágicos — XXX** | Integra os filtros às magias, técnicas e itens de combate do XXX. | **1.2.0**, mínimo exigido | [Instalar](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-token-fx/module.json) |

Versões de referência não são uma promessa de compatibilidade com qualquer versão futura. Use os manifestos declarados pelo sistema e confira as notas antes de trocar uma distribuição. A edição indicada do **Bar Brawl** inclui uma correção para atualizações parciais de token, relevante para efeitos de iluminação.

Os módulos de terceiros preservam seus autores e suas licenças originais. Estar nesta tabela não transfere sua autoria aos mantenedores do sistema.

## Como usar os módulos Tagmar

### Gestão de Munições

1. Na ficha de **Personagem**, abra **Combate → Gestão de munições**.
2. Cadastre o nome da munição e a quantidade disponível, por exemplo, “Flechas comuns” e `20`.
3. Abra a edição de uma arma da ficha e selecione a munição no campo acrescentado pelo módulo.
4. Armas vinculadas ao mesmo cadastro compartilham a reserva. Confira o desconto ao realizar um ataque que use essa munição.
5. Para corrigir ou repor o estoque, cadastre o mesmo nome com o **novo total**. Esse valor substitui o saldo; não é um acréscimo automático.

Esse cadastro de munição é separado da quantidade dos pertences usada pelo Light Sources.

### Transações

1. Os jogadores precisam estar conectados, com seus personagens atribuídos nas configurações dos usuários.
2. Na aba **Pertences**, use o ícone **Mandar para amigo** ao lado do item.
3. Escolha o jogador destinatário e uma quantidade positiva, sem exceder o estoque, e clique em **Enviar**.
4. Confira as duas fichas. A quantidade enviada é retirada da origem e incluída no personagem atribuído ao destinatário. Ao enviar todo o estoque, o item é removido da ficha de origem.

O seletor de destinatários não inclui usuários offline, sem personagem atribuído ou Mestres. Teste inicialmente com um item comum de baixo valor e não use esta função como substituto de um backup.

### Grande Calendário

**Módulo recomendado: Tagmar — Grande Calendário 1.1.3**, verificado no Foundry **14.369**. Ele já integra as dependências obrigatórias deste sistema; esta recomendação destaca os recursos disponíveis e não altera os requisitos de instalação.

- Dia/noite gradual, estações e clima por bioma, latitude e altitude.
- Velocidade e direção do vento, fases/movimentos das três luas e marés lunares.
- Clima e marés sempre visíveis no calendário, mesmo sem efeitos meteorológicos no mapa.
- Região climática preenchida automaticamente pelo **título do mundo**: cenas com os mesmos parâmetros geográficos compartilham a previsão.
- Em **Configurar cena → Ambiente**, marque **Mapa interno — somente dia e noite** para suspender os efeitos meteorológicos no mapa e manter as informações no calendário.

Na primeira entrada de um mestre após atualizar, o preset habilita dia/noite, clima automático e efeitos visuais nas cenas existentes, preservando parâmetros geográficos/lunares e guardando os ajustes anteriores. Essa aplicação ocorre uma única vez; mundos que já receberam o preset nas prévias 1.1.1-beta.2/3 não são redefinidos. Faça backup do mundo antes da atualização. O relógio não começa a avançar sozinho.

Atualize em **Módulos adicionais** ou use o [manifesto permanente](https://raw.githubusercontent.com/piratabarba-blip/modulos_foundry/v14/tagmar-calendario/module.json). Mantenha **libWrapper ativo** para a transição de clima sem redesenhar o mapa e recarregue os clientes após atualizar. Consulte o [guia completo de configuração](https://github.com/piratabarba-blip/modulos_foundry/blob/v14/tagmar-calendario/README.md).

- Abra pelo botão do calendário nas ferramentas de Token. Como alternativa, uma macro do tipo Script pode usar:

  ```js
  game.modules.get("tagmar-calendario").api.open();
  ```

- O Mestre pode definir a data e avançar o relógio; os jogadores acompanham o calendário e podem solicitar avisos públicos.
- Consulte festividades e fases de **Agmarim, Armina e Denégria**. O módulo contempla os meses de Tagmar e o Dia de Cruine.
- O relógio é sincronizado com o tempo do mundo do Foundry. Avançá-lo pode afetar outros módulos que contam duração por esse mesmo relógio, como o Light Sources quando configurado dessa maneira.
- O painel pode ser movido, redimensionado e minimizado. Confira as mensagens agendadas e a velocidade do relógio antes de deixar o avanço automático ligado.

### Efeitos Mágicos — XXX e Token Magic FX

Os dois módulos são dependências do XXX desde a rc.48, mas **os efeitos por item vêm desligados**. Instalar os módulos não configura automaticamente suas magias.

1. Ative **Token Magic FX 0.8.4**, **Tagmar Efeitos Mágicos — XXX** e libWrapper no mundo, e recarregue o cliente.
2. Na ficha de um Personagem ou NPC, abra um item **Magia**, **Tecnica_Combate** ou **Combate**.
3. Clique em **FX**, no cabeçalho do item.
4. Escolha como destino o próprio ator ou os **alvos marcados**; selecione um filtro e clique em **Testar**. Esse botão não rola dados nem salva a escolha.
5. Use **Salvar** para guardar a configuração. Para aplicar durante o uso, marque **Aplicar também ao usar/rolar este item** e salve.
6. Use **FX → Remover** para retirar os efeitos daquele item na cena atual. O botão **Limpar FX** da ficha limpa os efeitos dos itens atuais do ator, inclusive sobre alvos, preservando filtros de outras fontes.

**Limites importantes:**

- Os filtros Token Magic são visuais. A seção de resolução opcional permite ataques, RM/RF, dano por alvo e avisos de duração; JB2A permite projéteis, efeitos na área e luz. As regras de cada magia precisam ser configuradas pelo mestre: não há leitura automática da descrição.
- O gatilho visual acontece no início do uso do item; cancelar a rolagem depois não remove o filtro.
- Filtros Token Magic persistem até a remoção manual. Visuais JB2A podem terminar pelo calendário; o tempo restante aparece na aba Efeitos. Limpe os efeitos **antes** de desativar o módulo ou apagar o item.
- A limpeza da ficha se limita à cena aberta e aos efeitos identificados por essa integração. Efeitos antigos sem identificação ou de itens já apagados podem exigir tratamento separado.
- Jogadores só alteram tokens que possuem; o Mestre deve aplicar filtros nos alvos de terceiros. A integração não contorna permissões.
- Se houver vários tokens vinculados ao mesmo ator, selecione exatamente o token que deseja usar.
- Não ative outra cópia da integração antiga ao mesmo tempo. O manifesto limita o Token Magic FX à **0.8.4**; não remova essa restrição apenas para forçar uma atualização.

Consulte o [guia específico dos efeitos no XXX](https://github.com/piratabarba-blip/modulos_foundry/blob/v14/tagmar-token-fx/GUIA-XXX.md). Token Magic FX é um projeto independente de SecretFire e colaboradores; a integração Tagmar preserva os créditos de Marcos Walker e da adaptação de Pirata.

## Integrações opcionais

Os módulos abaixo **não são instalados como dependências obrigatórias**. Ative-os somente se quiser esses recursos. Esta lista documenta integrações específicas; não certifica todos os módulos do catálogo nem todas as combinações possíveis.

### Light Sources — luzes e consumo de tochas

Referência conferida: **Light Sources 0.8.0**, de Mestre Digital. Instale o módulo original pelo seu [manifesto](https://github.com/brunocalado/light-sources/releases/latest/download/module.json) ou consulte seu [repositório](https://github.com/brunocalado/light-sources). Esse manifesto acompanha as versões do autor; se receber uma versão posterior, confira as mudanças antes de usar o tutorial.

Na **rc.50 publicada**, o sistema traduz os cartões de chat do Light Sources para pt-BR, sem alterar os arquivos originais do módulo. A interface de configuração ainda pode aparecer em inglês; por isso os nomes originais dos controles também são indicados abaixo. Selecione Português (Brasil) no Foundry e recarregue os clientes depois de atualizar.

**Configuração inicial pelo Mestre:**

1. Ative Light Sources no mundo e abra suas configurações.
2. Entre em **Configurar Compatibilidade do Sistema / Configure System Compatibility**.
3. Em tipos de item, habilite **Pertence**; habilite **Magia** também se quiser cadastrar luzes mágicas.
4. Em tipos de ator, habilite **Personagem** e, se desejado, **NPC**.
5. Em **Quantidade e Cargas / Quantity**, preencha o caminho da quantidade com **`system.quant`** e salve. Não use `system.quantity`, pois esse não é o campo de quantidade dos pertences do Tagmar.
6. Em **Configurar Fontes de Luz / Configure Light Sources**, arraste o item que será cadastrado, como **Tochas**.
7. Configure o padrão: raio de penumbra, luz plena, cor e animação. Os raios devem respeitar a escala e a unidade de distância da cena.
8. Na aba **Consumption / Consumo**, para tochas empilhadas, escolha o modo de consumo de **uma unidade do item** (modo `copy`), não o de cargas. Defina a duração conforme as regras adotadas; por exemplo, `60` minutos para uma tocha de uma hora.
9. Escolha se a duração conta pelo **tempo do mundo** ou pelo **tempo real**. Salve e coloque o item no inventário do personagem com Quant maior que zero.
10. Abra os controles do token (HUD, normalmente com clique direito), escolha a fonte cadastrada e acenda-a pelo controle do módulo.

**Exemplo:** Tochas com Quant `10` passa a `9` ao acender uma nova unidade. A luz acesa é a unidade já consumida, separada do estoque: trocar seu padrão, deixá-la no chão e recolhê-la não deve gastar outra unidade. Com estoque zero, não há outra unidade para acender; a luz já acesa pode permanecer até ser apagada ou terminar sua duração.

Nas versões antigas do módulo, a opção de consumo aparecia como **Consume on Use**. Na 0.8.0 há modos de consumo diferentes. Para esse exemplo, não escolha cargas nem **Livre para todos / Free for All**, pois não representam o estoque de tochas do personagem. Configure luzes mágicas e lanternas separadamente, sem presumir que devam consumir uma cópia do item.

Se a luz não aparecer, confira o item no ator, a quantidade, os tipos habilitados, os raios, os efeitos ativos e a iluminação da cena. O módulo pode aplicar luz por efeitos; olhar apenas os valores básicos da aba Luz do token não basta para concluir que não existe uma fonte ativa. Se usar tempo do mundo, o contador depende do avanço desse relógio.

### Theatre Inserts — retratos no palco

Referência da integração: **Theatre Inserts original 3.4.2**, com libWrapper e PIXI 7. O sistema contém um adaptador para vídeo WebM no palco, mantendo imagens estáticas nas miniaturas e no editor do chat.

Instale e configure o [Theatre original](https://github.com/League-of-Foundry-Developers/fvtt-module-theatre). O vídeo escolhido para a ficha Tagmar e o retrato escolhido no Theatre são configurações independentes. Não é necessário substituir o módulo por uma cópia modificada.

Em versões não reconhecidas, o adaptador não é aplicado; isso não garante a compatibilidade do Theatre com a instalação. Consulte os [detalhes e limites da integração](https://github.com/piratabarba-blip/tagmar3_rpg-master/blob/v14/docs/theatre-compat.md).

### Drag Ruler — integração legada, não validada para V14

O código do XXX preserva um provedor de velocidade para Drag Ruler, mas isso **não comprova compatibilidade com o Foundry 14**. A cópia 1.14.2 conferida no repositório auxiliar declara suporte somente até a V12 e não é dependência desta edição. Não force sua instalação nem altere o manifesto para ignorar a restrição.

## Tesouros em Tagmar

O gerador de tesouros é um recurso do **próprio sistema**, não outro módulo obrigatório.

1. Como Mestre, abra **Configurar o Jogo → Tagmar XXX → Tesouros em Tagmar → Abrir gerador**, ou use o botão de gema nas ferramentas de Token.
2. Confira a aba **Propriedades** e as opções da aba **Gerar tesouro**.
3. Escolha a modalidade desejada: moedas, objetos comuns, mágicos ou mistos, e ajuste os filtros de objetos e propriedades.
4. Clique em **Gerar prévia** e revise os resultados. Opções de história e maldição devem ser conferidas pelo Mestre antes de compartilhar o conteúdo.
5. Só depois clique em **Criar este tesouro no Foundry** para gravar os documentos. Gerar uma prévia não equivale a entregar um item a um personagem.

Os resultados gerados precisam de revisão e adaptação à aventura; não devem ser confundidos com as entradas de referência dos livros. O gerador também possui rolagem participativa pelo chat, preparada pelo Mestre, para que um jogador revele o tesouro.

## Atualização e solução de problemas

### Atualizar com segurança

1. Faça backup do mundo e dos arquivos associados à campanha.
2. Retorne à tela inicial do Foundry e verifique atualizações do sistema e dos módulos.
3. Confira as [notas de versão](https://github.com/piratabarba-blip/tagmar3_rpg-master/releases), especialmente dependências e mudanças de identificador.
4. Teste em uma cópia da campanha antes de atualizar a mesa principal e recarregue os clientes após a atualização.

As cópias de itens e atores já importadas no mundo não devem ser tratadas como automaticamente sincronizadas com os novos compêndios. Compare as alterações antes de substituir conteúdo personalizado.

### Problemas frequentes

| Sintoma | O que conferir |
| --- | --- |
| O mundo acusa sistema ausente | Confira se aquela instalação tem o pacote `tagmar_rpg`. Reinstale o XXX na pasta de dados correta; não troque o ID do mundo pelo de outro sistema. |
| O portátil mostra uma versão antiga mesmo após buscar atualização | Confira o User Data Path daquela instalação e o manifesto do XXX instalado. A instalação principal e o portátil podem ter cópias diferentes. Faça backup antes de reinstalar. |
| Selo da versão aparece cinza | Confira o campo `compatibility.verified` e a compilação do Foundry. Verificação de compatibilidade não é a mesma coisa que o endereço usado para buscar atualizações. |
| FX não é aplicado | Confira os dois módulos de efeitos, a opção de aplicação automática no item, o token de origem e as permissões sobre o destino. |
| FX continua depois de desativar a opção | O filtro é persistente; use Remover ou Limpar FX antes de apagar o item ou desativar o módulo. |
| Um botão de módulo não aparece | Confira instalação, ativação no mundo, versão e tipo de ficha. Munições e Transações acrescentam controles nas fichas de Personagem. |
| Barras não aparecem num token existente | Ative Bar Brawl, confira a opção de barras automáticas e teste criando um token novo. |
| Tocha não desconta quantidade | Configure `system.quant`, consumo de uma unidade e um pertence dentro da ficha, com estoque disponível. |
| Luz não termina no tempo esperado | Confira minutos e o modo de contagem. Tempo do mundo e tempo real são diferentes. |
| Troca não oferece destinatários | É necessário outro jogador online, não Mestre, com personagem atribuído. |
| Jogador não vê a cena sem token | Em uma cena de apresentação, desative Visão do Token se quiser visibilidade sem depender de tokens. Isso mostra a cena inteira; não use em mapas onde deseja limitar exploração. |
| Erro 404 em imagem de um mundo | O caminho aponta para arquivo ausente ou movido. Reinstalar o sistema não recupera imagens particulares da campanha. |

Ao pedir ajuda, informe a versão do Foundry, a versão do sistema, os módulos ativos, o passo a passo e a mensagem de erro. Em uma cópia de teste, desative primeiro os módulos opcionais e reative-os um a um para localizar conflitos. Não compartilhe senhas, tokens de publicação ou dados privados.

Relate problemas no [repositório do XXX](https://github.com/piratabarba-blip/tagmar3_rpg-master/issues).

## Autoria e histórico

O **Tagmar XXX** é uma edição pessoal mantida separadamente. Seu identificador é `tagmar_rpg` e seu canal de atualização é a branch `v14` deste repositório. Esta documentação não é uma instrução de migração entre sistemas.

O sistema original para Foundry VTT foi desenvolvido por **Marcos Walker** e **Vinicius Fernandez**. Esta edição preserva essa autoria e deriva diretamente do trabalho original.

O trabalho desta atualização compreende principalmente:

- migração e compatibilidade com o Foundry VTT 14;
- criação, organização e sincronização dos compêndios atuais;
- correções de integração e manutenção técnica;
- atualização e compatibilização dos módulos auxiliares necessários;
- documentação, auditoria e preparação do pacote para distribuição.

O projeto original de Marcos Walker está disponível em: https://github.com/marcoswalker/tagmar_rpg

## Licenciamento e conteúdo

O código original permanece sob a licença aplicável indicada em [LICENSE.md](LICENSE.md). Textos, regras, nomes e demais conteúdos derivados do Tagmar seguem a licença oficial **CC BY-NC-SA 3.0 Brasil**.

- Projeto Tagmar: https://tagmar.com.br/
- Licenciamento oficial: https://tagmar.com.br/Licenciamento.aspx
- Foundry Virtual Tabletop: https://foundryvtt.com/

Módulos, imagens, fontes e demais recursos de terceiros mantêm suas licenças e créditos próprios. O uso pessoal desta edição não concede autorização para redistribuir recursos de terceiros; confira a origem e as permissões antes de compartilhar conteúdo.

## Apoio ao projeto

Este é um projeto comunitário e gratuito. Para apoiar voluntariamente a manutenção, os testes e a evolução da integração com o Foundry VTT: https://apoia.se/vfl

O apoio não representa venda nem licenciamento comercial do conteúdo do Tagmar.

## Atualização assistida por inteligência artificial

A atualização, a organização técnica, a documentação e parte das auditorias foram realizadas com auxílio de ferramentas da OpenAI, incluindo ChatGPT e Codex. As decisões, os testes e a validação final permanecem sob responsabilidade dos mantenedores humanos.

## Combate em Grande Escala (extraoficial)

Ficha de **Tropa** com EF, absorção, comando, moral, aparatos e fortificações. Baseada no suplemento de **Fábio Carvalho Magalhães (19/02/2024)**. Inclui um compêndio separado com um modelo e a tropa do exemplo do livro. [Como usar e convenções da adaptação](docs/combate-em-grande-escala.md). Material derivado sob [CC BY-NC-SA 3.0 Brasil](https://creativecommons.org/licenses/by-nc-sa/3.0/br/). Disponível na distribuição atual.

O compêndio **Combate em Grande Escala — Livro e Guia (Extraoficial)** inclui instruções da ficha e o PDF original completo. Acesse também pelo botão **Livro / guia** da Tropa. Veículos têm instruções na Biografia e ajudas (?) nos campos, sem substituir as anotações do usuário.

### Batalha guiada e recuperação

Abra **Batalha em massa** na aba Combate ou no monitor, com tokens de Tropa e seus exércitos definidos. O painel conduz preparativos, ataques extras e principais, apoio e resolução. Os danos ficam registrados até o encerramento da rodada; botões do chat continuam disponíveis sem duplicar registros.

Após a resolução, o painel mostra as perdas e a recuperação prevista. A ABS dos equipamentos se restaura nos preparativos seguintes conforme a EF atual. Resgatar feridos exige a confirmação do mesmo hexágono, uma rolagem na coluna do estágio e uma rodada de ocupação. Aparatos e muralhas exigem reparos; armadilhas destruídas não se restauram. Terreno, moral, recursos e casos especiais continuam sob avaliação do mestre.

EF e ABS ficam abaixo do nome em todas as abas. A calculadora preserva seu estado aberto ao editar. Consulte o [guia do combate em grande escala](docs/combate-em-grande-escala.md) e o compêndio Livro e Guia.
