import { RPGCard, RPGCardTemplate, RPGClassId, RPGRarity } from "./types";

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
      description: "Ataque físico comum.",
      dmgMultiplier: 1,
    },
    {
      id: "common_magic",
      rarity: "common",
      kind: "magic",
      name: "Ataque Mágico",
      emoji: "🔮",
      description: "Ataque mágico.",
      dmgMultiplier: 0.95,
    },
    {
      id: "common_heal_evade",
      rarity: "common",
      kind: "healEvade",
      name: "Cura + Esquiva",
      emoji: "❤️💨",
      description: "Recupera vida e aumenta chance de esquiva.",
      healPercent: 0.10,
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
      description: "Causa menos dano, mas te dá chance de esquivar.",
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
      dmgMultiplier: 0.95,
      hits: 2,
    },
    {
      id: "rare_life_steal",
      rarity: "rare",
      kind: "lifeSteal",
      name: "Roubar Vida",
      emoji: "🩸",
      description: "Causa dano e rouba vida.",
      dmgMultiplier: 0.9,
      healPercent: 0.75,
    },
  ],

  epic: [
    {
      id: "epic_atk_magic",
      rarity: "epic",
      kind: "physicalMagicCombo",
      name: "Ataque + Magia",
      emoji: "⚔️🔮",
      description: "Ataque físico e mágico.",
      dmgMultiplier: 1,
      secondaryDmgMultiplier: 0.85,
    },
    {
      id: "epic_double_attack",
      rarity: "epic",
      kind: "doubleAttack",
      name: "Dois Ataques",
      emoji: "⚔️⚔️",
      description: "Dois ataques consecutivos.",
      dmgMultiplier: 1,
      hits: 2,
    },
    {
      id: "epic_atk_heal_full",
      rarity: "epic",
      kind: "physicalDrainFull",
      name: "Ataque + Vida",
      emoji: "⚔️❤️",
      description: "Dano cheio e recupera vida.",
      dmgMultiplier: 1,
      healPercent: 0.25,
    },
    {
      id: "epic_atk_crit",
      rarity: "epic",
      kind: "physicalCritBoost",
      name: "Ataque + Crítico",
      emoji: "⚔️🎯",
      description: "Ataque com chance de crítico.",
      dmgMultiplier: 1,
      critChanceBonus: 0.45,
    },
    {
      id: "epic_poison",
      rarity: "epic",
      kind: "poison",
      name: "Veneno",
      emoji: "☠️",
      description: "Causa dano eaplica veneno por mais 2 rodadas.",
      dmgMultiplier: 0.75,
      poisonDamageMultiplier: 0.75,
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
      description: "Três ataques consecutivos.",
      dmgMultiplier: 1,
      hits: 3,
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
      dmgMultiplier: 0.95,
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
      description: "Ataca e ganha 3 rolagens extras.",
      dmgMultiplier: 0.9,
      rerollCharges: 3,
    },
  ],

  unique: [
    {
      id: "unique_super_magic",
      rarity: "unique",
      kind: "superMagic",
      name: "Super Magia",
      emoji: "☄️",
      description: "Um ataque mágico devastador que ignora esquivas.",
      dmgMultiplier: 2,
      ignoreEvade: true,
      classRestriction: "mage",
    },
    {
      id: "unique_curse",
      rarity: "unique",
      kind: "curse",
      name: "Maldição",
      emoji: "🕯️",
      description: "Causa dano contínuo de multiplicador por 5 rodadas.",
      curseDamageMultiplier: 0.85,
      curseRounds: 5,
      classRestriction: "warlock",
    },
    {
      id: "unique_arrow_rain",
      rarity: "unique",
      kind: "arrowRain",
      name: "Chuva de Flechas",
      emoji: "🏹🏹🏹",
      description: "Realiza 5 ataques.",
      dmgMultiplier: 1,
      ignoreEvade: true,
      hits: 5,
      classRestriction: "archer",
    },
    {
      id: "unique_hammer_smash",
      rarity: "unique",
      kind: "hammerSmash",
      name: "Marretada",
      emoji: "🔨",
      description: "Um golpe poderoso equivalente a 4 ataques.",
      dmgMultiplier: 4,
      ignoreEvade: true,
      classRestriction: "warrior",
    },
    {
      id: "unique_assassinate",
      rarity: "unique",
      kind: "assassinate",
      name: "Assassinar",
      emoji: "🗡️",
      description: "Golpeia e causa sangramento por 3 rodadas.",
      dmgMultiplier: 3,
      bleedDamageMultiplier: 1,
      bleedRounds: 3,
      ignoreEvade: true,
      classRestriction: "assassin",
    },
    {
      id: "unique_divine_shield",
      rarity: "unique",
      kind: "divineShield",
      name: "Escudo Divino",
      emoji: "🛡️✨",
      description: "Aumenta sua defesa em 50% pelos próximos 3 rounds.",
      defenseMultiplier: 1.5,
      defenseRounds: 3,
      classRestriction: "paladin",
    },
    {
      id: "unique_full_heal",
      rarity: "unique",
      kind: "fullHeal",
      name: "Recuperação Total",
      emoji: "❤️",
      description: "Recupera toda a vida.",
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
 * Sem Sorte: 35% comum, 25% raro, 20% épico, 15% lendário, 5% único.
 * Com Sorte: 25% comum, 25% raro, 25% épico, 15% lendário, 10% único.
 */
function rollRarity(luckBonus = 0): RPGRarity {
  const roll = Math.random() * 100;
  const hasLuck = luckBonus > 0;

  // Sem Sorte: 35% comum, 25% raro, 20% épico, 15% lendário, 5% único.
  // Com Sorte: 25% comum, 25% raro, 25% épico, 15% lendário, 10% único.
  if (!hasLuck) {
    if (roll < 35) return "common";
    if (roll < 60) return "rare";
    if (roll < 80) return "epic";
    if (roll < 95) return "legendary";
    return "unique";
  }

  if (roll < 25) return "common";
  if (roll < 50) return "rare";
  if (roll < 75) return "epic";
  if (roll < 90) return "legendary";
  return "unique";
}

export function rollCardTemplate(
  usedUniqueIds: string[],
  classId: RPGClassId,
  luckBonus = 0
): RPGCardTemplate {
  let rarity = rollRarity(luckBonus);
  let pool = CARD_TEMPLATES[rarity];

  if (rarity === "unique") {
    const available = pool.filter(
      (c) =>
        !usedUniqueIds.includes(c.id) &&
        (!c.classRestriction || c.classRestriction === classId)
    );

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
  classId: RPGClassId,
  luckBonus = 0
): RPGCard[] {
  const hand: RPGCard[] = [];

  for (let slot = 0; slot < 3; slot++) {
    const template = rollCardTemplate(usedUniqueIds, classId, luckBonus);

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
