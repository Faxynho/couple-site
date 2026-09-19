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
  { gameId: "puzzle", label: "Quebra-cabeça", left: 8.5, top: 18.8, width: 19.8, height: 9.4 },
  { gameId: "sudoku", label: "Sudoku", left: 29.2, top: 18.8, width: 17.8, height: 9.4 },
  { gameId: "memory", label: "Jogo da Memória", left: 48.0, top: 18.8, width: 20.4, height: 9.5 },
  { gameId: "colors", label: "Memória de Cores", left: 70.5, top: 18.8, width: 20.0, height: 9.5 },

  { gameId: "crossword", label: "Palavras Cruzadas", left: 6.5, top: 28.0, width: 21.5, height: 9.8 },
  { gameId: "wordsearch", label: "Caça-Palavras", left: 27.5, top: 28.0, width: 20.5, height: 9.8 },
  { gameId: "quiz", label: "Quiz", left: 47.5, top: 28.0, width: 22.5, height: 9.7 },
  { gameId: "rpg", label: "Mini RPG", left: 69.0, top: 28.0, width: 23.0, height: 10.4 },

  { gameId: "termo", label: "Termo", left: 1.0, top: 37.4, width: 21.5, height: 11.7 },
  { gameId: "airhockey", label: "Air Hockey", left: 21.0, top: 37.2, width: 49.5, height: 12.0 },

  { gameId: "drawguess", label: "Desenhe & Adivinhe", left: 1.5, top: 49.0, width: 28.0, height: 14.0 },
  { gameId: "whoami", label: "Quem Sou Eu?", left: 31.0, top: 50.7, width: 30.5, height: 11.8 },
  { gameId: "casino", label: "Cassino", left: 68.8, top: 52.0, width: 30.5, height: 12.5 },

  { gameId: "boardrace", label: "Trilha da Sorte", left: 17.2, top: 62.8, width: 48.5, height: 11.3 },
  { gameId: "chess", label: "Xadrez", left: 64.5, top: 63.0, width: 34.0, height: 11.0 },
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
