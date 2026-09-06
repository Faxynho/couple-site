const assert = require("node:assert/strict");
const test = require("node:test");
const {
  CasinoGame,
  casinoHiLoChoiceMultiplier,
  casinoMinimumBet,
  getCasinoStateForPlayer,
} = require("../dist/games/casino/CasinoGame");

function newGame(length = "normal") {
  return new CasinoGame().createInitialState({ difficulty: length, playerIds: ["p1", "p2"] });
}

function enterGame(gameId, bet1 = 100, bet2 = 100) {
  const game = new CasinoGame();
  let state = game.createInitialState({ difficulty: "normal", playerIds: ["p1", "p2"] });
  state.offeredGames = [gameId, "mines", "hilo"].filter((id, i, arr) => arr.indexOf(id) === i);
  while (state.offeredGames.length < 3) state.offeredGames.push(state.offeredGames.includes("dice") ? "crash" : "dice");
  state = game.applyAction(state, { type: "vote", game: gameId }, "p1");
  state = game.applyAction(state, { type: "vote", game: gameId }, "p2");
  state = game.applyAction(state, { type: "lockBet", amount: bet1 }, "p1");
  state = game.applyAction(state, { type: "lockBet", amount: bet2 }, "p2");
  return { game, state };
}

test("Cassino começa com 1.000 fichas, meta correta e três mesas diferentes", () => {
  const state = newGame("quick");
  assert.equal(state.targetBalance, 2000);
  assert.equal(state.players.p1.balance, 1000);
  assert.equal(state.players.p2.balance, 1000);
  assert.equal(state.offeredGames.length, 3);
  assert.equal(new Set(state.offeredGames).size, 3);
  assert.equal(state.phase, "selecting");
});

test("Voto fica secreto até os dois escolherem", () => {
  const game = new CasinoGame();
  let state = newGame();
  const chosen = state.offeredGames[0];
  state = game.applyAction(state, { type: "vote", game: chosen }, "p1");
  assert.equal(getCasinoStateForPlayer(state, "p2").players.p1.vote, null);
  assert.equal(getCasinoStateForPlayer(state, "p1").players.p1.vote, chosen);
  state = game.applyAction(state, { type: "vote", game: chosen }, "p2");
  assert.equal(state.phase, "betting");
  assert.equal(state.chosenGame, chosen);
});

test("Aposta mínima é 10% e fica escondida até os dois travarem", () => {
  const game = new CasinoGame();
  let state = newGame();
  const chosen = state.offeredGames[0];
  state = game.applyAction(state, { type: "vote", game: chosen }, "p1");
  state = game.applyAction(state, { type: "vote", game: chosen }, "p2");

  const invalid = game.applyAction(state, { type: "lockBet", amount: 90 }, "p1");
  assert.equal(invalid.players.p1.betLocked, false);
  assert.equal(casinoMinimumBet(1000), 100);

  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "p1");
  assert.equal(getCasinoStateForPlayer(state, "p2").players.p1.roundBet, null);
  state = game.applyAction(state, { type: "lockBet", amount: 200 }, "p2");
  assert.equal(state.phase, "playing");
  assert.equal(state.players.p1.balance, 900);
  assert.equal(state.players.p2.balance, 800);
});

test("Mines nunca envia posições das bombas e espera os dois terminarem", () => {
  const { game, state: started } = enterGame("mines");
  let state = started;
  assert.equal(state.miniState.kind, "mines");
  const masked = getCasinoStateForPlayer(state, "p1");
  assert.deepEqual(masked.miniState.players.p1.mineIndexes, []);
  assert.deepEqual(masked.miniState.players.p2.mineIndexes, []);

  const bomb1 = state.miniState.players.p1.mineIndexes[0];
  state = game.applyAction(state, { type: "minesOpen", index: bomb1 }, "p1");
  assert.equal(state.phase, "playing");
  assert.equal(state.miniState.players.p1.done, true);
  assert.equal(state.miniState.players.p2.done, false);

  const bomb2 = state.miniState.players.p2.mineIndexes[0];
  state = game.applyAction(state, { type: "minesOpen", index: bomb2 }, "p2");
  assert.equal(state.phase, "roundResult");
});

