import { BoardRacePendingWordChallenge } from "./types";

type AnagramEntry = { answer: string };
type RiddleEntry = { prompt: string; answer: string };

// Conteúdo curto, cotidiano e sem respostas alternativas relevantes.
const ANAGRAMS: readonly AnagramEntry[] = [
  { answer: "cavalo" }, { answer: "janela" }, { answer: "banana" }, { answer: "pipoca" },
  { answer: "camisa" }, { answer: "girafa" }, { answer: "foguete" }, { answer: "sorvete" },
  { answer: "cachorro" }, { answer: "coelho" }, { answer: "sapato" }, { answer: "escola" },
  { answer: "tomate" }, { answer: "laranja" }, { answer: "macaco" }, { answer: "panela" },
  { answer: "boneca" }, { answer: "queijo" }, { answer: "pirata" }, { answer: "castelo" },
];

const RIDDLES: readonly RiddleEntry[] = [
  { prompt: "O que tem dentes, mas não morde?", answer: "pente" },
  { prompt: "Quanto mais seca, mais molhada fica. O que é?", answer: "toalha" },
  { prompt: "O que sobe quando a chuva desce?", answer: "guarda chuva" },
  { prompt: "O que tem ponteiros, mas não costura?", answer: "relogio" },
  { prompt: "O que tem chaves, mas não abre portas?", answer: "teclado" },
  { prompt: "O que tem pescoço, mas não tem cabeça?", answer: "garrafa" },
  { prompt: "O que quanto mais se tira, maior fica?", answer: "buraco" },
  { prompt: "O que é cheio de furos, mas ainda segura água?", answer: "esponja" },
  { prompt: "O que tem cabeça e cauda, mas não tem corpo?", answer: "moeda" },
  { prompt: "O que quanto mais cresce, menos você consegue enxergar?", answer: "escuridao" },
  { prompt: "O que pode viajar o mundo inteiro sem sair do lugar?", answer: "selo" },
  { prompt: "O que tem olhos, mas não pode ver?", answer: "batata" },
  { prompt: "O que tem boca, mas não fala?", answer: "rio" },
  { prompt: "O que tem pernas, mas não anda?", answer: "mesa" },
  { prompt: "O que tem um pé, mas não anda?", answer: "copo" },
  { prompt: "O que tem coroa, mas não é rei?", answer: "abacaxi" },
  { prompt: "O que é seu, mas os outros usam mais do que você?", answer: "nome" },
  { prompt: "O que quebra sem cair e cai sem quebrar?", answer: "dia e noite" },
  { prompt: "O que pode encher uma sala sem ocupar espaço?", answer: "luz" },
  { prompt: "O que quanto mais você usa, menor fica?", answer: "lapis" },
  { prompt: "O que sobe e desce, mas não sai do lugar?", answer: "escada" },
  { prompt: "O que tem muitas chaves, mas não abre nenhuma porta?", answer: "piano" },
  { prompt: "O que corre, mas nunca anda?", answer: "agua" },
  { prompt: "O que nasce grande e morre pequeno?", answer: "vela" },
  { prompt: "O que se perde no momento em que se fala?", answer: "silencio" },
  { prompt: "O que tem cidades, rios e estradas, mas não tem pessoas?", answer: "mapa" },
  { prompt: "O que você pode pegar, mas não pode jogar?", answer: "resfriado" },
  { prompt: "O que sempre chega, mas nunca chega de verdade?", answer: "amanha" },
  { prompt: "O que fica na sua frente, mas você nunca consegue ver?", answer: "futuro" },
  { prompt: "O que tem folhas, mas não é árvore?", answer: "livro" },
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Fisher--Yates em runtime: conserva todas as letras, inclusive repetidas,
 * mas nunca apresenta a resposta pronta. O fallback cobre uma sequência de
 * sorteios improvável que reproduza a palavra original. */
export function shuffleAnagram(answer: string): string {
  const letters = [...answer];
  if (letters.length < 2 || new Set(letters).size < 2) {
    throw new Error("Um anagrama precisa de ao menos duas letras diferentes.");
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = [...letters];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    const candidate = shuffled.join("");
    if (candidate !== answer) return candidate;
  }
  // Uma rotação de uma posição só é igual à original se todas as letras forem
  // iguais, caso já tratado acima.
  return `${answer.slice(1)}${answer[0]}`;
}

export function createWordChallenge(kind: "anagram" | "riddle"): BoardRacePendingWordChallenge {
  const assignedAt = Date.now();
  if (kind === "anagram") {
    const entry = pick(ANAGRAMS);
    return { id: `anagram-${assignedAt}-${entry.answer}`, kind, prompt: shuffleAnagram(entry.answer).toUpperCase(), answer: entry.answer, assignedAt, attempts: 0 };
  }
  const entry = pick(RIDDLES);
  return { id: `riddle-${assignedAt}-${entry.answer}`, kind, prompt: entry.prompt, answer: entry.answer, assignedAt, attempts: 0 };
}

export function normalizeWordAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ");
}

export const BOARD_RACE_WORD_CHALLENGE_COUNTS = { anagrams: ANAGRAMS.length, riddles: RIDDLES.length } as const;
