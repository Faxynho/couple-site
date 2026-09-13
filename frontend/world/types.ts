import { AccountId } from "@/lib/accountSession";

export type WorldSceneId = "exterior" | "house-interior";
export type WorldDirection = "down" | "up" | "left" | "right";
export type WorldDecorationType = "chair" | "table" | "plant" | "chest" | "fence";

export interface WorldPlayerState {
  accountId: AccountId;
  scene: WorldSceneId;
  x: number;
  y: number;
  direction: WorldDirection;
  moving: boolean;
  skinId: string;
  updatedAt: number;
}

/**
 * Evento efêmero de animação de ação. Não é salvo no mundo.
 * `action` fica como string de propósito para o registry de animações continuar
 * genérico: animações novas não exigem alterar este tipo.
 */
export interface WorldPlayerActionEvent {
  accountId: AccountId;
  action: string;
  direction: WorldDirection;
  sentAt: number;
}

export interface WorldDecoration {
  id: string;
  type: WorldDecorationType;
  scene: WorldSceneId;
  gridX: number;
  gridY: number;
  placedBy: AccountId;
  updatedAt: number;
}

export interface WorldSnapshot {
  worldId: string;
  players: WorldPlayerState[];
  decorations: WorldDecoration[];
}

export type DecorationTool =
  | { kind: "place"; type: WorldDecorationType }
  | { kind: "move" }
  | { kind: "remove" }
  | null;

export interface WorldDebugInfo {
  fps: number;
  x: number;
  y: number;
  scene: WorldSceneId;
}

export interface WorldAck {
  ok: boolean;
  error?: string;
  player?: WorldPlayerState;
  decoration?: WorldDecoration;
}