test("Hi-Lo trata empate como derrota, anima a revelação e segura a carta antes de encerrar", () => {
  assert.equal(casinoHiLoChoiceMultiplier(13, "higher"), null);
  assert.ok(casinoHiLoChoiceMultiplier(13, "lower") > 1);
  assert.equal(casinoHiLoChoiceMultiplier(1, "lower"), null);
  assert.ok(casinoHiLoChoiceMultiplier(1, "higher") > 1);

  const { game, state: started } = enterGame("hilo");
  let state = started;
  const rank = state.miniState.players.p1.currentCard.rank;
  const direction = rank === 13 ? "lower" : "higher";
  const oldRandom = Math.random;
  let calls = 0;
  Math.random = () => {
    calls += 1;
    return calls % 2 === 1 ? (rank - 0.5) / 13 : 0;
  };
  try {
    state = game.applyAction(state, { type: "hiloGuess", direction }, "p1");
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(state.miniState.players.p1.flipping, true);
  assert.equal(state.miniState.players.p1.lastCorrect, null);
  const hiloSelf = getCasinoStateForPlayer(state, "p1");
  const hiloOpponent = getCasinoStateForPlayer(state, "p2");
  assert.ok(hiloSelf.miniState.players.p1.pendingCard, "o dono precisa receber a carta-alvo para o flip único");
  assert.equal(hiloOpponent.miniState.players.p1.pendingCard, null, "o rival não recebe a carta futura");

  const flipEnd = state.miniState.players.p1.flipEndsAt;
  state = game.applyAction(state, { type: "tick", now: flipEnd + 1 }, "system");
  assert.equal(state.miniState.players.p1.flipping, false);
  assert.equal(state.miniState.players.p1.lastCorrect, false);
  assert.equal(state.miniState.players.p1.done, true);
  assert.ok(state.miniState.players.p1.revealEndsAt > flipEnd);
  assert.equal(state.players.p1.roundStatus, "lost");
  assert.equal(state.phase, "playing");
});

test("Dados sempre gera três verdes e dois vermelhos válidos, sem sobreposição", () => {
  const { state } = enterGame("dice");
  assert.equal(state.miniState.kind, "dice");
  for (const id of ["p1", "p2"]) {
    const p = state.miniState.players[id];
    assert.equal(p.green.length, 3);
    assert.equal(p.red.length, 2);
    assert.ok([...p.green, ...p.red].every((n) => n >= 2 && n <= 12));
    assert.equal(p.green.some((n) => p.red.includes(n)), false);
  }
});

test("Crash continua secreto, mas rodas recebem o alvo visual somente depois das apostas travadas", () => {
  const crash = enterGame("crash").state;
  assert.equal(crash.miniState.kind, "crash");
  assert.ok(crash.miniState.crashPoint > 1);
  assert.equal(getCasinoStateForPlayer(crash, "p1").miniState.crashPoint, null);

  const { game, state: rouletteStarted } = enterGame("roulette");
  let roulette = rouletteStarted;
  roulette = game.applyAction(roulette, { type: "roulettePick", bet: { kind: "red" } }, "p1");
  roulette = game.applyAction(roulette, { type: "roulettePick", bet: { kind: "black" } }, "p2");
  assert.equal(roulette.miniState.kind, "roulette");
  assert.notEqual(roulette.miniState.resultNumber, null);
  assert.equal(getCasinoStateForPlayer(roulette, "p1").miniState.resultNumber, roulette.miniState.resultNumber);
  assert.notEqual(getCasinoStateForPlayer(roulette, "p1").miniState.resultColor, null);

  const fortune = enterGame("fortune").state;
  assert.equal(fortune.miniState.kind, "fortune");
  assert.notEqual(fortune.miniState.resultIndex, null);
  assert.equal(getCasinoStateForPlayer(fortune, "p1").miniState.resultIndex, fortune.miniState.resultIndex);
});

test("Falência vira Cara ou Coroa, revela a moeda e só encerra depois da animação", () => {
  const game = new CasinoGame();
  let state = game.createInitialState({ difficulty: "normal", playerIds: ["p1", "p2"] });
  state.offeredGames = ["mines", "hilo", "dice"];
  state = game.applyAction(state, { type: "vote", game: "mines" }, "p1");
  state = game.applyAction(state, { type: "vote", game: "mines" }, "p2");
  state = game.applyAction(state, { type: "lockBet", amount: 1000 }, "p1");
  state = game.applyAction(state, { type: "lockBet", amount: 1000 }, "p2");
  const b1 = state.miniState.players.p1.mineIndexes[0];
  const b2 = state.miniState.players.p2.mineIndexes[0];
  state = game.applyAction(state, { type: "minesOpen", index: b1 }, "p1");
  state = game.applyAction(state, { type: "minesOpen", index: b2 }, "p2");
  assert.equal(state.phase, "lastChance");

  state = game.applyAction(state, { type: "lastChanceChoose", side: "dollar" }, "p1");
  state = game.applyAction(state, { type: "lastChanceChoose", side: "dollar" }, "p2");
  const oldRandom = Math.random;
  try {
    Math.random = () => 0.1; // dollar: P1 acerta
    state = game.applyAction(state, { type: "lastChanceSpin" }, "p1");
    assert.equal(getCasinoStateForPlayer(state, "p1").miniState.pendingCoinResults.p1, null);
    Math.random = () => 0.9; // crown: P2 erra
    state = game.applyAction(state, { type: "lastChanceSpin" }, "p2");
  } finally {
    Math.random = oldRandom;
  }

  const spinEnd = Math.max(...Object.values(state.miniState.spinEndsAt).filter((value) => typeof value === "number"));
  state = game.applyAction(state, { type: "tick", now: spinEnd + 1 }, "system");
  assert.equal(state.phase, "lastChance");
  assert.equal(state.miniState.coinResults.p1, "dollar");
  assert.equal(state.miniState.coinResults.p2, "crown");
  assert.equal(state.miniState.results.p1, "revived");
  assert.equal(state.miniState.results.p2, "failed");
  assert.equal(state.players.p1.balance, 500);

  const revealEnd = Math.max(...Object.values(state.miniState.revealEndsAt).filter((value) => typeof value === "number"));
  state = game.applyAction(state, { type: "tick", now: revealEnd + 1 }, "system");
  assert.equal(state.phase, "finished");
  assert.equal(state.winnerId, "p1");
  assert.equal(state.players.p1.lastChanceUsed, true);
  assert.equal(state.players.p2.lastChanceUsed, true);
});

test("As dez mesas entram no submotor correto", () => {
  for (const id of ["mines", "crash", "roulette", "slots", "race", "dice", "hilo", "fortune", "plinko", "briefcase"]) {
    const { state } = enterGame(id);
    assert.equal(state.phase, "playing", `${id} deveria iniciar em playing`);
    assert.equal(state.miniState.kind, id, `${id} abriu o submotor errado`);
  }
});

test("Roleta e Fortuna fazem um único giro até o alvo e resolvem sem segunda fase visual", () => {
  {
    const { game, state: started } = enterGame("roulette");
    let state = game.applyAction(started, { type: "roulettePick", bet: { kind: "red" } }, "p1");
    state = game.applyAction(state, { type: "roulettePick", bet: { kind: "black" } }, "p2");
    const target = state.miniState.resultNumber;
    assert.equal(state.miniState.spinning, true);
    assert.equal(state.miniState.settling, false);
    assert.equal(getCasinoStateForPlayer(state, "p1").miniState.resultNumber, target);
    const end = state.miniState.spinEndsAt;
    state = game.applyAction(state, { type: "tick", now: end + 1 }, "system");
    assert.equal(state.phase, "roundResult");
    assert.equal(state.miniState.settling, false);
    assert.equal(state.miniState.resultNumber, target);
  }
  {
    const { game, state: started } = enterGame("fortune");
    const target = started.miniState.resultIndex;
    assert.equal(getCasinoStateForPlayer(started, "p1").miniState.resultIndex, target);
    const state = game.applyAction(started, { type: "tick", now: started.miniState.spinEndsAt + 1 }, "system");
    assert.equal(state.phase, "roundResult");
    assert.equal(state.miniState.settling, false);
    assert.equal(state.miniState.revealedIndex, target);
  }
});

test("Corrida e Crash continuam resolvendo pelo relógio autoritativo", () => {
  {
    const { game, state: started } = enterGame("race");
    let state = game.applyAction(started, { type: "racePick", racerId: "crown" }, "p1");
    state = game.applyAction(state, { type: "racePick", racerId: "star" }, "p2");
    const mini = state.miniState;
    const end = mini.startedAt + Math.max(...Object.values(mini.durationsMs));
    state = game.applyAction(state, { type: "tick", now: end + 1 }, "system");
    assert.equal(state.phase, "roundResult");
    assert.ok(state.miniState.winner);
  }
  {
    const { game, state: started } = enterGame("crash");
    const mini = started.miniState;
    const state = game.applyAction(started, { type: "tick", now: mini.startedAt + 120_000 }, "system");
    assert.equal(state.phase, "roundResult");
    assert.equal(state.miniState.crashed, true);
  }
});

const SLOT_ONE_LINE = [
  "cherry", "cherry", "cherry",
  "star", "diamond", "clover",
  "plum", "thunder", "strawberry",
];
const SLOT_NO_LINE = [
  "cherry", "star", "diamond",
  "clover", "thunder", "plum",
  "heart-card", "club-card", "strawberry",
];

function forceSlotResult(game, state, playerId, symbols) {
  let next = game.applyAction(state, { type: "slotsSpin" }, playerId);
  const p = next.miniState.players[playerId];
  assert.equal(p.pendingSymbols.length, 9);
  p.pendingSymbols = [...symbols];
  p.spinEndsAt = Date.now();
  return game.applyAction(next, { type: "tick", now: p.spinEndsAt + 1 }, "system");
}

test("Jackpot dá três chances reais: só o terceiro erro perde a aposta", () => {
  const { game, state: started } = enterGame("slots");
  let state = started;

  state = forceSlotResult(game, state, "p1", SLOT_NO_LINE);
  assert.equal(state.miniState.players.p1.spinsUsed, 1);
  assert.equal(state.miniState.players.p1.done, false);
  assert.equal(state.players.p1.roundStatus, "playing");
  assert.equal(state.players.p1.balance, 900, "o saldo não deve ser descontado de novo no primeiro erro");

  state = forceSlotResult(game, state, "p1", SLOT_NO_LINE);
  assert.equal(state.miniState.players.p1.spinsUsed, 2);
  assert.equal(state.miniState.players.p1.done, false);
  assert.equal(state.players.p1.roundStatus, "playing");
  assert.equal(state.players.p1.balance, 900);

  state = forceSlotResult(game, state, "p1", SLOT_NO_LINE);
  assert.equal(state.miniState.players.p1.spinsUsed, 3);
  assert.equal(state.miniState.players.p1.done, true);
  assert.equal(state.players.p1.roundStatus, "lost");
  assert.equal(state.players.p1.balance, 900);
  assert.equal(state.phase, "playing", "o rival ainda deve terminar a própria tentativa");
});

test("Jackpot vencedor no terceiro giro ganha uma chance bônus, e cada nova vitória renova outra", () => {
  const { game, state: started } = enterGame("slots");
  let state = started;

  state = forceSlotResult(game, state, "p1", SLOT_NO_LINE);
  state = forceSlotResult(game, state, "p1", SLOT_NO_LINE);
  state = forceSlotResult(game, state, "p1", SLOT_ONE_LINE);
  let p1 = state.miniState.players.p1;
  assert.equal(p1.spinsUsed, 3);
  assert.equal(p1.lastSpinWon, true);
  assert.equal(p1.done, false);
  assert.equal(p1.awaitingDecision, true);
  assert.deepEqual(p1.lastWinningLines, [0]);

  state = forceSlotResult(game, state, "p1", SLOT_ONE_LINE);
  p1 = state.miniState.players.p1;
  assert.equal(p1.spinsUsed, 4);
  assert.equal(p1.lastSpinWon, true);
  assert.equal(p1.done, false, "vencer o bônus deve liberar mais um giro");
  assert.equal(p1.awaitingDecision, true);
  assert.ok(p1.multiplier > 1);

  state = forceSlotResult(game, state, "p1", SLOT_NO_LINE);
  p1 = state.miniState.players.p1;
  assert.equal(p1.spinsUsed, 5);
  assert.equal(p1.done, true, "errar depois das três chances encerra a tentativa");
  assert.equal(state.players.p1.roundStatus, "lost");
});

test("Jackpot aumenta o multiplicador quando a grade forma mais de uma linha", () => {
  const twoLines = [
    "cherry", "cherry", "cherry",
    "cherry", "cherry", "cherry",
    "star", "diamond", "clover",
  ];
  const one = enterGame("slots");
  const oneState = forceSlotResult(one.game, one.state, "p1", SLOT_ONE_LINE);
  const oneFactor = oneState.miniState.players.p1.lastWinFactor;

  const two = enterGame("slots");
  const twoState = forceSlotResult(two.game, two.state, "p1", twoLines);
  const twoPlayer = twoState.miniState.players.p1;
  assert.deepEqual(twoPlayer.lastWinningLines, [0, 1]);
  assert.ok(twoPlayer.lastWinFactor > oneFactor);
  assert.equal(twoPlayer.jackpotHit, false);
});

test("Jackpot máximo paga 50x e encerra a tentativa do jogador", () => {
  const { game, state: started } = enterGame("slots");
  const jackpotGrid = Array(9).fill("cherry");
  const state = forceSlotResult(game, started, "p1", jackpotGrid);
  const p1 = state.miniState.players.p1;
  assert.equal(p1.jackpotHit, true);
  assert.equal(p1.lastWinningLines.length, 8);
  assert.equal(state.players.p1.lastMultiplier, 50);
  assert.equal(p1.done, true);
  assert.equal(state.players.p1.balance, 5900); // 900 após aposta + 5.000 de prêmio
  assert.equal(state.phase, "playing", "o rival ainda deve terminar a própria tentativa");
});

test("Dados exige dois cliques, um dado por vez, e só então calcula o resultado", () => {
  const { game, state: started } = enterGame("dice");
  let state = structuredClone(started);
  state.miniState.players.p1.green = [2, 5, 7];
  state.miniState.players.p1.red = [3, 8];
  const oldRandom = Math.random;
  try {
    Math.random = () => 0; // primeiro dado = 1
    state = game.applyAction(state, { type: "diceRoll" }, "p1");
    assert.equal(state.miniState.players.p1.rollingDie, 1);
    assert.equal(getCasinoStateForPlayer(state, "p1").miniState.players.p1.pendingDie, 1);
    assert.equal(getCasinoStateForPlayer(state, "p2").miniState.players.p1.pendingDie, null);
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.rollEndsAt + 1 }, "system");
    assert.equal(state.miniState.players.p1.revealedDiceCount, 1);
    assert.equal(state.miniState.players.p1.dice[0], 1);
    assert.equal(state.miniState.players.p1.sum, null);
    assert.equal(state.miniState.players.p1.outcome, null);

    Math.random = () => 0; // segundo dado = 1 => soma 2, verde
    state = game.applyAction(state, { type: "diceRoll" }, "p1");
    assert.equal(state.miniState.players.p1.rollingDie, 2);
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.rollEndsAt + 1 }, "system");
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(state.miniState.players.p1.revealedDiceCount, 2);
  assert.equal(state.miniState.players.p1.sum, 2);
  assert.equal(state.miniState.players.p1.outcome, "win");
  assert.equal(state.miniState.players.p1.awaitingDecision, true);
});

