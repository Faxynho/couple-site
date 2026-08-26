"use client";

import ImagePicker from "@/components/ImagePicker";
import { usePuzzleImages } from "@/hooks/usePuzzleImages";
import { DIFFICULTIES, Difficulty } from "@/lib/games";
import { SUDOKU_DIFFICULTIES, SudokuDifficulty } from "@/lib/sudokuTypes";
import { COLOR_DIFFICULTIES, COLOR_MODES, ColorDifficulty, ColorMode } from "@/lib/colorTypes";
import { CROSSWORD_DIFFICULTIES, CrosswordDifficulty } from "@/lib/crosswordTypes";
import { WORDSEARCH_DIFFICULTIES, WordSearchDifficulty } from "@/lib/wordsearchTypes";
import { MATCH_MODES, MatchMode } from "@/lib/matchModes";
import { QUIZ_DIFFICULTIES, QUIZ_MODES, QuizDifficulty, QuizMode } from "@/lib/quizTypes";
import { RPG_MODES, RPGMode } from "@/lib/rpgTypes";
import { RoomSnapshot } from "@/lib/types";

interface GameConfigPanelProps {
  room: RoomSnapshot;
  isHost: boolean;
  selfId: string | null;
  setConfig: (payload: {
    imageId?: string;
    imageWidth?: number;
    imageHeight?: number;
    difficulty?: string;
    colorMode?: string;
    seerId?: string | null;
    matchMode?: string;
  }) => void;
}

