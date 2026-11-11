import pg from 'pg';

// Jumlah dan sum rupiah di sini kecil; bigint kembali sebagai Number, bukan string.
pg.types.setTypeParser(20, Number);

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/sisa_rasa';
export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export async function transaksi(fn) {
  const db = await pool.connect();
  try {
    await db.query('begin');
    const hasil = await fn(db);
    await db.query('commit');
    return hasil;
  } catch (err) {
    await db.query('rollback');
    throw err;
  } finally {
    db.release();
  }
}
