import { Router } from 'express';
import { pool } from '../db.js';
import { wajib } from '../auth.js';
import { tanggalJakarta, waktu } from '../util.js';
import { saldoKolam } from '../kolam.js';
import { hargaBantuan, jadwalTahap, tahapPada } from '../../shared/pricing.js';

const router = Router();

// Dashboard penjual: hanya kode pesanan dan rupiah, tidak ada data pemesan.
router.get('/vendor/dashboard', wajib('vendor'), async (req, res) => {
  const sekarang = waktu(req);
  const hari = tanggalJakarta(sekarang);
  const { rows: [kantin] } = await pool.query('select id, name, campus_id from vendors where id = $1', [req.user.vendor_id]);
  const saldo = await saldoKolam(pool, kantin.campus_id);

  const { rows: listing } = await pool.query(
    `select l.*,
            count(o.id) filter (where o.status = 'reserved' and l.pickup_end > $2) as menunggu,
            count(o.id) filter (where o.status = 'picked_up') as diambil,
            count(o.id) filter (where o.status = 'expired' or (o.status = 'reserved' and l.pickup_end <= $2)) as hangus
       from listings l left join orders o on o.listing_id = l.id
      where l.vendor_id = $1 group by l.id order by l.pickup_start desc limit 10`, [kantin.id, sekarang]);

  const { rows: pesanan } = await pool.query(
    `select o.code, o.qty, o.price_each, o.status, o.created_at, o.picked_up_at, l.title, l.pickup_end
       from orders o join listings l on l.id = o.listing_id
      where l.vendor_id = $1 and (o.status = 'reserved' or o.picked_up_at > $2::timestamptz - interval '2 days')
      order by o.created_at desc limit 40`, [kantin.id, sekarang]);

  const { rows: [uang] } = await pool.query(
    `select coalesce(sum(o.price_each * o.qty) filter (where o.status = 'picked_up' and (o.picked_up_at at time zone 'Asia/Jakarta')::date = $2::date), 0) as hari_ini,
            coalesce(sum(o.price_each * o.qty) filter (where o.status = 'picked_up' and o.picked_up_at > $3::timestamptz - interval '7 days'), 0) as tujuh_hari,
            coalesce(sum(o.price_each * o.qty) filter (where o.status = 'reserved' and l.pickup_end > $3), 0) as menunggu
       from orders o join listings l on l.id = o.listing_id where l.vendor_id = $1`, [kantin.id, hari, sekarang]);

  res.json({
    kantin: { id: kantin.id, nama: kantin.name },
    sekarang,
    pendapatan: { hariIni: uang.hari_ini, tujuhHari: uang.tujuh_hari, menunggu: uang.menunggu },
    listing: listing.map((l) => {
      const kolamCukup = saldo >= hargaBantuan(l.base_price);
      return {
        id: l.id, judul: l.title, foto: l.photo_url, hargaDasar: l.base_price, stok: l.qty_total, stokSisa: l.qty_left, status: l.status,
        jendela: { mulai: l.pickup_start, selesai: l.pickup_end },
        pesanan: { menunggu: l.menunggu, diambil: l.diambil, hangus: l.hangus },
        kondisi: tahapPada(l, sekarang, { kolamCukup }),
        jadwal: jadwalTahap(l, { kolamCukup }),
      };
    }),
    pesanan: pesanan.map((o) => ({
      kode: o.code,
      judul: o.title,
      jumlah: o.qty,
      terima: o.price_each * o.qty,
      status: o.status === 'reserved' && o.pickup_end <= sekarang ? 'expired' : o.status,
      dibuat: o.created_at,
      diambil: o.picked_up_at,
    })),
  });
});

export default router;
