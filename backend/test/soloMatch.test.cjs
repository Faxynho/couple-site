const test = require("node:test");
const assert = require("node:assert/strict");
const { isFinishedSoloState, isSoloResumePayload, rebaseSoloState } = require("../dist/solo/soloMatch");

test("rebaseSoloState pausa timestamps absolutos sem alterar durações", () => {
  const state = {
    startedAt: 1_700_000_000_000,
    timeMs: 42_000,
    nested: { deadlineAt: 1_700_000_010_000, mismatchUntil: 1_700_000_002_000 },
  };
  const restored = rebaseSoloState(state, 1_700_000_005_000, 1_700_000_015_000);
  assert.equal(restored.startedAt, state.startedAt + 10_000);
  assert.equal(restored.nested.deadlineAt, state.nested.deadlineAt + 10_000);
  assert.equal(restored.nested.mismatchUntil, state.nested.mismatchUntil + 10_000);
  assert.equal(restored.timeMs, 42_000);
  assert.notEqual(restored, state);
});

test("identifica estados concluídos conforme a arquitetura de cada jogo", () => {
  assert.equal(isFinishedSoloState("puzzle", { solved: true }), true);
  assert.equal(isFinishedSoloState("chess", { result: { winnerId: "p1" } }), true);
  assert.equal(isFinishedSoloState("rpg", { phase: "finished" }), true);
  assert.equal(isFinishedSoloState("airhockey", { phase: "playing" }), false);
  assert.equal(isFinishedSoloState("sudoku", { finished: false }), false);
});

test("valida o envelope de restauração e rejeita estado finalizado ou malformado", () => {
  const payload = {
    version: 1, ownerId: "andre", gameId: "termo", gameName: "Termo",
    roomCode: "ABCDE", playerId: "player-1", playerName: "André",
    savedAt: Date.now(), state: { finished: false },
  };
  assert.equal(isSoloResumePayload(payload), true);
  assert.equal(isSoloResumePayload({ ...payload, gameId: "desconhecido" }), false);
  assert.equal(isFinishedSoloState(payload.gameId, payload.state), false);
});
