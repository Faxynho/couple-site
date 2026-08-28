"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";
import { Player } from "@/lib/types";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import AccountAvatar from "@/components/account/AccountAvatar";

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
 * Pill compacta com avatar + nome do jogador, reaproveitada em todas as
 * barras de jogo (Sudoku, Cores, Cruzadas, Caça-Palavras, Quiz) para manter o
 * "X" de expulsar sempre no mesmo lugar — ao lado do nome — em vez de criar
 * uma linha extra e poluir a tela do jogo. Mostra a foto de perfil de quem
 * tem uma conta fixa com foto salva; senão cai na bolinha com a inicial.
 */
export default function PlayerChip({ player, isHost, selfId, onKick, children, labelOverride }: PlayerChipProps) {
  const canKick = Boolean(isHost && onKick && player.id !== selfId);
  const photos = useAccountPhotos();
  const photo = player.accountId ? photos[player.accountId] : undefined;

  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-surface/60 py-1 pl-1 pr-2.5 text-xs font-medium text-ink"
      style={{ opacity: player.connected ? 1 : 0.5 }}
    >
      <AccountAvatar name={player.name} photo={photo} accountId={player.accountId} fallbackColor={player.color} size={18} />
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
