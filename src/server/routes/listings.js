import { Router } from 'express';
import { pool, transaksi } from '../db.js';
import { wajib } from '../auth.js';
import { ApiError, bilangan, jarakMeter, tanggalWaktu, teks, waktu } from '../util.js';
import { kampusDemo, saldoKolam } from '../kolam.js';
import { hargaBantuan, jadwalTahap, tahapPada } from '../../shared/pricing.js';
import { slugValid, urlFoto } from '../../shared/foto.js';

const router = Router();
const MENIT = 60_000;

function sajikan(l, kolamCukup, sekarang, titik) {
  const kondisi = tahapPada(l, sekarang, { kolamCukup });
  return {
    id: l.id,
    judul: l.title,
    deskripsi: l.description,
    foto: l.photo_url,
    hargaDasar: l.base_price,
    stok: l.qty_total,
    stokSisa: l.qty_left,
    jendela: { mulai: l.pickup_start, selesai: l.pickup_end },
    status: l.status,
    kantin: { id: l.vendor_id, nama: l.vendor_name, alamat: l.address, lat: l.vlat, lng: l.vlng },
    jarakM: titik ? jarakMeter(titik.lat, titik.lng, l.vlat, l.vlng) : null,
    kondisi,
    bisaDibeli: kondisi.status === 'buka' && !kondisi.bantuan && l.qty_left > 0,
    bisaDiklaim: kondisi.bantuan && l.qty_left > 0,
  };
}

const SELECT_LISTING = `select l.*, v.name as vendor_name, v.lat as vlat, v.lng as vlng, v.address, v.campus_id
  from listings l join vendors v on v.id = l.vendor_id`;

async function sajikanLengkap(db, l, sekarang) {
  const kolamCukup = (await saldoKolam(db, l.campus_id)) >= hargaBantuan(l.base_price);
  return { ...sajikan(l, kolamCukup, sekarang, null), jadwal: jadwalTahap(l, { kolamCukup }) };
}

router.get('/listings', async (req, res) => {
  const sekarang = waktu(req);
  const kampus = req.user?.campus_id ?? (await kampusDemo()).id;
  const lat = req.query.lat === undefined ? null : Number(req.query.lat);
  const lng = req.query.lng === undefined ? null : Number(req.query.lng);
  if ((lat === null) !== (lng === null) || [lat, lng].some((n) => n !== null && !Number.isFinite(n))) throw new ApiError(400, 'lat dan lng harus berupa angka dan dikirim berpasangan.');
  const titik = lat === null ? null : { lat, lng };
  const urut = req.query.sort ?? (titik ? 'jarak' : 'tutup');
  if (!['jarak', 'harga', 'tutup'].includes(urut)) throw new ApiError(400, 'sort harus jarak, harga, atau tutup.');

  const { rows } = await pool.query(`${SELECT_LISTING} where l.status = 'active' and l.pickup_end > $1 and v.campus_id = $2`, [sekarang, kampus]);
  const saldo = await saldoKolam(pool, kampus);
  const daftar = rows.map((l) => sajikan(l, saldo >= hargaBantuan(l.base_price), sekarang, titik));
  const harga = (x) => x.kondisi.harga ?? 0;
  const pembanding = {
    jarak: (a, b) => (a.jarakM ?? 0) - (b.jarakM ?? 0),
    harga: (a, b) => harga(a) - harga(b),
    tutup: (a, b) => +new Date(a.jendela.selesai) - +new Date(b.jendela.selesai),
  }[urut];
  res.json({ sekarang, saldoKolam: saldo, listing: daftar.sort(pembanding) });
});

router.get('/listings/:id', async (req, res) => {
  const id = bilangan(Number(req.params.id), { min: 1, max: 2_000_000_000, nama: 'id' });
  const sekarang = waktu(req);
  const { rows: [l] } = await pool.query(`${SELECT_LISTING} where l.id = $1`, [id]);
  if (!l) throw new ApiError(404, 'Listing tidak ditemukan.');
  res.json({ listing: await sajikanLengkap(pool, l, sekarang), sekarang });
});

function bacaJendela(body, sekarang) {
  const mulai = tanggalWaktu(body.mulai, 'Jam mulai');
  const selesai = tanggalWaktu(body.selesai, 'Jam selesai');
  if (selesai <= sekarang) throw new ApiError(400, 'Jam selesai sudah lewat.', 'selesai');
  if (mulai < new Date(+sekarang - 5 * MENIT)) throw new ApiError(400, 'Jam mulai tidak boleh sudah lewat.', 'mulai');
  const menit = (selesai - mulai) / MENIT;
  if (menit < 30 || menit > 14 * 60) throw new ApiError(400, 'Waktu ambil antara 30 menit dan 14 jam.', 'selesai');
  return { mulai, selesai };
}

