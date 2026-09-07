/** Short drops stay snappy; longer drops have time to build weight. Seconds/cells. */
export function dropDuration(distance: number) {
  return Math.min(0.38, Math.max(0.1, Math.sqrt(Math.max(0, distance) / 65)));
}

/** Accelerate into contact instead of braking just before landing. */
export function dropProgress(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return 0.18 * t + 0.82 * t * t;
}

/** A brief, restrained squeeze; never displace the tile's planted lower edge. */
export function landingScale(age: number) {
  if (age <= 0 || age >= 0.2) return 1;
  const t = age / 0.2;
  return 1 - 0.065 * Math.sin(Math.PI * t) * (1 - t);
}
