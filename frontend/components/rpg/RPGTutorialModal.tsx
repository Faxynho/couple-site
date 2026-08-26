"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RPGCard from "./RPGCard";
import {
  RPGCard as RPGCardData,
  RPGClassId,
  RPGRarity,
  RPG_RARITY_STYLES,
  RPG_CLASSES,
} from "@/lib/rpgTypes";

interface RPGTutorialModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * O tutorial usa o próprio RPGCard.tsx do jogo.
 * Assim, as cartas mostradas aqui têm exatamente o mesmo
 * fundo, moldura, detalhes, raridade e efeitos visuais das cartas reais.
 *
 * Os dados abaixo são espelhados do banco atual do backend:
 * backend/src/games/rpg/cards.ts
 *
 * Não são cartas clicáveis e não alteram a partida.
 */

type TutorialCard = Omit<RPGCardData, "instanceId"> & {
  instanceId: string;
};

const TUTORIAL_CARDS: Record<RPGRarity, TutorialCard[]> = {
  common: [
    {
      id: "common_physical",
      instanceId: "tutorial-common-physical",
      rarity: "common",
      kind: "physical",
      name: "Ataque Normal",
      emoji: "⚔️",
      description: "Ataque físico com o poder de ataque da sua classe.",
    },
    {
      id: "common_magic",
      instanceId: "tutorial-common-magic",
      rarity: "common",
      kind: "magic",
      name: "Ataque Mágico",
      emoji: "🔮",
      description: "Ataque mágico — classes com bônus mágico causam mais dano.",
    },
    {
      id: "common_heal_evade",
      instanceId: "tutorial-common-heal-evade",
      rarity: "common",
      kind: "healEvade",
      name: "Cura + Esquiva",
      emoji: "❤️💨",
      description: "Recupera um pouco de vida e aumenta sua chance de esquiva no próximo golpe.",
    },
  ],

  rare: [
    {
      id: "rare_atk_heal",
      instanceId: "tutorial-rare-atk-heal",
      rarity: "rare",
      kind: "physicalDrainLight",
      name: "Ataque + Vida",
      emoji: "⚔️❤️",
      description: "Causa menos dano, mas recupera um pouco da sua vida.",
    },
    {
      id: "rare_atk_evade",
      instanceId: "tutorial-rare-atk-evade",
      rarity: "rare",
      kind: "physicalEvadeBuff",
      name: "Ataque + Esquiva",
      emoji: "⚔️💨",
      description: "Causa menos dano, mas te dá chance de esquivar do próximo golpe.",
    },
    {
      id: "rare_double_magic",
      instanceId: "tutorial-rare-double-magic",
      rarity: "rare",
      kind: "doubleMagic",
      name: "Magia Dupla",
      emoji: "🔮🔮",
      description: "Dois ataques mágicos consecutivos.",
    },
    {
      id: "rare_life_steal",
      instanceId: "tutorial-rare-life-steal",
      rarity: "rare",
      kind: "lifeSteal",
      name: "Roubar Vida",
      emoji: "🩸",
      description: "Causa dano e rouba parte do dano causado para recuperar sua vida.",
    },
  ],

  epic: [
    {
      id: "epic_atk_magic",
      instanceId: "tutorial-epic-atk-magic",
      rarity: "epic",
      kind: "physicalMagicCombo",
      name: "Ataque + Magia",
      emoji: "⚔️🔮",
      description: "Ataque físico acompanhado de dano mágico adicional.",
    },
    {
      id: "epic_double_attack",
      instanceId: "tutorial-epic-double-attack",
      rarity: "epic",
      kind: "doubleAttack",
      name: "Dois Ataques",
      emoji: "⚔️⚔️",
      description: "Dois ataques consecutivos, com o dano dividido entre eles.",
    },
    {
      id: "epic_atk_heal_full",
      instanceId: "tutorial-epic-atk-heal-full",
      rarity: "epic",
      kind: "physicalDrainFull",
      name: "Ataque + Vida",
      emoji: "⚔️❤️",
      description: "Dano cheio, e ainda recupera uma parte da sua vida.",
    },
    {
      id: "epic_atk_crit",
      instanceId: "tutorial-epic-atk-crit",
      rarity: "epic",
      kind: "physicalCritBoost",
      name: "Ataque + Crítico",
      emoji: "⚔️🎯",
      description: "Ataque com chance de crítico bem maior que o normal.",
    },
    {
      id: "epic_poison",
      instanceId: "tutorial-epic-poison",
      rarity: "epic",
      kind: "poison",
      name: "Veneno",
      emoji: "☠️",
      description: "Causa dano agora e aplica veneno por mais 2 rodadas.",
    },
  ],

  legendary: [
    {
      id: "legendary_triple_attack",
      instanceId: "tutorial-legendary-triple-attack",
      rarity: "legendary",
      kind: "tripleAttack",
      name: "Triplo Ataque",
      emoji: "⚔️⚔️⚔️",
      description: "Três ataques consecutivos contra o inimigo.",
    },
    {
      id: "legendary_atk_immunity",
      instanceId: "tutorial-legendary-atk-immunity",
      rarity: "legendary",
      kind: "physicalImmuneBuff",
      name: "Ataque + Imunidade",
      emoji: "🛡️⚔️",
      description: "Ataque normal, e te deixa imune ao próximo golpe recebido.",
    },
    {
      id: "legendary_triple-magic",
      instanceId: "tutorial-legendary-triple-magic",
      rarity: "legendary",
      kind: "tripleMagic",
      name: "Magia Tripla",
      emoji: "🔮🔮🔮",
      description: "Três ataques mágicos consecutivos.",
    },
    {
      id: "legendary_super-heal",
      instanceId: "tutorial-legendary-super-heal",
      rarity: "legendary",
      kind: "superHeal",
      name: "Super Cura",
      emoji: "💖",
      description: "Recupera uma grande quantidade de vida.",
    },
    {
      id: "legendary_swap",
      instanceId: "tutorial-legendary-swap",
      rarity: "legendary",
      kind: "swapHp",
      name: "Troca",
      emoji: "🔄",
      description: "Troca sua vida atual pela vida atual do inimigo.",
    },
    {
      id: "legendary_reroll",
      instanceId: "tutorial-legendary-reroll",
      rarity: "legendary",
      kind: "reroll",
      name: "Rolagem",
      emoji: "🎲",
      description: "Ataca e ganha 3 rolagens extras, que podem ser usadas nos próximos rounds.",
    },
  ],

  unique: [
    {
      id: "unique_full_heal",
      instanceId: "tutorial-unique-full-heal",
      rarity: "unique",
      kind: "fullHeal",
      name: "Recuperação Total",
      emoji: "❤️",
      description: "Recupera toda a vida e fica imune a dano durante este round.",
    },
    {
      id: "unique_domination",
      instanceId: "tutorial-unique-domination",
      rarity: "unique",
      kind: "domination",
      name: "Dominação",
      emoji: "⏭️",
      description: "O inimigo fica impedido de jogar nas próximas 2 rodadas.",
    },
    {
      id: "unique_crit_supreme",
      instanceId: "tutorial-unique-crit-supreme",
      rarity: "unique",
      kind: "critSupreme",
      name: "Crítico Supremo",
      emoji: "🎯",
      description: "Aumenta muito sua chance de crítico pelo resto da partida.",
    },
    {
      id: "unique_evade_supreme",
      instanceId: "tutorial-unique-evade-supreme",
      rarity: "unique",
      kind: "evadeSupreme",
      name: "Evasão Suprema",
      emoji: "👻",
      description: "Aumenta muito sua chance de esquiva pelo resto da partida.",
    },
    {
      id: "unique_luck",
      instanceId: "tutorial-unique-luck",
      rarity: "unique",
      kind: "luck",
      name: "Sorte",
      emoji: "🍀",
      description: "Aumenta a chance de receber cartas de raridade maior pelo resto da partida.",
    },
  ],
};

