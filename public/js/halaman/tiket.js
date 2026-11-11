import { h } from '../h.js';
import { api } from '../api.js';
import { harga, jam, kecil, sampai } from '../format.js';
import { PERAN_DEMO, masukDemo, penggunaSaatIni } from '../sesi.js';
import { kabari, kosong, pesanGalat } from '../ui.js';
import { cap } from '../komponen/cap.js';

const STATUS = {
  reserved: ['Menunggu diambil', false],
  picked_up: ['Sudah diambil', true],
  expired: ['Hangus', true],
  cancelled: ['Dibatalkan', true],
};

function tiket(o, { baru }) {
  const [teksStatus, tinta] = STATUS[o.status];
  const kelas = ['tiket', o.status === 'picked_up' && 'tiket--diambil', (o.status === 'expired' || o.status === 'cancelled') && 'tiket--hangus'].filter(Boolean).join(' ');
  return h('article', { class: kelas, 'aria-label': `Tiket ${o.listing.judul}, ${teksStatus}`, style: `--miring-tiket: ${(o.kode.charCodeAt(0) % 3) - 1}deg` },
    h('div', { class: 'tiket__badan' },
      h('p', { class: 'nota' }, `Ambil di ${o.kantin.nama}`),
      h('p', { class: 'tiket__kode' }, h('span', { class: 'sr-saja' }, `Kode pesanan ${o.kode.split('').join(' ')}`), h('span', { 'aria-hidden': 'true' }, o.kode)),
      h('h3', null, `${o.jumlah} ${kecil(o.listing.judul)}`),
      h('p', { class: 'nota' }, o.kantin.alamat),
      o.status === 'reserved' && h('p', { class: 'nota' }, `Ambil sebelum ${jam(o.batasAmbil)}, tinggal `, sampai(+new Date(o.batasAmbil))),
      o.status === 'picked_up' && h('p', { class: 'nota' }, `Diambil pukul ${jam(o.diambil)}.`),
      o.status === 'expired' && h('p', { class: 'nota' }, 'Waktu ambil lewat sebelum kode ini dipakai.')),
    h('span', { class: 'tiket__cap' }, cap(teksStatus, { tinta, baru, besar: false })),
    h('div', { class: 'tiket__stub' },
      o.jenis === 'klaim' ? harga(0, { ukuran: 'sedang' }) : harga(o.bayar, { ukuran: 'sedang' }),
      h('p', { class: 'nota' }, { reserved: 'Sebutkan kode ini ke penjual.', picked_up: 'Simpan sebagai bukti.', expired: 'Tidak diambil sampai tutup.', cancelled: 'Dibatalkan.' }[o.status])));
}

export default async function tiketHalaman({ query, pergi }) {
  const baru = query.get('baru');
  let u = penggunaSaatIni();
  const el = h('section', { class: 'tiketku', 'aria-labelledby': 'judul-tiket' }, h('h1', { id: 'judul-tiket' }, 'Tiketku'));
  let pewaktu;

  if (!u) {
    el.append(kosong('Masuk dulu untuk melihat tiketmu', 'Tiket muncul setelah kamu memesan atau mengklaim porsi. Masuk dulu untuk melihatnya.',
      h('button', { class: 'tombol tombol--merah', type: 'button', onclick: async () => { try { await masukDemo('pembeli'); } catch (err) { kabari(pesanGalat(err), { galat: true }); } } }, 'Masuk sebagai pembeli'),
      h('a', { class: 'tombol', href: '/jelajah' }, 'Lihat porsi dulu')));
    return { judul: 'Tiketku', el };
  }
  if (u.peran === 'vendor') {
    el.append(kosong('Penjual tidak punya tiket', 'Akun penjual menerima kode dari pembeli. Masukkan kode itu di dashboard.', h('a', { class: 'tombol tombol--merah', href: '/dasbor' }, 'Buka dasbor penjual')));
    return { judul: 'Tiketku', el };
  }

  const daftar = h('div', { class: 'tiketku__daftar' });
  el.append(h('p', { class: 'nota' }, 'Tunjukkan kode ke penjual saat mengambil. Penjual hanya melihat kode, tidak melihat namamu.'), daftar);

  async function muat() {
    const { pesanan } = await api.get('/orders/mine');
    // Tiket yang masih berlaku tampil utuh; yang sudah selesai masuk riwayat ringkas.
    const aktif = pesanan.filter((o) => o.status === 'reserved' || o.kode === baru);
    const riwayat = pesanan.filter((o) => !aktif.includes(o));
    daftar.replaceChildren(
      ...aktif.map((o) => tiket(o, { baru: o.kode === baru })),
      ...(!pesanan.length ? [kosong('Belum ada tiket', 'Pesan satu porsi atau klaim bantuan, dan tiketnya muncul di sini.', h('a', { class: 'tombol tombol--merah', href: '/jelajah' }, 'Cari porsi sore ini'))]
        : !aktif.length ? [kosong('Tidak ada tiket yang menunggu diambil', 'Tiket baru muncul di sini setelah kamu memesan atau mengklaim porsi.', h('a', { class: 'tombol tombol--merah', href: '/jelajah' }, 'Cari porsi sore ini'))] : []),
      riwayat.length ? h('details', { class: 'riwayat', open: !aktif.length },
        h('summary', null, `Riwayat, ${riwayat.length} tiket`),
        h('table', { class: 'tabel-nota' },
          h('caption', { class: 'sr-saja' }, 'Tiket yang sudah selesai'),
          h('thead', null, h('tr', null, ['Kode', 'Porsi', 'Status', 'Waktu'].map((t) => h('th', { scope: 'col' }, t)))),
          h('tbody', null, riwayat.map((o) => h('tr', null, h('th', { scope: 'row', class: 'nota' }, o.kode), h('td', null, `${o.jumlah} ${kecil(o.listing.judul)}`), h('td', null, STATUS[o.status][0]), h('td', { class: 'nota' }, jam(o.diambil ?? o.dibuat))))))) : null);
    // Tiket yang menunggu dicek berkala agar status "sudah diambil" muncul tanpa memuat ulang halaman.
    clearTimeout(pewaktu);
    if (pesanan.some((o) => o.status === 'reserved')) pewaktu = setTimeout(() => muat().catch(() => {}), 8000);
  }

  try {
    await muat();
  } catch (err) {
    el.append(kosong('Tiket tidak berhasil dimuat', pesanGalat(err), h('button', { class: 'tombol', type: 'button', onclick: () => pergi('/tiket') }, 'Coba lagi')));
  }
  return { judul: 'Tiketku', el, perbarui: muat, hancur: () => clearTimeout(pewaktu) };
}
