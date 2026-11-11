import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tahapPada, hargaBantuan } from './pricing.js';

// Jendela 14.00 sampai 20.00 WIB (6 jam), harga dasar Rp 12.000.
const listing = {
  base_price: 12000,
  pickup_start: '2026-11-11T14:00:00+07:00',
  pickup_end: '2026-11-11T20:00:00+07:00',
};
const pada = (jam, opsi) => tahapPada(listing, new Date(`2026-11-11T${jam}+07:00`), opsi);

test('sebelum buka dan setelah tutup tidak ada harga', () => {
  assert.equal(pada('13:59:00').status, 'belum');
  assert.equal(pada('20:00:00').status, 'tutup');
});

test('tahap 1 Segar membayar harga dasar sampai sisa 60%', () => {
  assert.deepEqual([pada('14:00:00').tahap, pada('14:00:00').harga], [1, 12000]);
  assert.equal(pada('16:23:59').tahap, 1);
});

test('tahap 2 Sore membayar 70% mulai tepat sisa 60%', () => {
  const p = pada('16:24:00');
  assert.deepEqual([p.tahap, p.harga], [2, 8400]);
  assert.equal(pada('18:11:59').tahap, 2);
});

test('tahap 3 Terakhir membayar 50%', () => {
  const p = pada('18:12:00');
  assert.deepEqual([p.tahap, p.harga], [3, 6000]);
  assert.equal(pada('19:23:59').tahap, 3);
});

test('tahap 4 Bantuan: gratis bagi penerima, tidak dijual, penjual dibayar dari kolam', () => {
  const p = pada('19:24:00');
  assert.deepEqual([p.tahap, p.bantuan, p.harga, p.bayarBantuan], [4, true, null, 6000]);
});

test('kolam kosong: tahap 4 tetap dijual 50% sampai tutup', () => {
  const p = pada('19:30:00', { kolamCukup: false });
  assert.deepEqual([p.tahap, p.bantuan, p.harga], [4, false, 6000]);
});

test('tahap berikutnya selalu terlihat dengan jam mulai dan harganya', () => {
  const p = pada('15:00:00');
  assert.equal(p.tahapBerikut.tahap, 2);
  assert.equal(p.tahapBerikut.mulaiMs, +new Date('2026-11-11T16:24:00+07:00'));
  assert.equal(p.tahapBerikut.harga, 8400);
  assert.equal(pada('19:30:00').tahapBerikut, null);
});

test('harga dibulatkan ke Rp 100 dan sama untuk penjual dan pembeli', () => {
  assert.equal(hargaBantuan(7500), 3800);
  const l = { ...listing, base_price: 7500 };
  assert.equal(tahapPada(l, new Date('2026-11-11T17:00:00+07:00')).harga, 5300);
});