test("Dados neutro oferece Parar e devolve a aposta em 1x", () => {
  const { game, state: started } = enterGame("dice");
  let state = structuredClone(started);
  state.miniState.players.p1.green = [2, 5, 7];
  state.miniState.players.p1.red = [3, 8];
  const oldRandom = Math.random;
  try {
    Math.random = () => 0; // 1
    state = game.applyAction(state, { type: "diceRoll" }, "p1");
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.rollEndsAt + 1 }, "system");
    Math.random = () => 0.5; // 4 => soma 5 seria verde; use ~0.34 => 3, soma 4 neutro
    Math.random = () => 0.34;
    state = game.applyAction(state, { type: "diceRoll" }, "p1");
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.rollEndsAt + 1 }, "system");
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(state.miniState.players.p1.sum, 4);
  assert.equal(state.miniState.players.p1.outcome, "neutral");
  assert.equal(state.miniState.players.p1.awaitingDecision, true);
  state = game.applyAction(state, { type: "cashOut" }, "p1");
  assert.equal(state.players.p1.balance, 1000);
  assert.equal(state.players.p1.roundDelta, 0);
  assert.equal(state.miniState.players.p1.done, true);
  assert.equal(state.phase, "playing");
});

test("Jackpot continua normalmente quando o rival já perdeu no terceiro erro", () => {
  const { game, state: started } = enterGame("slots");
  let state = forceSlotResult(game, started, "p1", SLOT_ONE_LINE);
  assert.equal(state.miniState.players.p1.awaitingDecision, true);

  state = forceSlotResult(game, state, "p2", SLOT_NO_LINE);
  state = forceSlotResult(game, state, "p2", SLOT_NO_LINE);
  state = forceSlotResult(game, state, "p2", SLOT_NO_LINE);
  assert.equal(state.miniState.players.p2.done, true);
  assert.equal(state.phase, "playing");

  state = forceSlotResult(game, state, "p1", SLOT_ONE_LINE);
  assert.equal(state.phase, "playing");
  assert.equal(state.miniState.players.p1.awaitingDecision, true);
  assert.equal(state.miniState.players.p1.streak, 2);
  assert.equal(state.miniState.players.p1.spinsUsed, 2);
});

