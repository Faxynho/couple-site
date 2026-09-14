import * as Phaser from "phaser";
import { AccountId } from "@/lib/accountSession";
import { CHARACTER_CONFIGS } from "@/world/config/characterConfig";
import { DECORATION_ASSETS, WORLD_CONFIG, WORLD_OBJECT_ASSETS, WorldVisualAsset } from "@/world/config/worldConfig";
import { getWorldTilesetAsset, WORLD_TILESET_ASSETS, WorldTilesetAsset } from "@/world/config/tilesetConfig";
import { DecorationTool, WorldDecoration, WorldDirection, WorldPlayerActionEvent, WorldPlayerState, WorldSceneId, WorldSnapshot } from "@/world/types";
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

const CAMERA_MIN_ZOOM = 0.75;
const CAMERA_BASE_MAX_ZOOM = 4;
const TAP_STOP_DISTANCE = 6;
const TAP_INTERACTION_DISTANCE = 48;
const TAP_INTERACTION_HIT_PADDING = 18;
const TAP_STUCK_TIMEOUT_MS = 900;

function property(object: TiledObject, name: string): unknown {
  return object.properties?.find((item: { name: string; value: unknown }) => item.name === name)?.value;
}

export class WorldScene extends Phaser.Scene {
  private readonly accountId: AccountId;
  private readonly callbacks: WorldGameCallbacks;
  private players: WorldPlayerState[];
  private decorations: WorldDecoration[];
  private currentScene: WorldSceneId = "exterior";
  private tilemap?: Phaser.Tilemaps.Tilemap;
  private groundLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundDetailsLayer?: Phaser.Tilemaps.TilemapLayer;
  private groundDetailsTopLayer?: Phaser.Tilemaps.TilemapLayer;
  private localPlayer?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private remotePlayers = new Map<AccountId, Phaser.GameObjects.Sprite>();
  private mapVisuals: Phaser.GameObjects.GameObject[] = [];
  private fixedObstacles: Phaser.GameObjects.GameObject[] = [];
  private decorationVisuals: Phaser.GameObjects.Image[] = [];
  private decorationObstacles: Phaser.GameObjects.GameObject[] = [];
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
  private preview?: Phaser.GameObjects.Image;
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

  private requestedCameraZoom: number = WORLD_CONFIG.camera.zoom;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(accountId: AccountId, snapshot: WorldSnapshot, callbacks: WorldGameCallbacks) {
    super({ key: "WorldScene" });
    this.accountId = accountId;
    this.players = snapshot.players;
    this.decorations = snapshot.decorations;
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

    const assets = [...Object.values(WORLD_OBJECT_ASSETS), ...Object.values(DECORATION_ASSETS)];
    for (const asset of assets) if (!this.load.textureManager.exists(asset.texture)) this.load.image(asset.texture, asset.url);
    for (const tileset of Object.values(WORLD_TILESET_ASSETS)) {
      if (!this.textures.exists(tileset.textureKey)) this.load.image(tileset.textureKey, tileset.url);
    }
    this.load.tilemapTiledJSON(WORLD_CONFIG.scenes.exterior.mapKey, WORLD_CONFIG.scenes.exterior.mapUrl);
    this.load.tilemapTiledJSON(WORLD_CONFIG.scenes["house-interior"].mapKey, WORLD_CONFIG.scenes["house-interior"].mapUrl);
  }

  create() {
    this.viewportWidth = Math.max(1, Number(this.scale.width || this.game.canvas.width));
    this.viewportHeight = Math.max(1, Number(this.scale.height || this.game.canvas.height));
    this.createAnimations();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on("keydown-E", () => this.interact());
    this.input.keyboard?.on("keydown-ESC", () => this.cancelDecoration());
    this.input.keyboard?.on(`keydown-${WORLD_CONFIG.debugKey}`, () => this.toggleDebug());
    this.input.keyboard?.on("keydown", this.handleActionDebugKey, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.handleCameraFollowUpdate, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    const local = this.players.find((item) => item.accountId === this.accountId);
    if (!local) { this.callbacks.onError("O servidor não devolveu o personagem desta conta."); return; }
    this.switchMap(local);
    this.callbacks.onReady();
  }

  update(time: number) {
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

      this.playCharacterAnimation(this.localPlayer, this.accountId, moving ? "walk" : "idle", this.direction);
    }
    this.localPlayer.setDepth(this.localPlayer.y);

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
    if (Number.isFinite(zoom)) this.requestedCameraZoom = Math.round(Number(zoom));
    return this.applyCameraZoom();
  }

