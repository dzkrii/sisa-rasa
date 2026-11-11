import { h } from '../h.js';
import { api } from '../api.js';
import { harga, jam, kecil, rp } from '../format.js';
import { PERAN_DEMO, konfigurasi, masukDemo } from '../sesi.js';
import { sekarang } from '../waktu.js';
import { kabari, kosong, pesanGalat } from '../ui.js';
import { cap } from '../komponen/cap.js';
import { foto } from '../komponen/foto.js';
import { garisHarga, keHarga } from '../komponen/garisHarga.js';
import { jadwalTahap, tahapPada } from '/shared/pricing.js';

const FASE_TAHAP = ['siang', 'sore', 'sore', 'malam'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Porsi yang paling jauh turun harganya dan paling sedikit sisanya: ia yang paling jelas memperagakan siklusnya. */
function pilihUnggulan(daftar) {
  const buka = daftar.filter((l) => l.kondisi.status === 'buka' && l.stokSisa > 0);
  if (buka.length) return buka.sort((a, b) => b.kondisi.tahap - a.kondisi.tahap || a.stokSisa - b.stokSisa)[0];
  return daftar.filter((l) => l.kondisi.status === 'belum').sort((a, b) => +new Date(a.jendela.mulai) - +new Date(b.jendela.mulai))[0] ?? daftar[0] ?? null;
}

/** Label harga yang menempel di foto: harga lama dicoret, harga yang berlaku merah, dan capnya. */
function labelHarga(l, kondisi, jadwal) {
  if (kondisi.status !== 'buka') {
    return [harga(l.hargaDasar, { ukuran: 'besar' }), h('span', { class: 'label-harga__cap' }, cap(kondisi.status === 'belum' ? `Buka ${jam(l.jendela.mulai)}` : 'Sudah tutup', { tinta: true }))];
  }
  const tampil = jadwal.filter((t) => t.tahap <= kondisi.tahap);
  return [
    ...tampil.map((t) => {
      const kini = t.tahap === kondisi.tahap;
      return harga(kini && kondisi.bantuan ? 0 : (t.harga ?? t.penjualTerima), { ukuran: kini ? 'besar' : 'sedang', coret: !kini, merah: kini });
    }),
    h('span', { class: 'label-harga__cap' }, cap(kondisi.bantuan ? 'Gratis bagi penerima' : `Tahap ${kecil(kondisi.nama)}`, { baru: true })),
  ];
}

/** Scrollytelling: menggulir halaman memajukan jam satu porsi dari buka sampai tutup, memakai logika harga yang sama dengan server. */
function buatHari(l, kolamCukup) {
  const k = keHarga(l);
  const jadwal = jadwalTahap(k, { kolamCukup });
  const mulai = +new Date(l.jendela.mulai);
  const akhir = +new Date(l.jendela.selesai);
  const teks = [
    `${l.kantin.nama} menayangkan ${l.stok} porsi ${kecil(l.judul)}. Harga penuh, ${rp(jadwal[0].harga)}.`,
    `Sisa waktu ambil tinggal 60%. Harga dicoret jadi ${rp(jadwal[1].harga)}, dan mahasiswa di sekitar kampus mulai memesan.`,
    `Sisa waktu tinggal 30%. Harga dicoret lagi jadi ${rp(jadwal[2].harga)}. Kantin masih dibayar, dan tidak ada yang dibuang.`,
    `Di 10% waktu terakhir porsi tidak dijual lagi. Mahasiswa yang membutuhkan mengklaimnya gratis, dan dana bantuan membayar kantin ${rp(jadwal[3].penjualTerima)}.`,
  ];
  const kepala = h('div', { class: 'hari__kepala' },
    h('h2', { id: 'judul-hari' }, 'Satu porsi, dari siang sampai tutup'),
    h('p', null, `Gulir pelan-pelan. Jamnya maju, dan harga ${kecil(l.judul)} dari ${l.kantin.nama} ikut bergerak.`));

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { el: h('section', { class: 'hari hari--statis', 'aria-labelledby': 'judul-hari' }, kepala, garisHarga(l, { bentuk: 'lebar', kolamCukup })), hancur() {} };
  }

  const jamEl = h('p', { class: 'hari__jam', 'aria-hidden': 'true' });
  const hargaEl = h('div', { class: 'label-harga' });
  const langkah = teks.map((t, i) => h('div', { class: 'hari__langkah' }, h('h3', null, jadwal[i].nama), h('p', null, t)));
  const marka = h('span', { class: 'hari__marka', 'aria-hidden': 'true' });
  const lebarTahap = [0.4, 0.3, 0.2, 0.1];
  const garis = h('div', { class: 'hari__garis', 'aria-hidden': 'true' },
    h('div', { class: 'hari__ruas' }, jadwal.map((t, i) => h('span', { style: `flex:${lebarTahap[i]}`, 'data-fase': FASE_TAHAP[i] }, t.nama))), marka);
  const panggung = h('div', { class: 'hari__panggung' },
    h('div', { class: 'hari__kiri' }, jamEl, h('div', { class: 'hari__teks' }, langkah)),
    h('div', { class: 'hari__kanan' },
      h('div', { class: 'bingkai' }, foto(l.foto, { alt: `Ilustrasi ${kecil(l.judul)}` })),
      hargaEl),
    garis);
  const lintasan = h('div', { class: 'hari__lintasan' }, panggung);
  const el = h('section', { class: 'hari', 'aria-labelledby': 'judul-hari' }, kepala, lintasan);

  let tahapTerakhir = 0;
  function terapkan(p) {
    const t = mulai + p * (akhir - mulai - 1);
    const kondisi = tahapPada(k, new Date(t), { kolamCukup });
    jamEl.textContent = jam(t);
    marka.style.left = `${p * 100}%`;
    if (kondisi.tahap !== tahapTerakhir) {
      tahapTerakhir = kondisi.tahap;
      panggung.dataset.fase = FASE_TAHAP[kondisi.tahap - 1];
      langkah.forEach((e, i) => { e.classList.toggle('hari__langkah--aktif', i === kondisi.tahap - 1); e.setAttribute('aria-current', i === kondisi.tahap - 1 ? 'step' : 'false'); });
      hargaEl.replaceChildren(...labelHarga(l, kondisi, jadwal));
    }
  }
  const hitung = () => {
    const tinggiHeader = 56;
    const r = lintasan.getBoundingClientRect();
    terapkan(clamp((tinggiHeader - r.top) / Math.max(1, r.height - (innerHeight - tinggiHeader)), 0, 1));
  };
  let raf = 0;
  const saatGulir = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(hitung); };
  window.addEventListener('scroll', saatGulir, { passive: true });
  window.addEventListener('resize', saatGulir);
  terapkan(0);
  queueMicrotask(() => requestAnimationFrame(hitung));
  return { el, hancur() { cancelAnimationFrame(raf); window.removeEventListener('scroll', saatGulir); window.removeEventListener('resize', saatGulir); } };
}