test("Plinko gera caminho autoritativo de 12 colisões, pousa em um bucket e paga o multiplicador", () => {
  const { game, state: started } = enterGame("plinko");
  let state = game.applyAction(started, { type: "plinkoDrop" }, "p1");
  const p1 = state.miniState.players.p1;
  assert.equal(p1.dropping, true);
  assert.equal(p1.path.length, 12);
  assert.ok(p1.path.every((direction) => direction === -1 || direction === 1));
  assert.ok(p1.pendingBucket >= 0 && p1.pendingBucket <= 12);
  assert.deepEqual(getCasinoStateForPlayer(state, "p2").miniState.players.p1.path, null);
  assert.equal(getCasinoStateForPlayer(state, "p2").miniState.players.p1.pendingBucket, null);
  const expectedBucket = p1.pendingBucket;
  const expectedMultiplier = state.miniState.multipliers[expectedBucket];

  state = game.applyAction(state, { type: "tick", now: p1.dropEndsAt + 1 }, "system");
  assert.equal(state.miniState.players.p1.dropping, false);
  assert.equal(state.miniState.players.p1.bucketIndex, expectedBucket);
  assert.equal(state.miniState.players.p1.multiplier, expectedMultiplier);
  assert.equal(state.miniState.players.p1.done, true);
  assert.equal(state.phase, "playing", "P2 ainda deve soltar a própria ficha");
});

