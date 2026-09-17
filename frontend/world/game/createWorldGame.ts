import * as Phaser from "phaser";
import { AccountId } from "@/lib/accountSession";
import { WORLD_CONFIG } from "@/world/config/worldConfig";
import { WorldSnapshot } from "@/world/types";
import { getWorldCameraLayout } from "./WorldCameraLayout";
import { WorldGameApi, WorldGameCallbacks } from "./WorldGameApi";
import { WorldScene } from "./WorldScene";

export function createWorldGame(parent: HTMLElement, accountId: AccountId, snapshot: WorldSnapshot, callbacks: WorldGameCallbacks): WorldGameApi {
  const viewportWidth = Math.max(1, parent.clientWidth || window.innerWidth);
  const viewportHeight = Math.max(1, parent.clientHeight || window.innerHeight);
  const initialLayout = getWorldCameraLayout(WORLD_CONFIG.camera.zoom, viewportWidth, viewportHeight);
  const scene = new WorldScene(accountId, snapshot, callbacks);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: initialLayout.gameWidth,
    height: initialLayout.gameHeight,
    backgroundColor: "#2b2118",
    pixelArt: true,
    antialias: false,

    // O mundo precisa deslizar em subpixel. Não arredondamos câmera, tiles
    // nem objetos individualmente; apenas o avatar local é snapado no Scene.
    roundPixels: false,
    render: { antialias: false, pixelArt: true, roundPixels: false },

    // FIT mantém um buffer virtual estável e deixa o ScaleManager fazer UMA
    // escala final do canvas inteiro. Isso permite 8 níveis de distância sem
    // usar zoom fracionário nos objetos do mundo.
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      autoRound: true,
    },

    // O problema aparece justamente em telas de 120/165 Hz. Phaser 3.90
    // executa o follow da câmera por frame; limitar o loop a 60 Hz dá uma
    // cadência única em PC e mobile e evita passos subpixel minúsculos que
    // viram shimmer em pixel art. O movimento continua delta-based.
    fps: {
      target: 60,
      limit: 60,
    },

    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 },
        // Mantém física, sprite e câmera no mesmo frame de renderização.
        fixedStep: false,
      },
    },
    scene: [scene],
  });

  return {
    setTouchDirection: (x, y) => scene.setTouchDirection(x, y),
    setTapToMoveEnabled: (enabled) => scene.setTapToMoveEnabled(enabled),
    setCameraZoom: (zoom) => scene.setCameraZoom(zoom),
    getCameraZoomInfo: () => scene.getCameraZoomInfo(),
    interact: () => scene.interact(),
    toggleDebug: () => scene.toggleDebug(),
    setDecorationTool: (tool) => scene.setDecorationTool(tool),
    cancelDecoration: () => scene.cancelDecoration(),
    updatePlayers: (players) => scene.updatePlayers(players),
    updateDecorations: (decorations) => scene.updateDecorations(decorations),
    updateTerrain: (terrain) => scene.updateTerrain(terrain),
    playRemoteAction: (event) => scene.playRemoteAction(event),
    playDecorationEffect: (event) => scene.playDecorationEffect(event),
    resize: (width, height, topInset = 0) => {
      if (width <= 0 || height <= 0) return;
      // Em FIT não chamamos game.scale.resize(). A documentação do Phaser
      // recomenda setGameSize para alterar a resolução base enquanto o
      // ScaleManager continua responsável pela escala de exibição.
      scene.handleViewportResize(width, height, topInset);
    },
    destroy: () => game.destroy(true),
  };
}
