export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizMode = "solo" | "together" | "duel";
export type QuizPhase = "active" | "revealed";

export interface QuizQuestion {
  id: string;
  category: string;
  difficulty: QuizDifficulty;
  /** Vazio quando a pergunta ainda não chegou (índice futuro na sequência). */
  question: string;
  options: string[];
  /** Só vem preenchido depois que a pergunta é revelada. */
  correctIndex?: number;
  explanation?: string;
}

export interface QuizAnswerRecord {
  optionIndex: number | null;
  correct: boolean;
  points: number;
  timeMs: number;
}

export interface QuizPlayerState {
  score: number;
  /** answers[i] é `null` enquanto o próprio jogador ou (na pergunta atual,
   *  antes da revelação) o adversário ainda não respondeu. */
  answers: (QuizAnswerRecord | null)[];
}

export interface QuizState {
  difficulty: QuizDifficulty;
  mode: QuizMode;
  questions: QuizQuestion[];
  currentIndex: number;
  phase: QuizPhase;
  questionStartedAt: number;
  revealedAt: number | null;
  timeLimitMs: number;
  players: Record<string, QuizPlayerState>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
}

export const QUIZ_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "10 perguntas, 20s cada" },
  medium: { label: "Médio", emoji: "🟡", hint: "12 perguntas, 15s cada" },
  hard: { label: "Difícil", emoji: "🔴", hint: "15 perguntas, 12s cada" },
} as const;

export const QUIZ_MODES = {
  solo: { label: "Solo", emoji: "🙋", hint: "só você, no seu ritmo" },
  together: { label: "Juntos", emoji: "🤝", hint: "mesmas perguntas, pontuação em equipe" },
  duel: { label: "Duelo", emoji: "⚔️", hint: "1x1 — quem pontua mais vence" },
} as const;

export function computeQuizStats(state: QuizState, playerId: string) {
  const player = state.players[playerId];
  const answers = player?.answers ?? [];

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let totalTimeMs = 0;
  let answeredCount = 0;
  const byCategory = new Map<string, { correct: number; total: number }>();

  answers.forEach((a, i) => {
    const question = state.questions[i];
    if (!a) return; // ainda não chegou lá / pergunta futura
    if (a.optionIndex === null) {
      unanswered++;
    } else if (a.correct) {
      correct++;
    } else {
      wrong++;
    }
    if (a.optionIndex !== null) {
      totalTimeMs += a.timeMs;
      answeredCount++;
    }
    if (question?.category) {
      const entry = byCategory.get(question.category) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.correct) entry.correct += 1;
      byCategory.set(question.category, entry);
    }
  });

  let bestCategory: string | null = null;
  let bestScore = -1;
  for (const [category, entry] of byCategory.entries()) {
    if (entry.correct > bestScore || (entry.correct === bestScore && entry.total > 0)) {
      if (entry.correct > bestScore) {
        bestScore = entry.correct;
        bestCategory = category;
      }
    }
  }

  return {
    score: player?.score ?? 0,
    correct,
    wrong,
    unanswered,
    avgTimeMs: answeredCount > 0 ? Math.round(totalTimeMs / answeredCount) : null,
    bestCategory: bestScore > 0 ? bestCategory : null,
  };
}
