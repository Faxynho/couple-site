"use client";

import { motion } from "framer-motion";
import { CircleCheck, CircleX, Gift, Sparkles } from "lucide-react";
import { BOARD_RACE_POWER_INFO, BoardRaceState, BoardSpaceType } from "@/lib/boardRaceTypes";
import styles from "./BoardRaceVisual.module.css";

type RaceEvent = BoardRaceState["eventLog"][number];

interface Props {
  event: RaceEvent;
  selfId: string;
  playerName: (playerId?: string) => string;
}

function eventTitle(event: RaceEvent, selfId: string, playerName: Props["playerName"]) {
  const subject = event.playerId === selfId ? "Você" : playerName(event.playerId);
  const amount = event.amount ?? 0;
  switch (event.kind) {
    case "landNormal": return `${subject} caiu em uma casa normal`;
    case "advance": return movementTitle(subject, "avançou", amount, event.destinationSpaceType);
    case "retreat": return movementTitle(subject, "recuou", amount, event.destinationSpaceType);
    case "prison": return `${subject} ficou preso`;
    case "quizPending": return `${subject} recebeu um quiz`;
    case "quizCorrect": return `${subject} acertou o quiz`;
    case "quizWrong": return `${subject} errou o quiz`;
    case "minigameStart": return `${subject} iniciou o minijogo`;
    case "minigameWin": return `${subject} venceu o minijogo`;
    case "minigameLoss": return `${subject} não venceu o minijogo`;
    case "surprisePositive": return `${subject} recebeu uma surpresa boa`;
    case "surpriseNegative": return `${subject} recebeu uma surpresa ruim`;
    case "extraTurn": return `${subject} ganhou turno extra`;
    case "powerUsed": {
      const target = event.targetPlayerId ? (event.targetPlayerId === selfId ? "você" : playerName(event.targetPlayerId)) : null;
      return event.powerId === "snare" && target ? `${subject} bloqueou ${target}` : `${subject} usou um poder`;
    }
    case "shieldBlocked": return `${subject} bloqueou o efeito`;
    case "lostTurn": return `${subject} perdeu a jogada`;
    case "finish": return `${subject} venceu a corrida`;
    default: return event.message;
  }
}

function destinationText(type?: BoardSpaceType) {
  switch (type) {
    case "quiz": return "recebeu um Quiz";
    case "minigame": return "caiu em uma casa de Minijogo";
    case "prison": return "caiu na Prisão";
    case "treasure": return "encontrou um Tesouro";
    case "surprise": return "caiu em uma Surpresa";
    case "advance": return "caiu em Avançar";
    case "retreat": return "caiu em Recuar";
    default: return null;
  }
}

function movementTitle(subject: string, verb: "avançou" | "recuou", amount: number, destination?: BoardSpaceType) {
  const movement = `${subject} ${verb} ${amount} ${amount === 1 ? "casa" : "casas"}`;
  const destinationLabel = destinationText(destination);
  return destinationLabel ? `${movement} e ${destinationLabel}` : movement;
}

export default function BoardRaceEventPopup({ event, selfId, playerName }: Props) {
  const power = event.kind === "powerGranted" && event.powerId ? BOARD_RACE_POWER_INFO[event.powerId] : null;
  const title = power
    ? `${event.playerId === selfId ? "Você" : playerName(event.playerId)} recebeu ${power.name}`
    : eventTitle(event, selfId, playerName);
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
      <span className={styles.eventPopupIcon}>{power ? power.emoji : <Icon size={28} strokeWidth={2.25} />}</span>
      <div className={styles.eventPopupCopy}>
        <strong>{title}</strong>
      </div>
    </motion.div>
  );
}
