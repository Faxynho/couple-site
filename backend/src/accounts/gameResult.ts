import { GameId, Player, RoomMode } from "../types";
import { accountStore } from "./AccountStore";
import { ACCOUNT_IDS, AccountId, NO_RANK, RecordScoreType } from "./types";

/**
 * Traduz o estado (já finalizado) de qualquer um dos jogos para um formato
 * único que o AccountStore entende — é o único lugar do backend que "sabe"
 * onde cada jogo guarda dificuldade/duração/pontuação, então adicionar um
 * jogo novo no futuro só exige um `case` novo aqui, nada em Room.ts.
 *
 * Importante: só olhamos o estado DEPOIS de finished/isSolved ser verdadeiro
 * — chamado a partir de Room.applyAction, uma única vez por partida (ver o
 * guard `statsRecordedForMatch` em Room.ts). Qualquer erro aqui é capturado
 * pelo chamador — uma falha ao registrar estatística nunca pode quebrar o
 * jogo em si.
 */

type Bucket = "solo" | "together" | "duel";

interface PlayerOutcome {
  accountId: AccountId;
  /** null quando não há uma métrica que faça sentido virar recorde (ex.:
   *  Mini RPG quando o jogador perdeu — só a vitória tem um "recorde"). */
  metricValue: number | null;
  scoreType: RecordScoreType;
  result: "win" | "loss" | "draw" | "solo";
  goals?: { scored: number; conceded: number };
}

interface MatchOutcome {
  rank: string;
  durationMs: number;
  bucket: Bucket;
  /** Só contém jogadores com uma conta fixa selecionada — visitantes nunca
   *  entram aqui, então nunca geram estatística nem recorde. */
  players: PlayerOutcome[];
  /** Métrica da partida "Juntos" — marca da DUPLA, não de uma conta isolada
   *  (ver TogetherRecords em accounts/types.ts). Só populada quando bucket é
   *  "together"; `null` quando o jogo não tem uma marca coletiva que faça
   *  sentido virar recorde nesse resultado específico (ex.: Mini RPG em
   *  dupla perdendo pro BOT). */
  togetherMetric?: { value: number; scoreType: RecordScoreType } | null;
}

interface ResultsBasedState {
  difficulty?: string;
  mode?: string; // "together" | "duel"
  startedAt: number;
  finishedAt: number | null;
  results: { playerId: string; place: number; timeMs: number }[];
}

function accountFor(playerId: string, accountByPlayerId: Map<string, AccountId | undefined>): AccountId | undefined {
  return accountByPlayerId.get(playerId);
}

/** Sudoku, Palavras Cruzadas e Caça-Palavras compartilham exatamente o mesmo
 *  formato de resultado ({ playerId, place, timeMs }), preenchido tanto no
 *  modo "together" quanto no "duel" — então uma única função serve os três. */
function extractResultsBased(
  state: ResultsBasedState,
  accountByPlayerId: Map<string, AccountId | undefined>
): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt);
  const bucket: Bucket = state.mode === "duel" ? "duel" : "together";
  const players: PlayerOutcome[] = [];
  for (const r of state.results) {
    const accountId = accountFor(r.playerId, accountByPlayerId);
    if (!accountId) continue;
    const result = bucket === "duel" ? (r.place === 1 ? "win" : "loss") : "solo";
    players.push({ accountId, metricValue: r.timeMs, scoreType: "time", result });
  }
  const togetherMetric = bucket === "together" ? { value: durationMs, scoreType: "time" as const } : null;
  return { rank: state.difficulty ?? NO_RANK, durationMs, bucket, players, togetherMetric };
}

interface PuzzleStateShape {
  difficulty?: string;
  startedAt: number;
  solvedAt: number | null;
}

