import { GameEngine } from "../../types";

export type AirHockeyDifficulty = "easy" | "medium" | "hard";
export type AirHockeyMode = "solo" | "duel";
export type AirHockeyPhase = "countdown" | "playing" | "goal" | "finished";

export interface AirHockeyVector { x: number; y: number; vx: number; vy: number; }
export interface AirHockeyPaddle extends AirHockeyVector { targetX: number; targetY: number; }
export interface AirHockeyResult { playerId: string; outcome: "win" | "loss" | "draw" | "solo"; score: number; conceded: number; }

export interface AirHockeyState {
  mode: AirHockeyMode;
  difficulty: AirHockeyDifficulty;
  humanPlayerIds: string[];
  playerIds: [string, string];
  paddles: Record<string, AirHockeyPaddle>;
  puck: AirHockeyVector;
  scores: Record<string, number>;
  phase: AirHockeyPhase;
  phaseEndsAt: number | null;
  startedAt: number;
  finishedAt: number | null;
  lastTickAt: number;
  lastGoalBy: string | null;
  goalSerial: number;
  impactSerial: number;
  impactStrength: number;
  impactKind: "wall" | "paddle" | null;
  paddleContact: Record<string, boolean>;
  paddleContactNormals: Record<string, { x: number; y: number } | null>;
  botNextThinkAt: number;
  results: AirHockeyResult[];
}

export type AirHockeyAction =
  | { type: "move"; x: number; y: number }
  | { type: "tick"; now: number };

const WORLD_WIDTH = 1.6;
const WORLD_HEIGHT = 1;
const HALF_WIDTH = WORLD_WIDTH / 2;
// 12% larger than the original paddle while keeping the puck radius and
// collision geometry unchanged.
const PADDLE_RADIUS = 0.075;
const PUCK_RADIUS = 0.034;
const GOAL_MIN_Y = 0.34;
const GOAL_MAX_Y = 0.66;
const GOAL_TO_WIN = 7;
const VALID_DIFFICULTIES: AirHockeyDifficulty[] = ["easy", "medium", "hard"];
const VALID_MODES: AirHockeyMode[] = ["solo", "duel"];

const BOT_PROFILE: Record<AirHockeyDifficulty, { speed: number; reactionMs: number; error: number; aggression: number }> = {
  easy: { speed: 0.62, reactionMs: 430, error: 0.14, aggression: 0.26 },
  medium: { speed: 0.95, reactionMs: 240, error: 0.065, aggression: 0.52 },
  hard: { speed: 1.22, reactionMs: 120, error: 0.028, aggression: 0.76 },
};

export function isValidAirHockeyDifficulty(value: string): value is AirHockeyDifficulty {
  return (VALID_DIFFICULTIES as string[]).includes(value);
}

