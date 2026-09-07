import { describe, expect, it } from 'vitest';
import { dropDuration, dropProgress, landingScale } from '../apps/play/src/drop-motion';

describe('weighted drop animation', () => {
  it('accelerates monotonically and lands exactly without overshooting', () => {
    expect(dropProgress(-1)).toBe(0);
    expect(dropProgress(2)).toBe(1);
    let previous = 0, speed = 0;
    for (let i = 1; i <= 100; i++) {
      const next = dropProgress(i / 100);
      expect(next - previous).toBeGreaterThan(speed);
      speed = next - previous; previous = next;
    }
    expect(previous).toBe(1);
  });
  it('scales flight time with distance while bounding input lock time', () => {
    expect(dropDuration(0)).toBe(0.1);
    expect(dropDuration(4)).toBeGreaterThan(dropDuration(1));
    expect(dropDuration(10000)).toBe(0.38);
  });
  it('squeezes briefly and restores exact size without expanding into neighbors', () => {
    expect(landingScale(0)).toBe(1);
    expect(landingScale(0.06)).toBeLessThan(0.97);
    expect(landingScale(0.2)).toBe(1);
    expect(landingScale(20)).toBe(1);
    for (let age = 0; age < 0.2; age += 0.001) {
      expect(landingScale(age)).toBeGreaterThanOrEqual(0.935);
      expect(landingScale(age)).toBeLessThanOrEqual(1);
    }
  });
});
