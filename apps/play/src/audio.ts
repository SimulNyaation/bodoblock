export type SoundId = 'silicone' | 'jelly-light';

/** V2's two original synthesis recipes, independent of V1 settings and storage. */
export function synthesize(ctx: BaseAudioContext, destination: AudioNode, id: SoundId, volume: number) {
  const now = ctx.currentTime + 0.005;
  const bus = ctx.createGain(); bus.gain.value = volume * 0.7;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1800; filter.Q.value = 0.5;
  bus.connect(filter).connect(destination);
  let pending = 0;
  const sources: AudioScheduledSourceNode[] = [];
  const envelope = (source: AudioScheduledSourceNode & AudioNode, amplitude: number, duration: number, attack = 0.004, rebound?: { time: number; strength: number }) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(amplitude, now + attack);
    if (rebound) {
      gain.gain.exponentialRampToValueAtTime(amplitude * 0.32, now + rebound.time - 0.016);
      gain.gain.linearRampToValueAtTime(amplitude * rebound.strength, now + rebound.time);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.gain.linearRampToValueAtTime(0, now + duration + 0.012);
    source.connect(gain).connect(bus); pending++; sources.push(source);
    source.onended = () => { source.disconnect(); gain.disconnect(); if (--pending === 0) { bus.disconnect(); filter.disconnect(); } };
    source.start(now); source.stop(now + duration + 0.02);
  };
  const tone = (start: number, end: number, amplitude: number, duration: number, glide = 0.04, attack = 0.004) => {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(start, now); osc.frequency.exponentialRampToValueAtTime(end, now + glide);
    envelope(osc, amplitude, duration, attack);
  };
  const jelly = () => {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.019);
    osc.frequency.exponentialRampToValueAtTime(490, now + 0.063);
    osc.frequency.exponentialRampToValueAtTime(365, now + 0.15);
    envelope(osc, 0.64, 0.21, 0.008, { time: 0.052, strength: 0.68 });
  };
  const air = (amplitude: number, duration: number, cutoff: number) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * (duration + 0.03)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 73, sample = 0;
    const smoothing = 1 - Math.exp(-2 * Math.PI * cutoff / ctx.sampleRate);
    for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; sample += smoothing * (seed / 0xffffffff * 2 - 1 - sample); data[i] = sample; }
    const source = ctx.createBufferSource(); source.buffer = buffer; envelope(source, amplitude, duration, 0.003);
  };
  if (id === 'silicone') {
    tone(255, 145, 0.69, 0.20, 0.09, 0.009); tone(410, 290, 0.17, 0.14, 0.085, 0.01);
  } else {
    jelly(); tone(520, 730, 0.11, 0.115, 0.06, 0.012); air(0.055, 0.03, 1000);
  }
  return () => { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setTargetAtTime(0, ctx.currentTime, 0.005); for (const source of sources) { try { source.stop(ctx.currentTime + 0.03); } catch { /* Already ended. */ } } };
}
