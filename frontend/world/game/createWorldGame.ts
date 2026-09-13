import * as Phaser from "phaser";
import { AccountId } from "@/lib/accountSession";
import { WorldSnapshot } from "@/world/types";
import { WorldGameApi, WorldGameCallbacks } from "./WorldGameApi";
import { WorldScene } from "./WorldScene";

export function createWorldGame(parent: HTMLElement, accountId: AccountId, snapshot: WorldSnapshot, callbacks: WorldGameCallbacks): WorldGameApi {
  const scene = new WorldScene(accountId, snapshot, callbacks);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || window.innerWidth,
    height: parent.clientHeight || window.innerHeight,
    backgroundColor: "#76a85a",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { debug: false, gravity: { x: 0, y: 0 } } },
    scene: [scene],
  });
  return {
    setTouchDirection: (x, y) => scene.setTouchDirection(x, y),
    interact: () => scene.interact(),
    toggleDebug: () => scene.toggleDebug(),
    setDecorationTool: (tool) => scene.setDecorationTool(tool),
    cancelDecoration: () => scene.cancelDecoration(),
    updatePlayers: (players) => scene.updatePlayers(players),
    updateDecorations: (decorations) => scene.updateDecorations(decorations),
    playRemoteAction: (event) => scene.playRemoteAction(event),
    destroy: () => game.destroy(true),
  };
}
