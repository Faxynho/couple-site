export interface DrawGuessWord {
  id: string;
  value: string;
  category: "animais" | "objetos" | "comidas" | "lugares" | "profissoes" | "personagens" | "acoes" | "natureza" | "transportes" | "cotidiano";
}

function group(category: DrawGuessWord["category"], values: string[]): DrawGuessWord[] {
  return values.map((value) => ({
    id: `${category}-${value.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    value,
    category,
  }));
}

/** Palavras concretas, conhecidas e curtas o bastante para uma rodada de desenho. */
export const DRAW_GUESS_WORDS: DrawGuessWord[] = [
  ...group("animais", [
    "abelha", "aranha", "baleia", "borboleta", "cachorro", "canguru", "caracol", "cavalo", "coelho", "coruja",
    "elefante", "formiga", "galinha", "gato", "girafa", "jacaré", "leão", "macaco", "pato", "pinguim",
    "peixe", "polvo", "porco", "raposa", "sapo", "tartaruga", "tigre", "tubarão", "urso", "zebra",
  ]),
  ...group("objetos", [
    "abajur", "cadeira", "câmera", "chave", "chuveiro", "escada", "espelho", "garrafa", "guarda-chuva", "janela",
    "lápis", "livro", "martelo", "mochila", "óculos", "panela", "relógio", "tesoura", "telefone", "violão",
  ]),
  ...group("comidas", [
    "banana", "bolo", "brigadeiro", "cachorro-quente", "café", "cenoura", "chocolate", "coco", "cupcake", "hambúrguer",
    "laranja", "maçã", "melancia", "morango", "ovo", "pizza", "pipoca", "sorvete", "sushi", "uva",
  ]),
  ...group("lugares", [
    "aeroporto", "castelo", "cinema", "escola", "fazenda", "hospital", "ilha", "parque", "praia", "restaurante",
  ]),
  ...group("profissoes", [
    "bombeiro", "cozinheiro", "dentista", "fotógrafo", "jardineiro", "médico", "pintor", "policial", "professor", "veterinário",
  ]),
  ...group("personagens", [
    "alienígena", "astronauta", "bruxa", "detetive", "fantasma", "mago", "pirata", "princesa", "robô", "super-herói",
  ]),
  ...group("acoes", [
    "cantar", "cozinhar", "dançar", "dormir", "mergulhar", "nadar", "pescar", "pular", "surfar", "voar",
  ]),
  ...group("natureza", [
    "árvore", "cachoeira", "cacto", "estrela", "flor", "lua", "montanha", "nuvem", "sol", "vulcão",
  ]),
  ...group("transportes", [
    "avião", "barco", "bicicleta", "caminhão", "carro", "foguete", "helicóptero", "moto", "ônibus", "trem",
  ]),
  ...group("cotidiano", [
    "aniversário", "casamento", "chuva", "futebol", "presente", "semáforo", "selfie", "celular", "televisão", "videogame",
  ]),
];

export function pickDrawGuessWord(usedIds: string[], random = Math.random): DrawGuessWord {
  const available = DRAW_GUESS_WORDS.filter((word) => !usedIds.includes(word.id));
  const pool = available.length > 0 ? available : DRAW_GUESS_WORDS;
  return pool[Math.floor(random() * pool.length)] ?? DRAW_GUESS_WORDS[0];
}
