import { GameEngine } from "../../types";
import { HSV, hsvDeltaE, hsvToRgb, rgbToHex, scoreFromDeltaE } from "./colorMath";

/**
 * "Memória de Cores" — inspirado na mecânica do dialed.gg: a cada rodada uma
 * cor-alvo é mostrada por alguns segundos, depois escondida; o jogador precisa
 * recriá-la de memória usando sliders de matiz/saturação/brilho (HSB). A
 * pontuação de cada rodada (0 a 10) é calculada pela distância perceptual
 * (Delta E 2000, em CIELAB) entre o palpite e o alvo — soma máxima de 50 em 5 rodadas.
 *
 * Dois modos:
 * - "competitive" (padrão): funciona sozinho ou a dois. Quando jogado a dois,
 *   ambos veem a mesma sequência de cores e cada um envia seu próprio
 *   palpite; a pontuação de cada um é comparada ao final da rodada.
 * - "cooperative": exige dois jogadores com papéis fixos — um vê a cor
 *   (seerId) e a descreve verbalmente, o outro tenta recriá-la sem vê-la
 *   (guesserId), enquanto quem vê acompanha o ajuste em tempo real. Só existe
 *   um palpite por rodada e os dois pontuam juntos.
 */

export type ColorDifficulty = "easy" | "hard";

const VALID_DIFFICULTIES: ColorDifficulty[] = ["easy", "hard"];
export function isValidColorDifficulty(value: string): value is ColorDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

export type ColorMode = "competitive" | "cooperative";
const VALID_MODES: ColorMode[] = ["competitive", "cooperative"];
export function isValidColorMode(value: string): value is ColorMode {
  return (VALID_MODES as string[]).includes(value);
}

const DEFAULT_DIFFICULTY: ColorDifficulty = "easy";
const DEFAULT_MODE: ColorMode = "competitive";
const TOTAL_ROUNDS = 5;

export interface ColorTarget extends HSV {
  hex: string;
  /** Verdadeiro quando o valor real foi ocultado para este jogador (modo
   *  cooperativo, antes de quem adivinha enviar o palpite) — h/s/v/hex vêm
   *  zerados nesse caso, nunca a cor de verdade. */
  hidden?: boolean;
}

export interface ColorGuess extends HSV {
  hex: string;
  score: number;
  submittedAt: number;
}

export interface ColorRoundState {
  target: ColorTarget;
  guesses: Record<string, ColorGuess>; // playerId -> palpite
}

export interface ColorMemoryState {
  difficulty: ColorDifficulty;
  mode: ColorMode;
  /** Só preenchidos no modo cooperativo: quem vê a cor e quem tenta adivinhar. */
  seerId: string | null;
  guesserId: string | null;
  totalRounds: number;
  currentRound: number; // índice 0-based da rodada atual
  rounds: ColorRoundState[];
  finished: boolean;
  startedAt: number;
  finishedAt: number | null;
}

export type ColorMemoryAction =
  | { type: "submitGuess"; round: number; h: number; s: number; v: number }
  | { type: "nextRound" };

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTarget(difficulty: ColorDifficulty): ColorTarget {
  const h = randomInt(0, 359);
  // "Fácil": cores mais vivas e fáceis de nomear/lembrar.
  // "Difícil": inclui pastéis, tons quase pretos/cinzas — bem mais sutil.
  const s = difficulty === "easy" ? randomInt(40, 90) : randomInt(0, 100);
  const v = difficulty === "easy" ? randomInt(45, 95) : randomInt(12, 100);
  return { h, s, v, hex: rgbToHex(hsvToRgb({ h, s, v })) };
}

function generateRounds(difficulty: ColorDifficulty): ColorRoundState[] {
  return Array.from({ length: TOTAL_ROUNDS }, () => ({ target: generateTarget(difficulty), guesses: {} }));
}

export class ColorMemoryGame implements GameEngine<ColorMemoryState, ColorMemoryAction> {
  readonly id = "colors" as const;

  createInitialState(options?: Record<string, unknown>): ColorMemoryState {
    const rawDifficulty = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidColorDifficulty(rawDifficulty) ? rawDifficulty : DEFAULT_DIFFICULTY;

    const rawMode = typeof options?.mode === "string" ? options.mode : DEFAULT_MODE;
    const mode = isValidColorMode(rawMode) ? rawMode : DEFAULT_MODE;

    // seerId/guesserId só fazem sentido no cooperativo, e só se ambos vierem
    // preenchidos (o Room resolve isso a partir dos jogadores conectados).
    const seerId = mode === "cooperative" && typeof options?.seerId === "string" ? options.seerId : null;
    const guesserId = mode === "cooperative" && typeof options?.guesserId === "string" ? options.guesserId : null;
    const resolvedMode: ColorMode = mode === "cooperative" && seerId && guesserId ? "cooperative" : "competitive";

    return {
      difficulty,
      mode: resolvedMode,
      seerId: resolvedMode === "cooperative" ? seerId : null,
      guesserId: resolvedMode === "cooperative" ? guesserId : null,
      totalRounds: TOTAL_ROUNDS,
      currentRound: 0,
      rounds: generateRounds(difficulty),
      finished: false,
      startedAt: Date.now(),
      finishedAt: null,
    };
  }

  applyAction(state: ColorMemoryState, action: ColorMemoryAction, playerId: string): ColorMemoryState {
    if (state.finished) return state;

    if (action.type === "submitGuess") {
      // No cooperativo, só quem está adivinhando pode enviar palpite — quem
      // está vendo a cor apenas guia verbalmente e acompanha o preview ao vivo.
      if (state.mode === "cooperative" && playerId !== state.guesserId) return state;

      const { round, h, s, v } = action;
      if (!Number.isInteger(round) || round !== state.currentRound || round < 0 || round >= state.rounds.length) {
        return state;
      }
      if (![h, s, v].every((n) => typeof n === "number" && Number.isFinite(n))) return state;

      const roundState = state.rounds[round];
      if (roundState.guesses[playerId]) return state; // já enviou palpite nesta rodada

      const guessHsv: HSV = {
        h: ((Math.round(h) % 360) + 360) % 360,
        s: Math.min(100, Math.max(0, Math.round(s))),
        v: Math.min(100, Math.max(0, Math.round(v))),
      };
      const distance = hsvDeltaE(guessHsv, roundState.target);
      const score = scoreFromDeltaE(distance);

      const next = structuredClone(state);
      next.rounds[round].guesses[playerId] = {
        ...guessHsv,
        hex: rgbToHex(hsvToRgb(guessHsv)),
        score,
        submittedAt: Date.now(),
      };
      return next;
    }

    if (action.type === "nextRound") {
      const next = structuredClone(state);
      if (next.currentRound < next.totalRounds - 1) {
        next.currentRound += 1;
      } else {
        next.finished = true;
        next.finishedAt = Date.now();
      }
      return next;
    }

    return state;
  }

  isSolved(state: ColorMemoryState): boolean {
    return state.finished;
  }

  /** "Jogar de novo": gera uma nova sequência de 5 cores mantendo a mesma
   *  dificuldade, modo e papéis (quem via a cor continua vendo). */
  reset(state: ColorMemoryState): ColorMemoryState {
    return {
      ...state,
      currentRound: 0,
      rounds: generateRounds(state.difficulty),
      finished: false,
      startedAt: Date.now(),
      finishedAt: null,
    };
  }
}
