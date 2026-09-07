"use client";

import { Bot, CircleHelp, Crown, LockKeyhole, Shield, Sparkles, X, Zap } from "lucide-react";
import AccountAvatar from "@/components/account/AccountAvatar";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import { BoardRacePlayerState } from "@/lib/boardRaceTypes";
import { Player } from "@/lib/types";
import styles from "./BoardRaceVisual.module.css";

interface Props {
  playerId: string;
  player?: Player;
  progress: BoardRacePlayerState;
  lastPosition: number;
  active: boolean;
  isSelf: boolean;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  visualIndex: number;
}

export default function BoardRaceHud({
  playerId,
  player,
  progress,
  lastPosition,
  active,
  isSelf,
  isHost,
  onKick,
  visualIndex,
}: Props) {
  const photos = useAccountPhotos();
  const name = playerId === "BOT" ? "BOT" : player?.name ?? playerId;
  const photo = player?.accountId ? photos[player.accountId] : undefined;
  const canKick = Boolean(isHost && onKick && playerId !== "BOT" && !isSelf);

  return (
    <article
      className={`${styles.playerCard} ${visualIndex % 2 ? styles.playerCardBlue : ""} ${active ? styles.playerCardActive : ""}`}
      style={{ opacity: player?.connected === false ? 0.62 : 1 }}
    >
      <div className={styles.avatarShell}>
        {active && <Crown className={styles.turnCrown} size={15} fill="currentColor" aria-hidden="true" />}
        {playerId === "BOT" ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-violet-600 text-white ring-2 ring-white/80"><Bot size={19} /></span>
        ) : (
          <AccountAvatar name={name} photo={photo} accountId={player?.accountId} fallbackColor={player?.color} size={36} className="ring-white/80" />
        )}
      </div>
      <div className={styles.playerMeta}>
        {active && <span className={styles.turnIndicator}><Sparkles size={10} aria-hidden="true" /> Sua vez</span>}
        <strong>{isSelf ? "Você" : name}</strong>
        <span>{active ? "Jogando agora" : `Casa ${progress.position} de ${lastPosition}`}</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${Math.min(100, (progress.position / lastPosition) * 100)}%` }} />
        </div>
      </div>
      <div className={styles.statusStack}>
        {progress.skipNextTurn && <span className={styles.statusPill} title="Perde a próxima jogada"><LockKeyhole size={10} /> Preso</span>}
        {progress.pendingQuiz && <span className={styles.statusPill} title="Precisa responder antes de jogar o dado"><CircleHelp size={10} /> Quiz</span>}
        {progress.shieldActive && <span className={styles.statusPill} title="Bloqueia o próximo efeito negativo"><Shield size={10} /> Escudo</span>}
        {progress.pendingRollPenalty > 0 && <span className={styles.statusPill} title={`Perde ${progress.pendingRollPenalty} no próximo movimento`}>🪤 Armadilha</span>}
        {progress.rollBonus > 0 && <span className={styles.statusPill} title={`Ganha +${progress.rollBonus} no próximo movimento`}><Zap size={10} /> Impulso</span>}
        {typeof progress.pendingSpaceIndex === "number" && <span className={styles.statusPill} title="Uma casa especial será resolvida antes do próximo dado"><Sparkles size={10} /> Evento</span>}
        {canKick && (
          <button type="button" className={styles.statusPill} onClick={() => onKick?.(playerId)} aria-label={`Remover ${name} da sala`} title="Remover da sala">
            <X size={10} /> remover
          </button>
        )}
      </div>
    </article>
  );
}
