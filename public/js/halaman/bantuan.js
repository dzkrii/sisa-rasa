import { h } from '../h.js';
import { api } from '../api.js';
import { harga, jam, kecil, rp, sampai } from '../format.js';
import { masukDemo, penggunaSaatIni } from '../sesi.js';
import { sekarang } from '../waktu.js';
import { kabari, kosong, pesanGalat } from '../ui.js';
import { keHarga } from '../komponen/garisHarga.js';
import { foto } from '../komponen/foto.js';
import { jadwalTahap } from '/shared/pricing.js';

const hariJakarta = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);

export default async function bantuan({ pergi }) {
  const u = penggunaSaatIni();
  const penerima = u?.peran === 'recipient';
  const [{ listing, saldoKolam }, pool, mine] = await Promise.all([
    api.get('/listings'),
    api.get('/pool'),
    penerima ? api.get('/orders/mine') : Promise.resolve({ pesanan: [] }),
  ]);
  const nu = sekarang();
  const sudahKlaim = mine.pesanan.find((o) => o.jenis === 'klaim' && o.status !== 'cancelled' && hariJakarta(new Date(o.dibuat)) === hariJakarta(nu));

  const kini = listing.filter((l) => l.bisaDiklaim);
  const nanti = listing
    .filter((l) => l.kondisi.status !== 'tutup' && !l.bisaDiklaim && l.stokSisa > 0 && jadwalTahap(keHarga(l))[3].mulaiMs > +nu)
    .sort((a, b) => jadwalTahap(keHarga(a))[3].mulaiMs - jadwalTahap(keHarga(b))[3].mulaiMs);

  async function klaim(l, tombol) {
    tombol.disabled = true;
    try {
      const r = await api.post('/orders', { listingId: l.id, jenis: 'klaim' });
      kabari('Porsi gratis sudah dipesan. Tunjukkan kodenya ke penjual.');
      await pergi(`/tiket?baru=${r.pesanan.kode}`);
    } catch (err) {
      tombol.disabled = false;
      kabari(pesanGalat(err), { galat: true });
    }
  }

  const kolom = (l) => {
    const dapat = penerima && !sudahKlaim;
    return h('article', { class: `nota-baris nota-baris--bantuan${l.foto ? ' nota-baris--foto' : ''}`, 'data-fase': 'malam' },
      l.foto && h('div', { class: 'nota-baris__foto bingkai bingkai--kecil' }, foto(l.foto, { lebar: 480, tinggi: 480 })),
      h('div', { class: 'nota-baris__info' },
        h('h3', null, l.judul),
        h('p', { class: 'nota-baris__meta' }, `${l.kantin.nama}, ${l.kantin.alamat}. Tinggal ${l.stokSisa} porsi, ambil sebelum ${jam(l.jendela.selesai)}.`)),
      h('div', { class: 'nota-baris__harga' }, harga(0, { ukuran: 'sedang' })),
      h('div', { class: 'nota-baris__aksi' },
        dapat
          ? h('button', { class: 'tombol tombol--merah', type: 'button', onclick: (e) => klaim(l, e.currentTarget) }, `Klaim ${kecil(l.judul)}`)
          : h('button', { class: 'tombol', type: 'button', disabled: true }, sudahKlaim ? 'Kamu sudah klaim hari ini' : 'Hanya untuk penerima bantuan'),
        h('a', { class: 'tombol', href: `/porsi/${l.id}` }, 'Lihat jadwal harga')));
  };

  const aturan = h('section', { class: 'bantuan__aturan', 'aria-labelledby': 'judul-aturan' },
    h('h2', { id: 'judul-aturan' }, 'Aturannya, tanpa basa-basi'),
    h('ul', null,
      h('li', null, 'Satu porsi gratis per hari untuk tiap mahasiswa penerima.'),
      h('li', null, 'Klaim dibuka di 10% waktu ambil yang terakhir. Harga paling akhir sebelum itu setengah harga.'),
      h('li', null, 'Penjual hanya melihat kode tiketmu. Namamu tidak ada di riwayat donasi.'),
      h('li', null, `Porsi dibayar dana bantuan sebesar 50% harga dasar. Bila dana bantuan kosong, tahap Bantuan tidak jalan dan porsi tetap dijual 50%. Saldo dana bantuan sekarang ${rp(pool.saldo)}.`)));

  const el = h('section', { class: 'bantuan', 'aria-labelledby': 'judul-bantuan' },
    h('div', { class: 'bantuan__kepala', 'data-fase': 'malam' },
      h('h1', { id: 'judul-bantuan' }, 'Satu porsi gratis, tanpa ditanya kenapa'),
      h('p', null, 'Menjelang kantin tutup, porsi yang belum laku bisa diklaim mahasiswa yang membutuhkan. Dibayar patungan dari dana bantuan.')),
    !penerima && h('div', { class: 'blok' },
      h('div', { class: 'keadaan' },
        h('h3', null, u ? 'Klaim hanya untuk penerima bantuan' : 'Masuk sebagai penerima untuk mengklaim'),
        h('p', null, 'Kamu tetap bisa melihat porsi apa saja yang sedang masuk tahap Bantuan. Masuk sebagai penerima bantuan untuk mengklaimnya.'),
        h('button', { class: 'tombol tombol--merah', type: 'button', onclick: async () => { try { await masukDemo('penerima'); } catch (err) { kabari(pesanGalat(err), { galat: true }); } } }, 'Masuk sebagai penerima bantuan'))),
    sudahKlaim && h('div', { class: 'blok' }, kosong('Kamu sudah mengklaim satu porsi hari ini', 'Besok kamu bisa mengklaim lagi. Tiketmu masih bisa dibuka.', h('a', { class: 'tombol tombol--merah', href: '/tiket' }, 'Buka tiketku'))),
    h('div', { class: 'blok' },
      h('h2', null, 'Bisa diklaim sekarang'),
      kini.length
        ? h('div', null, kini.map(kolom))
        : kosong('Belum ada porsi di tahap Bantuan',
            saldoKolam < 3000 ? 'Dana bantuan sedang kosong, jadi tahap Bantuan belum jalan. Patungan masuk ke dana bantuan lewat halaman Donasi.' : 'Tahap Bantuan dibuka di 10% waktu ambil yang terakhir. Porsi yang akan masuk ada di bawah.',
            h('a', { class: 'tombol', href: '/donasi' }, 'Isi dana bantuan lewat patungan'))),
    nanti.length ? h('div', { class: 'blok' },
      h('h2', null, 'Akan dibuka hari ini'),
      h('ul', { class: 'bantuan__nanti' }, nanti.map((l) => {
        const buka = jadwalTahap(keHarga(l))[3].mulaiMs;
        return h('li', null,
          h('div', null, h('strong', null, l.judul), h('p', { class: 'nota' }, l.kantin.nama)),
          h('p', { class: 'angka' }, `Klaim buka pukul ${jam(buka)}`),
          h('p', { class: 'nota' }, 'dalam ', sampai(buka)));
      }))) : null,
    aturan);

  return { judul: 'Bantuan makan', el };
}
