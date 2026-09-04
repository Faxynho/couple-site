import { CrosswordGame, CrosswordState } from "../crossword/CrosswordGame";
import { MemoryGame, MemoryState } from "../memory/MemoryGame";
import { RPGGame, RPG_INTRO_DURATION_MS, RPG_RESOLVE_PAUSE_MS } from "../rpg/RPGGame";
import { RPGState } from "../rpg/types";
import { TermoGame, TermoState } from "../termo/TermoGame";
import { WordSearchGame, WordSearchState } from "../wordsearch/WordSearchGame";
import { BoardRaceMinigameKind } from "./types";

const memoryGame = new MemoryGame();
const termoGame = new TermoGame();
const crosswordGame = new CrosswordGame();
const wordSearchGame = new WordSearchGame();
const rpgGame = new RPGGame();

export const BOARD_RACE_MINIGAMES: readonly BoardRaceMinigameKind[] = [
  "rpg",
  "termo",
  "memory",
  "crossword",
  "wordsearch",
];

export const BOARD_RACE_MINIGAME_TITLES: Record<BoardRaceMinigameKind, string> = {
  rpg: "Mini RPG",
  termo: "Termo · 1 palavra",
  memory: "Jogo da Memória · Fácil",
  crossword: "Palavras Cruzadas · Fácil",
  wordsearch: "Caça-Palavras · Fácil",
};

const CHALLENGE_DURATION_MS = 120_000;

/**
 * Os jogos embutidos usam os mesmos timestamps dos jogos independentes.
 * Adiá-los aqui garante que preview, cronômetro e introdução só comecem
 * depois que os dois clientes terminarem a animação do tabuleiro.
 */
export function delayEmbeddedMinigameStart(kind: BoardRaceMinigameKind, state: unknown, delayMs: number): unknown {
  const next = structuredClone(state) as Record<string, unknown>;
  const shift = (key: string) => {
    const value = next[key];
    if (typeof value === "number") next[key] = value + delayMs;
  };
  shift("startedAt");
  if (kind === "memory") {
    shift("previewEndsAt");
    shift("playStartedAt");
    shift("deadlineAt");
  }
  if (kind === "rpg") {
    shift("introStartedAt");
    shift("resolvedAt");
  }
  return next;
}

export function createEmbeddedMinigame(
  kind: BoardRaceMinigameKind,
  playerIds: string[],
  solo: boolean
): { state: unknown; expiresAt: number; botNextActionAt: number | null } {
  const now = Date.now();
  const duelPlayers = solo ? [playerIds[0], "BOT"] : playerIds.slice(0, 2);
  let state: unknown;
  switch (kind) {
    case "memory":
      state = memoryGame.createInitialState({ difficulty: "easy", mode: "duel", playerIds: duelPlayers });
      break;
    case "termo":
      state = termoGame.createInitialState({ difficulty: "one", mode: "duel", playerIds: duelPlayers });
      break;
    case "crossword":
      state = crosswordGame.createInitialState({ difficulty: "easy", mode: "duel", playerIds: duelPlayers });
      break;
    case "wordsearch":
      state = wordSearchGame.createInitialState({ difficulty: "easy", mode: "duel", playerIds: duelPlayers });
      break;
    case "rpg":
      state = rpgGame.createInitialState({
        mode: solo ? "soloBot" : "1v1",
        playerIds: solo ? [playerIds[0]] : duelPlayers,
        hostPlayerId: playerIds[0],
        rpgAppearance: "man",
      });
      break;
  }
  return {
    state,
    expiresAt: now + CHALLENGE_DURATION_MS,
    botNextActionAt: solo && kind !== "rpg" ? now + 2_500 : null,
  };
}

function sanitizeMinigameAction(kind: BoardRaceMinigameKind, raw: unknown): unknown | null {
  if (!raw || typeof raw !== "object") return null;
  const action = raw as Record<string, unknown>;
  if (kind === "memory" && action.type === "flipCard" && typeof action.slotId === "string") {
    return { type: "flipCard", slotId: action.slotId };
  }
  if (kind === "termo" && action.type === "submitGuess" && typeof action.word === "string") {
    return { type: "submitGuess", word: action.word.slice(0, 20) };
  }
  if (kind === "crossword" && action.type === "setCell") {
    return { type: "setCell", row: action.row, col: action.col, letter: action.letter };
  }
  if (kind === "wordsearch" && action.type === "submitSelection") {
    return {
      type: "submitSelection",
      startRow: action.startRow,
      startCol: action.startCol,
      endRow: action.endRow,
      endCol: action.endCol,
    };
  }
  if (kind === "rpg" && action.type === "selectCard" && typeof action.cardInstanceId === "string") {
    return { type: "selectCard", cardInstanceId: action.cardInstanceId };
  }
  if (kind === "rpg" && action.type === "rerollHand") return { type: "rerollHand" };
  return null;
}

