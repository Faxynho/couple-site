const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DrawGuessGame,
  DRAW_GUESS_ROUND_MS,
  getDrawGuessStateForPlayer,
  isValidDrawGuessCanvasAction,
  normalizeDrawGuessAnswer,
  resolveDrawGuessWinner,
  scoreDrawGuessRound,
} = require("../dist/games/drawguess/DrawGuessGame");

function fresh(rounds = 4, now = 1_000) {
  const game = new DrawGuessGame();
  return { game, state: game.createInitialState({ playerIds: ["p1", "p2"], difficulty: String(rounds), now }) };
}

function correct(game, state, now, id) {
  return game.applyAction(state, { type: "submitGuess", id: id || "guess-" + now, guess: state.word, now }, state.guesserId);
}

function advance(game, state, now) {
  return game.applyAction({ ...state, autoAdvanceAt: now }, { type: "advanceRound", now }, "system");
}

test("normaliza maiúsculas, acentos, hífens e espaços extras", () => {
  assert.equal(normalizeDrawGuessAnswer("  CACHORRO  "), "cachorro");
  assert.equal(normalizeDrawGuessAnswer("Guarda-Chuva"), "guarda chuva");
  assert.equal(normalizeDrawGuessAnswer("AVIÃO!!!"), "aviao");
});

test("pontua corretamente nas quatro faixas de tempo", () => {
  assert.deepEqual(scoreDrawGuessRound(55_000), { guesser: 100, drawer: 50 });
  assert.deepEqual(scoreDrawGuessRound(49_999), { guesser: 80, drawer: 40 });
  assert.deepEqual(scoreDrawGuessRound(42_000), { guesser: 80, drawer: 40 });
  assert.deepEqual(scoreDrawGuessRound(25_000), { guesser: 60, drawer: 30 });
  assert.deepEqual(scoreDrawGuessRound(9_000), { guesser: 40, drawer: 20 });
  assert.deepEqual(scoreDrawGuessRound(0), { guesser: 0, drawer: 0 });
  assert.deepEqual(scoreDrawGuessRound(100_000, 120_000), { guesser: 100, drawer: 50 });
  assert.deepEqual(scoreDrawGuessRound(70_000, 120_000), { guesser: 80, drawer: 40 });
});

test("aceita rodadas de dois minutos e preserva a duração ao reiniciar", () => {
  const game = new DrawGuessGame();
  const initial = game.createInitialState({ playerIds: ["p1", "p2"], difficulty: "6", roundDurationSeconds: "120", now: 1_000 });
  assert.equal(initial.roundDurationMs, 120_000);
  assert.equal(initial.roundDeadlineAt, 121_000);
  assert.equal(game.reset(initial).roundDurationMs, 120_000);
});

test("alterna desenhista e adivinhador a cada rodada", () => {
  const { game } = fresh();
  let state = game.createInitialState({ playerIds: ["p1", "p2"], difficulty: "4", now: 1_000 });
  assert.equal(state.drawerId, "p1");
  assert.equal(state.guesserId, "p2");
  state = correct(game, state, 6_000);
  state = advance(game, state, 9_000);
  assert.equal(state.currentRound, 2);
  assert.equal(state.drawerId, "p2");
  assert.equal(state.guesserId, "p1");
});

test("tentativa errada permanece no histórico e a correta encerra imediatamente", () => {
  const { game, state } = fresh();
  const wrong = game.applyAction(state, { type: "submitGuess", id: "wrong-1", guess: "banana", now: 2_000 }, "p2");
  assert.equal(wrong.phase, "playing");
  assert.equal(wrong.attempts.length, 1);
  assert.equal(wrong.attempts[0].correct, false);
  const solved = correct(game, wrong, 7_000, "right-1");
  assert.equal(solved.phase, "roundResult");
  assert.equal(solved.lastRoundResult.reason, "correct");
  assert.equal(solved.scores.p2, 100);
  assert.equal(solved.scores.p1, 50);
});

test("ignora tentativa duplicada e jogador errado tentando responder", () => {
  const { game, state } = fresh();
  const wrongRole = game.applyAction(state, { type: "submitGuess", id: "g1", guess: state.word, now: 2_000 }, "p1");
  assert.equal(wrongRole, state);
  const first = game.applyAction(state, { type: "submitGuess", id: "g1", guess: "errado", now: 2_000 }, "p2");
  const duplicate = game.applyAction(first, { type: "submitGuess", id: "g1", guess: state.word, now: 3_000 }, "p2");
  assert.equal(duplicate, first);
  assert.equal(duplicate.attempts.length, 1);
});

test("tempo esgotado dá zero e troca de rodada continua funcionando", () => {
  const { game, state } = fresh();
  const early = game.applyAction(state, { type: "timeUp", now: state.roundDeadlineAt - 1 }, "system");
  assert.equal(early, state);
  const ended = game.applyAction(state, { type: "timeUp", now: state.roundDeadlineAt }, "system");
  assert.equal(ended.lastRoundResult.reason, "timeUp");
  assert.equal(ended.scores.p1, 0);
  assert.equal(ended.scores.p2, 0);
  const next = advance(game, ended, ended.autoAdvanceAt);
  assert.equal(next.currentRound, 2);
  assert.equal(next.canvasActions.length, 0);
});

