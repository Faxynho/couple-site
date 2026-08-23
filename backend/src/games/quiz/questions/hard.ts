import { RawQuizQuestion } from "./types";

/**
 * Perguntas "Difícil": específicas e desafiadoras. Categorias: História
 * detalhada, Ciência, Tecnologia, Geografia, Literatura, Cultura,
 * Astronomia, Matemática, Curiosidades difíceis, Conhecimentos Gerais avançados.
 */
export const HARD_QUESTIONS: RawQuizQuestion[] = [
  // História detalhada
  {
    category: "História",
    question: "Qual tratado, assinado em 1494, dividiu as terras recém-descobertas entre Espanha e Portugal?",
    options: ["Tratado de Windsor", "Tratado de Tordesilhas", "Tratado de Utrecht", "Tratado de Madri"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Quem foi o imperador romano que oficializou o cristianismo como religião do Império, no Edito de Milão?",
    options: ["Nero", "Constantino", "Júlio César", "Augusto"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Em que ano ocorreu a Proclamação da Abolição da Escravatura no Brasil (Lei Áurea)?",
    options: ["1850", "1871", "1888", "1891"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Qual foi o nome do movimento que resultou na independência das colônias inglesas na América do Norte?",
    options: ["Revolução Gloriosa", "Revolução Americana", "Revolução Industrial", "Guerra dos Sete Anos"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual dinastia governava a China quando a Grande Muralha recebeu grande parte de sua forma atual?",
    options: ["Dinastia Tang", "Dinastia Ming", "Dinastia Han", "Dinastia Qing"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Quem foi o líder soviético durante a maior parte da Guerra Fria, nos anos 1920 a 1950?",
    options: ["Lênin", "Stálin", "Khrushchov", "Gorbachev"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "A Revolta da Vacina, em 1904, ocorreu em qual cidade brasileira?",
    options: ["São Paulo", "Salvador", "Rio de Janeiro", "Recife"],
    correctIndex: 2,
  },

  // Ciência
  {
    category: "Ciência",
    question: "Qual é o número atômico do carbono na tabela periódica?",
    options: ["4", "6", "8", "12"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual cientista é considerado o pai da genética moderna por seus estudos com ervilhas?",
    options: ["Charles Darwin", "Gregor Mendel", "James Watson", "Francis Crick"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o nome da enzima responsável por \"desenrolar\" a dupla-hélice do DNA durante a replicação?",
    options: ["Ligase", "Helicase", "Polimerase", "Primase"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é a unidade de medida da força no Sistema Internacional?",
    options: ["Joule", "Watt", "Newton", "Pascal"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual processo libera energia ao dividir um núcleo atômico pesado em núcleos menores?",
    options: ["Fusão nuclear", "Fissão nuclear", "Radiação alfa", "Ionização"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o pH aproximado de uma substância neutra, como a água pura?",
    options: ["0", "4", "7", "14"],
    correctIndex: 2,
  },

  // Tecnologia
  {
    category: "Tecnologia",
    question: "Quem é amplamente creditado como o criador da World Wide Web, em 1989?",
    options: ["Vint Cerf", "Tim Berners-Lee", "Bill Gates", "Alan Turing"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "O que significa a sigla \"HTTP\"?",
    options: [
      "HyperText Transfer Protocol",
      "High Transfer Text Protocol",
      "HyperText Transmission Process",
      "Host Transfer Text Protocol",
    ],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual matemático britânico é considerado precursor da ciência da computação e decifrou códigos nazistas na Segunda Guerra?",
    options: ["John von Neumann", "Alan Turing", "Claude Shannon", "Ada Lovelace"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Em ciência da computação, qual estrutura de dados segue o princípio \"primeiro a entrar, primeiro a sair\" (FIFO)?",
    options: ["Pilha (Stack)", "Fila (Queue)", "Árvore", "Grafo"],
    correctIndex: 1,
  },

  // Geografia
  {
    category: "Geografia",
    question: "Qual é o país com a maior quantidade de fronteiras terrestres com outros países?",
    options: ["Rússia", "China", "Brasil", "Estados Unidos"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a fossa oceânica mais profunda conhecida do planeta?",
    options: ["Fossa das Marianas", "Fossa de Porto Rico", "Fossa das Filipinas", "Fossa de Tonga"],
    correctIndex: 0,
  },
  {
    category: "Geografia",
    question: "Qual capital sul-americana está localizada na maior altitude?",
    options: ["Bogotá", "Quito", "La Paz", "Santiago"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o lago de água doce com maior volume de água do mundo?",
    options: ["Lago Vitória", "Lago Baikal", "Lago Superior", "Mar Cáspio"],
    correctIndex: 1,
  },

  // Literatura
  {
    category: "Literatura",
    question: "Quem escreveu o épico \"Os Lusíadas\"?",
    options: ["Fernando Pessoa", "Luís de Camões", "José Saramago", "Eça de Queirós"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual escritor colombiano escreveu \"Cem Anos de Solidão\"?",
    options: ["Jorge Luis Borges", "Mario Vargas Llosa", "Gabriel García Márquez", "Pablo Neruda"],
    correctIndex: 2,
  },
  {
    category: "Literatura",
    question: "Em \"A Divina Comédia\", de Dante Alighieri, quem guia o narrador pelo Inferno e pelo Purgatório?",
    options: ["Beatriz", "Virgílio", "São Pedro", "Homero"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual movimento literário brasileiro teve Mário de Andrade como uma de suas principais figuras?",
    options: ["Romantismo", "Modernismo", "Parnasianismo", "Barroco"],
    correctIndex: 1,
  },

  // Astronomia
  {
    category: "Astronomia",
    question: "Qual é o planeta mais próximo do Sol?",
    options: ["Vênus", "Terra", "Mercúrio", "Marte"],
    correctIndex: 2,
  },
  {
    category: "Astronomia",
    question: "Qual galáxia é a mais próxima da Via Láctea capaz de colidir com ela no futuro distante?",
    options: ["Galáxia do Triângulo", "Galáxia de Andrômeda", "Grande Nuvem de Magalhães", "Galáxia do Redemoinho"],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "O que é uma \"supernova\"?",
    options: [
      "O nascimento de uma estrela",
      "A explosão final de uma estrela massiva",
      "Um tipo de planeta gigante",
      "Uma nuvem de poeira interestelar",
    ],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "Qual é o nome da linha imaginária que passa pelos polos e define a rotação da Terra?",
    options: ["Equador", "Meridiano de Greenwich", "Eixo terrestre", "Eclíptica"],
    correctIndex: 2,
  },
  {
    category: "Astronomia",
    question: "Quantos planetas anões são reconhecidos oficialmente pela União Astronômica Internacional, incluindo Plutão?",
    options: ["3", "5", "7", "9"],
    correctIndex: 1,
  },

  // Matemática
  {
    category: "Matemática",
    question: "Qual é o valor aproximado do número π (pi) com duas casas decimais?",
    options: ["3.12", "3.14", "3.16", "3.18"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Como se chama um polígono de sete lados?",
    options: ["Hexágono", "Heptágono", "Octógono", "Pentágono"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Qual é a raiz quadrada de 144?",
    options: ["10", "11", "12", "14"],
    correctIndex: 2,
  },
  {
    category: "Matemática",
    question: "Em um triângulo retângulo, como se chama o lado oposto ao ângulo reto?",
    options: ["Cateto", "Hipotenusa", "Base", "Altura"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Qual é o resultado de 7 elevado ao quadrado?",
    options: ["14", "42", "49", "56"],
    correctIndex: 2,
  },

  // Cultura
  {
    category: "Cultura",
    question: "Qual pintor renascentista italiano pintou o teto da Capela Sistina?",
    options: ["Leonardo da Vinci", "Rafael", "Michelangelo", "Botticelli"],
    correctIndex: 2,
  },
  {
    category: "Cultura",
    question: "Qual compositor alemão continuou compondo mesmo após perder totalmente a audição?",
    options: ["Mozart", "Bach", "Beethoven", "Chopin"],
    correctIndex: 2,
  },
  {
    category: "Cultura",
    question: "Qual é o nome do festival japonês tradicional de contemplação das flores de cerejeira?",
    options: ["Tanabata", "Hanami", "Obon", "Setsubun"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual pintor espanhol é o principal autor do quadro \"Guernica\"?",
    options: ["Salvador Dalí", "Joan Miró", "Pablo Picasso", "Diego Velázquez"],
    correctIndex: 2,
  },

  // Curiosidades difíceis
  {
    category: "Curiosidades",
    question: "Qual é o único mamífero conhecido capaz de sobreviver naturalmente sem contrair câncer registrado, alvo de estudos científicos?",
    options: ["Elefante-africano", "Rato-toupeira-pelado", "Morcego-vampiro", "Baleia-jubarte"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o elemento mais abundante no universo observável?",
    options: ["Oxigênio", "Carbono", "Hélio", "Hidrogênio"],
    correctIndex: 3,
  },
  {
    category: "Curiosidades",
    question: "Qual país tem o maior número de ilhas no mundo, segundo levantamentos recentes?",
    options: ["Filipinas", "Indonésia", "Suécia", "Noruega"],
    correctIndex: 2,
  },
  {
    category: "Curiosidades",
    question: "De qual idioma se originou a palavra \"café\"?",
    options: ["Árabe", "Italiano", "Francês", "Turco"],
    correctIndex: 0,
  },

  // Conhecimentos Gerais avançados
  {
    category: "Conhecimentos Gerais",
    question: "Qual organização internacional tem sede em Genebra e é responsável por coordenar respostas globais de saúde?",
    options: ["ONU", "OMS", "UNESCO", "OMC"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantos países fazem parte oficialmente da União Europeia (após a saída do Reino Unido)?",
    options: ["25", "27", "29", "31"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o nome do tratado internacional que estabelece metas para reduzir o aquecimento global, assinado em 2015?",
    options: ["Protocolo de Kyoto", "Acordo de Paris", "Tratado de Copenhague", "Convenção de Genebra"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é a sede do Comitê Olímpico Internacional?",
    options: ["Genebra, Suíça", "Lausanne, Suíça", "Paris, França", "Atenas, Grécia"],
    correctIndex: 1,
  },
];
