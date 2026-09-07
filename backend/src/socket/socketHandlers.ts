import { randomUUID } from "node:crypto";
import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { ALL_GAME_IDS, GameId, RoomMode } from "../types";
import { isValidImageId, isValidDifficulty } from "../games/puzzle/puzzleImages";
import { isValidSudokuDifficulty } from "../games/sudoku/sudokuGenerator";
import { isValidSudokuMode } from "../games/sudoku/SudokuGame";
import { isValidColorDifficulty, isValidColorMode } from "../games/colors/ColorMemoryGame";
import { isValidCrosswordDifficulty } from "../games/crossword/crosswordGenerator";
import { isValidCrosswordMode } from "../games/crossword/CrosswordGame";
import { isValidWordSearchDifficulty } from "../games/wordsearch/wordsearchGenerator";
import { isValidWordSearchMode } from "../games/wordsearch/WordSearchGame";
import { isValidQuizDifficulty } from "../games/quiz/questionBank";
import { isValidQuizMode, QUIZ_REVEAL_DURATION_MS } from "../games/quiz/QuizGame";
import { isValidRPGMode, RPG_INTRO_DURATION_MS, RPG_RESOLVE_PAUSE_MS } from "../games/rpg/RPGGame";
import { isValidMemoryDifficulty, isValidMemoryMode, MemoryState } from "../games/memory/MemoryGame";
import { isValidTermoMode, isValidTermoVariant, TermoState } from "../games/termo/TermoGame";
import { AirHockeyState, isValidAirHockeyDifficulty, isValidAirHockeyMode } from "../games/airhockey/AirHockeyGame";
import { ChessState, isValidChessDifficulty, isValidChessMode } from "../games/chess/ChessGame";
import { advanceAirHockeyInputTimeline, AIR_HOCKEY_AUTHORITATIVE_DELAY_MS, QueuedAirHockeyInput } from "../games/airhockey/AirHockeyInputTimeline";
import { isAccountId } from "../accounts/types";
import { isFinishedSoloState, isSoloResumePayload, rebaseSoloState } from "../solo/soloMatch";
import { BoardRaceState } from "../games/boardrace/types";
import { getWhoAmIStateForPlayer, isValidWhoAmICategory, isValidWhoAmIMode, WhoAmIState } from "../games/whoami/WhoAmIGame";
import { getBoardRaceStateForPlayer, isValidBoardRaceMode } from "../games/boardrace/BoardRaceGame";
import { CasinoState, getCasinoStateForPlayer, isValidCasinoLength } from "../games/casino/CasinoGame";

interface SocketData {
  roomCode?: string;
  playerName?: string;
  /** Identidade persistente do jogador nesta conexão (ver Player.id) — usada
   *  em toda ação de jogo em vez do socket.id, que muda a cada reconexão. */
  playerId?: string;
}

type AckCallback = (response: Record<string, unknown>) => void;

interface StartPayload {
  imageId?: string;
  difficulty?: string;
  imageWidth?: number;
  imageHeight?: number;
}

/** Extrai só os campos válidos de um payload de início/troca de imagem. */
function sanitizeStartOptions(payload?: StartPayload) {
  const options: { imageId?: string; difficulty?: string; imageWidth?: number; imageHeight?: number } = {};
  if (payload?.imageId && isValidImageId(payload.imageId)) options.imageId = payload.imageId;
  if (payload?.difficulty && isValidDifficulty(payload.difficulty)) options.difficulty = payload.difficulty;
  if (typeof payload?.imageWidth === "number" && payload.imageWidth > 0) options.imageWidth = payload.imageWidth;
  if (typeof payload?.imageHeight === "number" && payload.imageHeight > 0) options.imageHeight = payload.imageHeight;
  return options;
}

/** Só aceita "andre"/"flavia" — qualquer outra coisa (visitante, valor
 *  malformado) vira `undefined`, o mesmo que "sem conta". */
function sanitizeAccountId(value: unknown): "andre" | "flavia" | undefined {
  return isAccountId(value) ? value : undefined;
}

function broadcastRoom(io: Server, roomCode: string, roomManager: RoomManager) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit("room:update", room.toSnapshot());
}

interface ColorsStateShape {
  mode?: string;
  seerId?: string | null;
  guesserId?: string | null;
  currentRound: number;
  finished: boolean;
  rounds: { target: unknown; guesses: Record<string, unknown> }[];
}

/**
 * No modo cooperativo da Memória de Cores, quem está adivinhando não pode
 * receber a cor-alvo da rodada atual — senão bastaria abrir o DevTools para
 * "trapacear". Cada jogador recebe sua própria versão do estado; assim que
 * ele envia o palpite (ou a partida termina), a cor real é revelada dos dois lados.
 */
function getColorsStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as ColorsStateShape | null;
  if (!s || s.mode !== "cooperative" || playerId !== s.guesserId) return state;

  const currentRoundState = s.rounds[s.currentRound];
  const alreadyGuessed = Boolean(currentRoundState?.guesses[playerId]);
  if (s.finished || !currentRoundState || alreadyGuessed) return state;

  const clone = structuredClone(s);
  clone.rounds[s.currentRound] = {
    ...clone.rounds[s.currentRound],
    target: { h: 0, s: 0, v: 0, hex: "#e5e5e5", hidden: true },
  };
  return clone;
}

/** Envia o estado do jogo — no caso da Memória de Cores cooperativa, cada
 *  jogador recebe uma versão personalizada (ver getColorsStateForPlayer). */
/** Envia um evento a um jogador específico pelo socket.id da conexão ATUAL
 *  dele (Player.id é uma identidade persistente, não um socket.io room —
 *  nunca dá pra usar `io.to(player.id)` diretamente). Se ele nunca chegou a
 *  se conectar (ou está temporariamente desconectado), não há para onde
 *  mandar — a próxima reconexão (room:sync) traz o estado atualizado. */
function emitToPlayer(io: Server, room: { getSocketId(playerId: string): string | undefined }, playerId: string, event: string, payload: unknown) {
  const socketId = room.getSocketId(playerId);
  if (socketId) io.to(socketId).emit(event, payload);
}

function broadcastGameState(io: Server, roomCode: string, roomManager: RoomManager) {
  const room = roomManager.getRoom(roomCode);
  if (!room || room.gameState == null) return;
  if (room.gameId === "colors") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getColorsStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "crossword") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getCrosswordStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "wordsearch") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getWordSearchStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "quiz") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getQuizStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "rpg") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getRPGStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "memory") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getMemoryStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "termo") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getTermoStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "sudoku") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getSudokuStateForPlayer(room.gameState, player.id));
    }
  } else if (room.gameId === "whoami") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getWhoAmIStateForPlayer(room.gameState as WhoAmIState, player.id));
    }
  } else if (room.gameId === "boardrace") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getBoardRaceStateForPlayer(room.gameState as BoardRaceState, player.id));
    }
  } else if (room.gameId === "casino") {
    for (const player of room.players.values()) {
      emitToPlayer(io, room, player.id, "game:state", getCasinoStateForPlayer(room.gameState as CasinoState, player.id));
    }
  } else {
    io.to(roomCode).emit("game:state", room.gameState);
  }

  // Snapshot integral somente da sala Solo e somente para a própria conta.
  // Os eventos públicos mascarados acima continuam iguais para todos os jogos
  // e para todas as salas Duo.
  if (room.roomMode === "solo" && room.gameId && room.gameState) {
    const player = [...room.players.values()][0];
    if (player?.accountId) {
      emitToPlayer(io, room, player.id, "solo:state", {
        ownerId: player.accountId,
        room: room.toSnapshot(),
        playerId: player.id,
        playerName: player.name,
        state: room.gameState,
        savedAt: Date.now(),
      });
    }
  }
}

/** Retorna a versão pública (sem `game.gameState` cru) do estado de acordo com o jogo/jogador. */
function getMaskedStateForPlayer(room: { gameId: GameId | null; gameState: unknown }, playerId: string): unknown {
  if (room.gameState == null) return null;
  if (room.gameId === "colors") return getColorsStateForPlayer(room.gameState, playerId);
  if (room.gameId === "crossword") return getCrosswordStateForPlayer(room.gameState, playerId);
  if (room.gameId === "wordsearch") return getWordSearchStateForPlayer(room.gameState, playerId);
  if (room.gameId === "quiz") return getQuizStateForPlayer(room.gameState, playerId);
  if (room.gameId === "rpg") return getRPGStateForPlayer(room.gameState, playerId);
  if (room.gameId === "memory") return getMemoryStateForPlayer(room.gameState, playerId);
  if (room.gameId === "termo") return getTermoStateForPlayer(room.gameState, playerId);
  if (room.gameId === "sudoku") return getSudokuStateForPlayer(room.gameState, playerId);
  if (room.gameId === "whoami") return getWhoAmIStateForPlayer(room.gameState as WhoAmIState, playerId);
  if (room.gameId === "boardrace") return getBoardRaceStateForPlayer(room.gameState as BoardRaceState, playerId);
  if (room.gameId === "casino") return getCasinoStateForPlayer(room.gameState as CasinoState, playerId);
  return room.gameState;
}

