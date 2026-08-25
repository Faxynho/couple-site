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

const MIN_DAMAGE = 4;
const BASE_CRIT_CHANCE = 0.08;
const CRIT_MULTIPLIER = 1.8;
const BASE_EVADE_CHANCE = 0.05;
const MAX_ROUNDS = 30;
const DOMINATION_ROUNDS = 2;
const UNIQUE_CRIT_BONUS = 0.35;
const UNIQUE_EVADE_BONUS = 0.35;
const LUCK_BONUS = 0.10;

export const RPG_INTRO_DURATION_MS = 3200;
export const RPG_RESOLVE_PAUSE_MS = 2600;

const VALID_MODES: RPGMode[] = ["1v1", "soloBot", "duoBot"];

const BOSS_PROFILES = [
  { name: "Gorak, o Devastador", emoji: "👹", maxHp: 340, atk: 27, def: 16 },
  { name: "Varkhan, Senhor das Cinzas", emoji: "🐉", maxHp: 360, atk: 25, def: 17 },
  { name: "Mordrak, o Imortal", emoji: "💀", maxHp: 325, atk: 29, def: 15 },
  { name: "Ignar, Rei do Inferno", emoji: "🔥", maxHp: 350, atk: 26, def: 16 },
  { name: "Nox, Devorador de Almas", emoji: "🌑", maxHp: 330, atk: 28, def: 16 },
  { name: "Zerak, Arauto da Tempestade", emoji: "⚡", maxHp: 345, atk: 27, def: 15 },
] as const;

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

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function resolveTeams(mode: RPGMode, humanIds: string[]): { teamA: string[]; teamB: string[] } {
  const ids = humanIds.filter(Boolean).slice(0, 2);

  if (mode === "duoBot") {
    return {
      teamA: ids.length > 0 ? ids : ["PLAYER"],
      teamB: ["BOT"],
    };
  }

  if (mode === "1v1" && ids.length >= 2) {
    return { teamA: [ids[0]], teamB: [ids[1]] };
  }

  return { teamA: [ids[0] ?? "PLAYER"], teamB: ["BOT"] };
}

function createCombatant(
  id: string,
  team: "a" | "b",
  classId: keyof typeof RPG_CLASSES,
  displayName?: string,
  overrideStats?: { maxHp: number; atk: number; def: number }
): RPGCombatant {
  const def = RPG_CLASSES[classId];
  return {
    id,
    isBot: id === "BOT",
    team,
    classId,
    displayName,
    maxHp: overrideStats?.maxHp ?? def.maxHp,
    hp: overrideStats?.maxHp ?? def.maxHp,
    atk: overrideStats?.atk ?? def.atk,
    def: overrideStats?.def ?? def.def,
    alive: true,
    stunnedRounds: 0,
    skippingThisRound: false,
    immuneNextHit: false,
    immuneThisRound: false,
    evadeBonusNextHit: 0,
    permanentCritBonus: 0,
    permanentEvadeBonus: 0,
    luckBonus: 0,
    poisonRoundsRemaining: 0,
    poisonDamage: 0,
    bleedRoundsRemaining: 0,
    bleedDamage: 0,
    curseRoundsRemaining: 0,
    curseDamage: 0,
    defenseMultiplier: 1,
    defenseBuffStartRound: 0,
    defenseBuffUntilRound: 0,
    rerollCharges: 0,
    usedUniqueCardIds: [],
    hand: [],
    chosenCardId: null,
    hasChosen: false,
  };
}

function createBoss(team: "a" | "b"): RPGCombatant {
  const boss = pickRandom(BOSS_PROFILES);
  return createCombatant(
    "BOT",
    team,
    "boss",
    boss.name,
    {
      maxHp: boss.maxHp,
      atk: boss.atk,
      def: boss.def,
    }
  );
}

