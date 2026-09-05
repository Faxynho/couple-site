const assert = require("node:assert/strict");
const test = require("node:test");
const { WhoAmIGame, getWhoAmIStateForPlayer } = require("../dist/games/whoami/WhoAmIGame");
const { getWhoAmIItem, isWhoAmIAnswerCorrect, selectWhoAmIItems } = require("../dist/games/whoami/itemBank");

test("Duelo por pistas começa com exatamente uma pista privada para cada jogador", () => {
  const game = new WhoAmIGame();
  const state = game.createInitialState({ mode: "duelHints", difficulty: "easy", category: "all", playerIds: ["p1", "p2"] });
  const p1 = getWhoAmIStateForPlayer(state, "p1");
  assert.equal(p1.revealedHintCount, 1);
  assert.equal(p1.hints.filter(Boolean).length, 1);
  assert.equal(p1.playerProgress.p2.hintsRevealed, 1);
  assert.equal(p1.answer, null);
});

test("Duelo revela a pista nova apenas para quem pediu, mas mostra a contagem ao oponente", () => {
  const game = new WhoAmIGame();
  let state = game.createInitialState({ mode: "duelHints", difficulty: "easy", category: "all", playerIds: ["p1", "p2"] });
  state = game.applyAction(state, { type: "revealHint" }, "p1");
  const p1 = getWhoAmIStateForPlayer(state, "p1");
  const p2 = getWhoAmIStateForPlayer(state, "p2");
  assert.equal(p1.hints.filter(Boolean).length, 2);
  assert.equal(p2.hints.filter(Boolean).length, 1);
  assert.equal(p2.playerProgress.p1.hintsRevealed, 2);
});

test("Duelo espera os dois terminarem antes de anunciar quem venceu", () => {
  const game = new WhoAmIGame();
  let state = game.createInitialState({ mode: "duelHints", difficulty: "easy", category: "games", playerIds: ["p1", "p2"] });
  const item = getWhoAmIItem(state.sharedItemId);
  assert.ok(item);

  state = game.applyAction(state, { type: "revealHint" }, "p2");
  state = game.applyAction(state, { type: "submitGuess", guess: item.answer }, "p1");

  // P1 já garantiu uma ótima marca, mas P2 continua podendo jogar.
  assert.equal(state.finished, false);
  assert.ok(state.players.p1.correctAt);

  state = game.applyAction(state, { type: "submitGuess", guess: item.answer }, "p2");
  assert.equal(state.finished, true);
  assert.equal(state.winnerId, "p1");
  assert.equal(state.players.p1.hintsRevealed, 1);
  assert.equal(state.players.p2.hintsRevealed, 2);
});

test("Duelo também espera o segundo jogador desistir antes de terminar", () => {
  const game = new WhoAmIGame();
  let state = game.createInitialState({ mode: "duelHints", difficulty: "easy", category: "animals", playerIds: ["p1", "p2"] });
  const item = getWhoAmIItem(state.sharedItemId);
  assert.ok(item);

  state = game.applyAction(state, { type: "submitGuess", guess: item.answer }, "p1");
  assert.equal(state.finished, false);

  state = game.applyAction(state, { type: "giveUp" }, "p2");
  assert.equal(state.finished, true);
  assert.equal(state.winnerId, "p1");
});

test("Categoria específica nunca mistura itens de outra categoria", () => {
  for (const category of ["moviesSeries", "games", "characters", "animeCartoons", "famous", "animals", "places", "food", "objects", "general"]) {
    for (const difficulty of ["easy", "medium", "hard"]) {
      const picked = selectWhoAmIItems(difficulty, category, 6);
      assert.ok(picked.length > 0, `${category}/${difficulty} precisa ter ao menos um item`);
      assert.ok(picked.every((item) => item.category === category), `${category}/${difficulty} misturou outra categoria`);
    }
  }
});

test("No clássico cada jogador vê a identidade do par e nunca a própria durante a rodada", () => {
  const game = new WhoAmIGame();
  const state = game.createInitialState({ mode: "classicDuel", difficulty: "easy", category: "all", playerIds: ["p1", "p2"] });
  const p1 = getWhoAmIStateForPlayer(state, "p1");
  const p2 = getWhoAmIStateForPlayer(state, "p2");
  assert.ok(p1.classicPartnerIdentity?.answer);
  assert.ok(p2.classicPartnerIdentity?.answer);
  assert.equal(p1.classicOwnIdentity, null);
  assert.equal(p2.classicOwnIdentity, null);
  assert.notEqual(p1.classicPartnerIdentity.answer, p2.classicPartnerIdentity.answer);
});

test("No modo Juntos, revelar uma pista atualiza os dois jogadores", () => {
  const game = new WhoAmIGame();
  let state = game.createInitialState({ mode: "togetherHints", difficulty: "easy", category: "animals", playerIds: ["p1", "p2"] });
  state = game.applyAction(state, { type: "revealHint" }, "p2");
  const p1 = getWhoAmIStateForPlayer(state, "p1");
  const p2 = getWhoAmIStateForPlayer(state, "p2");
  assert.equal(p1.revealedHintCount, 2);
  assert.equal(p2.revealedHintCount, 2);
  assert.equal(p1.hints.filter(Boolean).length, 2);
  assert.deepEqual(p1.hints, p2.hints);
});

test("Respostas ignoram acentos, maiúsculas e pontuação", () => {
  const item = { answer: "Homem-Aranha", aliases: ["Spider-Man"], id: "x", category: "characters", difficulty: "easy", hints: ["1", "2", "3", "4", "5"] };
  assert.equal(isWhoAmIAnswerCorrect(item, "homem aranha"), true);
  assert.equal(isWhoAmIAnswerCorrect(item, "SPIDER MAN!!!"), true);
});
