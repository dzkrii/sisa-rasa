import { Router } from 'express';
import { pool } from '../db.js';
import { wajib } from '../auth.js';
import { ApiError, bilangan, teks } from '../util.js';
import { jejakDonasi, kampusDemo, saldoKolam } from '../kolam.js';
import { PORSI_DONASI } from '../../shared/pricing.js';

const router = Router();

router.post('/donations', wajib(), async (req, res) => {
  if (req.user.role === 'vendor') throw new ApiError(403, 'Akun penjual tidak bisa berdonasi ke dana bantuan yang membayar kantinnya sendiri.');
  const b = req.body ?? {};
  const porsi = bilangan(b.porsi, { min: 1, max: 100, nama: 'Jumlah porsi' });
  const pesan = b.pesan === undefined || b.pesan === null || b.pesan === '' ? null : teks(b.pesan, { max: 140, nama: 'Pesan' });
  const jumlah = porsi * PORSI_DONASI;
  await pool.query(
    `insert into ledger(campus_id, kind, amount, donor_id, anonymous, message) values ($1, 'donation', $2, $3, $4, $5)`,
    [req.user.campus_id, jumlah, req.user.id, b.anonim === true, pesan]);
  res.status(201).json({ donasi: { porsi, jumlah }, saldo: await saldoKolam(pool, req.user.campus_id), simulasi: true });
});

router.get('/donations/mine', wajib(), async (req, res) => {
  res.json({ donasi: await jejakDonasi(pool, req.user.campus_id, req.user.id) });
});

router.get('/pool', async (req, res) => {
  const kampus = (await kampusDemo()).id;
  const { rows: [r] } = await pool.query(
    `select coalesce(sum(amount), 0) as saldo,
            coalesce(sum(amount) filter (where kind = 'donation'), 0) as masuk,
            coalesce(-sum(amount) filter (where kind = 'aid_payout'), 0) as tersalur
       from ledger where campus_id = $1`, [kampus]);
  res.json({ saldo: r.saldo, totalDonasi: r.masuk, totalTersalur: r.tersalur, porsiDonasi: PORSI_DONASI, setaraPorsi: Math.floor(r.saldo / PORSI_DONASI) });
});

// Riwayat donasi: tidak ada nama penerima, dan donatur anonim tampil tanpa nama.
router.get('/ledger', async (req, res) => {
  const kampus = (await kampusDemo()).id;
  const batas = bilangan(Number(req.query.limit ?? 30), { min: 1, max: 100, nama: 'limit' });
  const sebelum = req.query.sebelum === undefined ? 2_000_000_000 : bilangan(Number(req.query.sebelum), { min: 1, max: 2_000_000_000, nama: 'sebelum' });
  const { rows } = await pool.query(
    `select g.id, g.kind, g.amount, g.anonymous, g.message, g.created_at,
            case when g.anonymous then null else u.name end as donatur,
            v.name as kantin, l.title as judul
       from ledger g
       left join users u on u.id = g.donor_id
       left join orders o on o.id = g.order_id
       left join listings l on l.id = o.listing_id
       left join vendors v on v.id = l.vendor_id
      where g.campus_id = $1 and g.id < $2 order by g.id desc limit $3`, [kampus, sebelum, batas]);
  res.json({
    entri: rows.map((g) => g.kind === 'donation'
      ? { id: g.id, jenis: 'donasi', jumlah: g.amount, waktu: g.created_at, donatur: g.donatur, anonim: g.anonymous, pesan: g.message }
      : { id: g.id, jenis: 'bantuan', jumlah: -g.amount, waktu: g.created_at, kantin: g.kantin, judul: g.judul }),
    berikutnya: rows.length === batas ? rows[rows.length - 1].id : null,
  });
});

export default router;
