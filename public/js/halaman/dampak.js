import { h } from '../h.js';
import { api } from '../api.js';
import { rp } from '../format.js';
import { konfigurasi } from '../sesi.js';
import { foto } from '../komponen/foto.js';
import { galat } from '../ui.js';

const IDR = new Intl.NumberFormat('id-ID');
const SVG = 'http://www.w3.org/2000/svg';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const s = (tag, attrs, ...anak) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs ?? {})) if (v != null) el.setAttribute(k, v);
  el.append(...anak.flat().filter(Boolean));
  return el;
};
const ringkas = (n) => (n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1).replace('.', ',')} juta` : rp(n));
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function acak(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PORSI_PER_TUNAS = 10;
const TANAH_Y = 408;

function tunas(x, tinggi, miring, gratis, urutan) {
  const atasX = x + miring;
  const atasY = TANAH_Y - tinggi;
  const daun = (arah) => `M ${atasX} ${atasY + 6} q ${arah * 24} -2 ${arah * 28} -24 q ${-arah * 22} 0 ${-arah * 28} 24 z`;
  return s('g', { class: `tunas${gratis ? ' tunas--gratis' : ''}`, 'data-i': urutan },
    s('path', { d: `M ${x} ${TANAH_Y} C ${x - miring * 0.6} ${TANAH_Y - tinggi * 0.4}, ${x + miring * 1.4} ${TANAH_Y - tinggi * 0.7}, ${atasX} ${atasY}`, class: 'tunas__batang' }),
    s('path', { d: daun(1), class: 'tunas__daun' }),
    tinggi > 70 ? s('path', { d: daun(-1), class: 'tunas__daun' }) : null);
}

/** Toples kaca. Satu tunas per 10 porsi yang diambil; tunas bertanda gratis mewakili porsi yang diklaim lewat dana bantuan. */
function toples(jumlah, jumlahGratis) {
  const rand = acak(4242);
  const langkah = jumlahGratis ? Math.max(1, Math.floor(jumlah / jumlahGratis)) : jumlah + 1;
  const kebun = s('g', { class: 'kebun' });
  for (let i = 0; i < jumlah; i++) {
    const gratis = jumlahGratis > 0 && i % langkah === Math.floor(langkah / 2) && Math.floor(i / langkah) < jumlahGratis;
    kebun.append(tunas(86 + rand() * 228, 40 + rand() * 135, (rand() - 0.5) * 34, gratis, i));
  }
  return s('svg', { viewBox: '0 0 400 470', class: 'toples', role: 'img', 'aria-labelledby': 'toples-judul toples-ket' },
    s('title', { id: 'toples-judul' }, `Toples berisi ${jumlah} tunas`),
    s('desc', { id: 'toples-ket' }, `Satu tunas untuk setiap ${PORSI_PER_TUNAS} porsi yang diambil. Tunas bertanda merah mewakili porsi gratis dari dana bantuan.`),
    s('rect', { x: 118, y: 22, width: 164, height: 36, rx: 3, class: 'toples__tutup' }),
    s('path', { d: 'M128 58 H272 V82 H128 Z', class: 'toples__leher' }),
    s('rect', { x: 52, y: 82, width: 296, height: 360, rx: 38, class: 'toples__badan' }),
    kebun,
    s('path', { d: 'M62 424 H338 V412 H62 Z', class: 'toples__tanah' }),
    s('path', { d: 'M76 128 V300', class: 'toples__kilap' }),
    s('path', { d: 'M96 128 V176', class: 'toples__kilap' }));
}

/** Angka yang menghitung naik saat sebuah bab muncul. Tanpa gerak, langsung tampil utuh. */
function naik(el, nilai, format) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = format(nilai); return; }
  const mulai = performance.now();
  const langkah = (t) => {
    const p = clamp((t - mulai) / 800, 0, 1);
    el.textContent = format(Math.round(nilai * (1 - (1 - p) ** 3)));
    if (p < 1) requestAnimationFrame(langkah);
  };
  requestAnimationFrame(langkah);
}

/** Scrollytelling: gulir mengisi toples bab demi bab, dari porsi yang ditayangkan sampai porsi gratis. */
function cerita(d) {
  const jumlahTunas = Math.min(90, Math.floor(d.porsiTerselamatkan / PORSI_PER_TUNAS));
  const jumlahGratis = d.porsiBantuan > 0 ? Math.max(1, Math.round(d.porsiBantuan / PORSI_PER_TUNAS)) : 0;
  const svg = toples(jumlahTunas, jumlahGratis);
  const semuaTunas = [...svg.querySelectorAll('.tunas')];
  const BAB = [
    { fase: 'siang', nama: 'Dari sisa', nilai: d.tayangTutup, format: (n) => IDR.format(n), satuan: 'porsi', isi: `Itulah porsi yang ditayangkan ${d.kantin} kantin sebelum tutup, dari listing yang sudah selesai. Semuanya porsi yang belum laku.` },
    { fase: 'siang', nama: 'Ke piring', nilai: d.porsiTerselamatkan, format: (n) => IDR.format(n), satuan: 'porsi diambil', isi: `Sebanyak ${d.tingkatAmbil}% dari porsi yang tayang sampai ke tangan orang. Tiap tunas di toples mewakili ${PORSI_PER_TUNAS} porsi.` },
    { fase: 'sore', nama: 'Ke kantin', nilai: d.rupiahKeKantin, format: (n) => ringkas(n), satuan: 'diterima kantin', isi: `Uang yang masuk ke ${d.kantin} kantin dari dagangan yang sebelumnya terancam terbuang. Angkanya dari pesanan yang benar-benar diambil.` },
    { fase: 'malam', nama: 'Gratis', nilai: d.porsiBantuan, format: (n) => IDR.format(n), satuan: 'porsi gratis', isi: `Diklaim oleh ${d.mahasiswaTerbantu} mahasiswa berbeda dan dibayar dana bantuan. Tunas merah di toples adalah porsi-porsi itu.` },
  ];
  const bab = BAB.map((b, i) => {
    const angka = h('p', { class: 'dmp-angka', 'aria-hidden': 'true' }, b.format(0));
    return { b, angka, el: h('div', { class: 'dmp-bab' },
      h('p', { class: 'nota dmp-bab__urut' }, `${i + 1} dari ${BAB.length}`),
      h('h2', null, b.nama),
      angka,
      h('span', { class: 'sr-saja' }, `${b.format(b.nilai)} ${b.satuan}`),
      h('p', { class: 'dmp-bab__satuan' }, b.satuan),
      h('p', { class: 'dmp-bab__isi' }, b.isi)) };
  });
  const rel = h('ol', { class: 'dmp-rel', 'aria-hidden': 'true' }, BAB.map((b) => h('li', null, b.nama)));
  const panggung = h('div', { class: 'dmp-panggung' },
    h('figure', { class: 'dmp-toples' }, svg),
    h('div', { class: 'dmp-babdaftar' }, bab.map((x) => x.el)),
    rel);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    semuaTunas.forEach((t) => t.classList.add('tunas--tampak'));
    svg.classList.add('toples--gratis');
    bab.forEach((x) => { x.angka.textContent = x.b.format(x.b.nilai); x.el.classList.add('dmp-bab--aktif'); });
    return { el: h('section', { class: 'dmp-cerita dmp-cerita--statis', 'aria-label': 'Perjalanan porsi sisa' }, panggung), hancur() {} };
  }

  const lintasan = h('div', { class: 'dmp-lintasan' }, panggung);
  const el = h('section', { class: 'dmp-cerita', 'aria-label': 'Perjalanan porsi sisa' }, lintasan);
  let babTerakhir = -1;
  let tampilTerakhir = -1;
  function terapkan(p) {
    const no = p < 0.2 ? 0 : p < 0.55 ? 1 : p < 0.78 ? 2 : 3;
    const tampil = no === 0 ? 0 : Math.round(jumlahTunas * clamp((p - 0.2) / 0.35, 0, 1));
    if (tampil !== tampilTerakhir) { tampilTerakhir = tampil; semuaTunas.forEach((t, i) => t.classList.toggle('tunas--tampak', i < tampil)); }
    if (no !== babTerakhir) {
      babTerakhir = no;
      panggung.dataset.fase = BAB[no].fase;
      svg.classList.toggle('toples--gratis', no === 3);
      bab.forEach((x, i) => { x.el.classList.toggle('dmp-bab--aktif', i === no); x.el.setAttribute('aria-current', i === no ? 'step' : 'false'); });
      rel.querySelectorAll('li').forEach((li, i) => li.classList.toggle('dmp-rel--aktif', i === no));
      naik(bab[no].angka, BAB[no].nilai, BAB[no].format);
    }
  }
  const hitung = () => {
    const r = lintasan.getBoundingClientRect();
    terapkan(clamp((56 - r.top) / Math.max(1, r.height - (innerHeight - 56)), 0, 1));
  };
  let raf = 0;
  const saatGulir = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(hitung); };
  window.addEventListener('scroll', saatGulir, { passive: true });
  window.addEventListener('resize', saatGulir);
  terapkan(0);
  queueMicrotask(() => requestAnimationFrame(hitung));
  return { el, hancur() { cancelAnimationFrame(raf); window.removeEventListener('scroll', saatGulir); window.removeEventListener('resize', saatGulir); } };
}

function hidanganTeratas(menu) {
  const maks = Math.max(1, ...menu.map((m) => m.porsi));
  return h('ol', { class: 'dmp-menu' }, menu.map((m, i) => h('li', { class: `dmp-menu__baris${i === 0 ? ' dmp-menu__baris--utama' : ''}` },
    m.foto ? h('div', { class: 'bingkai bingkai--kecil dmp-menu__foto' }, foto(m.foto, { lebar: 480, tinggi: 360 })) : null,
    h('div', { class: 'dmp-menu__isi' },
      h('h3', null, m.judul),
      h('p', { class: 'nota' }, m.kantin),
      h('div', { class: 'dmp-menu__bar' }, h('span', { style: `width:${(m.porsi / maks) * 100}%` }), h('strong', { class: 'angka' }, `${IDR.format(m.porsi)} porsi`))))));
}

function grafikHarian(hari) {
  const maks = Math.max(1, ...hari.map((x) => x.porsi));
  const tgl = (t) => { const [, m, d] = t.split('-').map(Number); return { d, m }; };
  return h('div', { class: 'dmp-grafik' },
    h('ol', { class: 'dmp-kolom', 'aria-label': 'Porsi diambil per hari' }, hari.map((x, i) => h('li', { class: i === hari.length - 1 ? 'dmp-kolom--kini' : null, style: `--tinggi:${Math.max(2, (x.porsi / maks) * 100)}%` },
      h('span', { class: 'angka dmp-kolom__nilai' }, x.porsi),
      h('span', { class: 'dmp-kolom__bar', 'aria-hidden': 'true' }),
      h('span', { class: 'sr-saja' }, `${tgl(x.tanggal).d} ${BULAN[tgl(x.tanggal).m - 1]}`)))),
    h('ol', { class: 'dmp-kolom__tgl nota', 'aria-hidden': 'true' }, hari.map((x, i) => { const { d, m } = tgl(x.tanggal); return h('li', null, d === 1 || i === 0 ? `${d} ${BULAN[m - 1]}` : String(d)); })));
}

function sdg(d) {
  const persenBantuan = d.porsiTerselamatkan ? (d.porsiBantuan / d.porsiTerselamatkan) * 100 : 0;
  const tidakAmbil = d.tayangTutup - d.diambilTutup;
  const maksRupiah = Math.max(1, ...d.perKantin.map((k) => k.rupiah));
  const pita = (nomor, nama, isi, fase) => h('article', { class: 'dmp-sdg__pita', 'data-fase': fase ?? null, 'aria-labelledby': `sdg-${nomor}` },
    h('div', { class: 'dmp-sdg__tanda' }, h('span', { class: 'nota' }, 'SDG'), h('p', { class: 'dmp-sdg__nomor', 'aria-hidden': 'true' }, String(nomor)), h('h3', { id: `sdg-${nomor}` }, `SDG ${nomor}: ${nama}`)),
    h('div', { class: 'dmp-sdg__isi' }, isi));
  const belum = (teks) => h('p', { class: 'dmp-sdg__belum' }, h('strong', null, 'Belum bisa dibuktikan: '), teks);

  return h('section', { class: 'dmp-sdg', 'aria-labelledby': 'judul-sdg' },
    h('div', { class: 'dmp-sdg__kepala' },
      h('h2', { id: 'judul-sdg' }, 'Sumbangan untuk tujuan pembangunan berkelanjutan'),
      h('p', null, 'Tiga tujuan yang disasar Sisa Rasa, masing-masing dengan angka yang bisa dihitung dari pesanan, dan catatan tentang apa yang belum bisa dibuktikan.')),

    pita(8, 'Pekerjaan Layak dan Pertumbuhan Ekonomi', [
      h('p', { class: 'dmp-sdg__angka' }, ringkas(d.rupiahKeKantin)),
      h('p', null, `Pendapatan tambahan untuk ${d.kantin} usaha kecil kantin dari porsi yang biasanya tidak laku. Penjual tahu persis rupiah yang ia terima di tiap tahap sebelum menayangkan porsi.`),
      h('ol', { class: 'dmp-kantin' }, d.perKantin.map((k) => h('li', null,
        h('span', null, k.nama),
        h('span', { class: 'dmp-kantin__bar', 'aria-hidden': 'true' }, h('i', { style: `width:${(k.rupiah / maksRupiah) * 100}%` })),
        h('span', { class: 'angka' }, rp(k.rupiah))))),
      belum('pendapatan bersih setelah modal bahan, dan apakah pendapatan itu menambah pekerjaan.')]),

    pita(10, 'Berkurangnya Kesenjangan', [
      h('p', { class: 'dmp-sdg__angka' }, `${IDR.format(d.porsiBantuan)} porsi gratis`),
      h('p', null, `Diklaim oleh ${d.mahasiswaTerbantu} mahasiswa berbeda tanpa nama mereka terlihat oleh penjual. Dana bantuan sudah membayar ${rp(d.totalTersalur)} ke kantin dari ${rp(d.totalDonasi)} patungan yang masuk.`),
      h('div', { class: 'dmp-pecah' },
        h('div', { class: 'dmp-pecah__bar', 'aria-hidden': 'true' }, h('span', { style: `flex:${Math.max(persenBantuan, 1)}` }), h('span', { style: `flex:${100 - persenBantuan}` })),
        h('p', { class: 'nota' }, `${persenBantuan.toFixed(1).replace('.', ',')}% dari semua porsi yang diambil adalah porsi gratis.`)),
      belum('apakah klaim ini benar-benar mengurangi mahasiswa yang menahan lapar. Itu butuh survei.')], 'malam'),

    pita(12, 'Konsumsi dan Produksi yang Bertanggung Jawab', [
      h('p', { class: 'dmp-sdg__angka' }, `${d.tingkatAmbil}% terambil`),
      h('p', null, `Dari ${IDR.format(d.tayangTutup)} porsi sisa yang tayang dan sudah tutup, ${IDR.format(d.diambilTutup)} sampai ke piring dan ${IDR.format(tidakAmbil)} tidak terambil. Ini sejalan dengan target 12.3: mengurangi limbah makanan.`),
      h('div', { class: 'dmp-pecah' },
        h('div', { class: 'dmp-pecah__bar dmp-pecah__bar--tebal', 'aria-hidden': 'true' }, h('span', { style: `flex:${d.diambilTutup}` }, 'Diambil'), h('span', { style: `flex:${Math.max(tidakAmbil, 1)}` }, 'Tidak terambil')),
        h('p', { class: 'nota' }, 'Dihitung dalam porsi, bukan kilogram.')),
      belum('berat makanan yang diselamatkan dan emisi karbon yang dihindari. Keduanya butuh faktor yang bersumber, dan karya ini belum punya.')]));
}

export default async function dampak() {
  let d;
  try {
    d = await api.get('/impact');
  } catch (err) {
    return { judul: 'Dampak', el: h('section', { class: 'dmp' }, h('h1', null, 'Dampak'), galat(err.message)) };
  }
  const kampus = konfigurasi().kampus.name;
  const hari = d.perHari.slice(-14);
  const bagianCerita = cerita(d);

  const el = h('article', { class: 'dmp', 'aria-labelledby': 'judul-dampak' },
    h('header', { class: 'dmp-kepala' },
      h('div', { class: 'dmp-kepala__teks' },
        h('h1', { id: 'judul-dampak' }, 'Dampak yang bisa dihitung'),
        h('p', { class: 'dmp-kepala__kalimat' },
          'Di sekitar ', kampus, ', ', h('b', null, `${IDR.format(d.porsiTerselamatkan)} porsi`), ' yang hampir terbuang sampai ke piring. ',
          h('b', null, `${d.kantin} kantin`), ' menerima ', h('b', null, ringkas(d.rupiahKeKantin)), ', dan ', h('b', null, `${d.mahasiswaTerbantu} mahasiswa`), ' makan gratis.'),
        h('p', { class: 'nota' }, 'Semua angka dihitung dari pesanan berstatus diambil. Gulir untuk membaca ceritanya.')),
      d.perMenu.length >= 3 ? h('figure', { class: 'dmp-kolase' },
        d.perMenu.slice(0, 3).map((m, i) => h('div', { class: `bingkai dmp-kolase__foto dmp-kolase__foto--${i}` }, foto(m.foto, { lebar: 640, tinggi: 480, utama: true }))),
        h('figcaption', { class: 'nota' }, `Paling sering diselamatkan: ${d.perMenu.slice(0, 3).map((m) => m.judul.toLowerCase()).join(', ')}.`)) : null),

    bagianCerita.el,

    h('section', { class: 'dmp-bagian', 'aria-labelledby': 'judul-menu' },
      h('h2', { id: 'judul-menu' }, 'Hidangan yang paling sering diselamatkan'),
      d.perMenu.length ? hidanganTeratas(d.perMenu) : h('p', null, 'Belum ada porsi yang diambil.')),

    h('section', { class: 'dmp-bagian', 'aria-labelledby': 'judul-harian' },
      h('h2', { id: 'judul-harian' }, 'Berapa porsi diambil tiap hari?'),
      hari.length ? grafikHarian(hari) : h('p', null, 'Belum ada porsi yang diambil dalam 30 hari terakhir.')),

    sdg(d),

    h('section', { class: 'dmp-bagian dmp-hitung', 'aria-labelledby': 'judul-hitung' },
      h('h2', { id: 'judul-hitung' }, 'Cara menghitung'),
      h('dl', null,
        h('dt', null, 'Porsi terselamatkan'), h('dd', null, 'Jumlah porsi pada pesanan berstatus diambil, baik yang dibeli maupun yang diklaim sebagai bantuan.'),
        h('dt', null, 'Rupiah ke kantin'), h('dd', null, 'Jumlah harga yang diterima penjual pada pesanan diambil. Untuk klaim bantuan, nilainya 50% harga dasar dari dana bantuan.'),
        h('dt', null, 'Mahasiswa terbantu'), h('dd', null, 'Akun berbeda yang pernah mengambil porsi bantuan, tanpa nama.'),
        h('dt', null, 'Tingkat terambil'), h('dd', null, 'Porsi diambil dibagi porsi yang ditayangkan, hanya dari listing yang sudah tutup. Listing yang masih tayang belum bisa dinilai.'),
        h('dt', null, 'Emisi karbon'), h('dd', null, 'Sengaja tidak ditampilkan. Angkanya butuh faktor emisi yang bersumber, dan karya ini belum punya satu pun.'))));

  return { judul: 'Dampak', el, hancur: bagianCerita.hancur };
}
