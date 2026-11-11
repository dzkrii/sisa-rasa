import { muatAwal } from './sesi.js';
import { fase, sekarang } from './waktu.js';
import { hitungMundur } from './format.js';
import { mulaiRouter } from './router.js';
import { pasangHeader, pasangKaki } from './komponen/header.js';
import { buatJamDemo } from './komponen/jamDemo.js';
import { galat } from './ui.js';

// Jam demo hanya dibutuhkan di halaman yang isinya bergantung jam.
const RUTE_BERJAM = [/^\/jelajah$/, /^\/porsi\//, /^\/tiket$/, /^\/dasbor$/, /^\/bantuan$/];

const isi = document.getElementById('isi');
const jamDemo = buatJamDemo();
document.body.append(jamDemo.el);

const setFase = () => { document.documentElement.dataset.fase = fase(sekarang()); };
setFase();
window.addEventListener('jam', setFase);
setInterval(setFase, 30_000);

try {
  await muatAwal();
} catch (err) {
  isi.replaceChildren(galat(err.message));
  throw err;
}

const router = mulaiRouter({
  isi,
  padaRute: (path) => jamDemo.tampilkan(RUTE_BERJAM.some((r) => r.test(path))),
});
pasangHeader(document.getElementById('atas'), { pergi: router.pergi, jalurSaatIni: router.jalur });
pasangKaki(document.getElementById('kaki'));
router.mulai();

// Hitung mundur hidup: satu pewaktu mengisi semua elemen [data-sampai]; saat satu mencapai nol, halaman dihitung ulang.
let terakhirMuatUlang = 0;
setInterval(() => {
  const sekarangMs = +sekarang();
  let habis = false;
  for (const el of document.querySelectorAll('[data-sampai]')) {
    const sisa = Number(el.dataset.sampai) - sekarangMs;
    el.textContent = `${el.dataset.awalan ?? ''}${hitungMundur(sisa)}`;
    if (sisa <= 0 && !el.dataset.habis) { el.dataset.habis = '1'; habis = true; }
  }
  if (habis && Date.now() - terakhirMuatUlang > 3000) {
    terakhirMuatUlang = Date.now();
    window.dispatchEvent(new CustomEvent('jam'));
  }
}, 1000);