test("Maletas compartilha as 10 escolhas, alterna turnos e uma maleta PERDEU elimina só aquele jogador", () => {
  const { game, state: started } = enterGame("briefcase");
  let state = structuredClone(started);
  assert.equal(state.miniState.kind, "briefcase");
  assert.equal(state.miniState.contents.length, 10);
  assert.equal(state.miniState.openedBy.length, 10);

  // Torna o cenário previsível sem alterar a lógica do submotor.
  state.miniState.startPlayerId = "p1";
  state.miniState.turnPlayerId = "p1";
  state.miniState.contents = [1.5, "lose", 0.5, 1, 1.25, 2, 3, 5, "lose", 0.75];

  state = game.applyAction(state, { type: "briefcaseOpen", index: 0 }, "p1");
  assert.equal(state.miniState.openedBy[0], "p1");
  assert.equal(state.miniState.players.p1.accumulatedMultiplier, 1.5);
  assert.equal(state.miniState.players.p1.awaitingDecision, true);
  assert.equal(game.applyAction(state, { type: "briefcaseOpen", index: 2 }, "p2"), state, "P2 não joga fora da vez");
  assert.equal(game.applyAction(state, { type: "briefcaseOpen", index: 0 }, "p2"), state, "a mesma maleta nunca pode ser escolhida duas vezes");

  state = game.applyAction(state, { type: "tick", now: state.miniState.revealEndsAt + 1 }, "system");
  state = game.applyAction(state, { type: "briefcaseContinue" }, "p1");
  assert.equal(state.miniState.turnPlayerId, "p2");

  state = game.applyAction(state, { type: "briefcaseOpen", index: 1 }, "p2");
  assert.equal(state.miniState.lastValue, "lose");
  assert.equal(state.miniState.players.p2.done, true);
  assert.equal(state.players.p2.roundStatus, "lost");
  assert.equal(state.miniState.turnPlayerId, "p1");
  assert.equal(state.phase, "playing", "P1 ainda pode decidir seu saque");
});