  getCameraZoomInfo(): WorldCameraZoomInfo {
    return this.calculateCameraZoomInfo();
  }

  handleViewportResize(width: number, height: number) {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    if (this.tilemap) this.applyCameraZoom();
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

  updateDecorations(decorations: WorldDecoration[]) { this.decorations = decorations; if (this.localPlayer) this.renderDecorations(); }

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
    this.destroyPreview();
    if (tool?.kind === "place") this.preview = this.createAssetImage(0, 0, DECORATION_ASSETS[tool.type]).setAlpha(0.65).setDepth(99999);
    this.callbacks.onHint(tool ? "Clique no mapa para usar a ferramenta · Esc cancela" : null);
  }

  cancelDecoration() { this.decorationTool = null; this.movingDecoration = null; this.destroyPreview(); this.callbacks.onHint(null); }

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
    this.input.off("pointermove", this.handlePointerMove, this);
    this.input.off("pointerdown", this.handlePointerDown, this);
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
    const played = this.playCharacterAnimation(this.localPlayer, this.accountId, animationName, this.direction);
    if (!played) return false;

    this.currentAction = animationName;
    this.callbacks.onAction(animationName, this.direction);
    const expectedKey = `${this.accountId}-${animationName}-${this.direction}`;

    this.localPlayer.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (animation: Phaser.Animations.Animation) => {
      if (animation.key !== expectedKey || this.currentAction !== animationName) return;
      this.currentAction = null;
      if (this.localPlayer) this.playCharacterAnimation(this.localPlayer, this.accountId, "idle", this.direction);
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
    // Phaser 3.90 mistura duas coisas em camera.roundPixels:
    // 1) arredonda scroll/posição do objeto com Math.floor ANTES do render;
    // 2) arredonda o quad FINAL já transformado para a grade da tela.
    //
    // O primeiro passo é o que cria o viés direita/esquerda com lerp.
    // Mantemos roundPixels=false no follow para preservar o scroll suave,
    // mas reativamos SOMENTE o arredondamento final do quad aqui, depois
    // que Camera.preRender terminou de calcular a câmera.
    Reflect.set(camera, "renderRoundPixels", Number.isInteger(camera.zoomX) && Number.isInteger(camera.zoomY));
  }

  private calculateCameraZoomInfo(): WorldCameraZoomInfo {
    const viewportWidth = Math.max(1, this.viewportWidth || Number(this.scale?.width ?? 0) || Number(this.game?.canvas?.width ?? 0));
    const viewportHeight = Math.max(1, this.viewportHeight || Number(this.scale?.height ?? 0) || Number(this.game?.canvas?.height ?? 0));

    // O zoom é uma configuração GLOBAL do Nosso Mundo.
    // Usamos o exterior como mapa de referência para definir os limites do slider,
    // assim entrar numa cena menor (como o interior da casa) não força a câmera
    // a aproximar e não altera visualmente a distância escolhida pelo jogador.
    const exteriorConfig = WORLD_CONFIG.scenes.exterior;
    const referenceMapWidth = Math.max(1, exteriorConfig.width * WORLD_CONFIG.tileSize);
    const referenceMapHeight = Math.max(1, exteriorConfig.height * WORLD_CONFIG.tileSize);
    const requiredToKeepReferenceMapCoveringView = Math.max(
      viewportWidth / referenceMapWidth,
      viewportHeight / referenceMapHeight,
      CAMERA_MIN_ZOOM,
    );
    // O arredondamento final de pixel só é estável com zoom inteiro no Phaser 3.90.
    // Por isso o zoom do mundo é mantido em níveis inteiros.
    const min = Math.max(1, Math.ceil(requiredToKeepReferenceMapCoveringView));
    const max = Math.max(Math.ceil(CAMERA_BASE_MAX_ZOOM), min + 2);
    const zoom = Phaser.Math.Clamp(Math.round(this.requestedCameraZoom), min, max);
    return { zoom, min, max };
  }

  private applyCameraZoom() {
    const info = this.calculateCameraZoomInfo();
    const camera = this.cameras?.main;
    if (camera) {
      this.requestedCameraZoom = info.zoom;
      camera.setZoom(info.zoom);
      this.updateCameraBoundsForCurrentZoom();
    }
    this.callbacks.onCameraZoomChange(info);
    return info;
  }

