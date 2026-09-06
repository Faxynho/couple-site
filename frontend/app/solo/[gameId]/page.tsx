"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import ImagePicker from "@/components/ImagePicker";
import { useRoom } from "@/hooks/useRoom";
import { usePuzzleImages } from "@/hooks/usePuzzleImages";
import { GameId } from "@/lib/types";
import { GAMES, DIFFICULTIES, Difficulty } from "@/lib/games";
import { SUDOKU_DIFFICULTIES, SudokuDifficulty } from "@/lib/sudokuTypes";
import { COLOR_DIFFICULTIES, ColorDifficulty } from "@/lib/colorTypes";
import { CROSSWORD_DIFFICULTIES, CrosswordDifficulty } from "@/lib/crosswordTypes";
import { WORDSEARCH_DIFFICULTIES, WordSearchDifficulty } from "@/lib/wordsearchTypes";
import { QUIZ_DIFFICULTIES, QuizDifficulty } from "@/lib/quizTypes";
import { MEMORY_DIFFICULTIES, MemoryDifficulty } from "@/lib/memoryTypes";
import { TERMO_VARIANTS, TermoVariant } from "@/lib/termoTypes";
import { AIR_HOCKEY_DIFFICULTIES, AirHockeyDifficulty } from "@/lib/airHockeyTypes";
import { CHESS_DIFFICULTIES, ChessDifficulty } from "@/lib/chessTypes";
import { CASINO_LENGTHS, CasinoLength } from "@/lib/casinoTypes";
import { fetchAccounts } from "@/lib/accountApi";
import { getActiveAccount } from "@/lib/accountSession";
import SoloMatchModal from "@/components/SoloMatchModal";
import { clearSoloMatch, getActiveProfileSoloMatch, resumeSoloMatch, SoloMatchSave } from "@/lib/soloMatch";

