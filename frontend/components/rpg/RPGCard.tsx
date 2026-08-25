"use client";

import { motion, Transition } from "framer-motion";
import {
  RPGCard as RPGCardData,
  RPG_RARITY_STYLES,
  RPGRarity,
} from "@/lib/rpgTypes";

interface RPGCardProps {
  card: RPGCardData;
  delay?: number;
  selected?: boolean;
  faded?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/* =========================================================
   ANIMAÇÕES DE ENTRADA
   ========================================================= */

const ENTRANCE_VARIANTS: Record<
  string,
  {
    initial: Record<string, number>;
    animate: Record<string, number>;
    transition: Transition;
  }
> = {
  common: {
    initial: {
      opacity: 0,
      y: 18,
      scale: 0.96,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
    },
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },

  rare: {
    initial: {
      opacity: 0,
      y: 22,
      rotate: -5,
      scale: 0.94,
    },
    animate: {
      opacity: 1,
      y: 0,
      rotate: 0,
      scale: 1,
    },
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },

  epic: {
    initial: {
      opacity: 0,
      scale: 0.72,
      rotate: 8,
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
    },
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 16,
    },
  },

  legendary: {
    initial: {
      opacity: 0,
      scale: 0.25,
      rotate: -18,
      y: 10,
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      y: 0,
    },
    transition: {
      type: "spring",
      stiffness: 240,
      damping: 12,
      mass: 0.8,
    },
  },

  unique: {
    initial: {
      opacity: 0,
      scale: 0.05,
      rotate: 28,
      y: 20,
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      y: 0,
    },
    transition: {
      type: "spring",
      stiffness: 190,
      damping: 10,
      mass: 0.7,
    },
  },
};

/* =========================================================
   VISUAL DE CADA RARIDADE

   Aqui está o que realmente muda o interior das cartas.
   Não depende de Tailwind para funcionar.
   ========================================================= */

const RARITY_VISUALS: Record<
  RPGRarity,
  {
    background: string;
    glow: string;
    topGlow: string;
    bottomGlow: string;
    line: string;
    orb: string;
    corner: string;
    sparkle: string;
  }