export function isValidAirHockeyMode(value: string): value is AirHockeyMode {
  return (VALID_MODES as string[]).includes(value);
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function length(x: number, y: number) { return Math.hypot(x, y); }

function startPaddle(side: 0 | 1): AirHockeyPaddle {
  const x = side === 0 ? WORLD_WIDTH * 0.23 : WORLD_WIDTH * 0.77;
  return { x, y: WORLD_HEIGHT / 2, vx: 0, vy: 0, targetX: x, targetY: WORLD_HEIGHT / 2 };
}

function newPuck(direction = Math.random() < 0.5 ? -1 : 1): AirHockeyVector {
  const angle = (Math.random() - 0.5) * 0.58;
  const speed = 0.84;
  return { x: HALF_WIDTH, y: WORLD_HEIGHT / 2, vx: Math.cos(angle) * speed * direction, vy: Math.sin(angle) * speed };
}

function clampTarget(paddle: AirHockeyPaddle, side: 0 | 1) {
  const minX = side === 0 ? PADDLE_RADIUS : HALF_WIDTH + PADDLE_RADIUS * 0.25;
  const maxX = side === 0 ? HALF_WIDTH - PADDLE_RADIUS * 0.25 : WORLD_WIDTH - PADDLE_RADIUS;
  paddle.targetX = clamp(paddle.targetX, minX, maxX);
  paddle.targetY = clamp(paddle.targetY, PADDLE_RADIUS, WORLD_HEIGHT - PADDLE_RADIUS);
}

function movePaddle(paddle: AirHockeyPaddle, side: 0 | 1, dt: number, speedLimit: number) {
  clampTarget(paddle, side);
  const dx = paddle.targetX - paddle.x;
  const dy = paddle.targetY - paddle.y;
  const distance = length(dx, dy);
  const maxDistance = speedLimit * dt;
  const previousX = paddle.x;
  const previousY = paddle.y;
  if (distance <= maxDistance || distance === 0) {
    paddle.x = paddle.targetX;
    paddle.y = paddle.targetY;
  } else {
    paddle.x += dx / distance * maxDistance;
    paddle.y += dy / distance * maxDistance;
  }
  paddle.vx = (paddle.x - previousX) / Math.max(dt, 0.001);
  paddle.vy = (paddle.y - previousY) / Math.max(dt, 0.001);
}

function botTarget(state: AirHockeyState, now: number) {
  const botId = state.playerIds[1];
  if (botId !== "BOT") return;
  const next = state.botNextThinkAt;
  if (now < next) return;
  state.botNextThinkAt = now + BOT_PROFILE[state.difficulty].reactionMs;
  const bot = state.paddles[botId];
  const puck = state.puck;
  const profile = BOT_PROFILE[state.difficulty];
  const towardBot = puck.vx > 0;
  const defensiveX = WORLD_WIDTH * 0.82;
  const attackX = WORLD_WIDTH * (0.7 + profile.aggression * 0.1);
  const projectedY = clamp(puck.y + puck.vy * (towardBot ? 0.18 : 0.05), 0.14, 0.86);
  const error = (Math.random() - 0.5) * profile.error;
  bot.targetX = towardBot || puck.x > HALF_WIDTH ? attackX : defensiveX;
  bot.targetY = clamp(projectedY + error, PADDLE_RADIUS, WORLD_HEIGHT - PADDLE_RADIUS);
}

function constrainPaddleContact(state: AirHockeyState, paddleId: string, paddle: AirHockeyPaddle, previousPaddle: AirHockeyPaddle, dt: number) {
  const normal = state.paddleContactNormals[paddleId];
  if (!state.paddleContact[paddleId] || !normal) return;
  const minDistance = PADDLE_RADIUS + PUCK_RADIUS + 0.001;
  const puck = state.puck;
  const alongNormal = (puck.x - paddle.x) * normal.x + (puck.y - paddle.y) * normal.y;
  if (alongNormal >= minDistance) return;

  // A raquete é cinemática, mas não pode terminar do outro lado do disco.
  // Mantê-la atrás da normal do primeiro contato impede atravessamentos sem
  // mover artificialmente o disco ou acrescentar um collider invisível.
  paddle.x = puck.x - normal.x * minDistance;
  paddle.y = puck.y - normal.y * minDistance;
  const side = paddleId === state.playerIds[0] ? 0 : 1;
  const minX = side === 0 ? PADDLE_RADIUS : HALF_WIDTH + PADDLE_RADIUS * 0.25;
  const maxX = side === 0 ? HALF_WIDTH - PADDLE_RADIUS * 0.25 : WORLD_WIDTH - PADDLE_RADIUS;
  paddle.x = clamp(paddle.x, minX, maxX);
  paddle.y = clamp(paddle.y, PADDLE_RADIUS, WORLD_HEIGHT - PADDLE_RADIUS);
  paddle.vx = (paddle.x - previousPaddle.x) / Math.max(dt, 0.001);
  paddle.vy = (paddle.y - previousPaddle.y) / Math.max(dt, 0.001);
}

function collidePaddle(state: AirHockeyState, paddleId: string, paddle: AirHockeyPaddle, previousPaddle: AirHockeyPaddle, previousPuck: AirHockeyVector, dt: number): number | null {
  const puck = state.puck;
  const dx = puck.x - paddle.x;
  const dy = puck.y - paddle.y;
  const minDistance = PADDLE_RADIUS + PUCK_RADIUS;
  const distance = length(dx, dy);
  // Continuous collision detection in relative space. Both circles may move
  // during the step, but their relative trajectory is a single segment. The
  // quadratic below finds the first time that segment reaches the exact
  // combined radius, including the case where both endpoints are outside.
  const startX = previousPuck.x - previousPaddle.x;
  const startY = previousPuck.y - previousPaddle.y;
  const endX = dx;
  const endY = dy;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const previousDistance = length(startX, startY);
  const wasInContact = Boolean(state.paddleContact[paddleId]);
  // Clear the latch only after the two circles have visibly separated. This
  // lets a paddle keep pushing during one contact without producing repeated
  // impulses on every substep, while still allowing a later fresh hit.
  if (wasInContact && previousDistance > minDistance + 0.012 && distance > minDistance + 0.012) {
    state.paddleContact[paddleId] = false;
    state.paddleContactNormals[paddleId] = null;
  }
  if (state.paddleContact[paddleId]) {
    constrainPaddleContact(state, paddleId, paddle, previousPaddle, dt);
    return null;
  }

  const radiusSq = minDistance * minDistance;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
  const b = 2 * (startX * segmentX + startY * segmentY);
  const c = startX * startX + startY * startY - radiusSq;
  let impactT: number | null = c <= 0 ? 0 : null;
  if (impactT === null && segmentLengthSq > 0.000000001) {
    const discriminant = b * b - 4 * segmentLengthSq * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const first = (-b - root) / (2 * segmentLengthSq);
      const second = (-b + root) / (2 * segmentLengthSq);
      if (first >= 0 && first <= 1) impactT = first;
      else if (second >= 0 && second <= 1) impactT = second;
    }
  }
  if (impactT === null) return null;

  const impactX = startX + segmentX * impactT;
  const impactY = startY + segmentY * impactT;
  const impactDistance = length(impactX, impactY);
  let nx: number;
  let ny: number;
  if (impactDistance > 0.000001) {
    nx = impactX / impactDistance;
    ny = impactY / impactDistance;
  } else {
    const startDistance = length(startX, startY);
    const relativeVx = puck.vx - paddle.vx;
    const relativeVy = puck.vy - paddle.vy;
    const relativeSpeed = length(relativeVx, relativeVy);
    nx = startDistance > 0.000001 ? startX / startDistance : relativeSpeed > 0.000001 ? -relativeVx / relativeSpeed : 1;
    ny = startDistance > 0.000001 ? startY / startDistance : relativeSpeed > 0.000001 ? -relativeVy / relativeSpeed : 0;
  }
  const contactPaddleX = previousPaddle.x + (paddle.x - previousPaddle.x) * impactT;
  const contactPaddleY = previousPaddle.y + (paddle.y - previousPaddle.y) * impactT;
  puck.x = contactPaddleX + nx * (minDistance + 0.001);
  puck.y = contactPaddleY + ny * (minDistance + 0.001);
  const relativeX = puck.vx - paddle.vx;
  const relativeY = puck.vy - paddle.vy;
  const approach = relativeX * nx + relativeY * ny;
  if (approach < 0) {
    puck.vx -= 1.88 * approach * nx;
    puck.vy -= 1.88 * approach * ny;
  }
  puck.vx += paddle.vx * 0.39 + nx * 0.11;
  puck.vy += paddle.vy * 0.39 + ny * 0.11;
  const speed = length(puck.vx, puck.vy);
  const maxSpeed = 2.45;
  if (speed > maxSpeed) { puck.vx = puck.vx / speed * maxSpeed; puck.vy = puck.vy / speed * maxSpeed; }
  if (speed < 0.5) { puck.vx += nx * 0.42; puck.vy += ny * 0.42; }
  state.paddleContact[paddleId] = true;
  state.paddleContactNormals[paddleId] = { x: nx, y: ny };
  state.impactSerial += 1;
  state.impactStrength = clamp(speed / maxSpeed, 0, 1);
  state.impactKind = "paddle";
  return impactT;
}

