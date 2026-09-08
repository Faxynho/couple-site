const assert = require("node:assert/strict");
const test = require("node:test");
const { BoardRaceGame, getBoardRaceStateForPlayer } = require("../dist/games/boardrace/BoardRaceGame");
const { BOARD_RACE_SPACES } = require("../dist/games/boardrace/boardConfig");
const { BOARD_RACE_WORD_CHALLENGE_COUNTS, createWordChallenge, shuffleAnagram } = require("../dist/games/boardrace/wordChallenges");
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

test("peões Solo respeitam a escolha e o BOT sempre recebe a cor oposta", () => {
  const game = new BoardRaceGame();
  const blue = game.createInitialState({ mode: "solo", playerIds: ["human"], pawnColors: { human: "blue" } });
  const pink = game.createInitialState({ mode: "solo", playerIds: ["human"], pawnColors: { human: "pink" } });
  assert.deepEqual(blue.pawnColors, { human: "blue", BOT: "pink" });
  assert.deepEqual(pink.pawnColors, { human: "pink", BOT: "blue" });
  assert.deepEqual(game.reset(blue).pawnColors, blue.pawnColors, "jogar novamente preserva a escolha");
});

test("peões do Duo permanecem diferentes e a sala sincroniza a última escolha", () => {
  const room = new Room("COLOR", "duo", "boardrace");
  room.addPlayer("p1", "Um");
  room.addPlayer("p2", "Dois");
  room.setBoardRacePawnColor("p1", "blue");
  assert.deepEqual(room.toSnapshot().pendingBoardRacePawnColors, { p1: "blue", p2: "pink" });
  room.setBoardRacePawnColor("p2", "blue");
  assert.deepEqual(room.toSnapshot().pendingBoardRacePawnColors, { p1: "pink", p2: "blue" });
  room.startGame();
  assert.notEqual(room.gameState.pawnColors.p1, room.gameState.pawnColors.p2);
});

test("anagramas usam Fisher-Yates em runtime e enigmas preservam o conteúdo", () => {
  assert.deepEqual(BOARD_RACE_WORD_CHALLENGE_COUNTS, { anagrams: 20, riddles: 30 });
  const generated = Array.from({ length: 20 }, () => createWordChallenge("anagram"));
  for (const challenge of generated) {
    assert.notEqual(challenge.prompt, challenge.answer.toUpperCase());
    assert.deepEqual([...challenge.prompt.toLowerCase()].sort(), [...challenge.answer].sort());
  }
  const riddles = Array.from({ length: 30 }, () => createWordChallenge("riddle"));
  assert.ok(riddles.every((challenge) => challenge.kind === "riddle" && challenge.prompt.length > 0));
  const variants = new Set([
    withRandom([0], () => shuffleAnagram("pipoca")),
    withRandom([0.2], () => shuffleAnagram("pipoca")),
  ]);
  assert.equal(variants.size, 2, "a mesma palavra pode receber ordens diferentes");
  const repeated = withRandom([0.5], () => shuffleAnagram("banana"));
  assert.notEqual(repeated, "banana");
  assert.deepEqual([...repeated].sort(), [..."banana"].sort(), "letras repetidas são preservadas");
});

