const test = require("node:test");
const assert = require("node:assert/strict");

const { minigameGlobalReward } = require("../dist/idle/idleConfig.js");
const { minigameRewardDecision } = require("../dist/accounts/gameResult.js");

test("tabela de recompensas considera a configuração real de cada minigame", () => {
  const expected = {
    colors: { easy: 8, hard: 13 },
    termo: { one: 8, dueto: 13, quarteto: 20 },
    memory: { easy: 8, medium: 13, hard: 19 },
    airhockey: { easy: 10, medium: 16, hard: 23 },
    quiz: { easy: 10, medium: 16, hard: 23 },
    whoami: { easy: 10, medium: 15, hard: 21 },
    sudoku: { easy: 12, medium: 19, hard: 28 },
    crossword: { easy: 12, medium: 19, hard: 28 },
    wordsearch: { easy: 10, medium: 16, hard: 23 },
    puzzle: { easy: 12, medium: 20, hard: 30 },
    chess: { easy: 12, medium: 20, hard: 30 },
    boardrace: { geral: 18 },
    drawguess: { "4": 16, "6": 22, "8": 28 },
    casino: { quick: 16, normal: 24, long: 34 },
    rpg: { geral: 24 },
  };
  for (const [gameId, ranks] of Object.entries(expected)) {
    for (const [rank, reward] of Object.entries(ranks)) assert.equal(minigameGlobalReward(gameId, rank), reward, `${gameId}/${rank}`);
  }
});

test("Duo válido paga uma única recompensa compartilhada", () => {
  const decision = minigameRewardDecision({
    roomMode: "duo", gameId: "sudoku", rank: "hard", durationMs: 45_000,
    players: [
      { accountId: "andre", result: "win", metricValue: 1 },
      { accountId: "flavia", result: "win", metricValue: 1 },
    ],
  });
  assert.deepEqual(decision, { reward: 28, advanceObjective: true });
});

test("Duo incompleto ou com visitante não contamina a carteira compartilhada", () => {
  const decision = minigameRewardDecision({
    roomMode: "duo", gameId: "quiz", rank: "hard", durationMs: 45_000,
    players: [{ accountId: "andre", result: "win", metricValue: 10 }],
  });
  assert.deepEqual(decision, { reward: 0, advanceObjective: false });
});

test("Flávia solo recebe 100% na conclusão e cerca de 30% numa derrota jogada", () => {
  const win = minigameRewardDecision({ roomMode: "solo", gameId: "chess", rank: "hard", durationMs: 60_000, players: [{ accountId: "flavia", result: "win", metricValue: 1 }] });
  const loss = minigameRewardDecision({ roomMode: "solo", gameId: "chess", rank: "hard", durationMs: 60_000, players: [{ accountId: "flavia", result: "loss", metricValue: null }] });
  assert.deepEqual(win, { reward: 30, advanceObjective: true });
  assert.deepEqual(loss, { reward: 9, advanceObjective: true });
});

test("abandono imediato da Flávia e qualquer solo do André pagam zero e não avançam objetivo", () => {
  const abandoned = minigameRewardDecision({ roomMode: "solo", gameId: "quiz", rank: "hard", durationMs: 5_000, players: [{ accountId: "flavia", result: "loss", metricValue: null }] });
  const andre = minigameRewardDecision({ roomMode: "solo", gameId: "quiz", rank: "hard", durationMs: 90_000, players: [{ accountId: "andre", result: "win", metricValue: 15 }] });
  assert.deepEqual(abandoned, { reward: 0, advanceObjective: false });
  assert.deepEqual(andre, { reward: 0, advanceObjective: false });
});

test("desafio solo sem derrota tradicional paga Flávia apenas quando concluído", () => {
  const solved = minigameRewardDecision({ roomMode: "solo", gameId: "puzzle", rank: "medium", durationMs: 40_000, players: [{ accountId: "flavia", result: "solo", metricValue: 40_000 }] });
  const unfinished = minigameRewardDecision({ roomMode: "solo", gameId: "puzzle", rank: "medium", durationMs: 40_000, players: [{ accountId: "flavia", result: "solo", metricValue: null }] });
  assert.deepEqual(solved, { reward: 20, advanceObjective: true });
  assert.deepEqual(unfinished, { reward: 0, advanceObjective: false });
});