> = {
  common: {
    background:
      "linear-gradient(145deg, #f5fbf5 0%, #e6f4e8 48%, #d7ecdc 100%)",

    glow:
      "radial-gradient(circle at 50% 8%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.30) 34%, transparent 70%)",

    topGlow:
      "radial-gradient(circle, rgba(120,190,135,0.30) 0%, transparent 68%)",

    bottomGlow:
      "radial-gradient(circle, rgba(87,155,105,0.18) 0%, transparent 68%)",

    line: "rgba(92, 155, 108, 0.22)",

    orb:
      "rgba(116, 180, 128, 0.12)",

    corner:
      "rgba(71, 139, 88, 0.24)",

    sparkle:
      "rgba(85, 155, 99, 0.46)",
  },

  rare: {
    background:
      "linear-gradient(145deg, #f3f9ff 0%, #e4f1fb 45%, #d3e9f7 100%)",

    glow:
      "radial-gradient(circle at 50% 8%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.32) 34%, transparent 70%)",

    topGlow:
      "radial-gradient(circle, rgba(85,155,220,0.34) 0%, transparent 68%)",

    bottomGlow:
      "radial-gradient(circle, rgba(65,125,190,0.20) 0%, transparent 68%)",

    line: "rgba(70, 137, 201, 0.24)",

    orb:
      "rgba(87, 157, 218, 0.14)",

    corner:
      "rgba(52, 124, 190, 0.25)",

    sparkle:
      "rgba(74, 143, 210, 0.52)",
  },

  epic: {
    background:
      "linear-gradient(145deg, #fbf6ff 0%, #efe5fb 45%, #dfd1f2 100%)",

    glow:
      "radial-gradient(circle at 50% 8%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.28) 34%, transparent 70%)",

    topGlow:
      "radial-gradient(circle, rgba(166,110,224,0.38) 0%, transparent 68%)",

    bottomGlow:
      "radial-gradient(circle, rgba(127,78,186,0.20) 0%, transparent 68%)",

    line: "rgba(139, 92, 196, 0.28)",

    orb:
      "rgba(164, 102, 221, 0.15)",

    corner:
      "rgba(125, 72, 180, 0.29)",

    sparkle:
      "rgba(152, 86, 215, 0.62)",
  },

  legendary: {
    background:
      "linear-gradient(145deg, #fffdf1 0%, #fff2c9 40%, #ffdca0 100%)",

    glow:
      "radial-gradient(circle at 50% 8%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.35) 34%, transparent 70%)",

    topGlow:
      "radial-gradient(circle, rgba(255,193,66,0.48) 0%, transparent 68%)",

    bottomGlow:
      "radial-gradient(circle, rgba(241,140,39,0.27) 0%, transparent 68%)",

    line: "rgba(225, 145, 39, 0.32)",

    orb:
      "rgba(255,183,56,0.19)",

    corner:
      "rgba(218, 133, 23, 0.40)",

    sparkle:
      "rgba(242, 152, 28, 0.78)",
  },

  unique: {
    background:
      "linear-gradient(120deg, #ff6b9d 0%, #ff9f68 16%, #ffe66d 32%, #8ee3a8 48%, #6dd5ed 64%, #9b8cff 80%, #ed7aff 100%)",

    glow:
      "radial-gradient(circle at 50% 8%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.45) 28%, transparent 68%)",

    topGlow:
      "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,180,220,0.25) 38%, transparent 72%)",

    bottomGlow:
      "radial-gradient(circle, rgba(100,210,255,0.35) 0%, rgba(190,120,255,0.25) 45%, transparent 72%)",

    line: "rgba(255,255,255,0.48)",

    orb:
      "rgba(255,255,255,0.22)",

    corner:
      "rgba(255,255,255,0.75)",

    sparkle:
      "rgba(255,255,255,0.95)",
  },
};

/* =========================================================
   ANIMAÇÃO DAS LINHAS DIAGONAIS
   A partir da ÉPICA, uma luz percorre as linhas como
   uma estrela cadente.
   ========================================================= */

const DIAGONAL_RARITIES = ["epic", "legendary", "unique"];

