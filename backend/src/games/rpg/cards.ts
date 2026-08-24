import { RPGCard, RPGCardTemplate, RPGRarity } from "./types";

/**
 * Banco de cartas do Mini RPG.
 *
 * ÚNICAS são controladas por jogador: quando uma ÚNICA aparece na mão de um
 * jogador, ela fica marcada como usada para esse jogador e não pode voltar
 * para ele. O oponente continua podendo recebê-la.
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
    {
      id: "common_heal_evade",
      rarity: "common",
      kind: "healEvade",
      name: "Cura + Esquiva",
      emoji: "❤️💨",
      description: "Recupera um pouco de vida e aumenta sua chance de esquiva no próximo golpe.",
      healPercent: 0.08,
      evadeChanceGrant: 0.35,
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
    {
      id: "rare_double_magic",
      rarity: "rare",
      kind: "doubleMagic",
      name: "Magia Dupla",
      emoji: "🔮🔮",
      description: "Dois ataques mágicos consecutivos.",
      dmgMultiplier: 0.58,
      hits: 2,
    },
    {
      id: "rare_life_steal",
      rarity: "rare",
      kind: "lifeSteal",
      name: "Roubar Vida",
      emoji: "🩸",
      description: "Causa dano e rouba parte do dano causado para recuperar sua vida.",
      dmgMultiplier: 0.9,
      healPercent: 0.65,
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
    {
      id: "epic_poison",
      rarity: "epic",
      kind: "poison",
      name: "Veneno",
      emoji: "☠️",
      description: "Causa dano agora e aplica veneno por mais 2 rodadas.",
      dmgMultiplier: 0.75,
      poisonDamageMultiplier: 0.28,
      poisonRounds: 2,
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
      description: "Um ataque mágico devastador que ignora esquivas.",
      dmgMultiplier: 1.8,
      ignoreEvade: true,
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
    {
      id: "legendary_triple_magic",
      rarity: "legendary",
      kind: "tripleMagic",
      name: "Magia Tripla",
      emoji: "🔮🔮🔮",
      description: "Três ataques mágicos consecutivos.",
      dmgMultiplier: 0.52,
      hits: 3,
    },
    {
      id: "legendary_super_heal",
      rarity: "legendary",
      kind: "superHeal",
      name: "Super Cura",
      emoji: "💖",
      description: "Recupera uma grande quantidade de vida.",
      healPercent: 0.55,
    },
    {
      id: "legendary_swap",
      rarity: "legendary",
      kind: "swapHp",
      name: "Troca",
      emoji: "🔄",
      description: "Troca sua vida atual pela vida atual do inimigo.",
    },
    {
      id: "legendary_reroll",
      rarity: "legendary",
      kind: "reroll",
      name: "Rolagem",
      emoji: "🎲",
      description: "Ataca e ganha 3 rolagens extras, que podem ser usadas nos próximos rounds.",
      dmgMultiplier: 0.9,
      rerollCharges: 3,
    },
  ],

  unique: [
    {
      id: "unique_full_heal",
      rarity: "unique",
      kind: "fullHeal",
      name: "Recuperação Total",
      emoji: "❤️",
      description: "Recupera toda a vida e fica imune a dano durante este round.",
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
    {
      id: "unique_luck",
      rarity: "unique",
      kind: "luck",
      name: "Sorte",
      emoji: "🍀",
      description: "Aumenta a chance de receber cartas de raridade maior pelo resto da partida.",
    },
  ],
};

/**
 * Sorte aumenta as chances de raridades maiores sem alterar a chance fixa
 * de ÚNICO (1%). O bônus é retirado principalmente da faixa COMUM.
 */
function rollRarity(luckBonus = 0): RPGRarity {
  const roll = Math.random() * 100;
  const luck = Math.max(0, Math.min(0.25, luckBonus));
  const commonEnd = 70 - luck * 100;
  const rareEnd = 85 - luck * 50;

  if (roll < commonEnd) return "common";
  if (roll < rareEnd) return "rare";
  if (roll < 95) return "epic";
  if (roll < 99) return "legendary";
  return "unique";
}

export function rollCardTemplate(
  usedUniqueIds: string[],
  luckBonus = 0
): RPGCardTemplate {
  let rarity = rollRarity(luckBonus);
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

export function rollHand(
  round: number,
  combatantId: string,
  usedUniqueIds: string[],
  luckBonus = 0
): RPGCard[] {
  const hand: RPGCard[] = [];

  for (let slot = 0; slot < 3; slot++) {
    const template = rollCardTemplate(usedUniqueIds, luckBonus);

    if (template.rarity === "unique") {
      usedUniqueIds.push(template.id);
    }

    hand.push({
      ...template,
      instanceId: `${round}-${combatantId}-${slot}-${Math.random().toString(36).slice(2, 7)}`,
    });
  }

  return hand;
}
