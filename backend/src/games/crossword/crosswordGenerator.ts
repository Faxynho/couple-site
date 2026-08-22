import { WORD_BANK } from "../wordbank/basePtBR";

/**
 * Geração de Palavras Cruzadas.
 *
 * Estratégia: coloca a maior palavra disponível no centro de uma grade de
 * trabalho grande, depois tenta cruzar as próximas palavras (embaralhadas)
 * com letras já presentes na grade, sempre validando que o cruzamento não
 * cria colisões (letra diferente na mesma célula) nem "cola" palavras uma na
 * outra (células vizinhas vazias precisam permanecer vazias). Ao final, a
 * grade é recortada para o menor retângulo que contém todas as palavras.
 *
 * Testado previamente em Node.js puro com centenas de gerações por
 * dificuldade antes de ser portado para TypeScript (ver notas do projeto).
 */

export type CrosswordDifficulty = "easy" | "medium" | "hard";

const VALID_DIFFICULTIES: CrosswordDifficulty[] = ["easy", "medium", "hard"];
export function isValidCrosswordDifficulty(value: string): value is CrosswordDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

interface DifficultyConfig {
  minLen: number;
  maxLen: number;
  targetWords: number;
}

const DIFFICULTY_CONFIG: Record<CrosswordDifficulty, DifficultyConfig> = {
  easy: { minLen: 3, maxLen: 6, targetWords: 8 },
  medium: { minLen: 3, maxLen: 8, targetWords: 12 },
  hard: { minLen: 4, maxLen: 12, targetWords: 16 },
};

const WORK_GRID_SIZE = 44;
const MAX_GENERATION_ATTEMPTS = 60;

export type CrosswordDirection = "across" | "down";

export interface CrosswordWordDef {
  id: string; // ex.: "A1" (across) ou "D3" (down)
  number: number;
  direction: CrosswordDirection;
  row: number;
  col: number;
  length: number;
  clue: string;
  answer: string; // NUNCA deve ser enviado ao cliente — só uso interno do servidor
}

export interface CrosswordCell {
  block: boolean;
  solution: string | null; // NUNCA deve ser enviado ao cliente
  number: number | null;
}

export interface CrosswordPuzzle {
  rows: number;
  cols: number;
  cells: CrosswordCell[]; // row-major, length = rows*cols
  words: CrosswordWordDef[];
}

interface RawPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: CrosswordDirection;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function emptyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

/** true = pode colocar cruzando; null = pode colocar mas não cruza nada; false = inválido. */
function canPlace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: CrosswordDirection,
  size: number
): boolean | null {
  const len = word.length;
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;

  const endRow = row + dr * (len - 1);
  const endCol = col + dc * (len - 1);
  if (row < 1 || col < 1 || endRow >= size - 1 || endCol >= size - 1) return false;

  const beforeR = row - dr;
  const beforeC = col - dc;
  const afterR = row + dr * len;
  const afterC = col + dc * len;
  if (grid[beforeR][beforeC] !== null) return false;
  if (grid[afterR][afterC] !== null) return false;

  let hasCross = false;
  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const existing = grid[r][c];
    const letter = word[i];

    if (existing !== null) {
      if (existing !== letter) return false;
      hasCross = true;
      continue;
    }

    if (dir === "across") {
      if (grid[r - 1][c] !== null || grid[r + 1][c] !== null) return false;
    } else {
      if (grid[r][c - 1] !== null || grid[r][c + 1] !== null) return false;
    }
  }
  return hasCross ? true : null;
}

function placeOnGrid(grid: (string | null)[][], placements: RawPlacement[], word: string, clue: string, row: number, col: number, dir: CrosswordDirection) {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
  placements.push({ word, clue, row, col, dir });
}

