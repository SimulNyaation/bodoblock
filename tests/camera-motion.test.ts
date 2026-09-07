import { describe, it, expect } from 'vitest';
import { followCamera } from '../apps/play/src/camera-motion';

describe('smooth camera follow', () => {
  it('accelerates gently and converges without overshoot', () => {
    let state = { position: 0, velocity: 0 };
    const first = followCamera(0, 0, 2, 1 / 60);
    expect(first.position).toBeGreaterThan(0);
    expect(first.position).toBeLessThan(0.02);
    for (let i = 0; i < 180; i++) {
      const next = followCamera(state.position, state.velocity, 2, 1 / 60);
      expect(next.position).toBeGreaterThanOrEqual(state.position);
      expect(next.position).toBeLessThanOrEqual(2);
      state = next;
    }
    expect(state.position).toBeCloseTo(2, 4);
  });
  it('is frame-rate independent and freezes with zero elapsed time', () => {
    const start = { position: 3, velocity: 0.4 };
    expect(followCamera(start.position, start.velocity, 6, 0)).toEqual(start);
    const once = followCamera(start.position, start.velocity, 6, 0.04);
    const half = followCamera(start.position, start.velocity, 6, 0.02);
    const twice = followCamera(half.position, half.velocity, 6, 0.02);
    expect(twice.position).toBeCloseTo(once.position, 12);
    expect(twice.velocity).toBeCloseTo(once.velocity, 12);
  });
});
