import express from 'express';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { muatPengguna } from './auth.js';
import { ApiError } from './util.js';
import authRouter from './routes/auth.js';
import listingsRouter from './routes/listings.js';
import ordersRouter from './routes/orders.js';
import donationsRouter from './routes/donations.js';
import vendorRouter from './routes/vendor.js';
import statsRouter from './routes/stats.js';

const app = express();
app.disable('x-powered-by');
app.use('/api', express.json({ limit: '20kb' }));

// Perubahan hanya diterima sebagai JSON; bersama cookie SameSite=Lax ini menutup pemalsuan permintaan lintas situs.
app.use('/api', (req, res, next) => {
  const ubah = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (ubah && !req.get('content-type')?.startsWith('application/json')) return res.status(415).json({ error: 'Kirim permintaan sebagai JSON.' });
  next();
});
app.use('/api', muatPengguna);

app.get('/api/health', async (req, res) => {
  const { rows: [r] } = await pool.query('select count(*)::int as listing from listings');
  res.json({ ok: true, listing: r.listing });
});
for (const router of [authRouter, listingsRouter, ordersRouter, donationsRouter, vendorRouter, statsRouter]) app.use('/api', router);

const publik = fileURLToPath(new URL('../../public', import.meta.url));
// Logika harga yang sama dengan server dipakai langsung oleh front-end (hitung mundur dan jam demo).
app.use('/shared', express.static(fileURLToPath(new URL('../shared', import.meta.url))));
app.use(express.static(publik));
app.use('/api', (req, res) => res.status(404).json({ error: 'Alamat API tidak ada.' }));
// Halaman diatur router di browser: alamat non-API yang bukan berkas dikembalikan ke index.html.
app.get(/^\/(?!api\/|shared\/)[^.]*$/, (req, res) => res.sendFile(publik + '/index.html'));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Isi permintaan bukan JSON yang valid.' });
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message, kolom: err.kolom });
  console.error(err);
  res.status(500).json({ error: 'Ada masalah di server. Coba lagi sebentar.' });
});

export default app;
