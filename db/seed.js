// Data contoh Kampus Deli Raya, Medan. Nama kampus, kantin, orang, dan angka adalah karangan untuk karya ini.
import { hashPassword } from '../src/server/password.js';
import { tahapPada, hargaBantuan, PORSI_DONASI } from '../src/shared/pricing.js';

const MENIT = 60_000;
const HARI = 24 * 60 * MENIT;
const HARI_RIWAYAT = 14;
const HURUF_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SURAT = '@deliraya.example';

// Koordinat dan alamat perkiraan di Medan; kampus dan kantinnya fiktif.
const KAMPUS = { name: 'Kampus Deli Raya', city: 'Medan', lat: 3.5712, lng: 98.6585 };

const KANTIN = [
  { surel: 'penjual', pemilik: 'Rosmala Sinaga', nama: 'Warung Mak Rosmala', alamat: 'Jl. Setia Budi No. 21, depan gerbang barat', dlat: 0.0012, dlng: -0.002, jam: [14 * 60, 20 * 60],
    desk: 'Lontong Medan dan nasi gurih, dimasak sejak subuh.',
    menu: [{ judul: 'Lontong Medan komplit', desk: 'Lontong, gulai nangka, telur, kerupuk, sambal.', harga: 12000, foto: 'lontong-medan' }, { judul: 'Nasi gurih komplit', desk: 'Nasi gurih, mi, bihun, telur balado, sambal.', harga: 13000, foto: 'nasi-gurih' }] },
  { surel: 'ginting', pemilik: 'Ruben Ginting', nama: 'Kantin Pak Ginting', alamat: 'Jl. Jamin Ginting No. 8, dekat gerbang utara', dlat: 0.0031, dlng: 0.0008, jam: [15 * 60, 20 * 60],
    desk: 'Soto Medan dan ayam penyet untuk makan sore.',
    menu: [{ judul: 'Soto Medan dan nasi', desk: 'Soto Medan kuah santan, nasi, perkedel, emping.', harga: 14000, foto: 'soto-medan' }, { judul: 'Ayam penyet sambal ijo', desk: 'Ayam penyet, tempe, lalapan, sambal ijo.', harga: 16000, foto: 'ayam-penyet' }] },
  { surel: 'lestari', pemilik: 'Lestari Nasution', nama: 'Dapur Kak Lestari', alamat: 'Jl. Dr. Mansur No. 14, seberang perpustakaan', dlat: -0.0009, dlng: 0.0024, jam: [16 * 60, 21 * 60],
    desk: 'Bika ambon dan kue talam buatan rumah.',
    menu: [{ judul: 'Bika ambon enam potong', desk: 'Bika ambon pandan, enam potong.', harga: 18000, foto: 'bika-ambon' }, { judul: 'Kue talam enam potong', desk: 'Kue talam pandan dan gula merah, enam potong.', harga: 12000, foto: 'kue-talam' }] },
  { surel: 'hasibuan', pemilik: 'Bang Hasibuan', nama: 'Mi Bang Hasibuan', alamat: 'Jl. Sei Batang Hari No. 5, samping Fakultas Teknik', dlat: 0.0042, dlng: -0.0011, jam: [14 * 60, 19 * 60 + 30],
    desk: 'Mi dan nasi goreng untuk yang pulang malam.',
    menu: [{ judul: 'Mi goreng udang', desk: 'Mi goreng, udang, sawi, telur.', harga: 15000, foto: 'mie-goreng' }, { judul: 'Nasi goreng telur balado', desk: 'Nasi goreng dengan telur balado dan acar.', harga: 13000, foto: 'nasi-goreng' }] },
  { surel: 'rizal', pemilik: 'Rizal Pane', nama: 'Gorengan Bang Rizal', alamat: 'Pertigaan Jl. Setia Budi dan Jl. Ngumban Surbakti', dlat: -0.0027, dlng: -0.0016, jam: [15 * 60, 19 * 60],
    desk: 'Pisang goreng panas dan bubur pedas.',
    menu: [{ judul: 'Pisang goreng enam potong', desk: 'Pisang goreng tepung renyah, enam potong.', harga: 10000, foto: 'pisang-goreng' }, { judul: 'Bubur pedas', desk: 'Bubur pedas khas Melayu dengan kacang dan ikan teri.', harga: 12000, foto: 'bubur-pedas' }] },
];