function scoreGoal(state: AirHockeyState, scorer: string, now: number) {
  state.scores[scorer] += 1;
  state.lastGoalBy = scorer;
  state.goalSerial += 1;
  state.impactStrength = 1;
  if (state.scores[scorer] >= GOAL_TO_WIN) {
    state.phase = "finished";
    state.finishedAt = now;
    state.phaseEndsAt = null;
    const [left, right] = state.playerIds;
    state.results = state.humanPlayerIds.map((id) => {
      const isLeft = id === left;
      const own = state.scores[isLeft ? left : right];
      const other = state.scores[isLeft ? right : left];
      return { playerId: id, outcome: state.mode === "solo" ? "solo" : own > other ? "win" : own < other ? "loss" : "draw", score: own, conceded: other };
    });
    return;
  }
  state.phase = "goal";
  state.phaseEndsAt = now + 1150;
  state.puck.vx = 0;
  state.puck.vy = 0;
}

function handlePuckBounds(state: AirHockeyState, now: number): boolean {
  const puck = state.puck;
  if (puck.y - PUCK_RADIUS < 0) { puck.y = PUCK_RADIUS; puck.vy = Math.abs(puck.vy); state.impactSerial += 1; state.impactKind = "wall"; }
  if (puck.y + PUCK_RADIUS > WORLD_HEIGHT) { puck.y = WORLD_HEIGHT - PUCK_RADIUS; puck.vy = -Math.abs(puck.vy); state.impactSerial += 1; state.impactKind = "wall"; }
  if (puck.x - PUCK_RADIUS < 0) {
    if (puck.y > GOAL_MIN_Y && puck.y < GOAL_MAX_Y) { scoreGoal(state, state.playerIds[1], now); return true; }
    puck.x = PUCK_RADIUS; puck.vx = Math.abs(puck.vx); state.impactSerial += 1; state.impactKind = "wall";
  }
  if (puck.x + PUCK_RADIUS > WORLD_WIDTH) {
    if (puck.y > GOAL_MIN_Y && puck.y < GOAL_MAX_Y) { scoreGoal(state, state.playerIds[0], now); return true; }
    puck.x = WORLD_WIDTH - PUCK_RADIUS; puck.vx = -Math.abs(puck.vx); state.impactSerial += 1; state.impactKind = "wall";
  }
  return false;
}

