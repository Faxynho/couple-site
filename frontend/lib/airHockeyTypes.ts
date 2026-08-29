export const AIR_HOCKEY_DIFFICULTIES = {
  easy: { label: "Fácil", emoji: "🟢", hint: "BOT mais lento e impreciso" },
  medium: { label: "Médio", emoji: "🟡", hint: "Rápido e equilibrado" },
  hard: { label: "Difícil", emoji: "🔴", hint: "BOT ágil e agressivo" },
} as const;

export type AirHockeyDifficulty = keyof typeof AIR_HOCKEY_DIFFICULTIES;
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
  /** Relógio do passo autoritativo; usado apenas para extrapolar snapshots no Canvas. */
  lastTickAt: number;
  /** Offset estimado entre o relógio do cliente e o do servidor. Campo local, nunca persistido. */
  clockOffsetMs?: number;
  lastGoalBy: string | null;
  goalSerial: number;
  impactSerial: number;
  impactStrength: number;
  impactKind: "wall" | "paddle" | null;
  results: AirHockeyResult[];
}