export function applyEmbeddedMinigameAction(
  kind: BoardRaceMinigameKind,
  state: unknown,
  rawAction: unknown,
  playerId: string
): unknown {
  const action = sanitizeMinigameAction(kind, rawAction);
  if (!action) return state;
  switch (kind) {
    case "memory": return memoryGame.applyAction(state as MemoryState, action as never, playerId);
    case "termo": return termoGame.applyAction(state as TermoState, action as never, playerId);
    case "crossword": return crosswordGame.applyAction(state as CrosswordState, action as never, playerId);
    case "wordsearch": return wordSearchGame.applyAction(state as WordSearchState, action as never, playerId);
    case "rpg": return rpgGame.applyAction(state as RPGState, action as never, playerId);
  }
}

export function tickEmbeddedMinigame(
  kind: BoardRaceMinigameKind,
  state: unknown,
  now: number,
  botNextActionAt: number | null
): { state: unknown; botNextActionAt: number | null } {
  let nextState = state;
  let nextBotAt = botNextActionAt;

  if (kind === "memory") {
    const memory = nextState as MemoryState;
    if (memory.playStartedAt === null && now >= memory.previewEndsAt) {
      nextState = memoryGame.applyAction(memory, { type: "startPlay" }, "system");
    } else if (memory.playStartedAt !== null && memory.deadlineAt !== null && now >= memory.deadlineAt) {
      nextState = memoryGame.applyAction(memory, { type: "timeUp" }, "system");
    } else {
      const mismatch = Object.entries(memory.progress).find(([, progress]) => progress.mismatchUntil !== null && now >= progress.mismatchUntil);
      if (mismatch) nextState = memoryGame.applyAction(memory, { type: "hideMismatch", playerId: mismatch[0] }, "system");
    }
  }

  if (kind === "rpg") {
    const rpg = nextState as RPGState;
    if (rpg.phase === "intro" && now - rpg.introStartedAt >= RPG_INTRO_DURATION_MS) {
      nextState = rpgGame.applyAction(rpg, { type: "beginRound" }, "system");
    } else if (rpg.phase === "resolved" && rpg.resolvedAt !== null && now - rpg.resolvedAt >= RPG_RESOLVE_PAUSE_MS) {
      nextState = rpgGame.applyAction(rpg, { type: "advanceRound" }, "system");
    }
  }

  if (nextBotAt !== null && now >= nextBotAt && !isEmbeddedMinigameFinished(kind, nextState)) {
    nextState = performBotStep(kind, nextState);
    nextBotAt = now + botDelay(kind);
  }

  return { state: nextState, botNextActionAt: nextBotAt };
}

function botDelay(kind: BoardRaceMinigameKind): number {
  if (kind === "crossword") return 650;
  if (kind === "wordsearch") return 1_600;
  if (kind === "memory") return 1_800;
  return 8_000;
}

