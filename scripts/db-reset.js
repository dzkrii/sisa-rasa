// Pakai --at=2026-11-11T16:30:00+07:00 untuk memalsukan jam isian.
import { DATABASE_URL, pool } from '../src/server/db.js';
import { resetDb } from '../db/reset.js';

const at = process.argv.find((a) => a.startsWith('--at='))?.slice(5);
const sekarang = at ? new Date(at) : new Date();
if (Number.isNaN(+sekarang)) throw new Error(`Nilai --at tidak valid: ${at}`);

await resetDb(DATABASE_URL, pool, sekarang);
const { rows: [r] } = await pool.query(`select
  (select count(*) from users) as pengguna, (select count(*) from vendors) as kantin,
  (select count(*) from listings) as listing, (select count(*) from orders) as pesanan,
  (select coalesce(sum(amount), 0) from ledger) as kolam`);
console.log(`Basis data ${new URL(DATABASE_URL).pathname.slice(1)} siap pada ${sekarang.toISOString()}:`, r);
await pool.end();
