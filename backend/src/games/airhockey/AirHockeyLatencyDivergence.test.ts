import assert from "node:assert/strict";
import { AirHockeyGame, AirHockeyState } from "./AirHockeyGame";
import { advanceAirHockeyInputTimeline, AIR_HOCKEY_AUTHORITATIVE_DELAY_MS, QueuedAirHockeyInput } from "./AirHockeyInputTimeline";

const localPlayerId = "LOCAL";
const remotePlayerId = "REMOTE";
const engine = new AirHockeyGame();
const simulationStepMs = 16;

type Input = { simulationTick: number; x: number; y: number; sequence: number };

function initialState(puck: AirHockeyState["puck"]): AirHockeyState {
  const state = engine.createInitialState({ mode: "duel", playerIds: [localPlayerId, remotePlayerId] });
  state.phase = "playing";
  state.phaseEndsAt = null;
  state.lastTickAt = 0;
  state.puck = puck;
  return state;
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

function makeDriver(state: AirHockeyState) {
  let current = structuredClone(state);
  return {
    getState: () => current,
    apply: (action: Parameters<AirHockeyGame["applyAction"]>[1], playerId: string) => {
      current = engine.applyAction(current, action, playerId);
    },
  };
}

function runScenario(name: string, latencies: number[], puck: AirHockeyState["puck"]) {
  const inputs: Input[] = [
    { simulationTick: 0, x: .6, y: .5, sequence: 1 },
    { simulationTick: 16, x: .62, y: .5, sequence: 2 },
    { simulationTick: 32, x: .58, y: .5, sequence: 3 },
    { simulationTick: 48, x: .64, y: .5, sequence: 4 },
    { simulationTick: 64, x: .6, y: .5, sequence: 5 },
  ];
  const horizon = 160;

  let predicted = initialState(puck);
  const predictedByTick = new Map<number, AirHockeyState>();
  let predictedImpactAt: number | null = null;
  for (let tick = 0; tick <= horizon; tick += simulationStepMs) {
    if (tick > 0) predicted = engine.applyAction(predicted, { type: "tick", now: tick }, "system");
    for (const input of inputs.filter((item) => item.simulationTick === tick)) {
      predicted = engine.applyAction(predicted, { type: "move", x: input.x, y: input.y, sequence: input.sequence }, localPlayerId);
    }
    if (predictedImpactAt === null && predicted.impactSerial > 0) predictedImpactAt = tick;
    predictedByTick.set(tick, structuredClone(predicted));
  }

  const driver = makeDriver(initialState(puck));
  const queue: QueuedAirHockeyInput[] = [];
  let receivedOrder = 0;
  let previousWallTick = -simulationStepMs;
  let authoritativeImpactAt: number | null = null;
  const lateInputs: ReturnType<typeof advanceAirHockeyInputTimeline>["lateInputs"] = [];
  const acknowledgements = new Map<number, number>();

  for (let wallTick = 0; wallTick <= horizon + AIR_HOCKEY_AUTHORITATIVE_DELAY_MS; wallTick += simulationStepMs) {
    for (const [index, input] of inputs.entries()) {
      const arrival = input.simulationTick + latencies[index % latencies.length];
      if (arrival > previousWallTick && arrival <= wallTick) {
        queue.push({ ...input, playerId: localPlayerId, receivedAt: arrival, receivedOrder: ++receivedOrder });
      }
    }
    previousWallTick = wallTick;
    const authoritativeTick = wallTick - AIR_HOCKEY_AUTHORITATIVE_DELAY_MS;
    if (authoritativeTick < 0) continue;

    const result = advanceAirHockeyInputTimeline(driver, queue, authoritativeTick);
    queue.splice(0, queue.length, ...result.remaining);
    lateInputs.push(...result.lateInputs);
    const authoritative = driver.getState();
    const predictedAtSameTick = predictedByTick.get(authoritativeTick);
    assert.ok(predictedAtSameTick, `${name}: faltou estado previsto para o tick ${authoritativeTick}.`);
    assert.deepEqual(physics(authoritative), physics(predictedAtSameTick), `${name}: cliente e servidor divergiram no tick físico ${authoritativeTick}.`);
    assert.equal(authoritative.lastTickAt, authoritativeTick, `${name}: snapshots/ticks autoritativos devem ser monotônicos e refletir a simulação atrasada.`);
    acknowledgements.set(authoritativeTick, authoritative.lastProcessedInputSequence[localPlayerId] ?? 0);
    if (authoritativeImpactAt === null && authoritative.impactSerial > 0) authoritativeImpactAt = authoritativeTick;
  }

  assert.equal(lateInputs.length, 0, `${name}: a janela de ${AIR_HOCKEY_AUTHORITATIVE_DELAY_MS} ms deve absorver a latência normal.`);
  assert.equal(driver.getState().lastProcessedInputSequence[localPlayerId], inputs.length, `${name}: cada sequence deve ser processada uma única vez.`);
  assert.equal(acknowledgements.get(48), 4, `${name}: sequence só é reconhecida depois do tick físico que a aplicou.`);
  assert.equal(predictedImpactAt, authoritativeImpactAt, `${name}: a colisão deve ocorrer no mesmo simulationTick.`);
  assert.ok(predictedImpactAt !== null, `${name}: cenário precisa exercitar colisão rápida.`);
  return { predictedImpactAt, authoritativeImpactAt };
}

// 80 ms é a menor margem arredondada acima do pior jitter medido (70 ms),
// mantendo ao menos 10 ms de folga antes de o servidor alcançar o input.
assert.equal(AIR_HOCKEY_AUTHORITATIVE_DELAY_MS, 80);
const normalPuck = { x: .75, y: .5, vx: -1.2, vy: 0 };
const zeroLatency = runScenario("0 ms", [0], normalPuck);
const thirtyMsLatency = runScenario("30 ms", [30], normalPuck);
const sixtyMsLatency = runScenario("60 ms", [60], normalPuck);
const jitterLatency = runScenario("jitter 40-70 ms", [40, 70, 45, 65, 50], normalPuck);
const highSpeed = runScenario("puck e paddle rápidos", [40, 70, 45, 65, 50], { x: .86, y: .5, vx: -2.3, vy: 0 });

assert.equal(zeroLatency.predictedImpactAt, sixtyMsLatency.predictedImpactAt);
assert.equal(thirtyMsLatency.predictedImpactAt, jitterLatency.predictedImpactAt);
assert.ok(highSpeed.predictedImpactAt !== null);

// Acima da margem não há rollback nesta primeira versão: o input entra no
// tick atual, é sinalizado e só então seu sequence é confirmado.
const lateDriver = makeDriver(initialState(normalPuck));
advanceAirHockeyInputTimeline(lateDriver, [], 32);
const lateResult = advanceAirHockeyInputTimeline(lateDriver, [{
  playerId: localPlayerId,
  x: .6,
  y: .5,
  sequence: 1,
  simulationTick: 0,
  receivedAt: 100,
  receivedOrder: 1,
}], 32);
assert.equal(lateResult.lateInputs.length, 1);
assert.equal(lateResult.lateInputs[0].latenessMs, 32);
assert.equal(lateDriver.getState().lastProcessedInputSequence[localPlayerId], 1);

console.log("Air Hockey delayed authoritative timeline test passed.", {
  zeroLatency,
  thirtyMsLatency,
  sixtyMsLatency,
  jitterLatency,
  highSpeed,
});
