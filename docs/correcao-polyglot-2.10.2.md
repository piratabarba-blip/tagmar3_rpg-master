# Compatibilidade com Polyglot 2.10.2

Atualização de 09/10/2026.

- Corrige o erro `Receiver must be an instance of class Polyglot` ao registrar os idiomas do Tagmar durante a inicialização do mundo.
- O ajuste é aplicado pelo sistema apenas ao Polyglot 2.10.2; outras versões continuam usando a chamada padrão.
- Preserva os idiomas do Tagmar e não modifica arquivos do módulo Polyglot, compêndios ou dados dos mundos.
- Testes de regressão cobrem a API antiga, a API 2.10.2, um cenário de API futura corrigida e a preservação dos idiomas. O teste com as funções locais do Polyglot 2.10.2 também passou.

Após atualizar, recarregue todos os clientes do Foundry. Faça backup antes de atualizar.

Esta atualização não inclui uma correção para o possível travamento das configurações do Carousel Combat Tracker, que ainda está em investigação.
