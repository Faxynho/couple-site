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

test("Dados sempre gera três verdes e três vermelhos válidos, sem sobreposição", () => {
  const { state } = enterGame("dice");
  assert.equal(state.miniState.kind, "dice");
  for (const id of ["p1", "p2"]) {
    const p = state.miniState.players[id];
    assert.equal(p.green.length, 3);
    assert.equal(p.red.length, 3);
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

test("As oito mesas entram no submotor correto", () => {
  for (const id of ["mines", "crash", "roulette", "slots", "race", "dice", "hilo", "fortune"]) {
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

test("Jackpot deixa continuar após vitória e só fecha a rodada quando os dois terminam", () => {
  const { game, state: started } = enterGame("slots");
  let state = started;
  const oldRandom = Math.random;
  Math.random = () => 0; // três cerejas em todo giro
  try {
    state = game.applyAction(state, { type: "slotsSpin" }, "p1");
    assert.equal(state.miniState.players.p1.spinning, true);
    assert.equal(getCasinoStateForPlayer(state, "p1").miniState.players.p1.pendingSymbols.length, 3);
    assert.equal(getCasinoStateForPlayer(state, "p2").miniState.players.p1.pendingSymbols, null);
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.spinEndsAt + 1 }, "system");
    assert.equal(state.miniState.players.p1.awaitingDecision, true);
    assert.equal(state.phase, "playing");
    // O botão "Continuar" inicia outro giro e não encerra a rodada só porque o rival terminou.
    state = game.applyAction(state, { type: "slotsSpin" }, "p1");
    assert.equal(state.miniState.players.p1.spinning, true);
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.spinEndsAt + 1 }, "system");
    assert.equal(state.miniState.players.p1.streak, 2);
    state = game.applyAction(state, { type: "cashOut" }, "p1");
    assert.equal(state.miniState.players.p1.done, true);
    assert.equal(state.phase, "playing");

    state = game.applyAction(state, { type: "slotsSpin" }, "p2");
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p2.spinEndsAt + 1 }, "system");
    state = game.applyAction(state, { type: "cashOut" }, "p2");
  } finally {
    Math.random = oldRandom;
  }
  assert.equal(state.phase, "roundResult");
});

test("Dados exige dois cliques, um dado por vez, e só então calcula o resultado", () => {
  const { game, state: started } = enterGame("dice");
  let state = structuredClone(started);
  state.miniState.players.p1.green = [2, 5, 7];
  state.miniState.players.p1.red = [3, 8, 10];
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
  state.miniState.players.p1.red = [3, 8, 10];
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

test("Jackpot continua normalmente quando o rival já sacou ou perdeu", () => {
  const { game, state: started } = enterGame("slots");
  let state = started;
  const oldRandom = Math.random;
  try {
    Math.random = () => 0; // P1: três cerejas
    state = game.applyAction(state, { type: "slotsSpin" }, "p1");
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.spinEndsAt + 1 }, "system");
    assert.equal(state.miniState.players.p1.awaitingDecision, true);

    const seq = [0.01, 0.30, 0.95];
    Math.random = () => seq.shift() ?? 0.95; // P2: três símbolos diferentes
    state = game.applyAction(state, { type: "slotsSpin" }, "p2");
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p2.spinEndsAt + 1 }, "system");
    assert.equal(state.miniState.players.p2.done, true);
    assert.equal(state.phase, "playing");

    Math.random = () => 0; // P1 aperta Continuar e ganha outro giro
    state = game.applyAction(state, { type: "slotsSpin" }, "p1");
    assert.equal(state.miniState.players.p1.spinning, true);
    assert.equal(state.phase, "playing");
    state = game.applyAction(state, { type: "tick", now: state.miniState.players.p1.spinEndsAt + 1 }, "system");
    assert.equal(state.phase, "playing");
    assert.equal(state.miniState.players.p1.awaitingDecision, true);
    assert.equal(state.miniState.players.p1.streak, 2);
  } finally {
    Math.random = oldRandom;
  }
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
