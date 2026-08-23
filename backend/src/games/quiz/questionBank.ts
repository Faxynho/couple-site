import { EASY_QUESTIONS } from "./questions/easy";
import { MEDIUM_QUESTIONS } from "./questions/medium";
import { HARD_QUESTIONS } from "./questions/hard";
import { QuizDifficulty, QuizQuestion, RawQuizQuestion } from "./questions/types";

/**
 * Ponto único de acesso ao banco de perguntas. Para adicionar centenas ou
 * milhares de perguntas no futuro, basta empurrar mais itens nos arrays de
 * questions/easy.ts, questions/medium.ts e questions/hard.ts — nada aqui
 * precisa mudar.
 */
function withIds(raw: RawQuizQuestion[], difficulty: QuizDifficulty): QuizQuestion[] {
  return raw.map((q, index) => ({ ...q, id: `${difficulty}-${index}`, difficulty }));
}

const BANK: Record<QuizDifficulty, QuizQuestion[]> = {
  easy: withIds(EASY_QUESTIONS, "easy"),
  medium: withIds(MEDIUM_QUESTIONS, "medium"),
  hard: withIds(HARD_QUESTIONS, "hard"),
};

const VALID_DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];
export function isValidQuizDifficulty(value: string): value is QuizDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

/** Quantidade de perguntas por partida e tempo (ms) por pergunta, por dificuldade. */
export const QUIZ_DIFFICULTY_CONFIG: Record<QuizDifficulty, { questionCount: number; timeLimitMs: number }> = {
  easy: { questionCount: 10, timeLimitMs: 20_000 },
  medium: { questionCount: 12, timeLimitMs: 15_000 },
  hard: { questionCount: 15, timeLimitMs: 12_000 },
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sorteia `count` perguntas de uma dificuldade, sem repetir nenhuma na mesma
 * partida e tentando evitar que a mesma categoria apareça duas vezes
 * seguidas (quando há variedade suficiente de categorias no banco).
 */
export function selectQuizQuestions(difficulty: QuizDifficulty, count: number): QuizQuestion[] {
  const pool = BANK[difficulty] ?? BANK.medium;
  const shuffled = shuffle(pool);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));

  // Reordena localmente (troca com o próximo) para evitar duas perguntas
  // seguidas da mesma categoria, sem alterar o conjunto sorteado.
  for (let i = 1; i < picked.length; i++) {
    if (picked[i].category === picked[i - 1].category) {
      const swapWith = picked.slice(i + 1).findIndex((q) => q.category !== picked[i - 1].category);
      if (swapWith !== -1) {
        const targetIndex = i + 1 + swapWith;
        [picked[i], picked[targetIndex]] = [picked[targetIndex], picked[i]];
      }
    }
  }

  return picked;
}
