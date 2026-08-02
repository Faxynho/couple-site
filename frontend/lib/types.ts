export type GameId = "puzzle";

export interface Player {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

export type RoomStatus = "waiting" | "ready" | "playing" | "finished";

export interface RoomSnapshot {
  code: string;
  gameId: GameId;
  status: RoomStatus;
  players: Player[];
  maxPlayers: number;
}

export interface PieceGroup {
  id: string;
  pieceIds: number[];
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
  edgeSignsH: number[];
  edgeSignsV: number[];
  groups: Record<string, PieceGroup>;
  pieceToGroup: Record<number, string>;
  moves: number;
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
}

export interface GameDefinition {
  id: GameId;
  name: string;
  description: string;
  emoji: string;
  image: string;
  available: boolean;
}
