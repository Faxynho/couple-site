import { countSolutions, solveLogical } from "./sudokuSolver";

export const SUDOKU_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type SudokuDifficulty = (typeof SUDOKU_DIFFICULTIES)[number];

export function isValidSudokuDifficulty(value: string): value is SudokuDifficulty {
  return (SUDOKU_DIFFICULTIES as readonly string[]).includes(value);
}

/** Faixa de "dicas" (números já preenchidos) por dificuldade — não é fixo,
 *  é um alvo; o corte para assim que atinge o mínimo ou não consegue mais
 *  remover células sem perder a unicidade da solução. */
const DIFFICULTY_TARGETS: Record<SudokuDifficulty, { minClues: number }> = {
  easy: { minClues: 40 },
  medium: { minClues: 30 },
  hard: { minClues: 24 },
};

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Gera uma grade 9x9 completa e válida embaralhando bandas/pilhas de uma
 * grade-base (troca linhas/colunas dentro dos grupos de 3, troca os grupos
 * entre si, e reetiqueta os dígitos aleatoriamente) — extremamente rápido e
 * já garante validade, sem precisar resolver por tentativa e erro.
 */
export function generateSolvedGrid(): number[] {
  const base = new Array<number>(81);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      base[r * 9 + c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
    }
  }

  const bandOrder = shuffled([0, 1, 2]);
  const rowInBand = [shuffled([0, 1, 2]), shuffled([0, 1, 2]), shuffled([0, 1, 2])];
  const stackOrder = shuffled([0, 1, 2]);
  const colInStack = [shuffled([0, 1, 2]), shuffled([0, 1, 2]), shuffled([0, 1, 2])];

  const rowMap: number[] = [];
  for (const b of bandOrder) for (const r of rowInBand[b]) rowMap.push(b * 3 + r);
  const colMap: number[] = [];
  for (const s of stackOrder) for (const c of colInStack[s]) colMap.push(s * 3 + c);

  const permuted = new Array<number>(81);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      permuted[r * 9 + c] = base[rowMap[r] * 9 + colMap[c]];
    }
  }

  const digitMap = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const relabeled = permuted.map((v) => digitMap[v - 1]);

  if (Math.random() < 0.5) {
    const t = new Array<number>(81);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) t[c * 9 + r] = relabeled[r * 9 + c];
    return t;
  }
  return relabeled;
}

/**
 * Remove células em ordem aleatória, aceitando a remoção só quando a grade
 * resultante ainda tem exatamente UMA solução (verificado de verdade a cada
 * remoção) — é isso que garante nunca gerar um Sudoku impossível ou
 * ambíguo, em vez de só apagar números ao acaso.
 */
function carvePuzzle(solution: number[], minClues: number): { puzzle: number[]; clues: number } {
  const puzzle = solution.slice();
  const order = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;

  for (const idx of order) {
    if (clues <= minClues) break;
    const backup = puzzle[idx];
    if (backup === 0) continue;

    puzzle[idx] = 0;
    const solutionCount = countSolutions(puzzle, 2);
    if (solutionCount !== 1) {
      puzzle[idx] = backup; // removeria a unicidade da solução — mantém a célula
      continue;
    }
    clues--;
  }

  return { puzzle, clues };
}

/**
 * Para o "Difícil": não basta ter poucas dicas — verifica de verdade que o
 * resultado exige técnicas além de single nu/oculto (via solveLogical). Se
 * o corte "ficou fácil demais" por acaso, tenta de novo algumas vezes.
 */
function carveHardPuzzle(solution: number[]): { puzzle: number[]; clues: number } {
  const target = DIFFICULTY_TARGETS.hard;
  let best: { puzzle: number[]; clues: number } | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const { puzzle, clues } = carvePuzzle(solution, target.minClues);
    const { stuck } = solveLogical(puzzle);
    if (stuck) return { puzzle, clues };
    if (!best || clues < best.clues) best = { puzzle, clues };
  }

  // Extremamente raro chegar aqui (todas as tentativas ficaram "fáceis
  // demais" para técnicas lógicas simples) — devolve a melhor tentativa,
  // que ainda assim tem poucas dicas e solução única garantida.
  return best!;
}

export interface GeneratedSudoku {
  puzzle: number[];
  clues: number;
}

export function generateSudoku(difficulty: SudokuDifficulty): GeneratedSudoku {
  const solution = generateSolvedGrid();

  if (difficulty === "hard") {
    return carveHardPuzzle(solution);
  }

  const { minClues } = DIFFICULTY_TARGETS[difficulty];
  return carvePuzzle(solution, minClues);
}