function performBotStep(kind: BoardRaceMinigameKind, state: unknown): unknown {
  if (kind === "termo") {
    const termo = state as TermoState;
    const solution = termo.solutions[0]?.original;
    return solution ? termoGame.applyAction(termo, { type: "submitGuess", word: solution }, "BOT") : state;
  }
  if (kind === "memory") {
    let memory = state as MemoryState;
    if (memory.playStartedAt === null || memory.progress.BOT?.finished || memory.progress.BOT?.mismatchUntil) return state;
    const matched = new Set(memory.progress.BOT?.matchedSlotIds ?? []);
    const available = memory.slots.filter((slot) => slot.iconId && !matched.has(slot.id));
    const pair = available.find((slot, index) => available.some((other, otherIndex) => otherIndex !== index && other.iconId === slot.iconId));
    const mate = pair && available.find((slot) => slot.id !== pair.id && slot.iconId === pair.iconId);
    if (!pair || !mate) return state;
    memory = memoryGame.applyAction(memory, { type: "flipCard", slotId: pair.id }, "BOT");
    return memoryGame.applyAction(memory, { type: "flipCard", slotId: mate.id }, "BOT");
  }
  if (kind === "crossword") {
    const crossword = state as CrosswordState;
    const progress = crossword.progress.BOT;
    if (!progress || progress.finished) return state;
    const index = crossword.cells.findIndex((cell, cellIndex) => !cell.block && progress.values[cellIndex] !== cell.solution);
    if (index < 0) return state;
    return crosswordGame.applyAction(crossword, {
      type: "setCell",
      row: Math.floor(index / crossword.cols),
      col: index % crossword.cols,
      letter: crossword.cells[index].solution ?? "",
    }, "BOT");
  }
  if (kind === "wordsearch") {
    const wordSearch = state as WordSearchState;
    const progress = wordSearch.progress.BOT;
    const word = wordSearch.words.find((candidate) => !progress?.found[candidate.id]);
    if (!progress || progress.finished || !word) return state;
    return wordSearchGame.applyAction(wordSearch, {
      type: "submitSelection",
      startRow: word.row,
      startCol: word.col,
      endRow: word.row + word.dr * (word.word.length - 1),
      endCol: word.col + word.dc * (word.word.length - 1),
    }, "BOT");
  }
  return state;
}

export function isEmbeddedMinigameFinished(kind: BoardRaceMinigameKind, state: unknown): boolean {
  switch (kind) {
    case "memory": return memoryGame.isSolved(state as MemoryState);
    case "termo": return termoGame.isSolved(state as TermoState);
    case "crossword": return crosswordGame.isSolved(state as CrosswordState);
    case "wordsearch": return wordSearchGame.isSolved(state as WordSearchState);
    case "rpg": return rpgGame.isSolved(state as RPGState);
  }
}

function uniqueLeaders(rows: { id: string; score: number[] }[]): string[] {
  const compare = (a: number[], b: number[]) => {
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      const delta = (a[index] ?? 0) - (b[index] ?? 0);
      if (delta !== 0) return delta;
    }
    return 0;
  };
  const sorted = [...rows].sort((a, b) => compare(b.score, a.score));
  if (!sorted[0] || (sorted[1] && compare(sorted[0].score, sorted[1].score) === 0)) return [];
  return [sorted[0].id];
}

export function embeddedMinigameWinnerIds(kind: BoardRaceMinigameKind, state: unknown): string[] {
  if (kind === "rpg") {
    const rpg = state as RPGState;
    if (rpg.winnerTeam && rpg.winnerTeam !== "draw") return rpg.winnerTeam === "a" ? rpg.teamA : rpg.teamB;
    if (rpg.winnerTeam === "draw") return [];
    const healthA = rpg.teamA.reduce((sum, id) => sum + Math.max(0, rpg.combatants[id]?.hp ?? 0), 0);
    const healthB = rpg.teamB.reduce((sum, id) => sum + Math.max(0, rpg.combatants[id]?.hp ?? 0), 0);
    if (healthA === healthB) return [];
    return healthA > healthB ? rpg.teamA : rpg.teamB;
  }
  if (kind === "termo") {
    const termo = state as TermoState;
    if (termo.finished) return termo.results.filter((result) => result.outcome === "win").map((result) => result.playerId);
    return uniqueLeaders(termo.expectedPlayers.map((id) => {
      const progress = termo.progress[id];
      return { id, score: [progress?.solvedIndices.length ?? 0, -(progress?.attemptsUsed ?? 0)] };
    }));
  }
  if (kind === "memory") {
    const memory = state as MemoryState;
    if (memory.finished) return memory.results.filter((result) => result.place === 1).map((result) => result.playerId);
    return uniqueLeaders(memory.expectedPlayers.map((id) => {
      const progress = memory.progress[id];
      return { id, score: [progress?.score ?? 0, progress?.pairsFound ?? 0, -(progress?.mistakes ?? 0)] };
    }));
  }
  if (kind === "crossword") {
    const crossword = state as CrosswordState;
    if (crossword.finished) return crossword.results.filter((result) => result.place === 1).map((result) => result.playerId);
    return uniqueLeaders(crossword.expectedPlayers.map((id) => ({ id, score: [crossword.progress[id]?.completedWordIds.length ?? 0] })));
  }
  const wordSearch = state as WordSearchState;
  if (wordSearch.finished) return wordSearch.results.filter((result) => result.place === 1).map((result) => result.playerId);
  return uniqueLeaders(wordSearch.expectedPlayers.map((id) => {
    const progress = wordSearch.progress[id];
    return { id, score: [Object.keys(progress?.found ?? {}).length, -(progress?.mistakes ?? 0)] };
  }));
}

