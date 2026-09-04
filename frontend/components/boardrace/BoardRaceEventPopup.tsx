"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { CircleCheck, CircleX, Gift, Sparkles } from "lucide-react";
import { BOARD_RACE_POWER_INFO, BoardRaceState } from "@/lib/boardRaceTypes";
import styles from "./BoardRaceVisual.module.css";

type RaceEvent = BoardRaceState["eventLog"][number];

interface Props {
  event: RaceEvent;
  selfId: string;
  playerName: (playerId?: string) => string;
}

function eventCopy(event: RaceEvent, selfId: string, playerName: Props["playerName"]) {
  const subject = event.playerId === selfId ? "Você" : playerName(event.playerId);
  const amount = event.amount ?? 0;
  switch (event.kind) {
    case "landNormal": return { eyebrow: "Casa normal", title: `${subject} caiu em uma casa normal`, detail: "Caminho livre — nada muda nesta rodada." };
    case "advance": return { eyebrow: "Boa sorte!", title: `${subject} avançou ${amount} ${amount === 1 ? "casa" : "casas"}`, detail: "O bônus da casa já foi aplicado." };
    case "retreat": return { eyebrow: "Ops!", title: `${subject} recuou ${amount} ${amount === 1 ? "casa" : "casas"}`, detail: "A casa de destino não dispara outro efeito." };
    case "prison": return { eyebrow: "Casa prisão", title: `${subject} perdeu a próxima jogada`, detail: "A prisão não acumula com outra prisão." };
    case "quizPending": return { eyebrow: "Casa do Quiz", title: `${subject} recebeu um Quiz`, detail: "Na próxima vez, é preciso acertar para liberar o dado." };
    case "quizCorrect": return { eyebrow: "Resposta certa!", title: `${subject} acertou o Quiz`, detail: "O dado está liberado para continuar a rodada." };
    case "quizWrong": return { eyebrow: "Resposta incorreta", title: `${subject} errou o Quiz`, detail: "Essa oportunidade foi perdida e a vez passou." };
    case "minigameStart": return { eyebrow: "Casa Minijogo", title: `${subject} iniciou um desafio`, detail: "Os dois jogadores terão a mesma contagem para se preparar." };
    case "minigameWin": return { eyebrow: "Desafio vencido!", title: `${subject} ganhou um turno extra`, detail: "A recompensa será aplicada na próxima rodada." };
    case "minigameLoss": return { eyebrow: "Fim do desafio", title: `${subject} não ganhou o turno extra`, detail: "A corrida continua normalmente." };
    case "surprisePositive": return { eyebrow: "Surpresa boa!", title: `${subject} ganhou um benefício`, detail: event.message };
    case "surpriseNegative": return { eyebrow: "Surpresa ruim", title: `${subject} recebeu uma penalidade`, detail: event.message };
    case "extraTurn": return { eyebrow: "Turno extra!", title: `${subject} joga novamente`, detail: "A sorte resolveu dar mais uma chance." };
    case "powerUsed": return { eyebrow: "Poder ativado", title: `${subject} usou um poder`, detail: event.message };
    case "shieldBlocked": return { eyebrow: "Escudo ativado", title: `${subject} bloqueou a penalidade`, detail: "O escudo foi consumido e protegeu deste efeito negativo." };
    case "lostTurn": return { eyebrow: "Jogada perdida", title: `${subject} perdeu a vez`, detail: "A corrida segue com o próximo jogador." };
    case "finish": return { eyebrow: "Chegada!", title: `${subject} alcançou o fim da trilha`, detail: "A corrida terminou." };
    default: return { eyebrow: "Acontecimento da rodada", title: event.message, detail: "" };
  }
}

export default function BoardRaceEventPopup({ event, selfId, playerName }: Props) {
  const power = event.kind === "powerGranted" && event.powerId ? BOARD_RACE_POWER_INFO[event.powerId] : null;
  const copy = power
    ? {
        eyebrow: "Novo superpoder!",
        title: `${event.playerId === selfId ? "Você ganhou" : `${playerName(event.playerId)} ganhou`} ${power.name}`,
        detail: power.description,
      }
    : eventCopy(event, selfId, playerName);
  const Icon = power ? Gift : event.tone === "positive" ? CircleCheck : event.tone === "negative" ? CircleX : Sparkles;

  return (
    <motion.div
      className={`${styles.eventPopup} ${event.tone === "positive" ? styles.eventPopupPositive : event.tone === "negative" ? styles.eventPopupNegative : styles.eventPopupNeutral}`}
      initial={{ opacity: 0, scale: 0.78, y: 18 }}
      animate={event.tone === "negative" ? { opacity: 1, scale: 1, y: 0, x: [0, -5, 5, -3, 3, 0] } : { opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -12 }}
      transition={{ type: "spring", stiffness: 330, damping: 24 }}
      role="status"
      aria-live="polite"
    >
      {event.tone === "positive" && (
        <span className={styles.eventCelebration} aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => <i key={index} style={{ "--spark-index": index } as CSSProperties} />)}
        </span>
      )}
      <span className={styles.eventPopupIcon}>{power ? power.emoji : <Icon size={28} strokeWidth={2.25} />}</span>
      <div className={styles.eventPopupCopy}>
        <small>{copy.eyebrow}</small>
        <strong>{copy.title}</strong>
        {copy.detail && <span>{copy.detail}</span>}
        {power && <em>{power.category} · máximo de 2 poderes</em>}
      </div>
    </motion.div>
  );
}
