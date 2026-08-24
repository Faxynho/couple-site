/**
 * Tipos compartilhados do Mini RPG: Duelo.
 */
export type RPGMode = "1v1" | "soloBot" | "duoBot";

export type RPGClassId =
  | "warrior"
  | "mage"
  | "assassin"
  | "archer"
  | "paladin"
  | "warlock"
  | "boss";

export interface RPGClassPassives {
  physDamageTakenMult?: number;
  magicDamageDealtMult?: number;
  critChanceBonus?: number;
  evadeChanceBonus?: number;
  flatDamageReduction?: number;
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
  ignoreEvade?: boolean;
  poisonDamageMultiplier?: number;
  poisonRounds?: number;
  rerollCharges?: number;
}

export interface RPGCard extends RPGCardTemplate {
  instanceId: string;
}

export interface RPGCombatant {
  id: string;
  isBot: boolean;
  team: "a" | "b";
  classId: RPGClassId;
  displayName?: string;
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
  luckBonus: number;
  poisonRoundsRemaining: number;
  poisonDamage: number;
  rerollCharges: number;
  usedUniqueCardIds: string[];
  hand: RPGCard[];
  chosenCardId: string | null;
  hasChosen: boolean;
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
  | "swap"
  | "reroll";

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

export type RPGAction =
  | { type: "selectCard"; cardInstanceId: string }
  | { type: "rerollHand" }
  | { type: "beginRound" }
  | { type: "advanceRound" };