export function maskEmbeddedMinigameState(kind: BoardRaceMinigameKind, state: unknown, playerId: string): unknown {
  if (kind === "memory") {
    const memory = state as MemoryState;
    const own = memory.progress[playerId];
    const previewing = memory.playStartedAt === null;
    const visibleIds = new Set([...(own?.matchedSlotIds ?? []), ...(own?.openSlotIds ?? [])]);
    const slots = memory.slots.map((slot) => ({
      id: slot.id,
      empty: slot.iconId === null,
      imageSrc: slot.iconId !== null && (previewing || visibleIds.has(slot.id)) ? `/images/memory/${slot.iconId}.png` : null,
    }));
    const progress = Object.fromEntries(Object.entries(memory.progress).map(([id, entry]) => [id, id === playerId ? entry : {
      matchedSlotIds: [], openSlotIds: [], score: entry.score, combo: entry.combo, pairsFound: entry.pairsFound,
      mistakes: entry.mistakes, mismatchUntil: null, finished: entry.finished, completed: entry.completed,
      finishedAt: entry.finishedAt, timeUsedMs: entry.timeUsedMs,
    }]));
    return { ...memory, slots, progress };
  }
  if (kind === "termo") {
    const termo = state as TermoState;
    const progress = Object.fromEntries(Object.entries(termo.progress).map(([id, entry]) => [id, id === playerId ? entry : {
      attemptsUsed: entry.attemptsUsed, solvedCount: entry.solvedIndices.length, finished: entry.finished,
      completed: entry.completed, finishedAt: entry.finishedAt, timeUsedMs: entry.timeUsedMs,
    }]));
    const { solutions: _solutions, ...publicState } = termo;
    return { ...publicState, progress, revealedSolutions: termo.finished ? termo.solutions.map((solution) => solution.original.toLocaleUpperCase("pt-BR")) : null };
  }
  if (kind === "crossword") {
    const crossword = state as CrosswordState;
    const cells = crossword.cells.map((cell) => ({ block: cell.block, number: cell.number }));
    const words = crossword.words.map(({ answer: _answer, ...word }) => word);
    const progress = Object.fromEntries(Object.entries(crossword.progress).map(([id, entry]) => [id, id === playerId ? entry : {
      finished: entry.finished, finishedAt: entry.finishedAt, timeMs: entry.timeMs,
      wordsCompleted: entry.completedWordIds.length, completedWordIds: entry.completedWordIds,
    }]));
    return { ...crossword, cells, words, progress };
  }
  if (kind === "wordsearch") {
    const wordSearch = state as WordSearchState;
    const words = wordSearch.words.map((word) => {
      const ownCells = wordSearch.progress[playerId]?.found[word.id];
      const foundBy = Object.entries(wordSearch.progress).filter(([, entry]) => Boolean(entry.found[word.id])).map(([id]) => id);
      return { id: word.id, word: word.word, ...(ownCells ? { cells: ownCells } : {}), ...(foundBy.length ? { foundBy } : {}) };
    });
    const progress = Object.fromEntries(Object.entries(wordSearch.progress).map(([id, entry]) => [id, id === playerId ? entry : {
      finished: entry.finished, finishedAt: entry.finishedAt, timeMs: entry.timeMs, mistakes: entry.mistakes,
      wordsFound: Object.keys(entry.found).length,
    }]));
    return { ...wordSearch, words, progress };
  }
  const rpg = state as RPGState;
  const combatants = Object.fromEntries(Object.entries(rpg.combatants).map(([id, combatant]) => {
    const hasChosen = Boolean(combatant.chosenCardId);
    return [id, id === playerId || rpg.phase !== "choosing" ? { ...combatant, hasChosen } : {
      ...combatant, hand: [], chosenCardId: null, hasChosen,
    }];
  }));
  return { ...rpg, combatants };
}