function attemptGeneration(difficulty: CrosswordDifficulty): RawPlacement[] | null {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const pool = shuffle(WORD_BANK.filter((w) => w.word.length >= cfg.minLen && w.word.length <= cfg.maxLen));
  if (pool.length === 0) return null;

  const grid = emptyGrid(WORK_GRID_SIZE);
  const placements: RawPlacement[] = [];
  const used = new Set<string>();

  const byLengthDesc = [...pool].sort((a, b) => b.word.length - a.word.length);
  const first = byLengthDesc[0];
  const center = Math.floor(WORK_GRID_SIZE / 2);
  const startCol = center - Math.floor(first.word.length / 2);
  placeOnGrid(grid, placements, first.word, first.clue, center, startCol, "across");
  used.add(first.word);

  const rest = shuffle(pool.filter((w) => w.word !== first.word));

  for (const candidate of rest) {
    if (placements.length >= cfg.targetWords) break;
    if (used.has(candidate.word)) continue;

    let bestSpot: { row: number; col: number; dir: CrosswordDirection } | null = null;
    for (const placed of placements) {
      if (bestSpot) break;
      const crossDir: CrosswordDirection = placed.dir === "across" ? "down" : "across";
      for (let pi = 0; pi < placed.word.length && !bestSpot; pi++) {
        for (let ci = 0; ci < candidate.word.length && !bestSpot; ci++) {
          if (placed.word[pi] !== candidate.word[ci]) continue;
          const crossRow = placed.dir === "across" ? placed.row : placed.row + pi;
          const crossCol = placed.dir === "across" ? placed.col + pi : placed.col;
          const row = crossDir === "down" ? crossRow - ci : crossRow;
          const col = crossDir === "across" ? crossCol - ci : crossCol;
          const result = canPlace(grid, candidate.word, row, col, crossDir, WORK_GRID_SIZE);
          if (result === true) {
            bestSpot = { row, col, dir: crossDir };
          }
        }
      }
    }

    if (bestSpot) {
      placeOnGrid(grid, placements, candidate.word, candidate.clue, bestSpot.row, bestSpot.col, bestSpot.dir);
      used.add(candidate.word);
    }
  }

  if (placements.length < Math.min(4, cfg.targetWords)) return null;
  return placements;
}

/** Numera as células conforme a convenção tradicional de palavras cruzadas. */
function assignNumbersAndBuild(placements: RawPlacement[]): CrosswordPuzzle {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const p of placements) {
    const dr = p.dir === "down" ? 1 : 0;
    const dc = p.dir === "across" ? 1 : 0;
    const endR = p.row + dr * (p.word.length - 1);
    const endC = p.col + dc * (p.word.length - 1);
    minR = Math.min(minR, p.row);
    maxR = Math.max(maxR, endR);
    minC = Math.min(minC, p.col);
    maxC = Math.max(maxC, endC);
  }
  const pad = 1;
  minR -= pad; maxR += pad; minC -= pad; maxC += pad;
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  const cells: CrosswordCell[] = Array.from({ length: rows * cols }, () => ({
    block: true,
    solution: null,
    number: null,
  }));
  const idx = (r: number, c: number) => r * cols + c;

  const normalized = placements.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));

  for (const p of normalized) {
    const dr = p.dir === "down" ? 1 : 0;
    const dc = p.dir === "across" ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      cells[idx(r, c)] = { block: false, solution: p.word[i], number: null };
    }
  }

  let nextNumber = 1;
  const numberAt = new Map<string, number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[idx(r, c)];
      if (cell.block) continue;
      const leftBlocked = c === 0 || cells[idx(r, c - 1)].block;
      const rightOpen = c + 1 < cols && !cells[idx(r, c + 1)].block;
      const startsAcross = leftBlocked && rightOpen;
      const topBlocked = r === 0 || cells[idx(r - 1, c)].block;
      const bottomOpen = r + 1 < rows && !cells[idx(r + 1, c)].block;
      const startsDown = topBlocked && bottomOpen;
      if (startsAcross || startsDown) {
        const key = `${r}-${c}`;
        numberAt.set(key, nextNumber);
        cells[idx(r, c)] = { ...cell, number: nextNumber };
        nextNumber += 1;
      }
    }
  }

  const words: CrosswordWordDef[] = normalized.map((p) => {
    const number = numberAt.get(`${p.row}-${p.col}`)!;
    const id = `${p.dir === "across" ? "A" : "D"}${number}`;
    return {
      id,
      number,
      direction: p.dir,
      row: p.row,
      col: p.col,
      length: p.word.length,
      clue: p.clue,
      answer: p.word,
    };
  });
  words.sort((a, b) => a.number - b.number || (a.direction === b.direction ? 0 : a.direction === "across" ? -1 : 1));

  return { rows, cols, cells, words };
}

export function generateCrosswordPuzzle(difficulty: CrosswordDifficulty): CrosswordPuzzle {
  for (let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const placements = attemptGeneration(difficulty);
    if (placements) return assignNumbersAndBuild(placements);
  }
  // Não deveria acontecer com o banco de palavras atual, mas garante um
  // resultado mínimo em vez de travar o servidor.
  const fallback = attemptGeneration("easy") ?? [];
  return assignNumbersAndBuild(fallback);
}
