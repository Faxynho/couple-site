import { DecorationTool, WorldDebugInfo, WorldDecoration, WorldDecorationEffectEvent, WorldDirection, WorldPlayerActionEvent, WorldPlayerState, WorldTerrainCell } from "@/world/types";

export interface WorldCameraZoomInfo {
  /** Nível de distância da câmera (1 = mais longe, 8 = mais perto). */
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
  updateTerrain(terrain: WorldTerrainCell[]): void;
  playRemoteAction(event: WorldPlayerActionEvent): void;
  playDecorationEffect(event: WorldDecorationEffectEvent): void;
  /** topInset = área em CSS pixels ocupada pelo HUD superior. */
  resize(width: number, height: number, topInset?: number): void;
  destroy(): void;
}

export interface WorldGameCallbacks {
  onMove(state: Omit<WorldPlayerState, "accountId" | "skinId" | "updatedAt">): void;
  onAction(action: string, direction: WorldDirection): void;
  onChangeScene(scene: WorldPlayerState["scene"]): Promise<{ ok: boolean; error?: string; player?: WorldPlayerState }>;
  onPlaceDecoration(itemId: string, scene: WorldPlayerState["scene"], gridX: number, gridY: number, rotation?: number): Promise<{ ok: boolean; error?: string; decoration?: WorldDecoration }>;
  onMoveDecoration(id: string, scene: WorldPlayerState["scene"], gridX: number, gridY: number): Promise<{ ok: boolean; error?: string; decoration?: WorldDecoration }>;
  onRemoveDecoration(id: string): Promise<{ ok: boolean; error?: string }>;
  onPaintTerrain(terrainId: string, scene: WorldPlayerState["scene"], gridX: number, gridY: number): Promise<{ ok: boolean; error?: string }>;
  onRemoveTerrain(scene: WorldPlayerState["scene"], gridX: number, gridY: number): Promise<{ ok: boolean; error?: string }>;
  onHint(hint: string | null): void;
  onNotice(message: string): void;
  onDebug(info: WorldDebugInfo | null): void;
  onCameraZoomChange(info: WorldCameraZoomInfo): void;
  onReady(): void;
  onError(message: string): void;
}