function stepPuck(state: AirHockeyState, dt: number, now: number, previousPaddles: Record<string, AirHockeyPaddle>) {
  const puck = state.puck;
  const previousPuck = { ...puck };
  puck.x += puck.vx * dt;
  puck.y += puck.vy * dt;
  if (handlePuckBounds(state, now)) return;

  const firstId = state.playerIds[0];
  const firstImpact = collidePaddle(state, firstId, state.paddles[firstId], previousPaddles[firstId], previousPuck, dt);
  if (firstImpact !== null) {
    if (firstImpact < 1) {
      const remaining = dt * (1 - firstImpact);
      puck.x += puck.vx * remaining;
      puck.y += puck.vy * remaining;
      if (handlePuckBounds(state, now)) return;
    }
    constrainPaddleContact(state, firstId, state.paddles[firstId], previousPaddles[firstId], dt);
  } else {
    const secondId = state.playerIds[1];
    const secondImpact = collidePaddle(state, secondId, state.paddles[secondId], previousPaddles[secondId], previousPuck, dt);
    if (secondImpact !== null) {
      if (secondImpact < 1) {
        const remaining = dt * (1 - secondImpact);
        puck.x += puck.vx * remaining;
        puck.y += puck.vy * remaining;
        if (handlePuckBounds(state, now)) return;
      }
      constrainPaddleContact(state, secondId, state.paddles[secondId], previousPaddles[secondId], dt);
    }
  }
  const drag = Math.pow(0.9975, dt * 60);
  puck.vx *= drag;
  puck.vy *= drag;
}

function resetRound(state: AirHockeyState, now: number) {
  state.paddles[state.playerIds[0]] = startPaddle(0);
  state.paddles[state.playerIds[1]] = startPaddle(1);
  state.paddleContact[state.playerIds[0]] = false;
  state.paddleContact[state.playerIds[1]] = false;
  state.paddleContactNormals[state.playerIds[0]] = null;
  state.paddleContactNormals[state.playerIds[1]] = null;
  state.puck = newPuck(state.lastGoalBy === state.playerIds[0] ? -1 : 1);
  state.phase = "countdown";
  state.phaseEndsAt = now + 1450;
}