function teamHpPercent(state: RPGState, ids: string[]): number {
  let hp = 0;
  let max = 0;

  for (const id of ids) {
    const c = state.combatants[id];
    if (!c) continue;
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
    c.hasChosen = false;
    c.immuneThisRound = false;

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
    c.hand = rollHand(
      state.round,
      id,
      c.usedUniqueCardIds,
      c.classId,
      c.luckBonus
    );
  }
}

function allRequiredHumansChosen(state: RPGState): boolean {
  for (const id of state.order) {
    const c = state.combatants[id];
    if (!c || !c.alive || c.isBot || c.skippingThisRound) continue;
    if (!c.chosenCardId) return false;
  }
  return true;
}

function findCard(c: RPGCombatant, cardInstanceId: string): RPGCard | null {
  return c.hand.find((card) => card.instanceId === cardInstanceId) ?? null;
}

function pickTarget(
  actor: RPGCombatant,
  state: RPGState,
  enemyIds: string[]
): RPGCombatant | null {
  const aliveEnemies = enemyIds
    .map((id) => state.combatants[id])
    .filter((c): c is RPGCombatant => Boolean(c?.alive));

  if (aliveEnemies.length === 0) return null;

  // O Boss sempre escolhe aleatoriamente entre os dois jogadores vivos.
  if (actor.isBot && state.mode === "duoBot") {
    return botChooseTarget(aliveEnemies);
  }

  if (aliveEnemies.length === 1) return aliveEnemies[0];

  return actor.isBot
    ? botChooseTarget(aliveEnemies)
    : aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
}

function performHit(
  actor: RPGCombatant,
  target: RPGCombatant,
  cardId: string,
  dmgMultiplier: number,
  damageType: "physical" | "magic",
  currentRound: number,
  extraCritChance: number,
  events: RPGRoundEvent[],
  ignoreEvade = false
): number {
  if (target.immuneThisRound) {
    events.push({
      actorId: actor.id,
      targetId: target.id,
      type: "immuneBlock",
      cardId,
    });
    return 0;
  }

  if (target.immuneNextHit) {
    target.immuneNextHit = false;
    events.push({
      actorId: actor.id,
      targetId: target.id,
      type: "immuneBlock",
      cardId,
    });
    return 0;
  }

  const targetPassives: RPGClassPassives =
    RPG_CLASSES[target.classId].passives;

  const evadeChance =
    BASE_EVADE_CHANCE +
    (targetPassives.evadeChanceBonus ?? 0) +
    target.permanentEvadeBonus +
    target.evadeBonusNextHit;

  target.evadeBonusNextHit = 0;

  if (!ignoreEvade && Math.random() < evadeChance) {
    events.push({
      actorId: actor.id,
      targetId: target.id,
      type: "evade",
      cardId,
    });
    return 0;
  }

  const actorPassives: RPGClassPassives =
    RPG_CLASSES[actor.classId].passives;

  let base = actor.atk * dmgMultiplier;

  if (damageType === "magic") {
    base *= actorPassives.magicDamageDealtMult ?? 1;
  }

  const defenseBuffActive =
    target.defenseBuffStartRound > 0 &&
    currentRound > target.defenseBuffStartRound &&
    currentRound <= target.defenseBuffUntilRound;

  const effectiveDefense = defenseBuffActive
    ? target.def * target.defenseMultiplier
    : target.def;

  let dmg =
    base -
    effectiveDefense * 0.5 -
    (targetPassives.flatDamageReduction ?? 0);

  if (damageType === "physical") {
    dmg *= targetPassives.physDamageTakenMult ?? 1;
  }

  dmg = Math.max(MIN_DAMAGE, Math.round(dmg));

  const critChance =
    BASE_CRIT_CHANCE +
    (actorPassives.critChanceBonus ?? 0) +
    actor.permanentCritBonus +
    extraCritChance;

  const isCrit = Math.random() < critChance;

  if (isCrit) {
    dmg = Math.round(dmg * CRIT_MULTIPLIER);
  }

  target.hp = Math.max(0, target.hp - dmg);

  if (target.hp <= 0) {
    target.alive = false;
  }

  events.push({
    actorId: actor.id,
    targetId: target.id,
    type: "attack",
    cardId,
    amount: dmg,
    isCrit,
  });

  return dmg;
}

