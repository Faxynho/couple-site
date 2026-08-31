import assert from "node:assert/strict";
import { AirHockeyGame, AirHockeyState } from "./AirHockeyGame";

const localPlayerId = "LOCAL";
const remotePlayerId = "REMOTE";
const engine = new AirHockeyGame();

function initialState(): AirHockeyState {
  const state = engine.createInitialState({ mode: "duel", playerIds: [localPlayerId, remotePlayerId] });
  state.phase = "playing";
  state.phaseEndsAt = null;
  state.lastTickAt = 0;
  // A posição reproduz uma aproximação que cruza a raquete dentro de 48 ms.
  state.puck = { x: .65, y: .5, vx: -1.2, vy: 0 };
  return engine.applyAction(state, { type: "move", x: .6, y: .5, sequence: 1 }, localPlayerId);
}

let one48msTick = initialState();
one48msTick = engine.applyAction(one48msTick, { type: "tick", now: 48 }, "system");

let three16msTicks = initialState();
for (const now of [16, 32, 48]) {
  three16msTicks = engine.applyAction(three16msTicks, { type: "tick", now }, "system");
}

const paddleAfterOneTick = one48msTick.paddles[localPlayerId];
const paddleAfterThreeTicks = three16msTicks.paddles[localPlayerId];

assert.equal(one48msTick.lastTickAt, 48);
assert.equal(three16msTicks.lastTickAt, 48);
assert.notEqual(paddleAfterOneTick.x, paddleAfterThreeTicks.x, "Um tick com now=48 é limitado a 33 ms de física; três ticks de 16 ms avançam 48 ms.");
assert.notEqual(one48msTick.puck.x, three16msTicks.puck.x, "A partição do tick altera a trajetória do puck.");
assert.equal(one48msTick.impactSerial, 0, "O passo limitado de 33 ms ainda não alcança a colisão deste cenário.");
assert.ok(three16msTicks.impactSerial > 0, "Três passos de 16 ms alcançam a colisão no mesmo intervalo de relógio.");

console.log("Air Hockey tick partition test passed.");