interface CrosswordCellShape {
  block: boolean;
  solution: string | null;
  number: number | null;
}
interface CrosswordWordShape {
  id: string;
  number: number;
  direction: string;
  row: number;
  col: number;
  length: number;
  clue: string;
  answer: string;
}
interface CrosswordProgressShape {
  values: (string | null)[];
  completedWordIds: string[];
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}
interface CrosswordStateShape {
  mode?: string;
  cells: CrosswordCellShape[];
  words: CrosswordWordShape[];
  progress: Record<string, CrosswordProgressShape>;
  completedWordBy?: Record<string, string[]>;
}

/**
 * Nunca envia `cell.solution` nem `word.answer` ao cliente — o front só
 * precisa saber quais células são bloco/número e qual a dica de cada palavra,
 * nunca a resposta. No modo Duelo, cada jogador só recebe as LETRAS que ele
 * mesmo digitou; o progresso do adversário chega só como um resumo (quantas
 * palavras já completou), impedindo qualquer tipo de "cola" via DevTools.
 */
function getCrosswordStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as CrosswordStateShape | null;
  if (!s) return state;

  const publicCells = s.cells.map((c) => ({ block: c.block, number: c.number }));
  const publicWords = s.words.map((w) => ({
    id: w.id,
    number: w.number,
    direction: w.direction,
    row: w.row,
    col: w.col,
    length: w.length,
    clue: w.clue,
  }));

  const progress: Record<string, unknown> = {};
  for (const [pid, prog] of Object.entries(s.progress)) {
    if (s.mode !== "duel" || pid === playerId) {
      progress[pid] = prog;
    } else {
      progress[pid] = {
        finished: prog.finished,
        finishedAt: prog.finishedAt,
        timeMs: prog.timeMs,
        wordsCompleted: prog.completedWordIds.length,
        completedWordIds: prog.completedWordIds,
      };
    }
  }

  return { ...s, cells: publicCells, words: publicWords, progress };
}

interface SudokuCellShape {
  value: number;
  isGiven: boolean;
  filledBy?: string;
}
interface SudokuProgressShape {
  cells: SudokuCellShape[];
  moves: number;
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}
interface SudokuStateShape {
  mode?: string;
  progress: Record<string, SudokuProgressShape>;
  solution?: number[];
}

/**
 * No modo Duelo, os dois jogadores recebem o MESMO puzzle — mostrar a grade
 * do adversário revelaria a solução de graça (diferente do Palavras Cruzadas,
 * aqui não tem "resumo parcial" que não seja a resposta em si). Por isso, no
 * Duelo cada jogador só recebe a própria grade; a do adversário chega só como
 * um placar (terminou, quando, quantas casas já preencheu).
 */
function getSudokuStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as SudokuStateShape | null;
  if (!s) return state;

  // A solução é segredo do servidor. O restante do estado é público,
  // incluindo o contador de dicas, para que o Duelo seja transparente.
  const { solution: _solution, ...publicState } = s;

  const progress: Record<string, unknown> = {};
  for (const [pid, prog] of Object.entries(s.progress)) {
    if (s.mode !== "duel" || pid === playerId) {
      progress[pid] = prog;
    } else {
      const cellsFilled = prog.cells.filter((c) => !c.isGiven && c.value !== 0).length;
      progress[pid] = { finished: prog.finished, finishedAt: prog.finishedAt, timeMs: prog.timeMs, cellsFilled };
    }
  }

  return { ...publicState, progress };
}

interface WordSearchWordShape {
  id: string;
  word: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}
interface WordSearchProgressShape {
  found: Record<string, { row: number; col: number }[]>;
  foundBy?: Record<string, string[]>;
  mistakes: number;
  finished: boolean;
  finishedAt: number | null;
  timeMs: number | null;
}
interface WordSearchStateShape {
  mode?: string;
  words: WordSearchWordShape[];
  progress: Record<string, WordSearchProgressShape>;
}

/**
 * A palavra em si sempre aparece na lista (é o que o jogador precisa achar);
 * só a localização exata na grade fica escondida até ser encontrada. No modo
 * Duelo, cada jogador só vê as próprias palavras encontradas — o progresso do
 * adversário chega como resumo (quantas encontrou), sem revelar quais nem onde.
 */
function getWordSearchStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as WordSearchStateShape | null;
  if (!s) return state;

  const isDuel = s.mode === "duel";

  const publicWords = s.words.map((w) => {
    // Junta todas as pessoas que encontraram esta palavra.
    const foundEntries = Object.entries(s.progress)
      .flatMap(([pid, prog]) => {
        const cells = prog.found?.[w.id];
        const foundBy = prog.foundBy?.[w.id] ?? (cells ? [pid] : []);
        if (!foundBy.length) return [];
        return [{ pid, cells, foundBy }];
      });

    if (foundEntries.length === 0) {
      return { id: w.id, word: w.word };
    }

    const foundBy = Array.from(
      new Set(foundEntries.flatMap((entry) => entry.foundBy))
    );

    if (!isDuel) {
      // Modo Juntos: a descoberta é compartilhada. Os dois recebem a
      // localização e a marcação da palavra na grade.
      const cells = foundEntries.find((entry) => entry.cells)?.cells;
      return {
        id: w.id,
        word: w.word,
        ...(cells ? { cells } : {}),
        foundBy,
      };
    }

    // Modo Duelo: cada jogador só recebe a localização se ELE encontrou.
    // Porém, todos recebem foundBy para que a lista inferior mostre quem
    // encontrou a palavra. Assim, saber que o oponente achou não revela
    // onde a palavra está na grade.
    const ownEntry = foundEntries.find((entry) => entry.pid === playerId);
    return {
      id: w.id,
      word: w.word,
      ...(ownEntry?.cells ? { cells: ownEntry.cells } : {}),
      foundBy,
    };
  });

  const progress: Record<string, unknown> = {};
  for (const [pid, prog] of Object.entries(s.progress)) {
    if (!isDuel || pid === playerId) {
      progress[pid] = prog;
    } else {
      progress[pid] = {
        finished: prog.finished,
        finishedAt: prog.finishedAt,
        timeMs: prog.timeMs,
        mistakes: prog.mistakes,
        wordsFound: Object.keys(prog.found).length,
      };
    }
  }

  return { ...s, words: publicWords, progress };
}

interface QuizQuestionShape {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
}
interface QuizAnswerShape {
  optionIndex: number | null;
  correct: boolean;
  points: number;
  timeMs: number;
}
interface QuizPlayerShape {
  score: number;
  answers: (QuizAnswerShape | null)[];
}
interface QuizStateShape {
  mode?: string;
  currentIndex: number;
  phase: "active" | "revealed";
  questions: QuizQuestionShape[];
  players: Record<string, QuizPlayerShape>;
  finished: boolean;
  questionStartedAt: number;
  revealedAt: number | null;
  timeLimitMs: number;
  teamScore?: number;
  teamAnswers?: (QuizAnswerShape | null)[];
  pendingSelections?: Record<string, number | null>;
}

/**
 * Nunca envia `correctIndex`/`explanation` da pergunta atual enquanto ela
 * ainda está "active" (só depois que vira "revealed", quando todos já
 * responderam ou o tempo acabou). Perguntas futuras (ainda não chegou a vez)
 * vêm sem texto/alternativas — evita qualquer tipo de "olhada adiante". A
 * alternativa escolhida por CADA OUTRO jogador na pergunta atual também fica
 * oculta até a revelação — só a própria resposta de quem está vendo aparece,
 * para ele saber que já respondeu e está esperando o par.
 */
function getQuizStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as QuizStateShape | null;
  if (!s) return state;

  const questions = s.questions.map((q, i) => {
    if (i > s.currentIndex) {
      return { id: q.id, category: q.category, difficulty: q.difficulty, question: "", options: [] };
    }
    const revealed = i < s.currentIndex || s.phase === "revealed";
    if (revealed) return q;
    const { correctIndex, explanation, ...publicQuestion } = q;
    return publicQuestion;
  });

  const players: Record<string, QuizPlayerShape> = {};
  for (const [pid, p] of Object.entries(s.players)) {
    const answers = p.answers.map((a, i) => {
      if (!a) return a;
      if (i === s.currentIndex && s.phase === "active" && pid !== playerId) return null;
      return a;
    });
    players[pid] = { ...p, answers };
  }

  return { ...s, questions, players };
}