test("o percurso declarativo tem início, 30 casas e uma distribuição orgânica de eventos", () => {
  assert.equal(BOARD_RACE_SPACES[0].type, "start");
  assert.equal(BOARD_RACE_SPACES.at(-1).index, 30);
  assert.equal(BOARD_RACE_SPACES.at(-1).type, "finish");
  assert.equal(BOARD_RACE_SPACES.filter((space) => space.type === "normal").length, 4);
  for (const type of ["advance", "retreat", "quiz", "minigame", "surprise", "treasure"]) {
    assert.equal(BOARD_RACE_SPACES.filter((space) => space.type === type).length, 3, `${type} deve aparecer três vezes`);
  }
  assert.equal(BOARD_RACE_SPACES.filter((space) => space.type === "prison").length, 2);
  for (const type of ["anagram", "riddle"]) assert.equal(BOARD_RACE_SPACES.filter((space) => space.type === type).length, 2);
  assert.equal(BOARD_RACE_SPACES.filter((space) => space.type === "safe").length, 1);
  assert.ok(BOARD_RACE_SPACES.some((space, index) => index > 0 && space.type !== "normal" && BOARD_RACE_SPACES[index - 1].type !== "normal"), "eventos podem formar grupos naturais");
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

test("recuo adia o efeito da casa de destino para a próxima vez", () => {
  const { game, state } = duel();
  state.spaces[6] = { ...state.spaces[6], type: "quiz", label: "Quiz" };
  state.players.p1.position = 7;
  const next = withRandom([0, 0.4], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.position, 6);
  assert.equal(next.players.p1.pendingQuiz, null, "o efeito não dispara no turno do recuo");
  assert.equal(next.players.p1.pendingSpaceIndex, 6, "o destino especial fica pendente");
  assert.equal(next.eventLog.at(-1).destinationSpaceType, "quiz", "o mesmo aviso informa o destino especial");
  assert.deepEqual(next.lastMove.path, [8, 7, 6]);
});

test("encadeia avanço, recuo e destino interativo na mesma jogada", () => {
  const { game, state } = duel();
  state.players.p1.position = 1;
  state.spaces[1] = { ...state.spaces[1], type: "quiz", label: "Quiz" };
  state.spaces[2] = { ...state.spaces[2], type: "advance", label: "Avançar" };
  state.spaces[4] = { ...state.spaces[4], type: "retreat", label: "Recuar" };
  const next = withRandom([0, 0.34, 0.67], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.deepEqual(next.lastMove.path, [2, 3, 4, 3, 2, 1]);
  assert.deepEqual(next.lastMove.pauseAfterSteps, [1, 3]);
  assert.equal(next.players.p1.position, 1);
  assert.equal(next.players.p1.pendingSpaceIndex, 1);
  assert.equal(next.eventLog.at(-1).kind, "retreat");
  assert.equal(next.eventLog.at(-1).destinationSpaceType, "quiz");
});

test("Surpresa de movimento continua a cadeia até o Minijogo pendente", () => {
  const { game, state } = duel();
  state.players.p1.position = 1;
  state.spaces[2] = { ...state.spaces[2], type: "surprise", label: "Surpresa" };
  state.spaces[4] = { ...state.spaces[4], type: "advance", label: "Avançar" };
  state.spaces[6] = { ...state.spaces[6], type: "minigame", label: "Minijogo" };
  const next = withRandom([0, 0, 0.34], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.deepEqual(next.lastMove.path, [2, 3, 4, 5, 6]);
  assert.equal(next.players.p1.pendingSpaceIndex, 6);
  assert.equal(next.eventLog.at(-1).kind, "advance");
  assert.equal(next.eventLog.at(-1).destinationSpaceType, "minigame");
});

test("limita uma cadeia cíclica de movimento sem bloquear a partida", () => {
  const { game, state } = duel();
  state.players.p1.position = 1;
  state.spaces[2] = { ...state.spaces[2], type: "advance", label: "Avançar" };
  state.spaces[3] = { ...state.spaces[3], type: "retreat", label: "Recuar" };
  const next = withRandom([0, 0, 0, 0, 0, 0, 0, 0, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.ok(next.lastMove.path.length <= 9, "a cadeia é finita");
  assert.equal(next.eventLog.at(-1).message, "A cadeia de movimentos terminou por segurança.");
  assert.equal(next.phase, "turnStart");
});

test("avanço adia a casa de destino e a resolve antes do dado", () => {
  const { game, state } = duel();
  state.players.p1.position = 2;
  let next = withRandom([0, 0.4, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.position, 5);
  assert.equal(next.players.p1.pendingQuiz, null, "Quiz não abre no mesmo turno do avanço");
  assert.equal(next.players.p1.pendingSpaceIndex, 5);
  assert.equal(next.eventLog.at(-1).destinationSpaceType, "quiz");
  const eventSerialBeforePendingQuiz = next.eventSerial;
  next.currentPlayerId = "p1";
  next.phase = "turnStart";
  next.phaseReadyAt = 0;
  next = game.applyAction(next, { type: "tick" }, "system");
  assert.equal(next.phase, "awaitingQuiz");
  assert.ok(next.players.p1.pendingQuiz, "Quiz abre antes de liberar o dado");
  assert.equal(next.eventSerial, eventSerialBeforePendingQuiz, "o Quiz pendente não repete o aviso de chegada");
});

test("destinos pendentes suportam prisão, minijogo e tesouro sem encadeamento infinito", () => {
  const prison = duel();
  prison.state.spaces[6] = { ...prison.state.spaces[6], type: "prison", label: "Prisão" };
  prison.state.players.p1.position = 7;
  let next = withRandom([0, 0.4], () => prison.game.applyAction(prison.state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.pendingSpaceIndex, 6);
  next.currentPlayerId = "p1";
  next.phase = "turnStart";
  next.phaseReadyAt = 0;
  next = prison.game.applyAction(next, { type: "tick" }, "system");
  assert.equal(next.players.p1.skipNextTurn, true);
  assert.equal(next.phase, "turnStart", "prisão é aplicada antes de decidir a próxima jogada");

  const minigame = duel();
  minigame.state.players.p1.position = 14;
  next = withRandom([0, 0], () => minigame.game.applyAction(minigame.state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.pendingSpaceIndex, 16);
  next.currentPlayerId = "p1";
  next.phase = "turnStart";
  next.phaseReadyAt = 0;
  next = minigame.game.applyAction(next, { type: "tick" }, "system");
  assert.equal(next.phase, "minigame");
  assert.ok(next.pendingMinigame, "minijogo pendente abre com o mesmo fluxo sincronizado");
  assert.equal(next.eventSerial, 1, "o início pendente não repete o aviso da casa de destino");

  const treasure = duel();
  treasure.state.spaces[5] = { ...treasure.state.spaces[5], type: "treasure", label: "Tesouro" };
  treasure.state.players.p1.position = 2;
  next = withRandom([0, 0.4], () => treasure.game.applyAction(treasure.state, { type: "roll" }, "p1"));
  assert.equal(next.players.p1.pendingSpaceIndex, 5);
  next.currentPlayerId = "p1";
  next.phase = "turnStart";
  next.phaseReadyAt = 0;
  next = withRandom([0], () => treasure.game.applyAction(next, { type: "tick" }, "system"));
  assert.equal(next.players.p1.pendingSpaceIndex, null);
  assert.equal(next.players.p1.powers.length, 1, "tesouro pendente é resolvido antes do dado");
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
  state.players.p1.position = 10;
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
  state.players.p1.position = 4;
  let next = withRandom([0, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  const quiz = next.players.p1.pendingQuiz;
  assert.equal(quiz.difficulty, "medium");
  assert.equal(quiz.options.length, 4);
  next.currentPlayerId = "p1";
  next.phase = "awaitingQuiz";
  next.phaseReadyAt = 0;
  const publicState = getBoardRaceStateForPlayer(next, "p1");
  assert.equal("correctIndex" in publicState.players.p1.pendingQuiz, false);
  const correct = game.applyAction(next, { type: "answerQuiz", optionIndex: quiz.correctIndex }, "p1");
  assert.equal(correct.phase, "awaitingRoll");
  assert.equal(correct.players.p1.pendingQuiz, null);
});

test("Anagrama permite tentativas ilimitadas, normaliza a resposta e só encerra ao acertar", () => {
  const { game, state } = duel();
  state.phase = "turnStart";
  state.phaseReadyAt = 0;
  state.players.p1.pendingSpaceIndex = 4;
  state.players.p1.position = 4;
  let next = withRandom([0], () => game.applyAction(state, { type: "tick" }, "system"));
  assert.equal(next.phase, "awaitingWord");
  assert.equal(next.players.p1.pendingWordChallenge.kind, "anagram");
  const publicState = getBoardRaceStateForPlayer(next, "p1");
  assert.equal("answer" in publicState.players.p1.pendingWordChallenge, false);
  const answer = next.players.p1.pendingWordChallenge.answer;
  next = game.applyAction(next, { type: "answerWord", answer: "errado" }, "p1");
  assert.equal(next.phase, "awaitingWord");
  assert.equal(next.currentPlayerId, "p1");
  assert.equal(next.players.p1.pendingWordChallenge.attempts, 1);
  next = game.applyAction(next, { type: "answerWord", answer: "outra resposta" }, "p1");
  assert.equal(next.players.p1.pendingWordChallenge.attempts, 2);
  next.phaseReadyAt = 0;
  next = game.applyAction(next, { type: "answerWord", answer: `  ${answer.toUpperCase()}  ` }, "p1");
  assert.equal(next.phase, "awaitingRoll");
  assert.equal(next.players.p1.pendingWordChallenge, null);
});

test("desistir do Anagrama limpa o pendente e passa a vez", () => {
  const { game, state } = duel();
  state.phase = "awaitingWord";
  state.currentPlayerId = "p1";
  state.phaseReadyAt = 0;
  state.players.p1.pendingWordChallenge = { id: "anagram-test", kind: "anagram", prompt: "LOVACA", answer: "cavalo", assignedAt: 0, attempts: 3 };
  const next = game.applyAction(state, { type: "giveUpWord" }, "p1");
  assert.equal(next.players.p1.pendingWordChallenge, null);
  assert.equal(next.currentPlayerId, "p2");
  assert.equal(next.eventLog.at(-1).gaveUp, true);
  assert.equal(next.eventLog.at(-1).answer, "cavalo");
});

test("Enigma revela a resposta quando erra e termina sem travar o turno", () => {
  const { game, state } = duel();
  let next = state;

  next.currentPlayerId = "p1";
  next.phase = "turnStart";
  next.phaseReadyAt = 0;
  next.players.p1.position = 14;
  next.players.p1.pendingSpaceIndex = 14;
  next = withRandom([0], () => game.applyAction(next, { type: "tick" }, "system"));
  assert.equal(next.phase, "awaitingWord");
  assert.equal(next.players.p1.pendingWordChallenge.kind, "riddle");
  next.phaseReadyAt = 0;
  const wrong = game.applyAction(next, { type: "answerWord", answer: "nada" }, "p1");
  assert.equal(wrong.players.p1.pendingWordChallenge, null);
  assert.equal(wrong.currentPlayerId, "p2");
  assert.equal(wrong.eventLog.at(-1).kind, "wordWrong");
  assert.ok(wrong.eventLog.at(-1).answer, "a resposta correta fica disponível no feedback final");
});

test("Cofre guarda a escolha no servidor e resolve cada resultado sem prender o jogador", () => {
  const { game, state } = duel();
  for (const [outcome, expected] of [["power", "power"], ["advance", "advance"], ["penalty", "penalty"], ["empty", "empty"]]) {
    const current = structuredClone(state);
    current.phase = "awaitingSafe";
    current.currentPlayerId = "p1";
    current.players.p1.position = 10;
    current.players.p1.pendingSafe = { id: `safe-${outcome}`, assignedAt: 0, options: [outcome, "empty", "empty", "empty"] };
    const next = withRandom([0], () => game.applyAction(current, { type: "chooseSafe", optionIndex: 0 }, "p1"));
    assert.equal(next.players.p1.pendingSafe, null);
    assert.equal(next.eventLog.at(-1).kind, "safeResult");
    assert.equal(next.currentPlayerId, "p2", `${expected} passa a vez com segurança`);
    if (outcome === "power") assert.equal(next.players.p1.powers.length, 1);
    if (outcome === "advance") assert.equal(next.players.p1.position, 12);
    if (outcome === "penalty") assert.equal(next.players.p1.skipNextTurn, true);
  }
});

test("avanço do Cofre anima o percurso e adia a casa especial de destino", () => {
  const { game, state } = duel();
  state.phase = "awaitingSafe";
  state.currentPlayerId = "p1";
  state.players.p1.position = 10;
  state.players.p1.pendingSafe = { id: "safe-chain", assignedAt: 0, options: ["advance", "empty", "empty", "empty"] };
  state.spaces[12] = { ...state.spaces[12], type: "riddle", label: "Enigma" };
  const next = game.applyAction(state, { type: "chooseSafe", optionIndex: 0 }, "p1");
  assert.deepEqual(next.lastMove.path, [11, 12]);
  assert.equal(next.players.p1.pendingSpaceIndex, 12);
  assert.equal(next.eventLog.at(-1).destinationSpaceType, "riddle");
  assert.equal(next.currentPlayerId, "p2");
});

test("Troca de Lugar não ativa casas e Ímã respeita Escudo e o início", () => {
  const { game, state } = duel();
  state.players.p1.position = 8;
  state.players.p2.position = 23;
  state.players.p1.powers = ["swap"];
  let next = game.applyAction(state, { type: "usePower", powerId: "swap", targetPlayerId: "p2" }, "p1");
  assert.equal(next.players.p1.position, 23);
  assert.equal(next.players.p2.position, 8);
  assert.equal(next.players.p1.pendingSpaceIndex, null);
  assert.equal(next.players.p2.pendingSpaceIndex, null);
  assert.equal(next.eventLog.at(-1).powerId, "swap");

  next.phase = "awaitingRoll";
  next.currentPlayerId = "p1";
  next.players.p1.powers = ["magnet"];
  next.players.p2.position = 1;
  next.players.p2.shieldActive = true;
  next = game.applyAction(next, { type: "usePower", powerId: "magnet", targetPlayerId: "p2" }, "p1");
  assert.equal(next.players.p2.position, 1);
  assert.equal(next.players.p2.shieldActive, false);

  next.phase = "awaitingRoll";
  next.currentPlayerId = "p1";
  next.players.p1.powers = ["magnet"];
  next = game.applyAction(next, { type: "usePower", powerId: "magnet", targetPlayerId: "p2" }, "p1");
  assert.equal(next.players.p2.position, 0);
  assert.equal(next.lastMove.cause, "magnet");
});

test("Surpresa comunica o resultado real em vez de um rótulo genérico", () => {
  const { game, state } = duel();
  state.players.p1.position = 5;
  state.spaces[6] = { ...state.spaces[6], type: "surprise", label: "Surpresa" };
  state.spaces[8] = { ...state.spaces[8], type: "normal", label: "Normal" };
  const next = withRandom([0, 0], () => game.applyAction(state, { type: "roll" }, "p1"));
  assert.equal(next.eventLog.at(-1).kind, "surprisePositive");
  assert.equal(next.eventLog.at(-1).message, "Surpresa: avance 2 casas.");
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
    state.players.p1.position = 8;
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
  state.players.p1.position = 8;
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
  state.players.p1.position = 8;
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
  assert.ok(next.phaseReadyAt - startedAt >= 2_050 + next.lastMove.path.length * 420 + 700);
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
