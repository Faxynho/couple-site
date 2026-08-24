import { RPGClassDef, RPGClassId } from "./types";

/**
 * Banco de classes do Mini RPG. Estatísticas propositalmente simples (só
 * vida/ataque/defesa + uma passiva) — para adicionar uma classe nova, basta
 * acrescentar uma entrada aqui, nada mais no motor de batalha precisa mudar.
 */
export const RPG_CLASSES: Record<RPGClassId, RPGClassDef> = {
  warrior: {
    id: "warrior",
    name: "Guerreiro",
    emoji: "⚔️",
    maxHp: 120,
    atk: 18,
    def: 14,
    passiveName: "Couraça de Batalha",
    passiveDescription: "Recebe 15% a menos de dano físico.",
    passives: { physDamageTakenMult: 0.85 },
  },
  mage: {
    id: "mage",
    name: "Mago",
    emoji: "🧙",
    maxHp: 80,
    atk: 16,
    def: 8,
    passiveName: "Fluxo Arcano",
    passiveDescription: "Ataques mágicos causam 30% a mais de dano.",
    passives: { magicDamageDealtMult: 1.3 },
  },
  assassin: {
    id: "assassin",
    name: "Assassino",
    emoji: "🗡️",
    maxHp: 85,
    atk: 22,
    def: 8,
    passiveName: "Golpe Certeiro",
    passiveDescription: "+20% de chance de acertar críticos.",
    passives: { critChanceBonus: 0.2 },
  },
  archer: {
    id: "archer",
    name: "Arqueiro",
    emoji: "🏹",
    maxHp: 100,
    atk: 19,
    def: 11,
    passiveName: "Reflexos Ágeis",
    passiveDescription: "+15% de chance de esquivar de ataques.",
    passives: { evadeChanceBonus: 0.15 },
  },
  paladin: {
    id: "paladin",
    name: "Paladino",
    emoji: "🛡️",
    maxHp: 140,
    atk: 15,
    def: 18,
    passiveName: "Bênção da Muralha",
    passiveDescription: "Reduz uma quantidade fixa de dano em todo golpe recebido.",
    passives: { flatDamageReduction: 5 },
  },
  warlock: {
    id: "warlock",
    name: "Bruxo",
    emoji: "🔮",
    maxHp: 95,
    atk: 16,
    def: 10,
    passiveName: "Pacto Sombrio",
    passiveDescription: "Curas e efeitos especiais são 25% mais fortes.",
    passives: { specialEffectMult: 1.25 },
  },
  boss: {
    id: "boss",
    name: "Boss",
    emoji: "👹",
    maxHp: 340,
    atk: 27,
    def: 16,
    passiveName: "Senhor da Arena",
    passiveDescription: "Chefe especial equilibrado para enfrentar dois jogadores.",
    passives: { physDamageTakenMult: 0.92 },
  },
};

export const RPG_CLASS_IDS: RPGClassId[] = ["warrior", "mage", "assassin", "archer", "paladin", "warlock"];
