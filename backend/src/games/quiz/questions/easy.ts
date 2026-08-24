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
    // Conhecimentos Gerais
  {
    category: "Conhecimentos Gerais",
    question: "Quantos minutos tem uma hora?",
    options: ["30", "45", "60", "90"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantos segundos tem um minuto?",
    options: ["30", "60", "90", "100"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantos dias tem uma semana?",
    options: ["5", "6", "7", "8"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o primeiro mês do ano?",
    options: ["Janeiro", "Fevereiro", "Março", "Abril"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o último mês do ano?",
    options: ["Outubro", "Novembro", "Dezembro", "Janeiro"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantas letras tem o alfabeto português?",
    options: ["24", "25", "26", "27"],
    correctIndex: 3,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o contrário de \"alto\"?",
    options: ["Grande", "Baixo", "Largo", "Fino"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual destes números é par?",
    options: ["3", "7", "9", "12"],
    correctIndex: 3,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Quantos dedos uma pessoa normalmente tem nas duas mãos?",
    options: ["8", "10", "12", "15"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual destes objetos é usado para medir o tempo?",
    options: ["Régua", "Relógio", "Balança", "Termômetro"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual destes é usado para medir peso?",
    options: ["Balança", "Régua", "Relógio", "Bússola"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é a forma de uma bola?",
    options: ["Cúbica", "Esférica", "Triangular", "Quadrada"],
    correctIndex: 1,
  },

  // Animais
  {
    category: "Animais",
    question: "Qual animal é conhecido por latir?",
    options: ["Gato", "Cachorro", "Cavalo", "Pato"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual animal faz \"miau\"?",
    options: ["Cachorro", "Gato", "Vaca", "Ovelha"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual animal produz leite que é muito consumido pelos seres humanos?",
    options: ["Vaca", "Galinha", "Cobra", "Peixe"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual animal possui uma tromba?",
    options: ["Girafa", "Elefante", "Leão", "Zebra"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual animal possui listras pretas e brancas?",
    options: ["Zebra", "Girafa", "Elefante", "Urso"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual desses animais vive principalmente na água?",
    options: ["Cachorro", "Golfinho", "Cavalo", "Coelho"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual ave é conhecida por não conseguir voar?",
    options: ["Águia", "Pardal", "Pinguim", "Andorinha"],
    correctIndex: 2,
  },
  {
    category: "Animais",
    question: "Qual animal é famoso por carregar sua casa nas costas?",
    options: ["Tartaruga", "Cavalo", "Macaco", "Tigre"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual inseto produz mel?",
    options: ["Mosca", "Abelha", "Formiga", "Barata"],
    correctIndex: 1,
  },
  {
    category: "Animais",
    question: "Qual animal é conhecido por coaxar?",
    options: ["Sapo", "Gato", "Cachorro", "Cavalo"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual animal é conhecido por ter um pescoço muito comprido?",
    options: ["Girafa", "Leão", "Tigre", "Panda"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual desses animais é um réptil?",
    options: ["Cobra", "Cachorro", "Golfinho", "Pinguim"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual animal é conhecido por armazenar comida nas bochechas?",
    options: ["Hamster", "Girafa", "Cavalo", "Pinguim"],
    correctIndex: 0,
  },
  {
    category: "Animais",
    question: "Qual desses animais é um felino?",
    options: ["Leão", "Lobo", "Cavalo", "Coelho"],
    correctIndex: 0,
  },

  // Geografia
  {
    category: "Geografia",
    question: "Qual é a capital da Argentina?",
    options: ["Lima", "Buenos Aires", "Santiago", "Montevidéu"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a capital de Portugal?",
    options: ["Lisboa", "Porto", "Madrid", "Barcelona"],
    correctIndex: 0,
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Itália?",
    options: ["Milão", "Veneza", "Roma", "Nápoles"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é a capital dos Estados Unidos?",
    options: ["Nova York", "Los Angeles", "Washington, D.C.", "Chicago"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Em qual continente fica o Brasil?",
    options: ["Europa", "Ásia", "América do Sul", "África"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual país é conhecido pela Torre Eiffel?",
    options: ["Itália", "França", "Espanha", "Alemanha"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual país é conhecido pelas pirâmides de Gizé?",
    options: ["Egito", "Grécia", "México", "Índia"],
    correctIndex: 0,
  },
  {
    category: "Geografia",
    question: "Qual é o maior continente do mundo em área?",
    options: ["África", "Europa", "Ásia", "Oceania"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o menor continente em área?",
    options: ["Europa", "Oceania", "África", "América do Sul"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual oceano banha a costa leste do Brasil?",
    options: ["Pacífico", "Atlântico", "Índico", "Ártico"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Em qual país fica a cidade de Nova York?",
    options: ["Canadá", "Estados Unidos", "México", "Inglaterra"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual país tem Lisboa como capital?",
    options: ["Espanha", "Portugal", "Itália", "França"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é o país conhecido pelo formato de uma bota?",
    options: ["França", "Itália", "Alemanha", "Grécia"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Espanha?",
    options: ["Barcelona", "Sevilha", "Madrid", "Valência"],
    correctIndex: 2,
  },

  // Ciência
  {
    category: "Ciência",
    question: "Qual planeta é o mais próximo do Sol?",
    options: ["Vênus", "Terra", "Mercúrio", "Marte"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é o maior planeta do Sistema Solar?",
    options: ["Saturno", "Júpiter", "Netuno", "Terra"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual planeta é famoso por seus anéis?",
    options: ["Marte", "Vênus", "Saturno", "Mercúrio"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é o planeta onde vivemos?",
    options: ["Marte", "Terra", "Vênus", "Júpiter"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual astro fica no centro do Sistema Solar?",
    options: ["Lua", "Terra", "Sol", "Júpiter"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é o satélite natural da Terra?",
    options: ["Sol", "Marte", "Lua", "Vênus"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual gás é liberado pelas plantas durante a fotossíntese?",
    options: ["Oxigênio", "Hidrogênio", "Nitrogênio", "Hélio"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual parte da planta geralmente absorve água do solo?",
    options: ["Flor", "Folha", "Raiz", "Fruto"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual parte da planta geralmente realiza a maior parte da fotossíntese?",
    options: ["Raiz", "Folha", "Semente", "Fruto"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o estado físico da água que bebemos?",
    options: ["Sólido", "Líquido", "Gasoso", "Plasma"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "O que acontece com a água quando ela congela?",
    options: ["Vira gás", "Vira gelo", "Evapora completamente", "Desaparece"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual força nos mantém sobre a superfície da Terra?",
    options: ["Gravidade", "Eletricidade", "Magnetismo", "Pressão"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual órgão usamos principalmente para respirar?",
    options: ["Coração", "Pulmão", "Estômago", "Fígado"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual órgão é responsável por bombear o sangue pelo corpo?",
    options: ["Cérebro", "Pulmão", "Coração", "Rim"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual sentido está relacionado aos olhos?",
    options: ["Audição", "Visão", "Olfato", "Paladar"],
    correctIndex: 1,
  },

  // História
  {
    category: "História",
    question: "Quem descobriu o Brasil segundo a versão tradicional ensinada nas escolas?",
    options: ["Cristóvão Colombo", "Pedro Álvares Cabral", "Vasco da Gama", "Dom Pedro I"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Em que ano ocorreu a Independência do Brasil?",
    options: ["1500", "1822", "1889", "1900"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Quem proclamou a Independência do Brasil?",
    options: ["Dom Pedro I", "Dom Pedro II", "Tiradentes", "Getúlio Vargas"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual civilização construiu as pirâmides de Gizé?",
    options: ["Romanos", "Egípcios", "Gregos", "Vikings"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual cidade antiga foi destruída pela erupção do Vesúvio?",
    options: ["Pompeia", "Atenas", "Esparta", "Cartago"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Quem foi o primeiro imperador do Brasil?",
    options: ["Dom Pedro I", "Dom Pedro II", "Getúlio Vargas", "Juscelino Kubitschek"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual foi a principal cidade do Império Romano?",
    options: ["Roma", "Paris", "Londres", "Lisboa"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual povo construiu o Coliseu?",
    options: ["Romanos", "Egípcios", "Maias", "Astecas"],
    correctIndex: 0,
  },

  // Filmes e Séries
  {
    category: "Filmes",
    question: "Qual personagem vive em um abacaxi no fundo do mar?",
    options: ["Patrick", "Bob Esponja", "Nemo", "Stitch"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual é o nome do boneco astronauta de Toy Story?",
    options: ["Woody", "Buzz Lightyear", "Rex", "Andy"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual personagem é conhecido por dizer \"Hakuna Matata\"?",
    options: ["Simba", "Mufasa", "Scar", "Timão"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual princesa da Disney perde um sapato de cristal?",
    options: ["Branca de Neve", "Cinderela", "Ariel", "Aurora"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual personagem da Disney é uma sereia?",
    options: ["Elsa", "Ariel", "Mulan", "Moana"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual é o nome do boneco de neve de Frozen?",
    options: ["Sven", "Olaf", "Kristoff", "Hans"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual super-herói usa uma armadura vermelha e dourada?",
    options: ["Hulk", "Homem de Ferro", "Batman", "Superman"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual super-herói é conhecido por usar uma teia?",
    options: ["Batman", "Homem-Aranha", "Thor", "Hulk"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual personagem usa um martelo chamado Mjölnir?",
    options: ["Thor", "Hulk", "Homem de Ferro", "Gavião Arqueiro"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual é o nome do leão protagonista de O Rei Leão?",
    options: ["Scar", "Simba", "Mufasa", "Timon"],
    correctIndex: 1,
  },

  // Séries
  {
    category: "Séries",
    question: "Qual personagem amarelo vive na Fenda do Biquíni?",
    options: ["Patrick", "Bob Esponja", "Plankton", "Lula Molusco"],
    correctIndex: 1,
  },
  {
    category: "Séries",
    question: "Qual é o nome do cachorro de Scooby-Doo?",
    options: ["Scooby-Doo", "Snoopy", "Pluto", "Bolt"],
    correctIndex: 0,
  },
  {
    category: "Séries",
    question: "Qual série acompanha um grupo de jovens enfrentando criaturas de outra dimensão em Hawkins?",
    options: ["Friends", "Stranger Things", "The Office", "The Crown"],
    correctIndex: 1,
  },
  {
    category: "Séries",
    question: "Qual é o nome do personagem principal de Mr. Bean?",
    options: ["Mr. Bean", "Mr. Brown", "Mr. Smith", "Mr. Black"],
    correctIndex: 0,
  },
  {
    category: "Séries",
    question: "Qual família é protagonista de Os Simpsons?",
    options: ["Família Griffin", "Família Simpson", "Família Smith", "Família Brown"],
    correctIndex: 1,
  },
  {
    category: "Séries",
    question: "Qual personagem de Friends trabalha como paleontólogo?",
    options: ["Joey", "Ross", "Chandler", "Monica"],
    correctIndex: 1,
  },

  // Esportes
  {
    category: "Esportes",
    question: "Quantos jogadores formam uma equipe de vôlei em quadra?",
    options: ["5", "6", "7", "8"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual esporte é jogado com uma cesta?",
    options: ["Basquete", "Vôlei", "Tênis", "Natação"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual esporte utiliza uma bola oval?",
    options: ["Futebol", "Rugby", "Tênis", "Vôlei"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Em qual esporte os jogadores usam luvas e tentam marcar gols com os pés?",
    options: ["Futebol", "Basquete", "Vôlei", "Tênis"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual esporte é praticado em uma piscina?",
    options: ["Natação", "Futebol", "Ciclismo", "Judô"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual esporte usa uma rede dividindo a quadra?",
    options: ["Vôlei", "Atletismo", "Boxe", "Natação"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual esporte é praticado com bicicleta?",
    options: ["Ciclismo", "Surfe", "Judô", "Golfe"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual esporte é praticado sobre ondas usando uma prancha?",
    options: ["Surfe", "Esgrima", "Atletismo", "Basquete"],
    correctIndex: 0,
  },

  // Música
  {
    category: "Música",
    question: "Quantas cordas tem um violão tradicional?",
    options: ["4", "5", "6", "7"],
    correctIndex: 2,
  },
  {
    category: "Música",
    question: "Qual instrumento possui teclas pretas e brancas?",
    options: ["Violão", "Piano", "Bateria", "Flauta"],
    correctIndex: 1,
  },
  {
    category: "Música",
    question: "Qual instrumento possui pratos e tambores?",
    options: ["Piano", "Bateria", "Violino", "Flauta"],
    correctIndex: 1,
  },
  {
    category: "Música",
    question: "Qual instrumento normalmente possui quatro cordas e é tocado com um arco?",
    options: ["Violino", "Piano", "Bateria", "Flauta"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual destes instrumentos é de sopro?",
    options: ["Flauta", "Violão", "Piano", "Bateria"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual instrumento é conhecido por ter seis cordas?",
    options: ["Violão", "Bateria", "Piano", "Flauta"],
    correctIndex: 0,
  },

  // Tecnologia
  {
    category: "Tecnologia",
    question: "Qual dispositivo é usado para fazer ligações telefônicas e acessar a internet?",
    options: ["Celular", "Teclado", "Impressora", "Monitor"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual componente é usado para clicar e mover o cursor no computador?",
    options: ["Teclado", "Mouse", "Monitor", "Impressora"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual dispositivo é usado para imprimir documentos?",
    options: ["Scanner", "Impressora", "Mouse", "Roteador"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual componente do computador é usado principalmente para digitar?",
    options: ["Mouse", "Teclado", "Monitor", "Caixa de som"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual destes é um navegador de internet?",
    options: ["Chrome", "Windows", "Android", "Photoshop"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual empresa criou o sistema operacional Windows?",
    options: ["Apple", "Google", "Microsoft", "Nintendo"],
    correctIndex: 2,
  },
  {
    category: "Tecnologia",
    question: "Qual empresa criou o iPhone?",
    options: ["Samsung", "Apple", "Microsoft", "Sony"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual destes dispositivos é usado para armazenar arquivos?",
    options: ["HD", "Mouse", "Teclado", "Monitor"],
    correctIndex: 0,
  },

  // Comida
  {
    category: "Conhecimentos Gerais",
    question: "Qual ingrediente é usado para fazer chocolate?",
    options: ["Cacau", "Arroz", "Milho", "Batata"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual fruta é conhecida por ser amarela e curva?",
    options: ["Maçã", "Banana", "Uva", "Melancia"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual fruta possui geralmente uma casca verde e interior vermelho com sementes pretas?",
    options: ["Melancia", "Banana", "Laranja", "Manga"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual alimento é feito principalmente com leite e pode ser amarelo ou branco?",
    options: ["Arroz", "Queijo", "Feijão", "Pão"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual destes alimentos é produzido pelas abelhas?",
    options: ["Mel", "Queijo", "Pão", "Arroz"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual destes é um tempero?",
    options: ["Sal", "Banana", "Leite", "Arroz"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual alimento é tradicionalmente feito com milho?",
    options: ["Pipoca", "Queijo", "Iogurte", "Manteiga"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual bebida é tradicionalmente preparada a partir de grãos torrados?",
    options: ["Café", "Leite", "Água", "Suco"],
    correctIndex: 0,
  },

  // Corpo Humano
  {
    category: "Ciência",
    question: "Qual parte do corpo usamos para enxergar?",
    options: ["Ouvidos", "Olhos", "Nariz", "Mãos"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual parte do corpo usamos para ouvir?",
    options: ["Olhos", "Ouvidos", "Boca", "Pés"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual parte do corpo usamos principalmente para sentir cheiros?",
    options: ["Nariz", "Olho", "Ouvido", "Mão"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual parte do corpo usamos para mastigar?",
    options: ["Dentes", "Cabelos", "Unhas", "Orelhas"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual órgão controla grande parte das funções do corpo?",
    options: ["Coração", "Cérebro", "Pulmão", "Estômago"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual parte do corpo usamos principalmente para caminhar?",
    options: ["Pés", "Mãos", "Ouvidos", "Dentes"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual parte do corpo possui unhas?",
    options: ["Dedos", "Cotovelos", "Ombros", "Pescoço"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual órgão participa da digestão dos alimentos?",
    options: ["Estômago", "Coração", "Pulmão", "Cérebro"],
    correctIndex: 0,
  },

  // Natureza
  {
    category: "Natureza",
    question: "Qual estrela ilumina a Terra durante o dia?",
    options: ["Lua", "Sol", "Sirius", "Marte"],
    correctIndex: 1,
  },
  {
    category: "Natureza",
    question: "O que cai do céu durante uma chuva?",
    options: ["Areia", "Água", "Pedra", "Fogo"],
    correctIndex: 1,
  },
  {
    category: "Natureza",
    question: "Qual é a cor mais associada às folhas das plantas?",
    options: ["Azul", "Verde", "Roxo", "Rosa"],
    correctIndex: 1,
  },
  {
    category: "Natureza",
    question: "Qual fenômeno aparece no céu quando a luz é refletida e refratada em gotas de água?",
    options: ["Arco-íris", "Terremoto", "Vulcão", "Tsunami"],
    correctIndex: 0,
  },
  {
    category: "Natureza",
    question: "Qual fenômeno é causado pelo movimento das placas tectônicas e pode fazer o chão tremer?",
    options: ["Terremoto", "Chuva", "Arco-íris", "Eclipse"],
    correctIndex: 0,
  },
  {
    category: "Natureza",
    question: "Como é chamada a água congelada?",
    options: ["Vapor", "Gelo", "Chuva", "Névoa"],
    correctIndex: 1,
  },
  {
    category: "Natureza",
    question: "Qual fenômeno ocorre quando a Lua passa entre a Terra e o Sol?",
    options: ["Eclipse solar", "Eclipse lunar", "Aurora", "Arco-íris"],
    correctIndex: 0,
  },
  {
    category: "Natureza",
    question: "Qual é o nome da água que cai das nuvens em forma líquida?",
    options: ["Neve", "Chuva", "Granizo", "Gelo"],
    correctIndex: 1,
  },

  // Cultura e Curiosidades
  {
    category: "Curiosidades",
    question: "Qual é o nome do famoso relógio localizado em Londres?",
    options: ["Big Ben", "Big Clock", "London Clock", "Royal Clock"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual objeto é tradicionalmente usado para cortar papel?",
    options: ["Colher", "Tesoura", "Régua", "Pincel"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual objeto é usado para escrever com tinta?",
    options: ["Caneta", "Tesoura", "Borracha", "Régua"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual objeto é usado para apagar o que foi escrito a lápis?",
    options: ["Caneta", "Borracha", "Tesoura", "Cola"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual objeto é usado para medir pequenos comprimentos?",
    options: ["Régua", "Relógio", "Bússola", "Balança"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual instrumento é usado para indicar direções?",
    options: ["Bússola", "Régua", "Termômetro", "Balança"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual cor resulta da mistura de vermelho e amarelo?",
    options: ["Verde", "Roxo", "Laranja", "Azul"],
    correctIndex: 2,
  },
  {
    category: "Curiosidades",
    question: "Qual cor resulta da mistura de vermelho e azul?",
    options: ["Verde", "Roxo", "Laranja", "Amarelo"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual cor é normalmente associada ao céu em um dia sem nuvens?",
    options: ["Verde", "Azul", "Roxo", "Laranja"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual destes é normalmente usado para iluminar um ambiente?",
    options: ["Lâmpada", "Travesseiro", "Tapete", "Colher"],
    correctIndex: 0,
  },
];
