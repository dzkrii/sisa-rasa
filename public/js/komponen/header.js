import { h, kosongkan } from '../h.js';
import { NAMA_PERAN, PERAN_DEMO, keluar, konfigurasi, masukDemo, penggunaSaatIni } from '../sesi.js';
import { sedangDemo, sekarang, setJamSungguhan } from '../waktu.js';
import { jam } from '../format.js';
import { kabari, pesanGalat } from '../ui.js';

const L = {
  jelajah: { href: '/jelajah', teks: 'Jelajah' },
  donasi: { href: '/donasi', teks: 'Donasi' },
  bantuan: { href: '/bantuan', teks: 'Bantuan' },
  dampak: { href: '/dampak', teks: 'Dampak' },
  cara: { href: '/cara-kerja', teks: 'Cara kerja' },
  tiket: { href: '/tiket', teks: 'Tiketku' },
  dashboard: { href: '/dasbor', teks: 'Dashboard penjual' },
  ringkasan: { href: '/admin', teks: 'Ringkasan kampus' },
};
// Tiap peran melihat tautan yang ia pakai, dengan halaman utamanya di depan.
const NAV_PERAN = {
  anon: ['jelajah', 'donasi', 'bantuan', 'dampak', 'cara'],
  buyer: ['jelajah', 'tiket', 'donasi', 'dampak', 'cara'],
  recipient: ['bantuan', 'jelajah', 'tiket', 'dampak', 'cara'],
  donor: ['donasi', 'jelajah', 'dampak', 'cara'],
  vendor: ['dashboard', 'jelajah', 'dampak', 'cara'],
  admin: ['ringkasan', 'jelajah', 'donasi', 'dampak', 'cara'],
};
const ID_PERAN = { buyer: 'pembeli', recipient: 'penerima', donor: 'donatur', vendor: 'penjual', admin: 'admin' };

export const tautanNav = () => NAV_PERAN[penggunaSaatIni()?.peran ?? 'anon'].map((k) => L[k]);

