import { createHmac, timingSafeEqual } from 'node:crypto';
import { pool } from './db.js';
import { ApiError } from './util.js';

const NAMA_COOKIE = 'sr_sesi';
const UMUR_DETIK = 60 * 60 * 24 * 7;
const RAHASIA = process.env.SESSION_SECRET ?? 'hanya-untuk-pengembangan';
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET wajib diisi di produksi.');

const tandai = (isi) => createHmac('sha256', RAHASIA).update(isi).digest('base64url');

export function mulaiSesi(res, penggunaId) {
  const isi = `${penggunaId}.${Math.floor(Date.now() / 1000) + UMUR_DETIK}`;
  res.cookie(NAMA_COOKIE, `${isi}.${tandai(isi)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: UMUR_DETIK * 1000,
    path: '/',
  });
}

export const akhiriSesi = (res) => res.clearCookie(NAMA_COOKIE, { path: '/' });

function bacaSesi(req) {
  const mentah = req.headers.cookie?.split(/;\s*/).find((c) => c.startsWith(`${NAMA_COOKIE}=`))?.slice(NAMA_COOKIE.length + 1);
  const [id, kedaluwarsa, tanda] = mentah?.split('.') ?? [];
  if (!tanda) return null;
  const benar = Buffer.from(tandai(`${id}.${kedaluwarsa}`));
  const ada = Buffer.from(tanda);
  if (benar.length !== ada.length || !timingSafeEqual(benar, ada)) return null;
  return Number(kedaluwarsa) > Date.now() / 1000 ? Number(id) : null;
}

export async function muatPengguna(req, res, next) {
  req.user = null;
  const id = bacaSesi(req);
  if (id) {
    const { rows: [u] } = await pool.query(
      `select u.id, u.name, u.email, u.role, u.student_verified, u.campus_id, v.id as vendor_id
         from users u left join vendors v on v.user_id = u.id where u.id = $1`, [id]);
    req.user = u ?? null;
  }
  next();
}

/** Wajib masuk; bila `peran` diisi, hanya peran itu yang lolos. */
export const wajib = (...peran) => (req, res, next) => {
  if (!req.user) throw new ApiError(401, 'Masuk dulu untuk melanjutkan.');
  if (peran.length && !peran.includes(req.user.role)) throw new ApiError(403, 'Peran kamu tidak punya akses ke bagian ini.');
  next();
};

export const sajikanPengguna = (u) => u && { id: u.id, nama: u.name, peran: u.role, mahasiswaTerverifikasi: u.student_verified, kantinId: u.vendor_id ?? null };
