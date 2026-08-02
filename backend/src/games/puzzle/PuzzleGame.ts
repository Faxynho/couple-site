import { GameEngine } from "../../types";

/**
 * Deve ser mantido IGUAL ao `PIECE_SIZE` de `frontend/lib/jigsawShapes.ts` —
 * é a unidade de medida do "quadro virtual" que os dois lados compartilham.
 */
const PIECE_SIZE = 100;

const SNAP_TOLERANCE = 26; // distância (em unidades do quadro) para duas peças se encaixarem
const FRAME_TOLERANCE = 30; // distância para um grupo se alinhar sozinho à moldura-guia

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
  gridSize: number;
  pieceCount: number;
  pieceSize: number;
  boardWidth: number;
  boardHeight: number;
  targetX: number;
  targetY: number;
  /** direção da saliência/reentrância de cada aresta interna, compartilhada pelos dois clientes. */
  edgeSignsH: number[]; // arestas verticais, entre (row,col) e (row,col+1) — tamanho gridSize*(gridSize-1)
  edgeSignsV: number[]; // arestas horizontais, entre (row,col) e (row+1,col) — tamanho (gridSize-1)*gridSize
  groups: Record<string, PieceGroup>;
  pieceToGroup: Record<number, string>;
  moves: number;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
}

export type PuzzleAction =
  | { type: "pickup"; groupId: string }
  | { type: "drop"; groupId: string; x: number; y: number };

const DEFAULT_GRID_SIZE = 4;

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function generateEdgeSigns(gridSize: number): { h: number[]; v: number[] } {
  const h: number[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize - 1; col++) {
      h.push(Math.random() < 0.5 ? 1 : -1);
    }
  }
  const v: number[] = [];
  for (let row = 0; row < gridSize - 1; row++) {
    for (let col = 0; col < gridSize; col++) {
      v.push(Math.random() < 0.5 ? 1 : -1);
    }
  }
  return { h, v };
}

/** Distribui as peças embaralhadas ao redor da moldura-guia, sem empilhar. */
function generateInitialGroups(
  gridSize: number,
  boardWidth: number,
  boardHeight: number,
  targetX: number,
  targetY: number
): { groups: Record<string, PieceGroup>; pieceToGroup: Record<number, string> } {
  const targetSize = gridSize * PIECE_SIZE;
  const padding = 26;
  const cellStep = PIECE_SIZE * 0.92;
  const margin = 112; // mantém a caixa da peça (com as saliências) inteira dentro do quadro

  const candidates: { x: number; y: number }[] = [];
  for (let y = margin; y <= boardHeight - margin; y += cellStep) {
    for (let x = margin; x <= boardWidth - margin; x += cellStep) {
      const insideTarget =
        x >= targetX - padding &&
        x <= targetX + targetSize + padding &&
        y >= targetY - padding &&
        y <= targetY + targetSize + padding;
      if (!insideTarget) candidates.push({ x, y });
    }
  }
  shuffleInPlace(candidates);

  const pieceCount = gridSize * gridSize;
  const groups: Record<string, PieceGroup> = {};
  const pieceToGroup: Record<number, string> = {};

  for (let id = 0; id < pieceCount; id++) {
    const row = Math.floor(id / gridSize);
    const col = id % gridSize;
    const cell = candidates[id % Math.max(candidates.length, 1)] ?? { x: margin, y: margin };
    const jitterX = (Math.random() - 0.5) * 16;
    const jitterY = (Math.random() - 0.5) * 16;

    const groupId = `g${id}`;
    groups[groupId] = {
      id: groupId,
      pieceIds: [id],
      originX: cell.x - col * PIECE_SIZE + jitterX,
      originY: cell.y - row * PIECE_SIZE + jitterY,
    };
    pieceToGroup[id] = groupId;
  }

  return { groups, pieceToGroup };
}

function snapToFrame(state: PuzzleState, groupId: string) {
  const group = state.groups[groupId];
  if (!group) return;
  if (
    Math.abs(group.originX - state.targetX) <= FRAME_TOLERANCE &&
    Math.abs(group.originY - state.targetY) <= FRAME_TOLERANCE
  ) {
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
  let currentId = startGroupId;
  let progress = true;

  while (progress) {
    progress = false;
    const group = state.groups[currentId];
    if (!group) return;

    for (const pieceId of group.pieceIds) {
      const row = Math.floor(pieceId / state.gridSize);
      const col = pieceId % state.gridSize;
      let mergedHere = false;

      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nc < 0 || nr >= state.gridSize || nc >= state.gridSize) continue;

        const neighborId = nr * state.gridSize + nc;
        const neighborGroupId = state.pieceToGroup[neighborId];
        if (!neighborGroupId || neighborGroupId === currentId) continue;
        const neighborGroup = state.groups[neighborGroupId];
        if (!neighborGroup) continue;

        const closeEnough =
          Math.abs(group.originX - neighborGroup.originX) <= SNAP_TOLERANCE &&
          Math.abs(group.originY - neighborGroup.originY) <= SNAP_TOLERANCE;

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

  createInitialState(options?: { imageId?: string; gridSize?: number }): PuzzleState {
    const gridSize = options?.gridSize ?? DEFAULT_GRID_SIZE;
    const targetSize = gridSize * PIECE_SIZE;
    const boardWidth = targetSize + 480;
    const boardHeight = targetSize + 520;
    const targetX = (boardWidth - targetSize) / 2;
    const targetY = (boardHeight - targetSize) / 2;

    const { h, v } = generateEdgeSigns(gridSize);
    const { groups, pieceToGroup } = generateInitialGroups(gridSize, boardWidth, boardHeight, targetX, targetY);

    return {
      imageId: options?.imageId ?? "aurora",
      gridSize,
      pieceCount: gridSize * gridSize,
      pieceSize: PIECE_SIZE,
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
      return next;
    }

    return state;
  }

  isSolved(state: PuzzleState): boolean {
    return Object.keys(state.groups).length === 1;
  }

  reset(state: PuzzleState): PuzzleState {
    return this.createInitialState({ imageId: state.imageId, gridSize: state.gridSize });
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