const CLASS_UNIQUE_CARDS: Record<
  Exclude<RPGClassId, "boss">,
  TutorialCard[]
> = {
  mage: [
    {
      id: "unique_super_magic",
      instanceId: "tutorial-class-mage-super-magic",
      rarity: "unique",
      kind: "superMagic",
      name: "Super Magia",
      emoji: "☄️",
      description: "Um ataque mágico devastador que ignora esquivas. Exclusiva para magos.",
      classRestriction: "mage",
    },
  ],
  warlock: [
    {
      id: "unique_curse",
      instanceId: "tutorial-class-warlock-curse",
      rarity: "unique",
      kind: "curse",
      name: "Maldição",
      emoji: "🕯️",
      description: "Causa dano de 0,75x por 5 rounds seguidos. Exclusiva para bruxos.",
      classRestriction: "warlock",
    },
  ],
  archer: [
    {
      id: "unique_arrow_rain",
      instanceId: "tutorial-class-archer-arrow-rain",
      rarity: "unique",
      kind: "arrowRain",
      name: "Chuva de Flechas",
      emoji: "🏹🏹🏹",
      description: "Realiza 5 ataques com dano padrão. Exclusiva para arqueiros.",
      classRestriction: "archer",
    },
  ],
  warrior: [
    {
      id: "unique_hammer_smash",
      instanceId: "tutorial-class-warrior-hammer-smash",
      rarity: "unique",
      kind: "hammerSmash",
      name: "Marretada",
      emoji: "🔨",
      description: "Golpe de 2x o dano base, como a Super Magia. Exclusiva para guerreiros.",
      classRestriction: "warrior",
    },
  ],
  assassin: [
    {
      id: "unique_assassinate",
      instanceId: "tutorial-class-assassin-assassinate",
      rarity: "unique",
      kind: "assassinate",
      name: "Assassinar",
      emoji: "🗡️",
      description: "Golpe de 3x o dano base e sangramento de dano padrão por 3 rounds. Exclusiva para assassinos.",
      classRestriction: "assassin",
    },
  ],
  paladin: [
    {
      id: "unique_divine_shield",
      instanceId: "tutorial-class-paladin-divine-shield",
      rarity: "unique",
      kind: "divineShield",
      name: "Escudo Divino",
      emoji: "🛡️✨",
      description: "Aumenta a defesa em 50% pelos próximos 3 rounds. Exclusiva para paladinos.",
      classRestriction: "paladin",
    },
  ],
};

