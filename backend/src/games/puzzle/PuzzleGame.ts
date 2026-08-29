import { GameEngine } from "../../types";
import { DIFFICULTIES, Difficulty, getFallbackDimensions } from "./puzzleImages";

/**
 * Pesos da busca de grade: squareErr é o log da proporção da peça (0 = peça
 * perfeitamente quadrada); countErr é o desvio relativo em relação à meta de
 * peças da dificuldade. squareWeight > countWeight porque a prioridade é
 * nunca deformar a imagem — uma pequena diferença na quantidade de peças é
 * preferível. Valores calibrados testando várias proporções (quadrada,
 * 9:16, 16:9, e casos extremos como 2:5 e panoramas).
 */
const SQUARE_WEIGHT = 1.5;
const COUNT_WEIGHT = 1;

/** Fora desse intervalo de proporção de peça, nem a melhor grade encontrada
 *  fica razoável — aí, como último recurso, cortamos a imagem (nunca esticamos). */
const CROP_TRIGGER_MIN = 0.62;
const CROP_TRIGGER_MAX = 1 / CROP_TRIGGER_MIN;

/**
 * Proporções de tolerância de encaixe, como fração do tamanho da peça —
 * assim continuam corretas independente da dificuldade escolhida.
 */
const SNAP_TOLERANCE_RATIO = 0.26;
const FRAME_TOLERANCE_RATIO = 0.3;

const DEFAULT_IMAGE_ID = "/images/puzzle/aurora.jpg";
const DEFAULT_DIFFICULTY: Difficulty = "medium";

export interface PieceGroup {
  id: string;
  pieceIds: number[];
  /** Posição onde a peça (linha 0, coluna 0) do grupo estaria, no sistema de coordenadas do quadro. */
  originX: number;
  originY: number;
  heldBy?: string;
}

export interface PuzzleState {
  imageId: string;
  /** Dimensões REAIS da imagem (medidas no navegador). Fonte da verdade da proporção. */
  imageWidth: number;
  imageHeight: number;
  /** Retângulo (em pixels da imagem original) realmente usado no quebra-cabeça.
   *  Igual à imagem inteira, a menos que um corte mínimo tenha sido necessário
   *  (ver CROP_TRIGGER_MIN/MAX) — nunca há distorção, só corte centralizado. */
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  pieceCount: number;
  pieceSize: number;
  boardWidth: number;
  boardHeight: number;
  targetX: number;
  targetY: number;
  /** direção da saliência/reentrância de cada aresta interna, compartilhada pelos dois clientes. */
  edgeSignsH: number[]; // arestas verticais, entre (row,col) e (row,col+1) — tamanho rows*(cols-1)
  edgeSignsV: number[]; // arestas horizontais, entre (row,col) e (row+1,col) — tamanho (rows-1)*cols
  groups: Record<string, PieceGroup>;
  pieceToGroup: Record<number, string>;
  moves: number;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
  /** Identificador opaco da última ação local aceita pelo servidor. */
  lastActionId: string | null;
}

export type PuzzleAction =
  | { type: "pickup"; groupId: string }
  | { type: "drop"; groupId: string; x: number; y: number; clientActionId?: string };

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

interface GridCandidate {
  rows: number;
  cols: number;
  pieceCount: number;
  /** proporção largura/altura de UMA peça nessa grade — 1 = perfeitamente quadrada */
  pieceAspect: number;
}

/**
 * Busca, entre várias combinações de linhas x colunas ao redor da meta de
 * peças, a que deixa as peças mais próximas de um quadrado — sem NUNCA
 * esticar a imagem (a proporção real da imagem sempre entra na conta).
 * Uma pequena diferença na contagem final de peças é aceitável; deformar
 * a peça, não.
 */
