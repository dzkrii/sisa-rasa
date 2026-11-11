import { pool } from './db.js';

export async function saldoKolam(db, kampusId) {
  const { rows: [r] } = await db.query('select coalesce(sum(amount), 0) as saldo from ledger where campus_id = $1', [kampusId]);
  return r.saldo;
}

let kampusPertama;
export async function kampusDemo() {
  kampusPertama ??= (await pool.query('select id, name, city, lat, lng from campuses order by id limit 1')).rows[0];
  return kampusPertama;
}

/**
 * Jejak donasi satu donatur. Rupiah donasi dipakai berurutan (yang masuk lebih dulu terpakai lebih dulu),
 * lalu tiap pembayaran bantuan dibagi ke donasi yang mendanainya.
 */
// shortcut: membaca seluruh riwayat donasi kampus, ganti dengan agregasi SQL bila isinya melewati puluhan ribu baris.
export async function jejakDonasi(db, kampusId, donaturId) {
  const { rows } = await db.query(
    `select g.kind, g.amount, g.donor_id, g.created_at, g.id, v.name as kantin
       from ledger g
       left join orders o on o.id = g.order_id
       left join listings l on l.id = o.listing_id
       left join vendors v on v.id = l.vendor_id
      where g.campus_id = $1 order by g.created_at, g.id`, [kampusId]);

  const donasi = [];
  let masuk = 0;
  for (const r of rows.filter((x) => x.kind === 'donation')) {
    donasi.push({ id: r.id, donorId: r.donor_id, jumlah: r.amount, dibuat: r.created_at, dari: masuk, sampai: masuk + r.amount, terpakai: 0, kantin: new Map() });
    masuk += r.amount;
  }
  let dipakai = 0;
  for (const r of rows.filter((x) => x.kind === 'aid_payout')) {
    const bayar = -r.amount;
    for (const d of donasi) {
      const irisan = Math.min(dipakai + bayar, d.sampai) - Math.max(dipakai, d.dari);
      if (irisan > 0) {
        d.terpakai += irisan;
        d.kantin.set(r.kantin, (d.kantin.get(r.kantin) ?? 0) + irisan / bayar);
      }
    }
    dipakai += bayar;
  }
  return donasi
    .filter((d) => d.donorId === donaturId)
    .reverse()
    .slice(0, 20)
    .map((d) => ({
      id: d.id,
      jumlah: d.jumlah,
      dibuat: d.dibuat,
      terpakai: d.terpakai,
      sisa: d.jumlah - d.terpakai,
      porsiTersalur: Math.round([...d.kantin.values()].reduce((a, b) => a + b, 0) * 10) / 10,
      kantin: [...d.kantin].map(([nama, porsi]) => ({ nama, porsi: Math.round(porsi * 10) / 10 })),
    }));
}
