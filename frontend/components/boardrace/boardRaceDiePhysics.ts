export const DIE_MIN_DRAG_DISTANCE = 18;
export const DIE_MAX_SPEED = 1_650;
export const DIE_PLANAR_FRICTION = 0.34;
export const DIE_HEIGHT_GRAVITY = 1_650;
export const DIE_BOUNCE = 0.68;
export const DIE_HEIGHT_BOUNCE = 0.34;

export type DieMotion = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  height: number;
  heightVelocity: number;
  rx: number;
  ry: number;
  rz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
};

export type DieBounds = { width: number; height: number; size: number };
export type DiePoint = { x: number; y: number; time: number };
export type DieOrientation = { x: number; y: number; z: number };

export const DIE_FACE_ORIENTATION: Record<number, DieOrientation> = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: -90, y: 0, z: 0 },
  3: { x: 0, y: -90, z: 0 },
  4: { x: 0, y: 90, z: 0 },
  5: { x: 90, y: 0, z: 0 },
  6: { x: 0, y: 180, z: 0 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Usa somente as amostras mais recentes do gesto para que um puxão lento
 * seguido de uma soltura rápida seja percebido como um lançamento forte. */
export function velocityFromRecentPoints(points: readonly DiePoint[], windowMs = 110): { vx: number; vy: number } {
  const last = points.at(-1);
  if (!last) return { vx: 0, vy: 0 };
  const recent = points.filter((point) => last.time - point.time <= windowMs);
  const first = recent[0] ?? last;
  const elapsedSeconds = Math.max(0.016, (last.time - first.time) / 1_000);
  return {
    vx: clamp((last.x - first.x) / elapsedSeconds, -DIE_MAX_SPEED, DIE_MAX_SPEED),
    vy: clamp((last.y - first.y) / elapsedSeconds, -DIE_MAX_SPEED, DIE_MAX_SPEED),
  };
}

export function createLaunchMotion(
  dx: number,
  dy: number,
  vx: number,
  vy: number,
  bounds: DieBounds,
  start?: { x: number; y: number }
): DieMotion {
  const distance = Math.max(1, Math.hypot(dx, dy));
  const directionX = dx / distance;
  const directionY = dy / distance;
  let launchVx = clamp(vx + directionX * 250, -DIE_MAX_SPEED, DIE_MAX_SPEED);
  let launchVy = clamp(vy + directionY * 250, -DIE_MAX_SPEED, DIE_MAX_SPEED);
  const planarSpeed = Math.hypot(launchVx, launchVy);
  if (planarSpeed < 310) {
    launchVx = directionX * 310;
    launchVy = directionY * 310;
  }
  const maxX = Math.max(0, bounds.width - bounds.size);
  const maxY = Math.max(0, bounds.height - bounds.size);
  const x = clamp(start?.x ?? bounds.width / 2 - bounds.size / 2, 0, maxX);
  const y = clamp(start?.y ?? bounds.height * 0.8 - bounds.size / 2, 0, maxY);
  const strength = clamp(Math.hypot(launchVx, launchVy) / DIE_MAX_SPEED, 0, 1);
  return {
    x,
    y,
    vx: launchVx,
    vy: launchVy,
    height: 0,
    heightVelocity: 510 + strength * 230,
    rx: 0,
    ry: 0,
    rz: 0,
    spinX: -launchVy * 0.72 + 420,
    spinY: launchVx * 0.72 + 460,
    spinZ: (launchVx - launchVy) * 0.2 + 260,
  };
}

/** Física top-down: X/Y preservam a direção do gesto; a gravidade existe em
 * uma dimensão de altura separada, usada apenas para elevação e sombra. */
export function stepDieMotion(current: DieMotion, bounds: DieBounds, deltaSeconds: number): DieMotion {
  const dt = clamp(deltaSeconds, 0.001, 0.032);
  const next = { ...current };
  next.x += next.vx * dt;
  next.y += next.vy * dt;
  next.heightVelocity -= DIE_HEIGHT_GRAVITY * dt;
  next.height += next.heightVelocity * dt;
  const maxX = Math.max(0, bounds.width - bounds.size);
  const maxY = Math.max(0, bounds.height - bounds.size);

  if (next.x <= 0 || next.x >= maxX) {
    next.x = clamp(next.x, 0, maxX);
    next.vx *= -DIE_BOUNCE;
    next.spinY *= -0.82;
    next.spinZ *= 0.9;
  }
  if (next.y <= 0 || next.y >= maxY) {
    next.y = clamp(next.y, 0, maxY);
    next.vy *= -DIE_BOUNCE;
    next.spinX *= -0.82;
    next.spinZ *= 0.9;
  }
  if (next.height <= 0) {
    next.height = 0;
    next.heightVelocity = Math.abs(next.heightVelocity) > 105 ? -next.heightVelocity * DIE_HEIGHT_BOUNCE : 0;
    next.spinX *= 0.92;
    next.spinY *= 0.92;
  }

  const planarDamping = Math.pow(DIE_PLANAR_FRICTION, dt);
  const spinDamping = Math.pow(0.23, dt);
  next.vx *= planarDamping;
  next.vy *= planarDamping;
  next.rx += next.spinX * dt;
  next.ry += next.spinY * dt;
  next.rz += next.spinZ * dt;
  next.spinX *= spinDamping;
  next.spinY *= spinDamping;
  next.spinZ *= spinDamping;
  return next;
}

export function throwDurationMs(motion: DieMotion): number {
  return Math.round(1_150 + clamp(Math.hypot(motion.vx, motion.vy) / DIE_MAX_SPEED, 0, 1) * 500);
}

export function nearestEquivalentAngle(angle: number, desired: number): number {
  return angle + ((((desired - angle) % 360) + 540) % 360 - 180);
}

export function closestFinalOrientation(current: DieMotion, value: number | null) {
  const target = DIE_FACE_ORIENTATION[value ?? 1] ?? DIE_FACE_ORIENTATION[1];
  return {
    x: nearestEquivalentAngle(current.rx, target.x),
    y: nearestEquivalentAngle(current.ry, target.y),
    z: nearestEquivalentAngle(current.rz, target.z),
  };
}

/** Curva cúbica monotônica: conserva parte da velocidade angular que já aponta
 * para o alvo, mas nunca ultrapassa a orientação nem precisa corrigi-la depois. */
export function interpolateSettlingOrientation(
  from: DieOrientation,
  target: DieOrientation,
  spin: DieOrientation,
  progress: number,
  durationMs: number
): DieOrientation {
  const t = clamp(progress, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const durationSeconds = Math.max(0.001, durationMs / 1_000);
  const axis = (start: number, end: number, angularVelocity: number) => {
    const delta = end - start;
    if (Math.abs(delta) < 0.0001) return end;
    const direction = Math.sign(delta);
    const forwardTangent = Math.max(0, angularVelocity * direction * durationSeconds);
    const tangent = direction * Math.min(forwardTangent, Math.abs(delta) * 2.6);
    return h00 * start + h10 * tangent + h01 * end;
  };
  return {
    x: axis(from.x, target.x, spin.x),
    y: axis(from.y, target.y, spin.y),
    z: axis(from.z, target.z, spin.z),
  };
}

/** Parâmetros reproduzíveis para o lançamento visto por oponente/BOT. */
export function deterministicThrow(serial: number, value: number | null) {
  const seed = ((serial * 1103515245) ^ ((value ?? 1) * 12345)) >>> 0;
  const angle = (((seed % 280) + 130) % 360) * (Math.PI / 180);
  const speed = 760 + ((seed >>> 8) % 420);
  return { dx: Math.cos(angle) * 110, dy: Math.sin(angle) * 110, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
