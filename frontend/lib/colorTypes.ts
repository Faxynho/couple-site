export interface ColorTarget {
  h: number;
  s: number;
  v: number;
  hex: string;
}

export interface ColorGuess {
  h: number;
  s: number;
  v: number;
  hex: string;
  score: number;
  submittedAt: number;
}

export interface ColorRoundState {
  target: ColorTarget;
  guesses: Record<string, ColorGuess>; // playerId -> palpite
}

export interface ColorMemoryState {
  difficulty: string;
  totalRounds: number;
  currentRound: number;
  rounds: ColorRoundState[];
  finished: boolean;
  startedAt: number;
  finishedAt: number | null;
}

/**
 * Dificuldades da Memória de Cores — independente das outras (aqui o "difícil"
 * significa tons mais sutis/próximos, não mais peças ou menos números prontos).
 */
export const COLOR_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "cores vivas e fáceis de nomear" },
  hard: { label: "Difícil", emoji: "🔴", hint: "pastéis, tons escuros e neutros" },
} as const;

export type ColorDifficulty = keyof typeof COLOR_DIFFICULTIES;

/** Converte HSB/HSV para hex — usado no navegador para a prévia ao vivo do slider. */
export function hsvToHex(h: number, s: number, v: number): string {
  const S = s / 100;
  const V = v / 100;
  const c = V * S;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = V - c;
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return `#${[R, G, B].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`;
}