export function pasangHeader(el, { pergi, jalurSaatIni }) {
  let menuTerbuka = false;
  let popTerbuka = false;

  const tutupSemua = () => { menuTerbuka = false; popTerbuka = false; gambar(); };

  async function pilihPeran(p) {
    try {
      await masukDemo(p.id);
      kabari(`Masuk sebagai ${p.nama.toLowerCase()}.`);
      popTerbuka = false;
      pergi(p.tujuan);
    } catch (err) {
      kabari(pesanGalat(err), { galat: true });
    }
  }

  function gambar() {
    const u = penggunaSaatIni();
    const jalur = jalurSaatIni();
    const nav = h('nav', { class: `nav${menuTerbuka ? ' nav--terbuka' : ''}`, id: 'nav-utama', 'aria-label': 'Utama' },
      tautanNav().map((t) => h('a', { href: t.href, 'aria-current': jalur === t.href || (t.href !== '/' && jalur.startsWith(`${t.href}/`)) ? 'page' : null }, t.teks)));

    const tombolPeran = (p, tutup) => h('button', { class: 'tombol', type: 'button', 'aria-current': u && ID_PERAN[u.peran] === p.id ? 'true' : null, onclick: () => { tutup(); pilihPeran(p); }, title: p.ket }, p.nama);
    const keluarkan = (tutup) => h('button', { class: 'tombol tombol--teks', type: 'button', onclick: async () => { await keluar(); tutup(); pergi('/'); } }, 'Keluar');
    const isiAkun = (tutup) => u
      ? [h('p', { class: 'pop__nama' }, u.nama), h('p', { class: 'nota pop__peran' }, `Masuk sebagai ${NAMA_PERAN[u.peran]}`), h('p', { class: 'pop__label' }, 'Pindah peran'), PERAN_DEMO.map((p) => tombolPeran(p, tutup)), keluarkan(tutup)]
      : [h('p', { class: 'pop__label' }, 'Pilih peran untuk masuk. Tanpa kata sandi.'), PERAN_DEMO.map((p) => tombolPeran(p, tutup))];

    const pop = popTerbuka && h('div', { class: 'pop', role: 'group', 'aria-label': u ? 'Akun' : 'Pilih peran untuk masuk' }, isiAkun(() => { popTerbuka = false; }));

    const chipJam = sedangDemo() && h('button', { class: 'chip-jam', type: 'button', onclick: setJamSungguhan, title: 'Kembali ke jam sungguhan', 'aria-label': `Jam diatur ke ${jam(sekarang())}. Kembali ke jam sungguhan` }, h('span', { class: 'chip-jam__kata' }, 'Jam diatur '), jam(sekarang()));
    const akunSeluler = h('div', { class: 'nav__akun' }, isiAkun(() => { menuTerbuka = false; }));
    if (menuTerbuka) nav.append(akunSeluler);

    kosongkan(el);
    el.append(h('div', { class: 'atas__baris' },
      h('a', { class: 'merek', href: '/', 'aria-label': 'Sisa Rasa, ke beranda' }, 'Sisa Rasa'),
      nav,
      chipJam,
      h('div', { class: 'kendali' },
        h('button', { class: `tombol${u ? ' akun-tombol' : ' tombol--merah'}`, type: 'button', 'aria-haspopup': 'true', 'aria-expanded': String(popTerbuka), onclick: () => { popTerbuka = !popTerbuka; menuTerbuka = false; gambar(); } },
          u ? [h('span', null, u.nama.split(' ')[0]), h('span', { class: 'akun__peran nota' }, NAMA_PERAN[u.peran])] : 'Masuk'),
        pop),
      h('button', { class: 'tombol menu-tombol', type: 'button', 'aria-expanded': String(menuTerbuka), 'aria-controls': 'nav-utama', onclick: () => { menuTerbuka = !menuTerbuka; popTerbuka = false; gambar(); } }, menuTerbuka ? 'Tutup' : 'Menu')));
    // Menu seluler berada di luar baris agar membentang penuh.
    const navTerbuka = el.querySelector('.nav--terbuka');
    if (navTerbuka) el.append(navTerbuka);
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (menuTerbuka || popTerbuka)) tutupSemua(); });
  // composedPath dihitung saat klik terjadi; target bisa sudah terlepas dari DOM karena header digambar ulang oleh tombolnya sendiri.
  document.addEventListener('click', (e) => { if ((popTerbuka || menuTerbuka) && !e.composedPath().includes(el)) tutupSemua(); });
  window.addEventListener('pengguna', gambar);
  window.addEventListener('jam', gambar);
  window.addEventListener('rute', tutupSemua);
  gambar();
}

export function pasangKaki(el) {
  const kampus = konfigurasi().kampus;
  el.append(h('div', { class: 'kaki__isi' },
    h('div', null,
      h('p', { class: 'kaki__merek' }, 'Sisa Rasa'),
      h('p', null, 'Rasa yang tak terbuang.'),
      h('nav', { 'aria-label': 'Tautan kaki' },
        h('a', { href: '/jelajah' }, 'Jelajah porsi'),
        h('a', { href: '/donasi' }, 'Riwayat donasi'),
        h('a', { href: '/bantuan' }, 'Bantuan makan'),
        h('a', { href: '/dampak' }, 'Papan dampak'),
        h('a', { href: '/cara-kerja' }, 'Cara kerja'),
        h('a', { href: '/kredit' }, 'Kredit foto'))),
    h('p', { class: 'kaki__catatan' }, `Sisa Rasa adalah karya prototipe untuk INVOFEST 2026 Web Design Competition. ${kampus.name}, semua kantin, nama orang, dan angka di sini adalah data contoh, dan pembayaran hanya simulasi: tidak ada uang yang berpindah. Foto hidangan hanya ilustrasi, bukan foto porsi kantin yang sebenarnya.`)));
}