function searchGrid(targetPieces: number, aspect: number): GridCandidate {
  const naiveCols = Math.sqrt(targetPieces * aspect);
  const colsFrom = Math.max(2, Math.floor(naiveCols * 0.55));
  const colsTo = Math.max(colsFrom + 1, Math.ceil(naiveCols * 1.8));

  let best: (GridCandidate & { score: number }) | null = null;

  for (let cols = colsFrom; cols <= colsTo; cols++) {
    const naiveRows = targetPieces / cols;
    const rowsFrom = Math.max(2, Math.floor(naiveRows - 3));
    const rowsTo = Math.max(rowsFrom + 1, Math.ceil(naiveRows + 3));

    for (let rows = rowsFrom; rows <= rowsTo; rows++) {
      const gridAspect = cols / rows;
      const pieceAspect = aspect / gridAspect;
      const squareErr = Math.abs(Math.log(pieceAspect));
      const pieceCount = rows * cols;
      const countErr = Math.abs(pieceCount - targetPieces) / targetPieces;
      const score = squareErr * SQUARE_WEIGHT + countErr * COUNT_WEIGHT;

      if (!best || score < best.score) {
        best = { rows, cols, pieceCount, pieceAspect, score };
      }
    }
  }

  return best!;
}

interface CropRect {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

/**
 * Último recurso: se mesmo a melhor grade encontrada deixar a peça bem
 * distante de um quadrado (proporção fora de [CROP_TRIGGER_MIN, MAX] —
 * na prática só acontece com imagens muito panorâmicas ou muito estreitas),
 * corta simetricamente só o eixo necessário para fechar a conta exatamente.
 * Nunca estica, nunca gira, nunca corta os dois eixos ao mesmo tempo.
 */
function computeCrop(rows: number, cols: number, imageWidth: number, imageHeight: number, pieceAspect: number): CropRect {
  if (pieceAspect >= CROP_TRIGGER_MIN && pieceAspect <= CROP_TRIGGER_MAX) {
    return { cropX: 0, cropY: 0, cropWidth: imageWidth, cropHeight: imageHeight };
  }

  const gridAspect = cols / rows;
  const trueAspect = imageWidth / imageHeight;

  if (gridAspect > trueAspect) {
    // a grade é relativamente mais "larga" que a imagem -> corta um pouco da altura
    const effectiveHeight = imageWidth / gridAspect;
    const cropY = (imageHeight - effectiveHeight) / 2;
    return { cropX: 0, cropY, cropWidth: imageWidth, cropHeight: effectiveHeight };
  }

  // a grade é relativamente mais "alta" que a imagem -> corta um pouco da largura
  const effectiveWidth = imageHeight * gridAspect;
  const cropX = (imageWidth - effectiveWidth) / 2;
  return { cropX, cropY: 0, cropWidth: effectiveWidth, cropHeight: imageHeight };
}

/**
 * Tamanho da peça calculado apenas a partir da quantidade real de peças —
 * sem nenhum valor "por dificuldade" hard-coded. Quanto mais peças, menores
 * (para caber confortavelmente), com piso e teto para nunca ficar ilegível
 * nem gigante demais. Uma dificuldade nova (200, 300, 500 peças...) já
 * funciona automaticamente com essa mesma fórmula.
 */
function computePieceSize(pieceCount: number): number {
  const REFERENCE_COUNT = 30;
  const REFERENCE_SIZE = 130;
  const MIN_SIZE = 60;
  const MAX_SIZE = 140;
  const raw = REFERENCE_SIZE * Math.sqrt(REFERENCE_COUNT / pieceCount);
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, raw));
}

interface Cell {
  x: number;
  y: number;
}

interface BoardLayout {
  boardWidth: number;
  boardHeight: number;
  targetX: number;
  targetY: number;
  candidates: Cell[];
}

/**
 * Calcula o tamanho do "quadro virtual" iterativamente: começa com uma
 * margem ao redor da moldura-guia e vai aumentando até existirem células
 * suficientes para espalhar todas as peças sem sobrepor. Isso substitui
 * qualquer tamanho de tabuleiro fixo — funciona igual para 16 ou 500 peças.
 */
