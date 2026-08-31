import { AirHockeyAction, AirHockeyState } from "./AirHockeyGame";

export const AIR_HOCKEY_AUTHORITATIVE_DELAY_MS = 80;

export type QueuedAirHockeyInput = {
  playerId: string;
  x: number;
  y: number;
  sequence: number;
  simulationTick: number;
  receivedAt: number;
  receivedOrder: number;
};

export type AirHockeyTimelineDriver = {
  getState: () => AirHockeyState;
  apply: (action: AirHockeyAction, playerId: string) => void;
};

export type LateAirHockeyInput = QueuedAirHockeyInput & {
  authoritativeTick: number;
  latenessMs: number;
};

/**
 * Avança uma simulação Duo até `authoritativeTick`, inserindo cada intenção
 * no instante físico que ela representa. A engine continua sendo a única
 * dona de movimento, CCD, impulso e limites.
 */
export function advanceAirHockeyInputTimeline(
  driver: AirHockeyTimelineDriver,
  queuedInputs: QueuedAirHockeyInput[],
  authoritativeTick: number,
) {
  const ordered = [...queuedInputs].sort((a, b) =>
    a.simulationTick - b.simulationTick || a.sequence - b.sequence || a.receivedOrder - b.receivedOrder,
  );
  const remaining: QueuedAirHockeyInput[] = [];
  const lateInputs: LateAirHockeyInput[] = [];

  for (const input of ordered) {
    const currentTick = driver.getState().lastTickAt;
    if (input.simulationTick > authoritativeTick) {
      remaining.push(input);
      continue;
    }

    if (input.simulationTick < currentTick) {
      lateInputs.push({ ...input, authoritativeTick: currentTick, latenessMs: currentTick - input.simulationTick });
      driver.apply({ type: "move", x: input.x, y: input.y, sequence: input.sequence }, input.playerId);
      continue;
    }

    if (input.simulationTick > currentTick) {
      driver.apply({ type: "tick", now: input.simulationTick }, "system");
    }
    driver.apply({ type: "move", x: input.x, y: input.y, sequence: input.sequence }, input.playerId);
  }

  const finalTick = driver.getState().lastTickAt;
  if (authoritativeTick >= finalTick) {
    driver.apply({ type: "tick", now: authoritativeTick }, "system");
  }

  return { remaining, lateInputs };
}
