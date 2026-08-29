// Referências narrativas oficiais usadas pelo gerador de tesouros.
// As relações de oposição vêm de "Senhores das Profundezas"; os sinais de
// heresia abaixo são pistas apócrifas geradas pelo sistema, não novos fatos canônicos.

export const DIVINE_ORDERS = Object.freeze({
  Blator: "Ordem Blator — Os Destemidos Senhores da Guerra",
  Cambu: "Ordem de Cambu — A Divina Prosperidade",
  Crezir: "Ordem de Crezir — Os Dragões Vermelhos",
  Crizagom: "Ordem de Crizagom — Os Bravos Cavaleiros da Justiça",
  Cruine: "Ordem Cruine — A Noite Eterna",
  Ganis: "Ordem de Ganis — A Grande Mãe",
  Lena: "Ordem de Lena — Os Primorosos",
  Liris: "Ordem de Sevides, Liris e Quiris — Os Filhos da Terra",
  Maira: "Ordem de Maira — Os Runcaim",
  Palier: "Ordem de Palier — A Luz",
  Parom: "Ordem de Parom — O Sacro Ofício",
  Plandis: "Ordem de Plandis — A Divina Demência",
  Quiris: "Ordem de Sevides, Liris e Quiris — Os Filhos da Terra",
  Selimom: "Ordem de Selimom — O Alvorecer",
  Sevides: "Ordem de Sevides, Liris e Quiris — Os Filhos da Terra"
});

export const INFERNAL_PATRONS = Object.freeze([
  {
    key: "anasmadis", name: "Anasmadis", title: "A Donzela das Delícias",
    domains: ["luxúria", "tentação", "corrupção do amor"], opposedDeities: ["Lena"],
    affinity: ["aversão", "marca", "alteração física"],
    heresy: "a fórmula transforma amor e inspiração em posse, excesso e submissão"
  },
  {
    key: "antredom", name: "Antredom", title: "O Príncipe da Fome",
    domains: ["fome", "miséria", "avareza"], opposedDeities: ["Sevides", "Liris", "Quiris"],
    affinity: ["azar", "fraqueza", "fome"],
    heresy: "as espigas do selo apontam para baixo e a bênção da colheita termina em privação"
  },
  {
    key: "branaxis", name: "Branaxis", title: "O Pesadelo Medonho",
    domains: ["medo", "pesadelos", "terror"], opposedDeities: ["Plandis"],
    affinity: ["lembranças", "mental", "cegueira", "medo"],
    heresy: "a invocação promete silêncio e obediência onde os ritos legítimos celebram ruptura e inspiração"
  },
  {
    key: "diatrimis", name: "Diatrimis", title: "Senhora da Guerra",
    domains: ["guerra", "traição", "destruição"], opposedDeities: ["Blator"],
    affinity: ["arma", "montar", "ódio", "guerra"],
    heresy: "o juramento exalta traição e massacre de inocentes no lugar de coragem e honra em combate"
  },
  {
    key: "ekisis", name: "Ekisis", title: "A Dama da Discórdia",
    domains: ["mentira", "discórdia", "conflito"], opposedDeities: ["Selimom"],
    affinity: ["azar", "gagueira", "lembranças", "aversão"],
    heresy: "uma negação quase invisível converte a fórmula de concórdia em promessa de divisão"
  },
  {
    key: "fulvina", name: "Fulvina", title: "A Dama das Ilusões",
    domains: ["vaidade", "soberba", "obscurecimento da mente"], opposedDeities: ["Parom", "Lena"],
    affinity: ["alteração física", "cegueira", "aversão", "deformação"],
    heresy: "a marca do artífice contém uma falha deliberada e atribui a perfeição à aparência, não ao trabalho"
  },
  {
    key: "heldrom", name: "Heldrom", title: "A Mancha da Corrupção",
    domains: ["corrupção", "queda", "profanação"], opposedDeities: ["Crizagom"],
    affinity: ["marca", "deformação", "mental", "azar"],
    heresy: "o veredito gravado condena antes do julgamento e substitui justiça por submissão"
  },
  {
    key: "mocna", name: "Mocna", title: "O Horror Noturno",
    domains: ["ira", "agressividade", "ferocidade"], opposedDeities: ["Maira", "Crezir"],
    affinity: ["ódio", "arma", "montar", "mental"],
    heresy: "os sinais de vida e coragem foram retorcidos para celebrar fúria irracional e desprezo pelos fracos"
  },
  {
    key: "morrigalti", name: "Morrigalti", title: "O Destruidor da Criação",
    domains: ["genocídio", "aniquilação", "destruição"], opposedDeities: ["Palier"],
    affinity: ["deformação", "mental", "marca", "ódio"],
    heresy: "a fórmula de criação termina com um ideograma de aniquilação ausente dos ensinamentos de Palier"
  },
  {
    key: "ricutatis", name: "Ricutatis", title: "A Pena da Vida Morta",
    domains: ["opressão", "tortura", "aprisionamento da alma"], opposedDeities: ["Cruine"],
    affinity: ["marca", "fraqueza", "aversão", "arma"],
    heresy: "o rito funerário promete conservar e aprisionar a alma, contrariando sua passagem pela Noite Eterna"
  },
  {
    key: "seinoniz", name: "Seinoniz", title: "O Senhor das Correntes",
    domains: ["pactos", "escravidão", "domínio da vontade"], opposedDeities: ["Cambu", "Parom"],
    affinity: ["fraqueza", "azar", "aversão", "mental"],
    heresy: "a bênção de prosperidade ou ofício contém cláusulas que entregam a vontade e a alma do portador"
  },
  {
    key: "udoviom", name: "Udoviom", title: "Senhor da Pestilência",
    domains: ["pestilência", "pragas", "destruição da carne"], opposedDeities: ["Maira"],
    affinity: ["alteração física", "deformação", "fraqueza", "aversão"],
    heresy: "o sinal de vitalidade esconde traços de decomposição e converte a proteção da carne em contágio"
  },
  {
    key: "vouxiz", name: "Vouxiz", title: "A Névoa Gananciosa",
    domains: ["ganância", "cobiça", "névoas"], opposedDeities: ["Ganis"],
    affinity: ["azar", "aversão", "cegueira", "fraqueza"],
    heresy: "a oração às águas substitui equilíbrio por cobiça e oculta uma promessa de afogamento nas brumas"
  }
]);

