import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { pool, transaksi } from '../db.js';
import { wajib } from '../auth.js';
import { ApiError, bilangan, jamJakarta, tanggalJakarta, teks, waktu } from '../util.js';
import { saldoKolam } from '../kolam.js';
import { hargaBantuan, jadwalTahap, tahapPada } from '../../shared/pricing.js';

const router = Router();
const HURUF_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const buatKode = () => Array.from({ length: 6 }, () => HURUF_KODE[randomInt(HURUF_KODE.length)]).join('');

router.post('/orders', wajib(), async (req, res) => {
  const b = req.body ?? {};
  const listingId = bilangan(b.listingId, { min: 1, max: 2_000_000_000, nama: 'listingId' });
  if (!['beli', 'klaim'].includes(b.jenis)) throw new ApiError(400, 'jenis harus beli atau klaim.', 'jenis');
  const klaim = b.jenis === 'klaim';
  const jumlah = klaim ? 1 : bilangan(b.jumlah ?? 1, { min: 1, max: 3, nama: 'Jumlah porsi' });
  const sekarang = waktu(req);

  if (req.user.role === 'vendor') throw new ApiError(403, 'Akun penjual tidak bisa memesan porsi.');
  if (klaim && !(req.user.role === 'recipient' && req.user.student_verified)) throw new ApiError(403, 'Klaim bantuan khusus mahasiswa yang sudah terverifikasi.');

  const pesanan = await transaksi(async (db) => {
    const { rows: [l] } = await db.query(
      `select l.*, v.name as vendor_name, v.address, v.campus_id
         from listings l join vendors v on v.id = l.vendor_id where l.id = $1 for update of l`, [listingId]);
    if (!l || l.status !== 'active') throw new ApiError(404, 'Listing tidak ditemukan atau sudah ditutup.');
    // Klaim berjalan satu per satu per kampus supaya dua klaim tidak memakai rupiah dana bantuan yang sama.
    if (klaim) await db.query('select pg_advisory_xact_lock($1)', [l.campus_id]);

    const saldo = await saldoKolam(db, l.campus_id);
    const t = tahapPada(l, sekarang, { kolamCukup: saldo >= hargaBantuan(l.base_price) });
    if (t.status === 'belum') throw new ApiError(409, `Porsi ini baru buka pukul ${jamJakarta(l.pickup_start)}.`);
    if (t.status === 'tutup') throw new ApiError(409, 'Waktu ambil porsi ini sudah tutup.');
    if (klaim && !t.bantuan) {
      const bantuan = jadwalTahap(l)[3];
      throw new ApiError(409, t.tahap === 4 ? 'Dana bantuan sedang kosong, porsi ini dijual 50% sampai tutup.' : `Klaim bantuan baru dibuka pukul ${jamJakarta(bantuan.mulaiMs)}.`);
    }
    if (!klaim && t.bantuan) throw new ApiError(409, 'Ini tahap Bantuan: porsi hanya bisa diklaim penerima bantuan.');
    if (l.qty_left < jumlah) throw new ApiError(409, l.qty_left ? `Sisa porsi tinggal ${l.qty_left}.` : 'Porsi sudah habis.');

    const terima = klaim ? t.bayarBantuan : t.harga;
    let o;
    try {
      ({ rows: [o] } = await db.query(
        `insert into orders(listing_id, user_id, kind, qty, price_each, funded_by, code, status, claim_day, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, 'reserved', $8, $9) returning id, code`,
        [l.id, req.user.id, klaim ? 'aid_claim' : 'purchase', jumlah, terima, klaim ? 'pool' : 'buyer', buatKode(), klaim ? tanggalJakarta(sekarang) : null, sekarang]));
    } catch (err) {
      if (err.constraint === 'orders_claim_per_day_uq') throw new ApiError(409, 'Kamu sudah mengklaim satu porsi hari ini. Besok bisa lagi.');
      throw err;
    }
    await db.query('update listings set qty_left = qty_left - $1 where id = $2', [jumlah, l.id]);
    if (klaim) {
      await db.query(`insert into ledger(campus_id, kind, amount, order_id, created_at) values ($1, 'aid_payout', $2, $3, $4)`, [l.campus_id, -terima, o.id, sekarang]);
    }
    return {
      kode: o.code,
      jenis: klaim ? 'klaim' : 'beli',
      jumlah,
      bayar: klaim ? 0 : terima * jumlah,
      status: 'reserved',
      batasAmbil: l.pickup_end,
      listing: { id: l.id, judul: l.title },
      kantin: { nama: l.vendor_name, alamat: l.address },
    };
  });
  res.status(201).json({ pesanan, simulasi: true });
});

router.get('/orders/mine', wajib(), async (req, res) => {
  const sekarang = waktu(req);
  const { rows } = await pool.query(
    `select o.code, o.kind, o.qty, o.price_each, o.status, o.created_at, o.picked_up_at,
            l.id as listing_id, l.title, l.photo_url, l.pickup_end, v.name as vendor_name, v.address
       from orders o join listings l on l.id = o.listing_id join vendors v on v.id = l.vendor_id
      where o.user_id = $1 order by o.created_at desc limit 50`, [req.user.id]);
  res.json({
    pesanan: rows.map((o) => ({
      kode: o.code,
      jenis: o.kind === 'aid_claim' ? 'klaim' : 'beli',
      jumlah: o.qty,
      bayar: o.kind === 'aid_claim' ? 0 : o.price_each * o.qty,
      status: o.status === 'reserved' && o.pickup_end <= sekarang ? 'expired' : o.status,
      batasAmbil: o.pickup_end,
      dibuat: o.created_at,
      diambil: o.picked_up_at,
      listing: { id: o.listing_id, judul: o.title, foto: o.photo_url },
      kantin: { nama: o.vendor_name, alamat: o.address },
    })),
  });
});

// Penjual hanya menerima kode. Jenis pesanan dan pemesannya sengaja tidak dikembalikan agar penerima bantuan tak terlihat.
router.post('/orders/:kode/pickup', wajib('vendor'), async (req, res) => {
  const kode = teks(req.params.kode, { max: 12, nama: 'Kode' }).replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(kode)) throw new ApiError(400, 'Kode pesanan terdiri dari 6 huruf dan angka.', 'kode');
  const sekarang = waktu(req);
  const hasil = await transaksi(async (db) => {
    const { rows: [o] } = await db.query(
      `select o.id, o.qty, o.price_each, o.status, l.title, l.pickup_end
         from orders o join listings l on l.id = o.listing_id join vendors v on v.id = l.vendor_id
        where o.code = $1 and v.user_id = $2 for update of o`, [kode, req.user.id]);
    if (!o) throw new ApiError(404, 'Kode tidak ditemukan di kantin ini.');
    if (o.status === 'picked_up') throw new ApiError(409, 'Kode ini sudah diambil.');
    if (o.status !== 'reserved' || o.pickup_end <= sekarang) throw new ApiError(409, 'Pesanan ini sudah hangus atau dibatalkan.');
    await db.query(`update orders set status = 'picked_up', picked_up_at = $2 where id = $1`, [o.id, sekarang]);
    return { kode, judul: o.title, jumlah: o.qty, terima: o.price_each * o.qty };
  });
  res.json({ pesanan: hasil });
});

export default router;
