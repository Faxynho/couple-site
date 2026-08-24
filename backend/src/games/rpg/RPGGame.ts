import { GameEngine } from "../../types";
import { RPG_CLASSES, RPG_CLASS_IDS } from "./classes";
import { rollHand } from "./cards";
import { botChooseCard, botChooseTarget } from "./bot";
import {
  RPGAction,
  RPGCard,
  RPGClassPassives,
  RPGCombatant,
  RPGMode,
  RPGRoundEvent,
  RPGState,
} from "./types";

/**
 * Mini RPG: Duelo — 1v1, Solo vs BOT ou 2 jogadores vs BOT, tudo pelo mesmo
 * motor. A ideia central: em vez de tratar cada modo separadamente, todo
 * combatente (humano ou BOT) pertence a um "time" ("a" ou "b"); quem estiver
 * do lado oposto ao seu é seu alvo. Isso cobre os três modos sem nenhum
 * caso especial extra:
 *   - 1v1: time A = [jogador1], time B = [jogador2]
 *   - Solo vs BOT: time A = [jogador1], time B = ["BOT"]
 *   - 2 vs BOT: time A = [jogador1, jogador2], time B = ["BOT"]
 */

const MIN_DAMAGE = 4;
const BASE_CRIT_CHANCE = 0.08;
const CRIT_MULTIPLIER = 1.8;
const BASE_EVADE_CHANCE = 0.05;
const MAX_ROUNDS = 30;
const DOMINATION_ROUNDS = 2;
const UNIQUE_CRIT_BONUS = 0.35;
const UNIQUE_EVADE_BONUS = 0.35;

/** Pequena janela para o time revelar as classes sorteadas antes da 1ª rodada. */
export const RPG_INTRO_DURATION_MS = 3200;
/** Pausa depois de resolver uma rodada, para dar tempo das animações de dano acontecerem. */
export const RPG_RESOLVE_PAUSE_MS = 2600;