interface RPGCombatantShape {
  id: string;
  isBot: boolean;
  team: "a" | "b";
  classId: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  alive: boolean;
  stunnedRounds: number;
  skippingThisRound: boolean;
  hand: unknown[];
  chosenCardId: string | null;
}
interface RPGStateShape {
  phase: "intro" | "choosing" | "resolved" | "finished";
  introStartedAt: number;
  resolvedAt: number | null;
  combatants: Record<string, RPGCombatantShape>;
  humanPlayerIds: string[];
  characterAppearances: Record<string, "man" | "woman" | null>;
}

/**
 * Enquanto a fase for "choosing" (escolhendo cartas), cada jogador só vê a
 * própria mão e a própria carta escolhida — a mão e a escolha de qualquer
 * outro combatente (adversário humano OU o BOT) ficam ocultas, só com um
 * `hasChosen` (já escolheu ou não) para dar feedback visual sem entregar
 * qual carta foi. Fora dessa fase (resolvida/terminada) tudo fica visível
 * para todos, já que o resultado da rodada precisa ser visto por todos.
 */
function getRPGStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as RPGStateShape | null;
  if (!s) return state;

  const combatants: Record<string, unknown> = {};
  for (const [id, c] of Object.entries(s.combatants)) {
    const hasChosen = Boolean(c.chosenCardId);
    if (id === playerId || s.phase !== "choosing") {
      combatants[id] = { ...c, hasChosen };
    } else {
      combatants[id] = { ...c, hand: [], chosenCardId: null, hasChosen };
    }
  }

  return { ...s, combatants };
}

/** O layout é o mesmo no Duelo, mas o ícone de uma carta só é enviado quando
 * ela está visível no progresso de quem recebeu o estado. O adversário nunca
 * recebe seus pares, cartas abertas ou mapeamento secreto. */
function getMemoryStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as MemoryState | null;
  if (!s) return state;

  const own = s.progress[playerId];
  const previewing = s.playStartedAt === null;
  const visibleIds = new Set([...(own?.matchedSlotIds ?? []), ...(own?.openSlotIds ?? [])]);
  const slots = s.slots.map((slot) => ({
    id: slot.id,
    empty: slot.iconId === null,
    imageSrc: slot.iconId !== null && (previewing || visibleIds.has(slot.id)) ? `/images/memory/${slot.iconId}.png` : null,
  }));

  const progress: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(s.progress)) {
    if (s.mode !== "duel" || id === playerId) {
      progress[id] = entry;
    } else {
      progress[id] = {
        matchedSlotIds: [],
        openSlotIds: [],
        score: entry.score,
        combo: entry.combo,
        pairsFound: entry.pairsFound,
        mistakes: entry.mistakes,
        mismatchUntil: null,
        finished: entry.finished,
        completed: entry.completed,
        finishedAt: entry.finishedAt,
        timeUsedMs: entry.timeUsedMs,
      };
    }
  }

  // O estado original tem slots.iconId; nunca espalhe esse campo ao cliente.
  return { ...s, slots, progress };
}

/** Estado público do Termo: durante a partida, nenhuma solução (nem índice ou
 * grafia) sai do servidor. No Duelo, as tentativas do rival são reduzidas a
 * contadores seguros. As respostas só aparecem depois do fim real da partida. */
