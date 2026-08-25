"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  RPGCombatant,
  RPGClassId,
  RPGRoundEvent,
  RPG_CLASSES,
} from "@/lib/rpgTypes";

interface RPGCombatantPanelProps {
  combatant: RPGCombatant;
  name: string;
  color?: string;
  isSelf?: boolean;
  events: RPGRoundEvent[];
  eventsKey: number;
  currentRound: number;
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
            text: `CRÍTICO! -${event.amount ?? 0}`,
            tone: "crit",
          }
        : {
            text: `-${event.amount ?? 0}`,
            tone: "damage",
          };

    case "heal":
      return {
        text: `+${event.amount ?? 0} ❤️`,
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

const TONE_CLASSES = {
  damage: "text-rose-600",
  crit: "text-red-600",
  heal: "text-emerald-600",
  info: "text-slate-700",
};

type StatusKind = "poison" | "bleed" | "curse";

const STATUS_VISUALS: Record<
  StatusKind,
  {
    label: string;
    emoji: string;
    text: string;
    bg: string;
    flash: string;
  }
> = {
  poison: {
    label: "Envenenamento",
    emoji: "☠️",
    text: "text-emerald-700",
    bg: "bg-emerald-600",
    flash: "bg-emerald-500",
  },
  bleed: {
    label: "Sangramento",
    emoji: "🩸",
    text: "text-red-700",
    bg: "bg-red-600",
    flash: "bg-red-700",
  },
  curse: {
    label: "Maldição",
    emoji: "🕯️",
    text: "text-slate-950",
    bg: "bg-slate-950",
    flash: "bg-slate-950",
  },
};

/* =========================================================
   FUNDO ESPECÍFICO DE CADA CLASSE
   ========================================================= */

function ClassBackground({
  classId,
  dead,
}: {
  classId: string;
  dead: boolean;
}) {
  /*
   * Guerreiro
   */
  if (
    classId === "warrior" ||
    classId === "guerreiro"
  ) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="
            absolute
            -right-2
            top-1/2
            -translate-y-1/2
            text-6xl
            opacity-[0.18]
            grayscale
          "
          animate={
            dead
              ? { rotate: -20, scale: 1.15 }
              : { rotate: [-3, 3, -3] }
          }
          transition={{
            duration: dead ? 0.45 : 4,
            repeat: dead ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          ⚔️
        </motion.div>

        <motion.div
          className="
            absolute
            right-16
            bottom-2
            text-4xl
            opacity-[0.10]
          "
          animate={{
            rotate: [-4, 4, -4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        >
          🛡️
        </motion.div>

        <div className="
          absolute
          inset-y-0
          right-0
          w-1/3
          bg-gradient-to-l
          from-slate-500/[0.14]
          to-transparent
        " />
      </div>
    );
  }

  /*
   * Arqueiro
   */
  if (
    classId === "archer" ||
    classId === "arqueiro"
  ) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="
            absolute
            -right-2
            top-1/2
            -translate-y-1/2
            text-6xl
            opacity-[0.14]
          "
          animate={
            dead
              ? {
                  x: 12,
                  rotate: -12,
                }
              : {
                  x: [-3, 3, -3],
                  rotate: [-2, 2, -2],
                }
          }
          transition={{
            duration: dead ? 0.45 : 3.5,
            repeat: dead ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          🏹
        </motion.div>

        <motion.div
          className="
            absolute
            right-20
            top-4
            text-2xl
            opacity-[0.14]
          "
          animate={{
            x: [-8, 15],
            opacity: [0.03, 0.07, 0.03],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ➶
        </motion.div>

        <motion.div
          className="
            absolute
            right-12
            bottom-4
            text-xl
            opacity-[0.18]
          "
          animate={{
            x: [0, 8, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
          }}
        >
          ➵
        </motion.div>

        <div className="
          absolute
          inset-y-0
          right-0
          w-2/5
          bg-gradient-to-l
          from-amber-500/[0.12]
          to-transparent
        " />
      </div>
    );
  }

  /*
   * Mago
   */
  if (
    classId === "mage" ||
    classId === "mago"
  ) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <motion.div
          className="
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            text-6xl
            opacity-[0.14]
          "
          animate={
            dead
              ? {
                  scale: 1.25,
                  rotate: 15,
                }
              : {
                  scale: [1, 1.08, 1],
                  rotate: [-3, 3, -3],
                }
          }
          transition={{
            duration: dead ? 0.5 : 3,
            repeat: dead ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          ✨
        </motion.div>

        <motion.div
          className="
            absolute
            right-20
            top-3
            text-lg
            opacity-[0.18]
          "
          animate={{
            y: [-4, 4, -4],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          ✦
        </motion.div>

        <motion.div
          className="
            absolute
            right-10
            bottom-3
            text-xl
            opacity-[0.16]
          "
          animate={{
            y: [3, -4, 3],
            x: [-3, 3, -3],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
          }}
        >
          ✧
        </motion.div>

        <motion.div
          className="
            absolute
            right-28
            bottom-8
            h-2
            w-2
            rounded-full
            bg-purple-400
            opacity-[0.15]
          "
          animate={{
            y: [-8, 8],
            opacity: [0.05, 0.2, 0.05],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />

        <div className="
          absolute
          inset-y-0
          right-0
          w-2/5
          bg-gradient-to-l
          from-purple-500/[0.14]
          to-transparent
        " />
      </div>
    );
  }

  /*
   * Ladrão / Assassino
   */
  if (
    classId === "rogue" ||
    classId === "assassin" ||
    classId === "ladrao" ||
    classId === "assassino"
  ) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="
            absolute
            right-2
            top-1/2
            -translate-y-1/2
            text-6xl
            opacity-[0.18]
          "
          animate={
            dead
              ? {
                  x: 8,
                  rotate: -15,
                }
              : {
                  x: [-2, 3, -2],
                  rotate: [-2, 2, -2],
                }
          }
          transition={{
            duration: dead ? 0.4 : 3,
            repeat: dead ? 0 : Infinity,
          }}
        >
          🗡️
        </motion.div>

        <div className="
          absolute
          inset-y-0
          right-0
          w-1/3
          bg-gradient-to-l
          from-slate-800/[0.12]
          to-transparent
        " />
      </div>
    );
  }

  /*
   * Fallback para qualquer classe futura
   */

  return (
    <div className="
      pointer-events-none
      absolute
      inset-0
      overflow-hidden
    ">
      <motion.div
        className="
          absolute
          -right-2
          top-1/2
          -translate-y-1/2
          text-6xl
          opacity-[0.10]
        "
        animate={{
          scale: [1, 1.06, 1],
          rotate: [-2, 2, -2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
        }}
      >
        {RPG_CLASSES[classId as RPGClassId]?.emoji ?? "⚔️"}
      </motion.div>
    </div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */

export default function RPGCombatantPanel({
  combatant,
  name,
  color,
  isSelf,
  events,
  eventsKey,
  currentRound,
  showChosenBadge,
}: RPGCombatantPanelProps) {
  const classDef = RPG_CLASSES[combatant.classId];

  const hpPct = Math.max(
    0,
    Math.min(
      100,
      (combatant.hp / combatant.maxHp) * 100
    )
  );

  const barColor =
    hpPct > 50
      ? "bg-emerald-400"
      : hpPct > 25
        ? "bg-amber-400"
        : "bg-red-500";

  /* =======================================================
     EVENTOS
     ======================================================= */

  const damageEvents = events.filter(
    (event) =>
      event.type === "attack" &&
      typeof event.amount === "number" &&
      event.amount > 0
  );

  const tookDamage =
    damageEvents.length > 0;

  const damageAmount =
    damageEvents.reduce(
      (total, event) =>
        total +
        (typeof event.amount === "number"
          ? event.amount
          : 0),
      0
    );

  const heavyDamage =
    tookDamage &&
    damageAmount >=
      combatant.maxHp * 0.25;

  const criticalDamage =
    damageEvents.some(
      (event) =>
        event.type === "attack" &&
        event.isCrit
    );

  const evaded =
    !tookDamage &&
    events.some(
      (event) =>
        event.type === "evade"
    );

  const blocked =
    !tookDamage &&
    events.some(
      (event) =>
        event.type === "immuneBlock"
    );

  const statusTickEvents = events.filter(
    (event) =>
      event.type === "statusTick" &&
      typeof event.amount === "number" &&
      event.amount > 0
  );

  const activeDefenseBuff =
    combatant.defenseBuffStartRound > 0 &&
    currentRound > combatant.defenseBuffStartRound &&
    currentRound <= combatant.defenseBuffUntilRound;

  const activeStatuses: {
    key: string;
    label: string;
    emoji: string;
    className: string;
  }[] = [];

  if (combatant.stunnedRounds > 0) {
    activeStatuses.push({
      key: "stunned",
      label: `Atordoado${combatant.stunnedRounds > 1 ? ` (${combatant.stunnedRounds})` : ""}`,
      emoji: "💫",
      className: "bg-slate-200/90 text-slate-700",
    });
  }

  if (combatant.immuneThisRound) {
    activeStatuses.push({
      key: "immune-round",
      label: "Imunidade total neste round",
      emoji: "🛡️",
      className: "bg-sky-100/95 text-sky-700",
    });
  }

  if (combatant.immuneNextHit) {
    activeStatuses.push({
      key: "immune-next",
      label: "Proteção no próximo golpe",
      emoji: "🛡️",
      className: "bg-cyan-100/95 text-cyan-700",
    });
  }

  if (combatant.permanentCritBonus > 0) {
    activeStatuses.push({
      key: "crit-supreme",
      label: "Crítico Supremo",
      emoji: "🎯",
      className: "bg-red-100/95 text-red-700",
    });
  }

  if (combatant.permanentEvadeBonus > 0) {
    activeStatuses.push({
      key: "evade-supreme",
      label: "Evasão Suprema",
      emoji: "👻",
      className: "bg-violet-100/95 text-violet-700",
    });
  }

  if (combatant.evadeBonusNextHit > 0) {
    activeStatuses.push({
      key: "evade-next",
      label: "Esquiva reforçada no próximo golpe",
      emoji: "💨",
      className: "bg-blue-100/95 text-blue-700",
    });
  }

  if (combatant.luckBonus > 0) {
    activeStatuses.push({
      key: "luck",
      label: "Sorte ativa",
      emoji: "🍀",
      className: "bg-emerald-100/95 text-emerald-700",
    });
  }

  if (combatant.poisonRoundsRemaining > 0) {
    activeStatuses.push({
      key: "poison",
      label: `Envenenado (${combatant.poisonRoundsRemaining})`,
      emoji: "☠️",
      className: "bg-emerald-100/95 text-emerald-700",
    });
  }

  if (combatant.bleedRoundsRemaining > 0) {
    activeStatuses.push({
      key: "bleed",
      label: `Sangrando (${combatant.bleedRoundsRemaining})`,
      emoji: "🩸",
      className: "bg-red-100/95 text-red-700",
    });
  }

  if (combatant.curseRoundsRemaining > 0) {
    activeStatuses.push({
      key: "curse",
      label: `Amaldiçoado (${combatant.curseRoundsRemaining})`,
      emoji: "🕯️",
      className: "bg-slate-200/95 text-slate-900",
    });
  }

  if (activeDefenseBuff) {
    const roundsLeft = Math.max(0, combatant.defenseBuffUntilRound - currentRound + 1);
    activeStatuses.push({
      key: "divine-shield",
      label: `Escudo Divino (${roundsLeft})`,
      emoji: "🛡️✨",
      className: "bg-amber-100/95 text-amber-700",
    });
  }

  const healed =
    !tookDamage &&
    !evaded &&
    !blocked &&
    events.some(
      (event) =>
        event.type === "heal"
    );

  const fullHealUsed = events.some(
    (event) =>
      event.type === "heal" &&
      event.cardId === "unique_full_heal"
  );

  const statusDamage = statusTickEvents.reduce(
    (total, event) => total + (event.amount ?? 0),
    0
  );

  const totalHealing = events.reduce(
    (total, event) =>
      event.type === "heal" ? total + (event.amount ?? 0) : total,
    0
  );

  const netDamageThisRound = Math.max(
    0,
    damageAmount + statusDamage - totalHealing
  );

  const visualStartHp = Math.min(
    combatant.maxHp,
    Math.max(0, combatant.hp + netDamageThisRound)
  );

  const visualHpAfterNormalDamage = Math.min(
    combatant.maxHp,
    Math.max(0, visualStartHp - damageAmount)
  );

  const statusDamageHpKeyframes =
    statusDamage > 0
      ? [
          visualStartHp / combatant.maxHp,
          visualHpAfterNormalDamage / combatant.maxHp,
          hpPct / 100,
        ]
      : [hpPct / 100];

  const criticalHp = hpPct <= 15 && combatant.alive;

  const dead =
    !combatant.alive;

  const floats = events
    .map(floatFor)
    .filter(
      (
        value
      ): value is NonNullable<
        ReturnType<typeof floatFor>
      > => Boolean(value)
    );

  return (
    <motion.div
      className="
        relative
        w-full
        overflow-hidden
        rounded-2xl

        border
        border-white/80

        bg-white/70

        px-4
        py-3

        shadow-[0_8px_28px_rgba(31,41,55,0.09)]

        backdrop-blur-md

        sm:px-5
        sm:py-3.5
      "

      /*
       * IMPACTO DO PAINEL
       */

      animate={
        dead
          ? {
              x: [
                0,
                -10,
                10,
                -8,
                8,
                -5,
                5,
                0,
              ],
              y: [
                0,
                2,
                -2,
                3,
                -3,
                1,
                0,
              ],
              rotate: [
                0,
                -1.2,
                1.2,
                -0.8,
                0.8,
                0,
              ],
              scale: [
                1,
                1.045,
                0.98,
                1.015,
                0.97,
                0.95,
              ],
              opacity: [
                1,
                1,
                0.9,
                0.72,
                0.55,
              ],
            }

          : criticalHp
            ? {
                scale: [1, 1.018, 0.992, 1.018, 1],
                boxShadow: [
                  "0 8px 28px rgba(31,41,55,0.09)",
                  "0 0 0 3px rgba(239,68,68,0.26), 0 0 28px rgba(239,68,68,0.28)",
                  "0 8px 28px rgba(31,41,55,0.09)",
                  "0 0 0 3px rgba(239,68,68,0.2), 0 0 24px rgba(239,68,68,0.22)",
                  "0 8px 28px rgba(31,41,55,0.09)",
                ],
              }

          : tookDamage
            ? {
                x: heavyDamage
                  ? [
                      0,
                      -7,
                      7,
                      -6,
                      6,
                      -4,
                      4,
                      0,
                    ]
                  : [
                      0,
                      -3,
                      3,
                      -2,
                      2,
                      0,
                    ],

                scale: heavyDamage
                  ? [
                      1,
                      1.025,
                      0.992,
                      1,
                    ]
                  : [
                      1,
                      1.008,
                      1,
                    ],
              }

            : {
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
                opacity: 1,
              }
      }

      transition={{
        duration: dead
          ? 0.85
          : criticalHp
            ? 1.2
            : heavyDamage
              ? 0.6
              : criticalDamage
                ? 0.55
                : 0.38,
        repeat: criticalHp ? Infinity : 0,
        repeatType: criticalHp ? "mirror" : "loop",

        ease: "easeOut",
      }}
    >

      <AnimatePresence>
        {criticalHp && (
          <motion.div
            key={`critical-hp-${eventsKey}-${combatant.hp}`}
            className="pointer-events-none absolute inset-0 z-[28] rounded-2xl border-2 border-red-500/55 bg-red-500/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.08, 0.4, 0.12, 0.3, 0.08] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* ===================================================
         FUNDO DA CLASSE
         =================================================== */}

      <ClassBackground
        classId={combatant.classId}
        dead={dead}
      />

      {/* ===================================================
         BORDA INTERNA
         =================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-[1px]
          rounded-[15px]
          border
          border-white/40
        "
      />

      {/* ===================================================
         LINHA DE COR DO PLAYER
         =================================================== */}

      <motion.div
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          h-full
          w-[3px]
          rounded-r-full
        "
        style={{
          background:
            color ??
            "rgba(110,180,130,0.8)",
        }}
        animate={
          dead
            ? {
                opacity: [
                  1,
                  0.2,
                  0,
                ],
              }
            : tookDamage
              ? {
                  opacity:
                    heavyDamage
                      ? [1, 0.2, 1]
                      : [1, 0.55, 1],
                }
              : {
                  opacity: 1,
                }
        }
        transition={{
          duration: dead
            ? 0.7
            : heavyDamage
              ? 0.45
              : 0.35,
        }}
      />

      {/* ===================================================
         BRILHOS
         =================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          -right-12
          -top-12
          h-28
          w-28
          rounded-full
          bg-emerald-200/20
          blur-2xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -bottom-14
          left-1/4
          h-24
          w-24
          rounded-full
          bg-sky-200/15
          blur-2xl
        "
      />

      {/* ===================================================
         FLASH DE DANO
         =================================================== */}

      <AnimatePresence>
        {tookDamage && (
          <motion.div
            key={`panel-damage-${eventsKey}`}
            className="
              pointer-events-none
              absolute
              inset-0
              z-30
              rounded-2xl
              bg-red-500
            "
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: heavyDamage
                ? [
                    0,
                    0.34,
                    0.05,
                    0.25,
                    0,
                  ]
                : [
                    0,
                    0.18,
                    0.03,
                    0.12,
                    0,
                  ],
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: heavyDamage
                ? 0.65
                : 0.4,
            }}
          />
        )}
      </AnimatePresence>

      {/* ===================================================
         MORTE — FLASH ESCURO
         =================================================== */}

      <AnimatePresence>
        {dead && (
          <motion.div
            key={`death-overlay-${eventsKey}`}
            className="
              pointer-events-none
              absolute
              inset-0
              z-35
              rounded-2xl
              bg-slate-950
            "
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [
                0,
                0.08,
                0.42,
                0.28,
                0.55,
              ],
            }}
            transition={{
              duration: 0.9,
              ease: "easeOut",
            }}
          />
        )}
      </AnimatePresence>

      {/* ===================================================
         FLASH ESQUIVA
         =================================================== */}

      <AnimatePresence>
        {evaded && (
          <motion.div
            key={`evade-${eventsKey}`}
            className="
              pointer-events-none
              absolute
              inset-0
              z-30
              rounded-2xl
              bg-yellow-300
            "
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [
                0,
                0.22,
                0,
              ],
            }}
            transition={{
              duration: 0.4,
            }}
          />
        )}
      </AnimatePresence>

      {/* ===================================================
         FLASH CURA
         =================================================== */}

      <AnimatePresence>
        {healed && (
          <motion.div
            key={`heal-${eventsKey}`}
            className="
              pointer-events-none
              absolute
              inset-0
              z-30
              rounded-2xl
              bg-pink-300
            "
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: [
                0,
                0.2,
                0.05,
                0,
              ],
            }}
            transition={{
              duration: 0.7,
            }}
          />
        )}
      </AnimatePresence>

      {/* ===================================================
         CONTEÚDO
         =================================================== */}

      <div
        className="
          relative
          z-10
          flex
          w-full
          flex-col
          gap-2.5
        "
      >

        {/* =================================================
           IDENTIDADE

           Você 🧙 Mago
           ================================================= */}

        <div
          className="
            flex
            items-center
            justify-center
            gap-2
          "
        >

          <span
            className="
              font-display
              text-sm
              font-bold
              text-ink
              sm:text-base
            "
          >
            {isSelf
              ? "Você"
              : name}
          </span>

          <motion.span
            className="
              text-xl
              leading-none
              drop-shadow-sm
              sm:text-2xl
            "
            animate={
              dead
                ? {
                    scale: [
                      1,
                      1.35,
                      0.85,
                      0.6,
                    ],
                    opacity: [
                      1,
                      1,
                      0.5,
                      0,
                    ],
                    rotate: [
                      0,
                      -8,
                      8,
                      0,
                    ],
                  }
                : tookDamage
                  ? {
                      scale:
                        heavyDamage
                          ? [
                              1,
                              1.2,
                              0.92,
                              1,
                            ]
                          : [
                              1,
                              1.1,
                              0.96,
                              1,
                            ],
                      rotate:
                        heavyDamage
                          ? [
                              0,
                              -7,
                              7,
                              -3,
                              3,
                              0,
                            ]
                          : [
                              0,
                              -3,
                              3,
                              0,
                            ],
                    }
                  : {
                      scale: 1,
                      rotate: 0,
                      opacity: 1,
                    }
            }
            transition={{
              duration: dead
                ? 0.75
                : heavyDamage
                  ? 0.55
                  : 0.4,
            }}
          >
            {classDef.emoji}
          </motion.span>

          <span
            className="
              rounded-full
              border
              border-white/80
              bg-white/55
              px-2.5
              py-1

              text-[10px]
              font-bold
              text-ink-soft

              shadow-sm

              sm:px-3
              sm:text-xs
            "
          >
            {classDef.name}
          </span>

          {color && (
            <span
              className="
                h-2
                w-2
                rounded-full
              "
              style={{
                background: color,
              }}
            />
          )}

        </div>

        {/* =================================================
           STATUS
           ================================================= */}
        {(activeStatuses.length > 0 || showChosenBadge) && (
          <div
            className="
              flex
              min-h-[18px]
              flex-wrap
              items-center
              justify-center
              gap-1.5
            "
          >
            {activeStatuses.map((status) => (
              <span
                key={status.key}
                title={status.label}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-md ${status.className}`}
              >
                {status.emoji} {status.label}
              </span>
            ))}

            {showChosenBadge && (
              <span
                className="
                  rounded-full
                  bg-emerald-100/80
                  px-2
                  py-0.5
                  text-[9px]
                  font-bold
                  text-emerald-700
                "
              >
                ✓ ESCOLHIDO
              </span>
            )}
          </div>
        )}

        {/* =================================================
           VIDA
           ================================================= */}

        <div
          className="
            relative
            rounded-xl
            border
            border-white/80
            bg-white/45
            px-2.5
            py-2
            shadow-inner
          "
        >

          <div
            className="
              mb-1.5
              flex
              items-center
              justify-between
            "
          >
            <span
              className="
                flex
                items-center
                gap-1
                text-[9px]
                font-extrabold
                uppercase
                tracking-[0.12em]
                text-ink-soft
              "
            >
              <span className="text-xs">
                ♥
              </span>
              VIDA
            </span>

            <span
              className="
                text-[10px]
                font-bold
                tabular-nums
                text-ink
              "
            >
              {Math.max(
                0,
                combatant.hp
              )}
              {" / "}
              {combatant.maxHp}
            </span>
          </div>

          {/* =================================================
             BARRA
             ================================================= */}

          <motion.div
            className="
              relative
              h-[16px]
              w-full
              overflow-hidden
              rounded-full
              border
              border-white/90
              bg-slate-200/55
              shadow-inner
              sm:h-[18px]
            "
            animate={
              dead
                ? {
                    scaleY: [
                      1,
                      1.25,
                      0.9,
                      0.75,
                    ],
                    x: [
                      0,
                      -5,
                      5,
                      -3,
                      0,
                    ],
                  }
                : tookDamage
                  ? {
                      x: heavyDamage
                        ? [
                            0,
                            -4,
                            4,
                            -3,
                            3,
                            -2,
                            2,
                            0,
                          ]
                        : [
                            0,
                            -2,
                            2,
                            -1,
                            1,
                            0,
                          ],
                      scaleX:
                        heavyDamage
                          ? [
                              1,
                              1.035,
                              0.985,
                              1,
                            ]
                          : [
                              1,
                              1.015,
                              1,
                            ],
                    }
                  : healed
                    ? {
                        scaleY: [
                          1,
                          1.12,
                          1,
                        ],
                      }
                    : {
                        x: 0,
                        scaleX: 1,
                        scaleY: 1,
                      }
            }
            transition={{
              duration: dead
                ? 0.8
                : heavyDamage
                  ? 0.58
                  : healed
                    ? 0.65
                    : 0.38,
            }}
          >

          <motion.div
            className={`
              absolute
              inset-y-0
              left-0
              w-full
              rounded-full
              ${barColor}
            `}
            initial={false}
            animate={{
              scaleX:
                statusDamage > 0
                  ? statusDamageHpKeyframes
                  : hpPct / 100,
              opacity: dead ? 0.15 : 1,
            }}
            style={{
              transformOrigin: "left center",
            }}
            transition={{
              scaleX: {
                duration: statusDamage > 0 ? 0.92 : 1.0,
                times: statusDamage > 0 ? [0, 0.47, 1] : undefined,
                ease: [0.22, 1, 0.36, 1],
              },
              opacity: {
                duration: 0.8,
                ease: "easeOut",
              },
            }}
          />

            <div
              className="
                pointer-events-none
                absolute
                inset-x-0
                top-0
                h-1/2
                rounded-full
                bg-white/30
              "
            />

            {/* =================================================
               FLASH DANO
               ================================================= */}

            <AnimatePresence>
              {tookDamage && (
                <motion.div
                  key={`bar-damage-${eventsKey}`}
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    rounded-full
                    bg-red-500
                  "
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: heavyDamage
                      ? [
                          0,
                          1,
                          0.15,
                          0.85,
                          0,
                        ]
                      : [
                          0,
                          0.8,
                          0.12,
                          0.6,
                          0,
                        ],
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  transition={{
                    duration:
                      heavyDamage
                        ? 0.7
                        : criticalDamage
                          ? 0.55
                          : 0.45,
                  }}
                />
              )}
            </AnimatePresence>

            {/* =================================================
               MORTE NA BARRA
               ================================================= */}

            <AnimatePresence>
              {dead && (
                <motion.div
                  key={`dead-bar-${eventsKey}`}
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    z-20
                    flex
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                  "
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                >
                  <div className="
                    absolute
                    inset-0
                    bg-slate-950/55
                  " />

                  <motion.span
                    initial={{
                      opacity: 0,
                      scale: 0.2,
                      rotate: -25,
                    }}
                    animate={{
                      opacity: [
                        0,
                        1,
                        1,
                      ],
                      scale: [
                        0.2,
                        1.45,
                        1.05,
                      ],
                      rotate: [
                        -25,
                        8,
                        0,
                      ],
                    }}
                    transition={{
                      duration: 0.75,
                      ease: "easeOut",
                    }}
                    className="
                      relative
                      z-10
                      text-3xl
                      leading-none
                      drop-shadow-[0_2px_5px_rgba(0,0,0,0.4)]
                    "
                  >
                    💀
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =================================================
               ESQUIVA
               ================================================= */}

            <AnimatePresence>
              {evaded && (
                <motion.div
                  key={`bar-evade-${eventsKey}`}
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    rounded-full
                    bg-yellow-300
                  "
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: [
                      0,
                      0.85,
                      0,
                    ],
                  }}
                  transition={{
                    duration: 0.42,
                  }}
                />
              )}
            </AnimatePresence>

            {/* =================================================
               CURA
               ================================================= */}

            <AnimatePresence>
              {healed && (
                <motion.div
                  key={`bar-heal-${eventsKey}`}
                  className="
                    pointer-events-none
                    absolute
                    inset-0
                    rounded-full
                    bg-pink-300
                  "
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: [
                      0,
                      0.75,
                      0.18,
                      0,
                    ],
                  }}
                  transition={{
                    duration: 0.75,
                  }}
                />
              )}
            </AnimatePresence>

          </motion.div>
        </div>
      </div>

      {/* =====================================================
         RECUPERAÇÃO TOTAL — VÁRIOS CORAÇÕES
         ===================================================== */}

      <AnimatePresence>
        {fullHealUsed && (
          <motion.div
            key={`full-heal-hearts-${eventsKey}`}
            className="pointer-events-none absolute inset-0 z-[58] overflow-hidden rounded-2xl"
          >
            {Array.from({ length: 12 }, (_, index) => {
              const x = ((index * 29) % 86) + 7;
              const y = 76 - ((index * 11) % 22);
              const scale = 0.75 + (index % 4) * 0.12;
              return (
                <motion.span
                  key={index}
                  className="absolute text-2xl leading-none drop-shadow-[0_4px_10px_rgba(190,24,93,0.35)] sm:text-3xl"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  initial={{ opacity: 0, scale: 0.2, y: 8, rotate: -15 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0.2, scale * 1.22, scale, scale * 0.9],
                    y: [-2, -18 - (index % 4) * 4, -42 - (index % 5) * 6, -58 - (index % 3) * 8],
                    x: [index % 2 ? -4 : 4, (index % 3 - 1) * 12, index % 2 ? 8 : -8, 0],
                    rotate: [-15, 8, -5, 0],
                  }}
                  transition={{
                    delay: index * 0.045,
                    duration: 1.15 + (index % 3) * 0.08,
                    ease: "easeOut",
                  }}
                >
                  ❤️
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
         DANO DE EFEITOS — TOCA DEPOIS DO DANO NORMAL
         ===================================================== */}

      <AnimatePresence>
        {statusTickEvents.map((event, index) => {
          const status: StatusKind =
            event.status ??
            (event.cardId === "bleeding" ? "bleed" : event.cardId === "curse" ? "curse" : "poison");
          const visual = STATUS_VISUALS[status];

          return (
            <motion.div
              key={`status-tick-${eventsKey}-${index}-${status}`}
              className="
                pointer-events-none
                absolute
                inset-0
                z-[55]
                flex
                items-center
                justify-center
                overflow-hidden
                rounded-2xl
              "
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.42, 0.16, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                delay: 0.42 + index * 0.22,
                duration: 0.55,
                ease: "easeOut",
              }}
            >
              <motion.div
                className={`absolute inset-0 ${visual.flash}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.92, 0.25, 0.55, 0] }}
                transition={{
                  delay: 0.42 + index * 0.22,
                  duration: 0.5,
                  ease: "easeOut",
                }}
              />

              <motion.span
                className="relative z-10 text-7xl leading-none drop-shadow-[0_0_18px_rgba(255,255,255,0.95)] drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)] sm:text-8xl"
                initial={{ opacity: 0, scale: 0.25, y: 10, rotate: -10 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.25, 1.25, 0.95, 1],
                  y: [10, -5, -18, -34],
                  rotate: [-10, 6, -3, 0],
                }}
                transition={{
                  delay: 0.42 + index * 0.22,
                  duration: 0.9,
                  ease: "easeOut",
                }}
              >
                {visual.emoji}
              </motion.span>

              <motion.span
                className={`absolute bottom-5 z-10 rounded-full bg-white/90 px-3 py-1 font-display text-base font-extrabold shadow-lg ${visual.text}`}
                initial={{ opacity: 0, y: 10, scale: 0.75 }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, 0, -10, -24], scale: [0.75, 1, 1, 1.05] }}
                transition={{
                  delay: 0.44 + index * 0.22,
                  duration: 0.9,
                  ease: "easeOut",
                }}
              >
                -{event.amount ?? 0} {visual.label}
              </motion.span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* =====================================================
         MORTE — CAVEIRA GRANDE
         ===================================================== */}

      <AnimatePresence>
        {dead && (
          <motion.div
            key={`death-skull-${eventsKey}`}
            className="
              pointer-events-none
              absolute
              inset-0
              z-50
              flex
              items-center
              justify-center
            "
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <motion.div
              className="
                absolute
                h-24
                w-24
                rounded-full
                bg-black/10
                blur-xl
              "
              initial={{
                scale: 0,
                opacity: 0,
              }}
              animate={{
                scale: [
                  0,
                  1.5,
                  1,
                ],
                opacity: [
                  0,
                  0.8,
                  0.3,
                ],
              }}
              transition={{
                duration: 0.8,
              }}
            />

            <motion.span
              className="
                relative
                text-7xl
                leading-none

                drop-shadow-[0_5px_10px_rgba(0,0,0,0.3)]

                sm:text-8xl
              "
              initial={{
                opacity: 0,
                scale: 0.15,
                rotate: -30,
                y: 15,
              }}
              animate={{
                opacity: [
                  0,
                  1,
                  1,
                  0.85,
                ],
                scale: [
                  0.15,
                  1.35,
                  0.95,
                  1,
                ],
                rotate: [
                  -30,
                  8,
                  -3,
                  0,
                ],
                y: [
                  15,
                  -4,
                  0,
                  0,
                ],
              }}
              transition={{
                duration: 1.15,
                ease: "easeOut",
              }}
            >
              💀
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
         MENSAGEM DE MORTE
         ===================================================== */}

      <AnimatePresence>
        {dead && (
          <motion.div
            key={`death-text-${eventsKey}`}
            initial={{
              opacity: 0,
              y: 10,
              scale: 0.7,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 0.55,
              duration: 0.5,
              type: "spring",
              stiffness: 220,
              damping: 15,
            }}
            className="
              relative
              z-[60]
              mt-1
              self-center

              rounded-full
              border
              border-red-200
              bg-red-50/90

              px-4
              py-1.5

              font-display
              text-[10px]
              font-extrabold
              uppercase
              tracking-[0.12em]

              text-red-600

              shadow-sm
            "
          >
            {isSelf
              ? "Você morreu"
              : "Seu oponente morreu"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
         NÚMEROS FLUTUANTES
         ===================================================== */}

      <AnimatePresence>
        {floats.map(
          (float, index) => (
            <motion.span
              key={`${eventsKey}-${index}`}
              initial={{
                opacity: 0,
                y: 4,
                x:
                  (index -
                    (floats.length - 1) /
                      2) *
                  20,
                scale: 0.75,
              }}
              animate={{
                opacity: [
                  0,
                  1,
                  1,
                  0,
                ],
                y: -48,

                scale:
                  float.tone === "crit"
                    ? [
                        0.75,
                        1.25,
                        1,
                      ]
                    : 1,
              }}
              transition={{
                duration:
                  float.tone === "crit"
                    ? 1.8
                    : 1.5,

                delay:
                  index * 0.12,

                ease: "easeOut",
              }}
              className={`
                pointer-events-none
                absolute
                left-1/2
                top-1/2
                z-[70]

                -translate-x-1/2

                whitespace-nowrap

                font-display
                text-sm
                font-extrabold

                drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)]

                sm:text-base

                ${TONE_CLASSES[float.tone]}
              `}
            >
              {float.text}
            </motion.span>
          )
        )}
      </AnimatePresence>
    </motion.div>
  );
}