function extractPuzzle(
  state: PuzzleStateShape,
  roomMode: RoomMode,
  players: Player[]
): MatchOutcome {
  const durationMs = Math.max(0, (state.solvedAt ?? Date.now()) - state.startedAt);
  // O Quebra-cabeça nunca tem modo de duelo — em dupla é sempre cooperativo.
  const bucket: Bucket = roomMode === "duo" ? "together" : "solo";
  const outcomePlayers: PlayerOutcome[] = [];
  if (bucket === "solo") {
    const accountId = players[0]?.accountId;
    if (accountId) outcomePlayers.push({ accountId, metricValue: durationMs, scoreType: "time", result: "solo" });
  }
  const togetherMetric = bucket === "together" ? { value: durationMs, scoreType: "time" as const } : null;
  return { rank: state.difficulty ?? NO_RANK, durationMs, bucket, players: outcomePlayers, togetherMetric };
}

interface QuizStateShape {
  difficulty?: string;
  mode?: string; // "solo" | "together" | "duel"
  startedAt: number;
  finishedAt: number | null;
  expectedPlayers: string[];
  players: Record<string, { score: number }>;
  teamScore?: number;
}

function extractQuiz(state: QuizStateShape, accountByPlayerId: Map<string, AccountId | undefined>): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt);
  const bucket: Bucket = state.mode === "duel" ? "duel" : state.mode === "together" ? "together" : "solo";
  const players: PlayerOutcome[] = [];

  if (bucket === "duel") {
    const ids = state.expectedPlayers;
    const scores = ids.map((id) => state.players[id]?.score ?? 0);
    const winnerIndex = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
    ids.forEach((id, i) => {
      const accountId = accountFor(id, accountByPlayerId);
      if (!accountId) return;
      const result = winnerIndex === null ? "draw" : i === winnerIndex ? "win" : "loss";
      players.push({ accountId, metricValue: scores[i], scoreType: "points", result });
    });
  } else if (bucket === "solo") {
    const id = state.expectedPlayers[0];
    const accountId = id ? accountFor(id, accountByPlayerId) : undefined;
    if (accountId) {
      players.push({ accountId, metricValue: state.players[id]?.score ?? 0, scoreType: "points", result: "solo" });
    }
  }

  // "together": a pontuação de equipe (teamScore) vira o recorde "Juntos" —
  // não é um recorde pessoal de ninguém, é da dupla.
  const togetherMetric =
    bucket === "together" && typeof state.teamScore === "number"
      ? { value: state.teamScore, scoreType: "points" as const }
      : null;

  return { rank: state.difficulty ?? NO_RANK, durationMs, bucket, players, togetherMetric };
}

interface ColorsStateShape {
  difficulty?: string;
  mode?: string; // "competitive" | "cooperative"
  startedAt: number;
  finishedAt: number | null;
  rounds: { guesses: Record<string, { score: number }> }[];
}