function computeBoardLayout(assembledWidth: number, assembledHeight: number, pieceSize: number, pieceCount: number): BoardLayout {
  const cellStep = pieceSize * 0.92;
  const targetPadding = pieceSize * 0.26;
  const edgeMargin = pieceSize * 1.1;
  const requiredCandidates = Math.ceil(pieceCount * 1.15) + 4;

  let padding = pieceSize * 2;

  for (let attempt = 0; attempt < 40; attempt++) {
    const boardWidth = assembledWidth + padding * 2;
    const boardHeight = assembledHeight + padding * 2;
    const targetX = padding;
    const targetY = padding;

    const candidates: Cell[] = [];
    for (let y = edgeMargin; y <= boardHeight - edgeMargin; y += cellStep) {
      for (let x = edgeMargin; x <= boardWidth - edgeMargin; x += cellStep) {
        const insideTarget =
          x >= targetX - targetPadding &&
          x <= targetX + assembledWidth + targetPadding &&
          y >= targetY - targetPadding &&
          y <= targetY + assembledHeight + targetPadding;
        if (!insideTarget) candidates.push({ x, y });
      }
    }

    if (candidates.length >= requiredCandidates) {
      return { boardWidth, boardHeight, targetX, targetY, candidates };
    }
    padding += pieceSize * 0.75;
  }

  // Extremamente improvável de chegar aqui, mas garante que sempre há algo a retornar.
  const boardWidth = assembledWidth + padding * 2;
  const boardHeight = assembledHeight + padding * 2;
  return { boardWidth, boardHeight, targetX: padding, targetY: padding, candidates: [] };
}

function generateEdgeSigns(rows: number, cols: number): { h: number[]; v: number[] } {
  const h: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols - 1; col++) {
      h.push(Math.random() < 0.5 ? 1 : -1);
    }
  }
  const v: number[] = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols; col++) {
      v.push(Math.random() < 0.5 ? 1 : -1);
    }
  }
  return { h, v };
}

/** Distribui as peças embaralhadas pelas células candidatas, sem empilhar. */
function generateInitialGroups(
  rows: number,
  cols: number,
  pieceSize: number,
  candidates: Cell[]
): { groups: Record<string, PieceGroup>; pieceToGroup: Record<number, string> } {
  const pieceCount = rows * cols;
  const cells = [...candidates];
  shuffleInPlace(cells);

  const groups: Record<string, PieceGroup> = {};
  const pieceToGroup: Record<number, string> = {};

  for (let id = 0; id < pieceCount; id++) {
    const row = Math.floor(id / cols);
    const col = id % cols;
    const cell = cells[id % Math.max(cells.length, 1)] ?? { x: pieceSize, y: pieceSize };
    const jitterX = (Math.random() - 0.5) * pieceSize * 0.16;
    const jitterY = (Math.random() - 0.5) * pieceSize * 0.16;

    const groupId = `g${id}`;
    groups[groupId] = {
      id: groupId,
      pieceIds: [id],
      originX: cell.x - col * pieceSize + jitterX,
      originY: cell.y - row * pieceSize + jitterY,
    };
    pieceToGroup[id] = groupId;
  }

  return { groups, pieceToGroup };
}

function snapToFrame(state: PuzzleState, groupId: string) {
  const group = state.groups[groupId];
  if (!group) return;
  const tolerance = state.pieceSize * FRAME_TOLERANCE_RATIO;
  if (Math.abs(group.originX - state.targetX) <= tolerance && Math.abs(group.originY - state.targetY) <= tolerance) {
    group.originX = state.targetX;
    group.originY = state.targetY;
  }
}

const NEIGHBOR_OFFSETS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Tenta unir `groupId` a qualquer grupo vizinho compatível, em cadeia (uma fusão pode habilitar outra). */
function mergeChain(state: PuzzleState, startGroupId: string) {
  const currentId = startGroupId;
  const tolerance = state.pieceSize * SNAP_TOLERANCE_RATIO;
  let progress = true;

  while (progress) {
    progress = false;
    const group = state.groups[currentId];
    if (!group) return;

    for (const pieceId of group.pieceIds) {
      const row = Math.floor(pieceId / state.cols);
      const col = pieceId % state.cols;
      let mergedHere = false;

      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nc < 0 || nr >= state.rows || nc >= state.cols) continue;

        const neighborId = nr * state.cols + nc;
        const neighborGroupId = state.pieceToGroup[neighborId];
        if (!neighborGroupId || neighborGroupId === currentId) continue;
        const neighborGroup = state.groups[neighborGroupId];
        if (!neighborGroup) continue;

        const closeEnough =
          Math.abs(group.originX - neighborGroup.originX) <= tolerance &&
          Math.abs(group.originY - neighborGroup.originY) <= tolerance;

        if (closeEnough) {
          group.originX = neighborGroup.originX;
          group.originY = neighborGroup.originY;
          for (const pid of neighborGroup.pieceIds) {
            group.pieceIds.push(pid);
            state.pieceToGroup[pid] = currentId;
          }
          delete state.groups[neighborGroupId];
          progress = true;
          mergedHere = true;
          break;
        }
      }
      if (mergedHere) break;
    }
  }
}

