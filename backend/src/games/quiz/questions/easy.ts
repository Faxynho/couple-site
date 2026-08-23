import { RawQuizQuestion } from "./types";

/**
 * Perguntas "Fácil": conhecidas e diretas. Categorias: Conhecimentos Gerais,
 * Animais, Geografia básica, Ciência básica, Filmes e séries populares,
 * Esportes, Curiosidades.
 *
 * Para adicionar mais perguntas, basta empurrar novos objetos neste array —
 * nenhuma outra parte do código precisa mudar.
 */
export const EASY_QUESTIONS: RawQuizQuestion[] = [
  // Conhecimentos Gerais
  {
    category: "Conhecimentos Gerais",
    question: "Quantos dias tem um ano bissexto?",
    options: ["364", "365", "366", "367"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é a cor obtida ao misturar azul e amarelo?",
    options: ["Roxo", "Verde", "Laranja", "Cinza"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantos lados tem um hexágono?",
    options: ["5", "6", "7", "8"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o idioma oficial do Brasil?",
    options: ["Espanhol", "Português", "Francês", "Inglês"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantas horas tem um dia?",
    options: ["12", "20", "24", "30"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual desses é um instrumento musical de corda?",
    options: ["Flauta", "Violão", "Tambor", "Trompete"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantos meses do ano têm 31 dias?",
    options: ["5", "6", "7", "8"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é a moeda oficial dos Estados Unidos?",
    options: ["Euro", "Libra", "Dólar", "Peso"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual órgão do corpo humano é responsável por bombear o sangue?",
    options: ["Pulmão", "Fígado", "Coração", "Rim"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o oposto de \"quente\"?",
    options: ["Frio", "Morno", "Seco", "Úmido"],
    correctIndex: 0,
  },

  // Animais
  {
    category: "Animais",
    question: "Qual é o maior animal terrestre do mundo?",
    options: ["Rinoceronte", "Elefante-africano", "Hipopótamo", "Girafa"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual animal é conhecido como \"o rei da selva\"?",
    options: ["Tigre", "Leão", "Leopardo", "Urso"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual é o maior mamífero do mundo?",
    options: ["Elefante-africano", "Baleia-azul", "Tubarão-baleia", "Girafa"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Quantas patas tem uma aranha?",
    options: ["6", "8", "10", "12"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual desses animais consegue voar?",
    options: ["Pinguim", "Avestruz", "Morcego", "Ema"],
    correctIndex: 2,
  },
  {
    category: "Animais",
    question: "Qual é o animal nacional da Austrália, símbolo do país?",
    options: ["Coala", "Canguru", "Dingo", "Wombat"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual animal é conhecido por mudar de cor para se camuflar?",
    options: ["Camaleão", "Sapo", "Lagarto", "Cobra"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual é o único mamífero capaz de voar de verdade?",
    options: ["Esquilo-voador", "Morcego", "Golfinho", "Falcão"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Onde vivem naturalmente os ursos-polares?",
    options: ["Ártico", "Antártida", "Amazônia", "Saara"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual é o animal terrestre mais rápido do mundo?",
    options: ["Cavalo", "Leopardo", "Guepardo", "Avestruz"],
    correctIndex: 2,
  },

  // Geografia básica
  {
    category: "Geografia",
    question: "Qual é a capital do Brasil?",
    options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o maior país do mundo em área territorial?",
    options: ["China", "Estados Unidos", "Canadá", "Rússia"],
    correctIndex: 3,
  },
  {
    category: "Geografia",
    question: "Em qual continente fica o Egito?",
    options: ["Ásia", "África", "Europa", "Oceania"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é o maior oceano do mundo?",
    options: ["Atlântico", "Índico", "Pacífico", "Ártico"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o rio mais extenso da América do Sul?",
    options: ["Rio São Francisco", "Rio Amazonas", "Rio Paraná", "Rio Tietê"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual destas cidades é a capital da França?",
    options: ["Londres", "Roma", "Paris", "Madri"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o deserto mais extenso do mundo?",
    options: ["Deserto do Saara", "Deserto de Gobi", "Deserto do Atacama", "Antártida"],
    correctIndex: 3,
  },
  {
    category: "Geografia",
    question: "Qual país tem o formato de uma bota, na Europa?",
    options: ["Grécia", "Espanha", "Itália", "Portugal"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o continente mais populoso do mundo?",
    options: ["África", "Europa", "Ásia", "América"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual famosa muralha fica na China?",
    options: ["Muralha de Adriano", "Grande Muralha", "Muro de Berlim", "Muralha de Teodósio"],
    correctIndex: 1,
  },

  // Ciência básica
  {
    category: "Ciência",
    question: "Qual é o estado físico da água em forma de gelo?",
    options: ["Líquido", "Gasoso", "Sólido", "Plasma"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual planeta é conhecido como o \"planeta vermelho\"?",
    options: ["Vênus", "Marte", "Júpiter", "Mercúrio"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual gás os seres humanos precisam respirar para viver?",
    options: ["Gás carbônico", "Nitrogênio", "Oxigênio", "Hidrogênio"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é a fórmula química da água?",
    options: ["CO2", "H2O", "O2", "NaCl"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Quantos ossos tem, aproximadamente, o corpo humano adulto?",
    options: ["106", "156", "206", "256"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é a estrela mais próxima da Terra?",
    options: ["Sirius", "Proxima Centauri", "Sol", "Vega"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "O que as plantas produzem através da fotossíntese?",
    options: ["Água e sal", "Oxigênio e glicose", "Nitrogênio", "Gás carbônico apenas"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o metal líquido à temperatura ambiente?",
    options: ["Ferro", "Mercúrio", "Alumínio", "Chumbo"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual órgão do corpo humano é responsável por filtrar o sangue?",
    options: ["Coração", "Pulmão", "Rim", "Estômago"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é a unidade básica da vida?",
    options: ["Átomo", "Célula", "Molécula", "Tecido"],
    correctIndex: 1,
  },

  // Filmes e séries populares
  {
    category: "Filmes",
    question: "Em qual filme um menino bruxo estuda na escola de Hogwarts?",
    options: ["Percy Jackson", "Harry Potter", "As Crônicas de Nárnia", "O Senhor dos Anéis"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual é o nome do peixe palhaço protagonista de uma animação da Pixar?",
    options: ["Dory", "Nemo", "Marlin", "Bruce"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Em \"Toy Story\", qual é o nome do cowboy de brinquedo?",
    options: ["Buzz Lightyear", "Woody", "Rex", "Hamm"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual super-herói é conhecido por usar um escudo indestrutível?",
    options: ["Homem de Ferro", "Thor", "Capitão América", "Hulk"],
    correctIndex: 2,
  },
  {
    category: "Filmes",
    question: "Em \"Frozen\", qual é o nome da princesa com poderes de gelo?",
    options: ["Anna", "Elsa", "Rapunzel", "Merida"],
    correctIndex: 1,
  },
  {
    category: "Séries",
    question: "Em \"Friends\", em qual cidade os personagens moram?",
    options: ["Los Angeles", "Chicago", "Nova York", "Boston"],
    correctIndex: 2,
  },
  {
    category: "Séries",
    question: "Qual é o sobrenome da família amarela de \"Os Simpsons\"?",
    options: ["Griffin", "Simpson", "Smith", "Belcher"],
    correctIndex: 1,
  },
  {
    category: "Séries",
    question: "Em \"Stranger Things\", como se chama a dimensão sombria e paralela?",
    options: ["Mundo Invertido", "Submundo", "Zona Escura", "Outro Lado"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual animação conta a história de um super-herói robô e um menino chamado Hiro?",
    options: ["Big Hero 6", "Wall-E", "Os Incríveis", "Ralph Quebra-Tudo"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Quem é o encanador mais famoso dos videogames, mascote da Nintendo?",
    options: ["Luigi", "Mario", "Yoshi", "Wario"],
    correctIndex: 1,
  },

  // Esportes
  {
    category: "Esportes",
    question: "Quantos jogadores titulares tem um time de futebol em campo?",
    options: ["9", "10", "11", "12"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Em qual esporte se usa uma raquete e uma peteca?",
    options: ["Tênis", "Badminton", "Squash", "Pingue-pongue"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "A cada quantos anos acontecem os Jogos Olímpicos de verão?",
    options: ["2", "3", "4", "5"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Qual país é o maior vencedor de Copas do Mundo de futebol?",
    options: ["Alemanha", "Argentina", "Brasil", "Itália"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Em qual esporte é comum ouvir o termo \"nocaute\"?",
    options: ["Judô", "Boxe", "Esgrima", "Luta livre"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Quantos pontos vale uma cesta de três no basquete?",
    options: ["1", "2", "3", "4"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Em qual esporte se disputa o torneio de Wimbledon?",
    options: ["Golfe", "Tênis", "Vôlei", "Críquete"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual é o nome da bola usada no vôlei de praia e na quadra?",
    options: ["Bola de vôlei", "Bola de handebol", "Bola de futsal", "Bola de rugby"],
    correctIndex: 0,
  },

  // Curiosidades
  {
    category: "Curiosidades",
    question: "Qual é a cor da girafa quando ela nasce?",
    options: ["Branca", "Já nasce com manchas", "Cinza", "Preta"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Quantas cordas tem um violão comum?",
    options: ["4", "5", "6", "7"],
    correctIndex: 2,
  },
  {
    category: "Curiosidades",
    question: "Qual fruta é conhecida por deixar dentes e língua amarelados na piada popular do \"sorriso amarelo\"?",
    options: ["Manga", "Limão", "Abacaxi", "Laranja"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o maior órgão do corpo humano?",
    options: ["Fígado", "Cérebro", "Pele", "Coração"],
    correctIndex: 2,
  },
  {
    category: "Curiosidades",
    question: "Quantas cores tem o arco-íris tradicionalmente?",
    options: ["5", "6", "7", "8"],
    correctIndex: 2,
  },
  {
    category: "Curiosidades",
    question: "Qual é o dia da semana que vem depois de quarta-feira?",
    options: ["Terça-feira", "Quinta-feira", "Sexta-feira", "Sábado"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual doce é tradicionalmente usado para comemorar aniversários?",
    options: ["Pudim", "Bolo", "Torta", "Sorvete"],
    correctIndex: 1,
  },
];
