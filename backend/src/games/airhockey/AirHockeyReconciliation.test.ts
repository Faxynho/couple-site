import assert from "node:assert/strict";
import { AirHockeyGame, AirHockeyState } from "./AirHockeyGame";

type PendingInput = { x: number; y: number; sequence: number };

const localPlayerId = "LOCAL";
const remotePlayerId = "REMOTE";
const engine = new AirHockeyGame();

function advance(state: AirHockeyState, elapsedMs: number) {
  let next = structuredClone(state);
  let now = next.lastTickAt;
  for (let elapsed = 0; elapsed < elapsedMs; elapsed += 16) {
    now += 16;
    next = engine.applyAction(next, { type: "tick", now }, "system");
  }
  return next;
}

function replaySnapshot(snapshot: AirHockeyState, pendingInputs: PendingInput[], snapshotAgeMs: number) {
  let predicted = structuredClone(snapshot);
  for (const input of pendingInputs) {
    predicted = engine.applyAction(predicted, { type: "move", ...input }, localPlayerId);
  }
  return advance(predicted, snapshotAgeMs);
}

function physics(state: AirHockeyState) {
  const paddle = state.paddles[localPlayerId];
  return {
    paddle: { x: paddle.x, y: paddle.y, vx: paddle.vx, vy: paddle.vy },
    puck: { ...state.puck },
  };
}

const initial = engine.createInitialState({ mode: "duel", playerIds: [localPlayerId, remotePlayerId] });
initial.phase = "playing";
initial.phaseEndsAt = null;
initial.lastTickAt = 0;
initial.puck = { x: 0.55, y: 0.5, vx: -1.2, vy: 0 };

const input = { x: 0.56, y: 0.5, sequence: 1 };
// O snapshot é anterior ao contato: o hit só surge durante replay + avanço.
const clientPrediction = replaySnapshot(initial, [input], 64);
assert.ok(clientPrediction.impactSerial > initial.impactSerial, "O replay deve reproduzir a colisão paddle/puck.");

const reconstructedFromOldSnapshot = replaySnapshot(initial, [input], 64);
assert.deepEqual(physics(reconstructedFromOldSnapshot), physics(clientPrediction));

// Snapshot seguinte: o servidor já processou a mesma intenção no tick 32.
let authoritativeAt32 = engine.applyAction(structuredClone(initial), { type: "move", ...input }, localPlayerId);
authoritativeAt32 = advance(authoritativeAt32, 32);
const reconstructedFromNextSnapshot = replaySnapshot(authoritativeAt32, [], 32);
assert.deepEqual(physics(reconstructedFromNextSnapshot), physics(clientPrediction));

// Um serial que avança por uma parede não muda o pipeline de replay.
const wallBase = structuredClone(authoritativeAt32);
wallBase.puck = { x: 0.8, y: 0.04, vx: 0.2, vy: -1 };
const wallSnapshot = advance(wallBase, 16);
assert.ok(wallSnapshot.impactSerial > wallBase.impactSerial, "O cenário deve registrar uma colisão de parede.");
assert.equal(wallSnapshot.impactKind, "wall");
const wallExpected = advance(wallSnapshot, 16);
const wallReplayed = replaySnapshot(wallSnapshot, [], 16);
assert.deepEqual(physics(wallReplayed), physics(wallExpected));

console.log("Air Hockey impact reconciliation test passed.");
