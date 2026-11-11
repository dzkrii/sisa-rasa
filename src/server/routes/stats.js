import { Router } from 'express';
import { pool } from '../db.js';
import { wajib } from '../auth.js';
import { kampusDemo, saldoKolam } from '../kolam.js';

const router = Router();

// Asumsi demo, belum bersumber. Jangan tampilkan angka CO2 sebagai fakta sebelum faktor ini punya rujukan.
const CO2_KG_PER_PORSI = 1;

router.get('/impact', async (req, res) => {
  const kampus = (await kampusDemo()).id;
  const { rows: [o] } = await pool.query(
    `select coalesce(sum(qty), 0) as porsi,
            coalesce(sum(price_each * qty), 0) as rupiah,
            coalesce(sum(qty) filter (where kind = 'aid_claim'), 0) as porsi_bantuan,
            count(distinct user_id) filter (where kind = 'aid_claim') as mahasiswa
       from orders where status = 'picked_up'`);
  const { rows: harian } = await pool.query(
    `select to_char(picked_up_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD') as tanggal, sum(qty) as porsi
       from orders where status = 'picked_up' and picked_up_at > now() - interval '30 days' group by 1 order by 1`);
  const { rows: [k] } = await pool.query('select count(*) as kantin from vendors where campus_id = $1', [kampus]);
  const { rows: [d] } = await pool.query(
    `select coalesce(sum(amount) filter (where kind = 'donation'), 0) as donasi,
            coalesce(-sum(amount) filter (where kind = 'aid_payout'), 0) as tersalur
       from ledger where campus_id = $1`, [kampus]);
  const { rows: perKantin } = await pool.query(
    `select v.name as nama, coalesce(sum(o.qty), 0)::int as porsi, coalesce(sum(o.price_each * o.qty), 0)::int as rupiah
       from vendors v
       left join listings l on l.vendor_id = v.id
       left join orders o on o.listing_id = l.id and o.status = 'picked_up'
      where v.campus_id = $1 group by v.id order by rupiah desc`, [kampus]);
  const { rows: perMenu } = await pool.query(
    `select l.title as judul, l.photo_url as foto, v.name as kantin, sum(o.qty)::int as porsi
       from orders o join listings l on l.id = o.listing_id join vendors v on v.id = l.vendor_id
      where o.status = 'picked_up' and v.campus_id = $1
      group by l.title, l.photo_url, v.name order by porsi desc limit 5`, [kampus]);
  // Tingkat terambil dihitung hanya dari listing yang sudah tutup; listing yang masih tayang belum bisa dinilai.
  const { rows: [t] } = await pool.query(
    `select coalesce(sum(l.qty_total), 0)::int as tayang, coalesce(sum(p.diambil), 0)::int as diambil
       from listings l join vendors v on v.id = l.vendor_id
       left join lateral (select coalesce(sum(qty) filter (where status = 'picked_up'), 0) as diambil from orders where listing_id = l.id) p on true
      where l.status = 'closed' and v.campus_id = $1`, [kampus]);

  res.json({
    demo: true,
    porsiTerselamatkan: o.porsi,
    rupiahKeKantin: o.rupiah,
    porsiBantuan: o.porsi_bantuan,
    mahasiswaTerbantu: o.mahasiswa,
    kantin: k.kantin,
    totalDonasi: d.donasi,
    totalTersalur: d.tersalur,
    perKantin,
    perMenu,
    tayangTutup: t.tayang,
    diambilTutup: t.diambil,
    tingkatAmbil: t.tayang ? Math.round((t.diambil / t.tayang) * 100) : null,
    saldoKolam: await saldoKolam(pool, kampus),
    co2: { kg: o.porsi * CO2_KG_PER_PORSI, asumsiKgPerPorsi: CO2_KG_PER_PORSI, sumber: null },
    perHari: harian.map((h) => ({ tanggal: h.tanggal, porsi: h.porsi })),
  });
});

router.get('/admin/summary', wajib('admin'), async (req, res) => {
  const kampus = (await kampusDemo()).id;
  const { rows: kantin } = await pool.query(
    // Pesanan dijumlah per listing lebih dulu; menggabungkan listing dengan pesanan langsung akan melipatgandakan qty_total.
    `select v.id, v.name,
            count(l.id) as listing,
            coalesce(sum(l.qty_total), 0) as porsi_diunggah,
            coalesce(sum(p.diambil), 0)::int as porsi_diambil,
            coalesce(sum(p.uang), 0)::int as pendapatan
       from vendors v
       left join listings l on l.vendor_id = v.id
       left join lateral (
         select coalesce(sum(o.qty) filter (where o.status = 'picked_up'), 0) as diambil,
                coalesce(sum(o.price_each * o.qty) filter (where o.status = 'picked_up'), 0) as uang
           from orders o where o.listing_id = l.id) p on true
      where v.campus_id = $1 group by v.id order by v.id`, [kampus]);
  const { rows: klaim } = await pool.query(
    `select claim_day::text as tanggal, count(*) as klaim from orders
      where kind = 'aid_claim' and status <> 'cancelled' group by 1 order by 1 desc limit 14`);
  const { rows: [kolam] } = await pool.query(
    `select coalesce(sum(amount) filter (where kind = 'donation'), 0) as masuk, coalesce(-sum(amount) filter (where kind = 'aid_payout'), 0) as keluar
       from ledger where campus_id = $1`, [kampus]);
  const { rows: [hangus] } = await pool.query(
    `select coalesce(sum(qty), 0) as porsi from orders where kind = 'purchase' and status = 'expired'`);

  res.json({
    demo: true,
    kolam: { masuk: kolam.masuk, keluar: kolam.keluar, saldo: kolam.masuk - kolam.keluar },
    porsiHangusDipesan: hangus.porsi,
    klaimPerHari: klaim.reverse(),
    kantin: kantin.map((v) => ({
      id: v.id, nama: v.name, listing: v.listing, porsiDiunggah: v.porsi_diunggah, porsiDiambil: v.porsi_diambil,
      tingkatLaku: v.porsi_diunggah ? Math.round((v.porsi_diambil / v.porsi_diunggah) * 100) : null,
      pendapatan: v.pendapatan,
    })),
  });
});

export default router;
