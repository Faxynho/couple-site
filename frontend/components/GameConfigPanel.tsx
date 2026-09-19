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
import { MEMORY_DIFFICULTIES, MEMORY_MODES, MemoryDifficulty, MemoryMode } from "@/lib/memoryTypes";
import { TERMO_VARIANTS, TermoVariant } from "@/lib/termoTypes";
import { WHOAMI_CATEGORIES, WHOAMI_DIFFICULTIES, WHOAMI_MODES, WhoAmICategory, WhoAmIDifficulty, WhoAmIMode } from "@/lib/whoAmITypes";
import { CASINO_LENGTHS, CasinoLength } from "@/lib/casinoTypes";
import { DRAW_GUESS_DURATIONS, DRAW_GUESS_ROUNDS } from "@/lib/drawGuessTypes";
import { RoomSnapshot } from "@/lib/types";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import AccountAvatar from "@/components/account/AccountAvatar";

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
    whoamiCategory?: string;
    chessPinkPlayerId?: string | null;
    rpgAppearance?: "man" | "woman";
    drawGuessDuration?: string;
  }) => void;
  setBoardRacePawnColor: (color: "blue" | "pink") => void;
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
export default function GameConfigPanel({ room, isHost, selfId, setConfig, setBoardRacePawnColor }: GameConfigPanelProps) {
  const { images, loading: imagesLoading } = usePuzzleImages();
  const connectedPlayers = room.players.filter((p) => p.connected);
  const bothConnected = connectedPlayers.length === room.maxPlayers;

  if (room.gameId === "drawguess") {
    const selectedRounds = (["4", "6", "8"].includes(room.pendingDifficulty) ? room.pendingDifficulty : "6") as keyof typeof DRAW_GUESS_ROUNDS;
    const selectedDuration = (["60", "120"].includes(room.pendingDrawGuessDuration ?? "") ? room.pendingDrawGuessDuration : "60") as keyof typeof DRAW_GUESS_DURATIONS;
    return (
      <div className="text-left">
        <SectionLabel>{isHost ? "Quantidade de rodadas" : "Rodadas escolhidas"}</SectionLabel>
        <OptionGrid
          entries={Object.entries(DRAW_GUESS_ROUNDS) as [keyof typeof DRAW_GUESS_ROUNDS, (typeof DRAW_GUESS_ROUNDS)[keyof typeof DRAW_GUESS_ROUNDS]][]}
          selected={selectedRounds}
          isHost={isHost}
          onSelect={(key) => setConfig({ difficulty: key })}
        />
        <div className="mt-5">
          <SectionLabel>{isHost ? "Tempo por rodada" : "Tempo escolhido"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={Object.entries(DRAW_GUESS_DURATIONS) as [keyof typeof DRAW_GUESS_DURATIONS, (typeof DRAW_GUESS_DURATIONS)[keyof typeof DRAW_GUESS_DURATIONS]][]}
            selected={selectedDuration}
            isHost={isHost}
            onSelect={(key) => setConfig({ drawGuessDuration: key })}
          />
        </div>
        <div className="mt-4 rounded-xl2 border border-surface/70 bg-surface/50 p-4 text-center">
          <p className="text-sm font-medium text-ink">🖌️ Um desenha, o outro adivinha</p>
          <p className="mt-1 text-xs text-ink-soft">Os papéis alternam a cada rodada. Quanto mais rápido o acerto, mais pontos os dois recebem.</p>
        </div>
      </div>
    );
  }

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

  if (room.gameId === "memory") {
    const selectedDifficulty = (room.pendingDifficulty as MemoryDifficulty) ?? "medium";
    const selectedMode = (room.pendingMatchMode as MemoryMode) ?? "together";
    const modeEntries = (Object.entries(MEMORY_MODES) as [MemoryMode, (typeof MEMORY_MODES)[MemoryMode]][]).filter(
      ([key]) => key !== "solo"
    );
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Modo de jogo" : "Modo escolhido pelo anfitrião"}</SectionLabel>
          <OptionGrid cols={2} entries={modeEntries} selected={selectedMode} isHost={isHost} onSelect={(key) => setConfig({ matchMode: key })} />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={Object.entries(MEMORY_DIFFICULTIES) as [MemoryDifficulty, (typeof MEMORY_DIFFICULTIES)[MemoryDifficulty]][]}
            selected={selectedDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
        </div>
      </>
    );
  }

  if (room.gameId === "termo") {
    const selectedVariant = (room.pendingDifficulty as TermoVariant) ?? "one";
    return (
      <div className="text-left">
        <SectionLabel>{isHost ? "Variante do duelo" : "Variante escolhida pelo anfitrião"}</SectionLabel>
        <OptionGrid
          entries={Object.entries(TERMO_VARIANTS) as [TermoVariant, (typeof TERMO_VARIANTS)[TermoVariant]][]}
          selected={selectedVariant}
          isHost={isHost}
          onSelect={(key) => setConfig({ difficulty: key })}
        />
        <p className="mt-3 text-center text-xs text-ink-soft">⚔️ Duelo — as mesmas palavras, tentativas privadas.</p>
      </div>
    );
  }

  if (room.gameId === "rpg") {
    const selectedMode = (room.pendingMatchMode as RPGMode) ?? "1v1";
    const selectedAppearance = room.pendingRpgAppearance ?? "man";
    // Sala Duo nunca oferece "soloBot" — não faz sentido com o convidado presente.
    const modeEntries = (Object.entries(RPG_MODES) as [RPGMode, (typeof RPG_MODES)[RPGMode]][]).filter(
      ([key]) => key !== "soloBot"
    );
    return (
      <div className="text-left">
        <SectionLabel>{isHost ? "Modo de batalha" : "Modo escolhido pelo anfitrião"}</SectionLabel>
        <OptionGrid entries={modeEntries} selected={selectedMode} isHost={isHost} onSelect={(key) => setConfig({ matchMode: key })} />
        <div className="mt-5">
          <SectionLabel>{isHost ? "Escolha seu personagem" : "Personagens escolhidos pelo anfitrião"}</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {(["man", "woman"] as const).map((appearance) => {
              const selected = appearance === selectedAppearance;
              return (
                <button
                  key={appearance}
                  type="button"
                  disabled={!isHost}
                  onClick={() => setConfig({ rpgAppearance: appearance })}
                  aria-label="Selecionar personagem"
                  className={`relative flex h-32 items-end justify-center overflow-hidden rounded-2xl border p-2 transition ${selected ? appearance === "woman" ? "border-rose-400 bg-rose-200/25 shadow-[0_0_22px_rgba(244,114,182,0.28)]" : "border-sky-400 bg-sky-200/25 shadow-[0_0_22px_rgba(56,189,248,0.28)]" : "border-surface/70 bg-surface/50"} ${isHost ? "hover:-translate-y-0.5" : "cursor-default"}`}
                >
                  <span className={`pointer-events-none absolute inset-x-5 bottom-2 h-4 rounded-full blur-md ${appearance === "woman" ? "bg-rose-400/35" : "bg-sky-400/35"}`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/images/rpg/sprites/${appearance}.png`} alt="" className="relative z-10 h-full w-full object-contain" style={{ imageRendering: "pixelated" }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (room.gameId === "airhockey") {
    return (
      <p className="text-center text-xs text-ink-soft">🏒 Duelo 1x1 — primeiro a 7 gols vence.</p>
    );
  }

  if (room.gameId === "chess") {
    return <ChessColorConfig
      room={room}
      isHost={isHost}
      setConfig={setConfig}
      connectedPlayers={connectedPlayers}
    />;
  }

  if (room.gameId === "whoami") {
    const selectedMode = (room.pendingMatchMode as WhoAmIMode) ?? "duelHints";
    const selectedDifficulty = (room.pendingDifficulty as WhoAmIDifficulty) ?? "easy";
    const selectedCategory = (room.pendingWhoAmICategory as WhoAmICategory) ?? "all";
    return (
      <>
        <div className="text-left">
          <SectionLabel>{isHost ? "Modo de jogo" : "Modo escolhido pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={Object.entries(WHOAMI_MODES) as [WhoAmIMode, (typeof WHOAMI_MODES)[WhoAmIMode]][]}
            selected={selectedMode}
            isHost={isHost}
            onSelect={(key) => setConfig({ matchMode: key })}
          />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Dificuldade" : "Dificuldade escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            entries={Object.entries(WHOAMI_DIFFICULTIES) as [WhoAmIDifficulty, (typeof WHOAMI_DIFFICULTIES)[WhoAmIDifficulty]][]}
            selected={selectedDifficulty}
            isHost={isHost}
            onSelect={(key) => setConfig({ difficulty: key })}
          />
        </div>
        <div className="mt-5 text-left">
          <SectionLabel>{isHost ? "Categoria" : "Categoria escolhida pelo anfitrião"}</SectionLabel>
          <OptionGrid
            cols={2}
            entries={Object.entries(WHOAMI_CATEGORIES) as [WhoAmICategory, (typeof WHOAMI_CATEGORIES)[WhoAmICategory]][]}
            selected={selectedCategory}
            isHost={isHost}
            onSelect={(key) => setConfig({ whoamiCategory: key })}
          />
          <p className="mt-3 text-center text-[11px] text-ink-soft">
            No Fácil entram só respostas bem conhecidas. No Clássico, a dificuldade muda apenas o quão conhecida é a identidade.
          </p>
        </div>
      </>
    );
  }

  if (room.gameId === "casino") {
    const selectedLength = (room.pendingDifficulty as CasinoLength) ?? "normal";
    return (
      <div className="text-left">
        <SectionLabel>{isHost ? "Duração da sessão" : "Duração escolhida pelo anfitrião"}</SectionLabel>
        <OptionGrid
          entries={Object.entries(CASINO_LENGTHS) as [CasinoLength, (typeof CASINO_LENGTHS)[CasinoLength]][]}
          selected={selectedLength}
          isHost={isHost}
          onSelect={(key) => setConfig({ difficulty: key })}
        />
        <div className="mt-4 rounded-xl2 border border-surface/70 bg-surface/50 p-4 text-center">
          <p className="text-sm font-medium text-ink">🎰 Duelo de fichas · 10 mesas</p>
          <p className="mt-1 text-xs text-ink-soft">Os dois começam com 1.000 fichas. A cada rodada, escolham em segredo entre 3 jogos e arrisquem até alguém alcançar a meta.</p>
        </div>
      </div>
    );
  }

  if (room.gameId === "boardrace") {
    const selectedColor = selfId ? room.pendingBoardRacePawnColors?.[selfId] : undefined;
    const opponent = connectedPlayers.find((player) => player.id !== selfId);
    const opponentColor = opponent ? room.pendingBoardRacePawnColors?.[opponent.id] : undefined;
    return (
      <div className="text-left">
        <SectionLabel>Escolha seu peão</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {(["pink", "blue"] as const).map((color) => {
            const selected = selectedColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setBoardRacePawnColor(color)}
                className={`rounded-xl2 border p-3 text-center transition-colors ${selected ? color === "pink" ? "border-rose bg-rose/10" : "border-sky-400 bg-sky-100/60" : "border-surface/70 bg-surface/50 hover:bg-surface/70"}`}
              >
                <span className={`mx-auto block h-6 w-6 rounded-full border-2 border-white shadow-sm ${color === "pink" ? "bg-rose" : "bg-sky-500"}`} />
                <span className="mt-1.5 block text-sm font-medium text-ink">{color === "pink" ? "Rosa" : "Azul"}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-ink-soft">
          {selectedColor ? `Seu peão: ${selectedColor === "pink" ? "Rosa" : "Azul"}.` : "Escolha uma cor para seu peão."}
          {opponent && opponentColor ? ` ${opponent.name} fica com ${opponentColor === "pink" ? "Rosa" : "Azul"}.` : ""}
        </p>
        <p className="mt-2 rounded-xl2 border border-surface/70 bg-surface/50 p-3 text-center text-xs text-ink-soft">⚔️ Duelo 1x1 · dado de 1 a 6, 30 casas e desafios compartilhados.</p>
      </div>
    );
  }

  return null;
}

function ChessColorConfig({ room, isHost, setConfig, connectedPlayers }: { room: RoomSnapshot; isHost: boolean; setConfig: GameConfigPanelProps["setConfig"]; connectedPlayers: RoomSnapshot["players"] }) {
    const photos = useAccountPhotos();
    const pinkPlayerId = room.pendingChessPinkPlayerId ?? connectedPlayers[0]?.id ?? null;
    const pinkPlayer = connectedPlayers.find((player) => player.id === pinkPlayerId);
    return (
      <div className="text-left">
        <SectionLabel>{isHost ? "Escolha quem joga de Rosa" : "Cores escolhidas pelo anfitrião"}</SectionLabel>
        {isHost ? (
          <div className="grid grid-cols-2 gap-2">
            {connectedPlayers.map((player) => {
              const selected = player.id === pinkPlayerId;
              const photo = player.accountId ? photos[player.accountId] : undefined;
              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={connectedPlayers.length !== 2}
                  onClick={() => setConfig({ chessPinkPlayerId: player.id })}
                  className={`flex items-center gap-2 rounded-xl2 border px-3 py-2.5 text-left transition-colors ${selected ? "border-rose bg-rose/10 text-ink shadow-sm" : "border-surface/70 bg-surface/50 text-ink-soft hover:bg-surface/70"}`}
                >
                  <AccountAvatar name={player.name} photo={photo} accountId={player.accountId} fallbackColor={player.color} size={34} />
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold">{player.name}</span><span className="block text-[10px] text-ink-soft">{selected ? "Rosa · começa" : "Azul"}</span></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl2 border border-surface/70 bg-surface/50 p-3">
            <p className="text-center text-xs text-ink-soft">{pinkPlayer ? `${pinkPlayer.name} escolheu as cores` : "Aguardando o anfitrião escolher as cores"}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[11px]">
              {connectedPlayers.map((player) => <div key={player.id} className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 ${player.id === pinkPlayerId ? "bg-rose/15 text-ink" : "bg-sky-200/20 text-ink-soft"}`}><AccountAvatar name={player.name} photo={player.accountId ? photos[player.accountId] : undefined} accountId={player.accountId} fallbackColor={player.color} size={24} /><span className="truncate font-medium">{player.name}</span><span>· {player.id === pinkPlayerId ? "Rosa" : "Azul"}</span></div>)}
            </div>
          </div>
        )}
        {connectedPlayers.length !== 2 && <p className="mt-2 text-center text-[11px] text-ink-soft">A escolha fica disponível quando os dois jogadores estiverem conectados.</p>}
        <p className="mt-3 text-center text-[11px] text-ink-soft">Rosa usa as peças brancas e sempre começa. Azul responde.</p>
      </div>
    );
}
