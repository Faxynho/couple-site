import { DecorationTool, WorldDebugInfo, WorldDecoration, WorldDirection, WorldPlayerActionEvent, WorldPlayerState } from "@/world/types";

export interface WorldCameraZoomInfo {
  zoom: number;
  min: number;
  max: number;
}

export interface WorldGameApi {
  setTouchDirection(x: number, y: number): void;
  setTapToMoveEnabled(enabled: boolean): void;
  setCameraZoom(zoom: number): WorldCameraZoomInfo;
  getCameraZoomInfo(): WorldCameraZoomInfo;
  interact(): void;
  toggleDebug(): void;
  setDecorationTool(tool: DecorationTool): void;
  cancelDecoration(): void;
  updatePlayers(players: WorldPlayerState[]): void;
  updateDecorations(decorations: WorldDecoration[]): void;
  playRemoteAction(event: WorldPlayerActionEvent): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface WorldGameCallbacks {
  onMove(state: Omit<WorldPlayerState, "accountId" | "skinId" | "updatedAt">): void;
  onAction(action: string, direction: WorldDirection): void;
  onChangeScene(scene: WorldPlayerState["scene"]): Promise<{ ok: boolean; error?: string; player?: WorldPlayerState }>;
  onPlaceDecoration(type: WorldDecoration["type"], scene: WorldPlayerState["scene"], gridX: number, gridY: number): Promise<{ ok: boolean; error?: string }>;
  onMoveDecoration(id: string, scene: WorldPlayerState["scene"], gridX: number, gridY: number): Promise<{ ok: boolean; error?: string }>;
  onRemoveDecoration(id: string): Promise<{ ok: boolean; error?: string }>;
  onHint(hint: string | null): void;
  onNotice(message: string): void;
  onDebug(info: WorldDebugInfo | null): void;
  onCameraZoomChange(info: WorldCameraZoomInfo): void;
  onReady(): void;
  onError(message: string): void;
}
