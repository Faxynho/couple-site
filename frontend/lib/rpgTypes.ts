export type RPGMode = "1v1" | "soloBot" | "duoBot";

export type RPGClassId =
  | "warrior"
  | "mage"
  | "assassin"
  | "archer"
  | "paladin"
  | "warlock"
  | "boss";

export type RPGRarity =
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "unique";

export type RPGCardKind =
  | "physical"
  | "magic"
  | "physicalDrainLight"
  | "physicalEvadeBuff"
  | "physicalMagicCombo"
  | "doubleAttack"
  | "physicalDrainFull"
  | "physicalCritBoost"
  | "tripleAttack"
  | "superMagic"
  | "curse"
  | "arrowRain"
  | "hammerSmash"
  | "assassinate"
  | "divineShield"
  | "physicalImmuneBuff"
  | "fullHeal"
  | "domination"
  | "critSupreme"
  | "evadeSupreme"
  | "healEvade"
  | "doubleMagic"
  | "tripleMagic"
  | "superHeal"
  | "poison"
  | "lifeSteal"
  | "swapHp"
  | "reroll"
  | "luck";

export interface RPGCard {
  id: string;
  instanceId: string;
  rarity: RPGRarity;
  kind: RPGCardKind;
  name: string;
  emoji: string;
  description: string;
  classRestriction?: RPGClassId;
}

export interface RPGCombatant {
  id: string;
  isBot: boolean;
  team: "a" | "b";
  classId: RPGClassId;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  alive: boolean;
  stunnedRounds: number;
  skippingThisRound: boolean;
  immuneNextHit: boolean;
  evadeBonusNextHit: number;
  permanentCritBonus: number;
  permanentEvadeBonus: number;
  hand: RPGCard[];
  chosenCardId: string | null;
  hasChosen: boolean;
  displayName?: string;
  immuneThisRound: boolean;
  luckBonus: number;
  poisonRoundsRemaining: number;
  poisonDamage: number;
  bleedRoundsRemaining: number;
  bleedDamage: number;
  curseRoundsRemaining: number;
  curseDamage: number;
  defenseMultiplier: number;
  defenseBuffStartRound: number;
  defenseBuffUntilRound: number;
  rerollCharges: number;
  usedUniqueCardIds: string[];
}

export type RPGRoundEventType =
  | "attack"
  | "heal"
  | "evade"
  | "immuneBlock"
  | "stunSkip"
  | "domination"
  | "buff"
  | "poison"
  | "statusTick"
  | "swap"
  | "reroll";

export interface RPGRoundEvent {
  actorId: string;
  targetId: string | null;
  type: RPGRoundEventType;
  cardId: string;
  amount?: number;
  isCrit?: boolean;
  status?: "poison" | "bleed" | "curse";
}

export type RPGPhase =
  | "intro"
  | "choosing"
  | "resolved"
  | "finished";

export interface RPGState {
  mode: RPGMode;
  round: number;
  maxRounds: number;
  phase: RPGPhase;
  order: string[];
  teamA: string[];
  teamB: string[];
  combatants: Record<string, RPGCombatant>;
  humanPlayerIds: string[];
  lastRoundEvents: RPGRoundEvent[];
  winnerTeam: "a" | "b" | "draw" | null;
  finishReason: "death" | "roundLimit" | null;
  introStartedAt: number;
  resolvedAt: number | null;
  startedAt: number;
  finishedAt: number | null;
}

export const RPG_MODES = {
  "1v1": {
    label: "1x1",
    emoji: "⚔️",
    hint: "você contra outro jogador",
  },

  soloBot: {
    label: "Solo vs BOT",
    emoji: "🤖",
    hint: "você sozinho contra o BOT",
  },

  duoBot: {
    label: "2 vs BOT",
    emoji: "🤝",
    hint: "você e seu par contra o BOT",
  },
} as const;

export const RPG_CLASSES: Record<
  RPGClassId,
  {
    name: string;
    emoji: string;
    passiveName: string;
    passiveDescription: string;
  }
