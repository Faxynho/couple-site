"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Player } from "@/lib/types";
import Button from "./Button";

interface SidePanelProps {
  startedAt: number;
  solved: boolean;
  solvedAt: number | null;
  moves: number;
  players: Player[];
  onRestart: () => void;
  onNewImage: () => void;
  onBack: () => void;
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function SidePanel({
  startedAt,
  solved,
  solvedAt,
  moves,
  players,
  onRestart,
  onNewImage,
  onBack,
}: SidePanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (solved) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [solved]);

  const elapsed = (solved && solvedAt ? solvedAt : now) - startedAt;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel flex w-full flex-col gap-5 rounded-xl3 p-5 sm:w-64"
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-soft">Tempo</p>
        <p className="font-display text-2xl font-semibold text-ink">{formatTime(elapsed)}</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-ink-soft">Movimentos</p>
        <p className="font-display text-2xl font-semibold text-ink">{moves}</p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">Jogadores</p>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: p.connected ? p.color : "#D9D0D4" }}
              />
              {p.name}
              {!p.connected && <span className="text-xs text-ink-soft">(saiu)</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button variant="secondary" onClick={onRestart} className="w-full text-sm">
          Reiniciar
        </Button>
        <Button variant="secondary" onClick={onNewImage} className="w-full text-sm">
          Nova imagem
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full text-sm">
          Voltar
        </Button>
      </div>
    </motion.aside>
  );
}