function extractColors(
  state: ColorsStateShape,
  roomMode: RoomMode,
  accountByPlayerId: Map<string, AccountId | undefined>
): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt);
  const rank = state.difficulty ?? NO_RANK;

  if (state.mode === "cooperative") {
    // Só existe um palpite por rodada (de quem adivinha) — pontuação de
    // equipe, sem "quem ganhou de quem" para registrar por conta. Vira o
    // recorde "Juntos": pontuação total da dupla naquela partida.
    const participantIds = new Set<string>();
    for (const round of state.rounds) for (const id of Object.keys(round.guesses)) participantIds.add(id);
    const [soleGuesserId] = [...participantIds];
    const totalScore = (playerId: string) =>
      state.rounds.reduce((sum, round) => sum + (round.guesses[playerId]?.score ?? 0), 0);
    const togetherMetric = soleGuesserId ? { value: totalScore(soleGuesserId), scoreType: "points" as const } : null;
    return { rank, durationMs, bucket: "together", players: [], togetherMetric };
  }

  const totalScore = (playerId: string) =>
    state.rounds.reduce((sum, round) => sum + (round.guesses[playerId]?.score ?? 0), 0);

  const participantIds = new Set<string>();
  for (const round of state.rounds) for (const id of Object.keys(round.guesses)) participantIds.add(id);
  const ids = [...participantIds];

  const bucket: Bucket = roomMode === "duo" && ids.length >= 2 ? "duel" : "solo";

  if (bucket === "solo") {
    const id = ids[0];
    const accountId = id ? accountFor(id, accountByPlayerId) : undefined;
    const players: PlayerOutcome[] = accountId
      ? [{ accountId, metricValue: totalScore(id), scoreType: "points", result: "solo" }]
      : [];
    return { rank, durationMs, bucket, players };
  }

  const [idA, idB] = ids;
  const scoreA = totalScore(idA);
  const scoreB = totalScore(idB);
  const winnerId = scoreA === scoreB ? null : scoreA > scoreB ? idA : idB;
  const players: PlayerOutcome[] = [];
  for (const id of ids) {
    const accountId = accountFor(id, accountByPlayerId);
    if (!accountId) continue;
    const result = winnerId === null ? "draw" : id === winnerId ? "win" : "loss";
    players.push({ accountId, metricValue: totalScore(id), scoreType: "points", result });
  }
  return { rank, durationMs, bucket, players };
}

interface MemoryStateShape {
  difficulty?: string;
  mode?: string; // "solo" | "duel" | "together"
  playStartedAt: number | null;
  finishedAt: number | null;
  expectedPlayers: string[];
  results: { playerId: string; place: number; score: number; pairsFound: number; timeUsedMs: number }[];
}

interface TermoStateShape {
  variant?: string;
  mode?: string;
  startedAt: number;
  finishedAt: number | null;
  results: {
    playerId: string;
    outcome: "win" | "loss" | "draw" | "solo";
    completed: boolean;
    timeUsedMs: number;
  }[];
}

interface AirHockeyStateShape {
  difficulty?: string;
  mode?: string;
  startedAt: number;
  finishedAt: number | null;
  results: { playerId: string; outcome: "win" | "loss" | "draw" | "solo"; score: number; conceded: number }[];
}

function extractAirHockey(state: AirHockeyStateShape, accountByPlayerId: Map<string, AccountId | undefined>): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt);
  const bucket: Bucket = state.mode === "duel" ? "duel" : "solo";
  const players: PlayerOutcome[] = [];
  for (const result of state.results ?? []) {
    const accountId = accountFor(result.playerId, accountByPlayerId);
    if (!accountId) continue;
    const won = bucket === "duel" ? result.outcome === "win" : result.score > result.conceded;
    players.push({
      accountId,
      // A marca é o menor tempo para vencer. Guardar apenas "7 pontos"
      // seria redundante: toda vitória termina exatamente nesse placar.
      metricValue: won ? durationMs : null,
      scoreType: "time",
      result: bucket === "duel" ? result.outcome : "solo",
      goals: { scored: result.score, conceded: result.conceded },
    });
  }
  return { rank: state.difficulty ?? NO_RANK, durationMs, bucket, players };
}

/** O recorde do Termo usa o menor tempo de uma partida efetivamente concluída.
 * A variante (1, 2 ou 4 palavras) é o rank, preservando o formato genérico
 * de recordes já usado pela aplicação. */
function extractTermo(state: TermoStateShape, accountByPlayerId: Map<string, AccountId | undefined>): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt);
  const bucket: Bucket = state.mode === "duel" ? "duel" : "solo";
  const players: PlayerOutcome[] = [];

  for (const result of state.results ?? []) {
    const accountId = accountFor(result.playerId, accountByPlayerId);
    if (!accountId) continue;
    players.push({
      accountId,
      metricValue: result.completed ? result.timeUsedMs : null,
      scoreType: "time",
      result: bucket === "duel" ? result.outcome as "win" | "loss" | "draw" : "solo",
    });
  }

  return { rank: state.variant ?? NO_RANK, durationMs, bucket, players };
}