function applyPoisonTicks(
  state: RPGState,
  events: RPGRoundEvent[]
) {
  for (const id of state.order) {
    const c = state.combatants[id];
    if (!c.alive) continue;

    if (c.poisonRoundsRemaining > 0) {
      const amount = Math.max(MIN_DAMAGE, Math.round(c.poisonDamage));
      c.hp = Math.max(0, c.hp - amount);
      c.poisonRoundsRemaining -= 1;

      if (c.hp <= 0) c.alive = false;

      events.push({
        actorId: "POISON",
        targetId: c.id,
        type: "statusTick",
        status: "poison",
        cardId: "poison",
        amount,
      });
    }

    if (c.alive && c.bleedRoundsRemaining > 0) {
      const amount = Math.max(MIN_DAMAGE, Math.round(c.bleedDamage));
      c.hp = Math.max(0, c.hp - amount);
      c.bleedRoundsRemaining -= 1;

      if (c.hp <= 0) c.alive = false;

      events.push({
        actorId: "BLEED",
        targetId: c.id,
        type: "statusTick",
        status: "bleed",
        cardId: "bleeding",
        amount,
      });
    }

    if (c.alive && c.curseRoundsRemaining > 0) {
      const amount = Math.max(MIN_DAMAGE, Math.round(c.curseDamage));
      c.hp = Math.max(0, c.hp - amount);
      c.curseRoundsRemaining -= 1;

      if (c.hp <= 0) c.alive = false;

      events.push({
        actorId: "CURSE",
        targetId: c.id,
        type: "statusTick",
        status: "curse",
        cardId: "curse",
        amount,
      });
    }
  }
}

