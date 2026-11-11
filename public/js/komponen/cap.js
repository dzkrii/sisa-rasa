import { h } from '../h.js';
import { jatuhkanCap } from '../ui.js';

/** Cap karet. `baru: true` menjatuhkannya sekali saat dipasang di halaman. */
export function cap(teks, { tinta = false, besar = false, miring, baru = false } = {}) {
  const el = h('span', { class: `cap${tinta ? ' cap--tinta' : ''}${besar ? ' cap--besar' : ''}`, style: miring === undefined ? null : `--miring: ${miring}deg` }, teks);
  if (baru) queueMicrotask(() => requestAnimationFrame(() => jatuhkanCap(el)));
  return el;
}
