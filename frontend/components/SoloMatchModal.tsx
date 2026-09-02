"use client";

import { motion } from "framer-motion";
import Button from "@/components/Button";
import { SoloMatchSave } from "@/lib/soloMatch";

interface SoloMatchModalProps {
  save: SoloMatchSave;
  busy?: boolean;
  error?: string | null;
  mode?: "resume" | "conflict";
  onContinue?: () => void;
  onReturnToMatch?: () => void;
  onCancel?: () => void;
  onStartNewMatch?: () => void;
}

export default function SoloMatchModal({ save, busy = false, error, mode = "resume", onContinue, onReturnToMatch, onCancel, onStartNewMatch }: SoloMatchModalProps) {
  const conflict = mode === "conflict";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/35 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="solo-match-title">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-md rounded-xl3 p-6 text-center shadow-soft sm:p-7"
      >
        <span className="text-4xl" aria-hidden="true">🎮</span>
        <h2 id="solo-match-title" className="mt-3 font-display text-xl font-semibold text-ink">
          {conflict
            ? `Você já tem uma partida de ${save.gameName} em andamento.`
            : `Você tem uma partida de ${save.gameName} Solo em andamento.`}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {conflict ? "Deseja voltar para ela ou iniciar este jogo?" : "Deseja continuar de onde parou?"}
        </p>
        {error && <p className="mt-4 rounded-xl2 bg-rose/10 px-3 py-2 text-sm text-rose-deep">{error}</p>}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {!conflict && onContinue && (
            <Button onClick={onContinue} disabled={busy} className="w-full">{busy ? "Restaurando..." : "Continuar"}</Button>
          )}
          {conflict && onReturnToMatch && (
            <Button onClick={onReturnToMatch} disabled={busy} variant="secondary" className="w-full">
              {busy ? "Restaurando..." : "Voltar para partida"}
            </Button>
          )}
          {conflict && onStartNewMatch && (
            <Button onClick={onStartNewMatch} disabled={busy} className="w-full">Iniciar este jogo</Button>
          )}
          {!conflict && onCancel && (
            <Button onClick={onCancel} disabled={busy} variant="secondary" className="w-full">
              Cancelar partida
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
