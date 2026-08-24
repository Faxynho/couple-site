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
    // História
  {
    category: "História",
    question: "Qual foi o principal objetivo da Revolução Industrial?",
    options: ["Expandir o território europeu", "Aumentar a produção por meio de máquinas", "Acabar com as monarquias", "Criar novas religiões"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual império tinha Constantinopla como capital?",
    options: ["Império Romano do Ocidente", "Império Bizantino", "Império Mongol", "Império Persa"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Em qual país começou a Revolução Industrial?",
    options: ["França", "Alemanha", "Inglaterra", "Itália"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Quem foi o último imperador do Brasil?",
    options: ["Dom Pedro I", "Dom Pedro II", "Deodoro da Fonseca", "Getúlio Vargas"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual evento marcou o início da Primeira Guerra Mundial?",
    options: ["Queda do Muro de Berlim", "Invasão da Polônia", "Assassinato de Francisco Ferdinando", "Revolução Russa"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Qual país foi governado por Josef Stalin durante grande parte da Segunda Guerra Mundial?",
    options: ["Alemanha", "União Soviética", "Polônia", "França"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual foi o principal motivo da construção do Muro de Berlim?",
    options: ["Separar Alemanha Ocidental e Oriental", "Proteger Berlim contra invasões", "Separar França e Alemanha", "Impedir a entrada de turistas"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual povo antigo ficou conhecido por sua habilidade na navegação pelo Mediterrâneo?",
    options: ["Fenícios", "Maias", "Astecas", "Incas"],
    correctIndex: 0,
  },
  {
    category: "História",
    question: "Qual civilização criou os Jogos Olímpicos na Antiguidade?",
    options: ["Egípcia", "Romana", "Grega", "Persa"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Qual foi a capital do Brasil antes de Brasília?",
    options: ["Salvador", "São Paulo", "Rio de Janeiro", "Recife"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Em que ano foi proclamada a República no Brasil?",
    options: ["1822", "1889", "1891", "1930"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual movimento brasileiro defendia a independência de Minas Gerais no século XVIII?",
    options: ["Revolta da Vacina", "Inconfidência Mineira", "Revolução Farroupilha", "Guerra de Canudos"],
    correctIndex: 1,
  },
  {
    category: "História",
    question: "Qual país lançou as bombas atômicas sobre Hiroshima e Nagasaki durante a Segunda Guerra Mundial?",
    options: ["Alemanha", "União Soviética", "Estados Unidos", "Japão"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Qual era o principal produto econômico do Brasil colonial durante grande parte do século XVI?",
    options: ["Café", "Ouro", "Açúcar", "Borracha"],
    correctIndex: 2,
  },
  {
    category: "História",
    question: "Qual imperador romano ficou conhecido por legalizar o cristianismo no Império Romano?",
    options: ["Nero", "Constantino", "Augusto", "Trajano"],
    correctIndex: 1,
  },

  // Geografia
  {
    category: "Geografia",
    question: "Qual é o maior país da América do Sul em território?",
    options: ["Argentina", "Brasil", "Peru", "Colômbia"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual rio é geralmente considerado o mais extenso do mundo?",
    options: ["Nilo", "Amazonas", "Mississipi", "Yangtzé"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual país possui o formato aproximado de uma bota?",
    options: ["Grécia", "Itália", "Espanha", "Croácia"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a capital do Canadá?",
    options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Turquia?",
    options: ["Istambul", "Ancara", "Esmirna", "Bursa"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual deserto é considerado o maior deserto quente do mundo?",
    options: ["Gobi", "Saara", "Atacama", "Kalahari"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Em qual continente está localizado o deserto do Saara?",
    options: ["Ásia", "África", "Oceania", "América do Sul"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é o país mais extenso do mundo?",
    options: ["Canadá", "China", "Rússia", "Estados Unidos"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual linha imaginária divide a Terra nos hemisférios Norte e Sul?",
    options: ["Meridiano de Greenwich", "Trópico de Câncer", "Linha do Equador", "Trópico de Capricórnio"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual oceano é o maior do planeta?",
    options: ["Atlântico", "Índico", "Pacífico", "Ártico"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual país possui a maior parte da floresta amazônica?",
    options: ["Peru", "Brasil", "Colômbia", "Bolívia"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Suíça?",
    options: ["Zurique", "Genebra", "Berna", "Basileia"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual país é conhecido como a Terra do Sol Nascente?",
    options: ["China", "Coreia do Sul", "Japão", "Tailândia"],
    correctIndex: 2,
  },
  {
    category: "Geografia",
    question: "Qual é o ponto mais alto da África?",
    options: ["Monte Everest", "Monte Kilimanjaro", "Aconcágua", "Monte Elbrus"],
    correctIndex: 1,
  },
  {
    category: "Geografia",
    question: "Qual país não possui saída para o mar?",
    options: ["Chile", "Bolívia", "Equador", "Uruguai"],
    correctIndex: 1,
  },

  // Ciência
  {
    category: "Ciência",
    question: "Qual é o elemento químico de símbolo \"Na\"?",
    options: ["Nitrogênio", "Sódio", "Neônio", "Níquel"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o maior órgão do corpo humano?",
    options: ["Fígado", "Coração", "Pele", "Pulmão"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual planeta possui a maior temperatura média da superfície do Sistema Solar?",
    options: ["Mercúrio", "Vênus", "Marte", "Júpiter"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é a principal função das hemácias?",
    options: ["Combater vírus", "Transportar oxigênio", "Produzir hormônios", "Digestionar alimentos"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual estrutura celular contém a maior parte do DNA de uma célula eucariótica?",
    options: ["Núcleo", "Ribossomo", "Mitocôndria", "Membrana"],
    correctIndex: 0,
  },
  {
    category: "Ciência",
    question: "Qual vitamina é produzida pelo corpo com a exposição da pele à luz solar?",
    options: ["Vitamina A", "Vitamina B12", "Vitamina C", "Vitamina D"],
    correctIndex: 3,
  },
  {
    category: "Ciência",
    question: "Qual é o pH aproximado de uma solução neutra?",
    options: ["0", "5", "7", "14"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual gás é o mais abundante na atmosfera terrestre?",
    options: ["Oxigênio", "Nitrogênio", "Gás carbônico", "Hidrogênio"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é a unidade utilizada para medir a corrente elétrica?",
    options: ["Volt", "Watt", "Ampere", "Ohm"],
    correctIndex: 2,
  },
  {
    category: "Ciência",
    question: "Qual cientista é associado às três leis do movimento?",
    options: ["Albert Einstein", "Isaac Newton", "Charles Darwin", "Galileu Galilei"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o nome do processo pelo qual uma célula se divide em duas células geneticamente semelhantes?",
    options: ["Meiose", "Mitose", "Fotossíntese", "Osmose"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual é o metal líquido em temperatura ambiente?",
    options: ["Ferro", "Mercúrio", "Alumínio", "Cobre"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual órgão humano produz a insulina?",
    options: ["Fígado", "Pâncreas", "Rim", "Estômago"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Qual planeta é conhecido como Planeta Vermelho?",
    options: ["Vênus", "Marte", "Mercúrio", "Saturno"],
    correctIndex: 1,
  },
  {
    category: "Ciência",
    question: "Como é chamada a passagem da água do estado líquido para o gasoso?",
    options: ["Condensação", "Evaporação", "Solidificação", "Fusão"],
    correctIndex: 1,
  },

  // Tecnologia
  {
    category: "Tecnologia",
    question: "O que significa a sigla \"RAM\"?",
    options: ["Random Access Memory", "Read Access Machine", "Rapid Application Memory", "Random Application Module"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual empresa desenvolveu o sistema operacional Android?",
    options: ["Microsoft", "Google", "Apple", "IBM"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual protocolo é normalmente utilizado para acessar páginas da web?",
    options: ["HTTP", "FTP", "SMTP", "SSH"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual linguagem é utilizada para estruturar o conteúdo de uma página web?",
    options: ["CSS", "HTML", "Python", "SQL"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual linguagem é utilizada principalmente para estilizar páginas web?",
    options: ["HTML", "CSS", "SQL", "Java"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual empresa desenvolveu o processador Ryzen?",
    options: ["Intel", "AMD", "NVIDIA", "Qualcomm"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual empresa é responsável pelas placas de vídeo da linha GeForce?",
    options: ["AMD", "Intel", "NVIDIA", "ASUS"],
    correctIndex: 2,
  },
  {
    category: "Tecnologia",
    question: "O que é um endereço IP?",
    options: ["Um tipo de processador", "Um identificador de um dispositivo em uma rede", "Um sistema operacional", "Um programa antivírus"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual extensão é normalmente associada a arquivos JavaScript?",
    options: [".py", ".js", ".html", ".css"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "Qual extensão é normalmente utilizada para arquivos de estilo CSS?",
    options: [".js", ".css", ".ts", ".json"],
    correctIndex: 1,
  },
  {
    category: "Tecnologia",
    question: "O que significa a sigla \"USB\"?",
    options: ["Universal Serial Bus", "United System Board", "Universal System Base", "User Serial Bridge"],
    correctIndex: 0,
  },
  {
    category: "Tecnologia",
    question: "Qual dispositivo normalmente distribui uma conexão de internet para vários aparelhos?",
    options: ["Roteador", "Monitor", "Teclado", "Scanner"],
    correctIndex: 0,
  },

  // Cultura
  {
    category: "Cultura",
    question: "Qual estilo musical brasileiro surgiu principalmente nas comunidades afro-brasileiras do Rio de Janeiro?",
    options: ["Samba", "Forró", "Sertanejo", "Bossa nova"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual é o idioma oficial mais falado no Brasil?",
    options: ["Espanhol", "Português", "Inglês", "Francês"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual festa brasileira é conhecida pelos desfiles de escolas de samba?",
    options: ["Festa Junina", "Carnaval", "Oktoberfest", "Círio"],
    correctIndex: 1,
  },
  {
    category: "Cultura",
    question: "Qual manifestação cultural brasileira é tradicionalmente associada à Bahia e utiliza instrumentos de percussão e dança?",
    options: ["Capoeira", "Fandango", "Choro", "Frevo"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual estilo musical surgiu nos Estados Unidos entre as comunidades afro-americanas?",
    options: ["Jazz", "Fado", "Tango", "Samba"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual dança brasileira é tradicionalmente associada ao estado de Pernambuco?",
    options: ["Frevo", "Samba", "Carimbó", "Vanerão"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual instrumento é muito associado à capoeira?",
    options: ["Berimbau", "Saxofone", "Acordeão", "Violino"],
    correctIndex: 0,
  },
  {
    category: "Cultura",
    question: "Qual é o nome da tradicional festa popular brasileira celebrada principalmente no mês de junho?",
    options: ["Carnaval", "Festa Junina", "Lavagem do Bonfim", "Bumba Meu Boi"],
    correctIndex: 1,
  },

  // Filmes
  {
    category: "Filmes",
    question: "Qual filme ganhou o Oscar de Melhor Filme em 1998 e conta a história de um navio que afunda?",
    options: ["Titanic", "Gladiador", "Matrix", "O Resgate do Soldado Ryan"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual personagem é o protagonista da série de filmes \"Piratas do Caribe\"?",
    options: ["Will Turner", "Jack Sparrow", "Davy Jones", "Hector Barbossa"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Em qual filme aparece a frase \"Que a Força esteja com você\"?",
    options: ["Star Wars", "Star Trek", "Matrix", "Avatar"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual é o nome do planeta onde vivem os Na'vi no filme Avatar?",
    options: ["Pandora", "Krypton", "Arrakis", "Endor"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual ator interpretou o personagem Jack Sparrow?",
    options: ["Brad Pitt", "Johnny Depp", "Tom Cruise", "Leonardo DiCaprio"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual filme apresenta o personagem Neo?",
    options: ["Matrix", "Inception", "Avatar", "Interestelar"],
    correctIndex: 0,
  },
  {
    category: "Filmes",
    question: "Qual é o nome do vilão principal de O Rei Leão?",
    options: ["Mufasa", "Scar", "Simba", "Timon"],
    correctIndex: 1,
  },
  {
    category: "Filmes",
    question: "Qual filme acompanha um jovem bruxo chamado Harry?",
    options: ["As Crônicas de Nárnia", "Harry Potter", "Percy Jackson", "O Senhor dos Anéis"],
    correctIndex: 1,
  },

  // Música
  {
    category: "Música",
    question: "Qual cantor é conhecido como \"Rei do Pop\"?",
    options: ["Elvis Presley", "Michael Jackson", "Freddie Mercury", "Prince"],
    correctIndex: 1,
  },
  {
    category: "Música",
    question: "Qual banda tinha Freddie Mercury como vocalista?",
    options: ["Queen", "ABBA", "Nirvana", "U2"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual cantora lançou a música \"Rolling in the Deep\"?",
    options: ["Adele", "Taylor Swift", "Beyoncé", "Rihanna"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual instrumento possui normalmente 88 teclas?",
    options: ["Violão", "Piano", "Acordeão", "Órgão"],
    correctIndex: 1,
  },
  {
    category: "Música",
    question: "Qual banda lançou a música \"Bohemian Rhapsody\"?",
    options: ["Queen", "The Beatles", "Pink Floyd", "Led Zeppelin"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual cantor brasileiro é conhecido pela música \"Garota de Ipanema\" em parceria com Tom Jobim?",
    options: ["João Gilberto", "Chico Buarque", "Caetano Veloso", "Milton Nascimento"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual gênero musical brasileiro é fortemente associado à região Nordeste?",
    options: ["Forró", "Blues", "Reggae", "Jazz"],
    correctIndex: 0,
  },
  {
    category: "Música",
    question: "Qual banda britânica lançou o álbum \"The Dark Side of the Moon\"?",
    options: ["Queen", "Pink Floyd", "The Beatles", "Oasis"],
    correctIndex: 1,
  },

  // Esportes
  {
    category: "Esportes",
    question: "Quantos jogadores de cada equipe ficam em campo no início de uma partida de futebol?",
    options: ["9", "10", "11", "12"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Qual seleção venceu a Copa do Mundo de 2022?",
    options: ["França", "Brasil", "Argentina", "Croácia"],
    correctIndex: 2,
  },
  {
    category: "Esportes",
    question: "Em qual esporte Michael Jordan se tornou mundialmente famoso?",
    options: ["Futebol", "Basquete", "Tênis", "Beisebol"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Quantos anéis aparecem no símbolo dos Jogos Olímpicos?",
    options: ["4", "5", "6", "7"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Em qual esporte é utilizada a expressão \"hole in one\"?",
    options: ["Golfe", "Tênis", "Beisebol", "Críquete"],
    correctIndex: 0,
  },
  {
    category: "Esportes",
    question: "Qual país é tradicionalmente associado à origem do judô?",
    options: ["China", "Japão", "Coreia do Sul", "Tailândia"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual piloto brasileiro conquistou três campeonatos mundiais de Fórmula 1?",
    options: ["Rubens Barrichello", "Ayrton Senna", "Felipe Massa", "Nelson Piquet"],
    correctIndex: 1,
  },
  {
    category: "Esportes",
    question: "Qual é a duração regulamentar de uma partida de futebol, sem acréscimos?",
    options: ["60 minutos", "80 minutos", "90 minutos", "120 minutos"],
    correctIndex: 2,
  },

  // Literatura
  {
    category: "Literatura",
    question: "Qual escritor criou o personagem Sherlock Holmes?",
    options: ["Agatha Christie", "Arthur Conan Doyle", "Jules Verne", "Victor Hugo"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual obra de Machado de Assis é narrada por um personagem chamado Bentinho?",
    options: ["Memórias Póstumas de Brás Cubas", "Dom Casmurro", "Quincas Borba", "O Alienista"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual escritor criou o universo de \"O Senhor dos Anéis\"?",
    options: ["C.S. Lewis", "J.R.R. Tolkien", "J.K. Rowling", "George Orwell"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Qual é o nome do protagonista de \"O Pequeno Príncipe\"?",
    options: ["O Aviador", "O Pequeno Príncipe", "O Rei", "O Astrônomo"],
    correctIndex: 1,
  },
  {
    category: "Literatura",
    question: "Quem escreveu \"O Alienista\"?",
    options: ["Machado de Assis", "José de Alencar", "Jorge Amado", "Monteiro Lobato"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual autora criou a personagem Hermione Granger?",
    options: ["J.K. Rowling", "Suzanne Collins", "Jane Austen", "Agatha Christie"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual escritor brasileiro é autor de \"Grande Sertão: Veredas\"?",
    options: ["Guimarães Rosa", "Machado de Assis", "Graciliano Ramos", "Jorge Amado"],
    correctIndex: 0,
  },
  {
    category: "Literatura",
    question: "Qual gênero literário normalmente apresenta acontecimentos imaginários e personagens em uma narrativa?",
    options: ["Ficção", "Biografia", "Dicionário", "Enciclopédia"],
    correctIndex: 0,
  },

  // Curiosidades
  {
    category: "Curiosidades",
    question: "Qual é o único mamífero capaz de realizar voo verdadeiro?",
    options: ["Esquilo-voador", "Morcego", "Pinguim", "Avestruz"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o animal terrestre mais rápido do mundo?",
    options: ["Leão", "Guepardo", "Cavalo", "Antílope"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual país é famoso por ter uma folha de bordo em sua bandeira?",
    options: ["Canadá", "Austrália", "Suíça", "Noruega"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual é o nome da moeda oficial do Reino Unido?",
    options: ["Euro", "Libra esterlina", "Dólar", "Franco"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual animal possui três corações?",
    options: ["Polvo", "Tubarão", "Golfinho", "Crocodilo"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual é o maior animal conhecido que já existiu na Terra?",
    options: ["Elefante-africano", "Baleia-azul", "Tubarão-branco", "Dinossauro"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é a moeda oficial dos Estados Unidos?",
    options: ["Dólar", "Euro", "Peso", "Libra"],
    correctIndex: 0,
  },
  {
    category: "Curiosidades",
    question: "Qual país é conhecido por ter inventado o papel?",
    options: ["Egito", "China", "Grécia", "Índia"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual é o único continente sem uma população humana permanente nativa?",
    options: ["África", "Antártida", "Oceania", "Europa"],
    correctIndex: 1,
  },
  {
    category: "Curiosidades",
    question: "Qual animal é conhecido por conseguir regenerar partes do próprio corpo?",
    options: ["Estrela-do-mar", "Cavalo", "Girafa", "Elefante"],
    correctIndex: 0,
  },
];
