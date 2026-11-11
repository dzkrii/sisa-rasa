import { Router } from 'express';
import { pool } from '../db.js';
import { akhiriSesi, mulaiSesi, sajikanPengguna } from '../auth.js';
import { verifyPassword } from '../password.js';
import { ApiError, DEMO, SURAT_DEMO, teks, waktu } from '../util.js';
import { kampusDemo } from '../kolam.js';
import { PORSI_DONASI } from '../../shared/pricing.js';

const router = Router();
const PERAN_DEMO = ['pembeli', 'penerima', 'donatur', 'penjual', 'admin'];

// shortcut: pembatas percobaan masuk di memori satu proses, ganti ke penyimpanan bersama bila server lebih dari satu.
const percobaan = new Map();
function batasiMasuk(req) {
  const sekarang = Date.now();
  const daftar = (percobaan.get(req.ip) ?? []).filter((t) => sekarang - t < 60_000);
  if (daftar.length >= 10) throw new ApiError(429, 'Terlalu banyak percobaan masuk. Tunggu satu menit.');
  percobaan.set(req.ip, [...daftar, sekarang]);
}

router.get('/config', async (req, res) => {
  res.json({ demo: DEMO, porsiDonasi: PORSI_DONASI, kampus: await kampusDemo(), sekarang: waktu(req).toISOString() });
});

router.get('/me', (req, res) => res.json({ pengguna: sajikanPengguna(req.user) }));

router.post('/auth/demo/:peran', async (req, res) => {
  if (!DEMO) throw new ApiError(404, 'Mode demo dimatikan.');
  if (!PERAN_DEMO.includes(req.params.peran)) throw new ApiError(404, 'Peran demo tidak dikenal.');
  const { rows: [u] } = await pool.query('select id from users where lower(email) = $1', [req.params.peran + SURAT_DEMO]);
  mulaiSesi(res, u.id);
  const { rows: [pengguna] } = await pool.query(
    `select u.id, u.name, u.role, u.student_verified, v.id as vendor_id from users u left join vendors v on v.user_id = u.id where u.id = $1`, [u.id]);
  res.json({ pengguna: sajikanPengguna(pengguna) });
});

router.post('/auth/login', async (req, res) => {
  batasiMasuk(req);
  const surel = teks(req.body?.surel, { max: 120, nama: 'Surel' }).toLowerCase();
  const sandi = teks(req.body?.sandi, { max: 200, nama: 'Kata sandi' });
  const { rows: [u] } = await pool.query(
    `select u.id, u.name, u.role, u.student_verified, u.password_hash, v.id as vendor_id from users u left join vendors v on v.user_id = u.id where lower(u.email) = $1`, [surel]);
  // Pesan yang sama untuk surel salah dan sandi salah supaya akun tidak bisa ditebak.
  if (!u || !(await verifyPassword(sandi, u.password_hash))) throw new ApiError(401, 'Surel atau kata sandi tidak cocok.');
  mulaiSesi(res, u.id);
  res.json({ pengguna: sajikanPengguna(u) });
});

router.post('/auth/logout', (req, res) => {
  akhiriSesi(res);
  res.json({ ok: true });
});

export default router;
