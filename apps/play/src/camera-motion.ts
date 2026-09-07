/** Critically damped follow: continuous velocity, no overshoot, frame-rate independent. */
export function followCamera(position: number, velocity: number, target: number, dt: number) {
  const rate = 5;
  const offset = position - target;
  const impulse = velocity + rate * offset;
  const decay = Math.exp(-rate * dt);
  return {
    position: target + (offset + impulse * dt) * decay,
    velocity: (velocity - rate * impulse * dt) * decay,
  };
}