/** O recorde do Jogo da Memória é a maior pontuação. O desempate por pares e
 * tempo já é resolvido pelo motor para o resultado da partida, sem criar um
 * segundo formato de recorde fora da arquitetura atual. */
function extractMemory(state: MemoryStateShape, accountByPlayerId: Map<string, AccountId | undefined>): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - (state.playStartedAt ?? state.finishedAt ?? Date.now()));
  const rank = state.difficulty ?? NO_RANK;
  const results = state.results ?? [];

  if (state.mode === "together") {
    const score = results[0]?.score ?? 0;
    return {
      rank,
      durationMs,
      bucket: "together",
      players: [],
      togetherMetric: { value: score, scoreType: "points" },
    };
  }

  if (state.mode === "duel") {
    const first = results[0];
    const second = results[1];
    const isDraw = Boolean(
      first && second && first.score === second.score && first.pairsFound === second.pairsFound && first.timeUsedMs === second.timeUsedMs
    );
    const players: PlayerOutcome[] = [];
    for (const result of results) {
      const accountId = accountFor(result.playerId, accountByPlayerId);
      if (!accountId) continue;
      players.push({
        accountId,
        metricValue: result.score,
        scoreType: "points",
        result: isDraw ? "draw" : result.place === 1 ? "win" : "loss",
      });
    }
    return { rank, durationMs, bucket: "duel", players };
  }

  const result = results[0];
  const playerId = result?.playerId ?? state.expectedPlayers[0];
  const accountId = playerId ? accountFor(playerId, accountByPlayerId) : undefined;
  return {
    rank,
    durationMs,
    bucket: "solo",
    players: accountId ? [{ accountId, metricValue: result?.score ?? 0, scoreType: "points", result: "solo" }] : [],
  };
}

interface RPGStateShape {
  mode: string; // "1v1" | "soloBot" | "duoBot"
  teamA: string[];
  teamB: string[];
  humanPlayerIds: string[];
  winnerTeam: "a" | "b" | "draw" | null;
  startedAt: number;
  finishedAt: number | null;
}

function extractRPG(state: RPGStateShape, accountByPlayerId: Map<string, AccountId | undefined>): MatchOutcome {
  const durationMs = Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt);
  // O Mini RPG não tem seletor de dificuldade — usa o rank único "geral".
  const rank = NO_RANK;

  if (state.mode === "duoBot") {
    // Dupla contra o BOT: sem "quem venceu de quem" entre as duas contas —
    // mas uma vitória vira o recorde "Juntos" (tempo até vencer o BOT).
    const won = state.winnerTeam === "a";
    return {
      rank,
      durationMs,
      bucket: "together",
      players: [],
      togetherMetric: won ? { value: durationMs, scoreType: "time" } : null,
    };
  }

  if (state.mode === "soloBot") {
    const id = state.humanPlayerIds[0];
    const accountId = id ? accountFor(id, accountByPlayerId) : undefined;
    if (!accountId) return { rank, durationMs, bucket: "solo", players: [] };
    const won = state.winnerTeam === "a";
    // Só a vitória vira recorde (tempo até vencer) — uma derrota não tem uma
    // "melhor marca" que faça sentido guardar.
    return {
      rank,
      durationMs,
      bucket: "solo",
      players: [{ accountId, metricValue: won ? durationMs : null, scoreType: "time", result: "solo" }],
    };
  }

  // "1v1"
  const idA = state.teamA[0];
  const idB = state.teamB[0];
  const players: PlayerOutcome[] = [];
  for (const [id, team] of [[idA, "a"] as const, [idB, "b"] as const]) {
    const accountId = id ? accountFor(id, accountByPlayerId) : undefined;
    if (!accountId) continue;
    const result = state.winnerTeam === "draw" ? "draw" : state.winnerTeam === team ? "win" : "loss";
    const metricValue = result === "win" ? durationMs : null;
    players.push({ accountId, metricValue, scoreType: "time", result });
  }
  return { rank, durationMs, bucket: "duel", players };
}

