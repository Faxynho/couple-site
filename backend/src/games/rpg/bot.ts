import { RPGCard, RPGCardKind, RPGCombatant } from "./types";

/**
 * IA bem simples do BOT — não precisa ser inteligente, só parecer um
 * adversário divertido: prefere cura quando está com pouca vida, prefere
 * ataques fortes quando está com bastante vida, e no resto escolhe à toa
 * entre as três cartas da mão.
 */
const HEAL_KINDS: RPGCardKind[] = [
  "fullHeal",
  "physicalDrainLight",
  "physicalDrainFull",
  "healEvade",
  "superHeal",
  "lifeSteal",
];
const STRONG_KINDS: RPGCardKind[] = [
  "tripleAttack",
  "superMagic",
  "doubleAttack",
  "physicalMagicCombo",
  "physicalCritBoost",
  "doubleMagic",
  "tripleMagic",
  "superMagic",
  "reroll",
  "poison",
  "lifeSteal",
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function botChooseCard(bot: RPGCombatant, hand: RPGCard[]): RPGCard {
  const hpPercent = bot.hp / bot.maxHp;

  if (hpPercent < 0.35) {
    const healCards = hand.filter((c) => HEAL_KINDS.includes(c.kind));
    if (healCards.length > 0 && Math.random() < 0.65) return pickRandom(healCards);
  }

  if (hpPercent > 0.7) {
    const strongCards = hand.filter((c) => STRONG_KINDS.includes(c.kind));
    if (strongCards.length > 0 && Math.random() < 0.5) return pickRandom(strongCards);
  }

  return pickRandom(hand);
}

/** Só é relevante no modo 2 jogadores vs BOT: entre dois aliados vivos, o BOT
 *  tem uma leve preferência por bater em quem está com menos vida. */
export function botChooseTarget(aliveAllies: RPGCombatant[]): RPGCombatant {
  if (aliveAllies.length === 1) return aliveAllies[0];
  return pickRandom(aliveAllies);
}
