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
    // História
  {
    category: "História",
    question: "Qual tratado encerrou oficialmente a Primeira Guerra Mundial entre a Alemanha e os Aliados?",
    options: ["Tratado de Versalhes", "Tratado de Tordesilhas", "Tratado de Utrecht", "Tratado de Paris"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual foi a principal consequência política da queda da Bastilha em 1789?",
    options: ["Início da Revolução Francesa", "Fim da Revolução Industrial", "Início da Guerra Civil Americana", "Queda do Império Romano"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual civilização desenvolveu um sistema de escrita conhecido como hieróglifos?",
    options: ["Egípcia", "Romana", "Viking", "Persa"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual foi o nome dado ao período de tensão política entre Estados Unidos e União Soviética após a Segunda Guerra Mundial?",
    options: ["Guerra dos Cem Anos", "Guerra Fria", "Guerra do Pacífico", "Guerra Total"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual evento marcou o fim simbólico da Guerra Fria em 1989?",
    options: ["Queda do Muro de Berlim", "Criação da OTAN", "Revolução Cubana", "Independência da Índia"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual faraó egípcio ficou famoso pela descoberta de sua tumba praticamente intacta em 1922?",
    options: ["Ramsés II", "Tutancâmon", "Cleópatra", "Quéops"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual foi o nome da operação militar que marcou o desembarque dos Aliados na Normandia em 1944?",
    options: ["Operação Barbarossa", "Operação Overlord", "Operação Market", "Operação Torch"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual país foi o primeiro a lançar um satélite artificial ao espaço?",
    options: ["Estados Unidos", "União Soviética", "Alemanha", "China"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual revolução derrubou a monarquia francesa e levou à execução de Luís XVI?",
    options: ["Revolução Francesa", "Revolução Russa", "Revolução Gloriosa", "Revolução Industrial"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual era o nome do sistema político e econômico predominante na Europa medieval baseado na posse de terras?",
    options: ["Capitalismo", "Feudalismo", "Socialismo", "Mercantilismo"],
    correctIndex: 1,
  },

  // Ciência
  {
    category: "Ciência",
    question: "Qual partícula subatômica possui carga elétrica negativa?",
    options: ["Próton", "Nêutron", "Elétron", "Núcleo"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual é o elemento químico representado pelo símbolo \"Fe\"?",
    options: ["Flúor", "Ferro", "Fósforo", "Frâncio"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual organela celular é conhecida como a principal responsável pela produção de ATP?",
    options: ["Ribossomo", "Mitocôndria", "Lisossomo", "Núcleo"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é a principal molécula responsável por armazenar a informação genética dos seres vivos?",
    options: ["ATP", "RNA", "DNA", "Glicose"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual força fundamental é responsável pela atração entre massas?",
    options: ["Eletromagnética", "Gravitacional", "Nuclear forte", "Nuclear fraca"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual fenômeno explica a mudança aparente na frequência de uma onda devido ao movimento relativo entre fonte e observador?",
    options: ["Efeito Doppler", "Efeito estufa", "Efeito fotoelétrico", "Efeito Joule"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual cientista formulou a teoria da evolução por seleção natural juntamente com Alfred Russel Wallace?",
    options: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Isaac Newton"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é aproximadamente a velocidade da luz no vácuo?",
    options: ["30 mil km/s", "300 mil km/s", "3 milhões km/s", "30 milhões km/s"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual tipo sanguíneo é considerado o doador universal de hemácias?",
    options: ["AB positivo", "O negativo", "A positivo", "B negativo"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual processo celular produz gametas com metade do número de cromossomos?",
    options: ["Mitose", "Meiose", "Osmose", "Fagocitose"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é a principal causa das estações do ano na Terra?",
    options: ["Variação da distância ao Sol", "Inclinação do eixo terrestre", "Rotação da Lua", "Variação da velocidade da luz"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual cientista propôs a teoria da relatividade?",
    options: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Stephen Hawking"],
    correctIndex: 1,
  },

  // Astronomia
  {
    category: "Astronomia",
    question: "Qual é a estrela mais próxima da Terra depois do Sol?",
    options: ["Sirius", "Betelgeuse", "Próxima Centauri", "Vega"],
    correctIndex: 2,
  },
  {
    category: "Astronomia",
    question: "Qual planeta possui o período de rotação mais longo do Sistema Solar?",
    options: ["Mercúrio", "Vênus", "Marte", "Netuno"],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "Qual é o maior satélite natural de Saturno?",
    options: ["Europa", "Titã", "Ganimedes", "Io"],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "Qual planeta possui a Grande Mancha Vermelha?",
    options: ["Saturno", "Júpiter", "Netuno", "Marte"],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "O que é um ano-luz?",
    options: ["Uma unidade de tempo", "Uma unidade de distância", "Uma unidade de velocidade", "Uma unidade de energia"],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "Qual planeta do Sistema Solar possui a maior inclinação axial?",
    options: ["Urano", "Júpiter", "Marte", "Saturno"],
    correctIndex: 0,
  },
  {
    category: "Astronomia",
    question: "Qual é o nome do buraco negro supermassivo localizado no centro da Via Láctea?",
    options: ["Sagittarius A*", "Cygnus X-1", "TON 618", "M87*"],
    correctIndex: 0,
  },
  {
    category: "Astronomia",
    question: "Qual é o nome da região ao redor de um buraco negro além da qual nem a luz consegue escapar?",
    options: ["Horizonte de eventos", "Singularidade", "Cinturão de Kuiper", "Magnetosfera"],
    correctIndex: 0,
  },
  {
    category: "Astronomia",
    question: "Qual planeta tem a maior velocidade de rotação em torno do próprio eixo?",
    options: ["Terra", "Júpiter", "Saturno", "Netuno"],
    correctIndex: 1,
  },
  {
    category: "Astronomia",
    question: "Qual é o nome da região além da órbita de Netuno que contém muitos corpos gelados, incluindo Plutão?",
    options: ["Cinturão de Kuiper", "Nuvem de Oort", "Cinturão de Asteroides", "Nuvem de Magalhães"],
    correctIndex: 0,
  },

  // Geografia
  {
    category: "Geografia",
    question: "Qual país possui a maior população da América do Sul?",
    options: ["Argentina", "Brasil", "Colômbia", "Peru"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é o país sem litoral mais populoso do mundo?",
    options: ["Bolívia", "Mongólia", "Etiópia", "Nepal"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o ponto mais baixo da superfície terrestre em terra firme?",
    options: ["Mar Morto", "Lago Baikal", "Vale da Morte", "Fossa das Marianas"],
    correctIndex: 0,
  },
  {
    category: "Geografia",
    question: "Qual país possui a maior extensão territorial da África?",
    options: ["Egito", "Argélia", "Sudão", "República Democrática do Congo"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual estreito separa a Europa da África?",
    options: ["Estreito de Bering", "Estreito de Gibraltar", "Estreito de Malaca", "Estreito de Ormuz"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual país possui território tanto na Europa quanto na Ásia e tem Istambul como sua maior cidade?",
    options: ["Turquia", "Grécia", "Rússia", "Geórgia"],
    correctIndex: 0,
  },
  {
    category: "Geografia",
    question: "Qual é o maior arquipélago do mundo em número de ilhas?",
    options: ["Indonésia", "Filipinas", "Suécia", "Japão"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual país possui a cidade de Samarcanda, uma importante cidade histórica da Rota da Seda?",
    options: ["Uzbequistão", "Cazaquistão", "Turcomenistão", "Mongólia"],
    correctIndex: 0,
  },
  {
    category: "Geografia",
    question: "Qual rio atravessa a cidade de Londres?",
    options: ["Sena", "Tâmisa", "Danúbio", "Reno"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a montanha mais alta do mundo medida a partir do nível do mar?",
    options: ["Aconcágua", "Everest", "K2", "Kilimanjaro"],
    correctIndex: 1,
  },

  // Matemática
  {
    category: "Matemática",
    question: "Qual é o resultado de 2 elevado à décima potência?",
    options: ["512", "1024", "2048", "4096"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Qual é o menor número primo?",
    options: ["0", "1", "2", "3"],
    correctIndex: 2,
  },
  {
    category: "Matemática",
    question: "Qual é a soma dos ângulos internos de um triângulo?",
    options: ["90°", "180°", "270°", "360°"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Se um produto de R$ 200 recebe um desconto de 25%, qual será seu preço final?",
    options: ["R$ 125", "R$ 150", "R$ 160", "R$ 175"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Qual é o resultado de 15 × 12?",
    options: ["160", "170", "180", "190"],
    correctIndex: 2,
  },
  {
    category: "Matemática",
    question: "Qual é o valor de 3³ + 4²?",
    options: ["35", "37", "39", "41"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Qual é aproximadamente a raiz quadrada de 2?",
    options: ["1,14", "1,41", "1,73", "2,41"],
    correctIndex: 1,
  },
  {
    category: "Matemática",
    question: "Se x + 7 = 19, qual é o valor de x?",
    options: ["10", "11", "12", "13"],
    correctIndex: 2,
  },
  {
    category: "Matemática",
    question: "Qual é o próximo número da sequência 2, 4, 8, 16, 32?",
    options: ["48", "54", "64", "72"],
    correctIndex: 2,
  },
  {
    category: "Matemática",
    question: "Um quadrado possui área de 81 cm². Qual é o comprimento de cada lado?",
    options: ["7 cm", "8 cm", "9 cm", "10 cm"],
    correctIndex: 2,
  },

  // Tecnologia
  {
    category: "Tecnologia",
    question: "Qual estrutura de dados segue o princípio LIFO?",
    options: ["Fila", "Pilha", "Árvore", "Grafo"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual linguagem de programação foi criada por Guido van Rossum?",
    options: ["Java", "Python", "C++", "Ruby"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual sistema de controle de versão distribuído foi criado por Linus Torvalds?",
    options: ["Git", "SVN", "Mercurial", "Docker"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual protocolo é usado principalmente para envio de e-mails?",
    options: ["HTTP", "FTP", "SMTP", "SSH"],
    correctIndex: 2,
  },
  {
    category: "Tecnologia",
    question: "Qual protocolo é normalmente utilizado para traduzir nomes de domínio em endereços IP?",
    options: ["DNS", "HTTP", "FTP", "TCP"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual é a principal função de uma GPU?",
    options: ["Armazenar arquivos", "Processar principalmente gráficos e operações paralelas", "Gerenciar a conexão Wi-Fi", "Controlar dispositivos USB"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual linguagem é executada diretamente pelo navegador para adicionar interatividade às páginas web?",
    options: ["JavaScript", "C#", "C++", "Assembly"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "O que significa a sigla \"SQL\"?",
    options: ["Structured Query Language", "System Query Logic", "Simple Question Language", "Structured Queue Logic"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual código de status HTTP indica que uma página ou recurso não foi encontrado?",
    options: ["200", "301", "404", "500"],
    correctIndex: 2,
  },
  {
    category: "Tecnologia",
    question: "Qual é a função principal de um sistema operacional?",
    options: ["Criar páginas web", "Gerenciar recursos do computador e fornecer uma interface para programas", "Aumentar a velocidade da internet", "Substituir a memória RAM"],
    correctIndex: 1,
  },

  // Literatura
  {
    category: "Literatura",
    question: "Quem escreveu \"Crime e Castigo\"?",
    options: ["Fiódor Dostoiévski", "Liev Tolstói", "Anton Tchekhov", "Nikolai Gogol"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual é o nome do protagonista de \"Dom Quixote\"?",
    options: ["Sancho Pança", "Dom Quixote", "Hamlet", "Fausto"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Quem escreveu \"1984\"?",
    options: ["George Orwell", "Aldous Huxley", "Ernest Hemingway", "George Eliot"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual obra de George Orwell apresenta uma sociedade distópica controlada pelo \"Grande Irmão\"?",
    options: ["A Revolução dos Bichos", "1984", "Admirável Mundo Novo", "Fahrenheit 451"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Quem escreveu \"Orgulho e Preconceito\"?",
    options: ["Jane Austen", "Emily Brontë", "Virginia Woolf", "Mary Shelley"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual escritor brasileiro escreveu \"Vidas Secas\"?",
    options: ["Graciliano Ramos", "Jorge Amado", "Érico Veríssimo", "José de Alencar"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual personagem é o narrador de \"Memórias Póstumas de Brás Cubas\"?",
    options: ["Quincas Borba", "Brás Cubas", "Bentinho", "Escobar"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Quem escreveu \"Frankenstein\"?",
    options: ["Mary Shelley", "Jane Austen", "Agatha Christie", "Emily Brontë"],
    correctIndex: 0,
  },

  // Cultura
  {
    category: "Cultura",
    question: "Qual movimento artístico é associado a artistas como Claude Monet e Pierre-Auguste Renoir?",
    options: ["Cubismo", "Impressionismo", "Surrealismo", "Expressionismo"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual artista pintou \"A Persistência da Memória\", famosa pelas imagens de relógios derretidos?",
    options: ["Pablo Picasso", "Salvador Dalí", "Vincent van Gogh", "Claude Monet"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual movimento artístico teve Pablo Picasso como um de seus principais representantes?",
    options: ["Cubismo", "Impressionismo", "Barroco", "Romantismo"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual obra de Leonardo da Vinci é conhecida pelo sorriso enigmático de sua personagem?",
    options: ["A Última Ceia", "Mona Lisa", "A Escola de Atenas", "O Nascimento de Vênus"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual compositor compôs a Nona Sinfonia e a famosa \"Ode à Alegria\"?",
    options: ["Mozart", "Beethoven", "Bach", "Vivaldi"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual movimento cultural brasileiro teve como marco a Semana de Arte Moderna de 1922?",
    options: ["Modernismo", "Romantismo", "Barroco", "Realismo"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual arquiteto brasileiro projetou grande parte dos edifícios monumentais de Brasília?",
    options: ["Oscar Niemeyer", "Lúcio Costa", "Paulo Mendes da Rocha", "Sérgio Bernardes"],
    correctIndex: 0,
  },

  // Música
  {
    category: "Música",
    question: "Qual compositor é conhecido por ter composto \"As Quatro Estações\"?",
    options: ["Antonio Vivaldi", "Johann Sebastian Bach", "Mozart", "Beethoven"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual banda britânica lançou o álbum \"Abbey Road\"?",
    options: ["The Rolling Stones", "The Beatles", "Queen", "Pink Floyd"],
    correctIndex: 1,
  },
  {
    category: "Música",
    question: "Qual cantor brasileiro ficou conhecido como \"Rei\" e teve grande destaque na Jovem Guarda?",
    options: ["Roberto Carlos", "Erasmo Carlos", "Tim Maia", "Caetano Veloso"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual gênero musical brasileiro surgiu da mistura de samba e jazz e teve Tom Jobim como um de seus principais nomes?",
    options: ["Bossa Nova", "Forró", "Tropicália", "Frevo"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual cantora ficou conhecida mundialmente como \"Rainha do Soul\"?",
    options: ["Aretha Franklin", "Whitney Houston", "Tina Turner", "Diana Ross"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual instrumento de cordas possui normalmente quatro cordas e é muito utilizado em orquestras?",
    options: ["Violino", "Harpa", "Piano", "Flauta"],
    correctIndex: 0,
  },

  // Esportes
  {
    category: "Esportes",
    question: "Qual país sediou a primeira Copa do Mundo de futebol, em 1930?",
    options: ["Brasil", "Uruguai", "Argentina", "Itália"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual tenista possui o recorde de maior número de títulos de Grand Slam entre os homens até 2025?",
    options: ["Roger Federer", "Rafael Nadal", "Novak Djokovic", "Andy Murray"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Em qual esporte o atleta precisa completar 42,195 quilômetros?",
    options: ["Triatlo", "Maratona", "Ciclismo", "Marcha atlética"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual país é conhecido por ter vencido mais Copas do Mundo de futebol masculino?",
    options: ["Alemanha", "Argentina", "Brasil", "Itália"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Qual é o nome da competição de tênis disputada entre seleções masculinas?",
    options: ["Fed Cup", "Copa Davis", "Laver Cup", "ATP Finals"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Em qual esporte é utilizado o termo \"knockout\" ou \"nocaute\"?",
    options: ["Boxe", "Tênis", "Golfe", "Natação"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual piloto possui sete títulos mundiais de Fórmula 1?",
    options: ["Ayrton Senna", "Michael Schumacher", "Alain Prost", "Sebastian Vettel"],
    correctIndex: 1,
  },

  // Filmes
  {
    category: "Filmes",
    question: "Qual diretor dirigiu os filmes \"Pulp Fiction\" e \"Kill Bill\"?",
    options: ["Christopher Nolan", "Quentin Tarantino", "Martin Scorsese", "Steven Spielberg"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual filme de Christopher Nolan apresenta um grupo que entra nos sonhos das pessoas?",
    options: ["Interestelar", "A Origem", "O Cavaleiro das Trevas", "Dunkirk"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual ator interpretou o Coringa no filme \"Coringa\" de 2019?",
    options: ["Jared Leto", "Joaquin Phoenix", "Heath Ledger", "Jack Nicholson"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual filme venceu o Oscar de Melhor Filme em 2020?",
    options: ["1917", "Coringa", "Parasita", "Era Uma Vez em... Hollywood"],
    correctIndex: 2,
  },
  {
    category: "Filmes",
    question: "Qual diretor é responsável pela trilogia \"O Senhor dos Anéis\" lançada entre 2001 e 2003?",
    options: ["Peter Jackson", "James Cameron", "George Lucas", "Ridley Scott"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Em qual filme aparece o personagem Tyler Durden?",
    options: ["Clube da Luta", "Seven", "O Iluminado", "American Psycho"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual filme de ficção científica apresenta o personagem Roy Batty?",
    options: ["Blade Runner", "Alien", "Matrix", "Ex Machina"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual atriz interpretou Hermione Granger na série de filmes Harry Potter?",
    options: ["Emma Stone", "Emma Watson", "Keira Knightley", "Natalie Portman"],
    correctIndex: 1,
  },

  // Curiosidades
  {
    category: "Curiosidades",
    question: "Qual é o único país que faz fronteira terrestre com Portugal?",
    options: ["França", "Espanha", "Itália", "Marrocos"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual animal possui a maior expectativa de vida conhecida entre os vertebrados?",
    options: ["Tartaruga-gigante", "Tubarão-da-Groenlândia", "Baleia-azul", "Elefante"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o nome da escala usada para medir a dureza dos minerais?",
    options: ["Escala Richter", "Escala Mohs", "Escala Kelvin", "Escala Beaufort"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o maior órgão interno do corpo humano?",
    options: ["Cérebro", "Fígado", "Pulmão", "Intestino"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual país é considerado o berço histórico do xadrez moderno?",
    options: ["Índia", "China", "Rússia", "Grécia"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual é o nome dado ao medo de lugares fechados?",
    options: ["Acrofobia", "Claustrofobia", "Agorafobia", "Aracnofobia"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o nome do fenômeno em que a Lua parece avermelhada durante um eclipse lunar total?",
    options: ["Lua azul", "Lua de sangue", "Lua negra", "Superlua"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o país de origem do tango?",
    options: ["Brasil", "Argentina e Uruguai", "Espanha", "México"],
    correctIndex: 1,
  },

  // Conhecimentos Gerais
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o maior órgão do corpo humano em área?",
    options: ["Fígado", "Pele", "Pulmão", "Intestino"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual organização utiliza a sigla UNESCO?",
    options: ["Organização Mundial da Saúde", "Organização das Nações Unidas para a Educação, a Ciência e a Cultura", "Organização Mundial do Comércio", "Organização Internacional do Trabalho"],
    correctIndex: 1,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é o nome do documento que garante direitos fundamentais e limita os poderes do Estado em muitos países?",
    options: ["Constituição", "Tratado comercial", "Código postal", "Decreto municipal"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é a língua mais falada no mundo considerando o número total de falantes, incluindo nativos e não nativos?",
    options: ["Inglês", "Mandarim", "Espanhol", "Hindi"],
    correctIndex: 0,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual é a moeda oficial do Japão?",
    options: ["Won", "Yuan", "Iene", "Rupia"],
    correctIndex: 2,
  },
  {
    category: "Conhecimentos Gerais",
    question: "Qual país foi o primeiro a conceder direito de voto às mulheres em nível nacional?",
    options: ["Estados Unidos", "Nova Zelândia", "Reino Unido", "França"],
    correctIndex: 1,
  },
];
