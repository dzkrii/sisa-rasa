// Dipakai server dan front-end: satu logika harga, tidak ada tugas terjadwal.
export const PORSI_DONASI = 7500;
export const NAMA_TAHAP = { 1: 'Segar', 2: 'Sore', 3: 'Terakhir', 4: 'Bantuan' };

const PERSEN = { 1: 1, 2: 0.7, 3: 0.5 };
// Sisa waktu (sebagai pecahan jendela) di mana tahap 2, 3, 4 dimulai.
const BATAS_MULAI = { 2: 0.6, 3: 0.3, 4: 0.1 };

const bulat100 = (n) => Math.round(n / 100) * 100;
export const hargaBantuan = (hargaDasar) => bulat100(hargaDasar * 0.5);

function harga(tahap, hargaDasar, kolamCukup) {
  if (tahap < 4) return bulat100(hargaDasar * PERSEN[tahap]);
  return kolamCukup ? null : hargaBantuan(hargaDasar);
}

/** Keempat tahap sebuah listing dengan jam mulai, jam selesai, dan rupiah yang diterima penjual di tiap tahap. */
export function jadwalTahap(listing, { kolamCukup = true } = {}) {
  const mulai = +new Date(listing.pickup_start);
  const akhir = +new Date(listing.pickup_end);
  const panjang = akhir - mulai;
  const awal = [mulai, akhir - panjang * BATAS_MULAI[2], akhir - panjang * BATAS_MULAI[3], akhir - panjang * BATAS_MULAI[4]].map(Math.round);
  return [1, 2, 3, 4].map((tahap, i) => {
    const h = harga(tahap, listing.base_price, kolamCukup);
    return {
      tahap,
      nama: NAMA_TAHAP[tahap],
      mulaiMs: awal[i],
      selesaiMs: i < 3 ? awal[i + 1] : akhir,
      harga: h,
      bantuan: tahap === 4 && kolamCukup,
      penjualTerima: h ?? hargaBantuan(listing.base_price),
    };
  });
}

/**
 * Keadaan harga sebuah listing pada waktu `at`.
 * `harga` adalah harga yang dibayar pembeli; null berarti porsi hanya bisa diklaim sebagai bantuan.
 * Tahap Bantuan hanya jalan bila `kolamCukup`; bila tidak, porsi dijual 50% sampai tutup.
 */
export function tahapPada(listing, at = new Date(), { kolamCukup = true } = {}) {
  const mulai = +new Date(listing.pickup_start);
  const akhir = +new Date(listing.pickup_end);
  const t = +at;
  const dasar = listing.base_price;
  const bayarBantuan = hargaBantuan(dasar);

  if (t < mulai) return { status: 'belum', tahap: null, nama: 'Belum buka', harga: null, bantuan: false, bayarBantuan, sisaMs: akhir - mulai, tahapBerikut: null };
  if (t >= akhir) return { status: 'tutup', tahap: null, nama: 'Tutup', harga: null, bantuan: false, bayarBantuan, sisaMs: 0, tahapBerikut: null };

  const panjang = akhir - mulai;
  const sisa = akhir - t;
  const tahap = sisa * 10 > panjang * 6 ? 1 : sisa * 10 > panjang * 3 ? 2 : sisa * 10 > panjang ? 3 : 4;
  const berikut = tahap < 4
    ? { tahap: tahap + 1, mulaiMs: Math.round(akhir - panjang * BATAS_MULAI[tahap + 1]), harga: harga(tahap + 1, dasar, kolamCukup) }
    : null;

  return {
    status: 'buka',
    tahap,
    nama: NAMA_TAHAP[tahap],
    harga: harga(tahap, dasar, kolamCukup),
    bantuan: tahap === 4 && kolamCukup,
    bayarBantuan,
    sisaMs: sisa,
    tahapBerikut: berikut,
  };
}
