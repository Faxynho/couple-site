"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RPGCombatant, RPGRoundEvent, RPG_CLASSES } from "@/lib/rpgTypes";

interface RPGCombatantPanelProps {
  combatant: RPGCombatant;
  name: string;
  color?: string;
  isSelf?: boolean;
  events: RPGRoundEvent[];
  eventsKey: number;
  showChosenBadge?: boolean;
}

function floatFor(
  event: RPGRoundEvent
): {
  text: string;
  tone: "damage" | "crit" | "heal" | "info";
} | null {
  switch (event.type) {
    case "attack":
      return event.isCrit
        ? {
            text: `CRÍTICO! -${event.amount}`,
            tone: "crit",
          }
        : {
            text: `-${event.amount}`,
            tone: "damage",
          };

    case "heal":
      return {
        text: `+${event.amount} ❤️`,
        tone: "heal",
      };

    case "evade":
      return {
        text: "ESQUIVOU!",
        tone: "info",
      };

    case "immuneBlock":
      return {
        text: "BLOQUEADO!",
        tone: "info",
      };

    case "stunSkip":
      return {
        text: "ATORDOADO!",
        tone: "info",
      };

    case "domination":
      return {
        text: "DOMINADO!",
        tone: "info",
      };

    case "buff":
      return {
        text: "PODER AUMENTADO!",
        tone: "heal",
      };

    default:
      return null;
  }
}

const TONE_CLASSES: Record<string, string> = {
  damage: "text-rose-deep",
  crit: "text-rose-deep",
  heal: "text-sage",
  info: "text-ink",
};

