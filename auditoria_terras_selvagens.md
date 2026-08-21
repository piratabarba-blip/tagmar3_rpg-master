# Auditoria - Terras Selvagens, Edição Atual

Data: **18/08/2026**

## Resultado

Status da prévia gerada: **aprovada sem erros ou avisos**.

- 100 pastas;
- 831 itens;
- 7 raças;
- 7 profissões;
- 46 armas;
- 86 defesas;
- 2 habilidades ambientais;
- 321 documentos de magia;
- 70 ataques derivados de magias com regra objetiva;
- 11 curas derivadas de magias com regra objetiva;
- 281 receitas de poções;
- 256 nomes únicos de magia;
- nenhum item solto na raiz;
- nenhuma pasta vazia;
- nenhuma fonte obrigatória ausente;
- nenhuma duplicação homônima restante na mesma pasta e tipo.

## Compêndio de regras

- 4 pastas;
- 5 JournalEntries;
- 5 páginas;
- nenhum erro estrutural.

## Organização conferida durante a auditoria

As tabelas de origem geravam três cópias de `Conjuração Demoníaca`:

1. Colégio Sombrio - Naari: página oficial corrente do Livro das Magias Perdidas, efeitos 1/3/5/7;
2. Colégio Sombrio - Naari: cópia indevida da página de revisão;
3. Colégio Sombrio - Aaroim: página de revisão legítima para esta lista, efeitos 1/2/4/6/8/10.

O gerador preserva as duas versões destinadas a colégios diferentes e elimina somente a terceira cópia dentro de Naari. A auditoria agora impede regressão quando nome e tipo se repetem dentro da mesma pasta.

## Pendências conhecidas

- Bestializar, Enxame de Pragas, Escudo Espiritual e Invocar Espíritos continuam usando fallback documentado do PDF ATS até a correção anunciada para o site.
- 178 magias ainda estão sinalizadas como candidatas a imagens próprias; este é trabalho visual e permanece para a etapa final solicitada pelo usuário.
- O pack reconstruído ainda precisa ser instalado no sistema ativo.