> = {
  warrior: {
    name: "Guerreiro",
    emoji: "⚔️",
    passiveName: "Couraça de Batalha",
    passiveDescription: "Recebe 15% a menos de dano físico.",
  },

  mage: {
    name: "Mago",
    emoji: "🧙",
    passiveName: "Fluxo Arcano",
    passiveDescription: "Ataques mágicos causam 30% a mais de dano.",
  },

  assassin: {
    name: "Assassino",
    emoji: "🗡️",
    passiveName: "Golpe Certeiro",
    passiveDescription: "+20% de chance de crítico.",
  },

  archer: {
    name: "Arqueiro",
    emoji: "🏹",
    passiveName: "Reflexos Ágeis",
    passiveDescription: "+15% de chance de esquiva.",
  },

  paladin: {
    name: "Paladino",
    emoji: "🛡️",
    passiveName: "Bênção da Muralha",
    passiveDescription: "Tem defesa alta e reduz 3 de dano recebido em cada golpe.",
  },

  warlock: {
    name: "Bruxo",
    emoji: "🔮",
    passiveName: "Pacto Sombrio",
    passiveDescription: "Curas e efeitos especiais são 25% mais fortes.",
  },

  boss: {
    name: "Boss",
    emoji: "👹",
    passiveName: "Senhor da Arena",
    passiveDescription: "Chefe especial — mais vida, ataque e resistência.",
  },
};

/* =========================================================
   ESTILO DAS CARTAS POR RARIDADE
   ========================================================= */

export const RPG_RARITY_STYLES: Record<
  RPGRarity,
  {
    label: string;
    ring: string;
    glow: string;
    gradient: string;
    text: string;
    border: string;
    inner: string;
    pattern: string;
  }
> = {
  /* =======================================================
     COMUM
     ======================================================= */

  common: {
    label: "Comum",

    ring:
      "ring-1 ring-emerald-400/45",

    glow:
      "shadow-[0_4px_18px_rgba(52,211,153,0.14)]",

    gradient:
      "from-[#f5fbf5] via-[#e6f4e8] to-[#d7ecdc]",

    text:
      "text-emerald-600",

    border:
      "border-emerald-300/80",

    inner:
      "bg-transparent",

    pattern:
      "",
  },

  /* =======================================================
     RARO
     ======================================================= */

  rare: {
    label: "Raro",

    ring:
      "ring-2 ring-sky-400/45",

    glow:
      "shadow-[0_6px_22px_rgba(56,150,240,0.20)]",

    gradient:
      "from-[#f3f9ff] via-[#e4f1fb] to-[#d3e9f7]",

    text:
      "text-blue-600",

    border:
      "border-sky-400/80",

    inner:
      "bg-transparent",

    pattern:
      "",
  },

  /* =======================================================
     ÉPICO
     ======================================================= */

  epic: {
    label: "Épico",

    ring:
      "ring-2 ring-purple-400/55",

    glow:
      "shadow-[0_7px_28px_rgba(168,85,247,0.28)]",

    gradient:
      "from-[#fbf6ff] via-[#efe5fb] to-[#dfd1f2]",

    text:
      "text-purple-600",

    border:
      "border-purple-400/90",

    inner:
      "bg-transparent",

    pattern:
      "",
  },

  /* =======================================================
     LENDÁRIO
     ======================================================= */

  legendary: {
    label: "Lendário",

    ring:
      "ring-2 ring-orange-400/65",

    glow:
      "shadow-[0_9px_34px_rgba(245,158,11,0.38)]",

    gradient:
      "from-[#fffdf1] via-[#fff2c9] to-[#ffdca0]",

    text:
      "text-orange-600",

    border:
      "border-[2px] border-orange-400",

    inner:
      "bg-transparent",

    pattern:
      "",
  },

  /* =======================================================
     ÚNICO
     ======================================================= */

  unique: {
    label: "Único",

    ring:
      "ring-2 ring-fuchsia-400/65",

    glow:
      "shadow-[0_10px_42px_rgba(217,70,239,0.34)]",

    gradient:
      "from-[#ffeef8] via-[#f1eaff] to-[#fff4d9]",

    text:
      "bg-gradient-to-r from-fuchsia-600 via-violet-600 to-orange-500 bg-clip-text text-transparent",

    border:
      "border-[2px] border-fuchsia-400",

    inner:
      "bg-transparent",

    pattern:
      "",
  },
};

export function otherTeam(team: "a" | "b"): "a" | "b" {
  return team === "a" ? "b" : "a";
}