export const INFERNAL_SOURCE_URL = "https://tagmar.com.br/downloads/Tagmar%20-%20Senhores%20das%20Profundezas.pdf";

// Efeitos fornecidos pelo usuário e adaptados para a linguagem de Tagmar.
// `patrons` liga cada efeito às vertentes infernais mais coerentes. Uma lista
// vazia identifica uma maldição genérica, usada apenas como alternativa.
export const INFERNAL_CURSES = Object.freeze([
  { minimumLevel: 1, patrons: ["morrigalti"], effect: "o portador sempre fecha os olhos na presença de fogo" },
  { minimumLevel: 1, patrons: ["ekisis", "seinoniz"], effect: "ao atravessar uma porta, o portador a bate atrás de si sem perceber" },
  { minimumLevel: 1, patrons: ["seinoniz"], effect: "ao ver um nó, o portador é compelido a desfazê-lo" },
  { minimumLevel: 2, patrons: ["vouxiz", "udoviom"], effect: "o portador não suporta ficar molhado e abandona outras preocupações até conseguir se secar" },
  { minimumLevel: 1, patrons: [], effect: "o portador é incapaz de se sentar" },
  { minimumLevel: 6, patrons: ["branaxis", "ekisis"], effect: "ninguém conserva lembranças do portador entre encontros; cada reencontro parece ser o primeiro" },
  { minimumLevel: 4, patrons: ["heldrom", "ekisis"], effect: "todos acreditam já ter ouvido histórias que apresentam o portador como cruel e indigno de confiança" },
  { minimumLevel: 4, patrons: ["antredom", "vouxiz"], effect: "todo dinheiro que o portador não gastar no mesmo dia desaparece" },
  { minimumLevel: 1, patrons: ["vouxiz"], effect: "bússolas deixam de funcionar a menos de 30 metros do portador" },
  { minimumLevel: 6, patrons: ["ricutatis", "udoviom"], effect: "a aparência e o odor do portador mudam durante uma semana até se assemelharem aos de um morto-vivo" },
  { minimumLevel: 2, patrons: ["vouxiz"], effect: "uma nuvem invisível acompanha o portador e mantém água gotejando sobre sua cabeça" },
  { minimumLevel: 1, patrons: ["antredom"], effect: "todo calçado usado pelo portador se desgasta completamente após quatro horas" },
  { minimumLevel: 4, patrons: ["branaxis"], effect: "o portador necessita dormir dezesseis horas por dia" },
  { minimumLevel: 6, patrons: ["ricutatis", "fulvina"], effect: "o reflexo do portador mostra um cadáver magro imitando seus movimentos" },
  { minimumLevel: 2, patrons: ["heldrom", "ekisis"], effect: "comerciantes, anfitriões e servidores se recusam a atender o portador" },
  { minimumLevel: 4, patrons: ["fulvina", "anasmadis"], effect: "a aparência sexual aparente do portador muda aleatoriamente a cada amanhecer" },
  { minimumLevel: 4, patrons: ["branaxis", "mocna"], effect: "o portador sente medo paralisante de cães comuns" },
  { minimumLevel: 4, patrons: ["udoviom"], effect: "ao sofrer mais de 3 pontos de dano na mesma rodada, o portador deve vencer uma RF contra Veneno 1 ou, no turno seguinte, poderá apenas se mover" },
  { minimumLevel: 6, patrons: ["vouxiz", "udoviom"], effect: "o portador é incapaz de prender a respiração, mesmo debaixo d'água" },
  { minimumLevel: 4, patrons: ["branaxis", "ekisis"], effect: "o portador sofre uma penalidade de −2 nos testes ligados à determinação e à compostura" },
  { minimumLevel: 2, patrons: ["morrigalti", "heldrom"], effect: "em toda residência particular, o portador acaba quebrando algo estimado pelo proprietário" },
  { minimumLevel: 2, patrons: ["antredom"], effect: "o portador precisa beber leite regularmente ou sofre 1 ponto de dano na EF a cada hora de privação" },
  { minimumLevel: 8, patrons: ["branaxis", "fulvina"], effect: "toda experiência vivida a sós pelo portador torna-se ilusória; somente acontecimentos presenciados por outra pessoa permanecem reais" },
  { minimumLevel: 1, patrons: ["ekisis"], effect: "o portador perde toda noção de etiqueta à mesa" },
  { minimumLevel: 4, patrons: ["vouxiz", "udoviom"], effect: "mudanças de pressão deixam o portador tonto e fraco se viajar mais de 10 quilômetros no mesmo dia" },
  { minimumLevel: 2, patrons: ["fulvina", "udoviom"], effect: "qualquer roupa provoca coceira insuportável no portador" },
  { minimumLevel: 4, patrons: ["udoviom"], effect: "o portador atrai insetos e desenvolve erupções que provocam coceira constante" },
  { minimumLevel: 2, patrons: ["ekisis"], effect: "tudo o que o portador diz soa sarcástico e desrespeitoso" },
  { minimumLevel: 4, patrons: ["mocna"], effect: "o portador manifesta força sobrenatural somente em momentos nos quais ela causa prejuízo ou perigo" },
  { minimumLevel: 2, patrons: ["branaxis", "ekisis"], effect: "o portador é compelido a falar em rimas e sofre 1 ponto de dano na EF sempre que falha" },
  { minimumLevel: 4, patrons: ["anasmadis"], effect: "o portador sente aversão incontrolável à presença de pessoas pelas quais poderia sentir atração" },
  { minimumLevel: 2, patrons: ["diatrimis", "mocna"], effect: "sempre que erra um ataque, o portador deixa cair a arma que estiver usando" },
  { minimumLevel: 6, patrons: ["udoviom", "vouxiz"], effect: "o portador desenvolve brânquias e precisa permanecer na água por pelo menos três horas a cada dia" },
  { minimumLevel: 6, patrons: ["branaxis", "fulvina"], effect: "a cada amanhecer, o portador desperta em um lugar aleatório com roupas diferentes ou sem parte delas" },
  { minimumLevel: 8, patrons: ["branaxis", "fulvina"], effect: "em momentos escolhidos pelo Mestre, o portador libera involuntariamente uma magia aleatória que conheça ou possua" },
  { minimumLevel: 2, patrons: ["seinoniz"], effect: "o portador fica preso às roupas que vestia quando a maldição despertou" },
  { minimumLevel: 1, patrons: ["branaxis"], effect: "sempre que escuta música, o portador é compelido a dançar" },
  { minimumLevel: 4, patrons: ["fulvina"], effect: "o rosto do portador assume um sorriso permanente, mesmo em situações solenes ou trágicas" },
  { minimumLevel: 2, patrons: ["morrigalti"], effect: "o portador é compelido a quebrar todo objeto de vidro que enxergar" },
  { minimumLevel: 2, patrons: ["mocna", "diatrimis"], effect: "animais de carga odeiam o portador e tentam fugir ou atacá-lo" },
  { minimumLevel: 6, patrons: ["antredom", "anasmadis"], effect: "o portador só consegue se alimentar depois de fazer outra pessoa chorar" },
  { minimumLevel: 6, patrons: ["vouxiz", "seinoniz"], effect: "quem passa a noite sob o mesmo teto que o portador desperta com uma posse desaparecida" },
  { minimumLevel: 1, patrons: ["branaxis"], effect: "tudo o que o portador diz precisa ser cantado" },
  { minimumLevel: 2, patrons: ["ekisis", "branaxis"], effect: "o portador perde a voz e só consegue falar por meio de gaguejos" },
  { minimumLevel: 4, patrons: ["ekisis"], effect: "até um dia após chegar a uma nova comunidade, o portador comete involuntariamente uma ofensa grave contra um costume local" },
  { minimumLevel: 2, patrons: ["morrigalti", "heldrom"], effect: "toda ferramenta usada pelo portador possui uma chance de 1 em 10 de se quebrar" },
  { minimumLevel: 2, patrons: ["mocna", "udoviom"], effect: "todo animal com o qual o portador tenta se comunicar foge ou o ataca" },
  { minimumLevel: 4, patrons: ["ekisis", "branaxis"], effect: "nenhum aviso pronunciado pelo portador é levado a sério" },
  { minimumLevel: 4, patrons: ["branaxis", "seinoniz"], effect: "o portador esquece como ler e escrever" },
  { minimumLevel: 2, patrons: ["ekisis"], effect: "toda preocupação expressa pelo portador é interpretada como uma piada" },
  { minimumLevel: 8, patrons: ["morrigalti"], effect: "nenhum fogo pode ser apagado na presença do portador" },
  { minimumLevel: 2, patrons: ["vouxiz"], effect: "qualquer objeto que caia das mãos do portador desaparece" },
  { minimumLevel: 2, patrons: ["anasmadis", "udoviom"], effect: "qualquer quantidade de bebida alcoólica ou droga afeta o portador com intensidade extrema durante um dia inteiro" },
  { minimumLevel: 4, patrons: ["seinoniz", "branaxis"], effect: "o portador é compelido a invadir uma residência aleatória e dormir em uma de suas camas" },
  { minimumLevel: 2, patrons: ["vouxiz", "anasmadis"], effect: "ao ver um tesouro, o portador demonstra cobiça de maneira visível e impossível de disfarçar" },
  { minimumLevel: 4, patrons: ["vouxiz", "seinoniz"], effect: "o portador precisa furtar uma pessoa ao menos uma vez por dia" },
  { minimumLevel: 8, patrons: ["fulvina", "udoviom"], effect: "a cada amanhecer, o tamanho do portador varia entre diminuto e gigantesco" },
  { minimumLevel: 1, patrons: ["ekisis"], effect: "a voz do portador torna-se extremamente irritante para quem a escuta" },
  { minimumLevel: 1, patrons: ["udoviom"], effect: "o portador precisa urinar a cada dez minutos" },
  { minimumLevel: 4, patrons: ["anasmadis", "mocna"], effect: "sempre que sofre dano, o portador reage com um gemido de prazer" },
  { minimumLevel: 6, patrons: ["mocna", "diatrimis"], effect: "em momentos escolhidos pelo Mestre, o portador tenta agredir uma criatura próxima" },
  { minimumLevel: 2, patrons: ["anasmadis", "vouxiz", "fulvina"], effect: "o portador compra compulsivamente roupas e adornos extravagantes, caros e sem utilidade" },
  { minimumLevel: 1, patrons: [], effect: "uma marca profana identifica discretamente o portador como amaldiçoado" },
  { minimumLevel: 2, patrons: [], effect: "uma alteração física inconveniente torna o portador motivo de estranhamento" },
  { minimumLevel: 4, patrons: [], effect: "uma sequência de pequenos azares acompanha o portador" }
]);

