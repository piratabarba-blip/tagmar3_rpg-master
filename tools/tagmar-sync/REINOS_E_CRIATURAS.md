# Reino de Tagmar e criaturas

## Pacotes

- `reino-de-tagmar-t3er`: referências oficiais sincronizadas do Livro dos Reinos.
- `criaturas-t3er`: destino futuro dos atores sincronizados com a lista oficial.
- `criaturas-e-arquetipos-sem-tecnicas`: compêndio clássico, mantido sem alterações.

## Política de sincronização das criaturas

1. A lista online oficial define nomes, categorias, variantes e estatísticas atuais.
2. O Livro de Criaturas e a página detalhada fornecem descrição, poderes, habilidades e técnicas. Para as Técnicas Especiais de Combate, a seção 3.4 do Livro de Criaturas 3.0 prevalece sobre verbetes vazios do site.
3. O ator clássico é referência mecânica para campos e itens incorporados já implementados.
4. A chave não usa apenas o nome: combina categoria oficial, nome normalizado e variante.
5. Correspondências ambíguas são registradas para revisão e não são sobrescritas automaticamente.
6. O novo ator recebe `flags.tagmarSync` com URL, categoria, hash e chave de origem.
7. Atualizações futuras reconstruirão apenas o pacote novo; o clássico continuará recuperável e intacto.

## Técnicas das criaturas

Cada técnica citada na descrição oficial será classificada antes de entrar no ator:

- `oficial-exata`: existe no compêndio revisado com o mesmo nome e será incorporada ao ator;
- `oficial-livro-criaturas`: técnica especial definida no Livro de Criaturas 3.0 (`Ataques múltiplos`, `Bote`, `Carga Aérea`, `Carga de Quadrúpede` ou `Prender`);
- `oficial-alias`: o nome antigo aponta inequivocamente para uma técnica revisada equivalente;
- `criatura-especifica`: não existe equivalente geral, então será convertida para o formato `Tecnica_Combate` atual com sua regra oficial;
- `ataque`: formas de ataque permanecem como `Combate`; quando uma criatura também possuir a Técnica Especial `Bote`, os dois itens coexistirão com tipos distintos;
- `revisao-manual`: relação ambígua, incompatível ou sem descrição suficiente.

O nível/força informado pela ficha oficial da criatura será preservado no item incorporado. A relação será registrada em `flags.tagmarSync` para que uma atualização futura não duplique a técnica.

## Desativação futura do clássico

O compêndio clássico só será retirado do `system.json` depois que o pacote sincronizado cobrir todas as criaturas oficiais, variantes, ataques, habilidades, técnicas, magias, defesas, imagens e descrições, e depois dos testes finais no Foundry V14. Ele continuará preservado no histórico Git e em uma versão/tag recuperável.

## Etapas

1. Sincronizar os índices oficiais e gerar o relatório de correspondência.
2. Validar diferenças de nomes, categorias e variantes.
3. Criar um primeiro lote pequeno de atores completos.
4. Testar fichas, ataques, danos, habilidades, técnicas e imagens no Foundry V14.
5. Somente então gerar todas as criaturas oficiais.