function getTermoStateForPlayer(state: unknown, playerId: string): unknown {
  const s = state as TermoState | null;
  if (!s) return state;

  const progress: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(s.progress)) {
    if (id === playerId || s.mode === "solo") {
      progress[id] = entry;
    } else {
      progress[id] = {
        attemptsUsed: entry.attemptsUsed,
        solvedCount: entry.solvedIndices.length,
        finished: entry.finished,
        completed: entry.completed,
        finishedAt: entry.finishedAt,
        timeUsedMs: entry.timeUsedMs,
      };
    }
  }

  return {
    variant: s.variant,
    mode: s.mode,
    maxAttempts: s.maxAttempts,
    expectedPlayers: s.expectedPlayers,
    progress,
    startedAt: s.startedAt,
    finished: s.finished,
    finishedAt: s.finishedAt,
    results: s.results,
    revealedSolutions: s.finished ? s.solutions.map((solution) => solution.original.toLocaleUpperCase("pt-BR")) : null,
  };
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager) {
  const chessBotTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const airHockeyInputQueues = new Map<string, {
    startedAt: number;
    nextReceivedOrder: number;
    inputs: QueuedAirHockeyInput[];
  }>();
  // Diagnóstico opt-in para comparar a linha do tempo do pacote com a do
  // simulador. Não participa da decisão física nem altera a ordem das ações.
  const airHockeyPhysicsDebug = process.env.AIR_HOCKEY_DEBUG === "1";
  const airHockeyInputsSincePreviousTick = new Map<string, Array<{
    receivedAt: number;
    sequence?: number;
    playerId: string;
    previousServerTick: number;
    target: { x: number; y: number };
  }>>();

  const airHockeyQueueFor = (roomCode: string, state: AirHockeyState) => {
    const existing = airHockeyInputQueues.get(roomCode);
    if (existing?.startedAt === state.startedAt) return existing;
    const queue = { startedAt: state.startedAt, nextReceivedOrder: 0, inputs: [] as QueuedAirHockeyInput[] };
    airHockeyInputQueues.set(roomCode, queue);
    return queue;
  };

  const beginDelayedAirHockeyTimeline = (room: { code: string; gameState: unknown }) => {
    const state = room.gameState as AirHockeyState | null;
    if (!state || state.mode !== "duel") return;
    // O primeiro snapshot já representa o começo da linha física atrasada;
    // assim lastTickAt nunca salta para trás depois de ter sido enviado.
    state.lastTickAt -= AIR_HOCKEY_AUTHORITATIVE_DELAY_MS;
    airHockeyInputQueues.delete(room.code);
    airHockeyInputsSincePreviousTick.delete(room.code);
  };

  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.on("solo:resume", (payload: unknown, callback: AckCallback) => {
      if (!isSoloResumePayload(payload)) {
        callback?.({ ok: false, error: "O save desta partida é inválido." });
        return;
      }
      if (isFinishedSoloState(payload.gameId, payload.state)) {
        callback?.({ ok: false, error: "Esta partida já foi concluída." });
        return;
      }

      const restoredState = rebaseSoloState(payload.state, payload.savedAt);
      const previousCode = socket.data.roomCode;
      if (previousCode) {
        const previousRoom = roomManager.getRoom(previousCode);
        if (previousRoom && socket.data.playerId) previousRoom.markDisconnected(socket.data.playerId);
        socket.leave(previousCode);
      }

      const room = roomManager.createRoom("solo", payload.gameId);
      const player = room.addPlayer(payload.playerId, payload.playerName, payload.ownerId);
      if (!player) {
        callback?.({ ok: false, error: "Não foi possível recriar o jogador desta partida." });
        return;
      }
      room.restoreSoloGameState(restoredState);
      room.setSocketId(payload.playerId, socket.id);
      socket.data.roomCode = room.code;
      socket.data.playerId = payload.playerId;
      socket.data.playerName = payload.playerName;
      socket.join(room.code);

      callback?.({ ok: true, room: room.toSnapshot(), gameState: getMaskedStateForPlayer(room, payload.playerId) });
      broadcastRoom(io, room.code, roomManager);
      broadcastGameState(io, room.code, roomManager);

      // Um save de Xadrez pode ter sido feito entre o lance humano e a resposta
      // do BOT. A resposta pendente é retomada, sem deixar a posição travada.
      const chessState = room.gameState as ChessState | null;
      if (payload.gameId === "chess" && chessState?.mode === "solo" && chessState.turn === "b" && !chessState.result) {
        chessBotTimers.set(room.code, setTimeout(() => {
          const currentRoom = roomManager.getRoom(room.code);
          const current = currentRoom?.gameState as ChessState | null;
          if (!currentRoom || currentRoom.status !== "playing" || current?.turn !== "b" || current.result) return;
          currentRoom.applyAction({ type: "botMove" }, "BOT");
          broadcastGameState(io, room.code, roomManager);
          if ((currentRoom.gameState as ChessState).result) broadcastRoom(io, room.code, roomManager);
        }, 330));
      }
    });

    socket.on(
      "room:create",
      (
        payload: {
          roomMode: RoomMode;
          gameId?: GameId;
          playerName: string;
          playerId?: string;
          accountId?: string;
        },
        callback: AckCallback
      ) => {
        const previousCode = socket.data.roomCode;
        if (previousCode) {
          const previousRoom = roomManager.getRoom(previousCode);
          if (previousRoom && socket.data.playerId) {
            previousRoom.markDisconnected(socket.data.playerId);
            broadcastRoom(io, previousCode, roomManager);
          }
          socket.leave(previousCode);
        }
        const roomMode: RoomMode = payload.roomMode === "solo" ? "solo" : "duo";
        // Sala Solo já nasce com o jogo escolhido (o jogador acabou de
        // escolher na grade); sala Duo sempre nasce sem jogo (lobby) — o
        // gameId enviado, se houver, é ignorado nesse caso.
        const gameId = roomMode === "solo" ? payload.gameId ?? null : null;
        const room = roomManager.createRoom(roomMode, gameId);
        const playerId = payload.playerId?.trim() || randomUUID();
        const player = room.addPlayer(playerId, payload.playerName, sanitizeAccountId(payload.accountId));
        room.setSocketId(playerId, socket.id);
        socket.data.roomCode = room.code;
        socket.data.playerId = playerId;
        socket.data.playerName = payload.playerName;
        socket.join(room.code);
        callback?.({ ok: true, room: room.toSnapshot(), player });
      }
    );

    socket.on(
      "room:join",
      (payload: { code: string; playerName: string; playerId?: string; accountId?: string }, callback: AckCallback) => {
        const room = roomManager.getRoom(payload.code);
        if (!room) {
          callback?.({ ok: false, error: "Sala não encontrada. Confira o código." });
          return;
        }
        const playerId = payload.playerId?.trim() || randomUUID();
        if (room.roomMode === "solo" && !room.players.has(playerId)) {
          callback?.({ ok: false, error: "Essa sala é de uma sessão solo e não aceita outro jogador." });
          return;
        }
        if (room.players.size >= room.maxPlayers && !room.players.has(playerId)) {
          callback?.({ ok: false, error: "Essa sala já está completa." });
          return;
        }
        const player = room.addPlayer(playerId, payload.playerName, sanitizeAccountId(payload.accountId));
        room.setSocketId(playerId, socket.id);
        socket.data.roomCode = room.code;
        socket.data.playerId = playerId;
        socket.data.playerName = payload.playerName;
        socket.join(room.code);
        callback?.({ ok: true, room: room.toSnapshot(), player });
        broadcastRoom(io, room.code, roomManager);
        if (room.gameState) broadcastGameState(io, room.code, roomManager);
      }
    );

    // Permite que uma página recém-montada (ex.: tela do jogo após navegação,
    // um refresh, OU o WebSocket caindo e reconectando com um socket.id novo)
    // recupere o estado atual da sala usando a identidade PERSISTENTE do
    // jogador (nunca o socket.id) — e reassocia essa identidade ao socket.id
    // da conexão atual, para que os próximos eventos direcionados cheguem
    // no lugar certo. É essa reassociação que faltava e causava a sala
    // "esquecer" o jogador (e mostrar como se ele estivesse sozinho/travado
    // numa pergunta antiga) depois de qualquer soluço de rede.
    socket.on("room:sync", (payload: { code: string; playerId?: string }, callback: AckCallback) => {
      const code = payload?.code;
      const playerId = payload?.playerId?.trim() || socket.data.playerId;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !playerId || !room.players.has(playerId)) {
        callback?.({ ok: false, error: "Sala não encontrada para este jogador." });
        return;
      }
      const wasDisconnected = !room.players.get(playerId)?.connected;
      room.addPlayer(playerId, socket.data.playerName ?? room.players.get(playerId)!.name);
      room.setSocketId(playerId, socket.id);
      socket.data.roomCode = room.code;
      socket.data.playerId = playerId;
      socket.join(room.code);
      const gameState = getMaskedStateForPlayer(room, playerId);
      callback?.({ ok: true, room: room.toSnapshot(), gameState });
      // Se esse jogador estava marcado como desconectado, o outro lado da
      // sala precisa saber que ele voltou.
      if (wasDisconnected) broadcastRoom(io, room.code, roomManager);
    });

    socket.on("room:leave", () => {
      const code = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!code || !playerId) return;
      const room = roomManager.getRoom(code);
      if (room) {
        room.markDisconnected(playerId);
        socket.leave(code);
        broadcastRoom(io, code, roomManager);
      }
      socket.data.roomCode = undefined;
    });

    // Só o host pode mudar a configuração da partida (imagem/dificuldade/modo)
    // enquanto os dois estão na sala de espera — o outro jogador só acompanha,
    // recebendo a atualização em tempo real via room:update.
    socket.on(
      "room:setConfig",
      (payload: StartPayload & { colorMode?: string; seerId?: string | null; matchMode?: string; whoamiCategory?: string; chessPinkPlayerId?: string | null; rpgAppearance?: "man" | "woman"; boardRacePawnColor?: "blue" | "pink" }) => {
        const code = socket.data.roomCode;
        const room = code ? roomManager.getRoom(code) : undefined;
        if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;

        const options: { colorMode?: string; seerId?: string | null; matchMode?: string; whoamiCategory?: string; chessPinkPlayerId?: string; rpgAppearance?: "man" | "woman"; boardRacePawnColor?: "blue" | "pink" } = {};
        if (payload?.colorMode && isValidColorMode(payload.colorMode)) options.colorMode = payload.colorMode;
        if (payload?.seerId === null || (payload?.seerId && room.players.has(payload.seerId))) {
          options.seerId = payload.seerId;
        }
        if (
          payload?.matchMode &&
          (isValidCrosswordMode(payload.matchMode) ||
            isValidWordSearchMode(payload.matchMode) ||
            isValidQuizMode(payload.matchMode) ||
            isValidWhoAmIMode(payload.matchMode) ||
            isValidRPGMode(payload.matchMode) ||
            isValidSudokuMode(payload.matchMode) ||
            isValidMemoryMode(payload.matchMode) ||
            isValidTermoMode(payload.matchMode) ||
            isValidAirHockeyMode(payload.matchMode) ||
            isValidChessMode(payload.matchMode) ||
            isValidBoardRaceMode(payload.matchMode))
        ) {
          options.matchMode = payload.matchMode;
        }

        const baseOptions = sanitizeStartOptions(payload);
        if (payload?.difficulty && isValidTermoVariant(payload.difficulty)) baseOptions.difficulty = payload.difficulty;
        if (payload?.difficulty && isValidAirHockeyDifficulty(payload.difficulty)) baseOptions.difficulty = payload.difficulty;
        if (payload?.difficulty && isValidChessDifficulty(payload.difficulty)) baseOptions.difficulty = payload.difficulty;
        if (room.gameId === "casino" && payload?.difficulty && isValidCasinoLength(payload.difficulty)) baseOptions.difficulty = payload.difficulty;
        // A escolha de cores só existe no Duo e só pode ser feita antes de
        // iniciar. O servidor valida a associação inteira, não o cliente.
        if (payload?.chessPinkPlayerId !== undefined) {
          if (
            room.gameId !== "chess" ||
            room.roomMode !== "duo" ||
            room.status !== "waiting" && room.status !== "ready" ||
            room.players.size !== 2 ||
            typeof payload.chessPinkPlayerId !== "string" ||
            !room.players.has(payload.chessPinkPlayerId)
          ) return;
          options.chessPinkPlayerId = payload.chessPinkPlayerId;
        }
        if (payload?.rpgAppearance !== undefined) {
          if (
            room.gameId !== "rpg" ||
            (payload.rpgAppearance !== "man" && payload.rpgAppearance !== "woman")
          ) return;
          options.rpgAppearance = payload.rpgAppearance;
        }
        if (payload?.boardRacePawnColor !== undefined) {
          if (room.gameId !== "boardrace" || room.roomMode !== "solo" || (payload.boardRacePawnColor !== "blue" && payload.boardRacePawnColor !== "pink")) return;
          options.boardRacePawnColor = payload.boardRacePawnColor;
        }
        if (room.gameId === "whoami" && payload?.whoamiCategory && isValidWhoAmICategory(payload.whoamiCategory)) {
          options.whoamiCategory = payload.whoamiCategory;
        }
        room.setPendingConfig({ ...baseOptions, ...options });
        broadcastRoom(io, code!, roomManager);
      }
    );

    // A peça é uma escolha individual no Duo. O Room atribui a cor oposta ao
    // par e devolve um único snapshot sincronizado aos dois navegadores.
    socket.on("room:setBoardRacePawn", (payload: { color?: "blue" | "pink" }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      const playerId = socket.data.playerId;
      if (!room || !playerId || room.gameId !== "boardrace" || (room.status !== "waiting" && room.status !== "ready")) return;
      if (payload?.color !== "blue" && payload?.color !== "pink") return;
      room.setBoardRacePawnColor(playerId, payload.color);
      broadcastRoom(io, code!, roomManager);
    });

    // ---- Sala Duo: escolher jogo / voltar / expulsar / sequência ----
    // (Uma sala Solo nunca usa esses eventos — nasce direto com o jogo
    // escolhido e não tem convidado para expulsar.)

    // Só o host chama isso — escolhe (ou troca) o jogo ativo da sala sem
    // sair dela. Funciona tanto saindo do lobby (primeira escolha) quanto
    // trocando de jogo a qualquer momento depois.
    socket.on("room:selectGame", (payload: { gameId: GameId }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      if (!payload?.gameId || !ALL_GAME_IDS.includes(payload.gameId)) return;
      room.selectGame(payload.gameId);
      broadcastRoom(io, code!, roomManager);
    });

    // Só o host chama isso — volta da partida atual (em andamento ou já
    // terminada) para a tela de configuração do MESMO jogo, sem sair da sala.
    socket.on("room:backToConfig", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      room.backToConfig();
      broadcastRoom(io, code!, roomManager);
    });

    // Só o host chama isso — volta mais um passo, para a escolha de jogo
    // (lobby da sala), sem tirar ninguém da sala.
    socket.on("room:backToGameSelect", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      room.backToGameSelect();
      broadcastRoom(io, code!, roomManager);
    });

    // Só o host chama isso — sorteia uma nova ordem para a sugestão de
    // sequência de jogos e zera o progresso marcado.
    socket.on("room:shuffleSequence", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      room.shuffleSequence();
      broadcastRoom(io, code!, roomManager);
    });

    // Só o host chama isso — remove o convidado da sala definitivamente
    // (diferente de uma desconexão, ele não recupera o lugar reconectando).
    // O convidado expulso recebe um evento dedicado para sair da tela.
    socket.on("room:kick", (payload: { targetPlayerId: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      const targetId = payload?.targetPlayerId;
      if (!targetId || targetId === socket.data.playerId || !room.players.has(targetId)) return;

      const targetSocketId = room.getSocketId(targetId);
      room.removePlayer(targetId);
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : undefined;
      if (targetSocket) {
        targetSocket.emit("room:kicked", { code: room.code });
        targetSocket.leave(room.code);
        targetSocket.data.roomCode = undefined;
      }
      broadcastRoom(io, code!, roomManager);
    });

    socket.on("game:start", (payload: StartPayload | undefined, callback: AckCallback) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) {
        callback?.({ ok: false, error: "Sala inválida." });
        return;
      }
      if (!socket.data.playerId || !room.isHost(socket.data.playerId)) {
        callback?.({ ok: false, error: "Só o anfitrião da sala pode iniciar a partida." });
        return;
      }
      if (!room.gameId) {
        callback?.({ ok: false, error: "Escolha um jogo antes de começar." });
        return;
      }
      if (room.gameId === "puzzle" && !room.pendingImageId) {
        callback?.({ ok: false, error: "Escolha uma imagem antes de começar." });
        return;
      }
      if (room.gameId === "whoami" && room.roomMode === "duo" && !room.bothConnected()) {
        callback?.({ ok: false, error: "O Quem Sou Eu? precisa dos dois jogadores conectados." });
        return;
      }
      if ((room.gameId === "termo" || room.gameId === "airhockey" || room.gameId === "chess" || room.gameId === "boardrace" || room.gameId === "casino") && room.roomMode === "duo" && !room.bothConnected()) {
        callback?.({ ok: false, error: room.gameId === "termo" ? "O Duelo de Termo precisa dos dois jogadores conectados." : room.gameId === "airhockey" ? "O Duelo de Air Hockey precisa dos dois jogadores conectados." : room.gameId === "chess" ? "O Duelo de Xadrez precisa dos dois jogadores conectados." : room.gameId === "casino" ? "O Cassino precisa dos dois jogadores conectados." : "A corrida precisa dos dois jogadores conectados." });
        return;
      }
      // Sem exigência de "os dois conectados": o host pode jogar sozinho —
      // se o par ainda entrar depois, ele acompanha a partida já em andamento.
      // Usa a configuração já sincronizada da sala; um payload aqui (se vier)
      // só serve como um ajuste de última hora, nunca como fonte principal.
      room.startGame(sanitizeStartOptions(payload));
      if (room.gameId === "airhockey") beginDelayedAirHockeyTimeline(room);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
      callback?.({ ok: true });
    });

    // Xadrez é inteiramente autoritativo: o cliente envia apenas origem,
    // destino e eventual promoção. A posição/FEN nunca é aceita do navegador.
    socket.on("chess:move", (payload: { from?: string; to?: string; promotion?: string }, callback?: AckCallback) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "chess" || room.status !== "playing") {
        callback?.({ ok: false, error: "Partida indisponível." });
        return;
      }
      if (typeof payload?.from !== "string" || typeof payload?.to !== "string") {
        callback?.({ ok: false, error: "Movimento inválido." });
        return;
      }
      const before = room.gameState as ChessState;
      room.applyAction({ type: "move", from: payload.from, to: payload.to, promotion: payload.promotion }, socket.data.playerId ?? socket.id);
      const state = room.gameState as ChessState;
      const moved = state.fen !== before.fen;
      callback?.({ ok: moved, error: moved ? undefined : "Esse movimento não é permitido agora." });
      if (!moved) return;
      broadcastGameState(io, code!, roomManager);
      if (state.result) {
        broadcastRoom(io, code!, roomManager);
        return;
      }
      if (state.mode === "solo" && state.turn === "b") {
        const previousTimer = chessBotTimers.get(code!);
        if (previousTimer) clearTimeout(previousTimer);
        chessBotTimers.set(code!, setTimeout(() => {
          const currentRoom = roomManager.getRoom(code!);
          const current = currentRoom?.gameState as ChessState | null;
          if (!currentRoom || currentRoom.gameId !== "chess" || currentRoom.status !== "playing" || current?.mode !== "solo" || current.turn !== "b") return;
          currentRoom.applyAction({ type: "botMove" }, "BOT");
          broadcastGameState(io, code!, roomManager);
          if ((currentRoom.gameState as ChessState).result) broadcastRoom(io, code!, roomManager);
        }, 330));
      }
    });

    socket.on("chess:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "chess" || room.status !== "finished" || (room.roomMode === "duo" && !room.bothConnected())) return;
      const current = room.gameState as ChessState | null;
      room.startGame({ mode: current?.mode, difficulty: current?.difficulty });
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    socket.on("game:pickup", (payload: { groupId: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.applyAction({ type: "pickup", groupId: payload.groupId }, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
    });

    // Repassado em tempo real para o outro jogador, sem validar nem persistir —
    // é isso que mantém o arrastar fluido (o servidor só grava o estado no "drop").
    socket.on("game:drag", (payload: { groupId: string; x: number; y: number }) => {
      const code = socket.data.roomCode;
      if (!code) return;
      socket.to(code).emit("game:dragRelay", {
        groupId: payload.groupId,
        x: payload.x,
        y: payload.y,
        playerId: socket.data.playerId ?? socket.id,
      });
    });

    socket.on("game:drop", (payload: { groupId: string; x: number; y: number; clientActionId?: string }, callback?: AckCallback) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) { callback?.({ ok: false }); return; }
      const clientActionId = typeof payload.clientActionId === "string" ? payload.clientActionId.slice(0, 80) : undefined;
      room.applyAction(
        { type: "drop", groupId: payload.groupId, x: payload.x, y: payload.y, clientActionId },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
      const applied = !clientActionId || (room.gameState as { lastActionId?: string | null } | null)?.lastActionId === clientActionId;
      callback?.({ ok: applied });
    });

    socket.on("game:reset", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.resetGame();
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    socket.on("game:newImage", (payload: StartPayload) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !payload?.imageId || !isValidImageId(payload.imageId)) return;
      room.startGame(sanitizeStartOptions(payload));
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Sudoku (lógica própria, nada compartilhado com o quebra-cabeça) ----

    socket.on("sudoku:setCell", (payload: { index: number; value: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "sudoku") return;
      room.applyAction(
        { type: "setCell", index: payload.index, value: payload.value },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    socket.on("sudoku:hint", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "sudoku") return;
      room.applyAction({ type: "hint" }, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    // "Novo Sudoku" e "Trocar dificuldade" são a mesma ação: gera um desafio
    // novo (na dificuldade enviada, ou mantendo a atual se omitida).
    socket.on("sudoku:newPuzzle", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "sudoku") return;

      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidSudokuDifficulty(payload.difficulty)) {
        options.difficulty = payload.difficulty;
      } else {
        // Sem dificuldade explícita: mantém a da partida ATUAL (não a config
        // de antes do jogo começar, que pode estar desatualizada).
        const currentDifficulty = (room.gameState as { difficulty?: string } | null)?.difficulty;
        if (currentDifficulty) options.difficulty = currentDifficulty;
      }

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos da Memória de Cores (independentes do quebra-cabeça e do sudoku) ----

    // Envia o palpite (H/S/B) do jogador para a rodada atual. Ignorado se a
    // rodada já foi respondida por esse jogador ou não é mais a rodada corrente.
    socket.on("colors:submitGuess", (payload: { round: number; h: number; s: number; v: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "colors") return;
      room.applyAction(
        { type: "submitGuess", round: payload.round, h: payload.h, s: payload.s, v: payload.v },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
    });

    // Avança para a próxima rodada (ou finaliza, na última). No competitivo,
    // só é aplicado quando todos os jogadores conectados já enviaram o
    // palpite da rodada; no cooperativo, basta o palpite de quem adivinha
    // (só existe um palpite por rodada).
    socket.on("colors:nextRound", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "colors" || !room.gameState) return;

      const state = room.gameState as {
        mode?: string;
        seerId?: string | null;
        guesserId?: string | null;
        currentRound: number;
        rounds: { guesses: Record<string, unknown> }[];
        finished: boolean;
      };
      if (state.finished) return;

      const currentGuesses = state.rounds[state.currentRound]?.guesses ?? {};
      const allSubmitted =
        state.mode === "cooperative"
          ? Boolean(state.guesserId && currentGuesses[state.guesserId])
          : (() => {
              const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
              return connectedIds.length > 0 && connectedIds.every((id) => currentGuesses[id]);
            })();
      if (!allSubmitted) return;

      room.applyAction({ type: "nextRound" }, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    // "Jogar de novo" — gera uma nova sequência de cores (na dificuldade
    // enviada, ou mantendo a atual), preservando o modo e os papéis
    // (vidente/adivinhador) da partida que acabou de terminar.
    socket.on("colors:newGame", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "colors") return;

      const current = room.gameState as {
        difficulty?: string;
        mode?: string;
        seerId?: string | null;
        guesserId?: string | null;
      } | null;

      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidColorDifficulty(payload.difficulty)) {
        options.difficulty = payload.difficulty;
      } else if (current?.difficulty) {
        options.difficulty = current.difficulty;
      }
      if (current?.mode) options.mode = current.mode;
      if (current?.seerId) options.seerId = current.seerId;
      if (current?.guesserId) options.guesserId = current.guesserId;

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // Repassa em tempo real, só no cooperativo e só de quem está adivinhando
    // para quem está vendo a cor — permite acompanhar o ajuste dos sliders
    // sem persistir nada no estado (é só um preview visual, não uma jogada).
    socket.on("colors:liveGuess", (payload: { h: number; s: number; v: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "colors" || !room.gameState) return;

      const state = room.gameState as { mode?: string; guesserId?: string | null; finished: boolean };
      if (state.mode !== "cooperative" || state.finished || state.guesserId !== (socket.data.playerId ?? socket.id))
        return;

      socket.to(code!).emit("colors:livePreview", { h: payload.h, s: payload.s, v: payload.v });
    });

    // ---- Eventos exclusivos do Palavras Cruzadas ----

    // Preenche (ou apaga, se letter === "") uma célula. No modo "together" a
    // jogada é espelhada para os dois; no modo "duel" só afeta o progresso de
    // quem jogou. Toda validação de acerto acontece no backend (CrosswordGame).
    socket.on("crossword:setCell", (payload: { row: number; col: number; letter: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "crossword") return;
      room.applyAction(
        { type: "setCell", row: payload.row, col: payload.col, letter: payload.letter },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    // "Jogar de novo" — gera uma grade nova (na dificuldade enviada, ou
    // mantendo a atual), preservando o modo (Juntos/Duelo) da partida anterior.
    socket.on("crossword:newPuzzle", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "crossword") return;

      const current = room.gameState as { difficulty?: string; mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidCrosswordDifficulty(payload.difficulty)) {
        options.difficulty = payload.difficulty;
      } else if (current?.difficulty) {
        options.difficulty = current.difficulty;
      }
      if (current?.mode) options.mode = current.mode;

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Caça-Palavras ----

    // Recebe o início e o fim de um arrasto sobre a grade e verifica no
    // backend se as letras nesse trajeto formam (para a frente ou de trás
    // para frente) alguma palavra da lista ainda não encontrada.
    socket.on(
      "wordsearch:submitSelection",
      (payload: { startRow: number; startCol: number; endRow: number; endCol: number }) => {
        const code = socket.data.roomCode;
        const room = code ? roomManager.getRoom(code) : undefined;
        if (!room || room.gameId !== "wordsearch") return;
        room.applyAction(
          {
            type: "submitSelection",
            startRow: payload.startRow,
            startCol: payload.startCol,
            endRow: payload.endRow,
            endCol: payload.endCol,
          },
          socket.data.playerId ?? socket.id
        );
        broadcastGameState(io, code!, roomManager);
        if (room.status === "finished") {
          broadcastRoom(io, code!, roomManager);
        }
      }
    );

    // "Jogar de novo" — gera uma grade nova (na dificuldade enviada, ou
    // mantendo a atual), preservando o modo (Juntos/Duelo) da partida anterior.
    socket.on("wordsearch:newPuzzle", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "wordsearch") return;

      const current = room.gameState as { difficulty?: string; mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidWordSearchDifficulty(payload.difficulty)) {
        options.difficulty = payload.difficulty;
      } else if (current?.difficulty) {
        options.difficulty = current.difficulty;
      }
      if (current?.mode) options.mode = current.mode;

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Jogo da Memória ----

    // A posição escolhida nunca traz informação sobre a imagem: o servidor
    // decide se ela pode ser aberta, compara o par e mantém o layout secreto.
    socket.on("memory:flipCard", (payload: { slotId: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "memory" || typeof payload?.slotId !== "string") return;
      room.applyAction({ type: "flipCard", slotId: payload.slotId }, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") broadcastRoom(io, code!, roomManager);
    });

    // Nova disposição, preservando modo e dificuldade quando o jogador não
    // escolhe outra dificuldade no menu da tela.
    socket.on("memory:newGame", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "memory") return;
      const current = room.gameState as { difficulty?: string; mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidMemoryDifficulty(payload.difficulty)) options.difficulty = payload.difficulty;
      else if (current?.difficulty) options.difficulty = current.difficulty;
      if (current?.mode) options.mode = current.mode;
      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Termo ----
    // A tentativa chega como texto cru: normalização, existência na lista e
    // avaliação de letras acontecem no motor do servidor.
    socket.on("termo:submitGuess", (payload: { word: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "termo" || typeof payload?.word !== "string" || payload.word.length > 64) return;
      room.applyAction({ type: "submitGuess", word: payload.word }, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") broadcastRoom(io, code!, roomManager);
    });

    // Cria uma nova partida compartilhada com a mesma variante e modo; o
    // reset é sempre do estado do servidor, nunca apenas de um cliente.
    socket.on("termo:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "termo" || room.status !== "finished" || (room.roomMode === "duo" && !room.bothConnected())) return;
      const current = room.gameState as { variant?: string; mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (current?.variant && isValidTermoVariant(current.variant)) options.difficulty = current.variant;
      if (current?.mode && isValidTermoMode(current.mode)) options.mode = current.mode;
      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Air Hockey ----
    // A posição da raquete é limitada pelo motor autoritativo. O cliente só
    // informa a intenção de movimento; placar, gols e física ficam no servidor.
    socket.on("airhockey:move", (payload: { x: number; y: number; sequence?: number; simulationTick?: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "airhockey" || !Number.isFinite(payload?.x) || !Number.isFinite(payload?.y) || !Number.isInteger(payload?.sequence) || !Number.isFinite(payload?.simulationTick)) return;
      const playerId = socket.data.playerId ?? socket.id;
      const state = room.gameState as AirHockeyState | null;
      if (!state || state.mode !== "duel" || !state.humanPlayerIds.includes(playerId)) return;
      // O relógio do input pertence ao mesmo domínio epoch de lastTickAt. Um
      // limite amplo só rejeita payload claramente corrompido, não latência.
      const receivedAt = Date.now();
      if (Math.abs((payload.simulationTick as number) - receivedAt) > 5_000) return;
      const queue = airHockeyQueueFor(room.code, state);
      const processed = state.lastProcessedInputSequence[playerId] ?? 0;
      const highestKnownSequence = queue.inputs
        .filter((input) => input.playerId === playerId)
        .reduce((highest, input) => Math.max(highest, input.sequence), processed);
      if ((payload.sequence as number) <= highestKnownSequence) return;

      const input: QueuedAirHockeyInput = {
        playerId,
        x: payload.x,
        y: payload.y,
        sequence: payload.sequence as number,
        simulationTick: payload.simulationTick as number,
        receivedAt,
        receivedOrder: ++queue.nextReceivedOrder,
      };
      queue.inputs.push(input);
      if (airHockeyPhysicsDebug) {
        const inputs = airHockeyInputsSincePreviousTick.get(room.code) ?? [];
        inputs.push({
          receivedAt,
          sequence: payload.sequence,
          playerId,
          previousServerTick: state.lastTickAt,
          target: { x: payload.x, y: payload.y },
        });
        airHockeyInputsSincePreviousTick.set(room.code, inputs);
      }
    });
    // Fornece uma amostra do mesmo domínio de tempo de `lastTickAt` (epoch do
    // servidor). O cliente estima o offset pelo menor RTT, sem mudar a
    // cadência autoritativa.
    socket.on("airhockey:clock", (callback?: (response: { serverNow: number }) => void) => {
      callback?.({ serverNow: Date.now() });
    });
    socket.on("airhockey:soloComplete", (payload: { score: number; conceded: number }) => {
      const code=socket.data.roomCode; const room=code?roomManager.getRoom(code):undefined;
      if (!room || room.gameId!=="airhockey") return;
      room.applyAction({ type:"completeSolo", score:payload?.score, conceded:payload?.conceded, now:Date.now() }, socket.data.playerId ?? socket.id);
      if (room.status === "finished") { broadcastRoom(io, code!, roomManager); broadcastGameState(io, code!, roomManager); }
    });

    socket.on("airhockey:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "airhockey" || room.status !== "finished" || (room.roomMode === "duo" && !room.bothConnected())) return;
      const current = room.gameState as { difficulty?: string; mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (current?.difficulty && isValidAirHockeyDifficulty(current.difficulty)) options.difficulty = current.difficulty;
      if (current?.mode && isValidAirHockeyMode(current.mode)) options.mode = current.mode;
      room.startGame(options);
      beginDelayedAirHockeyTimeline(room);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Quem Sou Eu? ----
    // O cliente só envia intenção (revelar, palpitar ou desistir). A resposta
    // correta e as pistas privadas nunca são confiadas ao navegador.
    socket.on("whoami:action", (payload: { type?: string; guess?: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "whoami" || room.status !== "playing") return;
      if (!payload || (payload.type !== "revealHint" && payload.type !== "submitGuess" && payload.type !== "giveUp")) return;
      if (payload.type === "submitGuess" && (typeof payload.guess !== "string" || payload.guess.length > 100)) return;

      const action = payload.type === "submitGuess"
        ? { type: "submitGuess" as const, guess: payload.guess as string }
        : payload.type === "revealHint"
          ? { type: "revealHint" as const }
          : { type: "giveUp" as const };
      room.applyAction(action, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if ((room.status as string) === "finished") broadcastRoom(io, code!, roomManager);
    });

    socket.on("whoami:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "whoami" || room.status !== "finished" || (room.roomMode === "duo" && !room.bothConnected())) return;
      const current = room.gameState as WhoAmIState | null;
      room.startGame({
        difficulty: current?.difficulty,
        mode: current?.mode,
        category: current?.category,
      });
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Quiz ----

    // Envia a alternativa escolhida para a pergunta atual. Ignorado se não for
    // mais a pergunta corrente, se a pergunta já foi revelada, ou se esse
    // jogador já respondeu — toda a validação de acerto/pontuação acontece
    // dentro do QuizGame, nunca confiando em nada vindo do cliente.
    socket.on("quiz:submitAnswer", (payload: { questionIndex: number; optionIndex: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "quiz") return;
      room.applyAction(
        { type: "submitAnswer", questionIndex: payload.questionIndex, optionIndex: payload.optionIndex },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    // "Jogar de novo" — sorteia um novo conjunto de perguntas (na dificuldade
    // enviada, ou mantendo a atual), preservando o modo (Solo/Juntos/Duelo).
    socket.on("quiz:newGame", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "quiz") return;

      const current = room.gameState as { difficulty?: string; mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidQuizDifficulty(payload.difficulty)) {
        options.difficulty = payload.difficulty;
      } else if (current?.difficulty) {
        options.difficulty = current.difficulty;
      }
      if (current?.mode) options.mode = current.mode;

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Mini RPG: Duelo ----

    // Escolhe uma das 3 cartas da mão para a rodada atual. Ignorado se não for
    // a fase de escolha, se esse combatente já escolheu, se está atordoado ou
    // se é o BOT (o BOT nunca recebe jogadas do cliente) — toda a resolução
    // de dano/cura/status acontece dentro do RPGGame, nunca no cliente.
    socket.on("rpg:selectCard", (payload: { cardInstanceId: string }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "rpg") return;
      room.applyAction(
        { type: "selectCard", cardInstanceId: payload.cardInstanceId },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    // "Rolar novamente" consome uma carga da carta Lendária "Rolagem".
    socket.on("rpg:rerollHand", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "rpg") return;
      room.applyAction({ type: "rerollHand" }, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
    });

    // "Jogar de novo" — sorteia classes novas e reinicia a batalha, preservando o modo (1v1/Solo vs BOT/2 vs BOT).
    socket.on("rpg:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "rpg") return;

      const current = room.gameState as { mode?: string } | null;
      const options: Record<string, unknown> = {};
      if (current?.mode) options.mode = current.mode;

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos do Cassino ----
    // O navegador envia apenas intenções. Sorteios, cartas, bombas, ponto do
    // Crash e resultados compartilhados são definidos pelo servidor.
    socket.on("casino:action", (payload: unknown) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "casino" || room.status !== "playing") return;
      if (!payload || typeof payload !== "object") return;
      const type = (payload as { type?: unknown }).type;
      const allowed = new Set([
        "vote", "lockBet", "minesOpen", "cashOut", "crashCashOut",
        "roulettePick", "slotsSpin", "racePick", "diceRoll", "diceContinue",
        "hiloGuess", "hiloContinue", "plinkoDrop", "briefcaseOpen", "briefcaseContinue",
        "nextRound", "lastChanceChoose", "lastChanceSpin",
      ]);
      if (typeof type !== "string" || !allowed.has(type)) return;
      room.applyAction(payload, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if ((room.status as string) === "finished") broadcastRoom(io, code!, roomManager);
    });

    socket.on("casino:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "casino" || room.status !== "finished" || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      if (room.roomMode === "duo" && !room.bothConnected()) return;
      room.resetGame();
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // ---- Eventos exclusivos da Corrida de Tabuleiro ----
    // O cliente envia apenas intenções. Dado, efeitos, Quiz, poderes e o
    // resultado dos subdesafios continuam sob autoridade do servidor.
    socket.on("boardrace:action", (payload: unknown) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "boardrace" || room.status !== "playing") return;
      if (!payload || typeof payload !== "object") return;
      const type = (payload as { type?: unknown }).type;
      if (type !== "roll" && type !== "answerQuiz" && type !== "answerWord" && type !== "giveUpWord" && type !== "chooseSafe" && type !== "usePower" && type !== "minigameAction") return;
      room.applyAction(payload, socket.data.playerId ?? socket.id);
      broadcastGameState(io, code!, roomManager);
      if ((room.status as string) === "finished") broadcastRoom(io, code!, roomManager);
    });

    socket.on("boardrace:newGame", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "boardrace" || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;
      room.resetGame();
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    // Só marca o jogador como desconectado se essa conexão que caiu ainda for
    // a "atual" dele — se ele já tiver reconectado mais rápido (novo socket.id
    // já registrado via room:sync) antes desse evento chegar, não sobrescreve
    // a reconexão mais nova com a desconexão da conexão antiga.
    socket.on("disconnect", () => {
      const code = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!code || !playerId) return;
      const room = roomManager.getRoom(code);
      if (room && room.getSocketId(playerId) === socket.id) {
        room.markDisconnected(playerId);
        broadcastRoom(io, code, roomManager);
      }
    });
  });

  // ---- Relógio do servidor do Jogo da Memória ----
  // Prévia, erro temporariamente revelado e tempo limite são controlados aqui
  // para todos os clientes verem as mesmas transições, inclusive após reconectar.
  setInterval(() => {
    const now = Date.now();
    for (const room of roomManager.getAllRooms()) {
      if (room.gameId !== "memory" || room.status !== "playing" || !room.gameState) continue;
      const state = room.gameState as MemoryState;
      if (state.finished) continue;

      let action: { type: "startPlay" } | { type: "hideMismatch"; playerId: string } | { type: "timeUp" } | null = null;
      if (state.playStartedAt === null && now >= state.previewEndsAt) {
        action = { type: "startPlay" };
      } else if (state.playStartedAt !== null && state.deadlineAt !== null && now >= state.deadlineAt) {
        action = { type: "timeUp" };
      } else {
        const mismatch = Object.entries(state.progress).find(([, progress]) => progress.mismatchUntil !== null && now >= progress.mismatchUntil);
        if (mismatch) action = { type: "hideMismatch", playerId: mismatch[0] };
      }
      if (!action) continue;

      room.applyAction(action, "system");
      broadcastGameState(io, room.code, roomManager);
      if ((room.status as string) === "finished") broadcastRoom(io, room.code, roomManager);
    }
  }, 250);

  // ---- Relógio do servidor do Quiz ----
  // Varre periodicamente as salas com uma partida de Quiz em andamento para
  // forçar o avanço da pergunta quando o tempo acaba (mesmo que um jogador
  // fique sem responder) e para avançar automaticamente depois da breve
  // janela de revelação — mantendo os dois lados sempre sincronizados sem
  // depender de nenhum timer no cliente.
  setInterval(() => {
    const now = Date.now();
    for (const room of roomManager.getAllRooms()) {
      if (room.gameId !== "quiz" || room.status !== "playing" || !room.gameState) continue;
      const state = room.gameState as QuizStateShape;
      if (state.finished) continue;

      if (state.phase === "active" && state.mode !== "together" && now - state.questionStartedAt >= state.timeLimitMs) {
        room.applyAction({ type: "timeUp" }, "system");
      } else if (
        state.phase === "revealed" &&
        state.revealedAt !== null &&
        now - state.revealedAt >= QUIZ_REVEAL_DURATION_MS
      ) {
        room.applyAction({ type: "nextQuestion" }, "system");
      } else {
        continue;
      }

      broadcastGameState(io, room.code, roomManager);
      if ((room.status as string) === "finished") {
        broadcastRoom(io, room.code, roomManager);
      }
    }
  }, 500);

  // ---- Relógio do servidor do Mini RPG: Duelo ----
  // Faz a batalha andar sozinha nos momentos em que não depende de uma
  // escolha do jogador: sai da introdução (classes reveladas) para a
  // primeira rodada, e sai da rodada resolvida (dano já aplicado, animações
  // rodando no cliente) para a próxima — sempre no mesmo ritmo para todo
  // mundo na sala, sem depender de nenhum timer do lado do cliente.
  setInterval(() => {
    const now = Date.now();
    for (const room of roomManager.getAllRooms()) {
      if (room.gameId !== "rpg" || room.status !== "playing" || !room.gameState) continue;
      const state = room.gameState as RPGStateShape;

      if (
        state.phase === "intro" &&
        state.humanPlayerIds.every((id) => Boolean(state.characterAppearances?.[id])) &&
        now - state.introStartedAt >= RPG_INTRO_DURATION_MS
      ) {
        room.applyAction({ type: "beginRound" }, "system");
      } else if (
        state.phase === "resolved" &&
        state.resolvedAt !== null &&
        now - state.resolvedAt >= RPG_RESOLVE_PAUSE_MS
      ) {
        room.applyAction({ type: "advanceRound" }, "system");
      } else {
        continue;
      }

      broadcastGameState(io, room.code, roomManager);
      if ((room.status as string) === "finished") {
        broadcastRoom(io, room.code, roomManager);
      }
    }
  }, 400);

  // ---- Turnos e desafios da Corrida de Tabuleiro ----
  // Um relógio único conduz transições, BOT e submotores temporários. Isso
  // mantém o Duo sincronizado e retoma saves Solo no meio de qualquer etapa.
  setInterval(() => {
    for (const room of roomManager.getAllRooms()) {
      if (room.gameId !== "boardrace" || room.status !== "playing" || !room.gameState) continue;
      const before = JSON.stringify(room.gameState);
      room.applyAction({ type: "tick" }, "system");
      if (JSON.stringify(room.gameState) === before) continue;
      broadcastGameState(io, room.code, roomManager);
      if ((room.status as string) === "finished") broadcastRoom(io, room.code, roomManager);
    }
  }, 250);

  // ---- Relógio autoritativo do Cassino ----
  // Conduz animações/resultados e, no Solo, também o ritmo do BOT. O motor só
  // altera a revisão quando existe alguma transição real; por isso podemos
  // chamar tick em todas as fases sem gerar tráfego inútil no Duelo.
  setInterval(() => {
    const now = Date.now();
    for (const room of roomManager.getAllRooms()) {
      if (room.gameId !== "casino" || room.status !== "playing" || !room.gameState) continue;
      const before = room.gameState as CasinoState;
      const revision = before.revision;
      room.applyAction({ type: "tick", now }, "system");
      const after = room.gameState as CasinoState;
      if (after.revision === revision) continue;
      broadcastGameState(io, room.code, roomManager);
      if ((room.status as string) === "finished") broadcastRoom(io, room.code, roomManager);
    }
  }, 100);

  // ---- Simulação autoritativa do Air Hockey ----
  // A física roda em passos curtos no servidor. Clientes recebem snapshots a
  // ~30 Hz e interpolam a outra raquete, sem esperar uma viagem de rede para
  // movimentar a própria raquete.
  const airHockeyLastBroadcast = new Map<string, number>();
  setInterval(() => {
    const now = Date.now();
    // Duo simula deliberadamente atrás do relógio real. A margem dá tempo de
    // receber a intenção antes de a linha física alcançar seu simulationTick.
    const authoritativeTick = now - AIR_HOCKEY_AUTHORITATIVE_DELAY_MS;
    for (const room of roomManager.getAllRooms()) {
      if (room.gameId !== "airhockey" || room.status !== "playing" || !room.gameState) continue;
      if ((room.gameState as AirHockeyState).mode === "solo") continue;
      const current = room.gameState as AirHockeyState;
      // Nos primeiros 80 ms de uma partida, a simulação ainda não alcançou o
      // instante inicial. Nunca movemos lastTickAt para trás.
      if (authoritativeTick < current.lastTickAt) continue;
      const inputQueue = airHockeyQueueFor(room.code, current);
      const physicsBefore = airHockeyPhysicsDebug ? (() => {
        const before = room.gameState as AirHockeyState;
        const tickStart = before.lastTickAt;
        return {
          inputs: airHockeyInputsSincePreviousTick.get(room.code) ?? [],
          tickStart,
          dt: Math.max(0, Math.min(33, authoritativeTick - tickStart)),
          puck: { ...before.puck },
          paddles: Object.fromEntries(Object.entries(before.paddles).map(([id, paddle]) => [id, { x: paddle.x, y: paddle.y, vx: paddle.vx, vy: paddle.vy, targetX: paddle.targetX, targetY: paddle.targetY }])),
          impactSerial: before.impactSerial,
        };
      })() : null;
      const timeline = advanceAirHockeyInputTimeline({
        getState: () => room.gameState as AirHockeyState,
        apply: (action, playerId) => room.applyAction(action, playerId),
      }, inputQueue.inputs, authoritativeTick);
      inputQueue.inputs = timeline.remaining;
      for (const lateInput of timeline.lateInputs) {
        console.warn("[airhockey] LATE INPUT", JSON.stringify({
          room: room.code,
          sequence: lateInput.sequence,
          simulationTick: lateInput.simulationTick,
          authoritativeTick: lateInput.authoritativeTick,
          latenessMs: lateInput.latenessMs,
        }));
      }
      const state = room.gameState as AirHockeyState;
      if (physicsBefore) {
        console.info("[airhockey] SERVER PHYSICS", JSON.stringify({
          room: room.code,
          tickStart: physicsBefore.tickStart,
          tickEnd: authoritativeTick,
          dt: physicsBefore.dt,
          inputsSincePreviousTick: physicsBefore.inputs,
          puckBefore: physicsBefore.puck,
          puckAfter: state.puck,
          paddlesBefore: physicsBefore.paddles,
          paddlesAfter: state.paddles,
          impactSerialBefore: physicsBefore.impactSerial,
          impactSerialAfter: state.impactSerial,
          impactOccurred: state.impactSerial > physicsBefore.impactSerial,
        }));
        airHockeyInputsSincePreviousTick.delete(room.code);
      }
      const lastBroadcast = airHockeyLastBroadcast.get(room.code) ?? 0;
      if (now - lastBroadcast >= 33 || state.phase === "finished") {
        airHockeyLastBroadcast.set(room.code, now);
        if (airHockeyPhysicsDebug) {
          console.info("[airhockey] SERVER SNAPSHOT", JSON.stringify({
            room: room.code,
            snapshotTick: state.lastTickAt,
            lastProcessedInputSequence: state.lastProcessedInputSequence,
            impactSerial: state.impactSerial,
          }));
        }
        broadcastGameState(io, room.code, roomManager);
      }
      if ((room.status as string) === "finished") broadcastRoom(io, room.code, roomManager);
    }
  }, 16);
}
