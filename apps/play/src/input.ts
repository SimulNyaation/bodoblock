// CSS pixels: require deliberate downward intent, not horizontal-drag jitter.
export function isDownSwipe(dx: number, dy: number) {
  return dy >= 48 && dy > Math.abs(dx);
}

export type SwipeAxis = 'horizontal' | 'vertical';
// Lock each gesture to one axis; ambiguous diagonals wait for clearer intent.
export function swipeAxis(dx: number, dy: number): SwipeAxis | undefined {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
  if (Math.abs(dy) >= Math.abs(dx) * 1.25) return 'vertical';
  if (Math.abs(dx) >= Math.abs(dy) * 1.25) return 'horizontal';
}
