/**
 * Tipos compartilhados do Mini RPG: Duelo.
 *
 * Ficam isolados num arquivo próprio (sem lógica) para que classes.ts,
 * cards.ts, bot.ts e RPGGame.ts possam todos importar daqui sem criar
 * dependência circular entre si. Isso também é o que torna fácil adicionar
 * uma classe ou carta nova sem tocar no motor de batalha: só se mexe em
 * classes.ts/cards.ts, os tipos aqui já dão suporte.
 */

export type RPGMode = "1v1" | "soloBot" | "duoBot";

export type RPGClassId = "warrior" | "mage" | "assassin" | "archer" | "paladin" | "warlock";

/** Modificadores de passiva de classe — cada campo é opcional; um valor
 *  ausente equivale ao "neutro" (0 para bônus aditivos, 1 para multiplicadores). */
export interface RPGClassPassives {
  /** Multiplica o dano físico RECEBIDO (ex.: 0.85 = -15% de dano físico sofrido). */
  physDamageTakenMult?: number;
  /** Multiplica o dano mágico CAUSADO (ex.: 1.3 = +30% de dano mágico causado). */
  magicDamageDealtMult?: number;
  /** Bônus somado à chance de crítico ao atacar (0.2 = +20 pontos percentuais). */
  critChanceBonus?: number;
  /** Bônus somado à chance de esquiva ao ser atacado. */
  evadeChanceBonus?: number;
  /** Reduz uma quantidade fixa de dano recebido (antes de virar crítico). */
  flatDamageReduction?: number;
  /** Multiplica cura e potência de efeitos especiais causados por essa classe. */
  specialEffectMult?: number;
}

export interface RPGClassDef {
  id: RPGClassId;
  name: string;
  emoji: string;
  maxHp: number;
  atk: number;
  def: number;
  passiveName: string;
  passiveDescription: string;
  passives: RPGClassPassives;
}

export type RPGRarity = "common" | "rare" | "epic" | "legendary" | "unique";

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
  | "physicalImmuneBuff"
  | "fullHeal"
  | "domination"
  | "critSupreme"
  | "evadeSupreme";

/** Definição estática de uma carta (o "molde" — o que existe no banco de cartas). */
export interface RPGCardTemplate {
  id: string;
  rarity: RPGRarity;
  kind: RPGCardKind;
  name: string;
  emoji: string;
  description: string;
  dmgMultiplier?: number;
  secondaryDmgMultiplier?: number;
  healPercent?: number;
  critChanceBonus?: number;
  evadeChanceGrant?: number;
  hits?: number;
}

/** Uma carta já sorteada, dentro da mão de um combatente numa rodada específica. */
export interface RPGCard extends RPGCardTemplate {
  instanceId: string;
}

export interface RPGCombatant {
  id: string; // socket.id do jogador, ou "BOT"
  isBot: boolean;
  team: "a" | "b";
  classId: RPGClassId;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  alive: boolean;
  /** Quantas próximas rodadas (incluindo a atual, se > 0) esse combatente fica impedido de jogar. */
  stunnedRounds: number;
  /** Verdadeiro só durante a rodada em que ele está de fato pulando a vez (consumido de stunnedRounds). */
  skippingThisRound: boolean;
  /** Bloqueia por completo o próximo golpe recebido (Ataque + Imunidade). */
  immuneNextHit: boolean;
  /** Bônus de chance de esquiva só para o próximo golpe recebido (Ataque + Esquiva). */
  evadeBonusNextHit: number;
  /** Bônus permanentes (cartas ÚNICAS Crítico/Evasão Supremos) — valem o resto da partida. */
  permanentCritBonus: number;
  permanentEvadeBonus: number;
  hand: RPGCard[];
  chosenCardId: string | null;
}

export type RPGRoundEventType =
  | "attack"
  | "heal"
  | "evade"
  | "immuneBlock"
  | "stunSkip"
  | "domination"
  | "buff";

export interface RPGRoundEvent {
  actorId: string;
  targetId: string | null;
  type: RPGRoundEventType;
  cardId: string;
  amount?: number;
  isCrit?: boolean;
}

export type RPGPhase = "intro" | "choosing" | "resolved" | "finished";

export interface RPGState {
  mode: RPGMode;
  round: number;
  maxRounds: number;
  phase: RPGPhase;
  /** Ordem fixa de processamento/exibição dos combatentes (definida na criação da partida). */
  order: string[];
  teamA: string[];
  teamB: string[];
  combatants: Record<string, RPGCombatant>;
  /** Ids humanos conectados na criação da partida, na ordem original — usado por "jogar de novo". */
  humanPlayerIds: string[];
  /** Templates de carta ÚNICA já sorteados nesta partida (não podem aparecer de novo). */
  usedUniqueCardIds: string[];
  lastRoundEvents: RPGRoundEvent[];
  winnerTeam: "a" | "b" | "draw" | null;
  finishReason: "death" | "roundLimit" | null;
  introStartedAt: number;
  resolvedAt: number | null;
  startedAt: number;
  finishedAt: number | null;
}

export type RPGAction =
  | { type: "selectCard"; cardInstanceId: string }
  // Emitidas pelo relógio do servidor (ver rpgScheduler em socketHandlers) —
  // nunca pelo cliente.
  | { type: "beginRound" }
  | { type: "advanceRound" };