export const HISTORICAL_FRAMES = Object.freeze([
  { minimumType: 9, group: "ciclos", label: "o Segundo Ciclo, o Tempo dos Filhos" },
  { minimumType: 7, group: "ciclos", label: "o Terceiro Ciclo, o Tempo das Mentiras Infernais" },
  { minimumType: 6, group: "moldania", label: "os últimos anos da Moldânia Imperial" },
  { minimumType: 4, group: "moldania", label: "a queda do antigo Império e a divisão da Moldânia" },
  { minimumType: 1, group: "moldania", label: "as gerações posteriores à resistência nas terras da antiga Moldânia" },
  { minimumType: 1, group: "reinos", label: "as primeiras gerações dos Reinos Conhecidos" },
  { minimumType: 2, group: "reinos", label: "a consolidação das rotas entre os Reinos Conhecidos" },
  { minimumType: 1, group: "incerto", label: "um período de guerras e alianças hoje mal documentado" },
  { minimumType: 3, group: "incerto", label: "uma época preservada apenas por relatos fragmentários" }
]);

export const WILDERNESS_REGIONS = Object.freeze([
  "Estepes Vítreas",
  "Os Mangues",
  "Lar, reino élfico",
  "Blur, reino dos anões",
  "Caridrândia, o reino dos elfos sombrios",
  "Domus de Arminus",
  "As Geleiras",
  "Terras dos povos nômades e bárbaros"
]);