test("Maletas só revela conteúdo de maletas que já foram abertas", () => {
  const { game, state: started } = enterGame("briefcase");
  let state = structuredClone(started);
  state.miniState.startPlayerId = "p1";
  state.miniState.turnPlayerId = "p1";
  state.miniState.contents = [2, "lose", 0.5, 1, 1.25, 1.5, 3, 5, "lose", 0.75];
  let masked = getCasinoStateForPlayer(state, "p1");
  assert.ok(masked.miniState.contents.every((value) => value == null));

  state = game.applyAction(state, { type: "briefcaseOpen", index: 0 }, "p1");
  masked = getCasinoStateForPlayer(state, "p2");
  assert.equal(masked.miniState.contents[0], 2);
  assert.ok(masked.miniState.contents.slice(1).every((value) => value == null));
});

test("Solo cria exatamente um adversário BOT e o reset preserva esse modo", () => {
  const game = new CasinoGame();
  const state = game.createInitialState({ difficulty: "quick", mode: "soloBot", playerIds: ["p1"] });
  assert.equal(state.mode, "soloBot");
  assert.deepEqual(state.expectedPlayers, ["p1", "BOT"]);
  assert.equal(state.players.p1.balance, 1000);
  assert.equal(state.players.BOT.balance, 1000);
  assert.ok(state.bot);
  assert.equal(state.bot.playerId, "BOT");

  const reset = game.reset(state);
  assert.equal(reset.mode, "soloBot");
  assert.deepEqual(reset.expectedPlayers, ["p1", "BOT"]);
  assert.equal(reset.length, "quick");
});

test("BOT vota e aposta sozinho com atraso humano, sem precisar de ação do cliente", () => {
  const game = new CasinoGame();
  let state = game.createInitialState({ difficulty: "normal", mode: "soloBot", playerIds: ["p1"] });
  const humanChoice = state.offeredGames[0];
  state = game.applyAction(state, { type: "vote", game: humanChoice }, "p1");

  // Primeiro tick apenas agenda a decisão do BOT.
  state = game.applyAction(state, { type: "tick", now: Date.now() }, "system");
  assert.ok(state.bot.decisionKey?.startsWith("vote:"));
  const voteAt = state.bot.nextActionAt;
  state = game.applyAction(state, { type: "tick", now: voteAt + 1 }, "system");
  assert.ok(state.offeredGames.includes(state.players.BOT.vote));
  assert.equal(state.phase, "betting");

  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "p1");
  state = game.applyAction(state, { type: "tick", now: voteAt + 20 }, "system");
  assert.ok(state.bot.decisionKey?.startsWith("bet:"));
  const betAt = state.bot.nextActionAt;
  state = game.applyAction(state, { type: "tick", now: betAt + 1 }, "system");
  assert.equal(state.players.BOT.betLocked, true);
  assert.ok(state.players.BOT.roundBet >= casinoMinimumBet(1000));
  assert.ok(state.players.BOT.roundBet <= 1000);
  assert.equal(state.phase, "playing");
});

