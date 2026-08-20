import { GameEngine } from "../../types";
import { HSV, hsvDeltaE, hsvToRgb, rgbToHex, scoreFromDeltaE } from "./colorMath";

/**
 * "Memória de Cores" — inspirado na mecânica do dialed.gg: a cada rodada uma
 * cor-alvo é mostrada por alguns segundos, depois escondida; o jogador precisa
 * recriá-la de memória usando sliders de matiz/saturação/brilho (HSB). A
 * pontuação de cada rodada (0 a 10) é calculada pela distância perceptual
 * (Delta E, em CIELAB) entre o palpite e o alvo — soma máxima de 50 em 5 rodadas.
 *
 * Funciona sozinho (o host preenche as rodadas sem esperar ninguém) ou a dois:
 * quando jogado a dois, ambos veem a mesma sequência de cores e comparam a
 * pontuação de cada rodada ao final dela.
 */

export type ColorDifficulty = "easy" | "hard";

const VALID_DIFFICULTIES: ColorDifficulty[] = ["easy", "hard"];
export function isValidColorDifficulty(value: string): value is ColorDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

const DEFAULT_DIFFICULTY: ColorDifficulty = "easy";
const TOTAL_ROUNDS = 5;

export interface ColorTarget extends HSV {
  hex: string;
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
    const raw = typeof options?.difficulty === "string" ? options.difficulty : DEFAULT_DIFFICULTY;
    const difficulty = isValidColorDifficulty(raw) ? raw : DEFAULT_DIFFICULTY;

    return {
      difficulty,
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

  /** "Jogar de novo": gera uma nova sequência de 5 cores na mesma dificuldade. */
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
