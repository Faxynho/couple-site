"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RPGClassId, RPG_CLASSES } from "@/lib/rpgTypes";

interface IntroCombatant {
  id: string;
  classId: RPGClassId;
  label: string;
  isSelf: boolean;
}

interface RPGClassIntroProps {
  combatants: IntroCombatant[]; // ordem: você primeiro, depois os demais
}

/** "🎲 Sorteando classes..." e depois revela, um de cada vez, quem é quem —
 *  puramente cosmético no cliente; o servidor decide sozinho quando sair da
 *  fase de introdução, então isso só precisa terminar antes disso. */
export default function RPGClassIntro({ combatants }: RPGClassIntroProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    const timers = combatants.map((_, i) => setTimeout(() => setStep(i + 1), 800 + i * 700));
    return () => timers.forEach(clearTimeout);
  }, [combatants]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-ink/75 px-6 text-center backdrop-blur-sm">
      <AnimatePresence>
        {step === 0 && (
          <motion.div
            key="rolling"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <motion.span
              animate={{ rotate: [0, 18, -18, 0] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              className="text-5xl"
            >
              🎲
            </motion.span>
            <p className="font-display text-lg font-semibold text-white">Sorteando classes...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {step > 0 && (
        <div className="flex flex-col items-center gap-5">
          {combatants.slice(0, step).map((c) => {
            const def = RPG_CLASSES[c.classId];
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.7, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="flex flex-col items-center gap-1"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                  {c.isSelf ? "Você é..." : `${c.label} é...`}
                </p>
                <p className="flex items-center gap-2 font-display text-2xl font-bold text-white sm:text-3xl">
                  <span>{def.emoji}</span> {def.name.toUpperCase()}!
                </p>
                <p className="max-w-xs text-xs text-white/70">{def.passiveDescription}</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
