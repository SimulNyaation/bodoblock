import { describe, expect, it } from 'vitest';
import { isDownSwipe } from '../apps/play/src/input';

describe('deliberate downward swipe', () => {
  it('ignores taps, small movements, upward swipes and sideways jitter', () => {
    for (const [dx, dy] of [[0, 0], [2, 12], [0, 47], [0, -80], [80, 50], [-80, 50]]) {
      expect(isDownSwipe(dx, dy)).toBe(false);
    }
  });
  it('accepts downward swipes including slight sideways movement', () => {
    expect(isDownSwipe(0, 48)).toBe(true);
    expect(isDownSwipe(-15, 52)).toBe(true);
    expect(isDownSwipe(15, 52)).toBe(true);
  });
});
