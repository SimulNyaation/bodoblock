import type { Receipt } from './export';

/** A full-length scrollbar with only a viewport-sized SVG in the DOM. */
export function mountReceiptPreview(root: HTMLElement, scroll: HTMLElement, receipt: Receipt) {
  let raf = 0;
  const render = () => {
    raf = 0;
    const scale = root.clientWidth / receipt.width;
    if (!scale) return;
    root.style.height = `${receipt.height * scale}px`; root.style.position = 'relative';
    const top = Math.max(0, Math.floor((scroll.scrollTop - 20) / scale) - 128);
    const height = Math.min(receipt.height - top, Math.ceil(scroll.clientHeight / scale) + 256);
    root.innerHTML = receipt.window(top, Math.max(1, height));
    const svg = root.querySelector('svg')!;
    svg.style.position = 'absolute'; svg.style.top = `${top * scale}px`;
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };
  const observer = new ResizeObserver(schedule); observer.observe(root);
  scroll.addEventListener('scroll', schedule, { passive: true }); render();
  return () => { cancelAnimationFrame(raf); observer.disconnect(); scroll.removeEventListener('scroll', schedule); root.style.height = ''; root.style.position = ''; };
}