export class AirHockeyGame implements GameEngine<AirHockeyState, AirHockeyAction> {
  readonly id = "airhockey" as const;

  createInitialState(options?: Record<string, unknown>): AirHockeyState {
    const difficulty = typeof options?.difficulty === "string" && isValidAirHockeyDifficulty(options.difficulty) ? options.difficulty : "medium";
    const mode = typeof options?.mode === "string" && isValidAirHockeyMode(options.mode) ? options.mode : "solo";
    const humans = Array.isArray(options?.playerIds) ? options.playerIds.filter((id): id is string => typeof id === "string").slice(0, 2) : [];
    const first = humans[0] ?? "PLAYER";
    const second = mode === "duel" && humans[1] ? humans[1] : "BOT";
    const now = Date.now();
    const state: AirHockeyState = {
      mode, difficulty, humanPlayerIds: mode === "duel" ? [first, second] : [first], playerIds: [first, second],
      paddles: { [first]: startPaddle(0), [second]: startPaddle(1) }, puck: newPuck(), scores: { [first]: 0, [second]: 0 },
      phase: "countdown", phaseEndsAt: now + 2400, startedAt: now, finishedAt: null, lastTickAt: now,
      lastGoalBy: null, goalSerial: 0, impactSerial: 0, impactStrength: 0, impactKind: null,
      paddleContact: { [first]: false, [second]: false },
      paddleContactNormals: { [first]: null, [second]: null }, botNextThinkAt: now, results: [],
    };
    return state;
  }

  applyAction(state: AirHockeyState, action: AirHockeyAction, playerId: string): AirHockeyState {
    if (state.phase === "finished") return state;
    if (action.type === "move") {
      if (!state.humanPlayerIds.includes(playerId) || !Number.isFinite(action.x) || !Number.isFinite(action.y)) return state;
      const next = structuredClone(state);
      const paddle = next.paddles[playerId];
      if (!paddle) return state;
      paddle.targetX = action.x;
      paddle.targetY = action.y;
      clampTarget(paddle, playerId === next.playerIds[0] ? 0 : 1);
      return next;
    }
    if (action.type !== "tick" || !Number.isFinite(action.now)) return state;
    const now = action.now;
    const next = structuredClone(state);
    const dt = clamp((now - next.lastTickAt) / 1000, 0, 0.033);
    next.lastTickAt = now;
    if (next.phase === "countdown" && next.phaseEndsAt !== null && now >= next.phaseEndsAt) next.phase = "playing";
    if (next.phase === "goal" && next.phaseEndsAt !== null && now >= next.phaseEndsAt) resetRound(next, now);
    if (next.phase !== "playing" || dt === 0) return next;
    botTarget(next, now);
    // O número de substeps acompanha o maior deslocamento possível no
    // intervalo (disco ou raquete), com teto para manter custo previsível.
    const paddleSpeed = next.playerIds[1] === "BOT" ? Math.max(3.45, BOT_PROFILE[next.difficulty].speed) : 3.45;
    const relativeTravel = (length(next.puck.vx, next.puck.vy) + paddleSpeed) * dt;
    const substeps = clamp(Math.ceil(relativeTravel / (PUCK_RADIUS * 0.42)), 1, 12);
    const subDt = dt / substeps;
    for (let step = 0; step < substeps && next.phase === "playing"; step += 1) {
      const previousPaddles = {
        [next.playerIds[0]]: { ...next.paddles[next.playerIds[0]] },
        [next.playerIds[1]]: { ...next.paddles[next.playerIds[1]] },
      };
      movePaddle(next.paddles[next.playerIds[0]], 0, subDt, 3.45);
      movePaddle(next.paddles[next.playerIds[1]], 1, subDt, next.playerIds[1] === "BOT" ? BOT_PROFILE[next.difficulty].speed : 3.45);
      stepPuck(next, subDt, now, previousPaddles);
    }
    return next;
  }

  isSolved(state: AirHockeyState) { return state.phase === "finished"; }
  reset(state: AirHockeyState) { return this.createInitialState({ mode: state.mode, difficulty: state.difficulty, playerIds: state.humanPlayerIds }); }
}
