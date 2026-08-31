import assert from "node:assert/strict";
import { AirHockeyGame, AirHockeyState } from "./AirHockeyGame";

const localPlayerId = "LOCAL";
const remotePlayerId = "REMOTE";

function physicsSnapshot(state: AirHockeyState) {
  const paddle = state.paddles[localPlayerId];
  return {
    paddle: { x: paddle.x, y: paddle.y, vx: paddle.vx, vy: paddle.vy },
    puck: { ...state.puck },
    impactSerial: state.impactSerial,
  };
}

const engine = new AirHockeyGame();
const initial = engine.createInitialState({ mode: "duel", playerIds: [localPlayerId, remotePlayerId] });
initial.phase = "playing";
initial.phaseEndsAt = null;
initial.lastTickAt = 0;
// O primeiro alvo rápido move a raquete em direção ao puck e exige CCD.
initial.puck = { x: 0.55, y: 0.5, vx: -1.2, vy: 0 };

let predicted = structuredClone(initial);
let authoritative = structuredClone(initial);
let now = 0;
const rapidTargets = [
  { x: 0.56, y: 0.5 },
  { x: 0.52, y: 0.53 },
  { x: 0.6, y: 0.45 },
  { x: 0.46, y: 0.58 },
  { x: 0.62, y: 0.42 },
];

for (const [index, target] of rapidTargets.entries()) {
  const input = { type: "move" as const, ...target, sequence: index + 1 };
  // A previsão recebe a mesma intenção que seria enviada ao servidor.
  predicted = engine.applyAction(predicted, input, localPlayerId);
  authoritative = engine.applyAction(authoritative, input, localPlayerId);

  for (let step = 0; step < 3; step += 1) {
    now += 16;
    predicted = engine.applyAction(predicted, { type: "tick", now }, "system");
    authoritative = engine.applyAction(authoritative, { type: "tick", now }, "system");
    assert.deepEqual(physicsSnapshot(predicted), physicsSnapshot(authoritative));
  }
}

assert.ok(predicted.impactSerial > 0, "A sequência de alvos deve produzir ao menos uma colisão.");
console.log("Air Hockey deterministic prediction test passed.");