export default function RPGCard({
  card,
  delay = 0,
  selected,
  faded,
  disabled,
  onClick,
}: RPGCardProps) {
  const style = RPG_RARITY_STYLES[card.rarity];
  const visual = RARITY_VISUALS[card.rarity];

  const entrance =
    ENTRANCE_VARIANTS[card.rarity] ??
    ENTRANCE_VARIANTS.common;

  const isLegendary = card.rarity === "legendary";
  const isUnique = card.rarity === "unique";
  const isEpic = card.rarity === "epic";
  const isRare = card.rarity === "rare";
  
  const rarityBorderColors: Record<RPGRarity, string> = {
    common: "#86b98f",
    rare: "#6fa9d8",
    epic: "#a77bd1",
    legendary: "#e7a33c",
    unique: "#d47ae0",
  };

  const baseScale =
    (entrance.animate as { scale?: number }).scale ?? 1;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={entrance.initial}
      animate={{
        ...entrance.animate,
        opacity: faded ? 0.25 : 1,
        scale: selected ? 1.08 : baseScale,
      }}
      transition={{
        ...entrance.transition,
        delay,
      }}
      whileHover={
        !disabled
          ? {
              y: -7,
              scale: selected ? 1.1 : 1.045,
              rotate: isLegendary
                ? [-0.5, 0.5, -0.5]
                : isUnique
                  ? [-1, 1, -1]
                  : 0,
            }
          : undefined
      }
      whileTap={
        !disabled
          ? {
              scale: 0.96,
            }
          : undefined
      }
      className={`
        group
        relative
        flex
        w-full
        flex-col
        items-center
        gap-2
        overflow-hidden
        rounded-2xl
        border-2
        p-3
        text-center
        sm:p-4

        bg-white
        shadow-sm

        focus:outline-none
        focus:ring-0
        focus-visible:outline-none
        focus-visible:ring-0

        disabled:cursor-default

        transition-all
        duration-300
      `}
      style={{
        borderColor: rarityBorderColors[card.rarity],
        boxShadow:
          card.rarity === "common"
            ? "0 4px 18px rgba(52,211,153,0.14)"
            : card.rarity === "rare"
              ? "0 6px 22px rgba(56,150,240,0.20)"
              : card.rarity === "epic"
                ? "0 7px 28px rgba(168,85,247,0.28)"
                : card.rarity === "legendary"
                  ? "0 8px 32px rgba(245,158,11,0.34), 0 0 0 1px rgba(255,190,70,0.35)"
                  : "0 10px 38px rgba(217,70,239,0.30), 0 0 0 1px rgba(240,140,230,0.4)",
      }}
    >
      {/* =====================================================
          FUNDO REAL DA CARTA
         ===================================================== */}

      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
        style={{
          background: visual.background,
        }}
      >
        {/* Iluminação geral */}
        <div
          className="absolute inset-0"
          style={{
            background: visual.glow,
          }}
        />

        {/* Brilho superior */}
        <div
          className="absolute -left-8 -top-10 h-28 w-[120%] rounded-full blur-2xl"
          style={{
            background: visual.topGlow,
          }}
        />

        {/* Brilho inferior */}
        <div
          className="absolute -bottom-12 -right-10 h-32 w-40 rounded-full blur-2xl"
          style={{
            background: visual.bottomGlow,
          }}
        />

        {/* Mancha suave central */}
        <div
          className="absolute left-1/2 top-[53%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: visual.orb,
          }}
        />

        {/* =================================================
            LINHAS DIAGONAIS
            Comum/Rara: estáticas
            Épica/Lendária/Única: estrela cadente
          ================================================= */}

        <div
          className={`absolute inset-0 ${
            DIAGONAL_RARITIES.includes(card.rarity)
              ? "opacity-70"
              : "opacity-50"
          }`}
          style={{
            background: `
              linear-gradient(
                135deg,
                transparent 0%,
                transparent 43%,
                ${visual.line} 44%,
                transparent 45%,
                transparent 55%,
                ${visual.line} 56%,
                transparent 57%,
                transparent 100%
              )
            `,
          }}
        />

        {/* =================================================
            ESTRELAS CADENTES
            Somente Épica, Lendária e Única
          ================================================= */}

        {DIAGONAL_RARITIES.includes(card.rarity) && (
          <>
            {/* Primeira estrela cadente */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                width: "75px",
                height: "2px",
                top: "32%",
                left: "-80px",
                background: `linear-gradient(
                  90deg,
                  transparent,
                  ${visual.sparkle},
                  white
                )`,
                boxShadow: `0 0 8px ${visual.sparkle}`,
                transform: "rotate(45deg)",
                transformOrigin: "left center",
              }}
              animate={{
                left: ["-80px", "120%"],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration:
                  card.rarity === "epic"
                    ? 4.5
                    : card.rarity === "legendary"
                      ? 3.5
                      : 2.8,
                repeat: Infinity,
                repeatDelay:
                  card.rarity === "epic"
                    ? 2.5
                    : card.rarity === "legendary"
                      ? 1.8
                      : 1.2,
                ease: "easeInOut",
              }}
            />

            {/* Segunda estrela cadente */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                width: "45px",
                height: "1.5px",
                top: "68%",
                left: "-60px",
                background: `linear-gradient(
                  90deg,
                  transparent,
                  ${visual.sparkle},
                  white
                )`,
                boxShadow: `0 0 6px ${visual.sparkle}`,
                transform: "rotate(45deg)",
                transformOrigin: "left center",
              }}
              animate={{
                left: ["-60px", "120%"],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration:
                  card.rarity === "epic"
                    ? 5.5
                    : card.rarity === "legendary"
                      ? 4.2
                      : 3.4,
                repeat: Infinity,
                repeatDelay:
                  card.rarity === "epic"
                    ? 3.5
                    : card.rarity === "legendary"
                      ? 2.5
                      : 1.8,
                delay: 1.5,
                ease: "easeInOut",
              }}
            />
          </>
        )}

        {/* Moldura interna mais forte */}
        <div
          className="absolute inset-[6px] rounded-[15px]"
          style={{
            border: `1px solid ${visual.line}`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.36)`,
          }}
        />

        {/* Segunda moldura */}
        <div
          className="absolute inset-[10px] rounded-[12px] opacity-70"
          style={{
            border: `1px solid ${visual.line}`,
          }}
        />

        {/* =================================================
            DETALHES DOS CANTOS
          ================================================= */}

        {/* Comum: apenas dois detalhes discretos */}
        {card.rarity === "common" && (
          <>
            <span
              className="absolute left-3 top-3 h-2 w-2 rotate-45 rounded-[2px]"
              style={{
                background: visual.corner,
              }}
            />

            <span
              className="absolute right-3 bottom-3 h-2 w-2 rotate-45 rounded-[2px]"
              style={{
                background: visual.corner,
              }}
            />
          </>
        )}

        {/* Raro: quatro losangos */}
        {card.rarity === "rare" && (
          <>
            <span
              className="absolute left-3 top-3 h-3 w-3 rotate-45 rounded-[2px]"
              style={{
                background: visual.corner,
              }}
            />

            <span
              className="absolute right-3 top-3 h-3 w-3 rotate-45 rounded-[2px]"
              style={{
                background: visual.corner,
              }}
            />

            <span
              className="absolute bottom-3 left-3 h-3 w-3 rotate-45 rounded-[2px]"
              style={{
                background: visual.corner,
              }}
            />

            <span
              className="absolute bottom-3 right-3 h-3 w-3 rotate-45 rounded-[2px]"
              style={{
                background: visual.corner,
              }}
            />
          </>
        )}

        {/* Épico, Lendário e Único: cantos maiores */}
        {["epic", "legendary", "unique"].includes(card.rarity) && (
          <>
            <span
              className="absolute left-3 top-3 h-4 w-4 rotate-45 rounded-[2px] border"
              style={{
                background: visual.corner,
                borderColor: visual.sparkle,
              }}
            />

            <span
              className="absolute right-3 top-3 h-4 w-4 rotate-45 rounded-[2px] border"
              style={{
                background: visual.corner,
                borderColor: visual.sparkle,
              }}
            />

            <span
              className="absolute bottom-3 left-3 h-4 w-4 rotate-45 rounded-[2px] border"
              style={{
                background: visual.corner,
                borderColor: visual.sparkle,
              }}
            />

            <span
              className="absolute bottom-3 right-3 h-4 w-4 rotate-45 rounded-[2px] border"
              style={{
                background: visual.corner,
                borderColor: visual.sparkle,
              }}
            />
          </>
        )}

        {/* =================================================
            PEQUENOS BRILHOS
          ================================================= */}

        {/* Comum: somente 1 detalhe */}
        {card.rarity === "common" && (
          <span
            className="absolute left-[18%] top-[28%] h-1.5 w-1.5 rotate-45 rounded-[1px]"
            style={{
              background: visual.sparkle,
            }}
          />
        )}

        {/* Raro: 3 detalhes */}
        {card.rarity === "rare" && (
          <>
            <span
              className="absolute left-[15%] top-[25%] h-1.5 w-1.5 rotate-45"
              style={{ background: visual.sparkle }}
            />

            <span
              className="absolute right-[18%] top-[30%] h-1.5 w-1.5 rotate-45"
              style={{ background: visual.sparkle }}
            />

            <span
              className="absolute bottom-[28%] left-[22%] h-1.5 w-1.5 rotate-45"
              style={{ background: visual.sparkle }}
            />
          </>
        )}

        {/* Épico: 6 detalhes */}
        {card.rarity === "epic" && (
          <>
            {[
              ["14%", "24%"],
              ["82%", "27%"],
              ["10%", "50%"],
              ["90%", "52%"],
              ["20%", "72%"],
              ["78%", "74%"],
            ].map(([left, top], index) => (
              <span
                key={`epic-spark-${index}`}
                className="absolute h-1.5 w-1.5 rotate-45"
                style={{
                  left,
                  top,
                  background: visual.sparkle,
                }}
              />
            ))}
          </>
        )}

        {/* Lendário: 9 estrelas */}
        {card.rarity === "legendary" && (
          <>
            {[
              ["12%", "20%"],
              ["27%", "27%"],
              ["72%", "20%"],
              ["88%", "29%"],
              ["9%", "45%"],
              ["91%", "48%"],
              ["17%", "67%"],
              ["83%", "68%"],
              ["50%", "82%"],
            ].map(([left, top], index) => (
              <motion.span
                key={`legendary-spark-${index}`}
                className="absolute text-sm"
                style={{
                  left,
                  top,
                  color: visual.sparkle,
                }}
                animate={{
                  opacity: [0.35, 1, 0.35],
                  scale: [0.8, 1.15, 0.8],
                }}
                transition={{
                  duration: 1.8 + index * 0.08,
                  repeat: Infinity,
                  delay: index * 0.08,
                }}
              >
                ✦
              </motion.span>
            ))}
          </>
        )}

        {/* Único: 14 estrelas */}
        {card.rarity === "unique" && (
          <>
            {[
              ["10%", "17%", "✦"],
              ["22%", "25%", "✧"],
              ["38%", "16%", "✦"],
              ["62%", "17%", "✧"],
              ["78%", "23%", "✦"],
              ["90%", "17%", "✧"],
              ["8%", "42%", "✧"],
              ["92%", "43%", "✦"],
              ["12%", "60%", "✦"],
              ["88%", "61%", "✧"],
              ["22%", "76%", "✦"],
              ["38%", "84%", "✧"],
              ["62%", "84%", "✦"],
              ["78%", "76%", "✧"],
            ].map(([left, top, symbol], index) => (
              <motion.span
                key={`unique-spark-${index}`}
                className="absolute text-sm"
                style={{
                  left,
                  top,
                  color: visual.sparkle,
                }}
                animate={{
                  opacity: [0.25, 1, 0.25],
                  scale: [0.75, 1.2, 0.75],
                  rotate: [0, 8, 0],
                }}
                transition={{
                  duration: 1.6 + (index % 4) * 0.3,
                  repeat: Infinity,
                  delay: index * 0.1,
                }}
              >
                {symbol}
              </motion.span>
            ))}
          </>
        )}

        {/* =================================================
              ORNAMENTO MÁGICO DO ÉPICO
            ================================================= */}

          {isEpic && (
            <>
              {/* Círculo mágico central */}
              <motion.div
                className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
                style={{
                  borderColor: visual.corner,
                  opacity: 0.22,
                }}
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {/* Segundo círculo */}
              <motion.div
                className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
                style={{
                  borderColor: visual.sparkle,
                  opacity: 0.15,
                  borderStyle: "dashed",
                }}
                animate={{
                  rotate: -360,
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </>
          )}

        {/* =================================================
              ORNAMENTOS EXTRAS DO ÚNICO
            ================================================= */}

        {isUnique && (
          <>
            {/* Moldura dupla */}
            <div
              className="absolute inset-3 rounded-xl border-2"
              style={{
                borderColor: visual.corner,
                opacity: 0.55,
              }}
            />

            <div
              className="absolute inset-5 rounded-lg border"
              style={{
                borderColor: visual.line,
                opacity: 0.7,
              }}
            />

            {/* Grande losango central */}
            <div
              className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[12px]"
              style={{
                border: `1px solid ${visual.corner}`,
                opacity: 0.4,
              }}
            />

            {/* Pequenos losangos intermediários */}
            <div
              className="absolute left-[16%] top-[43%] h-4 w-4 rotate-45 border"
              style={{
                borderColor: visual.corner,
              }}
            />

            <div
              className="absolute right-[16%] top-[43%] h-4 w-4 rotate-45 border"
              style={{
                borderColor: visual.corner,
              }}
            />

            {/* Partículas */}
            <span
              className="absolute left-[30%] top-[18%] h-1.5 w-1.5 rounded-full"
              style={{
                background: visual.sparkle,
                boxShadow: `0 0 8px ${visual.sparkle}`,
              }}
            />

            <span
              className="absolute right-[30%] bottom-[18%] h-1.5 w-1.5 rounded-full"
              style={{
                background: visual.sparkle,
                boxShadow: `0 0 8px ${visual.sparkle}`,
              }}
            />
          </>
        )}

        {/* =================================================
            DETALHES EXTRAS RARO
           ================================================= */}

        {isRare && (
          <>
            <div
              className="absolute left-1/2 top-[14%] h-px w-[58%] -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(56,145,220,0.35), transparent)",
              }}
            />

            <div
              className="absolute bottom-[14%] left-1/2 h-px w-[58%] -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(56,145,220,0.30), transparent)",
              }}
            />
          </>
        )}
      </div>

      {/* =====================================================
          REFLEXO DOURADO DA CARTA LENDÁRIA
        ===================================================== */}

      {isLegendary && (
        <motion.div
          className="
            pointer-events-none
            absolute
            -inset-[40%]
            z-10
            rotate-45
          "
          style={{
            background: `
              linear-gradient(
                90deg,
                transparent 0%,
                transparent 42%,
                rgba(255,255,255,0.45) 50%,
                transparent 58%,
                transparent 100%
              )
            `,
          }}
          animate={{
            x: ["-80%", "80%"],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
        />
      )}

      {/* =====================================================
          BRILHO ESPECIAL DO LENDÁRIO
         ===================================================== */}

      {isLegendary && (
        <>
          <motion.div
            className="
              pointer-events-none
              absolute
              -inset-1
              z-20
              rounded-2xl
              bg-gradient-to-r
              from-amber-300/0
              via-yellow-200/60
              to-orange-300/0
            "
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: [0, 0.9, 0.2, 0],
              scale: [0.8, 1.12, 1.05, 1],
            }}
            transition={{
              duration: 0.9,
              delay: delay + 0.05,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="
              pointer-events-none
              absolute
              inset-0
              z-20
              rounded-2xl
              ring-2
              ring-amber-300/70
            "
            initial={{
              opacity: 0,
              scale: 0.75,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.75, 1.08, 1.15],
            }}
            transition={{
              duration: 0.8,
              delay: delay + 0.05,
              ease: "easeOut",
            }}
          />
        </>
      )}

      {/* =====================================================
          EFEITO ESPECIAL DO ÚNICO
         ===================================================== */}

      {isUnique && (
        <>
          <motion.div
            className="
              pointer-events-none
              absolute
              inset-0
              z-10
              rounded-2xl
              opacity-40
            "
            style={{
              backgroundImage: `
                radial-gradient(circle at 15% 20%, white 0 1px, transparent 2px),
                radial-gradient(circle at 80% 18%, white 0 1px, transparent 2px),
                radial-gradient(circle at 30% 72%, white 0 1px, transparent 2px),
                radial-gradient(circle at 75% 78%, white 0 1px, transparent 2px),
                radial-gradient(circle at 52% 35%, white 0 1px, transparent 2px)
              `,
            }}
            animate={{
              opacity: [0.25, 0.6, 0.25],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          <motion.div
            className="
              pointer-events-none
              absolute
              -inset-2
              z-20
              rounded-3xl
              bg-gradient-to-r
              from-pink-300/0
              via-fuchsia-300/50
              to-sky-300/0
              blur-md
            "
            initial={{
              opacity: 0,
              scale: 0.65,
            }}
            animate={{
              opacity: [0, 1, 0.35, 0],
              scale: [0.65, 1.12, 1.08, 1],
            }}
            transition={{
              duration: 1.15,
              delay: delay + 0.05,
              ease: "easeOut",
            }}
          />

          <motion.div
            className="
              pointer-events-none
              absolute
              inset-0
              z-20
              rounded-2xl
              bg-gradient-to-tr
              from-fuchsia-300/25
              via-transparent
              to-amber-200/30
            "
            animate={{
              opacity: [0.35, 0.8, 0.35],
            }}
            transition={{
              duration: 1.7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="
              pointer-events-none
              absolute
              inset-0
              z-20
              rounded-2xl
              ring-2
              ring-fuchsia-300/60
            "
            initial={{
              opacity: 0,
              scale: 0.65,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.65, 1.08, 1.18],
            }}
            transition={{
              duration: 1,
              delay: delay + 0.05,
              ease: "easeOut",
            }}
          />
        </>
      )}

      {/* =====================================================
          RARIDADE
         ===================================================== */}

      <motion.span
        className={`
          relative
          z-30

          rounded-full

          px-3
          py-1

          border

          text-[12px]
          font-extrabold
          uppercase
          tracking-[0.08em]

          backdrop-blur-md

          shadow-sm

          sm:text-sm

          ${
            card.rarity === "common"
              ? "bg-emerald-100/95 border-emerald-400 text-emerald-700 shadow-emerald-200/70"

              : card.rarity === "rare"
                ? "bg-blue-100/95 border-blue-400 text-blue-700 shadow-blue-200/70"

                : card.rarity === "epic"
                  ? "bg-purple-100/95 border-purple-400 text-purple-700 shadow-purple-300/70"

                  : card.rarity === "legendary"
                    ? "bg-orange-100/95 border-orange-400 text-orange-700 shadow-orange-300/80"

                    : "bg-gradient-to-r from-pink-100 via-purple-100 to-orange-100 border-fuchsia-400 text-fuchsia-700 shadow-fuchsia-300/80"
          }
        `}
        initial={{
          opacity: 0,
          y: -5,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: delay + 0.12,
          duration: 0.3,
        }}
      >
        {style.label}
      </motion.span>

      {/* =====================================================
          ÍCONE
         ===================================================== */}

      <motion.span
        className="
          relative
          z-30
          text-3xl
          leading-none
          drop-shadow-sm
          sm:text-4xl
        "
        animate={
          isLegendary
            ? {
                y: [0, -2, 0],
              }
            : isUnique
              ? {
                  y: [0, -2.5, 0],
                }
              : undefined
        }
        transition={
          isLegendary || isUnique
            ? {
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
      >
        {card.emoji}
      </motion.span>

      {/* =====================================================
          NOME
         ===================================================== */}

      <span
        className="
          relative
          z-30
          font-display
          text-sm
          font-semibold
          leading-tight
          text-ink

          sm:text-base
        "
      >
        {card.name}
      </span>

      {/* =====================================================
          DESCRIÇÃO
         ===================================================== */}

      <span
        className="
          relative
          z-30
          px-2
          text-xs
          font-medium
          leading-relaxed
          text-ink-soft

          sm:text-sm
        "
      >
        {card.description}
      </span>

      {/* =====================================================
          BRILHO DO ÉPICO
         ===================================================== */}

      {isEpic && (
        <motion.div
          className="
            pointer-events-none
            absolute
            inset-0
            z-20
            rounded-2xl
            bg-gradient-to-tr
            from-purple-300/0
            via-purple-200/15
            to-fuchsia-300/20
          "
          animate={{
            opacity: [0.3, 0.65, 0.3],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
}