const assert = require("node:assert/strict");
const test = require("node:test");
const { BoardRaceGame, getBoardRaceStateForPlayer } = require("../dist/games/boardrace/BoardRaceGame");
const { BOARD_RACE_SPACES } = require("../dist/games/boardrace/boardConfig");
const { Room } = require("../dist/rooms/Room");

function withRandom(values, callback) {
  const original = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)] ?? 0;
  try { return callback(); } finally { Math.random = original; }
}

function duel() {
  const game = new BoardRaceGame();
  const state = game.createInitialState({ mode: "duel", playerIds: ["p1", "p2"] });
  state.phase = "awaitingRoll";
  return { game, state };
}

test("o percurso declarativo tem início, 30 casas e maioria de casas normais", () => {
  assert.equal(BOARD_RACE_SPACES[0].type, "start");
  assert.equal(BOARD_RACE_SPACES.at(-1).index, 30);
  assert.equal(BOARD_RACE_SPACES.at(-1).type, "finish");
  assert.ok(BOARD_RACE_SPACES.filter((space) => space.type === "normal").length >= 12);
});

test("dado tradicional move passo a passo e excesso é limitado à chegada", () => {
  const { game, state } = duel();
  state.players.p1.position = 28;
  const next = withRandom([0.999], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.dice.value, 6);
  assert.equal(next.players.p1.position, 30);
  assert.deepEqual(next.lastMove.path, [29, 30]);
  assert.equal(next.winnerId, "p1");
  assert.equal(next.phase, "finished");
});

test("recuo não executa o efeito da casa de destino", () => {
  const { game, state } = duel();
  state.players.p1.position = 7;
  const next = withRandom([0, 0.4], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.position, 6);
  assert.equal(next.players.p1.pendingQuiz, null, "a casa Quiz 6 não deve disparar após penalidade para trás");
  assert.deepEqual(next.lastMove.path, [8, 7, 6]);
});

