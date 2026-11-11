import pg from 'pg';
import { readFileSync } from 'node:fs';
import { seed } from './seed.js';

/** Membuat basis data bila belum ada, memasang skema, lalu mengisi data contoh pada waktu `sekarang`. */
export async function resetDb(url, pool, sekarang = new Date()) {
  const nama = new URL(url).pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(nama)) throw new Error(`Nama basis data tidak valid: ${nama}`);

  const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres' }).toString() });
  await admin.connect();
  try {
    if (!(await admin.query('select 1 from pg_database where datname = $1', [nama])).rowCount) await admin.query(`create database ${nama}`);
  } finally {
    await admin.end();
  }

  const db = await pool.connect();
  try {
    await db.query('begin');
    await db.query(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    await seed(db, sekarang);
    await db.query('commit');
  } catch (err) {
    await db.query('rollback');
    throw err;
  } finally {
    db.release();
  }
}