const PESAN_DONASI = ['Untuk yang lagi menunggu kiriman uang saku.', 'Semoga hari ini kenyang.', 'Titip buat yang lembur di perpustakaan.', 'Semangat sidangnya.', null, null, null];

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mengisi basis data kosong. `now` menentukan "hari ini"; listing hari ini hanya punya pesanan yang sudah lewat dari `now`. */
export async function seed(db, now = new Date()) {
  const rand = mulberry32(2026);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const antara = (a, b) => a + Math.floor(rand() * (b - a + 1));
  // shortcut: satu hash (garam sama) dipakai semua akun demo, ganti bila akun nyata dibuat dari skrip ini.
  const sandi = await hashPassword('demo');
  const sisip = async (sql, params) => (await db.query(sql, params)).rows[0];

  const kampus = await sisip('insert into campuses(name, city, lat, lng) values ($1, $2, $3, $4) returning id', [KAMPUS.name, KAMPUS.city, KAMPUS.lat, KAMPUS.lng]);
  const buatPengguna = (nama, surel, peran, terverifikasi = false) =>
    sisip('insert into users(campus_id, name, email, password_hash, role, student_verified) values ($1, $2, $3, $4, $5, $6) returning id', [kampus.id, nama, surel + SURAT, sandi, peran, terverifikasi]);

  await buatPengguna('Admin Kampus', 'admin', 'admin');
  const donatur = [await buatPengguna('Wulan Sinaga', 'donatur', 'donor')];
  for (const n of ['Bagas Hutagalung', 'Indah Panjaitan', 'Fajar Ritonga', 'Maya Simanjuntak', 'Teguh Batubara']) donatur.push(await buatPengguna(n, n.toLowerCase().replace(' ', '.'), 'donor'));
  const pembeli = [await buatPengguna('Bona Siregar', 'pembeli', 'buyer', true)];
  for (const n of ['Dinda Nasution', 'Rizky Lubis', 'Putri Hutapea', 'Ahmad Harahap', 'Citra Sitompul']) pembeli.push(await buatPengguna(n, n.toLowerCase().replace(' ', '.'), 'buyer', true));
  const penerima = [await buatPengguna('Sari Tarigan', 'penerima', 'recipient', true)];
  for (const n of ['Bayu Pane', 'Lina Damanik', 'Hendra Purba']) penerima.push(await buatPengguna(n, n.toLowerCase().replace(' ', '.'), 'recipient', true));
  const penerimaDemo = penerima[0];

  const penjual = [];
  for (const k of KANTIN) {
    const u = await buatPengguna(k.pemilik, k.surel, 'vendor');
    const v = await sisip('insert into vendors(user_id, campus_id, name, description, lat, lng, address) values ($1, $2, $3, $4, $5, $6, $7) returning id',
      [u.id, kampus.id, k.nama, k.desk, KAMPUS.lat + k.dlat, KAMPUS.lng + k.dlng, k.alamat]);
    penjual.push({ ...k, id: v.id });
  }

  const hariIni = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  const awalHariIni = Date.parse(`${hariIni}T00:00:00+07:00`);
  const kode = new Set();
  const buatKode = () => {
    for (;;) {
      const k = Array.from({ length: 6 }, () => HURUF_KODE[Math.floor(rand() * HURUF_KODE.length)]).join('');
      if (!kode.has(k)) return kode.add(k) && k;
    }
  };

  let kolam = 0;
  const donasi = (donor, jumlah, anonim, pesan, at) => {
    kolam += jumlah;
    return db.query('insert into ledger(campus_id, kind, amount, donor_id, anonymous, message, created_at) values ($1, \'donation\', $2, $3, $4, $5, $6)', [kampus.id, jumlah, donor.id, anonim, pesan, at]);
  };

  for (let d = -HARI_RIWAYAT; d <= 0; d++) {
    const awal = awalHariIni + d * HARI;
    const tanggal = new Date(awal + 12 * 60 * MENIT).toISOString().slice(0, 10);
    const kejadian = [];
    const listing = [];

    for (const v of penjual) {
      if (d < 0 && rand() < 0.15) continue;
      const m = pick(v.menu);
      const mulai = new Date(awal + v.jam[0] * MENIT);
      const akhir = new Date(awal + v.jam[1] * MENIT);
      const total = antara(6, 14);
      const dibuat = new Date(Math.min(+mulai - 90 * MENIT, +now));
      const baris = await sisip(
        'insert into listings(vendor_id, title, description, photo_url, base_price, qty_total, qty_left, pickup_start, pickup_end, status, created_at) values ($1, $2, $3, $10, $4, $5, $5, $6, $7, $8, $9) returning id',
        [v.id, m.judul, m.desk, m.harga, total, mulai, akhir, d === 0 ? 'active' : 'closed', dibuat, `/img/foto/${m.foto}.webp`]);
      const l = { id: baris.id, base_price: m.harga, pickup_start: mulai, pickup_end: akhir, total, diambil: 0 };
      listing.push(l);
      const minat = Math.round(total * (0.55 + rand() * 0.4));
      for (let i = 0; i < minat; i++) kejadian.push({ jenis: 'minat', at: +mulai + Math.floor(rand() ** 1.5 * (akhir - mulai - MENIT)), l });
    }
    for (let i = antara(1, 3); i > 0; i--) kejadian.push({ jenis: 'donasi', at: awal + antara(7 * 60, 13 * 60 + 30) * MENIT });

    const sudahKlaim = new Set(d === 0 ? [penerimaDemo.id] : []);
    for (const e of kejadian.filter((k) => k.at <= +now).sort((a, b) => a.at - b.at)) {
      const at = new Date(e.at);
      if (e.jenis === 'donasi') {
        await donasi(pick(donatur), PORSI_DONASI * antara(1, 6), rand() < 0.35, pick(PESAN_DONASI), at);
        continue;
      }
      const l = e.l;
      if (l.diambil >= l.total) continue;
      const t = tahapPada(l, at, { kolamCukup: kolam >= hargaBantuan(l.base_price) });
      let jenis = 'purchase', pengguna, harga = t.harga, pendana = 'buyer', hariKlaim = null;
      if (t.bantuan) {
        const calon = penerima.filter((p) => !sudahKlaim.has(p.id));
        if (!calon.length) continue;
        pengguna = pick(calon);
        sudahKlaim.add(pengguna.id);
        [jenis, harga, pendana, hariKlaim] = ['aid_claim', t.bayarBantuan, 'pool', tanggal];
      } else {
        pengguna = pick(pembeli);
      }

      let status = 'picked_up';
      let diambil = new Date(Math.min(e.at + antara(5, 40) * MENIT, +l.pickup_end - 1000));
      if (d === 0 && +diambil > +now) [status, diambil] = ['reserved', null];
      else if (d < 0 && jenis === 'purchase' && rand() < 0.08) [status, diambil] = ['expired', null];

      const pesanan = await sisip(
        'insert into orders(listing_id, user_id, kind, qty, price_each, funded_by, code, status, claim_day, created_at, picked_up_at) values ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10) returning id',
        [l.id, pengguna.id, jenis, harga, pendana, buatKode(), status, hariKlaim, at, diambil]);
      l.diambil++;
      if (jenis === 'aid_claim') {
        kolam -= harga;
        await db.query('insert into ledger(campus_id, kind, amount, order_id, created_at) values ($1, \'aid_payout\', $2, $3, $4)', [kampus.id, -harga, pesanan.id, at]);
      }
    }
    for (const l of listing) await db.query('update listings set qty_left = $1 where id = $2', [l.total - l.diambil, l.id]);
  }

  // Pastikan demo tahap Bantuan punya kolam untuk beberapa porsi.
  const minimum = 6 * PORSI_DONASI;
  if (kolam < minimum) await donasi(donatur[0], minimum - kolam, false, 'Untuk jam-jam terakhir kantin.', new Date(+now - 20 * MENIT));
}
