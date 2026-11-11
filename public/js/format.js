import { h } from './h.js';

const IDR = new Intl.NumberFormat('id-ID');
const FORMAT_JAM = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const FORMAT_HARI = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long' });

export const rp = (n) => `Rp ${IDR.format(n)}`;
export const jam = (t) => FORMAT_JAM.format(new Date(t)).replace(':', '.');
export const hari = (t) => FORMAT_HARI.format(new Date(t));
export const kecil = (s) => s.charAt(0).toLowerCase() + s.slice(1);

const KATA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas'];
export const katakan = (n) => KATA[n] ?? String(n);

export function hitungMundur(ms) {
  const d = Math.max(0, Math.ceil(ms / 1000));
  const j = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  if (j) return `${j} jam ${m} menit`;
  if (m) return `${m} menit ${String(d % 60).padStart(2, '0')} detik`;
  return `${d} detik`;
}

export function jarak(m) {
  if (m == null) return '';
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Angka harga besar. Pembaca layar mendapat teksnya sendiri; tampilan visual disembunyikan darinya. */
export function harga(n, { ukuran = 'sedang', coret = false, merah = false, label, gratis = true } = {}) {
  const nolGratis = n === 0 && gratis;
  const baca = label ?? (nolGratis ? 'Gratis' : rp(n));
  return h('p', { class: `harga harga--${ukuran}${coret ? ' harga--coret' : ''}${merah ? ' harga--merah' : ''}` },
    h('span', { class: 'sr-saja' }, baca),
    h('span', { class: 'harga__sisi', 'aria-hidden': 'true' }, nolGratis ? 'Gratis' : [h('small', null, 'Rp'), IDR.format(n)]));
}

/** Elemen yang menghitung mundur sendiri menuju `targetMs`; ticker di main.js mengisi teksnya tiap detik. */
export const sampai = (targetMs, awalan = '') => h('span', { 'data-sampai': targetMs, 'data-awalan': awalan });
