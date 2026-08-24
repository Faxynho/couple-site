import { GameEngine } from "../../types";
import { QUIZ_DIFFICULTY_CONFIG, isValidQuizDifficulty, selectQuizQuestions } from "./questionBank";
import { QuizDifficulty, QuizQuestion } from "./questions/types";

/**
 * Quiz — três formatos de partida:
 * - "solo": um jogador só, sem necessidade de par (a sala existe por baixo
 *   dos panos apenas para validar a pontuação no servidor, mas a UI não
 *   exige compartilhar código com ninguém).
 * - "together" (Juntos): cooperativo — os dois recebem a mesma pergunta e
 *   pontuam JUNTOS, numa pontuação única de equipe. Não há tempo limite.
 *   Cada um clica na alternativa que acha certa livremente, podendo trocar
 *   de ideia quantas vezes quiser — só quando os DOIS estiverem com a MESMA
 *   alternativa selecionada ao mesmo tempo é que a resposta é confirmada e a
 *   pergunta avança.
 * - "duel" (1v1): competitivo — mesmas perguntas, cada um com sua própria
 *   pontuação, com tempo limite por pergunta. A partida sempre percorre
 *   todas as perguntas (não termina no primeiro acerto) e o vencedor é
 *   definido pela pontuação total ao final, incluindo um pequeno bônus de
 *   velocidade. Isso também cobre o "Modo Duelo por Pontuação" pedido — não
 *   há necessidade de um quarto modo separado, a mecânica já é a mesma.
 *
 * Toda a lógica de tempo, avanço de pergunta e pontuação vive aqui e é
 * validada inteiramente no servidor: o cliente só manda qual alternativa
 * escolheu, nunca uma pontuação pronta.
 */

export type QuizMode = "solo" | "together" | "duel";
const VALID_MODES: QuizMode[] = ["solo", "together", "duel"];
export function isValidQuizMode(value: string): value is QuizMode {
  return (VALID_MODES as string[]).includes(value);
}

const DEFAULT_DIFFICULTY: QuizDifficulty = "medium";
const DEFAULT_MODE: QuizMode = "solo";

/** Pequena janela para todos verem o "certo/errado" antes de avançar sozinho. */
export const QUIZ_REVEAL_DURATION_MS = 2600;

const POINTS_CORRECT = 100;
/** Bônus de velocidade — só no Duelo, e propositalmente pequeno perto dos 100
 *  pontos da resposta certa, para que conhecimento importe mais que reflexo. */
const MAX_SPEED_BONUS = 50;

export type QuizPhase = "active" | "revealed";

export interface QuizAnswerRecord {
  optionIndex: number | null; // null = não respondeu a tempo (só acontece no Duelo)
  correct: boolean;
  points: number;
  timeMs: number; // tempo de resposta (ou o tempo total, se não respondeu)
}

export interface QuizPlayerState {
  score: number;
  answers: (QuizAnswerRecord | null)[]; // alinhado a `questions`, null = ainda não chegou lá
}

export interface QuizState {
  difficulty: QuizDifficulty;
  mode: QuizMode;
  questions: QuizQuestion[];
  currentIndex: number;
  phase: QuizPhase;
  questionStartedAt: number;
  revealedAt: number | null;
  /** Sem efeito no modo "together" (não tem cronômetro) — mantido só para
   *  não quebrar o formato compartilhado com o Duelo. */
  timeLimitMs: number;
  players: Record<string, QuizPlayerState>;
  expectedPlayers: string[];
  startedAt: number;
  finished: boolean;
  finishedAt: number | null;
  // ---- Exclusivo do modo "together" ----
  /** Pontuação única, de equipe — usada em vez de `players[id].score`. */
  teamScore: number;
  /** Respostas confirmadas (só depois que os dois bateram na mesma
   *  alternativa), alinhado a `questions` — equivalente ao `answers` de
   *  `players`, mas único para a dupla. */
  teamAnswers: (QuizAnswerRecord | null)[];
  /** Alternativa que cada jogador está com o dedo em cima AGORA na pergunta
   *  atual (ainda não confirmada) — some assim que a pergunta avança. */
  pendingSelections: Record<string, number | null>;
}

export type QuizAction =
  | { type: "submitAnswer"; questionIndex: number; optionIndex: number }
  // Emitidas pelo relógio do servidor (não pelo cliente) — ver quizScheduler.
  | { type: "timeUp" }
  | { type: "nextQuestion" };

function blankPlayerState(questionCount: number): QuizPlayerState {
  return { score: 0, answers: new Array(questionCount).fill(null) };
}

function buildQuestions(difficulty: QuizDifficulty): { questions: QuizQuestion[]; timeLimitMs: number } {
  const config = QUIZ_DIFFICULTY_CONFIG[difficulty];
  return { questions: selectQuizQuestions(difficulty, config.questionCount), timeLimitMs: config.timeLimitMs };
}

function allExpectedAnswered(state: QuizState): boolean {
  if (state.expectedPlayers.length === 0) return false;
  return state.expectedPlayers.every((id) => Boolean(state.players[id]?.answers[state.currentIndex]));
}

/** Preenche com "não respondeu" quem ainda faltava responder a pergunta atual. */
function fillMissingAnswers(state: QuizState) {
  for (const id of state.expectedPlayers) {
    const player = state.players[id];
    if (!player) continue;
    if (!player.answers[state.currentIndex]) {
      player.answers[state.currentIndex] = {
        optionIndex: null,
        correct: false,
        points: 0,
        timeMs: state.timeLimitMs,
      };
    }
  }
}

function blankPendingSelections(playerIds: string[]): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const id of playerIds) map[id] = null;
  return map;
}

