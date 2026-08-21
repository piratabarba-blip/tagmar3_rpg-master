export const TERRAS_ATS_PDF_URL = "https://tagmar.com.br/downloads/Tagmar%20-%20Livro%20ATS.pdf";

export const TERRAS_ATS_PDF_FALLBACKS = [
  {
    name: "Bestializar", pages: [96], evocacao: "1 Rodada", alcance: "Pessoal", duracao: "Variável",
    paragraphs: [
      "Com este encanto o rastreador é capaz de assimilar uma ou mais capacidades de um animal causando assim algumas alterações em seu corpo a fim de ajustar-se à(s) nova(s) capacidade(s) adquirida(s). Essas capacidades podem ser poderes especiais, habilidades, técnicas de combate e qualquer capacidade inata que esteja descrita na criatura.",
      "Também é possível assimilar guelras, olhos, pulmões, pele, pelo, pernas etc.",
      "As habilidades e técnicas de combate copiadas terão o valor ajustado ao nível do místico e qualquer bônus referente a esse será adicionado, como bônus em nível, redução de dificuldade, tarefa aperfeiçoada e aprimoramento.",
      "Este encanto não é capaz de dar asas, caudas, mandíbulas avantajadas, garras, barbatanas, tentáculos, bicos, patas ou membros extras, mas pode ajustá-los caso já existam.",
      "Para realizar este encanto é necessário estar em contato com um animal ou ter em mãos alguma parte do corpo dele, como pelos, escamas, ossos ou penas.",
      "Este encanto pode ser cessado pelo místico a qualquer momento que achar pertinente."
    ],
    effects: [
      "Bestializar 1: Assimila 1 capacidade. A duração é de 1 hora.",
      "Bestializar 2: Assimila 1 capacidade. A duração é de 1 dia.",
      "Bestializar 4: Assimila 2 capacidades. A duração é de 3 dias.",
      "Bestializar 6: Assimila 2 capacidades. A duração é de 5 dias.",
      "Bestializar 8: Assimila 3 capacidades. A duração é de 7 dias.",
      "Bestializar 10: Assimila todas as capacidades que desejar. A duração é de 7 dias."
    ]
  },
  {
    name: "Enxame de Pragas", pages: [131, 132], evocacao: "1 rodada", alcance: "20 metros", duracao: "10 rodadas",
    paragraphs: [
      "Com essa magia o evocador invoca um enxame de insetos e pragas, como marimbondos, vespas, moscas, percevejos, borrachudos e mutucas. Esse enxame ataca uma quantidade de alvos de acordo com o efeito utilizado, causando dano por rodada enquanto estiverem na área e forem alvo do evocador.",
      "O evocador precisa se concentrar na magia mantendo o enxame sob seu controle, podendo escolher os alvos dentro do alcance e alterná-los a cada rodada. O ataque se resolve na Tabela de Resolução utilizando a FA da magia. Caso o evocador não mantenha a concentração, o enxame não atacará nessa rodada, mas apenas se dispersará no término da duração da magia, podendo o místico voltar a controlá-lo.",
      "Os alvos que sofrerem danos na EF ou um ataque de 100% na EH devem fazer um teste de RF contra a FA da magia para não contrair uma doença transmitida pelas pragas. A doença em si não é mágica e pode ser tratada normalmente por métodos convencionais.",
      "Caso o alvo tenha sua EH zerada pelo enxame, deve fazer um teste de RM contra a FA da magia. Em caso de falha, fugirá da área do enxame. Assim que sair da área poderá realizar suas ações normalmente; para retornar à área infestada será necessário um novo teste de RM.",
      "A magia precisa ser evocada em um ambiente natural para invocar o enxame, com exceção de lugares não naturais repletos de pragas.",
      "A área afetada fica carregada de insetos e pragas, dificultando a visibilidade. Ataques à distância sofrem o mesmo efeito de Escuridão Parcial: penalidade de -7 para ataques que partam de dentro da área ou tenham como alvo vítimas dentro dela."
    ],
    effects: [
      "Enxame de Pragas 1: Afeta 1 alvo e causa 8 de dano dentro de uma área de 2 metros de raio.",
      "Enxame de Pragas 3: Afeta 1 alvo e causa 12 de dano dentro de uma área de 3 metros de raio.",
      "Enxame de Pragas 5: Afeta até 2 alvos e causa 12 de dano dentro de uma área de 4 metros de raio.",
      "Enxame de Pragas 7: Afeta até 2 alvos e causa 16 de dano dentro de uma área de 5 metros de raio.",
      "Enxame de Pragas 9: Afeta até 3 alvos e causa 16 de dano dentro de uma área de 6 metros de raio."
    ]
  },
  {
    name: "Escudo Espiritual", pages: [134], evocacao: "Instantânea", alcance: "Pessoal", duracao: "10 rodadas",
    paragraphs: [
      "O evocador conjura a energia espiritual e de entidades da natureza, formando uma camada protetora em torno de si com capacidade de absorver danos. O Escudo Espiritual tem capacidade de absorção limitada e acumulativa; assim que essa absorção for atingida, a magia colapsa e o dano excedente é passado para o evocador.",
      "O Escudo Espiritual não protege o evocador contra efeitos de magias diretas, mas magias de dano indireto, como Bola de Fogo, são afetadas pela proteção.",
      "Os efeitos dessa magia não são acumulativos. Caso seja evocada novamente, a magia anterior colapsa e valem apenas os efeitos da nova evocação."
    ],
    effects: [
      "Escudo Espiritual 1: Absorve até 16 pontos de dano.",
      "Escudo Espiritual 2: Absorve até 20 pontos de dano.",
      "Escudo Espiritual 4: Absorve até 28 pontos de dano.",
      "Escudo Espiritual 6: Absorve até 32 pontos de dano.",
      "Escudo Espiritual 8: Absorve até 36 pontos de dano.",
      "Escudo Espiritual 10: Absorve até 40 pontos de dano."
    ]
  },
  {
    name: "Invocar Espiritos", displayName: "Invocar Espíritos", pages: [150],
    evocacao: "1 rodada", alcance: "Variável", duracao: "10 rodadas",
    paragraphs: [
      "Essa magia permite que o evocador convoque os espíritos e entidades da natureza a virem em seu auxílio, atrapalhando e retendo seus oponentes. Os espíritos prejudicam apenas os adversários do místico e podem confinar completamente seus movimentos. Caso o oponente saia da área afetada, as penalidades cessam imediatamente.",
      "A área afetada sempre parte do místico como centro e aumenta conforme o nível utilizado, assim como as penalidades e o número de alvos que os espíritos conseguem confinar. A penalidade afeta atividades motoras, visuais e sensitivas, atrapalhando ataques, Habilidades, evocação de Magias e concentração.",
      "Místicos adversários devem passar em um teste de Concentração Difícil para evocar magias ou manter a concentração em magias evocadas dentro da área afetada.",
      "Os adversários escolhidos para confinamento devem ser bem-sucedidos em um teste de RM contra a FA da magia. Caso falhem, ficam confinados até o término da magia, sem poder realizar ações e utilizando apenas a Defesa Passiva; ainda podem utilizar a EH caso sejam atacados.",
      "A quantidade máxima de alvos confinados depende do efeito. Cada alvo não pode ter tamanho superior a 2 metros ou peso superior a 200 kg. Uma vítima que tenha resistido ao confinamento não pode ser alvo de outra tentativa, embora continue sujeita às penalidades da área.",
      "A quantidade de tentativas de confinamento por rodada é igual ao total permitido pelo efeito. Cada alvo já confinado reduz em um as tentativas restantes por rodada."
    ],
    effects: [
      "Invocar Espíritos 1: Afeta uma área de 2 metros de raio a partir do evocador, causando penalidade de -2 colunas.",
      "Invocar Espíritos 2: Idem ao anterior, mas os espíritos confinam 1 alvo.",
      "Invocar Espíritos 4: Idem ao anterior, mas a área é de 3 metros de raio e a penalidade é de -3 colunas.",
      "Invocar Espíritos 6: Idem ao anterior, mas os espíritos confinam até 2 alvos.",
      "Invocar Espíritos 8: Idem ao anterior, mas a área é de 4 metros de raio e a penalidade é de -4 colunas.",
      "Invocar Espíritos 10: Idem ao anterior, mas os espíritos confinam até 3 alvos."
    ]
  }
];

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderTerrasPdfFallback(fallback) {
  const paragraphs = fallback.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("");
  const effects = fallback.effects.map((text) => `<li>${escapeHtml(text)}</li>`).join("");
  return `${paragraphs}<ul>${effects}</ul>`;
}