test("desempata por média, depois melhor acerto, e cria um par extra no empate total", () => {
  const { state } = fresh();
  const averageWinner = {
    ...state,
    scores: { p1: 200, p2: 200 },
    playerStats: {
      p1: { score: 200, correctGuesses: 2, totalGuessTimeMs: 20_000, bestGuessTimeMs: 8_000 },
      p2: { score: 200, correctGuesses: 2, totalGuessTimeMs: 30_000, bestGuessTimeMs: 5_000 },
    },
  };
  assert.equal(resolveDrawGuessWinner(averageWinner), "p1");
  const bestWinner = { ...averageWinner, playerStats: { ...averageWinner.playerStats, p2: { score: 200, correctGuesses: 2, totalGuessTimeMs: 20_000, bestGuessTimeMs: 5_000 } } };
  assert.equal(resolveDrawGuessWinner(bestWinner), "p2");

  const { game } = fresh();
  const tied = { ...state, currentRound: 4, totalRounds: 4, phase: "roundResult", autoAdvanceAt: 10_000 };
  const extra = game.applyAction(tied, { type: "advanceRound", now: 10_000 }, "system");
  assert.equal(extra.currentRound, 5);
  assert.equal(extra.totalRounds, 6);
  assert.equal(extra.tiebreakPairs, 1);
  assert.equal(extra.drawerId, "p1");
});

test("encerra a partida com vencedor quando o último avanço encontra placar diferente", () => {
  const { game, state } = fresh();
  const ready = { ...state, currentRound: 4, totalRounds: 4, phase: "roundResult", autoAdvanceAt: 9_000, scores: { p1: 90, p2: 120 } };
  const finished = game.applyAction(ready, { type: "advanceRound", now: 9_000 }, "system");
  assert.equal(finished.phase, "finished");
  assert.equal(finished.winnerId, "p2");
  assert.equal(game.isSolved(finished), true);
});

test("a palavra verdadeira só é enviada ao desenhista durante a rodada", () => {
  const { state } = fresh();
  const drawer = getDrawGuessStateForPlayer(state, "p1", 2_000);
  const guesser = getDrawGuessStateForPlayer(state, "p2", 2_000);
  assert.equal(drawer.word, state.word);
  assert.equal(guesser.word, null);
  assert.ok(guesser.maskedWord.includes("_"));
  assert.equal("wordId" in guesser, false);
  assert.equal("usedWordIds" in guesser, false);
});

test("valida stroke, formas, flood fill e limite de payload", () => {
  const stroke = { id: "stroke-1", kind: "stroke", tool: "brush", color: "#112233", size: 0.01, points: [{ x: 0.1, y: 0.2 }, { x: 0.2, y: 0.3 }] };
  assert.equal(isValidDrawGuessCanvasAction(stroke), true);
  assert.equal(isValidDrawGuessCanvasAction({ id: "shape-1", kind: "shape", shape: "ellipse", color: "#112233", size: 0.01, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }), true);
  assert.equal(isValidDrawGuessCanvasAction({ id: "fill-1", kind: "fill", color: "#abcdef", point: { x: 0.5, y: 0.5 } }), true);
  assert.equal(isValidDrawGuessCanvasAction({ ...stroke, points: Array.from({ length: 321 }, () => ({ x: 0.1, y: 0.1 })) }), false);
  assert.equal(isValidDrawGuessCanvasAction({ ...stroke, color: "red" }), false);
});

test("somente o desenhista altera o canvas; undo, redo e clear são autoritativos", () => {
  const { game, state } = fresh();
  const stroke = { id: "stroke-1", kind: "stroke", tool: "brush", color: "#112233", size: 0.01, points: [{ x: 0.1, y: 0.2 }] };
  const denied = game.applyAction(state, { type: "draw", action: stroke }, "p2");
  assert.equal(denied, state);
  const drawn = game.applyAction(state, { type: "draw", action: stroke }, "p1");
  assert.equal(drawn.canvasActions.length, 1);
  const duplicate = game.applyAction(drawn, { type: "draw", action: stroke }, "p1");
  assert.equal(duplicate, drawn);
  const undone = game.applyAction(drawn, { type: "undo" }, "p1");
  assert.equal(undone.canvasActions.length, 0);
  assert.equal(undone.redoActions.length, 1);
  const redone = game.applyAction(undone, { type: "redo" }, "p1");
  assert.equal(redone.canvasActions.length, 1);
  const cleared = game.applyAction(redone, { type: "clear", id: "clear-1" }, "p1");
  assert.equal(cleared.canvasActions.at(-1).kind, "clear");
});

test("desconexão pausa e reconexão desloca o relógio sem perder estado", () => {
  const { game, state } = fresh();
  const paused = { ...game.releasePlayer(state, "p2"), pausedAt: 5_000 };
  const resumed = game.applyAction(paused, { type: "resume", now: 9_000 }, "system");
  assert.equal(resumed.pausedAt, null);
  assert.equal(resumed.roundStartedAt, state.roundStartedAt + 4_000);
  assert.equal(resumed.roundDeadlineAt, state.roundDeadlineAt + 4_000);
  assert.equal(resumed.roundDeadlineAt - resumed.roundStartedAt, DRAW_GUESS_ROUND_MS);
});
