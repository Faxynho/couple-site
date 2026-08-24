import { randomUUID } from "node:crypto";
import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { GameId } from "../types";
import { isValidImageId, isValidDifficulty } from "../games/puzzle/puzzleImages";
import { isValidSudokuDifficulty } from "../games/sudoku/sudokuGenerator";
import { isValidColorDifficulty, isValidColorMode } from "../games/colors/ColorMemoryGame";
import { isValidCrosswordDifficulty } from "../games/crossword/crosswordGenerator";
import { isValidCrosswordMode } from "../games/crossword/CrosswordGame";
import { isValidWordSearchDifficulty } from "../games/wordsearch/wordsearchGenerator";
import { isValidWordSearchMode } from "../games/wordsearch/WordSearchGame";
import { isValidQuizDifficulty } from "../games/quiz/questionBank";
import { isValidQuizMode, QUIZ_REVEAL_DURATION_MS } from "../games/quiz/QuizGame";
import { isValidRPGMode, RPG_INTRO_DURATION_MS, RPG_RESOLVE_PAUSE_MS } from "../games/rpg/RPGGame";

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
  if (!room) return;
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
  } else {
    io.to(roomCode).emit("game:state", room.gameState);
  }
}

/** Retorna a versão pública (sem `game.gameState` cru) do estado de acordo com o jogo/jogador. */
function getMaskedStateForPlayer(room: { gameId: GameId; gameState: unknown }, playerId: string): unknown {
  if (room.gameId === "colors") return getColorsStateForPlayer(room.gameState, playerId);
  if (room.gameId === "crossword") return getCrosswordStateForPlayer(room.gameState, playerId);
  if (room.gameId === "wordsearch") return getWordSearchStateForPlayer(room.gameState, playerId);
  if (room.gameId === "quiz") return getQuizStateForPlayer(room.gameState, playerId);
  if (room.gameId === "rpg") return getRPGStateForPlayer(room.gameState, playerId);
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
      };
    }
  }

  return { ...s, cells: publicCells, words: publicWords, progress };
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
  const ownProgress = s.progress[playerId];

  const publicWords = s.words.map((w) => {
    const found = ownProgress?.found?.[w.id];
    return found ? { id: w.id, word: w.word, cells: found } : { id: w.id, word: w.word };
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

export function registerSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.on(
      "room:create",
      (payload: { gameId: GameId; playerName: string; playerId?: string }, callback: AckCallback) => {
        const room = roomManager.createRoom(payload.gameId);
        const playerId = payload.playerId?.trim() || randomUUID();
        const player = room.addPlayer(playerId, payload.playerName);
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
      (payload: { code: string; playerName: string; playerId?: string }, callback: AckCallback) => {
        const room = roomManager.getRoom(payload.code);
        if (!room) {
          callback?.({ ok: false, error: "Sala não encontrada. Confira o código." });
          return;
        }
        const playerId = payload.playerId?.trim() || randomUUID();
        if (room.players.size >= room.maxPlayers && !room.players.has(playerId)) {
          callback?.({ ok: false, error: "Essa sala já está completa." });
          return;
        }
        const player = room.addPlayer(playerId, payload.playerName);
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
      (payload: StartPayload & { colorMode?: string; seerId?: string | null; matchMode?: string }) => {
        const code = socket.data.roomCode;
        const room = code ? roomManager.getRoom(code) : undefined;
        if (!room || !socket.data.playerId || !room.isHost(socket.data.playerId)) return;

        const options: { colorMode?: string; seerId?: string | null; matchMode?: string } = {};
        if (payload?.colorMode && isValidColorMode(payload.colorMode)) options.colorMode = payload.colorMode;
        if (payload?.seerId === null || (payload?.seerId && room.players.has(payload.seerId))) {
          options.seerId = payload.seerId;
        }
        if (
          payload?.matchMode &&
          (isValidCrosswordMode(payload.matchMode) ||
            isValidWordSearchMode(payload.matchMode) ||
            isValidQuizMode(payload.matchMode) ||
            isValidRPGMode(payload.matchMode))
        ) {
          options.matchMode = payload.matchMode;
        }

        room.setPendingConfig({ ...sanitizeStartOptions(payload), ...options });
        broadcastRoom(io, code!, roomManager);
      }
    );

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
      if (room.gameId === "puzzle" && !room.pendingImageId) {
        callback?.({ ok: false, error: "Escolha uma imagem antes de começar." });
        return;
      }
      // Sem exigência de "os dois conectados": o host pode jogar sozinho —
      // se o par ainda entrar depois, ele acompanha a partida já em andamento.
      // Usa a configuração já sincronizada da sala; um payload aqui (se vier)
      // só serve como um ajuste de última hora, nunca como fonte principal.
      room.startGame(sanitizeStartOptions(payload));
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
      callback?.({ ok: true });
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

    socket.on("game:drop", (payload: { groupId: string; x: number; y: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.applyAction(
        { type: "drop", groupId: payload.groupId, x: payload.x, y: payload.y },
        socket.data.playerId ?? socket.id
      );
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
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

      if (state.phase === "intro" && now - state.introStartedAt >= RPG_INTRO_DURATION_MS) {
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
}