export class QuizGame implements GameEngine<QuizState, QuizAction> {
  readonly id = "quiz" as const;

  createInitialState(options?: Record<string, unknown>): QuizState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidQuizDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;

    const rawMode = typeof options?.mode === "string" ? options.mode : DEFAULT_MODE;
    const mode = isValidQuizMode(rawMode) ? rawMode : DEFAULT_MODE;

    const playerIds = Array.isArray(options?.playerIds) ? (options!.playerIds as string[]) : [];

    const { questions, timeLimitMs } = buildQuestions(difficulty);

    const players: Record<string, QuizPlayerState> = {};
    for (const id of playerIds) players[id] = blankPlayerState(questions.length);

    return {
      difficulty,
      mode,
      questions,
      currentIndex: 0,
      phase: "active",
      questionStartedAt: Date.now(),
      revealedAt: null,
      timeLimitMs,
      players,
      expectedPlayers: playerIds,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      teamScore: 0,
      teamAnswers: new Array(questions.length).fill(null),
      pendingSelections: blankPendingSelections(playerIds),
    };
  }

  applyAction(state: QuizState, action: QuizAction, playerId: string): QuizState {
    if (state.finished) return state;

    if (action.type === "submitAnswer") {
      if (state.phase !== "active") return state;
      if (!state.expectedPlayers.includes(playerId)) return state;
      if (action.questionIndex !== state.currentIndex) return state;

      const question = state.questions[state.currentIndex];
      if (!question) return state;

      const optionIndex = Number.isInteger(action.optionIndex) ? action.optionIndex : -1;
      if (optionIndex < 0 || optionIndex >= question.options.length) return state;

      if (state.mode === "together") {
        // Cooperativo: cada clique só registra a intenção de quem clicou.
        // Nada é confirmado até os dois estarem com a MESMA alternativa
        // marcada ao mesmo tempo — até lá, cada jogador pode trocar de ideia
        // livremente (inclusive voltar atrás depois de já ter batido com o
        // outro numa alternativa errada, antes de a resposta ser fechada).
        if (state.teamAnswers[state.currentIndex]) return state; // pergunta já confirmada
        const next = structuredClone(state);
        next.pendingSelections[playerId] = optionIndex;

        const others = next.expectedPlayers.filter((id) => id !== playerId);
        const everyoneMatches =
          others.length > 0 && others.every((id) => next.pendingSelections[id] === optionIndex);

        if (everyoneMatches) {
          const now = Date.now();
          const timeMs = Math.max(0, now - next.questionStartedAt);
          const correct = optionIndex === question.correctIndex;
          const points = correct ? POINTS_CORRECT : 0;

          next.teamAnswers[next.currentIndex] = { optionIndex, correct, points, timeMs };
          next.teamScore += points;
          next.phase = "revealed";
          next.revealedAt = now;
          // Limpa os palpites pendentes — a próxima pergunta começa "zerada".
          for (const id of next.expectedPlayers) next.pendingSelections[id] = null;
        }

        return next;
      }

      // Solo / Duelo: pontuação individual, como antes.
      const player = state.players[playerId];
      if (!player) return state;
      if (player.answers[state.currentIndex]) return state; // já respondeu esta pergunta

      const now = Date.now();
      const timeMs = Math.max(0, Math.min(state.timeLimitMs, now - state.questionStartedAt));
      const correct = optionIndex === question.correctIndex;

      let points = 0;
      if (correct) {
        points = POINTS_CORRECT;
        if (state.mode === "duel") {
          const remainingFraction = Math.max(0, 1 - timeMs / state.timeLimitMs);
          points += Math.round(MAX_SPEED_BONUS * remainingFraction);
        }
      }

      const next = structuredClone(state);
      const nextPlayer = next.players[playerId];
      nextPlayer.answers[next.currentIndex] = { optionIndex, correct, points, timeMs };
      nextPlayer.score += points;

      if (allExpectedAnswered(next)) {
        next.phase = "revealed";
        next.revealedAt = now;
      }

      return next;
    }

    if (action.type === "timeUp") {
      // O modo "together" nunca tem tempo limite — essa ação só chega até
      // aqui para solo/duelo (ver o filtro no relógio do servidor).
      if (state.phase !== "active" || state.mode === "together") return state;
      const next = structuredClone(state);
      fillMissingAnswers(next);
      next.phase = "revealed";
      next.revealedAt = Date.now();
      return next;
    }

    if (action.type === "nextQuestion") {
      if (state.phase !== "revealed") return state;
      const next = structuredClone(state);
      if (next.currentIndex < next.questions.length - 1) {
        next.currentIndex += 1;
        next.phase = "active";
        next.questionStartedAt = Date.now();
        next.revealedAt = null;
      } else {
        next.finished = true;
        next.finishedAt = Date.now();
      }
      return next;
    }

    return state;
  }

  isSolved(state: QuizState): boolean {
    return state.finished;
  }

  /** "Jogar de novo": sorteia um novo conjunto de perguntas, mesma dificuldade/modo/jogadores. */
  reset(state: QuizState): QuizState {
    const { questions, timeLimitMs } = buildQuestions(state.difficulty);
    const players: Record<string, QuizPlayerState> = {};
    for (const id of state.expectedPlayers) players[id] = blankPlayerState(questions.length);

    return {
      ...state,
      questions,
      currentIndex: 0,
      phase: "active",
      questionStartedAt: Date.now(),
      revealedAt: null,
      timeLimitMs,
      players,
      startedAt: Date.now(),
      finished: false,
      finishedAt: null,
      teamScore: 0,
      teamAnswers: new Array(questions.length).fill(null),
      pendingSelections: blankPendingSelections(state.expectedPlayers),
    };
  }
}
