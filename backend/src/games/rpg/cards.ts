import { RPGCard, RPGCardTemplate, RPGRarity } from "./types";

/**
 * Banco de cartas do Mini RPG, organizado por raridade — para adicionar uma
 * carta nova, basta empurrar um item no array da raridade certa em
 * CARD_TEMPLATES; o sorteio (rollCardTemplate/rollHand) já lida com o resto.
 */
export const CARD_TEMPLATES: Record<RPGRarity, RPGCardTemplate[]> = {
  common: [
    {
      id: "common_physical",
      rarity: "common",
      kind: "physical",
      name: "Ataque Normal",
      emoji: "⚔️",
      description: "Ataque físico com o poder de ataque da sua classe.",
      dmgMultiplier: 1,
    },
    {
      id: "common_magic",
      rarity: "common",
      kind: "magic",
      name: "Ataque Mágico",
      emoji: "🔮",
      description: "Ataque mágico — classes com bônus mágico causam mais dano.",
      dmgMultiplier: 0.95,
    },
  ],

  rare: [
    {
      id: "rare_atk_heal",
      rarity: "rare",
      kind: "physicalDrainLight",
      name: "Ataque + Vida",
      emoji: "⚔️❤️",
      description: "Causa menos dano, mas recupera um pouco da sua vida.",
      dmgMultiplier: 0.7,
      healPercent: 0.12,
    },
    {
      id: "rare_atk_evade",
      rarity: "rare",
      kind: "physicalEvadeBuff",
      name: "Ataque + Esquiva",
      emoji: "⚔️💨",
      description: "Causa menos dano, mas te dá chance de esquivar do próximo golpe.",
      dmgMultiplier: 0.7,
      evadeChanceGrant: 0.5,
    },
  ],

  epic: [
    {
      id: "epic_atk_magic",
      rarity: "epic",
      kind: "physicalMagicCombo",
      name: "Ataque + Magia",
      emoji: "⚔️🔮",
      description: "Ataque físico acompanhado de dano mágico adicional.",
      dmgMultiplier: 0.8,
      secondaryDmgMultiplier: 0.5,
    },
    {
      id: "epic_double_attack",
      rarity: "epic",
      kind: "doubleAttack",
      name: "Dois Ataques",
      emoji: "⚔️⚔️",
      description: "Dois ataques consecutivos, com o dano dividido entre eles.",
      dmgMultiplier: 0.55,
      hits: 2,
    },
    {
      id: "epic_atk_heal_full",
      rarity: "epic",
      kind: "physicalDrainFull",
      name: "Ataque + Vida",
      emoji: "⚔️❤️",
      description: "Dano cheio, e ainda recupera uma parte da sua vida.",
      dmgMultiplier: 1,
      healPercent: 0.15,
    },
    {
      id: "epic_atk_crit",
      rarity: "epic",
      kind: "physicalCritBoost",
      name: "Ataque + Crítico",
      emoji: "⚔️🎯",
      description: "Ataque com chance de crítico bem maior que o normal.",
      dmgMultiplier: 1,
      critChanceBonus: 0.35,
    },
  ],

  legendary: [
    {
      id: "legendary_triple_attack",
      rarity: "legendary",
      kind: "tripleAttack",
      name: "Triplo Ataque",
      emoji: "⚔️⚔️⚔️",
      description: "Três ataques consecutivos contra o inimigo.",
      dmgMultiplier: 0.4,
      hits: 3,
    },
    {
      id: "legendary_super_magic",
      rarity: "legendary",
      kind: "superMagic",
      name: "Super Magia",
      emoji: "☄️",
      description: "Um ataque mágico devastador.",
      dmgMultiplier: 1.8,
    },
    {
      id: "legendary_atk_immunity",
      rarity: "legendary",
      kind: "physicalImmuneBuff",
      name: "Ataque + Imunidade",
      emoji: "🛡️⚔️",
      description: "Ataque normal, e te deixa imune ao próximo golpe recebido.",
      dmgMultiplier: 1,
    },
  ],

  unique: [
    {
      id: "unique_full_heal",
      rarity: "unique",
      kind: "fullHeal",
      name: "Recuperação Total",
      emoji: "❤️",
      description: "Recupera toda a vida perdida — volta ao máximo.",
    },
    {
      id: "unique_domination",
      rarity: "unique",
      kind: "domination",
      name: "Dominação",
      emoji: "⏭️",
      description: "O inimigo fica impedido de jogar nas próximas 2 rodadas.",
    },
    {
      id: "unique_crit_supreme",
      rarity: "unique",
      kind: "critSupreme",
      name: "Crítico Supremo",
      emoji: "🎯",
      description: "Aumenta muito sua chance de crítico pelo resto da partida.",
    },
    {
      id: "unique_evade_supreme",
      rarity: "unique",
      kind: "evadeSupreme",
      name: "Evasão Suprema",
      emoji: "👻",
      description: "Aumenta muito sua chance de esquiva pelo resto da partida.",
    },
  ],
};

/** Probabilidades de raridade — somam exatamente 100. */
function rollRarity(): RPGRarity {
  const roll = Math.random() * 100;
  if (roll < 70) return "common";
  if (roll < 85) return "rare"; // 70 + 15
  if (roll < 95) return "epic"; // 85 + 10
  if (roll < 99) return "legendary"; // 95 + 4
  return "unique"; // últimos 1%
}

/**
 * Sorteia UM molde de carta respeitando a raridade sorteada. Se a raridade
 * sorteada for ÚNICO mas todas as cartas únicas já apareceram nesta
 * partida, cai para LENDÁRIO em vez de travar o sorteio.
 */
export function rollCardTemplate(usedUniqueIds: string[]): RPGCardTemplate {
  let rarity = rollRarity();
  let pool = CARD_TEMPLATES[rarity];
  if (rarity === "unique") {
    const available = pool.filter((c) => !usedUniqueIds.includes(c.id));
    if (available.length === 0) {
      rarity = "legendary";
      pool = CARD_TEMPLATES.legendary;
    } else {
      pool = available;
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Sorteia uma mão de 3 cartas para um combatente numa rodada. Muta
 * `usedUniqueIds` in-place assim que uma carta ÚNICA é sorteada — ela some
 * do sorteio imediatamente, mesmo antes de ser escolhida/jogada.
 */
export function rollHand(round: number, combatantId: string, usedUniqueIds: string[]): RPGCard[] {
  const hand: RPGCard[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const template = rollCardTemplate(usedUniqueIds);
    if (template.rarity === "unique") usedUniqueIds.push(template.id);
    hand.push({ ...template, instanceId: `${round}-${combatantId}-${slot}` });
  }
  return hand;
}