  private updateCameraBoundsForCurrentZoom() {
    if (!this.tilemap) return;

    const camera = this.cameras.main;
    const zoom = Math.max(0.01, camera.zoom);
    const visibleWorldWidth = camera.width / zoom;
    const visibleWorldHeight = camera.height / zoom;
    const mapWidth = this.tilemap.widthInPixels;
    const mapHeight = this.tilemap.heightInPixels;

    // Se uma cena for menor que a área visível da câmera (como o interior
    // da casa), aumentamos apenas os limites virtuais da câmera e
    // centralizamos o mapa dentro deles. Assim podemos manter o MESMO zoom
    // global sem o Phaser prender o scroll no canto inferior/direito.
    const boundsWidth = Math.max(mapWidth, visibleWorldWidth);
    const boundsHeight = Math.max(mapHeight, visibleWorldHeight);
    const boundsX = (mapWidth - boundsWidth) / 2;
    const boundsY = (mapHeight - boundsHeight) / 2;

    camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
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
    this.direction = state.direction;
    for (const obstacle of this.fixedObstacles) this.fixedColliders.push(this.physics.add.collider(this.localPlayer, obstacle));
    this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.applyCameraZoom();
    this.cameras.main.setDeadzone(WORLD_CONFIG.camera.deadzoneWidth, WORLD_CONFIG.camera.deadzoneHeight);

    // IMPORTANTE: false aqui é intencional.
    // Com true, o Phaser 3.90 executa Math.floor no scroll e na posição
    // do sprite antes do render. Com lerp isso é assimétrico: para a direita
    // a câmera fica alguns frames parada e depois salta; para a esquerda o
    // floor reage imediatamente. É exatamente o padrão do bug observado.
    // O handleCameraFollowUpdate reativa apenas o arredondamento FINAL do
    // quad em screen-space, mantendo pixel art nítida sem estragar o lerp.
    this.cameras.main.startFollow(this.localPlayer, false, WORLD_CONFIG.camera.lerpX, WORLD_CONFIG.camera.lerpY);
    this.cameras.main.centerOn(this.localPlayer.x, this.localPlayer.y);
    this.renderDecorations();
    this.updatePlayers(this.players);
    this.createDebugGrid();
  }

