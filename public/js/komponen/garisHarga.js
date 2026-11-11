import { h } from '../h.js';
import { harga, jam, rp, sampai } from '../format.js';
import { sekarang } from '../waktu.js';
import { jadwalTahap, tahapPada } from '/shared/pricing.js';
import { cap } from './cap.js';

const FASE_TAHAP = ['siang', 'sore', 'sore', 'malam'];
const KET_PEMBELI = [
  'Harga penuh. Datang lebih awal, dapat porsi yang paling segar.',
  'Waktu ambil tinggal 60%. Harga turun 30%.',
  'Waktu ambil tinggal 30%. Setengah harga, daripada dibuang.',
  'Tidak dijual. Mahasiswa yang membutuhkan mengklaimnya gratis.',
];
const KET_PENJUAL = [
  'Harga penuh masuk ke kantinmu.',
  'Kamu dapat 70% dari harga dasar.',
  'Kamu dapat 50% dari harga dasar.',
  'Dana bantuan membayar 50% harga dasar bila porsi diklaim. Bila dana bantuan kosong, porsi tetap dijual 50%.',
];

/** Adaptor: bentuk listing dari API menjadi bentuk yang dipakai pricing.js. */
export const keHarga = (l) => ({ base_price: l.hargaDasar, pickup_start: l.jendela.mulai, pickup_end: l.jendela.selesai });

/**
 * Empat tahap sebuah listing. `peran`: 'pembeli' menampilkan harga yang dibayar, 'penjual' menampilkan yang diterima.
 * `bentuk`: 'baris' (empat kolom di layar lebar), 'lajur' (ringkas, satu kolom), 'lebar' (pita penuh, dipakai di Beranda).
 */
export function garisHarga(listing, { peran = 'pembeli', bentuk = 'baris', kolamCukup = true, cetakBaru = false } = {}) {
  const k = keHarga(listing);
  const kini = tahapPada(k, sekarang(), { kolamCukup });
  const jadwal = jadwalTahap(k, { kolamCukup });
  const ket = peran === 'penjual' ? KET_PENJUAL : KET_PEMBELI;

  return h('ol', { class: `garis garis--${bentuk}`, 'aria-label': `Jadwal empat tahap harga untuk ${listing.judul}` },
    jadwal.map((t, i) => {
      const lewat = kini.tahap !== null && t.tahap < kini.tahap;
      const berlaku = kini.tahap === t.tahap;
      const bantuanPembeli = t.bantuan && peran === 'pembeli';
      const nilai = peran === 'penjual' ? t.penjualTerima : t.harga;
      const persen = [100, 70, 50, 50][i];
      return h('li', { class: `tahap${lewat ? ' tahap--lewat' : ''}${berlaku ? ' tahap--berlaku' : ''}`, 'data-fase': FASE_TAHAP[i], 'aria-current': berlaku ? 'step' : null },
        h('h3', null, t.nama),
        h('p', { class: 'tahap__jam nota' }, `${jam(t.mulaiMs)} sampai ${jam(t.selesaiMs)}`),
        bantuanPembeli
          ? harga(0, { ukuran: bentuk === 'lajur' ? 'sedang' : 'besar', label: 'Gratis bagi penerima bantuan' })
          : harga(nilai ?? 0, { ukuran: bentuk === 'lajur' ? 'sedang' : 'besar', coret: lewat, merah: berlaku, label: `${rp(nilai ?? 0)}${lewat ? ', sudah dicoret' : ''}` }),
        bentuk !== 'lajur' && h('p', { class: 'tahap__ket' }, ket[i]),
        bentuk !== 'lajur' && h('p', { class: 'tahap__pecahan' }, t.bantuan ? '50% dari dana bantuan' : `${persen}% dari harga dasar`),
        berlaku && h('span', { class: 'tahap__cap' }, cap('Berlaku sekarang', { baru: cetakBaru })),
        berlaku && kini.tahapBerikut && h('p', { class: 'nota tahap__jam' }, 'Tahap berikut dalam ', sampai(kini.tahapBerikut.mulaiMs)));
    }));
}
