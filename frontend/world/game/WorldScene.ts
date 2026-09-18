import * as Phaser from "phaser";
import { AccountId } from "@/lib/accountSession";
import { CHARACTER_CONFIGS } from "@/world/config/characterConfig";
import { ConnectedCatalogItem, DecorationCatalogItem, getDecorationDefinition, isTerrainDefinition, ObjectCatalogItem, TerrainCatalogItem } from "@/world/config/decorationCatalog";
import { decorationCollisionRects, decorationPlacementRects, decorationRectsOverlap, DecorationRect } from "@/world/config/decorationGeometry";
import { WORLD_CONFIG, WORLD_OBJECT_ASSETS, WorldVisualAsset } from "@/world/config/worldConfig";
import { getWorldTilesetAsset, WORLD_TILESET_ASSETS, WorldTilesetAsset } from "@/world/config/tilesetConfig";
import { DecorationTool, WorldDecoration, WorldDecorationEffectEvent, WorldDirection, WorldPlayerActionEvent, WorldPlayerState, WorldSceneId, WorldSnapshot, WorldTerrainCell } from "@/world/types";
import { clampWorldCameraLevel, getWorldCameraLayout, WORLD_CAMERA_LEVEL_MAX, WORLD_CAMERA_LEVEL_MIN } from "./WorldCameraLayout";
import { DecorationPlacementInput } from "./DecorationPlacementInput";
import { resolveNineSliceFrame } from "./Autotile";
import { WorldCameraZoomInfo, WorldGameCallbacks } from "./WorldGameApi";

type TiledObject = Phaser.Types.Tilemaps.TiledObject & { properties?: Array<{ name: string; value: unknown }> };

type WorldInteraction = {
  name: string;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
  target: WorldSceneId;
};

type TapMoveTarget = {
  x: number;
  y: number;
  interaction?: WorldInteraction;
};

type DecorationPointerPosition = {
  worldX: number;
  worldY: number;
  clientX?: number;
  clientY?: number;
};

const TAP_STOP_DISTANCE = 6;
const TAP_INTERACTION_DISTANCE = 48;
const TAP_INTERACTION_HIT_PADDING = 18;
const TAP_STUCK_TIMEOUT_MS = 900;
const CAMERA_ZOOM_TRANSITION_MS = 240;
const TILE_SIZE = WORLD_CONFIG.tileSize;
const NEIGHBOR_OFFSETS = [
  { bit: 1, dx: 0, dy: -1 },
  { bit: 2, dx: 1, dy: -1 },
  { bit: 4, dx: 1, dy: 0 },
  { bit: 8, dx: 1, dy: 1 },
  { bit: 16, dx: 0, dy: 1 },
  { bit: 32, dx: -1, dy: 1 },
  { bit: 64, dx: -1, dy: 0 },
  { bit: 128, dx: -1, dy: -1 },
] as const;

function property(object: TiledObject, name: string): unknown {
  return object.properties?.find((item: { name: string; value: unknown }) => item.name === name)?.value;
}

export class WorldScene extends Phaser.Scene {
  private readonly accountId: AccountId;
  private readonly callbacks: WorldGameCallbacks;
  private players: WorldPlayerState[];
  private decorations: WorldDecoration[];
  private terrain: WorldTerrainCell[];
  private terrainByCell = new Map<string, WorldTerrainCell>();
  private currentScene: WorldSceneId = "exterior";
  private tilemap?: Phaser.Tilemaps.Tilemap;
  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundDetailsLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundDetailsTopLayer?: Phaser.Tilemaps.TilemapLayer;
  private localPlayer?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private localPlayerVisual?: Phaser.GameObjects.Sprite;
  private remotePlayers = new Map<AccountId, Phaser.GameObjects.Sprite>();
  private mapVisuals: Phaser.GameObjects.GameObject[] = [];
  private fixedObstacles: Phaser.GameObjects.GameObject[] = [];
  private decorationVisuals: Phaser.GameObjects.Sprite[] = [];
  private decorationObstacles: Phaser.GameObjects.GameObject[] = [];
  private decorationEntries = new Map<string, {
    signature: string;
    sprite: Phaser.GameObjects.Sprite;
    obstacles: Phaser.GameObjects.GameObject[];
    colliders: Phaser.Physics.Arcade.Collider[];
  }>();
  private fixedColliders: Phaser.Physics.Arcade.Collider[] = [];
  private decorationColliders: Phaser.Physics.Arcade.Collider[] = [];
  private interactions: WorldInteraction[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private touchDirection = { x: 0, y: 0 };
  private direction: WorldDirection = "down";
  private currentAction: string | null = null;
  private remoteActions = new Map<AccountId, { action: string; direction: WorldDirection }>();
  private decorationTool: DecorationTool = null;
  private movingDecoration: WorldDecoration | null = null;
  private preview?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
  private readonly placementInput = new DecorationPlacementInput();
  private dynamicGroundLayer?: Phaser.Tilemaps.TilemapLayer;
  private dynamicGroundDetailsLayer?: Phaser.Tilemaps.TilemapLayer;
  private dynamicGroundDetailsTopLayer?: Phaser.Tilemaps.TilemapLayer;
  private terrainObstacles = new Map<string, { obstacle: Phaser.GameObjects.GameObject; collider?: Phaser.Physics.Arcade.Collider }>();
  private effectSprites = new Set<Phaser.GameObjects.Sprite>();
  private readonly handleDomPointerDown = (event: PointerEvent) => this.beginDomTouchPlacement(event);
  private readonly handleDomPointerMove = (event: PointerEvent) => this.moveDomTouchPlacement(event);
  private readonly handleDomPointerUp = (event: PointerEvent) => this.finishDomTouchPlacement(event);
  private readonly handleDomPointerCancel = (event: PointerEvent) => this.cancelDomTouchPlacement(event);
  private readonly handleDomLostPointerCapture = (event: PointerEvent) => this.cancelDomTouchPlacement(event);
  private readonly handleInteractKey = () => this.interact();
  private readonly handleCancelKey = () => this.cancelDecoration();
  private readonly handleDebugKey = () => this.toggleDebug();
  private debugEnabled = false;
  private debugGrid?: Phaser.GameObjects.Graphics;
  private lastNetworkAt = 0;
  private lastDebugAt = 0;
  private changingScene = false;
  private destroyed = false;

  private tapToMoveEnabled = false;
  private tapMoveTarget: TapMoveTarget | null = null;
  private tapLastProgressAt = 0;
  private tapLastX = 0;
  private tapLastY = 0;

  private requestedCameraZoom: number = clampWorldCameraLevel(WORLD_CONFIG.camera.zoom);
  private viewportWidth = 0;
  private viewportHeight = 0;
  private viewportTopInset = 0;
  private cameraZoomTween?: Phaser.Tweens.Tween;

  constructor(accountId: AccountId, snapshot: WorldSnapshot, callbacks: WorldGameCallbacks) {
    super({ key: "WorldScene" });
    this.accountId = accountId;
    this.players = snapshot.players;
    this.decorations = snapshot.decorations;
    this.terrain = snapshot.terrain ?? [];
    this.indexTerrain();
    this.callbacks = callbacks;
  }

  preload() {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => this.callbacks.onError(`Não foi possível carregar ${file.src}.`));

    for (const config of Object.values(CHARACTER_CONFIGS)) {
      for (const sheet of Object.values(config.sheets)) {
        this.load.spritesheet(sheet.textureKey, sheet.url, {
          frameWidth: sheet.frameWidth,
          frameHeight: sheet.frameHeight,
          margin: sheet.margin,
          spacing: sheet.spacing,
        });
      }
    }

    const assets = Object.values(WORLD_OBJECT_ASSETS);
    for (const asset of assets) if (!this.load.textureManager.exists(asset.texture)) this.load.image(asset.texture, asset.url);
    for (const tileset of Object.values(WORLD_TILESET_ASSETS)) {
      if (!this.textures.exists(tileset.textureKey)) this.load.image(tileset.textureKey, tileset.url);
    }
    this.load.tilemapTiledJSON(WORLD_CONFIG.scenes.exterior.mapKey, WORLD_CONFIG.scenes.exterior.mapUrl);
    this.load.tilemapTiledJSON(WORLD_CONFIG.scenes["house-interior"].mapKey, WORLD_CONFIG.scenes["house-interior"].mapUrl);
    this.load.spritesheet("world-decoration-place-effect", "/world/effects/decoration-place-effect.png", { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    this.viewportWidth = Math.max(1, Number(this.scale.width || this.game.canvas.width));
    this.viewportHeight = Math.max(1, Number(this.scale.height || this.game.canvas.height));
    this.createAnimations();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on("keydown-E", this.handleInteractKey);
    this.input.keyboard?.on("keydown-ESC", this.handleCancelKey);
    this.input.keyboard?.on(`keydown-${WORLD_CONFIG.debugKey}`, this.handleDebugKey);
    this.input.keyboard?.on("keydown", this.handleActionDebugKey, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("pointerupoutside", this.handlePointerUpOutside, this);
    this.input.on("gameout", this.handleGameOut, this);
    this.game.canvas.addEventListener("pointerdown", this.handleDomPointerDown);
    window.addEventListener("pointermove", this.handleDomPointerMove);
    window.addEventListener("pointerup", this.handleDomPointerUp);
    window.addEventListener("pointercancel", this.handleDomPointerCancel);
    this.game.canvas.addEventListener("lostpointercapture", this.handleDomLostPointerCapture);
    this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.handleCameraFollowUpdate, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    const local = this.players.find((item) => item.accountId === this.accountId);
    if (!local) { this.callbacks.onError("O servidor não devolveu o personagem desta conta."); return; }
    this.switchMap(local);
    this.callbacks.onReady();
  }

  update(time: number, delta: number) {
    this.updateCameraLerpForFrame(delta);
    if (!this.localPlayer) return;
    const body = this.localPlayer.body;
    let moving = false;

    if (this.currentAction) {
      body.setVelocity(0, 0);
    } else {
      const input = this.movementInput(time);
      const speed = CHARACTER_CONFIGS[this.accountId].walkSpeed;
      const magnitude = Math.min(1, Math.hypot(input.x, input.y));
      body.setVelocity(input.x * speed, input.y * speed);
      if (magnitude > 0) body.velocity.normalize().scale(speed * magnitude);
      moving = body.velocity.lengthSq() > 0.5;

      if (moving) {
        this.direction = Math.abs(body.velocity.x) > Math.abs(body.velocity.y)
          ? (body.velocity.x < 0 ? "left" : "right")
          : (body.velocity.y < 0 ? "up" : "down");
      }

      const localVisual = this.localPlayerVisual ?? this.localPlayer;
      this.playCharacterAnimation(localVisual, this.accountId, moving ? "walk" : "idle", this.direction);
    }
    this.syncLocalPlayerVisualToCamera(this.cameras.main);

    for (const [accountId, sprite] of this.remotePlayers) {
      const target = sprite.getData("target") as WorldPlayerState | undefined;
      if (!target || target.scene !== this.currentScene) { sprite.setVisible(false); continue; }
      sprite.setVisible(true);
      sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.22);
      sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.22);
      sprite.setDepth(sprite.y);
      if (!this.remoteActions.has(accountId)) {
        this.playCharacterAnimation(sprite, accountId, target.moving ? "walk" : "idle", target.direction);
      }
    }

    if (time - this.lastNetworkAt >= 1000 / WORLD_CONFIG.networkHz) {
      this.lastNetworkAt = time;
      this.callbacks.onMove({ scene: this.currentScene, x: this.localPlayer.x, y: this.localPlayer.y, direction: this.direction, moving });
    }
    this.refreshInteractionHint();
    if (this.debugEnabled && time - this.lastDebugAt > 250) {
      this.lastDebugAt = time;
      this.callbacks.onDebug({ fps: Math.round(this.game.loop.actualFps), x: Math.round(this.localPlayer.x), y: Math.round(this.localPlayer.y), scene: this.currentScene });
    }
  }

  setTouchDirection(x: number, y: number) {
    if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001) this.clearTapMoveTarget();
    this.touchDirection = { x, y };
  }