  private clearMap() {
    this.destroyPreview();
    this.fixedColliders.forEach((collider) => collider.destroy());
    this.decorationColliders.forEach((collider) => collider.destroy());
    this.fixedColliders = [];
    this.decorationColliders = [];
    this.groundDetailsTopLayer?.destroy();
    this.groundDetailsLayer?.destroy();
    this.groundLayer?.destroy();
    this.groundDetailsTopLayer = undefined;
    this.groundDetailsLayer = undefined;
    this.groundLayer = undefined;
    this.tilemap?.destroy();
    this.localPlayer?.destroy();
    for (const sprite of this.remotePlayers.values()) sprite.destroy();
    this.remotePlayers.clear();
    this.remoteActions.clear();
    [...this.mapVisuals, ...this.fixedObstacles, ...this.decorationVisuals, ...this.decorationObstacles].forEach((item) => item.destroy());
    this.mapVisuals = [];
    this.fixedObstacles = [];
    this.decorationVisuals = [];
    this.decorationObstacles = [];
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

  private renderDecorations() {
    this.decorationColliders.forEach((collider) => collider.destroy());
    this.decorationColliders = [];
    [...this.decorationVisuals, ...this.decorationObstacles].forEach((item) => item.destroy());
    this.decorationVisuals = [];
    this.decorationObstacles = [];

    for (const decoration of this.decorations.filter((item) => item.scene === this.currentScene)) {
      const asset = DECORATION_ASSETS[decoration.type];
      const footprint = asset.footprint;
      const x = (decoration.gridX + footprint.width / 2) * WORLD_CONFIG.tileSize;
      const y = (decoration.gridY + footprint.height) * WORLD_CONFIG.tileSize;
      const image = this.createAssetImage(x, y, asset).setDepth(y).setData("decorationId", decoration.id);
      this.decorationVisuals.push(image);
      if (asset.collision) {
        const obstacle = this.createObstacle(x + asset.collision.offsetX, y + asset.collision.offsetY / 2, asset.collision.width, asset.collision.height);
        this.decorationObstacles.push(obstacle);
        if (this.localPlayer) this.decorationColliders.push(this.physics.add.collider(this.localPlayer, obstacle));
      }
    }
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
    const decorationType = this.decorationTool.kind === "place" ? this.decorationTool.type : this.movingDecoration?.type;
    if (!decorationType) return;
    const asset = DECORATION_ASSETS[decorationType];
    const gridX = Math.floor(pointer.worldX / WORLD_CONFIG.tileSize);
    const gridY = Math.floor(pointer.worldY / WORLD_CONFIG.tileSize);
    this.preview.setPosition((gridX + asset.footprint.width / 2) * WORLD_CONFIG.tileSize, (gridY + asset.footprint.height) * WORLD_CONFIG.tileSize);
    this.preview.setTint(this.isGridAvailable(decorationType, gridX, gridY, this.movingDecoration?.id) ? 0xffffff : 0xff7777);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.rightButtonDown()) {
      if (this.decorationTool) this.cancelDecoration();
      else this.clearTapMoveTarget();
      return;
    }

    if (!this.decorationTool) {
      if (this.tapToMoveEnabled) this.setTapMoveTarget(pointer.worldX, pointer.worldY);
      return;
    }

    const hit = this.decorationAt(pointer.worldX, pointer.worldY);
    if (this.decorationTool.kind === "remove") {
      if (!hit) { this.callbacks.onNotice("Clique em uma decoração para remover."); return; }
      void this.callbacks.onRemoveDecoration(hit.id).then((result) => { if (!result.ok) this.callbacks.onNotice(result.error ?? "Não foi possível remover."); });
      return;
    }

    if (this.decorationTool.kind === "move" && !this.movingDecoration) {
      if (!hit) { this.callbacks.onNotice("Clique primeiro na decoração que deseja mover."); return; }
      this.movingDecoration = hit;
      const asset = DECORATION_ASSETS[hit.type];
      this.preview = this.createAssetImage(pointer.worldX, pointer.worldY, asset).setAlpha(0.65).setDepth(99999);
      this.callbacks.onNotice("Agora clique no novo lugar.");
      return;
    }

    const type = this.decorationTool.kind === "place" ? this.decorationTool.type : this.movingDecoration?.type;
    if (!type) return;
    const gridX = Math.floor(pointer.worldX / WORLD_CONFIG.tileSize);
    const gridY = Math.floor(pointer.worldY / WORLD_CONFIG.tileSize);
    if (!this.isGridAvailable(type, gridX, gridY, this.movingDecoration?.id)) {
      this.callbacks.onNotice("Esse espaço está ocupado ou fora da área decorável.");
      return;
    }

    const promise = this.movingDecoration
      ? this.callbacks.onMoveDecoration(this.movingDecoration.id, this.currentScene, gridX, gridY)
      : this.callbacks.onPlaceDecoration(type, this.currentScene, gridX, gridY);

    void promise.then((result) => {
      if (!result.ok) {
        this.callbacks.onNotice(result.error ?? "Não foi possível salvar a decoração.");
        return;
      }
      this.startLocalAction("placing");
      if (this.movingDecoration) this.cancelDecoration();
    });
  }

  private decorationAt(x: number, y: number) {
    const image = [...this.decorationVisuals].reverse().find((item) => item.getBounds().contains(x, y));
    const id = image?.getData("decorationId") as string | undefined;
    return id ? this.decorations.find((item) => item.id === id) ?? null : null;
  }

  private isGridAvailable(type: WorldDecoration["type"], gridX: number, gridY: number, ignoredId?: string) {
    const footprint = DECORATION_ASSETS[type].footprint;
    const map = WORLD_CONFIG.scenes[this.currentScene];
    if (gridX < 1 || gridY < 2 || gridX + footprint.width >= map.width - 1 || gridY + footprint.height >= map.height - 1) return false;
    const candidate = new Phaser.Geom.Rectangle(gridX * 16, gridY * 16, footprint.width * 16, footprint.height * 16);
    if (this.fixedObstacles.some((item) => Phaser.Geom.Intersects.RectangleToRectangle(candidate, (item as Phaser.GameObjects.Rectangle).getBounds()))) return false;
    return !this.decorations.some((item) => {
      if (item.id === ignoredId || item.scene !== this.currentScene) return false;
      const occupied = DECORATION_ASSETS[item.type].footprint;
      return Phaser.Geom.Intersects.RectangleToRectangle(candidate, new Phaser.Geom.Rectangle(item.gridX * 16, item.gridY * 16, occupied.width * 16, occupied.height * 16));
    });
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