function applyCard(
  actor: RPGCombatant,
  card: RPGCard,
  state: RPGState,
  enemyIds: string[],
  events: RPGRoundEvent[]
) {
  const passives = RPG_CLASSES[actor.classId].passives;
  const healMult = passives.specialEffectMult ?? 1;

  switch (card.kind) {
    case "fullHeal": {
      const healed = actor.maxHp - actor.hp;
      actor.hp = actor.maxHp;

      // Imune a TODOS os golpes durante este round.
      actor.immuneThisRound = true;

      events.push({
        actorId: actor.id,
        targetId: actor.id,
        type: "heal",
        cardId: card.id,
        amount: healed,
      });
      return;
    }

    case "superHeal": {
      const healed = Math.min(
        actor.maxHp - actor.hp,
        Math.round(
          actor.maxHp *
            (card.healPercent ?? 0.55) *
            healMult
        )
      );

      actor.hp = Math.min(actor.maxHp, actor.hp + healed);

      events.push({
        actorId: actor.id,
        targetId: actor.id,
        type: "heal",
        cardId: card.id,
        amount: healed,
      });
      return;
    }

    case "critSupreme": {
      actor.permanentCritBonus += UNIQUE_CRIT_BONUS;

      events.push({
        actorId: actor.id,
        targetId: actor.id,
        type: "buff",
        cardId: card.id,
      });
      return;
    }

    case "evadeSupreme": {
      actor.permanentEvadeBonus += UNIQUE_EVADE_BONUS;

      events.push({
        actorId: actor.id,
        targetId: actor.id,
        type: "buff",
        cardId: card.id,
      });
      return;
    }

    case "luck": {
      actor.luckBonus = Math.min(
        0.25,
        actor.luckBonus + LUCK_BONUS
      );

      events.push({
        actorId: actor.id,
        targetId: actor.id,
        type: "buff",
        cardId: card.id,
      });
      return;
    }

    case "domination": {
      const target = pickTarget(actor, state, enemyIds);
      if (!target) return;

      target.stunnedRounds = Math.max(
        target.stunnedRounds,
        DOMINATION_ROUNDS
      );

      events.push({
        actorId: actor.id,
        targetId: target.id,
        type: "domination",
        cardId: card.id,
      });
      return;
    }

    case "swapHp": {
      const target = pickTarget(actor, state, enemyIds);
      if (!target) return;

      const actorHp = actor.hp;
      actor.hp = Math.max(0, target.hp);
      target.hp = Math.max(0, actorHp);

      actor.alive = actor.hp > 0;
      target.alive = target.hp > 0;

      events.push({
        actorId: actor.id,
        targetId: target.id,
        type: "swap",
        cardId: card.id,
        amount: actor.hp,
      });
      return;
    }

    case "divineShield": {
      actor.defenseMultiplier = Math.max(
        actor.defenseMultiplier,
        card.defenseMultiplier ?? 1.5
      );
      const buffRounds = card.defenseRounds ?? 3;
      actor.defenseBuffStartRound = state.round;
      actor.defenseBuffUntilRound = Math.max(
        actor.defenseBuffUntilRound,
        state.round + buffRounds
      );

      events.push({
        actorId: actor.id,
        targetId: actor.id,
        type: "buff",
        cardId: card.id,
      });
      return;
    }

    default:
      break;
  }

  const target = pickTarget(actor, state, enemyIds);
  if (!target) return;

  if (card.kind === "curse") {
    const curseMultiplier = card.curseDamageMultiplier ?? 0.75;
    const dealt = performHit(
      actor,
      target,
      card.id,
      curseMultiplier,
      "magic",
      state.round,
      0,
      events
    );

    if (target.alive && dealt > 0) {
      const futureRounds = Math.max(
        0,
        (card.curseRounds ?? 5) - 1
      );
      if (futureRounds > 0) {
        target.curseRoundsRemaining = Math.max(
          target.curseRoundsRemaining,
          futureRounds
        );
        target.curseDamage = Math.max(
          target.curseDamage,
          actor.atk * curseMultiplier
        );
      }
    }
    return;
  }

  const mult = card.dmgMultiplier ?? 1;

  if (card.kind === "physicalMagicCombo") {
    performHit(
      actor,
      target,
      card.id,
      mult,
      "physical",
      state.round,
      0,
      events
    );

    if (target.alive) {
      performHit(
        actor,
        target,
        card.id,
        card.secondaryDmgMultiplier ?? 0.5,
        "magic",
        state.round,
        0,
        events
      );
    }
    return;
  }

  if (
    card.kind === "doubleAttack" ||
    card.kind === "tripleAttack" ||
    card.kind === "doubleMagic" ||
    card.kind === "tripleMagic" ||
    card.kind === "arrowRain"
  ) {
    const hits = card.hits ?? 2;
    const isMagic =
      card.kind === "doubleMagic" ||
      card.kind === "tripleMagic";

    for (let i = 0; i < hits && target.alive; i++) {
      performHit(
        actor,
        target,
        card.id,
        mult,
        isMagic ? "magic" : "physical",
        state.round,
        0,
        events,
        Boolean(card.ignoreEvade)
      );
    }
    return;
  }

  const damageType =
    card.kind === "magic" ||
    card.kind === "superMagic"
      ? "magic"
      : "physical";

  const critBonus = card.critChanceBonus ?? 0;

  const dealt = performHit(
    actor,
    target,
    card.id,
    mult,
    damageType,
    state.round,
    critBonus,
    events,
    Boolean(card.ignoreEvade)
  );

  if (
    (card.kind === "physicalDrainLight" ||
      card.kind === "physicalDrainFull") &&
    dealt > 0
  ) {
    const healed = Math.round(
      actor.maxHp *
        (card.healPercent ?? 0) *
        healMult
    );

    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + healed
    );

    events.push({
      actorId: actor.id,
      targetId: actor.id,
      type: "heal",
      cardId: card.id,
      amount: healed,
    });
  }

  if (card.kind === "healEvade") {
    const healed = Math.round(
      actor.maxHp *
        (card.healPercent ?? 0.08) *
        healMult
    );

    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + healed
    );

    actor.evadeBonusNextHit = Math.max(
      actor.evadeBonusNextHit,
      card.evadeChanceGrant ?? 0
    );

    events.push({
      actorId: actor.id,
      targetId: actor.id,
      type: "heal",
      cardId: card.id,
      amount: healed,
    });

    events.push({
      actorId: actor.id,
      targetId: actor.id,
      type: "buff",
      cardId: card.id,
    });
  }

  if (card.kind === "physicalEvadeBuff") {
    actor.evadeBonusNextHit = Math.max(
      actor.evadeBonusNextHit,
      (card.evadeChanceGrant ?? 0) * healMult
    );
  }

  if (card.kind === "physicalImmuneBuff") {
    actor.immuneNextHit = true;
  }

  if (card.kind === "lifeSteal" && dealt > 0) {
    const healed = Math.min(
      actor.maxHp - actor.hp,
      Math.round(
        dealt *
          (card.healPercent ?? 0.65) *
          healMult
      )
    );

    actor.hp = Math.min(
      actor.maxHp,
      actor.hp + healed
    );

    events.push({
      actorId: actor.id,
      targetId: actor.id,
      type: "heal",
      cardId: card.id,
      amount: healed,
    });
  }

  if (
    card.kind === "poison" &&
    target.alive &&
    dealt > 0
  ) {
    target.poisonRoundsRemaining = Math.max(
      target.poisonRoundsRemaining,
      card.poisonRounds ?? 2
    );

    target.poisonDamage = Math.max(
      target.poisonDamage,
      actor.atk *
        (card.poisonDamageMultiplier ?? 0.28)
    );
  }

  if (
    card.kind === "assassinate" &&
    target.alive &&
    dealt > 0
  ) {
    target.bleedRoundsRemaining = Math.max(
      target.bleedRoundsRemaining,
      card.bleedRounds ?? 3
    );
    target.bleedDamage = Math.max(
      target.bleedDamage,
      actor.atk * (card.bleedDamageMultiplier ?? 1)
    );
  }

  if (card.kind === "reroll") {
    actor.rerollCharges +=
      card.rerollCharges ?? 3;

    events.push({
      actorId: actor.id,
      targetId: actor.id,
      type: "reroll",
      cardId: card.id,
      amount: actor.rerollCharges,
    });
  }
}