  setTapToMoveEnabled(enabled: boolean) {
    this.tapToMoveEnabled = enabled;
    this.touchDirection = { x: 0, y: 0 };
    if (!enabled) this.clearTapMoveTarget();
  }

  setCameraZoom(zoom: number): WorldCameraZoomInfo {
    const nextLevel = Number.isFinite(zoom)
      ? clampWorldCameraLevel(Number(zoom))
      : this.requestedCameraZoom;

    // O React pode enviar o mesmo nível duas vezes (handler + persistência).
    // Se uma transição desse mesmo nível já estiver acontecendo, não a
    // reiniciamos do zero; isso evita aquele pequeno "tranco" no slider.
    if (nextLevel === this.requestedCameraZoom && this.cameraZoomTween) {
      return this.calculateCameraZoomInfo();
    }

    this.requestedCameraZoom = nextLevel;
    return this.applyCameraZoom(true);
  }

  getCameraZoomInfo(): WorldCameraZoomInfo {
    return this.calculateCameraZoomInfo();
  }

  handleViewportResize(width: number, height: number, topInset = 0) {
    this.viewportWidth = Math.max(1, Number(width));
    this.viewportHeight = Math.max(1, Number(height));
    this.viewportTopInset = Phaser.Math.Clamp(Number(topInset) || 0, 0, this.viewportHeight * 0.45);
    if (this.tilemap) this.applyCameraZoom(false);
  }

  updatePlayers(players: WorldPlayerState[]) {
    this.players = players;
    for (const state of players) {
      if (state.accountId === this.accountId) continue;
      let sprite = this.remotePlayers.get(state.accountId);
      if (!sprite) {
        const initial = this.getCharacterAnimationStart(state.accountId, "idle", state.direction);
        const config = CHARACTER_CONFIGS[state.accountId];
        if (initial && this.textures.exists(initial.textureKey)) {
          sprite = this.add.sprite(state.x, state.y, initial.textureKey, initial.frame).setScale(config.scale).setOrigin(initial.origin.x, initial.origin.y).setFlipX(initial.flipX);
          this.remotePlayers.set(state.accountId, sprite);
        }
      }
      sprite?.setData("target", state);
    }
    for (const [id, sprite] of this.remotePlayers) if (!players.some((item) => item.accountId === id)) { sprite.destroy(); this.remotePlayers.delete(id); }
  }

  updateDecorations(decorations: WorldDecoration[]) {
    this.decorations = decorations;
    if (this.localPlayer) this.renderDecorations();
  }

  updateTerrain(terrain: WorldTerrainCell[]) {
    const previous = this.terrain;
    this.terrain = terrain;
    this.indexTerrain();
    if (!this.tilemap) return;
    const dirty = new Set<string>();
    const previousByCell = new Map(previous.filter((cell) => cell.scene === this.currentScene).map((cell) => [`${cell.gridX}:${cell.gridY}`, cell]));
    const nextByCell = new Map(terrain.filter((cell) => cell.scene === this.currentScene).map((cell) => [`${cell.gridX}:${cell.gridY}`, cell]));
    for (const key of new Set([...previousByCell.keys(), ...nextByCell.keys()])) {
      if (previousByCell.get(key)?.terrainId === nextByCell.get(key)?.terrainId) continue;
      const [gridX, gridY] = key.split(":").map(Number);
      dirty.add(key);
      for (const neighbor of NEIGHBOR_OFFSETS) dirty.add(`${gridX + neighbor.dx}:${gridY + neighbor.dy}`);
    }
    for (const key of dirty) {
      const [x, y] = key.split(":").map(Number);
      this.renderTerrainCell(x, y);
    }
    this.syncTerrainCollisions();
  }

