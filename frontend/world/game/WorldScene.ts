import * as Phaser from "phaser";
import { AccountId } from "@/lib/accountSession";
import { CHARACTER_CONFIGS } from "@/world/config/characterConfig";
import { DECORATION_ASSETS, WORLD_CONFIG, WORLD_OBJECT_ASSETS, WorldVisualAsset } from "@/world/config/worldConfig";
import { DecorationTool, WorldDecoration, WorldDirection, WorldPlayerState, WorldSceneId, WorldSnapshot } from "@/world/types";
import { WorldGameCallbacks } from "./WorldGameApi";

type TiledObject = Phaser.Types.Tilemaps.TiledObject & { properties?: Array<{ name: string; value: unknown }> };

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
  private localPlayer?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private remotePlayers = new Map<AccountId, Phaser.GameObjects.Sprite>();
  private mapVisuals: Phaser.GameObjects.GameObject[] = [];
  private fixedObstacles: Phaser.GameObjects.GameObject[] = [];
  private decorationVisuals: Phaser.GameObjects.Image[] = [];
  private decorationObstacles: Phaser.GameObjects.GameObject[] = [];
  private fixedColliders: Phaser.Physics.Arcade.Collider[] = [];
  private decorationColliders: Phaser.Physics.Arcade.Collider[] = [];
  private interactions: Array<{ name: string; x: number; y: number; target: WorldSceneId }> = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private touchDirection = { x: 0, y: 0 };
  private direction: WorldDirection = "down";
  private decorationTool: DecorationTool = null;
  private movingDecoration: WorldDecoration | null = null;
  private preview?: Phaser.GameObjects.Image;
  private debugEnabled = false;
  private debugGrid?: Phaser.GameObjects.Graphics;
  private lastNetworkAt = 0;
  private lastDebugAt = 0;
  private changingScene = false;
  private destroyed = false;

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
      this.load.spritesheet(config.textureKey, config.walkSheet, { frameWidth: config.frameWidth, frameHeight: config.frameHeight, margin: config.margin, spacing: config.spacing });
      this.load.spritesheet(`${config.textureKey}-actions`, config.actionsSheet, { frameWidth: config.frameWidth, frameHeight: config.frameHeight });
    }
    const assets = [...Object.values(WORLD_OBJECT_ASSETS), ...Object.values(DECORATION_ASSETS)];
    for (const asset of assets) if (!this.load.textureManager.exists(asset.texture)) this.load.image(asset.texture, asset.url);
    this.load.image("grass-tiles", "/world/tiles/grass.png");
    this.load.spritesheet("water-tiles", "/world/tiles/water.png", { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet("tilled-tiles", "/world/tiles/tilled-dirt.png", { frameWidth: 16, frameHeight: 16 });
    this.load.image("house-floor-tiles", "/world/buildings/wooden-house-roof.png");
    this.load.tilemapTiledJSON(WORLD_CONFIG.scenes.exterior.mapKey, WORLD_CONFIG.scenes.exterior.mapUrl);
    this.load.tilemapTiledJSON(WORLD_CONFIG.scenes["house-interior"].mapKey, WORLD_CONFIG.scenes["house-interior"].mapUrl);
  }

  create() {
    this.createAnimations();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on("keydown-E", () => this.interact());
    this.input.keyboard?.on("keydown-ESC", () => this.cancelDecoration());
    this.input.keyboard?.on("keydown-F3", () => this.toggleDebug());
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    const local = this.players.find((item) => item.accountId === this.accountId);
    if (!local) { this.callbacks.onError("O servidor não devolveu o personagem desta conta."); return; }
    this.switchMap(local);
    this.callbacks.onReady();
  }

  update(time: number) {
    if (!this.localPlayer) return;
    const input = this.movementInput();
    const body = this.localPlayer.body;
    const speed = CHARACTER_CONFIGS[this.accountId].walkSpeed;
    body.setVelocity(input.x * speed, input.y * speed);
    if (input.x !== 0 || input.y !== 0) body.velocity.normalize().scale(speed);
    const moving = body.velocity.lengthSq() > 0.5;
    if (moving) this.direction = Math.abs(body.velocity.x) > Math.abs(body.velocity.y) ? (body.velocity.x < 0 ? "left" : "right") : (body.velocity.y < 0 ? "up" : "down");
    this.applyAnimation(this.localPlayer, this.accountId, this.direction, moving);
    this.localPlayer.setDepth(this.localPlayer.y);

    for (const [accountId, sprite] of this.remotePlayers) {
      const target = sprite.getData("target") as WorldPlayerState | undefined;
      if (!target || target.scene !== this.currentScene) { sprite.setVisible(false); continue; }
      sprite.setVisible(true);
      sprite.x = Phaser.Math.Linear(sprite.x, target.x, 0.22);
      sprite.y = Phaser.Math.Linear(sprite.y, target.y, 0.22);
      sprite.setDepth(sprite.y);
      this.applyAnimation(sprite, accountId, target.direction, target.moving);
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

  setTouchDirection(x: number, y: number) { this.touchDirection = { x, y }; }

  updatePlayers(players: WorldPlayerState[]) {
    this.players = players;
    for (const state of players) {
      if (state.accountId === this.accountId) continue;
      let sprite = this.remotePlayers.get(state.accountId);
      if (!sprite && this.textures.exists(CHARACTER_CONFIGS[state.accountId].textureKey)) {
        const config = CHARACTER_CONFIGS[state.accountId];
        sprite = this.add.sprite(state.x, state.y, config.textureKey, config.idleFrames.down).setScale(config.scale).setOrigin(config.origin.x, config.origin.y);
        this.remotePlayers.set(state.accountId, sprite);
      }
      sprite?.setData("target", state);
    }
    for (const [id, sprite] of this.remotePlayers) if (!players.some((item) => item.accountId === id)) { sprite.destroy(); this.remotePlayers.delete(id); }
  }

  updateDecorations(decorations: WorldDecoration[]) { this.decorations = decorations; if (this.localPlayer) this.renderDecorations(); }

  setDecorationTool(tool: DecorationTool) {
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
    this.callbacks.onDebug(null);
  }

  private movementInput() {
    if (this.decorationTool) return { x: 0, y: 0 };
    let x = this.touchDirection.x;
    let y = this.touchDirection.y;
    if (this.cursors?.left.isDown || this.keys?.A.isDown) x -= 1;
    if (this.cursors?.right.isDown || this.keys?.D.isDown) x += 1;
    if (this.cursors?.up.isDown || this.keys?.W.isDown) y -= 1;
    if (this.cursors?.down.isDown || this.keys?.S.isDown) y += 1;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  private createAnimations() {
    for (const [accountId, config] of Object.entries(CHARACTER_CONFIGS) as Array<[AccountId, typeof CHARACTER_CONFIGS[AccountId]]>) {
      for (const [direction, animation] of Object.entries(config.animations) as Array<[WorldDirection, typeof config.animations[WorldDirection]]>) {
        const key = `${accountId}-walk-${direction}`;
        if (!this.anims.exists(key)) this.anims.create({ key, frames: animation.frames.map((frame) => ({ key: config.textureKey, frame })), frameRate: animation.fps, repeat: animation.repeat });
      }
    }
  }

  private applyAnimation(sprite: Phaser.GameObjects.Sprite, accountId: AccountId, direction: WorldDirection, moving: boolean) {
    const config = CHARACTER_CONFIGS[accountId];
    const flip = Boolean(config.animations[direction].flipX);
    sprite.setFlipX(flip);
    if (moving) sprite.anims.play(`${accountId}-walk-${direction}`, true);
    else { sprite.anims.stop(); sprite.setFrame(config.idleFrames[direction]); }
  }

  private switchMap(state: WorldPlayerState) {
    this.clearMap();
    this.currentScene = state.scene;
    const mapConfig = WORLD_CONFIG.scenes[state.scene];
    this.tilemap = this.make.tilemap({ key: mapConfig.mapKey });
    const tilesetName = state.scene === "exterior" ? "grass" : "house-floor";
    const textureKey = state.scene === "exterior" ? "grass-tiles" : "house-floor-tiles";
    const tileset = this.tilemap.addTilesetImage(tilesetName, textureKey);
    if (!tileset) { this.callbacks.onError(`O tileset ${tilesetName} não foi encontrado no mapa.`); return; }
    this.groundLayer = this.tilemap.createLayer("Ground", tileset, 0, 0) ?? undefined;
    this.groundLayer?.setDepth(0);
    this.renderGroundDetails(this.tilemap.getObjectLayer("GroundDetails")?.objects as TiledObject[] | undefined);
    this.renderMapObjects(this.tilemap.getObjectLayer("Objects")?.objects as TiledObject[] | undefined, 0);
    this.renderMapObjects(this.tilemap.getObjectLayer("AbovePlayer")?.objects as TiledObject[] | undefined, 2);
    this.renderCollisions(this.tilemap.getObjectLayer("Collisions")?.objects as TiledObject[] | undefined);
    this.readInteractions(this.tilemap.getObjectLayer("Interactions")?.objects as TiledObject[] | undefined);

    const config = CHARACTER_CONFIGS[this.accountId];
    this.localPlayer = this.physics.add.sprite(state.x, state.y, config.textureKey, config.idleFrames[state.direction]) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.localPlayer.setScale(config.scale).setOrigin(config.origin.x, config.origin.y);
    this.localPlayer.body.setSize(config.collision.width, config.collision.height).setOffset(config.collision.offsetX, config.collision.offsetY);
    this.localPlayer.setCollideWorldBounds(true);
    this.direction = state.direction;
    for (const obstacle of this.fixedObstacles) this.fixedColliders.push(this.physics.add.collider(this.localPlayer, obstacle));
    this.physics.world.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.tilemap.widthInPixels, this.tilemap.heightInPixels);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setZoom(WORLD_CONFIG.camera.zoom);
    this.cameras.main.setDeadzone(WORLD_CONFIG.camera.deadzoneWidth, WORLD_CONFIG.camera.deadzoneHeight);
    this.cameras.main.startFollow(this.localPlayer, true, WORLD_CONFIG.camera.lerpX, WORLD_CONFIG.camera.lerpY);
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
    this.groundLayer?.destroy();
    this.tilemap?.destroy();
    this.localPlayer?.destroy();
    for (const sprite of this.remotePlayers.values()) sprite.destroy();
    this.remotePlayers.clear();
    [...this.mapVisuals, ...this.fixedObstacles, ...this.decorationVisuals, ...this.decorationObstacles].forEach((item) => item.destroy());
    this.mapVisuals = []; this.fixedObstacles = []; this.decorationVisuals = []; this.decorationObstacles = []; this.interactions = [];
    this.debugGrid?.destroy(); this.debugGrid = undefined;
  }

  private renderGroundDetails(objects: TiledObject[] | undefined) {
    for (const object of objects ?? []) {
      const kind = String(property(object, "kind") ?? object.name ?? "");
      const x = Number(object.x ?? 0), y = Number(object.y ?? 0), width = Number(object.width ?? 16), height = Number(object.height ?? 16);
      if (kind === "water") this.mapVisuals.push(this.add.tileSprite(x + width / 2, y + height / 2, width, height, "water-tiles", 0).setDepth(0.2));
      if (kind === "farm") this.mapVisuals.push(this.add.tileSprite(x + width / 2, y + height / 2, width, height, "tilled-tiles", 55).setDepth(0.25));
      if (kind === "path") this.mapVisuals.push(this.add.tileSprite(x + width / 2, y + height / 2, width, height, "tilled-tiles", 60).setDepth(0.24).setAlpha(0.78));
    }
  }

  private renderMapObjects(objects: TiledObject[] | undefined, depthOffset: number) {
    for (const object of objects ?? []) {
      const key = String(property(object, "asset") ?? object.type ?? object.name ?? "");
      const asset = WORLD_OBJECT_ASSETS[key];
      if (!asset) continue;
      const image = this.createAssetImage(Number(object.x ?? 0), Number(object.y ?? 0), asset);
      image.setDepth(Number(object.y ?? 0) + depthOffset);
      this.mapVisuals.push(image);
      if (key === "house") {
        const door = this.createAssetImage(image.x, image.y, WORLD_OBJECT_ASSETS["house-door"]).setDepth(image.y + 1);
        const leftWindow = this.createAssetImage(image.x - 34, image.y - 42, WORLD_OBJECT_ASSETS["house-window"]).setDepth(image.y + 1);
        const rightWindow = this.createAssetImage(image.x + 34, image.y - 42, WORLD_OBJECT_ASSETS["house-window"]).setDepth(image.y + 1);
        this.mapVisuals.push(door, leftWindow, rightWindow);
      }
      if (asset.collision) this.fixedObstacles.push(this.createObstacle(image.x + asset.collision.offsetX, image.y + asset.collision.offsetY / 2, asset.collision.width, asset.collision.height));
    }
  }

  private renderCollisions(objects: TiledObject[] | undefined) {
    for (const object of objects ?? []) {
      const width = Number(object.width ?? 0), height = Number(object.height ?? 0);
      if (width > 0 && height > 0) this.fixedObstacles.push(this.createObstacle(Number(object.x ?? 0) + width / 2, Number(object.y ?? 0) + height / 2, width, height));
    }
  }

  private readInteractions(objects: TiledObject[] | undefined) {
    this.interactions = (objects ?? []).flatMap((object) => {
      const target = property(object, "target");
      if (target !== "exterior" && target !== "house-interior") return [];
      return [{ name: object.name ?? "porta", x: Number(object.x ?? 0) + Number(object.width ?? 0) / 2, y: Number(object.y ?? 0) + Number(object.height ?? 0) / 2, target }];
    });
  }

  private renderDecorations() {
    this.decorationColliders.forEach((collider) => collider.destroy());
    this.decorationColliders = [];
    [...this.decorationVisuals, ...this.decorationObstacles].forEach((item) => item.destroy());
    this.decorationVisuals = []; this.decorationObstacles = [];
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
    return this.interactions.reduce((best, item) => Phaser.Math.Distance.Between(this.localPlayer!.x, this.localPlayer!.y, item.x, item.y) < Phaser.Math.Distance.Between(this.localPlayer!.x, this.localPlayer!.y, best.x, best.y) ? item : best);
  }

  private refreshInteractionHint() {
    if (this.decorationTool || !this.localPlayer) return;
    const nearest = this.nearestInteraction();
    const close = nearest && Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, nearest.x, nearest.y) <= 52;
    this.callbacks.onHint(close ? "E · Entrar / sair" : null);
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
    if (!this.decorationTool || pointer.rightButtonDown()) { if (pointer.rightButtonDown()) this.cancelDecoration(); return; }
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
    const gridX = Math.floor(pointer.worldX / WORLD_CONFIG.tileSize), gridY = Math.floor(pointer.worldY / WORLD_CONFIG.tileSize);
    if (!this.isGridAvailable(type, gridX, gridY, this.movingDecoration?.id)) { this.callbacks.onNotice("Esse espaço está ocupado ou fora da área decorável."); return; }
    const promise = this.movingDecoration
      ? this.callbacks.onMoveDecoration(this.movingDecoration.id, this.currentScene, gridX, gridY)
      : this.callbacks.onPlaceDecoration(type, this.currentScene, gridX, gridY);
    void promise.then((result) => {
      if (!result.ok) this.callbacks.onNotice(result.error ?? "Não foi possível salvar a decoração.");
      else if (this.movingDecoration) this.cancelDecoration();
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
    const width = this.tilemap?.widthInPixels ?? 0, height = this.tilemap?.heightInPixels ?? 0;
    for (let x = 0; x <= width; x += WORLD_CONFIG.tileSize) this.debugGrid.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += WORLD_CONFIG.tileSize) this.debugGrid.lineBetween(0, y, width, y);
  }
}