export default function RPGCombatantPanel({
  combatant,
  name,
  color,
  isSelf,
  events,
  eventsKey,
  showChosenBadge,
}: RPGCombatantPanelProps) {
  const classDef = RPG_CLASSES[combatant.classId];

  const hpPct = Math.max(
    0,
    Math.min(100, (combatant.hp / combatant.maxHp) * 100)
  );

  const barColor =
    hpPct > 50
      ? "bg-sage"
      : hpPct > 25
        ? "bg-amber-400"
        : "bg-rose-deep";

  const floats = events
    .map((e) => floatFor(e))
    .filter(
      (f): f is NonNullable<typeof f> => Boolean(f)
    );

  /*
   * Detecta o que aconteceu com ESTE combatente nesta rodada.
   *
   * A prioridade é:
   * dano > esquiva > cura > outros efeitos
   *
   * Isso evita que uma carta que ataque + cure
   * faça a barra tentar executar duas animações conflitantes.
   */
  const tookDamage = events.some(
    (event) =>
      event.type === "attack" &&
      typeof event.amount === "number" &&
      event.amount > 0
  );

  const wasCrit = events.some(
    (event) => event.type === "attack" && event.isCrit
  );

  const evaded = !tookDamage && events.some(
    (event) => event.type === "evade"
  );

  const wasBlocked = !tookDamage && events.some(
    (event) => event.type === "immuneBlock"
  );

  const wasHealed =
    !tookDamage &&
    !evaded &&
    !wasBlocked &&
    events.some((event) => event.type === "heal");

  const wasDominated = events.some(
    (event) => event.type === "domination"
  );

  const isDead = !combatant.alive;

  /*
   * Cada tipo de reação possui sua própria animação.
   */
  const reaction =
    tookDamage
      ? "damage"
      : evaded
        ? "evade"
        : wasBlocked
          ? "blocked"
          : wasHealed
            ? "heal"
            : wasDominated
              ? "dominated"
              : null;

  return (
    <motion.div
      className={`glass-panel relative flex w-full flex-col gap-1.5 overflow-hidden rounded-xl2 p-3 sm:p-3.5 ${
        isDead ? "grayscale" : ""
      }`}
      animate={{
        opacity: isDead ? 0.55 : 1,
        scale: isDead ? 0.985 : 1,
      }}
      transition={{
        duration: isDead ? 0.65 : 0.25,
        ease: "easeOut",
      }}
    >
      {/* =========================================================
          EFEITOS DE REAÇÃO DA BARRA
         ========================================================= */}

      <AnimatePresence mode="wait">
        {reaction === "damage" && !isDead && (
          <motion.div
            key={`damage-${eventsKey}`}
            className="pointer-events-none absolute inset-x-2 bottom-2 top-[4.2rem] z-0 rounded-xl"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [0, 0.45, 0.15, 0.4, 0],
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: wasCrit ? 0.65 : 0.45,
              ease: "easeOut",
            }}
            style={{
              background:
                "linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.45), rgba(239,68,68,0.15))",
            }}
          />
        )}

        {reaction === "evade" && (
          <motion.div
            key={`evade-${eventsKey}`}
            className="pointer-events-none absolute inset-x-2 bottom-2 top-[4.2rem] z-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.4, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.45,
              ease: "easeOut",
            }}
            style={{
              background:
                "linear-gradient(90deg, rgba(250,204,21,0.05), rgba(250,204,21,0.4), rgba(250,204,21,0.05))",
            }}
          />
        )}

        {reaction === "blocked" && (
          <motion.div
            key={`blocked-${eventsKey}`}
            className="pointer-events-none absolute inset-x-2 bottom-2 top-[4.2rem] z-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.35, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
            style={{
              background:
                "linear-gradient(90deg, rgba(56,189,248,0.05), rgba(56,189,248,0.4), rgba(56,189,248,0.05))",
            }}
          />
        )}

        {reaction === "heal" && (
          <motion.div
            key={`heal-${eventsKey}`}
            className="pointer-events-none absolute inset-x-2 bottom-2 top-[4.2rem] z-0 rounded-xl"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.3, 0.12, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.75,
              ease: "easeOut",
            }}
            style={{
              background:
                "linear-gradient(90deg, rgba(244,114,182,0.04), rgba(244,114,182,0.35), rgba(244,114,182,0.04))",
            }}
          />
        )}
      </AnimatePresence>

      {/* =========================================================
          NOME / CLASSE
         ========================================================= */}

      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-display text-sm font-semibold text-ink sm:text-base">
          <span className="text-lg leading-none">
            {classDef.emoji}
          </span>

          <span className="truncate">
            {isSelf ? "Você" : name}
          </span>

          {color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: color }}
            />
          )}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {combatant.stunnedRounds > 0 && (
            <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
              Atordoado
            </span>
          )}

          {combatant.immuneNextHit && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
              🛡️
            </span>
          )}

          {showChosenBadge && (
            <span className="rounded-full bg-sage/30 px-2 py-0.5 text-[10px] font-medium text-ink">
              ✓
            </span>
          )}
        </div>
      </div>

      <span className="relative z-10 text-[11px] text-ink-soft">
        {classDef.name}
      </span>

      {/* =========================================================
          BARRA DE VIDA
         ========================================================= */}

      <div className="relative z-10 flex items-center gap-2">
        <motion.div
          className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/60"
          /*
           * Tremidinha somente quando realmente recebeu dano.
           */
          animate={
            tookDamage
              ? {
                  x: [0, -2.5, 2.5, -1.5, 1.5, 0],
                }
              : {
                  x: 0,
                }
          }
          transition={{
            duration: wasCrit ? 0.6 : 0.4,
            ease: "easeOut",
          }}
        >
          {/* Barra de vida */}
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            animate={{
              width: `${hpPct}%`,
              boxShadow:
                reaction === "heal"
                  ? [
                      "0 0 0px rgba(244,114,182,0)",
                      "0 0 10px rgba(244,114,182,0.8)",
                      "0 0 0px rgba(244,114,182,0)",
                    ]
                  : reaction === "evade"
                    ? [
                        "0 0 0px rgba(250,204,21,0)",
                        "0 0 8px rgba(250,204,21,0.75)",
                        "0 0 0px rgba(250,204,21,0)",
                      ]
                    : reaction === "blocked"
                      ? [
                          "0 0 0px rgba(56,189,248,0)",
                          "0 0 8px rgba(56,189,248,0.75)",
                          "0 0 0px rgba(56,189,248,0)",
                        ]
                      : "0 0 0px rgba(0,0,0,0)",
            }}
            transition={{
              width: {
                duration: 0.8,
                ease: "easeOut",
              },
              boxShadow: {
                duration: 0.65,
                ease: "easeOut",
              },
            }}
          />

          {/* Piscada vermelha ao tomar dano */}
          <AnimatePresence>
            {tookDamage && (
              <motion.div
                key={`damage-bar-${eventsKey}`}
                className="pointer-events-none absolute inset-0 rounded-full bg-red-500"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: [0, 0.75, 0.25, 0.6, 0],
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: wasCrit ? 0.65 : 0.45,
                  ease: "easeOut",
                }}
              />
            )}
          </AnimatePresence>

          {/* Piscada amarela ao esquivar */}
          <AnimatePresence>
            {evaded && (
              <motion.div
                key={`evade-bar-${eventsKey}`}
                className="pointer-events-none absolute inset-0 rounded-full bg-yellow-300"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: [0, 0.75, 0],
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeOut",
                }}
              />
            )}
          </AnimatePresence>

          {/* Brilho azul ao bloquear */}
          <AnimatePresence>
            {wasBlocked && (
              <motion.div
                key={`blocked-bar-${eventsKey}`}
                className="pointer-events-none absolute inset-0 rounded-full bg-sky-300"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: [0, 0.65, 0],
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.45,
                  ease: "easeOut",
                }}
              />
            )}
          </AnimatePresence>

          {/* Piscada rosa ao curar */}
          <AnimatePresence>
            {wasHealed && (
              <motion.div
                key={`heal-bar-${eventsKey}`}
                className="pointer-events-none absolute inset-0 rounded-full bg-pink-300"
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: [0, 0.7, 0.2, 0],
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.7,
                  ease: "easeOut",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        <span className="whitespace-nowrap text-xs font-medium tabular-nums text-ink-soft">
          {Math.max(0, combatant.hp)}/{combatant.maxHp}
        </span>
      </div>

      {/* =========================================================
          TEXTO DE MORTE
         ========================================================= */}

      <AnimatePresence>
        {isDead && (
          <motion.div
            key={`death-${combatant.id}-${eventsKey}`}
            initial={{
              opacity: 0,
              y: 4,
              scale: 0.92,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              duration: 0.55,
              delay: 0.45,
              ease: "easeOut",
            }}
            className="relative z-10 mt-0.5 text-center font-display text-xs font-bold uppercase tracking-wide text-rose-deep sm:text-sm"
          >
            {isSelf ? "VOCÊ MORREU" : "SEU OPONENTE MORREU"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          NÚMEROS DE DANO / CURA / EFEITOS
         ========================================================= */}

      <AnimatePresence>
        {floats.map((f, i) => (
          <motion.span
            key={`${eventsKey}-${i}`}
            initial={{
              opacity: 0,
              y: 0,
              x: (i - (floats.length - 1) / 2) * 18,
              scale: 0.85,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: -46,
              scale: f.tone === "crit" ? [0.85, 1.15, 1] : 1,
            }}
            transition={{
              duration: f.tone === "crit" ? 1.8 : 1.6,
              delay: i * 0.18,
              ease: "easeOut",
            }}
            className={`pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 whitespace-nowrap font-display text-sm font-bold sm:text-base ${TONE_CLASSES[f.tone]}`}
          >
            {f.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}