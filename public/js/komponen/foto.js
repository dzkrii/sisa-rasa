import { h } from '../h.js';

/** Foto hidangan dengan ukuran tetap supaya tata letak tidak bergeser saat gambar tiba. Bawaannya hiasan (alt kosong) karena judulnya selalu ada di dekatnya. */
export function foto(src, { alt = '', lebar = 1280, tinggi = 960, kelas = '', utama = false } = {}) {
  if (!src) return null;
  return h('img', { class: `foto ${kelas}`.trim(), src, alt, width: lebar, height: tinggi, loading: utama ? 'eager' : 'lazy', fetchpriority: utama ? 'high' : null, decoding: 'async' });
}
