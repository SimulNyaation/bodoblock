// CSS pixels: require deliberate downward intent, not horizontal-drag jitter.
export function isDownSwipe(dx: number, dy: number) {
  return dy >= 48 && dy > Math.abs(dx);
}