test("BOT do Mines não enxerga as bombas e pode explodir como qualquer jogador", () => {
  const game = new CasinoGame();
  let state = game.createInitialState({ difficulty: "normal", mode: "soloBot", playerIds: ["p1"] });
  state.offeredGames = ["mines", "dice", "hilo"];
  state = game.applyAction(state, { type: "vote", game: "mines" }, "p1");
  state = game.applyAction(state, { type: "vote", game: "mines" }, "BOT");
  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "p1");
  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "BOT");
  assert.equal(state.miniState.kind, "mines");

  // Monta um cenário determinístico: a casa 0 é bomba. A IA escolhe apenas
  // entre casas fechadas; com random=0 ela pega a primeira, sem consultar mineIndexes.
  state.miniState.players.BOT.mineIndexes = [0, 1, 2, 3, 4];
  state.bot.plannedRound = state.round;
  state.bot.plannedGame = "mines";
  state.bot.minesCashoutAfter = 5;
  state.bot.decisionKey = null;

  const oldRandom = Math.random;
  try {
    Math.random = () => 0;
    state = game.applyAction(state, { type: "tick", now: Date.now() }, "system");
    const actAt = state.bot.nextActionAt;
    state = game.applyAction(state, { type: "tick", now: actAt + 1 }, "system");
  } finally {
    Math.random = oldRandom;
  }

  assert.equal(state.miniState.players.BOT.exploded, true);
  assert.equal(state.miniState.players.BOT.explodedIndex, 0);
  assert.equal(state.players.BOT.roundStatus, "lost");
  assert.equal(state.phase, "playing", "o humano ainda deve poder terminar a própria tentativa");
});

test("BOT usa somente decisões públicas no Crash, Dados e Hi-Lo e espera o humano no resultado", () => {
  const game = new CasinoGame();

  // Crash: alvo do BOT é um plano independente; se o crash vier antes, ele perde.
  let state = game.createInitialState({ difficulty: "normal", mode: "soloBot", playerIds: ["p1"] });
  state.offeredGames = ["crash", "mines", "dice"];
  state = game.applyAction(state, { type: "vote", game: "crash" }, "p1");
  state = game.applyAction(state, { type: "vote", game: "crash" }, "BOT");
  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "p1");
  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "BOT");
  state.bot.plannedRound = state.round;
  state.bot.plannedGame = "crash";
  state.bot.crashCashoutAt = 2.5;
  state.miniState.crashPoint = 1.1;
  state = game.applyAction(state, { type: "tick", now: state.miniState.startedAt + 5_000 }, "system");
  assert.equal(state.miniState.crashed, true);
  assert.equal(state.players.BOT.roundStatus, "lost");

  // RoundResult: o BOT confirma sozinho, mas não pula a tela antes do humano.
  assert.equal(state.phase, "roundResult");
  state.bot.decisionKey = null;
  state = game.applyAction(state, { type: "tick", now: Date.now() }, "system");
  const readyAt = state.bot.nextActionAt;
  state = game.applyAction(state, { type: "tick", now: readyAt + 1 }, "system");
  assert.equal(state.roundReady.BOT, true);
  assert.equal(state.roundReady.p1, false);
  assert.equal(state.phase, "roundResult");
});

function enterSoloBotMini(gameId) {
  const game = new CasinoGame();
  let state = game.createInitialState({ difficulty: "normal", mode: "soloBot", playerIds: ["p1"] });
  state.offeredGames = [gameId, "mines", "hilo"].filter((id, index, all) => all.indexOf(id) === index);
  while (state.offeredGames.length < 3) state.offeredGames.push(state.offeredGames.includes("dice") ? "crash" : "dice");
  state = game.applyAction(state, { type: "vote", game: gameId }, "p1");
  state = game.applyAction(state, { type: "vote", game: gameId }, "BOT");
  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "p1");
  state = game.applyAction(state, { type: "lockBet", amount: 100 }, "BOT");
  state.bot.plannedRound = state.round;
  state.bot.plannedGame = gameId;
  state.bot.decisionKey = null;
  return { game, state };
}

function runOneBotDecision(game, state, now = Date.now()) {
  let next = game.applyAction(state, { type: "tick", now }, "system");
  if (next.bot?.decisionKey) {
    next = game.applyAction(next, { type: "tick", now: next.bot.nextActionAt + 1 }, "system");
  }
  return next;
}

