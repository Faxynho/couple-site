/**
 * Geometria das peças do quebra-cabeça jigsaw.
 *
 * `PIECE_SIZE` precisa ser IGUAL à constante equivalente em
 * `backend/src/games/puzzle/PuzzleGame.ts` — é a unidade de medida do
 * "quadro virtual" compartilhado entre os dois jogadores.
 *
 * As proporções da saliência/reentrância (AMP/CENTER/NECK/BULB) foram
 * validadas visualmente antes de entrar aqui; qualquer ajuste deve ser
 * conferido de novo visualmente.
 */

export const PIECE_SIZE = 100;
export const TAB_MARGIN = 34;
export const PIECE_BOX = PIECE_SIZE + TAB_MARGIN * 2;

const AMP_RATIO = 0.2;
const CENTER = 0.5;
const NECK = 0.055;
const BULB = 0.115;

type Point = [number, number];

function lerp(p0: Point, p1: Point, t: number): Point {
  return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function cubic(c1: Point, c2: Point, end: Point): string {
  return `C ${fmt(c1[0])},${fmt(c1[1])} ${fmt(c2[0])},${fmt(c2[1])} ${fmt(end[0])},${fmt(end[1])} `;
}

/**
 * Constrói o trecho de path de uma aresta (de p0 a p1).
 * sign = 0 (reta, borda do quadro), +1 (saliência para fora), -1 (reentrância para dentro).
 * `normal` é o vetor unitário "para fora" da peça nesse lado.
 */
function edgeCurve(p0: Point, p1: Point, normal: Point, sign: number): string {
  if (sign === 0) return `L ${fmt(p1[0])},${fmt(p1[1])} `;

  const edgeLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const amp = AMP_RATIO * edgeLen * sign;

  const t1 = CENTER - NECK * 3;
  const t2 = CENTER - BULB;
  const t3 = CENTER - NECK;
  const t4 = CENTER;
  const t5 = CENTER + NECK;
  const t6 = CENTER + BULB;
  const t7 = CENTER + NECK * 3;

  const P = (t: number, n = 0): Point => {
    const base = lerp(p0, p1, t);
    return [base[0] + normal[0] * n, base[1] + normal[1] * n];
  };

  let path = `L ${fmt(P(t1)[0])},${fmt(P(t1)[1])} `;
  path += cubic(P(t2, 0), P(t2, amp), P(t3, amp));
  path += cubic(P(t3 - 0.02, amp), P(t3 - 0.02, amp * 1.38), P(t4, amp * 1.38));
  path += cubic(P(t5 + 0.02, amp * 1.38), P(t5 + 0.02, amp), P(t5, amp));
  path += cubic(P(t6, amp), P(t6, 0), P(t7, 0));
  path += `L ${fmt(p1[0])},${fmt(p1[1])} `;
  return path;
}

export interface PieceSigns {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Deriva os 4 sinais (saliência/reentrância/reto) de uma peça a partir das arestas do grid. */
export function getPieceSigns(
  pieceId: number,
  gridSize: number,
  edgeSignsH: number[],
  edgeSignsV: number[]
): PieceSigns {
  const row = Math.floor(pieceId / gridSize);
  const col = pieceId % gridSize;
  const hIndex = (r: number, c: number) => r * (gridSize - 1) + c;
  const vIndex = (r: number, c: number) => r * gridSize + c;

  return {
    top: row === 0 ? 0 : -edgeSignsV[vIndex(row - 1, col)],
    bottom: row === gridSize - 1 ? 0 : edgeSignsV[vIndex(row, col)],
    left: col === 0 ? 0 : -edgeSignsH[hIndex(row, col - 1)],
    right: col === gridSize - 1 ? 0 : edgeSignsH[hIndex(row, col)],
  };
}

/** Gera o path SVG local (dentro de uma caixa PIECE_BOX x PIECE_BOX) para a peça. */
export function buildPiecePath(signs: PieceSigns): string {
  const m = TAB_MARGIN;
  const s = PIECE_SIZE;
  const tl: Point = [m, m];
  const tr: Point = [m + s, m];
  const br: Point = [m + s, m + s];
  const bl: Point = [m, m + s];

  let d = `M ${fmt(tl[0])},${fmt(tl[1])} `;
  d += edgeCurve(tl, tr, [0, -1], signs.top);
  d += edgeCurve(tr, br, [1, 0], signs.right);
  d += edgeCurve(br, bl, [0, 1], signs.bottom);
  d += edgeCurve(bl, tl, [-1, 0], signs.left);
  d += "Z";
  return d;
}