export default async function beranda({ pergi }) {
  const [{ listing: daftar, saldoKolam }, kolam, buku, dampak] = await Promise.all([api.get('/listings'), api.get('/pool'), api.get('/ledger?limit=3'), api.get('/impact')]);
  const kampus = konfigurasi().kampus;
  const unggulan = pilihUnggulan(daftar);
  const kolamCukup = unggulan ? saldoKolam >= unggulan.kondisi.bayarBantuan : true;
  const jadwal = unggulan && jadwalTahap(keHarga(unggulan), { kolamCukup });

  async function masukSebagai(p, tombol) {
    tombol.disabled = true;
    try {
      await masukDemo(p.id);
      kabari(`Masuk sebagai ${p.nama.toLowerCase()}.`);
      pergi(p.tujuan);
    } catch (err) {
      tombol.disabled = false;
      kabari(pesanGalat(err), { galat: true });
    }
  }

  // ---- Pembuka ----
  const kondisi = unggulan?.kondisi;
  const kartuFoto = unggulan && h('figure', { class: 'hero__foto' },
    h('div', { class: 'bingkai' }, foto(unggulan.foto, { alt: `Ilustrasi ${kecil(unggulan.judul)}`, utama: true })),
    h('div', { class: 'label-harga', 'data-fase': kondisi.bantuan ? 'malam' : null }, labelHarga(unggulan, kondisi, jadwal)),
    h('figcaption', { class: 'nota' }, `${unggulan.judul}, ${unggulan.kantin.nama}. ${kondisi.status === 'buka' ? `Tinggal ${unggulan.stokSisa} porsi, pukul ${jam(sekarang())}.` : `Ambil ${jam(unggulan.jendela.mulai)} sampai ${jam(unggulan.jendela.selesai)}.`}`));

  const pembuka = h('section', { class: 'hero', 'aria-labelledby': 'judul-hero' },
    h('div', { class: 'hero__teks' },
      h('h1', { id: 'judul-hero' }, 'Sisa makanan kantin, harga turun tiap jam.'),
      h('p', { class: 'hero__ket' }, 'Beli porsi sisa dari kantin sekitar kampus dengan harga yang makin murah menjelang tutup. Di jam terakhir, porsi yang belum laku jadi makan gratis bagi mahasiswa yang membutuhkan.'),
      h('div', { class: 'baris-aksi' },
        h('a', { class: 'tombol tombol--merah tombol--besar', href: '/jelajah' }, 'Cari porsi sekarang'),
        h('a', { class: 'tombol tombol--besar', href: '/dasbor' }, 'Jual sisa dagangan')),
      h('p', { class: 'hero__bukti nota' }, `${new Intl.NumberFormat('id-ID').format(dampak.porsiTerselamatkan)} porsi sudah diambil dari ${dampak.kantin} kantin di sekitar ${kampus.name}.`)),
    kartuFoto);

  const tanpaListing = !unggulan && h('div', { class: 'blok' }, kosong('Belum ada kantin yang menayangkan porsi', 'Porsi sisa muncul di sini begitu kantin mengunggahnya, biasanya sejam sebelum tutup.', h('a', { class: 'tombol tombol--merah', href: '/jelajah' }, 'Lihat Jelajah')));

  // ---- Untuk siapa ----
  const PERAN = [
    ['Pembeli', '/jelajah', 'Cari porsi sisa yang dekat dan murah. Harganya turun sendiri menjelang tutup.'],
    ['Penjual', '/dasbor', 'Jual sisa dagangan sebelum kantin tutup, dan lihat persis berapa yang masuk di tiap tahap.'],
    ['Penerima bantuan', '/bantuan', 'Klaim satu porsi gratis per hari. Penjual hanya melihat kodemu, bukan namamu.'],
    ['Donatur', '/donasi', 'Patungan porsi, lalu lihat sampai ke kantin mana uangmu disalurkan.'],
  ];
  const peran = h('section', { class: 'peran', 'aria-labelledby': 'judul-peran' },
    h('h2', { id: 'judul-peran' }, 'Siapa yang memakai Sisa Rasa'),
    h('ul', { class: 'peran__daftar' }, PERAN.map(([nama, href, isi]) => h('li', null,
      h('a', { class: 'peran__baris', href }, h('span', { class: 'peran__nama' }, nama), h('span', { class: 'peran__isi' }, isi))))));

  // ---- Scrollytelling ----
  const hari = unggulan ? buatHari(unggulan, kolamCukup) : null;

  // ---- Kolam ----
  const kolamBagian = h('section', { class: 'kolam', 'data-fase': 'malam', 'aria-labelledby': 'judul-kolam' },
    h('div', { class: 'kolam__isi' },
      h('div', null,
        h('h2', { id: 'judul-kolam' }, 'Dana bantuan'),
        harga(kolam.saldo, { ukuran: 'raksasa', label: `Saldo dana bantuan ${rp(kolam.saldo)}` }),
        h('p', { class: 'nota' }, `Setara ${kolam.setaraPorsi} porsi patungan.`)),
      h('div', { class: 'kolam__catatan' },
        h('p', null, `Dana bantuan adalah uang patungan para donatur yang disimpan bersama untuk membayar porsi gratis. Satu porsi patungan bernilai ${rp(kolam.porsiDonasi)}. Saat porsi masuk tahap Bantuan, dana bantuan membayar kantin 50% dari harga dasar dan mahasiswa penerima mengambilnya gratis.`),
        h('ul', { class: 'kolam__daftar nota' }, buku.entri.map((e) => h('li', null,
          e.jenis === 'donasi'
            ? `${e.donatur ?? 'Seseorang'} patungan ${rp(e.jumlah)}${e.pesan ? `: "${e.pesan}"` : ''}`
            : `${rp(e.jumlah)} dibayarkan ke ${e.kantin} untuk ${kecil(e.judul)}`))),
        h('a', { class: 'tombol tombol--merah tombol--besar', href: '/donasi' }, 'Patungan satu porsi'))));

  // ---- Penjual ----
  const penjual = h('section', { class: 'penjual', 'aria-labelledby': 'judul-penjual' },
    h('div', null,
      h('h2', { id: 'judul-penjual' }, 'Kantin tidak perlu menebak'),
      h('p', null, 'Sebelum menayangkan porsi, penjual melihat jadwal empat tahap dan rupiah yang ia terima di tiap tahap. Porsi yang tidak laku sampai tahap Bantuan tetap dibayar dari dana bantuan bila ada yang mengklaim, dan tetap dijual 50% bila dana bantuan kosong.'),
      h('div', { class: 'baris-aksi' },
        h('button', { class: 'tombol tombol--besar', type: 'button', onclick: (e) => masukSebagai(PERAN_DEMO[3], e.currentTarget) }, 'Masuk sebagai penjual'))),
    jadwal
      ? h('table', { class: 'tabel-nota' },
          h('caption', { class: 'nota' }, `Yang diterima ${unggulan.kantin.nama} per porsi ${kecil(unggulan.judul)}`),
          h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Tahap'), h('th', { scope: 'col' }, 'Mulai'), h('th', { scope: 'col', class: 'angka' }, 'Diterima'))),
          h('tbody', null, jadwal.map((t) => h('tr', null, h('th', { scope: 'row' }, t.nama), h('td', { class: 'nota' }, jam(t.mulaiMs)), h('td', { class: 'angka' }, rp(t.penjualTerima))))))
      : null);

  // ---- Penutup ----
  const penutup = h('section', { class: 'penutup', 'aria-labelledby': 'judul-penutup' },
    h('h2', { id: 'judul-penutup' }, 'Sore ini ada yang belum laku'),
    h('div', { class: 'baris-aksi' },
      h('a', { class: 'tombol tombol--merah tombol--besar', href: '/jelajah' }, 'Cari porsi sekarang'),
      h('a', { class: 'tombol tombol--besar', href: '/cara-kerja' }, 'Baca cara kerjanya')));

  return {
    judul: 'Sisa makanan kantin, harga turun tiap jam',
    el: h('div', { class: 'beranda' }, pembuka, tanpaListing, peran, hari?.el, kolamBagian, penjual, penutup),
    hancur: () => hari?.hancur(),
  };
}
