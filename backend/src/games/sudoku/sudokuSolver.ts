/**
 * Solucionador de Sudoku — totalmente independente do quebra-cabeça.
 * Grade representada como array plano de 81 posições (0 = vazio).
 */

function candidatesFor(grid: number[], index: number): number {
  const row = (index / 9) | 0;
  const col = index % 9;
  const boxRow = ((row / 3) | 0) * 3;
  const boxCol = ((col / 3) | 0) * 3;

  let used = 0;
  for (let c = 0; c < 9; c++) {
    const v = grid[row * 9 + c];
    if (v) used |= 1 << (v - 1);
  }
  for (let r = 0; r < 9; r++) {
    const v = grid[r * 9 + col];
    if (v) used |= 1 << (v - 1);
  }
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const v = grid[r * 9 + c];
      if (v) used |= 1 << (v - 1);
    }
  }
  return ~used & 0x1ff;
}

function popcount(x: number): number {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

/** Conta soluções até `limit` (parada antecipada) — usado para garantir solução única ao gerar. */
export function countSolutions(grid: number[], limit = 2): number {
  const g = grid.slice();
  let count = 0;

  function findEmpty(): { index: number; cands: number } | null {
    let best = -1;
    let bestCount = 10;
    let bestCands = 0;
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue;
      const cands = candidatesFor(g, i);
      const c = popcount(cands);
      if (c < bestCount) {
        bestCount = c;
        best = i;
        bestCands = cands;
        if (c === 0) return { index: i, cands: 0 };
      }
    }
    return best === -1 ? null : { index: best, cands: bestCands };
  }

  function backtrack() {
    if (count >= limit) return;
    const empty = findEmpty();
    if (!empty) {
      count++;
      return;
    }
    const { index, cands } = empty;
    if (cands === 0) return;
    for (let d = 1; d <= 9; d++) {
      if (cands & (1 << (d - 1))) {
        g[index] = d;
        backtrack();
        g[index] = 0;
        if (count >= limit) return;
      }
    }
  }

  backtrack();
  return count;
}

/** Resolve completamente via backtracking (usado só na geração, nunca exposto ao cliente). */
export function solveComplete(grid: number[]): number[] | null {
  const g = grid.slice();
  let solved: number[] | null = null;

  function findEmpty(): { index: number; cands: number } | null {
    let best = -1;
    let bestCount = 10;
    let bestCands = 0;
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue;
      const cands = candidatesFor(g, i);
      const c = popcount(cands);
      if (c < bestCount) {
        bestCount = c;
        best = i;
        bestCands = cands;
        if (c === 0) return { index: i, cands: 0 };
      }
    }
    return best === -1 ? null : { index: best, cands: bestCands };
  }

  function backtrack() {
    if (solved) return;
    const empty = findEmpty();
    if (!empty) {
      solved = g.slice();
      return;
    }
    const { index, cands } = empty;
    if (cands === 0) return;
    for (let d = 1; d <= 9; d++) {
      if (cands & (1 << (d - 1))) {
        g[index] = d;
        backtrack();
        if (solved) return;
        g[index] = 0;
      }
    }
  }

  backtrack();
  return solved;
}

/**
 * Resolve usando só técnicas lógicas básicas (single nu/oculto — as mesmas que
 * um humano usa antes de precisar "arriscar"). Se `stuck` vier true, o puzzle
 * exige técnicas mais avançadas (ou tentativa e erro) — é assim que
 * verificamos se um Sudoku "Difícil" é realmente difícil, e não só tem menos
 * números preenchidos.
 */
export function solveLogical(grid: number[]): { grid: number[]; stuck: boolean } {
  const g = grid.slice();
  let progress = true;

  const units: number[][] = [];
  for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const cells: number[] = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push((br * 3 + r) * 9 + (bc * 3 + c));
      units.push(cells);
    }
  }

  while (progress) {
    progress = false;

    // naked singles: célula com apenas um candidato possível
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue;
      const cands = candidatesFor(g, i);
      if (popcount(cands) === 1) {
        g[i] = Math.log2(cands) + 1;
        progress = true;
      }
    }

    // hidden singles: dígito que só cabe em uma célula dentro de uma unidade
    for (const unit of units) {
      for (let d = 1; d <= 9; d++) {
        const candCells: number[] = [];
        for (const idx of unit) {
          if (g[idx] !== 0) continue;
          if (candidatesFor(g, idx) & (1 << (d - 1))) candCells.push(idx);
        }
        if (candCells.length === 1) {
          g[candCells[0]] = d;
          progress = true;
        }
      }
    }
  }

  const stuck = g.some((v) => v === 0);
  return { grid: g, stuck };
}

/** Verifica se uma grade 9x9 completa (sem zeros) é uma solução válida. */
export function isValidCompleteGrid(grid: number[]): boolean {
  if (grid.length !== 81 || grid.some((v) => v < 1 || v > 9)) return false;

  for (let r = 0; r < 9; r++) {
    const seen = new Set<number>();
    for (let c = 0; c < 9; c++) seen.add(grid[r * 9 + c]);
    if (seen.size !== 9) return false;
  }
  for (let c = 0; c < 9; c++) {
    const seen = new Set<number>();
    for (let r = 0; r < 9; r++) seen.add(grid[r * 9 + c]);
    if (seen.size !== 9) return false;
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Set<number>();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) seen.add(grid[(br * 3 + r) * 9 + (bc * 3 + c)]);
      if (seen.size !== 9) return false;
    }
  }
  return true;
}