export class PuzzleGame implements GameEngine<PuzzleState, PuzzleAction> {
  readonly id = "puzzle" as const;

  createInitialState(options?: { imageId?: string; difficulty?: Difficulty; imageWidth?: number; imageHeight?: number }): PuzzleState {
    const imageId = options?.imageId ?? DEFAULT_IMAGE_ID;
    const difficulty = options?.difficulty ?? DEFAULT_DIFFICULTY;
    const targetPieces = DIFFICULTIES[difficulty].targetPieces;

    // Fonte da verdade: a dimensão real medida no navegador. Só cai pro
    // fallback genérico se, por algum motivo, ela não tiver sido enviada.
    const fallback = getFallbackDimensions();
    const imageWidth = options?.imageWidth && options.imageWidth > 0 ? options.imageWidth : fallback.width;
    const imageHeight = options?.imageHeight && options.imageHeight > 0 ? options.imageHeight : fallback.height;
    const aspect = imageWidth / imageHeight;

    const { rows, cols, pieceCount, pieceAspect } = searchGrid(targetPieces, aspect);
    const pieceSize = computePieceSize(pieceCount);
    const { cropX, cropY, cropWidth, cropHeight } = computeCrop(rows, cols, imageWidth, imageHeight, pieceAspect);
    const assembledWidth = cols * pieceSize;
    const assembledHeight = rows * pieceSize;

    const { boardWidth, boardHeight, targetX, targetY, candidates } = computeBoardLayout(
      assembledWidth,
      assembledHeight,
      pieceSize,
      pieceCount
    );

    const { h, v } = generateEdgeSigns(rows, cols);
    const { groups, pieceToGroup } = generateInitialGroups(rows, cols, pieceSize, candidates);

    return {
      imageId,
      imageWidth,
      imageHeight,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      difficulty,
      rows,
      cols,
      pieceCount,
      pieceSize,
      boardWidth,
      boardHeight,
      targetX,
      targetY,
      edgeSignsH: h,
      edgeSignsV: v,
      groups,
      pieceToGroup,
      moves: 0,
      startedAt: Date.now(),
      solved: false,
      solvedAt: null,
      lastActionId: null,
    };
  }

  applyAction(state: PuzzleState, action: PuzzleAction, playerId: string): PuzzleState {
    if (state.solved) return state;

    if (action.type === "pickup") {
      const group = state.groups[action.groupId];
      if (!group) return state;
      if (group.heldBy && group.heldBy !== playerId) return state;

      const next = structuredClone(state);
      next.groups[action.groupId].heldBy = playerId;
      return next;
    }

    if (action.type === "drop") {
      const group = state.groups[action.groupId];
      if (!group) return state;
      if (group.heldBy && group.heldBy !== playerId) return state;

      const next = structuredClone(state);
      const draggedGroup = next.groups[action.groupId];
      draggedGroup.originX = action.x;
      draggedGroup.originY = action.y;
      delete draggedGroup.heldBy;

      snapToFrame(next, action.groupId);
      mergeChain(next, action.groupId);

      next.moves += 1;
      next.solved = this.isSolved(next);
      next.solvedAt = next.solved ? Date.now() : null;
      next.lastActionId = action.clientActionId ?? null;
      return next;
    }

    return state;
  }

  isSolved(state: PuzzleState): boolean {
    return Object.keys(state.groups).length === 1;
  }

  reset(state: PuzzleState): PuzzleState {
    return this.createInitialState({
      imageId: state.imageId,
      difficulty: state.difficulty,
      imageWidth: state.imageWidth,
      imageHeight: state.imageHeight,
    });
  }

  releasePlayer(state: PuzzleState, playerId: string): PuzzleState {
    const held = Object.values(state.groups).some((g) => g.heldBy === playerId);
    if (!held) return state;
    const next = structuredClone(state);
    for (const group of Object.values(next.groups)) {
      if (group.heldBy === playerId) delete group.heldBy;
    }
    return next;
  }
}
