"use client";

import { Bot, CircleHelp, Crown, LockKeyhole, Shield, Sparkles, X } from "lucide-react";
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
        <strong>{isSelf ? "Você" : name}</strong>
        <span>{active ? "Jogando agora" : `Casa ${progress.position} de ${lastPosition}`}</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${Math.min(100, (progress.position / lastPosition) * 100)}%` }} />
        </div>
      </div>
      <div className={styles.statusStack}>
        {progress.skipNextTurn && <span className={styles.statusPill}><LockKeyhole size={10} /> preso</span>}
        {progress.pendingQuiz && <span className={styles.statusPill}><CircleHelp size={10} /> quiz</span>}
        {progress.shieldActive && <span className={styles.statusPill}><Shield size={10} /> escudo</span>}
        {progress.pendingRollPenalty > 0 && <span className={styles.statusPill}><Sparkles size={10} /> -{progress.pendingRollPenalty}</span>}
        {canKick && (
          <button type="button" className={styles.statusPill} onClick={() => onKick?.(playerId)} aria-label={`Remover ${name} da sala`} title="Remover da sala">
            <X size={10} /> remover
          </button>
        )}
      </div>
    </article>
  );
}
