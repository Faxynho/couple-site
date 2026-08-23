import { RawQuizQuestion } from "./types";

/**
 * Perguntas "Médio": exigem um pouco mais de conhecimento. Categorias:
 * História, Geografia, Ciência, Tecnologia, Cultura, Entretenimento,
 * Esportes, Literatura, Curiosidades.
 */
export const MEDIUM_QUESTIONS: RawQuizQuestion[] = [
  // História
  {
    category: "História",
    question: "Em que ano o Brasil declarou sua independência de Portugal?",
    options: ["1808", "1822", "1889", "1500"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual civilização antiga construiu as grandes pirâmides de Gizé?",
    options: ["Romana", "Grega", "Egípcia", "Maia"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Quem foi o primeiro presidente dos Estados Unidos?",
    options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Em que ano terminou a Segunda Guerra Mundial?",
    options: ["1943", "1945", "1948", "1950"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual muro, símbolo da Guerra Fria, caiu em 1989?",
    options: ["Muro de Adriano", "Muro de Berlim", "Grande Muralha", "Muro das Lamentações"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Quem proclamou a República no Brasil, em 1889?",
    options: ["Dom Pedro II", "Deodoro da Fonseca", "Getúlio Vargas", "Tiradentes"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual foi a principal embarcação usada por Pedro Álvares Cabral na chegada ao Brasil, em 1500?",
    options: ["Caravela", "Galeão", "Fragata", "Nau"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual revolução francesa derrubou a monarquia em 1789?",
    options: ["Revolução Industrial", "Revolução Francesa", "Revolução Russa", "Revolução Gloriosa"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Quem foi Tiradentes na história do Brasil?",
    options: [
      "Um rei português",
      "Um líder da Inconfidência Mineira",
      "O primeiro presidente do Brasil",
      "Um navegador espanhol",
    ],
    correctIndex: 1,
  },

  // Geografia
  {
    category: "Geografia",
    question: "Qual é o país mais populoso do mundo atualmente, segundo estimativas recentes?",
    options: ["China", "Índia", "Estados Unidos", "Indonésia"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a montanha mais alta do mundo?",
    options: ["K2", "Monte Everest", "Kilimanjaro", "Aconcágua"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Quantos estados brasileiros fazem fronteira com o Uruguai?",
    options: ["0", "1", "2", "3"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Austrália?",
    options: ["Sydney", "Melbourne", "Camberra", "Perth"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual estreito separa a Europa da África no ponto mais próximo?",
    options: ["Estreito de Bering", "Estreito de Gibraltar", "Estreito de Ormuz", "Canal da Mancha"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é o menor país do mundo em área territorial?",
    options: ["Mônaco", "San Marino", "Vaticano", "Liechtenstein"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual bioma brasileiro é conhecido por sua vegetação de savana com árvores retorcidas?",
    options: ["Amazônia", "Cerrado", "Caatinga", "Pantanal"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "A qual país pertence a Groenlândia atualmente?",
    options: ["Islândia", "Noruega", "Dinamarca", "Canadá"],
    correctIndex: 2,
  },

  // Ciência
  {
    category: "Ciência",
    question: "Qual cientista formulou a teoria da relatividade?",
    options: ["Isaac Newton", "Albert Einstein", "Galileu Galilei", "Nikola Tesla"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o elemento químico de símbolo \"Fe\" na tabela periódica?",
    options: ["Flúor", "Ferro", "Fósforo", "Frâncio"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é a velocidade aproximada da luz no vácuo?",
    options: ["300 mil km/s", "150 mil km/s", "3 mil km/s", "1 milhão de km/s"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Quem propôs a teoria da evolução das espécies por seleção natural?",
    options: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Antoine Lavoisier"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o principal gás responsável pelo efeito estufa emitido por atividades humanas?",
    options: ["Oxigênio", "Nitrogênio", "Gás carbônico", "Hélio"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual parte da célula é responsável por produzir energia?",
    options: ["Núcleo", "Mitocôndria", "Ribossomo", "Vacúolo"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Quantos ossos tem a coluna vertebral humana, aproximadamente?",
    options: ["18", "26", "33", "40"],
    correctIndex: 2,
  },

  // Tecnologia
  {
    category: "Tecnologia",
    question: "Quem é considerado o cofundador da Apple ao lado de Steve Jobs?",
    options: ["Bill Gates", "Steve Wozniak", "Elon Musk", "Larry Page"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "O que significa a sigla \"URL\"?",
    options: [
      "Universal Resource Locator",
      "Uniform Resource Locator",
      "United Resource Link",
      "Universal Registry Language",
    ],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual empresa criou o sistema operacional Windows?",
    options: ["Apple", "Google", "Microsoft", "IBM"],
    correctIndex: 2,
  },
  {
    category: "Tecnologia",
    question: "O que significa a sigla \"CPU\"?",
    options: [
      "Central Process Unit",
      "Central Processing Unit",
      "Computer Personal Unit",
      "Core Processing Utility",
    ],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual foi a primeira rede social a ultrapassar 1 bilhão de usuários?",
    options: ["Twitter", "Instagram", "Facebook", "LinkedIn"],
    correctIndex: 2,
  },
  {
    category: "Tecnologia",
    question: "Qual linguagem de programação é famosa por ser usada em páginas web junto com HTML e CSS?",
    options: ["Python", "JavaScript", "C++", "Swift"],
    correctIndex: 1,
  },

  // Cultura / Entretenimento
  {
    category: "Cultura",
    question: "Qual é o instrumento nacional mais associado ao samba brasileiro?",
    options: ["Violão", "Cavaquinho", "Pandeiro", "Todos são usados no samba"],
    correctIndex: 3,
  },
  {
    category: "Cultura",
    question: "Qual país é considerado o berço do balé clássico moderno?",
    options: ["Itália", "França", "Rússia", "Alemanha"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual foi o primeiro longa-metragem de animação totalmente feito em computador?",
    options: ["Shrek", "Toy Story", "A Era do Gelo", "Procurando Nemo"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Quem dirigiu a trilogia original de \"O Senhor dos Anéis\"?",
    options: ["Steven Spielberg", "Peter Jackson", "James Cameron", "Christopher Nolan"],
    correctIndex: 1,
  },
  {
    category: "Música",
    question: "Qual banda britânica lançou o álbum \"Abbey Road\"?",
    options: ["Rolling Stones", "Queen", "The Beatles", "Pink Floyd"],
    correctIndex: 2,
  },
  {
    category: "Música",
    question: "Qual cantora brasileira ficou mundialmente famosa com a música \"Águas de Março\"?",
    options: ["Elis Regina", "Gal Costa", "Maria Bethânia", "Rita Lee"],
    correctIndex: 0,
  },

  // Esportes
  {
    category: "Esportes",
    question: "Em qual país foi disputada a Copa do Mundo de 2014?",
    options: ["África do Sul", "Brasil", "Rússia", "Qatar"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual jogador é conhecido como \"O Rei do Futebol\"?",
    options: ["Pelé", "Maradona", "Zidane", "Ronaldinho"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Em qual esporte olímpico se usa o termo \"ippon\"?",
    options: ["Karatê", "Judô", "Taekwondo", "Esgrima"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Quantos sets, no máximo, uma partida de vôlei pode ter?",
    options: ["3", "4", "5", "6"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Qual país sedia tradicionalmente o torneio de tênis Roland Garros?",
    options: ["Inglaterra", "Estados Unidos", "França", "Austrália"],
    correctIndex: 2,
  },

  // Literatura
  {
    category: "Literatura",
    question: "Quem escreveu \"Dom Casmurro\"?",
    options: ["José de Alencar", "Machado de Assis", "Graciliano Ramos", "Jorge Amado"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Quem escreveu a saga de livros \"Harry Potter\"?",
    options: ["J.R.R. Tolkien", "J.K. Rowling", "George R.R. Martin", "C.S. Lewis"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual escritor brasileiro escreveu \"Vidas Secas\"?",
    options: ["Machado de Assis", "Graciliano Ramos", "Guimarães Rosa", "Clarice Lispector"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual é o nome do detetive criado por Arthur Conan Doyle?",
    options: ["Hercule Poirot", "Sherlock Holmes", "Philip Marlowe", "Auguste Dupin"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Quem escreveu \"Romeu e Julieta\"?",
    options: ["William Shakespeare", "Charles Dickens", "Oscar Wilde", "Jane Austen"],
    correctIndex: 0,
  },

  // Curiosidades
  {
    category: "Curiosidades",
    question: "Qual país tem o maior número de fusos horários em seu território?",
    options: ["Rússia", "Estados Unidos", "França", "China"],
    correctIndex: 2,
  },
  {
    category: "Curiosidades",
    question: "Qual é o metal mais abundante na crosta terrestre?",
    options: ["Ferro", "Alumínio", "Cobre", "Ouro"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o animal terrestre com a gestação mais longa?",
    options: ["Elefante", "Girafa", "Rinoceronte", "Baleia"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual é o nome da moeda utilizada no Japão?",
    options: ["Won", "Iene", "Yuan", "Rúpia"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual país é o maior produtor de café do mundo?",
    options: ["Colômbia", "Vietnã", "Brasil", "Etiópia"],
    correctIndex: 2,
  },
];
