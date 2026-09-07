import { describe, expect, it } from 'vitest';
import { isDownSwipe, swipeAxis } from '../apps/play/src/input';

describe('deliberate downward swipe', () => {
  it('locks vertical intent despite sideways jitter and waits on ambiguous diagonals', () => {
    expect(swipeAxis(18, 70)).toBe('vertical');
    expect(swipeAxis(-18, -70)).toBe('vertical');
    expect(swipeAxis(70, 18)).toBe('horizontal');
    expect(swipeAxis(-70, 18)).toBe('horizontal');
    expect(swipeAxis(8, 9)).toBeUndefined();
    expect(swipeAxis(30, 30)).toBeUndefined();
    let axis = swipeAxis(3, 20);
    axis ??= swipeAxis(100, 25);
    expect(axis).toBe('vertical');
  });
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