  playDecorationEffect(event: WorldDecorationEffectEvent) {
    if (event.scene !== this.currentScene) return;
    const definition = getDecorationDefinition(event.itemId);
    if (!definition || isTerrainDefinition(definition) || definition.kind === "restore-terrain") return;
    const x = (event.gridX + definition.footprint.width / 2) * TILE_SIZE;
    const y = (event.gridY + definition.footprint.height) * TILE_SIZE - 8;
    const effect = this.add.sprite(x, y, "world-decoration-place-effect", 0).setDepth(100000);
    this.effectSprites.add(effect);
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.effectSprites.delete(effect);
      effect.destroy();
    });
    effect.play("world-decoration-place");
  }

  playRemoteAction(event: WorldPlayerActionEvent) {
    if (event.accountId === this.accountId) return;
    const sprite = this.remotePlayers.get(event.accountId);
    if (!sprite) return;
    const target = sprite.getData("target") as WorldPlayerState | undefined;
    if (!target || target.scene !== this.currentScene) return;
    const config = CHARACTER_CONFIGS[event.accountId];
    const action = config.animations[event.action];
    if (!action?.directions[event.direction]) return;

    const active = { action: event.action, direction: event.direction };
    this.remoteActions.set(event.accountId, active);
    const played = this.playCharacterAnimation(sprite, event.accountId, event.action, event.direction);
    if (!played) { this.remoteActions.delete(event.accountId); return; }

    const expectedKey = `${event.accountId}-${event.action}-${event.direction}`;
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation: Phaser.Animations.Animation) => {
      if (animation.key !== expectedKey) return;
      if (this.remoteActions.get(event.accountId) !== active) return;
      this.remoteActions.delete(event.accountId);
      const latest = sprite.getData("target") as WorldPlayerState | undefined;
      if (!latest || latest.scene !== this.currentScene) return;
      this.playCharacterAnimation(sprite, event.accountId, latest.moving ? "walk" : "idle", latest.direction);
    });
  }

  setDecorationTool(tool: DecorationTool) {
    this.clearTapMoveTarget();
    this.decorationTool = tool;
    this.movingDecoration = null;
    this.resetPlacementInput();
    this.destroyPreview();
    if (tool?.kind === "place") {
      const definition = getDecorationDefinition(tool.itemId);
      if (definition) this.preview = this.createCatalogPreview(definition).setAlpha(0.65).setDepth(99999).setVisible(false);
    }
    this.callbacks.onHint(null);
  }

  cancelDecoration() { this.decorationTool = null; this.movingDecoration = null; this.resetPlacementInput(); this.destroyPreview(); this.callbacks.onHint(null); }

  interact() {
    if (this.changingScene || !this.localPlayer) return;
    const nearest = this.nearestInteraction();
    if (!nearest || Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, nearest.x, nearest.y) > 52) return;
    this.clearTapMoveTarget();
    this.changingScene = true;
    void this.callbacks.onChangeScene(nearest.target).then((result) => {
      this.changingScene = false;
      if (!result.ok || !result.player) { this.callbacks.onNotice(result.error ?? "Não foi possível atravessar a porta."); return; }
      this.switchMap(result.player);
    });
  }

  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
    this.debugGrid?.setVisible(this.debugEnabled);
    this.physics.world.drawDebug = this.debugEnabled;
    if (this.debugEnabled && !this.physics.world.debugGraphic) this.physics.world.createDebugGraphic();
    this.physics.world.debugGraphic?.setVisible(this.debugEnabled);
    if (!this.debugEnabled) this.callbacks.onDebug(null);
  }

  cleanup() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopCameraZoomTransition();
    this.input.off("pointermove", this.handlePointerMove, this);
    this.input.off("pointerdown", this.handlePointerDown, this);
    this.input.off("pointerup", this.handlePointerUp, this);
    this.input.off("pointerupoutside", this.handlePointerUpOutside, this);
    this.input.off("gameout", this.handleGameOut, this);
    this.game.canvas.removeEventListener("pointerdown", this.handleDomPointerDown);
    window.removeEventListener("pointermove", this.handleDomPointerMove);
    window.removeEventListener("pointerup", this.handleDomPointerUp);
    window.removeEventListener("pointercancel", this.handleDomPointerCancel);
    this.game.canvas.removeEventListener("lostpointercapture", this.handleDomLostPointerCapture);
    this.resetPlacementInput();
    this.input.keyboard?.off("keydown-E", this.handleInteractKey);
    this.input.keyboard?.off("keydown-ESC", this.handleCancelKey);
    this.input.keyboard?.off(`keydown-${WORLD_CONFIG.debugKey}`, this.handleDebugKey);
    this.input.keyboard?.off("keydown", this.handleActionDebugKey, this);
    this.cameras.main.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.handleCameraFollowUpdate, this);
    this.clearTapMoveTarget();
    this.remoteActions.clear();
    this.callbacks.onDebug(null);
  }

  private handleActionDebugKey(event: KeyboardEvent) {
    const debugActions: Record<string, string> = {
      "1": "mining",
      "2": "chopping",
      "3": "hoeing",
      "4": "watering",
      "5": "placing",
      "6": "pickup",
    };

    const action = debugActions[event.key];
    if (!action) return;
    event.preventDefault();
    this.startLocalAction(action);
  }

  private startLocalAction(animationName: string) {
    if (!this.localPlayer || this.currentAction) return false;
    const animation = CHARACTER_CONFIGS[this.accountId].animations[animationName];
    if (!animation) {
      console.warn(`[Nosso Mundo] Ação não cadastrada: ${animationName}`);
      return false;
    }

    this.clearTapMoveTarget();
    this.localPlayer.body.setVelocity(0, 0);
    const localVisual = this.localPlayerVisual ?? this.localPlayer;
    const played = this.playCharacterAnimation(localVisual, this.accountId, animationName, this.direction);
    if (!played) return false;

    this.currentAction = animationName;
    this.callbacks.onAction(animationName, this.direction);
    const expectedKey = `${this.accountId}-${animationName}-${this.direction}`;

    localVisual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation: Phaser.Animations.Animation) => {
      if (animation.key !== expectedKey || this.currentAction !== animationName) return;
      this.currentAction = null;
      const latestVisual = this.localPlayerVisual ?? this.localPlayer;
      if (latestVisual) this.playCharacterAnimation(latestVisual, this.accountId, "idle", this.direction);
    });

    return true;
  }

  private movementInput(time: number) {
    if (this.decorationTool) return { x: 0, y: 0 };

    let x = this.touchDirection.x;
    let y = this.touchDirection.y;
    if (this.cursors?.left.isDown || this.keys?.A.isDown) x -= 1;
    if (this.cursors?.right.isDown || this.keys?.D.isDown) x += 1;
    if (this.cursors?.up.isDown || this.keys?.W.isDown) y -= 1;
    if (this.cursors?.down.isDown || this.keys?.S.isDown) y += 1;

    const manualLength = Math.hypot(x, y);
    if (manualLength > 0.001) {
      this.clearTapMoveTarget();
      return manualLength > 1 ? { x: x / manualLength, y: y / manualLength } : { x, y };
    }

    return this.tapMovementInput(time);
  }

  private tapMovementInput(time: number) {
    if (!this.tapToMoveEnabled || !this.tapMoveTarget || !this.localPlayer || this.changingScene) return { x: 0, y: 0 };

    const dx = this.tapMoveTarget.x - this.localPlayer.x;
    const dy = this.tapMoveTarget.y - this.localPlayer.y;
    const distance = Math.hypot(dx, dy);

    if (this.tapMoveTarget.interaction && distance <= TAP_INTERACTION_DISTANCE) {
      this.clearTapMoveTarget();
      this.localPlayer.body.setVelocity(0, 0);
      this.interact();
      return { x: 0, y: 0 };
    }

    if (distance <= TAP_STOP_DISTANCE) {
      this.clearTapMoveTarget();
      return { x: 0, y: 0 };
    }

    const movedSinceProgress = Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, this.tapLastX, this.tapLastY);
    if (movedSinceProgress >= 1.5) {
      this.tapLastX = this.localPlayer.x;
      this.tapLastY = this.localPlayer.y;
      this.tapLastProgressAt = time;
    } else if (time - this.tapLastProgressAt >= TAP_STUCK_TIMEOUT_MS) {
      this.clearTapMoveTarget();
      this.callbacks.onNotice("O caminho até esse ponto está bloqueado.");
      return { x: 0, y: 0 };
    }

    return distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 0, y: 0 };
  }

  private setTapMoveTarget(worldX: number, worldY: number) {
    if (!this.tapToMoveEnabled || !this.localPlayer || this.decorationTool || this.currentAction || this.changingScene) return;

    const interaction = this.interactionAt(worldX, worldY);
    const bounds = this.physics.world.bounds;
    const padding = 4;
    const x = interaction
      ? interaction.x
      : Phaser.Math.Clamp(worldX, bounds.left + padding, bounds.right - padding);
    const y = interaction
      ? interaction.y
      : Phaser.Math.Clamp(worldY, bounds.top + padding, bounds.bottom - padding);

    this.tapMoveTarget = { x, y, interaction: interaction ?? undefined };
    this.tapLastX = this.localPlayer.x;
    this.tapLastY = this.localPlayer.y;
    this.tapLastProgressAt = this.time.now;
  }

  private clearTapMoveTarget() {
    this.tapMoveTarget = null;
    this.tapLastProgressAt = 0;
  }

  private interactionAt(worldX: number, worldY: number) {
    return this.interactions.find((item) => {
      const width = Math.max(item.width, WORLD_CONFIG.tileSize);
      const height = Math.max(item.height, WORLD_CONFIG.tileSize);
      const left = item.width > 0 ? item.left : item.x - width / 2;
      const top = item.height > 0 ? item.top : item.y - height / 2;
      return worldX >= left - TAP_INTERACTION_HIT_PADDING
        && worldX <= left + width + TAP_INTERACTION_HIT_PADDING
        && worldY >= top - TAP_INTERACTION_HIT_PADDING
        && worldY <= top + height + TAP_INTERACTION_HIT_PADDING;
    }) ?? null;
  }

  private handleCameraFollowUpdate(camera: Phaser.Cameras.Scene2D.Camera) {
    // O mapa inteiro permanece em subpixel para que o scroll diagonal seja suave.
    // Apenas o personagem local é encaixado na grade FINAL da tela. Isso evita:
    // - ghost/jitter no personagem durante o follow;
    // - wobble de árvores/objetos ao mover a câmera em diagonal.
    this.syncLocalPlayerVisualToCamera(camera);
  }

  private syncLocalPlayerVisualToCamera(camera: Phaser.Cameras.Scene2D.Camera) {
    if (!this.localPlayer || !this.localPlayerVisual) return;

    const zoomX = Math.max(0.01, camera.zoomX);
    const zoomY = Math.max(0.01, camera.zoomY);

    // Converte a posição física para screen-space. Como o canvas agora usa
    // Scale.FIT, também levamos em conta a escala CSS FINAL do canvas e
    // arredondamos só o avatar nessa grade final. O mundo não é arredondado.
    const originX = camera.width * camera.originX;
    const originY = camera.height * camera.originY;
    const screenX = camera.x + originX + (this.localPlayer.x - camera.scrollX - originX) * zoomX;
    const screenY = camera.y + originY + (this.localPlayer.y - camera.scrollY - originY) * zoomY;
    const displayScaleX = Math.max(0.0001, Number(this.scale.displaySize?.width ?? camera.width) / Math.max(1, camera.width));
    const displayScaleY = Math.max(0.0001, Number(this.scale.displaySize?.height ?? camera.height) / Math.max(1, camera.height));
    const snappedScreenX = Math.round(screenX * displayScaleX) / displayScaleX;
    const snappedScreenY = Math.round(screenY * displayScaleY) / displayScaleY;

    this.localPlayerVisual.setPosition(
      camera.scrollX + originX + (snappedScreenX - camera.x - originX) / zoomX,
      camera.scrollY + originY + (snappedScreenY - camera.y - originY) / zoomY,
    );
    this.localPlayerVisual.setDepth(this.localPlayer.y);
  }

  private updateCameraLerpForFrame(delta: number) {
    const camera = this.cameras?.main;
    if (!camera) return;

    // Phaser 3.90 aplica o lerp uma vez por frame. Sem compensação, 120/165 Hz
    // seguem o alvo muito mais rápido que 60 Hz. Normalizamos para a mesma
    // resposta temporal de WORLD_CONFIG.camera.lerpX/Y em 60 Hz.
    const safeDelta = Phaser.Math.Clamp(
      Number.isFinite(delta) && delta > 0 ? delta : 1000 / 60,
      1000 / 240,
      1000 / 20,
    );
    const frameFactor = safeDelta / (1000 / 60);
    const lerpX = 1 - Math.pow(1 - WORLD_CONFIG.camera.lerpX, frameFactor);
    const lerpY = 1 - Math.pow(1 - WORLD_CONFIG.camera.lerpY, frameFactor);
    camera.setLerp(lerpX, lerpY);
  }

  private getViewportSize() {
    const parent = this.game?.canvas?.parentElement;
    return {
      width: Math.max(1, this.viewportWidth || Number(parent?.clientWidth ?? 0) || Number(this.scale?.parentSize?.width ?? 0) || 1),
      height: Math.max(1, this.viewportHeight || Number(parent?.clientHeight ?? 0) || Number(this.scale?.parentSize?.height ?? 0) || 1),
    };
  }

  private calculateCameraZoomInfo(): WorldCameraZoomInfo {
    return {
      zoom: clampWorldCameraLevel(this.requestedCameraZoom),
      min: WORLD_CAMERA_LEVEL_MIN,
      max: WORLD_CAMERA_LEVEL_MAX,
    };
  }

  private applyCameraZoom(animate = false) {
    const info = this.calculateCameraZoomInfo();
    const viewport = this.getViewportSize();
    const layout = getWorldCameraLayout(info.zoom, viewport.width, viewport.height);
    const camera = this.cameras?.main;

    this.requestedCameraZoom = layout.level;

    if (!camera) {
      this.callbacks.onCameraZoomChange(info);
      return info;
    }

    if (!animate || !this.tilemap || this.destroyed) {
      this.stopCameraZoomTransition();
      this.commitCameraLayout(layout, false);
      this.callbacks.onCameraZoomChange(info);
      return info;
    }

    const currentVisibleHeight = camera.height / Math.max(0.01, camera.zoomY);
    const targetVisibleHeight = Math.max(1, layout.visibleWorldHeight);

    // Se o nível já está visualmente no alvo, apenas consolidamos os valores
    // inteiros finais. Evita criar tween sem movimento.
    if (Math.abs(currentVisibleHeight - targetVisibleHeight) < 0.05) {
      this.stopCameraZoomTransition();
      this.commitCameraLayout(layout, true);
      this.callbacks.onCameraZoomChange(info);
      return info;
    }

    this.stopCameraZoomTransition();

    // Durante a animação NÃO redimensionamos o canvas. Mantemos a resolução
    // virtual atual e alteramos somente a lente da câmera. Assim a troca
    // parece um zoom de verdade, em vez de a tela "encolher/aumentar".
    // No fim, trocamos para a resolução/zoom inteiro do nível novo em um ponto
    // matematicamente equivalente, portanto sem salto visual.
    this.cameraZoomTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: CAMERA_ZOOM_TRANSITION_MS,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const progress = Phaser.Math.Clamp(Number(tween.getValue()) || 0, 0, 1);
        // Interpolamos o CAMPO DE VISÃO, não o fator de zoom bruto. Isso faz
        // cada pedaço da animação avançar a distância visual de forma uniforme.
        const visibleHeight = Phaser.Math.Linear(currentVisibleHeight, targetVisibleHeight, progress);
        camera.setZoom(Math.max(0.01, camera.height / Math.max(1, visibleHeight)));
        this.updateCameraFollowLayout();
        this.updateCameraBoundsForCurrentZoom();
        this.syncLocalPlayerVisualToCamera(camera);
      },
      onComplete: () => {
        this.cameraZoomTween = undefined;
        this.commitCameraLayout(layout, true);
      },
    });

    this.callbacks.onCameraZoomChange(info);
    return info;
  }

  private stopCameraZoomTransition() {
    if (!this.cameraZoomTween) return;
    this.cameraZoomTween.stop();
    this.cameraZoomTween = undefined;
  }

  private commitCameraLayout(
    layout: ReturnType<typeof getWorldCameraLayout>,
    preserveViewCenter: boolean,
  ) {
    const camera = this.cameras?.main;
    if (!camera) return;

    // Guarda o ponto do mundo que está no centro da tela. Quando a resolução
    // virtual muda no final da animação, restauramos exatamente esse ponto,
    // impedindo o "pulo" que antes parecia um resize da tela.
    const center = preserveViewCenter
      ? { x: camera.midPoint.x, y: camera.midPoint.y }
      : null;

    if (this.scale.width !== layout.gameWidth || this.scale.height !== layout.gameHeight) {
      this.scale.setGameSize(layout.gameWidth, layout.gameHeight);
    }

    camera.setZoom(layout.renderZoom);

    if (center) camera.centerOn(center.x, center.y);

    this.updateCameraFollowLayout();
    this.updateCameraBoundsForCurrentZoom();
    this.syncLocalPlayerVisualToCamera(camera);
  }

  private getWorldUnitsPerCssPixel() {
    const camera = this.cameras?.main;
    const viewportHeight = Math.max(1, this.getViewportSize().height);
    if (!camera) return 1;
    const visibleWorldHeight = camera.height / Math.max(0.01, camera.zoomY);
    return visibleWorldHeight / viewportHeight;
  }

  private shouldProtectTopHud() {
    // A topbar também cobre parte útil do mundo no desktop. Antes havia um
    // corte por proporção (10% da tela), então em 1080p ela era ignorada.
    // Usamos agora a medida REAL do HUD em qualquer dispositivo.
    return this.viewportTopInset >= 36;
  }

  private getHudFollowOffsetWorld() {
    if (!this.shouldProtectTopHud()) return 0;
    const viewportHeight = Math.max(1, this.getViewportSize().height);
    const offsetCss = Math.min(this.viewportTopInset * 0.55, viewportHeight * 0.16);
    return offsetCss * this.getWorldUnitsPerCssPixel();
  }

  private getHudTopPaddingWorld() {
    if (!this.shouldProtectTopHud()) return 0;
    const viewportHeight = Math.max(1, this.getViewportSize().height);
    const paddingCss = Math.min(this.viewportTopInset + 12, viewportHeight * 0.3);
    return paddingCss * this.getWorldUnitsPerCssPixel();
  }

  private updateCameraFollowLayout() {
    const camera = this.cameras?.main;
    if (!camera) return;

    // A deadzone continua em unidades do mundo, como no comportamento original.
    // Não a escalamos junto com a UI/viewport porque isso mudaria a sensação
    // de follow a cada nível de distância.
    const deadzoneWidth = WORLD_CONFIG.camera.deadzoneWidth;
    const deadzoneHeight = WORLD_CONFIG.camera.deadzoneHeight;

    // Alteramos as dimensões diretamente quando a deadzone já existe para não
    // provocar o reposicionamento brusco que setDeadzone faz com follow ativo.
    if (camera.deadzone) {
      camera.deadzone.width = deadzoneWidth;
      camera.deadzone.height = deadzoneHeight;
    } else {
      camera.setDeadzone(deadzoneWidth, deadzoneHeight);
    }

    // Valor positivo é subtraído do alvo pelo Phaser: a câmera olha um pouco
    // acima do personagem e, portanto, o personagem fica mais abaixo na tela.
    camera.setFollowOffset(0, this.getHudFollowOffsetWorld());
  }

  private updateCameraBoundsForCurrentZoom() {
    if (!this.tilemap) return;

    const camera = this.cameras.main;
    const zoomX = Math.max(0.01, camera.zoomX);
    const zoomY = Math.max(0.01, camera.zoomY);
    const visibleWorldWidth = camera.width / zoomX;
    const visibleWorldHeight = camera.height / zoomY;
    const mapWidth = this.tilemap.widthInPixels;
    const mapHeight = this.tilemap.heightInPixels;

    // Quando o mapa é menor que a visão, centralizamos dentro de bounds
    // virtuais. No mobile também liberamos espaço ACIMA do mapa equivalente
    // ao HUD, para a câmera poder subir mesmo quando o jogador chega ao limite
    // norte (sem isso o clamp mantém o personagem escondido sob a topbar).
    const baseWidth = Math.max(mapWidth, visibleWorldWidth);
    const baseHeight = Math.max(mapHeight, visibleWorldHeight);
    const baseX = (mapWidth - baseWidth) / 2;
    const baseY = (mapHeight - baseHeight) / 2;
    const baseBottom = baseY + baseHeight;
    const topPadding = this.getHudTopPaddingWorld();
    const boundsY = Math.min(baseY, -topPadding);
    const boundsHeight = baseBottom - boundsY;

    camera.setBounds(baseX, boundsY, baseWidth, boundsHeight);
  }

  private createAnimations() {
    for (const [accountId, config] of Object.entries(CHARACTER_CONFIGS) as Array<[AccountId, typeof CHARACTER_CONFIGS[AccountId]]>) {
      for (const [animationName, animation] of Object.entries(config.animations)) {
        const sheet = config.sheets[animation.sheet];
        if (!sheet) {
          console.warn(`[Nosso Mundo] A animação ${animationName} de ${accountId} usa a sheet inexistente: ${animation.sheet}`);
          continue;
        }

        for (const [direction, directionConfig] of Object.entries(animation.directions) as Array<[WorldDirection, NonNullable<typeof animation.directions[WorldDirection]>]>) {
          if (!directionConfig || directionConfig.frames.length === 0) continue;
          const key = `${accountId}-${animationName}-${direction}`;
          if (this.anims.exists(key)) continue;

          this.anims.create({
            key,
            frames: directionConfig.frames.map((frame) => ({ key: sheet.textureKey, frame })),
            frameRate: animation.fps,
            repeat: animation.repeat,
          });
        }
      }
    }

    if (!this.anims.exists("world-decoration-place")) {
      this.anims.create({
        key: "world-decoration-place",
        frames: this.anims.generateFrameNumbers("world-decoration-place-effect", { start: 0, end: 3 }),
        frameRate: 14,
        repeat: 0,
      });
    }
  }

  private playCharacterAnimation(
    sprite: Phaser.GameObjects.Sprite,
    accountId: AccountId,
    animationName: string,
    direction: WorldDirection,
  ) {
    const config = CHARACTER_CONFIGS[accountId];
    const animation = config.animations[animationName];
    const directionConfig = animation?.directions[direction];
    const sheet = animation ? config.sheets[animation.sheet] : undefined;

    if (!animation || !directionConfig || !sheet) {
      console.warn(`[Nosso Mundo] Animação inválida: ${accountId}/${animationName}/${direction}`);
      return false;
    }

    const key = `${accountId}-${animationName}-${direction}`;
    if (!this.anims.exists(key)) return false;

    sprite.setOrigin(sheet.origin.x, sheet.origin.y);
    sprite.setFlipX(Boolean(directionConfig.flipX));
    sprite.anims.play(key, true);
    return true;
  }

  private getCharacterAnimationStart(accountId: AccountId, animationName: string, direction: WorldDirection) {
    const config = CHARACTER_CONFIGS[accountId];
    const animation = config.animations[animationName];
    const directionConfig = animation?.directions[direction];
    const sheet = animation ? config.sheets[animation.sheet] : undefined;
    if (!animation || !directionConfig || !sheet || directionConfig.frames.length === 0) return null;

    return {
      textureKey: sheet.textureKey,
      frame: directionConfig.frames[0],
      flipX: Boolean(directionConfig.flipX),
      origin: sheet.origin,
    };
  }

  private switchMap(state: WorldPlayerState) {
    this.currentAction = null;
    this.clearTapMoveTarget();
    this.remoteActions.clear();
    this.clearMap();
    this.currentScene = state.scene;
    const mapConfig = WORLD_CONFIG.scenes[state.scene];
    this.tilemap = this.make.tilemap({ key: mapConfig.mapKey });
    const mapTilesets = this.linkMapTilesets();
    if (mapTilesets.length === 0) {
      this.callbacks.onError("Nenhum tileset do Tiled pôde ser ligado às imagens do jogo.");
      return;
    }

    this.groundLayer = this.createMapTileLayer("Ground", mapTilesets, 0);
    this.groundDetailsLayer = this.createMapTileLayer("GroundDetails", mapTilesets, 0.1);
    this.groundDetailsTopLayer = this.createMapTileLayer("GroundDetailsTop", mapTilesets, 0.2);
    this.dynamicGroundLayer = this.tilemap.createBlankLayer("DynamicGround", mapTilesets, 0, 0, this.tilemap.width, this.tilemap.height, TILE_SIZE, TILE_SIZE) ?? undefined;
    this.dynamicGroundDetailsLayer = this.tilemap.createBlankLayer("DynamicGroundDetails", mapTilesets, 0, 0, this.tilemap.width, this.tilemap.height, TILE_SIZE, TILE_SIZE) ?? undefined;
    this.dynamicGroundDetailsTopLayer = this.tilemap.createBlankLayer("DynamicGroundDetailsTop", mapTilesets, 0, 0, this.tilemap.width, this.tilemap.height, TILE_SIZE, TILE_SIZE) ?? undefined;
    this.dynamicGroundLayer?.setDepth(0.05);
    this.dynamicGroundDetailsLayer?.setDepth(0.15);
    this.dynamicGroundDetailsTopLayer?.setDepth(0.25);
    this.renderAllTerrain();

    const legacyGroundDetails = this.tilemap.getObjectLayer("GroundDetailsLegacy")
      ?? this.tilemap.getObjectLayer("GroundDetails");
    if (legacyGroundDetails?.visible !== false) {
      this.renderLegacyGroundDetails(legacyGroundDetails?.objects as TiledObject[] | undefined);
    }
    this.renderMapObjects(this.tilemap.getObjectLayer("Objects")?.objects as TiledObject[] | undefined, 0);
    this.renderMapObjects(this.tilemap.getObjectLayer("AbovePlayer")?.objects as TiledObject[] | undefined, 2);
    this.renderCollisions(this.tilemap.getObjectLayer("Collisions")?.objects as TiledObject[] | undefined);
    this.readInteractions(this.tilemap.getObjectLayer("Interactions")?.objects as TiledObject[] | undefined);

    const config = CHARACTER_CONFIGS[this.accountId];
    const initial = this.getCharacterAnimationStart(this.accountId, "idle", state.direction);
    if (!initial) { this.callbacks.onError("Não foi possível encontrar a animação idle do personagem."); return; }

    this.localPlayer = this.physics.add.sprite(state.x, state.y, initial.textureKey, initial.frame) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.localPlayer.setScale(config.scale).setOrigin(initial.origin.x, initial.origin.y).setFlipX(initial.flipX);
    this.localPlayer.body.setSize(config.collision.width, config.collision.height).setOffset(config.collision.offsetX, config.collision.offsetY);
    this.localPlayer.setCollideWorldBounds(true);
    // O sprite físico continua sendo a fonte real de posição/colisão e o alvo da câmera,
    // mas fica invisível. Um sprite visual separado é desenhado com snap apenas no avatar.
    this.localPlayer.setVisible(false);
    this.localPlayerVisual = this.add.sprite(state.x, state.y, initial.textureKey, initial.frame)
      .setScale(config.scale)
      .setOrigin(initial.origin.x, initial.origin.y)
      .setFlipX(initial.flipX)
      .setDepth(state.y);
    this.direction = state.direction;
    for (const obstacle of this.fixedObstacles) this.fixedColliders.push(this.physics.add.collider(this.localPlayer, obstacle));
    this.syncTerrainCollisions();
    this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.applyCameraZoom();

    // O follow usa subpixel real. Não arredondamos câmera nem mundo inteiro.
    // A distância visual usa resolução virtual + zoom inteiro.
    this.cameras.main.startFollow(
      this.localPlayer,
      false,
      WORLD_CONFIG.camera.lerpX,
      WORLD_CONFIG.camera.lerpY,
      0,
      this.getHudFollowOffsetWorld(),
    );
    this.updateCameraFollowLayout();
    this.updateCameraBoundsForCurrentZoom();
    this.renderDecorations();
    this.updatePlayers(this.players);
    this.createDebugGrid();
  }

  private clearMap() {
    this.stopCameraZoomTransition();
    this.destroyPreview();
    this.fixedColliders.forEach((collider) => collider.destroy());
    this.decorationColliders.forEach((collider) => collider.destroy());
    for (const entry of this.terrainObstacles.values()) {
      entry.collider?.destroy();
      entry.obstacle.destroy();
    }
    this.terrainObstacles.clear();
    this.fixedColliders = [];
    this.decorationColliders = [];
    this.dynamicGroundDetailsTopLayer?.destroy();
    this.dynamicGroundDetailsLayer?.destroy();
    this.dynamicGroundLayer?.destroy();
    this.dynamicGroundDetailsTopLayer = undefined;
    this.dynamicGroundDetailsLayer = undefined;
    this.dynamicGroundLayer = undefined;
    this.groundDetailsTopLayer?.destroy();
    this.groundDetailsLayer?.destroy();
    this.groundLayer?.destroy();
    this.groundDetailsTopLayer = undefined;
    this.groundDetailsLayer = undefined;
    this.groundLayer = undefined;
    this.tilemap?.destroy();
    this.cameras?.main?.stopFollow();
    this.localPlayerVisual?.destroy();
    this.localPlayerVisual = undefined;
    this.localPlayer?.destroy();
    for (const sprite of this.remotePlayers.values()) sprite.destroy();
    this.remotePlayers.clear();
    this.remoteActions.clear();
    for (const effect of this.effectSprites) effect.destroy();
    this.effectSprites.clear();
    [...this.mapVisuals, ...this.fixedObstacles, ...this.decorationVisuals, ...this.decorationObstacles].forEach((item) => item.destroy());
    this.mapVisuals = [];
    this.fixedObstacles = [];
    this.decorationVisuals = [];
    this.decorationObstacles = [];
    this.decorationEntries.clear();
    this.interactions = [];
    this.debugGrid?.destroy();
    this.debugGrid = undefined;
  }

  private linkMapTilesets() {
    if (!this.tilemap) return [] as Phaser.Tilemaps.Tileset[];
    const linked: Phaser.Tilemaps.Tileset[] = [];
    const names = this.tilemap.tilesets.map((tileset) => tileset.name);

    for (const name of names) {
      const asset = getWorldTilesetAsset(name);
      if (!asset) {
        console.warn(`[Nosso Mundo] Tileset do Tiled sem cadastro no jogo: ${name}`);
        continue;
      }

      const tileset = this.tilemap.addTilesetImage(
        name,
        asset.textureKey,
        asset.tileWidth,
        asset.tileHeight,
        asset.margin,
        asset.spacing,
      );
      if (tileset) linked.push(tileset);
    }

    return linked;
  }

  private createMapTileLayer(name: string, tilesets: Phaser.Tilemaps.Tileset[], depth: number) {
    if (!this.tilemap?.layers.some((layer) => layer.name === name)) return undefined;
    const layer = this.tilemap.createLayer(name, tilesets, 0, 0) ?? undefined;
    layer?.setDepth(depth);
    return layer;
  }

  private renderLegacyGroundDetails(objects: TiledObject[] | undefined) {
    const presets = {
      water: { tileset: "water", defaultFrame: 0, depth: 0.2, alpha: 1 },
      path: { tileset: "paths", defaultFrame: 0, depth: 0.24, alpha: 1 },
      farm: { tileset: "tilled-dirt", defaultFrame: 55, depth: 0.25, alpha: 1 },
    } as const;

    for (const object of objects ?? []) {
      const kind = String(property(object, "kind") ?? object.name ?? "").toLowerCase();
      const preset = presets[kind as keyof typeof presets];
      if (!preset) continue;
      const asset = getWorldTilesetAsset(preset.tileset);
      if (!asset) continue;

      const requestedFrame = Number(property(object, "frame"));
      const frame = Number.isInteger(requestedFrame) && requestedFrame >= 0 ? requestedFrame : preset.defaultFrame;
      const x = Number(object.x ?? 0);
      const y = Number(object.y ?? 0);
      const width = Number(object.width ?? asset.tileWidth);
      const height = Number(object.height ?? asset.tileHeight);
      const frameName = this.ensureTilesetFrame(asset, frame);
      if (!frameName) {
        console.warn(`[Nosso Mundo] Frame ${frame} inválido em ${preset.tileset}.`);
        continue;
      }

      this.mapVisuals.push(
        this.add.tileSprite(x + width / 2, y + height / 2, width, height, asset.textureKey, frameName)
          .setDepth(preset.depth)
          .setAlpha(preset.alpha),
      );
    }
  }

  private ensureTilesetFrame(asset: WorldTilesetAsset, frame: number) {
    const texture = this.textures.get(asset.textureKey);
    const frameName = `tile-${frame}`;
    if (texture.has(frameName)) return frameName;

    const source = texture.getSourceImage() as { width?: number; height?: number } | undefined;
    const imageWidth = Number(source?.width ?? 0);
    const imageHeight = Number(source?.height ?? 0);
    if (imageWidth <= 0 || imageHeight <= 0) return null;

    const strideX = asset.tileWidth + asset.spacing;
    const strideY = asset.tileHeight + asset.spacing;
    const columns = Math.floor((imageWidth - asset.margin * 2 + asset.spacing) / strideX);
    if (columns <= 0) return null;

    const column = frame % columns;
    const row = Math.floor(frame / columns);
    const cropX = asset.margin + column * strideX;
    const cropY = asset.margin + row * strideY;
    if (cropX + asset.tileWidth > imageWidth || cropY + asset.tileHeight > imageHeight) return null;

    texture.add(frameName, 0, cropX, cropY, asset.tileWidth, asset.tileHeight);
    return frameName;
  }

  private renderMapObjects(objects: TiledObject[] | undefined, depthOffset: number) {
    for (const object of objects ?? []) {
      if (typeof object.gid === "number") {
        this.renderTiledTileObject(object, depthOffset);
        continue;
      }
      this.renderLegacyMapObject(object, depthOffset);
    }
  }

  private renderLegacyMapObject(object: TiledObject, depthOffset: number) {
    const key = String(property(object, "asset") ?? object.type ?? object.name ?? "");
    const asset = WORLD_OBJECT_ASSETS[key];
    if (!asset) return;

    const image = this.createAssetImage(Number(object.x ?? 0), Number(object.y ?? 0), asset);
    const sortOffsetY = Number(property(object, "sortOffsetY") ?? 0);
    image.setDepth(Number(object.y ?? 0) + sortOffsetY + depthOffset);
    this.mapVisuals.push(image);

    if (key === "house") {
      const door = this.createAssetImage(image.x, image.y, WORLD_OBJECT_ASSETS["house-door"]).setDepth(image.y + 1);
      const leftWindow = this.createAssetImage(image.x - 34, image.y - 42, WORLD_OBJECT_ASSETS["house-window"]).setDepth(image.y + 1);
      const rightWindow = this.createAssetImage(image.x + 34, image.y - 42, WORLD_OBJECT_ASSETS["house-window"]).setDepth(image.y + 1);
      this.mapVisuals.push(door, leftWindow, rightWindow);
    }

    const collisionEnabled = property(object, "collision") !== false;
    if (collisionEnabled && asset.collision) {
      this.fixedObstacles.push(
        this.createObstacle(
          image.x + asset.collision.offsetX,
          image.y + asset.collision.offsetY / 2,
          asset.collision.width,
          asset.collision.height,
        ),
      );
    }
  }

  private renderTiledTileObject(object: TiledObject, depthOffset: number) {
    if (!this.tilemap || typeof object.gid !== "number") return;

    const gid = object.gid;
    const tileset = this.tilemap.tilesets.find((item) => item.containsTileIndex(gid));
    if (!tileset) {
      console.warn(`[Nosso Mundo] Tile Object ${object.id} usa GID ${gid}, mas nenhum tileset correspondente foi encontrado.`);
      return;
    }

    const asset = getWorldTilesetAsset(tileset.name);
    if (!asset) {
      console.warn(`[Nosso Mundo] Tile Object usa o tileset "${tileset.name}", mas ele ainda não está cadastrado em tilesetConfig.ts.`);
      return;
    }

    const localFrame = gid - tileset.firstgid;
    const frameName = this.ensureTilesetFrame(asset, localFrame);
    if (!frameName) {
      console.warn(`[Nosso Mundo] Não foi possível recortar o frame ${localFrame} do tileset ${tileset.name}.`);
      return;
    }

    const x = Number(object.x ?? 0);
    const y = Number(object.y ?? 0);
    const width = Math.abs(Number(object.width ?? asset.tileWidth)) || asset.tileWidth;
    const height = Math.abs(Number(object.height ?? asset.tileHeight)) || asset.tileHeight;

    const sprite = this.add.sprite(x, y, asset.textureKey, frameName)
      .setOrigin(0, 1)
      .setDisplaySize(width, height)
      .setFlipX(Boolean(object.flippedHorizontal))
      .setFlipY(Boolean(object.flippedVertical))
      .setAngle(Number(object.rotation ?? 0))
      .setVisible(object.visible !== false);

    const sortOffsetY = Number(this.getTiledObjectSetting(object, tileset, gid, "sortOffsetY") ?? 0);
    const extraDepth = Number(this.getTiledObjectSetting(object, tileset, gid, "depthOffset") ?? 0);
    sprite.setDepth(y + sortOffsetY + depthOffset + extraDepth);
    this.mapVisuals.push(sprite);

    this.playTiledObjectAnimation(sprite, object, tileset, asset, gid);

    const collisionEnabled = this.getTiledObjectSetting(object, tileset, gid, "collision") !== false;
    if (collisionEnabled) this.createTiledObjectPresetCollisions(object, tileset, gid, width, height);
  }

  private getTiledObjectSetting(object: TiledObject, tileset: Phaser.Tilemaps.Tileset, gid: number, name: string) {
    const instanceValue = property(object, name);
    if (instanceValue !== undefined) return instanceValue;
    const tileProperties = tileset.getTileProperties(gid) as Record<string, unknown> | undefined;
    return tileProperties?.[name];
  }

  private playTiledObjectAnimation(
    sprite: Phaser.GameObjects.Sprite,
    object: TiledObject,
    tileset: Phaser.Tilemaps.Tileset,
    asset: WorldTilesetAsset,
    gid: number,
  ) {
    const mode = String(
      this.getTiledObjectSetting(object, tileset, gid, "animationMode") ?? ""
    );

    if (!mode) return;

    const startFrame = Number(
      this.getTiledObjectSetting(object, tileset, gid, "animationStart") ?? 0
    );

    const endFrame = Number(
      this.getTiledObjectSetting(object, tileset, gid, "animationEnd") ?? startFrame
    );

    const fps = Math.max(
      1,
      Number(
        this.getTiledObjectSetting(object, tileset, gid, "animationFps") ?? 10
      )
    );

    if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || endFrame < startFrame) {
      console.warn(`[Nosso Mundo] Animação inválida em ${tileset.name}: ${startFrame}-${endFrame}`);
      return;
    }

    const frames: Array<{ key: string; frame: string }> = [];
    for (let frame = startFrame; frame <= endFrame; frame++) {
      const nextFrameName = this.ensureTilesetFrame(asset, frame);
      if (!nextFrameName) {
        console.warn(`[Nosso Mundo] Frame ${frame} não encontrado no tileset ${tileset.name}.`);
        continue;
      }
      frames.push({ key: asset.textureKey, frame: nextFrameName });
    }

    if (frames.length === 0) return;

    const animationKey = `world-object-${tileset.name}-${startFrame}-${endFrame}-${fps}-${mode}`;
    if (!this.anims.exists(animationKey)) {
      this.anims.create({
        key: animationKey,
        frames,
        frameRate: fps,
        repeat: mode === "loop" ? -1 : 0,
      });
    }

    if (mode === "loop") {
      sprite.anims.play(animationKey, true);
      return;
    }

    if (mode !== "ambient") return;

    const idleFrameName = this.ensureTilesetFrame(asset, startFrame);
    if (idleFrameName) sprite.setFrame(idleFrameName);

    const minDelay = Math.max(
      0,
      Number(this.getTiledObjectSetting(object, tileset, gid, "animationMinDelay") ?? 5000)
    );
    const maxDelay = Math.max(
      minDelay,
      Number(this.getTiledObjectSetting(object, tileset, gid, "animationMaxDelay") ?? 15000)
    );

    const scheduleNextAnimation = () => {
      if (!sprite.active) return;
      const delay = Phaser.Math.Between(Math.round(minDelay), Math.round(maxDelay));
      this.time.delayedCall(delay, () => {
        if (!sprite.active) return;
        sprite.anims.play(animationKey, true);
        sprite.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE,
          (animation: Phaser.Animations.Animation) => {
            if (animation.key !== animationKey || !sprite.active) return;
            if (idleFrameName) sprite.setFrame(idleFrameName);
            scheduleNextAnimation();
          },
        );
      });
    };

    scheduleNextAnimation();
  }

  private createTiledObjectPresetCollisions(
    object: TiledObject,
    tileset: Phaser.Tilemaps.Tileset,
    gid: number,
    displayWidth: number,
    displayHeight: number,
  ) {
    const collisionGroup = tileset.getTileCollisionGroup(gid) as { objects?: TiledObject[] } | null;
    const shapes = collisionGroup?.objects ?? [];
    if (shapes.length === 0) return;

    const rotation = Number(object.rotation ?? 0);
    if (rotation !== 0) {
      console.warn(`[Nosso Mundo] Tile Object ${object.id} está rotacionado. Arcade Physics não suporta colisão rotacionada; o preset foi ignorado.`);
      return;
    }

    const baseWidth = Math.max(1, tileset.tileWidth || displayWidth);
    const baseHeight = Math.max(1, tileset.tileHeight || displayHeight);
    const scaleX = displayWidth / baseWidth;
    const scaleY = displayHeight / baseHeight;
    const objectLeft = Number(object.x ?? 0);
    const objectTop = Number(object.y ?? 0) - displayHeight;
    const flipX = Boolean(object.flippedHorizontal);
    const flipY = Boolean(object.flippedVertical);

    for (const shape of shapes) {
      const rawWidth = Number(shape.width ?? 0);
      const rawHeight = Number(shape.height ?? 0);
      if (rawWidth <= 0 || rawHeight <= 0) continue;

      let localX = Number(shape.x ?? 0);
      let localY = Number(shape.y ?? 0);
      if (flipX) localX = baseWidth - localX - rawWidth;
      if (flipY) localY = baseHeight - localY - rawHeight;

      const width = rawWidth * scaleX;
      const height = rawHeight * scaleY;
      const centerX = objectLeft + localX * scaleX + width / 2;
      const centerY = objectTop + localY * scaleY + height / 2;
      this.fixedObstacles.push(this.createObstacle(centerX, centerY, width, height));
    }
  }

  private renderCollisions(objects: TiledObject[] | undefined) {
    for (const object of objects ?? []) {
      const width = Number(object.width ?? 0);
      const height = Number(object.height ?? 0);
      if (width > 0 && height > 0) {
        this.fixedObstacles.push(this.createObstacle(Number(object.x ?? 0) + width / 2, Number(object.y ?? 0) + height / 2, width, height));
      }
    }
  }

  private readInteractions(objects: TiledObject[] | undefined) {
    this.interactions = (objects ?? []).flatMap((object) => {
      const target = property(object, "target");
      if (target !== "exterior" && target !== "house-interior") return [];
      const left = Number(object.x ?? 0);
      const top = Number(object.y ?? 0);
      const width = Number(object.width ?? 0);
      const height = Number(object.height ?? 0);
      return [{
        name: object.name ?? "porta",
        x: left + width / 2,
        y: top + height / 2,
        left,
        top,
        width,
        height,
        target,
      }];
    });
  }

  private baseLayer(name: TerrainCatalogItem["terrainLayer"]) {
    if (name === "Ground") return this.groundLayer;
    if (name === "GroundDetails") return this.groundDetailsLayer;
    return this.groundDetailsTopLayer;
  }

  private dynamicLayer(name: TerrainCatalogItem["terrainLayer"]) {
    if (name === "Ground") return this.dynamicGroundLayer;
    if (name === "GroundDetails") return this.dynamicGroundDetailsLayer;
    return this.dynamicGroundDetailsTopLayer;
  }

  private terrainCellAt(gridX: number, gridY: number) {
    return this.terrainByCell.get(`${this.currentScene}:${gridX}:${gridY}`);
  }

  private indexTerrain() {
    this.terrainByCell = new Map(this.terrain.map((cell) => [`${cell.scene}:${cell.gridX}:${cell.gridY}`, cell]));
  }

  private localFrameAt(layer: Phaser.Tilemaps.TilemapLayer | undefined, tilesetName: string, gridX: number, gridY: number) {
    const tile = layer?.getTileAt(gridX, gridY, true);
    if (!tile || tile.index < 0 || !this.tilemap) return null;
    const tileset = this.tilemap.tilesets.find((item) => item.name === tilesetName && item.containsTileIndex(tile.index));
    return tileset ? tile.index - tileset.firstgid : null;
  }

  private baseMatchesTerrain(definition: TerrainCatalogItem, gridX: number, gridY: number) {
    const frame = this.localFrameAt(this.baseLayer(definition.terrainLayer), definition.source.tileset, gridX, gridY);
    if (frame === null) return false;
    return definition.autotile.baseFrames === "all-used-frames" || definition.autotile.baseFrames.includes(frame);
  }

  private terrainMatches(definition: TerrainCatalogItem, gridX: number, gridY: number) {
    const override = this.terrainCellAt(gridX, gridY);
    if (override && getDecorationDefinition(override.terrainId)) return override.terrainId === definition.id;
    return this.baseMatchesTerrain(definition, gridX, gridY);
  }

  private neighborMask(matches: (x: number, y: number) => boolean, gridX: number, gridY: number) {
    let mask = 0;
    for (const neighbor of NEIGHBOR_OFFSETS) if (matches(gridX + neighbor.dx, gridY + neighbor.dy)) mask |= neighbor.bit;
    return mask;
  }

  private putTerrainTile(layer: Phaser.Tilemaps.TilemapLayer | undefined, tilesetName: string, frame: number, gridX: number, gridY: number) {
    if (!layer || !this.tilemap) return;
    const tileset = this.tilemap.tilesets.find((item) => item.name === tilesetName);
    if (!tileset || frame < 0 || frame >= tileset.total) return;
    layer.putTileAt(tileset.firstgid + frame, gridX, gridY, false);
  }

  private renderTerrainCell(gridX: number, gridY: number) {
    if (!this.tilemap || gridX < 0 || gridY < 0 || gridX >= this.tilemap.width || gridY >= this.tilemap.height) return;
    this.dynamicGroundLayer?.removeTileAt(gridX, gridY, false, false);
    this.dynamicGroundDetailsLayer?.removeTileAt(gridX, gridY, false, false);
    this.dynamicGroundDetailsTopLayer?.removeTileAt(gridX, gridY, false, false);

    const cell = this.terrainCellAt(gridX, gridY);
    const definition = cell ? getDecorationDefinition(cell.terrainId) : undefined;
    if (definition && isTerrainDefinition(definition)) {
      const mask = this.neighborMask((x, y) => this.terrainMatches(definition, x, y), gridX, gridY);
      const frame = definition.autotile.mode === "nine-slice" && definition.autotile.frames
        ? resolveNineSliceFrame(mask, definition.autotile.frames)
        : definition.autotile.fallbackFrame;
      this.putTerrainTile(this.dynamicLayer(definition.terrainLayer), definition.source.tileset, frame, gridX, gridY);
    }
  }

  private renderAllTerrain() {
    const dirty = new Set<string>();
    for (const cell of this.terrain) {
      if (cell.scene !== this.currentScene) continue;
      dirty.add(`${cell.gridX}:${cell.gridY}`);
      for (const neighbor of NEIGHBOR_OFFSETS) dirty.add(`${cell.gridX + neighbor.dx}:${cell.gridY + neighbor.dy}`);
    }
    for (const key of dirty) {
      const [x, y] = key.split(":").map(Number);
      this.renderTerrainCell(x, y);
    }
  }

  private syncTerrainCollisions() {
    const wanted = new Set(this.terrain.filter((cell) => cell.scene === this.currentScene && cell.terrainId === "water").map((cell) => `${cell.gridX}:${cell.gridY}`));
    for (const [key, entry] of this.terrainObstacles) {
      if (wanted.has(key)) continue;
      entry.collider?.destroy();
      entry.obstacle.destroy();
      this.terrainObstacles.delete(key);
    }
    for (const key of wanted) {
      if (this.terrainObstacles.has(key)) continue;
      const [gridX, gridY] = key.split(":").map(Number);
      const obstacle = this.createObstacle((gridX + 0.5) * TILE_SIZE, (gridY + 0.5) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      const collider = this.localPlayer ? this.physics.add.collider(this.localPlayer, obstacle) : undefined;
      this.terrainObstacles.set(key, { obstacle, collider });
    }
  }

  private renderDecorations() {
    const visible = this.decorations.filter((item) => item.scene === this.currentScene);
    const wantedIds = new Set(visible.map((item) => item.id));
    for (const [id, entry] of this.decorationEntries) {
      if (wantedIds.has(id)) continue;
      this.destroyDecorationEntry(entry);
      this.decorationEntries.delete(id);
    }

    for (const decoration of visible) {
      const definition = getDecorationDefinition(decoration.itemId);
      if (!definition || (definition.kind !== "object" && definition.kind !== "connected-object")) continue;
      const frame = definition.kind === "connected-object" ? this.connectedFrame(decoration, definition) : definition.source.frame;
      const signature = `${decoration.itemId}:${decoration.gridX}:${decoration.gridY}:${decoration.rotation}:${frame}`;
      const current = this.decorationEntries.get(decoration.id);
      if (current?.signature === signature) continue;
      if (current) this.destroyDecorationEntry(current);
      const image = this.createCatalogSprite(decoration.gridX, decoration.gridY, definition, frame, decoration.rotation);
      if (!image) continue;
      image.setData("decorationId", decoration.id);

      const collisions = definition.kind === "connected-object"
        ? definition.variantCollisions[frame] ?? []
        : definition.collisions;
      const created = this.createCatalogCollisions(decoration, definition, collisions);
      this.decorationEntries.set(decoration.id, { signature, sprite: image, ...created });
    }

    this.decorationVisuals = [...this.decorationEntries.values()].map((entry) => entry.sprite);
    this.decorationObstacles = [...this.decorationEntries.values()].flatMap((entry) => entry.obstacles);
    this.decorationColliders = [...this.decorationEntries.values()].flatMap((entry) => entry.colliders);
  }

  private destroyDecorationEntry(entry: { sprite: Phaser.GameObjects.Sprite; obstacles: Phaser.GameObjects.GameObject[]; colliders: Phaser.Physics.Arcade.Collider[] }) {
    entry.colliders.forEach((collider) => collider.destroy());
    entry.obstacles.forEach((obstacle) => obstacle.destroy());
    entry.sprite.destroy();
  }

  private connectedFrame(decoration: WorldDecoration, definition: ConnectedCatalogItem) {
    let mask = 0;
    const neighbors = [
      { bit: 1, dx: 0, dy: -definition.connectionStep.y },
      { bit: 2, dx: definition.connectionStep.x, dy: 0 },
      { bit: 4, dx: 0, dy: definition.connectionStep.y },
      { bit: 8, dx: -definition.connectionStep.x, dy: 0 },
    ];
    for (const neighbor of neighbors) {
      const connected = this.decorations.some((item) => item.scene === decoration.scene
        && item.id !== decoration.id
        && item.gridX === decoration.gridX + neighbor.dx
        && item.gridY === decoration.gridY + neighbor.dy
        && getDecorationDefinition(item.itemId)?.kind === "connected-object"
        && (getDecorationDefinition(item.itemId) as ConnectedCatalogItem).connectionGroup === definition.connectionGroup);
      if (connected) mask |= neighbor.bit;
    }
    return definition.variants[mask] ?? definition.source.frame;
  }

  private placementRectsFor(
    definition: ObjectCatalogItem | ConnectedCatalogItem,
    gridX: number,
    gridY: number,
    rotation: number,
    id = "__placement-candidate__",
  ) {
    const frame = definition.kind === "connected-object"
      ? this.connectedFrame({ id, itemId: definition.id, scene: this.currentScene, gridX, gridY, rotation, placedBy: this.accountId, updatedAt: 0 }, definition)
      : definition.source.frame;
    const collisions = definition.kind === "connected-object"
      ? definition.variantCollisions[frame] ?? []
      : definition.collisions;
    return decorationPlacementRects(definition, gridX, gridY, rotation, collisions);
  }

  private directlyConnects(
    candidate: ConnectedCatalogItem,
    gridX: number,
    gridY: number,
    other: WorldDecoration,
    otherDefinition: ConnectedCatalogItem,
  ) {
    if (candidate.connectionGroup !== otherDefinition.connectionGroup) return false;
    const dx = Math.abs(gridX - other.gridX);
    const dy = Math.abs(gridY - other.gridY);
    return (dx === candidate.connectionStep.x && dy === 0)
      || (dy === candidate.connectionStep.y && dx === 0);
  }

  private createCatalogSprite(gridX: number, gridY: number, definition: ObjectCatalogItem | ConnectedCatalogItem, frame = definition.source.frame, rotation = 0) {
    const asset = getWorldTilesetAsset(definition.source.tileset);
    if (!asset) return null;
    const frameName = this.ensureTilesetFrame(asset, frame);
    if (!frameName) return null;
    const x = (gridX + definition.footprint.width / 2) * TILE_SIZE + (definition.source.offsetX ?? 0);
    const y = (gridY + definition.footprint.height) * TILE_SIZE + (definition.source.offsetY ?? 0);
    const sprite = this.add.sprite(x, y, asset.textureKey, frameName)
      .setOrigin(0.5, 1)
      .setDisplaySize(definition.source.displayWidth, definition.source.displayHeight)
      .setFlipX(Boolean(definition.source.flipX))
      .setAngle(rotation);
    const depthOffset = definition.depth.sortOffsetY + (definition.depth.behavior === "above-player" ? 2 : 0);
    sprite.setDepth(y + depthOffset);
    return sprite;
  }

  private createCatalogCollisions(
    decoration: WorldDecoration,
    definition: ObjectCatalogItem | ConnectedCatalogItem,
    collisions: readonly { x: number; y: number; width: number; height: number }[],
  ) {
    const obstacles: Phaser.GameObjects.GameObject[] = [];
    const colliders: Phaser.Physics.Arcade.Collider[] = [];
    for (const shape of decorationCollisionRects(definition, decoration.gridX, decoration.gridY, decoration.rotation, collisions)) {
      const obstacle = this.createObstacle(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width, shape.height);
      obstacles.push(obstacle);
      if (this.localPlayer) colliders.push(this.physics.add.collider(this.localPlayer, obstacle));
    }
    return { obstacles, colliders };
  }

  private createAssetImage(x: number, y: number, asset: WorldVisualAsset) {
    const frameName = `crop-${asset.crop.x}-${asset.crop.y}-${asset.crop.width}-${asset.crop.height}`;
    const texture = this.textures.get(asset.texture);
    if (!texture.has(frameName)) texture.add(frameName, 0, asset.crop.x, asset.crop.y, asset.crop.width, asset.crop.height);
    return this.add.image(x, y, asset.texture, frameName).setOrigin(asset.originX, asset.originY).setScale(asset.scaleX ?? asset.scale, asset.scale);
  }

  private createObstacle(x: number, y: number, width: number, height: number) {
    const rect = this.add.rectangle(x, y, width, height, 0xff0000, 0);
    this.physics.add.existing(rect, true);
    return rect;
  }

  private nearestInteraction() {
    if (!this.localPlayer || this.interactions.length === 0) return null;
    return this.interactions.reduce((best, item) =>
      Phaser.Math.Distance.Between(this.localPlayer!.x, this.localPlayer!.y, item.x, item.y)
        < Phaser.Math.Distance.Between(this.localPlayer!.x, this.localPlayer!.y, best.x, best.y)
        ? item
        : best,
    );
  }

  private refreshInteractionHint() {
    if (this.decorationTool || !this.localPlayer) return;
    const nearest = this.nearestInteraction();
    const close = nearest && Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, nearest.x, nearest.y) <= 52;
    this.callbacks.onHint(close ? (this.tapToMoveEnabled ? "Toque na porta para entrar / sair" : "E · Entrar / sair") : null);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.decorationTool || !this.preview) return;
    const active = this.placementInput.active;
    if (active?.source === "dom-touch") return;
    if (active && !this.placementInput.owns("phaser", pointer.id)) return;
    this.updatePreview(pointer);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (this.pointerStartedOverUi(pointer)) return;

    if (pointer.rightButtonDown()) {
      if (this.decorationTool) this.cancelDecoration();
      else this.clearTapMoveTarget();
      return;
    }

    if (!this.decorationTool) {
      if (this.tapToMoveEnabled) this.setTapMoveTarget(pointer.worldX, pointer.worldY);
      return;
    }

    if (!this.placementInput.start("phaser", pointer.id)) return;
    this.updatePreview(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.decorationTool) return;
    const shouldCommit = this.placementInput.finish("phaser", pointer.id, this.pointerEndsOverUi(pointer));
    if (shouldCommit) void this.commitDecorationTool(pointer);
  }

  private handlePointerUpOutside(pointer: Phaser.Input.Pointer) {
    this.placementInput.cancel("phaser", pointer.id);
  }

  private handleGameOut() {
    if (this.placementInput.active?.source === "phaser") this.placementInput.cancel();
  }

  private beginDomTouchPlacement(event: PointerEvent) {
    if (event.pointerType === "mouse" || !event.isPrimary || event.button !== 0 || !this.decorationTool) return;
    if (!this.placementInput.start("dom-touch", event.pointerId)) return;
    try {
      this.game.canvas.setPointerCapture(event.pointerId);
    } catch {
      // O listener de window ainda garante pointerup/cancel fora do canvas.
    }
    const point = this.domPointerPosition(event);
    if (point) this.updatePreview(point);
  }

  private moveDomTouchPlacement(event: PointerEvent) {
    if (!this.placementInput.owns("dom-touch", event.pointerId)) return;
    if (!this.clientPointInsideCanvas(event.clientX, event.clientY)) {
      this.placementInput.cancel("dom-touch", event.pointerId);
      return;
    }
    if (event.cancelable) event.preventDefault();
    const point = this.domPointerPosition(event);
    if (point) this.updatePreview(point);
  }

  private finishDomTouchPlacement(event: PointerEvent) {
    if (!this.decorationTool || !this.placementInput.owns("dom-touch", event.pointerId)) return;
    const point = this.domPointerPosition(event);
    const blocked = !point
      || !this.clientPointInsideCanvas(event.clientX, event.clientY)
      || this.clientPointOverUi(event.clientX, event.clientY);
    const shouldCommit = this.placementInput.finish("dom-touch", event.pointerId, blocked);
    if (event.cancelable) event.preventDefault();
    if (!shouldCommit || !point) return;
    this.updatePreview(point);
    void this.commitDecorationTool(point);
  }

  private cancelDomTouchPlacement(event: PointerEvent) {
    this.placementInput.cancel("dom-touch", event.pointerId);
  }

  private resetPlacementInput() {
    const active = this.placementInput.reset();
    if (active?.source !== "dom-touch") return;
    try {
      if (this.game.canvas.hasPointerCapture(active.id)) this.game.canvas.releasePointerCapture(active.id);
    } catch {
      // O ponteiro pode já ter sido liberado pelo navegador.
    }
  }

  private domPointerPosition(event: PointerEvent): DecorationPointerPosition | null {
    const rect = this.game.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const screenX = (event.clientX - rect.left) * this.scale.width / rect.width;
    const screenY = (event.clientY - rect.top) * this.scale.height / rect.height;
    const world = this.cameras.main.getWorldPoint(screenX, screenY);
    return { worldX: world.x, worldY: world.y, clientX: event.clientX, clientY: event.clientY };
  }

  private clientPointInsideCanvas(clientX: number, clientY: number) {
    const rect = this.game.canvas.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }

  private pointerStartedOverUi(pointer: Phaser.Input.Pointer) {
    const target = pointer.event?.target;
    if (target instanceof Element && this.isWorldUiElement(target)) return true;
    return this.pointerEndsOverUi(pointer);
  }

  private pointerEndsOverUi(pointer: Phaser.Input.Pointer) {
    const point = this.phaserPointerClientPosition(pointer);
    return point ? this.clientPointOverUi(point.clientX, point.clientY) : false;
  }

  private phaserPointerClientPosition(pointer: Phaser.Input.Pointer) {
    const event = pointer.event as MouseEvent | TouchEvent | undefined;
    if (!event) return null;
    if ("changedTouches" in event) {
      const touches = Array.from(event.changedTouches);
      const touch = touches.find((item) => item.identifier === pointer.identifier) ?? touches[0];
      return touch ? { clientX: touch.clientX, clientY: touch.clientY } : null;
    }
    return Number.isFinite(event.clientX) && Number.isFinite(event.clientY)
      ? { clientX: event.clientX, clientY: event.clientY }
      : null;
  }

  private clientPointOverUi(clientX: number, clientY: number) {
    if (typeof document === "undefined") return false;
    const element = document.elementFromPoint(clientX, clientY);
    return element ? this.isWorldUiElement(element) : false;
  }

  private isWorldUiElement(element: Element) {
    return Boolean(element.closest(".world-decoration-panel, .world-topbar, .world-actions, .world-mobile-controls, .world-modal-backdrop"));
  }

  private activePlacementDefinition() {
    const itemId = this.decorationTool?.kind === "place" ? this.decorationTool.itemId : this.movingDecoration?.itemId;
    return itemId ? getDecorationDefinition(itemId) : undefined;
  }

  private pointerGrid(pointer: DecorationPointerPosition, definition?: DecorationCatalogItem) {
    let gridX = Math.floor(pointer.worldX / TILE_SIZE);
    let gridY = Math.floor(pointer.worldY / TILE_SIZE);
    if (definition?.kind === "connected-object") {
      gridX = Math.round((gridX - definition.connectionOrigin.x) / definition.connectionStep.x) * definition.connectionStep.x + definition.connectionOrigin.x;
      gridY = Math.round((gridY - definition.connectionOrigin.y) / definition.connectionStep.y) * definition.connectionStep.y + definition.connectionOrigin.y;
    }
    return { gridX, gridY };
  }

  private updatePreview(pointer: DecorationPointerPosition) {
    const definition = this.activePlacementDefinition();
    if (!definition || !this.preview) return;
    const { gridX, gridY } = this.pointerGrid(pointer, definition);
    this.preview.setVisible(true);
    const x = (gridX + definition.footprint.width / 2) * TILE_SIZE;
    const y = definition.kind === "terrain" || definition.kind === "path" || definition.kind === "restore-terrain"
      ? (gridY + 0.5) * TILE_SIZE
      : (gridY + definition.footprint.height) * TILE_SIZE;
    this.preview.setPosition(x, y);
    const valid = isTerrainDefinition(definition)
      ? this.isTerrainCellAvailable(definition, gridX, gridY)
      : definition.kind === "restore-terrain"
        ? Boolean(this.terrainCellAt(gridX, gridY))
        : this.isGridAvailable(definition, gridX, gridY, this.movingDecoration?.id);
    if (this.preview instanceof Phaser.GameObjects.Rectangle) this.preview.setFillStyle(valid ? 0x9ee66f : 0xff7777, 0.45);
    else this.preview.setTint(valid ? 0xffffff : 0xff7777);
  }

  private async commitDecorationTool(pointer: DecorationPointerPosition) {
    if (!this.decorationTool) return;
    const hit = this.decorationAt(pointer.worldX, pointer.worldY);
    const rawGridX = Math.floor(pointer.worldX / TILE_SIZE);
    const rawGridY = Math.floor(pointer.worldY / TILE_SIZE);

    if (this.decorationTool.kind === "remove") {
      if (hit) {
        const result = await this.callbacks.onRemoveDecoration(hit.id);
        if (!result.ok) this.callbacks.onNotice(result.error ?? "Não foi possível remover.");
        return;
      }
      if (this.terrainCellAt(rawGridX, rawGridY)) {
        const result = await this.callbacks.onRemoveTerrain(this.currentScene, rawGridX, rawGridY);
        if (!result.ok) this.callbacks.onNotice(result.error ?? "Não foi possível restaurar o terreno.");
        return;
      }
      return;
    }

    if (this.decorationTool.kind === "move" && !this.movingDecoration) {
      if (!hit) return;
      this.movingDecoration = hit;
      const definition = getDecorationDefinition(hit.itemId);
      if (!definition) return;
      this.preview = this.createCatalogPreview(definition).setAlpha(0.65).setDepth(99999);
      this.updatePreview(pointer);
      return;
    }

    const definition = this.activePlacementDefinition();
    if (!definition) return;
    const { gridX, gridY } = this.pointerGrid(pointer, definition);

    if (definition.kind === "restore-terrain") {
      const result = await this.callbacks.onRemoveTerrain(this.currentScene, gridX, gridY);
      if (!result.ok) this.callbacks.onNotice(result.error ?? "Não foi possível restaurar o terreno.");
      return;
    }

    if (isTerrainDefinition(definition)) {
      if (!this.isTerrainCellAvailable(definition, gridX, gridY)) {
        this.callbacks.onNotice("Essa célula não pode receber terreno.");
        return;
      }
      const result = await this.callbacks.onPaintTerrain(definition.id, this.currentScene, gridX, gridY);
      if (!result.ok) this.callbacks.onNotice(result.error ?? "Não foi possível alterar o terreno.");
      return;
    }

    if (!this.isGridAvailable(definition, gridX, gridY, this.movingDecoration?.id)) {
      this.callbacks.onNotice("Esse espaço está ocupado ou fora da área decorável.");
      return;
    }

    const wasMoving = Boolean(this.movingDecoration);
    const result = this.movingDecoration
      ? await this.callbacks.onMoveDecoration(this.movingDecoration.id, this.currentScene, gridX, gridY)
      : await this.callbacks.onPlaceDecoration(definition.id, this.currentScene, gridX, gridY, 0);
    if (!result.ok) {
      this.callbacks.onNotice(result.error ?? "Não foi possível salvar a decoração.");
      return;
    }
    this.startLocalAction("placing");
    if (!wasMoving && result.decoration) {
      this.playDecorationEffect({ decorationId: result.decoration.id, itemId: result.decoration.itemId, scene: result.decoration.scene, gridX: result.decoration.gridX, gridY: result.decoration.gridY, sentAt: Date.now() });
    }
    if (wasMoving) this.cancelDecoration();
  }

  private decorationAt(x: number, y: number) {
    const image = [...this.decorationVisuals].reverse().find((item) => item.getBounds().contains(x, y));
    const id = image?.getData("decorationId") as string | undefined;
    return id ? this.decorations.find((item) => item.id === id) ?? null : null;
  }

  private isGridAvailable(definition: ObjectCatalogItem | ConnectedCatalogItem, gridX: number, gridY: number, ignoredId?: string) {
    if (!definition.scenes.includes(this.currentScene as never)) return false;
    const footprint = definition.footprint;
    const map = WORLD_CONFIG.scenes[this.currentScene];
    const area = map.decorationArea;
    if (gridX < area.x || gridY < area.y || gridX + footprint.width > area.x + area.width || gridY + footprint.height > area.y + area.height) return false;
    const candidateRects = this.placementRectsFor(definition, gridX, gridY, 0, ignoredId);
    if (candidateRects.length === 0) return false;
    const blockedRects = map.blockedDecorationRects.map((rect) => ({ x: rect.x * TILE_SIZE, y: rect.y * TILE_SIZE, width: rect.width * TILE_SIZE, height: rect.height * TILE_SIZE }));
    if (candidateRects.some((candidate) => blockedRects.some((blocked) => decorationRectsOverlap(candidate, blocked)))) return false;
    if (candidateRects.some((candidate) => this.fixedObstacles.some((item) => decorationRectsOverlap(candidate, (item as Phaser.GameObjects.Rectangle).getBounds())))) return false;
    if (candidateRects.some((candidate) => this.terrain.some((cell) => cell.scene === this.currentScene
      && cell.terrainId === "water"
      && decorationRectsOverlap(candidate, { x: cell.gridX * TILE_SIZE, y: cell.gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE })))) return false;
    return !this.decorations.some((item) => {
      if (item.id === ignoredId || item.scene !== this.currentScene) return false;
      const occupiedDefinition = getDecorationDefinition(item.itemId);
      if (!occupiedDefinition || (occupiedDefinition.kind !== "object" && occupiedDefinition.kind !== "connected-object")) {
        return candidateRects.some((candidate) => decorationRectsOverlap(candidate, { x: item.gridX * TILE_SIZE, y: item.gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }));
      }
      if (definition.kind === "connected-object" && occupiedDefinition.kind === "connected-object"
        && this.directlyConnects(definition, gridX, gridY, item, occupiedDefinition)) return false;
      const occupiedRects = this.placementRectsFor(occupiedDefinition, item.gridX, item.gridY, item.rotation, item.id);
      return candidateRects.some((candidate) => occupiedRects.some((occupied) => decorationRectsOverlap(candidate, occupied)));
    });
  }

  private isTerrainCellAvailable(definition: TerrainCatalogItem, gridX: number, gridY: number) {
    if (!definition.scenes.includes(this.currentScene as never)) return false;
    const map = WORLD_CONFIG.scenes[this.currentScene];
    const area = map.decorationArea;
    if (gridX < area.x || gridY < area.y || gridX + 1 > area.x + area.width || gridY + 1 > area.y + area.height) return false;
    const cell = new Phaser.Geom.Rectangle(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    if (map.blockedDecorationRects.some((rect) => Phaser.Geom.Intersects.RectangleToRectangle(cell, new Phaser.Geom.Rectangle(rect.x * TILE_SIZE, rect.y * TILE_SIZE, rect.width * TILE_SIZE, rect.height * TILE_SIZE)))) return false;
    if (this.fixedObstacles.some((item) => Phaser.Geom.Intersects.RectangleToRectangle(cell, (item as Phaser.GameObjects.Rectangle).getBounds()))) return false;
    if (this.localPlayer && cell.contains(this.localPlayer.x, this.localPlayer.y)) return false;
    if (this.players.some((player) => player.scene === this.currentScene && cell.contains(player.x, player.y))) return false;
    const cellRect: DecorationRect = { x: gridX * TILE_SIZE, y: gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
    return !this.decorations.some((item) => {
      if (item.scene !== this.currentScene) return false;
      const occupiedDefinition = getDecorationDefinition(item.itemId);
      if (!occupiedDefinition || (occupiedDefinition.kind !== "object" && occupiedDefinition.kind !== "connected-object")) {
        return decorationRectsOverlap(cellRect, { x: item.gridX * TILE_SIZE, y: item.gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE });
      }
      return this.placementRectsFor(occupiedDefinition, item.gridX, item.gridY, item.rotation, item.id)
        .some((occupied) => decorationRectsOverlap(cellRect, occupied));
    });
  }

  private createCatalogPreview(definition: DecorationCatalogItem) {
    if (definition.kind === "restore-terrain") return this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x9ee66f, 0.45);
    if (isTerrainDefinition(definition)) {
      const asset = getWorldTilesetAsset(definition.source.tileset);
      const frameName = asset ? this.ensureTilesetFrame(asset, definition.source.frame) : null;
      if (asset && frameName) return this.add.sprite(0, 0, asset.textureKey, frameName).setOrigin(0.5).setDisplaySize(TILE_SIZE, TILE_SIZE);
      return this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xff7777, 0.45);
    }
    return this.createCatalogSprite(0, 0, definition) ?? this.add.rectangle(0, 0, definition.footprint.width * TILE_SIZE, definition.footprint.height * TILE_SIZE, 0xff7777, 0.45);
  }

  private destroyPreview() { this.preview?.destroy(); this.preview = undefined; }

  private createDebugGrid() {
    this.debugGrid = this.add.graphics().setDepth(99998).setVisible(this.debugEnabled);
    this.debugGrid.lineStyle(0.5, 0xffffff, 0.24);
    const width = this.tilemap?.widthInPixels ?? 0;
    const height = this.tilemap?.heightInPixels ?? 0;
    for (let x = 0; x <= width; x += WORLD_CONFIG.tileSize) this.debugGrid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += WORLD_CONFIG.tileSize) this.debugGrid.lineBetween(0, y, width, y);
  }
}
