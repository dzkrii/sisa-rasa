import { h } from './h.js';

let pewaktuToast;

/** Kabar singkat: terbaca layar pembaca lewat #siaran dan tampil di layar selama beberapa detik. */
export function kabari(teks, { galat = false } = {}) {
  document.getElementById('siaran').textContent = teks;
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: `toast${galat ? ' toast--galat' : ''}`, role: galat ? 'alert' : null }, teks);
  document.body.append(el);
  clearTimeout(pewaktuToast);
  pewaktuToast = setTimeout(() => el.remove(), galat ? 7000 : 4500);
}

export const memuat = (teks = 'Memuat') => h('p', { class: 'memuat nota', role: 'status' }, teks);

export function galat(pesan, ulangi) {
  return h('div', { class: 'keadaan', role: 'alert' },
    h('h2', null, 'Tidak berhasil dimuat'),
    h('p', null, pesan),
    ulangi && h('button', { class: 'tombol', type: 'button', onclick: ulangi }, 'Muat ulang bagian ini'));
}

export const kosong = (judul, isi, ...aksi) =>
  h('div', { class: 'keadaan' }, h('h2', null, judul), h('p', null, isi), aksi.length ? h('div', { class: 'baris-aksi' }, aksi) : null);

export function pesanGalat(err) {
  return err?.message ?? 'Ada masalah. Coba lagi sebentar.';
}

/** Cap jatuh: satu-satunya gerak khas. Berhenti diam bila pengguna meminta gerak dikurangi. */
export function jatuhkanCap(el) {
  if (!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const miring = parseFloat(getComputedStyle(el).getPropertyValue('--miring')) || -4;
  window.gsap.fromTo(el,
    { scale: 1.9, opacity: 0, rotation: miring - 9 },
    { scale: 1, opacity: 1, rotation: miring, duration: 0.42, ease: 'back.out(2.4)', clearProps: 'transform,opacity' });
}
