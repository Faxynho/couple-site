"use client";

import Image from "next/image";
import { Dices, LayoutGrid } from "lucide-react";
import PersistentDuoStatus from "@/components/duo/PersistentDuoStatus";
import { GameId, PersistentDuoPresence } from "@/lib/types";

export interface MinigameHotspot {
  gameId: GameId;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Coordenadas percentuais medidas sobre lobby-background-minigames.jpg.
 * Como o fundo preserva a proporção 3:8, os hotspots continuam alinhados
 * independentemente da largura do celular.
 */
export const MINIGAME_HOTSPOTS: readonly MinigameHotspot[] = [
  { gameId: "puzzle", label: "Quebra-cabeça", left: 8.8, top: 20.1, width: 18.8, height: 8.2 },
  { gameId: "sudoku", label: "Sudoku", left: 29.7, top: 20.0, width: 16.8, height: 8.3 },
  { gameId: "memory", label: "Jogo da Memória", left: 48.6, top: 20.0, width: 19.2, height: 8.3 },
  { gameId: "colors", label: "Memória de Cores", left: 72.0, top: 20.9, width: 18.6, height: 8.3 },

  { gameId: "crossword", label: "Palavras Cruzadas", left: 7.2, top: 29.5, width: 20.2, height: 8.6 },
  { gameId: "wordsearch", label: "Caça-Palavras", left: 28.2, top: 29.5, width: 19.3, height: 8.6 },
  { gameId: "quiz", label: "Quiz", left: 48.5, top: 29.4, width: 21.2, height: 8.7 },
  { gameId: "rpg", label: "Mini RPG", left: 71.2, top: 30.4, width: 21.4, height: 9.1 },

  { gameId: "termo", label: "Termo", left: 2.0, top: 39.1, width: 19.8, height: 10.0 },
  { gameId: "airhockey", label: "Air Hockey", left: 22.2, top: 40.4, width: 47.2, height: 10.7 },

  { gameId: "drawguess", label: "Desenhe & Adivinhe", left: 2.6, top: 51.0, width: 26.0, height: 12.1 },
  { gameId: "whoami", label: "Quem Sou Eu?", left: 32.3, top: 53.4, width: 28.5, height: 10.3 },
  { gameId: "casino", label: "Cassino", left: 70.2, top: 54.6, width: 28.1, height: 10.8 },

  { gameId: "boardrace", label: "Trilha da Sorte", left: 19.3, top: 66.0, width: 46.0, height: 9.8 },
  { gameId: "chess", label: "Xadrez", left: 67.3, top: 66.2, width: 31.6, height: 9.7 },
] as const;

interface PersistentDuoMinigamesSceneProps {
  presence: Record<"andre" | "flavia", PersistentDuoPresence>;
  onSelectGame: (gameId: GameId) => void;
  onRandomGame: () => void;
  onShowClassic: () => void;
}

export default function PersistentDuoMinigamesScene({
  presence,
  onSelectGame,
  onRandomGame,
  onShowClassic,
}: PersistentDuoMinigamesSceneProps) {
  return (
    <section
      className="relative mx-auto w-full max-w-[768px] overflow-hidden bg-[#150c1b]"
      style={{ aspectRatio: "3 / 8" }}
      aria-label="Sala ilustrada de minijogos"
    >
      <Image
        src="/images/lobby-background-minigames.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 768px"
        className="pointer-events-none select-none object-cover"
        draggable={false}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-x-[4%] top-[13.5%] z-30">
        <PersistentDuoStatus presence={presence} variant="minigames" />
        <div className="mt-1.5 flex justify-center">
          <button
            type="button"
            onClick={onRandomGame}
            className="pointer-events-auto inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#ff8bbb]/55 bg-[#241128]/85 px-4 font-display text-[11px] font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,0.35),0_0_16px_rgba(255,83,153,0.24)] backdrop-blur-md transition-transform active:scale-95"
          >
            <Dices size={14} className="text-[#ff9fc5]" />
            Jogo Aleatório
          </button>
        </div>
      </div>

      {MINIGAME_HOTSPOTS.map((hotspot) => (
        <button
          key={hotspot.gameId}
          type="button"
          onClick={() => onSelectGame(hotspot.gameId)}
          aria-label={"Abrir " + hotspot.label}
          title={hotspot.label}
          className="absolute z-20 rounded-[18%] bg-transparent outline-none [-webkit-tap-highlight-color:transparent] active:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-[#ff91bd] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          style={{
            left: hotspot.left + "%",
            top: hotspot.top + "%",
            width: hotspot.width + "%",
            height: hotspot.height + "%",
          }}
        >
          <span className="sr-only">Abrir {hotspot.label}</span>
        </button>
      ))}

      <div className="absolute inset-x-0 bottom-[1.4%] z-30 flex justify-center px-4">
        <button
          type="button"
          onClick={onShowClassic}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#ff8bbb]/45 bg-[#201024]/82 px-5 font-display text-xs font-semibold text-white shadow-[0_8px_22px_rgba(0,0,0,0.4),0_0_16px_rgba(255,84,154,0.16)] backdrop-blur-md transition-transform active:scale-95"
        >
          <LayoutGrid size={15} className="text-[#ff9fc5]" />
          Ver lista de jogos
        </button>
      </div>
    </section>
  );
}