test("avanço encadeia a casa positiva de destino e surpresa respeita o fluxo", () => {
  const { game, state } = duel();
  state.players.p1.position = 3;
  let next = withRandom([0, 0.4, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.position, 6);
  assert.ok(next.players.p1.pendingQuiz, "avanço até a casa 6 deve encadear o Quiz");

  const fresh = duel();
  fresh.state.players.p1.position = 9;
  next = withRandom([0, 0, 0], () => fresh.game.applyAction(fresh.state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.position, 12);
  assert.equal(next.players.p1.skipNextTurn, true, "surpresa positiva deve encadear a prisão de destino");
});

test("tesouro concede poder e Impulso/Armadilha alteram somente o próximo movimento", () => {
  const { game, state } = duel();
  state.players.p1.position = 1;
  let next = withRandom([0, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.deepEqual(next.players.p1.powers, ["boost"]);

  next.currentPlayerId = "p1";
  next.phase = "awaitingRoll";
  next = game.applyAction(next, { type: "usePower", powerId: "boost" }, "p1");
  next = withRandom([0], () => game.applyAction(next, { type: "roll" }, "p1"));
  assert.equal(next.dice.total, 3);
  assert.equal(next.players.p1.rollBonus, 0);

  next.players.p1.powers = ["snare"];
  next.currentPlayerId = "p1";
  next.phase = "awaitingRoll";
  next = game.applyAction(next, { type: "usePower", powerId: "snare", targetPlayerId: "p2" }, "p1");
  assert.equal(next.players.p2.pendingRollPenalty, 2);
  assert.deepEqual(next.players.p1.powers, []);
});

test("prisão não acumula e consome exatamente a próxima jogada", () => {
  const { game, state } = duel();
  state.players.p1.position = 11;
  let next = withRandom([0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.skipNextTurn, true);
  next.phase = "awaitingRoll";
  next.currentPlayerId = "p2";
  next = withRandom([0], () => game.applyAction(next, { type: "roll" }, "p2"));
  next.phaseReadyAt = 0;
  next = game.applyAction(next, { type: "tick" }, "system");
  assert.equal(next.players.p1.skipNextTurn, false);
  assert.equal(next.currentPlayerId, "p2");
  assert.equal(next.phase, "turnStart");
  assert.equal(next.lastMove, null, "reconnect não deve reapresentar o movimento anterior durante a prisão");
});

test("Quiz usa uma pergunta média com quatro alternativas e bloqueia o dado", () => {
  const { game, state } = duel();
  state.players.p1.position = 5;
  let next = withRandom([0, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  const quiz = next.players.p1.pendingQuiz;
  assert.equal(quiz.difficulty, "medium");
  assert.equal(quiz.options.length, 4);
  next.currentPlayerId = "p1";
  next.phase = "awaitingQuiz";
  const publicState = getBoardRaceStateForPlayer(next, "p1");
  assert.equal("correctIndex" in publicState.players.p1.pendingQuiz, false);
  const correct = game.applyAction(next, { type: "answerQuiz", optionIndex: quiz.correctIndex }, "p1");
  assert.equal(correct.phase, "awaitingRoll");
  assert.equal(correct.players.p1.pendingQuiz, null);
});

test("escudo bloqueia só o próximo efeito negativo e poderes respeitam o limite 2", () => {
  const { game, state } = duel();
  state.players.p1.position = 7;
  state.players.p1.shieldActive = true;
  let next = withRandom([0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.position, 8);
  assert.equal(next.players.p1.shieldActive, false);

  next.players.p1.powers = ["boost", "shield"];
  next.players.p1.position = 1;
  next.currentPlayerId = "p1";
  next.phase = "awaitingRoll";
  next = withRandom([0, 0], () => game.applyAction(next, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.powers.length, 2);
});

test("os cinco minijogos reutilizam seus motores em modo de desafio", () => {
  for (let kindIndex = 0; kindIndex < 5; kindIndex += 1) {
    const { game, state } = duel();
    state.players.p1.position = 13;
    const fraction = (kindIndex + 0.01) / 5;
    const next = withRandom([0, fraction], () => game.applyAction(state, { type: "roll" }, "p1"));
    assert.equal(next.phase, "moving", "o desafio só deve abrir após a apresentação do movimento");
    assert.ok(next.pendingMinigame.state);
    assert.equal(next.pendingMinigame.kind, ["rpg", "termo", "memory", "crossword", "wordsearch"][kindIndex]);
    assert.ok(next.pendingMinigame.readyAt > next.phaseReadyAt, "a contagem começa depois do movimento");
    next.phaseReadyAt = 0;
    const opened = game.applyAction(next, { type: "tick" }, "system");
    assert.equal(opened.phase, "minigame");
  }
});

test("a contagem do minijogo é autoritativa e preserva a prévia da Memória para os dois clientes", () => {
  const { game, state } = duel();
  state.players.p1.position = 13;
  const next = withRandom([0, 0.45], () => game.applyAction(state, { type: "roll" }, "p1"));
  const challenge = next.pendingMinigame;
  assert.equal(challenge.kind, "memory");
  assert.ok(challenge.readyAt - next.phaseReadyAt >= 3_900);
  assert.ok(challenge.state.previewEndsAt > challenge.readyAt, "a prévia só termina depois da contagem compartilhada");

  next.phaseReadyAt = 0;
  const opened = game.applyAction(next, { type: "tick" }, "system");
  assert.equal(opened.phase, "minigame");
  assert.equal(opened.pendingMinigame.state.playStartedAt, null);
  const slotId = opened.pendingMinigame.state.slots.find((slot) => slot.iconId)?.id;
  const blocked = game.applyAction(opened, { type: "minigameAction", action: { type: "flipCard", slotId } }, "p1");
  assert.equal(blocked, opened, "nenhum cliente pode agir antes do readyAt do servidor");
});

test("vitória no minijogo concede turno extra ao desafiante", () => {
  const { game, state } = duel();
  state.players.p1.position = 13;
  let next = withRandom([0, 0.45], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.pendingMinigame.kind, "memory");
  next.phase = "minigame";
  next.pendingMinigame.readyAt = 0;
  next.pendingMinigame.state.finished = true;
  next.pendingMinigame.state.results = [
    { playerId: "p1", place: 1, score: 100, pairsFound: 4, timeUsedMs: 1000, completed: true },
    { playerId: "p2", place: 2, score: 80, pairsFound: 4, timeUsedMs: 1200, completed: true },
  ];
  next = game.applyAction(next, { type: "tick" }, "system");
  assert.equal(next.pendingMinigame, null);
  assert.equal(next.currentPlayerId, "p1");
  assert.equal(next.phase, "turnStart");
  assert.equal(next.lastMove, null);
});

test("BOT faz seu turno automaticamente", () => {
  const game = new BoardRaceGame();
  const state = game.createInitialState({ mode: "solo", playerIds: ["human"] });
  state.currentPlayerId = "BOT";
  state.phase = "awaitingRoll";
  state.phaseReadyAt = 0;
  const next = withRandom([0.5], () => game.applyAction(state, { type: "tick" }, "system"));
  assert.equal(next.dice.rolledBy, "BOT");
  assert.ok(next.players.BOT.position > 0);
});

test("o turno reserva tempo para dado, percurso e feedback antes de liberar o próximo jogador", () => {
  const { game, state } = duel();
  const startedAt = Date.now();
  const next = withRandom([0.5], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.currentPlayerId, "p2");
  assert.equal(next.phase, "turnStart");
  assert.ok(next.phaseReadyAt - startedAt >= 650 + next.lastMove.path.length * 420 + 700);
  const unchanged = game.applyAction(next, { type: "tick" }, "system");
  assert.equal(unchanged.phase, "turnStart", "o próximo jogador não pode agir durante a apresentação");
});

test("Room mantém a partida de tabuleiro autoritativa durante reconnect", () => {
  const room = new Room("ABCDE", "duo", "boardrace");
  room.addPlayer("p1", "Um");
  room.addPlayer("p2", "Dois");
  room.startGame();
  const state = room.gameState;
  state.phase = "awaitingRoll";
  room.applyAction({ type: "roll" }, "p2");
  assert.equal(room.gameState.dice.serial, 0, "jogador fora do turno não altera o estado");
  room.markDisconnected("p1");
  assert.equal(room.status, "playing");
  room.addPlayer("p1", "Um");
  assert.equal(room.players.get("p1").connected, true);
  assert.equal(room.gameState, state);
});