function DifficultyGrid<K extends string>({
  entries,
  selected,
  onSelect,
}: {
  entries: [K, { label: string; emoji: string; hint?: string }][];
  selected: K;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {entries.map(([key, info]) => {
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 transition-colors hover:bg-surface/70 ${
              isSelected ? "border-rose bg-rose/10 text-ink" : "border-surface/70 bg-surface/50 text-ink-soft"
            }`}
          >
            <span className="text-lg leading-none">{info.emoji}</span>
            <span className="text-xs font-medium">{info.label}</span>
            {info.hint && <span className="text-center text-[10px] text-ink-soft">{info.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function SoloGameConfigPage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const gameId = params.gameId as GameId;
  const game = useMemo(() => GAMES.find((g) => g.id === gameId), [gameId]);

  const { error, loading, createRoom, setConfig, startGame } = useRoom();
  const { images, loading: imagesLoading } = usePuzzleImages();

  const [difficulty, setDifficulty] = useState<string>(() => gameId === "termo" ? "one" : gameId === "casino" ? "normal" : "medium");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null);
  const [starting, setStarting] = useState(false);
  const [conflictSave, setConflictSave] = useState<SoloMatchSave | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  // Continua sem pedir nome (nunca teve essa etapa no Solo) — só passa a usar
  // o nome atual da conta fixa, se houver, no lugar do "Você" genérico.
  const [playerName, setPlayerName] = useState("Você");

  useEffect(() => {
    const active = getActiveAccount();
    if (active?.type === "account") {
      fetchAccounts()
        .then((accounts) => {
          const found = accounts.find((a) => a.id === active.id);
          if (found) setPlayerName(found.name);
        })
        .catch(() => {});
    }
  }, []);

  if (!game || game.soloAvailable === false) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-ink-soft">{game?.soloAvailable === false ? "Esse jogo foi feito para a sala Duo." : "Jogo não encontrado."}</p>
        <Button onClick={() => router.push("/solo")} className="mt-4">
          Voltar
        </Button>
      </main>
    );
  }

  const selectedImage = images.find((img) => img.file === imageId) ?? null;

  const startMatch = async () => {
    setStarting(true);
    const res = await createRoom("solo", playerName, gameId);
    if (!res.ok || !res.room) {
      setStarting(false);
      return;
    }

    // Cada jogo tem um único modo que faz sentido sozinho — nada disso é
    // exposto na tela, é só o valor certo indo direto para o servidor.
    if (gameId === "puzzle") {
      setConfig({ difficulty, imageId: imageId ?? undefined, imageWidth: imageDims?.width, imageHeight: imageDims?.height });
    } else if (gameId === "quiz") {
      setConfig({ difficulty, matchMode: "solo" });
    } else if (gameId === "rpg") {
      setConfig({ matchMode: "soloBot" });
    } else if (gameId === "memory") {
      setConfig({ difficulty, matchMode: "solo" });
    } else if (gameId === "termo") {
      setConfig({ difficulty, matchMode: "solo" });
    } else if (gameId === "airhockey") {
      setConfig({ difficulty, matchMode: "solo" });
    } else if (gameId === "chess") {
      setConfig({ difficulty, matchMode: "solo" });
    } else if (gameId === "casino") {
      // Não existe dificuldade do BOT: a única escolha continua sendo a
      // duração/meta da sessão. O servidor força Solo -> soloBot também.
      setConfig({ difficulty, matchMode: "soloBot" });
    } else {
      setConfig({ difficulty });
    }

    const startRes = await startGame();
    if (startRes.ok) {
      router.push(`/game/${gameId}/${res.room.code}`);
    } else {
      setStarting(false);
    }
  };

  const handleStart = () => {
    const activeSave = getActiveProfileSoloMatch();
    if (activeSave) {
      setConflictError(null);
      setConflictSave(activeSave);
      return;
    }
    void startMatch();
  };

  const returnToSavedMatch = async () => {
    if (!conflictSave) return;
    setStarting(true);
    setConflictError(null);
    const response = await resumeSoloMatch(conflictSave);
    setStarting(false);
    if (!response.ok || !response.room?.gameId) {
      setConflictError(response.error || "Não foi possível restaurar a partida.");
      return;
    }
    setConflictSave(null);
    router.push(`/game/${response.room.gameId}/${response.room.code}`);
  };

  const canStart = gameId === "puzzle" ? Boolean(imageId) : true;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-14">
      <div className="flex w-full items-center gap-3">
        <button
          onClick={() => router.push("/solo")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <Logo size={40} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-panel mt-8 w-full rounded-xl3 p-6"
      >
        <div className="mb-5 text-center">
          <span className="text-3xl">{game.emoji}</span>
          <h1 className="mt-2 font-display text-xl font-semibold text-ink">{game.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{game.description}</p>
        </div>

        {gameId === "puzzle" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Escolha a imagem</p>
            <ImagePicker
              images={images}
              loading={imagesLoading}
              selected={selectedImage}
              onSelect={(img) => {
                setImageId(img.file);
                setImageDims({ width: img.width, height: img.height });
              }}
            />
            <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={
                Object.entries(DIFFICULTIES).map(([key, info]) => [
                  key,
                  { label: info.label, emoji: info.emoji, hint: `${info.targetPieces} peças` },
                ]) as [Difficulty, { label: string; emoji: string; hint: string }][]
              }
              selected={difficulty as Difficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "sudoku" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={Object.entries(SUDOKU_DIFFICULTIES) as [SudokuDifficulty, (typeof SUDOKU_DIFFICULTIES)[SudokuDifficulty]][]}
              selected={difficulty as SudokuDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "colors" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={Object.entries(COLOR_DIFFICULTIES) as [ColorDifficulty, (typeof COLOR_DIFFICULTIES)[ColorDifficulty]][]}
              selected={difficulty as ColorDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "crossword" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={Object.entries(CROSSWORD_DIFFICULTIES) as [CrosswordDifficulty, (typeof CROSSWORD_DIFFICULTIES)[CrosswordDifficulty]][]}
              selected={difficulty as CrosswordDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "wordsearch" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={Object.entries(WORDSEARCH_DIFFICULTIES) as [WordSearchDifficulty, (typeof WORDSEARCH_DIFFICULTIES)[WordSearchDifficulty]][]}
              selected={difficulty as WordSearchDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "quiz" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={Object.entries(QUIZ_DIFFICULTIES) as [QuizDifficulty, (typeof QUIZ_DIFFICULTIES)[QuizDifficulty]][]}
              selected={difficulty as QuizDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "memory" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade</p>
            <DifficultyGrid
              entries={Object.entries(MEMORY_DIFFICULTIES) as [MemoryDifficulty, (typeof MEMORY_DIFFICULTIES)[MemoryDifficulty]][]}
              selected={difficulty as MemoryDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "termo" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Variante</p>
            <DifficultyGrid
              entries={Object.entries(TERMO_VARIANTS) as [TermoVariant, (typeof TERMO_VARIANTS)[TermoVariant]][]}
              selected={difficulty as TermoVariant}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "airhockey" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade do BOT</p>
            <DifficultyGrid
              entries={Object.entries(AIR_HOCKEY_DIFFICULTIES) as [AirHockeyDifficulty, (typeof AIR_HOCKEY_DIFFICULTIES)[AirHockeyDifficulty]][]}
              selected={difficulty as AirHockeyDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "chess" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Dificuldade do BOT</p>
            <DifficultyGrid
              entries={Object.entries(CHESS_DIFFICULTIES) as [ChessDifficulty, (typeof CHESS_DIFFICULTIES)[ChessDifficulty]][]}
              selected={difficulty as ChessDifficulty}
              onSelect={setDifficulty}
            />
          </div>
        )}

        {gameId === "casino" && (
          <div className="text-left">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Duração da sessão</p>
            <DifficultyGrid
              entries={Object.entries(CASINO_LENGTHS) as [CasinoLength, (typeof CASINO_LENGTHS)[CasinoLength]][]}
              selected={difficulty as CasinoLength}
              onSelect={setDifficulty}
            />
            <div className="mt-4 rounded-xl2 border border-surface/70 bg-surface/50 p-4 text-center">
              <p className="text-sm font-medium text-ink">🤖 Solo contra BOT · 10 mesas</p>
              <p className="mt-1 text-xs text-ink-soft">Vocês começam com 1.000 fichas. O BOT aposta e decide como um jogador normal, sem conhecer bombas, cartas ou resultados futuros.</p>
            </div>
          </div>
        )}

        {gameId === "rpg" && (
          <p className="text-center text-sm text-ink-soft">Sorteie sua classe e batalhe contra o BOT.</p>
        )}

        <Button onClick={handleStart} disabled={!canStart || loading || starting} className="mt-6 w-full">
          {gameId === "rpg" ? "Batalhar!" : gameId === "casino" ? "Jogar contra o BOT" : "Jogar!"}
        </Button>

        {error && <p className="mt-4 text-center text-sm text-rose-deep">{error}</p>}
      </motion.div>
      {conflictSave && (
        <SoloMatchModal
          save={conflictSave}
          mode="conflict"
          busy={starting}
          error={conflictError}
          onReturnToMatch={() => void returnToSavedMatch()}
          onStartNewMatch={() => {
            clearSoloMatch(conflictSave.ownerId);
            setConflictSave(null);
            void startMatch();
          }}
        />
      )}
    </main>
  );
}
