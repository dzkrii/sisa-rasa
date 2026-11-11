// Tes integrasi: memakai basis data terpisah (sisa_rasa_test) yang diisi ulang pada 11 November 2026, 12.00 WIB.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/sisa_rasa_test';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { pool, DATABASE_URL } = await import('../src/server/db.js');
const { default: app } = await import('../src/server/app.js');
const { resetDb } = await import('../db/reset.js');
const { pelihara } = await import('../src/server/demo.js');

const SURAT = '@deliraya.example';
const jam = (j) => `2026-11-11T${j}:00+07:00`;
let server;
let base;

before(async () => {
  await resetDb(DATABASE_URL, pool, new Date(jam('12:00')));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => {
  server.close();
  await pool.end();
});

/** Klien dengan cookie sendiri; `waktu` memasang header jam demo. */
function klien() {
  let cookie = '';
  const kirim = async (method, path, body, waktu, { json = true } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(json && { 'content-type': 'application/json' }), ...(cookie && { cookie }), ...(waktu && { 'x-jam-demo': jam(waktu) }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const baru = res.headers.getSetCookie().map((c) => c.split(';')[0]);
    if (baru.length) cookie = baru.join('; ');
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  kirim.masukDemo = async (peran) => {
    const r = await kirim('POST', `/auth/demo/${peran}`, {});
    assert.equal(r.status, 200);
    return r.data.pengguna;
  };
  kirim.masuk = async (nama) => {
    const r = await kirim('POST', '/auth/login', { surel: nama + SURAT, sandi: 'demo' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    return r.data.pengguna;
  };
  return kirim;
}

const buat = (stok, hargaDasar = 10000, judul = 'Porsi uji') => ({ judul, deskripsi: '', hargaDasar, stok, mulai: jam('14:00'), selesai: jam('20:00') });
const saldo = async () => (await pool.query('select coalesce(sum(amount), 0) as s from ledger')).rows[0].s;

const penjual = klien();
const pembeli = klien();
const penerima = klien();
let listingA; // stok 1, untuk uji berebut porsi terakhir
let listingB; // stok 5, untuk uji harga, pickup, dan bantuan
let kodeB;

test('sesi: anonim, masuk demo, kata sandi salah, dan permintaan bukan JSON', async () => {
  const anon = klien();
  assert.equal((await anon('GET', '/me')).data.pengguna, null);
  assert.equal((await anon('POST', '/auth/login', { surel: 'pembeli' + SURAT, sandi: 'salah' })).status, 401);
  assert.equal((await anon('POST', '/auth/logout', 'x', null, { json: false })).status, 415);
  assert.equal((await pembeli.masukDemo('pembeli')).peran, 'buyer');
  assert.equal((await pembeli('GET', '/me')).data.pengguna.peran, 'buyer');
  assert.equal((await penjual.masukDemo('penjual')).peran, 'vendor');
  assert.equal((await penerima.masukDemo('penerima')).peran, 'recipient');
});

test('daftar listing memuat harga dari jam yang berlaku', async () => {
  const r = await pembeli('GET', '/listings', undefined, '16:00');
  assert.equal(r.status, 200);
  assert.equal(r.data.listing.length, 5);
  for (const l of r.data.listing) {
    assert.equal(l.kondisi.status, 'buka');
    assert.equal(l.kondisi.harga, l.hargaDasar);
  }
  assert.equal((await pembeli('GET', '/listings?lat=-7.94', undefined, '16:00')).status, 400);
});

test('penjual membuat listing dan mendapat jadwal tahap; masukan salah ditolak', async () => {
  const bad = await penjual('POST', '/listings', { ...buat(1), hargaDasar: 10 }, '13:00');
  assert.equal(bad.status, 400);
  assert.equal(bad.data.kolom, 'Harga dasar');
  listingA = (await penjual('POST', '/listings', buat(1), '13:00')).data.listing;
  listingB = (await penjual('POST', '/listings', buat(5), '13:00')).data.listing;
  assert.deepEqual(listingB.jadwal.map((t) => t.penjualTerima), [10000, 7000, 5000, 5000]);
  assert.equal((await pembeli('POST', '/listings', buat(1), '13:00')).status, 403);
  assert.equal((await penjual('POST', '/listings', { ...buat(1), foto: '../rahasia' }, '13:00')).status, 400);
  const berFoto = await penjual('POST', '/listings', { ...buat(1), foto: 'soto-medan' }, '13:00');
  assert.equal(berFoto.data.listing.foto, '/img/foto/soto-medan.webp');
  await penjual('PATCH', `/listings/${berFoto.data.listing.id}`, { status: 'closed' });
});

test('dua pembeli berebut porsi terakhir: hanya satu yang dapat', async () => {
  const kedua = klien();
  await kedua.masuk('dinda.nasution');
  const pesan = (c) => c('POST', '/orders', { listingId: listingA.id, jenis: 'beli' }, '14:30');
  const hasil = await Promise.all([pesan(pembeli), pesan(kedua)]);
  assert.deepEqual(hasil.map((r) => r.status).sort(), [201, 409]);
  const { rows: [l] } = await pool.query('select qty_left from listings where id = $1', [listingA.id]);
  assert.equal(l.qty_left, 0);
});

test('harga yang dibayar mengikuti tahap dan disalin ke pesanan', async () => {
  const r = await pembeli('POST', '/orders', { listingId: listingB.id, jenis: 'beli', jumlah: 2 }, '17:00');
  assert.equal(r.status, 201);
  assert.equal(r.data.pesanan.bayar, 14000);
  assert.match(r.data.pesanan.kode, /^[A-Z2-9]{6}$/);
  assert.equal((await pembeli('POST', '/orders', { listingId: listingB.id, jenis: 'beli' }, '13:00')).status, 409);
  kodeB = r.data.pesanan.kode;
});

test('verifikasi ambil: kantin lain tidak bisa, pemilik bisa sekali, dan tidak ada data pemesan', async () => {
  const lain = klien();
  await lain.masuk('ginting');
  assert.equal((await lain('POST', `/orders/${kodeB}/pickup`, {}, '17:10')).status, 404);
  const ok = await penjual('POST', `/orders/${kodeB.toLowerCase()}/pickup`, {}, '17:10');
  assert.equal(ok.status, 200);
  assert.deepEqual(Object.keys(ok.data.pesanan).sort(), ['judul', 'jumlah', 'kode', 'terima']);
  assert.equal(ok.data.pesanan.terima, 14000);
  assert.equal((await penjual('POST', `/orders/${kodeB}/pickup`, {}, '17:11')).status, 409);
});

test('tahap Bantuan: klaim ditolak lebih awal, berhasil di tahap 4, dan satu per hari', async () => {
  const awal = await penerima('POST', '/orders', { listingId: listingB.id, jenis: 'klaim' }, '15:00');
  assert.equal(awal.status, 409);
  assert.match(awal.data.error, /19\.24/);

  const sebelum = await saldo();
  const klaim = await penerima('POST', '/orders', { listingId: listingB.id, jenis: 'klaim' }, '19:30');
  assert.equal(klaim.status, 201);
  assert.equal(klaim.data.pesanan.bayar, 0);
  assert.equal(await saldo(), sebelum - 5000);

  const lagi = await penerima('POST', '/orders', { listingId: listingB.id, jenis: 'klaim' }, '19:31');
  assert.equal(lagi.status, 409);
  assert.match(lagi.data.error, /sudah mengklaim/);
  assert.equal((await pembeli('POST', '/orders', { listingId: listingB.id, jenis: 'klaim' }, '19:30')).status, 403);
  assert.equal((await pembeli('POST', '/orders', { listingId: listingB.id, jenis: 'beli' }, '19:30')).status, 409);
});

test('buku besar publik tidak memuat penerima', async () => {
  const r = await pembeli('GET', '/ledger?limit=100');
  const teks = JSON.stringify(r.data);
  assert.ok(r.data.entri.some((e) => e.jenis === 'bantuan' && e.kantin));
  for (const rahasia of ['Sari Tarigan', 'penerima@', 'user_id', 'order_id']) assert.ok(!teks.includes(rahasia), rahasia);
  const { data: pool_ } = await pembeli('GET', '/pool');
  assert.equal(pool_.saldo, await saldo());
});

test('kolam kosong: tahap 4 dijual 50% dan klaim ditolak', async () => {
  await pool.query('delete from ledger');
  const bayu = klien();
  await bayu.masuk('bayu.pane');
  const klaim = await bayu('POST', '/orders', { listingId: listingB.id, jenis: 'klaim' }, '19:30');
  assert.equal(klaim.status, 409);
  assert.match(klaim.data.error, /kosong/);
  const beli = await pembeli('POST', '/orders', { listingId: listingB.id, jenis: 'beli' }, '19:30');
  assert.equal(beli.status, 201);
  assert.equal(beli.data.pesanan.bayar, 5000);
});

test('donasi menambah kolam dan donatur anonim tampil tanpa nama', async () => {
  const donatur = klien();
  await donatur.masukDemo('donatur');
  const r = await donatur('POST', '/donations', { porsi: 2, anonim: true, pesan: 'Semoga kenyang' });
  assert.equal(r.status, 201);
  assert.equal(r.data.saldo, 15000);
  assert.equal((await donatur('POST', '/donations', { porsi: 0 })).status, 400);
  const buku = await donatur('GET', '/ledger');
  assert.deepEqual([buku.data.entri[0].anonim, buku.data.entri[0].donatur], [true, null]);
  const jejak = await donatur('GET', '/donations/mine');
  assert.equal(jejak.data.donasi[0].jumlah, 15000);
  assert.equal((await penjual('POST', '/donations', { porsi: 1 })).status, 403);
});

test('perubahan listing: stok tidak boleh di bawah yang terambil, harga terkunci, admin hanya menutup', async () => {
  assert.equal((await penjual('PATCH', `/listings/${listingB.id}`, { stok: 1 })).status, 400);
  assert.equal((await penjual('PATCH', `/listings/${listingB.id}`, { hargaDasar: 12000 })).status, 409);
  assert.equal((await penjual('PATCH', `/listings/${listingB.id}`, { judul: 'Nama baru' })).data.listing.judul, 'Nama baru');
  const admin = klien();
  await admin.masukDemo('admin');
  assert.equal((await admin('PATCH', `/listings/${listingB.id}`, { judul: 'x' })).status, 403);
  assert.equal((await admin('PATCH', `/listings/${listingB.id}`, { status: 'closed' })).data.listing.status, 'closed');
  assert.equal((await pembeli('POST', '/orders', { listingId: listingB.id, jenis: 'beli' }, '15:00')).status, 404);
});

test('dasbor penjual, ringkasan admin, dan dampak', async () => {
  const d = await penjual('GET', '/vendor/dashboard', undefined, '18:00');
  assert.equal(d.status, 200);
  assert.ok(d.data.pendapatan.hariIni >= 14000);
  assert.ok(!JSON.stringify(d.data).includes('Bona'));
  assert.equal((await pembeli('GET', '/vendor/dashboard')).status, 403);

  const admin = klien();
  await admin.masukDemo('admin');
  const s = await admin('GET', '/admin/summary');
  assert.equal(s.data.kantin.length, 5);
  assert.equal((await pembeli('GET', '/admin/summary')).status, 403);

  const i = await pembeli('GET', '/impact');
  assert.equal(i.data.demo, true);
  assert.equal(i.data.co2.sumber, null);
  assert.equal(i.data.perKantin.reduce((a, k) => a + k.porsi, 0), i.data.porsiTerselamatkan);
  assert.equal(i.data.perKantin.reduce((a, k) => a + k.rupiah, 0), i.data.rupiahKeKantin);
  assert.ok(i.data.perMenu.length <= 5 && i.data.perMenu.every((m, n, a) => n === 0 || a[n - 1].porsi >= m.porsi));
  assert.ok(i.data.diambilTutup <= i.data.tayangTutup && i.data.tingkatAmbil <= 100);
  // Ringkasan admin dan papan dampak menghitung dari data yang sama, jadi totalnya harus sama.
  assert.equal(s.data.kantin.reduce((a, k) => a + k.porsiDiambil, 0), i.data.porsiTerselamatkan);
  assert.equal(s.data.kantin.reduce((a, k) => a + k.pendapatan, 0), i.data.rupiahKeKantin);
  for (const k of s.data.kantin) assert.ok(k.porsiDiambil <= k.porsiDiunggah && k.tingkatLaku <= 100, `${k.nama} laku ${k.tingkatLaku}%`);
});

test('pemeliharaan: klaim yang tak diambil hangus dan pembayarannya kembali ke kolam', async () => {
  await pool.query(`insert into ledger(campus_id, kind, amount, donor_id) select campus_id, 'donation', 30000, id from users where email like 'donatur@%'`);
  const lina = klien();
  await lina.masuk('lina.damanik');
  const l = (await penjual('POST', '/listings', buat(2, 8000, 'Porsi hangus'), '13:00')).data.listing;
  const sebelum = await saldo();
  assert.equal((await lina('POST', '/orders', { listingId: l.id, jenis: 'klaim' }, '19:30')).status, 201);
  assert.equal(await saldo(), sebelum - 4000);
  const hasil = await pelihara(new Date(jam('21:00')));
  assert.ok(hasil.pesananHangus >= 1);
  assert.equal(await saldo(), sebelum);
  assert.equal((await lina('GET', '/orders/mine', undefined, '21:00')).data.pesanan[0].status, 'expired');
});