router.post('/listings', wajib('vendor'), async (req, res) => {
  const b = req.body ?? {};
  const sekarang = waktu(req);
  const judul = teks(b.judul, { max: 80, nama: 'Nama porsi' });
  const deskripsi = teks(b.deskripsi, { min: 0, max: 300, nama: 'Keterangan' });
  const hargaDasar = bilangan(b.hargaDasar, { min: 1000, max: 200_000, nama: 'Harga dasar' });
  const stok = bilangan(b.stok, { min: 1, max: 200, nama: 'Jumlah porsi' });
  const { mulai, selesai } = bacaJendela(b, sekarang);
  if (b.foto != null && !slugValid(b.foto)) throw new ApiError(400, 'Foto tidak ada di pustaka.', 'Foto');
  const { rows: [l] } = await pool.query(
    `insert into listings(vendor_id, title, description, photo_url, base_price, qty_total, qty_left, pickup_start, pickup_end, created_at)
     values ($1, $2, $3, $9, $4, $5, $5, $6, $7, $8) returning id`,
    [req.user.vendor_id, judul, deskripsi, hargaDasar, stok, mulai, selesai, sekarang, b.foto ? urlFoto(b.foto) : null]);
  const { rows: [baru] } = await pool.query(`${SELECT_LISTING} where l.id = $1`, [l.id]);
  res.status(201).json({ listing: await sajikanLengkap(pool, baru, sekarang) });
});

router.patch('/listings/:id', wajib('vendor', 'admin'), async (req, res) => {
  const id = bilangan(Number(req.params.id), { min: 1, max: 2_000_000_000, nama: 'id' });
  const b = req.body ?? {};
  const sekarang = waktu(req);
  const hasil = await transaksi(async (db) => {
    const { rows: [l] } = await db.query(
      `select l.*, v.user_id as pemilik from listings l join vendors v on v.id = l.vendor_id where l.id = $1 for update of l`, [id]);
    if (!l || (req.user.role === 'vendor' && l.pemilik !== req.user.id)) throw new ApiError(404, 'Listing tidak ditemukan.');
    const diambil = l.qty_total - l.qty_left;
    const set = {};

    if (b.status !== undefined) {
      if (b.status !== 'closed') throw new ApiError(400, 'Listing hanya bisa ditutup, tidak bisa dibuka kembali.', 'status');
      set.status = 'closed';
    }
    if (req.user.role === 'admin') {
      if (Object.keys(b).some((k) => k !== 'status')) throw new ApiError(403, 'Admin hanya bisa menutup listing.');
    } else {
      if (b.judul !== undefined) set.title = teks(b.judul, { max: 80, nama: 'Nama porsi' });
      if (b.deskripsi !== undefined) set.description = teks(b.deskripsi, { min: 0, max: 300, nama: 'Keterangan' });
      if (b.foto !== undefined) {
        if (b.foto !== null && !slugValid(b.foto)) throw new ApiError(400, 'Foto tidak ada di pustaka.', 'Foto');
        set.photo_url = b.foto ? urlFoto(b.foto) : null;
      }
      if (b.stok !== undefined) {
        const stok = bilangan(b.stok, { min: Math.max(diambil, 1), max: 200, nama: 'Jumlah porsi' });
        set.qty_total = stok;
        set.qty_left = stok - diambil;
      }
      // Harga dan waktu ambil dikunci begitu ada pesanan, karena pembeli memesan dengan jadwal yang sudah ia lihat.
      if (b.hargaDasar !== undefined || b.mulai !== undefined || b.selesai !== undefined) {
        const { rows: [{ n }] } = await db.query('select count(*) as n from orders where listing_id = $1', [id]);
        if (n > 0) throw new ApiError(409, 'Harga dan jam ambil tidak bisa diubah setelah ada pesanan.');
        if (b.hargaDasar !== undefined) set.base_price = bilangan(b.hargaDasar, { min: 1000, max: 200_000, nama: 'Harga dasar' });
        if (b.mulai !== undefined || b.selesai !== undefined) {
          const j = bacaJendela({ mulai: b.mulai ?? l.pickup_start.toISOString(), selesai: b.selesai ?? l.pickup_end.toISOString() }, sekarang);
          set.pickup_start = j.mulai;
          set.pickup_end = j.selesai;
        }
      }
    }
    const kolom = Object.keys(set);
    if (!kolom.length) throw new ApiError(400, 'Tidak ada yang diubah.');
    // Nama kolom berasal dari objek `set` di atas, bukan dari masukan pengguna.
    await db.query(`update listings set ${kolom.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [id, ...kolom.map((k) => set[k])]);
    const { rows: [baru] } = await db.query(`${SELECT_LISTING} where l.id = $1`, [id]);
    return baru;
  });
  res.json({ listing: await sajikanLengkap(pool, hasil, sekarang) });
});

export default router;
