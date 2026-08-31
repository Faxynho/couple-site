import assert from "node:assert/strict";
import { AirHockeyGame, AirHockeyState } from "./AirHockeyGame";

type TimedInput = { sequence: number; x: number; y: number; simulationTick: number };

const localPlayerId = "LOCAL";
const remotePlayerId = "REMOTE";
const engine = new AirHockeyGame();
const clientStepMs = 1000 / 60;

function advance(state: AirHockeyState, elapsedMs: number) {
  let next = structuredClone(state);
  let remaining = elapsedMs;
  while (remaining > 0.001 && next.phase !== "finished") {
    const step = Math.min(clientStepMs, remaining);
    next = engine.applyAction(next, { type: "tick", now: next.lastTickAt + step }, "system");
    remaining -= step;
  }
  return next;
}

function simulateProgressively(snapshot: AirHockeyState, inputs: TimedInput[], presentTick: number) {
  let state = structuredClone(snapshot);
  let currentTick = state.lastTickAt;
  for (const input of inputs) {
    state = advance(state, input.simulationTick - currentTick);
    currentTick = input.simulationTick;
    state = engine.applyAction(state, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, localPlayerId);
  }
  return advance(state, presentTick - currentTick);
}

function replayFromSnapshot(snapshot: AirHockeyState, pendingInputs: TimedInput[], snapshotAgeMs: number) {
  let state = structuredClone(snapshot);
  const snapshotTick = state.lastTickAt;
  const presentTick = snapshotTick + snapshotAgeMs;
  let currentTick = snapshotTick;
  for (const input of pendingInputs) {
    if (input.simulationTick <= currentTick) {
      state = engine.applyAction(state, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, localPlayerId);
      continue;
    }
    if (input.simulationTick > presentTick) continue;
    state = advance(state, input.simulationTick - currentTick);
    currentTick = input.simulationTick;
    state = engine.applyAction(state, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, localPlayerId);
  }
  return advance(state, presentTick - currentTick);
}

function physics(state: AirHockeyState) {
  const paddle = state.paddles[localPlayerId];
  return {
    paddle: { x: paddle.x, y: paddle.y, vx: paddle.vx, vy: paddle.vy },
    puck: { ...state.puck },
    paddleContact: { ...state.paddleContact },
    impactSerial: state.impactSerial,
  };
}

function assertEquivalent(actual: AirHockeyState, replayed: AirHockeyState, name: string) {
  assert.deepEqual(physics(replayed), physics(actual), `${name}: replay temporal divergiu da simulação progressiva.`);
}

function initialState(puck: AirHockeyState["puck"]) {
  const state = engine.createInitialState({ mode: "duel", playerIds: [localPlayerId, remotePlayerId] });
  state.phase = "playing";
  state.phaseEndsAt = null;
  state.lastTickAt = 0;
  state.puck = puck;
  return state;
}

function targets(points: Array<{ x: number; y: number }>): TimedInput[] {
  return points.map((point, index) => ({ ...point, sequence: index + 1, simulationTick: (index + 1) * 16 }));
}

function verifyScenario(name: string, snapshot: AirHockeyState, pendingInputs: TimedInput[]) {
  const presentTick = 128;
  const progressive = simulateProgressively(snapshot, pendingInputs, presentTick);
  const replayed = replayFromSnapshot(snapshot, pendingInputs, presentTick - snapshot.lastTickAt);
  assertEquivalent(progressive, replayed, name);
  return progressive;
}

verifyScenario(
  "movimento lento",
  initialState({ x: 1.22, y: 0.2, vx: 0.2, vy: 0 }),
  targets([{ x: .39, y: .5 }, { x: .4, y: .51 }, { x: .41, y: .52 }, { x: .42, y: .51 }, { x: .43, y: .5 }, { x: .44, y: .49 }, { x: .45, y: .5 }, { x: .46, y: .51 }]),
);

verifyScenario(
  "movimento rápido sem colisão",
  initialState({ x: 1.38, y: 0.1, vx: 0.15, vy: 0 }),
  targets([{ x: .7, y: .8 }, { x: .48, y: .2 }, { x: .7, y: .76 }, { x: .46, y: .24 }, { x: .7, y: .72 }, { x: .44, y: .28 }, { x: .68, y: .7 }, { x: .45, y: .3 }]),
);

const fastCollision = verifyScenario(
  "movimento rápido com colisão",
  initialState({ x: .55, y: .5, vx: -1.2, vy: 0 }),
  targets([{ x: .62, y: .5 }, { x: .68, y: .54 }, { x: .6, y: .46 }, { x: .7, y: .56 }, { x: .58, y: .44 }, { x: .7, y: .58 }, { x: .56, y: .42 }, { x: .68, y: .6 }]),
);
assert.ok(fastCollision.impactSerial > 0, "O cenário rápido obrigatório deve produzir colisão paddle/puck.");

verifyScenario(
  "puck em velocidade alta",
  initialState({ x: .65, y: .5, vx: -2.3, vy: .12 }),
  targets([{ x: .7, y: .5 }, { x: .64, y: .54 }, { x: .7, y: .46 }, { x: .62, y: .56 }, { x: .7, y: .44 }, { x: .6, y: .58 }, { x: .68, y: .42 }, { x: .58, y: .6 }]),
);

console.log("Air Hockey temporal replay test passed.");
