"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { Player } from "@/lib/types";

interface PlayerChipProps {
  player: Player;
  /** Só o host vê o botão de expulsar, e nunca em si mesmo. */
  isHost?: boolean;
  selfId?: string | null;
  onKick?: (playerId: string) => void;
  /** Conteúdo extra depois do nome (ex.: check de "terminou", pontuação). */
  children?: ReactNode;
  /** Ex.: "Você" no lugar do nome, usado por alguns jogos. */
  labelOverride?: string;
}

/**
 * Pill compacta com bolinha colorida + nome do jogador, reaproveitada em
 * todas as barras de jogo (Sudoku, Cores, Cruzadas, Caça-Palavras, Quiz) para
 * manter o "X" de expulsar sempre no mesmo lugar — ao lado do nome — em vez
 * de criar uma linha extra e poluir a tela do jogo.
 */
export default function PlayerChip({ player, isHost, selfId, onKick, children, labelOverride }: PlayerChipProps) {
  const canKick = Boolean(isHost && onKick && player.id !== selfId);

  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-surface/60 px-2.5 py-1 text-xs font-medium text-ink"
      style={{ opacity: player.connected ? 1 : 0.5 }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: player.color }} />
      {labelOverride ?? player.name}
      {children}
      {canKick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onKick!(player.id);
          }}
          aria-label={`Remover ${player.name} da sala`}
          title="Remover da sala"
          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-ink-soft/70 transition-colors hover:bg-rose/20 hover:text-rose-deep"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}
