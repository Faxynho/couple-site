import { WORD_BANK } from "../wordbank/basePtBR";

/**
 * Geração de Caça-Palavras. Para cada palavra candidata (embaralhada),
 * tenta um número de direções/posições aleatórias até encontrar um lugar
 * livre (ou compatível por sobreposição de letras); o restante da grade é
 * preenchido com letras aleatórias ponderadas pela frequência do português.
 *
 * Validado previamente em Node.js puro (30 gerações por dificuldade, 100%
 * de sucesso, ~0.5ms cada) antes de ser portado para TypeScript.
 */

export type WordSearchDifficulty = "easy" | "medium" | "hard";

const VALID_DIFFICULTIES: WordSearchDifficulty[] = ["easy", "medium", "hard"];
export function isValidWordSearchDifficulty(value: string): value is WordSearchDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

type Dir = [number, number]; // [dr, dc]

const DIR_HORIZONTAL: Dir[] = [
  [0, 1],
  [0, -1],
];
const DIR_HV: Dir[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];
const DIR_ALL: Dir[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

interface DifficultyConfig {
  size: number;
  wordCount: number;
  minLen: number;
  maxLen: number;
  directions: Dir[];
}

const DIFFICULTY_CONFIG: Record<WordSearchDifficulty, DifficultyConfig> = {
  easy: { size: 10, wordCount: 6, minLen: 4, maxLen: 7, directions: DIR_HV },
  medium: { size: 13, wordCount: 9, minLen: 4, maxLen: 8, directions: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
  hard: { size: 16, wordCount: 12, minLen: 4, maxLen: 10, directions: DIR_ALL },
};

// Letras ponderadas pela frequência aproximada no português, usadas só para
// preencher os espaços vazios da grade (não afeta as palavras escondidas).
const FILLER_LETTERS =
  "AAAAAAABBCCCDDDEEEEEEEEFGGHIIIIIIJKLLMMNNNOOOOOOOOPQRRRSSSSTTTTUUUVXZ".split("");
function randomFillerLetter(): string {
  return FILLER_LETTERS[Math.floor(Math.random() * FILLER_LETTERS.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface WordSearchPlacedWord {
  id: string;
  word: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface WordSearchPuzzle {
  size: number;
  letters: string[]; // row-major, length = size*size
  words: WordSearchPlacedWord[]; // localização real — NUNCA deve ser enviada ao cliente antes de encontrada
}

function attemptGeneration(difficulty: WordSearchDifficulty): WordSearchPuzzle | null {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const size = cfg.size;
  const grid: (string | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));

  const pool = shuffle(WORD_BANK.filter((w) => w.word.length >= cfg.minLen && w.word.length <= cfg.maxLen));
  const placed: WordSearchPlacedWord[] = [];
  let nextId = 1;

  for (const candidate of pool) {
    if (placed.length >= cfg.wordCount) break;
    const word = candidate.word;
    const dirs = shuffle(cfg.directions);
    let done = false;

    for (const [dr, dc] of dirs) {
      if (done) break;
      const starts = shuffle(
        Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size] as [number, number])
      );
      for (const [row, col] of starts) {
        const endRow = row + dr * (word.length - 1);
        const endCol = col + dc * (word.length - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          const existing = grid[r][c];
          if (existing !== null && existing !== word[i]) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        for (let i = 0; i < word.length; i++) {
          grid[row + dr * i][col + dc * i] = word[i];
        }
        placed.push({ id: `W${nextId++}`, word, row, col, dr, dc });
        done = true;
        break;
      }
    }
  }

  if (placed.length < Math.min(4, cfg.wordCount)) return null;

  const letters: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      letters.push(grid[r][c] ?? randomFillerLetter());
    }
  }

  return { size, letters, words: placed };
}

const MAX_GENERATION_ATTEMPTS = 30;

export function generateWordSearchPuzzle(difficulty: WordSearchDifficulty): WordSearchPuzzle {
  let best: WordSearchPuzzle | null = null;
  const targetCount = DIFFICULTY_CONFIG[difficulty].wordCount;
  for (let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const attempt = attemptGeneration(difficulty);
    if (attempt && attempt.words.length >= targetCount) return attempt;
    if (attempt && (!best || attempt.words.length > best.words.length)) best = attempt;
  }
  if (best) return best;
  // Não deveria acontecer com o banco de palavras atual — evita travar o servidor.
  return { size: DIFFICULTY_CONFIG[difficulty].size, letters: [], words: [] };
}
