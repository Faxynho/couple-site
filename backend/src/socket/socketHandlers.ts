import { Server, Socket } from "socket.io";
import { RoomManager } from "../rooms/RoomManager";
import { GameId } from "../types";
import { isValidImageId, isValidDifficulty } from "../games/puzzle/puzzleImages";
import { isValidSudokuDifficulty } from "../games/sudoku/sudokuGenerator";
import { isValidColorDifficulty } from "../games/colors/ColorMemoryGame";

interface SocketData {
  roomCode?: string;
  playerName?: string;
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

function broadcastGameState(io: Server, roomCode: string, roomManager: RoomManager) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;
  io.to(roomCode).emit("game:state", room.gameState);
}

export function registerSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.on("room:create", (payload: { gameId: GameId; playerName: string }, callback: AckCallback) => {
      const room = roomManager.createRoom(payload.gameId);
      const player = room.addPlayer(socket.id, payload.playerName);
      socket.data.roomCode = room.code;
      socket.data.playerName = payload.playerName;
      socket.join(room.code);
      callback?.({ ok: true, room: room.toSnapshot(), player });
    });

    socket.on("room:join", (payload: { code: string; playerName: string }, callback: AckCallback) => {
      const room = roomManager.getRoom(payload.code);
      if (!room) {
        callback?.({ ok: false, error: "Sala não encontrada. Confira o código." });
        return;
      }
      if (room.players.size >= room.maxPlayers && !room.players.has(socket.id)) {
        callback?.({ ok: false, error: "Essa sala já está completa." });
        return;
      }
      const player = room.addPlayer(socket.id, payload.playerName);
      socket.data.roomCode = room.code;
      socket.data.playerName = payload.playerName;
      socket.join(room.code);
      callback?.({ ok: true, room: room.toSnapshot(), player });
      broadcastRoom(io, room.code, roomManager);
      if (room.gameState) broadcastGameState(io, room.code, roomManager);
    });

    // Permite que uma página recém-montada (ex.: tela do jogo após navegação
    // ou um refresh) recupere o estado atual da sala em que o socket já está.
    socket.on("room:sync", (code: string, callback: AckCallback) => {
      const room = roomManager.getRoom(code);
      if (!room || !room.players.has(socket.id)) {
        callback?.({ ok: false, error: "Sala não encontrada para este jogador." });
        return;
      }
      socket.data.roomCode = room.code;
      socket.join(room.code);
      callback?.({ ok: true, room: room.toSnapshot(), gameState: room.gameState });
    });

    socket.on("room:leave", () => {
      const code = socket.data.roomCode;
      if (!code) return;
      const room = roomManager.getRoom(code);
      if (room) {
        room.markDisconnected(socket.id);
        socket.leave(code);
        broadcastRoom(io, code, roomManager);
      }
      socket.data.roomCode = undefined;
    });

    // Só o host pode mudar a configuração da partida (imagem/dificuldade)
    // enquanto os dois estão na sala de espera — o outro jogador só acompanha,
    // recebendo a atualização em tempo real via room:update.
    socket.on("room:setConfig", (payload: StartPayload) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || !room.isHost(socket.id)) return;
      room.setPendingConfig(sanitizeStartOptions(payload));
      broadcastRoom(io, code!, roomManager);
    });

    socket.on("game:start", (payload: StartPayload | undefined, callback: AckCallback) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) {
        callback?.({ ok: false, error: "Sala inválida." });
        return;
      }
      if (!room.isHost(socket.id)) {
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
      room.applyAction({ type: "pickup", groupId: payload.groupId }, socket.id);
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
        playerId: socket.id,
      });
    });

    socket.on("game:drop", (payload: { groupId: string; x: number; y: number }) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room) return;
      room.applyAction({ type: "drop", groupId: payload.groupId, x: payload.x, y: payload.y }, socket.id);
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
      room.applyAction({ type: "setCell", index: payload.index, value: payload.value }, socket.id);
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
        socket.id
      );
      broadcastGameState(io, code!, roomManager);
    });

    // Avança para a próxima rodada (ou finaliza, na última) — só é aplicado
    // quando todos os jogadores conectados já enviaram o palpite da rodada atual,
    // para que ninguém pule a comparação de resultado do outro.
    socket.on("colors:nextRound", () => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "colors" || !room.gameState) return;

      const state = room.gameState as {
        currentRound: number;
        rounds: { guesses: Record<string, unknown> }[];
        finished: boolean;
      };
      if (state.finished) return;

      const connectedIds = [...room.players.values()].filter((p) => p.connected).map((p) => p.id);
      const currentGuesses = state.rounds[state.currentRound]?.guesses ?? {};
      const allSubmitted = connectedIds.length > 0 && connectedIds.every((id) => currentGuesses[id]);
      if (!allSubmitted) return;

      room.applyAction({ type: "nextRound" }, socket.id);
      broadcastGameState(io, code!, roomManager);
      if (room.status === "finished") {
        broadcastRoom(io, code!, roomManager);
      }
    });

    // "Jogar de novo" — gera uma nova sequência de cores (na dificuldade enviada,
    // ou mantendo a atual da partida se omitida).
    socket.on("colors:newGame", (payload: { difficulty?: string } | undefined) => {
      const code = socket.data.roomCode;
      const room = code ? roomManager.getRoom(code) : undefined;
      if (!room || room.gameId !== "colors") return;

      const options: Record<string, unknown> = {};
      if (payload?.difficulty && isValidColorDifficulty(payload.difficulty)) {
        options.difficulty = payload.difficulty;
      } else {
        const currentDifficulty = (room.gameState as { difficulty?: string } | null)?.difficulty;
        if (currentDifficulty) options.difficulty = currentDifficulty;
      }

      room.startGame(options);
      broadcastRoom(io, code!, roomManager);
      broadcastGameState(io, code!, roomManager);
    });

    socket.on("disconnect", () => {
      const code = socket.data.roomCode;
      if (!code) return;
      const room = roomManager.getRoom(code);
      if (room) {
        room.markDisconnected(socket.id);
        broadcastRoom(io, code, roomManager);
      }
    });
  });
}