const CLASS_UNIQUE_ORDER: Exclude<RPGClassId, "boss">[] = [
  "warrior",
  "mage",
  "assassin",
  "archer",
  "paladin",
  "warlock",
];

const RARITIES: RPGRarity[] = [
  "common",
  "rare",
  "epic",
  "legendary",
  "unique",
];

const CLASS_ORDER: RPGClassId[] = [
  "warrior",
  "mage",
  "assassin",
  "archer",
  "paladin",
  "warlock",
  "boss",
];

function rarityTitle(rarity: RPGRarity) {
  return RPG_RARITY_STYLES[rarity].label;
}

export default function RPGTutorialModal({
  open,
  onClose,
}: RPGTutorialModalProps) {
  const [tab, setTab] = useState<"cards" | "classes">("cards");

  const cardsByRarity = useMemo(
    () =>
      RARITIES.map((rarity) => ({
        rarity,
        cards: TUTORIAL_CARDS[rarity],
      })),
    []
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial do Mini RPG"
            initial={{ opacity: 0, y: 25, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-surface/80 bg-[#f8fbf8]/95 shadow-[0_24px_80px_rgba(15,23,42,0.25)] dark:bg-[#221b20]/95"
          >
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">
                  Mini RPG
                </p>
                <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
                  Como jogar
                </h2>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.08, rotate: 3 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/75 text-lg font-bold text-ink-soft shadow-sm hover:bg-surface hover:text-ink"
                aria-label="Fechar tutorial"
              >
                ×
              </motion.button>
            </div>

            <div className="flex gap-2 px-5 pt-4 sm:px-7">
              <button
                type="button"
                onClick={() => setTab("cards")}
                className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  tab === "cards"
                    ? "bg-ink text-white shadow-sm"
                    : "bg-surface/70 text-ink-soft hover:bg-surface"
                }`}
              >
                🃏 Cartas
              </button>

              <button
                type="button"
                onClick={() => setTab("classes")}
                className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  tab === "classes"
                    ? "bg-ink text-white shadow-sm"
                    : "bg-surface/70 text-ink-soft hover:bg-surface"
                }`}
              >
                ⚔️ Classes
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-7">
              {tab === "cards" ? (
                <div className="space-y-8">
                  <div className="rounded-2xl border border-surface/90 bg-surface/50 px-4 py-3 text-center text-xs text-ink-soft">
                    As cartas abaixo são <strong>as mesmas cartas visuais do jogo</strong>.
                    Elas são apenas demonstrativas e não podem ser selecionadas.
                  </div>

                  {cardsByRarity.map(({ rarity, cards }) => {
                    const style = RPG_RARITY_STYLES[rarity];

                    return (
                      <section key={rarity}>
                        <div className="mb-3 flex items-center justify-center gap-3">
                          <span className="h-px flex-1 bg-black/5" />
                          <h3
                            className={`text-sm font-extrabold uppercase tracking-[0.16em] ${style.text}`}
                          >
                            {rarityTitle(rarity)}
                          </h3>
                          <span className="h-px flex-1 bg-black/5" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                          {cards.map((card, index) => (
                            <div key={card.instanceId} className="min-w-0">
                              <RPGCard
                                card={card}
                                delay={index * 0.04}
                                disabled
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  <section>
                    <div className="mb-3 mt-2 flex items-center justify-center gap-3">
                      <span className="h-px flex-1 bg-black/5" />
                      <h3 className="text-center text-sm font-extrabold uppercase tracking-[0.16em] text-fuchsia-600">
                        Único por classe
                      </h3>
                      <span className="h-px flex-1 bg-black/5" />
                    </div>

                    <div className="mb-4 rounded-2xl border border-fuchsia-200/80 bg-fuchsia-50/65 px-4 py-3 text-center text-xs leading-relaxed text-ink-soft">
                      Estas cartas são <strong>Únicas</strong>, mas só podem aparecer para a classe indicada. Cada uma pode ser recebida uma única vez por jogador durante a partida.
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                      {CLASS_UNIQUE_ORDER.flatMap((classId) =>
                        CLASS_UNIQUE_CARDS[classId].map((card, index) => (
                          <div key={card.instanceId} className="min-w-0">
                            <div className="mb-1.5 flex justify-center">
                              <span className="rounded-full bg-surface/85 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-fuchsia-700 shadow-sm">
                                {RPG_CLASSES[classId].emoji} {RPG_CLASSES[classId].name}
                              </span>
                            </div>
                            <RPGCard
                              card={card}
                              delay={index * 0.04}
                              disabled
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {CLASS_ORDER.map((classId, index) => {
                    const cls = RPG_CLASSES[classId];

                    return (
                      <motion.div
                        key={classId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.045 }}
                        className="relative overflow-hidden rounded-2xl border border-surface/90 bg-surface/65 p-4 shadow-sm"
                      >
                        <div className="absolute -right-5 -top-5 text-7xl opacity-[0.06]">
                          {cls.emoji}
                        </div>

                        <div className="relative flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface/80 text-2xl shadow-sm">
                            {cls.emoji}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-display text-base font-extrabold text-ink">
                              {cls.name}
                            </h3>
                            <p className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">
                              {cls.passiveName}
                            </p>
                            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                              {cls.passiveDescription}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-black/5 px-5 py-3 text-center text-[10px] text-ink-soft sm:px-7">
              O tutorial não pausa nem altera a partida.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
