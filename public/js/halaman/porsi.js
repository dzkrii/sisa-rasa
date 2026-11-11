import { h, kosongkan } from '../h.js';
import { api } from '../api.js';
import { harga, jam, kecil, rp, sampai } from '../format.js';
import { NAMA_PERAN, masukDemo, penggunaSaatIni } from '../sesi.js';
import { sekarang } from '../waktu.js';
import { kabari, memuat, pesanGalat } from '../ui.js';
import { cap } from '../komponen/cap.js';
import { garisHarga, keHarga } from '../komponen/garisHarga.js';
import { foto } from '../komponen/foto.js';
import { tahapPada } from '/shared/pricing.js';

export default async function porsi({ param, pergi }) {
  let l = (await api.get(`/listings/${param.id}`)).listing;
  let jumlah = 1;
  let pesanGalatSaatIni = '';
  let sibuk = false;
  const akar = h('article', { class: 'porsi' });

  async function loginDemo(peran) {
    try {
      await masukDemo(peran);
      kabari(`Masuk sebagai ${peran === 'penerima' ? 'penerima bantuan' : 'pembeli'}.`);
    } catch (err) {
      kabari(pesanGalat(err), { galat: true });
    }
  }

  async function pesan(jenis) {
    sibuk = true;
    pesanGalatSaatIni = '';
    gambar();
    try {
      const r = await api.post('/orders', { listingId: l.id, jenis, jumlah: jenis === 'beli' ? jumlah : 1 });
      kabari(jenis === 'klaim' ? 'Porsi gratis sudah dipesan. Tunjukkan kodenya ke penjual.' : 'Pesanan masuk. Tunjukkan kodenya ke penjual.');
      await pergi(`/tiket?baru=${r.pesanan.kode}`);
    } catch (err) {
      sibuk = false;
      pesanGalatSaatIni = pesanGalat(err);
      kabari(pesanGalatSaatIni, { galat: true });
      await muat();
    }
  }

  function panelPesan() {
    const u = penggunaSaatIni();
    const k = tahapPada(keHarga(l), sekarang(), { kolamCukup: l.jadwal[3].bantuan });
    const maks = Math.min(3, l.stokSisa);
    if (jumlah > maks) jumlah = Math.max(1, maks);
    const kabar = pesanGalatSaatIni && h('p', { class: 'galat-teks', role: 'alert' }, pesanGalatSaatIni);

    if (k.status === 'belum') return [h('p', null, `Porsi ini baru dijual pukul ${jam(l.jendela.mulai)}.`), h('button', { class: 'tombol tombol--besar', disabled: true, type: 'button' }, `Buka pukul ${jam(l.jendela.mulai)}`)];
    if (k.status === 'tutup') return [h('p', null, 'Waktu ambil porsi ini sudah tutup.'), h('a', { class: 'tombol tombol--besar', href: '/jelajah' }, 'Cari porsi lain')];
    if (l.stokSisa === 0) return [h('p', null, 'Porsi ini sudah habis dipesan.'), h('a', { class: 'tombol tombol--besar', href: '/jelajah' }, 'Cari porsi lain')];
    if (u?.peran === 'vendor') {
      return [h('p', null, u.kantinId === l.kantin.id ? 'Ini porsi kantinmu.' : 'Akun penjual tidak bisa memesan porsi.'), u.kantinId === l.kantin.id && h('a', { class: 'tombol', href: '/dasbor' }, 'Buka dasbor penjual')];
    }

    if (k.bantuan) {
      if (u?.peran === 'recipient') {
        return [h('p', null, 'Tahap Bantuan: satu porsi gratis per hari. Kantin hanya melihat kodemu, bukan namamu.'), kabar,
          h('button', { class: 'tombol tombol--merah tombol--besar', type: 'button', disabled: sibuk, onclick: () => pesan('klaim') }, sibuk ? 'Memesan' : 'Klaim satu porsi gratis')];
      }
      return [h('p', null, 'Tahap Bantuan: porsi ini tidak dijual. Mahasiswa penerima bantuan yang mengklaimnya, dibayar dari dana bantuan.'),
        u ? h('p', { class: 'nota' }, `Kamu masuk sebagai ${NAMA_PERAN[u.peran]}.`) : null,
        h('div', { class: 'baris-aksi' },
          h('button', { class: 'tombol tombol--merah', type: 'button', onclick: () => loginDemo('penerima') }, 'Masuk sebagai penerima bantuan'),
          h('a', { class: 'tombol', href: '/bantuan' }, 'Aturan bantuan'))];
    }

    const total = k.harga * jumlah;
    if (!u) {
      return [h('p', null, `Pesan ${jumlah} porsi seharga ${rp(total)}. Masuk dulu untuk memesan.`),
        h('button', { class: 'tombol tombol--merah tombol--besar', type: 'button', onclick: () => loginDemo('pembeli') }, 'Masuk sebagai pembeli')];
    }
    return [
      h('div', { class: 'isian' },
        h('span', { id: 'lbl-jumlah', class: 'sebagai-label' }, 'Jumlah porsi'),
        h('div', { class: 'stepper', role: 'group', 'aria-labelledby': 'lbl-jumlah' },
          h('button', { type: 'button', 'aria-label': 'Kurangi satu porsi', disabled: jumlah <= 1, onclick: () => { jumlah--; gambar(); } }, '−'),
          h('output', { 'aria-live': 'polite' }, jumlah),
          h('button', { type: 'button', 'aria-label': 'Tambah satu porsi', disabled: jumlah >= maks, onclick: () => { jumlah++; gambar(); } }, '+')),
        h('small', null, 'Maksimal tiga porsi per pesanan.')),
      kabar,
      h('button', { class: 'tombol tombol--merah tombol--besar', type: 'button', disabled: sibuk, onclick: () => pesan('beli') }, sibuk ? 'Memesan' : `Pesan ${rp(total)}`),
      null,
    ];
  }

  function gambar() {
    const k = tahapPada(keHarga(l), sekarang(), { kolamCukup: l.jadwal[3].bantuan });
    const kolamCukup = l.jadwal[3].bantuan;
    kosongkan(akar);
    akar.append(
      h('a', { class: 'kembali', href: '/jelajah' }, 'Kembali ke daftar porsi'),
      h('header', { class: 'porsi__kepala' },
        h('div', { class: 'porsi__judul' },
          h('h1', null, l.judul),
          h('p', { class: 'porsi__kantin' }, `${l.kantin.nama}, ${l.kantin.alamat}`),
          l.deskripsi ? h('p', null, l.deskripsi) : null),
        l.foto && h('div', { class: 'bingkai' }, foto(l.foto, { alt: `Ilustrasi ${kecil(l.judul)}`, utama: true }))),
      h('div', { class: 'porsi__utama' },
        h('div', { class: 'porsi__sekarang', 'data-fase': k.bantuan ? 'malam' : null },
          h('p', { class: 'nota' }, k.status === 'buka' ? `Harga pukul ${jam(sekarang())}, tahap ${kecil(k.nama)}` : k.nama),
          k.status === 'buka' ? harga(k.bantuan ? 0 : k.harga, { ukuran: 'raksasa', merah: !k.bantuan }) : harga(l.hargaDasar, { ukuran: 'besar', coret: k.status === 'tutup' }),
          k.status === 'buka' && h('span', { class: 'porsi__cap' }, cap(k.bantuan ? 'Bantuan' : k.nama, { baru: true })),
          h('p', { class: 'nota' }, `Tinggal ${l.stokSisa} dari ${l.stok} porsi. Ambil ${jam(l.jendela.mulai)} sampai ${jam(l.jendela.selesai)}.`),
          k.status === 'buka' && h('p', { class: 'nota' }, k.tahapBerikut ? 'Harga turun lagi dalam ' : 'Tutup dalam ', sampai(k.tahapBerikut ? k.tahapBerikut.mulaiMs : +new Date(l.jendela.selesai)))),
        h('div', { class: 'porsi__pesan', 'aria-label': 'Pemesanan' }, panelPesan())),
      h('section', { class: 'porsi__jadwal', 'aria-labelledby': 'judul-jadwal' },
        h('h2', { id: 'judul-jadwal' }, 'Empat harga sampai kantin tutup'),
        h('p', null, `Harga dasar ${rp(l.hargaDasar)}. Tahap berikutnya selalu terlihat dari sekarang, supaya tidak ada kejutan bagi pembeli maupun kantin.`),
        garisHarga(l, { bentuk: 'baris', kolamCukup })));
  }

  async function muat() {
    try {
      l = (await api.get(`/listings/${param.id}`)).listing;
      gambar();
    } catch (err) {
      kabari(pesanGalat(err), { galat: true });
    }
  }

  akar.append(memuat('Memuat porsi'));
  gambar();
  return { judul: l.judul, el: akar, perbarui: muat };
}
