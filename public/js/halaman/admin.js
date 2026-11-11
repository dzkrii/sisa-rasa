import { h } from '../h.js';
import { api } from '../api.js';
import { jam, kecil, rp } from '../format.js';
import { konfigurasi, masukDemo, penggunaSaatIni } from '../sesi.js';
import { galat, kabari, kosong, pesanGalat } from '../ui.js';

const IDR = new Intl.NumberFormat('id-ID');
const tanggalPendek = (t) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${t}T12:00:00+07:00`));

export default async function admin() {
  const u = penggunaSaatIni();
  const el = h('section', { class: 'admin', 'aria-labelledby': 'judul-admin' }, h('h1', { id: 'judul-admin' }, 'Ringkasan kampus'));

  if (u?.peran !== 'admin') {
    el.append(kosong(u ? 'Ringkasan ini khusus admin kampus' : 'Masuk sebagai admin kampus', 'Halaman ini memperlihatkan kerawanan pangan dan sampah makanan dalam bentuk angka gabungan, tanpa nama penerima.',
      h('button', { class: 'tombol tombol--merah', type: 'button', onclick: async () => { try { await masukDemo('admin'); } catch (err) { kabari(pesanGalat(err), { galat: true }); } } }, 'Masuk sebagai admin kampus')));
    return { judul: 'Ringkasan kampus', el };
  }

  const moderasiEl = h('div', { class: 'admin__moderasi' });
  let konfirmasi = null;

  async function muatModerasi() {
    try {
      const { listing } = await api.get('/listings');
      moderasiEl.replaceChildren(listing.length
        ? h('ul', { class: 'admin__daftar' }, listing.map((l) => h('li', null,
            h('div', null, h('strong', null, l.judul), h('p', { class: 'nota' }, `${l.kantin.nama}, ${jam(l.jendela.mulai)} sampai ${jam(l.jendela.selesai)}, sisa ${l.stokSisa} dari ${l.stok} porsi.`)),
            h('button', { class: konfirmasi === l.id ? 'tombol tombol--merah' : 'tombol', type: 'button', onclick: () => tutup(l) }, konfirmasi === l.id ? 'Klik lagi untuk menutup' : `Tutup ${kecil(l.judul)}`))))
        : kosong('Tidak ada listing yang tayang', 'Listing muncul di sini begitu kantin mengunggahnya.'));
    } catch (err) {
      moderasiEl.replaceChildren(galat(pesanGalat(err), muatModerasi));
    }
  }

  async function tutup(l) {
    if (konfirmasi !== l.id) {
      konfirmasi = l.id;
      setTimeout(() => { if (konfirmasi === l.id) { konfirmasi = null; muatModerasi(); } }, 5000);
      return muatModerasi();
    }
    try {
      await api.patch(`/listings/${l.id}`, { status: 'closed' });
      kabari(`${l.judul} ditutup. Pesanan yang sudah masuk tetap bisa diambil.`);
    } catch (err) {
      kabari(pesanGalat(err), { galat: true });
    }
    konfirmasi = null;
    muatModerasi();
  }

  let s;
  try {
    s = await api.get('/admin/summary');
  } catch (err) {
    el.append(galat(pesanGalat(err)));
    return { judul: 'Ringkasan kampus', el };
  }
  const maksKlaim = Math.max(1, ...s.klaimPerHari.map((k) => k.klaim));
  const porsiDiambil = s.kantin.reduce((a, k) => a + k.porsiDiambil, 0);
  const porsiDiunggah = s.kantin.reduce((a, k) => a + k.porsiDiunggah, 0);

  el.append(
    h('p', { class: 'admin__ket' }, `Angka gabungan untuk ${konfigurasi().kampus.name}. Admin tidak melihat nama penerima bantuan, sama seperti penjual.`),

    h('div', { class: 'admin__dua' },
      h('section', { 'aria-labelledby': 'judul-klaim' },
        h('h2', { id: 'judul-klaim' }, 'Berapa mahasiswa mengklaim porsi gratis tiap hari?'),
        s.klaimPerHari.length
          ? h('ol', { class: 'hari-bar' }, s.klaimPerHari.map((k, i) => h('li', { class: `hari-bar__baris${i === s.klaimPerHari.length - 1 ? ' hari-bar__baris--kini' : ''}` },
              h('span', { class: 'nota hari-bar__tgl' }, tanggalPendek(k.tanggal)),
              h('span', { class: 'hari-bar__batang', style: `--lebar:${Math.max(2, (k.klaim / maksKlaim) * 100)}%`, 'aria-hidden': 'true' }),
              h('span', { class: 'angka hari-bar__nilai' }, `${k.klaim} klaim`))))
          : h('p', null, 'Belum ada klaim bantuan.')),
      h('section', { 'aria-labelledby': 'judul-kolam-admin' },
        h('h2', { id: 'judul-kolam-admin' }, 'Dana bantuan'),
        h('dl', { class: 'admin__kolam' },
          h('dt', null, 'Patungan masuk'), h('dd', { class: 'angka' }, rp(s.kolam.masuk)),
          h('dt', null, 'Dibayarkan ke kantin'), h('dd', { class: 'angka' }, rp(s.kolam.keluar)),
          h('dt', null, 'Saldo'), h('dd', { class: 'angka admin__saldo' }, rp(s.kolam.saldo))),
        h('p', null, `${IDR.format(s.porsiHangusDipesan)} porsi beli dipesan tetapi tidak diambil sampai tutup. Itu porsi yang masih terbuang walau sudah dibayar pesanannya.`))),

    h('section', { 'aria-labelledby': 'judul-kantin' },
      h('h2', { id: 'judul-kantin' }, 'Kantin: seberapa banyak yang laku'),
      h('table', { class: 'tabel-nota' },
        h('caption', { class: 'nota' }, `Total ${IDR.format(porsiDiambil)} dari ${IDR.format(porsiDiunggah)} porsi yang diunggah, sejak data dimulai`),
        h('thead', null, h('tr', null, ['Kantin', 'Listing', 'Diunggah', 'Diambil', 'Laku', 'Pendapatan'].map((t, i) => h('th', { scope: 'col', class: i > 0 ? 'angka' : null }, t)))),
        h('tbody', null, s.kantin.map((k) => h('tr', null,
          h('th', { scope: 'row' }, k.nama),
          h('td', { class: 'angka', 'data-l': 'Listing' }, IDR.format(k.listing)),
          h('td', { class: 'angka', 'data-l': 'Diunggah' }, IDR.format(k.porsiDiunggah)),
          h('td', { class: 'angka', 'data-l': 'Diambil' }, IDR.format(k.porsiDiambil)),
          h('td', { class: 'angka', 'data-l': 'Laku' }, k.tingkatLaku === null ? '-' : `${k.tingkatLaku}%`),
          h('td', { class: 'angka', 'data-l': 'Pendapatan' }, rp(k.pendapatan))))))),

    h('section', { 'aria-labelledby': 'judul-moderasi' },
      h('h2', { id: 'judul-moderasi' }, 'Moderasi listing yang sedang tayang'),
      h('p', null, 'Admin hanya bisa menutup listing, tidak mengubah harga atau isinya. Pesanan yang sudah masuk tetap bisa diambil.'),
      moderasiEl));

  await muatModerasi();
  return { judul: 'Ringkasan kampus', el, perbarui: muatModerasi };
}