function resolveRound(state: RPGState) {
  const events: RPGRoundEvent[] = [];

  // Veneno é aplicado automaticamente no início da resolução da rodada.
  applyPoisonTicks(state, events);

  // O BOT escolhe sua carta depois dos efeitos automáticos.
  for (const id of state.order) {
    const c = state.combatants[id];

    if (
      c.isBot &&
      c.alive &&
      !c.skippingThisRound &&
      !c.chosenCardId
    ) {
      c.chosenCardId =
        botChooseCard(c, c.hand).instanceId;
      c.hasChosen = true;
    }
  }

  // Executa cada combatente na ordem fixa.
  for (const id of state.order) {
    const c = state.combatants[id];

    if (!c.alive) continue;

    if (c.skippingThisRound) {
      events.push({
        actorId: id,
        targetId: null,
        type: "stunSkip",
        cardId: "stun",
      });
      continue;
    }

    const card = c.chosenCardId
      ? findCard(c, c.chosenCardId)
      : null;

    if (!card) continue;

    const enemyIds =
      c.team === "a"
        ? state.teamB
        : state.teamA;

    applyCard(
      c,
      card,
      state,
      enemyIds,
      events
    );
  }

  state.lastRoundEvents = events;

  const aliveA = state.teamA.some(
    (id) => state.combatants[id]?.alive
  );

  const aliveB = state.teamB.some(
    (id) => state.combatants[id]?.alive
  );

  if (!aliveA || !aliveB) {
    state.phase = "finished";
    state.finishReason = "death";
    state.winnerTeam =
      aliveA
        ? "a"
        : aliveB
          ? "b"
          : "draw";
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

function dealAndMaybeResolve(state: RPGState) {
  dealHandsForRound(state);
  state.phase = "choosing";
  state.lastRoundEvents = [];

  if (allRequiredHumansChosen(state)) {
    resolveRound(state);
  }
}

export class RPGGame
  implements GameEngine<RPGState, RPGAction>
{
  readonly id = "rpg" as const;

  createInitialState(
    options?: Record<string, unknown>
  ): RPGState {
    const rawMode =
      typeof options?.mode === "string"
        ? options.mode
        : "soloBot";

    const mode = isValidRPGMode(rawMode)
      ? rawMode
      : "soloBot";

    const humanPlayerIds =
      Array.isArray(options?.playerIds)
        ? (options!.playerIds as string[]).slice(0, 2)
        : [];

    const { teamA, teamB } =
      resolveTeams(
        mode,
        humanPlayerIds
      );

    const order = [
      ...teamA,
      ...teamB,
    ];

    const humanClassIds = shuffle(
      RPG_CLASS_IDS
    ).slice(0, teamA.length);

    const combatants: RPGState["combatants"] = {};

    teamA.forEach((id, i) => {
      combatants[id] =
        createCombatant(
          id,
          "a",
          humanClassIds[i]
        );
    });

    if (teamB.includes("BOT")) {
      combatants.BOT =
        mode === "duoBot"
          ? createBoss("b")
          : createCombatant(
              "BOT",
              "b",
              pickRandom(RPG_CLASS_IDS)
            );
    } else {
      const enemyId = teamB[0];
      if (enemyId) {
        combatants[enemyId] =
          createCombatant(
            enemyId,
            "b",
            pickRandom(RPG_CLASS_IDS)
          );
      }
    }

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
      lastRoundEvents: [],
      winnerTeam: null,
      finishReason: null,
      introStartedAt: Date.now(),
      resolvedAt: null,
      startedAt: Date.now(),
      finishedAt: null,
    };
  }

  applyAction(
    state: RPGState,
    action: RPGAction,
    playerId: string
  ): RPGState {
    if (state.phase === "finished") {
      return state;
    }

    if (action.type === "beginRound") {
      if (state.phase !== "intro") {
        return state;
      }

      const next =
        structuredClone(state);

      dealAndMaybeResolve(next);

      return next;
    }

    if (action.type === "advanceRound") {
      if (state.phase !== "resolved") {
        return state;
      }

      const next =
        structuredClone(state);

      next.round += 1;

      if (
        next.round >
        next.maxRounds
      ) {
        finishByRoundLimit(next);
        return next;
      }

      dealAndMaybeResolve(next);

      return next;
    }

    if (action.type === "rerollHand") {
      if (state.phase !== "choosing") {
        return state;
      }

      const combatant =
        state.combatants[playerId];

      if (
        !combatant ||
        combatant.isBot ||
        !combatant.alive ||
        combatant.skippingThisRound ||
        combatant.chosenCardId ||
        combatant.rerollCharges <= 0
      ) {
        return state;
      }

      const next =
        structuredClone(state);

      const c =
        next.combatants[playerId];

      c.rerollCharges -= 1;
      c.hand = rollHand(
        next.round,
        playerId,
        c.usedUniqueCardIds,
        c.classId,
        c.luckBonus
      );

      return next;
    }

    if (action.type === "selectCard") {
      if (state.phase !== "choosing") {
        return state;
      }

      const combatant =
        state.combatants[playerId];

      if (
        !combatant ||
        combatant.isBot ||
        !combatant.alive ||
        combatant.skippingThisRound
      ) {
        return state;
      }

      if (combatant.chosenCardId) {
        return state;
      }

      const card = findCard(
        combatant,
        action.cardInstanceId
      );

      if (!card) {
        return state;
      }

      const next =
        structuredClone(state);

      next.combatants[
        playerId
      ].chosenCardId =
        card.instanceId;

      next.combatants[
        playerId
      ].hasChosen = true;

      if (
        allRequiredHumansChosen(next)
      ) {
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
    return this.createInitialState({
      mode: state.mode,
      playerIds: state.humanPlayerIds,
    });
  }
}