test("BOT consegue agir nas mesas que exigem decisão sem acessar o resultado futuro", () => {
  {
    const { game, state: initial } = enterSoloBotMini("roulette");
    const state = runOneBotDecision(game, initial);
    assert.ok(state.miniState.selections.BOT, "BOT deve escolher uma aposta na Roleta");
  }
  {
    const { game, state: initial } = enterSoloBotMini("race");
    const state = runOneBotDecision(game, initial);
    assert.ok(state.miniState.picks.BOT, "BOT deve escolher um corredor");
  }
  {
    const { game, state: initial } = enterSoloBotMini("slots");
    const state = runOneBotDecision(game, initial);
    assert.equal(state.miniState.players.BOT.spinning, true, "BOT deve girar o Jackpot");
  }
  {
    const { game, state: initial } = enterSoloBotMini("dice");
    const state = runOneBotDecision(game, initial);
    assert.equal(state.miniState.players.BOT.rollingDie, 1, "BOT deve lançar o primeiro dado");
  }
  {
    const { game, state: initial } = enterSoloBotMini("hilo");
    const state = runOneBotDecision(game, initial);
    assert.equal(state.miniState.players.BOT.flipping, true, "BOT deve escolher maior/menor e virar a carta");
  }
  {
    const { game, state: initial } = enterSoloBotMini("crash");
    let state = structuredClone(initial);
    state.bot.crashCashoutAt = 1;
    state.miniState.multiplier = 1.2;
    state.miniState.crashPoint = 20;
    state.miniState.startedAt = Date.now() - 100;
    state = runOneBotDecision(game, state);
    assert.notEqual(state.miniState.cashouts.BOT, null, "BOT deve sacar quando o alvo público planejado for alcançado");
  }
  {
    const { game, state: initial } = enterSoloBotMini("plinko");
    const state = runOneBotDecision(game, initial);
    assert.equal(state.miniState.players.BOT.dropping, true, "BOT deve soltar uma ficha no Plinko");
  }
  {
    const { game, state: initial } = enterSoloBotMini("briefcase");
    let state = structuredClone(initial);
    state.miniState.turnPlayerId = "BOT";
    state.miniState.startPlayerId = "BOT";
    state.bot.decisionKey = null;
    state = runOneBotDecision(game, state);
    assert.equal(state.miniState.openedBy.filter(Boolean).length, 1, "BOT deve escolher uma maleta quando for sua vez");
  }
});

test("Plano interno do BOT não é enviado no estado público do jogador", () => {
  const game = new CasinoGame();
  const state = game.createInitialState({ difficulty: "normal", mode: "soloBot", playerIds: ["p1"] });
  const publicState = getCasinoStateForPlayer(state, "p1");
  assert.equal(publicState.bot, null);
  assert.equal(publicState.mode, "soloBot");
  assert.ok(publicState.players.BOT);
});

test("BOT joga a Última Chance sozinho: escolhe a face e lança a moeda", () => {
  const game = new CasinoGame();
  let state = game.createInitialState({ difficulty: "normal", mode: "soloBot", playerIds: ["p1"] });
  state.phase = "lastChance";
  state.players.p1.balance = 300;
  state.players.BOT.balance = 0;
  state.miniState = {
    kind: "lastChance",
    eligibleIds: ["BOT"],
    choices: { BOT: null },
    coinResults: { BOT: null },
    results: { BOT: null },
    spinning: { BOT: false },
    spinStartedAt: { BOT: null },
    spinEndsAt: { BOT: null },
    revealEndsAt: { BOT: null },
    pendingCoinResults: { BOT: null },
  };
  state.bot.decisionKey = null;

  state = game.applyAction(state, { type: "tick", now: Date.now() }, "system");
  const chooseAt = state.bot.nextActionAt;
  state = game.applyAction(state, { type: "tick", now: chooseAt + 1 }, "system");
  assert.ok(state.miniState.choices.BOT === "dollar" || state.miniState.choices.BOT === "crown");
  assert.equal(state.miniState.spinning.BOT, false);

  state = game.applyAction(state, { type: "tick", now: chooseAt + 2 }, "system");
  const spinAt = state.bot.nextActionAt;
  state = game.applyAction(state, { type: "tick", now: spinAt + 1 }, "system");
  assert.equal(state.miniState.spinning.BOT, true);
  assert.ok(state.miniState.spinEndsAt.BOT > 0);

  state = game.applyAction(state, { type: "tick", now: state.miniState.spinEndsAt.BOT + 1 }, "system");
  assert.ok(state.miniState.results.BOT === "revived" || state.miniState.results.BOT === "failed");
  assert.equal(state.players.BOT.lastChanceUsed, true);
});