const VALID_MODES: RPGMode[] = ["1v1", "soloBot", "duoBot"];
export function isValidRPGMode(value: string): value is RPGMode {
  return (VALID_MODES as string[]).includes(value);
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resolveTeams(mode: RPGMode, humanIds: string[]): { teamA: string[]; teamB: string[] } {
  const ids = humanIds.slice(0, 2);
  if (mode === "duoBot") {
    return { teamA: ids.length > 0 ? ids : ["BOT"], teamB: ["BOT"] };
  }
  if (mode === "1v1" && ids.length >= 2) {
    return { teamA: [ids[0]], teamB: [ids[1]] };
  }
  // "soloBot", ou fallback de "1v1"/"duoBot" sem um segundo humano conectado.
  return { teamA: [ids[0] ?? "BOT"], teamB: ["BOT"] };
}

function createCombatant(id: string, team: "a" | "b", classId: keyof typeof RPG_CLASSES): RPGCombatant {
  const def = RPG_CLASSES[classId];
  return {
    id,
    isBot: id === "BOT",
    team,
    classId,
    maxHp: def.maxHp,
    hp: def.maxHp,
    atk: def.atk,
    def: def.def,
    alive: true,
    stunnedRounds: 0,
    skippingThisRound: false,
    immuneNextHit: false,
    evadeBonusNextHit: 0,
    permanentCritBonus: 0,
    permanentEvadeBonus: 0,
    hand: [],
    chosenCardId: null,
  };
}

function teamHpPercent(state: RPGState, ids: string[]): number {
  let hp = 0;
  let max = 0;
  for (const id of ids) {
    const c = state.combatants[id];
    hp += Math.max(0, c.hp);
    max += c.maxHp;
  }
  return max > 0 ? hp / max : 0;
}

function finishByRoundLimit(state: RPGState) {
  const pctA = teamHpPercent(state, state.teamA);
  const pctB = teamHpPercent(state, state.teamB);
  state.phase = "finished";
  state.finishReason = "roundLimit";
  state.winnerTeam = pctA === pctB ? "draw" : pctA > pctB ? "a" : "b";
  state.finishedAt = Date.now();
}

function dealHandsForRound(state: RPGState) {
  for (const id of state.order) {
    const c = state.combatants[id];
    c.chosenCardId = null;
    if (!c.alive) {
      c.hand = [];
      c.skippingThisRound = false;
      continue;
    }
    if (c.stunnedRounds > 0) {
      c.stunnedRounds -= 1;
      c.skippingThisRound = true;
      c.hand = [];
      continue;
    }
    c.skippingThisRound = false;
    c.hand = rollHand(state.round, id, state.usedUniqueCardIds);
  }
}

function allRequiredHumansChosen(state: RPGState): boolean {
  for (const id of state.order) {
    const c = state.combatants[id];
    if (!c.alive || c.isBot || c.skippingThisRound) continue;
    if (!c.chosenCardId) return false;
  }
  return true;
}

function findCard(c: RPGCombatant, cardInstanceId: string): RPGCard | null {
  return c.hand.find((card) => card.instanceId === cardInstanceId) ?? null;
}

function pickTarget(actor: RPGCombatant, state: RPGState, enemyIds: string[]): RPGCombatant | null {
  const aliveEnemies = enemyIds.map((id) => state.combatants[id]).filter((c) => c.alive);
  if (aliveEnemies.length === 0) return null;
  if (aliveEnemies.length === 1) return aliveEnemies[0];
  return actor.isBot ? botChooseTarget(aliveEnemies) : aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
}

/** Um golpe individual (usado por ataques simples e por cada hit dos combos). Retorna
 *  quanto dano de fato foi aplicado (0 se esquivou ou foi bloqueado pela imunidade). */
function performHit(
  actor: RPGCombatant,
  target: RPGCombatant,
  cardId: string,
  dmgMultiplier: number,
  damageType: "physical" | "magic",
  extraCritChance: number,
  events: RPGRoundEvent[]
): number {
  if (target.immuneNextHit) {
    target.immuneNextHit = false;
    events.push({ actorId: actor.id, targetId: target.id, type: "immuneBlock", cardId });
    return 0;
  }

  const targetPassives: RPGClassPassives = RPG_CLASSES[target.classId].passives;
  const evadeChance =
    BASE_EVADE_CHANCE + (targetPassives.evadeChanceBonus ?? 0) + target.permanentEvadeBonus + target.evadeBonusNextHit;
  target.evadeBonusNextHit = 0;
  if (Math.random() < evadeChance) {
    events.push({ actorId: actor.id, targetId: target.id, type: "evade", cardId });
    return 0;
  }

  const actorPassives: RPGClassPassives = RPG_CLASSES[actor.classId].passives;
  let base = actor.atk * dmgMultiplier;
  if (damageType === "magic") base *= actorPassives.magicDamageDealtMult ?? 1;

  let dmg = base - target.def * 0.5 - (targetPassives.flatDamageReduction ?? 0);
  if (damageType === "physical") dmg *= targetPassives.physDamageTakenMult ?? 1;
  dmg = Math.max(MIN_DAMAGE, Math.round(dmg));

  const critChance = BASE_CRIT_CHANCE + (actorPassives.critChanceBonus ?? 0) + actor.permanentCritBonus + extraCritChance;
  const isCrit = Math.random() < critChance;
  if (isCrit) dmg = Math.round(dmg * CRIT_MULTIPLIER);

  target.hp = Math.max(0, target.hp - dmg);
  if (target.hp <= 0) target.alive = false;

  events.push({ actorId: actor.id, targetId: target.id, type: "attack", cardId, amount: dmg, isCrit });
  return dmg;
}

function applyCard(actor: RPGCombatant, card: RPGCard, state: RPGState, enemyIds: string[], events: RPGRoundEvent[]) {
  const passives = RPG_CLASSES[actor.classId].passives;
  const healMult = passives.specialEffectMult ?? 1;

  switch (card.kind) {
    case "fullHeal": {
      const healed = actor.maxHp - actor.hp;
      actor.hp = actor.maxHp;
      events.push({ actorId: actor.id, targetId: actor.id, type: "heal", cardId: card.id, amount: healed });
      return;
    }
    case "critSupreme": {
      actor.permanentCritBonus += UNIQUE_CRIT_BONUS;
      events.push({ actorId: actor.id, targetId: actor.id, type: "buff", cardId: card.id });
      return;
    }
    case "evadeSupreme": {
      actor.permanentEvadeBonus += UNIQUE_EVADE_BONUS;
      events.push({ actorId: actor.id, targetId: actor.id, type: "buff", cardId: card.id });
      return;
    }
    case "domination": {
      const target = pickTarget(actor, state, enemyIds);
      if (!target) return;
      target.stunnedRounds = Math.max(target.stunnedRounds, DOMINATION_ROUNDS);
      events.push({ actorId: actor.id, targetId: target.id, type: "domination", cardId: card.id });
      return;
    }
    default:
      break;
  }

  // Daqui pra baixo: todas as cartas de ataque.
  const target = pickTarget(actor, state, enemyIds);
  if (!target) return;
  const mult = card.dmgMultiplier ?? 1;

  if (card.kind === "physicalMagicCombo") {
    performHit(actor, target, card.id, mult, "physical", 0, events);
    if (target.alive) performHit(actor, target, card.id, card.secondaryDmgMultiplier ?? 0.5, "magic", 0, events);
    return;
  }

  if (card.kind === "doubleAttack" || card.kind === "tripleAttack") {
    const hits = card.hits ?? 2;
    for (let i = 0; i < hits && target.alive; i++) {
      performHit(actor, target, card.id, mult, "physical", 0, events);
    }
    return;
  }

  const damageType = card.kind === "magic" || card.kind === "superMagic" ? "magic" : "physical";
  const critBonus = card.critChanceBonus ?? 0;
  const dealt = performHit(actor, target, card.id, mult, damageType, critBonus, events);

  if ((card.kind === "physicalDrainLight" || card.kind === "physicalDrainFull") && dealt > 0) {
    const healed = Math.round(actor.maxHp * (card.healPercent ?? 0) * healMult);
    actor.hp = Math.min(actor.maxHp, actor.hp + healed);
    events.push({ actorId: actor.id, targetId: actor.id, type: "heal", cardId: card.id, amount: healed });
  }

  if (card.kind === "physicalEvadeBuff") {
    actor.evadeBonusNextHit = Math.max(actor.evadeBonusNextHit, (card.evadeChanceGrant ?? 0) * healMult);
  }

  if (card.kind === "physicalImmuneBuff") {
    actor.immuneNextHit = true;
  }
}

function resolveRound(state: RPGState) {
  // 1) O BOT escolhe sua carta agora (a mão dele já foi dada em dealHandsForRound).
  for (const id of state.order) {
    const c = state.combatants[id];
    if (c.isBot && c.alive && !c.skippingThisRound && !c.chosenCardId) {
      c.chosenCardId = botChooseCard(c, c.hand).instanceId;
    }
  }

  const events: RPGRoundEvent[] = [];

  // 2) Executa a ação de cada combatente vivo, na ordem fixa da partida.
  for (const id of state.order) {
    const c = state.combatants[id];
    if (!c.alive) continue;
    if (c.skippingThisRound) {
      events.push({ actorId: id, targetId: null, type: "stunSkip", cardId: "stun" });
      continue;
    }
    const card = c.chosenCardId ? findCard(c, c.chosenCardId) : null;
    if (!card) continue;
    const enemyIds = c.team === "a" ? state.teamB : state.teamA;
    applyCard(c, card, state, enemyIds, events);
  }

  state.lastRoundEvents = events;

  const aliveA = state.teamA.some((id) => state.combatants[id].alive);
  const aliveB = state.teamB.some((id) => state.combatants[id].alive);
  if (!aliveA || !aliveB) {
    state.phase = "finished";
    state.finishReason = "death";
    state.winnerTeam = aliveA ? "a" : aliveB ? "b" : "draw";
    state.finishedAt = Date.now();
    return;
  }

  if (state.round >= state.maxRounds) {
    finishByRoundLimit(state);
    return;
  }

  state.phase = "resolved";
  state.resolvedAt = Date.now();
}

/** Distribui mãos novas para a rodada e, se ninguém humano precisar escolher
 *  (ex.: só o BOT ficou vivo pra agir, ou todos os humanos estão atordoados),
 *  resolve a rodada na hora em vez de ficar esperando por sempre. */
function dealAndMaybeResolve(state: RPGState) {
  dealHandsForRound(state);
  state.phase = "choosing";
  state.lastRoundEvents = [];
  if (allRequiredHumansChosen(state)) {
    resolveRound(state);
  }
}

export class RPGGame implements GameEngine<RPGState, RPGAction> {
  readonly id = "rpg" as const;

  createInitialState(options?: Record<string, unknown>): RPGState {
    const rawMode = typeof options?.mode === "string" ? options.mode : "soloBot";
    const mode = isValidRPGMode(rawMode) ? rawMode : "soloBot";
    const humanPlayerIds = Array.isArray(options?.playerIds) ? (options!.playerIds as string[]) : [];

    const { teamA, teamB } = resolveTeams(mode, humanPlayerIds);
    const order = [...teamA, ...teamB];
    const classIds = shuffle([...RPG_CLASS_IDS]).slice(0, order.length);

    const combatants: RPGState["combatants"] = {};
    order.forEach((id, i) => {
      combatants[id] = createCombatant(id, teamA.includes(id) ? "a" : "b", classIds[i]);
    });

    return {
      mode,
      round: 1,
      maxRounds: MAX_ROUNDS,
      phase: "intro",
      order,
      teamA,
      teamB,
      combatants,
      humanPlayerIds,
      usedUniqueCardIds: [],
      lastRoundEvents: [],
      winnerTeam: null,
      finishReason: null,
      introStartedAt: Date.now(),
      resolvedAt: null,
      startedAt: Date.now(),
      finishedAt: null,
    };
  }

  applyAction(state: RPGState, action: RPGAction, playerId: string): RPGState {
    if (state.phase === "finished") return state;

    if (action.type === "beginRound") {
      if (state.phase !== "intro") return state;
      const next = structuredClone(state);
      dealAndMaybeResolve(next);
      return next;
    }

    if (action.type === "advanceRound") {
      if (state.phase !== "resolved") return state;
      const next = structuredClone(state);
      next.round += 1;
      if (next.round > next.maxRounds) {
        finishByRoundLimit(next);
        return next;
      }
      dealAndMaybeResolve(next);
      return next;
    }

    if (action.type === "selectCard") {
      if (state.phase !== "choosing") return state;
      const combatant = state.combatants[playerId];
      if (!combatant || combatant.isBot || !combatant.alive || combatant.skippingThisRound) return state;
      if (combatant.chosenCardId) return state;
      const card = findCard(combatant, action.cardInstanceId);
      if (!card) return state;

      const next = structuredClone(state);
      next.combatants[playerId].chosenCardId = card.instanceId;
      if (allRequiredHumansChosen(next)) {
        resolveRound(next);
      }
      return next;
    }

    return state;
  }

  isSolved(state: RPGState): boolean {
    return state.phase === "finished";
  }

  reset(state: RPGState): RPGState {
    return this.createInitialState({ mode: state.mode, playerIds: state.humanPlayerIds });
  }
}
