import { synthesize } from './audio';
export class PlaySound {
  private context?: AudioContext;
  private output?: DynamicsCompressorNode;
  private count = 0;
  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      if (!this.output) {
        this.output = this.context.createDynamicsCompressor();
        this.output.threshold.value = -10; this.output.ratio.value = 8;
        this.output.connect(this.context.destination);
      }
    } catch { /* Silent play remains available. */ }
  }
  place(white = false) {
    this.unlock(); if (!this.context || !this.output) return;
    const id = white ? 'jelly-light' : this.count++ % 2 ? 'jelly-light' : 'silicone';
    synthesize(this.context, this.output, id, white ? 0.48 : 0.60);
  }
  pause() { if (this.context?.state === 'running') void this.context.suspend().catch(() => {}); }
  reset() { this.count = 0; this.pause(); }
}
