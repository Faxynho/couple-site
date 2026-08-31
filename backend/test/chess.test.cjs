const assert = require("node:assert/strict");
const test = require("node:test");
const { ChessGame } = require("../dist/games/chess/ChessGame");

function fresh(mode = "duel") {
  const game = new ChessGame();
  return { game, state: game.createInitialState({ mode, difficulty: "medium", playerIds: ["rosa", "azul"] }) };
}

function position(state, fen) {
  return { ...state, fen, turn: fen.split(" ")[1], result: null, finishedAt: null };
}

test("aceita movimento legal e rejeita um que expõe o rei", () => {
  const { game, state } = fresh();
  const moved = game.applyAction(state, { type: "move", from: "e2", to: "e4" }, "rosa");
  assert.equal(moved.lastMove.san, "e4");
  const guarded = position(state, "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1");
  const rejected = game.applyAction(guarded, { type: "move", from: "e2", to: "f2" }, "rosa");
  assert.equal(rejected.fen, guarded.fen);
});

test("detecta xeque-mate", () => {
  const { game, state } = fresh();
  let next = game.applyAction(state, { type: "move", from: "e2", to: "e4" }, "rosa");
  next = game.applyAction(next, { type: "move", from: "e7", to: "e5" }, "azul");
  next = game.applyAction(next, { type: "move", from: "d1", to: "h5" }, "rosa");
  next = game.applyAction(next, { type: "move", from: "b8", to: "c6" }, "azul");
  next = game.applyAction(next, { type: "move", from: "f1", to: "c4" }, "rosa");
  next = game.applyAction(next, { type: "move", from: "g8", to: "f6" }, "azul");
  next = game.applyAction(next, { type: "move", from: "h5", to: "f7" }, "rosa");
  assert.equal(next.result.reason, "checkmate");
  assert.equal(next.result.winnerId, "rosa");
});

test("suporta roque, en passant, promoção e empate por material insuficiente", () => {
  const { game, state } = fresh();
  let next = game.applyAction(position(state, "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"), { type: "move", from: "e1", to: "g1" }, "rosa");
  assert.equal(next.lastMove.san, "O-O");
  next = game.applyAction(position(state, "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1"), { type: "move", from: "e5", to: "d6" }, "rosa");
  assert.match(next.lastMove.san, /exd6/);
  next = game.applyAction(position(state, "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"), { type: "move", from: "a7", to: "a8", promotion: "n" }, "rosa");
  assert.equal(next.lastMove.promotion, "n");
  next = game.applyAction(position(state, "4k3/8/8/8/8/8/3b4/2B1K3 w - - 0 1"), { type: "move", from: "c1", to: "d2" }, "rosa");
  assert.equal(next.result.reason, "insufficient-material");
});

test("no Duelo, cada jogador só movimenta seu próprio time e no próprio turno", () => {
  const { game, state } = fresh();
  const wrongPiece = game.applyAction(state, { type: "move", from: "e2", to: "e4" }, "azul");
  assert.equal(wrongPiece.fen, state.fen);
  const whiteMove = game.applyAction(state, { type: "move", from: "e2", to: "e4" }, "rosa");
  const repeatedWhite = game.applyAction(whiteMove, { type: "move", from: "d2", to: "d4" }, "rosa");
  assert.equal(repeatedWhite.fen, whiteMove.fen);
});

test("a escolha do host define Rosa sem depender da ordem de entrada", () => {
  const { ChessGame } = require("../dist/games/chess/ChessGame");
  const game = new ChessGame();
  const state = game.createInitialState({ mode: "duel", playerIds: ["host", "convidado"], pinkPlayerId: "convidado" });
  assert.equal(state.colorByPlayerId.convidado, "w");
  assert.equal(state.colorByPlayerId.host, "b");
  assert.equal(state.turn, "w");
});
