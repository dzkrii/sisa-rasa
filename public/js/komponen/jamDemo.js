import { h } from '../h.js';
import { jam } from '../format.js';
import { menitHariIni, sedangDemo, sekarang, setJamDemo, setJamSungguhan } from '../waktu.js';

const LONCAT = [['14.30', 14 * 60 + 30, 'Segar'], ['16.40', 16 * 60 + 40, 'Sore'], ['18.30', 18 * 60 + 30, 'Terakhir'], ['19.40', 19 * 60 + 40, 'Bantuan']];
const jamMenit = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;

/** Penggeser jam demo: juri melihat harga, alas halaman, dan cap berubah tanpa menunggu sore. */
export function buatJamDemo() {
  let terbuka = false;
  const akar = h('div', { class: 'jam-demo', hidden: true });
  const tombol = h('button', { class: 'jam-demo__tombol', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'panel-jam', onclick: () => { terbuka = !terbuka; segarkan(); if (terbuka) geser.focus(); } });
  const nilai = h('p', { class: 'jam-demo__nilai', 'aria-hidden': 'true' });
  const geser = h('input', { type: 'range', id: 'geser-jam', min: 6 * 60, max: 23 * 60, step: 5, 'aria-label': 'Jam, WIB', oninput: (e) => { nilai.textContent = jamMenit(Number(e.target.value)); }, onchange: (e) => setJamDemo(Number(e.target.value)) });
  const panel = h('div', { class: 'jam-demo__panel', id: 'panel-jam', role: 'group', 'aria-label': 'Atur jam', hidden: true },
    h('p', { class: 'nota' }, 'Geser jam untuk melihat harga turun sepanjang hari. Harga dihitung dengan jam yang kamu pilih.'),
    nilai,
    geser,
    h('div', { class: 'baris-aksi' }, LONCAT.map(([teks, menit, tahap]) => h('button', { class: 'tombol', type: 'button', onclick: () => setJamDemo(menit), 'aria-label': `Loncat ke ${teks}, tahap ${tahap}` }, teks))),
    h('div', { class: 'baris-aksi', style: 'margin-top:.75rem' }, h('button', { class: 'tombol', type: 'button', disabled: true, id: 'jam-sungguhan', onclick: setJamSungguhan }, 'Pakai jam sungguhan')));
  akar.append(panel, tombol);

  function segarkan() {
    const m = menitHariIni();
    tombol.textContent = sedangDemo() ? `Jam diatur ${jam(sekarang())}` : `Jam ${jam(sekarang())}, atur jam`;
    tombol.setAttribute('aria-expanded', String(terbuka));
    panel.hidden = !terbuka;
    if (document.activeElement !== geser) geser.value = String(Math.min(23 * 60, Math.max(6 * 60, m)));
    nilai.textContent = jamMenit(m);
    akar.querySelector('#jam-sungguhan').disabled = !sedangDemo();
  }

  window.addEventListener('jam', segarkan);
  setInterval(segarkan, 30_000);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && terbuka) { terbuka = false; segarkan(); tombol.focus(); } });
  segarkan();
  return { el: akar, tampilkan: (ya) => { akar.hidden = !ya; } };
}
