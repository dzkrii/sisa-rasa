import { api } from './api.js';

export const PERAN_DEMO = [
  { id: 'pembeli', nama: 'Pembeli', ket: 'Mahasiswa yang mencari makan murah', tujuan: '/jelajah' },
  { id: 'penerima', nama: 'Penerima bantuan', ket: 'Mahasiswa terverifikasi, klaim satu porsi gratis per hari', tujuan: '/bantuan' },
  { id: 'donatur', nama: 'Donatur', ket: 'Dosen atau alumni yang patungan porsi', tujuan: '/donasi' },
  { id: 'penjual', nama: 'Penjual', ket: 'Pemilik Warung Mak Rosmala', tujuan: '/dasbor' },
  { id: 'admin', nama: 'Admin kampus', ket: 'Melihat ringkasan kerawanan pangan dan menutup listing', tujuan: '/admin' },
];
export const NAMA_PERAN = { buyer: 'pembeli', recipient: 'penerima bantuan', donor: 'donatur', vendor: 'penjual', admin: 'admin' };

let config = null;
let pengguna = null;

export const penggunaSaatIni = () => pengguna;
export const konfigurasi = () => config;

export async function muatAwal() {
  const [c, me] = await Promise.all([api.get('/config'), api.get('/me')]);
  config = c;
  pengguna = me.pengguna;
}

const kabari = () => window.dispatchEvent(new CustomEvent('pengguna'));

export async function masukDemo(peran) {
  pengguna = (await api.post(`/auth/demo/${peran}`, {})).pengguna;
  kabari();
  return pengguna;
}

export async function keluar() {
  await api.post('/auth/logout', {});
  pengguna = null;
  kabari();
}