function extractGameOutcome(
  gameId: GameId,
  roomMode: RoomMode,
  gameState: unknown,
  players: Player[],
  accountByPlayerId: Map<string, AccountId | undefined>
): MatchOutcome | null {
  switch (gameId) {
    case "puzzle":
      return extractPuzzle(gameState as PuzzleStateShape, roomMode, players);
    case "sudoku":
    case "crossword":
    case "wordsearch":
      return extractResultsBased(gameState as ResultsBasedState, accountByPlayerId);
    case "quiz":
      return extractQuiz(gameState as QuizStateShape, accountByPlayerId);
    case "colors":
      return extractColors(gameState as ColorsStateShape, roomMode, accountByPlayerId);
    case "memory":
      return extractMemory(gameState as MemoryStateShape, accountByPlayerId);
    case "termo":
      return extractTermo(gameState as TermoStateShape, accountByPlayerId);
    case "rpg":
      return extractRPG(gameState as RPGStateShape, accountByPlayerId);
    case "airhockey":
      return extractAirHockey(gameState as AirHockeyStateShape, accountByPlayerId);
    default:
      return null;
  }
}

/**
 * Chamado por Room.applyAction assim que uma partida vira "finished" (uma
 * única vez, garantido pelo guard `statsRecordedForMatch`). Nunca lança —
 * qualquer problema de extração é responsabilidade do chamador tratar.
 */
export function recordFinishedMatch(params: {
  roomMode: RoomMode;
  gameId: GameId;
  players: Player[];
  gameState: unknown;
}) {
  const accountByPlayerId = new Map<string, AccountId | undefined>(
    params.players.map((p) => [p.id, p.accountId])
  );

  const outcome = extractGameOutcome(params.gameId, params.roomMode, params.gameState, params.players, accountByPlayerId);
  if (!outcome) return;

  if (params.roomMode === "solo") {
    for (const p of outcome.players) {
      accountStore.recordSoloMatch(p.accountId, params.gameId, outcome.rank, outcome.durationMs, p.metricValue, p.scoreType);
      if (p.goals) accountStore.recordGameGoals("solo", p.accountId, params.gameId, p.goals.scored, p.goals.conceded);
    }
    return;
  }

  // Duo: as estatísticas "da dupla" (tempo total, partidas juntos, duelos
  // totais, dificuldade mais jogada) só contam quando as DUAS contas fixas
  // estão na sala — um duelo contra um visitante ainda conta para o
  // vitórias/derrotas/recorde PESSOAL de quem tem conta, mas não vira
  // "tempo do casal no site".
  const accountsInRoom = new Set(params.players.map((p) => p.accountId).filter(Boolean));
  const bothAccountsPresent = ACCOUNT_IDS.every((id) => accountsInRoom.has(id));
  if (bothAccountsPresent) {
    accountStore.recordDuoSharedMatch(outcome.bucket === "duel" ? "duel" : "together", outcome.rank, outcome.durationMs);
    // O recorde "Juntos" é da dupla de verdade (André + Flávia), não conta
    // se um dos dois lados era visitante.
    if (outcome.bucket === "together" && outcome.togetherMetric) {
      accountStore.recordTogetherMatch(
        params.gameId,
        outcome.rank,
        outcome.togetherMetric.value,
        outcome.togetherMetric.scoreType
      );
    }
  }

  if (outcome.bucket === "duel") {
    for (const p of outcome.players) {
      accountStore.recordDuelOutcome(p.accountId, params.gameId, outcome.rank, p.result as "win" | "loss" | "draw", p.metricValue, p.scoreType);
      if (p.goals) accountStore.recordGameGoals("duel", p.accountId, params.gameId, p.goals.scored, p.goals.conceded);
    }
  }
}