function OptionGrid<K extends string>({
  entries,
  selected,
  isHost,
  onSelect,
  cols = 3,
}: {
  entries: [K, { label: string; emoji: string; hint?: string }][];
  selected: K;
  isHost: boolean;
  onSelect: (key: K) => void;
  cols?: 2 | 3;
}) {
  return (
    <div className={`grid gap-2 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {entries.map(([key, info]) => {
        const isSelected = selected === key;
        return (
          <button
            key={key}
            type="button"
            disabled={!isHost}
            onClick={() => onSelect(key)}
            className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 transition-colors ${
              isSelected ? "border-rose bg-rose/10 text-ink" : "border-surface/70 bg-surface/50 text-ink-soft"
            } ${isHost ? "hover:bg-surface/70" : "cursor-default opacity-90"}`}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">{children}</p>;
}

/**
 * Configuração do jogo escolhido na sala Duo (dificuldade, modo, imagem) —
 * consolida o que antes era uma tela separada por jogo (room-sudoku,
 * room-colors, etc.) num único painel, já que agora a sala é a mesma para
 * todos os jogos. Só o host interage; o convidado vê tudo em modo leitura.
 */
export default function GameConfigPanel({ room, isHost, selfId, setConfig }: GameConfigPanelProps) {
  const { images, loading: imagesLoading } = usePuzzleImages();
  const connectedPlayers = room.players.filter((p) => p.connected);
  const bothConnected = connectedPlayers.length === room.maxPlayers;

  if (room.gameId === "puzzle") {
    const selectedImage = images.find((img) => img.file === room.pendingImageId) ?? null;
    const selectedDifficulty = (room.pendingDifficulty as Difficulty) ?? "medium";
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Escolha a imagem" : "Imagem escolhida pelo anfitrião"}</SectionLabel>
          <ImagePicker
            images={images}
            loading={imagesLoading}
            selected={selectedImage}
            onSelect={(img) => isHost && setConfig({ imageId: img.file, imageWidth: img.width, imageHeight: img.height })}
            readOnly={!isHost}
          />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={
              Object.entries(DIFFICULTIES).map(([key, info]) => [
                key,
                { label: info.label, emoji: info.emoji, hint: `${info.targetPieces} peças` },
              ]) as [Difficulty, { label: string; emoji: string; hint: string }][]
            }
            selected={selectedDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
        </div>
      </>
    );
  }

  if (room.gameId === "sudoku") {
    const selectedDifficulty = (room.pendingDifficulty as SudokuDifficulty) ?? "medium";
    const selectedMatchMode = (room.pendingMatchMode as MatchMode) ?? "together";
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Modo de jogo" : "Modo escolhido pelo anfitrião"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={Object.entries(MATCH_MODES) as [MatchMode, (typeof MATCH_MODES)[MatchMode]][]}
            selected={selectedMatchMode}
            isHost={isHost}
            onSelect={(key) => setConfig({ matchMode: key })}
          />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={Object.entries(SUDOKU_DIFFICULTIES) as [SudokuDifficulty, (typeof SUDOKU_DIFFICULTIES)[SudokuDifficulty]][]}
            selected={selectedDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
        </div>
      </>
    );
  }

  if (room.gameId === "colors") {
    const selectedDifficulty = (room.pendingDifficulty as ColorDifficulty) ?? "easy";
    const selectedMode = (room.pendingColorMode as ColorMode) ?? "competitive";
    const isCooperativeSelected = selectedMode === "cooperative";
    const selectedSeerId = room.pendingSeerId ?? null;
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Como vocês querem jogar?" : "Modo escolhido pelo anfitrião"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={Object.entries(COLOR_MODES) as [ColorMode, (typeof COLOR_MODES)[ColorMode]][]}
            selected={selectedMode}
            isHost={isHost}
            onSelect={(key) => setConfig({ colorMode: key })}
          />
          {isCooperativeSelected && !bothConnected && (
            <p className="mt-2 text-center text-[11px] text-rose-deep">
              O modo Juntos precisa dos dois conectados — sem seu par, a partida começa no modo Um contra o outro.
            </p>
          )}
          {isCooperativeSelected && bothConnected && (
            <div className="mt-3">
              <SectionLabel>{isHost ? "Quem vai ver a cor primeiro?" : "Escolha de papéis do anfitrião"}</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {connectedPlayers.map((player) => {
                  const isSeer = (selectedSeerId ?? connectedPlayers[0]?.id) === player.id;
                  return (
                    <button
                      key={player.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => setConfig({ seerId: player.id })}
                      className={`flex flex-col items-center gap-1 rounded-xl2 border px-2 py-2.5 transition-colors ${
                        isSeer ? "border-rose bg-rose/10 text-ink" : "border-surface/70 bg-surface/50 text-ink-soft"
                      } ${isHost ? "hover:bg-surface/70" : "cursor-default opacity-90"}`}
                    >
                      <span className="text-lg leading-none">{isSeer ? "👁️" : "🎯"}</span>
                      <span className="text-xs font-medium">{player.id === selfId ? "Você" : player.name}</span>
                      <span className="text-center text-[10px] text-ink-soft">{isSeer ? "vê a cor" : "adivinha"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={Object.entries(COLOR_DIFFICULTIES) as [ColorDifficulty, (typeof COLOR_DIFFICULTIES)[ColorDifficulty]][]}
            selected={selectedDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
          <p className="mt-2 text-center text-[11px] text-ink-soft">5 rodadas, até 10 pontos cada — 50 no total.</p>
        </div>
      </>
    );
  }

  if (room.gameId === "crossword" || room.gameId === "wordsearch") {
    const difficulties = room.gameId === "crossword" ? CROSSWORD_DIFFICULTIES : WORDSEARCH_DIFFICULTIES;
    const selectedDifficulty = (room.pendingDifficulty as CrosswordDifficulty | WordSearchDifficulty) ?? "medium";
    const selectedMatchMode = (room.pendingMatchMode as MatchMode) ?? "together";
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Modo de jogo" : "Modo escolhido pelo anfitrião"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={Object.entries(MATCH_MODES) as [MatchMode, (typeof MATCH_MODES)[MatchMode]][]}
            selected={selectedMatchMode}
            isHost={isHost}
            onSelect={(key) => setConfig({ matchMode: key })}
          />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={Object.entries(difficulties) as [CrosswordDifficulty, (typeof difficulties)[CrosswordDifficulty]][]}
            selected={selectedDifficulty as CrosswordDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
        </div>
      </>
    );
  }

  if (room.gameId === "quiz") {
    const selectedDifficulty = (room.pendingDifficulty as QuizDifficulty) ?? "medium";
    const selectedMode = (room.pendingMatchMode as QuizMode) ?? "together";
    // Sala Duo nunca oferece o modo "Solo" — não faz sentido com o convidado presente.
    const modeEntries = (Object.entries(QUIZ_MODES) as [QuizMode, (typeof QUIZ_MODES)[QuizMode]][]).filter(
      ([key]) => key !== "solo"
    );
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Modo de jogo" : "Modo escolhido pelo anfitrião"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={modeEntries}
            selected={selectedMode}
            isHost={isHost}
            onSelect={(key) => setConfig({ matchMode: key })}
          />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={Object.entries(QUIZ_DIFFICULTIES) as [QuizDifficulty, (typeof QUIZ_DIFFICULTIES)[QuizDifficulty]][]}
            selected={selectedDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
        </div>
      </>
    );
  }

  if (room.gameId === "rpg") {
    const selectedMode = (room.pendingMatchMode as RPGMode) ?? "1v1";
    // Sala Duo nunca oferece "soloBot" — não faz sentido com o convidado presente.
    const modeEntries = (Object.entries(RPG_MODES) as [RPGMode, (typeof RPG_MODES)[RPGMode]][]).filter(
      ([key]) => key !== "soloBot"
    );
    return (
      <div className="text-left">
        <SectionLabel>{isHost ? "Modo de batalha" : "Modo escolhido pelo anfitrião"}</SectionLabel>
        <OptionGrid entries={modeEntries} selected={selectedMode} isHost={isHost} onSelect={(key) => setConfig({ matchMode: key })} />
      </div>
    );
  }

  return null;
}
